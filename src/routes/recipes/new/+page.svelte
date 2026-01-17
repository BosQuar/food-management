<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { productsStore } from "$lib/stores/products.svelte";
  import { recipesStore } from "$lib/stores/recipes.svelte";
  import RecipeEditor from "$lib/components/RecipeEditor.svelte";
  import { ArrowLeft } from "@lucide/svelte";
  import type { CreateRecipe } from "$lib/api";

  let loading = $state(false);

  onMount(() => {
    productsStore.fetch();
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

  <RecipeEditor
    products={productsStore.allProducts}
    onsave={handleSave}
    oncancel={handleCancel}
    {loading}
  />
</div>
