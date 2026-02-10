/*
  # Permettre l'accès aux tâches et messages pour les sub_users

  1. Modifications
    - Modifier les politiques RLS pour tasks et messages
    - Permettre aux sub_users (connectés via leur admin) d'accéder aux tâches et messages
    - Les sub_users peuvent voir les tâches qui leur sont assignées ou créées par leur admin
    - Les sub_users peuvent voir les messages qui leur sont envoyés ou envoyés par leur admin
  
  2. Sécurité
    - Les utilisateurs ne peuvent voir que leurs propres données ou celles de leurs sub_users
    - Les sub_users connectés avec l'ID de leur admin ont les mêmes droits d'accès
*/

-- Fonction helper pour vérifier si un UUID est un sub_user de l'admin connecté
CREATE OR REPLACE FUNCTION is_sub_user_of_admin(user_id uuid, admin_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sub_users
    WHERE id = user_id AND parent_user_id = admin_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper pour obtenir l'admin_id d'un sub_user
CREATE OR REPLACE FUNCTION get_admin_of_sub_user(sub_user_id uuid)
RETURNS uuid AS $$
  SELECT parent_user_id FROM sub_users WHERE id = sub_user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- TASKS: Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can read their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;

-- TASKS: Nouvelles politiques
CREATE POLICY "Users can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    -- L'utilisateur peut voir ses propres tâches
    assigned_to = auth.uid() OR created_by = auth.uid()
    -- Ou les tâches assignées à ses sub_users
    OR is_sub_user_of_admin(assigned_to, auth.uid())
    -- Ou les tâches créées par ses sub_users
    OR is_sub_user_of_admin(created_by, auth.uid())
    -- Ou les tâches où un sub_user est assigné et l'utilisateur actuel est son admin
    OR assigned_to IN (SELECT id FROM sub_users WHERE parent_user_id = auth.uid())
  );

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR is_sub_user_of_admin(created_by, auth.uid())
  );

CREATE POLICY "Users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
    OR is_sub_user_of_admin(assigned_to, auth.uid())
    OR is_sub_user_of_admin(created_by, auth.uid())
  )
  WITH CHECK (
    assigned_to = auth.uid() OR created_by = auth.uid()
    OR is_sub_user_of_admin(assigned_to, auth.uid())
    OR is_sub_user_of_admin(created_by, auth.uid())
  );

-- MESSAGES: Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can read their messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;

-- MESSAGES: Nouvelles politiques
CREATE POLICY "Users can read messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    -- L'utilisateur peut voir ses propres messages
    sent_by = auth.uid() OR sent_to = auth.uid() OR sent_to IS NULL
    -- Ou les messages envoyés par/à ses sub_users
    OR is_sub_user_of_admin(sent_by, auth.uid())
    OR is_sub_user_of_admin(sent_to, auth.uid())
  );

CREATE POLICY "Users can create messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sent_by = auth.uid()
    OR is_sub_user_of_admin(sent_by, auth.uid())
  );

CREATE POLICY "Users can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sent_to = auth.uid()
    OR is_sub_user_of_admin(sent_to, auth.uid())
  )
  WITH CHECK (
    sent_to = auth.uid()
    OR is_sub_user_of_admin(sent_to, auth.uid())
  );
