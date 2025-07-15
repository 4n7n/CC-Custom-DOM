/**
 * Tier Management Module
 * Gestiona los tiers de patrocinadores y sus beneficios
 */

class TierManagement {
    constructor(tierConfig = {}) {
        this.tierConfig = tierConfig;
        this.tierHierarchy = ['supporter', 'bronze', 'silver', 'gold', 'platinum'];
        this.tierUpgrades = new Map();
        this.tierHistory = new Map();
        this.listeners = new Set();
        
        this.tierBenefits = new Map();
        this.tierRequirements = new Map();
        this.tierRecognitions = new Map();
        
        this.upgradeRules = {
            automatic: true,
            gracePeriod: 30, // días
            notificationDays: [30, 15, 7, 1],
            requireApproval: {
                platinum: true,
                custom: true
            }
        };
    }

    /**
     * Inicializa el sistema de gestión de tiers
     */
    async initialize() {
        try {
            console.log('🏆 Inicializando Tier Management...');
            
            // Cargar configuración de tiers
            await this.loadTierConfiguration();
            
            // Configurar beneficios por tier
            this.setupTierBenefits();
            
            // Configurar reconocimientos
            this.setupTierRecognitions();
            
            // Configurar reglas de upgrade automático
            this.setupUpgradeRules();
            
            console.log('✅ Tier Management inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Tier Management:', error);
            throw error;
        }
    }

    /**
     * Calcula el tier de un patrocinador basado en su contribución
     */
    calculateTier(sponsorData) {
        const { amount, totalContributed, engagementScore, specialStatus } = sponsorData;
        
        // Usar contribución total si está disponible, sino usar amount actual
        const contributionAmount = totalContributed || amount || 0;
        
        // Verificar tier especial primero
        if (specialStatus && this.tierConfig[specialStatus]) {
            return specialStatus;
        }
        
        // Calcular tier basado en contribución
        let tier = 'supporter';
        
        for (const tierName of this.tierHierarchy.reverse()) {
            const tierInfo = this.tierConfig[tierName];
            if (tierInfo && contributionAmount >= tierInfo.minAmount) {
                tier = tierName;
                break;
            }
        }
        
        // Considerar factores adicionales
        tier = this.applyTierModifiers(tier, sponsorData);
        
        return tier;
    }

    /**
     * Aplica modificadores al tier calculado
     */
    applyTierModifiers(baseTier, sponsorData) {
        let finalTier = baseTier;
        const { engagementScore, loyaltyYears, specialContributions } = sponsorData;
        
        // Bonus por engagement alto
        if (engagementScore >= 9.0 && this.canUpgrade(baseTier)) {
            finalTier = this.getNextTier(baseTier);
        }
        
        // Bonus por lealtad (3+ años)
        if (loyaltyYears >= 3 && engagementScore >= 8.0 && this.canUpgrade(baseTier)) {
            finalTier = this.getNextTier(baseTier);
        }
        
        // Contribuciones especiales (en especie, voluntariado, etc.)
        if (specialContributions && specialContributions.length > 0) {
            const specialValue = this.calculateSpecialContributionsValue(specialContributions);
            if (specialValue >= 10000 && this.canUpgrade(finalTier)) {
                finalTier = this.getNextTier(finalTier);
            }
        }
        
        return finalTier;
    }

    /**
     * Verifica si un patrocinador puede ser upgradado
     */
    canUpgrade(currentTier) {
        const tierIndex = this.tierHierarchy.indexOf(currentTier);
        return tierIndex >= 0 && tierIndex < this.tierHierarchy.length - 1;
    }

    /**
     * Obtiene el siguiente tier en la jerarquía
     */
    getNextTier(currentTier) {
        const tierIndex = this.tierHierarchy.indexOf(currentTier);
        if (tierIndex >= 0 && tierIndex < this.tierHierarchy.length - 1) {
            return this.tierHierarchy[tierIndex + 1];
        }
        return currentTier;
    }

    /**
     * Obtiene el tier anterior en la jerarquía
     */
    getPreviousTier(currentTier) {
        const tierIndex = this.tierHierarchy.indexOf(currentTier);
        if (tierIndex > 0) {
            return this.tierHierarchy[tierIndex - 1];
        }
        return currentTier;
    }

    /**
     * Procesa un upgrade de tier
     */
    async processTierUpgrade(sponsorId, newTier, reason = 'contribution_increase') {
        try {
            const currentTier = await this.getCurrentTier(sponsorId);
            
            if (currentTier === newTier) {
                return { success: false, message: 'Tier ya es el mismo' };
            }
            
            // Verificar si el upgrade requiere aprobación
            if (this.requiresApproval(newTier)) {
                return await this.requestTierApproval(sponsorId, newTier, reason);
            }
            
            // Procesar upgrade automático
            const upgradeResult = await this.executeTierUpgrade(sponsorId, currentTier, newTier, reason);
            
            // Registrar en historial
            this.recordTierChange(sponsorId, currentTier, newTier, reason);
            
            // Notificar upgrade
            this.notifyTierUpgrade(sponsorId, currentTier, newTier);
            
            // Activar beneficios del nuevo tier
            await this.activateTierBenefits(sponsorId, newTier);
            
            return upgradeResult;
            
        } catch (error) {
            console.error('Error procesando upgrade de tier:', error);
            throw error;
        }
    }

    /**
     * Procesa un downgrade de tier
     */
    async processTierDowngrade(sponsorId, newTier, reason = 'contribution_decrease') {
        try {
            const currentTier = await this.getCurrentTier(sponsorId);
            
            if (currentTier === newTier) {
                return { success: false, message: 'Tier ya es el mismo' };
            }
            
            // Período de gracia antes del downgrade
            const gracePeriodEnd = new Date();
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.upgradeRules.gracePeriod);
            
            // Programar downgrade
            const downgradeResult = await this.scheduleDowngrade(sponsorId, currentTier, newTier, gracePeriodEnd, reason);
            
            // Notificar downgrade pendiente
            this.notifyPendingDowngrade(sponsorId, currentTier, newTier, gracePeriodEnd);
            
            return downgradeResult;
            
        } catch (error) {
            console.error('Error procesando downgrade de tier:', error);
            throw error;
        }
    }

    /**
     * Obtiene los beneficios de un tier específico
     */
    getTierBenefits(tier) {
        const tierInfo = this.tierConfig[tier];
        if (!tierInfo) return [];
        
        return {
            ...tierInfo.benefits,
            recognition: this.tierRecognitions.get(tier),
            support: tierInfo.support,
            reporting: tierInfo.reporting,
            events: this.getTierEventBenefits(tier),
            visibility: this.getTierVisibilityBenefits(tier)
        };
    }

    /**
     * Obtiene beneficios de eventos por tier
     */
    getTierEventBenefits(tier) {
        const eventBenefits = {
            supporter: ['community_events'],
            bronze: ['community_events', 'annual_meeting'],
            silver: ['community_events', 'annual_meeting', 'networking_events'],
            gold: ['community_events', 'annual_meeting', 'networking_events', 'exclusive_briefings'],
            platinum: ['all_events', 'vip_access', 'private_meetings', 'strategic_sessions']
        };
        
        return eventBenefits[tier] || [];
    }

    /**
     * Obtiene beneficios de visibilidad por tier
     */
    getTierVisibilityBenefits(tier) {
        const visibilityBenefits = {
            supporter: ['website_listing'],
            bronze: ['website_listing', 'newsletter_mention'],
            silver: ['website_listing', 'newsletter_mention', 'social_media'],
            gold: ['website_listing', 'newsletter_mention', 'social_media', 'annual_report'],
            platinum: ['website_listing', 'newsletter_mention', 'social_media', 'annual_report', 'press_releases', 'featured_stories']
        };
        
        return visibilityBenefits[tier] || [];
    }

    /**
     * Verifica si un tier requiere aprobación manual
     */
    requiresApproval(tier) {
        return this.upgradeRules.requireApproval[tier] || false;
    }

    /**
     * Solicita aprobación para upgrade de tier
     */
    async requestTierApproval(sponsorId, newTier, reason) {
        const approvalRequest = {
            id: this.generateApprovalId(),
            sponsorId,
            currentTier: await this.getCurrentTier(sponsorId),
            requestedTier: newTier,
            reason,
            requestDate: new Date(),
            status: 'pending',
            approver: null,
            approvalDate: null
        };
        
        // Guardar solicitud
        this.tierUpgrades.set(approvalRequest.id, approvalRequest);
        
        // Notificar a aprobadores
        this.notifyApprovers(approvalRequest);
        
        return {
            success: true,
            message: 'Solicitud de upgrade enviada para aprobación',
            approvalId: approvalRequest.id
        };
    }

    /**
     * Ejecuta el upgrade de tier
     */
    async executeTierUpgrade(sponsorId, currentTier, newTier, reason) {
        // En un entorno real, esto actualizaría la base de datos
        console.log(`🔝 Upgrading ${sponsorId} from ${currentTier} to ${newTier}`);
        
        // Simular actualización
        await this.updateSponsorTier(sponsorId, newTier);
        
        return {
            success: true,
            message: `Tier actualizado de ${currentTier} a ${newTier}`,
            previousTier: currentTier,
            newTier,
            effectiveDate: new Date()
        };
    }

    /**
     * Programa un downgrade con período de gracia
     */
    async scheduleDowngrade(sponsorId, currentTier, newTier, effectiveDate, reason) {
        const downgradeSchedule = {
            id: this.generateScheduleId(),
            sponsorId,
            currentTier,
            targetTier: newTier,
            effectiveDate,
            reason,
            status: 'scheduled',
            notifications: []
        };
        
        // Programar notificaciones
        this.scheduleDowngradeNotifications(downgradeSchedule);
        
        return {
            success: true,
            message: `Downgrade programado para ${effectiveDate.toLocaleDateString()}`,
            scheduleId: downgradeSchedule.id,
            gracePeriodEnd: effectiveDate
        };
    }

    /**
     * Activa beneficios específicos del tier
     */
    async activateTierBenefits(sponsorId, tier) {
        const benefits = this.getTierBenefits(tier);
        
        // Activar acceso a eventos
        if (benefits.events) {
            await this.activateEventAccess(sponsorId, benefits.events);
        }
        
        // Configurar reportes
        if (benefits.reporting) {
            await this.setupReporting(sponsorId, benefits.reporting);
        }
        
        // Configurar soporte
        if (benefits.support) {
            await this.assignSupport(sponsorId, benefits.support);
        }
        
        console.log(`✅ Beneficios activados para ${sponsorId} (tier: ${tier})`);
    }

    /**
     * Calcula el progreso hacia el siguiente tier
     */
    calculateTierProgress(sponsorData) {
        const currentTier = this.calculateTier(sponsorData);
        const nextTier = this.getNextTier(currentTier);
        
        if (currentTier === nextTier) {
            return {
                currentTier,
                nextTier: null,
                progress: 100,
                remaining: 0,
                message: 'Tier máximo alcanzado'
            };
        }
        
        const currentAmount = sponsorData.totalContributed || sponsorData.amount || 0;
        const nextTierRequirement = this.tierConfig[nextTier]?.minAmount || 0;
        const currentTierRequirement = this.tierConfig[currentTier]?.minAmount || 0;
        
        const progress = ((currentAmount - currentTierRequirement) / (nextTierRequirement - currentTierRequirement)) * 100;
        const remaining = Math.max(0, nextTierRequirement - currentAmount);
        
        return {
            currentTier,
            nextTier,
            progress: Math.min(100, Math.max(0, progress)),
            remaining,
            nextTierRequirement,
            currentAmount
        };
    }

    /**
     * Obtiene recomendaciones para upgrade de tier
     */
    getTierUpgradeRecommendations(sponsorData) {
        const progress = this.calculateTierProgress(sponsorData);
        const recommendations = [];
        
        if (progress.nextTier && progress.remaining > 0) {
            recommendations.push({
                type: 'contribution_increase',
                message: `Aumentar contribución en $${progress.remaining.toLocaleString()} para alcanzar tier ${progress.nextTier}`,
                impact: `Acceso a ${this.getTierBenefits(progress.nextTier).benefits.length} beneficios adicionales`,
                priority: progress.progress > 75 ? 'high' : 'medium'
            });
        }
        
        if (sponsorData.engagementScore < 8.0) {
            recommendations.push({
                type: 'engagement_improvement',
                message: 'Aumentar participación en eventos y comunicaciones',
                impact: 'Puede calificar para upgrade por engagement alto',
                priority: 'medium'
            });
        }
        
        return recommendations;
    }

    /**
     * Obtiene el historial de cambios de tier
     */
    getTierHistory(sponsorId) {
        return this.tierHistory.get(sponsorId) || [];
    }

    /**
     * Registra un cambio de tier en el historial
     */
    recordTierChange(sponsorId, fromTier, toTier, reason) {
        if (!this.tierHistory.has(sponsorId)) {
            this.tierHistory.set(sponsorId, []);
        }
        
        const history = this.tierHistory.get(sponsorId);
        history.unshift({
            id: this.generateChangeId(),
            fromTier,
            toTier,
            reason,
            timestamp: new Date(),
            isUpgrade: this.tierHierarchy.indexOf(toTier) > this.tierHierarchy.indexOf(fromTier)
        });
        
        // Mantener solo los últimos 20 cambios
        if (history.length > 20) {
            history.splice(20);
        }
    }

    /**
     * Configuración inicial de beneficios por tier
     */
    setupTierBenefits() {
        // Los beneficios ya están en tierConfig, pero podemos agregar lógica adicional aquí
        Object.entries(this.tierConfig).forEach(([tierName, tierInfo]) => {
            this.tierBenefits.set(tierName, {
                ...tierInfo.benefits,
                calculatedBenefits: this.calculateDynamicBenefits(tierName)
            });
        });
    }

    /**
     * Calcula beneficios dinámicos basados en el tier
     */
    calculateDynamicBenefits(tier) {
        const tierIndex = this.tierHierarchy.indexOf(tier);
        const baseBenefits = Math.max(1, tierIndex);
        
        return {
            reportFrequency: ['annual', 'biannual', 'quarterly', 'monthly', 'weekly'][tierIndex] || 'annual',
            supportLevel: ['basic', 'standard', 'priority', 'premium', 'dedicated'][tierIndex] || 'basic',
            networkingEvents: Math.min(tierIndex * 2, 10),
            customRequests: Math.min(tierIndex, 5)
        };
    }

    /**
     * Configuración de reconocimientos por tier
     */
    setupTierRecognitions() {
        this.tierRecognitions.set('supporter', {
            badge: '🤝 Colaborador',
            publicRecognition: true,
            certificate: 'participation'
        });
        
        this.tierRecognitions.set('bronze', {
            badge: '🥉 Patrocinador Bronce',
            publicRecognition: true,
            certificate: 'appreciation'
        });
        
        this.tierRecognitions.set('silver', {
            badge: '🥈 Patrocinador Plata',
            publicRecognition: true,
            certificate: 'recognition'
        });
        
        this.tierRecognitions.set('gold', {
            badge: '🥇 Patrocinador Oro',
            publicRecognition: true,
            certificate: 'honor',
            specialMention: true
        });
        
        this.tierRecognitions.set('platinum', {
            badge: '👑 Patrocinador Platino',
            publicRecognition: true,
            certificate: 'excellence',
            specialMention: true,
            dedicatedPage: true
        });
    }

    /**
     * Utilidades y métodos auxiliares
     */
    async loadTierConfiguration() {
        // En un entorno real, cargaría desde una API o archivo de configuración
        if (!this.tierConfig || Object.keys(this.tierConfig).length === 0) {
            // Usar configuración por defecto si no se proporciona
            this.tierConfig = await this.getDefaultTierConfig();
        }
    }

    async getDefaultTierConfig() {
        return {
            supporter: { minAmount: 1000, maxAmount: 4999 },
            bronze: { minAmount: 5000, maxAmount: 9999 },
            silver: { minAmount: 10000, maxAmount: 24999 },
            gold: { minAmount: 25000, maxAmount: 49999 },
            platinum: { minAmount: 50000, maxAmount: null }
        };
    }

    async getCurrentTier(sponsorId) {
        // En un entorno real, consultaría la base de datos
        return 'silver'; // Simulación
    }

    async updateSponsorTier(sponsorId, newTier) {
        // Simulación de actualización en base de datos
        return true;
    }

    calculateSpecialContributionsValue(contributions) {
        return contributions.reduce((total, contribution) => {
            const value = contribution.estimatedValue || 0;
            return total + value;
        }, 0);
    }

    generateApprovalId() {
        return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateScheduleId() {
        return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateChangeId() {
        return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    setupUpgradeRules() {
        // Configurar reglas adicionales si es necesario
        console.log('⚙️ Reglas de upgrade configuradas');
    }

    async activateEventAccess(sponsorId, events) {
        console.log(`🎫 Activando acceso a eventos para ${sponsorId}:`, events);
    }

    async setupReporting(sponsorId, reportingConfig) {
        console.log(`📊 Configurando reportes para ${sponsorId}:`, reportingConfig);
    }

    async assignSupport(sponsorId, supportConfig) {
        console.log(`🆘 Asignando soporte para ${sponsorId}:`, supportConfig);
    }

    notifyTierUpgrade(sponsorId, fromTier, toTier) {
        console.log(`📢 Notificando upgrade: ${sponsorId} de ${fromTier} a ${toTier}`);
        
        this.notifyListeners('tier:upgraded', {
            sponsorId,
            fromTier,
            toTier,
            timestamp: new Date()
        });
    }

    notifyPendingDowngrade(sponsorId, fromTier, toTier, effectiveDate) {
        console.log(`⚠️ Notificando downgrade pendiente: ${sponsorId} de ${fromTier} a ${toTier}`);
        
        this.notifyListeners('tier:downgrade_scheduled', {
            sponsorId,
            fromTier,
            toTier,
            effectiveDate,
            timestamp: new Date()
        });
    }

    notifyApprovers(approvalRequest) {
        console.log(`📧 Notificando aprobadores para:`, approvalRequest);
    }

    scheduleDowngradeNotifications(downgradeSchedule) {
        // Programar notificaciones según upgradeRules.notificationDays
        this.upgradeRules.notificationDays.forEach(days => {
            const notificationDate = new Date(downgradeSchedule.effectiveDate);
            notificationDate.setDate(notificationDate.getDate() - days);
            
            if (notificationDate > new Date()) {
                console.log(`⏰ Notificación programada para ${notificationDate.toLocaleDateString()} (${days} días antes)`);
            }
        });
    }

    /**
     * Métodos de consulta y análisis
     */
    
    /**
     * Obtiene estadísticas de distribución de tiers
     */
    getTierDistribution(sponsors) {
        const distribution = {};
        
        // Inicializar contadores
        this.tierHierarchy.forEach(tier => {
            distribution[tier] = 0;
        });
        
        // Contar sponsors por tier
        sponsors.forEach(sponsor => {
            const tier = this.calculateTier(sponsor);
            if (distribution.hasOwnProperty(tier)) {
                distribution[tier]++;
            }
        });
        
        return distribution;
    }

    /**
     * Obtiene proyecciones de tier basadas en tendencias
     */
    getTierProjections(sponsors, months = 12) {
        const projections = {};
        
        sponsors.forEach(sponsor => {
            const currentTier = this.calculateTier(sponsor);
            const progress = this.calculateTierProgress(sponsor);
            
            // Calcular proyección simple basada en tendencia actual
            if (progress.nextTier && progress.remaining > 0) {
                const monthsToUpgrade = this.estimateMonthsToUpgrade(sponsor, progress.remaining);
                
                if (monthsToUpgrade <= months) {
                    if (!projections[progress.nextTier]) {
                        projections[progress.nextTier] = [];
                    }
                    projections[progress.nextTier].push({
                        sponsorId: sponsor.id,
                        currentTier,
                        estimatedMonth: monthsToUpgrade,
                        confidence: this.calculateProjectionConfidence(sponsor)
                    });
                }
            }
        });
        
        return projections;
    }

    /**
     * Estima meses para upgrade basado en tendencia histórica
     */
    estimateMonthsToUpgrade(sponsor, remainingAmount) {
        // Calcular contribución mensual promedio (simulada)
        const monthlyAverage = (sponsor.totalContributed || sponsor.amount || 0) / 12;
        
        if (monthlyAverage <= 0) return Infinity;
        
        return Math.ceil(remainingAmount / monthlyAverage);
    }

    /**
     * Calcula confianza en la proyección
     */
    calculateProjectionConfidence(sponsor) {
        let confidence = 0.5; // Base 50%
        
        // Aumentar confianza por engagement alto
        if (sponsor.engagementScore >= 8.0) confidence += 0.2;
        
        // Aumentar confianza por historial consistente
        if (sponsor.loyaltyYears >= 2) confidence += 0.15;
        
        // Aumentar confianza por comunicación activa
        if (sponsor.lastContact && this.daysSinceLastContact(sponsor.lastContact) <= 30) {
            confidence += 0.15;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Obtiene oportunidades de upgrade
     */
    getUpgradeOpportunities(sponsors) {
        return sponsors
            .map(sponsor => {
                const progress = this.calculateTierProgress(sponsor);
                const recommendations = this.getTierUpgradeRecommendations(sponsor);
                
                return {
                    sponsor,
                    currentTier: progress.currentTier,
                    nextTier: progress.nextTier,
                    progress: progress.progress,
                    remaining: progress.remaining,
                    recommendations,
                    priority: this.calculateOpportunityPriority(sponsor, progress)
                };
            })
            .filter(opportunity => opportunity.nextTier && opportunity.progress > 25)
            .sort((a, b) => b.priority - a.priority);
    }

    /**
     * Calcula prioridad de oportunidad de upgrade
     */
    calculateOpportunityPriority(sponsor, progress) {
        let priority = progress.progress; // Base: progreso actual
        
        // Bonus por engagement alto
        if (sponsor.engagementScore >= 8.0) priority += 20;
        
        // Bonus por proximidad al upgrade
        if (progress.progress >= 75) priority += 15;
        
        // Bonus por sponsor activo
        if (sponsor.lastContact && this.daysSinceLastContact(sponsor.lastContact) <= 30) {
            priority += 10;
        }
        
        return Math.min(priority, 100);
    }

    /**
     * Analiza riesgos de downgrade
     */
    analyzeDowngradeRisks(sponsors) {
        const risks = [];
        
        sponsors.forEach(sponsor => {
            const currentTier = this.calculateTier(sponsor);
            const tierIndex = this.tierHierarchy.indexOf(currentTier);
            
            if (tierIndex > 0) { // No analizar supporter tier
                const risk = this.calculateDowngradeRisk(sponsor, currentTier);
                
                if (risk.score > 0.3) { // Riesgo mayor al 30%
                    risks.push({
                        sponsor,
                        currentTier,
                        riskScore: risk.score,
                        riskFactors: risk.factors,
                        recommendedActions: this.getRetentionActions(sponsor, risk)
                    });
                }
            }
        });
        
        return risks.sort((a, b) => b.riskScore - a.riskScore);
    }

    /**
     * Calcula riesgo de downgrade
     */
    calculateDowngradeRisk(sponsor, currentTier) {
        let riskScore = 0;
        const factors = [];
        
        // Factor: Engagement bajo
        if (sponsor.engagementScore < 6.0) {
            riskScore += 0.3;
            factors.push('low_engagement');
        }
        
        // Factor: Sin contacto reciente
        const daysSinceContact = this.daysSinceLastContact(sponsor.lastContact);
        if (daysSinceContact > 90) {
            riskScore += 0.25;
            factors.push('no_recent_contact');
        }
        
        // Factor: Reducción en contribuciones
        if (this.hasContributionDecline(sponsor)) {
            riskScore += 0.35;
            factors.push('contribution_decline');
        }
        
        // Factor: No participación en eventos
        if (sponsor.eventAttendance === 0) {
            riskScore += 0.1;
            factors.push('no_event_participation');
        }
        
        return {
            score: Math.min(riskScore, 1.0),
            factors
        };
    }

    /**
     * Obtiene acciones recomendadas para retención
     */
    getRetentionActions(sponsor, risk) {
        const actions = [];
        
        if (risk.factors.includes('low_engagement')) {
            actions.push({
                type: 'engagement_campaign',
                priority: 'high',
                description: 'Iniciar campaña de re-engagement personalizada'
            });
        }
        
        if (risk.factors.includes('no_recent_contact')) {
            actions.push({
                type: 'outreach',
                priority: 'medium',
                description: 'Contacto directo del account manager'
            });
        }
        
        if (risk.factors.includes('contribution_decline')) {
            actions.push({
                type: 'value_demonstration',
                priority: 'high',
                description: 'Presentar impacto específico de sus contribuciones'
            });
        }
        
        return actions;
    }

    /**
     * Exporta análisis de tiers
     */
    exportTierAnalysis(sponsors, format = 'json') {
        const analysis = {
            distribution: this.getTierDistribution(sponsors),
            projections: this.getTierProjections(sponsors),
            opportunities: this.getUpgradeOpportunities(sponsors),
            risks: this.analyzeDowngradeRisks(sponsors),
            summary: {
                totalSponsors: sponsors.length,
                averageTier: this.calculateAverageTier(sponsors),
                upgradeReadiness: this.calculateUpgradeReadiness(sponsors),
                retentionHealth: this.calculateRetentionHealth(sponsors)
            },
            generatedAt: new Date()
        };
        
        if (format === 'csv') {
            return this.convertAnalysisToCSV(analysis);
        }
        
        return JSON.stringify(analysis, null, 2);
    }

    /**
     * Utilidades auxiliares
     */
    daysSinceLastContact(lastContact) {
        if (!lastContact) return Infinity;
        
        const now = new Date();
        const contactDate = new Date(lastContact);
        const diffTime = Math.abs(now - contactDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    hasContributionDecline(sponsor) {
        // Simulación - en entorno real compararía con datos históricos
        return sponsor.contributionTrend === 'declining';
    }

    calculateAverageTier(sponsors) {
        const tierValues = {
            supporter: 1,
            bronze: 2,
            silver: 3,
            gold: 4,
            platinum: 5
        };
        
        const totalValue = sponsors.reduce((sum, sponsor) => {
            const tier = this.calculateTier(sponsor);
            return sum + (tierValues[tier] || 1);
        }, 0);
        
        return totalValue / sponsors.length;
    }

    calculateUpgradeReadiness(sponsors) {
        const readyForUpgrade = sponsors.filter(sponsor => {
            const progress = this.calculateTierProgress(sponsor);
            return progress.progress >= 75;
        });
        
        return readyForUpgrade.length / sponsors.length;
    }

    calculateRetentionHealth(sponsors) {
        const atRiskSponsors = this.analyzeDowngradeRisks(sponsors);
        const healthySponsors = sponsors.length - atRiskSponsors.length;
        
        return healthySponsors / sponsors.length;
    }

    convertAnalysisToCSV(analysis) {
        // Implementación simplificada
        const headers = ['Metric', 'Value'];
        const rows = [
            ['Total Sponsors', analysis.summary.totalSponsors],
            ['Average Tier', analysis.summary.averageTier.toFixed(2)],
            ['Upgrade Readiness', (analysis.summary.upgradeReadiness * 100).toFixed(1) + '%'],
            ['Retention Health', (analysis.summary.retentionHealth * 100).toFixed(1) + '%']
        ];
        
        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }

    /**
     * Event listeners
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error en listener de tier management:', error);
            }
        });
    }

    /**
     * Destructor
     */
    destroy() {
        this.tierUpgrades.clear();
        this.tierHistory.clear();
        this.tierBenefits.clear();
        this.tierRequirements.clear();
        this.tierRecognitions.clear();
        this.listeners.clear();
        
        console.log('🧹 Tier Management destruido correctamente');
    }
}

// Exportar para uso global
window.TierManagement = TierManagement;