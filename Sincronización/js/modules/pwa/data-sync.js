// Sistema de sincronización de datos
class DataSync {
  constructor() {
    this.syncState = new Map();
    this.conflictResolvers = new Map();
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.lastSyncTime = null;
    this.syncInterval = 30000; // 30 segundos
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSyncState();
    this.startPeriodicSync();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleConnectivityChange();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleConnectivityChange();
    });
  }

  async loadSyncState() {
    try {
      const stored = localStorage.getItem('sync_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.lastSyncTime = state.lastSyncTime;
        this.syncQueue = state.syncQueue || [];
      }
    } catch (error) {
      console.warn('Error cargando estado de sync:', error);
    }
  }

  saveSyncState() {
    try {
      const state = {
        lastSyncTime: this.lastSyncTime,
        syncQueue: this.syncQueue
      };
      localStorage.setItem('sync_state', JSON.stringify(state));
    } catch (error) {
      console.warn('Error guardando estado de sync:', error);
    }
  }

  startPeriodicSync() {
    setInterval(() => {
      if (this.isOnline) {
        this.performSync();
      }
    }, this.syncInterval);
  }

  handleConnectivityChange() {
    if (this.isOnline) {
      this.performSync();
    }
  }

  // Registrar datos para sincronización
  async registerForSync(entity, data, operation = 'update') {
    const syncItem = {
      id: this.generateSyncId(),
      entity,
      data,
      operation,
      timestamp: Date.now(),
      attempts: 0,
      status: 'pending'
    };

    this.syncQueue.push(syncItem);
    this.saveSyncState();

    // Intentar sync inmediato si hay conexión
    if (this.isOnline) {
      await this.performSync();
    }

    return syncItem.id;
  }

  generateSyncId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async performSync() {
    if (this.syncQueue.length === 0) return;

    const pendingItems = this.syncQueue.filter(item => 
      item.status === 'pending' || item.status === 'retry'
    );

    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
      } catch (error) {
        this.handleSyncError(item, error);
      }
    }

    this.lastSyncTime = Date.now();
    this.saveSyncState();
  }

  async syncItem(item) {
    item.attempts++;
    item.status = 'syncing';

    try {
      const result = await this.executeSyncOperation(item);
      
      if (result.conflict) {
        await this.handleConflict(item, result);
      } else {
        item.status = 'completed';
        item.result = result;
        this.removeSyncItem(item.id);
      }
    } catch (error) {
      throw error;
    }
  }

  async executeSyncOperation(item) {
    const { entity, data, operation } = item;
    const endpoint = this.getEndpointForEntity(entity);
    
    let method, url;
    
    switch (operation) {
      case 'create':
        method = 'POST';
        url = endpoint;
        break;
      case 'update':
        method = 'PUT';
        url = `${endpoint}/${data.id}`;
        break;
      case 'delete':
        method = 'DELETE';
        url = `${endpoint}/${data.id}`;
        break;
      default:
        throw new Error(`Operación no soportada: ${operation}`);
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Timestamp': item.timestamp
      },
      body: operation !== 'delete' ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Verificar si hay conflicto
    if (result.lastModified && result.lastModified > item.timestamp) {
      return { conflict: true, serverData: result };
    }

    return result;
  }

  getEndpointForEntity(entity) {
    const endpoints = {
      posts: '/api/posts',
      comments: '/api/comments',
      likes: '/api/likes',
      user: '/api/user',
      community: '/api/community'
    };
    
    return endpoints[entity] || `/api/${entity}`;
  }

  async handleConflict(item, result) {
    const resolver = this.conflictResolvers.get(item.entity);
    
    if (resolver) {
      const resolution = await resolver(item.data, result.serverData);
      
      if (resolution) {
        // Actualizar con resolución
        item.data = resolution;
        item.status = 'retry';
      } else {
        // Conflicto no resuelto
        item.status = 'conflict';
        this.notifyConflict(item, result.serverData);
      }
    } else {
      // Sin resolver, usar datos del servidor
      item.status = 'completed';
      item.result = result.serverData;
      this.removeSyncItem(item.id);
      this.notifyServerWins(item, result.serverData);
    }
  }

  handleSyncError(item, error) {
    console.warn(`Error sincronizando ${item.entity}:`, error);
    
    if (item.attempts >= 3) {
      item.status = 'failed';
      this.notifysyncFailure(item, error);
    } else {
      item.status = 'retry';
      // Incrementar delay entre reintentos
      setTimeout(() => {
        this.syncItem(item);
      }, Math.pow(2, item.attempts) * 1000);
    }
  }

  removeSyncItem(id) {
    this.syncQueue = this.syncQueue.filter(item => item.id !== id);
    this.saveSyncState();
  }

  // Resolvedores de conflictos
  registerConflictResolver(entity, resolver) {
    this.conflictResolvers.set(entity, resolver);
  }

  // Resolver por timestamp (más reciente gana)
  timestampResolver(localData, serverData) {
    const localTime = localData.lastModified || localData.timestamp || 0;
    const serverTime = serverData.lastModified || serverData.timestamp || 0;
    
    return serverTime > localTime ? serverData : localData;
  }

  // Resolver por merge de propiedades
  mergeResolver(localData, serverData) {
    return {
      ...serverData,
      ...localData,
      lastModified: Math.max(
        localData.lastModified || 0,
        serverData.lastModified || 0
      )
    };
  }

  // Resolver manual (requiere intervención del usuario)
  async manualResolver(localData, serverData) {
    return new Promise((resolve) => {
      this.showConflictResolutionDialog(localData, serverData, resolve);
    });
  }

  showConflictResolutionDialog(localData, serverData, callback) {
    const dialog = document.createElement('div');
    dialog.className = 'conflict-dialog';
    dialog.innerHTML = `
      <div class="conflict-content">
        <h3>Conflicto de sincronización</h3>
        <p>Los datos han cambiado en el servidor. ¿Qué versión deseas conservar?</p>
        
        <div class="conflict-options">
          <div class="data-option">
            <h4>Tu versión local</h4>
            <pre>${JSON.stringify(localData, null, 2)}</pre>
            <button class="btn-local">Usar local</button>
          </div>
          
          <div class="data-option">
            <h4>Versión del servidor</h4>
            <pre>${JSON.stringify(serverData, null, 2)}</pre>
            <button class="btn-server">Usar servidor</button>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button class="btn-merge">Combinar cambios</button>
          <button class="btn-cancel">Cancelar</button>
        </div>
      </div>
    `;

    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    document.body.appendChild(dialog);

    // Event listeners
    dialog.querySelector('.btn-local').onclick = () => {
      callback(localData);
      dialog.remove();
    };

    dialog.querySelector('.btn-server').onclick = () => {
      callback(serverData);
      dialog.remove();
    };

    dialog.querySelector('.btn-merge').onclick = () => {
      const merged = this.mergeResolver(localData, serverData);
      callback(merged);
      dialog.remove();
    };

    dialog.querySelector('.btn-cancel').onclick = () => {
      callback(null);
      dialog.remove();
    };
  }

  // Notificaciones
  notifyConflict(item, serverData) {
    const notification = this.createNotification(
      'warning',
      'Conflicto de sincronización',
      `Los datos de ${item.entity} tienen conflictos`
    );
    
    this.showNotification(notification);
  }

  notifyServerWins(item, serverData) {
    const notification = this.createNotification(
      'info',
      'Datos actualizados',
      `Se usaron los datos más recientes del servidor para ${item.entity}`
    );
    
    this.showNotification(notification);
  }

  notifySyncFailure(item, error) {
    const notification = this.createNotification(
      'error',
      'Error de sincronización',
      `No se pudo sincronizar ${item.entity}: ${error.message}`
    );
    
    this.showNotification(notification);
  }

  createNotification(type, title, message) {
    const notification = document.createElement('div');
    notification.className = `sync-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon">${this.getIconForType(type)}</span>
        <span class="notification-title">${title}</span>
      </div>
      <div class="notification-message">${message}</div>
    `;

    return notification;
  }

  getIconForType(type) {
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    
    return icons[type] || 'ℹ️';
  }

  showNotification(notification) {
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 300px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // API pública
  async syncPost(postData, operation = 'update') {
    return await this.registerForSync('posts', postData, operation);
  }

  async syncComment(commentData, operation = 'create') {
    return await this.registerForSync('comments', commentData, operation);
  }

  async syncLike(likeData, operation = 'create') {
    return await this.registerForSync('likes', likeData, operation);
  }

  async syncUserProfile(profileData) {
    return await this.registerForSync('user', profileData, 'update');
  }

  getSyncStatus() {
    return {
      queueSize: this.syncQueue.length,
      lastSync: this.lastSyncTime,
      isOnline: this.isOnline,
      pending: this.syncQueue.filter(item => item.status === 'pending').length,
      conflicts: this.syncQueue.filter(item => item.status === 'conflict').length,
      failed: this.syncQueue.filter(item => item.status === 'failed').length
    };
  }

  async forcesync() {
    await this.performSync();
  }

  clearFailedItems() {
    this.syncQueue = this.syncQueue.filter(item => item.status !== 'failed');
    this.saveSyncState();
  }

  retryFailedItems() {
    this.syncQueue.forEach(item => {
      if (item.status === 'failed') {
        item.status = 'retry';
        item.attempts = 0;
      }
    });
    
    if (this.isOnline) {
      this.performSync();
    }
  }
}

// Instancia global
const dataSync = new DataSync();

// Registrar resolvers por defecto
dataSync.registerConflictResolver('posts', dataSync.timestampResolver);
dataSync.registerConflictResolver('comments', dataSync.timestampResolver);
dataSync.registerConflictResolver('user', dataSync.manualResolver);

export { dataSync, DataSync };
export default dataSync;