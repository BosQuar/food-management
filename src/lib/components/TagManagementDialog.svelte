<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { tagsStore } from "$lib/stores/tags.svelte";
  import { Plus, Pencil, Trash2, Check, X } from "@lucide/svelte";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open, onOpenChange }: Props = $props();

  let newTagName = $state("");
  let editingId = $state<number | null>(null);
  let editingName = $state("");
  let deleteConfirmId = $state<number | null>(null);

  async function handleCreate() {
    if (!newTagName.trim()) return;
    await tagsStore.create(newTagName.trim());
    newTagName = "";
  }

  function startEdit(id: number, name: string) {
    editingId = id;
    editingName = name;
  }

  function cancelEdit() {
    editingId = null;
    editingName = "";
  }

  async function handleSaveEdit() {
    if (editingId && editingName.trim()) {
      await tagsStore.update(editingId, editingName.trim());
    }
    editingId = null;
    editingName = "";
  }

  async function handleDelete() {
    if (deleteConfirmId) {
      await tagsStore.delete(deleteConfirmId);
    }
    deleteConfirmId = null;
  }
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Hantera taggar</Dialog.Title>
      <Dialog.Description
        >Skapa, redigera eller ta bort taggar</Dialog.Description
      >
    </Dialog.Header>

    <!-- Add new tag -->
    <div class="flex gap-2 py-4">
      <Input
        bind:value={newTagName}
        placeholder="Ny tagg..."
        onkeydown={(e) => e.key === "Enter" && handleCreate()}
      />
      <Button
        variant="outline"
        size="icon"
        onclick={handleCreate}
        disabled={!newTagName.trim()}
      >
        <Plus class="h-4 w-4" />
      </Button>
    </div>

    <!-- Tag list -->
    <div class="max-h-60 overflow-y-auto space-y-2">
      {#each tagsStore.tags as tag (tag.id)}
        <div class="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
          {#if editingId === tag.id}
            <Input
              bind:value={editingName}
              class="flex-1 h-8"
              onkeydown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              onclick={handleSaveEdit}
            >
              <Check class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              onclick={cancelEdit}
            >
              <X class="h-4 w-4" />
            </Button>
          {:else}
            <span class="flex-1 text-sm">{tag.name}</span>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              onclick={() => startEdit(tag.id, tag.name)}
            >
              <Pencil class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-destructive"
              onclick={() => (deleteConfirmId = tag.id)}
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          {/if}
        </div>
      {:else}
        <p class="text-sm text-muted-foreground text-center py-4">
          Inga taggar
        </p>
      {/each}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => onOpenChange(false)}
        >Stäng</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation -->
<AlertDialog.Root
  open={deleteConfirmId !== null}
  onOpenChange={() => (deleteConfirmId = null)}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Ta bort tagg?</AlertDialog.Title>
      <AlertDialog.Description>
        Taggen tas bort från alla recept. Recepten påverkas inte.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => (deleteConfirmId = null)}
        >Avbryt</AlertDialog.Cancel
      >
      <AlertDialog.Action onclick={handleDelete}>Ta bort</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
