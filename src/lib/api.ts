import { authStore } from "./stores/auth.svelte";

const API_BASE = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = authStore.token;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    authStore.handleUnauthorized();
    throw new Error("Unauthorized");
  }

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

// Categories API
export const categoriesApi = {
  getAll: () => fetchJson<Category[]>(`${API_BASE}/products/categories`),
  create: (data: { name: string; sort_order?: number }) =>
    fetchJson<Category>(`${API_BASE}/products/categories`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name?: string; sort_order?: number }) =>
    fetchJson<Category>(`${API_BASE}/products/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/products/categories/${id}`, {
      method: "DELETE",
    }),
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

// Tags API
export const tagsApi = {
  getAll: () => fetchJson<Tag[]>(`${API_BASE}/tags`),
  create: (name: string) =>
    fetchJson<Tag>(`${API_BASE}/tags`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  update: (id: number, name: string) =>
    fetchJson<Tag>(`${API_BASE}/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  delete: (id: number) =>
    fetchJson<{ message: string }>(`${API_BASE}/tags/${id}`, {
      method: "DELETE",
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
  is_staple: number;
  is_misc: number;
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
  is_staple?: boolean;
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
  is_misc?: number;
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

export interface Tag {
  id: number;
  name: string;
  created_at: string;
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
  is_staple?: number;
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
  tags: Tag[];
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
  tags: Tag[];
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
  tag_ids?: number[];
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
