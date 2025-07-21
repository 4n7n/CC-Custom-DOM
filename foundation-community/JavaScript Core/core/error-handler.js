/**
 * Community Stories Platform - Error Handler
 * Sistema centralizado de manejo de errores y logging
 */

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.isInitialized = false;
    this.retryAttempts = new Map();
    this.errorCallbacks = new Map();
    
    this.init();
  }

  /**
   * Inicializa el manejador de errores
   */
  init() {
    if (this.isInitialized) return;

    // Capturar errores JavaScript globales
    window.addEventListener('error', this.handleGlobalError.bind(this));
    
    // Capturar promesas rechazadas
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Capturar errores de recursos
    window.addEventListener('error', this.handleResourceError.bind(this), true);

    this.isInitialized = true;
    console.log('✅ ErrorHandler initialized');
  }

  /**
   * Maneja errores JavaScript globales
   */
  handleGlobalError(event) {
    const error = {
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.logError(error);
    this.notifyError(error);
  }

  /**
   * Maneja promesas rechazadas no capturadas
   */
  handleUnhandledRejection(event) {
    const error = {
      type: 'promise_rejection',
      message: event.reason?.message || 'Unhandled promise rejection',
      reason: event.reason,
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.logError(error);
    this.notifyError(error);
    
    // Prevenir que aparezca en la consola del navegador
    event.preventDefault();
  }

  /**
   * Maneja errores de carga de recursos
   */
  handleResourceError(event) {
    if (event.target !== window) {
      const error = {
        type: 'resource',
        message: `Failed to load resource: ${event.target.src || event.target.href}`,
        element: event.target.tagName,
        source: event.target.src || event.target.href,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

      this.logError(error);
      
      // Intentar cargar recurso alternativo
      this.handleResourceFallback(event.target);
    }
  }

  /**
   * Registra un error
   */
  logError(error, context = {}) {
    const enrichedError = {
      id: StringUtils.generateId('error'),
      severity: this.determineSeverity(error),
      context: {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        ...context
      },
      ...error
    };

    // Añadir a la lista local
    this.errors.unshift(enrichedError);
    
    // Mantener solo los últimos errores
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log en consola basado en severidad
    this.consoleLog(enrichedError);

    // Enviar a sistema de logging
    this.sendToLoggingService(enrichedError);

    // Almacenar localmente para debug
    this.storeErrorLocally(enrichedError);

    return enrichedError;
  }

  /**
   * Determina la severidad del error
   */
  determineSeverity(error) {
    if (error.type === 'resource') {
      return 'warning';
    }
    
    if (error.message?.includes('Network')) {
      return 'warning';
    }
    
    if (error.message?.includes('Script error')) {
      return 'info';
    }
    
    if (error.stack?.includes('TypeError') || error.stack?.includes('ReferenceError')) {
      return 'error';
    }
    
    return 'error';
  }

  /**
   * Log en consola según severidad
   */
  consoleLog(error) {
    const message = `[${error.severity.toUpperCase()}] ${error.message}`;
    
    switch (error.severity) {
      case 'error':
        console.error(message, error);
        break;
      case 'warning':
        console.warn(message, error);
        break;
      case 'info':
        console.info(message, error);
        break;
      default:
        console.log(message, error);
    }
  }

  /**
   * Maneja errores de API
   */
  handleApiError(response, requestData = {}) {
    const error = {
      type: 'api',
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      method: requestData.method || 'GET',
      requestData: requestData.body || null,
      timestamp: new Date().toISOString()
    };

    // Intentar extraer mensaje del response
    response.text().then(text => {
      try {
        const jsonError = JSON.parse(text);
        error.message = jsonError.message || jsonError.error || 'API Error';
        error.code = jsonError.code;
      } catch (e) {
        error.message = text || `HTTP ${response.status} Error`;
      }
      
      this.logError(error);
      this.notifyError(error);
    }).catch(() => {
      error.message = `HTTP ${response.status} Error`;
      this.logError(error);
      this.notifyError(error);
    });

    return error;
  }

  /**
   * Maneja errores de validación
   */
  handleValidationError(field, message, value = null) {
    const error = {
      type: 'validation',
      field: field,
      message: message,
      value: value,
      timestamp: new Date().toISOString()
    };

    this.logError(error, { severity: 'warning' });
    return error;
  }

  /**
   * Maneja errores de autenticación
   */
  handleAuthError(message, code = null) {
    const error = {
      type: 'authentication',
      message: message,
      code: code,
      timestamp: new Date().toISOString()
    };

    this.logError(error);
    
    // Redirigir a login si es necesario
    if (code === 'AUTH_EXPIRED' || code === 'AUTH_INVALID') {
      this.handleAuthRedirect();
    }

    return error;
  }

  /**
   * Maneja errores de red
   */
  handleNetworkError(error, url = null) {
    const networkError = {
      type: 'network',
      message: error.message || 'Network error',
      url: url,
      online: navigator.onLine,
      connectionType: navigator.connection?.effectiveType || 'unknown',
      timestamp: new Date().toISOString()
    };

    this.logError(networkError);
    
    // Si está offline, almacenar para reintento
    if (!navigator.onLine) {
      this.storeForRetry(networkError);
    }

    return networkError;
  }

  /**
   * Reintenta operaciones fallidas
   */
  async retryOperation(operationId, operation, maxRetries = 3) {
    const attempts = this.retryAttempts.get(operationId) || 0;
    
    if (attempts >= maxRetries) {
      throw new Error(`Max retry attempts reached for operation: ${operationId}`);
    }

    try {
      const result = await operation();
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      this.retryAttempts.set(operationId, attempts + 1);
      
      // Calcular delay exponencial
      const delay = Math.pow(2, attempts) * 1000;
      
      await NetworkUtils.delay(delay);
      
      return this.retryOperation(operationId, operation, maxRetries);
    }
  }

  /**
   * Notifica errores críticos al usuario
   */
  notifyError(error) {
    if (error.severity === 'error' && !this.isErrorNotified(error)) {
      const message = this.getUserFriendlyMessage(error);
      
      // Mostrar notificación toast
      this.showErrorToast(message, error);
      
      // Marcar como notificado
      this.markErrorAsNotified(error);
    }
  }

  /**
   * Convierte error técnico a mensaje amigable
   */
  getUserFriendlyMessage(error) {
    const messages = {
      network: 'Problema de conexión. Por favor, verifica tu internet.',
      api: 'Error del servidor. Intenta de nuevo en unos momentos.',
      validation: 'Por favor, verifica la información ingresada.',
      authentication: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
      resource: 'Error al cargar recursos. Recargando...',
      javascript: 'Error inesperado. La página se recargará automáticamente.'
    };

    return messages[error.type] || 'Ha ocurrido un error inesperado.';
  }

  /**
   * Muestra toast de error
   */
  showErrorToast(message, error) {
    // Crear elemento de toast
    const toast = DOMUtils.createElement('div', {
      className: 'error-toast',
      innerHTML: `
        <div class="error-toast__icon">⚠️</div>
        <div class="error-toast__content">
          <div class="error-toast__message">${message}</div>
          <div class="error-toast__actions">
            <button class="error-toast__retry">Reintentar</button>
            <button class="error-toast__dismiss">Cerrar</button>
          </div>
        </div>
      `
    });

    // Añadir event listeners
    const retryBtn = toast.querySelector('.error-toast__retry');
    const dismissBtn = toast.querySelector('.error-toast__dismiss');

    retryBtn.addEventListener('click', () => {
      this.retryLastOperation();
      this.removeToast(toast);
    });

    dismissBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });

    // Añadir al DOM
    document.body.appendChild(toast);

    // Auto-dismiss después de 10 segundos
    setTimeout(() => {
      if (toast.parentNode) {
        this.removeToast(toast);
      }
    }, 10000);
  }

  /**
   * Remueve toast del DOM
   */
  removeToast(toast) {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Maneja fallback de recursos
   */
  handleResourceFallback(element) {
    if (element.tagName === 'IMG') {
      const fallbackSrc = element.dataset.fallback || '/assets/images/placeholder.png';
      if (element.src !== fallbackSrc) {
        element.src = fallbackSrc;
      }
    } else if (element.tagName === 'VIDEO') {
      const fallbackSrc = element.dataset.fallback;
      if (fallbackSrc && element.src !== fallbackSrc) {
        element.src = fallbackSrc;
      }
    }
  }

  /**
   * Maneja redirección de autenticación
   */
  handleAuthRedirect() {
    const currentPath = window.location.pathname;
    const loginUrl = '/login';
    
    if (currentPath !== loginUrl) {
      // Guardar URL actual para redirigir después del login
      StorageUtils.setItem('redirect-after-login', currentPath);
      
      // Redirigir a login
      window.location.href = loginUrl;
    }
  }

  /**
   * Almacena operación para reintento
   */
  storeForRetry(error) {
    const retryQueue = StorageUtils.getItem('retry-queue', []);
    retryQueue.push({
      error: error,
      timestamp: Date.now()
    });
    
    // Limitar cola de reintentos
    if (retryQueue.length > 50) {
      retryQueue.splice(0, retryQueue.length - 50);
    }
    
    StorageUtils.setItem('retry-queue', retryQueue);
  }

  /**
   * Procesa cola de reintentos
   */
  async processRetryQueue() {
    const retryQueue = StorageUtils.getItem('retry-queue', []);
    const processedItems = [];

    for (const item of retryQueue) {
      try {
        // Reintenta operación basada en el tipo de error
        await this.retryBasedOnErrorType(item.error);
        processedItems.push(item);
      } catch (error) {
        // Si aún falla, mantener en cola
      }
    }

    // Remover elementos procesados exitosamente
    const remainingQueue = retryQueue.filter(item => !processedItems.includes(item));
    StorageUtils.setItem('retry-queue', remainingQueue);
  }

  /**
   * Reintenta según tipo de error
   */
  async retryBasedOnErrorType(error) {
    switch (error.type) {
      case 'network':
        if (error.url) {
          const response = await fetch(error.url);
          if (!response.ok) throw new Error('Retry failed');
        }
        break;
      case 'api':
        // Reintenta llamada API
        break;
      default:
        // No hacer nada para otros tipos
        break;
    }
  }

  /**
   * Envía error a servicio de logging
   */
  sendToLoggingService(error) {
    if (!ConfigManager.get('development.debug')) {
      // Solo enviar en producción
      NetworkUtils.fetchWithRetry('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      }).catch(() => {
        // Fallar silenciosamente para evitar bucles
      });
    }
  }

  /**
   * Almacena error localmente para debug
   */
  storeErrorLocally(error) {
    if (ConfigManager.get('development.debug')) {
      const localErrors = StorageUtils.getItem('debug-errors', []);
      localErrors.unshift(error);
      
      // Mantener solo los últimos 50 errores
      if (localErrors.length > 50) {
        localErrors.splice(50);
      }
      
      StorageUtils.setItem('debug-errors', localErrors, 24 * 60); // 24 horas
    }
  }

  /**
   * Verifica si error ya fue notificado
   */
  isErrorNotified(error) {
    const key = `error-notified-${error.type}-${error.message}`;
    return StorageUtils.getItem(key, false);
  }

  /**
   * Marca error como notificado
   */
  markErrorAsNotified(error) {
    const key = `error-notified-${error.type}-${error.message}`;
    StorageUtils.setItem(key, true, 5); // 5 minutos
  }

  /**
   * Registra callback para tipo de error específico
   */
  onError(errorType, callback) {
    if (!this.errorCallbacks.has(errorType)) {
      this.errorCallbacks.set(errorType, []);
    }
    
    this.errorCallbacks.get(errorType).push(callback);
  }

  /**
   * Ejecuta callbacks registrados
   */
  executeCallbacks(error) {
    const callbacks = this.errorCallbacks.get(error.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Obtiene estadísticas de errores
   */
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      bySeverity: {},
      lastHour: 0,
      last24Hours: 0
    };

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    this.errors.forEach(error => {
      // Por tipo
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Por severidad
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Por tiempo
      const errorTime = new Date(error.timestamp).getTime();
      if (now - errorTime < oneHour) {
        stats.lastHour++;
      }
      if (now - errorTime < oneDay) {
        stats.last24Hours++;
      }
    });

    return stats;
  }

  /**
   * Limpia errores antiguos
   */
  cleanup() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 días
    
    this.errors = this.errors.filter(error => {
      return new Date(error.timestamp).getTime() > cutoff;
    });
  }

  /**
   * Exporta errores para análisis
   */
  exportErrors() {
    const data = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stats: this.getErrorStats(),
      errors: this.errors
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Crear instancia global
const errorHandler = new ErrorHandler();

// Procesar cola de reintentos cuando se conecte
window.addEventListener('online', () => {
  errorHandler.processRetryQueue();
});

// Limpiar errores periódicamente
setInterval(() => {
  errorHandler.cleanup();
}, 24 * 60 * 60 * 1000); // Cada 24 horas

// Exportar al scope global
window.ErrorHandler = ErrorHandler;
window.errorHandler = errorHandler;

console.log('✅ Community Stories Platform - Error Handler loaded');