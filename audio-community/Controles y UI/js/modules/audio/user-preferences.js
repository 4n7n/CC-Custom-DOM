/**
 * User Preferences - Gestión de preferencias de usuario
 * Sistema para guardar, cargar y sincronizar preferencias de audio
 */

class UserPreferences {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.preferences = {
      volumes: {
        master: 0.8,
        music: 0.7,
        sfx: 0.8,
        voice: 0.9,
        ambient: 0.6,
        cultural: 0.7
      },
      settings: {
        spatialAudio: true,
        culturalMode: false,
        autoAdapt: true,
        voiceNarration: true,
        visualizer: true,
        keyboardShortcuts: true
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        largeText: false,
        screenReader: false,
        colorBlind: false
      },
      interface: {
        theme: 'default',
        panelPosition: 'bottom-right',
        autoHide: true,
        compactMode: false,
        showTooltips: true
      },
      audio: {
        preset: 'default',
        sampleRate: 44100,
        bufferSize: 256,
        compression: true,
        normalization: true
      },
      cultural: {
        respectfulMode: true,
        educationalNarration: true,
        traditionalInstruments: true,
        ceremonies: true
      }
    };
    this.storageKey = 'communityAudioPreferences';
    this.syncInterval = 30000; // 30 segundos
    this.lastSave = Date.now();
    this.changeQueue = new Set();
    this.autoSaveTimer = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    await this.loadPreferences();
    this.detectSystemPreferences();
    this.setupEventListeners();
    this.startAutoSave();
    
    this.isInitialized = true;
    console.log('User Preferences initialized');
  }

  async loadPreferences() {
    try {
      // Cargar desde localStorage
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.mergePreferences(parsed);
      }
      
      // Aplicar preferencias cargadas
      await this.applyPreferences();
      
      // Emitir evento de carga
      document.dispatchEvent(new CustomEvent('preferences:loaded', {
        detail: { preferences: this.preferences }
      }));
      
    } catch (error) {
      console.error('Error loading preferences:', error);
      await this.resetToDefaults();
    }
  }

  mergePreferences(saved) {
    // Fusión profunda manteniendo estructura de defaults
    const merge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };
    
    merge(this.preferences, saved);
  }

  async applyPreferences() {
    // Aplicar volúmenes
    Object.entries(this.preferences.volumes).forEach(([channel, volume]) => {
      if (this.audioManager.activeChannels?.has(channel)) {
        this.audioManager.setVolume(channel, volume);
      }
    });
    
    // Aplicar configuraciones de audio
    if (this.audioManager.settings) {
      Object.assign(this.audioManager.settings, this.preferences.audio);
    }
    
    // Aplicar accesibilidad
    this.applyAccessibilitySettings();
    
    // Aplicar tema de interfaz
    this.applyInterfaceSettings();
    
    // Aplicar configuraciones culturales
    this.applyCulturalSettings();
  }

  detectSystemPreferences() {
    // Detectar preferencias del sistema
    if (window.matchMedia) {
      // Modo oscuro
      const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
      if (darkMode.matches && this.preferences.interface.theme === 'default') {
        this.setPreference('interface.theme', 'dark');
      }
      
      // Movimiento reducido
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reducedMotion.matches) {
        this.setPreference('accessibility.reducedMotion', true);
      }
      
      // Alto contraste
      const highContrast = window.matchMedia('(prefers-contrast: high)');
      if (highContrast.matches) {
        this.setPreference('accessibility.highContrast', true);
      }
      
      // Escuchar cambios del sistema
      darkMode.addEventListener('change', (e) => {
        if (this.preferences.interface.theme === 'auto') {
          this.applyInterfaceSettings();
        }
      });
      
      reducedMotion.addEventListener('change', (e) => {
        this.setPreference('accessibility.reducedMotion', e.matches);
      });
    }
    
    // Detectar lector de pantalla
    if (navigator.userAgent.includes('NVDA') || 
        navigator.userAgent.includes('JAWS') || 
        window.speechSynthesis) {
      this.setPreference('accessibility.screenReader', true);
    }
    
    // Detectar capacidades de audio
    this.detectAudioCapabilities();
  }

  detectAudioCapabilities() {
    if (window.AudioContext || window.webkitAudioContext) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Detectar sample rate nativo
      this.setPreference('audio.sampleRate', audioContext.sampleRate);
      
      // Detectar soporte de audio espacial
      if (audioContext.createPanner) {
        this.setPreference('settings.spatialAudio', true);
      }
      
      audioContext.close();
    }
  }

  setPreference(path, value) {
    const keys = path.split('.');
    let current = this.preferences;
    
    // Navegar hasta el penúltimo nivel
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // Establecer valor
    const lastKey = keys[keys.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = value;
    
    // Marcar como cambiado
    this.changeQueue.add(path);
    
    // Emitir evento de cambio
    document.dispatchEvent(new CustomEvent('preference:changed', {
      detail: { path, value, oldValue }
    }));
    
    // Programar auto guardado
    this.scheduleAutoSave();
    
    // Aplicar cambio inmediatamente si es necesario
    this.applyPreferenceChange(path, value);
  }

  getPreference(path, defaultValue = null) {
    const keys = path.split('.');
    let current = this.preferences;
    
    for (const key of keys) {
      if (current[key] === undefined) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current;
  }

  applyPreferenceChange(path, value) {
    const [category, setting] = path.split('.');
    
    switch (category) {
      case 'volumes':
        if (this.audioManager.activeChannels?.has(setting)) {
          this.audioManager.setVolume(setting, value);
        }
        break;
        
      case 'settings':
        this.applyAudioSetting(setting, value);
        break;
        
      case 'accessibility':
        this.applyAccessibilitySetting(setting, value);
        break;
        
      case 'interface':
        this.applyInterfaceSetting(setting, value);
        break;
        
      case 'cultural':
        this.applyCulturalSetting(setting, value);
        break;
    }
  }

  applyAudioSetting(setting, value) {
    switch (setting) {
      case 'spatialAudio':
        document.dispatchEvent(new CustomEvent('audio:spatialToggle', {
          detail: { enabled: value }
        }));
        break;
        
      case 'autoAdapt':
        document.dispatchEvent(new CustomEvent('audio:adaptiveToggle', {
          detail: { enabled: value }
        }));
        break;
        
      case 'voiceNarration':
        document.dispatchEvent(new CustomEvent('voice:toggle', {
          detail: { enabled: value }
        }));
        break;
        
      case 'visualizer':
        document.dispatchEvent(new CustomEvent('visualizer:toggle', {
          detail: { enabled: value }
        }));
        break;
    }
  }

  applyAccessibilitySettings() {
    const { accessibility } = this.preferences;
    
    // Alto contraste
    if (accessibility.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    // Movimiento reducido
    if (accessibility.reducedMotion) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
    
    // Texto grande
    if (accessibility.largeText) {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }
    
    // Modo lector de pantalla
    if (accessibility.screenReader) {
      document.body.classList.add('screen-reader');
      this.setPreference('settings.voiceNarration', true);
    }
    
    // Daltonismo
    if (accessibility.colorBlind) {
      document.body.classList.add('color-blind-friendly');
    } else {
      document.body.classList.remove('color-blind-friendly');
    }
  }

  applyAccessibilitySetting(setting, value) {
    switch (setting) {
      case 'highContrast':
        document.body.classList.toggle('high-contrast', value);
        break;
      case 'reducedMotion':
        document.body.classList.toggle('reduced-motion', value);
        break;
      case 'largeText':
        document.body.classList.toggle('large-text', value);
        break;
      case 'screenReader':
        document.body.classList.toggle('screen-reader', value);
        if (value) this.setPreference('settings.voiceNarration', true);
        break;
      case 'colorBlind':
        document.body.classList.toggle('color-blind-friendly', value);
        break;
    }
  }

  applyInterfaceSettings() {
    const { interface: ui } = this.preferences;
    
    // Tema
    document.body.setAttribute('data-theme', ui.theme);
    
    // Posición del panel
    document.body.setAttribute('data-panel-position', ui.panelPosition);
    
    // Modo compacto
    if (ui.compactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
    
    // Tooltips
    if (!ui.showTooltips) {
      document.body.classList.add('no-tooltips');
    } else {
      document.body.classList.remove('no-tooltips');
    }
  }

  applyInterfaceSetting(setting, value) {
    switch (setting) {
      case 'theme':
        document.body.setAttribute('data-theme', value);
        break;
      case 'panelPosition':
        document.body.setAttribute('data-panel-position', value);
        break;
      case 'compactMode':
        document.body.classList.toggle('compact-mode', value);
        break;
      case 'showTooltips':
        document.body.classList.toggle('no-tooltips', !value);
        break;
    }
  }

  applyCulturalSettings() {
    const { cultural } = this.preferences;
    
    document.dispatchEvent(new CustomEvent('cultural:settingsChanged', {
      detail: cultural
    }));
  }

  applyCulturalSetting(setting, value) {
    document.dispatchEvent(new CustomEvent('cultural:settingChanged', {
      detail: { setting, value }
    }));
  }

  createPreferencesPanel() {
    const panel = document.createElement('div');
    panel.className = 'preferences-panel';
    panel.innerHTML = `
      <div class="preferences-header">
        <h2>Preferencias de Audio</h2>
        <button class="preferences-close" aria-label="Cerrar preferencias">×</button>
      </div>
      <div class="preferences-content">
        ${this.createVolumeSection()}
        ${this.createAudioSection()}
        ${this.createAccessibilitySection()}
        ${this.createInterfaceSection()}
        ${this.createCulturalSection()}
      </div>
      <div class="preferences-footer">
        <button class="preferences-reset">Restaurar Defaults</button>
        <button class="preferences-export">Exportar</button>
        <button class="preferences-import">Importar</button>
      </div>
    `;
    
    this.setupPanelEventListeners(panel);
    return panel;
  }

  createVolumeSection() {
    const volumes = this.preferences.volumes;
    return `
      <div class="preferences-section">
        <h3>Volúmenes</h3>
        ${Object.entries(volumes).map(([channel, volume]) => `
          <div class="preference-item">
            <label for="volume-${channel}">${this.getChannelName(channel)}</label>
            <input type="range" id="volume-${channel}" 
                   min="0" max="1" step="0.01" value="${volume}"
                   data-preference="volumes.${channel}">
            <span class="preference-value">${Math.round(volume * 100)}%</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  createAudioSection() {
    const settings = this.preferences.settings;
    return `
      <div class="preferences-section">
        <h3>Configuración de Audio</h3>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${settings.spatialAudio ? 'checked' : ''}
                   data-preference="settings.spatialAudio">
            Audio Espacial 3D
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${settings.autoAdapt ? 'checked' : ''}
                   data-preference="settings.autoAdapt">
            Adaptación Automática
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${settings.voiceNarration ? 'checked' : ''}
                   data-preference="settings.voiceNarration">
            Narración por Voz
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${settings.visualizer ? 'checked' : ''}
                   data-preference="settings.visualizer">
            Visualizador de Audio
          </label>
        </div>
      </div>
    `;
  }

  createAccessibilitySection() {
    const accessibility = this.preferences.accessibility;
    return `
      <div class="preferences-section">
        <h3>Accesibilidad</h3>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${accessibility.highContrast ? 'checked' : ''}
                   data-preference="accessibility.highContrast">
            Alto Contraste
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${accessibility.reducedMotion ? 'checked' : ''}
                   data-preference="accessibility.reducedMotion">
            Movimiento Reducido
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${accessibility.largeText ? 'checked' : ''}
                   data-preference="accessibility.largeText">
            Texto Grande
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${accessibility.screenReader ? 'checked' : ''}
                   data-preference="accessibility.screenReader">
            Modo Lector de Pantalla
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${accessibility.colorBlind ? 'checked' : ''}
                   data-preference="accessibility.colorBlind">
            Daltonismo
          </label>
        </div>
      </div>
    `;
  }

  createInterfaceSection() {
    const ui = this.preferences.interface;
    return `
      <div class="preferences-section">
        <h3>Interfaz</h3>
        <div class="preference-item">
          <label for="theme-select">Tema</label>
          <select id="theme-select" data-preference="interface.theme">
            <option value="default" ${ui.theme === 'default' ? 'selected' : ''}>Predeterminado</option>
            <option value="dark" ${ui.theme === 'dark' ? 'selected' : ''}>Oscuro</option>
            <option value="light" ${ui.theme === 'light' ? 'selected' : ''}>Claro</option>
            <option value="auto" ${ui.theme === 'auto' ? 'selected' : ''}>Automático</option>
          </select>
        </div>
        <div class="preference-item">
          <label for="position-select">Posición del Panel</label>
          <select id="position-select" data-preference="interface.panelPosition">
            <option value="bottom-right" ${ui.panelPosition === 'bottom-right' ? 'selected' : ''}>Abajo Derecha</option>
            <option value="bottom-left" ${ui.panelPosition === 'bottom-left' ? 'selected' : ''}>Abajo Izquierda</option>
            <option value="top-right" ${ui.panelPosition === 'top-right' ? 'selected' : ''}>Arriba Derecha</option>
            <option value="top-left" ${ui.panelPosition === 'top-left' ? 'selected' : ''}>Arriba Izquierda</option>
          </select>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${ui.compactMode ? 'checked' : ''}
                   data-preference="interface.compactMode">
            Modo Compacto
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${ui.showTooltips ? 'checked' : ''}
                   data-preference="interface.showTooltips">
            Mostrar Tooltips
          </label>
        </div>
      </div>
    `;
  }

  createCulturalSection() {
    const cultural = this.preferences.cultural;
    return `
      <div class="preferences-section">
        <h3>Audio Cultural</h3>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${cultural.respectfulMode ? 'checked' : ''}
                   data-preference="cultural.respectfulMode">
            Modo Respetuoso
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${cultural.educationalNarration ? 'checked' : ''}
                   data-preference="cultural.educationalNarration">
            Narración Educativa
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${cultural.traditionalInstruments ? 'checked' : ''}
                   data-preference="cultural.traditionalInstruments">
            Instrumentos Tradicionales
          </label>
        </div>
        <div class="preference-item">
          <label>
            <input type="checkbox" ${cultural.ceremonies ? 'checked' : ''}
                   data-preference="cultural.ceremonies">
            Ceremonias Culturales
          </label>
        </div>
      </div>
    `;
  }

  setupPanelEventListeners(panel) {
    // Cambios en inputs
    panel.addEventListener('input', (e) => {
      const preferenceKey = e.target.dataset.preference;
      if (!preferenceKey) return;
      
      let value;
      if (e.target.type === 'checkbox') {
        value = e.target.checked;
      } else if (e.target.type === 'range') {
        value = parseFloat(e.target.value);
        // Actualizar display de valor
        const valueDisplay = e.target.nextElementSibling;
        if (valueDisplay) {
          valueDisplay.textContent = Math.round(value * 100) + '%';
        }
      } else {
        value = e.target.value;
      }
      
      this.setPreference(preferenceKey, value);
    });
    
    // Botones de acción
    panel.querySelector('.preferences-reset')?.addEventListener('click', () => {
      this.resetToDefaults();
    });
    
    panel.querySelector('.preferences-export')?.addEventListener('click', () => {
      this.exportPreferences();
    });
    
    panel.querySelector('.preferences-import')?.addEventListener('click', () => {
      this.importPreferences();
    });
    
    panel.querySelector('.preferences-close')?.addEventListener('click', () => {
      panel.remove();
    });
  }

  getChannelName(channel) {
    const names = {
      master: 'General',
      music: 'Música',
      sfx: 'Efectos',
      voice: 'Voz',
      ambient: 'Ambiente',
      cultural: 'Cultural'
    };
    return names[channel] || channel;
  }

  setupEventListeners() {
    // Escuchar cambios de volumen del audio manager
    this.audioManager.events?.addEventListener('volumeChanged', (e) => {
      this.setPreference(`volumes.${e.detail.channel}`, e.detail.volume);
    });
    
    // Escuchar cambios de configuración
    document.addEventListener('audio:settingChanged', (e) => {
      const { setting, value } = e.detail;
      this.setPreference(`settings.${setting}`, value);
    });
    
    // Beforeunload para guardar cambios pendientes
    window.addEventListener('beforeunload', () => {
      this.savePreferences();
    });
  }

  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setTimeout(() => {
      this.savePreferences();
    }, 1000); // Guardar después de 1 segundo de inactividad
  }

  startAutoSave() {
    // Guardar automáticamente cada 30 segundos
    setInterval(() => {
      if (this.changeQueue.size > 0) {
        this.savePreferences();
      }
    }, this.syncInterval);
  }

  savePreferences() {
    try {
      const serialized = JSON.stringify(this.preferences, null, 2);
      localStorage.setItem(this.storageKey, serialized);
      
      this.lastSave = Date.now();
      this.changeQueue.clear();
      
      document.dispatchEvent(new CustomEvent('preferences:saved', {
        detail: { timestamp: this.lastSave }
      }));
      
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  async resetToDefaults() {
    const confirmed = confirm('¿Está seguro de que desea restaurar todas las preferencias a los valores predeterminados?');
    if (!confirmed) return;
    
    // Reinicializar preferencias
    this.preferences = {
      volumes: { master: 0.8, music: 0.7, sfx: 0.8, voice: 0.9, ambient: 0.6, cultural: 0.7 },
      settings: { spatialAudio: true, culturalMode: false, autoAdapt: true, voiceNarration: true, visualizer: true, keyboardShortcuts: true },
      accessibility: { highContrast: false, reducedMotion: false, largeText: false, screenReader: false, colorBlind: false },
      interface: { theme: 'default', panelPosition: 'bottom-right', autoHide: true, compactMode: false, showTooltips: true },
      audio: { preset: 'default', sampleRate: 44100, bufferSize: 256, compression: true, normalization: true },
      cultural: { respectfulMode: true, educationalNarration: true, traditionalInstruments: true, ceremonies: true }
    };
    
    await this.applyPreferences();
    this.savePreferences();
    
    document.dispatchEvent(new CustomEvent('preferences:reset'));
  }

  exportPreferences() {
    const data = {
      version: '1.0',
      timestamp: Date.now(),
      preferences: this.preferences
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audio-preferences.json';
    a.click();
    
    URL.revokeObjectURL(url);
  }

  importPreferences() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.preferences) {
          this.mergePreferences(data.preferences);
          await this.applyPreferences();
          this.savePreferences();
          
          alert('Preferencias importadas exitosamente');
          document.dispatchEvent(new CustomEvent('preferences:imported'));
        }
      } catch (error) {
        console.error('Error importing preferences:', error);
        alert('Error al importar preferencias');
      }
    });
    
    input.click();
  }

  getPreferencesSnapshot() {
    return JSON.parse(JSON.stringify(this.preferences));
  }

  dispose() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    this.savePreferences();
    this.changeQueue.clear();
    this.isInitialized = false;
  }
}

export default UserPreferences;