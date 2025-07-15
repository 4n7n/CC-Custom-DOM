/**
 * Performance Budget Module
 * Manages performance budgets, monitoring, and alerts
 */

class PerformanceBudget {
    constructor() {
        this.budgets = new Map();
        this.violations = [];
        this.alerts = new Map();
        this.monitoring = new Map();
        this.history = [];
        this.isMonitoring = false;
        this.domCheckTimeout = null;
        
        this.defaultBudgets = {
            vitals: {
                'largest-contentful-paint': { target: 2500, warning: 2000, unit: 'ms' },
                'first-input-delay': { target: 100, warning: 80, unit: 'ms' },
                'cumulative-layout-shift': { target: 0.1, warning: 0.05, unit: 'score' },
                'first-contentful-paint': { target: 1800, warning: 1500, unit: 'ms' },
                'time-to-interactive': { target: 3800, warning: 3000, unit: 'ms' },
                'total-blocking-time': { target: 200, warning: 150, unit: 'ms' }
            },
            
            resources: {
                'total-size': { target: 1600000, warning: 1400000, unit: 'bytes' },
                'javascript-size': { target: 500000, warning: 400000, unit: 'bytes' },
                'css-size': { target: 100000, warning: 80000, unit: 'bytes' },
                'image-size': { target: 800000, warning: 600000, unit: 'bytes' },
                'font-size': { target: 100000, warning: 80000, unit: 'bytes' },
                'third-party-size': { target: 500000, warning: 400000, unit: 'bytes' }
            },
            
            counts: {
                'dom-elements': { target: 1500, warning: 1200, unit: 'count' },
                'script-count': { target: 10, warning: 8, unit: 'count' },
                'stylesheet-count': { target: 5, warning: 4, unit: 'count' },
                'font-count': { target: 4, warning: 3, unit: 'count' },
                'third-party-requests': { target: 20, warning: 15, unit: 'count' }
            },
            
            timing: {
                'dns-lookup': { target: 200, warning: 150, unit: 'ms' },
                'tcp-connection': { target: 200, warning: 150, unit: 'ms' },
                'server-response': { target: 500, warning: 300, unit: 'ms' },
                'dom-content-loaded': { target: 2000, warning: 1500, unit: 'ms' },
                'load-complete': { target: 3000, warning: 2500, unit: 'ms' }
            }
        };
        
        this.settings = {
            monitoringInterval: 30000,
            alertThreshold: 3,
            retainHistory: 100,
            enableAlerts: true,
            autoOptimize: false,
            strictMode: false
        };
        
        this.init();
    }

    init() {
        this.loadDefaultBudgets();
        this.setupMonitoring();
        this.loadStoredBudgets();
        this.startMonitoring();
    }

    loadDefaultBudgets() {
        Object.entries(this.defaultBudgets).forEach(([category, budgets]) => {
            this.budgets.set(category, new Map(Object.entries(budgets)));
        });
    }

    setupMonitoring() {
        this.setupVitalsMonitoring();
        this.setupResourceMonitoring();
        this.setupTimingMonitoring();
        this.setupDOMMonitoring();
    }

    setupVitalsMonitoring() {
        if ('PerformanceObserver' in window) {
            // LCP Observer
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.checkBudget('vitals', 'largest-contentful-paint', lastEntry.startTime);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.monitoring.set('lcp', lcpObserver);
            } catch (e) {
                console.warn('LCP monitoring not supported:', e);
            }

            // FID Observer
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        const fid = entry.processingStart - entry.startTime;
                        this.checkBudget('vitals', 'first-input-delay', fid);
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
                this.monitoring.set('fid', fidObserver);
            } catch (e) {
                console.warn('FID monitoring not supported:', e);
            }

            // CLS Observer
            try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                            this.checkBudget('vitals', 'cumulative-layout-shift', clsValue);
                        }
                    });
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.monitoring.set('cls', clsObserver);
            } catch (e) {
                console.warn('CLS monitoring not supported:', e);
            }

            // Paint timing
            try {
                const paintObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.name === 'first-contentful-paint') {
                            this.checkBudget('vitals', 'first-contentful-paint', entry.startTime);
                        }
                    });
                });
                paintObserver.observe({ entryTypes: ['paint'] });
                this.monitoring.set('paint', paintObserver);
            } catch (e) {
                console.warn('Paint timing monitoring not supported:', e);
            }
        }
    }

    setupResourceMonitoring() {
        if ('PerformanceObserver' in window) {
            const resourceObserver = new PerformanceObserver(() => {
                this.analyzeResourceBudgets();
            });
            
            try {
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.monitoring.set('resource', resourceObserver);
            } catch (e) {
                console.warn('Resource monitoring not supported:', e);
            }
        }
    }

    setupTimingMonitoring() {
        window.addEventListener('load', () => {
            this.analyzeTimingBudgets();
        });
    }

    setupDOMMonitoring() {
        if ('MutationObserver' in window) {
            const domObserver = new MutationObserver(() => {
                clearTimeout(this.domCheckTimeout);
                this.domCheckTimeout = setTimeout(() => {
                    this.analyzeDOMBudgets();
                }, 1000);
            });
            
            domObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            this.monitoring.set('dom', domObserver);
        }
    }

    analyzeResourceBudgets() {
        if (!('getEntriesByType' in performance)) return;
        
        const resources = performance.getEntriesByType('resource');
        const analysis = {
            totalSize: 0,
            javascriptSize: 0,
            cssSize: 0,
            imageSize: 0,
            fontSize: 0,
            thirdPartySize: 0,
            scriptCount: 0,
            stylesheetCount: 0,
            fontCount: 0,
            thirdPartyRequests: 0
        };
        
        resources.forEach(resource => {
            const size = resource.transferSize || resource.decodedBodySize || 0;
            analysis.totalSize += size;
            
            const isThirdParty = this.isThirdParty(resource.name);
            if (isThirdParty) {
                analysis.thirdPartySize += size;
                analysis.thirdPartyRequests++;
            }
            
            if (resource.name.match(/\.js(\?|$)/)) {
                analysis.javascriptSize += size;
                analysis.scriptCount++;
            } else if (resource.name.match(/\.css(\?|$)/)) {
                analysis.cssSize += size;
                analysis.stylesheetCount++;
            } else if (resource.name.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/)) {
                analysis.imageSize += size;
            } else if (resource.name.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)) {
                analysis.fontSize += size;
                analysis.fontCount++;
            }
        });
        
        // Check resource budgets
        this.checkBudget('resources', 'total-size', analysis.totalSize);
        this.checkBudget('resources', 'javascript-size', analysis.javascriptSize);
        this.checkBudget('resources', 'css-size', analysis.cssSize);
        this.checkBudget('resources', 'image-size', analysis.imageSize);
        this.checkBudget('resources', 'font-size', analysis.fontSize);
        this.checkBudget('resources', 'third-party-size', analysis.thirdPartySize);
        
        this.checkBudget('counts', 'script-count', analysis.scriptCount);
        this.checkBudget('counts', 'stylesheet-count', analysis.stylesheetCount);
        this.checkBudget('counts', 'font-count', analysis.fontCount);
        this.checkBudget('counts', 'third-party-requests', analysis.thirdPartyRequests);
    }

    analyzeTimingBudgets() {
        if (!('getEntriesByType' in performance)) return;
        
        const navigation = performance.getEntriesByType('navigation')[0];
        if (!navigation) return;
        
        const timing = {
            'dns-lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
            'tcp-connection': navigation.connectEnd - navigation.connectStart,
            'server-response': navigation.responseEnd - navigation.responseStart,
            'dom-content-loaded': navigation.domContentLoadedEventEnd - navigation.navigationStart,
            'load-complete': navigation.loadEventEnd - navigation.navigationStart
        };
        
        Object.entries(timing).forEach(([metric, value]) => {
            this.checkBudget('timing', metric, value);
        });
    }

    analyzeDOMBudgets() {
        const domElements = document.querySelectorAll('*').length;
        this.checkBudget('counts', 'dom-elements', domElements);
    }

    isThirdParty(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.origin !== window.location.origin;
        } catch {
            return false;
        }
    }

    checkBudget(category, metric, value) {
        const categoryBudgets = this.budgets.get(category);
        if (!categoryBudgets) return;
        
        const budget = categoryBudgets.get(metric);
        if (!budget) return;
        
        const violation = {
            category,
            metric,
            value,
            budget,
            timestamp: Date.now(),
            severity: this.calculateSeverity(value, budget),
            exceeded: value > budget.target
        };
        
        if (violation.exceeded || (value > budget.warning && this.settings.strictMode)) {
            this.recordViolation(violation);
        }
        
        this.recordMeasurement(violation);
    }

    calculateSeverity(value, budget) {
        if (value <= budget.warning) return 'good';
        if (value <= budget.target) return 'warning';
        if (value <= budget.target * 1.5) return 'poor';
        return 'critical';
    }

    recordViolation(violation) {
        this.violations.push(violation);
        
        if (this.violations.length > 100) {
            this.violations.shift();
        }
        
        if (this.settings.enableAlerts) {
            this.checkAlertConditions(violation);
        }
        
        if (this.settings.autoOptimize) {
            this.triggerAutoOptimization(violation);
        }
        
        document.dispatchEvent(new CustomEvent('performanceBudgetViolation', {
            detail: violation
        }));
    }

    recordMeasurement(measurement) {
        this.history.push({
            category: measurement.category,
            metric: measurement.metric,
            value: measurement.value,
            timestamp: measurement.timestamp,
            severity: measurement.severity
        });
        
        if (this.history.length > this.settings.retainHistory) {
            this.history.shift();
        }
    }

    checkAlertConditions(violation) {
        const alertKey = `${violation.category}-${violation.metric}`;
        
        if (!this.alerts.has(alertKey)) {
            this.alerts.set(alertKey, {
                count: 0,
                firstViolation: violation.timestamp,
                lastViolation: violation.timestamp,
                severity: violation.severity
            });
        }
        
        const alert = this.alerts.get(alertKey);
        alert.count++;
        alert.lastViolation = violation.timestamp;
        alert.severity = this.getMaxSeverity(alert.severity, violation.severity);
        
        if (alert.count >= this.settings.alertThreshold) {
            this.triggerAlert(alertKey, alert, violation);
        }
    }

    getMaxSeverity(current, newSeverity) {
        const severityLevels = { good: 0, warning: 1, poor: 2, critical: 3 };
        return severityLevels[newSeverity] > severityLevels[current] ? newSeverity : current;
    }

    triggerAlert(alertKey, alert, violation) {
        const alertData = {
            key: alertKey,
            alert,
            violation,
            recommendations: this.generateRecommendations(violation),
            timestamp: Date.now()
        };
        
        console.warn('Performance Budget Alert:', alertData);
        
        document.dispatchEvent(new CustomEvent('performanceBudgetAlert', {
            detail: alertData
        }));
        
        alert.count = 0;
    }

    triggerAutoOptimization(violation) {
        const optimizations = this.getOptimizationStrategies(violation);
        
        optimizations.forEach(optimization => {
            try {
                this.applyOptimization(optimization);
            } catch (error) {
                console.warn(`Failed to apply optimization ${optimization.type}:`, error);
            }
        });
    }

    getOptimizationStrategies(violation) {
        const strategies = [];
        
        switch (violation.category) {
            case 'resources':
                if (violation.metric === 'javascript-size') {
                    strategies.push({ type: 'compress-js', priority: 'high' });
                    strategies.push({ type: 'tree-shake', priority: 'medium' });
                }
                if (violation.metric === 'image-size') {
                    strategies.push({ type: 'compress-images', priority: 'high' });
                    strategies.push({ type: 'modern-formats', priority: 'medium' });
                }
                break;
                
            case 'vitals':
                if (violation.metric === 'largest-contentful-paint') {
                    strategies.push({ type: 'preload-lcp', priority: 'high' });
                    strategies.push({ type: 'optimize-images', priority: 'medium' });
                }
                break;
        }
        
        return strategies;
    }

    applyOptimization(optimization) {
        switch (optimization.type) {
            case 'preload-lcp':
                this.preloadLCPElements();
                break;
        }
    }

    preloadLCPElements() {
        const images = document.querySelectorAll('img');
        const largestImage = Array.from(images)
            .filter(img => {
                const rect = img.getBoundingClientRect();
                return rect.top < window.innerHeight;
            })
            .sort((a, b) => {
                const aArea = a.offsetWidth * a.offsetHeight;
                const bArea = b.offsetWidth * b.offsetHeight;
                return bArea - aArea;
            })[0];
        
        if (largestImage && largestImage.src && !document.querySelector(`link[href="${largestImage.src}"]`)) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = largestImage.src;
            document.head.appendChild(link);
        }
    }

    generateRecommendations(violation) {
        const recommendationMap = {
            'vitals': {
                'largest-contentful-paint': [
                    'Optimize images and use modern formats (WebP, AVIF)',
                    'Preload critical resources',
                    'Reduce server response times'
                ],
                'first-input-delay': [
                    'Reduce JavaScript execution time',
                    'Split large JavaScript bundles',
                    'Use web workers for heavy computations'
                ],
                'cumulative-layout-shift': [
                    'Add size attributes to images and videos',
                    'Reserve space for dynamic content'
                ]
            },
            'resources': {
                'javascript-size': [
                    'Enable tree shaking and dead code elimination',
                    'Implement code splitting'
                ],
                'image-size': [
                    'Compress images and use modern formats',
                    'Implement responsive images with srcset'
                ]
            }
        };
        
        const categoryRecs = recommendationMap[violation.category];
        return categoryRecs && categoryRecs[violation.metric] ? categoryRecs[violation.metric] : [];
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitoringLoop();
    }

    monitoringLoop() {
        if (!this.isMonitoring) return;
        
        this.analyzeResourceBudgets();
        this.analyzeDOMBudgets();
        
        setTimeout(() => {
            this.monitoringLoop();
        }, this.settings.monitoringInterval);
    }

    stopMonitoring() {
        this.isMonitoring = false;
        
        this.monitoring.forEach(observer => {
            try {
                observer.disconnect();
            } catch (e) {
                console.warn('Failed to disconnect observer:', e);
            }
        });
        
        this.monitoring.clear();
    }

    // Budget Management API
    setBudget(category, metric, target, warning = target * 0.8) {
        if (!this.budgets.has(category)) {
            this.budgets.set(category, new Map());
        }
        
        const categoryBudgets = this.budgets.get(category);
        const existingBudget = categoryBudgets.get(metric) || {};
        
        categoryBudgets.set(metric, {
            ...existingBudget,
            target,
            warning,
            unit: existingBudget.unit || 'ms'
        });
        
        this.saveBudgets();
    }

    getBudget(category, metric) {
        const categoryBudgets = this.budgets.get(category);
        return categoryBudgets ? categoryBudgets.get(metric) : null;
    }

    getAllBudgets() {
        const allBudgets = {};
        this.budgets.forEach((categoryBudgets, category) => {
            allBudgets[category] = Object.fromEntries(categoryBudgets);
        });
        return allBudgets;
    }

    getViolationSummary() {
        const summary = {
            total: this.violations.length,
            byCategory: {},
            bySeverity: { good: 0, warning: 0, poor: 0, critical: 0 },
            recent: this.violations.filter(v => Date.now() - v.timestamp < 3600000)
        };
        
        this.violations.forEach(violation => {
            if (!summary.byCategory[violation.category]) {
                summary.byCategory[violation.category] = 0;
            }
            summary.byCategory[violation.category]++;
            summary.bySeverity[violation.severity]++;
        });
        
        return summary;
    }

    formatValue(value, unit) {
        switch (unit) {
            case 'ms':
                return `${Math.round(value)}ms`;
            case 'bytes':
                return `${(value / 1024).toFixed(1)}KB`;
            case 'score':
                return value.toFixed(3);
            case 'count':
                return value.toString();
            default:
                return value.toString();
        }
    }

    saveBudgets() {
        try {
            const budgetData = {
                budgets: this.getAllBudgets(),
                settings: this.settings,
                timestamp: Date.now()
            };
            localStorage.setItem('performanceBudgets', JSON.stringify(budgetData));
        } catch (e) {
            console.warn('Failed to save budgets:', e);
        }
    }

    loadStoredBudgets() {
        try {
            const stored = localStorage.getItem('performanceBudgets');
            if (stored) {
                const data = JSON.parse(stored);
                
                if (data.budgets) {
                    Object.entries(data.budgets).forEach(([category, budgets]) => {
                        if (!this.budgets.has(category)) {
                            this.budgets.set(category, new Map());
                        }
                        
                        const categoryBudgets = this.budgets.get(category);
                        Object.entries(budgets).forEach(([metric, budget]) => {
                            categoryBudgets.set(metric, budget);
                        });
                    });
                }
                
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                }
            }
        } catch (e) {
            console.warn('Failed to load stored budgets:', e);
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveBudgets();
        
        if (newSettings.monitoringInterval && this.isMonitoring) {
            this.stopMonitoring();
            this.startMonitoring();
        }
    }

    onViolation(callback) {
        document.addEventListener('performanceBudgetViolation', callback);
        return () => document.removeEventListener('performanceBudgetViolation', callback);
    }

    onAlert(callback) {
        document.addEventListener('performanceBudgetAlert', callback);
        return () => document.removeEventListener('performanceBudgetAlert', callback);
    }
}

// Auto-initialize
const performanceBudget = new PerformanceBudget();

export default performanceBudget;