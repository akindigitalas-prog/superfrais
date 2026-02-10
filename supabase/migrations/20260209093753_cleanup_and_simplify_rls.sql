/*
  # Cleanup and Simplify RLS Policies

  1. Changes
    - Remove ALL existing policies that use helper functions
    - Drop helper functions
    - Create simple new policies based on auth.uid()

  2. Security
    - Sub-users now use their parent admin's session
    - All data access is based on auth.uid() which will be the admin's ID
    - Simpler and more maintainable security model
*/

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Authenticated users can read products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "All authenticated users can read products" ON products;
DROP POLICY IF EXISTS "All authenticated users can update products" ON products;

DROP POLICY IF EXISTS "Users and sub-users can read manual_counts" ON manual_counts;
DROP POLICY IF EXISTS "Users and sub-users can insert manual_counts" ON manual_counts;
DROP POLICY IF EXISTS "All authenticated users can read manual_counts" ON manual_counts;
DROP POLICY IF EXISTS "All authenticated users can insert manual_counts" ON manual_counts;
DROP POLICY IF EXISTS "Users can read their manual_counts" ON manual_counts;
DROP POLICY IF EXISTS "Users can insert manual_counts" ON manual_counts;

DROP POLICY IF EXISTS "Users and sub-users can read cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "Users and sub-users can insert cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "Admins and their sub-users can update cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "All authenticated users can read cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "All authenticated users can insert cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "Admins can update cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "Users can read their cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "Users can insert cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "Users can update their cash_counts" ON cash_counts;

DROP POLICY IF EXISTS "Users and sub-users can read their tasks" ON tasks;
DROP POLICY IF EXISTS "Users and sub-users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users and sub-users can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can read tasks assigned to them or created by them" ON tasks;
DROP POLICY IF EXISTS "All authenticated users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks assigned to them or created by them" ON tasks;
DROP POLICY IF EXISTS "Users can read their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;

DROP POLICY IF EXISTS "Users and sub-users can read their messages" ON messages;
DROP POLICY IF EXISTS "Users and sub-users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users and sub-users can update their messages" ON messages;
DROP POLICY IF EXISTS "Users can read messages sent to them or by them" ON messages;
DROP POLICY IF EXISTS "All authenticated users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages sent to them" ON messages;
DROP POLICY IF EXISTS "Users can read their messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;

-- Drop DLC alerts policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dlc_alerts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users and sub-users can read dlc_alerts" ON dlc_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "Users and sub-users can insert dlc_alerts" ON dlc_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "Users and sub-users can update dlc_alerts" ON dlc_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "All authenticated users can read dlc_alerts" ON dlc_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "All authenticated users can insert dlc_alerts" ON dlc_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "All authenticated users can update dlc_alerts" ON dlc_alerts';
  END IF;
END $$;

-- Drop notifications policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users and sub-users can read their notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users and sub-users can insert notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users and sub-users can update their notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can read their notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their notifications" ON notifications';
  END IF;
END $$;

-- Now drop the helper functions
DROP FUNCTION IF EXISTS get_parent_user_id() CASCADE;
DROP FUNCTION IF EXISTS is_user_or_sub_user(uuid) CASCADE;

-- Create new simple policies

-- Products: All authenticated users can access
CREATE POLICY "All authenticated users can read products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Manual counts: Owned by user
CREATE POLICY "Users can read their manual_counts"
  ON manual_counts
  FOR SELECT
  TO authenticated
  USING (counted_by = auth.uid());

CREATE POLICY "Users can insert manual_counts"
  ON manual_counts
  FOR INSERT
  TO authenticated
  WITH CHECK (counted_by = auth.uid());

-- Cash counts: Owned by user
CREATE POLICY "Users can read their cash_counts"
  ON cash_counts
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert cash_counts"
  ON cash_counts
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their cash_counts"
  ON cash_counts
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Tasks: Assigned or created by user
CREATE POLICY "Users can read their tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can insert tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid())
  WITH CHECK (assigned_to = auth.uid() OR created_by = auth.uid());

-- Messages: Sent by or to user
CREATE POLICY "Users can read their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (sent_by = auth.uid() OR sent_to = auth.uid() OR sent_to IS NULL);

CREATE POLICY "Users can insert messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sent_by = auth.uid());

CREATE POLICY "Users can update their messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (sent_to = auth.uid())
  WITH CHECK (sent_to = auth.uid());

-- DLC alerts if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dlc_alerts') THEN
    EXECUTE 'CREATE POLICY "All authenticated users can read dlc_alerts" ON dlc_alerts FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can insert dlc_alerts" ON dlc_alerts FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can update dlc_alerts" ON dlc_alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- Notifications if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'CREATE POLICY "Users can read their notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;
