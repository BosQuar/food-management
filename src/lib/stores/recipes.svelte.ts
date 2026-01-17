import { recipesApi, type Recipe, type RecipeSummary, type CreateRecipe } from '$lib/api';

let recipes = $state<RecipeSummary[]>([]);
let currentRecipe = $state<Recipe | null>(null);
let loading = $state(false);
let error = $state<string | null>(null);

export function getRecipesStore() {
	return {
		get recipes() { return recipes; },
		get currentRecipe() { return currentRecipe; },
		get loading() { return loading; },
		get error() { return error; },

		async fetch() {
			loading = true;
			error = null;
			try {
				recipes = await recipesApi.getAll();
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to fetch recipes';
			} finally {
				loading = false;
			}
		},

		async fetchOne(id: number) {
			loading = true;
			error = null;
			try {
				currentRecipe = await recipesApi.get(id);
				return currentRecipe;
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to fetch recipe';
				throw e;
			} finally {
				loading = false;
			}
		},

		async create(data: CreateRecipe) {
			try {
				const recipe = await recipesApi.create(data);
				recipes = [...recipes, {
					...recipe,
					ingredient_count: recipe.ingredients.length
				}];
				return recipe;
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to create recipe';
				throw e;
			}
		},

		async update(id: number, data: Partial<CreateRecipe>) {
			try {
				const recipe = await recipesApi.update(id, data);
				recipes = recipes.map(r => r.id === id ? {
					...recipe,
					ingredient_count: recipe.ingredients.length
				} : r);
				currentRecipe = recipe;
				return recipe;
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to update recipe';
				throw e;
			}
		},

		async delete(id: number) {
			try {
				await recipesApi.delete(id);
				recipes = recipes.filter(r => r.id !== id);
				if (currentRecipe?.id === id) {
					currentRecipe = null;
				}
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to delete recipe';
				throw e;
			}
		},

		async addToShopping(id: number, scale?: number) {
			try {
				return await recipesApi.toShopping(id, scale);
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to add to shopping list';
				throw e;
			}
		},

		clearCurrent() {
			currentRecipe = null;
		}
	};
}

export const recipesStore = getRecipesStore();
