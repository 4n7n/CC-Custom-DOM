/**
 * Community Stories Platform - Event Bus
 * Sistema centralizado de eventos para comunicación entre componentes
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
    this.wildcardListeners = [];
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    this.debugMode = false;
    this.asyncQueue = [];
    this.processing = false;
    
    this.init();
  }

  /**
   * Inicializa el Event Bus
   */
  init() {
    // Verificar si existe ConfigManager
    if (typeof ConfigManager !== 'undefined' && ConfigManager.get) {
      this.debugMode = ConfigManager.get('development.debug', false);
    }
    
    if (this.debugMode) {
      console.log('🚌 EventBus initialized in debug mode');
      this.enableDebugLogging();
    }

    // Procesar cola async
    this.processAsyncQueue();
  }

  /**
   * Habilita logging de debug
   */
  enableDebugLogging() {
    // Interceptar todos los métodos para logging
    const methods = ['on', 'once', 'off', 'emit', 'onAny', 'offAny'];
    methods.forEach(method => {
      const original = this[method];
      this[method] = function(...args) {
        console.log(`🚌 EventBus.${method}:`, ...args);
        return original.apply(this, args);
      };
    });
  }

  /**
   * Suscribe a un evento
   */
  on(eventName, callback, context = null) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const listener = {
      callback,
      context,
      id: this.generateListenerId('listener'),
      subscribedAt: Date.now()
    };

    this.events.get(eventName).push(listener);

    if (this.debugMode) {
      console.log(`📝 Event subscribed: ${eventName}`, listener);
    }

    // Retornar función de desuscripción
    return () => this.off(eventName, callback);
  }

  /**
   * Suscribe a un evento una sola vez
   */
  once(eventName, callback, context = null) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.onceEvents.has(eventName)) {
      this.onceEvents.set(eventName, []);
    }

    const listener = {
      callback,
      context,
      id: this.generateListenerId('once-listener'),
      subscribedAt: Date.now()
    };

    this.onceEvents.get(eventName).push(listener);

    if (this.debugMode) {
      console.log(`📝 One-time event subscribed: ${eventName}`, listener);
    }

    // Retornar función de desuscripción
    return () => this.offOnce(eventName, callback);
  }

  /**
   * Desuscribe de un evento
   */
  off(eventName, callback = null) {
    if (!callback) {
      // Remover todos los listeners del evento
      this.events.delete(eventName);
      this.onceEvents.delete(eventName);
      
      if (this.debugMode) {
        console.log(`🗑️ All listeners removed for event: ${eventName}`);
      }
      return;
    }

    // Remover listener específico
    if (this.events.has(eventName)) {
      const listeners = this.events.get(eventName);
      const filteredListeners = listeners.filter(listener => listener.callback !== callback);
      
      if (filteredListeners.length === 0) {
        this.events.delete(eventName);
      } else {
        this.events.set(eventName, filteredListeners);
      }
    }

    if (this.debugMode) {
      console.log(`🗑️ Listener removed for event: ${eventName}`);
    }
  }

  /**
   * Desuscribe de evento once
   */
  offOnce(eventName, callback) {
    if (this.onceEvents.has(eventName)) {
      const listeners = this.onceEvents.get(eventName);
      const filteredListeners = listeners.filter(listener => listener.callback !== callback);
      
      if (filteredListeners.length === 0) {
        this.onceEvents.delete(eventName);
      } else {
        this.onceEvents.set(eventName, filteredListeners);
      }
    }
  }

  /**
   * Emite un evento
   */
  emit(eventName, data = null, options = {}) {
    const defaultOptions = {
      async: false,
      bubbles: true,
      cancelable: true
    };

    const eventOptions = { ...defaultOptions, ...options };
    
    const eventData = {
      name: eventName,
      data: data,
      timestamp: Date.now(),
      options: eventOptions,
      id: this.generateEventId('event'),
      propagationStopped: false,
      defaultPrevented: false
    };

    // Añadir métodos de control
    eventData.stopPropagation = () => {
      eventData.propagationStopped = true;
    };

    eventData.preventDefault = () => {
      eventData.defaultPrevented = true;
    };

    // Añadir a historial
    this.addToHistory(eventData);

    if (this.debugMode) {
      console.log(`📤 Event emitted: ${eventName}`, eventData);
    }

    if (eventOptions.async) {
      // Añadir a cola async
      this.asyncQueue.push(() => this.executeEvent(eventName, eventData));
      this.processAsyncQueue();
    } else {
      // Ejecutar síncronamente
      this.executeEvent(eventName, eventData);
    }

    return eventData;
  }

  /**
   * Ejecuta un evento
   */
  executeEvent(eventName, eventData) {
    // Ejecutar listeners normales
    this.executeListeners(eventName, eventData);

    // Ejecutar listeners once y removerlos
    this.executeOnceListeners(eventName, eventData);

    // Ejecutar wildcard listeners
    this.executeWildcardListeners(eventName, eventData);
  }

  /**
   * Ejecuta listeners normales
   */
  executeListeners(eventName, eventData) {
    const listeners = this.events.get(eventName) || [];
    this.runListeners(listeners, eventData);
  }

  /**
   * Ejecuta listeners once
   */
  executeOnceListeners(eventName, eventData) {
    const onceListeners = this.onceEvents.get(eventName) || [];

    if (onceListeners.length > 0) {
      this.runListeners(onceListeners, eventData);
      // Remover listeners once después de ejecutarlos
      this.onceEvents.delete(eventName);
    }
  }

  /**
   * Ejecuta wildcard listeners
   */
  executeWildcardListeners(eventName, eventData) {
    if (this.wildcardListeners.length > 0) {
      this.runListeners(this.wildcardListeners, eventData);
    }
  }

  /**
   * Ejecuta lista de listeners
   */
  runListeners(listeners, eventData) {
    for (const listener of listeners) {
      if (eventData.propagationStopped) break;

      try {
        if (listener.context) {
          listener.callback.call(listener.context, eventData);
        } else {
          listener.callback(eventData);
        }
      } catch (error) {
        this.handleListenerError(error, listener, eventData);
      }
    }
  }

  /**
   * Maneja errores en listeners
   */
  handleListenerError(error, listener, eventData) {
    if (this.debugMode) {
      console.error(`❌ Error in event listener for ${eventData.name}:`, error);
    }
    
    // Emitir evento de error
    if (eventData.name !== 'eventbus:error') {
      this.emit('eventbus:error', {
        originalEvent: eventData.name,
        listenerId: listener.id,
        error: {
          message: error.message,
          stack: error.stack
        }
      });
    }

    // Reportar error si existe handler global
    if (typeof ErrorHandler !== 'undefined' && ErrorHandler.logError) {
      ErrorHandler.logError({
        type: 'event_listener',
        message: `Error in event listener for ${eventData.name}`,
        error: error.message,
        stack: error.stack,
        eventName: eventData.name,
        listenerId: listener.id
      });
    }
  }

  /**
   * Suscribe a eventos con wildcard (*)
   */
  onAny(callback, context = null) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    const listener = {
      callback,
      context,
      id: this.generateListenerId('wildcard-listener'),
      subscribedAt: Date.now()
    };

    this.wildcardListeners.push(listener);

    if (this.debugMode) {
      console.log('📝 Wildcard listener added', listener);
    }

    // Retornar función de desuscripción
    return () => this.offAny(callback);
  }

  /**
   * Desuscribe wildcard listener
   */
  offAny(callback = null) {
    if (!callback) {
      this.wildcardListeners = [];
      if (this.debugMode) {
        console.log('🗑️ All wildcard listeners removed');
      }
      return;
    }

    this.wildcardListeners = this.wildcardListeners.filter(
      listener => listener.callback !== callback
    );

    if (this.debugMode) {
      console.log('🗑️ Wildcard listener removed');
    }
  }

  /**
   * Añade evento al historial
   */
  addToHistory(eventData) {
    this.eventHistory.unshift(eventData);

    // Mantener tamaño máximo del historial
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Obtiene historial de eventos
   */
  getHistory(eventName = null, limit = 50) {
    let history = this.eventHistory;

    if (eventName) {
      history = history.filter(event => event.name === eventName);
    }

    return history.slice(0, limit);
  }

  /**
   * Limpia el historial
   */
  clearHistory() {
    this.eventHistory = [];
    if (this.debugMode) {
      console.log('🗑️ Event history cleared');
    }
  }

  /**
   * Verifica si hay listeners para un evento
   */
  hasListeners(eventName) {
    const regularListeners = this.events.has(eventName) && this.events.get(eventName).length > 0;
    const onceListeners = this.onceEvents.has(eventName) && this.onceEvents.get(eventName).length > 0;
    const wildcardListeners = this.wildcardListeners.length > 0;

    return regularListeners || onceListeners || wildcardListeners;
  }

  /**
   * Obtiene contador de listeners para un evento
   */
  getListenerCount(eventName) {
    const regularCount = this.events.has(eventName) ? this.events.get(eventName).length : 0;
    const onceCount = this.onceEvents.has(eventName) ? this.onceEvents.get(eventName).length : 0;
    const wildcardCount = this.wildcardListeners.length;

    return {
      regular: regularCount,
      once: onceCount,
      wildcard: wildcardCount,
      total: regularCount + onceCount + wildcardCount
    };
  }

  /**
   * Obtiene todos los nombres de eventos registrados
   */
  getEventNames() {
    const regularEvents = Array.from(this.events.keys());
    const onceEvents = Array.from(this.onceEvents.keys());
    return [...new Set([...regularEvents, ...onceEvents])];
  }

  /**
   * Limpia todos los listeners
   */
  clear() {
    this.events.clear();
    this.onceEvents.clear();
    this.wildcardListeners = [];
    this.clearHistory();
    this.asyncQueue = [];
    
    if (this.debugMode) {
      console.log('🗑️ EventBus cleared');
    }
  }

  /**
   * Espera a que se emita un evento
   */
  waitFor(eventName, timeout = null) {
    return new Promise((resolve, reject) => {
      let timeoutId;

      const cleanup = this.once(eventName, (eventData) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(eventData);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout waiting for event: ${eventName}`));
        }, timeout);
      }
    });
  }

  /**
   * Emite múltiples eventos en secuencia
   */
  emitSequence(events, interval = 0) {
    return events.reduce((promise, event) => {
      return promise.then(() => {
        return new Promise(resolve => {
          this.emit(event.name, event.data, event.options);
          setTimeout(resolve, interval);
        });
      });
    }, Promise.resolve());
  }

  /**
   * Agrupa eventos y los emite como uno solo
   */
  batch(events) {
    const batchId = this.generateEventId('batch');
    const results = [];

    events.forEach(event => {
      const result = this.emit(event.name, event.data, { ...event.options, batchId });
      results.push(result);
    });

    this.emit('eventbus:batch', {
      batchId,
      events: results
    });

    return results;
  }

  /**
   * Procesa cola de eventos async
   */
  processAsyncQueue() {
    if (this.processing || this.asyncQueue.length === 0) return;

    this.processing = true;

    requestAnimationFrame(() => {
      const batch = this.asyncQueue.splice(0, 10); // Procesar hasta 10 eventos por frame
      
      batch.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.error('Error processing async event:', error);
        }
      });

      this.processing = false;

      // Continuar procesando si hay más eventos
      if (this.asyncQueue.length > 0) {
        this.processAsyncQueue();
      }
    });
  }

  /**
   * Genera ID único para listener
   */
  generateListenerId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Genera ID único para evento
   */
  generateEventId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtiene estadísticas del EventBus
   */
  getStats() {
    const eventNames = this.getEventNames();
    const listenerCounts = {};

    eventNames.forEach(name => {
      listenerCounts[name] = this.getListenerCount(name);
    });

    return {
      totalEvents: eventNames.length,
      totalListeners: Object.values(listenerCounts).reduce((sum, counts) => sum + counts.total, 0),
      wildcardListeners: this.wildcardListeners.length,
      historySize: this.eventHistory.length,
      asyncQueueSize: this.asyncQueue.length,
      listenersByEvent: listenerCounts
    };
  }

  /**
   * Plugin system
   */
  use(plugin) {
    if (typeof plugin.install === 'function') {
      plugin.install(this);
    } else if (typeof plugin === 'function') {
      plugin(this);
    }
    return this;
  }
}

// Crear instancia global del EventBus
window.EventBus = new EventBus();

// Alias convenientes
window.eventBus = window.EventBus;
window.events = window.EventBus;