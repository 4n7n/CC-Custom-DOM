/* ==================================================
   RAMA 9: Notification System
   Sistema centralizado de notificaciones
   ================================================== */

class NotificationSystem {
  constructor(options = {}) {
    this.options = {
      maxNotifications: 5,
      defaultDuration: 5000,
      position: 'top-right',
      enableSound: true,
      enableVibration: true,
      enablePersistence: true,
      enableGrouping: true,
      enableBatch: true,
      animationDuration: 300,
      ...options
    };
    
    this.notifications = new Map();
    this.queue = [];
    this.container = null;
    this.activeCount = 0;
    this.groups = new Map();
    this.templates = new Map();
    this.sounds = new Map();
    this.isPaused = false;
    this.isUserAway = false;
    this.pendingNotifications = [];
    
    this.init();
  }
  
  init() {
    console.log('🔔 Inicializando Sistema de Notificaciones...');
    
    this.createContainer();
    this.setupEventListeners();
    this.loadPersistedNotifications();
    this.setupTemplates();
    this.setupSounds();
    this.startQueueProcessor();
    
    console.log('✅ Sistema de Notificaciones inicializado');
  }
  
  createContainer() {
    this.container = document.createElement('div');
    this.container.className = `notification-container notification-${this.options.position}`;
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-label', 'Notificaciones');
    document.body.appendChild(this.container);
  }
  
  setupEventListeners() {
    // Eventos globales
    document.addEventListener('notification:show', this.handleShowEvent.bind(this));
    document.addEventListener('notification:hide', this.handleHideEvent.bind(this));
    document.addEventListener('notification:clear', this.handleClearEvent.bind(this));
    document.addEventListener('notification:pause', this.handlePauseEvent.bind(this));
    document.addEventListener('notification:resume', this.handleResumeEvent.bind(this));
    
    // Eventos de usuario
    document.addEventListener('user:away', this.handleUserAway.bind(this));
    document.addEventListener('user:back', this.handleUserBack.bind(this));
    
    // Eventos de visibilidad de página
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Eventos de conexión
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }
  
  setupTemplates() {
    // Template básico
    this.templates.set('default', {
      structure: `
        <div class="notification-icon">
          <span class="notification-icon-content"></span>
        </div>
        <div class="notification-content">
          <div class="notification-title"></div>
          <div class="notification-message"></div>
        </div>
        <button class="notification-close" aria-label="Cerrar notificación">
          <span>&times;</span>
        </button>
      `,
      styles: ['notification', 'notification-default']
    });
    
    // Template de progreso
    this.templates.set('progress', {
      structure: `
        <div class="notification-icon">
          <div class="notification-progress-circle">
            <svg viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="2" class="progress-bar"/>
            </svg>
          </div>
        </div>
        <div class="notification-content">
          <div class="notification-title"></div>
          <div class="notification-message"></div>
          <div class="notification-progress-bar">
            <div class="notification-progress-fill"></div>
          </div>
        </div>
      `,
      styles: ['notification', 'notification-progress']
    });
    
    // Template de acción
    this.templates.set('action', {
      structure: `
        <div class="notification-icon">
          <span class="notification-icon-content"></span>
        </div>
        <div class="notification-content">
          <div class="notification-title"></div>
          <div class="notification-message"></div>
          <div class="notification-actions">
            <button class="notification-action-primary"></button>
            <button class="notification-action-secondary"></button>
          </div>
        </div>
        <button class="notification-close" aria-label="Cerrar notificación">
          <span>&times;</span>
        </button>
      `,
      styles: ['notification', 'notification-action']
    });
  }
  
  setupSounds() {
    if (!this.options.enableSound) return;
    
    // Sonidos simplificados usando Web Audio API
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.sounds.set('success', this.createTone(800, 0.1));
    this.sounds.set('error', this.createTone(300, 0.2));
    this.sounds.set('warning', this.createTone(600, 0.15));
    this.sounds.set('info', this.createTone(500, 0.1));
  }
  
  createTone(frequency, duration) {
    return () => {
      if (!this.audioContext) return;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    };
  }
  
  startQueueProcessor() {
    setInterval(() => {
      this.processQueue();
    }, 100);
  }
  
  processQueue() {
    if (this.isPaused || this.isUserAway || this.queue.length === 0) {
      return;
    }
    
    if (this.activeCount < this.options.maxNotifications) {
      const notification = this.queue.shift();
      this.showNotification(notification);
    }
  }
  
  // API pública principal
  show(options) {
    const notification = this.createNotification(options);
    
    if (this.options.enableGrouping && options.group) {
      return this.handleGroupedNotification(notification);
    }
    
    if (this.activeCount >= this.options.maxNotifications) {
      this.queue.push(notification);
      return notification.id;
    }
    
    return this.showNotification(notification);
  }
  
  success(title, message, options = {}) {
    return this.show({
      type: 'success',
      title,
      message,
      icon: '✓',
      duration: 4000,
      ...options
    });
  }
  
  error(title, message, options = {}) {
    return this.show({
      type: 'error',
      title,
      message,
      icon: '✕',
      duration: 8000,
      persistent: true,
      ...options
    });
  }
  
  warning(title, message, options = {}) {
    return this.show({
      type: 'warning',
      title,
      message,
      icon: '⚠',
      duration: 6000,
      ...options
    });
  }
  
  info(title, message, options = {}) {
    return this.show({
      type: 'info',
      title,
      message,
      icon: 'ℹ',
      duration: 5000,
      ...options
    });
  }
  
  progress(title, message, options = {}) {
    return this.show({
      type: 'progress',
      title,
      message,
      template: 'progress',
      persistent: true,
      progress: 0,
      ...options
    });
  }
  
  createNotification(options) {
    const id = this.generateId();
    const notification = {
      id,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message || '',
      icon: options.icon || '',
      duration: options.duration || this.options.defaultDuration,
      persistent: options.persistent || false,
      template: options.template || 'default',
      actions: options.actions || [],
      data: options.data || {},
      group: options.group || null,
      progress: options.progress || null,
      createdAt: Date.now(),
      element: null,
      timer: null
    };
    
    return notification;
  }
  
  showNotification(notification) {
    const element = this.createNotificationElement(notification);
    notification.element = element;
    
    this.notifications.set(notification.id, notification);
    this.container.appendChild(element);
    this.activeCount++;
    
    // Animar entrada
    requestAnimationFrame(() => {
      element.classList.add('notification-enter');
    });
    
    // Reproducir sonido
    this.playSound(notification.type);
    
    // Vibrar si está habilitado
    this.vibrate(notification.type);
    
    // Configurar auto-hide
    if (!notification.persistent) {
      this.scheduleHide(notification);
    }
    
    // Emitir evento
    this.emit('notification:shown', { notification });
    
    // Guardar si la persistencia está habilitada
    if (this.options.enablePersistence) {
      this.persistNotification(notification);
    }
    
    return notification.id;
  }
  
  createNotificationElement(notification) {
    const template = this.templates.get(notification.template);
    const element = document.createElement('div');
    
    element.className = template.styles.join(' ') + ` notification-${notification.type}`;
    element.setAttribute('data-notification-id', notification.id);
    element.setAttribute('role', 'alert');
    element.innerHTML = template.structure;
    
    // Rellenar contenido
    this.fillNotificationContent(element, notification);
    
    // Configurar event listeners
    this.setupNotificationEvents(element, notification);
    
    return element;
  }
  
  fillNotificationContent(element, notification) {
    const iconElement = element.querySelector('.notification-icon-content');
    const titleElement = element.querySelector('.notification-title');
    const messageElement = element.querySelector('.notification-message');
    
    if (iconElement) iconElement.textContent = notification.icon;
    if (titleElement) titleElement.textContent = notification.title;
    if (messageElement) messageElement.textContent = notification.message;
    
    // Llenar acciones si existen
    const actionsContainer = element.querySelector('.notification-actions');
    if (actionsContainer && notification.actions.length > 0) {
      this.fillNotificationActions(actionsContainer, notification);
    }
    
    // Configurar progreso si existe
    if (notification.progress !== null) {
      this.updateNotificationProgress(element, notification.progress);
    }
  }
  
  fillNotificationActions(container, notification) {
    container.innerHTML = '';
    
    notification.actions.forEach((action, index) => {
      const button = document.createElement('button');
      button.className = `notification-action ${index === 0 ? 'primary' : 'secondary'}`;
      button.textContent = action.label;
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        if (action.callback) action.callback(notification);
        if (action.autoClose !== false) this.hide(notification.id);
      });
      container.appendChild(button);
    });
  }
  
  setupNotificationEvents(element, notification) {
    const closeButton = element.querySelector('.notification-close');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide(notification.id);
      });
    }
    
    // Click en la notificación
    element.addEventListener('click', () => {
      if (notification.onClick) {
        notification.onClick(notification);
      }
    });
    
    // Hover para pausar timer
    element.addEventListener('mouseenter', () => {
      this.pauseTimer(notification);
    });
    
    element.addEventListener('mouseleave', () => {
      this.resumeTimer(notification);
    });
  }
  
  hide(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification || !notification.element) return false;
    
    const element = notification.element;
    
    // Animar salida
    element.classList.add('notification-exit');
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      this.notifications.delete(notificationId);
      this.activeCount--;
      
      // Limpiar timer
      if (notification.timer) {
        clearTimeout(notification.timer);
      }
      
      // Emitir evento
      this.emit('notification:hidden', { notification });
      
      // Procesar cola
      this.processQueue();
      
    }, this.options.animationDuration);
    
    return true;
  }
  
  updateProgress(notificationId, progress) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;
    
    notification.progress = Math.max(0, Math.min(100, progress));
    this.updateNotificationProgress(notification.element, notification.progress);
    
    // Auto-hide cuando complete
    if (notification.progress >= 100) {
      setTimeout(() => {
        this.hide(notificationId);
      }, 1000);
    }
    
    return true;
  }
  
  updateNotificationProgress(element, progress) {
    const progressFill = element.querySelector('.notification-progress-fill');
    const progressCircle = element.querySelector('.progress-bar');
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    
    if (progressCircle) {
      const circumference = 2 * Math.PI * 14;
      const offset = circumference - (progress / 100) * circumference;
      progressCircle.style.strokeDasharray = circumference;
      progressCircle.style.strokeDashoffset = offset;
    }
  }
  
  // Métodos de gestión
  clear(type = null) {
    const toRemove = [];
    
    this.notifications.forEach((notification, id) => {
      if (!type || notification.type === type) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.hide(id));
    
    // Limpiar cola también
    if (type) {
      this.queue = this.queue.filter(n => n.type !== type);
    } else {
      this.queue = [];
    }
    
    return toRemove.length;
  }
  
  pause() {
    this.isPaused = true;
    
    // Pausar todos los timers
    this.notifications.forEach(notification => {
      this.pauseTimer(notification);
    });
    
    this.emit('notification:paused');
  }
  
  resume() {
    this.isPaused = false;
    
    // Reanudar todos los timers
    this.notifications.forEach(notification => {
      this.resumeTimer(notification);
    });
    
    this.emit('notification:resumed');
  }
  
  scheduleHide(notification) {
    if (notification.timer) {
      clearTimeout(notification.timer);
    }
    
    notification.timer = setTimeout(() => {
      this.hide(notification.id);
    }, notification.duration);
  }
  
  pauseTimer(notification) {
    if (notification.timer) {
      clearTimeout(notification.timer);
      notification.remainingTime = notification.duration - (Date.now() - notification.createdAt);
    }
  }
  
  resumeTimer(notification) {
    if (!notification.persistent && notification.remainingTime > 0) {
      notification.timer = setTimeout(() => {
        this.hide(notification.id);
      }, notification.remainingTime);
    }
  }
  
  // Métodos de utilidad
  generateId() {
    return 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  playSound(type) {
    if (!this.options.enableSound) return;
    
    const sound = this.sounds.get(type) || this.sounds.get('info');
    if (sound) {
      try {
        sound();
      } catch (error) {
        console.warn('No se pudo reproducir el sonido de notificación:', error);
      }
    }
  }
  
  vibrate(type) {
    if (!this.options.enableVibration || !navigator.vibrate) return;
    
    const patterns = {
      success: [100],
      error: [100, 50, 100],
      warning: [100, 50, 100, 50, 100],
      info: [100]
    };
    
    navigator.vibrate(patterns[type] || patterns.info);
  }
  
  handleGroupedNotification(notification) {
    const groupId = notification.group;
    
    if (this.groups.has(groupId)) {
      const group = this.groups.get(groupId);
      group.count++;
      group.lastNotification = notification;
      
      // Actualizar notificación existente
      this.updateGroupNotification(group);
      return group.id;
    } else {
      // Crear nueva notificación de grupo
      const group = {
        id: this.generateId(),
        groupId,
        count: 1,
        lastNotification: notification
      };
      
      this.groups.set(groupId, group);
      return this.showGroupNotification(group);
    }
  }
  
  showGroupNotification(group) {
    const notification = {
      ...group.lastNotification,
      id: group.id,
      title: `${group.lastNotification.title} (${group.count})`,
      group: null // Evitar recursión
    };
    
    return this.showNotification(notification);
  }
  
  updateGroupNotification(group) {
    const notification = this.notifications.get(group.id);
    if (notification) {
      const titleElement = notification.element.querySelector('.notification-title');
      if (titleElement) {
        titleElement.textContent = `${group.lastNotification.title} (${group.count})`;
      }
    }
  }
  
  // Manejadores de eventos
  handleShowEvent(event) {
    this.show(event.detail);
  }
  
  handleHideEvent(event) {
    this.hide(event.detail.id);
  }
  
  handleClearEvent(event) {
    this.clear(event.detail.type);
  }
  
  handlePauseEvent() {
    this.pause();
  }
  
  handleResumeEvent() {
    this.resume();
  }
  
  handleUserAway() {
    this.isUserAway = true;
  }
  
  handleUserBack() {
    this.isUserAway = false;
    
    // Mostrar notificaciones pendientes
    if (this.pendingNotifications.length > 0) {
      this.pendingNotifications.forEach(notification => {
        this.show(notification);
      });
      this.pendingNotifications = [];
    }
  }
  
  handleVisibilityChange() {
    if (document.hidden) {
      this.handleUserAway();
    } else {
      this.handleUserBack();
    }
  }
  
  handleOnline() {
    this.info('Conexión restaurada', 'Estás de vuelta en línea');
  }
  
  handleOffline() {
    this.warning('Sin conexión', 'Estás trabajando sin conexión');
  }
  
  // Persistencia
  persistNotification(notification) {
    try {
      const stored = JSON.parse(localStorage.getItem('rama9-notifications') || '[]');
      stored.push({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt
      });
      
      // Mantener solo las últimas 50
      const recent = stored.slice(-50);
      localStorage.setItem('rama9-notifications', JSON.stringify(recent));
    } catch (error) {
      console.warn('No se pudo persistir la notificación:', error);
    }
  }
  
  loadPersistedNotifications() {
    if (!this.options.enablePersistence) return;
    
    try {
      const stored = JSON.parse(localStorage.getItem('rama9-notifications') || '[]');
      console.log(`📚 ${stored.length} notificaciones persistidas cargadas`);
    } catch (error) {
      console.warn('No se pudieron cargar las notificaciones persistidas:', error);
    }
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // API pública de estado
  getNotifications() {
    return Array.from(this.notifications.values());
  }
  
  getNotificationCount() {
    return this.activeCount;
  }
  
  isPausedState() {
    return this.isPaused;
  }
  
  // Limpieza
  destroy() {
    console.log('🧹 Destruyendo Sistema de Notificaciones...');
    
    // Limpiar todas las notificaciones
    this.clear();
    
    // Remover container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Limpiar referencias
    this.notifications.clear();
    this.groups.clear();
    this.queue = [];
    this.pendingNotifications = [];
    
    console.log('✅ Sistema de Notificaciones destruido');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.NotificationSystem = NotificationSystem;
}

export default NotificationSystem;