/**
 * Impact Metrics Module
 * Calcula y gestiona las métricas de impacto de patrocinadores
 */

class ImpactMetrics {
    constructor(config = {}) {
        this.config = {
            refreshInterval: 60000, // 1 minuto
            calculateTrends: true,
            trackHistoricalData: true,
            benchmarkComparison: true,
            ...config
        };
        
        this.metrics = new Map();
        this.historicalData = new Map();
        this.benchmarks = new Map();
        this.calculationCache = new Map();
        this.listeners = new Set();
        
        this.metricDefinitions = {
            totalFunding: {
                name: 'Total de Fondos Recaudados',
                description: 'Suma total de todas las contribuciones de patrocinadores activos',
                format: 'currency',
                trend: true,
                target: 200000,
                unit: 'USD'
            },
            activeSponsors: {
                name: 'Patrocinadores Activos',
                description: 'Número de patrocinadores con estado activo',
                format: 'number',
                trend: true,
                target: 20,
                unit: 'sponsors'
            },
            totalReach: {
                name: 'Alcance Total',
                description: 'Número total de personas impactadas por los programas',
                format: 'number',
                trend: true,
                target: 100000,
                unit: 'people'
            },
            averageEngagement: {
                name: 'Engagement Promedio',
                description: 'Nivel promedio de engagement de todos los patrocinadores',
                format: 'percentage',
                trend: true,
                target: 8.0,
                unit: 'score'
            },
            conversionRate: {
                name: 'Tasa de Conversión',
                description: 'Porcentaje de prospectos que se convierten en patrocinadores',
                format: 'percentage',
                trend: true,
                target: 0.15,
                unit: 'rate'
            },
            retentionRate: {
                name: 'Tasa de Retención',
                description: 'Porcentaje de patrocinadores que renuevan su colaboración',
                format: 'percentage',
                trend: true,
                target: 0.85,
                unit: 'rate'
            },
            averageDonation: {
                name: 'Donación Promedio',
                description: 'Monto promedio de contribución por patrocinador',
                format: 'currency',
                trend: true,
                target: 25000,
                unit: 'USD'
            },
            impactPerDollar: {
                name: 'Impacto por Dólar',
                description: 'Número de personas impactadas por cada dólar recibido',
                format: 'ratio',
                trend: true,
                target: 2.5,
                unit: 'people/USD'
            }
        };
    }

    /**
     * Inicializa el módulo de métricas de impacto
     */
    async initialize(sponsorsData = [], historicalData = []) {
        try {
            console.log('📊 Inicializando Impact Metrics...');
            
            // Cargar datos históricos si están disponibles
            if (historicalData.length > 0) {
                this.loadHistoricalData(historicalData);
            }
            
            // Cargar benchmarks de la industria
            await this.loadBenchmarks();
            
            // Calcular métricas iniciales
            this.calculateAllMetrics(sponsorsData);
            
            // Configurar actualización automática
            this.setupAutoUpdate();
            
            console.log('✅ Impact Metrics inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Impact Metrics:', error);
            throw error;
        }
    }

    /**
     * Calcula todas las métricas de impacto
     */
    calculateAllMetrics(sponsorsData) {
        const timestamp = new Date();
        
        try {
            // Métricas básicas
            const totalFunding = this.calculateTotalFunding(sponsorsData);
            const activeSponsors = this.calculateActiveSponsors(sponsorsData);
            const totalReach = this.calculateTotalReach(sponsorsData);
            const averageEngagement = this.calculateAverageEngagement(sponsorsData);
            
            // Métricas calculadas
            const averageDonation = this.calculateAverageDonation(sponsorsData);
            const impactPerDollar = this.calculateImpactPerDollar(totalReach, totalFunding);
            const conversionRate = this.calculateConversionRate();
            const retentionRate = this.calculateRetentionRate();
            
            // Almacenar métricas
            this.setMetric('totalFunding', totalFunding, timestamp);
            this.setMetric('activeSponsors', activeSponsors, timestamp);
            this.setMetric('totalReach', totalReach, timestamp);
            this.setMetric('averageEngagement', averageEngagement, timestamp);
            this.setMetric('averageDonation', averageDonation, timestamp);
            this.setMetric('impactPerDollar', impactPerDollar, timestamp);
            this.setMetric('conversionRate', conversionRate, timestamp);
            this.setMetric('retentionRate', retentionRate, timestamp);
            
            // Calcular tendencias si está habilitado
            if (this.config.calculateTrends) {
                this.calculateTrends();
            }
            
            // Notificar a los listeners
            this.notifyListeners('metrics:calculated', {
                timestamp,
                metrics: Object.fromEntries(this.metrics)
            });
            
        } catch (error) {
            console.error('Error calculando métricas:', error);
        }
    }

    /**
     * Calcula el total de fondos recaudados
     */
    calculateTotalFunding(sponsorsData) {
        return sponsorsData
            .filter(sponsor => sponsor.status === 'active')
            .reduce((total, sponsor) => total + (sponsor.amount || 0), 0);
    }

    /**
     * Calcula el número de patrocinadores activos
     */
    calculateActiveSponsors(sponsorsData) {
        return sponsorsData.filter(sponsor => sponsor.status === 'active').length;
    }

    /**
     * Calcula el alcance total
     */
    calculateTotalReach(sponsorsData) {
        return sponsorsData
            .filter(sponsor => sponsor.status === 'active')
            .reduce((total, sponsor) => total + (sponsor.reach || 0), 0);
    }

    /**
     * Calcula el engagement promedio
     */
    calculateAverageEngagement(sponsorsData) {
        const activeSponsors = sponsorsData.filter(sponsor => 
            sponsor.status === 'active' && sponsor.engagement
        );
        
        if (activeSponsors.length === 0) return 0;
        
        const totalEngagement = activeSponsors.reduce((total, sponsor) => 
            total + sponsor.engagement, 0
        );
        
        return Math.round((totalEngagement / activeSponsors.length) * 100) / 100;
    }

    /**
     * Calcula la donación promedio
     */
    calculateAverageDonation(sponsorsData) {
        const activeSponsors = sponsorsData.filter(sponsor => sponsor.status === 'active');
        
        if (activeSponsors.length === 0) return 0;
        
        const totalFunding = this.calculateTotalFunding(sponsorsData);
        return Math.round(totalFunding / activeSponsors.length);
    }

    /**
     * Calcula el impacto por dólar
     */
    calculateImpactPerDollar(totalReach, totalFunding) {
        if (totalFunding === 0) return 0;
        return Math.round((totalReach / totalFunding) * 100) / 100;
    }

    /**
     * Calcula la tasa de conversión (simulada)
     */
    calculateConversionRate() {
        // En un entorno real, esto vendría de datos de pipeline de ventas
        const prospects = 100; // Número de prospectos contactados
        const conversions = 15; // Número que se convirtieron en patrocinadores
        
        return Math.round((conversions / prospects) * 10000) / 10000;
    }

    /**
     * Calcula la tasa de retención (simulada)
     */
    calculateRetentionRate() {
        // En un entorno real, esto vendría de datos históricos de renovaciones
        const eligibleForRenewal = 20;
        const renewed = 17;
        
        return Math.round((renewed / eligibleForRenewal) * 10000) / 10000;
    }

    /**
     * Calcula tendencias para todas las métricas
     */
    calculateTrends() {
        for (const [metricName, metricData] of this.metrics) {
            const trend = this.calculateMetricTrend(metricName);
            if (trend !== null) {
                metricData.trend = trend;
                metricData.trendDirection = trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral';
                metricData.trendPercentage = Math.abs(trend);
            }
        }
    }

    /**
     * Calcula la tendencia de una métrica específica
     */
    calculateMetricTrend(metricName) {
        const historical = this.historicalData.get(metricName);
        if (!historical || historical.length < 2) return null;
        
        const current = historical[historical.length - 1];
        const previous = historical[historical.length - 2];
        
        if (previous.value === 0) return 0;
        
        const change = ((current.value - previous.value) / previous.value) * 100;
        return Math.round(change * 100) / 100;
    }

    /**
     * Almacena una métrica con timestamp
     */
    setMetric(name, value, timestamp = new Date()) {
        const metricDefinition = this.metricDefinitions[name];
        
        const metricData = {
            name: metricDefinition?.name || name,
            value,
            timestamp,
            definition: metricDefinition,
            formattedValue: this.formatMetricValue(value, metricDefinition?.format),
            targetProgress: this.calculateTargetProgress(value, metricDefinition?.target),
            benchmark: this.benchmarks.get(name)
        };
        
        this.metrics.set(name, metricData);
        
        // Agregar a datos históricos
        if (this.config.trackHistoricalData) {
            this.addToHistoricalData(name, value, timestamp);
        }
    }

    /**
     * Obtiene una métrica específica
     */
    getMetric(name) {
        return this.metrics.get(name);
    }

    /**
     * Obtiene todas las métricas
     */
    getAllMetrics() {
        return Object.fromEntries(this.metrics);
    }

    /**
     * Formatea el valor de una métrica según su tipo
     */
    formatMetricValue(value, format) {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0
                }).format(value);
                
            case 'percentage':
                return new Intl.NumberFormat('en-US', {
                    style: 'percent',
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                }).format(value);
                
            case 'number':
                return new Intl.NumberFormat('en-US').format(value);
                
            case 'ratio':
                return `${value}:1`;
                
            default:
                return value.toString();
        }
    }

    /**
     * Calcula el progreso hacia el objetivo
     */
    calculateTargetProgress(value, target) {
        if (!target) return null;
        
        const progress = (value / target) * 100;
        return Math.min(Math.round(progress * 100) / 100, 100);
    }

    /**
     * Agrega datos a la serie histórica
     */
    addToHistoricalData(metricName, value, timestamp) {
        if (!this.historicalData.has(metricName)) {
            this.historicalData.set(metricName, []);
        }
        
        const historical = this.historicalData.get(metricName);
        historical.push({ value, timestamp });
        
        // Mantener solo los últimos 100 puntos de datos
        if (historical.length > 100) {
            historical.shift();
        }
    }

    /**
     * Carga datos históricos
     */
    loadHistoricalData(data) {
        data.forEach(entry => {
            Object.entries(entry.metrics).forEach(([metricName, value]) => {
                this.addToHistoricalData(metricName, value, new Date(entry.timestamp));
            });
        });
    }

    /**
     * Carga benchmarks de la industria
     */
    async loadBenchmarks() {
        // En un entorno real, esto vendría de una API externa
        const industryBenchmarks = {
            totalFunding: { average: 150000, percentile75: 300000 },
            activeSponsors: { average: 15, percentile75: 25 },
            averageEngagement: { average: 6.5, percentile75: 8.5 },
            conversionRate: { average: 0.12, percentile75: 0.18 },
            retentionRate: { average: 0.75, percentile75: 0.90 },
            impactPerDollar: { average: 2.0, percentile75: 3.5 }
        };
        
        Object.entries(industryBenchmarks).forEach(([metric, benchmark]) => {
            this.benchmarks.set(metric, benchmark);
        });
    }

    /**
     * Configura actualización automática
     */
    setupAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            this.notifyListeners('metrics:refresh-needed');
        }, this.config.refreshInterval);
    }

    /**
     * Agrega un listener para eventos de métricas
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remueve un listener
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notifica a todos los listeners
     */
    notifyListeners(event, data = {}) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error en listener de métricas:', error);
            }
        });
    }

    /**
     * Exporta métricas para reporte
     */
    exportMetrics(format = 'json') {
        const exportData = {
            timestamp: new Date().toISOString(),
            metrics: this.getAllMetrics(),
            historical: Object.fromEntries(this.historicalData),
            benchmarks: Object.fromEntries(this.benchmarks)
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
                
            case 'csv':
                return this.convertToCSV(exportData.metrics);
                
            default:
                return exportData;
        }
    }

    /**
     * Convierte métricas a formato CSV
     */
    convertToCSV(metrics) {
        const headers = ['Metric', 'Value', 'Formatted Value', 'Target Progress', 'Timestamp'];
        const rows = Object.entries(metrics).map(([key, metric]) => [
            metric.name,
            metric.value,
            metric.formattedValue,
            metric.targetProgress || 'N/A',
            metric.timestamp.toISOString()
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    /**
     * Destructor del módulo
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.listeners.clear();
        this.metrics.clear();
        this.historicalData.clear();
        this.benchmarks.clear();
        this.calculationCache.clear();
        
        console.log('🧹 Impact Metrics destruido correctamente');
    }
}

// Exportar para uso global
window.ImpactMetrics = ImpactMetrics;