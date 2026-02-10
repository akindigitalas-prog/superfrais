-- Enable multi-tenant isolation (Option B)

-- Helper functions
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Add tenant_id to profiles first
alter table public.profiles
  add column if not exists tenant_id uuid;

update public.profiles
set tenant_id = coalesce(parent_user_id, id)
where tenant_id is null;

alter table public.profiles
  alter column tenant_id set not null;

-- Add tenant_id columns
alter table public.products add column if not exists tenant_id uuid;
alter table public.dlc_entries add column if not exists tenant_id uuid;
alter table public.dlc_actions add column if not exists tenant_id uuid;
alter table public.cash_counts add column if not exists tenant_id uuid;
alter table public.manual_count_products add column if not exists tenant_id uuid;
alter table public.manual_counts add column if not exists tenant_id uuid;
alter table public.tasks add column if not exists tenant_id uuid;
alter table public.messages add column if not exists tenant_id uuid;
alter table public.notifications add column if not exists tenant_id uuid;
alter table public.notification_settings add column if not exists tenant_id uuid;
alter table public.sub_users add column if not exists tenant_id uuid;
alter table public.import_logs add column if not exists tenant_id uuid;

-- Backfill tenant_id based on existing relations
update public.products p
set tenant_id = pr.tenant_id
from public.profiles pr
where p.tenant_id is null and p.created_by = pr.id;

update public.dlc_entries de
set tenant_id = pr.tenant_id
from public.profiles pr
where de.tenant_id is null and de.created_by = pr.id;

update public.dlc_actions da
set tenant_id = pr.tenant_id
from public.profiles pr
where da.tenant_id is null and da.processed_by = pr.id;

update public.cash_counts cc
set tenant_id = pr.tenant_id
from public.profiles pr
where cc.tenant_id is null and cc.created_by = pr.id;

update public.manual_counts mc
set tenant_id = pr.tenant_id
from public.profiles pr
where mc.tenant_id is null and mc.counted_by = pr.id;

update public.tasks t
set tenant_id = pr.tenant_id
from public.profiles pr
where t.tenant_id is null and t.created_by = pr.id;

update public.messages m
set tenant_id = pr.tenant_id
from public.profiles pr
where m.tenant_id is null and m.sent_by = pr.id;

update public.notifications n
set tenant_id = pr.tenant_id
from public.profiles pr
where n.tenant_id is null and n.user_id = pr.id;

update public.notification_settings ns
set tenant_id = pr.tenant_id
from public.profiles pr
where ns.tenant_id is null and ns.user_id = pr.id;

update public.sub_users su
set tenant_id = pr.tenant_id
from public.profiles pr
where su.tenant_id is null and su.parent_user_id = pr.id;

update public.import_logs il
set tenant_id = pr.tenant_id
from public.profiles pr
where il.tenant_id is null and il.created_by = pr.id;

-- Fallback tenant_id for rows without links (if any)
do $$
declare default_tenant uuid;
begin
  select id into default_tenant
  from public.profiles
  where role = 'admin'
  order by created_at
  limit 1;

  if default_tenant is null then
    select id into default_tenant
    from public.profiles
    order by created_at
    limit 1;
  end if;

  if default_tenant is not null then
    update public.products set tenant_id = default_tenant where tenant_id is null;
    update public.dlc_entries set tenant_id = default_tenant where tenant_id is null;
    update public.dlc_actions set tenant_id = default_tenant where tenant_id is null;
    update public.cash_counts set tenant_id = default_tenant where tenant_id is null;
    update public.manual_count_products set tenant_id = default_tenant where tenant_id is null;
    update public.manual_counts set tenant_id = default_tenant where tenant_id is null;
    update public.tasks set tenant_id = default_tenant where tenant_id is null;
    update public.messages set tenant_id = default_tenant where tenant_id is null;
    update public.notifications set tenant_id = default_tenant where tenant_id is null;
    update public.notification_settings set tenant_id = default_tenant where tenant_id is null;
    update public.sub_users set tenant_id = default_tenant where tenant_id is null;
    update public.import_logs set tenant_id = default_tenant where tenant_id is null;
  end if;
end $$;

-- Defaults for new rows (except profiles)
alter table public.products alter column tenant_id set default public.current_tenant_id();
alter table public.dlc_entries alter column tenant_id set default public.current_tenant_id();
alter table public.dlc_actions alter column tenant_id set default public.current_tenant_id();
alter table public.cash_counts alter column tenant_id set default public.current_tenant_id();
alter table public.manual_count_products alter column tenant_id set default public.current_tenant_id();
alter table public.manual_counts alter column tenant_id set default public.current_tenant_id();
alter table public.tasks alter column tenant_id set default public.current_tenant_id();
alter table public.messages alter column tenant_id set default public.current_tenant_id();
alter table public.notifications alter column tenant_id set default public.current_tenant_id();
alter table public.notification_settings alter column tenant_id set default public.current_tenant_id();
alter table public.sub_users alter column tenant_id set default public.current_tenant_id();
alter table public.import_logs alter column tenant_id set default public.current_tenant_id();

-- Enforce not null
alter table public.products alter column tenant_id set not null;
alter table public.dlc_entries alter column tenant_id set not null;
alter table public.dlc_actions alter column tenant_id set not null;
alter table public.cash_counts alter column tenant_id set not null;
alter table public.manual_count_products alter column tenant_id set not null;
alter table public.manual_counts alter column tenant_id set not null;
alter table public.tasks alter column tenant_id set not null;
alter table public.messages alter column tenant_id set not null;
alter table public.notifications alter column tenant_id set not null;
alter table public.notification_settings alter column tenant_id set not null;
alter table public.sub_users alter column tenant_id set not null;
alter table public.import_logs alter column tenant_id set not null;

-- Update trigger functions to include tenant_id
create or replace function public.create_profile_for_user()
returns trigger as $$
declare
  user_role text;
  user_tenant uuid;
begin
  if new.email = 'akinsemi5@gmail.com' then
    user_role := 'admin';
  else
    user_role := 'employee';
  end if;

  user_tenant := coalesce((new.raw_user_meta_data->>'tenant_id')::uuid, new.id);

  insert into public.profiles (id, email, full_name, role, tenant_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Utilisateur'),
    user_role,
    user_tenant
  );

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.create_default_notification_settings()
returns trigger as $$
begin
  insert into notification_settings (user_id, tenant_id)
  values (
    new.id,
    (select tenant_id from public.profiles where id = new.id)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop all existing policies and recreate tenant-scoped ones
do $$
declare
  t text;
  r record;
begin
  foreach t in array array[
    'profiles','products','dlc_entries','dlc_actions','cash_counts',
    'manual_count_products','manual_counts','tasks','messages',
    'notifications','notification_settings','sub_users','import_logs'
  ] loop
    for r in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
  end loop;
end $$;

-- Profiles
create policy "Profiles are readable within tenant"
  on public.profiles for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() and tenant_id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins can update tenant profiles"
  on public.profiles for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

-- Products
create policy "Products are readable within tenant"
  on public.products for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "Products are insertable within tenant"
  on public.products for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id());

create policy "Products are updatable within tenant"
  on public.products for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- DLC entries
create policy "DLC entries are readable within tenant"
  on public.dlc_entries for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "DLC entries are insertable within tenant"
  on public.dlc_entries for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and created_by = auth.uid());

create policy "DLC entries are updatable within tenant"
  on public.dlc_entries for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- DLC actions
create policy "DLC actions are readable within tenant"
  on public.dlc_actions for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "DLC actions are insertable within tenant"
  on public.dlc_actions for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and processed_by = auth.uid());

-- Cash counts
create policy "Cash counts are readable by owner"
  on public.cash_counts for select
  to authenticated
  using (tenant_id = public.current_tenant_id() and created_by = auth.uid());

create policy "Cash counts are insertable by owner"
  on public.cash_counts for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and created_by = auth.uid());

create policy "Cash counts are updatable by owner"
  on public.cash_counts for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and created_by = auth.uid())
  with check (tenant_id = public.current_tenant_id() and created_by = auth.uid());

-- Manual count products
create policy "Manual count products are readable within tenant"
  on public.manual_count_products for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "Manual count products are insertable by admins"
  on public.manual_count_products for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "Manual count products are updatable by admins"
  on public.manual_count_products for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

-- Manual counts
create policy "Manual counts are readable by owner"
  on public.manual_counts for select
  to authenticated
  using (tenant_id = public.current_tenant_id() and counted_by = auth.uid());

create policy "Manual counts are insertable by owner"
  on public.manual_counts for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and counted_by = auth.uid());

-- Tasks
create policy "Tasks are readable within tenant"
  on public.tasks for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "Tasks are insertable within tenant"
  on public.tasks for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id());

create policy "Tasks are updatable within tenant"
  on public.tasks for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "Tasks are deletable within tenant"
  on public.tasks for delete
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- Messages
create policy "Messages are readable within tenant"
  on public.messages for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "Messages are insertable by sender"
  on public.messages for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and sent_by = auth.uid());

create policy "Messages are updatable within tenant"
  on public.messages for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Notifications
create policy "Notifications are readable by owner"
  on public.notifications for select
  to authenticated
  using (tenant_id = public.current_tenant_id() and user_id = auth.uid());

create policy "Notifications are insertable within tenant"
  on public.notifications for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and (user_id = auth.uid() or public.is_admin())
  );

create policy "Notifications are updatable by owner"
  on public.notifications for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and user_id = auth.uid())
  with check (tenant_id = public.current_tenant_id() and user_id = auth.uid());

create policy "Notifications are deletable by owner"
  on public.notifications for delete
  to authenticated
  using (tenant_id = public.current_tenant_id() and user_id = auth.uid());

-- Notification settings
create policy "Notification settings readable by owner"
  on public.notification_settings for select
  to authenticated
  using (tenant_id = public.current_tenant_id() and user_id = auth.uid());

create policy "Notification settings insertable by owner"
  on public.notification_settings for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and user_id = auth.uid());

create policy "Notification settings updatable by owner"
  on public.notification_settings for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and user_id = auth.uid())
  with check (tenant_id = public.current_tenant_id() and user_id = auth.uid());

-- Sub users
create policy "Sub users are readable within tenant"
  on public.sub_users for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "Sub users are insertable by admins"
  on public.sub_users for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "Sub users are updatable by admins"
  on public.sub_users for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "Sub users are deletable by admins"
  on public.sub_users for delete
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

-- Import logs
create policy "Import logs are readable by admins"
  on public.import_logs for select
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "Import logs are insertable by admins"
  on public.import_logs for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.is_admin()
    and created_by = auth.uid()
  );
