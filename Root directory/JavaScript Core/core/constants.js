/**
 * Community Stories Platform - Constants (Compact Version)
 * Versión compacta y modular de las constantes
 */

// === CONFIGURACIÓN CENTRALIZADA ===
const APP_CONFIG = {
  name: 'Community Stories Platform',
  version: '1.0.0',
  api: {
    baseUrl: 'https://api.communitystories.platform',
    timeout: 10000,
    retries: 3
  },
  storage: {
    prefix: 'csp_',
    maxSize: 50 * 1024 * 1024, // 50MB
    ttl: 24 * 60 * 60 * 1000 // 24 horas
  },
  limits: {
    upload: 10 * 1024 * 1024, // 10MB
    titleLength: 100,
    descriptionLength: 500,
    searchMin: 2
  }
};

// === ENUMS SIMPLES ===
const ENUMS = {
  // Estados
  states: {
    INIT: 0,
    LOADING: 1,
    READY: 2,
    ERROR: 3,
    OFFLINE: 4
  },
  
  // Tipos de notificación
  notifications: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  },
  
  // Roles
  roles: {
    GUEST: 0,
    USER: 1,
    COMMUNITY: 2,
    SPONSOR: 3,
    MODERATOR: 4,
    ADMIN: 5
  },
  
  // Prioridades
  priority: {
    LOW: 0,
    NORMAL: 1,
    HIGH: 2,
    URGENT: 3
  }
};

// === EVENTOS (Simplificado) ===
const EVENTS = [
  // App
  'app:init', 'app:ready', 'app:error',
  // Story
  'story:load', 'story:loaded', 'story:error', 'story:progress', 'story:complete',
  // Community
  'community:select', 'community:load', 'community:loaded',
  // Sponsor
  'sponsor:view', 'sponsor:click', 'sponsor:convert',
  // Donation
  'donation:start', 'donation:success', 'donation:error',
  // UI
  'ui:resize', 'ui:scroll', 'ui:theme', 'ui:language',
  // Network
  'network:online', 'network:offline', 'network:slow'
].reduce((acc, event) => {
  const key = event.toUpperCase().replace(/:/g, '_');
  acc[key] = event;
  return acc;
}, {});

// === CATEGORÍAS (Simplificado) ===
const CATEGORIES = [
  { id: 'energy', name: 'Energía Renovable', icon: '⚡', color: '#10b981' },
  { id: 'education', name: 'Educación', icon: '📚', color: '#3b82f6' },
  { id: 'water', name: 'Agua', icon: '💧', color: '#06b6d4' },
  { id: 'health', name: 'Salud', icon: '🏥', color: '#ef4444' },
  { id: 'agriculture', name: 'Agricultura', icon: '🌱', color: '#84cc16' },
  { id: 'technology', name: 'Tecnología', icon: '💻', color: '#8b5cf6' },
  { id: 'arts', name: 'Arte y Cultura', icon: '🎨', color: '#f59e0b' },
  { id: 'economy', name: 'Desarrollo Económico', icon: '💼', color: '#059669' },
  { id: 'environment', name: 'Medio Ambiente', icon: '🌍', color: '#16a34a' },
  { id: 'justice', name: 'Justicia Social', icon: '⚖️', color: '#dc2626' }
];

// === IDIOMAS (Simplificado) ===
const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
];

// === TIERS DE PATROCINIO (Simplificado) ===
const SPONSOR_TIERS = [
  { id: 'bronze', min: 2000, max: 4999, color: '#cd7f32' },
  { id: 'silver', min: 5000, max: 9999, color: '#c0c0c0' },
  { id: 'gold', min: 10000, max: 24999, color: '#ffd700' },
  { id: 'platinum', min: 25000, max: null, color: '#e5e4e2' }
];

// === REGIONES (Simplificado) ===
const REGIONS = {
  LA: ['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'MX', 'PE'],
  NA: ['US', 'CA'],
  EU: ['ES', 'FR', 'DE', 'IT', 'PT', 'GB'],
  AF: ['NG', 'KE', 'ZA', 'EG', 'MA'],
  AS: ['IN', 'CN', 'JP', 'KR', 'TH'],
  OC: ['AU', 'NZ']
};

// === BREAKPOINTS (Mobile First) ===
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// === TIMEOUTS (ms) ===
const TIMEOUTS = {
  debounce: 300,
  throttle: 16,
  notification: 5000,
  api: 10000,
  autosave: 30000
};

// === PATRONES DE VALIDACIÓN ===
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+\..+/,
  phone: /^[\+]?[0-9]{8,15}$/,
  slug: /^[a-z0-9-]+$/
};

// === CÓDIGOS DE ERROR ===
const ERRORS = {
  NETWORK: 'E001',
  AUTH: 'E002',
  VALIDATION: 'E003',
  NOT_FOUND: 'E004',
  SERVER: 'E005',
  PAYMENT: 'E006',
  PERMISSION: 'E007',
  TIMEOUT: 'E008'
};

// === TEMAS ===
const THEMES = {
  light: {
    primary: '#6366f1',
    bg: '#ffffff',
    text: '#111827'
  },
  dark: {
    primary: '#818cf8',
    bg: '#111827',
    text: '#f9fafb'
  }
};

// === HELPERS COMPACTOS ===
const Constants = {
  // Obtener configuración
  config: (path) => {
    return path.split('.').reduce((obj, key) => obj?.[key], APP_CONFIG);
  },
  
  // Obtener categoría
  category: (id) => CATEGORIES.find(c => c.id === id),
  
  // Obtener idioma
  language: (code) => LANGUAGES.find(l => l.code === code),
  
  // Obtener tier por monto
  tier: (amount) => SPONSOR_TIERS.find(t => amount >= t.min && (!t.max || amount <= t.max)),
  
  // Obtener región por país
  region: (country) => {
    for (const [region, countries] of Object.entries(REGIONS)) {
      if (countries.includes(country)) return region;
    }
    return null;
  },
  
  // Validar con patrón
  validate: (value, pattern) => PATTERNS[pattern]?.test(value) || false,
  
  // Obtener breakpoint actual
  breakpoint: () => {
    const width = window.innerWidth;
    for (const [name, size] of Object.entries(BREAKPOINTS)) {
      if (width < size) return name;
    }
    return '2xl';
  },
  
  // Formatear moneda
  currency: (amount, locale = 'es-ES') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: locale.includes('ES') ? 'EUR' : 'USD'
    }).format(amount);
  }
};

// === EXPORTAR TODO ===
const CONSTANTS = {
  APP_CONFIG,
  ENUMS,
  EVENTS,
  CATEGORIES,
  LANGUAGES,
  SPONSOR_TIERS,
  REGIONS,
  BREAKPOINTS,
  TIMEOUTS,
  PATTERNS,
  ERRORS,
  THEMES,
  // Helpers
  ...Constants
};

// Congelar el objeto principal
Object.freeze(CONSTANTS);

// Exportar al scope global
window.CONSTANTS = CONSTANTS;
window.C = CONSTANTS; // Alias corto

// Exportar también los objetos individuales para compatibilidad
window.APP_CONFIG = APP_CONFIG;
window.EVENTS = EVENTS;
window.CATEGORIES = CATEGORIES;
window.LANGUAGES = LANGUAGES;
window.SPONSOR_TIERS = SPONSOR_TIERS;