<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { browser, dev } from "$app/environment";
  import "../app.css";
  import { page } from "$app/stores";
  import {
    ShoppingCart,
    Package,
    BookOpen,
    Menu,
    WifiOff,
    Star,
    Download,
    LogOut,
  } from "@lucide/svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "$lib/components/ui/button";
  import { initOfflineDB, isOnline } from "$lib/db/idb";

  let { children } = $props();
  let online = $state(true);
  let authenticated = $state(false);
  let clickCount = $state(0);

  const AUTH_KEY = "mat_auth";

  const navItems = [
    { href: "/", label: "Inköpslista", icon: ShoppingCart },
    { href: "/products", label: "Produkter", icon: Package },
    { href: "/recipes", label: "Recept", icon: BookOpen },
  ];

  function handleTitleClick() {
    clickCount++;
    if (clickCount >= 3) {
      localStorage.setItem(AUTH_KEY, "true");
      authenticated = true;
    }
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY);
    authenticated = false;
  }

  onMount(async () => {
    // Check authentication
    if (browser) {
      authenticated = localStorage.getItem(AUTH_KEY) === "true";
    }
    // Initialize IndexedDB
    await initOfflineDB();

    // Track online status
    online = isOnline();
    window.addEventListener("online", () => (online = true));
    window.addEventListener("offline", () => (online = false));

    // Register service worker (production only)
    if (browser && !dev && "serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          {
            type: "module",
          },
        );
        console.log("Service Worker registered:", registration.scope);
      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }
    } else if (browser && dev && "serviceWorker" in navigator) {
      // Unregister service worker in development
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log("Service Worker unregistered for development");
      }
    }
  });
</script>

<svelte:head>
  <title>Matplanering</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

{#if !authenticated}
  <!-- Landing page - click title 3 times to unlock -->
  <div
    class="flex min-h-screen flex-col items-center justify-center bg-background gap-4"
  >
    <button
      onclick={handleTitleClick}
      class="text-4xl font-bold text-foreground select-none cursor-default focus:outline-none"
    >
      Matplanering
    </button>
    <p class="text-sm text-muted-foreground italic text-center">
      Tålamod och upprepning öppnar vägen<br />för den hungrige vandraren
    </p>
  </div>
{:else}
  <div class="flex min-h-screen flex-col bg-background">
    <!-- Offline banner -->
    {#if !online}
      <div
        class="flex items-center justify-center gap-2 bg-yellow-500 px-4 py-2 text-sm text-white"
      >
        <WifiOff class="h-4 w-4" />
        <span>Du är offline - ändringar synkas när du är online igen</span>
      </div>
    {/if}

    <!-- Header for desktop -->
    <header class="hidden border-b bg-card md:block">
      <div class="container mx-auto flex h-14 items-center px-4">
        <a
          href="/"
          class="text-lg font-semibold hover:text-primary transition-colors"
          >Matplanering</a
        >
        <nav class="ml-8 flex flex-1 gap-6">
          {#each navItems as item}
            <a
              href={item.href}
              class="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary {$page
                .url.pathname === item.href
                ? 'text-primary'
                : 'text-muted-foreground'}"
            >
              <item.icon class="h-4 w-4" />
              {item.label}
            </a>
          {/each}
        </nav>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button variant="ghost" size="sm" {...props}>
                <Menu class="h-4 w-4 mr-2" />
                Meny
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onclick={() => goto("/staples")}>
              <Star class="h-4 w-4 mr-2" />
              Basvaror
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => goto("/data")}>
              <Download class="h-4 w-4 mr-2" />
              Export/import
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={handleLogout}>
              <LogOut class="h-4 w-4 mr-2" />
              Logga ut
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
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
            class="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors {$page
              .url.pathname === item.href
              ? 'text-primary'
              : 'text-muted-foreground'}"
          >
            <item.icon class="h-5 w-5" />
            <span class="text-xs font-medium">{item.label}</span>
          </a>
        {/each}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <button
                class="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-muted-foreground transition-colors"
                {...props}
              >
                <Menu class="h-5 w-5" />
                <span class="text-xs font-medium">Meny</span>
              </button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content side="top" align="end">
            <DropdownMenu.Item onclick={() => goto("/staples")}>
              <Star class="h-4 w-4 mr-2" />
              Basvaror
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => goto("/data")}>
              <Download class="h-4 w-4 mr-2" />
              Export/import
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={handleLogout}>
              <LogOut class="h-4 w-4 mr-2" />
              Logga ut
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </nav>
  </div>
{/if}
