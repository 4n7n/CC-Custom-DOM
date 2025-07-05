/**
 * Performance Monitor - RAMA 5 Graphics Immersive
 * Monitorea y optimiza el rendimiento gráfico en tiempo real
 */

class PerformanceMonitor {
  constructor() {
    this.isActive = false;
    this.metrics = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      gpuMemory: 0,
      drawCalls: 0,
      vertices: 0,
      textures: 0,
      shaders: 0
    };
    
    this.history = {
      fps: [],
      frameTime: [],
      memory: [],
      gpu: []
    };
    
    this.thresholds = {
      criticalFPS: 30,
      warningFPS: 45,
      maxMemory: 512, // MB
      maxGPUMemory: 256, // MB
      maxDrawCalls: 1000
    };
    
    this.callbacks = {
      onPerformanceChange: [],
      onCriticalPerformance: [],
      onOptimizationNeeded: []
    };
    
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.lastSecond = 0;
    this.performanceObserver = null;
    
    this.initializeMonitoring();
  }

  /**
   * Inicializa el sistema de monitoreo
   */
  initializeMonitoring() {
    this.setupPerformanceObserver();
    this.setupMemoryMonitoring();
    this.setupGPUMonitoring();
    this.setupEventListeners();
  }

  /**
   * Configura el observador de rendimiento
   */
  setupPerformanceObserver() {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.processPerformanceEntry(entry);
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }
  }

  /**
   * Configura el monitoreo de memoria
   */
  setupMemoryMonitoring() {
    if (performance.memory) {
      setInterval(() => {
        this.updateMemoryMetrics();
      }, 1000);
    }
  }

  /**
   * Configura el monitoreo de GPU
   */
  setupGPUMonitoring() {
    if (navigator.gpu) {
      navigator.gpu.requestAdapter().then(adapter => {
        if (adapter) {
          this.gpuAdapter = adapter;
          this.monitorGPUMemory();
        }
      });
    }
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Monitor de visibilidad de página
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseMonitoring();
      } else {
        this.resumeMonitoring();
      }
    });

    // Monitor de cambios de tamaño
    window.addEventListener('resize', () => {
      this.onViewportChange();
    });
  }

  /**
   * Inicia el monitoreo
   */
  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.lastSecond = performance.now();
    
    this.monitoringLoop();
    this.triggerCallback('onPerformanceChange', { status: 'started' });
  }

  /**
   * Detiene el monitoreo
   */
  stop() {
    this.isActive = false;
    this.triggerCallback('onPerformanceChange', { status: 'stopped' });
  }

  /**
   * Pausa el monitoreo
   */
  pauseMonitoring() {
    this.isActive = false;
  }

  /**
   * Reanuda el monitoreo
   */
  resumeMonitoring() {
    if (!this.isActive) {
      this.start();
    }
  }

  /**
   * Loop principal de monitoreo
   */
  monitoringLoop() {
    if (!this.isActive) return;
    
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    this.updateFPSMetrics(now, deltaTime);
    this.updateRenderMetrics();
    this.checkPerformanceThresholds();
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    requestAnimationFrame(() => this.monitoringLoop());
  }

  /**
   * Actualiza métricas de FPS
   */
  updateFPSMetrics(now, deltaTime) {
    this.metrics.frameTime = deltaTime;
    
    if (now - this.lastSecond >= 1000) {
      this.metrics.fps = this.frameCount;
      this.addToHistory('fps', this.metrics.fps);
      this.addToHistory('frameTime', this.metrics.frameTime);
      
      this.frameCount = 0;
      this.lastSecond = now;
    }
  }

  /**
   * Actualiza métricas de memoria
   */
  updateMemoryMetrics() {
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      this.addToHistory('memory', this.metrics.memoryUsage);
    }
  }

  /**
   * Actualiza métricas de renderizado
   */
  updateRenderMetrics() {
    // Obtener métricas de WebGL si está disponible
    const canvas = document.querySelector('canvas');
    if (canvas && canvas.getContext) {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        this.updateWebGLMetrics(gl);
      }
    }
  }

  /**
   * Actualiza métricas de WebGL
   */
  updateWebGLMetrics(gl) {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      // Estimar uso de GPU basado en texturas y buffers activos
      this.metrics.textures = this.countActiveTextures(gl);
      this.metrics.shaders = this.countActiveShaders(gl);
    }
  }

  /**
   * Cuenta texturas activas
   */
  countActiveTextures(gl) {
    let count = 0;
    for (let i = 0; i < gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS); i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      if (gl.getParameter(gl.TEXTURE_BINDING_2D)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Cuenta shaders activos
   */
  countActiveShaders(gl) {
    const program = gl.getParameter(gl.CURRENT_PROGRAM);
    return program ? 1 : 0;
  }

  /**
   * Monitorea memoria de GPU
   */
  monitorGPUMemory() {
    if (this.gpuAdapter) {
      // Implementación específica para WebGPU
      setInterval(() => {
        // Estimar uso de memoria GPU
        this.metrics.gpuMemory = this.estimateGPUMemory();
        this.addToHistory('gpu', this.metrics.gpuMemory);
      }, 2000);
    }
  }

  /**
   * Estima el uso de memoria GPU
   */
  estimateGPUMemory() {
    // Cálculo estimado basado en texturas y buffers
    const textureMemory = this.metrics.textures * 4; // 4MB promedio por textura
    const bufferMemory = this.metrics.vertices * 0.001; // Estimación de vértices
    return textureMemory + bufferMemory;
  }

  /**
   * Procesa entradas de performance
   */
  processPerformanceEntry(entry) {
    switch (entry.entryType) {
      case 'measure':
        this.processMeasureEntry(entry);
        break;
      case 'navigation':
        this.processNavigationEntry(entry);
        break;
      case 'resource':
        this.processResourceEntry(entry);
        break;
    }
  }

  /**
   * Procesa entradas de medición
   */
  processMeasureEntry(entry) {
    if (entry.name.includes('render')) {
      this.metrics.drawCalls++;
    }
  }

  /**
   * Procesa entradas de navegación
   */
  processNavigationEntry(entry) {
    // Métricas de carga inicial
    const loadTime = entry.loadEventEnd - entry.navigationStart;
    this.metrics.loadTime = loadTime;
  }

  /**
   * Procesa entradas de recursos
   */
  processResourceEntry(entry) {
    if (entry.name.includes('.glsl') || entry.name.includes('shader')) {
      this.metrics.shaderLoadTime = entry.duration;
    }
  }

  /**
   * Verifica umbrales de rendimiento
   */
  checkPerformanceThresholds() {
    const { fps, memoryUsage, gpuMemory, drawCalls } = this.metrics;
    
    let needsOptimization = false;
    let isCritical = false;
    
    // Verificar FPS críticos
    if (fps < this.thresholds.criticalFPS) {
      isCritical = true;
      needsOptimization = true;
    } else if (fps < this.thresholds.warningFPS) {
      needsOptimization = true;
    }
    
    // Verificar memoria
    if (memoryUsage > this.thresholds.maxMemory) {
      needsOptimization = true;
    }
    
    // Verificar GPU
    if (gpuMemory > this.thresholds.maxGPUMemory) {
      needsOptimization = true;
    }
    
    // Verificar draw calls
    if (drawCalls > this.thresholds.maxDrawCalls) {
      needsOptimization = true;
    }
    
    if (isCritical) {
      this.triggerCallback('onCriticalPerformance', this.metrics);
    } else if (needsOptimization) {
      this.triggerCallback('onOptimizationNeeded', this.metrics);
    }
  }

  /**
   * Agrega datos al historial
   */
  addToHistory(type, value) {
    if (!this.history[type]) {
      this.history[type] = [];
    }
    
    this.history[type].push({
      timestamp: Date.now(),
      value: value
    });
    
    // Mantener solo los últimos 100 registros
    if (this.history[type].length > 100) {
      this.history[type].shift();
    }
  }

  /**
   * Maneja cambios de viewport
   */
  onViewportChange() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      this.metrics.viewport = {
        width: rect.width,
        height: rect.height,
        pixelRatio: window.devicePixelRatio
      };
    }
  }

  /**
   * Obtiene métricas actuales
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Obtiene historial de métricas
   */
  getHistory(type = null) {
    return type ? this.history[type] : this.history;
  }

  /**
   * Obtiene promedio de FPS
   */
  getAverageFPS(samples = 30) {
    const fpsHistory = this.history.fps.slice(-samples);
    if (fpsHistory.length === 0) return 0;
    
    const sum = fpsHistory.reduce((acc, entry) => acc + entry.value, 0);
    return sum / fpsHistory.length;
  }

  /**
   * Obtiene recomendaciones de optimización
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    
    if (this.metrics.fps < this.thresholds.warningFPS) {
      recommendations.push({
        type: 'fps',
        message: 'Reducir calidad gráfica o efectos',
        priority: 'high'
      });
    }
    
    if (this.metrics.memoryUsage > this.thresholds.maxMemory * 0.8) {
      recommendations.push({
        type: 'memory',
        message: 'Liberar texturas no utilizadas',
        priority: 'medium'
      });
    }
    
    if (this.metrics.drawCalls > this.thresholds.maxDrawCalls * 0.8) {
      recommendations.push({
        type: 'drawcalls',
        message: 'Implementar instancing o batching',
        priority: 'medium'
      });
    }
    
    return recommendations;
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

  /**
   * Genera reporte de rendimiento
   */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      averages: {
        fps: this.getAverageFPS(),
        frameTime: this.getAverageFrameTime(),
        memory: this.getAverageMemory()
      },
      recommendations: this.getOptimizationRecommendations(),
      history: this.getHistory()
    };
    
    return report;
  }

  /**
   * Obtiene tiempo de frame promedio
   */
  getAverageFrameTime(samples = 30) {
    const history = this.history.frameTime.slice(-samples);
    if (history.length === 0) return 0;
    
    const sum = history.reduce((acc, entry) => acc + entry.value, 0);
    return sum / history.length;
  }

  /**
   * Obtiene memoria promedio
   */
  getAverageMemory(samples = 30) {
    const history = this.history.memory.slice(-samples);
    if (history.length === 0) return 0;
    
    const sum = history.reduce((acc, entry) => acc + entry.value, 0);
    return sum / history.length;
  }

  /**
   * Exporta métricas a JSON
   */
  exportMetrics() {
    const data = {
      session: {
        startTime: this.sessionStart,
        duration: Date.now() - this.sessionStart
      },
      metrics: this.generateReport()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}

// Instancia global
const performanceMonitor = new PerformanceMonitor();

// Exportar para uso en módulos
export default PerformanceMonitor;
export { performanceMonitor };