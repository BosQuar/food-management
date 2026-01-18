<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Popover from "$lib/components/ui/popover";
  import { tagsStore } from "$lib/stores/tags.svelte";
  import { Tag, ChevronDown } from "@lucide/svelte";

  interface Props {
    selectedIds: number[];
    onchange: (ids: number[]) => void;
  }

  let { selectedIds, onchange }: Props = $props();

  function toggleTag(tagId: number) {
    if (selectedIds.includes(tagId)) {
      onchange(selectedIds.filter((id) => id !== tagId));
    } else {
      onchange([...selectedIds, tagId]);
    }
  }

  const selectedTags = $derived(
    tagsStore.tags.filter((t) => selectedIds.includes(t.id)),
  );
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button variant="outline" class="justify-between w-full" {...props}>
        <span class="flex items-center gap-2">
          <Tag class="h-4 w-4" />
          {#if selectedTags.length === 0}
            Välj taggar...
          {:else}
            {selectedTags.length} tagg{selectedTags.length > 1 ? "ar" : ""} vald{selectedTags.length >
            1
              ? "a"
              : ""}
          {/if}
        </span>
        <ChevronDown class="h-4 w-4" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-56 p-2">
    {#if tagsStore.tags.length === 0}
      <p class="text-sm text-muted-foreground text-center py-2">Inga taggar</p>
    {:else}
      <div class="space-y-1">
        {#each tagsStore.tags as tag (tag.id)}
          <label
            class="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
          >
            <Checkbox
              checked={selectedIds.includes(tag.id)}
              onCheckedChange={() => toggleTag(tag.id)}
            />
            <span class="text-sm">{tag.name}</span>
          </label>
        {/each}
      </div>
    {/if}
  </Popover.Content>
</Popover.Root>
