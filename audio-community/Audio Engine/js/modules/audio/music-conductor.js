/**
 * Music Conductor - Director musical adaptativo
 * Gestiona la música de fondo, transiciones y capas musicales dinámicas
 */

class MusicConductor {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.musicLayers = new Map();
    this.currentTheme = null;
    this.isPlaying = false;
    this.crossfadeDuration = 2.0;
    this.musicLibrary = new Map();
    this.adaptiveSettings = {
      emotionalResponse: true,
      contextualMusic: true,
      dynamicLayering: true,
      tempoAdjustment: false
    };
    this.emotionalState = 'neutral';
    this.contextualTags = new Set();
    this.layerStates = {
      ambient: { volume: 0.6, active: true },
      melody: { volume: 0.8, active: true },
      rhythm: { volume: 0.7, active: true },
      harmony: { volume: 0.5, active: false },
      percussion: { volume: 0.4, active: false }
    };
  }

  async initialize() {
    await this.loadMusicLibrary();
    this.setupEventListeners();
    console.log('Music Conductor initialized');
  }

  async loadMusicLibrary() {
    // Definir biblioteca musical por temas y estados
    const musicConfig = {
      themes: {
        'community': {
          ambient: '/audio/music/community/ambient.mp3',
          melody: '/audio/music/community/melody.mp3',
          rhythm: '/audio/music/community/rhythm.mp3',
          harmony: '/audio/music/community/harmony.mp3',
          percussion: '/audio/music/community/percussion.mp3'
        },
        'exploration': {
          ambient: '/audio/music/exploration/ambient.mp3',
          melody: '/audio/music/exploration/melody.mp3',
          rhythm: '/audio/music/exploration/rhythm.mp3'
        },
        'celebration': {
          ambient: '/audio/music/celebration/ambient.mp3',
          melody: '/audio/music/celebration/melody.mp3',
          rhythm: '/audio/music/celebration/rhythm.mp3',
          harmony: '/audio/music/celebration/harmony.mp3',
          percussion: '/audio/music/celebration/percussion.mp3'
        },
        'contemplation': {
          ambient: '/audio/music/contemplation/ambient.mp3',
          melody: '/audio/music/contemplation/melody.mp3'
        },
        'cultural': {
          ambient: '/audio/music/cultural/ambient.mp3',
          melody: '/audio/music/cultural/melody.mp3',
          rhythm: '/audio/music/cultural/rhythm.mp3',
          traditional: '/audio/music/cultural/traditional.mp3'
        }
      },
      emotional: {
        'joyful': { tempo: 1.1, brightness: 0.8 },
        'peaceful': { tempo: 0.9, brightness: 0.6 },
        'energetic': { tempo: 1.2, brightness: 0.9 },
        'reflective': { tempo: 0.8, brightness: 0.4 },
        'mysterious': { tempo: 0.9, brightness: 0.3 }
      }
    };

    // Cargar archivos de audio
    for (const [theme, layers] of Object.entries(musicConfig.themes)) {
      const themeData = { layers: new Map(), loaded: false };
      
      for (const [layer, url] of Object.entries(layers)) {
        try {
          const loaded = await this.audioManager.loadAudioSource(
            `music_${theme}_${layer}`,
            url,
            'music'
          );
          
          if (loaded) {
            themeData.layers.set(layer, `music_${theme}_${layer}`);
          }
        } catch (error) {
          console.warn(`Failed to load ${theme}/${layer}:`, error);
        }
      }
      
      if (themeData.layers.size > 0) {
        themeData.loaded = true;
        this.musicLibrary.set(theme, themeData);
      }
    }
  }

  setTheme(themeName, options = {}) {
    const {
      fadeOut = this.crossfadeDuration,
      fadeIn = this.crossfadeDuration,
      immediate = false
    } = options;

    if (!this.musicLibrary.has(themeName)) {
      console.warn(`Theme ${themeName} not found`);
      return;
    }

    const previousTheme = this.currentTheme;
    this.currentTheme = themeName;

    if (immediate) {
      this.stopAllLayers();
      this.startTheme(themeName);
    } else {
      this.crossfadeTheme(previousTheme, themeName, fadeOut, fadeIn);
    }
  }

  async startTheme(themeName) {
    if (!this.musicLibrary.has(themeName)) return;
    
    const theme = this.musicLibrary.get(themeName);
    const activeLayers = Object.keys(this.layerStates)
      .filter(layer => this.layerStates[layer].active && theme.layers.has(layer));

    // Iniciar capas activas
    for (const layerName of activeLayers) {
      const audioId = theme.layers.get(layerName);
      const layerState = this.layerStates[layerName];
      
      const source = this.audioManager.play(audioId, {
        loop: true,
        volume: layerState.volume,
        fadeIn: 1.0
      });
      
      if (source) {
        this.musicLayers.set(layerName, {
          source,
          audioId,
          volume: layerState.volume,
          theme: themeName
        });
      }
    }
    
    this.isPlaying = true;
  }

  crossfadeTheme(fromTheme, toTheme, fadeOutDuration, fadeInDuration) {
    // Fade out tema actual
    if (fromTheme && this.isPlaying) {
      this.musicLayers.forEach((layer, layerName) => {
        this.fadeLayer(layerName, 0, fadeOutDuration);
      });
      
      // Parar capas después del fade out
      setTimeout(() => {
        this.stopAllLayers();
      }, fadeOutDuration * 1000);
    }
    
    // Fade in nuevo tema
    setTimeout(() => {
      this.startTheme(toTheme);
    }, fadeOutDuration * 1000);
  }

  toggleLayer(layerName, active, fadeTime = 1.0) {
    if (!this.layerStates[layerName]) return;
    
    this.layerStates[layerName].active = active;
    
    if (active && this.currentTheme) {
      this.addLayer(layerName, fadeTime);
    } else {
      this.removeLayer(layerName, fadeTime);
    }
  }

  addLayer(layerName, fadeTime = 1.0) {
    if (!this.currentTheme || this.musicLayers.has(layerName)) return;
    
    const theme = this.musicLibrary.get(this.currentTheme);
    if (!theme.layers.has(layerName)) return;
    
    const audioId = theme.layers.get(layerName);
    const layerState = this.layerStates[layerName];
    
    const source = this.audioManager.play(audioId, {
      loop: true,
      volume: 0,
      fadeIn: fadeTime
    });
    
    if (source) {
      this.musicLayers.set(layerName, {
        source,
        audioId,
        volume: layerState.volume,
        theme: this.currentTheme
      });
      
      // Aplicar volumen objetivo gradualmente
      setTimeout(() => {
        this.setLayerVolume(layerName, layerState.volume);
      }, fadeTime * 1000);
    }
  }

  removeLayer(layerName, fadeTime = 1.0) {
    if (!this.musicLayers.has(layerName)) return;
    
    this.fadeLayer(layerName, 0, fadeTime);
    
    setTimeout(() => {
      const layer = this.musicLayers.get(layerName);
      if (layer) {
        layer.source.stop();
        this.musicLayers.delete(layerName);
      }
    }, fadeTime * 1000);
  }

  setLayerVolume(layerName, volume, fadeTime = 0.5) {
    if (!this.musicLayers.has(layerName)) return;
    
    this.layerStates[layerName].volume = volume;
    this.fadeLayer(layerName, volume, fadeTime);
  }

  fadeLayer(layerName, targetVolume, duration) {
    if (!this.musicLayers.has(layerName)) return;
    
    const layer = this.musicLayers.get(layerName);
    // Implementar fade con gain node
    this.audioManager.setVolume('music', targetVolume);
  }

  setEmotionalState(emotion, intensity = 1.0) {
    this.emotionalState = emotion;
    
    if (!this.adaptiveSettings.emotionalResponse) return;
    
    // Ajustar capas según estado emocional
    switch (emotion) {
      case 'joyful':
        this.toggleLayer('harmony', true);
        this.toggleLayer('percussion', true);
        this.setLayerVolume('melody', 0.9);
        break;
      case 'peaceful':
        this.toggleLayer('percussion', false);
        this.setLayerVolume('ambient', 0.8);
        this.setLayerVolume('melody', 0.6);
        break;
      case 'energetic':
        this.toggleLayer('percussion', true);
        this.setLayerVolume('rhythm', 0.9);
        break;
      case 'reflective':
        this.toggleLayer('percussion', false);
        this.toggleLayer('harmony', false);
        this.setLayerVolume('ambient', 0.9);
        break;
    }
  }

  addContextualTag(tag) {
    this.contextualTags.add(tag);
    this.updateContextualMusic();
  }

  removeContextualTag(tag) {
    this.contextualTags.delete(tag);
    this.updateContextualMusic();
  }

  updateContextualMusic() {
    if (!this.adaptiveSettings.contextualMusic) return;
    
    // Ajustar música según contexto
    if (this.contextualTags.has('gathering')) {
      this.setTheme('community');
    } else if (this.contextualTags.has('discovery')) {
      this.setTheme('exploration');
    } else if (this.contextualTags.has('ritual')) {
      this.setTheme('cultural');
    }
  }

  pause() {
    this.musicLayers.forEach(layer => {
      if (layer.source.suspend) {
        layer.source.suspend();
      }
    });
    this.isPlaying = false;
  }

  resume() {
    this.musicLayers.forEach(layer => {
      if (layer.source.resume) {
        layer.source.resume();
      }
    });
    this.isPlaying = true;
  }

  stop() {
    this.stopAllLayers();
    this.isPlaying = false;
    this.currentTheme = null;
  }

  stopAllLayers() {
    this.musicLayers.forEach(layer => {
      try {
        layer.source.stop();
      } catch (e) {}
    });
    this.musicLayers.clear();
  }

  setupEventListeners() {
    // Escuchar eventos de la comunidad
    document.addEventListener('community:event', (event) => {
      this.handleCommunityEvent(event.detail);
    });
    
    document.addEventListener('user:emotion', (event) => {
      this.setEmotionalState(event.detail.emotion, event.detail.intensity);
    });
  }

  handleCommunityEvent(eventData) {
    const { type, participants, energy } = eventData;
    
    switch (type) {
      case 'gathering_start':
        this.addContextualTag('gathering');
        this.setEmotionalState('joyful');
        break;
      case 'gathering_end':
        this.removeContextualTag('gathering');
        this.setEmotionalState('peaceful');
        break;
      case 'celebration':
        this.setTheme('celebration');
        this.setEmotionalState('energetic');
        break;
      case 'quiet_time':
        this.setTheme('contemplation');
        this.setEmotionalState('peaceful');
        break;
    }
  }

  getCurrentState() {
    return {
      theme: this.currentTheme,
      isPlaying: this.isPlaying,
      emotionalState: this.emotionalState,
      activeLayers: Array.from(this.musicLayers.keys()),
      contextualTags: Array.from(this.contextualTags)
    };
  }

  dispose() {
    this.stopAllLayers();
    this.musicLibrary.clear();
    this.contextualTags.clear();
  }
}

export default MusicConductor;