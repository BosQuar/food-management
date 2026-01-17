<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import ShoppingItem from './ShoppingItem.svelte';
	import type { ShoppingItem as ShoppingItemType } from '$lib/api';

	interface Props {
		groupedItems: [string, ShoppingItemType[]][];
		onToggle: (id: number) => void;
		onDelete: (id: number) => void;
	}

	let { groupedItems, onToggle, onDelete }: Props = $props();
</script>

{#if groupedItems.length === 0}
	<div class="py-12 text-center">
		<p class="text-muted-foreground">Inköpslistan är tom</p>
		<p class="text-sm text-muted-foreground mt-1">Lägg till varor från produktkatalogen</p>
	</div>
{:else}
	<div class="space-y-4">
		{#each groupedItems as [categoryName, items]}
			<Card>
				<CardHeader class="py-3">
					<CardTitle class="text-sm font-medium text-muted-foreground">
						{categoryName}
					</CardTitle>
				</CardHeader>
				<CardContent class="pt-0 pb-2">
					<div class="divide-y">
						{#each items as item (item.id)}
							<ShoppingItem {item} {onToggle} {onDelete} />
						{/each}
					</div>
				</CardContent>
			</Card>
		{/each}
	</div>
{/if}
