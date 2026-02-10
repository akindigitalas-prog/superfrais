/*
  # Promouvoir akinsemi5@gmail.com en administrateur

  1. Modifications
    - Crée une fonction qui vérifie si l'utilisateur est akinsemi5@gmail.com
    - Ajoute un trigger qui le rend automatiquement admin lors de la création
  
  2. Sécurité
    - Fonctionne uniquement pour cet email spécifique
*/

-- Fonction pour rendre akinsemi5@gmail.com admin
CREATE OR REPLACE FUNCTION make_akinsemi_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est l'email akinsemi5@gmail.com, le rendre admin
  IF NEW.email = 'akinsemi5@gmail.com' THEN
    NEW.role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS set_akinsemi_admin ON profiles;

CREATE TRIGGER set_akinsemi_admin
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION make_akinsemi_admin();

-- Si le compte existe déjà, le mettre à jour
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'akinsemi5@gmail.com' AND role != 'admin';
