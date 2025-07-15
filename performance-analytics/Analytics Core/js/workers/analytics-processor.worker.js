/**
 * Analytics Processor Web Worker
 * Handles heavy analytics processing in background thread
 */

class AnalyticsProcessor {
    constructor() {
        this.dataBuffer = [];
        this.processQueue = [];
        this.isProcessing = false;
        this.batchSize = 100;
        this.processingInterval = 5000; // 5 seconds
        
        this.init();
    }

    init() {
        this.setupMessageHandlers();
        this.startProcessingLoop();
    }

    setupMessageHandlers() {
        self.addEventListener('message', (event) => {
            const { type, data, id } = event.data;
            
            switch (type) {
                case 'PROCESS_EVENTS':
                    this.processEvents(data, id);
                    break;
                    
                case 'CALCULATE_METRICS':
                    this.calculateMetrics(data, id);
                    break;
                    
                case 'ANALYZE_PATTERNS':
                    this.analyzePatterns(data, id);
                    break;
                    
                case 'GENERATE_INSIGHTS':
                    this.generateInsights(data, id);
                    break;
                    
                case 'PROCESS_COHORT':
                    this.processCohortAnalysis(data, id);
                    break;
                    
                case 'CALCULATE_FUNNEL':
                    this.calculateFunnelMetrics(data, id);
                    break;
                    
                case 'BATCH_PROCESS':
                    this.addToBatch(data);
                    break;
                    
                case 'FLUSH_BATCH':
                    this.flushBatch(id);
                    break;
                    
                default:
                    this.sendError(`Unknown message type: ${type}`, id);
            }
        });
    }

    startProcessingLoop() {
        setInterval(() => {
            if (this.dataBuffer.length > 0 && !this.isProcessing) {
                this.processBatch();
            }
        }, this.processingInterval);
    }

    processEvents(events, requestId) {
        try {
            const processed = {
                total: events.length,
                byType: {},
                byTimestamp: {},
                patterns: [],
                anomalies: []
            };

            // Group by event type
            events.forEach(event => {
                const type = event.type || 'unknown';
                if (!processed.byType[type]) {
                    processed.byType[type] = [];
                }
                processed.byType[type].push(event);
            });

            // Group by time intervals (hourly)
            events.forEach(event => {
                const hour = new Date(event.timestamp).toISOString().substr(0, 13);
                if (!processed.byTimestamp[hour]) {
                    processed.byTimestamp[hour] = 0;
                }
                processed.byTimestamp[hour]++;
            });

            // Detect patterns
            processed.patterns = this.detectEventPatterns(events);
            
            // Detect anomalies
            processed.anomalies = this.detectAnomalies(events);

            this.sendResult(processed, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    calculateMetrics(data, requestId) {
        try {
            const { events, timeWindow = 3600000 } = data; // 1 hour default
            const now = Date.now();
            const cutoff = now - timeWindow;
            
            const filteredEvents = events.filter(event => event.timestamp >= cutoff);
            
            const metrics = {
                engagement: this.calculateEngagementMetrics(filteredEvents),
                performance: this.calculatePerformanceMetrics(filteredEvents),
                conversion: this.calculateConversionMetrics(filteredEvents),
                user: this.calculateUserMetrics(filteredEvents),
                content: this.calculateContentMetrics(filteredEvents)
            };

            this.sendResult(metrics, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    calculateEngagementMetrics(events) {
        const engagementEvents = events.filter(e => 
            ['click', 'scroll', 'form_interaction', 'social_interaction'].includes(e.type)
        );

        const sessions = new Set(events.map(e => e.sessionId)).size;
        const users = new Set(events.map(e => e.userId)).size;

        return {
            totalEvents: engagementEvents.length,
            eventsPerSession: sessions > 0 ? engagementEvents.length / sessions : 0,
            eventsPerUser: users > 0 ? engagementEvents.length / users : 0,
            engagementRate: events.length > 0 ? (engagementEvents.length / events.length) * 100 : 0,
            avgSessionDepth: this.calculateAvgSessionDepth(events),
            bounceRate: this.calculateBounceRate(events)
        };
    }

    calculatePerformanceMetrics(events) {
        const performanceEvents = events.filter(e => e.type === 'performance');
        
        if (performanceEvents.length === 0) {
            return { loadTimes: [], avgLoadTime: 0, errors: 0 };
        }

        const loadTimes = performanceEvents
            .filter(e => e.data && e.data.loadTime)
            .map(e => e.data.loadTime);

        const errors = performanceEvents
            .filter(e => e.data && e.data.error)
            .length;

        return {
            loadTimes,
            avgLoadTime: loadTimes.length > 0 ? 
                loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length : 0,
            medianLoadTime: this.calculateMedian(loadTimes),
            p95LoadTime: this.calculatePercentile(loadTimes, 95),
            errors,
            errorRate: performanceEvents.length > 0 ? (errors / performanceEvents.length) * 100 : 0
        };
    }

    calculateConversionMetrics(events) {
        const conversionEvents = events.filter(e => 
            ['form_submission', 'purchase', 'signup'].includes(e.type)
        );

        const totalSessions = new Set(events.map(e => e.sessionId)).size;
        const convertingSessions = new Set(conversionEvents.map(e => e.sessionId)).size;

        return {
            totalConversions: conversionEvents.length,
            conversionRate: totalSessions > 0 ? (convertingSessions / totalSessions) * 100 : 0,
            conversionsByType: this.groupBy(conversionEvents, 'type'),
            avgTimeToConversion: this.calculateAvgTimeToConversion(events, conversionEvents)
        };
    }

    calculateUserMetrics(events) {
        const users = new Set(events.map(e => e.userId));
        const sessions = new Set(events.map(e => e.sessionId));
        
        const userSessions = {};
        events.forEach(event => {
            if (!userSessions[event.userId]) {
                userSessions[event.userId] = new Set();
            }
            userSessions[event.userId].add(event.sessionId);
        });

        const returningUsers = Object.values(userSessions)
            .filter(sessions => sessions.size > 1).length;

        return {
            totalUsers: users.size,
            totalSessions: sessions.size,
            avgSessionsPerUser: users.size > 0 ? sessions.size / users.size : 0,
            returningUserRate: users.size > 0 ? (returningUsers / users.size) * 100 : 0,
            newUsers: users.size - returningUsers
        };
    }

    calculateContentMetrics(events) {
        const contentEvents = events.filter(e => 
            ['page_view', 'content_view', 'reading_time'].includes(e.type)
        );

        const pageViews = contentEvents.filter(e => e.type === 'page_view');
        const readingTimes = contentEvents
            .filter(e => e.type === 'reading_time' && e.data && e.data.duration)
            .map(e => e.data.duration);

        return {
            pageViews: pageViews.length,
            uniquePages: new Set(pageViews.map(e => e.data?.page || e.page)).size,
            avgReadingTime: readingTimes.length > 0 ? 
                readingTimes.reduce((sum, time) => sum + time, 0) / readingTimes.length : 0,
            totalReadingTime: readingTimes.reduce((sum, time) => sum + time, 0),
            contentEngagement: this.calculateContentEngagement(contentEvents)
        };
    }

    analyzePatterns(data, requestId) {
        try {
            const { events, patternTypes = ['sequence', 'temporal', 'user'] } = data;
            const patterns = {};

            if (patternTypes.includes('sequence')) {
                patterns.sequences = this.findSequencePatterns(events);
            }

            if (patternTypes.includes('temporal')) {
                patterns.temporal = this.findTemporalPatterns(events);
            }

            if (patternTypes.includes('user')) {
                patterns.user = this.findUserPatterns(events);
            }

            this.sendResult(patterns, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    findSequencePatterns(events) {
        const sequences = new Map();
        const userJourneys = this.groupBy(events, 'userId');

        Object.values(userJourneys).forEach(userEvents => {
            const sortedEvents = userEvents.sort((a, b) => a.timestamp - b.timestamp);
            
            for (let i = 0; i < sortedEvents.length - 2; i++) {
                const sequence = sortedEvents.slice(i, i + 3).map(e => e.type);
                const key = sequence.join(' -> ');
                
                if (!sequences.has(key)) {
                    sequences.set(key, { pattern: sequence, count: 0, users: new Set() });
                }
                
                const pattern = sequences.get(key);
                pattern.count++;
                pattern.users.add(userEvents[0].userId);
            }
        });

        return Array.from(sequences.values())
            .filter(pattern => pattern.count >= 5)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    findTemporalPatterns(events) {
        const hourlyDistribution = {};
        const daylyDistribution = {};
        
        events.forEach(event => {
            const date = new Date(event.timestamp);
            const hour = date.getHours();
            const day = date.getDay();
            
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
            daylyDistribution[day] = (daylyDistribution[day] || 0) + 1;
        });

        return {
            peakHours: this.findPeaks(hourlyDistribution),
            peakDays: this.findPeaks(daylyDistribution),
            hourlyDistribution,
            daylyDistribution
        };
    }

    findUserPatterns(events) {
        const userBehaviors = {};
        
        events.forEach(event => {
            if (!userBehaviors[event.userId]) {
                userBehaviors[event.userId] = {
                    eventCounts: {},
                    sessionCount: new Set(),
                    totalEvents: 0,
                    firstSeen: event.timestamp,
                    lastSeen: event.timestamp
                };
            }
            
            const user = userBehaviors[event.userId];
            user.eventCounts[event.type] = (user.eventCounts[event.type] || 0) + 1;
            user.sessionCount.add(event.sessionId);
            user.totalEvents++;
            user.firstSeen = Math.min(user.firstSeen, event.timestamp);
            user.lastSeen = Math.max(user.lastSeen, event.timestamp);
        });

        // Classify users
        const classifications = {
            powerUsers: [],
            casualUsers: [],
            newUsers: [],
            returningUsers: []
        };

        Object.entries(userBehaviors).forEach(([userId, behavior]) => {
            const sessionCount = behavior.sessionCount.size;
            const avgEventsPerSession = behavior.totalEvents / sessionCount;
            const daysSinceFirst = (Date.now() - behavior.firstSeen) / (1000 * 60 * 60 * 24);
            
            if (avgEventsPerSession > 50 && sessionCount > 5) {
                classifications.powerUsers.push({ userId, ...behavior });
            } else if (avgEventsPerSession < 10) {
                classifications.casualUsers.push({ userId, ...behavior });
            }
            
            if (daysSinceFirst < 1) {
                classifications.newUsers.push({ userId, ...behavior });
            } else if (sessionCount > 1) {
                classifications.returningUsers.push({ userId, ...behavior });
            }
        });

        return classifications;
    }

    generateInsights(data, requestId) {
        try {
            const { metrics, patterns, events } = data;
            const insights = [];

            // Performance insights
            if (metrics.performance && metrics.performance.avgLoadTime > 3000) {
                insights.push({
                    type: 'performance',
                    severity: 'high',
                    title: 'Slow page load times detected',
                    description: `Average load time is ${(metrics.performance.avgLoadTime / 1000).toFixed(2)}s`,
                    recommendation: 'Optimize images, minify CSS/JS, and implement caching'
                });
            }

            // Engagement insights
            if (metrics.engagement && metrics.engagement.bounceRate > 70) {
                insights.push({
                    type: 'engagement',
                    severity: 'medium',
                    title: 'High bounce rate detected',
                    description: `Bounce rate is ${metrics.engagement.bounceRate.toFixed(1)}%`,
                    recommendation: 'Improve page content relevance and loading speed'
                });
            }

            // Conversion insights
            if (metrics.conversion && metrics.conversion.conversionRate < 2) {
                insights.push({
                    type: 'conversion',
                    severity: 'high',
                    title: 'Low conversion rate',
                    description: `Conversion rate is ${metrics.conversion.conversionRate.toFixed(2)}%`,
                    recommendation: 'Optimize conversion funnel and A/B test key elements'
                });
            }

            // Pattern insights
            if (patterns.sequences && patterns.sequences.length > 0) {
                const topPattern = patterns.sequences[0];
                insights.push({
                    type: 'pattern',
                    severity: 'info',
                    title: 'Common user journey identified',
                    description: `${topPattern.count} users follow the pattern: ${topPattern.pattern.join(' → ')}`,
                    recommendation: 'Optimize this user journey for better experience'
                });
            }

            this.sendResult(insights, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    processCohortAnalysis(data, requestId) {
        try {
            const { events, cohortType = 'weekly', retentionPeriods = [1, 7, 30] } = data;
            
            const cohorts = this.groupEventsByCohort(events, cohortType);
            const analysis = {};

            Object.entries(cohorts).forEach(([cohortKey, cohortEvents]) => {
                const cohortUsers = new Set(cohortEvents.map(e => e.userId));
                const cohortStart = Math.min(...cohortEvents.map(e => e.timestamp));
                
                const retention = {};
                retentionPeriods.forEach(period => {
                    const periodStart = cohortStart + (period * 24 * 60 * 60 * 1000);
                    const periodEnd = periodStart + (24 * 60 * 60 * 1000);
                    
                    const activeInPeriod = new Set(
                        events.filter(e => 
                            e.timestamp >= periodStart && 
                            e.timestamp < periodEnd &&
                            cohortUsers.has(e.userId)
                        ).map(e => e.userId)
                    );
                    
                    retention[`day_${period}`] = {
                        users: activeInPeriod.size,
                        rate: (activeInPeriod.size / cohortUsers.size) * 100
                    };
                });
                
                analysis[cohortKey] = {
                    totalUsers: cohortUsers.size,
                    retention
                };
            });

            this.sendResult(analysis, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    calculateFunnelMetrics(data, requestId) {
        try {
            const { events, funnelSteps } = data;
            const funnel = {
                steps: {},
                conversions: {},
                dropoffs: {}
            };

            funnelSteps.forEach((step, index) => {
                const stepEvents = events.filter(e => e.type === step);
                const stepUsers = new Set(stepEvents.map(e => e.userId));
                
                funnel.steps[step] = {
                    events: stepEvents.length,
                    users: stepUsers.size
                };

                if (index > 0) {
                    const previousStep = funnelSteps[index - 1];
                    const previousUsers = funnel.steps[previousStep].users;
                    
                    funnel.conversions[`${previousStep}_to_${step}`] = {
                        rate: previousUsers > 0 ? (stepUsers.size / previousUsers) * 100 : 0,
                        users: stepUsers.size
                    };
                    
                    funnel.dropoffs[`${previousStep}_to_${step}`] = {
                        rate: previousUsers > 0 ? ((previousUsers - stepUsers.size) / previousUsers) * 100 : 0,
                        users: previousUsers - stepUsers.size
                    };
                }
            });

            this.sendResult(funnel, requestId);
        } catch (error) {
            this.sendError(error.message, requestId);
        }
    }

    // Helper methods
    detectEventPatterns(events) {
        const patterns = [];
        const eventsByUser = this.groupBy(events, 'userId');
        
        Object.values(eventsByUser).forEach(userEvents => {
            const sortedEvents = userEvents.sort((a, b) => a.timestamp - b.timestamp);
            
            // Look for repeated sequences
            for (let length = 2; length <= 4; length++) {
                for (let i = 0; i <= sortedEvents.length - length * 2; i++) {
                    const pattern1 = sortedEvents.slice(i, i + length).map(e => e.type);
                    const pattern2 = sortedEvents.slice(i + length, i + length * 2).map(e => e.type);
                    
                    if (JSON.stringify(pattern1) === JSON.stringify(pattern2)) {
                        patterns.push({
                            type: 'repeated_sequence',
                            pattern: pattern1,
                            userId: userEvents[0].userId,
                            confidence: 0.8
                        });
                    }
                }
            }
        });
        
        return patterns;
    }

    detectAnomalies(events) {
        const anomalies = [];
        const hourlyDistribution = {};
        
        events.forEach(event => {
            const hour = new Date(event.timestamp).toISOString().substr(0, 13);
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        });
        
        const values = Object.values(hourlyDistribution);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const stdDev = Math.sqrt(
            values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
        );
        
        Object.entries(hourlyDistribution).forEach(([hour, count]) => {
            const zScore = Math.abs((count - mean) / stdDev);
            if (zScore > 2) { // More than 2 standard deviations
                anomalies.push({
                    type: 'traffic_spike',
                    hour,
                    count,
                    zScore,
                    severity: zScore > 3 ? 'high' : 'medium'
                });
            }
        });
        
        return anomalies;
    }

    addToBatch(data) {
        this.dataBuffer.push(data);
        
        if (this.dataBuffer.length >= this.batchSize) {
            this.processBatch();
        }
    }

    flushBatch(requestId) {
        if (this.dataBuffer.length > 0) {
            this.processBatch();
        }
        this.sendResult({ flushed: true, items: this.dataBuffer.length }, requestId);
    }

    processBatch() {
        if (this.isProcessing || this.dataBuffer.length === 0) return;
        
        this.isProcessing = true;
        const batch = this.dataBuffer.splice(0, this.batchSize);
        
        try {
            // Process batch
            const processed = batch.map(item => ({
                ...item,
                processed: true,
                processedAt: Date.now()
            }));
            
            // Send processed batch back
            self.postMessage({
                type: 'BATCH_PROCESSED',
                data: processed
            });
        } catch (error) {
            self.postMessage({
                type: 'BATCH_ERROR',
                error: error.message
            });
        } finally {
            this.isProcessing = false;
        }
    }

    // Utility methods
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    }

    calculateMedian(values) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        
        return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }

    calculateAvgSessionDepth(events) {
        const sessions = this.groupBy(events, 'sessionId');
        const depths = Object.values(sessions).map(sessionEvents => sessionEvents.length);
        
        return depths.length > 0 ? 
            depths.reduce((sum, depth) => sum + depth, 0) / depths.length : 0;
    }

    calculateBounceRate(events) {
        const sessions = this.groupBy(events, 'sessionId');
        const singlePageSessions = Object.values(sessions).filter(sessionEvents => {
            const pageViews = sessionEvents.filter(e => e.type === 'page_view');
            return pageViews.length <= 1;
        }).length;
        
        const totalSessions = Object.keys(sessions).length;
        return totalSessions > 0 ? (singlePageSessions / totalSessions) * 100 : 0;
    }

    calculateAvgTimeToConversion(allEvents, conversionEvents) {
        const times = [];
        
        conversionEvents.forEach(conversion => {
            const sessionEvents = allEvents
                .filter(e => e.sessionId === conversion.sessionId)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (sessionEvents.length > 0) {
                const sessionStart = sessionEvents[0].timestamp;
                const timeToConversion = conversion.timestamp - sessionStart;
                times.push(timeToConversion);
            }
        });
        
        return times.length > 0 ? 
            times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    }

    calculateContentEngagement(events) {
        const engagement = {
            totalInteractions: 0,
            avgTimeSpent: 0,
            completionRate: 0
        };
        
        const interactionEvents = events.filter(e => 
            ['click', 'scroll', 'form_interaction'].includes(e.type)
        );
        
        engagement.totalInteractions = interactionEvents.length;
        
        const readingEvents = events.filter(e => e.type === 'reading_time');
        if (readingEvents.length > 0) {
            const totalTime = readingEvents.reduce((sum, e) => 
                sum + (e.data?.duration || 0), 0
            );
            engagement.avgTimeSpent = totalTime / readingEvents.length;
        }
        
        return engagement;
    }

    groupEventsByCohort(events, cohortType) {
        const cohorts = {};
        
        events.forEach(event => {
            const date = new Date(event.timestamp);
            let cohortKey;
            
            switch (cohortType) {
                case 'daily':
                    cohortKey = date.toISOString().substr(0, 10);
                    break;
                case 'weekly':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    cohortKey = weekStart.toISOString().substr(0, 10);
                    break;
                case 'monthly':
                    cohortKey = date.toISOString().substr(0, 7);
                    break;
                default:
                    cohortKey = 'default';
            }
            
            if (!cohorts[cohortKey]) {
                cohorts[cohortKey] = [];
            }
            cohorts[cohortKey].push(event);
        });
        
        return cohorts;
    }

    findPeaks(distribution) {
        const entries = Object.entries(distribution).map(([key, value]) => ({
            key: parseInt(key),
            value
        })).sort((a, b) => a.key - b.key);
        
        const peaks = [];
        
        for (let i = 1; i < entries.length - 1; i++) {
            const current = entries[i];
            const prev = entries[i - 1];
            const next = entries[i + 1];
            
            if (current.value > prev.value && current.value > next.value) {
                peaks.push({
                    key: current.key,
                    value: current.value,
                    prominence: Math.min(
                        current.value - prev.value,
                        current.value - next.value
                    )
                });
            }
        }
        
        return peaks.sort((a, b) => b.prominence - a.prominence).slice(0, 3);
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

// Initialize the processor
const processor = new AnalyticsProcessor();

// Handle uncaught errors
self.addEventListener('error', (event) => {
    self.postMessage({
        type: 'ERROR',
        error: `Uncaught error: ${event.message}`
    });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    self.postMessage({
        type: 'ERROR',
        error: `Unhandled promise rejection: ${event.reason}`
    });
});