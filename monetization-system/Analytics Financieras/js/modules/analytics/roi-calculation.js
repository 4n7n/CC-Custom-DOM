/**
 * Clase principal para cálculos de ROI y métricas de valor
 * Proporciona análisis detallado del retorno de inversión para patrocinadores
 */
class ROICalculator {
    constructor(options = {}) {
        this.config = {
            currency: options.currency || 'USD',
            locale: options.locale || 'en-US',
            apiEndpoint: options.apiEndpoint || '/api/analytics',
            industryBenchmarks: options.industryBenchmarks || {},
            trackingPeriod: options.trackingPeriod || 90, // días
            updateInterval: options.updateInterval || 24 * 60 * 60 * 1000, // 24 horas
            ...options
        };
        
        // Estado del calculador
        this.state = {
            sponsors: new Map(),
            campaigns: new Map(),
            metrics: new Map(),
            benchmarks: new Map(),
            calculations: new Map(),
            historicalData: [],
            lastUpdate: null
        };
        
        // Métricas de conversión estándar
        this.conversionMetrics = {
            impressionToClick: 0.02, // 2%
            clickToEngagement: 0.15, // 15%
            engagementToConversion: 0.05, // 5%
            brandRecallImprovement: 0.25, // 25%
            brandSentimentImprovement: 0.30, // 30%
            customerAcquisitionCost: 50, // $50 promedio
            customerLifetimeValue: 500 // $500 promedio
        };
        
        // Pesos para cálculo de valor compuesto
        this.valueWeights = {
            directEngagement: 0.30,
            brandAwareness: 0.25,
            socialImpact: 0.20,
            mediaValue: 0.15,
            leadGeneration: 0.10
        };
        
        this.init();
    }
    
    /**
     * Inicialización del sistema ROI
     */
    async init() {
        try {
            await this.loadBenchmarkData();
            await this.loadHistoricalData();
            this.setupAutoUpdate();
            
            console.log('ROI Calculator initialized successfully');
            this.dispatchEvent('roiCalculator:ready', { instance: this });
            
        } catch (error) {
            console.error('Error initializing ROI Calculator:', error);
        }
    }
    
    /**
     * Carga datos de benchmarks de la industria
     */
    async loadBenchmarkData() {
        try {
            const response = await fetch('/data/industry-benchmarks.json');
            if (response.ok) {
                const benchmarks = await response.json();
                this.setBenchmarks(benchmarks);
            } else {
                // Usar benchmarks por defecto
                this.setBenchmarks(this.getDefaultBenchmarks());
            }
        } catch (error) {
            console.warn('Could not load benchmark data, using defaults:', error);
            this.setBenchmarks(this.getDefaultBenchmarks());
        }
    }
    
    /**
     * Carga datos históricos para análisis de tendencias
     */
    async loadHistoricalData() {
        try {
            const response = await fetch(`${this.config.apiEndpoint}/historical-roi`);
            if (response.ok) {
                this.state.historicalData = await response.json();
            }
        } catch (error) {
            console.warn('Could not load historical data:', error);
            this.state.historicalData = [];
        }
    }
    
    /**
     * Establece benchmarks de la industria
     */
    setBenchmarks(benchmarks) {
        this.state.benchmarks.clear();
        Object.entries(benchmarks).forEach(([key, value]) => {
            this.state.benchmarks.set(key, value);
        });
    }
    
    /**
     * Registra un nuevo patrocinador para tracking
     */
    registerSponsor(sponsorData) {
        const sponsor = {
            id: sponsorData.id,
            name: sponsorData.name,
            tier: sponsorData.tier,
            investment: sponsorData.investment,
            startDate: new Date(sponsorData.startDate),
            endDate: sponsorData.endDate ? new Date(sponsorData.endDate) : null,
            industry: sponsorData.industry || 'general',
            objectives: sponsorData.objectives || [],
            kpis: sponsorData.kpis || {},
            campaigns: [],
            totalROI: 0,
            monthlyROI: [],
            registeredAt: new Date()
        };
        
        this.state.sponsors.set(sponsor.id, sponsor);
        this.trackEvent('sponsor_registered', { sponsorId: sponsor.id, tier: sponsor.tier });
        
        return sponsor;
    }
    
    /**
     * Registra datos de campaña para un patrocinador
     */
    registerCampaign(sponsorId, campaignData) {
        const sponsor = this.state.sponsors.get(sponsorId);
        if (!sponsor) {
            throw new Error(`Sponsor ${sponsorId} not found`);
        }
        
        const campaign = {
            id: campaignData.id,
            sponsorId: sponsorId,
            name: campaignData.name,
            type: campaignData.type || 'story-sponsorship',
            startDate: new Date(campaignData.startDate),
            endDate: campaignData.endDate ? new Date(campaignData.endDate) : null,
            budget: campaignData.budget,
            metrics: {
                impressions: 0,
                clicks: 0,
                engagements: 0,
                shares: 0,
                comments: 0,
                timeSpent: 0,
                completionRate: 0,
                brandMentions: 0,
                socialReach: 0,
                ...campaignData.metrics
            },
            goals: campaignData.goals || {},
            registeredAt: new Date()
        };
        
        this.state.campaigns.set(campaign.id, campaign);
        sponsor.campaigns.push(campaign.id);
        
        this.trackEvent('campaign_registered', { 
            sponsorId, 
            campaignId: campaign.id, 
            type: campaign.type 
        });
        
        return campaign;
    }
    
    /**
     * Actualiza métricas de una campaña
     */
    updateCampaignMetrics(campaignId, metricsUpdate) {
        const campaign = this.state.campaigns.get(campaignId);
        if (!campaign) {
            throw new Error(`Campaign ${campaignId} not found`);
        }
        
        // Actualizar métricas
        Object.entries(metricsUpdate).forEach(([key, value]) => {
            if (typeof value === 'number') {
                campaign.metrics[key] = value;
            }
        });
        
        campaign.lastUpdated = new Date();
        
        // Recalcular ROI
        this.calculateCampaignROI(campaignId);
        this.calculateSponsorROI(campaign.sponsorId);
        
        this.trackEvent('metrics_updated', { 
            campaignId, 
            sponsorId: campaign.sponsorId,
            metricsCount: Object.keys(metricsUpdate).length
        });
    }
    
    /**
     * Calcula ROI de una campaña específica
     */
    calculateCampaignROI(campaignId) {
        const campaign = this.state.campaigns.get(campaignId);
        if (!campaign) {
            throw new Error(`Campaign ${campaignId} not found`);
        }
        
        const sponsor = this.state.sponsors.get(campaign.sponsorId);
        const metrics = campaign.metrics;
        
        // Cálculos de valor base
        const calculations = {
            // Valor directo de engagement
            directEngagementValue: this.calculateDirectEngagementValue(metrics),
            
            // Valor de awareness de marca
            brandAwarenessValue: this.calculateBrandAwarenessValue(metrics, sponsor.industry),
            
            // Valor de medios equivalente
            mediaEquivalentValue: this.calculateMediaEquivalentValue(metrics),
            
            // Valor de generación de leads
            leadGenerationValue: this.calculateLeadGenerationValue(metrics),
            
            // Valor de impacto social
            socialImpactValue: this.calculateSocialImpactValue(metrics),
            
            // Métricas de eficiencia
            costPerImpression: campaign.budget / (metrics.impressions || 1),
            costPerClick: campaign.budget / (metrics.clicks || 1),
            costPerEngagement: campaign.budget / (metrics.engagements || 1),
            
            // Tasas de conversión
            clickThroughRate: metrics.clicks / (metrics.impressions || 1),
            engagementRate: metrics.engagements / (metrics.impressions || 1),
            completionRate: metrics.completionRate || 0,
            
            // Tiempo y duración
            campaignDuration: this.getCampaignDuration(campaign),
            averageTimeSpent: metrics.timeSpent / (metrics.engagements || 1)
        };
        
        // Valor total compuesto
        calculations.totalValue = 
            calculations.directEngagementValue * this.valueWeights.directEngagement +
            calculations.brandAwarenessValue * this.valueWeights.brandAwareness +
            calculations.socialImpactValue * this.valueWeights.socialImpact +
            calculations.mediaEquivalentValue * this.valueWeights.mediaValue +
            calculations.leadGenerationValue * this.valueWeights.leadGeneration;
        
        // ROI principal
        calculations.roi = ((calculations.totalValue - campaign.budget) / campaign.budget) * 100;
        
        // ROI por categoría
        calculations.categoryROI = {
            engagement: ((calculations.directEngagementValue - campaign.budget * 0.3) / (campaign.budget * 0.3)) * 100,
            brand: ((calculations.brandAwarenessValue - campaign.budget * 0.25) / (campaign.budget * 0.25)) * 100,
            media: ((calculations.mediaEquivalentValue - campaign.budget * 0.15) / (campaign.budget * 0.15)) * 100,
            leads: ((calculations.leadGenerationValue - campaign.budget * 0.1) / (campaign.budget * 0.1)) * 100,
            social: ((calculations.socialImpactValue - campaign.budget * 0.2) / (campaign.budget * 0.2)) * 100
        };
        
        // Benchmarking
        calculations.benchmarkComparison = this.compareToBenchmarks(calculations, sponsor.industry);
        
        // Proyecciones
        calculations.projectedValue = this.calculateProjectedValue(campaign, calculations);
        
        // Score de rendimiento
        calculations.performanceScore = this.calculatePerformanceScore(calculations);
        
        // Guardar cálculos
        campaign.roiCalculations = calculations;
        campaign.lastROICalculation = new Date();
        
        return calculations;
    }
    
    /**
     * Calcula valor directo de engagement
     */
    calculateDirectEngagementValue(metrics) {
        const engagementValue = {
            clicks: metrics.clicks * 0.25, // $0.25 por click
            shares: metrics.shares * 2.00, // $2.00 por share
            comments: metrics.comments * 1.50, // $1.50 por comment
            timeSpent: (metrics.timeSpent / 60) * 0.10 // $0.10 por minuto
        };
        
        return Object.values(engagementValue).reduce((sum, value) => sum + value, 0);
    }
    
    /**
     * Calcula valor de awareness de marca
     */
    calculateBrandAwarenessValue(metrics, industry = 'general') {
        const industryMultiplier = this.getIndustryMultiplier(industry);
        const baseImpressionValue = 0.001; // $0.001 per impression base
        
        const awarenessValue = {
            impressions: metrics.impressions * baseImpressionValue * industryMultiplier,
            brandMentions: metrics.brandMentions * 5.00, // $5.00 por mención
            socialReach: metrics.socialReach * 0.002 * industryMultiplier
        };
        
        // Bonus por completion rate alta
        if (metrics.completionRate > 0.7) {
            awarenessValue.completionBonus = awarenessValue.impressions * 0.5;
        }
        
        return Object.values(awarenessValue).reduce((sum, value) => sum + value, 0);
    }
    
    /**
     * Calcula valor equivalente en medios
     */
    calculateMediaEquivalentValue(metrics) {
        const mediaRates = {
            impressionCPM: 2.50, // $2.50 CPM
            engagementCPM: 15.00, // $15.00 CPM para engagement
            shareCPM: 25.00, // $25.00 CPM para shares
            commentCPM: 20.00 // $20.00 CPM para comments
        };
        
        return {
            impressionValue: (metrics.impressions / 1000) * mediaRates.impressionCPM,
            engagementValue: (metrics.engagements / 1000) * mediaRates.engagementCPM,
            shareValue: (metrics.shares / 1000) * mediaRates.shareCPM,
            commentValue: (metrics.comments / 1000) * mediaRates.commentCPM
        };
    }
    
    /**
     * Calcula valor de generación de leads
     */
    calculateLeadGenerationValue(metrics) {
        const estimatedLeads = metrics.clicks * this.conversionMetrics.clickToEngagement * 0.1; // 10% de engagements son leads
        const leadValue = estimatedLeads * this.conversionMetrics.customerLifetimeValue * 0.05; // 5% del LTV
        
        return {
            estimatedLeads,
            leadValue,
            costPerLead: leadValue > 0 ? (metrics.budget || 0) / estimatedLeads : 0
        };
    }
    
    /**
     * Calcula valor de impacto social
     */
    calculateSocialImpactValue(metrics) {
        // Valor intangible pero medible del impacto social
        const socialMultiplier = this.getSocialImpactMultiplier(metrics);
        
        return {
            communityEngagement: metrics.engagements * 0.50 * socialMultiplier,
            storyReach: metrics.impressions * 0.0005 * socialMultiplier,
            culturalPreservation: metrics.timeSpent * 0.01 * socialMultiplier,
            socialCohesion: metrics.shares * 1.00 * socialMultiplier
        };
    }
    
    /**
     * Calcula ROI total del patrocinador
     */
    calculateSponsorROI(sponsorId) {
        const sponsor = this.state.sponsors.get(sponsorId);
        if (!sponsor) {
            throw new Error(`Sponsor ${sponsorId} not found`);
        }
        
        // Agregar todos los ROIs de campaña
        let totalInvestment = sponsor.investment;
        let totalValue = 0;
        let campaignROIs = [];
        
        sponsor.campaigns.forEach(campaignId => {
            const campaign = this.state.campaigns.get(campaignId);
            if (campaign && campaign.roiCalculations) {
                totalInvestment += campaign.budget;
                totalValue += campaign.roiCalculations.totalValue;
                campaignROIs.push({
                    campaignId,
                    roi: campaign.roiCalculations.roi,
                    value: campaign.roiCalculations.totalValue
                });
            }
        });
        
        // ROI total del patrocinador
        const totalROI = totalInvestment > 0 ? ((totalValue - totalInvestment) / totalInvestment) * 100 : 0;
        
        // Métricas agregadas
        const aggregatedMetrics = this.aggregateSponsorMetrics(sponsor);
        
        // Análisis temporal
        const temporalAnalysis = this.analyzeTemporalTrends(sponsor);
        
        // Proyecciones futuras
        const projections = this.projectFutureROI(sponsor, totalROI);
        
        const calculations = {
            totalROI,
            totalInvestment,
            totalValue,
            campaignROIs,
            aggregatedMetrics,
            temporalAnalysis,
            projections,
            performanceGrade: this.calculatePerformanceGrade(totalROI),
            industryComparison: this.compareToIndustryAverage(totalROI, sponsor.industry),
            recommendations: this.generateRecommendations(sponsor, totalROI)
        };
        
        sponsor.totalROI = totalROI;
        sponsor.roiCalculations = calculations;
        sponsor.lastROICalculation = new Date();
        
        return calculations;
    }
    
    /**
     * Agrega métricas de todas las campañas del patrocinador
     */
    aggregateSponsorMetrics(sponsor) {
        const aggregated = {
            totalImpressions: 0,
            totalClicks: 0,
            totalEngagements: 0,
            totalShares: 0,
            totalComments: 0,
            totalTimeSpent: 0,
            totalBrandMentions: 0,
            totalSocialReach: 0,
            averageCompletionRate: 0,
            campaignCount: sponsor.campaigns.length
        };
        
        let completionRateSum = 0;
        let activeCampaigns = 0;
        
        sponsor.campaigns.forEach(campaignId => {
            const campaign = this.state.campaigns.get(campaignId);
            if (campaign) {
                const metrics = campaign.metrics;
                aggregated.totalImpressions += metrics.impressions || 0;
                aggregated.totalClicks += metrics.clicks || 0;
                aggregated.totalEngagements += metrics.engagements || 0;
                aggregated.totalShares += metrics.shares || 0;
                aggregated.totalComments += metrics.comments || 0;
                aggregated.totalTimeSpent += metrics.timeSpent || 0;
                aggregated.totalBrandMentions += metrics.brandMentions || 0;
                aggregated.totalSocialReach += metrics.socialReach || 0;
                
                if (metrics.completionRate) {
                    completionRateSum += metrics.completionRate;
                    activeCampaigns++;
                }
            }
        });
        
        // Calcular promedios
        aggregated.averageCompletionRate = activeCampaigns > 0 ? completionRateSum / activeCampaigns : 0;
        aggregated.averageCTR = aggregated.totalImpressions > 0 ? aggregated.totalClicks / aggregated.totalImpressions : 0;
        aggregated.averageEngagementRate = aggregated.totalImpressions > 0 ? aggregated.totalEngagements / aggregated.totalImpressions : 0;
        
        return aggregated;
    }
    
    /**
     * Analiza tendencias temporales del ROI
     */
    analyzeTemporalTrends(sponsor) {
        const monthlyData = [];
        const startDate = sponsor.startDate;
        const endDate = sponsor.endDate || new Date();
        
        // Generar datos mensuales
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const monthData = {
                month: new Date(currentDate),
                roi: 0,
                investment: 0,
                value: 0,
                campaigns: 0
            };
            
            // Calcular métricas para este mes
            sponsor.campaigns.forEach(campaignId => {
                const campaign = this.state.campaigns.get(campaignId);
                if (campaign && this.isDateInMonth(campaign.startDate, currentDate)) {
                    if (campaign.roiCalculations) {
                        monthData.roi += campaign.roiCalculations.roi;
                        monthData.investment += campaign.budget;
                        monthData.value += campaign.roiCalculations.totalValue;
                        monthData.campaigns++;
                    }
                }
            });
            
            // Promedio de ROI si hay múltiples campañas
            if (monthData.campaigns > 0) {
                monthData.roi = monthData.roi / monthData.campaigns;
            }
            
            monthlyData.push(monthData);
            
            // Avanzar al siguiente mes
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        // Calcular tendencias
        const trends = this.calculateTrends(monthlyData);
        
        return {
            monthlyData,
            trends,
            bestMonth: this.findBestMonth(monthlyData),
            worstMonth: this.findWorstMonth(monthlyData),
            growthRate: trends.roiGrowthRate,
            volatility: this.calculateVolatility(monthlyData.map(d => d.roi))
        };
    }
    
    /**
     * Proyecta ROI futuro basado en tendencias
     */
    projectFutureROI(sponsor, currentROI) {
        const projectionMonths = 6; // Proyectar 6 meses adelante
        const historicalTrend = this.calculateROITrend(sponsor);
        
        const projections = [];
        let projectedROI = currentROI;
        
        for (let i = 1; i <= projectionMonths; i++) {
            // Aplicar tendencia con factor de decaimiento
            const trendFactor = historicalTrend * Math.pow(0.95, i); // Decaimiento del 5% por mes
            projectedROI += trendFactor;
            
            projections.push({
                month: i,
                projectedROI: Math.max(0, projectedROI), // No permitir ROI negativo
                confidence: Math.max(0.3, 1 - (i * 0.1)), // Confianza decrece con el tiempo
                range: {
                    low: projectedROI * 0.8,
                    high: projectedROI * 1.2
                }
            });
        }
        
        return {
            projections,
            trend: historicalTrend,
            recommendation: this.getProjectionRecommendation(projections)
        };
    }
    
    /**
     * Compara con benchmarks de la industria
     */
    compareToBenchmarks(calculations, industry) {
        const benchmarks = this.state.benchmarks.get(industry) || this.state.benchmarks.get('general');
        if (!benchmarks) return null;
        
        return {
            roiVsBenchmark: calculations.roi - benchmarks.averageROI,
            ctrVsBenchmark: calculations.clickThroughRate - benchmarks.averageCTR,
            engagementVsBenchmark: calculations.engagementRate - benchmarks.averageEngagement,
            performanceRank: this.calculatePerformanceRank(calculations.roi, benchmarks),
            industryPercentile: this.calculatePercentile(calculations.roi, benchmarks.roiDistribution)
        };
    }
    
    /**
     * Genera recomendaciones basadas en el análisis
     */
    generateRecommendations(sponsor, totalROI) {
        const recommendations = [];
        
        // Análisis de ROI general
        if (totalROI < 50) {
            recommendations.push({
                type: 'improvement',
                priority: 'high',
                title: 'Optimize Campaign Targeting',
                description: 'Current ROI is below industry average. Consider refining audience targeting and content strategy.',
                expectedImpact: 25
            });
        }
        
        // Análisis por campaña
        sponsor.campaigns.forEach(campaignId => {
            const campaign = this.state.campaigns.get(campaignId);
            if (campaign && campaign.roiCalculations) {
                const roi = campaign.roiCalculations.roi;
                
                if (roi < 0) {
                    recommendations.push({
                        type: 'urgent',
                        priority: 'critical',
                        title: `Reevaluate Campaign: ${campaign.name}`,
                        description: 'This campaign is showing negative ROI. Consider pausing or restructuring.',
                        campaignId: campaignId,
                        expectedImpact: 50
                    });
                }
                
                if (campaign.roiCalculations.clickThroughRate < 0.01) {
                    recommendations.push({
                        type: 'optimization',
                        priority: 'medium',
                        title: `Improve CTR for ${campaign.name}`,
                        description: 'Click-through rate is below optimal. Consider A/B testing different call-to-actions.',
                        campaignId: campaignId,
                        expectedImpact: 15
                    });
                }
            }
        });
        
        // Recomendaciones de expansión
        if (totalROI > 100) {
            recommendations.push({
                type: 'expansion',
                priority: 'medium',
                title: 'Scale Successful Campaigns',
                description: 'Your campaigns are performing well. Consider increasing budget for top performers.',
                expectedImpact: 30
            });
        }
        
        return recommendations.sort((a, b) => {
            const priorityOrder = { critical: 3, high: 2, medium: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    
    /**
     * Calcula score de rendimiento
     */
    calculatePerformanceScore(calculations) {
        let score = 0;
        let maxScore = 100;
        
        // ROI (40 puntos máximo)
        if (calculations.roi > 200) score += 40;
        else if (calculations.roi > 100) score += 30;
        else if (calculations.roi > 50) score += 20;
        else if (calculations.roi > 0) score += 10;
        
        // CTR (20 puntos máximo)
        if (calculations.clickThroughRate > 0.05) score += 20;
        else if (calculations.clickThroughRate > 0.03) score += 15;
        else if (calculations.clickThroughRate > 0.02) score += 10;
        else if (calculations.clickThroughRate > 0.01) score += 5;
        
        // Engagement Rate (20 puntos máximo)
        if (calculations.engagementRate > 0.1) score += 20;
        else if (calculations.engagementRate > 0.07) score += 15;
        else if (calculations.engagementRate > 0.05) score += 10;
        else if (calculations.engagementRate > 0.03) score += 5;
        
        // Completion Rate (20 puntos máximo)
        if (calculations.completionRate > 0.8) score += 20;
        else if (calculations.completionRate > 0.6) score += 15;
        else if (calculations.completionRate > 0.4) score += 10;
        else if (calculations.completionRate > 0.2) score += 5;
        
        return {
            score: Math.round(score),
            maxScore,
            percentage: Math.round((score / maxScore) * 100),
            grade: this.scoreToGrade(score)
        };
    }
    
    /**
     * Genera reporte completo de ROI
     */
    generateROIReport(sponsorId, options = {}) {
        const sponsor = this.state.sponsors.get(sponsorId);
        if (!sponsor) {
            throw new Error(`Sponsor ${sponsorId} not found`);
        }
        
        const format = options.format || 'json';
        const includeProjections = options.includeProjections !== false;
        const includeBenchmarks = options.includeBenchmarks !== false;
        
        // Recalcular ROI más reciente
        this.calculateSponsorROI(sponsorId);
        
        const report = {
            metadata: {
                sponsorId: sponsor.id,
                sponsorName: sponsor.name,
                reportDate: new Date().toISOString(),
                reportPeriod: {
                    start: sponsor.startDate.toISOString(),
                    end: sponsor.endDate ? sponsor.endDate.toISOString() : new Date().toISOString()
                },
                currency: this.config.currency
            },
            
            summary: {
                totalInvestment: sponsor.roiCalculations.totalInvestment,
                totalValue: sponsor.roiCalculations.totalValue,
                totalROI: sponsor.roiCalculations.totalROI,
                performanceGrade: sponsor.roiCalculations.performanceGrade,
                campaignCount: sponsor.campaigns.length
            },
            
            campaigns: sponsor.campaigns.map(campaignId => {
                const campaign = this.state.campaigns.get(campaignId);
                return {
                    id: campaign.id,
                    name: campaign.name,
                    budget: campaign.budget,
                    roi: campaign.roiCalculations ? campaign.roiCalculations.roi : 0,
                    performanceScore: campaign.roiCalculations ? campaign.roiCalculations.performanceScore : null
                };
            }),
            
            metrics: sponsor.roiCalculations.aggregatedMetrics,
            
            trends: sponsor.roiCalculations.temporalAnalysis,
            
            recommendations: sponsor.roiCalculations.recommendations
        };
        
        if (includeProjections) {
            report.projections = sponsor.roiCalculations.projections;
        }
        
        if (includeBenchmarks) {
            report.benchmarkComparison = sponsor.roiCalculations.industryComparison;
        }
        
        // Formatear según el tipo solicitado
        switch (format) {
            case 'csv':
                return this.formatReportAsCSV(report);
            case 'pdf':
                return this.formatReportAsPDF(report);
            default:
                return report;
        }
    }
    
    /**
     * Exporta datos para dashboard
     */
    getDashboardData(sponsorId) {
        const sponsor = this.state.sponsors.get(sponsorId);
        if (!sponsor) return null;
        
        return {
            currentROI: sponsor.totalROI,
            monthlyTrend: sponsor.roiCalculations?.temporalAnalysis?.trends?.roiGrowthRate || 0,
            performanceScore: sponsor.roiCalculations?.aggregatedMetrics?.performanceScore || 0,
            totalValue: sponsor.roiCalculations?.totalValue || 0,
            campaignCount: sponsor.campaigns.length,
            topRecommendation: sponsor.roiCalculations?.recommendations?.[0] || null,
            chartData: {
                monthlyROI: sponsor.roiCalculations?.temporalAnalysis?.monthlyData?.map(d => ({
                    month: d.month.toISOString().substr(0, 7),
                    roi: Math.round(d.roi * 100) / 100,
                    investment: d.investment,
                    value: d.value
                })) || [],
                categoryBreakdown: this.getCategoryBreakdown(sponsor),
                campaignComparison: this.getCampaignComparison(sponsor)
            }
        };
    }
    
    /**
     * Obtiene breakdown por categorías de valor
     */
    getCategoryBreakdown(sponsor) {
        const breakdown = {
            engagement: 0,
            brand: 0,
            media: 0,
            leads: 0,
            social: 0
        };
        
        sponsor.campaigns.forEach(campaignId => {
            const campaign = this.state.campaigns.get(campaignId);
            if (campaign && campaign.roiCalculations) {
                const calc = campaign.roiCalculations;
                breakdown.engagement += calc.directEngagementValue || 0;
                breakdown.brand += calc.brandAwarenessValue || 0;
                breakdown.media += (calc.mediaEquivalentValue?.impressionValue || 0) +
                                 (calc.mediaEquivalentValue?.engagementValue || 0);
                breakdown.leads += calc.leadGenerationValue?.leadValue || 0;
                breakdown.social += (calc.socialImpactValue?.communityEngagement || 0) +
                                   (calc.socialImpactValue?.storyReach || 0);
            }
        });
        
        return Object.entries(breakdown).map(([category, value]) => ({
            category,
            value: Math.round(value),
            percentage: Math.round((value / Object.values(breakdown).reduce((a, b) => a + b, 1)) * 100)
        }));
    }
    
    /**
     * Obtiene comparación entre campañas
     */
    getCampaignComparison(sponsor) {
        return sponsor.campaigns.map(campaignId => {
            const campaign = this.state.campaigns.get(campaignId);
            if (!campaign) return null;
            
            return {
                name: campaign.name,
                roi: campaign.roiCalculations?.roi || 0,
                budget: campaign.budget,
                value: campaign.roiCalculations?.totalValue || 0,
                performanceScore: campaign.roiCalculations?.performanceScore?.percentage || 0
            };
        }).filter(Boolean);
    }
    
    /**
     * Funciones de utilidad
     */
    
    getIndustryMultiplier(industry) {
        const multipliers = {
            'technology': 1.2,
            'finance': 1.1,
            'healthcare': 1.3,
            'education': 1.0,
            'nonprofit': 0.8,
            'retail': 1.1,
            'general': 1.0
        };
        return multipliers[industry] || 1.0;
    }
    
    getSocialImpactMultiplier(metrics) {
        // Multiplicador basado en engagement profundo
        const avgTimeSpent = metrics.timeSpent / (metrics.engagements || 1);
        if (avgTimeSpent > 300) return 1.5; // >5 minutos
        if (avgTimeSpent > 180) return 1.3; // >3 minutos
        if (avgTimeSpent > 60) return 1.1;  // >1 minuto
        return 1.0;
    }
    
    getCampaignDuration(campaign) {
        const start = campaign.startDate;
        const end = campaign.endDate || new Date();
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // días
    }
    
    calculateProjectedValue(campaign, calculations) {
        const remainingDays = campaign.endDate ? 
            Math.max(0, Math.ceil((campaign.endDate - new Date()) / (1000 * 60 * 60 * 24))) : 30;
        
        if (remainingDays === 0) return calculations.totalValue;
        
        const dailyValue = calculations.totalValue / this.getCampaignDuration(campaign);
        return calculations.totalValue + (dailyValue * remainingDays);
    }
    
    calculatePerformanceGrade(roi) {
        if (roi >= 200) return 'A+';
        if (roi >= 150) return 'A';
        if (roi >= 100) return 'B+';
        if (roi >= 75) return 'B';
        if (roi >= 50) return 'C+';
        if (roi >= 25) return 'C';
        if (roi >= 0) return 'D';
        return 'F';
    }
    
    compareToIndustryAverage(roi, industry) {
        const averages = {
            'technology': 85,
            'finance': 65,
            'healthcare': 95,
            'education': 55,
            'nonprofit': 45,
            'retail': 75,
            'general': 70
        };
        
        const industryAverage = averages[industry] || averages.general;
        const difference = roi - industryAverage;
        
        return {
            industryAverage,
            difference,
            percentageDifference: (difference / industryAverage) * 100,
            performance: difference > 0 ? 'above' : 'below'
        };
    }
    
    isDateInMonth(date, monthDate) {
        return date.getFullYear() === monthDate.getFullYear() &&
               date.getMonth() === monthDate.getMonth();
    }
    
    calculateTrends(monthlyData) {
        if (monthlyData.length < 2) return { roiGrowthRate: 0 };
        
        const roiValues = monthlyData.map(d => d.roi);
        const roiGrowthRate = this.calculateGrowthRate(roiValues);
        
        return {
            roiGrowthRate,
            isImproving: roiGrowthRate > 0,
            volatility: this.calculateVolatility(roiValues)
        };
    }
    
    calculateGrowthRate(values) {
        if (values.length < 2) return 0;
        
        const firstValue = values[0] || 0;
        const lastValue = values[values.length - 1] || 0;
        
        if (firstValue === 0) return lastValue > 0 ? 100 : 0;
        
        return ((lastValue - firstValue) / firstValue) * 100;
    }
    
    calculateVolatility(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        
        return Math.sqrt(variance);
    }
    
    findBestMonth(monthlyData) {
        return monthlyData.reduce((best, current) => 
            current.roi > best.roi ? current : best, monthlyData[0]);
    }
    
    findWorstMonth(monthlyData) {
        return monthlyData.reduce((worst, current) => 
            current.roi < worst.roi ? current : worst, monthlyData[0]);
    }
    
    calculateROITrend(sponsor) {
        const roiHistory = sponsor.roiCalculations?.temporalAnalysis?.monthlyData || [];
        if (roiHistory.length < 3) return 0;
        
        const recentMonths = roiHistory.slice(-3).map(d => d.roi);
        return this.calculateGrowthRate(recentMonths);
    }
    
    getProjectionRecommendation(projections) {
        const avgProjectedROI = projections.reduce((sum, p) => sum + p.projectedROI, 0) / projections.length;
        
        if (avgProjectedROI > 100) {
            return 'Strong growth expected. Consider increasing investment.';
        } else if (avgProjectedROI > 50) {
            return 'Moderate growth expected. Maintain current strategy.';
        } else if (avgProjectedROI > 0) {
            return 'Slow growth expected. Consider optimization strategies.';
        } else {
            return 'Declining trend detected. Immediate action recommended.';
        }
    }
    
    calculatePerformanceRank(roi, benchmarks) {
        if (!benchmarks.roiDistribution) return 50;
        
        const distribution = benchmarks.roiDistribution;
        let rank = 0;
        
        for (let i = 0; i < distribution.length; i++) {
            if (roi > distribution[i]) rank = i + 1;
            else break;
        }
        
        return Math.round((rank / distribution.length) * 100);
    }
    
    calculatePercentile(value, distribution) {
        if (!distribution || distribution.length === 0) return 50;
        
        const sorted = [...distribution].sort((a, b) => a - b);
        let count = 0;
        
        for (let val of sorted) {
            if (val < value) count++;
            else break;
        }
        
        return Math.round((count / sorted.length) * 100);
    }
    
    scoreToGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 85) return 'A';
        if (score >= 80) return 'B+';
        if (score >= 75) return 'B';
        if (score >= 70) return 'C+';
        if (score >= 65) return 'C';
        if (score >= 60) return 'D+';
        if (score >= 55) return 'D';
        return 'F';
    }
    
    /**
     * Funciones de formateo de reportes
     */
    
    formatReportAsCSV(report) {
        const csvData = [];
        
        // Header
        csvData.push(['Metric', 'Value', 'Currency']);
        
        // Summary data
        csvData.push(['Total Investment', report.summary.totalInvestment, report.metadata.currency]);
        csvData.push(['Total Value', report.summary.totalValue, report.metadata.currency]);
        csvData.push(['Total ROI (%)', report.summary.totalROI, '%']);
        csvData.push(['Performance Grade', report.summary.performanceGrade, '']);
        csvData.push(['Campaign Count', report.summary.campaignCount, '']);
        
        // Campaign data
        csvData.push(['', '', '']); // Empty row
        csvData.push(['Campaign Name', 'Budget', 'ROI (%)']);
        
        report.campaigns.forEach(campaign => {
            csvData.push([campaign.name, campaign.budget, campaign.roi]);
        });
        
        return csvData.map(row => row.join(',')).join('\n');
    }
    
    formatReportAsPDF(report) {
        // En una implementación real, esto generaría un PDF
        // Por ahora retornamos un objeto con la estructura para PDF
        return {
            type: 'pdf',
            title: `ROI Report - ${report.metadata.sponsorName}`,
            sections: [
                {
                    title: 'Executive Summary',
                    content: `Total ROI: ${report.summary.totalROI.toFixed(1)}%`
                },
                {
                    title: 'Campaign Performance',
                    content: report.campaigns
                },
                {
                    title: 'Recommendations',
                    content: report.recommendations
                }
            ],
            metadata: report.metadata
        };
    }
    
    /**
     * Configuración de benchmarks por defecto
     */
    getDefaultBenchmarks() {
        return {
            general: {
                averageROI: 70,
                averageCTR: 0.025,
                averageEngagement: 0.05,
                roiDistribution: [10, 25, 40, 55, 70, 85, 100, 120, 150, 200]
            },
            technology: {
                averageROI: 85,
                averageCTR: 0.035,
                averageEngagement: 0.07,
                roiDistribution: [15, 35, 50, 70, 85, 100, 120, 140, 170, 220]
            },
            finance: {
                averageROI: 65,
                averageCTR: 0.02,
                averageEngagement: 0.04,
                roiDistribution: [10, 20, 35, 50, 65, 80, 95, 110, 130, 160]
            },
            healthcare: {
                averageROI: 95,
                averageCTR: 0.03,
                averageEngagement: 0.06,
                roiDistribution: [20, 40, 60, 75, 95, 115, 135, 155, 180, 230]
            },
            nonprofit: {
                averageROI: 45,
                averageCTR: 0.04,
                averageEngagement: 0.08,
                roiDistribution: [5, 15, 25, 35, 45, 55, 65, 80, 100, 130]
            }
        };
    }
    
    /**
     * Configuración de auto-actualización
     */
    setupAutoUpdate() {
        if (this.config.updateInterval > 0) {
            setInterval(() => {
                this.updateAllCalculations();
            }, this.config.updateInterval);
        }
    }
    
    /**
     * Actualiza todos los cálculos
     */
    async updateAllCalculations() {
        const sponsors = Array.from(this.state.sponsors.keys());
        
        for (const sponsorId of sponsors) {
            try {
                await this.calculateSponsorROI(sponsorId);
            } catch (error) {
                console.error(`Error updating ROI for sponsor ${sponsorId}:`, error);
            }
        }
        
        this.state.lastUpdate = new Date();
        this.trackEvent('roi_calculations_updated', { 
            sponsorCount: sponsors.length,
            timestamp: this.state.lastUpdate.toISOString()
        });
    }
    
    /**
     * Funciones de eventos y tracking
     */
    
    trackEvent(eventName, properties = {}) {
        const event = new CustomEvent('roiCalculator:event', {
            detail: { eventName, properties, timestamp: new Date().toISOString() }
        });
        document.dispatchEvent(event);
        
        // Log para desarrollo
        if (this.config.debug) {
            console.log('ROI Event:', eventName, properties);
        }
    }
    
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    /**
     * API pública para integraciones externas
     */
    
    getPublicAPI() {
        return {
            // Registro de sponsors y campañas
            registerSponsor: this.registerSponsor.bind(this),
            registerCampaign: this.registerCampaign.bind(this),
            
            // Actualización de métricas
            updateMetrics: this.updateCampaignMetrics.bind(this),
            
            // Cálculos de ROI
            calculateROI: this.calculateSponsorROI.bind(this),
            
            // Reportes
            generateReport: this.generateROIReport.bind(this),
            getDashboardData: this.getDashboardData.bind(this),
            
            // Estado
            getSponsor: (id) => this.state.sponsors.get(id),
            getCampaign: (id) => this.state.campaigns.get(id),
            
            // Utilidades
            formatCurrency: (amount) => new Intl.NumberFormat(this.config.locale, {
                style: 'currency',
                currency: this.config.currency
            }).format(amount)
        };
    }
    
    /**
     * Cleanup y destructor
     */
    destroy() {
        // Limpiar intervalos
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Limpiar estado
        this.state.sponsors.clear();
        this.state.campaigns.clear();
        this.state.metrics.clear();
        this.state.benchmarks.clear();
        this.state.calculations.clear();
        
        console.log('ROI Calculator destroyed');
    }
}

/**
 * Factory function para crear instancias del calculador ROI
 */
function createROICalculator(options = {}) {
    return new ROICalculator(options);
}

/**
 * Instancia global singleton
 */
let globalROICalculator = null;

/**
 * Función para obtener instancia global
 */
function getROICalculator(options = {}) {
    if (!globalROICalculator) {
        globalROICalculator = new ROICalculator(options);
    }
    return globalROICalculator;
}

/**
 * Auto-inicialización
 */
document.addEventListener('DOMContentLoaded', () => {
    // Solo auto-inicializar si existe configuración en el DOM
    const configElement = document.querySelector('[data-roi-config]');
    if (configElement) {
        try {
            const config = JSON.parse(configElement.textContent);
            window.roiCalculator = createROICalculator(config);
        } catch (error) {
            console.error('Error parsing ROI calculator config:', error);
            window.roiCalculator = createROICalculator();
        }
    }
});

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ROICalculator, 
        createROICalculator, 
        getROICalculator 
    };
}