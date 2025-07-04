/**
 * Reach Calculator Module
 * Calcula el alcance e impacto de los programas patrocinados
 */

class ReachCalculator {
    constructor(config = {}) {
        this.config = {
            multiplierFactors: {
                education: 2.5,
                health: 3.0,
                environment: 1.8,
                community: 2.2,
                technology: 1.5
            },
            geographicFactors: {
                urban: 1.2,
                suburban: 1.0,
                rural: 0.8
            },
            temporalDecay: 0.95, // Factor de decaimiento temporal
            confidenceThreshold: 0.7,
            ...config
        };
        
        this.reachData = new Map();
        this.impactModels = new Map();
        this.geographicData = new Map();
        this.temporalPatterns = new Map();
        this.listeners = new Set();
        
        this.calculationCache = new Map();
        this.lastCalculation = null;
    }

    /**
     * Inicializa el calculador de alcance
     */
    async initialize() {
        try {
            console.log('🎯 Inicializando Reach Calculator...');
            
            // Cargar modelos de impacto
            await this.loadImpactModels();
            
            // Configurar factores geográficos
            this.setupGeographicFactors();
            
            // Cargar datos demográficos
            await this.loadDemographicData();
            
            console.log('✅ Reach Calculator inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Reach Calculator:', error);
            throw error;
        }
    }

    /**
     * Calcula el alcance directo de un programa
     */
    calculateDirectReach(program, data = {}) {
        const baseReach = {
            beneficiaries: data.directBeneficiaries || 0,
            participants: data.participants || 0,
            attendees: data.attendees || 0,
            users: data.users || 0
        };
        
        // Aplicar factores de ajuste
        const adjustedReach = this.applyAdjustmentFactors(baseReach, program);
        
        // Calcular confianza en los datos
        const confidence = this.calculateConfidence(program, data);
        
        return {
            total: this.sumReachComponents(adjustedReach),
            breakdown: adjustedReach,
            confidence,
            methodology: this.getMethodologyUsed(program),
            lastUpdated: new Date()
        };
    }

    /**
     * Calcula el alcance indirecto (multiplicador)
     */
    calculateIndirectReach(directReach, program, context = {}) {
        const multiplier = this.getMultiplierFactor(program, context);
        const networkEffect = this.calculateNetworkEffect(program, context);
        const viralCoefficient = this.calculateViralCoefficient(program, context);
        
        const indirectReach = {
            secondary: directReach.total * multiplier.secondary,
            tertiary: directReach.total * multiplier.tertiary,
            network: directReach.total * networkEffect,
            viral: directReach.total * viralCoefficient
        };
        
        // Aplicar decaimiento temporal
        const timeAdjusted = this.applyTemporalDecay(indirectReach, program);
        
        return {
            total: this.sumReachComponents(timeAdjusted),
            breakdown: timeAdjusted,
            multiplierUsed: multiplier,
            confidence: this.calculateIndirectConfidence(multiplier, context),
            assumptions: this.getMultiplierAssumptions(program)
        };
    }

    /**
     * Calcula el alcance total combinado
     */
    calculateTotalReach(program, data = {}, context = {}) {
        const cacheKey = this.generateCacheKey(program, data, context);
        
        // Verificar cache
        if (this.calculationCache.has(cacheKey)) {
            const cached = this.calculationCache.get(cacheKey);
            if (this.isCacheValid(cached)) {
                return cached.result;
            }
        }
        
        const directReach = this.calculateDirectReach(program, data);
        const indirectReach = this.calculateIndirectReach(directReach, program, context);
        
        // Evitar doble conteo
        const adjustedIndirect = this.adjustForOverlap(directReach, indirectReach, program);
        
        const totalReach = {
            direct: directReach,
            indirect: adjustedIndirect,
            total: directReach.total + adjustedIndirect.total,
            reachRatio: adjustedIndirect.total / directReach.total,
            qualityScore: this.calculateReachQuality(directReach, adjustedIndirect, program),
            geographic: this.calculateGeographicReach(program, data, context),
            demographic: this.calculateDemographicReach(program, data, context)
        };
        
        // Guardar en cache
        this.calculationCache.set(cacheKey, {
            result: totalReach,
            timestamp: new Date(),
            ttl: 30 * 60 * 1000 // 30 minutos
        });
        
        this.lastCalculation = totalReach;
        
        // Notificar listeners
        this.notifyListeners('reach:calculated', {
            program: program.id,
            reach: totalReach
        });
        
        return totalReach;
    }

    /**
     * Calcula el impacto ponderado por calidad
     */
    calculateQualityAdjustedImpact(reach, program, qualityMetrics = {}) {
        const qualityFactors = {
            depth: qualityMetrics.programDepth || 0.7,
            duration: qualityMetrics.programDuration || 0.8,
            sustainability: qualityMetrics.sustainability || 0.6,
            measurement: qualityMetrics.measurementQuality || 0.7
        };
        
        const qualityScore = this.calculateOverallQuality(qualityFactors);
        const adjustedImpact = {
            directImpact: reach.direct.total * qualityScore,
            indirectImpact: reach.indirect.total * qualityScore * 0.8, // Reducir peso indirecto
            totalImpact: 0
        };
        
        adjustedImpact.totalImpact = adjustedImpact.directImpact + adjustedImpact.indirectImpact;
        
        return {
            ...adjustedImpact,
            qualityScore,
            qualityFactors,
            confidenceInterval: this.calculateConfidenceInterval(adjustedImpact, qualityScore),
            recommendations: this.generateQualityRecommendations(qualityFactors)
        };
    }

    /**
     * Realiza análisis temporal del alcance
     */
    analyzeTemporalReach(program, timeSeriesData, options = {}) {
        const timeframe = options.timeframe || 'monthly';
        const periods = this.groupDataByPeriod(timeSeriesData, timeframe);
        
        const temporalAnalysis = {
            periods: {},
            trends: {},
            seasonality: {},
            growth: {}
        };
        
        // Calcular alcance por período
        Object.entries(periods).forEach(([period, periodData]) => {
            temporalAnalysis.periods[period] = this.calculateTotalReach(
                program, 
                periodData, 
                { period }
            );
        });
        
        // Análisis de tendencias
        temporalAnalysis.trends = this.analyzeTrends(temporalAnalysis.periods);
        
        // Detectar estacionalidad
        temporalAnalysis.seasonality = this.detectSeasonality(temporalAnalysis.periods);
        
        // Calcular crecimiento
        temporalAnalysis.growth = this.calculateGrowthMetrics(temporalAnalysis.periods);
        
        return temporalAnalysis;
    }

    /**
     * Calcula ROI de alcance (Return on Reach Investment)
     */
    calculateReachROI(program, investment, reach) {
        const costPerBeneficiary = {
            direct: investment / reach.direct.total,
            indirect: investment / reach.indirect.total,
            total: investment / reach.total
        };
        
        const benchmarks = this.getIndustryBenchmarks(program.category);
        const efficiency = {
            direct: benchmarks.costPerBeneficiary / costPerBeneficiary.direct,
            total: benchmarks.costPerBeneficiary / costPerBeneficiary.total
        };
        
        return {
            costPerBeneficiary,
            efficiency,
            benchmarkComparison: this.compareToBenchmarks(costPerBeneficiary, benchmarks),
            recommendations: this.generateEfficiencyRecommendations(efficiency, program),
            industryRanking: this.calculateIndustryRanking(efficiency.total, program.category)
        };
    }

    /**
     * Métodos de cálculo específicos
     */
    
    applyAdjustmentFactors(baseReach, program) {
        const factors = {
            category: this.config.multiplierFactors[program.category] || 1.0,
            geographic: this.config.geographicFactors[program.location] || 1.0,
            quality: program.qualityScore || 1.0,
            duration: this.getDurationFactor(program.duration)
        };
        
        const adjusted = {};
        Object.entries(baseReach).forEach(([key, value]) => {
            adjusted[key] = Math.round(value * Object.values(factors).reduce((a, b) => a * b, 1));
        });
        
        return adjusted;
    }

    getMultiplierFactor(program, context) {
        const baseMultiplier = this.config.multiplierFactors[program.category] || 1.5;
        
        // Ajustar por contexto
        let secondary = baseMultiplier;
        let tertiary = baseMultiplier * 0.6;
        
        // Factores de contexto
        if (context.socialMedia) secondary *= 1.3;
        if (context.partnerships) secondary *= 1.2;
        if (context.communityLeaders) tertiary *= 1.4;
        
        return { secondary, tertiary };
    }

    calculateNetworkEffect(program, context) {
        let networkFactor = 0.2; // Base 20%
        
        // Ajustar por tipo de programa
        if (program.category === 'education') networkFactor *= 1.5;
        if (program.category === 'community') networkFactor *= 2.0;
        
        // Ajustar por canales de distribución
        if (context.digitalChannels) networkFactor *= 1.3;
        if (context.wordOfMouth) networkFactor *= 1.8;
        
        return Math.min(networkFactor, 0.8); // Máximo 80%
    }

    calculateViralCoefficient(program, context) {
        let viralFactor = 0.1; // Base 10%
        
        // Factores que aumentan viralidad
        if (program.shareability === 'high') viralFactor *= 2.0;
        if (context.incentives) viralFactor *= 1.5;
        if (context.socialProof) viralFactor *= 1.3;
        
        // Factores que reducen viralidad
        if (program.complexity === 'high') viralFactor *= 0.7;
        if (program.audience === 'niche') viralFactor *= 0.8;
        
        return Math.min(viralFactor, 0.5); // Máximo 50%
    }

    applyTemporalDecay(reach, program) {
        const monthsSinceLaunch = this.getMonthsSinceLaunch(program.startDate);
        const decayFactor = Math.pow(this.config.temporalDecay, monthsSinceLaunch);
        
        const decayed = {};
        Object.entries(reach).forEach(([key, value]) => {
            decayed[key] = Math.round(value * decayFactor);
        });
        
        return decayed;
    }

    adjustForOverlap(directReach, indirectReach, program) {
        // Estimar overlap entre alcance directo e indirecto
        const overlapRate = this.estimateOverlapRate(program);
        const overlapAdjustment = 1 - overlapRate;
        
        const adjusted = {};
        Object.entries(indirectReach.breakdown).forEach(([key, value]) => {
            adjusted[key] = Math.round(value * overlapAdjustment);
        });
        
        return {
            ...indirectReach,
            breakdown: adjusted,
            total: this.sumReachComponents(adjusted),
            overlapAdjustment
        };
    }

    calculateGeographicReach(program, data, context) {
        const coverage = {
            urban: data.urbanCoverage || 0,
            suburban: data.suburbanCoverage || 0,
            rural: data.ruralCoverage || 0
        };
        
        const weightedReach = Object.entries(coverage).reduce((total, [area, reach]) => {
            const factor = this.config.geographicFactors[area] || 1.0;
            return total + (reach * factor);
        }, 0);
        
        return {
            coverage,
            weightedReach,
            dominantArea: this.getDominantArea(coverage),
            geographicDiversity: this.calculateGeographicDiversity(coverage)
        };
    }

    calculateDemographicReach(program, data, context) {
        const demographics = data.demographics || {};
        
        return {
            ageGroups: demographics.ageGroups || {},
            gender: demographics.gender || {},
            income: demographics.income || {},
            education: demographics.education || {},
            diversityIndex: this.calculateDiversityIndex(demographics)
        };
    }

    /**
     * Métodos de análisis y insights
     */
    
    generateReachInsights(reach, program) {
        const insights = [];
        
        // Análisis de eficiencia
        if (reach.reachRatio > 3.0) {
            insights.push({
                type: 'high_multiplier',
                message: 'Alto efecto multiplicador detectado',
                recommendation: 'Maximizar inversión en este tipo de programa',
                impact: 'high'
            });
        }
        
        // Análisis de calidad
        if (reach.qualityScore < 0.6) {
            insights.push({
                type: 'quality_concern',
                message: 'Score de calidad por debajo del objetivo',
                recommendation: 'Mejorar metodología de medición y seguimiento',
                impact: 'medium'
            });
        }
        
        // Análisis geográfico
        if (reach.geographic.geographicDiversity < 0.3) {
            insights.push({
                type: 'geographic_concentration',
                message: 'Alcance geográfico muy concentrado',
                recommendation: 'Expandir a nuevas áreas para mayor impacto',
                impact: 'medium'
            });
        }
        
        // Análisis de confianza
        if (reach.direct.confidence < this.config.confidenceThreshold) {
            insights.push({
                type: 'low_confidence',
                message: 'Baja confianza en datos de alcance directo',
                recommendation: 'Mejorar sistemas de recolección de datos',
                impact: 'high'
            });
        }
        
        return insights;
    }

    compareToTargets(reach, targets) {
        const comparison = {};
        
        Object.entries(targets).forEach(([metric, target]) => {
            const actual = this.getMetricValue(reach, metric);
            const achievement = actual / target;
            
            comparison[metric] = {
                target,
                actual,
                achievement,
                variance: actual - target,
                status: achievement >= 1.0 ? 'achieved' : achievement >= 0.8 ? 'on_track' : 'behind'
            };
        });
        
        return {
            comparison,
            overallAchievement: this.calculateOverallAchievement(comparison),
            recommendations: this.generateTargetRecommendations(comparison)
        };
    }

    /**
     * Métodos de optimización
     */
    
    optimizeReachStrategy(program, constraints = {}) {
        const currentReach = this.calculateTotalReach(program, constraints.currentData || {});
        const optimizationOptions = this.generateOptimizationOptions(program, constraints);
        
        const optimizedScenarios = optimizationOptions.map(option => {
            const projectedReach = this.projectReachWithChanges(currentReach, option.changes);
            const cost = this.estimateImplementationCost(option);
            const roi = projectedReach.total / cost;
            
            return {
                option,
                projectedReach,
                cost,
                roi,
                feasibility: this.assessFeasibility(option, constraints),
                timeline: this.estimateTimeline(option)
            };
        });
        
        // Ordenar por ROI
        optimizedScenarios.sort((a, b) => b.roi - a.roi);
        
        return {
            current: currentReach,
            scenarios: optimizedScenarios,
            recommendations: this.selectOptimalScenarios(optimizedScenarios, constraints)
        };
    }

    /**
     * Métodos de proyección y forecasting
     */
    
    projectFutureReach(program, timeHorizon = 12, assumptions = {}) {
        const baseReach = this.calculateTotalReach(program, assumptions.currentData || {});
        const growthModel = this.buildGrowthModel(program, assumptions);
        
        const projection = [];
        
        for (let month = 1; month <= timeHorizon; month++) {
            const growthFactor = this.calculateGrowthFactor(growthModel, month);
            const seasonalFactor = this.getSeasonalFactor(program, month);
            const decayFactor = Math.pow(this.config.temporalDecay, month / 12);
            
            const projectedReach = {
                month,
                direct: Math.round(baseReach.direct.total * growthFactor * seasonalFactor),
                indirect: Math.round(baseReach.indirect.total * growthFactor * seasonalFactor * decayFactor),
                confidence: Math.max(0.3, baseReach.direct.confidence - (month * 0.05))
            };
            
            projectedReach.total = projectedReach.direct + projectedReach.indirect;
            projection.push(projectedReach);
        }
        
        return {
            projection,
            model: growthModel,
            assumptions,
            summary: this.summarizeProjection(projection)
        };
    }

    /**
     * Métodos de validación y calidad
     */
    
    validateReachData(data, program) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };
        
        // Validar completitud de datos
        const requiredFields = ['directBeneficiaries', 'startDate', 'category'];
        requiredFields.forEach(field => {
            if (!data[field] && !program[field]) {
                validation.errors.push(`Campo requerido faltante: ${field}`);
                validation.isValid = false;
            }
        });
        
        // Validar consistencia
        if (data.directBeneficiaries > 1000000) {
            validation.warnings.push('Número de beneficiarios directos muy alto, verificar datos');
        }
        
        // Validar lógica
        if (data.participants > data.directBeneficiaries) {
            validation.errors.push('Participantes no puede ser mayor que beneficiarios directos');
            validation.isValid = false;
        }
        
        // Sugerencias de mejora
        if (!data.demographics) {
            validation.suggestions.push('Agregar datos demográficos para análisis más detallado');
        }
        
        if (!data.geographicCoverage) {
            validation.suggestions.push('Incluir información de cobertura geográfica');
        }
        
        return validation;
    }

    /**
     * Métodos de benchmarking
     */
    
    benchmarkAgainstIndustry(reach, program) {
        const industryData = this.getIndustryBenchmarks(program.category);
        const benchmark = {};
        
        // Comparar métricas clave
        const metrics = ['total', 'reachRatio', 'qualityScore'];
        metrics.forEach(metric => {
            const value = this.getMetricValue(reach, metric);
            const industryAverage = industryData[metric]?.average || 0;
            const industryTop = industryData[metric]?.top_quartile || 0;
            
            benchmark[metric] = {
                value,
                industryAverage,
                industryTop,
                percentile: this.calculatePercentile(value, industryData[metric]?.distribution || []),
                performance: value > industryTop ? 'excellent' : 
                           value > industryAverage ? 'above_average' : 'below_average'
            };
        });
        
        return {
            benchmark,
            overallRanking: this.calculateOverallRanking(benchmark),
            improvementAreas: this.identifyImprovementAreas(benchmark),
            bestPractices: this.suggestBestPractices(benchmark, program.category)
        };
    }

    /**
     * Utilidades y métodos auxiliares
     */
    
    sumReachComponents(components) {
        return Object.values(components).reduce((sum, value) => sum + (value || 0), 0);
    }

    calculateConfidence(program, data) {
        let confidence = 0.8; // Base
        
        // Ajustar por calidad de datos
        if (data.measuredDirectly) confidence += 0.1;
        if (data.sampleSize > 1000) confidence += 0.05;
        if (data.methodology === 'randomized') confidence += 0.05;
        
        // Ajustar por edad de datos
        const dataAge = this.getDataAge(data.lastUpdated);
        if (dataAge > 180) confidence -= 0.2; // Más de 6 meses
        else if (dataAge > 90) confidence -= 0.1; // Más de 3 meses
        
        return Math.max(0.3, Math.min(1.0, confidence));
    }

    getDurationFactor(duration) {
        // Factor basado en duración del programa (meses)
        if (duration >= 24) return 1.2; // Programas largos tienen mayor alcance
        if (duration >= 12) return 1.1;
        if (duration >= 6) return 1.0;
        return 0.9; // Programas cortos tienen menor alcance
    }

    getMonthsSinceLaunch(startDate) {
        const now = new Date();
        const start = new Date(startDate);
        return Math.floor((now - start) / (1000 * 60 * 60 * 24 * 30));
    }

    estimateOverlapRate(program) {
        // Estimar tasa de overlap basada en tipo de programa
        const baseRates = {
            education: 0.15,
            health: 0.20,
            environment: 0.10,
            community: 0.25,
            technology: 0.12
        };
        
        return baseRates[program.category] || 0.15;
    }

    generateCacheKey(program, data, context) {
        const keyData = {
            programId: program.id,
            dataHash: this.simpleHash(JSON.stringify(data)),
            contextHash: this.simpleHash(JSON.stringify(context))
        };
        return JSON.stringify(keyData);
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    isCacheValid(cached) {
        const now = new Date();
        return (now - cached.timestamp) < cached.ttl;
    }

    async loadImpactModels() {
        // Cargar modelos de impacto específicos por categoría
        console.log('📊 Cargando modelos de impacto...');
    }

    setupGeographicFactors() {
        // Configurar factores geográficos adicionales
        this.geographicData.set('population_density', {
            high: 1.3,
            medium: 1.0,
            low: 0.7
        });
    }

    async loadDemographicData() {
        // Cargar datos demográficos de referencia
        console.log('👥 Cargando datos demográficos...');
    }

    getIndustryBenchmarks(category) {
        // Datos de benchmark simulados
        const benchmarks = {
            education: {
                costPerBeneficiary: 250,
                total: { average: 5000, top_quartile: 15000 },
                reachRatio: { average: 2.5, top_quartile: 4.0 },
                qualityScore: { average: 0.7, top_quartile: 0.85 }
            },
            health: {
                costPerBeneficiary: 400,
                total: { average: 3000, top_quartile: 10000 },
                reachRatio: { average: 3.0, top_quartile: 5.0 },
                qualityScore: { average: 0.75, top_quartile: 0.9 }
            },
            // ... más categorías
        };
        
        return benchmarks[category] || benchmarks.education;
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
                console.error('Error en listener de reach calculator:', error);
            }
        });
    }

    /**
     * Destructor
     */
    destroy() {
        this.reachData.clear();
        this.impactModels.clear();
        this.geographicData.clear();
        this.temporalPatterns.clear();
        this.listeners.clear();
        this.calculationCache.clear();
        
        console.log('🧹 Reach Calculator destruido correctamente');
    }
}

// Exportar para uso global
window.ReachCalculator = ReachCalculator;