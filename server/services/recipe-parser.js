/**
 * Recipe URL parser - extracts recipe data from JSON-LD schema
 */

/**
 * Fetch and parse recipe from URL
 * @param {string} url - Recipe URL to parse
 * @returns {Promise<{name: string, instructions: string, servings: number, source_url: string, ingredients: Array}>}
 */
export async function parseRecipeFromUrl(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FoodManagement/1.0)",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const jsonLdData = extractJsonLd(html);

  if (!jsonLdData) {
    throw new Error("No recipe JSON-LD found on page");
  }

  return normalizeRecipe(jsonLdData, url);
}

/**
 * Extract JSON-LD recipe data from HTML
 * @param {string} html
 * @returns {object|null}
 */
function extractJsonLd(html) {
  // Find all JSON-LD script blocks
  const jsonLdRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const recipe = findRecipeInJsonLd(data);
      if (recipe) {
        return recipe;
      }
    } catch (e) {
      // Continue to next JSON-LD block
    }
  }

  return null;
}

/**
 * Find Recipe schema in JSON-LD data (can be nested in @graph)
 * @param {object|array} data
 * @returns {object|null}
 */
function findRecipeInJsonLd(data) {
  if (Array.isArray(data)) {
    for (const item of data) {
      const recipe = findRecipeInJsonLd(item);
      if (recipe) return recipe;
    }
    return null;
  }

  if (data && typeof data === "object") {
    // Check if this is a Recipe
    if (
      data["@type"] === "Recipe" ||
      (Array.isArray(data["@type"]) && data["@type"].includes("Recipe"))
    ) {
      return data;
    }

    // Check @graph
    if (data["@graph"]) {
      return findRecipeInJsonLd(data["@graph"]);
    }
  }

  return null;
}

/**
 * Normalize recipe data to our format
 * @param {object} jsonLd
 * @param {string} sourceUrl
 * @returns {object}
 */
function normalizeRecipe(jsonLd, sourceUrl) {
  return {
    name: jsonLd.name || "Okänt recept",
    instructions: normalizeInstructions(jsonLd.recipeInstructions),
    servings: normalizeServings(jsonLd.recipeYield),
    source_url: sourceUrl,
    ingredients: normalizeIngredients(jsonLd.recipeIngredient),
  };
}

/**
 * Normalize recipe instructions
 * @param {string|array} instructions
 * @returns {string}
 */
function normalizeInstructions(instructions) {
  if (!instructions) return "";

  if (typeof instructions === "string") {
    return instructions;
  }

  if (Array.isArray(instructions)) {
    return instructions
      .map((step, index) => {
        if (typeof step === "string") {
          return `${index + 1}. ${step}`;
        }
        // HowToStep or HowToSection
        if (step.text) {
          return `${index + 1}. ${step.text}`;
        }
        if (step.name && step.itemListElement) {
          // HowToSection with sub-steps
          const sectionSteps = step.itemListElement
            .map((s, i) => `   ${i + 1}. ${s.text || s}`)
            .join("\n");
          return `${step.name}:\n${sectionSteps}`;
        }
        return "";
      })
      .filter((s) => s)
      .join("\n\n");
  }

  return "";
}

/**
 * Normalize servings/yield
 * @param {string|number|array} yield_
 * @returns {number}
 */
function normalizeServings(yield_) {
  if (!yield_) return 4;

  if (typeof yield_ === "number") {
    return yield_;
  }

  if (Array.isArray(yield_)) {
    yield_ = yield_[0];
  }

  if (typeof yield_ === "string") {
    // Extract number from strings like "4 servings", "4 portioner", "4-6 servings"
    const match = yield_.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return 4;
}

/**
 * Normalize ingredients list
 * @param {array} ingredients
 * @returns {array}
 */
function normalizeIngredients(ingredients) {
  if (!ingredients || !Array.isArray(ingredients)) {
    return [];
  }

  return ingredients.map((ing, index) => {
    if (typeof ing === "string") {
      const parsed = parseIngredientString(ing);
      return {
        custom_name: parsed.name,
        amount: parsed.amount,
        unit: parsed.unit,
        sort_order: index,
      };
    }
    return {
      custom_name: ing.name || ing,
      amount: null,
      unit: null,
      sort_order: index,
    };
  });
}

/**
 * Parse ingredient string into components
 * Example: "2 dl grädde" -> {amount: 2, unit: "dl", name: "grädde"}
 * @param {string} str
 * @returns {{amount: number|null, unit: string|null, name: string}}
 */
function parseIngredientString(str) {
  str = str.trim();

  // Common units (Swedish and English)
  const units = [
    "kg",
    "g",
    "hg",
    "l",
    "dl",
    "cl",
    "ml",
    "liter",
    "msk",
    "tsk",
    "krm",
    "st",
    "stycken",
    "styck",
    "förp",
    "paket",
    "burk",
    "påse",
    "cup",
    "cups",
    "tbsp",
    "tsp",
    "oz",
    "lb",
  ];

  // Match patterns like "2 dl", "1/2 tsk", "2.5 g", "1-2 st"
  const regex = new RegExp(
    `^([\\d.,/\\-–]+)?\\s*(${units.join("|")})?\\s*(.+)$`,
    "i",
  );

  const match = str.match(regex);

  if (match) {
    const amountStr = match[1];
    const unit = match[2] || null;
    const name = match[3]?.trim() || str;

    let amount = null;
    if (amountStr) {
      // Handle fractions like "1/2"
      if (amountStr.includes("/")) {
        const [num, denom] = amountStr
          .split("/")
          .map((n) => parseFloat(n.replace(",", ".")));
        amount = num / denom;
      } else if (amountStr.includes("-") || amountStr.includes("–")) {
        // Range like "1-2" - take the first number
        const parts = amountStr.split(/[-–]/);
        amount = parseFloat(parts[0].replace(",", "."));
      } else {
        amount = parseFloat(amountStr.replace(",", "."));
      }
    }

    return { amount, unit, name };
  }

  return { amount: null, unit: null, name: str };
}
