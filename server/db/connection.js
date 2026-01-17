import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, "../../data/food.db");

let db = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  const schemaPath = join(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  // Run migrations
  runMigrations();
}

function runMigrations() {
  // Migration: Add description column to recipes table
  const recipeColumns = db.prepare("PRAGMA table_info(recipes)").all();
  const hasDescription = recipeColumns.some((col) => col.name === "description");
  if (!hasDescription) {
    db.exec("ALTER TABLE recipes ADD COLUMN description TEXT");
    console.log("Migration: Added description column to recipes table");
  }

  // Migration: Add is_staple column to products table
  const productColumns = db.prepare("PRAGMA table_info(products)").all();
  const hasIsStaple = productColumns.some((col) => col.name === "is_staple");
  if (!hasIsStaple) {
    db.exec("ALTER TABLE products ADD COLUMN is_staple BOOLEAN DEFAULT 0");
    console.log("Migration: Added is_staple column to products table");
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
