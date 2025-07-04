/**
 * Analytics Processor Worker
 * Procesa datos de analytics en background para mejorar performance
 */

// Configuración del worker
const WORKER_VERSION = '1.0.0';
const BATCH_SIZE = 1000;
const PROCESSING_DELAY = 10; // ms entre lotes

// Cache de procesamiento
let processingCache = new Map();
let metricsCache = new Map();
let calculationFunctions = new Map();

// Estado del worker
let isProcessing = false;
let processingQueue = [];
let lastProcessedTime = null;

/**
 * Inicializa el worker
 */
function initializeWorker() {
    console.log(`🔧 Analytics Processor Worker v${WORKER_VERSION} initialized`);
    
    // Configurar funciones de cálculo
    setupCalculationFunctions();
    
    // Configurar cache
    setupCache();
    
    // Enviar confirmación de inicialización
    self.postMessage({
        type: 'worker_ready',
        version: WORKER_VERSION,
        capabilities: Array.from(calculationFunctions.keys())
    });
}

/**
 * Configura las funciones de cálculo disponibles
 */
function setupCalculationFunctions() {
    // Métricas básicas
    calculationFunctions.set('sum', calculateSum);
    calculationFunctions.set('average', calculateAverage);
    calculationFunctions.set('count', calculateCount);
    calculationFunctions.set('percentage', calculatePercentage);
    calculationFunctions.set('growth', calculateGrowth);
    calculationFunctions.set('median', calculateMedian);
    calculationFunctions.set('variance', calculateVariance);
    calculationFunctions.set('standardDeviation', calculateStandardDeviation);
    
    // Métricas de engagement
    calculationFunctions.set('engagementScore', calculateEngagementScore);
    calculationFunctions.set('retentionRate', calculateRetentionRate);
    calculationFunctions.set('conversionRate', calculateConversionRate);
    
    // Métricas de impacto
    calculationFunctions.set('impactMetrics', calculateImpactMetrics);
    calculationFunctions.set('reachCalculation', calculateReach);
    calculationFunctions.set('roiCalculation', calculateROI);
    
    // Análisis avanzados
    calculationFunctions.set('trendAnalysis', performTrendAnalysis);
    calculationFunctions.set('segmentation', performSegmentation);
    calculationFunctions.set('clustering', performClustering);
}

/**
 * Configura el sistema de cache
 */
function setupCache() {
    // Limpiar cache cada 5 minutos
    setInterval(() => {
        const now = Date.now();
        const cacheTimeout = 5 * 60 * 1000; // 5 minutos
        
        for (const [key, value] of processingCache.entries()) {
            if (now - value.timestamp > cacheTimeout) {
                processingCache.delete(key);
            }
        }
        
        for (const [key, value] of metricsCache.entries()) {
            if (now - value.timestamp > cacheTimeout) {
                metricsCache.delete(key);
            }
        }
    }, 60000); // Revisar cada minuto
}

/**
 * Maneja mensajes del hilo principal
 */
self.onmessage = function(event) {
    const { type, data, id } = event.data;
    
    try {
        switch (type) {
            case 'initialize':
                initializeWorker();
                break;
                
            case 'process_data':
                processData(data, id);
                break;
                
            case 'calculate_metrics':
                calculateMetrics(data, id);
                break;
                
            case 'batch_process':
                processBatch(data, id);
                break;
                
            case 'clear_cache':
                clearCache();
                respondWithSuccess(id, 'Cache cleared');
                break;
                
            case 'get_status':
                getWorkerStatus(id);
                break;
                
            default:
                respondWithError(id, `Unknown message type: ${type}`);
        }
    } catch (error) {
        respondWithError(id, error.message);
    }
};

/**
 * Procesa datos de analytics
 */
async function processData(data, requestId) {
    if (isProcessing) {
        processingQueue.push({ data, requestId });
        return;
    }
    
    isProcessing = true;
    const startTime = performance.now();
    
    try {
        const { sponsors, metrics, timeRange, calculations } = data;
        const results = {};
        
        // Procesar cada tipo de cálculo solicitado
        for (const calculation of calculations) {
            const cacheKey = generateCacheKey(calculation, sponsors, timeRange);
            
            // Verificar cache
            if (processingCache.has(cacheKey)) {
                results[calculation.type] = processingCache.get(cacheKey).result;
                continue;
            }
            
            // Realizar cálculo
            const calculationFunction = calculationFunctions.get(calculation.type);
            if (calculationFunction) {
                const result = await calculationFunction(sponsors, calculation.params);
                results[calculation.type] = result;
                
                // Guardar en cache
                processingCache.set(cacheKey, {
                    result,
                    timestamp: Date.now()
                });
            } else {
                results[calculation.type] = { error: `Unknown calculation: ${calculation.type}` };
            }
        }
        
        const processingTime = performance.now() - startTime;
        lastProcessedTime = Date.now();
        
        respondWithSuccess(requestId, {
            results,
            processingTime,
            cacheHits: calculations.length - Object.keys(results).length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        respondWithError(requestId, error.message);
    } finally {
        isProcessing = false;
        processQueue();
    }
}

/**
 * Calcula métricas específicas
 */
async function calculateMetrics(data, requestId) {
    try {
        const { metricType, dataset, config } = data;
        const cacheKey = `metric_${metricType}_${JSON.stringify(config)}`;
        
        // Verificar cache
        if (metricsCache.has(cacheKey)) {
            const cached = metricsCache.get(cacheKey);
            respondWithSuccess(requestId, cached.result);
            return;
        }
        
        let result;
        
        switch (metricType) {
            case 'engagement_distribution':
                result = calculateEngagementDistribution(dataset);
                break;
                
            case 'tier_analysis':
                result = calculateTierAnalysis(dataset, config);
                break;
                
            case 'temporal_trends':
                result = calculateTemporalTrends(dataset, config);
                break;
                
            case 'correlation_analysis':
                result = calculateCorrelationAnalysis(dataset, config);
                break;
                
            default:
                throw new Error(`Unknown metric type: ${metricType}`);
        }
        
        // Guardar en cache
        metricsCache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });
        
        respondWithSuccess(requestId, result);
        
    } catch (error) {
        respondWithError(requestId, error.message);
    }
}

/**
 * Procesa lotes de datos grandes
 */
async function processBatch(data, requestId) {
    try {
        const { items, operation, config } = data;
        const results = [];
        const batches = [];
        
        // Dividir en lotes
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            batches.push(items.slice(i, i + BATCH_SIZE));
        }
        
        // Procesar cada lote
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const batchResult = await processBatchChunk(batch, operation, config);
            results.push(...batchResult);
            
            // Reportar progreso
            const progress = ((i + 1) / batches.length) * 100;
            self.postMessage({
                type: 'batch_progress',
                requestId,
                progress,
                processed: (i + 1) * BATCH_SIZE,
                total: items.length
            });
            
            // Pausa pequeña para no bloquear
            if (i < batches.length - 1) {
                await sleep(PROCESSING_DELAY);
            }
        }
        
        respondWithSuccess(requestId, {
            results,
            totalProcessed: items.length,
            batchCount: batches.length
        });
        
    } catch (error) {
        respondWithError(requestId, error.message);
    }
}

/**
 * Procesa un chunk de un lote
 */
async function processBatchChunk(chunk, operation, config) {
    switch (operation) {
        case 'calculate_engagement':
            return chunk.map(item => ({
                id: item.id,
                engagement: calculateItemEngagement(item, config)
            }));
            
        case 'normalize_data':
            return normalizeDataChunk(chunk, config);
            
        case 'apply_filters':
            return applyFiltersToChunk(chunk, config);
            
        default:
            throw new Error(`Unknown batch operation: ${operation}`);
    }
}

/**
 * Funciones de cálculo específicas
 */

function calculateSum(data, params) {
    const field = params.field || 'amount';
    return data.reduce((sum, item) => sum + (item[field] || 0), 0);
}

function calculateAverage(data, params) {
    if (data.length === 0) return 0;
    const sum = calculateSum(data, params);
    return sum / data.length;
}

function calculateCount(data, params) {
    if (params.condition) {
        return data.filter(item => evaluateCondition(item, params.condition)).length;
    }
    return data.length;
}

function calculatePercentage(data, params) {
    const numerator = calculateCount(data, { condition: params.numeratorCondition });
    const denominator = calculateCount(data, { condition: params.denominatorCondition });
    
    if (denominator === 0) return 0;
    return (numerator / denominator) * 100;
}

function calculateGrowth(data, params) {
    if (data.length < 2) return 0;
    
    const field = params.field || 'amount';
    const current = data[data.length - 1][field] || 0;
    const previous = data[data.length - 2][field] || 0;
    
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

function calculateMedian(data, params) {
    const field = params.field || 'amount';
    const values = data.map(item => item[field] || 0).sort((a, b) => a - b);
    
    if (values.length === 0) return 0;
    
    const middle = Math.floor(values.length / 2);
    
    if (values.length % 2 === 0) {
        return (values[middle - 1] + values[middle]) / 2;
    } else {
        return values[middle];
    }
}

function calculateVariance(data, params) {
    if (data.length === 0) return 0;
    
    const field = params.field || 'amount';
    const values = data.map(item => item[field] || 0);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateStandardDeviation(data, params) {
    return Math.sqrt(calculateVariance(data, params));
}

function calculateEngagementScore(data, params) {
    const weights = params.weights || {
        interactions: 1.0,
        events: 1.5,
        communications: 0.8,
        feedback: 2.0
    };
    
    return data.map(sponsor => {
        let score = 0;
        let totalWeight = 0;
        
        Object.entries(weights).forEach(([metric, weight]) => {
            if (sponsor[metric] !== undefined) {
                score += sponsor[metric] * weight;
                totalWeight += weight;
            }
        });
        
        return {
            id: sponsor.id,
            engagementScore: totalWeight > 0 ? score / totalWeight : 0
        };
    });
}

function calculateRetentionRate(data, params) {
    const period = params.period || 'annual';
    const renewed = data.filter(sponsor => sponsor.renewed === true).length;
    const eligible = data.filter(sponsor => sponsor.eligibleForRenewal === true).length;
    
    if (eligible === 0) return 0;
    return (renewed / eligible) * 100;
}

function calculateConversionRate(data, params) {
    const converted = data.filter(prospect => prospect.converted === true).length;
    const total = data.length;
    
    if (total === 0) return 0;
    return (converted / total) * 100;
}

function calculateImpactMetrics(data, params) {
    const metrics = {};
    
    metrics.totalFunding = calculateSum(data, { field: 'amount' });
    metrics.averageContribution = calculateAverage(data, { field: 'amount' });
    metrics.totalReach = calculateSum(data, { field: 'reach' });
    metrics.averageEngagement = calculateAverage(data, { field: 'engagement' });
    
    return metrics;
}

function calculateReach(data, params) {
    const directReach = calculateSum(data, { field: 'directBeneficiaries' });
    const indirectReach = calculateSum(data, { field: 'indirectBeneficiaries' });
    const multiplier = params.multiplier || 1.5;
    
    return {
        direct: directReach,
        indirect: indirectReach,
        total: directReach + (indirectReach * multiplier)
    };
}

function calculateROI(data, params) {
    const totalInvestment = calculateSum(data, { field: 'amount' });
    const totalImpact = calculateSum(data, { field: 'impactValue' });
    
    if (totalInvestment === 0) return 0;
    return (totalImpact / totalInvestment) * 100;
}

function performTrendAnalysis(data, params) {
    const timeField = params.timeField || 'date';
    const valueField = params.valueField || 'amount';
    const period = params.period || 'monthly';
    
    // Agrupar por período
    const grouped = groupByTimePeriod(data, timeField, period);
    
    // Calcular tendencia
    const trend = [];
    Object.entries(grouped).forEach(([period, items]) => {
        const value = calculateSum(items, { field: valueField });
        trend.push({ period, value });
    });
    
    // Calcular dirección de tendencia
    const direction = calculateTrendDirection(trend);
    
    return {
        data: trend,
        direction,
        volatility: calculateVolatility(trend)
    };
}

function performSegmentation(data, params) {
    const segmentField = params.segmentField || 'tier';
    const segments = {};
    
    data.forEach(item => {
        const segment = item[segmentField];
        if (!segments[segment]) {
            segments[segment] = [];
        }
        segments[segment].push(item);
    });
    
    // Calcular métricas por segmento
    const metricsBySegment = {};
    Object.entries(segments).forEach(([segment, items]) => {
        metricsBySegment[segment] = {
            count: items.length,
            sum: calculateSum(items, { field: params.metricField || 'amount' }),
            average: calculateAverage(items, { field: params.metricField || 'amount' })
        };
    });

    return {
        segments: metricsBySegment
    };
}