<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { productsStore } from '$lib/stores/products.svelte';
	import { recipesStore } from '$lib/stores/recipes.svelte';
	import RecipeEditor from '$lib/components/RecipeEditor.svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import type { CreateRecipe } from '$lib/api';

	let loading = $state(false);

	const recipeId = $derived(parseInt($page.params.id));

	onMount(async () => {
		await Promise.all([
			productsStore.fetch(),
			recipesStore.fetchOne(recipeId)
		]);
	});

	async function handleSave(data: CreateRecipe) {
		loading = true;
		try {
			await recipesStore.update(recipeId, data);
			goto(`/recipes/${recipeId}`);
		} catch (e) {
			console.error('Failed to update recipe:', e);
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		goto(`/recipes/${recipeId}`);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/recipes/{recipeId}">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<h1 class="text-2xl font-bold">Redigera recept</h1>
	</div>

	{#if recipesStore.loading}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">Laddar...</p>
		</div>
	{:else if recipesStore.currentRecipe}
		<RecipeEditor
			recipe={recipesStore.currentRecipe}
			products={productsStore.allProducts}
			onsave={handleSave}
			oncancel={handleCancel}
			{loading}
		/>
	{:else}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">Receptet kunde inte hittas</p>
		</div>
	{/if}
</div>
