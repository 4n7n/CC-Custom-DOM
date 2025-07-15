/**
 * RAMA 7: Touch Gestures - Gestos táctiles para narrativa inmersiva
 * Maneja interacciones táctiles específicas para la experiencia cultural
 */

class TouchGestureManager {
    constructor() {
        this.touches = new Map();
        this.isGestureActive = false;
        this.currentGesture = null;
        this.gestureThreshold = 30;
        this.pinchThreshold = 0.1;
        this.longPressDelay = 800;
        this.narrativeGestures = new Map();
        
        this.init();
    }

    init() {
        this.setupTouchEvents();
        this.defineNarrativeGestures();
        this.createGestureIndicators();
    }

    setupTouchEvents() {
        const options = { passive: false };
        
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), options);
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), options);
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), options);
        document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), options);
    }

    handleTouchStart(event) {
        event.preventDefault();
        
        Array.from(event.changedTouches).forEach(touch => {
            this.touches.set(touch.identifier, {
                id: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: Date.now(),
                element: event.target
            });
        });

        this.detectGestureStart();
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        Array.from(event.changedTouches).forEach(touch => {
            if (this.touches.has(touch.identifier)) {
                const touchData = this.touches.get(touch.identifier);
                touchData.currentX = touch.clientX;
                touchData.currentY = touch.clientY;
                this.touches.set(touch.identifier, touchData);
            }
        });

        this.processGesture();
    }

    handleTouchEnd(event) {
        Array.from(event.changedTouches).forEach(touch => {
            if (this.touches.has(touch.identifier)) {
                const touchData = this.touches.get(touch.identifier);
                this.processGestureEnd(touchData);
                this.touches.delete(touch.identifier);
            }
        });

        if (this.touches.size === 0) {
            this.resetGesture();
        }
    }

    handleTouchCancel(event) {
        this.handleTouchEnd(event);
    }

    detectGestureStart() {
        const touchCount = this.touches.size;
        
        if (touchCount === 1) {
            this.startLongPressTimer();
        } else if (touchCount === 2) {
            this.currentGesture = 'pinch';
            this.initializePinch();
        } else if (touchCount === 3) {
            this.currentGesture = 'triple-tap';
            this.triggerNarrativeGesture('reveal-secrets');
        }
    }

    processGesture() {
        if (this.touches.size === 1) {
            this.processSingleTouch();
        } else if (this.touches.size === 2) {
            this.processPinch();
        }
    }

    processSingleTouch() {
        const touch = Array.from(this.touches.values())[0];
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.gestureThreshold) {
            this.clearLongPressTimer();
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Gesto horizontal
                this.currentGesture = deltaX > 0 ? 'swipe-right' : 'swipe-left';
                this.processSwipeGesture(this.currentGesture, deltaX);
            } else {
                // Gesto vertical
                this.currentGesture = deltaY > 0 ? 'swipe-down' : 'swipe-up';
                this.processSwipeGesture(this.currentGesture, deltaY);
            }
        }
    }

    processSwipeGesture(direction, delta) {
        const intensity = Math.min(Math.abs(delta) / 100, 1);
        
        const swipeActions = {
            'swipe-right': () => this.triggerNarrativeGesture('next-story', { intensity }),
            'swipe-left': () => this.triggerNarrativeGesture('prev-story', { intensity }),
            'swipe-up': () => this.triggerNarrativeGesture('explore-up', { intensity }),
            'swipe-down': () => this.triggerNarrativeGesture('explore-down', { intensity })
        };

        if (swipeActions[direction]) {
            swipeActions[direction]();
        }
    }

    processPinch() {
        const touches = Array.from(this.touches.values());
        if (touches.length !== 2) return;

        const [touch1, touch2] = touches;
        const currentDistance = this.getDistance(touch1, touch2);
        
        if (!this.initialPinchDistance) {
            this.initialPinchDistance = currentDistance;
            return;
        }

        const scale = currentDistance / this.initialPinchDistance;
        const scaleChange = scale - (this.lastScale || 1);
        
        if (Math.abs(scaleChange) > this.pinchThreshold) {
            if (scale > 1.1) {
                this.triggerNarrativeGesture('zoom-in', { scale });
            } else if (scale < 0.9) {
                this.triggerNarrativeGesture('zoom-out', { scale });
            }
            this.lastScale = scale;
        }
    }

    getDistance(touch1, touch2) {
        const deltaX = touch2.currentX - touch1.currentX;
        const deltaY = touch2.currentY - touch1.currentY;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    initializePinch() {
        this.initialPinchDistance = null;
        this.lastScale = 1;
    }

    startLongPressTimer() {
        this.clearLongPressTimer();
        this.longPressTimer = setTimeout(() => {
            this.currentGesture = 'long-press';
            this.triggerNarrativeGesture('deep-explore');
            this.provideLongPressHaptic();
        }, this.longPressDelay);
    }

    clearLongPressTimer() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    processGestureEnd(touchData) {
        const duration = Date.now() - touchData.startTime;
        const deltaX = touchData.currentX - touchData.startX;
        const deltaY = touchData.currentY - touchData.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Tap rápido
        if (duration < 300 && distance < 10) {
            this.processTap(touchData);
        }
        
        // Análisis de velocidad para swipes
        if (distance > this.gestureThreshold) {
            const velocity = distance / duration;
            this.processSwipeVelocity(velocity);
        }
    }

    processTap(touchData) {
        const element = touchData.element;
        
        // Tap contextual según elemento
        if (element.classList.contains('cultural-element')) {
            this.triggerNarrativeGesture('explore-culture', { element });
        } else if (element.classList.contains('story-choice')) {
            this.triggerNarrativeGesture('make-choice', { element });
        } else if (element.classList.contains('character')) {
            this.triggerNarrativeGesture('interact-character', { element });
        } else {
            this.triggerNarrativeGesture('general-tap', { element });
        }
    }

    processSwipeVelocity(velocity) {
        if (velocity > 2) {
            this.triggerNarrativeGesture('fast-navigation');
        } else if (velocity < 0.5) {
            this.triggerNarrativeGesture('careful-exploration');
        }
    }

    defineNarrativeGestures() {
        this.narrativeGestures.set('next-story', {
            description: 'Avanzar en la narrativa',
            icon: '→',
            action: (data) => this.navigateStory('next', data)
        });

        this.narrativeGestures.set('prev-story', {
            description: 'Retroceder en la narrativa',
            icon: '←',
            action: (data) => this.navigateStory('prev', data)
        });

        this.narrativeGestures.set('explore-up', {
            description: 'Explorar hacia arriba',
            icon: '↑',
            action: (data) => this.exploreDirection('up', data)
        });

        this.narrativeGestures.set('deep-explore', {
            description: 'Exploración profunda',
            icon: '🔍',
            action: (data) => this.activateDeepExploration(data)
        });

        this.narrativeGestures.set('zoom-in', {
            description: 'Acercar vista',
            icon: '🔍+',
            action: (data) => this.zoomView('in', data)
        });

        this.narrativeGestures.set('reveal-secrets', {
            description: 'Revelar secretos',
            icon: '✨',
            action: (data) => this.revealHiddenElements(data)
        });
    }

    triggerNarrativeGesture(gestureType, data = {}) {
        const gesture = this.narrativeGestures.get(gestureType);
        if (!gesture) return;

        // Ejecutar acción del gesto
        if (gesture.action) {
            gesture.action(data);
        }

        // Emitir evento personalizado
        const event = new CustomEvent('narrativeGesture', {
            detail: { 
                type: gestureType,
                gesture,
                data,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);

        // Feedback visual
        this.showGestureFeedback(gestureType, gesture);
    }

    navigateStory(direction, data) {
        const event = new CustomEvent('storyNavigation', {
            detail: { direction, intensity: data.intensity }
        });
        document.dispatchEvent(event);
    }

    exploreDirection(direction, data) {
        const event = new CustomEvent('directionalExploration', {
            detail: { direction, intensity: data.intensity }
        });
        document.dispatchEvent(event);
    }

    activateDeepExploration(data) {
        const event = new CustomEvent('deepExploration', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    zoomView(direction, data) {
        const event = new CustomEvent('narrativeZoom', {
            detail: { direction, scale: data.scale }
        });
        document.dispatchEvent(event);
    }

    revealHiddenElements(data) {
        const event = new CustomEvent('revealSecrets', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    showGestureFeedback(gestureType, gesture) {
        const feedback = document.createElement('div');
        feedback.className = 'gesture-feedback';
        feedback.innerHTML = `
            <div class="gesture-icon">${gesture.icon}</div>
            <div class="gesture-description">${gesture.description}</div>
        `;
        
        document.body.appendChild(feedback);
        
        // Animación de feedback
        requestAnimationFrame(() => {
            feedback.classList.add('active');
            setTimeout(() => {
                feedback.classList.remove('active');
                setTimeout(() => feedback.remove(), 300);
            }, 1500);
        });
    }

    createGestureIndicators() {
        const indicators = document.createElement('div');
        indicators.className = 'gesture-indicators';
        indicators.innerHTML = `
            <div class="gesture-hint" data-gesture="swipe">
                <span class="gesture-icon">⟷</span>
                <span class="gesture-text">Desliza para navegar</span>
            </div>
            <div class="gesture-hint" data-gesture="long-press">
                <span class="gesture-icon">🔍</span>
                <span class="gesture-text">Mantén presionado para explorar</span>
            </div>
            <div class="gesture-hint" data-gesture="pinch">
                <span class="gesture-icon">🤏</span>
                <span class="gesture-text">Pellizca para enfocar</span>
            </div>
        `;
        
        document.body.appendChild(indicators);
        
        // Auto-ocultar después de un tiempo
        setTimeout(() => {
            indicators.classList.add('fade-out');
        }, 5000);
    }

    provideLongPressHaptic() {
        // Vibración si está disponible
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 100, 50]);
        }
    }

    resetGesture() {
        this.currentGesture = null;
        this.isGestureActive = false;
        this.clearLongPressTimer();
        this.initialPinchDistance = null;
        this.lastScale = 1;
    }

    // API pública
    enableGesture(gestureType) {
        // Habilitar gesto específico
    }

    disableGesture(gestureType) {
        // Deshabilitar gesto específico
    }

    getCurrentGesture() {
        return this.currentGesture;
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.touchGestureManager = new TouchGestureManager();
});

export default TouchGestureManager;