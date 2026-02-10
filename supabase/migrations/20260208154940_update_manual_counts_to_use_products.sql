/*
  # Mise à jour de manual_counts pour utiliser la table products

  1. Changements
    - Supprime la contrainte foreign key sur manual_count_products
    - Ajoute une contrainte foreign key sur products
    - Permet d'utiliser la table products (avec code-barres, référence, famille) pour le comptage manuel

  2. Sécurité
    - Les données existantes sont préservées
    - Les politiques RLS restent inchangées
*/

-- Supprimer l'ancienne contrainte foreign key
ALTER TABLE manual_counts
  DROP CONSTRAINT IF EXISTS manual_counts_product_id_fkey;

-- Ajouter la nouvelle contrainte foreign key vers la table products
ALTER TABLE manual_counts
  ADD CONSTRAINT manual_counts_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE;
