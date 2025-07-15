/**
 * Adaptive Quality - Sistema de calidad adaptativa
 * Ajusta automáticamente la calidad de audio basado en condiciones del sistema
 */

class AdaptiveQuality {
  constructor(audioManager, compressionSystem) {
    this.audioManager = audioManager;
    this.compressionSystem = compressionSystem;
    this.isEnabled = true;
    this.currentQualityLevel = 'high';
    this.adaptationMode = 'automatic'; // automatic, manual, bandwidth_based, performance_based
    this.qualityLevels = new Map();
    this.systemMetrics = {
      bandwidth: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      batteryLevel: 100,
      networkType: 'unknown',
      devicePerformance: 'high'
    };
    this.adaptationThresholds = {
      bandwidth: { low: 500, medium: 1500, high: 3000 },
      cpu: { low: 30, medium: 60, high: 80 },
      memory: { low: 40, medium: 70, high: 85 },
      battery: { low: 20, medium: 50, high: 80 }
    };
    this.qualityHistory = [];
    this.adaptationAlgorithm = 'hybrid'; // conservative, aggressive, hybrid
    this.userPreferences = {
      prioritizeQuality: true,
      adaptiveBehavior: 'balanced', // quality_first, performance_first, balanced
      manualOverride: false
    };
    this.monitoringInterval = null;
    this.performanceBaseline = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.setupQualityLevels();
    await this.detectSystemCapabilities();
    this.setupPerformanceBaseline();
    this.startSystemMonitoring();
    this.setupEventListeners();
    this.loadUserPreferences();
    
    this.isInitialized = true;
    console.log('Adaptive Quality initialized');
  }

  setupQualityLevels() {
    // Definir niveles de calidad disponibles
    this.qualityLevels.set('low', {
      name: 'Calidad Baja',
      bitrate: 64,
      sampleRate: 22050,
      channels: 1,
      bufferSize: 2048,
      enabledFeatures: {
        spatialAudio: false,
        reverb: false,
        eq: false,
        compression: true,
        normalization: true
      },
      processingLoad: 0.3,
      memoryUsage: 0.4,
      description: 'Optimizado para dispositivos con recursos limitados'
    });

    this.qualityLevels.set('medium', {
      name: 'Calidad Media',
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      bufferSize: 1024,
      enabledFeatures: {
        spatialAudio: true,
        reverb: false,
        eq: true,
        compression: true,
        normalization: true
      },
      processingLoad: 0.6,
      memoryUsage: 0.7,
      description: 'Balance entre calidad y rendimiento'
    });

    this.qualityLevels.set('high', {
      name: 'Calidad Alta',
      bitrate: 192,
      sampleRate: 44100,
      channels: 2,
      bufferSize: 512,
      enabledFeatures: {
        spatialAudio: true,
        reverb: true,
        eq: true,
        compression: true,
        normalization: true
      },
      processingLoad: 0.8,
      memoryUsage: 0.8,
      description: 'Calidad premium para dispositivos potentes'
    });

    this.qualityLevels.set('ultra', {
      name: 'Calidad Ultra',
      bitrate: 320,
      sampleRate: 48000,
      channels: 2,
      bufferSize: 256,
      enabledFeatures: {
        spatialAudio: true,
        reverb: true,
        eq: true,
        compression: true,
        normalization: true
      },
      processingLoad: 1.0,
      memoryUsage: 1.0,
      description: 'Máxima calidad para audiófilos'
    });

    this.qualityLevels.set('adaptive', {
      name: 'Adaptativa',
      bitrate: 'auto',
      sampleRate: 'auto',
      channels: 'auto',
      bufferSize: 'auto',
      enabledFeatures: {
        spatialAudio: 'auto',
        reverb: 'auto',
        eq: 'auto',
        compression: true,
        normalization: true
      },
      processingLoad: 'auto',
      memoryUsage: 'auto',
      description: 'Se ajusta automáticamente a las condiciones'
    });
  }

  async detectSystemCapabilities() {
    try {
      // Detectar información del dispositivo
      await this.detectHardwareCapabilities();
      await this.detectNetworkCapabilities();
      await this.detectBatteryStatus();
      
      // Establecer capacidad base del dispositivo
      this.classifyDevicePerformance();
      
    } catch (error) {
      console.warn('Error detecting system capabilities:', error);
      this.systemMetrics.devicePerformance = 'medium'; // Fallback
    }
  }

  async detectHardwareCapabilities() {
    // Detectar capacidades de hardware usando APIs disponibles
    if ('hardwareConcurrency' in navigator) {
      const cores = navigator.hardwareConcurrency;
      this.systemMetrics.cpuCores = cores;
      
      // Estimar rendimiento basado en número de núcleos
      if (cores >= 8) this.systemMetrics.devicePerformance = 'high';
      else if (cores >= 4) this.systemMetrics.devicePerformance = 'medium';
      else this.systemMetrics.devicePerformance = 'low';
    }

    // Detectar memoria disponible
    if ('memory' in navigator && navigator.memory.jsHeapSizeLimit) {
      const totalMemory = navigator.memory.jsHeapSizeLimit / (1024 * 1024 * 1024); // GB
      this.systemMetrics.totalMemory = totalMemory;
      
      if (totalMemory >= 8) this.systemMetrics.memoryClass = 'high';
      else if (totalMemory >= 4) this.systemMetrics.memoryClass = 'medium';
      else this.systemMetrics.memoryClass = 'low';
    }

    // Detectar tipo de dispositivo
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(userAgent)) {
      this.systemMetrics.deviceType = 'mobile';
    } else if (/tablet/.test(userAgent)) {
      this.systemMetrics.deviceType = 'tablet';
    } else {
      this.systemMetrics.deviceType = 'desktop';
    }
  }

  async detectNetworkCapabilities() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      this.systemMetrics.networkType = connection.effectiveType || 'unknown';
      this.systemMetrics.bandwidth = (connection.downlink || 1) * 1000; // Mbps to kbps
      this.systemMetrics.saveData = connection.saveData || false;
      
      // Monitorear cambios de red
      connection.addEventListener('change', () => {
        this.updateNetworkMetrics();
      });
    }
  }

  async detectBatteryStatus() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        
        this.systemMetrics.batteryLevel = battery.level * 100;
        this.systemMetrics.isCharging = battery.charging;
        
        // Monitorear cambios de batería
        battery.addEventListener('levelchange', () => {
          this.systemMetrics.batteryLevel = battery.level * 100;
          this.evaluateAdaptation();
        });
        
        battery.addEventListener('chargingchange', () => {
          this.systemMetrics.isCharging = battery.charging;
          this.evaluateAdaptation();
        });
        
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }

  classifyDevicePerformance() {
    // Clasificar rendimiento general del dispositivo
    let performanceScore = 0;
    
    // Factor CPU
    if (this.systemMetrics.cpuCores >= 8) performanceScore += 3;
    else if (this.systemMetrics.cpuCores >= 4) performanceScore += 2;
    else performanceScore += 1;
    
    // Factor memoria
    if (this.systemMetrics.memoryClass === 'high') performanceScore += 3;
    else if (this.systemMetrics.memoryClass === 'medium') performanceScore += 2;
    else performanceScore += 1;
    
    // Factor tipo de dispositivo
    if (this.systemMetrics.deviceType === 'desktop') performanceScore += 2;
    else if (this.systemMetrics.deviceType === 'tablet') performanceScore += 1;
    
    // Clasificar
    if (performanceScore >= 7) this.systemMetrics.devicePerformance = 'high';
    else if (performanceScore >= 5) this.systemMetrics.devicePerformance = 'medium';
    else this.systemMetrics.devicePerformance = 'low';
  }

  setupPerformanceBaseline() {
    // Establecer línea base de rendimiento
    this.performanceBaseline = {
      audioLatency: 0,
      processingTime: 0,
      memoryUsage: 0,
      droppedFrames: 0,
      timestamp: Date.now()
    };
    
    // Medir rendimiento inicial
    this.measureInitialPerformance();
  }

  async measureInitialPerformance() {
    try {
      const startTime = performance.now();
      
      // Crear contexto de audio temporal para medición
      const testContext = new (window.AudioContext || window.webkitAudioContext)();
      const testBuffer = testContext.createBuffer(2, 44100, 44100);
      
      // Medir latencia de audio
      this.performanceBaseline.audioLatency = testContext.outputLatency || 
        testContext.baseLatency || 0.005;
      
      // Medir tiempo de procesamiento
      this.performanceBaseline.processingTime = performance.now() - startTime;
      
      // Medir uso de memoria
      if (performance.memory) {
        this.performanceBaseline.memoryUsage = 
          performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
      }
      
      testContext.close();
      
    } catch (error) {
      console.warn('Error measuring baseline performance:', error);
    }
  }

  startSystemMonitoring() {
    // Monitorear métricas del sistema cada 5 segundos
    this.monitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.evaluateAdaptation();
    }, 5000);
  }

  updateSystemMetrics() {
    // Actualizar métricas de rendimiento
    this.updateCPUUsage();
    this.updateMemoryUsage();
    this.updateNetworkMetrics();
    
    // Registrar en historial
    this.recordQualityMetrics();
  }

  updateCPUUsage() {
    // Estimar uso de CPU basado en rendimiento de frames
    const now = performance.now();
    
    if (this.lastCPUMeasurement) {
      const timeDiff = now - this.lastCPUMeasurement.time;
      const expectedFrames = timeDiff / (1000 / 60); // 60 FPS esperados
      const actualFrames = this.frameCount - this.lastCPUMeasurement.frames;
      
      // Estimar CPU basado en frames perdidos
      const frameEfficiency = actualFrames / expectedFrames;
      this.systemMetrics.cpuUsage = Math.max(0, (1 - frameEfficiency) * 100);
    }
    
    this.lastCPUMeasurement = { time: now, frames: this.frameCount };
    this.frameCount = (this.frameCount || 0) + 1;
  }

  updateMemoryUsage() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.totalJSHeapSize;
      this.systemMetrics.memoryUsage = (used / total) * 100;
    }
  }

  updateNetworkMetrics() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this.systemMetrics.networkType = connection.effectiveType;
      this.systemMetrics.bandwidth = (connection.downlink || 1) * 1000;
      this.systemMetrics.saveData = connection.saveData;
    }
  }

  evaluateAdaptation() {
    if (!this.isEnabled || this.adaptationMode === 'manual') {
      return;
    }

    const currentConditions = this.analyzeCurrentConditions();
    const recommendedLevel = this.calculateOptimalQuality(currentConditions);
    
    if (recommendedLevel !== this.currentQualityLevel) {
      this.adaptQuality(recommendedLevel, currentConditions);
    }
  }

  analyzeCurrentConditions() {
    return {
      bandwidth: this.categorizeBandwidth(),
      cpu: this.categorizeCPU(),
      memory: this.categorizeMemory(),
      battery: this.categorizeBattery(),
      network: this.systemMetrics.networkType,
      saveData: this.systemMetrics.saveData,
      devicePerformance: this.systemMetrics.devicePerformance
    };
  }

  categorizeBandwidth() {
    const bw = this.systemMetrics.bandwidth;
    const thresholds = this.adaptationThresholds.bandwidth;
    
    if (bw >= thresholds.high) return 'high';
    if (bw >= thresholds.medium) return 'medium';
    return 'low';
  }

  categorizeCPU() {
    const cpu = this.systemMetrics.cpuUsage;
    const thresholds = this.adaptationThresholds.cpu;
    
    if (cpu <= thresholds.low) return 'low';
    if (cpu <= thresholds.medium) return 'medium';
    return 'high';
  }

  categorizeMemory() {
    const mem = this.systemMetrics.memoryUsage;
    const thresholds = this.adaptationThresholds.memory;
    
    if (mem <= thresholds.low) return 'low';
    if (mem <= thresholds.medium) return 'medium';
    return 'high';
  }

  categorizeBattery() {
    const battery = this.systemMetrics.batteryLevel;
    const thresholds = this.adaptationThresholds.battery;
    
    if (battery >= thresholds.high) return 'high';
    if (battery >= thresholds.medium) return 'medium';
    return 'low';
  }

  calculateOptimalQuality(conditions) {
    const algorithm = this.adaptationAlgorithm;
    
    switch (algorithm) {
      case 'conservative':
        return this.calculateConservativeQuality(conditions);
      case 'aggressive':
        return this.calculateAggressiveQuality(conditions);
      case 'hybrid':
      default:
        return this.calculateHybridQuality(conditions);
    }
  }

  calculateConservativeQuality(conditions) {
    // Algoritmo conservativo: prioriza estabilidad
    const constraintScores = {
      bandwidth: this.getConstraintScore(conditions.bandwidth),
      cpu: this.getConstraintScore(conditions.cpu),
      memory: this.getConstraintScore(conditions.memory),
      battery: this.getBatteryConstraintScore(conditions.battery)
    };
    
    // Tomar el más restrictivo
    const minScore = Math.min(...Object.values(constraintScores));
    return this.scoreToQualityLevel(minScore);
  }

  calculateAggressiveQuality(conditions) {
    // Algoritmo agresivo: maximiza calidad cuando es posible
    const constraintScores = {
      bandwidth: this.getConstraintScore(conditions.bandwidth),
      cpu: this.getConstraintScore(conditions.cpu),
      memory: this.getConstraintScore(conditions.memory),
      battery: this.getBatteryConstraintScore(conditions.battery)
    };
    
    // Promedio ponderado con énfasis en ancho de banda
    const weightedScore = (
      constraintScores.bandwidth * 0.4 +
      constraintScores.cpu * 0.3 +
      constraintScores.memory * 0.2 +
      constraintScores.battery * 0.1
    );
    
    return this.scoreToQualityLevel(weightedScore);
  }

  calculateHybridQuality(conditions) {
    // Algoritmo híbrido: balance entre estabilidad y calidad
    const conservativeLevel = this.calculateConservativeQuality(conditions);
    const aggressiveLevel = this.calculateAggressiveQuality(conditions);
    
    // Interpolar entre ambos basado en preferencias del usuario
    const userBias = this.userPreferences.prioritizeQuality ? 0.7 : 0.3;
    
    const levels = ['low', 'medium', 'high', 'ultra'];
    const conservativeIndex = levels.indexOf(conservativeLevel);
    const aggressiveIndex = levels.indexOf(aggressiveLevel);
    
    const interpolatedIndex = Math.round(
      conservativeIndex * (1 - userBias) + aggressiveIndex * userBias
    );
    
    return levels[Math.max(0, Math.min(levels.length - 1, interpolatedIndex))];
  }

  getConstraintScore(category) {
    switch (category) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      default: return 2;
    }
  }

  getBatteryConstraintScore(category) {
    // La batería tiene lógica inversa
    switch (category) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      default: return 2;
    }
  }

  scoreToQualityLevel(score) {
    if (score <= 1.3) return 'low';
    if (score <= 2.0) return 'medium';
    if (score <= 2.7) return 'high';
    return 'ultra';
  }

  async adaptQuality(newLevel, conditions) {
    if (this.userPreferences.manualOverride) {
      return;
    }

    const previousLevel = this.currentQualityLevel;
    this.currentQualityLevel = newLevel;
    
    try {
      await this.applyQualitySettings(newLevel);
      
      this.recordQualityChange(previousLevel, newLevel, conditions);
      
      // Emitir evento de cambio
      document.dispatchEvent(new CustomEvent('quality:adapted', {
        detail: {
          from: previousLevel,
          to: newLevel,
          conditions,
          automatic: true
        }
      }));
      
    } catch (error) {
      console.error('Error applying quality adaptation:', error);
      this.currentQualityLevel = previousLevel;
    }
  }

  async applyQualitySettings(level) {
    const qualityConfig = this.qualityLevels.get(level);
    if (!qualityConfig) return;

    // Aplicar configuración de bitrate
    if (this.compressionSystem && qualityConfig.bitrate !== 'auto') {
      this.compressionSystem.setBitrate(qualityConfig.bitrate);
    }

    // Aplicar configuración de audio
    if (this.audioManager.audioContext) {
      // Ajustar buffer size si es posible
      // Nota: WebAudio API no permite cambiar buffer size dinámicamente
      // Esta sería una implementación futura o mediante recreación del contexto
    }

    // Aplicar características habilitadas
    await this.applyFeatureSettings(qualityConfig.enabledFeatures);
  }

  async applyFeatureSettings(features) {
    // Aplicar configuración de características
    Object.entries(features).forEach(([feature, enabled]) => {
      if (enabled === 'auto') {
        enabled = this.shouldEnableFeature(feature);
      }

      this.toggleFeature(feature, enabled);
    });
  }

  shouldEnableFeature(feature) {
    // Lógica para determinar si una característica debe estar habilitada
    const conditions = this.analyzeCurrentConditions();
    
    switch (feature) {
      case 'spatialAudio':
        return conditions.cpu !== 'high' && conditions.devicePerformance !== 'low';
      case 'reverb':
        return conditions.cpu === 'low' && conditions.memory !== 'high';
      case 'eq':
        return conditions.cpu !== 'high';
      default:
        return true;
    }
  }

  toggleFeature(feature, enabled) {
    // Enviar evento para toggle de características
    document.dispatchEvent(new CustomEvent('quality:featureToggle', {
      detail: { feature, enabled }
    }));
  }

  recordQualityChange(from, to, conditions) {
    const record = {
      timestamp: Date.now(),
      from,
      to,
      conditions: { ...conditions },
      reason: this.getAdaptationReason(conditions),
      userInitiated: false
    };

    this.qualityHistory.push(record);
    
    // Mantener solo los últimos 50 cambios
    if (this.qualityHistory.length > 50) {
      this.qualityHistory = this.qualityHistory.slice(-50);
    }
  }

  getAdaptationReason(conditions) {
    const reasons = [];
    
    if (conditions.bandwidth === 'low') reasons.push('Ancho de banda limitado');
    if (conditions.cpu === 'high') reasons.push('Alto uso de CPU');
    if (conditions.memory === 'high') reasons.push('Memoria limitada');
    if (conditions.battery === 'low') reasons.push('Batería baja');
    if (conditions.saveData) reasons.push('Modo ahorro de datos');
    
    return reasons.length > 0 ? reasons.join(', ') : 'Optimización automática';
  }

  recordQualityMetrics() {
    const metrics = {
      timestamp: Date.now(),
      qualityLevel: this.currentQualityLevel,
      systemMetrics: { ...this.systemMetrics },
      performanceMetrics: this.getCurrentPerformanceMetrics()
    };

    // Almacenar métricas para análisis
    if (!this.metricsHistory) this.metricsHistory = [];
    this.metricsHistory.push(metrics);
    
    // Mantener solo las últimas 100 mediciones
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }
  }

  getCurrentPerformanceMetrics() {
    return {
      audioLatency: this.audioManager.audioContext?.outputLatency || 0,
      memoryUsage: performance.memory ? 
        performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize : 0,
      timestamp: Date.now()
    };
  }

  // Métodos públicos para control manual

  setQualityLevel(level) {
    if (!this.qualityLevels.has(level)) {
      console.warn(`Unknown quality level: ${level}`);
      return false;
    }

    const previousLevel = this.currentQualityLevel;
    this.currentQualityLevel = level;
    
    this.applyQualitySettings(level);
    
    this.recordQualityChange(previousLevel, level, this.analyzeCurrentConditions());
    
    document.dispatchEvent(new CustomEvent('quality:changed', {
      detail: {
        from: previousLevel,
        to: level,
        automatic: false
      }
    }));
    
    return true;
  }

  setAdaptationMode(mode) {
    if (['automatic', 'manual', 'bandwidth_based', 'performance_based'].includes(mode)) {
      this.adaptationMode = mode;
      this.saveUserPreferences();
      return true;
    }
    return false;
  }

  setAdaptationAlgorithm(algorithm) {
    if (['conservative', 'aggressive', 'hybrid'].includes(algorithm)) {
      this.adaptationAlgorithm = algorithm;
      this.saveUserPreferences();
      return true;
    }
    return false;
  }

  setUserPreference(key, value) {
    if (key in this.userPreferences) {
      this.userPreferences[key] = value;
      this.saveUserPreferences();
      return true;
    }
    return false;
  }

  // Getters para información del sistema

  getSystemMetrics() {
    return { ...this.systemMetrics };
  }

  getQualityHistory() {
    return [...this.qualityHistory];
  }

  getCurrentQualityConfig() {
    return this.qualityLevels.get(this.currentQualityLevel);
  }

  getAvailableQualityLevels() {
    const levels = [];
    this.qualityLevels.forEach((config, level) => {
      levels.push({
        level,
        name: config.name,
        description: config.description,
        current: level === this.currentQualityLevel
      });
    });
    return levels;
  }

  getAdaptationRecommendation() {
    const conditions = this.analyzeCurrentConditions();
    const recommended = this.calculateOptimalQuality(conditions);
    
    return {
      currentLevel: this.currentQualityLevel,
      recommendedLevel: recommended,
      shouldAdapt: recommended !== this.currentQualityLevel,
      reasons: this.getAdaptationReason(conditions),
      conditions
    };
  }

  setupEventListeners() {
    // Eventos de cambio de página/pestaña
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseMonitoring();
      } else {
        this.resumeMonitoring();
      }
    });

    // Eventos de audio manager
    this.audioManager.events?.addEventListener('performanceIssue', (e) => {
      this.handlePerformanceIssue(e.detail);
    });

    // Eventos de preferencias
    document.addEventListener('preference:changed', (e) => {
      if (e.detail.path.startsWith('adaptiveQuality.')) {
        this.updateAdaptiveSettings(e.detail.path, e.detail.value);
      }
    });
  }

  handlePerformanceIssue(issueData) {
    // Reaccionar a problemas de rendimiento reportados
    const { type, severity } = issueData;
    
    if (severity === 'high') {
      // Reducir calidad inmediatamente
      const currentIndex = ['low', 'medium', 'high', 'ultra'].indexOf(this.currentQualityLevel);
      if (currentIndex > 0) {
        const lowerLevel = ['low', 'medium', 'high', 'ultra'][currentIndex - 1];
        this.setQualityLevel(lowerLevel);
      }
    }
  }

  updateAdaptiveSettings(path, value) {
    const setting = path.split('.')[1];
    
    switch (setting) {
      case 'enabled':
        this.isEnabled = value;
        break;
      case 'mode':
        this.setAdaptationMode(value);
        break;
      case 'algorithm':
        this.setAdaptationAlgorithm(value);
        break;
    }
  }

  pauseMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  resumeMonitoring() {
    if (!this.monitoringInterval) {
      this.startSystemMonitoring();
    }
  }

  saveUserPreferences() {
    const preferences = {
      adaptationMode: this.adaptationMode,
      adaptationAlgorithm: this.adaptationAlgorithm,
      userPreferences: this.userPreferences,
      currentQualityLevel: this.currentQualityLevel,
      enabled: this.isEnabled
    };
    
    localStorage.setItem('adaptiveQualityPreferences', JSON.stringify(preferences));
  }

  loadUserPreferences() {
    try {
      const saved = localStorage.getItem('adaptiveQualityPreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        
        this.adaptationMode = preferences.adaptationMode || 'automatic';
        this.adaptationAlgorithm = preferences.adaptationAlgorithm || 'hybrid';
        this.currentQualityLevel = preferences.currentQualityLevel || 'high';
        this.isEnabled = preferences.enabled !== false;
        
        if (preferences.userPreferences) {
          Object.assign(this.userPreferences, preferences.userPreferences);
        }
      }
    } catch (error) {
      console.warn('Error loading adaptive quality preferences:', error);
    }
  }

  dispose() {
    this.pauseMonitoring();
    
    this.qualityLevels.clear();
    this.qualityHistory = [];
    this.metricsHistory = [];
    
    this.isInitialized = false;
  }
}

export default AdaptiveQuality;