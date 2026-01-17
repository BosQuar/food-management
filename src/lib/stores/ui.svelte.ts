// UI state that persists across route changes

// Collapsed categories for product list (by category ID)
let productCollapsed = $state<Set<number>>(new Set());

// Collapsed categories for shopping list (by category name)
let shoppingCollapsed = $state<Set<string>>(new Set());

export const uiStore = {
  // Product list
  get productCollapsed() {
    return productCollapsed;
  },
  setProductCollapsed(collapsed: Set<number>) {
    productCollapsed = collapsed;
  },
  toggleProductCategory(categoryId: number) {
    if (productCollapsed.has(categoryId)) {
      productCollapsed.delete(categoryId);
    } else {
      productCollapsed.add(categoryId);
    }
    productCollapsed = new Set(productCollapsed);
  },

  // Shopping list
  get shoppingCollapsed() {
    return shoppingCollapsed;
  },
  setShoppingCollapsed(collapsed: Set<string>) {
    shoppingCollapsed = collapsed;
  },
  toggleShoppingCategory(categoryName: string) {
    if (shoppingCollapsed.has(categoryName)) {
      shoppingCollapsed.delete(categoryName);
    } else {
      shoppingCollapsed.add(categoryName);
    }
    shoppingCollapsed = new Set(shoppingCollapsed);
  },
};
