/**
 * Quality Adapter - RAMA 5 Graphics Immersive
 * Adapta automáticamente la calidad gráfica según el rendimiento del dispositivo
 */

class QualityAdapter {
  constructor(performanceMonitor) {
    this.performanceMonitor = performanceMonitor;
    this.currentQuality = 'medium';
    this.autoAdjust = true;
    this.lastAdjustment = 0;
    this.adjustmentCooldown = 5000; // 5 segundos
    
    this.qualityPresets = {
      ultra: {
        name: 'Ultra',
        renderScale: 1.5,
        shadowQuality: 'high',
        particleDensity: 1.0,
        effectsQuality: 'high',
        antialiasing: 'MSAA_4x',
        textureQuality: 'high',
        lightingQuality: 'high',
        postProcessing: true,
        reflections: true,
        volumetricFog: true,
        targetFPS: 60,
        maxDrawCalls: 2000,
        maxVertices: 1000000
      },
      high: {
        name: 'High',
        renderScale: 1.25,
        shadowQuality: 'high',
        particleDensity: 0.8,
        effectsQuality: 'high',
        antialiasing: 'MSAA_2x',
        textureQuality: 'high',
        lightingQuality: 'medium',
        postProcessing: true,
        reflections: true,
        volumetricFog: false,
        targetFPS: 60,
        maxDrawCalls: 1500,
        maxVertices: 750000
      },
      medium: {
        name: 'Medium',
        renderScale: 1.0,
        shadowQuality: 'medium',
        particleDensity: 0.6,
        effectsQuality: 'medium',
        antialiasing: 'FXAA',
        textureQuality: 'medium',
        lightingQuality: 'medium',
        postProcessing: true,
        reflections: false,
        volumetricFog: false,
        targetFPS: 45,
        maxDrawCalls: 1000,
        maxVertices: 500000
      },
      low: {
        name: 'Low',
        renderScale: 0.8,
        shadowQuality: 'low',
        particleDensity: 0.3,
        effectsQuality: 'low',
        antialiasing: 'none',
        textureQuality: 'low',
        lightingQuality: 'low',
        postProcessing: false,
        reflections: false,
        volumetricFog: false,
        targetFPS: 30,
        maxDrawCalls: 500,
        maxVertices: 250000
      },
      potato: {
        name: 'Potato',
        renderScale: 0.6,
        shadowQuality: 'none',
        particleDensity: 0.1,
        effectsQuality: 'none',
        antialiasing: 'none',
        textureQuality: 'low',
        lightingQuality: 'low',
        postProcessing: false,
        reflections: false,
        volumetricFog: false,
        targetFPS: 24,
        maxDrawCalls: 250,
        maxVertices: 100000
      }
    };
    
    this.deviceProfile = {
      gpu: 'unknown',
      memory: 0,
      cores: navigator.hardwareConcurrency || 4,
      mobile: this.isMobileDevice(),
      pixelRatio: window.devicePixelRatio || 1
    };
    
    this.adaptiveSettings = {
      fpsWindow: 30, // frames para promediar
      memoryThreshold: 0.8, // 80% de memoria máxima
      performanceWindow: 10000, // 10 segundos
      aggressiveMode: false
    };
    
    this.callbacks = {
      onQualityChange: [],
      onAutoAdjust: []
    };
    
    this.initialize();
  }

  /**
   * Inicializa el adaptador de calidad
   */
  initialize() {
    this.detectDeviceCapabilities();
    this.setInitialQuality();
    this.setupPerformanceMonitoring();
    this.bindEvents();
  }

  /**
   * Detecta las capacidades del dispositivo
   */
  detectDeviceCapabilities() {
    // Detectar GPU
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        this.deviceProfile.gpu = this.classifyGPU(renderer);
      }
      
      // Detectar memoria de textura máxima
      this.deviceProfile.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      this.deviceProfile.maxVertexTextures = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    }
    
    // Detectar memoria del sistema
    if (navigator.deviceMemory) {
      this.deviceProfile.memory = navigator.deviceMemory;
    } else if (performance.memory) {
      this.deviceProfile.memory = performance.memory.jsHeapSizeLimit / (1024 * 1024 * 1024);
    }
    
    // Detectar capacidades de red
    if (navigator.connection) {
      this.deviceProfile.connection = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink
      };
    }
  }

  /**
   * Clasifica la GPU basada en el renderer string
   */
  classifyGPU(renderer) {
    const gpuDatabase = {
      'high': [
        'RTX 40', 'RTX 30', 'RTX 20', 'GTX 16', 'GTX 10',
        'RX 7', 'RX 6', 'RX 5',
        'Apple M2', 'Apple M1',
        'Adreno 7', 'Adreno 6',
        'Mali-G7', 'Mali-G5'
      ],
      'medium': [
        'GTX 9', 'GTX 7', 'RX 4', 'RX 3',
        'Intel Iris', 'Intel UHD',
        'Adreno 5', 'Mali-G3'
      ],
      'low': [
        'Intel HD', 'Adreno 3', 'Mali-T'
      ]
    };
    
    const rendererLower = renderer.toLowerCase();
    
    for (const [tier, gpus] of Object.entries(gpuDatabase)) {
      for (const gpu of gpus) {
        if (rendererLower.includes(gpu.toLowerCase())) {
          return tier;
        }
      }
    }
    
    return 'unknown';
  }

  /**
   * Establece la calidad inicial basada en el dispositivo
   */
  setInitialQuality() {
    const score = this.calculateDeviceScore();
    
    if (score >= 8) {
      this.currentQuality = 'ultra';
    } else if (score >= 6) {
      this.currentQuality = 'high';
    } else if (score >= 4) {
      this.currentQuality = 'medium';
    } else if (score >= 2) {
      this.currentQuality = 'low';
    } else {
      this.currentQuality = 'potato';
    }
    
    // Ajustar para dispositivos móviles
    if (this.deviceProfile.mobile && this.currentQuality === 'ultra') {
      this.currentQuality = 'high';
    }
  }

  /**
   * Calcula un puntaje del dispositivo (0-10)
   */
  calculateDeviceScore() {
    let score = 0;
    
    // Puntaje por GPU
    switch (this.deviceProfile.gpu) {
      case 'high': score += 4; break;
      case 'medium': score += 2; break;
      case 'low': score += 1; break;
      default: score += 1.5; break;
    }
    
    // Puntaje por memoria
    if (this.deviceProfile.memory >= 8) score += 3;
    else if (this.deviceProfile.memory >= 4) score += 2;
    else if (this.deviceProfile.memory >= 2) score += 1;
    
    // Puntaje por cores
    if (this.deviceProfile.cores >= 8) score += 2;
    else if (this.deviceProfile.cores >= 4) score += 1;
    else score += 0.5;
    
    // Penalización para móviles
    if (this.deviceProfile.mobile) score *= 0.7;
    
    // Penalización por pixel ratio alto
    if (this.deviceProfile.pixelRatio > 2) score *= 0.8;
    
    return Math.min(10, score);
  }

  /**
   * Configura el monitoreo de rendimiento
   */
  setupPerformanceMonitoring() {
    this.performanceMonitor.on('onPerformanceChange', (data) => {
      if (this.autoAdjust) {
        this.evaluatePerformance(data);
      }
    });
    
    this.performanceMonitor.on('onCriticalPerformance', (data) => {
      if (this.autoAdjust) {
        this.handleCriticalPerformance(data);
      }
    });
  }

  /**
   * Vincula eventos
   */
  bindEvents() {
    // Detectar cambios de ventana
    window.addEventListener('resize', () => {
      this.onViewportChange();
    });
    
    // Detectar cambios de visibilidad
    document.addEventListener('visibilitychange', () => {
      this.onVisibilityChange();
    });
    
    // Detectar cambios de orientación en móviles
    if (screen.orientation) {
      screen.orientation.addEventListener('change', () => {
        this.onOrientationChange();
      });
    }
  }

  /**
   * Evalúa el rendimiento y ajusta si es necesario
   */
  evaluatePerformance(metrics) {
    const now = Date.now();
    if (now - this.lastAdjustment < this.adjustmentCooldown) {
      return; // Cooldown activo
    }
    
    const currentPreset = this.qualityPresets[this.currentQuality];
    const avgFPS = this.performanceMonitor.getAverageFPS(this.adaptiveSettings.fpsWindow);
    
    // Verificar si necesita reducir calidad
    if (avgFPS < currentPreset.targetFPS * 0.8) {
      this.reduceQuality('Performance below target');
    }
    // Verificar si puede aumentar calidad
    else if (avgFPS > currentPreset.targetFPS * 1.2 && this.canIncreaseQuality()) {
      this.increaseQuality('Performance above target');
    }
    
    // Verificar memoria
    if (metrics.memoryUsage > this.deviceProfile.memory * 1024 * this.adaptiveSettings.memoryThreshold) {
      this.reduceQuality('High memory usage');
    }
  }

  /**
   * Maneja rendimiento crítico
   */
  handleCriticalPerformance(metrics) {
    if (!this.adaptiveSettings.aggressiveMode) {
      this.adaptiveSettings.aggressiveMode = true;
      this.reduceQuality('Critical performance detected');
    } else {
      // En modo agresivo, reducir más drásticamente
      this.reduceQualityAggressively();
    }
  }

  /**
   * Reduce la calidad gráfica
   */
  reduceQuality(reason = '') {
    const qualities = Object.keys(this.qualityPresets);
    const currentIndex = qualities.indexOf(this.currentQuality);
    
    if (currentIndex < qualities.length - 1) {
      const newQuality = qualities[currentIndex + 1];
      this.setQuality(newQuality, reason);
    }
  }

  /**
   * Aumenta la calidad gráfica
   */
  increaseQuality(reason = '') {
    const qualities = Object.keys(this.qualityPresets);
    const currentIndex = qualities.indexOf(this.currentQuality);
    
    if (currentIndex > 0) {
      const newQuality = qualities[currentIndex - 1];
      this.setQuality(newQuality, reason);
    }
  }

  /**
   * Reduce calidad agresivamente
   */
  reduceQualityAggressively() {
    if (this.currentQuality !== 'potato') {
      this.setQuality('potato', 'Aggressive optimization');
    } else {
      // Ya estamos en potato, aplicar ajustes adicionales
      this.applyEmergencyOptimizations();
    }
  }

  /**
   * Verifica si se puede aumentar la calidad
   */
  canIncreaseQuality() {
    const avgFPS = this.performanceMonitor.getAverageFPS();
    const memoryUsage = this.performanceMonitor.getMetrics().memoryUsage;
    const memoryThreshold = this.deviceProfile.memory * 1024 * 0.6; // 60% para seguridad
    
    return avgFPS > 55 && memoryUsage < memoryThreshold;
  }

  /**
   * Establece una calidad específica
   */
  setQuality(quality, reason = '') {
    if (!this.qualityPresets[quality] || quality === this.currentQuality) {
      return false;
    }
    
    const oldQuality = this.currentQuality;
    this.currentQuality = quality;
    this.lastAdjustment = Date.now();
    
    this.applyQualitySettings(this.qualityPresets[quality]);
    
    const changeData = {
      from: oldQuality,
      to: quality,
      reason: reason,
      timestamp: Date.now(),
      auto: this.autoAdjust
    };
    
    this.triggerCallback('onQualityChange', changeData);
    
    if (this.autoAdjust) {
      this.triggerCallback('onAutoAdjust', changeData);
    }
    
    return true;
  }

  /**
   * Aplica configuraciones de calidad
   */
  applyQualitySettings(preset) {
    // Aplicar configuraciones de renderizado
    this.applyRenderSettings(preset);
    
    // Aplicar configuraciones de efectos
    this.applyEffectSettings(preset);
    
    // Aplicar configuraciones de iluminación
    this.applyLightingSettings(preset);
    
    // Aplicar configuraciones de post-procesado
    this.applyPostProcessingSettings(preset);
  }

  /**
   * Aplica configuraciones de renderizado
   */
  applyRenderSettings(preset) {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const renderScale = preset.renderScale * devicePixelRatio;
      
      canvas.style.width = canvas.clientWidth + 'px';
      canvas.style.height = canvas.clientHeight + 'px';
      canvas.width = canvas.clientWidth * renderScale;
      canvas.height = canvas.clientHeight * renderScale;
    }
    
    // Configurar antialiasing
    this.setAntialiasing(preset.antialiasing);
    
    // Configurar calidad de texturas
    this.setTextureQuality(preset.textureQuality);
  }

  /**
   * Aplica configuraciones de efectos
   */
  applyEffectSettings(preset) {
    // Configurar densidad de partículas
    this.setParticleDensity(preset.particleDensity);
    
    // Configurar calidad de efectos
    this.setEffectsQuality(preset.effectsQuality);
    
    // Configurar niebla volumétrica
    this.setVolumetricFog(preset.volumetricFog);
  }

  /**
   * Aplica configuraciones de iluminación
   */
  applyLightingSettings(preset) {
    // Configurar calidad de sombras
    this.setShadowQuality(preset.shadowQuality);
    
    // Configurar reflexiones
    this.setReflections(preset.reflections);
    
    // Configurar calidad de iluminación
    this.setLightingQuality(preset.lightingQuality);
  }

  /**
   * Aplica configuraciones de post-procesado
   */
  applyPostProcessingSettings(preset) {
    this.setPostProcessing(preset.postProcessing);
  }

  /**
   * Establece antialiasing
   */
  setAntialiasing(type) {
    const event = new CustomEvent('quality:antialiasing', { detail: { type } });
    document.dispatchEvent(event);
  }

  /**
   * Establece calidad de texturas
   */
  setTextureQuality(quality) {
    const event = new CustomEvent('quality:texture', { detail: { quality } });
    document.dispatchEvent(event);
  }

  /**
   * Establece densidad de partículas
   */
  setParticleDensity(density) {
    const event = new CustomEvent('quality:particles', { detail: { density } });
    document.dispatchEvent(event);
  }

  /**
   * Establece calidad de efectos
   */
  setEffectsQuality(quality) {
    const event = new CustomEvent('quality:effects', { detail: { quality } });
    document.dispatchEvent(event);
  }

  /**
   * Establece niebla volumétrica
   */
  setVolumetricFog(enabled) {
    const event = new CustomEvent('quality:volumetricfog', { detail: { enabled } });
    document.dispatchEvent(event);
  }

  /**
   * Establece calidad de sombras
   */
  setShadowQuality(quality) {
    const event = new CustomEvent('quality:shadows', { detail: { quality } });
    document.dispatchEvent(event);
  }

  /**
   * Establece reflexiones
   */
  setReflections(enabled) {
    const event = new CustomEvent('quality:reflections', { detail: { enabled } });
    document.dispatchEvent(event);
  }

  /**
   * Establece calidad de iluminación
   */
  setLightingQuality(quality) {
    const event = new CustomEvent('quality:lighting', { detail: { quality } });
    document.dispatchEvent(event);
  }

  /**
   * Establece post-procesado
   */
  setPostProcessing(enabled) {
    const event = new CustomEvent('quality:postprocessing', { detail: { enabled } });
    document.dispatchEvent(event);
  }

  /**
   * Aplica optimizaciones de emergencia
   */
  applyEmergencyOptimizations() {
    // Deshabilitar todas las animaciones CSS
    const style = document.createElement('style');
    style.textContent = '* { animation-duration: 0s !important; transition-duration: 0s !important; }';
    document.head.appendChild(style);
    
    // Reducir calidad de canvas
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.width = Math.max(320, canvas.width * 0.5);
      canvas.height = Math.max(240, canvas.height * 0.5);
    }
    
    // Disparar evento de optimización de emergencia
    const event = new CustomEvent('quality:emergency', { detail: { active: true } });
    document.dispatchEvent(event);
  }

  /**
   * Maneja cambios de viewport
   */
  onViewportChange() {
    const newPixelRatio = window.devicePixelRatio || 1;
    if (newPixelRatio !== this.deviceProfile.pixelRatio) {
      this.deviceProfile.pixelRatio = newPixelRatio;
      this.applyQualitySettings(this.qualityPresets[this.currentQuality]);
    }
  }

  /**
   * Maneja cambios de visibilidad
   */
  onVisibilityChange() {
    if (document.hidden) {
      // Pausar renderizado cuando no es visible
      const event = new CustomEvent('quality:pause', { detail: { paused: true } });
      document.dispatchEvent(event);
    } else {
      const event = new CustomEvent('quality:pause', { detail: { paused: false } });
      document.dispatchEvent(event);
    }
  }

  /**
   * Maneja cambios de orientación
   */
  onOrientationChange() {
    setTimeout(() => {
      this.onViewportChange();
    }, 500); // Esperar a que se complete el cambio
  }

  /**
   * Detecta si es dispositivo móvil
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Obtiene la calidad actual
   */
  getCurrentQuality() {
    return this.currentQuality;
  }

  /**
   * Obtiene todas las calidades disponibles
   */
  getAvailableQualities() {
    return Object.keys(this.qualityPresets);
  }

  /**
   * Obtiene el preset actual
   */
  getCurrentPreset() {
    return this.qualityPresets[this.currentQuality];
  }

  /**
   * Obtiene el perfil del dispositivo
   */
  getDeviceProfile() {
    return { ...this.deviceProfile };
  }

  /**
   * Habilita/deshabilita ajuste automático
   */
  setAutoAdjust(enabled) {
    this.autoAdjust = enabled;
  }

  /**
   * Registra callback
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  /**
   * Desregistra callback
   */
  off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }

  /**
   * Dispara callback
   */
  triggerCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }
}

export default QualityAdapter;