/*
  # Rendre le premier utilisateur administrateur

  1. Modifications
    - Crée une fonction qui vérifie si l'utilisateur est le premier
    - Ajoute un trigger qui rend automatiquement le premier utilisateur admin
  
  2. Sécurité
    - La fonction s'exécute uniquement lors de la création d'un nouveau profil
    - Seul le premier utilisateur obtient automatiquement le rôle admin
*/

-- Fonction pour rendre le premier utilisateur admin
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est le premier utilisateur (pas d'autres profils), le rendre admin
  IF (SELECT COUNT(*) FROM profiles) = 0 THEN
    NEW.role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS set_first_user_admin ON profiles;

CREATE TRIGGER set_first_user_admin
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();
