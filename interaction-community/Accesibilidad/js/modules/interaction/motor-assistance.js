/**
 * RAMA 7: Motor Assistance - Sistema de asistencia motora adaptativa
 * Mejora la accesibilidad para usuarios con limitaciones motoras
 */

class MotorAssistance {
    constructor() {
        this.assistanceLevel = 'auto';
        this.userProfile = null;
        this.interactions = [];
        this.adaptations = new Map();
        
        this.state = {
            enabled: true,
            dwellTimeEnabled: false,
            stickyKeysEnabled: false,
            hoverAssistEnabled: true,
            clickAssistEnabled: true,
            tremorCompensation: false,
            largeTargets: false
        };
        
        this.config = {
            // Configuración de dwell time
            dwellTime: 1500,
            dwellRadius: 20,
            dwellPreviewDelay: 800,
            
            // Configuración de hover assist
            hoverActivationDelay: 500,
            hoverHoldTime: 1000,
            magneticRange: 30,
            magneticStrength: 0.4,
            
            // Configuración de click assist
            clickToleranceRadius: 15,
            doubleClickWindow: 600,
            pressAndHoldDelay: 1000,
            
            // Configuración de tremor
            tremor: {
                detectionThreshold: 5,
                smoothingFactor: 0.3,
                stabilizationTime: 300,
                minMovementThreshold: 3
            },
            
            // Tamaños de elementos
            minTargetSize: 44, // píxeles
            enlargementFactor: 1.5,
            spacingIncrease: 8
        };
        
        this.init();
    }
    
    init() {
        this.detectMotorCapabilities();
        this.setupAssistiveTechnologies();
        this.enhanceInteractiveElements();
        this.bindMotorEvents();
        this.initializeAdaptations();
        this.startMotorTracking();
    }
    
    detectMotorCapabilities() {
        this.capabilities = {
            touchPrecision: 'unknown',
            clickStability: 'unknown',
            hoverCapability: true,
            tremor: false,
            dragCapability: true,
            alternativeInput: false
        };
        
        // Detectar dispositivos de entrada alternativos
        this.detectAlternativeInputs();
        
        // Analizar patrones de movimiento iniciales
        this.startCapabilityAnalysis();
    }
    
    detectAlternativeInputs() {
        // Detectar eye tracking, switch access, etc.
        const hasPointerEvents = 'onpointerdown' in window;
        const hasTouchEvents = 'ontouchstart' in window;
        const hasMouseEvents = 'onmousedown' in window;
        
        this.capabilities.alternativeInput = !!(
            navigator.userAgent.includes('Dragon') ||
            navigator.userAgent.includes('Switch') ||
            document.querySelector('[data-switch-access]') ||
            window.speechSynthesis
        );
        
        if (this.capabilities.alternativeInput) {
            this.enableAlternativeInputSupport();
        }
    }
    
    setupAssistiveTechnologies() {
        this.setupDwellTime();
        this.setupHoverAssist();
        this.setupClickAssist();
        this.setupTremorCompensation();
        this.setupLargeTargets();
    }
    
    setupDwellTime() {
        this.dwellState = {
            active: false,
            startTime: 0,
            startPosition: { x: 0, y: 0 },
            currentElement: null,
            timer: null,
            indicator: null
        };
        
        document.addEventListener('mousemove', this.handleDwellMove.bind(this));
        document.addEventListener('click', this.handleDwellClick.bind(this));
    }
    
    handleDwellMove(e) {
        if (!this.state.dwellTimeEnabled) return;
        
        const currentPos = { x: e.clientX, y: e.clientY };
        const element = e.target.closest('button, a, [role="button"], .participation-option');
        
        if (!element || !this.isInteractiveElement(element)) {
            this.stopDwell();
            return;
        }
        
        // Verificar si el cursor está dentro del radio de tolerancia
        if (this.dwellState.active) {
            const distance = this.calculateDistance(currentPos, this.dwellState.startPosition);
            
            if (distance > this.config.dwellRadius || element !== this.dwellState.currentElement) {
                this.stopDwell();
                this.startDwell(currentPos, element);
            }
        } else {
            this.startDwell(currentPos, element);
        }
    }
    
    startDwell(position, element) {
        this.dwellState = {
            active: true,
            startTime: Date.now(),
            startPosition: position,
            currentElement: element,
            timer: null,
            indicator: null
        };
        
        // Crear indicador visual después del delay
        setTimeout(() => {
            if (this.dwellState.active && this.dwellState.currentElement === element) {
                this.createDwellIndicator(position);
            }
        }, this.config.dwellPreviewDelay);
        
        // Configurar activación automática
        this.dwellState.timer = setTimeout(() => {
            if (this.dwellState.active) {
                this.activateDwell();
            }
        }, this.config.dwellTime);
    }
    
    stopDwell() {
        if (this.dwellState.timer) {
            clearTimeout(this.dwellState.timer);
        }
        
        if (this.dwellState.indicator) {
            this.dwellState.indicator.remove();
        }
        
        this.dwellState.active = false;
        this.dwellState.currentElement = null;
        this.dwellState.indicator = null;
    }
    
    createDwellIndicator(position) {
        this.dwellState.indicator = document.createElement('div');
        this.dwellState.indicator.className = 'dwell-indicator';
        this.dwellState.indicator.style.cssText = `
            position: fixed;
            left: ${position.x - 20}px;
            top: ${position.y - 20}px;
            width: 40px;
            height: 40px;
            border: 3px solid #ff6b35;
            border-radius: 50%;
            pointer-events: none;
            z-index: 10001;
            animation: dwellProgress ${this.config.dwellTime - this.config.dwellPreviewDelay}ms linear;
        `;
        
        if (!document.getElementById('dwell-styles')) {
            const styles = document.createElement('style');
            styles.id = 'dwell-styles';
            styles.textContent = `
                @keyframes dwellProgress {
                    0% { 
                        border-color: #ff6b35;
                        transform: scale(1);
                    }
                    50% { 
                        border-color: #f39c12;
                        transform: scale(1.2);
                    }
                    100% { 
                        border-color: #27ae60;
                        transform: scale(1.5);
                        border-width: 5px;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(this.dwellState.indicator);
    }
    
    activateDwell() {
        if (this.dwellState.currentElement) {
            // Crear evento sintético
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: this.dwellState.startPosition.x,
                clientY: this.dwellState.startPosition.y
            });
            
            this.dwellState.currentElement.dispatchEvent(clickEvent);
            this.announceAction('Elemento activado por dwell time');
        }
        
        this.stopDwell();
    }
    
    setupHoverAssist() {
        this.hoverState = {
            activeElements: new Set(),
            timers: new Map(),
            magneticElements: new Set()
        };
        
        document.addEventListener('mouseover', this.handleHoverAssistEnter.bind(this));
        document.addEventListener('mouseout', this.handleHoverAssistLeave.bind(this));
        document.addEventListener('mousemove', this.handleHoverAssistMove.bind(this));
    }
    
    handleHoverAssistEnter(e) {
        if (!this.state.hoverAssistEnabled) return;
        
        const element = e.target.closest('button, a, [role="button"], .participation-option');
        if (!element || !this.isInteractiveElement(element)) return;
        
        // Ampliar elemento si es necesario
        this.enlargeElement(element);
        
        // Configurar hover prolongado
        const timer = setTimeout(() => {
            this.activateHoverAssist(element);
        }, this.config.hoverActivationDelay);
        
        this.hoverState.timers.set(element, timer);
        this.hoverState.activeElements.add(element);
    }
    
    handleHoverAssistLeave(e) {
        const element = e.target.closest('button, a, [role="button"], .participation-option');
        if (!element) return;
        
        this.clearHoverTimer(element);
        this.restoreElement(element);
        this.hoverState.activeElements.delete(element);
    }
    
    handleHoverAssistMove(e) {
        if (!this.state.hoverAssistEnabled) return;
        
        // Aplicar efecto magnético
        this.applyMagneticEffect(e);
    }
    
    applyMagneticEffect(e) {
        const elements = document.querySelectorAll('button, a, [role="button"], .participation-option');
        
        elements.forEach(element => {
            if (!this.isInteractiveElement(element)) return;
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const distance = this.calculateDistance(
                { x: e.clientX, y: e.clientY },
                { x: centerX, y: centerY }
            );
            
            if (distance < this.config.magneticRange) {
                const force = (this.config.magneticRange - distance) / this.config.magneticRange;
                const pullX = (centerX - e.clientX) * this.config.magneticStrength * force;
                const pullY = (centerY - e.clientY) * this.config.magneticStrength * force;
                
                // Aplicar transformación magnética sutil
                element.style.transform = `translate(${pullX * 0.2}px, ${pullY * 0.2}px) scale(${1 + force * 0.1})`;
                element.style.transition = 'transform 0.1s ease-out';
                
                // Cambiar cursor para indicar magnetismo
                if (distance < this.config.magneticRange * 0.7) {
                    element.style.cursor = 'pointer';
                    document.body.style.cursor = 'pointer';
                }
            } else {
                element.style.transform = '';
                element.style.cursor = '';
            }
        });
    }
    
    setupClickAssist() {
        this.clickState = {
            lastClick: { x: 0, y: 0, time: 0 },
            clickHistory: [],
            stabilization: false
        };
        
        document.addEventListener('mousedown', this.handleClickAssistDown.bind(this));
        document.addEventListener('mouseup', this.handleClickAssistUp.bind(this));
        document.addEventListener('click', this.handleClickAssist.bind(this), true);
    }
    
    handleClickAssist(e) {
        if (!this.state.clickAssistEnabled) return;
        
        const currentClick = { x: e.clientX, y: e.clientY, time: Date.now() };
        
        // Verificar si el click está cerca de un elemento interactivo
        const targetElement = this.findNearestInteractive(currentClick);
        
        if (targetElement && targetElement !== e.target) {
            // Redirigir click al elemento más apropiado
            e.stopPropagation();
            e.preventDefault();
            
            const redirectedEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: currentClick.x,
                clientY: currentClick.y
            });
            
            targetElement.dispatchEvent(redirectedEvent);
            this.announceAction('Click redirigido al elemento más cercano');
        }
        
        this.clickState.lastClick = currentClick;
        this.clickState.clickHistory.push(currentClick);
        
        // Mantener solo los últimos 10 clicks
        if (this.clickState.clickHistory.length > 10) {
            this.clickState.clickHistory.shift();
        }
    }
    
    findNearestInteractive(clickPos) {
        const interactives = document.querySelectorAll('button, a, [role="button"], .participation-option, input, select, textarea');
        let nearest = null;
        let minDistance = this.config.clickToleranceRadius;
        
        interactives.forEach(element => {
            if (!this.isInteractiveElement(element)) return;
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const distance = this.calculateDistance(clickPos, { x: centerX, y: centerY });
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = element;
            }
        });
        
        return nearest;
    }
    
    setupTremorCompensation() {
        this.tremorState = {
            positions: [],
            smoothedPosition: { x: 0, y: 0 },
            lastStableTime: 0,
            isStabilizing: false
        };
        
        document.addEventListener('mousemove', this.handleTremorCompensation.bind(this));
    }
    
    handleTremorCompensation(e) {
        if (!this.state.tremorCompensation) return;
        
        const currentPos = { x: e.clientX, y: e.clientY, time: Date.now() };
        this.tremorState.positions.push(currentPos);
        
        // Mantener solo las últimas 10 posiciones
        if (this.tremorState.positions.length > 10) {
            this.tremorState.positions.shift();
        }
        
        // Detectar temblor
        if (this.detectTremor()) {
            this.applySmoothingFilter();
        }
    }
    
    detectTremor() {
        if (this.tremorState.positions.length < 5) return false;
        
        let totalMovement = 0;
        let directionChanges = 0;
        
        for (let i = 1; i < this.tremorState.positions.length; i++) {
            const prev = this.tremorState.positions[i - 1];
            const curr = this.tremorState.positions[i];
            
            const movement = this.calculateDistance(prev, curr);
            totalMovement += movement;
            
            if (i > 1) {
                const prevPrev = this.tremorState.positions[i - 2];
                const prevDirection = Math.atan2(curr.y - prev.y, curr.x - prev.x);
                const currDirection = Math.atan2(prev.y - prevPrev.y, prev.x - prevPrev.x);
                
                if (Math.abs(prevDirection - currDirection) > Math.PI / 4) {
                    directionChanges++;
                }
            }
        }
        
        const avgMovement = totalMovement / this.tremorState.positions.length;
        const tremor = avgMovement > this.config.tremor.detectionThreshold && directionChanges > 2;
        
        if (tremor && !this.capabilities.tremor) {
            this.capabilities.tremor = true;
            this.adaptToTremor();
        }
        
        return tremor;
    }
    
    applySmoothingFilter() {
        const positions = this.tremorState.positions;
        const factor = this.config.tremor.smoothingFactor;
        
        // Aplicar filtro de paso bajo
        let smoothX = positions[0].x;
        let smoothY = positions[0].y;
        
        for (let i = 1; i < positions.length; i++) {
            smoothX = smoothX * (1 - factor) + positions[i].x * factor;
            smoothY = smoothY * (1 - factor) + positions[i].y * factor;
        }
        
        this.tremorState.smoothedPosition = { x: smoothX, y: smoothY };
        
        // Estabilizar elementos interactivos
        this.stabilizeInteractiveElements();
    }
    
    stabilizeInteractiveElements() {
        const elements = document.querySelectorAll(':hover');
        elements.forEach(element => {
            if (this.isInteractiveElement(element)) {
                element.style.transition = 'all 0.3s ease-out';
                this.tremorState.isStabilizing = true;
                
                setTimeout(() => {
                    this.tremorState.isStabilizing = false;
                }, this.config.tremor.stabilizationTime);
            }
        });
    }
    
    setupLargeTargets() {
        if (this.state.largeTargets) {
            this.enlargeAllTargets();
        }
        
        // Observar nuevos elementos
        const observer = new MutationObserver((mutations) => {
            if (this.state.largeTargets) {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            this.enlargeElementTargets(node);
                        }
                    });
                });
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    enlargeAllTargets() {
        const targets = document.querySelectorAll('button, a, [role="button"], input, select, .participation-option');
        targets.forEach(target => this.enlargeTarget(target));
    }
    
    enlargeTarget(element) {
        if (element.dataset.motorEnlarged) return;
        
        const rect = element.getBoundingClientRect();
        const currentSize = Math.min(rect.width, rect.height);
        
        if (currentSize < this.config.minTargetSize) {
            const scale = this.config.minTargetSize / currentSize;
            element.style.transform = `scale(${scale})`;
            element.style.margin = `${this.config.spacingIncrease}px`;
            element.dataset.motorEnlarged = 'true';
        }
    }
    
    enhanceInteractiveElements() {
        const elements = document.querySelectorAll('button, a, [role="button"], .participation-option');
        
        elements.forEach(element => {
            this.enhanceElement(element);
        });
    }
    
    enhanceElement(element) {
        // Añadir indicadores de interactividad
        element.setAttribute('data-motor-enhanced', 'true');
        
        // Mejorar feedback visual
        element.addEventListener('mouseenter', () => {
            if (this.state.enabled) {
                element.style.outline = '2px solid #ff6b35';
                element.style.outlineOffset = '2px';
            }
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.outline = '';
            element.style.outlineOffset = '';
        });
        
        // Añadir soporte para activación prolongada
        let pressTimer = null;
        
        element.addEventListener('mousedown', () => {
            pressTimer = setTimeout(() => {
                this.activatePressAndHold(element);
            }, this.config.pressAndHoldDelay);
        });
        
        element.addEventListener('mouseup', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
    }
    
    activatePressAndHold(element) {
        // Mostrar menú contextual o acción alternativa
        const contextMenu = this.createContextMenu(element);
        if (contextMenu) {
            this.showContextMenu(element, contextMenu);
        }
    }
    
    createContextMenu(element) {
        const options = [];
        
        if (element.classList.contains('participation-option')) {
            options.push(
                { label: 'Activar opción', action: () => element.click() },
                { label: 'Ver detalles', action: () => this.showElementDetails(element) },
                { label: 'Ayuda', action: () => this.showElementHelp(element) }
            );
        } else if (element.tagName === 'BUTTON') {
            options.push(
                { label: 'Activar', action: () => element.click() },
                { label: 'Información', action: () => this.announceElementInfo(element) }
            );
        }
        
        return options.length > 0 ? options : null;
    }
    
    // === ANÁLISIS DE CAPACIDADES ===
    
    startCapabilityAnalysis() {
        this.analysisState = {
            clicks: [],
            movements: [],
            hovers: [],
            startTime: Date.now()
        };
        
        // Analizar durante los primeros 30 segundos
        setTimeout(() => {
            this.analyzeCapabilities();
        }, 30000);
        
        document.addEventListener('click', this.recordClick.bind(this));
        document.addEventListener('mousemove', this.recordMovement.bind(this));
    }
    
    recordClick(e) {
        this.analysisState.clicks.push({
            x: e.clientX,
            y: e.clientY,
            time: Date.now(),
            target: e.target.tagName
        });
    }
    
    recordMovement(e) {
        const now = Date.now();
        if (this.analysisState.movements.length === 0 || 
            now - this.analysisState.movements[this.analysisState.movements.length - 1].time > 50) {
            
            this.analysisState.movements.push({
                x: e.clientX,
                y: e.clientY,
                time: now
            });
        }
    }
    
    analyzeCapabilities() {
        const analysis = {
            clickAccuracy: this.analyzeClickAccuracy(),
            movementStability: this.analyzeMovementStability(),
            hoverPrecision: this.analyzeHoverPrecision()
        };
        
        // Aplicar adaptaciones basadas en el análisis
        this.applyAdaptations(analysis);
    }
    
    analyzeClickAccuracy() {
        const clicks = this.analysisState.clicks;
        if (clicks.length < 5) return 'insufficient_data';
        
        let missedClicks = 0;
        let totalClicks = clicks.length;
        
        clicks.forEach(click => {
            if (click.target === 'BODY' || click.target === 'DIV') {
                missedClicks++;
            }
        });
        
        const accuracy = (totalClicks - missedClicks) / totalClicks;
        
        if (accuracy < 0.7) return 'low';
        if (accuracy < 0.9) return 'medium';
        return 'high';
    }
    
    analyzeMovementStability() {
        const movements = this.analysisState.movements;
        if (movements.length < 20) return 'insufficient_data';
        
        let totalJitter = 0;
        for (let i = 1; i < movements.length; i++) {
            const distance = this.calculateDistance(movements[i - 1], movements[i]);
            const timeDiff = movements[i].time - movements[i - 1].time;
            const velocity = distance / timeDiff;
            
            if (velocity > 2) { // Movimiento rápido
                totalJitter += distance;
            }
        }
        
        const avgJitter = totalJitter / movements.length;
        
        if (avgJitter > 5) return 'unstable';
        if (avgJitter > 2) return 'moderate';
        return 'stable';
    }
    
    analyzeHoverPrecision() {
        // Analizar la precisión del hover basado en tiempo sobre elementos
        return 'medium'; // Implementación simplificada
    }
    
    applyAdaptations(analysis) {
        console.log('🔧 Análisis de capacidades:', analysis);
        
        if (analysis.clickAccuracy === 'low') {
            this.enableClickAssist();
            this.enableLargeTargets();
        }
        
        if (analysis.movementStability === 'unstable') {
            this.enableTremorCompensation();
            this.enableHoverAssist();
        }
        
        if (analysis.hoverPrecision === 'low') {
            this.enableDwellTime();
        }
    }
    
    // === UTILIDADES ===
    
    calculateDistance(pos1, pos2) {
        return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
    }
    
    isInteractiveElement(element) {
        const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
        const interactiveRoles = ['button', 'link', 'textbox', 'option'];
        const interactiveClasses = ['participation-option', 'btn-primary', 'btn-secondary'];
        
        return interactiveTags.includes(element.tagName) ||
               interactiveRoles.includes(element.getAttribute('role')) ||
               interactiveClasses.some(cls => element.classList.contains(cls)) ||
               element.hasAttribute('onclick') ||
               element.hasAttribute('tabindex');
    }
    
    announceAction(message) {
        if (window.screenReaderSupport) {
            window.screenReaderSupport.announce(message, 'main');
        }
    }
    
    // === API PÚBLICA ===
    
    enableDwellTime() {
        this.state.dwellTimeEnabled = true;
        this.announceAction('Dwell time activado');
    }
    
    enableHoverAssist() {
        this.state.hoverAssistEnabled = true;
        this.announceAction('Asistencia de hover activada');
    }
    
    enableClickAssist() {
        this.state.clickAssistEnabled = true;
        this.announceAction('Asistencia de click activada');
    }
    
    enableTremorCompensation() {
        this.state.tremorCompensation = true;
        this.announceAction('Compensación de temblor activada');
    }
    
    enableLargeTargets() {
        this.state.largeTargets = true;
        this.enlargeAllTargets();
        this.announceAction('Objetivos grandes activados');
    }
    
    setDwellTime(milliseconds) {
        this.config.dwellTime = Math.max(500, Math.min(5000, milliseconds));
    }
    
    setAssistanceLevel(level) {
        this.assistanceLevel = level;
        
        switch (level) {
            case 'minimal':
                this.state.hoverAssistEnabled = true;
                break;
            case 'moderate':
                this.state.hoverAssistEnabled = true;
                this.state.clickAssistEnabled = true;
                break;
            case 'full':
                Object.keys(this.state).forEach(key => {
                    if (typeof this.state[key] === 'boolean') {
                        this.state[key] = true;
                    }
                });
                break;
        }
        
        this.announceAction(`Nivel de asistencia cambiado a ${level}`);
    }
    
    getUserProfile() {
        return {
            assistanceLevel: this.assistanceLevel,
            capabilities: this.capabilities,
            preferences: this.state,
            adaptations: Array.from(this.adaptations.keys())
        };
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.motorAssistance = new MotorAssistance();
});

// CSS para asistencia motora
const motorStyles = document.createElement('style');
motorStyles.textContent = `
    [data-motor-enhanced]:focus {
        outline: 3px solid #ff6b35 !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 10px rgba(255, 107, 53, 0.5) !important;
    }
    
    .dwell-indicator {
        border-style: dashed !important;
        animation-timing-function: ease-in-out !important;
    }
    
    .motor-enlarged {
        transform-origin: center !important;
        transition: transform 0.2s ease !important;
    }
    
    .motor-magnetic {
        transition: transform 0.1s ease-out !important;
    }
`;
document.head.appendChild(motorStyles);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotorAssistance;
}