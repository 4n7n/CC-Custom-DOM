/**
 * Cultural Audio - Sistema de audio cultural
 * Gestiona sonidos tradicionales, ceremonias y expresiones culturales
 */

class CulturalAudio {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.culturalLibrary = new Map();
    this.activeCeremonies = new Map();
    this.traditionalInstruments = new Map();
    this.culturalContexts = new Map();
    this.isEnabled = true;
    this.currentCulture = null;
    this.settings = {
      respectfulMode: true,
      educationalNarration: true,
      traditionalVolume: 0.7,
      ceremonyVolume: 0.8,
      storytellingVolume: 0.9
    };
    this.ceremonies = new Map();
    this.stories = new Map();
  }

  async initialize() {
    await this.loadCulturalLibrary();
    this.setupCulturalContexts();
    this.setupCeremonies();
    this.setupEventListeners();
    console.log('Cultural Audio initialized');
  }

  async loadCulturalLibrary() {
    const culturalSounds = {
      instruments: {
        'drum_ceremonial': '/audio/cultural/instruments/drum_ceremonial.wav',
        'flute_native': '/audio/cultural/instruments/flute_native.wav',
        'singing_bowl': '/audio/cultural/instruments/singing_bowl.wav',
        'wind_chimes': '/audio/cultural/instruments/wind_chimes.wav',
        'bell_temple': '/audio/cultural/instruments/bell_temple.wav',
        'rain_stick': '/audio/cultural/instruments/rain_stick.wav',
        'didgeridoo': '/audio/cultural/instruments/didgeridoo.wav',
        'tabla': '/audio/cultural/instruments/tabla.wav'
      },
      ceremonies: {
        'welcome_circle': '/audio/cultural/ceremonies/welcome_circle.wav',
        'gratitude_ceremony': '/audio/cultural/ceremonies/gratitude.wav',
        'seasonal_celebration': '/audio/cultural/ceremonies/seasonal.wav',
        'blessing_ritual': '/audio/cultural/ceremonies/blessing.wav',
        'healing_circle': '/audio/cultural/ceremonies/healing.wav',
        'storytelling_opening': '/audio/cultural/ceremonies/storytelling.wav'
      },
      ambient: {
        'forest_spirits': '/audio/cultural/ambient/forest_spirits.wav',
        'ancestor_whispers': '/audio/cultural/ambient/ancestor_whispers.wav',
        'sacred_space': '/audio/cultural/ambient/sacred_space.wav',
        'meditation_bells': '/audio/cultural/ambient/meditation_bells.wav',
        'nature_harmony': '/audio/cultural/ambient/nature_harmony.wav'
      },
      chants: {
        'unity_chant': '/audio/cultural/chants/unity.wav',
        'peace_mantra': '/audio/cultural/chants/peace.wav',
        'gratitude_song': '/audio/cultural/chants/gratitude.wav',
        'healing_chant': '/audio/cultural/chants/healing.wav',
        'celebration_song': '/audio/cultural/chants/celebration.wav'
      }
    };

    // Cargar sonidos culturales
    for (const [category, sounds] of Object.entries(culturalSounds)) {
      for (const [name, url] of Object.entries(sounds)) {
        const soundId = `cultural_${category}_${name}`;
        
        try {
          const loaded = await this.audioManager.loadAudioSource(soundId, url, 'cultural');
          
          if (loaded) {
            this.culturalLibrary.set(soundId, {
              category,
              name,
              culturalContext: this.getCulturalContext(name),
              respectLevel: this.getRespcetLevel(name),
              usage: this.getUsageGuidelines(name)
            });
          }
        } catch (error) {
          console.warn(`Failed to load cultural sound ${soundId}:`, error);
        }
      }
    }
  }

  setupCulturalContexts() {
    this.culturalContexts.set('universal', {
      name: 'Universal Harmony',
      instruments: ['singing_bowl', 'wind_chimes', 'bell_temple'],
      ceremonies: ['welcome_circle', 'gratitude_ceremony'],
      values: ['peace', 'unity', 'respect', 'harmony'],
      restrictions: []
    });

    this.culturalContexts.set('indigenous', {
      name: 'Indigenous Wisdom',
      instruments: ['drum_ceremonial', 'flute_native', 'rain_stick'],
      ceremonies: ['blessing_ritual', 'healing_circle'],
      values: ['connection_to_nature', 'ancestors', 'spirituality'],
      restrictions: ['sacred_only', 'educational_context']
    });

    this.culturalContexts.set('eastern', {
      name: 'Eastern Traditions',
      instruments: ['singing_bowl', 'bell_temple', 'tabla'],
      ceremonies: ['meditation_ceremony', 'seasonal_celebration'],
      values: ['mindfulness', 'balance', 'inner_peace'],
      restrictions: ['respectful_use']
    });

    this.culturalContexts.set('community', {
      name: 'Community Celebration',
      instruments: ['drum_ceremonial', 'wind_chimes'],
      ceremonies: ['welcome_circle', 'seasonal_celebration'],
      values: ['togetherness', 'celebration', 'inclusion'],
      restrictions: []
    });
  }

  setupCeremonies() {
    this.ceremonies.set('welcome_newcomer', {
      name: 'Bienvenida de Nuevo Miembro',
      duration: 120, // 2 minutos
      phases: [
        { 
          phase: 'opening',
          duration: 30,
          sounds: ['cultural_instruments_bell_temple'],
          volume: 0.6,
          narration: 'Damos la bienvenida con respeto y gratitud'
        },
        {
          phase: 'recognition',
          duration: 60,
          sounds: ['cultural_chants_unity_chant', 'cultural_instruments_singing_bowl'],
          volume: 0.7,
          narration: 'Reconocemos tu presencia en nuestra comunidad'
        },
        {
          phase: 'blessing',
          duration: 30,
          sounds: ['cultural_ambient_sacred_space'],
          volume: 0.5,
          narration: 'Que encuentres paz y conexión aquí'
        }
      ],
      culturalContext: 'universal',
      requirements: ['consent', 'respectful_setting']
    });

    this.ceremonies.set('gratitude_circle', {
      name: 'Círculo de Gratitud',
      duration: 180,
      phases: [
        {
          phase: 'gathering',
          duration: 45,
          sounds: ['cultural_instruments_wind_chimes'],
          volume: 0.5
        },
        {
          phase: 'sharing',
          duration: 90,
          sounds: ['cultural_ambient_forest_spirits', 'cultural_instruments_rain_stick'],
          volume: 0.4
        },
        {
          phase: 'closing',
          duration: 45,
          sounds: ['cultural_chants_gratitude_song'],
          volume: 0.6
        }
      ],
      culturalContext: 'community'
    });

    this.ceremonies.set('seasonal_celebration', {
      name: 'Celebración Estacional',
      duration: 300,
      phases: [
        {
          phase: 'invocation',
          duration: 60,
          sounds: ['cultural_instruments_drum_ceremonial'],
          volume: 0.7
        },
        {
          phase: 'celebration',
          duration: 180,
          sounds: ['cultural_chants_celebration_song', 'cultural_instruments_tabla'],
          volume: 0.8
        },
        {
          phase: 'gratitude',
          duration: 60,
          sounds: ['cultural_ambient_nature_harmony'],
          volume: 0.6
        }
      ],
      culturalContext: 'universal'
    });
  }

  startCeremony(ceremonyName, options = {}) {
    if (!this.ceremonies.has(ceremonyName)) {
      console.warn(`Ceremony ${ceremonyName} not found`);
      return null;
    }

    const ceremony = this.ceremonies.get(ceremonyName);
    const {
      participants = [],
      location = null,
      customNarration = false,
      respectfulMode = this.settings.respectfulMode
    } = options;

    // Verificar permisos y contexto apropiado
    if (!this.validateCeremonyContext(ceremony, options)) {
      console.warn(`Ceremony ${ceremonyName} cannot be started - context validation failed`);
      return null;
    }

    const ceremonyInstance = {
      id: `ceremony_${Date.now()}`,
      name: ceremonyName,
      ceremony,
      startTime: Date.now(),
      currentPhase: 0,
      participants,
      location,
      activeSounds: new Set(),
      isActive: true
    };

    this.activeCeremonies.set(ceremonyInstance.id, ceremonyInstance);
    this.executeCeremonyPhase(ceremonyInstance, 0);

    // Notificar inicio de ceremonia
    document.dispatchEvent(new CustomEvent('cultural:ceremonyStarted', {
      detail: { 
        ceremonyId: ceremonyInstance.id,
        name: ceremonyName,
        participants: participants.length
      }
    }));

    return ceremonyInstance.id;
  }

  executeCeremonyPhase(ceremonyInstance, phaseIndex) {
    const { ceremony } = ceremonyInstance;
    
    if (phaseIndex >= ceremony.phases.length) {
      this.completeCeremony(ceremonyInstance.id);
      return;
    }

    const phase = ceremony.phases[phaseIndex];
    ceremonyInstance.currentPhase = phaseIndex;

    // Reproducir sonidos de la fase
    phase.sounds.forEach(soundId => {
      const activeSound = this.audioManager.play(soundId, {
        loop: true,
        volume: phase.volume * this.settings.ceremonyVolume,
        fadeIn: 2.0
      });
      
      if (activeSound) {
        ceremonyInstance.activeSounds.add(activeSound);
      }
    });

    // Narración si está habilitada
    if (phase.narration && this.settings.educationalNarration) {
      setTimeout(() => {
        this.narratePhase(phase.narration);
      }, 3000);
    }

    // Programar siguiente fase
    setTimeout(() => {
      this.transitionToNextPhase(ceremonyInstance);
    }, phase.duration * 1000);
  }

  transitionToNextPhase(ceremonyInstance) {
    // Fade out sonidos actuales
    ceremonyInstance.activeSounds.forEach(sound => {
      try {
        sound.stop();
      } catch (e) {}
    });
    ceremonyInstance.activeSounds.clear();

    // Ejecutar siguiente fase
    this.executeCeremonyPhase(ceremonyInstance, ceremonyInstance.currentPhase + 1);
  }

  completeCeremony(ceremonyId) {
    if (!this.activeCeremonies.has(ceremonyId)) return;

    const ceremonyInstance = this.activeCeremonies.get(ceremonyId);
    
    // Detener todos los sonidos
    ceremonyInstance.activeSounds.forEach(sound => {
      try {
        sound.stop();
      } catch (e) {}
    });

    ceremonyInstance.isActive = false;
    this.activeCeremonies.delete(ceremonyId);

    // Notificar completado
    document.dispatchEvent(new CustomEvent('cultural:ceremonyCompleted', {
      detail: { 
        ceremonyId,
        name: ceremonyInstance.name,
        duration: Date.now() - ceremonyInstance.startTime
      }
    }));
  }

  playInstrument(instrumentName, options = {}) {
    const soundId = `cultural_instruments_${instrumentName}`;
    
    if (!this.culturalLibrary.has(soundId)) {
      console.warn(`Cultural instrument ${instrumentName} not found`);
      return null;
    }

    const {
      intensity = 0.7,
      duration = null,
      respectfulUse = true,
      educationalContext = false
    } = options;

    // Verificar uso apropiado
    if (!this.validateInstrumentUse(instrumentName, options)) {
      return null;
    }

    const playOptions = {
      volume: intensity * this.settings.traditionalVolume,
      loop: duration ? false : true
    };

    if (duration) {
      playOptions.fadeOut = Math.min(duration * 0.1, 2.0);
    }

    return this.audioManager.play(soundId, playOptions);
  }

  startStorytelling(storyType, narrator = 'cultural') {
    const stories = {
      'creation_myth': {
        narration: 'En el principio, cuando el mundo era silencio...',
        backgroundSounds: ['cultural_ambient_ancestor_whispers'],
        duration: 300
      },
      'wisdom_teaching': {
        narration: 'Los ancianos nos enseñan que en cada ser vive la sabiduría...',
        backgroundSounds: ['cultural_ambient_sacred_space'],
        duration: 240
      },
      'community_legend': {
        narration: 'Cuenta la leyenda que esta tierra ha sido hogar...',
        backgroundSounds: ['cultural_ambient_forest_spirits'],
        duration: 180
      }
    };

    const story = stories[storyType];
    if (!story) return null;

    // Iniciar sonidos de fondo
    story.backgroundSounds.forEach(soundId => {
      this.audioManager.play(soundId, {
        loop: true,
        volume: 0.3,
        fadeIn: 3.0
      });
    });

    // Iniciar narración
    setTimeout(() => {
      this.narrateStory(story.narration);
    }, 2000);

    return story;
  }

  validateCeremonyContext(ceremony, options) {
    if (!this.settings.respectfulMode) return true;

    const context = this.culturalContexts.get(ceremony.culturalContext);
    if (!context) return true;

    // Verificar restricciones
    if (context.restrictions.includes('sacred_only') && !options.sacredContext) {
      return false;
    }

    if (context.restrictions.includes('educational_context') && !options.educationalContext) {
      return false;
    }

    return true;
  }

  validateInstrumentUse(instrumentName, options) {
    const soundId = `cultural_instruments_${instrumentName}`;
    const sound = this.culturalLibrary.get(soundId);
    
    if (!sound) return false;

    // Verificar nivel de respeto requerido
    if (sound.respectLevel === 'high' && !options.respectfulUse) {
      return false;
    }

    return true;
  }

  getCulturalContext(soundName) {
    const contextMap = {
      'drum_ceremonial': 'indigenous',
      'singing_bowl': 'eastern',
      'wind_chimes': 'universal',
      'bell_temple': 'eastern',
      'flute_native': 'indigenous'
    };

    return contextMap[soundName] || 'universal';
  }

  getRespcetLevel(soundName) {
    const respectMap = {
      'drum_ceremonial': 'high',
      'blessing_ritual': 'high',
      'ancestor_whispers': 'high',
      'singing_bowl': 'medium',
      'wind_chimes': 'low',
      'gratitude_ceremony': 'medium'
    };

    return respectMap[soundName] || 'low';
  }

  getUsageGuidelines(soundName) {
    return {
      appropriate: ['educational', 'respectful_ceremony', 'community_building'],
      inappropriate: ['entertainment_only', 'commercial_use', 'mockery'],
      notes: 'Use with cultural sensitivity and respect'
    };
  }

  narratePhase(text) {
    // Integrar con voice narrator si está disponible
    document.dispatchEvent(new CustomEvent('voice:narrate', {
      detail: { 
        text, 
        context: 'cultural',
        priority: 'high'
      }
    }));
  }

  narrateStory(text) {
    document.dispatchEvent(new CustomEvent('voice:narrate', {
      detail: { 
        text, 
        context: 'storytelling',
        priority: 'high',
        voiceType: 'mystical'
      }
    }));
  }

  setCulturalSensitivity(level) {
    const levels = {
      'low': { respectfulMode: false, educationalNarration: false },
      'medium': { respectfulMode: true, educationalNarration: false },
      'high': { respectfulMode: true, educationalNarration: true }
    };

    if (levels[level]) {
      Object.assign(this.settings, levels[level]);
    }
  }

  createCulturalMoment(type, participants = []) {
    const moments = {
      'gratitude_pause': () => {
        this.playInstrument('singing_bowl', { intensity: 0.5 });
        setTimeout(() => {
          this.narratePhase('Tomemos un momento para agradecer');
        }, 2000);
      },
      'unity_breath': () => {
        this.playInstrument('wind_chimes', { intensity: 0.4 });
        this.narratePhase('Respiremos juntos en unidad');
      },
      'wisdom_sharing': () => {
        this.audioManager.play('cultural_ambient_sacred_space', {
          loop: true,
          volume: 0.3,
          fadeIn: 3.0
        });
        this.narratePhase('Compartamos nuestra sabiduría');
      },
      'celebration_moment': () => {
        this.playInstrument('drum_ceremonial', { intensity: 0.7 });
        this.narratePhase('Celebremos este momento especial');
      }
    };

    const moment = moments[type];
    if (moment) {
      moment();
      
      // Registrar momento cultural
      document.dispatchEvent(new CustomEvent('cultural:momentCreated', {
        detail: { 
          type, 
          participants: participants.length,
          timestamp: Date.now()
        }
      }));
    }
  }

  respondToEmotion(emotion, intensity) {
    const emotionalResponses = {
      'joy': () => this.playInstrument('wind_chimes', { intensity: 0.6 }),
      'sadness': () => this.playInstrument('singing_bowl', { intensity: 0.4 }),
      'peace': () => this.audioManager.play('cultural_ambient_meditation_bells', { 
        volume: 0.3, 
        loop: true 
      }),
      'gratitude': () => {
        this.playInstrument('bell_temple', { intensity: 0.5 });
        this.narratePhase('La gratitud llena nuestros corazones');
      },
      'wonder': () => this.audioManager.play('cultural_ambient_nature_harmony', {
        volume: 0.4,
        loop: true
      })
    };

    const response = emotionalResponses[emotion];
    if (response && intensity > 0.6) {
      response();
    }
  }

  createSacredSpace(location, duration = 600) {
    const sacredSpace = {
      id: `sacred_${Date.now()}`,
      location,
      startTime: Date.now(),
      duration,
      activeSounds: new Set(),
      isActive: true
    };

    // Sonidos de espacio sagrado
    const sacredSounds = [
      'cultural_ambient_sacred_space',
      'cultural_instruments_singing_bowl',
      'cultural_ambient_meditation_bells'
    ];

    sacredSounds.forEach(soundId => {
      const sound = this.audioManager.play(soundId, {
        loop: true,
        volume: 0.3,
        fadeIn: 5.0,
        spatial: true,
        position: location
      });
      
      if (sound) {
        sacredSpace.activeSounds.add(sound);
      }
    });

    // Programar cierre del espacio sagrado
    setTimeout(() => {
      this.closeSacredSpace(sacredSpace.id);
    }, duration * 1000);

    return sacredSpace.id;
  }

  closeSacredSpace(spaceId) {
    // Implementar cierre gradual del espacio sagrado
    // Fade out de sonidos
  }

  getActiveCeremonies() {
    return Array.from(this.activeCeremonies.values()).map(ceremony => ({
      id: ceremony.id,
      name: ceremony.name,
      phase: ceremony.ceremony.phases[ceremony.currentPhase]?.phase || 'completed',
      participants: ceremony.participants.length,
      elapsed: Date.now() - ceremony.startTime
    }));
  }

  setupEventListeners() {
    document.addEventListener('community:gathering', (event) => {
      const { type, participants } = event.detail;
      
      if (type === 'welcome_new_member') {
        this.startCeremony('welcome_newcomer', { participants });
      } else if (type === 'celebration') {
        this.startCeremony('seasonal_celebration', { participants });
      }
    });

    document.addEventListener('user:emotion', (event) => {
      const { emotion, intensity } = event.detail;
      this.respondToEmotion(emotion, intensity);
    });

    document.addEventListener('cultural:request', (event) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'ceremony':
          this.startCeremony(data.ceremonyName, data.options);
          break;
        case 'instrument':
          this.playInstrument(data.instrumentName, data.options);
          break;
        case 'storytelling':
          this.startStorytelling(data.storyType);
          break;
        case 'cultural_moment':
          this.createCulturalMoment(data.momentType, data.participants);
          break;
      }
    });

    document.addEventListener('location:sacred', (event) => {
      const { location, duration } = event.detail;
      this.createSacredSpace(location, duration);
    });
  }

  enableEducationalMode(enabled = true) {
    this.settings.educationalNarration = enabled;
    
    if (enabled) {
      // Proporcionar información educativa sobre sonidos culturales
      this.provideEducationalContext();
    }
  }

  provideEducationalContext() {
    const educationalInfo = {
      'singing_bowl': 'Los cuencos tibetanos se usan tradicionalmente para meditación y sanación',
      'drum_ceremonial': 'Los tambores ceremoniales conectan con el latido del corazón de la Tierra',
      'wind_chimes': 'Las campanillas de viento representan la armonía entre los elementos',
      'rain_stick': 'El palo de lluvia imita el sonido del agua y se usa para llamar a la lluvia'
    };

    // Mostrar información cuando se usa cada instrumento
    Object.entries(educationalInfo).forEach(([instrument, info]) => {
      document.addEventListener(`cultural:${instrument}_played`, () => {
        if (this.settings.educationalNarration) {
          setTimeout(() => {
            this.narratePhase(info);
          }, 3000);
        }
      });
    });
  }

  getCulturalGuidelines() {
    return {
      usage: {
        appropriate: [
          'Ceremonias respetuosas',
          'Momentos de reflexión',
          'Celebraciones comunitarias',
          'Contexto educacional'
        ],
        inappropriate: [
          'Entretenimiento superficial',
          'Uso comercial sin permiso',
          'Parodia o burla',
          'Apropiación cultural'
        ]
      },
      principles: [
        'Respeto por las tradiciones',
        'Uso consciente y apropiado',
        'Educación cultural',
        'Inclusión y diversidad',
        'Sensibilidad cultural'
      ],
      restrictions: [
        'Algunos sonidos requieren contexto sagrado',
        'Uso educacional preferido',
        'Evitar la trivialización',
        'Respetar el significado original'
      ]
    };
  }

  dispose() {
    // Completar todas las ceremonias activas
    this.activeCeremonies.forEach((ceremony, id) => {
      this.completeCeremony(id);
    });

    this.culturalLibrary.clear();
    this.activeCeremonies.clear();
    this.traditionalInstruments.clear();
    this.culturalContexts.clear();
    this.ceremonies.clear();
    this.stories.clear();
  }
}

export default CulturalAudio;