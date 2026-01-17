<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Trash2 } from '@lucide/svelte';
	import type { ShoppingItem } from '$lib/api';

	interface Props {
		item: ShoppingItem;
		onToggle: (id: number) => void;
		onDelete: (id: number) => void;
	}

	let { item, onToggle, onDelete }: Props = $props();

	const displayName = $derived(item.custom_name || item.product_name || 'Okänd vara');
	const isDone = $derived(Boolean(item.is_done));
</script>

<div class="flex items-center gap-3 py-2 {isDone ? 'opacity-50' : ''}">
	<Checkbox
		checked={isDone}
		onCheckedChange={() => onToggle(item.id)}
		class="h-5 w-5"
	/>

	<div class="flex-1 min-w-0">
		<p class="text-sm font-medium {isDone ? 'line-through text-muted-foreground' : ''}">
			{displayName}
		</p>
		{#if item.quantity !== null || item.notes}
			<p class="text-xs text-muted-foreground">
				{#if item.quantity !== null}
					{item.quantity} {item.unit}
				{/if}
				{#if item.notes}
					<span class="{item.quantity !== null ? 'ml-2' : ''} italic">({item.notes})</span>
				{/if}
			</p>
		{/if}
	</div>

	<Button
		variant="ghost"
		size="icon"
		class="h-8 w-8 text-muted-foreground hover:text-destructive"
		onclick={() => onDelete(item.id)}
	>
		<Trash2 class="h-4 w-4" />
	</Button>
</div>
