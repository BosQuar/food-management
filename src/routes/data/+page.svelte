<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft } from "@lucide/svelte";
</script>

<div class="space-y-6">
  <div class="flex items-center gap-4">
    <Button variant="ghost" size="icon" href="/">
      <ArrowLeft class="h-5 w-5" />
    </Button>
    <h1 class="text-2xl font-bold">Export/import</h1>
  </div>

  <p class="text-muted-foreground">Innehåll kommer...</p>
</div>
