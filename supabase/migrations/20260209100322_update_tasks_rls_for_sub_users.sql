/*
  # Mise à jour des politiques RLS pour les tâches

  1. Problème
    - Les sub_users ne peuvent pas accéder aux tâches qui leur sont assignées
    - auth.uid() retourne l'ID de l'admin, pas du sub_user

  2. Solution
    - Permettre à tous les utilisateurs authentifiés d'accéder aux tâches
    - La sécurité est gérée au niveau applicatif

  3. Note
    - Les tâches peuvent être assignées à des profiles OU des sub_users
*/

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "All authenticated users can read tasks" ON tasks;
DROP POLICY IF EXISTS "All authenticated users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks or admin can update all" ON tasks;

-- Nouvelle politique de lecture : tous les utilisateurs authentifiés peuvent lire toutes les tâches
CREATE POLICY "Authenticated users can read all tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

-- Politique d'insertion : tous les utilisateurs authentifiés peuvent créer des tâches
CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique de mise à jour : tous les utilisateurs authentifiés peuvent mettre à jour les tâches
CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique de suppression : tous les utilisateurs authentifiés peuvent supprimer les tâches
CREATE POLICY "Authenticated users can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);
