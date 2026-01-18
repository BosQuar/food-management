<script lang="ts">
  import { onMount } from "svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Select from "$lib/components/ui/select";
  import { productsStore } from "$lib/stores/products.svelte";
  import { Plus, Search, X, Star, ChevronDown } from "@lucide/svelte";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import type { Product } from "$lib/api";

  let searchQuery = $state("");
  let showAddDialog = $state(false);
  let staplesOpen = $state(true);
  let addOpen = $state(true);

  let newProductName = $state("");
  let newProductUnit = $state("st");
  let newProductCategory = $state<string>("");

  onMount(() => {
    productsStore.fetch();
  });

  const staples = $derived(
    productsStore.allProducts.filter((p) => p.is_staple === 1),
  );

  const filteredNonStaples = $derived(
    productsStore.allProducts.filter(
      (p) =>
        p.is_staple === 0 &&
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  async function addAsStaple(product: Product) {
    await productsStore.update(product.id, { is_staple: true });
  }

  async function removeAsStaple(product: Product) {
    await productsStore.update(product.id, { is_staple: false });
  }

  async function handleCreateProduct() {
    await productsStore.create({
      name: newProductName,
      default_unit: newProductUnit,
      store_category_id: newProductCategory
        ? parseInt(newProductCategory)
        : undefined,
      is_staple: true,
    });
    showAddDialog = false;
    newProductName = "";
    newProductUnit = "st";
    newProductCategory = "";
  }

  const categories = $derived(
    productsStore.categories.map((c) => ({
      value: c.id.toString(),
      label: c.name,
    })),
  );
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Basvaror</h1>

    <Dialog.Root bind:open={showAddDialog}>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button size="sm" {...props}>
            <Plus class="h-4 w-4 mr-2" />
            Ny produkt
          </Button>
        {/snippet}
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Lägg till basvara</Dialog.Title>
        </Dialog.Header>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="name">Namn</Label>
            <Input
              id="name"
              bind:value={newProductName}
              placeholder="T.ex. Salt"
            />
          </div>
          <div class="space-y-2">
            <Label for="unit">Standardenhet</Label>
            <Input
              id="unit"
              bind:value={newProductUnit}
              placeholder="st, kg, l..."
            />
          </div>
          <div class="space-y-2">
            <Label>Kategori</Label>
            <Select.Root type="single" bind:value={newProductCategory}>
              <Select.Trigger class="w-full">
                {categories.find((c) => c.value === newProductCategory)
                  ?.label || "Välj kategori"}
              </Select.Trigger>
              <Select.Content>
                {#each categories as cat}
                  <Select.Item value={cat.value}>{cat.label}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        </div>
        <Dialog.Footer>
          <Button variant="outline" onclick={() => (showAddDialog = false)}
            >Avbryt</Button
          >
          <Button
            onclick={handleCreateProduct}
            disabled={!newProductName.trim()}>Lägg till</Button
          >
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>

  <div class="relative">
    <Search
      class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
    />
    <Input
      bind:value={searchQuery}
      placeholder="Sök produkter..."
      class="pl-9"
    />
  </div>

  {#if productsStore.loading}
    <div class="py-12 text-center">
      <p class="text-muted-foreground">Laddar...</p>
    </div>
  {:else if productsStore.error}
    <div class="py-12 text-center">
      <p class="text-destructive">{productsStore.error}</p>
      <Button
        variant="outline"
        size="sm"
        class="mt-2"
        onclick={() => productsStore.fetch()}
      >
        Försök igen
      </Button>
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Current staples section -->
      <Collapsible.Root bind:open={staplesOpen}>
        <Collapsible.Trigger
          class="flex w-full items-center justify-between py-2"
        >
          <h2
            class="text-sm font-medium text-muted-foreground flex items-center gap-2"
          >
            <Star class="h-4 w-4" />
            Aktuella basvaror ({staples.length})
          </h2>
          <ChevronDown
            class="h-4 w-4 text-muted-foreground transition-transform {staplesOpen
              ? 'rotate-180'
              : ''}"
          />
        </Collapsible.Trigger>
        <Collapsible.Content>
          {#if staples.length === 0}
            <p class="text-sm text-muted-foreground py-4">
              Inga basvaror ännu. Lägg till produkter nedan som du alltid har
              hemma.
            </p>
          {:else}
            <div class="space-y-1 pt-2">
              {#each staples as product}
                <div
                  class="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <span class="font-medium">{product.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onclick={() => removeAsStaple(product)}
                  >
                    <X class="h-4 w-4" />
                  </Button>
                </div>
              {/each}
            </div>
          {/if}
        </Collapsible.Content>
      </Collapsible.Root>

      <!-- Add staples section -->
      <Collapsible.Root bind:open={addOpen}>
        <Collapsible.Trigger
          class="flex w-full items-center justify-between py-2"
        >
          <h2 class="text-sm font-medium text-muted-foreground">
            Lägg till basvaror
          </h2>
          <ChevronDown
            class="h-4 w-4 text-muted-foreground transition-transform {addOpen
              ? 'rotate-180'
              : ''}"
          />
        </Collapsible.Trigger>
        <Collapsible.Content>
          {#if filteredNonStaples.length === 0}
            <p class="text-sm text-muted-foreground py-4">
              {searchQuery
                ? "Inga produkter matchar sökningen."
                : "Alla produkter är redan basvaror."}
            </p>
          {:else}
            <div class="space-y-1 pt-2">
              {#each filteredNonStaples as product}
                <div
                  class="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <span>{product.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onclick={() => addAsStaple(product)}
                  >
                    <Plus class="h-4 w-4" />
                  </Button>
                </div>
              {/each}
            </div>
          {/if}
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  {/if}
</div>
