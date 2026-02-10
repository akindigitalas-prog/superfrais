/*
  # Schéma de base de données Super Frais

  ## Vue d'ensemble
  Application de gestion pour supermarché avec modules DLC, comptage caisse, 
  comptage manuel, tâches et messagerie interne.

  ## Tables créées
  
  ### 1. profiles
  Profils utilisateurs avec rôles (admin/employé)
  - `id` (uuid, lié à auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (text: 'admin' ou 'employee')
  - `created_at` (timestamp)
  
  ### 2. products
  Catalogue produits avec code-barres
  - `id` (uuid, primary key)
  - `barcode` (text, unique)
  - `name` (text)
  - `photo_url` (text)
  - `created_at` (timestamp)
  - `created_by` (uuid, référence profiles)
  
  ### 3. dlc_entries
  Entrées DLC avec alertes
  - `id` (uuid, primary key)
  - `product_id` (uuid, référence products)
  - `quantity` (integer)
  - `dlc_date` (date)
  - `alert_days_before` (integer)
  - `status` (text: 'active', 'alerted', 'processed')
  - `created_at` (timestamp)
  - `created_by` (uuid, référence profiles)
  
  ### 4. dlc_actions
  Actions effectuées sur les DLC en alerte
  - `id` (uuid, primary key)
  - `dlc_entry_id` (uuid, référence dlc_entries)
  - `action_type` (text: 'sold', 'price_reduction', 'other')
  - `action_details` (text)
  - `processed_at` (timestamp)
  - `processed_by` (uuid, référence profiles)
  
  ### 5. cash_counts
  Comptages de caisse quotidiens
  - `id` (uuid, primary key)
  - `count_date` (date)
  - `z_report_photo_url` (text)
  - `bills_500` (integer)
  - `bills_200` (integer)
  - `bills_100` (integer)
  - `bills_50` (integer)
  - `bills_20` (integer)
  - `bills_10` (integer)
  - `bills_5` (integer)
  - `coins_2` (decimal)
  - `coins_1` (decimal)
  - `coins_050` (decimal)
  - `coins_020` (decimal)
  - `coins_010` (decimal)
  - `coins_005` (decimal)
  - `coins_002` (decimal)
  - `coins_001` (decimal)
  - `total_cash` (decimal, calculé)
  - `previous_float` (decimal)
  - `difference` (decimal, calculé)
  - `new_float` (decimal)
  - `created_at` (timestamp)
  - `created_by` (uuid, référence profiles)
  
  ### 6. manual_count_products
  Liste des produits pour comptage manuel
  - `id` (uuid, primary key)
  - `name` (text)
  - `category` (text)
  - `unit` (text: 'kg', 'pièce', 'botte', etc.)
  - `min_stock_alert` (decimal)
  - `is_active` (boolean)
  - `created_at` (timestamp)
  
  ### 7. manual_counts
  Comptages manuels effectués
  - `id` (uuid, primary key)
  - `product_id` (uuid, référence manual_count_products)
  - `quantity_in_store` (decimal)
  - `quantity_in_storage` (decimal)
  - `total_quantity` (decimal, calculé)
  - `count_date` (timestamp)
  - `counted_by` (uuid, référence profiles)
  
  ### 8. tasks
  Tâches assignées aux employés
  - `id` (uuid, primary key)
  - `title` (text)
  - `description` (text)
  - `assigned_to` (uuid, référence profiles)
  - `status` (text: 'pending', 'in_progress', 'completed')
  - `priority` (text: 'low', 'medium', 'high')
  - `due_date` (timestamp)
  - `created_at` (timestamp)
  - `created_by` (uuid, référence profiles)
  - `completed_at` (timestamp)
  
  ### 9. messages
  Messages internes entre employés
  - `id` (uuid, primary key)
  - `content` (text)
  - `sent_by` (uuid, référence profiles)
  - `sent_to` (uuid, référence profiles, nullable pour messages généraux)
  - `task_id` (uuid, référence tasks, nullable)
  - `is_read` (boolean)
  - `created_at` (timestamp)

  ## Sécurité
  - RLS activé sur toutes les tables
  - Utilisateurs authentifiés uniquement
  - Traçabilité complète des actions
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Table products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode text UNIQUE NOT NULL,
  name text NOT NULL,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "All authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table dlc_entries
CREATE TABLE IF NOT EXISTS dlc_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  dlc_date date NOT NULL,
  alert_days_before integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'alerted', 'processed')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL
);

ALTER TABLE dlc_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read dlc_entries"
  ON dlc_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert dlc_entries"
  ON dlc_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "All authenticated users can update dlc_entries"
  ON dlc_entries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table dlc_actions
CREATE TABLE IF NOT EXISTS dlc_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dlc_entry_id uuid REFERENCES dlc_entries(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('sold', 'price_reduction', 'other')),
  action_details text,
  processed_at timestamptz DEFAULT now(),
  processed_by uuid REFERENCES profiles(id) NOT NULL
);

ALTER TABLE dlc_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read dlc_actions"
  ON dlc_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert dlc_actions"
  ON dlc_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = processed_by);

-- Table cash_counts
CREATE TABLE IF NOT EXISTS cash_counts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_date date NOT NULL,
  z_report_photo_url text,
  bills_500 integer DEFAULT 0,
  bills_200 integer DEFAULT 0,
  bills_100 integer DEFAULT 0,
  bills_50 integer DEFAULT 0,
  bills_20 integer DEFAULT 0,
  bills_10 integer DEFAULT 0,
  bills_5 integer DEFAULT 0,
  coins_2 decimal(10,2) DEFAULT 0,
  coins_1 decimal(10,2) DEFAULT 0,
  coins_050 decimal(10,2) DEFAULT 0,
  coins_020 decimal(10,2) DEFAULT 0,
  coins_010 decimal(10,2) DEFAULT 0,
  coins_005 decimal(10,2) DEFAULT 0,
  coins_002 decimal(10,2) DEFAULT 0,
  coins_001 decimal(10,2) DEFAULT 0,
  total_cash decimal(10,2) NOT NULL,
  previous_float decimal(10,2) DEFAULT 0,
  difference decimal(10,2) NOT NULL,
  new_float decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  UNIQUE(count_date)
);

ALTER TABLE cash_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read cash_counts"
  ON cash_counts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert cash_counts"
  ON cash_counts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update cash_counts"
  ON cash_counts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Table manual_count_products
CREATE TABLE IF NOT EXISTS manual_count_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text DEFAULT 'Général',
  unit text DEFAULT 'pièce',
  min_stock_alert decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE manual_count_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read manual_count_products"
  ON manual_count_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert manual_count_products"
  ON manual_count_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update manual_count_products"
  ON manual_count_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Table manual_counts
CREATE TABLE IF NOT EXISTS manual_counts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES manual_count_products(id) ON DELETE CASCADE NOT NULL,
  quantity_in_store decimal(10,2) DEFAULT 0,
  quantity_in_storage decimal(10,2) DEFAULT 0,
  total_quantity decimal(10,2) GENERATED ALWAYS AS (quantity_in_store + quantity_in_storage) STORED,
  count_date timestamptz DEFAULT now(),
  counted_by uuid REFERENCES profiles(id) NOT NULL
);

ALTER TABLE manual_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read manual_counts"
  ON manual_counts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert manual_counts"
  ON manual_counts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = counted_by);

-- Table tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  completed_at timestamptz
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read tasks assigned to them or created by them"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = assigned_to OR 
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tasks assigned to them or created by them"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_to OR 
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = assigned_to OR 
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Table messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  content text NOT NULL,
  sent_by uuid REFERENCES profiles(id) NOT NULL,
  sent_to uuid REFERENCES profiles(id),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages sent to them or by them"
  ON messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sent_by OR 
    auth.uid() = sent_to OR 
    sent_to IS NULL OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sent_by);

CREATE POLICY "Users can update messages sent to them"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sent_to)
  WITH CHECK (auth.uid() = sent_to);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_dlc_entries_status ON dlc_entries(status);
CREATE INDEX IF NOT EXISTS idx_dlc_entries_dlc_date ON dlc_entries(dlc_date);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_messages_sent_to ON messages(sent_to);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
