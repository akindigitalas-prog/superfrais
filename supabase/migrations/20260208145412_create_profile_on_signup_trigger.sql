/*
  # Création automatique de profil lors de l'inscription

  1. Fonction
    - Crée automatiquement un profil lors de l'inscription d'un utilisateur
    - Si c'est akinsemi5@gmail.com, le rôle sera 'admin'
    - Sinon, le rôle sera 'employee' par défaut
  
  2. Trigger
    - Se déclenche après l'insertion dans auth.users
    - Crée automatiquement l'entrée dans la table profiles
*/

-- Fonction pour créer automatiquement un profil
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
BEGIN
  -- Définir le rôle en fonction de l'email
  IF NEW.email = 'akinsemi5@gmail.com' THEN
    user_role := 'admin';
  ELSE
    user_role := 'employee';
  END IF;

  -- Créer le profil
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    user_role
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();
