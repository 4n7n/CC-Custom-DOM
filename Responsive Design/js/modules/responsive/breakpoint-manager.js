// Gestor de breakpoints responsivos
class BreakpointManager {
  constructor() {
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1280,
      ultrawide: 1920
    };
    
    this.currentBreakpoint = null;
    this.listeners = new Map();
    this.mediaQueries = new Map();
    
    this.init();
  }

  init() {
    this.setupMediaQueries();
    this.detectInitialBreakpoint();
    this.setupResizeListener();
  }

  setupMediaQueries() {
    // Crear media queries para cada breakpoint
    Object.entries(this.breakpoints).forEach(([name, width]) => {
      let query;
      
      switch(name) {
        case 'mobile':
          query = `(max-width: ${width - 1}px)`;
          break;
        case 'tablet':
          query = `(min-width: ${this.breakpoints.mobile}px) and (max-width: ${width - 1}px)`;
          break;
        case 'desktop':
          query = `(min-width: ${this.breakpoints.tablet}px) and (max-width: ${width - 1}px)`;
          break;
        case 'ultrawide':
          query = `(min-width: ${this.breakpoints.desktop}px)`;
          break;
      }
      
      const mediaQuery = window.matchMedia(query);
      this.mediaQueries.set(name, mediaQuery);
      
      // Listener para cambios
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.handleBreakpointChange(name);
        }
      });
    });
  }

  detectInitialBreakpoint() {
    const width = window.innerWidth;
    
    if (width < this.breakpoints.mobile) {
      this.currentBreakpoint = 'mobile';
    } else if (width < this.breakpoints.tablet) {
      this.currentBreakpoint = 'tablet';
    } else if (width < this.breakpoints.desktop) {
      this.currentBreakpoint = 'desktop';
    } else {
      this.currentBreakpoint = 'ultrawide';
    }
    
    this.updateBodyClass();
  }

  setupResizeListener() {
    let resizeTimer;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.detectInitialBreakpoint();
      }, 150);
    });
  }

  handleBreakpointChange(newBreakpoint) {
    const oldBreakpoint = this.currentBreakpoint;
    this.currentBreakpoint = newBreakpoint;
    
    this.updateBodyClass();
    this.notifyListeners(newBreakpoint, oldBreakpoint);
  }

  updateBodyClass() {
    document.body.classList.remove(
      'bp-mobile', 'bp-tablet', 'bp-desktop', 'bp-ultrawide'
    );
    document.body.classList.add(`bp-${this.currentBreakpoint}`);
  }

  notifyListeners(newBreakpoint, oldBreakpoint) {
    this.listeners.forEach((callback, id) => {
      try {
        callback({
          current: newBreakpoint,
          previous: oldBreakpoint,
          width: window.innerWidth,
          height: window.innerHeight
        });
      } catch (error) {
        console.warn(`Error en listener de breakpoint ${id}:`, error);
      }
    });
  }

  // Registrar listener para cambios de breakpoint
  onBreakpointChange(callback, id = null) {
    const listenerId = id || `listener_${Date.now()}_${Math.random()}`;
    this.listeners.set(listenerId, callback);
    
    // Ejecutar inmediatamente con el breakpoint actual
    callback({
      current: this.currentBreakpoint,
      previous: null,
      width: window.innerWidth,
      height: window.innerHeight
    });
    
    return listenerId;
  }

  // Remover listener
  removeListener(id) {
    return this.listeners.delete(id);
  }

  // Obtener breakpoint actual
  getCurrentBreakpoint() {
    return this.currentBreakpoint;
  }

  // Verificar si está en un breakpoint específico
  is(breakpoint) {
    return this.currentBreakpoint === breakpoint;
  }

  // Verificar si está en móvil
  isMobile() {
    return this.currentBreakpoint === 'mobile';
  }

  // Verificar si está en tablet
  isTablet() {
    return this.currentBreakpoint === 'tablet';
  }

  // Verificar si está en desktop
  isDesktop() {
    return this.currentBreakpoint === 'desktop';
  }

  // Verificar si está en ultrawide
  isUltrawide() {
    return this.currentBreakpoint === 'ultrawide';
  }

  // Verificar si está en dispositivo táctil
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // Obtener dimensiones de viewport
  getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  // Obtener información del dispositivo
  getDeviceInfo() {
    return {
      breakpoint: this.currentBreakpoint,
      viewport: this.getViewportSize(),
      isTouch: this.isTouchDevice(),
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  // Ejecutar callback específico para breakpoint
  executeForBreakpoint(breakpoint, callback) {
    if (this.currentBreakpoint === breakpoint) {
      callback(this.getDeviceInfo());
    }
  }

  // Ejecutar callback para múltiples breakpoints
  executeForBreakpoints(breakpoints, callback) {
    if (breakpoints.includes(this.currentBreakpoint)) {
      callback(this.getDeviceInfo());
    }
  }
}

// Gestor de orientación
class OrientationManager {
  constructor() {
    this.currentOrientation = this.getOrientation();
    this.listeners = new Map();
    
    this.init();
  }

  init() {
    this.setupOrientationListener();
  }

  getOrientation() {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  setupOrientationListener() {
    let orientationTimer;
    
    window.addEventListener('resize', () => {
      clearTimeout(orientationTimer);
      orientationTimer = setTimeout(() => {
        const newOrientation = this.getOrientation();
        
        if (newOrientation !== this.currentOrientation) {
          const oldOrientation = this.currentOrientation;
          this.currentOrientation = newOrientation;
          this.notifyListeners(newOrientation, oldOrientation);
        }
      }, 150);
    });

    // Listener nativo para dispositivos móviles
    if (screen.orientation) {
      screen.orientation.addEventListener('change', () => {
        setTimeout(() => {
          const newOrientation = this.getOrientation();
          if (newOrientation !== this.currentOrientation) {
            const oldOrientation = this.currentOrientation;
            this.currentOrientation = newOrientation;
            this.notifyListeners(newOrientation, oldOrientation);
          }
        }, 100);
      });
    }
  }

  notifyListeners(newOrientation, oldOrientation) {
    this.listeners.forEach((callback, id) => {
      try {
        callback({
          current: newOrientation,
          previous: oldOrientation,
          angle: screen.orientation ? screen.orientation.angle : 0
        });
      } catch (error) {
        console.warn(`Error en listener de orientación ${id}:`, error);
      }
    });
  }

  onOrientationChange(callback, id = null) {
    const listenerId = id || `orientation_${Date.now()}_${Math.random()}`;
    this.listeners.set(listenerId, callback);
    
    // Ejecutar inmediatamente
    callback({
      current: this.currentOrientation,
      previous: null,
      angle: screen.orientation ? screen.orientation.angle : 0
    });
    
    return listenerId;
  }

  removeListener(id) {
    return this.listeners.delete(id);
  }

  getCurrentOrientation() {
    return this.currentOrientation;
  }

  isPortrait() {
    return this.currentOrientation === 'portrait';
  }

  isLandscape() {
    return this.currentOrientation === 'landscape';
  }
}

// Instancia global
const breakpointManager = new BreakpointManager();
const orientationManager = new OrientationManager();

// Utilidades adicionales
const ResponsiveUtils = {
  // Obtener configuración CSS para breakpoint
  getCSSConfig(breakpoint) {
    const configs = {
      mobile: {
        padding: '16px',
        gap: '12px',
        borderRadius: '12px',
        fontSize: '14px'
      },
      tablet: {
        padding: '24px',
        gap: '16px',
        borderRadius: '16px',
        fontSize: '16px'
      },
      desktop: {
        padding: '32px',
        gap: '24px',
        borderRadius: '20px',
        fontSize: '16px'
      },
      ultrawide: {
        padding: '40px',
        gap: '32px',
        borderRadius: '24px',
        fontSize: '18px'
      }
    };
    
    return configs[breakpoint] || configs.mobile;
  },

  // Aplicar estilos responsivos a elemento
  applyResponsiveStyles(element, styles) {
    const currentBreakpoint = breakpointManager.getCurrentBreakpoint();
    const config = styles[currentBreakpoint] || {};
    
    Object.entries(config).forEach(([property, value]) => {
      element.style[property] = value;
    });
  },

  // Obtener número de columnas según breakpoint
  getColumnCount(breakpoint = null) {
    const current = breakpoint || breakpointManager.getCurrentBreakpoint();
    const columns = {
      mobile: 1,
      tablet: 2,
      desktop: 3,
      ultrawide: 4
    };
    
    return columns[current] || 1;
  }
};

// Exportar para uso en otros módulos
export { breakpointManager, orientationManager, ResponsiveUtils };
export default BreakpointManager;