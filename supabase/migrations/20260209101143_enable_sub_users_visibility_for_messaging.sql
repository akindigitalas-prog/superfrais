/*
  # Enable Sub-Users Visibility for Messaging

  1. Changes
    - Add policy to allow all authenticated users to view all sub_users
    - This is necessary for the messaging system where users need to see all team members
    - Maintains security while enabling team communication

  2. Security
    - Users can view all sub_users (read-only for messaging)
    - Only admins can still create/update/delete their own sub_users
*/

-- Allow all authenticated users to view all sub_users (for messaging)
CREATE POLICY "All authenticated users can view sub-users"
  ON sub_users FOR SELECT
  TO authenticated
  USING (true);
