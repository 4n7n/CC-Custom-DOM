/**
 * ENGAGEMENT TRACKING SYSTEM
 * Sistema de seguimiento de engagement para patrocinadores
 */

class EngagementTracking {
    constructor(options = {}) {
        this.options = {
            trackClicks: true,
            trackScrolling: true,
            trackTimeOnPage: true,
            apiEndpoint: '/api/engagement',
            ...options
        };

        this.session = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            pageViews: 0,
            interactions: 0,
            scrollDepth: 0
        };

        this.metrics = new Map();
        this.events = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startTimeTracking();
        console.log('📊 Engagement Tracking inicializado');
    }

    setupEventListeners() {
        // Tracking de clicks
        if (this.options.trackClicks) {
            document.addEventListener('click', (e) => this.trackClick(e));
        }

        // Tracking de scroll
        if (this.options.trackScrolling) {
            window.addEventListener('scroll', () => this.trackScroll());
        }

        // Visibilidad de página
        document.addEventListener('visibilitychange', () => {
            this.trackEvent(document.hidden ? 'page_hidden' : 'page_visible');
        });
    }

    trackClick(event) {
        const element = event.target;
        const clickData = {
            tag: element.tagName,
            id: element.id,
            className: element.className,
            text: element.textContent?.substring(0, 50),
            href: element.href,
            coordinates: { x: event.clientX, y: event.clientY }
        };

        this.trackEvent('click', clickData);
        this.session.interactions++;

        // Tracking especial para CTAs y sponsors
        if (element.dataset.cta) {
            this.trackEvent('cta_click', { 
                type: element.dataset.cta,
                text: element.textContent.trim()
            });
        }

        if (element.dataset.sponsor) {
            this.trackEvent('sponsor_interaction', {
                sponsorId: element.dataset.sponsor,
                action: 'click'
            });
        }
    }

    trackScroll() {
        const scrollPercent = Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        );
        
        if (scrollPercent > this.session.scrollDepth) {
            this.session.scrollDepth = scrollPercent;
            
            // Milestones de scroll
            if ([25, 50, 75, 100].includes(scrollPercent)) {
                this.trackEvent('scroll_milestone', { 
                    depth: scrollPercent,
                    timestamp: Date.now()
                });
            }
        }
    }

    startTimeTracking() {
        setInterval(() => {
            if (!document.hidden) {
                this.updateEngagementMetrics();
            }
        }, 30000); // Cada 30 segundos
    }

    trackEvent(eventType, data = {}) {
        const event = {
            type: eventType,
            data,
            timestamp: Date.now(),
            sessionId: this.session.id,
            url: window.location.href
        };

        this.events.push(event);
        this.saveToStorage();

        // Enviar a API si está disponible
        if (this.options.apiEndpoint) {
            this.sendToAPI(event);
        }

        console.log('📊 Event tracked:', eventType, data);
    }

    updateEngagementMetrics() {
        const timeSpent = Date.now() - this.session.startTime;
        const engagementScore = this.calculateEngagementScore();

        this.metrics.set('current', {
            timeSpent: Math.round(timeSpent / 1000), // segundos
            interactions: this.session.interactions,
            pageViews: this.session.pageViews,
            scrollDepth: this.session.scrollDepth,
            engagementScore,
            lastUpdate: new Date().toISOString()
        });

        // Disparar evento de actualización
        document.dispatchEvent(new CustomEvent('engagementUpdated', {
            detail: this.metrics.get('current')
        }));
    }

    calculateEngagementScore() {
        const timeWeight = Math.min(this.getTimeSpent() / 60000, 10) * 10; // max 10 puntos por tiempo
        const interactionWeight = Math.min(this.session.interactions, 20) * 2; // max 40 puntos por interacciones
        const scrollWeight = this.session.scrollDepth * 0.5; // max 50 puntos por scroll

        return Math.round(timeWeight + interactionWeight + scrollWeight);
    }

    // Métodos de análisis
    getEngagementMetrics() {
        return {
            timeSpent: this.getTimeSpent(),
            interactions: this.session.interactions,
            scrollDepth: this.session.scrollDepth,
            engagementScore: this.calculateEngagementScore(),
            clickThroughRate: this.calculateCTR(),
            bounceRate: this.calculateBounceRate()
        };
    }

    getTimeSpent() {
        return Date.now() - this.session.startTime;
    }

    calculateCTR() {
        const ctaClicks = this.events.filter(e => e.type === 'cta_click').length;
        const pageViews = this.session.pageViews || 1;
        return (ctaClicks / pageViews) * 100;
    }

    calculateBounceRate() {
        return this.session.interactions === 0 && this.getTimeSpent() < 30000 ? 100 : 0;
    }

    getSocialEngagement() {
        return this.events.filter(e => 
            e.type === 'click' && 
            e.data?.href?.includes('facebook|twitter|instagram|linkedin')
        ).length;
    }

    // Utilidades
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveToStorage() {
        try {
            localStorage.setItem('engagementSession', JSON.stringify({
                session: this.session,
                events: this.events.slice(-100), // Solo últimos 100 eventos
                metrics: Array.from(this.metrics.entries())
            }));
        } catch (error) {
            console.warn('Error guardando engagement data:', error);
        }
    }

    async sendToAPI(event) {
        try {
            await fetch(this.options.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
        } catch (error) {
            console.warn('Error enviando a API:', error);
        }
    }

    // Métodos públicos
    getEvents(type = null) {
        return type ? this.events.filter(e => e.type === type) : this.events;
    }

    getCurrentMetrics() {
        this.updateEngagementMetrics();
        return this.metrics.get('current');
    }

    resetSession() {
        this.session = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            pageViews: 0,
            interactions: 0,
            scrollDepth: 0
        };
        this.events = [];
        this.metrics.clear();
    }

    // Dashboard simple
    createDashboard(container) {
        const dashboard = document.createElement('div');
        dashboard.className = 'engagement-dashboard';
        dashboard.innerHTML = `
            <h3>📊 Engagement Metrics</h3>
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-value" id="time-spent">0s</span>
                    <span class="metric-label">Tiempo en Página</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value" id="interactions">${this.session.interactions}</span>
                    <span class="metric-label">Interacciones</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value" id="scroll-depth">${this.session.scrollDepth}%</span>
                    <span class="metric-label">Profundidad Scroll</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value" id="engagement-score">0</span>
                    <span class="metric-label">Score Engagement</span>
                </div>
            </div>
        `;

        // Actualizar métricas cada 10 segundos
        setInterval(() => {
            const metrics = this.getCurrentMetrics();
            dashboard.querySelector('#time-spent').textContent = Math.round(metrics.timeSpent) + 's';
            dashboard.querySelector('#interactions').textContent = metrics.interactions;
            dashboard.querySelector('#scroll-depth').textContent = metrics.scrollDepth + '%';
            dashboard.querySelector('#engagement-score').textContent = metrics.engagementScore;
        }, 10000);

        container.appendChild(dashboard);
        return dashboard;
    }
}

// Estilos CSS simples
const engagementStyles = `
<style>
.engagement-dashboard {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.engagement-dashboard h3 {
    margin: 0 0 1rem 0;
    color: #374151;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
}

.metric-card {
    text-align: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
}

.metric-value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
}

.metric-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
}
</style>
`;

// Inyectar estilos
if (!document.querySelector('#engagement-styles')) {
    const style = document.createElement('div');
    style.id = 'engagement-styles';
    style.innerHTML = engagementStyles;
    document.head.appendChild(style);
}

// Auto-inicialización
window.EngagementTracking = EngagementTracking;