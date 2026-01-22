<script lang="ts">
  import type { RecipeIngredient } from "$lib/api";

  interface Props {
    instructions: string;
    ingredients: RecipeIngredient[];
    scaleFactor: number;
  }

  let { instructions, ingredients, scaleFactor }: Props = $props();

  function scaleAmount(amount: number | null, divisor: number = 1): string {
    if (amount === null) return "";
    const scaled = (amount * scaleFactor) / divisor;
    if (scaled === Math.floor(scaled)) {
      return scaled.toString();
    }
    return scaled.toFixed(2).replace(/\.?0+$/, "");
  }

  function findIngredient(name: string): RecipeIngredient | undefined {
    return ingredients.find(
      (ing) =>
        (ing.custom_name || ing.product_name || "").toLowerCase() ===
        name.toLowerCase(),
    );
  }

  // Parse and render the instructions with ingredient references
  const renderedText = $derived.by(() => {
    // Regex: @[ingredientname] optionally followed by /number
    const regex = /@\[([^\]]+)\](?:\/(\d+))?/g;

    return instructions.replace(regex, (match, name, divisorStr) => {
      const ing = findIngredient(name);
      if (!ing) return match; // Keep unchanged if ingredient not found

      const divisor = divisorStr ? parseInt(divisorStr) : 1;
      const displayName = ing.custom_name || ing.product_name || name;
      const amount = scaleAmount(ing.amount, divisor);
      const unit = ing.unit || "";

      if (amount) {
        return `${displayName} (${amount} ${unit})`.trim();
      }
      return displayName;
    });
  });
</script>

<p class="text-sm whitespace-pre-line">{renderedText}</p>
