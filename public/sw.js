// Service Worker for Solidify
const CACHE_NAME = "solidify-cache-v1";
const CONFIG_CACHE = "solidify-config";
const PROXY_TTL = 5 * 60 * 1000; // 5 minutes in ms

let targetUrl = null;
let expiresAt = 0;

// Load persisted config on startup
async function loadConfig() {
  try {
    const cache = await caches.open(CONFIG_CACHE);
    const response = await cache.match("/__solidify_config__");
    if (response) {
      const data = await response.json();
      targetUrl = data.targetUrl;
      expiresAt = data.expiresAt || 0;
    }
  } catch {
    // Config cache may not exist yet
  }
}
loadConfig();

// Listen for target URL from the activation page
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_TARGET") {
    targetUrl = event.data.targetUrl;
    expiresAt = Date.now() + PROXY_TTL;
    caches.open(CONFIG_CACHE).then(async (cache) => {
      try {
        await cache.put("/__solidify_config__", new Response(JSON.stringify({ targetUrl, expiresAt })));
      } catch {}
    });
  }
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== CONFIG_CACHE && cacheName.startsWith("solidify-")) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => clients.claim()),
  );
});

// Intercept all requests
self.addEventListener("fetch", (event) => {
  // Don't intercept WebSocket, SW internal, or Next.js internal requests
  if (
    event.request.headers.get("upgrade") === "websocket" ||
    event.request.url.includes("/sw.js") ||
    event.request.url.includes("/__solidify_config__") ||
    event.request.url.includes("/_next/")
  ) {
    return;
  }

  event.respondWith(proxyAndCache(event.request));
});

function shouldProxy() {
  return targetUrl && Date.now() < expiresAt;
}

async function proxyAndCache(request) {
  // Build proxied request only if target is still valid
  let fetchRequest = request;

  if (shouldProxy()) {
    const newHeaders = new Headers(request.headers);
    newHeaders.set("X-Solidify-Target", targetUrl);
    fetchRequest = new Request(request, { headers: newHeaders });
  }

  const cache = await caches.open(CACHE_NAME);

  if (request.method === "GET") {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Cache-first: return immediately, refresh in background
      if (shouldProxy()) {
        fetch(fetchRequest)
          .then(async (response) => {
            if (response.status === 200) {
              try {
                await cache.put(request, response.clone());
              } catch {}
            }
          })
          .catch(() => {});
      }
      return cachedResponse;
    }

    // No cache — fetch from network
    try {
      const networkResponse = await fetch(fetchRequest);
      if (networkResponse.status === 200) {
        try {
          await cache.put(request, networkResponse.clone());
        } catch {}
      }
      return networkResponse;
    } catch {
      const fallback = await cache.match(request);
      return fallback || new Response("Proxy Error", { status: 502 });
    }
  }

  // Non-GET: pass through
  try {
    return await fetch(fetchRequest);
  } catch {
    return new Response("Proxy Error", { status: 502 });
  }
}
