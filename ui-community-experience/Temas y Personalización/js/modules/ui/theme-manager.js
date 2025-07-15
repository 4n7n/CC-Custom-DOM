/* ==================================================
   RAMA 9: Theme Manager Module
   Gestión avanzada de temas y personalización
   ================================================== */

class ThemeManager {
  constructor(options = {}) {
    this.options = {
      enableTransitions: true,
      enableCustomThemes: true,
      enableSystemSync: true,
      enableSeasonalThemes: false,
      autoSavePreferences: true,
      transitionDuration: 800,
      ...options
    };
    
    this.currentTheme = 'dark-epic';
    this.availableThemes = new Map();
    this.customThemes = new Map();
    this.themePreferences = {};
    this.eventListeners = new Map();
    
    this.systemPreference = null;
    this.seasonalTheme = null;
    this.transitionTimeout = null;
    
    this.init();
  }
  
  init() {
    console.log('🎨 Inicializando Theme Manager...');
    
    this.setupDefaultThemes();
    this.setupSystemDetection();
    this.setupEventListeners();
    this.loadUserPreferences();
    this.initializeTheme();
    this.setupSeasonalThemes();
    
    console.log('✅ Theme Manager inicializado');
  }
  
  setupDefaultThemes() {
    // Temas base del sistema
    this.availableThemes.set('dark-epic', {
      id: 'dark-epic',
      name: 'Oscuro Épico',
      description: 'Tema oscuro con efectos dramáticos',
      category: 'default',
      colors: {
        primary: '#4f46e5',
        secondary: '#06b6d4',
        accent: '#10b981',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#ffffff'
      },
      effects: {
        glow: true,
        particles: true,
        animations: 'epic'
      }
    });
    
    this.availableThemes.set('light-elegant', {
      id: 'light-elegant',
      name: 'Claro Elegante',
      description: 'Tema claro y refinado',
      category: 'default',
      colors: {
        primary: '#4f46e5',
        secondary: '#06b6d4',
        accent: '#10b981',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b'
      },
      effects: {
        glow: false,
        particles: false,
        animations: 'subtle'
      }
    });
    
    this.availableThemes.set('cyberpunk-neon', {
      id: 'cyberpunk-neon',
      name: 'Cyberpunk Neón',
      description: 'Tema futurista con efectos neón',
      category: 'themed',
      colors: {
        primary: '#ff0080',
        secondary: '#00ff80',
        accent: '#ff8000',
        background: '#0a0a0a',
        surface: '#1a0a1a',
        text: '#ffffff'
      },
      effects: {
        glow: true,
        particles: true,
        animations: 'cyber',
        neon: true
      }
    });
    
    this.availableThemes.set('nature-organic', {
      id: 'nature-organic',
      name: 'Nature Orgánico',
      description: 'Tema inspirado en la naturaleza',
      category: 'themed',
      colors: {
        primary: '#10b981',
        secondary: '#84cc16',
        accent: '#f59e0b',
        background: '#1a2e1a',
        surface: '#2d5a2d',
        text: '#ecfdf5'
      },
      effects: {
        glow: true,
        particles: false,
        animations: 'organic'
      }
    });
    
    this.availableThemes.set('ocean-deep', {
      id: 'ocean-deep',
      name: 'Oceánico Profundo',
      description: 'Tema acuático con efectos de agua',
      category: 'themed',
      colors: {
        primary: '#0ea5e9',
        secondary: '#06b6d4',
        accent: '#3b82f6',
        background: '#0c1445',
        surface: '#1e3a8a',
        text: '#f0f9ff'
      },
      effects: {
        glow: true,
        particles: true,
        animations: 'wave'
      }
    });
    
    this.availableThemes.set('sunset-warm', {
      id: 'sunset-warm',
      name: 'Sunset Cálido',
      description: 'Tema cálido inspirado en atardeceres',
      category: 'themed',
      colors: {
        primary: '#f97316',
        secondary: '#ef4444',
        accent: '#eab308',
        background: '#451a03',
        surface: '#7c2d12',
        text: '#fff7ed'
      },
      effects: {
        glow: true,
        particles: false,
        animations: 'warm'
      }
    });
    
    this.availableThemes.set('galactic-purple', {
      id: 'galactic-purple',
      name: 'Galáctico Púrpura',
      description: 'Tema cósmico con efectos estelares',
      category: 'themed',
      colors: {
        primary: '#8b5cf6',
        secondary: '#a855f7',
        accent: '#ec4899',
        background: '#1e1b4b',
        surface: '#312e81',
        text: '#faf5ff'
      },
      effects: {
        glow: true,
        particles: true,
        animations: 'cosmic',
        stars: true
      }
    });
    
    console.log(`🎨 ${this.availableThemes.size} temas base cargados`);
  }
  
  setupSystemDetection() {
    if (!this.options.enableSystemSync) return;
    
    // Detectar preferencia del sistema
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      
      this.systemPreference = {
        colorScheme: darkModeQuery.matches ? 'dark' : 'light',
        highContrast: highContrastQuery.matches,
        reducedMotion: reducedMotionQuery.matches
      };
      
      // Escuchar cambios en preferencias del sistema
      darkModeQuery.addEventListener('change', (e) => {
        this.systemPreference.colorScheme = e.matches ? 'dark' : 'light';
        this.handleSystemPreferenceChange();
      });
      
      highContrastQuery.addEventListener('change', (e) => {
        this.systemPreference.highContrast = e.matches;
        this.handleSystemPreferenceChange();
      });
      
      reducedMotionQuery.addEventListener('change', (e) => {
        this.systemPreference.reducedMotion = e.matches;
        this.handleSystemPreferenceChange();
      });
    }
  }
  
  setupEventListeners() {
    // Eventos de temas
    document.addEventListener('theme:change', this.handleThemeChangeEvent.bind(this));
    document.addEventListener('theme:customize', this.handleThemeCustomizeEvent.bind(this));
    document.addEventListener('theme:reset', this.handleThemeResetEvent.bind(this));
    
    // Eventos de teclas
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    
    // Eventos de tiempo (para temas estacionales)
    if (this.options.enableSeasonalThemes) {
      this.setupTimeBasedEvents();
    }
  }
  
  setupTimeBasedEvents() {
    // Verificar hora del día para temas automáticos
    setInterval(() => {
      this.checkTimeBasedThemes();
    }, 60000); // Cada minuto
    
    // Verificar fecha para temas estacionales
    setInterval(() => {
      this.checkSeasonalThemes();
    }, 3600000); // Cada hora
  }
  
  setupSeasonalThemes() {
    if (!this.options.enableSeasonalThemes) return;
    
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    
    // Temas estacionales
    if ((month === 11 && day >= 15) || (month === 0 && day <= 7)) {
      // Navidad/Año Nuevo
      this.seasonalTheme = 'winter-holiday';
    } else if (month === 9 && day >= 15 && day <= 31) {
      // Halloween
      this.seasonalTheme = 'halloween-spooky';
    } else if (month === 2 && day >= 14 && day <= 20) {
      // San Valentín
      this.seasonalTheme = 'valentine-love';
    } else if (month >= 5 && month <= 7) {
      // Verano
      this.seasonalTheme = 'summer-bright';
    } else if (month >= 8 && month <= 10) {
      // Otoño
      this.seasonalTheme = 'autumn-cozy';
    }
    
    if (this.seasonalTheme) {
      this.createSeasonalTheme(this.seasonalTheme);
    }
  }
  
  // Métodos principales de gestión de temas
  setTheme(themeId, options = {}) {
    const theme = this.availableThemes.get(themeId) || this.customThemes.get(themeId);
    
    if (!theme) {
      console.warn(`⚠️ Tema no encontrado: ${themeId}`);
      return false;
    }
    
    const previousTheme = this.currentTheme;
    
    // Aplicar transición si está habilitada
    if (this.options.enableTransitions && !options.immediate) {
      this.applyThemeTransition(theme, previousTheme);
    } else {
      this.applyThemeImmediate(theme);
    }
    
    this.currentTheme = themeId;
    
    // Guardar preferencias
    if (this.options.autoSavePreferences) {
      this.saveUserPreferences();
    }
    
    // Emitir evento
    this.emit('theme:changed', {
      newTheme: themeId,
      previousTheme,
      theme
    });
    
    console.log(`🎨 Tema cambiado a: ${theme.name}`);
    return true;
  }
  
  applyThemeTransition(theme, previousTheme) {
    const body = document.body;
    
    // Agregar clase de transición
    body.classList.add('theme-transitioning');
    
    // Aplicar nuevo tema
    setTimeout(() => {
      this.applyThemeImmediate(theme);
    }, 50);
    
    // Remover clase de transición
    this.transitionTimeout = setTimeout(() => {
      body.classList.remove('theme-transitioning');
      this.emit('theme:transition-complete', { theme: theme.id });
    }, this.options.transitionDuration);
  }
  
  applyThemeImmediate(theme) {
    const body = document.body;
    const root = document.documentElement;
    
    // Remover clases de tema anteriores
    body.classList.remove(...Array.from(body.classList).filter(cls => cls.startsWith('theme-')));
    
    // Agregar nueva clase de tema
    body.classList.add(`theme-${theme.id}`);
    
    // Aplicar variables CSS
    this.applyThemeVariables(theme);
    
    // Aplicar efectos especiales
    this.applyThemeEffects(theme);
    
    // Aplicar preferencias del sistema si están habilitadas
    this.applySystemPreferences();
  }
  
  applyThemeVariables(theme) {
    const root = document.documentElement;
    const { colors, effects } = theme;
    
    // Aplicar colores
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
    
    // Aplicar configuraciones de efectos
    if (effects) {
      Object.entries(effects).forEach(([key, value]) => {
        root.style.setProperty(`--theme-effect-${key}`, value);
      });
    }
  }
  
  applyThemeEffects(theme) {
    const body = document.body;
    const { effects } = theme;
    
    if (!effects) return;
    
    // Efectos de partículas
    if (effects.particles) {
      this.enableParticleEffects(theme);
    } else {
      this.disableParticleEffects();
    }
    
    // Efectos de brillo
    if (effects.glow) {
      body.classList.add('theme-glow-enabled');
    } else {
      body.classList.remove('theme-glow-enabled');
    }
    
    // Efectos neón
    if (effects.neon) {
      body.classList.add('theme-neon-enabled');
    } else {
      body.classList.remove('theme-neon-enabled');
    }
    
    // Efectos de estrellas
    if (effects.stars) {
      this.enableStarfield();
    } else {
      this.disableStarfield();
    }
  }
  
  applySystemPreferences() {
    if (!this.systemPreference) return;
    
    const body = document.body;
    
    // Alto contraste
    if (this.systemPreference.highContrast) {
      body.classList.add('theme-high-contrast');
    } else {
      body.classList.remove('theme-high-contrast');
    }
    
    // Movimiento reducido
    if (this.systemPreference.reducedMotion) {
      body.classList.add('theme-reduced-motion');
    } else {
      body.classList.remove('theme-reduced-motion');
    }
  }
  
  // Efectos especiales
  enableParticleEffects(theme) {
    if (this.particleSystem) return;
    
    this.particleSystem = this.createParticleSystem(theme);
    document.body.appendChild(this.particleSystem);
  }
  
  disableParticleEffects() {
    if (this.particleSystem) {
      this.particleSystem.remove();
      this.particleSystem = null;
    }
  }
  
  createParticleSystem(theme) {
    const container = document.createElement('div');
    container.className = 'theme-particles';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    `;
    
    // Crear partículas basadas en el tema
    const particleCount = theme.id === 'cyberpunk-neon' ? 50 : 30;
    const particleColor = theme.colors.primary;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'theme-particle';
      particle.style.cssText = `
        position: absolute;
        width: 2px;
        height: 2px;
        background: ${particleColor};
        border-radius: 50%;
        opacity: 0.6;
        animation: particle-float ${5 + Math.random() * 10}s linear infinite;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation-delay: ${Math.random() * 5}s;
      `;
      
      container.appendChild(particle);
    }
    
    // Agregar estilos de animación si no existen
    if (!document.getElementById('particle-styles')) {
      const style = document.createElement('style');
      style.id = 'particle-styles';
      style.textContent = `
        @keyframes particle-float {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    return container;
  }
  
  enableStarfield() {
    if (this.starfield) return;
    
    this.starfield = document.createElement('div');
    this.starfield.className = 'theme-starfield';
    this.starfield.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      background-image: 
        radial-gradient(2px 2px at 20px 30px, #8b5cf6, transparent),
        radial-gradient(2px 2px at 40px 70px, #a855f7, transparent),
        radial-gradient(1px 1px at 90px 40px, #ec4899, transparent);
      background-repeat: repeat;
      background-size: 200px 100px;
      animation: starfield-twinkle 2s ease-in-out infinite alternate;
      opacity: 0.3;
    `;
    
    document.body.appendChild(this.starfield);
    
    // Agregar estilos de animación para estrellas
    if (!document.getElementById('starfield-styles')) {
      const style = document.createElement('style');
      style.id = 'starfield-styles';
      style.textContent = `
        @keyframes starfield-twinkle {
          from { opacity: 0.3; }
          to { opacity: 0.6; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  disableStarfield() {
    if (this.starfield) {
      this.starfield.remove();
      this.starfield = null;
    }
  }
  
  // Gestión de temas personalizados
  createCustomTheme(themeData) {
    const themeId = `custom-${Date.now()}`;
    const customTheme = {
      id: themeId,
      name: themeData.name || 'Tema Personalizado',
      description: themeData.description || 'Tema creado por el usuario',
      category: 'custom',
      colors: {
        primary: themeData.primary || '#4f46e5',
        secondary: themeData.secondary || '#06b6d4',
        accent: themeData.accent || '#10b981',
        background: themeData.background || '#0f172a',
        surface: themeData.surface || '#1e293b',
        text: themeData.text || '#ffffff'
      },
      effects: themeData.effects || {
        glow: false,
        particles: false,
        animations: 'subtle'
      },
      custom: true,
      createdAt: Date.now()
    };
    
    this.customThemes.set(themeId, customTheme);
    this.saveCustomThemes();
    
    this.emit('theme:custom-created', { theme: customTheme });
    console.log(`🎨 Tema personalizado creado: ${customTheme.name}`);
    
    return themeId;
  }
  
  updateCustomTheme(themeId, updates) {
    const theme = this.customThemes.get(themeId);
    if (!theme || !theme.custom) {
      console.warn(`⚠️ No se puede actualizar el tema: ${themeId}`);
      return false;
    }
    
    // Aplicar actualizaciones
    Object.assign(theme, updates);
    theme.modifiedAt = Date.now();
    
    this.saveCustomThemes();
    
    // Reaplicar si es el tema actual
    if (this.currentTheme === themeId) {
      this.applyThemeImmediate(theme);
    }
    
    this.emit('theme:custom-updated', { theme });
    return true;
  }
  
  deleteCustomTheme(themeId) {
    const theme = this.customThemes.get(themeId);
    if (!theme || !theme.custom) {
      console.warn(`⚠️ No se puede eliminar el tema: ${themeId}`);
      return false;
    }
    
    this.customThemes.delete(themeId);
    this.saveCustomThemes();
    
    // Cambiar a tema por defecto si era el tema actual
    if (this.currentTheme === themeId) {
      this.setTheme('dark-epic');
    }
    
    this.emit('theme:custom-deleted', { themeId });
    return true;
  }
  
  // Temas estacionales
  createSeasonalTheme(seasonId) {
    const seasonalThemes = {
      'winter-holiday': {
        name: 'Navidad Mágica',
        colors: {
          primary: '#dc2626',
          secondary: '#059669',
          accent: '#d4af37',
          background: '#1e293b',
          surface: '#374151',
          text: '#f3f4f6'
        },
        effects: {
          particles: true,
          glow: true,
          animations: 'festive'
        }
      },
      'halloween-spooky': {
        name: 'Halloween Tenebroso',
        colors: {
          primary: '#f97316',
          secondary: '#7c2d12',
          accent: '#92400e',
          background: '#1c1917',
          surface: '#292524',
          text: '#fbbf24'
        },
        effects: {
          particles: true,
          glow: true,
          animations: 'spooky'
        }
      },
      'valentine-love': {
        name: 'San Valentín Romántico',
        colors: {
          primary: '#ec4899',
          secondary: '#be185d',
          accent: '#f9a8d4',
          background: '#4c1d95',
          surface: '#6b21a8',
          text: '#fdf2f8'
        },
        effects: {
          particles: true,
          glow: true,
          animations: 'romantic'
        }
      },
      'summer-bright': {
        name: 'Verano Brillante',
        colors: {
          primary: '#eab308',
          secondary: '#f59e0b',
          accent: '#fbbf24',
          background: '#0ea5e9',
          surface: '#0284c7',
          text: '#fffbeb'
        },
        effects: {
          particles: false,
          glow: true,
          animations: 'bright'
        }
      },
      'autumn-cozy': {
        name: 'Otoño Acogedor',
        colors: {
          primary: '#ea580c',
          secondary: '#dc2626',
          accent: '#fbbf24',
          background: '#451a03',
          surface: '#7c2d12',
          text: '#fed7aa'
        },
        effects: {
          particles: true,
          glow: false,
          animations: 'cozy'
        }
      }
    };
    
    const seasonalData = seasonalThemes[seasonId];
    if (seasonalData) {
      const theme = {
        id: seasonId,
        ...seasonalData,
        category: 'seasonal',
        temporary: true
      };
      
      this.availableThemes.set(seasonId, theme);
      this.emit('theme:seasonal-available', { theme });
    }
  }
  
  // Gestión de tiempo
  checkTimeBasedThemes() {
    const hour = new Date().getHours();
    
    // Tema automático basado en hora del día
    if (this.themePreferences.autoSwitch) {
      if (hour >= 6 && hour < 18) {
        // Día: tema claro
        if (this.currentTheme !== 'light-elegant') {
          this.setTheme('light-elegant');
        }
      } else {
        // Noche: tema oscuro
        if (this.currentTheme !== 'dark-epic') {
          this.setTheme('dark-epic');
        }
      }
    }
  }
  
  checkSeasonalThemes() {
    this.setupSeasonalThemes();
  }
  
  // Manejadores de eventos
  handleThemeChangeEvent(event) {
    const { themeId, options } = event.detail;
    this.setTheme(themeId, options);
  }
  
  handleThemeCustomizeEvent(event) {
    const { themeData } = event.detail;
    const themeId = this.createCustomTheme(themeData);
    this.setTheme(themeId);
  }
  
  handleThemeResetEvent() {
    this.resetToDefault();
  }
  
  handleSystemPreferenceChange() {
    if (this.themePreferences.followSystem) {
      const preferredTheme = this.systemPreference.colorScheme === 'dark' ? 'dark-epic' : 'light-elegant';
      this.setTheme(preferredTheme);
    }
    
    // Aplicar preferencias del sistema
    this.applySystemPreferences();
  }
  
  handleKeyboardShortcuts(event) {
    if (event.ctrlKey) {
      switch (event.key) {
        case 't':
          event.preventDefault();
          this.showThemeSelector();
          break;
        case 'T':
          event.preventDefault();
          this.toggleTheme();
          break;
      }
    }
  }
  
  // Métodos de utilidad
  toggleTheme() {
    const currentCategory = this.getCurrentTheme().category;
    
    if (currentCategory === 'default') {
      // Alternar entre temas por defecto
      const newTheme = this.currentTheme === 'dark-epic' ? 'light-elegant' : 'dark-epic';
      this.setTheme(newTheme);
    } else {
      // Volver al tema por defecto
      this.setTheme('dark-epic');
    }
  }
  
  resetToDefault() {
    this.setTheme('dark-epic');
    this.themePreferences = {};
    this.saveUserPreferences();
    this.emit('theme:reset');
  }
  
  getCurrentTheme() {
    return this.availableThemes.get(this.currentTheme) || this.customThemes.get(this.currentTheme);
  }
  
  getAllThemes() {
    const allThemes = new Map();
    
    // Agregar temas por defecto
    this.availableThemes.forEach((theme, id) => {
      allThemes.set(id, theme);
    });
    
    // Agregar temas personalizados
    this.customThemes.forEach((theme, id) => {
      allThemes.set(id, theme);
    });
    
    return allThemes;
  }
  
  getThemesByCategory(category) {
    const themes = [];
    this.getAllThemes().forEach(theme => {
      if (theme.category === category) {
        themes.push(theme);
      }
    });
    return themes;
  }
  
  showThemeSelector() {
    this.emit('theme:selector-show');
  }
  
  // Persistencia de datos
  saveUserPreferences() {
    const preferences = {
      currentTheme: this.currentTheme,
      themePreferences: this.themePreferences,
      savedAt: Date.now()
    };
    
    try {
      // Simular guardado en localStorage
      console.log('💾 Preferencias de tema guardadas:', preferences);
      this.emit('theme:preferences-saved', { preferences });
    } catch (error) {
      console.error('❌ Error guardando preferencias de tema:', error);
    }
  }
  
  loadUserPreferences() {
    try {
      // Simular carga desde localStorage
      const preferences = this.getStoredPreferences();
      
      if (preferences) {
        this.currentTheme = preferences.currentTheme || 'dark-epic';
        this.themePreferences = preferences.themePreferences || {};
        
        console.log('📁 Preferencias de tema cargadas');
      }
    } catch (error) {
      console.warn('⚠️ Error cargando preferencias de tema:', error);
    }
  }
  
  saveCustomThemes() {
    const customThemesData = Array.from(this.customThemes.entries());
    
    try {
      // Simular guardado en localStorage
      console.log('💾 Temas personalizados guardados:', customThemesData.length);
    } catch (error) {
      console.error('❌ Error guardando temas personalizados:', error);
    }
  }
  
  loadCustomThemes() {
    try {
      // Simular carga desde localStorage
      const customThemesData = this.getStoredCustomThemes();
      
      if (customThemesData) {
        customThemesData.forEach(([id, theme]) => {
          this.customThemes.set(id, theme);
        });
        
        console.log(`📁 ${this.customThemes.size} temas personalizados cargados`);
      }
    } catch (error) {
      console.warn('⚠️ Error cargando temas personalizados:', error);
    }
  }
  
  getStoredPreferences() {
    // Simular carga desde localStorage
    // En implementación real: return JSON.parse(localStorage.getItem('themePreferences'));
    return null;
  }
  
  getStoredCustomThemes() {
    // Simular carga desde localStorage
    // En implementación real: return JSON.parse(localStorage.getItem('customThemes'));
    return null;
  }
  
  initializeTheme() {
    // Determinar tema inicial
    let initialTheme = this.currentTheme;
    
    // Preferencia del sistema
    if (this.systemPreference && this.themePreferences.followSystem) {
      initialTheme = this.systemPreference.colorScheme === 'dark' ? 'dark-epic' : 'light-elegant';
    }
    
    // Tema estacional
    if (this.seasonalTheme && this.themePreferences.enableSeasonal) {
      initialTheme = this.seasonalTheme;
    }
    
    // Aplicar tema inicial
    this.setTheme(initialTheme, { immediate: true });
  }
  
  // API pública
  exportTheme(themeId) {
    const theme = this.availableThemes.get(themeId) || this.customThemes.get(themeId);
    if (!theme) return null;
    
    const exportData = {
      ...theme,
      exportedAt: Date.now(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  importTheme(themeData) {
    try {
      const parsedTheme = typeof themeData === 'string' ? JSON.parse(themeData) : themeData;
      
      // Validar estructura del tema
      if (!this.validateThemeStructure(parsedTheme)) {
        throw new Error('Estructura de tema inválida');
      }
      
      // Crear tema importado
      const themeId = this.createCustomTheme(parsedTheme);
      
      this.emit('theme:imported', { themeId, theme: parsedTheme });
      console.log(`📥 Tema importado: ${parsedTheme.name}`);
      
      return themeId;
    } catch (error) {
      console.error('❌ Error importando tema:', error);
      return null;
    }
  }
  
  validateThemeStructure(theme) {
    const requiredFields = ['name', 'colors'];
    const requiredColors = ['primary', 'secondary', 'background', 'text'];
    
    // Verificar campos requeridos
    for (const field of requiredFields) {
      if (!theme[field]) return false;
    }
    
    // Verificar colores requeridos
    for (const color of requiredColors) {
      if (!theme.colors[color]) return false;
    }
    
    return true;
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  // Métodos de limpieza
  destroy() {
    // Limpiar efectos
    this.disableParticleEffects();
    this.disableStarfield();
    
    // Limpiar timers
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }
    
    // Limpiar event listeners
    this.eventListeners.clear();
    
    // Remover estilos dinámicos
    const dynamicStyles = document.querySelectorAll('#particle-styles, #starfield-styles');
    dynamicStyles.forEach(style => style.remove());
    
    // Resetear tema
    document.body.classList.remove(...Array.from(document.body.classList).filter(cls => cls.startsWith('theme-')));
    
    console.log('🧹 Theme Manager destruido');
  }
}

// Exportar para uso global
window.ThemeManager = ThemeManager;

export default ThemeManager;