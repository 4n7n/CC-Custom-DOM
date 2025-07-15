// Sistema de UX para donaciones
class DonationUX {
    constructor() {
        this.animations = {
            enabled: true,
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        };
        this.sounds = {
            enabled: false, // Por defecto deshabilitado
            success: null,
            error: null,
            click: null
        };
        this.feedback = {
            haptic: 'vibrate' in navigator,
            visual: true,
            audio: false
        };
        this.init();
    }

    init() {
        this.setupInteractions();
        this.initializeAccessibility();
        this.setupProgressiveEnhancement();
        this.loadUserPreferences();
    }

    setupInteractions() {
        this.setupHoverEffects();
        this.setupClickFeedback();
        this.setupKeyboardNavigation();
        this.setupFormEnhancements();
        this.setupScrollEffects();
    }

    setupHoverEffects() {
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('amount-btn')) {
                this.animateAmountButton(e.target, 'hover');
            }
            
            if (e.target.classList.contains('donate-btn')) {
                this.animateDonateButton(e.target, 'hover');
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('amount-btn')) {
                this.animateAmountButton(e.target, 'normal');
            }
            
            if (e.target.classList.contains('donate-btn')) {
                this.animateDonateButton(e.target, 'normal');
            }
        });
    }

    animateAmountButton(button, state) {
        if (!this.animations.enabled) return;

        const scale = state === 'hover' ? 1.05 : 1;
        const shadow = state === 'hover' ? '0 8px 25px rgba(102, 126, 234, 0.3)' : '';
        
        button.style.transform = `scale(${scale})`;
        button.style.boxShadow = shadow;
        button.style.transition = `all ${this.animations.duration}ms ${this.animations.easing}`;
    }

    animateDonateButton(button, state) {
        if (!this.animations.enabled) return;

        const translateY = state === 'hover' ? -2 : 0;
        const shadow = state === 'hover' ? '0 8px 25px rgba(102, 126, 234, 0.4)' : '';
        
        button.style.transform = `translateY(${translateY}px)`;
        button.style.boxShadow = shadow;
        button.style.transition = `all ${this.animations.duration}ms ${this.animations.easing}`;
    }

    setupClickFeedback() {
        document.addEventListener('click', (e) => {
            if (this.isDonationElement(e.target)) {
                this.provideFeedback(e.target, 'click');
                this.createRippleEffect(e);
            }
        });
    }

    isDonationElement(element) {
        const donationClasses = [
            'amount-btn', 'donate-btn', 'micro-amount-btn',
            'submit-donation', 'payment-method'
        ];
        return donationClasses.some(cls => element.classList.contains(cls));
    }

    provideFeedback(element, type) {
        // Feedback háptico
        if (this.feedback.haptic && navigator.vibrate) {
            navigator.vibrate(type === 'click' ? 50 : 100);
        }

        // Feedback visual
        if (this.feedback.visual) {
            this.addVisualFeedback(element, type);
        }

        // Feedback auditivo
        if (this.feedback.audio && this.sounds.enabled) {
            this.playSound(type);
        }
    }

    addVisualFeedback(element, type) {
        element.classList.add('feedback-active');
        
        setTimeout(() => {
            element.classList.remove('feedback-active');
        }, 150);
    }

    createRippleEffect(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;

        // Asegurar que el botón tenga position relative
        if (getComputedStyle(button).position === 'static') {
            button.style.position = 'relative';
        }
        
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (this.isDonationElement(e.target)) {
                    e.preventDefault();
                    e.target.click();
                }
            }

            // Navegación con flechas entre botones de cantidad
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                this.handleArrowNavigation(e);
            }
        });

        // Agregar indicadores de foco
        document.addEventListener('focusin', (e) => {
            if (this.isDonationElement(e.target)) {
                e.target.classList.add('keyboard-focus');
            }
        });

        document.addEventListener('focusout', (e) => {
            if (this.isDonationElement(e.target)) {
                e.target.classList.remove('keyboard-focus');
            }
        });
    }

    handleArrowNavigation(event) {
        const amountButtons = document.querySelectorAll('.amount-btn');
        const currentIndex = Array.from(amountButtons).indexOf(event.target);
        
        if (currentIndex === -1) return;

        event.preventDefault();
        
        let nextIndex;
        if (event.key === 'ArrowLeft') {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : amountButtons.length - 1;
        } else {
            nextIndex = currentIndex < amountButtons.length - 1 ? currentIndex + 1 : 0;
        }

        amountButtons[nextIndex].focus();
        amountButtons[nextIndex].click();
    }

    setupFormEnhancements() {
        // Validación en tiempo real
        document.querySelectorAll('input[type="email"]').forEach(input => {
            input.addEventListener('blur', (e) => {
                this.validateEmail(e.target);
            });
        });

        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.validateAmount(e.target);
            });
        });

        // Auto-formato de números
        document.querySelectorAll('.custom-amount').forEach(input => {
            input.addEventListener('input', (e) => {
                this.formatCurrency(e.target);
            });
        });

        // Mejoras de accesibilidad para formularios
        this.enhanceFormAccessibility();
    }

    validateEmail(input) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
        this.updateFieldValidation(input, isValid, 'Email inválido');
    }

    validateAmount(input) {
        const amount = parseFloat(input.value);
        const isValid = amount >= 1 && amount <= 10000;
        this.updateFieldValidation(input, isValid, 'Cantidad debe estar entre €1 y €10,000');
    }

    updateFieldValidation(input, isValid, errorMessage) {
        const container = input.closest('.form-group') || input.parentElement;
        
        // Remover estados anteriores
        container.classList.remove('error', 'success');
        
        // Remover mensajes de error anteriores
        const existingError = container.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        if (input.value) {
            if (isValid) {
                container.classList.add('success');
                input.setAttribute('aria-invalid', 'false');
            } else {
                container.classList.add('error');
                input.setAttribute('aria-invalid', 'true');
                
                const errorEl = document.createElement('div');
                errorEl.className = 'field-error';
                errorEl.textContent = errorMessage;
                errorEl.setAttribute('role', 'alert');
                container.appendChild(errorEl);
            }
        }
    }

    formatCurrency(input) {
        let value = input.value.replace(/[^\d]/g, '');
        if (value) {
            // Formatear como moneda sin símbolo
            value = parseInt(value).toLocaleString();
            input.value = value;
        }
    }

    enhanceFormAccessibility() {
        // Agregar ARIA labels y descripciones
        document.querySelectorAll('.amount-btn').forEach((btn, index) => {
            btn.setAttribute('role', 'button');
            btn.setAttribute('aria-label', `Donar ${btn.textContent}`);
            btn.setAttribute('tabindex', '0');
        });

        // Mejorar formularios con ARIA
        document.querySelectorAll('input[required]').forEach(input => {
            input.setAttribute('aria-required', 'true');
        });

        // Agregar descripciones a campos importantes
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            if (!input.getAttribute('aria-describedby')) {
                const description = document.createElement('div');
                description.id = `${input.id || 'email'}-desc`;
                description.className = 'field-description';
                description.textContent = 'Utilizaremos este email para enviar la confirmación';
                input.parentElement.appendChild(description);
                input.setAttribute('aria-describedby', description.id);
            }
        });
    }

    setupScrollEffects() {
        // Intersection Observer para animaciones al hacer scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateOnScroll(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observar elementos de donación
        document.querySelectorAll('.donation-widget, .impact-calculator, .progress-card').forEach(el => {
            observer.observe(el);
        });
    }

    animateOnScroll(element) {
        if (!this.animations.enabled) return;

        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = `all 0.8s ${this.animations.easing}`;

        // Trigger animation
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    setupProgressiveEnhancement() {
        // Detectar capacidades del dispositivo
        this.detectCapabilities();
        
        // Optimizar para conexiones lentas
        this.optimizeForConnection();
        
        // Ajustar según el dispositivo
        this.adaptToDevice();
    }

    detectCapabilities() {
        // Detectar soporte para animaciones
        this.animations.enabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Detectar soporte para haptic feedback
        this.feedback.haptic = 'vibrate' in navigator;
        
        // Detectar conexión lenta
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
            this.animations.enabled = false;
        }
    }

    optimizeForConnection() {
        const connection = navigator.connection;
        if (connection) {
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                // Reducir animaciones y efectos
                this.animations.enabled = false;
                this.feedback.visual = false;
                
                // Simplificar UI
                document.body.classList.add('low-bandwidth');
            }
        }
    }

    adaptToDevice() {
        // Detectar dispositivos táctiles
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (isTouchDevice) {
            document.body.classList.add('touch-device');
            
            // Ajustar tamaños de botones para touch
            const style = document.createElement('style');
            style.textContent = `
                .touch-device .amount-btn,
                .touch-device .donate-btn {
                    min-height: 44px;
                    min-width: 44px;
                }
            `;
            document.head.appendChild(style);
        }

        // Detectar modo oscuro del sistema
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode-preferred');
        }
    }

    loadUserPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('donationUXPreferences') || '{}');
            
            if (prefs.animations !== undefined) {
                this.animations.enabled = prefs.animations;
            }
            
            if (prefs.sounds !== undefined) {
                this.sounds.enabled = prefs.sounds;
            }
            
            if (prefs.haptic !== undefined) {
                this.feedback.haptic = prefs.haptic && ('vibrate' in navigator);
            }
        } catch (error) {
            console.log('No se pudieron cargar las preferencias de UX');
        }
    }

    saveUserPreferences() {
        const prefs = {
            animations: this.animations.enabled,
            sounds: this.sounds.enabled,
            haptic: this.feedback.haptic
        };
        
        try {
            localStorage.setItem('donationUXPreferences', JSON.stringify(prefs));
        } catch (error) {
            console.log('No se pudieron guardar las preferencias de UX');
        }
    }

    playSound(type) {
        if (!this.sounds.enabled || !this.sounds[type]) return;
        
        try {
            this.sounds[type].currentTime = 0;
            this.sounds[type].play().catch(() => {
                // Ignorar errores de audio
            });
        } catch (error) {
            // Audio no disponible
        }
    }

    // API pública para configuración
    enableAnimations(enabled = true) {
        this.animations.enabled = enabled;
        this.saveUserPreferences();
    }

    enableSounds(enabled = true) {
        this.sounds.enabled = enabled;
        this.saveUserPreferences();
    }

    enableHapticFeedback(enabled = true) {
        this.feedback.haptic = enabled && ('vibrate' in navigator);
        this.saveUserPreferences();
    }

    showAccessibilityMenu() {
        const menu = document.createElement('div');
        menu.className = 'accessibility-menu';
        menu.innerHTML = `
            <div class="menu-overlay"></div>
            <div class="menu-content">
                <h3>Preferencias de Accesibilidad</h3>
                
                <div class="preference-group">
                    <label>
                        <input type="checkbox" ${this.animations.enabled ? 'checked' : ''} data-pref="animations">
                        Habilitar animaciones
                    </label>
                </div>
                
                <div class="preference-group">
                    <label>
                        <input type="checkbox" ${this.sounds.enabled ? 'checked' : ''} data-pref="sounds">
                        Habilitar sonidos
                    </label>
                </div>
                
                <div class="preference-group">
                    <label>
                        <input type="checkbox" ${this.feedback.haptic ? 'checked' : ''} data-pref="haptic">
                        Feedback háptico
                    </label>
                </div>
                
                <div class="menu-actions">
                    <button class="save-preferences">Guardar</button>
                    <button class="close-menu">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Event listeners
        menu.querySelector('.save-preferences').addEventListener('click', () => {
            const checkboxes = menu.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                const pref = cb.dataset.pref;
                switch(pref) {
                    case 'animations':
                        this.enableAnimations(cb.checked);
                        break;
                    case 'sounds':
                        this.enableSounds(cb.checked);
                        break;
                    case 'haptic':
                        this.enableHapticFeedback(cb.checked);
                        break;
                }
            });
            
            menu.remove();
            this.showMessage('Preferencias guardadas', 'success');
        });
        
        menu.querySelector('.close-menu').addEventListener('click', () => {
            menu.remove();
        });
        
        menu.querySelector('.menu-overlay').addEventListener('click', () => {
            menu.remove();
        });
    }

    showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.className = `ux-message ux-message-${type}`;
        message.textContent = text;
        message.setAttribute('role', 'alert');
        
        document.body.appendChild(message);
        
        // Animación de entrada
        requestAnimationFrame(() => {
            message.classList.add('show');
        });
        
        setTimeout(() => {
            message.classList.add('hide');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    // Funciones de utilidad para desarrolladores
    addCustomAnimation(selector, animation) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.animation = animation;
        });
    }

    createCustomRipple(element, color = 'rgba(255, 255, 255, 0.5)') {
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        const ripple = document.createElement('span');
        ripple.className = 'custom-ripple';
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0);
            background: ${color};
            border-radius: 50%;
            animation: customRipple 0.6s linear;
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    highlightElement(selector, duration = 2000) {
        const element = document.querySelector(selector);
        if (!element) return;
        
        element.style.outline = '3px solid #667eea';
        element.style.outlineOffset = '2px';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            element.style.outline = '';
            element.style.outlineOffset = '';
        }, duration);
    }

    createTooltip(element, text, position = 'top') {
        const tooltip = document.createElement('div');
        tooltip.className = `donation-tooltip tooltip-${position}`;
        tooltip.textContent = text;
        tooltip.setAttribute('role', 'tooltip');
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left, top;
        
        switch(position) {
            case 'top':
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                top = rect.top - tooltipRect.height - 8;
                break;
            case 'bottom':
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                top = rect.bottom + 8;
                break;
            case 'left':
                left = rect.left - tooltipRect.width - 8;
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                break;
            case 'right':
                left = rect.right + 8;
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                break;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        
        // Animación de entrada
        requestAnimationFrame(() => {
            tooltip.classList.add('show');
        });
        
        return tooltip;
    }

    removeTooltip(tooltip) {
        if (tooltip && tooltip.parentNode) {
            tooltip.classList.remove('show');
            setTimeout(() => tooltip.remove(), 200);
        }
    }

    // Método para crear onboarding/tutorial
    createOnboardingFlow(steps) {
        let currentStep = 0;
        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        
        const showStep = (stepIndex) => {
            if (stepIndex >= steps.length) {
                overlay.remove();
                return;
            }
            
            const step = steps[stepIndex];
            const target = document.querySelector(step.selector);
            
            if (!target) {
                showStep(stepIndex + 1);
                return;
            }
            
            overlay.innerHTML = `
                <div class="onboarding-backdrop"></div>
                <div class="onboarding-spotlight"></div>
                <div class="onboarding-content">
                    <h3>${step.title}</h3>
                    <p>${step.description}</p>
                    <div class="onboarding-actions">
                        ${stepIndex > 0 ? '<button class="prev-step">Anterior</button>' : ''}
                        <button class="next-step">${stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}</button>
                        <button class="skip-onboarding">Saltar</button>
                    </div>
                    <div class="step-indicator">
                        ${stepIndex + 1} de ${steps.length}
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            // Posicionar spotlight
            const rect = target.getBoundingClientRect();
            const spotlight = overlay.querySelector('.onboarding-spotlight');
            spotlight.style.cssText = `
                left: ${rect.left - 10}px;
                top: ${rect.top - 10}px;
                width: ${rect.width + 20}px;
                height: ${rect.height + 20}px;
            `;
            
            // Event listeners
            overlay.querySelector('.next-step')?.addEventListener('click', () => {
                showStep(stepIndex + 1);
            });
            
            overlay.querySelector('.prev-step')?.addEventListener('click', () => {
                showStep(stepIndex - 1);
            });
            
            overlay.querySelector('.skip-onboarding')?.addEventListener('click', () => {
                overlay.remove();
            });
            
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        
        showStep(0);
    }

    // Performance monitoring
    measureInteractionDelay() {
        const measurements = [];
        
        document.addEventListener('click', (e) => {
            if (this.isDonationElement(e.target)) {
                const start = performance.now();
                
                requestAnimationFrame(() => {
                    const end = performance.now();
                    const delay = end - start;
                    measurements.push(delay);
                    
                    // Log if delay is too high
                    if (delay > 100) {
                        console.warn(`Slow interaction detected: ${delay}ms`);
                    }
                });
            }
        });
        
        return measurements;
    }

    // Método para debugging UX
    debugMode(enabled = true) {
        if (enabled) {
            document.body.classList.add('ux-debug');
            
            // Mostrar información de elementos interactivos
            document.querySelectorAll('[class*="btn"], [class*="button"]').forEach(el => {
                el.addEventListener('mouseenter', () => {
                    console.log('Element info:', {
                        element: el,
                        classes: Array.from(el.classList),
                        dimensions: el.getBoundingClientRect(),
                        computed: getComputedStyle(el)
                    });
                });
            });
        } else {
            document.body.classList.remove('ux-debug');
        }
    }
}

// Estilos CSS dinámicos para UX
const uxStyles = `
.feedback-active {
    transform: scale(0.95) !important;
    transition: transform 0.1s ease !important;
}

.keyboard-focus {
    outline: 2px solid #667eea !important;
    outline-offset: 2px !important;
}

.ripple-effect {
    animation: ripple 0.6s linear !important;
}

@keyframes ripple {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

@keyframes customRipple {
    to {
        transform: translate(-50%, -50%) scale(4);
        opacity: 0;
    }
}

.ux-message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
}

.ux-message.show {
    transform: translateX(0);
}

.ux-message.hide {
    transform: translateX(100%);
}

.ux-message-success {
    background: #38a169;
}

.ux-message-error {
    background: #e53e3e;
}

.ux-message-info {
    background: #3182ce;
}

.donation-tooltip {
    position: absolute;
    background: #2d3748;
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.2s ease;
    z-index: 10000;
    pointer-events: none;
}

.donation-tooltip.show {
    opacity: 1;
    transform: scale(1);
}

.field-error {
    color: #e53e3e;
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.field-description {
    color: #4a5568;
    font-size: 0.8rem;
    margin-top: 0.25rem;
}

.accessibility-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
}

.menu-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
}

.menu-content {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    position: relative;
}

.preference-group {
    margin: 1rem 0;
}

.preference-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.menu-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
}

.menu-actions button {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}

.save-preferences {
    background: #38a169;
    color: white;
}

.close-menu {
    background: #e2e8f0;
    color: #4a5568;
}

.onboarding-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10002;
}

.onboarding-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
}

.onboarding-spotlight {
    position: absolute;
    background: transparent;
    border: 2px solid #667eea;
    border-radius: 8px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8);
}

.onboarding-content {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    text-align: center;
}

.onboarding-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    justify-content: center;
}

.onboarding-actions button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}

.next-step {
    background: #667eea;
    color: white;
}

.prev-step, .skip-onboarding {
    background: #e2e8f0;
    color: #4a5568;
}

.step-indicator {
    margin-top: 1rem;
    color: #4a5568;
    font-size: 0.875rem;
}

@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

.low-bandwidth .donation-widget,
.low-bandwidth .impact-calculator {
    box-shadow: none !important;
    border: 1px solid #e2e8f0 !important;
}

.touch-device .amount-btn:hover {
    transform: none !important;
}

.ux-debug [class*="btn"]:hover::after {
    content: attr(class);
    position: absolute;
    top: -30px;
    left: 0;
    background: #2d3748;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    white-space: nowrap;
    z-index: 1000;
}
`;

// Inyectar estilos
const styleSheet = document.createElement('style');
styleSheet.textContent = uxStyles;
document.head.appendChild(styleSheet);

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.donationUX = new DonationUX();
});

// Exportar para uso global
window.DonationUX = DonationUX;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DonationUX;
}