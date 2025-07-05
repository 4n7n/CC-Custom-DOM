/**
 * SFX Controller - Controlador de efectos de sonido
 * Gestiona efectos sonoros, sonidos de interacción y audio reactivo
 */

class SFXController {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.sfxLibrary = new Map();
    this.activeSounds = new Map();
    this.soundPools = new Map();
    this.settings = {
      masterVolume: 0.8,
      uiVolume: 0.7,
      ambientVolume: 0.6,
      interactionVolume: 0.9,
      maxConcurrentSounds: 32,
      spatialEffects: true
    };
    this.categories = {
      ui: new Set(),
      interaction: new Set(),
      ambient: new Set(),
      environmental: new Set(),
      feedback: new Set(),
      cultural: new Set()
    };
    this.chainedSounds = new Map();
    this.randomVariations = new Map();
  }

  async initialize() {
    await this.loadSFXLibrary();
    this.setupEventListeners();
    this.createSoundPools();
    console.log('SFX Controller initialized');
  }

  async loadSFXLibrary() {
    const sfxConfig = {
      ui: {
        click: '/audio/sfx/ui/click.wav',
        hover: '/audio/sfx/ui/hover.wav',
        select: '/audio/sfx/ui/select.wav',
        toggle: '/audio/sfx/ui/toggle.wav',
        notification: '/audio/sfx/ui/notification.wav',
        error: '/audio/sfx/ui/error.wav',
        success: '/audio/sfx/ui/success.wav',
        modal_open: '/audio/sfx/ui/modal_open.wav',
        modal_close: '/audio/sfx/ui/modal_close.wav'
      },
      interaction: {
        pick_up: '/audio/sfx/interaction/pick_up.wav',
        drop: '/audio/sfx/interaction/drop.wav',
        place: '/audio/sfx/interaction/place.wav',
        move: '/audio/sfx/interaction/move.wav',
        connect: '/audio/sfx/interaction/connect.wav',
        disconnect: '/audio/sfx/interaction/disconnect.wav',
        rotate: '/audio/sfx/interaction/rotate.wav',
        resize: '/audio/sfx/interaction/resize.wav'
      },
      ambient: {
        wind_gentle: '/audio/sfx/ambient/wind_gentle.wav',
        water_flow: '/audio/sfx/ambient/water_flow.wav',
        birds_chirping: '/audio/sfx/ambient/birds_chirping.wav',
        leaves_rustle: '/audio/sfx/ambient/leaves_rustle.wav',
        fire_crackling: '/audio/sfx/ambient/fire_crackling.wav',
        ocean_waves: '/audio/sfx/ambient/ocean_waves.wav'
      },
      environmental: {
        footstep_grass: '/audio/sfx/env/footstep_grass.wav',
        footstep_stone: '/audio/sfx/env/footstep_stone.wav',
        footstep_wood: '/audio/sfx/env/footstep_wood.wav',
        door_open: '/audio/sfx/env/door_open.wav',
        door_close: '/audio/sfx/env/door_close.wav',
        bell_chime: '/audio/sfx/env/bell_chime.wav',
        echo_space: '/audio/sfx/env/echo_space.wav'
      },
      feedback: {
        positive: '/audio/sfx/feedback/positive.wav',
        negative: '/audio/sfx/feedback/negative.wav',
        neutral: '/audio/sfx/feedback/neutral.wav',
        achievement: '/audio/sfx/feedback/achievement.wav',
        progress: '/audio/sfx/feedback/progress.wav',
        completion: '/audio/sfx/feedback/completion.wav'
      },
      cultural: {
        drum_beat: '/audio/sfx/cultural/drum_beat.wav',
        flute_melody: '/audio/sfx/cultural/flute_melody.wav',
        singing_bowl: '/audio/sfx/cultural/singing_bowl.wav',
        wind_chimes: '/audio/sfx/cultural/wind_chimes.wav',
        traditional_bell: '/audio/sfx/cultural/traditional_bell.wav'
      }
    };

    // Cargar sonidos por categoría
    for (const [category, sounds] of Object.entries(sfxConfig)) {
      for (const [soundName, url] of Object.entries(sounds)) {
        const soundId = `${category}_${soundName}`;
        
        try {
          const loaded = await this.audioManager.loadAudioSource(soundId, url, 'sfx');
          
          if (loaded) {
            this.sfxLibrary.set(soundId, {
              category,
              name: soundName,
              url,
              loaded: true
            });
            
            this.categories[category].add(soundId);
          }
        } catch (error) {
          console.warn(`Failed to load SFX ${soundId}:`, error);
        }
      }
    }

    // Configurar variaciones aleatorias
    this.setupRandomVariations();
  }

  setupRandomVariations() {
    // Configurar sonidos con variaciones aleatorias
    const variationGroups = {
      footsteps: ['environmental_footstep_grass', 'environmental_footstep_stone', 'environmental_footstep_wood'],
      ui_clicks: ['ui_click', 'ui_select'],
      ambient_nature: ['ambient_wind_gentle', 'ambient_birds_chirping', 'ambient_leaves_rustle']
    };

    for (const [groupName, sounds] of Object.entries(variationGroups)) {
      this.randomVariations.set(groupName, sounds.filter(id => this.sfxLibrary.has(id)));
    }
  }

  createSoundPools() {
    // Crear pools de sonidos para efectos frecuentes
    const poolConfigs = {
      ui_feedback: { size: 8, sounds: ['ui_click', 'ui_hover', 'ui_select'] },
      footsteps: { size: 4, sounds: ['environmental_footstep_grass'] },
      interactions: { size: 6, sounds: ['interaction_pick_up', 'interaction_drop'] }
    };

    for (const [poolName, config] of Object.entries(poolConfigs)) {
      this.soundPools.set(poolName, {
        size: config.size,
        sounds: config.sounds,
        available: config.size,
        queue: []
      });
    }
  }

  play(soundId, options = {}) {
    if (!this.sfxLibrary.has(soundId)) {
      console.warn(`SFX ${soundId} not found`);
      return null;
    }

    const sound = this.sfxLibrary.get(soundId);
    const {
      volume = 1.0,
      pitch = 1.0,
      delay = 0,
      loop = false,
      fadeIn = 0,
      spatial = false,
      position = { x: 0, y: 0, z: 0 },
      category = sound.category,
      priority = 'normal',
      maxInstances = 3
    } = options;

    // Verificar límites de instancias concurrentes
    if (this.countActiveInstances(soundId) >= maxInstances) {
      if (priority !== 'high') {
        return null;
      }
      this.stopOldestInstance(soundId);
    }

    // Calcular volumen final basado en categoría
    const categoryVolume = this.settings[`${category}Volume`] || this.settings.masterVolume;
    const finalVolume = volume * categoryVolume;

    // Configurar opciones de reproducción
    const playOptions = {
      volume: finalVolume,
      startTime: delay,
      loop,
      fadeIn,
      spatial: spatial && this.settings.spatialEffects,
      position
    };

    // Aplicar variación de pitch si está especificada
    if (pitch !== 1.0) {
      playOptions.playbackRate = pitch;
    }

    // Reproducir el sonido
    const source = this.audioManager.play(soundId, playOptions);
    
    if (source) {
      // Registrar sonido activo
      const activeSound = {
        source,
        soundId,
        category,
        startTime: Date.now(),
        options: playOptions
      };

      const activeSoundId = `${soundId}_${Date.now()}_${Math.random()}`;
      this.activeSounds.set(activeSoundId, activeSound);

      // Limpiar cuando termine
      source.onended = () => {
        this.activeSounds.delete(activeSoundId);
      };

      return activeSoundId;
    }

    return null;
  }

  playVariation(groupName, options = {}) {
    if (!this.randomVariations.has(groupName)) {
      console.warn(`Variation group ${groupName} not found`);
      return null;
    }

    const variations = this.randomVariations.get(groupName);
    const randomSound = variations[Math.floor(Math.random() * variations.length)];
    
    return this.play(randomSound, options);
  }

  playSequence(soundIds, options = {}) {
    const {
      interval = 500,
      fadeTransition = false,
      loop = false
    } = options;

    let currentIndex = 0;
    const playNext = () => {
      if (currentIndex >= soundIds.length) {
        if (loop) {
          currentIndex = 0;
        } else {
          return;
        }
      }

      const soundId = soundIds[currentIndex];
      this.play(soundId, options);
      
      currentIndex++;
      setTimeout(playNext, interval);
    };

    playNext();
  }

  playChain(chainName) {
    if (!this.chainedSounds.has(chainName)) return null;
    
    const chain = this.chainedSounds.get(chainName);
    let delay = 0;
    
    chain.forEach(({ soundId, options, timing }) => {
      setTimeout(() => {
        this.play(soundId, options);
      }, delay);
      
      delay += timing;
    });
  }

  createChain(chainName, soundChain) {
    this.chainedSounds.set(chainName, soundChain);
  }

  playUI(actionType, options = {}) {
    const uiSounds = {
      click: 'ui_click',
      hover: 'ui_hover',
      select: 'ui_select',
      toggle: 'ui_toggle',
      notification: 'ui_notification',
      error: 'ui_error',
      success: 'ui_success',
      modal_open: 'ui_modal_open',
      modal_close: 'ui_modal_close'
    };

    const soundId = uiSounds[actionType];
    if (soundId) {
      return this.play(soundId, { ...options, category: 'ui' });
    }

    return null;
  }

  playInteraction(interactionType, options = {}) {
    const interactionSounds = {
      pick_up: 'interaction_pick_up',
      drop: 'interaction_drop',
      place: 'interaction_place',
      move: 'interaction_move',
      connect: 'interaction_connect',
      disconnect: 'interaction_disconnect',
      rotate: 'interaction_rotate',
      resize: 'interaction_resize'
    };

    const soundId = interactionSounds[interactionType];
    if (soundId) {
      return this.play(soundId, { ...options, category: 'interaction' });
    }

    return null;
  }

  playAmbient(ambientType, options = {}) {
    const ambientSounds = {
      wind: 'ambient_wind_gentle',
      water: 'ambient_water_flow',
      birds: 'ambient_birds_chirping',
      leaves: 'ambient_leaves_rustle',
      fire: 'ambient_fire_crackling',
      ocean: 'ambient_ocean_waves'
    };

    const soundId = ambientSounds[ambientType];
    if (soundId) {
      return this.play(soundId, { 
        ...options, 
        category: 'ambient',
        loop: true,
        fadeIn: 2.0 
      });
    }

    return null;
  }

  playFeedback(feedbackType, options = {}) {
    const feedbackSounds = {
      positive: 'feedback_positive',
      negative: 'feedback_negative',
      neutral: 'feedback_neutral',
      achievement: 'feedback_achievement',
      progress: 'feedback_progress',
      completion: 'feedback_completion'
    };

    const soundId = feedbackSounds[feedbackType];
    if (soundId) {
      return this.play(soundId, { 
        ...options, 
        category: 'feedback',
        priority: 'high' 
      });
    }

    return null;
  }

  stop(activeSoundId, fadeOut = 0) {
    if (!this.activeSounds.has(activeSoundId)) return;
    
    const activeSound = this.activeSounds.get(activeSoundId);
    
    if (fadeOut > 0) {
      // Implementar fade out
      this.audioManager.stop(activeSound.soundId, fadeOut);
    } else {
      activeSound.source.stop();
    }
    
    this.activeSounds.delete(activeSoundId);
  }

  stopCategory(category, fadeOut = 0) {
    const soundsToStop = [];
    
    this.activeSounds.forEach((activeSound, id) => {
      if (activeSound.category === category) {
        soundsToStop.push(id);
      }
    });
    
    soundsToStop.forEach(id => this.stop(id, fadeOut));
  }

  stopAll(fadeOut = 0) {
    const soundsToStop = Array.from(this.activeSounds.keys());
    soundsToStop.forEach(id => this.stop(id, fadeOut));
  }

  countActiveInstances(soundId) {
    let count = 0;
    this.activeSounds.forEach(activeSound => {
      if (activeSound.soundId === soundId) {
        count++;
      }
    });
    return count;
  }

  stopOldestInstance(soundId) {
    let oldestTime = Date.now();
    let oldestId = null;
    
    this.activeSounds.forEach((activeSound, id) => {
      if (activeSound.soundId === soundId && activeSound.startTime < oldestTime) {
        oldestTime = activeSound.startTime;
        oldestId = id;
      }
    });
    
    if (oldestId) {
      this.stop(oldestId);
    }
  }

  setCategoryVolume(category, volume) {
    if (!this.settings.hasOwnProperty(`${category}Volume`)) return;
    
    this.settings[`${category}Volume`] = volume;
    
    // Ajustar volumen de sonidos activos en esta categoría
    this.activeSounds.forEach(activeSound => {
      if (activeSound.category === category) {
        const newVolume = activeSound.options.volume * volume;
        this.audioManager.setVolume('sfx', newVolume);
      }
    });
  }

  muteCategory(category, muted = true) {
    this.setCategoryVolume(category, muted ? 0 : 1);
  }

  enableSpatialEffects(enabled = true) {
    this.settings.spatialEffects = enabled;
  }

  setupEventListeners() {
    // UI Events
    document.addEventListener('click', (event) => {
      if (event.target.matches('button, .clickable')) {
        this.playUI('click');
      }
    });

    document.addEventListener('mouseover', (event) => {
      if (event.target.matches('button, .hoverable')) {
        this.playUI('hover', { volume: 0.5 });
      }
    });

    // Custom Events
    document.addEventListener('user:interaction', (event) => {
      const { type, position } = event.detail;
      this.playInteraction(type, { 
        spatial: true, 
        position: position || { x: 0, y: 0, z: 0 } 
      });
    });

    document.addEventListener('user:movement', (event) => {
      const { surface, position } = event.detail;
      
      if (surface === 'grass') {
        this.play('environmental_footstep_grass', {
          spatial: true,
          position,
          volume: 0.6
        });
      } else if (surface === 'stone') {
        this.play('environmental_footstep_stone', {
          spatial: true,
          position,
          volume: 0.8
        });
      }
    });

    document.addEventListener('community:event', (event) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'gathering_start':
          this.playFeedback('positive');
          break;
        case 'achievement_unlocked':
          this.playFeedback('achievement');
          break;
        case 'cultural_moment':
          this.playVariation('cultural', { 
            volume: 0.7,
            category: 'cultural' 
          });
          break;
      }
    });

    document.addEventListener('environment:change', (event) => {
      const { environment, ambientSounds } = event.detail;
      
      // Detener sonidos ambientales anteriores
      this.stopCategory('ambient', 1.0);
      
      // Iniciar nuevos sonidos ambientales
      if (ambientSounds) {
        ambientSounds.forEach(sound => {
          this.playAmbient(sound, { volume: 0.4 });
        });
      }
    });
  }

  createSoundscape(name, sounds) {
    // Crear paisajes sonoros complejos
    const soundscape = {
      name,
      layers: sounds,
      isPlaying: false,
      activeSounds: new Set()
    };

    sounds.forEach(({ soundId, options, delay = 0 }) => {
      setTimeout(() => {
        const activeSoundId = this.play(soundId, options);
        if (activeSoundId) {
          soundscape.activeSounds.add(activeSoundId);
        }
      }, delay);
    });

    return soundscape;
  }

  fadeToSoundscape(soundscapeName, fadeTime = 2.0) {
    // Implementar transición suave entre paisajes sonoros
    this.stopCategory('ambient', fadeTime);
    
    setTimeout(() => {
      // Iniciar nuevo paisaje sonoro
    }, fadeTime * 1000);
  }

  getActiveCategory(category) {
    const activeSounds = [];
    this.activeSounds.forEach((activeSound, id) => {
      if (activeSound.category === category) {
        activeSounds.push({ id, sound: activeSound });
      }
    });
    return activeSounds;
  }

  preloadSounds(soundIds) {
    // Pre-cargar sonidos en memoria para respuesta rápida
    return Promise.all(
      soundIds.map(id => this.audioManager.loadAudioSource(id))
    );
  }

  dispose() {
    this.stopAll();
    this.sfxLibrary.clear();
    this.activeSounds.clear();
    this.soundPools.clear();
    this.chainedSounds.clear();
    this.randomVariations.clear();
    
    Object.keys(this.categories).forEach(category => {
      this.categories[category].clear();
    });
  }
}

export default SFXController;