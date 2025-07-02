/**
 * Community Stories Platform - Service Worker
 * Funcionalidad offline y cache inteligente
 */

const CACHE_NAME = 'community-stories-v1.0.0';
const CACHE_VERSION = '1.0.0';

// URLs críticas para cachear inmediatamente
const CRITICAL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  
  // CSS crítico
  '/css/base/variables.css',
  '/css/base/reset.css',
  '/css/base/typography.css',
  '/css/base/utilities.css',
  '/css/base/accessibility.css',
  
  // CSS layout
  '/css/layout/community-grid.css',
  '/css/layout/story-container.css',
  '/css/layout/navigation.css',
  '/css/layout/footer.css',
  '/css/layout/sidebar.css',
  '/css/layout/responsive-base.css',
  
  // JavaScript core
  '/js/core/app.js',
  '/js/core/config.js',
  '/js/core/constants.js',
  '/js/core/utils.js',
  '/js/core/error-handler.js',
  '/js/core/event-bus.js',
  '/js/core/community-manager.js',
  '/js/core/story-loader.js',
  
  // Iconos críticos
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/favicon-32x32.png'
];

// URLs para cache dinámico
const DYNAMIC_CACHE_PATTERNS = [
  /^\/assets\/images\//,
  /^\/assets\/audio\//,
  /^\/assets\/video\//,
  /^\/stories\//,
  /^\/api\//
];

// URLs que no deben cachearse
const NO_CACHE_PATTERNS = [
  /^\/analytics\//,
  /^\/admin\//,
  /^\/api\/realtime\//,
  /\?.*no-cache/
];

/**
 * Instalación del Service Worker
 */
self.addEventListener('install', event => {
  console.log(`[SW] Instalando Service Worker v${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando recursos críticos');
        return cache.addAll(CRITICAL_URLS);
      })
      .then(() => {
        console.log('[SW] Recursos críticos cacheados exitosamente');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Error al cachear recursos críticos:', error);
      })
  );
});

/**
 * Activación del Service Worker
 */
self.addEventListener('activate', event => {
  console.log(`[SW] Activando Service Worker v${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log(`[SW] Eliminando cache obsoleto: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activado');
        return self.clients.claim();
      })
  );
});

/**
 * Interceptación de requests
 */
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorar requests que no deben cachearse
  if (shouldNotCache(url.pathname)) {
    return;
  }
  
  // Estrategia Cache First para recursos estáticos
  if (isCriticalResource(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  // Estrategia Network First para contenido dinámico
  if (isDynamicResource(url.pathname)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Estrategia Stale While Revalidate para el resto
  event.respondWith(staleWhileRevalidateStrategy(request));
});

/**
 * Estrategia Cache First
 */
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First falló:', error);
    return getOfflineFallback(request);
  }
}

/**
 * Estrategia Network First
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Red no disponible, buscando en cache:', request.url);
    const cachedResponse = await caches.match(request);
    return cachedResponse || getOfflineFallback(request);
  }
}

/**
 * Estrategia Stale While Revalidate
 */
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

/**
 * Funciones de utilidad
 */
function isCriticalResource(pathname) {
  return CRITICAL_URLS.some(url => pathname.endsWith(url.replace('/', '')));
}

function isDynamicResource(pathname) {
  return DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

function shouldNotCache(pathname) {
  return NO_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Página offline para navegación
  if (request.mode === 'navigate') {
    return caches.match('/offline.html') || 
           caches.match('/') || 
           new Response('Offline - Community Stories Platform', {
             status: 200,
             headers: { 'Content-Type': 'text/html' }
           });
  }
  
  // Imagen placeholder para imágenes
  if (request.destination === 'image') {
    return caches.match('/assets/images/offline-placeholder.png') ||
           new Response(getOfflineImageSVG(), {
             headers: { 'Content-Type': 'image/svg+xml' }
           });
  }
  
  // JSON offline para APIs
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'No hay conexión disponible',
      offline: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Offline', { status: 503 });
}

function getOfflineImageSVG() {
  return `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f0f0f0"/>
      <text x="100" y="100" text-anchor="middle" dy="0.35em" 
            font-family="Arial" font-size="14" fill="#666">
        Sin conexión
      </text>
    </svg>
  `;
}

/**
 * Manejo de mensajes desde la aplicación
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_VERSION':
        event.ports[0].postMessage({
          version: CACHE_VERSION,
          cacheName: CACHE_NAME
        });
        break;
        
      case 'CLEAR_CACHE':
        event.waitUntil(
          caches.delete(CACHE_NAME).then(() => {
            event.ports[0].postMessage({ cleared: true });
          })
        );
        break;
        
      case 'PREFETCH_STORY':
        if (event.data.storyUrl) {
          event.waitUntil(prefetchStory(event.data.storyUrl));
        }
        break;
    }
  }
});

/**
 * Prefetch de historias para offline
 */
async function prefetchStory(storyUrl) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(storyUrl);
    
    if (response.ok) {
      await cache.put(storyUrl, response.clone());
      console.log(`[SW] Historia prefetched: ${storyUrl}`);
      
      // Prefetch recursos relacionados
      const storyData = await response.json();
      if (storyData.assets) {
        const assetPromises = storyData.assets.map(asset => 
          fetch(asset.url).then(res => {
            if (res.ok) cache.put(asset.url, res);
          }).catch(() => {})
        );
        await Promise.allSettled(assetPromises);
      }
    }
  } catch (error) {
    console.error('[SW] Error prefetching story:', error);
  }
}

/**
 * Sincronización en background
 */
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sincronizar datos pendientes
    const pendingData = await getStoredData('pending-sync');
    if (pendingData && pendingData.length > 0) {
      for (const item of pendingData) {
        await syncDataItem(item);
      }
      await clearStoredData('pending-sync');
    }
  } catch (error) {
    console.error('[SW] Error en background sync:', error);
  }
}

// Utilidades para IndexedDB (simplificadas)
async function getStoredData(key) {
  // Implementación simplificada para demo
  return [];
}

async function clearStoredData(key) {
  // Implementación simplificada para demo
  return true;
}

async function syncDataItem(item) {
  // Implementación simplificada para demo
  return true;
}

console.log(`[SW] Service Worker Community Stories Platform v${CACHE_VERSION} cargado`);