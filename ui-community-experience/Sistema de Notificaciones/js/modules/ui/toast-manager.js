/* ==================================================
   RAMA 9: Toast Manager
   Gestor especializado para mensajes toast
   ================================================== */

class ToastManager {
  constructor(options = {}) {
    this.options = {
      position: 'bottom-right',
      maxToasts: 3,
      defaultDuration: 3000,
      animationDuration: 250,
      spacing: 12,
      enableSwipe: true,
      enableStack: true,
      enableQueue: true,
      ...options
    };
    
    this.toasts = new Map();
    this.container = null;
    this.queue = [];
    this.activeCount = 0;
    this.zIndex = 10000;
    
    this.init();
  }
  
  init() {
    console.log('🍞 Inicializando Toast Manager...');
    
    this.createContainer();
    this.setupEventListeners();
    this.setupStyles();
    
    console.log('✅ Toast Manager inicializado');
  }
  
  createContainer() {
    this.container = document.createElement('div');
    this.container.className = `toast-container toast-${this.options.position}`;
    this.container.style.cssText = `
      position: fixed;
      z-index: ${this.zIndex};
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: ${this.options.spacing}px;
    `;
    
    this.setContainerPosition();
    document.body.appendChild(this.container);
  }
  
  setContainerPosition() {
    const { position } = this.options;
    
    if (position.includes('top')) {
      this.container.style.top = '1rem';
      this.container.style.flexDirection = 'column';
    } else {
      this.container.style.bottom = '1rem';
      this.container.style.flexDirection = 'column-reverse';
    }
    
    if (position.includes('left')) {
      this.container.style.left = '1rem';
      this.container.style.alignItems = 'flex-start';
    } else if (position.includes('right')) {
      this.container.style.right = '1rem';
      this.container.style.alignItems = 'flex-end';
    } else {
      this.container.style.left = '50%';
      this.container.style.transform = 'translateX(-50%)';
      this.container.style.alignItems = 'center';
    }
  }
  
  setupEventListeners() {
    document.addEventListener('toast:show', this.handleShowEvent.bind(this));
    document.addEventListener('toast:hide', this.handleHideEvent.bind(this));
    document.addEventListener('toast:clear', this.handleClearEvent.bind(this));
    
    // Eventos de teclado
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // Eventos de resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  setupStyles() {
    if (document.getElementById('toast-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast {
        pointer-events: auto;
        background: var(--color-surface, #ffffff);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        padding: 1rem;
        min-width: 300px;
        max-width: 400px;
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        position: relative;
        transition: all ${this.options.animationDuration}ms ease;
        transform: translateX(0);
        opacity: 1;
      }
      
      .toast-enter {
        animation: toastSlideIn ${this.options.animationDuration}ms ease;
      }
      
      .toast-exit {
        animation: toastSlideOut ${this.options.animationDuration}ms ease forwards;
      }
      
      @keyframes toastSlideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes toastSlideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .toast-icon {
        flex-shrink: 0;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
        font-weight: 600;
      }
      
      .toast-content {
        flex: 1;
        min-width: 0;
      }
      
      .toast-title {
        font-weight: 600;
        font-size: 0.875rem;
        line-height: 1.25;
        margin-bottom: 0.25rem;
        color: var(--color-text, #1f2937);
      }
      
      .toast-message {
        font-size: 0.8125rem;
        line-height: 1.4;
        color: var(--color-text-secondary, #6b7280);
      }
      
      .toast-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        width: 1.25rem;
        height: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.25rem;
        color: var(--color-text-tertiary, #9ca3af);
        transition: all 0.15s ease;
        flex-shrink: 0;
      }
      
      .toast-close:hover {
        background: var(--color-surface-hover, #f3f4f6);
        color: var(--color-text, #1f2937);
      }
      
      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: var(--color-primary, #3b82f6);
        border-radius: 0 0 0.5rem 0.5rem;
        transition: width 0.1s linear;
      }
      
      /* Tipos de toast */
      .toast-success .toast-icon {
        background: #dcfce7;
        color: #166534;
      }
      
      .toast-error .toast-icon {
        background: #fecaca;
        color: #dc2626;
      }
      
      .toast-warning .toast-icon {
        background: #fef3c7;
        color: #d97706;
      }
      
      .toast-info .toast-icon {
        background: #dbeafe;
        color: #2563eb;
      }
      
      .toast-loading .toast-icon {
        background: #f3f4f6;
        color: #6b7280;
      }
      
      /* Responsive */
      @media (max-width: 640px) {
        .toast {
          min-width: calc(100vw - 2rem);
          max-width: calc(100vw - 2rem);
          margin: 0 1rem;
        }
        
        .toast-container {
          left: 0 !important;
          right: 0 !important;
          transform: none !important;
          align-items: stretch !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // API pública principal
  show(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    
    const toast = this.createToast(options);
    
    if (this.activeCount >= this.options.maxToasts) {
      if (this.options.enableQueue) {
        this.queue.push(toast);
        return toast.id;
      } else {
        // Remover el más antiguo
        this.removeOldest();
      }
    }
    
    return this.showToast(toast);
  }
  
  success(message, title = '', options = {}) {
    return this.show({
      type: 'success',
      title: title || 'Éxito',
      message,
      icon: '✓',
      duration: 3000,
      ...options
    });
  }
  
  error(message, title = '', options = {}) {
    return this.show({
      type: 'error',
      title: title || 'Error',
      message,
      icon: '✕',
      duration: 6000,
      ...options
    });
  }
  
  warning(message, title = '', options = {}) {
    return this.show({
      type: 'warning',
      title: title || 'Advertencia',
      message,
      icon: '⚠',
      duration: 4000,
      ...options
    });
  }
  
  info(message, title = '', options = {}) {
    return this.show({
      type: 'info',
      title: title || 'Información',
      message,
      icon: 'ℹ',
      duration: 3000,
      ...options
    });
  }
  
  loading(message, title = '', options = {}) {
    return this.show({
      type: 'loading',
      title: title || 'Cargando...',
      message,
      icon: '⟳',
      duration: 0, // Persistent
      persistent: true,
      showProgress: false,
      ...options
    });
  }
  
  createToast(options) {
    const id = this.generateId();
    
    return {
      id,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message || '',
      icon: options.icon || '',
      duration: options.duration !== undefined ? options.duration : this.options.defaultDuration,
      persistent: options.persistent || false,
      showProgress: options.showProgress !== false,
      actions: options.actions || [],
      onClick: options.onClick || null,
      onClose: options.onClose || null,
      data: options.data || {},
      createdAt: Date.now(),
      element: null,
      timer: null,
      progressInterval: null
    };
  }
  
  showToast(toast) {
    const element = this.createToastElement(toast);
    toast.element = element;
    
    this.toasts.set(toast.id, toast);
    this.container.appendChild(element);
    this.activeCount++;
    
    // Animar entrada
    requestAnimationFrame(() => {
      element.classList.add('toast-enter');
    });
    
    // Configurar auto-hide
    if (!toast.persistent && toast.duration > 0) {
      this.scheduleHide(toast);
    }
    
    // Configurar progreso visual
    if (toast.showProgress && toast.duration > 0) {
      this.startProgress(toast);
    }
    
    // Emitir evento
    this.emit('toast:shown', { toast });
    
    return toast.id;
  }
  
  createToastElement(toast) {
    const element = document.createElement('div');
    element.className = `toast toast-${toast.type}`;
    element.setAttribute('data-toast-id', toast.id);
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'polite');
    
    element.innerHTML = `
      <div class="toast-icon">${toast.icon}</div>
      <div class="toast-content">
        ${toast.title ? `<div class="toast-title">${toast.title}</div>` : ''}
        <div class="toast-message">${toast.message}</div>
      </div>
      <button class="toast-close" aria-label="Cerrar">&times;</button>
      ${toast.showProgress && toast.duration > 0 ? '<div class="toast-progress"></div>' : ''}
    `;
    
    this.setupToastEvents(element, toast);
    
    if (this.options.enableSwipe) {
      this.setupSwipeGestures(element, toast);
    }
    
    return element;
  }
  
  setupToastEvents(element, toast) {
    const closeButton = element.querySelector('.toast-close');
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide(toast.id);
    });
    
    // Click en el toast
    element.addEventListener('click', () => {
      if (toast.onClick) {
        toast.onClick(toast);
      }
    });
    
    // Hover para pausar
    element.addEventListener('mouseenter', () => {
      this.pauseToast(toast);
    });
    
    element.addEventListener('mouseleave', () => {
      this.resumeToast(toast);
    });
  }
  
  setupSwipeGestures(element, toast) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;
    
    const handleStart = (e) => {
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      startY = point.clientY;
      currentX = 0;
      isDragging = true;
      
      element.style.transition = 'none';
      this.pauseToast(toast);
    };
    
    const handleMove = (e) => {
      if (!isDragging) return;
      
      const point = e.touches ? e.touches[0] : e;
      currentX = point.clientX - startX;
      const currentY = point.clientY - startY;
      
      // Solo permitir swipe horizontal
      if (Math.abs(currentY) > Math.abs(currentX)) return;
      
      e.preventDefault();
      
      const opacity = Math.max(0, 1 - Math.abs(currentX) / 200);
      element.style.transform = `translateX(${currentX}px)`;
      element.style.opacity = opacity;
    };
    
    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      element.style.transition = '';
      
      if (Math.abs(currentX) > 100) {
        // Swipe para cerrar
        this.hide(toast.id);
      } else {
        // Volver a la posición original
        element.style.transform = '';
        element.style.opacity = '';
        this.resumeToast(toast);
      }
    };
    
    // Mouse events
    element.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    
    // Touch events
    element.addEventListener('touchstart', handleStart);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }
  
  hide(toastId) {
    const toast = this.toasts.get(toastId);
    if (!toast || !toast.element) return false;
    
    const element = toast.element;
    
    // Callback antes de cerrar
    if (toast.onClose) {
      toast.onClose(toast);
    }
    
    // Animar salida
    element.classList.remove('toast-enter');
    element.classList.add('toast-exit');
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      this.toasts.delete(toastId);
      this.activeCount--;
      
      // Limpiar timers
      this.clearToastTimers(toast);
      
      // Emitir evento
      this.emit('toast:hidden', { toast });
      
      // Procesar cola
      this.processQueue();
      
    }, this.options.animationDuration);
    
    return true;
  }
  
  scheduleHide(toast) {
    if (toast.timer) {
      clearTimeout(toast.timer);
    }
    
    toast.timer = setTimeout(() => {
      this.hide(toast.id);
    }, toast.duration);
  }
  
  startProgress(toast) {
    const progressBar = toast.element.querySelector('.toast-progress');
    if (!progressBar) return;
    
    let progress = 0;
    const interval = 50; // Update every 50ms
    const increment = (interval / toast.duration) * 100;
    
    toast.progressInterval = setInterval(() => {
      progress += increment;
      progressBar.style.width = `${Math.min(progress, 100)}%`;
      
      if (progress >= 100) {
        clearInterval(toast.progressInterval);
      }
    }, interval);
  }
  
  pauseToast(toast) {
    if (toast.timer) {
      clearTimeout(toast.timer);
      toast.remainingTime = toast.duration - (Date.now() - toast.createdAt);
    }
    
    if (toast.progressInterval) {
      clearInterval(toast.progressInterval);
    }
  }
  
  resumeToast(toast) {
    if (!toast.persistent && toast.remainingTime > 0) {
      toast.timer = setTimeout(() => {
        this.hide(toast.id);
      }, toast.remainingTime);
      
      // Reanudar progreso
      if (toast.showProgress) {
        this.resumeProgress(toast);
      }
    }
  }
  
  resumeProgress(toast) {
    const progressBar = toast.element.querySelector('.toast-progress');
    if (!progressBar) return;
    
    const currentWidth = parseFloat(progressBar.style.width) || 0;
    let progress = currentWidth;
    const interval = 50;
    const increment = (interval / toast.remainingTime) * (100 - currentWidth);
    
    toast.progressInterval = setInterval(() => {
      progress += increment;
      progressBar.style.width = `${Math.min(progress, 100)}%`;
      
      if (progress >= 100) {
        clearInterval(toast.progressInterval);
      }
    }, interval);
  }
  
  clearToastTimers(toast) {
    if (toast.timer) {
      clearTimeout(toast.timer);
      toast.timer = null;
    }
    
    if (toast.progressInterval) {
      clearInterval(toast.progressInterval);
      toast.progressInterval = null;
    }
  }
  
  // Métodos de gestión
  clear(type = null) {
    const toRemove = [];
    
    this.toasts.forEach((toast, id) => {
      if (!type || toast.type === type) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.hide(id));
    
    // Limpiar cola también
    if (type) {
      this.queue = this.queue.filter(t => t.type !== type);
    } else {
      this.queue = [];
    }
    
    return toRemove.length;
  }
  
  removeOldest() {
    if (this.toasts.size === 0) return;
    
    let oldest = null;
    let oldestTime = Date.now();
    
    this.toasts.forEach(toast => {
      if (toast.createdAt < oldestTime) {
        oldest = toast;
        oldestTime = toast.createdAt;
      }
    });
    
    if (oldest) {
      this.hide(oldest.id);
    }
  }
  
  processQueue() {
    if (this.queue.length === 0) return;
    
    while (this.activeCount < this.options.maxToasts && this.queue.length > 0) {
      const toast = this.queue.shift();
      this.showToast(toast);
    }
  }
  
  update(toastId, options) {
    const toast = this.toasts.get(toastId);
    if (!toast) return false;
    
    // Actualizar propiedades
    Object.assign(toast, options);
    
    // Actualizar elemento
    const element = toast.element;
    const titleEl = element.querySelector('.toast-title');
    const messageEl = element.querySelector('.toast-message');
    const iconEl = element.querySelector('.toast-icon');
    
    if (titleEl && options.title !== undefined) {
      titleEl.textContent = options.title;
    }
    
    if (messageEl && options.message !== undefined) {
      messageEl.textContent = options.message;
    }
    
    if (iconEl && options.icon !== undefined) {
      iconEl.textContent = options.icon;
    }
    
    // Actualizar tipo
    if (options.type) {
      element.className = element.className.replace(/toast-\w+/, `toast-${options.type}`);
    }
    
    return true;
  }
  
  // Métodos de utilidad
  generateId() {
    return 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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
  
  handleKeydown(event) {
    // Cerrar todos los toasts con Escape
    if (event.key === 'Escape') {
      this.clear();
    }
  }
  
  handleResize() {
    // Reposicionar si es necesario
    this.setContainerPosition();
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // API pública de estado
  getToasts() {
    return Array.from(this.toasts.values());
  }
  
  getToastCount() {
    return this.activeCount;
  }
  
  getQueueLength() {
    return this.queue.length;
  }
  
  hasToast(toastId) {
    return this.toasts.has(toastId);
  }
  
  // Configuración dinámica
  setPosition(position) {
    this.options.position = position;
    this.container.className = `toast-container toast-${position}`;
    this.setContainerPosition();
  }
  
  setMaxToasts(max) {
    this.options.maxToasts = max;
    
    // Si hay demasiados toasts activos, remover los más antiguos
    while (this.activeCount > max) {
      this.removeOldest();
    }
  }
  
  // Métodos de animación avanzada
  slideAll(direction = 'up') {
    const toasts = Array.from(this.container.children);
    
    toasts.forEach((element, index) => {
      const delay = index * 50;
      
      setTimeout(() => {
        element.style.transform = direction === 'up' ? 
          'translateY(-10px)' : 'translateY(10px)';
        
        setTimeout(() => {
          element.style.transform = '';
        }, 150);
      }, delay);
    });
  }
  
  stackToasts() {
    if (!this.options.enableStack) return;
    
    const toasts = Array.from(this.container.children);
    
    toasts.forEach((element, index) => {
      const offset = index * 4;
      const scale = 1 - (index * 0.02);
      
      element.style.transform = `translateY(${offset}px) scale(${scale})`;
      element.style.zIndex = toasts.length - index;
    });
  }
  
  // Limpieza
  destroy() {
    console.log('🧹 Destruyendo Toast Manager...');
    
    // Limpiar todos los toasts
    this.clear();
    
    // Remover container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Remover estilos
    const styleElement = document.getElementById('toast-styles');
    if (styleElement) {
      styleElement.remove();
    }
    
    // Limpiar referencias
    this.toasts.clear();
    this.queue = [];
    
    console.log('✅ Toast Manager destruido');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.ToastManager = ToastManager;
}

export default ToastManager;