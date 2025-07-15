/* ==================================================
   RAMA 9: Community Interface Module
   Gestión principal de la interfaz de comunidad
   ================================================== */

class CommunityInterface {
  constructor() {
    this.initialized = false;
    this.activePanel = null;
    this.currentTheme = 'default';
    this.sponsorIntegration = null;
    this.storyProgress = null;
    this.chapterMarkers = null;
    
    this.config = {
      autoSave: true,
      animations: true,
      sponsorVisibility: true,
      communityUpdates: true,
      soundEffects: false
    };
    
    this.eventListeners = new Map();
    this.components = new Map();
    
    this.init();
  }
  
  async init() {
    try {
      console.log('🚀 Inicializando Community Interface...');
      
      await this.loadConfiguration();
      await this.initializeComponents();
      this.setupEventListeners();
      this.setupKeyboardShortcuts();
      this.startAutoUpdate();
      
      this.initialized = true;
      this.emit('interface:initialized');
      
      console.log('✅ Community Interface inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando Community Interface:', error);
      this.handleInitializationError(error);
    }
  }
  
  async loadConfiguration() {
    try {
      // Simular carga de configuración desde localStorage o API
      const savedConfig = this.getStoredConfig();
      this.config = { ...this.config, ...savedConfig };
      
      // Aplicar configuración inicial
      this.applyConfiguration();
      
      console.log('📋 Configuración cargada:', this.config);
    } catch (error) {
      console.warn('⚠️ Error cargando configuración, usando valores por defecto');
    }
  }
  
  async initializeComponents() {
    const components = [
      { name: 'navigation', module: 'NavigationSystem' },
      { name: 'progress', module: 'ProgressTracking' },
      { name: 'panels', module: 'PanelManager' },
      { name: 'layout', module: 'LayoutController' }
    ];
    
    for (const component of components) {
      try {
        await this.loadComponent(component.name, component.module);
      } catch (error) {
        console.error(`❌ Error cargando componente ${component.name}:`, error);
      }
    }
  }
  
  async loadComponent(name, moduleName) {
    // Simular carga dinámica de módulos
    const component = {
      name,
      module: moduleName,
      status: 'loaded',
      instance: null
    };
    
    this.components.set(name, component);
    console.log(`📦 Componente ${name} cargado`);
  }
  
  setupEventListeners() {
    // Eventos de navegación
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    
    // Eventos de redimensionamiento
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Eventos personalizados
    this.on('panel:change', this.handlePanelChange.bind(this));
    this.on('theme:change', this.handleThemeChange.bind(this));
    this.on('sponsor:interaction', this.handleSponsorInteraction.bind(this));
    
    console.log('🎧 Event listeners configurados');
  }
  
  setupKeyboardShortcuts() {
    const shortcuts = {
      'ctrl+h': () => this.toggleHelp(),
      'ctrl+s': () => this.saveProgress(),
      'ctrl+t': () => this.toggleTheme(),
      'escape': () => this.closeActiveModal(),
      'ctrl+/': () => this.toggleSearch()
    };
    
    document.addEventListener('keydown', (e) => {
      const key = this.getKeyCombo(e);
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    });
  }
  
  handleGlobalClick(event) {
    const target = event.target;
    
    // Manejo de clics en navegación
    if (target.closest('.nav-item')) {
      this.handleNavigation(target.closest('.nav-item'));
    }
    
    // Manejo de clics en paneles de personajes
    if (target.closest('.character-panel')) {
      this.handleCharacterPanelClick(target.closest('.character-panel'));
    }
    
    // Manejo de clics en marcadores de capítulos
    if (target.closest('.chapter-marker')) {
      this.handleChapterMarkerClick(target.closest('.chapter-marker'));
    }
    
    // Cerrar elementos desplegables al hacer clic fuera
    if (!target.closest('.dropdown')) {
      this.closeAllDropdowns();
    }
  }
  
  handleGlobalKeydown(event) {
    // Manejo de teclas de accesibilidad
    if (event.key === 'Tab') {
      this.handleTabNavigation(event);
    }
    
    // Navegación con flechas en elementos focusables
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      this.handleArrowNavigation(event);
    }
  }
  
  handleResize() {
    this.updateLayoutBreakpoints();
    this.adjustComponentSizes();
    this.repositionFloatingElements();
  }
  
  handleNavigation(navItem) {
    const targetSection = navItem.dataset.section;
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    navItem.classList.add('active');
    
    // Cambiar sección activa
    this.switchSection(targetSection);
    
    this.emit('navigation:change', { section: targetSection });
  }
  
  handleCharacterPanelClick(panel) {
    const characterId = panel.dataset.characterId;
    
    // Toggle panel activo
    if (this.activePanel === characterId) {
      this.closeCharacterPanel();
    } else {
      this.openCharacterPanel(characterId);
    }
  }
  
  handleChapterMarkerClick(marker) {
    const chapterId = marker.dataset.chapterId;
    const isLocked = marker.classList.contains('locked');
    
    if (isLocked) {
      this.showLockedChapterMessage(chapterId);
      return;
    }
    
    this.navigateToChapter(chapterId);
  }
  
  handlePanelChange(event) {
    const { panelId, action } = event.detail;
    
    if (action === 'open') {
      this.animatePanel(panelId, 'slideIn');
    } else if (action === 'close') {
      this.animatePanel(panelId, 'slideOut');
    }
  }
  
  handleThemeChange(event) {
    const { theme } = event.detail;
    this.applyTheme(theme);
    this.saveConfiguration();
  }
  
  handleSponsorInteraction(event) {
    const { sponsorId, action } = event.detail;
    
    // Tracking de interacciones con sponsors
    this.trackSponsorInteraction(sponsorId, action);
    
    if (action === 'click') {
      this.openSponsorModal(sponsorId);
    }
  }
  
  // Métodos de gestión de secciones
  switchSection(sectionId) {
    const sections = document.querySelectorAll('.main-section');
    
    sections.forEach(section => {
      if (section.id === sectionId) {
        section.classList.add('active');
        this.animateSection(section, 'fadeIn');
      } else {
        section.classList.remove('active');
      }
    });
    
    this.updateURL(sectionId);
  }
  
  // Métodos de gestión de paneles
  openCharacterPanel(characterId) {
    this.closeActivePanel();
    
    const panel = document.querySelector(`[data-character-id="${characterId}"]`);
    if (panel) {
      panel.classList.add('active');
      this.activePanel = characterId;
      this.loadCharacterDetails(characterId);
    }
  }
  
  closeCharacterPanel() {
    if (this.activePanel) {
      const panel = document.querySelector(`[data-character-id="${this.activePanel}"]`);
      if (panel) {
        panel.classList.remove('active');
      }
      this.activePanel = null;
    }
  }
  
  closeActivePanel() {
    this.closeCharacterPanel();
    this.closeAllDropdowns();
    this.closeActiveModal();
  }
  
  // Métodos de navegación por capítulos
  navigateToChapter(chapterId) {
    this.updateProgress(chapterId);
    this.loadChapterContent(chapterId);
    this.updateChapterMarkers(chapterId);
    
    this.emit('chapter:navigate', { chapterId });
  }
  
  updateProgress(chapterId) {
    const progressBar = document.querySelector('.progress-bar');
    const markers = document.querySelectorAll('.chapter-marker');
    
    // Calcular progreso basado en capítulo actual
    const totalChapters = markers.length;
    const currentChapterIndex = Array.from(markers).findIndex(
      marker => marker.dataset.chapterId === chapterId
    );
    const progressPercentage = ((currentChapterIndex + 1) / totalChapters) * 100;
    
    if (progressBar) {
      progressBar.style.width = `${progressPercentage}%`;
    }
    
    // Actualizar texto de progreso
    const progressText = document.querySelector('.progress-percentage');
    if (progressText) {
      progressText.textContent = `${Math.round(progressPercentage)}%`;
    }
  }
  
  updateChapterMarkers(currentChapterId) {
    const markers = document.querySelectorAll('.chapter-marker');
    
    markers.forEach(marker => {
      const chapterId = marker.dataset.chapterId;
      
      marker.classList.remove('current', 'completed');
      
      if (chapterId === currentChapterId) {
        marker.classList.add('current');
      } else if (this.isChapterCompleted(chapterId, currentChapterId)) {
        marker.classList.add('completed');
      }
    });
  }
  
  // Métodos de animación
  animatePanel(panelId, animation) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    
    panel.classList.add(`animate-${animation}`);
    
    setTimeout(() => {
      panel.classList.remove(`animate-${animation}`);
    }, 300);
  }
  
  animateSection(section, animation) {
    section.classList.add(`animate-${animation}`);
    
    setTimeout(() => {
      section.classList.remove(`animate-${animation}`);
    }, 400);
  }
  
  // Métodos de configuración
  applyConfiguration() {
    document.body.classList.toggle('animations-disabled', !this.config.animations);
    document.body.classList.toggle('sponsors-hidden', !this.config.sponsorVisibility);
    
    if (this.config.soundEffects) {
      this.enableSoundEffects();
    }
  }
  
  saveConfiguration() {
    try {
      const configString = JSON.stringify(this.config);
      // Simular guardado en localStorage
      console.log('💾 Configuración guardada:', configString);
      this.emit('config:saved');
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
    }
  }
  
  getStoredConfig() {
    try {
      // Simular carga desde localStorage
      return {};
    } catch (error) {
      return {};
    }
  }
  
  // Métodos de utilidad
  updateLayoutBreakpoints() {
    const width = window.innerWidth;
    const body = document.body;
    
    body.classList.remove('mobile', 'tablet', 'desktop');
    
    if (width < 768) {
      body.classList.add('mobile');
    } else if (width < 1024) {
      body.classList.add('tablet');
    } else {
      body.classList.add('desktop');
    }
  }
  
  getKeyCombo(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }
  
  isChapterCompleted(chapterId, currentChapterId) {
    // Lógica para determinar si un capítulo está completado
    // basado en el progreso actual
    return parseInt(chapterId) < parseInt(currentChapterId);
  }
  
  // Sistema de eventos
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }
  
  emit(event, data = {}) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback({ type: event, detail: data });
        } catch (error) {
          console.error(`Error en event listener para ${event}:`, error);
        }
      });
    }
  }
  
  // Métodos de ciclo de vida
  startAutoUpdate() {
    if (this.config.autoSave) {
      setInterval(() => {
        this.autoSave();
      }, 30000); // Auto-guardar cada 30 segundos
    }
  }
  
  autoSave() {
    this.saveConfiguration();
    this.emit('auto:save');
  }
  
  destroy() {
    // Limpiar event listeners
    this.eventListeners.clear();
    
    // Limpiar componentes
    this.components.clear();
    
    // Remover event listeners del DOM
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('keydown', this.handleGlobalKeydown);
    window.removeEventListener('resize', this.handleResize);
    
    this.initialized = false;
    console.log('🧹 Community Interface destruida');
  }
}

// Exportar para uso global
window.CommunityInterface = CommunityInterface;

// Inicialización automática cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  if (!window.communityInterface) {
    window.communityInterface = new CommunityInterface();
  }
});

export default CommunityInterface;