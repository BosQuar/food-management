import { fileURLToPath } from 'url';
import { getDb } from './connection.js';

const categories = [
	{ name: 'Frukt & Grönt', sort_order: 1 },
	{ name: 'Mejeri', sort_order: 2 },
	{ name: 'Kött & Fisk', sort_order: 3 },
	{ name: 'Bröd', sort_order: 4 },
	{ name: 'Frys', sort_order: 5 },
	{ name: 'Skafferi', sort_order: 6 },
	{ name: 'Dryck', sort_order: 7 },
	{ name: 'Hygien', sort_order: 8 },
	{ name: 'Övrigt', sort_order: 9 }
];

const products = [
	// Frukt & Grönt
	{ name: 'Äpple', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Banan', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Tomat', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Gurka', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Potatis', category: 'Frukt & Grönt', default_unit: 'kg' },
	{ name: 'Lök', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Vitlök', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Morötter', category: 'Frukt & Grönt', default_unit: 'förp' },
	{ name: 'Paprika', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Sallad', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Avokado', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Citron', category: 'Frukt & Grönt', default_unit: 'st' },
	{ name: 'Lime', category: 'Frukt & Grönt', default_unit: 'st' },

	// Mejeri
	{ name: 'Mjölk', category: 'Mejeri', default_unit: 'l' },
	{ name: 'Smör', category: 'Mejeri', default_unit: 'förp' },
	{ name: 'Ost', category: 'Mejeri', default_unit: 'förp' },
	{ name: 'Ägg', category: 'Mejeri', default_unit: 'förp' },
	{ name: 'Yoghurt', category: 'Mejeri', default_unit: 'förp' },
	{ name: 'Grädde', category: 'Mejeri', default_unit: 'förp' },
	{ name: 'Crème fraiche', category: 'Mejeri', default_unit: 'förp' },
	{ name: 'Kvarg', category: 'Mejeri', default_unit: 'förp' },

	// Kött & Fisk
	{ name: 'Kycklingfilé', category: 'Kött & Fisk', default_unit: 'förp' },
	{ name: 'Köttfärs', category: 'Kött & Fisk', default_unit: 'förp' },
	{ name: 'Fläskfilé', category: 'Kött & Fisk', default_unit: 'förp' },
	{ name: 'Lax', category: 'Kött & Fisk', default_unit: 'förp' },
	{ name: 'Bacon', category: 'Kött & Fisk', default_unit: 'förp' },
	{ name: 'Korv', category: 'Kött & Fisk', default_unit: 'förp' },
	{ name: 'Skinka', category: 'Kött & Fisk', default_unit: 'förp' },

	// Bröd
	{ name: 'Bröd', category: 'Bröd', default_unit: 'st' },
	{ name: 'Knäckebröd', category: 'Bröd', default_unit: 'förp' },
	{ name: 'Tortillabröd', category: 'Bröd', default_unit: 'förp' },

	// Frys
	{ name: 'Frysta grönsaker', category: 'Frys', default_unit: 'förp' },
	{ name: 'Glass', category: 'Frys', default_unit: 'förp' },
	{ name: 'Frysta bär', category: 'Frys', default_unit: 'förp' },
	{ name: 'Pizza', category: 'Frys', default_unit: 'st' },

	// Skafferi
	{ name: 'Pasta', category: 'Skafferi', default_unit: 'förp' },
	{ name: 'Ris', category: 'Skafferi', default_unit: 'förp' },
	{ name: 'Krossade tomater', category: 'Skafferi', default_unit: 'burk' },
	{ name: 'Olivolja', category: 'Skafferi', default_unit: 'flaska' },
	{ name: 'Soja', category: 'Skafferi', default_unit: 'flaska' },
	{ name: 'Mjöl', category: 'Skafferi', default_unit: 'förp' },
	{ name: 'Socker', category: 'Skafferi', default_unit: 'förp' },
	{ name: 'Salt', category: 'Skafferi', default_unit: 'förp' },
	{ name: 'Peppar', category: 'Skafferi', default_unit: 'förp' },
	{ name: 'Kokosmjölk', category: 'Skafferi', default_unit: 'burk' },
	{ name: 'Kikärtor', category: 'Skafferi', default_unit: 'burk' },
	{ name: 'Bönor', category: 'Skafferi', default_unit: 'burk' },

	// Dryck
	{ name: 'Kaffe', category: 'Dryck', default_unit: 'förp' },
	{ name: 'Te', category: 'Dryck', default_unit: 'förp' },
	{ name: 'Juice', category: 'Dryck', default_unit: 'förp' },
	{ name: 'Läsk', category: 'Dryck', default_unit: 'flaska' },
	{ name: 'Mineralvatten', category: 'Dryck', default_unit: 'flaska' },

	// Hygien
	{ name: 'Toalettpapper', category: 'Hygien', default_unit: 'förp' },
	{ name: 'Tvål', category: 'Hygien', default_unit: 'st' },
	{ name: 'Schampo', category: 'Hygien', default_unit: 'flaska' },
	{ name: 'Tandkräm', category: 'Hygien', default_unit: 'st' },
	{ name: 'Diskmedel', category: 'Hygien', default_unit: 'flaska' },
	{ name: 'Tvättmedel', category: 'Hygien', default_unit: 'förp' }
];

export function seed() {
	const db = getDb();

	// Check if already seeded
	const categoryCount = db.prepare('SELECT COUNT(*) as count FROM store_categories').get();
	if (categoryCount.count > 0) {
		console.log('Database already seeded, skipping...');
		return;
	}

	console.log('Seeding database...');

	// Insert categories
	const insertCategory = db.prepare('INSERT INTO store_categories (name, sort_order) VALUES (?, ?)');
	const categoryMap = {};

	for (const cat of categories) {
		const result = insertCategory.run(cat.name, cat.sort_order);
		categoryMap[cat.name] = result.lastInsertRowid;
	}

	// Insert products
	const insertProduct = db.prepare(
		'INSERT INTO products (name, store_category_id, default_unit) VALUES (?, ?, ?)'
	);

	for (const product of products) {
		const categoryId = categoryMap[product.category];
		insertProduct.run(product.name, categoryId, product.default_unit);
	}

	console.log(`Seeded ${categories.length} categories and ${products.length} products`);
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	seed();
	process.exit(0);
}
