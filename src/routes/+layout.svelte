<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import '../app.css';
	import { page } from '$app/stores';
	import { ShoppingCart, Package, BookOpen, WifiOff } from '@lucide/svelte';
	import { initOfflineDB, isOnline } from '$lib/db/idb';

	let { children } = $props();
	let online = $state(true);

	const navItems = [
		{ href: '/', label: 'Inköpslista', icon: ShoppingCart },
		{ href: '/products', label: 'Produkter', icon: Package },
		{ href: '/recipes', label: 'Recept', icon: BookOpen }
	];

	onMount(async () => {
		// Initialize IndexedDB
		await initOfflineDB();

		// Track online status
		online = isOnline();
		window.addEventListener('online', () => online = true);
		window.addEventListener('offline', () => online = false);

		// Register service worker
		if (browser && 'serviceWorker' in navigator) {
			try {
				const registration = await navigator.serviceWorker.register('/service-worker.js', {
					type: 'module'
				});
				console.log('Service Worker registered:', registration.scope);
			} catch (err) {
				console.error('Service Worker registration failed:', err);
			}
		}
	});
</script>

<svelte:head>
	<title>Matplanering</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="flex min-h-screen flex-col bg-background">
	<!-- Offline banner -->
	{#if !online}
		<div class="flex items-center justify-center gap-2 bg-yellow-500 px-4 py-2 text-sm text-white">
			<WifiOff class="h-4 w-4" />
			<span>Du är offline - ändringar synkas när du är online igen</span>
		</div>
	{/if}

	<!-- Header for desktop -->
	<header class="hidden border-b bg-card md:block">
		<div class="container mx-auto flex h-14 items-center px-4">
			<h1 class="text-lg font-semibold">Matplanering</h1>
			<nav class="ml-8 flex gap-6">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary {$page.url.pathname === item.href ? 'text-primary' : 'text-muted-foreground'}"
					>
						<item.icon class="h-4 w-4" />
						{item.label}
					</a>
				{/each}
			</nav>
		</div>
	</header>

	<!-- Main content -->
	<main class="flex-1 overflow-auto pb-16 md:pb-0">
		<div class="container mx-auto p-4">
			{@render children()}
		</div>
	</main>

	<!-- Bottom navigation for mobile -->
	<nav class="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
		<div class="flex h-16 items-center justify-around">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors {$page.url.pathname === item.href ? 'text-primary' : 'text-muted-foreground'}"
				>
					<item.icon class="h-5 w-5" />
					<span class="text-xs font-medium">{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
