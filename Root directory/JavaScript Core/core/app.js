/**
 * Community Stories Platform - Application Main
 * Punto de entrada y coordinación principal de la aplicación
 */

class CommunityStoriesApp {
  constructor() {
    this.state = APP_STATES.INITIALIZING;
    this.modules = new Map();
    this.startTime = Date.now();
    this.readyPromise = null;
    this.subscriptions = [];
    this.router = null;
    this.currentRoute = null;
    
    // Bind methods
    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    this.handleOnline = this.handleOnline.bind(this);
  }

  /**
   * Inicializa la aplicación
   */
  async init() {
    try {
      console.log('🚀 Initializing Community Stories Platform...');
      
      // Verificar dependencias críticas
      this.checkDependencies();
      
      // Configurar manejo de errores globales
      this.setupGlobalErrorHandling();
      
      // Configurar eventos del navegador
      this.setupBrowserEvents();
      
      // Inicializar configuración
      await this.initializeConfig();
      
      // Inicializar módulos principales
      await this.initializeModules();
      
      // Configurar routing
      await this.initializeRouter();
      
      // Configurar PWA
      await this.initializePWA();
      
      // Configurar analytics
      await this.initializeAnalytics();
      
      // Configurar accesibilidad
      this.initializeAccessibility();
      
      // Cargar datos iniciales
      await this.loadInitialData();
      
      // Configurar UI inicial
      await this.setupInitialUI();
      
      // Finalizar inicialización
      this.finishInitialization();
      
    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  /**
   * Verifica dependencias críticas
   */
  checkDependencies() {
    const requiredGlobals = [
      'ConfigManager',
      'eventBus', 
      'errorHandler',
      'communityManager',
      'storyLoader'
    ];

    const missingDependencies = requiredGlobals.filter(dep => !window[dep]);
    
    if (missingDependencies.length > 0) {
      throw new Error(`Missing critical dependencies: ${missingDependencies.join(', ')}`);
    }

    console.log('✅ All dependencies verified');
  }

  /**
   * Configura manejo de errores globales
   */
  setupGlobalErrorHandling() {
    // El error handler ya está configurado, solo agregamos logging específico de la app
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleError);
    
    console.log('✅ Global error handling configured');
  }

  /**
   * Configura eventos del navegador
   */
  setupBrowserEvents() {
    // Eventos de conectividad
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Eventos de visibilidad
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Eventos de resize
    window.addEventListener('resize', PerformanceUtils.throttle(
      this.handleResize.bind(this),
      TIMEOUTS.THROTTLE_SCROLL
    ));
    
    // Eventos de scroll global
    window.addEventListener('scroll', PerformanceUtils.throttle(
      this.handleScroll.bind(this),
      TIMEOUTS.THROTTLE_SCROLL
    ), { passive: true });

    // Prevenir zoom en inputs en iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.addEventListener('touchstart', this.preventIOSZoom);
    }
    
    console.log('✅ Browser events configured');
  }

  /**
   * Inicializa configuración
   */
  async initializeConfig() {
    try {
      // La configuración ya se inicializó en config.js
      const config = ConfigManager.getConfig();
      
      // Aplicar configuración de UI
      this.applyUIConfig(config.ui);
      
      console.log('✅ Configuration initialized');
    } catch (error) {
      console.error('❌ Configuration initialization failed:', error);
      throw error;
    }
  }

  /**
   * Aplica configuración de UI
   */
  applyUIConfig(uiConfig) {
    // Aplicar tema
    document.documentElement.setAttribute('data-theme', uiConfig.theme);
    
    // Aplicar idioma
    document.documentElement.setAttribute('lang', uiConfig.language);
    
    // Aplicar dirección de texto
    const language = LANGUAGES[uiConfig.language.toUpperCase()];
    if (language && language.rtl) {
      document.documentElement.setAttribute('dir', 'rtl');
    }
    
    // Configurar animaciones
    if (!uiConfig.animations.enabled) {
      document.documentElement.classList.add('reduce-motion');
    }
  }

  /**
   * Inicializa módulos principales
   */
  async initializeModules() {
    const modules = [
      { name: 'communityManager', instance: window.communityManager },
      { name: 'storyLoader', instance: window.storyLoader },
      { name: 'errorHandler', instance: window.errorHandler },
      { name: 'eventBus', instance: window.eventBus }
    ];

    for (const module of modules) {
      try {
        this.modules.set(module.name, module.instance);
        console.log(`✅ Module loaded: ${module.name}`);
      } catch (error) {
        console.error(`❌ Failed to load module: ${module.name}`, error);
        throw error;
      }
    }

    // Suscribirse a eventos críticos
    this.subscriptions.push(
      eventBus.on(EVENTS.APP_ERROR, this.handleAppError.bind(this)),
      eventBus.on(EVENTS.NETWORK_OFFLINE, this.handleNetworkOffline.bind(this)),
      eventBus.on(EVENTS.NETWORK_ONLINE, this.handleNetworkOnline.bind(this))
    );

    console.log('✅ All modules initialized');
  }

  /**
   * Inicializa sistema de routing
   */
  async initializeRouter() {
    this.router = new SimpleRouter();
    
    // Definir rutas
    this.router.addRoute('/', this.handleHomeRoute.bind(this));
    this.router.addRoute('/stories', this.handleStoriesRoute.bind(this));
    this.router.addRoute('/stories/:slug', this.handleStoryRoute.bind(this));
    this.router.addRoute('/communities', this.handleCommunitiesRoute.bind(this));
    this.router.addRoute('/communities/:slug', this.handleCommunityRoute.bind(this));
    this.router.addRoute('/sponsors', this.handleSponsorsRoute.bind(this));
    this.router.addRoute('/about', this.handleAboutRoute.bind(this));
    
    // Inicializar router
    this.router.init();
    
    console.log('✅ Router initialized');
  }

  /**
   * Inicializa PWA
   */
  async initializePWA() {
    if (!ConfigManager.get('pwa.enabled')) {
      console.log('⏭️ PWA disabled, skipping initialization');
      return;
    }

    try {
      // Registrar Service Worker
      if ('serviceWorker' in navigator) {
        const swPath = ConfigManager.get('pwa.serviceWorker', '/service-worker.js');
        await PWAUtils.registerServiceWorker(swPath);
        
        // Configurar actualizaciones
        this.setupPWAUpdates();
      }

      // Configurar prompt de instalación
      this.setupInstallPrompt();
      
      // Configurar notificaciones push si están habilitadas
      if (ConfigManager.get('pwa.notifications.enabled')) {
        await this.setupPushNotifications();
      }

      console.log('✅ PWA initialized');
    } catch (error) {
      console.warn('⚠️ PWA initialization failed:', error);
    }
  }

  /**
   * Configura actualizaciones de PWA
   */
  setupPWAUpdates() {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Verificar actualizaciones periódicamente
    setInterval(() => {
      navigator.serviceWorker.register('/service-worker.js');
    }, ConfigManager.get('pwa.updateCheck', 60000));
  }

  /**
   * Configura prompt de instalación
   */
  setupInstallPrompt() {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Mostrar botón de instalación después de un delay
      setTimeout(() => {
        this.showInstallPrompt(deferredPrompt);
      }, ConfigManager.get('pwa.installPrompt.delay', 30000));
    });
  }

  /**
   * Muestra prompt de instalación
   */
  showInstallPrompt(deferredPrompt) {
    // Verificar si el usuario ya descartó el prompt
    const dismissCount = StorageUtils.getItem('install-prompt-dismissed', 0);
    const maxDismissals = ConfigManager.get('pwa.installPrompt.dismissCount', 3);
    
    if (dismissCount >= maxDismissals) {
      return;
    }

    // Crear UI del prompt
    const promptEl = this.createInstallPromptUI();
    document.body.appendChild(promptEl);

    // Manejar acciones
    promptEl.querySelector('.install-accept').addEventListener('click', async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        AnalyticsUtils.trackEvent(PWA_CONFIG.INSTALL_SUCCESS);
      }
      
      document.body.removeChild(promptEl);
    });

    promptEl.querySelector('.install-dismiss').addEventListener('click', () => {
      StorageUtils.setItem('install-prompt-dismissed', dismissCount + 1);
      document.body.removeChild(promptEl);
    });
  }

  /**
   * Crea UI del prompt de instalación
   */
  createInstallPromptUI() {
    return DOMUtils.createElement('div', {
      className: 'install-prompt',
      innerHTML: `
        <div class="install-prompt__content">
          <div class="install-prompt__icon">📱</div>
          <h3 class="install-prompt__title">Instalar Community Stories</h3>
          <p class="install-prompt__description">
            Accede más rápido y úsala sin conexión
          </p>
          <div class="install-prompt__actions">
            <button class="install-accept btn-primary">Instalar</button>
            <button class="install-dismiss btn-secondary">Ahora no</button>
          </div>
        </div>
      `
    });
  }

  /**
   * Configura notificaciones push
   */
  async setupPushNotifications() {
    try {
      const hasPermission = await PWAUtils.requestNotificationPermission();
      
      if (hasPermission) {
        const vapidKey = ConfigManager.get('pwa.notifications.vapidKey');
        if (vapidKey) {
          await PWAUtils.subscribeToPush(vapidKey);
        }
      }
    } catch (error) {
      console.warn('⚠️ Push notifications setup failed:', error);
    }
  }

  /**
   * Inicializa analytics
   */
  async initializeAnalytics() {
    if (!ConfigManager.get('analytics.enabled')) {
      console.log('⏭️ Analytics disabled, skipping initialization');
      return;
    }

    try {
      // Rastrear visita inicial
      AnalyticsUtils.trackPageView();
      
      // Configurar tracking automático de eventos
      this.setupAnalyticsTracking();

      console.log('✅ Analytics initialized');
    } catch (error) {
      console.warn('⚠️ Analytics initialization failed:', error);
    }
  }

  /**
   * Configura tracking automático
   */
  setupAnalyticsTracking() {
    // Track clicks en elementos importantes
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-track]');
      if (target) {
        const eventName = target.dataset.track;
        const eventData = JSON.parse(target.dataset.trackData || '{}');
        AnalyticsUtils.trackEvent(eventName, eventData);
      }
    });

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', PerformanceUtils.throttle(() => {
      const scrollDepth = AnalyticsUtils.getScrollDepth();
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        
        // Rastrear hitos de scroll
        if (scrollDepth >= 25 && scrollDepth < 50) {
          AnalyticsUtils.trackEvent('scroll_depth_25');
        } else if (scrollDepth >= 50 && scrollDepth < 75) {
          AnalyticsUtils.trackEvent('scroll_depth_50');
        } else if (scrollDepth >= 75 && scrollDepth < 90) {
          AnalyticsUtils.trackEvent('scroll_depth_75');
        } else if (scrollDepth >= 90) {
          AnalyticsUtils.trackEvent('scroll_depth_90');
        }
      }
    }, 1000));
  }

  /**
   * Inicializa accesibilidad
   */
  initializeAccessibility() {
    // Ya se inicializó en utils.js, pero agregamos configuración específica de la app
    
    // Configurar anuncios de página
    this.setupPageAnnouncements();
    
    // Configurar navegación por teclado mejorada
    this.setupKeyboardNavigation();
    
    console.log('✅ Accessibility features initialized');
  }

  /**
   * Configura anuncios de página
   */
  setupPageAnnouncements() {
    // Anunciar cambios de página
    eventBus.on(EVENTS.NAV_CHANGE, (eventData) => {
      const { route } = eventData.data;
      AccessibilityUtils.announce(`Navegando a ${route.title}`, 'polite');
    });

    // Anunciar errores importantes
    eventBus.on(EVENTS.APP_ERROR, (eventData) => {
      const { error } = eventData.data;
      if (error.severity === 'error') {
        AccessibilityUtils.announce('Ha ocurrido un error', 'assertive');
      }
    });
  }

  /**
   * Configura navegación por teclado
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Escape para cerrar modales y overlays
      if (e.key === 'Escape') {
        const openModal = DOMUtils.$('.modal[aria-hidden="false"]');
        if (openModal) {
          this.closeModal(openModal);
        }
      }
      
      // Atajos de teclado globales
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k': // Ctrl/Cmd + K para búsqueda
            e.preventDefault();
            this.openSearch();
            break;
          case 'h': // Ctrl/Cmd + H para home
            e.preventDefault();
            this.navigateTo('/');
            break;
        }
      }
    });
  }

  /**
   * Carga datos iniciales
   */
  async loadInitialData() {
    try {
      const loadPromises = [];

      // Cargar comunidades destacadas
      loadPromises.push(
        communityManager.getFeaturedCommunities(6).catch(error => {
          console.warn('Failed to load featured communities:', error);
          return [];
        })
      );

      // Cargar configuración dinámica
      loadPromises.push(
        this.loadDynamicConfig().catch(error => {
          console.warn('Failed to load dynamic config:', error);
          return {};
        })
      );

      // Detectar ubicación si está permitido
      if (navigator.permissions) {
        loadPromises.push(
          navigator.permissions.query({ name: 'geolocation' }).then(result => {
            if (result.state === 'granted') {
              return GeolocationUtils.getCurrentPosition().catch(() => null);
            }
            return null;
          })
        );
      }

      const [featuredCommunities, dynamicConfig, userLocation] = await Promise.all(loadPromises);

      // Almacenar datos globalmente
      this.initialData = {
        featuredCommunities,
        dynamicConfig,
        userLocation
      };

      console.log('✅ Initial data loaded');
    } catch (error) {
      console.warn('⚠️ Some initial data failed to load:', error);
    }
  }

  /**
   * Carga configuración dinámica
   */
  async loadDynamicConfig() {
    try {
      const response = await NetworkUtils.fetchWithRetry('/api/config');
      return await response.json();
    } catch (error) {
      return {};
    }
  }

  /**
   * Configura UI inicial
   */
  async setupInitialUI() {
    // Ocultar loader inicial
    const appLoader = DOMUtils.$('#app-loader');
    if (appLoader) {
      await DOMUtils.toggleVisibility(appLoader, false);
    }

    // Mostrar contenido principal
    const mainContent = DOMUtils.$('#main-content');
    if (mainContent) {
      await DOMUtils.toggleVisibility(mainContent, true);
    }

    // Configurar navegación
    this.setupNavigation();

    // Configurar componentes interactivos
    this.setupInteractiveComponents();

    // Configurar lazy loading de imágenes
    PerformanceUtils.lazyLoadImages('img[data-src]');

    console.log('✅ Initial UI setup complete');
  }

  /**
   * Configura navegación
   */
  setupNavigation() {
    // Manejar clicks en enlaces internos
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="/"]');
      if (link && !link.target) {
        e.preventDefault();
        this.navigateTo(link.getAttribute('href'));
      }
    });

    // Configurar navegación móvil
    const navToggle = DOMUtils.$('.nav-toggle');
    const navMenu = DOMUtils.$('.nav-menu');
    
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', !isExpanded);
        navMenu.classList.toggle('nav-menu--open');
      });
    }
  }

  /**
   * Configura componentes interactivos
   */
  setupInteractiveComponents() {
    // Configurar dropdowns
    DOMUtils.$$('[data-dropdown-trigger]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = trigger.dataset.dropdownTarget;
        const dropdown = DOMUtils.$(`#${targetId}`);
        if (dropdown) {
          this.toggleDropdown(dropdown);
        }
      });
    });

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', () => {
      DOMUtils.$$('.dropdown--open').forEach(dropdown => {
        this.closeDropdown(dropdown);
      });
    });

    // Configurar modales
    DOMUtils.$$('[data-modal-trigger]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = trigger.dataset.modalTarget;
        const modal = DOMUtils.$(`#${targetId}`);
        if (modal) {
          this.openModal(modal);
        }
      });
    });

    // Configurar búsqueda
    this.setupSearch();
  }

  /**
   * Configura búsqueda
   */
  setupSearch() {
    const searchInput = DOMUtils.$('.search-input');
    const searchResults = DOMUtils.$('.search-results');
    
    if (!searchInput || !searchResults) return;

    const debouncedSearch = PerformanceUtils.debounce(async (query) => {
      if (query.length < LIMITS.SEARCH_QUERY_MIN) {
        searchResults.innerHTML = '';
        return;
      }

      try {
        const results = await communityManager.searchCommunities(query, { limit: 5 });
        this.renderSearchResults(results, searchResults);
      } catch (error) {
        console.error('Search failed:', error);
      }
    }, TIMEOUTS.DEBOUNCE_SEARCH);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });

    searchInput.addEventListener('focus', () => {
      searchResults.classList.add('search-results--visible');
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        searchResults.classList.remove('search-results--visible');
      }, 200);
    });
  }

  /**
   * Renderiza resultados de búsqueda
   */
  renderSearchResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<div class="search-no-results">No se encontraron resultados</div>';
      return;
    }

    const resultsHTML = results.map(community => `
      <a href="/communities/${community.slug}" class="search-result">
        <div class="search-result__image">
          <img src="${community.image || '/assets/images/placeholder.png'}" alt="${community.name}">
        </div>
        <div class="search-result__content">
          <h4 class="search-result__title">${community.name}</h4>
          <p class="search-result__description">${StringUtils.truncate(community.description, 100)}</p>
          <span class="search-result__category">${community.category?.name || ''}</span>
        </div>
      </a>
    `).join('');

    container.innerHTML = resultsHTML;
  }

  /**
   * Finaliza inicialización
   */
  finishInitialization() {
    this.state = APP_STATES.READY;
    const initTime = Date.now() - this.startTime;

    // Emitir evento de app lista
    eventBus.emit(EVENTS.APP_READY, {
      initTime,
      modules: Array.from(this.modules.keys()),
      features: this.getEnabledFeatures()
    });

    // Rastrear tiempo de inicialización
    if (window.AnalyticsUtils) {
      AnalyticsUtils.trackEvent('app_init_complete', {
        initTime,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      });
    }

    console.log(`🎉 Community Stories Platform ready in ${initTime}ms`);
    
    // Resolver promise de ready
    if (this.readyPromise) {
      this.readyPromise.resolve();
    }
  }

  /**
   * Obtiene características habilitadas
   */
  getEnabledFeatures() {
    const features = ConfigManager.get('features', {});
    return Object.entries(features)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);
  }

  /**
   * Maneja errores de inicialización
   */
  handleInitializationError(error) {
    this.state = APP_STATES.ERROR;
    
    console.error('💥 App initialization failed:', error);
    
    // Mostrar error al usuario
    this.showCriticalError(error);
    
    // Emitir evento de error
    eventBus.emit(EVENTS.APP_ERROR, {
      type: 'initialization',
      error: error.message,
      stack: error.stack
    });

    // Rastrear error crítico
    if (window.AnalyticsUtils) {
      AnalyticsUtils.trackEvent(ANALYTICS_EVENTS.CRASH, {
        error: error.message,
        phase: 'initialization'
      });
    }
  }

  /**
   * Muestra error crítico al usuario
   */
  showCriticalError(error) {
    const errorContainer = DOMUtils.$('#error-boundary') || document.body;
    
    const errorEl = DOMUtils.createElement('div', {
      className: 'critical-error',
      innerHTML: `
        <div class="critical-error__content">
          <h2>Error de Inicialización</h2>
          <p>Ha ocurrido un error al cargar la aplicación.</p>
          <details>
            <summary>Detalles técnicos</summary>
            <pre>${error.message}\n${error.stack}</pre>
          </details>
          <button onclick="location.reload()" class="btn-primary">
            Recargar Página
          </button>
        </div>
      `
    });

    errorContainer.appendChild(errorEl);
  }

  // === MÉTODOS DE ROUTING ===

  /**
   * Navega a una ruta
   */
  navigateTo(path, pushState = true) {
    if (this.router) {
      this.router.navigate(path, pushState);
    }
  }

  /**
   * Maneja ruta home
   */
  async handleHomeRoute(params) {
    this.setCurrentRoute('home', 'Community Stories Platform');
    
    // Cargar datos específicos de home si es necesario
    if (this.initialData?.featuredCommunities) {
      this.renderFeaturedCommunities(this.initialData.featuredCommunities);
    }
  }

  /**
   * Maneja ruta de historias
   */
  async handleStoriesRoute(params) {
    this.setCurrentRoute('stories', 'Historias');
    
    try {
      const stories = await communityManager.loadCommunities({
        includeStories: true,
        limit: 20
      });
      
      this.renderStoriesGrid(stories);
    } catch (error) {
      this.handleRouteError(error, 'stories');
    }
  }

  /**
   * Maneja ruta de historia específica
   */
  async handleStoryRoute(params) {
    const { slug } = params;
    
    try {
      // Resolver slug a ID si es necesario
      const storyId = await this.resolveStorySlug(slug);
      const story = await storyLoader.setActiveStory(storyId);
      
      this.setCurrentRoute('story', story.title);
      this.renderStoryView(story);
      
    } catch (error) {
      this.handleRouteError(error, 'story');
    }
  }

  /**
   * Maneja ruta de comunidades
   */
  async handleCommunitiesRoute(params) {
    this.setCurrentRoute('communities', 'Comunidades');
    
    try {
      const communities = await communityManager.loadCommunities({ limit: 20 });
      this.renderCommunitiesGrid(communities);
    } catch (error) {
      this.handleRouteError(error, 'communities');
    }
  }

  /**
   * Maneja ruta de comunidad específica
   */
  async handleCommunityRoute(params) {
    const { slug } = params;
    
    try {
      const communityId = await this.resolveCommunitySlug(slug);
      const community = await communityManager.selectCommunity(communityId);
      
      this.setCurrentRoute('community', community.name);
      this.renderCommunityView(community);
      
    } catch (error) {
      this.handleRouteError(error, 'community');
    }
  }

  /**
   * Maneja ruta de sponsors
   */
  async handleSponsorsRoute(params) {
    this.setCurrentRoute('sponsors', 'Patrocinadores');
    this.renderSponsorsPage();
  }

  /**
   * Maneja ruta about
   */
  async handleAboutRoute(params) {
    this.setCurrentRoute('about', 'Acerca de');
    this.renderAboutPage();
  }

  /**
   * Establece ruta actual
   */
  setCurrentRoute(routeName, pageTitle) {
    this.currentRoute = routeName;
    
    // Actualizar título de página
    if (window.AccessibilityUtils) {
      AccessibilityUtils.setPageTitle(pageTitle);
    } else {
      document.title = pageTitle + SEO_DEFAULTS.TITLE_SUFFIX;
    }
    
    // Emitir evento de cambio de ruta
    eventBus.emit(EVENTS.NAV_CHANGE, {
      route: { name: routeName, title: pageTitle },
      timestamp: Date.now()
    });
    
    // Rastrear page view
    if (window.AnalyticsUtils) {
      AnalyticsUtils.trackPageView(window.location.pathname);
    }
  }

  /**
   * Maneja errores de ruta
   */
  handleRouteError(error, routeName) {
    console.error(`Route error in ${routeName}:`, error);
    
    eventBus.emit(EVENTS.APP_ERROR, {
      type: 'route_error',
      route: routeName,
      error: error.message
    });
    
    // Mostrar página de error 404 o error genérico
    this.renderErrorPage(error, routeName);
  }

  // === MÉTODOS DE RENDERIZADO ===

  /**
   * Renderiza comunidades destacadas
   */
  renderFeaturedCommunities(communities) {
    const container = DOMUtils.$('#featured-communities');
    if (!container || communities.length === 0) return;
    
    const html = communities.map(community => `
      <article class="community-card" data-community-id="${community.id}">
        <div class="community-card__media">
          <img src="${community.image || '/assets/images/placeholder.png'}" 
               alt="${community.name}"
               loading="lazy">
          <div class="community-card__overlay">
            <span class="community-card__category">${community.category?.name || ''}</span>
          </div>
        </div>
        <div class="community-card__content">
          <h3 class="community-card__title">
            <a href="/communities/${community.slug}">${community.name}</a>
          </h3>
          <p class="community-card__description">
            ${StringUtils.truncate(community.description, 120)}
          </p>
          <div class="community-card__stats">
            <span class="stat">
              <span class="stat__number">${community.stats.members}</span>
              <span class="stat__label">miembros</span>
            </span>
            <span class="stat">
              <span class="stat__number">${community.stats.stories}</span>
              <span class="stat__label">historias</span>
            </span>
          </div>
        </div>
      </article>
    `).join('');
    
    container.innerHTML = html;
  }

  /**
   * Renderiza grid de historias
   */
  renderStoriesGrid(communities) {
    const container = DOMUtils.$('#stories-grid');
    if (!container) return;
    
    // Extraer todas las historias de las comunidades
    const allStories = communities.reduce((stories, community) => {
      if (community.stories) {
        community.stories.forEach(story => {
          story.community = {
            id: community.id,
            name: community.name,
            slug: community.slug
          };
          stories.push(story);
        });
      }
      return stories;
    }, []);
    
    if (allStories.length === 0) {
      container.innerHTML = '<div class="empty-state">No hay historias disponibles</div>';
      return;
    }
    
    const html = allStories.map(story => `
      <article class="story-card" data-story-id="${story.id}">
        <div class="story-card__media">
          <img src="${story.image || '/assets/images/story-placeholder.png'}" 
               alt="${story.title}"
               loading="lazy">
          <div class="story-card__duration">
            ${story.readingStats?.estimatedReadingTime || 5} min
          </div>
        </div>
        <div class="story-card__content">
          <div class="story-card__meta">
            <span class="story-card__community">${story.community.name}</span>
            <span class="story-card__date">${DateUtils.formatRelativeTime(story.publishedAt)}</span>
          </div>
          <h3 class="story-card__title">
            <a href="/stories/${story.slug}">${story.title}</a>
          </h3>
          <p class="story-card__description">
            ${StringUtils.truncate(story.description, 150)}
          </p>
        </div>
      </article>
    `).join('');
    
    container.innerHTML = html;
  }

  /**
   * Renderiza vista de historia
   */
  renderStoryView(story) {
    const container = DOMUtils.$('#story-view');
    if (!container) return;
    
    container.innerHTML = `
      <article class="story-view">
        <header class="story-header">
          <div class="story-header__background">
            <img src="${story.media?.images?.[0]?.url || '/assets/images/story-bg.jpg'}" 
                 alt="${story.title}">
          </div>
          <div class="story-header__content">
            <div class="story-meta">
              <span class="story-community">${story.community?.name || ''}</span>
              <span class="story-date">${DateUtils.formatDate(story.publishedAt)}</span>
            </div>
            <h1 class="story-title">${story.title}</h1>
            <p class="story-subtitle">${story.description || ''}</p>
            <div class="story-stats">
              <span class="reading-time">${story.readingStats.estimatedReadingTime} min de lectura</span>
              <span class="difficulty">Nivel: ${story.readingStats.difficulty}</span>
            </div>
          </div>
        </header>
        
        <div class="story-content" id="story-content">
          ${this.renderStoryContent(story.content || [])}
        </div>
        
        ${story.sponsors?.length > 0 ? this.renderStorySponsors(story.sponsors) : ''}
      </article>
    `;
    
    // Configurar elementos interactivos de la historia
    this.setupStoryInteractions(story);
  }

  /**
   * Renderiza contenido de historia
   */
  renderStoryContent(contentBlocks) {
    return contentBlocks.map((block, index) => {
      switch (block.type) {
        case 'paragraph':
          return `<p class="story-paragraph" data-story-section="${index}">${block.content}</p>`;
        case 'quote':
          return `
            <blockquote class="story-quote" data-story-section="${index}">
              <p class="story-quote__text">${block.content}</p>
              ${block.author ? `<cite class="story-quote__author">${block.author}</cite>` : ''}
            </blockquote>
          `;
        case 'image':
          return `
            <figure class="story-media" data-story-section="${index}">
              <img src="${block.url}" alt="${block.alt || ''}" loading="lazy">
              ${block.caption ? `<figcaption>${block.caption}</figcaption>` : ''}
            </figure>
          `;
        case 'video':
          return `
            <figure class="story-media story-media--video" data-story-section="${index}">
              <video controls preload="metadata">
                <source src="${block.url}" type="video/mp4">
                Tu navegador no soporta el elemento video.
              </video>
              ${block.caption ? `<figcaption>${block.caption}</figcaption>` : ''}
            </figure>
          `;
        default:
          return `<div class="story-block" data-story-section="${index}">${block.content}</div>`;
      }
    }).join('');
  }

  /**
   * Renderiza sponsors de historia
   */
  renderStorySponsors(sponsors) {
    const sponsorsByTier = ArrayUtils.groupBy(sponsors, 'tier');
    
    return `
      <section class="story-sponsors">
        <h3 class="story-sponsors__title">Patrocinadores</h3>
        <div class="story-sponsors__grid">
          ${Object.entries(sponsorsByTier).map(([tier, tierSponsors]) => `
            <div class="sponsor-tier sponsor-tier--${tier}">
              <h4 class="sponsor-tier__title">${SPONSOR_TIERS[tier.toUpperCase()]?.name || tier}</h4>
              <div class="sponsor-list">
                ${tierSponsors.map(sponsor => `
                  <div class="sponsor-item">
                    <img src="${sponsor.logo}" alt="${sponsor.name}" class="sponsor-logo">
                    <span class="sponsor-name">${sponsor.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  /**
   * Configura interacciones de historia
   */
  setupStoryInteractions(story) {
    // Configurar observación de progreso
    const storyElements = DOMUtils.$('[data-story-section]');
    storyElements.forEach(element => {
      if (storyLoader.intersectionObserver) {
        storyLoader.intersectionObserver.observe(element);
      }
    });
    
    // Configurar controles de audio si hay narración
    if (story.media?.audio?.length > 0) {
      this.setupAudioNarration(story.media.audio[0]);
    }
    
    // Configurar interacciones personalizadas
    if (story.interactions) {
      this.setupCustomInteractions(story.interactions);
    }
  }

  // === MÉTODOS DE UTILIDAD ===

  /**
   * Resuelve slug de historia a ID
   */
  async resolveStorySlug(slug) {
    // En una implementación real, esto haría una consulta a la API
    // Por ahora, asumimos que el slug es el ID
    return slug;
  }

  /**
   * Resuelve slug de comunidad a ID
   */
  async resolveCommunitySlug(slug) {
    // En una implementación real, esto haría una consulta a la API
    // Por ahora, asumimos que el slug es el ID
    return slug;
  }

  /**
   * Renderiza página de error
   */
  renderErrorPage(error, context) {
    const container = DOMUtils.$('#main-content');
    if (!container) return;
    
    container.innerHTML = `
      <div class="error-page">
        <div class="error-page__content">
          <h1>Oops! Algo salió mal</h1>
          <p>No pudimos cargar el contenido solicitado.</p>
          <div class="error-page__actions">
            <button onclick="history.back()" class="btn-secondary">Volver</button>
            <a href="/" class="btn-primary">Ir al inicio</a>
          </div>
        </div>
      </div>
    `;
  }

  // === MANEJADORES DE EVENTOS ===

  /**
   * Maneja cambios de visibilidad
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Pausar operaciones no críticas
      this.pauseNonCriticalOperations();
    } else {
      // Reanudar operaciones
      this.resumeOperations();
    }
  }

  /**
   * Maneja cambios de tamaño
   */
  handleResize() {
    // Emitir evento de resize
    eventBus.emit(EVENTS.UI_RESIZE, {
      width: window.innerWidth,
      height: window.innerHeight,
      breakpoint: ConstantsHelper.getCurrentBreakpoint()
    });
    
    // Actualizar configuración de UI si es necesario
    this.updateUIForViewport();
  }

  /**
   * Maneja scroll global
   */
  handleScroll() {
    eventBus.emit(EVENTS.UI_SCROLL, {
      scrollY: window.pageYOffset,
      scrollX: window.pageXOffset
    });
  }

  /**
   * Maneja errores de la aplicación
   */
  handleAppError(eventData) {
    const { error } = eventData.data;
    console.error('App error:', error);
    
    // Mostrar notificación de error si es crítico
    if (error.severity === 'error') {
      this.showErrorNotification(error);
    }
  }

  /**
   * Maneja estado offline
   */
  handleOffline() {
    this.state = APP_STATES.OFFLINE;
    this.showOfflineNotification();
  }

  /**
   * Maneja estado online
   */
  handleOnline() {
    this.state = APP_STATES.READY;
    this.hideOfflineNotification();
    
    // Sincronizar datos pendientes
    this.syncOfflineData();
  }

  /**
   * Maneja conexión offline de red
   */
  handleNetworkOffline() {
    console.log('📴 Network went offline');
  }

  /**
   * Maneja conexión online de red
   */
  handleNetworkOnline() {
    console.log('📶 Network back online');
  }

  /**
   * Maneja errores globales
   */
  handleError(event) {
    // Ya manejado por errorHandler, solo logging adicional aquí
    console.warn('Global error caught by app:', event);
  }

  // === MÉTODOS DE NOTIFICACIÓN ===

  /**
   * Muestra notificación de error
   */
  showErrorNotification(error) {
    // Implementar sistema de notificaciones toast
    this.showToast('error', 'Ha ocurrido un error', error.message);
  }

  /**
   * Muestra notificación offline
   */
  showOfflineNotification() {
    this.showToast('warning', 'Sin conexión', 'Estás navegando en modo offline', 0);
  }

  /**
   * Oculta notificación offline
   */
  hideOfflineNotification() {
    this.hideToast('offline-notification');
  }

  /**
   * Muestra toast genérico
   */
  showToast(type, title, message, duration = 5000) {
    const toastId = `toast-${Date.now()}`;
    const toast = DOMUtils.createElement('div', {
      id: toastId,
      className: `toast toast--${type}`,
      innerHTML: `
        <div class="toast__content">
          <strong class="toast__title">${title}</strong>
          <p class="toast__message">${message}</p>
        </div>
        <button class="toast__close" aria-label="Cerrar">&times;</button>
      `
    });

    // Añadir al contenedor de toasts
    let toastContainer = DOMUtils.$('.toast-container');
    if (!toastContainer) {
      toastContainer = DOMUtils.createElement('div', { className: 'toast-container' });
      document.body.appendChild(toastContainer);
    }

    toastContainer.appendChild(toast);

    // Configurar cierre
    toast.querySelector('.toast__close').addEventListener('click', () => {
      this.hideToast(toastId);
    });

    // Auto-ocultar si tiene duración
    if (duration > 0) {
      setTimeout(() => {
        this.hideToast(toastId);
      }, duration);
    }

    return toastId;
  }

  /**
   * Oculta toast
   */
  hideToast(toastId) {
    const toast = DOMUtils.$(`#${toastId}`);
    if (toast) {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }

  // === MÉTODOS DE ESTADO ===

  /**
   * Pausa operaciones no críticas
   */
  pauseNonCriticalOperations() {
    // Pausar preload queue
    storyLoader.preloadQueue.length = 0;
    
    // Pausar actualizaciones automáticas
    clearInterval(this.updateInterval);
  }

  /**
   * Reanuda operaciones
   */
  resumeOperations() {
    // Reanudar actualizaciones si es necesario
    this.startPeriodicUpdates();
  }

  /**
   * Inicia actualizaciones periódicas
   */
  startPeriodicUpdates() {
    this.updateInterval = setInterval(() => {
      // Verificar actualizaciones de datos
      this.checkForUpdates();
    }, 5 * 60 * 1000); // Cada 5 minutos
  }

  /**
   * Verifica actualizaciones
   */
  async checkForUpdates() {
    // Implementar lógica de verificación de actualizaciones
  }

  /**
   * Sincroniza datos offline
   */
  async syncOfflineData() {
    if (window.AnalyticsUtils) {
      await AnalyticsUtils.syncOfflineEvents();
    }
    
    if (communityManager) {
      await communityManager.syncOfflineData();
    }
  }

  /**
   * Actualiza UI para viewport actual
   */
  updateUIForViewport() {
    const breakpoint = ConstantsHelper.getCurrentBreakpoint();
    document.body.dataset.breakpoint = breakpoint;
  }

  // === MÉTODOS DE LIMPIEZA ===

  /**
   * Destruye la aplicación
   */
  destroy() {
    // Desuscribirse de eventos
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];

    // Limpiar intervals
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Destruir módulos
    this.modules.forEach((module, name) => {
      if (module && typeof module.destroy === 'function') {
        module.destroy();
      }
    });

    // Limpiar event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleError);

    console.log('🗑️ App destroyed');
  }

  // === MÉTODOS PÚBLICOS ===

  /**
   * Retorna promise que se resuelve cuando la app está lista
   */
  ready() {
    if (this.state === APP_STATES.READY) {
      return Promise.resolve();
    }

    if (!this.readyPromise) {
      this.readyPromise = {};
      this.readyPromise.promise = new Promise((resolve, reject) => {
        this.readyPromise.resolve = resolve;
        this.readyPromise.reject = reject;
      });
    }

    return this.readyPromise.promise;
  }

  /**
   * Obtiene estado actual de la aplicación
   */
  getState() {
    return {
      state: this.state,
      currentRoute: this.currentRoute,
      modules: Array.from(this.modules.keys()),
      features: this.getEnabledFeatures(),
      performance: {
        initTime: Date.now() - this.startTime,
        memoryUsage: this.getMemoryUsage()
      }
    };
  }

  /**
   * Obtiene uso de memoria (si está disponible)
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  }
}

// Router simple para SPA
class SimpleRouter {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
  }

  addRoute(path, handler) {
    this.routes.set(path, handler);
  }

  init() {
    window.addEventListener('popstate', this.handlePopState.bind(this));
    this.handleRoute(window.location.pathname);
  }

  navigate(path, pushState = true) {
    if (pushState) {
      window.history.pushState({}, '', path);
    }
    this.handleRoute(path);
  }

  handlePopState() {
    this.handleRoute(window.location.pathname);
  }

  handleRoute(path) {
    const route = this.matchRoute(path);
    if (route) {
      this.currentRoute = path;
      route.handler(route.params);
    } else {
      console.warn('No route found for:', path);
    }
  }

  matchRoute(path) {
    for (const [pattern, handler] of this.routes) {
      const params = this.extractParams(pattern, path);
      if (params !== null) {
        return { handler, params };
      }
    }
    return null;
  }

  extractParams(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};
    
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1);
        params[paramName] = pathPart;
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }
}

// Inicialización automática cuando el DOM esté listo
let app = null;

function initializeApp() {
  if (app) return;
  
  app = new CommunityStoriesApp();
  window.app = app;
  
  app.init().catch(error => {
    console.error('Failed to initialize app:', error);
  });
}

// Inicializar cuando esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Exportar al scope global
window.CommunityStoriesApp = CommunityStoriesApp;
window.SimpleRouter = SimpleRouter;

console.log('✅ Community Stories Platform - App Core loaded');