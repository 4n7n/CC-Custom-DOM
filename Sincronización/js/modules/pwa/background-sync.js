// Gestor de sincronización en background
class BackgroundSync {
  constructor() {
    this.dbName = 'rama10-sync';
    this.dbVersion = 1;
    this.db = null;
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    
    this.init();
  }

  async init() {
    await this.initDB();
    this.setupEventListeners();
    this.loadPendingSync();
    
    // Registrar service worker para sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.registerSyncEvent();
    }
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store para datos pendientes de sincronización
        if (!db.objectStoreNames.contains('pendingSync')) {
          const syncStore = db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp');
          syncStore.createIndex('type', 'type');
          syncStore.createIndex('priority', 'priority');
        }
        
        // Store para datos sincronizados
        if (!db.objectStoreNames.contains('syncedData')) {
          const dataStore = db.createObjectStore('syncedData', { keyPath: 'id' });
          dataStore.createIndex('lastSync', 'lastSync');
          dataStore.createIndex('entity', 'entity');
        }
      };
    });
  }

  setupEventListeners() {
    // Detectar cambios de conectividad
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Listener para mensajes del Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'sync-complete') {
          this.handleSyncComplete(event.data.data);
        }
      });
    }
  }

  async registerSyncEvent() {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-sync');
    } catch (error) {
      console.warn('Background sync no disponible:', error);
    }
  }

  async loadPendingSync() {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['pendingSync'], 'readonly');
    const store = transaction.objectStore('pendingSync');
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        this.syncQueue = request.result || [];
        resolve();
      };
    });
  }

  // Agregar datos para sincronización
  async addToSync(data) {
    const syncItem = {
      ...data,
      timestamp: Date.now(),
      attempts: 0,
      priority: data.priority || 'normal',
      status: 'pending'
    };

    // Guardar en IndexedDB
    await this.saveToIndexedDB('pendingSync', syncItem);
    
    // Agregar a la cola en memoria
    this.syncQueue.push(syncItem);
    
    // Intentar sincronizar inmediatamente si hay conexión
    if (this.isOnline) {
      this.processPendingSync();
    }
    
    return syncItem;
  }

  async saveToIndexedDB(storeName, data) {
    if (!this.db) return;
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async processPendingSync() {
    if (!this.isOnline || this.syncQueue.length === 0) return;
    
    // Ordenar por prioridad y timestamp
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    const itemsToSync = this.syncQueue.filter(item => 
      item.status === 'pending' && item.attempts < 3
    );

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        await this.markAsSynced(item);
      } catch (error) {
        await this.handleSyncError(item, error);
      }
    }
  }

  async syncItem(item) {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        item.attempts++;
        
        const response = await fetch(item.url, {
          method: item.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...item.headers
          },
          body: JSON.stringify(item.data)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Actualizar con respuesta del servidor
        item.serverResponse = result;
        item.status = 'synced';
        item.syncedAt = Date.now();
        
        return result;
        
      } catch (error) {
        attempt++;
        
        if (attempt >= maxRetries) {
          throw error;
        }
        
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async markAsSynced(item) {
    // Remover de la cola
    this.syncQueue = this.syncQueue.filter(queueItem => queueItem.id !== item.id);
    
    // Remover de IndexedDB pendientes
    await this.removeFromIndexedDB('pendingSync', item.id);
    
    // Guardar en sincronizados
    await this.saveToIndexedDB('syncedData', {
      ...item,
      lastSync: Date.now()
    });
    
    // Notificar éxito
    this.dispatchSyncEvent('sync-success', item);
  }

  async handleSyncError(item, error) {
    console.warn('Error en sincronización:', error);
    
    item.status = 'error';
    item.error = error.message;
    item.lastAttempt = Date.now();
    
    // Si supera intentos máximos, marcar como fallido
    if (item.attempts >= 3) {
      item.status = 'failed';
      this.dispatchSyncEvent('sync-failed', item);
    }
    
    // Actualizar en IndexedDB
    await this.updateInIndexedDB('pendingSync', item);
  }

  async removeFromIndexedDB(storeName, id) {
    if (!this.db) return;
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateInIndexedDB(storeName, data) {
    if (!this.db) return;
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  dispatchSyncEvent(type, data) {
    const event = new CustomEvent(`rama10-${type}`, {
      detail: data
    });
    window.dispatchEvent(event);
  }

  handleSyncComplete(data) {
    console.log('Sincronización completada:', data);
    this.dispatchSyncEvent('sync-batch-complete', data);
  }

  // Métodos públicos para diferentes tipos de sincronización
  
  async syncPost(postData) {
    return this.addToSync({
      type: 'post',
      url: '/api/posts',
      method: 'POST',
      data: postData,
      priority: 'normal'
    });
  }

  async syncComment(commentData) {
    return this.addToSync({
      type: 'comment',
      url: '/api/comments',
      method: 'POST',
      data: commentData,
      priority: 'normal'
    });
  }

  async syncLike(likeData) {
    return this.addToSync({
      type: 'like',
      url: '/api/likes',
      method: 'POST',
      data: likeData,
      priority: 'low'
    });
  }

  async syncUserProfile(profileData) {
    return this.addToSync({
      type: 'profile',
      url: '/api/user/profile',
      method: 'PUT',
      data: profileData,
      priority: 'high'
    });
  }

  // Obtener estado de sincronización
  getSyncStatus() {
    const pending = this.syncQueue.filter(item => item.status === 'pending').length;
    const failed = this.syncQueue.filter(item => item.status === 'failed').length;
    
    return {
      total: this.syncQueue.length,
      pending,
      failed,
      isOnline: this.isOnline
    };
  }

  // Reintentar elementos fallidos
  async retryFailed() {
    const failedItems = this.syncQueue.filter(item => item.status === 'failed');
    
    for (const item of failedItems) {
      item.status = 'pending';
      item.attempts = 0;
      item.error = null;
      
      await this.updateInIndexedDB('pendingSync', item);
    }
    
    if (this.isOnline) {
      this.processPendingSync();
    }
  }

  // Limpiar datos sincronizados antiguos
  async cleanupSyncedData(daysOld = 30) {
    if (!this.db) return;
    
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const transaction = this.db.transaction(['syncedData'], 'readwrite');
    const store = transaction.objectStore('syncedData');
    const index = store.index('lastSync');
    const range = IDBKeyRange.upperBound(cutoffDate);
    
    return new Promise((resolve) => {
      const request = index.openCursor(range);
      let deletedCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`Limpiados ${deletedCount} registros antiguos`);
          resolve(deletedCount);
        }
      };
    });
  }
}

// Gestor de sincronización offline-first
class OfflineFirstSync extends BackgroundSync {
  constructor() {
    super();
    this.localCache = new Map();
    this.conflictResolution = new Map();
  }

  // Guardar datos localmente primero
  async saveOfflineFirst(entity, data) {
    const localId = `local_${Date.now()}_${Math.random()}`;
    
    // Guardar localmente
    const localData = {
      ...data,
      _localId: localId,
      _timestamp: Date.now(),
      _status: 'local'
    };
    
    this.localCache.set(localId, localData);
    
    // Programar para sincronización
    await this.addToSync({
      type: `create_${entity}`,
      url: `/api/${entity}`,
      method: 'POST',
      data: localData,
      priority: 'normal',
      localId
    });
    
    return localData;
  }

  // Resolver conflictos de sincronización
  registerConflictResolver(entity, resolver) {
    this.conflictResolution.set(entity, resolver);
  }

  async resolveConflict(localData, serverData, entity) {
    const resolver = this.conflictResolution.get(entity);
    
    if (resolver) {
      return resolver(localData, serverData);
    }
    
    // Resolución por defecto: servidor gana
    return serverData;
  }
}

// Exportar instancia global
const backgroundSync = new BackgroundSync();
const offlineFirstSync = new OfflineFirstSync();

export { backgroundSync, offlineFirstSync, BackgroundSync, OfflineFirstSync };
export default backgroundSync;