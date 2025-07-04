/**
 * Dashboard Manager - Sistema principal de gestión del dashboard de patrocinadores
 * Coordina todos los módulos y componentes del sistema
 */

class DashboardManager {
    constructor() {
        this.currentTab = 'overview';
        this.sponsors = new Map();
        this.metrics = new Map();
        this.analytics = null;
        this.charts = new Map();
        this.filters = {
            tier: '',
            status: 'active',
            search: '',
            dateRange: '30d'
        };
        this.config = {
            refreshInterval: 30000, // 30 segundos
            animationDuration: 300,
            chartUpdateDelay: 100
        };
        this.eventListeners = new Map();
        this.isInitialized = false;
    }

    /**
     * Inicializa el dashboard completo
     */
    async initialize() {
        try {
            console.log('🚀 Inicializando Dashboard Manager...');
            
            // Cargar configuración inicial
            await this.loadConfiguration();
            
            // Inicializar módulos dependientes
            await this.initializeModules();
            
            // Cargar datos iniciales
            await this.loadInitialData();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Configurar auto-refresh
            this.setupAutoRefresh();
            
            // Renderizar interfaz inicial
            this.renderInitialUI();
            
            this.isInitialized = true;
            console.log('✅ Dashboard Manager inicializado correctamente');
            
            // Emitir evento de inicialización completa
            this.emitEvent('dashboard:initialized', { timestamp: new Date() });
            
        } catch (error) {
            console.error('❌ Error inicializando Dashboard Manager:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Carga la configuración del dashboard
     */
    async loadConfiguration() {
        try {
            // En un entorno real, esto vendría de una API
            const configResponse = await this.fetchConfig();
            
            this.config = {
                ...this.config,
                ...configResponse,
                sponsorTiers: {
                    platinum: { name: 'Platinum', minAmount: 50000, color: '#7c3aed' },
                    gold: { name: 'Gold', minAmount: 25000, color: '#d97706' },
                    silver: { name: 'Silver', minAmount: 10000, color: '#64748b' },
                    bronze: { name: 'Bronze', minAmount: 5000, color: '#dc2626' }
                },
                metricTargets: {
                    funding: 200000,
                    sponsors: 20,
                    reach: 100000,
                    engagement: 8.0
                }
            };
            
        } catch (error) {
            console.warn('⚠️ Error cargando configuración, usando valores por defecto:', error);
        }
    }

    /**
     * Inicializa los módulos dependientes
     */
    async initializeModules() {
        // Inicializar Analytics Engine
        if (typeof AnalyticsEngine !== 'undefined') {
            this.analytics = new AnalyticsEngine(this.config);
            await this.analytics.initialize();
        }

        // Inicializar Brand Integration
        if (typeof BrandIntegration !== 'undefined') {
            this.brandIntegration = new BrandIntegration(this.config);
        }

        // Inicializar Tier Management
        if (typeof TierManagement !== 'undefined') {
            this.tierManager = new TierManagement(this.config.sponsorTiers);
        }

        // Inicializar componentes de charts
        if (typeof ImpactCharts !== 'undefined') {
            this.impactCharts = new ImpactCharts();
        }

        if (typeof EngagementGraphs !== 'undefined') {
            this.engagementGraphs = new EngagementGraphs();
        }
    }

    /**
     * Carga los datos iniciales del dashboard
     */
    async loadInitialData() {
        try {
            // Cargar patrocinadores
            const sponsorsData = await this.fetchSponsors();
            this.updateSponsors(sponsorsData);

            // Cargar métricas
            const metricsData = await this.fetchMetrics();
            this.updateMetrics(metricsData);

            // Cargar datos de analytics
            if (this.analytics) {
                await this.analytics.loadData();
            }

        } catch (error) {
            console.error('❌ Error cargando datos iniciales:', error);
            this.loadMockData();
        }
    }

    /**
     * Configura todos los event listeners
     */
    setupEventListeners() {
        // Navigation tabs
        this.addEventListener('.nav-tab', 'click', (e) => {
            const tabName = e.target.dataset.tab;
            if (tabName) {
                this.switchTab(tabName);
            }
        });

        // Search and filters
        this.addEventListener('#sponsorSearch', 'input', (e) => {
            this.updateFilter('search', e.target.value);
            this.applyFilters();
        });

        this.addEventListener('#tierFilter', 'change', (e) => {
            this.updateFilter('tier', e.target.value);
            this.applyFilters();
        });

        // Time range selectors
        this.addEventListener('.time-btn', 'click', (e) => {
            this.updateTimeRange(e.target.textContent);
        });

        // Action buttons
        this.addEventListener('#exportBtn', 'click', () => {
            this.exportReport();
        });

        this.addEventListener('#addSponsorBtn', 'click', () => {
            this.showAddSponsorModal();
        });

        // Theme selector
        this.addEventListener('[data-theme]', 'click', (e) => {
            this.changeTheme(e.target.dataset.theme);
        });

        // Window events
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    /**
     * Configura la actualización automática
     */
    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, this.config.refreshInterval);
    }

    /**
     * Renderiza la interfaz inicial
     */
    renderInitialUI() {
        this.renderOverviewTab();
        this.renderSponsorsTab();
        this.updateMetricsDisplay();
        this.initializeCharts();
    }

    /**
     * Cambia entre pestañas del dashboard
     */
    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        // Actualizar estado de navegación
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Ocultar contenido actual
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });

        // Mostrar nuevo contenido
        const newTab = document.getElementById(`${tabName}-tab`);
        if (newTab) {
            newTab.style.display = 'block';
            this.currentTab = tabName;
            
            // Cargar contenido específico de la pestaña
            this.loadTabContent(tabName);
            
            // Emitir evento de cambio de pestaña
            this.emitEvent('tab:changed', { from: this.currentTab, to: tabName });
        }
    }

    /**
     * Carga el contenido específico de una pestaña
     */
    async loadTabContent(tabName) {
        try {
            switch (tabName) {
                case 'overview':
                    await this.loadOverviewContent();
                    break;
                case 'sponsors':
                    await this.loadSponsorsContent();
                    break;
                case 'analytics':
                    await this.loadAnalyticsContent();
                    break;
                case 'impact':
                    await this.loadImpactContent();
                    break;
            }
        } catch (error) {
            console.error(`Error cargando contenido de pestaña ${tabName}:`, error);
        }
    }

    /**
     * Actualiza filtros y aplica cambios
     */
    updateFilter(key, value) {
        this.filters[key] = value;
        this.emitEvent('filter:updated', { key, value, filters: this.filters });
    }

    /**
     * Aplica filtros a los datos mostrados
     */
    applyFilters() {
        const filteredSponsors = Array.from(this.sponsors.values()).filter(sponsor => {
            // Filtro por tier
            if (this.filters.tier && sponsor.tier !== this.filters.tier) {
                return false;
            }

            // Filtro por estado
            if (this.filters.status && sponsor.status !== this.filters.status) {
                return false;
            }

            // Filtro por búsqueda
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                return sponsor.name.toLowerCase().includes(searchTerm);
            }

            return true;
        });

        this.renderFilteredSponsors(filteredSponsors);
        this.updateFilteredMetrics(filteredSponsors);
    }

    /**
     * Actualiza el rango de tiempo para analytics
     */
    updateTimeRange(range) {
        this.filters.dateRange = range;
        
        // Actualizar botones de tiempo
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Actualizar charts con nuevo rango
        this.updateChartsTimeRange(range);
        
        this.emitEvent('timeRange:updated', { range });
    }

    /**
     * Actualiza datos de patrocinadores
     */
    updateSponsors(sponsorsData) {
        sponsorsData.forEach(sponsor => {
            this.sponsors.set(sponsor.id, {
                ...sponsor,
                tier: this.calculateTier(sponsor.amount),
                lastUpdated: new Date()
            });
        });
        
        this.emitEvent('sponsors:updated', { count: this.sponsors.size });
    }

    /**
     * Calcula el tier basado en la cantidad donada
     */
    calculateTier(amount) {
        const tiers = this.config.sponsorTiers;
        if (amount >= tiers.platinum.minAmount) return 'platinum';
        if (amount >= tiers.gold.minAmount) return 'gold';
        if (amount >= tiers.silver.minAmount) return 'silver';
        if (amount >= tiers.bronze.minAmount) return 'bronze';
        return 'supporter';
    }

    /**
     * Actualiza métricas del dashboard
     */
    updateMetrics(metricsData) {
        Object.entries(metricsData).forEach(([key, value]) => {
            this.metrics.set(key, {
                value,
                timestamp: new Date(),
                change: this.calculateChange(key, value)
            });
        });
        
        this.updateMetricsDisplay();
        this.emitEvent('metrics:updated', { metrics: Object.fromEntries(this.metrics) });
    }

    /**
     * Calcula el cambio porcentual de una métrica
     */
    calculateChange(metricKey, currentValue) {
        const previous = this.metrics.get(metricKey);
        if (!previous) return 0;
        
        const change = ((currentValue - previous.value) / previous.value) * 100;
        return Math.round(change * 100) / 100;
    }

    /**
     * Renderiza la pestaña de overview
     */
    renderOverviewTab() {
        const container = document.getElementById('overview-tab');
        if (!container) return;

        // Renderizar métricas de impacto
        this.renderImpactMetrics();
        
        // Renderizar charts principales
        this.renderOverviewCharts();
    }

    /**
     * Renderiza métricas de impacto
     */
    renderImpactMetrics() {
        const container = document.getElementById('impactMetrics');
        if (!container) return;

        const metricsHTML = this.generateImpactMetricsHTML();
        container.innerHTML = metricsHTML;
        
        // Animar entrada de métricas
        this.animateMetricsEntry();
    }

    /**
     * Genera HTML para métricas de impacto
     */
    generateImpactMetricsHTML() {
        const totalFunding = this.calculateTotalFunding();
        const activeSponsors = this.getActiveSponsorsCount();
        const totalReach = this.calculateTotalReach();
        const growthRate = this.calculateGrowthRate();

        return `
            <div class="impact-metric-card metric-card-funding">
                <div class="metric-header">
                    <div class="metric-icon">💰</div>
                    <div class="metric-trend positive">
                        <span class="trend-arrow">↗</span>
                        +12%
                    </div>
                </div>
                <div class="metric-content">
                    <div class="metric-value">${totalFunding.toLocaleString()}</div>
                    <div class="metric-label">Total Recaudado</div>
                    <div class="metric-description">Fondos totales de patrocinadores activos</div>
                </div>
                <div class="metric-progress">
                    <div class="progress-label">
                        <span class="progress-label-text">Meta anual</span>
                        <span class="progress-percentage">${Math.round((totalFunding / this.config.metricTargets.funding) * 100)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(totalFunding / this.config.metricTargets.funding) * 100}%"></div>
                    </div>
                </div>
            </div>

            <div class="impact-metric-card metric-card-sponsors">
                <div class="metric-header">
                    <div class="metric-icon">🏢</div>
                    <div class="metric-trend positive">
                        <span class="trend-arrow">↗</span>
                        +8%
                    </div>
                </div>
                <div class="metric-content">
                    <div class="metric-value">${activeSponsors}</div>
                    <div class="metric-label">Patrocinadores Activos</div>
                    <div class="metric-description">Empresas y organizaciones colaboradoras</div>
                </div>
                <div class="metric-stats">
                    <div class="stat-item">
                        <div class="stat-value">${this.getSponsorsCountByTier('platinum')}</div>
                        <div class="stat-label">Platinum</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.getSponsorsCountByTier('gold')}</div>
                        <div class="stat-label">Gold</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.getSponsorsCountByTier('silver')}</div>
                        <div class="stat-label">Silver</div>
                    </div>
                </div>
            </div>

            <div class="impact-metric-card metric-card-reach">
                <div class="metric-header">
                    <div class="metric-icon">👥</div>
                    <div class="metric-trend positive">
                        <span class="trend-arrow">↗</span>
                        +23%
                    </div>
                </div>
                <div class="metric-content">
                    <div class="metric-value">${totalReach.toLocaleString()}</div>
                    <div class="metric-label">Alcance Total</div>
                    <div class="metric-description">Personas impactadas por nuestros programas</div>
                </div>
                <div class="metric-comparison">
                    <div class="comparison-icon">📊</div>
                    <span class="comparison-text">vs mes anterior: </span>
                    <span class="comparison-value">+5,230</span>
                </div>
            </div>

            <div class="impact-metric-card metric-card-growth">
                <div class="metric-header">
                    <div class="metric-icon">📈</div>
                    <div class="metric-trend positive">
                        <span class="trend-arrow">↗</span>
                        +${growthRate}%
                    </div>
                </div>
                <div class="metric-content">
                    <div class="metric-value">+${growthRate}%</div>
                    <div class="metric-label">Crecimiento Mensual</div>
                    <div class="metric-description">Incremento en donaciones este mes</div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza la pestaña de patrocinadores
     */
    renderSponsorsTab() {
        const container = document.getElementById('sponsorCards');
        if (!container) return;

        const sponsors = Array.from(this.sponsors.values());
        const sponsorsHTML = sponsors.map(sponsor => this.generateSponsorCardHTML(sponsor)).join('');
        
        container.innerHTML = sponsorsHTML;
        this.attachSponsorCardEvents();
    }

    /**
     * Genera HTML para una tarjeta de patrocinador
     */
    generateSponsorCardHTML(sponsor) {
        const tierConfig = this.config.sponsorTiers[sponsor.tier];
        
        return `
            <div class="sponsor-card" data-sponsor-id="${sponsor.id}" data-tier="${sponsor.tier}">
                <div class="sponsor-status ${sponsor.status}"></div>
                <div class="sponsor-card-header">
                    <div class="sponsor-logo">
                        ${sponsor.logo ? `<img src="${sponsor.logo}" alt="${sponsor.name}">` : sponsor.name.charAt(0)}
                    </div>
                    <div class="sponsor-info">
                        <div class="sponsor-name">${sponsor.name}</div>
                        <span class="sponsor-tier-badge">${tierConfig.name}</span>
                    </div>
                </div>
                <div class="sponsor-metrics">
                    <div class="metric-item">
                        <div class="metric-value">${sponsor.amount.toLocaleString()}</div>
                        <div class="metric-label">Contribución</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${sponsor.engagement || 0}</div>
                        <div class="metric-label">Engagement</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${(sponsor.reach || 0).toLocaleString()}</div>
                        <div class="metric-label">Alcance</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${sponsor.roi || 0}x</div>
                        <div class="metric-label">ROI</div>
                    </div>
                </div>
                <div class="sponsor-card-actions">
                    <button class="action-btn" onclick="dashboard.viewSponsorDetails('${sponsor.id}')">Ver Detalles</button>
                    <button class="action-btn primary" onclick="dashboard.editSponsor('${sponsor.id}')">Editar</button>
                </div>
                <div class="engagement-indicator engagement-${this.getEngagementLevel(sponsor.engagement)}">
                    ${Math.round(sponsor.engagement || 0)}
                </div>
            </div>
        `;
    }

    /**
     * Métodos de cálculo y utilidades
     */
    calculateTotalFunding() {
        return Array.from(this.sponsors.values())
            .filter(s => s.status === 'active')
            .reduce((sum, sponsor) => sum + sponsor.amount, 0);
    }

    getActiveSponsorsCount() {
        return Array.from(this.sponsors.values())
            .filter(s => s.status === 'active').length;
    }

    calculateTotalReach() {
        return Array.from(this.sponsors.values())
            .filter(s => s.status === 'active')
            .reduce((sum, sponsor) => sum + (sponsor.reach || 0), 0);
    }

    calculateGrowthRate() {
        // Simulación de cálculo de crecimiento
        return 23;
    }

    getSponsorsCountByTier(tier) {
        return Array.from(this.sponsors.values())
            .filter(s => s.tier === tier && s.status === 'active').length;
    }

    getEngagementLevel(engagement) {
        if (engagement >= 8) return 'high';
        if (engagement >= 6) return 'medium';
        return 'low';
    }

    /**
     * Métodos de eventos y utilidades
     */
    addEventListener(selector, event, handler) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.addEventListener(event, handler);
            
            // Guardar referencia para cleanup
            if (!this.eventListeners.has(element)) {
                this.eventListeners.set(element, []);
            }
            this.eventListeners.get(element).push({ event, handler });
        });
    }

    emitEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Métodos de API simulados
     */
    async fetchConfig() {
        // Simulación de llamada a API
        return new Promise(resolve => {
            setTimeout(() => resolve({}), 100);
        });
    }

    async fetchSponsors() {
        // Datos mock para desarrollo
        return [
            {
                id: 1,
                name: "TechCorp Inc.",
                amount: 75000,
                engagement: 8.5,
                reach: 15000,
                roi: 4.2,
                status: "active",
                logo: null
            },
            {
                id: 2,
                name: "Green Energy Solutions",
                amount: 35000,
                engagement: 7.8,
                reach: 12000,
                roi: 3.8,
                status: "active"
            },
            {
                id: 3,
                name: "Local Bank",
                amount: 15000,
                engagement: 6.5,
                reach: 8000,
                roi: 3.2,
                status: "active"
            }
        ];
    }

    async fetchMetrics() {
        const sponsors = Array.from(this.sponsors.values());
        return {
            totalFunding: sponsors.reduce((sum, s) => sum + s.amount, 0),
            activeSponsors: sponsors.filter(s => s.status === 'active').length,
            totalReach: sponsors.reduce((sum, s) => sum + (s.reach || 0), 0),
            averageEngagement: sponsors.reduce((sum, s) => sum + (s.engagement || 0), 0) / sponsors.length
        };
    }

    /**
     * Cleanup y destructor
     */
    destroy() {
        // Limpiar intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Remover event listeners
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        this.eventListeners.clear();

        // Limpiar módulos
        if (this.analytics) {
            this.analytics.destroy();
        }

        console.log('🧹 Dashboard Manager destruido correctamente');
    }
}

// Exportar para uso global
window.DashboardManager = DashboardManager;