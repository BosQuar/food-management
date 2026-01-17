# Tasks - Food Management

Detaljerad uppgiftslista baserad på den tekniska planen. Uppgifter är grupperade i faser med beroenden markerade.

---

## Fas 1: Grundstruktur

### 1.1 Initiera SvelteKit-projekt ✅

- [x] Kör `npm create svelte@latest` i projektrot
- [x] Välj TypeScript (valfritt), ESLint, Prettier
- [x] Verifiera med `npm run dev`

**Mål:** Fungerande SvelteKit-projekt som startar på localhost

---

### 1.2 Installera shadcn-svelte ✅

**Beroende:** 1.1

- [x] Installera Tailwind CSS
- [x] Kör `npx shadcn-svelte@latest init`
- [x] Lägg till baskomponenter: Button, Input, Card, Checkbox, Dialog
- [x] Konfigurera tema/färger för mobile-first design

**Mål:** shadcn-svelte fungerar, kan använda `<Button>` i en testvy

---

### 1.3 Sätt upp SQLite + schema ✅

**Beroende:** 1.1

- [x] Installera `better-sqlite3`
- [x] Skapa `server/db/connection.js` - databasanslutning
- [x] Skapa `server/db/schema.sql` med alla tabeller:
  - `store_categories`
  - `products`
  - `shopping_items`
  - `recipes`
  - `recipe_ingredients`
  - `sync_log`
- [x] Skapa script för att köra schema vid uppstart
- [x] Skapa `data/` mapp för databasfilen

**Mål:** Databas skapas automatiskt med rätt schema vid första körning

---

### 1.4 Importera initial produktdata ✅

**Beroende:** 1.3

- [x] Skapa seed-data för `store_categories` (Frukt & Grönt, Mejeri, Kött, etc.)
- [x] Skapa seed-script som läser CSV/JSON med produkter
- [x] Kör seed vid tom databas

**Mål:** Databasen har kategorier och exempelprodukter att arbeta med

---

## Fas 2: Backend

### 2.1 Express server setup ✅

**Beroende:** 1.3

- [x] Installera `express`, `cors`
- [x] Skapa `server/index.js` med grundläggande Express-app
- [x] Konfigurera för att serva SvelteKit-build i produktion
- [x] Sätt port 8500

**Mål:** Express-server startar och svarar på requests

---

### 2.2 API routes - Produkter ✅

**Beroende:** 2.1

- [x] Skapa `server/routes/products.js`
- [x] `GET /api/products` - lista alla, grupperat per kategori
- [x] `POST /api/products` - skapa ny produkt
- [x] `PUT /api/products/:id` - uppdatera produkt
- [x] `DELETE /api/products/:id` - ta bort produkt
- [x] `GET /api/products/export` - exportera som JSON
- [x] `POST /api/products/import` - importera från JSON

**Mål:** Alla produkt-endpoints fungerar via Postman/curl

---

### 2.3 API routes - Inköpslista ✅

**Beroende:** 2.1, 2.2

- [x] Skapa `server/routes/shopping.js`
- [x] `GET /api/shopping` - hämta aktiv lista
- [x] `POST /api/shopping` - lägg till produkt (med product_id)
- [x] `POST /api/shopping/custom` - lägg till manuell vara (custom_name)
- [x] `PUT /api/shopping/:id` - uppdatera quantity/unit/done
- [x] `DELETE /api/shopping/:id` - ta bort enskild
- [x] `POST /api/shopping/reset` - rensa hela listan

**Mål:** Kan lägga till, bocka av och ta bort varor via API

---

### 2.4 API routes - Recept ✅

**Beroende:** 2.1, 2.2

- [x] Skapa `server/routes/recipes.js`
- [x] `GET /api/recipes` - lista alla
- [x] `GET /api/recipes/:id` - hämta ett med ingredienser
- [x] `POST /api/recipes` - skapa med ingredienser
- [x] `PUT /api/recipes/:id` - uppdatera recept + ingredienser
- [x] `DELETE /api/recipes/:id` - ta bort (CASCADE på ingredienser)
- [x] `POST /api/recipes/:id/to-shopping` - lägg ingredienser på listan

**Mål:** Kan skapa recept och lägga dess ingredienser på inköpslistan

---

### 2.5 API routes - Backup ✅

**Beroende:** 2.2, 2.3, 2.4

- [x] `GET /api/backup` - exportera all data som JSON
- [x] `POST /api/restore` - återställ från JSON-backup

**Mål:** Kan ta backup och återställa hela databasen

---

### 2.6 WebSocket för realtidssynk ✅

**Beroende:** 2.1

- [x] Installera `ws`
- [x] Skapa `server/services/sync.js`
- [x] Sätt upp WebSocket-server på `/ws`
- [x] Broadcast vid ändringar i shopping_items
- [x] Broadcast vid ändringar i products
- [x] Hantera reconnect från klienter

**Mål:** Ändringar i en klient syns direkt i andra anslutna klienter

---

## Fas 3: Frontend

### 3.1 Layout med navigation ✅

**Beroende:** 1.2

- [x] Skapa `src/routes/+layout.svelte`
- [x] Implementera bottom navigation (mobile-first):
  - Inköpslista (/)
  - Produkter (/products)
  - Recept (/recipes)
- [x] Responsiv design för desktop
- [x] Global CSS i `app.css`

**Mål:** Navigation fungerar mellan alla huvudvyer

---

### 3.2 Svelte stores ✅

**Beroende:** 3.1

- [x] Skapa `src/lib/stores/products.js` - products, categories
- [x] Skapa `src/lib/stores/shopping.js` - shoppingItems
- [x] Skapa `src/lib/stores/recipes.js` - recipes
- [x] Skapa `src/lib/stores/sync.js` - syncStatus (connected, pending)
- [x] Funktioner för att hämta/uppdatera via API

**Mål:** Stores hämtar data från backend och uppdaterar UI reaktivt

---

### 3.3 Inköpslista-vy ✅

**Beroende:** 3.1, 3.2, 2.3

- [x] Skapa `src/routes/+page.svelte`
- [x] Skapa `src/lib/components/ShoppingList.svelte`
- [x] Skapa `src/lib/components/ShoppingItem.svelte`
- [x] Visa items grupperat per kategori
- [x] Sortering: kategori → done-status → namn
- [x] Checkbox för att toggla is_done
- [x] Avbockade visas överstrukna längst ner i kategori
- [x] Knapp "Återställ lista" med bekräftelse-dialog
- [x] Swipe eller knapp för att ta bort enskild vara

**Mål:** Kan se lista, bocka av varor, och rensa listan

---

### 3.4 Produktkatalog-vy

**Beroende:** 3.1, 3.2, 2.2

- [ ] Skapa `src/routes/products/+page.svelte`
- [ ] Skapa `src/lib/components/ProductList.svelte`
- [ ] Sökfält med realtidsfilter
- [ ] Lista produkter grupperat per kategori
- [ ] Klick på produkt → dialog för quantity/unit → lägg till på lista
- [ ] "+" knapp för att skapa ny produkt (dialog)
- [ ] Swipe/knapp för redigera/ta bort produkt

**Mål:** Kan söka produkter, lägga till på lista, och hantera produktkatalogen

---

### 3.5 Receptlista-vy

**Beroende:** 3.1, 3.2, 2.4

- [ ] Skapa `src/routes/recipes/+page.svelte`
- [ ] Skapa `src/lib/components/RecipeCard.svelte`
- [ ] Lista alla recept som kort
- [ ] Varje kort visar: namn, antal ingredienser
- [ ] Klick → navigera till `/recipes/[id]`
- [ ] "+" knapp för nytt recept

**Mål:** Kan se alla recept och navigera till enskilda

---

### 3.6 Receptvy (visa)

**Beroende:** 3.5

- [ ] Skapa `src/routes/recipes/[id]/+page.svelte`
- [ ] Skapa `src/lib/components/PortionScaler.svelte`
- [ ] Visa titel
- [ ] Portioner med +/- knappar
- [ ] Ingredienslista med skalade mängder
- [ ] Instruktioner (stödjer markdown)
- [ ] Knapp "Lägg till på inköpslistan" (alla ingredienser)
- [ ] Redigera-knapp → `/recipes/[id]/edit`
- [ ] Ta bort-knapp med bekräftelse

**Mål:** Kan se recept, skala portioner, och lägga ingredienser på listan

---

### 3.7 Receptredigering

**Beroende:** 3.5, 3.6

- [ ] Skapa `src/routes/recipes/new/+page.svelte`
- [ ] Skapa `src/routes/recipes/[id]/edit/+page.svelte`
- [ ] Skapa `src/lib/components/RecipeEditor.svelte`
- [ ] Skapa `src/lib/components/IngredientRow.svelte`
- [ ] Titel-fält
- [ ] Portioner (antal)
- [ ] Ingredienser: välj produkt eller fritext + mängd + enhet
- [ ] Lägg till/ta bort ingrediensrader
- [ ] Instruktioner (textarea)
- [ ] Spara/avbryt-knappar

**Mål:** Kan skapa och redigera recept med ingredienser

---

## Fas 4: Avancerat

### 4.1 URL-import för recept

**Beroende:** 3.7

- [ ] Skapa `server/services/recipe-parser.js`
- [ ] Hämta HTML från URL
- [ ] Parsa JSON-LD (schema.org/Recipe)
- [ ] Fallback: parsa vanlig HTML (heuristik)
- [ ] Extrahera: titel, ingredienser, instruktioner, portioner
- [ ] `POST /api/recipes/import` endpoint
- [ ] URL-fält + "Importera" knapp i RecipeEditor

**Mål:** Kan klistra in recept-URL och få formuläret ifyllt automatiskt

---

### 4.2 Portionsskalning

**Beroende:** 3.6

- [ ] Beräkna skalfaktor: önskade portioner / originalportioner
- [ ] Multiplicera alla ingrediensmängder
- [ ] Visa skalade mängder i receptvy
- [ ] Vid "lägg till på lista" - använd skalade mängder

**Mål:** Ändra portioner → ingrediensmängder uppdateras automatiskt

---

### 4.3 IndexedDB för offline

**Beroende:** 3.2

- [ ] Installera `idb` (IndexedDB wrapper)
- [ ] Skapa `src/lib/db/idb.js`
- [ ] Spegla alla tabeller i IndexedDB
- [ ] Skriv till IDB först vid alla ändringar
- [ ] Synka till server i bakgrunden

**Mål:** Ändringar sparas lokalt även utan internetanslutning

---

### 4.4 Service Worker

**Beroende:** 4.3

- [ ] Skapa `src/service-worker.js`
- [ ] Cacha statiska assets (JS, CSS, HTML)
- [ ] Cacha API-responses (products, recipes)
- [ ] Servera från cache när offline
- [ ] Visa offline-indikator i UI

**Mål:** Appen fungerar helt offline (läsa + skriva)

---

### 4.5 WebSocket-klient + sync

**Beroende:** 2.6, 4.3

- [ ] Anslut till WebSocket i sync store
- [ ] Lyssna på ändringar → uppdatera lokal store
- [ ] Skicka lokala ändringar till server
- [ ] Reconnect med exponential backoff
- [ ] Visa sync-status i UI (ansluten/frånkopplad/synkar)
- [ ] Konflikthantering: senaste timestamp vinner

**Mål:** Realtidssynk mellan enheter, hanterar nätverksavbrott

---

### 4.6 Export/import funktionalitet

**Beroende:** 2.2, 2.5

- [ ] Export produktlista-knapp i produktkatalog
- [ ] Import produktlista-knapp (filväljare)
- [ ] Full backup-knapp i inställningar/meny
- [ ] Restore-knapp med varning (skriver över all data)

**Mål:** Kan exportera/importera produktlista separat och ta full backup

---

## Fas 5: Deploy

### 5.1 PWA manifest

**Beroende:** 4.4

- [ ] Skapa `static/manifest.json`
- [ ] App-namn, ikoner (192x192, 512x512)
- [ ] Theme color, background color
- [ ] Display: standalone
- [ ] Länka manifest i `app.html`

**Mål:** Appen kan installeras som PWA på mobil

---

### 5.2 Docker setup

**Beroende:** Alla tidigare faser

- [ ] Skapa `Dockerfile` (node:20-alpine)
- [ ] Skapa `docker-compose.yml`
- [ ] Volume för `data/` (persistent databas)
- [ ] Port 8500
- [ ] Testa `docker-compose up --build`

**Mål:** Appen kör i Docker med persistent data

---

### 5.3 Testa på mobil

**Beroende:** 5.1, 5.2

- [ ] Kör Docker på lokal maskin
- [ ] Öppna på mobil via lokalt nätverk
- [ ] Testa alla vyer på mobil
- [ ] Testa offline-läge
- [ ] Testa realtidssynk mellan mobil och desktop
- [ ] Installera som PWA

**Mål:** Appen fungerar fullt ut på mobil

---

## Verifieringschecklista

Kör igenom dessa när allt är klart:

- [ ] `npm run dev` → öppna i två fönster
- [ ] Lägg till produkt i fönster 1 → syns i fönster 2
- [ ] Bocka av vara → visas överstruken
- [ ] Skapa recept → lägg ingredienser på lista med skalning
- [ ] Testa offline: stäng nätverk → gör ändringar → slå på → verifiera sync
- [ ] `docker-compose up --build` → fungerar
- [ ] Testa på mobil i samma nätverk
- [ ] Installera som PWA på mobil
