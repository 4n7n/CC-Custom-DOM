/* ==================================================
   RAMA 9: Navigation System Module
   Sistema de navegación principal de la aplicación
   ================================================== */

class NavigationSystem {
  constructor(options = {}) {
    this.options = {
      enableHistory: true,
      enableKeyboardNav: true,
      enableMobileMenu: true,
      autoCollapse: true,
      searchEnabled: true,
      ...options
    };
    
    this.currentRoute = null;
    this.navigationHistory = [];
    this.mobileMenuOpen = false;
    this.searchActive = false;
    this.searchResults = [];
    
    this.routes = new Map();
    this.breadcrumbs = [];
    this.shortcuts = new Map();
    
    this.init();
  }
  
  init() {
    console.log('🧭 Inicializando Navigation System...');
    
    this.setupRoutes();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupSearch();
    this.setupMobileMenu();
    this.initializeCurrentRoute();
    
    console.log('✅ Navigation System inicializado');
  }
  
  setupRoutes() {
    // Definir rutas principales de la aplicación
    this.routes.set('home', {
      path: '/',
      title: 'Inicio',
      icon: '🏠',
      component: 'HomeView',
      access: 'public'
    });
    
    this.routes.set('story', {
      path: '/historia',
      title: 'Historia',
      icon: '📖',
      component: 'StoryView',
      access: 'member'
    });
    
    this.routes.set('characters', {
      path: '/personajes',
      title: 'Personajes',
      icon: '👥',
      component: 'CharactersView',
      access: 'member'
    });
    
    this.routes.set('community', {
      path: '/comunidad',
      title: 'Comunidad',
      icon: '🌟',
      component: 'CommunityView',
      access: 'member'
    });
    
    this.routes.set('sponsors', {
      path: '/patrocinadores',
      title: 'Patrocinadores',
      icon: '🤝',
      component: 'SponsorsView',
      access: 'public'
    });
    
    this.routes.set('profile', {
      path: '/perfil',
      title: 'Mi Perfil',
      icon: '👤',
      component: 'ProfileView',
      access: 'member'
    });
    
    console.log('🗺️ Rutas configuradas:', this.routes.size);
  }
  
  setupEventListeners() {
    // Navegación por clics
    document.addEventListener('click', this.handleNavigationClick.bind(this));
    
    // Navegación por historial del navegador
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // Eventos de teclado
    if (this.options.enableKeyboardNav) {
      document.addEventListener('keydown', this.handleKeyboardNav.bind(this));
    }
    
    // Eventos de responsive
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Eventos personalizados
    document.addEventListener('navigate:to', this.handleCustomNavigation.bind(this));
  }
  
  setupKeyboardShortcuts() {
    // Configurar atajos de teclado para navegación rápida
    this.shortcuts.set('ctrl+1', () => this.navigateTo('home'));
    this.shortcuts.set('ctrl+2', () => this.navigateTo('story'));
    this.shortcuts.set('ctrl+3', () => this.navigateTo('characters'));
    this.shortcuts.set('ctrl+4', () => this.navigateTo('community'));
    this.shortcuts.set('ctrl+/', () => this.toggleSearch());
    this.shortcuts.set('escape', () => this.handleEscape());
    this.shortcuts.set('alt+left', () => this.goBack());
    this.shortcuts.set('alt+right', () => this.goForward());
  }
  
  setupSearch() {
    const searchInput = document.querySelector('.nav-search-input');
    const searchContainer = document.querySelector('.nav-search');
    
    if (searchInput && this.options.searchEnabled) {
      // Evento de búsqueda en tiempo real
      searchInput.addEventListener('input', this.handleSearchInput.bind(this));
      searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
      searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));
      searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
      
      // Crear contenedor de resultados
      this.createSearchResults();
    }
  }
  
  setupMobileMenu() {
    const mobileToggle = document.querySelector('.nav-mobile-toggle');
    const mobileMenu = document.querySelector('.nav-mobile-menu');
    
    if (mobileToggle && this.options.enableMobileMenu) {
      mobileToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
      
      // Cerrar menú al hacer clic en un enlace
      if (mobileMenu) {
        mobileMenu.addEventListener('click', (e) => {
          if (e.target.classList.contains('nav-item')) {
            this.closeMobileMenu();
          }
        });
      }
      
      // Cerrar menú al hacer clic fuera
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-mobile-toggle') && 
            !e.target.closest('.nav-mobile-menu')) {
          this.closeMobileMenu();
        }
      });
    }
  }
  
  handleNavigationClick(event) {
    const navItem = event.target.closest('.nav-item');
    if (!navItem) return;
    
    event.preventDefault();
    
    const route = navItem.dataset.route;
    const href = navItem.getAttribute('href');
    
    if (route) {
      this.navigateTo(route);
    } else if (href && href.startsWith('/')) {
      this.navigateToPath(href);
    }
  }
  
  handlePopState(event) {
    if (event.state && event.state.route) {
      this.navigateTo(event.state.route, { pushState: false });
    } else {
      this.initializeCurrentRoute();
    }
  }
  
  handleKeyboardNav(event) {
    const key = this.getKeyCombo(event);
    
    if (this.shortcuts.has(key)) {
      event.preventDefault();
      this.shortcuts.get(key)();
      return;
    }
    
    // Navegación con Tab entre elementos de navegación
    if (event.key === 'Tab') {
      this.handleTabNavigation(event);
    }
    
    // Navegación con flechas en el menú
    if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
      this.handleArrowNavigation(event);
    }
  }
  
  handleCustomNavigation(event) {
    const { route, params } = event.detail;
    this.navigateTo(route, params);
  }
  
  handleResize() {
    // Cerrar menú móvil si la pantalla se hace más grande
    if (window.innerWidth >= 768 && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
    
    // Ajustar elementos de navegación según el tamaño
    this.adjustNavigationLayout();
  }
  
  // Métodos de navegación principales
  navigateTo(routeId, options = {}) {
    const route = this.routes.get(routeId);
    if (!route) {
      console.warn(`⚠️ Ruta no encontrada: ${routeId}`);
      return false;
    }
    
    // Verificar acceso
    if (!this.hasAccess(route.access)) {
      this.handleAccessDenied(route);
      return false;
    }
    
    // Actualizar historial si está habilitado
    if (this.options.enableHistory && options.pushState !== false) {
      this.updateHistory(route, routeId);
    }
    
    // Actualizar navegación actual
    this.updateCurrentNavigation(routeId, route);
    
    // Cargar componente
    this.loadRouteComponent(route);
    
    // Actualizar breadcrumbs
    this.updateBreadcrumbs(route);
    
    // Cerrar menú móvil si está abierto
    this.closeMobileMenu();
    
    // Emit evento de navegación
    this.emit('navigation:change', { route: routeId, path: route.path });
    
    console.log(`🧭 Navegando a: ${route.title} (${route.path})`);
    return true;
  }
  
  navigateToPath(path) {
    // Encontrar ruta por path
    for (const [routeId, route] of this.routes) {
      if (route.path === path) {
        return this.navigateTo(routeId);
      }
    }
    
    console.warn(`⚠️ Path no encontrado: ${path}`);
    return false;
  }
  
  goBack() {
    if (this.navigationHistory.length > 1) {
      // Remover la ruta actual del historial
      this.navigationHistory.pop();
      
      // Obtener la ruta anterior
      const previousRoute = this.navigationHistory[this.navigationHistory.length - 1];
      
      // Navegar sin agregar al historial
      this.navigateTo(previousRoute, { pushState: false });
    } else {
      // Si no hay historial, ir a home
      this.navigateTo('home');
    }
  }
  
  goForward() {
    window.history.forward();
  }
  
  refresh() {
    if (this.currentRoute) {
      this.navigateTo(this.currentRoute, { pushState: false });
    }
  }
  
  // Métodos de búsqueda
  handleSearchInput(event) {
    const query = event.target.value.trim();
    
    if (query.length > 0) {
      this.performSearch(query);
      this.showSearchResults();
    } else {
      this.hideSearchResults();
    }
  }
  
  handleSearchFocus() {
    this.searchActive = true;
    document.body.classList.add('search-active');
  }
  
  handleSearchBlur() {
    // Delay para permitir clicks en resultados
    setTimeout(() => {
      this.searchActive = false;
      document.body.classList.remove('search-active');
      this.hideSearchResults();
    }, 200);
  }
  
  handleSearchKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.executeTopSearchResult();
    } else if (event.key === 'Escape') {
      this.clearSearch();
    }
  }
  
  performSearch(query) {
    this.searchResults = [];
    
    // Buscar en rutas
    for (const [routeId, route] of this.routes) {
      if (route.title.toLowerCase().includes(query.toLowerCase())) {
        this.searchResults.push({
          type: 'route',
          id: routeId,
          title: route.title,
          subtitle: 'Sección',
          icon: route.icon,
          action: () => this.navigateTo(routeId)
        });
      }
    }
    
    // Buscar contenido específico (simulado)
    this.searchContentItems(query);
    
    // Limitar resultados
    this.searchResults = this.searchResults.slice(0, 8);
  }
  
  searchContentItems(query) {
    // Simular búsqueda en contenido
    const contentItems = [
      { type: 'character', title: 'Protagonista', subtitle: 'Personaje principal' },
      { type: 'chapter', title: 'Capítulo 1', subtitle: 'El comienzo' },
      { type: 'community', title: 'Discusión general', subtitle: 'Foro de la comunidad' }
    ];
    
    contentItems.forEach(item => {
      if (item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase())) {
        this.searchResults.push({
          ...item,
          action: () => this.handleContentItemClick(item)
        });
      }
    });
  }
  
  // Métodos de menú móvil
  toggleMobileMenu() {
    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }
  
  openMobileMenu() {
    const mobileMenu = document.querySelector('.nav-mobile-menu');
    const toggle = document.querySelector('.nav-mobile-toggle');
    
    if (mobileMenu) {
      mobileMenu.classList.add('active');
      this.mobileMenuOpen = true;
      document.body.classList.add('mobile-menu-open');
      
      // Animar icono del toggle
      if (toggle) {
        toggle.classList.add('active');
      }
    }
  }
  
  closeMobileMenu() {
    const mobileMenu = document.querySelector('.nav-mobile-menu');
    const toggle = document.querySelector('.nav-mobile-toggle');
    
    if (mobileMenu) {
      mobileMenu.classList.remove('active');
      this.mobileMenuOpen = false;
      document.body.classList.remove('mobile-menu-open');
      
      // Restaurar icono del toggle
      if (toggle) {
        toggle.classList.remove('active');
      }
    }
  }
  
  // Métodos de utilidad
  updateCurrentNavigation(routeId, route) {
    // Actualizar clase activa en navegación
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.route === routeId) {
        item.classList.add('active');
      }
    });
    
    // Actualizar título de la página
    document.title = `${route.title} - RAMA 9`;
    
    // Actualizar ruta actual
    this.currentRoute = routeId;
  }
  
  updateHistory(route, routeId) {
    const state = { route: routeId, timestamp: Date.now() };
    
    if (window.history.pushState) {
      window.history.pushState(state, route.title, route.path);
    }
    
    // Actualizar historial interno
    this.navigationHistory.push(routeId);
    
    // Limitar historial a 50 entradas
    if (this.navigationHistory.length > 50) {
      this.navigationHistory = this.navigationHistory.slice(-50);
    }
  }
  
  hasAccess(accessLevel) {
    // Simular verificación de acceso
    // En una implementación real, esto verificaría permisos del usuario
    if (accessLevel === 'public') return true;
    if (accessLevel === 'member') return true; // Simular usuario logueado
    return false;
  }
  
  getKeyCombo(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }
  
  initializeCurrentRoute() {
    const currentPath = window.location.pathname;
    
    // Encontrar ruta que coincida con el path actual
    for (const [routeId, route] of this.routes) {
      if (route.path === currentPath) {
        this.navigateTo(routeId, { pushState: false });
        return;
      }
    }
    
    // Si no se encuentra, ir a home
    this.navigateTo('home', { pushState: false });
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // Métodos de limpieza
  destroy() {
    // Remover event listeners
    document.removeEventListener('click', this.handleNavigationClick);
    window.removeEventListener('popstate', this.handlePopState);
    document.removeEventListener('keydown', this.handleKeyboardNav);
    window.removeEventListener('resize', this.handleResize);
    
    // Limpiar referencias
    this.routes.clear();
    this.shortcuts.clear();
    this.searchResults = [];
    this.navigationHistory = [];
    
    console.log('🧹 Navigation System destruido');
  }
}

// Exportar para uso global
window.NavigationSystem = NavigationSystem;

export default NavigationSystem;