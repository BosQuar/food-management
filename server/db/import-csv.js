import { getDb } from './connection.js';
import fs from 'fs';

const csvPath = process.argv[2];

if (!csvPath) {
	console.error('Usage: node import-csv.js <path-to-csv>');
	process.exit(1);
}

// Read and parse CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Skip header
const header = lines[0];
const dataLines = lines.slice(1);

// Parse CSV line (handles quoted fields with commas)
function parseCSVLine(line) {
	const result = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	result.push(current.trim());
	return result;
}

// Parse data
const products = [];
const categorySet = new Map();

for (const line of dataLines) {
	const [add, name, category, notes, qty, done] = parseCSVLine(line);

	// Skip "Sällan saker" entries (these are category notes)
	if (name === 'Sällan saker') continue;

	// Parse category - format is "N. Category Name" or "N Category Name"
	const categoryMatch = category.match(/^(\d+)\.?\s*(.+)$/);
	if (categoryMatch) {
		const sortOrder = parseInt(categoryMatch[1]);
		const categoryName = categoryMatch[2].trim();

		if (!categorySet.has(categoryName)) {
			categorySet.set(categoryName, sortOrder);
		}

		products.push({
			name: name.trim(),
			category: categoryName,
			notes: notes || null,
			default_unit: 'st'
		});
	}
}

// Sort categories by sort_order
const categories = Array.from(categorySet.entries())
	.sort((a, b) => a[1] - b[1])
	.map(([name, sort_order]) => ({ name, sort_order }));

console.log('Categories to import:', categories.length);
console.log('Products to import:', products.length);

// Import to database
const db = getDb();

// Clear existing data
console.log('Clearing existing data...');
db.prepare('DELETE FROM recipe_ingredients').run();
db.prepare('DELETE FROM recipes').run();
db.prepare('DELETE FROM shopping_items').run();
db.prepare('DELETE FROM products').run();
db.prepare('DELETE FROM store_categories').run();

// Insert categories
console.log('Inserting categories...');
const insertCategory = db.prepare('INSERT INTO store_categories (name, sort_order) VALUES (?, ?)');
const categoryMap = {};

for (const cat of categories) {
	const result = insertCategory.run(cat.name, cat.sort_order);
	categoryMap[cat.name] = result.lastInsertRowid;
	console.log(`  - ${cat.name} (sort: ${cat.sort_order})`);
}

// Insert products (avoid duplicates by name+category)
console.log('Inserting products...');
const insertProduct = db.prepare(
	'INSERT INTO products (name, store_category_id, default_unit, default_notes) VALUES (?, ?, ?, ?)'
);

const seen = new Set();
let insertedCount = 0;

for (const product of products) {
	const key = `${product.name}|${product.category}`;
	if (seen.has(key)) continue;
	seen.add(key);

	const categoryId = categoryMap[product.category];
	if (categoryId) {
		insertProduct.run(product.name, categoryId, product.default_unit, product.notes);
		insertedCount++;
	}
}

console.log(`\nImported ${categories.length} categories and ${insertedCount} products`);
