const CACHE_NAME = 'rama10-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Recursos críticos para cachear
const CRITICAL_RESOURCES = [
  '/',
  '/offline.html',
  '/css/main.css',
  '/js/app.js',
  '/icons/icon-192x192.png',
  '/manifest.json'
];

// Estrategias de cache
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CRITICAL_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

// Activación y limpieza de caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    handleRequest(event.request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Estrategia por tipo de recurso
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request);
  }
  
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff2?)$/)) {
    return handleStaticAsset(request);
  }
  
  return handlePageRequest(request);
}

// Manejar peticiones de API
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Datos no disponibles offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Manejar recursos estáticos
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Resource not available offline', { status: 503 });
  }
}

// Manejar páginas
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return caches.match(OFFLINE_URL);
  }
}

// Sincronización en background
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    const pendingData = await getStoredData('pendingSync');
    
    if (pendingData && pendingData.length > 0) {
      for (const item of pendingData) {
        await syncItem(item);
      }
      
      await clearStoredData('pendingSync');
      
      // Notificar a los clientes
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'sync-complete',
            data: { synced: pendingData.length }
          });
        });
      });
    }
  } catch (error) {
    console.error('Error en sincronización:', error);
  }
}

async function syncItem(item) {
  const response = await fetch(item.url, {
    method: item.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...item.headers
    },
    body: JSON.stringify(item.data)
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }
  
  return response.json();
}

// Utilidades para IndexedDB
async function getStoredData(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rama10-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['sync'], 'readonly');
      const store = transaction.objectStore('sync');
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => resolve(getRequest.result?.data);
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sync')) {
        db.createObjectStore('sync', { keyPath: 'id' });
      }
    };
  });
}

async function clearStoredData(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rama10-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['sync'], 'readwrite');
      const store = transaction.objectStore('sync');
      const deleteRequest = store.delete(key);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Notificaciones push
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de RAMA 10',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('RAMA 10', options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});