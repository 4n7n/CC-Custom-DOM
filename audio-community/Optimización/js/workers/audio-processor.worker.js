/**
 * Audio Processor Worker - Web Worker para procesamiento de audio
 * Procesamiento de audio en segundo plano para no bloquear el hilo principal
 */

class AudioProcessorWorker {
  constructor() {
    this.isInitialized = false;
    this.audioContext = null;
    this.processors = new Map();
    this.buffers = new Map();
    this.analysisData = new Map();
    this.compressionSettings = {
      quality: 0.8,
      bitrate: 128,
      sampleRate: 44100
    };
    this.realTimeProcessor = null;
    this.batchProcessor = null;
    this.filterBank = new Map();
    this.performanceMetrics = {
      processedSamples: 0,
      processingTime: 0,
      averageLatency: 0,
      cpuUsage: 0
    };
  }

  initialize(config = {}) {
    try {
      // Configurar AudioContext en el Worker (OfflineAudioContext)
      this.setupOfflineAudioContext(config);
      this.setupProcessors();
      this.setupFilters();
      this.initializeBuffers();
      
      this.isInitialized = true;
      
      self.postMessage({
        type: 'initialized',
        success: true,
        capabilities: this.getCapabilities()
      });
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: 'Failed to initialize audio processor',
        error: error.message
      });
    }
  }

  setupOfflineAudioContext(config) {
    const {
      sampleRate = 44100,
      length = 1024,
      numberOfChannels = 2
    } = config;

    // OfflineAudioContext para procesamiento en batch
    this.batchProcessor = new OfflineAudioContext(
      numberOfChannels,
      length,
      sampleRate
    );

    this.compressionSettings.sampleRate = sampleRate;
  }

  setupProcessors() {
    // Procesadores de audio especializados
    this.processors.set('compressor', this.createCompressor.bind(this));
    this.processors.set('normalizer', this.createNormalizer.bind(this));
    this.processors.set('spatializer', this.createSpatializer.bind(this));
    this.processors.set('equalizer', this.createEqualizer.bind(this));
    this.processors.set('limiter', this.createLimiter.bind(this));
    this.processors.set('analyzer', this.createAnalyzer.bind(this));
    this.processors.set('encoder', this.createEncoder.bind(this));
    this.processors.set('decoder', this.createDecoder.bind(this));
  }

  setupFilters() {
    // Banco de filtros optimizados
    this.filterBank.set('lowpass', {
      type: 'lowpass',
      frequency: 8000,
      Q: 1.0
    });

    this.filterBank.set('highpass', {
      type: 'highpass', 
      frequency: 80,
      Q: 0.7
    });

    this.filterBank.set('bandpass', {
      type: 'bandpass',
      frequency: 1000,
      Q: 1.0
    });

    this.filterBank.set('notch', {
      type: 'notch',
      frequency: 60,
      Q: 30
    });
  }

  initializeBuffers() {
    // Buffers de trabajo reutilizables
    this.buffers.set('input', new Float32Array(4096));
    this.buffers.set('output', new Float32Array(4096));
    this.buffers.set('temp', new Float32Array(4096));
    this.buffers.set('frequency', new Float32Array(2048));
    this.buffers.set('magnitude', new Float32Array(2048));
  }

  // Procesadores específicos

  createCompressor() {
    return {
      process: (inputBuffer, outputBuffer, options = {}) => {
        const {
          threshold = -20,
          ratio = 4,
          attack = 0.003,
          release = 0.1,
          knee = 2
        } = options;

        return this.dynamicRangeCompression(
          inputBuffer,
          outputBuffer,
          threshold,
          ratio,
          attack,
          release,
          knee
        );
      }
    };
  }

  dynamicRangeCompression(input, output, threshold, ratio, attack, release, knee) {
    const thresholdLinear = this.dbToLinear(threshold);
    const attackCoeff = Math.exp(-1 / (attack * this.compressionSettings.sampleRate));
    const releaseCoeff = Math.exp(-1 / (release * this.compressionSettings.sampleRate));
    
    let envelope = 0;
    
    for (let i = 0; i < input.length; i++) {
      const inputLevel = Math.abs(input[i]);
      
      // Envelope follower
      if (inputLevel > envelope) {
        envelope = inputLevel + (envelope - inputLevel) * attackCoeff;
      } else {
        envelope = inputLevel + (envelope - inputLevel) * releaseCoeff;
      }
      
      // Compression calculation
      let gain = 1.0;
      if (envelope > thresholdLinear) {
        const overThreshold = envelope - thresholdLinear;
        const compressedGain = thresholdLinear + (overThreshold / ratio);
        gain = compressedGain / envelope;
        
        // Soft knee
        if (knee > 0) {
          const kneeRatio = Math.min(1, overThreshold / (knee * thresholdLinear));
          const softGain = 1 + (gain - 1) * kneeRatio;
          gain = softGain;
        }
      }
      
      output[i] = input[i] * gain;
    }
    
    return { processed: true, gain: this.linearToDb(1 / Math.max(0.001, envelope)) };
  }

  createNormalizer() {
    return {
      process: (inputBuffer, outputBuffer, options = {}) => {
        const { targetLevel = -3, method = 'peak' } = options;
        
        if (method === 'peak') {
          return this.peakNormalization(inputBuffer, outputBuffer, targetLevel);
        } else if (method === 'rms') {
          return this.rmsNormalization(inputBuffer, outputBuffer, targetLevel);
        } else if (method === 'lufs') {
          return this.lufsNormalization(inputBuffer, outputBuffer, targetLevel);
        }
        
        return { processed: false, error: 'Unknown normalization method' };
      }
    };
  }

  peakNormalization(input, output, targetLevel) {
    let peak = 0;
    
    // Find peak
    for (let i = 0; i < input.length; i++) {
      peak = Math.max(peak, Math.abs(input[i]));
    }
    
    if (peak === 0) {
      output.set(input);
      return { processed: true, gain: 0 };
    }
    
    const targetLinear = this.dbToLinear(targetLevel);
    const gain = targetLinear / peak;
    
    // Apply gain
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] * gain;
    }
    
    return { processed: true, gain: this.linearToDb(gain) };
  }

  rmsNormalization(input, output, targetLevel) {
    let rmsSum = 0;
    
    // Calculate RMS
    for (let i = 0; i < input.length; i++) {
      rmsSum += input[i] * input[i];
    }
    
    const rms = Math.sqrt(rmsSum / input.length);
    
    if (rms === 0) {
      output.set(input);
      return { processed: true, gain: 0 };
    }
    
    const targetLinear = this.dbToLinear(targetLevel);
    const gain = targetLinear / rms;
    
    // Apply gain with limiting
    for (let i = 0; i < input.length; i++) {
      output[i] = Math.max(-1, Math.min(1, input[i] * gain));
    }
    
    return { processed: true, gain: this.linearToDb(gain) };
  }

  createSpatializer() {
    return {
      process: (inputBuffer, outputBuffer, options = {}) => {
        const {
          position = { x: 0, y: 0, z: 0 },
          listenerPosition = { x: 0, y: 0, z: 0 },
          roomSize = { width: 10, height: 3, depth: 10 }
        } = options;

        return this.spatialAudioProcessing(
          inputBuffer,
          outputBuffer,
          position,
          listenerPosition,
          roomSize
        );
      }
    };
  }

  spatialAudioProcessing(input, output, sourcePos, listenerPos, roomSize) {
    // Calcular distancia y atenuación
    const distance = this.calculateDistance(sourcePos, listenerPos);
    const attenuation = this.calculateAttenuation(distance);
    
    // Calcular delay por distancia
    const delay = this.calculateDelay(distance);
    
    // Aplicar HRTF simplificado
    const hrtf = this.calculateHRTF(sourcePos, listenerPos);
    
    // Procesar canal izquierdo y derecho
    for (let i = 0; i < input.length; i += 2) {
      const sample = input[i] * attenuation;
      
      // Aplicar delay (simplificado)
      const delayedIndex = Math.max(0, i - Math.floor(delay));
      const delayedSample = delayedIndex < input.length ? input[delayedIndex] : 0;
      
      output[i] = delayedSample * hrtf.left;     // Left channel
      output[i + 1] = delayedSample * hrtf.right; // Right channel
    }
    
    return {
      processed: true,
      distance,
      attenuation: this.linearToDb(attenuation),
      delay
    };
  }

  createAnalyzer() {
    return {
      process: (inputBuffer, outputBuffer, options = {}) => {
        const {
          fftSize = 2048,
          smoothingTimeConstant = 0.8,
          analysisType = 'frequency'
        } = options;

        if (analysisType === 'frequency') {
          return this.frequencyAnalysis(inputBuffer, fftSize, smoothingTimeConstant);
        } else if (analysisType === 'peak') {
          return this.peakAnalysis(inputBuffer);
        } else if (analysisType === 'rms') {
          return this.rmsAnalysis(inputBuffer);
        } else if (analysisType === 'spectral') {
          return this.spectralAnalysis(inputBuffer, fftSize);
        }

        return { processed: false, error: 'Unknown analysis type' };
      }
    };
  }

  frequencyAnalysis(input, fftSize, smoothing) {
    // Implementación simplificada de FFT
    const frequencyData = this.performFFT(input, fftSize);
    const magnitudeData = this.buffers.get('magnitude');
    
    // Calcular magnitudes
    for (let i = 0; i < frequencyData.length / 2; i++) {
      const real = frequencyData[i * 2];
      const imag = frequencyData[i * 2 + 1];
      const magnitude = Math.sqrt(real * real + imag * imag);
      
      // Aplicar suavizado
      if (this.analysisData.has('previousMagnitudes')) {
        const previous = this.analysisData.get('previousMagnitudes')[i] || 0;
        magnitudeData[i] = previous * smoothing + magnitude * (1 - smoothing);
      } else {
        magnitudeData[i] = magnitude;
      }
    }
    
    // Guardar para próxima iteración
    this.analysisData.set('previousMagnitudes', Array.from(magnitudeData));
    
    return {
      processed: true,
      frequencyData: Array.from(magnitudeData.slice(0, fftSize / 2)),
      fundamentalFrequency: this.findFundamentalFrequency(magnitudeData, fftSize),
      spectralCentroid: this.calculateSpectralCentroid(magnitudeData)
    };
  }

  createEncoder() {
    return {
      process: (inputBuffer, outputBuffer, options = {}) => {
        const {
          format = 'mp3',
          quality = this.compressionSettings.quality,
          bitrate = this.compressionSettings.bitrate
        } = options;

        if (format === 'mp3') {
          return this.mp3Encode(inputBuffer, quality, bitrate);
        } else if (format === 'opus') {
          return this.opusEncode(inputBuffer, quality, bitrate);
        } else if (format === 'aac') {
          return this.aacEncode(inputBuffer, quality, bitrate);
        }

        return { processed: false, error: 'Unsupported format' };
      }
    };
  }

  // Utilidades matemáticas

  performFFT(input, size) {
    // Implementación simplificada de FFT (Cooley-Tukey)
    const N = Math.min(size, input.length);
    const output = new Float32Array(N * 2);
    
    // Bit-reversal
    for (let i = 0; i < N; i++) {
      const j = this.reverseBits(i, Math.log2(N));
      output[j * 2] = input[i];
      output[j * 2 + 1] = 0;
    }
    
    // FFT computation
    for (let len = 2; len <= N; len *= 2) {
      const angleStep = -2 * Math.PI / len;
      
      for (let i = 0; i < N; i += len) {
        for (let j = 0; j < len / 2; j++) {
          const angle = j * angleStep;
          const wReal = Math.cos(angle);
          const wImag = Math.sin(angle);
          
          const u = i + j;
          const v = i + j + len / 2;
          
          const tReal = output[v * 2] * wReal - output[v * 2 + 1] * wImag;
          const tImag = output[v * 2] * wImag + output[v * 2 + 1] * wReal;
          
          output[v * 2] = output[u * 2] - tReal;
          output[v * 2 + 1] = output[u * 2 + 1] - tImag;
          
          output[u * 2] += tReal;
          output[u * 2 + 1] += tImag;
        }
      }
    }
    
    return output;
  }

  reverseBits(n, bits) {
    let result = 0;
    for (let i = 0; i < bits; i++) {
      result = (result << 1) | (n & 1);
      n >>= 1;
    }
    return result;
  }

  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  calculateAttenuation(distance) {
    // Ley del cuadrado inverso con límites
    const minDistance = 0.1;
    const maxDistance = 100;
    const clampedDistance = Math.max(minDistance, Math.min(maxDistance, distance));
    return 1 / (1 + clampedDistance * clampedDistance);
  }

  calculateDelay(distance) {
    // Velocidad del sonido: ~343 m/s
    const soundSpeed = 343;
    return (distance / soundSpeed) * this.compressionSettings.sampleRate;
  }

  calculateHRTF(sourcePos, listenerPos) {
    // HRTF simplificado basado en posición
    const angle = Math.atan2(sourcePos.x - listenerPos.x, sourcePos.z - listenerPos.z);
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
    
    return {
      left: Math.cos(normalizedAngle * Math.PI / 2),
      right: Math.sin(normalizedAngle * Math.PI / 2)
    };
  }

  findFundamentalFrequency(magnitudes, fftSize) {
    let maxMagnitude = 0;
    let fundamentalBin = 0;
    
    // Buscar en el rango de frecuencias fundamentales (80-800 Hz)
    const minBin = Math.floor(80 * fftSize / this.compressionSettings.sampleRate);
    const maxBin = Math.floor(800 * fftSize / this.compressionSettings.sampleRate);
    
    for (let i = minBin; i < maxBin && i < magnitudes.length; i++) {
      if (magnitudes[i] > maxMagnitude) {
        maxMagnitude = magnitudes[i];
        fundamentalBin = i;
      }
    }
    
    return fundamentalBin * this.compressionSettings.sampleRate / fftSize;
  }

  calculateSpectralCentroid(magnitudes) {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < magnitudes.length; i++) {
      const frequency = i * this.compressionSettings.sampleRate / (magnitudes.length * 2);
      numerator += frequency * magnitudes[i];
      denominator += magnitudes[i];
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }

  dbToLinear(db) {
    return Math.pow(10, db / 20);
  }

  linearToDb(linear) {
    return 20 * Math.log10(Math.max(0.000001, linear));
  }

  // Codificación simplificada (placeholder)
  mp3Encode(input, quality, bitrate) {
    // Simulación de codificación MP3
    const compressionRatio = 128 / bitrate;
    const compressedSize = Math.floor(input.length / compressionRatio);
    
    return {
      processed: true,
      format: 'mp3',
      originalSize: input.length * 4, // 32-bit float
      compressedSize: compressedSize,
      compressionRatio: compressionRatio,
      estimatedQuality: quality
    };
  }

  opusEncode(input, quality, bitrate) {
    // Simulación de codificación Opus
    const compressionRatio = 96 / bitrate; // Opus más eficiente
    const compressedSize = Math.floor(input.length / compressionRatio);
    
    return {
      processed: true,
      format: 'opus',
      originalSize: input.length * 4,
      compressedSize: compressedSize,
      compressionRatio: compressionRatio,
      estimatedQuality: quality
    };
  }

  // Métodos de procesamiento de mensajes

  processAudioBatch(data) {
    const startTime = performance.now();
    
    try {
      const { audioData, processingChain, options } = data;
      const inputBuffer = new Float32Array(audioData);
      const outputBuffer = new Float32Array(audioData.length);
      
      let currentBuffer = inputBuffer;
      let tempBuffer = this.buffers.get('temp');
      
      // Aplicar cadena de procesamiento
      const results = [];
      
      for (const step of processingChain) {
        const processor = this.processors.get(step.type);
        if (processor) {
          // Resize temp buffer if needed
          if (tempBuffer.length < currentBuffer.length) {
            tempBuffer = new Float32Array(currentBuffer.length);
            this.buffers.set('temp', tempBuffer);
          }
          
          const result = processor.process(currentBuffer, tempBuffer, step.options);
          results.push({ step: step.type, result });
          
          // Swap buffers
          [currentBuffer, tempBuffer] = [tempBuffer, currentBuffer];
        }
      }
      
      // Copy final result to output
      outputBuffer.set(currentBuffer.subarray(0, outputBuffer.length));
      
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics(audioData.length, processingTime);
      
      self.postMessage({
        type: 'batchProcessed',
        audioData: Array.from(outputBuffer),
        results,
        processingTime,
        metrics: this.getPerformanceMetrics()
      });
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: 'Batch processing failed',
        error: error.message
      });
    }
  }

  analyzeAudio(data) {
    try {
      const { audioData, analysisType, options } = data;
      const inputBuffer = new Float32Array(audioData);
      
      const analyzer = this.processors.get('analyzer');
      const result = analyzer.process(inputBuffer, null, {
        analysisType,
        ...options
      });
      
      self.postMessage({
        type: 'analysisComplete',
        result
      });
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: 'Analysis failed',
        error: error.message
      });
    }
  }

  updatePerformanceMetrics(samplesProcessed, processingTime) {
    this.performanceMetrics.processedSamples += samplesProcessed;
    this.performanceMetrics.processingTime += processingTime;
    
    const totalOperations = this.performanceMetrics.processedSamples / 1024;
    this.performanceMetrics.averageLatency = 
      this.performanceMetrics.processingTime / totalOperations;
    
    // Estimación simple de uso de CPU
    const maxProcessingTime = (samplesProcessed / this.compressionSettings.sampleRate) * 1000;
    this.performanceMetrics.cpuUsage = 
      Math.min(100, (processingTime / maxProcessingTime) * 100);
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  getCapabilities() {
    return {
      processors: Array.from(this.processors.keys()),
      filters: Array.from(this.filterBank.keys()),
      maxSampleRate: 96000,
      maxChannels: 8,
      supportedFormats: ['mp3', 'opus', 'aac'],
      realTimeCapable: true,
      batchProcessing: true
    };
  }
}

// Instanciar worker
const worker = new AudioProcessorWorker();

// Message handler
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'initialize':
      worker.initialize(data);
      break;
      
    case 'processBatch':
      worker.processAudioBatch(data);
      break;
      
    case 'analyze':
      worker.analyzeAudio(data);
      break;
      
    case 'getMetrics':
      self.postMessage({
        type: 'metrics',
        data: worker.getPerformanceMetrics()
      });
      break;
      
    case 'getCapabilities':
      self.postMessage({
        type: 'capabilities',
        data: worker.getCapabilities()
      });
      break;
      
    default:
      self.postMessage({
        type: 'error',
        message: `Unknown message type: ${type}`
      });
  }
});

// Error handler
self.addEventListener('error', (error) => {
  self.postMessage({
    type: 'error',
    message: 'Worker error',
    error: error.message
  });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  self.postMessage({
    type: 'error',
    message: 'Unhandled promise rejection',
    error: event.reason
  });
});