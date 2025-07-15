/**
 * RAMA 7: Gesture Recognition - Reconocimiento avanzado de gestos
 * Sistema unificado de reconocimiento de gestos para narrativa inmersiva
 */

class GestureRecognitionEngine {
    constructor() {
        this.activeGestures = new Map();
        this.gestureLibrary = new Map();
        this.recognitionMode = 'narrative'; // narrative, cultural, interactive
        this.sensitivity = 0.7;
        this.confidenceThreshold = 0.6;
        this.gestureHistory = [];
        this.isRecording = false;
        this.customGestures = new Map();
        
        this.init();
    }

    init() {
        this.setupGestureLibrary();
        this.initializeRecognitionSystems();
        this.createGestureTraining();
        this.setupEventListeners();
    }

    setupGestureLibrary() {
        // Gestos narrativos básicos
        this.addGesture('swipe-next', {
            type: 'swipe',
            direction: 'right',
            minDistance: 100,
            maxTime: 800,
            action: 'navigate-next',
            description: 'Avanzar en la narrativa'
        });

        this.addGesture('swipe-back', {
            type: 'swipe',
            direction: 'left',
            minDistance: 100,
            maxTime: 800,
            action: 'navigate-back',
            description: 'Retroceder en la narrativa'
        });

        this.addGesture('pinch-explore', {
            type: 'pinch',
            scaleRange: [0.5, 2.0],
            action: 'zoom-explore',
            description: 'Explorar con zoom'
        });

        this.addGesture('long-press-reveal', {
            type: 'hold',
            duration: 1000,
            action: 'reveal-secrets',
            description: 'Revelar contenido oculto'
        });

        this.addGesture('circle-cultural', {
            type: 'path',
            pattern: 'circle',
            tolerance: 0.3,
            action: 'activate-cultural',
            description: 'Activar elemento cultural'
        });

        this.addGesture('triangle-choice', {
            type: 'path',
            pattern: 'triangle',
            tolerance: 0.4,
            action: 'show-choices',
            description: 'Mostrar opciones'
        });

        this.addGesture('wave-greeting', {
            type: 'wave',
            amplitude: 50,
            frequency: 2,
            action: 'character-greeting',
            description: 'Saludar personaje'
        });

        this.addGesture('tap-sequence', {
            type: 'multi-tap',
            count: 3,
            interval: 500,
            action: 'easter-egg',
            description: 'Activar secreto'
        });
    }

    addGesture(name, config) {
        this.gestureLibrary.set(name, {
            ...config,
            name,
            confidence: 0,
            lastDetected: null
        });
    }

    initializeRecognitionSystems() {
        // Sistema de reconocimiento táctil
        this.touchRecognizer = {
            points: [],
            startTime: null,
            isActive: false
        };

        // Sistema de reconocimiento de mouse
        this.mouseRecognizer = {
            path: [],
            startTime: null,
            isActive: false
        };

        // Sistema de reconocimiento de patrones
        this.patternRecognizer = {
            templates: new Map(),
            currentPattern: []
        };

        this.setupTouchRecognition();
        this.setupMouseRecognition();
        this.setupPatternRecognition();
    }

    setupTouchRecognition() {
        document.addEventListener('touchstart', (event) => {
            this.touchRecognizer.isActive = true;
            this.touchRecognizer.startTime = Date.now();
            this.touchRecognizer.points = [];
            
            this.recordTouchPoints(event);
        });

        document.addEventListener('touchmove', (event) => {
            if (this.touchRecognizer.isActive) {
                this.recordTouchPoints(event);
                this.analyzePartialGesture('touch');
            }
        });

        document.addEventListener('touchend', (event) => {
            if (this.touchRecognizer.isActive) {
                this.touchRecognizer.isActive = false;
                this.recognizeCompleteGesture('touch');
            }
        });
    }

    setupMouseRecognition() {
        let isMouseDown = false;

        document.addEventListener('mousedown', (event) => {
            isMouseDown = true;
            this.mouseRecognizer.isActive = true;
            this.mouseRecognizer.startTime = Date.now();
            this.mouseRecognizer.path = [];
            
            this.recordMousePoint(event);
        });

        document.addEventListener('mousemove', (event) => {
            if (isMouseDown && this.mouseRecognizer.isActive) {
                this.recordMousePoint(event);
                this.analyzePartialGesture('mouse');
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (isMouseDown) {
                isMouseDown = false;
                this.mouseRecognizer.isActive = false;
                this.recognizeCompleteGesture('mouse');
            }
        });
    }

    setupPatternRecognition() {
        // Configurar plantillas de patrones geométricos
        this.patternRecognizer.templates.set('circle', this.generateCircleTemplate());
        this.patternRecognizer.templates.set('triangle', this.generateTriangleTemplate());
        this.patternRecognizer.templates.set('square', this.generateSquareTemplate());
        this.patternRecognizer.templates.set('heart', this.generateHeartTemplate());
        this.patternRecognizer.templates.set('star', this.generateStarTemplate());
    }

    recordTouchPoints(event) {
        Array.from(event.touches).forEach(touch => {
            this.touchRecognizer.points.push({
                x: touch.clientX,
                y: touch.clientY,
                timestamp: Date.now(),
                pressure: touch.force || 1
            });
        });
    }

    recordMousePoint(event) {
        this.mouseRecognizer.path.push({
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now()
        });
    }

    analyzePartialGesture(inputType) {
        // Análisis en tiempo real para feedback inmediato
        const recognizer = inputType === 'touch' ? this.touchRecognizer : this.mouseRecognizer;
        const points = inputType === 'touch' ? recognizer.points : recognizer.path;
        
        if (points.length < 3) return;

        // Detectar gestos simples en progreso
        const currentDirection = this.getDirection(points);
        const currentDistance = this.getDistance(points[0], points[points.length - 1]);
        
        // Feedback visual en tiempo real
        this.provideLiveGestureFeedback(currentDirection, currentDistance);
    }

    recognizeCompleteGesture(inputType) {
        const recognizer = inputType === 'touch' ? this.touchRecognizer : this.mouseRecognizer;
        const points = inputType === 'touch' ? recognizer.points : recognizer.path;
        
        if (points.length < 2) return;

        const gestureDuration = Date.now() - recognizer.startTime;
        const results = [];

        // Analizar contra cada gesto en la librería
        this.gestureLibrary.forEach((gesture, name) => {
            const confidence = this.calculateGestureConfidence(gesture, points, gestureDuration);
            
            if (confidence >= this.confidenceThreshold) {
                results.push({
                    name,
                    gesture,
                    confidence,
                    inputType
                });
            }
        });

        // Ordenar por confianza
        results.sort((a, b) => b.confidence - a.confidence);

        // Ejecutar el gesto con mayor confianza
        if (results.length > 0) {
            this.executeGesture(results[0]);
        }

        // Registrar en historial
        this.addToGestureHistory({
            inputType,
            points,
            duration: gestureDuration,
            results,
            timestamp: Date.now()
        });
    }

    calculateGestureConfidence(gesture, points, duration) {
        switch (gesture.type) {
            case 'swipe':
                return this.calculateSwipeConfidence(gesture, points, duration);
            case 'pinch':
                return this.calculatePinchConfidence(gesture, points);
            case 'hold':
                return this.calculateHoldConfidence(gesture, points, duration);
            case 'path':
                return this.calculatePathConfidence(gesture, points);
            case 'wave':
                return this.calculateWaveConfidence(gesture, points);
            case 'multi-tap':
                return this.calculateMultiTapConfidence(gesture, points, duration);
            default:
                return 0;
        }
    }

    calculateSwipeConfidence(gesture, points, duration) {
        if (points.length < 2) return 0;

        const start = points[0];
        const end = points[points.length - 1];
        const distance = this.getDistance(start, end);
        const direction = this.getDirection([start, end]);

        // Verificar distancia mínima
        if (distance < gesture.minDistance) return 0;

        // Verificar tiempo máximo
        if (duration > gesture.maxTime) return 0;

        // Verificar dirección
        const directionMatch = this.matchDirection(direction, gesture.direction);
        
        // Calcular confianza basada en lineality
        const linearity = this.calculateLinearity(points);
        
        return directionMatch * linearity * this.sensitivity;
    }

    calculatePinchConfidence(gesture, points) {
        if (points.length < 4) return 0; // Necesita al menos 2 puntos de 2 dedos

        // Analizar cambio de escala
        const initialDistance = this.getDistance(points[0], points[1]);
        const finalDistance = this.getDistance(points[points.length - 2], points[points.length - 1]);
        const scale = finalDistance / initialDistance;

        // Verificar si está en el rango esperado
        if (scale >= gesture.scaleRange[0] && scale <= gesture.scaleRange[1]) {
            return Math.min(1, this.sensitivity);
        }

        return 0;
    }

    calculatePathConfidence(gesture, points) {
        const template = this.patternRecognizer.templates.get(gesture.pattern);
        if (!template) return 0;

        // Normalizar puntos para comparación
        const normalizedPoints = this.normalizePoints(points);
        const normalizedTemplate = this.normalizePoints(template);

        // Calcular similitud usando Dynamic Time Warping
        const similarity = this.calculateDTWDistance(normalizedPoints, normalizedTemplate);
        
        // Convertir distancia a confianza
        const confidence = Math.max(0, 1 - similarity / gesture.tolerance);
        
        return confidence * this.sensitivity;
    }

    calculateWaveConfidence(gesture, points) {
        if (points.length < 10) return 0;

        // Analizar frecuencia y amplitud del movimiento
        const amplitudes = this.calculateAmplitudes(points);
        const frequency = this.calculateFrequency(points);

        const amplitudeMatch = amplitudes.some(amp => 
            Math.abs(amp - gesture.amplitude) < gesture.amplitude * 0.3
        );
        
        const frequencyMatch = Math.abs(frequency - gesture.frequency) < 0.5;

        if (amplitudeMatch && frequencyMatch) {
            return this.sensitivity;
        }

        return 0;
    }

    executeGesture(gestureResult) {
        const { name, gesture, confidence, inputType } = gestureResult;

        // Actualizar último tiempo detectado
        gesture.lastDetected = Date.now();
        gesture.confidence = confidence;

        // Emitir evento de gesto reconocido
        const event = new CustomEvent('gestureRecognized', {
            detail: {
                gesture: name,
                confidence,
                inputType,
                action: gesture.action,
                description: gesture.description
            }
        });
        document.dispatchEvent(event);

        // Ejecutar acción del gesto
        this.executeGestureAction(gesture.action, gestureResult);

        // Feedback visual/háptico
        this.provideGestureFeedback(gesture, confidence);
    }

    executeGestureAction(action, gestureResult) {
        const actions = {
            'navigate-next': () => this.triggerNavigation('next'),
            'navigate-back': () => this.triggerNavigation('back'),
            'zoom-explore': () => this.triggerZoom(gestureResult),
            'reveal-secrets': () => this.triggerReveal(),
            'activate-cultural': () => this.triggerCultural(),
            'show-choices': () => this.triggerChoices(),
            'character-greeting': () => this.triggerGreeting(),
            'easter-egg': () => this.triggerEasterEgg()
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    // Métodos auxiliares de cálculo geométrico
    getDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getDirection(points) {
        if (points.length < 2) return null;
        
        const start = points[0];
        const end = points[points.length - 1];
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        
        // Convertir a dirección cardinal
        const degrees = (angle * 180 / Math.PI + 360) % 360;
        
        if (degrees >= 315 || degrees < 45) return 'right';
        if (degrees >= 45 && degrees < 135) return 'down';
        if (degrees >= 135 && degrees < 225) return 'left';
        if (degrees >= 225 && degrees < 315) return 'up';
        
        return null;
    }

    matchDirection(detected, expected) {
        if (detected === expected) return 1.0;
        
        // Direcciones opuestas
        const opposites = {
            'right': 'left', 'left': 'right',
            'up': 'down', 'down': 'up'
        };
        
        if (detected === opposites[expected]) return 0.0;
        
        // Direcciones adyacentes
        return 0.5;
    }

    calculateLinearity(points) {
        if (points.length < 3) return 1.0;
        
        const start = points[0];
        const end = points[points.length - 1];
        const directDistance = this.getDistance(start, end);
        
        let pathDistance = 0;
        for (let i = 1; i < points.length; i++) {
            pathDistance += this.getDistance(points[i - 1], points[i]);
        }
        
        return directDistance / pathDistance;
    }

    normalizePoints(points) {
        // Normalizar puntos para comparación de patrones
        if (points.length === 0) return [];
        
        // Encontrar bounding box
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));
        
        const width = maxX - minX || 1;
        const height = maxY - minY || 1;
        
        return points.map(point => ({
            x: (point.x - minX) / width,
            y: (point.y - minY) / height
        }));
    }

    calculateDTWDistance(sequence1, sequence2) {
        // Dynamic Time Warping para comparar secuencias
        const n = sequence1.length;
        const m = sequence2.length;
        
        const dtw = Array(n + 1).fill().map(() => Array(m + 1).fill(Infinity));
        dtw[0][0] = 0;
        
        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                const cost = this.getDistance(sequence1[i - 1], sequence2[j - 1]);
                dtw[i][j] = cost + Math.min(
                    dtw[i - 1][j],     // insertion
                    dtw[i][j - 1],     // deletion
                    dtw[i - 1][j - 1]  // match
                );
            }
        }
        
        return dtw[n][m];
    }

    generateCircleTemplate() {
        // Generar plantilla de círculo
        const points = [];
        const centerX = 0.5;
        const centerY = 0.5;
        const radius = 0.4;
        
        for (let i = 0; i < 32; i++) {
            const angle = (i / 32) * 2 * Math.PI;
            points.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            });
        }
        
        return points;
    }

    generateTriangleTemplate() {
        return [
            { x: 0.5, y: 0.1 },   // Top
            { x: 0.1, y: 0.9 },   // Bottom left
            { x: 0.9, y: 0.9 },   // Bottom right
            { x: 0.5, y: 0.1 }    // Back to top
        ];
    }

    generateSquareTemplate() {
        return [
            { x: 0.1, y: 0.1 },   // Top left
            { x: 0.9, y: 0.1 },   // Top right
            { x: 0.9, y: 0.9 },   // Bottom right
            { x: 0.1, y: 0.9 },   // Bottom left
            { x: 0.1, y: 0.1 }    // Back to start
        ];
    }

    generateHeartTemplate() {
        const points = [];
        for (let t = 0; t <= 2 * Math.PI; t += 0.1) {
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
            points.push({
                x: (x + 20) / 40,  // Normalize to 0-1
                y: (y + 20) / 40
            });
        }
        return points;
    }

    generateStarTemplate() {
        const points = [];
        const outerRadius = 0.4;
        const innerRadius = 0.2;
        
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * 2 * Math.PI;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            points.push({
                x: 0.5 + radius * Math.cos(angle),
                y: 0.5 + radius * Math.sin(angle)
            });
        }
        
        return points;
    }

    calculateAmplitudes(points) {
        const amplitudes = [];
        
        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];
            
            // Calcular si es un pico o valle
            if ((curr.y > prev.y && curr.y > next.y) || 
                (curr.y < prev.y && curr.y < next.y)) {
                const amplitude = Math.abs(curr.y - (prev.y + next.y) / 2);
                amplitudes.push(amplitude);
            }
        }
        
        return amplitudes;
    }

    calculateFrequency(points) {
        // Calcular frecuencia aproximada contando cambios de dirección
        let directionChanges = 0;
        let lastDirection = null;
        
        for (let i = 1; i < points.length; i++) {
            const currentDirection = points[i].y > points[i - 1].y ? 'up' : 'down';
            
            if (lastDirection && currentDirection !== lastDirection) {
                directionChanges++;
            }
            
            lastDirection = currentDirection;
        }
        
        const duration = points[points.length - 1].timestamp - points[0].timestamp;
        return (directionChanges / 2) / (duration / 1000); // cycles per second
    }

    addToGestureHistory(gestureData) {
        this.gestureHistory.push(gestureData);
        
        // Mantener solo los últimos 50 gestos
        if (this.gestureHistory.length > 50) {
            this.gestureHistory.shift();
        }
    }

    provideLiveGestureFeedback(direction, distance) {
        // Feedback visual en tiempo real
        const indicator = document.querySelector('.live-gesture-indicator') || 
                         this.createLiveGestureIndicator();
        
        indicator.style.transform = `rotate(${this.getDirectionAngle(direction)}deg) 
                                   scale(${Math.min(distance / 100, 2)})`;
        indicator.style.opacity = Math.min(distance / 50, 1);
    }

    createLiveGestureIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'live-gesture-indicator';
        indicator.innerHTML = '→';
        document.body.appendChild(indicator);
        return indicator;
    }

    getDirectionAngle(direction) {
        const angles = {
            'right': 0,
            'down': 90,
            'left': 180,
            'up': 270
        };
        return angles[direction] || 0;
    }

    provideGestureFeedback(gesture, confidence) {
        // Feedback visual
        this.showGestureSuccess(gesture, confidence);
        
        // Feedback háptico si está disponible
        if ('vibrate' in navigator) {
            const vibrationPattern = this.getVibrationPattern(gesture.action);
            navigator.vibrate(vibrationPattern);
        }
        
        // Feedback sonoro (si hay sistema de audio)
        this.playGestureSound(gesture.action);
    }

    showGestureSuccess(gesture, confidence) {
        const feedback = document.createElement('div');
        feedback.className = 'gesture-success-feedback';
        feedback.innerHTML = `
            <div class="gesture-icon">${this.getGestureIcon(gesture.action)}</div>
            <div class="gesture-name">${gesture.description}</div>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${confidence * 100}%"></div>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Animar y remover
        requestAnimationFrame(() => {
            feedback.classList.add('show');
            setTimeout(() => {
                feedback.classList.remove('show');
                setTimeout(() => feedback.remove(), 300);
            }, 1500);
        });
    }

    getGestureIcon(action) {
        const icons = {
            'navigate-next': '▶️',
            'navigate-back': '◀️',
            'zoom-explore': '🔍',
            'reveal-secrets': '✨',
            'activate-cultural': '🏛️',
            'show-choices': '🎯',
            'character-greeting': '👋',
            'easter-egg': '🥚'
        };
        return icons[action] || '✅';
    }

    getVibrationPattern(action) {
        const patterns = {
            'navigate-next': [50],
            'navigate-back': [50],
            'zoom-explore': [100, 50, 100],
            'reveal-secrets': [200, 100, 200, 100, 200],
            'activate-cultural': [150],
            'show-choices': [50, 50, 50],
            'character-greeting': [100, 100, 100],
            'easter-egg': [50, 50, 50, 50, 50]
        };
        return patterns[action] || [50];
    }

    playGestureSound(action) {
        // Placeholder para sistema de sonido
        const event = new CustomEvent('playGestureSound', {
            detail: { action }
        });
        document.dispatchEvent(event);
    }

    // Métodos de acción específicos
    triggerNavigation(direction) {
        const event = new CustomEvent('gestureNavigation', {
            detail: { direction }
        });
        document.dispatchEvent(event);
    }

    triggerZoom(gestureResult) {
        const scale = gestureResult.gesture.scaleRange ? 
                     (gestureResult.gesture.scaleRange[0] + gestureResult.gesture.scaleRange[1]) / 2 : 1;
        
        const event = new CustomEvent('gestureZoom', {
            detail: { scale }
        });
        document.dispatchEvent(event);
    }

    triggerReveal() {
        const event = new CustomEvent('gestureReveal', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    triggerCultural() {
        const event = new CustomEvent('gestureCultural', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    triggerChoices() {
        const event = new CustomEvent('gestureChoices', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    triggerGreeting() {
        const event = new CustomEvent('gestureGreeting', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    triggerEasterEgg() {
        const event = new CustomEvent('gestureEasterEgg', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    createGestureTraining() {
        // Sistema para entrenar gestos personalizados
        this.trainingMode = false;
        this.trainingData = {
            name: null,
            recordings: [],
            action: null
        };
    }

    startGestureTraining(gestureName, action) {
        this.trainingMode = true;
        this.trainingData = {
            name: gestureName,
            recordings: [],
            action: action
        };
        
        // UI para entrenamiento
        this.showTrainingUI();
    }

    recordTrainingGesture(points, duration) {
        if (!this.trainingMode) return;
        
        this.trainingData.recordings.push({
            points,
            duration,
            timestamp: Date.now()
        });
        
        this.updateTrainingUI();
    }

    finishGestureTraining() {
        if (this.trainingData.recordings.length < 3) {
            alert('Se necesitan al menos 3 grabaciones para entrenar un gesto');
            return;
        }
        
        // Crear plantilla promedio
        const template = this.createGestureTemplate(this.trainingData.recordings);
        
        // Añadir a gestos personalizados
        this.customGestures.set(this.trainingData.name, {
            type: 'custom',
            template,
            action: this.trainingData.action,
            description: `Gesto personalizado: ${this.trainingData.name}`
        });
        
        this.trainingMode = false;
        this.hideTrainingUI();
    }

    createGestureTemplate(recordings) {
        // Crear plantilla promedio de las grabaciones
        const avgLength = Math.round(
            recordings.reduce((sum, rec) => sum + rec.points.length, 0) / recordings.length
        );
        
        const template = [];
        
        for (let i = 0; i < avgLength; i++) {
            let x = 0, y = 0, count = 0;
            
            recordings.forEach(recording => {
                const normalizedPoints = this.normalizePoints(recording.points);
                const index = Math.round((i / avgLength) * (normalizedPoints.length - 1));
                
                if (normalizedPoints[index]) {
                    x += normalizedPoints[index].x;
                    y += normalizedPoints[index].y;
                    count++;
                }
            });
            
            if (count > 0) {
                template.push({ x: x / count, y: y / count });
            }
        }
        
        return template;
    }

    setupEventListeners() {
        // Escuchar eventos de otras partes del sistema
        document.addEventListener('narrativeStateChange', (event) => {
            this.adaptToNarrativeState(event.detail.state);
        });
        
        document.addEventListener('culturalModeChange', (event) => {
            this.adaptToCulturalMode(event.detail.mode);
        });
    }

    adaptToNarrativeState(state) {
        // Adaptar reconocimiento según el estado narrativo
        if (state === 'choice-selection') {
            this.sensitivity = 0.8; // Más sensible para elecciones
        } else if (state === 'exploration') {
            this.sensitivity = 0.6; // Menos sensible para exploración libre
        } else {
            this.sensitivity = 0.7; // Valor por defecto
        }
    }

    adaptToCulturalMode(mode) {
        // Adaptar gestos según el modo cultural
        this.recognitionMode = mode;
        
        if (mode === 'cultural') {
            // Activar gestos culturales específicos
            this.gestureLibrary.get('circle-cultural').confidence = 0.8;
        }
    }

    // API pública
    setSensitivity(sensitivity) {
        this.sensitivity = Math.max(0.1, Math.min(1.0, sensitivity));
    }

    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0.1, Math.min(1.0, threshold));
    }

    getGestureHistory() {
        return [...this.gestureHistory];
    }

    getActiveGestures() {
        return new Map(this.activeGestures);
    }

    enableGesture(gestureName) {
        const gesture = this.gestureLibrary.get(gestureName);
        if (gesture) {
            gesture.enabled = true;
        }
    }

    disableGesture(gestureName) {
        const gesture = this.gestureLibrary.get(gestureName);
        if (gesture) {
            gesture.enabled = false;
        }
    }

    getRecognitionStats() {
        return {
            totalGestures: this.gestureLibrary.size,
            customGestures: this.customGestures.size,
            historySize: this.gestureHistory.length,
            currentSensitivity: this.sensitivity,
            recognitionMode: this.recognitionMode
        };
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.gestureRecognition = new GestureRecognitionEngine();
});

export default GestureRecognitionEngine;