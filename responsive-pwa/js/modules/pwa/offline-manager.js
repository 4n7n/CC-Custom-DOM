// Gestor de funcionalidades offline
class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.offlineQueue = [];
    this.offlineData = new Map();
    this.cacheManager = new CacheManager();
    this.storageManager = new StorageManager();
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeOfflineCapabilities();
    this.loadOfflineData();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });

    // Escuchar eventos de la aplicación para cachear
    window.addEventListener('app-data-changed', (event) => {
      this.cacheAppData(event.detail);
    });
  }

  async initializeOfflineCapabilities() {
    await this.cacheManager.initialize();
    await this.storageManager.initialize();
    
    // Precachear datos críticos
    await this.precacheEssentialData();
  }

  async precacheEssentialData() {
    const essentialEndpoints = [
      '/api/user/profile',
      '/api/community/recent',
      '/api/dashboard/widgets'
    ];

    for (const endpoint of essentialEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          await this.storageManager.store(`cache_${endpoint}`, data);
        }
      } catch (error) {
        console.warn(`No se pudo precachear ${endpoint}:`, error);
      }
    }
  }

  handleOnline() {
    this.isOnline = true;
    this.showConnectivityStatus('online');
    this.processOfflineQueue();
    this.syncOfflineChanges();
  }

  handleOffline() {
    this.isOnline = false;
    this.showConnectivityStatus('offline');
    this.enableOfflineMode();
  }

  showConnectivityStatus(status) {
    const notification = document.createElement('div');
    notification.className = `connectivity-notification ${status}`;
    
    if (status === 'online') {
      notification.innerHTML = `
        <div class="notification-content">
          <span class="status-icon">🌐</span>
          <span>Conexión restablecida</span>
        </div>
      `;
      notification.style.background = '#10b981';
    } else {
      notification.innerHTML = `
        <div class="notification-content">
          <span class="status-icon">📱</span>
          <span>Modo offline activado</span>
        </div>
      `;
      notification.style.background = '#f59e0b';
    }

    notification.style.cssText += `
      position: fixed;
      top: 20px;
      right: 20px;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
    }, 3000);
  }

  enableOfflineMode() {
    document.body.classList.add('offline-mode');
    
    // Mostrar indicadores offline en la UI
    this.updateUIForOfflineMode();
    
    // Interceptar formularios para queue
    this.setupOfflineFormHandling();
  }

  updateUIForOfflineMode() {
    // Agregar badges offline a acciones
    const actionButtons = document.querySelectorAll('button[data-action], .post-action, .submit-btn');
    
    actionButtons.forEach(button => {
      if (!button.querySelector('.offline-badge')) {
        const badge = document.createElement('span');
        badge.className = 'offline-badge';
        badge.textContent = 'Offline';
        badge.style.cssText = `
          position: absolute;
          top: -4px;
          right: -4px;
          background: #f59e0b;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        `;
        
        button.style.position = 'relative';
        button.appendChild(badge);
      }
    });
  }

  setupOfflineFormHandling() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!this.isOnline) {
          e.preventDefault();
          this.queueFormSubmission(form);
        }
      });
    });
  }

  queueFormSubmission(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const queueItem = {
      id: Date.now(),
      type: 'form-submission',
      url: form.action || window.location.pathname,
      method: form.method || 'POST',
      data: data,
      timestamp: Date.now()
    };

    this.offlineQueue.push(queueItem);
    this.storageManager.store('offline_queue', this.offlineQueue);
    
    this.showQueuedMessage(form);
  }

  showQueuedMessage(form) {
    const message = document.createElement('div');
    message.className = 'queued-message';
    message.innerHTML = `
      <div class="queued-content">
        <span class="queued-icon">⏳</span>
        <span>Guardado. Se enviará cuando haya conexión</span>
      </div>
    `;
    
    message.style.cssText = `
      background: #3b82f6;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 12px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    form.appendChild(message);
    
    setTimeout(() => {
      message.remove();
    }, 5000);
  }

  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    const successfulItems = [];
    
    for (const item of this.offlineQueue) {
      try {
        await this.processQueueItem(item);
        successfulItems.push(item);
      } catch (error) {
        console.warn('Error procesando item offline:', error);
      }
    }

    // Remover items procesados exitosamente
    this.offlineQueue = this.offlineQueue.filter(
      item => !successfulItems.includes(item)
    );
    
    await this.storageManager.store('offline_queue', this.offlineQueue);
    
    if (successfulItems.length > 0) {
      this.showSyncSuccessMessage(successfulItems.length);
    }
  }

  async processQueueItem(item) {
    const response = await fetch(item.url, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  showSyncSuccessMessage(count) {
    const message = document.createElement('div');
    message.className = 'sync-success';
    message.innerHTML = `
      <div class="sync-content">
        <span class="sync-icon">✅</span>
        <span>Sincronizados ${count} elementos</span>
      </div>
    `;
    
    message.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      message.style.transform = 'translateY(0)';
    }, 100);

    setTimeout(() => {
      message.style.transform = 'translateY(100%)';
      setTimeout(() => message.remove(), 300);
    }, 4000);
  }

  async syncOfflineChanges() {
    // Sincronizar cambios locales con el servidor
    const localChanges = await this.storageManager.get('local_changes') || [];
    
    for (const change of localChanges) {
      try {
        await this.syncChange(change);
      } catch (error) {
        console.warn('Error sincronizando cambio:', error);
      }
    }
  }

  async syncChange(change) {
    const response = await fetch(change.endpoint, {
      method: change.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(change.data)
    });

    if (response.ok) {
      // Remover cambio sincronizado
      const localChanges = await this.storageManager.get('local_changes') || [];
      const updatedChanges = localChanges.filter(c => c.id !== change.id);
      await this.storageManager.store('local_changes', updatedChanges);
    }
  }

  async loadOfflineData() {
    const storedQueue = await this.storageManager.get('offline_queue');
    if (storedQueue) {
      this.offlineQueue = storedQueue;
    }
  }

  async cacheAppData(data) {
    await this.storageManager.store(`app_data_${data.type}`, data.payload);
  }

  async getOfflineData(key) {
    return await this.storageManager.get(key);
  }

  // API pública para otros módulos
  async storeForOffline(key, data) {
    return await this.storageManager.store(key, data);
  }

  async getFromOfflineCache(key) {
    return await this.storageManager.get(key);
  }

  isOffline() {
    return !this.isOnline;
  }

  getQueueSize() {
    return this.offlineQueue.length;
  }

  clearOfflineQueue() {
    this.offlineQueue = [];
    this.storageManager.store('offline_queue', []);
  }
}

// Gestor de caché
class CacheManager {
  constructor() {
    this.cacheName = 'rama10-offline-v1';
    this.cache = null;
  }

  async initialize() {
    if ('caches' in window) {
      this.cache = await caches.open(this.cacheName);
    }
  }

  async store(request, response) {
    if (this.cache) {
      await this.cache.put(request, response);
    }
  }

  async get(request) {
    if (this.cache) {
      return await this.cache.match(request);
    }
    return null;
  }
}

// Gestor de almacenamiento local
class StorageManager {
  constructor() {
    this.dbName = 'rama10-offline';
    this.dbVersion = 1;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('offline_data')) {
          db.createObjectStore('offline_data', { keyPath: 'key' });
        }
      };
    });
  }

  async store(key, data) {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(key) {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Instancia global
const offlineManager = new OfflineManager();

export { offlineManager, OfflineManager };
export default offlineManager;