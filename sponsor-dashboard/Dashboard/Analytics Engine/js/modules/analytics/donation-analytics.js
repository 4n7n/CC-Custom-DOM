/**
 * Donation Analytics Module
 * Análisis específico de donaciones y tendencias financieras
 */

class DonationAnalytics {
    constructor(config = {}) {
        this.config = {
            currency: 'USD',
            fiscalYearStart: 'January',
            analysisDepth: 'detailed',
            forecastPeriods: 12,
            ...config
        };
        
        this.donationData = new Map();
        this.trendAnalysis = new Map();
        this.forecastModels = new Map();
        this.seasonalPatterns = new Map();
        this.listeners = new Set();
        
        this.analysisCache = new Map();
        this.lastCacheUpdate = null;
    }

    /**
     * Inicializa el módulo de analytics de donaciones
     */
    async initialize() {
        try {
            console.log('💰 Inicializando Donation Analytics...');
            
            // Cargar datos históricos de donaciones
            await this.loadDonationHistory();
            
            // Configurar modelos de análisis
            this.setupAnalysisModels();
            
            // Detectar patrones estacionales
            this.detectSeasonalPatterns();
            
            console.log('✅ Donation Analytics inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Donation Analytics:', error);
            throw error;
        }
    }

    /**
     * Analiza tendencias de donaciones
     */
    analyzeDonationTrends(donations, timeframe = 'monthly') {
        const trends = {
            volume: this.analyzeVolumeTriendes(donations, timeframe),
            amount: this.analyzeAmountTrends(donations, timeframe),
            frequency: this.analyzeFrequencyTrends(donations, timeframe),
            seasonality: this.analyzeSeasonality(donations, timeframe),
            growth: this.calculateGrowthMetrics(donations, timeframe)
        };
        
        // Calcular métricas derivadas
        trends.momentum = this.calculateMomentum(trends);
        trends.volatility = this.calculateVolatility(trends);
        trends.stability = this.assessStability(trends);
        
        return trends;
    }

    /**
     * Genera forecast de donaciones
     */
    generateDonationForecast(donations, periods = 12) {
        const historical = this.prepareHistoricalData(donations);
        const seasonality = this.extractSeasonality(historical);
        const trend = this.extractTrend(historical);
        
        const forecast = [];
        
        for (let i = 1; i <= periods; i++) {
            const baseValue = this.projectTrend(trend, i);
            const seasonalAdjustment = this.getSeasonalAdjustment(seasonality, i);
            const uncertainty = this.calculateUncertainty(i);
            
            const predicted = baseValue * seasonalAdjustment;
            
            forecast.push({
                period: i,
                predicted,
                lower: predicted * (1 - uncertainty),
                upper: predicted * (1 + uncertainty),
                confidence: Math.max(0.5, 1 - (i * 0.05)) // Decrece con el tiempo
            });
        }
        
        return {
            forecast,
            model: {
                type: 'seasonal_trend',
                accuracy: this.calculateModelAccuracy(historical),
                lastUpdated: new Date()
            },
            assumptions: this.getModelAssumptions()
        };
    }

    /**
     * Analiza patrones de donación por segmento
     */
    analyzeBySegment(donations, segmentBy = 'tier') {
        const segments = this.groupDonationsBySegment(donations, segmentBy);
        const analysis = {};
        
        Object.entries(segments).forEach(([segment, segmentDonations]) => {
            analysis[segment] = {
                count: segmentDonations.length,
                totalAmount: this.sumAmounts(segmentDonations),
                averageAmount: this.calculateAverage(segmentDonations, 'amount'),
                medianAmount: this.calculateMedian(segmentDonations, 'amount'),
                frequency: this.calculateDonationFrequency(segmentDonations),
                retention: this.calculateSegmentRetention(segmentDonations),
                growth: this.calculateSegmentGrowth(segmentDonations),
                seasonality: this.analyzeSegmentSeasonality(segmentDonations)
            };
        });
        
        // Análisis comparativo entre segmentos
        analysis._comparative = this.performComparativeAnalysis(analysis);
        
        return analysis;
    }

    /**
     * Calcula métricas de rendimiento de campañas
     */
    analyzeCampaignPerformance(donations, campaigns) {
        const campaignMetrics = {};
        
        campaigns.forEach(campaign => {
            const campaignDonations = donations.filter(d => 
                d.campaignId === campaign.id
            );
            
            campaignMetrics[campaign.id] = {
                name: campaign.name,
                totalRaised: this.sumAmounts(campaignDonations),
                donorCount: new Set(campaignDonations.map(d => d.donorId)).size,
                averageDonation: this.calculateAverage(campaignDonations, 'amount'),
                conversionRate: this.calculateConversionRate(campaign, campaignDonations),
                costPerDollar: this.calculateCostPerDollar(campaign, campaignDonations),
                roi: this.calculateCampaignROI(campaign, campaignDonations),
                timeline: this.analyzeCampaignTimeline(campaign, campaignDonations)
            };
        });
        
        return {
            campaigns: campaignMetrics,
            ranking: this.rankCampaigns(campaignMetrics),
            insights: this.generateCampaignInsights(campaignMetrics)
        };
    }

    /**
     * Detecta anomalías en donaciones
     */
    detectAnomalies(donations, sensitivity = 'medium') {
        const thresholds = this.getAnomalyThresholds(sensitivity);
        const anomalies = [];
        
        // Agrupar por período
        const monthly = this.groupByMonth(donations);
        
        Object.entries(monthly).forEach(([month, monthDonations]) => {
            const monthTotal = this.sumAmounts(monthDonations);
            const expected = this.getExpectedAmount(month);
            const deviation = Math.abs(monthTotal - expected) / expected;
            
            if (deviation > thresholds.amount) {
                anomalies.push({
                    type: 'amount_anomaly',
                    period: month,
                    actual: monthTotal,
                    expected,
                    deviation,
                    severity: deviation > thresholds.critical ? 'critical' : 'warning'
                });
            }
            
            // Detectar picos de actividad
            if (monthDonations.length > this.getExpectedCount(month) * thresholds.volume) {
                anomalies.push({
                    type: 'volume_spike',
                    period: month,
                    count: monthDonations.length,
                    severity: 'info'
                });
            }
        });
        
        return {
            anomalies,
            summary: this.summarizeAnomalies(anomalies),
            recommendations: this.getAnomalyRecommendations(anomalies)
        };
    }

    /**
     * Análisis de lifetime value de donadores
     */
    calculateDonorLTV(donations) {
        const donorMetrics = {};
        
        // Agrupar por donador
        const donorGroups = this.groupByDonor(donations);
        
        Object.entries(donorGroups).forEach(([donorId, donorDonations]) => {
            const sortedDonations = donorDonations.sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );
            
            const firstDonation = sortedDonations[0];
            const lastDonation = sortedDonations[sortedDonations.length - 1];
            const lifespan = this.calculateLifespan(firstDonation.date, lastDonation.date);
            
            donorMetrics[donorId] = {
                totalDonated: this.sumAmounts(sortedDonations),
                donationCount: sortedDonations.length,
                averageDonation: this.calculateAverage(sortedDonations, 'amount'),
                frequency: sortedDonations.length / (lifespan / 365), // por año
                lifespan, // en días
                firstDonation: firstDonation.date,
                lastDonation: lastDonation.date,
                ltv: this.calculateLTV(sortedDonations, lifespan),
                predictedLTV: this.predictLTV(sortedDonations, lifespan),
                churnRisk: this.assessChurnRisk(sortedDonations)
            };
        });
        
        return {
            individual: donorMetrics,
            aggregate: this.calculateAggregateLTV(donorMetrics),
            segmentation: this.segmentByLTV(donorMetrics)
        };
    }

    /**
     * Análisis de efectividad de canales
     */
    analyzeChannelEffectiveness(donations) {
        const channels = this.groupByChannel(donations);
        const effectiveness = {};
        
        Object.entries(channels).forEach(([channel, channelDonations]) => {
            effectiveness[channel] = {
                volume: channelDonations.length,
                totalAmount: this.sumAmounts(channelDonations),
                averageAmount: this.calculateAverage(channelDonations, 'amount'),
                conversionRate: this.calculateChannelConversion(channel, channelDonations),
                costEfficiency: this.calculateChannelCost(channel, channelDonations),
                donorRetention: this.calculateChannelRetention(channel, channelDonations),
                growthTrend: this.calculateChannelGrowth(channelDonations)
            };
        });
        
        return {
            channels: effectiveness,
            ranking: this.rankChannels(effectiveness),
            optimization: this.getChannelOptimization(effectiveness)
        };
    }

    /**
     * Métodos de cálculo específicos
     */
    
    analyzeVolumeTriendes(donations, timeframe) {
        const grouped = this.groupByTimeframe(donations, timeframe);
        const volumes = Object.values(grouped).map(group => group.length);
        
        return {
            data: volumes,
            trend: this.calculateLinearTrend(volumes),
            volatility: this.calculateStandardDeviation(volumes),
            growth: this.calculatePeriodOverPeriodGrowth(volumes),
            acceleration: this.calculateAcceleration(volumes)
        };
    }

    analyzeAmountTrends(donations, timeframe) {
        const grouped = this.groupByTimeframe(donations, timeframe);
        const amounts = Object.values(grouped).map(group => this.sumAmounts(group));
        
        return {
            data: amounts,
            trend: this.calculateLinearTrend(amounts),
            volatility: this.calculateStandardDeviation(amounts),
            growth: this.calculatePeriodOverPeriodGrowth(amounts),
            averageGrowth: this.calculateAverageGrowthRate(amounts)
        };
    }

    calculateGrowthMetrics(donations, timeframe) {
        const grouped = this.groupByTimeframe(donations, timeframe);
        const periods = Object.keys(grouped).sort();
        
        if (periods.length < 2) return { rate: 0, compound: 0, trend: 'stable' };
        
        const firstPeriod = this.sumAmounts(grouped[periods[0]]);
        const lastPeriod = this.sumAmounts(grouped[periods[periods.length - 1]]);
        
        const totalGrowthRate = ((lastPeriod - firstPeriod) / firstPeriod) * 100;
        const compoundGrowthRate = Math.pow(lastPeriod / firstPeriod, 1 / (periods.length - 1)) - 1;
        
        return {
            rate: totalGrowthRate,
            compound: compoundGrowthRate * 100,
            trend: totalGrowthRate > 5 ? 'growing' : totalGrowthRate < -5 ? 'declining' : 'stable'
        };
    }

    extractSeasonality(historicalData) {
        const monthlyAverages = {};
        const monthlyData = this.groupByMonth(historicalData);
        
        // Calcular promedio por mes
        Object.entries(monthlyData).forEach(([month, data]) => {
            const monthIndex = new Date(month + '-01').getMonth();
            if (!monthlyAverages[monthIndex]) monthlyAverages[monthIndex] = [];
            monthlyAverages[monthIndex].push(this.sumAmounts(data));
        });
        
        // Calcular índices estacionales
        const seasonalIndices = {};
        const overallAverage = this.calculateOverallAverage(monthlyAverages);
        
        Object.entries(monthlyAverages).forEach(([month, values]) => {
            const monthAverage = values.reduce((sum, val) => sum + val, 0) / values.length;
            seasonalIndices[month] = monthAverage / overallAverage;
        });
        
        return seasonalIndices;
    }

    extractTrend(historicalData) {
        const monthly = this.groupByMonth(historicalData);
        const amounts = Object.values(monthly).map(group => this.sumAmounts(group));
        
        return this.calculateLinearTrend(amounts);
    }

    calculateModelAccuracy(historicalData) {
        // Simulación de validación cruzada
        const predictions = this.generateBacktestPredictions(historicalData);
        const actuals = this.getActualValues(historicalData);
        
        let totalError = 0;
        let count = 0;
        
        predictions.forEach((predicted, index) => {
            if (actuals[index]) {
                const error = Math.abs(predicted - actuals[index]) / actuals[index];
                totalError += error;
                count++;
            }
        });
        
        const meanAbsolutePercentageError = count > 0 ? totalError / count : 0;
        return Math.max(0, 1 - meanAbsolutePercentageError); // Convertir a accuracy
    }

    /**
     * Análisis de retención y churn
     */
    calculateDonorRetention(donations) {
        const donorGroups = this.groupByDonor(donations);
        const retentionAnalysis = {
            overall: 0,
            byPeriod: {},
            byCohort: {},
            trends: {}
        };
        
        // Calcular retención general
        const activeDonors = Object.keys(donorGroups).filter(donorId => {
            const donorDonations = donorGroups[donorId];
            const lastDonation = Math.max(...donorDonations.map(d => new Date(d.date)));
            const daysSinceLastDonation = (new Date() - lastDonation) / (1000 * 60 * 60 * 24);
            return daysSinceLastDonation <= 365; // Activo en el último año
        });
        
        retentionAnalysis.overall = activeDonors.length / Object.keys(donorGroups).length;
        
        // Análisis por cohorte
        const cohorts = this.groupDonorsByCohort(donorGroups);
        Object.entries(cohorts).forEach(([cohort, cohortDonors]) => {
            retentionAnalysis.byCohort[cohort] = this.calculateCohortRetention(cohortDonors);
        });
        
        return retentionAnalysis;
    }

    /**
     * Optimización y recomendaciones
     */
    generateOptimizationRecommendations(donations) {
        const analysis = {
            segments: this.analyzeBySegment(donations),
            trends: this.analyzeDonationTrends(donations),
            channels: this.analyzeChannelEffectiveness(donations),
            timing: this.analyzeOptimalTiming(donations)
        };
        
        const recommendations = [];
        
        // Recomendaciones basadas en segmentos
        if (analysis.segments.platinum && analysis.segments.platinum.frequency < 2) {
            recommendations.push({
                type: 'segment_optimization',
                priority: 'high',
                message: 'Aumentar frecuencia de engagement con patrocinadores platinum',
                expectedImpact: '15-25% aumento en retención',
                actions: ['Programa VIP personalizado', 'Comunicación mensual exclusiva']
            });
        }
        
        // Recomendaciones basadas en canales
        const topChannel = Object.entries(analysis.channels.channels)
            .sort((a, b) => b[1].conversionRate - a[1].conversionRate)[0];
        
        if (topChannel) {
            recommendations.push({
                type: 'channel_optimization',
                priority: 'medium',
                message: `Aumentar inversión en canal ${topChannel[0]}`,
                expectedImpact: '10-20% aumento en conversiones',
                actions: ['Incrementar presupuesto', 'Optimizar contenido específico']
            });
        }
        
        // Recomendaciones estacionales
        const seasonality = analysis.trends.seasonality;
        if (seasonality && seasonality.peakMonth) {
            recommendations.push({
                type: 'seasonal_optimization',
                priority: 'medium',
                message: `Maximizar campañas en ${seasonality.peakMonth}`,
                expectedImpact: '20-30% aumento en donaciones estacionales',
                actions: ['Campaña especial pre-pico', 'Inventory de contenido']
            });
        }
        
        return recommendations;
    }

    /**
     * Análisis predictivo avanzado
     */
    performPredictiveAnalysis(donations) {
        return {
            churnPrediction: this.predictChurn(donations),
            upsellOpportunities: this.identifyUpsellOpportunities(donations),
            optimalTiming: this.predictOptimalContactTiming(donations),
            lifecycleStage: this.predictLifecycleProgression(donations),
            valueSegmentation: this.predictValueSegmentation(donations)
        };
    }

    predictChurn(donations) {
        const donorGroups = this.groupByDonor(donations);
        const churnPredictions = {};
        
        Object.entries(donorGroups).forEach(([donorId, donorDonations]) => {
            const features = this.extractChurnFeatures(donorDonations);
            const churnScore = this.calculateChurnScore(features);
            
            churnPredictions[donorId] = {
                score: churnScore,
                risk: churnScore > 0.7 ? 'high' : churnScore > 0.4 ? 'medium' : 'low',
                factors: this.identifyChurnFactors(features),
                preventionActions: this.getChurnPreventionActions(churnScore, features)
            };
        });
        
        return churnPredictions;
    }

    /**
     * Métodos auxiliares y utilidades
     */
    
    groupByTimeframe(donations, timeframe) {
        const grouped = {};
        
        donations.forEach(donation => {
            const date = new Date(donation.date);
            let key;
            
            switch (timeframe) {
                case 'daily':
                    key = date.toISOString().split('T')[0];
                    break;
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
            grouped[key].push(donation);
        });
        
        return grouped;
    }

    sumAmounts(donations) {
        return donations.reduce((sum, donation) => sum + (donation.amount || 0), 0);
    }

    calculateAverage(items, field) {
        if (items.length === 0) return 0;
        const sum = items.reduce((total, item) => total + (item[field] || 0), 0);
        return sum / items.length;
    }

    calculateMedian(items, field) {
        if (items.length === 0) return 0;
        
        const values = items.map(item => item[field] || 0).sort((a, b) => a - b);
        const middle = Math.floor(values.length / 2);
        
        if (values.length % 2 === 0) {
            return (values[middle - 1] + values[middle]) / 2;
        } else {
            return values[middle];
        }
    }

    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
        
        return Math.sqrt(variance);
    }

    calculateLinearTrend(values) {
        if (values.length < 2) return { slope: 0, intercept: 0, r2: 0 };
        
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = values;
        
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const sumYY = y.reduce((sum, val) => sum + val * val, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calcular R²
        const yMean = sumY / n;
        const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
        const ssResidual = y.reduce((sum, val, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(val - predicted, 2);
        }, 0);
        const r2 = 1 - (ssResidual / ssTotal);
        
        return { slope, intercept, r2 };
    }

    async loadDonationHistory() {
        // Simulación de carga de datos históricos
        console.log('💾 Cargando historial de donaciones...');
    }

    setupAnalysisModels() {
        // Configurar modelos de análisis
        this.forecastModels.set('seasonal', {
            type: 'seasonal_decomposition',
            parameters: { seasonLength: 12, trendSmoothing: 0.3 }
        });
        
        this.forecastModels.set('linear', {
            type: 'linear_regression',
            parameters: { regularization: 0.01 }
        });
    }

    detectSeasonalPatterns() {
        // Detectar patrones estacionales automáticamente
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Patrones simulados basados en tendencias comunes
        const patterns = {
            'holiday_giving': { peak: 'Dec', strength: 0.8 },
            'spring_renewal': { peak: 'Mar', strength: 0.3 },
            'year_end': { peak: 'Nov', strength: 0.6 }
        };
        
        this.seasonalPatterns.set('detected', patterns);
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
                console.error('Error en listener de donation analytics:', error);
            }
        });
    }

    /**
     * Destructor
     */
    destroy() {
        this.donationData.clear();
        this.trendAnalysis.clear();
        this.forecastModels.clear();
        this.seasonalPatterns.clear();
        this.listeners.clear();
        this.analysisCache.clear();
        
        console.log('🧹 Donation Analytics destruido correctamente');
    }
}

// Exportar para uso global
window.DonationAnalytics = DonationAnalytics;