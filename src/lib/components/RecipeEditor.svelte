<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import IngredientRow from './IngredientRow.svelte';
	import { Plus, Download } from '@lucide/svelte';
	import { recipesApi, type Product, type Recipe, type CreateRecipe } from '$lib/api';

	interface Ingredient {
		product_id?: number;
		custom_name?: string;
		amount?: number;
		unit?: string;
		sort_order?: number;
	}

	interface Props {
		recipe?: Recipe;
		products: Product[];
		onsave: (data: CreateRecipe) => void;
		oncancel: () => void;
		loading?: boolean;
	}

	let { recipe, products, onsave, oncancel, loading = false }: Props = $props();

	let name = $state(recipe?.name || '');
	let description = $state(recipe?.description || '');
	let servings = $state(recipe?.servings || 4);
	let instructions = $state(recipe?.instructions || '');
	let sourceUrl = $state(recipe?.source_url || '');
	let importUrl = $state('');
	let importing = $state(false);
	let importError = $state('');
	let ingredients = $state<Ingredient[]>(
		recipe?.ingredients.map(i => ({
			product_id: i.product_id || undefined,
			custom_name: i.custom_name || undefined,
			amount: i.amount || undefined,
			unit: i.unit || undefined,
			sort_order: i.sort_order
		})) || [{}]
	);

	async function handleImport() {
		if (!importUrl.trim()) return;

		importing = true;
		importError = '';

		try {
			const imported = await recipesApi.importFromUrl(importUrl);
			name = imported.name;
			servings = imported.servings;
			instructions = imported.instructions;
			sourceUrl = imported.source_url;
			ingredients = imported.ingredients.map(i => ({
				custom_name: i.custom_name,
				amount: i.amount ?? undefined,
				unit: i.unit ?? undefined,
				sort_order: i.sort_order
			}));
			importUrl = '';
		} catch (e) {
			importError = e instanceof Error ? e.message : 'Kunde inte importera recept';
		} finally {
			importing = false;
		}
	}

	function addIngredient() {
		ingredients = [...ingredients, {}];
	}

	function updateIngredient(index: number, data: Ingredient) {
		ingredients = ingredients.map((ing, i) => i === index ? data : ing);
	}

	function removeIngredient(index: number) {
		if (ingredients.length > 1) {
			ingredients = ingredients.filter((_, i) => i !== index);
		}
	}

	function handleSave() {
		const validIngredients = ingredients
			.filter(i => i.product_id || i.custom_name)
			.map((i, idx) => ({ ...i, sort_order: idx }));

		onsave({
			name,
			description: description || undefined,
			servings,
			instructions: instructions || undefined,
			source_url: sourceUrl || undefined,
			ingredients: validIngredients
		});
	}

	const canSave = $derived(name.trim().length > 0);
</script>

<div class="space-y-6">
	{#if !recipe}
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-base">Importera från URL</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex gap-2">
					<Input
						bind:value={importUrl}
						placeholder="Klistra in recept-URL..."
						disabled={importing}
					/>
					<Button
						variant="outline"
						onclick={handleImport}
						disabled={!importUrl.trim() || importing}
					>
						<Download class="h-4 w-4 mr-2" />
						{importing ? 'Importerar...' : 'Importera'}
					</Button>
				</div>
				{#if importError}
					<p class="text-sm text-destructive mt-2">{importError}</p>
				{/if}
			</CardContent>
		</Card>
	{/if}

	<div class="space-y-4">
		<div class="space-y-2">
			<Label for="name">Receptnamn</Label>
			<Input id="name" bind:value={name} placeholder="T.ex. Pasta Carbonara" />
		</div>

		<div class="space-y-2">
			<Label for="description">Beskrivning</Label>
			<Input id="description" bind:value={description} placeholder="Kort beskrivning av receptet..." />
		</div>

		<div class="space-y-2">
			<Label for="servings">Antal portioner</Label>
			<Input id="servings" type="number" bind:value={servings} min="1" class="w-24" />
		</div>
	</div>

	<Card>
		<CardHeader class="pb-3">
			<div class="flex items-center justify-between">
				<CardTitle class="text-base">Ingredienser</CardTitle>
				<Button variant="outline" size="sm" onclick={addIngredient}>
					<Plus class="h-4 w-4 mr-1" />
					Lägg till
				</Button>
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			{#each ingredients as ingredient, index (index)}
				<IngredientRow
					{ingredient}
					{products}
					onchange={(data) => updateIngredient(index, data)}
					onremove={() => removeIngredient(index)}
				/>
			{/each}
		</CardContent>
	</Card>

	<div class="space-y-2">
		<Label for="instructions">Instruktioner</Label>
		<Textarea
			id="instructions"
			bind:value={instructions}
			placeholder="Beskriv hur receptet tillagas..."
			rows={8}
		/>
	</div>

	<div class="space-y-2">
		<Label for="source">Källa (valfritt)</Label>
		<Input id="source" bind:value={sourceUrl} placeholder="https://..." />
	</div>

	<div class="flex gap-2 justify-end">
		<Button variant="outline" onclick={oncancel} disabled={loading}>Avbryt</Button>
		<Button onclick={handleSave} disabled={!canSave || loading}>
			{loading ? 'Sparar...' : 'Spara'}
		</Button>
	</div>
</div>
