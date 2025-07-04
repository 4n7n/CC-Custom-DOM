/**
 * Engagement Tracking Module
 * Rastrea y analiza el engagement de los patrocinadores
 */

class EngagementTracking {
    constructor(config = {}) {
        this.config = {
            trackingInterval: 5000, // 5 segundos
            sessionTimeout: 1800000, // 30 minutos
            enableRealTime: true,
            enableHeatmaps: false,
            enableClickTracking: true,
            enableScrollTracking: true,
            enableTimeTracking: true,
            ...config
        };
        
        this.sessions = new Map();
        this.engagementMetrics = new Map();
        this.eventQueue = [];
        this.listeners = new Set();
        this.trackingActive = false;
        
        this.engagementWeights = {
            click: 1.0,
            scroll: 0.3,
            hover: 0.2,
            focus: 0.5,
            download: 2.0,
            share: 1.5,
            contact: 3.0,
            view_duration: 0.1 // por segundo
        };
        
        this.sponsorElements = new Set();
        this.currentSession = null;
    }

    /**
     * Inicializa el tracking de engagement
     */
    async initialize() {
        try {
            console.log('📊 Inicializando Engagement Tracking...');
            
            // Crear sesión inicial
            this.createSession();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Iniciar tracking automático
            if (this.config.enableRealTime) {
                this.startTracking();
            }
            
            // Configurar procesamiento de queue
            this.setupEventProcessing();
            
            // Detectar elementos de patrocinadores
            this.detectSponsorElements();
            
            console.log('✅ Engagement Tracking inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Engagement Tracking:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva sesión de tracking
     */
    createSession() {
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: new Date(),
            lastActivity: new Date(),
            totalTime: 0,
            pageViews: 1,
            interactions: 0,
            sponsors: new Set(),
            events: [],
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
        
        this.sessions.set(this.currentSession.id, this.currentSession);
        console.log('📱 Nueva sesión creada:', this.currentSession.id);
    }

    /**
     * Configura todos los event listeners
     */
    setupEventListeners() {
        // Click tracking
        if (this.config.enableClickTracking) {
            document.addEventListener('click', (e) => {
                this.handleClickEvent(e);
            }, { passive: true });
        }
        
        // Scroll tracking
        if (this.config.enableScrollTracking) {
            let scrollTimeout;
            document.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.handleScrollEvent();
                }, 100);
            }, { passive: true });
        }
        
        // Mouse events
        document.addEventListener('mouseenter', (e) => {
            this.handleMouseEvent(e, 'enter');
        }, { passive: true });
        
        document.addEventListener('mouseleave', (e) => {
            this.handleMouseEvent(e, 'leave');
        }, { passive: true });
        
        // Focus events
        document.addEventListener('focusin', (e) => {
            this.handleFocusEvent(e, 'in');
        }, { passive: true });
        
        document.addEventListener('focusout', (e) => {
            this.handleFocusEvent(e, 'out');
        }, { passive: true });
        
        // Page visibility
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // Window events
        window.addEventListener('beforeunload', () => {
            this.handlePageUnload();
        });
        
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }

    /**
     * Maneja eventos de click
     */
    handleClickEvent(event) {
        const sponsorElement = event.target.closest('[data-sponsor-id]');
        if (!sponsorElement) return;
        
        const sponsorId = sponsorElement.dataset.sponsorId;
        const elementType = this.getElementType(event.target);
        
        this.trackEvent('click', {
            sponsorId,
            elementType,
            coordinates: {
                x: event.clientX,
                y: event.clientY
            },
            timestamp: new Date(),
            sessionId: this.currentSession.id
        });
        
        // Incrementar interacciones del patrocinador
        this.incrementSponsorInteraction(sponsorId, 'click');
    }

    /**
     * Maneja eventos de scroll
     */
    handleScrollEvent() {
        const scrollPercent = this.calculateScrollPercent();
        const visibleSponsors = this.getVisibleSponsors();
        
        visibleSponsors.forEach(sponsorId => {
            this.trackEvent('scroll', {
                sponsorId,
                scrollPercent,
                timestamp: new Date(),
                sessionId: this.currentSession.id
            });
            
            this.incrementSponsorInteraction(sponsorId, 'scroll');
        });
    }

    /**
     * Maneja eventos de mouse
     */
    handleMouseEvent(event, type) {
        const sponsorElement = event.target.closest('[data-sponsor-id]');
        if (!sponsorElement) return;
        
        const sponsorId = sponsorElement.dataset.sponsorId;
        
        if (type === 'enter') {
            this.startHoverTracking(sponsorId, sponsorElement);
        } else if (type === 'leave') {
            this.endHoverTracking(sponsorId);
        }
    }

    /**
     * Maneja eventos de focus
     */
    handleFocusEvent(event, type) {
        const sponsorElement = event.target.closest('[data-sponsor-id]');
        if (!sponsorElement) return;
        
        const sponsorId = sponsorElement.dataset.sponsorId;
        
        this.trackEvent('focus', {
            sponsorId,
            focusType: type,
            elementTag: event.target.tagName.toLowerCase(),
            timestamp: new Date(),
            sessionId: this.currentSession.id
        });
        
        if (type === 'in') {
            this.incrementSponsorInteraction(sponsorId, 'focus');
        }
    }

    /**
     * Inicia tracking de hover
     */
    startHoverTracking(sponsorId, element) {
        const hoverStart = new Date();
        
        element.dataset.hoverStart = hoverStart.getTime();
        
        // Programar tracking de duración de hover
        setTimeout(() => {
            const hoverEnd = new Date();
            const duration = hoverEnd - hoverStart;
            
            if (duration > 1000) { // Solo trackear si hover > 1 segundo
                this.trackEvent('hover', {
                    sponsorId,
                    duration,
                    timestamp: hoverStart,
                    sessionId: this.currentSession.id
                });
                
                this.incrementSponsorInteraction(sponsorId, 'hover');
            }
        }, 1000);
    }

    /**
     * Termina tracking de hover
     */
    endHoverTracking(sponsorId) {
        // Implementar lógica de finalización si es necesario
    }

    /**
     * Maneja cambios de visibilidad de la página
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseTracking();
        } else {
            this.resumeTracking();
        }
    }

    /**
     * Maneja el evento de descarga de página
     */
    handlePageUnload() {
        this.endSession();
        this.flushEventQueue();
    }

    /**
     * Maneja cambios de tamaño de ventana
     */
    handleWindowResize() {
        if (this.currentSession) {
            this.currentSession.viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
        }
    }

    /**
     * Trackea un evento de engagement
     */
    trackEvent(eventType, data) {
        const event = {
            id: this.generateEventId(),
            type: eventType,
            ...data,
            weight: this.engagementWeights[eventType] || 1.0
        };
        
        // Agregar a queue
        this.eventQueue.push(event);
        
        // Agregar a sesión actual
        if (this.currentSession) {
            this.currentSession.events.push(event);
            this.currentSession.lastActivity = new Date();
            this.currentSession.interactions++;
            
            if (data.sponsorId) {
                this.currentSession.sponsors.add(data.sponsorId);
            }
        }
        
        // Notificar listeners
        this.notifyListeners('event:tracked', { event });
    }

    /**
     * Incrementa interacción de un patrocinador
     */
    incrementSponsorInteraction(sponsorId, interactionType) {
        if (!this.engagementMetrics.has(sponsorId)) {
            this.engagementMetrics.set(sponsorId, {
                totalScore: 0,
                interactions: {},
                sessions: new Set(),
                lastInteraction: null,
                firstInteraction: new Date()
            });
        }
        
        const metrics = this.engagementMetrics.get(sponsorId);
        
        // Incrementar contador de interacción
        if (!metrics.interactions[interactionType]) {
            metrics.interactions[interactionType] = 0;
        }
        metrics.interactions[interactionType]++;
        
        // Actualizar score
        const weight = this.engagementWeights[interactionType] || 1.0;
        metrics.totalScore += weight;
        
        // Actualizar timestamps
        metrics.lastInteraction = new Date();
        metrics.sessions.add(this.currentSession.id);
        
        // Notificar cambio de engagement
        this.notifyListeners('engagement:updated', {
            sponsorId,
            metrics: { ...metrics },
            interactionType
        });
    }

    /**
     * Calcula el score de engagement de un patrocinador
     */
    calculateEngagementScore(sponsorId) {
        const metrics = this.engagementMetrics.get(sponsorId);
        if (!metrics) return 0;
        
        const baseScore = metrics.totalScore;
        const sessionCount = metrics.sessions.size;
        const daysSinceFirst = this.daysBetween(metrics.firstInteraction, new Date());
        
        // Factores de ajuste
        const sessionBonus = Math.min(sessionCount * 0.1, 2.0); // Máximo +2 puntos
        const consistencyBonus = daysSinceFirst > 0 ? Math.min(baseScore / daysSinceFirst, 1.0) : 0;
        
        const finalScore = baseScore + sessionBonus + consistencyBonus;
        
        // Normalizar a escala 0-10
        return Math.min(Math.round(finalScore * 100) / 100, 10);
    }

    /**
     * Obtiene métricas de engagement de un patrocinador
     */
    getSponsorEngagement(sponsorId) {
        const metrics = this.engagementMetrics.get(sponsorId);
        if (!metrics) {
            return {
                score: 0,
                level: 'none',
                interactions: {},
                sessions: 0,
                lastInteraction: null,
                firstInteraction: null
            };
        }
        
        const score = this.calculateEngagementScore(sponsorId);
        
        return {
            score,
            level: this.getEngagementLevel(score),
            interactions: { ...metrics.interactions },
            sessions: metrics.sessions.size,
            lastInteraction: metrics.lastInteraction,
            firstInteraction: metrics.firstInteraction,
            totalEvents: Object.values(metrics.interactions).reduce((sum, count) => sum + count, 0)
        };
    }

    /**
     * Obtiene el nivel de engagement basado en el score
     */
    getEngagementLevel(score) {
        if (score >= 8) return 'high';
        if (score >= 6) return 'medium';
        if (score >= 3) return 'low';
        return 'very_low';
    }

    /**
     * Obtiene todos los engagement metrics
     */
    getAllEngagementMetrics() {
        const allMetrics = {};
        
        for (const sponsorId of this.engagementMetrics.keys()) {
            allMetrics[sponsorId] = this.getSponsorEngagement(sponsorId);
        }
        
        return allMetrics;
    }

    /**
     * Detecta elementos de patrocinadores en la página
     */
    detectSponsorElements() {
        const elements = document.querySelectorAll('[data-sponsor-id]');
        
        elements.forEach(element => {
            const sponsorId = element.dataset.sponsorId;
            this.sponsorElements.add(sponsorId);
            
            // Configurar observer para este elemento
            this.setupElementObserver(element, sponsorId);
        });
        
        console.log(`🎯 Detectados ${elements.length} elementos de patrocinadores`);
    }

    /**
     * Configura observer para un elemento específico
     */
    setupElementObserver(element, sponsorId) {
        // Intersection Observer para tracking de visibilidad
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.handleElementVisible(sponsorId, entry.intersectionRatio);
                } else {
                    this.handleElementHidden(sponsorId);
                }
            });
        }, {
            threshold: [0.1, 0.5, 0.9] // Múltiples thresholds
        });
        
        observer.observe(element);
    }

    /**
     * Maneja cuando un elemento se vuelve visible
     */
    handleElementVisible(sponsorId, visibilityRatio) {
        this.trackEvent('view', {
            sponsorId,
            visibilityRatio,
            timestamp: new Date(),
            sessionId: this.currentSession.id
        });
        
        // Iniciar tracking de tiempo de visualización
        this.startViewDurationTracking(sponsorId);
    }

    /**