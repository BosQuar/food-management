<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from '@lucide/svelte';
	import type { ProductCategory, Product } from '$lib/api';

	interface Props {
		categories: ProductCategory[];
		searchQuery: string;
		editMode: boolean;
		onAddToList: (product: Product, quantity: number | null, unit: string) => void;
		onEdit: (product: Product) => void;
		onDelete: (product: Product) => void;
	}

	let { categories, searchQuery, editMode, onAddToList, onEdit, onDelete }: Props = $props();

	// Track collapsed categories by ID
	let collapsedCategories = $state<Set<number>>(new Set());

	// Track quantity input per product
	let quantities = $state<Record<number, string>>({});

	function toggleCategory(categoryId: number) {
		if (collapsedCategories.has(categoryId)) {
			collapsedCategories.delete(categoryId);
		} else {
			collapsedCategories.add(categoryId);
		}
		collapsedCategories = new Set(collapsedCategories);
	}

	function handleAdd(product: Product) {
		const qtyStr = quantities[product.id] || '';
		const qty = qtyStr.trim() ? parseFloat(qtyStr) : null;
		onAddToList(product, qty, product.default_unit);
		// Clear the quantity input after adding
		quantities[product.id] = '';
	}

	const filteredCategories = $derived(() => {
		if (!searchQuery.trim()) return categories;

		const query = searchQuery.toLowerCase();
		return categories
			.map((cat) => ({
				...cat,
				products: cat.products.filter((p) =>
					p.name.toLowerCase().includes(query)
				)
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
		{#each filteredCategories() as category}
			<Card>
				<CardHeader class="py-3 cursor-pointer select-none" onclick={() => toggleCategory(category.id)}>
					<CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2">
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
								<div class="flex items-center gap-2 py-2">
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium truncate">{product.name}</p>
										<p class="text-xs text-muted-foreground">{product.default_unit}</p>
									</div>

									{#if editMode}
										<!-- Edit mode: show edit/delete buttons -->
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 shrink-0"
											onclick={() => onEdit(product)}
										>
											<Pencil class="h-4 w-4" />
										</Button>

										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
											onclick={() => onDelete(product)}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									{:else}
										<!-- Add mode: show quantity input and add button -->
										<Input
											type="number"
											min="0.1"
											step="0.1"
											placeholder=""
											class="w-16 h-8 text-sm text-center"
											bind:value={quantities[product.id]}
											onkeydown={(e) => e.key === 'Enter' && handleAdd(product)}
										/>

										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
											onclick={() => handleAdd(product)}
										>
											<Plus class="h-4 w-4" />
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
