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
    Sun,
    Moon,
    User,
    Settings,
  } from "@lucide/svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { initOfflineDB, isOnline } from "$lib/db/idb";
  import { authStore } from "$lib/stores/auth.svelte";
  import { syncStore } from "$lib/stores/sync.svelte";
  import LoginForm from "$lib/components/LoginForm.svelte";

  let { children } = $props();
  let online = $state(true);
  let darkMode = $state(false);

  // Settings dialog state
  let showSettingsDialog = $state(false);
  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmNewPassword = $state("");
  let passwordError = $state<string | null>(null);
  let passwordSuccess = $state(false);
  let isChangingPassword = $state(false);

  const passwordMismatch = $derived(
    confirmNewPassword && newPassword !== confirmNewPassword,
  );

  function openSettingsDialog() {
    showSettingsDialog = true;
    currentPassword = "";
    newPassword = "";
    confirmNewPassword = "";
    passwordError = null;
    passwordSuccess = false;
  }

  async function handleChangePassword() {
    if (isChangingPassword) return;
    if (newPassword !== confirmNewPassword) return;

    isChangingPassword = true;
    passwordError = null;
    passwordSuccess = false;

    const result = await authStore.changePassword(currentPassword, newPassword);

    isChangingPassword = false;

    if (result.success) {
      passwordSuccess = true;
      currentPassword = "";
      newPassword = "";
      confirmNewPassword = "";
    } else {
      passwordError = result.error || "Kunde inte ändra lösenord";
    }
  }

  const THEME_KEY = "mat_theme";

  function toggleDarkMode() {
    darkMode = !darkMode;
    if (browser) {
      localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
      document.documentElement.classList.toggle("dark", darkMode);
    }
  }

  const navItems = [
    { href: "/", label: "Inköpslista", icon: ShoppingCart },
    { href: "/products", label: "Produkter", icon: Package },
    { href: "/recipes", label: "Recept", icon: BookOpen },
  ];

  async function handleLogout() {
    syncStore.disconnect();
    await authStore.logout();
  }

  onMount(async () => {
    // Initialize theme
    if (browser) {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (
        savedTheme === "dark" ||
        (!savedTheme &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        darkMode = true;
        document.documentElement.classList.add("dark");
      }
    }

    // Verify auth token on mount
    if (authStore.user) {
      await authStore.verify();
    }

    // Initialize IndexedDB
    await initOfflineDB();

    // Track online status
    online = isOnline();
    window.addEventListener("online", () => (online = true));
    window.addEventListener("offline", () => (online = false));

    // Connect WebSocket if authenticated
    if (authStore.isAuthenticated) {
      syncStore.connect();
    }

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

{#if authStore.isLoading}
  <!-- Loading state -->
  <div
    class="flex min-h-screen flex-col items-center justify-center bg-background"
  >
    <p class="text-muted-foreground">Laddar...</p>
  </div>
{:else if !authStore.isAuthenticated}
  <!-- Login form -->
  <LoginForm />
{:else}
  <div class="flex min-h-screen flex-col bg-background">
    <!-- Offline banner -->
    {#if !online}
      <div
        class="flex items-center justify-center gap-2 bg-yellow-500 px-4 py-2 text-sm text-white sticky top-0 z-50"
      >
        <WifiOff class="h-4 w-4" />
        <span>Du är offline - ändringar synkas när du är online igen</span>
      </div>
    {/if}

    <!-- Header for desktop -->
    <header class="hidden border-b bg-card md:block sticky top-0 z-40">
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
                <User class="h-4 w-4 mr-2" />
                {authStore.user?.username}
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
            <DropdownMenu.Item onclick={toggleDarkMode}>
              {#if darkMode}
                <Sun class="h-4 w-4 mr-2" />
                Ljust läge
              {:else}
                <Moon class="h-4 w-4 mr-2" />
                Mörkt läge
              {/if}
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={openSettingsDialog}>
              <Settings class="h-4 w-4 mr-2" />
              Inställningar
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
            <DropdownMenu.Item onclick={toggleDarkMode}>
              {#if darkMode}
                <Sun class="h-4 w-4 mr-2" />
                Ljust läge
              {:else}
                <Moon class="h-4 w-4 mr-2" />
                Mörkt läge
              {/if}
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={openSettingsDialog}>
              <Settings class="h-4 w-4 mr-2" />
              Inställningar
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={handleLogout}>
              <LogOut class="h-4 w-4 mr-2" />
              Logga ut ({authStore.user?.username})
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </nav>
  </div>
{/if}

<!-- Settings dialog -->
<Dialog.Root bind:open={showSettingsDialog}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title>Inställningar</Dialog.Title>
    </Dialog.Header>
    <div class="space-y-6 py-4">
      <div class="space-y-4">
        <h3 class="text-sm font-medium">Ändra lösenord</h3>
        <div class="space-y-2">
          <Label for="current-password">Nuvarande lösenord</Label>
          <Input
            id="current-password"
            type="password"
            bind:value={currentPassword}
            autocomplete="current-password"
          />
        </div>
        <div class="space-y-2">
          <Label for="new-password">Nytt lösenord</Label>
          <Input
            id="new-password"
            type="password"
            bind:value={newPassword}
            placeholder="Minst 4 tecken"
            autocomplete="new-password"
          />
        </div>
        <div class="space-y-2">
          <Label for="confirm-new-password">Bekräfta nytt lösenord</Label>
          <Input
            id="confirm-new-password"
            type="password"
            bind:value={confirmNewPassword}
            autocomplete="new-password"
            class={passwordMismatch ? "border-red-500" : ""}
          />
          {#if passwordMismatch}
            <p class="text-sm text-red-500">Lösenorden matchar inte</p>
          {/if}
        </div>
        {#if passwordError}
          <p class="text-sm text-red-500">{passwordError}</p>
        {/if}
        {#if passwordSuccess}
          <p class="text-sm text-green-600">Lösenord ändrat!</p>
        {/if}
        <Button
          onclick={handleChangePassword}
          disabled={isChangingPassword ||
            !currentPassword ||
            !newPassword ||
            newPassword.length < 4 ||
            passwordMismatch}
          class="w-full"
        >
          {isChangingPassword ? "Ändrar..." : "Ändra lösenord"}
        </Button>
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (showSettingsDialog = false)}
        >Stäng</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
