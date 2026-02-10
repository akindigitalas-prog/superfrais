/*
  # Ajouter le montant du rapport Z au comptage de caisse
  
  ## Modifications
  
  1. Ajoute la colonne `z_report_total` à la table `cash_counts`
    - Stocke le montant total du rapport Z (ventes de la journée)
    - Type: numeric(10,2)
    - Par défaut: 0
  
  ## Calcul de la différence
  
  Avec cette colonne, la différence sera calculée comme:
  - Total attendu = fond de caisse précédent + rapport Z
  - Différence = Total compté - Total attendu
  
  Une différence négative indique un manque dans la caisse.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_counts' AND column_name = 'z_report_total'
  ) THEN
    ALTER TABLE cash_counts ADD COLUMN z_report_total numeric(10,2) DEFAULT 0 NOT NULL;
  END IF;
END $$;