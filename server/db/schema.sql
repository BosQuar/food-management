-- Food Management Database Schema

-- Users table (for multi-user authentication)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  auth_token TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  store_category_id INTEGER REFERENCES store_categories(id),
  default_unit TEXT DEFAULT 'st',
  default_notes TEXT,
  is_staple BOOLEAN DEFAULT 0,
  is_misc BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id INTEGER PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  custom_name TEXT,
  store_category_id INTEGER REFERENCES store_categories(id),
  quantity REAL DEFAULT 1,
  unit TEXT DEFAULT 'st',
  notes TEXT,
  is_done BOOLEAN DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  servings INTEGER DEFAULT 4,
  source_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  custom_name TEXT,
  amount REAL,
  unit TEXT,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recipe_tags (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(recipe_id, tag_id)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_token ON users(auth_token);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(store_category_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_product ON shopping_items(product_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(store_category_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_user ON shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product ON recipe_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag ON recipe_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_user ON store_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_table ON sync_log(table_name, row_id);
