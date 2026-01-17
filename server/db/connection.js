import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '../../data/food.db');

let db = null;

export function getDb() {
	if (!db) {
		db = new Database(DB_PATH);
		db.pragma('journal_mode = WAL');
		db.pragma('foreign_keys = ON');
		initSchema();
	}
	return db;
}

function initSchema() {
	const schemaPath = join(__dirname, 'schema.sql');
	const schema = readFileSync(schemaPath, 'utf-8');
	db.exec(schema);

	// Run migrations
	runMigrations();
}

function runMigrations() {
	// Migration: Add description column to recipes table
	const columns = db.prepare("PRAGMA table_info(recipes)").all();
	const hasDescription = columns.some(col => col.name === 'description');
	if (!hasDescription) {
		db.exec('ALTER TABLE recipes ADD COLUMN description TEXT');
		console.log('Migration: Added description column to recipes table');
	}
}

export function closeDb() {
	if (db) {
		db.close();
		db = null;
	}
}
