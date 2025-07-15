/**
 * Dynamic Soundtrack - Banda sonora dinámica adaptativa
 * Gestiona la música que se adapta al contexto, emociones y actividades
 */

class DynamicSoundtrack {
  constructor(musicConductor, audioManager) {
    this.musicConductor = musicConductor;
    this.audioManager = audioManager;
    this.currentContext = 'neutral';
    this.emotionalIntensity = 0.5;
    this.activityLevel = 0.5;
    this.timeOfDay = 'day';
    this.weatherCondition = 'clear';
    this.socialContext = 'individual';
    this.adaptationSettings = {
      contextSensitivity: 0.8,
      emotionalResponsiveness: 0.9,
      activityAdaptation: 0.7,
      environmentalAwareness: 0.6,
      socialResponsiveness: 0.8
    };
    this.musicStates = new Map();
    this.transitionQueue = [];
    this.isTransitioning = false;
    this.adaptationHistory = [];
  }

  initialize() {
    this.setupMusicStates();
    this.setupEventListeners();
    this.startAdaptationLoop();
    console.log('Dynamic Soundtrack initialized');
  }

  setupMusicStates() {
    // Estados musicales base
    this.musicStates.set('exploration', {
      theme: 'exploration',
      tempo: 1.0,
      intensity: 0.6,
      layers: ['ambient', 'melody'],
      contextTags: ['discovery', 'movement', 'curiosity']
    });

    this.musicStates.set('social', {
      theme: 'community',
      tempo: 1.1,
      intensity: 0.7,
      layers: ['ambient', 'melody', 'harmony'],
      contextTags: ['gathering', 'interaction', 'collaboration']
    });

    this.musicStates.set('contemplation', {
      theme: 'contemplation',
      tempo: 0.8,
      intensity: 0.4,
      layers: ['ambient'],
      contextTags: ['reflection', 'peace', 'solitude']
    });

    this.musicStates.set('celebration', {
      theme: 'celebration',
      tempo: 1.2,
      intensity: 0.9,
      layers: ['ambient', 'melody', 'rhythm', 'harmony', 'percussion'],
      contextTags: ['joy', 'achievement', 'community']
    });

    this.musicStates.set('cultural', {
      theme: 'cultural',
      tempo: 1.0,
      intensity: 0.7,
      layers: ['ambient', 'melody', 'traditional'],
      contextTags: ['tradition', 'heritage', 'ceremony']
    });

    this.musicStates.set('mystery', {
      theme: 'exploration',
      tempo: 0.9,
      intensity: 0.5,
      layers: ['ambient'],
      contextTags: ['unknown', 'discovery', 'suspense']
    });
  }

  adaptToContext(contextData) {
    const {
      activity = null,
      emotion = null,
      socialPresence = null,
      environment = null,
      timeOfDay = null,
      weather = null,
      userCount = 1,
      eventType = null
    } = contextData;

    // Actualizar estado interno
    if (emotion) this.setEmotionalState(emotion);
    if (activity) this.setActivityLevel(activity);
    if (socialPresence) this.setSocialContext(socialPresence, userCount);
    if (environment) this.setEnvironmentalContext(environment);
    if (timeOfDay) this.timeOfDay = timeOfDay;
    if (weather) this.weatherCondition = weather;

    // Determinar nuevo estado musical
    const targetState = this.calculateOptimalMusicState();
    
    if (targetState !== this.currentContext) {
      this.transitionToState(targetState);
    } else {
      this.adjustCurrentState();
    }

    // Registrar adaptación
    this.recordAdaptation(contextData, targetState);
  }

  calculateOptimalMusicState() {
    const factors = {
      social: this.socialContext !== 'individual' ? 0.8 : 0.2,
      activity: this.activityLevel,
      emotion: this.emotionalIntensity,
      celebration: this.detectCelebration() ? 1.0 : 0.0,
      cultural: this.detectCulturalMoment() ? 1.0 : 0.0,
      contemplation: this.detectContemplation() ? 0.9 : 0.1
    };

    // Calcular puntuaciones para cada estado
    const stateScores = new Map();

    this.musicStates.forEach((state, name) => {
      let score = 0.5; // Base score

      // Factor social
      if (state.contextTags.includes('gathering') || state.contextTags.includes('community')) {
        score += factors.social * this.adaptationSettings.socialResponsiveness;
      }

      // Factor actividad
      if (state.contextTags.includes('movement') && factors.activity > 0.6) {
        score += 0.3 * this.adaptationSettings.activityAdaptation;
      }

      // Factor emocional
      if (state.contextTags.includes('joy') && factors.emotion > 0.7) {
        score += 0.4 * this.adaptationSettings.emotionalResponsiveness;
      }
      
      if (state.contextTags.includes('peace') && factors.emotion < 0.4) {
        score += 0.3 * this.adaptationSettings.emotionalResponsiveness;
      }

      // Factores específicos
      if (name === 'celebration' && factors.celebration > 0.5) {
        score += 0.6;
      }
      
      if (name === 'cultural' && factors.cultural > 0.5) {
        score += 0.5;
      }
      
      if (name === 'contemplation' && factors.contemplation > 0.5) {
        score += 0.4;
      }

      // Factor temporal
      score += this.getTimeOfDayBonus(name);
      
      // Factor ambiental
      score += this.getEnvironmentalBonus(name);

      stateScores.set(name, Math.min(1.0, score));
    });

    // Encontrar el estado con mayor puntuación
    let bestState = 'exploration';
    let bestScore = 0;

    stateScores.forEach((score, state) => {
      if (score > bestScore) {
        bestScore = score;
        bestState = state;
      }
    });

    return bestState;
  }

  transitionToState(newState, duration = 3.0) {
    if (this.isTransitioning) {
      this.transitionQueue.push({ state: newState, duration });
      return;
    }

    this.isTransitioning = true;
    const previousState = this.currentContext;
    this.currentContext = newState;

    const musicState = this.musicStates.get(newState);
    if (!musicState) return;

    // Configurar transición musical
    this.musicConductor.setTheme(musicState.theme, {
      fadeOut: duration * 0.4,
      fadeIn: duration * 0.6
    });

    // Ajustar capas musicales
    setTimeout(() => {
      this.applyLayerConfiguration(musicState);
    }, duration * 400);

    // Completar transición
    setTimeout(() => {
      this.isTransitioning = false;
      this.processTransitionQueue();
      
      // Emitir evento de cambio de estado
      document.dispatchEvent(new CustomEvent('soundtrack:stateChanged', {
        detail: { 
          from: previousState, 
          to: newState, 
          musicState 
        }
      }));
    }, duration * 1000);
  }

  applyLayerConfiguration(musicState) {
    const { layers, tempo, intensity } = musicState;

    // Activar capas necesarias
    ['ambient', 'melody', 'rhythm', 'harmony', 'percussion', 'traditional'].forEach(layer => {
      const shouldBeActive = layers.includes(layer);
      this.musicConductor.toggleLayer(layer, shouldBeActive);
    });

    // Ajustar intensidad
    this.adjustIntensity(intensity);
  }

  adjustCurrentState() {
    const currentMusicState = this.musicStates.get(this.currentContext);
    if (!currentMusicState) return;

    // Ajustes sutiles basados en cambios menores
    this.adjustVolumeByActivity();
    this.adjustTempoByEmotion();
    this.adjustLayersByContext();
  }

  adjustVolumeByActivity() {
    const baseVolume = 0.7;
    const activityMultiplier = 0.8 + (this.activityLevel * 0.4);
    const targetVolume = baseVolume * activityMultiplier;
    
    this.musicConductor.setLayerVolume('rhythm', targetVolume);
    this.musicConductor.setLayerVolume('percussion', targetVolume * 0.8);
  }

  adjustTempoByEmotion() {
    // Ajuste sutil del tempo basado en emoción
    const tempoVariation = (this.emotionalIntensity - 0.5) * 0.2;
    // Implementar ajuste de tempo si es soportado
  }

  adjustLayersByContext() {
    if (this.socialContext === 'group') {
      this.musicConductor.setLayerVolume('harmony', 0.8);
    } else {
      this.musicConductor.setLayerVolume('harmony', 0.4);
    }
  }

  setEmotionalState(emotion) {
    const emotionMap = {
      'joy': 0.9,
      'excitement': 0.95,
      'happiness': 0.8,
      'contentment': 0.6,
      'calm': 0.4,
      'peace': 0.3,
      'sadness': 0.2,
      'melancholy': 0.25,
      'anger': 0.85,
      'surprise': 0.75,
      'wonder': 0.7,
      'mystery': 0.5
    };

    this.emotionalIntensity = emotionMap[emotion] || 0.5;
    this.musicConductor.setEmotionalState(emotion, this.emotionalIntensity);
  }

  setActivityLevel(activity) {
    const activityMap = {
      'resting': 0.1,
      'contemplating': 0.2,
      'observing': 0.3,
      'walking': 0.5,
      'exploring': 0.7,
      'interacting': 0.8,
      'playing': 0.9,
      'celebrating': 1.0
    };

    this.activityLevel = activityMap[activity] || 0.5;
  }

  setSocialContext(presence, userCount = 1) {
    this.socialContext = presence;
    
    if (userCount > 5) {
      this.socialContext = 'gathering';
    } else if (userCount > 1) {
      this.socialContext = 'group';
    } else {
      this.socialContext = 'individual';
    }
  }

  setEnvironmentalContext(environment) {
    const environmentalEffects = {
      'forest': () => this.enhanceNatureSounds(),
      'ocean': () => this.enhanceWaterSounds(),
      'mountain': () => this.enhanceEchoEffects(),
      'urban': () => this.reduceNatureSounds(),
      'indoor': () => this.enhanceIntimacy(),
      'sacred': () => this.enhanceReverb()
    };

    const effect = environmentalEffects[environment];
    if (effect) effect();
  }

  getTimeOfDayBonus(stateName) {
    const timeBonus = {
      'dawn': { contemplation: 0.2, mystery: 0.1 },
      'morning': { exploration: 0.2, social: 0.1 },
      'day': { social: 0.2, exploration: 0.1 },
      'evening': { cultural: 0.2, contemplation: 0.1 },
      'night': { mystery: 0.3, contemplation: 0.2 },
      'midnight': { mystery: 0.4, contemplation: 0.1 }
    };

    return timeBonus[this.timeOfDay]?.[stateName] || 0;
  }

  getEnvironmentalBonus(stateName) {
    const envBonus = {
      'clear': { exploration: 0.1, social: 0.1 },
      'rain': { contemplation: 0.2, mystery: 0.1 },
      'storm': { mystery: 0.3, contemplation: 0.1 },
      'mist': { mystery: 0.2, contemplation: 0.2 },
      'snow': { contemplation: 0.3, peace: 0.2 }
    };

    return envBonus[this.weatherCondition]?.[stateName] || 0;
  }

  detectCelebration() {
    return this.socialContext === 'gathering' && 
           this.emotionalIntensity > 0.7 && 
           this.activityLevel > 0.6;
  }

  detectCulturalMoment() {
    // Detectar momentos culturales basado en contexto
    return false; // Implementar lógica específica
  }

  detectContemplation() {
    return this.activityLevel < 0.3 && 
           this.socialContext === 'individual' &&
           this.emotionalIntensity < 0.6;
  }

  enhanceNatureSounds() {
    this.musicConductor.setLayerVolume('ambient', 0.8);
  }

  enhanceWaterSounds() {
    // Implementar efectos específicos de agua
  }

  enhanceEchoEffects() {
    // Implementar efectos de eco/reverb
  }

  reduceNatureSounds() {
    this.musicConductor.setLayerVolume('ambient', 0.4);
  }

  enhanceIntimacy() {
    this.musicConductor.setLayerVolume('melody', 0.9);
    this.musicConductor.setLayerVolume('harmony', 0.3);
  }

  enhanceReverb() {
    // Implementar aumento de reverb
  }

  processTransitionQueue() {
    if (this.transitionQueue.length > 0 && !this.isTransitioning) {
      const nextTransition = this.transitionQueue.shift();
      this.transitionToState(nextTransition.state, nextTransition.duration);
    }
  }

  recordAdaptation(contextData, resultingState) {
    const record = {
      timestamp: Date.now(),
      context: { ...contextData },
      state: resultingState,
      emotion: this.emotionalIntensity,
      activity: this.activityLevel,
      social: this.socialContext
    };

    this.adaptationHistory.push(record);
    
    // Mantener solo los últimos 100 registros
    if (this.adaptationHistory.length > 100) {
      this.adaptationHistory.shift();
    }
  }

  startAdaptationLoop() {
    // Loop de adaptación continua cada 5 segundos
    setInterval(() => {
      this.performContinuousAdaptation();
    }, 5000);
  }

  performContinuousAdaptation() {
    // Adaptaciones sutiles basadas en el estado actual
    const currentState = this.musicStates.get(this.currentContext);
    if (!currentState) return;

    // Micro-ajustes basados en tendencias recientes
    this.adjustCurrentState();
  }

  setupEventListeners() {
    document.addEventListener('user:activity', (event) => {
      this.adaptToContext({ activity: event.detail.activity });
    });

    document.addEventListener('user:emotion', (event) => {
      this.adaptToContext({ emotion: event.detail.emotion });
    });

    document.addEventListener('community:gathering', (event) => {
      this.adaptToContext({ 
        socialPresence: 'gathering',
        userCount: event.detail.participants 
      });
    });

    document.addEventListener('environment:change', (event) => {
      this.adaptToContext({ 
        environment: event.detail.environment,
        weather: event.detail.weather 
      });
    });

    document.addEventListener('time:change', (event) => {
      this.adaptToContext({ timeOfDay: event.detail.timeOfDay });
    });
  }

  getCurrentState() {
    return {
      context: this.currentContext,
      emotion: this.emotionalIntensity,
      activity: this.activityLevel,
      social: this.socialContext,
      timeOfDay: this.timeOfDay,
      weather: this.weatherCondition
    };
  }

  dispose() {
    this.musicStates.clear();
    this.transitionQueue = [];
    this.adaptationHistory = [];
  }
}

export default DynamicSoundtrack;