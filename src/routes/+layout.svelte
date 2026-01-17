<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { ShoppingCart, Package, BookOpen } from '@lucide/svelte';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Inköpslista', icon: ShoppingCart },
		{ href: '/products', label: 'Produkter', icon: Package },
		{ href: '/recipes', label: 'Recept', icon: BookOpen }
	];
</script>

<svelte:head>
	<title>Matplanering</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="flex min-h-screen flex-col bg-background">
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
