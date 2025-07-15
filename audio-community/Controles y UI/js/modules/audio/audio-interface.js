/**
 * Audio Interface - Interfaz de usuario para controles de audio
 * Gestiona la UI del sistema de audio y la interacción del usuario
 */

class AudioInterface {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.isVisible = false;
    this.isMinimized = false;
    this.elements = {};
    this.sliders = new Map();
    this.visualizer = null;
    this.currentPreset = 'default';
    this.touchSupport = 'ontouchstart' in window;
    this.keyboardShortcuts = new Map();
    this.gestureRecognizer = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.createInterface();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupGestureRecognition();
    this.setupAccessibility();
    this.loadUserPreferences();
    
    this.isInitialized = true;
    console.log('Audio Interface initialized');
  }

  createInterface() {
    // Crear toggle button
    this.createToggleButton();
    
    // Crear panel principal
    this.createMainPanel();
    
    // Crear controles
    this.createVolumeControls();
    this.createChannelControls();
    this.createPresetControls();
    this.createSpecialControls();
    this.createVisualizer();
    
    // Aplicar estilos iniciales
    this.applyInitialStyles();
  }

  createToggleButton() {
    const toggleButton = document.createElement('button');
    toggleButton.className = 'audio-toggle-button';
    toggleButton.innerHTML = '🎵';
    toggleButton.setAttribute('aria-label', 'Abrir controles de audio');
    toggleButton.setAttribute('title', 'Controles de Audio (A)');
    
    toggleButton.addEventListener('click', () => this.toggle());
    
    document.body.appendChild(toggleButton);
    this.elements.toggleButton = toggleButton;
  }

  createMainPanel() {
    const panel = document.createElement('div');
    panel.className = 'audio-control-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Panel de controles de audio');
    
    // Header
    const header = document.createElement('div');
    header.className = 'audio-panel-header';
    
    const title = document.createElement('h2');
    title.className = 'audio-panel-title';
    title.textContent = 'Audio';
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'audio-panel-toggle';
    minimizeBtn.innerHTML = '−';
    minimizeBtn.setAttribute('aria-label', 'Minimizar panel');
    minimizeBtn.addEventListener('click', () => this.minimize());
    
    header.appendChild(title);
    header.appendChild(minimizeBtn);
    
    // Content
    const content = document.createElement('div');
    content.className = 'audio-panel-content';
    
    panel.appendChild(header);
    panel.appendChild(content);
    
    document.body.appendChild(panel);
    this.elements.panel = panel;
    this.elements.content = content;
  }

  createVolumeControls() {
    const section = this.createSection('Volumen Principal');
    
    // Master volume
    const masterContainer = document.createElement('div');
    masterContainer.className = 'master-volume-control';
    
    const masterSlider = this.createVolumeSlider('master', 'Volumen General', 0.8, {
      className: 'master-volume-slider',
      min: 0,
      max: 1,
      step: 0.01
    });
    
    masterContainer.appendChild(masterSlider);
    section.appendChild(masterContainer);
    
    this.elements.content.appendChild(section);
  }

  createChannelControls() {
    const section = this.createSection('Canales de Audio');
    
    const channels = [
      { id: 'music', name: 'Música', icon: '🎵', volume: 0.7 },
      { id: 'sfx', name: 'Efectos', icon: '🔊', volume: 0.8 },
      { id: 'voice', name: 'Voz', icon: '🗣️', volume: 0.9 },
      { id: 'ambient', name: 'Ambiente', icon: '🌿', volume: 0.6 },
      { id: 'cultural', name: 'Cultural', icon: '🏛️', volume: 0.7 }
    ];
    
    channels.forEach(channel => {
      const channelControl = this.createChannelControl(channel);
      section.appendChild(channelControl);
    });
    
    this.elements.content.appendChild(section);
  }

  createChannelControl(channel) {
    const container = document.createElement('div');
    container.className = 'channel-control';
    container.setAttribute('data-channel', channel.id);
    
    // Channel info
    const info = document.createElement('div');
    info.className = 'channel-info';
    
    const name = document.createElement('div');
    name.className = 'channel-name';
    name.textContent = `${channel.icon} ${channel.name}`;
    
    const status = document.createElement('div');
    status.className = 'channel-status';
    status.textContent = 'Activo';
    
    info.appendChild(name);
    info.appendChild(status);
    
    // Volume slider
    const slider = this.createVolumeSlider(channel.id, channel.name, channel.volume, {
      compact: true
    });
    
    // Channel actions
    const actions = document.createElement('div');
    actions.className = 'channel-actions';
    
    const muteBtn = this.createChannelButton('mute', '🔇', `Silenciar ${channel.name}`);
    const soloBtn = this.createChannelButton('solo', 'S', `Solo ${channel.name}`);
    
    muteBtn.addEventListener('click', () => this.toggleMute(channel.id));
    soloBtn.addEventListener('click', () => this.toggleSolo(channel.id));
    
    actions.appendChild(muteBtn);
    actions.appendChild(soloBtn);
    
    container.appendChild(info);
    container.appendChild(slider);
    container.appendChild(actions);
    
    return container;
  }

  createVolumeSlider(id, label, initialValue, options = {}) {
    const container = document.createElement('div');
    container.className = `volume-slider-container ${options.className || ''}`;
    
    if (options.compact) {
      container.classList.add('volume-slider-compact');
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'volume-slider-wrapper';
    
    if (!options.compact) {
      const labelEl = document.createElement('label');
      labelEl.className = 'volume-slider-label';
      labelEl.textContent = label;
      labelEl.setAttribute('for', `volume-${id}`);
      wrapper.appendChild(labelEl);
    }
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `volume-${id}`;
    slider.className = 'volume-slider';
    slider.min = options.min || 0;
    slider.max = options.max || 1;
    slider.step = options.step || 0.01;
    slider.value = initialValue;
    slider.setAttribute('aria-label', `${label} - ${Math.round(initialValue * 100)}%`);
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'volume-slider-value';
    valueDisplay.textContent = Math.round(initialValue * 100) + '%';
    
    // Progress fill
    this.updateSliderProgress(slider, initialValue);
    
    // Event listeners
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.updateVolume(id, value);
      valueDisplay.textContent = Math.round(value * 100) + '%';
      this.updateSliderProgress(slider, value);
      container.classList.add('changing');
      
      setTimeout(() => container.classList.remove('changing'), 300);
    });
    
    slider.addEventListener('change', () => {
      this.saveUserPreferences();
    });
    
    wrapper.appendChild(slider);
    wrapper.appendChild(valueDisplay);
    container.appendChild(wrapper);
    
    // Store reference
    this.sliders.set(id, { slider, valueDisplay, container });
    
    return container;
  }

  updateSliderProgress(slider, value) {
    const percentage = (value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.setProperty('--fill-width', percentage + '%');
    
    // Update CSS custom property for fill
    slider.style.background = `linear-gradient(to right, 
      var(--slider-fill-color) 0%, 
      var(--slider-fill-color) ${percentage}%, 
      var(--slider-track-color) ${percentage}%, 
      var(--slider-track-color) 100%)`;
  }

  createChannelButton(type, text, ariaLabel) {
    const button = document.createElement('button');
    button.className = `channel-button ${type}-button`;
    button.textContent = text;
    button.setAttribute('aria-label', ariaLabel);
    button.setAttribute('title', ariaLabel);
    
    return button;
  }

  createPresetControls() {
    const section = this.createSection('Presets de Audio');
    
    const presets = [
      { id: 'default', name: 'Predeterminado' },
      { id: 'immersive', name: 'Inmersivo' },
      { id: 'focused', name: 'Enfocado' },
      { id: 'cinematic', name: 'Cinematico' }
    ];
    
    const presetsContainer = document.createElement('div');
    presetsContainer.className = 'audio-presets';
    
    presets.forEach(preset => {
      const button = document.createElement('button');
      button.className = 'preset-button';
      button.textContent = preset.name;
      button.setAttribute('data-preset', preset.id);
      button.addEventListener('click', () => this.loadPreset(preset.id));
      
      if (preset.id === this.currentPreset) {
        button.classList.add('active');
      }
      
      presetsContainer.appendChild(button);
    });
    
    section.appendChild(presetsContainer);
    this.elements.content.appendChild(section);
  }

  createSpecialControls() {
    const section = this.createSection('Controles Especiales');
    
    const controls = document.createElement('div');
    controls.className = 'special-controls';
    
    const spatialBtn = document.createElement('button');
    spatialBtn.className = 'special-button spatial';
    spatialBtn.innerHTML = '🌐 Audio Espacial';
    spatialBtn.addEventListener('click', () => this.toggleSpatialAudio());
    
    const culturalBtn = document.createElement('button');
    culturalBtn.className = 'special-button cultural';
    culturalBtn.innerHTML = '🏛️ Audio Cultural';
    culturalBtn.addEventListener('click', () => this.toggleCulturalMode());
    
    controls.appendChild(spatialBtn);
    controls.appendChild(culturalBtn);
    
    section.appendChild(controls);
    this.elements.content.appendChild(section);
  }

  createVisualizer() {
    const section = this.createSection('Visualizador');
    
    const visualizer = document.createElement('div');
    visualizer.className = 'audio-visualizer';
    
    const bars = document.createElement('div');
    bars.className = 'visualizer-bars';
    
    // Create 24 bars for frequency visualization
    for (let i = 0; i < 24; i++) {
      const bar = document.createElement('div');
      bar.className = 'visualizer-bar';
      bar.style.height = '2px';
      bars.appendChild(bar);
    }
    
    const controls = document.createElement('div');
    controls.className = 'visualizer-controls';
    
    const themeBtn = document.createElement('button');
    themeBtn.className = 'visualizer-control-button';
    themeBtn.innerHTML = '🎨';
    themeBtn.title = 'Cambiar tema';
    themeBtn.addEventListener('click', () => this.cycleVisualizerTheme());
    
    controls.appendChild(themeBtn);
    
    visualizer.appendChild(bars);
    visualizer.appendChild(controls);
    
    section.appendChild(visualizer);
    this.elements.content.appendChild(section);
    this.elements.visualizer = visualizer;
    this.elements.visualizerBars = bars.children;
  }

  createSection(title) {
    const section = document.createElement('div');
    section.className = 'audio-control-section';
    
    const titleEl = document.createElement('h3');
    titleEl.className = 'audio-section-title';
    titleEl.textContent = title;
    
    section.appendChild(titleEl);
    return section;
  }

  setupEventListeners() {
    // Audio manager events
    this.audioManager.events.addEventListener('volumeChanged', (e) => {
      this.updateSliderDisplay(e.detail.channel, e.detail.volume);
    });
    
    this.audioManager.events.addEventListener('channelMuted', (e) => {
      this.updateChannelMuteState(e.detail.channel, e.detail.muted);
    });
    
    // Window events
    window.addEventListener('resize', () => this.handleResize());
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.elements.panel.contains(e.target) && 
          !this.elements.toggleButton.contains(e.target)) {
        this.hide();
      }
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  setupKeyboardShortcuts() {
    this.keyboardShortcuts.set('KeyA', () => this.toggle());
    this.keyboardShortcuts.set('KeyM', () => this.toggleMute('master'));
    this.keyboardShortcuts.set('Space', () => this.togglePlayPause());
    this.keyboardShortcuts.set('ArrowUp', () => this.adjustMasterVolume(0.1));
    this.keyboardShortcuts.set('ArrowDown', () => this.adjustMasterVolume(-0.1));
    
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        const action = this.keyboardShortcuts.get(e.code);
        if (action) {
          e.preventDefault();
          action();
        }
      }
    });
  }

  setupGestureRecognition() {
    if (!this.touchSupport) return;
    
    let startY = 0;
    let currentVolume = 0;
    
    this.elements.panel.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        startY = e.touches[0].clientY;
        currentVolume = this.audioManager.settings.masterVolume;
      }
    });
    
    this.elements.panel.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const deltaY = startY - e.touches[0].clientY;
        const volumeChange = deltaY / 100;
        const newVolume = Math.max(0, Math.min(1, currentVolume + volumeChange));
        this.updateVolume('master', newVolume);
      }
    });
  }

  setupAccessibility() {
    // ARIA live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    
    document.body.appendChild(liveRegion);
    this.elements.liveRegion = liveRegion;
    
    // Enhanced keyboard navigation
    this.setupFocusManagement();
  }

  setupFocusManagement() {
    const focusableElements = 'button, input[type="range"], [tabindex]:not([tabindex="-1"])';
    
    this.elements.panel.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusable = this.elements.panel.querySelectorAll(focusableElements);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.elements.panel.classList.add('active');
    this.elements.toggleButton.classList.add('panel-open');
    this.isVisible = true;
    
    // Focus first focusable element
    const firstFocusable = this.elements.panel.querySelector('button, input');
    if (firstFocusable) {
      firstFocusable.focus();
    }
    
    this.announce('Panel de audio abierto');
  }

  hide() {
    this.elements.panel.classList.remove('active');
    this.elements.toggleButton.classList.remove('panel-open');
    this.isVisible = false;
    
    this.announce('Panel de audio cerrado');
  }

  minimize() {
    this.elements.panel.classList.toggle('minimized');
    this.isMinimized = !this.isMinimized;
    
    const announcement = this.isMinimized ? 'Panel minimizado' : 'Panel expandido';
    this.announce(announcement);
  }

  updateVolume(channelId, volume) {
    this.audioManager.setVolume(channelId, volume);
    
    // Update slider if it exists
    const sliderData = this.sliders.get(channelId);
    if (sliderData && sliderData.slider.value !== volume) {
      sliderData.slider.value = volume;
      sliderData.valueDisplay.textContent = Math.round(volume * 100) + '%';
      this.updateSliderProgress(sliderData.slider, volume);
    }
    
    this.announce(`${channelId} volumen ${Math.round(volume * 100)}%`);
  }

  updateSliderDisplay(channel, volume) {
    const sliderData = this.sliders.get(channel);
    if (sliderData) {
      sliderData.slider.value = volume;
      sliderData.valueDisplay.textContent = Math.round(volume * 100) + '%';
      this.updateSliderProgress(sliderData.slider, volume);
    }
  }

  toggleMute(channelId) {
    const channelEl = this.elements.panel.querySelector(`[data-channel="${channelId}"]`);
    const muteBtn = channelEl?.querySelector('.mute-button');
    
    if (muteBtn) {
      const isMuted = muteBtn.classList.contains('active');
      this.audioManager.mute(channelId, !isMuted);
    }
  }

  updateChannelMuteState(channel, muted) {
    const channelEl = this.elements.panel.querySelector(`[data-channel="${channel}"]`);
    const muteBtn = channelEl?.querySelector('.mute-button');
    const container = this.sliders.get(channel)?.container;
    
    if (muteBtn) {
      muteBtn.classList.toggle('active', muted);
      muteBtn.innerHTML = muted ? '🔇' : '🔊';
    }
    
    if (container) {
      container.classList.toggle('muted', muted);
    }
    
    this.announce(`${channel} ${muted ? 'silenciado' : 'reactivado'}`);
  }

  toggleSolo(channelId) {
    const channelEl = this.elements.panel.querySelector(`[data-channel="${channelId}"]`);
    const soloBtn = channelEl?.querySelector('.solo-button');
    
    if (soloBtn) {
      const isSolo = soloBtn.classList.contains('active');
      // Implement solo logic
      soloBtn.classList.toggle('active', !isSolo);
      this.announce(`${channelId} modo solo ${!isSolo ? 'activado' : 'desactivado'}`);
    }
  }

  loadPreset(presetId) {
    // Remove active class from all preset buttons
    this.elements.panel.querySelectorAll('.preset-button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to selected preset
    const selectedBtn = this.elements.panel.querySelector(`[data-preset="${presetId}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('active');
    }
    
    this.currentPreset = presetId;
    this.announce(`Preset ${presetId} aplicado`);
    this.saveUserPreferences();
  }

  toggleSpatialAudio() {
    const btn = this.elements.panel.querySelector('.special-button.spatial');
    const isActive = btn.classList.contains('active');
    
    btn.classList.toggle('active', !isActive);
    this.announce(`Audio espacial ${!isActive ? 'activado' : 'desactivado'}`);
  }

  toggleCulturalMode() {
    const btn = this.elements.panel.querySelector('.special-button.cultural');
    const isActive = btn.classList.contains('active');
    
    btn.classList.toggle('active', !isActive);
    this.announce(`Modo cultural ${!isActive ? 'activado' : 'desactivado'}`);
  }

  cycleVisualizerTheme() {
    const themes = ['default', 'neon', 'nature', 'fire', 'ocean'];
    const currentTheme = this.elements.visualizer.className.match(/visualizer-theme-(\w+)/);
    const currentIndex = currentTheme ? themes.indexOf(currentTheme[1]) : 0;
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    // Remove all theme classes
    themes.forEach(theme => {
      this.elements.visualizer.classList.remove(`visualizer-theme-${theme}`);
    });
    
    // Add new theme
    if (nextTheme !== 'default') {
      this.elements.visualizer.classList.add(`visualizer-theme-${nextTheme}`);
    }
    
    this.announce(`Tema del visualizador: ${nextTheme}`);
  }

  adjustMasterVolume(delta) {
    const currentVolume = this.audioManager.settings.masterVolume;
    const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
    this.updateVolume('master', newVolume);
  }

  handleResize() {
    // Adjust interface for mobile
    if (window.innerWidth < 768) {
      this.elements.panel.classList.add('mobile');
    } else {
      this.elements.panel.classList.remove('mobile');
    }
  }

  announce(message) {
    if (this.elements.liveRegion) {
      this.elements.liveRegion.textContent = message;
    }
  }

  applyInitialStyles() {
    // Set initial state
    this.elements.panel.style.transform = 'translateX(calc(100% + 20px))';
  }

  saveUserPreferences() {
    const preferences = {
      volumes: {},
      preset: this.currentPreset,
      spatialAudio: this.elements.panel.querySelector('.spatial')?.classList.contains('active'),
      culturalMode: this.elements.panel.querySelector('.cultural')?.classList.contains('active')
    };
    
    this.sliders.forEach((data, channelId) => {
      preferences.volumes[channelId] = parseFloat(data.slider.value);
    });
    
    localStorage.setItem('audioInterfacePreferences', JSON.stringify(preferences));
  }

  loadUserPreferences() {
    try {
      const saved = localStorage.getItem('audioInterfacePreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        
        // Apply volumes
        Object.entries(preferences.volumes || {}).forEach(([channel, volume]) => {
          this.updateVolume(channel, volume);
        });
        
        // Apply preset
        if (preferences.preset) {
          this.loadPreset(preferences.preset);
        }
        
        // Apply special settings
        if (preferences.spatialAudio) {
          this.toggleSpatialAudio();
        }
        if (preferences.culturalMode) {
          this.toggleCulturalMode();
        }
      }
    } catch (error) {
      console.warn('Failed to load audio preferences:', error);
    }
  }

  updateVisualizer(frequencyData) {
    if (!this.elements.visualizerBars || !frequencyData) return;
    
    for (let i = 0; i < this.elements.visualizerBars.length && i < frequencyData.length; i++) {
      const bar = this.elements.visualizerBars[i];
      const height = (frequencyData[i] / 255) * 60; // Scale to max 60px
      bar.style.height = Math.max(2, height) + 'px';
      
      // Add active class for animation
      if (height > 10) {
        bar.classList.add('active');
      } else {
        bar.classList.remove('active');
      }
    }
    
    // Update visualizer state
    const hasActivity = frequencyData.some(value => value > 20);
    this.elements.visualizer.classList.toggle('active', hasActivity);
  }

  dispose() {
    // Clean up event listeners
    this.sliders.clear();
    this.keyboardShortcuts.clear();
    
    // Remove elements
    Object.values(this.elements).forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    this.elements = {};
    this.isInitialized = false;
  }
}

export default AudioInterface;