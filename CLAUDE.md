# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A self-hosted web app for food/meal planning and shopping lists. No authentication - anyone with the link has access. Features a shared shopping list with real-time sync and offline support.

**Stack:** Node.js + Express + SvelteKit + SQLite (better-sqlite3) + shadcn-svelte
**Design:** Mobile-first PWA
**Language:** Documentation in Swedish, code in English

## Commands

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
docker-compose up --build  # Build and run Docker container

# Docker runs on port 8500
```

## Architecture

### Backend (`server/`)

- `index.js` - Express server with WebSocket support
- `db/` - SQLite database with better-sqlite3
- `routes/` - REST API endpoints (products, recipes, shopping)
- `services/` - Recipe URL parser (JSON-LD), WebSocket sync logic

### Frontend (`src/`)

- SvelteKit app with shadcn-svelte components
- `lib/components/` - UI components (ProductList, ShoppingList, RecipeCard, etc.)
- `lib/stores/` - Svelte stores for products, recipes, shopping, sync status
- `lib/db/idb.js` - IndexedDB for offline support
- `routes/` - Pages: `/` (shopping list), `/products`, `/recipes`
- `service-worker.js` - Caches assets and API responses for offline use

### Data Flow

1. Changes write to IndexedDB first (offline-first)
2. Sync to SQLite server when online
3. WebSocket broadcasts changes to all connected clients
4. Conflict resolution: latest timestamp wins

### Database Tables

- `store_categories` - Shopping categories with sort order
- `products` - Product catalog with default units
- `shopping_items` - Current shopping list
- `recipes` - Recipe storage with servings
- `recipe_ingredients` - Recipe ingredients (linked to products or custom)
- `sync_log` - Change tracking for sync

### API Structure

- `/api/products` - CRUD + export/import JSON
- `/api/shopping` - List management + reset
- `/api/recipes` - CRUD + URL import + add-to-shopping
- `/api/backup` - Full backup/restore
- `/ws` - WebSocket for real-time sync

## Key Design Decisions

- One shared list for all users (no per-user lists)
- Items created/deleted rather than toggled with `is_added` flag
- Quantities and units always visible on items
- Notes displayed inline (no expand/collapse)
- Recipes have no images, ratings, or tags - just title, ingredients, instructions
- Checked items cleared via manual "Reset list" action
