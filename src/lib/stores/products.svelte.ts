import { productsApi, type ProductCategory, type Product, type Category, type CreateProduct } from '$lib/api';
import { productsDB, categoriesDB, isOnline } from '$lib/db/idb';

let categories = $state<ProductCategory[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

export function getProductsStore() {
	return {
		get categories() { return categories; },
		get loading() { return loading; },
		get error() { return error; },

		async fetch() {
			loading = true;
			error = null;
			try {
				// Try to fetch from API
				const data = await productsApi.getAll();
				categories = data;
				// Cache in IndexedDB
				const allProducts = data.flatMap(c => c.products);
				const cats = data.map(({ products, ...cat }) => cat);
				await Promise.all([
					categoriesDB.bulkReplace(cats),
					productsDB.bulkReplace(allProducts)
				]);
			} catch (e) {
				// If offline or API fails, try to load from cache
				if (!isOnline()) {
					try {
						const [cachedCats, cachedProducts] = await Promise.all([
							categoriesDB.getAll(),
							productsDB.getAll()
						]);
						categories = cachedCats.map(cat => ({
							...cat,
							products: cachedProducts.filter(p => p.store_category_id === cat.id)
						})) as ProductCategory[];
						error = null;
					} catch {
						error = 'Kunde inte ladda data offline';
					}
				} else {
					error = e instanceof Error ? e.message : 'Failed to fetch products';
				}
			} finally {
				loading = false;
			}
		},

		async create(data: CreateProduct) {
			try {
				const product = await productsApi.create(data);
				// Update local state
				const catIndex = categories.findIndex(c => c.id === product.store_category_id);
				if (catIndex >= 0) {
					categories[catIndex].products = [...categories[catIndex].products, product];
				}
				return product;
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to create product';
				throw e;
			}
		},

		async update(id: number, data: Partial<Product>) {
			try {
				const product = await productsApi.update(id, data);
				// Update local state
				for (const cat of categories) {
					const idx = cat.products.findIndex(p => p.id === id);
					if (idx >= 0) {
						cat.products[idx] = product;
						break;
					}
				}
				return product;
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to update product';
				throw e;
			}
		},

		async delete(id: number) {
			try {
				await productsApi.delete(id);
				// Update local state
				for (const cat of categories) {
					cat.products = cat.products.filter(p => p.id !== id);
				}
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to delete product';
				throw e;
			}
		},

		// Get flat list of all products
		get allProducts(): Product[] {
			return categories.flatMap(c => c.products);
		},

		// Find product by ID
		findById(id: number): Product | undefined {
			for (const cat of categories) {
				const product = cat.products.find(p => p.id === id);
				if (product) return product;
			}
			return undefined;
		}
	};
}

export const productsStore = getProductsStore();
