/**
 * Audio Descriptions - Descripciones de audio para accesibilidad
 * Sistema de descripciones auditivas para usuarios con discapacidad visual
 */

class AudioDescriptions {
  constructor(voiceNarrator, audioManager) {
    this.voiceNarrator = voiceNarrator;
    this.audioManager = audioManager;
    this.isEnabled = true;
    this.verbosity = 'medium'; // low, medium, high, detailed
    this.autoDescribe = true;
    this.descriptionQueue = [];
    this.lastDescription = 0;
    this.minInterval = 3000; // 3 segundos entre descripciones
    this.contextHistory = [];
    this.userInteractions = new Map();
    this.environmentalContext = null;
    this.socialContext = null;
    this.currentActivity = null;
    this.templates = new Map();
    this.descriptions = new Map();
    this.priorities = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.setupDescriptionTemplates();
    this.setupContextDescriptions();
    this.setupPriorities();
    this.setupEventListeners();
    this.loadUserPreferences();
    
    this.isInitialized = true;
    console.log('Audio Descriptions initialized');
  }

  setupDescriptionTemplates() {
    // Templates para diferentes tipos de descripciones
    this.templates.set('environment', {
      entering: 'Entrando en {location}. {description}',
      leaving: 'Saliendo de {location}',
      ambient: 'El ambiente presenta {sounds}',
      weather: 'Condiciones ambientales: {weather}',
      lighting: 'Iluminación {lighting}',
      atmosphere: 'Atmósfera {mood}'
    });

    this.templates.set('social', {
      userJoined: '{user} se ha unido {location}',
      userLeft: '{user} se ha retirado',
      gathering: 'Se está formando una reunión con {count} personas',
      activity: 'Actividad social: {activity}',
      interaction: '{user1} está interactuando con {user2}',
      celebration: 'Celebración en curso: {event}'
    });

    this.templates.set('audio', {
      volumeChange: 'Volumen de {channel} ajustado a {level} por ciento',
      channelMute: '{channel} {state}',
      spatialChange: 'Audio espacial {state}',
      musicChange: 'Música cambiada a {theme}',
      effectPlaying: 'Reproduciendo efecto: {effect}',
      ambientChange: 'Sonido ambiental: {ambient}'
    });

    this.templates.set('cultural', {
      ceremonyStart: 'Iniciando ceremonia cultural: {name}',
      ceremonyPhase: 'Fase de ceremonia: {phase}',
      traditionalMusic: 'Música tradicional: {type}',
      culturalMoment: 'Momento cultural: {moment}',
      respectfulPause: 'Pausa respetuosa iniciada',
      blessing: 'Bendición o momento sagrado'
    });

    this.templates.set('interface', {
      panelOpened: 'Panel de {type} abierto',
      panelClosed: 'Panel cerrado',
      buttonActivated: 'Botón {action} activado',
      sliderChanged: 'Control deslizante {name} en {value}',
      modeChanged: 'Modo cambiado a {mode}',
      settingToggled: '{setting} {state}'
    });

    this.templates.set('navigation', {
      menuEntered: 'Navegando en menú {menu}',
      optionSelected: 'Opción seleccionada: {option}',
      tabChanged: 'Pestaña cambiada a {tab}',
      dialogOpened: 'Diálogo abierto: {title}',
      contextMenu: 'Menú contextual disponible',
      shortcutUsed: 'Atajo de teclado: {shortcut}'
    });
  }

  setupContextDescriptions() {
    // Descripciones específicas por contexto
    this.descriptions.set('locations', {
      'main-plaza': 'Plaza principal de la comunidad, espacio abierto con fuente central',
      'cultural-pavilion': 'Pabellón cultural con arquitectura tradicional',
      'meditation-garden': 'Jardín de meditación con sonidos naturales suaves',
      'gathering-circle': 'Círculo de reunión para ceremonias y encuentros',
      'art-gallery': 'Galería de arte con obras de la comunidad',
      'library': 'Biblioteca comunitaria, ambiente silencioso',
      'workshop-area': 'Área de talleres con actividades creativas'
    });

    this.descriptions.set('activities', {
      'meditation': 'Sesión de meditación grupal en curso',
      'storytelling': 'Narración de historias tradicionales',
      'music-creation': 'Creación musical colaborativa',
      'art-workshop': 'Taller de arte comunitario',
      'cultural-ceremony': 'Ceremonia cultural tradicional',
      'discussion-circle': 'Círculo de discusión y diálogo',
      'celebration': 'Celebración comunitaria festiva'
    });

    this.descriptions.set('moods', {
      'peaceful': 'tranquilo y sereno',
      'energetic': 'dinámico y lleno de energía',
      'contemplative': 'reflexivo y meditativo',
      'festive': 'alegre y celebrativo',
      'solemn': 'solemne y respetuoso',
      'mysterious': 'misterioso e intrigante',
      'welcoming': 'acogedor y cálido'
    });

    this.descriptions.set('sounds', {
      'water-flowing': 'agua fluyendo suavemente',
      'wind-rustling': 'viento susurrando entre las hojas',
      'birds-singing': 'canto de pájaros',
      'fire-crackling': 'crepitar del fuego',
      'chimes-ringing': 'campanillas resonando',
      'drums-beating': 'tambores ceremoniales',
      'voices-humming': 'voces humanas en armonía'
    });
  }

  setupPriorities() {
    // Sistema de prioridades para descripciones
    this.priorities.set('emergency', 1000);
    this.priorities.set('safety', 900);
    this.priorities.set('navigation', 800);
    this.priorities.set('interaction', 700);
    this.priorities.set('cultural', 600);
    this.priorities.set('social', 500);
    this.priorities.set('audio', 400);
    this.priorities.set('environmental', 300);
    this.priorities.set('interface', 200);
    this.priorities.set('ambient', 100);
  }

  describe(category, template, data, priority = 500) {
    if (!this.isEnabled) return;

    const now = Date.now();
    if (now - this.lastDescription < this.minInterval && priority < 700) {
      // Encolar descripción si no es alta prioridad
      this.queueDescription(category, template, data, priority);
      return;
    }

    const description = this.generateDescription(category, template, data);
    if (!description) return;

    // Ajustar descripción según verbosidad
    const adjustedDescription = this.adjustVerbosity(description, category);
    
    // Agregar contexto si es necesario
    const contextualDescription = this.addContext(adjustedDescription, category);

    // Narrar descripción
    this.voiceNarrator.narrate(contextualDescription, {
      priority: priority > 600 ? 'high' : 'normal',
      context: 'description',
      interrupt: priority > 800
    });

    this.lastDescription = now;
    
    // Registrar en historial
    this.addToHistory(category, contextualDescription, priority);

    // Procesar cola si hay elementos pendientes
    setTimeout(() => this.processDescriptionQueue(), this.minInterval);
  }

  generateDescription(category, template, data) {
    const templates = this.templates.get(category);
    if (!templates || !templates[template]) {
      console.warn(`Template ${category}.${template} not found`);
      return null;
    }

    let description = templates[template];

    // Reemplazar placeholders con datos
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      description = description.replace(new RegExp(placeholder, 'g'), value);
    });

    return description;
  }

  adjustVerbosity(description, category) {
    switch (this.verbosity) {
      case 'low':
        return this.simplifyDescription(description);
      case 'high':
        return this.enhanceDescription(description, category);
      case 'detailed':
        return this.addDetailedDescription(description, category);
      default:
        return description;
    }
  }

  simplifyDescription(description) {
    // Versión simplificada de la descripción
    return description
      .replace(/\b(está|es|son|están)\b/g, '')
      .replace(/\b(de la|de los|del|de las)\b/g, '')
      .split('.')[0] + '.';
  }

  enhanceDescription(description, category) {
    const enhancements = {
      'environment': ' Puedes explorar el área usando las teclas de navegación.',
      'social': ' Usa Ctrl+S para ver detalles de participantes.',
      'audio': ' Ajusta con Ctrl+flechas arriba/abajo.',
      'cultural': ' Momento respetuoso, se recomienda atención.',
      'interface': ' Usa Tab para navegar entre controles.'
    };

    return description + (enhancements[category] || '');
  }

  addDetailedDescription(description, category) {
    const details = this.getDetailedContext(category);
    return details ? `${description} ${details}` : description;
  }

  getDetailedContext(category) {
    switch (category) {
      case 'environment':
        return this.getEnvironmentalDetails();
      case 'social':
        return this.getSocialDetails();
      case 'audio':
        return this.getAudioDetails();
      case 'cultural':
        return this.getCulturalDetails();
      default:
        return null;
    }
  }

  getEnvironmentalDetails() {
    const details = [];
    
    if (this.environmentalContext?.temperature) {
      details.push(`Temperatura ${this.environmentalContext.temperature}`);
    }
    
    if (this.environmentalContext?.weather) {
      details.push(`Clima ${this.environmentalContext.weather}`);
    }
    
    if (this.environmentalContext?.soundscape) {
      details.push(`Paisaje sonoro: ${this.environmentalContext.soundscape}`);
    }

    return details.length > 0 ? details.join(', ') + '.' : null;
  }

  getSocialDetails() {
    const details = [];
    
    if (this.socialContext?.userCount) {
      details.push(`${this.socialContext.userCount} personas presentes`);
    }
    
    if (this.socialContext?.activity) {
      details.push(`Actividad: ${this.socialContext.activity}`);
    }
    
    if (this.socialContext?.mood) {
      details.push(`Ambiente ${this.socialContext.mood}`);
    }

    return details.length > 0 ? details.join(', ') + '.' : null;
  }

  getAudioDetails() {
    const details = [];
    
    if (this.audioManager.settings) {
      const masterVolume = Math.round(this.audioManager.settings.masterVolume * 100);
      details.push(`Volumen general ${masterVolume}%`);
    }
    
    // Obtener canales activos
    const activeChannels = [];
    this.audioManager.activeChannels?.forEach((channel, name) => {
      if (!channel.muted && channel.volume > 0) {
        activeChannels.push(name);
      }
    });
    
    if (activeChannels.length > 0) {
      details.push(`Canales activos: ${activeChannels.join(', ')}`);
    }

    return details.length > 0 ? details.join(', ') + '.' : null;
  }

  getCulturalDetails() {
    const details = [];
    
    if (this.contextHistory.some(h => h.category === 'cultural')) {
      details.push('Contexto cultural activo');
    }
    
    return details.length > 0 ? details.join(', ') + '.' : null;
  }

  addContext(description, category) {
    // Agregar contexto basado en historial reciente
    const recentContext = this.getRecentContext(category);
    
    if (recentContext && this.verbosity !== 'low') {
      return `${description} ${recentContext}`;
    }
    
    return description;
  }

  getRecentContext(category) {
    const recent = this.contextHistory
      .slice(-5)
      .filter(h => h.category !== category && Date.now() - h.timestamp < 30000);
    
    if (recent.length === 0) return null;
    
    const contextTypes = [...new Set(recent.map(h => h.category))];
    
    if (contextTypes.includes('cultural') && category !== 'cultural') {
      return 'En contexto cultural.';
    }
    
    if (contextTypes.includes('social') && category === 'environment') {
      return 'Con actividad social presente.';
    }
    
    return null;
  }

  queueDescription(category, template, data, priority) {
    this.descriptionQueue.push({
      category,
      template,
      data,
      priority,
      timestamp: Date.now()
    });
    
    // Mantener cola organizada por prioridad
    this.descriptionQueue.sort((a, b) => b.priority - a.priority);
    
    // Limitar tamaño de cola
    if (this.descriptionQueue.length > 10) {
      this.descriptionQueue = this.descriptionQueue.slice(0, 10);
    }
  }

  processDescriptionQueue() {
    if (this.descriptionQueue.length === 0) return;
    
    const now = Date.now();
    if (now - this.lastDescription < this.minInterval) return;
    
    const next = this.descriptionQueue.shift();
    
    // Verificar si la descripción sigue siendo relevante
    if (now - next.timestamp < 60000) { // 1 minuto
      this.describe(next.category, next.template, next.data, next.priority);
    }
  }

  addToHistory(category, description, priority) {
    this.contextHistory.push({
      category,
      description,
      priority,
      timestamp: Date.now()
    });
    
    // Mantener solo las últimas 20 descripciones
    if (this.contextHistory.length > 20) {
      this.contextHistory = this.contextHistory.slice(-20);
    }
  }

  // Métodos específicos para diferentes tipos de descripciones

  describeEnvironment(location, details = {}) {
    const locationDesc = this.descriptions.get('locations')[location] || location;
    
    this.describe('environment', 'entering', {
      location: location,
      description: locationDesc
    }, this.priorities.get('environmental'));
    
    // Describir detalles ambientales si están disponibles
    if (details.sounds) {
      setTimeout(() => {
        this.describe('environment', 'ambient', {
          sounds: details.sounds
        }, this.priorities.get('ambient'));
      }, 2000);
    }
    
    if (details.mood) {
      setTimeout(() => {
        this.describe('environment', 'atmosphere', {
          mood: this.descriptions.get('moods')[details.mood] || details.mood
        }, this.priorities.get('ambient'));
      }, 4000);
    }
  }

  describeSocialActivity(activity, participants = []) {
    const activityDesc = this.descriptions.get('activities')[activity] || activity;
    
    if (participants.length > 1) {
      this.describe('social', 'gathering', {
        count: participants.length
      }, this.priorities.get('social'));
    }
    
    this.describe('social', 'activity', {
      activity: activityDesc
    }, this.priorities.get('social'));
  }

  describeUserJoined(username, location) {
    this.describe('social', 'userJoined', {
      user: username,
      location: location ? `en ${location}` : 'a la comunidad'
    }, this.priorities.get('social'));
  }

  describeAudioChange(type, details) {
    const templates = {
      'volume': 'volumeChange',
      'mute': 'channelMute',
      'spatial': 'spatialChange',
      'music': 'musicChange',
      'effect': 'effectPlaying'
    };
    
    const template = templates[type];
    if (template) {
      this.describe('audio', template, details, this.priorities.get('audio'));
    }
  }

  describeCulturalEvent(eventType, details) {
    const priority = this.priorities.get('cultural');
    
    switch (eventType) {
      case 'ceremony-start':
        this.describe('cultural', 'ceremonyStart', details, priority);
        break;
      case 'ceremony-phase':
        this.describe('cultural', 'ceremonyPhase', details, priority);
        break;
      case 'traditional-music':
        this.describe('cultural', 'traditionalMusic', details, priority);
        break;
      case 'cultural-moment':
        this.describe('cultural', 'culturalMoment', details, priority);
        break;
    }
  }

  describeInterface(action, details) {
    const templates = {
      'panel-open': 'panelOpened',
      'panel-close': 'panelClosed',
      'button-click': 'buttonActivated',
      'slider-change': 'sliderChanged',
      'mode-change': 'modeChanged'
    };
    
    const template = templates[action];
    if (template) {
      this.describe('interface', template, details, this.priorities.get('interface'));
    }
  }

  describeNavigation(action, details) {
    const templates = {
      'menu-enter': 'menuEntered',
      'option-select': 'optionSelected',
      'tab-change': 'tabChanged',
      'dialog-open': 'dialogOpened'
    };
    
    const template = templates[action];
    if (template) {
      this.describe('navigation', template, details, this.priorities.get('navigation'));
    }
  }

  // Métodos de configuración

  setVerbosity(level) {
    if (['low', 'medium', 'high', 'detailed'].includes(level)) {
      this.verbosity = level;
      this.savePreferences();
    }
  }

  setAutoDescribe(enabled) {
    this.autoDescribe = enabled;
    this.savePreferences();
  }

  setMinInterval(interval) {
    this.minInterval = Math.max(1000, interval); // Mínimo 1 segundo
  }

  updateEnvironmentalContext(context) {
    this.environmentalContext = context;
  }

  updateSocialContext(context) {
    this.socialContext = context;
  }

  updateCurrentActivity(activity) {
    this.currentActivity = activity;
  }

  // Event listeners

  setupEventListeners() {
    // Eventos de navegación
    document.addEventListener('location:changed', (e) => {
      if (this.autoDescribe) {
        this.describeEnvironment(e.detail.location, e.detail.details);
      }
    });
    
    // Eventos sociales
    document.addEventListener('user:joined', (e) => {
      if (this.autoDescribe) {
        this.describeUserJoined(e.detail.username, e.detail.location);
      }
    });
    
    document.addEventListener('social:activityChanged', (e) => {
      if (this.autoDescribe) {
        this.describeSocialActivity(e.detail.activity, e.detail.participants);
      }
    });
    
    // Eventos de audio
    this.audioManager.events?.addEventListener('volumeChanged', (e) => {
      if (this.autoDescribe && e.detail.userInitiated) {
        this.describeAudioChange('volume', {
          channel: e.detail.channel,
          level: Math.round(e.detail.volume * 100)
        });
      }
    });
    
    this.audioManager.events?.addEventListener('channelMuted', (e) => {
      if (this.autoDescribe) {
        this.describeAudioChange('mute', {
          channel: e.detail.channel,
          state: e.detail.muted ? 'silenciado' : 'reactivado'
        });
      }
    });
    
    // Eventos culturales
    document.addEventListener('cultural:ceremonyStarted', (e) => {
      if (this.autoDescribe) {
        this.describeCulturalEvent('ceremony-start', {
          name: e.detail.name
        });
      }
    });
    
    document.addEventListener('cultural:ceremonyPhase', (e) => {
      if (this.autoDescribe) {
        this.describeCulturalEvent('ceremony-phase', {
          phase: e.detail.phase
        });
      }
    });
    
    // Eventos de interfaz
    document.addEventListener('interface:panelToggled', (e) => {
      if (this.autoDescribe) {
        this.describeInterface(e.detail.opened ? 'panel-open' : 'panel-close', {
          type: e.detail.type
        });
      }
    });
    
    // Eventos de preferencias
    document.addEventListener('preference:changed', (e) => {
      if (e.detail.path.startsWith('descriptions.')) {
        const setting = e.detail.path.split('.')[1];
        if (setting === 'verbosity') {
          this.setVerbosity(e.detail.value);
        } else if (setting === 'autoDescribe') {
          this.setAutoDescribe(e.detail.value);
        }
      }
    });
  }

  // Gestión de preferencias

  savePreferences() {
    const preferences = {
      enabled: this.isEnabled,
      verbosity: this.verbosity,
      autoDescribe: this.autoDescribe,
      minInterval: this.minInterval
    };
    
    localStorage.setItem('audioDescriptionsPreferences', JSON.stringify(preferences));
  }

  loadUserPreferences() {
    try {
      const saved = localStorage.getItem('audioDescriptionsPreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        
        this.isEnabled = preferences.enabled !== false;
        this.verbosity = preferences.verbosity || 'medium';
        this.autoDescribe = preferences.autoDescribe !== false;
        this.minInterval = preferences.minInterval || 3000;
      }
    } catch (error) {
      console.warn('Error loading audio descriptions preferences:', error);
    }
  }

  enable() {
    this.isEnabled = true;
    this.describe('interface', 'settingToggled', {
      setting: 'Descripciones de audio',
      state: 'activadas'
    }, this.priorities.get('interface'));
  }

  disable() {
    this.isEnabled = false;
  }

  dispose() {
    this.descriptionQueue = [];
    this.contextHistory = [];
    this.userInteractions.clear();
    this.isInitialized = false;
  }
}

export default AudioDescriptions;