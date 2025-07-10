/* ==================================================
   RAMA 9: Brand Adaptation Module
   Sistema de adaptación de marca para patrocinadores
   ================================================== */

class BrandAdaptation {
  constructor(options = {}) {
    this.options = {
      enableDynamicBranding: true,
      enableSponsorRotation: true,
      enableBrandAnalytics: true,
      enableSubtleBranding: true,
      rotationInterval: 300000, // 5 minutos
      maxBrandIntensity: 0.8,
      respectUserPreferences: true,
      ...options
    };
    
    this.activeBrands = new Map();
    this.brandQueue = [];
    this.currentBrand = null;
    this.brandHistory = [];
    this.brandMetrics = new Map();
    
    this.rotationTimer = null;
    this.brandIntensity = 0.5;
    this.brandTrackingStartTime = null;
    this.userPreferences = {
      allowBranding: true,
      preferredBrands: [],
      blockedBrands: [],
      maxIntensity: 0.8
    };
    
    this.init();
  }
  
  init() {
    console.log('🏢 Inicializando Brand Adaptation...');
    
    this.setupBrandRegistry();
    this.setupEventListeners();
    this.loadUserPreferences();
    this.loadBrandConfigurations();
    this.setupAnalytics();
    
    if (this.options.enableSponsorRotation) {
      this.startBrandRotation();
    }
    
    console.log('✅ Brand Adaptation inicializado');
  }
  
  setupBrandRegistry() {
    // Registro de marcas disponibles con configuraciones predefinidas
    this.brandRegistry = new Map();
    
    // Tech Innovators
    this.brandRegistry.set('tech-innovators', {
      id: 'tech-innovators',
      name: 'Tech Innovators Corp',
      category: 'technology',
      priority: 'high',
      colors: {
        primary: '#0066cc',
        secondary: '#33aaff',
        accent: '#0052a3'
      },
      typography: {
        primary: 'Inter, sans-serif',
        weight: 'medium'
      },
      styling: {
        borderRadius: '0.375rem',
        shadowIntensity: 'medium',
        animationStyle: 'smooth'
      },
      integration: {
        headerBranding: true,
        subtleWatermark: true,
        contentHighlights: true,
        navigationAccents: false
      },
      restrictions: {
        maxDuration: 600000, // 10 minutos
        cooldownPeriod: 1800000, // 30 minutos
        conflictingBrands: ['cosmic-games']
      }
    });
    
    // Cosmic Games
    this.brandRegistry.set('cosmic-games', {
      id: 'cosmic-games',
      name: 'Cosmic Games Studio',
      category: 'gaming',
      priority: 'medium',
      colors: {
        primary: '#8b5cf6',
        secondary: '#ec4899',
        accent: '#06b6d4'
      },
      typography: {
        primary: 'Orbitron, monospace',
        weight: 'bold'
      },
      styling: {
        borderRadius: '0.5rem',
        shadowIntensity: 'high',
        animationStyle: 'dynamic',
        effects: ['glow', 'particles']
      },
      integration: {
        headerBranding: false,
        subtleWatermark: true,
        contentHighlights: true,
        navigationAccents: true,
        customEffects: true
      },
      restrictions: {
        maxDuration: 480000, // 8 minutos
        cooldownPeriod: 1200000, // 20 minutos
        conflictingBrands: ['tech-innovators'],
        timeRestrictions: {
          startHour: 14,
          endHour: 23
        }
      }
    });
    
    // Green Earth Solutions
    this.brandRegistry.set('green-earth', {
      id: 'green-earth',
      name: 'Green Earth Solutions',
      category: 'environmental',
      priority: 'medium',
      colors: {
        primary: '#059669',
        secondary: '#10b981',
        accent: '#34d399'
      },
      typography: {
        primary: 'Poppins, sans-serif',
        weight: 'normal'
      },
      styling: {
        borderRadius: '1rem',
        shadowIntensity: 'low',
        animationStyle: 'organic',
        effects: ['shimmer']
      },
      integration: {
        headerBranding: true,
        subtleWatermark: true,
        contentHighlights: false,
        navigationAccents: true
      },
      restrictions: {
        maxDuration: 720000, // 12 minutos
        cooldownPeriod: 900000, // 15 minutos
        conflictingBrands: []
      }
    });
    
    // Luxury Lifestyle
    this.brandRegistry.set('luxury-lifestyle', {
      id: 'luxury-lifestyle',
      name: 'Luxury Lifestyle Brands',
      category: 'luxury',
      priority: 'high',
      colors: {
        primary: '#d4af37',
        secondary: '#ffd700',
        accent: '#b8860b'
      },
      typography: {
        primary: 'Playfair Display, serif',
        weight: 'semibold'
      },
      styling: {
        borderRadius: '0.75rem',
        shadowIntensity: 'high',
        animationStyle: 'elegant',
        effects: ['golden-glow']
      },
      integration: {
        headerBranding: true,
        subtleWatermark: true,
        contentHighlights: true,
        navigationAccents: true,
        premiumEffects: true
      },
      restrictions: {
        maxDuration: 900000, // 15 minutos
        cooldownPeriod: 600000, // 10 minutos
        conflictingBrands: ['retro-gaming'],
        userTierRequired: 'premium'
      }
    });
    
    // Retro Gaming Arcade
    this.brandRegistry.set('retro-gaming', {
      id: 'retro-gaming',
      name: 'Retro Gaming Arcade',
      category: 'gaming',
      priority: 'low',
      colors: {
        primary: '#ff6b35',
        secondary: '#f7931e',
        accent: '#ffca28'
      },
      typography: {
        primary: 'Press Start 2P, monospace',
        weight: 'normal'
      },
      styling: {
        borderRadius: '0',
        shadowIntensity: 'high',
        animationStyle: 'pixelated',
        effects: ['pixel-blink']
      },
      integration: {
        headerBranding: false,
        subtleWatermark: true,
        contentHighlights: true,
        navigationAccents: false,
        retroEffects: true
      },
      restrictions: {
        maxDuration: 360000, // 6 minutos
        cooldownPeriod: 1800000, // 30 minutos
        conflictingBrands: ['luxury-lifestyle']
      }
    });
  }
  
  setupEventListeners() {
    // Eventos de marcas
    document.addEventListener('brand:activate', this.handleBrandActivation.bind(this));
    document.addEventListener('brand:deactivate', this.handleBrandDeactivation.bind(this));
    document.addEventListener('brand:rotate', this.handleBrandRotation.bind(this));
    document.addEventListener('brand:update-intensity', this.handleIntensityUpdate.bind(this));
    
    // Eventos de usuario
    document.addEventListener('user:interaction', this.trackUserInteraction.bind(this));
    document.addEventListener('user:preferences-updated', this.handlePreferencesUpdate.bind(this));
    
    // Eventos de tiempo
    document.addEventListener('time:hour-changed', this.handleTimeChange.bind(this));
    
    // Eventos de contenido
    document.addEventListener('content:viewed', this.handleContentView.bind(this));
    document.addEventListener('sponsor:clicked', this.handleSponsorClick.bind(this));
  }
  
  setupAnalytics() {
    if (!this.options.enableBrandAnalytics) return;
    
    this.analytics = {
      impressions: new Map(),
      interactions: new Map(),
      conversions: new Map(),
      timeSpent: new Map(),
      userEngagement: new Map()
    };
    
    // Inicializar métricas para cada marca
    this.brandRegistry.forEach((brand, id) => {
      this.initializeBrandMetrics(id);
    });
  }
  
  initializeBrandMetrics(brandId) {
    this.analytics.impressions.set(brandId, 0);
    this.analytics.interactions.set(brandId, 0);
    this.analytics.conversions.set(brandId, 0);
    this.analytics.timeSpent.set(brandId, 0);
    this.analytics.userEngagement.set(brandId, 0);
  }
  
  // Métodos principales de adaptación de marca
  activateBrand(brandId, options = {}) {
    const brand = this.brandRegistry.get(brandId);
    if (!brand) {
      console.warn(`⚠️ Marca no encontrada: ${brandId}`);
      return false;
    }
    
    // Verificar restricciones
    if (!this.canActivateBrand(brand)) {
      console.log(`🚫 No se puede activar la marca ${brandId} debido a restricciones`);
      return false;
    }
    
    // Verificar preferencias del usuario
    if (!this.respectsUserPreferences(brand)) {
      console.log(`👤 Marca ${brandId} bloqueada por preferencias del usuario`);
      return false;
    }
    
    // Desactivar marca actual si existe
    if (this.currentBrand) {
      this.deactivateBrand(this.currentBrand, { switching: true });
    }
    
    // Activar nueva marca
    this.currentBrand = brandId;
    this.activeBrands.set(brandId, {
      activatedAt: Date.now(),
      duration: 0,
      intensity: options.intensity || this.brandIntensity,
      interactions: 0,
      contentViews: 0
    });
    
    // Aplicar branding
    this.applyBrandStyling(brand, options);
    
    // Iniciar tracking
    this.startBrandTracking(brandId);
    
    // Registrar en historial
    this.brandHistory.push({
      brandId,
      activatedAt: Date.now(),
      source: options.source || 'system'
    });
    
    // Emitir evento
    this.emit('brand:activated', { brandId, brand, options });
    
    console.log(`🏢 Marca activada: ${brand.name}`);
    return true;
  }
  
  deactivateBrand(brandId, options = {}) {
    const activeBrand = this.activeBrands.get(brandId);
    if (!activeBrand) return false;
    
    const brand = this.brandRegistry.get(brandId);
    
    // Calcular duración total
    activeBrand.duration = Date.now() - activeBrand.activatedAt;
    
    // Remover branding
    this.removeBrandStyling(brand);
    
    // Detener tracking
    this.stopBrandTracking(brandId);
    
    // Actualizar métricas
    this.updateBrandMetrics(brandId, activeBrand);
    
    // Remover de activos
    this.activeBrands.delete(brandId);
    
    if (this.currentBrand === brandId) {
      this.currentBrand = null;
    }
    
    // Emitir evento
    this.emit('brand:deactivated', { brandId, brand, duration: activeBrand.duration });
    
    console.log(`🏢 Marca desactivada: ${brand.name} (${activeBrand.duration}ms)`);
    return true;
  }
  
  applyBrandStyling(brand, options = {}) {
    const intensity = options.intensity || this.brandIntensity;
    const body = document.body;
    
    // Aplicar clase de tema de marca
    body.classList.add(`sponsor-theme-${brand.id}`);
    
    // Aplicar colores con intensidad
    this.applyBrandColors(brand, intensity);
    
    // Aplicar tipografía
    this.applyBrandTypography(brand, intensity);
    
    // Aplicar efectos visuales
    this.applyBrandEffects(brand, intensity);
    
    // Aplicar integraciones específicas
    this.applyBrandIntegrations(brand, options);
    
    // Crear elementos de marca si es necesario
    this.createBrandElements(brand, options);
  }
  
  applyBrandColors(brand, intensity) {
    const root = document.documentElement;
    const { colors } = brand;
    
    // Interpolar colores con los del tema actual
    Object.entries(colors).forEach(([key, brandColor]) => {
      const currentColor = this.getCurrentThemeColor(key);
      const blendedColor = this.blendColors(currentColor, brandColor, intensity);
      
      root.style.setProperty(`--sponsor-${key}`, blendedColor);
      
      // Aplicar a propiedades del tema si la intensidad es alta
      if (intensity > 0.6) {
        root.style.setProperty(`--theme-${key}`, blendedColor);
      }
    });
  }
  
  applyBrandTypography(brand, intensity) {
    if (!brand.typography || intensity < 0.3) return;
    
    const root = document.documentElement;
    
    // Aplicar fuente principal
    if (brand.typography.primary && intensity > 0.5) {
      root.style.setProperty('--sponsor-font-primary', brand.typography.primary);
    }
    
    // Aplicar peso de fuente
    if (brand.typography.weight) {
      root.style.setProperty('--sponsor-font-weight', brand.typography.weight);
    }
  }
  
  applyBrandEffects(brand, intensity) {
    if (!brand.styling?.effects || intensity < 0.4) return;
    
    const body = document.body;
    
    brand.styling.effects.forEach(effect => {
      body.classList.add(`sponsor-effect-${effect}`);
    });
    
    // Aplicar intensidad de efectos
    const root = document.documentElement;
    root.style.setProperty('--sponsor-effect-intensity', intensity);
  }
  
  applyBrandIntegrations(brand, options) {
    const { integration } = brand;
    
    // Header branding
    if (integration.headerBranding && !options.subtle) {
      this.addHeaderBranding(brand);
    }
    
    // Watermark sutil
    if (integration.subtleWatermark) {
      this.addSubtleWatermark(brand);
    }
    
    // Content highlights
    if (integration.contentHighlights) {
      this.addContentHighlights(brand);
    }
    
    // Navigation accents
    if (integration.navigationAccents) {
      this.addNavigationAccents(brand);
    }
  }
  
  createBrandElements(brand, options) {
    // Crear elementos específicos de la marca
    this.createSponsorWatermark(brand);
    
    if (brand.integration.customEffects) {
      this.createCustomEffects(brand);
    }
    
    if (options.showActivationMessage !== false) {
      this.showBrandActivationMessage(brand);
    }
  }
  
  removeBrandStyling(brand) {
    const body = document.body;
    const root = document.documentElement;
    
    // Remover clase de tema
    body.classList.remove(`sponsor-theme-${brand.id}`);
    
    // Remover propiedades CSS de sponsor
    const sponsorProperties = Array.from(root.style).filter(prop => prop.startsWith('--sponsor-'));
    sponsorProperties.forEach(prop => {
      root.style.removeProperty(prop);
    });
    
    // Remover efectos
    if (brand.styling?.effects) {
      brand.styling.effects.forEach(effect => {
        body.classList.remove(`sponsor-effect-${effect}`);
      });
    }
    
    // Remover elementos de marca
    this.removeBrandElements(brand);
  }
  
  removeBrandElements(brand) {
    // Remover watermark
    const watermark = document.querySelector('.sponsor-watermark');
    if (watermark) watermark.remove();
    
    // Remover elementos personalizados
    const customElements = document.querySelectorAll(`[data-sponsor="${brand.id}"]`);
    customElements.forEach(element => element.remove());
    
    // Remover efectos personalizados
    if (brand.integration.customEffects) {
      this.removeCustomEffects(brand);
    }
  }
  
  // Métodos de creación de elementos
  createSponsorWatermark(brand) {
    // Remover watermark existente
    const existingWatermark = document.querySelector('.sponsor-watermark');
    if (existingWatermark) existingWatermark.remove();
    
    const watermark = document.createElement('div');
    watermark.className = 'sponsor-watermark';
    watermark.setAttribute('data-sponsor', brand.id);
    watermark.innerHTML = `
      <div class="sponsor-watermark-logo">${brand.name.charAt(0)}</div>
      <div class="sponsor-watermark-text">Patrocinado por ${brand.name}</div>
    `;
    
    document.body.appendChild(watermark);
  }
  
  createCustomEffects(brand) {
    if (brand.id === 'cosmic-games') {
      this.createCosmicEffects();
    } else if (brand.id === 'retro-gaming') {
      this.createRetroEffects();
    }
  }
  
  createCosmicEffects() {
    // Crear efectos cósmicos (partículas, estrellas)
    const effectsContainer = document.createElement('div');
    effectsContainer.className = 'cosmic-effects';
    effectsContainer.setAttribute('data-sponsor', 'cosmic-games');
    effectsContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
    `;
    
    // Crear partículas
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'cosmic-particle';
      particle.style.cssText = `
        position: absolute;
        width: 3px;
        height: 3px;
        background: #8b5cf6;
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: cosmic-float ${3 + Math.random() * 4}s ease-in-out infinite;
        animation-delay: ${Math.random() * 2}s;
      `;
      effectsContainer.appendChild(particle);
    }
    
    document.body.appendChild(effectsContainer);
  }
  
  createRetroEffects() {
    // Crear efectos retro (scanlines, pixelado)
    const scanlines = document.createElement('div');
    scanlines.className = 'retro-scanlines';
    scanlines.setAttribute('data-sponsor', 'retro-gaming');
    scanlines.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      background: repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 2px,
        rgba(255, 107, 53, 0.03) 2px,
        rgba(255, 107, 53, 0.03) 4px
      );
      opacity: 0.7;
    `;
    
    document.body.appendChild(scanlines);
  }
  
  removeCustomEffects(brand) {
    if (brand.id === 'cosmic-games') {
      const cosmicEffects = document.querySelector('.cosmic-effects');
      if (cosmicEffects) cosmicEffects.remove();
    } else if (brand.id === 'retro-gaming') {
      const scanlines = document.querySelector('.retro-scanlines');
      if (scanlines) scanlines.remove();
    }
  }
  
  addHeaderBranding(brand) {
    const header = document.querySelector('.main-header');
    if (!header) return;
    
    header.classList.add('sponsor-branded');
    header.setAttribute('data-sponsor-brand', brand.id);
  }
  
  addSubtleWatermark(brand) {
    this.createSponsorWatermark(brand);
  }
  
  addContentHighlights(brand) {
    // Agregar acentos sutiles a elementos de contenido
    const highlights = document.querySelectorAll('.character-panel, .story-progress, .chapter-marker');
    highlights.forEach(element => {
      element.classList.add('sponsor-highlighted');
      element.setAttribute('data-sponsor-highlight', brand.id);
    });
  }
  
  addNavigationAccents(brand) {
    const navItems = document.querySelectorAll('.nav-item, .sidebar-menu-link');
    navItems.forEach(item => {
      item.classList.add('sponsor-accented');
    });
  }
  
  showBrandActivationMessage(brand) {
    // Mostrar mensaje sutil de activación
    const message = document.createElement('div');
    message.className = 'brand-activation-toast';
    message.innerHTML = `
      <div class="toast-icon">${brand.name.charAt(0)}</div>
      <div class="toast-content">
        <div class="toast-title">Experiencia mejorada</div>
        <div class="toast-subtitle">Patrocinado por ${brand.name}</div>
      </div>
    `;
    
    message.style.cssText = `
      position: fixed;
      top: 5rem;
      right: 2rem;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(message);
    
    // Animar entrada
    setTimeout(() => {
      message.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
      message.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
      }, 300);
    }, 3000);
  }
  
  // Métodos de rotación de marcas
  startBrandRotation() {
    if (!this.options.enableSponsorRotation) return;
    
    this.setupRotationQueue();
    this.scheduleNextRotation();
  }
  
  setupRotationQueue() {
    // Crear cola de rotación basada en prioridades y restricciones
    const availableBrands = Array.from(this.brandRegistry.values())
      .filter(brand => this.canActivateBrand(brand))
      .sort((a, b) => {
        // Ordenar por prioridad y métricas
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // Considerar engagement histórico
        const aEngagement = this.analytics?.userEngagement?.get(a.id) || 0;
        const bEngagement = this.analytics?.userEngagement?.get(b.id) || 0;
        
        return bEngagement - aEngagement;
      });
    
    this.brandQueue = availableBrands.map(brand => brand.id);
  }
  
  scheduleNextRotation() {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
    }
    
    const interval = this.calculateRotationInterval();
    
    this.rotationTimer = setTimeout(() => {
      this.performBrandRotation();
    }, interval);
  }
  
  calculateRotationInterval() {
    let baseInterval = this.options.rotationInterval;
    
    // Ajustar según engagement del usuario
    const currentEngagement = this.getCurrentUserEngagement();
    if (currentEngagement > 0.7) {
      baseInterval *= 1.5; // Rotar menos frecuentemente si hay alto engagement
    } else if (currentEngagement < 0.3) {
      baseInterval *= 0.8; // Rotar más frecuentemente si hay bajo engagement
    }
    
    return baseInterval;
  }
  
  performBrandRotation() {
    if (this.brandQueue.length === 0) {
      this.setupRotationQueue();
    }
    
    if (this.brandQueue.length === 0) {
      console.log('🏢 No hay marcas disponibles para rotación');
      this.scheduleNextRotation();
      return;
    }
    
    const nextBrandId = this.brandQueue.shift();
    
    // Verificar si la marca sigue siendo válida
    const brand = this.brandRegistry.get(nextBrandId);
    if (this.canActivateBrand(brand)) {
      this.activateBrand(nextBrandId, { source: 'rotation' });
      
      // Programar desactivación
      const duration = this.calculateBrandDuration(brand);
      
      setTimeout(() => {
        this.deactivateBrand(nextBrandId);
        this.scheduleNextRotation();
      }, duration);
    } else {
      // Intentar con la siguiente marca
      this.performBrandRotation();
    }
  }
  
  calculateBrandDuration(brand) {
    let duration = brand.restrictions?.maxDuration || 300000; // 5 minutos por defecto
    
    // Ajustar según métricas de la marca
    const engagement = this.analytics?.userEngagement?.get(brand.id) || 0;
    if (engagement > 0.8) {
      duration *= 1.3; // Extender si hay buen engagement
    } else if (engagement < 0.3) {
      duration *= 0.7; // Reducir si hay poco engagement
    }
    
    return Math.min(duration, brand.restrictions?.maxDuration || duration);
  }
  
  // Métodos de validación
  canActivateBrand(brand) {
    if (!brand) return false;
    
    // Verificar restricciones de tiempo
    if (!this.isWithinTimeRestrictions(brand)) {
      return false;
    }
    
    // Verificar cooldown
    if (!this.isCooldownExpired(brand)) {
      return false;
    }
    
    // Verificar marcas conflictivas
    if (this.hasConflictingBrands(brand)) {
      return false;
    }
    
    // Verificar requisitos de usuario
    if (brand.restrictions?.userTierRequired && !this.hasRequiredUserTier(brand.restrictions.userTierRequired)) {
      return false;
    }
    
    return true;
  }
  
  isWithinTimeRestrictions(brand) {
    if (!brand.restrictions?.timeRestrictions) return true;
    
    const currentHour = new Date().getHours();
    const { startHour, endHour } = brand.restrictions.timeRestrictions;
    
    return currentHour >= startHour && currentHour <= endHour;
  }
  
  isCooldownExpired(brand) {
    const lastActivation = this.getLastActivationTime(brand.id);
    if (!lastActivation) return true;
    
    const cooldownPeriod = brand.restrictions?.cooldownPeriod || 0;
    return Date.now() - lastActivation >= cooldownPeriod;
  }
  
  hasConflictingBrands(brand) {
    if (!brand.restrictions?.conflictingBrands) return false;
    
    return brand.restrictions.conflictingBrands.some(conflictId => 
      this.activeBrands.has(conflictId)
    );
  }
  
  hasRequiredUserTier(requiredTier) {
    // Simular verificación de tier del usuario
    const userTier = this.getUserTier();
    return userTier === requiredTier || userTier === 'premium';
  }
  
  respectsUserPreferences(brand) {
    if (!this.userPreferences.allowBranding) return false;
    
    if (this.userPreferences.blockedBrands.includes(brand.id)) return false;
    
    return true;
  }
  
  // Métodos de utilidad
  blendColors(color1, color2, intensity) {
    // Función simplificada para mezclar colores
    // En implementación real usarías una librería como chroma.js
    return intensity > 0.5 ? color2 : color1;
  }
  
  getCurrentThemeColor(colorKey) {
    const root = document.documentElement;
    return getComputedStyle(root).getPropertyValue(`--theme-${colorKey}`) || '#4f46e5';
  }
  
  getLastActivationTime(brandId) {
    const history = this.brandHistory.filter(entry => entry.brandId === brandId);
    return history.length > 0 ? Math.max(...history.map(entry => entry.activatedAt)) : null;
  }
  
  getUserTier() {
    // Simular obtención del tier del usuario
    return 'standard'; // o 'premium'
  }
  
  getCurrentUserEngagement() {
    // Calcular engagement actual del usuario
    const recentInteractions = this.getRecentInteractions();
    return Math.min(recentInteractions / 10, 1); // Normalizar a 0-1
  }
  
  getRecentInteractions() {
    // Simular conteo de interacciones recientes
    return Math.floor(Math.random() * 15);
  }
  
  // Métodos de tracking y métricas
  startBrandTracking(brandId) {
    if (!this.options.enableBrandAnalytics) return;
    
    // Incrementar impresiones
    const currentImpressions = this.analytics.impressions.get(brandId) || 0;
    this.analytics.impressions.set(brandId, currentImpressions + 1);
    
    // Iniciar tracking de tiempo
    this.brandTrackingStartTime = Date.now();
  }
  
  stopBrandTracking(brandId) {
    if (!this.options.enableBrandAnalytics || !this.brandTrackingStartTime) return;
    
    // Calcular tiempo total
    const timeSpent = Date.now() - this.brandTrackingStartTime;
    const currentTimeSpent = this.analytics.timeSpent.get(brandId) || 0;
    this.analytics.timeSpent.set(brandId, currentTimeSpent + timeSpent);
    
    this.brandTrackingStartTime = null;
  }
  
  updateBrandMetrics(brandId, activeBrand) {
    // Actualizar métricas de engagement
    const engagementScore = this.calculateEngagementScore(activeBrand);
    this.analytics.userEngagement.set(brandId, engagementScore);
    
    // Guardar métricas
    this.saveBrandMetrics();
  }
  
  calculateEngagementScore(activeBrand) {
    // Calcular puntuación de engagement basada en duración y interacciones
    const durationScore = Math.min(activeBrand.duration / 300000, 1); // Normalizar a 5 minutos
    const interactionScore = activeBrand.interactions ? activeBrand.interactions / 5 : 0;
    
    return (durationScore * 0.6 + interactionScore * 0.4);
  }
  
  trackUserInteraction(event) {
    if (!this.currentBrand || !this.options.enableBrandAnalytics) return;
    
    const { detail } = event;
    
    // Incrementar interacciones para la marca actual
    const currentInteractions = this.analytics.interactions.get(this.currentBrand) || 0;
    this.analytics.interactions.set(this.currentBrand, currentInteractions + 1);
    
    // Actualizar datos de la marca activa
    const activeBrand = this.activeBrands.get(this.currentBrand);
    if (activeBrand) {
      activeBrand.interactions = (activeBrand.interactions || 0) + 1;
    }
  }
  
  handleSponsorClick(event) {
    const { sponsorId } = event.detail;
    
    if (sponsorId === this.currentBrand) {
      // Incrementar conversiones
      const currentConversions = this.analytics.conversions.get(sponsorId) || 0;
      this.analytics.conversions.set(sponsorId, currentConversions + 1);
      
      this.emit('brand:conversion', { brandId: sponsorId });
    }
  }
  
  // Manejadores de eventos
  handleBrandActivation(event) {
    const { brandId, options } = event.detail;
    this.activateBrand(brandId, options);
  }
  
  handleBrandDeactivation(event) {
    const { brandId } = event.detail;
    this.deactivateBrand(brandId);
  }
  
  handleBrandRotation() {
    this.performBrandRotation();
  }
  
  handleIntensityUpdate(event) {
    const { intensity } = event.detail;
    this.brandIntensity = Math.max(0, Math.min(1, intensity));
    
    // Reaplicar marca actual si existe
    if (this.currentBrand) {
      const brand = this.brandRegistry.get(this.currentBrand);
      this.applyBrandStyling(brand, { intensity: this.brandIntensity });
    }
  }
  
  handlePreferencesUpdate(event) {
    const { preferences } = event.detail;
    this.userPreferences = { ...this.userPreferences, ...preferences };
    this.saveUserPreferences();
  }
  
  handleTimeChange() {
    // Verificar si marcas activas siguen siendo válidas
    Array.from(this.activeBrands.keys()).forEach(brandId => {
      const brand = this.brandRegistry.get(brandId);
      if (!this.canActivateBrand(brand)) {
        this.deactivateBrand(brandId);
      }
    });
  }
  
  handleContentView(event) {
    // Tracking de vistas de contenido para optimizar marca
    if (this.currentBrand) {
      const activeBrand = this.activeBrands.get(this.currentBrand);
      if (activeBrand) {
        activeBrand.contentViews = (activeBrand.contentViews || 0) + 1;
      }
    }
  }
  
  // Persistencia de datos
  saveUserPreferences() {
    try {
      // En un entorno real, usarías localStorage o una API
      console.log('💾 Preferencias de marca guardadas');
    } catch (error) {
      console.error('❌ Error guardando preferencias de marca:', error);
    }
  }
  
  loadUserPreferences() {
    try {
      // Simular carga desde localStorage
      const preferences = this.getStoredPreferences();
      if (preferences) {
        this.userPreferences = { ...this.userPreferences, ...preferences };
      }
    } catch (error) {
      console.warn('⚠️ Error cargando preferencias de marca:', error);
    }
  }
  
  loadBrandConfigurations() {
    try {
      // Simular carga de configuraciones de marca desde API
      console.log('📁 Configuraciones de marca cargadas');
    } catch (error) {
      console.warn('⚠️ Error cargando configuraciones de marca:', error);
    }
  }
  
  saveBrandMetrics() {
    try {
      // Simular guardado de métricas
      console.log('📊 Métricas de marca guardadas');
    } catch (error) {
      console.error('❌ Error guardando métricas de marca:', error);
    }
  }
  
  getStoredPreferences() {
    // Simular carga desde localStorage
    return null;
  }
  
  // API pública
  getBrandAnalytics(brandId) {
    if (!brandId) {
      // Retornar todas las métricas
      const allAnalytics = {};
      this.brandRegistry.forEach((brand, id) => {
        allAnalytics[id] = this.getBrandMetrics(id);
      });
      return allAnalytics;
    }
    
    return this.getBrandMetrics(brandId);
  }
  
  getBrandMetrics(brandId) {
    return {
      impressions: this.analytics.impressions.get(brandId) || 0,
      interactions: this.analytics.interactions.get(brandId) || 0,
      conversions: this.analytics.conversions.get(brandId) || 0,
      timeSpent: this.analytics.timeSpent.get(brandId) || 0,
      userEngagement: this.analytics.userEngagement.get(brandId) || 0,
      conversionRate: this.getConversionRate(brandId),
      averageSessionTime: this.getAverageSessionTime(brandId)
    };
  }
  
  getConversionRate(brandId) {
    const impressions = this.analytics.impressions.get(brandId) || 0;
    const conversions = this.analytics.conversions.get(brandId) || 0;
    return impressions > 0 ? conversions / impressions : 0;
  }
  
  getAverageSessionTime(brandId) {
    const totalTime = this.analytics.timeSpent.get(brandId) || 0;
    const impressions = this.analytics.impressions.get(brandId) || 0;
    return impressions > 0 ? totalTime / impressions : 0;
  }
  
  getActiveBrands() {
    return Array.from(this.activeBrands.keys());
  }
  
  getCurrentBrand() {
    return this.currentBrand ? this.brandRegistry.get(this.currentBrand) : null;
  }
  
  updateBrandIntensity(intensity) {
    this.emit('brand:update-intensity', { intensity });
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // Métodos de administración de marcas
  addBrand(brandConfig) {
    if (!brandConfig.id) {
      console.warn('⚠️ ID de marca requerido');
      return false;
    }
    
    // Validar configuración de marca
    const validatedConfig = this.validateBrandConfig(brandConfig);
    if (!validatedConfig) {
      console.warn(`⚠️ Configuración de marca inválida: ${brandConfig.id}`);
      return false;
    }
    
    // Agregar al registro
    this.brandRegistry.set(brandConfig.id, validatedConfig);
    
    // Inicializar métricas
    this.initializeBrandMetrics(brandConfig.id);
    
    console.log(`✅ Marca agregada: ${brandConfig.name}`);
    return true;
  }
  
  removeBrand(brandId) {
    // Desactivar si está activa
    if (this.activeBrands.has(brandId)) {
      this.deactivateBrand(brandId);
    }
    
    // Remover del registro
    this.brandRegistry.delete(brandId);
    
    // Limpiar métricas
    Object.values(this.analytics).forEach(metric => {
      metric.delete(brandId);
    });
    
    // Remover de la cola
    this.brandQueue = this.brandQueue.filter(id => id !== brandId);
    
    console.log(`🗑️ Marca removida: ${brandId}`);
    return true;
  }
  
  updateBrand(brandId, updates) {
    const brand = this.brandRegistry.get(brandId);
    if (!brand) {
      console.warn(`⚠️ Marca no encontrada: ${brandId}`);
      return false;
    }
    
    // Actualizar configuración
    const updatedBrand = { ...brand, ...updates };
    const validatedConfig = this.validateBrandConfig(updatedBrand);
    
    if (!validatedConfig) {
      console.warn(`⚠️ Actualización de marca inválida: ${brandId}`);
      return false;
    }
    
    this.brandRegistry.set(brandId, validatedConfig);
    
    // Reaplicar si está activa
    if (this.currentBrand === brandId) {
      this.applyBrandStyling(validatedConfig);
    }
    
    console.log(`🔄 Marca actualizada: ${brandId}`);
    return true;
  }
  
  validateBrandConfig(config) {
    // Validación básica de configuración de marca
    const required = ['id', 'name', 'category', 'colors'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Campos requeridos faltantes: ${missing.join(', ')}`);
      return null;
    }
    
    // Aplicar valores por defecto
    return {
      priority: 'medium',
      typography: {
        primary: 'inherit',
        weight: 'normal'
      },
      styling: {
        borderRadius: '0.375rem',
        shadowIntensity: 'medium',
        animationStyle: 'smooth'
      },
      integration: {
        headerBranding: false,
        subtleWatermark: true,
        contentHighlights: false,
        navigationAccents: false
      },
      restrictions: {
        maxDuration: 300000,
        cooldownPeriod: 600000,
        conflictingBrands: []
      },
      ...config
    };
  }
  
  // Métodos de control
  pauseBrandRotation() {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }
    console.log('⏸️ Rotación de marcas pausada');
  }
  
  resumeBrandRotation() {
    if (!this.rotationTimer && this.options.enableSponsorRotation) {
      this.scheduleNextRotation();
      console.log('▶️ Rotación de marcas reanudada');
    }
  }
  
  forceRotation() {
    this.performBrandRotation();
    console.log('🔄 Rotación forzada');
  }
  
  setBrandIntensity(intensity) {
    this.brandIntensity = Math.max(0, Math.min(1, intensity));
    
    if (this.currentBrand) {
      const brand = this.brandRegistry.get(this.currentBrand);
      this.applyBrandStyling(brand, { intensity: this.brandIntensity });
    }
    
    console.log(`🎛️ Intensidad de marca establecida: ${intensity}`);
  }
  
  // Métodos de debugging
  debugInfo() {
    return {
      currentBrand: this.currentBrand,
      activeBrands: Array.from(this.activeBrands.keys()),
      brandQueue: this.brandQueue,
      brandIntensity: this.brandIntensity,
      options: this.options,
      userPreferences: this.userPreferences,
      analytics: this.getBrandAnalytics(),
      isRotationActive: !!this.rotationTimer
    };
  }
  
  getStatus() {
    const status = {
      initialized: true,
      currentBrand: this.currentBrand,
      activeBrandsCount: this.activeBrands.size,
      availableBrands: this.brandRegistry.size,
      rotationEnabled: this.options.enableSponsorRotation,
      analyticsEnabled: this.options.enableBrandAnalytics,
      lastUpdate: Date.now()
    };
    
    console.log('📊 Estado del Brand Adaptation:', status);
    return status;
  }
  
  // Métodos de limpieza
  destroy() {
    console.log('🧹 Destruyendo Brand Adaptation...');
    
    // Desactivar todas las marcas
    Array.from(this.activeBrands.keys()).forEach(brandId => {
      this.deactivateBrand(brandId);
    });
    
    // Limpiar timers
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }
    
    // Guardar métricas finales
    this.saveBrandMetrics();
    
    // Remover event listeners
    document.removeEventListener('brand:activate', this.handleBrandActivation);
    document.removeEventListener('brand:deactivate', this.handleBrandDeactivation);
    document.removeEventListener('brand:rotate', this.handleBrandRotation);
    document.removeEventListener('brand:update-intensity', this.handleIntensityUpdate);
    document.removeEventListener('user:interaction', this.trackUserInteraction);
    document.removeEventListener('user:preferences-updated', this.handlePreferencesUpdate);
    document.removeEventListener('time:hour-changed', this.handleTimeChange);
    document.removeEventListener('content:viewed', this.handleContentView);
    document.removeEventListener('sponsor:clicked', this.handleSponsorClick);
    
    // Limpiar referencias
    this.activeBrands.clear();
    this.brandQueue = [];
    this.brandHistory = [];
    this.brandRegistry.clear();
    
    if (this.analytics) {
      Object.values(this.analytics).forEach(metric => metric.clear());
    }
    
    console.log('✅ Brand Adaptation destruido completamente');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.BrandAdaptation = BrandAdaptation;
}

export default BrandAdaptation;