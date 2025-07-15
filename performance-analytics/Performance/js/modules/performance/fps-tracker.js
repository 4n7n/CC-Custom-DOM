/**
 * FPS Tracker Module
 * Monitors frame rate, detects jank, and provides performance insights
 */

class FPSTracker {
    constructor() {
        this.isTracking = false;
        this.frameCount = 0;
        this.lastTime = 0;
        this.startTime = 0;
        this.fps = 0;
        this.averageFPS = 0;
        this.minFPS = Infinity;
        this.maxFPS = 0;
        this.frameHistory = [];
        this.jankEvents = [];
        this.smoothnessScore = 100;
        
        this.thresholds = {
            excellent: 58,
            good: 45,
            poor: 30,
            jank: 16.67 * 2 // 2 frame drops
        };
        
        this.settings = {
            historySize: 100,
            jankThreshold: 2, // frames
            smoothingWindow: 10,
            alertOnJank: true,
            trackLongTasks: true
        };
        
        this.callbacks = {
            onFPSUpdate: new Set(),
            onJank: new Set(),
            onSmoothness: new Set()
        };
        
        this.longTaskObserver = null;
        this.init();
    }

    init() {
        this.setupLongTaskObserver();
        this.setupPerformanceObserver();
        this.bindEvents();
    }

    setupLongTaskObserver() {
        if ('PerformanceObserver' in window) {
            try {
                this.longTaskObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.trackLongTask(entry);
                    });
                });
                
                this.longTaskObserver.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                console.warn('Long task observer not supported:', e);
            }
        }
    }

    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            try {
                const paintObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.trackPaintTiming(entry);
                    });
                });
                
                paintObserver.observe({ entryTypes: ['paint'] });
            } catch (e) {
                console.warn('Paint observer not supported:', e);
            }
        }
    }

    bindEvents() {
        // Track FPS during user interactions
        document.addEventListener('scroll', () => {
            if (!this.isTracking) this.start();
        });
        
        document.addEventListener('click', () => {
            if (!this.isTracking) this.start();
        });
        
        // Stop tracking during idle periods
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }

    start() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.startTime = performance.now();
        this.lastTime = this.startTime;
        this.frameCount = 0;
        
        this.trackFrame();
    }

    trackFrame() {
        if (!this.isTracking) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        
        this.frameCount++;
        
        // Calculate instantaneous FPS
        if (deltaTime > 0) {
            const instantFPS = 1000 / deltaTime;
            this.updateFPSMetrics(instantFPS, deltaTime);
        }
        
        this.lastTime = currentTime;
        
        // Continue tracking
        requestAnimationFrame(() => this.trackFrame());
    }

    updateFPSMetrics(instantFPS, deltaTime) {
        this.fps = instantFPS;
        
        // Update min/max
        if (instantFPS < this.minFPS) this.minFPS = instantFPS;
        if (instantFPS > this.maxFPS) this.maxFPS = instantFPS;
        
        // Add to history
        this.frameHistory.push({
            fps: instantFPS,
            deltaTime: deltaTime,
            timestamp: performance.now()
        });
        
        // Maintain history size
        if (this.frameHistory.length > this.settings.historySize) {
            this.frameHistory.shift();
        }
        
        // Calculate smoothed average
        this.calculateAverageFPS();
        
        // Detect jank
        this.detectJank(deltaTime);
        
        // Update smoothness score
        this.updateSmoothnessScore();
        
        // Trigger callbacks
        this.triggerFPSCallbacks();
    }

    calculateAverageFPS() {
        if (this.frameHistory.length === 0) return;
        
        const windowSize = Math.min(this.settings.smoothingWindow, this.frameHistory.length);
        const recentFrames = this.frameHistory.slice(-windowSize);
        
        const totalFPS = recentFrames.reduce((sum, frame) => sum + frame.fps, 0);
        this.averageFPS = totalFPS / recentFrames.length;
    }

    detectJank(deltaTime) {
        const targetFrameTime = 16.67; // 60 FPS target
        const isJank = deltaTime > (targetFrameTime * this.settings.jankThreshold);
        
        if (isJank) {
            const jankEvent = {
                timestamp: performance.now(),
                deltaTime: deltaTime,
                droppedFrames: Math.floor(deltaTime / targetFrameTime) - 1,
                severity: this.calculateJankSeverity(deltaTime)
            };
            
            this.jankEvents.push(jankEvent);
            
            // Maintain jank event history
            if (this.jankEvents.length > 50) {
                this.jankEvents.shift();
            }
            
            if (this.settings.alertOnJank) {
                this.triggerJankCallbacks(jankEvent);
            }
        }
    }

    calculateJankSeverity(deltaTime) {
        if (deltaTime > 100) return 'severe';
        if (deltaTime > 50) return 'high';
        if (deltaTime > 33.33) return 'medium';
        return 'low';
    }

    updateSmoothnessScore() {
        if (this.frameHistory.length < 10) return;
        
        const recentFrames = this.frameHistory.slice(-20);
        let jankFrames = 0;
        let totalVariance = 0;
        
        recentFrames.forEach((frame, index) => {
            if (frame.deltaTime > 33.33) jankFrames++;
            
            if (index > 0) {
                const variance = Math.abs(frame.deltaTime - recentFrames[index - 1].deltaTime);
                totalVariance += variance;
            }
        });
        
        const jankRatio = jankFrames / recentFrames.length;
        const averageVariance = totalVariance / (recentFrames.length - 1);
        
        // Calculate smoothness score (0-100)
        this.smoothnessScore = Math.max(0, 100 - (jankRatio * 50) - (averageVariance * 2));
        
        this.triggerSmoothnessCallbacks();
    }

    trackLongTask(entry) {
        const longTaskEvent = {
            timestamp: entry.startTime,
            duration: entry.duration,
            attribution: entry.attribution ? entry.attribution.map(attr => ({
                name: attr.name,
                entryType: attr.entryType,
                startTime: attr.startTime,
                duration: attr.duration
            })) : null
        };
        
        // Long tasks can cause jank
        this.jankEvents.push({
            timestamp: entry.startTime,
            deltaTime: entry.duration,
            droppedFrames: Math.floor(entry.duration / 16.67),
            severity: this.calculateJankSeverity(entry.duration),
            type: 'long-task',
            attribution: longTaskEvent.attribution
        });
    }

    trackPaintTiming(entry) {
        const paintEvent = {
            name: entry.name,
            startTime: entry.startTime,
            timestamp: performance.now()
        };
        
        // Track paint performance impact on FPS
        if (entry.name === 'first-contentful-paint') {
            this.trackPaintImpact('FCP', entry.startTime);
        } else if (entry.name === 'first-paint') {
            this.trackPaintImpact('FP', entry.startTime);
        }
    }

    trackPaintImpact(paintType, startTime) {
        // Analyze FPS around paint events
        const paintImpact = {
            type: paintType,
            startTime: startTime,
            fpsBeforePaint: this.getAverageFPS(-5, -1),
            fpsAfterPaint: this.getAverageFPS(1, 5)
        };
        
        console.debug(`Paint impact for ${paintType}:`, paintImpact);
    }

    getAverageFPS(startOffset = 0, endOffset = -1) {
        if (this.frameHistory.length === 0) return 0;
        
        const startIndex = Math.max(0, this.frameHistory.length + startOffset);
        const endIndex = endOffset < 0 ? 
            this.frameHistory.length + endOffset + 1 : 
            Math.min(this.frameHistory.length, startOffset + endOffset);
        
        const frames = this.frameHistory.slice(startIndex, endIndex);
        if (frames.length === 0) return 0;
        
        const totalFPS = frames.reduce((sum, frame) => sum + frame.fps, 0);
        return totalFPS / frames.length;
    }

    pause() {
        this.isTracking = false;
    }

    resume() {
        if (!this.isTracking) {
            this.start();
        }
    }

    stop() {
        this.isTracking = false;
        this.reset();
    }

    reset() {
        this.frameCount = 0;
        this.lastTime = 0;
        this.startTime = 0;
        this.fps = 0;
        this.averageFPS = 0;
        this.minFPS = Infinity;
        this.maxFPS = 0;
        this.frameHistory = [];
        this.jankEvents = [];
        this.smoothnessScore = 100;
    }

    // Performance analysis methods
    getPerformanceGrade() {
        if (this.averageFPS >= this.thresholds.excellent) return 'A';
        if (this.averageFPS >= this.thresholds.good) return 'B';
        if (this.averageFPS >= this.thresholds.poor) return 'C';
        return 'D';
    }

    getJankFrequency() {
        if (this.jankEvents.length === 0 || this.frameHistory.length === 0) return 0;
        
        const timeSpan = this.frameHistory[this.frameHistory.length - 1].timestamp - 
                        this.frameHistory[0].timestamp;
        
        return (this.jankEvents.length / (timeSpan / 1000)) * 60; // Per minute
    }

    getFrameDropRatio() {
        if (this.frameHistory.length === 0) return 0;
        
        const droppedFrames = this.jankEvents.reduce((sum, jank) => 
            sum + (jank.droppedFrames || 0), 0);
        
        return droppedFrames / (this.frameHistory.length + droppedFrames);
    }

    getPerformanceInsights() {
        return {
            grade: this.getPerformanceGrade(),
            smoothnessScore: Math.round(this.smoothnessScore),
            jankFrequency: this.getJankFrequency().toFixed(2),
            frameDropRatio: (this.getFrameDropRatio() * 100).toFixed(2),
            recommendations: this.getRecommendations()
        };
    }

    getRecommendations() {
        const recommendations = [];
        
        if (this.averageFPS < this.thresholds.good) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Consider optimizing animations and reducing DOM complexity'
            });
        }
        
        if (this.getJankFrequency() > 5) {
            recommendations.push({
                type: 'jank',
                priority: 'high',
                message: 'Frequent frame drops detected. Check for long-running tasks'
            });
        }
        
        if (this.smoothnessScore < 70) {
            recommendations.push({
                type: 'smoothness',
                priority: 'medium',
                message: 'Frame timing is inconsistent. Consider using CSS transforms for animations'
            });
        }
        
        const longTasks = this.jankEvents.filter(jank => jank.type === 'long-task');
        if (longTasks.length > 0) {
            recommendations.push({
                type: 'long-tasks',
                priority: 'high',
                message: 'Long tasks detected. Consider breaking work into smaller chunks'
            });
        }
        
        return recommendations;
    }

    // Callback management
    onFPSUpdate(callback) {
        this.callbacks.onFPSUpdate.add(callback);
        return () => this.callbacks.onFPSUpdate.delete(callback);
    }

    onJank(callback) {
        this.callbacks.onJank.add(callback);
        return () => this.callbacks.onJank.delete(callback);
    }

    onSmoothness(callback) {
        this.callbacks.onSmoothness.add(callback);
        return () => this.callbacks.onSmoothness.delete(callback);
    }

    triggerFPSCallbacks() {
        this.callbacks.onFPSUpdate.forEach(callback => {
            try {
                callback({
                    fps: this.fps,
                    averageFPS: this.averageFPS,
                    minFPS: this.minFPS,
                    maxFPS: this.maxFPS
                });
            } catch (e) {
                console.error('FPS callback error:', e);
            }
        });
    }

    triggerJankCallbacks(jankEvent) {
        this.callbacks.onJank.forEach(callback => {
            try {
                callback(jankEvent);
            } catch (e) {
                console.error('Jank callback error:', e);
            }
        });
    }

    triggerSmoothnessCallbacks() {
        this.callbacks.onSmoothness.forEach(callback => {
            try {
                callback({
                    score: this.smoothnessScore,
                    grade: this.getPerformanceGrade()
                });
            } catch (e) {
                console.error('Smoothness callback error:', e);
            }
        });
    }

    // Public API
    getStats() {
        return {
            fps: Math.round(this.fps),
            averageFPS: Math.round(this.averageFPS),
            minFPS: this.minFPS === Infinity ? 0 : Math.round(this.minFPS),
            maxFPS: Math.round(this.maxFPS),
            frameCount: this.frameCount,
            jankEvents: this.jankEvents.length,
            smoothnessScore: Math.round(this.smoothnessScore),
            isTracking: this.isTracking
        };
    }

    getDetailedStats() {
        return {
            ...this.getStats(),
            frameHistory: this.frameHistory.slice(-20), // Last 20 frames
            jankEvents: this.jankEvents.slice(-10), // Last 10 jank events
            insights: this.getPerformanceInsights(),
            thresholds: this.thresholds
        };
    }

    exportData() {
        return {
            stats: this.getStats(),
            frameHistory: this.frameHistory,
            jankEvents: this.jankEvents,
            insights: this.getPerformanceInsights(),
            settings: this.settings,
            thresholds: this.thresholds,
            timestamp: Date.now()
        };
    }

    // Configuration methods
    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    // Utility methods for external use
    measureFunction(fn, name = 'function') {
        const startTime = performance.now();
        let result;
        
        try {
            result = fn();
        } catch (e) {
            console.error(`Error in measured function ${name}:`, e);
            throw e;
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (duration > 16.67) {
            console.warn(`Slow function detected: ${name} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
    }

    async measureAsyncFunction(fn, name = 'async-function') {
        const startTime = performance.now();
        let result;
        
        try {
            result = await fn();
        } catch (e) {
            console.error(`Error in measured async function ${name}:`, e);
            throw e;
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (duration > 16.67) {
            console.warn(`Slow async function detected: ${name} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
    }

    startBenchmark(name) {
        const benchmark = {
            name,
            startTime: performance.now(),
            startFPS: this.fps,
            frameCountStart: this.frameCount
        };
        
        return {
            end: () => {
                const endTime = performance.now();
                const endFPS = this.fps;
                const frameCountEnd = this.frameCount;
                
                return {
                    name,
                    duration: endTime - benchmark.startTime,
                    fpsImpact: benchmark.startFPS - endFPS,
                    framesRendered: frameCountEnd - benchmark.frameCountStart,
                    averageFPSDuringBenchmark: this.getAverageFPS()
                };
            }
        };
    }

    cleanup() {
        this.stop();
        
        if (this.longTaskObserver) {
            this.longTaskObserver.disconnect();
        }
        
        this.callbacks.onFPSUpdate.clear();
        this.callbacks.onJank.clear();
        this.callbacks.onSmoothness.clear();
    }
}

// Create singleton instance
const fpsTracker = new FPSTracker();

// Auto-start tracking on page interactions
let hasStarted = false;
const autoStart = () => {
    if (!hasStarted) {
        fpsTracker.start();
        hasStarted = true;
        
        // Remove listeners after first interaction
        document.removeEventListener('click', autoStart);
        document.removeEventListener('scroll', autoStart);
        document.removeEventListener('keydown', autoStart);
    }
};

document.addEventListener('click', autoStart);
document.addEventListener('scroll', autoStart);
document.addEventListener('keydown', autoStart);

export default fpsTracker;