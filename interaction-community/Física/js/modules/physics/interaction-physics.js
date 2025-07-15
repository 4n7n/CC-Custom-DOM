/**
 * RAMA 7: Interaction Physics - Sistema de física de interacciones avanzadas
 * Maneja gestos, animaciones táctiles, efectos de partículas y micro-interacciones
 */

class InteractionPhysics {
    constructor() {
        this.elements = new Map();
        this.animations = new Map();
        this.particles = [];
        this.touches = new Map();
        
        this.state = {
            isInitialized: false,
            activeInteractions: 0,
            lastInteractionTime: 0,
            devicePixelRatio: window.devicePixelRatio || 1,
            performance: 'auto'
        };
        
        this.config = {
            // Configuración de física
            friction: 0.92,
            elasticity: 0.3,
            gravity: 0.4,
            maxVelocity: 15,
            
            // Configuración de partículas
            particleCount: 50,
            particleLife: 2000,
            particleSize: { min: 2, max: 6 },
            
            // Configuración de gestos
            swipeThreshold: 50,
            tapThreshold: 200,
            longPressThreshold: 500,
            
            // Configuración de animaciones
            springConfig: { tension: 200, friction: 20 },
            easeConfig: [0.25, 0.46, 0.45, 0.94],
            
            // Configuración de rendimiento
            maxFPS: 60,
            lowPowerThreshold: 30
        };
        
        this.init();
    }
    
    init() {
        this.detectDevice();
        this.setupCanvas();
        this.bindEvents();
        this.initializeElements();
        this.startAnimationLoop();
        this.state.isInitialized = true;
    }
    
    detectDevice() {
        this.device = {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isTouch: 'ontouchstart' in window,
            supportsPointer: !!window.PointerEvent,
            hasAccelerometer: !!window.DeviceMotionEvent,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
        
        // Ajustar configuración según dispositivo
        if (this.device.isMobile) {
            this.config.particleCount = 25;
            this.config.maxFPS = 30;
        }
        
        if (this.device.reducedMotion) {
            this.config.particleCount = 0;
            this.state.performance = 'low';
        }
    }
    
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'interaction-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.8;
        `;
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        document.body.appendChild(this.canvas);
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const rect = document.body.getBoundingClientRect();
        this.canvas.width = rect.width * this.state.devicePixelRatio;
        this.canvas.height = rect.height * this.state.devicePixelRatio;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(this.state.devicePixelRatio, this.state.devicePixelRatio);
    }
    
    bindEvents() {
        // Eventos universales
        this.bindUniversalEvents();
        
        // Eventos específicos según soporte
        if (this.device.supportsPointer) {
            this.bindPointerEvents();
        } else if (this.device.isTouch) {
            this.bindTouchEvents();
        } else {
            this.bindMouseEvents();
        }
        
        // Eventos de teclado
        this.bindKeyboardEvents();
        
        // Eventos de dispositivo móvil
        if (this.device.hasAccelerometer) {
            this.bindMotionEvents();
        }
    }
    
    bindUniversalEvents() {
        // Evento de visibilidad para optimización
        document.addEventListener('visibilitychange', () => {
            this.state.performance = document.hidden ? 'paused' : 'auto';
        });
        
        // Eventos de formulario para efectos especiales
        document.addEventListener('focus', this.handleFocus.bind(this), true);
        document.addEventListener('blur', this.handleBlur.bind(this), true);
        document.addEventListener('input', this.handleInput.bind(this), true);
    }
    
    bindPointerEvents() {
        document.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        document.addEventListener('pointermove', this.handlePointerMove.bind(this));
        document.addEventListener('pointerup', this.handlePointerUp.bind(this));
        document.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
    }
    
    bindTouchEvents() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        document.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
    }
    
    bindMouseEvents() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }
    
    bindKeyboardEvents() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
    
    bindMotionEvents() {
        window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
        window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
    }
    
    initializeElements() {
        // Inicializar elementos interactivos existentes
        this.initParticipationElements();
        this.initModalElements();
        this.initButtonElements();
        this.initFormElements();
    }
    
    initParticipationElements() {
        const participationElements = document.querySelectorAll('.participation-prompt, .participation-option');
        participationElements.forEach(element => {
            this.addHoverPhysics(element);
            this.addClickPhysics(element);
            this.addMagneticEffect(element);
        });
    }
    
    initModalElements() {
        const modalElements = document.querySelectorAll('.modal-content, .step');
        modalElements.forEach(element => {
            this.addSlidePhysics(element);
            this.addScalePhysics(element);
        });
    }
    
    initButtonElements() {
        const buttons = document.querySelectorAll('button, .btn-primary, .btn-secondary');
        buttons.forEach(button => {
            this.addRippleEffect(button);
            this.addPressPhysics(button);
            this.addSuccessEffect(button);
        });
    }
    
    initFormElements() {
        const formElements = document.querySelectorAll('input, textarea, select');
        formElements.forEach(element => {
            this.addFocusPhysics(element);
            this.addTypingEffect(element);
            this.addValidationPhysics(element);
        });
    }
    
    // === EFECTOS DE HOVER ===
    
    addHoverPhysics(element) {
        let isHovered = false;
        let hoverAnimation = null;
        
        const mouseEnter = () => {
            if (isHovered) return;
            isHovered = true;
            
            this.cancelAnimation(hoverAnimation);
            hoverAnimation = this.animateElement(element, {
                transform: 'translateY(-4px) scale(1.02)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
                filter: 'brightness(1.05)'
            }, 300, 'ease-out');
            
            this.createHoverParticles(element);
        };
        
        const mouseLeave = () => {
            if (!isHovered) return;
            isHovered = false;
            
            this.cancelAnimation(hoverAnimation);
            hoverAnimation = this.animateElement(element, {
                transform: 'translateY(0) scale(1)',
                boxShadow: '',
                filter: 'brightness(1)'
            }, 200, 'ease-in');
        };
        
        element.addEventListener('mouseenter', mouseEnter);
        element.addEventListener('mouseleave', mouseLeave);
        
        this.elements.set(element, { mouseEnter, mouseLeave, hoverAnimation });
    }
    
    // === EFECTOS DE CLICK ===
    
    addClickPhysics(element) {
        const handleClick = (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.createClickExplosion(x + rect.left, y + rect.top);
            this.addClickWave(element, x, y);
            this.addPunchEffect(element);
        };
        
        element.addEventListener('click', handleClick);
        this.elements.set(element, { ...this.elements.get(element), handleClick });
    }
    
    addRippleEffect(button) {
        const handleRipple = (e) => {
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.6);
                transform: scale(0);
                animation: ripple 600ms ease-out;
                left: ${x}px;
                top: ${y}px;
                width: ${size}px;
                height: ${size}px;
                pointer-events: none;
            `;
            
            if (!document.getElementById('ripple-styles')) {
                const styles = document.createElement('style');
                styles.id = 'ripple-styles';
                styles.textContent = `
                    @keyframes ripple {
                        to { transform: scale(2); opacity: 0; }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            const buttonStyle = getComputedStyle(button);
            if (buttonStyle.position === 'static') {
                button.style.position = 'relative';
            }
            button.style.overflow = 'hidden';
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        };
        
        button.addEventListener('click', handleRipple);
    }
    
    // === EFECTOS MAGNÉTICOS ===
    
    addMagneticEffect(element) {
        let magneticArea = null;
        const magneticStrength = 0.3;
        const magneticRadius = 100;
        
        const handleMouseMove = (e) => {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
            );
            
            if (distance < magneticRadius) {
                const factor = (magneticRadius - distance) / magneticRadius;
                const moveX = (e.clientX - centerX) * magneticStrength * factor;
                const moveY = (e.clientY - centerY) * magneticStrength * factor;
                
                element.style.transform = `translate(${moveX}px, ${moveY}px)`;
            } else {
                element.style.transform = '';
            }
        };
        
        const handleMouseLeave = () => {
            element.style.transform = '';
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);
    }
    
    // === EFECTOS DE PARTÍCULAS ===
    
    createClickExplosion(x, y) {
        if (this.state.performance === 'low') return;
        
        const particleCount = 12;
        const colors = ['#ff6b35', '#f39c12', '#e74c3c', '#9b59b6', '#3498db'];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 3 + Math.random() * 4;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 1000 + Math.random() * 500,
                maxLife: 1000 + Math.random() * 500,
                size: 3 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                type: 'explosion'
            });
        }
    }
    
    createHoverParticles(element) {
        if (this.state.performance === 'low') return;
        
        const rect = element.getBoundingClientRect();
        const particleCount = 5;
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: rect.left + Math.random() * rect.width,
                y: rect.bottom,
                vx: (Math.random() - 0.5) * 2,
                vy: -2 - Math.random() * 2,
                life: 2000,
                maxLife: 2000,
                size: 2 + Math.random() * 2,
                color: 'rgba(102, 126, 234, 0.6)',
                type: 'hover'
            });
        }
    }
    
    // === EFECTOS DE FORMULARIO ===
    
    addFocusPhysics(element) {
        const handleFocus = () => {
            this.animateElement(element, {
                transform: 'scale(1.02)',
                boxShadow: '0 0 20px rgba(255, 107, 53, 0.3)',
                borderColor: '#ff6b35'
            }, 200);
            
            this.createFocusGlow(element);
        };
        
        const handleBlur = () => {
            this.animateElement(element, {
                transform: 'scale(1)',
                boxShadow: '',
                borderColor: ''
            }, 200);
        };
        
        element.addEventListener('focus', handleFocus);
        element.addEventListener('blur', handleBlur);
    }
    
    addTypingEffect(element) {
        if (element.tagName !== 'TEXTAREA' && element.type !== 'text') return;
        
        let typingTimer = null;
        
        const handleInput = () => {
            element.style.borderColor = '#27ae60';
            
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                element.style.borderColor = '';
            }, 500);
            
            // Efecto de partículas al escribir
            if (Math.random() < 0.1) { // 10% de probabilidad
                const rect = element.getBoundingClientRect();
                this.particles.push({
                    x: rect.right - 10,
                    y: rect.top + Math.random() * rect.height,
                    vx: 1 + Math.random(),
                    vy: -1 - Math.random(),
                    life: 1000,
                    maxLife: 1000,
                    size: 1 + Math.random(),
                    color: 'rgba(39, 174, 96, 0.8)',
                    type: 'typing'
                });
            }
        };
        
        element.addEventListener('input', handleInput);
    }
    
    // === GESTIÓN DE EVENTOS TÁCTILES ===
    
    handleTouchStart(e) {
        Array.from(e.changedTouches).forEach(touch => {
            this.touches.set(touch.identifier, {
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now(),
                currentX: touch.clientX,
                currentY: touch.clientY,
                element: document.elementFromPoint(touch.clientX, touch.clientY)
            });
        });
    }
    
    handleTouchMove(e) {
        Array.from(e.changedTouches).forEach(touch => {
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                touchData.currentX = touch.clientX;
                touchData.currentY = touch.clientY;
                
                // Crear estela de partículas durante el movimiento
                if (Math.random() < 0.3) {
                    this.particles.push({
                        x: touch.clientX,
                        y: touch.clientY,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        life: 800,
                        maxLife: 800,
                        size: 2 + Math.random() * 2,
                        color: 'rgba(118, 75, 162, 0.5)',
                        type: 'trail'
                    });
                }
            }
        });
    }
    
    handleTouchEnd(e) {
        Array.from(e.changedTouches).forEach(touch => {
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                const duration = Date.now() - touchData.startTime;
                const distanceX = Math.abs(touch.clientX - touchData.startX);
                const distanceY = Math.abs(touch.clientY - touchData.startY);
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                
                // Detectar gestos
                if (duration < this.config.tapThreshold && distance < 10) {
                    this.handleTap(touchData);
                } else if (distance > this.config.swipeThreshold) {
                    this.handleSwipe(touchData, touch);
                } else if (duration > this.config.longPressThreshold) {
                    this.handleLongPress(touchData);
                }
                
                this.touches.delete(touch.identifier);
            }
        });
    }
    
    handleTap(touchData) {
        this.createClickExplosion(touchData.currentX, touchData.currentY);
        
        if (touchData.element) {
            this.addPunchEffect(touchData.element);
        }
    }
    
    handleSwipe(touchData, touch) {
        const velocityX = (touch.clientX - touchData.startX) / (Date.now() - touchData.startTime);
        const velocityY = (touch.clientY - touchData.startY) / (Date.now() - touchData.startTime);
        
        // Crear partículas de barrido
        const particleCount = Math.min(20, Math.abs(velocityX) + Math.abs(velocityY) * 5);
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: touchData.currentX,
                y: touchData.currentY,
                vx: velocityX * 0.5 + (Math.random() - 0.5) * 3,
                vy: velocityY * 0.5 + (Math.random() - 0.5) * 3,
                life: 1500,
                maxLife: 1500,
                size: 2 + Math.random() * 3,
                color: 'rgba(155, 89, 182, 0.7)',
                type: 'swipe'
            });
        }
    }
    
    // === EFECTOS ESPECIALES ===
    
    addPunchEffect(element) {
        const animation = element.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(0.95)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' }
        ], {
            duration: 300,
            easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        });
        
        return animation;
    }
    
    addClickWave(element, x, y) {
        const wave = document.createElement('div');
        wave.style.cssText = `
            position: absolute;
            left: ${x - 20}px;
            top: ${y - 20}px;
            width: 40px;
            height: 40px;
            border: 2px solid rgba(255, 107, 53, 0.6);
            border-radius: 50%;
            pointer-events: none;
            animation: wave-expand 600ms ease-out forwards;
        `;
        
        if (!document.getElementById('wave-styles')) {
            const styles = document.createElement('style');
            styles.id = 'wave-styles';
            styles.textContent = `
                @keyframes wave-expand {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(3); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        element.style.position = 'relative';
        element.appendChild(wave);
        
        setTimeout(() => wave.remove(), 600);
    }
    
    createFocusGlow(element) {
        const glow = document.createElement('div');
        glow.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background: radial-gradient(circle, rgba(255, 107, 53, 0.3) 0%, transparent 70%);
            border-radius: inherit;
            pointer-events: none;
            animation: glow-pulse 2s ease-in-out infinite;
            z-index: -1;
        `;
        
        if (!document.getElementById('glow-styles')) {
            const styles = document.createElement('style');
            styles.id = 'glow-styles';
            styles.textContent = `
                @keyframes glow-pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.1); }
                }
            `;
            document.head.appendChild(styles);
        }
        
        element.style.position = 'relative';
        element.appendChild(glow);
        
        setTimeout(() => glow.remove(), 2000);
    }
    
    // === LOOP DE ANIMACIÓN ===
    
    startAnimationLoop() {
        let lastFrame = 0;
        const targetFPS = this.config.maxFPS;
        const frameInterval = 1000 / targetFPS;
        
        const animate = (currentTime) => {
            if (this.state.performance === 'paused') {
                requestAnimationFrame(animate);
                return;
            }
            
            if (currentTime - lastFrame >= frameInterval) {
                this.updateParticles();
                this.renderParticles();
                lastFrame = currentTime;
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Actualizar posición
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Aplicar gravedad y fricción
            if (particle.type !== 'hover') {
                particle.vy += this.config.gravity;
            }
            particle.vx *= this.config.friction;
            particle.vy *= this.config.friction;
            
            // Reducir vida
            particle.life -= 16; // ~60fps
            
            // Eliminar partículas muertas
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    renderParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const size = particle.size * alpha;
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    // === UTILIDADES ===
    
    animateElement(element, styles, duration = 300, easing = 'ease') {
        return element.animate([
            {},
            styles
        ], {
            duration,
            easing,
            fill: 'forwards'
        });
    }
    
    cancelAnimation(animation) {
        if (animation && animation.cancel) {
            animation.cancel();
        }
    }
    
    // === MANEJADORES DE EVENTOS ESPECÍFICOS ===
    
    handleFocus(e) {
        this.state.lastInteractionTime = Date.now();
        this.state.activeInteractions++;
    }
    
    handleBlur(e) {
        this.state.activeInteractions = Math.max(0, this.state.activeInteractions - 1);
    }
    
    handleInput(e) {
        this.state.lastInteractionTime = Date.now();
    }
    
    handleKeyDown(e) {
        // Efectos especiales para teclas específicas
        if (e.key === 'Enter') {
            this.createKeyPressEffect(e.target);
        }
    }
    
    createKeyPressEffect(element) {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        this.createClickExplosion(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );
    }
    
    // === API PÚBLICA ===
    
    addCustomEffect(element, effectType, options = {}) {
        switch (effectType) {
            case 'hover':
                this.addHoverPhysics(element);
                break;
            case 'click':
                this.addClickPhysics(element);
                break;
            case 'magnetic':
                this.addMagneticEffect(element);
                break;
            case 'ripple':
                this.addRippleEffect(element);
                break;
            default:
                console.warn(`Efecto desconocido: ${effectType}`);
        }
    }
    
    setPerformanceMode(mode) {
        this.state.performance = mode;
        
        if (mode === 'low') {
            this.config.particleCount = 0;
            this.particles = [];
        } else if (mode === 'high') {
            this.config.particleCount = 100;
        }
    }
    
    destroy() {
        // Limpiar eventos y elementos
        this.elements.clear();
        this.animations.clear();
        this.particles = [];
        this.touches.clear();
        
        if (this.canvas) {
            this.canvas.remove();
        }
        
        this.state.isInitialized = false;
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.interactionPhysics = new InteractionPhysics();
});

// Integración con scroll-physics si existe
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        if (window.scrollPhysics && window.interactionPhysics) {
            // Sincronizar efectos entre ambos sistemas
            console.log('🎨 Sistemas de física sincronizados');
        }
    });
}

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractionPhysics;
}