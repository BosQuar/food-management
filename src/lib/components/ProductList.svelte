<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import {
    Plus,
    Pencil,
    Trash2,
    ChevronDown,
    ChevronRight,
    Check,
    ShoppingCart,
    X,
    ChevronsUpDown,
    StickyNote,
  } from "@lucide/svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Textarea } from "$lib/components/ui/textarea";
  import type { ProductCategory, Product, ShoppingItem } from "$lib/api";
  import { uiStore } from "$lib/stores/ui.svelte";

  interface Props {
    categories: ProductCategory[];
    searchQuery: string;
    editMode: boolean;
    shoppingItems: ShoppingItem[];
    onAddToList: (
      product: Product,
      quantity: number | null,
      unit: string,
    ) => void;
    onRemoveFromList: (shoppingItemId: number) => void;
    onUpdateNotes: (shoppingItemId: number, notes: string | null) => void;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
  }

  let {
    categories,
    searchQuery,
    editMode,
    shoppingItems,
    onAddToList,
    onRemoveFromList,
    onUpdateNotes,
    onEdit,
    onDelete,
  }: Props = $props();

  // Check if product is in shopping list (not done)
  function getShoppingItem(productId: number): ShoppingItem | undefined {
    return shoppingItems.find(
      (item) => item.product_id === productId && !item.is_done,
    );
  }

  // Use store for collapsed categories (persists across route changes)
  const collapsedCategories = $derived(uiStore.productCollapsed);

  // Track quantity input per product
  let quantities = $state<Record<number, string>>({});

  // Track recently added products for visual feedback
  let recentlyAdded = $state<Set<number>>(new Set());

  // Track pending misc product to open notes dialog after adding
  let pendingMiscNotes = $state<{
    productId: number;
    productName: string;
  } | null>(null);

  // Watch for misc product being added to open notes dialog
  $effect(() => {
    if (pendingMiscNotes) {
      const shoppingItem = getShoppingItem(pendingMiscNotes.productId);
      if (shoppingItem) {
        openNotesDialog(shoppingItem, pendingMiscNotes.productName);
        pendingMiscNotes = null;
      }
    }
  });

  // Remove confirmation dialog
  let showRemoveDialog = $state(false);
  let pendingRemove = $state<{
    shoppingItemId: number;
    productName: string;
  } | null>(null);

  function confirmRemove(shoppingItem: ShoppingItem, productName: string) {
    pendingRemove = { shoppingItemId: shoppingItem.id, productName };
    showRemoveDialog = true;
  }

  function handleRemoveConfirm() {
    if (pendingRemove) {
      onRemoveFromList(pendingRemove.shoppingItemId);
    }
    showRemoveDialog = false;
    pendingRemove = null;
  }

  // Notes dialog
  let showNotesDialog = $state(false);
  let editingNotes = $state<{
    shoppingItemId: number;
    productName: string;
    notes: string;
  } | null>(null);

  function openNotesDialog(shoppingItem: ShoppingItem, productName: string) {
    editingNotes = {
      shoppingItemId: shoppingItem.id,
      productName,
      notes: shoppingItem.notes || "",
    };
    showNotesDialog = true;
  }

  function handleSaveNotes() {
    if (editingNotes) {
      const notes = editingNotes.notes.trim() || null;
      onUpdateNotes(editingNotes.shoppingItemId, notes);
    }
    showNotesDialog = false;
    editingNotes = null;
  }

  function handleClearNotes() {
    if (editingNotes) {
      onUpdateNotes(editingNotes.shoppingItemId, null);
    }
    showNotesDialog = false;
    editingNotes = null;
  }

  function toggleCategory(categoryId: number) {
    uiStore.toggleProductCategory(categoryId);
  }

  function toggleAllCategories() {
    const allCategoryIds = categories.map((c) => c.id);
    if (collapsedCategories.size === allCategoryIds.length) {
      // All collapsed, expand all
      uiStore.setProductCollapsed(new Set());
    } else {
      // Collapse all
      uiStore.setProductCollapsed(new Set(allCategoryIds));
    }
  }

  const allCollapsed = $derived(
    collapsedCategories.size === categories.length && categories.length > 0,
  );

  function handleAdd(product: Product) {
    // For misc products already in list, just open notes dialog
    if (product.is_misc) {
      const existingItem = getShoppingItem(product.id);
      if (existingItem) {
        openNotesDialog(existingItem, product.name);
        return;
      }
    }

    const qtyValue = quantities[product.id];
    // Handle both string and number values from input
    const qty =
      qtyValue !== undefined && qtyValue !== "" && qtyValue !== null
        ? parseFloat(String(qtyValue))
        : null;
    onAddToList(product, qty, product.default_unit);
    // Clear the quantity input after adding
    quantities[product.id] = "";

    // For misc products, set pending to open notes dialog after added
    if (product.is_misc) {
      pendingMiscNotes = { productId: product.id, productName: product.name };
    }

    // Show visual feedback
    recentlyAdded.add(product.id);
    recentlyAdded = new Set(recentlyAdded);
    setTimeout(() => {
      recentlyAdded.delete(product.id);
      recentlyAdded = new Set(recentlyAdded);
    }, 1000);
  }

  // Sort products: is_misc last, then alphabetically
  function sortProducts(products: Product[]) {
    return [...products].sort((a, b) => {
      if (a.is_misc && !b.is_misc) return 1;
      if (!a.is_misc && b.is_misc) return -1;
      return a.name.localeCompare(b.name, "sv");
    });
  }

  const filteredCategories = $derived(() => {
    const sorted = categories.map((cat) => ({
      ...cat,
      products: sortProducts(cat.products),
    }));

    if (!searchQuery.trim()) return sorted;

    const query = searchQuery.toLowerCase();
    return sorted
      .map((cat) => ({
        ...cat,
        products: cat.products.filter((p) =>
          p.name.toLowerCase().includes(query),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  });
</script>

{#if filteredCategories().length === 0}
  <div class="py-12 text-center">
    <p class="text-muted-foreground">
      {#if searchQuery}
        Inga produkter matchar "{searchQuery}"
      {:else}
        Inga produkter
      {/if}
    </p>
  </div>
{:else}
  <div class="space-y-4">
    <div class="flex justify-end">
      <Button variant="ghost" size="sm" onclick={toggleAllCategories}>
        <ChevronsUpDown class="h-4 w-4 mr-1" />
        {allCollapsed ? "Expandera alla" : "Minimera alla"}
      </Button>
    </div>
    {#each filteredCategories() as category}
      <Card>
        <CardHeader
          class="py-3 cursor-pointer select-none"
          onclick={() => toggleCategory(category.id)}
        >
          <CardTitle
            class="text-sm font-medium text-muted-foreground flex items-center gap-2"
          >
            {#if collapsedCategories.has(category.id)}
              <ChevronRight class="h-4 w-4" />
            {:else}
              <ChevronDown class="h-4 w-4" />
            {/if}
            {category.name}
            <span class="text-xs">({category.products.length})</span>
          </CardTitle>
        </CardHeader>
        {#if !collapsedCategories.has(category.id)}
          <CardContent class="pt-0 pb-2">
            <div class="divide-y">
              {#each category.products as product (product.id)}
                {@const inList = getShoppingItem(product.id)}
                <div
                  class="flex items-center gap-2 py-2 hover:bg-accent/50 rounded-md px-1 -mx-1 transition-colors group"
                >
                  {#if !editMode}
                    <button
                      type="button"
                      class="flex-1 min-w-0 text-left cursor-pointer"
                      onclick={() => handleAdd(product)}
                    >
                      <div class="flex items-center gap-1.5">
                        <p
                          class="text-sm font-medium truncate group-hover:font-semibold {inList
                            ? 'text-green-600'
                            : ''}"
                        >
                          {product.name}
                        </p>
                        {#if inList}
                          <ShoppingCart
                            class="h-3.5 w-3.5 text-green-600 shrink-0"
                          />
                          {#if inList.quantity !== null}
                            <span class="text-xs text-green-600"
                              >({inList.quantity})</span
                            >
                          {/if}
                        {/if}
                      </div>
                      <p class="text-xs text-muted-foreground">
                        {product.default_unit}
                      </p>
                    </button>
                  {:else}
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5">
                        <p
                          class="text-sm font-medium truncate group-hover:font-semibold {inList
                            ? 'text-green-600'
                            : ''}"
                        >
                          {product.name}
                        </p>
                        {#if inList}
                          <ShoppingCart
                            class="h-3.5 w-3.5 text-green-600 shrink-0"
                          />
                          {#if inList.quantity !== null}
                            <span class="text-xs text-green-600"
                              >({inList.quantity})</span
                            >
                          {/if}
                        {/if}
                      </div>
                      <p class="text-xs text-muted-foreground">
                        {product.default_unit}
                      </p>
                    </div>
                  {/if}

                  {#if editMode}
                    <!-- Edit mode: show edit/delete buttons -->
                    {#if !product.is_misc}
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 shrink-0"
                        onclick={() => onEdit(product)}
                      >
                        <Pencil class="h-4 w-4" />
                      </Button>
                    {/if}
                    {#if !product.is_misc}
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onclick={() => onDelete(product)}
                      >
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    {/if}
                  {:else}
                    <!-- Add mode: show notes, quantity input and add button -->
                    {#if inList}
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 shrink-0 {inList.notes
                          ? 'text-green-600'
                          : 'text-muted-foreground/50 hover:text-muted-foreground'}"
                        onclick={() => openNotesDialog(inList, product.name)}
                      >
                        <StickyNote class="h-4 w-4" />
                      </Button>
                    {/if}

                    {#if !product.is_misc}
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        placeholder=""
                        class="w-16 h-8 text-sm text-center"
                        bind:value={quantities[product.id]}
                        onkeydown={(e) =>
                          e.key === "Enter" && handleAdd(product)}
                      />
                    {/if}

                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 shrink-0 transition-colors {recentlyAdded.has(
                        product.id,
                      )
                        ? 'text-green-600'
                        : 'text-primary hover:text-primary hover:bg-primary/10'}"
                      onclick={() => handleAdd(product)}
                      disabled={recentlyAdded.has(product.id)}
                    >
                      {#if recentlyAdded.has(product.id)}
                        <Check class="h-4 w-4" />
                      {:else}
                        <Plus class="h-4 w-4" />
                      {/if}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 shrink-0 transition-colors {inList
                        ? 'text-red-600 hover:text-red-700 hover:bg-red-600/10'
                        : 'text-muted-foreground/30'}"
                      onclick={() =>
                        inList && confirmRemove(inList, product.name)}
                      disabled={!inList}
                    >
                      <X class="h-4 w-4" />
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>
          </CardContent>
        {/if}
      </Card>
    {/each}
  </div>
{/if}

<!-- Remove from shopping list confirmation dialog -->
<AlertDialog.Root bind:open={showRemoveDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Ta bort från inköpslistan?</AlertDialog.Title>
      <AlertDialog.Description>
        Vill du ta bort "{pendingRemove?.productName}" från inköpslistan?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel
        onclick={() => {
          showRemoveDialog = false;
          pendingRemove = null;
        }}
      >
        Avbryt
      </AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-red-600 hover:bg-red-700"
        onclick={handleRemoveConfirm}
      >
        Ta bort
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Notes dialog -->
<Dialog.Root bind:open={showNotesDialog}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title>Anteckning</Dialog.Title>
      <Dialog.Description>{editingNotes?.productName}</Dialog.Description>
    </Dialog.Header>
    {#if editingNotes}
      <div class="py-4">
        <Textarea
          placeholder="T.ex. Dove original..."
          class="resize-none"
          rows={3}
          bind:value={editingNotes.notes}
          onkeydown={(e) =>
            e.key === "Enter" &&
            !e.shiftKey &&
            (e.preventDefault(), handleSaveNotes())}
        />
      </div>
    {/if}
    <Dialog.Footer class="flex-col sm:flex-row gap-2">
      <Button
        variant="ghost"
        class="text-destructive hover:text-destructive sm:mr-auto"
        onclick={handleClearNotes}
      >
        Rensa
      </Button>
      <Button
        variant="outline"
        onclick={() => {
          showNotesDialog = false;
          editingNotes = null;
        }}
      >
        Avbryt
      </Button>
      <Button onclick={handleSaveNotes}>Spara</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
