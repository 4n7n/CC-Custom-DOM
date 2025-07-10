/* ==================================================
   RAMA 9: State Manager
   Gestor centralizado de estados de UI
   ================================================== */

class StateManager {
  constructor(options = {}) {
    this.options = {
      enablePersistence: true,
      enableHistory: true,
      enableDevTools: false,
      historyLimit: 50,
      persistenceKey: 'rama9-ui-state',
      enableMiddleware: true,
      enableLogging: false,
      enableValidation: true,
      ...options
    };
    
    this.state = {};
    this.history = [];
    this.middlewares = [];
    this.validators = new Map();
    this.subscribers = new Map();
    this.asyncActions = new Map();
    
    this.isUpdating = false;
    this.updateQueue = [];
    this.batchTimeout = null;
    
    this.init();
  }
  
  init() {
    console.log('🗂️ Inicializando State Manager...');
    
    this.initializeDefaultState();
    this.loadPersistedState();
    this.setupEventListeners();
    this.setupDevTools();
    this.registerDefaultMiddlewares();
    this.registerDefaultValidators();
    
    console.log('✅ State Manager inicializado');
  }
  
  initializeDefaultState() {
    this.state = {
      ui: {
        theme: 'auto',
        layout: 'default',
        sidebar: {
          collapsed: false,
          visible: true
        },
        header: {
          visible: true,
          compact: false
        },
        notifications: {
          enabled: true,
          position: 'top-right',
          maxVisible: 5
        },
        animations: {
          enabled: true,
          reducedMotion: false
        },
        loading: {
          global: false,
          components: {}
        },
        modals: {
          stack: [],
          backdrop: true
        },
        focus: {
          current: null,
          history: []
        }
      },
      user: {
        preferences: {
          language: 'es',
          timezone: 'America/Mexico_City',
          notifications: true,
          sounds: true,
          haptics: true
        },
        session: {
          authenticated: false,
          token: null,
          expires: null
        }
      },
      app: {
        ready: false,
        version: '1.0.0',
        environment: 'production',
        features: {
          betaFeatures: false,
          experimentalFeatures: false
        },
        performance: {
          metrics: {},
          monitoring: true
        }
      }
    };
  }
  
  loadPersistedState() {
    if (!this.options.enablePersistence) return;
    
    try {
      const persistedState = localStorage.getItem(this.options.persistenceKey);
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        this.state = this.mergeStates(this.state, parsed);
        this.log('Estado cargado desde almacenamiento local');
      }
    } catch (error) {
      console.warn('Error cargando estado persistido:', error);
    }
  }
  
  setupEventListeners() {
    // Escuchar eventos de cambio de estado
    document.addEventListener('state:set', this.handleSetEvent.bind(this));
    document.addEventListener('state:update', this.handleUpdateEvent.bind(this));
    document.addEventListener('state:reset', this.handleResetEvent.bind(this));
    
    // Escuchar eventos de tema
    document.addEventListener('theme:change', this.handleThemeChange.bind(this));
    
    // Escuchar eventos de layout
    document.addEventListener('layout:change', this.handleLayoutChange.bind(this));
    
    // Escuchar cambios de visibilidad
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Escuchar eventos de almacenamiento
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }
  
  setupDevTools() {
    if (!this.options.enableDevTools || typeof window === 'undefined') return;
    
    // Exponer API para DevTools
    window.__RAMA9_STATE_MANAGER__ = {
      getState: () => this.getState(),
      setState: (path, value) => this.set(path, value),
      getHistory: () => this.history,
      subscribe: (path, callback) => this.subscribe(path, callback),
      dispatch: (action) => this.dispatch(action)
    };
    
    this.log('DevTools habilitadas');
  }
  
  registerDefaultMiddlewares() {
    if (!this.options.enableMiddleware) return;
    
    // Middleware de logging
    if (this.options.enableLogging) {
      this.use(this.createLoggingMiddleware());
    }
    
    // Middleware de persistencia
    if (this.options.enablePersistence) {
      this.use(this.createPersistenceMiddleware());
    }
    
    // Middleware de validación
    if (this.options.enableValidation) {
      this.use(this.createValidationMiddleware());
    }
    
    // Middleware de historial
    if (this.options.enableHistory) {
      this.use(this.createHistoryMiddleware());
    }
  }
  
  registerDefaultValidators() {
    // Validador para tema
    this.addValidator('ui.theme', (value) => {
      const validThemes = ['light', 'dark', 'auto'];
      return validThemes.includes(value);
    });
    
    // Validador para layout
    this.addValidator('ui.layout', (value) => {
      const validLayouts = ['default', 'reading', 'community', 'fullscreen', 'minimal'];
      return validLayouts.includes(value);
    });
    
    // Validador para posición de notificaciones
    this.addValidator('ui.notifications.position', (value) => {
      const validPositions = ['top-left', 'top-right', 'top-center', 'bottom-left', 'bottom-right', 'bottom-center'];
      return validPositions.includes(value);
    });
  }
  
  // API principal de estado
  get(path) {
    if (!path) return this.state;
    
    return this.getNestedValue(this.state, path);
  }
  
  set(path, value, options = {}) {
    if (this.isUpdating && !options.force) {
      this.updateQueue.push({ path, value, options });
      return this.processUpdateQueue();
    }
    
    const oldValue = this.get(path);
    const newState = this.setNestedValue({ ...this.state }, path, value);
    
    // Ejecutar middlewares
    const action = {
      type: 'SET',
      path,
      value,
      oldValue,
      timestamp: Date.now(),
      options
    };
    
    const processedAction = this.runMiddlewares(action, newState);
    
    if (processedAction === false) {
      this.log(`Acción bloqueada por middleware: ${path}`);
      return false;
    }
    
    // Actualizar estado
    this.state = newState;
    
    // Notificar suscriptores
    this.notifySubscribers(path, value, oldValue);
    
    // Emitir evento global
    this.emit('state:changed', { path, value, oldValue });
    
    this.log(`Estado actualizado: ${path} = ${JSON.stringify(value)}`);
    
    return true;
  }
  
  update(path, updater, options = {}) {
    const currentValue = this.get(path);
    const newValue = typeof updater === 'function' ? updater(currentValue) : updater;
    return this.set(path, newValue, options);
  }
  
  merge(path, value, options = {}) {
    const currentValue = this.get(path);
    if (typeof currentValue === 'object' && typeof value === 'object') {
      const mergedValue = this.mergeStates(currentValue, value);
      return this.set(path, mergedValue, options);
    }
    return this.set(path, value, options);
  }
  
  delete(path, options = {}) {
    const keys = path.split('.');
    const newState = { ...this.state };
    
    let current = newState;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]]) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      } else {
        return false;
      }
    }
    
    const lastKey = keys[keys.length - 1];
    const oldValue = current[lastKey];
    delete current[lastKey];
    
    // Ejecutar middlewares
    const action = {
      type: 'DELETE',
      path,
      oldValue,
      timestamp: Date.now(),
      options
    };
    
    const processedAction = this.runMiddlewares(action, newState);
    
    if (processedAction === false) {
      return false;
    }
    
    this.state = newState;
    this.notifySubscribers(path, undefined, oldValue);
    this.emit('state:changed', { path, value: undefined, oldValue });
    
    return true;
  }
  
  reset(path, options = {}) {
    if (!path) {
      // Reset completo
      this.initializeDefaultState();
      this.notifyAllSubscribers();
      this.emit('state:reset', { full: true });
    } else {
      // Reset de una rama específica
      const defaultValue = this.getNestedValue(this.getDefaultState(), path);
      this.set(path, defaultValue, options);
    }
  }
  
  // Sistema de suscripciones
  subscribe(path, callback, options = {}) {
    const subscriptionId = this.generateSubscriptionId();
    
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Map());
    }
    
    this.subscribers.get(path).set(subscriptionId, {
      callback,
      options,
      created: Date.now()
    });
    
    // Llamar inmediatamente si está configurado
    if (options.immediate) {
      callback(this.get(path), undefined);
    }
    
    // Retornar función de desuscripción
    return () => this.unsubscribe(path, subscriptionId);
  }
  
  unsubscribe(path, subscriptionId) {
    if (this.subscribers.has(path)) {
      const pathSubscribers = this.subscribers.get(path);
      pathSubscribers.delete(subscriptionId);
      
      if (pathSubscribers.size === 0) {
        this.subscribers.delete(path);
      }
    }
  }
  
  notifySubscribers(path, newValue, oldValue) {
    // Notificar suscriptores exactos
    if (this.subscribers.has(path)) {
      this.subscribers.get(path).forEach(subscription => {
        try {
          subscription.callback(newValue, oldValue);
        } catch (error) {
          console.error('Error en suscriptor:', error);
        }
      });
    }
    
    // Notificar suscriptores de rutas padre
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (this.subscribers.has(parentPath)) {
        const parentValue = this.get(parentPath);
        this.subscribers.get(parentPath).forEach(subscription => {
          if (subscription.options.deep !== false) {
            try {
              subscription.callback(parentValue, parentValue);
            } catch (error) {
              console.error('Error en suscriptor padre:', error);
            }
          }
        });
      }
    }
  }
  
  notifyAllSubscribers() {
    this.subscribers.forEach((pathSubscribers, path) => {
      const currentValue = this.get(path);
      pathSubscribers.forEach(subscription => {
        try {
          subscription.callback(currentValue, currentValue);
        } catch (error) {
          console.error('Error en suscriptor:', error);
        }
      });
    });
  }
  
  // Sistema de middlewares
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware debe ser una función');
    }
    
    this.middlewares.push(middleware);
    return () => {
      const index = this.middlewares.indexOf(middleware);
      if (index > -1) {
        this.middlewares.splice(index, 1);
      }
    };
  }
  
  runMiddlewares(action, newState) {
    let currentAction = action;
    
    for (const middleware of this.middlewares) {
      try {
        const result = middleware(currentAction, newState, this);
        if (result === false) {
          return false; // Bloquear acción
        }
        if (result && typeof result === 'object') {
          currentAction = result; // Modificar acción
        }
      } catch (error) {
        console.error('Error en middleware:', error);
      }
    }
    
    return currentAction;
  }
  
  createLoggingMiddleware() {
    return (action, newState) => {
      console.group(`🗂️ State: ${action.type} ${action.path}`);
      console.log('Valor anterior:', action.oldValue);
      console.log('Valor nuevo:', action.value);
      console.log('Estado completo:', newState);
      console.groupEnd();
    };
  }
  
  createPersistenceMiddleware() {
    return (action, newState) => {
      // Persistir solo ciertas rutas
      const persistablePaths = ['ui', 'user.preferences'];
      const shouldPersist = persistablePaths.some(path => action.path.startsWith(path));
      
      if (shouldPersist) {
        try {
          localStorage.setItem(this.options.persistenceKey, JSON.stringify(newState));
        } catch (error) {
          console.warn('Error persistiendo estado:', error);
        }
      }
    };
  }
  
  createValidationMiddleware() {
    return (action) => {
      if (this.validators.has(action.path)) {
        const validator = this.validators.get(action.path);
        if (!validator(action.value)) {
          console.warn(`Validación fallida para ${action.path}:`, action.value);
          return false;
        }
      }
    };
  }
  
  createHistoryMiddleware() {
    return (action, newState) => {
      if (action.type !== 'HISTORY_UNDO' && action.type !== 'HISTORY_REDO') {
        this.addToHistory(action);
      }
    };
  }
  
  // Sistema de validación
  addValidator(path, validator) {
    this.validators.set(path, validator);
  }
  
  removeValidator(path) {
    return this.validators.delete(path);
  }
  
  // Sistema de historial
  addToHistory(action) {
    if (!this.options.enableHistory) return;
    
    this.history.push({
      ...action,
      id: this.generateHistoryId()
    });
    
    // Limitar tamaño del historial
    if (this.history.length > this.options.historyLimit) {
      this.history = this.history.slice(-this.options.historyLimit);
    }
  }
  
  undo() {
    if (!this.options.enableHistory || this.history.length === 0) return false;
    
    const lastAction = this.history.pop();
    if (lastAction.type === 'SET') {
      this.set(lastAction.path, lastAction.oldValue, { 
        type: 'HISTORY_UNDO',
        skipHistory: true 
      });
    } else if (lastAction.type === 'DELETE') {
      this.set(lastAction.path, lastAction.oldValue, { 
        type: 'HISTORY_UNDO',
        skipHistory: true 
      });
    }
    
    this.emit('state:undo', lastAction);
    return true;
  }
  
  clearHistory() {
    this.history = [];
  }
  
  // Acciones asíncronas
  async dispatch(action) {
    if (typeof action === 'string') {
      // Nombre de acción registrada
      if (this.asyncActions.has(action)) {
        const actionFn = this.asyncActions.get(action);
        return await actionFn(this);
      }
    } else if (typeof action === 'function') {
      // Función de acción directa
      return await action(this);
    } else if (typeof action === 'object') {
      // Objeto de acción
      return await this.processActionObject(action);
    }
    
    throw new Error('Tipo de acción no válido');
  }
  
  registerAction(name, actionFn) {
    this.asyncActions.set(name, actionFn);
    
    return () => {
      this.asyncActions.delete(name);
    };
  }
  
  async processActionObject(action) {
    switch (action.type) {
      case 'BATCH_UPDATE':
        return this.batchUpdate(action.updates);
      case 'ASYNC_SET':
        return this.asyncSet(action.path, action.valuePromise);
      case 'CONDITIONAL_SET':
        return this.conditionalSet(action.path, action.value, action.condition);
      default:
        throw new Error(`Tipo de acción desconocido: ${action.type}`);
    }
  }
  
  // Operaciones especiales
  batchUpdate(updates) {
    this.isUpdating = true;
    
    const results = updates.map(update => {
      return this.set(update.path, update.value, { 
        ...update.options, 
        batch: true 
      });
    });
    
    this.isUpdating = false;
    this.processUpdateQueue();
    
    return results;
  }
  
  async asyncSet(path, valuePromise) {
    try {
      this.set(`${path}._loading`, true);
      this.set(`${path}._error`, null);
      
      const value = await valuePromise;
      this.set(path, value);
      this.set(`${path}._loading`, false);
      
      return value;
    } catch (error) {
      this.set(`${path}._loading`, false);
      this.set(`${path}._error`, error.message);
      throw error;
    }
  }
  
  conditionalSet(path, value, condition) {
    const shouldSet = typeof condition === 'function' 
      ? condition(this.get(path), this.state)
      : condition;
      
    if (shouldSet) {
      return this.set(path, value);
    }
    
    return false;
  }
  
  processUpdateQueue() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      if (this.updateQueue.length > 0) {
        const updates = [...this.updateQueue];
        this.updateQueue = [];
        
        updates.forEach(update => {
          this.set(update.path, update.value, update.options);
        });
      }
    }, 0);
  }
  
  // Métodos de utilidad
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
  
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      } else {
        current[key] = { ...current[key] };
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
  }
  
  mergeStates(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeStates(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  generateSubscriptionId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateHistoryId() {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getDefaultState() {
    const manager = new StateManager({ enablePersistence: false });
    return manager.state;
  }
  
  // Manejadores de eventos
  handleSetEvent(event) {
    const { path, value, options } = event.detail;
    this.set(path, value, options);
  }
  
  handleUpdateEvent(event) {
    const { path, updater, options } = event.detail;
    this.update(path, updater, options);
  }
  
  handleResetEvent(event) {
    const { path, options } = event.detail;
    this.reset(path, options);
  }
  
  handleThemeChange(event) {
    const { theme } = event.detail;
    this.set('ui.theme', theme);
  }
  
  handleLayoutChange(event) {
    const { layout } = event.detail;
    this.set('ui.layout', layout);
  }
  
  handleVisibilityChange() {
    const isHidden = document.hidden;
    this.set('app.visibility', isHidden ? 'hidden' : 'visible');
  }
  
  handleStorageChange(event) {
    if (event.key === this.options.persistenceKey && event.newValue) {
      try {
        const newState = JSON.parse(event.newValue);
        this.state = this.mergeStates(this.state, newState);
        this.notifyAllSubscribers();
        this.emit('state:sync', { source: 'storage' });
      } catch (error) {
        console.warn('Error sincronizando estado desde storage:', error);
      }
    }
  }
  
  // API de conveniencia para UI
  toggleSidebar() {
    this.update('ui.sidebar.collapsed', collapsed => !collapsed);
  }
  
  toggleTheme() {
    this.update('ui.theme', theme => theme === 'light' ? 'dark' : 'light');
  }
  
  setLoading(component, loading = true) {
    if (component) {
      this.set(`ui.loading.components.${component}`, loading);
    } else {
      this.set('ui.loading.global', loading);
    }
  }
  
  pushModal(modalId) {
    this.update('ui.modals.stack', stack => [...stack, modalId]);
  }
  
  popModal() {
    this.update('ui.modals.stack', stack => stack.slice(0, -1));
  }
  
  setFocus(elementId) {
    const current = this.get('ui.focus.current');
    if (current) {
      this.update('ui.focus.history', history => [current, ...history.slice(0, 9)]);
    }
    this.set('ui.focus.current', elementId);
  }
  
  // Métodos de debugging
  log(message) {
    if (this.options.enableLogging) {
      console.log(`[StateManager] ${message}`);
    }
  }
  
  getStateSnapshot() {
    return {
      state: JSON.parse(JSON.stringify(this.state)),
      history: [...this.history],
      subscribers: Array.from(this.subscribers.keys()),
      middlewares: this.middlewares.length,
      timestamp: Date.now()
    };
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // API pública de información
  getState() {
    return { ...this.state };
  }
  
  getSubscriberCount() {
    let total = 0;
    this.subscribers.forEach(pathSubs => {
      total += pathSubs.size;
    });
    return total;
  }
  
  getMiddlewareCount() {
    return this.middlewares.length;
  }
  
  getHistoryLength() {
    return this.history.length;
  }
  
  // Limpieza
  destroy() {
    console.log('🧹 Destruyendo State Manager...');
    
    // Limpiar timeouts
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    // Limpiar suscriptores
    this.subscribers.clear();
    
    // Limpiar middlewares
    this.middlewares = [];
    
    // Limpiar validadores
    this.validators.clear();
    
    // Limpiar acciones
    this.asyncActions.clear();
    
    // Limpiar historial
    this.history = [];
    
    // Limpiar cola de actualizaciones
    this.updateQueue = [];
    
    // Limpiar DevTools
    if (typeof window !== 'undefined') {
      delete window.__RAMA9_STATE_MANAGER__;
    }
    
    console.log('✅ State Manager destruido');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.StateManager = StateManager;
}

export default StateManager;