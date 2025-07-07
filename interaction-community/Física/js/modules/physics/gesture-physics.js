/**
 * RAMA 7: Gesture Physics - Sistema de física de gestos avanzados
 * Maneja gestos complejos, reconocimiento de patrones y feedback háptico
 */

class GesturePhysics {
    constructor() {
        this.gestures = new Map();
        this.activeGestures = new Map();
        this.gestureHistory = [];
        this.recognizers = new Map();
        
        this.state = {
            isEnabled: true,
            sensitivity: 1.0,
            hapticEnabled: true,
            debugMode: false,
            lastGestureTime: 0,
            consecutiveGestures: 0
        };
        
        this.config = {
            // Umbrales de gestos
            swipeMinDistance: 50,
            swipeMaxTime: 300,
            pinchMinScale: 0.1,
            rotateMinAngle: 15,
            holdMinTime: 500,
            
            // Configuración de reconocimiento
            sampleRate: 60, // fps
            smoothingFactor: 0.3,
            velocityThreshold: 0.5,
            accelerationThreshold: 0.8,
            
            // Feedback háptico
            hapticPatterns: {
                light: [10],
                medium: [50],
                heavy: [100],
                double: [50, 50, 50],
                success: [30, 20, 30, 20, 50]
            },
            
            // Configuración de canvas para trazos
            strokeWidth: 3,
            strokeColor: '#ff6b35',
            fadeTime: 2000
        };
        
        this.init();
    }
    
    init() {
        this.setupGestureRecognizers();
        this.bindEvents();
        this.setupCanvas();
        this.initializePatterns();
        this.detectCapabilities();
    }
    
    detectCapabilities() {
        this.capabilities = {
            multiTouch: 'ontouchstart' in window,
            pointerEvents: !!window.PointerEvent,
            hapticFeedback: 'vibrate' in navigator,
            pressureSupport: false,
            tiltSupport: false,
            deviceMotion: !!window.DeviceMotionEvent
        };
        
        // Detectar soporte de presión en algunos dispositivos
        document.addEventListener('touchstart', (e) => {
            if (e.touches[0] && typeof e.touches[0].force !== 'undefined') {
                this.capabilities.pressureSupport = true;
            }
        }, { once: true });
    }
    
    setupCanvas() {
        this.gestureCanvas = document.createElement('canvas');
        this.gestureCanvas.id = 'gesture-canvas';
        this.gestureCanvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10000;
            opacity: 0.8;
        `;
        
        this.gestureCtx = this.gestureCanvas.getContext('2d');
        this.resizeGestureCanvas();
        
        document.body.appendChild(this.gestureCanvas);
        window.addEventListener('resize', () => this.resizeGestureCanvas());
    }
    
    resizeGestureCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.gestureCanvas.width = window.innerWidth * dpr;
        this.gestureCanvas.height = window.innerHeight * dpr;
        this.gestureCanvas.style.width = window.innerWidth + 'px';
        this.gestureCanvas.style.height = window.innerHeight + 'px';
        this.gestureCtx.scale(dpr, dpr);
    }
    
    setupGestureRecognizers() {
        // Registrar reconocedores de gestos personalizados
        this.registerGesture('participation-swipe', {
            pattern: 'swipe-up',
            target: '.participation-prompt',
            action: this.handleParticipationSwipe.bind(this)
        });
        
        this.registerGesture('modal-dismiss', {
            pattern: 'swipe-down',
            target: '.modal-content',
            action: this.handleModalDismiss.bind(this)
        });
        
        this.registerGesture('quick-submit', {
            pattern: 'double-tap',
            target: '.contribution-text',
            action: this.handleQuickSubmit.bind(this)
        });
        
        this.registerGesture('secret-menu', {
            pattern: 'triangle',
            target: 'body',
            action: this.handleSecretMenu.bind(this)
        });
        
        this.registerGesture('reset-form', {
            pattern: 'shake',
            target: '.modal-content',
            action: this.handleFormReset.bind(this)
        });
        
        this.registerGesture('achievement-celebration', {
            pattern: 'circle',
            target: '.achievement-card',
            action: this.handleAchievementCelebration.bind(this)
        });
    }
    
    registerGesture(name, config) {
        this.recognizers.set(name, {
            name,
            pattern: config.pattern,
            target: config.target,
            action: config.action,
            enabled: true,
            sensitivity: config.sensitivity || 1.0
        });
    }
    
    bindEvents() {
        if (this.capabilities.pointerEvents) {
            this.bindPointerGestures();
        } else if (this.capabilities.multiTouch) {
            this.bindTouchGestures();
        } else {
            this.bindMouseGestures();
        }
        
        if (this.capabilities.deviceMotion) {
            this.bindMotionGestures();
        }
        
        // Eventos de teclado para gestos con modificadores
        this.bindKeyboardGestures();
    }
    
    bindPointerGestures() {
        let pointers = new Map();
        let gestureStartTime = 0;
        let lastPointerPositions = new Map();
        
        document.addEventListener('pointerdown', (e) => {
            pointers.set(e.pointerId, {
                x: e.clientX,
                y: e.clientY,
                startTime: Date.now(),
                element: e.target,
                pressure: e.pressure || 0
            });
            
            gestureStartTime = Date.now();
            this.startGestureTracking(e);
        });
        
        document.addEventListener('pointermove', (e) => {
            if (pointers.has(e.pointerId)) {
                const pointer = pointers.get(e.pointerId);
                const currentPos = { x: e.clientX, y: e.clientY };
                
                this.updateGestureTracking(e.pointerId, currentPos, pointer);
                this.drawGestureTrail(lastPointerPositions.get(e.pointerId), currentPos);
                
                lastPointerPositions.set(e.pointerId, currentPos);
                
                // Detectar gestos multi-touch
                if (pointers.size >= 2) {
                    this.detectMultiTouchGestures(pointers);
                }
            }
        });
        
        document.addEventListener('pointerup', (e) => {
            if (pointers.has(e.pointerId)) {
                const pointer = pointers.get(e.pointerId);
                const duration = Date.now() - pointer.startTime;
                const distance = Math.sqrt(
                    Math.pow(e.clientX - pointer.x, 2) + 
                    Math.pow(e.clientY - pointer.y, 2)
                );
                
                this.endGestureTracking(e.pointerId, {
                    duration,
                    distance,
                    endX: e.clientX,
                    endY: e.clientY,
                    element: pointer.element
                });
                
                pointers.delete(e.pointerId);
                lastPointerPositions.delete(e.pointerId);
            }
        });
    }
    
    bindTouchGestures() {
        let touches = new Map();
        let gestureData = {
            startTime: 0,
            path: [],
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 }
        };
        
        document.addEventListener('touchstart', (e) => {
            e.preventDefault();
            gestureData.startTime = Date.now();
            gestureData.path = [];
            
            Array.from(e.touches).forEach(touch => {
                touches.set(touch.identifier, {
                    startX: touch.clientX,
                    startY: touch.clientY,
                    currentX: touch.clientX,
                    currentY: touch.clientY,
                    startTime: Date.now(),
                    force: touch.force || 0
                });
                
                gestureData.path.push({
                    x: touch.clientX,
                    y: touch.clientY,
                    timestamp: Date.now(),
                    pressure: touch.force || 0
                });
            });
            
            this.triggerHaptic('light');
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            Array.from(e.touches).forEach(touch => {
                if (touches.has(touch.identifier)) {
                    const touchData = touches.get(touch.identifier);
                    
                    // Calcular velocidad y aceleración
                    const prevVelX = gestureData.velocity.x;
                    const prevVelY = gestureData.velocity.y;
                    
                    gestureData.velocity.x = touch.clientX - touchData.currentX;
                    gestureData.velocity.y = touch.clientY - touchData.currentY;
                    
                    gestureData.acceleration.x = gestureData.velocity.x - prevVelX;
                    gestureData.acceleration.y = gestureData.velocity.y - prevVelY;
                    
                    touchData.currentX = touch.clientX;
                    touchData.currentY = touch.clientY;
                    
                    gestureData.path.push({
                        x: touch.clientX,
                        y: touch.clientY,
                        timestamp: Date.now(),
                        pressure: touch.force || 0,
                        velocity: { ...gestureData.velocity },
                        acceleration: { ...gestureData.acceleration }
                    });
                    
                    this.drawGestureTrail(
                        gestureData.path[gestureData.path.length - 2],
                        gestureData.path[gestureData.path.length - 1]
                    );
                }
            });
            
            // Detectar gestos complejos basados en múltiples toques
            if (touches.size >= 2) {
                this.detectComplexGestures(touches, gestureData);
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            Array.from(e.changedTouches).forEach(touch => {
                if (touches.has(touch.identifier)) {
                    const touchData = touches.get(touch.identifier);
                    const duration = Date.now() - touchData.startTime;
                    
                    // Analizar el gesto completo
                    this.analyzeGesture(gestureData, touchData, duration);
                    
                    touches.delete(touch.identifier);
                }
            });
            
            if (touches.size === 0) {
                this.fadeGestureTrail();
            }
        });
    }
    
    bindMotionGestures() {
        let motionData = {
            lastX: 0,
            lastY: 0,
            lastZ: 0,
            shakeThreshold: 15,
            shakeCount: 0,
            lastShakeTime: 0
        };
        
        window.addEventListener('devicemotion', (e) => {
            const acceleration = e.accelerationIncludingGravity;
            if (!acceleration) return;
            
            const currentTime = Date.now();
            const deltaX = Math.abs(acceleration.x - motionData.lastX);
            const deltaY = Math.abs(acceleration.y - motionData.lastY);
            const deltaZ = Math.abs(acceleration.z - motionData.lastZ);
            
            const totalDelta = deltaX + deltaY + deltaZ;
            
            if (totalDelta > motionData.shakeThreshold) {
                if (currentTime - motionData.lastShakeTime > 500) {
                    motionData.shakeCount = 0;
                }
                
                motionData.shakeCount++;
                motionData.lastShakeTime = currentTime;
                
                if (motionData.shakeCount >= 3) {
                    this.triggerGesture('shake', {
                        intensity: totalDelta,
                        element: document.activeElement || document.body
                    });
                    
                    motionData.shakeCount = 0;
                }
            }
            
            motionData.lastX = acceleration.x;
            motionData.lastY = acceleration.y;
            motionData.lastZ = acceleration.z;
        });
    }
    
    bindKeyboardGestures() {
        let keySequence = [];
        let sequenceTimer = null;
        
        const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 
                       'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 
                       'KeyB', 'KeyA'];
        
        document.addEventListener('keydown', (e) => {
            keySequence.push(e.code);
            
            clearTimeout(sequenceTimer);
            sequenceTimer = setTimeout(() => {
                keySequence = [];
            }, 2000);
            
            // Verificar secuencia Konami
            if (keySequence.length >= konami.length) {
                const recent = keySequence.slice(-konami.length);
                if (JSON.stringify(recent) === JSON.stringify(konami)) {
                    this.triggerGesture('konami-code', { element: document.body });
                    keySequence = [];
                }
            }
            
            // Gestos con modificadores
            if (e.ctrlKey && e.shiftKey) {
                switch (e.code) {
                    case 'KeyD':
                        e.preventDefault();
                        this.toggleDebugMode();
                        break;
                    case 'KeyR':
                        e.preventDefault();
                        this.resetAllGestures();
                        break;
                }
            }
        });
    }
    
    // === ANÁLISIS DE GESTOS ===
    
    analyzeGesture(gestureData, touchData, duration) {
        const path = gestureData.path;
        if (path.length < 2) return;
        
        const totalDistance = this.calculatePathDistance(path);
        const startPoint = path[0];
        const endPoint = path[path.length - 1];
        const directDistance = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) + 
            Math.pow(endPoint.y - startPoint.y, 2)
        );
        
        const avgVelocity = totalDistance / duration;
        const linearity = directDistance / totalDistance;
        
        // Detectar tipo de gesto basado en características
        if (duration < 200 && totalDistance < 20) {
            this.detectTap(gestureData, touchData);
        } else if (linearity > 0.8 && avgVelocity > 0.5) {
            this.detectSwipe(gestureData, touchData);
        } else if (this.isCircularGesture(path)) {
            this.detectCircle(gestureData, touchData);
        } else if (this.isTriangleGesture(path)) {
            this.detectTriangle(gestureData, touchData);
        } else {
            this.detectCustomPattern(gestureData, touchData);
        }
    }
    
    detectTap(gestureData, touchData) {
        const tapCount = this.getTapCount(touchData.startX, touchData.startY);
        
        if (tapCount === 2) {
            this.triggerGesture('double-tap', {
                x: touchData.startX,
                y: touchData.startY,
                element: document.elementFromPoint(touchData.startX, touchData.startY)
            });
        }
    }
    
    detectSwipe(gestureData, touchData) {
        const path = gestureData.path;
        const start = path[0];
        const end = path[path.length - 1];
        
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        let direction;
        if (Math.abs(angle) < 45) direction = 'right';
        else if (Math.abs(angle) > 135) direction = 'left';
        else if (angle > 0) direction = 'down';
        else direction = 'up';
        
        this.triggerGesture(`swipe-${direction}`, {
            distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            velocity: Math.sqrt(gestureData.velocity.x ** 2 + gestureData.velocity.y ** 2),
            element: document.elementFromPoint(start.x, start.y)
        });
    }
    
    isCircularGesture(path) {
        if (path.length < 10) return false;
        
        const center = this.calculateCentroid(path);
        const radii = path.map(point => 
            Math.sqrt((point.x - center.x) ** 2 + (point.y - center.y) ** 2)
        );
        
        const avgRadius = radii.reduce((a, b) => a + b) / radii.length;
        const radiusVariance = radii.reduce((sum, r) => sum + (r - avgRadius) ** 2, 0) / radii.length;
        
        return radiusVariance < avgRadius * 0.3;
    }
    
    isTriangleGesture(path) {
        if (path.length < 6) return false;
        
        const corners = this.findCorners(path);
        return corners.length === 3 && this.validateTriangle(corners);
    }
    
    // === MANEJADORES DE GESTOS ESPECÍFICOS ===
    
    handleParticipationSwipe(data) {
        const prompt = document.querySelector('.participation-prompt');
        if (prompt && data.element.closest('.participation-prompt')) {
            this.triggerHaptic('medium');
            
            // Animar hacia arriba y expandir opciones
            prompt.style.transform = 'translateY(-100px) scale(1.1)';
            prompt.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            
            setTimeout(() => {
                if (window.scrollPhysics) {
                    window.scrollPhysics.showPrompt();
                }
            }, 200);
        }
    }
    
    handleModalDismiss(data) {
        if (data.element.closest('.modal-content')) {
            this.triggerHaptic('light');
            
            const modal = document.querySelector('.participation-modal');
            if (modal && window.scrollPhysics) {
                window.scrollPhysics.closeModal();
            }
        }
    }
    
    handleQuickSubmit(data) {
        const textarea = data.element.closest('.contribution-text');
        if (textarea) {
            this.triggerHaptic('success');
            
            // Efecto visual de confirmación
            textarea.style.borderColor = '#27ae60';
            textarea.style.boxShadow = '0 0 20px rgba(39, 174, 96, 0.5)';
            
            // Simular envío rápido
            this.showQuickSubmitFeedback(data.x, data.y);
        }
    }
    
    handleSecretMenu(data) {
        this.triggerHaptic('double');
        
        // Crear menú secreto flotante
        const secretMenu = document.createElement('div');
        secretMenu.style.cssText = `
            position: fixed;
            top: ${data.y || 100}px;
            left: ${data.x || 100}px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
            z-index: 10001;
            animation: secretMenuAppear 0.5s ease-out;
        `;
        
        secretMenu.innerHTML = `
            <h4>🎨 Menú Secreto</h4>
            <button onclick="gesturePhysics.toggleDebugMode()">Debug Mode</button>
            <button onclick="gesturePhysics.showGestureHelp()">Ayuda de Gestos</button>
            <button onclick="gesturePhysics.triggerEasterEgg()">Easter Egg</button>
        `;
        
        if (!document.getElementById('secret-menu-styles')) {
            const styles = document.createElement('style');
            styles.id = 'secret-menu-styles';
            styles.textContent = `
                @keyframes secretMenuAppear {
                    0% { transform: scale(0) rotate(180deg); opacity: 0; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(secretMenu);
        
        setTimeout(() => secretMenu.remove(), 5000);
    }
    
    handleFormReset(data) {
        if (data.intensity > 20) { // Shake fuerte
            this.triggerHaptic('heavy');
            
            const modal = document.querySelector('.participation-modal');
            if (modal) {
                // Efecto de shake visual
                modal.style.animation = 'shake 0.5s ease-in-out';
                
                setTimeout(() => {
                    if (confirm('¿Quieres resetear el formulario?')) {
                        if (window.scrollPhysics) {
                            window.scrollPhysics.resetModal();
                        }
                    }
                    modal.style.animation = '';
                }, 500);
            }
        }
    }
    
    handleAchievementCelebration(data) {
        this.triggerHaptic('success');
        
        // Crear explosión de confeti en círculo
        this.createConfetiExplosion(data.x, data.y);
        
        // Efecto de celebración en la tarjeta
        const card = data.element.closest('.achievement-card');
        if (card) {
            card.style.animation = 'celebration 1s ease-out';
        }
    }
    
    // === EFECTOS VISUALES ===
    
    drawGestureTrail(from, to) {
        if (!from || !to) return;
        
        this.gestureCtx.save();
        this.gestureCtx.strokeStyle = this.config.strokeColor;
        this.gestureCtx.lineWidth = this.config.strokeWidth;
        this.gestureCtx.lineCap = 'round';
        this.gestureCtx.lineJoin = 'round';
        
        this.gestureCtx.beginPath();
        this.gestureCtx.moveTo(from.x, from.y);
        this.gestureCtx.lineTo(to.x, to.y);
        this.gestureCtx.stroke();
        this.gestureCtx.restore();
    }
    
    fadeGestureTrail() {
        const fadeStep = () => {
            this.gestureCtx.globalCompositeOperation = 'destination-out';
            this.gestureCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.gestureCtx.fillRect(0, 0, this.gestureCanvas.width, this.gestureCanvas.height);
            this.gestureCtx.globalCompositeOperation = 'source-over';
        };
        
        const fadeInterval = setInterval(() => {
            fadeStep();
        }, 50);
        
        setTimeout(() => {
            clearInterval(fadeInterval);
            this.gestureCtx.clearRect(0, 0, this.gestureCanvas.width, this.gestureCanvas.height);
        }, this.config.fadeTime);
    }
    
    showQuickSubmitFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: ${y - 20}px;
            left: ${x - 50}px;
            background: rgba(39, 174, 96, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            z-index: 10002;
            animation: quickSubmitFeedback 1s ease-out forwards;
            pointer-events: none;
        `;
        
        feedback.textContent = '✓ Envío Rápido!';
        
        if (!document.getElementById('quick-submit-styles')) {
            const styles = document.createElement('style');
            styles.id = 'quick-submit-styles';
            styles.textContent = `
                @keyframes quickSubmitFeedback {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1) translateY(-50px); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 1000);
    }
    
    createConfetiExplosion(x, y) {
        const colors = ['#ff6b35', '#f39c12', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71'];
        
        for (let i = 0; i < 20; i++) {
            const confeti = document.createElement('div');
            confeti.style.cssText = `
                position: fixed;
                top: ${y}px;
                left: ${x}px;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                animation: confeti 2s ease-out forwards;
                z-index: 10002;
                pointer-events: none;
            `;
            
            const angle = (Math.PI * 2 * i) / 20;
            const velocity = 100 + Math.random() * 50;
            
            confeti.style.setProperty('--dx', Math.cos(angle) * velocity + 'px');
            confeti.style.setProperty('--dy', Math.sin(angle) * velocity - 100 + 'px');
            
            if (!document.getElementById('confeti-styles')) {
                const styles = document.createElement('style');
                styles.id = 'confeti-styles';
                styles.textContent = `
                    @keyframes confeti {
                        0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                        100% { transform: translate(var(--dx), var(--dy)) rotate(720deg); opacity: 0; }
                    }
                    @keyframes celebration {
                        0%, 100% { transform: scale(1) rotate(0deg); }
                        25% { transform: scale(1.1) rotate(-5deg); }
                        75% { transform: scale(1.1) rotate(5deg); }
                    }
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-10px); }
                        75% { transform: translateX(10px); }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            document.body.appendChild(confeti);
            setTimeout(() => confeti.remove(), 2000);
        }
    }
    
    // === UTILIDADES ===
    
    triggerGesture(gestureType, data) {
        const recognizer = Array.from(this.recognizers.values())
            .find(r => r.pattern === gestureType);
        
        if (recognizer && recognizer.enabled) {
            // Verificar si el elemento coincide con el target
            if (this.matchesTarget(data.element, recognizer.target)) {
                recognizer.action(data);
                
                this.gestureHistory.push({
                    type: gestureType,
                    timestamp: Date.now(),
                    data: data
                });
                
                this.state.lastGestureTime = Date.now();
                this.state.consecutiveGestures++;
            }
        }
    }
    
    matchesTarget(element, target) {
        if (target === 'body') return true;
        if (!element) return false;
        
        return element.matches(target) || element.closest(target);
    }
    
    triggerHaptic(pattern) {
        if (!this.state.hapticEnabled || !this.capabilities.hapticFeedback) return;
        
        const hapticPattern = this.config.hapticPatterns[pattern];
        if (hapticPattern && navigator.vibrate) {
            navigator.vibrate(hapticPattern);
        }
    }
    
    calculatePathDistance(path) {
        let distance = 0;
        for (let i = 1; i < path.length; i++) {
            distance += Math.sqrt(
                (path[i].x - path[i-1].x) ** 2 + 
                (path[i].y - path[i-1].y) ** 2
            );
        }
        return distance;
    }
    
    calculateCentroid(path) {
        const sum = path.reduce((acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / path.length,
            y: sum.y / path.length
        };
    }
    
    getTapCount(x, y) {
        const now = Date.now();
        const tapWindow = 300; // ms
        const tapRadius = 50; // px
        
        const recentTaps = this.gestureHistory.filter(gesture => 
            gesture.type === 'tap' && 
            now - gesture.timestamp < tapWindow &&
            Math.sqrt((gesture.data.x - x) ** 2 + (gesture.data.y - y) ** 2) < tapRadius
        );
        
        return recentTaps.length + 1;
    }
    
    findCorners(path) {
        const corners = [];
        const angleThreshold = 30; // grados
        
        for (let i = 2; i < path.length - 2; i++) {
            const prev = path[i - 2];
            const curr = path[i];
            const next = path[i + 2];
            
            const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            const angleDiff = Math.abs(angle2 - angle1) * 180 / Math.PI;
            
            if (angleDiff > angleThreshold && angleDiff < 180 - angleThreshold) {
                corners.push(curr);
            }
        }
        
        return corners;
    }
    
    validateTriangle(corners) {
        if (corners.length !== 3) return false;
        
        // Verificar que los puntos no estén colineales
        const [a, b, c] = corners;
        const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
        
        return area > 500; // Área mínima para considerar un triángulo válido
    }
    
    detectCustomPattern(gestureData, touchData) {
        const path = gestureData.path;
        
        // Analizar patrones personalizados basados en características
        const features = this.extractGestureFeatures(path);
        
        // Patrón de corazón (dos curvas conectadas)
        if (this.matchesHeartPattern(features)) {
            this.triggerGesture('heart', {
                x: touchData.startX,
                y: touchData.startY,
                element: document.elementFromPoint(touchData.startX, touchData.startY)
            });
        }
        
        // Patrón de estrella (5 picos)
        else if (this.matchesStarPattern(features)) {
            this.triggerGesture('star', {
                x: touchData.startX,
                y: touchData.startY,
                element: document.elementFromPoint(touchData.startX, touchData.startY)
            });
        }
        
        // Patrón de zigzag
        else if (this.matchesZigzagPattern(features)) {
            this.triggerGesture('zigzag', {
                x: touchData.startX,
                y: touchData.startY,
                element: document.elementFromPoint(touchData.startX, touchData.startY)
            });
        }
    }
    
    extractGestureFeatures(path) {
        if (path.length < 3) return {};
        
        const corners = this.findCorners(path);
        const totalDistance = this.calculatePathDistance(path);
        const boundingBox = this.calculateBoundingBox(path);
        const centroid = this.calculateCentroid(path);
        
        // Calcular curvatura promedio
        let totalCurvature = 0;
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            const next = path[i + 1];
            
            const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            totalCurvature += Math.abs(angle2 - angle1);
        }
        
        return {
            corners: corners.length,
            totalDistance,
            boundingBox,
            centroid,
            avgCurvature: totalCurvature / (path.length - 2),
            aspectRatio: boundingBox.width / boundingBox.height,
            compactness: (boundingBox.width * boundingBox.height) / totalDistance
        };
    }
    
    calculateBoundingBox(path) {
        const xs = path.map(p => p.x);
        const ys = path.map(p => p.y);
        
        return {
            left: Math.min(...xs),
            right: Math.max(...xs),
            top: Math.min(...ys),
            bottom: Math.max(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys)
        };
    }
    
    matchesHeartPattern(features) {
        return features.corners >= 1 && 
               features.avgCurvature > 0.5 && 
               features.aspectRatio > 0.7 && 
               features.aspectRatio < 1.3;
    }
    
    matchesStarPattern(features) {
        return features.corners >= 8 && 
               features.corners <= 12 && 
               features.aspectRatio > 0.8 && 
               features.aspectRatio < 1.2;
    }
    
    matchesZigzagPattern(features) {
        return features.corners >= 4 && 
               features.avgCurvature < 0.3 && 
               features.aspectRatio > 2.0;
    }
    
    // === GESTOS MULTI-TOUCH ===
    
    detectMultiTouchGestures(pointers) {
        const pointerArray = Array.from(pointers.values());
        
        if (pointerArray.length === 2) {
            this.detectPinchGesture(pointerArray);
            this.detectRotateGesture(pointerArray);
        } else if (pointerArray.length >= 3) {
            this.detectThreeFingerGestures(pointerArray);
        }
    }
    
    detectComplexGestures(touches, gestureData) {
        const touchArray = Array.from(touches.values());
        
        if (touchArray.length === 2) {
            this.detectTwoFingerSwipe(touchArray, gestureData);
        } else if (touchArray.length === 3) {
            this.detectThreeFingerTap(touchArray);
        } else if (touchArray.length >= 4) {
            this.detectFourFingerGestures(touchArray);
        }
    }
    
    detectPinchGesture(pointers) {
        const [p1, p2] = pointers;
        const currentDistance = Math.sqrt(
            (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
        );
        
        if (!this.lastPinchDistance) {
            this.lastPinchDistance = currentDistance;
            return;
        }
        
        const scale = currentDistance / this.lastPinchDistance;
        const scaleChange = Math.abs(scale - 1);
        
        if (scaleChange > 0.1) {
            this.triggerGesture('pinch', {
                scale,
                direction: scale > 1 ? 'out' : 'in',
                center: {
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2
                },
                element: document.elementFromPoint((p1.x + p2.x) / 2, (p1.y + p2.y) / 2)
            });
        }
        
        this.lastPinchDistance = currentDistance;
    }
    
    detectTwoFingerSwipe(touches, gestureData) {
        if (gestureData.path.length < 10) return;
        
        const avgVelocity = {
            x: gestureData.velocity.x,
            y: gestureData.velocity.y
        };
        
        const speed = Math.sqrt(avgVelocity.x ** 2 + avgVelocity.y ** 2);
        
        if (speed > 2) {
            let direction = '';
            if (Math.abs(avgVelocity.x) > Math.abs(avgVelocity.y)) {
                direction = avgVelocity.x > 0 ? 'right' : 'left';
            } else {
                direction = avgVelocity.y > 0 ? 'down' : 'up';
            }
            
            this.triggerGesture(`two-finger-swipe-${direction}`, {
                velocity: speed,
                element: document.elementFromPoint(
                    gestureData.path[0].x, 
                    gestureData.path[0].y
                )
            });
        }
    }
    
    detectThreeFingerTap(touches) {
        const touchArray = Array.from(touches.values());
        const avgX = touchArray.reduce((sum, t) => sum + t.currentX, 0) / touchArray.length;
        const avgY = touchArray.reduce((sum, t) => sum + t.currentY, 0) / touchArray.length;
        
        this.triggerGesture('three-finger-tap', {
            x: avgX,
            y: avgY,
            element: document.elementFromPoint(avgX, avgY)
        });
    }
    
    // === FUNCIONES DE UTILIDAD PÚBLICA ===
    
    toggleDebugMode() {
        this.state.debugMode = !this.state.debugMode;
        
        if (this.state.debugMode) {
            this.showDebugOverlay();
        } else {
            this.hideDebugOverlay();
        }
        
        console.log(`🎯 Modo Debug ${this.state.debugMode ? 'activado' : 'desactivado'}`);
    }
    
    showDebugOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'gesture-debug-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 15px;
            border-radius: 8px;
            z-index: 10003;
            max-width: 300px;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        document.body.appendChild(overlay);
        
        this.updateDebugInfo();
        this.debugInterval = setInterval(() => this.updateDebugInfo(), 100);
    }
    
    hideDebugOverlay() {
        const overlay = document.getElementById('gesture-debug-overlay');
        if (overlay) overlay.remove();
        
        if (this.debugInterval) {
            clearInterval(this.debugInterval);
            this.debugInterval = null;
        }
    }
    
    updateDebugInfo() {
        const overlay = document.getElementById('gesture-debug-overlay');
        if (!overlay) return;
        
        const info = `
            <h4>🎯 Gesture Debug</h4>
            <div>Gestos activos: ${this.activeGestures.size}</div>
            <div>Último gesto: ${Date.now() - this.state.lastGestureTime}ms</div>
            <div>Gestos consecutivos: ${this.state.consecutiveGestures}</div>
            <div>Sensibilidad: ${this.state.sensitivity}</div>
            <div>Háptico: ${this.state.hapticEnabled ? 'ON' : 'OFF'}</div>
            <div>Capacidades:</div>
            <ul style="margin: 5px 0; padding-left: 15px; font-size: 10px;">
                <li>Multi-touch: ${this.capabilities.multiTouch ? '✓' : '✗'}</li>
                <li>Pointer Events: ${this.capabilities.pointerEvents ? '✓' : '✗'}</li>
                <li>Haptic: ${this.capabilities.hapticFeedback ? '✓' : '✗'}</li>
                <li>Pressure: ${this.capabilities.pressureSupport ? '✓' : '✗'}</li>
                <li>Motion: ${this.capabilities.deviceMotion ? '✓' : '✗'}</li>
            </ul>
            <div>Historial (últimos 5):</div>
            <ul style="margin: 5px 0; padding-left: 15px; font-size: 10px;">
                ${this.gestureHistory.slice(-5).map(g => 
                    `<li>${g.type} (${Date.now() - g.timestamp}ms)</li>`
                ).join('')}
            </ul>
        `;
        
        overlay.innerHTML = info;
    }
    
    showGestureHelp() {
        const helpModal = document.createElement('div');
        helpModal.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10004;
        `;
        
        helpModal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                <h2>🎨 Guía de Gestos</h2>
                <div style="display: grid; gap: 15px;">
                    <div><strong>Swipe hacia arriba</strong> en prompt → Expandir opciones</div>
                    <div><strong>Swipe hacia abajo</strong> en modal → Cerrar</div>
                    <div><strong>Doble tap</strong> en textarea → Envío rápido</div>
                    <div><strong>Dibujar triángulo</strong> → Menú secreto</div>
                    <div><strong>Shake device</strong> → Reset formulario</div>
                    <div><strong>Dibujar círculo</strong> en logro → Celebración</div>
                    <div><strong>Pellizco</strong> → Zoom contenido</div>
                    <div><strong>3 dedos tap</strong> → Función especial</div>
                    <div><strong>Konami Code</strong> → Easter egg</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="margin-top: 20px; padding: 10px 20px; background: #ff6b35; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Cerrar
                </button>
            </div>
        `;
        
        document.body.appendChild(helpModal);
    }
    
    triggerEasterEgg() {
        this.triggerHaptic('success');
        
        // Efecto de matrix
        const matrix = document.createElement('div');
        matrix.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: black;
            color: #00ff00;
            font-family: monospace;
            z-index: 10005;
            overflow: hidden;
        `;
        
        const characters = '0123456789ABCDEF';
        let columns = Math.floor(window.innerWidth / 20);
        let drops = [];
        
        for (let i = 0; i < columns; i++) {
            drops[i] = 1;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        
        matrix.appendChild(canvas);
        document.body.appendChild(matrix);
        
        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00ff00';
            ctx.font = '15px monospace';
            
            for (let i = 0; i < drops.length; i++) {
                const text = characters[Math.floor(Math.random() * characters.length)];
                ctx.fillText(text, i * 20, drops[i] * 20);
                
                if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };
        
        const matrixInterval = setInterval(draw, 50);
        
        setTimeout(() => {
            clearInterval(matrixInterval);
            matrix.remove();
        }, 3000);
    }
    
    resetAllGestures() {
        this.gestureHistory = [];
        this.activeGestures.clear();
        this.state.consecutiveGestures = 0;
        this.state.lastGestureTime = 0;
        
        console.log('🔄 Gestos reiniciados');
    }
    
    setSensitivity(level) {
        this.state.sensitivity = Math.max(0.1, Math.min(2.0, level));
        console.log(`🎯 Sensibilidad ajustada a ${this.state.sensitivity}`);
    }
    
    enableHaptics(enabled = true) {
        this.state.hapticEnabled = enabled && this.capabilities.hapticFeedback;
        console.log(`📳 Hápticos ${this.state.hapticEnabled ? 'activados' : 'desactivados'}`);
    }
    
    // === LIMPIEZA ===
    
    destroy() {
        // Limpiar intervalos
        if (this.debugInterval) {
            clearInterval(this.debugInterval);
        }
        
        // Limpiar canvas
        if (this.gestureCanvas) {
            this.gestureCanvas.remove();
        }
        
        // Limpiar overlays
        const debugOverlay = document.getElementById('gesture-debug-overlay');
        if (debugOverlay) debugOverlay.remove();
        
        // Limpiar referencias
        this.gestures.clear();
        this.activeGestures.clear();
        this.recognizers.clear();
        this.gestureHistory = [];
        
        console.log('🗑️ GesturePhysics destruido');
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.gesturePhysics = new GesturePhysics();
    
    // Registrar gestos personalizados adicionales después de la carga
    setTimeout(() => {
        if (window.gesturePhysics) {
            // Añadir gestos específicos del contexto
            window.gesturePhysics.registerGesture('contribution-heart', {
                pattern: 'heart',
                target: '.contribution-text',
                action: (data) => {
                    // Efecto especial para mostrar amor por la contribución
                    console.log('❤️ Gesture de amor detectado');
                }
            });
        }
    }, 1000);
});

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GesturePhysics;
}