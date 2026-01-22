<script lang="ts">
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Popover from "$lib/components/ui/popover";
  import * as Command from "$lib/components/ui/command";

  interface Ingredient {
    product_id?: number;
    custom_name?: string;
    product_name?: string;
    amount?: number;
    unit?: string;
  }

  interface Props {
    value: string;
    ingredients: Ingredient[];
    onchange: (value: string) => void;
    placeholder?: string;
    rows?: number;
  }

  let {
    value,
    ingredients,
    onchange,
    placeholder = "",
    rows = 8,
  }: Props = $props();

  let textareaRef: HTMLTextAreaElement | null = $state(null);
  let showPopover = $state(false);
  let searchQuery = $state("");
  let atPosition = $state(0);
  let popoverX = $state(0);
  let popoverY = $state(0);

  // Get the display name for an ingredient
  function getIngredientName(ing: Ingredient): string {
    return ing.custom_name || ing.product_name || "";
  }

  // Filter ingredients based on search query
  const filteredIngredients = $derived(
    ingredients.filter((ing) => {
      const name = getIngredientName(ing);
      if (!name) return false;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    }),
  );

  function handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    const text = textarea.value;
    const pos = textarea.selectionStart;

    // Check if we're in the middle of an @-mention
    const textBefore = text.slice(0, pos);
    const atMatch = textBefore.match(/@([^\s\[\]@]*)$/);

    if (atMatch) {
      showPopover = true;
      searchQuery = atMatch[1];
      atPosition = pos - atMatch[0].length;

      // Calculate approximate position for popover
      if (textareaRef) {
        const rect = textareaRef.getBoundingClientRect();
        // Simple positioning - show below the textarea
        popoverX = rect.left;
        popoverY = rect.top + 30;
      }
    } else {
      showPopover = false;
      searchQuery = "";
    }

    onchange(text);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!showPopover) return;

    if (e.key === "Escape") {
      showPopover = false;
      e.preventDefault();
    } else if (e.key === "Enter" && filteredIngredients.length > 0) {
      e.preventDefault();
      selectIngredient(getIngredientName(filteredIngredients[0]));
    }
  }

  function selectIngredient(name: string) {
    if (!textareaRef) return;

    const cursorPos = textareaRef.selectionStart;
    const before = value.slice(0, atPosition);
    const after = value.slice(cursorPos);
    const newValue = before + `@[${name}]` + after;

    onchange(newValue);
    showPopover = false;
    searchQuery = "";

    // Restore focus and set cursor position after the inserted text
    setTimeout(() => {
      if (textareaRef) {
        textareaRef.focus();
        const newCursorPos = atPosition + name.length + 3; // @[ + name + ]
        textareaRef.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }

  function handleBlur() {
    // Delay hiding to allow clicking on popover items
    setTimeout(() => {
      showPopover = false;
    }, 200);
  }
</script>

<div class="relative">
  <Textarea
    bind:ref={textareaRef}
    {value}
    oninput={handleInput}
    onkeydown={handleKeyDown}
    onblur={handleBlur}
    {placeholder}
    {rows}
  />

  {#if showPopover && filteredIngredients.length > 0}
    <div
      class="absolute z-50 mt-1 w-64 rounded-md border bg-popover p-1 shadow-md"
    >
      <div class="text-xs text-muted-foreground px-2 py-1">Välj ingrediens</div>
      <Command.Root shouldFilter={false}>
        <Command.List class="max-h-40">
          {#each filteredIngredients as ingredient}
            {@const name = getIngredientName(ingredient)}
            <Command.Item
              value={name}
              onSelect={() => selectIngredient(name)}
              class="cursor-pointer"
            >
              <span>{name}</span>
              {#if ingredient.amount}
                <span class="ml-auto text-muted-foreground text-xs">
                  {ingredient.amount}
                  {ingredient.unit || ""}
                </span>
              {/if}
            </Command.Item>
          {/each}
        </Command.List>
      </Command.Root>
    </div>
  {/if}
</div>
