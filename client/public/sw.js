const CACHE_VERSION = 'impex-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Assets to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key.startsWith('impex-') && !key.startsWith(CACHE_VERSION))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          // Offline fallback for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
    );
    return;
  }

  event.respondWith(fetch(request));
});

// Background sync for offline queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-queue-sync') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  // Open IndexedDB and process queued items
  const db = await openDB();
  const tx = db.transaction('offlineQueue', 'readonly');
  const store = tx.objectStore('offlineQueue');
  const items = await getAllFromStore(store);

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (response.ok) {
        // Remove from queue
        const deleteTx = db.transaction('offlineQueue', 'readwrite');
        deleteTx.objectStore('offlineQueue').delete(item.id);
      }
    } catch (err) {
      // Will retry next sync
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ImpExSpotDB', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineQueue')) {
        db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Push notification handler (extensible for future)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'ImpEx Spot', {
      body: data.body || '',
      icon: '/images/mascot.png',
      badge: '/images/mascot.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
