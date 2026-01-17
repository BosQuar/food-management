const API_BASE = "http://localhost:8500/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// Products API
export const productsApi = {
  getAll: () => fetchJson<ProductCategory[]>(`${API_BASE}/products`),
  create: (data: CreateProduct) =>
    fetchJson<Product>(`${API_BASE}/products`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Product>) =>
    fetchJson<Product>(`${API_BASE}/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/products/${id}`, {
      method: "DELETE",
    }),
  getCategories: () => fetchJson<Category[]>(`${API_BASE}/products/categories`),
};

// Shopping API
export const shoppingApi = {
  getAll: () => fetchJson<ShoppingItem[]>(`${API_BASE}/shopping`),
  add: (data: AddShoppingItem) =>
    fetchJson<ShoppingItem>(`${API_BASE}/shopping`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addCustom: (data: AddCustomItem) =>
    fetchJson<ShoppingItem>(`${API_BASE}/shopping/custom`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ShoppingItem>) =>
    fetchJson<ShoppingItem>(`${API_BASE}/shopping/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/shopping/${id}`, {
      method: "DELETE",
    }),
  reset: () =>
    fetchJson<{ message: string }>(`${API_BASE}/shopping/reset`, {
      method: "POST",
    }),
};

// Recipes API
export const recipesApi = {
  getAll: () => fetchJson<RecipeSummary[]>(`${API_BASE}/recipes`),
  get: (id: number) => fetchJson<Recipe>(`${API_BASE}/recipes/${id}`),
  create: (data: CreateRecipe) =>
    fetchJson<Recipe>(`${API_BASE}/recipes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<CreateRecipe>) =>
    fetchJson<Recipe>(`${API_BASE}/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/recipes/${id}`, {
      method: "DELETE",
    }),
  toShopping: (id: number, scale?: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/recipes/${id}/to-shopping`, {
      method: "POST",
      body: JSON.stringify({ scale }),
    }),
  importFromUrl: (url: string) =>
    fetchJson<ImportedRecipe>(`${API_BASE}/recipes/import`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
};

// Types
export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  store_category_id: number | null;
  default_unit: string;
  default_notes: string | null;
  created_at: string;
}

export interface ProductCategory extends Category {
  products: Product[];
}

export interface CreateProduct {
  name: string;
  store_category_id?: number;
  default_unit?: string;
  default_notes?: string;
}

export interface ShoppingItem {
  id: number;
  product_id: number | null;
  custom_name: string | null;
  store_category_id: number | null;
  quantity: number;
  unit: string;
  notes: string | null;
  is_done: number;
  updated_at: string;
  product_name?: string;
  category_name?: string;
  category_id?: number;
  sort_order?: number;
}

export interface AddShoppingItem {
  product_id: number;
  quantity?: number | null;
  unit?: string | null;
  notes?: string;
}

export interface AddCustomItem {
  custom_name: string;
  store_category_id?: number;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  product_id: number | null;
  custom_name: string | null;
  amount: number | null;
  unit: string | null;
  sort_order: number;
  product_name?: string;
}

export interface Recipe {
  id: number;
  name: string;
  description: string | null;
  instructions: string | null;
  servings: number;
  source_url: string | null;
  created_at: string;
  ingredients: RecipeIngredient[];
}

export interface RecipeSummary {
  id: number;
  name: string;
  description: string | null;
  instructions: string | null;
  servings: number;
  source_url: string | null;
  created_at: string;
  ingredient_count: number;
}

export interface CreateRecipe {
  name: string;
  description?: string;
  instructions?: string;
  servings?: number;
  source_url?: string;
  ingredients?: {
    product_id?: number;
    custom_name?: string;
    amount?: number;
    unit?: string;
    sort_order?: number;
  }[];
}

export interface ImportedRecipe {
  name: string;
  instructions: string;
  servings: number;
  source_url: string;
  ingredients: {
    custom_name: string;
    amount: number | null;
    unit: string | null;
    sort_order: number;
  }[];
}
