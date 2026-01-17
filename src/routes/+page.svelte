<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Popover from '$lib/components/ui/popover';
	import { shoppingStore } from '$lib/stores/shopping.svelte';
	import { syncStore } from '$lib/stores/sync.svelte';
	import ShoppingList from '$lib/components/ShoppingList.svelte';
	import { RotateCcw, Wifi, WifiOff } from '@lucide/svelte';

	let showResetDialog = $state(false);

	onMount(() => {
		shoppingStore.fetch();
		syncStore.connect();

		return () => {
			syncStore.disconnect();
		};
	});

	async function handleToggle(id: number) {
		await shoppingStore.toggleDone(id);
	}

	async function handleDelete(id: number) {
		await shoppingStore.delete(id);
	}

	async function handleReset() {
		await shoppingStore.reset();
		showResetDialog = false;
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Inköpslista</h1>
			<p class="text-sm text-muted-foreground">
				{shoppingStore.doneCount} av {shoppingStore.totalCount} klara
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Popover.Root>
				<Popover.Trigger>
					{#if syncStore.isConnected}
						<Wifi class="h-4 w-4 text-green-500" />
					{:else}
						<WifiOff class="h-4 w-4 text-muted-foreground" />
					{/if}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-2 text-sm">
					{#if syncStore.isConnected}
						Realtidssynk aktiv
					{:else}
						Realtidssynk ej ansluten
					{/if}
				</Popover.Content>
			</Popover.Root>

			<AlertDialog.Root bind:open={showResetDialog}>
				<AlertDialog.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" size="sm" {...props} disabled={shoppingStore.totalCount === 0}>
							<RotateCcw class="h-4 w-4 mr-2" />
							Återställ
						</Button>
					{/snippet}
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Återställ inköpslistan?</AlertDialog.Title>
						<AlertDialog.Description>
							Detta tar bort alla {shoppingStore.totalCount} varor från listan. Åtgärden kan inte ångras.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Avbryt</AlertDialog.Cancel>
						<AlertDialog.Action onclick={handleReset}>Återställ</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</div>
	</div>

	{#if shoppingStore.loading}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">Laddar...</p>
		</div>
	{:else if shoppingStore.error}
		<div class="py-12 text-center">
			<p class="text-destructive">{shoppingStore.error}</p>
			<Button variant="outline" size="sm" class="mt-2" onclick={() => shoppingStore.fetch()}>
				Försök igen
			</Button>
		</div>
	{:else}
		<ShoppingList
			groupedItems={shoppingStore.groupedByCategory}
			onToggle={handleToggle}
			onDelete={handleDelete}
		/>
	{/if}
</div>
