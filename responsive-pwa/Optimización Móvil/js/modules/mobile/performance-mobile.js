// Optimización de rendimiento móvil
class MobilePerformance {
  constructor() {
    this.isLowEndDevice = this.detectLowEndDevice();
    this.networkType = this.getNetworkType();
    this.observers = new Map();
    this.lazyLoadElements = new Set();
    
    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.setupPerformanceMonitoring();
    this.optimizeForDevice();
    this.setupNetworkAdaptation();
  }

  detectLowEndDevice() {
    // Detectar dispositivos de gama baja basado en hardware
    const memory = navigator.deviceMemory || 4; // GB
    const cores = navigator.hardwareConcurrency || 4;
    const connection = navigator.connection;
    
    let score = 0;
    
    // Memoria RAM
    if (memory <= 2) score += 3;
    else if (memory <= 4) score += 1;
    
    // Núcleos de CPU
    if (cores <= 2) score += 2;
    else if (cores <= 4) score += 1;
    
    // Tipo de conexión
    if (connection) {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        score += 3;
      } else if (connection.effectiveType === '3g') {
        score += 1;
      }
    }
    
    return score >= 3;
  }

  getNetworkType() {
    const connection = navigator.connection;
    if (!connection) return 'unknown';
    
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    
    // Observer para lazy loading
    this.lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadLazyElement(entry.target);
          this.lazyObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });

    // Observer para animaciones
    this.animationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, {
      threshold: 0.2
    });
  }

  setupPerformanceMonitoring() {
    // Monitorear FPS
    this.monitorFPS();
    
    // Monitorear uso de memoria
    if ('memory' in performance) {
      this.monitorMemory();
    }
    
    // Monitorear long tasks
    if ('PerformanceObserver' in window) {
      this.monitorLongTasks();
    }
  }

  monitorFPS() {
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60;
    
    const measureFPS = (currentTime) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        // Ajustar calidad si FPS es bajo
        if (fps < 30) {
          this.reducePerfomanceQuality();
        } else if (fps > 50) {
          this.restorePerformanceQuality();
        }
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  monitorMemory() {
    setInterval(() => {
      const memory = performance.memory;
      const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (usedPercent > 80) {
        this.triggerMemoryCleanup();
      }
    }, 5000);
  }

  monitorLongTasks() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) {
          console.warn('Long task detected:', entry.duration, 'ms');
          this.optimizeForSlowDevice();
        }
      });
    });
    
    observer.observe({ entryTypes: ['longtask'] });
  }

  optimizeForDevice() {
    if (this.isLowEndDevice) {
      document.body.classList.add('low-end-device');
      this.applyLowEndOptimizations();
    }
    
    if (this.networkType.saveData) {
      document.body.classList.add('save-data');
      this.applySaveDataOptimizations();
    }
  }

  applyLowEndOptimizations() {
    // Reducir animaciones
    document.documentElement.style.setProperty('--animation-duration', '0.1s');
    
    // Desactivar efectos complejos
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .low-end-device * {
        transform: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
      }
      
      .low-end-device .gradient {
        background: #2563eb !important;
      }
      
      .low-end-device .blur {
        backdrop-filter: none !important;
        background: rgba(255, 255, 255, 0.9) !important;
      }
    `;
    document.head.appendChild(styleSheet);
  }

  applySaveDataOptimizations() {
    // Precargar menos contenido
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      img.dataset.priority = 'low';
    });
    
    // Reducir calidad de imágenes
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .save-data img {
        image-rendering: optimizeSpeed;
      }
    `;
    document.head.appendChild(styleSheet);
  }

  setupNetworkAdaptation() {
    if (!navigator.connection) return;
    
    navigator.connection.addEventListener('change', () => {
      this.networkType = this.getNetworkType();
      this.adaptToNetwork();
    });
  }

  adaptToNetwork() {
    const { effectiveType, downlink } = this.networkType;
    
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      this.enableUltraLowBandwidthMode();
    } else if (effectiveType === '3g' || downlink < 1.5) {
      this.enableLowBandwidthMode();
    } else {
      this.enableNormalMode();
    }
  }

  enableUltraLowBandwidthMode() {
    document.body.classList.add('ultra-low-bandwidth');
    
    // Desactivar imágenes no críticas
    const images = document.querySelectorAll('img:not(.critical)');
    images.forEach(img => {
      if (!img.dataset.originalSrc) {
        img.dataset.originalSrc = img.src;
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAxMCAxMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjRjNGNEY2Ii8+Cjwvc3ZnPgo=';
      }
    });
  }

  enableLowBandwidthMode() {
    document.body.classList.add('low-bandwidth');
    
    // Reducir calidad de imágenes
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !img.dataset.optimized) {
        const url = new URL(img.src);
        url.searchParams.set('quality', '60');
        url.searchParams.set('format', 'webp');
        img.src = url.toString();
        img.dataset.optimized = 'true';
      }
    });
  }

  enableNormalMode() {
    document.body.classList.remove('ultra-low-bandwidth', 'low-bandwidth');
    
    // Restaurar imágenes originales
    const images = document.querySelectorAll('img[data-original-src]');
    images.forEach(img => {
      img.src = img.dataset.originalSrc;
      delete img.dataset.originalSrc;
    });
  }

  // Lazy loading mejorado
  enableLazyLoading(selector = '[data-lazy]') {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(element => {
      this.lazyLoadElements.add(element);
      this.lazyObserver.observe(element);
    });
  }

  loadLazyElement(element) {
    if (element.dataset.src) {
      element.src = element.dataset.src;
      element.removeAttribute('data-src');
    }
    
    if (element.dataset.bgSrc) {
      element.style.backgroundImage = `url(${element.dataset.bgSrc})`;
      element.removeAttribute('data-bg-src');
    }
    
    element.classList.add('lazy-loaded');
    this.lazyLoadElements.delete(element);
  }

  // Optimización de imágenes
  optimizeImages() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      // Añadir loading="lazy" si no existe
      if (!img.hasAttribute('loading')) {
        img.loading = 'lazy';
      }
      
      // Optimizar tamaño basado en viewport
      if (!img.hasAttribute('sizes')) {
        img.sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
      }
    });
  }

  // Reducir calidad en rendimiento bajo
  reducePerfomanceQuality() {
    document.body.classList.add('reduced-quality');
    
    // Pausar animaciones no críticas
    const animations = document.querySelectorAll('.animation:not(.critical)');
    animations.forEach(el => {
      el.style.animationPlayState = 'paused';
    });
  }

  restorePerformanceQuality() {
    document.body.classList.remove('reduced-quality');
    
    // Reanudar animaciones
    const animations = document.querySelectorAll('.animation');
    animations.forEach(el => {
      el.style.animationPlayState = 'running';
    });
  }

  // Limpieza de memoria
  triggerMemoryCleanup() {
    // Limpiar elementos DOM no visibles
    const hiddenElements = document.querySelectorAll('[hidden], .hidden');
    hiddenElements.forEach(el => {
      if (el.dataset.keepInDom !== 'true') {
        el.remove();
      }
    });
    
    // Limpiar event listeners huérfanos
    this.cleanupEventListeners();
    
    // Forzar garbage collection si está disponible
    if (window.gc) {
      window.gc();
    }
  }

  cleanupEventListeners() {
    // Remover listeners de elementos que ya no están en el DOM
    this.observers.forEach((observer, element) => {
      if (!document.contains(element)) {
        observer.disconnect();
        this.observers.delete(element);
      }
    });
  }

  optimizeForSlowDevice() {
    // Implementar optimizaciones adicionales para dispositivos lentos
    this.reducePerfomanceQuality();
    this.applyLowEndOptimizations();
  }

  // Métodos públicos
  getPerformanceInfo() {
    return {
      isLowEndDevice: this.isLowEndDevice,
      networkType: this.networkType,
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    };
  }

  forceOptimization() {
    this.applyLowEndOptimizations();
    this.enableLowBandwidthMode();
    this.triggerMemoryCleanup();
  }
}

// Gestor de batería
class BatteryOptimization {
  constructor() {
    this.batteryLevel = 1;
    this.isCharging = true;
    this.init();
  }

  async init() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        this.batteryLevel = battery.level;
        this.isCharging = battery.charging;
        
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
          this.adaptToBatteryLevel();
        });
        
        battery.addEventListener('chargingchange', () => {
          this.isCharging = battery.charging;
          this.adaptToBatteryLevel();
        });
        
        this.adaptToBatteryLevel();
      } catch (error) {
        console.warn('Battery API no disponible:', error);
      }
    }
  }

  adaptToBatteryLevel() {
    if (this.batteryLevel < 0.2 && !this.isCharging) {
      this.enablePowerSavingMode();
    } else if (this.batteryLevel < 0.5 && !this.isCharging) {
      this.enableModeratePowerSaving();
    } else {
      this.disablePowerSaving();
    }
  }

  enablePowerSavingMode() {
    document.body.classList.add('power-saving');
    
    // Reducir frecuencia de actualizaciones
    this.reduceUpdateFrequency();
    
    // Pausar animaciones no críticas
    const animations = document.querySelectorAll('.animation:not(.critical)');
    animations.forEach(el => el.style.animationPlayState = 'paused');
  }

  enableModeratePowerSaving() {
    document.body.classList.add('moderate-power-saving');
    
    // Reducir efectos visuales
    const effects = document.querySelectorAll('.effect:not(.critical)');
    effects.forEach(el => el.style.display = 'none');
  }

  disablePowerSaving() {
    document.body.classList.remove('power-saving', 'moderate-power-saving');
    
    // Restaurar animaciones
    const animations = document.querySelectorAll('.animation');
    animations.forEach(el => el.style.animationPlayState = 'running');
    
    // Restaurar efectos
    const effects = document.querySelectorAll('.effect');
    effects.forEach(el => el.style.display = '');
  }

  reduceUpdateFrequency() {
    // Implementar lógica para reducir actualizaciones automáticas
    window.dispatchEvent(new CustomEvent('reduce-updates'));
  }
}

// Instancias globales
const mobilePerformance = new MobilePerformance();
const batteryOptimization = new BatteryOptimization();

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
  mobilePerformance.optimizeImages();
  mobilePerformance.enableLazyLoading();
});

export { mobilePerformance, batteryOptimization, MobilePerformance, BatteryOptimization };
export default mobilePerformance;