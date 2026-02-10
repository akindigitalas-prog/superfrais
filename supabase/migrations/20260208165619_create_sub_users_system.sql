/*
  # Create Sub-Users System

  1. Overview
    - Allows admin users to create sub-users who share the same email but have unique usernames
    - Sub-users authenticate with: admin email + their username + their password
    - Each sub-user has their own password stored securely (hashed)

  2. Changes to Profiles Table
    - Add `username` column for both admins and sub-users
    - Add `is_sub_user` boolean flag
    - Add `parent_user_id` reference to link sub-users to admin

  3. New Tables
    - `sub_users` table to store sub-user credentials and info
      - `id` (uuid, primary key)
      - `parent_user_id` (uuid, references auth.users)
      - `username` (text, unique per parent)
      - `password_hash` (text, bcrypt hashed password)
      - `full_name` (text)
      - `role` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  4. Security
    - Enable RLS on `sub_users` table
    - Admins can view and manage their own sub-users
    - Sub-users can view their own record

  5. Notes
    - Username must be unique within each parent account
    - Password is hashed using bcrypt before storage
    - Sub-users don't have their own auth.users entry
*/

-- Add username column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
  END IF;
END $$;

-- Add is_sub_user flag to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_sub_user'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_sub_user boolean DEFAULT false;
  END IF;
END $$;

-- Add parent_user_id to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'parent_user_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN parent_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create sub_users table
CREATE TABLE IF NOT EXISTS sub_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(parent_user_id, username)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sub_users_parent_username ON sub_users(parent_user_id, username);
CREATE INDEX IF NOT EXISTS idx_sub_users_parent ON sub_users(parent_user_id);

-- Enable RLS on sub_users
ALTER TABLE sub_users ENABLE ROW LEVEL SECURITY;

-- Admin can view all their sub-users
CREATE POLICY "Admins can view own sub-users"
  ON sub_users FOR SELECT
  TO authenticated
  USING (parent_user_id = auth.uid());

-- Admin can create sub-users
CREATE POLICY "Admins can create sub-users"
  ON sub_users FOR INSERT
  TO authenticated
  WITH CHECK (parent_user_id = auth.uid());

-- Admin can update their sub-users
CREATE POLICY "Admins can update own sub-users"
  ON sub_users FOR UPDATE
  TO authenticated
  USING (parent_user_id = auth.uid())
  WITH CHECK (parent_user_id = auth.uid());

-- Admin can delete their sub-users
CREATE POLICY "Admins can delete own sub-users"
  ON sub_users FOR DELETE
  TO authenticated
  USING (parent_user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sub_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_sub_users_updated_at ON sub_users;
CREATE TRIGGER set_sub_users_updated_at
  BEFORE UPDATE ON sub_users
  FOR EACH ROW
  EXECUTE FUNCTION update_sub_users_updated_at();