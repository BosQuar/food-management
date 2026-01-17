import express from "express";
import { getDb } from "../db/connection.js";
import { parseRecipeFromUrl } from "../services/recipe-parser.js";

const router = express.Router();

// GET /api/recipes - lista alla
router.get("/", (req, res) => {
  const db = getDb();

  const recipes = db
    .prepare(
      `
		SELECT r.*, COUNT(ri.id) as ingredient_count
		FROM recipes r
		LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
		GROUP BY r.id
		ORDER BY r.name
	`,
    )
    .all();

  res.json(recipes);
});

// POST /api/recipes/import - importera från URL (JSON-LD)
router.post("/import", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const recipeData = await parseRecipeFromUrl(url);
    res.json(recipeData);
  } catch (error) {
    console.error("Recipe import error:", error);
    res.status(400).json({ error: error.message || "Failed to import recipe" });
  }
});

// GET /api/recipes/:id - hämta ett med ingredienser
router.get("/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id);
  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" });
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
					WHERE LOWER(name) = LOWER(ri.custom_name)
				)
				ELSE 0
			END as is_staple
		FROM recipe_ingredients ri
		LEFT JOIN products p ON ri.product_id = p.id
		WHERE ri.recipe_id = ?
		ORDER BY ri.sort_order
	`,
    )
    .all(id);

  res.json({
    ...recipe,
    ingredients,
  });
});

// POST /api/recipes - skapa med ingredienser
router.post("/", (req, res) => {
  const db = getDb();
  const { name, description, instructions, servings, source_url, ingredients } =
    req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const insertRecipe = db.prepare(`
		INSERT INTO recipes (name, description, instructions, servings, source_url)
		VALUES (?, ?, ?, ?, ?)
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
    );
    const recipeId = result.lastInsertRowid;

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

    return recipeId;
  });

  const recipeId = transaction();

  const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(recipeId);
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
    .all(recipeId);

  res.status(201).json({ ...recipe, ingredients: recipeIngredients });
});

// PUT /api/recipes/:id - uppdatera recept + ingredienser
router.put("/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, description, instructions, servings, source_url, ingredients } =
    req.body;

  const existing = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Recipe not found" });
  }

  const updateRecipe = db.prepare(`
		UPDATE recipes
		SET name = ?, description = ?, instructions = ?, servings = ?, source_url = ?
		WHERE id = ?
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
  });

  transaction();

  const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id);
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
    .all(id);

  res.json({ ...recipe, ingredients: recipeIngredients });
});

// DELETE /api/recipes/:id - ta bort (CASCADE på ingredienser)
router.delete("/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const existing = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Recipe not found" });
  }

  db.prepare("DELETE FROM recipes WHERE id = ?").run(id);

  res.json({ message: "Recipe deleted", id: parseInt(id) });
});

// POST /api/recipes/:id/to-shopping - lägg ingredienser på listan
router.post("/:id/to-shopping", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { scale } = req.body;

  const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id);
  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" });
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
    .all(id);

  const scaleFactor = scale ? scale / recipe.servings : 1;

  const insertShoppingItem = db.prepare(`
		INSERT INTO shopping_items (product_id, custom_name, store_category_id, quantity, unit, notes)
		VALUES (?, ?, ?, ?, ?, ?)
	`);

  const transaction = db.transaction(() => {
    const addedItems = [];
    for (const ing of ingredients) {
      const quantity = ing.amount ? ing.amount * scaleFactor : 1;
      const result = insertShoppingItem.run(
        ing.product_id,
        ing.product_id ? null : ing.custom_name,
        ing.store_category_id || null,
        quantity,
        ing.unit || ing.default_unit || "st",
        `Från: ${recipe.name}`,
      );
      addedItems.push(result.lastInsertRowid);
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
});

export default router;
