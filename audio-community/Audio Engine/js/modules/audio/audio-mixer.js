/**
 * Audio Mixer - Mezclador de audio avanzado
 * Gestiona mezcla de canales, efectos en tiempo real y ecualización
 */

class AudioMixer {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.channels = new Map();
    this.masterGain = audioContext.createGain();
    this.masterEQ = null;
    this.compressor = null;
    this.reverb = null;
    this.isInitialized = false;
    this.mixerSettings = {
      masterVolume: 0.8,
      eqEnabled: true,
      compressionEnabled: true,
      reverbEnabled: false,
      limiterEnabled: true
    };
    this.presets = new Map();
    this.automationTracks = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.createMasterChain();
    this.createChannels();
    this.setupPresets();
    this.isInitialized = true;
    
    console.log('Audio Mixer initialized');
  }

  createMasterChain() {
    // Crear cadena de procesamiento maestro
    this.masterEQ = this.createEqualizer();
    this.compressor = this.createCompressor();
    this.reverb = this.createReverb();
    this.limiter = this.createLimiter();
    
    // Conectar cadena: EQ -> Compressor -> Reverb -> Limiter -> Master Gain -> Output
    this.masterEQ.connect(this.compressor);
    this.compressor.connect(this.reverb.input);
    this.reverb.output.connect(this.limiter);
    this.limiter.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
    
    // Configurar gain maestro
    this.masterGain.gain.setValueAtTime(this.mixerSettings.masterVolume, this.audioContext.currentTime);
  }

  createEqualizer() {
    // Crear EQ de 8 bandas
    const frequencies = [60, 120, 250, 500, 1000, 2000, 4000, 8000];
    const filters = frequencies.map((freq, index) => {
      const filter = this.audioContext.createBiquadFilter();
      
      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === frequencies.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.setValueAtTime(1.0, this.audioContext.currentTime);
      }
      
      filter.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      filter.gain.setValueAtTime(0, this.audioContext.currentTime);
      
      return filter;
    });
    
    // Conectar filtros en serie
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }
    
    const eq = {
      input: filters[0],
      output: filters[filters.length - 1],
      filters,
      frequencies,
      enabled: true
    };
    
    return eq;
  }

  createCompressor() {
    const compressor = this.audioContext.createDynamicsCompressor();
    
    // Configuración por defecto
    compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
    compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
    compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
    compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
    compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);
    
    return compressor;
  }

  createReverb() {
    const convolver = this.audioContext.createConvolver();
    const inputGain = this.audioContext.createGain();
    const wetGain = this.audioContext.createGain();
    const dryGain = this.audioContext.createGain();
    const outputGain = this.audioContext.createGain();
    
    // Configurar gains
    dryGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
    wetGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    
    // Conectar
    inputGain.connect(dryGain);
    inputGain.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(outputGain);
    wetGain.connect(outputGain);
    
    // Generar impulse response
    convolver.buffer = this.generateReverbImpulse();
    
    return {
      input: inputGain,
      output: outputGain,
      convolver,
      wetGain,
      dryGain,
      mix: 0.2
    };
  }

  createLimiter() {
    const limiter = this.audioContext.createDynamicsCompressor();
    
    // Configuración para limitador
    limiter.threshold.setValueAtTime(-3, this.audioContext.currentTime);
    limiter.knee.setValueAtTime(0, this.audioContext.currentTime);
    limiter.ratio.setValueAtTime(20, this.audioContext.currentTime);
    limiter.attack.setValueAtTime(0.001, this.audioContext.currentTime);
    limiter.release.setValueAtTime(0.01, this.audioContext.currentTime);
    
    return limiter;
  }

  generateReverbImpulse() {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 2; // 2 segundos
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.5;
      }
    }
    
    return buffer;
  }

  createChannels() {
    const channelConfigs = {
      music: { volume: 0.7, solo: false, mute: false, eq: true },
      sfx: { volume: 0.8, solo: false, mute: false, eq: false },
      voice: { volume: 0.9, solo: false, mute: false, eq: true },
      ambient: { volume: 0.6, solo: false, mute: false, eq: true },
      ui: { volume: 0.7, solo: false, mute: false, eq: false }
    };
    
    for (const [name, config] of Object.entries(channelConfigs)) {
      this.createChannel(name, config);
    }
  }

  createChannel(name, config = {}) {
    const {
      volume = 0.8,
      solo = false,
      mute = false,
      eq = false,
      compression = false,
      send = 0.0
    } = config;
    
    // Crear nodos del canal
    const input = this.audioContext.createGain();
    const volumeGain = this.audioContext.createGain();
    const output = this.audioContext.createGain();
    const sendGain = this.audioContext.createGain();
    
    // Configurar volumen
    volumeGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    sendGain.gain.setValueAtTime(send, this.audioContext.currentTime);
    
    // EQ por canal (opcional)
    let channelEQ = null;
    if (eq) {
      channelEQ = this.createChannelEQ();
    }
    
    // Compresión por canal (opcional)
    let channelCompressor = null;
    if (compression) {
      channelCompressor = this.audioContext.createDynamicsCompressor();
      channelCompressor.threshold.setValueAtTime(-18, this.audioContext.currentTime);
      channelCompressor.ratio.setValueAtTime(4, this.audioContext.currentTime);
    }
    
    // Conectar cadena del canal
    let currentNode = input;
    currentNode.connect(volumeGain);
    currentNode = volumeGain;
    
    if (channelEQ) {
      currentNode.connect(channelEQ.input);
      currentNode = channelEQ.output;
    }
    
    if (channelCompressor) {
      currentNode.connect(channelCompressor);
      currentNode = channelCompressor;
    }
    
    currentNode.connect(output);
    
    // Send al reverb maestro
    output.connect(sendGain);
    sendGain.connect(this.reverb.input);
    
    // Salida al bus maestro
    output.connect(this.masterEQ.input);
    
    // Almacenar configuración del canal
    const channel = {
      name,
      input,
      volumeGain,
      output,
      sendGain,
      eq: channelEQ,
      compressor: channelCompressor,
      volume,
      solo,
      mute,
      send,
      sources: new Set()
    };
    
    this.channels.set(name, channel);
    return channel;
  }

  createChannelEQ() {
    // EQ simplificado de 3 bandas para canales
    const lowFilter = this.audioContext.createBiquadFilter();
    const midFilter = this.audioContext.createBiquadFilter();
    const highFilter = this.audioContext.createBiquadFilter();
    
    lowFilter.type = 'lowshelf';
    lowFilter.frequency.setValueAtTime(320, this.audioContext.currentTime);
    lowFilter.gain.setValueAtTime(0, this.audioContext.currentTime);
    
    midFilter.type = 'peaking';
    midFilter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
    midFilter.Q.setValueAtTime(1.0, this.audioContext.currentTime);
    midFilter.gain.setValueAtTime(0, this.audioContext.currentTime);
    
    highFilter.type = 'highshelf';
    highFilter.frequency.setValueAtTime(3200, this.audioContext.currentTime);
    highFilter.gain.setValueAtTime(0, this.audioContext.currentTime);
    
    // Conectar
    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);
    
    return {
      input: lowFilter,
      output: highFilter,
      low: lowFilter,
      mid: midFilter,
      high: highFilter
    };
  }

  connectSource(source, channelName) {
    const channel = this.channels.get(channelName);
    if (!channel) return null;
    
    source.connect(channel.input);
    channel.sources.add(source);
    
    // Limpiar cuando termine
    if (source.onended) {
      const originalOnended = source.onended;
      source.onended = () => {
        channel.sources.delete(source);
        if (originalOnended) originalOnended();
      };
    } else {
      source.onended = () => {
        channel.sources.delete(source);
      };
    }
    
    return channel;
  }

  setChannelVolume(channelName, volume, fadeTime = 0) {
    const channel = this.channels.get(channelName);
    if (!channel) return;
    
    const currentTime = this.audioContext.currentTime;
    
    if (fadeTime > 0) {
      channel.volumeGain.gain.linearRampToValueAtTime(volume, currentTime + fadeTime);
    } else {
      channel.volumeGain.gain.setValueAtTime(volume, currentTime);
    }
    
    channel.volume = volume;
  }

  muteChannel(channelName, muted = true) {
    const channel = this.channels.get(channelName);
    if (!channel) return;
    
    channel.mute = muted;
    const targetVolume = muted ? 0 : channel.volume;
    this.setChannelVolume(channelName, targetVolume, 0.1);
  }

  soloChannel(channelName, solo = true) {
    const channel = this.channels.get(channelName);
    if (!channel) return;
    
    if (solo) {
      // Mutear todos los otros canales
      this.channels.forEach((ch, name) => {
        if (name !== channelName) {
          ch.solo = false;
          this.muteChannel(name, true);
        }
      });
      
      channel.solo = true;
      this.muteChannel(channelName, false);
    } else {
      // Desmutear todos los canales
      this.channels.forEach((ch, name) => {
        ch.solo = false;
        this.muteChannel(name, false);
      });
    }
  }

  setChannelEQ(channelName, band, gain) {
    const channel = this.channels.get(channelName);
    if (!channel || !channel.eq) return;
    
    const currentTime = this.audioContext.currentTime;
    
    switch (band) {
      case 'low':
        channel.eq.low.gain.setValueAtTime(gain, currentTime);
        break;
      case 'mid':
        channel.eq.mid.gain.setValueAtTime(gain, currentTime);
        break;
      case 'high':
        channel.eq.high.gain.setValueAtTime(gain, currentTime);
        break;
    }
  }

  setMasterEQ(bandIndex, gain) {
    if (!this.masterEQ || bandIndex >= this.masterEQ.filters.length) return;
    
    const filter = this.masterEQ.filters[bandIndex];
    filter.gain.setValueAtTime(gain, this.audioContext.currentTime);
  }

  setReverbMix(mix) {
    this.reverb.wetGain.gain.setValueAtTime(mix, this.audioContext.currentTime);
    this.reverb.dryGain.gain.setValueAtTime(1 - mix, this.audioContext.currentTime);
    this.reverb.mix = mix;
  }

  setupPresets() {
    this.presets.set('default', {
      name: 'Default',
      masterVolume: 0.8,
      channels: {
        music: { volume: 0.7, eq: { low: 0, mid: 0, high: 0 } },
        sfx: { volume: 0.8 },
        voice: { volume: 0.9, eq: { low: -2, mid: 2, high: 1 } },
        ambient: { volume: 0.6, eq: { low: 1, mid: -1, high: 0 } }
      },
      reverb: { mix: 0.15 },
      masterEQ: [0, 0, 0, 0, 0, 0, 0, 0]
    });
    
    this.presets.set('immersive', {
      name: 'Immersive',
      masterVolume: 0.85,
      channels: {
        music: { volume: 0.6, eq: { low: 2, mid: 0, high: -1 } },
        sfx: { volume: 0.9 },
        voice: { volume: 0.8, eq: { low: -1, mid: 3, high: 2 } },
        ambient: { volume: 0.8, eq: { low: 3, mid: -2, high: 1 } }
      },
      reverb: { mix: 0.25 },
      masterEQ: [1, 0, -1, 0, 1, 2, 1, 0]
    });
    
    this.presets.set('focused', {
      name: 'Focused',
      masterVolume: 0.7,
      channels: {
        music: { volume: 0.4, eq: { low: -2, mid: -1, high: -3 } },
        sfx: { volume: 0.6 },
        voice: { volume: 1.0, eq: { low: 0, mid: 4, high: 3 } },
        ambient: { volume: 0.3, eq: { low: -3, mid: -2, high: -4 } }
      },
      reverb: { mix: 0.05 },
      masterEQ: [-2, -1, 0, 2, 3, 2, 0, -1]
    });
  }

  loadPreset(presetName) {
    const preset = this.presets.get(presetName);
    if (!preset) return;
    
    // Aplicar configuración maestra
    this.masterGain.gain.setValueAtTime(preset.masterVolume, this.audioContext.currentTime);
    
    // Aplicar configuración de canales
    for (const [channelName, config] of Object.entries(preset.channels)) {
      this.setChannelVolume(channelName, config.volume);
      
      if (config.eq) {
        for (const [band, gain] of Object.entries(config.eq)) {
          this.setChannelEQ(channelName, band, gain);
        }
      }
    }
    
    // Aplicar reverb
    if (preset.reverb) {
      this.setReverbMix(preset.reverb.mix);
    }
    
    // Aplicar EQ maestro
    if (preset.masterEQ) {
      preset.masterEQ.forEach((gain, index) => {
        this.setMasterEQ(index, gain);
      });
    }
  }

  getChannelMetrics(channelName) {
    const channel = this.channels.get(channelName);
    if (!channel) return null;
    
    return {
      volume: channel.volume,
      mute: channel.mute,
      solo: channel.solo,
      activeSources: channel.sources.size,
      send: channel.send
    };
  }

  getAllMetrics() {
    const metrics = {
      masterVolume: this.masterGain.gain.value,
      channels: {}
    };
    
    this.channels.forEach((channel, name) => {
      metrics.channels[name] = this.getChannelMetrics(name);
    });
    
    return metrics;
  }

  dispose() {
    this.channels.forEach(channel => {
      channel.sources.forEach(source => {
        try { source.disconnect(); } catch (e) {}
      });
    });
    
    this.channels.clear();
    this.presets.clear();
    this.automationTracks.clear();
    
    if (this.masterGain) {
      this.masterGain.disconnect();
    }
  }
}

export default AudioMixer;