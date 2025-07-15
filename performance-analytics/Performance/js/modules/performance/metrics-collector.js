/**
 * Performance Metrics Collector
 * Collects comprehensive performance metrics using modern browser APIs
 */

class MetricsCollector {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.startTime = performance.now();
        this.isCollecting = false;
        this.collectionInterval = 1000; // 1 second
        this.maxMetrics = 1000;
        
        this.vitalsThresholds = {
            LCP: { good: 2500, needsImprovement: 4000 },
            FID: { good: 100, needsImprovement: 300 },
            CLS: { good: 0.1, needsImprovement: 0.25 },
            FCP: { good: 1800, needsImprovement: 3000 },
            TTFB: { good: 800, needsImprovement: 1800 }
        };
        
        this.init();
    }

    init() {
        this.setupPerformanceObservers();
        this.collectNavigationMetrics();
        this.collectResourceMetrics();
        this.startContinuousCollection();
        this.setupEventListeners();
    }

    setupPerformanceObservers() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    
                    this.recordMetric('LCP', {
                        value: lastEntry.startTime,
                        element: lastEntry.element?.tagName,
                        url: lastEntry.url,
                        timestamp: Date.now(),
                        rating: this.getRating('LCP', lastEntry.startTime)
                    });
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.set('lcp', lcpObserver);
            } catch (e) {
                console.warn('LCP observer not supported:', e);
            }

            // First Input Delay (FID)
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.recordMetric('FID', {
                            value: entry.processingStart - entry.startTime,
                            eventType: entry.name,
                            timestamp: Date.now(),
                            rating: this.getRating('FID', entry.processingStart - entry.startTime)
                        });
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
                this.observers.set('fid', fidObserver);
            } catch (e) {
                console.warn('FID observer not supported:', e);
            }

            // Cumulative Layout Shift (CLS)
            try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                            this.recordMetric('CLS', {
                                value: clsValue,
                                sources: entry.sources?.map(source => ({
                                    node: source.node?.tagName,
                                    previousRect: source.previousRect,
                                    currentRect: source.currentRect
                                })),
                                timestamp: Date.now(),
                                rating: this.getRating('CLS', clsValue)
                            });
                        }
                    });
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.set('cls', clsObserver);
            } catch (e) {
                console.warn('CLS observer not supported:', e);
            }

            // First Contentful Paint (FCP)
            try {
                const fcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.name === 'first-contentful-paint') {
                            this.recordMetric('FCP', {
                                value: entry.startTime,
                                timestamp: Date.now(),
                                rating: this.getRating('FCP', entry.startTime)
                            });
                        }
                    });
                });
                fcpObserver.observe({ entryTypes: ['paint'] });
                this.observers.set('fcp', fcpObserver);
            } catch (e) {
                console.warn('FCP observer not supported:', e);
            }

            // Long Tasks
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.recordMetric('LONG_TASK', {
                            duration: entry.duration,
                            startTime: entry.startTime,
                            attribution: entry.attribution?.map(attr => ({
                                name: attr.name,
                                entryType: attr.entryType,
                                startTime: attr.startTime,
                                duration: attr.duration
                            })),
                            timestamp: Date.now()
                        });
                    });
                });
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.set('longtask', longTaskObserver);
            } catch (e) {
                console.warn('Long task observer not supported:', e);
            }

            // Resource Timing
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.processResourceEntry(entry);
                    });
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.set('resource', resourceObserver);
            } catch (e) {
                console.warn('Resource observer not supported:', e);
            }

            // Memory usage (if available)
            if ('memory' in performance) {
                this.collectMemoryMetrics();
            }
        }
    }

    collectNavigationMetrics() {
        if ('getEntriesByType' in performance) {
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries.length > 0) {
                const nav = navEntries[0];
                
                // Time to First Byte (TTFB)
                const ttfb = nav.responseStart - nav.requestStart;
                this.recordMetric('TTFB', {
                    value: ttfb,
                    rating: this.getRating('TTFB', ttfb),
                    timestamp: Date.now()
                });

                // DOM Content Loaded
                this.recordMetric('DOM_CONTENT_LOADED', {
                    value: nav.domContentLoadedEventEnd - nav.navigationStart,
                    timestamp: Date.now()
                });

                // Load Complete
                this.recordMetric('LOAD_COMPLETE', {
                    value: nav.loadEventEnd - nav.navigationStart,
                    timestamp: Date.now()
                });

                // DNS Lookup Time
                this.recordMetric('DNS_LOOKUP', {
                    value: nav.domainLookupEnd - nav.domainLookupStart,
                    timestamp: Date.now()
                });

                // TCP Connection Time
                this.recordMetric('TCP_CONNECTION', {
                    value: nav.connectEnd - nav.connectStart,
                    timestamp: Date.now()
                });

                // Server Response Time
                this.recordMetric('SERVER_RESPONSE', {
                    value: nav.responseEnd - nav.responseStart,
                    timestamp: Date.now()
                });

                // DOM Processing Time
                this.recordMetric('DOM_PROCESSING', {
                    value: nav.domComplete - nav.domLoading,
                    timestamp: Date.now()
                });
            }
        }
    }

    collectResourceMetrics() {
        if ('getEntriesByType' in performance) {
            const resourceEntries = performance.getEntriesByType('resource');
            resourceEntries.forEach(entry => {
                this.processResourceEntry(entry);
            });
        }
    }

    processResourceEntry(entry) {
        const resourceType = this.getResourceType(entry.name);
        const duration = entry.responseEnd - entry.startTime;
        
        this.recordMetric('RESOURCE_LOAD', {
            name: entry.name,
            type: resourceType,
            duration: duration,
            size: entry.transferSize || entry.decodedBodySize,
            cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
            protocol: entry.nextHopProtocol,
            timestamp: Date.now(),
            timing: {
                dns: entry.domainLookupEnd - entry.domainLookupStart,
                tcp: entry.connectEnd - entry.connectStart,
                request: entry.responseStart - entry.requestStart,
                response: entry.responseEnd - entry.responseStart
            }
        });

        // Track slow resources
        if (duration > 1000) {
            this.recordMetric('SLOW_RESOURCE', {
                name: entry.name,
                type: resourceType,
                duration: duration,
                severity: duration > 3000 ? 'high' : 'medium',
                timestamp: Date.now()
            });
        }
    }

    collectMemoryMetrics() {
        if ('memory' in performance) {
            const memory = performance.memory;
            this.recordMetric('MEMORY_USAGE', {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                utilization: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
                timestamp: Date.now()
            });
        }
    }

    startContinuousCollection() {
        this.isCollecting = true;
        
        const collect = () => {
            if (!this.isCollecting) return;
            
            // Collect runtime metrics
            this.collectRuntimeMetrics();
            this.collectUserTimingMetrics();
            this.collectMemoryMetrics();
            
            // Schedule next collection
            setTimeout(collect, this.collectionInterval);
        };
        
        collect();
    }

    collectRuntimeMetrics() {
        // Frame rate estimation
        this.measureFrameRate();
        
        // Connection info
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.recordMetric('CONNECTION_INFO', {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData,
                timestamp: Date.now()
            });
        }

        // Battery info (if available)
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                this.recordMetric('BATTERY_INFO', {
                    level: battery.level,
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime,
                    timestamp: Date.now()
                });
            });
        }
    }

    measureFrameRate() {
        let lastTime = performance.now();
        let frames = 0;
        
        const measureFrame = (currentTime) => {
            frames++;
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.recordMetric('FPS', {
                    value: fps,
                    quality: fps >= 60 ? 'excellent' : fps >= 30 ? 'good' : 'poor',
                    timestamp: Date.now()
                });
                
                frames = 0;
                lastTime = currentTime;
            }
            
            if (this.isCollecting) {
                requestAnimationFrame(measureFrame);
            }
        };
        
        requestAnimationFrame(measureFrame);
    }

    collectUserTimingMetrics() {
        if ('getEntriesByType' in performance) {
            const userTiming = performance.getEntriesByType('measure');
            userTiming.forEach(entry => {
                this.recordMetric('USER_TIMING', {
                    name: entry.name,
                    duration: entry.duration,
                    startTime: entry.startTime,
                    timestamp: Date.now()
                });
            });
        }
    }

    setupEventListeners() {
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.recordMetric('VISIBILITY_CHANGE', {
                hidden: document.hidden,
                timestamp: Date.now()
            });
        });

        // Unload events
        window.addEventListener('beforeunload', () => {
            this.recordMetric('PAGE_UNLOAD', {
                sessionDuration: performance.now() - this.startTime,
                timestamp: Date.now()
            });
            this.sendMetrics();
        });

        // Error tracking
        window.addEventListener('error', (event) => {
            this.recordMetric('JS_ERROR', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });

        // Promise rejection tracking
        window.addEventListener('unhandledrejection', (event) => {
            this.recordMetric('PROMISE_REJECTION', {
                reason: event.reason,
                timestamp: Date.now()
            });
        });
    }

    recordMetric(type, data) {
        if (!this.metrics.has(type)) {
            this.metrics.set(type, []);
        }
        
        const metrics = this.metrics.get(type);
        metrics.push(data);
        
        // Limit stored metrics to prevent memory issues
        if (metrics.length > this.maxMetrics) {
            metrics.shift();
        }
        
        // Trigger real-time analysis for critical metrics
        this.analyzeMetric(type, data);
    }

    analyzeMetric(type, data) {
        const criticalMetrics = ['FCP', 'LCP', 'FID', 'CLS', 'JS_ERROR'];
        
        if (criticalMetrics.includes(type)) {
            this.checkThresholds(type, data);
        }
    }

    checkThresholds(type, data) {
        const thresholds = this.vitalsThresholds[type];
        if (!thresholds) return;
        
        let alertLevel = null;
        
        if (data.value > thresholds.needsImprovement) {
            alertLevel = 'poor';
        } else if (data.value > thresholds.good) {
            alertLevel = 'needs-improvement';
        }
        
        if (alertLevel) {
            this.recordMetric('PERFORMANCE_ALERT', {
                metric: type,
                value: data.value,
                level: alertLevel,
                threshold: alertLevel === 'poor' ? thresholds.needsImprovement : thresholds.good,
                timestamp: Date.now()
            });
        }
    }

    getRating(metric, value) {
        const thresholds = this.vitalsThresholds[metric];
        if (!thresholds) return 'unknown';
        
        if (value <= thresholds.good) return 'good';
        if (value <= thresholds.needsImprovement) return 'needs-improvement';
        return 'poor';
    }

    getResourceType(url) {
        const ext = url.split('.').pop()?.toLowerCase();
        
        const typeMap = {
            'js': 'script',
            'css': 'stylesheet',
            'png': 'image',
            'jpg': 'image',
            'jpeg': 'image',
            'gif': 'image',
            'webp': 'image',
            'svg': 'image',
            'woff': 'font',
            'woff2': 'font',
            'ttf': 'font',
            'otf': 'font',
            'mp4': 'video',
            'webm': 'video',
            'mp3': 'audio',
            'wav': 'audio'
        };
        
        return typeMap[ext] || 'other';
    }

    getMetrics(type = null, timeRange = null) {
        if (type) {
            const metrics = this.metrics.get(type) || [];
            return timeRange ? this.filterByTimeRange(metrics, timeRange) : metrics;
        }
        
        const allMetrics = {};
        this.metrics.forEach((metrics, type) => {
            allMetrics[type] = timeRange ? this.filterByTimeRange(metrics, timeRange) : metrics;
        });
        
        return allMetrics;
    }

    filterByTimeRange(metrics, timeRange) {
        const now = Date.now();
        const start = now - timeRange;
        return metrics.filter(metric => metric.timestamp >= start);
    }

    getPerformanceSummary() {
        const summary = {
            coreWebVitals: {},
            loadingMetrics: {},
            runtimeMetrics: {},
            errors: [],
            alerts: []
        };

        // Core Web Vitals
        ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].forEach(metric => {
            const metrics = this.metrics.get(metric) || [];
            if (metrics.length > 0) {
                const latest = metrics[metrics.length - 1];
                summary.coreWebVitals[metric] = {
                    value: latest.value,
                    rating: latest.rating,
                    timestamp: latest.timestamp
                };
            }
        });

        // Loading metrics
        const loadMetrics = this.metrics.get('LOAD_COMPLETE') || [];
        if (loadMetrics.length > 0) {
            summary.loadingMetrics.pageLoad = loadMetrics[loadMetrics.length - 1].value;
        }

        // Runtime metrics
        const fpsMetrics = this.metrics.get('FPS') || [];
        if (fpsMetrics.length > 0) {
            const recent = fpsMetrics.slice(-10);
            summary.runtimeMetrics.averageFPS = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
        }

        // Errors
        summary.errors = this.metrics.get('JS_ERROR') || [];
        summary.alerts = this.metrics.get('PERFORMANCE_ALERT') || [];

        return summary;
    }

    sendMetrics() {
        const metricsData = {
            sessionId: this.getSessionId(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            metrics: this.getMetrics(),
            summary: this.getPerformanceSummary()
        };

        // Send via beacon API if available, fallback to fetch
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/performance/metrics', JSON.stringify(metricsData));
        } else {
            fetch('/api/performance/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metricsData)
            }).catch(err => console.warn('Failed to send metrics:', err));
        }
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('performanceSessionId');
        if (!sessionId) {
            sessionId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('performanceSessionId', sessionId);
        }
        return sessionId;
    }

    // Public API methods
    mark(name) {
        if ('mark' in performance) {
            performance.mark(name);
        }
    }

    measure(name, startMark, endMark) {
        if ('measure' in performance) {
            try {
                performance.measure(name, startMark, endMark);
            } catch (e) {
                console.warn('Failed to create measure:', e);
            }
        }
    }

    startMeasure(name) {
        this.mark(`${name}-start`);
        return {
            end: () => {
                this.mark(`${name}-end`);
                this.measure(name, `${name}-start`, `${name}-end`);
            }
        };
    }

    stop() {
        this.isCollecting = false;
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (e) {
                console.warn('Failed to disconnect observer:', e);
            }
        });
        this.observers.clear();
    }

    reset() {
        this.metrics.clear();
        this.startTime = performance.now();
    }

    exportData() {
        return {
            metrics: Array.from(this.metrics.entries()),
            summary: this.getPerformanceSummary(),
            session: {
                id: this.getSessionId(),
                startTime: this.startTime,
                duration: performance.now() - this.startTime
            },
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const metricsCollector = new MetricsCollector();

// Export for use in other modules
export default metricsCollector;