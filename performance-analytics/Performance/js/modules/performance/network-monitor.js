/**
 * Network Monitor Module
 * Monitors network performance, connection quality, and resource loading
 */

class NetworkMonitor {
    constructor() {
        this.connectionInfo = null;
        this.networkRequests = new Map();
        this.performanceEntries = [];
        this.connectionHistory = [];
        this.onlineStatus = navigator.onLine;
        this.bandwidthHistory = [];
        this.latencyHistory = [];
        this.isMonitoring = false;
        
        this.thresholds = {
            fastConnection: 10, // Mbps
            slowConnection: 1,  // Mbps
            highLatency: 200,   // ms
            veryHighLatency: 500, // ms
            largeResource: 1024 * 1024, // 1MB
            slowResource: 5000 // 5 seconds
        };
        
        this.stats = {
            totalRequests: 0,
            failedRequests: 0,
            totalBytes: 0,
            averageLatency: 0,
            averageBandwidth: 0,
            cacheHitRate: 0,
            connectionChanges: 0
        };
        
        this.init();
    }

    init() {
        this.setupConnectionMonitoring();
        this.setupResourceMonitoring();
        this.setupOnlineStatusMonitoring();
        this.startPeriodicMonitoring();
        this.monitorNetworkTiming();
    }

    setupConnectionMonitoring() {
        // Monitor connection changes
        if ('connection' in navigator) {
            this.connectionInfo = navigator.connection;
            this.updateConnectionInfo();
            
            // Listen for connection changes
            this.connectionInfo.addEventListener('change', () => {
                this.handleConnectionChange();
            });
        }
    }

    updateConnectionInfo() {
        if (!this.connectionInfo) return null;
        
        const info = {
            effectiveType: this.connectionInfo.effectiveType,
            downlink: this.connectionInfo.downlink,
            downlinkMax: this.connectionInfo.downlinkMax,
            rtt: this.connectionInfo.rtt,
            saveData: this.connectionInfo.saveData,
            type: this.connectionInfo.type,
            timestamp: Date.now()
        };
        
        this.connectionHistory.push(info);
        
        // Keep only last 50 entries
        if (this.connectionHistory.length > 50) {
            this.connectionHistory.shift();
        }
        
        this.analyzeBandwidth(info);
        this.analyzeLatency(info);
        
        return info;
    }

    handleConnectionChange() {
        this.stats.connectionChanges++;
        const newInfo = this.updateConnectionInfo();
        
        console.debug('Connection changed:', newInfo);
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('networkChange', {
            detail: {
                connectionInfo: newInfo,
                changeCount: this.stats.connectionChanges
            }
        }));
        
        // Adapt to new connection
        this.adaptToConnection(newInfo);
    }

    adaptToConnection(connectionInfo) {
        if (!connectionInfo) return;
        
        const { effectiveType, saveData } = connectionInfo;
        
        // Suggest optimizations based on connection
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            this.suggestLowBandwidthOptimizations();
        } else if (effectiveType === '3g') {
            this.suggestModerateBandwidthOptimizations();
        }
        
        if (saveData) {
            this.suggestDataSavingOptimizations();
        }
    }

    setupResourceMonitoring() {
        if ('PerformanceObserver' in window) {
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.analyzeResourceEntry(entry);
                    });
                });
                
                resourceObserver.observe({ entryTypes: ['resource'] });
            } catch (e) {
                console.warn('Resource observer not supported:', e);
            }
        }
        
        // Fallback: monitor existing performance entries
        this.processExistingResourceEntries();
    }

    processExistingResourceEntries() {
        const entries = performance.getEntriesByType('resource');
        entries.forEach(entry => {
            this.analyzeResourceEntry(entry);
        });
    }

    analyzeResourceEntry(entry) {
        const request = {
            name: entry.name,
            type: this.getResourceType(entry.name),
            startTime: entry.startTime,
            duration: entry.duration,
            size: entry.transferSize || entry.decodedBodySize || 0,
            cached: this.isCachedResource(entry),
            protocol: entry.nextHopProtocol,
            timing: this.extractTiming(entry),
            timestamp: Date.now()
        };
        
        this.networkRequests.set(entry.name, request);
        this.performanceEntries.push(request);
        
        // Keep only last 200 entries
        if (this.performanceEntries.length > 200) {
            this.performanceEntries.shift();
        }
        
        this.updateStats(request);
        this.analyzeRequestPerformance(request);
    }

    extractTiming(entry) {
        return {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            ssl: entry.secureConnectionStart > 0 ? 
                entry.connectEnd - entry.secureConnectionStart : 0,
            request: entry.responseStart - entry.requestStart,
            response: entry.responseEnd - entry.responseStart,
            total: entry.responseEnd - entry.startTime
        };
    }

    updateStats(request) {
        this.stats.totalRequests++;
        this.stats.totalBytes += request.size;
        
        if (request.cached) {
            // Update cache hit rate
            const cachedRequests = this.performanceEntries.filter(r => r.cached).length;
            this.stats.cacheHitRate = (cachedRequests / this.stats.totalRequests) * 100;
        }
        
        // Update average latency
        if (request.timing.request > 0) {
            const totalLatency = this.performanceEntries
                .filter(r => r.timing.request > 0)
                .reduce((sum, r) => sum + r.timing.request, 0);
            
            const validRequests = this.performanceEntries
                .filter(r => r.timing.request > 0).length;
            
            this.stats.averageLatency = totalLatency / validRequests;
        }
    }

    analyzeRequestPerformance(request) {
        // Check for slow resources
        if (request.duration > this.thresholds.slowResource) {
            this.reportSlowResource(request);
        }
        
        // Check for large resources
        if (request.size > this.thresholds.largeResource) {
            this.reportLargeResource(request);
        }
        
        // Check for high latency
        if (request.timing.request > this.thresholds.highLatency) {
            this.reportHighLatency(request);
        }
    }

    setupOnlineStatusMonitoring() {
        window.addEventListener('online', () => {
            this.handleOnlineStatusChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.handleOnlineStatusChange(false);
        });
    }

    handleOnlineStatusChange(isOnline) {
        this.onlineStatus = isOnline;
        
        console.debug(`Network status changed: ${isOnline ? 'Online' : 'Offline'}`);
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('onlineStatusChange', {
            detail: { isOnline }
        }));
        
        if (isOnline) {
            this.handleReconnection();
        } else {
            this.handleDisconnection();
        }
    }

    handleReconnection() {
        // Re-test connection quality
        this.testConnectionQuality();
        
        // Retry failed requests if any
        this.retryFailedRequests();
    }

    handleDisconnection() {
        // Cache current state for offline functionality
        this.cacheCurrentState();
    }

    startPeriodicMonitoring() {
        this.isMonitoring = true;
        this.monitoringLoop();
    }

    monitoringLoop() {
        if (!this.isMonitoring) return;
        
        this.updateConnectionInfo();
        this.measureBandwidth();
        this.testLatency();
        this.analyzeNetworkTrends();
        
        setTimeout(() => {
            this.monitoringLoop();
        }, 10000); // Every 10 seconds
    }

    measureBandwidth() {
        if (!this.connectionInfo || !this.connectionInfo.downlink) return;
        
        const bandwidth = this.connectionInfo.downlink;
        this.bandwidthHistory.push({
            value: bandwidth,
            timestamp: Date.now()
        });
        
        // Keep only last 20 measurements
        if (this.bandwidthHistory.length > 20) {
            this.bandwidthHistory.shift();
        }
        
        // Calculate average
        const totalBandwidth = this.bandwidthHistory.reduce((sum, b) => sum + b.value, 0);
        this.stats.averageBandwidth = totalBandwidth / this.bandwidthHistory.length;
    }

    testLatency() {
        if (!navigator.onLine) return;
        
        const startTime = performance.now();
        const testUrl = '/api/ping?' + Date.now(); // Cache busting
        
        fetch(testUrl, { 
            method: 'HEAD',
            cache: 'no-cache'
        })
        .then(() => {
            const latency = performance.now() - startTime;
            this.recordLatency(latency);
        })
        .catch(() => {
            // Ping failed, might indicate network issues
            this.recordLatency(null);
        });
    }

    recordLatency(latency) {
        if (latency !== null) {
            this.latencyHistory.push({
                value: latency,
                timestamp: Date.now()
            });
            
            // Keep only last 20 measurements
            if (this.latencyHistory.length > 20) {
                this.latencyHistory.shift();
            }
            
            // Update average
            const totalLatency = this.latencyHistory.reduce((sum, l) => sum + l.value, 0);
            this.stats.averageLatency = totalLatency / this.latencyHistory.length;
        }
    }

    testConnectionQuality() {
        const quality = {
            bandwidth: this.stats.averageBandwidth,
            latency: this.stats.averageLatency,
            stability: this.calculateConnectionStability(),
            effectiveType: this.connectionInfo?.effectiveType
        };
        
        quality.score = this.calculateQualityScore(quality);
        quality.rating = this.getQualityRating(quality.score);
        
        return quality;
    }

    calculateConnectionStability() {
        if (this.connectionHistory.length < 5) return 100;
        
        const recent = this.connectionHistory.slice(-10);
        const typeChanges = recent.reduce((changes, info, index) => {
            if (index > 0 && info.effectiveType !== recent[index - 1].effectiveType) {
                changes++;
            }
            return changes;
        }, 0);
        
        return Math.max(0, 100 - (typeChanges * 20));
    }

    calculateQualityScore(quality) {
        let score = 100;
        
        // Bandwidth score (40% weight)
        if (quality.bandwidth < this.thresholds.slowConnection) {
            score -= 40;
        } else if (quality.bandwidth < this.thresholds.fastConnection) {
            score -= 20;
        }
        
        // Latency score (40% weight)
        if (quality.latency > this.thresholds.veryHighLatency) {
            score -= 40;
        } else if (quality.latency > this.thresholds.highLatency) {
            score -= 20;
        }
        
        // Stability score (20% weight)
        score = score * (quality.stability / 100);
        
        return Math.max(0, Math.round(score));
    }

    getQualityRating(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        if (score >= 20) return 'poor';
        return 'very-poor';
    }

    analyzeBandwidth(connectionInfo) {
        if (!connectionInfo.downlink) return;
        
        const bandwidth = connectionInfo.downlink;
        
        if (bandwidth < this.thresholds.slowConnection) {
            this.triggerNetworkAlert('slow_connection', {
                bandwidth: bandwidth,
                threshold: this.thresholds.slowConnection
            });
        }
    }

    analyzeLatency(connectionInfo) {
        if (!connectionInfo.rtt) return;
        
        const latency = connectionInfo.rtt;
        
        if (latency > this.thresholds.veryHighLatency) {
            this.triggerNetworkAlert('high_latency', {
                latency: latency,
                threshold: this.thresholds.veryHighLatency
            });
        }
    }

    analyzeNetworkTrends() {
        // Analyze trends in bandwidth and latency
        if (this.bandwidthHistory.length >= 5) {
            const trend = this.calculateTrend(this.bandwidthHistory.map(b => b.value));
            if (trend < -0.5) { // Significant downward trend
                this.triggerNetworkAlert('bandwidth_degradation', { trend });
            }
        }
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = n * (n - 1) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
        const sumXX = n * (n - 1) * (2 * n - 1) / 6;
        
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    monitorNetworkTiming() {
        // Monitor navigation timing for network insights
        if ('getEntriesByType' in performance) {
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries.length > 0) {
                this.analyzeNavigationTiming(navEntries[0]);
            }
        }
    }

    analyzeNavigationTiming(entry) {
        const timing = {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            ssl: entry.secureConnectionStart > 0 ? 
                entry.connectEnd - entry.secureConnectionStart : 0,
            ttfb: entry.responseStart - entry.requestStart,
            download: entry.responseEnd - entry.responseStart
        };
        
        // Report slow network operations
        if (timing.dns > 200) {
            this.reportSlowDNS(timing.dns);
        }
        
        if (timing.tcp > 500) {
            this.reportSlowTCP(timing.tcp);
        }
        
        if (timing.ttfb > 1000) {
            this.reportSlowTTFB(timing.ttfb);
        }
    }

    // Utility methods
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
            'mp3': 'audio'
        };
        
        return typeMap[ext] || 'other';
    }

    isCachedResource(entry) {
        return entry.transferSize === 0 && entry.decodedBodySize > 0;
    }

    // Alert and reporting methods
    triggerNetworkAlert(type, data) {
        const alert = {
            type,
            data,
            timestamp: Date.now(),
            severity: this.getAlertSeverity(type)
        };
        
        console.warn('Network Alert:', alert);
        
        document.dispatchEvent(new CustomEvent('networkAlert', {
            detail: alert
        }));
    }

    getAlertSeverity(type) {
        const severityMap = {
            'slow_connection': 'medium',
            'high_latency': 'high',
            'bandwidth_degradation': 'medium',
            'large_resource': 'low',
            'slow_resource': 'medium'
        };
        
        return severityMap[type] || 'low';
    }

    reportSlowResource(request) {
        console.warn(`Slow resource: ${request.name} took ${request.duration}ms`);
    }

    reportLargeResource(request) {
        console.warn(`Large resource: ${request.name} is ${(request.size / 1024 / 1024).toFixed(2)}MB`);
    }

    reportHighLatency(request) {
        console.warn(`High latency: ${request.name} has ${request.timing.request}ms latency`);
    }

    reportSlowDNS(time) {
        console.warn(`Slow DNS lookup: ${time}ms`);
    }

    reportSlowTCP(time) {
        console.warn(`Slow TCP connection: ${time}ms`);
    }

    reportSlowTTFB(time) {
        console.warn(`Slow TTFB: ${time}ms`);
    }

    // Optimization suggestions
    suggestLowBandwidthOptimizations() {
        console.info('Low bandwidth detected. Consider: image compression, lazy loading, resource prioritization');
    }

    suggestModerateBandwidthOptimizations() {
        console.info('Moderate bandwidth detected. Consider: prefetching critical resources');
    }

    suggestDataSavingOptimizations() {
        console.info('Data saving mode detected. Consider: reduced image quality, defer non-critical resources');
    }

    // Public API
    getConnectionInfo() {
        return this.connectionInfo ? {
            ...this.connectionInfo,
            quality: this.testConnectionQuality()
        } : null;
    }

    getNetworkStats() {
        return {
            ...this.stats,
            onlineStatus: this.onlineStatus,
            connectionQuality: this.testConnectionQuality(),
            recentRequests: this.performanceEntries.slice(-10)
        };
    }

    getNetworkReport() {
        return {
            connection: this.getConnectionInfo(),
            stats: this.getNetworkStats(),
            performance: {
                slowestResources: this.getSlowestResources(),
                largestResources: this.getLargestResources(),
                failedRequests: this.getFailedRequests()
            },
            recommendations: this.getOptimizationRecommendations()
        };
    }

    getSlowestResources() {
        return this.performanceEntries
            .filter(r => r.duration > 0)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5);
    }

    getLargestResources() {
        return this.performanceEntries
            .filter(r => r.size > 0)
            .sort((a, b) => b.size - a.size)
            .slice(0, 5);
    }

    getFailedRequests() {
        return this.performanceEntries
            .filter(r => r.duration === 0 || r.size === 0);
    }

    getOptimizationRecommendations() {
        const recommendations = [];
        const quality = this.testConnectionQuality();
        
        if (quality.bandwidth < this.thresholds.fastConnection) {
            recommendations.push({
                type: 'bandwidth_optimization',
                priority: 'high',
                message: 'Optimize images and enable compression for slow connections'
            });
        }
        
        if (this.stats.cacheHitRate < 80) {
            recommendations.push({
                type: 'caching',
                priority: 'medium',
                message: 'Improve caching strategy to reduce network requests'
            });
        }
        
        const largeResources = this.getLargestResources();
        if (largeResources.length > 0 && largeResources[0].size > this.thresholds.largeResource) {
            recommendations.push({
                type: 'resource_optimization',
                priority: 'medium',
                message: 'Consider code splitting or lazy loading for large resources'
            });
        }
        
        return recommendations;
    }

    // Additional utility methods
    retryFailedRequests() {
        // Implementation would depend on application architecture
        console.debug('Retrying failed requests after reconnection');
    }

    cacheCurrentState() {
        // Cache important data for offline use
        const state = {
            timestamp: Date.now(),
            connectionInfo: this.connectionInfo,
            stats: this.stats
        };
        
        try {
            localStorage.setItem('networkState', JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to cache network state:', e);
        }
    }

    stopMonitoring() {
        this.isMonitoring = false;
    }

    exportData() {
        return {
            connectionInfo: this.connectionInfo,
            connectionHistory: this.connectionHistory,
            performanceEntries: this.performanceEntries,
            bandwidthHistory: this.bandwidthHistory,
            latencyHistory: this.latencyHistory,
            stats: this.stats,
            report: this.getNetworkReport(),
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const networkMonitor = new NetworkMonitor();
export default networkMonitor;