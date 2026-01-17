<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Minus, Plus } from '@lucide/svelte';

	interface Props {
		servings: number;
		originalServings: number;
		onchange: (servings: number) => void;
	}

	let { servings, originalServings, onchange }: Props = $props();

	function decrease() {
		if (servings > 1) {
			onchange(servings - 1);
		}
	}

	function increase() {
		onchange(servings + 1);
	}
</script>

<div class="flex items-center gap-3">
	<span class="text-sm text-muted-foreground">Portioner:</span>
	<div class="flex items-center gap-2">
		<Button variant="outline" size="icon" class="h-8 w-8" onclick={decrease} disabled={servings <= 1}>
			<Minus class="h-4 w-4" />
		</Button>
		<span class="w-8 text-center font-medium">{servings}</span>
		<Button variant="outline" size="icon" class="h-8 w-8" onclick={increase}>
			<Plus class="h-4 w-4" />
		</Button>
	</div>
	{#if servings !== originalServings}
		<span class="text-xs text-muted-foreground">(original: {originalServings})</span>
	{/if}
</div>
