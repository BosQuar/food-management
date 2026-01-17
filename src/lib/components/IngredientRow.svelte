<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Trash2 } from '@lucide/svelte';
	import type { Product } from '$lib/api';

	interface Ingredient {
		product_id?: number;
		custom_name?: string;
		amount?: number;
		unit?: string;
	}

	interface Props {
		ingredient: Ingredient;
		products: Product[];
		onchange: (ingredient: Ingredient) => void;
		onremove: () => void;
	}

	let { ingredient, products, onchange, onremove }: Props = $props();

	let useCustom = $state(!ingredient.product_id);
	let selectedProductId = $state(ingredient.product_id?.toString() || '');

	function handleProductChange(value: string) {
		selectedProductId = value;
		if (value) {
			const product = products.find(p => p.id === parseInt(value));
			onchange({
				...ingredient,
				product_id: parseInt(value),
				custom_name: undefined,
				unit: ingredient.unit || product?.default_unit || 'st'
			});
		}
	}

	function handleCustomNameChange(e: Event) {
		const target = e.target as HTMLInputElement;
		onchange({
			...ingredient,
			product_id: undefined,
			custom_name: target.value
		});
	}

	function handleAmountChange(e: Event) {
		const target = e.target as HTMLInputElement;
		onchange({
			...ingredient,
			amount: target.value ? parseFloat(target.value) : undefined
		});
	}

	function handleUnitChange(e: Event) {
		const target = e.target as HTMLInputElement;
		onchange({
			...ingredient,
			unit: target.value
		});
	}

	function toggleCustom() {
		useCustom = !useCustom;
		if (useCustom) {
			selectedProductId = '';
			onchange({
				...ingredient,
				product_id: undefined
			});
		} else {
			onchange({
				...ingredient,
				custom_name: undefined
			});
		}
	}
</script>

<div class="flex gap-2 items-start">
	<div class="flex-1 space-y-2">
		<div class="flex gap-2">
			{#if useCustom}
				<Input
					value={ingredient.custom_name || ''}
					oninput={handleCustomNameChange}
					placeholder="Ingrediens"
					class="flex-1"
				/>
			{:else}
				<Select.Root type="single" value={selectedProductId} onValueChange={handleProductChange}>
					<Select.Trigger class="flex-1">
						{products.find(p => p.id.toString() === selectedProductId)?.name || 'Välj produkt'}
					</Select.Trigger>
					<Select.Content class="max-h-60">
						{#each products as product}
							<Select.Item value={product.id.toString()}>{product.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/if}

			<Button variant="ghost" size="sm" onclick={toggleCustom} class="text-xs">
				{useCustom ? 'Produkt' : 'Fritext'}
			</Button>
		</div>

		<div class="flex gap-2">
			<Input
				type="number"
				value={ingredient.amount || ''}
				oninput={handleAmountChange}
				placeholder="Mängd"
				class="w-20"
				min="0"
				step="0.1"
			/>
			<Input
				value={ingredient.unit || ''}
				oninput={handleUnitChange}
				placeholder="Enhet"
				class="w-20"
			/>
		</div>
	</div>

	<Button variant="ghost" size="icon" class="text-muted-foreground hover:text-destructive" onclick={onremove}>
		<Trash2 class="h-4 w-4" />
	</Button>
</div>
