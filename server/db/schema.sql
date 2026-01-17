-- Food Management Database Schema

CREATE TABLE IF NOT EXISTS store_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  store_category_id INTEGER REFERENCES store_categories(id),
  default_unit TEXT DEFAULT 'st',
  default_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  instructions TEXT,
  servings INTEGER DEFAULT 4,
  source_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(store_category_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_product ON shopping_items(product_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(store_category_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product ON recipe_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_table ON sync_log(table_name, row_id);
