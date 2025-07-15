// Estrategias de caché avanzadas
class CacheStrategy {
  constructor() {
    this.strategies = new Map();
    this.cacheNames = {
      static: 'rama10-static-v1',
      dynamic: 'rama10-dynamic-v1',
      api: 'rama10-api-v1',
      images: 'rama10-images-v1'
    };
    
    this.init();
  }

  init() {
    this.setupStrategies();
    this.setupCacheCleanup();
  }

  setupStrategies() {
    // Cache First - Para recursos estáticos
    this.strategies.set('cache-first', this.cacheFirst.bind(this));
    
    // Network First - Para contenido dinámico
    this.strategies.set('network-first', this.networkFirst.bind(this));
    
    // Stale While Revalidate - Para balance entre velocidad y frescura
    this.strategies.set('stale-while-revalidate', this.staleWhileRevalidate.bind(this));
    
    // Network Only - Para datos críticos
    this.strategies.set('network-only', this.networkOnly.bind(this));
    
    // Cache Only - Para recursos offline
    this.strategies.set('cache-only', this.cacheOnly.bind(this));
  }

  // Estrategia Cache First
  async cacheFirst(request, cacheName = this.cacheNames.static) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      console.warn('Cache First fallback:', error);
      return new Response('Resource not available', { status: 503 });
    }
  }

  // Estrategia Network First
  async networkFirst(request, cacheName = this.cacheNames.dynamic) {
    const cache = await caches.open(cacheName);
    
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      console.warn('Network failed, trying cache:', error);
      
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return new Response('Content not available offline', { 
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }

  // Estrategia Stale While Revalidate
  async staleWhileRevalidate(request, cacheName = this.cacheNames.api) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Actualizar en background
    const fetchPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(error => {
      console.warn('Background update failed:', error);
    });
    
    // Devolver cache inmediatamente si existe
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no hay cache, esperar la red
    return fetchPromise;
  }

  // Estrategia Network Only
  async networkOnly(request) {
    try {
      return await fetch(request);
    } catch (error) {
      return new Response('Network required', { status: 503 });
    }
  }

  // Estrategia Cache Only
  async cacheOnly(request, cacheName = this.cacheNames.static) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    return cachedResponse || new Response('Not cached', { status: 404 });
  }

  // Determinar estrategia automáticamente
  getStrategyForRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Recursos estáticos - Cache First
    if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf)$/)) {
      return {
        strategy: 'cache-first',
        cacheName: this.cacheNames.static,
        maxAge: 86400000 // 24 horas
      };
    }
    
    // API endpoints - Network First con SWR para GET
    if (pathname.startsWith('/api/')) {
      if (request.method === 'GET') {
        return {
          strategy: 'stale-while-revalidate',
          cacheName: this.cacheNames.api,
          maxAge: 300000 // 5 minutos
        };
      } else {
        return {
          strategy: 'network-only'
        };
      }
    }
    
    // Imágenes - Cache First con compresión
    if (pathname.match(/\.(webp|avif)$/) || url.searchParams.has('format')) {
      return {
        strategy: 'cache-first',
        cacheName: this.cacheNames.images,
        maxAge: 604800000, // 7 días
        optimize: true
      };
    }
    
    // Páginas HTML - Network First
    if (pathname.endsWith('/') || pathname.endsWith('.html')) {
      return {
        strategy: 'network-first',
        cacheName: this.cacheNames.dynamic,
        maxAge: 3600000 // 1 hora
      };
    }
    
    // Por defecto - Stale While Revalidate
    return {
      strategy: 'stale-while-revalidate',
      cacheName: this.cacheNames.dynamic,
      maxAge: 300000 // 5 minutos
    };
  }

  // Manejar request con estrategia automática
  async handleRequest(request) {
    const config = this.getStrategyForRequest(request);
    const strategy = this.strategies.get(config.strategy);
    
    if (!strategy) {
      console.warn(`Estrategia no encontrada: ${config.strategy}`);
      return fetch(request);
    }
    
    // Verificar expiración si está en cache
    if (config.maxAge) {
      const shouldRefresh = await this.shouldRefreshCache(request, config);
      if (shouldRefresh && config.strategy === 'cache-first') {
        // Cambiar a network-first para refrescar
        return this.networkFirst(request, config.cacheName);
      }
    }
    
    let response = await strategy(request, config.cacheName);
    
    // Optimizar respuesta si es necesario
    if (config.optimize && response.ok) {
      response = await this.optimizeResponse(response, request);
    }
    
    return response;
  }

  // Verificar si el cache debe refrescarse
  async shouldRefreshCache(request, config) {
    const cache = await caches.open(config.cacheName);
    const cachedResponse = await cache.match(request);
    
    if (!cachedResponse) return true;
    
    const cacheDate = cachedResponse.headers.get('date');
    if (!cacheDate) return true;
    
    const age = Date.now() - new Date(cacheDate).getTime();
    return age > config.maxAge;
  }

  // Optimizar respuesta (comprimir imágenes, minificar, etc.)
  async optimizeResponse(response, request) {
    const contentType = response.headers.get('content-type') || '';
    
    // Optimizar imágenes
    if (contentType.startsWith('image/')) {
      return this.optimizeImage(response, request);
    }
    
    // Comprimir JSON
    if (contentType.includes('application/json')) {
      return this.compressJSON(response);
    }
    
    return response;
  }

  async optimizeImage(response, request) {
    // Verificar si el navegador soporta WebP
    const acceptHeader = request.headers.get('accept') || '';
    const supportsWebP = acceptHeader.includes('image/webp');
    
    if (supportsWebP && !request.url.includes('.webp')) {
      // Aquí podríamos convertir a WebP si tuviéramos un servicio
      // Por ahora, solo añadimos headers de optimización
      const optimizedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...response.headers,
          'Cache-Control': 'public, max-age=604800',
          'X-Optimized': 'true'
        }
      });
      
      return optimizedResponse;
    }
    
    return response;
  }

  async compressJSON(response) {
    try {
      const data = await response.json();
      const compressed = JSON.stringify(data);
      
      return new Response(compressed, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...response.headers,
          'Content-Length': compressed.length.toString(),
          'X-Compressed': 'true'
        }
      });
    } catch (error) {
      console.warn('Error comprimiendo JSON:', error);
      return response;
    }
  }

  // Limpiar caches antiguos
  setupCacheCleanup() {
    // Limpiar cada 24 horas
    setInterval(() => {
      this.cleanupExpiredCaches();
    }, 86400000);
  }

  async cleanupExpiredCaches() {
    const cacheNames = await caches.keys();
    const currentCaches = Object.values(this.cacheNames);
    
    // Eliminar caches obsoletos
    for (const cacheName of cacheNames) {
      if (!currentCaches.includes(cacheName)) {
        console.log(`Eliminando cache obsoleto: ${cacheName}`);
        await caches.delete(cacheName);
      }
    }
    
    // Limpiar entradas expiradas en caches actuales
    for (const cacheName of currentCaches) {
      await this.cleanupCacheEntries(cacheName);
    }
  }

  async cleanupCacheEntries(cacheName) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const age = Date.now() - new Date(dateHeader).getTime();
          
          // Eliminar si tiene más de 7 días (configurable por tipo)
          const maxAge = this.getMaxAgeForCache(cacheName);
          if (age > maxAge) {
            console.log(`Eliminando entrada expirada: ${request.url}`);
            await cache.delete(request);
          }
        }
      }
    }
  }

  getMaxAgeForCache(cacheName) {
    const maxAges = {
      [this.cacheNames.static]: 604800000, // 7 días
      [this.cacheNames.dynamic]: 86400000, // 1 día
      [this.cacheNames.api]: 3600000, // 1 hora
      [this.cacheNames.images]: 1209600000 // 14 días
    };
    
    return maxAges[cacheName] || 86400000; // 1 día por defecto
  }

  // Precachear recursos críticos
  async precacheResources(resources) {
    const cache = await caches.open(this.cacheNames.static);
    
    const precachePromises = resources.map(async (resource) => {
      try {
        const response = await fetch(resource);
        if (response.ok) {
          await cache.put(resource, response);
          console.log(`Precacheado: ${resource}`);
        }
      } catch (error) {
        console.warn(`Error precacheando ${resource}:`, error);
      }
    });
    
    await Promise.allSettled(precachePromises);
  }

  // Estadísticas de cache
  async getCacheStats() {
    const stats = {};
    
    for (const [name, cacheName] of Object.entries(this.cacheNames)) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      stats[name] = {
        entries: requests.length,
        size: await this.calculateCacheSize(cache, requests)
      };
    }
    
    return stats;
  }

  async calculateCacheSize(cache, requests) {
    let totalSize = 0;
    
    for (const request of requests.slice(0, 10)) { // Muestra de 10 para no bloquear
      try {
        const response = await cache.match(request);
        if (response && response.headers.get('content-length')) {
          totalSize += parseInt(response.headers.get('content-length'));
        }
      } catch (error) {
        // Ignorar errores de cálculo
      }
    }
    
    return Math.round(totalSize / 1024); // KB
  }

  // API pública
  async clearCache(cacheName = null) {
    if (cacheName) {
      await caches.delete(cacheName);
    } else {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }

  async updateCache(request, response) {
    const config = this.getStrategyForRequest(request);
    const cache = await caches.open(config.cacheName);
    await cache.put(request, response);
  }

  getStrategy(name) {
    return this.strategies.get(name);
  }

  // Configuración personalizada
  setCustomStrategy(name, strategyFunction) {
    this.strategies.set(name, strategyFunction);
  }

  setCacheName(type, name) {
    this.cacheNames[type] = name;
  }
}

// Instancia global
const cacheStrategy = new CacheStrategy();

// Recursos críticos para precachear
const criticalResources = [
  '/',
  '/css/main.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png'
];

// Precachear recursos críticos al inicializar
if ('caches' in window) {
  cacheStrategy.precacheResources(criticalResources);
}

export { cacheStrategy, CacheStrategy };
export default cacheStrategy;