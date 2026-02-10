/*
  # Configuration du stockage de fichiers

  1. Buckets de stockage
    - `product-photos` - Photos des produits DLC
    - `cash-count-photos` - Photos des rapports Z

  2. Sécurité
    - Les utilisateurs authentifiés peuvent uploader des fichiers
    - Tous les utilisateurs authentifiés peuvent voir les fichiers
    - Accès public en lecture pour faciliter l'affichage
*/

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-photos', 'product-photos', true),
  ('cash-count-photos', 'cash-count-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload product photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-photos');

CREATE POLICY "Authenticated users can read product photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-photos');

CREATE POLICY "Authenticated users can upload cash count photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cash-count-photos');

CREATE POLICY "Authenticated users can read cash count photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cash-count-photos');
