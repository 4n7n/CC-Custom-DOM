/**
 * Subtitles Generator - Generador de subtítulos automático
 * Sistema para generar subtítulos en tiempo real para contenido de audio
 */

class SubtitlesGenerator {
  constructor(voiceNarrator, audioManager) {
    this.voiceNarrator = voiceNarrator;
    this.audioManager = audioManager;
    this.isEnabled = true;
    this.isRecognizing = false;
    this.recognition = null;
    this.subtitlesContainer = null;
    this.currentSubtitle = null;
    this.subtitleQueue = [];
    this.settings = {
      autoScroll: true,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      textColor: '#FFFFFF',
      position: 'bottom',
      maxLines: 3,
      animationSpeed: 300,
      wordWrap: true,
      showTimestamps: false
    };
    this.languages = new Map();
    this.currentLanguage = 'es-ES';
    this.contextualPhrases = new Map();
    this.abbreviations = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.setupSpeechRecognition();
    this.createSubtitlesContainer();
    this.setupLanguages();
    this.setupContextualPhrases();
    this.setupAbbreviations();
    this.setupEventListeners();
    this.loadUserPreferences();
    
    this.isInitialized = true;
    console.log('Subtitles Generator initialized');
  }

  setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech Recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configuración de reconocimiento
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.currentLanguage;
    this.recognition.maxAlternatives = 3;
    
    // Event listeners
    this.recognition.onstart = () => {
      this.isRecognizing = true;
      this.onRecognitionStart();
    };
    
    this.recognition.onend = () => {
      this.isRecognizing = false;
      this.onRecognitionEnd();
    };
    
    this.recognition.onresult = (event) => {
      this.processRecognitionResult(event);
    };
    
    this.recognition.onerror = (event) => {
      this.onRecognitionError(event);
    };
  }

  createSubtitlesContainer() {
    const container = document.createElement('div');
    container.className = 'subtitles-container';
    container.setAttribute('role', 'complementary');
    container.setAttribute('aria-label', 'Subtítulos de audio');
    container.setAttribute('aria-live', 'polite');
    
    this.applyContainerStyles(container);
    
    // Crear área de texto principal
    const textArea = document.createElement('div');
    textArea.className = 'subtitles-text-area';
    
    // Crear controles de subtítulos
    const controls = this.createSubtitleControls();
    
    container.appendChild(textArea);
    container.appendChild(controls);
    
    document.body.appendChild(container);
    this.subtitlesContainer = container;
    this.textArea = textArea;
  }

  applyContainerStyles(container) {
    const { position, backgroundColor, fontSize, fontFamily } = this.settings;
    
    let positionStyles = '';
    switch (position) {
      case 'top':
        positionStyles = 'top: 20px; left: 50%; transform: translateX(-50%);';
        break;
      case 'bottom':
        positionStyles = 'bottom: 20px; left: 50%; transform: translateX(-50%);';
        break;
      case 'bottom-left':
        positionStyles = 'bottom: 20px; left: 20px;';
        break;
      case 'bottom-right':
        positionStyles = 'bottom: 20px; right: 20px;';
        break;
      default:
        positionStyles = 'bottom: 60px; left: 50%; transform: translateX(-50%);';
    }
    
    container.style.cssText = `
      position: fixed;
      ${positionStyles}
      max-width: 80%;
      min-width: 300px;
      background: ${backgroundColor};
      border-radius: 8px;
      padding: 15px;
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      color: ${this.settings.textColor};
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      opacity: 0;
      transition: opacity ${this.settings.animationSpeed}ms ease;
      pointer-events: none;
    `;
  }

  createSubtitleControls() {
    const controls = document.createElement('div');
    controls.className = 'subtitles-controls';
    controls.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: auto;
    `;
    
    // Botón de configuración
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'subtitle-settings-btn';
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = 'Configurar subtítulos';
    settingsBtn.addEventListener('click', () => this.showSettingsPanel());
    
    // Selector de idioma
    const languageSelect = document.createElement('select');
    languageSelect.className = 'subtitle-language-select';
    languageSelect.title = 'Idioma de subtítulos';
    
    this.languages.forEach((name, code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      option.selected = code === this.currentLanguage;
      languageSelect.appendChild(option);
    });
    
    languageSelect.addEventListener('change', (e) => {
      this.setLanguage(e.target.value);
    });
    
    // Toggle de subtítulos
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'subtitle-toggle-btn';
    toggleBtn.innerHTML = this.isEnabled ? '👁️' : '🚫';
    toggleBtn.title = 'Activar/Desactivar subtítulos';
    toggleBtn.addEventListener('click', () => this.toggle());
    
    // Botón de limpiar
    const clearBtn = document.createElement('button');
    clearBtn.className = 'subtitle-clear-btn';
    clearBtn.innerHTML = '🗑️';
    clearBtn.title = 'Limpiar subtítulos';
    clearBtn.addEventListener('click', () => this.clear());
    
    [settingsBtn, languageSelect, toggleBtn, clearBtn].forEach(btn => {
      btn.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 5px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s ease;
      `;
      
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255, 255, 255, 0.3)';
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(255, 255, 255, 0.2)';
      });
    });
    
    controls.appendChild(settingsBtn);
    controls.appendChild(languageSelect);
    controls.appendChild(toggleBtn);
    controls.appendChild(clearBtn);
    
    // Mostrar controles al hacer hover
    this.subtitlesContainer.addEventListener('mouseenter', () => {
      controls.style.opacity = '1';
    });
    
    this.subtitlesContainer.addEventListener('mouseleave', () => {
      controls.style.opacity = '0';
    });
    
    return controls;
  }

  setupLanguages() {
    this.languages.set('es-ES', 'Español');
    this.languages.set('en-US', 'English (US)');
    this.languages.set('en-GB', 'English (UK)');
    this.languages.set('fr-FR', 'Français');
    this.languages.set('de-DE', 'Deutsch');
    this.languages.set('it-IT', 'Italiano');
    this.languages.set('pt-BR', 'Português (Brasil)');
    this.languages.set('zh-CN', '中文 (简体)');
    this.languages.set('ja-JP', '日本語');
    this.languages.set('ko-KR', '한국어');
  }

  setupContextualPhrases() {
    // Frases comunes de la aplicación para mejorar reconocimiento
    this.contextualPhrases.set('es-ES', [
      'bienvenido a la comunidad',
      'audio espacial',
      'volumen maestro',
      'efectos de sonido',
      'narración cultural',
      'ceremonia tradicional',
      'música adaptativa'
    ]);
    
    this.contextualPhrases.set('en-US', [
      'welcome to community',
      'spatial audio',
      'master volume',
      'sound effects',
      'cultural narration',
      'traditional ceremony',
      'adaptive music'
    ]);
  }

  setupAbbreviations() {
    this.abbreviations.set('es-ES', new Map([
      ['vol', 'volumen'],
      ['fx', 'efectos'],
      ['bg', 'fondo'],
      ['ui', 'interfaz de usuario'],
      ['3d', 'tres dimensiones']
    ]));
    
    this.abbreviations.set('en-US', new Map([
      ['vol', 'volume'],
      ['fx', 'effects'],
      ['bg', 'background'],
      ['ui', 'user interface'],
      ['3d', 'three dimensional']
    ]));
  }

  startRecognition() {
    if (!this.recognition || this.isRecognizing) return;
    
    try {
      this.recognition.lang = this.currentLanguage;
      this.recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }

  stopRecognition() {
    if (!this.recognition || !this.isRecognizing) return;
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }

  processRecognitionResult(event) {
    let finalTranscript = '';
    let interimTranscript = '';
    
    // Procesar resultados del reconocimiento
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    // Procesar texto final
    if (finalTranscript) {
      const processedText = this.processTranscript(finalTranscript);
      this.addSubtitle(processedText, true);
    }
    
    // Mostrar texto temporal
    if (interimTranscript) {
      const processedText = this.processTranscript(interimTranscript);
      this.showInterimSubtitle(processedText);
    }
  }

  processTranscript(text) {
    let processed = text.trim();
    
    // Expandir abreviaciones
    const abbreviations = this.abbreviations.get(this.currentLanguage);
    if (abbreviations) {
      abbreviations.forEach((full, abbrev) => {
        const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
        processed = processed.replace(regex, full);
      });
    }
    
    // Capitalizar primera letra
    processed = processed.charAt(0).toUpperCase() + processed.slice(1);
    
    // Agregar puntuación si falta
    if (!/[.!?]$/.test(processed)) {
      processed += '.';
    }
    
    return processed;
  }

  addSubtitle(text, isFinal = false) {
    if (!this.isEnabled || !text.trim()) return;
    
    const timestamp = Date.now();
    const subtitle = {
      id: `subtitle_${timestamp}`,
      text: text.trim(),
      timestamp,
      isFinal,
      duration: this.calculateDuration(text)
    };
    
    this.subtitleQueue.push(subtitle);
    this.displaySubtitle(subtitle);
    
    // Limpiar subtítulos antiguos
    this.cleanupOldSubtitles();
    
    // Emitir evento
    document.dispatchEvent(new CustomEvent('subtitle:added', {
      detail: subtitle
    }));
  }

  displaySubtitle(subtitle) {
    if (!this.textArea) return;
    
    // Crear elemento de subtítulo
    const subtitleElement = document.createElement('div');
    subtitleElement.className = `subtitle-line ${subtitle.isFinal ? 'final' : 'interim'}`;
    subtitleElement.setAttribute('data-id', subtitle.id);
    
    // Agregar timestamp si está habilitado
    let content = '';
    if (this.settings.showTimestamps) {
      const time = new Date(subtitle.timestamp).toLocaleTimeString();
      content += `<span class="subtitle-timestamp">[${time}]</span> `;
    }
    
    content += `<span class="subtitle-text">${subtitle.text}</span>`;
    subtitleElement.innerHTML = content;
    
    // Aplicar estilos
    subtitleElement.style.cssText = `
      margin-bottom: 5px;
      line-height: 1.4;
      opacity: ${subtitle.isFinal ? '1' : '0.7'};
      border-left: ${subtitle.isFinal ? '3px solid #4CAF50' : '3px solid #FFC107'};
      padding-left: 8px;
      animation: subtitleFadeIn ${this.settings.animationSpeed}ms ease;
    `;
    
    // Agregar al contenedor
    this.textArea.appendChild(subtitleElement);
    
    // Mostrar container si está oculto
    this.show();
    
    // Auto scroll si está habilitado
    if (this.settings.autoScroll) {
      this.scrollToBottom();
    }
    
    // Limitar número de líneas
    this.limitLines();
    
    // Programar auto-ocultado
    if (subtitle.isFinal) {
      setTimeout(() => {
        this.removeSubtitleElement(subtitle.id);
      }, subtitle.duration + 2000);
    }
  }

  showInterimSubtitle(text) {
    // Remover subtítulo temporal anterior
    const existingInterim = this.textArea.querySelector('.subtitle-line.interim');
    if (existingInterim) {
      existingInterim.remove();
    }
    
    // Crear nuevo subtítulo temporal
    this.addSubtitle(text, false);
  }

  calculateDuration(text) {
    // Calcular duración basada en velocidad de lectura promedio
    const wordsPerMinute = 200;
    const words = text.split(' ').length;
    const minutes = words / wordsPerMinute;
    return Math.max(3000, minutes * 60 * 1000); // Mínimo 3 segundos
  }

  removeSubtitleElement(id) {
    const element = this.textArea.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.style.animation = `subtitleFadeOut ${this.settings.animationSpeed}ms ease`;
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, this.settings.animationSpeed);
    }
  }

  scrollToBottom() {
    if (this.textArea) {
      this.textArea.scrollTop = this.textArea.scrollHeight;
    }
  }

  limitLines() {
    const lines = this.textArea.querySelectorAll('.subtitle-line');
    const maxLines = this.settings.maxLines;
    
    if (lines.length > maxLines) {
      const excessLines = lines.length - maxLines;
      for (let i = 0; i < excessLines; i++) {
        if (lines[i]) {
          lines[i].remove();
        }
      }
    }
  }

  cleanupOldSubtitles() {
    const now = Date.now();
    const maxAge = 30000; // 30 segundos
    
    this.subtitleQueue = this.subtitleQueue.filter(subtitle => {
      if (now - subtitle.timestamp > maxAge) {
        this.removeSubtitleElement(subtitle.id);
        return false;
      }
      return true;
    });
  }

  generateSubtitleFromVoice(text, options = {}) {
    // Generar subtítulo desde texto de narración
    const {
      priority = 'normal',
      context = null,
      speaker = 'narrador'
    } = options;
    
    let formattedText = text;
    
    // Agregar contexto si está disponible
    if (context) {
      formattedText = `[${context}] ${text}`;
    }
    
    // Agregar información del hablante
    if (speaker !== 'narrador') {
      formattedText = `${speaker}: ${formattedText}`;
    }
    
    this.addSubtitle(formattedText, true);
  }

  generateSubtitleFromAudio(audioContext, source) {
    // Placeholder para análisis de audio y generación de subtítulos
    // En una implementación real, esto podría usar análisis de frecuencias
    // o servicios de transcripción automática
    
    if (!audioContext || !source) return;
    
    // Crear analizador de audio
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    try {
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const detectSpeech = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Detectar actividad de voz en frecuencias de habla (300-3400 Hz)
        const voiceRange = dataArray.slice(5, 50); // Aproximación
        const voiceActivity = voiceRange.reduce((sum, val) => sum + val, 0) / voiceRange.length;
        
        if (voiceActivity > 50) { // Umbral de detección
          this.addSubtitle('[Detectando habla...]', false);
        }
        
        if (this.isEnabled) {
          requestAnimationFrame(detectSpeech);
        }
      };
      
      detectSpeech();
    } catch (error) {
      console.warn('Could not analyze audio for subtitles:', error);
    }
  }

  setLanguage(languageCode) {
    if (!this.languages.has(languageCode)) return;
    
    this.currentLanguage = languageCode;
    
    if (this.recognition) {
      this.recognition.lang = languageCode;
      
      // Reiniciar reconocimiento si está activo
      if (this.isRecognizing) {
        this.stopRecognition();
        setTimeout(() => this.startRecognition(), 100);
      }
    }
    
    // Actualizar selector de idioma
    const select = this.subtitlesContainer?.querySelector('.subtitle-language-select');
    if (select) {
      select.value = languageCode;
    }
    
    document.dispatchEvent(new CustomEvent('subtitle:languageChanged', {
      detail: { language: languageCode }
    }));
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    
    // Aplicar nuevos estilos al contenedor
    if (this.subtitlesContainer) {
      this.applyContainerStyles(this.subtitlesContainer);
    }
    
    // Guardar preferencias
    this.saveUserPreferences();
  }

  showSettingsPanel() {
    // Crear panel de configuración temporal
    const panel = document.createElement('div');
    panel.className = 'subtitle-settings-panel';
    panel.innerHTML = this.createSettingsHTML();
    
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 10001;
      min-width: 300px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    this.setupSettingsPanelEvents(panel);
    document.body.appendChild(panel);
    
    // Cerrar al hacer clic fuera
    setTimeout(() => {
      document.addEventListener('click', function closePanel(e) {
        if (!panel.contains(e.target)) {
          panel.remove();
          document.removeEventListener('click', closePanel);
        }
      });
    }, 100);
  }

  createSettingsHTML() {
    return `
      <h3>Configuración de Subtítulos</h3>
      <div class="setting-item">
        <label>Tamaño de fuente: <span id="fontSize-value">${this.settings.fontSize}px</span></label>
        <input type="range" id="fontSize" min="12" max="24" value="${this.settings.fontSize}">
      </div>
      <div class="setting-item">
        <label>Posición:</label>
        <select id="position">
          <option value="top" ${this.settings.position === 'top' ? 'selected' : ''}>Arriba</option>
          <option value="bottom" ${this.settings.position === 'bottom' ? 'selected' : ''}>Abajo</option>
          <option value="bottom-left" ${this.settings.position === 'bottom-left' ? 'selected' : ''}>Abajo Izquierda</option>
          <option value="bottom-right" ${this.settings.position === 'bottom-right' ? 'selected' : ''}>Abajo Derecha</option>
        </select>
      </div>
      <div class="setting-item">
        <label>
          <input type="checkbox" id="autoScroll" ${this.settings.autoScroll ? 'checked' : ''}>
          Auto scroll
        </label>
      </div>
      <div class="setting-item">
        <label>
          <input type="checkbox" id="showTimestamps" ${this.settings.showTimestamps ? 'checked' : ''}>
          Mostrar timestamps
        </label>
      </div>
      <div class="setting-item">
        <label>Máximo líneas:</label>
        <input type="number" id="maxLines" min="1" max="10" value="${this.settings.maxLines}">
      </div>
      <div class="setting-actions">
        <button id="save-settings">Guardar</button>
        <button id="close-settings">Cerrar</button>
      </div>
    `;
  }

  setupSettingsPanelEvents(panel) {
    // Font size slider
    const fontSizeSlider = panel.querySelector('#fontSize');
    const fontSizeValue = panel.querySelector('#fontSize-value');
    
    fontSizeSlider.addEventListener('input', (e) => {
      fontSizeValue.textContent = e.target.value + 'px';
    });
    
    // Save button
    panel.querySelector('#save-settings').addEventListener('click', () => {
      const newSettings = {
        fontSize: parseInt(panel.querySelector('#fontSize').value),
        position: panel.querySelector('#position').value,
        autoScroll: panel.querySelector('#autoScroll').checked,
        showTimestamps: panel.querySelector('#showTimestamps').checked,
        maxLines: parseInt(panel.querySelector('#maxLines').value)
      };
      
      this.updateSettings(newSettings);
      panel.remove();
    });
    
    // Close button
    panel.querySelector('#close-settings').addEventListener('click', () => {
      panel.remove();
    });
  }

  show() {
    if (this.subtitlesContainer) {
      this.subtitlesContainer.style.opacity = '1';
      this.subtitlesContainer.style.pointerEvents = 'auto';
    }
  }

  hide() {
    if (this.subtitlesContainer) {
      this.subtitlesContainer.style.opacity = '0';
      this.subtitlesContainer.style.pointerEvents = 'none';
    }
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    
    if (this.isEnabled) {
      this.show();
      this.startRecognition();
    } else {
      this.hide();
      this.stopRecognition();
    }
    
    // Actualizar botón
    const toggleBtn = this.subtitlesContainer?.querySelector('.subtitle-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = this.isEnabled ? '👁️' : '🚫';
    }
    
    document.dispatchEvent(new CustomEvent('subtitle:toggled', {
      detail: { enabled: this.isEnabled }
    }));
  }

  clear() {
    if (this.textArea) {
      this.textArea.innerHTML = '';
    }
    this.subtitleQueue = [];
    this.hide();
  }

  setupEventListeners() {
    // Eventos de narración de voz
    document.addEventListener('voice:narrate', (e) => {
      this.generateSubtitleFromVoice(e.detail.text, e.detail);
    });
    
    // Eventos de audio cultural
    document.addEventListener('cultural:ceremonyStarted', (e) => {
      this.generateSubtitleFromVoice(`[Ceremonia] ${e.detail.name} ha comenzado`);
    });
    
    // Eventos de preferencias
    document.addEventListener('preference:changed', (e) => {
      if (e.detail.path.startsWith('subtitles.')) {
        const setting = e.detail.path.split('.')[1];
        this.updateSettings({ [setting]: e.detail.value });
      }
    });
  }

  onRecognitionStart() {
    document.dispatchEvent(new CustomEvent('subtitle:recognitionStarted'));
  }

  onRecognitionEnd() {
    document.dispatchEvent(new CustomEvent('subtitle:recognitionEnded'));
    
    // Reintentar si está habilitado
    if (this.isEnabled) {
      setTimeout(() => this.startRecognition(), 1000);
    }
  }

  onRecognitionError(event) {
    console.warn('Speech recognition error:', event.error);
    
    // Manejar errores específicos
    switch (event.error) {
      case 'no-speech':
        // No hacer nada, es normal
        break;
      case 'network':
        this.addSubtitle('[Error de red en reconocimiento de voz]', true);
        break;
      case 'not-allowed':
        this.addSubtitle('[Permiso de micrófono denegado]', true);
        break;
      default:
        this.addSubtitle(`[Error en reconocimiento: ${event.error}]`, true);
    }
  }

  saveUserPreferences() {
    const preferences = {
      enabled: this.isEnabled,
      language: this.currentLanguage,
      settings: this.settings
    };
    
    localStorage.setItem('subtitlesPreferences', JSON.stringify(preferences));
  }

  loadUserPreferences() {
    try {
      const saved = localStorage.getItem('subtitlesPreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        
        this.isEnabled = preferences.enabled !== false;
        this.currentLanguage = preferences.language || 'es-ES';
        
        if (preferences.settings) {
          Object.assign(this.settings, preferences.settings);
        }
        
        // Aplicar configuración cargada
        this.setLanguage(this.currentLanguage);
        this.applyContainerStyles(this.subtitlesContainer);
      }
    } catch (error) {
      console.warn('Error loading subtitle preferences:', error);
    }
  }

  dispose() {
    this.stopRecognition();
    
    if (this.subtitlesContainer && this.subtitlesContainer.parentNode) {
      this.subtitlesContainer.parentNode.removeChild(this.subtitlesContainer);
    }
    
    this.subtitleQueue = [];
    this.isInitialized = false;
  }
}

export default SubtitlesGenerator;