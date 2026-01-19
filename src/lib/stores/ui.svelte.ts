// UI state that persists across route changes and page refreshes
import { browser } from "$app/environment";

const PRODUCT_COLLAPSED_KEY = "mat_product_collapsed";
const SHOPPING_COLLAPSED_KEY = "mat_shopping_collapsed";

// Load from localStorage
function loadProductCollapsed(): Set<number> {
  if (!browser) return new Set();
  try {
    const stored = localStorage.getItem(PRODUCT_COLLAPSED_KEY);
    if (stored) {
      return new Set(JSON.parse(stored) as number[]);
    }
  } catch (e) {
    console.error("Failed to load product collapsed state:", e);
  }
  return new Set();
}

function loadShoppingCollapsed(): Set<string> {
  if (!browser) return new Set();
  try {
    const stored = localStorage.getItem(SHOPPING_COLLAPSED_KEY);
    if (stored) {
      return new Set(JSON.parse(stored) as string[]);
    }
  } catch (e) {
    console.error("Failed to load shopping collapsed state:", e);
  }
  return new Set();
}

// Save to localStorage
function saveProductCollapsed(collapsed: Set<number>) {
  if (!browser) return;
  try {
    localStorage.setItem(PRODUCT_COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch (e) {
    console.error("Failed to save product collapsed state:", e);
  }
}

function saveShoppingCollapsed(collapsed: Set<string>) {
  if (!browser) return;
  try {
    localStorage.setItem(
      SHOPPING_COLLAPSED_KEY,
      JSON.stringify([...collapsed]),
    );
  } catch (e) {
    console.error("Failed to save shopping collapsed state:", e);
  }
}

// Collapsed categories for product list (by category ID)
let productCollapsed = $state<Set<number>>(loadProductCollapsed());

// Collapsed categories for shopping list (by category name)
let shoppingCollapsed = $state<Set<string>>(loadShoppingCollapsed());

export const uiStore = {
  // Product list
  get productCollapsed() {
    return productCollapsed;
  },
  setProductCollapsed(collapsed: Set<number>) {
    productCollapsed = collapsed;
    saveProductCollapsed(collapsed);
  },
  toggleProductCategory(categoryId: number) {
    if (productCollapsed.has(categoryId)) {
      productCollapsed.delete(categoryId);
    } else {
      productCollapsed.add(categoryId);
    }
    productCollapsed = new Set(productCollapsed);
    saveProductCollapsed(productCollapsed);
  },

  // Shopping list
  get shoppingCollapsed() {
    return shoppingCollapsed;
  },
  setShoppingCollapsed(collapsed: Set<string>) {
    shoppingCollapsed = collapsed;
    saveShoppingCollapsed(collapsed);
  },
  toggleShoppingCategory(categoryName: string) {
    if (shoppingCollapsed.has(categoryName)) {
      shoppingCollapsed.delete(categoryName);
    } else {
      shoppingCollapsed.add(categoryName);
    }
    shoppingCollapsed = new Set(shoppingCollapsed);
    saveShoppingCollapsed(shoppingCollapsed);
  },
  collapseShoppingCategory(categoryName: string) {
    if (!shoppingCollapsed.has(categoryName)) {
      shoppingCollapsed.add(categoryName);
      shoppingCollapsed = new Set(shoppingCollapsed);
      saveShoppingCollapsed(shoppingCollapsed);
    }
  },
};
