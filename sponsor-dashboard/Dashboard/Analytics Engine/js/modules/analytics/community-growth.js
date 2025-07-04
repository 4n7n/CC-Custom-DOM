/**
 * Community Growth Module
 * Analiza el crecimiento de la comunidad y su impacto
 */

class CommunityGrowth {
    constructor(config = {}) {
        this.config = {
            trackingPeriod: 'monthly',
            growthTargets: {
                members: 0.15, // 15% mensual
                engagement: 0.10, // 10% mensual
                retention: 0.85 // 85% retención
            },
            segmentationCriteria: ['engagement', 'tenure', 'contribution'],
            ...config
        };
        
        this.growthData = new Map();
        this.cohortAnalysis = new Map();
        this.engagementMetrics = new Map();
        this.retentionMetrics = new Map();
        this.listeners = new Set();
        
        this.growthModels = new Map();
        this.projections = new Map();
    }

    /**
     * Inicializa el módulo de crecimiento comunitario
     */
    async initialize() {
        try {
            console.log('📈 Inicializando Community Growth...');
            
            // Cargar datos históricos de crecimiento
            await this.loadHistoricalGrowthData();
            
            // Configurar modelos de crecimiento
            this.setupGrowthModels();
            
            // Inicializar métricas de seguimiento
            this.initializeTrackingMetrics();
            
            console.log('✅ Community Growth inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Community Growth:', error);
            throw error;
        }
    }

    /**
     * Calcula métricas de crecimiento de la comunidad
     */
    calculateGrowthMetrics(communityData, timeframe = 'monthly') {
        const metrics = {
            memberGrowth: this.calculateMemberGrowth(communityData, timeframe),
            engagementGrowth: this.calculateEngagementGrowth(communityData, timeframe),
            retentionRates: this.calculateRetentionRates(communityData, timeframe),
            activationRates: this.calculateActivationRates(communityData, timeframe),
            viralCoefficient: this.calculateViralCoefficient(communityData),
            healthScore: this.calculateCommunityHealthScore(communityData)
        };
        
        // Calcular métricas compuestas
        metrics.overallGrowthScore = this.calculateOverallGrowthScore(metrics);
        metrics.sustainabilityIndex = this.calculateSustainabilityIndex(metrics);
        
        return metrics;
    }

    /**
     * Realiza análisis de cohortes de usuarios
     */
    performCohortAnalysis(userData, startDate, endDate) {
        const cohorts = this.groupUsersByCohort(userData, startDate, endDate);
        const analysis = {};
        
        Object.entries(cohorts).forEach(([cohortName, cohortUsers]) => {
            analysis[cohortName] = {
                size: cohortUsers.length,
                retention: this.calculateCohortRetention(cohortUsers),
                engagement: this.calculateCohortEngagement(cohortUsers),
                ltv: this.calculateCohortLTV(cohortUsers),
                conversionRate: this.calculateCohortConversion(cohortUsers),
                churned: this.calculateCohortChurn(cohortUsers),
                reactivated: this.calculateCohortReactivation(cohortUsers)
            };
        });
        
        return {
            cohorts: analysis,
            insights: this.generateCohortInsights(analysis),
            recommendations: this.generateCohortRecommendations(analysis)
        };
    }

    /**
     * Proyecta el crecimiento futuro de la comunidad
     */
    projectCommunityGrowth(currentData, timeHorizon = 12) {
        const growthModel = this.selectOptimalGrowthModel(currentData);
        const projection = [];
        
        for (let month = 1; month <= timeHorizon; month++) {
            const projectedMetrics = this.projectMonth(currentData, growthModel, month);
            projection.push({
                month,
                ...projectedMetrics,
                confidence: this.calculateProjectionConfidence(month, growthModel)
            });
        }
        
        return {
            projection,
            model: growthModel,
            assumptions: this.getModelAssumptions(growthModel),
            scenarios: this.generateGrowthScenarios(currentData, timeHorizon)
        };
    }

    /**
     * Identifica factores de crecimiento
     */
    identifyGrowthDrivers(communityData) {
        const drivers = {
            acquisition: this.analyzeAcquisitionChannels(communityData),
            engagement: this.analyzeEngagementDrivers(communityData),
            retention: this.analyzeRetentionFactors(communityData),
            virality: this.analyzeViralFactors(communityData),
            monetization: this.analyzeMonetizationImpact(communityData)
        };
        
        // Calcular impacto relativo de cada driver
        drivers.impact = this.calculateDriverImpact(drivers);
        drivers.recommendations = this.generateDriverRecommendations(drivers);
        
        return drivers;
    }

    /**
     * Calcula crecimiento de miembros
     */
    calculateMemberGrowth(data, timeframe) {
        const periods = this.groupByTimeframe(data.members, timeframe);
        const growth = [];
        
        const periodKeys = Object.keys(periods).sort();
        
        for (let i = 1; i < periodKeys.length; i++) {
            const current = periods[periodKeys[i]].length;
            const previous = periods[periodKeys[i-1]].length;
            const growthRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;
            
            growth.push({
                period: periodKeys[i],
                absolute: current - previous,
                percentage: growthRate,
                total: current
            });
        }
        
        return {
            periods: growth,
            averageGrowthRate: this.calculateAverageGrowthRate(growth),
            trend: this.identifyGrowthTrend(growth),
            acceleration: this.calculateGrowthAcceleration(growth)
        };
    }

    /**
     * Calcula crecimiento de engagement
     */
    calculateEngagementGrowth(data, timeframe) {
        const engagementData = data.engagement || [];
        const periods = this.groupByTimeframe(engagementData, timeframe);
        
        const engagementMetrics = {};
        
        Object.entries(periods).forEach(([period, periodData]) => {
            engagementMetrics[period] = {
                averageEngagement: this.calculateAverage(periodData, 'score'),
                activeUsers: periodData.filter(user => user.active).length,
                interactions: this.sumInteractions(periodData),
                sessionsPerUser: this.calculateSessionsPerUser(periodData)
            };
        });
        
        return {
            metrics: engagementMetrics,
            trend: this.calculateEngagementTrend(engagementMetrics),
            topEngagers: this.identifyTopEngagers(engagementData),
            engagementDistribution: this.calculateEngagementDistribution(engagementData)
        };
    }

    /**
     * Calcula tasas de retención
     */
    calculateRetentionRates(data, timeframe) {
        const retentionAnalysis = {};
        const periods = this.groupByTimeframe(data.members, timeframe);
        
        // Calcular retención por período
        Object.entries(periods).forEach(([period, users]) => {
            const nextPeriod = this.getNextPeriod(period, timeframe);
            const nextPeriodUsers = periods[nextPeriod] || [];
            
            const retained = users.filter(user => 
                nextPeriodUsers.some(nextUser => nextUser.id === user.id)
            );
            
            retentionAnalysis[period] = {
                total: users.length,
                retained: retained.length,
                retentionRate: users.length > 0 ? (retained.length / users.length) * 100 : 0,
                churned: users.length - retained.length,
                churnRate: users.length > 0 ? ((users.length - retained.length) / users.length) * 100 : 0
            };
        });
        
        return {
            byPeriod: retentionAnalysis,
            averageRetention: this.calculateAverageRetention(retentionAnalysis),
            retentionTrend: this.identifyRetentionTrend(retentionAnalysis),
            churnAnalysis: this.performChurnAnalysis(data.members)
        };
    }

    /**
     * Calcula tasas de activación
     */
    calculateActivationRates(data, timeframe) {
        const activationEvents = data.activationEvents || [];
        const newUsers = data.newUsers || [];
        
        const periods = this.groupByTimeframe(newUsers, timeframe);
        const activationAnalysis = {};
        
        Object.entries(periods).forEach(([period, periodUsers]) => {
            const activatedUsers = periodUsers.filter(user => {
                return activationEvents.some(event => 
                    event.userId === user.id && 
                    this.isInSamePeriod(event.date, period, timeframe)
                );
            });
            
            activationAnalysis[period] = {
                newUsers: periodUsers.length,
                activated: activatedUsers.length,
                activationRate: periodUsers.length > 0 ? 
                    (activatedUsers.length / periodUsers.length) * 100 : 0,
                timeToActivation: this.calculateAverageTimeToActivation(activatedUsers, activationEvents)
            };
        });
        
        return {
            byPeriod: activationAnalysis,
            averageActivationRate: this.calculateAverageActivation(activationAnalysis),
            activationFunnel: this.buildActivationFunnel(data),
            optimizationOpportunities: this.identifyActivationOpportunities(activationAnalysis)
        };
    }

    /**
     * Calcula coeficiente viral
     */
    calculateViralCoefficient(data) {
        const referrals = data.referrals || [];
        const invitations = data.invitations || [];
        
        // K = (invitations sent / user) × (conversion rate)
        const avgInvitationsPerUser = invitations.length / (data.members?.length || 1);
        const conversionRate = referrals.length / Math.max(invitations.length, 1);
        const viralCoefficient = avgInvitationsPerUser * conversionRate;
        
        return {
            coefficient: viralCoefficient,
            invitationsPerUser: avgInvitationsPerUser,
            conversionRate: conversionRate * 100,
            viralCycles: this.calculateViralCycles(referrals),
            amplificationFactor: this.calculateAmplificationFactor(viralCoefficient)
        };
    }

    /**
     * Calcula score de salud de la comunidad
     */
    calculateCommunityHealthScore(data) {
        const metrics = {
            growth: this.normalizeMetric(this.calculateMemberGrowth(data).averageGrowthRate, 'growth'),
            engagement: this.normalizeMetric(this.calculateEngagementScore(data), 'engagement'),
            retention: this.normalizeMetric(this.calculateRetentionRates(data).averageRetention, 'retention'),
            diversity: this.normalizeMetric(this.calculateDiversity(data), 'diversity'),
            satisfaction: this.normalizeMetric(this.calculateSatisfaction(data), 'satisfaction')
        };
        
        // Pesos para cada métrica
        const weights = {
            growth: 0.25,
            engagement: 0.25,
            retention: 0.20,
            diversity: 0.15,
            satisfaction: 0.15
        };
        
        const weightedScore = Object.entries(metrics).reduce((score, [metric, value]) => {
            return score + (value * weights[metric]);
        }, 0);
        
        return {
            overall: weightedScore,
            breakdown: metrics,
            weights,
            healthLevel: this.determineHealthLevel(weightedScore),
            recommendations: this.generateHealthRecommendations(metrics)
        };
    }

    /**
     * Métodos auxiliares
     */
    
    groupByTimeframe(data, timeframe) {
        const grouped = {};
        
        data.forEach(item => {
            const date = new Date(item.date || item.createdAt);
            let key;
            
            switch (timeframe) {
                case 'weekly':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'monthly':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'quarterly':
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    key = `${date.getFullYear()}-Q${quarter}`;
                    break;
                default:
                    key = date.toISOString().split('T')[0];
            }
            
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        });
        
        return grouped;
    }

    calculateAverage(data, field) {
        if (data.length === 0) return 0;
        const sum = data.reduce((total, item) => total + (item[field] || 0), 0);
        return sum / data.length;
    }

    calculateAverageGrowthRate(growth) {
        if (growth.length === 0) return 0;
        const totalGrowth = growth.reduce((sum, period) => sum + period.percentage, 0);
        return totalGrowth / growth.length;
    }

    identifyGrowthTrend(growth) {
        if (growth.length < 3) return 'insufficient_data';
        
        const recent = growth.slice(-3);
        const increasing = recent.every((period, index) => 
            index === 0 || period.percentage >= recent[index - 1].percentage
        );
        const decreasing = recent.every((period, index) => 
            index === 0 || period.percentage <= recent[index - 1].percentage
        );
        
        if (increasing) return 'increasing';
        if (decreasing) return 'decreasing';
        return 'stable';
    }

    async loadHistoricalGrowthData() {
        // Simulación de carga de datos históricos
        console.log('📊 Cargando datos históricos de crecimiento...');
    }

    setupGrowthModels() {
        this.growthModels.set('linear', {
            type: 'linear',
            equation: (x, params) => params.a * x + params.b,
            parameters: { a: 0.1, b: 0 }
        });
        
        this.growthModels.set('exponential', {
            type: 'exponential',
            equation: (x, params) => params.a * Math.pow(params.r, x),
            parameters: { a: 1, r: 1.1 }
        });
        
        this.growthModels.set('logistic', {
            type: 'logistic',
            equation: (x, params) => params.k / (1 + Math.exp(-params.r * (x - params.x0))),
            parameters: { k: 10000, r: 0.1, x0: 50 }
        });
    }

    initializeTrackingMetrics() {
        // Configurar métricas de seguimiento por defecto
        this.trackingMetrics = [
            'new_members',
            'active_members',
            'engagement_score',
            'retention_rate',
            'churn_rate',
            'referral_rate'
        ];
    }

    /**
     * Event listeners
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error en listener de community growth:', error);
            }
        });
    }

    /**
     * Destructor
     */
    destroy() {
        this.growthData.clear();
        this.cohortAnalysis.clear();
        this.engagementMetrics.clear();
        this.retentionMetrics.clear();
        this.listeners.clear();
        this.growthModels.clear();
        this.projections.clear();
        
        console.log('🧹 Community Growth destruido correctamente');
    }
}

// Exportar para uso global
window.CommunityGrowth = CommunityGrowth;