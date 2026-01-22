import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { getDb } from "./connection.js";
import type Database from "better-sqlite3";

interface SeedCategory {
  name: string;
  sort_order: number;
}

interface SeedProduct {
  name: string;
  category: string;
  default_unit: string;
  is_staple?: boolean;
}

interface SeedIngredient {
  name: string;
  amount: number | null;
  unit: string | null;
}

interface SeedRecipe {
  name: string;
  description: string;
  servings: number;
  instructions: string;
  ingredients: SeedIngredient[];
}

const categories: SeedCategory[] = [
  { name: "Hygien", sort_order: 1 },
  { name: "Barnsaker", sort_order: 2 },
  { name: "Bröd/Kakor", sort_order: 3 },
  { name: "Ost/Kött", sort_order: 4 },
  { name: "Kryddor/Oljor", sort_order: 5 },
  { name: "Mejeri/Ägg", sort_order: 6 },
  { name: "Frukt/Grönt", sort_order: 7 },
  { name: "Torrvaror/Konserver", sort_order: 8 },
  { name: "Frysvaror/Tacos", sort_order: 9 },
  { name: "Hushållsartiklar", sort_order: 10 },
  { name: "Snacks/Bär", sort_order: 11 },
];

const products: SeedProduct[] = [
  // 1. Hygien
  { name: "Tandkräm", category: "Hygien", default_unit: "st" },
  { name: "Tops", category: "Hygien", default_unit: "st" },
  { name: "Deo S", category: "Hygien", default_unit: "st" },
  { name: "Deo O", category: "Hygien", default_unit: "st" },
  { name: "Handtvål", category: "Hygien", default_unit: "st" },
  { name: "Schampo", category: "Hygien", default_unit: "st" },
  { name: "Duschtvål", category: "Hygien", default_unit: "st" },

  // 2. Barnsaker
  { name: "Majskrokar", category: "Barnsaker", default_unit: "frp" },
  { name: "Tvättlappar", category: "Barnsaker", default_unit: "st" },
  { name: "Klämmisar", category: "Barnsaker", default_unit: "st" },
  { name: "Våtservetter", category: "Barnsaker", default_unit: "frp" },
  { name: "Barnmat", category: "Barnsaker", default_unit: "st" },
  { name: "Blöjjor", category: "Barnsaker", default_unit: "frp" },

  // 3. Bröd/Kakor
  { name: "Gofika", category: "Bröd/Kakor", default_unit: "st" },
  { name: "Kaffefilter", category: "Bröd/Kakor", default_unit: "st" },
  { name: "Korvbröd", category: "Bröd/Kakor", default_unit: "frp" },
  { name: "Te", category: "Bröd/Kakor", default_unit: "frp" },
  { name: "Kaffe", category: "Bröd/Kakor", default_unit: "frp" },
  { name: "Saft", category: "Bröd/Kakor", default_unit: "st" },
  { name: "Hamburgerbröd", category: "Bröd/Kakor", default_unit: "frp" },
  { name: "Bröd", category: "Bröd/Kakor", default_unit: "frp" },

  // 4. Ost/Kött
  { name: "Kycklingfilé", category: "Ost/Kött", default_unit: "kg" },
  { name: "Blandfärs", category: "Ost/Kött", default_unit: "frp" },
  { name: "Salladsost i olja", category: "Ost/Kött", default_unit: "st" },
  { name: "Pizzakit", category: "Ost/Kött", default_unit: "st" },
  { name: "Potatissallad", category: "Ost/Kött", default_unit: "st" },
  { name: "Sill", category: "Ost/Kött", default_unit: "st" },
  { name: "Korv", category: "Ost/Kött", default_unit: "frp" },
  { name: "Mozzarella", category: "Ost/Kött", default_unit: "st" },
  { name: "Halloumi", category: "Ost/Kött", default_unit: "st" },
  { name: "Skinka", category: "Ost/Kött", default_unit: "frp" },
  { name: "Ost", category: "Ost/Kött", default_unit: "st" },

  // 5. Kryddor/Oljor
  { name: "Fiskbuljong", category: "Kryddor/Oljor", default_unit: "frp" },
  { name: "Grönskaksbuljong", category: "Kryddor/Oljor", default_unit: "frp" },
  { name: "Kycklingbuljong", category: "Kryddor/Oljor", default_unit: "frp" },
  { name: "Paprikapulver", category: "Kryddor/Oljor", default_unit: "st" },
  {
    name: "Salt",
    category: "Kryddor/Oljor",
    default_unit: "st",
    is_staple: true,
  },
  {
    name: "Peppar",
    category: "Kryddor/Oljor",
    default_unit: "st",
    is_staple: true,
  },
  {
    name: "Vatten",
    category: "Kryddor/Oljor",
    default_unit: "dl",
    is_staple: true,
  },
  { name: "Olivolja", category: "Kryddor/Oljor", default_unit: "st" },
  { name: "Rapsolja", category: "Kryddor/Oljor", default_unit: "st" },

  // 6. Mejeri/Ägg
  { name: "Kvarg", category: "Mejeri/Ägg", default_unit: "g" },
  { name: "Baksmör", category: "Mejeri/Ägg", default_unit: "g" },
  { name: "Svennes kaviar", category: "Mejeri/Ägg", default_unit: "st" },
  { name: "Steksmör", category: "Mejeri/Ägg", default_unit: "st" },
  { name: "Grädde", category: "Mejeri/Ägg", default_unit: "dl" },
  { name: "Creme fraiche", category: "Mejeri/Ägg", default_unit: "dl" },
  { name: "Matlagningsgrädde", category: "Mejeri/Ägg", default_unit: "dl" },
  { name: "Yoghurt", category: "Mejeri/Ägg", default_unit: "l" },
  { name: "Havredryck", category: "Mejeri/Ägg", default_unit: "l" },
  { name: "Ägg", category: "Mejeri/Ägg", default_unit: "st" },
  { name: "Smör", category: "Mejeri/Ägg", default_unit: "g" },
  { name: "Mjölk", category: "Mejeri/Ägg", default_unit: "l" },
  { name: "Fil", category: "Mejeri/Ägg", default_unit: "l" },
  { name: "Keso", category: "Mejeri/Ägg", default_unit: "g" },

  // 7. Frukt/Grönt
  { name: "Avokado", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Spenat", category: "Frukt/Grönt", default_unit: "frp" },
  { name: "Purjolök", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Päron", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Zuccini", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Sötpotatis", category: "Frukt/Grönt", default_unit: "kg" },
  { name: "Isbergssallad", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Gurka", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Vitlök", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Morötter", category: "Frukt/Grönt", default_unit: "kg" },
  { name: "Citron", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Banan", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Lök", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Paprika", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Potatis", category: "Frukt/Grönt", default_unit: "kg" },
  { name: "Tomater", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Clementin", category: "Frukt/Grönt", default_unit: "st" },
  { name: "Äpple", category: "Frukt/Grönt", default_unit: "st" },

  // 8. Torrvaror/Konserver
  { name: "Quinoa", category: "Torrvaror/Konserver", default_unit: "frp" },
  { name: "Senap", category: "Torrvaror/Konserver", default_unit: "st" },
  {
    name: "Lasagneplattor",
    category: "Torrvaror/Konserver",
    default_unit: "frp",
  },
  { name: "Socker", category: "Torrvaror/Konserver", default_unit: "dl" },
  { name: "Kakao", category: "Torrvaror/Konserver", default_unit: "msk" },
  {
    name: "Vanilinsocker",
    category: "Torrvaror/Konserver",
    default_unit: "tsk",
  },
  { name: "Mjöl", category: "Torrvaror/Konserver", default_unit: "frp" },
  { name: "Remouladsås", category: "Torrvaror/Konserver", default_unit: "st" },
  { name: "Tomatpuré", category: "Torrvaror/Konserver", default_unit: "st" },
  { name: "Naan bröd", category: "Torrvaror/Konserver", default_unit: "frp" },
  { name: "Mandlar", category: "Torrvaror/Konserver", default_unit: "frp" },
  { name: "Plastpåsar", category: "Torrvaror/Konserver", default_unit: "st" },
  {
    name: "Krossade tomater",
    category: "Torrvaror/Konserver",
    default_unit: "frp",
  },
  { name: "Pumpakärnor", category: "Torrvaror/Konserver", default_unit: "frp" },
  { name: "Solrosfrön", category: "Torrvaror/Konserver", default_unit: "frp" },
  {
    name: "Tonfisk i vatten",
    category: "Torrvaror/Konserver",
    default_unit: "st",
  },
  { name: "Sweet chili", category: "Torrvaror/Konserver", default_unit: "st" },
  { name: "Linser", category: "Torrvaror/Konserver", default_unit: "frp" },
  { name: "Pesto grön", category: "Torrvaror/Konserver", default_unit: "st" },
  { name: "Pasta", category: "Torrvaror/Konserver", default_unit: "st" },
  { name: "Bönor", category: "Torrvaror/Konserver", default_unit: "st" },
  { name: "Sylt", category: "Torrvaror/Konserver", default_unit: "st" },
  { name: "Havregryn", category: "Torrvaror/Konserver", default_unit: "frp" },
  { name: "Ris", category: "Torrvaror/Konserver", default_unit: "frp" },
  { name: "Start", category: "Torrvaror/Konserver", default_unit: "st" },

  // 9. Frysvaror/Tacos
  { name: "Ärtor", category: "Frysvaror/Tacos", default_unit: "frp" },
  { name: "Dill fryst", category: "Frysvaror/Tacos", default_unit: "st" },
  { name: "Fiskpanetter", category: "Frysvaror/Tacos", default_unit: "frp" },
  { name: "Potatisbullar", category: "Frysvaror/Tacos", default_unit: "frp" },
  { name: "Persilja fryst", category: "Frysvaror/Tacos", default_unit: "st" },
  { name: "Köttbullar", category: "Frysvaror/Tacos", default_unit: "kg" },
  { name: "Vegofärs", category: "Frysvaror/Tacos", default_unit: "kg" },
  { name: "Nachos", category: "Frysvaror/Tacos", default_unit: "frp" },
  { name: "Tacosås", category: "Frysvaror/Tacos", default_unit: "st" },
  { name: "Tacobröd", category: "Frysvaror/Tacos", default_unit: "frp" },
  { name: "Fryspizza", category: "Frysvaror/Tacos", default_unit: "st" },
  { name: "Spenat fryst", category: "Frysvaror/Tacos", default_unit: "frp" },
  { name: "Broccoli", category: "Frysvaror/Tacos", default_unit: "frp" },
  { name: "Chicken nuggets", category: "Frysvaror/Tacos", default_unit: "frp" },
  { name: "Majs", category: "Frysvaror/Tacos", default_unit: "frp" },
  { name: "Lax", category: "Frysvaror/Tacos", default_unit: "g" },
  { name: "Vit fisk", category: "Frysvaror/Tacos", default_unit: "g" },

  // 10. Hushållsartiklar
  {
    name: "Kaffebryggare rengöring",
    category: "Hushållsartiklar",
    default_unit: "st",
  },
  { name: "Fönsterputs", category: "Hushållsartiklar", default_unit: "st" },
  { name: "Diskmedel", category: "Hushållsartiklar", default_unit: "st" },
  {
    name: "Diskmedelstabletter",
    category: "Hushållsartiklar",
    default_unit: "frp",
  },
  { name: "Hushållspapper", category: "Hushållsartiklar", default_unit: "frp" },
  { name: "Toalettpapper", category: "Hushållsartiklar", default_unit: "frp" },
  { name: "Tvättmedel", category: "Hushållsartiklar", default_unit: "st" },

  // 11. Snacks/Bär
  { name: "Mango", category: "Snacks/Bär", default_unit: "frp" },
  { name: "Hallon", category: "Snacks/Bär", default_unit: "frp" },
  { name: "Blåbär", category: "Snacks/Bär", default_unit: "frp" },
];

export function seed(force = false): void {
  const db = getDb();

  // Check if already seeded
  const categoryCount = db
    .prepare("SELECT COUNT(*) as count FROM store_categories")
    .get() as { count: number };
  if (categoryCount.count > 0 && !force) {
    console.log("Database already seeded, skipping...");
    return;
  }

  if (force) {
    console.log("Clearing existing data...");
    db.prepare("DELETE FROM recipe_tags").run();
    db.prepare("DELETE FROM recipe_ingredients").run();
    db.prepare("DELETE FROM recipes").run();
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM shopping_items").run();
    db.prepare("DELETE FROM products").run();
    db.prepare("DELETE FROM store_categories").run();
    db.prepare("DELETE FROM users").run();
  }

  console.log("Seeding database...");

  // Create default user "osloh" with password "osloh"
  const passwordHash = bcrypt.hashSync("osloh", 10);
  const userResult = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run("osloh", passwordHash);
  const userId = userResult.lastInsertRowid as number;
  console.log(`Created user 'osloh' with id ${userId}`);

  // Insert categories with user_id
  const insertCategory = db.prepare(
    "INSERT INTO store_categories (name, sort_order, user_id) VALUES (?, ?, ?)",
  );
  const categoryMap: Record<string, number> = {};

  for (const cat of categories) {
    const result = insertCategory.run(cat.name, cat.sort_order, userId);
    categoryMap[cat.name] = result.lastInsertRowid as number;
  }

  // Insert products and build name->id map
  const insertProduct = db.prepare(
    "INSERT INTO products (name, store_category_id, default_unit, is_staple, is_misc, user_id) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const productMap: Record<string, number> = {};

  for (const product of products) {
    const categoryId = categoryMap[product.category];
    const result = insertProduct.run(
      product.name,
      categoryId,
      product.default_unit,
      product.is_staple ? 1 : 0,
      0,
      userId,
    );
    productMap[product.name.toLowerCase()] = result.lastInsertRowid as number;
  }

  // Insert "Sällansaker" for each category
  for (const cat of categories) {
    const categoryId = categoryMap[cat.name];
    insertProduct.run("Sällansaker", categoryId, "st", 0, 1, userId);
  }

  // Insert tags with user_id
  const insertTag = db.prepare(
    "INSERT INTO tags (name, user_id) VALUES (?, ?)",
  );
  const insertRecipeTag = db.prepare(
    "INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
  );

  const middagResult = insertTag.run("Middag", userId);
  const efterrattResult = insertTag.run("Efterrätt", userId);
  const middagTagId = middagResult.lastInsertRowid as number;
  const efterrattTagId = efterrattResult.lastInsertRowid as number;

  // Insert recipes with user_id
  const insertRecipe = db.prepare(
    "INSERT INTO recipes (name, description, instructions, servings, user_id) VALUES (?, ?, ?, ?, ?)",
  );
  const insertIngredient = db.prepare(
    "INSERT INTO recipe_ingredients (recipe_id, product_id, custom_name, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
  );

  // Sweet Chili Chicken recipe
  const sweetChiliRecipe: SeedRecipe = {
    name: "Sweet Chili Kyckling",
    description: "En krämig sweet chili-kyckling som tillagas i ugn med ris.",
    servings: 6,
    instructions: `1. Ugn 200°C
2. Blanda @[Matlagningsgrädde], @[Creme fraiche], @[Sweet chili], pressad @[Vitlök] och @[Paprikapulver]
3. Häll @[Ris] i botten av formen
4. Tillsätt @[Vatten] och @[Kycklingbuljong], rör om
5. Lägg @[Kycklingfilé] ovanpå, salta & peppra
6. Häll såsen över kycklingen
7. Täck med folie, ugn 40-45 min
8. Ta bort folien, ugn 10-15 min till för fin yta`,
    ingredients: [
      { name: "Kycklingfilé", amount: 1, unit: "kg" },
      { name: "Ris", amount: 4, unit: "dl" },
      { name: "Vatten", amount: 10, unit: "dl" },
      { name: "Kycklingbuljong", amount: 2, unit: "st" },
      { name: "Matlagningsgrädde", amount: 2.5, unit: "dl" },
      { name: "Creme fraiche", amount: 2, unit: "dl" },
      { name: "Sweet chili", amount: 1.5, unit: "dl" },
      { name: "Vitlök", amount: 4, unit: "klyftor" },
      { name: "Paprikapulver", amount: 1.5, unit: "tsk" },
      { name: "Salt", amount: null, unit: null },
      { name: "Peppar", amount: null, unit: null },
    ],
  };

  const recipeResult = insertRecipe.run(
    sweetChiliRecipe.name,
    sweetChiliRecipe.description,
    sweetChiliRecipe.instructions,
    sweetChiliRecipe.servings,
    userId,
  );
  const recipeId = recipeResult.lastInsertRowid as number;

  sweetChiliRecipe.ingredients.forEach((ing, index) => {
    const productId = productMap[ing.name.toLowerCase()] || null;
    const customName = productId ? null : ing.name;
    insertIngredient.run(
      recipeId,
      productId,
      customName,
      ing.amount,
      ing.unit,
      index,
    );
  });

  // Tag: Middag
  insertRecipeTag.run(recipeId, middagTagId);

  // Chokladpudding med keso och banan
  const chokladpuddingRecipe: SeedRecipe = {
    name: "Chokladpudding med keso och banan",
    description: "En nyttigare chokladpudding med keso och banan.",
    servings: 4,
    instructions: `1. Sätt ugnen på 180°C
2. Mosa @[Banan] i en bunke
3. Tillsätt @[Keso], @[Ägg], @[Socker], @[Kakao], @[Vanilinsocker] och @[Salt] - vispa ihop till en slät smet
4. Rör ner @[Havregryn]
5. Häll smeten i en smord ugnsform (ca 20x20 cm) eller fyra portionsformar
6. Grädda i mitten av ugnen 25-30 minuter tills ytan satt sig men mitten fortfarande är lite mjuk

Servera ljummen eller kall med en klick kvarg, grädde eller färska bär.`,
    ingredients: [
      { name: "Ägg", amount: 4, unit: "st" },
      { name: "Keso", amount: 400, unit: "g" },
      { name: "Banan", amount: 2, unit: "st" },
      { name: "Havregryn", amount: 1.5, unit: "dl" },
      { name: "Kakao", amount: 3, unit: "msk" },
      { name: "Socker", amount: 0.75, unit: "dl" },
      { name: "Salt", amount: 1, unit: "nypa" },
      { name: "Vanilinsocker", amount: 1, unit: "tsk" },
    ],
  };

  const chokladpuddingResult = insertRecipe.run(
    chokladpuddingRecipe.name,
    chokladpuddingRecipe.description,
    chokladpuddingRecipe.instructions,
    chokladpuddingRecipe.servings,
    userId,
  );
  const chokladpuddingId = chokladpuddingResult.lastInsertRowid as number;

  chokladpuddingRecipe.ingredients.forEach((ing, index) => {
    const productId = productMap[ing.name.toLowerCase()] || null;
    const customName = productId ? null : ing.name;
    insertIngredient.run(
      chokladpuddingId,
      productId,
      customName,
      ing.amount,
      ing.unit,
      index,
    );
  });

  // Tag: Efterrätt
  insertRecipeTag.run(chokladpuddingId, efterrattTagId);

  console.log(
    `Seeded ${categories.length} categories, ${products.length} products, 2 tags, and 2 recipes for user 'osloh'`,
  );

  // Create test user "test" with password "test" and some test data
  seedTestUser(
    db,
    insertCategory,
    insertProduct,
    insertRecipe,
    insertIngredient,
    chokladpuddingRecipe,
  );

  // Create user "mapa" with password "mapa"
  seedMapaUser(
    db,
    insertCategory,
    insertProduct,
    insertRecipe,
    insertIngredient,
    chokladpuddingRecipe,
  );
}

function seedTestUser(
  db: Database.Database,
  insertCategory: Database.Statement,
  insertProduct: Database.Statement,
  insertRecipe: Database.Statement,
  insertIngredient: Database.Statement,
  chokladpuddingRecipe: SeedRecipe,
): void {
  const testPasswordHash = bcrypt.hashSync("test", 10);
  const testUserResult = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run("test", testPasswordHash);
  const testUserId = testUserResult.lastInsertRowid as number;
  console.log(`Created user 'test' with id ${testUserId}`);

  // Test categories
  const testCategories: SeedCategory[] = [
    { name: "Frukt", sort_order: 1 },
    { name: "Grönsaker", sort_order: 2 },
    { name: "Mejeriprodukter", sort_order: 3 },
    { name: "Torrvaror", sort_order: 4 },
  ];

  const testCategoryMap: Record<string, number> = {};
  for (const cat of testCategories) {
    const result = insertCategory.run(cat.name, cat.sort_order, testUserId);
    testCategoryMap[cat.name] = result.lastInsertRowid as number;
  }

  // Test products
  const testProducts: SeedProduct[] = [
    { name: "Äpple", category: "Frukt", default_unit: "st" },
    { name: "Banan", category: "Frukt", default_unit: "st" },
    { name: "Apelsin", category: "Frukt", default_unit: "st" },
    { name: "Päron", category: "Frukt", default_unit: "st" },
    { name: "Kiwi", category: "Frukt", default_unit: "st" },
    { name: "Tomat", category: "Grönsaker", default_unit: "st" },
    { name: "Gurka", category: "Grönsaker", default_unit: "st" },
    { name: "Morot", category: "Grönsaker", default_unit: "st" },
    { name: "Paprika", category: "Grönsaker", default_unit: "st" },
    { name: "Lök", category: "Grönsaker", default_unit: "st" },
    { name: "Mjölk", category: "Mejeriprodukter", default_unit: "l" },
    { name: "Smör", category: "Mejeriprodukter", default_unit: "st" },
    { name: "Ost", category: "Mejeriprodukter", default_unit: "st" },
    { name: "Yoghurt", category: "Mejeriprodukter", default_unit: "st" },
    { name: "Grädde", category: "Mejeriprodukter", default_unit: "dl" },
    { name: "Ägg", category: "Mejeriprodukter", default_unit: "st" },
    { name: "Keso", category: "Mejeriprodukter", default_unit: "g" },
    { name: "Havregryn", category: "Torrvaror", default_unit: "dl" },
    { name: "Kakao", category: "Torrvaror", default_unit: "msk" },
    { name: "Socker", category: "Torrvaror", default_unit: "dl" },
    {
      name: "Salt",
      category: "Torrvaror",
      default_unit: "nypa",
      is_staple: true,
    },
    { name: "Vanilinsocker", category: "Torrvaror", default_unit: "tsk" },
  ];

  const testProductMap: Record<string, number> = {};
  for (const product of testProducts) {
    const categoryId = testCategoryMap[product.category];
    const result = insertProduct.run(
      product.name,
      categoryId,
      product.default_unit,
      product.is_staple ? 1 : 0,
      0,
      testUserId,
    );
    testProductMap[product.name.toLowerCase()] =
      result.lastInsertRowid as number;
  }

  // Add recipe for test user
  const testRecipeResult = insertRecipe.run(
    "Oskars Chokladpudding med keso och banan",
    "En nyttigare chokladpudding med keso och banan.",
    chokladpuddingRecipe.instructions,
    chokladpuddingRecipe.servings,
    testUserId,
  );
  const testRecipeId = testRecipeResult.lastInsertRowid as number;

  chokladpuddingRecipe.ingredients.forEach((ing, index) => {
    const productId = testProductMap[ing.name.toLowerCase()] || null;
    const customName = productId ? null : ing.name;
    insertIngredient.run(
      testRecipeId,
      productId,
      customName,
      ing.amount,
      ing.unit,
      index,
    );
  });

  console.log(
    `Seeded ${testCategories.length} categories, ${testProducts.length} products, and 1 recipe for user 'test'`,
  );
}

function seedMapaUser(
  db: Database.Database,
  insertCategory: Database.Statement,
  insertProduct: Database.Statement,
  insertRecipe: Database.Statement,
  insertIngredient: Database.Statement,
  chokladpuddingRecipe: SeedRecipe,
): void {
  const mapaPasswordHash = bcrypt.hashSync("mapa", 10);
  const mapaUserResult = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run("mapa", mapaPasswordHash);
  const mapaUserId = mapaUserResult.lastInsertRowid as number;
  console.log(`Created user 'mapa' with id ${mapaUserId}`);

  // Mapa categories
  const mapaCategories: SeedCategory[] = [
    { name: "Mejeriprodukter", sort_order: 1 },
    { name: "Frukt", sort_order: 2 },
    { name: "Torrvaror", sort_order: 3 },
  ];

  const mapaCategoryMap: Record<string, number> = {};
  for (const cat of mapaCategories) {
    const result = insertCategory.run(cat.name, cat.sort_order, mapaUserId);
    mapaCategoryMap[cat.name] = result.lastInsertRowid as number;
  }

  // Mapa products (for recipe)
  const mapaProducts: SeedProduct[] = [
    { name: "Mjölk", category: "Mejeriprodukter", default_unit: "l" },
    { name: "Ägg", category: "Mejeriprodukter", default_unit: "st" },
    { name: "Keso", category: "Mejeriprodukter", default_unit: "g" },
    { name: "Banan", category: "Frukt", default_unit: "st" },
    { name: "Havregryn", category: "Torrvaror", default_unit: "dl" },
    { name: "Kakao", category: "Torrvaror", default_unit: "msk" },
    { name: "Socker", category: "Torrvaror", default_unit: "dl" },
    {
      name: "Salt",
      category: "Torrvaror",
      default_unit: "nypa",
      is_staple: true,
    },
    { name: "Vanilinsocker", category: "Torrvaror", default_unit: "tsk" },
  ];

  const mapaProductMap: Record<string, number> = {};
  for (const product of mapaProducts) {
    const categoryId = mapaCategoryMap[product.category];
    const result = insertProduct.run(
      product.name,
      categoryId,
      product.default_unit,
      product.is_staple ? 1 : 0,
      0,
      mapaUserId,
    );
    mapaProductMap[product.name.toLowerCase()] =
      result.lastInsertRowid as number;
  }

  // Add recipe for mapa user
  const mapaRecipeResult = insertRecipe.run(
    "Oskars Chokladpudding med keso och banan",
    "En nyttigare chokladpudding med keso och banan.",
    chokladpuddingRecipe.instructions,
    chokladpuddingRecipe.servings,
    mapaUserId,
  );
  const mapaRecipeId = mapaRecipeResult.lastInsertRowid as number;

  chokladpuddingRecipe.ingredients.forEach((ing, index) => {
    const productId = mapaProductMap[ing.name.toLowerCase()] || null;
    const customName = productId ? null : ing.name;
    insertIngredient.run(
      mapaRecipeId,
      productId,
      customName,
      ing.amount,
      ing.unit,
      index,
    );
  });

  console.log(
    `Seeded ${mapaCategories.length} categories, ${mapaProducts.length} products, and 1 recipe for user 'mapa'`,
  );
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const force = process.argv.includes("--force");
  seed(force);
  process.exit(0);
}
