/**
 * Bandwidth Optimization - Optimización de ancho de banda
 * Sistema inteligente para optimizar el uso del ancho de banda de red
 */

class BandwidthOptimization {
  constructor(audioManager, compressionSystem) {
    this.audioManager = audioManager;
    this.compressionSystem = compressionSystem;
    this.isEnabled = true;
    this.optimizationMode = 'adaptive'; // conservative, balanced, adaptive, aggressive
    this.networkMetrics = {
      currentBandwidth: 0,
      effectiveType: 'unknown',
      rtt: 0,
      downlink: 0,
      saveData: false,
      isOnline: true
    };
    this.bandwidthHistory = [];
    this.trafficPatterns = new Map();
    this.optimizationStrategies = new Map();
    this.cachingSystem = new Map();
    this.priorityQueue = [];
    this.transferQueue = [];
    this.adaptationSettings = {
      minBandwidth: 64, // kbps
      maxBandwidth: 1000,
      bufferThreshold: 0.3,
      latencyThreshold: 100, // ms
      packetsLoss: 0.05
    };
    this.monitoring = {
      isActive: false,
      interval: null,
      measurements: [],
      realTimeStats: {}
    };
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.setupOptimizationStrategies();
    this.setupCachingSystem();
    await this.detectNetworkCapabilities();
    this.startBandwidthMonitoring();
    this.setupEventListeners();
    this.loadSettings();
    
    this.isInitialized = true;
    console.log('Bandwidth Optimization initialized');
  }

  setupOptimizationStrategies() {
    // Estrategias de optimización para diferentes condiciones
    this.optimizationStrategies.set('2g', {
      name: 'Optimización 2G',
      maxBitrate: 32,
      compressionLevel: 'high',
      enablePreloading: false,
      enableCaching: true,
      adaptiveStreaming: false,
      prioritizeEssential: true,
      bufferSize: 'large'
    });

    this.optimizationStrategies.set('3g', {
      name: 'Optimización 3G',
      maxBitrate: 96,
      compressionLevel: 'medium',
      enablePreloading: true,
      enableCaching: true,
      adaptiveStreaming: true,
      prioritizeEssential: true,
      bufferSize: 'medium'
    });

    this.optimizationStrategies.set('4g', {
      name: 'Optimización 4G',
      maxBitrate: 192,
      compressionLevel: 'low',
      enablePreloading: true,
      enableCaching: true,
      adaptiveStreaming: true,
      prioritizeEssential: false,
      bufferSize: 'small'
    });

    this.optimizationStrategies.set('wifi', {
      name: 'Optimización WiFi',
      maxBitrate: 320,
      compressionLevel: 'low',
      enablePreloading: true,
      enableCaching: true,
      adaptiveStreaming: false,
      prioritizeEssential: false,
      bufferSize: 'small'
    });

    this.optimizationStrategies.set('slow', {
      name: 'Conexión Lenta',
      maxBitrate: 64,
      compressionLevel: 'high',
      enablePreloading: false,
      enableCaching: true,
      adaptiveStreaming: true,
      prioritizeEssential: true,
      bufferSize: 'large'
    });
  }

  setupCachingSystem() {
    // Sistema de caché para audio frecuentemente usado
    this.cachingSystem.set('audioBuffers', new Map());
    this.cachingSystem.set('compressedAudio', new Map());
    this.cachingSystem.set('metadata', new Map());
    
    // Configuración de caché
    this.cacheConfig = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      compressionRatio: 0.8,
      priorityLevels: ['essential', 'important', 'normal', 'low']
    };
  }

  async detectNetworkCapabilities() {
    try {
      // Network Information API
      if ('connection' in navigator) {
        const connection = navigator.connection;
        
        this.networkMetrics.effectiveType = connection.effectiveType;
        this.networkMetrics.downlink = connection.downlink;
        this.networkMetrics.rtt = connection.rtt;
        this.networkMetrics.saveData = connection.saveData;
        this.networkMetrics.currentBandwidth = (connection.downlink || 1) * 1000; // Mbps to kbps
        
        // Monitorear cambios de red
        connection.addEventListener('change', () => {
          this.handleNetworkChange();
        });
      }
      
      // Detectar estado online/offline
      this.networkMetrics.isOnline = navigator.onLine;
      
      window.addEventListener('online', () => {
        this.networkMetrics.isOnline = true;
        this.handleOnlineStatusChange(true);
      });
      
      window.addEventListener('offline', () => {
        this.networkMetrics.isOnline = false;
        this.handleOnlineStatusChange(false);
      });
      
      // Realizar medición inicial de ancho de banda
      await this.measureActualBandwidth();
      
    } catch (error) {
      console.warn('Error detecting network capabilities:', error);
    }
  }

  async measureActualBandwidth() {
    try {
      const startTime = performance.now();
      
      // Descargar un archivo pequeño para medir velocidad real
      const testData = new ArrayBuffer(100 * 1024); // 100KB
      const blob = new Blob([testData]);
      const url = URL.createObjectURL(blob);
      
      const response = await fetch(url);
      await response.arrayBuffer();
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const speed = (100 * 8) / duration; // kbps
      
      // Actualizar métricas con medición real
      this.networkMetrics.measuredBandwidth = speed;
      this.recordBandwidthMeasurement(speed);
      
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.warn('Error measuring bandwidth:', error);
    }
  }

  startBandwidthMonitoring() {
    if (this.monitoring.isActive) return;
    
    this.monitoring.isActive = true;
    
    // Monitorear cada 10 segundos
    this.monitoring.interval = setInterval(() => {
      this.updateNetworkMetrics();
      this.analyzeTrafficPatterns();
      this.optimizeBandwidthUsage();
    }, 10000);
  }

  updateNetworkMetrics() {
    // Actualizar métricas de red dinámicamente
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      this.networkMetrics.effectiveType = connection.effectiveType;
      this.networkMetrics.downlink = connection.downlink;
      this.networkMetrics.rtt = connection.rtt;
      this.networkMetrics.currentBandwidth = (connection.downlink || 1) * 1000;
    }
    
    // Registrar métricas en historial
    this.recordNetworkSnapshot();
  }

  recordBandwidthMeasurement(bandwidth) {
    const measurement = {
      timestamp: Date.now(),
      bandwidth,
      effectiveType: this.networkMetrics.effectiveType,
      rtt: this.networkMetrics.rtt
    };
    
    this.bandwidthHistory.push(measurement);
    
    // Mantener solo las últimas 100 mediciones
    if (this.bandwidthHistory.length > 100) {
      this.bandwidthHistory = this.bandwidthHistory.slice(-100);
    }
  }

  recordNetworkSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      ...this.networkMetrics,
      audioTraffic: this.calculateCurrentAudioTraffic(),
      queueSize: this.transferQueue.length
    };
    
    this.monitoring.measurements.push(snapshot);
    
    // Mantener solo las últimas 50 mediciones
    if (this.monitoring.measurements.length > 50) {
      this.monitoring.measurements = this.monitoring.measurements.slice(-50);
    }
  }

  calculateCurrentAudioTraffic() {
    // Calcular tráfico de audio actual
    let totalTraffic = 0;
    
    this.transferQueue.forEach(item => {
      totalTraffic += item.size || 0;
    });
    
    return totalTraffic;
  }

  analyzeTrafficPatterns() {
    if (this.monitoring.measurements.length < 10) return;
    
    const recentMeasurements = this.monitoring.measurements.slice(-10);
    
    // Analizar patrones de uso
    const patterns = {
      peakUsage: this.findPeakUsage(recentMeasurements),
      averageLatency: this.calculateAverageLatency(recentMeasurements),
      bandwidthTrend: this.calculateBandwidthTrend(recentMeasurements),
      congestionLevel: this.detectCongestion(recentMeasurements)
    };
    
    this.trafficPatterns.set('current', patterns);
    this.adjustOptimizationStrategy(patterns);
  }

  findPeakUsage(measurements) {
    return Math.max(...measurements.map(m => m.audioTraffic));
  }

  calculateAverageLatency(measurements) {
    const validLatencies = measurements.filter(m => m.rtt > 0);
    if (validLatencies.length === 0) return 0;
    
    const sum = validLatencies.reduce((acc, m) => acc + m.rtt, 0);
    return sum / validLatencies.length;
  }

  calculateBandwidthTrend(measurements) {
    if (measurements.length < 5) return 'stable';
    
    const recent = measurements.slice(-5);
    const older = measurements.slice(-10, -5);
    
    const recentAvg = recent.reduce((acc, m) => acc + m.currentBandwidth, 0) / recent.length;
    const olderAvg = older.reduce((acc, m) => acc + m.currentBandwidth, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.2) return 'improving';
    if (change < -0.2) return 'degrading';
    return 'stable';
  }

  detectCongestion(measurements) {
    const recentLatencies = measurements.slice(-5).map(m => m.rtt).filter(rtt => rtt > 0);
    if (recentLatencies.length === 0) return 'unknown';
    
    const avgLatency = recentLatencies.reduce((acc, rtt) => acc + rtt, 0) / recentLatencies.length;
    
    if (avgLatency > 200) return 'high';
    if (avgLatency > 100) return 'medium';
    return 'low';
  }

  optimizeBandwidthUsage() {
    const currentStrategy = this.getCurrentOptimizationStrategy();
    
    // Aplicar estrategia de optimización
    this.applyOptimizationStrategy(currentStrategy);
    
    // Optimizar cola de transferencias
    this.optimizeTransferQueue();
    
    // Gestionar caché
    this.manageCacheOptimization();
  }

  getCurrentOptimizationStrategy() {
    const networkType = this.networkMetrics.effectiveType;
    const bandwidth = this.networkMetrics.currentBandwidth;
    
    // Seleccionar estrategia basada en condiciones actuales
    if (this.networkMetrics.saveData) {
      return this.optimizationStrategies.get('2g');
    }
    
    if (bandwidth < 200) {
      return this.optimizationStrategies.get('slow');
    }
    
    switch (networkType) {
      case 'slow-2g':
      case '2g':
        return this.optimizationStrategies.get('2g');
      case '3g':
        return this.optimizationStrategies.get('3g');
      case '4g':
        return this.optimizationStrategies.get('4g');
      default:
        return this.optimizationStrategies.get('wifi');
    }
  }

  applyOptimizationStrategy(strategy) {
    if (!strategy) return;
    
    // Aplicar límite de bitrate
    if (this.compressionSystem) {
      this.compressionSystem.setBitrate(strategy.maxBitrate);
      this.compressionSystem.setCompressionLevel(strategy.compressionLevel);
    }
    
    // Configurar preloading
    this.setPreloadingEnabled(strategy.enablePreloading);
    
    // Configurar streaming adaptativo
    this.setAdaptiveStreaming(strategy.adaptiveStreaming);
    
    // Priorizar contenido esencial
    if (strategy.prioritizeEssential) {
      this.prioritizeEssentialContent();
    }
  }

  optimizeTransferQueue() {
    // Ordenar cola por prioridad y tamaño
    this.transferQueue.sort((a, b) => {
      // Prioridad primero
      const priorityDiff = this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Luego por tamaño (más pequeños primero)
      return a.size - b.size;
    });
    
    // Procesar elementos de la cola
    this.processTransferQueue();
  }

  getPriorityValue(priority) {
    const values = { essential: 4, important: 3, normal: 2, low: 1 };
    return values[priority] || 1;
  }

  async processTransferQueue() {
    if (this.transferQueue.length === 0) return;
    
    const availableBandwidth = this.calculateAvailableBandwidth();
    let usedBandwidth = 0;
    
    while (this.transferQueue.length > 0 && usedBandwidth < availableBandwidth) {
      const item = this.transferQueue.shift();
      
      if (usedBandwidth + item.estimatedBandwidth <= availableBandwidth) {
        await this.processTransferItem(item);
        usedBandwidth += item.estimatedBandwidth;
      } else {
        // Devolver a la cola si no hay suficiente ancho de banda
        this.transferQueue.unshift(item);
        break;
      }
    }
  }

  calculateAvailableBandwidth() {
    const totalBandwidth = this.networkMetrics.currentBandwidth;
    const reservedBandwidth = totalBandwidth * 0.2; // Reservar 20% para otras aplicaciones
    const currentUsage = this.calculateCurrentBandwidthUsage();
    
    return Math.max(0, totalBandwidth - reservedBandwidth - currentUsage);
  }

  calculateCurrentBandwidthUsage() {
    // Calcular uso actual de ancho de banda
    // Esta sería una implementación más compleja en producción
    return this.monitoring.realTimeStats.currentUsage || 0;
  }

  async processTransferItem(item) {
    try {
      const startTime = performance.now();
      
      // Procesar el elemento (simulación)
      await this.executeTransfer(item);
      
      const endTime = performance.now();
      const actualTime = endTime - startTime;
      const actualBandwidth = (item.size * 8) / (actualTime / 1000); // bps
      
      // Actualizar estadísticas
      this.updateTransferStats(item, actualBandwidth, actualTime);
      
    } catch (error) {
      console.error('Transfer failed:', error);
      // Reencolar con menor prioridad
      item.priority = 'low';
      item.retryCount = (item.retryCount || 0) + 1;
      
      if (item.retryCount < 3) {
        this.transferQueue.push(item);
      }
    }
  }

  async executeTransfer(item) {
    // Ejecutar transferencia real
    switch (item.type) {
      case 'audio':
        return await this.transferAudio(item);
      case 'compressed':
        return await this.transferCompressedAudio(item);
      case 'metadata':
        return await this.transferMetadata(item);
      default:
        throw new Error(`Unknown transfer type: ${item.type}`);
    }
  }

  async transferAudio(item) {
    // Transferir audio con optimizaciones
    const optimizedData = await this.optimizeAudioForTransfer(item.data);
    
    // Simular transferencia
    return new Promise((resolve) => {
      setTimeout(resolve, item.estimatedTime || 100);
    });
  }

  async optimizeAudioForTransfer(audioData) {
    // Aplicar optimizaciones específicas para transferencia
    let optimized = audioData;
    
    // Compresión adaptativa
    if (this.shouldCompressForTransfer()) {
      optimized = await this.compressAudioData(audioData);
    }
    
    // Chunking para archivos grandes
    if (audioData.length > this.getMaxChunkSize()) {
      optimized = this.chunkAudioData(audioData);
    }
    
    return optimized;
  }

  shouldCompressForTransfer() {
    const bandwidth = this.networkMetrics.currentBandwidth;
    return bandwidth < 500 || this.networkMetrics.saveData;
  }

  getMaxChunkSize() {
    const bandwidth = this.networkMetrics.currentBandwidth;
    
    if (bandwidth < 200) return 64 * 1024; // 64KB
    if (bandwidth < 500) return 256 * 1024; // 256KB
    return 1024 * 1024; // 1MB
  }

  manageCacheOptimization() {
    // Gestionar caché para optimizar ancho de banda
    this.cleanExpiredCache();
    this.preloadFrequentContent();
    this.optimizeCacheSize();
  }

  cleanExpiredCache() {
    const now = Date.now();
    const maxAge = this.cacheConfig.maxAge;
    
    this.cachingSystem.forEach((cache, type) => {
      cache.forEach((item, key) => {
        if (now - item.timestamp > maxAge) {
          cache.delete(key);
        }
      });
    });
  }

  preloadFrequentContent() {
    // Precargar contenido frecuentemente usado cuando hay ancho de banda disponible
    const availableBandwidth = this.calculateAvailableBandwidth();
    
    if (availableBandwidth > 200) { // Solo si hay suficiente ancho de banda
      this.identifyFrequentContent().forEach(content => {
        if (!this.isContentCached(content.id)) {
          this.queueForPreload(content);
        }
      });
    }
  }

  identifyFrequentContent() {
    // Identificar contenido usado frecuentemente
    // Esta sería una implementación más sofisticada en producción
    return [
      { id: 'ui_sounds', priority: 'important', size: 50 * 1024 },
      { id: 'ambient_base', priority: 'normal', size: 200 * 1024 },
      { id: 'voice_common', priority: 'important', size: 100 * 1024 }
    ];
  }

  isContentCached(contentId) {
    return Array.from(this.cachingSystem.values())
      .some(cache => cache.has(contentId));
  }

  queueForPreload(content) {
    const transferItem = {
      id: content.id,
      type: 'preload',
      size: content.size,
      priority: content.priority,
      estimatedBandwidth: content.size / 10, // Estimate
      data: content
    };
    
    this.transferQueue.push(transferItem);
  }

  optimizeCacheSize() {
    const maxSize = this.cacheConfig.maxSize;
    let currentSize = this.calculateCacheSize();
    
    if (currentSize > maxSize) {
      // Eliminar contenido menos prioritario hasta estar bajo el límite
      const allCacheItems = this.getAllCacheItems();
      
      // Ordenar por prioridad y uso
      allCacheItems.sort((a, b) => {
        const priorityDiff = this.getPriorityValue(a.priority) - this.getPriorityValue(b.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return a.lastAccessed - b.lastAccessed;
      });
      
      // Eliminar elementos hasta estar bajo el límite
      while (currentSize > maxSize && allCacheItems.length > 0) {
        const item = allCacheItems.shift();
        this.removeCacheItem(item);
        currentSize -= item.size;
      }
    }
  }

  calculateCacheSize() {
    let totalSize = 0;
    
    this.cachingSystem.forEach(cache => {
      cache.forEach(item => {
        totalSize += item.size || 0;
      });
    });
    
    return totalSize;
  }

  getAllCacheItems() {
    const items = [];
    
    this.cachingSystem.forEach((cache, type) => {
      cache.forEach((item, key) => {
        items.push({ ...item, key, type });
      });
    });
    
    return items;
  }

  removeCacheItem(item) {
    const cache = this.cachingSystem.get(item.type);
    if (cache) {
      cache.delete(item.key);
    }
  }

  // Métodos de control público

  addToTransferQueue(item) {
    // Agregar elemento a la cola de transferencias
    const transferItem = {
      id: item.id || `transfer_${Date.now()}`,
      type: item.type || 'audio',
      data: item.data,
      size: item.size || this.estimateSize(item.data),
      priority: item.priority || 'normal',
      estimatedBandwidth: item.estimatedBandwidth || this.estimateBandwidth(item),
      callback: item.callback
    };
    
    this.transferQueue.push(transferItem);
    
    // Procesar cola inmediatamente si hay capacidad
    if (this.calculateAvailableBandwidth() > 0) {
      this.processTransferQueue();
    }
  }

  estimateSize(data) {
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (typeof data === 'string') return data.length * 2; // Unicode
    return 1024; // Fallback
  }

  estimateBandwidth(item) {
    // Estimar ancho de banda necesario basado en el tipo y tamaño
    const baseRate = this.networkMetrics.currentBandwidth * 0.1; // 10% del ancho de banda total
    const sizeFactor = Math.log(item.size || 1024) / Math.log(1024); // Factor logarítmico por tamaño
    
    return baseRate * sizeFactor;
  }

  prioritizeTransfer(transferId, newPriority) {
    const item = this.transferQueue.find(item => item.id === transferId);
    if (item) {
      item.priority = newPriority;
      this.optimizeTransferQueue(); // Reordenar cola
    }
  }

  cacheAudioData(id, data, options = {}) {
    const cacheEntry = {
      data,
      size: this.estimateSize(data),
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      priority: options.priority || 'normal',
      type: options.type || 'audio'
    };
    
    const cache = this.cachingSystem.get('audioBuffers');
    cache.set(id, cacheEntry);
    
    // Optimizar tamaño de caché si es necesario
    if (this.calculateCacheSize() > this.cacheConfig.maxSize) {
      this.optimizeCacheSize();
    }
  }

  getCachedAudioData(id) {
    const cache = this.cachingSystem.get('audioBuffers');
    const item = cache.get(id);
    
    if (item) {
      item.lastAccessed = Date.now();
      return item.data;
    }
    
    return null;
  }

  setOptimizationMode(mode) {
    if (['conservative', 'balanced', 'adaptive', 'aggressive'].includes(mode)) {
      this.optimizationMode = mode;
      this.adjustOptimizationParameters();
      this.saveSettings();
    }
  }

  adjustOptimizationParameters() {
    switch (this.optimizationMode) {
      case 'conservative':
        this.adaptationSettings.bufferThreshold = 0.5;
        this.cacheConfig.maxSize = 30 * 1024 * 1024; // 30MB
        break;
      case 'balanced':
        this.adaptationSettings.bufferThreshold = 0.3;
        this.cacheConfig.maxSize = 50 * 1024 * 1024; // 50MB
        break;
      case 'adaptive':
        this.adaptationSettings.bufferThreshold = 0.2;
        this.cacheConfig.maxSize = 70 * 1024 * 1024; // 70MB
        break;
      case 'aggressive':
        this.adaptationSettings.bufferThreshold = 0.1;
        this.cacheConfig.maxSize = 100 * 1024 * 1024; // 100MB
        break;
    }
  }

  handleNetworkChange() {
    this.updateNetworkMetrics();
    
    const newStrategy = this.getCurrentOptimizationStrategy();
    this.applyOptimizationStrategy(newStrategy);
    
    // Emitir evento de cambio de red
    document.dispatchEvent(new CustomEvent('bandwidth:networkChanged', {
      detail: {
        metrics: this.networkMetrics,
        strategy: newStrategy
      }
    }));
  }

  handleOnlineStatusChange(isOnline) {
    this.networkMetrics.isOnline = isOnline;
    
    if (isOnline) {
      // Reanudar optimizaciones
      this.startBandwidthMonitoring();
      this.processTransferQueue();
    } else {
      // Pausar transferencias no esenciales
      this.pauseNonEssentialTransfers();
    }
    
    document.dispatchEvent(new CustomEvent('bandwidth:onlineStatusChanged', {
      detail: { isOnline }
    }));
  }

  pauseNonEssentialTransfers() {
    // Pausar transferencias no esenciales cuando se está offline
    this.transferQueue = this.transferQueue.filter(item => 
      item.priority === 'essential' || item.priority === 'important'
    );
  }

  setupEventListeners() {
    // Eventos de audio manager
    this.audioManager.events?.addEventListener('audioRequested', (e) => {
      this.handleAudioRequest(e.detail);
    });

    // Eventos de preferencias
    document.addEventListener('preference:changed', (e) => {
      if (e.detail.path.startsWith('bandwidth.')) {
        this.updateBandwidthSettings(e.detail.path, e.detail.value);
      }
    });
  }

  handleAudioRequest(requestData) {
    // Manejar solicitudes de audio optimizando para ancho de banda
    const { audioId, priority, callback } = requestData;
    
    // Verificar si está en caché
    const cachedData = this.getCachedAudioData(audioId);
    if (cachedData) {
      callback?.(cachedData);
      return;
    }
    
    // Agregar a cola de transferencias
    this.addToTransferQueue({
      id: audioId,
      type: 'audio',
      priority: priority || 'normal',
      callback
    });
  }

  updateBandwidthSettings(path, value) {
    const setting = path.split('.')[1];
    
    switch (setting) {
      case 'optimizationMode':
        this.setOptimizationMode(value);
        break;
      case 'enabled':
        this.isEnabled = value;
        break;
      case 'maxCacheSize':
        this.cacheConfig.maxSize = value;
        break;
    }
  }

  // Getters para información del sistema

  getBandwidthMetrics() {
    return {
      current: this.networkMetrics,
      history: this.bandwidthHistory.slice(-20),
      patterns: Object.fromEntries(this.trafficPatterns),
      queueSize: this.transferQueue.length,
      cacheSize: this.calculateCacheSize(),
      optimization: this.optimizationMode
    };
  }

  getOptimizationStatus() {
    const currentStrategy = this.getCurrentOptimizationStrategy();
    
    return {
      enabled: this.isEnabled,
      mode: this.optimizationMode,
      strategy: currentStrategy?.name || 'Unknown',
      networkType: this.networkMetrics.effectiveType,
      bandwidth: this.networkMetrics.currentBandwidth,
      queueLength: this.transferQueue.length,
      cacheUtilization: (this.calculateCacheSize() / this.cacheConfig.maxSize) * 100
    };
  }

  saveSettings() {
    const settings = {
      enabled: this.isEnabled,
      optimizationMode: this.optimizationMode,
      adaptationSettings: this.adaptationSettings,
      cacheConfig: this.cacheConfig
    };
    
    localStorage.setItem('bandwidthOptimizationSettings', JSON.stringify(settings));
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('bandwidthOptimizationSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        
        this.isEnabled = settings.enabled !== false;
        this.optimizationMode = settings.optimizationMode || 'adaptive';
        
        if (settings.adaptationSettings) {
          Object.assign(this.adaptationSettings, settings.adaptationSettings);
        }
        
        if (settings.cacheConfig) {
          Object.assign(this.cacheConfig, settings.cacheConfig);
        }
      }
    } catch (error) {
      console.warn('Error loading bandwidth optimization settings:', error);
    }
  }

  dispose() {
    if (this.monitoring.interval) {
      clearInterval(this.monitoring.interval);
    }
    
    this.monitoring.isActive = false;
    this.transferQueue = [];
    this.bandwidthHistory = [];
    
    this.cachingSystem.forEach(cache => cache.clear());
    this.optimizationStrategies.clear();
    this.trafficPatterns.clear();
    
    this.isInitialized = false;
  }
}

export default BandwidthOptimization;