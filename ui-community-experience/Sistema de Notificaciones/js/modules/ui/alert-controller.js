/* ==================================================
   RAMA 9: Alert Controller
   Controlador para alertas y diálogos modales
   ================================================== */

class AlertController {
  constructor(options = {}) {
    this.options = {
      enableBackdrop: true,
      enableEscapeKey: true,
      enableClickOutside: true,
      animationDuration: 300,
      backdropOpacity: 0.5,
      maxWidth: '500px',
      zIndex: 10000,
      ...options
    };
    
    this.alerts = new Map();
    this.activeAlert = null;
    this.queue = [];
    this.backdrop = null;
    this.isInitialized = false;
    
    this.init();
  }
  
  init() {
    console.log('🚨 Inicializando Alert Controller...');
    
    this.setupEventListeners();
    this.setupStyles();
    this.createBackdrop();
    this.isInitialized = true;
    
    console.log('✅ Alert Controller inicializado');
  }
  
  setupEventListeners() {
    document.addEventListener('alert:show', this.handleShowEvent.bind(this));
    document.addEventListener('alert:hide', this.handleHideEvent.bind(this));
    document.addEventListener('alert:confirm', this.handleConfirmEvent.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  setupStyles() {
    if (document.getElementById('alert-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'alert-styles';
    style.textContent = `
      .alert-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, ${this.options.backdropOpacity});
        z-index: ${this.options.zIndex};
        opacity: 0;
        transition: opacity ${this.options.animationDuration}ms ease;
        backdrop-filter: blur(4px);
      }
      
      .alert-backdrop.active {
        opacity: 1;
      }
      
      .alert-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: ${this.options.zIndex + 1};
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        pointer-events: none;
      }
      
      .alert {
        background: var(--color-surface, #ffffff);
        border-radius: 0.75rem;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        max-width: ${this.options.maxWidth};
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        pointer-events: auto;
        transform: scale(0.9) translateY(20px);
        opacity: 0;
        transition: all ${this.options.animationDuration}ms ease;
      }
      
      .alert.active {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
      
      .alert-header {
        padding: 1.5rem 1.5rem 0;
        display: flex;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .alert-icon {
        flex-shrink: 0;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: 600;
      }
      
      .alert-content {
        flex: 1;
        min-width: 0;
      }
      
      .alert-title {
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.4;
        margin-bottom: 0.5rem;
        color: var(--color-text, #1f2937);
      }
      
      .alert-message {
        font-size: 0.9375rem;
        line-height: 1.5;
        color: var(--color-text-secondary, #6b7280);
      }
      
      .alert-body {
        padding: 1rem 1.5rem;
      }
      
      .alert-details {
        background: var(--color-surface-secondary, #f9fafb);
        border-radius: 0.5rem;
        padding: 1rem;
        margin-top: 1rem;
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--color-text-secondary, #6b7280);
        border: 1px solid var(--color-border, #e5e7eb);
      }
      
      .alert-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--color-border, #d1d5db);
        border-radius: 0.5rem;
        font-size: 0.9375rem;
        margin-top: 1rem;
        transition: border-color 0.15s ease;
      }
      
      .alert-input:focus {
        outline: none;
        border-color: var(--color-primary, #3b82f6);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .alert-footer {
        padding: 1rem 1.5rem 1.5rem;
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }
      
      .alert-button {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-size: 0.9375rem;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all 0.15s ease;
        min-width: 80px;
      }
      
      .alert-button-primary {
        background: var(--color-primary, #3b82f6);
        color: white;
      }
      
      .alert-button-primary:hover {
        background: var(--color-primary-dark, #2563eb);
      }
      
      .alert-button-secondary {
        background: var(--color-surface-secondary, #f3f4f6);
        color: var(--color-text, #374151);
        border: 1px solid var(--color-border, #d1d5db);
      }
      
      .alert-button-secondary:hover {
        background: var(--color-surface-hover, #e5e7eb);
      }
      
      .alert-button-danger {
        background: #dc2626;
        color: white;
      }
      
      .alert-button-danger:hover {
        background: #b91c1c;
      }
      
      /* Tipos de alerta */
      .alert-success .alert-icon {
        background: #dcfce7;
        color: #166534;
      }
      
      .alert-error .alert-icon {
        background: #fecaca;
        color: #dc2626;
      }
      
      .alert-warning .alert-icon {
        background: #fef3c7;
        color: #d97706;
      }
      
      .alert-info .alert-icon {
        background: #dbeafe;
        color: #2563eb;
      }
      
      .alert-question .alert-icon {
        background: #f3e8ff;
        color: #7c3aed;
      }
      
      /* Responsive */
      @media (max-width: 640px) {
        .alert-container {
          padding: 1rem;
        }
        
        .alert {
          margin: 0;
        }
        
        .alert-header {
          padding: 1rem 1rem 0;
        }
        
        .alert-body {
          padding: 0.75rem 1rem;
        }
        
        .alert-footer {
          padding: 0.75rem 1rem 1rem;
          flex-direction: column;
        }
        
        .alert-button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  createBackdrop() {
    if (!this.options.enableBackdrop) return;
    
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'alert-backdrop';
    this.backdrop.style.display = 'none';
    
    if (this.options.enableClickOutside) {
      this.backdrop.addEventListener('click', () => {
        if (this.activeAlert && this.activeAlert.allowClickOutside !== false) {
          this.hide();
        }
      });
    }
    
    document.body.appendChild(this.backdrop);
  }
  
  // API pública principal
  show(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    
    return new Promise((resolve, reject) => {
      const alert = this.createAlert({
        ...options,
        resolve,
        reject
      });
      
      if (this.activeAlert) {
        this.queue.push(alert);
      } else {
        this.showAlert(alert);
      }
    });
  }
  
  confirm(title, message, options = {}) {
    return this.show({
      type: 'question',
      title,
      message,
      icon: '?',
      buttons: [
        {
          text: options.confirmText || 'Confirmar',
          style: 'primary',
          value: true
        },
        {
          text: options.cancelText || 'Cancelar',
          style: 'secondary',
          value: false
        }
      ],
      ...options
    });
  }
  
  prompt(title, message, defaultValue = '', options = {}) {
    return this.show({
      type: 'question',
      title,
      message,
      icon: '?',
      input: {
        type: 'text',
        placeholder: options.placeholder || '',
        value: defaultValue,
        required: options.required !== false
      },
      buttons: [
        {
          text: options.confirmText || 'Aceptar',
          style: 'primary',
          value: 'input'
        },
        {
          text: options.cancelText || 'Cancelar',
          style: 'secondary',
          value: null
        }
      ],
      ...options
    });
  }
  
  success(title, message, options = {}) {
    return this.show({
      type: 'success',
      title,
      message,
      icon: '✓',
      buttons: [
        {
          text: 'Aceptar',
          style: 'primary',
          value: true
        }
      ],
      ...options
    });
  }
  
  error(title, message, options = {}) {
    return this.show({
      type: 'error',
      title,
      message,
      icon: '✕',
      buttons: [
        {
          text: 'Aceptar',
          style: 'primary',
          value: true
        }
      ],
      ...options
    });
  }
  
  warning(title, message, options = {}) {
    return this.show({
      type: 'warning',
      title,
      message,
      icon: '⚠',
      buttons: [
        {
          text: 'Aceptar',
          style: 'primary',
          value: true
        }
      ],
      ...options
    });
  }
  
  info(title, message, options = {}) {
    return this.show({
      type: 'info',
      title,
      message,
      icon: 'ℹ',
      buttons: [
        {
          text: 'Aceptar',
          style: 'primary',
          value: true
        }
      ],
      ...options
    });
  }
  
  createAlert(options) {
    const id = this.generateId();
    
    return {
      id,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message || '',
      icon: options.icon || '',
      details: options.details || '',
      input: options.input || null,
      buttons: options.buttons || [],
      allowClickOutside: options.allowClickOutside !== false,
      allowEscapeKey: options.allowEscapeKey !== false,
      autoFocus: options.autoFocus !== false,
      resolve: options.resolve,
      reject: options.reject,
      data: options.data || {},
      createdAt: Date.now(),
      element: null,
      container: null
    };
  }
  
  showAlert(alert) {
    if (this.activeAlert) {
      this.hide();
    }
    
    this.activeAlert = alert;
    
    // Crear elementos
    const container = this.createAlertContainer();
    const element = this.createAlertElement(alert);
    
    alert.container = container;
    alert.element = element;
    
    container.appendChild(element);
    document.body.appendChild(container);
    
    // Mostrar backdrop
    if (this.backdrop) {
      this.backdrop.style.display = 'block';
      requestAnimationFrame(() => {
        this.backdrop.classList.add('active');
      });
    }
    
    // Animar entrada
    requestAnimationFrame(() => {
      element.classList.add('active');
    });
    
    // Auto-focus
    if (alert.autoFocus) {
      this.focusAlert(alert);
    }
    
    // Emitir evento
    this.emit('alert:shown', { alert });
    
    this.alerts.set(alert.id, alert);
  }
  
  createAlertContainer() {
    const container = document.createElement('div');
    container.className = 'alert-container';
    return container;
  }
  
  createAlertElement(alert) {
    const element = document.createElement('div');
    element.className = `alert alert-${alert.type}`;
    element.setAttribute('data-alert-id', alert.id);
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    element.setAttribute('aria-labelledby', `alert-title-${alert.id}`);
    
    let innerHTML = '';
    
    // Header
    if (alert.title || alert.icon) {
      innerHTML += `
        <div class="alert-header">
          ${alert.icon ? `<div class="alert-icon">${alert.icon}</div>` : ''}
          <div class="alert-content">
            ${alert.title ? `<h2 class="alert-title" id="alert-title-${alert.id}">${alert.title}</h2>` : ''}
            ${alert.message ? `<p class="alert-message">${alert.message}</p>` : ''}
          </div>
        </div>
      `;
    }
    
    // Body
    if (alert.details || alert.input) {
      innerHTML += '<div class="alert-body">';
      
      if (alert.details) {
        innerHTML += `<div class="alert-details">${alert.details}</div>`;
      }
      
      if (alert.input) {
        const inputType = alert.input.type || 'text';
        const placeholder = alert.input.placeholder || '';
        const value = alert.input.value || '';
        const required = alert.input.required ? 'required' : '';
        
        innerHTML += `
          <input 
            type="${inputType}" 
            class="alert-input" 
            placeholder="${placeholder}" 
            value="${value}" 
            ${required}
            id="alert-input-${alert.id}"
          />
        `;
      }
      
      innerHTML += '</div>';
    }
    
    // Footer
    if (alert.buttons.length > 0) {
      innerHTML += '<div class="alert-footer">';
      
      alert.buttons.forEach((button, index) => {
        const style = button.style || 'secondary';
        innerHTML += `
          <button 
            class="alert-button alert-button-${style}" 
            data-value="${button.value}"
            data-index="${index}"
          >
            ${button.text}
          </button>
        `;
      });
      
      innerHTML += '</div>';
    }
    
    element.innerHTML = innerHTML;
    
    // Configurar event listeners
    this.setupAlertEvents(element, alert);
    
    return element;
  }
  
  setupAlertEvents(element, alert) {
    // Botones
    const buttons = element.querySelectorAll('.alert-button');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.value;
        const index = parseInt(button.dataset.index);
        const buttonConfig = alert.buttons[index];
        
        let result = value;
        
        // Si el valor es 'input', obtener el valor del input
        if (value === 'input') {
          const input = element.querySelector('.alert-input');
          if (input) {
            result = input.value;
            
            // Validar input requerido
            if (alert.input.required && !result.trim()) {
              input.focus();
              input.style.borderColor = '#dc2626';
              return;
            }
          }
        }
        
        // Callback del botón
        if (buttonConfig.callback) {
          const shouldClose = buttonConfig.callback(result, alert);
          if (shouldClose === false) return;
        }
        
        // Resolver promesa
        if (alert.resolve) {
          if (value === 'false' || value === null) {
            alert.reject(new Error('User cancelled'));
          } else {
            alert.resolve(result);
          }
        }
        
        this.hide();
      });
    });
    
    // Input events
    const input = element.querySelector('.alert-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          // Simular click en botón primario
          const primaryButton = element.querySelector('.alert-button-primary');
          if (primaryButton) {
            primaryButton.click();
          }
        }
      });
      
      input.addEventListener('input', () => {
        // Resetear estilo de error
        input.style.borderColor = '';
      });
    }
  }
  
  hide() {
    if (!this.activeAlert) return false;
    
    const alert = this.activeAlert;
    const element = alert.element;
    const container = alert.container;
    
    // Animar salida
    element.classList.remove('active');
    
    if (this.backdrop) {
      this.backdrop.classList.remove('active');
    }
    
    setTimeout(() => {
      // Remover elementos
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      
      if (this.backdrop) {
        this.backdrop.style.display = 'none';
      }
      
      // Limpiar referencias
      this.alerts.delete(alert.id);
      this.activeAlert = null;
      
      // Emitir evento
      this.emit('alert:hidden', { alert });
      
      // Procesar cola
      this.processQueue();
      
    }, this.options.animationDuration);
    
    return true;
  }
  
  processQueue() {
    if (this.queue.length > 0 && !this.activeAlert) {
      const nextAlert = this.queue.shift();
      this.showAlert(nextAlert);
    }
  }
  
  focusAlert(alert) {
    setTimeout(() => {
      // Enfocar input si existe
      const input = alert.element.querySelector('.alert-input');
      if (input) {
        input.focus();
        input.select();
        return;
      }
      
      // Enfocar botón primario
      const primaryButton = alert.element.querySelector('.alert-button-primary');
      if (primaryButton) {
        primaryButton.focus();
        return;
      }
      
      // Enfocar primer botón
      const firstButton = alert.element.querySelector('.alert-button');
      if (firstButton) {
        firstButton.focus();
      }
    }, this.options.animationDuration);
  }
  
  // Métodos de gestión
  clear() {
    // Rechazar alerta activa
    if (this.activeAlert && this.activeAlert.reject) {
      this.activeAlert.reject(new Error('Alert cleared'));
    }
    
    // Rechazar cola
    this.queue.forEach(alert => {
      if (alert.reject) {
        alert.reject(new Error('Alert cleared'));
      }
    });
    
    this.hide();
    this.queue = [];
    
    return true;
  }
  
  // Métodos de utilidad
  generateId() {
    return 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  // Manejadores de eventos
  handleShowEvent(event) {
    this.show(event.detail);
  }
  
  handleHideEvent() {
    this.hide();
  }
  
  handleConfirmEvent(event) {
    this.confirm(event.detail.title, event.detail.message, event.detail.options);
  }
  
  handleKeydown(event) {
    if (!this.activeAlert) return;
    
    // Escape para cerrar
    if (event.key === 'Escape' && this.options.enableEscapeKey && this.activeAlert.allowEscapeKey) {
      if (this.activeAlert.reject) {
        this.activeAlert.reject(new Error('User cancelled'));
      }
      this.hide();
      return;
    }
    
    // Tab navigation
    if (event.key === 'Tab') {
      this.handleTabNavigation(event);
    }
  }
  
  handleTabNavigation(event) {
    const alert = this.activeAlert;
    if (!alert) return;
    
    const focusableElements = alert.element.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }
  
  handleResize() {
    // Reposicionar alert si es necesario
    if (this.activeAlert) {
      // Los estilos CSS ya manejan el responsive
      // Aquí se podrían agregar ajustes adicionales si es necesario
    }
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // API pública de estado
  getActiveAlert() {
    return this.activeAlert;
  }
  
  getQueueLength() {
    return this.queue.length;
  }
  
  hasActiveAlert() {
    return this.activeAlert !== null;
  }
  
  // Configuración dinámica
  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    // Actualizar backdrop si cambió la opacidad
    if (this.backdrop && newOptions.backdropOpacity !== undefined) {
      this.backdrop.style.background = `rgba(0, 0, 0, ${newOptions.backdropOpacity})`;
    }
  }
  
  // Métodos de presets
  deleteConfirm(itemName, options = {}) {
    return this.confirm(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar "${itemName}"? Esta acción no se puede deshacer.`,
      {
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'warning',
        icon: '🗑️',
        ...options
      }
    );
  }
  
  saveConfirm(hasChanges = true, options = {}) {
    if (!hasChanges) {
      return Promise.resolve(false);
    }
    
    return this.confirm(
      'Guardar cambios',
      'Tienes cambios sin guardar. ¿Quieres guardarlos antes de continuar?',
      {
        confirmText: 'Guardar',
        cancelText: 'Descartar',
        type: 'question',
        icon: '💾',
        ...options
      }
    );
  }
  
  exitConfirm(options = {}) {
    return this.confirm(
      'Confirmar salida',
      '¿Estás seguro de que quieres salir? Los cambios no guardados se perderán.',
      {
        confirmText: 'Salir',
        cancelText: 'Cancelar',
        type: 'warning',
        icon: '🚪',
        ...options
      }
    );
  }
  
  // Métodos de loading
  showLoading(message = 'Cargando...', options = {}) {
    return this.show({
      type: 'info',
      title: message,
      icon: '⟳',
      buttons: [],
      allowClickOutside: false,
      allowEscapeKey: false,
      ...options
    });
  }
  
  // Métodos de validación
  validateForm(formData, rules) {
    const errors = [];
    
    Object.entries(rules).forEach(([field, rule]) => {
      const value = formData[field];
      
      if (rule.required && (!value || value.trim() === '')) {
        errors.push(`${rule.label || field} es requerido`);
      }
      
      if (value && rule.minLength && value.length < rule.minLength) {
        errors.push(`${rule.label || field} debe tener al menos ${rule.minLength} caracteres`);
      }
      
      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.message || `${rule.label || field} no tiene el formato correcto`);
      }
    });
    
    if (errors.length > 0) {
      return this.error(
        'Errores de validación',
        'Por favor corrige los siguientes errores:',
        {
          details: errors.map(error => `• ${error}`).join('\n')
        }
      );
    }
    
    return Promise.resolve(true);
  }
  
  // Limpieza
  destroy() {
    console.log('🧹 Destruyendo Alert Controller...');
    
    // Limpiar alertas activas
    this.clear();
    
    // Remover backdrop
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
    
    // Remover estilos
    const styleElement = document.getElementById('alert-styles');
    if (styleElement) {
      styleElement.remove();
    }
    
    // Limpiar referencias
    this.alerts.clear();
    this.queue = [];
    this.activeAlert = null;
    this.backdrop = null;
    
    console.log('✅ Alert Controller destruido');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.AlertController = AlertController;
}

export default AlertController;