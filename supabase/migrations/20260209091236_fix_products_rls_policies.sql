/*
  # Fix Products RLS Policies for Sub-Users

  1. Changes
    - Drop existing INSERT policy that restricts to created_by matching auth.uid()
    - Create new INSERT policy that allows all authenticated users to insert products
    - This enables sub-users to import products on behalf of their admin

  2. Security
    - Still requires authentication
    - All authenticated users (admins and sub-users) can insert products
    - Products remain readable by all authenticated users
*/

-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "All authenticated users can insert products" ON products;

-- Create new INSERT policy that allows all authenticated users
CREATE POLICY "Authenticated users can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
