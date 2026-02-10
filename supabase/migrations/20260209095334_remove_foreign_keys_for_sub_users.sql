/*
  # Supprimer les foreign keys pour permettre sub_users

  1. Modifications
    - Supprimer les foreign keys de tasks et messages vers profiles
    - Cela permet d'utiliser des IDs de sub_users dans ces champs
    - Les références seront vérifiées au niveau applicatif
  
  2. Note
    - Les champs peuvent maintenant contenir des IDs de profiles OU de sub_users
    - L'intégrité référentielle sera maintenue par l'application
*/

-- Supprimer les foreign keys de la table tasks
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

-- Supprimer les foreign keys de la table messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sent_by_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sent_to_fkey;
