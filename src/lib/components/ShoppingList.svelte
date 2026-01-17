<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Dialog from "$lib/components/ui/dialog";
  import { ChevronDown, ChevronRight, ChevronsUpDown } from "@lucide/svelte";
  import ShoppingItem from "./ShoppingItem.svelte";
  import type { ShoppingItem as ShoppingItemType } from "$lib/api";
  import { uiStore } from "$lib/stores/ui.svelte";

  interface Props {
    groupedItems: [string, ShoppingItemType[]][];
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    onUpdateNotes: (id: number, notes: string | null) => void;
  }

  let { groupedItems, onToggle, onDelete, onUpdateNotes }: Props = $props();

  // Use store for collapsed categories (persists across route changes)
  const collapsedCategories = $derived(uiStore.shoppingCollapsed);

  // Notes dialog
  let showNotesDialog = $state(false);
  let editingNotes = $state<{
    shoppingItemId: number;
    itemName: string;
    notes: string;
  } | null>(null);

  function openNotesDialog(item: ShoppingItemType) {
    const itemName = item.custom_name || item.product_name || "Okänd vara";
    editingNotes = {
      shoppingItemId: item.id,
      itemName,
      notes: item.notes || "",
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

  function toggleCategory(categoryName: string) {
    uiStore.toggleShoppingCategory(categoryName);
  }

  function toggleAllCategories() {
    const allCategoryNames = groupedItems.map(([name]) => name);
    if (collapsedCategories.size === allCategoryNames.length) {
      // All collapsed, expand all
      uiStore.setShoppingCollapsed(new Set());
    } else {
      // Collapse all
      uiStore.setShoppingCollapsed(new Set(allCategoryNames));
    }
  }

  const allCollapsed = $derived(
    collapsedCategories.size === groupedItems.length && groupedItems.length > 0,
  );
</script>

{#if groupedItems.length === 0}
  <div class="py-12 text-center">
    <p class="text-muted-foreground">Inköpslistan är tom</p>
    <p class="text-sm text-muted-foreground mt-1">
      Lägg till varor från produktkatalogen
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
    {#each groupedItems as [categoryName, items]}
      <Card>
        <CardHeader
          class="py-3 cursor-pointer select-none"
          onclick={() => toggleCategory(categoryName)}
        >
          <CardTitle
            class="text-sm font-medium text-muted-foreground flex items-center gap-2"
          >
            {#if collapsedCategories.has(categoryName)}
              <ChevronRight class="h-4 w-4" />
            {:else}
              <ChevronDown class="h-4 w-4" />
            {/if}
            {categoryName}
            <span class="text-xs">({items.length})</span>
          </CardTitle>
        </CardHeader>
        {#if !collapsedCategories.has(categoryName)}
          <CardContent class="pt-0 pb-2">
            <div class="divide-y">
              {#each items as item (item.id)}
                <ShoppingItem
                  {item}
                  {onToggle}
                  {onDelete}
                  onEditNotes={openNotesDialog}
                />
              {/each}
            </div>
          </CardContent>
        {/if}
      </Card>
    {/each}
  </div>
{/if}

<!-- Notes dialog -->
<Dialog.Root bind:open={showNotesDialog}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title>Anteckning</Dialog.Title>
      <Dialog.Description>{editingNotes?.itemName}</Dialog.Description>
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
