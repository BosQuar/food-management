import {
  shoppingApi,
  type ShoppingItem,
  type AddShoppingItem,
  type AddCustomItem,
} from "$lib/api";
import { shoppingDB, isOnline } from "$lib/db/idb";

let items = $state<ShoppingItem[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

export function getShoppingStore() {
  return {
    get items() {
      return items;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },

    async fetch() {
      loading = true;
      error = null;
      try {
        // Try to fetch from API
        const data = await shoppingApi.getAll();
        items = data;
        // Cache in IndexedDB
        await shoppingDB.bulkReplace(data);
      } catch (e) {
        // If offline or API fails, try to load from cache
        if (!isOnline()) {
          try {
            const cached = await shoppingDB.getAll();
            items = cached as ShoppingItem[];
            error = null;
          } catch {
            error = "Kunde inte ladda data offline";
          }
        } else {
          error =
            e instanceof Error ? e.message : "Failed to fetch shopping list";
        }
      } finally {
        loading = false;
      }
    },

    async add(data: AddShoppingItem) {
      try {
        const item = await shoppingApi.add(data);
        // Check if item was updated (already existed) or is new
        const existingIndex = items.findIndex((i) => i.id === item.id);
        if (existingIndex >= 0) {
          items = items.map((i) => (i.id === item.id ? item : i));
        } else {
          items = [...items, item];
        }
        return item;
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to add item";
        throw e;
      }
    },

    async addCustom(data: AddCustomItem) {
      try {
        const item = await shoppingApi.addCustom(data);
        // Check if item was updated (already existed) or is new
        const existingIndex = items.findIndex((i) => i.id === item.id);
        if (existingIndex >= 0) {
          items = items.map((i) => (i.id === item.id ? item : i));
        } else {
          items = [...items, item];
        }
        return item;
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to add custom item";
        throw e;
      }
    },

    async update(id: number, data: Partial<ShoppingItem>) {
      try {
        const updated = await shoppingApi.update(id, data);
        items = items.map((item) => (item.id === id ? updated : item));
        return updated;
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to update item";
        throw e;
      }
    },

    async toggleDone(id: number) {
      const item = items.find((i) => i.id === id);
      if (item) {
        return this.update(id, { is_done: item.is_done ? 0 : 1 });
      }
    },

    async delete(id: number) {
      try {
        await shoppingApi.delete(id);
        items = items.filter((item) => item.id !== id);
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to delete item";
        throw e;
      }
    },

    async reset() {
      try {
        await shoppingApi.reset();
        items = [];
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to reset list";
        throw e;
      }
    },

    // Get items grouped by category
    get groupedByCategory() {
      const grouped = new Map<string, ShoppingItem[]>();

      for (const item of items) {
        const categoryName = item.category_name || "Övrigt";
        if (!grouped.has(categoryName)) {
          grouped.set(categoryName, []);
        }
        grouped.get(categoryName)!.push(item);
      }

      // Sort each group: not done first, then by name
      for (const [, group] of grouped) {
        group.sort((a, b) => {
          if (a.is_done !== b.is_done) return a.is_done - b.is_done;
          const nameA = a.custom_name || a.product_name || "";
          const nameB = b.custom_name || b.product_name || "";
          return nameA.localeCompare(nameB, "sv");
        });
      }

      // Sort categories by sort_order
      const sortedEntries = [...grouped.entries()].sort((a, b) => {
        const orderA =
          items.find((i) => i.category_name === a[0])?.sort_order ?? 999;
        const orderB =
          items.find((i) => i.category_name === b[0])?.sort_order ?? 999;
        return orderA - orderB;
      });

      return sortedEntries;
    },

    get doneCount() {
      return items.filter((i) => i.is_done).length;
    },

    get totalCount() {
      return items.length;
    },
  };
}

export const shoppingStore = getShoppingStore();
