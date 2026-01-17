<script lang="ts">
	import { onMount } from 'svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { productsStore } from '$lib/stores/products.svelte';
	import { shoppingStore } from '$lib/stores/shopping.svelte';
	import ProductList from '$lib/components/ProductList.svelte';
	import { Plus, Search } from '@lucide/svelte';
	import type { Product } from '$lib/api';

	let searchQuery = $state('');
	let showAddDialog = $state(false);
	let showAddToListDialog = $state(false);
	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);

	let selectedProduct = $state<Product | null>(null);
	let quantity = $state(1);
	let unit = $state('st');

	let newProductName = $state('');
	let newProductUnit = $state('st');
	let newProductCategory = $state<string>('');

	let editProductName = $state('');
	let editProductUnit = $state('');
	let editProductCategory = $state<string>('');

	onMount(() => {
		productsStore.fetch();
	});

	function openAddToListDialog(product: Product) {
		selectedProduct = product;
		quantity = 1;
		unit = product.default_unit;
		showAddToListDialog = true;
	}

	async function handleAddToList() {
		if (selectedProduct) {
			await shoppingStore.add({
				product_id: selectedProduct.id,
				quantity,
				unit
			});
			showAddToListDialog = false;
			selectedProduct = null;
		}
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
			onAddToList={openAddToListDialog}
			onEdit={openEditDialog}
			onDelete={openDeleteDialog}
		/>
	{/if}
</div>

<!-- Add to list dialog -->
<Dialog.Root bind:open={showAddToListDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Lägg till på listan</Dialog.Title>
			<Dialog.Description>{selectedProduct?.name}</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="quantity">Antal</Label>
					<Input id="quantity" type="number" min="0.1" step="0.1" bind:value={quantity} />
				</div>
				<div class="space-y-2">
					<Label for="unit">Enhet</Label>
					<Input id="unit" bind:value={unit} />
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showAddToListDialog = false}>Avbryt</Button>
			<Button onclick={handleAddToList}>Lägg till</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

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
