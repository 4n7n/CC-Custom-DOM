/**
 * Performance Monitor Web Worker
 * Handles heavy performance analysis in background thread
 */

class PerformanceMonitorWorker {
    constructor() {
        this.isRunning = false;
        this.analysisQueue = [];
        this.metrics = {
            fps: [],
            memory: [],
            network: [],
            resources: [],
            vitals: []
        };
        this.thresholds = {
            fps: { good: 58, poor: 30 },
            memory: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 },
            network: { slow: 1000, verySlow: 3000 },
            lcp: { good: 2500, poor: 4000 },
            fid: { good: 100, poor: 300 },
            cls: { good: 0.1, poor: 0.25 }
        };
        
        this.init();
    }

    init() {
        this.setupMessageHandlers();
        this.startAnalysisLoop();
    }

    setupMessageHandlers() {
        self.addEventListener('message', (event) => {
            const { type, data, id } = event.data;
            
            switch (type) {
                case 'ANALYZE_PERFORMANCE':
                    this.analyzePerformanceData(data, id);
                    break;
                    
                case 'ANALYZE_METRICS':
                    this.analyzeMetrics(data, id);
                    break;
                    
                case 'DETECT_ANOMALIES':
                    this.detectAnomalies(data, id);
                    break;
                    
                case 'CALCULATE_SCORES':
                    this.calculatePerformanceScores(data, id);
                    break;
                    
                case 'GENERATE_RECOMMENDATIONS':
                    this.generateRecommendations(data, id);
                    break;
                    
                case 'BENCHMARK_ANALYSIS':
                    this.analyzeBenchmarks(data, id);
                    break;
                    
                case 'PROCESS_VITALS':
                    this.processWebVitals(data, id);
                    break;
                    
                case 'TREND_ANALYSIS':
                    this.analyzeTrends(data, id);
                    break;
                    
                case 'ADD_TO_QUEUE':
                    this.addToAnalysisQueue(data);
                    break;
                    
                case 'SET_THRESHOLDS':
                    this.updateThresholds(data, id);
                    break;
                    
                default:
                    this.sendError(`Unknown message type: ${type}`, id);
            }
        });
    }

    startAnalysisLoop() {
        this.isRunning = true;
        this.processAnalysisQueue();
    }

    processAnalysisQueue() {
        if (!this.isRunning) return;
        
        while (this.analysisQueue.length > 0) {
            const task = this.analysisQueue.shift();
            this.processAnalysisTask(task);
        }
        
        setTimeout(() => {
            this.processAnalysisQueue();
        }, 100);
    }

    processAnalysisTask(task) {
        try {
            switch (task.type) {
                case 'fps_analysis':
                    this.processFPSData(task.data);
                    break;
                case 'memory_analysis':
                    this.processMemoryData(task.data);
                    break;
                case 'network_analysis':
                    this.processNetworkData(task.data);
                    break;
                case 'resource_analysis':
                    this.processResourceData(task.data);
                    break;
            }
        } catch (error) {
            console.error('Analysis task failed:', error);
        }
    }

    analyzePerformanceData(data, requestId) {
        try {
            const analysis = {
                summary: this.generatePerformanceSummary(data),
                bottlenecks: this.identifyBottlenecks(data),
                optimizations: this.suggestOptimizations(data),
                score: this.calculateOverallScore(data),
                trends: this.analyzePerformanceTrends(data)
            };

            this.sendResult(analysis, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    generatePerformanceSummary(data) {
        const summary = {
            timestamp: Date.now(),
            metrics: {},
            status: 'unknown',
            criticalIssues: [],
            warnings: []
        };

        // Analyze FPS data
        if (data.fps && data.fps.length > 0) {
            const fpsStats = this.calculateFPSStats(data.fps);
            summary.metrics.fps = fpsStats;
            
            if (fpsStats.average < this.thresholds.fps.poor) {
                summary.criticalIssues.push('Low frame rate detected');
            } else if (fpsStats.average < this.thresholds.fps.good) {
                summary.warnings.push('Frame rate could be improved');
            }
        }

        // Analyze memory data
        if (data.memory && data.memory.length > 0) {
            const memoryStats = this.calculateMemoryStats(data.memory);
            summary.metrics.memory = memoryStats;
            
            if (memoryStats.peak > this.thresholds.memory.critical) {
                summary.criticalIssues.push('High memory usage detected');
            } else if (memoryStats.peak > this.thresholds.memory.warning) {
                summary.warnings.push('Memory usage is elevated');
            }
        }

        // Analyze network data
        if (data.network && data.network.length > 0) {
            const networkStats = this.calculateNetworkStats(data.network);
            summary.metrics.network = networkStats;
            
            if (networkStats.averageLatency > this.thresholds.network.verySlow) {
                summary.criticalIssues.push('Very slow network detected');
            } else if (networkStats.averageLatency > this.thresholds.network.slow) {
                summary.warnings.push('Network performance could be improved');
            }
        }

        // Determine overall status
        if (summary.criticalIssues.length > 0) {
            summary.status = 'poor';
        } else if (summary.warnings.length > 0) {
            summary.status = 'fair';
        } else {
            summary.status = 'good';
        }

        return summary;
    }

    calculateFPSStats(fpsData) {
        const values = fpsData.map(d => d.fps || d.value || d);
        
        return {
            average: this.calculateAverage(values),
            min: Math.min(...values),
            max: Math.max(...values),
            median: this.calculateMedian(values),
            p95: this.calculatePercentile(values, 95),
            jankEvents: this.countJankEvents(fpsData),
            smoothnessScore: this.calculateSmoothnessScore(values)
        };
    }

    calculateMemoryStats(memoryData) {
        const usedMemory = memoryData.map(d => d.used || d.value || d);
        
        return {
            average: this.calculateAverage(usedMemory),
            peak: Math.max(...usedMemory),
            min: Math.min(...usedMemory),
            growth: this.calculateGrowthRate(usedMemory),
            leakSuspicion: this.detectMemoryLeakSuspicion(usedMemory)
        };
    }

    calculateNetworkStats(networkData) {
        const latencies = networkData
            .map(d => d.latency || d.rtt || d.duration || d)
            .filter(l => l > 0);
        
        const sizes = networkData
            .map(d => d.size || d.transferSize || 0)
            .filter(s => s > 0);

        return {
            averageLatency: this.calculateAverage(latencies),
            p95Latency: this.calculatePercentile(latencies, 95),
            totalTransferSize: sizes.reduce((sum, size) => sum + size, 0),
            averageResourceSize: this.calculateAverage(sizes),
            requestCount: networkData.length
        };
    }

    identifyBottlenecks(data) {
        const bottlenecks = [];

        // CPU bottlenecks (low FPS)
        if (data.fps) {
            const fpsStats = this.calculateFPSStats(data.fps);
            if (fpsStats.average < this.thresholds.fps.poor) {
                bottlenecks.push({
                    type: 'cpu',
                    severity: 'high',
                    description: 'Low frame rate indicates CPU bottleneck',
                    metric: 'fps',
                    value: fpsStats.average,
                    threshold: this.thresholds.fps.poor
                });
            }
        }

        // Memory bottlenecks
        if (data.memory) {
            const memoryStats = this.calculateMemoryStats(data.memory);
            if (memoryStats.peak > this.thresholds.memory.critical) {
                bottlenecks.push({
                    type: 'memory',
                    severity: 'high',
                    description: 'High memory usage may cause performance issues',
                    metric: 'memory_peak',
                    value: memoryStats.peak,
                    threshold: this.thresholds.memory.critical
                });
            }
        }

        // Network bottlenecks
        if (data.network) {
            const networkStats = this.calculateNetworkStats(data.network);
            if (networkStats.averageLatency > this.thresholds.network.verySlow) {
                bottlenecks.push({
                    type: 'network',
                    severity: 'high',
                    description: 'High network latency is affecting performance',
                    metric: 'network_latency',
                    value: networkStats.averageLatency,
                    threshold: this.thresholds.network.verySlow
                });
            }
        }

        // Resource bottlenecks
        if (data.resources) {
            const slowResources = data.resources.filter(r => 
                (r.duration || r.loadTime || 0) > 2000
            );
            
            if (slowResources.length > 0) {
                bottlenecks.push({
                    type: 'resources',
                    severity: 'medium',
                    description: `${slowResources.length} slow-loading resources detected`,
                    metric: 'resource_load_time',
                    resources: slowResources.slice(0, 5) // Top 5 slowest
                });
            }
        }

        return bottlenecks.sort((a, b) => {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
    }

    suggestOptimizations(data) {
        const optimizations = [];

        // FPS optimizations
        if (data.fps) {
            const fpsStats = this.calculateFPSStats(data.fps);
            if (fpsStats.jankEvents > 5) {
                optimizations.push({
                    category: 'rendering',
                    priority: 'high',
                    title: 'Reduce frame drops',
                    description: 'Use CSS transforms instead of layout-triggering properties',
                    impact: 'Improves user experience and reduces jank'
                });
            }
        }

        // Memory optimizations
        if (data.memory) {
            const memoryStats = this.calculateMemoryStats(data.memory);
            if (memoryStats.leakSuspicion > 0.7) {
                optimizations.push({
                    category: 'memory',
                    priority: 'high',
                    title: 'Fix memory leaks',
                    description: 'Review event listeners and remove unused references',
                    impact: 'Prevents crashes and improves stability'
                });
            }
        }

        // Network optimizations
        if (data.network) {
            const networkStats = this.calculateNetworkStats(data.network);
            if (networkStats.averageResourceSize > 1024 * 1024) { // 1MB
                optimizations.push({
                    category: 'network',
                    priority: 'medium',
                    title: 'Optimize resource sizes',
                    description: 'Compress images and minify CSS/JS files',
                    impact: 'Faster loading times and reduced bandwidth usage'
                });
            }
        }

        // Web Vitals optimizations
        if (data.vitals) {
            const vitalsIssues = this.analyzeWebVitalsIssues(data.vitals);
            optimizations.push(...vitalsIssues);
        }

        return optimizations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    analyzeWebVitalsIssues(vitals) {
        const issues = [];

        if (vitals.lcp && vitals.lcp > this.thresholds.lcp.poor) {
            issues.push({
                category: 'loading',
                priority: 'high',
                title: 'Improve Largest Contentful Paint',
                description: 'Optimize images and reduce server response times',
                impact: 'Better perceived loading performance'
            });
        }

        if (vitals.fid && vitals.fid > this.thresholds.fid.poor) {
            issues.push({
                category: 'interactivity',
                priority: 'high',
                title: 'Reduce First Input Delay',
                description: 'Split large JavaScript bundles and defer non-critical scripts',
                impact: 'More responsive user interactions'
            });
        }

        if (vitals.cls && vitals.cls > this.thresholds.cls.poor) {
            issues.push({
                category: 'stability',
                priority: 'medium',
                title: 'Minimize Cumulative Layout Shift',
                description: 'Add size attributes to images and reserve space for dynamic content',
                impact: 'Prevents unexpected layout jumps'
            });
        }

        return issues;
    }

    calculateOverallScore(data) {
        let totalScore = 0;
        let categoryCount = 0;

        // FPS score (25% weight)
        if (data.fps) {
            const fpsStats = this.calculateFPSStats(data.fps);
            const fpsScore = this.normalizeScore(fpsStats.average, this.thresholds.fps.poor, this.thresholds.fps.good);
            totalScore += fpsScore * 0.25;
            categoryCount += 0.25;
        }

        // Memory score (25% weight)
        if (data.memory) {
            const memoryStats = this.calculateMemoryStats(data.memory);
            const memoryScore = this.normalizeScore(
                this.thresholds.memory.critical - memoryStats.peak,
                0,
                this.thresholds.memory.critical - this.thresholds.memory.warning
            );
            totalScore += memoryScore * 0.25;
            categoryCount += 0.25;
        }

        // Network score (25% weight)
        if (data.network) {
            const networkStats = this.calculateNetworkStats(data.network);
            const networkScore = this.normalizeScore(
                this.thresholds.network.verySlow - networkStats.averageLatency,
                0,
                this.thresholds.network.verySlow - this.thresholds.network.slow
            );
            totalScore += networkScore * 0.25;
            categoryCount += 0.25;
        }

        // Web Vitals score (25% weight)
        if (data.vitals) {
            const vitalsScore = this.calculateVitalsScore(data.vitals);
            totalScore += vitalsScore * 0.25;
            categoryCount += 0.25;
        }

        return categoryCount > 0 ? Math.round((totalScore / categoryCount) * 100) : 0;
    }

    calculateVitalsScore(vitals) {
        let score = 100;
        let factors = 0;

        if (vitals.lcp) {
            score += this.normalizeScore(this.thresholds.lcp.poor - vitals.lcp, 0, this.thresholds.lcp.poor - this.thresholds.lcp.good);
            factors++;
        }

        if (vitals.fid) {
            score += this.normalizeScore(this.thresholds.fid.poor - vitals.fid, 0, this.thresholds.fid.poor - this.thresholds.fid.good);
            factors++;
        }

        if (vitals.cls) {
            score += this.normalizeScore(this.thresholds.cls.poor - vitals.cls, 0, this.thresholds.cls.poor - this.thresholds.cls.good);
            factors++;
        }

        return factors > 0 ? score / factors : 100;
    }

    analyzeMetrics(data, requestId) {
        try {
            const analysis = {
                correlations: this.findCorrelations(data),
                patterns: this.identifyPatterns(data),
                outliers: this.detectOutliers(data),
                forecasts: this.generateForecasts(data)
            };

            this.sendResult(analysis, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    findCorrelations(data) {
        const correlations = [];

        // FPS vs Memory correlation
        if (data.fps && data.memory) {
            const correlation = this.calculateCorrelation(
                data.fps.map(d => d.fps || d.value || d),
                data.memory.map(d => d.used || d.value || d)
            );

            correlations.push({
                metrics: ['fps', 'memory'],
                correlation: correlation,
                strength: this.getCorrelationStrength(correlation),
                description: this.describeCorrelation('FPS', 'Memory Usage', correlation)
            });
        }

        // Network vs FPS correlation
        if (data.network && data.fps) {
            const networkLatencies = data.network.map(d => d.latency || d.rtt || d.duration || d);
            const fpsValues = data.fps.map(d => d.fps || d.value || d);
            
            if (networkLatencies.length > 0 && fpsValues.length > 0) {
                const correlation = this.calculateCorrelation(networkLatencies, fpsValues);
                correlations.push({
                    metrics: ['network_latency', 'fps'],
                    correlation: correlation,
                    strength: this.getCorrelationStrength(correlation),
                    description: this.describeCorrelation('Network Latency', 'FPS', correlation)
                });
            }
        }

        return correlations;
    }

    identifyPatterns(data) {
        const patterns = [];

        // Cyclical patterns in FPS
        if (data.fps && data.fps.length > 20) {
            const fpsPattern = this.detectCyclicalPattern(data.fps.map(d => d.fps || d.value || d));
            if (fpsPattern.detected) {
                patterns.push({
                    type: 'cyclical',
                    metric: 'fps',
                    period: fpsPattern.period,
                    strength: fpsPattern.strength,
                    description: `FPS shows cyclical pattern every ${fpsPattern.period} measurements`
                });
            }
        }

        // Memory growth patterns
        if (data.memory && data.memory.length > 10) {
            const memoryTrend = this.calculateTrend(data.memory.map(d => d.used || d.value || d));
            if (memoryTrend.slope > 1024 * 1024) { // Growing by more than 1MB per measurement
                patterns.push({
                    type: 'growth',
                    metric: 'memory',
                    rate: memoryTrend.slope,
                    confidence: memoryTrend.r2,
                    description: `Memory usage growing at ${(memoryTrend.slope / 1024 / 1024).toFixed(2)}MB per measurement`
                });
            }
        }

        return patterns;
    }

    detectOutliers(data) {
        const outliers = [];

        // FPS outliers
        if (data.fps) {
            const fpsValues = data.fps.map(d => d.fps || d.value || d);
            const fpsOutliers = this.findStatisticalOutliers(fpsValues);
            
            if (fpsOutliers.length > 0) {
                outliers.push({
                    metric: 'fps',
                    count: fpsOutliers.length,
                    values: fpsOutliers,
                    description: `${fpsOutliers.length} FPS outliers detected`
                });
            }
        }

        // Memory outliers
        if (data.memory) {
            const memoryValues = data.memory.map(d => d.used || d.value || d);
            const memoryOutliers = this.findStatisticalOutliers(memoryValues);
            
            if (memoryOutliers.length > 0) {
                outliers.push({
                    metric: 'memory',
                    count: memoryOutliers.length,
                    values: memoryOutliers,
                    description: `${memoryOutliers.length} memory usage outliers detected`
                });
            }
        }

        return outliers;
    }

    generateForecasts(data) {
        const forecasts = [];

        // Memory usage forecast
        if (data.memory && data.memory.length > 10) {
            const memoryValues = data.memory.map(d => d.used || d.value || d);
            const trend = this.calculateTrend(memoryValues);
            
            if (trend.r2 > 0.7) { // Good correlation
                const forecast = this.forecastNext(memoryValues, 10); // Next 10 points
                forecasts.push({
                    metric: 'memory',
                    forecast: forecast,
                    confidence: trend.r2,
                    description: `Memory usage forecast for next 10 measurements`
                });
            }
        }

        // FPS forecast
        if (data.fps && data.fps.length > 15) {
            const fpsValues = data.fps.map(d => d.fps || d.value || d);
            const trend = this.calculateTrend(fpsValues);
            
            if (trend.r2 > 0.5) {
                const forecast = this.forecastNext(fpsValues, 5);
                forecasts.push({
                    metric: 'fps',
                    forecast: forecast,
                    confidence: trend.r2,
                    description: `FPS forecast for next 5 measurements`
                });
            }
        }

        return forecasts;
    }

    detectAnomalies(data, requestId) {
        try {
            const anomalies = [];

            // Detect FPS anomalies
            if (data.fps) {
                const fpsAnomalies = this.detectFPSAnomalies(data.fps);
                anomalies.push(...fpsAnomalies);
            }

            // Detect memory anomalies
            if (data.memory) {
                const memoryAnomalies = this.detectMemoryAnomalies(data.memory);
                anomalies.push(...memoryAnomalies);
            }

            // Detect network anomalies
            if (data.network) {
                const networkAnomalies = this.detectNetworkAnomalies(data.network);
                anomalies.push(...networkAnomalies);
            }

            this.sendResult({ anomalies }, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    detectFPSAnomalies(fpsData) {
        const anomalies = [];
        const values = fpsData.map(d => d.fps || d.value || d);
        const mean = this.calculateAverage(values);
        const stdDev = this.calculateStandardDeviation(values);
        
        values.forEach((fps, index) => {
            const zScore = Math.abs((fps - mean) / stdDev);
            if (zScore > 2) { // More than 2 standard deviations
                anomalies.push({
                    type: 'fps_anomaly',
                    index: index,
                    value: fps,
                    expected: mean,
                    severity: zScore > 3 ? 'high' : 'medium',
                    description: `FPS dropped to ${fps.toFixed(1)} (expected ~${mean.toFixed(1)})`
                });
            }
        });

        return anomalies;
    }

    detectMemoryAnomalies(memoryData) {
        const anomalies = [];
        const values = memoryData.map(d => d.used || d.value || d);
        
        // Detect sudden memory spikes
        for (let i = 1; i < values.length; i++) {
            const increase = values[i] - values[i - 1];
            const percentIncrease = (increase / values[i - 1]) * 100;
            
            if (percentIncrease > 50) { // 50% increase
                anomalies.push({
                    type: 'memory_spike',
                    index: i,
                    value: values[i],
                    previousValue: values[i - 1],
                    increase: increase,
                    percentIncrease: percentIncrease,
                    severity: percentIncrease > 100 ? 'high' : 'medium',
                    description: `Memory spiked by ${(increase / 1024 / 1024).toFixed(2)}MB (${percentIncrease.toFixed(1)}%)`
                });
            }
        }

        return anomalies;
    }

    detectNetworkAnomalies(networkData) {
        const anomalies = [];
        const latencies = networkData
            .map(d => d.latency || d.rtt || d.duration || d)
            .filter(l => l > 0);
        
        if (latencies.length === 0) return anomalies;
        
        const mean = this.calculateAverage(latencies);
        const stdDev = this.calculateStandardDeviation(latencies);
        
        latencies.forEach((latency, index) => {
            const zScore = Math.abs((latency - mean) / stdDev);
            if (zScore > 2.5) { // More than 2.5 standard deviations
                anomalies.push({
                    type: 'network_anomaly',
                    index: index,
                    value: latency,
                    expected: mean,
                    severity: zScore > 3.5 ? 'high' : 'medium',
                    description: `Network latency spiked to ${latency.toFixed(1)}ms (expected ~${mean.toFixed(1)}ms)`
                });
            }
        });

        return anomalies;
    }

    calculatePerformanceScores(data, requestId) {
        try {
            const scores = {
                overall: this.calculateOverallScore(data),
                categories: {},
                breakdown: {}
            };

            // Category scores
            if (data.fps) {
                scores.categories.rendering = this.calculateRenderingScore(data.fps);
            }

            if (data.memory) {
                scores.categories.memory = this.calculateMemoryScore(data.memory);
            }

            if (data.network) {
                scores.categories.network = this.calculateNetworkScore(data.network);
            }

            if (data.vitals) {
                scores.categories.vitals = this.calculateVitalsScore(data.vitals);
            }

            // Detailed breakdown
            scores.breakdown = this.generateScoreBreakdown(data);

            this.sendResult(scores, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    calculateRenderingScore(fpsData) {
        const fpsStats = this.calculateFPSStats(fpsData);
        const smoothnessWeight = 0.6;
        const stabilityWeight = 0.4;
        
        const smoothnessScore = this.normalizeScore(
            fpsStats.average,
            this.thresholds.fps.poor,
            this.thresholds.fps.good
        );
        
        const stabilityScore = Math.max(0, 100 - (fpsStats.jankEvents * 10));
        
        return Math.round(
            (smoothnessScore * smoothnessWeight) + 
            (stabilityScore * stabilityWeight)
        );
    }

    calculateMemoryScore(memoryData) {
        const memoryStats = this.calculateMemoryStats(memoryData);
        const usageWeight = 0.7;
        const stabilityWeight = 0.3;
        
        const usageScore = this.normalizeScore(
            this.thresholds.memory.critical - memoryStats.peak,
            0,
            this.thresholds.memory.critical - this.thresholds.memory.warning
        );
        
        const stabilityScore = Math.max(0, 100 - (memoryStats.leakSuspicion * 100));
        
        return Math.round(
            (usageScore * usageWeight) + 
            (stabilityScore * stabilityWeight)
        );
    }

    calculateNetworkScore(networkData) {
        const networkStats = this.calculateNetworkStats(networkData);
        const latencyWeight = 0.6;
        const throughputWeight = 0.4;
        
        const latencyScore = this.normalizeScore(
            this.thresholds.network.verySlow - networkStats.averageLatency,
            0,
            this.thresholds.network.verySlow - this.thresholds.network.slow
        );
        
        // Simplified throughput score based on transfer size
        const throughputScore = Math.min(100, (networkStats.totalTransferSize / 1024 / 1024) * 10);
        
        return Math.round(
            (latencyScore * latencyWeight) + 
            (throughputScore * throughputWeight)
        );
    }

    generateScoreBreakdown(data) {
        const breakdown = {};

        if (data.fps) {
            const fpsStats = this.calculateFPSStats(data.fps);
            breakdown.fps = {
                smoothness: this.normalizeScore(fpsStats.average, this.thresholds.fps.poor, this.thresholds.fps.good),
                consistency: Math.max(0, 100 - (fpsStats.jankEvents * 10)),
                overall: this.calculateRenderingScore(data.fps)
            };
        }

        if (data.memory) {
            const memoryStats = this.calculateMemoryStats(data.memory);
            breakdown.memory = {
                usage: this.normalizeScore(
                    this.thresholds.memory.critical - memoryStats.peak,
                    0,
                    this.thresholds.memory.critical - this.thresholds.memory.warning
                ),
                stability: Math.max(0, 100 - (memoryStats.leakSuspicion * 100)),
                overall: this.calculateMemoryScore(data.memory)
            };
        }

        if (data.network) {
            const networkStats = this.calculateNetworkStats(data.network);
            breakdown.network = {
                latency: this.normalizeScore(
                    this.thresholds.network.verySlow - networkStats.averageLatency,
                    0,
                    this.thresholds.network.verySlow - this.thresholds.network.slow
                ),
                throughput: Math.min(100, (networkStats.totalTransferSize / 1024 / 1024) * 10),
                overall: this.calculateNetworkScore(data.network)
            };
        }

        return breakdown;
    }

    // Utility calculation methods
    calculateAverage(values) {
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    }

    calculateMedian(values) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }

    calculateStandardDeviation(values) {
        const mean = this.calculateAverage(values);
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = this.calculateAverage(squaredDiffs);
        return Math.sqrt(avgSquaredDiff);
    }

    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0) return 0;
        
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + (val * y[i]), 0);
        const sumXX = x.reduce((sum, val) => sum + (val * val), 0);
        const sumYY = y.reduce((sum, val) => sum + (val * val), 0);
        
        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt(((n * sumXX) - (sumX * sumX)) * ((n * sumYY) - (sumY * sumY)));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    calculateTrend(values) {
        if (values.length < 2) return { slope: 0, r2: 0 };
        
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + (val * values[i]), 0);
        const sumXX = x.reduce((sum, val) => sum + (val * val), 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        // Calculate R²
        const meanY = sumY / n;
        const ssRes = values.reduce((sum, val, i) => {
            const predicted = slope * i + (sumY - slope * sumX) / n;
            return sum + Math.pow(val - predicted, 2);
        }, 0);
        const ssTot = values.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
        const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
        
        return { slope, r2 };
    }

    normalizeScore(value, min, max) {
        if (max <= min) return 0;
        return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    }

    countJankEvents(fpsData) {
        return fpsData.filter(d => {
            const fps = d.fps || d.value || d;
            return fps < 30; // Consider below 30 FPS as jank
        }).length;
    }

    calculateSmoothnessScore(fpsValues) {
        if (fpsValues.length < 2) return 100;
        
        let totalVariation = 0;
        for (let i = 1; i < fpsValues.length; i++) {
            totalVariation += Math.abs(fpsValues[i] - fpsValues[i - 1]);
        }
        
        const avgVariation = totalVariation / (fpsValues.length - 1);
        return Math.max(0, 100 - (avgVariation * 2));
    }

    calculateGrowthRate(values) {
        if (values.length < 2) return 0;
        const trend = this.calculateTrend(values);
        return trend.slope;
    }

    detectMemoryLeakSuspicion(memoryValues) {
        if (memoryValues.length < 10) return 0;
        
        const trend = this.calculateTrend(memoryValues);
        const growthRate = trend.slope;
        const correlation = trend.r2;
        
        // Higher suspicion for consistent upward trend
        if (growthRate > 0 && correlation > 0.8) {
            return Math.min(1, correlation * (growthRate / (1024 * 1024))); // Normalize by 1MB
        }
        
        return 0;
    }

    detectCyclicalPattern(values) {
        if (values.length < 20) return { detected: false };
        
        // Simple autocorrelation-based cycle detection
        const maxLag = Math.floor(values.length / 4);
        let bestLag = 0;
        let bestCorrelation = 0;
        
        for (let lag = 2; lag <= maxLag; lag++) {
            const correlation = this.calculateLaggedCorrelation(values, lag);
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestLag = lag;
            }
        }
        
        return {
            detected: bestCorrelation > 0.6,
            period: bestLag,
            strength: bestCorrelation
        };
    }

    calculateLaggedCorrelation(values, lag) {
        if (lag >= values.length) return 0;
        
        const x = values.slice(0, values.length - lag);
        const y = values.slice(lag);
        
        return this.calculateCorrelation(x, y);
    }

    findStatisticalOutliers(values) {
        if (values.length < 4) return [];
        
        const mean = this.calculateAverage(values);
        const stdDev = this.calculateStandardDeviation(values);
        
        return values.filter(value => {
            const zScore = Math.abs((value - mean) / stdDev);
            return zScore > 2.5; // More than 2.5 standard deviations
        });
    }

    forecastNext(values, steps) {
        const trend = this.calculateTrend(values);
        const lastValue = values[values.length - 1];
        const lastIndex = values.length - 1;
        
        const forecast = [];
        for (let i = 1; i <= steps; i++) {
            const predictedValue = lastValue + (trend.slope * i);
            forecast.push({
                index: lastIndex + i,
                value: predictedValue,
                confidence: Math.max(0, trend.r2 - (i * 0.1)) // Decreasing confidence
            });
        }
        
        return forecast;
    }

    getCorrelationStrength(correlation) {
        const abs = Math.abs(correlation);
        if (abs >= 0.8) return 'strong';
        if (abs >= 0.5) return 'moderate';
        if (abs >= 0.3) return 'weak';
        return 'negligible';
    }

    describeCorrelation(metric1, metric2, correlation) {
        const strength = this.getCorrelationStrength(correlation);
        const direction = correlation > 0 ? 'positive' : 'negative';
        
        return `${strength} ${direction} correlation between ${metric1} and ${metric2}`;
    }

    // Worker-specific methods
    addToAnalysisQueue(data) {
        this.analysisQueue.push(data);
        
        // Prevent queue from growing too large
        if (this.analysisQueue.length > 100) {
            this.analysisQueue.shift();
        }
    }

    updateThresholds(newThresholds, requestId) {
        try {
            this.thresholds = { ...this.thresholds, ...newThresholds };
            this.sendResult({ updated: true }, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    processFPSData(data) {
        this.metrics.fps.push(...data);
        if (this.metrics.fps.length > 1000) {
            this.metrics.fps = this.metrics.fps.slice(-500);
        }
    }

    processMemoryData(data) {
        this.metrics.memory.push(...data);
        if (this.metrics.memory.length > 1000) {
            this.metrics.memory = this.metrics.memory.slice(-500);
        }
    }

    processNetworkData(data) {
        this.metrics.network.push(...data);
        if (this.metrics.network.length > 1000) {
            this.metrics.network = this.metrics.network.slice(-500);
        }
    }

    processResourceData(data) {
        this.metrics.resources.push(...data);
        if (this.metrics.resources.length > 1000) {
            this.metrics.resources = this.metrics.resources.slice(-500);
        }
    }

    processWebVitals(data, requestId) {
        try {
            const analysis = {
                scores: this.calculateVitalsScore(data),
                issues: this.analyzeWebVitalsIssues(data),
                recommendations: this.generateVitalsRecommendations(data),
                trends: this.analyzeVitalsTrends(data)
            };

            this.sendResult(analysis, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    generateVitalsRecommendations(vitals) {
        const recommendations = [];

        if (vitals.lcp > this.thresholds.lcp.good) {
            recommendations.push({
                metric: 'LCP',
                priority: vitals.lcp > this.thresholds.lcp.poor ? 'high' : 'medium',
                suggestions: [
                    'Optimize server response times',
                    'Preload important resources',
                    'Optimize images and text rendering'
                ]
            });
        }

        if (vitals.fid > this.thresholds.fid.good) {
            recommendations.push({
                metric: 'FID',
                priority: vitals.fid > this.thresholds.fid.poor ? 'high' : 'medium',
                suggestions: [
                    'Reduce JavaScript execution time',
                    'Code splitting and lazy loading',
                    'Use web workers for heavy tasks'
                ]
            });
        }

        if (vitals.cls > this.thresholds.cls.good) {
            recommendations.push({
                metric: 'CLS',
                priority: vitals.cls > this.thresholds.cls.poor ? 'high' : 'medium',
                suggestions: [
                    'Set explicit dimensions for images',
                    'Reserve space for dynamic content',
                    'Avoid inserting content above existing content'
                ]
            });
        }

        return recommendations;
    }

    analyzeVitalsTrends(vitals) {
        // This would typically analyze historical vitals data
        // For now, return basic trend analysis
        return {
            lcp: { trend: 'stable', change: 0 },
            fid: { trend: 'stable', change: 0 },
            cls: { trend: 'stable', change: 0 }
        };
    }

    analyzeTrends(data, requestId) {
        try {
            const trends = {};

            Object.keys(data).forEach(metric => {
                if (Array.isArray(data[metric]) && data[metric].length > 5) {
                    const values = data[metric].map(d => d.value || d);
                    const trend = this.calculateTrend(values);
                    
                    trends[metric] = {
                        direction: trend.slope > 0 ? 'increasing' : trend.slope < 0 ? 'decreasing' : 'stable',
                        slope: trend.slope,
                        confidence: trend.r2,
                        strength: this.getTrendStrength(trend.r2),
                        forecast: this.forecastNext(values, 5)
                    };
                }
            });

            this.sendResult({ trends }, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    getTrendStrength(r2) {
        if (r2 >= 0.8) return 'strong';
        if (r2 >= 0.6) return 'moderate';
        if (r2 >= 0.4) return 'weak';
        return 'negligible';
    }

    generateRecommendations(data, requestId) {
        try {
            const recommendations = this.suggestOptimizations(data);
            this.sendResult({ recommendations }, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    analyzeBenchmarks(data, requestId) {
        try {
            const analysis = {
                summary: this.generateBenchmarkSummary(data),
                comparisons: this.compareBenchmarks(data),
                insights: this.generateBenchmarkInsights(data)
            };

            this.sendResult(analysis, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    generateBenchmarkSummary(data) {
        const { benchmarks } = data;
        
        return {
            total: benchmarks.length,
            fastest: benchmarks.reduce((min, b) => b.duration < min.duration ? b : min),
            slowest: benchmarks.reduce((max, b) => b.duration > max.duration ? b : max),
            average: this.calculateAverage(benchmarks.map(b => b.duration))
        };
    }

    compareBenchmarks(data) {
        const { benchmarks, baseline } = data;
        
        return benchmarks.map(benchmark => ({
            name: benchmark.name,
            duration: benchmark.duration,
            baseline: baseline ? baseline[benchmark.name] : null,
            improvement: baseline && baseline[benchmark.name] ? 
                ((baseline[benchmark.name] - benchmark.duration) / baseline[benchmark.name]) * 100 : null
        }));
    }

    generateBenchmarkInsights(data) {
        const insights = [];
        const { benchmarks } = data;
        
        const durations = benchmarks.map(b => b.duration);
        const mean = this.calculateAverage(durations);
        const stdDev = this.calculateStandardDeviation(durations);
        
        benchmarks.forEach(benchmark => {
            const zScore = Math.abs((benchmark.duration - mean) / stdDev);
            
            if (zScore > 2) {
                insights.push({
                    type: benchmark.duration > mean ? 'slow_benchmark' : 'fast_benchmark',
                    benchmark: benchmark.name,
                    duration: benchmark.duration,
                    deviation: zScore,
                    description: `${benchmark.name} is ${zScore.toFixed(1)} standard deviations from average`
                });
            }
        });
        
        return insights;
    }

    sendResult(data, requestId) {
        self.postMessage({
            type: 'RESULT',
            data,
            requestId
        });
    }

    sendError(message, requestId) {
        self.postMessage({
            type: 'ERROR',
            error: message,
            requestId
        });
    }
}

// Initialize the worker
const worker = new PerformanceMonitorWorker();

// Handle uncaught errors
self.addEventListener('error', (event) => {
    self.postMessage({
        type: 'ERROR',
        error: `Worker error: ${event.message}`
    });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    self.postMessage({
        type: 'ERROR',
        error: `Worker promise rejection: ${event.reason}`
    });
});