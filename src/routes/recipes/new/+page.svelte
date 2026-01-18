<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import { productsStore } from "$lib/stores/products.svelte";
  import { recipesStore } from "$lib/stores/recipes.svelte";
  import RecipeEditor from "$lib/components/RecipeEditor.svelte";
  import { ArrowLeft } from "@lucide/svelte";
  import type { CreateRecipe, Recipe } from "$lib/api";

  let loading = $state(false);
  let prefillRecipe = $state<Partial<Recipe> | undefined>(undefined);
  let ready = $state(false);

  onMount(() => {
    productsStore.fetch();

    // Check if coming from freetext import
    if ($page.url.searchParams.get("from") === "freetext") {
      const stored = sessionStorage.getItem("parsedRecipe");
      if (stored) {
        try {
          prefillRecipe = JSON.parse(stored);
          sessionStorage.removeItem("parsedRecipe");
        } catch (e) {
          console.error("Failed to parse stored recipe:", e);
        }
      }
    }
    ready = true;
  });

  async function handleSave(data: CreateRecipe) {
    loading = true;
    try {
      const recipe = await recipesStore.create(data);
      goto(`/recipes/${recipe.id}`);
    } catch (e) {
      console.error("Failed to create recipe:", e);
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    goto("/recipes");
  }
</script>

<div class="space-y-6">
  <div class="flex items-center gap-4">
    <Button variant="ghost" size="icon" href="/recipes">
      <ArrowLeft class="h-5 w-5" />
    </Button>
    <h1 class="text-2xl font-bold">Nytt recept</h1>
  </div>

  {#if ready}
    {#key prefillRecipe}
      <RecipeEditor
        recipe={prefillRecipe}
        products={productsStore.allProducts}
        onsave={handleSave}
        oncancel={handleCancel}
        {loading}
      />
    {/key}
  {/if}
</div>
