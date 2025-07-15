/**
 * RAMA 7: Participation Tracker - Seguimiento de participación comunitaria
 * Monitorea y analiza la participación de usuarios en la experiencia cultural
 */

class ParticipationTracker {
    constructor() {
        this.participationMetrics = new Map();
        this.engagementEvents = new Map();
        this.sessionData = new Map();
        this.userJourney = new Map();
        this.culturalInteractions = new Map();
        this.learningProgress = new Map();
        this.communityContributions = new Map();
        this.achievementSystem = new Map();
        this.analytics = new Map();
        
        this.init();
    }

    init() {
        this.setupMetricTypes();
        this.setupAchievements();
        this.bindTrackingEvents();
        this.startSessionTracking();
        this.initializeAnalytics();
        this.createTrackingInterface();
    }

    setupMetricTypes() {
        this.participationMetrics.set('engagement', {
            name: 'Nivel de Engagement',
            description: 'Mide qué tan comprometido está el usuario',
            weight: 3,
            factors: ['time-spent', 'interactions-per-minute', 'return-visits', 'content-completion'],
            thresholds: { low: 30, medium: 60, high: 85 }
        });

        this.participationMetrics.set('cultural-learning', {
            name: 'Aprendizaje Cultural',
            description: 'Progreso en comprensión cultural',
            weight: 5,
            factors: ['cultural-interactions', 'knowledge-assessments', 'reflection-quality', 'cultural-respect'],
            thresholds: { low: 25, medium: 55, high: 80 }
        });

        this.participationMetrics.set('community-contribution', {
            name: 'Contribución Comunitaria',
            description: 'Nivel de contribución a la comunidad',
            weight: 4,
            factors: ['content-contributions', 'feedback-given', 'knowledge-sharing', 'peer-helping'],
            thresholds: { low: 20, medium: 50, high: 75 }
        });

        this.participationMetrics.set('narrative-progression', {
            name: 'Progresión Narrativa',
            description: 'Avance a través de la experiencia narrativa',
            weight: 2,
            factors: ['sections-completed', 'choices-made', 'branches-explored', 'endings-reached'],
            thresholds: { low: 35, medium: 65, high: 90 }
        });

        this.participationMetrics.set('cultural-respect', {
            name: 'Respeto Cultural',
            description: 'Nivel de respeto y sensibilidad cultural demostrado',
            weight: 5,
            factors: ['respectful-interactions', 'cultural-protocol-adherence', 'sensitive-choices', 'appropriate-sharing'],
            thresholds: { low: 40, medium: 70, high: 95 }
        });

        this.participationMetrics.set('collaborative-engagement', {
            name: 'Engagement Colaborativo',
            description: 'Participación en actividades colaborativas',
            weight: 3,
            factors: ['group-activities', 'peer-interactions', 'collaborative-projects', 'community-events'],
            thresholds: { low: 25, medium: 55, high: 80 }
        });
    }

    setupAchievements() {
        this.achievementSystem.set('cultural-explorer', {
            name: 'Explorador Cultural',
            description: 'Ha explorado múltiples elementos culturales',
            icon: '🧭',
            criteria: { cultural_interactions: 25, unique_elements: 10 },
            reward: { points: 100, badge: 'explorer', unlock: 'advanced-cultural-content' }
        });

        this.achievementSystem.set('respectful-learner', {
            name: 'Aprendiz Respetuoso',
            description: 'Demuestra consistente respeto cultural',
            icon: '🙏',
            criteria: { cultural_respect: 80, respectful_choices: 15 },
            reward: { points: 150, badge: 'respectful', unlock: 'cultural-elder-conversations' }
        });

        this.achievementSystem.set('community-contributor', {
            name: 'Contribuidor Comunitario',
            description: 'Contribuye activamente a la comunidad',
            icon: '🤝',
            criteria: { contributions: 10, feedback_quality: 70 },
            reward: { points: 200, badge: 'contributor', unlock: 'community-moderator-tools' }
        });

        this.achievementSystem.set('narrative-master', {
            name: 'Maestro Narrativo',
            description: 'Ha completado múltiples rutas narrativas',
            icon: '📖',
            criteria: { story_completion: 90, branches_explored: 5 },
            reward: { points: 120, badge: 'master', unlock: 'narrative-creation-tools' }
        });

        this.achievementSystem.set('cultural-bridge-builder', {
            name: 'Constructor de Puentes Culturales',
            description: 'Facilita conexiones interculturales',
            icon: '🌉',
            criteria: { intercultural_interactions: 20, bridge_moments: 5 },
            reward: { points: 250, badge: 'bridge-builder', unlock: 'cultural-ambassador-role' }
        });
    }

    bindTrackingEvents() {
        // Eventos de participación
        document.addEventListener('userAction', this.trackUserAction.bind(this));
        document.addEventListener('culturalInteraction', this.trackCulturalInteraction.bind(this));
        document.addEventListener('narrativeProgress', this.trackNarrativeProgress.bind(this));
        document.addEventListener('communityContribution', this.trackCommunityContribution.bind(this));
        document.addEventListener('learningMoment', this.trackLearningMoment.bind(this));
        
        // Eventos de sistema
        document.addEventListener('sessionStart', this.handleSessionStart.bind(this));
        document.addEventListener('sessionEnd', this.handleSessionEnd.bind(this));
        document.addEventListener('achievementUnlocked', this.handleAchievementUnlocked.bind(this));
        
        // Eventos de UI
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    trackUserAction(event) {
        const { action, context, timestamp, duration } = event.detail;
        
        const actionData = {
            id: this.generateEventId(),
            action,
            context,
            timestamp: timestamp || Date.now(),
            duration: duration || 0,
            sessionId: this.getCurrentSessionId()
        };

        this.engagementEvents.set(actionData.id, actionData);
        this.updateEngagementMetrics(actionData);
        this.checkMilestones(actionData);
    }

    trackCulturalInteraction(event) {
        const { elementId, interactionType, culturalContext, respectLevel } = event.detail;
        
        const interaction = {
            id: this.generateEventId(),
            elementId,
            type: interactionType,
            culturalContext,
            respectLevel: respectLevel || 'neutral',
            timestamp: Date.now(),
            sessionId: this.getCurrentSessionId()
        };

        this.culturalInteractions.set(interaction.id, interaction);
        this.updateCulturalLearningMetrics(interaction);
        this.updateCulturalRespectMetrics(interaction);
        this.checkCulturalAchievements(interaction);
    }

    trackNarrativeProgress(event) {
        const { section, progress, choicesMade, branchExplored } = event.detail;
        
        const progressData = {
            id: this.generateEventId(),
            section,
            progress,
            choicesMade: choicesMade || 0,
            branchExplored: branchExplored || false,
            timestamp: Date.now(),
            sessionId: this.getCurrentSessionId()
        };

        this.updateNarrativeMetrics(progressData);
        this.updateUserJourney(progressData);
    }

    trackCommunityContribution(event) {
        const { contributionType, quality, impact, feedback } = event.detail;
        
        const contribution = {
            id: this.generateEventId(),
            type: contributionType,
            quality: quality || 'medium',
            impact: impact || 'local',
            feedback: feedback || {},
            timestamp: Date.now(),
            sessionId: this.getCurrentSessionId()
        };

        this.communityContributions.set(contribution.id, contribution);
        this.updateCommunityMetrics(contribution);
        this.checkCommunityAchievements(contribution);
    }

    trackLearningMoment(event) {
        const { concept, understandingLevel, reflection, application } = event.detail;
        
        const learningData = {
            id: this.generateEventId(),
            concept,
            understandingLevel: understandingLevel || 'basic',
            reflection: reflection || '',
            application: application || false,
            timestamp: Date.now(),
            sessionId: this.getCurrentSessionId()
        };

        this.updateLearningProgress(learningData);
        this.assessKnowledgeGrowth(learningData);
    }

    updateEngagementMetrics(actionData) {
        const currentEngagement = this.participationMetrics.get('engagement');
        const sessionData = this.sessionData.get(this.getCurrentSessionId()) || {};
        
        // Actualizar tiempo total
        const totalTime = (sessionData.totalTime || 0) + (actionData.duration || 0);
        
        // Calcular interacciones por minuto
        const sessionDuration = Date.now() - (sessionData.startTime || Date.now());
        const interactionsPerMinute = sessionData.actionCount / (sessionDuration / 60000);
        
        // Actualizar métricas de engagement
        const engagementScore = this.calculateEngagementScore({
            totalTime,
            interactionsPerMinute,
            actionCount: sessionData.actionCount || 0,
            returnVisits: sessionData.returnVisits || 0
        });

        this.participationMetrics.set('engagement', {
            ...currentEngagement,
            currentValue: engagementScore,
            lastUpdated: Date.now()
        });

        // Actualizar datos de sesión
        this.sessionData.set(this.getCurrentSessionId(), {
            ...sessionData,
            totalTime,
            actionCount: (sessionData.actionCount || 0) + 1,
            lastAction: actionData
        });
    }

    calculateEngagementScore(data) {
        const weights = {
            totalTime: 0.3,
            interactionsPerMinute: 0.25,
            actionCount: 0.25,
            returnVisits: 0.2
        };

        // Normalizar valores
        const normalizedTime = Math.min(data.totalTime / 3600000, 1); // Max 1 hora
        const normalizedInteractions = Math.min(data.interactionsPerMinute / 10, 1); // Max 10 por minuto
        const normalizedActions = Math.min(data.actionCount / 100, 1); // Max 100 acciones
        const normalizedReturns = Math.min(data.returnVisits / 10, 1); // Max 10 visitas

        return Math.round((
            normalizedTime * weights.totalTime +
            normalizedInteractions * weights.interactionsPerMinute +
            normalizedActions * weights.actionCount +
            normalizedReturns * weights.returnVisits
        ) * 100);
    }

    updateCulturalLearningMetrics(interaction) {
        const learningKey = `cultural_learning_${interaction.elementId}`;
        const currentProgress = this.learningProgress.get(learningKey) || {
            interactions: 0,
            understanding: 0,
            respect: 50
        };

        // Incrementar interacciones
        currentProgress.interactions += 1;

        // Actualizar comprensión basada en tipo de interacción
        const understandingGain = this.getUnderstandingGain(interaction.type);
        currentProgress.understanding = Math.min(100, currentProgress.understanding + understandingGain);

        // Actualizar respeto basado en nivel de respeto mostrado
        const respectChange = this.getRespectChange(interaction.respectLevel);
        currentProgress.respect = Math.max(0, Math.min(100, currentProgress.respect + respectChange));

        this.learningProgress.set(learningKey, currentProgress);

        // Actualizar métrica global de aprendizaje cultural
        this.updateGlobalCulturalLearning();
    }

    getUnderstandingGain(interactionType) {
        const gains = {
            'observe': 2,
            'listen': 3,
            'participate': 5,
            'learn': 4,
            'practice': 6,
            'teach': 8,
            'contribute': 7
        };
        return gains[interactionType] || 1;
    }

    getRespectChange(respectLevel) {
        const changes = {
            'very-respectful': 3,
            'respectful': 2,
            'neutral': 0,
            'questionable': -2,
            'disrespectful': -5
        };
        return changes[respectLevel] || 0;
    }

    updateGlobalCulturalLearning() {
        const allProgress = Array.from(this.learningProgress.values());
        const totalInteractions = allProgress.reduce((sum, prog) => sum + prog.interactions, 0);
        const avgUnderstanding = allProgress.reduce((sum, prog) => sum + prog.understanding, 0) / allProgress.length;
        const avgRespect = allProgress.reduce((sum, prog) => sum + prog.respect, 0) / allProgress.length;

        const culturalLearningScore = Math.round((
            Math.min(totalInteractions / 50, 1) * 30 +
            (avgUnderstanding / 100) * 40 +
            (avgRespect / 100) * 30
        ) * 100);

        const currentMetric = this.participationMetrics.get('cultural-learning');
        this.participationMetrics.set('cultural-learning', {
            ...currentMetric,
            currentValue: culturalLearningScore,
            lastUpdated: Date.now()
        });
    }

    checkMilestones(actionData) {
        // Verificar hitos de participación
        const totalActions = this.getTotalActionCount();
        const milestones = [10, 25, 50, 100, 250, 500];
        
        milestones.forEach(milestone => {
            if (totalActions === milestone) {
                this.triggerMilestone('action-milestone', milestone);
            }
        });
    }

    checkCulturalAchievements(interaction) {
        const totalCulturalInteractions = this.getTotalCulturalInteractions();
        const uniqueElements = this.getUniqueElementsInteracted();
        
        // Verificar logro de explorador cultural
        const explorerAchievement = this.achievementSystem.get('cultural-explorer');
        if (totalCulturalInteractions >= explorerAchievement.criteria.cultural_interactions &&
            uniqueElements >= explorerAchievement.criteria.unique_elements) {
            this.unlockAchievement('cultural-explorer');
        }
        
        // Verificar logro de aprendiz respetuoso
        const respectfulAchievement = this.achievementSystem.get('respectful-learner');
        const culturalRespectScore = this.getCulturalRespectScore();
        const respectfulChoices = this.getRespectfulChoicesCount();
        
        if (culturalRespectScore >= respectfulAchievement.criteria.cultural_respect &&
            respectfulChoices >= respectfulAchievement.criteria.respectful_choices) {
            this.unlockAchievement('respectful-learner');
        }
    }

    checkCommunityAchievements(contribution) {
        const totalContributions = this.communityContributions.size;
        const avgQuality = this.getAverageContributionQuality();
        
        // Verificar logro de contribuidor comunitario
        const contributorAchievement = this.achievementSystem.get('community-contributor');
        if (totalContributions >= contributorAchievement.criteria.contributions &&
            avgQuality >= contributorAchievement.criteria.feedback_quality) {
            this.unlockAchievement('community-contributor');
        }
    }

    unlockAchievement(achievementId) {
        const achievement = this.achievementSystem.get(achievementId);
        if (!achievement || achievement.unlocked) return;

        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();

        // Aplicar recompensas
        this.applyAchievementRewards(achievement);

        // Mostrar notificación
        this.showAchievementNotification(achievement);

        // Emitir evento
        const event = new CustomEvent('achievementUnlocked', {
            detail: { achievement }
        });
        document.dispatchEvent(event);
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-header">
                    <span class="achievement-icon">${achievement.icon}</span>
                    <div class="achievement-text">
                        <h3>¡Logro Desbloqueado!</h3>
                        <h4>${achievement.name}</h4>
                    </div>
                </div>
                <p class="achievement-description">${achievement.description}</p>
                <div class="achievement-rewards">
                    <span class="points-reward">+${achievement.reward.points} puntos</span>
                    ${achievement.reward.unlock ? `<span class="unlock-reward">Desbloqueado: ${achievement.reward.unlock}</span>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Animar entrada
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    createTrackingInterface() {
        const trackingPanel = document.createElement('div');
        trackingPanel.className = 'participation-tracking-panel';
        trackingPanel.innerHTML = `
            <div class="tracking-header">
                <h3>Tu Progreso Cultural</h3>
                <button class="toggle-tracking">📊</button>
            </div>
            <div class="tracking-content">
                <div class="metrics-overview">
                    ${this.generateMetricsHTML()}
                </div>
                <div class="achievements-section">
                    <h4>Logros</h4>
                    <div class="achievements-grid">
                        ${this.generateAchievementsHTML()}
                    </div>
                </div>
                <div class="progress-chart">
                    <h4>Progreso en el Tiempo</h4>
                    <canvas class="progress-canvas" width="300" height="150"></canvas>
                </div>
            </div>
        `;

        document.body.appendChild(trackingPanel);
        this.setupTrackingPanelEvents(trackingPanel);
        this.drawProgressChart(trackingPanel.querySelector('.progress-canvas'));
    }

    generateMetricsHTML() {
        return Array.from(this.participationMetrics.entries()).map(([key, metric]) => {
            const value = metric.currentValue || 0;
            const level = this.getMetricLevel(value, metric.thresholds);
            
            return `
                <div class="metric-item ${level}">
                    <div class="metric-name">${metric.name}</div>
                    <div class="metric-value">${value}%</div>
                    <div class="metric-bar">
                        <div class="metric-fill" style="width: ${value}%"></div>
                    </div>
                    <div class="metric-level">${level}</div>
                </div>
            `;
        }).join('');
    }

    generateAchievementsHTML() {
        return Array.from(this.achievementSystem.entries()).map(([id, achievement]) => {
            const progress = this.getAchievementProgress(achievement);
            
            return `
                <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <h5>${achievement.name}</h5>
                        <p>${achievement.description}</p>
                        <div class="achievement-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <span class="progress-text">${progress}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getMetricLevel(value, thresholds) {
        if (value >= thresholds.high) return 'high';
        if (value >= thresholds.medium) return 'medium';
        return 'low';
    }

    getAchievementProgress(achievement) {
        if (achievement.unlocked) return 100;
        
        // Calcular progreso basado en criterios
        const criteriaKeys = Object.keys(achievement.criteria);
        let totalProgress = 0;
        
        criteriaKeys.forEach(key => {
            const required = achievement.criteria[key];
            const current = this.getCurrentValue(key);
            const progress = Math.min(100, (current / required) * 100);
            totalProgress += progress;
        });
        
        return Math.round(totalProgress / criteriaKeys.length);
    }

    getCurrentValue(metric) {
        switch (metric) {
            case 'cultural_interactions':
                return this.getTotalCulturalInteractions();
            case 'unique_elements':
                return this.getUniqueElementsInteracted();
            case 'cultural_respect':
                return this.getCulturalRespectScore();
            case 'respectful_choices':
                return this.getRespectfulChoicesCount();
            case 'contributions':
                return this.communityContributions.size;
            case 'feedback_quality':
                return this.getAverageContributionQuality();
            default:
                return 0;
        }
    }

    // Métodos auxiliares para cálculos
    getTotalActionCount() {
        return this.engagementEvents.size;
    }

    getTotalCulturalInteractions() {
        return this.culturalInteractions.size;
    }

    getUniqueElementsInteracted() {
        const uniqueElements = new Set();
        this.culturalInteractions.forEach(interaction => {
            uniqueElements.add(interaction.elementId);
        });
        return uniqueElements.size;
    }

    getCulturalRespectScore() {
        const respectMetric = this.participationMetrics.get('cultural-respect');
        return respectMetric?.currentValue || 50;
    }

    getRespectfulChoicesCount() {
        // Simular conteo de decisiones respetuosas
        return Math.floor(this.getTotalActionCount() * 0.7);
    }

    getAverageContributionQuality() {
        if (this.communityContributions.size === 0) return 0;
        
        const qualityValues = { low: 25, medium: 50, high: 75, excellent: 100 };
        let totalQuality = 0;
        
        this.communityContributions.forEach(contribution => {
            totalQuality += qualityValues[contribution.quality] || 50;
        });
        
        return Math.round(totalQuality / this.communityContributions.size);
    }

    generateEventId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getCurrentSessionId() {
        return sessionStorage.getItem('sessionId') || this.createNewSession();
    }

    createNewSession() {
        const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('sessionId', sessionId);
        
        this.sessionData.set(sessionId, {
            startTime: Date.now(),
            actionCount: 0,
            totalTime: 0
        });
        
        return sessionId;
    }

    // API pública
    getParticipationSummary() {
        return {
            totalSessions: this.sessionData.size,
            totalActions: this.getTotalActionCount(),
            culturalInteractions: this.getTotalCulturalInteractions(),
            achievementsUnlocked: Array.from(this.achievementSystem.values())
                .filter(a => a.unlocked).length,
            overallEngagement: this.participationMetrics.get('engagement')?.currentValue || 0,
            culturalLearning: this.participationMetrics.get('cultural-learning')?.currentValue || 0
        };
    }

    getDetailedMetrics() {
        return new Map(this.participationMetrics);
    }

    exportParticipationData() {
        return {
            metrics: Object.fromEntries(this.participationMetrics),
            events: Object.fromEntries(this.engagementEvents),
            culturalInteractions: Object.fromEntries(this.culturalInteractions),
            achievements: Object.fromEntries(this.achievementSystem),
            sessions: Object.fromEntries(this.sessionData)
        };
    }

    resetUserProgress() {
        // Reiniciar progreso del usuario (para testing o nueva experiencia)
        this.participationMetrics.clear();
        this.engagementEvents.clear();
        this.culturalInteractions.clear();
        this.learningProgress.clear();
        this.communityContributions.clear();
        
        this.setupMetricTypes();
        this.setupAchievements();
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.participationTracker = new ParticipationTracker();
});

export default ParticipationTracker;