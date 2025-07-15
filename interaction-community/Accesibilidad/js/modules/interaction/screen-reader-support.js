/**
 * RAMA 7: Screen Reader Support - Soporte completo para lectores de pantalla
 * Mejora la accesibilidad del sistema de participación comunitaria
 */

class ScreenReaderSupport {
    constructor() {
        this.announcements = [];
        this.focusHistory = [];
        this.liveRegions = new Map();
        
        this.state = {
            enabled: true,
            verbosity: 'normal', // minimal, normal, verbose
            language: 'es',
            announceProgress: true,
            announceChanges: true
        };
        
        this.config = {
            announcementDelay: 100,
            maxAnnouncementLength: 200,
            focusTimeout: 3000,
            liveRegionTypes: ['polite', 'assertive', 'status']
        };
        
        this.init();
    }
    
    init() {
        this.detectScreenReader();
        this.setupLiveRegions();
        this.enhanceParticipationElements();
        this.bindAccessibilityEvents();
        this.setupKeyboardNavigation();
        this.initializeARIA();
    }
    
    detectScreenReader() {
        this.screenReader = {
            detected: false,
            type: 'unknown',
            supportsLiveRegions: true,
            supportsARIA: true
        };
        
        // Detectar lectores de pantalla comunes
        const userAgent = navigator.userAgent.toLowerCase();
        const hasScreenReader = 
            'speechSynthesis' in window ||
            userAgent.includes('nvda') ||
            userAgent.includes('jaws') ||
            userAgent.includes('dragon') ||
            document.querySelector('[role="application"]') ||
            window.navigator.userAgent.includes('Screen');
        
        if (hasScreenReader) {
            this.screenReader.detected = true;
            this.enableScreenReaderMode();
        }
        
        // Detectar preferencias de accesibilidad
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.state.verbosity = 'minimal';
        }
    }
    
    setupLiveRegions() {
        // Región principal para anuncios
        this.createLiveRegion('main-announcements', 'polite', 'main');
        
        // Región para progreso
        this.createLiveRegion('progress-announcements', 'polite', 'progress');
        
        // Región para errores
        this.createLiveRegion('error-announcements', 'assertive', 'errors');
        
        // Región para éxitos
        this.createLiveRegion('success-announcements', 'polite', 'success');
        
        // Región para estado
        this.createLiveRegion('status-announcements', 'status', 'status');
    }
    
    createLiveRegion(id, politeness, purpose) {
        const region = document.createElement('div');
        region.id = id;
        region.setAttribute('aria-live', politeness);
        region.setAttribute('aria-atomic', 'true');
        region.setAttribute('role', politeness === 'status' ? 'status' : 'region');
        region.setAttribute('aria-label', `Anuncios de ${purpose}`);
        region.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        
        document.body.appendChild(region);
        this.liveRegions.set(purpose, region);
    }
    
    enhanceParticipationElements() {
        this.enhancePrompt();
        this.enhanceModal();
        this.enhanceOptions();
        this.enhanceForm();
        this.enhanceTracking();
    }
    
    enhancePrompt() {
        const prompt = document.querySelector('.participation-prompt');
        if (!prompt) return;
        
        prompt.setAttribute('role', 'dialog');
        prompt.setAttribute('aria-labelledby', 'prompt-title');
        prompt.setAttribute('aria-describedby', 'prompt-description');
        
        const title = prompt.querySelector('h3');
        if (title) {
            title.id = 'prompt-title';
        }
        
        // Añadir descripción oculta
        const description = document.createElement('div');
        description.id = 'prompt-description';
        description.className = 'sr-only';
        description.textContent = 'Opciones para participar en la historia actual. Use las teclas de flecha para navegar entre opciones.';
        prompt.appendChild(description);
        
        // Manejar visibilidad
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class') {
                    const isVisible = prompt.classList.contains('show');
                    if (isVisible) {
                        this.announce('Opciones de participación disponibles', 'main');
                        setTimeout(() => prompt.focus(), 200);
                    }
                }
            });
        });
        
        observer.observe(prompt, { attributes: true });
        
        // Hacer focusable
        prompt.setAttribute('tabindex', '0');
    }
    
    enhanceModal() {
        const modal = document.querySelector('.participation-modal');
        if (!modal) return;
        
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modal-title');
        
        const title = modal.querySelector('.modal-header h2');
        if (title) {
            title.id = 'modal-title';
        }
        
        // Manejar apertura/cierre
        const modalObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class') {
                    const isOpen = modal.classList.contains('show');
                    if (isOpen) {
                        this.trapFocus(modal);
                        this.announce('Modal de contribución abierto', 'main');
                    } else {
                        this.releaseFocus();
                        this.announce('Modal cerrado', 'main');
                    }
                }
            });
        });
        
        modalObserver.observe(modal, { attributes: true });
    }
    
    enhanceOptions() {
        const options = document.querySelectorAll('.participation-option');
        options.forEach((option, index) => {
            option.setAttribute('role', 'button');
            option.setAttribute('tabindex', '0');
            option.setAttribute('aria-describedby', `option-desc-${index}`);
            
            const title = option.querySelector('h4').textContent;
            const desc = option.querySelector('.option-description').textContent;
            const requirements = option.querySelector('.option-requirements').textContent;
            const rewards = option.querySelector('.option-rewards').textContent;
            
            // Crear descripción completa
            const fullDesc = document.createElement('div');
            fullDesc.id = `option-desc-${index}`;
            fullDesc.className = 'sr-only';
            fullDesc.textContent = `${desc}. ${requirements}. ${rewards}`;
            option.appendChild(fullDesc);
            
            // Eventos de teclado
            option.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    option.click();
                    this.announce(`Opción seleccionada: ${title}`, 'main');
                }
            });
            
            // Feedback de selección
            option.addEventListener('click', () => {
                this.announce(`${title} seleccionado`, 'main');
            });
        });
    }
    
    enhanceForm() {
        this.enhanceTextarea();
        this.enhanceSteps();
        this.enhanceValidation();
        this.enhanceProgress();
    }
    
    enhanceTextarea() {
        const textarea = document.querySelector('.contribution-text');
        if (!textarea) return;
        
        textarea.setAttribute('aria-describedby', 'textarea-help textarea-count');
        
        // Ayuda contextual
        const help = document.createElement('div');
        help.id = 'textarea-help';
        help.className = 'sr-only';
        help.textContent = 'Escribe tu contribución aquí. El contador de caracteres se anunciará automáticamente.';
        textarea.parentNode.insertBefore(help, textarea);
        
        // Contador accesible
        const counter = document.querySelector('.character-count');
        if (counter) {
            counter.id = 'textarea-count';
            counter.setAttribute('aria-live', 'polite');
            counter.setAttribute('role', 'status');
        }
        
        // Anunciar cambios en el contador
        let lastCount = 0;
        textarea.addEventListener('input', () => {
            const currentCount = textarea.value.length;
            const maxLength = this.getMaxLength();
            
            // Anunciar cada 50 caracteres o cerca del límite
            if (currentCount % 50 === 0 || 
                currentCount > maxLength - 20 ||
                Math.abs(currentCount - lastCount) > 10) {
                
                const remaining = maxLength - currentCount;
                let message = '';
                
                if (remaining < 0) {
                    message = `Exceso de ${Math.abs(remaining)} caracteres`;
                } else if (remaining < 20) {
                    message = `${remaining} caracteres restantes`;
                } else {
                    message = `${currentCount} caracteres escritos`;
                }
                
                this.announce(message, 'status');
            }
            
            lastCount = currentCount;
        });
    }
    
    enhanceSteps() {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            step.setAttribute('role', 'tabpanel');
            step.setAttribute('aria-labelledby', `step-title-${index}`);
            step.setAttribute('tabindex', '0');
            
            const title = step.querySelector('h3');
            if (title) {
                title.id = `step-title-${index}`;
            }
            
            // Observar cambios de paso activo
            const stepObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName === 'class') {
                        const isActive = step.classList.contains('active');
                        if (isActive) {
                            const stepNumber = index + 1;
                            const stepTitle = title ? title.textContent : `Paso ${stepNumber}`;
                            this.announce(`${stepTitle}. Paso ${stepNumber} de 3`, 'main');
                            
                            setTimeout(() => {
                                const firstFocusable = this.findFirstFocusable(step);
                                if (firstFocusable) firstFocusable.focus();
                            }, 300);
                        }
                    }
                });
            });
            
            stepObserver.observe(step, { attributes: true });
        });
    }
    
    enhanceValidation() {
        // Mejorar mensajes de error
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.validateField(e.target);
            }
        });
        
        // Observar errores de validación
        const validationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('validation-error')) {
                        const errorText = node.textContent;
                        this.announce(`Error de validación: ${errorText}`, 'errors');
                        
                        // Enfocar el campo con error
                        const field = node.closest('.step').querySelector('input, textarea, select');
                        if (field) {
                            setTimeout(() => field.focus(), 100);
                        }
                    }
                });
            });
        });
        
        validationObserver.observe(document.body, { childList: true, subtree: true });
    }
    
    enhanceProgress() {
        const progressBar = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressBar && progressText) {
            progressText.setAttribute('role', 'progressbar');
            progressText.setAttribute('aria-live', 'polite');
            
            const progressObserver = new MutationObserver(() => {
                const currentStep = progressText.textContent;
                this.announce(`Progreso: ${currentStep}`, 'progress');
            });
            
            progressObserver.observe(progressText, { childList: true, characterData: true });
        }
    }
    
    enhanceTracking() {
        const trackingPanel = document.querySelector('.participation-tracking-panel');
        if (!trackingPanel) return;
        
        trackingPanel.setAttribute('role', 'complementary');
        trackingPanel.setAttribute('aria-label', 'Panel de seguimiento de participación');
        
        // Hacer métricas accesibles
        const metrics = trackingPanel.querySelectorAll('.metric-item');
        metrics.forEach(metric => {
            const name = metric.querySelector('.metric-name').textContent;
            const value = metric.querySelector('.metric-value').textContent;
            
            metric.setAttribute('role', 'status');
            metric.setAttribute('aria-label', `${name}: ${value}`);
        });
    }
    
    // === NAVEGACIÓN POR TECLADO ===
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboard(e);
        });
        
        // Navegación en opciones
        const prompt = document.querySelector('.participation-prompt');
        if (prompt) {
            prompt.addEventListener('keydown', (e) => {
                this.handleOptionsNavigation(e);
            });
        }
        
        // Navegación en modal
        const modal = document.querySelector('.participation-modal');
        if (modal) {
            modal.addEventListener('keydown', (e) => {
                this.handleModalNavigation(e);
            });
        }
    }
    
    handleGlobalKeyboard(e) {
        // Atajos globales
        if (e.altKey) {
            switch (e.key) {
                case 'p':
                    e.preventDefault();
                    this.focusParticipationPrompt();
                    break;
                case 'm':
                    e.preventDefault();
                    this.focusModal();
                    break;
                case 't':
                    e.preventDefault();
                    this.focusTrackingPanel();
                    break;
                case 'h':
                    e.preventDefault();
                    this.announceHelp();
                    break;
            }
        }
        
        // Escape para cerrar
        if (e.key === 'Escape') {
            this.handleEscape();
        }
    }
    
    handleOptionsNavigation(e) {
        const options = Array.from(document.querySelectorAll('.participation-option'));
        const currentIndex = options.findIndex(opt => opt === document.activeElement);
        
        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % options.length;
                options[nextIndex].focus();
                break;
                
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                const prevIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
                options[prevIndex].focus();
                break;
                
            case 'Home':
                e.preventDefault();
                options[0].focus();
                break;
                
            case 'End':
                e.preventDefault();
                options[options.length - 1].focus();
                break;
        }
    }
    
    handleModalNavigation(e) {
        if (e.key === 'F6') {
            e.preventDefault();
            this.cycleFocusAreas();
        }
    }
    
    // === GESTIÓN DE FOCO ===
    
    trapFocus(container) {
        this.lastFocusedElement = document.activeElement;
        
        const focusables = this.getFocusableElements(container);
        if (focusables.length === 0) return;
        
        const firstFocusable = focusables[0];
        const lastFocusable = focusables[focusables.length - 1];
        
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
        
        firstFocusable.focus();
    }
    
    releaseFocus() {
        if (this.lastFocusedElement) {
            this.lastFocusedElement.focus();
            this.lastFocusedElement = null;
        }
    }
    
    getFocusableElements(container) {
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(container.querySelectorAll(selector))
            .filter(el => !el.disabled && !el.hidden && el.offsetParent !== null);
    }
    
    findFirstFocusable(container) {
        const focusables = this.getFocusableElements(container);
        return focusables.length > 0 ? focusables[0] : null;
    }
    
    // === ANUNCIOS ===
    
    announce(message, type = 'main', priority = 'normal') {
        if (!this.state.enabled) return;
        
        const region = this.liveRegions.get(type);
        if (!region) return;
        
        // Ajustar mensaje según verbosidad
        const processedMessage = this.processMessage(message, priority);
        
        setTimeout(() => {
            region.textContent = processedMessage;
            
            // Limpiar después de anunciar
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }, this.config.announcementDelay);
        
        this.announcements.push({
            message: processedMessage,
            type,
            timestamp: Date.now()
        });
    }
    
    processMessage(message, priority) {
        if (this.state.verbosity === 'minimal' && priority !== 'high') {
            return message.substring(0, 50);
        }
        
        if (message.length > this.config.maxAnnouncementLength) {
            return message.substring(0, this.config.maxAnnouncementLength) + '...';
        }
        
        return message;
    }
    
    // === UTILIDADES ===
    
    validateField(field) {
        const isValid = field.checkValidity();
        const fieldName = field.getAttribute('aria-label') || field.name || 'Campo';
        
        if (!isValid) {
            const errorMessage = field.validationMessage || 'Valor inválido';
            this.announce(`${fieldName}: ${errorMessage}`, 'errors');
        }
    }
    
    getMaxLength() {
        const textarea = document.querySelector('.contribution-text');
        const maxSpan = document.querySelector('.character-count .max');
        return maxSpan ? parseInt(maxSpan.textContent) : 500;
    }
    
    focusParticipationPrompt() {
        const prompt = document.querySelector('.participation-prompt');
        if (prompt && prompt.classList.contains('show')) {
            prompt.focus();
            this.announce('Enfocado en opciones de participación', 'main');
        }
    }
    
    focusModal() {
        const modal = document.querySelector('.participation-modal');
        if (modal && modal.classList.contains('show')) {
            const firstFocusable = this.findFirstFocusable(modal);
            if (firstFocusable) firstFocusable.focus();
            this.announce('Enfocado en modal de contribución', 'main');
        }
    }
    
    focusTrackingPanel() {
        const panel = document.querySelector('.participation-tracking-panel');
        if (panel) {
            panel.focus();
            this.announce('Enfocado en panel de seguimiento', 'main');
        }
    }
    
    announceHelp() {
        const helpText = `
            Atajos disponibles: 
            Alt+P para opciones de participación,
            Alt+M para modal,
            Alt+T para panel de seguimiento,
            Escape para cerrar,
            F6 para cambiar áreas de enfoque
        `;
        this.announce(helpText, 'main');
    }
    
    handleEscape() {
        const modal = document.querySelector('.participation-modal.show');
        const prompt = document.querySelector('.participation-prompt.show');
        
        if (modal && window.scrollPhysics) {
            window.scrollPhysics.closeModal();
        } else if (prompt && window.scrollPhysics) {
            window.scrollPhysics.hidePrompt();
        }
    }
    
    cycleFocusAreas() {
        const areas = [
            '.modal-header',
            '.participation-steps .step.active',
            '.modal-actions'
        ];
        
        let currentArea = -1;
        for (let i = 0; i < areas.length; i++) {
            const area = document.querySelector(areas[i]);
            if (area && area.contains(document.activeElement)) {
                currentArea = i;
                break;
            }
        }
        
        const nextArea = (currentArea + 1) % areas.length;
        const targetArea = document.querySelector(areas[nextArea]);
        
        if (targetArea) {
            const firstFocusable = this.findFirstFocusable(targetArea);
            if (firstFocusable) firstFocusable.focus();
        }
    }
    
    enableScreenReaderMode() {
        document.body.classList.add('screen-reader-mode');
        this.state.enabled = true;
        this.announce('Modo de lector de pantalla activado', 'main');
    }
    
    initializeARIA() {
        // Añadir roles y propiedades ARIA faltantes
        const elementsToEnhance = [
            { selector: '.cultural-weight', role: 'meter' },
            { selector: '.achievement-card', role: 'article' },
            { selector: '.metric-item', role: 'status' }
        ];
        
        elementsToEnhance.forEach(({ selector, role }) => {
            document.querySelectorAll(selector).forEach(el => {
                if (!el.getAttribute('role')) {
                    el.setAttribute('role', role);
                }
            });
        });
    }
    
    // === CONFIGURACIÓN PÚBLICA ===
    
    setVerbosity(level) {
        this.state.verbosity = level;
        this.announce(`Verbosidad cambiada a ${level}`, 'status');
    }
    
    setLanguage(lang) {
        this.state.language = lang;
        document.documentElement.setAttribute('lang', lang);
    }
    
    toggle() {
        this.state.enabled = !this.state.enabled;
        const status = this.state.enabled ? 'activado' : 'desactivado';
        this.announce(`Soporte de lector de pantalla ${status}`, 'main');
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.screenReaderSupport = new ScreenReaderSupport();
});

// CSS adicional para lectores de pantalla
const srStyles = document.createElement('style');
srStyles.textContent = `
    .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        border: 0 !important;
    }
    
    .screen-reader-mode * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    
    .screen-reader-mode *:focus {
        outline: 3px solid #ff6b35 !important;
        outline-offset: 2px !important;
    }
`;
document.head.appendChild(srStyles);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenReaderSupport;
}