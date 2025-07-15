/**
 * Memory Monitor Module
 * Monitors memory usage, detects leaks, and provides optimization suggestions
 */

class MemoryMonitor {
    constructor() {
        this.memoryStats = [];
        this.leakDetectors = new Map();
        this.thresholds = {
            warning: 50 * 1024 * 1024,     // 50MB
            critical: 100 * 1024 * 1024,   // 100MB
            severe: 200 * 1024 * 1024      // 200MB
        };
        this.monitoringInterval = 5000; // 5 seconds
        this.isMonitoring = false;
        this.observers = new Map();
        this.memoryPressureCallbacks = new Set();
        this.gcCount = 0;
        this.maxHeapSize = 0;
        
        this.init();
    }

    init() {
        this.checkBrowserSupport();
        this.setupMemoryObservers();
        this.startMonitoring();
        this.setupLeakDetection();
        this.setupMemoryPressureHandling();
        this.monitorDOMNodes();
    }

    checkBrowserSupport() {
        this.hasMemoryAPI = 'memory' in performance;
        this.hasObserver = 'PerformanceObserver' in window;
        this.hasGC = 'gc' in window && typeof window.gc === 'function';
        
        if (!this.hasMemoryAPI) {
            console.warn('Memory API not supported in this browser');
        }
    }

    setupMemoryObservers() {
        if (this.hasObserver) {
            try {
                // Monitor memory-related performance entries
                const memoryObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        this.processPerformanceEntry(entry);
                    });
                });
                
                memoryObserver.observe({ 
                    entryTypes: ['measure', 'navigation', 'resource'] 
                });
                this.observers.set('memory', memoryObserver);
            } catch (e) {
                console.warn('Memory observer setup failed:', e);
            }
        }
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitorLoop();
    }

    monitorLoop() {
        if (!this.isMonitoring) return;
        
        this.collectMemoryStats();
        this.analyzeMemoryTrends();
        this.detectMemoryLeaks();
        this.checkMemoryPressure();
        
        setTimeout(() => {
            this.monitorLoop();
        }, this.monitoringInterval);
    }

    collectMemoryStats() {
        const stats = {
            timestamp: Date.now(),
            navigation: this.getNavigationMemory(),
            heap: this.getHeapMemory(),
            dom: this.getDOMMemory(),
            resources: this.getResourceMemory(),
            custom: this.getCustomMemoryUsage()
        };
        
        this.memoryStats.push(stats);
        
        // Keep only last 100 entries to prevent memory issues
        if (this.memoryStats.length > 100) {
            this.memoryStats.shift();
        }
        
        this.updateMaxHeapSize(stats.heap.used);
        return stats;
    }

    getNavigationMemory() {
        if (!this.hasMemoryAPI) return null;
        
        const memory = performance.memory;
        return {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            utilization: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        };
    }

    getHeapMemory() {
        if (!this.hasMemoryAPI) return null;
        
        const memory = performance.memory;
        const previous = this.memoryStats[this.memoryStats.length - 1];
        const growth = previous ? 
            memory.usedJSHeapSize - previous.heap?.used || 0 : 0;
        
        return {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            growth: growth,
            fragmentation: this.calculateFragmentation(memory)
        };
    }

    getDOMMemory() {
        const domStats = {
            nodes: document.querySelectorAll('*').length,
            listeners: this.estimateEventListeners(),
            stylesheets: document.styleSheets.length,
            images: document.images.length,
            scripts: document.scripts.length
        };
        
        domStats.estimatedSize = this.estimateDOMSize(domStats);
        return domStats;
    }

    getResourceMemory() {
        if (!('getEntriesByType' in performance)) return null;
        
        const resources = performance.getEntriesByType('resource');
        let totalSize = 0;
        let cachedSize = 0;
        
        resources.forEach(resource => {
            if (resource.transferSize) {
                totalSize += resource.transferSize;
                if (resource.transferSize === 0) {
                    cachedSize += resource.decodedBodySize || 0;
                }
            }
        });
        
        return {
            totalResources: resources.length,
            totalSize: totalSize,
            cachedSize: cachedSize,
            cacheEfficiency: totalSize > 0 ? (cachedSize / totalSize) * 100 : 0
        };
    }

    getCustomMemoryUsage() {
        // Track custom objects and data structures
        const customData = {
            globalObjects: this.countGlobalObjects(),
            eventListeners: this.countEventListeners(),
            timers: this.countActiveTimers(),
            observers: this.observers.size,
            weakmaps: this.countWeakMaps(),
            promises: this.countPendingPromises()
        };
        
        return customData;
    }

    analyzeMemoryTrends() {
        if (this.memoryStats.length < 5) return;
        
        const recent = this.memoryStats.slice(-5);
        const trend = this.calculateTrend(recent.map(s => s.heap?.used || 0));
        
        if (trend.slope > 1024 * 1024) { // 1MB per interval trend
            this.triggerMemoryAlert('memory_growth', {
                trend: trend.slope,
                current: recent[recent.length - 1].heap?.used || 0
            });
        }
    }

    setupLeakDetection() {
        // DOM node leak detection
        this.leakDetectors.set('dom_nodes', {
            baseline: document.querySelectorAll('*').length,
            threshold: 1000,
            check: () => this.checkDOMNodeLeaks()
        });
        
        // Event listener leak detection
        this.leakDetectors.set('event_listeners', {
            baseline: this.estimateEventListeners(),
            threshold: 100,
            check: () => this.checkEventListenerLeaks()
        });
        
        // Timer leak detection
        this.leakDetectors.set('timers', {
            baseline: this.countActiveTimers(),
            threshold: 50,
            check: () => this.checkTimerLeaks()
        });
    }

    detectMemoryLeaks() {
        this.leakDetectors.forEach((detector, type) => {
            const result = detector.check();
            if (result.leaked) {
                this.triggerMemoryAlert('memory_leak', {
                    type: type,
                    baseline: detector.baseline,
                    current: result.current,
                    leaked: result.leaked
                });
            }
        });
    }

    checkDOMNodeLeaks() {
        const current = document.querySelectorAll('*').length;
        const detector = this.leakDetectors.get('dom_nodes');
        const leaked = Math.max(0, current - detector.baseline - detector.threshold);
        
        return {
            current: current,
            leaked: leaked > 0 ? leaked : false
        };
    }

    checkEventListenerLeaks() {
        const current = this.estimateEventListeners();
        const detector = this.leakDetectors.get('event_listeners');
        const leaked = Math.max(0, current - detector.baseline - detector.threshold);
        
        return {
            current: current,
            leaked: leaked > 0 ? leaked : false
        };
    }

    checkTimerLeaks() {
        const current = this.countActiveTimers();
        const detector = this.leakDetectors.get('timers');
        const leaked = Math.max(0, current - detector.baseline - detector.threshold);
        
        return {
            current: current,
            leaked: leaked > 0 ? leaked : false
        };
    }

    setupMemoryPressureHandling() {
        // Listen for memory pressure events (if supported)
        if ('onmemorywarning' in window) {
            window.addEventListener('memorywarning', () => {
                this.handleMemoryPressure('system');
            });
        }
        
        // Monitor for custom memory pressure
        this.setupCustomMemoryPressure();
    }

    setupCustomMemoryPressure() {
        setInterval(() => {
            const currentMemory = this.getCurrentMemoryUsage();
            if (currentMemory > this.thresholds.critical) {
                this.handleMemoryPressure('critical');
            } else if (currentMemory > this.thresholds.warning) {
                this.handleMemoryPressure('warning');
            }
        }, 10000); // Check every 10 seconds
    }

    handleMemoryPressure(level) {
        console.warn(`Memory pressure detected: ${level}`);
        
        // Execute registered callbacks
        this.memoryPressureCallbacks.forEach(callback => {
            try {
                callback(level);
            } catch (e) {
                console.error('Memory pressure callback failed:', e);
            }
        });
        
        // Built-in optimization strategies
        this.executeMemoryOptimizations(level);
    }

    executeMemoryOptimizations(level) {
        switch (level) {
            case 'warning':
                this.clearUnusedCaches();
                this.optimizeImages();
                break;
            case 'critical':
                this.clearUnusedCaches();
                this.optimizeImages();
                this.clearEventListeners();
                this.clearTimers();
                break;
            case 'severe':
                this.aggressiveCleanup();
                break;
        }
    }

    clearUnusedCaches() {
        // Clear browser caches if possible
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    if (cacheName.includes('temp') || cacheName.includes('old')) {
                        caches.delete(cacheName);
                    }
                });
            });
        }
        
        // Clear application-level caches
        this.clearApplicationCaches();
    }

    clearApplicationCaches() {
        // Clear localStorage items older than 7 days
        const now = Date.now();
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            const item = localStorage.getItem(key);
            
            try {
                const data = JSON.parse(item);
                if (data.timestamp && (now - data.timestamp) > weekInMs) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Not JSON, skip
            }
        }
    }

    optimizeImages() {
        // Remove high-resolution images outside viewport
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight + 1000 && 
                             rect.bottom > -1000;
            
            if (!isVisible && img.src && img.src.includes('high-res')) {
                img.src = img.src.replace('high-res', 'low-res');
            }
        });
    }

    clearEventListeners() {
        // Clean up orphaned event listeners
        const elements = document.querySelectorAll('[data-listeners]');
        elements.forEach(element => {
            if (!element.isConnected) {
                // Element is detached, likely has orphaned listeners
                element.removeEventListener?.();
            }
        });
    }

    clearTimers() {
        // This is a simplified approach - in real apps, you'd track timers
        console.warn('Consider clearing unused timers and intervals');
    }

    aggressiveCleanup() {
        this.clearUnusedCaches();
        this.optimizeImages();
        this.clearEventListeners();
        this.clearTimers();
        
        // Force garbage collection if available
        if (this.hasGC) {
            try {
                window.gc();
                this.gcCount++;
            } catch (e) {
                console.warn('GC call failed:', e);
            }
        }
        
        // Clear performance entries
        if ('clearResourceTimings' in performance) {
            performance.clearResourceTimings();
        }
    }

    monitorDOMNodes() {
        if ('MutationObserver' in window) {
            const domObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        this.trackDOMChanges(mutation);
                    }
                });
            });
            
            domObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            this.observers.set('dom', domObserver);
        }
    }

    trackDOMChanges(mutation) {
        const addedNodes = mutation.addedNodes.length;
        const removedNodes = mutation.removedNodes.length;
        
        if (addedNodes > 10 || removedNodes > 10) {
            console.debug(`Large DOM change: +${addedNodes}, -${removedNodes} nodes`);
        }
    }

    // Utility methods for memory calculations
    calculateFragmentation(memory) {
        return ((memory.totalJSHeapSize - memory.usedJSHeapSize) / 
                memory.totalJSHeapSize) * 100;
    }

    estimateDOMSize(domStats) {
        // Rough estimation of DOM memory usage
        const nodeSize = 100; // Average bytes per node
        const listenerSize = 50; // Average bytes per listener
        const imageSize = 1000; // Average bytes per image reference
        
        return (domStats.nodes * nodeSize) + 
               (domStats.listeners * listenerSize) + 
               (domStats.images * imageSize);
    }

    estimateEventListeners() {
        // Estimate number of event listeners
        let count = 0;
        const elements = document.querySelectorAll('*');
        
        elements.forEach(element => {
            // Check for common event attributes
            const events = ['onclick', 'onload', 'onchange', 'onsubmit'];
            events.forEach(event => {
                if (element[event]) count++;
            });
        });
        
        return count;
    }

    countGlobalObjects() {
        let count = 0;
        for (let prop in window) {
            if (window.hasOwnProperty(prop)) {
                count++;
            }
        }
        return count;
    }

    countEventListeners() {
        // This is a simplified estimation
        return this.estimateEventListeners();
    }

    countActiveTimers() {
        // This is tricky to measure accurately
        // Return an estimation based on common patterns
        return 0; // Would need custom timer tracking
    }

    countWeakMaps() {
        // Count WeakMap instances (if trackable)
        return 0; // Would need custom tracking
    }

    countPendingPromises() {
        // Count pending promises (if trackable)
        return 0; // Would need custom tracking
    }

    calculateTrend(values) {
        if (values.length < 2) return { slope: 0, correlation: 0 };
        
        const n = values.length;
        const sumX = n * (n - 1) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
        const sumXX = n * (n - 1) * (2 * n - 1) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        return { slope, correlation: 1 }; // Simplified correlation
    }

    getCurrentMemoryUsage() {
        if (!this.hasMemoryAPI) return 0;
        return performance.memory.usedJSHeapSize;
    }

    updateMaxHeapSize(currentSize) {
        if (currentSize > this.maxHeapSize) {
            this.maxHeapSize = currentSize;
        }
    }

    triggerMemoryAlert(type, data) {
        const alert = {
            type,
            data,
            timestamp: Date.now(),
            severity: this.calculateSeverity(data)
        };
        
        console.warn('Memory Alert:', alert);
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('memoryAlert', {
            detail: alert
        }));
    }

    calculateSeverity(data) {
        const current = data.current || this.getCurrentMemoryUsage();
        
        if (current > this.thresholds.severe) return 'severe';
        if (current > this.thresholds.critical) return 'critical';
        if (current > this.thresholds.warning) return 'warning';
        return 'info';
    }

    processPerformanceEntry(entry) {
        // Process performance entries for memory insights
        if (entry.name && entry.duration > 100) {
            console.debug(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        }
    }

    // Public API methods
    getMemoryStats() {
        return {
            current: this.getCurrentMemoryUsage(),
            max: this.maxHeapSize,
            stats: this.memoryStats.slice(-10), // Last 10 entries
            thresholds: this.thresholds,
            gcCount: this.gcCount
        };
    }

    getMemoryReport() {
        const current = this.collectMemoryStats();
        return {
            summary: {
                heapUsed: current.heap?.used || 0,
                heapUtilization: current.heap?.utilization || 0,
                domNodes: current.dom.nodes,
                resources: current.resources?.totalResources || 0
            },
            trends: this.analyzeTrends(),
            alerts: this.getRecentAlerts(),
            optimizations: this.getOptimizationSuggestions()
        };
    }

    analyzeTrends() {
        if (this.memoryStats.length < 5) return null;
        
        const heapValues = this.memoryStats.map(s => s.heap?.used || 0);
        const domValues = this.memoryStats.map(s => s.dom.nodes);
        
        return {
            heap: this.calculateTrend(heapValues),
            dom: this.calculateTrend(domValues)
        };
    }

    getRecentAlerts() {
        // Would need to track alerts in a separate array
        return [];
    }

    getOptimizationSuggestions() {
        const suggestions = [];
        const current = this.getCurrentMemoryUsage();
        
        if (current > this.thresholds.warning) {
            suggestions.push({
                type: 'cache_cleanup',
                priority: 'high',
                description: 'Clear unused caches to free memory'
            });
        }
        
        const domNodes = document.querySelectorAll('*').length;
        if (domNodes > 5000) {
            suggestions.push({
                type: 'dom_optimization',
                priority: 'medium',
                description: 'Consider lazy loading or virtual scrolling for large DOM trees'
            });
        }
        
        return suggestions;
    }

    onMemoryPressure(callback) {
        this.memoryPressureCallbacks.add(callback);
        return () => this.memoryPressureCallbacks.delete(callback);
    }

    forceCleanup() {
        this.executeMemoryOptimizations('critical');
    }

    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    stopMonitoring() {
        this.isMonitoring = false;
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (e) {
                console.warn('Failed to disconnect observer:', e);
            }
        });
        this.observers.clear();
    }

    exportData() {
        return {
            memoryStats: this.memoryStats,
            thresholds: this.thresholds,
            maxHeapSize: this.maxHeapSize,
            gcCount: this.gcCount,
            browserSupport: {
                hasMemoryAPI: this.hasMemoryAPI,
                hasObserver: this.hasObserver,
                hasGC: this.hasGC
            },
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const memoryMonitor = new MemoryMonitor();
export default memoryMonitor;