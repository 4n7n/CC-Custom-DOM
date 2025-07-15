/**
 * Engagement Metrics Module
 * Measures user engagement depth, quality, and patterns
 */

class EngagementMetrics {
    constructor() {
        this.metrics = {
            timeBasedMetrics: {
                sessionDuration: 0,
                timeOnPage: 0,
                activeTime: 0,
                idleTime: 0,
                returnVisits: 0
            },
            interactionMetrics: {
                clickDepth: 0,
                scrollDepth: 0,
                pageViews: 0,
                uniqueInteractions: 0,
                interactionRate: 0
            },
            contentMetrics: {
                contentConsumed: 0,
                contentShared: 0,
                contentCreated: 0,
                contentEngagement: 0,
                readingTime: 0
            },
            socialMetrics: {
                comments: 0,
                likes: 0,
                shares: 0,
                follows: 0,
                mentions: 0
            }
        };
        
        this.engagementEvents = [];
        this.sessionStart = Date.now();
        this.lastActivity = Date.now();
        this.isActive = true;
        this.readingStartTime = null;
        this.qualityScore = 0;
        
        this.init();
    }

    init() {
        this.setupEngagementTracking();
        this.startActivityMonitoring();
        this.initReadingTimeTracking();
        this.loadStoredMetrics();
    }

    setupEngagementTracking() {
        // Deep interaction tracking
        document.addEventListener('click', (e) => {
            this.trackInteraction('click', e);
        });

        document.addEventListener('scroll', (e) => {
            this.trackScrollEngagement();
        });

        // Form engagement
        document.addEventListener('input', (e) => {
            this.trackFormEngagement(e);
        });

        document.addEventListener('submit', (e) => {
            this.trackFormSubmission(e);
        });

        // Media engagement
        document.addEventListener('play', (e) => {
            this.trackMediaEngagement(e, 'play');
        });

        document.addEventListener('pause', (e) => {
            this.trackMediaEngagement(e, 'pause');
        });

        // Social interactions
        document.addEventListener('click', (e) => {
            this.trackSocialInteractions(e);
        });

        // Page visibility for active time
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Beforeunload for session metrics
        window.addEventListener('beforeunload', () => {
            this.finalizeSession();
        });
    }

    trackInteraction(type, event) {
        const interaction = {
            type,
            timestamp: Date.now(),
            element: this.getElementContext(event.target),
            coordinates: { x: event.clientX, y: event.clientY },
            sessionTime: Date.now() - this.sessionStart
        };

        this.engagementEvents.push(interaction);
        this.updateInteractionMetrics(interaction);
        this.updateLastActivity();
    }

    trackScrollEngagement() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);

        if (scrollPercent > this.metrics.interactionMetrics.scrollDepth) {
            this.metrics.interactionMetrics.scrollDepth = scrollPercent;
            
            this.engagementEvents.push({
                type: 'scroll',
                depth: scrollPercent,
                timestamp: Date.now(),
                sessionTime: Date.now() - this.sessionStart
            });
        }

        this.updateLastActivity();
    }

    trackFormEngagement(event) {
        const formData = {
            type: 'form_interaction',
            fieldType: event.target.type,
            fieldName: event.target.name,
            formId: event.target.closest('form')?.id,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart
        };

        this.engagementEvents.push(formData);
        this.metrics.interactionMetrics.uniqueInteractions++;
        this.updateLastActivity();
    }

    trackFormSubmission(event) {
        const form = event.target;
        const formData = {
            type: 'form_submission',
            formId: form.id,
            formType: form.dataset.type,
            fieldCount: form.querySelectorAll('input, textarea, select').length,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart
        };

        this.engagementEvents.push(formData);
        this.metrics.contentMetrics.contentCreated++;
        this.updateEngagementQuality('form_submission', 10);
        this.updateLastActivity();
    }

    trackMediaEngagement(event, action) {
        const media = event.target;
        const mediaData = {
            type: 'media_engagement',
            action,
            mediaType: media.tagName.toLowerCase(),
            duration: media.duration,
            currentTime: media.currentTime,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart
        };

        this.engagementEvents.push(mediaData);
        this.updateEngagementQuality('media_interaction', 5);
        this.updateLastActivity();
    }

    trackSocialInteractions(event) {
        const target = event.target;
        const socialActions = {
            'like-btn': 'like',
            'share-btn': 'share',
            'comment-btn': 'comment',
            'follow-btn': 'follow'
        };

        const actionClass = Object.keys(socialActions).find(cls => target.classList.contains(cls));
        if (actionClass) {
            const action = socialActions[actionClass];
            
            this.engagementEvents.push({
                type: 'social_interaction',
                action,
                contentId: target.dataset.contentId,
                timestamp: Date.now(),
                sessionTime: Date.now() - this.sessionStart
            });

            this.metrics.socialMetrics[action + 's']++;
            this.updateEngagementQuality('social_interaction', 8);
            this.updateLastActivity();
        }
    }

    initReadingTimeTracking() {
        const contentElements = document.querySelectorAll('article, .post-content, .content-body');
        
        contentElements.forEach(element => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.startReadingTime(element);
                    } else {
                        this.stopReadingTime(element);
                    }
                });
            }, { threshold: 0.5 });

            observer.observe(element);
        });
    }

    startReadingTime(element) {
        if (!this.readingStartTime) {
            this.readingStartTime = Date.now();
            element.dataset.readingStart = this.readingStartTime;
        }
    }

    stopReadingTime(element) {
        if (this.readingStartTime && element.dataset.readingStart) {
            const readingTime = Date.now() - parseInt(element.dataset.readingStart);
            this.metrics.contentMetrics.readingTime += readingTime;
            
            this.engagementEvents.push({
                type: 'reading_time',
                duration: readingTime,
                contentId: element.id || element.className,
                timestamp: Date.now(),
                sessionTime: Date.now() - this.sessionStart
            });

            this.readingStartTime = null;
            delete element.dataset.readingStart;
        }
    }

    startActivityMonitoring() {
        // Track active vs idle time
        setInterval(() => {
            this.updateActiveTime();
        }, 1000);

        // Activity detection
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.isActive = true;
                this.updateLastActivity();
            });
        });

        // Idle detection
        setInterval(() => {
            if (Date.now() - this.lastActivity > 30000) { // 30 seconds
                this.isActive = false;
            }
        }, 5000);
    }

    updateActiveTime() {
        if (this.isActive && !document.hidden) {
            this.metrics.timeBasedMetrics.activeTime += 1000;
        } else {
            this.metrics.timeBasedMetrics.idleTime += 1000;
        }
    }

    updateLastActivity() {
        this.lastActivity = Date.now();
        this.isActive = true;
    }

    updateInteractionMetrics(interaction) {
        this.metrics.interactionMetrics.uniqueInteractions++;
        
        // Calculate click depth (unique elements clicked)
        const clickedElements = this.engagementEvents
            .filter(e => e.type === 'click')
            .map(e => e.element.xpath);
        
        this.metrics.interactionMetrics.clickDepth = new Set(clickedElements).size;
        
        // Calculate interaction rate
        this.metrics.interactionMetrics.interactionRate = 
            this.metrics.interactionMetrics.uniqueInteractions / 
            (this.metrics.timeBasedMetrics.activeTime / 1000 / 60); // per minute
    }

    updateEngagementQuality(actionType, points) {
        const qualityWeights = {
            'form_submission': 10,
            'social_interaction': 8,
            'media_interaction': 5,
            'deep_scroll': 3,
            'reading_time': 2
        };

        this.qualityScore += qualityWeights[actionType] || 1;
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.isActive = false;
            this.engagementEvents.push({
                type: 'page_hidden',
                timestamp: Date.now(),
                sessionTime: Date.now() - this.sessionStart
            });
        } else {
            this.isActive = true;
            this.engagementEvents.push({
                type: 'page_visible',
                timestamp: Date.now(),
                sessionTime: Date.now() - this.sessionStart
            });
        }
    }

    getElementContext(element) {
        return {
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            text: element.textContent?.slice(0, 100) || '',
            xpath: this.getXPath(element),
            attributes: this.getElementAttributes(element)
        };
    }

    getXPath(element) {
        const parts = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = current.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const part = current.nodeName.toLowerCase() + (index ? `[${index + 1}]` : '');
            parts.unshift(part);
            current = current.parentNode;
        }
        
        return parts.length ? '/' + parts.join('/') : '';
    }

    getElementAttributes(element) {
        const relevantAttrs = ['data-track', 'data-id', 'role', 'type', 'name', 'href'];
        const attrs = {};
        
        relevantAttrs.forEach(attr => {
            if (element.hasAttribute(attr)) {
                attrs[attr] = element.getAttribute(attr);
            }
        });
        
        return attrs;
    }

    calculateEngagementScore() {
        const weights = {
            timeWeight: 0.3,
            interactionWeight: 0.25,
            contentWeight: 0.25,
            socialWeight: 0.2
        };

        // Normalize metrics (0-100 scale)
        const timeScore = Math.min((this.metrics.timeBasedMetrics.activeTime / 1000 / 60) * 10, 100);
        const interactionScore = Math.min(this.metrics.interactionMetrics.uniqueInteractions * 5, 100);
        const contentScore = Math.min(this.metrics.contentMetrics.contentConsumed * 20, 100);
        const socialScore = Math.min(
            (this.metrics.socialMetrics.likes + this.metrics.socialMetrics.shares + this.metrics.socialMetrics.comments) * 10, 
            100
        );

        return Math.round(
            (timeScore * weights.timeWeight) +
            (interactionScore * weights.interactionWeight) +
            (contentScore * weights.contentWeight) +
            (socialScore * weights.socialWeight)
        );
    }

    getEngagementTrends() {
        const timeWindows = [5, 15, 30, 60]; // minutes
        const trends = {};

        timeWindows.forEach(window => {
            const windowStart = Date.now() - (window * 60 * 1000);
            const windowEvents = this.engagementEvents.filter(e => e.timestamp >= windowStart);
            
            trends[`${window}min`] = {
                eventCount: windowEvents.length,
                uniqueInteractions: windowEvents.filter(e => e.type === 'click').length,
                socialInteractions: windowEvents.filter(e => e.type === 'social_interaction').length,
                contentInteractions: windowEvents.filter(e => e.type === 'form_interaction').length
            };
        });

        return trends;
    }

    getTopEngagementContent() {
        const contentEngagement = new Map();
        
        this.engagementEvents.forEach(event => {
            if (event.contentId) {
                const content = contentEngagement.get(event.contentId) || {
                    views: 0,
                    interactions: 0,
                    socialActions: 0,
                    readingTime: 0
                };
                
                if (event.type === 'social_interaction') content.socialActions++;
                if (event.type === 'reading_time') content.readingTime += event.duration;
                
                content.interactions++;
                contentEngagement.set(event.contentId, content);
            }
        });

        return Array.from(contentEngagement.entries())
            .sort((a, b) => b[1].interactions - a[1].interactions)
            .slice(0, 10);
    }

    finalizeSession() {
        this.metrics.timeBasedMetrics.sessionDuration = Date.now() - this.sessionStart;
        this.saveMetrics();
    }

    loadStoredMetrics() {
        const stored = localStorage.getItem('engagementMetrics');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.metrics = { ...this.metrics, ...data };
            } catch (e) {
                console.warn('Failed to load engagement metrics:', e);
            }
        }
    }

    saveMetrics() {
        localStorage.setItem('engagementMetrics', JSON.stringify(this.metrics));
    }

    getMetrics() {
        return {
            ...this.metrics,
            engagementScore: this.calculateEngagementScore(),
            qualityScore: this.qualityScore,
            trends: this.getEngagementTrends(),
            topContent: this.getTopEngagementContent(),
            sessionDuration: Date.now() - this.sessionStart,
            totalEvents: this.engagementEvents.length
        };
    }

    exportData() {
        return {
            metrics: this.getMetrics(),
            events: this.engagementEvents,
            sessionStart: this.sessionStart,
            timestamp: Date.now()
        };
    }

    reset() {
        this.metrics = {
            timeBasedMetrics: {
                sessionDuration: 0,
                timeOnPage: 0,
                activeTime: 0,
                idleTime: 0,
                returnVisits: 0
            },
            interactionMetrics: {
                clickDepth: 0,
                scrollDepth: 0,
                pageViews: 0,
                uniqueInteractions: 0,
                interactionRate: 0
            },
            contentMetrics: {
                contentConsumed: 0,
                contentShared: 0,
                contentCreated: 0,
                contentEngagement: 0,
                readingTime: 0
            },
            socialMetrics: {
                comments: 0,
                likes: 0,
                shares: 0,
                follows: 0,
                mentions: 0
            }
        };
        
        this.engagementEvents = [];
        this.sessionStart = Date.now();
        this.qualityScore = 0;
        localStorage.removeItem('engagementMetrics');
    }
}

// Auto-initialize
const engagementMetrics = new EngagementMetrics();
export default engagementMetrics;