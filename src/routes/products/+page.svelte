<script lang="ts">
  import { onMount } from "svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Select from "$lib/components/ui/select";
  import { productsStore } from "$lib/stores/products.svelte";
  import { shoppingStore } from "$lib/stores/shopping.svelte";
  import ProductList from "$lib/components/ProductList.svelte";
  import {
    Plus,
    Search,
    Settings,
    FolderOpen,
    Pencil,
    Trash2,
    ChevronUp,
    ChevronDown,
  } from "@lucide/svelte";
  import type { Product, Category } from "$lib/api";
  import { categoriesApi } from "$lib/api";

  let searchQuery = $state("");
  let editMode = $state(false);
  let showAddDialog = $state(false);
  let showEditDialog = $state(false);
  let showDeleteDialog = $state(false);
  let showOverwriteDialog = $state(false);

  let selectedProduct = $state<Product | null>(null);
  let pendingAdd = $state<{
    product: Product;
    quantity: number | null;
    unit: string;
  } | null>(null);

  let newProductName = $state("");
  let newProductUnit = $state("st");
  let newProductCategory = $state<string>("");

  let editProductName = $state("");
  let editProductUnit = $state("");
  let editProductCategory = $state<string>("");
  let editProductIsStaple = $state(false);

  // Category management
  let showCategoriesDialog = $state(false);
  let showAddCategoryDialog = $state(false);
  let showEditCategoryDialog = $state(false);
  let showDeleteCategoryDialog = $state(false);
  let selectedCategory = $state<Category | null>(null);
  let newCategoryName = $state("");
  let editCategoryName = $state("");
  let categoryError = $state<string | null>(null);

  onMount(() => {
    productsStore.fetch();
    shoppingStore.fetch();
  });

  async function handleAddToList(
    product: Product,
    quantity: number | null,
    unit: string,
  ) {
    // Check if product already exists in shopping list
    const existing = shoppingStore.items.find(
      (item) => item.product_id === product.id && !item.is_done,
    );

    if (existing) {
      // Product exists
      if (quantity === null && existing.quantity !== null) {
        // Trying to add without quantity when item has quantity - show warning
        pendingAdd = { product, quantity, unit };
        showOverwriteDialog = true;
        return;
      } else if (quantity === null && existing.quantity === null) {
        // Both without quantity - do nothing (already in list)
        return;
      }
      // Has quantity - will be handled by backend (add to existing)
    }

    await doAddToList(product, quantity, unit);
  }

  async function doAddToList(
    product: Product,
    quantity: number | null,
    unit: string,
  ) {
    await shoppingStore.add({
      product_id: product.id,
      quantity,
      unit,
    });
  }

  async function handleOverwriteConfirm() {
    if (pendingAdd) {
      // User wants to overwrite - set quantity to null
      const existing = shoppingStore.items.find(
        (item) => item.product_id === pendingAdd.product.id && !item.is_done,
      );
      if (existing) {
        await shoppingStore.update(existing.id, { quantity: null, unit: null });
      }
    }
    showOverwriteDialog = false;
    pendingAdd = null;
  }

  function openEditDialog(product: Product) {
    selectedProduct = product;
    editProductName = product.name;
    editProductUnit = product.default_unit;
    editProductCategory = product.store_category_id?.toString() || "";
    editProductIsStaple = Boolean(product.is_staple);
    showEditDialog = true;
  }

  async function handleEditProduct() {
    if (selectedProduct) {
      await productsStore.update(selectedProduct.id, {
        name: editProductName,
        default_unit: editProductUnit,
        store_category_id: editProductCategory
          ? parseInt(editProductCategory)
          : null,
        is_staple: editProductIsStaple,
      });
      showEditDialog = false;
      selectedProduct = null;
    }
  }

  function openDeleteDialog(product: Product) {
    selectedProduct = product;
    showDeleteDialog = true;
  }

  async function handleDeleteProduct() {
    if (selectedProduct) {
      await productsStore.delete(selectedProduct.id);
      showDeleteDialog = false;
      selectedProduct = null;
    }
  }

  async function handleCreateProduct() {
    await productsStore.create({
      name: newProductName,
      default_unit: newProductUnit,
      store_category_id: newProductCategory
        ? parseInt(newProductCategory)
        : undefined,
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

  // Category functions
  async function handleCreateCategory() {
    categoryError = null;
    try {
      await categoriesApi.create({ name: newCategoryName });
      await productsStore.fetch();
      showAddCategoryDialog = false;
      newCategoryName = "";
    } catch (e) {
      categoryError =
        e instanceof Error ? e.message : "Kunde inte skapa kategori";
    }
  }

  function openEditCategoryDialog(category: Category) {
    selectedCategory = category;
    editCategoryName = category.name;
    categoryError = null;
    showEditCategoryDialog = true;
  }

  async function handleEditCategory() {
    if (!selectedCategory) return;
    categoryError = null;
    try {
      await categoriesApi.update(selectedCategory.id, {
        name: editCategoryName,
      });
      await productsStore.fetch();
      showEditCategoryDialog = false;
      selectedCategory = null;
    } catch (e) {
      categoryError =
        e instanceof Error ? e.message : "Kunde inte uppdatera kategori";
    }
  }

  function openDeleteCategoryDialog(category: Category) {
    selectedCategory = category;
    categoryError = null;
    showDeleteCategoryDialog = true;
  }

  async function handleDeleteCategory() {
    if (!selectedCategory) return;
    categoryError = null;
    try {
      await categoriesApi.delete(selectedCategory.id);
      await productsStore.fetch();
      showDeleteCategoryDialog = false;
      selectedCategory = null;
    } catch (e) {
      categoryError =
        e instanceof Error
          ? e.message
          : "Kan inte ta bort kategori med produkter";
    }
  }

  async function moveCategoryUp(index: number) {
    if (index <= 0) return;
    const cats = productsStore.categories;
    const current = cats[index];
    const previous = cats[index - 1];

    // Swap sort_order values
    await categoriesApi.update(current.id, { sort_order: previous.sort_order });
    await categoriesApi.update(previous.id, { sort_order: current.sort_order });
    await productsStore.fetch();
  }

  async function moveCategoryDown(index: number) {
    const cats = productsStore.categories;
    if (index >= cats.length - 1) return;
    const current = cats[index];
    const next = cats[index + 1];

    // Swap sort_order values
    await categoriesApi.update(current.id, { sort_order: next.sort_order });
    await categoriesApi.update(next.id, { sort_order: current.sort_order });
    await productsStore.fetch();
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Produkter</h1>

    <div class="flex gap-1 sm:gap-2">
      <Button
        variant="outline"
        size="sm"
        onclick={() => (showCategoriesDialog = true)}
      >
        <FolderOpen class="h-4 w-4 sm:mr-2" />
        <span class="hidden sm:inline">Kategorier</span>
      </Button>

      <Button
        variant={editMode ? "default" : "outline"}
        size="sm"
        onclick={() => (editMode = !editMode)}
      >
        <Settings class="h-4 w-4 sm:mr-2" />
        <span class="hidden sm:inline">{editMode ? "Klar" : "Redigera"}</span>
      </Button>

      <Dialog.Root bind:open={showAddDialog}>
        <Dialog.Trigger>
          {#snippet child({ props })}
            <Button size="sm" {...props}>
              <Plus class="h-4 w-4 sm:mr-2" />
              <span class="hidden sm:inline">Ny produkt</span>
            </Button>
          {/snippet}
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Lägg till produkt</Dialog.Title>
          </Dialog.Header>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="name">Namn</Label>
              <Input
                id="name"
                bind:value={newProductName}
                placeholder="T.ex. Mjölk"
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
              <Label>Kategori <span class="text-destructive">*</span></Label>
              {#if categories.length === 0}
                <p class="text-sm text-muted-foreground">
                  Du måste skapa en kategori först.
                  <button
                    type="button"
                    class="text-primary underline"
                    onclick={() => {
                      showAddDialog = false;
                      showCategoriesDialog = true;
                    }}
                  >
                    Skapa kategori
                  </button>
                </p>
              {:else}
                <Select.Root type="single" bind:value={newProductCategory}>
                  <Select.Trigger class="w-full">
                    {categories.find((c) => c.value === newProductCategory)
                      ?.label || "Välj kategori..."}
                  </Select.Trigger>
                  <Select.Content>
                    {#each categories as cat}
                      <Select.Item value={cat.value}>{cat.label}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              {/if}
            </div>
          </div>
          <Dialog.Footer>
            <Button variant="outline" onclick={() => (showAddDialog = false)}
              >Avbryt</Button
            >
            <Button
              onclick={handleCreateProduct}
              disabled={!newProductName.trim() || !newProductCategory}
              >Lägg till</Button
            >
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
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
    <ProductList
      categories={productsStore.categories}
      {searchQuery}
      {editMode}
      shoppingItems={shoppingStore.items}
      onAddToList={handleAddToList}
      onRemoveFromList={(id) => shoppingStore.delete(id)}
      onUpdateNotes={(id, notes) => shoppingStore.update(id, { notes })}
      onEdit={openEditDialog}
      onDelete={openDeleteDialog}
    />
  {/if}
</div>

<!-- Overwrite quantity warning dialog -->
<AlertDialog.Root bind:open={showOverwriteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Skriv över kvantitet?</AlertDialog.Title>
      <AlertDialog.Description>
        "{pendingAdd?.product.name}" finns redan på listan med en kvantitet.
        Vill du ta bort kvantiteten?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel
        onclick={() => {
          showOverwriteDialog = false;
          pendingAdd = null;
        }}
      >
        Avbryt
      </AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleOverwriteConfirm}>
        Ta bort kvantitet
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Edit dialog -->
<Dialog.Root bind:open={showEditDialog}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Redigera produkt</Dialog.Title>
    </Dialog.Header>
    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="edit-name">Namn</Label>
        <Input id="edit-name" bind:value={editProductName} />
      </div>
      <div class="space-y-2">
        <Label for="edit-unit">Standardenhet</Label>
        <Input id="edit-unit" bind:value={editProductUnit} />
      </div>
      <div class="space-y-2">
        <Label>Kategori <span class="text-destructive">*</span></Label>
        <Select.Root type="single" bind:value={editProductCategory}>
          <Select.Trigger class="w-full">
            {categories.find((c) => c.value === editProductCategory)?.label ||
              "Välj kategori..."}
          </Select.Trigger>
          <Select.Content>
            {#each categories as cat}
              <Select.Item value={cat.value}>{cat.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <label class="flex items-center gap-3 cursor-pointer">
        <Checkbox
          checked={editProductIsStaple}
          onCheckedChange={(checked) =>
            (editProductIsStaple = checked === true)}
        />
        <div>
          <span class="text-sm font-medium">Basvara</span>
          <p class="text-xs text-muted-foreground">
            Basvaror förmarkeras inte i recept
          </p>
        </div>
      </label>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (showEditDialog = false)}
        >Avbryt</Button
      >
      <Button onclick={handleEditProduct} disabled={!editProductCategory}
        >Spara</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete dialog -->
<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Ta bort produkt?</Dialog.Title>
      <Dialog.Description>
        Är du säker på att du vill ta bort "{selectedProduct?.name}"? Åtgärden
        kan inte ångras.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (showDeleteDialog = false)}
        >Avbryt</Button
      >
      <Button variant="destructive" onclick={handleDeleteProduct}
        >Ta bort</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Categories management dialog -->
<Dialog.Root bind:open={showCategoriesDialog}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Hantera kategorier</Dialog.Title>
    </Dialog.Header>
    <div class="py-4 space-y-1 max-h-[60vh] overflow-y-auto">
      {#each productsStore.categories as category, index (category.id)}
        <div
          class="flex items-center justify-between p-2 rounded-md hover:bg-accent"
        >
          <span class="text-sm font-medium">{category.name}</span>
          <div class="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              onclick={() => moveCategoryUp(index)}
              disabled={index === 0}
            >
              <ChevronUp class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              onclick={() => moveCategoryDown(index)}
              disabled={index === productsStore.categories.length - 1}
            >
              <ChevronDown class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              onclick={() => openEditCategoryDialog(category)}
            >
              <Pencil class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-muted-foreground hover:text-destructive"
              onclick={() => openDeleteCategoryDialog(category)}
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/each}
      {#if productsStore.categories.length === 0}
        <p class="text-sm text-muted-foreground text-center py-4">
          Inga kategorier
        </p>
      {/if}
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (showCategoriesDialog = false)}
        >Stäng</Button
      >
      <Button onclick={() => (showAddCategoryDialog = true)}>
        <Plus class="h-4 w-4 mr-2" />
        Ny kategori
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Add category dialog -->
<Dialog.Root bind:open={showAddCategoryDialog}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Ny kategori</Dialog.Title>
    </Dialog.Header>
    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="new-category-name">Namn</Label>
        <Input
          id="new-category-name"
          bind:value={newCategoryName}
          placeholder="T.ex. Mejeri"
          onkeydown={(e) =>
            e.key === "Enter" &&
            newCategoryName.trim() &&
            handleCreateCategory()}
        />
      </div>
      {#if categoryError}
        <p class="text-sm text-destructive">{categoryError}</p>
      {/if}
    </div>
    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => {
          showAddCategoryDialog = false;
          newCategoryName = "";
          categoryError = null;
        }}>Avbryt</Button
      >
      <Button onclick={handleCreateCategory} disabled={!newCategoryName.trim()}
        >Lägg till</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Edit category dialog -->
<Dialog.Root bind:open={showEditCategoryDialog}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Redigera kategori</Dialog.Title>
    </Dialog.Header>
    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="edit-category-name">Namn</Label>
        <Input
          id="edit-category-name"
          bind:value={editCategoryName}
          onkeydown={(e) =>
            e.key === "Enter" &&
            editCategoryName.trim() &&
            handleEditCategory()}
        />
      </div>
      {#if categoryError}
        <p class="text-sm text-destructive">{categoryError}</p>
      {/if}
    </div>
    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => {
          showEditCategoryDialog = false;
          selectedCategory = null;
          categoryError = null;
        }}>Avbryt</Button
      >
      <Button onclick={handleEditCategory} disabled={!editCategoryName.trim()}
        >Spara</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete category dialog -->
<AlertDialog.Root bind:open={showDeleteCategoryDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Ta bort kategori?</AlertDialog.Title>
      <AlertDialog.Description>
        Är du säker på att du vill ta bort kategorin "{selectedCategory?.name}"?
        Kategorin kan bara tas bort om den inte innehåller några produkter.
      </AlertDialog.Description>
    </AlertDialog.Header>
    {#if categoryError}
      <p class="text-sm text-destructive">{categoryError}</p>
    {/if}
    <AlertDialog.Footer>
      <AlertDialog.Cancel
        onclick={() => {
          showDeleteCategoryDialog = false;
          selectedCategory = null;
          categoryError = null;
        }}
      >
        Avbryt
      </AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onclick={handleDeleteCategory}
      >
        Ta bort
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
