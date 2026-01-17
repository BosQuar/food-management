<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { recipesStore } from '$lib/stores/recipes.svelte';
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import { Plus } from '@lucide/svelte';

	onMount(() => {
		recipesStore.fetch();
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
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each recipesStore.recipes as recipe (recipe.id)}
				<RecipeCard {recipe} />
			{/each}
		</div>
	{/if}
</div>
