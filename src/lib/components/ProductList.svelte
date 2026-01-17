<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Check, ShoppingCart } from '@lucide/svelte';
	import type { ProductCategory, Product, ShoppingItem } from '$lib/api';

	interface Props {
		categories: ProductCategory[];
		searchQuery: string;
		editMode: boolean;
		shoppingItems: ShoppingItem[];
		onAddToList: (product: Product, quantity: number | null, unit: string) => void;
		onEdit: (product: Product) => void;
		onDelete: (product: Product) => void;
	}

	let { categories, searchQuery, editMode, shoppingItems, onAddToList, onEdit, onDelete }: Props = $props();

	// Check if product is in shopping list (not done)
	function getShoppingItem(productId: number): ShoppingItem | undefined {
		return shoppingItems.find(item => item.product_id === productId && !item.is_done);
	}

	// Track collapsed categories by ID
	let collapsedCategories = $state<Set<number>>(new Set());

	// Track quantity input per product
	let quantities = $state<Record<number, string>>({});

	// Track recently added products for visual feedback
	let recentlyAdded = $state<Set<number>>(new Set());

	function toggleCategory(categoryId: number) {
		if (collapsedCategories.has(categoryId)) {
			collapsedCategories.delete(categoryId);
		} else {
			collapsedCategories.add(categoryId);
		}
		collapsedCategories = new Set(collapsedCategories);
	}

	function handleAdd(product: Product) {
		const qtyValue = quantities[product.id];
		// Handle both string and number values from input
		const qty = qtyValue !== undefined && qtyValue !== '' && qtyValue !== null
			? parseFloat(String(qtyValue))
			: null;
		onAddToList(product, qty, product.default_unit);
		// Clear the quantity input after adding
		quantities[product.id] = '';

		// Show visual feedback
		recentlyAdded.add(product.id);
		recentlyAdded = new Set(recentlyAdded);
		setTimeout(() => {
			recentlyAdded.delete(product.id);
			recentlyAdded = new Set(recentlyAdded);
		}, 1000);
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
								{@const inList = getShoppingItem(product.id)}
								<div class="flex items-center gap-2 py-2">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-1.5">
											<p class="text-sm font-medium truncate {inList ? 'text-green-600' : ''}">{product.name}</p>
											{#if inList}
												<ShoppingCart class="h-3.5 w-3.5 text-green-600 shrink-0" />
												{#if inList.quantity !== null}
													<span class="text-xs text-green-600">({inList.quantity})</span>
												{/if}
											{/if}
										</div>
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
											class="h-8 w-8 shrink-0 transition-colors {recentlyAdded.has(product.id) ? 'text-green-600' : 'text-primary hover:text-primary hover:bg-primary/10'}"
											onclick={() => handleAdd(product)}
											disabled={recentlyAdded.has(product.id)}
										>
											{#if recentlyAdded.has(product.id)}
												<Check class="h-4 w-4" />
											{:else}
												<Plus class="h-4 w-4" />
											{/if}
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
