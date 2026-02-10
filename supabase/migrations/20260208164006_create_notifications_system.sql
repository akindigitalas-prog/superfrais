/*
  # Système de Notifications

  1. Nouvelles Tables
    - `notifications`
      - `id` (uuid, primary key) - Identifiant unique
      - `user_id` (uuid, foreign key) - ID de l'utilisateur
      - `type` (text) - Type de notification (dlc_alert, message, task, system)
      - `title` (text) - Titre de la notification
      - `message` (text) - Contenu de la notification
      - `related_id` (uuid) - ID de l'élément lié (produit, message, tâche)
      - `is_read` (boolean) - Notification lue ou non
      - `created_at` (timestamptz) - Date de création
    
    - `notification_settings`
      - `user_id` (uuid, primary key, foreign key) - ID de l'utilisateur
      - `dlc_alerts_enabled` (boolean) - Alertes DLC activées
      - `dlc_alert_days` (integer) - Jours avant DLC pour alerter
      - `message_alerts_enabled` (boolean) - Alertes messages activées
      - `task_alerts_enabled` (boolean) - Alertes tâches activées
      - `push_enabled` (boolean) - Notifications push activées
      - `updated_at` (timestamptz) - Date de mise à jour

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Policies pour notifications : accès uniquement à l'utilisateur concerné
    - Policies pour settings : accès uniquement à son propre profil
*/

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('dlc_alert', 'message', 'task', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies pour notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Table des paramètres de notifications
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dlc_alerts_enabled boolean NOT NULL DEFAULT true,
  dlc_alert_days integer NOT NULL DEFAULT 2,
  message_alerts_enabled boolean NOT NULL DEFAULT true,
  task_alerts_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies pour notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour créer les paramètres par défaut lors de la création d'un utilisateur
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement les paramètres de notifications
DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_settings();