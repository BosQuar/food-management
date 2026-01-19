<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { authStore } from "$lib/stores/auth.svelte";
  import { syncStore } from "$lib/stores/sync.svelte";

  type Mode = "login" | "register";

  let mode = $state<Mode>("login");
  let username = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let isSubmitting = $state(false);

  const isLogin = $derived(mode === "login");

  function switchMode() {
    mode = isLogin ? "register" : "login";
    authStore.clearError();
    username = "";
    password = "";
    confirmPassword = "";
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (isSubmitting) return;

    if (!isLogin && password !== confirmPassword) {
      return;
    }

    isSubmitting = true;

    let success: boolean;
    if (isLogin) {
      success = await authStore.login(username, password);
    } else {
      success = await authStore.register(username, password);
    }

    isSubmitting = false;

    if (success) {
      // Connect WebSocket after successful login/register
      syncStore.reconnect();
    }
  }

  const passwordMismatch = $derived(
    !isLogin && confirmPassword && password !== confirmPassword,
  );
</script>

<div class="flex min-h-screen flex-col items-center justify-center p-4">
  <div class="w-full max-w-sm space-y-6">
    <div class="text-center">
      <h1 class="text-3xl font-bold">Matplanering</h1>
      <p class="text-sm text-muted-foreground mt-2">
        {isLogin ? "Logga in för att fortsätta" : "Skapa ett nytt konto"}
      </p>
    </div>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label for="username">Användarnamn</Label>
        <Input
          id="username"
          type="text"
          bind:value={username}
          placeholder="Minst 4 tecken"
          required
          minlength={4}
          autocomplete="username"
        />
      </div>

      <div class="space-y-2">
        <Label for="password">Lösenord</Label>
        <Input
          id="password"
          type="password"
          bind:value={password}
          placeholder="Minst 4 tecken"
          required
          minlength={4}
          autocomplete={isLogin ? "current-password" : "new-password"}
        />
      </div>

      {#if !isLogin}
        <div class="space-y-2">
          <Label for="confirmPassword">Bekräfta lösenord</Label>
          <Input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Skriv lösenordet igen"
            required
            minlength={4}
            autocomplete="new-password"
            class={passwordMismatch ? "border-red-500" : ""}
          />
          {#if passwordMismatch}
            <p class="text-sm text-red-500">Lösenorden matchar inte</p>
          {/if}
        </div>
      {/if}

      {#if authStore.error}
        <p class="text-sm text-red-500">{authStore.error}</p>
      {/if}

      <Button
        type="submit"
        class="w-full"
        disabled={isSubmitting ||
          authStore.isLoading ||
          passwordMismatch ||
          !username ||
          !password}
      >
        {#if isSubmitting || authStore.isLoading}
          {isLogin ? "Loggar in..." : "Skapar konto..."}
        {:else}
          {isLogin ? "Logga in" : "Skapa konto"}
        {/if}
      </Button>
    </form>

    <div class="text-center">
      <button
        type="button"
        onclick={switchMode}
        class="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
      >
        {isLogin
          ? "Har du inget konto? Registrera dig"
          : "Har du redan konto? Logga in"}
      </button>
    </div>
  </div>
</div>
