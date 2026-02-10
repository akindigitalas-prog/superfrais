/*
  # Mise à jour de la table products pour l'import Excel

  1. Modifications de la table products
    - Ajout de `supplier` (fournisseur)
    - Ajout de `reference` (référence produit)
    - Ajout de `family` (famille de produit)
    - Modification de created_by pour permettre NULL (imports automatiques)
  
  2. Nouvelle table import_logs
    - `id` (uuid, primary key)
    - `filename` (text) - nom du fichier importé
    - `total_rows` (integer) - nombre total de lignes dans le fichier
    - `imported_count` (integer) - nombre de produits importés
    - `duplicate_count` (integer) - nombre de doublons dans le fichier
    - `existing_count` (integer) - nombre de produits déjà existants
    - `new_count` (integer) - nombre de nouveaux produits ajoutés
    - `created_at` (timestamp) - date d'import
    - `created_by` (uuid) - admin qui a fait l'import
  
  3. Sécurité
    - RLS activé sur import_logs
    - Seuls les admins peuvent voir et créer des logs d'import
*/

-- Ajouter les nouvelles colonnes à la table products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'supplier'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'reference'
  ) THEN
    ALTER TABLE products ADD COLUMN reference text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'family'
  ) THEN
    ALTER TABLE products ADD COLUMN family text;
  END IF;
END $$;

-- Modifier created_by pour permettre NULL (imports automatiques)
ALTER TABLE products ALTER COLUMN created_by DROP NOT NULL;

-- Créer la table import_logs
CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  existing_count integer NOT NULL DEFAULT 0,
  new_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL
);

ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire les logs d'import
CREATE POLICY "Admins can read import logs"
  ON import_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seuls les admins peuvent créer des logs d'import
CREATE POLICY "Admins can insert import logs"
  ON import_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_family ON products(family);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_by ON import_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at DESC);
