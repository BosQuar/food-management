# Food Management - Teknisk Plan (Uppdaterad)

## Översikt

En self-hosted webbapp för matplanering och inköpslistor. Öppen för alla med länk (ingen autentisering). Delad inköpslista med realtidssynk och offline-stöd.

**Stack:** Node.js + SvelteKit + SQLite + shadcn-svelte
**Design:** Mobile-first
**Docker port:** 8500

---

## Beslut från förtydligande

- **Ingen autentisering** - alla med länk har tillgång
- **En delad lista** - samma för alla användare
- **Manuell återställning** - avbockade varor rensas vid manuell reset
- **Två huvudvyer:** Produktkatalog (lägg till) + Inköpslista (handla)
- **Enheter på alla varor** - quantity + unit alltid synligt
- **Notes alltid synliga** - ingen expand/collapse
- **Sortering:** kategori, namn, done-status
- **Recept:** Titel, ingredienser, instruktioner (ingen bild, betyg, taggar)
- **Export/import av produktlista separat** (utöver full backup)

---

## 1. Projektstruktur

```
food-management/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── server/
│   ├── index.js              # Express + WebSocket server
│   ├── db/
│   │   ├── schema.sql
│   │   └── connection.js     # better-sqlite3 wrapper
│   ├── routes/
│   │   ├── products.js
│   │   ├── recipes.js
│   │   └── shopping.js
│   └── services/
│       ├── recipe-parser.js  # URL-import
│       └── sync.js           # WebSocket logic
├── src/
│   ├── app.html
│   ├── app.css
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn-svelte
│   │   │   ├── ProductList.svelte
│   │   │   ├── ShoppingList.svelte
│   │   │   ├── RecipeCard.svelte
│   │   │   └── RecipeEditor.svelte
│   │   ├── stores/
│   │   │   ├── products.js
│   │   │   ├── recipes.js
│   │   │   ├── shopping.js
│   │   │   └── sync.js
│   │   └── db/
│   │       └── idb.js        # IndexedDB offline
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte      # Inköpslista
│   │   ├── products/
│   │   │   └── +page.svelte  # Produktkatalog
│   │   └── recipes/
│   │       ├── +page.svelte
│   │       ├── new/+page.svelte
│   │       └── [id]/+page.svelte
│   └── service-worker.js
├── static/
│   └── manifest.json
└── data/
    └── food.db               # SQLite databas
```

---

## 2. Databasschema

```sql
CREATE TABLE store_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  store_category_id INTEGER REFERENCES store_categories(id),
  default_unit TEXT DEFAULT 'st',
  default_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shopping_items (
  id INTEGER PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  custom_name TEXT,
  store_category_id INTEGER REFERENCES store_categories(id),
  quantity REAL DEFAULT 1,
  unit TEXT DEFAULT 'st',
  notes TEXT,
  is_done BOOLEAN DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  instructions TEXT,
  servings INTEGER DEFAULT 4,
  source_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_ingredients (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  custom_name TEXT,
  amount REAL,
  unit TEXT,
  sort_order INTEGER
);

CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Förenklingar jämfört med original:**

- Borttaget: `recipe_categories` (inga taggar/kategorier på recept)
- Borttaget: `is_frequent` på products (inte behövt)
- Borttaget: `is_added` på shopping_items (items skapas/tas bort istället)
- Lagt till: `default_unit` på products

---

## 3. API-endpoints

### Produkter

```
GET    /api/products              # Lista alla (grupperat per kategori)
POST   /api/products              # Skapa ny
PUT    /api/products/:id          # Uppdatera
DELETE /api/products/:id          # Ta bort
GET    /api/products/export       # Exportera produktlista (JSON)
POST   /api/products/import       # Importera produktlista (JSON)
```

### Inköpslista

```
GET    /api/shopping              # Hämta aktiv lista
POST   /api/shopping              # Lägg till produkt
POST   /api/shopping/custom       # Lägg till manuell vara
PUT    /api/shopping/:id          # Uppdatera (quantity, unit, done)
DELETE /api/shopping/:id          # Ta bort enskild
POST   /api/shopping/reset        # Återställ hela listan (tar bort alla)
```

### Recept

```
GET    /api/recipes               # Lista alla
GET    /api/recipes/:id           # Hämta ett
POST   /api/recipes               # Skapa
POST   /api/recipes/import        # Importera från URL
PUT    /api/recipes/:id           # Uppdatera
DELETE /api/recipes/:id           # Ta bort
POST   /api/recipes/:id/to-shopping # Lägg ingredienser på listan
```

### Backup

```
GET    /api/backup                # Exportera all data (JSON)
POST   /api/restore               # Importera all data (JSON)
```

### WebSocket

```
WS /ws → realtidssynk mellan klienter
```

---

## 4. Vyer & UI (Mobile-first)

### 4.1 Inköpslista (`/`) - Huvudvy

- Visa alla `shopping_items` grupperat per `store_category`
- Sorterat: kategori (sort_order) → done-status → namn
- Varje rad visar: checkbox, namn, quantity+unit, notes
- Klick på checkbox → toggle `is_done`
- Avbockade visas överstrukna längst ner i sin kategori
- Knapp "Återställ lista" → tar bort alla items

### 4.2 Produktkatalog (`/products`)

- Sökfält med filter
- Lista alla produkter grupperat per kategori
- Klick på produkt → lägg till på inköpslistan (med quantity/unit dialog)
- "+" knapp för att skapa ny produkt
- Swipe/knapp för att redigera/ta bort produkt

### 4.3 Receptlista (`/recipes`)

- Lista alla recept som kort
- Varje kort: namn, antal ingredienser
- Klick → visa recept

### 4.4 Receptvy (`/recipes/[id]`)

- Titel
- Portioner med +/- knappar (skalning)
- Ingredienslista (skalade mängder)
- Instruktioner (plaintext/markdown)
- Knapp "Lägg till på inköpslistan"
- Redigera/ta bort knappar

### 4.5 Nytt/redigera recept (`/recipes/new`, `/recipes/[id]/edit`)

- Titel-fält
- URL-import knapp (parsar och fyller i)
- Portioner (antal)
- Ingredienser: produkt/fritext + mängd + enhet
- Instruktioner (textarea)

---

## 5. Komponenter

```
src/lib/components/
├── ui/                    # shadcn-svelte (Button, Input, Card, Checkbox, Dialog)
├── ProductList.svelte     # Produktkatalog med sök/filter
├── ShoppingList.svelte    # Inköpslista med kategorier
├── ShoppingItem.svelte    # En rad i inköpslistan
├── RecipeCard.svelte      # Receptkort i listan
├── RecipeEditor.svelte    # Formulär för recept
├── IngredientRow.svelte   # En ingrediens-rad i editor
└── PortionScaler.svelte   # +/- knappar för portioner
```

---

## 6. Stores (Svelte)

```javascript
// stores/products.js
export const products = writable([]);
export const categories = writable([]);

// stores/shopping.js
export const shoppingItems = writable([]);

// stores/recipes.js
export const recipes = writable([]);

// stores/sync.js
export const syncStatus = writable({ connected: false, pending: 0 });
```

---

## 7. Offline & Sync

### IndexedDB

- Speglar SQLite lokalt
- Alla ändringar skrivs till IDB först
- Synkas till server när online

### WebSocket

- Broadcast ändringar till alla anslutna klienter
- Reconnect med exponential backoff
- Konflikthantering: senaste ändring vinner (timestamp)

### Service Worker

- Cachar statiska assets
- Cachar API-responses
- Serverar från cache när offline

---

## 8. Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 8500
CMD ["node", "server/index.js"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "8500:8500"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

---

## 9. Implementationsordning

### Fas 1: Grundstruktur

1. Initiera SvelteKit-projekt
2. Installera shadcn-svelte
3. Sätt upp SQLite + schema
4. Importera initial produktdata (från tidigare CSV)

### Fas 2: Backend

5. Express server med alla API-routes
6. WebSocket för realtidssynk

### Fas 3: Frontend

7. Layout med navigation (mobile-first, bottom nav)
8. Inköpslista-vy
9. Produktkatalog-vy
10. Recept-vyer (lista, visa, redigera)

### Fas 4: Avancerat

11. URL-import för recept (JSON-LD parsing)
12. Portionsskalning
13. Offline-stöd (Service Worker + IndexedDB)
14. Export/import funktionalitet

### Fas 5: Deploy

15. PWA manifest
16. Docker setup
17. Testa på mobil

---

## 10. Verifiering

1. `npm run dev` → öppna i två fönster/enheter
2. Lägg till produkt i fönster 1 → ska synas i fönster 2
3. Bocka av vara → visas överstruken
4. Skapa recept → lägg till på lista med skalning
5. Testa offline: stäng nätverk → gör ändringar → slå på → verifiera sync
6. Bygg Docker: `docker-compose up --build`
7. Testa på mobil i samma nätverk
