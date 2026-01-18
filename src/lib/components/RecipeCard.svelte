<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { ChefHat } from "@lucide/svelte";
  import type { RecipeSummary } from "$lib/api";

  interface Props {
    recipe: RecipeSummary;
  }

  let { recipe }: Props = $props();
</script>

<a href="/recipes/{recipe.id}" class="block">
  <Card class="hover:bg-accent/50 transition-colors cursor-pointer">
    <CardHeader class="pb-2">
      <CardTitle class="text-base flex items-center gap-2">
        <ChefHat class="h-4 w-4 text-muted-foreground" />
        {recipe.name}
      </CardTitle>
    </CardHeader>
    <CardContent class="pt-0">
      {#if recipe.description}
        <p class="text-sm text-muted-foreground mb-2 line-clamp-2">
          {recipe.description}
        </p>
      {/if}

      <!-- Tags display -->
      {#if recipe.tags && recipe.tags.length > 0}
        <div class="flex flex-wrap gap-1 mb-2">
          {#each recipe.tags as tag (tag.id)}
            <Badge variant="secondary" class="text-xs">{tag.name}</Badge>
          {/each}
        </div>
      {/if}

      <p class="text-xs text-muted-foreground">
        {recipe.ingredient_count} ingredienser
        {#if recipe.servings}
          · {recipe.servings} portioner
        {/if}
      </p>
    </CardContent>
  </Card>
</a>
