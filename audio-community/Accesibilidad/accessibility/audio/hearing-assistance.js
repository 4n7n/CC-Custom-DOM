/**
 * Hearing Assistance - Versión Compacta
 * Sistema de amplificación y procesamiento de audio para usuarios con pérdida auditiva
 */

class HearingAssistance {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.audioContext = audioManager?.audioContext;
    this.isEnabled = false;
    this.isInitialized = false;
    
    // Perfil de audición por defecto
    this.profile = {
      type: 'none',
      frequencies: { low: 1.0, mid: 1.0, high: 1.0, veryHigh: 1.0 },
      compression: { enabled: true, ratio: 3.0, threshold: -20, attack: 0.003, release: 0.1 },
      noiseReduction: { enabled: true, level: 0.3 }
    };
    
    // Nodos de audio
    this.nodes = new Map();
    this.filters = new Map();
    this.visualIndicators = new Map();
    
    // Datos de análisis
    this.analyzer = null;
    this.currentLevels = { low: 0, mid: 0, high: 0 };
    this.speechDetected = false;
    
    this.setupPresets();
  }

  async initialize() {
    if (this.isInitialized || !this.audioContext) return;
    
    this.createAudioChain();
    this.createVisualIndicators();
    this.loadProfile();
    this.startMonitoring();
    
    this.isInitialized = true;
    console.log('Hearing Assistance initialized');
  }

  createAudioChain() {
    // Crear nodos principales
    this.nodes.set('input', this.audioContext.createGain());
    this.nodes.set('output', this.audioContext.createGain());
    
    // Filtros de frecuencia
    const freqData = [
      { name: 'low', freq: 375, type: 'lowshelf' },
      { name: 'mid', freq: 1500, type: 'peaking' },
      { name: 'high', freq: 6000, type: 'highshelf' }
    ];
    
    freqData.forEach(({ name, freq, type }) => {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.gain.value = 0;
      if (type === 'peaking') filter.Q.value = 1.0;
      this.filters.set(name, filter);
    });
    
    // Compresor principal
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 20;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.1;
    this.nodes.set('compressor', compressor);
    
    // Analizador
    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 256;
    this.analyzer.smoothingTimeConstant = 0.8;
    
    // Conectar cadena
    this.connectChain();
  }

  connectChain() {
    let current = this.nodes.get('input');
    
    // Conectar filtros en serie
    this.filters.forEach(filter => {
      current.connect(filter);
      current = filter;
    });
    
    // Conectar compresor y analizador
    current.connect(this.nodes.get('compressor'));
    this.nodes.get('compressor').connect(this.analyzer);
    this.analyzer.connect(this.nodes.get('output'));
  }

  setupPresets() {
    this.presets = {
      mild_high: {
        name: 'Pérdida Leve Agudos',
        frequencies: { low: 1.0, mid: 1.2, high: 2.5, veryHigh: 3.0 },
        compression: { enabled: true, ratio: 2.0, threshold: -25 }
      },
      moderate: {
        name: 'Pérdida Moderada',
        frequencies: { low: 1.8, mid: 2.2, high: 2.8, veryHigh: 3.2 },
        compression: { enabled: true, ratio: 3.0, threshold: -20 }
      },
      presbycusis: {
        name: 'Presbiacusia',
        frequencies: { low: 1.0, mid: 1.5, high: 3.0, veryHigh: 4.0 },
        compression: { enabled: true, ratio: 2.5, threshold: -22 }
      },
      speech: {
        name: 'Claridad del Habla',
        frequencies: { low: 0.8, mid: 2.5, high: 2.2, veryHigh: 1.5 },
        compression: { enabled: true, ratio: 2.2, threshold: -24 }
      }
    };
  }

  createVisualIndicators() {
    // Indicador de nivel de sonido
    this.createIndicator('sound', `
      <div class="indicator-header">Nivel de Sonido</div>
      <div class="level-bars">${Array(10).fill(0).map((_, i) => 
        `<div class="bar" data-level="${i}"></div>`).join('')}</div>
      <div class="level-value">0 dB</div>
    `, 'top: 20px; right: 20px;');
    
    // Indicador de frecuencias
    this.createIndicator('freq', `
      <div class="indicator-header">Frecuencias</div>
      <div class="freq-display">
        <div class="freq-item">Graves: <span id="low-level">0</span></div>
        <div class="freq-item">Medios: <span id="mid-level">0</span></div>
        <div class="freq-item">Agudos: <span id="high-level">0</span></div>
      </div>
    `, 'top: 120px; right: 20px;');
    
    // Indicador de habla
    this.createIndicator('speech', `
      <div class="indicator-header">Detección de Habla</div>
      <div class="speech-status">
        <span class="speech-icon">🗣️</span>
        <span class="speech-text">Silencio</span>
      </div>
    `, 'top: 220px; right: 20px;');
  }

  createIndicator(name, content, position) {
    const indicator = document.createElement('div');
    indicator.className = `hearing-indicator hearing-${name}`;
    indicator.innerHTML = content;
    indicator.style.cssText = `
      position: fixed; ${position}
      background: rgba(0,0,0,0.9); color: white; padding: 10px;
      border-radius: 6px; font-size: 11px; z-index: 10000;
      min-width: 140px; opacity: 0; transition: opacity 0.3s;
    `;
    document.body.appendChild(indicator);
    this.visualIndicators.set(name, indicator);
  }

  startMonitoring() {
    if (!this.analyzer) return;
    
    const bufferLength = this.analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const monitor = () => {
      if (!this.isEnabled) {
        requestAnimationFrame(monitor);
        return;
      }
      
      this.analyzer.getByteFrequencyData(dataArray);
      this.analyzeAudio(dataArray);
      this.updateIndicators(dataArray);
      requestAnimationFrame(monitor);
    };
    
    monitor();
  }

  analyzeAudio(data) {
    // Analizar niveles por frecuencia
    const len = data.length;
    const lowEnd = Math.floor(len * 0.1);
    const midEnd = Math.floor(len * 0.4);
    
    this.currentLevels.low = this.calculateRMS(data, 0, lowEnd);
    this.currentLevels.mid = this.calculateRMS(data, lowEnd, midEnd);
    this.currentLevels.high = this.calculateRMS(data, midEnd, len);
    
    // Detectar habla (simplificado)
    const speechData = data.slice(5, 50);
    const speechLevel = this.calculateRMS(speechData, 0, speechData.length);
    this.speechDetected = speechLevel > 30;
  }

  calculateRMS(data, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / (end - start));
  }

  updateIndicators(data) {
    const soundIndicator = this.visualIndicators.get('sound');
    const freqIndicator = this.visualIndicators.get('freq');
    const speechIndicator = this.visualIndicators.get('speech');
    
    if (soundIndicator) {
      const level = this.calculateRMS(data, 0, data.length);
      const dbLevel = 20 * Math.log10(level / 255);
      const normalizedLevel = Math.max(0, Math.min(10, (level / 255) * 10));
      
      // Actualizar barras
      soundIndicator.querySelectorAll('.bar').forEach((bar, i) => {
        bar.style.backgroundColor = i < normalizedLevel ? '#4CAF50' : '#333';
        bar.style.height = '4px';
        bar.style.margin = '1px 0';
      });
      
      soundIndicator.querySelector('.level-value').textContent = `${Math.round(dbLevel)} dB`;
      soundIndicator.style.opacity = level > 10 ? '1' : '0.3';
    }
    
    if (freqIndicator) {
      freqIndicator.querySelector('#low-level').textContent = Math.round(this.currentLevels.low);
      freqIndicator.querySelector('#mid-level').textContent = Math.round(this.currentLevels.mid);
      freqIndicator.querySelector('#high-level').textContent = Math.round(this.currentLevels.high);
      freqIndicator.style.opacity = '1';
    }
    
    if (speechIndicator) {
      const statusText = speechIndicator.querySelector('.speech-text');
      statusText.textContent = this.speechDetected ? 'Habla detectada' : 'Silencio';
      statusText.style.color = this.speechDetected ? '#4CAF50' : '#999';
      speechIndicator.style.opacity = '1';
    }
  }

  applyProfile(profile = this.profile) {
    if (!this.isEnabled) return;
    
    this.profile = { ...this.profile, ...profile };
    
    // Aplicar ajustes de frecuencia
    const freqMap = { low: 'low', mid: 'mid', high: 'high' };
    Object.entries(freqMap).forEach(([key, filterName]) => {
      const filter = this.filters.get(filterName);
      const gain = this.profile.frequencies[key];
      if (filter && gain) {
        const dbGain = 20 * Math.log10(gain);
        filter.gain.setValueAtTime(dbGain, this.audioContext.currentTime);
      }
    });
    
    // Aplicar compresión
    const compressor = this.nodes.get('compressor');
    if (compressor && this.profile.compression) {
      const { ratio, threshold, attack, release } = this.profile.compression;
      compressor.ratio.setValueAtTime(ratio, this.audioContext.currentTime);
      compressor.threshold.setValueAtTime(threshold, this.audioContext.currentTime);
      compressor.attack.setValueAtTime(attack, this.audioContext.currentTime);
      compressor.release.setValueAtTime(release, this.audioContext.currentTime);
    }
    
    this.saveProfile();
  }

  loadPreset(presetName) {
    const preset = this.presets[presetName];
    if (preset) {
      this.applyProfile(preset);
      return true;
    }
    return false;
  }

  connectToSource(source) {
    if (this.isEnabled && source && this.nodes.get('input')) {
      source.connect(this.nodes.get('input'));
      this.nodes.get('output').connect(this.audioContext.destination);
    }
  }

  enable() {
    this.isEnabled = true;
    this.showIndicators();
    this.applyProfile();
    document.dispatchEvent(new CustomEvent('hearing:enabled'));
  }

  disable() {
    this.isEnabled = false;
    this.hideIndicators();
    
    // Reset filters
    this.filters.forEach(filter => {
      filter.gain.setValueAtTime(0, this.audioContext.currentTime);
    });
    
    document.dispatchEvent(new CustomEvent('hearing:disabled'));
  }

  showIndicators() {
    this.visualIndicators.forEach(indicator => {
      indicator.style.opacity = '1';
    });
  }

  hideIndicators() {
    this.visualIndicators.forEach(indicator => {
      indicator.style.opacity = '0';
    });
  }

  saveProfile() {
    try {
      const data = {
        ...this.profile,
        enabled: this.isEnabled,
        lastUpdated: Date.now()
      };
      localStorage.setItem('hearingProfile', JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save hearing profile:', e);
    }
  }

  loadProfile() {
    try {
      const saved = localStorage.getItem('hearingProfile');
      if (saved) {
        const data = JSON.parse(saved);
        this.profile = { ...this.profile, ...data };
        this.isEnabled = data.enabled || false;
        
        if (this.isEnabled) {
          this.applyProfile();
        }
      }
    } catch (e) {
      console.warn('Could not load hearing profile:', e);
    }
  }

  createSettingsPanel() {
    const panel = document.createElement('div');
    panel.className = 'hearing-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>Asistencia Auditiva</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <label><input type="checkbox" id="enabled" ${this.isEnabled ? 'checked' : ''}> Activar</label>
        
        <div class="section">
          <h4>Presets</h4>
          <select id="preset">
            <option value="">Seleccionar...</option>
            ${Object.entries(this.presets).map(([key, preset]) => 
              `<option value="${key}">${preset.name}</option>`).join('')}
          </select>
        </div>
        
        <div class="section">
          <h4>Frecuencias</h4>
          <label>Graves: <input type="range" id="low" min="0.1" max="5" step="0.1" value="${this.profile.frequencies.low}"></label>
          <label>Medios: <input type="range" id="mid" min="0.1" max="5" step="0.1" value="${this.profile.frequencies.mid}"></label>
          <label>Agudos: <input type="range" id="high" min="0.1" max="5" step="0.1" value="${this.profile.frequencies.high}"></label>
        </div>
        
        <div class="section">
          <h4>Compresión</h4>
          <label><input type="checkbox" id="compression" ${this.profile.compression.enabled ? 'checked' : ''}> Activar</label>
          <label>Ratio: <input type="range" id="ratio" min="1" max="10" step="0.5" value="${this.profile.compression.ratio}"></label>
          <label>Umbral: <input type="range" id="threshold" min="-60" max="0" value="${this.profile.compression.threshold}"> dB</label>
        </div>
      </div>
    `;
    
    panel.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.95); color: white; padding: 0; border-radius: 8px;
      z-index: 10001; min-width: 350px; max-height: 80vh; overflow-y: auto;
    `;
    
    this.setupPanelEvents(panel);
    return panel;
  }

  setupPanelEvents(panel) {
    panel.querySelector('#enabled').onchange = (e) => e.target.checked ? this.enable() : this.disable();
    panel.querySelector('#preset').onchange = (e) => e.target.value && this.loadPreset(e.target.value);
    
    ['low', 'mid', 'high'].forEach(freq => {
      panel.querySelector(`#${freq}`).oninput = (e) => {
        this.profile.frequencies[freq] = parseFloat(e.target.value);
        this.applyProfile();
      };
    });
    
    panel.querySelector('#compression').onchange = (e) => {
      this.profile.compression.enabled = e.target.checked;
      this.applyProfile();
    };
    
    ['ratio', 'threshold'].forEach(param => {
      panel.querySelector(`#${param}`).oninput = (e) => {
        this.profile.compression[param] = parseFloat(e.target.value);
        this.applyProfile();
      };
    });
    
    panel.querySelector('.close-btn').onclick = () => panel.remove();
  }

  dispose() {
    this.disable();
    this.visualIndicators.forEach(indicator => indicator.remove());
    this.visualIndicators.clear();
    this.filters.clear();
    this.nodes.clear();
    this.isInitialized = false;
  }
}

export default HearingAssistance;