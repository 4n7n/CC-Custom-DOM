/**
 * ROI REPORTING SYSTEM
 * Sistema completo de cálculo y reporte de ROI para patrocinadores
 * Gestiona métricas financieras, impacto social y retorno de inversión
 */

class ROIReporting {
    constructor(options = {}) {
        this.options = {
            currency: 'EUR',
            precision: 2,
            enableSocialROI: true,
            enableProjections: true,
            comparisonPeriods: 12,
            apiEndpoint: '/api/roi',
            autoRefresh: true,
            refreshInterval: 300000, // 5 minutos
            ...options
        };

        this.roiData = new Map();
        this.calculations = new Map();
        this.benchmarks = new Map();
        this.projections = new Map();
        this.socialImpactValues = new Map();
        
        this.financialCalculator = new FinancialCalculator();
        this.socialROICalculator = new SocialROICalculator();
        this.benchmarkAnalyzer = new BenchmarkAnalyzer();
        this.projectionEngine = new ProjectionEngine();
        
        this.init();
    }

    /**
     * Inicializa el sistema de ROI
     */
    init() {
        this.loadROIData();
        this.setupSocialImpactValues();
        this.setupBenchmarks();
        this.setupEventListeners();
        
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
        
        console.log('💰 Sistema de ROI Reporting inicializado');
    }

    /**
     * Carga datos de ROI guardados
     */
    loadROIData() {
        try {
            const savedData = localStorage.getItem('roiReportingData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.roiData = new Map(data.roiData || []);
                this.calculations = new Map(data.calculations || []);
                this.socialImpactValues = new Map(data.socialImpactValues || []);
            }
        } catch (error) {
            console.warn('Error cargando datos de ROI:', error);
        }
    }

    /**
     * Guarda datos de ROI
     */
    saveROIData() {
        try {
            const data = {
                roiData: Array.from(this.roiData.entries()),
                calculations: Array.from(this.calculations.entries()),
                socialImpactValues: Array.from(this.socialImpactValues.entries()),
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('roiReportingData', JSON.stringify(data));
        } catch (error) {
            console.warn('Error guardando datos de ROI:', error);
        }
    }

    /**
     * Configura valores de impacto social
     */
    setupSocialImpactValues() {
        const defaultValues = new Map([
            ['life_transformed', 2500], // Valor monetario por vida transformada
            ['community_reached', 150], // Valor por comunidad alcanzada
            ['volunteer_hour', 25], // Valor por hora de voluntariado
            ['educational_program', 800], // Valor por programa educativo
            ['healthcare_service', 300], // Valor por servicio de salud
            ['environmental_action', 120], // Valor por acción ambiental
            ['job_created', 15000], // Valor por empleo creado
            ['skill_training', 500], // Valor por entrenamiento de habilidades
            ['infrastructure_improvement', 5000], // Valor por mejora de infraestructura
            ['policy_change', 50000] // Valor por cambio de política
        ]);

        // Usar valores guardados o por defecto
        if (this.socialImpactValues.size === 0) {
            this.socialImpactValues = defaultValues;
        }
    }

    /**
     * Configura benchmarks de industria
     */
    setupBenchmarks() {
        const industryBenchmarks = new Map([
            ['nonprofit_sector', {
                averageROI: 3.2,
                topQuartileROI: 4.8,
                costPerImpact: 95,
                adminRatio: 15,
                fundraisingEfficiency: 0.25
            }],
            ['corporate_csr', {
                averageROI: 2.8,
                topQuartileROI: 4.2,
                brandValueIncrease: 12,
                employeeEngagement: 18,
                reputationScore: 25
            }],
            ['social_enterprise', {
                averageROI: 4.1,
                topQuartileROI: 6.3,
                socialImpactMultiplier: 2.5,
                sustainabilityIndex: 85,
                communityTrust: 78
            }]
        ]);

        this.benchmarks = industryBenchmarks;
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Escuchar actualizaciones de métricas
        document.addEventListener('metricsUpdated', (e) => {
            this.handleMetricsUpdate(e.detail);
        });

        // Escuchar cambios en inversión
        document.addEventListener('investmentChanged', (e) => {
            this.handleInvestmentChange(e.detail);
        });

        // Escuchar solicitudes de reporte
        document.addEventListener('roiReportRequested', (e) => {
            this.generateReport(e.detail);
        });
    }

    /**
     * Inicia actualización automática
     */
    startAutoRefresh() {
        setInterval(() => {
            this.refreshROICalculations();
        }, this.options.refreshInterval);
    }

    /**
     * Calcula ROI financiero tradicional
     */
    calculateFinancialROI(investment, returns, timeframe = 12) {
        if (!investment || investment <= 0) {
            throw new Error('Inversión debe ser mayor a 0');
        }

        const totalReturns = Array.isArray(returns) 
            ? returns.reduce((sum, r) => sum + r, 0)
            : returns;

        const roi = ((totalReturns - investment) / investment) * 100;
        const annualizedROI = this.calculateAnnualizedROI(roi, timeframe);

        return {
            roi: this.roundToPrecision(roi),
            annualizedROI: this.roundToPrecision(annualizedROI),
            netReturn: this.roundToPrecision(totalReturns - investment),
            totalReturns: this.roundToPrecision(totalReturns),
            investment: this.roundToPrecision(investment),
            timeframe,
            calculatedAt: new Date().toISOString()
        };
    }

    /**
     * Calcula ROI social (SROI)
     */
    calculateSocialROI(investment, socialOutcomes) {
        let totalSocialValue = 0;

        Object.keys(socialOutcomes).forEach(outcome => {
            const quantity = socialOutcomes[outcome];
            const unitValue = this.socialImpactValues.get(outcome) || 0;
            totalSocialValue += quantity * unitValue;
        });

        const sroi = totalSocialValue / investment;

        return {
            sroi: this.roundToPrecision(sroi),
            totalSocialValue: this.roundToPrecision(totalSocialValue),
            investment: this.roundToPrecision(investment),
            outcomes: socialOutcomes,
            breakdown: this.calculateSocialValueBreakdown(socialOutcomes),
            calculatedAt: new Date().toISOString()
        };
    }

    /**
     * Calcula desglose de valor social
     */
    calculateSocialValueBreakdown(socialOutcomes) {
        const breakdown = {};

        Object.keys(socialOutcomes).forEach(outcome => {
            const quantity = socialOutcomes[outcome];
            const unitValue = this.socialImpactValues.get(outcome) || 0;
            const totalValue = quantity * unitValue;

            breakdown[outcome] = {
                quantity,
                unitValue,
                totalValue: this.roundToPrecision(totalValue),
                percentage: 0 // Se calculará después
            };
        });

        // Calcular porcentajes
        const totalValue = Object.values(breakdown)
            .reduce((sum, item) => sum + item.totalValue, 0);

        Object.keys(breakdown).forEach(outcome => {
            breakdown[outcome].percentage = this.roundToPrecision(
                (breakdown[outcome].totalValue / totalValue) * 100
            );
        });

        return breakdown;
    }

    /**
     * Calcula ROI combinado (financiero + social)
     */
    calculateCombinedROI(investment, financialReturns, socialOutcomes, socialWeight = 0.5) {
        const financialROI = this.calculateFinancialROI(investment, financialReturns);
        const socialROI = this.calculateSocialROI(investment, socialOutcomes);

        // Normalizar SROI para combinación
        const normalizedSROI = Math.min(socialROI.sroi * 100, 1000); // Cap at 1000%

        const combinedROI = (financialROI.roi * (1 - socialWeight)) + 
                           (normalizedSROI * socialWeight);

        return {
            combinedROI: this.roundToPrecision(combinedROI),
            financialComponent: {
                roi: financialROI.roi,
                weight: (1 - socialWeight) * 100,
                contribution: this.roundToPrecision(financialROI.roi * (1 - socialWeight))
            },
            socialComponent: {
                sroi: normalizedSROI,
                weight: socialWeight * 100,
                contribution: this.roundToPrecision(normalizedSROI * socialWeight)
            },
            breakdown: {
                financial: financialROI,
                social: socialROI
            },
            calculatedAt: new Date().toISOString()
        };
    }

    /**
     * Calcula métricas de eficiencia
     */
    calculateEfficiencyMetrics(investment, outcomes) {
        const metrics = {};

        // Costo por vida impactada
        if (outcomes.lives_impacted) {
            metrics.costPerLifeImpacted = this.roundToPrecision(
                investment / outcomes.lives_impacted
            );
        }

        // Costo por comunidad alcanzada
        if (outcomes.communities_reached) {
            metrics.costPerCommunity = this.roundToPrecision(
                investment / outcomes.communities_reached
            );
        }

        // Eficiencia de recaudación
        if (outcomes.funds_raised) {
            metrics.fundraisingEfficiency = this.roundToPrecision(
                outcomes.funds_raised / investment
            );
        }

        // Ratio de gastos administrativos
        if (outcomes.admin_costs) {
            metrics.adminRatio = this.roundToPrecision(
                (outcomes.admin_costs / investment) * 100
            );
        }

        // Multiplicador de impacto
        if (outcomes.total_beneficiaries && outcomes.direct_beneficiaries) {
            metrics.impactMultiplier = this.roundToPrecision(
                outcomes.total_beneficiaries / outcomes.direct_beneficiaries
            );
        }

        return metrics;
    }

    /**
     * Analiza comparación con benchmarks
     */
    analyzeBenchmarkComparison(roiData, sector = 'nonprofit_sector') {
        const benchmark = this.benchmarks.get(sector);
        if (!benchmark) {
            return { error: 'Benchmark no encontrado' };
        }

        const comparison = {
            sector,
            performance: {},
            recommendations: [],
            percentileRank: 0
        };

        // Comparar ROI
        if (roiData.roi !== undefined) {
            const roiPerformance = this.compareToTarget(roiData.roi, benchmark.averageROI);
            comparison.performance.roi = {
                value: roiData.roi,
                benchmark: benchmark.averageROI,
                difference: this.roundToPrecision(roiData.roi - benchmark.averageROI),
                percentageDifference: roiPerformance.percentageDifference,
                status: roiPerformance.status
            };

            if (roiData.roi < benchmark.averageROI) {
                comparison.recommendations.push({
                    area: 'ROI',
                    priority: 'high',
                    message: 'ROI por debajo del promedio de la industria',
                    suggestion: 'Revisar estrategias de optimización de costos y aumentar eficiencia operativa'
                });
            }
        }

        // Comparar costo por impacto
        if (roiData.costPerImpact !== undefined) {
            const costPerformance = this.compareToTarget(roiData.costPerImpact, benchmark.costPerImpact, false);
            comparison.performance.costPerImpact = {
                value: roiData.costPerImpact,
                benchmark: benchmark.costPerImpact,
                difference: this.roundToPrecision(roiData.costPerImpact - benchmark.costPerImpact),
                percentageDifference: costPerformance.percentageDifference,
                status: costPerformance.status
            };
        }

        // Calcular ranking percentil
        comparison.percentileRank = this.calculatePercentileRank(roiData.roi, benchmark);

        return comparison;
    }

    /**
     * Compara valor con objetivo
     */
    compareToTarget(value, target, higherIsBetter = true) {
        const difference = value - target;
        const percentageDifference = this.roundToPrecision((difference / target) * 100);
        
        let status;
        if (higherIsBetter) {
            status = difference >= 0 ? 'above' : 'below';
        } else {
            status = difference <= 0 ? 'above' : 'below';
        }

        return {
            difference: this.roundToPrecision(difference),
            percentageDifference,
            status
        };
    }

    /**
     * Calcula ranking percentil
     */
    calculatePercentileRank(value, benchmark) {
        if (value >= benchmark.topQuartileROI) return 75;
        if (value >= benchmark.averageROI) return 50;
        if (value >= benchmark.averageROI * 0.8) return 25;
        return 10;
    }

    /**
     * Genera proyecciones de ROI
     */
    generateProjections(currentData, timeframe = 12) {
        const projections = {
            conservative: {},
            realistic: {},
            optimistic: {},
            scenarios: []
        };

        // Escenario conservador (10% menos que actual)
        projections.conservative = this.projectScenario(currentData, -10, timeframe);
        
        // Escenario realista (mantiene tendencia actual)
        projections.realistic = this.projectScenario(currentData, 0, timeframe);
        
        // Escenario optimista (20% mejora)
        projections.optimistic = this.projectScenario(currentData, 20, timeframe);

        // Generar escenarios específicos
        projections.scenarios = this.generateSpecificScenarios(currentData, timeframe);

        return projections;
    }

    /**
     * Proyecta escenario específico
     */
    projectScenario(currentData, improvementPercentage, timeframe) {
        const improvementFactor = 1 + (improvementPercentage / 100);
        
        return {
            projectedROI: this.roundToPrecision(currentData.roi * improvementFactor),
            projectedInvestment: currentData.investment,
            projectedReturns: this.roundToPrecision(
                (currentData.investment * (currentData.roi / 100) + currentData.investment) * improvementFactor
            ),
            improvementPercentage,
            timeframe,
            confidence: this.calculateConfidence(improvementPercentage),
            assumptions: this.getScenarioAssumptions(improvementPercentage)
        };
    }

    /**
     * Genera escenarios específicos
     */
    generateSpecificScenarios(currentData, timeframe) {
        return [
            {
                name: 'Mejora de Eficiencia',
                description: 'Optimización de procesos operativos',
                impact: 15,
                probability: 0.7,
                projection: this.projectScenario(currentData, 15, timeframe)
            },
            {
                name: 'Escalamiento de Programas',
                description: 'Expansión a nuevas comunidades',
                impact: 25,
                probability: 0.5,
                projection: this.projectScenario(currentData, 25, timeframe)
            },
            {
                name: 'Nuevas Alianzas',
                description: 'Colaboración con organizaciones complementarias',
                impact: 30,
                probability: 0.4,
                projection: this.projectScenario(currentData, 30, timeframe)
            },
            {
                name: 'Innovación Tecnológica',
                description: 'Implementación de nuevas tecnologías',
                impact: 40,
                probability: 0.3,
                projection: this.projectScenario(currentData, 40, timeframe)
            }
        ];
    }

    /**
     * Calcula confianza en proyección
     */
    calculateConfidence(improvementPercentage) {
        const absImprovement = Math.abs(improvementPercentage);
        if (absImprovement <= 10) return 0.9;
        if (absImprovement <= 20) return 0.7;
        if (absImprovement <= 30) return 0.5;
        return 0.3;
    }

    /**
     * Obtiene asunciones del escenario
     */
    getScenarioAssumptions(improvementPercentage) {
        const assumptions = [];
        
        if (improvementPercentage > 0) {
            assumptions.push('Mantención de condiciones de mercado favorables');
            assumptions.push('Continuidad del equipo y estrategia actual');
            if (improvementPercentage > 15) {
                assumptions.push('Acceso a recursos adicionales');
                assumptions.push('Ausencia de factores externos negativos');
            }
        } else {
            assumptions.push('Condiciones de mercado adversas');
            assumptions.push('Posibles limitaciones de recursos');
        }
        
        return assumptions;
    }

    /**
     * Genera reporte completo de ROI
     */
    async generateReport(options = {}) {
        const {
            sponsorId,
            period = 'quarterly',
            includeProjections = true,
            includeBenchmarks = true,
            includeRecommendations = true,
            format = 'json'
        } = options;

        try {
            // Obtener datos actuales
            const currentData = await this.getCurrentROIData(sponsorId);
            
            // Calcular ROI
            const financialROI = this.calculateFinancialROI(
                currentData.investment,
                currentData.returns,
                currentData.timeframe
            );

            const socialROI = this.calculateSocialROI(
                currentData.investment,
                currentData.socialOutcomes
            );

            const combinedROI = this.calculateCombinedROI(
                currentData.investment,
                currentData.returns,
                currentData.socialOutcomes
            );

            const efficiencyMetrics = this.calculateEfficiencyMetrics(
                currentData.investment,
                currentData.outcomes
            );

            // Análisis de benchmarks
            let benchmarkAnalysis = null;
            if (includeBenchmarks) {
                benchmarkAnalysis = this.analyzeBenchmarkComparison(
                    { ...financialROI, ...efficiencyMetrics },
                    currentData.sector
                );
            }

            // Proyecciones
            let projections = null;
            if (includeProjections) {
                projections = this.generateProjections(financialROI);
            }

            // Recomendaciones
            let recommendations = null;
            if (includeRecommendations) {
                recommendations = this.generateRecommendations(
                    { financialROI, socialROI, efficiencyMetrics, benchmarkAnalysis }
                );
            }

            const report = {
                metadata: {
                    sponsorId,
                    period,
                    generatedAt: new Date().toISOString(),
                    currency: this.options.currency,
                    format
                },
                summary: {
                    totalInvestment: currentData.investment,
                    financialROI: financialROI.roi,
                    socialROI: socialROI.sroi,
                    combinedROI: combinedROI.combinedROI,
                    netReturn: financialROI.netReturn,
                    socialValue: socialROI.totalSocialValue
                },
                detailed: {
                    financial: financialROI,
                    social: socialROI,
                    combined: combinedROI,
                    efficiency: efficiencyMetrics
                },
                analysis: {
                    benchmarks: benchmarkAnalysis,
                    projections,
                    recommendations
                },
                charts: this.generateChartData({
                    financialROI,
                    socialROI,
                    combinedROI,
                    benchmarkAnalysis,
                    projections
                })
            };

            // Guardar reporte
            this.saveReport(report);

            // Disparar evento
            document.dispatchEvent(new CustomEvent('roiReportGenerated', {
                detail: report
            }));

            return report;

        } catch (error) {
            console.error('Error generando reporte de ROI:', error);
            throw error;
        }
    }

    /**
     * Obtiene datos actuales de ROI
     */
    async getCurrentROIData(sponsorId) {
        try {
            // Intentar obtener desde API
            if (this.options.apiEndpoint) {
                const response = await fetch(`${this.options.apiEndpoint}/${sponsorId}/current`);
                if (response.ok) {
                    return await response.json();
                }
            }

            // Fallback a datos locales o del DOM
            return this.extractROIDataFromDOM();
        } catch (error) {
            console.warn('Error obteniendo datos actuales, usando fallback:', error);
            return this.extractROIDataFromDOM();
        }
    }

    /**
     * Extrae datos de ROI desde el DOM
     */
    extractROIDataFromDOM() {
        const data = {
            investment: 0,
            returns: 0,
            socialOutcomes: {},
            outcomes: {},
            timeframe: 12,
            sector: 'nonprofit_sector'
        };

        // Buscar elementos con data-roi
        document.querySelectorAll('[data-roi]').forEach(el => {
            const metric = el.dataset.roi;
            const value = parseFloat(el.textContent.replace(/[^\d.-]/g, ''));
            
            if (!isNaN(value)) {
                if (metric === 'investment' || metric === 'returns') {
                    data[metric] = value;
                } else if (metric.startsWith('social_')) {
                    data.socialOutcomes[metric] = value;
                } else {
                    data.outcomes[metric] = value;
                }
            }
        });

        return data;
    }

    /**
     * Genera recomendaciones
     */
    generateRecommendations(analysisData) {
        const recommendations = [];
        const { financialROI, socialROI, efficiencyMetrics, benchmarkAnalysis } = analysisData;

        // Recomendaciones basadas en ROI financiero
        if (financialROI.roi < 0) {
            recommendations.push({
                category: 'financial',
                priority: 'critical',
                title: 'ROI Negativo Requiere Atención Inmediata',
                description: 'El retorno de inversión es negativo, indicando pérdidas.',
                actions: [
                    'Revisar y optimizar estructura de costos',
                    'Evaluar eficacia de estrategias actuales',
                    'Considerar reorientación de recursos',
                    'Implementar métricas de seguimiento más frecuentes'
                ],
                impact: 'high',
                timeframe: 'immediate'
            });
        } else if (financialROI.roi < 2) {
            recommendations.push({
                category: 'financial',
                priority: 'high',
                title: 'Oportunidad de Mejora en ROI',
                description: 'ROI por debajo de estándares típicos del sector.',
                actions: [
                    'Identificar áreas de ineficiencia',
                    'Explorar oportunidades de escalamiento',
                    'Mejorar seguimiento de resultados',
                    'Considerar alianzas estratégicas'
                ],
                impact: 'medium',
                timeframe: 'short_term'
            });
        }

        // Recomendaciones basadas en SROI
        if (socialROI.sroi < 2) {
            recommendations.push({
                category: 'social',
                priority: 'medium',
                title: 'Potencial de Mejora en Impacto Social',
                description: 'El retorno social puede optimizarse.',
                actions: [
                    'Revisar metodologías de medición de impacto',
                    'Fortalecer programas con mayor impacto social',
                    'Mejorar seguimiento de beneficiarios',
                    'Documentar cambios cualitativos'
                ],
                impact: 'medium',
                timeframe: 'medium_term'
            });
        }

        // Recomendaciones basadas en eficiencia
        if (efficiencyMetrics.costPerLifeImpacted > 200) {
            recommendations.push({
                category: 'efficiency',
                priority: 'medium',
                title: 'Optimizar Costo por Impacto',
                description: 'El costo por vida impactada es elevado.',
                actions: [
                    'Revisar procesos operativos',
                    'Implementar tecnologías de automatización',
                    'Capacitar equipo en mejores prácticas',
                    'Evaluar modelos de entrega alternativos'
                ],
                impact: 'medium',
                timeframe: 'medium_term'
            });
        }

        // Recomendaciones basadas en benchmarks
        if (benchmarkAnalysis && benchmarkAnalysis.performance.roi) {
            if (benchmarkAnalysis.performance.roi.status === 'below') {
                recommendations.push({
                    category: 'benchmark',
                    priority: 'high',
                    title: 'Rendimiento Por Debajo del Sector',
                    description: `ROI ${Math.abs(benchmarkAnalysis.performance.roi.percentageDifference)}% por debajo del promedio sectorial.`,
                    actions: [
                        'Estudiar mejores prácticas del sector',
                        'Implementar benchmarking competitivo',
                        'Revisar estrategia general',
                        'Considerar consultoría especializada'
                    ],
                    impact: 'high',
                    timeframe: 'medium_term'
                });
            }
        }

        // Recomendaciones generales de mejora
        recommendations.push({
            category: 'general',
            priority: 'low',
            title: 'Mejora Continua y Monitoreo',
            description: 'Mantener enfoque en optimización continua.',
            actions: [
                'Implementar dashboard de métricas en tiempo real',
                'Establecer revisiones periódicas de ROI',
                'Desarrollar cultura de mejora continua',
                'Documentar y compartir aprendizajes'
            ],
            impact: 'medium',
            timeframe: 'ongoing'
        });

        return recommendations.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Genera datos para gráficos
     */
    generateChartData(analysisData) {
        const { financialROI, socialROI, combinedROI, benchmarkAnalysis, projections } = analysisData;

        return {
            roiComparison: {
                type: 'bar',
                data: {
                    labels: ['ROI Financiero', 'ROI Social', 'ROI Combinado'],
                    datasets: [{
                        label: 'ROI (%)',
                        data: [
                            financialROI.roi,
                            socialROI.sroi * 100,
                            combinedROI.combinedROI
                        ],
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                    }]
                }
            },
            benchmarkComparison: benchmarkAnalysis ? {
                type: 'radar',
                data: {
                    labels: ['ROI', 'Eficiencia', 'Impacto', 'Sostenibilidad'],
                    datasets: [
                        {
                            label: 'Actual',
                            data: [
                                financialROI.roi,
                                100 - (analysisData.efficiencyMetrics.costPerLifeImpacted || 0),
                                socialROI.sroi * 20,
                                80
                            ],
                            borderColor: '#3b82f6'
                        },
                        {
                            label: 'Benchmark',
                            data: [
                                benchmarkAnalysis.performance.roi?.benchmark || 0,
                                100,
                                100,
                                85
                            ],
                            borderColor: '#6b7280'
                        }
                    ]
                }
            } : null,
            projectionTrends: projections ? {
                type: 'line',
                data: {
                    labels: ['Actual', '6 meses', '12 meses'],
                    datasets: [
                        {
                            label: 'Conservador',
                            data: [
                                financialROI.roi,
                                projections.conservative.projectedROI * 0.8,
                                projections.conservative.projectedROI
                            ],
                            borderColor: '#ef4444'
                        },
                        {
                            label: 'Realista',
                            data: [
                                financialROI.roi,
                                projections.realistic.projectedROI * 0.9,
                                projections.realistic.projectedROI
                            ],
                            borderColor: '#3b82f6'
                        },
                        {
                            label: 'Optimista',
                            data: [
                                financialROI.roi,
                                projections.optimistic.projectedROI * 0.95,
                                projections.optimistic.projectedROI
                            ],
                            borderColor: '#10b981'
                        }
                    ]
                }
            } : null,
            socialValueBreakdown: {
                type: 'doughnut',
                data: {
                    labels: Object.keys(socialROI.breakdown),
                    datasets: [{
                        data: Object.values(socialROI.breakdown).map(item => item.totalValue),
                        backgroundColor: [
                            '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                            '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
                        ]
                    }]
                }
            }
        };
    }

    /**
     * Guarda reporte generado
     */
    saveReport(report) {
        const reportId = `roi_report_${Date.now()}`;
        const reportData = {
            id: reportId,
            ...report,
            savedAt: new Date().toISOString()
        };

        try {
            const savedReports = JSON.parse(localStorage.getItem('roiReports') || '[]');
            savedReports.push(reportData);
            
            // Mantener solo los últimos 10 reportes
            if (savedReports.length > 10) {
                savedReports.splice(0, savedReports.length - 10);
            }
            
            localStorage.setItem('roiReports', JSON.stringify(savedReports));
        } catch (error) {
            console.warn('Error guardando reporte:', error);
        }
    }

    /**
     * Calcula ROI anualizado
     */
    calculateAnnualizedROI(roi, months) {
        if (months === 12) return roi;
        return ((1 + roi / 100) ** (12 / months) - 1) * 100;
    }

    /**
     * Redondea a precisión especificada
     */
    roundToPrecision(value) {
        return Math.round(value * Math.pow(10, this.options.precision)) / Math.pow(10, this.options.precision);
    }

    /**
     * Actualiza cálculos de ROI
     */
    async refreshROICalculations() {
        try {
            const currentData = await this.getCurrentROIData();
            const calculations = {
                financial: this.calculateFinancialROI(currentData.investment, currentData.returns),
                social: this.calculateSocialROI(currentData.investment, currentData.socialOutcomes),
                combined: this.calculateCombinedROI(
                    currentData.investment,
                    currentData.returns,
                    currentData.socialOutcomes
                ),
                efficiency: this.calculateEfficiencyMetrics(currentData.investment, currentData.outcomes),
                lastUpdated: new Date().toISOString()
            };

            this.calculations.set('current', calculations);
            this.saveROIData();

            // Disparar evento de actualización
            document.dispatchEvent(new CustomEvent('roiCalculationsUpdated', {
                detail: calculations
            }));

        } catch (error) {
            console.error('Error actualizando cálculos de ROI:', error);
        }
    }

    /**
     * Maneja actualización de métricas
     */
    handleMetricsUpdate(metrics) {
        this.refreshROICalculations();
    }

    /**
     * Maneja cambio en inversión
     */
    handleInvestmentChange(investmentData) {
        this.refreshROICalculations();
    }

    /**
     * Métodos públicos para integración externa
     */

    // Obtener cálculos actuales
    getCurrentCalculations() {
        return this.calculations.get('current');
    }

    // Obtener reportes guardados
    getSavedReports() {
        try {
            return JSON.parse(localStorage.getItem('roiReports') || '[]');
        } catch (error) {
            return [];
        }
    }

    // Actualizar valores de impacto social
    updateSocialImpactValue(outcome, value) {
        this.socialImpactValues.set(outcome, value);
        this.saveROIData();
        this.refreshROICalculations();
    }

    // Obtener valores de impacto social
    getSocialImpactValues() {
        return Object.fromEntries(this.socialImpactValues.entries());
    }

    // Exportar configuración
    exportConfiguration() {
        return {
            socialImpactValues: Object.fromEntries(this.socialImpactValues.entries()),
            calculations: Object.fromEntries(this.calculations.entries()),
            options: this.options,
            exportedAt: new Date().toISOString()
        };
    }

    // Importar configuración
    importConfiguration(config) {
        if (config.socialImpactValues) {
            this.socialImpactValues = new Map(Object.entries(config.socialImpactValues));
        }
        if (config.calculations) {
            this.calculations = new Map(Object.entries(config.calculations));
        }
        
        this.saveROIData();
        this.refreshROICalculations();
    }

    // Crear dashboard de ROI
    createROIDashboard(container) {
        const dashboard = document.createElement('div');
        dashboard.className = 'roi-dashboard';
        
        dashboard.innerHTML = `
            <div class="roi-header">
                <h2>Dashboard de ROI</h2>
                <div class="roi-actions">
                    <button class="btn-refresh" onclick="this.closest('.roi-dashboard').roiSystem.refreshROICalculations()">
                        Actualizar
                    </button>
                    <button class="btn-report" onclick="this.closest('.roi-dashboard').roiSystem.generateReport()">
                        Generar Reporte
                    </button>
                </div>
            </div>
            
            <div class="roi-metrics-grid">
                <div class="roi-card financial">
                    <div class="card-header">
                        <h3>ROI Financiero</h3>
                        <span class="card-icon">💰</span>
                    </div>
                    <div class="card-value" data-roi-metric="financial">--</div>
                    <div class="card-label">Retorno Financiero</div>
                </div>
                
                <div class="roi-card social">
                    <div class="card-header">
                        <h3>ROI Social</h3>
                        <span class="card-icon">❤️</span>
                    </div>
                    <div class="card-value" data-roi-metric="social">--</div>
                    <div class="card-label">Impacto Social</div>
                </div>
                
                <div class="roi-card combined">
                    <div class="card-header">
                        <h3>ROI Combinado</h3>
                        <span class="card-icon">⚡</span>
                    </div>
                    <div class="card-value" data-roi-metric="combined">--</div>
                    <div class="card-label">Valor Total</div>
                </div>
                
                <div class="roi-card efficiency">
                    <div class="card-header">
                        <h3>Eficiencia</h3>
                        <span class="card-icon">🎯</span>
                    </div>
                    <div class="card-value" data-roi-metric="efficiency">--</div>
                    <div class="card-label">Costo por Impacto</div>
                </div>
            </div>
            
            <div class="roi-charts">
                <div class="chart-container">
                    <canvas id="roi-comparison-chart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="roi-trend-chart"></canvas>
                </div>
            </div>
            
            <div class="roi-recommendations">
                <h3>Recomendaciones</h3>
                <div class="recommendations-list" data-roi-recommendations></div>
            </div>
        `;

        // Agregar referencia al sistema
        dashboard.roiSystem = this;
        
        container.appendChild(dashboard);
        this.updateDashboard(dashboard);
        
        return dashboard;
    }

    // Actualizar dashboard
    updateDashboard(dashboard) {
        const currentCalcs = this.getCurrentCalculations();
        if (!currentCalcs) return;

        // Actualizar métricas
        const financialElement = dashboard.querySelector('[data-roi-metric="financial"]');
        if (financialElement) {
            financialElement.textContent = `${currentCalcs.financial.roi}%`;
        }

        const socialElement = dashboard.querySelector('[data-roi-metric="social"]');
        if (socialElement) {
            socialElement.textContent = `${currentCalcs.social.sroi}x`;
        }

        const combinedElement = dashboard.querySelector('[data-roi-metric="combined"]');
        if (combinedElement) {
            combinedElement.textContent = `${currentCalcs.combined.combinedROI}%`;
        }

        const efficiencyElement = dashboard.querySelector('[data-roi-metric="efficiency"]');
        if (efficiencyElement) {
            const costPerImpact = currentCalcs.efficiency.costPerLifeImpacted || 0;
            efficiencyElement.textContent = `€${costPerImpact}`;
        }

        // Actualizar recomendaciones
        this.updateRecommendationsDisplay(dashboard, currentCalcs);
    }

    // Actualizar display de recomendaciones
    updateRecommendationsDisplay(dashboard, calculations) {
        const container = dashboard.querySelector('[data-roi-recommendations]');
        if (!container) return;

        const recommendations = this.generateRecommendations(calculations);
        
        container.innerHTML = recommendations.slice(0, 3).map(rec => `
            <div class="recommendation-item priority-${rec.priority}">
                <div class="recommendation-header">
                    <h4>${rec.title}</h4>
                    <span class="priority-badge">${rec.priority}</span>
                </div>
                <p>${rec.description}</p>
                <div class="recommendation-actions">
                    ${rec.actions.slice(0, 2).map(action => `<span class="action-item">${action}</span>`).join('')}
                </div>
            </div>
        `).join('');
    }
}

/**
 * CALCULADORA FINANCIERA
 */
class FinancialCalculator {
    calculateNPV(cashFlows, discountRate) {
        return cashFlows.reduce((npv, cashFlow, index) => {
            return npv + cashFlow / Math.pow(1 + discountRate, index);
        }, 0);
    }

    calculateIRR(cashFlows, iterations = 100) {
        let rate = 0.1;
        for (let i = 0; i < iterations; i++) {
            const npv = this.calculateNPV(cashFlows, rate);
            const derivative = this.calculateNPVDerivative(cashFlows, rate);
            
            if (Math.abs(npv) < 0.001) break;
            rate = rate - npv / derivative;
        }
        return rate;
    }

    calculateNPVDerivative(cashFlows, rate) {
        return cashFlows.reduce((derivative, cashFlow, index) => {
            return derivative - (index * cashFlow) / Math.pow(1 + rate, index + 1);
        }, 0);
    }

    calculatePaybackPeriod(initialInvestment, cashFlows) {
        let cumulativeCashFlow = -initialInvestment;
        
        for (let i = 0; i < cashFlows.length; i++) {
            cumulativeCashFlow += cashFlows[i];
            if (cumulativeCashFlow >= 0) {
                return i + 1;
            }
        }
        return null; // No payback within the period
    }
}

/**
 * CALCULADORA DE ROI SOCIAL
 */
class SocialROICalculator {
    calculateSROI(inputs, outcomes, deadweight = 0.1, attribution = 0.8, dropOff = 0.1) {
        const adjustedOutcomes = outcomes.map(outcome => 
            outcome * (1 - deadweight) * attribution * (1 - dropOff)
        );
        
        const totalValue = adjustedOutcomes.reduce((sum, value) => sum + value, 0);
        const totalInputs = inputs.reduce((sum, input) => sum + input, 0);
        
        return totalValue / totalInputs;
    }

    calculateSensitivityAnalysis(baseInputs, baseOutcomes, variations = [-20, -10, 10, 20]) {
        const baseSROI = this.calculateSROI(baseInputs, baseOutcomes);
        
        return variations.map(variation => {
            const adjustedOutcomes = baseOutcomes.map(outcome => 
                outcome * (1 + variation / 100)
            );
            const adjustedSROI = this.calculateSROI(baseInputs, adjustedOutcomes);
            
            return {
                variation,
                sroi: adjustedSROI,
                difference: adjustedSROI - baseSROI,
                percentageChange: ((adjustedSROI - baseSROI) / baseSROI) * 100
            };
        });
    }
}

/**
 * ANALIZADOR DE BENCHMARKS
 */
class BenchmarkAnalyzer {
    constructor() {
        this.industryData = new Map();
        this.loadIndustryBenchmarks();
    }

    loadIndustryBenchmarks() {
        // Datos de benchmarks por industria
        const benchmarks = {
            'healthcare': { avgROI: 3.2, topQuartile: 4.8, median: 2.9 },
            'education': { avgROI: 2.8, topQuartile: 4.1, median: 2.5 },
            'environment': { avgROI: 2.1, topQuartile: 3.2, median: 1.9 },
            'social_services': { avgROI: 3.5, topQuartile: 5.1, median: 3.1 },
            'community_development': { avgROI: 2.9, topQuartile: 4.3, median: 2.6 }
        };

        Object.entries(benchmarks).forEach(([industry, data]) => {
            this.industryData.set(industry, data);
        });
    }

    compareToIndustry(roi, industry) {
        const benchmark = this.industryData.get(industry);
        if (!benchmark) return null;

        return {
            industry,
            roi,
            benchmark: benchmark.avgROI,
            percentile: this.calculatePercentile(roi, benchmark),
            status: this.determineStatus(roi, benchmark),
            recommendations: this.generateBenchmarkRecommendations(roi, benchmark)
        };
    }

    calculatePercentile(roi, benchmark) {
        if (roi >= benchmark.topQuartile) return 90;
        if (roi >= benchmark.avgROI) return 70;
        if (roi >= benchmark.median) return 50;
        return 25;
    }

    determineStatus(roi, benchmark) {
        if (roi >= benchmark.topQuartile) return 'excellent';
        if (roi >= benchmark.avgROI) return 'good';
        if (roi >= benchmark.median) return 'average';
        return 'below_average';
    }

    generateBenchmarkRecommendations(roi, benchmark) {
        const gap = benchmark.avgROI - roi;
        const recommendations = [];

        if (gap > 0) {
            recommendations.push({
                type: 'improvement',
                message: `ROI está ${gap.toFixed(1)}% por debajo del promedio de la industria`,
                priority: gap > 1 ? 'high' : 'medium'
            });
        }

        return recommendations;
    }
}

/**
 * MOTOR DE PROYECCIONES
 */
class ProjectionEngine {
    generateForecast(historicalData, periods = 12, method = 'linear') {
        switch (method) {
            case 'linear':
                return this.linearRegression(historicalData, periods);
            case 'exponential':
                return this.exponentialSmoothing(historicalData, periods);
            case 'seasonal':
                return this.seasonalDecomposition(historicalData, periods);
            default:
                return this.linearRegression(historicalData, periods);
        }
    }

    linearRegression(data, periods) {
        const n = data.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = data;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return Array.from({ length: periods }, (_, i) => 
            intercept + slope * (n + i)
        );
    }

    exponentialSmoothing(data, periods, alpha = 0.3) {
        const smoothed = [data[0]];
        
        for (let i = 1; i < data.length; i++) {
            smoothed[i] = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
        }

        const forecast = [];
        let lastSmoothed = smoothed[smoothed.length - 1];
        
        for (let i = 0; i < periods; i++) {
            forecast.push(lastSmoothed);
        }

        return forecast;
    }

    seasonalDecomposition(data, periods) {
        // Implementación simplificada de descomposición estacional
        const seasonLength = 12; // Asumiendo datos mensuales
        const trend = this.calculateTrend(data);
        const seasonal = this.calculateSeasonal(data, seasonLength);
        
        return Array.from({ length: periods }, (_, i) => {
            const trendValue = trend + (i * 0.1); // Tendencia simple
            const seasonalValue = seasonal[i % seasonLength];
            return trendValue + seasonalValue;
        });
    }

    calculateTrend(data) {
        const n = data.length;
        const midpoint = Math.floor(n / 2);
        const firstHalf = data.slice(0, midpoint);
        const secondHalf = data.slice(midpoint);
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        return secondAvg - firstAvg;
    }

    calculateSeasonal(data, seasonLength) {
        const seasonal = Array(seasonLength).fill(0);
        const counts = Array(seasonLength).fill(0);
        
        data.forEach((value, index) => {
            const seasonIndex = index % seasonLength;
            seasonal[seasonIndex] += value;
            counts[seasonIndex]++;
        });
        
        return seasonal.map((sum, i) => 
            counts[i] > 0 ? sum / counts[i] : 0
        );
    }
}

// Estilos CSS inline para el dashboard de ROI
const roiStyles = `
    <style>
    .roi-dashboard {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        max-width: 1200px;
        margin: 0 auto;
    }
    
    .roi-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
    }
    
    .roi-header h2 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 700;
        color: #1f2937;
    }
    
    .roi-actions {
        display: flex;
        gap: 1rem;
    }
    
    .btn-refresh, .btn-report {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn-refresh {
        background: #f3f4f6;
        color: #374151;
    }
    
    .btn-refresh:hover {
        background: #e5e7eb;
    }
    
    .btn-report {
        background: #3b82f6;
        color: white;
    }
    
    .btn-report:hover {
        background: #2563eb;
    }
    
    .roi-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    
    .roi-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }
    
    .roi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    
    .roi-card.financial {
        border-left: 4px solid #3b82f6;
    }
    
    .roi-card.social {
        border-left: 4px solid #10b981;
    }
    
    .roi-card.combined {
        border-left: 4px solid #f59e0b;
    }
    
    .roi-card.efficiency {
        border-left: 4px solid #8b5cf6;
    }
    
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .card-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
    }
    
    .card-icon {
        font-size: 1.5rem;
    }
    
    .card-value {
        font-size: 2.5rem;
        font-weight: 800;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }
    
    .card-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }
    
    .roi-charts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 2rem;
        margin-bottom: 2rem;
    }
    
    .chart-container {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
        height: 300px;
    }
    
    .roi-recommendations {
        background: #f8fafc;
        border-radius: 12px;
        padding: 1.5rem;
    }
    
    .roi-recommendations h3 {
        margin: 0 0 1rem 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #374151;
    }
    
    .recommendation-item {
        background: white;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        border-left: 4px solid #e5e7eb;
    }
    
    .recommendation-item.priority-critical {
        border-left-color: #ef4444;
    }
    
    .recommendation-item.priority-high {
        border-left-color: #f59e0b;
    }
    
    .recommendation-item.priority-medium {
        border-left-color: #3b82f6;
    }
    
    .recommendation-item.priority-low {
        border-left-color: #10b981;
    }
    
    .recommendation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .recommendation-header h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
    }
    
    .priority-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        background: #f3f4f6;
        color: #374151;
    }
    
    .recommendation-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .action-item {
        padding: 0.25rem 0.5rem;
        background: #eff6ff;
        color: #1d4ed8;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    @media (max-width: 768px) {
        .roi-dashboard {
            padding: 1rem;
        }
        
        .roi-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
        }
        
        .roi-metrics-grid {
            grid-template-columns: 1fr;
        }
        
        .roi-charts {
            grid-template-columns: 1fr;
        }
        
        .chart-container {
            min-width: 0;
        }
    }
    </style>
`;

// Inyectar estilos si no existen
if (!document.querySelector('#roi-reporting-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'roi-reporting-styles';
    styleElement.innerHTML = roiStyles;
    document.head.appendChild(styleElement);
}

// Inicialización automática cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ROIReporting = ROIReporting;
        window.FinancialCalculator = FinancialCalculator;
        window.SocialROICalculator = SocialROICalculator;
        window.BenchmarkAnalyzer = BenchmarkAnalyzer;
        window.ProjectionEngine = ProjectionEngine;
    });
} else {
    window.ROIReporting = ROIReporting;
    window.FinancialCalculator = FinancialCalculator;
    window.SocialROICalculator = SocialROICalculator;
    window.BenchmarkAnalyzer = BenchmarkAnalyzer;
    window.ProjectionEngine = ProjectionEngine;
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ROIReporting, 
        FinancialCalculator, 
        SocialROICalculator, 
        BenchmarkAnalyzer, 
        ProjectionEngine 
    };
}