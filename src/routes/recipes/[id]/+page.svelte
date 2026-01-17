<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { recipesStore } from '$lib/stores/recipes.svelte';
	import { shoppingStore } from '$lib/stores/shopping.svelte';
	import PortionScaler from '$lib/components/PortionScaler.svelte';
	import { ArrowLeft, Pencil, Trash2, ShoppingCart } from '@lucide/svelte';

	let showDeleteDialog = $state(false);
	let showAddToShoppingDialog = $state(false);
	let servings = $state(4);
	let selectedIngredients = $state<Set<number>>(new Set());

	const recipeId = $derived(parseInt($page.params.id));

	onMount(async () => {
		await recipesStore.fetchOne(recipeId);
		if (recipesStore.currentRecipe) {
			servings = recipesStore.currentRecipe.servings;
		}
	});

	const recipe = $derived(recipesStore.currentRecipe);
	const scaleFactor = $derived(recipe ? servings / recipe.servings : 1);

	function scaleAmount(amount: number | null): string {
		if (amount === null) return '';
		const scaled = amount * scaleFactor;
		// Round to reasonable precision
		if (scaled === Math.floor(scaled)) {
			return scaled.toString();
		}
		return scaled.toFixed(1).replace(/\.0$/, '');
	}

	function openAddToShoppingDialog() {
		if (recipe) {
			// Select all ingredients by default
			selectedIngredients = new Set(recipe.ingredients.map((_, i) => i));
			showAddToShoppingDialog = true;
		}
	}

	function toggleIngredient(index: number) {
		if (selectedIngredients.has(index)) {
			selectedIngredients.delete(index);
		} else {
			selectedIngredients.add(index);
		}
		selectedIngredients = new Set(selectedIngredients);
	}

	async function handleAddToShopping() {
		if (recipe) {
			const ingredientsToAdd = recipe.ingredients.filter((_, i) => selectedIngredients.has(i));
			for (const ing of ingredientsToAdd) {
				const scaledAmount = ing.amount ? ing.amount * scaleFactor : 1;
				if (ing.product_id) {
					await shoppingStore.add({
						product_id: ing.product_id,
						quantity: scaledAmount,
						unit: ing.unit || 'st'
					});
				} else if (ing.custom_name) {
					await shoppingStore.addCustom({
						custom_name: ing.custom_name,
						quantity: scaledAmount,
						unit: ing.unit || 'st'
					});
				}
			}
			await shoppingStore.fetch();
			showAddToShoppingDialog = false;
		}
	}

	async function handleDelete() {
		if (recipe) {
			await recipesStore.delete(recipe.id);
			goto('/recipes');
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/recipes">
			<ArrowLeft class="h-5 w-5" />
		</Button>

		{#if recipe}
			<h1 class="text-2xl font-bold flex-1">{recipe.name}</h1>

			<Button variant="outline" size="icon" href="/recipes/{recipe.id}/edit">
				<Pencil class="h-4 w-4" />
			</Button>

			<AlertDialog.Root bind:open={showDeleteDialog}>
				<AlertDialog.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" size="icon" {...props}>
							<Trash2 class="h-4 w-4" />
						</Button>
					{/snippet}
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Ta bort recept?</AlertDialog.Title>
						<AlertDialog.Description>
							Är du säker på att du vill ta bort "{recipe.name}"? Åtgärden kan inte ångras.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Avbryt</AlertDialog.Cancel>
						<AlertDialog.Action onclick={handleDelete}>Ta bort</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		{/if}
	</div>

	{#if recipesStore.loading}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">Laddar...</p>
		</div>
	{:else if recipesStore.error}
		<div class="py-12 text-center">
			<p class="text-destructive">{recipesStore.error}</p>
			<Button variant="outline" size="sm" class="mt-2" href="/recipes">
				Tillbaka till recept
			</Button>
		</div>
	{:else if recipe}
		<div class="flex flex-wrap items-center gap-4">
			<PortionScaler
				{servings}
				originalServings={recipe.servings}
				onchange={(s) => servings = s}
			/>

			<Button onclick={openAddToShoppingDialog}>
				<ShoppingCart class="h-4 w-4 mr-2" />
				Lägg till på inköpslistan
			</Button>
		</div>

		<Card>
			<CardHeader>
				<CardTitle class="text-base">Ingredienser</CardTitle>
			</CardHeader>
			<CardContent>
				{#if recipe.ingredients.length === 0}
					<p class="text-sm text-muted-foreground">Inga ingredienser</p>
				{:else}
					<ul class="space-y-2">
						{#each recipe.ingredients as ingredient}
							<li class="flex gap-2 text-sm">
								<span class="font-medium min-w-16">
									{scaleAmount(ingredient.amount)} {ingredient.unit || ''}
								</span>
								<span>{ingredient.custom_name || ingredient.product_name || 'Okänd ingrediens'}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</CardContent>
		</Card>

		{#if recipe.instructions}
			<Card>
				<CardHeader>
					<CardTitle class="text-base">Instruktioner</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="prose prose-sm max-w-none">
						{#each recipe.instructions.split('\n') as paragraph}
							{#if paragraph.trim()}
								<p>{paragraph}</p>
							{/if}
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}

		{#if recipe.source_url}
			<p class="text-sm text-muted-foreground">
				Källa: <a href={recipe.source_url} target="_blank" rel="noopener" class="underline">{recipe.source_url}</a>
			</p>
		{/if}
	{/if}
</div>

<!-- Add to shopping dialog -->
<Dialog.Root bind:open={showAddToShoppingDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Lägg till på inköpslistan</Dialog.Title>
			<Dialog.Description>
				Välj vilka ingredienser du vill lägga till ({servings} portioner)
			</Dialog.Description>
		</Dialog.Header>
		<div class="max-h-80 overflow-y-auto py-4">
			{#if recipe}
				<div class="space-y-3">
					{#each recipe.ingredients as ingredient, index}
						<label class="flex items-center gap-3 cursor-pointer hover:bg-accent rounded-md p-2 -mx-2">
							<Checkbox
								checked={selectedIngredients.has(index)}
								onCheckedChange={() => toggleIngredient(index)}
							/>
							<span class="flex-1 text-sm">
								<span class="font-medium">{scaleAmount(ingredient.amount)} {ingredient.unit || ''}</span>
								{' '}
								{ingredient.custom_name || ingredient.product_name || 'Okänd ingrediens'}
							</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showAddToShoppingDialog = false}>Avbryt</Button>
			<Button onclick={handleAddToShopping} disabled={selectedIngredients.size === 0}>
				Lägg till ({selectedIngredients.size})
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
