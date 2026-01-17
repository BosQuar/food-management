<script lang="ts">
	import { onMount } from 'svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Select from '$lib/components/ui/select';
	import { productsStore } from '$lib/stores/products.svelte';
	import { shoppingStore } from '$lib/stores/shopping.svelte';
	import ProductList from '$lib/components/ProductList.svelte';
	import { Plus, Search, Settings } from '@lucide/svelte';
	import type { Product } from '$lib/api';

	let searchQuery = $state('');
	let editMode = $state(false);
	let showAddDialog = $state(false);
	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let showOverwriteDialog = $state(false);

	let selectedProduct = $state<Product | null>(null);
	let pendingAdd = $state<{ product: Product; quantity: number | null; unit: string } | null>(null);

	let newProductName = $state('');
	let newProductUnit = $state('st');
	let newProductCategory = $state<string>('');

	let editProductName = $state('');
	let editProductUnit = $state('');
	let editProductCategory = $state<string>('');

	onMount(() => {
		productsStore.fetch();
		shoppingStore.fetch();
	});

	async function handleAddToList(product: Product, quantity: number | null, unit: string) {
		// Check if product already exists in shopping list
		const existing = shoppingStore.items.find(
			item => item.product_id === product.id && !item.is_done
		);

		if (existing) {
			// Product exists
			if (quantity === null && existing.quantity !== null) {
				// Trying to add without quantity when item has quantity - show warning
				pendingAdd = { product, quantity, unit };
				showOverwriteDialog = true;
				return;
			} else if (quantity === null && existing.quantity === null) {
				// Both without quantity - do nothing (already in list)
				return;
			}
			// Has quantity - will be handled by backend (add to existing)
		}

		await doAddToList(product, quantity, unit);
	}

	async function doAddToList(product: Product, quantity: number | null, unit: string) {
		await shoppingStore.add({
			product_id: product.id,
			quantity,
			unit
		});
	}

	async function handleOverwriteConfirm() {
		if (pendingAdd) {
			// User wants to overwrite - set quantity to null
			const existing = shoppingStore.items.find(
				item => item.product_id === pendingAdd.product.id && !item.is_done
			);
			if (existing) {
				await shoppingStore.update(existing.id, { quantity: null, unit: null });
			}
		}
		showOverwriteDialog = false;
		pendingAdd = null;
	}

	function openEditDialog(product: Product) {
		selectedProduct = product;
		editProductName = product.name;
		editProductUnit = product.default_unit;
		editProductCategory = product.store_category_id?.toString() || '';
		showEditDialog = true;
	}

	async function handleEditProduct() {
		if (selectedProduct) {
			await productsStore.update(selectedProduct.id, {
				name: editProductName,
				default_unit: editProductUnit,
				store_category_id: editProductCategory ? parseInt(editProductCategory) : null
			});
			showEditDialog = false;
			selectedProduct = null;
		}
	}

	function openDeleteDialog(product: Product) {
		selectedProduct = product;
		showDeleteDialog = true;
	}

	async function handleDeleteProduct() {
		if (selectedProduct) {
			await productsStore.delete(selectedProduct.id);
			showDeleteDialog = false;
			selectedProduct = null;
		}
	}

	async function handleCreateProduct() {
		await productsStore.create({
			name: newProductName,
			default_unit: newProductUnit,
			store_category_id: newProductCategory ? parseInt(newProductCategory) : undefined
		});
		showAddDialog = false;
		newProductName = '';
		newProductUnit = 'st';
		newProductCategory = '';
	}

	const categories = $derived(productsStore.categories.map(c => ({ value: c.id.toString(), label: c.name })));
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Produkter</h1>

		<div class="flex gap-2">
			<Button
				variant={editMode ? "default" : "outline"}
				size="sm"
				onclick={() => editMode = !editMode}
			>
				<Settings class="h-4 w-4 mr-2" />
				{editMode ? 'Klar' : 'Redigera'}
			</Button>

			{#if editMode}
				<Dialog.Root bind:open={showAddDialog}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button size="sm" {...props}>
								<Plus class="h-4 w-4 mr-2" />
								Ny produkt
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Lägg till produkt</Dialog.Title>
						</Dialog.Header>
						<div class="space-y-4 py-4">
							<div class="space-y-2">
								<Label for="name">Namn</Label>
								<Input id="name" bind:value={newProductName} placeholder="T.ex. Mjölk" />
							</div>
							<div class="space-y-2">
								<Label for="unit">Standardenhet</Label>
								<Input id="unit" bind:value={newProductUnit} placeholder="st, kg, l..." />
							</div>
							<div class="space-y-2">
								<Label>Kategori</Label>
								<Select.Root type="single" bind:value={newProductCategory}>
									<Select.Trigger class="w-full">
										{categories.find(c => c.value === newProductCategory)?.label || 'Välj kategori'}
									</Select.Trigger>
									<Select.Content>
										{#each categories as cat}
											<Select.Item value={cat.value}>{cat.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => showAddDialog = false}>Avbryt</Button>
							<Button onclick={handleCreateProduct} disabled={!newProductName.trim()}>Lägg till</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			{/if}
		</div>
	</div>

	<div class="relative">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
		<Input
			bind:value={searchQuery}
			placeholder="Sök produkter..."
			class="pl-9"
		/>
	</div>

	{#if productsStore.loading}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">Laddar...</p>
		</div>
	{:else if productsStore.error}
		<div class="py-12 text-center">
			<p class="text-destructive">{productsStore.error}</p>
			<Button variant="outline" size="sm" class="mt-2" onclick={() => productsStore.fetch()}>
				Försök igen
			</Button>
		</div>
	{:else}
		<ProductList
			categories={productsStore.categories}
			{searchQuery}
			{editMode}
			shoppingItems={shoppingStore.items}
			onAddToList={handleAddToList}
			onEdit={openEditDialog}
			onDelete={openDeleteDialog}
		/>
	{/if}
</div>

<!-- Overwrite quantity warning dialog -->
<AlertDialog.Root bind:open={showOverwriteDialog}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Skriv över kvantitet?</AlertDialog.Title>
			<AlertDialog.Description>
				"{pendingAdd?.product.name}" finns redan på listan med en kvantitet. Vill du ta bort kvantiteten?
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => { showOverwriteDialog = false; pendingAdd = null; }}>
				Avbryt
			</AlertDialog.Cancel>
			<AlertDialog.Action onclick={handleOverwriteConfirm}>
				Ta bort kvantitet
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Edit dialog -->
<Dialog.Root bind:open={showEditDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Redigera produkt</Dialog.Title>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="edit-name">Namn</Label>
				<Input id="edit-name" bind:value={editProductName} />
			</div>
			<div class="space-y-2">
				<Label for="edit-unit">Standardenhet</Label>
				<Input id="edit-unit" bind:value={editProductUnit} />
			</div>
			<div class="space-y-2">
				<Label>Kategori</Label>
				<Select.Root type="single" bind:value={editProductCategory}>
					<Select.Trigger class="w-full">
						{categories.find(c => c.value === editProductCategory)?.label || 'Välj kategori'}
					</Select.Trigger>
					<Select.Content>
						{#each categories as cat}
							<Select.Item value={cat.value}>{cat.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showEditDialog = false}>Avbryt</Button>
			<Button onclick={handleEditProduct}>Spara</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete dialog -->
<Dialog.Root bind:open={showDeleteDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Ta bort produkt?</Dialog.Title>
			<Dialog.Description>
				Är du säker på att du vill ta bort "{selectedProduct?.name}"? Åtgärden kan inte ångras.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showDeleteDialog = false}>Avbryt</Button>
			<Button variant="destructive" onclick={handleDeleteProduct}>Ta bort</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
