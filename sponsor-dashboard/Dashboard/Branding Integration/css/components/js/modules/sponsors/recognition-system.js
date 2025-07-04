/**
 * RECOGNITION SYSTEM
 * Sistema de reconocimiento automático para patrocinadores
 * Gestiona achievements, badges, certificados y celebraciones
 */

class RecognitionSystem {
    constructor(options = {}) {
        this.options = {
            autoDetect: true,
            enableAnimations: true,
            enableNotifications: true,
            enableCelebrations: true,
            saveToStorage: true,
            apiEndpoint: '/api/recognition',
            ...options
        };

        this.recognitions = new Map();
        this.achievements = new Map();
        this.milestones = new Map();
        this.badges = new Map();
        this.eventQueue = [];
        this.celebrationActive = false;

        this.init();
    }

    /**
     * Inicializa el sistema de reconocimiento
     */
    init() {
        this.loadRecognitionData();
        this.setupEventListeners();
        this.startPeriodicCheck();
        
        if (this.options.autoDetect) {
            this.detectAchievements();
        }

        console.log('✨ Sistema de Reconocimiento inicializado');
    }

    /**
     * Carga datos de reconocimientos desde almacenamiento
     */
    loadRecognitionData() {
        try {
            const savedData = localStorage.getItem('sponsorRecognitions');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.recognitions = new Map(data.recognitions || []);
                this.achievements = new Map(data.achievements || []);
                this.milestones = new Map(data.milestones || []);
                this.badges = new Map(data.badges || []);
            }
        } catch (error) {
            console.warn('Error cargando datos de reconocimiento:', error);
        }
    }

    /**
     * Guarda datos de reconocimientos
     */
    saveRecognitionData() {
        if (!this.options.saveToStorage) return;

        try {
            const data = {
                recognitions: Array.from(this.recognitions.entries()),
                achievements: Array.from(this.achievements.entries()),
                milestones: Array.from(this.milestones.entries()),
                badges: Array.from(this.badges.entries()),
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('sponsorRecognitions', JSON.stringify(data));
        } catch (error) {
            console.warn('Error guardando datos de reconocimiento:', error);
        }
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Escuchar cambios en métricas
        document.addEventListener('metricsUpdated', (e) => {
            this.handleMetricsUpdate(e.detail);
        });

        // Escuchar nuevos logros
        document.addEventListener('achievementUnlocked', (e) => {
            this.handleAchievementUnlocked(e.detail);
        });

        // Escuchar clicks en reconocimientos
        document.addEventListener('click', (e) => {
            if (e.target.closest('.recognition-item')) {
                this.handleRecognitionClick(e.target.closest('.recognition-item'));
            }
        });
    }

    /**
     * Inicia verificación periódica de logros
     */
    startPeriodicCheck() {
        setInterval(() => {
            this.detectAchievements();
            this.processEventQueue();
        }, 30000); // Cada 30 segundos
    }

    /**
     * Detecta logros automáticamente basado en métricas
     */
    async detectAchievements() {
        try {
            const metrics = await this.getCurrentMetrics();
            const newAchievements = this.evaluateAchievements(metrics);
            
            newAchievements.forEach(achievement => {
                this.unlockAchievement(achievement);
            });
        } catch (error) {
            console.error('Error detectando achievements:', error);
        }
    }

    /**
     * Obtiene métricas actuales
     */
    async getCurrentMetrics() {
        try {
            const response = await fetch('/api/metrics/current');
            return await response.json();
        } catch (error) {
            // Fallback a datos locales si no hay API
            return this.getMetricsFromDOM();
        }
    }

    /**
     * Obtiene métricas desde el DOM como fallback
     */
    getMetricsFromDOM() {
        const metrics = {};
        
        // Buscar elementos con data-metric
        document.querySelectorAll('[data-metric]').forEach(el => {
            const metricName = el.dataset.metric;
            const value = parseFloat(el.textContent.replace(/[^\d.-]/g, ''));
            if (!isNaN(value)) {
                metrics[metricName] = value;
            }
        });

        return metrics;
    }

    /**
     * Evalúa qué achievements se han desbloqueado
     */
    evaluateAchievements(metrics) {
        const newAchievements = [];
        
        // Definición de achievements
        const achievementRules = [
            {
                id: 'first_impact',
                name: 'Primer Impacto',
                description: 'Has impactado tu primera vida',
                condition: (m) => m.lives_impacted >= 1,
                badge: 'heart',
                tier: 'bronze',
                points: 100
            },
            {
                id: 'hundred_lives',
                name: 'Centenar de Vidas',
                description: 'Has impactado 100 vidas',
                condition: (m) => m.lives_impacted >= 100,
                badge: 'users',
                tier: 'silver',
                points: 500
            },
            {
                id: 'thousand_lives',
                name: 'Mil Vidas Transformadas',
                description: 'Has impactado 1000 vidas',
                condition: (m) => m.lives_impacted >= 1000,
                badge: 'globe',
                tier: 'gold',
                points: 2000
            },
            {
                id: 'engagement_master',
                name: 'Maestro del Engagement',
                description: 'Alcanzaste 5% de engagement rate',
                condition: (m) => m.engagement_rate >= 5.0,
                badge: 'trending-up',
                tier: 'gold',
                points: 1500
            },
            {
                id: 'fundraising_hero',
                name: 'Héroe de Recaudación',
                description: 'Recaudaste €100,000',
                condition: (m) => m.funds_raised >= 100000,
                badge: 'dollar-sign',
                tier: 'platinum',
                points: 5000
            },
            {
                id: 'efficiency_expert',
                name: 'Experto en Eficiencia',
                description: 'Costo por impacto menor a €50',
                condition: (m) => m.cost_per_impact <= 50,
                badge: 'zap',
                tier: 'platinum',
                points: 3000
            },
            {
                id: 'community_builder',
                name: 'Constructor de Comunidad',
                description: '50 comunidades alcanzadas',
                condition: (m) => m.communities_reached >= 50,
                badge: 'home',
                tier: 'gold',
                points: 1200
            },
            {
                id: 'viral_impact',
                name: 'Impacto Viral',
                description: '1M de impresiones de logo',
                condition: (m) => m.logo_impressions >= 1000000,
                badge: 'eye',
                tier: 'platinum',
                points: 4000
            },
            {
                id: 'consistent_performer',
                name: 'Rendimiento Consistente',
                description: '6 meses consecutivos superando objetivos',
                condition: (m) => this.checkConsistentPerformance(m),
                badge: 'award',
                tier: 'platinum',
                points: 6000
            },
            {
                id: 'innovation_pioneer',
                name: 'Pionero de Innovación',
                description: 'Índice de innovación superior a 85',
                condition: (m) => m.innovation_index >= 85,
                badge: 'lightbulb',
                tier: 'gold',
                points: 2500
            }
        ];

        achievementRules.forEach(rule => {
            if (!this.achievements.has(rule.id) && rule.condition(metrics)) {
                newAchievements.push(rule);
            }
        });

        return newAchievements;
    }

    /**
     * Verifica rendimiento consistente
     */
    checkConsistentPerformance(metrics) {
        // Lógica para verificar rendimiento consistente
        // Esto requeriría datos históricos
        return false; // Placeholder
    }

    /**
     * Desbloquea un achievement
     */
    unlockAchievement(achievement) {
        const achievementData = {
            ...achievement,
            unlockedAt: new Date().toISOString(),
            id: achievement.id
        };

        this.achievements.set(achievement.id, achievementData);
        this.addToEventQueue('achievement', achievementData);
        
        if (this.options.enableNotifications) {
            this.showAchievementNotification(achievementData);
        }

        if (this.options.enableCelebrations) {
            this.triggerCelebration(achievement.tier);
        }

        this.saveRecognitionData();
        this.updateUI();

        // Disparar evento personalizado
        document.dispatchEvent(new CustomEvent('achievementUnlocked', {
            detail: achievementData
        }));

        console.log('🏆 Achievement desbloqueado:', achievement.name);
    }

    /**
     * Añade milestone
     */
    addMilestone(milestone) {
        const milestoneData = {
            id: milestone.id || this.generateId(),
            title: milestone.title,
            description: milestone.description,
            achievedAt: milestone.achievedAt || new Date().toISOString(),
            value: milestone.value,
            metric: milestone.metric,
            impact: milestone.impact || 'medium',
            category: milestone.category || 'general'
        };

        this.milestones.set(milestoneData.id, milestoneData);
        this.addToEventQueue('milestone', milestoneData);
        this.saveRecognitionData();
        this.updateUI();

        console.log('📍 Milestone añadido:', milestone.title);
    }

    /**
     * Otorga badge
     */
    awardBadge(badge) {
        const badgeData = {
            id: badge.id || this.generateId(),
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            tier: badge.tier || 'bronze',
            awardedAt: new Date().toISOString(),
            category: badge.category || 'general'
        };

        this.badges.set(badgeData.id, badgeData);
        this.addToEventQueue('badge', badgeData);
        
        if (this.options.enableNotifications) {
            this.showBadgeNotification(badgeData);
        }

        this.saveRecognitionData();
        this.updateUI();

        console.log('🎖️ Badge otorgado:', badge.name);
    }

    /**
     * Añade evento a la cola
     */
    addToEventQueue(type, data) {
        this.eventQueue.push({
            type,
            data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Procesa la cola de eventos
     */
    processEventQueue() {
        if (this.eventQueue.length === 0) return;

        const event = this.eventQueue.shift();
        this.processRecognitionEvent(event);
    }

    /**
     * Procesa un evento de reconocimiento
     */
    processRecognitionEvent(event) {
        switch (event.type) {
            case 'achievement':
                this.displayAchievement(event.data);
                break;
            case 'milestone':
                this.displayMilestone(event.data);
                break;
            case 'badge':
                this.displayBadge(event.data);
                break;
        }
    }

    /**
     * Muestra notificación de achievement
     */
    showAchievementNotification(achievement) {
        this.createNotification({
            type: 'achievement',
            title: '🏆 ¡Logro Desbloqueado!',
            message: `${achievement.name}: ${achievement.description}`,
            duration: 5000,
            tier: achievement.tier
        });
    }

    /**
     * Muestra notificación de badge
     */
    showBadgeNotification(badge) {
        this.createNotification({
            type: 'badge',
            title: '🎖️ ¡Nuevo Badge!',
            message: `${badge.name}: ${badge.description}`,
            duration: 4000,
            tier: badge.tier
        });
    }

    /**
     * Crea notificación visual
     */
    createNotification(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.className = `recognition-notification ${notification.type} tier-${notification.tier}`;
        notificationEl.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Aplicar estilos
        Object.assign(notificationEl.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: this.getTierColor(notification.tier),
            color: 'white',
            padding: '1rem',
            borderRadius: '12px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
            zIndex: '10000',
            maxWidth: '350px',
            animation: 'slideInRight 0.5s ease'
        });

        document.body.appendChild(notificationEl);

        // Auto-remove
        setTimeout(() => {
            if (notificationEl.parentNode) {
                notificationEl.style.animation = 'slideOutRight 0.5s ease';
                setTimeout(() => {
                    notificationEl.remove();
                }, 500);
            }
        }, notification.duration || 4000);

        // Close button
        notificationEl.querySelector('.notification-close').addEventListener('click', () => {
            notificationEl.remove();
        });
    }

    /**
     * Obtiene color por tier
     */
    getTierColor(tier) {
        const colors = {
            bronze: 'linear-gradient(135deg, #f97316, #ea580c)',
            silver: 'linear-gradient(135deg, #d1d5db, #9ca3af)',
            gold: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            platinum: 'linear-gradient(135deg, #e5e7eb, #9ca3af)'
        };
        return colors[tier] || colors.bronze;
    }

    /**
     * Activa celebración
     */
    triggerCelebration(tier = 'bronze') {
        if (this.celebrationActive) return;
        
        this.celebrationActive = true;
        
        const celebration = document.createElement('div');
        celebration.className = 'celebration-overlay';
        celebration.innerHTML = this.getCelebrationHTML(tier);
        
        document.body.appendChild(celebration);
        
        // Activar animación
        setTimeout(() => {
            celebration.classList.add('active');
        }, 100);
        
        // Remover después de la animación
        setTimeout(() => {
            celebration.remove();
            this.celebrationActive = false;
        }, 3000);

        // Efectos de sonido (si está disponible)
        this.playSuccessSound();
    }

    /**
     * Obtiene HTML de celebración
     */
    getCelebrationHTML(tier) {
        const emojis = {
            bronze: '🎉 🎊 ✨',
            silver: '🎉 🎊 ✨ 🌟',
            gold: '🎉 🎊 ✨ 🌟 🏆',
            platinum: '🎉 🎊 ✨ 🌟 🏆 💎'
        };

        return `
            <div class="celebration-content">
                <div class="celebration-emojis">${emojis[tier] || emojis.bronze}</div>
                <div class="celebration-message">¡Felicitaciones!</div>
            </div>
        `;
    }

    /**
     * Reproduce sonido de éxito
     */
    playSuccessSound() {
        try {
            const audio = new Audio('/sounds/achievement.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Fallo silencioso si no hay audio
            });
        } catch (error) {
            // Audio no disponible
        }
    }

    /**
     * Actualiza la UI
     */
    updateUI() {
        this.updateRecognitionPanel();
        this.updateProgressBars();
        this.updateBadgeDisplay();
        this.updateStatsCards();
    }

    /**
     * Actualiza panel de reconocimientos
     */
    updateRecognitionPanel() {
        const panel = document.querySelector('.recognition-panel');
        if (!panel) return;

        const recentAchievements = Array.from(this.achievements.values())
            .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
            .slice(0, 5);

        panel.innerHTML = `
            <h3>Reconocimientos Recientes</h3>
            <div class="achievement-list">
                ${recentAchievements.map(achievement => `
                    <div class="achievement-item tier-${achievement.tier}">
                        <div class="achievement-icon">${this.getIconHTML(achievement.badge)}</div>
                        <div class="achievement-info">
                            <div class="achievement-name">${achievement.name}</div>
                            <div class="achievement-desc">${achievement.description}</div>
                            <div class="achievement-date">${new Date(achievement.unlockedAt).toLocaleDateString()}</div>
                        </div>
                        <div class="achievement-points">+${achievement.points}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Actualiza barras de progreso
     */
    updateProgressBars() {
        document.querySelectorAll('.progress-bar[data-metric]').forEach(bar => {
            const metric = bar.dataset.metric;
            const current = parseFloat(bar.dataset.current) || 0;
            const target = parseFloat(bar.dataset.target) || 100;
            const percentage = Math.min((current / target) * 100, 100);
            
            const fill = bar.querySelector('.progress-fill');
            if (fill) {
                fill.style.width = `${percentage}%`;
                
                // Añadir clase de logro si se completó
                if (percentage >= 100 && !bar.classList.contains('completed')) {
                    bar.classList.add('completed');
                    this.triggerProgressCelebration(bar);
                }
            }
        });
    }

    /**
     * Activa celebración de progreso
     */
    triggerProgressCelebration(element) {
        element.style.animation = 'progressComplete 1s ease';
        setTimeout(() => {
            element.style.animation = '';
        }, 1000);
    }

    /**
     * Actualiza display de badges
     */
    updateBadgeDisplay() {
        const badgeContainer = document.querySelector('.badges-container');
        if (!badgeContainer) return;

        const badgesByTier = this.groupBadgesByTier();
        
        badgeContainer.innerHTML = Object.keys(badgesByTier)
            .map(tier => `
                <div class="badge-tier-section tier-${tier}">
                    <h4>${tier.charAt(0).toUpperCase() + tier.slice(1)} Badges</h4>
                    <div class="badge-grid">
                        ${badgesByTier[tier].map(badge => `
                            <div class="badge-item" title="${badge.description}">
                                ${this.getIconHTML(badge.icon)}
                                <span>${badge.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
    }

    /**
     * Agrupa badges por tier
     */
    groupBadgesByTier() {
        const grouped = { bronze: [], silver: [], gold: [], platinum: [] };
        
        this.badges.forEach(badge => {
            if (grouped[badge.tier]) {
                grouped[badge.tier].push(badge);
            }
        });
        
        return grouped;
    }

    /**
     * Actualiza tarjetas de estadísticas
     */
    updateStatsCards() {
        const totalAchievements = this.achievements.size;
        const totalPoints = Array.from(this.achievements.values())
            .reduce((sum, a) => sum + (a.points || 0), 0);
        const totalBadges = this.badges.size;
        
        document.querySelectorAll('.stats-card').forEach(card => {
            const type = card.dataset.statType;
            switch (type) {
                case 'achievements':
                    card.querySelector('.stat-value').textContent = totalAchievements;
                    break;
                case 'points':
                    card.querySelector('.stat-value').textContent = totalPoints.toLocaleString();
                    break;
                case 'badges':
                    card.querySelector('.stat-value').textContent = totalBadges;
                    break;
            }
        });
    }

    /**
     * Obtiene HTML de icono
     */
    getIconHTML(iconName) {
        const icons = {
            heart: '❤️',
            users: '👥',
            globe: '🌍',
            'trending-up': '📈',
            'dollar-sign': '💰',
            zap: '⚡',
            home: '🏠',
            eye: '👁️',
            award: '🏆',
            lightbulb: '💡'
        };
        return icons[iconName] || '🎯';
    }

    /**
     * Genera ID único
     */
    generateId() {
        return `recognition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Maneja actualización de métricas
     */
    handleMetricsUpdate(metrics) {
        this.detectAchievements();
    }

    /**
     * Maneja achievement desbloqueado
     */
    handleAchievementUnlocked(achievement) {
        console.log('Achievement event received:', achievement);
    }

    /**
     * Maneja click en reconocimiento
     */
    handleRecognitionClick(element) {
        const achievementId = element.dataset.achievementId;
        if (achievementId && this.achievements.has(achievementId)) {
            this.showAchievementDetails(this.achievements.get(achievementId));
        }
    }

    /**
     * Muestra detalles de achievement
     */
    showAchievementDetails(achievement) {
        const modal = document.createElement('div');
        modal.className = 'achievement-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="achievement-details">
                    <div class="achievement-header">
                        <div class="achievement-icon large">${this.getIconHTML(achievement.badge)}</div>
                        <h2>${achievement.name}</h2>
                        <span class="tier-badge ${achievement.tier}">${achievement.tier}</span>
                    </div>
                    <p class="achievement-description">${achievement.description}</p>
                    <div class="achievement-info">
                        <div class="info-item">
                            <label>Desbloqueado:</label>
                            <span>${new Date(achievement.unlockedAt).toLocaleDateString()}</span>
                        </div>
                        <div class="info-item">
                            <label>Puntos:</label>
                            <span>${achievement.points}</span>
                        </div>
                    </div>
                </div>
                <button class="modal-close">Cerrar</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.remove();
        });
    }

    /**
     * Métodos públicos para integración externa
     */

    // Obtener todos los achievements
    getAchievements() {
        return Array.from(this.achievements.values());
    }

    // Obtener achievements por tier
    getAchievementsByTier(tier) {
        return Array.from(this.achievements.values()).filter(a => a.tier === tier);
    }

    // Obtener estadísticas
    getStats() {
        return {
            totalAchievements: this.achievements.size,
            totalBadges: this.badges.size,
            totalMilestones: this.milestones.size,
            totalPoints: Array.from(this.achievements.values())
                .reduce((sum, a) => sum + (a.points || 0), 0)
        };
    }

    // Limpiar todos los datos
    clearAllData() {
        this.achievements.clear();
        this.badges.clear();
        this.milestones.clear();
        this.recognitions.clear();
        this.saveRecognitionData();
        this.updateUI();
    }

    // Exportar datos
    exportData() {
        return {
            achievements: Array.from(this.achievements.entries()),
            badges: Array.from(this.badges.entries()),
            milestones: Array.from(this.milestones.entries()),
            recognitions: Array.from(this.recognitions.entries()),
            exportedAt: new Date().toISOString()
        };
    }

    // Importar datos
    importData(data) {
        if (data.achievements) {
            this.achievements = new Map(data.achievements);
        }
        if (data.badges) {
            this.badges = new Map(data.badges);
        }
        if (data.milestones) {
            this.milestones = new Map(data.milestones);
        }
        if (data.recognitions) {
            this.recognitions = new Map(data.recognitions);
        }
        
        this.saveRecognitionData();
        this.updateUI();
    }
}

// Estilos CSS inline para las animaciones (si no están en el CSS externo)
const recognitionStyles = `
    <style>
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes progressComplete {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .celebration-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        opacity: 0;
        transition: opacity 0.5s ease;
    }
    
    .celebration-overlay.active {
        opacity: 1;
    }
    
    .celebration-content {
        text-align: center;
        color: white;
    }
    
    .celebration-emojis {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: bounce 1s infinite;
    }
    
    .celebration-message {
        font-size: 2rem;
        font-weight: bold;
    }
    
    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-30px); }
        60% { transform: translateY(-15px); }
    }
    
    .achievement-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10002;
    }
    
    .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
    }
    
    .modal-content {
        position: relative;
        background: white;
        margin: 10% auto;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
    </style>
`;

// Inyectar estilos si no existen
if (!document.querySelector('#recognition-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'recognition-styles';
    styleElement.innerHTML = recognitionStyles;
    document.head.appendChild(styleElement);
}

// Inicialización automática cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.RecognitionSystem = RecognitionSystem;
    });
} else {
    window.RecognitionSystem = RecognitionSystem;
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecognitionSystem;
}