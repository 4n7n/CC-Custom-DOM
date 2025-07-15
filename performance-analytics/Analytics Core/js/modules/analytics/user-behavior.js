/**
 * User Behavior Analytics Module
 * Tracks user interactions, patterns, and behavioral insights
 */

class UserBehaviorAnalytics {
    constructor() {
        this.behaviorData = new Map();
        this.heatmapData = [];
        this.clickPaths = [];
        this.scrollPatterns = [];
        this.timeOnPage = 0;
        this.startTime = Date.now();
        this.isActive = true;
        this.init();
    }

    init() {
        this.setupBehaviorTracking();
        this.startIdleDetection();
        this.initHeatmapTracking();
        this.trackPageLoad();
    }

    setupBehaviorTracking() {
        // Mouse movement tracking
        let mouseMoveTimer;
        document.addEventListener('mousemove', (e) => {
            clearTimeout(mouseMoveTimer);
            mouseMoveTimer = setTimeout(() => {
                this.trackMouseMovement(e);
            }, 100);
        });

        // Click tracking with detailed context
        document.addEventListener('click', (e) => {
            this.trackClick(e);
        });

        // Scroll behavior
        let scrollTimer;
        document.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                this.trackScrollBehavior();
            }, 150);
        });

        // Form interactions
        document.addEventListener('input', (e) => {
            this.trackFormInteraction(e);
        });

        // Focus and blur events
        document.addEventListener('focus', (e) => {
            this.trackFocusEvent(e, 'focus');
        }, true);

        document.addEventListener('blur', (e) => {
            this.trackFocusEvent(e, 'blur');
        }, true);

        // Copy/paste behavior
        document.addEventListener('copy', (e) => {
            this.trackCopyPaste(e, 'copy');
        });

        document.addEventListener('paste', (e) => {
            this.trackCopyPaste(e, 'paste');
        });
    }

    trackMouseMovement(event) {
        const heatmapPoint = {
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now(),
            page: window.location.pathname
        };

        this.heatmapData.push(heatmapPoint);
        
        // Keep only last 1000 points for performance
        if (this.heatmapData.length > 1000) {
            this.heatmapData.shift();
        }
    }

    trackClick(event) {
        const clickData = {
            x: event.clientX,
            y: event.clientY,
            element: this.getElementInfo(event.target),
            timestamp: Date.now(),
            page: window.location.pathname,
            scrollPosition: window.scrollY,
            viewportSize: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        this.clickPaths.push(clickData);
        this.analyzeBehaviorPattern('click', clickData);
    }

    trackScrollBehavior() {
        const scrollData = {
            position: window.scrollY,
            percentage: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100),
            timestamp: Date.now(),
            page: window.location.pathname,
            direction: this.getScrollDirection()
        };

        this.scrollPatterns.push(scrollData);
        this.analyzeBehaviorPattern('scroll', scrollData);
    }

    trackFormInteraction(event) {
        const formData = {
            element: this.getElementInfo(event.target),
            value: event.target.value,
            timestamp: Date.now(),
            interactionType: event.type,
            formContext: this.getFormContext(event.target)
        };

        this.analyzeBehaviorPattern('form_interaction', formData);
    }

    trackFocusEvent(event, type) {
        const focusData = {
            element: this.getElementInfo(event.target),
            type: type,
            timestamp: Date.now(),
            page: window.location.pathname
        };

        this.analyzeBehaviorPattern('focus', focusData);
    }

    trackCopyPaste(event, action) {
        const copyPasteData = {
            action: action,
            element: this.getElementInfo(event.target),
            timestamp: Date.now(),
            page: window.location.pathname
        };

        this.analyzeBehaviorPattern('copy_paste', copyPasteData);
    }

    trackPageLoad() {
        const loadData = {
            page: window.location.pathname,
            referrer: document.referrer,
            timestamp: Date.now(),
            loadTime: performance.now(),
            userAgent: navigator.userAgent,
            screenResolution: {
                width: screen.width,
                height: screen.height
            }
        };

        this.analyzeBehaviorPattern('page_load', loadData);
    }

    getElementInfo(element) {
        return {
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            text: element.textContent?.slice(0, 50) || '',
            attributes: this.getRelevantAttributes(element),
            xpath: this.getXPath(element)
        };
    }

    getRelevantAttributes(element) {
        const relevantAttrs = ['data-track', 'data-id', 'role', 'type', 'name'];
        const attrs = {};
        
        relevantAttrs.forEach(attr => {
            if (element.hasAttribute(attr)) {
                attrs[attr] = element.getAttribute(attr);
            }
        });
        
        return attrs;
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

    getFormContext(element) {
        const form = element.closest('form');
        if (!form) return null;
        
        return {
            formId: form.id,
            formClass: form.className,
            action: form.action,
            method: form.method,
            fieldCount: form.querySelectorAll('input, textarea, select').length
        };
    }

    getScrollDirection() {
        const currentPosition = window.scrollY;
        const lastPosition = this.lastScrollPosition || 0;
        this.lastScrollPosition = currentPosition;
        
        return currentPosition > lastPosition ? 'down' : 'up';
    }

    analyzeBehaviorPattern(type, data) {
        const userId = this.getUserId();
        const sessionId = this.getSessionId();
        
        if (!this.behaviorData.has(userId)) {
            this.behaviorData.set(userId, {
                sessions: new Map(),
                patterns: {
                    clickHotspots: [],
                    scrollBehavior: [],
                    formInteractions: [],
                    navigationPatterns: []
                }
            });
        }
        
        const userData = this.behaviorData.get(userId);
        
        if (!userData.sessions.has(sessionId)) {
            userData.sessions.set(sessionId, {
                startTime: Date.now(),
                events: [],
                patterns: {}
            });
        }
        
        const session = userData.sessions.get(sessionId);
        session.events.push({ type, data, timestamp: Date.now() });
        
        // Analyze patterns in real-time
        this.updatePatterns(userData, type, data);
    }

    updatePatterns(userData, type, data) {
        switch (type) {
            case 'click':
                this.updateClickPatterns(userData, data);
                break;
            case 'scroll':
                this.updateScrollPatterns(userData, data);
                break;
            case 'form_interaction':
                this.updateFormPatterns(userData, data);
                break;
        }
    }

    updateClickPatterns(userData, clickData) {
        // Find similar click areas
        const threshold = 50; // pixels
        let foundHotspot = false;
        
        userData.patterns.clickHotspots.forEach(hotspot => {
            const distance = Math.sqrt(
                Math.pow(hotspot.x - clickData.x, 2) + 
                Math.pow(hotspot.y - clickData.y, 2)
            );
            
            if (distance < threshold) {
                hotspot.count++;
                hotspot.lastClick = Date.now();
                foundHotspot = true;
            }
        });
        
        if (!foundHotspot) {
            userData.patterns.clickHotspots.push({
                x: clickData.x,
                y: clickData.y,
                count: 1,
                element: clickData.element,
                firstClick: Date.now(),
                lastClick: Date.now()
            });
        }
    }

    updateScrollPatterns(userData, scrollData) {
        userData.patterns.scrollBehavior.push({
            position: scrollData.position,
            percentage: scrollData.percentage,
            timestamp: scrollData.timestamp,
            direction: scrollData.direction
        });
        
        // Keep only last 100 scroll events
        if (userData.patterns.scrollBehavior.length > 100) {
            userData.patterns.scrollBehavior.shift();
        }
    }

    updateFormPatterns(userData, formData) {
        userData.patterns.formInteractions.push({
            element: formData.element,
            timestamp: formData.timestamp,
            interactionType: formData.interactionType,
            formContext: formData.formContext
        });
    }

    startIdleDetection() {
        let idleTimer;
        const idleTime = 30000; // 30 seconds
        
        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            this.isActive = true;
            
            idleTimer = setTimeout(() => {
                this.isActive = false;
                this.trackIdleState();
            }, idleTime);
        };
        
        document.addEventListener('mousemove', resetIdleTimer);
        document.addEventListener('keypress', resetIdleTimer);
        document.addEventListener('scroll', resetIdleTimer);
        document.addEventListener('click', resetIdleTimer);
        
        resetIdleTimer();
    }

    trackIdleState() {
        this.analyzeBehaviorPattern('idle', {
            timestamp: Date.now(),
            duration: 30000, // Known idle duration
            page: window.location.pathname
        });
    }

    initHeatmapTracking() {
        // Create heatmap canvas if needed
        if (!document.getElementById('heatmap-overlay')) {
            const canvas = document.createElement('canvas');
            canvas.id = 'heatmap-overlay';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '9999';
            canvas.style.display = 'none';
            document.body.appendChild(canvas);
        }
    }

    generateHeatmap() {
        const canvas = document.getElementById('heatmap-overlay');
        if (!canvas) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.display = 'block';
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw heatmap points
        this.heatmapData.forEach(point => {
            const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 20);
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(point.x - 20, point.y - 20, 40, 40);
        });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            canvas.style.display = 'none';
        }, 5000);
    }

    getUserId() {
        return localStorage.getItem('userId') || 'anonymous';
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('behaviorSessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('behaviorSessionId', sessionId);
        }
        return sessionId;
    }

    getInsights() {
        const userId = this.getUserId();
        const userData = this.behaviorData.get(userId);
        
        if (!userData) return null;
        
        return {
            clickHotspots: userData.patterns.clickHotspots.sort((a, b) => b.count - a.count),
            scrollBehavior: this.analyzeScrollBehavior(userData.patterns.scrollBehavior),
            formInteractions: this.analyzeFormInteractions(userData.patterns.formInteractions),
            timeOnPage: Date.now() - this.startTime,
            isActive: this.isActive
        };
    }

    analyzeScrollBehavior(scrollData) {
        if (!scrollData.length) return {};
        
        const maxScroll = Math.max(...scrollData.map(s => s.percentage));
        const avgScrollSpeed = scrollData.reduce((sum, s, i) => {
            if (i === 0) return 0;
            const timeDiff = s.timestamp - scrollData[i-1].timestamp;
            const positionDiff = Math.abs(s.position - scrollData[i-1].position);
            return sum + (positionDiff / timeDiff);
        }, 0) / (scrollData.length - 1);
        
        return {
            maxScrollDepth: maxScroll,
            averageScrollSpeed: avgScrollSpeed,
            scrollDirection: scrollData[scrollData.length - 1]?.direction || 'unknown'
        };
    }

    analyzeFormInteractions(formData) {
        if (!formData.length) return {};
        
        const formsInteracted = new Set(formData.map(f => f.formContext?.formId).filter(Boolean));
        const mostInteractedField = formData.reduce((acc, curr) => {
            const field = curr.element.name || curr.element.id;
            if (field) {
                acc[field] = (acc[field] || 0) + 1;
            }
            return acc;
        }, {});
        
        return {
            formsInteracted: formsInteracted.size,
            mostInteractedField: Object.entries(mostInteractedField).sort((a, b) => b[1] - a[1])[0]?.[0],
            totalInteractions: formData.length
        };
    }

    exportBehaviorData() {
        return {
            behaviorData: Array.from(this.behaviorData.entries()),
            heatmapData: this.heatmapData,
            clickPaths: this.clickPaths,
            scrollPatterns: this.scrollPatterns,
            insights: this.getInsights(),
            timestamp: Date.now()
        };
    }

    reset() {
        this.behaviorData.clear();
        this.heatmapData = [];
        this.clickPaths = [];
        this.scrollPatterns = [];
        this.startTime = Date.now();
    }
}

// Auto-initialize
const userBehaviorAnalytics = new UserBehaviorAnalytics();
export default userBehaviorAnalytics;