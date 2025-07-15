// Registro y gestión del Service Worker
class ServiceWorkerManager {
  constructor() {
    this.swRegistration = null;
    this.isUpdateAvailable = false;
    this.isOnline = navigator.onLine;
    this.updateCheckInterval = 60000; // 1 minuto
    
    this.init();
  }

  async init() {
    if (!this.isServiceWorkerSupported()) {
      console.warn('Service Workers no soportados en este navegador');
      return;
    }

    try {
      await this.registerServiceWorker();
      this.setupEventListeners();
      this.setupUpdateChecker();
      this.setupSyncListener();
    } catch (error) {
      console.error('Error inicializando Service Worker:', error);
    }
  }

  isServiceWorkerSupported() {
    return 'serviceWorker' in navigator;
  }

  async registerServiceWorker() {
    try {
      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none' // Siempre verificar actualizaciones
      });

      console.log('Service Worker registrado:', this.swRegistration);

      // Verificar si hay una actualización esperando
      if (this.swRegistration.waiting) {
        this.showUpdatePrompt();
      }

      // Verificar actualizaciones en el registro
      this.swRegistration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      return this.swRegistration;
    } catch (error) {
      console.error('Error registrando Service Worker:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Escuchar cambios en el estado del Service Worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });

    // Detectar cambios de conectividad
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyConnectivityChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyConnectivityChange(false);
    });
  }

  handleUpdateFound() {
    const newWorker = this.swRegistration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // Nueva versión disponible
          this.isUpdateAvailable = true;
          this.showUpdatePrompt();
        } else {
          // Primera instalación
          this.showInstallSuccessMessage();
        }
      }
    });
  }

  showUpdatePrompt() {
    const updateBanner = this.createUpdateBanner();
    document.body.appendChild(updateBanner);
  }

  createUpdateBanner() {
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.innerHTML = `
      <div class="update-content">
        <div class="update-icon">🔄</div>
        <div class="update-text">
          <h4>Nueva versión disponible</h4>
          <p>Actualiza para obtener las últimas funciones</p>
        </div>
        <div class="update-actions">
          <button class="update-btn" onclick="this.closest('.update-banner').swManager.applyUpdate()">
            Actualizar
          </button>
          <button class="update-dismiss" onclick="this.closest('.update-banner').remove()">
            Más tarde
          </button>
        </div>
      </div>
    `;

    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      z-index: 10000;
      transform: translateY(-100%);
      transition: transform 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;

    banner.swManager = this;

    // Animar entrada
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
    }, 100);

    return banner;
  }

  async applyUpdate() {
    if (!this.swRegistration || !this.swRegistration.waiting) return;

    try {
      // Mostrar indicador de carga
      this.showUpdateProgress();

      // Enviar mensaje al SW para que tome control
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Esperar a que el nuevo SW tome control
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      });

      // Recargar la página
      window.location.reload();
    } catch (error) {
      console.error('Error aplicando actualización:', error);
      this.showUpdateError();
    }
  }

  showUpdateProgress() {
    const progress = document.createElement('div');
    progress.className = 'update-progress';
    progress.innerHTML = `
      <div class="progress-content">
        <div class="spinner"></div>
        <span>Aplicando actualización...</span>
      </div>
    `;

    progress.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      color: white;
    `;

    document.body.appendChild(progress);
  }

  showInstallSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'install-success';
    message.innerHTML = `
      <div class="success-content">
        <div class="success-icon">✅</div>
        <h4>¡App instalada correctamente!</h4>
        <p>Ya puedes usarla sin conexión</p>
      </div>
    `;

    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    document.body.appendChild(message);

    // Animar entrada
    setTimeout(() => {
      message.style.transform = 'translateX(0)';
    }, 100);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
      message.style.transform = 'translateX(100%)';
      setTimeout(() => message.remove(), 300);
    }, 5000);
  }

  setupUpdateChecker() {
    // Verificar actualizaciones periódicamente
    setInterval(() => {
      if (this.isOnline && this.swRegistration) {
        this.swRegistration.update();
      }
    }, this.updateCheckInterval);

    // Verificar cuando la app vuelve a estar visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline && this.swRegistration) {
        this.swRegistration.update();
      }
    });
  }

  setupSyncListener() {
    // Escuchar eventos de sincronización
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'sync-status') {
        this.handleSyncStatus(event.data);
      }
    });
  }

  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'sync-complete':
        this.showSyncCompleteNotification(data);
        break;
      case 'cache-updated':
        this.handleCacheUpdate(data);
        break;
      case 'offline-fallback':
        this.showOfflineNotification();
        break;
      default:
        console.log('Mensaje del SW:', event.data);
    }
  }

  handleSyncStatus(data) {
    const { status, pending, failed } = data;
    
    if (status === 'syncing' && pending > 0) {
      this.showSyncIndicator(pending);
    } else if (status === 'complete') {
      this.hideSyncIndicator();
    } else if (status === 'failed' && failed > 0) {
      this.showSyncError(failed);
    }
  }

  showSyncCompleteNotification(data) {
    const notification = document.createElement('div');
    notification.className = 'sync-notification';
    notification.innerHTML = `
      <div class="sync-content">
        <div class="sync-icon">✅</div>
        <span>Sincronizado: ${data.synced} elementos</span>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      z-index: 10000;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
    }, 100);

    setTimeout(() => {
      notification.style.transform = 'translateY(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  showSyncIndicator(pending) {
    let indicator = document.querySelector('.sync-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'sync-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #3b82f6;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      
      document.body.appendChild(indicator);
    }

    indicator.innerHTML = `
      <div class="sync-spinner"></div>
      <span>Sincronizando ${pending} elementos...</span>
    `;
  }

  hideSyncIndicator() {
    const indicator = document.querySelector('.sync-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
      <div class="offline-content">
        <div class="offline-icon">📱</div>
        <span>Modo offline activado</span>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #f59e0b;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
      z-index: 10000;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  notifyConnectivityChange(isOnline) {
    const event = new CustomEvent('connectivityChange', {
      detail: { isOnline }
    });
    window.dispatchEvent(event);

    if (isOnline) {
      this.showOnlineNotification();
      // Intentar sincronizar datos pendientes
      this.triggerBackgroundSync();
    }
  }

  showOnlineNotification() {
    const notification = document.createElement('div');
    notification.className = 'online-notification';
    notification.innerHTML = `
      <div class="online-content">
        <div class="online-icon">🌐</div>
        <span>Conexión restablecida</span>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      z-index: 10000;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  async triggerBackgroundSync() {
    if (!this.swRegistration || !this.swRegistration.sync) return;

    try {
      await this.swRegistration.sync.register('background-sync');
    } catch (error) {
      console.warn('No se pudo activar la sincronización:', error);
    }
  }

  // Métodos públicos
  async unregister() {
    if (this.swRegistration) {
      const success = await this.swRegistration.unregister();
      if (success) {
        console.log('Service Worker desregistrado');
        this.swRegistration = null;
      }
      return success;
    }
    return false;
  }

  getRegistration() {
    return this.swRegistration;
  }

  isUpdateAvailable() {
    return this.isUpdateAvailable;
  }

  async checkForUpdates() {
    if (this.swRegistration) {
      await this.swRegistration.update();
    }
  }

  getStatus() {
    return {
      registered: !!this.swRegistration,
      updateAvailable: this.isUpdateAvailable,
      isOnline: this.isOnline,
      scope: this.swRegistration?.scope
    };
  }
}

// CSS para los elementos del SW Manager
const swStyles = document.createElement('style');
swStyles.textContent = `
  .update-content {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    gap: 16px;
  }

  .update-icon {
    font-size: 24px;
  }

  .update-text h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .update-text p {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
  }

  .update-actions {
    display: flex;
    gap: 12px;
    margin-left: auto;
  }

  .update-btn {
    background: white;
    color: #2563eb;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    font-size: 14px;
  }

  .update-dismiss {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }

  .spinner, .sync-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .progress-content, .success-content, .sync-content, .offline-content, .online-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(swStyles);

// Instancia global
const swManager = new ServiceWorkerManager();

export { swManager, ServiceWorkerManager };
export default swManager;