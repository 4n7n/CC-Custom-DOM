/**
 * Impact Measurement Module
 * Measures the impact and effectiveness of features, content, and user actions
 */

class ImpactMeasurement {
    constructor() {
        this.impactMetrics = new Map();
        this.experiments = new Map();
        this.businessMetrics = new Map();
        this.cohortAnalysis = new Map();
        this.featureImpact = new Map();
        this.baselineMetrics = {};
        this.sessionStart = Date.now();
        
        this.init();
    }

    init() {
        this.setupImpactTracking();
        this.initializeBaselines();
        this.setupExperimentTracking();
        this.loadStoredData();
    }

    setupImpactTracking() {
        // Feature usage tracking
        document.addEventListener('featureUsed', (e) => {
            this.trackFeatureImpact(e.detail);
        });

        // Business metric events
        document.addEventListener('businessEvent', (e) => {
            this.trackBusinessMetric(e.detail);
        });

        // A/B test events
        document.addEventListener('experimentEvent', (e) => {
            this.trackExperiment(e.detail);
        });

        // Performance impact
        this.trackPerformanceImpact();
        
        // User satisfaction tracking
        document.addEventListener('feedbackSubmitted', (e) => {
            this.trackUserSatisfaction(e.detail);
        });
    }

    initializeBaselines() {
        this.baselineMetrics = {
            engagement: {
                sessionDuration: 0,
                pageViews: 0,
                interactions: 0,
                bounceRate: 0
            },
            performance: {
                loadTime: 0,
                interactionTime: 0,
                errorRate: 0,
                conversionRate: 0
            },
            business: {
                signups: 0,
                purchases: 0,
                revenue: 0,
                retention: 0
            },
            satisfaction: {
                nps: 0,
                csat: 0,
                taskCompletion: 0,
                errorRecovery: 0
            }
        };
    }

    trackFeatureImpact(featureData) {
        const { featureName, action, value, metadata } = featureData;
        
        if (!this.featureImpact.has(featureName)) {
            this.featureImpact.set(featureName, {
                usage: {
                    totalUses: 0,
                    uniqueUsers: new Set(),
                    sessions: new Set(),
                    firstUse: Date.now(),
                    lastUse: null
                },
                impact: {
                    engagement: { before: 0, after: 0, change: 0 },
                    conversion: { before: 0, after: 0, change: 0 },
                    satisfaction: { before: 0, after: 0, change: 0 },
                    performance: { before: 0, after: 0, change: 0 }
                },
                outcomes: {
                    positive: 0,
                    negative: 0,
                    neutral: 0
                }
            });
        }

        const feature = this.featureImpact.get(featureName);
        feature.usage.totalUses++;
        feature.usage.uniqueUsers.add(this.getUserId());
        feature.usage.sessions.add(this.getSessionId());
        feature.usage.lastUse = Date.now();

        // Measure immediate impact
        this.measureImmediateImpact(featureName, action, value, metadata);
    }

    measureImmediateImpact(featureName, action, value, metadata) {
        const feature = this.featureImpact.get(featureName);
        const beforeMetrics = this.getCurrentMetrics();
        
        setTimeout(() => {
            const afterMetrics = this.getCurrentMetrics();
            this.calculateImpactChange(feature, beforeMetrics, afterMetrics);
        }, 5000); // Measure impact after 5 seconds
    }

    calculateImpactChange(feature, before, after) {
        const categories = ['engagement', 'conversion', 'satisfaction', 'performance'];
        
        categories.forEach(category => {
            if (before[category] && after[category]) {
                const beforeValue = this.normalizeMetric(before[category]);
                const afterValue = this.normalizeMetric(after[category]);
                const change = ((afterValue - beforeValue) / beforeValue) * 100;
                
                feature.impact[category].before = beforeValue;
                feature.impact[category].after = afterValue;
                feature.impact[category].change = change;
                
                // Categorize outcome
                if (change > 5) feature.outcomes.positive++;
                else if (change < -5) feature.outcomes.negative++;
                else feature.outcomes.neutral++;
            }
        });
    }

    normalizeMetric(metricObj) {
        // Normalize different metric types to comparable scale (0-100)
        if (typeof metricObj === 'number') return metricObj;
        
        const keys = Object.keys(metricObj);
        const average = keys.reduce((sum, key) => sum + metricObj[key], 0) / keys.length;
        return Math.min(average, 100);
    }

    trackBusinessMetric(eventData) {
        const { metric, value, category, timestamp = Date.now() } = eventData;
        
        if (!this.businessMetrics.has(metric)) {
            this.businessMetrics.set(metric, {
                values: [],
                category,
                impact: {
                    total: 0,
                    average: 0,
                    trend: 'stable',
                    baseline: 0
                },
                correlations: new Map()
            });
        }

        const businessMetric = this.businessMetrics.get(metric);
        businessMetric.values.push({ value, timestamp });
        
        // Keep only last 100 values for performance
        if (businessMetric.values.length > 100) {
            businessMetric.values.shift();
        }

        this.updateBusinessImpact(metric, businessMetric);
    }

    updateBusinessImpact(metricName, businessMetric) {
        const values = businessMetric.values.map(v => v.value);
        
        businessMetric.impact.total = values.reduce((sum, val) => sum + val, 0);
        businessMetric.impact.average = businessMetric.impact.total / values.length;
        
        // Calculate trend
        if (values.length >= 5) {
            const recent = values.slice(-5);
            const older = values.slice(-10, -5);
            
            if (older.length > 0) {
                const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
                const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
                const change = ((recentAvg - olderAvg) / olderAvg) * 100;
                
                if (change > 10) businessMetric.impact.trend = 'increasing';
                else if (change < -10) businessMetric.impact.trend = 'decreasing';
                else businessMetric.impact.trend = 'stable';
            }
        }

        // Update baseline if first time or significant change
        if (businessMetric.impact.baseline === 0 || values.length === 1) {
            businessMetric.impact.baseline = businessMetric.impact.average;
        }
    }

    setupExperimentTracking() {
        this.createExperiment('homepage_redesign', {
            variants: ['control', 'variant_a', 'variant_b'],
            metrics: ['engagement', 'conversion', 'bounce_rate'],
            startDate: Date.now(),
            duration: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        this.createExperiment('cta_optimization', {
            variants: ['original', 'new_copy', 'new_color'],
            metrics: ['click_rate', 'conversion'],
            startDate: Date.now(),
            duration: 5 * 24 * 60 * 60 * 1000 // 5 days
        });
    }

    createExperiment(name, config) {
        const experiment = {
            name,
            config,
            variants: new Map(),
            results: {
                statistical_significance: false,
                confidence_level: 0,
                winner: null,
                impact: {}
            }
        };

        // Initialize variants
        config.variants.forEach(variant => {
            experiment.variants.set(variant, {
                users: new Set(),
                metrics: new Map(),
                events: []
            });
        });

        this.experiments.set(name, experiment);
    }

    trackExperiment(experimentData) {
        const { experimentName, variant, metric, value, userId } = experimentData;
        const experiment = this.experiments.get(experimentName);
        
        if (!experiment) return;

        const variantData = experiment.variants.get(variant);
        if (!variantData) return;

        variantData.users.add(userId || this.getUserId());
        
        if (!variantData.metrics.has(metric)) {
            variantData.metrics.set(metric, []);
        }
        
        variantData.metrics.get(metric).push({
            value,
            timestamp: Date.now(),
            userId: userId || this.getUserId()
        });

        variantData.events.push({
            metric,
            value,
            timestamp: Date.now(),
            userId: userId || this.getUserId()
        });

        this.analyzeExperimentResults(experimentName);
    }

    analyzeExperimentResults(experimentName) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment) return;

        const results = {};
        
        // Calculate metrics for each variant
        experiment.variants.forEach((variantData, variantName) => {
            results[variantName] = {};
            
            variantData.metrics.forEach((values, metric) => {
                const metricValues = values.map(v => v.value);
                results[variantName][metric] = {
                    count: metricValues.length,
                    sum: metricValues.reduce((sum, val) => sum + val, 0),
                    average: metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length,
                    users: variantData.users.size
                };
            });
        });

        // Statistical significance testing
        this.calculateStatisticalSignificance(experiment, results);
        
        // Determine winner
        this.determineExperimentWinner(experiment, results);
    }

    calculateStatisticalSignificance(experiment, results) {
        const variants = Array.from(experiment.variants.keys());
        if (variants.length < 2) return;

        const control = results[variants[0]];
        const variant = results[variants[1]];
        
        // Simple z-test for conversion rates
        const primaryMetric = experiment.config.metrics[0];
        
        if (control[primaryMetric] && variant[primaryMetric]) {
            const p1 = control[primaryMetric].average;
            const n1 = control[primaryMetric].users;
            const p2 = variant[primaryMetric].average;
            const n2 = variant[primaryMetric].users;
            
            if (n1 > 30 && n2 > 30) { // Minimum sample size
                const pooled_p = (p1 * n1 + p2 * n2) / (n1 + n2);
                const se = Math.sqrt(pooled_p * (1 - pooled_p) * (1/n1 + 1/n2));
                const z_score = Math.abs((p1 - p2) / se);
                
                // 95% confidence level (z > 1.96)
                experiment.results.statistical_significance = z_score > 1.96;
                experiment.results.confidence_level = this.zScoreToConfidence(z_score);
            }
        }
    }

    zScoreToConfidence(zScore) {
        // Simplified conversion for common z-scores
        if (zScore > 2.576) return 99;
        if (zScore > 1.96) return 95;
        if (zScore > 1.645) return 90;
        if (zScore > 1.282) return 80;
        return 0;
    }

    determineExperimentWinner(experiment, results) {
        const primaryMetric = experiment.config.metrics[0];
        let bestVariant = null;
        let bestValue = -Infinity;

        Object.entries(results).forEach(([variant, data]) => {
            if (data[primaryMetric] && data[primaryMetric].average > bestValue) {
                bestValue = data[primaryMetric].average;
                bestVariant = variant;
            }
        });

        experiment.results.winner = bestVariant;
        
        // Calculate impact
        const variants = Object.keys(results);
        if (variants.length >= 2) {
            const control = results[variants[0]][primaryMetric];
            const winner = results[bestVariant][primaryMetric];
            
            if (control && winner) {
                const improvement = ((winner.average - control.average) / control.average) * 100;
                experiment.results.impact = {
                    improvement,
                    metric: primaryMetric,
                    significant: experiment.results.statistical_significance
                };
            }
        }
    }

    trackPerformanceImpact() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                this.analyzePerformanceImpact(entry);
            });
        });

        observer.observe({ entryTypes: ['navigation', 'measure', 'paint'] });
    }

    analyzePerformanceImpact(entry) {
        const impact = {
            type: entry.entryType,
            name: entry.name,
            duration: entry.duration,
            timestamp: Date.now()
        };

        // Correlate with user actions
        const recentActions = this.getRecentUserActions();
        if (recentActions.length > 0) {
            impact.correlatedActions = recentActions;
            this.measureActionImpact(recentActions, entry);
        }

        this.addToImpactLog('performance', impact);
    }

    measureActionImpact(actions, performanceEntry) {
        actions.forEach(action => {
            if (action.feature) {
                const feature = this.featureImpact.get(action.feature);
                if (feature) {
                    if (!feature.impact.performance) {
                        feature.impact.performance = { entries: [] };
                    }
                    feature.impact.performance.entries.push({
                        duration: performanceEntry.duration,
                        type: performanceEntry.entryType,
                        timestamp: Date.now()
                    });
                }
            }
        });
    }

    trackUserSatisfaction(feedbackData) {
        const satisfaction = {
            type: feedbackData.type, // nps, csat, feedback
            score: feedbackData.score,
            comment: feedbackData.comment,
            context: feedbackData.context,
            timestamp: Date.now()
        };

        this.addToImpactLog('satisfaction', satisfaction);
        this.correlateSatisfactionWithFeatures(satisfaction);
    }

    correlateSatisfactionWithFeatures(satisfaction) {
        const recentFeatureUses = this.getRecentFeatureUses();
        
        recentFeatureUses.forEach(featureUse => {
            const feature = this.featureImpact.get(featureUse.feature);
            if (feature) {
                if (!feature.satisfaction) {
                    feature.satisfaction = { scores: [], average: 0 };
                }
                feature.satisfaction.scores.push(satisfaction.score);
                feature.satisfaction.average = 
                    feature.satisfaction.scores.reduce((sum, score) => sum + score, 0) / 
                    feature.satisfaction.scores.length;
            }
        });
    }

    getCurrentMetrics() {
        return {
            engagement: {
                sessionDuration: Date.now() - this.sessionStart,
                interactions: this.getUserInteractionCount(),
                scrollDepth: this.getCurrentScrollDepth()
            },
            performance: {
                loadTime: performance.now(),
                memoryUsage: performance.memory?.usedJSHeapSize || 0
            }
        };
    }

    getRecentUserActions(timeWindow = 5000) {
        const recent = [];
        const cutoff = Date.now() - timeWindow;
        
        // Get from various tracking modules
        if (window.engagementMetrics) {
            const events = window.engagementMetrics.engagementEvents || [];
            recent.push(...events.filter(e => e.timestamp > cutoff));
        }
        
        return recent;
    }

    getRecentFeatureUses(timeWindow = 30000) {
        const recent = [];
        const cutoff = Date.now() - timeWindow;
        
        this.featureImpact.forEach((feature, featureName) => {
            if (feature.usage.lastUse && feature.usage.lastUse > cutoff) {
                recent.push({ feature: featureName, lastUse: feature.usage.lastUse });
            }
        });
        
        return recent;
    }

    addToImpactLog(category, data) {
        if (!this.impactMetrics.has(category)) {
            this.impactMetrics.set(category, []);
        }
        
        const log = this.impactMetrics.get(category);
        log.push(data);
        
        // Keep only last 100 entries
        if (log.length > 100) {
            log.shift();
        }
    }

    getUserInteractionCount() {
        return document.querySelectorAll('[data-tracked]').length;
    }

    getCurrentScrollDepth() {
        const scrollTop = window.pageYOffset;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        return Math.round((scrollTop / scrollHeight) * 100);
    }

    getUserId() {
        return localStorage.getItem('userId') || 'anonymous';
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('impactSessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('impactSessionId', sessionId);
        }
        return sessionId;
    }

    getImpactReport() {
        return {
            summary: {
                totalFeatures: this.featureImpact.size,
                totalExperiments: this.experiments.size,
                activeExperiments: Array.from(this.experiments.values()).filter(exp => 
                    Date.now() < exp.config.startDate + exp.config.duration
                ).length
            },
            featureImpact: this.getFeatureImpactSummary(),
            experimentResults: this.getExperimentSummary(),
            businessMetrics: this.getBusinessMetricsSummary(),
            recommendations: this.generateRecommendations()
        };
    }

    getFeatureImpactSummary() {
        const summary = {};
        
        this.featureImpact.forEach((feature, name) => {
            summary[name] = {
                usage: {
                    totalUses: feature.usage.totalUses,
                    uniqueUsers: feature.usage.uniqueUsers.size,
                    adoptionRate: (feature.usage.uniqueUsers.size / this.getTotalUsers()) * 100
                },
                impact: feature.impact,
                satisfaction: feature.satisfaction?.average || 0,
                overallScore: this.calculateFeatureScore(feature)
            };
        });
        
        return summary;
    }

    getExperimentSummary() {
        const summary = {};
        
        this.experiments.forEach((experiment, name) => {
            summary[name] = {
                status: this.getExperimentStatus(experiment),
                results: experiment.results,
                participants: this.getExperimentParticipants(experiment)
            };
        });
        
        return summary;
    }

    getBusinessMetricsSummary() {
        const summary = {};
        
        this.businessMetrics.forEach((metric, name) => {
            summary[name] = {
                current: metric.impact.average,
                trend: metric.impact.trend,
                change: ((metric.impact.average - metric.impact.baseline) / metric.impact.baseline) * 100
            };
        });
        
        return summary;
    }

    calculateFeatureScore(feature) {
        const weights = {
            usage: 0.3,
            impact: 0.4,
            satisfaction: 0.3
        };
        
        const usageScore = Math.min((feature.usage.totalUses / 100) * 100, 100);
        const impactScore = this.calculateAverageImpact(feature.impact);
        const satisfactionScore = (feature.satisfaction?.average || 0) * 10;
        
        return Math.round(
            (usageScore * weights.usage) +
            (impactScore * weights.impact) +
            (satisfactionScore * weights.satisfaction)
        );
    }

    calculateAverageImpact(impact) {
        const changes = Object.values(impact).map(i => i.change || 0);
        const average = changes.reduce((sum, change) => sum + change, 0) / changes.length;
        return Math.max(0, Math.min(100, 50 + average)); // Normalize to 0-100 scale
    }

    getExperimentStatus(experiment) {
        const now = Date.now();
        const endTime = experiment.config.startDate + experiment.config.duration;
        
        if (now < experiment.config.startDate) return 'scheduled';
        if (now > endTime) return 'completed';
        return 'running';
    }

    getExperimentParticipants(experiment) {
        let total = 0;
        experiment.variants.forEach(variant => {
            total += variant.users.size;
        });
        return total;
    }

    getTotalUsers() {
        const allUsers = new Set();
        this.featureImpact.forEach(feature => {
            feature.usage.uniqueUsers.forEach(user => allUsers.add(user));
        });
        return allUsers.size || 1; // Avoid division by zero
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Feature recommendations
        this.featureImpact.forEach((feature, name) => {
            const score = this.calculateFeatureScore(feature);
            
            if (score < 30) {
                recommendations.push({
                    type: 'feature_improvement',
                    priority: 'high',
                    feature: name,
                    issue: `Low feature score (${score}/100)`,
                    recommendation: 'Consider redesigning or removing this feature'
                });
            }
            
            if (feature.usage.uniqueUsers.size < this.getTotalUsers() * 0.1) {
                recommendations.push({
                    type: 'feature_adoption',
                    priority: 'medium',
                    feature: name,
                    issue: 'Low adoption rate',
                    recommendation: 'Improve feature discoverability and onboarding'
                });
            }
        });
        
        // Experiment recommendations
        this.experiments.forEach((experiment, name) => {
            if (this.getExperimentStatus(experiment) === 'completed') {
                if (experiment.results.statistical_significance) {
                    recommendations.push({
                        type: 'experiment_action',
                        priority: 'high',
                        experiment: name,
                        issue: 'Significant results available',
                        recommendation: `Implement winning variant: ${experiment.results.winner}`
                    });
                } else {
                    recommendations.push({
                        type: 'experiment_continue',
                        priority: 'medium',
                        experiment: name,
                        issue: 'Inconclusive results',
                        recommendation: 'Run longer or with larger sample size'
                    });
                }
            }
        });
        
        // Business metric recommendations
        this.businessMetrics.forEach((metric, name) => {
            if (metric.impact.trend === 'decreasing') {
                recommendations.push({
                    type: 'business_metric',
                    priority: 'high',
                    metric: name,
                    issue: 'Declining trend detected',
                    recommendation: 'Investigate root cause and implement improvements'
                });
            }
        });
        
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    loadStoredData() {
        const stored = localStorage.getItem('impactMeasurementData');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.businessMetrics) {
                    this.businessMetrics = new Map(data.businessMetrics);
                }
                if (data.baselineMetrics) {
                    this.baselineMetrics = data.baselineMetrics;
                }
            } catch (e) {
                console.warn('Failed to load impact measurement data:', e);
            }
        }
    }

    saveData() {
        const data = {
            businessMetrics: Array.from(this.businessMetrics.entries()),
            baselineMetrics: this.baselineMetrics,
            timestamp: Date.now()
        };
        
        localStorage.setItem('impactMeasurementData', JSON.stringify(data));
    }

    exportData() {
        return {
            impactMetrics: Array.from(this.impactMetrics.entries()),
            experiments: Array.from(this.experiments.entries()),
            businessMetrics: Array.from(this.businessMetrics.entries()),
            featureImpact: Array.from(this.featureImpact.entries()),
            baselineMetrics: this.baselineMetrics,
            report: this.getImpactReport(),
            timestamp: Date.now()
        };
    }

    // Public API methods
    trackFeature(featureName, action, value, metadata = {}) {
        const event = new CustomEvent('featureUsed', {
            detail: { featureName, action, value, metadata }
        });
        document.dispatchEvent(event);
    }

    trackBusinessEvent(metric, value, category) {
        const event = new CustomEvent('businessEvent', {
            detail: { metric, value, category }
        });
        document.dispatchEvent(event);
    }

    joinExperiment(experimentName, variant, userId = null) {
        const event = new CustomEvent('experimentEvent', {
            detail: { 
                experimentName, 
                variant, 
                metric: 'join', 
                value: 1, 
                userId: userId || this.getUserId() 
            }
        });
        document.dispatchEvent(event);
    }

    trackExperimentMetric(experimentName, variant, metric, value, userId = null) {
        const event = new CustomEvent('experimentEvent', {
            detail: { 
                experimentName, 
                variant, 
                metric, 
                value, 
                userId: userId || this.getUserId() 
            }
        });
        document.dispatchEvent(event);
    }

    submitFeedback(type, score, comment = '', context = {}) {
        const event = new CustomEvent('feedbackSubmitted', {
            detail: { type, score, comment, context }
        });
        document.dispatchEvent(event);
    }

    reset() {
        this.impactMetrics.clear();
        this.experiments.clear();
        this.businessMetrics.clear();
        this.cohortAnalysis.clear();
        this.featureImpact.clear();
        this.initializeBaselines();
        this.sessionStart = Date.now();
        localStorage.removeItem('impactMeasurementData');
    }
}

// Auto-initialize
const impactMeasurement = new ImpactMeasurement();

// Auto-save every 60 seconds
setInterval(() => {
    impactMeasurement.saveData();
}, 60000);

export default impactMeasurement;