<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { recipesStore } from '$lib/stores/recipes.svelte';
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import { Plus, Search } from '@lucide/svelte';

	let searchQuery = $state('');

	onMount(() => {
		recipesStore.fetch();
	});

	const filteredRecipes = $derived(() => {
		if (!searchQuery.trim()) return recipesStore.recipes;
		const query = searchQuery.toLowerCase();
		return recipesStore.recipes.filter(r => r.name.toLowerCase().includes(query));
	});
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Recept</h1>

		<Button size="sm" href="/recipes/new">
			<Plus class="h-4 w-4 mr-2" />
			Nytt recept
		</Button>
	</div>

	<div class="relative">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
		<Input
			bind:value={searchQuery}
			placeholder="Sök recept..."
			class="pl-9"
		/>
	</div>

	{#if recipesStore.loading}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">Laddar...</p>
		</div>
	{:else if recipesStore.error}
		<div class="py-12 text-center">
			<p class="text-destructive">{recipesStore.error}</p>
			<Button variant="outline" size="sm" class="mt-2" onclick={() => recipesStore.fetch()}>
				Försök igen
			</Button>
		</div>
	{:else if recipesStore.recipes.length === 0}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">Inga recept ännu</p>
			<p class="text-sm text-muted-foreground mt-1">Skapa ditt första recept</p>
		</div>
	{:else if filteredRecipes().length === 0}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">Inga recept matchar "{searchQuery}"</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each filteredRecipes() as recipe (recipe.id)}
				<RecipeCard {recipe} />
			{/each}
		</div>
	{/if}
</div>
