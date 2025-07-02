/**
 * Community Stories Platform - Application Configuration
 * Configuración central de la aplicación
 */

// Configuración de la aplicación
const APP_CONFIG = {
  // Información básica
  name: 'Community Stories Platform',
  version: '1.0.0',
  environment: 'development', // development | staging | production
  
  // URLs y endpoints
  api: {
    baseUrl: 'https://api.communitystories.platform',
    version: 'v1',
    timeout: 10000,
    retryAttempts: 3,
    endpoints: {
      stories: '/stories',
      communities: '/communities',
      sponsors: '/sponsors',
      users: '/users',
      analytics: '/analytics',
      media: '/media',
      search: '/search',
      donations: '/donations'
    }
  },
  
  // CDN y recursos externos
  cdn: {
    baseUrl: 'https://cdn.communitystories.platform',
    images: '/images',
    videos: '/videos',
    audio: '/audio',
    fonts: '/fonts',
    icons: '/icons'
  },
  
  // Configuración de media
  media: {
    images: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
      quality: {
        thumbnail: 0.7,
        medium: 0.8,
        large: 0.9
      },
      sizes: {
        thumbnail: { width: 300, height: 200 },
        medium: { width: 800, height: 600 },
        large: { width: 1920, height: 1080 }
      }
    },
    videos: {
      maxSize: 100 * 1024 * 1024, // 100MB
      allowedFormats: ['mp4', 'webm', 'mov'],
      quality: {
        low: '480p',
        medium: '720p',
        high: '1080p'
      }
    },
    audio: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedFormats: ['mp3', 'wav', 'ogg', 'm4a'],
      quality: {
        low: 128,
        medium: 192,
        high: 320
      }
    }
  },
  
  // Configuración de performance
  performance: {
    lazyLoading: true,
    preloadImages: 3,
    cacheTimeout: 24 * 60 * 60 * 1000, // 24 horas
    debounceDelay: 300,
    throttleDelay: 100,
    intersectionThreshold: 0.1,
    maxConcurrentRequests: 6
  },
  
  // Configuración de UI
  ui: {
    theme: 'auto', // auto | light | dark
    language: 'es', // es | en | fr | pt | de
    animations: {
      enabled: true,
      duration: {
        fast: 200,
        normal: 300,
        slow: 500
      },
      easing: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0, 1, 1)'
      }
    },
    breakpoints: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536
    },
    sidebar: {
      width: 320,
      collapsedWidth: 64,
      autoCollapse: true
    },
    notifications: {
      position: 'top-right',
      timeout: 5000,
      maxVisible: 3
    }
  },
  
  // Configuración de analytics
  analytics: {
    enabled: true,
    provider: 'custom', // google | custom | none
    trackingId: null,
    events: {
      pageView: true,
      storyRead: true,
      donation: true,
      share: true,
      search: true
    },
    privacy: {
      anonymizeIP: true,
      respectDNT: true,
      cookieConsent: true
    }
  },
  
  // Configuración de mapas
  maps: {
    provider: 'mapbox', // mapbox | google | openstreetmap
    apiKey: null,
    defaultZoom: 10,
    style: 'streets-v11',
    clustering: true,
    markers: {
      community: {
        color: '#6366f1',
        size: 'medium'
      },
      sponsor: {
        color: '#059669',
        size: 'small'
      }
    }
  },
  
  // Configuración de pagos
  payments: {
    provider: 'stripe', // stripe | paypal | custom
    currency: 'USD',
    minimumAmount: 1,
    suggestedAmounts: [5, 10, 25, 50, 100],
    processingFee: 0.029, // 2.9%
    platformFee: 0.05 // 5%
  },
  
  // Configuración de SEO
  seo: {
    siteName: 'Community Stories Platform',
    description: 'El Netflix de las narrativas comunitarias con sistema de patrocinio integrado',
    keywords: 'comunidades, narrativas, patrocinio, impacto social, storytelling',
    author: 'Community Stories Team',
    twitterHandle: '@communitystories',
    ogImage: '/assets/images/og-image.jpg',
    canonicalUrl: 'https://communitystories.platform',
    structuredData: true
  },
  
  // Configuración de PWA
  pwa: {
    enabled: true,
    serviceWorker: '/service-worker.js',
    updateCheck: 60000, // 1 minuto
    installPrompt: {
      enabled: true,
      delay: 30000, // 30 segundos
      dismissCount: 3
    },
    notifications: {
      enabled: true,
      vapidKey: null
    }
  },
  
  // Configuración de seguridad
  security: {
    csp: {
      enabled: true,
      reportOnly: false
    },
    csrf: {
      enabled: true,
      headerName: 'X-CSRF-Token'
    },
    rateLimit: {
      enabled: true,
      requests: 100,
      window: 60000 // 1 minuto
    },
    sanitization: {
      enabled: true,
      allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']
    }
  },
  
  // Configuración de desarrollo
  development: {
    debug: true,
    verbose: true,
    mockData: true,
    hotReload: true,
    devTools: {
      redux: true,
      performance: true,
      accessibility: true
    }
  },
  
  // Features flags
  features: {
    darkMode: true,
    offlineMode: true,
    rtlSupport: false,
    beta: {
      aiRecommendations: false,
      blockchainDonations: false,
      vrExperience: false
    }
  },
  
  // Configuración de internacionalización
  i18n: {
    defaultLanguage: 'es',
    fallbackLanguage: 'en',
    supportedLanguages: ['es', 'en', 'fr', 'pt', 'de'],
    rtlLanguages: ['ar', 'he'],
    dateFormat: {
      short: 'DD/MM/YYYY',
      long: 'DD de MMMM de YYYY',
      time: 'HH:mm'
    },
    numberFormat: {
      currency: 'es-ES',
      decimal: ',',
      thousands: '.'
    }
  },
  
  // Configuración de comunidades
  communities: {
    maxStoriesPerCommunity: 10,
    verificationRequired: true,
    autoModeration: true,
    categories: [
      'renewable-energy',
      'education-access',
      'water-sanitation',
      'healthcare',
      'agriculture',
      'technology',
      'arts-culture',
      'economic-development',
      'environmental-conservation',
      'social-justice'
    ],
    regions: [
      'latin-america',
      'north-america',
      'europe',
      'africa',
      'asia',
      'oceania'
    ]
  },
  
  // Configuración de historias
  stories: {
    maxLength: 10000, // caracteres
    minLength: 500,
    autoSave: true,
    autoSaveInterval: 30000, // 30 segundos
    drafts: {
      maxCount: 5,
      retention: 30 // días
    },
    publishing: {
      review: true,
      autoPublish: false,
      scheduledPublishing: true
    },
    sharing: {
      socialMedia: ['twitter', 'facebook', 'linkedin', 'whatsapp'],
      embedCode: true,
      downloadPDF: true
    }
  },
  
  // Configuración de sponsors
  sponsors: {
    tiers: {
      bronze: {
        minAmount: 1000,
        benefits: ['logo-placement', 'mention']
      },
      silver: {
        minAmount: 5000,
        benefits: ['logo-placement', 'mention', 'link-back']
      },
      gold: {
        minAmount: 10000,
        benefits: ['logo-placement', 'mention', 'link-back', 'custom-content']
      },
      platinum: {
        minAmount: 25000,
        benefits: ['logo-placement', 'mention', 'link-back', 'custom-content', 'naming-rights']
      }
    },
    verification: {
      required: true,
      methods: ['business-license', 'bank-verification', 'manual-review']
    },
    reporting: {
      frequency: 'monthly',
      metrics: ['reach', 'engagement', 'conversion', 'impact']
    }
  }
};

// Configuración específica por ambiente
const ENVIRONMENT_CONFIG = {
  development: {
    api: {
      baseUrl: 'http://localhost:3001'
    },
    debug: true,
    mockData: true,
    analytics: {
      enabled: false
    }
  },
  
  staging: {
    api: {
      baseUrl: 'https://staging-api.communitystories.platform'
    },
    debug: true,
    mockData: false,
    analytics: {
      enabled: true
    }
  },
  
  production: {
    api: {
      baseUrl: 'https://api.communitystories.platform'
    },
    debug: false,
    mockData: false,
    analytics: {
      enabled: true
    },
    performance: {
      cacheTimeout: 7 * 24 * 60 * 60 * 1000 // 7 días
    }
  }
};

// Funciones de configuración
const ConfigManager = {
  /**
   * Obtiene la configuración completa
   */
  getConfig() {
    const envConfig = ENVIRONMENT_CONFIG[APP_CONFIG.environment] || {};
    return this.mergeDeep(APP_CONFIG, envConfig);
  },
  
  /**
   * Obtiene un valor de configuración específico
   */
  get(path, defaultValue = null) {
    const config = this.getConfig();
    return this.getNestedValue(config, path, defaultValue);
  },
  
  /**
   * Establece un valor de configuración
   */
  set(path, value) {
    const keys = path.split('.');
    let current = APP_CONFIG;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  },
  
  /**
   * Obtiene valor anidado de un objeto
   */
  getNestedValue(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    
    return result;
  },
  
  /**
   * Fusiona objetos profundamente
   */
  mergeDeep(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.mergeDeep(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  },
  
  /**
   * Valida la configuración
   */
  validate() {
    const config = this.getConfig();
    const errors = [];
    
    // Validaciones básicas
    if (!config.name) {
      errors.push('App name is required');
    }
    
    if (!config.api.baseUrl) {
      errors.push('API base URL is required');
    }
    
    if (config.analytics.enabled && !config.analytics.trackingId) {
      console.warn('Analytics enabled but no tracking ID provided');
    }
    
    if (config.maps.provider === 'mapbox' && !config.maps.apiKey) {
      console.warn('Mapbox provider selected but no API key provided');
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  },
  
  /**
   * Inicializa la configuración con valores del localStorage
   */
  init() {
    try {
      // Cargar preferencias del usuario desde localStorage
      const userPrefs = localStorage.getItem('app-preferences');
      if (userPrefs) {
        const prefs = JSON.parse(userPrefs);
        
        // Aplicar preferencias de UI
        if (prefs.theme) {
          this.set('ui.theme', prefs.theme);
        }
        
        if (prefs.language) {
          this.set('ui.language', prefs.language);
        }
        
        if (prefs.animations !== undefined) {
          this.set('ui.animations.enabled', prefs.animations);
        }
      }
      
      // Detectar capacidades del dispositivo
      this.detectCapabilities();
      
      // Validar configuración
      this.validate();
      
      console.log('Configuration initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize configuration:', error);
      return false;
    }
  },
  
  /**
   * Detecta capacidades del dispositivo
   */
  detectCapabilities() {
    // Detectar soporte para características
    const capabilities = {
      webp: this.supportsWebP(),
      avif: this.supportsAVIF(),
      serviceWorker: 'serviceWorker' in navigator,
      pushNotifications: 'PushManager' in window,
      webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
      webGL: this.supportsWebGL(),
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window
    };
    
    // Ajustar configuración basada en capacidades
    if (!capabilities.webp) {
      const formats = this.get('media.images.allowedFormats');
      this.set('media.images.allowedFormats', formats.filter(f => f !== 'webp'));
    }
    
    if (!capabilities.serviceWorker) {
      this.set('pwa.enabled', false);
    }
    
    if (!capabilities.intersectionObserver) {
      this.set('performance.lazyLoading', false);
    }
    
    // Detectar preferencias del usuario
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.set('ui.animations.enabled', false);
    }
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.set('ui.theme', 'dark');
    }
    
    // Almacenar capacidades para uso posterior
    this.set('capabilities', capabilities);
  },
  
  /**
   * Verifica soporte para WebP
   */
  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },
  
  /**
   * Verifica soporte para AVIF
   */
  supportsAVIF() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  },
  
  /**
   * Verifica soporte para WebGL
   */
  supportsWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
    } catch (e) {
      return false;
    }
  },
  
  /**
   * Guarda preferencias del usuario
   */
  saveUserPreferences(preferences) {
    try {
      localStorage.setItem('app-preferences', JSON.stringify(preferences));
      
      // Aplicar cambios inmediatamente
      Object.keys(preferences).forEach(key => {
        switch (key) {
          case 'theme':
            this.set('ui.theme', preferences[key]);
            document.documentElement.setAttribute('data-theme', preferences[key]);
            break;
          case 'language':
            this.set('ui.language', preferences[key]);
            document.documentElement.setAttribute('lang', preferences[key]);
            break;
          case 'animations':
            this.set('ui.animations.enabled', preferences[key]);
            break;
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      return false;
    }
  },
  
  /**
   * Obtiene las preferencias del usuario
   */
  getUserPreferences() {
    try {
      const prefs = localStorage.getItem('app-preferences');
      return prefs ? JSON.parse(prefs) : {};
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return {};
    }
  }
};

// Exportar configuración
window.APP_CONFIG = APP_CONFIG;
window.ConfigManager = ConfigManager;

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ConfigManager.init();
  });
} else {
  ConfigManager.init();
}