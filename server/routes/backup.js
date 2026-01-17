import express from 'express';
import { getDb } from '../db/connection.js';

const router = express.Router();

// GET /api/backup - exportera all data som JSON
router.get('/', (req, res) => {
	const db = getDb();

	const backup = {
		version: 1,
		timestamp: new Date().toISOString(),
		data: {
			store_categories: db.prepare('SELECT * FROM store_categories ORDER BY sort_order').all(),
			products: db.prepare('SELECT * FROM products ORDER BY id').all(),
			shopping_items: db.prepare('SELECT * FROM shopping_items ORDER BY id').all(),
			recipes: db.prepare('SELECT * FROM recipes ORDER BY id').all(),
			recipe_ingredients: db.prepare('SELECT * FROM recipe_ingredients ORDER BY id').all()
		}
	};

	res.json(backup);
});

// POST /api/restore - återställ från JSON-backup
router.post('/restore', (req, res) => {
	const db = getDb();
	const { data } = req.body;

	if (!data) {
		return res.status(400).json({ error: 'Missing data in request body' });
	}

	const { store_categories, products, shopping_items, recipes, recipe_ingredients } = data;

	const transaction = db.transaction(() => {
		// Clear all tables (in reverse dependency order)
		db.prepare('DELETE FROM recipe_ingredients').run();
		db.prepare('DELETE FROM recipes').run();
		db.prepare('DELETE FROM shopping_items').run();
		db.prepare('DELETE FROM products').run();
		db.prepare('DELETE FROM store_categories').run();

		// Insert categories
		if (store_categories) {
			const insertCategory = db.prepare('INSERT INTO store_categories (id, name, sort_order) VALUES (?, ?, ?)');
			for (const cat of store_categories) {
				insertCategory.run(cat.id, cat.name, cat.sort_order);
			}
		}

		// Insert products
		if (products) {
			const insertProduct = db.prepare('INSERT INTO products (id, name, store_category_id, default_unit, default_notes, created_at) VALUES (?, ?, ?, ?, ?, ?)');
			for (const prod of products) {
				insertProduct.run(prod.id, prod.name, prod.store_category_id, prod.default_unit, prod.default_notes, prod.created_at);
			}
		}

		// Insert shopping items
		if (shopping_items) {
			const insertItem = db.prepare('INSERT INTO shopping_items (id, product_id, custom_name, store_category_id, quantity, unit, notes, is_done, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
			for (const item of shopping_items) {
				insertItem.run(item.id, item.product_id, item.custom_name, item.store_category_id, item.quantity, item.unit, item.notes, item.is_done, item.updated_at);
			}
		}

		// Insert recipes
		if (recipes) {
			const insertRecipe = db.prepare('INSERT INTO recipes (id, name, instructions, servings, source_url, created_at) VALUES (?, ?, ?, ?, ?, ?)');
			for (const recipe of recipes) {
				insertRecipe.run(recipe.id, recipe.name, recipe.instructions, recipe.servings, recipe.source_url, recipe.created_at);
			}
		}

		// Insert recipe ingredients
		if (recipe_ingredients) {
			const insertIngredient = db.prepare('INSERT INTO recipe_ingredients (id, recipe_id, product_id, custom_name, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
			for (const ing of recipe_ingredients) {
				insertIngredient.run(ing.id, ing.recipe_id, ing.product_id, ing.custom_name, ing.amount, ing.unit, ing.sort_order);
			}
		}
	});

	transaction();

	res.json({
		message: 'Restore successful',
		restored: {
			categories: store_categories?.length || 0,
			products: products?.length || 0,
			shopping_items: shopping_items?.length || 0,
			recipes: recipes?.length || 0,
			recipe_ingredients: recipe_ingredients?.length || 0
		}
	});
});

export default router;
