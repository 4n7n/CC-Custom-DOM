/* ==================================================
   RAMA 9: Layout Controller Module
   Control dinámico del layout y responsive design
   ================================================== */

class LayoutController {
  constructor(options = {}) {
    this.options = {
      enableResponsive: true,
      enableGridSystem: true,
      enableFlexibleSidebar: true,
      enableAdaptiveHeader: true,
      enableAutoLayout: true,
      enableLayoutTransitions: true,
      transitionDuration: 300,
      breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200,
        wide: 1600
      },
      ...options
    };
    
    this.currentBreakpoint = null;
    this.layoutState = {
      sidebarCollapsed: false,
      headerVisible: true,
      fullscreenMode: false,
      currentLayout: 'default',
      isTransitioning: false
    };
    
    this.layouts = new Map();
    this.components = new Map();
    this.resizeObserver = null;
    this.mutationObserver = null;
    this.layoutHistory = [];
    this.layoutUpdateTimeout = null;
    
    this.init();
  }
  
  init() {
    console.log('📐 Inicializando Layout Controller...');
    
    this.setupLayouts();
    this.setupResponsiveSystem();
    this.setupEventListeners();
    this.initializeCurrentLayout();
    this.startLayoutMonitoring();
    
    console.log('✅ Layout Controller inicializado');
  }
  
  setupLayouts() {
    // Layout por defecto
    this.layouts.set('default', {
      id: 'default',
      name: 'Layout Principal',
      structure: {
        header: { height: '4rem', position: 'fixed' },
        sidebar: { width: '16rem', collapsible: true },
        main: { flex: 1, padding: '2rem' },
        footer: { height: '3rem', position: 'relative' }
      },
      responsive: {
        mobile: { sidebar: 'hidden', header: 'compact' },
        tablet: { sidebar: 'collapsed', header: 'normal' },
        desktop: { sidebar: 'expanded', header: 'normal' },
        wide: { sidebar: 'expanded', header: 'normal' }
      }
    });
    
    // Layout de lectura
    this.layouts.set('reading', {
      id: 'reading',
      name: 'Modo Lectura',
      structure: {
        header: { height: '3rem', position: 'fixed' },
        sidebar: { width: '0', hidden: true },
        main: { flex: 1, padding: '1rem', maxWidth: '50rem', margin: '0 auto' },
        footer: { height: '2rem', position: 'relative' }
      },
      responsive: {
        mobile: { main: { padding: '0.5rem' } },
        tablet: { main: { padding: '1rem' } },
        desktop: { main: { padding: '2rem' } },
        wide: { main: { padding: '2rem' } }
      }
    });
    
    // Layout de comunidad
    this.layouts.set('community', {
      id: 'community',
      name: 'Vista Comunidad',
      structure: {
        header: { height: '4rem', position: 'fixed' },
        sidebar: { width: '14rem', collapsible: true },
        main: { flex: 1, padding: '1.5rem' },
        aside: { width: '18rem', position: 'right' },
        footer: { height: '3rem', position: 'relative' }
      },
      responsive: {
        mobile: { sidebar: 'hidden', aside: 'hidden' },
        tablet: { sidebar: 'collapsed', aside: 'hidden' },
        desktop: { sidebar: 'expanded', aside: 'visible' },
        wide: { sidebar: 'expanded', aside: 'visible' }
      }
    });
    
    // Layout fullscreen
    this.layouts.set('fullscreen', {
      id: 'fullscreen',
      name: 'Pantalla Completa',
      structure: {
        header: { height: '0', hidden: true },
        sidebar: { width: '0', hidden: true },
        main: { flex: 1, padding: '0' },
        footer: { height: '0', hidden: true }
      },
      responsive: {
        mobile: {},
        tablet: {},
        desktop: {},
        wide: {}
      }
    });
    
    // Layout minimal
    this.layouts.set('minimal', {
      id: 'minimal',
      name: 'Vista Minimal',
      structure: {
        header: { height: '2.5rem', position: 'fixed' },
        sidebar: { width: '12rem', collapsible: true },
        main: { flex: 1, padding: '1rem' },
        footer: { height: '0', hidden: true }
      },
      responsive: {
        mobile: { sidebar: 'hidden', header: 'compact' },
        tablet: { sidebar: 'collapsed', header: 'compact' },
        desktop: { sidebar: 'collapsed', header: 'normal' },
        wide: { sidebar: 'expanded', header: 'normal' }
      }
    });
  }
  
  setupResponsiveSystem() {
    if (!this.options.enableResponsive) return;
    
    // Detectar breakpoint inicial
    this.updateBreakpoint();
    
    // Setup ResizeObserver para cambios de tamaño
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(document.body);
    }
    
    // Fallback para navegadores sin ResizeObserver
    window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 150));
    
    // Configurar CSS custom properties para breakpoints
    this.setupBreakpointProperties();
  }
  
  setupBreakpointProperties() {
    const root = document.documentElement;
    Object.entries(this.options.breakpoints).forEach(([name, value]) => {
      root.style.setProperty(`--bp-${name}`, `${value}px`);
    });
  }
  
  setupEventListeners() {
    // Eventos de layout
    document.addEventListener('layout:change', this.handleLayoutChange.bind(this));
    document.addEventListener('layout:toggle-sidebar', this.handleToggleSidebar.bind(this));
    document.addEventListener('layout:toggle-fullscreen', this.handleToggleFullscreen.bind(this));
    document.addEventListener('layout:reset', this.handleResetLayout.bind(this));
    
    // Eventos de navegación
    document.addEventListener('navigation:change', this.handleNavigationChange.bind(this));
    
    // Eventos de teclado para shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    
    // Eventos de orientación (mobile)
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    
    // Eventos de elementos específicos
    this.setupComponentEvents();
    
    // Eventos de scroll para header adaptativo
    if (this.options.enableAdaptiveHeader) {
      window.addEventListener('scroll', this.debounce(this.handleScroll.bind(this), 50));
    }
  }
  
  setupComponentEvents() {
    // Sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }
    
    // Header controls
    const headerControls = document.querySelectorAll('.header-control');
    headerControls.forEach(control => {
      control.addEventListener('click', (e) => {
        this.handleHeaderControl(e.target);
      });
    });
    
    // Layout switcher
    const layoutSwitcher = document.querySelector('.layout-switcher');
    if (layoutSwitcher) {
      layoutSwitcher.addEventListener('change', (e) => {
        this.switchLayout(e.target.value);
      });
    }
    
    // Fullscreen toggle
    const fullscreenToggle = document.querySelector('.fullscreen-toggle');
    if (fullscreenToggle) {
      fullscreenToggle.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }
  }
  
  initializeCurrentLayout() {
    // Determinar layout inicial basado en la página actual
    const currentPath = window.location.pathname;
    let initialLayout = 'default';
    
    if (currentPath.includes('/historia') || currentPath.includes('/lectura')) {
      initialLayout = 'reading';
    } else if (currentPath.includes('/comunidad')) {
      initialLayout = 'community';
    } else if (currentPath.includes('/minimal')) {
      initialLayout = 'minimal';
    }
    
    // Verificar preferencias guardadas
    const savedLayout = this.getSavedLayout();
    if (savedLayout && this.layouts.has(savedLayout)) {
      initialLayout = savedLayout;
    }
    
    this.switchLayout(initialLayout);
  }
  
  startLayoutMonitoring() {
    // Monitorear cambios en el DOM que afecten el layout
    if (window.MutationObserver) {
      this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            this.scheduleLayoutUpdate();
          }
        });
      });
      
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }
  }
  
  // Métodos principales de layout
  switchLayout(layoutId, options = {}) {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      console.warn(`⚠️ Layout no encontrado: ${layoutId}`);
      return false;
    }
    
    // Prevenir cambios durante transición
    if (this.layoutState.isTransitioning && !options.force) {
      console.log('⏸️ Cambio de layout bloqueado: transición en progreso');
      return false;
    }
    
    // Guardar layout actual en historial
    if (this.layoutState.currentLayout !== layoutId) {
      this.layoutHistory.push({
        layout: this.layoutState.currentLayout,
        timestamp: Date.now(),
        state: { ...this.layoutState }
      });
      
      // Limitar historial a 10 entradas
      if (this.layoutHistory.length > 10) {
        this.layoutHistory = this.layoutHistory.slice(-10);
      }
    }
    
    // Aplicar nuevo layout
    this.applyLayout(layout, options);
    
    // Actualizar estado
    this.layoutState.currentLayout = layoutId;
    
    // Guardar preferencia
    this.saveLayout(layoutId);
    
    // Emitir evento
    this.emit('layout:switched', { layout: layoutId, options });
    
    console.log(`📐 Layout cambiado a: ${layout.name}`);
    return true;
  }
  
  applyLayout(layout, options = {}) {
    const body = document.body;
    
    // Marcar como en transición
    this.layoutState.isTransitioning = true;
    
    // Remover clases de layout anteriores
    body.classList.remove(...Array.from(body.classList).filter(cls => cls.startsWith('layout-')));
    
    // Agregar clase del nuevo layout
    body.classList.add(`layout-${layout.id}`);
    
    // Aplicar estructura del layout
    this.applyLayoutStructure(layout);
    
    // Aplicar configuración responsive
    this.applyResponsiveLayout(layout);
    
    // Aplicar animaciones si están habilitadas
    if (options.animate !== false && this.options.enableLayoutTransitions) {
      this.animateLayoutTransition().then(() => {
        this.layoutState.isTransitioning = false;
      });
    } else {
      this.layoutState.isTransitioning = false;
    }
  }
  
  applyLayoutStructure(layout) {
    const { structure } = layout;
    
    // Aplicar estilos del header
    if (structure.header) {
      this.applyElementStyles('.main-header', structure.header);
    }
    
    // Aplicar estilos del sidebar
    if (structure.sidebar) {
      this.applyElementStyles('.main-sidebar', structure.sidebar);
    }
    
    // Aplicar estilos del contenido principal
    if (structure.main) {
      this.applyElementStyles('.main-content', structure.main);
    }
    
    // Aplicar estilos del aside
    if (structure.aside) {
      this.applyElementStyles('.main-aside', structure.aside);
    }
    
    // Aplicar estilos del footer
    if (structure.footer) {
      this.applyElementStyles('.main-footer', structure.footer);
    }
  }
  
  applyElementStyles(selector, styles) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    Object.entries(styles).forEach(([property, value]) => {
      if (property === 'hidden') {
        element.style.display = value ? 'none' : '';
      } else if (property === 'collapsible') {
        element.classList.toggle('collapsible', value);
      } else if (property === 'position') {
        element.style.position = value;
      } else {
        const cssProperty = this.camelToKebab(property);
        element.style.setProperty(cssProperty, value);
      }
    });
  }
  
  applyResponsiveLayout(layout) {
    const responsive = layout.responsive[this.currentBreakpoint];
    if (!responsive) return;
    
    Object.entries(responsive).forEach(([component, styles]) => {
      const selector = `.main-${component}`;
      this.applyElementStyles(selector, styles);
    });
  }
  
  // Métodos de responsive design
  updateBreakpoint() {
    const width = window.innerWidth;
    const breakpoints = this.options.breakpoints;
    
    let newBreakpoint;
    if (width < breakpoints.mobile) {
      newBreakpoint = 'mobile';
    } else if (width < breakpoints.tablet) {
      newBreakpoint = 'tablet';
    } else if (width < breakpoints.desktop) {
      newBreakpoint = 'desktop';
    } else {
      newBreakpoint = 'wide';
    }
    
    if (newBreakpoint !== this.currentBreakpoint) {
      const previousBreakpoint = this.currentBreakpoint;
      this.currentBreakpoint = newBreakpoint;
      
      // Actualizar clases CSS
      document.body.classList.remove('bp-mobile', 'bp-tablet', 'bp-desktop', 'bp-wide');
      document.body.classList.add(`bp-${newBreakpoint}`);
      
      // Aplicar layout responsive
      this.handleBreakpointChange(previousBreakpoint, newBreakpoint);
      
      // Emitir evento
      this.emit('layout:breakpoint-change', { 
        from: previousBreakpoint, 
        to: newBreakpoint,
        width 
      });
      
      console.log(`📱 Breakpoint cambiado a: ${newBreakpoint} (${width}px)`);
    }
  }
  
  handleBreakpointChange(from, to) {
    const currentLayout = this.layouts.get(this.layoutState.currentLayout);
    if (currentLayout) {
      this.applyResponsiveLayout(currentLayout);
    }
    
    // Ajustes específicos por breakpoint
    this.adjustComponentsForBreakpoint(to);
  }
  
  adjustComponentsForBreakpoint(breakpoint) {
    switch (breakpoint) {
      case 'mobile':
        this.layoutState.sidebarCollapsed = true;
        this.collapseSidebar();
        this.adjustMobileLayout();
        break;
      case 'tablet':
        this.adjustTabletLayout();
        break;
      case 'desktop':
        this.adjustDesktopLayout();
        break;
      case 'wide':
        this.adjustWideLayout();
        break;
    }
  }
  
  adjustMobileLayout() {
    // Ocultar elementos no esenciales en móvil
    const nonEssential = document.querySelectorAll('.hide-on-mobile');
    nonEssential.forEach(el => el.style.display = 'none');
    
    // Ajustar espaciado
    document.documentElement.style.setProperty('--content-padding', '1rem');
    document.documentElement.style.setProperty('--component-gap', '0.75rem');
    
    // Ajustar tipografía
    document.documentElement.style.setProperty('--font-size-base', '14px');
  }
  
  adjustTabletLayout() {
    // Mostrar elementos ocultos en móvil
    const nonEssential = document.querySelectorAll('.hide-on-mobile');
    nonEssential.forEach(el => el.style.display = '');
    
    // Ajustar espaciado
    document.documentElement.style.setProperty('--content-padding', '1.5rem');
    document.documentElement.style.setProperty('--component-gap', '1rem');
    
    // Ajustar tipografía
    document.documentElement.style.setProperty('--font-size-base', '15px');
  }
  
  adjustDesktopLayout() {
    // Expandir sidebar si estaba colapsado
    if (this.layoutState.sidebarCollapsed && this.currentBreakpoint !== 'mobile') {
      this.expandSidebar();
    }
    
    // Ajustar espaciado
    document.documentElement.style.setProperty('--content-padding', '2rem');
    document.documentElement.style.setProperty('--component-gap', '1.5rem');
    
    // Ajustar tipografía
    document.documentElement.style.setProperty('--font-size-base', '16px');
  }
  
  adjustWideLayout() {
    // Configuración para pantallas anchas
    document.documentElement.style.setProperty('--content-padding', '2.5rem');
    document.documentElement.style.setProperty('--component-gap', '2rem');
    document.documentElement.style.setProperty('--max-content-width', '1200px');
    document.documentElement.style.setProperty('--font-size-base', '16px');
  }
  
  // Métodos de control de sidebar
  toggleSidebar() {
    if (this.layoutState.sidebarCollapsed) {
      this.expandSidebar();
    } else {
      this.collapseSidebar();
    }
  }
  
  collapseSidebar() {
    const sidebar = document.querySelector('.main-sidebar');
    if (!sidebar) return;
    
    this.layoutState.sidebarCollapsed = true;
    
    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
    
    // Animar transición
    if (this.options.enableLayoutTransitions) {
      sidebar.style.transition = `width ${this.options.transitionDuration}ms ease`;
    }
    
    this.emit('layout:sidebar-collapsed');
    console.log('📁 Sidebar colapsado');
  }
  
  expandSidebar() {
    const sidebar = document.querySelector('.main-sidebar');
    if (!sidebar) return;
    
    this.layoutState.sidebarCollapsed = false;
    
    sidebar.classList.remove('collapsed');
    document.body.classList.remove('sidebar-collapsed');
    
    // Animar transición
    if (this.options.enableLayoutTransitions) {
      sidebar.style.transition = `width ${this.options.transitionDuration}ms ease`;
    }
    
    this.emit('layout:sidebar-expanded');
    console.log('📂 Sidebar expandido');
  }
  
  // Métodos de control de fullscreen
  toggleFullscreen() {
    if (this.layoutState.fullscreenMode) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }
  
  enterFullscreen() {
    this.layoutState.fullscreenMode = true;
    
    // Guardar layout actual
    this.savedLayoutBeforeFullscreen = this.layoutState.currentLayout;
    
    // Cambiar a layout fullscreen
    this.switchLayout('fullscreen', { animate: true });
    
    // Ocultar elementos de UI
    document.body.classList.add('fullscreen-mode');
    
    this.emit('layout:fullscreen-entered');
    console.log('🖥️ Modo fullscreen activado');
  }
  
  exitFullscreen() {
    this.layoutState.fullscreenMode = false;
    
    // Restaurar layout anterior
    const previousLayout = this.savedLayoutBeforeFullscreen || 'default';
    this.switchLayout(previousLayout, { animate: true });
    
    // Mostrar elementos de UI
    document.body.classList.remove('fullscreen-mode');
    
    this.emit('layout:fullscreen-exited');
    console.log('🖥️ Modo fullscreen desactivado');
  }
  
  // Métodos de animación
  animateLayoutTransition() {
    return new Promise(resolve => {
      if (!this.options.enableLayoutTransitions) {
        resolve();
        return;
      }
      
      const duration = this.options.transitionDuration;
      
      // Agregar clase de transición
      document.body.classList.add('layout-transitioning');
      
      // Aplicar transiciones CSS
      const transitionElements = document.querySelectorAll('.main-header, .main-sidebar, .main-content, .main-aside, .main-footer');
      transitionElements.forEach(el => {
        el.style.transition = `all ${duration}ms ease`;
      });
      
      // Remover clase después de la transición
      setTimeout(() => {
        document.body.classList.remove('layout-transitioning');
        transitionElements.forEach(el => {
          el.style.transition = '';
        });
        resolve();
      }, duration);
    });
  }
  
  // Manejadores de eventos
  handleLayoutChange(event) {
    const { layoutId, options } = event.detail;
    this.switchLayout(layoutId, options);
  }
  
  handleToggleSidebar() {
    this.toggleSidebar();
  }
  
  handleToggleFullscreen() {
    this.toggleFullscreen();
  }
  
  handleResetLayout() {
    this.switchLayout('default', { animate: true });
  }
  
  handleNavigationChange(event) {
    // Ajustar layout basado en la navegación
    const { path } = event.detail;
    
    if (path.includes('/historia')) {
      this.switchLayout('reading');
    } else if (path.includes('/comunidad')) {
      this.switchLayout('community');
    }
  }
  
  handleKeyboardShortcuts(event) {
    // Shortcuts de teclado para layout
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          this.toggleSidebar();
          break;
        case 'f':
          event.preventDefault();
          this.toggleFullscreen();
          break;
        case '1':
          event.preventDefault();
          this.switchLayout('default');
          break;
        case '2':
          event.preventDefault();
          this.switchLayout('reading');
          break;
        case '3':
          event.preventDefault();
          this.switchLayout('community');
          break;
      }
    }
  }
  
  handleOrientationChange() {
    // Manejar cambios de orientación en dispositivos móviles
    setTimeout(() => {
      this.updateBreakpoint();
      this.scheduleLayoutUpdate();
    }, 100);
  }
  
  handleScroll() {
    if (!this.options.enableAdaptiveHeader) return;
    
    const scrollY = window.scrollY;
    const header = document.querySelector('.main-header');
    
    if (!header) return;
    
    // Auto-hide header en scroll
    if (scrollY > 100) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  
  handleResize() {
    this.updateBreakpoint();
    this.scheduleLayoutUpdate();
  }
  
  handleHeaderControl(control) {
    const action = control.dataset.action;
    
    switch (action) {
      case 'toggle-sidebar':
        this.toggleSidebar();
        break;
      case 'toggle-fullscreen':
        this.toggleFullscreen();
        break;
      case 'switch-layout':
        const layoutId = control.dataset.layout;
        this.switchLayout(layoutId);
        break;
    }
  }
  
  // Métodos de utilidad
  scheduleLayoutUpdate() {
    if (this.layoutUpdateTimeout) {
      clearTimeout(this.layoutUpdateTimeout);
    }
    
    this.layoutUpdateTimeout = setTimeout(() => {
      this.updateLayout();
    }, 50);
  }
  
  updateLayout() {
    const currentLayout = this.layouts.get(this.layoutState.currentLayout);
    if (currentLayout) {
      this.applyResponsiveLayout(currentLayout);
    }
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
  
  camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
  
  // Métodos de persistencia
  saveLayout(layoutId) {
    try {
      localStorage.setItem('rama9-preferred-layout', layoutId);
    } catch (error) {
      console.warn('⚠️ No se pudo guardar la preferencia de layout:', error);
    }
  }
  
  getSavedLayout() {
    try {
      return localStorage.getItem('rama9-preferred-layout');
    } catch (error) {
      console.warn('⚠️ No se pudo cargar la preferencia de layout:', error);
      return null;
    }
  }
  
  // API pública
  getCurrentLayout() {
    return this.layouts.get(this.layoutState.currentLayout);
  }
  
  getLayoutState() {
    return { ...this.layoutState };
  }
  
  getAvailableLayouts() {
    return Array.from(this.layouts.values()).map(layout => ({
      id: layout.id,
      name: layout.name
    }));
  }
  
  addLayout(layoutConfig) {
    if (!layoutConfig.id) {
      console.warn('⚠️ ID de layout requerido');
      return false;
    }
    
    const validatedConfig = this.validateLayoutConfig(layoutConfig);
    if (!validatedConfig) {
      console.warn(`⚠️ Configuración de layout inválida: ${layoutConfig.id}`);
      return false;
    }
    
    this.layouts.set(layoutConfig.id, validatedConfig);
    console.log(`✅ Layout agregado: ${layoutConfig.name}`);
    return true;
  }
  
  removeLayout(layoutId) {
    if (layoutId === 'default') {
      console.warn('⚠️ No se puede eliminar el layout por defecto');
      return false;
    }
    
    if (this.layoutState.currentLayout === layoutId) {
      this.switchLayout('default');
    }
    
    this.layouts.delete(layoutId);
    console.log(`🗑️ Layout eliminado: ${layoutId}`);
    return true;
  }
  
  validateLayoutConfig(config) {
    const required = ['id', 'name', 'structure'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Campos requeridos faltantes: ${missing.join(', ')}`);
      return null;
    }
    
    return {
      responsive: {
        mobile: {},
        tablet: {},
        desktop: {},
        wide: {}
      },
      ...config
    };
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // Métodos de debugging
  debugInfo() {
    return {
      currentBreakpoint: this.currentBreakpoint,
      layoutState: this.layoutState,
      availableLayouts: this.getAvailableLayouts(),
      layoutHistory: this.layoutHistory,
      options: this.options
    };
  }
  
  // Métodos de limpieza
  destroy() {
    console.log('🧹 Destruyendo Layout Controller...');
    
    // Limpiar observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    // Limpiar timers
    if (this.layoutUpdateTimeout) {
      clearTimeout(this.layoutUpdateTimeout);
    }
    
    // Remover event listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    window.removeEventListener('scroll', this.handleScroll);
    
    // Limpiar referencias
    this.layouts.clear();
    this.components.clear();
    this.layoutHistory = [];
    
    console.log('✅ Layout Controller destruido completamente');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.LayoutController = LayoutController;
}

export default LayoutController;