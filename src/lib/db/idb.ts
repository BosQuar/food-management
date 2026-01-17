/**
 * IndexedDB wrapper for offline-first data storage
 */

const DB_NAME = "food-management";
const DB_VERSION = 1;

interface Category {
  id: number;
  name: string;
  sort_order: number;
}

interface Product {
  id: number;
  name: string;
  store_category_id: number | null;
  default_unit: string;
  default_notes: string | null;
  created_at: string;
}

interface ShoppingItem {
  id: number;
  product_id: number | null;
  custom_name: string | null;
  store_category_id: number | null;
  quantity: number;
  unit: string;
  notes: string | null;
  is_done: number;
  updated_at: string;
}

interface Recipe {
  id: number;
  name: string;
  instructions: string | null;
  servings: number;
  source_url: string | null;
  created_at: string;
  ingredients?: RecipeIngredient[];
}

interface RecipeIngredient {
  id: number;
  recipe_id: number;
  product_id: number | null;
  custom_name: string | null;
  amount: number | null;
  unit: string | null;
  sort_order: number;
}

interface PendingChange {
  id?: number;
  table: string;
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize and open the database
 */
export async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Categories store
      if (!database.objectStoreNames.contains("categories")) {
        database.createObjectStore("categories", { keyPath: "id" });
      }

      // Products store
      if (!database.objectStoreNames.contains("products")) {
        const productsStore = database.createObjectStore("products", {
          keyPath: "id",
        });
        productsStore.createIndex("category", "store_category_id", {
          unique: false,
        });
      }

      // Shopping items store
      if (!database.objectStoreNames.contains("shopping")) {
        const shoppingStore = database.createObjectStore("shopping", {
          keyPath: "id",
        });
        shoppingStore.createIndex("category", "store_category_id", {
          unique: false,
        });
      }

      // Recipes store
      if (!database.objectStoreNames.contains("recipes")) {
        database.createObjectStore("recipes", { keyPath: "id" });
      }

      // Pending changes for offline sync
      if (!database.objectStoreNames.contains("pending")) {
        const pendingStore = database.createObjectStore("pending", {
          keyPath: "id",
          autoIncrement: true,
        });
        pendingStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

/**
 * Generic get all from store
 */
async function getAll<T>(storeName: string): Promise<T[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Generic put (add or update)
 */
async function put<T>(storeName: string, item: T): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Generic delete
 */
async function remove(storeName: string, id: number): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear store and bulk put
 */
async function bulkReplace<T>(storeName: string, items: T[]): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    // Clear existing
    store.clear();

    // Add all new items
    for (const item of items) {
      store.put(item);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Categories
export const categoriesDB = {
  getAll: () => getAll<Category>("categories"),
  put: (item: Category) => put("categories", item),
  bulkReplace: (items: Category[]) => bulkReplace("categories", items),
};

// Products
export const productsDB = {
  getAll: () => getAll<Product>("products"),
  put: (item: Product) => put("products", item),
  delete: (id: number) => remove("products", id),
  bulkReplace: (items: Product[]) => bulkReplace("products", items),
};

// Shopping
export const shoppingDB = {
  getAll: () => getAll<ShoppingItem>("shopping"),
  put: (item: ShoppingItem) => put("shopping", item),
  delete: (id: number) => remove("shopping", id),
  bulkReplace: (items: ShoppingItem[]) => bulkReplace("shopping", items),
  clear: async () => {
    const database = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("shopping", "readwrite");
      const store = transaction.objectStore("shopping");
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },
};

// Recipes
export const recipesDB = {
  getAll: () => getAll<Recipe>("recipes"),
  get: async (id: number): Promise<Recipe | undefined> => {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("recipes", "readonly");
      const store = transaction.objectStore("recipes");
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },
  put: (item: Recipe) => put("recipes", item),
  delete: (id: number) => remove("recipes", id),
  bulkReplace: (items: Recipe[]) => bulkReplace("recipes", items),
};

// Pending changes for offline sync
export const pendingDB = {
  getAll: () => getAll<PendingChange>("pending"),
  add: async (change: Omit<PendingChange, "id">): Promise<number> => {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("pending", "readwrite");
      const store = transaction.objectStore("pending");
      const request = store.add({ ...change, timestamp: Date.now() });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as number);
    });
  },
  delete: (id: number) => remove("pending", id),
  clear: async () => {
    const database = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("pending", "readwrite");
      const store = transaction.objectStore("pending");
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },
};

/**
 * Check if we're online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Initialize database and load cached data
 */
export async function initOfflineDB(): Promise<void> {
  await openDB();
  console.log("IndexedDB initialized");
}
