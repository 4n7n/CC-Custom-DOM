/**
 * Voice Narrator - Sistema de narración por voz
 * Gestiona la síntesis de voz, narraciones contextuales y guías de audio
 */

class VoiceNarrator {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.currentVoice = null;
    this.isEnabled = true;
    this.voiceSettings = {
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8,
      language: 'es-ES',
      voiceType: 'calm' // calm, energetic, friendly, mystical
    };
    this.narrativeQueue = [];
    this.isNarrating = false;
    this.contextualPhrases = new Map();
    this.personalizedGreetings = new Map();
    this.lastNarrationTime = 0;
    this.cooldownPeriod = 3000; // 3 segundos entre narraciones
  }

  async initialize() {
    await this.loadVoices();
    this.setupContextualPhrases();
    this.setupEventListeners();
    console.log('Voice Narrator initialized');
  }

  async loadVoices() {
    return new Promise((resolve) => {
      const loadVoicesWhenReady = () => {
        this.voices = this.synthesis.getVoices();
        
        if (this.voices.length > 0) {
          this.selectBestVoice();
          resolve();
        } else {
          setTimeout(loadVoicesWhenReady, 100);
        }
      };
      
      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = loadVoicesWhenReady;
      }
      
      loadVoicesWhenReady();
    });
  }

  selectBestVoice() {
    // Priorizar voces en español
    const spanishVoices = this.voices.filter(voice => 
      voice.lang.startsWith('es') && voice.name.includes('Female')
    );
    
    if (spanishVoices.length > 0) {
      this.currentVoice = spanishVoices[0];
    } else {
      // Fallback a cualquier voz disponible
      this.currentVoice = this.voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Female')
      ) || this.voices[0];
    }
    
    console.log('Selected voice:', this.currentVoice?.name);
  }

  setupContextualPhrases() {
    this.contextualPhrases.set('welcome', [
      'Bienvenido a nuestra comunidad virtual',
      'Es un placer tenerte aquí',
      'Explora y descubre junto a nosotros'
    ]);
    
    this.contextualPhrases.set('discovery', [
      'Has encontrado algo interesante',
      'Aquí hay algo que merece tu atención',
      'Este lugar guarda secretos especiales'
    ]);
    
    this.contextualPhrases.set('gathering', [
      'La comunidad se está reuniendo',
      'Únete a la celebración',
      'Todos son bienvenidos en este encuentro'
    ]);
    
    this.contextualPhrases.set('guidance', [
      'Te guío hacia nuevas experiencias',
      'Permíteme mostrarte el camino',
      'Juntos exploraremos este espacio'
    ]);
    
    this.contextualPhrases.set('cultural', [
      'Descubre las tradiciones de nuestra comunidad',
      'Cada cultura aporta su sabiduría única',
      'La diversidad nos enriquece a todos'
    ]);
    
    this.contextualPhrases.set('reflection', [
      'Tómate un momento para reflexionar',
      'La contemplación trae claridad',
      'En la quietud encontramos respuestas'
    ]);
  }

  narrate(text, options = {}) {
    if (!this.isEnabled || !this.currentVoice) return;
    
    const now = Date.now();
    if (now - this.lastNarrationTime < this.cooldownPeriod) {
      return; // Evitar saturación de audio
    }
    
    const {
      priority = 'normal',
      interrupt = false,
      context = null,
      personalized = false,
      userId = null
    } = options;
    
    const narration = {
      text,
      priority,
      interrupt,
      context,
      personalized,
      userId,
      timestamp: now
    };
    
    if (interrupt) {
      this.stopNarration();
      this.narrativeQueue.unshift(narration);
    } else {
      this.narrativeQueue.push(narration);
    }
    
    if (!this.isNarrating) {
      this.processNarrationQueue();
    }
  }

  async processNarrationQueue() {
    if (this.narrativeQueue.length === 0) {
      this.isNarrating = false;
      return;
    }
    
    this.isNarrating = true;
    const narration = this.narrativeQueue.shift();
    
    await this.speakText(narration.text, narration);
    
    // Procesar siguiente elemento en la cola
    setTimeout(() => {
      this.processNarrationQueue();
    }, 500);
  }

  async speakText(text, narration) {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configurar voz y parámetros
      utterance.voice = this.currentVoice;
      utterance.rate = this.voiceSettings.rate;
      utterance.pitch = this.voiceSettings.pitch;
      utterance.volume = this.voiceSettings.volume;
      utterance.lang = this.voiceSettings.language;
      
      // Ajustar según tipo de voz
      this.applyVoiceType(utterance, narration.context);
      
      // Eventos
      utterance.onend = () => {
        this.lastNarrationTime = Date.now();
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        resolve();
      };
      
      // Reproducir
      this.synthesis.speak(utterance);
    });
  }

  applyVoiceType(utterance, context) {
    switch (this.voiceSettings.voiceType) {
      case 'calm':
        utterance.rate = 0.9;
        utterance.pitch = 0.95;
        break;
      case 'energetic':
        utterance.rate = 1.1;
        utterance.pitch = 1.05;
        break;
      case 'friendly':
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        break;
      case 'mystical':
        utterance.rate = 0.8;
        utterance.pitch = 0.9;
        break;
    }
    
    // Ajustes contextuales
    if (context === 'cultural') {
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
    } else if (context === 'celebration') {
      utterance.rate = 1.1;
      utterance.pitch = 1.1;
    }
  }

  narrateContextual(context, options = {}) {
    const phrases = this.contextualPhrases.get(context);
    if (!phrases || phrases.length === 0) return;
    
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.narrate(randomPhrase, { ...options, context });
  }

  welcomeUser(userId, userData = {}) {
    const { name, isReturning = false } = userData;
    
    let welcomeText;
    if (isReturning && name) {
      welcomeText = `Bienvenido de vuelta, ${name}`;
    } else if (name) {
      welcomeText = `Hola ${name}, bienvenido a nuestra comunidad`;
    } else {
      welcomeText = 'Bienvenido a nuestra comunidad virtual';
    }
    
    this.narrate(welcomeText, {
      priority: 'high',
      context: 'welcome',
      personalized: true,
      userId
    });
  }

  guideUser(direction, landmark = null) {
    let guideText;
    
    if (landmark) {
      guideText = `Dirígete hacia ${landmark}`;
    } else {
      switch (direction) {
        case 'forward':
          guideText = 'Continúa hacia adelante';
          break;
        case 'left':
          guideText = 'Gira a la izquierda';
          break;
        case 'right':
          guideText = 'Gira a la derecha';
          break;
        case 'back':
          guideText = 'Regresa por donde viniste';
          break;
        default:
          guideText = 'Explora los alrededores';
      }
    }
    
    this.narrate(guideText, {
      priority: 'normal',
      context: 'guidance'
    });
  }

  describeLocation(locationData) {
    const { name, description, culturalSignificance, activities } = locationData;
    
    let descriptionText = `Estás en ${name}`;
    
    if (description) {
      descriptionText += `. ${description}`;
    }
    
    if (culturalSignificance) {
      descriptionText += `. ${culturalSignificance}`;
    }
    
    if (activities && activities.length > 0) {
      descriptionText += `. Aquí puedes ${activities.join(', ')}`;
    }
    
    this.narrate(descriptionText, {
      priority: 'normal',
      context: 'discovery'
    });
  }

  announceEvent(eventData) {
    const { type, name, participants, startTime } = eventData;
    
    let announcement;
    switch (type) {
      case 'gathering':
        announcement = `Se está formando una reunión: ${name}`;
        break;
      case 'celebration':
        announcement = `¡Celebramos ${name}! Todos están invitados`;
        break;
      case 'cultural':
        announcement = `Evento cultural: ${name}`;
        break;
      default:
        announcement = `Evento especial: ${name}`;
    }
    
    if (participants) {
      announcement += `. ${participants} personas participando`;
    }
    
    this.narrate(announcement, {
      priority: 'high',
      context: 'gathering',
      interrupt: true
    });
  }

  setVoiceSettings(settings) {
    this.voiceSettings = { ...this.voiceSettings, ...settings };
    
    // Reseleccionar voz si cambió el idioma
    if (settings.language) {
      this.selectBestVoice();
    }
  }

  stopNarration() {
    this.synthesis.cancel();
    this.isNarrating = false;
  }

  pauseNarration() {
    this.synthesis.pause();
  }

  resumeNarration() {
    this.synthesis.resume();
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
    this.stopNarration();
  }

  setupEventListeners() {
    document.addEventListener('user:enter', (event) => {
      const { userId, userData } = event.detail;
      this.welcomeUser(userId, userData);
    });
    
    document.addEventListener('location:change', (event) => {
      const { locationData } = event.detail;
      this.describeLocation(locationData);
    });
    
    document.addEventListener('community:event', (event) => {
      const { eventData } = event.detail;
      this.announceEvent(eventData);
    });
  }

  dispose() {
    this.stopNarration();
    this.narrativeQueue = [];
    this.contextualPhrases.clear();
    this.personalizedGreetings.clear();
  }
}

export default VoiceNarrator;