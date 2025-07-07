/**
 * RAMA 7: Input Manager - Gestor unificado de entrada
 * Sistema central que coordina todas las formas de interacción del usuario
 */

class InputManager {
    constructor() {
        this.inputSystems = new Map();
        this.activeInputs = new Set();
        this.inputHistory = [];
        this.inputMode = 'auto'; // auto, keyboard, mouse, touch, gesture
        this.narrativeContext = 'exploration'; // exploration, choice, dialogue, cultural
        this.accessibility = {
            screenReader: false,
            reducedMotion: false,
            highContrast: false,
            motorImpairment: false
        };
        this.inputPriority = ['gesture', 'touch', 'mouse', 'keyboard'];
        this.debounceTimers = new Map();
        
        this.init();
    }

    init() {
        this.detectCapabilities();
        this.setupInputSystems();
        this.bindUnifiedEvents();
        this.detectAccessibilityNeeds();
        this.startInputMonitoring();
        this.createInputIndicators();
    }

    detectCapabilities() {
        this.capabilities = {
            touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            mouse: window.matchMedia('(pointer: fine)').matches,
            keyboard: true,
            gamepad: 'getGamepads' in navigator,
            motion: 'DeviceMotionEvent' in window,
            voice: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            haptic: 'vibrate' in navigator
        };
        
        // Detectar dispositivo primario
        this.primaryInput = this.capabilities.touch ? 'touch' : 
                           this.capabilities.mouse ? 'mouse' : 'keyboard';
    }

    setupInputSystems() {
        // Registrar sistemas de entrada existentes
        this.registerInputSystem('scroll', window.scrollController);
        this.registerInputSystem('touch', window.touchGestureManager);
        this.registerInputSystem('keyboard', window.keyboardNavigation);
        this.registerInputSystem('mouse', window.mouseInteractionManager);
        this.registerInputSystem('gesture', window.gestureRecognition);
        
        // Configurar coordinación entre sistemas
        this.setupInputCoordination();
    }

    registerInputSystem(name, system) {
        if (system) {
            this.inputSystems.set(name, {
                instance: system,
                enabled: true,
                priority: this.inputPriority.indexOf(name),
                lastActivity: 0
            });
        }
    }

    setupInputCoordination() {
        // Coordinar entre diferentes sistemas de entrada
        document.addEventListener('narrativeGesture', this.handleUnifiedInput.bind(this));
        document.addEventListener('narrativeKeyboardAction', this.handleUnifiedInput.bind(this));
        document.addEventListener('mouseInteraction', this.handleUnifiedInput.bind(this));
        document.addEventListener('gestureRecognized', this.handleUnifiedInput.bind(this));
        
        // Eventos de cambio de contexto
        document.addEventListener('narrativeStateChange', this.handleContextChange.bind(this));
        document.addEventListener('sectionChange', this.handleSectionChange.bind(this));
    }

    bindUnifiedEvents() {
        // Eventos globales de entrada
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        document.addEventListener('mousedown', this.handleGlobalMousedown.bind(this));
        document.addEventListener('touchstart', this.handleGlobalTouchstart.bind(this));
        
        // Eventos de modo de entrada
        document.addEventListener('mousemove', this.debounce('detectMouseMode', () => {
            this.setInputMode('mouse');
        }, 100));
        
        document.addEventListener('keydown', this.debounce('detectKeyboardMode', () => {
            this.setInputMode('keyboard');
        }, 100));
        
        document.addEventListener('touchstart', this.debounce('detectTouchMode', () => {
            this.setInputMode('touch');
        }, 100));
    }

    handleUnifiedInput(event) {
        const inputData = {
            type: event.type,
            detail: event.detail,
            timestamp: Date.now(),
            inputMode: this.inputMode,
            context: this.narrativeContext
        };
        
        // Registrar en historial
        this.addToInputHistory(inputData);
        
        // Procesar según contexto narrativo
        this.processContextualInput(inputData);
        
        // Coordinar respuestas entre sistemas
        this.coordinateInputResponse(inputData);
    }

    processContextualInput(inputData) {
        const contextProcessors = {
            'exploration': () => this.processExplorationInput(inputData),
            'choice': () => this.processChoiceInput(inputData),
            'dialogue': () => this.processDialogueInput(inputData),
            'cultural': () => this.processCulturalInput(inputData),
            'navigation': () => this.processNavigationInput(inputData)
        };
        
        const processor = contextProcessors[this.narrativeContext];
        if (processor) {
            processor();
        }
    }

    processExplorationInput(inputData) {
        // Lógica específica para modo exploración
        switch (inputData.type) {
            case 'narrativeGesture':
                this.handleExplorationGesture(inputData);
                break;
            case 'narrativeKeyboardAction':
                this.handleExplorationKeyboard(inputData);
                break;
            case 'mouseInteraction':
                this.handleExplorationMouse(inputData);
                break;
        }
    }

    processChoiceInput(inputData) {
        // Priorizar navegación entre opciones
        if (inputData.type === 'narrativeKeyboardAction') {
            const action = inputData.detail.action;
            if (action.includes('navigate') || /\d/.test(action)) {
                this.highlightChoiceOptions();
                this.enableChoiceNavigation();
            }
        }
        
        // Gestión táctil de opciones
        if (inputData.type === 'narrativeGesture' && 
            inputData.detail.type === 'swipe-right') {
            this.navigateChoices('next');
        }
    }

    processDialogueInput(inputData) {
        // Gestión de diálogos
        if (inputData.detail.action === 'next-story' || 
            inputData.detail.action === 'character-greeting') {
            this.advanceDialogue();
        }
        
        // Skip de diálogo con gestos rápidos
        if (inputData.type === 'gestureRecognized' && 
            inputData.detail.action === 'navigate-next') {
            this.skipDialogue();
        }
    }

    processCulturalInput(inputData) {
        // Interacciones específicas culturales
        if (inputData.detail.action === 'activate-cultural' ||
            inputData.detail.action === 'explore-culture') {
            this.activateCulturalExploration();
        }
        
        // Zoom cultural con gestos
        if (inputData.type === 'gestureRecognized' && 
            inputData.detail.action === 'zoom-explore') {
            this.zoomCulturalElement();
        }
    }

    processNavigationInput(inputData) {
        // Navegación general
        const navigationActions = [
            'navigate-next', 'navigate-back', 
            'next-story', 'prev-story'
        ];
        
        if (navigationActions.includes(inputData.detail.action)) {
            this.handleNavigation(inputData.detail.action);
        }
    }

    coordinateInputResponse(inputData) {
        // Coordinar respuestas visuales
        this.updateVisualFeedback(inputData);
        
        // Coordinar respuestas sonoras
        this.updateAudioFeedback(inputData);
        
        // Coordinar respuestas hápticas
        this.updateHapticFeedback(inputData);
        
        // Actualizar estado de UI
        this.updateUIState(inputData);
    }

    setInputMode(mode) {
        if (this.inputMode === mode) return;
        
        const previousMode = this.inputMode;
        this.inputMode = mode;
        
        // Adaptar sistemas según modo
        this.adaptSystemsToInputMode(mode, previousMode);
        
        // Emitir evento de cambio
        const event = new CustomEvent('inputModeChange', {
            detail: { 
                newMode: mode, 
                previousMode,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    adaptSystemsToInputMode(newMode, previousMode) {
        const adaptations = {
            'keyboard': () => {
                this.enableKeyboardIndicators();
                this.optimizeForKeyboard();
            },
            'mouse': () => {
                this.enableMouseEffects();
                this.optimizeForMouse();
            },
            'touch': () => {
                this.enableTouchResponses();
                this.optimizeForTouch();
            },
            'gesture': () => {
                this.enableGestureRecognition();
                this.optimizeForGestures();
            }
        };
        
        // Desactivar modo anterior
        if (previousMode && adaptations[`disable${previousMode}`]) {
            adaptations[`disable${previousMode}`]();
        }
        
        // Activar nuevo modo
        if (adaptations[newMode]) {
            adaptations[newMode]();
        }
    }

    enableKeyboardIndicators() {
        document.body.classList.add('keyboard-navigation');
        
        // Mejorar indicadores de foco
        this.inputSystems.get('keyboard')?.instance.refreshFocusableElements();
        
        // Mostrar atajos de teclado
        this.showKeyboardShortcuts();
    }

    enableMouseEffects() {
        document.body.classList.add('mouse-navigation');
        
        // Habilitar efectos de hover
        this.inputSystems.get('mouse')?.instance.enableCinematicMode();
    }

    enableTouchResponses() {
        document.body.classList.add('touch-navigation');
        
        // Optimizar para touch
        this.optimizeTouchTargets();
        this.enableTouchFeedback();
    }

    enableGestureRecognition() {
        document.body.classList.add('gesture-navigation');
        
        // Aumentar sensibilidad de gestos
        this.inputSystems.get('gesture')?.instance.setSensitivity(0.8);
    }

    optimizeForKeyboard() {
        // Ajustes específicos para teclado
        this.setTabOrder();
        this.enableSkipLinks();
        this.announceNavigationOptions();
    }

    optimizeForMouse() {
        // Ajustes específicos para mouse
        this.enableMouseTrail();
        this.optimizeHoverStates();
    }

    optimizeForTouch() {
        // Ajustes específicos para touch
        this.enlargeTouchTargets();
        this.enableSwipeNavigation();
        this.optimizeTouchScrolling();
    }

    optimizeForGestures() {
        // Ajustes específicos para gestos
        this.showGestureHints();
        this.enableGestureTraining();
    }

    handleContextChange(event) {
        const newContext = event.detail.state;
        const previousContext = this.narrativeContext;
        
        this.narrativeContext = newContext;
        
        // Adaptar sistemas al nuevo contexto
        this.adaptToNarrativeContext(newContext, previousContext);
    }

    adaptToNarrativeContext(newContext, previousContext) {
        const contextAdaptations = {
            'choice': () => {
                this.enableChoiceOptimizations();
                this.highlightChoiceElements();
            },
            'dialogue': () => {
                this.enableDialogueOptimizations();
                this.focusOnDialogue();
            },
            'cultural': () => {
                this.enableCulturalOptimizations();
                this.highlightCulturalElements();
            },
            'exploration': () => {
                this.enableExplorationOptimizations();
                this.enableFreeNavigation();
            }
        };
        
        if (contextAdaptations[newContext]) {
            contextAdaptations[newContext]();
        }
    }

    enableChoiceOptimizations() {
        // Optimizar para selección de opciones
        document.querySelectorAll('.story-choice').forEach((choice, index) => {
            choice.setAttribute('data-choice-number', index + 1);
            choice.setAttribute('tabindex', '0');
        });
        
        // Habilitar navegación numérica
        this.enableNumericNavigation();
    }

    enableDialogueOptimizations() {
        // Optimizar para diálogos
        this.enableDialogueSkipping();
        this.enableAutoAdvance();
    }

    enableCulturalOptimizations() {
        // Optimizar para exploración cultural
        this.enableCulturalZoom();
        this.enableCulturalInfo();
    }

    detectAccessibilityNeeds() {
        // Detectar necesidades de accesibilidad
        this.accessibility.screenReader = this.detectScreenReader();
        this.accessibility.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.accessibility.highContrast = window.matchMedia('(prefers-contrast: high)').matches;
        
        // Adaptar según necesidades
        if (this.accessibility.screenReader) {
            this.enableScreenReaderOptimizations();
        }
        
        if (this.accessibility.reducedMotion) {
            this.disableAnimations();
        }
        
        if (this.accessibility.highContrast) {
            this.enableHighContrastMode();
        }
    }

    detectScreenReader() {
        // Intentar detectar lector de pantalla
        return navigator.userAgent.includes('NVDA') ||
               navigator.userAgent.includes('JAWS') ||
               navigator.userAgent.includes('VoiceOver') ||
               window.speechSynthesis?.speaking === true;
    }

    enableScreenReaderOptimizations() {
        // Optimizaciones para lectores de pantalla
        document.body.classList.add('screen-reader-mode');
        
        // Mejorar anuncios ARIA
        this.enhanceARIALabels();
        this.enableLiveRegions();
        
        // Priorizar navegación por teclado
        this.setInputMode('keyboard');
    }

    startInputMonitoring() {
        // Monitorear actividad de entrada
        setInterval(() => {
            this.analyzeInputPatterns();
            this.optimizeBasedOnUsage();
        }, 5000);
        
        // Limpiar historial antiguo
        setInterval(() => {
            this.cleanupInputHistory();
        }, 30000);
    }

    analyzeInputPatterns() {
        const recentInputs = this.inputHistory.slice(-20);
        
        // Analizar patrones de uso
        const inputTypes = recentInputs.map(input => input.type);
        const mostUsed = this.getMostFrequent(inputTypes);
        
        // Optimizar según patrones
        if (mostUsed && mostUsed !== this.inputMode) {
            this.suggestInputMode(mostUsed);
        }
    }

    getMostFrequent(array) {
        const frequency = {};
        let maxCount = 0;
        let mostFrequent = null;
        
        array.forEach(item => {
            frequency[item] = (frequency[item] || 0) + 1;
            if (frequency[item] > maxCount) {
                maxCount = frequency[item];
                mostFrequent = item;
            }
        });
        
        return mostFrequent;
    }

    suggestInputMode(suggestedMode) {
        // Sugerir cambio de modo si es beneficioso
        const suggestions = {
            'narrativeKeyboardAction': 'keyboard',
            'mouseInteraction': 'mouse',
            'narrativeGesture': 'touch',
            'gestureRecognized': 'gesture'
        };
        
        const newMode = suggestions[suggestedMode];
        if (newMode && newMode !== this.inputMode) {
            this.showModeSwitch(newMode);
        }
    }

    showModeSwitch(mode) {
        const notification = document.createElement('div');
        notification.className = 'input-mode-suggestion';
        notification.innerHTML = `
            <div class="suggestion-content">
                <span class="suggestion-icon">${this.getInputModeIcon(mode)}</span>
                <span class="suggestion-text">Optimizar para ${mode}?</span>
                <button class="suggestion-accept" data-mode="${mode}">Sí</button>
                <button class="suggestion-dismiss">No</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Event listeners
        notification.querySelector('.suggestion-accept').addEventListener('click', () => {
            this.setInputMode(mode);
            notification.remove();
        });
        
        notification.querySelector('.suggestion-dismiss').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-dismiss
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getInputModeIcon(mode) {
        const icons = {
            'keyboard': '⌨️',
            'mouse': '🖱️',
            'touch': '👆',
            'gesture': '👋'
        };
        return icons[mode] || '🎮';
    }

    debounce(id, func, wait) {
        return (...args) => {
            clearTimeout(this.debounceTimers.get(id));
            this.debounceTimers.set(id, setTimeout(() => func.apply(this, args), wait));
        };
    }

    addToInputHistory(inputData) {
        this.inputHistory.push(inputData);
        
        // Mantener solo los últimos 100 inputs
        if (this.inputHistory.length > 100) {
            this.inputHistory.shift();
        }
    }

    cleanupInputHistory() {
        const cutoff = Date.now() - 300000; // 5 minutos
        this.inputHistory = this.inputHistory.filter(input => 
            input.timestamp > cutoff
        );
    }

    createInputIndicators() {
        const indicators = document.createElement('div');
        indicators.className = 'input-mode-indicators';
        indicators.innerHTML = `
            <div class="current-input-mode">
                <span class="mode-icon">${this.getInputModeIcon(this.inputMode)}</span>
                <span class="mode-text">${this.inputMode}</span>
            </div>
            <div class="input-context">
                <span class="context-text">${this.narrativeContext}</span>
            </div>
        `;
        
        document.body.appendChild(indicators);
        this.inputIndicators = indicators;
    }

    updateInputIndicators() {
        if (this.inputIndicators) {
            const modeIcon = this.inputIndicators.querySelector('.mode-icon');
            const modeText = this.inputIndicators.querySelector('.mode-text');
            const contextText = this.inputIndicators.querySelector('.context-text');
            
            modeIcon.textContent = this.getInputModeIcon(this.inputMode);
            modeText.textContent = this.inputMode;
            contextText.textContent = this.narrativeContext;
        }
    }

    // API pública
    getCurrentInputMode() {
        return this.inputMode;
    }

    getCurrentContext() {
        return this.narrativeContext;
    }

    getInputHistory() {
        return [...this.inputHistory];
    }

    getInputCapabilities() {
        return { ...this.capabilities };
    }

    forceInputMode(mode) {
        this.setInputMode(mode);
    }

    enableInputSystem(systemName) {
        const system = this.inputSystems.get(systemName);
        if (system) {
            system.enabled = true;
        }
    }

    disableInputSystem(systemName) {
        const system = this.inputSystems.get(systemName);
        if (system) {
            system.enabled = false;
        }
    }

    getInputStats() {
        return {
            currentMode: this.inputMode,
            currentContext: this.narrativeContext,
            capabilities: this.capabilities,
            accessibility: this.accessibility,
            historySize: this.inputHistory.length,
            enabledSystems: Array.from(this.inputSystems.entries())
                .filter(([_, system]) => system.enabled)
                .map(([name]) => name)
        };
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.inputManager = new InputManager();
});

export default InputManager;