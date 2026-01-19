import express, { Request, Response } from "express";
import { getDb } from "../db/connection.js";
import { parseRecipeFromUrl } from "../services/recipe-parser.js";
import { requireAuth } from "../middleware/auth.js";
import type {
  RecipeRow,
  RecipeIngredientRow,
  RecipeIngredientWithDetails,
  TagRow,
  ProductRow,
  CreateRecipeBody,
  UpdateRecipeBody,
  ImportRecipesBody,
} from "../../shared/types.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

interface RecipeWithCount extends RecipeRow {
  ingredient_count: number;
}

interface RecipeWithDetails extends RecipeRow {
  ingredients: RecipeIngredientWithDetails[];
  tags: TagRow[];
}

// GET /api/recipes - lista alla
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;

  const recipes = db
    .prepare(
      `
		SELECT r.*, COUNT(ri.id) as ingredient_count
		FROM recipes r
		LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
		WHERE r.user_id = ?
		GROUP BY r.id
		ORDER BY r.name
	`,
    )
    .all(userId) as RecipeWithCount[];

  // Get tags for each recipe
  const getTagsStmt = db.prepare(`
    SELECT t.* FROM tags t
    JOIN recipe_tags rt ON t.id = rt.tag_id
    WHERE rt.recipe_id = ?
    ORDER BY t.name
  `);

  const recipesWithTags = recipes.map((recipe) => ({
    ...recipe,
    tags: getTagsStmt.all(recipe.id) as TagRow[],
  }));

  res.json(recipesWithTags);
});

// GET /api/recipes/export - exportera alla recept med ingredienser och taggar
router.get("/export", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;

  const recipes = db
    .prepare("SELECT * FROM recipes WHERE user_id = ? ORDER BY name")
    .all(userId) as RecipeRow[];

  const getIngredients = db.prepare(`
    SELECT ri.*, p.name as product_name
    FROM recipe_ingredients ri
    LEFT JOIN products p ON ri.product_id = p.id
    WHERE ri.recipe_id = ?
    ORDER BY ri.sort_order
  `);

  const getTags = db.prepare(`
    SELECT t.name FROM tags t
    JOIN recipe_tags rt ON t.id = rt.tag_id
    WHERE rt.recipe_id = ?
    ORDER BY t.name
  `);

  const exportData = recipes.map((recipe) => {
    const ingredients = (
      getIngredients.all(recipe.id) as (RecipeIngredientRow & {
        product_name?: string;
      })[]
    ).map((ing) => ({
      product_name: ing.product_name || ing.custom_name,
      custom_name: ing.custom_name,
      amount: ing.amount,
      unit: ing.unit,
      sort_order: ing.sort_order,
    }));

    const tags = (getTags.all(recipe.id) as { name: string }[]).map(
      (t) => t.name,
    );

    return {
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      servings: recipe.servings,
      source_url: recipe.source_url,
      ingredients,
      tags,
    };
  });

  res.json({ recipes: exportData });
});

// POST /api/recipes/import-merge - importera recept, hoppa över om namn finns
router.post(
  "/import-merge",
  (req: Request<object, unknown, ImportRecipesBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { recipes } = req.body;

    if (!recipes || !Array.isArray(recipes)) {
      res.status(400).json({ error: "Missing recipes array in request body" });
      return;
    }

    let imported = 0;
    let skipped = 0;

    const transaction = db.transaction(() => {
      // Get existing recipe names
      const existingRecipes = (
        db
          .prepare("SELECT name FROM recipes WHERE user_id = ?")
          .all(userId) as { name: string }[]
      ).map((r) => r.name.toLowerCase());

      // Get product mapping by name
      const productMap: Record<string, number> = {};
      (
        db
          .prepare("SELECT id, name FROM products WHERE user_id = ?")
          .all(userId) as { id: number; name: string }[]
      ).forEach((p) => {
        productMap[p.name.toLowerCase()] = p.id;
      });

      // Get tag mapping by name
      const tagMap: Record<string, number> = {};
      (
        db
          .prepare("SELECT id, name FROM tags WHERE user_id = ?")
          .all(userId) as { id: number; name: string }[]
      ).forEach((t) => {
        tagMap[t.name.toLowerCase()] = t.id;
      });

      const insertRecipe = db.prepare(`
      INSERT INTO recipes (name, description, instructions, servings, source_url, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

      const insertIngredient = db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, product_id, custom_name, amount, unit, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

      const insertTag = db.prepare(
        "INSERT OR IGNORE INTO tags (name, user_id) VALUES (?, ?)",
      );

      const insertRecipeTag = db.prepare(
        "INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
      );

      for (const recipe of recipes) {
        if (existingRecipes.includes(recipe.name.toLowerCase())) {
          skipped++;
          continue;
        }

        // Insert recipe
        const result = insertRecipe.run(
          recipe.name,
          recipe.description || null,
          recipe.instructions || null,
          recipe.servings || 4,
          recipe.source_url || null,
          userId,
        );
        const recipeId = result.lastInsertRowid as number;

        // Insert ingredients
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach((ing, index) => {
            // Try to find product by name
            const productId =
              ing.product_name && productMap[ing.product_name.toLowerCase()]
                ? productMap[ing.product_name.toLowerCase()]
                : null;

            insertIngredient.run(
              recipeId,
              productId,
              productId ? null : ing.custom_name || ing.product_name,
              ing.amount || null,
              ing.unit || null,
              ing.sort_order ?? index,
            );
          });
        }

        // Insert tags
        if (recipe.tags && Array.isArray(recipe.tags)) {
          for (const tagName of recipe.tags) {
            // Create tag if not exists
            insertTag.run(tagName, userId);
            // Get tag id (might be new or existing)
            const tag = db
              .prepare(
                "SELECT id FROM tags WHERE LOWER(name) = LOWER(?) AND user_id = ?",
              )
              .get(tagName, userId) as { id: number } | undefined;
            if (tag) {
              insertRecipeTag.run(recipeId, tag.id);
            }
          }
        }

        imported++;
      }
    });

    transaction();

    res.json({ imported, skipped });
  },
);

interface ParseFreetextBody {
  text: string;
}

// POST /api/recipes/parse-freetext - tolka fritext och matcha produkter
router.post(
  "/parse-freetext",
  (req: Request<object, unknown, ParseFreetextBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    try {
      // Get all products for matching
      const products = db
        .prepare("SELECT id, name FROM products WHERE user_id = ?")
        .all(userId) as { id: number; name: string }[];
      const productMap = new Map(
        products.map((p) => [p.name.toLowerCase(), p.id]),
      );

      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);
      if (lines.length === 0) {
        res.status(400).json({ error: "Empty text" });
        return;
      }

      // First non-empty line is the recipe name
      const name = lines[0];

      // Common units to detect ingredients
      const unitPattern =
        /^([\d.,/]+)\s*(dl|cl|ml|l|g|kg|msk|tsk|krm|st|port|paket|burk|förp|nypa)?\s+(.+)$/i;
      const servingsPattern = /^(\d+)\s*(portioner?|pers|personer?)$/i;

      let servings = 4;
      const ingredients: {
        product_id: number | null;
        custom_name: string | null;
        amount: number | null;
        unit: string;
        sort_order: number;
      }[] = [];
      const instructionLines: string[] = [];
      let foundIngredients = false;
      let inInstructions = false;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Check for servings
        const servingsMatch = line.match(servingsPattern);
        if (servingsMatch) {
          servings = parseInt(servingsMatch[1]);
          continue;
        }

        // Check if line looks like an ingredient
        const ingredientMatch = line.match(unitPattern);

        if (ingredientMatch && !inInstructions) {
          foundIngredients = true;
          let amountStr = ingredientMatch[1];
          let amount: number | null = null;
          // Handle fractions like 1/2
          if (amountStr.includes("/")) {
            const [num, denom] = amountStr.split("/");
            amount = parseFloat(num) / parseFloat(denom);
          } else {
            amount = parseFloat(amountStr.replace(",", "."));
          }

          const unit = ingredientMatch[2] || "st";
          const ingredientName = ingredientMatch[3].trim();

          // Try to match to a product
          const productId =
            productMap.get(ingredientName.toLowerCase()) || null;

          ingredients.push({
            product_id: productId,
            custom_name: productId ? null : ingredientName,
            amount: isNaN(amount) ? null : amount,
            unit: unit.toLowerCase(),
            sort_order: ingredients.length,
          });
        } else if (foundIngredients) {
          // After ingredients, everything is instructions
          inInstructions = true;
          instructionLines.push(line);
        }
      }

      const instructions = instructionLines.join("\n").trim();

      res.json({
        name,
        servings,
        ingredients,
        instructions: instructions || null,
        source_url: null,
      });
    } catch (error) {
      console.error("Freetext parse error:", error);
      res.status(400).json({ error: "Could not parse recipe text" });
    }
  },
);

interface ImportFromUrlBody {
  url: string;
}

// POST /api/recipes/import - importera från URL (JSON-LD)
router.post(
  "/import",
  async (req: Request<object, unknown, ImportFromUrlBody>, res: Response) => {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    try {
      const recipeData = await parseRecipeFromUrl(url);
      res.json(recipeData);
    } catch (error) {
      console.error("Recipe import error:", error);
      res
        .status(400)
        .json({ error: (error as Error).message || "Failed to import recipe" });
    }
  },
);

// GET /api/recipes/:id - hämta ett med ingredienser
router.get("/:id", (req: Request<{ id: string }>, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;
  const { id } = req.params;

  const recipe = db
    .prepare("SELECT * FROM recipes WHERE id = ? AND user_id = ?")
    .get(id, userId) as RecipeRow | undefined;
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }

  // Get ingredients with is_staple info
  // For product-linked: use the product's is_staple
  // For freetext: check if custom_name matches any staple product name (case-insensitive)
  const ingredients = db
    .prepare(
      `
		SELECT ri.*, p.name as product_name, p.default_unit,
			CASE
				WHEN ri.product_id IS NOT NULL THEN p.is_staple
				WHEN ri.custom_name IS NOT NULL THEN (
					SELECT COALESCE(MAX(is_staple), 0)
					FROM products
					WHERE LOWER(name) = LOWER(ri.custom_name) AND user_id = ?
				)
				ELSE 0
			END as is_staple
		FROM recipe_ingredients ri
		LEFT JOIN products p ON ri.product_id = p.id
		WHERE ri.recipe_id = ?
		ORDER BY ri.sort_order
	`,
    )
    .all(userId, id) as RecipeIngredientWithDetails[];

  // Get tags
  const tags = db
    .prepare(
      `
    SELECT t.* FROM tags t
    JOIN recipe_tags rt ON t.id = rt.tag_id
    WHERE rt.recipe_id = ?
    ORDER BY t.name
  `,
    )
    .all(id) as TagRow[];

  res.json({
    ...recipe,
    ingredients,
    tags,
  });
});

// POST /api/recipes - skapa med ingredienser
router.post(
  "/",
  (req: Request<object, unknown, CreateRecipeBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const {
      name,
      description,
      instructions,
      servings,
      source_url,
      ingredients,
      tag_ids,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const insertRecipe = db.prepare(`
		INSERT INTO recipes (name, description, instructions, servings, source_url, user_id)
		VALUES (?, ?, ?, ?, ?, ?)
	`);

    const insertIngredient = db.prepare(`
		INSERT INTO recipe_ingredients (recipe_id, product_id, custom_name, amount, unit, sort_order)
		VALUES (?, ?, ?, ?, ?, ?)
	`);

    const transaction = db.transaction(() => {
      const result = insertRecipe.run(
        name,
        description || null,
        instructions || null,
        servings || 4,
        source_url || null,
        userId,
      );
      const recipeId = result.lastInsertRowid as number;

      if (ingredients && Array.isArray(ingredients)) {
        ingredients.forEach((ing, index) => {
          insertIngredient.run(
            recipeId,
            ing.product_id || null,
            ing.custom_name || null,
            ing.amount || null,
            ing.unit || null,
            ing.sort_order ?? index,
          );
        });
      }

      // Handle tags
      if (tag_ids && Array.isArray(tag_ids)) {
        const insertRecipeTag = db.prepare(
          "INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
        );
        for (const tagId of tag_ids) {
          insertRecipeTag.run(recipeId, tagId);
        }
      }

      return recipeId;
    });

    const recipeId = transaction();

    const recipe = db
      .prepare("SELECT * FROM recipes WHERE id = ?")
      .get(recipeId) as RecipeRow;
    const recipeIngredients = db
      .prepare(
        `
		SELECT ri.*, p.name as product_name
		FROM recipe_ingredients ri
		LEFT JOIN products p ON ri.product_id = p.id
		WHERE ri.recipe_id = ?
		ORDER BY ri.sort_order
	`,
      )
      .all(recipeId) as RecipeIngredientWithDetails[];
    const recipeTags = db
      .prepare(
        `
    SELECT t.* FROM tags t
    JOIN recipe_tags rt ON t.id = rt.tag_id
    WHERE rt.recipe_id = ?
    ORDER BY t.name
  `,
      )
      .all(recipeId) as TagRow[];

    res
      .status(201)
      .json({ ...recipe, ingredients: recipeIngredients, tags: recipeTags });
  },
);

// PUT /api/recipes/:id - uppdatera recept + ingredienser
router.put(
  "/:id",
  (req: Request<{ id: string }, unknown, UpdateRecipeBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { id } = req.params;
    const {
      name,
      description,
      instructions,
      servings,
      source_url,
      ingredients,
      tag_ids,
    } = req.body;

    const existing = db
      .prepare("SELECT * FROM recipes WHERE id = ? AND user_id = ?")
      .get(id, userId) as RecipeRow | undefined;
    if (!existing) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }

    const updateRecipe = db.prepare(`
		UPDATE recipes
		SET name = ?, description = ?, instructions = ?, servings = ?, source_url = ?
		WHERE id = ? AND user_id = ?
	`);

    const deleteIngredients = db.prepare(
      "DELETE FROM recipe_ingredients WHERE recipe_id = ?",
    );

    const insertIngredient = db.prepare(`
		INSERT INTO recipe_ingredients (recipe_id, product_id, custom_name, amount, unit, sort_order)
		VALUES (?, ?, ?, ?, ?, ?)
	`);

    const transaction = db.transaction(() => {
      updateRecipe.run(
        name ?? existing.name,
        description ?? existing.description,
        instructions ?? existing.instructions,
        servings ?? existing.servings,
        source_url ?? existing.source_url,
        id,
        userId,
      );

      if (ingredients && Array.isArray(ingredients)) {
        deleteIngredients.run(id);
        ingredients.forEach((ing, index) => {
          insertIngredient.run(
            id,
            ing.product_id || null,
            ing.custom_name || null,
            ing.amount || null,
            ing.unit || null,
            ing.sort_order ?? index,
          );
        });
      }

      // Handle tags
      if (tag_ids && Array.isArray(tag_ids)) {
        db.prepare("DELETE FROM recipe_tags WHERE recipe_id = ?").run(id);
        const insertRecipeTag = db.prepare(
          "INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
        );
        for (const tagId of tag_ids) {
          insertRecipeTag.run(id, tagId);
        }
      }
    });

    transaction();

    const recipe = db
      .prepare("SELECT * FROM recipes WHERE id = ?")
      .get(id) as RecipeRow;
    const recipeIngredients = db
      .prepare(
        `
		SELECT ri.*, p.name as product_name
		FROM recipe_ingredients ri
		LEFT JOIN products p ON ri.product_id = p.id
		WHERE ri.recipe_id = ?
		ORDER BY ri.sort_order
	`,
      )
      .all(id) as RecipeIngredientWithDetails[];
    const recipeTags = db
      .prepare(
        `
    SELECT t.* FROM tags t
    JOIN recipe_tags rt ON t.id = rt.tag_id
    WHERE rt.recipe_id = ?
    ORDER BY t.name
  `,
      )
      .all(id) as TagRow[];

    res.json({ ...recipe, ingredients: recipeIngredients, tags: recipeTags });
  },
);

// DELETE /api/recipes/:id - ta bort (CASCADE på ingredienser)
router.delete("/:id", (req: Request<{ id: string }>, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM recipes WHERE id = ? AND user_id = ?")
    .get(id, userId) as RecipeRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }

  db.prepare("DELETE FROM recipes WHERE id = ? AND user_id = ?").run(
    id,
    userId,
  );

  res.json({ message: "Recipe deleted", id: parseInt(id) });
});

interface ToShoppingBody {
  scale?: number;
}

// POST /api/recipes/:id/to-shopping - lägg ingredienser på listan
router.post(
  "/:id/to-shopping",
  (req: Request<{ id: string }, unknown, ToShoppingBody>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { id } = req.params;
    const { scale } = req.body;

    const recipe = db
      .prepare("SELECT * FROM recipes WHERE id = ? AND user_id = ?")
      .get(id, userId) as RecipeRow | undefined;
    if (!recipe) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }

    const ingredients = db
      .prepare(
        `
		SELECT ri.*, p.name as product_name, p.store_category_id, p.default_unit
		FROM recipe_ingredients ri
		LEFT JOIN products p ON ri.product_id = p.id
		WHERE ri.recipe_id = ?
	`,
      )
      .all(id) as (RecipeIngredientWithDetails & {
      store_category_id?: number;
    })[];

    const scaleFactor = scale ? scale / recipe.servings : 1;

    const insertShoppingItem = db.prepare(`
		INSERT INTO shopping_items (product_id, custom_name, store_category_id, quantity, unit, notes, user_id)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);

    const transaction = db.transaction(() => {
      const addedItems: number[] = [];
      for (const ing of ingredients) {
        const quantity = ing.amount ? ing.amount * scaleFactor : 1;
        const result = insertShoppingItem.run(
          ing.product_id,
          ing.product_id ? null : ing.custom_name,
          ing.store_category_id || null,
          quantity,
          ing.unit || ing.default_unit || "st",
          `Från: ${recipe.name}`,
          userId,
        );
        addedItems.push(result.lastInsertRowid as number);
      }
      return addedItems;
    });

    const addedIds = transaction();

    res.json({
      message: "Ingredients added to shopping list",
      recipeId: parseInt(id),
      itemsAdded: addedIds.length,
      scale: scaleFactor,
    });
  },
);

export default router;
