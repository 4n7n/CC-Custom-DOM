/**
 * Community Stories Platform - Utility Functions
 * Funciones de utilidad comunes para toda la aplicación
 */

// === UTILIDADES DOM ===
const DOMUtils = {
  /**
   * Selecciona un elemento del DOM
   */
  $(selector, context = document) {
    return context.querySelector(selector);
  },

  /**
   * Selecciona múltiples elementos del DOM
   */
  $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  },

  /**
   * Crea un elemento con atributos opcionales
   */
  createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else {
        element[key] = value;
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });

    return element;
  },

  /**
   * Añade event listener con cleanup automático
   */
  addEventListenerWithCleanup(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    return () => element.removeEventListener(event, handler, options);
  },

  /**
   * Verifica si un elemento está visible en el viewport
   */
  isElementVisible(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.top >= -threshold &&
      rect.left >= -threshold &&
      rect.bottom <= windowHeight + threshold &&
      rect.right <= windowWidth + threshold
    );
  },

  /**
   * Scroll suave a un elemento
   */
  scrollToElement(element, options = {}) {
    const defaultOptions = {
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    };

    element.scrollIntoView({ ...defaultOptions, ...options });
  },

  /**
   * Obtiene la posición de scroll de un elemento
   */
  getScrollPosition(element = window) {
    if (element === window) {
      return {
        x: window.pageXOffset || document.documentElement.scrollLeft,
        y: window.pageYOffset || document.documentElement.scrollTop
      };
    }
    return {
      x: element.scrollLeft,
      y: element.scrollTop
    };
  },

  /**
   * Establece atributos ARIA de accesibilidad
   */
  setAriaAttributes(element, attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(`aria-${key}`, value);
    });
  },

  /**
   * Muestra/oculta elemento con animación
   */
  toggleVisibility(element, show, duration = 300) {
    return new Promise(resolve => {
      if (show) {
        element.style.display = 'block';
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease`;
        
        requestAnimationFrame(() => {
          element.style.opacity = '1';
          setTimeout(resolve, duration);
        });
      } else {
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';
        
        setTimeout(() => {
          element.style.display = 'none';
          resolve();
        }, duration);
      }
    });
  }
};

// === UTILIDADES DE CADENAS ===
const StringUtils = {
  /**
   * Capitaliza la primera letra
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Convierte a título (primera letra de cada palabra en mayúscula)
   */
  toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  /**
   * Convierte a formato slug (URL amigable)
   */
  toSlug(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9 -]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/-+/g, '-') // Múltiples guiones a uno
      .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio/final
  },

  /**
   * Trunca texto con puntos suspensivos
   */
  truncate(str, length = 100, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length).trim() + suffix;
  },

  /**
   * Trunca texto por palabras
   */
  truncateWords(str, wordCount = 20, suffix = '...') {
    const words = str.split(' ');
    if (words.length <= wordCount) return str;
    return words.slice(0, wordCount).join(' ') + suffix;
  },

  /**
   * Escapa HTML para prevenir XSS
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Extrae texto plano de HTML
   */
  stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  },

  /**
   * Genera un ID único
   */
  generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Valida email
   */
  isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  },

  /**
   * Valida URL
   */
  isValidUrl(url) {
    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    return urlPattern.test(url);
  },

  /**
   * Formatea número como texto legible
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
};

// === UTILIDADES DE OBJETOS ===
const ObjectUtils = {
  /**
   * Clonado profundo de objetos
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => ObjectUtils.deepClone(item));
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = ObjectUtils.deepClone(obj[key]);
    });
    return cloned;
  },

  /**
   * Fusión profunda de objetos
   */
  deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (ObjectUtils.isObject(target) && ObjectUtils.isObject(source)) {
      for (const key in source) {
        if (ObjectUtils.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          ObjectUtils.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return ObjectUtils.deepMerge(target, ...sources);
  },

  /**
   * Verifica si es un objeto
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  },

  /**
   * Obtiene valor anidado de objeto
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
   * Establece valor anidado en objeto
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return obj;
  },

  /**
   * Filtra objeto por claves
   */
  pick(obj, keys) {
    const result = {};
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  /**
   * Omite claves de objeto
   */
  omit(obj, keys) {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  },

  /**
   * Verifica si objeto está vacío
   */
  isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }
};

// === UTILIDADES DE ARRAYS ===
const ArrayUtils = {
  /**
   * Elimina duplicados de array
   */
  unique(arr, key = null) {
    if (key) {
      const seen = new Set();
      return arr.filter(item => {
        const val = ObjectUtils.getNestedValue(item, key);
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
      });
    }
    return [...new Set(arr)];
  },

  /**
   * Agrupa elementos por una clave
   */
  groupBy(arr, key) {
    return arr.reduce((groups, item) => {
      const group = ObjectUtils.getNestedValue(item, key);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  /**
   * Ordena array por una clave
   */
  sortBy(arr, key, direction = 'asc') {
    return arr.sort((a, b) => {
      const valA = ObjectUtils.getNestedValue(a, key);
      const valB = ObjectUtils.getNestedValue(b, key);
      
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  /**
   * Divide array en chunks
   */
  chunk(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Aplana array multidimensional
   */
  flatten(arr, depth = 1) {
    if (depth <= 0) return arr.slice();
    return arr.reduce((acc, val) => {
      if (Array.isArray(val)) {
        return acc.concat(ArrayUtils.flatten(val, depth - 1));
      }
      return acc.concat(val);
    }, []);
  },

  /**
   * Encuentra índice de elemento por predicado
   */
  findIndex(arr, predicate) {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i], i, arr)) {
        return i;
      }
    }
    return -1;
  },

  /**
   * Mezcla array aleatoriamente
   */
  shuffle(arr) {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  },

  /**
   * Obtiene elemento aleatorio
   */
  random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /**
   * Suma valores de una propiedad
   */
  sumBy(arr, key) {
    return arr.reduce((sum, item) => {
      return sum + (ObjectUtils.getNestedValue(item, key) || 0);
    }, 0);
  }
};

// === UTILIDADES DE FECHA Y TIEMPO ===
const DateUtils = {
  /**
   * Formatea fecha a formato legible
   */
  format(date, format = 'DD/MM/YYYY') {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  /**
   * Obtiene tiempo relativo (hace X tiempo)
   */
  getRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `hace ${years} año${years > 1 ? 's' : ''}`;
    if (months > 0) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'hace unos segundos';
  },

  /**
   * Verifica si una fecha es válida
   */
  isValid(date) {
    return date instanceof Date && !isNaN(date);
  },

  /**
   * Agrega tiempo a una fecha
   */
  add(date, amount, unit) {
    const d = new Date(date);
    switch (unit) {
      case 'seconds':
        d.setSeconds(d.getSeconds() + amount);
        break;
      case 'minutes':
        d.setMinutes(d.getMinutes() + amount);
        break;
      case 'hours':
        d.setHours(d.getHours() + amount);
        break;
      case 'days':
        d.setDate(d.getDate() + amount);
        break;
      case 'months':
        d.setMonth(d.getMonth() + amount);
        break;
      case 'years':
        d.setFullYear(d.getFullYear() + amount);
        break;
    }
    return d;
  },

  /**
   * Diferencia entre dos fechas
   */
  diff(date1, date2, unit = 'days') {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = Math.abs(d2 - d1);

    switch (unit) {
      case 'seconds':
        return Math.floor(diff / 1000);
      case 'minutes':
        return Math.floor(diff / (1000 * 60));
      case 'hours':
        return Math.floor(diff / (1000 * 60 * 60));
      case 'days':
        return Math.floor(diff / (1000 * 60 * 60 * 24));
      case 'months':
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
      case 'years':
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
      default:
        return diff;
    }
  }
};

// === UTILIDADES DE ALMACENAMIENTO ===
const StorageUtils = {
  /**
   * Guarda en localStorage con expiración opcional
   */
  setItem(key, value, expiresIn = null) {
    const data = {
      value: value,
      timestamp: Date.now(),
      expires: expiresIn ? Date.now() + expiresIn : null
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      return false;
    }
  },

  /**
   * Obtiene de localStorage verificando expiración
   */
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const data = JSON.parse(item);
      
      // Verificar expiración
      if (data.expires && Date.now() > data.expires) {
        localStorage.removeItem(key);
        return null;
      }

      return data.value;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return null;
    }
  },

  /**
   * Elimina item de localStorage
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Error removing from localStorage:', e);
      return false;
    }
  },

  /**
   * Limpia items expirados
   */
  clearExpired() {
    const keys = Object.keys(localStorage);
    let cleared = 0;

    keys.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const data = JSON.parse(item);
          if (data.expires && Date.now() > data.expires) {
            localStorage.removeItem(key);
            cleared++;
          }
        }
      } catch (e) {
        // Item no válido, eliminar
        localStorage.removeItem(key);
        cleared++;
      }
    });

    return cleared;
  },

  /**
   * Obtiene tamaño usado en localStorage
   */
  getSize() {
    let size = 0;
    const keys = Object.keys(localStorage);

    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        size += item.length + key.length;
      }
    });

    return size;
  }
};

// === UTILIDADES DE FUNCIONES ===
const FunctionUtils = {
  /**
   * Debounce - retrasa ejecución hasta que pase un tiempo sin llamadas
   */
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func.apply(this, args);
    };
  },

  /**
   * Throttle - limita ejecución a intervalos regulares
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Ejecuta función una sola vez
   */
  once(func) {
    let called = false;
    let result;
    
    return function(...args) {
      if (!called) {
        called = true;
        result = func.apply(this, args);
      }
      return result;
    };
  },

  /**
   * Memoriza resultados de función
   */
  memoize(func) {
    const cache = new Map();
    
    return function(...args) {
      const key = JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func.apply(this, args);
      cache.set(key, result);
      return result;
    };
  },

  /**
   * Currying de funciones
   */
  curry(func) {
    return function curried(...args) {
      if (args.length >= func.length) {
        return func.apply(this, args);
      } else {
        return function(...args2) {
          return curried.apply(this, args.concat(args2));
        };
      }
    };
  },

  /**
   * Composición de funciones
   */
  compose(...funcs) {
    return funcs.reduce((a, b) => (...args) => a(b(...args)));
  },

  /**
   * Pipe de funciones (orden inverso a compose)
   */
  pipe(...funcs) {
    return funcs.reduce((a, b) => (...args) => b(a(...args)));
  }
};

// === UTILIDADES DE NÚMEROS ===
const NumberUtils = {
  /**
   * Redondea a decimales específicos
   */
  round(num, decimals = 2) {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  /**
   * Genera número aleatorio entre min y max
   */
  random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Clamp - limita número entre min y max
   */
  clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Verifica si es número
   */
  isNumber(value) {
    return !isNaN(value) && isFinite(value);
  },

  /**
   * Formatea número con separadores de miles
   */
  formatThousands(num, separator = ',') {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  },

  /**
   * Convierte a porcentaje
   */
  toPercent(num, total, decimals = 0) {
    return NumberUtils.round((num / total) * 100, decimals);
  },

  /**
   * Mapea número de un rango a otro
   */
  map(num, inMin, inMax, outMin, outMax) {
    return ((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }
};

// === UTILIDADES DE VALIDACIÓN ===
const ValidationUtils = {
  /**
   * Valida campo requerido
   */
  required(value) {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  },

  /**
   * Valida longitud mínima
   */
  minLength(value, min) {
    return value && value.length >= min;
  },

  /**
   * Valida longitud máxima
   */
  maxLength(value, max) {
    return !value || value.length <= max;
  },

  /**
   * Valida rango de números
   */
  range(value, min, max) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * Valida patrón regex
   */
  pattern(value, regex) {
    return regex.test(value);
  },

  /**
   * Valida múltiples reglas
   */
  validate(value, rules) {
    const errors = [];

    Object.entries(rules).forEach(([rule, param]) => {
      switch (rule) {
        case 'required':
          if (param && !ValidationUtils.required(value)) {
            errors.push('Campo requerido');
          }
          break;
        case 'email':
          if (param && !StringUtils.isValidEmail(value)) {
            errors.push('Email inválido');
          }
          break;
        case 'minLength':
          if (!ValidationUtils.minLength(value, param)) {
            errors.push(`Mínimo ${param} caracteres`);
          }
          break;
        case 'maxLength':
          if (!ValidationUtils.maxLength(value, param)) {
            errors.push(`Máximo ${param} caracteres`);
          }
          break;
        case 'pattern':
          if (!ValidationUtils.pattern(value, param)) {
            errors.push('Formato inválido');
          }
          break;
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
};

// === UTILIDADES DE COLOR ===
const ColorUtils = {
  /**
   * Convierte HEX a RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  /**
   * Convierte RGB a HEX
   */
  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  /**
   * Obtiene luminosidad de color
   */
  getLuminance(hex) {
    const rgb = ColorUtils.hexToRgb(hex);
    if (!rgb) return 0;
    
    const { r, g, b } = rgb;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance;
  },

  /**
   * Determina si usar texto claro u oscuro sobre color
   */
  getContrastColor(hex) {
    return ColorUtils.getLuminance(hex) > 0.5 ? '#000000' : '#ffffff';
  },

  /**
   * Genera color aleatorio
   */
  random() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
};

// === EXPORTAR UTILIDADES ===
window.DOMUtils = DOMUtils;
window.StringUtils = StringUtils;
window.ObjectUtils = ObjectUtils;
window.ArrayUtils = ArrayUtils;
window.DateUtils = DateUtils;
window.StorageUtils = StorageUtils;
window.FunctionUtils = FunctionUtils;
window.NumberUtils = NumberUtils;
window.ValidationUtils = ValidationUtils;
window.ColorUtils = ColorUtils;

// Alias comunes
window.$ = DOMUtils.$;
window.$$ = DOMUtils.$$;