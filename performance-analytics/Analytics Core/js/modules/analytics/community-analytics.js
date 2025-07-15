/**
 * Community Analytics Module
 * Tracks community engagement and interaction metrics
 */

class CommunityAnalytics {
    constructor() {
        this.events = new Map();
        this.sessions = new Map();
        this.metrics = {
            posts: { created: 0, viewed: 0, liked: 0, shared: 0 },
            comments: { created: 0, replied: 0, liked: 0 },
            users: { active: 0, new: 0, returning: 0 },
            engagement: { rate: 0, time: 0, depth: 0 }
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startSessionTracking();
        this.loadStoredMetrics();
    }

    setupEventListeners() {
        // Post interactions
        document.addEventListener('click', this.handleInteraction.bind(this));
        document.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Form submissions
        document.addEventListener('submit', this.handleSubmission.bind(this));
        
        // Page visibility
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    handleInteraction(event) {
        const target = event.target;
        const timestamp = Date.now();
        
        // Track post actions
        if (target.classList.contains('like-btn')) {
            this.trackEvent('post_liked', { postId: target.dataset.postId, timestamp });
            this.metrics.posts.liked++;
        }
        
        if (target.classList.contains('share-btn')) {
            this.trackEvent('post_shared', { postId: target.dataset.postId, timestamp });
            this.metrics.posts.shared++;
        }
        
        if (target.classList.contains('comment-btn')) {
            this.trackEvent('comment_clicked', { postId: target.dataset.postId, timestamp });
        }
        
        // Track navigation
        if (target.tagName === 'A') {
            this.trackEvent('link_clicked', { 
                href: target.href, 
                text: target.textContent.trim(),
                timestamp 
            });
        }
    }

    handleScroll() {
        const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        
        if (scrollDepth > this.metrics.engagement.depth) {
            this.metrics.engagement.depth = scrollDepth;
            this.trackEvent('scroll_depth', { depth: scrollDepth, timestamp: Date.now() });
        }
    }

    handleSubmission(event) {
        const form = event.target;
        const formType = form.dataset.type || 'unknown';
        
        this.trackEvent('form_submitted', {
            type: formType,
            fields: this.getFormFields(form),
            timestamp: Date.now()
        });
        
        if (formType === 'post') {
            this.metrics.posts.created++;
        } else if (formType === 'comment') {
            this.metrics.comments.created++;
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.trackEvent('page_hidden', { timestamp: Date.now() });
        } else {
            this.trackEvent('page_visible', { timestamp: Date.now() });
        }
    }

    trackEvent(eventType, data) {
        const event = {
            type: eventType,
            data,
            sessionId: this.getSessionId(),
            userId: this.getUserId(),
            timestamp: Date.now()
        };
        
        this.events.set(`${eventType}_${Date.now()}`, event);
        this.sendToAnalytics(event);
    }

    getFormFields(form) {
        const fields = {};
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            if (input.name) {
                fields[input.name] = {
                    type: input.type,
                    filled: input.value.length > 0,
                    length: input.value.length
                };
            }
        });
        
        return fields;
    }

    startSessionTracking() {
        const sessionId = this.getSessionId();
        const startTime = Date.now();
        
        this.sessions.set(sessionId, {
            startTime,
            pageViews: 1,
            events: 0,
            lastActivity: startTime
        });
        
        // Update session every 30 seconds
        setInterval(() => {
            this.updateSession();
        }, 30000);
    }

    updateSession() {
        const sessionId = this.getSessionId();
        const session = this.sessions.get(sessionId);
        
        if (session) {
            session.lastActivity = Date.now();
            session.duration = session.lastActivity - session.startTime;
            this.metrics.engagement.time = session.duration;
        }
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('communitySessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('communitySessionId', sessionId);
        }
        return sessionId;
    }

    getUserId() {
        // Get from auth system or generate anonymous ID
        return localStorage.getItem('userId') || 'anonymous';
    }

    sendToAnalytics(event) {
        // Send to analytics service
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/analytics/events', JSON.stringify(event));
        } else {
            fetch('/analytics/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            }).catch(err => console.warn('Analytics send failed:', err));
        }
    }

    calculateEngagementRate() {
        const totalInteractions = this.metrics.posts.liked + this.metrics.posts.shared + 
                                this.metrics.comments.created;
        const totalViews = this.metrics.posts.viewed;
        
        return totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;
    }

    getTopContent() {
        const contentMetrics = new Map();
        
        this.events.forEach(event => {
            if (event.data.postId) {
                const postId = event.data.postId;
                if (!contentMetrics.has(postId)) {
                    contentMetrics.set(postId, { views: 0, likes: 0, shares: 0, comments: 0 });
                }
                
                const metrics = contentMetrics.get(postId);
                switch (event.type) {
                    case 'post_viewed': metrics.views++; break;
                    case 'post_liked': metrics.likes++; break;
                    case 'post_shared': metrics.shares++; break;
                    case 'comment_created': metrics.comments++; break;
                }
            }
        });
        
        return Array.from(contentMetrics.entries())
            .sort((a, b) => (b[1].likes + b[1].shares) - (a[1].likes + a[1].shares))
            .slice(0, 10);
    }

    getUserJourney() {
        const journey = [];
        const sessionEvents = Array.from(this.events.values())
            .filter(event => event.sessionId === this.getSessionId())
            .sort((a, b) => a.timestamp - b.timestamp);
        
        sessionEvents.forEach(event => {
            journey.push({
                action: event.type,
                timestamp: event.timestamp,
                data: event.data
            });
        });
        
        return journey;
    }

    getMetrics() {
        return {
            ...this.metrics,
            engagement: {
                ...this.metrics.engagement,
                rate: this.calculateEngagementRate()
            },
            topContent: this.getTopContent(),
            userJourney: this.getUserJourney()
        };
    }

    exportData() {
        return {
            metrics: this.getMetrics(),
            events: Array.from(this.events.values()),
            sessions: Array.from(this.sessions.values()),
            timestamp: Date.now()
        };
    }

    loadStoredMetrics() {
        const stored = localStorage.getItem('communityMetrics');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.metrics = { ...this.metrics, ...data };
            } catch (e) {
                console.warn('Failed to load stored metrics:', e);
            }
        }
    }

    saveMetrics() {
        localStorage.setItem('communityMetrics', JSON.stringify(this.metrics));
    }

    reset() {
        this.events.clear();
        this.sessions.clear();
        this.metrics = {
            posts: { created: 0, viewed: 0, liked: 0, shared: 0 },
            comments: { created: 0, replied: 0, liked: 0 },
            users: { active: 0, new: 0, returning: 0 },
            engagement: { rate: 0, time: 0, depth: 0 }
        };
        localStorage.removeItem('communityMetrics');
    }
}

// Auto-initialize
const communityAnalytics = new CommunityAnalytics();
export default communityAnalytics;