/**
 * Lighthouse Configuration Module
 * Advanced Lighthouse integration and performance auditing
 */

class LighthouseConfig {
    constructor() {
        this.auditResults = new Map();
        this.customAudits = new Map();
        this.performanceBudgets = new Map();
        this.categories = new Map();
        this.plugins = new Map();
        this.isRunning = false;
        this.lastAudit = null;
        this.auditHistory = [];
        
        this.defaultConfig = {
            extends: 'lighthouse:default',
            settings: {
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
                skipAudits: ['uses-http2'],
                throttling: {
                    rttMs: 150,
                    throughputKbps: 1638.4,
                    cpuSlowdownMultiplier: 4,
                    requestLatencyMs: 0,
                    downloadThroughputKbps: 0,
                    uploadThroughputKbps: 0
                },
                emulatedFormFactor: 'mobile',
                internalDisallowedDomains: ['localhost'],
                channel: 'devtools'
            },
            audits: [],
            categories: {},
            groups: {}
        };
        
        this.budgets = {
            performance: {
                'first-contentful-paint': 1800,
                'largest-contentful-paint': 2500,
                'first-input-delay': 100,
                'cumulative-layout-shift': 0.1,
                'total-blocking-time': 200,
                'speed-index': 3000
            },
            resources: {
                'total-byte-weight': 1600000, // 1.6MB
                'dom-size': 1500,
                'script-treemap-data': 500000, // 500KB
                'third-party-summary': 1000000 // 1MB
            },
            accessibility: {
                'color-contrast': 95,
                'heading-order': 100,
                'image-alt': 100,
                'label': 100,
                'link-name': 100
            }
        };
        
        this.init();
    }

    init() {
        this.setupCustomAudits();
        this.setupCategories();
        this.setupPerformanceBudgets();
        this.setupPlugins();
        this.configureReporting();
    }

    setupCustomAudits() {
        // Custom audit for bundle analysis
        this.customAudits.set('bundle-analysis', {
            id: 'bundle-analysis',
            title: 'Bundle Size Analysis',
            failureTitle: 'Bundle sizes are not optimized',
            description: 'Analyze JavaScript bundle sizes and suggest optimizations',
            requiredArtifacts: ['Scripts'],
            scoreDisplayMode: 'numeric',
            audit: this.auditBundleSize.bind(this)
        });

        // Custom audit for lazy loading
        this.customAudits.set('lazy-loading-audit', {
            id: 'lazy-loading-audit',
            title: 'Lazy Loading Implementation',
            failureTitle: 'Images are not lazy loaded',
            description: 'Check if images implement lazy loading correctly',
            requiredArtifacts: ['ImageElements'],
            scoreDisplayMode: 'binary',
            audit: this.auditLazyLoading.bind(this)
        });

        // Custom audit for caching strategy
        this.customAudits.set('caching-strategy', {
            id: 'caching-strategy',
            title: 'Caching Strategy',
            failureTitle: 'Caching strategy needs improvement',
            description: 'Evaluate HTTP caching headers and service worker implementation',
            requiredArtifacts: ['NetworkRecords', 'ServiceWorker'],
            scoreDisplayMode: 'numeric',
            audit: this.auditCachingStrategy.bind(this)
        });

        // Custom audit for memory usage
        this.customAudits.set('memory-usage', {
            id: 'memory-usage',
            title: 'Memory Usage Analysis',
            failureTitle: 'High memory usage detected',
            description: 'Analyze JavaScript heap usage and potential memory leaks',
            requiredArtifacts: ['MainDocumentContent'],
            scoreDisplayMode: 'numeric',
            audit: this.auditMemoryUsage.bind(this)
        });

        // Custom audit for analytics implementation
        this.customAudits.set('analytics-audit', {
            id: 'analytics-audit',
            title: 'Analytics Implementation',
            failureTitle: 'Analytics not properly configured',
            description: 'Check analytics implementation and privacy compliance',
            requiredArtifacts: ['Scripts'],
            scoreDisplayMode: 'binary',
            audit: this.auditAnalytics.bind(this)
        });
    }

    setupCategories() {
        // Enhanced Performance Category
        this.categories.set('performance-plus', {
            title: 'Performance Plus',
            description: 'Extended performance metrics with custom audits',
            auditRefs: [
                { id: 'first-contentful-paint', weight: 10, group: 'metrics' },
                { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
                { id: 'first-input-delay', weight: 10, group: 'metrics' },
                { id: 'cumulative-layout-shift', weight: 25, group: 'metrics' },
                { id: 'total-blocking-time', weight: 30, group: 'metrics' },
                { id: 'bundle-analysis', weight: 5, group: 'load-opportunities' },
                { id: 'lazy-loading-audit', weight: 3, group: 'load-opportunities' },
                { id: 'caching-strategy', weight: 5, group: 'load-opportunities' },
                { id: 'memory-usage', weight: 2, group: 'diagnostics' }
            ]
        });

        // Data & Privacy Category
        this.categories.set('data-privacy', {
            title: 'Data & Privacy',
            description: 'Analytics implementation and privacy compliance',
            auditRefs: [
                { id: 'analytics-audit', weight: 30, group: 'privacy' },
                { id: 'third-party-cookies', weight: 20, group: 'privacy' },
                { id: 'geolocation-on-start', weight: 15, group: 'privacy' },
                { id: 'notification-on-start', weight: 15, group: 'privacy' },
                { id: 'password-inputs-can-be-pasted-into', weight: 10, group: 'privacy' },
                { id: 'uses-https', weight: 10, group: 'privacy' }
            ]
        });

        // Resource Optimization Category
        this.categories.set('resource-optimization', {
            title: 'Resource Optimization',
            description: 'Asset optimization and delivery strategies',
            auditRefs: [
                { id: 'unused-css-rules', weight: 20, group: 'optimization' },
                { id: 'unused-javascript', weight: 20, group: 'optimization' },
                { id: 'modern-image-formats', weight: 15, group: 'optimization' },
                { id: 'efficient-animated-content', weight: 10, group: 'optimization' },
                { id: 'preload-lcp-image', weight: 15, group: 'optimization' },
                { id: 'bundle-analysis', weight: 20, group: 'optimization' }
            ]
        });
    }

    setupPerformanceBudgets() {
        // Set up performance budgets for different device types
        this.performanceBudgets.set('mobile', {
            ...this.budgets,
            network: 'slow4G',
            device: 'mobile',
            thresholds: {
                performance: 90,
                accessibility: 95,
                'best-practices': 95,
                seo: 95,
                pwa: 80
            }
        });

        this.performanceBudgets.set('desktop', {
            ...this.budgets,
            network: 'broadband',
            device: 'desktop',
            thresholds: {
                performance: 95,
                accessibility: 100,
                'best-practices': 100,
                seo: 100,
                pwa: 90
            }
        });

        // Budget alerts
        this.performanceBudgets.set('alerts', {
            performance: {
                warning: 80,
                error: 70
            },
            accessibility: {
                warning: 90,
                error: 80
            },
            'bundle-size': {
                warning: 1000000, // 1MB
                error: 1500000    // 1.5MB
            }
        });
    }

    setupPlugins() {
        // Publisher Ads Plugin
        this.plugins.set('lighthouse-plugin-publisher-ads', {
            enabled: false,
            config: {
                settings: {
                    onlyCategories: ['publisher-ads']
                }
            }
        });

        // Field Performance Plugin
        this.plugins.set('lighthouse-plugin-field-performance', {
            enabled: true,
            config: {
                settings: {
                    fieldDataUrl: '/api/field-data'
                }
            }
        });

        // Custom Performance Plugin
        this.plugins.set('lighthouse-plugin-performance-plus', {
            enabled: true,
            config: {
                customAudits: Array.from(this.customAudits.keys())
            }
        });
    }

    configureReporting() {
        this.reportConfig = {
            output: ['json', 'html'],
            outputPath: './lighthouse-reports/',
            view: true,
            saveAssets: true,
            budgetPath: './performance-budget.json',
            uploadOutputToGCS: false,
            filename: `lighthouse-${Date.now()}`
        };
    }

    // Custom Audit Implementations
    async auditBundleSize(artifacts, context) {
        const scripts = artifacts.Scripts || [];
        let totalSize = 0;
        let unoptimizedBundles = [];

        scripts.forEach(script => {
            if (script.content) {
                const size = new Blob([script.content]).size;
                totalSize += size;

                if (size > 500000 && !script.url.includes('.min.')) { // > 500KB and not minified
                    unoptimizedBundles.push({
                        url: script.url,
                        size: size,
                        suggestion: 'Consider code splitting and minification'
                    });
                }
            }
        });

        const score = totalSize < 1000000 ? 1 : Math.max(0, 1 - (totalSize - 1000000) / 2000000);

        return {
            score: score,
            scoreDisplayMode: 'numeric',
            displayValue: `Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
            details: {
                type: 'table',
                headings: [
                    { key: 'url', text: 'Bundle', valueType: 'url' },
                    { key: 'size', text: 'Size', valueType: 'bytes' },
                    { key: 'suggestion', text: 'Suggestion', valueType: 'text' }
                ],
                items: unoptimizedBundles
            }
        };
    }

    async auditLazyLoading(artifacts, context) {
        const images = artifacts.ImageElements || [];
        let lazyImages = 0;
        let totalImages = images.length;
        let suggestions = [];

        images.forEach(img => {
            if (img.loading === 'lazy' || img.hasAttribute('data-src')) {
                lazyImages++;
            } else if (img.isInViewport === false) {
                suggestions.push({
                    url: img.src,
                    suggestion: 'Consider adding lazy loading'
                });
            }
        });

        const score = totalImages > 0 ? lazyImages / totalImages : 1;

        return {
            score: score,
            scoreDisplayMode: 'binary',
            displayValue: `${lazyImages}/${totalImages} images use lazy loading`,
            details: {
                type: 'table',
                headings: [
                    { key: 'url', text: 'Image', valueType: 'url' },
                    { key: 'suggestion', text: 'Suggestion', valueType: 'text' }
                ],
                items: suggestions
            }
        };
    }

    async auditCachingStrategy(artifacts, context) {
        const networkRecords = artifacts.NetworkRecords || [];
        let cachedResources = 0;
        let totalResources = networkRecords.length;
        let cachingIssues = [];

        networkRecords.forEach(record => {
            const cacheControl = record.responseHeaders?.['cache-control'];
            const expires = record.responseHeaders?.expires;

            if (cacheControl || expires) {
                cachedResources++;
            } else if (record.resourceType !== 'Document') {
                cachingIssues.push({
                    url: record.url,
                    type: record.resourceType,
                    suggestion: 'Add appropriate cache headers'
                });
            }
        });

        const score = totalResources > 0 ? cachedResources / totalResources : 1;

        return {
            score: score,
            scoreDisplayMode: 'numeric',
            displayValue: `${cachedResources}/${totalResources} resources cached`,
            details: {
                type: 'table',
                headings: [
                    { key: 'url', text: 'Resource', valueType: 'url' },
                    { key: 'type', text: 'Type', valueType: 'text' },
                    { key: 'suggestion', text: 'Suggestion', valueType: 'text' }
                ],
                items: cachingIssues.slice(0, 10) // Limit to top 10
            }
        };
    }

    async auditMemoryUsage(artifacts, context) {
        // Simulate memory usage analysis
        const heapUsage = performance.memory?.usedJSHeapSize || 0;
        const memoryThreshold = 50 * 1024 * 1024; // 50MB

        const score = heapUsage < memoryThreshold ? 1 : Math.max(0, 1 - (heapUsage - memoryThreshold) / memoryThreshold);

        return {
            score: score,
            scoreDisplayMode: 'numeric',
            displayValue: `Heap usage: ${(heapUsage / 1024 / 1024).toFixed(2)} MB`,
            details: {
                type: 'debugdata',
                items: [{
                    heapUsage: heapUsage,
                    threshold: memoryThreshold,
                    recommendation: heapUsage > memoryThreshold ? 'Consider memory optimization' : 'Memory usage is within acceptable limits'
                }]
            }
        };
    }

    async auditAnalytics(artifacts, context) {
        const scripts = artifacts.Scripts || [];
        let analyticsFound = false;
        let privacyCompliant = false;
        let issues = [];

        scripts.forEach(script => {
            if (script.url.includes('google-analytics') || 
                script.url.includes('gtag') || 
                script.content?.includes('analytics')) {
                analyticsFound = true;

                // Check for privacy compliance
                if (script.content?.includes('anonymizeIP') || 
                    script.content?.includes('storage: none')) {
                    privacyCompliant = true;
                }
            }
        });

        if (analyticsFound && !privacyCompliant) {
            issues.push({
                issue: 'Analytics privacy',
                suggestion: 'Consider implementing privacy-compliant analytics'
            });
        }

        const score = analyticsFound && privacyCompliant ? 1 : 0.5;

        return {
            score: score,
            scoreDisplayMode: 'binary',
            displayValue: analyticsFound ? 'Analytics detected' : 'No analytics found',
            details: {
                type: 'table',
                headings: [
                    { key: 'issue', text: 'Issue', valueType: 'text' },
                    { key: 'suggestion', text: 'Suggestion', valueType: 'text' }
                ],
                items: issues
            }
        };
    }

    // Configuration Methods
    generateConfig(options = {}) {
        const config = { ...this.defaultConfig };

        // Apply device-specific settings
        if (options.device) {
            const budget = this.performanceBudgets.get(options.device);
            if (budget) {
                config.settings.emulatedFormFactor = options.device;
                config.settings.throttling = budget.network === 'slow4G' ? 
                    config.settings.throttling : this.getDesktopThrottling();
            }
        }

        // Add custom audits
        if (options.includeCustomAudits !== false) {
            config.audits = Array.from(this.customAudits.values());
        }

        // Add custom categories
        if (options.categories) {
            options.categories.forEach(categoryName => {
                const category = this.categories.get(categoryName);
                if (category) {
                    config.categories[categoryName] = category;
                }
            });
        }

        // Add plugins
        if (options.plugins) {
            config.plugins = [];
            options.plugins.forEach(pluginName => {
                const plugin = this.plugins.get(pluginName);
                if (plugin && plugin.enabled) {
                    config.plugins.push(pluginName);
                }
            });
        }

        return config;
    }

    getDesktopThrottling() {
        return {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1,
            requestLatencyMs: 0,
            downloadThroughputKbps: 0,
            uploadThroughputKbps: 0
        };
    }

    // Audit Execution
    async runAudit(url, options = {}) {
        if (this.isRunning) {
            throw new Error('Audit already in progress');
        }

        this.isRunning = true;

        try {
            const config = this.generateConfig(options);
            const startTime = Date.now();

            // In a real implementation, this would call the actual Lighthouse API
            const results = await this.simulateLighthouseRun(url, config);

            const auditData = {
                url,
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                config: config,
                results: results,
                options: options
            };

            this.auditResults.set(url, auditData);
            this.auditHistory.push(auditData);
            this.lastAudit = auditData;

            // Keep only last 10 audits in history
            if (this.auditHistory.length > 10) {
                this.auditHistory.shift();
            }

            return auditData;

        } finally {
            this.isRunning = false;
        }
    }

    async simulateLighthouseRun(url, config) {
        // Simulate Lighthouse audit results
        return {
            lhr: {
                finalUrl: url,
                lighthouseVersion: '10.0.0',
                userAgent: navigator.userAgent,
                environment: {
                    networkUserAgent: navigator.userAgent,
                    hostUserAgent: navigator.userAgent,
                    benchmarkIndex: 1000
                },
                categories: {
                    performance: { score: 0.85, title: 'Performance' },
                    accessibility: { score: 0.92, title: 'Accessibility' },
                    'best-practices': { score: 0.88, title: 'Best Practices' },
                    seo: { score: 0.95, title: 'SEO' },
                    pwa: { score: 0.75, title: 'PWA' }
                },
                audits: this.generateSimulatedAudits()
            },
            artifacts: {},
            report: this.generateHTMLReport()
        };
    }

    generateSimulatedAudits() {
        return {
            'first-contentful-paint': { score: 0.8, displayValue: '1.2 s' },
            'largest-contentful-paint': { score: 0.85, displayValue: '2.1 s' },
            'first-input-delay': { score: 0.95, displayValue: '45 ms' },
            'cumulative-layout-shift': { score: 0.9, displayValue: '0.08' },
            'total-blocking-time': { score: 0.88, displayValue: '150 ms' },
            'speed-index': { score: 0.82, displayValue: '2.8 s' }
        };
    }

    generateHTMLReport() {
        return `<!DOCTYPE html>
        <html>
        <head>
            <title>Lighthouse Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .score { font-size: 24px; font-weight: bold; }
                .good { color: #0cce6b; }
                .average { color: #ffa400; }
                .poor { color: #ff4e42; }
            </style>
        </head>
        <body>
            <h1>Lighthouse Report</h1>
            <div class="score good">Performance: 85</div>
            <div class="score good">Accessibility: 92</div>
            <div class="score good">Best Practices: 88</div>
            <div class="score good">SEO: 95</div>
            <div class="score average">PWA: 75</div>
        </body>
        </html>`;
    }

    // Analysis Methods
    analyzeTrends() {
        if (this.auditHistory.length < 2) return null;

        const trends = {};
        const categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'];

        categories.forEach(category => {
            const scores = this.auditHistory.map(audit => 
                audit.results.lhr.categories[category]?.score || 0
            );

            const latest = scores[scores.length - 1];
            const previous = scores[scores.length - 2];
            const change = latest - previous;

            trends[category] = {
                current: latest,
                previous: previous,
                change: change,
                trend: change > 0.01 ? 'improving' : change < -0.01 ? 'declining' : 'stable'
            };
        });

        return trends;
    }

    checkBudgets(results) {
        const violations = [];
        const device = results.config?.settings?.emulatedFormFactor || 'mobile';
        const budget = this.performanceBudgets.get(device);

        if (budget && results.lhr) {
            Object.entries(budget.thresholds).forEach(([category, threshold]) => {
                const score = results.lhr.categories[category]?.score || 0;
                const scorePercent = score * 100;

                if (scorePercent < threshold) {
                    violations.push({
                        category,
                        threshold,
                        actual: scorePercent,
                        severity: scorePercent < threshold * 0.8 ? 'error' : 'warning'
                    });
                }
            });
        }

        return violations;
    }

    generateRecommendations(results) {
        const recommendations = [];
        const audits = results.lhr?.audits || {};

        // Performance recommendations
        Object.entries(audits).forEach(([auditId, audit]) => {
            if (audit.score < 0.8 && audit.details) {
                recommendations.push({
                    category: 'performance',
                    audit: auditId,
                    title: audit.title,
                    description: audit.description,
                    impact: audit.score < 0.5 ? 'high' : 'medium',
                    suggestion: this.getAuditSuggestion(auditId)
                });
            }
        });

        return recommendations.sort((a, b) => {
            const impactOrder = { high: 3, medium: 2, low: 1 };
            return impactOrder[b.impact] - impactOrder[a.impact];
        });
    }

    getAuditSuggestion(auditId) {
        const suggestions = {
            'first-contentful-paint': 'Optimize critical rendering path and reduce server response times',
            'largest-contentful-paint': 'Optimize images and preload critical resources',
            'cumulative-layout-shift': 'Add size attributes to images and reserve space for dynamic content',
            'total-blocking-time': 'Reduce JavaScript execution time and defer non-critical scripts',
            'unused-css-rules': 'Remove unused CSS to reduce bundle size',
            'unused-javascript': 'Implement code splitting and remove dead code'
        };

        return suggestions[auditId] || 'Review audit details for optimization opportunities';
    }

    // Export and Reporting
    exportResults(format = 'json') {
        const data = {
            lastAudit: this.lastAudit,
            auditHistory: this.auditHistory,
            trends: this.analyzeTrends(),
            budgetViolations: this.lastAudit ? this.checkBudgets(this.lastAudit) : [],
            recommendations: this.lastAudit ? this.generateRecommendations(this.lastAudit) : [],
            timestamp: Date.now()
        };

        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            case 'html':
                return this.generateDetailedReport(data);
            default:
                return data;
        }
    }

    convertToCSV(data) {
        const history = data.auditHistory;
        if (!history.length) return '';

        const headers = ['timestamp', 'url', 'performance', 'accessibility', 'best-practices', 'seo', 'pwa'];
        const rows = history.map(audit => {
            const categories = audit.results.lhr.categories;
            return [
                new Date(audit.timestamp).toISOString(),
                audit.url,
                categories.performance?.score || 0,
                categories.accessibility?.score || 0,
                categories['best-practices']?.score || 0,
                categories.seo?.score || 0,
                categories.pwa?.score || 0
            ];
        });

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    generateDetailedReport(data) {
        // Generate comprehensive HTML report
        return `<!DOCTYPE html>
        <html>
        <head>
            <title>Lighthouse Analysis Report</title>
            <meta charset="utf-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
                .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
                .metric { background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .score { font-size: 2em; font-weight: bold; margin-bottom: 8px; }
                .good { color: #10b981; }
                .average { color: #f59e0b; }
                .poor { color: #ef4444; }
                .trends { margin: 20px 0; }
                .recommendations { background: #f8fafc; padding: 20px; border-radius: 8px; }
                .rec-item { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
                .high { border-left: 4px solid #ef4444; }
                .medium { border-left: 4px solid #f59e0b; }
                .low { border-left: 4px solid #10b981; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Lighthouse Performance Analysis</h1>
                <p>Generated on ${new Date().toISOString()}</p>
            </div>
            ${this.generateMetricsHTML(data)}
            ${this.generateTrendsHTML(data)}
            ${this.generateRecommendationsHTML(data)}
        </body>
        </html>`;
    }

    generateMetricsHTML(data) {
        if (!data.lastAudit) return '<p>No audit data available</p>';

        const categories = data.lastAudit.results.lhr.categories;
        return `
        <div class="metrics">
            ${Object.entries(categories).map(([key, category]) => {
                const score = Math.round(category.score * 100);
                const className = score >= 90 ? 'good' : score >= 50 ? 'average' : 'poor';
                return `
                <div class="metric">
                    <div class="score ${className}">${score}</div>
                    <div>${category.title}</div>
                </div>`;
            }).join('')}
        </div>`;
    }

    generateTrendsHTML(data) {
        if (!data.trends) return '';

        return `
        <div class="trends">
            <h2>Performance Trends</h2>
            ${Object.entries(data.trends).map(([category, trend]) => `
                <div>
                    <strong>${category}:</strong> 
                    ${trend.trend} 
                    (${trend.change > 0 ? '+' : ''}${(trend.change * 100).toFixed(1)}%)
                </div>
            `).join('')}
        </div>`;
    }

    generateRecommendationsHTML(data) {
        if (!data.recommendations.length) return '';

        return `
        <div class="recommendations">
            <h2>Recommendations</h2>
            ${data.recommendations.map(rec => `
                <div class="rec-item ${rec.impact}">
                    <h3>${rec.title}</h3>
                    <p>${rec.suggestion}</p>
                </div>
            `).join('')}
        </div>`;
    }

    // Public API
    getLastAudit() {
        return this.lastAudit;
    }

    getAuditHistory() {
        return this.auditHistory;
    }

    getBudgetViolations() {
        return this.lastAudit ? this.checkBudgets(this.lastAudit) : [];
    }

    updateBudgets(deviceType, budgets) {
        const currentBudget = this.performanceBudgets.get(deviceType) || {};
        this.performanceBudgets.set(deviceType, { ...currentBudget, ...budgets });
    }

    addCustomAudit(auditConfig) {
        this.customAudits.set(auditConfig.id, auditConfig);
    }

    enablePlugin(pluginName, config = {}) {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
            plugin.enabled = true;
            plugin.config = { ...plugin.config, ...config };
        }
    }

    disablePlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
            plugin.enabled = false;
        }
    }

    exportConfig() {
        return {
            config: this.defaultConfig,
            customAudits: Array.from(this.customAudits.entries()),
            categories: Array.from(this.categories.entries()),
            budgets: Array.from(this.performanceBudgets.entries()),
            plugins: Array.from(this.plugins.entries()),
            reportConfig: this.reportConfig,
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const lighthouseConfig = new LighthouseConfig();
export default lighthouseConfig;