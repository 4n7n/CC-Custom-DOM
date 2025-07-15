/**
 * Community Audio Manager - Gestor central de audio para la comunidad
 * Controla la reproducción, mezcla y coordinación de todos los elementos de audio
 */

class CommunityAudioManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.audioSources = new Map();
    this.activeChannels = new Map();
    this.isInitialized = false;
    this.settings = {
      masterVolume: 0.7,
      musicVolume: 0.5,
      sfxVolume: 0.8,
      voiceVolume: 0.9,
      spatialAudio: true,
      culturalMode: false
    };
    this.events = new EventTarget();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.audioContext.currentTime);
      
      // Crear canales de audio
      this.createAudioChannels();
      
      // Configurar listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.events.dispatchEvent(new CustomEvent('audioInitialized'));
      
      console.log('Community Audio Manager initialized');
    } catch (error) {
      console.error('Error initializing audio:', error);
      throw error;
    }
  }

  createAudioChannels() {
    const channels = ['music', 'sfx', 'voice', 'ambient', 'cultural'];
    
    channels.forEach(channel => {
      const gain = this.audioContext.createGain();
      gain.connect(this.masterGain);
      
      const volume = this.settings[`${channel}Volume`] || 0.7;
      gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
      
      this.activeChannels.set(channel, {
        gain,
        sources: new Set(),
        volume,
        muted: false
      });
    });
  }

  async loadAudioSource(id, url, channel = 'sfx') {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.audioSources.set(id, {
        buffer: audioBuffer,
        channel,
        url,
        loaded: true
      });
      
      this.events.dispatchEvent(new CustomEvent('audioLoaded', { detail: { id, channel } }));
      return true;
    } catch (error) {
      console.error(`Error loading audio ${id}:`, error);
      return false;
    }
  }

  play(id, options = {}) {
    if (!this.audioSources.has(id)) {
      console.warn(`Audio source ${id} not found`);
      return null;
    }

    const source = this.audioSources.get(id);
    const channelData = this.activeChannels.get(source.channel);
    
    if (!channelData || channelData.muted) return null;

    const bufferSource = this.audioContext.createBufferSource();
    bufferSource.buffer = source.buffer;
    
    // Configurar opciones
    const {
      loop = false,
      volume = 1,
      startTime = 0,
      fadeIn = 0,
      spatial = false,
      position = { x: 0, y: 0, z: 0 }
    } = options;

    bufferSource.loop = loop;
    
    // Crear gain para este audio específico
    const audioGain = this.audioContext.createGain();
    audioGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    
    // Configurar audio espacial si está habilitado
    if (spatial && this.settings.spatialAudio) {
      const panner = this.audioContext.createPanner();
      panner.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
      panner.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
      panner.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
      
      bufferSource.connect(audioGain);
      audioGain.connect(panner);
      panner.connect(channelData.gain);
    } else {
      bufferSource.connect(audioGain);
      audioGain.connect(channelData.gain);
    }

    // Fade in si está especificado
    if (fadeIn > 0) {
      audioGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      audioGain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + fadeIn);
    }

    bufferSource.start(this.audioContext.currentTime + startTime);
    
    // Registrar la fuente activa
    channelData.sources.add(bufferSource);
    
    // Limpiar cuando termine
    bufferSource.onended = () => {
      channelData.sources.delete(bufferSource);
    };

    return bufferSource;
  }

  stop(id, fadeOut = 0) {
    if (!this.audioSources.has(id)) return;
    
    const source = this.audioSources.get(id);
    const channelData = this.activeChannels.get(source.channel);
    
    if (!channelData) return;

    channelData.sources.forEach(bufferSource => {
      if (fadeOut > 0) {
        const gain = bufferSource.gain || channelData.gain;
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeOut);
        setTimeout(() => bufferSource.stop(), fadeOut * 1000);
      } else {
        bufferSource.stop();
      }
    });
  }

  setVolume(channel, volume) {
    if (!this.activeChannels.has(channel)) return;
    
    const channelData = this.activeChannels.get(channel);
    channelData.volume = volume;
    channelData.gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    
    this.settings[`${channel}Volume`] = volume;
    this.events.dispatchEvent(new CustomEvent('volumeChanged', { detail: { channel, volume } }));
  }

  mute(channel, muted = true) {
    if (!this.activeChannels.has(channel)) return;
    
    const channelData = this.activeChannels.get(channel);
    channelData.muted = muted;
    
    const targetVolume = muted ? 0 : channelData.volume;
    channelData.gain.gain.setValueAtTime(targetVolume, this.audioContext.currentTime);
    
    this.events.dispatchEvent(new CustomEvent('channelMuted', { detail: { channel, muted } }));
  }

  setupEventListeners() {
    // Reanudar contexto de audio cuando sea necesario
    document.addEventListener('click', () => {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }, { once: true });

    // Gestionar cambios de visibilidad
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  pause() {
    if (this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  resume() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  getAnalyzer(channel) {
    if (!this.activeChannels.has(channel)) return null;
    
    const analyzer = this.audioContext.createAnalyser();
    analyzer.fftSize = 256;
    
    const channelData = this.activeChannels.get(channel);
    channelData.gain.connect(analyzer);
    
    return analyzer;
  }

  dispose() {
    this.activeChannels.forEach(channel => {
      channel.sources.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
    });
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.audioSources.clear();
    this.activeChannels.clear();
    this.isInitialized = false;
  }
}

// Singleton pattern
const communityAudioManager = new CommunityAudioManager();

export default communityAudioManager;