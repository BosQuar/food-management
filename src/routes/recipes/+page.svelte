<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { recipesStore } from "$lib/stores/recipes.svelte";
  import { tagsStore } from "$lib/stores/tags.svelte";
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import TagManagementDialog from "$lib/components/TagManagementDialog.svelte";
  import { Plus, Search, Tags } from "@lucide/svelte";

  let searchQuery = $state("");
  let selectedTagIds = $state<number[]>([]);
  let showTagDialog = $state(false);

  onMount(() => {
    recipesStore.fetch();
    tagsStore.fetch();
  });

  const filteredRecipes = $derived(() => {
    let result = recipesStore.recipes;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(query));
    }

    // Filter by selected tags (recipe must have ALL selected tags)
    if (selectedTagIds.length > 0) {
      result = result.filter((r) =>
        selectedTagIds.every((tagId) => r.tags?.some((t) => t.id === tagId)),
      );
    }

    return result;
  });

  function toggleTagFilter(tagId: number) {
    if (selectedTagIds.includes(tagId)) {
      selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
    } else {
      selectedTagIds = [...selectedTagIds, tagId];
    }
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Recept</h1>

    <div class="flex items-center gap-1 sm:gap-2">
      <Button
        variant="outline"
        size="sm"
        onclick={() => (showTagDialog = true)}
      >
        <Tags class="h-4 w-4 sm:mr-2" />
        <span class="hidden sm:inline">Taggar</span>
      </Button>

      <Button size="sm" href="/recipes/new">
        <Plus class="h-4 w-4 sm:mr-2" />
        <span class="hidden sm:inline">Nytt recept</span>
      </Button>
    </div>
  </div>

  <div class="relative">
    <Search
      class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
    />
    <Input bind:value={searchQuery} placeholder="Sök recept..." class="pl-9" />
  </div>

  <!-- Tag filter chips -->
  {#if tagsStore.tags.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each tagsStore.tags as tag (tag.id)}
        <button onclick={() => toggleTagFilter(tag.id)}>
          <Badge
            variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
          >
            {tag.name}
          </Badge>
        </button>
      {/each}
    </div>
  {/if}

  {#if recipesStore.loading}
    <div class="py-12 text-center">
      <p class="text-muted-foreground">Laddar...</p>
    </div>
  {:else if recipesStore.error}
    <div class="py-12 text-center">
      <p class="text-destructive">{recipesStore.error}</p>
      <Button
        variant="outline"
        size="sm"
        class="mt-2"
        onclick={() => recipesStore.fetch()}
      >
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

<TagManagementDialog
  open={showTagDialog}
  onOpenChange={(v) => (showTagDialog = v)}
/>
