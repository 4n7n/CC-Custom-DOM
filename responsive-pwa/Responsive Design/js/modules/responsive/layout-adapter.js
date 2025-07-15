// Adaptador de layout responsivo
import { breakpointManager, orientationManager } from './breakpoint-manager.js';

class LayoutAdapter {
  constructor() {
    this.currentLayout = null;
    this.layoutConfigs = new Map();
    this.activeComponents = new Set();
    this.transitionDuration = 300;
    
    this.init();
  }

  init() {
    this.setupLayoutConfigs();
    this.setupBreakpointListeners();
    this.detectInitialLayout();
  }

  setupLayoutConfigs() {
    // Configuraciones por breakpoint
    this.layoutConfigs.set('mobile', {
      sidebar: { visible: false, collapsed: true },
      navigation: { type: 'bottom', items: 4 },
      content: { columns: 1, spacing: '12px' },
      header: { height: '60px', simplified: true },
      widgets: { position: 'inline', maxVisible: 2 }
    });

    this.layoutConfigs.set('tablet', {
      sidebar: { visible: true, collapsed: false, width: '280px' },
      navigation: { type: 'sidebar', items: 'all' },
      content: { columns: 2, spacing: '20px' },
      header: { height: '80px', simplified: false },
      widgets: { position: 'sidebar', maxVisible: 4 }
    });

    this.layoutConfigs.set('desktop', {
      sidebar: { visible: true, collapsed: false, width: '320px' },
      navigation: { type: 'sidebar', items: 'all' },
      content: { columns: 3, spacing: '32px' },
      header: { height: '100px', simplified: false },
      widgets: { position: 'dedicated', maxVisible: 6 }
    });

    this.layoutConfigs.set('ultrawide', {
      sidebar: { visible: true, collapsed: false, width: '350px' },
      navigation: { type: 'sidebar', items: 'all' },
      content: { columns: 4, spacing: '40px' },
      header: { height: '120px', simplified: false },
      widgets: { position: 'dedicated', maxVisible: 8 }
    });
  }

  setupBreakpointListeners() {
    breakpointManager.onBreakpointChange((info) => {
      this.adaptToBreakpoint(info.current, info.previous);
    });

    orientationManager.onOrientationChange((info) => {
      this.adaptToOrientation(info.current, info.previous);
    });
  }

  detectInitialLayout() {
    const currentBreakpoint = breakpointManager.getCurrentBreakpoint();
    this.adaptToBreakpoint(currentBreakpoint, null);
  }

  async adaptToBreakpoint(newBreakpoint, oldBreakpoint) {
    if (newBreakpoint === this.currentLayout) return;

    const config = this.layoutConfigs.get(newBreakpoint);
    if (!config) return;

    // Iniciar transición
    this.startLayoutTransition();

    try {
      // Adaptar componentes en paralelo
      await Promise.all([
        this.adaptSidebar(config.sidebar),
        this.adaptNavigation(config.navigation),
        this.adaptContent(config.content),
        this.adaptHeader(config.header),
        this.adaptWidgets(config.widgets)
      ]);

      this.currentLayout = newBreakpoint;
      this.notifyLayoutChange(newBreakpoint, oldBreakpoint);

    } finally {
      this.endLayoutTransition();
    }
  }

  startLayoutTransition() {
    document.body.classList.add('layout-transitioning');
    
    // Desactivar animaciones durante la transición
    const style = document.createElement('style');
    style.id = 'transition-disable';
    style.textContent = `
      * {
        transition: none !important;
        animation: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  endLayoutTransition() {
    setTimeout(() => {
      document.body.classList.remove('layout-transitioning');
      
      // Reactivar animaciones
      const style = document.getElementById('transition-disable');
      if (style) style.remove();
      
      // Triggerar reflow suave
      document.body.offsetHeight;
      
    }, this.transitionDuration);
  }

  async adaptSidebar(config) {
    const sidebar = document.querySelector('.sidebar, .desktop-sidebar, .tablet-sidebar');
    if (!sidebar) return;

    if (!config.visible) {
      sidebar.style.display = 'none';
      this.createMobileMenu();
    } else {
      sidebar.style.display = 'block';
      sidebar.style.width = config.width || 'auto';
      
      if (config.collapsed) {
        sidebar.classList.add('collapsed');
      } else {
        sidebar.classList.remove('collapsed');
      }
      
      this.removeMobileMenu();
    }
  }

  createMobileMenu() {
    if (document.querySelector('.mobile-menu-toggle')) return;

    const toggle = document.createElement('button');
    toggle.className = 'mobile-menu-toggle';
    toggle.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;
    
    toggle.style.cssText = `
      position: fixed;
      top: 15px;
      left: 15px;
      z-index: 1001;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
    `;

    toggle.addEventListener('click', () => this.toggleMobileMenu());
    document.body.appendChild(toggle);
  }

  removeMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    if (toggle) toggle.remove();
    
    const overlay = document.querySelector('.mobile-menu-overlay');
    if (overlay) overlay.remove();
  }

  toggleMobileMenu() {
    let overlay = document.querySelector('.mobile-menu-overlay');
    
    if (overlay) {
      overlay.remove();
      return;
    }

    overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      display: flex;
    `;

    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.style.cssText = `
      background: white;
      width: 280px;
      height: 100%;
      padding: 60px 20px 20px;
      overflow-y: auto;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    `;

    // Copiar navegación del sidebar
    const sidebarNav = document.querySelector('.sidebar-nav, .nav-desktop');
    if (sidebarNav) {
      menu.innerHTML = sidebarNav.outerHTML;
    }

    overlay.appendChild(menu);
    document.body.appendChild(overlay);

    // Animar entrada
    setTimeout(() => {
      menu.style.transform = 'translateX(0)';
    }, 10);

    // Cerrar al hacer click fuera
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  async adaptNavigation(config) {
    const navigation = document.querySelector('.navigation, .mobile-nav');
    if (!navigation) return;

    if (config.type === 'bottom') {
      navigation.classList.add('bottom-nav');
      navigation.classList.remove('sidebar-nav');
      this.limitNavigationItems(navigation, config.items);
    } else {
      navigation.classList.remove('bottom-nav');
      navigation.classList.add('sidebar-nav');
      this.showAllNavigationItems(navigation);
    }
  }

  limitNavigationItems(navigation, maxItems) {
    if (typeof maxItems !== 'number') return;

    const items = navigation.querySelectorAll('.nav-item, .mobile-nav-item');
    items.forEach((item, index) => {
      if (index >= maxItems) {
        item.style.display = 'none';
      } else {
        item.style.display = '';
      }
    });

    // Agregar item "Más" si hay elementos ocultos
    if (items.length > maxItems) {
      this.addMoreMenuItem(navigation);
    }
  }

  showAllNavigationItems(navigation) {
    const items = navigation.querySelectorAll('.nav-item, .mobile-nav-item');
    items.forEach(item => {
      item.style.display = '';
    });

    // Remover item "Más"
    const moreItem = navigation.querySelector('.nav-more-item');
    if (moreItem) moreItem.remove();
  }

  addMoreMenuItem(navigation) {
    if (navigation.querySelector('.nav-more-item')) return;

    const moreItem = document.createElement('div');
    moreItem.className = 'nav-more-item mobile-nav-item';
    moreItem.innerHTML = `
      <div class="mobile-nav-icon">⋯</div>
      <span>Más</span>
    `;

    moreItem.addEventListener('click', () => {
      this.showMoreMenu();
    });

    navigation.appendChild(moreItem);
  }

  async adaptContent(config) {
    const contentContainers = document.querySelectorAll('.content-grid, .dashboard-widgets, .community-posts');
    
    contentContainers.forEach(container => {
      if (config.columns === 1) {
        container.style.gridTemplateColumns = '1fr';
      } else {
        container.style.gridTemplateColumns = `repeat(${config.columns}, 1fr)`;
      }
      
      container.style.gap = config.spacing;
    });
  }

  async adaptHeader(config) {
    const header = document.querySelector('.header, .mobile-header, .tablet-header, .desktop-header');
    if (!header) return;

    header.style.height = config.height;

    if (config.simplified) {
      header.classList.add('simplified');
      this.hideNonEssentialHeaderElements(header);
    } else {
      header.classList.remove('simplified');
      this.showAllHeaderElements(header);
    }
  }

  hideNonEssentialHeaderElements(header) {
    const nonEssential = header.querySelectorAll('.header-search, .header-actions .action-btn:not(.essential)');
    nonEssential.forEach(el => el.style.display = 'none');
  }

  showAllHeaderElements(header) {
    const elements = header.querySelectorAll('[style*="display: none"]');
    elements.forEach(el => el.style.display = '');
  }

  async adaptWidgets(config) {
    const widgets = document.querySelectorAll('.widget, .widget-desktop');
    
    if (config.position === 'inline') {
      this.moveWidgetsInline(widgets, config.maxVisible);
    } else if (config.position === 'sidebar') {
      this.moveWidgetsToSidebar(widgets, config.maxVisible);
    } else {
      this.moveWidgetsToDedicatedArea(widgets, config.maxVisible);
    }
  }

  moveWidgetsInline(widgets, maxVisible) {
    const mainContent = document.querySelector('.main-content, .community-posts');
    if (!mainContent) return;

    widgets.forEach((widget, index) => {
      if (index < maxVisible) {
        mainContent.appendChild(widget);
        widget.style.display = 'block';
      } else {
        widget.style.display = 'none';
      }
    });
  }

  moveWidgetsToSidebar(widgets, maxVisible) {
    let sidebarWidgets = document.querySelector('.sidebar-widgets');
    
    if (!sidebarWidgets) {
      sidebarWidgets = document.createElement('div');
      sidebarWidgets.className = 'sidebar-widgets';
      
      const sidebar = document.querySelector('.sidebar, .tablet-sidebar');
      if (sidebar) sidebar.appendChild(sidebarWidgets);
    }

    widgets.forEach((widget, index) => {
      if (index < maxVisible) {
        sidebarWidgets.appendChild(widget);
        widget.style.display = 'block';
      } else {
        widget.style.display = 'none';
      }
    });
  }

  moveWidgetsToDedicatedArea(widgets, maxVisible) {
    const widgetArea = document.querySelector('.desktop-widgets, .widget-area');
    if (!widgetArea) return;

    widgets.forEach((widget, index) => {
      if (index < maxVisible) {
        widgetArea.appendChild(widget);
        widget.style.display = 'block';
      } else {
        widget.style.display = 'none';
      }
    });
  }

  async adaptToOrientation(newOrientation, oldOrientation) {
    if (breakpointManager.isMobile()) {
      if (newOrientation === 'landscape') {
        this.applyLandscapeOptimizations();
      } else {
        this.removeLandscapeOptimizations();
      }
    }
  }

  applyLandscapeOptimizations() {
    document.body.classList.add('mobile-landscape');
    
    // Reducir altura del header móvil
    const mobileHeader = document.querySelector('.mobile-header');
    if (mobileHeader) {
      mobileHeader.style.height = '50px';
    }
    
    // Ajustar navegación inferior
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
      mobileNav.style.height = '60px';
    }
  }

  removeLandscapeOptimizations() {
    document.body.classList.remove('mobile-landscape');
    
    // Restaurar alturas originales
    const mobileHeader = document.querySelector('.mobile-header');
    if (mobileHeader) {
      mobileHeader.style.height = '';
    }
    
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
      mobileNav.style.height = '';
    }
  }

  notifyLayoutChange(newLayout, oldLayout) {
    const event = new CustomEvent('layoutChanged', {
      detail: {
        newLayout,
        oldLayout,
        config: this.layoutConfigs.get(newLayout)
      }
    });
    
    window.dispatchEvent(event);
  }

  // Métodos públicos
  getCurrentLayout() {
    return this.currentLayout;
  }

  getLayoutConfig(layout = this.currentLayout) {
    return this.layoutConfigs.get(layout);
  }

  forceLayout(layout) {
    if (this.layoutConfigs.has(layout)) {
      this.adaptToBreakpoint(layout, this.currentLayout);
    }
  }

  registerComponent(component) {
    this.activeComponents.add(component);
  }

  unregisterComponent(component) {
    this.activeComponents.delete(component);
  }
}

// Instancia global
const layoutAdapter = new LayoutAdapter();

export { layoutAdapter, LayoutAdapter };
export default layoutAdapter;