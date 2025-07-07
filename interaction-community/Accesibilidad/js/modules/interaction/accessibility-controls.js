/**
 * RAMA 7: Accessibility Controls - Controles de accesibilidad universal
 * Sistema integral de accesibilidad para experiencias culturales inclusivas
 */

class AccessibilityControlsManager {
    constructor() {
        this.accessibilitySettings = new Map();
        this.userPreferences = new Map();
        this.accessibilityFeatures = new Map();
        this.assistiveTechnologies = new Map();
        this.adaptiveInterface = new Map();
        this.inclusionMetrics = new Map();
        this.accessibilityAudit = new Map();
        this.customAdaptations = new Map();
        
        this.init();
    }

    init() {
        this.setupAccessibilityFeatures();
        this.detectUserNeeds();
        this.bindAccessibilityEvents();
        this.createAccessibilityInterface();
        this.initializeAdaptiveSettings();
        this.startAccessibilityMonitoring();
        this.loadUserPreferences();
    }

    setupAccessibilityFeatures() {
        // Configuración de características de accesibilidad
        this.accessibilityFeatures.set('visual-impairment', {
            name: 'Accesibilidad Visual',
            features: {
                'high-contrast': {
                    name: 'Alto Contraste',
                    description: 'Aumenta el contraste para mejor visibilidad',
                    level: 'AA',
                    implementation: () => this.enableHighContrast()
                },
                'font-scaling': {
                    name: 'Escalado de Fuente',
                    description: 'Ajusta el tamaño del texto',
                    level: 'AA',
                    implementation: (scale) => this.scaleFonts(scale)
                },
                'color-blind-support': {
                    name: 'Soporte para Daltonismo',
                    description: 'Adaptaciones para deficiencias de color',
                    level: 'AA',
                    implementation: () => this.enableColorBlindSupport()
                },
                'focus-indicators': {
                    name: 'Indicadores de Foco Mejorados',
                    description: 'Indicadores visuales más prominentes',
                    level: 'AA',
                    implementation: () => this.enhanceFocusIndicators()
                },
                'reduced-motion': {
                    name: 'Movimiento Reducido',
                    description: 'Reduce animaciones y transiciones',
                    level: 'AAA',
                    implementation: () => this.reduceMotion()
                }
            }
        });

        this.accessibilityFeatures.set('motor-impairment', {
            name: 'Accesibilidad Motriz',
            features: {
                'large-touch-targets': {
                    name: 'Objetivos Táctiles Grandes',
                    description: 'Aumenta el tamaño de elementos interactivos',
                    level: 'AA',
                    implementation: () => this.enlargeTouchTargets()
                },
                'sticky-keys': {
                    name: 'Teclas Adhesivas',
                    description: 'Permite combinaciones de teclas secuenciales',
                    level: 'AAA',
                    implementation: () => this.enableStickyKeys()
                },
                'dwell-clicking': {
                    name: 'Click por Permanencia',
                    description: 'Activa elementos con permanencia del cursor',
                    level: 'AAA',
                    implementation: () => this.enableDwellClicking()
                },
                'keyboard-shortcuts': {
                    name: 'Atajos de Teclado Personalizados',
                    description: 'Permite personalizar atajos',
                    level: 'AA',
                    implementation: () => this.setupCustomShortcuts()
                }
            }
        });

        this.accessibilityFeatures.set('cognitive-support', {
            name: 'Soporte Cognitivo',
            features: {
                'simplified-interface': {
                    name: 'Interfaz Simplificada',
                    description: 'Reduce complejidad visual',
                    level: 'AAA',
                    implementation: () => this.simplifyInterface()
                },
                'reading-assistance': {
                    name: 'Asistencia de Lectura',
                    description: 'Ayudas para comprensión de texto',
                    level: 'AAA',
                    implementation: () => this.enableReadingAssistance()
                },
                'memory-aids': {
                    name: 'Ayudas de Memoria',
                    description: 'Recordatorios y guías contextuales',
                    level: 'AAA',
                    implementation: () => this.enableMemoryAids()
                },
                'focus-management': {
                    name: 'Gestión de Atención',
                    description: 'Reduce distracciones',
                    level: 'AA',
                    implementation: () => this.manageFocus()
                }
            }
        });

        this.accessibilityFeatures.set('hearing-impairment', {
            name: 'Accesibilidad Auditiva',
            features: {
                'visual-alerts': {
                    name: 'Alertas Visuales',
                    description: 'Convierte sonidos en señales visuales',
                    level: 'AA',
                    implementation: () => this.enableVisualAlerts()
                },
                'captions': {
                    name: 'Subtítulos',
                    description: 'Subtítulos para contenido multimedia',
                    level: 'AA',
                    implementation: () => this.enableCaptions()
                },
                'sign-language': {
                    name: 'Lengua de Señas',
                    description: 'Interpretación en lengua de señas',
                    level: 'AAA',
                    implementation: () => this.enableSignLanguage()
                },
                'haptic-feedback': {
                    name: 'Retroalimentación Háptica',
                    description: 'Feedback táctil para eventos sonoros',
                    level: 'AAA',
                    implementation: () => this.enableHapticFeedback()
                }
            }
        });
    }

    detectUserNeeds() {
        // Detectar necesidades de accesibilidad automáticamente
        const detections = {
            preferredColorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            highContrast: window.matchMedia('(prefers-contrast: high)').matches,
            reducedData: window.matchMedia('(prefers-reduced-data: reduce)').matches,
            touchDevice: 'ontouchstart' in window,
            screenReaderPresent: this.detectScreenReader(),
            largeScreen: window.innerWidth > 1200,
            smallScreen: window.innerWidth < 768
        };

        // Aplicar configuraciones automáticas basadas en detecciones
        this.applyAutomaticSettings(detections);
        
        // Ofrecer configuraciones adicionales
        this.suggestAccessibilityImprovements(detections);
    }

    detectScreenReader() {
        // Intentar detectar lectores de pantalla
        return (
            navigator.userAgent.includes('NVDA') ||
            navigator.userAgent.includes('JAWS') ||
            navigator.userAgent.includes('VoiceOver') ||
            document.querySelector('[aria-live]') !== null ||
            window.speechSynthesis?.speaking === true
        );
    }

    bindAccessibilityEvents() {
        // Eventos de accesibilidad
        document.addEventListener('accessibilityRequest', this.handleAccessibilityRequest.bind(this));
        document.addEventListener('settingsChange', this.handleSettingsChange.bind(this));
        document.addEventListener('userPreferenceUpdate', this.updateUserPreferences.bind(this));
        
        // Eventos de teclado para accesibilidad
        document.addEventListener('keydown', this.handleAccessibilityKeydown.bind(this));
        
        // Eventos de cambio de media queries
        this.setupMediaQueryListeners();
        
        // Eventos personalizados de AT (Assistive Technology)
        this.setupAssistiveTechnologyEvents();
    }

    setupMediaQueryListeners() {
        // Escuchar cambios en preferencias del sistema
        const mediaQueries = [
            { query: '(prefers-reduced-motion: reduce)', handler: this.handleReducedMotion.bind(this) },
            { query: '(prefers-contrast: high)', handler: this.handleHighContrast.bind(this) },
            { query: '(prefers-color-scheme: dark)', handler: this.handleDarkMode.bind(this) }
        ];

        mediaQueries.forEach(({ query, handler }) => {
            const mediaQuery = window.matchMedia(query);
            mediaQuery.addListener(handler);
            handler(mediaQuery); // Aplicar estado inicial
        });
    }

    createAccessibilityInterface() {
        const accessibilityPanel = document.createElement('div');
        accessibilityPanel.className = 'accessibility-controls-panel';
        accessibilityPanel.setAttribute('role', 'dialog');
        accessibilityPanel.setAttribute('aria-label', 'Controles de Accesibilidad');
        accessibilityPanel.innerHTML = `
            <div class="accessibility-header">
                <h2>Configuración de Accesibilidad</h2>
                <button class="accessibility-close" aria-label="Cerrar panel de accesibilidad">×</button>
            </div>
            
            <div class="accessibility-content">
                <div class="quick-actions">
                    <h3>Acciones Rápidas</h3>
                    <div class="quick-buttons">
                        <button class="quick-btn" data-action="high-contrast" aria-pressed="false">
                            <span class="btn-icon">🎨</span>
                            <span class="btn-text">Alto Contraste</span>
                        </button>
                        <button class="quick-btn" data-action="large-text" aria-pressed="false">
                            <span class="btn-icon">🔍</span>
                            <span class="btn-text">Texto Grande</span>
                        </button>
                        <button class="quick-btn" data-action="reduce-motion" aria-pressed="false">
                            <span class="btn-icon">⏸️</span>
                            <span class="btn-text">Reducir Movimiento</span>
                        </button>
                        <button class="quick-btn" data-action="focus-mode" aria-pressed="false">
                            <span class="btn-icon">🎯</span>
                            <span class="btn-text">Modo Foco</span>
                        </button>
                    </div>
                </div>
                
                <div class="accessibility-categories">
                    ${this.generateCategoriesHTML()}
                </div>
                
                <div class="accessibility-presets">
                    <h3>Configuraciones Predefinidas</h3>
                    <div class="preset-buttons">
                        <button class="preset-btn" data-preset="visual-impairment">
                            <span class="preset-icon">👁️</span>
                            <span class="preset-name">Discapacidad Visual</span>
                        </button>
                        <button class="preset-btn" data-preset="motor-impairment">
                            <span class="preset-icon">🤲</span>
                            <span class="preset-name">Discapacidad Motriz</span>
                        </button>
                        <button class="preset-btn" data-preset="cognitive-support">
                            <span class="preset-icon">🧠</span>
                            <span class="preset-name">Soporte Cognitivo</span>
                        </button>
                        <button class="preset-btn" data-preset="hearing-impairment">
                            <span class="preset-icon">👂</span>
                            <span class="preset-name">Discapacidad Auditiva</span>
                        </button>
                    </div>
                </div>
                
                <div class="accessibility-testing">
                    <h3>Herramientas de Prueba</h3>
                    <div class="testing-tools">
                        <button class="test-btn" data-test="keyboard-navigation">
                            Probar Navegación por Teclado
                        </button>
                        <button class="test-btn" data-test="screen-reader">
                            Simulador de Lector de Pantalla
                        </button>
                        <button class="test-btn" data-test="color-blindness">
                            Simulador de Daltonismo
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="accessibility-footer">
                <button class="reset-btn">Restaurar Configuración</button>
                <button class="save-btn">Guardar Preferencias</button>
            </div>
        `;

        // Crear botón de acceso rápido
        const accessibilityButton = document.createElement('button');
        accessibilityButton.className = 'accessibility-toggle';
        accessibilityButton.setAttribute('aria-label', 'Abrir configuración de accesibilidad');
        accessibilityButton.innerHTML = '♿';
        
        document.body.appendChild(accessibilityPanel);
        document.body.appendChild(accessibilityButton);

        // Configurar eventos
        this.setupAccessibilityPanelEvents(accessibilityPanel, accessibilityButton);
        
        // Hacer panel focusable pero inicialmente oculto
        accessibilityPanel.style.display = 'none';
        accessibilityPanel.setAttribute('tabindex', '-1');
    }

    generateCategoriesHTML() {
        return Array.from(this.accessibilityFeatures.entries()).map(([categoryId, category]) => `
            <div class="accessibility-category" data-category="${categoryId}">
                <h4>${category.name}</h4>
                <div class="category-features">
                    ${Object.entries(category.features).map(([featureId, feature]) => `
                        <div class="feature-control">
                            <div class="feature-info">
                                <label class="feature-label" for="${categoryId}-${featureId}">
                                    ${feature.name}
                                </label>
                                <p class="feature-description">${feature.description}</p>
                                <span class="feature-level">Nivel ${feature.level}</span>
                            </div>
                            <div class="feature-toggle">
                                <input type="checkbox" 
                                       id="${categoryId}-${featureId}" 
                                       data-category="${categoryId}"
                                       data-feature="${featureId}"
                                       class="accessibility-checkbox">
                                <label for="${categoryId}-${featureId}" class="toggle-label"></label>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    setupAccessibilityPanelEvents(panel, button) {
        // Abrir/cerrar panel
        button.addEventListener('click', () => {
            this.toggleAccessibilityPanel(panel);
        });

        panel.querySelector('.accessibility-close').addEventListener('click', () => {
            this.closeAccessibilityPanel(panel);
        });

        // Acciones rápidas
        panel.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const isPressed = btn.getAttribute('aria-pressed') === 'true';
                this.toggleQuickAction(action, !isPressed);
                btn.setAttribute('aria-pressed', !isPressed);
            });
        });

        // Configuraciones predefinidas
        panel.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyAccessibilityPreset(preset);
            });
        });

        // Controles de características individuales
        panel.querySelectorAll('.accessibility-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const category = checkbox.dataset.category;
                const feature = checkbox.dataset.feature;
                this.toggleAccessibilityFeature(category, feature, checkbox.checked);
            });
        });

        // Herramientas de prueba
        panel.querySelectorAll('.test-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const test = btn.dataset.test;
                this.runAccessibilityTest(test);
            });
        });

        // Botones de acción
        panel.querySelector('.reset-btn').addEventListener('click', () => {
            this.resetAccessibilitySettings();
        });

        panel.querySelector('.save-btn').addEventListener('click', () => {
            this.saveAccessibilityPreferences();
        });

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel.style.display !== 'none') {
                this.closeAccessibilityPanel(panel);
            }
        });
    }

    toggleAccessibilityPanel(panel) {
        const isHidden = panel.style.display === 'none';
        
        if (isHidden) {
            panel.style.display = 'block';
            panel.focus();
            this.trapFocus(panel);
        } else {
            this.closeAccessibilityPanel(panel);
        }
    }

    closeAccessibilityPanel(panel) {
        panel.style.display = 'none';
        document.querySelector('.accessibility-toggle').focus();
        this.releaseFocusTrap();
    }

    trapFocus(container) {
        const focusableElements = container.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        container.addEventListener('keydown', handleTabKey);
        this.focusTrapHandler = handleTabKey;
    }

    releaseFocusTrap() {
        if (this.focusTrapHandler) {
            document.removeEventListener('keydown', this.focusTrapHandler);
            this.focusTrapHandler = null;
        }
    }

    // Implementaciones de características de accesibilidad
    enableHighContrast() {
        document.body.classList.add('high-contrast-mode');
        this.updateAccessibilitySetting('high-contrast', true);
        this.announceChange('Modo de alto contraste activado');
    }

    scaleFonts(scale = 1.2) {
        document.documentElement.style.fontSize = `${scale}rem`;
        this.updateAccessibilitySetting('font-scale', scale);
        this.announceChange(`Tamaño de fuente ajustado a ${Math.round(scale * 100)}%`);
    }

    enableColorBlindSupport() {
        document.body.classList.add('color-blind-support');
        this.updateAccessibilitySetting('color-blind-support', true);
        this.announceChange('Soporte para daltonismo activado');
    }

    enhanceFocusIndicators() {
        document.body.classList.add('enhanced-focus');
        this.updateAccessibilitySetting('enhanced-focus', true);
        this.announceChange('Indicadores de foco mejorados activados');
    }

    reduceMotion() {
        document.body.classList.add('reduce-motion');
        this.updateAccessibilitySetting('reduce-motion', true);
        this.announceChange('Movimiento reducido activado');
    }

    enlargeTouchTargets() {
        document.body.classList.add('large-touch-targets');
        this.updateAccessibilitySetting('large-touch-targets', true);
        this.announceChange('Objetivos táctiles ampliados');
    }

    simplifyInterface() {
        document.body.classList.add('simplified-interface');
        this.updateAccessibilitySetting('simplified-interface', true);
        this.announceChange('Interfaz simplificada activada');
    }

    enableVisualAlerts() {
        document.body.classList.add('visual-alerts');
        this.updateAccessibilitySetting('visual-alerts', true);
        this.announceChange('Alertas visuales activadas');
    }

    toggleQuickAction(action, enabled) {
        const actions = {
            'high-contrast': () => enabled ? this.enableHighContrast() : this.disableHighContrast(),
            'large-text': () => enabled ? this.scaleFonts(1.3) : this.scaleFonts(1),
            'reduce-motion': () => enabled ? this.reduceMotion() : this.enableMotion(),
            'focus-mode': () => enabled ? this.enableFocusMode() : this.disableFocusMode()
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    applyAccessibilityPreset(preset) {
        // Aplicar configuraciones predefinidas según tipo de discapacidad
        this.resetAccessibilitySettings();
        
        const presets = {
            'visual-impairment': () => {
                this.enableHighContrast();
                this.scaleFonts(1.4);
                this.enhanceFocusIndicators();
                this.enableColorBlindSupport();
            },
            'motor-impairment': () => {
                this.enlargeTouchTargets();
                this.enableStickyKeys();
                this.enableDwellClicking();
                this.enhanceFocusIndicators();
            },
            'cognitive-support': () => {
                this.simplifyInterface();
                this.reduceMotion();
                this.enableReadingAssistance();
                this.enableMemoryAids();
            },
            'hearing-impairment': () => {
                this.enableVisualAlerts();
                this.enableCaptions();
                this.enableHapticFeedback();
            }
        };

        if (presets[preset]) {
            presets[preset]();
            this.announceChange(`Configuración predefinida "${preset}" aplicada`);
        }
    }

    runAccessibilityTest(testType) {
        const tests = {
            'keyboard-navigation': () => this.testKeyboardNavigation(),
            'screen-reader': () => this.simulateScreenReader(),
            'color-blindness': () => this.simulateColorBlindness()
        };

        if (tests[testType]) {
            tests[testType]();
        }
    }

    announceChange(message) {
        // Anunciar cambios a lectores de pantalla
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    updateAccessibilitySetting(setting, value) {
        this.accessibilitySettings.set(setting, value);
        
        // Emitir evento de cambio
        const event = new CustomEvent('accessibilitySettingChanged', {
            detail: { setting, value }
        });
        document.dispatchEvent(event);
    }

    saveAccessibilityPreferences() {
        const preferences = Object.fromEntries(this.accessibilitySettings);
        localStorage.setItem('accessibilityPreferences', JSON.stringify(preferences));
        this.announceChange('Preferencias de accesibilidad guardadas');
    }

    loadUserPreferences() {
        const saved = localStorage.getItem('accessibilityPreferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            Object.entries(preferences).forEach(([setting, value]) => {
                this.accessibilitySettings.set(setting, value);
                this.applyStoredSetting(setting, value);
            });
        }
    }

    applyStoredSetting(setting, value) {
        if (!value) return;

        const settingMethods = {
            'high-contrast': () => this.enableHighContrast(),
            'font-scale': () => this.scaleFonts(value),
            'reduce-motion': () => this.reduceMotion(),
            'enhanced-focus': () => this.enhanceFocusIndicators(),
            // ... más configuraciones
        };

        if (settingMethods[setting]) {
            settingMethods[setting]();
        }
    }

    resetAccessibilitySettings() {
        // Remover todas las clases de accesibilidad
        const accessibilityClasses = [
            'high-contrast-mode', 'color-blind-support', 'enhanced-focus',
            'reduce-motion', 'large-touch-targets', 'simplified-interface',
            'visual-alerts'
        ];

        accessibilityClasses.forEach(className => {
            document.body.classList.remove(className);
        });

        // Resetear font scale
        document.documentElement.style.fontSize = '';

        // Limpiar configuraciones
        this.accessibilitySettings.clear();
        
        this.announceChange('Configuración de accesibilidad restablecida');
    }

    // API pública
    getAccessibilitySettings() {
        return new Map(this.accessibilitySettings);
    }

    isAccessibilityFeatureEnabled(feature) {
        return this.accessibilitySettings.get(feature) === true;
    }

    requestAccessibilityFeature(feature, enabled = true) {
        const event = new CustomEvent('accessibilityRequest', {
            detail: { feature, enabled }
        });
        document.dispatchEvent(event);
    }

    getAccessibilityAudit() {
        return {
            enabledFeatures: Array.from(this.accessibilitySettings.keys()),
            complianceLevel: this.calculateComplianceLevel(),
            recommendations: this.generateRecommendations()
        };
    }

    calculateComplianceLevel() {
        const enabledFeatures = this.accessibilitySettings.size;
        const totalFeatures = this.getTotalAvailableFeatures();
        
        if (enabledFeatures >= totalFeatures * 0.8) return 'AAA';
        if (enabledFeatures >= totalFeatures * 0.6) return 'AA';
        if (enabledFeatures >= totalFeatures * 0.4) return 'A';
        return 'Básico';
    }

    getTotalAvailableFeatures() {
        let total = 0;
        this.accessibilityFeatures.forEach(category => {
            total += Object.keys(category.features).length;
        });
        return total;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (!this.isAccessibilityFeatureEnabled('high-contrast')) {
            recommendations.push('Considerar activar alto contraste para mejor visibilidad');
        }
        
        if (!this.isAccessibilityFeatureEnabled('enhanced-focus')) {
            recommendations.push('Activar indicadores de foco mejorados');
        }
        
        return recommendations;
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.accessibilityControls = new AccessibilityControlsManager();
});

export default AccessibilityControlsManager;