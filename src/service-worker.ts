/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from "$service-worker";

const CACHE_NAME = `food-management-${version}`;

// Assets to cache immediately
const PRECACHE_ASSETS = [...build, ...files];

// API routes to cache
const API_CACHE_ROUTES = ["/api/products", "/api/shopping", "/api/recipes"];

// Install: precache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(event.request));
});

/**
 * Handle API requests with network-first, cache fallback strategy
 */
async function handleApiRequest(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful GET requests for API routes
    if (response.ok && isApiCacheRoute(request.url)) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // No cache, return offline response
    return new Response(
      JSON.stringify({ error: "Offline", message: "No cached data available" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Handle static asset requests with network-first, cache fallback strategy
 */
async function handleStaticRequest(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Network failed, return offline page if it's a navigation request
    if (request.mode === "navigate") {
      const offlinePage = await cache.match("/");
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response("Offline", { status: 503 });
  }
}

/**
 * Check if URL is an API route we want to cache
 */
function isApiCacheRoute(url: string): boolean {
  const pathname = new URL(url).pathname;
  return API_CACHE_ROUTES.some((route) => pathname.startsWith(route));
}

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
