/**
 * Visual Audio Cues - Señales visuales para audio
 * Sistema de indicadores visuales para usuarios con discapacidad auditiva
 */

class VisualAudioCues {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.isEnabled = true;
    this.cueTypes = new Map();
    this.activeIndicators = new Map();
    this.animationFrames = new Map();
    this.colorSchemes = new Map();
    this.settings = {
      intensity: 'medium', // low, medium, high
      colorMode: 'standard', // standard, colorblind, monochrome
      position: 'edges', // edges, corner, floating
      size: 'medium', // small, medium, large
      duration: 'auto', // auto, short, long, persistent
      opacity: 0.8,
      animations: true,
      showLabels: true,
      groupSimilar: true
    };
    this.container = null;
    this.soundHistory = [];
    this.maxHistoryItems = 20;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.setupCueTypes();
    this.setupColorSchemes();
    this.createContainer();
    this.setupEventListeners();
    this.loadUserPreferences();
    
    this.isInitialized = true;
    console.log('Visual Audio Cues initialized');
  }

  setupCueTypes() {
    // Definir tipos de señales visuales para diferentes sonidos
    this.cueTypes.set('speech', {
      name: 'Habla',
      icon: '🗣️',
      color: '#4CAF50',
      pattern: 'wave',
      priority: 'high',
      position: 'left',
      description: 'Alguien está hablando'
    });

    this.cueTypes.set('music', {
      name: 'Música',
      icon: '🎵',
      color: '#9C27B0',
      pattern: 'pulse',
      priority: 'medium',
      position: 'top',
      description: 'Música reproduciendo'
    });

    this.cueTypes.set('notification', {
      name: 'Notificación',
      icon: '🔔',
      color: '#FF9800',
      pattern: 'flash',
      priority: 'high',
      position: 'corner',
      description: 'Sonido de notificación'
    });

    this.cueTypes.set('alert', {
      name: 'Alerta',
      icon: '⚠️',
      color: '#F44336',
      pattern: 'urgent',
      priority: 'urgent',
      position: 'center',
      description: 'Sonido de alerta importante'
    });

    this.cueTypes.set('ambient', {
      name: 'Ambiente',
      icon: '🌿',
      color: '#4FC3F7',
      pattern: 'gentle',
      priority: 'low',
      position: 'bottom',
      description: 'Sonidos ambientales'
    });

    this.cueTypes.set('interaction', {
      name: 'Interacción',
      icon: '👆',
      color: '#00BCD4',
      pattern: 'ripple',
      priority: 'medium',
      position: 'right',
      description: 'Sonido de interacción'
    });

    this.cueTypes.set('cultural', {
      name: 'Cultural',
      icon: '🏛️',
      color: '#795548',
      pattern: 'sacred',
      priority: 'medium',
      position: 'top',
      description: 'Audio cultural o ceremonial'
    });

    this.cueTypes.set('footsteps', {
      name: 'Pasos',
      icon: '👣',
      color: '#607D8B',
      pattern: 'step',
      priority: 'low',
      position: 'bottom',
      description: 'Sonidos de pasos'
    });

    this.cueTypes.set('applause', {
      name: 'Aplausos',
      icon: '👏',
      color: '#FFC107',
      pattern: 'celebration',
      priority: 'medium',
      position: 'center',
      description: 'Aplausos o celebración'
    });

    this.cueTypes.set('water', {
      name: 'Agua',
      icon: '💧',
      color: '#2196F3',
      pattern: 'flow',
      priority: 'low',
      position: 'bottom',
      description: 'Sonido de agua'
    });
  }

  setupColorSchemes() {
    this.colorSchemes.set('standard', {
      name: 'Estándar',
      colors: {
        speech: '#4CAF50',
        music: '#9C27B0',
        notification: '#FF9800',
        alert: '#F44336',
        ambient: '#4FC3F7',
        interaction: '#00BCD4',
        cultural: '#795548'
      }
    });

    this.colorSchemes.set('colorblind', {
      name: 'Daltonismo',
      colors: {
        speech: '#1976D2',
        music: '#7B1FA2',
        notification: '#F57C00',
        alert: '#D32F2F',
        ambient: '#0288D1',
        interaction: '#00796B',
        cultural: '#5D4037'
      }
    });

    this.colorSchemes.set('monochrome', {
      name: 'Monocromo',
      colors: {
        speech: '#212121',
        music: '#424242',
        notification: '#616161',
        alert: '#000000',
        ambient: '#757575',
        interaction: '#9E9E9E',
        cultural: '#424242'
      }
    });

    this.colorSchemes.set('high_contrast', {
      name: 'Alto Contraste',
      colors: {
        speech: '#FFFFFF',
        music: '#FFFF00',
        notification: '#00FFFF',
        alert: '#FF0000',
        ambient: '#00FF00',
        interaction: '#FF00FF',
        cultural: '#FFA500'
      }
    });
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'visual-audio-cues-container';
    this.container.setAttribute('aria-label', 'Indicadores visuales de audio');
    this.container.setAttribute('role', 'status');
    
    this.applyContainerStyles();
    document.body.appendChild(this.container);
    
    // Crear áreas específicas para diferentes posiciones
    this.createPositionAreas();
  }

  applyContainerStyles() {
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    `;
  }

  createPositionAreas() {
    const positions = ['top', 'bottom', 'left', 'right', 'corner', 'center', 'floating'];
    
    positions.forEach(position => {
      const area = document.createElement('div');
      area.className = `cue-area cue-area-${position}`;
      area.style.position = 'absolute';
      
      switch (position) {
        case 'top':
          area.style.cssText += 'top: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px;';
          break;
        case 'bottom':
          area.style.cssText += 'bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px;';
          break;
        case 'left':
          area.style.cssText += 'left: 20px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 10px;';
          break;
        case 'right':
          area.style.cssText += 'right: 20px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 10px;';
          break;
        case 'corner':
          area.style.cssText += 'top: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px;';
          break;
        case 'center':
          area.style.cssText += 'top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 10px;';
          break;
        case 'floating':
          area.style.cssText += 'top: 0; left: 0; width: 100%; height: 100%;';
          break;
      }
      
      this.container.appendChild(area);
    });
  }

  showCue(type, options = {}) {
    if (!this.isEnabled) return null;

    const cueType = this.cueTypes.get(type);
    if (!cueType) {
      console.warn(`Unknown cue type: ${type}`);
      return null;
    }

    // Opciones por defecto
    const {
      intensity = null,
      duration = null,
      position = null,
      message = null,
      sourcePosition = null,
      frequency = null,
      amplitude = 1.0
    } = options;

    // Crear indicador visual
    const indicator = this.createVisualIndicator(cueType, {
      intensity: intensity || this.settings.intensity,
      duration: duration || this.getDuration(cueType),
      position: position || cueType.position,
      message: message || cueType.description,
      sourcePosition,
      frequency,
      amplitude
    });

    // Agregar a historial
    this.addToHistory(type, options);

    // Retornar ID del indicador para control posterior
    return indicator.id;
  }

  createVisualIndicator(cueType, options) {
    const indicator = document.createElement('div');
    const indicatorId = `cue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    indicator.id = indicatorId;
    indicator.className = `visual-cue visual-cue-${cueType.pattern}`;
    indicator.setAttribute('data-type', cueType.name);
    indicator.setAttribute('aria-label', options.message);

    // Aplicar estilos base
    this.applyIndicatorStyles(indicator, cueType, options);

    // Crear contenido del indicador
    this.createIndicatorContent(indicator, cueType, options);

    // Aplicar animación
    this.applyAnimation(indicator, cueType.pattern, options);

    // Posicionar indicador
    this.positionIndicator(indicator, options.position, options.sourcePosition);

    // Programar auto-remoción
    this.scheduleRemoval(indicator, options.duration);

    // Almacenar referencia
    this.activeIndicators.set(indicatorId, {
      element: indicator,
      type: cueType,
      startTime: Date.now(),
      options
    });

    return indicator;
  }

  applyIndicatorStyles(indicator, cueType, options) {
    const colorScheme = this.colorSchemes.get(this.settings.colorMode);
    const color = colorScheme.colors[cueType.name.toLowerCase()] || cueType.color;
    
    const size = this.getSizeValues(options.intensity);
    
    indicator.style.cssText = `
      position: absolute;
      width: ${size.width}px;
      height: ${size.height}px;
      background: ${color};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size.fontSize}px;
      color: white;
      opacity: ${this.settings.opacity};
      box-shadow: 0 0 ${size.glow}px ${color};
      z-index: ${this.getPriorityZIndex(cueType.priority)};
      transition: all 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
    `;

    // Ajustar opacidad basada en amplitud
    if (options.amplitude) {
      const adjustedOpacity = Math.min(1, this.settings.opacity * options.amplitude);
      indicator.style.opacity = adjustedOpacity;
    }
  }

  getSizeValues(intensity) {
    const sizes = {
      low: { width: 40, height: 40, fontSize: 20, glow: 5 },
      medium: { width: 60, height: 60, fontSize: 30, glow: 10 },
      high: { width: 80, height: 80, fontSize: 40, glow: 15 }
    };
    
    return sizes[intensity] || sizes.medium;
  }

  getPriorityZIndex(priority) {
    const priorities = {
      low: 9999,
      medium: 10000,
      high: 10001,
      urgent: 10002
    };
    
    return priorities[priority] || 10000;
  }

  createIndicatorContent(indicator, cueType, options) {
    // Icono principal
    const icon = document.createElement('span');
    icon.className = 'cue-icon';
    icon.textContent = cueType.icon;
    indicator.appendChild(icon);

    // Etiqueta si está habilitada
    if (this.settings.showLabels) {
      const label = document.createElement('div');
      label.className = 'cue-label';
      label.textContent = cueType.name;
      label.style.cssText = `
        position: absolute;
        bottom: -25px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      indicator.appendChild(label);
      
      // Mostrar etiqueta al hacer hover
      indicator.addEventListener('mouseenter', () => {
        label.style.opacity = '1';
      });
      
      indicator.addEventListener('mouseleave', () => {
        label.style.opacity = '0';
      });
    }

    // Indicador de intensidad si es relevante
    if (options.amplitude && options.amplitude !== 1.0) {
      const intensityRing = document.createElement('div');
      intensityRing.className = 'intensity-ring';
      intensityRing.style.cssText = `
        position: absolute;
        top: -5px;
        left: -5px;
        right: -5px;
        bottom: -5px;
        border: 2px solid ${cueType.color};
        border-radius: 50%;
        opacity: ${options.amplitude};
      `;
      indicator.appendChild(intensityRing);
    }

    // Click para más información
    indicator.addEventListener('click', () => {
      this.showCueDetails(cueType, options);
    });
  }

  applyAnimation(indicator, pattern, options) {
    if (!this.settings.animations) return;

    const animationName = `cue-${pattern}`;
    
    // Definir animaciones CSS
    if (!document.querySelector('#visual-cues-animations')) {
      this.createAnimationStyles();
    }

    indicator.style.animation = `${animationName} ${this.getAnimationDuration(pattern)} ease-in-out infinite`;

    // Animaciones especiales basadas en frecuencia
    if (options.frequency) {
      this.applyFrequencyAnimation(indicator, options.frequency);
    }
  }

  createAnimationStyles() {
    const style = document.createElement('style');
    style.id = 'visual-cues-animations';
    style.textContent = `
      @keyframes cue-pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.2); opacity: 1; }
      }
      
      @keyframes cue-wave {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.1) rotate(5deg); }
        75% { transform: scale(0.9) rotate(-5deg); }
      }
      
      @keyframes cue-flash {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 0.3; }
      }
      
      @keyframes cue-urgent {
        0%, 100% { transform: scale(1); background-color: #F44336; }
        50% { transform: scale(1.3); background-color: #FF1744; }
      }
      
      @keyframes cue-gentle {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }
      
      @keyframes cue-ripple {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(1.4); opacity: 0; }
      }
      
      @keyframes cue-sacred {
        0%, 100% { transform: scale(1) rotate(0deg); filter: brightness(1); }
        50% { transform: scale(1.1) rotate(180deg); filter: brightness(1.2); }
      }
      
      @keyframes cue-step {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
      
      @keyframes cue-celebration {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.2) rotate(90deg); }
        50% { transform: scale(1.1) rotate(180deg); }
        75% { transform: scale(1.2) rotate(270deg); }
      }
      
      @keyframes cue-flow {
        0% { transform: translateX(-10px) scale(0.9); opacity: 0.6; }
        50% { transform: translateX(0px) scale(1); opacity: 1; }
        100% { transform: translateX(10px) scale(0.9); opacity: 0.6; }
      }
    `;
    
    document.head.appendChild(style);
  }

  getAnimationDuration(pattern) {
    const durations = {
      pulse: '2s',
      wave: '3s',
      flash: '1s',
      urgent: '0.5s',
      gentle: '4s',
      ripple: '1.5s',
      sacred: '6s',
      step: '1.2s',
      celebration: '2s',
      flow: '3s'
    };
    
    return durations[pattern] || '2s';
  }

  applyFrequencyAnimation(indicator, frequency) {
    // Ajustar velocidad de animación basada en frecuencia
    const baseSpeed = parseFloat(indicator.style.animationDuration) || 2;
    const frequencyMultiplier = Math.log(frequency / 440) / Math.log(2); // Relativo a A4
    const adjustedSpeed = Math.max(0.5, baseSpeed - frequencyMultiplier * 0.5);
    
    indicator.style.animationDuration = `${adjustedSpeed}s`;
  }

  positionIndicator(indicator, position, sourcePosition) {
    const area = this.container.querySelector(`.cue-area-${position}`);
    
    if (position === 'floating' && sourcePosition) {
      // Posición libre basada en la fuente del sonido
      indicator.style.left = `${sourcePosition.x}px`;
      indicator.style.top = `${sourcePosition.y}px`;
      this.container.appendChild(indicator);
    } else if (area) {
      // Posición en área designada
      area.appendChild(indicator);
      
      // Aplicar agrupación si está habilitada
      if (this.settings.groupSimilar) {
        this.groupSimilarCues(area, indicator);
      }
    } else {
      // Fallback a esquina
      const cornerArea = this.container.querySelector('.cue-area-corner');
      if (cornerArea) {
        cornerArea.appendChild(indicator);
      }
    }
  }

  groupSimilarCues(area, newIndicator) {
    const newType = newIndicator.getAttribute('data-type');
    const existingCues = Array.from(area.children).filter(child => 
      child.getAttribute('data-type') === newType && child !== newIndicator
    );

    if (existingCues.length > 0) {
      // Agrupar indicadores similares
      const group = this.createCueGroup(newType, [...existingCues, newIndicator]);
      
      // Reemplazar indicadores individuales con grupo
      existingCues.forEach(cue => cue.remove());
      newIndicator.remove();
      area.appendChild(group);
    }
  }

  createCueGroup(type, indicators) {
    const group = document.createElement('div');
    group.className = 'cue-group';
    group.setAttribute('data-type', type);
    
    group.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      gap: -10px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 30px;
      padding: 5px;
    `;

    // Agregar indicadores al grupo
    indicators.forEach((indicator, index) => {
      indicator.style.zIndex = indicators.length - index;
      indicator.style.marginLeft = index > 0 ? '-10px' : '0';
      group.appendChild(indicator);
    });

    // Contador de elementos
    const counter = document.createElement('span');
    counter.className = 'group-counter';
    counter.textContent = indicators.length;
    counter.style.cssText = `
      background: rgba(255, 255, 255, 0.8);
      color: #333;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      margin-left: 5px;
    `;
    
    group.appendChild(counter);
    return group;
  }

  getDuration(cueType) {
    if (this.settings.duration === 'auto') {
      const durations = {
        urgent: 5000,
        high: 4000,
        medium: 3000,
        low: 2000
      };
      return durations[cueType.priority] || 3000;
    }
    
    const durationMap = {
      short: 2000,
      long: 6000,
      persistent: -1 // No auto-remove
    };
    
    return durationMap[this.settings.duration] || 3000;
  }

  scheduleRemoval(indicator, duration) {
    if (duration === -1) return; // Persistente
    
    setTimeout(() => {
      this.removeCue(indicator.id);
    }, duration);
  }

  removeCue(indicatorId) {
    const cueData = this.activeIndicators.get(indicatorId);
    if (!cueData) return;

    const { element } = cueData;
    
    // Animación de salida
    element.style.animation = 'none';
    element.style.transform = 'scale(0)';
    element.style.opacity = '0';
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.activeIndicators.delete(indicatorId);
    }, 300);
  }

  showCueDetails(cueType, options) {
    // Mostrar panel de detalles del audio
    const panel = document.createElement('div');
    panel.className = 'cue-details-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-icon">${cueType.icon}</span>
        <h4>${cueType.name}</h4>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <p>${cueType.description}</p>
        ${options.message && options.message !== cueType.description ? 
          `<p><strong>Detalles:</strong> ${options.message}</p>` : ''}
        ${options.frequency ? 
          `<p><strong>Frecuencia:</strong> ${Math.round(options.frequency)} Hz</p>` : ''}
        ${options.amplitude !== undefined ? 
          `<p><strong>Intensidad:</strong> ${Math.round(options.amplitude * 100)}%</p>` : ''}
        <p><strong>Prioridad:</strong> ${cueType.priority}</p>
      </div>
    `;
    
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 10003;
      min-width: 250px;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    // Cerrar panel
    panel.querySelector('.close-btn').addEventListener('click', () => {
      panel.remove();
    });
    
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      if (panel.parentNode) {
        panel.remove();
      }
    }, 5000);
    
    document.body.appendChild(panel);
  }

  addToHistory(type, options) {
    const historyItem = {
      type,
      timestamp: Date.now(),
      options: { ...options }
    };
    
    this.soundHistory.unshift(historyItem);
    
    // Mantener solo los últimos elementos
    if (this.soundHistory.length > this.maxHistoryItems) {
      this.soundHistory = this.soundHistory.slice(0, this.maxHistoryItems);
    }
    
    // Emitir evento de historial actualizado
    document.dispatchEvent(new CustomEvent('visualCues:historyUpdated', {
      detail: { history: this.soundHistory }
    }));
  }

  createHistoryPanel() {
    const panel = document.createElement('div');
    panel.className = 'sound-history-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h4>Historial de Sonidos</h4>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="history-list">
          ${this.soundHistory.map(item => {
            const cueType = this.cueTypes.get(item.type);
            const timeString = new Date(item.timestamp).toLocaleTimeString();
            
            return `
              <div class="history-item">
                <span class="item-icon">${cueType?.icon || '🔊'}</span>
                <div class="item-details">
                  <div class="item-name">${cueType?.name || item.type}</div>
                  <div class="item-time">${timeString}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${this.soundHistory.length === 0 ? 
          '<p class="no-history">No hay sonidos recientes</p>' : ''}
      </div>
      <div class="panel-footer">
        <button id="clear-history">Limpiar Historial</button>
      </div>
    `;
    
    this.applyHistoryPanelStyles(panel);
    this.setupHistoryPanelEvents(panel);
    
    return panel;
  }

  applyHistoryPanelStyles(panel) {
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-radius: 8px;
      z-index: 10002;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    // Estilos internos
    const style = document.createElement('style');
    style.textContent = `
      .sound-history-panel .panel-header {
        padding: 15px;
        background: linear-gradient(135deg, #2196F3, #1976D2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .sound-history-panel .panel-content {
        max-height: 250px;
        overflow-y: auto;
        padding: 10px;
      }
      
      .sound-history-panel .history-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .sound-history-panel .item-details {
        flex: 1;
      }
      
      .sound-history-panel .item-name {
        font-weight: bold;
      }
      
      .sound-history-panel .item-time {
        font-size: 12px;
        opacity: 0.7;
      }
      
      .sound-history-panel .panel-footer {
        padding: 10px;
        text-align: center;
      }
      
      .sound-history-panel button {
        background: #2196F3;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .sound-history-panel .close-btn {
        background: none;
        font-size: 18px;
      }
    `;
    
    document.head.appendChild(style);
  }

  setupHistoryPanelEvents(panel) {
    panel.querySelector('.close-btn').addEventListener('click', () => {
      panel.remove();
    });
    
    panel.querySelector('#clear-history').addEventListener('click', () => {
      this.clearHistory();
      panel.remove();
    });
  }

  clearHistory() {
    this.soundHistory = [];
    document.dispatchEvent(new CustomEvent('visualCues:historyCleared'));
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    
    // Aplicar nuevos ajustes a indicadores activos
    this.activeIndicators.forEach(({ element, type, options }) => {
      this.applyIndicatorStyles(element, type, options);
      
      if (!this.settings.animations) {
        element.style.animation = 'none';
      }
    });
    
    this.saveUserPreferences();
  }

  setupEventListeners() {
    // Eventos de audio manager
    this.audioManager.events?.addEventListener('audioPlaying', (e) => {
      const { type, details } = e.detail;
      this.showCue(type, details);
    });

    // Eventos específicos de tipos de audio
    document.addEventListener('voice:narrate', (e) => {
      this.showCue('speech', {
        message: 'Narración de voz',
        intensity: 'medium'
      });
    });

    document.addEventListener('cultural:ceremonyStarted', (e) => {
      this.showCue('cultural', {
        message: `Ceremonia: ${e.detail.name}`,
        intensity: 'high',
        duration: 'long'
      });
    });

    document.addEventListener('user:interaction', (e) => {
      this.showCue('interaction', {
        message: `Interacción: ${e.detail.type}`,
        intensity: 'low',
        sourcePosition: e.detail.position
      });
    });

    document.addEventListener('notification:sound', (e) => {
      this.showCue('notification', {
        message: e.detail.message || 'Notificación',
        intensity: 'high'
      });
    });

    document.addEventListener('ambient:changed', (e) => {
      this.showCue('ambient', {
        message: `Ambiente: ${e.detail.type}`,
        intensity: 'low',
        duration: 'persistent'
      });
    });

    // Eventos de preferencias
    document.addEventListener('preference:changed', (e) => {
      if (e.detail.path.startsWith('visualCues.')) {
        const setting = e.detail.path.split('.')[1];
        this.updateSettings({ [setting]: e.detail.value });
      }
    });

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        this.toggleHistoryPanel();
      }
      
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggleHistoryPanel() {
    const existingPanel = document.querySelector('.sound-history-panel');
    if (existingPanel) {
      existingPanel.remove();
    } else {
      const panel = this.createHistoryPanel();
      document.body.appendChild(panel);
    }
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    
    if (!this.isEnabled) {
      // Ocultar todos los indicadores activos
      this.activeIndicators.forEach((_, id) => {
        this.removeCue(id);
      });
    }
    
    document.dispatchEvent(new CustomEvent('visualCues:toggled', {
      detail: { enabled: this.isEnabled }
    }));
  }

  enable() {
    this.isEnabled = true;
    this.container.style.display = 'block';
  }

  disable() {
    this.isEnabled = false;
    this.container.style.display = 'none';
    
    // Limpiar indicadores activos
    this.activeIndicators.forEach((_, id) => {
      this.removeCue(id);
    });
  }

  saveUserPreferences() {
    const preferences = {
      enabled: this.isEnabled,
      settings: this.settings
    };
    
    localStorage.setItem('visualAudioCuesPreferences', JSON.stringify(preferences));
  }

  loadUserPreferences() {
    try {
      const saved = localStorage.getItem('visualAudioCuesPreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        
        this.isEnabled = preferences.enabled !== false;
        if (preferences.settings) {
          Object.assign(this.settings, preferences.settings);
        }
      }
    } catch (error) {
      console.warn('Error loading visual audio cues preferences:', error);
    }
  }

  dispose() {
    // Limpiar todos los indicadores
    this.activeIndicators.forEach((_, id) => {
      this.removeCue(id);
    });

    // Limpiar animaciones
    this.animationFrames.forEach((frame) => {
      cancelAnimationFrame(frame);
    });

    // Remover contenedor
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // Limpiar mapas
    this.activeIndicators.clear();
    this.animationFrames.clear();
    this.soundHistory = [];

    this.isInitialized = false;
  }
}

export default VisualAudioCues;