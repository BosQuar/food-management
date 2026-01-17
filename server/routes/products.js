import express from "express";
import { getDb } from "../db/connection.js";
import { broadcastProductChange } from "../services/sync.js";

const router = express.Router();

// GET /api/products - lista alla, grupperat per kategori
router.get("/", (req, res) => {
  const db = getDb();

  const categories = db
    .prepare(
      `
		SELECT id, name, sort_order
		FROM store_categories
		ORDER BY sort_order
	`,
    )
    .all();

  const products = db
    .prepare(
      `
		SELECT p.id, p.name, p.store_category_id, p.default_unit, p.default_notes, p.created_at
		FROM products p
		ORDER BY p.name
	`,
    )
    .all();

  const grouped = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.store_category_id === cat.id),
  }));

  res.json(grouped);
});

// GET /api/products/export - exportera som JSON
router.get("/export", (req, res) => {
  const db = getDb();

  const categories = db
    .prepare(
      `
		SELECT id, name, sort_order
		FROM store_categories
		ORDER BY sort_order
	`,
    )
    .all();

  const products = db
    .prepare(
      `
		SELECT id, name, store_category_id, default_unit, default_notes
		FROM products
		ORDER BY name
	`,
    )
    .all();

  res.json({ categories, products });
});

// POST /api/products/import - importera från JSON
router.post("/import", (req, res) => {
  const db = getDb();
  const { categories, products } = req.body;

  if (!categories || !products) {
    return res
      .status(400)
      .json({ error: "Missing categories or products in request body" });
  }

  const insertCategory = db.prepare(`
		INSERT OR REPLACE INTO store_categories (id, name, sort_order)
		VALUES (?, ?, ?)
	`);

  const insertProduct = db.prepare(`
		INSERT OR REPLACE INTO products (id, name, store_category_id, default_unit, default_notes)
		VALUES (?, ?, ?, ?, ?)
	`);

  const transaction = db.transaction(() => {
    for (const cat of categories) {
      insertCategory.run(cat.id, cat.name, cat.sort_order);
    }
    for (const prod of products) {
      insertProduct.run(
        prod.id,
        prod.name,
        prod.store_category_id,
        prod.default_unit,
        prod.default_notes,
      );
    }
  });

  transaction();

  res.json({
    message: "Import successful",
    categoriesImported: categories.length,
    productsImported: products.length,
  });
});

// POST /api/products - skapa ny produkt
router.post("/", (req, res) => {
  const db = getDb();
  const { name, store_category_id, default_unit, default_notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const result = db
    .prepare(
      `
		INSERT INTO products (name, store_category_id, default_unit, default_notes)
		VALUES (?, ?, ?, ?)
	`,
    )
    .run(
      name,
      store_category_id || null,
      default_unit || "st",
      default_notes || null,
    );

  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(result.lastInsertRowid);

  broadcastProductChange("add", product);
  res.status(201).json(product);
});

// PUT /api/products/:id - uppdatera produkt
router.put("/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, store_category_id, default_unit, default_notes } = req.body;

  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  db.prepare(
    `
		UPDATE products
		SET name = ?, store_category_id = ?, default_unit = ?, default_notes = ?
		WHERE id = ?
	`,
  ).run(
    name ?? existing.name,
    store_category_id ?? existing.store_category_id,
    default_unit ?? existing.default_unit,
    default_notes ?? existing.default_notes,
    id,
  );

  const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  broadcastProductChange("update", updated);
  res.json(updated);
});

// DELETE /api/products/:id - ta bort produkt
router.delete("/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  db.prepare("DELETE FROM products WHERE id = ?").run(id);

  broadcastProductChange("delete", { id: parseInt(id) });
  res.json({ message: "Product deleted", id: parseInt(id) });
});

// GET /api/categories - hämta alla kategorier
router.get("/categories", (req, res) => {
  const db = getDb();

  const categories = db
    .prepare(
      `
		SELECT id, name, sort_order
		FROM store_categories
		ORDER BY sort_order
	`,
    )
    .all();

  res.json(categories);
});

export default router;
