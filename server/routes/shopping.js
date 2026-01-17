import express from 'express';
import { getDb } from '../db/connection.js';
import { broadcastShoppingChange } from '../services/sync.js';

const router = express.Router();

// GET /api/shopping - hämta aktiv lista grupperat per kategori
router.get('/', (req, res) => {
	const db = getDb();

	const items = db.prepare(`
		SELECT
			si.id, si.product_id, si.custom_name, si.store_category_id,
			si.quantity, si.unit, si.notes, si.is_done, si.updated_at,
			p.name as product_name,
			COALESCE(si.store_category_id, p.store_category_id) as category_id,
			sc.name as category_name, sc.sort_order
		FROM shopping_items si
		LEFT JOIN products p ON si.product_id = p.id
		LEFT JOIN store_categories sc ON COALESCE(si.store_category_id, p.store_category_id) = sc.id
		ORDER BY sc.sort_order, si.is_done, COALESCE(si.custom_name, p.name)
	`).all();

	res.json(items);
});

// POST /api/shopping - lägg till produkt (med product_id)
// Om produkten redan finns i listan, uppdatera kvantiteten istället
// quantity kan vara null för "utan kvantitet"
router.post('/', (req, res) => {
	const db = getDb();
	const { product_id, quantity, unit, notes } = req.body;

	if (!product_id) {
		return res.status(400).json({ error: 'product_id is required' });
	}

	const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
	if (!product) {
		return res.status(404).json({ error: 'Product not found' });
	}

	// Check if quantity is provided (not null/undefined)
	const hasQuantity = quantity !== null && quantity !== undefined;
	const effectiveQuantity = hasQuantity ? quantity : null;
	const effectiveUnit = hasQuantity ? (unit || product.default_unit) : null;

	// Check if product already exists in shopping list (not done)
	const existing = db.prepare(`
		SELECT * FROM shopping_items
		WHERE product_id = ? AND is_done = 0
	`).get(product_id);

	let item;
	if (existing) {
		if (hasQuantity && existing.quantity !== null) {
			// Both have quantity - add to existing
			const newQuantity = existing.quantity + effectiveQuantity;
			db.prepare(`
				UPDATE shopping_items
				SET quantity = ?, unit = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`).run(newQuantity, effectiveUnit, existing.id);
		} else if (hasQuantity && existing.quantity === null) {
			// New has quantity, existing doesn't - update to have quantity
			db.prepare(`
				UPDATE shopping_items
				SET quantity = ?, unit = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`).run(effectiveQuantity, effectiveUnit, existing.id);
		}
		// If no quantity on new and existing has quantity/no quantity - do nothing (handled by frontend)

		item = db.prepare(`
			SELECT si.*, p.name as product_name, sc.name as category_name
			FROM shopping_items si
			LEFT JOIN products p ON si.product_id = p.id
			LEFT JOIN store_categories sc ON p.store_category_id = sc.id
			WHERE si.id = ?
		`).get(existing.id);

		broadcastShoppingChange('update', item);
		res.json(item);
	} else {
		// Insert new item
		const result = db.prepare(`
			INSERT INTO shopping_items (product_id, quantity, unit, notes)
			VALUES (?, ?, ?, ?)
		`).run(product_id, effectiveQuantity, effectiveUnit, notes || null);

		item = db.prepare(`
			SELECT si.*, p.name as product_name, sc.name as category_name
			FROM shopping_items si
			LEFT JOIN products p ON si.product_id = p.id
			LEFT JOIN store_categories sc ON p.store_category_id = sc.id
			WHERE si.id = ?
		`).get(result.lastInsertRowid);

		broadcastShoppingChange('add', item);
		res.status(201).json(item);
	}
});

// POST /api/shopping/custom - lägg till manuell vara (custom_name)
// Om varan redan finns i listan, uppdatera kvantiteten istället
router.post('/custom', (req, res) => {
	const db = getDb();
	const { custom_name, store_category_id, quantity, unit, notes } = req.body;

	if (!custom_name) {
		return res.status(400).json({ error: 'custom_name is required' });
	}

	const effectiveUnit = unit || 'st';
	const effectiveQuantity = quantity || 1;

	// Check if custom item already exists with same name and unit
	const existing = db.prepare(`
		SELECT * FROM shopping_items
		WHERE custom_name = ? AND unit = ? AND is_done = 0
	`).get(custom_name, effectiveUnit);

	let item;
	if (existing) {
		// Update quantity
		const newQuantity = existing.quantity + effectiveQuantity;
		db.prepare(`
			UPDATE shopping_items
			SET quantity = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`).run(newQuantity, existing.id);

		item = db.prepare(`
			SELECT si.*, sc.name as category_name
			FROM shopping_items si
			LEFT JOIN store_categories sc ON si.store_category_id = sc.id
			WHERE si.id = ?
		`).get(existing.id);

		broadcastShoppingChange('update', item);
		res.json(item);
	} else {
		// Insert new item
		const result = db.prepare(`
			INSERT INTO shopping_items (custom_name, store_category_id, quantity, unit, notes)
			VALUES (?, ?, ?, ?, ?)
		`).run(custom_name, store_category_id || null, effectiveQuantity, effectiveUnit, notes || null);

		item = db.prepare(`
			SELECT si.*, sc.name as category_name
			FROM shopping_items si
			LEFT JOIN store_categories sc ON si.store_category_id = sc.id
			WHERE si.id = ?
		`).get(result.lastInsertRowid);

		broadcastShoppingChange('add', item);
		res.status(201).json(item);
	}
});

// PUT /api/shopping/:id - uppdatera quantity/unit/done
router.put('/:id', (req, res) => {
	const db = getDb();
	const { id } = req.params;
	const body = req.body;

	const existing = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id);
	if (!existing) {
		return res.status(404).json({ error: 'Shopping item not found' });
	}

	// Use hasOwnProperty to check if key was explicitly provided (even if null)
	const quantity = 'quantity' in body ? body.quantity : existing.quantity;
	const unit = 'unit' in body ? body.unit : existing.unit;
	const notes = 'notes' in body ? body.notes : existing.notes;
	const is_done = 'is_done' in body ? body.is_done : existing.is_done;

	db.prepare(`
		UPDATE shopping_items
		SET quantity = ?, unit = ?, notes = ?, is_done = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`).run(quantity, unit, notes, is_done, id);

	const item = db.prepare(`
		SELECT si.*, p.name as product_name, sc.name as category_name
		FROM shopping_items si
		LEFT JOIN products p ON si.product_id = p.id
		LEFT JOIN store_categories sc ON COALESCE(si.store_category_id, p.store_category_id) = sc.id
		WHERE si.id = ?
	`).get(id);

	broadcastShoppingChange('update', item);
	res.json(item);
});

// DELETE /api/shopping/:id - ta bort enskild
router.delete('/:id', (req, res) => {
	const db = getDb();
	const { id } = req.params;

	const existing = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id);
	if (!existing) {
		return res.status(404).json({ error: 'Shopping item not found' });
	}

	db.prepare('DELETE FROM shopping_items WHERE id = ?').run(id);

	broadcastShoppingChange('delete', { id: parseInt(id) });
	res.json({ message: 'Shopping item deleted', id: parseInt(id) });
});

// POST /api/shopping/reset - rensa hela listan
router.post('/reset', (req, res) => {
	const db = getDb();

	const result = db.prepare('DELETE FROM shopping_items').run();

	broadcastShoppingChange('reset', { itemsDeleted: result.changes });
	res.json({ message: 'Shopping list cleared', itemsDeleted: result.changes });
});

export default router;
