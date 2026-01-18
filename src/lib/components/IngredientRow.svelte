<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import * as Popover from "$lib/components/ui/popover";
  import * as Command from "$lib/components/ui/command";
  import {
    Trash2,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    Check,
  } from "@lucide/svelte";
  import type { Product } from "$lib/api";

  interface Ingredient {
    product_id?: number;
    custom_name?: string;
    amount?: number;
    unit?: string;
  }

  interface Props {
    ingredient: Ingredient;
    products: Product[];
    onchange: (ingredient: Ingredient) => void;
    onremove: () => void;
    onmoveup?: () => void;
    onmovedown?: () => void;
    isFirst?: boolean;
    isLast?: boolean;
  }

  let {
    ingredient,
    products,
    onchange,
    onremove,
    onmoveup,
    onmovedown,
    isFirst = false,
    isLast = false,
  }: Props = $props();

  let useCustom = $state(!ingredient.product_id);
  let selectedProductId = $state(ingredient.product_id?.toString() || "");
  let open = $state(false);
  let searchValue = $state("");

  const selectedProduct = $derived(
    products.find((p) => p.id.toString() === selectedProductId),
  );

  const filteredProducts = $derived(
    searchValue.trim()
      ? products.filter((p) =>
          p.name.toLowerCase().includes(searchValue.toLowerCase()),
        )
      : products,
  );

  function handleProductSelect(productId: number) {
    const product = products.find((p) => p.id === productId);
    selectedProductId = productId.toString();
    onchange({
      ...ingredient,
      product_id: productId,
      custom_name: undefined,
      unit: ingredient.unit || product?.default_unit || "st",
    });
    open = false;
    searchValue = "";
  }

  function handleCustomNameChange(e: Event) {
    const target = e.target as HTMLInputElement;
    onchange({
      ...ingredient,
      product_id: undefined,
      custom_name: target.value,
    });
  }

  function handleAmountChange(e: Event) {
    const target = e.target as HTMLInputElement;
    onchange({
      ...ingredient,
      amount: target.value ? parseFloat(target.value) : undefined,
    });
  }

  function handleUnitChange(e: Event) {
    const target = e.target as HTMLInputElement;
    onchange({
      ...ingredient,
      unit: target.value,
    });
  }

  function toggleCustom() {
    useCustom = !useCustom;
    if (useCustom) {
      selectedProductId = "";
      onchange({
        ...ingredient,
        product_id: undefined,
      });
    } else {
      onchange({
        ...ingredient,
        custom_name: undefined,
      });
    }
  }
</script>

<div class="flex gap-2 items-start">
  <div class="flex-1 space-y-2">
    <div class="flex gap-2">
      {#if useCustom}
        <Input
          value={ingredient.custom_name || ""}
          oninput={handleCustomNameChange}
          placeholder="Ingrediens"
          class="flex-1"
        />
      {:else}
        <Popover.Root bind:open>
          <Popover.Trigger>
            {#snippet child({ props })}
              <Button
                variant="outline"
                class="flex-1 justify-between font-normal"
                {...props}
              >
                {selectedProduct?.name || "Välj produkt..."}
                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-64 p-0" align="start">
            <Command.Root shouldFilter={false}>
              <Command.Input
                placeholder="Sök produkt..."
                bind:value={searchValue}
              />
              <Command.List class="max-h-60">
                {#if filteredProducts.length === 0}
                  <Command.Empty>Ingen produkt hittades</Command.Empty>
                {/if}
                {#each filteredProducts as product (product.id)}
                  <Command.Item
                    value={product.name}
                    onSelect={() => handleProductSelect(product.id)}
                  >
                    <Check
                      class="mr-2 h-4 w-4 {selectedProductId ===
                      product.id.toString()
                        ? 'opacity-100'
                        : 'opacity-0'}"
                    />
                    {product.name}
                  </Command.Item>
                {/each}
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      {/if}

      <Button variant="ghost" size="sm" onclick={toggleCustom} class="text-xs">
        {useCustom ? "Produkt" : "Fritext"}
      </Button>
    </div>

    <div class="flex gap-2">
      <Input
        type="number"
        value={ingredient.amount || ""}
        oninput={handleAmountChange}
        placeholder="Mängd"
        class="w-20"
        min="0"
        step="0.1"
      />
      <Input
        value={ingredient.unit || ""}
        oninput={handleUnitChange}
        placeholder="Enhet"
        class="w-20"
      />
    </div>
  </div>

  <div class="flex flex-col gap-0.5">
    <Button
      variant="ghost"
      size="icon"
      class="h-6 w-6 text-muted-foreground"
      onclick={onmoveup}
      disabled={isFirst}
    >
      <ChevronUp class="h-4 w-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      class="h-6 w-6 text-muted-foreground"
      onclick={onmovedown}
      disabled={isLast}
    >
      <ChevronDown class="h-4 w-4" />
    </Button>
  </div>

  <Button
    variant="ghost"
    size="icon"
    class="text-muted-foreground hover:text-destructive"
    onclick={onremove}
  >
    <Trash2 class="h-4 w-4" />
  </Button>
</div>
