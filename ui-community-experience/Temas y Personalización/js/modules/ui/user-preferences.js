/* ==================================================
   RAMA 9: User Preferences Module
   Gestión completa de preferencias del usuario
   ================================================== */

class UserPreferences {
  constructor(options = {}) {
    this.options = {
      enableCloudSync: true,
      enableAutoBackup: true,
      enablePreferenceAnalytics: true,
      autoSaveDelay: 2000,
      maxBackupHistory: 10,
      encryptSensitiveData: true,
      ...options
    };
    
    this.preferences = {
      // Preferencias de interfaz
      interface: {
        theme: 'dark-epic',
        language: 'es',
        fontSize: 'medium',
        animations: true,
        soundEffects: false,
        reducedMotion: false,
        highContrast: false
      },
      
      // Preferencias de personalización
      customization: {
        allowCustomThemes: true,
        enableSeasonalThemes: false,
        autoThemeSwitch: false,
        culturalVariant: 'default'
      },
      
      // Preferencias de sponsors/marcas
      branding: {
        allowBranding: true,
        brandIntensity: 0.5,
        preferredBrands: [],
        blockedBrands: [],
        allowRotation: true
      },
      
      // Preferencias de contenido
      content: {
        autoPlay: false,
        showSpoilers: false,
        contentRating: 'all',
        preferredGenres: [],
        bookmarkedChapters: []
      },
      
      // Preferencias de notificaciones
      notifications: {
        enabled: true,
        pushNotifications: false,
        emailNotifications: true,
        soundAlerts: false,
        frequency: 'normal',
        categories: {
          updates: true,
          community: true,
          achievements: true,
          sponsors: false
        }
      },
      
      // Preferencias de privacidad
      privacy: {
        analytics: true,
        personalizedContent: true,
        dataSharing: false,
        cookieConsent: false,
        trackingConsent: false
      },
      
      // Preferencias de accesibilidad
      accessibility: {
        screenReader: false,
        keyboardNavigation: true,
        focusIndicators: true,
        largeText: false,
        colorBlindSupport: false
      }
    };
    
    this.defaultPreferences = JSON.parse(JSON.stringify(this.preferences));
    this.backupHistory = [];
    this.pendingSave = null;
    this.syncInProgress = false;
    this.validationRules = new Map();
    
    this.init();
  }
  
  init() {
    console.log('⚙️ Inicializando User Preferences...');
    
    this.setupValidationRules();
    this.setupEventListeners();
    this.loadUserPreferences();
    this.setupAutoSave();
    this.setupCloudSync();
    this.validatePreferences();
    
    console.log('✅ User Preferences inicializado');
  }
  
  setupValidationRules() {
    // Reglas de validación para preferencias
    this.validationRules.set('interface.theme', {
      type: 'string',
      allowedValues: ['dark-epic', 'light-elegant', 'cyberpunk-neon', 'nature-organic', 'ocean-deep', 'sunset-warm', 'galactic-purple'],
      default: 'dark-epic'
    });
    
    this.validationRules.set('interface.language', {
      type: 'string',
      allowedValues: ['es', 'en', 'fr', 'de', 'it', 'pt'],
      default: 'es'
    });
    
    this.validationRules.set('interface.fontSize', {
      type: 'string',
      allowedValues: ['small', 'medium', 'large', 'extra-large'],
      default: 'medium'
    });
    
    this.validationRules.set('branding.brandIntensity', {
      type: 'number',
      min: 0,
      max: 1,
      default: 0.5
    });
    
    this.validationRules.set('notifications.frequency', {
      type: 'string',
      allowedValues: ['minimal', 'normal', 'frequent'],
      default: 'normal'
    });
    
    this.validationRules.set('content.contentRating', {
      type: 'string',
      allowedValues: ['all', 'teen', 'mature'],
      default: 'all'
    });
  }
  
  setupEventListeners() {
    // Eventos de preferencias
    document.addEventListener('preferences:update', this.handlePreferenceUpdate.bind(this));
    document.addEventListener('preferences:reset', this.handlePreferenceReset.bind(this));
    document.addEventListener('preferences:import', this.handlePreferenceImport.bind(this));
    document.addEventListener('preferences:export', this.handlePreferenceExport.bind(this));
    
    // Eventos del sistema
    document.addEventListener('theme:changed', this.handleThemeChange.bind(this));
    document.addEventListener('customization:saved', this.handleCustomizationSaved.bind(this));
    document.addEventListener('brand:preferences-changed', this.handleBrandPreferencesChanged.bind(this));
    
    // Eventos de ventana
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Eventos de accesibilidad del sistema
    if (window.matchMedia) {
      this.setupSystemPreferenceListeners();
    }
  }
  
  setupSystemPreferenceListeners() {
    // Escuchar cambios en preferencias del sistema
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    darkModeQuery.addEventListener('change', (e) => {
      if (this.preferences.customization.autoThemeSwitch) {
        this.updatePreference('interface.theme', e.matches ? 'dark-epic' : 'light-elegant');
      }
    });
    
    reducedMotionQuery.addEventListener('change', (e) => {
      this.updatePreference('interface.reducedMotion', e.matches);
      this.updatePreference('interface.animations', !e.matches);
    });
    
    highContrastQuery.addEventListener('change', (e) => {
      this.updatePreference('interface.highContrast', e.matches);
    });
  }
  
  setupAutoSave() {
    // Configurar auto-guardado con debounce
    this.autoSaveDebounced = this.debounce(() => {
      this.savePreferences();
    }, this.options.autoSaveDelay);
  }
  
  setupCloudSync() {
    if (!this.options.enableCloudSync) return;
    
    // Configurar sincronización en la nube
    this.cloudSync = {
      enabled: true,
      lastSync: null,
      syncInterval: 300000, // 5 minutos
      conflictResolution: 'merge' // 'merge', 'local', 'remote'
    };
    
    // Iniciar sincronización periódica
    setInterval(() => {
      this.syncWithCloud();
    }, this.cloudSync.syncInterval);
  }
  
  // Métodos principales de gestión de preferencias
  updatePreference(path, value, options = {}) {
    const pathArray = path.split('.');
    const oldValue = this.getPreference(path);
    
    // Validar nuevo valor
    if (!this.validatePreferenceValue(path, value)) {
      console.warn(`⚠️ Valor inválido para ${path}:`, value);
      return false;
    }
    
    // Actualizar valor
    this.setNestedValue(this.preferences, pathArray, value);
    
    // Aplicar cambio inmediatamente
    this.applyPreferenceChange(path, value, oldValue);
    
    // Guardar automáticamente
    if (options.autoSave !== false) {
      this.scheduleAutoSave();
    }
    
    // Emitir evento
    this.emit('preference:changed', {
      path,
      value,
      oldValue,
      timestamp: Date.now()
    });
    
    console.log(`⚙️ Preferencia actualizada: ${path} = ${value}`);
    return true;
  }
  
  getPreference(path, defaultValue = null) {
    const pathArray = path.split('.');
    return this.getNestedValue(this.preferences, pathArray, defaultValue);
  }
  
  updateMultiplePreferences(updates, options = {}) {
    const changes = [];
    
    Object.entries(updates).forEach(([path, value]) => {
      const oldValue = this.getPreference(path);
      if (this.updatePreference(path, value, { autoSave: false })) {
        changes.push({ path, value, oldValue });
      }
    });
    
    // Guardar una sola vez al final
    if (options.autoSave !== false && changes.length > 0) {
      this.scheduleAutoSave();
    }
    
    // Emitir evento de cambios múltiples
    if (changes.length > 0) {
      this.emit('preferences:bulk-changed', { changes });
    }
    
    return changes;
  }
  
  resetPreferences(section = null) {
    if (section) {
      // Resetear sección específica
      if (this.defaultPreferences[section]) {
        this.preferences[section] = JSON.parse(JSON.stringify(this.defaultPreferences[section]));
        this.applyPreferencesSection(section);
        this.emit('preferences:section-reset', { section });
      }
    } else {
      // Resetear todas las preferencias
      this.preferences = JSON.parse(JSON.stringify(this.defaultPreferences));
      this.applyAllPreferences();
      this.emit('preferences:reset');
    }
    
    this.scheduleAutoSave();
    console.log(`🔄 Preferencias ${section || 'todas'} reseteadas`);
  }
  
  applyPreferenceChange(path, value, oldValue) {
    const [section, property] = path.split('.');
    
    switch (section) {
      case 'interface':
        this.applyInterfacePreference(property, value);
        break;
      case 'customization':
        this.applyCustomizationPreference(property, value);
        break;
      case 'branding':
        this.applyBrandingPreference(property, value);
        break;
      case 'content':
        this.applyContentPreference(property, value);
        break;
      case 'notifications':
        this.applyNotificationPreference(property, value);
        break;
      case 'privacy':
        this.applyPrivacyPreference(property, value);
        break;
      case 'accessibility':
        this.applyAccessibilityPreference(property, value);
        break;
    }
  }
  
  applyInterfacePreference(property, value) {
    switch (property) {
      case 'theme':
        this.emit('theme:change', { themeId: value });
        break;
      case 'language':
        this.updateLanguage(value);
        break;
      case 'fontSize':
        this.updateFontSize(value);
        break;
      case 'animations':
        document.body.classList.toggle('animations-disabled', !value);
        break;
      case 'soundEffects':
        this.toggleSoundEffects(value);
        break;
      case 'reducedMotion':
        document.body.classList.toggle('theme-reduced-motion', value);
        break;
      case 'highContrast':
        document.body.classList.toggle('theme-high-contrast', value);
        break;
    }
  }
  
  applyCustomizationPreference(property, value) {
    switch (property) {
      case 'allowCustomThemes':
        this.emit('customization:toggle-custom-themes', { enabled: value });
        break;
      case 'enableSeasonalThemes':
        this.emit('theme:toggle-seasonal', { enabled: value });
        break;
      case 'autoThemeSwitch':
        this.emit('theme:toggle-auto-switch', { enabled: value });
        break;
      case 'culturalVariant':
        this.emit('theme:set-cultural-variant', { variant: value });
        break;
    }
  }
  
  applyBrandingPreference(property, value) {
    switch (property) {
      case 'allowBranding':
        this.emit('brand:toggle-branding', { enabled: value });
        break;
      case 'brandIntensity':
        this.emit('brand:update-intensity', { intensity: value });
        break;
      case 'allowRotation':
        this.emit('brand:toggle-rotation', { enabled: value });
        break;
      case 'preferredBrands':
      case 'blockedBrands':
        this.emit('brand:update-preferences', { 
          preferred: this.preferences.branding.preferredBrands,
          blocked: this.preferences.branding.blockedBrands
        });
        break;
    }
  }
  
  applyContentPreference(property, value) {
    switch (property) {
      case 'autoPlay':
        this.emit('content:toggle-autoplay', { enabled: value });
        break;
      case 'showSpoilers':
        this.emit('content:toggle-spoilers', { enabled: value });
        break;
      case 'contentRating':
        this.emit('content:update-rating', { rating: value });
        break;
    }
  }
  
  applyNotificationPreference(property, value) {
    this.emit('notifications:update-preferences', {
      property,
      value,
      allPreferences: this.preferences.notifications
    });
  }
  
  applyPrivacyPreference(property, value) {
    switch (property) {
      case 'analytics':
        this.emit('analytics:toggle', { enabled: value });
        break;
      case 'personalizedContent':
        this.emit('personalization:toggle', { enabled: value });
        break;
      case 'dataSharing':
        this.emit('data-sharing:toggle', { enabled: value });
        break;
    }
  }
  
  applyAccessibilityPreference(property, value) {
    switch (property) {
      case 'screenReader':
        this.updateScreenReaderSupport(value);
        break;
      case 'keyboardNavigation':
        this.updateKeyboardNavigation(value);
        break;
      case 'focusIndicators':
        document.body.classList.toggle('enhanced-focus', value);
        break;
      case 'largeText':
        document.body.classList.toggle('large-text', value);
        break;
      case 'colorBlindSupport':
        document.body.classList.toggle('colorblind-friendly', value);
        break;
    }
  }
  
  // Métodos de aplicación específicos
  updateLanguage(language) {
    document.documentElement.lang = language;
    this.emit('language:changed', { language });
  }
  
  updateFontSize(size) {
    const sizeMap = {
      'small': '0.875rem',
      'medium': '1rem',
      'large': '1.125rem',
      'extra-large': '1.25rem'
    };
    
    document.documentElement.style.setProperty('--base-font-size', sizeMap[size]);
    document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    document.body.classList.add(`font-${size}`);
  }
  
  toggleSoundEffects(enabled) {
    if (enabled) {
      this.loadSoundEffects();
    } else {
      this.unloadSoundEffects();
    }
  }
  
  updateScreenReaderSupport(enabled) {
    document.body.classList.toggle('screen-reader-enabled', enabled);
    
    if (enabled) {
      this.enhanceScreenReaderSupport();
    }
  }
  
  updateKeyboardNavigation(enabled) {
    document.body.classList.toggle('keyboard-navigation', enabled);
    
    if (enabled) {
      this.enhanceKeyboardNavigation();
    }
  }
  
  enhanceScreenReaderSupport() {
    // Agregar descripciones ARIA mejoradas
    const elements = document.querySelectorAll('button, a, input, select');
    elements.forEach(element => {
      if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
        const label = this.generateAriaLabel(element);
        if (label) {
          element.setAttribute('aria-label', label);
        }
      }
    });
  }
  
  enhanceKeyboardNavigation() {
    // Mejorar indicadores de foco y navegación por teclado
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
    focusableElements.forEach(element => {
      element.classList.add('keyboard-focusable');
    });
  }
  
  generateAriaLabel(element) {
    // Generar etiquetas ARIA automáticamente
    const text = element.textContent?.trim();
    const className = element.className;
    
    if (text) return text;
    if (className.includes('close')) return 'Cerrar';
    if (className.includes('menu')) return 'Menú';
    if (className.includes('search')) return 'Buscar';
    
    return null;
  }
  
  loadSoundEffects() {
    // Cargar efectos de sonido
    console.log('🔊 Efectos de sonido habilitados');
  }
  
  unloadSoundEffects() {
    // Descargar efectos de sonido
    console.log('🔇 Efectos de sonido deshabilitados');
  }
  
  // Métodos de validación
  validatePreferenceValue(path, value) {
    const rule = this.validationRules.get(path);
    if (!rule) return true; // No hay regla, aceptar valor
    
    // Validar tipo
    if (rule.type === 'string' && typeof value !== 'string') return false;
    if (rule.type === 'number' && typeof value !== 'number') return false;
    if (rule.type === 'boolean' && typeof value !== 'boolean') return false;
    if (rule.type === 'array' && !Array.isArray(value)) return false;
    
    // Validar valores permitidos
    if (rule.allowedValues && !rule.allowedValues.includes(value)) return false;
    
    // Validar rango numérico
    if (rule.type === 'number') {
      if (rule.min !== undefined && value < rule.min) return false;
      if (rule.max !== undefined && value > rule.max) return false;
    }
    
    return true;
  }
  
  validatePreferences() {
    let hasErrors = false;
    
    // Validar todas las preferencias
    this.validationRules.forEach((rule, path) => {
      const currentValue = this.getPreference(path);
      if (!this.validatePreferenceValue(path, currentValue)) {
        console.warn(`⚠️ Preferencia inválida detectada: ${path}`, currentValue);
        this.updatePreference(path, rule.default, { autoSave: false });
        hasErrors = true;
      }
    });
    
    if (hasErrors) {
      console.log('🔧 Preferencias inválidas corregidas');
      this.scheduleAutoSave();
    }
  }
  
  // Métodos de utilidad
  getNestedValue(obj, pathArray, defaultValue = null) {
    let current = obj;
    for (const key of pathArray) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    return current;
  }
  
  setNestedValue(obj, pathArray, value) {
    let current = obj;
    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    current[pathArray[pathArray.length - 1]] = value;
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  scheduleAutoSave() {
    if (this.autoSaveDebounced) {
      this.autoSaveDebounced();
    }
  }
  
  // Métodos de backup
  createBackup() {
    const backup = {
      preferences: JSON.parse(JSON.stringify(this.preferences)),
      timestamp: Date.now(),
      version: '1.0'
    };
    
    this.backupHistory.unshift(backup);
    
    // Limitar historial de backups
    if (this.backupHistory.length > this.options.maxBackupHistory) {
      this.backupHistory = this.backupHistory.slice(0, this.options.maxBackupHistory);
    }
    
    console.log('💾 Backup de preferencias creado');
    return backup;
  }
  
  restoreFromBackup(backupIndex = 0) {
    if (backupIndex >= this.backupHistory.length) {
      console.warn('⚠️ Backup no encontrado');
      return false;
    }
    
    const backup = this.backupHistory[backupIndex];
    this.preferences = JSON.parse(JSON.stringify(backup.preferences));
    
    this.applyAllPreferences();
    this.scheduleAutoSave();
    
    this.emit('preferences:restored', { backup });
    console.log(`🔄 Preferencias restauradas desde backup ${backupIndex}`);
    return true;
  }
  
  applyAllPreferences() {
    // Aplicar todas las preferencias de todas las secciones
    Object.keys(this.preferences).forEach(section => {
      this.applyPreferencesSection(section);
    });
  }
  
  applyPreferencesSection(section) {
    const sectionPrefs = this.preferences[section];
    if (sectionPrefs) {
      Object.entries(sectionPrefs).forEach(([property, value]) => {
        if (typeof value !== 'object') {
          this.applyPreferenceChange(`${section}.${property}`, value);
        }
      });
    }
  }
  
  // Sincronización en la nube
  async syncWithCloud() {
    if (!this.options.enableCloudSync || this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      // Simular sincronización con API
      const remotePreferences = await this.fetchRemotePreferences();
      
      if (remotePreferences) {
        const conflicts = this.detectConflicts(remotePreferences);
        if (conflicts.length > 0) {
          await this.resolveConflicts(conflicts, remotePreferences);
        } else {
          await this.uploadLocalPreferences();
        }
      } else {
        await this.uploadLocalPreferences();
      }
      
      this.cloudSync.lastSync = Date.now();
      console.log('☁️ Sincronización completada');
      
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    } finally {
      this.syncInProgress = false;
    }
  }
  
  async fetchRemotePreferences() {
    // Simular fetch de preferencias remotas
    return null; // En implementación real, haría llamada a API
  }
  
  async uploadLocalPreferences() {
    // Simular upload de preferencias locales
    console.log('⬆️ Preferencias locales subidas a la nube');
  }
  
  detectConflicts(remotePreferences) {
    const conflicts = [];
    // Lógica para detectar conflictos entre local y remoto
    return conflicts;
  }
  
  async resolveConflicts(conflicts, remotePreferences) {
    // Resolver conflictos según estrategia configurada
    switch (this.cloudSync.conflictResolution) {
      case 'merge':
        this.mergePreferences(remotePreferences);
        break;
      case 'local':
        await this.uploadLocalPreferences();
        break;
      case 'remote':
        this.preferences = remotePreferences;
        this.applyAllPreferences();
        break;
    }
  }
  
  mergePreferences(remotePreferences) {
    // Implementar lógica de merge inteligente
    console.log('🔀 Mezclando preferencias locales y remotas');
  }
  
  // Manejadores de eventos
  handlePreferenceUpdate(event) {
    const { path, value, options } = event.detail;
    this.updatePreference(path, value, options);
  }
  
  handlePreferenceReset(event) {
    const { section } = event.detail;
    this.resetPreferences(section);
  }
  
  handlePreferenceImport(event) {
    const { data } = event.detail;
    this.importPreferences(data);
  }
  
  handlePreferenceExport() {
    const exported = this.exportPreferences();
    this.emit('preferences:exported', { data: exported });
  }
  
  handleThemeChange(event) {
    const { themeId } = event.detail;
    // No actualizar si el cambio viene de las preferencias
    if (this.preferences.interface.theme !== themeId) {
      this.updatePreference('interface.theme', themeId);
    }
  }
  
  handleCustomizationSaved(event) {
    // Sincronizar con cambios de personalización
    this.emit('preferences:customization-synced');
  }
  
  handleBrandPreferencesChanged(event) {
    const { preferred, blocked } = event.detail;
    this.updateMultiplePreferences({
      'branding.preferredBrands': preferred,
      'branding.blockedBrands': blocked
    });
  }
  
  handleBeforeUnload() {
    // Guardar preferencias antes de cerrar
    this.savePreferences();
  }
  
  handleOnline() {
    // Sincronizar cuando vuelva la conexión
    if (this.options.enableCloudSync) {
      setTimeout(() => this.syncWithCloud(), 1000);
    }
  }
  
  handleOffline() {
    // Manejar modo offline
    console.log('📱 Modo offline activado');
  }
  
  // Métodos de importación/exportación
  exportPreferences() {
    const exportData = {
      preferences: this.preferences,
      backupHistory: this.backupHistory,
      exportDate: Date.now(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  importPreferences(data) {
    try {
      const importedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (this.validateImportedData(importedData)) {
        // Crear backup antes de importar
        this.createBackup();
        
        // Aplicar preferencias importadas
        this.preferences = importedData.preferences;
        
        // Aplicar cambios
        this.applyAllPreferences();
        this.scheduleAutoSave();
        
        this.emit('preferences:imported', { data: importedData });
        console.log('📥 Preferencias importadas correctamente');
        return true;
      } else {
        throw new Error('Datos de importación inválidos');
      }
    } catch (error) {
      console.error('❌ Error importando preferencias:', error);
      return false;
    }
  }
  
  validateImportedData(data) {
    return data && data.preferences && typeof data.preferences === 'object';
  }
  
  // Persistencia
  savePreferences() {
    try {
      const dataToSave = {
        preferences: this.preferences,
        lastSaved: Date.now()
      };
      
      // Simular guardado en localStorage
      console.log('💾 Preferencias guardadas');
      
      this.emit('preferences:saved', { data: dataToSave });
      return true;
    } catch (error) {
      console.error('❌ Error guardando preferencias:', error);
      return false;
    }
  }
  
  loadUserPreferences() {
    try {
      // Simular carga desde localStorage
      const savedData = this.getStoredPreferences();
      
      if (savedData && savedData.preferences) {
        this.preferences = { ...this.preferences, ...savedData.preferences };
        this.applyAllPreferences();
        console.log('📁 Preferencias de usuario cargadas');
      }
    } catch (error) {
      console.warn('⚠️ Error cargando preferencias:', error);
    }
  }
  
  getStoredPreferences() {
    // Simular carga desde localStorage
    // En implementación real: return JSON.parse(localStorage.getItem('userPreferences'));
    return null;
  }
  
  // API pública
  getAllPreferences() {
    return JSON.parse(JSON.stringify(this.preferences));
  }
  
  getPreferencesSection(section) {
    return JSON.parse(JSON.stringify(this.preferences[section] || {}));
  }
  
  hasCustomizations() {
    return JSON.stringify(this.preferences) !== JSON.stringify(this.defaultPreferences);
  }
  
  getPreferencesSummary() {
    return {
      theme: this.preferences.interface.theme,
      language: this.preferences.interface.language,
      customizations: this.hasCustomizations(),
      lastModified: this.getLastModifiedTime(),
      accessibility: this.getAccessibilityStatus(),
      privacy: this.getPrivacyStatus()
    };
  }
  
  getLastModifiedTime() {
    // En implementación real, trackearía timestamps de modificación
    return Date.now();
  }
  
  getAccessibilityStatus() {
    const { accessibility } = this.preferences;
    const enabledFeatures = Object.entries(accessibility).filter(([_, enabled]) => enabled);
    return {
      featuresEnabled: enabledFeatures.length,
      features: enabledFeatures.map(([feature]) => feature)
    };
  }
  
  getPrivacyStatus() {
    const { privacy } = this.preferences;
    return {
      analytics: privacy.analytics,
      dataSharing: privacy.dataSharing,
      trackingConsent: privacy.trackingConsent
    };
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // Métodos de limpieza
  destroy() {
    // Guardar estado final
    this.savePreferences();
    
    // Limpiar timers
    if (this.autoSaveDebounced) {
      this.autoSaveDebounced.cancel?.();
    }
    
    // Limpiar referencias
    this.backupHistory = [];
    this.validationRules.clear();
    
    console.log('🧹 User Preferences destruido');
  }
}

// Exportar para uso global
window.UserPreferences = UserPreferences;

export default UserPreferences;