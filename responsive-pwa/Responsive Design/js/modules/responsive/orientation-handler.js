// Gestor avanzado de orientación de dispositivo
class OrientationHandler {
  constructor() {
    this.currentOrientation = this.detectOrientation();
    this.previousOrientation = null;
    this.isLocked = false;
    this.lockSupported = 'orientation' in screen;
    this.listeners = new Map();
    this.orientationChangePending = false;
    
    this.init();
  }

  init() {
    this.setupOrientationListeners();
    this.setupResizeListener();
    this.applyOrientationStyles();
    this.setupScreenOrientationAPI();
  }

  detectOrientation() {
    // Múltiples métodos para detectar orientación
    if (screen.orientation) {
      return screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape';
    }
    
    if (window.orientation !== undefined) {
      return Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait';
    }
    
    // Fallback basado en dimensiones
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  setupOrientationListeners() {
    // API moderna de Screen Orientation
    if (screen.orientation) {
      screen.orientation.addEventListener('change', () => {
        this.handleOrientationChange();
      });
    }

    // Fallback para dispositivos más antiguos
    window.addEventListener('orientationchange', () => {
      this.handleOrientationChange();
    });

    // Backup con resize para asegurar detección
    window.addEventListener('resize', () => {
      this.debounceOrientationCheck();
    });
  }

  setupResizeListener() {
    let resizeTimer;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.checkOrientationFromDimensions();
      }, 150);
    });
  }

  setupScreenOrientationAPI() {
    if (!this.lockSupported) return;

    // Detectar cambios de orientación bloqueados
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        this.handleFullscreenOrientationOptions();
      }
    });
  }

  handleOrientationChange() {
    if (this.orientationChangePending) return;
    
    this.orientationChangePending = true;
    
    // Esperar a que se complete el cambio de orientación
    setTimeout(() => {
      const newOrientation = this.detectOrientation();
      
      if (newOrientation !== this.currentOrientation) {
        this.previousOrientation = this.currentOrientation;
        this.currentOrientation = newOrientation;
        
        this.applyOrientationStyles();
        this.notifyOrientationChange();
        this.handleOrientationSpecificLogic();
      }
      
      this.orientationChangePending = false;
    }, 200);
  }

  debounceOrientationCheck() {
    if (this.orientationChangePending) return;
    
    setTimeout(() => {
      this.checkOrientationFromDimensions();
    }, 100);
  }

  checkOrientationFromDimensions() {
    const dimensionOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    if (dimensionOrientation !== this.currentOrientation) {
      this.previousOrientation = this.currentOrientation;
      this.currentOrientation = dimensionOrientation;
      
      this.applyOrientationStyles();
      this.notifyOrientationChange();
    }
  }

  applyOrientationStyles() {
    document.body.classList.remove('orientation-portrait', 'orientation-landscape');
    document.body.classList.add(`orientation-${this.currentOrientation}`);
    
    // Aplicar estilos específicos por dispositivo
    if (this.isMobileDevice()) {
      this.applyMobileOrientationStyles();
    } else if (this.isTabletDevice()) {
      this.applyTabletOrientationStyles();
    }
  }

  applyMobileOrientationStyles() {
    const viewport = document.querySelector('meta[name="viewport"]');
    
    if (this.currentOrientation === 'landscape') {
      document.body.classList.add('mobile-landscape');
      
      // Ajustar viewport para landscape móvil
      if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover';
      }
      
      // Optimizaciones específicas para landscape móvil
      this.optimizeMobileLandscape();
      
    } else {
      document.body.classList.remove('mobile-landscape');
      
      // Restaurar viewport para portrait
      if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
      }
      
      this.optimizeMobilePortrait();
    }
  }

  applyTabletOrientationStyles() {
    if (this.currentOrientation === 'landscape') {
      document.body.classList.add('tablet-landscape');
      this.optimizeTabletLandscape();
    } else {
      document.body.classList.remove('tablet-landscape');
      this.optimizeTabletPortrait();
    }
  }

  optimizeMobileLandscape() {
    // Reducir altura del header en landscape
    const header = document.querySelector('.mobile-header');
    if (header) {
      header.style.height = '50px';
    }
    
    // Ajustar navegación inferior
    const nav = document.querySelector('.mobile-nav');
    if (nav) {
      nav.style.height = '60px';
    }
    
    // Ocultar elementos no esenciales
    this.hideNonEssentialElements();
    
    // Ajustar contenido para aprovechar anchura
    this.optimizeContentForLandscape();
  }

  optimizeMobilePortrait() {
    // Restaurar alturas originales
    const header = document.querySelector('.mobile-header');
    if (header) {
      header.style.height = '';
    }
    
    const nav = document.querySelector('.mobile-nav');
    if (nav) {
      nav.style.height = '';
    }
    
    // Mostrar elementos ocultos
    this.showHiddenElements();
    
    // Restaurar layout vertical
    this.optimizeContentForPortrait();
  }

  optimizeTabletLandscape() {
    // Reorganizar layout para aprovechar pantalla ancha
    const container = document.querySelector('.dashboard-container');
    if (container) {
      container.style.gridTemplateColumns = '280px 1fr 350px';
    }
    
    // Mostrar más contenido horizontalmente
    this.expandHorizontalContent();
  }

  optimizeTabletPortrait() {
    // Layout más vertical para tablet en portrait
    const container = document.querySelector('.dashboard-container');
    if (container) {
      container.style.gridTemplateColumns = '250px 1fr';
    }
    
    // Reorganizar widgets
    this.stackVerticalContent();
  }

  hideNonEssentialElements() {
    const nonEssential = document.querySelectorAll(
      '.secondary-info, .extra-actions, .decorative-elements'
    );
    
    nonEssential.forEach(element => {
      element.style.display = 'none';
      element.dataset.hiddenInLandscape = 'true';
    });
  }

  showHiddenElements() {
    const hidden = document.querySelectorAll('[data-hidden-in-landscape="true"]');
    
    hidden.forEach(element => {
      element.style.display = '';
      delete element.dataset.hiddenInLandscape;
    });
  }

  optimizeContentForLandscape() {
    // Cambiar a layout horizontal para posts/cards
    const contentGrid = document.querySelector('.community-posts, .content-grid');
    if (contentGrid) {
      contentGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      contentGrid.style.gap = '12px';
    }
    
    // Reducir padding para aprovechar espacio
    const containers = document.querySelectorAll('.container, .main-content');
    containers.forEach(container => {
      container.style.padding = '12px';
    });
  }

  optimizeContentForPortrait() {
    // Restaurar layout vertical
    const contentGrid = document.querySelector('.community-posts, .content-grid');
    if (contentGrid) {
      contentGrid.style.gridTemplateColumns = '';
      contentGrid.style.gap = '';
    }
    
    // Restaurar padding original
    const containers = document.querySelectorAll('.container, .main-content');
    containers.forEach(container => {
      container.style.padding = '';
    });
  }

  expandHorizontalContent() {
    // Mostrar más columnas en grids
    const grids = document.querySelectorAll('.dashboard-widgets, .content-grid');
    grids.forEach(grid => {
      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    });
    
    // Expandir sidebar si está colapsado
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
    }
  }

  stackVerticalContent() {
    // Reducir columnas en portrait tablet
    const grids = document.querySelectorAll('.dashboard-widgets, .content-grid');
    grids.forEach(grid => {
      grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    });
  }

  handleOrientationSpecificLogic() {
    // Lógica específica para diferentes tipos de contenido
    this.handleMediaContent();
    this.handleFormElements();
    this.handleNavigationElements();
    this.handleVirtualKeyboard();
  }

  handleMediaContent() {
    const videos = document.querySelectorAll('video');
    const images = document.querySelectorAll('.media-container img');
    
    if (this.currentOrientation === 'landscape') {
      // Optimizar media para landscape
      videos.forEach(video => {
        video.style.maxHeight = '60vh';
        video.style.width = 'auto';
      });
      
      images.forEach(img => {
        if (img.closest('.media-container')) {
          img.style.maxHeight = '50vh';
          img.style.width = 'auto';
        }
      });
    } else {
      // Restaurar para portrait
      videos.forEach(video => {
        video.style.maxHeight = '';
        video.style.width = '';
      });
      
      images.forEach(img => {
        img.style.maxHeight = '';
        img.style.width = '';
      });
    }
  }

  handleFormElements() {
    const forms = document.querySelectorAll('form');
    
    if (this.currentOrientation === 'landscape' && this.isMobileDevice()) {
      // Optimizar formularios para landscape móvil
      forms.forEach(form => {
        form.classList.add('landscape-form');
        
        // Reorganizar campos en filas
        const formGroups = form.querySelectorAll('.form-group');
        if (formGroups.length > 1) {
          form.style.display = 'grid';
          form.style.gridTemplateColumns = 'repeat(2, 1fr)';
          form.style.gap = '12px';
        }
      });
    } else {
      // Restaurar layout vertical
      forms.forEach(form => {
        form.classList.remove('landscape-form');
        form.style.display = '';
        form.style.gridTemplateColumns = '';
        form.style.gap = '';
      });
    }
  }

  handleNavigationElements() {
    const nav = document.querySelector('.mobile-nav');
    
    if (this.currentOrientation === 'landscape' && this.isMobileDevice()) {
      // Mover navegación al lado en landscape
      if (nav) {
        nav.classList.add('nav-landscape');
        nav.style.flexDirection = 'column';
        nav.style.width = '60px';
        nav.style.height = '100vh';
        nav.style.bottom = 'auto';
        nav.style.left = '0';
        nav.style.top = '0';
      }
    } else {
      // Restaurar navegación inferior
      if (nav) {
        nav.classList.remove('nav-landscape');
        nav.style.flexDirection = '';
        nav.style.width = '';
        nav.style.height = '';
        nav.style.bottom = '';
        nav.style.left = '';
        nav.style.top = '';
      }
    }
  }

  handleVirtualKeyboard() {
    // Manejar teclado virtual en diferentes orientaciones
    if (this.isMobileDevice()) {
      const inputs = document.querySelectorAll('input, textarea');
      
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          if (this.currentOrientation === 'landscape') {
            this.adjustForVirtualKeyboardLandscape(input);
          } else {
            this.adjustForVirtualKeyboardPortrait(input);
          }
        });
      });
    }
  }

  adjustForVirtualKeyboardLandscape(input) {
    // En landscape, el teclado ocupa más espacio relativo
    setTimeout(() => {
      const rect = input.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      if (rect.bottom > viewportHeight * 0.5) {
        input.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 300);
  }

  adjustForVirtualKeyboardPortrait(input) {
    // Comportamiento estándar para portrait
    setTimeout(() => {
      input.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 300);
  }

  notifyOrientationChange() {
    this.listeners.forEach((callback, id) => {
      try {
        callback({
          current: this.currentOrientation,
          previous: this.previousOrientation,
          angle: this.getOrientationAngle(),
          isLandscape: this.isLandscape(),
          isPortrait: this.isPortrait()
        });
      } catch (error) {
        console.warn(`Error en listener de orientación ${id}:`, error);
      }
    });

    // Disparar evento personalizado
    const event = new CustomEvent('orientationChange', {
      detail: {
        current: this.currentOrientation,
        previous: this.previousOrientation,
        angle: this.getOrientationAngle()
      }
    });
    
    window.dispatchEvent(event);
  }

  // Gestión de bloqueo de orientación
  async lockOrientation(orientation) {
    if (!this.lockSupported) {
      console.warn('Screen Orientation Lock no soportado');
      return false;
    }

    try {
      await screen.orientation.lock(orientation);
      this.isLocked = true;
      return true;
    } catch (error) {
      console.warn('No se pudo bloquear la orientación:', error);
      return false;
    }
  }

  async unlockOrientation() {
    if (!this.lockSupported) return false;

    try {
      screen.orientation.unlock();
      this.isLocked = false;
      return true;
    } catch (error) {
      console.warn('No se pudo desbloquear la orientación:', error);
      return false;
    }
  }

  async lockToLandscape() {
    return await this.lockOrientation('landscape');
  }

  async lockToPortrait() {
    return await this.lockOrientation('portrait');
  }

  handleFullscreenOrientationOptions() {
    // Opciones especiales cuando está en pantalla completa
    if (document.fullscreenElement) {
      // Sugerir orientación landscape para videos/media
      const media = document.fullscreenElement;
      if (media.tagName === 'VIDEO' || media.classList.contains('media-content')) {
        this.lockToLandscape();
      }
    } else {
      // Restaurar orientación libre al salir de pantalla completa
      this.unlockOrientation();
    }
  }

  // Métodos de utilidad
  isMobileDevice() {
    return window.innerWidth <= 768;
  }

  isTabletDevice() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }

  isDesktopDevice() {
    return window.innerWidth > 1024;
  }

  isLandscape() {
    return this.currentOrientation === 'landscape';
  }

  isPortrait() {
    return this.currentOrientation === 'portrait';
  }

  getOrientationAngle() {
    if (screen.orientation) {
      return screen.orientation.angle;
    }
    return window.orientation || 0;
  }

  getCurrentOrientation() {
    return this.currentOrientation;
  }

  getPreviousOrientation() {
    return this.previousOrientation;
  }

  isOrientationLocked() {
    return this.isLocked;
  }

  // Gestión de listeners
  onOrientationChange(callback, id = null) {
    const listenerId = id || `orientation_${Date.now()}_${Math.random()}`;
    this.listeners.set(listenerId, callback);
    
    // Ejecutar inmediatamente con la orientación actual
    callback({
      current: this.currentOrientation,
      previous: this.previousOrientation,
      angle: this.getOrientationAngle(),
      isLandscape: this.isLandscape(),
      isPortrait: this.isPortrait()
    });
    
    return listenerId;
  }

  removeOrientationListener(id) {
    return this.listeners.delete(id);
  }

  // Métodos específicos para componentes
  optimizeComponent(component, orientationRules) {
    this.onOrientationChange((orientationInfo) => {
      const rules = orientationRules[orientationInfo.current];
      if (rules && component) {
        Object.assign(component.style, rules);
      }
    });
  }

  // Configuración avanzada
  setOrientationChangeDelay(delay) {
    this.orientationChangeDelay = delay;
  }

  enableOrientationDebugging() {
    this.onOrientationChange((info) => {
      console.log('Cambio de orientación:', info);
    });
    
    // Mostrar indicador visual
    this.showOrientationIndicator();
  }

  showOrientationIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'orientation-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      font-family: monospace;
    `;
    
    document.body.appendChild(indicator);
    
    this.onOrientationChange((info) => {
      indicator.textContent = `${info.current} (${info.angle}°)`;
    });
  }

  // Limpieza
  destroy() {
    this.listeners.clear();
    
    // Remover event listeners
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', this.handleOrientationChange);
    }
    
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    window.removeEventListener('resize', this.debounceOrientationCheck);
    
    // Unlock orientación si está bloqueada
    if (this.isLocked) {
      this.unlockOrientation();
    }
    
    // Limpiar estilos aplicados
    document.body.classList.remove('orientation-portrait', 'orientation-landscape', 'mobile-landscape', 'tablet-landscape');
  }
}

// Instancia global
const orientationHandler = new OrientationHandler();

// CSS adicional para orientación
const orientationStyles = document.createElement('style');
orientationStyles.textContent = `
  /* Estilos base de orientación */
  .orientation-landscape .landscape-hidden {
    display: none !important;
  }
  
  .orientation-portrait .portrait-hidden {
    display: none !important;
  }
  
  /* Optimizaciones móvil landscape */
  .mobile-landscape .mobile-header {
    height: 50px !important;
  }
  
  .mobile-landscape .mobile-nav {
    height: 60px !important;
  }
  
  .mobile-landscape .nav-landscape {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 60px !important;
    height: 100vh !important;
    flex-direction: column !important;
    justify-content: space-around !important;
  }
  
  .mobile-landscape .nav-landscape .mobile-nav-item {
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }
  
  /* Formularios en landscape */
  .landscape-form {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }
  
  .landscape-form .form-group:last-child {
    grid-column: 1 / -1;
  }
  
  /* Tablet landscape optimizations */
  .tablet-landscape .sidebar {
    width: 250px !important;
  }
  
  .tablet-landscape .content-grid {
    grid-template-columns: repeat(3, 1fr) !important;
  }
  
  /* Transiciones suaves */
  .orientation-transition {
    transition: all 0.3s ease !important;
  }
  
  /* Media queries para orientación */
  @media (orientation: landscape) {
    .landscape-only {
      display: block;
    }
    
    .portrait-only {
      display: none;
    }
  }
  
  @media (orientation: portrait) {
    .landscape-only {
      display: none;
    }
    
    .portrait-only {
      display: block;
    }
  }
`;
document.head.appendChild(orientationStyles);

export { orientationHandler, OrientationHandler };
export default orientationHandler;