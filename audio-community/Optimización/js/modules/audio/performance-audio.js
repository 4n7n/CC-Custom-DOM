/**
 * Performance Audio - Optimización de rendimiento de audio
 * Sistema integral para optimizar el rendimiento del sistema de audio
 */
class PerformanceAudio {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.isEnabled = true;
    this.performanceLevel = 'balanced'; // low, balanced, high, ultra
    this.metrics = {
      latency: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      audioDropouts: 0,
      processingTime: 0,
      bufferUnderruns: 0,
      activeVoices: 0,
      sampleRate: 44100,
      bufferSize: 256
    };
    this.optimizations = {
      audioPooling: true,
      webWorkers: true,
      lazyLoading: true,
      audioCompression: true,
      spatialOptimization: true,
      memoryManagement: true,
      cpuThrottling: false
    };
    this.resourcePool = new Map();
    this.performanceHistory = [];
    this.optimizationQueue = [];
    this.thresholds = {
      cpuCritical: 80,
      memoryWarning: 70,
      latencyLimit: 20,
      dropoutThreshold: 5
    };
    this.monitoring = {
      isActive: false,
      interval: null,
      frameCounter: 0,
      lastFrameTime: 0
    };
    this.adaptiveOptimizer = null;
    this.isInitialized = false;
    this.webWorkers = new Map();
    this.audioCache = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.setupResourcePools();
    this.initializeAdaptiveOptimizer();
    this.startPerformanceMonitoring();
    this.setupOptimizationQueue();
    this.setupEventListeners();
    this.loadPerformanceSettings();
    await this.initializeWebWorkers();
    
    this.isInitialized = true;
    console.log('Performance Audio initialized');
  }

  setupResourcePools() {
    // Pool de AudioBuffers reutilizables
    this.resourcePool.set('audioBuffers', {
      pool: [],
      inUse: new Set(),
      maxSize: 50,
      createNew: (size = 4096) => new Float32Array(size)
    });
    
    // Pool de nodos de audio
    this.resourcePool.set('gainNodes', {
      pool: [],
      inUse: new Set(),
      maxSize: 20,
      createNew: () => this.audioManager.audioContext?.createGain()
    });
    
    // Pool de filtros
    this.resourcePool.set('filters', {
      pool: [],
      inUse: new Set(),
      maxSize: 15,
      createNew: () => this.audioManager.audioContext?.createBiquadFilter()
    });
    
    // Pool de analizadores
    this.resourcePool.set('analyzers', {
      pool: [],
      inUse: new Set(),
      maxSize: 10,
      createNew: () => {
        const analyzer = this.audioManager.audioContext?.createAnalyser();
        if (analyzer) {
          analyzer.fftSize = 256;
          analyzer.smoothingTimeConstant = 0.8;
        }
        return analyzer;
      }
    });
    
    // Pool de convolvers para reverb
    this.resourcePool.set('convolvers', {
      pool: [],
      inUse: new Set(),
      maxSize: 5,
      createNew: () => this.audioManager.audioContext?.createConvolver()
    });
  }

  getFromPool(poolName, ...args) {
    const pool = this.resourcePool.get(poolName);
    if (!pool) return null;
    
    let resource;
    if (pool.pool.length > 0) {
      resource = pool.pool.pop();
    } else {
      resource = pool.createNew(...args);
    }
    
    if (resource) {
      pool.inUse.add(resource);
    }
    
    return resource;
  }

  returnToPool(poolName, resource) {
    const pool = this.resourcePool.get(poolName);
    if (!pool || !resource) return;
    
    pool.inUse.delete(resource);
    
    if (pool.pool.length < pool.maxSize) {
      // Reset resource properties
      this.resetResourceProperties(resource, poolName);
      pool.pool.push(resource);
    }
  }

  resetResourceProperties(resource, poolName) {
    try {
      switch (poolName) {
        case 'gainNodes':
          resource.gain.value = 1;
          resource.disconnect();
          break;
        case 'filters':
          resource.frequency.value = 350;
          resource.Q.value = 1;
          resource.gain.value = 0;
          resource.type = 'lowpass';
          resource.disconnect();
          break;
        case 'analyzers':
          resource.disconnect();
          break;
        case 'convolvers':
          resource.buffer = null;
          resource.disconnect();
          break;
      }
    } catch (error) {
      console.warn('Error resetting resource:', error);
    }
  }

  initializeAdaptiveOptimizer() {
    this.adaptiveOptimizer = {
      enabled: true,
      adjustmentRate: 0.1,
      lastAdjustment: Date.now(),
      rules: [
        {
          condition: () => this.metrics.cpuUsage > this.thresholds.cpuCritical,
          action: () => this.reduceCPUUsage(),
          priority: 1
        },
        {
          condition: () => this.metrics.memoryUsage > this.thresholds.memoryWarning,
          action: () => this.optimizeMemoryUsage(),
          priority: 2
        },
        {
          condition: () => this.metrics.latency > this.thresholds.latencyLimit,
          action: () => this.reduceLatency(),
          priority: 3
        },
        {
          condition: () => this.metrics.audioDropouts > this.thresholds.dropoutThreshold,
          action: () => this.preventDropouts(),
          priority: 1
        }
      ]
    };
  }

  startPerformanceMonitoring() {
    if (this.monitoring.isActive) return;
    
    this.monitoring.isActive = true;
    this.monitoring.lastFrameTime = performance.now();
    
    const monitor = () => {
      if (!this.monitoring.isActive) return;
      
      const currentTime = performance.now();
      const deltaTime = currentTime - this.monitoring.lastFrameTime;
      
      this.updateMetrics(deltaTime);
      this.runAdaptiveOptimizations();
      this.processOptimizationQueue();
      this.updatePerformanceHistory();
      
      this.monitoring.frameCounter++;
      this.monitoring.lastFrameTime = currentTime;
      
      requestAnimationFrame(monitor);
    };
    
    monitor();
  }

  updateMetrics(deltaTime) {
    // Actualizar métricas de rendimiento
    this.metrics.processingTime = deltaTime;
    
    // Simular CPU usage basado en nodos activos
    const activeNodes = this.getActiveNodesCount();
    this.metrics.cpuUsage = Math.min(100, (activeNodes / 50) * 100);
    
    // Estimar uso de memoria
    this.metrics.memoryUsage = this.estimateMemoryUsage();
    
    // Calcular latencia
    this.metrics.latency = this.calculateLatency();
    
    // Contar voces activas
    this.metrics.activeVoices = this.countActiveVoices();
    
    // Detectar audio dropouts
    if (deltaTime > 16.67) { // >60fps
      this.metrics.audioDropouts++;
    }
  }

  getActiveNodesCount() {
    let count = 0;
    this.resourcePool.forEach(pool => {
      count += pool.inUse.size;
    });
    return count;
  }

  estimateMemoryUsage() {
    // Estimar uso de memoria basado en recursos activos
    let memoryUsage = 0;
    
    this.resourcePool.forEach((pool, poolName) => {
      const nodeSize = this.getNodeMemorySize(poolName);
      memoryUsage += (pool.pool.length + pool.inUse.size) * nodeSize;
    });
    
    // Añadir memoria de cache de audio
    this.audioCache.forEach((data) => {
      if (data.buffer) {
        memoryUsage += data.buffer.length * 4; // Float32 = 4 bytes
      }
    });
    
    // Convertir a porcentaje estimado (máximo 100MB)
    return Math.min(100, (memoryUsage / (100 * 1024 * 1024)) * 100);
  }

  getNodeMemorySize(poolName) {
    const sizes = {
      audioBuffers: 16384, // 4KB default
      gainNodes: 1024,
      filters: 2048,
      analyzers: 4096,
      convolvers: 8192
    };
    return sizes[poolName] || 1024;
  }

  calculateLatency() {
    if (!this.audioManager.audioContext) return 0;
    
    const bufferSize = this.metrics.bufferSize;
    const sampleRate = this.metrics.sampleRate;
    const baseLatency = (bufferSize / sampleRate) * 1000;
    
    // Añadir latencia de procesamiento
    const processingLatency = this.metrics.processingTime * 0.1;
    
    return baseLatency + processingLatency;
  }

  countActiveVoices() {
    // Contar voces activas en el sistema
    let voices = 0;
    
    if (this.audioManager.audioSources) {
      voices += this.audioManager.audioSources.size || 0;
    }
    
    return voices;
  }

  runAdaptiveOptimizations() {
    if (!this.adaptiveOptimizer.enabled) return;
    
    const now = Date.now();
    if (now - this.adaptiveOptimizer.lastAdjustment < 1000) return; // 1 segundo entre ajustes
    
    // Ejecutar reglas de optimización por prioridad
    const applicableRules = this.adaptiveOptimizer.rules
      .filter(rule => rule.condition())
      .sort((a, b) => a.priority - b.priority);
    
    if (applicableRules.length > 0) {
      applicableRules[0].action();
      this.adaptiveOptimizer.lastAdjustment = now;
    }
  }

  reduceCPUUsage() {
    console.log('Reducing CPU usage...');
    
    // Reducir calidad de efectos
    this.optimizationQueue.push({
      type: 'reduce_effects_quality',
      priority: 1,
      action: () => {
        // Reducir FFT size de analizadores
        this.resourcePool.get('analyzers')?.pool.forEach(analyzer => {
          if (analyzer.fftSize > 128) {
            analyzer.fftSize = Math.max(128, analyzer.fftSize / 2);
          }
        });
      }
    });
    
    // Activar throttling de CPU
    this.optimizations.cpuThrottling = true;
  }

  optimizeMemoryUsage() {
    console.log('Optimizing memory usage...');
    
    // Limpiar cache de audio
    this.optimizationQueue.push({
      type: 'clean_audio_cache',
      priority: 2,
      action: () => {
        const cacheSize = this.audioCache.size;
        if (cacheSize > 20) {
          // Eliminar elementos menos usados
          const sortedEntries = Array.from(this.audioCache.entries())
            .sort((a, b) => (a[1].lastUsed || 0) - (b[1].lastUsed || 0));
          
          const toRemove = Math.floor(cacheSize * 0.3);
          for (let i = 0; i < toRemove; i++) {
            this.audioCache.delete(sortedEntries[i][0]);
          }
        }
      }
    });
    
    // Reducir tamaño de pools
    this.optimizationQueue.push({
      type: 'reduce_pool_sizes',
      priority: 3,
      action: () => {
        this.resourcePool.forEach(pool => {
          pool.maxSize = Math.max(5, Math.floor(pool.maxSize * 0.8));
          // Remover elementos excedentes
          while (pool.pool.length > pool.maxSize) {
            pool.pool.pop();
          }
        });
      }
    });
  }

  reduceLatency() {
    console.log('Reducing latency...');
    
    // Reducir buffer size si es posible
    this.optimizationQueue.push({
      type: 'reduce_buffer_size',
      priority: 1,
      action: () => {
        if (this.metrics.bufferSize > 128) {
          this.metrics.bufferSize = Math.max(128, this.metrics.bufferSize / 2);
          this.applyBufferSizeChange();
        }
      }
    });
  }

  preventDropouts() {
    console.log('Preventing audio dropouts...');
    
    // Aumentar buffer size
    this.optimizationQueue.push({
      type: 'increase_buffer_size',
      priority: 1,
      action: () => {
        if (this.metrics.bufferSize < 1024) {
          this.metrics.bufferSize = Math.min(1024, this.metrics.bufferSize * 2);
          this.applyBufferSizeChange();
        }
      }
    });
    
    // Reset contador de dropouts
    this.metrics.audioDropouts = 0;
  }

  applyBufferSizeChange() {
    // Aplicar cambio de buffer size (simulado)
    console.log(`Buffer size changed to: ${this.metrics.bufferSize}`);
    
    // En una implementación real, esto requeriría reinicializar el contexto de audio
    document.dispatchEvent(new CustomEvent('audio:bufferSizeChanged', {
      detail: { bufferSize: this.metrics.bufferSize }
    }));
  }

  setupOptimizationQueue() {
    // Procesar queue de optimizaciones
    setInterval(() => {
      this.processOptimizationQueue();
    }, 100);
  }

  processOptimizationQueue() {
    if (this.optimizationQueue.length === 0) return;
    
    // Ordenar por prioridad
    this.optimizationQueue.sort((a, b) => a.priority - b.priority);
    
    // Procesar hasta 3 optimizaciones por frame
    const toProcess = this.optimizationQueue.splice(0, 3);
    
    toProcess.forEach(optimization => {
      try {
        optimization.action();
      } catch (error) {
        console.warn('Error applying optimization:', error);
      }
    });
  }

  async initializeWebWorkers() {
    if (!this.optimizations.webWorkers) return;
    
    try {
      // Worker para procesamiento de audio
      const audioWorkerCode = `
        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          switch (type) {
            case 'processAudio':
              // Procesar datos de audio
              const processed = processAudioData(data);
              self.postMessage({ type: 'audioProcessed', data: processed });
              break;
            case 'analyzeFrequency':
              // Análisis de frecuencia
              const analysis = analyzeFrequencyData(data);
              self.postMessage({ type: 'frequencyAnalyzed', data: analysis });
              break;
          }
        };
        
        function processAudioData(audioData) {
          // Procesamiento básico de audio
          return audioData.map(sample => sample * 0.9); // Ejemplo: reducir volumen
        }
        
        function analyzeFrequencyData(frequencyData) {
          // Análisis básico de frecuencia
          const bins = frequencyData.length;
          const low = frequencyData.slice(0, bins * 0.1);
          const mid = frequencyData.slice(bins * 0.1, bins * 0.6);
          const high = frequencyData.slice(bins * 0.6);
          
          return {
            low: low.reduce((sum, val) => sum + val, 0) / low.length,
            mid: mid.reduce((sum, val) => sum + val, 0) / mid.length,
            high: high.reduce((sum, val) => sum + val, 0) / high.length
          };
        }
      `;
      
      const blob = new Blob([audioWorkerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      
      worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };
      
      this.webWorkers.set('audioProcessor', worker);
      
    } catch (error) {
      console.warn('Could not initialize web workers:', error);
      this.optimizations.webWorkers = false;
    }
  }

  handleWorkerMessage(data) {
    const { type, data: result } = data;
    
    switch (type) {
      case 'audioProcessed':
        this.onAudioProcessed(result);
        break;
      case 'frequencyAnalyzed':
        this.onFrequencyAnalyzed(result);
        break;
    }
  }

  onAudioProcessed(processedData) {
    // Manejar datos de audio procesados
    document.dispatchEvent(new CustomEvent('audio:processed', {
      detail: { data: processedData }
    }));
  }

  onFrequencyAnalyzed(analysisData) {
    // Manejar análisis de frecuencia
    document.dispatchEvent(new CustomEvent('audio:frequencyAnalyzed', {
      detail: { analysis: analysisData }
    }));
  }

  setupEventListeners() {
    // Eventos de cambio de rendimiento
    document.addEventListener('audio:performanceLevelChanged', (e) => {
      this.setPerformanceLevel(e.detail.level);
    });
    
    // Eventos de optimización manual
    document.addEventListener('audio:optimizeMemory', () => {
      this.optimizeMemoryUsage();
    });
    
    document.addEventListener('audio:optimizeCPU', () => {
      this.reduceCPUUsage();
    });
  }

  setPerformanceLevel(level) {
    this.performanceLevel = level;
    
    const configs = {
      low: {
        audioPooling: false,
        webWorkers: false,
        lazyLoading: true,
        audioCompression: true,
        maxNodes: 10
      },
      balanced: {
        audioPooling: true,
        webWorkers: true,
        lazyLoading: true,
        audioCompression: true,
        maxNodes: 25
      },
      high: {
        audioPooling: true,
        webWorkers: true,
        lazyLoading: false,
        audioCompression: false,
        maxNodes: 50
      },
      ultra: {
        audioPooling: true,
        webWorkers: true,
        lazyLoading: false,
        audioCompression: false,
        maxNodes: 100
      }
    };
    
    const config = configs[level] || configs.balanced;
    this.applyPerformanceConfig(config);
  }

  applyPerformanceConfig(config) {
    Object.assign(this.optimizations, config);
    
    // Ajustar tamaños de pools
    if (config.maxNodes) {
      this.resourcePool.forEach(pool => {
        pool.maxSize = Math.min(pool.maxSize, config.maxNodes);
      });
    }
    
    console.log(`Performance level applied: ${this.performanceLevel}`);
  }

  updatePerformanceHistory() {
    const entry = {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      level: this.performanceLevel
    };
    
    this.performanceHistory.push(entry);
    
    // Mantener solo los últimos 100 entries
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  getPerformanceReport() {
    const recent = this.performanceHistory.slice(-10);
    
    return {
      current: this.metrics,
      average: this.calculateAverageMetrics(recent),
      trend: this.analyzeTrend(recent),
      recommendations: this.generateRecommendations()
    };
  }

  calculateAverageMetrics(entries) {
    if (entries.length === 0) return { ...this.metrics };
    
    const avg = {};
    Object.keys(this.metrics).forEach(key => {
      avg[key] = entries.reduce((sum, entry) => sum + entry.metrics[key], 0) / entries.length;
    });
    
    return avg;
  }

  analyzeTrend(entries) {
    if (entries.length < 2) return 'stable';
    
    const first = entries[0].metrics;
    const last = entries[entries.length - 1].metrics;
    
    const cpuTrend = last.cpuUsage - first.cpuUsage;
    const memoryTrend = last.memoryUsage - first.memoryUsage;
    
    if (cpuTrend > 10 || memoryTrend > 10) return 'degrading';
    if (cpuTrend < -10 || memoryTrend < -10) return 'improving';
    return 'stable';
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.cpuUsage > 70) {
      recommendations.push('Consider reducing audio effects quality or switching to low performance mode');
    }
    
    if (this.metrics.memoryUsage > 60) {
      recommendations.push('Clear audio cache or reduce the number of simultaneous audio sources');
    }
    
    if (this.metrics.latency > 15) {
      recommendations.push('Reduce buffer size or close other applications');
    }
    
    if (this.metrics.audioDropouts > 3) {
      recommendations.push('Increase buffer size or reduce audio processing load');
    }
    
    return recommendations;
  }

  loadPerformanceSettings() {
    try {
      const saved = localStorage.getItem('audioPerformanceSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.performanceLevel = settings.level || 'balanced';
        this.optimizations = { ...this.optimizations, ...settings.optimizations };
        this.thresholds = { ...this.thresholds, ...settings.thresholds };
      }
    } catch (error) {
      console.warn('Error loading performance settings:', error);
    }
  }

  savePerformanceSettings() {
    try {
      const settings = {
        level: this.performanceLevel,
        optimizations: this.optimizations,
        thresholds: this.thresholds,
        lastSaved: Date.now()
      };
      localStorage.setItem('audioPerformanceSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Error saving performance settings:', error);
    }
  }

  createPerformancePanel() {
    const panel = document.createElement('div');
    panel.className = 'performance-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>⚡ Rendimiento de Audio</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="metrics-section">
          <h4>📊 Métricas Actuales</h4>
          <div class="metrics-grid">
            <div class="metric">
              <span class="label">CPU:</span>
              <span class="value" id="cpu-value">${this.metrics.cpuUsage.toFixed(1)}%</span>
            </div>
            <div class="metric">
              <span class="label">Memoria:</span>
              <span class="value" id="memory-value">${this.metrics.memoryUsage.toFixed(1)}%</span>
            </div>
            <div class="metric">
              <span class="label">Latencia:</span>
              <span class="value" id="latency-value">${this.metrics.latency.toFixed(1)}ms</span>
            </div>
            <div class="metric">
              <span class="label">Dropouts:</span>
              <span class="value" id="dropouts-value">${this.metrics.audioDropouts}</span>
            </div>
          </div>
        </div>
        
        <div class="performance-level-section">
          <h4>🎯 Nivel de Rendimiento</h4>
          <select id="performance-level">
            <option value="low" ${this.performanceLevel === 'low' ? 'selected' : ''}>Bajo (Máximo ahorro)</option>
            <option value="balanced" ${this.performanceLevel === 'balanced' ? 'selected' : ''}>Balanceado</option>
            <option value="high" ${this.performanceLevel === 'high' ? 'selected' : ''}>Alto</option>
            <option value="ultra" ${this.performanceLevel === 'ultra' ? 'selected' : ''}>Ultra (Máxima calidad)</option>
          </select>
        </div>
        
        <div class="optimizations-section">
          <h4>🔧 Optimizaciones</h4>
          <div class="optimization-toggles">
            ${Object.entries(this.optimizations).map(([key, value]) => `
              <label class="toggle">
                <input type="checkbox" data-optimization="${key}" ${value ? 'checked' : ''}>
                <span>${this.getOptimizationLabel(key)}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <div class="actions-section">
          <h4>⚡ Acciones Rápidas</h4>
          <div class="action-buttons">
            <button id="optimize-memory" class="btn-action">🧹 Limpiar Memoria</button>
            <button id="optimize-cpu" class="btn-action">🔥 Reducir CPU</button>
            <button id="reset-metrics" class="btn-action">📊 Reset Métricas</button>
          </div>
        </div>
      </div>
    `;
    
    this.setupPanelEvents(panel);
    this.setupPanelStyles(panel);
    this.startPanelUpdates(panel);
    
    return panel;
  }

  getOptimizationLabel(key) {
    const labels = {
      audioPooling: 'Pool de Audio',
      webWorkers: 'Web Workers',
      lazyLoading: 'Carga Diferida',
      audioCompression: 'Compresión de Audio',
      spatialOptimization: 'Optimización Espacial',
      memoryManagement: 'Gestión de Memoria',
      cpuThrottling: 'Limitación de CPU'
    };
    return labels[key] || key;
  }

  setupPanelEvents(panel) {
    // Cambio de nivel de rendimiento
    panel.querySelector('#performance-level').addEventListener('change', (e) => {
      this.setPerformanceLevel(e.target.value);
    });
    
    // Toggles de optimización
    panel.querySelectorAll('[data-optimization]').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const optimization = e.target.dataset.optimization;
        this.optimizations[optimization] = e.target.checked;
        this.savePerformanceSettings();
      });
    });
    
    // Botones de acción
    panel.querySelector('#optimize-memory').addEventListener('click', () => {
      this.optimizeMemoryUsage();
    });
    
    panel.querySelector('#optimize-cpu').addEventListener('click', () => {
      this.reduceCPUUsage();
    });
    
    panel.querySelector('#reset-metrics').addEventListener('click', () => {
      this.resetMetrics();
    });
    
    panel.querySelector('.close-btn').addEventListener('click', () => {
      panel.remove();
    });
  }

  setupPanelStyles(panel) {
    panel.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.95); color: white; padding: 0; border-radius: 12px;
      z-index: 10001; min-width: 450px; max-height: 80vh; overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
  }

  startPanelUpdates(panel) {
    const updateInterval = setInterval(() => {
      if (!document.contains(panel)) {
        clearInterval(updateInterval);
        return;
      }
      
      // Actualizar métricas en tiempo real
      panel.querySelector('#cpu-value').textContent = `${this.metrics.cpuUsage.toFixed(1)}%`;
      panel.querySelector('#memory-value').textContent = `${this.metrics.memoryUsage.toFixed(1)}%`;
      panel.querySelector('#latency-value').textContent = `${this.metrics.latency.toFixed(1)}ms`;
      panel.querySelector('#dropouts-value').textContent = `${this.metrics.audioDropouts}`;
      
      // Colorear métricas según umbral
      this.updateMetricColors(panel);
    }, 1000);
  }

  updateMetricColors(panel) {
    const cpuElement = panel.querySelector('#cpu-value');
    const memoryElement = panel.querySelector('#memory-value');
    const latencyElement = panel.querySelector('#latency-value');
    const dropoutsElement = panel.querySelector('#dropouts-value');
    
    // CPU
    cpuElement.style.color = this.metrics.cpuUsage > 70 ? '#f44336' : 
                              this.metrics.cpuUsage > 50 ? '#ff9800' : '#4caf50';
    
    // Memory
    memoryElement.style.color = this.metrics.memoryUsage > 70 ? '#f44336' :
                                 this.metrics.memoryUsage > 50 ? '#ff9800' : '#4caf50';
    
    // Latency
    latencyElement.style.color = this.metrics.latency > 20 ? '#f44336' :
                                  this.metrics.latency > 10 ? '#ff9800' : '#4caf50';
    
    // Dropouts
    dropoutsElement.style.color = this.metrics.audioDropouts > 5 ? '#f44336' :
                                   this.metrics.audioDropouts > 2 ? '#ff9800' : '#4caf50';
  }

  resetMetrics() {
    this.metrics.audioDropouts = 0;
    this.metrics.bufferUnderruns = 0;
    this.performanceHistory = [];
    
    console.log('Performance metrics reset');
    
    document.dispatchEvent(new CustomEvent('audio:metricsReset'));
  }

  // Métodos de utilidad para audio caching
  cacheAudioData(key, audioBuffer, metadata = {}) {
    if (!this.optimizations.lazyLoading) return;
    
    this.audioCache.set(key, {
      buffer: audioBuffer,
      metadata,
      lastUsed: Date.now(),
      useCount: 1
    });
  }

  getCachedAudioData(key) {
    const cached = this.audioCache.get(key);
    if (cached) {
      cached.lastUsed = Date.now();
      cached.useCount++;
      return cached.buffer;
    }
    return null;
  }

  preloadAudioData(urls) {
    return Promise.all(urls.map(url => this.loadAudioData(url)));
  }

  async loadAudioData(url) {
    const cached = this.getCachedAudioData(url);
    if (cached) return cached;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioManager.audioContext.decodeAudioData(arrayBuffer);
      
      this.cacheAudioData(url, audioBuffer, { url, loadTime: Date.now() });
      return audioBuffer;
    } catch (error) {
      console.warn('Error loading audio data:', error);
      return null;
    }
  }

  // Métodos de optimización espacial
  optimizeSpatialAudio(listeners, sources) {
    if (!this.optimizations.spatialOptimization) return { listeners, sources };
    
    // Culling de fuentes lejanas
    const maxDistance = 100;
    const optimizedSources = sources.filter(source => {
      return listeners.some(listener => {
        const distance = this.calculateDistance(listener.position, source.position);
        return distance <= maxDistance;
      });
    });
    
    // LOD (Level of Detail) para fuentes distantes
    optimizedSources.forEach(source => {
      const minDistance = Math.min(...listeners.map(listener => 
        this.calculateDistance(listener.position, source.position)
      ));
      
      // Reducir calidad según distancia
      if (minDistance > 50) {
        source.quality = 'low';
      } else if (minDistance > 25) {
        source.quality = 'medium';
      } else {
        source.quality = 'high';
      }
    });
    
    return { listeners, sources: optimizedSources };
  }

  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Gestión avanzada de memoria
  performGarbageCollection() {
    console.log('Performing audio garbage collection...');
    
    // Limpiar pools no utilizados
    this.resourcePool.forEach((pool, poolName) => {
      const unusedTime = 30000; // 30 segundos
      const now = Date.now();
      
      pool.pool = pool.pool.filter(resource => {
        return (now - (resource.lastUsed || now)) < unusedTime;
      });
    });
    
    // Limpiar cache antiguo
    const maxCacheAge = 300000; // 5 minutos
    const now = Date.now();
    
    this.audioCache.forEach((data, key) => {
      if (now - data.lastUsed > maxCacheAge && data.useCount < 2) {
        this.audioCache.delete(key);
      }
    });
    
    // Triggear garbage collection del navegador (si está disponible)
    if (window.gc) {
      window.gc();
    }
  }

  // Análisis de rendimiento en tiempo real
  analyzePerformanceBottlenecks() {
    const bottlenecks = [];
    
    if (this.metrics.cpuUsage > this.thresholds.cpuCritical) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'critical',
        message: 'CPU usage is critically high',
        suggestions: ['Reduce active audio sources', 'Lower audio quality', 'Disable CPU-intensive effects']
      });
    }
    
    if (this.metrics.memoryUsage > this.thresholds.memoryWarning) {
      bottlenecks.push({
        type: 'memory',
        severity: 'warning',
        message: 'Memory usage is high',
        suggestions: ['Clear audio cache', 'Reduce concurrent audio streams', 'Use audio compression']
      });
    }
    
    if (this.metrics.latency > this.thresholds.latencyLimit) {
      bottlenecks.push({
        type: 'latency',
        severity: 'warning',
        message: 'Audio latency is high',
        suggestions: ['Reduce buffer size', 'Disable audio effects', 'Close other applications']
      });
    }
    
    if (this.metrics.audioDropouts > this.thresholds.dropoutThreshold) {
      bottlenecks.push({
        type: 'dropouts',
        severity: 'critical',
        message: 'Audio dropouts detected',
        suggestions: ['Increase buffer size', 'Reduce audio processing load', 'Check system resources']
      });
    }
    
    return bottlenecks;
  }

  // Optimización automática basada en hardware
  detectHardwareCapabilities() {
    const capabilities = {
      cores: navigator.hardwareConcurrency || 4,
      memory: navigator.deviceMemory || 4,
      connection: navigator.connection?.effectiveType || '4g',
      webAudio: !!window.AudioContext,
      webWorkers: !!window.Worker,
      offlineAudio: !!window.OfflineAudioContext
    };
    
    // Ajustar configuración basada en hardware
    if (capabilities.cores < 4) {
      this.setPerformanceLevel('low');
    } else if (capabilities.cores >= 8 && capabilities.memory >= 8) {
      this.setPerformanceLevel('ultra');
    } else if (capabilities.cores >= 4 && capabilities.memory >= 4) {
      this.setPerformanceLevel('high');
    } else {
      this.setPerformanceLevel('balanced');
    }
    
    return capabilities;
  }

  // Profiling de audio
  startAudioProfiling() {
    console.log('Starting audio profiling...');
    
    this.profiling = {
      isActive: true,
      startTime: performance.now(),
      samples: [],
      events: []
    };
    
    const originalCreateGain = this.audioManager.audioContext.createGain.bind(this.audioManager.audioContext);
    this.audioManager.audioContext.createGain = () => {
      const startTime = performance.now();
      const node = originalCreateGain();
      const endTime = performance.now();
      
      this.profiling.events.push({
        type: 'createGain',
        duration: endTime - startTime,
        timestamp: startTime
      });
      
      return node;
    };
  }

  stopAudioProfiling() {
    if (!this.profiling?.isActive) return null;
    
    console.log('Stopping audio profiling...');
    
    this.profiling.isActive = false;
    const duration = performance.now() - this.profiling.startTime;
    
    const report = {
      duration,
      totalEvents: this.profiling.events.length,
      averageEventTime: this.profiling.events.reduce((sum, event) => sum + event.duration, 0) / this.profiling.events.length,
      eventsByType: this.groupEventsByType(this.profiling.events),
      recommendations: this.generateProfilingRecommendations(this.profiling.events)
    };
    
    this.profiling = null;
    return report;
  }

  groupEventsByType(events) {
    const grouped = {};
    events.forEach(event => {
      if (!grouped[event.type]) {
        grouped[event.type] = { count: 0, totalDuration: 0 };
      }
      grouped[event.type].count++;
      grouped[event.type].totalDuration += event.duration;
    });
    
    return grouped;
  }

  generateProfilingRecommendations(events) {
    const recommendations = [];
    
    const slowEvents = events.filter(event => event.duration > 1);
    if (slowEvents.length > 0) {
      recommendations.push('Consider optimizing slow audio operations');
    }
    
    const frequentEvents = this.groupEventsByType(events);
    Object.entries(frequentEvents).forEach(([type, data]) => {
      if (data.count > 100) {
        recommendations.push(`High frequency of ${type} operations detected - consider pooling`);
      }
    });
    
    return recommendations;
  }

  // Exportar configuración de rendimiento
  exportPerformanceConfig() {
    const config = {
      version: '1.0',
      timestamp: Date.now(),
      performanceLevel: this.performanceLevel,
      optimizations: this.optimizations,
      thresholds: this.thresholds,
      metrics: this.metrics,
      history: this.performanceHistory.slice(-20) // Últimas 20 entradas
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audio-performance-config.json';
    a.click();
    
    URL.revokeObjectURL(url);
  }

  // Importar configuración de rendimiento
  async importPerformanceConfig(file) {
    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      if (config.version && config.performanceLevel) {
        this.performanceLevel = config.performanceLevel;
        this.optimizations = { ...this.optimizations, ...config.optimizations };
        this.thresholds = { ...this.thresholds, ...config.thresholds };
        
        this.applyPerformanceConfig(this.optimizations);
        this.savePerformanceSettings();
        
        console.log('Performance configuration imported successfully');
        return true;
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      console.error('Error importing performance configuration:', error);
      return false;
    }
  }

  // Cleanup y disposal
  dispose() {
    console.log('Disposing Performance Audio...');
    
    // Detener monitoreo
    this.monitoring.isActive = false;
    if (this.monitoring.interval) {
      clearInterval(this.monitoring.interval);
    }
    
    // Cerrar web workers
    this.webWorkers.forEach(worker => {
      worker.terminate();
    });
    this.webWorkers.clear();
    
    // Limpiar pools de recursos
    this.resourcePool.forEach(pool => {
      pool.pool.forEach(resource => {
        try {
          if (resource.disconnect) resource.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      pool.pool = [];
      pool.inUse.clear();
    });
    
    // Limpiar cache
    this.audioCache.clear();
    
    // Limpiar arrays
    this.performanceHistory = [];
    this.optimizationQueue = [];
    
    this.isInitialized = false;
  }

  // Getter para estadísticas rápidas
  get stats() {
    return {
      isEnabled: this.isEnabled,
      performanceLevel: this.performanceLevel,
      metrics: { ...this.metrics },
      poolSizes: Object.fromEntries(
        Array.from(this.resourcePool.entries()).map(([name, pool]) => [
          name, 
          { available: pool.pool.length, inUse: pool.inUse.size, max: pool.maxSize }
        ])
      ),
      cacheSize: this.audioCache.size,
      optimizations: { ...this.optimizations }
    };
  }
}

export default PerformanceAudio;