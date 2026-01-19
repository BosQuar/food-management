// Shared types between frontend and backend

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthUser {
  id: number;
  username: string;
}

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  auth_token: string | null;
  created_at: string;
}

// ============================================================================
// Category Types
// ============================================================================

export interface CategoryRow {
  id: number;
  name: string;
  sort_order: number;
  user_id: number;
}

// ============================================================================
// Product Types
// ============================================================================

export interface ProductRow {
  id: number;
  name: string;
  store_category_id: number | null;
  default_unit: string;
  default_notes: string | null;
  is_staple: number;
  is_misc: number;
  user_id: number;
  created_at: string;
}

export interface CreateProductBody {
  name: string;
  store_category_id?: number;
  default_unit?: string;
  default_notes?: string;
  is_staple?: boolean;
}

export interface UpdateProductBody {
  name?: string;
  store_category_id?: number;
  default_unit?: string;
  default_notes?: string;
  is_staple?: boolean;
}

// ============================================================================
// Shopping Types
// ============================================================================

export interface ShoppingItemRow {
  id: number;
  product_id: number | null;
  custom_name: string | null;
  store_category_id: number | null;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  is_done: number;
  user_id: number;
  updated_at: string;
}

export interface ShoppingItemWithDetails extends ShoppingItemRow {
  product_name?: string;
  is_misc?: number;
  category_id?: number;
  category_name?: string;
  sort_order?: number;
}

export interface AddShoppingItemBody {
  product_id: number;
  quantity?: number | null;
  unit?: string | null;
  notes?: string;
}

export interface AddCustomItemBody {
  custom_name: string;
  store_category_id?: number;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface UpdateShoppingItemBody {
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  is_done?: number;
}

// ============================================================================
// Recipe Types
// ============================================================================

export interface RecipeRow {
  id: number;
  name: string;
  description: string | null;
  instructions: string | null;
  servings: number;
  source_url: string | null;
  user_id: number;
  created_at: string;
}

export interface RecipeIngredientRow {
  id: number;
  recipe_id: number;
  product_id: number | null;
  custom_name: string | null;
  amount: number | null;
  unit: string | null;
  sort_order: number;
}

export interface RecipeIngredientWithDetails extends RecipeIngredientRow {
  product_name?: string;
  default_unit?: string;
  store_category_id?: number;
  is_staple?: number;
}

export interface CreateRecipeBody {
  name: string;
  description?: string;
  instructions?: string;
  servings?: number;
  source_url?: string;
  ingredients?: {
    product_id?: number | null;
    custom_name?: string | null;
    amount?: number | null;
    unit?: string | null;
    sort_order?: number;
  }[];
  tag_ids?: number[];
}

export interface UpdateRecipeBody extends Partial<CreateRecipeBody> {}

// ============================================================================
// Tag Types
// ============================================================================

export interface TagRow {
  id: number;
  name: string;
  user_id: number;
  created_at: string;
}

export interface RecipeTagRow {
  id: number;
  recipe_id: number;
  tag_id: number;
}

// ============================================================================
// Backup Types
// ============================================================================

export interface BackupData {
  store_categories?: CategoryRow[];
  products?: ProductRow[];
  shopping_items?: ShoppingItemRow[];
  recipes?: RecipeRow[];
  recipe_ingredients?: RecipeIngredientRow[];
  tags?: TagRow[];
  recipe_tags?: RecipeTagRow[];
}

export interface Backup {
  version: number;
  timestamp: string;
  data: BackupData;
}

// ============================================================================
// Recipe Parser Types
// ============================================================================

export interface ParsedRecipe {
  name: string;
  instructions: string;
  servings: number;
  source_url: string;
  ingredients: ParsedIngredient[];
}

export interface ParsedIngredient {
  custom_name: string;
  amount: number | null;
  unit: string | null;
  sort_order: number;
}

// ============================================================================
// Import/Export Types
// ============================================================================

export interface ImportProductsBody {
  categories?: { id?: number; name: string; sort_order?: number }[];
  products: {
    id?: number;
    name: string;
    store_category_id?: number;
    category_name?: string;
    default_unit?: string;
    default_notes?: string;
    is_staple?: number;
  }[];
}

export interface ImportRecipesBody {
  recipes: {
    name: string;
    description?: string;
    instructions?: string;
    servings?: number;
    source_url?: string;
    ingredients?: {
      product_name?: string;
      custom_name?: string;
      amount?: number | null;
      unit?: string | null;
      sort_order?: number;
    }[];
    tags?: string[];
  }[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface MessageResponse {
  message: string;
}

export interface DeleteResponse {
  message: string;
  id: number;
}

export interface ImportResponse {
  imported: number;
  skipped: number;
}
