/* ==================================================
   RAMA 9: Panel Manager Module
   Gestión de paneles dinámicos y modales
   ================================================== */

class PanelManager {
  constructor(options = {}) {
    this.options = {
      enableAnimations: true,
      autoClose: true,
      stackPanels: true,
      enableKeyboard: true,
      enableOverlay: true,
      enableDrag: false,
      maxPanels: 5,
      ...options
    };
    
    this.panels = new Map();
    this.panelStack = [];
    this.activePanel = null;
    this.panelCounter = 0;
    
    this.templates = new Map();
    this.eventHandlers = new Map();
    this.animationQueue = [];
    
    this.init();
  }
  
  init() {
    console.log('🗂️ Inicializando Panel Manager...');
    
    this.setupTemplates();
    this.setupEventListeners();
    this.createOverlay();
    this.setupKeyboardShortcuts();
    
    console.log('✅ Panel Manager inicializado');
  }
  
  setupTemplates() {
    // Template para panel de personaje
    this.templates.set('character', {
      className: 'character-detail-panel',
      title: 'Detalles del Personaje',
      size: 'medium',
      position: 'center',
      closable: true,
      resizable: false
    });
    
    // Template para panel de capítulo
    this.templates.set('chapter', {
      className: 'chapter-detail-panel',
      title: 'Información del Capítulo',
      size: 'large',
      position: 'center',
      closable: true,
      resizable: true
    });
    
    // Template para configuraciones
    this.templates.set('settings', {
      className: 'settings-panel',
      title: 'Configuración',
      size: 'medium',
      position: 'center',
      closable: true,
      resizable: false
    });
    
    // Template para sponsor
    this.templates.set('sponsor', {
      className: 'sponsor-detail-panel',
      title: 'Información del Patrocinador',
      size: 'small',
      position: 'center',
      closable: true,
      resizable: false
    });
    
    // Template para galería
    this.templates.set('gallery', {
      className: 'gallery-panel',
      title: 'Galería',
      size: 'fullscreen',
      position: 'center',
      closable: true,
      resizable: false
    });
  }
  
  setupEventListeners() {
    // Eventos de clicks globales
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    
    // Eventos de teclado
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // Eventos de redimensionamiento
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Eventos personalizados
    document.addEventListener('panel:open', this.handleOpenRequest.bind(this));
    document.addEventListener('panel:close', this.handleCloseRequest.bind(this));
    document.addEventListener('panel:toggle', this.handleToggleRequest.bind(this));
  }
  
  setupKeyboardShortcuts() {
    if (!this.options.enableKeyboard) return;
    
    this.shortcuts = {
      'Escape': () => this.closeActivePanel(),
      'Tab': (e) => this.handleTabNavigation(e),
      'ArrowLeft': () => this.navigatePanels('prev'),
      'ArrowRight': () => this.navigatePanels('next')
    };
  }
  
  createOverlay() {
    if (!this.options.enableOverlay) return;
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'panel-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    `;
    
    this.overlay.addEventListener('click', () => {
      if (this.options.autoClose) {
        this.closeActivePanel();
      }
    });
    
    document.body.appendChild(this.overlay);
  }
  
  // Métodos principales de gestión de paneles
  openPanel(type, data = {}, options = {}) {
    const template = this.templates.get(type);
    if (!template) {
      console.error(`❌ Template de panel no encontrado: ${type}`);
      return null;
    }
    
    // Verificar límite de paneles
    if (this.panelStack.length >= this.options.maxPanels) {
      console.warn('⚠️ Límite máximo de paneles alcanzado');
      this.closeOldestPanel();
    }
    
    // Crear panel
    const panel = this.createPanel(type, template, data, options);
    
    // Registrar panel
    this.panels.set(panel.id, panel);
    this.panelStack.push(panel.id);
    
    // Mostrar panel
    this.showPanel(panel);
    
    // Actualizar panel activo
    this.setActivePanel(panel.id);
    
    // Emitir evento
    this.emit('panel:opened', { panel, type, data });
    
    console.log(`📋 Panel abierto: ${type} (${panel.id})`);
    return panel;
  }
  
  closePanel(panelId) {
    const panel = this.panels.get(panelId);
    if (!panel) return false;
    
    // Animar salida
    this.hidePanel(panel);
    
    // Remover de stack
    const stackIndex = this.panelStack.indexOf(panelId);
    if (stackIndex > -1) {
      this.panelStack.splice(stackIndex, 1);
    }
    
    // Actualizar panel activo
    if (this.activePanel === panelId) {
      this.activePanel = this.panelStack.length > 0 ? 
        this.panelStack[this.panelStack.length - 1] : null;
    }
    
    // Limpiar después de la animación
    setTimeout(() => {
      this.destroyPanel(panel);
    }, 300);
    
    // Ocultar overlay si no hay más paneles
    if (this.panelStack.length === 0) {
      this.hideOverlay();
    }
    
    // Emitir evento
    this.emit('panel:closed', { panelId, type: panel.type });
    
    console.log(`📋 Panel cerrado: ${panel.type} (${panelId})`);
    return true;
  }
  
  closeActivePanel() {
    if (this.activePanel) {
      return this.closePanel(this.activePanel);
    }
    return false;
  }
  
  closeAllPanels() {
    const panelIds = [...this.panelStack];
    panelIds.forEach(panelId => this.closePanel(panelId));
  }
  
  togglePanel(type, data = {}) {
    // Buscar si hay un panel del mismo tipo abierto
    const existingPanel = this.findPanelByType(type);
    
    if (existingPanel) {
      this.closePanel(existingPanel.id);
      return false;
    } else {
      this.openPanel(type, data);
      return true;
    }
  }
  
  createPanel(type, template, data, options) {
    const panelId = `panel_${++this.panelCounter}`;
    
    const panel = {
      id: panelId,
      type,
      template,
      data,
      options: { ...template, ...options },
      element: null,
      isVisible: false,
      createdAt: Date.now()
    };
    
    // Crear elemento DOM
    panel.element = this.createPanelElement(panel);
    
    // Cargar contenido
    this.loadPanelContent(panel);
    
    return panel;
  }
  
  createPanelElement(panel) {
    const element = document.createElement('div');
    element.className = `panel ${panel.template.className} panel-${panel.options.size}`;
    element.id = panel.id;
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-labelledby', `${panel.id}-title`);
    element.setAttribute('tabindex', '-1');
    
    // Estructura básica del panel
    element.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title" id="${panel.id}-title">${panel.options.title || panel.template.title}</h2>
        <div class="panel-controls">
          ${panel.options.resizable ? '<button class="panel-resize" aria-label="Redimensionar">⛶</button>' : ''}
          ${panel.options.closable ? '<button class="panel-close" aria-label="Cerrar">×</button>' : ''}
        </div>
      </div>
      <div class="panel-content">
        <div class="panel-loading">
          <div class="loading-spinner"></div>
          <span>Cargando...</span>
        </div>
      </div>
    `;
    
    // Aplicar posicionamiento
    this.positionPanel(element, panel.options.position);
    
    // Configurar eventos del panel
    this.setupPanelEvents(element, panel);
    
    // Agregar al DOM
    document.body.appendChild(element);
    
    return element;
  }
  
  loadPanelContent(panel) {
    const contentContainer = panel.element.querySelector('.panel-content');
    
    // Simular carga asíncrona
    setTimeout(() => {
      let content = '';
      
      switch (panel.type) {
        case 'character':
          content = this.generateCharacterContent(panel.data);
          break;
        case 'chapter':
          content = this.generateChapterContent(panel.data);
          break;
        case 'settings':
          content = this.generateSettingsContent(panel.data);
          break;
        case 'sponsor':
          content = this.generateSponsorContent(panel.data);
          break;
        case 'gallery':
          content = this.generateGalleryContent(panel.data);
          break;
        default:
          content = '<p>Contenido no disponible</p>';
      }
      
      contentContainer.innerHTML = content;
      
      // Configurar eventos específicos del contenido
      this.setupContentEvents(panel);
      
      // Emitir evento de contenido cargado
      this.emit('panel:content-loaded', { panel });
      
    }, 500); // Simular delay de carga
  }
  
  generateCharacterContent(data) {
    return `
      <div class="character-detail">
        <div class="character-avatar-large">
          ${data.name ? data.name.charAt(0) : '?'}
        </div>
        <div class="character-info">
          <h3>${data.name || 'Personaje Desconocido'}</h3>
          <p class="character-role">${data.role || 'Rol no especificado'}</p>
          <p class="character-description">
            ${data.description || 'Sin descripción disponible.'}
          </p>
        </div>
        <div class="character-stats">
          <div class="stat">
            <label>Fuerza:</label>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${data.strength || 50}%"></div>
            </div>
          </div>
          <div class="stat">
            <label>Inteligencia:</label>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${data.intelligence || 50}%"></div>
            </div>
          </div>
          <div class="stat">
            <label>Carisma:</label>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${data.charisma || 50}%"></div>
            </div>
          </div>
        </div>
        <div class="character-actions">
          <button class="btn-primary" onclick="window.panelManager.emit('character:follow', {id: '${data.id}'})">
            Seguir Personaje
          </button>
          <button class="btn-secondary" onclick="window.panelManager.emit('character:details', {id: '${data.id}'})">
            Ver Más Detalles
          </button>
        </div>
      </div>
    `;
  }
  
  generateChapterContent(data) {
    return `
      <div class="chapter-detail">
        <div class="chapter-header">
          <h3>Capítulo ${data.number || '?'}</h3>
          <p class="chapter-subtitle">${data.title || 'Sin título'}</p>
        </div>
        <div class="chapter-summary">
          <h4>Resumen</h4>
          <p>${data.summary || 'Sin resumen disponible.'}</p>
        </div>
        <div class="chapter-progress">
          <h4>Progreso</h4>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${data.progress || 0}%"></div>
          </div>
          <span>${data.progress || 0}% completado</span>
        </div>
        <div class="chapter-actions">
          <button class="btn-primary" onclick="window.panelManager.emit('chapter:continue', {id: '${data.id}'})">
            ${data.progress > 0 ? 'Continuar Leyendo' : 'Comenzar Capítulo'}
          </button>
          <button class="btn-secondary" onclick="window.panelManager.emit('chapter:bookmark', {id: '${data.id}'})">
            Marcar
          </button>
        </div>
      </div>
    `;
  }
  
  generateSettingsContent(data) {
    return `
      <div class="settings-content">
        <div class="settings-section">
          <h4>Apariencia</h4>
          <div class="setting-item">
            <label>Tema:</label>
            <select id="theme-select">
              <option value="dark">Oscuro</option>
              <option value="light">Claro</option>
              <option value="auto">Automático</option>
            </select>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="animations-toggle" checked>
              Habilitar animaciones
            </label>
          </div>
        </div>
        <div class="settings-section">
          <h4>Comunidad</h4>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="notifications-toggle" checked>
              Notificaciones de la comunidad
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="sponsors-toggle" checked>
              Mostrar contenido de patrocinadores
            </label>
          </div>
        </div>
        <div class="settings-actions">
          <button class="btn-primary" onclick="window.panelManager.saveSettings()">
            Guardar Cambios
          </button>
          <button class="btn-secondary" onclick="window.panelManager.resetSettings()">
            Restaurar Valores
          </button>
        </div>
      </div>
    `;
  }
  
  generateSponsorContent(data) {
    return `
      <div class="sponsor-detail">
        <div class="sponsor-logo-large">
          ${data.name ? data.name.charAt(0) : 'S'}
        </div>
        <div class="sponsor-info">
          <h3>${data.name || 'Patrocinador'}</h3>
          <p class="sponsor-category">${data.category || 'Categoría no especificada'}</p>
          <p class="sponsor-description">
            ${data.description || 'Sin descripción disponible.'}
          </p>
        </div>
        <div class="sponsor-offer">
          <h4>Oferta Especial</h4>
          <p>${data.offer || 'Consulta nuestra página web para ofertas especiales.'}</p>
        </div>
        <div class="sponsor-actions">
          <button class="btn-primary" onclick="window.open('${data.website || '#'}', '_blank')">
            Visitar Sitio Web
          </button>
          <button class="btn-secondary" onclick="window.panelManager.emit('sponsor:learn-more', {id: '${data.id}'})">
            Más Información
          </button>
        </div>
      </div>
    `;
  }
  
  generateGalleryContent(data) {
    return `
      <div class="gallery-content">
        <div class="gallery-header">
          <h3>${data.title || 'Galería'}</h3>
          <div class="gallery-controls">
            <button class="gallery-prev">‹</button>
            <span class="gallery-counter">1 / ${data.images?.length || 0}</span>
            <button class="gallery-next">›</button>
          </div>
        </div>
        <div class="gallery-viewer">
          <div class="gallery-image">
            <img src="${data.images?.[0] || '/placeholder.jpg'}" alt="Imagen de galería">
          </div>
        </div>
        <div class="gallery-thumbnails">
          ${data.images?.map((img, index) => `
            <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
              <img src="${img}" alt="Miniatura ${index + 1}">
            </div>
          `).join('') || '<p>No hay imágenes disponibles</p>'}
        </div>
      </div>
    `;
  }
  
  // Métodos de posicionamiento y visualización
  positionPanel(element, position) {
    element.classList.add(`panel-position-${position}`);
    
    switch (position) {
      case 'center':
        element.style.cssText += `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1001;
        `;
        break;
      case 'top':
        element.style.cssText += `
          position: fixed;
          top: 5%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1001;
        `;
        break;
      case 'bottom':
        element.style.cssText += `
          position: fixed;
          bottom: 5%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1001;
        `;
        break;
      case 'left':
        element.style.cssText += `
          position: fixed;
          top: 50%;
          left: 5%;
          transform: translateY(-50%);
          z-index: 1001;
        `;
        break;
      case 'right':
        element.style.cssText += `
          position: fixed;
          top: 50%;
          right: 5%;
          transform: translateY(-50%);
          z-index: 1001;
        `;
        break;
    }
  }
  
  showPanel(panel) {
    if (!panel.element) return;
    
    // Mostrar overlay
    this.showOverlay();
    
    // Animar entrada del panel
    if (this.options.enableAnimations) {
      this.animatePanel(panel.element, 'slideIn');
    } else {
      panel.element.style.opacity = '1';
      panel.element.style.visibility = 'visible';
    }
    
    panel.isVisible = true;
    
    // Focus en el panel
    setTimeout(() => {
      panel.element.focus();
    }, 100);
  }
  
  hidePanel(panel) {
    if (!panel.element || !panel.isVisible) return;
    
    // Animar salida del panel
    if (this.options.enableAnimations) {
      this.animatePanel(panel.element, 'slideOut');
    } else {
      panel.element.style.opacity = '0';
      panel.element.style.visibility = 'hidden';
    }
    
    panel.isVisible = false;
  }
  
  showOverlay() {
    if (this.overlay) {
      this.overlay.style.opacity = '1';
      this.overlay.style.visibility = 'visible';
      document.body.classList.add('panel-overlay-active');
    }
  }
  
  hideOverlay() {
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      this.overlay.style.visibility = 'hidden';
      document.body.classList.remove('panel-overlay-active');
    }
  }
  
  animatePanel(element, animation) {
    element.classList.add(`panel-${animation}`);
    
    const duration = animation === 'slideIn' ? 300 : 250;
    
    setTimeout(() => {
      element.classList.remove(`panel-${animation}`);
      
      if (animation === 'slideOut') {
        element.style.opacity = '0';
        element.style.visibility = 'hidden';
      }
    }, duration);
  }
  
  // Métodos de eventos
  setupPanelEvents(element, panel) {
    // Evento de cerrar
    const closeBtn = element.querySelector('.panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closePanel(panel.id);
      });
    }
    
    // Evento de redimensionar
    const resizeBtn = element.querySelector('.panel-resize');
    if (resizeBtn) {
      resizeBtn.addEventListener('mousedown', (e) => {
        this.startResize(e, panel);
      });
    }
    
    // Prevenir propagación de clicks dentro del panel
    element.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Drag and drop si está habilitado
    if (this.options.enableDrag) {
      this.setupPanelDrag(element, panel);
    }
  }
  
  setupContentEvents(panel) {
    const element = panel.element;
    
    // Eventos específicos por tipo de panel
    switch (panel.type) {
      case 'gallery':
        this.setupGalleryEvents(element);
        break;
      case 'settings':
        this.setupSettingsEvents(element);
        break;
    }
  }
  
  setupGalleryEvents(element) {
    const prevBtn = element.querySelector('.gallery-prev');
    const nextBtn = element.querySelector('.gallery-next');
    const thumbnails = element.querySelectorAll('.thumbnail');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.galleryPrev(element));
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.galleryNext(element));
    }
    
    thumbnails.forEach((thumb, index) => {
      thumb.addEventListener('click', () => this.galleryGoTo(element, index));
    });
  }
  
  setupSettingsEvents(element) {
    const themeSelect = element.querySelector('#theme-select');
    const animationsToggle = element.querySelector('#animations-toggle');
    const notificationsToggle = element.querySelector('#notifications-toggle');
    const sponsorsToggle = element.querySelector('#sponsors-toggle');
    
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.emit('settings:theme-change', { theme: e.target.value });
      });
    }
    
    if (animationsToggle) {
      animationsToggle.addEventListener('change', (e) => {
        this.emit('settings:animations-change', { enabled: e.target.checked });
      });
    }
    
    if (notificationsToggle) {
      notificationsToggle.addEventListener('change', (e) => {
        this.emit('settings:notifications-change', { enabled: e.target.checked });
      });
    }
    
    if (sponsorsToggle) {
      sponsorsToggle.addEventListener('change', (e) => {
        this.emit('settings:sponsors-change', { enabled: e.target.checked });
      });
    }
  }
  
  // Manejadores de eventos globales
  handleGlobalClick(event) {
    // Manejar clicks en elementos que abren paneles
    const trigger = event.target.closest('[data-panel-type]');
    if (trigger) {
      event.preventDefault();
      
      const type = trigger.dataset.panelType;
      const data = this.extractDataFromElement(trigger);
      
      this.openPanel(type, data);
    }
  }
  
  handleKeydown(event) {
    if (this.shortcuts && this.shortcuts[event.key]) {
      const handler = this.shortcuts[event.key];
      
      if (typeof handler === 'function') {
        handler(event);
      }
    }
  }
  
  handleResize() {
    // Reposicionar paneles visibles
    this.panels.forEach(panel => {
      if (panel.isVisible) {
        this.repositionPanel(panel);
      }
    });
  }
  
  handleOpenRequest(event) {
    const { type, data, options } = event.detail;
    this.openPanel(type, data, options);
  }
  
  handleCloseRequest(event) {
    const { panelId } = event.detail;
    if (panelId) {
      this.closePanel(panelId);
    } else {
      this.closeActivePanel();
    }
  }
  
  handleToggleRequest(event) {
    const { type, data } = event.detail;
    this.togglePanel(type, data);
  }
  
  // Métodos de utilidad
  extractDataFromElement(element) {
    const data = {};
    
    // Extraer todos los data attributes
    Object.keys(element.dataset).forEach(key => {
      if (key !== 'panelType') {
        data[key] = element.dataset[key];
      }
    });
    
    return data;
  }
  
  findPanelByType(type) {
    for (const panel of this.panels.values()) {
      if (panel.type === type) {
        return panel;
      }
    }
    return null;
  }
  
  setActivePanel(panelId) {
    // Remover clase activa de otros paneles
    this.panels.forEach(panel => {
      if (panel.element) {
        panel.element.classList.remove('panel-active');
      }
    });
    
    // Agregar clase activa al panel actual
    const panel = this.panels.get(panelId);
    if (panel && panel.element) {
      panel.element.classList.add('panel-active');
      this.activePanel = panelId;
    }
  }
  
  closeOldestPanel() {
    if (this.panelStack.length > 0) {
      const oldestPanelId = this.panelStack[0];
      this.closePanel(oldestPanelId);
    }
  }
  
  repositionPanel(panel) {
    if (panel.element) {
      this.positionPanel(panel.element, panel.options.position);
    }
  }
  
  destroyPanel(panel) {
    // Remover del DOM
    if (panel.element && panel.element.parentNode) {
      panel.element.parentNode.removeChild(panel.element);
    }
    
    // Remover del registro
    this.panels.delete(panel.id);
    
    // Limpiar referencias
    panel.element = null;
    panel.data = null;
  }
  
  // Métodos de galería
  galleryPrev(element) {
    // Implementar navegación anterior en galería
    this.emit('gallery:prev');
  }
  
  galleryNext(element) {
    // Implementar navegación siguiente en galería
    this.emit('gallery:next');
  }
  
  galleryGoTo(element, index) {
    // Implementar navegación a imagen específica
    this.emit('gallery:goto', { index });
  }
  
  // API pública
  getPanelById(panelId) {
    return this.panels.get(panelId);
  }
  
  getActivePanelId() {
    return this.activePanel;
  }
  
  getActivePanel() {
    return this.activePanel ? this.panels.get(this.activePanel) : null;
  }
  
  getPanelCount() {
    return this.panels.size;
  }
  
  getPanelsByType(type) {
    const result = [];
    this.panels.forEach(panel => {
      if (panel.type === type) {
        result.push(panel);
      }
    });
    return result;
  }
  
  // Métodos de configuración
  saveSettings() {
    const settingsPanel = this.findPanelByType('settings');
    if (settingsPanel && settingsPanel.element) {
      const element = settingsPanel.element;
      
      const settings = {
        theme: element.querySelector('#theme-select')?.value,
        animations: element.querySelector('#animations-toggle')?.checked,
        notifications: element.querySelector('#notifications-toggle')?.checked,
        sponsors: element.querySelector('#sponsors-toggle')?.checked
      };
      
      this.emit('settings:save', { settings });
      this.closePanel(settingsPanel.id);
    }
  }
  
  resetSettings() {
    this.emit('settings:reset');
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  // Métodos de limpieza
  destroy() {
    // Cerrar todos los paneles
    this.closeAllPanels();
    
    // Remover overlay
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    // Remover event listeners
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('panel:open', this.handleOpenRequest);
    document.removeEventListener('panel:close', this.handleCloseRequest);
    document.removeEventListener('panel:toggle', this.handleToggleRequest);
    
    // Limpiar referencias
    this.panels.clear();
    this.templates.clear();
    this.eventHandlers.clear();
    this.panelStack = [];
    this.activePanel = null;
    
    console.log('🧹 Panel Manager destruido');
  }
}

// Exportar para uso global
window.PanelManager = PanelManager;

export default PanelManager;