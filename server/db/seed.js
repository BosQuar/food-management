import { fileURLToPath } from 'url';
import { getDb } from './connection.js';

const categories = [
	{ name: 'Hygien', sort_order: 1 },
	{ name: 'Barnsaker', sort_order: 2 },
	{ name: 'Bröd/Kakor', sort_order: 3 },
	{ name: 'Ost/Kött', sort_order: 4 },
	{ name: 'Kryddor/Oljor', sort_order: 5 },
	{ name: 'Mejeri/Ägg', sort_order: 6 },
	{ name: 'Frukt/Grönt', sort_order: 7 },
	{ name: 'Torrvaror/Konserver', sort_order: 8 },
	{ name: 'Frysvaror/Tacos', sort_order: 9 },
	{ name: 'Hushållsartiklar', sort_order: 10 },
	{ name: 'Snacks/Bär', sort_order: 11 }
];

const products = [
	// 1. Hygien
	{ name: 'Tandkräm', category: 'Hygien', default_unit: 'st' },
	{ name: 'Tops', category: 'Hygien', default_unit: 'st' },
	{ name: 'Deo S', category: 'Hygien', default_unit: 'st' },
	{ name: 'Deo O', category: 'Hygien', default_unit: 'st' },
	{ name: 'Handtvål', category: 'Hygien', default_unit: 'st' },
	{ name: 'Schampo', category: 'Hygien', default_unit: 'st' },
	{ name: 'Duschtvål', category: 'Hygien', default_unit: 'st' },

	// 2. Barnsaker
	{ name: 'Majskrokar', category: 'Barnsaker', default_unit: 'frp' },
	{ name: 'Tvättlappar', category: 'Barnsaker', default_unit: 'st' },
	{ name: 'Klämmisar', category: 'Barnsaker', default_unit: 'st' },
	{ name: 'Våtservetter', category: 'Barnsaker', default_unit: 'frp' },
	{ name: 'Barnmat', category: 'Barnsaker', default_unit: 'st' },
	{ name: 'Blöjjor', category: 'Barnsaker', default_unit: 'frp' },

	// 3. Bröd/Kakor
	{ name: 'Gofika', category: 'Bröd/Kakor', default_unit: 'st' },
	{ name: 'Kaffefilter', category: 'Bröd/Kakor', default_unit: 'st' },
	{ name: 'Korvbröd', category: 'Bröd/Kakor', default_unit: 'frp' },
	{ name: 'Te', category: 'Bröd/Kakor', default_unit: 'frp' },
	{ name: 'Kaffe', category: 'Bröd/Kakor', default_unit: 'frp' },
	{ name: 'Saft', category: 'Bröd/Kakor', default_unit: 'st' },
	{ name: 'Hamburgerbröd', category: 'Bröd/Kakor', default_unit: 'frp' },
	{ name: 'Bröd', category: 'Bröd/Kakor', default_unit: 'frp' },

	// 4. Ost/Kött
	{ name: 'Kycklingfilé', category: 'Ost/Kött', default_unit: 'kg' },
	{ name: 'Blandfärs', category: 'Ost/Kött', default_unit: 'frp' },
	{ name: 'Salladsost i olja', category: 'Ost/Kött', default_unit: 'st' },
	{ name: 'Pizzakit', category: 'Ost/Kött', default_unit: 'st' },
	{ name: 'Potatissallad', category: 'Ost/Kött', default_unit: 'st' },
	{ name: 'Sill', category: 'Ost/Kött', default_unit: 'st' },
	{ name: 'Korv', category: 'Ost/Kött', default_unit: 'frp' },
	{ name: 'Mozzarella', category: 'Ost/Kött', default_unit: 'st' },
	{ name: 'Halloumi', category: 'Ost/Kött', default_unit: 'st' },
	{ name: 'Skinka', category: 'Ost/Kött', default_unit: 'frp' },
	{ name: 'Ost', category: 'Ost/Kött', default_unit: 'st' },

	// 5. Kryddor/Oljor
	{ name: 'Fiskbuljong', category: 'Kryddor/Oljor', default_unit: 'frp' },
	{ name: 'Grönskaksbuljong', category: 'Kryddor/Oljor', default_unit: 'frp' },
	{ name: 'Kycklingbuljong', category: 'Kryddor/Oljor', default_unit: 'frp' },
	{ name: 'Paprikapulver', category: 'Kryddor/Oljor', default_unit: 'st' },
	{ name: 'Salt', category: 'Kryddor/Oljor', default_unit: 'st' },
	{ name: 'Peppar', category: 'Kryddor/Oljor', default_unit: 'st' },
	{ name: 'Olivolja', category: 'Kryddor/Oljor', default_unit: 'st' },
	{ name: 'Rapsolja', category: 'Kryddor/Oljor', default_unit: 'st' },

	// 6. Mejeri/Ägg
	{ name: 'Kvarg', category: 'Mejeri/Ägg', default_unit: 'g' },
	{ name: 'Baksmör', category: 'Mejeri/Ägg', default_unit: 'g' },
	{ name: 'Svennes kaviar', category: 'Mejeri/Ägg', default_unit: 'st' },
	{ name: 'Steksmör', category: 'Mejeri/Ägg', default_unit: 'st' },
	{ name: 'Grädde', category: 'Mejeri/Ägg', default_unit: 'dl' },
	{ name: 'Creme fraiche', category: 'Mejeri/Ägg', default_unit: 'dl' },
	{ name: 'Matlagningsgrädde', category: 'Mejeri/Ägg', default_unit: 'dl' },
	{ name: 'Yoghurt', category: 'Mejeri/Ägg', default_unit: 'l' },
	{ name: 'Havredryck', category: 'Mejeri/Ägg', default_unit: 'l' },
	{ name: 'Ägg', category: 'Mejeri/Ägg', default_unit: 'st' },
	{ name: 'Smör', category: 'Mejeri/Ägg', default_unit: 'g' },
	{ name: 'Mjölk', category: 'Mejeri/Ägg', default_unit: 'l' },
	{ name: 'Fil', category: 'Mejeri/Ägg', default_unit: 'l' },

	// 7. Frukt/Grönt
	{ name: 'Avokado', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Spenat', category: 'Frukt/Grönt', default_unit: 'frp' },
	{ name: 'Purjolök', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Päron', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Zuccini', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Sötpotatis', category: 'Frukt/Grönt', default_unit: 'kg' },
	{ name: 'Isbergssallad', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Gurka', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Vitlök', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Morötter', category: 'Frukt/Grönt', default_unit: 'kg' },
	{ name: 'Citron', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Banan', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Lök', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Paprika', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Potatis', category: 'Frukt/Grönt', default_unit: 'kg' },
	{ name: 'Tomater', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Clementin', category: 'Frukt/Grönt', default_unit: 'st' },
	{ name: 'Äpple', category: 'Frukt/Grönt', default_unit: 'st' },

	// 8. Torrvaror/Konserver
	{ name: 'Quinoa', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Senap', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Lasagneplattor', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Socker', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Mjöl', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Remouladsås', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Tomatpuré', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Naan bröd', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Mandlar', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Plastpåsar', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Krossade tomater', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Pumpakärnor', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Solrosfrön', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Tonfisk i vatten', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Sweet chili', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Linser', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Pesto grön', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Pasta', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Bönor', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Sylt', category: 'Torrvaror/Konserver', default_unit: 'st' },
	{ name: 'Havregryn', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Ris', category: 'Torrvaror/Konserver', default_unit: 'frp' },
	{ name: 'Start', category: 'Torrvaror/Konserver', default_unit: 'st' },

	// 9. Frysvaror/Tacos
	{ name: 'Ärtor', category: 'Frysvaror/Tacos', default_unit: 'frp' },
	{ name: 'Dill fryst', category: 'Frysvaror/Tacos', default_unit: 'st' },
	{ name: 'Fiskpanetter', category: 'Frysvaror/Tacos', default_unit: 'frp' },
	{ name: 'Potatisbullar', category: 'Frysvaror/Tacos', default_unit: 'frp' },
	{ name: 'Persilja fryst', category: 'Frysvaror/Tacos', default_unit: 'st' },
	{ name: 'Köttbullar', category: 'Frysvaror/Tacos', default_unit: 'kg' },
	{ name: 'Vegofärs', category: 'Frysvaror/Tacos', default_unit: 'kg' },
	{ name: 'Nachos', category: 'Frysvaror/Tacos', default_unit: 'frp' },
	{ name: 'Tacosås', category: 'Frysvaror/Tacos', default_unit: 'st' },
	{ name: 'Tacobröd', category: 'Frysvaror/Tacos', default_unit: 'frp' },
	{ name: 'Fryspizza', category: 'Frysvaror/Tacos', default_unit: 'st' },
	{ name: 'Spenat fryst', category: 'Frysvaror/Tacos', default_unit: 'frp' },
	{ name: 'Broccoli', category: 'Frysvaror/Tacos', default_unit: 'frp' },
	{ name: 'Chicken nuggets', category: 'Frysvaror/Tacos', default_unit: 'frp' },
	{ name: 'Majs', category: 'Frysvaror/Tacos', default_unit: 'frp' },
	{ name: 'Lax', category: 'Frysvaror/Tacos', default_unit: 'g' },
	{ name: 'Vit fisk', category: 'Frysvaror/Tacos', default_unit: 'g' },

	// 10. Hushållsartiklar
	{ name: 'Kaffebryggare rengöring', category: 'Hushållsartiklar', default_unit: 'st' },
	{ name: 'Fönsterputs', category: 'Hushållsartiklar', default_unit: 'st' },
	{ name: 'Diskmedel', category: 'Hushållsartiklar', default_unit: 'st' },
	{ name: 'Diskmedelstabletter', category: 'Hushållsartiklar', default_unit: 'frp' },
	{ name: 'Hushållspapper', category: 'Hushållsartiklar', default_unit: 'frp' },
	{ name: 'Toalettpapper', category: 'Hushållsartiklar', default_unit: 'frp' },
	{ name: 'Tvättmedel', category: 'Hushållsartiklar', default_unit: 'st' },

	// 11. Snacks/Bär
	{ name: 'Mango', category: 'Snacks/Bär', default_unit: 'frp' },
	{ name: 'Hallon', category: 'Snacks/Bär', default_unit: 'frp' },
	{ name: 'Blåbär', category: 'Snacks/Bär', default_unit: 'frp' }
];

export function seed(force = false) {
	const db = getDb();

	// Check if already seeded
	const categoryCount = db.prepare('SELECT COUNT(*) as count FROM store_categories').get();
	if (categoryCount.count > 0 && !force) {
		console.log('Database already seeded, skipping...');
		return;
	}

	if (force) {
		console.log('Clearing existing data...');
		db.prepare('DELETE FROM recipe_ingredients').run();
		db.prepare('DELETE FROM recipes').run();
		db.prepare('DELETE FROM shopping_items').run();
		db.prepare('DELETE FROM products').run();
		db.prepare('DELETE FROM store_categories').run();
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

	// Insert recipes
	const insertRecipe = db.prepare(
		'INSERT INTO recipes (name, description, instructions, servings) VALUES (?, ?, ?, ?)'
	);
	const insertIngredient = db.prepare(
		'INSERT INTO recipe_ingredients (recipe_id, custom_name, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?)'
	);

	// Sweet Chili Chicken recipe
	const sweetChiliRecipe = {
		name: 'Sweet Chili Kyckling',
		description: 'En krämig sweet chili-kyckling som tillagas i ugn med ris.',
		servings: 5,
		instructions: `1. Ugn 200°C
2. Blanda grädde, crème fraîche, sweet chili, pressad vitlök och kryddor
3. Häll okokt ris i botten av formen
4. Tillsätt buljongen, rör om
5. Lägg kycklingen ovanpå, salta & peppra
6. Häll såsen över kycklingen
7. Täck med folie, ugn 40-45 min
8. Ta bort folien, ugn 10-15 min till för fin yta`,
		ingredients: [
			{ name: 'Kycklingfilé', amount: 1, unit: 'kg' },
			{ name: 'Ris', amount: 4, unit: 'dl' },
			{ name: 'Matlagningsgrädde', amount: 2.5, unit: 'dl' },
			{ name: 'Creme fraiche', amount: 2, unit: 'dl' },
			{ name: 'Sweet chili', amount: 1.25, unit: 'dl' },
			{ name: 'Vitlök', amount: 4, unit: 'klyftor' },
			{ name: 'Paprikapulver', amount: 1.5, unit: 'tsk' },
			{ name: 'Kycklingbuljong', amount: 3.5, unit: 'dl' },
			{ name: 'Salt', amount: null, unit: null },
			{ name: 'Peppar', amount: null, unit: null }
		]
	};

	const recipeResult = insertRecipe.run(
		sweetChiliRecipe.name,
		sweetChiliRecipe.description,
		sweetChiliRecipe.instructions,
		sweetChiliRecipe.servings
	);
	const recipeId = recipeResult.lastInsertRowid;

	sweetChiliRecipe.ingredients.forEach((ing, index) => {
		insertIngredient.run(recipeId, ing.name, ing.amount, ing.unit, index);
	});

	console.log(`Seeded ${categories.length} categories, ${products.length} products, and 1 recipe`);
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const force = process.argv.includes('--force');
	seed(force);
	process.exit(0);
}
