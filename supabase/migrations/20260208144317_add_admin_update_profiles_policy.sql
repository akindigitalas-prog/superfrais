/*
  # Ajouter politique pour permettre aux admins de modifier les profils
  
  1. Modifications
    - Ajoute une politique permettant aux administrateurs de modifier les profils des autres utilisateurs
    - Cela permet aux admins de changer les rôles des employés
  
  2. Sécurité
    - Vérifie que l'utilisateur qui fait la modification est bien admin
    - Utilise RLS pour garantir la sécurité
*/

-- Créer la politique pour que les admins puissent modifier les profils
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
