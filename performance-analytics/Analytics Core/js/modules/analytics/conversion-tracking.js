/**
 * Conversion Tracking Module
 * Tracks user journey through conversion funnels and goal completion
 */

class ConversionTracking {
    constructor() {
        this.conversions = new Map();
        this.funnels = new Map();
        this.goals = new Map();
        this.userJourney = [];
        this.conversionEvents = [];
        this.sessionStart = Date.now();
        
        this.defaultFunnels = {
            signup: ['landing', 'form_view', 'form_start', 'form_submit', 'success'],
            purchase: ['product_view', 'add_to_cart', 'checkout_start', 'payment', 'confirmation'],
            engagement: ['visit', 'content_view', 'interaction', 'social_action', 'return_visit'],
            subscription: ['pricing_view', 'plan_select', 'checkout', 'payment', 'activation']
        };
        
        this.init();
    }

    init() {
        this.setupFunnels();
        this.setupGoalTracking();
        this.setupConversionTracking();
        this.loadStoredData();
    }

    setupFunnels() {
        // Initialize default funnels
        Object.entries(this.defaultFunnels).forEach(([name, steps]) => {
            this.createFunnel(name, steps);
        });

        // Custom funnel detection
        this.detectCustomFunnels();
    }

    createFunnel(name, steps, config = {}) {
        const funnel = {
            name,
            steps,
            config: {
                timeWindow: config.timeWindow || 24 * 60 * 60 * 1000, // 24 hours
                allowSkipSteps: config.allowSkipSteps || false,
                conversionGoal: config.conversionGoal || steps[steps.length - 1],
                ...config
            },
            analytics: {
                totalSessions: 0,
                conversions: 0,
                conversionRate: 0,
                stepConversions: steps.reduce((acc, step) => ({ ...acc, [step]: 0 }), {}),
                dropoffPoints: [],
                averageTime: 0
            }
        };

        this.funnels.set(name, funnel);
        return funnel;
    }

    setupGoalTracking() {
        // Common conversion goals
        this.createGoal('signup', {
            trigger: 'form_submission',
            conditions: { formType: 'signup' },
            value: 1,
            category: 'acquisition'
        });

        this.createGoal('purchase', {
            trigger: 'transaction_complete',
            conditions: { status: 'success' },
            value: 'dynamic', // Will be set from transaction data
            category: 'revenue'
        });

        this.createGoal('engagement', {
            trigger: 'social_interaction',
            conditions: { actions: ['like', 'share', 'comment'] },
            value: 0.5,
            category: 'engagement'
        });

        this.createGoal('content_completion', {
            trigger: 'content_finished',
            conditions: { completion: 80 }, // 80% completion
            value: 0.8,
            category: 'engagement'
        });

        this.createGoal('newsletter_signup', {
            trigger: 'subscription',
            conditions: { type: 'newsletter' },
            value: 0.3,
            category: 'acquisition'
        });
    }

    createGoal(name, config) {
        const goal = {
            name,
            config,
            analytics: {
                completions: 0,
                conversionRate: 0,
                totalValue: 0,
                averageTime: 0,
                lastCompleted: null
            }
        };

        this.goals.set(name, goal);
        return goal;
    }

    setupConversionTracking() {
        // Track page views and route changes
        this.trackPageView();
        
        // Form tracking
        document.addEventListener('submit', (e) => {
            this.trackFormSubmission(e);
        });

        // Button clicks (CTA tracking)
        document.addEventListener('click', (e) => {
            this.trackButtonClick(e);
        });

        // Custom events
        document.addEventListener('conversionEvent', (e) => {
            this.trackCustomEvent(e);
        });

        // E-commerce tracking
        document.addEventListener('transactionComplete', (e) => {
            this.trackTransaction(e);
        });

        // Content engagement
        document.addEventListener('contentEngagement', (e) => {
            this.trackContentEngagement(e);
        });
    }

    trackPageView() {
        const pageData = {
            type: 'page_view',
            url: window.location.href,
            path: window.location.pathname,
            referrer: document.referrer,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart
        };

        this.addToJourney(pageData);
        this.updateFunnelProgress('page_view', pageData);
    }

    trackFormSubmission(event) {
        const form = event.target;
        const formData = {
            type: 'form_submission',
            formType: form.dataset.type || 'unknown',
            formId: form.id,
            action: form.action,
            fieldCount: form.querySelectorAll('input, textarea, select').length,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart
        };

        this.addToJourney(formData);
        this.updateFunnelProgress('form_submit', formData);
        this.checkGoalCompletion('signup', formData);
    }

    trackButtonClick(event) {
        const button = event.target;
        const buttonData = {
            type: 'button_click',
            buttonType: button.dataset.type || 'unknown',
            buttonText: button.textContent.trim(),
            buttonId: button.id,
            ctaType: button.dataset.cta,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart
        };

        // Track CTA clicks
        if (button.dataset.cta) {
            this.addToJourney(buttonData);
            this.updateFunnelProgress(button.dataset.cta, buttonData);
        }
    }

    trackCustomEvent(event) {
        const eventData = {
            type: 'custom_event',
            eventName: event.detail.name,
            eventData: event.detail.data,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart
        };

        this.addToJourney(eventData);
        this.updateFunnelProgress(event.detail.name, eventData);
        this.checkGoalCompletion(event.detail.name, eventData);
    }

    trackTransaction(event) {
        const transactionData = {
            type: 'transaction',
            transactionId: event.detail.id,
            value: event.detail.value,
            currency: event.detail.currency || 'USD',
            items: event.detail.items || [],
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart
        };

        this.addToJourney(transactionData);
        this.updateFunnelProgress('transaction_complete', transactionData);
        this.checkGoalCompletion('purchase', transactionData);
    }

    trackContentEngagement(event) {
        const contentData = {
            type: 'content_engagement',
            contentId: event.detail.contentId,
            contentType: event.detail.type,
            engagement: event.detail.engagement,
            completion: event.detail.completion,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart
        };

        this.addToJourney(contentData);
        
        if (contentData.completion >= 80) {
            this.checkGoalCompletion('content_completion', contentData);
        }
    }

    addToJourney(eventData) {
        this.userJourney.push(eventData);
        this.conversionEvents.push(eventData);
        
        // Keep journey manageable
        if (this.userJourney.length > 100) {
            this.userJourney.shift();
        }
    }

    updateFunnelProgress(stepName, eventData) {
        this.funnels.forEach((funnel, funnelName) => {
            if (funnel.steps.includes(stepName)) {
                this.progressFunnel(funnelName, stepName, eventData);
            }
        });
    }

    progressFunnel(funnelName, stepName, eventData) {
        const funnel = this.funnels.get(funnelName);
        if (!funnel) return;

        const stepIndex = funnel.steps.indexOf(stepName);
        if (stepIndex === -1) return;

        // Update step conversion
        funnel.analytics.stepConversions[stepName]++;

        // Check if this completes the funnel
        if (stepIndex === funnel.steps.length - 1) {
            funnel.analytics.conversions++;
            this.recordConversion(funnelName, eventData);
        }

        // Update total sessions (unique starts)
        if (stepIndex === 0) {
            funnel.analytics.totalSessions++;
        }

        // Calculate conversion rate
        if (funnel.analytics.totalSessions > 0) {
            funnel.analytics.conversionRate = 
                (funnel.analytics.conversions / funnel.analytics.totalSessions) * 100;
        }

        // Analyze dropoff points
        this.analyzeDropoffPoints(funnel);
    }

    recordConversion(funnelName, eventData) {
        const conversion = {
            funnelName,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart,
            userJourney: [...this.userJourney],
            eventData,
            value: eventData.value || 1
        };

        this.conversions.set(`${funnelName}_${Date.now()}`, conversion);
    }

    checkGoalCompletion(goalName, eventData) {
        const goal = this.goals.get(goalName);
        if (!goal) return;

        const conditions = goal.config.conditions;
        let conditionsMet = true;

        // Check conditions
        if (conditions) {
            Object.entries(conditions).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    conditionsMet = conditionsMet && value.includes(eventData[key]);
                } else {
                    conditionsMet = conditionsMet && eventData[key] === value;
                }
            });
        }

        if (conditionsMet) {
            this.completeGoal(goalName, eventData);
        }
    }

    completeGoal(goalName, eventData) {
        const goal = this.goals.get(goalName);
        if (!goal) return;

        goal.analytics.completions++;
        goal.analytics.lastCompleted = Date.now();

        // Calculate value
        let value = goal.config.value;
        if (value === 'dynamic' && eventData.value) {
            value = eventData.value;
        }
        
        goal.analytics.totalValue += value;

        // Record goal completion
        this.recordGoalCompletion(goalName, eventData, value);
    }

    recordGoalCompletion(goalName, eventData, value) {
        const completion = {
            goalName,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart,
            value,
            eventData,
            userJourney: [...this.userJourney]
        };

        this.conversions.set(`goal_${goalName}_${Date.now()}`, completion);
    }

    analyzeDropoffPoints(funnel) {
        const stepConversions = Object.values(funnel.analytics.stepConversions);
        const dropoffPoints = [];

        for (let i = 0; i < stepConversions.length - 1; i++) {
            const current = stepConversions[i];
            const next = stepConversions[i + 1];
            
            if (current > 0) {
                const dropoffRate = ((current - next) / current) * 100;
                dropoffPoints.push({
                    step: funnel.steps[i],
                    nextStep: funnel.steps[i + 1],
                    dropoffRate: Math.round(dropoffRate)
                });
            }
        }

        funnel.analytics.dropoffPoints = dropoffPoints
            .sort((a, b) => b.dropoffRate - a.dropoffRate)
            .slice(0, 3); // Top 3 dropoff points
    }

    detectCustomFunnels() {
        // Analyze user journey patterns to detect custom funnels
        const patterns = this.analyzeJourneyPatterns();
        
        patterns.forEach(pattern => {
            if (pattern.frequency > 5 && pattern.steps.length > 2) {
                this.createFunnel(`custom_${pattern.id}`, pattern.steps, {
                    autoDetected: true,
                    frequency: pattern.frequency
                });
            }
        });
    }

    analyzeJourneyPatterns() {
        const patterns = new Map();
        
        // Analyze sequences of events
        for (let i = 0; i < this.userJourney.length - 2; i++) {
            const sequence = this.userJourney.slice(i, i + 3).map(event => event.type);
            const patternKey = sequence.join('->');
            
            if (!patterns.has(patternKey)) {
                patterns.set(patternKey, {
                    id: patternKey.replace(/[^a-zA-Z0-9]/g, '_'),
                    steps: sequence,
                    frequency: 0
                });
            }
            
            patterns.get(patternKey).frequency++;
        }
        
        return Array.from(patterns.values());
    }

    getConversionReport() {
        const report = {
            overview: {
                totalConversions: this.conversions.size,
                totalFunnels: this.funnels.size,
                totalGoals: this.goals.size,
                sessionDuration: Date.now() - this.sessionStart
            },
            funnels: {},
            goals: {},
            topConversions: [],
            conversionTrends: this.getConversionTrends()
        };

        // Funnel analytics
        this.funnels.forEach((funnel, name) => {
            report.funnels[name] = {
                ...funnel.analytics,
                stepConversionRates: this.calculateStepConversionRates(funnel)
            };
        });

        // Goal analytics
        this.goals.forEach((goal, name) => {
            report.goals[name] = {
                ...goal.analytics,
                conversionRate: this.calculateGoalConversionRate(goal)
            };
        });

        // Top conversions
        report.topConversions = Array.from(this.conversions.values())
            .sort((a, b) => (b.value || 0) - (a.value || 0))
            .slice(0, 10);

        return report;
    }

    calculateStepConversionRates(funnel) {
        const rates = {};
        const steps = funnel.steps;
        
        for (let i = 0; i < steps.length - 1; i++) {
            const currentStep = steps[i];
            const nextStep = steps[i + 1];
            const currentCount = funnel.analytics.stepConversions[currentStep] || 0;
            const nextCount = funnel.analytics.stepConversions[nextStep] || 0;
            
            rates[`${currentStep}_to_${nextStep}`] = currentCount > 0 ? 
                Math.round((nextCount / currentCount) * 100) : 0;
        }
        
        return rates;
    }

    calculateGoalConversionRate(goal) {
        // Calculate conversion rate based on total sessions or page views
        const totalSessions = this.userJourney.filter(event => event.type === 'page_view').length;
        return totalSessions > 0 ? 
            Math.round((goal.analytics.completions / totalSessions) * 100) : 0;
    }

    getConversionTrends() {
        const timeWindows = [1, 6, 24]; // hours
        const trends = {};
        
        timeWindows.forEach(hours => {
            const windowStart = Date.now() - (hours * 60 * 60 * 1000);
            const windowConversions = Array.from(this.conversions.values())
                .filter(conversion => conversion.timestamp >= windowStart);
            
            trends[`${hours}h`] = {
                count: windowConversions.length,
                value: windowConversions.reduce((sum, conv) => sum + (conv.value || 0), 0),
                averageValue: windowConversions.length > 0 ? 
                    windowConversions.reduce((sum, conv) => sum + (conv.value || 0), 0) / windowConversions.length : 0
            };
        });
        
        return trends;
    }

    getOptimizationSuggestions() {
        const suggestions = [];
        
        // Analyze funnel dropoffs
        this.funnels.forEach((funnel, name) => {
            if (funnel.analytics.dropoffPoints.length > 0) {
                const topDropoff = funnel.analytics.dropoffPoints[0];
                if (topDropoff.dropoffRate > 50) {
                    suggestions.push({
                        type: 'funnel_optimization',
                        priority: 'high',
                        funnel: name,
                        issue: `High dropoff rate (${topDropoff.dropoffRate}%) from ${topDropoff.step} to ${topDropoff.nextStep}`,
                        recommendation: `Optimize the ${topDropoff.nextStep} step to reduce friction`
                    });
                }
            }
            
            if (funnel.analytics.conversionRate < 10) {
                suggestions.push({
                    type: 'conversion_optimization',
                    priority: 'medium',
                    funnel: name,
                    issue: `Low conversion rate (${funnel.analytics.conversionRate}%)`,
                    recommendation: `A/B test the funnel steps to improve conversion`
                });
            }
        });
        
        // Analyze goal performance
        this.goals.forEach((goal, name) => {
            const rate = this.calculateGoalConversionRate(goal);
            if (rate < 5) {
                suggestions.push({
                    type: 'goal_optimization',
                    priority: 'medium',
                    goal: name,
                    issue: `Low goal conversion rate (${rate}%)`,
                    recommendation: `Review goal setup and optimize trigger conditions`
                });
            }
        });
        
        return suggestions.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    loadStoredData() {
        const storedConversions = localStorage.getItem('conversionData');
        if (storedConversions) {
            try {
                const data = JSON.parse(storedConversions);
                if (data.conversions) {
                    this.conversions = new Map(data.conversions);
                }
                if (data.userJourney) {
                    this.userJourney = data.userJourney;
                }
            } catch (e) {
                console.warn('Failed to load conversion data:', e);
            }
        }
    }

    saveData() {
        const data = {
            conversions: Array.from(this.conversions.entries()),
            userJourney: this.userJourney.slice(-50), // Keep last 50 events
            timestamp: Date.now()
        };
        
        localStorage.setItem('conversionData', JSON.stringify(data));
    }

    exportData() {
        return {
            conversions: Array.from(this.conversions.entries()),
            funnels: Array.from(this.funnels.entries()),
            goals: Array.from(this.goals.entries()),
            userJourney: this.userJourney,
            conversionEvents: this.conversionEvents,
            report: this.getConversionReport(),
            suggestions: this.getOptimizationSuggestions(),
            timestamp: Date.now()
        };
    }

    // Public API methods
    triggerConversion(eventName, data = {}) {
        const event = new CustomEvent('conversionEvent', {
            detail: { name: eventName, data }
        });
        document.dispatchEvent(event);
    }

    completeTransaction(transactionData) {
        const event = new CustomEvent('transactionComplete', {
            detail: transactionData
        });
        document.dispatchEvent(event);
    }

    trackContentEngagement(contentId, type, engagement, completion) {
        const event = new CustomEvent('contentEngagement', {
            detail: { contentId, type, engagement, completion }
        });
        document.dispatchEvent(event);
    }

    reset() {
        this.conversions.clear();
        this.userJourney = [];
        this.conversionEvents = [];
        this.sessionStart = Date.now();
        
        // Reset analytics
        this.funnels.forEach(funnel => {
            funnel.analytics = {
                totalSessions: 0,
                conversions: 0,
                conversionRate: 0,
                stepConversions: funnel.steps.reduce((acc, step) => ({ ...acc, [step]: 0 }), {}),
                dropoffPoints: [],
                averageTime: 0
            };
        });
        
        this.goals.forEach(goal => {
            goal.analytics = {
                completions: 0,
                conversionRate: 0,
                totalValue: 0,
                averageTime: 0,
                lastCompleted: null
            };
        });
        
        localStorage.removeItem('conversionData');
    }
}

// Auto-initialize
const conversionTracking = new ConversionTracking();

// Auto-save every 30 seconds
setInterval(() => {
    conversionTracking.saveData();
}, 30000);

export default conversionTracking;