/**
 * Compression - Sistema de compresión de audio
 * Compresión inteligente y adaptativa para optimizar el uso de ancho de banda
 */

class AudioCompression {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.compressionWorker = null;
    this.isEnabled = true;
    this.compressionLevel = 'medium'; // low, medium, high, adaptive
    this.targetBitrate = 128; // kbps
    this.adaptiveSettings = {
      minBitrate: 64,
      maxBitrate: 320,
      qualityThreshold: 0.8,
      bandwidthThreshold: 1000, // kbps
      cpuThreshold: 70 // percentage
    };
    this.codecs = new Map();
    this.compressionQueue = [];
    this.compressionStats = {
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0,
      processingTime: 0,
      compressionCount: 0
    };
    this.qualityMetrics = new Map();
    this.bandwidthMonitor = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    await this.initializeWorker();
    this.setupCodecs();
    this.setupBandwidthMonitoring();
    this.setupQualityMetrics();
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('Audio Compression initialized');
  }

  async initializeWorker() {
    try {
      // Crear worker para compresión
      const workerBlob = new Blob([this.getWorkerScript()], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      
      this.compressionWorker = new Worker(workerUrl);
      
      this.compressionWorker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };
      
      this.compressionWorker.onerror = (error) => {
        console.error('Compression worker error:', error);
      };
      
      // Inicializar worker
      this.compressionWorker.postMessage({
        type: 'initialize',
        config: {
          sampleRate: this.audioManager.audioContext?.sampleRate || 44100,
          channels: 2
        }
      });
      
      URL.revokeObjectURL(workerUrl);
      
    } catch (error) {
      console.warn('Failed to initialize compression worker:', error);
      this.compressionWorker = null;
    }
  }

  setupCodecs() {
    // Configuración de códecs disponibles
    this.codecs.set('opus', {
      name: 'Opus',
      mimeType: 'audio/opus',
      quality: 0.9,
      efficiency: 0.95,
      latency: 'low',
      bitrateRange: { min: 16, max: 320 },
      supported: this.isCodecSupported('opus')
    });

    this.codecs.set('aac', {
      name: 'AAC',
      mimeType: 'audio/aac',
      quality: 0.85,
      efficiency: 0.8,
      latency: 'medium',
      bitrateRange: { min: 32, max: 320 },
      supported: this.isCodecSupported('aac')
    });

    this.codecs.set('mp3', {
      name: 'MP3',
      mimeType: 'audio/mpeg',
      quality: 0.75,
      efficiency: 0.7,
      latency: 'medium',
      bitrateRange: { min: 64, max: 320 },
      supported: this.isCodecSupported('mp3')
    });

    this.codecs.set('webm', {
      name: 'WebM Opus',
      mimeType: 'audio/webm; codecs=opus',
      quality: 0.9,
      efficiency: 0.9,
      latency: 'low',
      bitrateRange: { min: 16, max: 256 },
      supported: this.isCodecSupported('webm')
    });
  }

  isCodecSupported(codec) {
    const mediaRecorder = window.MediaRecorder;
    if (!mediaRecorder) return false;

    const mimeTypes = {
      opus: 'audio/webm; codecs=opus',
      aac: 'audio/mp4; codecs=aac',
      mp3: 'audio/mpeg',
      webm: 'audio/webm'
    };

    return mediaRecorder.isTypeSupported(mimeTypes[codec]);
  }

  setupBandwidthMonitoring() {
    this.bandwidthMonitor = {
      measurements: [],
      currentBandwidth: 0,
      isMonitoring: false,
      measurementInterval: null
    };

    // Detectar ancho de banda usando Network Information API si está disponible
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this.bandwidthMonitor.currentBandwidth = connection.downlink * 1000; // Mbps to kbps

      connection.addEventListener('change', () => {
        this.bandwidthMonitor.currentBandwidth = connection.downlink * 1000;
        this.adjustCompressionForBandwidth();
      });
    }
  }

  setupQualityMetrics() {
    // Métricas de calidad para diferentes tipos de audio
    this.qualityMetrics.set('speech', {
      targetSNR: 25, // dB
      minBitrate: 32,
      optimalBitrate: 64,
      frequencyRange: { min: 300, max: 3400 }
    });

    this.qualityMetrics.set('music', {
      targetSNR: 35,
      minBitrate: 128,
      optimalBitrate: 256,
      frequencyRange: { min: 20, max: 20000 }
    });

    this.qualityMetrics.set('ambient', {
      targetSNR: 30,
      minBitrate: 96,
      optimalBitrate: 192,
      frequencyRange: { min: 50, max: 16000 }
    });

    this.qualityMetrics.set('cultural', {
      targetSNR: 32,
      minBitrate: 128,
      optimalBitrate: 224,
      frequencyRange: { min: 40, max: 18000 }
    });
  }

  async compressAudio(audioData, options = {}) {
    if (!this.isEnabled) {
      return { success: false, reason: 'Compression disabled' };
    }

    const {
      sourceType = 'music',
      targetQuality = null,
      targetBitrate = null,
      codec = null,
      priority = 'normal'
    } = options;

    try {
      // Determinar configuración óptima
      const compressionConfig = this.determineOptimalCompression(
        audioData,
        sourceType,
        targetQuality,
        targetBitrate,
        codec
      );

      // Agregar a cola de compresión
      const compressionTask = {
        id: `compression_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        audioData,
        config: compressionConfig,
        options,
        priority,
        timestamp: Date.now()
      };

      if (priority === 'high') {
        this.compressionQueue.unshift(compressionTask);
      } else {
        this.compressionQueue.push(compressionTask);
      }

      // Procesar cola si es necesario
      return await this.processCompressionQueue();

    } catch (error) {
      console.error('Audio compression failed:', error);
      return { success: false, error: error.message };
    }
  }

  determineOptimalCompression(audioData, sourceType, targetQuality, targetBitrate, codec) {
    // Analizar características del audio
    const audioAnalysis = this.analyzeAudioCharacteristics(audioData);
    
    // Obtener métricas de calidad para el tipo de fuente
    const qualityMetrics = this.qualityMetrics.get(sourceType) || this.qualityMetrics.get('music');
    
    // Determinar códec óptimo
    const optimalCodec = codec || this.selectOptimalCodec(audioAnalysis, sourceType);
    
    // Calcular bitrate objetivo
    const optimalBitrate = this.calculateOptimalBitrate(
      audioAnalysis,
      qualityMetrics,
      targetQuality,
      targetBitrate
    );
    
    // Configuración de compresión
    return {
      codec: optimalCodec,
      bitrate: optimalBitrate,
      sampleRate: this.getOptimalSampleRate(audioAnalysis, sourceType),
      channels: audioAnalysis.channels,
      quality: targetQuality || this.getQualityFromBitrate(optimalBitrate, sourceType),
      preprocessing: this.getPreprocessingOptions(audioAnalysis, sourceType)
    };
  }

  analyzeAudioCharacteristics(audioData) {
    const analysis = {
      length: audioData.length,
      channels: audioData.numberOfChannels || 2,
      sampleRate: audioData.sampleRate || 44100,
      dynamicRange: 0,
      spectralContent: {},
      speechContent: 0,
      musicContent: 0,
      silenceRatio: 0
    };

    // Análisis básico de contenido
    if (audioData.getChannelData) {
      const channelData = audioData.getChannelData(0);
      analysis.dynamicRange = this.calculateDynamicRange(channelData);
      analysis.spectralContent = this.analyzeSpectralContent(channelData);
      analysis.speechContent = this.detectSpeechContent(channelData);
      analysis.musicContent = 1 - analysis.speechContent;
      analysis.silenceRatio = this.calculateSilenceRatio(channelData);
    }

    return analysis;
  }

  calculateDynamicRange(audioData) {
    let max = 0;
    let min = 0;
    let rmsSum = 0;

    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      max = Math.max(max, sample);
      min = Math.min(min, sample);
      rmsSum += sample * sample;
    }

    const peak = Math.max(Math.abs(max), Math.abs(min));
    const rms = Math.sqrt(rmsSum / audioData.length);
    
    return peak > 0 ? 20 * Math.log10(peak / Math.max(rms, 0.00001)) : 0;
  }

  analyzeSpectralContent(audioData) {
    // Análisis espectral simplificado
    const fftSize = 2048;
    const frequencyBins = Math.min(fftSize / 2, audioData.length / 2);
    
    // Dividir en bandas de frecuencia
    const bands = {
      sub: 0,     // 20-60 Hz
      bass: 0,    // 60-250 Hz
      lowMid: 0,  // 250-500 Hz
      mid: 0,     // 500-2000 Hz
      highMid: 0, // 2000-4000 Hz
      presence: 0, // 4000-6000 Hz
      brilliance: 0 // 6000+ Hz
    };

    // Simulación de análisis espectral
    // En una implementación real, se usaría FFT
    for (let i = 0; i < Math.min(1000, audioData.length); i += 100) {
      const sample = Math.abs(audioData[i]);
      
      // Distribución aproximada por frecuencias
      if (i < 100) bands.sub += sample;
      else if (i < 200) bands.bass += sample;
      else if (i < 300) bands.lowMid += sample;
      else if (i < 500) bands.mid += sample;
      else if (i < 700) bands.highMid += sample;
      else if (i < 850) bands.presence += sample;
      else bands.brilliance += sample;
    }

    return bands;
  }

  detectSpeechContent(audioData) {
    // Detección simple de contenido de habla
    let speechIndicators = 0;
    let totalFrames = 0;
    
    const frameSize = 1024;
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
      const frame = audioData.slice(i, i + frameSize);
      
      // Calcular energía del frame
      let energy = 0;
      for (let j = 0; j < frame.length; j++) {
        energy += frame[j] * frame[j];
      }
      energy /= frame.length;
      
      // Calcular cruce por cero (indicador de habla)
      let zeroCrossings = 0;
      for (let j = 1; j < frame.length; j++) {
        if ((frame[j] >= 0) !== (frame[j - 1] >= 0)) {
          zeroCrossings++;
        }
      }
      
      const zcr = zeroCrossings / frame.length;
      
      // Heurística simple para detectar habla
      if (energy > 0.001 && zcr > 0.01 && zcr < 0.2) {
        speechIndicators++;
      }
      
      totalFrames++;
    }
    
    return totalFrames > 0 ? speechIndicators / totalFrames : 0;
  }

  calculateSilenceRatio(audioData) {
    const silenceThreshold = 0.001;
    let silentSamples = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      if (Math.abs(audioData[i]) < silenceThreshold) {
        silentSamples++;
      }
    }
    
    return silentSamples / audioData.length;
  }

  selectOptimalCodec(audioAnalysis, sourceType) {
    // Seleccionar códec basado en características del audio
    const supportedCodecs = Array.from(this.codecs.entries())
      .filter(([_, codec]) => codec.supported)
      .sort((a, b) => b[1].efficiency - a[1].efficiency);

    if (supportedCodecs.length === 0) {
      return 'mp3'; // Fallback
    }

    // Para habla, priorizar eficiencia
    if (audioAnalysis.speechContent > 0.7) {
      return supportedCodecs.find(([name]) => name === 'opus')?.[0] || supportedCodecs[0][0];
    }

    // Para música, priorizar calidad
    if (audioAnalysis.musicContent > 0.7) {
      return supportedCodecs.find(([name]) => ['opus', 'aac'].includes(name))?.[0] || supportedCodecs[0][0];
    }

    // Por defecto, usar el más eficiente
    return supportedCodecs[0][0];
  }

  calculateOptimalBitrate(audioAnalysis, qualityMetrics, targetQuality, targetBitrate) {
    if (targetBitrate) {
      return Math.max(qualityMetrics.minBitrate, Math.min(320, targetBitrate));
    }

    let baseBitrate = qualityMetrics.optimalBitrate;

    // Ajustar basado en características del audio
    if (audioAnalysis.speechContent > 0.7) {
      baseBitrate = Math.max(32, baseBitrate * 0.5);
    }

    if (audioAnalysis.silenceRatio > 0.3) {
      baseBitrate *= 0.8;
    }

    if (audioAnalysis.dynamicRange > 30) {
      baseBitrate *= 1.2;
    }

    // Ajustar por ancho de banda disponible
    if (this.bandwidthMonitor.currentBandwidth > 0) {
      const maxBitrate = Math.min(320, this.bandwidthMonitor.currentBandwidth * 0.8);
      baseBitrate = Math.min(baseBitrate, maxBitrate);
    }

    // Aplicar nivel de compresión
    const compressionMultipliers = {
      low: 1.2,
      medium: 1.0,
      high: 0.7,
      adaptive: this.getAdaptiveMultiplier()
    };

    baseBitrate *= compressionMultipliers[this.compressionLevel] || 1.0;

    return Math.max(qualityMetrics.minBitrate, Math.min(320, Math.round(baseBitrate)));
  }

  getAdaptiveMultiplier() {
    // Multiplicador adaptativo basado en condiciones del sistema
    let multiplier = 1.0;

    // Ajustar por ancho de banda
    if (this.bandwidthMonitor.currentBandwidth < this.adaptiveSettings.bandwidthThreshold) {
      multiplier *= 0.8;
    }

    // Ajustar por uso de CPU (simulado)
    const cpuUsage = this.getCPUUsage();
    if (cpuUsage > this.adaptiveSettings.cpuThreshold) {
      multiplier *= 0.9;
    }

    return multiplier;
  }

  getCPUUsage() {
    // Estimación simple de uso de CPU basada en rendimiento
    if (this.compressionStats.processingTime > 0 && this.compressionStats.compressionCount > 0) {
      const avgProcessingTime = this.compressionStats.processingTime / this.compressionStats.compressionCount;
      return Math.min(100, avgProcessingTime * 2); // Estimación heurística
    }
    return 50; // Valor por defecto
  }

  getOptimalSampleRate(audioAnalysis, sourceType) {
    const sourceSampleRate = audioAnalysis.sampleRate;

    // Para habla, 16kHz o 22kHz suele ser suficiente
    if (audioAnalysis.speechContent > 0.7) {
      return Math.min(22050, sourceSampleRate);
    }

    // Para música, mantener calidad pero optimizar si es necesario
    if (this.compressionLevel === 'high') {
      return Math.min(44100, sourceSampleRate);
    }

    return sourceSampleRate;
  }

  getQualityFromBitrate(bitrate, sourceType) {
    const qualityMetrics = this.qualityMetrics.get(sourceType);
    const range = qualityMetrics.optimalBitrate - qualityMetrics.minBitrate;
    const position = (bitrate - qualityMetrics.minBitrate) / range;
    
    return Math.max(0.1, Math.min(1.0, position));
  }

  getPreprocessingOptions(audioAnalysis, sourceType) {
    const options = {
      normalize: true,
      deEss: false,
      noiseGate: false,
      highpassFilter: false,
      lowpassFilter: false
    };

    // Preprocesamiento específico para habla
    if (audioAnalysis.speechContent > 0.7) {
      options.deEss = true;
      options.noiseGate = true;
      options.highpassFilter = { frequency: 80 };
      options.lowpassFilter = { frequency: 8000 };
    }

    // Preprocesamiento para música
    if (audioAnalysis.musicContent > 0.7) {
      if (audioAnalysis.silenceRatio > 0.2) {
        options.noiseGate = true;
      }
    }

    return options;
  }

  async processCompressionQueue() {
    if (this.compressionQueue.length === 0) {
      return { success: true, message: 'No compression tasks in queue' };
    }

    const task = this.compressionQueue.shift();
    
    try {
      const startTime = performance.now();
      
      // Enviar tarea al worker si está disponible
      if (this.compressionWorker) {
        return await this.processWithWorker(task);
      } else {
        return await this.processWithMainThread(task);
      }
      
    } catch (error) {
      console.error('Compression task failed:', error);
      return { success: false, error: error.message, taskId: task.id };
    }
  }

  async processWithWorker(task) {
    return new Promise((resolve) => {
      const messageHandler = (event) => {
        const { type, taskId, data, error } = event.data;
        
        if (type === 'compressionComplete' && taskId === task.id) {
          this.compressionWorker.removeEventListener('message', messageHandler);
          this.updateCompressionStats(data.originalSize, data.compressedSize, data.processingTime);
          resolve({ success: true, ...data });
        } else if (type === 'compressionError' && taskId === task.id) {
          this.compressionWorker.removeEventListener('message', messageHandler);
          resolve({ success: false, error });
        }
      };
      
      this.compressionWorker.addEventListener('message', messageHandler);
      
      this.compressionWorker.postMessage({
        type: 'compress',
        taskId: task.id,
        audioData: task.audioData,
        config: task.config
      });
    });
  }

  async processWithMainThread(task) {
    // Compresión básica en el hilo principal (fallback)
    const startTime = performance.now();
    
    // Simulación de compresión
    const originalSize = task.audioData.length * 4; // 32-bit float
    const compressionRatio = this.estimateCompressionRatio(task.config);
    const compressedSize = Math.floor(originalSize / compressionRatio);
    
    const processingTime = performance.now() - startTime;
    
    this.updateCompressionStats(originalSize, compressedSize, processingTime);
    
    return {
      success: true,
      taskId: task.id,
      originalSize,
      compressedSize,
      compressionRatio,
      processingTime,
      codec: task.config.codec,
      bitrate: task.config.bitrate
    };
  }

  estimateCompressionRatio(config) {
    // Estimación de ratio de compresión basada en configuración
    const codecEfficiency = {
      opus: 8,
      aac: 6,
      mp3: 5,
      webm: 8
    };
    
    const baseRatio = codecEfficiency[config.codec] || 5;
    const bitrateMultiplier = 128 / config.bitrate;
    
    return baseRatio * bitrateMultiplier;
  }

  updateCompressionStats(originalSize, compressedSize, processingTime) {
    this.compressionStats.totalOriginalSize += originalSize;
    this.compressionStats.totalCompressedSize += compressedSize;
    this.compressionStats.processingTime += processingTime;
    this.compressionStats.compressionCount++;
    
    if (this.compressionStats.totalOriginalSize > 0) {
      this.compressionStats.averageCompressionRatio = 
        this.compressionStats.totalOriginalSize / this.compressionStats.totalCompressedSize;
    }
  }

  adjustCompressionForBandwidth() {
    const currentBandwidth = this.bandwidthMonitor.currentBandwidth;
    
    if (currentBandwidth < 500) {
      this.compressionLevel = 'high';
      this.targetBitrate = 64;
    } else if (currentBandwidth < 1000) {
      this.compressionLevel = 'medium';
      this.targetBitrate = 128;
    } else {
      this.compressionLevel = 'low';
      this.targetBitrate = 192;
    }
    
    // Emitir evento de cambio
    document.dispatchEvent(new CustomEvent('compression:settingsChanged', {
      detail: {
        level: this.compressionLevel,
        bitrate: this.targetBitrate,
        bandwidth: currentBandwidth
      }
    }));
  }

  handleWorkerMessage(data) {
    const { type } = data;
    
    switch (type) {
      case 'initialized':
        console.log('Compression worker initialized');
        break;
        
      case 'compressionComplete':
      case 'compressionError':
        // Manejado en processWithWorker
        break;
        
      default:
        console.warn('Unknown worker message type:', type);
    }
  }

  getWorkerScript() {
    // Script del worker de compresión (simplificado)
    return `
      class CompressionWorker {
        constructor() {
          this.isInitialized = false;
        }
        
        initialize(config) {
          this.config = config;
          this.isInitialized = true;
          self.postMessage({ type: 'initialized' });
        }
        
        compress(taskId, audioData, config) {
          try {
            const startTime = performance.now();
            
            // Simulación de compresión
            const originalSize = audioData.length * 4;
            const compressionRatio = this.estimateRatio(config);
            const compressedSize = Math.floor(originalSize / compressionRatio);
            
            const processingTime = performance.now() - startTime;
            
            self.postMessage({
              type: 'compressionComplete',
              taskId,
              data: {
                originalSize,
                compressedSize,
                compressionRatio,
                processingTime,
                codec: config.codec,
                bitrate: config.bitrate
              }
            });
            
          } catch (error) {
            self.postMessage({
              type: 'compressionError',
              taskId,
              error: error.message
            });
          }
        }
        
        estimateRatio(config) {
          const ratios = { opus: 8, aac: 6, mp3: 5, webm: 8 };
          return (ratios[config.codec] || 5) * (128 / config.bitrate);
        }
      }
      
      const worker = new CompressionWorker();
      
      self.addEventListener('message', (event) => {
        const { type, taskId, audioData, config } = event.data;
        
        if (type === 'initialize') {
          worker.initialize(config);
        } else if (type === 'compress') {
          worker.compress(taskId, audioData, config);
        }
      });
    `;
  }

  setupEventListeners() {
    // Eventos de audio manager
    this.audioManager.events?.addEventListener('audioLoaded', (e) => {
      if (this.compressionLevel === 'adaptive') {
        this.compressAudio(e.detail.audioData, {
          sourceType: e.detail.type,
          priority: 'low'
        });
      }
    });

    // Eventos de red
    window.addEventListener('online', () => {
      this.adjustCompressionForBandwidth();
    });

    window.addEventListener('offline', () => {
      this.compressionLevel = 'high';
    });

    // Eventos de preferencias
    document.addEventListener('preference:changed', (e) => {
      if (e.detail.path.startsWith('compression.')) {
        this.updateCompressionSettings(e.detail.path, e.detail.value);
      }
    });
  }

  updateCompressionSettings(path, value) {
    const setting = path.split('.')[1];
    
    switch (setting) {
      case 'level':
        this.compressionLevel = value;
        break;
      case 'bitrate':
        this.targetBitrate = value;
        break;
      case 'enabled':
        this.isEnabled = value;
        break;
    }
  }

  getCompressionStats() {
    return {
      ...this.compressionStats,
      queueLength: this.compressionQueue.length,
      currentLevel: this.compressionLevel,
      currentBitrate: this.targetBitrate,
      bandwidth: this.bandwidthMonitor.currentBandwidth,
      supportedCodecs: Array.from(this.codecs.entries())
        .filter(([_, codec]) => codec.supported)
        .map(([name, codec]) => ({ name, ...codec }))
    };
  }

  setCompressionLevel(level) {
    if (['low', 'medium', 'high', 'adaptive'].includes(level)) {
      this.compressionLevel = level;
      this.saveSettings();
    }
  }

  setBitrate(bitrate) {
    this.targetBitrate = Math.max(32, Math.min(320, bitrate));
    this.saveSettings();
  }

  enable() {
    this.isEnabled = true;
    this.saveSettings();
  }

  disable() {
    this.isEnabled = false;
    this.compressionQueue = [];
    this.saveSettings();
  }

  saveSettings() {
    const settings = {
      enabled: this.isEnabled,
      level: this.compressionLevel,
      bitrate: this.targetBitrate,
      adaptiveSettings: this.adaptiveSettings
    };
    
    localStorage.setItem('audioCompressionSettings', JSON.stringify(settings));
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('audioCompressionSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.isEnabled = settings.enabled !== false;
        this.compressionLevel = settings.level || 'medium';
        this.targetBitrate = settings.bitrate || 128;
        
        if (settings.adaptiveSettings) {
          Object.assign(this.adaptiveSettings, settings.adaptiveSettings);
        }
      }
    } catch (error) {
      console.warn('Error loading compression settings:', error);
    }
  }

  dispose() {
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
    
    if (this.bandwidthMonitor.measurementInterval) {
      clearInterval(this.bandwidthMonitor.measurementInterval);
    }
    
    this.compressionQueue = [];
    this.codecs.clear();
    this.qualityMetrics.clear();
    this.isInitialized = false;
  }
}

export default AudioCompression;