/**
 * Audio Accessibility - Módulo de accesibilidad para audio
 * Funciones de accesibilidad para usuarios con discapacidades
 */

class AudioAccessibility {
  constructor(audioManager, voiceNarrator) {
    this.audioManager = audioManager;
    this.voiceNarrator = voiceNarrator;
    this.isEnabled = true;
    this.features = {
      visualIndicators: true,
      hapticFeedback: false,
      audioDescriptions: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      colorBlindSupport: false,
      hearingAssistance: false
    };
    this.announcements = new Map();
    this.lastAnnouncement = 0;
    this.announcementCooldown = 2000; // 2 segundos
    this.gestureRecognizer = null;
    this.screenReaderDetected = false;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.detectAccessibilityNeeds();
    this.setupScreenReaderSupport();
    this.setupVisualIndicators();
    this.setupKeyboardNavigation();
    this.setupHapticFeedback();
    this.setupAudioDescriptions();
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('Audio Accessibility initialized');
  }

  detectAccessibilityNeeds() {
    // Detectar lector de pantalla
    this.screenReaderDetected = this.detectScreenReader();
    
    // Detectar preferencias del sistema
    if (window.matchMedia) {
      // Movimiento reducido
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reducedMotion.matches) {
        this.features.visualIndicators = false;
        document.body.classList.add('reduced-motion');
      }
      
      // Alto contraste
      const highContrast = window.matchMedia('(prefers-contrast: high)');
      if (highContrast.matches) {
        this.features.colorBlindSupport = true;
        document.body.classList.add('high-contrast');
      }
    }
    
    // Detectar soporte de vibración para feedback háptico
    if ('vibrate' in navigator) {
      this.features.hapticFeedback = true;
    }
    
    // Detectar capacidades de audio
    this.detectHearingCapabilities();
  }

  detectScreenReader() {
    // Detectar lectores de pantalla comunes
    const userAgent = navigator.userAgent.toLowerCase();
    const screenReaders = ['nvda', 'jaws', 'voiceover', 'talkback', 'orca'];
    
    const detected = screenReaders.some(reader => userAgent.includes(reader));
    
    if (detected) {
      this.features.screenReaderSupport = true;
      this.features.audioDescriptions = true;
      document.body.classList.add('screen-reader-detected');
    }
    
    return detected;
  }

  detectHearingCapabilities() {
    // Simular detección de capacidades auditivas
    // En una implementación real, esto podría basarse en configuraciones del usuario
    if (this.features.hearingAssistance) {
      this.setupHearingAssistance();
    }
  }

  setupScreenReaderSupport() {
    // Crear región de anuncios ARIA live
    const liveRegion = document.createElement('div');
    liveRegion.id = 'audio-announcements';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(liveRegion);
    this.liveRegion = liveRegion;
    
    // Crear región para estados urgentes
    const assertiveRegion = document.createElement('div');
    assertiveRegion.id = 'audio-alerts';
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.style.position = 'absolute';
    assertiveRegion.style.left = '-10000px';
    assertiveRegion.style.width = '1px';
    assertiveRegion.style.height = '1px';
    assertiveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(assertiveRegion);
    this.assertiveRegion = assertiveRegion;
  }

  setupVisualIndicators() {
    if (!this.features.visualIndicators) return;
    
    // Crear indicadores visuales para audio
    this.createVolumeIndicator();
    this.createChannelIndicators();
    this.createFrequencyIndicator();
  }

  createVolumeIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'volume-visual-indicator';
    indicator.innerHTML = `
      <div class="volume-level-bars">
        ${Array.from({length: 10}, (_, i) => 
          `<div class="volume-bar" data-level="${i + 1}"></div>`
        ).join('')}
      </div>
      <div class="volume-percentage">0%</div>
    `;
    
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    
    document.body.appendChild(indicator);
    this.volumeIndicator = indicator;
  }

  createChannelIndicators() {
    const container = document.createElement('div');
    container.className = 'channel-visual-indicators';
    container.style.cssText = `
      position: fixed;
      top: 100px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    
    const channels = ['music', 'sfx', 'voice', 'ambient', 'cultural'];
    channels.forEach(channel => {
      const indicator = document.createElement('div');
      indicator.className = `channel-indicator channel-${channel}`;
      indicator.innerHTML = `
        <span class="channel-name">${this.getChannelName(channel)}</span>
        <div class="channel-activity">
          <div class="activity-bar"></div>
        </div>
      `;
      container.appendChild(indicator);
    });
    
    document.body.appendChild(container);
    this.channelIndicators = container;
  }

  createFrequencyIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'frequency-visual-indicator';
    indicator.innerHTML = `
      <div class="frequency-display">
        <div class="freq-low">Graves</div>
        <div class="freq-mid">Medios</div>
        <div class="freq-high">Agudos</div>
      </div>
    `;
    
    indicator.style.cssText = `
      position: fixed;
      top: 250px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    
    document.body.appendChild(indicator);
    this.frequencyIndicator = indicator;
  }

  setupKeyboardNavigation() {
    if (!this.features.keyboardNavigation) return;
    
    // Mapeo de teclas para navegación
    this.keyMap = new Map([
      ['Space', () => this.togglePlayPause()],
      ['KeyM', () => this.toggleMasterMute()],
      ['ArrowUp', () => this.adjustMasterVolume(0.1)],
      ['ArrowDown', () => this.adjustMasterVolume(-0.1)],
      ['ArrowLeft', () => this.previousChannel()],
      ['ArrowRight', () => this.nextChannel()],
      ['Digit1', () => this.selectChannel('music')],
      ['Digit2', () => this.selectChannel('sfx')],
      ['Digit3', () => this.selectChannel('voice')],
      ['Digit4', () => this.selectChannel('ambient')],
      ['Digit5', () => this.selectChannel('cultural')],
      ['KeyA', () => this.announceCurrentState()],
      ['KeyH', () => this.showKeyboardHelp()],
      ['Escape', () => this.closeActivePanel()]
    ]);
    
    document.addEventListener('keydown', (e) => {
      // Solo procesar si no hay inputs enfocados
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      
      const action = this.keyMap.get(e.code);
      if (action && (e.ctrlKey || e.altKey)) {
        e.preventDefault();
        action();
        this.announceKeyboardAction(e.code);
      }
    });
    
    // Mostrar ayuda de teclado al inicio si es necesario
    if (this.screenReaderDetected) {
      setTimeout(() => {
        this.announceKeyboardHelp();
      }, 2000);
    }
  }

  setupHapticFeedback() {
    if (!this.features.hapticFeedback) return;
    
    this.hapticPatterns = {
      volumeChange: [50],
      muteToggle: [100, 50, 100],
      channelSwitch: [80],
      error: [200, 100, 200, 100, 200],
      success: [50, 50, 100],
      notification: [30, 30, 30]
    };
  }

  setupAudioDescriptions() {
    if (!this.features.audioDescriptions) return;
    
    // Descripciones contextuales para elementos de audio
    this.audioDescriptions = {
      volumeChange: (channel, level) => 
        `Volumen de ${this.getChannelName(channel)} ajustado a ${Math.round(level * 100)} por ciento`,
      channelMute: (channel, muted) => 
        `${this.getChannelName(channel)} ${muted ? 'silenciado' : 'reactivado'}`,
      channelSolo: (channel, solo) => 
        `${this.getChannelName(channel)} en modo ${solo ? 'solo activado' : 'solo desactivado'}`,
      spatialAudio: (enabled) => 
        `Audio espacial ${enabled ? 'activado' : 'desactivado'}`,
      audioState: () => this.getCurrentAudioStateDescription()
    };
  }

  setupHearingAssistance() {
    // Subtítulos para contenido de audio
    this.createSubtitleDisplay();
    
    // Indicadores visuales para sonidos
    this.createSoundIndicators();
    
    // Amplificación de frecuencias específicas
    this.setupFrequencyAmplification();
  }

  createSubtitleDisplay() {
    const subtitleContainer = document.createElement('div');
    subtitleContainer.className = 'audio-subtitles';
    subtitleContainer.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      z-index: 10000;
      max-width: 80%;
      text-align: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    
    document.body.appendChild(subtitleContainer);
    this.subtitleDisplay = subtitleContainer;
  }

  createSoundIndicators() {
    const container = document.createElement('div');
    container.className = 'sound-visual-indicators';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 10000;
    `;
    
    const soundTypes = ['music', 'voice', 'effects', 'ambient'];
    soundTypes.forEach(type => {
      const indicator = document.createElement('div');
      indicator.className = `sound-indicator sound-${type}`;
      indicator.innerHTML = `
        <div class="indicator-icon">${this.getSoundIcon(type)}</div>
        <div class="indicator-pulse"></div>
      `;
      indicator.style.cssText = `
        width: 50px;
        height: 50px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      container.appendChild(indicator);
    });
    
    document.body.appendChild(container);
    this.soundIndicators = container;
  }

  setupFrequencyAmplification() {
    // Crear filtros para amplificar frecuencias específicas
    if (this.audioManager.audioContext) {
      this.hearingAssistanceFilters = {
        lowFreq: this.audioManager.audioContext.createBiquadFilter(),
        midFreq: this.audioManager.audioContext.createBiquadFilter(),
        highFreq: this.audioManager.audioContext.createBiquadFilter()
      };
      
      // Configurar filtros
      this.hearingAssistanceFilters.lowFreq.type = 'lowshelf';
      this.hearingAssistanceFilters.lowFreq.frequency.setValueAtTime(500, this.audioManager.audioContext.currentTime);
      this.hearingAssistanceFilters.lowFreq.gain.setValueAtTime(3, this.audioManager.audioContext.currentTime);
      
      this.hearingAssistanceFilters.midFreq.type = 'peaking';
      this.hearingAssistanceFilters.midFreq.frequency.setValueAtTime(2000, this.audioManager.audioContext.currentTime);
      this.hearingAssistanceFilters.midFreq.Q.setValueAtTime(1, this.audioManager.audioContext.currentTime);
      this.hearingAssistanceFilters.midFreq.gain.setValueAtTime(5, this.audioManager.audioContext.currentTime);
      
      this.hearingAssistanceFilters.highFreq.type = 'highshelf';
      this.hearingAssistanceFilters.highFreq.frequency.setValueAtTime(4000, this.audioManager.audioContext.currentTime);
      this.hearingAssistanceFilters.highFreq.gain.setValueAtTime(4, this.audioManager.audioContext.currentTime);
    }
  }

  announce(message, priority = 'polite') {
    const now = Date.now();
    
    // Verificar cooldown para evitar spam de anuncios
    if (now - this.lastAnnouncement < this.announcementCooldown) {
      return;
    }
    
    this.lastAnnouncement = now;
    
    // Anuncio por voz si está habilitado
    if (this.voiceNarrator && this.features.audioDescriptions) {
      this.voiceNarrator.narrate(message, {
        priority: priority === 'assertive' ? 'high' : 'normal',
        context: 'accessibility'
      });
    }
    
    // Anuncio para lectores de pantalla
    if (this.features.screenReaderSupport) {
      const region = priority === 'assertive' ? this.assertiveRegion : this.liveRegion;
      if (region) {
        region.textContent = message;
      }
    }
    
    // Subtítulos visuales si están habilitados
    if (this.features.hearingAssistance && this.subtitleDisplay) {
      this.showSubtitle(message);
    }
    
    // Feedback háptico si está disponible
    if (this.features.hapticFeedback) {
      this.triggerHapticFeedback('notification');
    }
  }

  showSubtitle(text, duration = 3000) {
    if (!this.subtitleDisplay) return;
    
    this.subtitleDisplay.textContent = text;
    this.subtitleDisplay.style.opacity = '1';
    
    clearTimeout(this.subtitleTimeout);
    this.subtitleTimeout = setTimeout(() => {
      this.subtitleDisplay.style.opacity = '0';
    }, duration);
  }

  updateVolumeIndicator(channel, level) {
    if (!this.features.visualIndicators || !this.volumeIndicator) return;
    
    const percentage = Math.round(level * 100);
    const bars = this.volumeIndicator.querySelectorAll('.volume-bar');
    const percentageDisplay = this.volumeIndicator.querySelector('.volume-percentage');
    
    // Actualizar barras
    bars.forEach((bar, index) => {
      const threshold = ((index + 1) / bars.length) * 100;
      bar.classList.toggle('active', percentage >= threshold);
    });
    
    // Actualizar porcentaje
    percentageDisplay.textContent = `${percentage}%`;
    
    // Mostrar indicador temporalmente
    this.volumeIndicator.style.opacity = '1';
    clearTimeout(this.volumeIndicatorTimeout);
    this.volumeIndicatorTimeout = setTimeout(() => {
      this.volumeIndicator.style.opacity = '0';
    }, 2000);
  }

  updateChannelIndicator(channel, activity) {
    if (!this.features.visualIndicators || !this.channelIndicators) return;
    
    const indicator = this.channelIndicators.querySelector(`.channel-${channel}`);
    if (indicator) {
      const activityBar = indicator.querySelector('.activity-bar');
      activityBar.style.width = `${activity * 100}%`;
      
      // Mostrar indicadores temporalmente
      this.channelIndicators.style.opacity = '1';
      clearTimeout(this.channelIndicatorTimeout);
      this.channelIndicatorTimeout = setTimeout(() => {
        this.channelIndicators.style.opacity = '0';
      }, 3000);
    }
  }

  triggerHapticFeedback(pattern) {
    if (!this.features.hapticFeedback || !navigator.vibrate) return;
    
    const vibrationPattern = this.hapticPatterns[pattern];
    if (vibrationPattern) {
      navigator.vibrate(vibrationPattern);
    }
  }

  announceKeyboardAction(keyCode) {
    const actionDescriptions = {
      'Space': 'Reproducir o pausar',
      'KeyM': 'Silenciar volumen general',
      'ArrowUp': 'Subir volumen',
      'ArrowDown': 'Bajar volumen',
      'KeyA': 'Anunciar estado actual',
      'KeyH': 'Mostrar ayuda de teclado'
    };
    
    const description = actionDescriptions[keyCode];
    if (description) {
      this.announce(description, 'assertive');
    }
  }

  announceKeyboardHelp() {
    const helpText = `Atajos de teclado disponibles: 
      Ctrl + Espacio para reproducir o pausar,
      Ctrl + M para silenciar,
      Ctrl + flechas arriba y abajo para volumen,
      Ctrl + A para estado actual,
      Ctrl + H para esta ayuda`;
    
    this.announce(helpText);
  }

  getCurrentAudioStateDescription() {
    const masterVolume = Math.round(this.audioManager.settings.masterVolume * 100);
    const activeChannels = [];
    
    this.audioManager.activeChannels?.forEach((channel, name) => {
      if (!channel.muted && channel.volume > 0) {
        activeChannels.push(this.getChannelName(name));
      }
    });
    
    return `Volumen general al ${masterVolume} por ciento. 
            Canales activos: ${activeChannels.join(', ') || 'ninguno'}`;
  }

  getChannelName(channel) {
    const names = {
      master: 'General',
      music: 'Música',
      sfx: 'Efectos de sonido',
      voice: 'Voz',
      ambient: 'Sonidos ambientales',
      cultural: 'Audio cultural'
    };
    return names[channel] || channel;
  }

  getSoundIcon(type) {
    const icons = {
      music: '🎵',
      voice: '🗣️',
      effects: '🔊',
      ambient: '🌿'
    };
    return icons[type] || '🔊';
  }

  setupEventListeners() {
    // Eventos del audio manager
    this.audioManager.events?.addEventListener('volumeChanged', (e) => {
      const { channel, volume } = e.detail;
      this.updateVolumeIndicator(channel, volume);
      
      if (this.features.audioDescriptions) {
        this.announce(this.audioDescriptions.volumeChange(channel, volume));
      }
      
      this.triggerHapticFeedback('volumeChange');
    });
    
    this.audioManager.events?.addEventListener('channelMuted', (e) => {
      const { channel, muted } = e.detail;
      
      if (this.features.audioDescriptions) {
        this.announce(this.audioDescriptions.channelMute(channel, muted));
      }
      
      this.triggerHapticFeedback('muteToggle');
    });
    
    // Eventos de preferencias
    document.addEventListener('preference:changed', (e) => {
      const { path, value } = e.detail;
      if (path.startsWith('accessibility.')) {
        this.updateAccessibilityFeature(path, value);
      }
    });
    
    // Eventos de audio cultural
    document.addEventListener('cultural:ceremonyStarted', (e) => {
      this.announce(`Iniciando ceremonia: ${e.detail.name}`);
    });
    
    // Eventos de narración
    document.addEventListener('voice:narrate', (e) => {
      if (this.features.hearingAssistance) {
        this.showSubtitle(e.detail.text);
      }
    });
  }

  updateAccessibilityFeature(path, value) {
    const feature = path.split('.')[1];
    
    switch (feature) {
      case 'visualIndicators':
        this.features.visualIndicators = value;
        this.toggleVisualIndicators(value);
        break;
      case 'audioDescriptions':
        this.features.audioDescriptions = value;
        break;
      case 'hearingAssistance':
        this.features.hearingAssistance = value;
        this.toggleHearingAssistance(value);
        break;
      case 'hapticFeedback':
        this.features.hapticFeedback = value;
        break;
    }
  }

  toggleVisualIndicators(enabled) {
    const indicators = [
      this.volumeIndicator,
      this.channelIndicators,
      this.frequencyIndicator
    ];
    
    indicators.forEach(indicator => {
      if (indicator) {
        indicator.style.display = enabled ? 'block' : 'none';
      }
    });
  }

  toggleHearingAssistance(enabled) {
    if (this.subtitleDisplay) {
      this.subtitleDisplay.style.display = enabled ? 'block' : 'none';
    }
    
    if (this.soundIndicators) {
      this.soundIndicators.style.display = enabled ? 'flex' : 'none';
    }
  }

  // Métodos de navegación por teclado
  togglePlayPause() {
    // Implementar toggle de reproducción
    this.announce('Reproducción alternada');
  }

  toggleMasterMute() {
    this.audioManager.mute('master');
  }

  adjustMasterVolume(delta) {
    const currentVolume = this.audioManager.settings.masterVolume;
    const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
    this.audioManager.setVolume('master', newVolume);
  }

  previousChannel() {
    // Implementar navegación de canales
    this.announce('Canal anterior');
  }

  nextChannel() {
    // Implementar navegación de canales
    this.announce('Canal siguiente');
  }

  selectChannel(channel) {
    this.announce(`Canal seleccionado: ${this.getChannelName(channel)}`);
  }

  announceCurrentState() {
    const state = this.getCurrentAudioStateDescription();
    this.announce(state, 'assertive');
  }

  showKeyboardHelp() {
    this.announceKeyboardHelp();
  }

  closeActivePanel() {
    // Cerrar paneles activos
    this.announce('Panel cerrado');
  }

  enable() {
    this.isEnabled = true;
    this.announce('Accesibilidad de audio activada');
  }

  disable() {
    this.isEnabled = false;
    this.announce('Accesibilidad de audio desactivada');
  }

  dispose() {
    // Limpiar elementos del DOM
    [this.volumeIndicator, this.channelIndicators, this.frequencyIndicator,
     this.subtitleDisplay, this.soundIndicators, this.liveRegion, this.assertiveRegion]
      .forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    
    // Limpiar timeouts
    [this.volumeIndicatorTimeout, this.channelIndicatorTimeout, this.subtitleTimeout]
      .forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    
    this.isInitialized = false;
  }
}

export default AudioAccessibility;