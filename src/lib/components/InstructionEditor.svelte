<script lang="ts">
  import { Textarea } from "$lib/components/ui/textarea";

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
  let containerRef: HTMLDivElement | null = $state(null);
  let showPopover = $state(false);
  let searchQuery = $state("");
  let atPosition = $state(0);
  let dropdownTop = $state(0);
  let dropdownLeft = $state(0);
  let selectedIndex = $state(0);
  let listRef: HTMLDivElement | null = $state(null);

  const DROPDOWN_WIDTH = 256; // w-64 = 16rem = 256px
  const DROPDOWN_HEIGHT = 200; // approximate max height

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

  // Calculate cursor position in textarea using a mirror element
  function getCursorPosition(textarea: HTMLTextAreaElement, cursorPos: number) {
    const text = textarea.value.substring(0, cursorPos);
    const lines = text.split("\n");
    const currentLine = lines.length - 1;
    const lastLineText = lines[lines.length - 1];

    // Get computed styles
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;

    // Create a hidden span to measure text width
    const mirror = document.createElement("span");
    mirror.style.font = style.font;
    mirror.style.fontSize = style.fontSize;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontWeight = style.fontWeight;
    mirror.style.letterSpacing = style.letterSpacing;
    mirror.style.visibility = "hidden";
    mirror.style.position = "absolute";
    mirror.style.whiteSpace = "pre";
    mirror.textContent = lastLineText;
    document.body.appendChild(mirror);
    const textWidth = mirror.offsetWidth;
    document.body.removeChild(mirror);

    const top = paddingTop + currentLine * lineHeight - textarea.scrollTop;
    const left = paddingLeft + textWidth;

    return { top: top + lineHeight + 4, left };
  }

  function handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    const text = textarea.value;
    const pos = textarea.selectionStart;

    // Save scroll positions to prevent jump
    const savedScrollY = window.scrollY;
    const savedTextareaScroll = textarea.scrollTop;

    // Check if we're in the middle of an @-mention
    const textBefore = text.slice(0, pos);
    const atMatch = textBefore.match(/@([^\s\[\]@]*)$/);

    if (atMatch) {
      showPopover = true;
      searchQuery = atMatch[1];
      atPosition = pos - atMatch[0].length;
      selectedIndex = 0; // Reset selection when search changes

      // Calculate position for dropdown using fixed positioning (viewport-relative)
      const cursorCoords = getCursorPosition(textarea, pos);
      const textareaRect = textarea.getBoundingClientRect();

      // Calculate position in viewport
      const viewportTop = textareaRect.top + cursorCoords.top;
      const viewportLeft = textareaRect.left + cursorCoords.left;

      // Check if dropdown would overflow below viewport
      const spaceBelow = window.innerHeight - viewportTop;

      if (spaceBelow < DROPDOWN_HEIGHT && viewportTop > DROPDOWN_HEIGHT) {
        // Show above cursor
        const style = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(style.lineHeight) || 20;
        dropdownTop = viewportTop - DROPDOWN_HEIGHT - lineHeight;
      } else {
        dropdownTop = viewportTop;
      }

      // Clamp left position so dropdown doesn't overflow viewport
      const maxLeft = window.innerWidth - DROPDOWN_WIDTH - 16;
      dropdownLeft = Math.max(8, Math.min(viewportLeft, maxLeft));

      // Restore scroll position after DOM updates
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY);
        textarea.scrollTop = savedTextareaScroll;
      });
    } else {
      showPopover = false;
      searchQuery = "";
      selectedIndex = 0;
    }

    onchange(text);
  }

  function scrollSelectedIntoView() {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      if (listRef) {
        const selected = listRef.children[selectedIndex] as HTMLElement;
        if (selected) {
          // Manual scroll to avoid page jump - only scroll within the list container
          const listTop = listRef.scrollTop;
          const listBottom = listTop + listRef.clientHeight;
          const itemTop = selected.offsetTop;
          const itemBottom = itemTop + selected.offsetHeight;

          if (itemTop < listTop) {
            listRef.scrollTop = itemTop;
          } else if (itemBottom > listBottom) {
            listRef.scrollTop = itemBottom - listRef.clientHeight;
          }
        }
      }
    }, 0);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!showPopover || filteredIngredients.length === 0) return;

    if (e.key === "Escape") {
      showPopover = false;
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredIngredients.length;
      scrollSelectedIntoView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex =
        selectedIndex <= 0 ? filteredIngredients.length - 1 : selectedIndex - 1;
      scrollSelectedIntoView();
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectIngredient(getIngredientName(filteredIngredients[selectedIndex]));
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

<div class="relative" bind:this={containerRef}>
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
      class="fixed z-50 w-64 rounded-md border bg-popover p-1 shadow-lg"
      style="top: {dropdownTop}px; left: {dropdownLeft}px;"
    >
      <div class="text-xs text-muted-foreground px-2 py-1">Välj ingrediens</div>
      <div class="max-h-40 overflow-y-auto" bind:this={listRef}>
        {#each filteredIngredients as ingredient, index}
          {@const name = getIngredientName(ingredient)}
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent {index ===
            selectedIndex
              ? 'bg-accent'
              : ''}"
            onmousedown={(e) => {
              e.preventDefault();
              selectIngredient(name);
            }}
            onmouseenter={() => (selectedIndex = index)}
          >
            <span>{name}</span>
            {#if ingredient.amount}
              <span class="text-muted-foreground text-xs">
                {ingredient.amount}
                {ingredient.unit || ""}
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
