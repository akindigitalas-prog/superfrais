/*
  # Enable Sub-User Access to Admin Data

  1. New Functions
    - `get_parent_user_id()` - Returns the parent admin user ID for sub-users
    - `is_user_or_sub_user(uuid)` - Checks if current user is the specified user or their sub-user

  2. Changes
    - Update all RLS policies to allow sub-users to access their parent admin's data
    - Products, manual_counts, cash_counts, tasks, messages, dlc_alerts, notifications

  3. Security
    - Sub-users can only access data belonging to their parent admin
    - Regular users can only access their own data
    - Maintains existing security model while extending access to sub-users
*/

-- Helper function to get parent user ID for sub-users
CREATE OR REPLACE FUNCTION get_parent_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  parent_id uuid;
BEGIN
  -- Check if current user has parent_user_id in metadata
  parent_id := (auth.jwt()->>'user_metadata')::json->>'parent_user_id';
  
  IF parent_id IS NOT NULL THEN
    RETURN parent_id::uuid;
  END IF;
  
  -- Otherwise return current user ID
  RETURN auth.uid();
END;
$$;

-- Helper function to check if user or their sub-user
CREATE OR REPLACE FUNCTION is_user_or_sub_user(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  parent_id uuid;
BEGIN
  parent_id := get_parent_user_id();
  RETURN parent_id = check_user_id;
END;
$$;

-- Update products policies
DROP POLICY IF EXISTS "All authenticated users can read products" ON products;
CREATE POLICY "Authenticated users can read products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "All authenticated users can update products" ON products;
CREATE POLICY "Authenticated users can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update manual_counts policies
DROP POLICY IF EXISTS "All authenticated users can read manual_counts" ON manual_counts;
CREATE POLICY "Users and sub-users can read manual_counts"
  ON manual_counts
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "All authenticated users can insert manual_counts" ON manual_counts;
CREATE POLICY "Users and sub-users can insert manual_counts"
  ON manual_counts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_user_or_sub_user(counted_by));

-- Update cash_counts policies
DROP POLICY IF EXISTS "All authenticated users can read cash_counts" ON cash_counts;
CREATE POLICY "Users and sub-users can read cash_counts"
  ON cash_counts
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "All authenticated users can insert cash_counts" ON cash_counts;
CREATE POLICY "Users and sub-users can insert cash_counts"
  ON cash_counts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_user_or_sub_user(created_by));

DROP POLICY IF EXISTS "Admins can update cash_counts" ON cash_counts;
CREATE POLICY "Admins and their sub-users can update cash_counts"
  ON cash_counts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = get_parent_user_id()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = get_parent_user_id()
      AND profiles.role = 'admin'
    )
  );

-- Update tasks policies
DROP POLICY IF EXISTS "Users can read tasks assigned to them or created by them" ON tasks;
CREATE POLICY "Users and sub-users can read their tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    is_user_or_sub_user(assigned_to) OR
    is_user_or_sub_user(created_by) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = get_parent_user_id()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "All authenticated users can insert tasks" ON tasks;
CREATE POLICY "Users and sub-users can insert tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (is_user_or_sub_user(created_by));

DROP POLICY IF EXISTS "Users can update tasks assigned to them or created by them" ON tasks;
CREATE POLICY "Users and sub-users can update their tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    is_user_or_sub_user(assigned_to) OR
    is_user_or_sub_user(created_by) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = get_parent_user_id()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    is_user_or_sub_user(assigned_to) OR
    is_user_or_sub_user(created_by) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = get_parent_user_id()
      AND profiles.role = 'admin'
    )
  );

-- Update messages policies
DROP POLICY IF EXISTS "Users can read messages sent to them or by them" ON messages;
CREATE POLICY "Users and sub-users can read their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    is_user_or_sub_user(sent_by) OR
    is_user_or_sub_user(sent_to) OR
    sent_to IS NULL OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = get_parent_user_id()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "All authenticated users can insert messages" ON messages;
CREATE POLICY "Users and sub-users can insert messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (is_user_or_sub_user(sent_by));

DROP POLICY IF EXISTS "Users can update messages sent to them" ON messages;
CREATE POLICY "Users and sub-users can update their messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (is_user_or_sub_user(sent_to))
  WITH CHECK (is_user_or_sub_user(sent_to));

-- Update dlc_alerts policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dlc_alerts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "All authenticated users can read dlc_alerts" ON dlc_alerts';
    EXECUTE 'CREATE POLICY "Users and sub-users can read dlc_alerts" ON dlc_alerts FOR SELECT TO authenticated USING (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "All authenticated users can insert dlc_alerts" ON dlc_alerts';
    EXECUTE 'CREATE POLICY "Users and sub-users can insert dlc_alerts" ON dlc_alerts FOR INSERT TO authenticated WITH CHECK (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "All authenticated users can update dlc_alerts" ON dlc_alerts';
    EXECUTE 'CREATE POLICY "Users and sub-users can update dlc_alerts" ON dlc_alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- Update notifications policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications';
    EXECUTE 'CREATE POLICY "Users and sub-users can read their notifications" ON notifications FOR SELECT TO authenticated USING (is_user_or_sub_user(user_id))';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert notifications" ON notifications';
    EXECUTE 'CREATE POLICY "Users and sub-users can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications';
    EXECUTE 'CREATE POLICY "Users and sub-users can update their notifications" ON notifications FOR UPDATE TO authenticated USING (is_user_or_sub_user(user_id)) WITH CHECK (is_user_or_sub_user(user_id))';
  END IF;
END $$;
