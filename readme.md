# Food Management

En self-hosted webbapp för matplanering och inköpslistor med realtidssynk och offline-stöd.

## Funktioner

- **Delad inköpslista** - Synkas i realtid mellan alla enheter
- **Produktkatalog** - Hantera produkter med kategorier och standardenheter
- **Recept** - Spara recept med ingredienser och instruktioner
- **URL-import** - Importera recept från webbsidor (JSON-LD)
- **Portionsskalning** - Skala ingredienser efter antal portioner
- **Offline-stöd** - Fungerar utan internet, synkar när uppkoppling finns
- **Export/import** - Säkerhetskopiera och återställ all data

## Tech Stack

- **Frontend:** SvelteKit + shadcn-svelte
- **Backend:** Node.js + Express + WebSocket
- **Databas:** SQLite (better-sqlite3)
- **Offline:** IndexedDB + Service Worker
- **Deploy:** Docker

## Kom igång

### Utveckling

```bash
npm install
npm run dev
```

### Docker

```bash
docker-compose up --build
```

Appen körs på port **8500**.

## Vyer

| Sökväg          | Beskrivning                                |
| --------------- | ------------------------------------------ |
| `/`             | Inköpslista - huvudvy för att handla       |
| `/products`     | Produktkatalog - lägg till varor på listan |
| `/recipes`      | Receptlista                                |
| `/recipes/new`  | Skapa nytt recept                          |
| `/recipes/[id]` | Visa recept med skalning                   |

## API

- `GET/POST/PUT/DELETE /api/products` - Produkter
- `GET/POST/PUT/DELETE /api/shopping` - Inköpslista
- `GET/POST/PUT/DELETE /api/recipes` - Recept
- `GET /api/backup` / `POST /api/restore` - Backup
- `WS /ws` - Realtidssynk

## Design

- **Ingen autentisering** - Öppen för alla med länk
- **En delad lista** - Samma lista för alla användare
- **Mobile-first** - Optimerad för telefon
- **PWA** - Kan installeras som app
