/*
  # Mise à jour de manual_counts pour les commandes fournisseurs

  1. Changements
    - Supprime les colonnes quantity_in_store et quantity_in_storage
    - Supprime la colonne calculée total_quantity
    - Ajoute la colonne quantity_to_order pour stocker les quantités à commander
    - Cette table sert maintenant uniquement à créer des listes de commande fournisseurs

  2. Sécurité
    - Les politiques RLS restent inchangées
*/

-- Supprimer l'ancienne colonne calculée
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manual_counts' AND column_name = 'total_quantity'
  ) THEN
    ALTER TABLE manual_counts DROP COLUMN total_quantity;
  END IF;
END $$;

-- Supprimer les anciennes colonnes de stock
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manual_counts' AND column_name = 'quantity_in_store'
  ) THEN
    ALTER TABLE manual_counts DROP COLUMN quantity_in_store;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manual_counts' AND column_name = 'quantity_in_storage'
  ) THEN
    ALTER TABLE manual_counts DROP COLUMN quantity_in_storage;
  END IF;
END $$;

-- Ajouter la colonne pour les quantités à commander
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manual_counts' AND column_name = 'quantity_to_order'
  ) THEN
    ALTER TABLE manual_counts ADD COLUMN quantity_to_order integer NOT NULL DEFAULT 0;
  END IF;
END $$;
