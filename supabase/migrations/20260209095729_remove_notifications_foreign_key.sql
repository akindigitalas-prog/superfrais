/*
  # Supprimer la foreign key de notifications

  1. Modifications
    - Supprimer la foreign key de notifications vers profiles/users
    - Cela permet de créer des notifications pour les sub_users aussi
    - Les références seront vérifiées au niveau applicatif
  
  2. Note
    - Le champ user_id peut maintenant contenir des IDs de profiles OU de sub_users
*/

-- Supprimer la foreign key de la table notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
