import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use process.cwd() for relative path since we always run from project root
// In production (Docker), DB_PATH is set explicitly
const DB_PATH = process.env.DB_PATH || join(process.cwd(), "data/food.db");

let db: Database.Database | null = null;

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface TableInfo {
  name: string;
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema(): void {
  if (!db) return;

  const schemaPath = join(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  runMigrations();
}

function runMigrations(): void {
  if (!db) return;

  // Migration: Add description column to recipes table
  const recipeColumns = db
    .prepare("PRAGMA table_info(recipes)")
    .all() as ColumnInfo[];
  const hasDescription = recipeColumns.some(
    (col) => col.name === "description",
  );
  if (!hasDescription) {
    db.exec("ALTER TABLE recipes ADD COLUMN description TEXT");
    console.log("Migration: Added description column to recipes table");
  }

  // Migration: Add is_staple column to products table
  const productColumns = db
    .prepare("PRAGMA table_info(products)")
    .all() as ColumnInfo[];
  const hasIsStaple = productColumns.some((col) => col.name === "is_staple");
  if (!hasIsStaple) {
    db.exec("ALTER TABLE products ADD COLUMN is_staple BOOLEAN DEFAULT 0");
    console.log("Migration: Added is_staple column to products table");
  }

  // Migration: Create tags and recipe_tags tables
  const tagsTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tags'",
    )
    .get() as TableInfo | undefined;
  if (!tagsTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recipe_tags (
        id INTEGER PRIMARY KEY,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(recipe_id, tag_id)
      );

      CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe ON recipe_tags(recipe_id);
      CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag ON recipe_tags(tag_id);
    `);
    console.log("Migration: Created tags and recipe_tags tables");
  }

  // Migration: Add is_misc column to products table
  const hasIsMisc = productColumns.some((col) => col.name === "is_misc");
  if (!hasIsMisc) {
    db.exec("ALTER TABLE products ADD COLUMN is_misc BOOLEAN DEFAULT 0");
    console.log("Migration: Added is_misc column to products table");
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
