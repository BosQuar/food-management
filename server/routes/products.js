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
		SELECT p.id, p.name, p.store_category_id, p.default_unit, p.default_notes, p.is_staple, p.is_misc, p.created_at
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
		SELECT id, name, store_category_id, default_unit, default_notes, is_staple
		FROM products
		ORDER BY name
	`,
    )
    .all();

  res.json({ categories, products });
});

// POST /api/products/import-merge - importera, hoppa över om namn finns
router.post("/import-merge", (req, res) => {
  const db = getDb();
  const { categories, products } = req.body;

  if (!products) {
    return res.status(400).json({ error: "Missing products in request body" });
  }

  let imported = 0;
  let skipped = 0;

  const transaction = db.transaction(() => {
    // Import categories if provided (by name, skip if exists)
    const newCategoryIds = [];
    if (categories && Array.isArray(categories)) {
      const existingCats = db
        .prepare("SELECT name FROM store_categories")
        .all()
        .map((c) => c.name.toLowerCase());

      const insertCat = db.prepare(
        "INSERT INTO store_categories (name, sort_order) VALUES (?, ?)",
      );

      for (const cat of categories) {
        if (!existingCats.includes(cat.name.toLowerCase())) {
          const result = insertCat.run(cat.name, cat.sort_order || 0);
          newCategoryIds.push(result.lastInsertRowid);
        }
      }
    }

    // Auto-create "Sällansaker" for new categories
    if (newCategoryIds.length > 0) {
      const insertMisc = db.prepare(
        "INSERT INTO products (name, store_category_id, default_unit, is_misc) VALUES (?, ?, ?, ?)",
      );
      for (const catId of newCategoryIds) {
        insertMisc.run("Sällansaker", catId, "st", 1);
      }
    }

    // Get category mapping by name
    const catMap = {};
    db.prepare("SELECT id, name FROM store_categories")
      .all()
      .forEach((c) => {
        catMap[c.name.toLowerCase()] = c.id;
      });

    // Import products (by name, skip if exists)
    const existingProducts = db
      .prepare("SELECT name FROM products")
      .all()
      .map((p) => p.name.toLowerCase());

    const insertProduct = db.prepare(`
      INSERT INTO products (name, store_category_id, default_unit, default_notes, is_staple)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const prod of products) {
      if (existingProducts.includes(prod.name.toLowerCase())) {
        skipped++;
      } else {
        // Find category by name if provided
        let categoryId = prod.store_category_id || null;
        if (prod.category_name) {
          categoryId = catMap[prod.category_name.toLowerCase()] || null;
        }

        insertProduct.run(
          prod.name,
          categoryId,
          prod.default_unit || "st",
          prod.default_notes || null,
          prod.is_staple || 0,
        );
        imported++;
      }
    }
  });

  transaction();

  res.json({ imported, skipped });
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
		INSERT OR REPLACE INTO products (id, name, store_category_id, default_unit, default_notes, is_staple)
		VALUES (?, ?, ?, ?, ?, ?)
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
        prod.is_staple || 0,
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
  const { name, store_category_id, default_unit, default_notes, is_staple } =
    req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const result = db
    .prepare(
      `
		INSERT INTO products (name, store_category_id, default_unit, default_notes, is_staple)
		VALUES (?, ?, ?, ?, ?)
	`,
    )
    .run(
      name,
      store_category_id || null,
      default_unit || "st",
      default_notes || null,
      is_staple ? 1 : 0,
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
  const body = req.body;

  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Use hasOwnProperty to check if is_staple was explicitly provided
  const is_staple =
    "is_staple" in body ? (body.is_staple ? 1 : 0) : existing.is_staple;

  db.prepare(
    `
		UPDATE products
		SET name = ?, store_category_id = ?, default_unit = ?, default_notes = ?, is_staple = ?
		WHERE id = ?
	`,
  ).run(
    body.name ?? existing.name,
    body.store_category_id ?? existing.store_category_id,
    body.default_unit ?? existing.default_unit,
    body.default_notes ?? existing.default_notes,
    is_staple,
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

  // Prevent deletion of misc products (Sällansaker)
  if (existing.is_misc) {
    return res.status(400).json({ error: "Cannot delete misc product" });
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
