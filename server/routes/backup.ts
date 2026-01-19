import express, { Request, Response } from "express";
import { getDb } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import type {
  CategoryRow,
  ProductRow,
  ShoppingItemRow,
  RecipeRow,
  RecipeIngredientRow,
  TagRow,
  RecipeTagRow,
  BackupData,
} from "../../shared/types.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/backup - exportera all data som JSON
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;

  const backup = {
    version: 1,
    timestamp: new Date().toISOString(),
    data: {
      store_categories: db
        .prepare(
          "SELECT id, name, sort_order FROM store_categories WHERE user_id = ? ORDER BY sort_order",
        )
        .all(userId) as CategoryRow[],
      products: db
        .prepare(
          "SELECT id, name, store_category_id, default_unit, default_notes, is_staple, is_misc, created_at FROM products WHERE user_id = ? ORDER BY id",
        )
        .all(userId) as ProductRow[],
      shopping_items: db
        .prepare(
          "SELECT id, product_id, custom_name, store_category_id, quantity, unit, notes, is_done, updated_at FROM shopping_items WHERE user_id = ? ORDER BY id",
        )
        .all(userId) as ShoppingItemRow[],
      recipes: db
        .prepare(
          "SELECT id, name, description, instructions, servings, source_url, created_at FROM recipes WHERE user_id = ? ORDER BY id",
        )
        .all(userId) as RecipeRow[],
      recipe_ingredients: db
        .prepare(
          `SELECT ri.id, ri.recipe_id, ri.product_id, ri.custom_name, ri.amount, ri.unit, ri.sort_order
           FROM recipe_ingredients ri
           JOIN recipes r ON ri.recipe_id = r.id
           WHERE r.user_id = ?
           ORDER BY ri.id`,
        )
        .all(userId) as RecipeIngredientRow[],
      tags: db
        .prepare(
          "SELECT id, name, created_at FROM tags WHERE user_id = ? ORDER BY id",
        )
        .all(userId) as TagRow[],
      recipe_tags: db
        .prepare(
          `SELECT rt.id, rt.recipe_id, rt.tag_id
           FROM recipe_tags rt
           JOIN recipes r ON rt.recipe_id = r.id
           WHERE r.user_id = ?
           ORDER BY rt.id`,
        )
        .all(userId) as RecipeTagRow[],
    },
  };

  res.json(backup);
});

// POST /api/restore - återställ från JSON-backup
router.post(
  "/restore",
  (req: Request<object, unknown, { data?: BackupData }>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { data } = req.body;

    if (!data) {
      res.status(400).json({ error: "Missing data in request body" });
      return;
    }

    const {
      store_categories,
      products,
      shopping_items,
      recipes,
      recipe_ingredients,
      tags,
      recipe_tags,
    } = data;

    const transaction = db.transaction(() => {
      // Clear all tables for this user (in reverse dependency order)
      db.prepare(
        "DELETE FROM recipe_tags WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)",
      ).run(userId);
      db.prepare(
        "DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)",
      ).run(userId);
      db.prepare("DELETE FROM recipes WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM tags WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM shopping_items WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM products WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM store_categories WHERE user_id = ?").run(userId);

      // Keep track of ID mappings (old -> new)
      const categoryIdMap: Record<number, number> = {};
      const productIdMap: Record<number, number> = {};
      const recipeIdMap: Record<number, number> = {};
      const tagIdMap: Record<number, number> = {};

      // Insert categories
      if (store_categories) {
        const insertCategory = db.prepare(
          "INSERT INTO store_categories (name, sort_order, user_id) VALUES (?, ?, ?)",
        );
        for (const cat of store_categories) {
          const result = insertCategory.run(cat.name, cat.sort_order, userId);
          categoryIdMap[cat.id] = result.lastInsertRowid as number;
        }
      }

      // Insert products
      if (products) {
        const insertProduct = db.prepare(
          "INSERT INTO products (name, store_category_id, default_unit, default_notes, is_staple, is_misc, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        );
        for (const prod of products) {
          const newCategoryId = prod.store_category_id
            ? categoryIdMap[prod.store_category_id]
            : null;
          const result = insertProduct.run(
            prod.name,
            newCategoryId,
            prod.default_unit,
            prod.default_notes,
            prod.is_staple || 0,
            prod.is_misc || 0,
            prod.created_at,
            userId,
          );
          productIdMap[prod.id] = result.lastInsertRowid as number;
        }
      }

      // Insert tags
      if (tags) {
        const insertTag = db.prepare(
          "INSERT INTO tags (name, created_at, user_id) VALUES (?, ?, ?)",
        );
        for (const tag of tags) {
          const result = insertTag.run(tag.name, tag.created_at, userId);
          tagIdMap[tag.id] = result.lastInsertRowid as number;
        }
      }

      // Insert shopping items
      if (shopping_items) {
        const insertItem = db.prepare(
          "INSERT INTO shopping_items (product_id, custom_name, store_category_id, quantity, unit, notes, is_done, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        );
        for (const item of shopping_items) {
          const newProductId = item.product_id
            ? productIdMap[item.product_id]
            : null;
          const newCategoryId = item.store_category_id
            ? categoryIdMap[item.store_category_id]
            : null;
          insertItem.run(
            newProductId,
            item.custom_name,
            newCategoryId,
            item.quantity,
            item.unit,
            item.notes,
            item.is_done,
            item.updated_at,
            userId,
          );
        }
      }

      // Insert recipes
      if (recipes) {
        const insertRecipe = db.prepare(
          "INSERT INTO recipes (name, description, instructions, servings, source_url, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        );
        for (const recipe of recipes) {
          const result = insertRecipe.run(
            recipe.name,
            recipe.description,
            recipe.instructions,
            recipe.servings,
            recipe.source_url,
            recipe.created_at,
            userId,
          );
          recipeIdMap[recipe.id] = result.lastInsertRowid as number;
        }
      }

      // Insert recipe ingredients
      if (recipe_ingredients) {
        const insertIngredient = db.prepare(
          "INSERT INTO recipe_ingredients (recipe_id, product_id, custom_name, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        );
        for (const ing of recipe_ingredients) {
          const newRecipeId = recipeIdMap[ing.recipe_id];
          const newProductId = ing.product_id
            ? productIdMap[ing.product_id]
            : null;
          if (newRecipeId) {
            insertIngredient.run(
              newRecipeId,
              newProductId,
              ing.custom_name,
              ing.amount,
              ing.unit,
              ing.sort_order,
            );
          }
        }
      }

      // Insert recipe tags
      if (recipe_tags) {
        const insertRecipeTag = db.prepare(
          "INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
        );
        for (const rt of recipe_tags) {
          const newRecipeId = recipeIdMap[rt.recipe_id];
          const newTagId = tagIdMap[rt.tag_id];
          if (newRecipeId && newTagId) {
            insertRecipeTag.run(newRecipeId, newTagId);
          }
        }
      }
    });

    transaction();

    res.json({
      message: "Restore successful",
      restored: {
        categories: store_categories?.length || 0,
        products: products?.length || 0,
        shopping_items: shopping_items?.length || 0,
        recipes: recipes?.length || 0,
        recipe_ingredients: recipe_ingredients?.length || 0,
        tags: tags?.length || 0,
        recipe_tags: recipe_tags?.length || 0,
      },
    });
  },
);

export default router;
