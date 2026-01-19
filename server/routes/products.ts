import express, { Request, Response } from "express";
import { getDb } from "../db/connection.js";
import { broadcastProductChange } from "../services/sync.js";
import { requireAuth } from "../middleware/auth.js";
import type {
  CategoryRow,
  ProductRow,
  CreateProductBody,
  UpdateProductBody,
  ImportProductsBody,
} from "../../shared/types.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

interface ProductCategoryWithProducts extends CategoryRow {
  products: ProductRow[];
}

// GET /api/products - lista alla, grupperat per kategori
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;

  const categories = db
    .prepare(
      `
		SELECT id, name, sort_order
		FROM store_categories
		WHERE user_id = ?
		ORDER BY sort_order
	`,
    )
    .all(userId) as CategoryRow[];

  const products = db
    .prepare(
      `
		SELECT p.id, p.name, p.store_category_id, p.default_unit, p.default_notes, p.is_staple, p.is_misc, p.created_at
		FROM products p
		WHERE p.user_id = ?
		ORDER BY p.name
	`,
    )
    .all(userId) as ProductRow[];

  const grouped: ProductCategoryWithProducts[] = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.store_category_id === cat.id),
  }));

  res.json(grouped);
});

// GET /api/products/export - exportera som JSON
router.get("/export", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;

  const categories = db
    .prepare(
      `
		SELECT id, name, sort_order
		FROM store_categories
		WHERE user_id = ?
		ORDER BY sort_order
	`,
    )
    .all(userId) as CategoryRow[];

  const products = db
    .prepare(
      `
		SELECT id, name, store_category_id, default_unit, default_notes, is_staple
		FROM products
		WHERE user_id = ?
		ORDER BY name
	`,
    )
    .all(userId) as ProductRow[];

  res.json({ categories, products });
});

// POST /api/products/import-merge - importera, hoppa över om namn finns
router.post(
  "/import-merge",
  (req: Request<object, unknown, ImportProductsBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { categories, products } = req.body;

    if (!products) {
      res.status(400).json({ error: "Missing products in request body" });
      return;
    }

    let imported = 0;
    let skipped = 0;

    const transaction = db.transaction(() => {
      // Import categories if provided (by name, skip if exists)
      const newCategoryIds: number[] = [];
      if (categories && Array.isArray(categories)) {
        const existingCats = (
          db
            .prepare("SELECT name FROM store_categories WHERE user_id = ?")
            .all(userId) as { name: string }[]
        ).map((c) => c.name.toLowerCase());

        const insertCat = db.prepare(
          "INSERT INTO store_categories (name, sort_order, user_id) VALUES (?, ?, ?)",
        );

        for (const cat of categories) {
          if (!existingCats.includes(cat.name.toLowerCase())) {
            const result = insertCat.run(cat.name, cat.sort_order || 0, userId);
            newCategoryIds.push(result.lastInsertRowid as number);
          }
        }
      }

      // Auto-create "Sällansaker" for new categories
      if (newCategoryIds.length > 0) {
        const insertMisc = db.prepare(
          "INSERT INTO products (name, store_category_id, default_unit, is_misc, user_id) VALUES (?, ?, ?, ?, ?)",
        );
        for (const catId of newCategoryIds) {
          insertMisc.run("Sällansaker", catId, "st", 1, userId);
        }
      }

      // Get category mapping by name
      const catMap: Record<string, number> = {};
      (
        db
          .prepare("SELECT id, name FROM store_categories WHERE user_id = ?")
          .all(userId) as { id: number; name: string }[]
      ).forEach((c) => {
        catMap[c.name.toLowerCase()] = c.id;
      });

      // Import products (by name, skip if exists)
      const existingProducts = (
        db
          .prepare("SELECT name FROM products WHERE user_id = ?")
          .all(userId) as { name: string }[]
      ).map((p) => p.name.toLowerCase());

      const insertProduct = db.prepare(`
      INSERT INTO products (name, store_category_id, default_unit, default_notes, is_staple, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

      for (const prod of products) {
        if (existingProducts.includes(prod.name.toLowerCase())) {
          skipped++;
        } else {
          // Find category by name if provided
          let categoryId: number | null = prod.store_category_id || null;
          if (prod.category_name) {
            categoryId = catMap[prod.category_name.toLowerCase()] || null;
          }

          insertProduct.run(
            prod.name,
            categoryId,
            prod.default_unit || "st",
            prod.default_notes || null,
            prod.is_staple || 0,
            userId,
          );
          imported++;
        }
      }
    });

    transaction();

    res.json({ imported, skipped });
  },
);

// POST /api/products/import - importera från JSON
router.post(
  "/import",
  (req: Request<object, unknown, ImportProductsBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { categories, products } = req.body;

    if (!categories || !products) {
      res
        .status(400)
        .json({ error: "Missing categories or products in request body" });
      return;
    }

    const insertCategory = db.prepare(`
		INSERT OR REPLACE INTO store_categories (id, name, sort_order, user_id)
		VALUES (?, ?, ?, ?)
	`);

    const insertProduct = db.prepare(`
		INSERT OR REPLACE INTO products (id, name, store_category_id, default_unit, default_notes, is_staple, user_id)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);

    const transaction = db.transaction(() => {
      for (const cat of categories) {
        insertCategory.run(cat.id, cat.name, cat.sort_order, userId);
      }
      for (const prod of products) {
        insertProduct.run(
          prod.id,
          prod.name,
          prod.store_category_id,
          prod.default_unit,
          prod.default_notes,
          prod.is_staple || 0,
          userId,
        );
      }
    });

    transaction();

    res.json({
      message: "Import successful",
      categoriesImported: categories.length,
      productsImported: products.length,
    });
  },
);

// POST /api/products - skapa ny produkt
router.post(
  "/",
  (req: Request<object, unknown, CreateProductBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { name, store_category_id, default_unit, default_notes, is_staple } =
      req.body;

    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    if (!store_category_id) {
      res.status(400).json({ error: "Category is required" });
      return;
    }

    // Verify category exists and belongs to user
    const category = db
      .prepare("SELECT id FROM store_categories WHERE id = ? AND user_id = ?")
      .get(store_category_id, userId) as { id: number } | undefined;
    if (!category) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }

    const result = db
      .prepare(
        `
		INSERT INTO products (name, store_category_id, default_unit, default_notes, is_staple, user_id)
		VALUES (?, ?, ?, ?, ?, ?)
	`,
      )
      .run(
        name,
        store_category_id || null,
        default_unit || "st",
        default_notes || null,
        is_staple ? 1 : 0,
        userId,
      );

    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(result.lastInsertRowid) as ProductRow;

    broadcastProductChange("add", product, userId);
    res.status(201).json(product);
  },
);

// PUT /api/products/:id - uppdatera produkt
router.put(
  "/:id",
  (req: Request<{ id: string }, unknown, UpdateProductBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { id } = req.params;
    const body = req.body;

    const existing = db
      .prepare("SELECT * FROM products WHERE id = ? AND user_id = ?")
      .get(id, userId) as ProductRow | undefined;
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Validate category if provided
    const categoryId = body.store_category_id ?? existing.store_category_id;
    if (!categoryId) {
      res.status(400).json({ error: "Category is required" });
      return;
    }
    const category = db
      .prepare("SELECT id FROM store_categories WHERE id = ? AND user_id = ?")
      .get(categoryId, userId) as { id: number } | undefined;
    if (!category) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }

    // Use hasOwnProperty to check if is_staple was explicitly provided
    const is_staple =
      "is_staple" in body ? (body.is_staple ? 1 : 0) : existing.is_staple;

    db.prepare(
      `
		UPDATE products
		SET name = ?, store_category_id = ?, default_unit = ?, default_notes = ?, is_staple = ?
		WHERE id = ? AND user_id = ?
	`,
    ).run(
      body.name ?? existing.name,
      body.store_category_id ?? existing.store_category_id,
      body.default_unit ?? existing.default_unit,
      body.default_notes ?? existing.default_notes,
      is_staple,
      id,
      userId,
    );

    const updated = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(id) as ProductRow;
    broadcastProductChange("update", updated, userId);
    res.json(updated);
  },
);

// DELETE /api/products/:id - ta bort produkt
router.delete("/:id", (req: Request<{ id: string }>, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM products WHERE id = ? AND user_id = ?")
    .get(id, userId) as ProductRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // Prevent deletion of misc products (Sällansaker)
  if (existing.is_misc) {
    res.status(400).json({ error: "Cannot delete misc product" });
    return;
  }

  db.prepare("DELETE FROM products WHERE id = ? AND user_id = ?").run(
    id,
    userId,
  );

  broadcastProductChange("delete", { id: parseInt(id) }, userId);
  res.json({ message: "Product deleted", id: parseInt(id) });
});

// GET /api/categories - hämta alla kategorier
router.get("/categories", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;

  const categories = db
    .prepare(
      `
		SELECT id, name, sort_order
		FROM store_categories
		WHERE user_id = ?
		ORDER BY sort_order
	`,
    )
    .all(userId) as CategoryRow[];

  res.json(categories);
});

interface CreateCategoryBody {
  name: string;
  sort_order?: number;
}

interface UpdateCategoryBody {
  name?: string;
  sort_order?: number;
}

// POST /api/categories - skapa ny kategori
router.post(
  "/categories",
  (req: Request<object, unknown, CreateCategoryBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { name, sort_order } = req.body;

    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    // Get max sort_order if not provided
    const maxOrder = db
      .prepare(
        "SELECT MAX(sort_order) as max FROM store_categories WHERE user_id = ?",
      )
      .get(userId) as { max: number | null };
    const newSortOrder = sort_order ?? (maxOrder.max || 0) + 1;

    const result = db
      .prepare(
        "INSERT INTO store_categories (name, sort_order, user_id) VALUES (?, ?, ?)",
      )
      .run(name, newSortOrder, userId);

    const category = db
      .prepare("SELECT * FROM store_categories WHERE id = ?")
      .get(result.lastInsertRowid) as CategoryRow;

    // Auto-create "Sällansaker" for the new category
    db.prepare(
      "INSERT INTO products (name, store_category_id, default_unit, is_misc, user_id) VALUES (?, ?, ?, ?, ?)",
    ).run("Sällansaker", category.id, "st", 1, userId);

    res.status(201).json(category);
  },
);

// PUT /api/categories/:id - uppdatera kategori
router.put(
  "/categories/:id",
  (
    req: Request<{ id: string }, unknown, UpdateCategoryBody>,
    res: Response,
  ) => {
    const db = getDb();
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, sort_order } = req.body;

    const existing = db
      .prepare("SELECT * FROM store_categories WHERE id = ? AND user_id = ?")
      .get(id, userId) as CategoryRow | undefined;
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    db.prepare(
      "UPDATE store_categories SET name = ?, sort_order = ? WHERE id = ? AND user_id = ?",
    ).run(name ?? existing.name, sort_order ?? existing.sort_order, id, userId);

    const updated = db
      .prepare("SELECT * FROM store_categories WHERE id = ?")
      .get(id) as CategoryRow;

    res.json(updated);
  },
);

// DELETE /api/categories/:id - ta bort kategori
router.delete(
  "/categories/:id",
  (req: Request<{ id: string }>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = db
      .prepare("SELECT * FROM store_categories WHERE id = ? AND user_id = ?")
      .get(id, userId) as CategoryRow | undefined;
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    // Check if category has non-misc products (exclude Sällansaker)
    const productCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM products WHERE store_category_id = ? AND is_misc = 0 AND user_id = ?",
      )
      .get(id, userId) as { count: number };
    if (productCount.count > 0) {
      res.status(400).json({
        error:
          "Cannot delete category with products. Move or delete products first.",
      });
      return;
    }

    // Delete misc products (Sällansaker) for this category
    db.prepare(
      "DELETE FROM products WHERE store_category_id = ? AND is_misc = 1 AND user_id = ?",
    ).run(id, userId);

    // Delete the category
    db.prepare("DELETE FROM store_categories WHERE id = ? AND user_id = ?").run(
      id,
      userId,
    );

    res.json({ message: "Category deleted", id: parseInt(id) });
  },
);

export default router;
