<script lang="ts">
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Label } from "$lib/components/ui/label";
  import {
    Download,
    Upload,
    Database,
    ChevronDown,
    Info,
    FileText,
  } from "@lucide/svelte";

  const API_BASE = "/api";

  let importing = $state(false);
  let message = $state("");
  let messageType = $state<"success" | "error">("success");
  let showProductFormat = $state(false);
  let showRecipeFormat = $state(false);
  let showFreetextDialog = $state(false);
  let freetextInput = $state("");
  let freetextParsing = $state(false);
  let freetextError = $state("");

  function showMessage(msg: string, type: "success" | "error") {
    message = msg;
    messageType = type;
    setTimeout(() => (message = ""), 5000);
  }

  // === PRODUCTS ===
  async function exportProducts() {
    try {
      const res = await fetch(`${API_BASE}/products/export`);
      const data = await res.json();
      downloadJson(data, "produkter.json");
      showMessage("Produkter exporterade", "success");
    } catch (e) {
      showMessage("Kunde inte exportera produkter", "error");
    }
  }

  async function importProducts(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importing = true;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch(`${API_BASE}/products/import-merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        showMessage(
          `Importerade ${result.imported} produkter (${result.skipped} hoppades över)`,
          "success",
        );
      } else {
        showMessage(result.error || "Import misslyckades", "error");
      }
    } catch (e) {
      showMessage("Kunde inte läsa filen", "error");
    } finally {
      importing = false;
      input.value = "";
    }
  }

  // === RECIPES ===
  async function exportRecipes() {
    try {
      const res = await fetch(`${API_BASE}/recipes/export`);
      const data = await res.json();
      downloadJson(data, "recept.json");
      showMessage("Recept exporterade", "success");
    } catch (e) {
      showMessage("Kunde inte exportera recept", "error");
    }
  }

  async function importRecipes(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importing = true;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch(`${API_BASE}/recipes/import-merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        showMessage(
          `Importerade ${result.imported} recept (${result.skipped} hoppades över)`,
          "success",
        );
      } else {
        showMessage(result.error || "Import misslyckades", "error");
      }
    } catch (e) {
      showMessage("Kunde inte läsa filen", "error");
    } finally {
      importing = false;
      input.value = "";
    }
  }

  // === FREETEXT IMPORT ===
  async function parseFreetextRecipe() {
    if (!freetextInput.trim()) return;

    freetextParsing = true;
    freetextError = "";

    try {
      const res = await fetch(`${API_BASE}/recipes/parse-freetext`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: freetextInput }),
      });

      const result = await res.json();
      if (res.ok) {
        // Store parsed recipe in sessionStorage and redirect to new recipe page
        sessionStorage.setItem("parsedRecipe", JSON.stringify(result));
        showFreetextDialog = false;
        freetextInput = "";
        goto("/recipes/new?from=freetext");
      } else {
        freetextError = result.error || "Kunde inte tolka receptet";
      }
    } catch (e) {
      freetextError = "Något gick fel";
    } finally {
      freetextParsing = false;
    }
  }

  // === FULL BACKUP ===
  async function exportFullBackup() {
    try {
      const res = await fetch(`${API_BASE}/backup`);
      const data = await res.json();
      const date = new Date().toISOString().split("T")[0];
      downloadJson(data, `backup-${date}.json`);
      showMessage("Full backup exporterad", "success");
    } catch (e) {
      showMessage("Kunde inte exportera backup", "error");
    }
  }

  // === HELPERS ===
  function downloadJson(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function triggerFileInput(id: string) {
    document.getElementById(id)?.click();
  }
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">Export/import</h1>

  {#if message}
    <div
      class="rounded-md p-3 text-sm {messageType === 'success'
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
    >
      {message}
    </div>
  {/if}

  <div class="grid gap-4 md:grid-cols-2">
    <!-- Products -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Produkter</CardTitle>
        <CardDescription>
          Exportera eller importera produkter och kategorier
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex gap-2">
          <Button variant="outline" onclick={exportProducts}>
            <Download class="h-4 w-4 mr-2" />
            Exportera
          </Button>
          <Button
            variant="outline"
            onclick={() => triggerFileInput("import-products")}
            disabled={importing}
          >
            <Upload class="h-4 w-4 mr-2" />
            Importera
          </Button>
          <input
            id="import-products"
            type="file"
            accept=".json"
            class="hidden"
            onchange={importProducts}
          />
        </div>
        <Collapsible.Root bind:open={showProductFormat}>
          <Collapsible.Trigger
            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Info class="h-3 w-3" />
            Importformat
            <ChevronDown
              class="h-3 w-3 transition-transform {showProductFormat
                ? 'rotate-180'
                : ''}"
            />
          </Collapsible.Trigger>
          <Collapsible.Content>
            <pre class="mt-2 rounded bg-muted p-3 text-xs overflow-x-auto">{`{
  "categories": [
    { "name": "Mejeri", "sort_order": 1 }
  ],
  "products": [
    {
      "name": "Mjölk",
      "category_name": "Mejeri",
      "default_unit": "l",
      "is_staple": 0
    }
  ]
}`}</pre>
            <p class="mt-2 text-xs text-muted-foreground">
              Produkter med samma namn hoppas över.
            </p>
          </Collapsible.Content>
        </Collapsible.Root>
      </CardContent>
    </Card>

    <!-- Recipes -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Recept</CardTitle>
        <CardDescription>
          Exportera eller importera recept med ingredienser
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" onclick={exportRecipes}>
            <Download class="h-4 w-4 mr-2" />
            Exportera
          </Button>
          <Button
            variant="outline"
            onclick={() => triggerFileInput("import-recipes")}
            disabled={importing}
          >
            <Upload class="h-4 w-4 mr-2" />
            Importera
          </Button>
          <Button variant="outline" onclick={() => (showFreetextDialog = true)}>
            <FileText class="h-4 w-4 mr-2" />
            Importera fritext
          </Button>
          <input
            id="import-recipes"
            type="file"
            accept=".json"
            class="hidden"
            onchange={importRecipes}
          />
        </div>
        <Collapsible.Root bind:open={showRecipeFormat}>
          <Collapsible.Trigger
            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Info class="h-3 w-3" />
            Importformat
            <ChevronDown
              class="h-3 w-3 transition-transform {showRecipeFormat
                ? 'rotate-180'
                : ''}"
            />
          </Collapsible.Trigger>
          <Collapsible.Content>
            <pre class="mt-2 rounded bg-muted p-3 text-xs overflow-x-auto">{`{
  "recipes": [
    {
      "name": "Pannkakor",
      "description": "Fluffiga pannkakor",
      "servings": 4,
      "instructions": "1. Blanda...",
      "source_url": "https://...",
      "ingredients": [
        {
          "product_name": "Mjölk",
          "amount": 6,
          "unit": "dl"
        },
        {
          "custom_name": "Vaniljsocker",
          "amount": 1,
          "unit": "tsk"
        }
      ],
      "tags": ["Frukost", "Enkelt"]
    }
  ]
}`}</pre>
            <p class="mt-2 text-xs text-muted-foreground">
              Recept med samma namn hoppas över. Ingredienser länkas till
              produkter via <code>product_name</code>, annars fritext via
              <code>custom_name</code>. Taggar skapas automatiskt.
            </p>
          </Collapsible.Content>
        </Collapsible.Root>
      </CardContent>
    </Card>
  </div>

  <!-- Full backup -->
  <Card>
    <CardHeader>
      <CardTitle class="text-base flex items-center gap-2">
        <Database class="h-4 w-4" />
        Full backup
      </CardTitle>
      <CardDescription>
        Exportera all data: produkter, recept, inköpslista, taggar
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button variant="outline" onclick={exportFullBackup}>
        <Download class="h-4 w-4 mr-2" />
        Exportera backup
      </Button>
    </CardContent>
  </Card>
</div>

<!-- Freetext import dialog -->
<Dialog.Root bind:open={showFreetextDialog}>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Importera recept från fritext</Dialog.Title>
      <Dialog.Description>
        Klistra in ett recept. Ingredienser matchas automatiskt mot befintliga
        produkter.
      </Dialog.Description>
    </Dialog.Header>
    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="freetext">Recepttext</Label>
        <Textarea
          id="freetext"
          bind:value={freetextInput}
          placeholder="Pannkakor

4 portioner

3 dl vetemjöl
6 dl mjölk
3 ägg
1 msk smör
1 krm salt

Vispa ihop mjöl och hälften av mjölken..."
          rows={12}
        />
      </div>
      {#if freetextError}
        <p class="text-sm text-destructive">{freetextError}</p>
      {/if}
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (showFreetextDialog = false)}>
        Avbryt
      </Button>
      <Button
        onclick={parseFreetextRecipe}
        disabled={!freetextInput.trim() || freetextParsing}
      >
        {freetextParsing ? "Tolkar..." : "Fortsätt"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
