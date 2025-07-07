// Sistema de gestión de beneficios por nivel
class TierBenefits {
    constructor() {
        this.benefits = this.loadBenefitsConfig();
        this.activeBenefits = this.loadActiveBenefits();
        this.benefitTracking = this.loadBenefitTracking();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderBenefitsDashboard();
        this.initializeBenefitDelivery();
    }

    loadBenefitsConfig() {
        return {
            bronze: {
                visibility: [
                    {
                        id: 'sponsors_page_logo',
                        name: 'Logo en página de patrocinadores',
                        description: 'Logo de 150x75px en página dedicada',
                        deliveryMethod: 'automated',
                        deliveryFrequency: 'immediate',
                        metrics: ['impressions', 'clicks']
                    }
                ],
                marketing: [
                    {
                        id: 'social_media_mention',
                        name: 'Mención en redes sociales',
                        description: '1 post mensual en nuestras redes sociales',
                        deliveryMethod: 'manual',
                        deliveryFrequency: 'monthly',
                        platforms: ['twitter', 'linkedin', 'instagram'],
                        metrics: ['reach', 'engagement', 'clicks']
                    }
                ],
                access: [
                    {
                        id: 'exclusive_updates',
                        name: 'Updates exclusivos',
                        description: 'Newsletter semanal con progreso del proyecto',
                        deliveryMethod: 'automated',
                        deliveryFrequency: 'weekly',
                        metrics: ['open_rate', 'click_rate']
                    }
                ],
                recognition: [
                    {
                        id: 'digital_certificate',
                        name: 'Certificado digital',
                        description: 'Certificado personalizado descargable',
                        deliveryMethod: 'automated',
                        deliveryFrequency: 'once',
                        metrics: ['downloads']
                    }
                ]
            },
            silver: {
                visibility: [
                    {
                        id: 'homepage_featured_logo',
                        name: 'Logo destacado en homepage',
                        description: 'Logo de 200x100px en sección destacada',
                        deliveryMethod: 'automated',
                        deliveryFrequency: 'immediate',
                        metrics: ['impressions', 'clicks', 'ctr']
                    }
                ],
                marketing: [
                    {
                        id: 'newsletter_feature',
                        name: 'Feature en newsletter',
                        description: 'Sección dedicada en newsletter mensual',
                        deliveryMethod: 'manual',
                        deliveryFrequency: 'monthly',
                        metrics: ['subscribers', 'open_rate', 'click_rate']
                    },
                    {
                        id: 'social_media_campaign',
                        name: 'Campaña en redes sociales',
                        description: '2 posts mensuales coordinados',
                        deliveryMethod: 'manual',
                        deliveryFrequency: 'monthly',
                        platforms: ['twitter', 'linkedin', 'instagram', 'facebook'],
                        metrics: ['reach', 'engagement', 'shares', 'clicks']
                    }
                ],
                access: [
                    {
                        id: 'early_access',
                        name: 'Acceso anticipado',
                        description: 'Acceso 48h antes a nuevas características',
                        deliveryMethod: 'automated',
                        deliveryFrequency: 'per_release',
                        metrics: ['usage', 'feedback_quality']
                    }
                ],
                collaboration: [
                    {
                        id: 'monthly_feedback_session',
                        name: 'Sesión de feedback mensual',
                        description: 'Videollamada de 30min para feedback',
                        deliveryMethod: 'scheduled',
                        deliveryFrequency: 'monthly',
                        duration: 30,
                        metrics: ['attendance', 'satisfaction', 'actionable_feedback']
                    }
                ]
            },
            gold: {
                visibility: [
                    {
                        id: 'header_premium_logo',
                        name: 'Logo premium en header',
                        description: 'Logo de 300x150px en header de todas las páginas',
                        deliveryMethod: 'automated',
                        deliveryFrequency: 'immediate',
                        placement: 'header-premium',
                        metrics: ['impressions', 'clicks', 'ctr', 'brand_lift']
                    }
                ],
                content: [
                    {
                        id: 'dedicated_blog_post',
                        name: 'Post dedicado en blog',
                        description: 'Artículo de 1000+ palabras sobre la empresa',
                        deliveryMethod: 'manual',
                        deliveryFrequency: 'quarterly',
                        wordCount: 1000,
                        includesInterview: true,
                        metrics: ['views', 'time_on_page', 'shares', 'backlinks']
                    },
                    {
                        id: 'podcast_interview',
                        name: 'Entrevista en podcast/video',
                        description: 'Entrevista de 45min en nuestro podcast',
                        deliveryMethod: 'scheduled',
                        deliveryFrequency: 'biannual',
                        duration: 45,
                        platforms: ['youtube', 'spotify', 'apple_podcasts'],
                        metrics: ['views', 'listens', 'completion_rate', 'subscribers_gained']
                    }
                ],
                collaboration: [
                    {
                        id: 'roadmap_influence',
                        name: 'Influencia en roadmap',
                        description: 'Voto en prioridades del roadmap trimestral',
                        deliveryMethod: 'platform_access',
                        deliveryFrequency: 'quarterly',
                        votingWeight: 2,
                        metrics: ['participation_rate', 'influence_score']
                    },
                    {
                        id: 'quarterly_strategy_session',
                        name: 'Sesión de estrategia trimestral',
                        description: 'Reunión estratégica de 60min',
                        deliveryMethod: 'scheduled',
                        deliveryFrequency: 'quarterly',
                        duration: 60,
                        includesPresentation: true,
                        metrics: ['attendance', 'satisfaction', 'strategic_alignment']
                    }
                ],
                support: [
                    {
                        id: 'priority_support',
                        name: 'Soporte prioritario',
                        description: 'Respuesta en <4h, soporte dedicado',
                        deliveryMethod: 'platform_access',
                        deliveryFrequency: 'continuous',
                        sla: {
                            responseTime: '4 hours',
                            resolutionTime: '24 hours'
                        },
                        metrics: ['response_time', 'resolution_time', 'satisfaction']
                    }
                ]
            },
            platinum: {
                branding: [
                    {
                        id: 'exclusive_feature_branding',
                        name: 'Branding exclusivo de características',
                        description: 'Su marca en características específicas',
                        deliveryMethod: 'custom_development',
                        deliveryFrequency: 'per_feature',
                        customization: true,
                        metrics: ['feature_usage', 'brand_association', 'user_feedback']
                    }
                ],
                collaboration: [
                    {
                        id: 'direct_development_collaboration',
                        name: 'Colaboración directa en desarrollo',
                        description: 'Acceso directo al equipo de desarrollo',
                        deliveryMethod: 'dedicated_access',
                        deliveryFrequency: 'continuous',
                        channels: ['slack', 'github', 'video_calls'],
                        dedicatedManager: true,
                        metrics: ['collaboration_frequency', 'code_contributions', 'feature_influence']
                    },
                    {
                        id: 'monthly_executive_briefing',
                        name: 'Briefing ejecutivo mensual',
                        description: 'Presentación ejecutiva personalizada',
                        deliveryMethod: 'scheduled',
                        deliveryFrequency: 'monthly',
                        duration: 90,
                        includesCustomReports: true,
                        executiveLevel: true,
                        metrics: ['attendance', 'satisfaction', 'business_value']
                    }
                ],
                access: [
                    {
                        id: 'development_team_access',
                        name: 'Acceso al equipo de desarrollo',
                        description: 'Comunicación directa con desarrolladores',
                        deliveryMethod: 'platform_access',
                        deliveryFrequency: 'continuous',
                        accessLevel: 'full',
                        metrics: ['interaction_frequency', 'response_quality', 'satisfaction']
                    }
                ],
                marketing: [
                    {
                        id: 'event_representation',
                        name: 'Representación en eventos',
                        description: 'Mención en conferencias y eventos',
                        deliveryMethod: 'manual',
                        deliveryFrequency: 'per_event',
                        eventTypes: ['conferences', 'webinars', 'workshops'],
                        metrics: ['event_mentions', 'audience_reach', 'lead_generation']
                    },
                    {
                        id: 'co_marketing_opportunities',
                        name: 'Oportunidades de co-marketing',
                        description: 'Colaboración en iniciativas de marketing',
                        deliveryMethod: 'collaborative',
                        deliveryFrequency: 'quarterly',
                        includesJointContent: true,
                        metrics: ['campaign_reach', 'lead_quality', 'brand_synergy']
                    }
                ],
                development: [
                    {
                        id: 'custom_integration',
                        name: 'Integración personalizada',
                        description: 'Desarrollo de integraciones específicas',
                        deliveryMethod: 'custom_development',
                        deliveryFrequency: 'per_request',
                        developmentHours: 40,
                        includesDocumentation: true,
                        metrics: ['integration_usage', 'performance', 'user_adoption']
                    }
                ]
            }
        };
    }

    loadActiveBenefits() {
        try {
            return JSON.parse(localStorage.getItem('activeBenefits') || '{}');
        } catch (error) {
            return {};
        }
    }

    loadBenefitTracking() {
        try {
            return JSON.parse(localStorage.getItem('benefitTracking') || '{}');
        } catch (error) {
            return {};
        }
    }

    setupEventListeners() {
        // Escuchar eventos de patrocinio
        document.addEventListener('sponsorshipActivated', (e) => {
            this.activateTierBenefits(e.detail.sponsorId, e.detail.tier);
        });

        document.addEventListener('sponsorshipDeactivated', (e) => {
            this.deactivateTierBenefits(e.detail.sponsorId);
        });

        // Eventos de entrega de beneficios
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('deliver-benefit')) {
                this.deliverBenefit(e.target.dataset.benefitId, e.target.dataset.sponsorId);
            }
            
            if (e.target.classList.contains('mark-completed')) {
                this.markBenefitCompleted(e.target.dataset.benefitId, e.target.dataset.sponsorId);
            }
        });
    }

    activateTierBenefits(sponsorId, tier) {
        const tierBenefits = this.benefits[tier];
        if (!tierBenefits) return;

        this.activeBenefits[sponsorId] = {
            tier: tier,
            activatedAt: new Date().toISOString(),
            benefits: {}
        };

        // Activar beneficios automáticos
        Object.entries(tierBenefits).forEach(([category, benefits]) => {
            benefits.forEach(benefit => {
                if (benefit.deliveryMethod === 'automated') {
                    this.scheduleBenefit(sponsorId, benefit);
                }
            });
        });

        this.saveActiveBenefits();
        this.renderBenefitsDashboard();
        this.notifyBenefitActivation(sponsorId, tier);
    }

    deactivateTierBenefits(sponsorId) {
        if (this.activeBenefits[sponsorId]) {
            this.activeBenefits[sponsorId].deactivatedAt = new Date().toISOString();
            this.activeBenefits[sponsorId].status = 'inactive';
        }
        this.saveActiveBenefits();
        this.renderBenefitsDashboard();
    }

    scheduleBenefit(sponsorId, benefit) {
        const benefitKey = `${sponsorId}_${benefit.id}`;
        
        if (!this.benefitTracking[benefitKey]) {
            this.benefitTracking[benefitKey] = {
                sponsorId: sponsorId,
                benefitId: benefit.id,
                scheduledAt: new Date().toISOString(),
                status: 'scheduled',
                deliveries: []
            };
        }

        // Programar entrega según frecuencia
        this.scheduleNextDelivery(benefitKey, benefit);
    }

    scheduleNextDelivery(benefitKey, benefit) {
        const tracking = this.benefitTracking[benefitKey];
        let nextDelivery;

        switch (benefit.deliveryFrequency) {
            case 'immediate':
                nextDelivery = new Date();
                break;
            case 'weekly':
                nextDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                nextDelivery = new Date();
                nextDelivery.setMonth(nextDelivery.getMonth() + 1);
                break;
            case 'quarterly':
                nextDelivery = new Date();
                nextDelivery.setMonth(nextDelivery.getMonth() + 3);
                break;
            case 'biannual':
                nextDelivery = new Date();
                nextDelivery.setMonth(nextDelivery.getMonth() + 6);
                break;
            case 'once':
                if (tracking.deliveries.length > 0) return;
                nextDelivery = new Date();
                break;
            default:
                return;
        }

        tracking.nextDelivery = nextDelivery.toISOString();
        this.saveBenefitTracking();

        // Programar ejecución
        if (nextDelivery <= new Date()) {
            setTimeout(() => this.executeBenefit(benefitKey, benefit), 1000);
        }
    }

    async executeBenefit(benefitKey, benefit) {
        const tracking = this.benefitTracking[benefitKey];
        
        try {
            let result;
            
            switch (benefit.deliveryMethod) {
                case 'automated':
                    result = await this.executeAutomatedBenefit(benefit, tracking);
                    break;
                case 'manual':
                    result = this.scheduleManualBenefit(benefit, tracking);
                    break;
                case 'scheduled':
                    result = this.scheduleAppointment(benefit, tracking);
                    break;
                case 'platform_access':
                    result = await this.grantPlatformAccess(benefit, tracking);
                    break;
                default:
                    result = { success: false, error: 'Unknown delivery method' };
            }

            // Registrar entrega
            tracking.deliveries.push({
                deliveredAt: new Date().toISOString(),
                result: result,
                metrics: {}
            });

            tracking.status = result.success ? 'delivered' : 'failed';
            
            // Programar próxima entrega si es recurrente
            if (result.success && benefit.deliveryFrequency !== 'once') {
                this.scheduleNextDelivery(benefitKey, benefit);
            }

        } catch (error) {
            tracking.deliveries.push({
                deliveredAt: new Date().toISOString(),
                result: { success: false, error: error.message },
                metrics: {}
            });
            tracking.status = 'failed';
        }

        this.saveBenefitTracking();
        this.renderBenefitsDashboard();
    }

    async executeAutomatedBenefit(benefit, tracking) {
        switch (benefit.id) {
            case 'sponsors_page_logo':
                return await this.addSponsorLogo(tracking.sponsorId, 'sponsors-page');
            
            case 'homepage_featured_logo':
                return await this.addSponsorLogo(tracking.sponsorId, 'homepage-featured');
            
            case 'header_premium_logo':
                return await this.addSponsorLogo(tracking.sponsorId, 'header-premium');
            
            case 'exclusive_updates':
                return await this.addToNewsletterList(tracking.sponsorId, 'exclusive');
            
            case 'digital_certificate':
                return await this.generateCertificate(tracking.sponsorId);
            
            case 'early_access':
                return await this.grantEarlyAccess(tracking.sponsorId);
            
            default:
                return { success: false, error: 'Unknown automated benefit' };
        }
    }

    scheduleManualBenefit(benefit, tracking) {
        // Crear tarea para el equipo
        const task = {
            id: `manual_${tracking.sponsorId}_${benefit.id}_${Date.now()}`,
            type: 'manual_benefit',
            benefitId: benefit.id,
            sponsorId: tracking.sponsorId,
            title: `Entregar: ${benefit.name}`,
            description: benefit.description,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.addToTaskQueue(task);
        
        return {
            success: true,
            message: 'Manual task scheduled',
            taskId: task.id
        };
    }

    scheduleAppointment(benefit, tracking) {
        // Crear cita en calendario
        const appointment = {
            id: `appt_${tracking.sponsorId}_${benefit.id}_${Date.now()}`,
            type: 'benefit_delivery',
            benefitId: benefit.id,
            sponsorId: tracking.sponsorId,
            title: benefit.name,
            description: benefit.description,
            duration: benefit.duration || 30,
            suggestedTimes: this.generateSuggestedTimes(),
            status: 'pending_confirmation',
            createdAt: new Date().toISOString()
        };

        this.addToCalendarQueue(appointment);
        
        return {
            success: true,
            message: 'Appointment scheduled',
            appointmentId: appointment.id
        };
    }

    async grantPlatformAccess(benefit, tracking) {
        const accessGrants = [];
        
        switch (benefit.id) {
            case 'roadmap_influence':
                accessGrants.push(await this.grantRoadmapAccess(tracking.sponsorId, benefit.votingWeight));
                break;
            
            case 'priority_support':
                accessGrants.push(await this.grantPrioritySupport(tracking.sponsorId, benefit.sla));
                break;
            
            case 'development_team_access':
                accessGrants.push(await this.grantDevTeamAccess(tracking.sponsorId, benefit.accessLevel));
                break;
        }

        const allSuccessful = accessGrants.every(grant => grant.success);
        
        return {
            success: allSuccessful,
            message: allSuccessful ? 'Platform access granted' : 'Some access grants failed',
            grants: accessGrants
        };
    }

    // Métodos de implementación específicos
    async addSponsorLogo(sponsorId, placement) {
        try {
            const sponsor = await this.getSponsorData(sponsorId);
            if (!sponsor.logoUrl) {
                return { success: false, error: 'No logo available' };
            }

            // Simular adición de logo al sitio
            const logoElement = {
                sponsorId: sponsorId,
                logoUrl: sponsor.logoUrl,
                linkUrl: sponsor.website,
                placement: placement,
                addedAt: new Date().toISOString()
            };

            this.addLogoToSite(logoElement);
            
            return {
                success: true,
                message: 'Logo added successfully',
                placement: placement
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async addToNewsletterList(sponsorId, listType) {
        try {
            const sponsor = await this.getSponsorData(sponsorId);
            
            // Simular adición a lista de newsletter
            const subscription = {
                email: sponsor.contactEmail,
                sponsorId: sponsorId,
                listType: listType,
                subscribedAt: new Date().toISOString()
            };

            this.addToEmailList(subscription);
            
            return {
                success: true,
                message: 'Added to newsletter list',
                listType: listType
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async generateCertificate(sponsorId) {
        try {
            const sponsor = await this.getSponsorData(sponsorId);
            
            const certificate = {
                id: `cert_${sponsorId}_${Date.now()}`,
                sponsorId: sponsorId,
                companyName: sponsor.companyName,
                tier: sponsor.tier,
                issuedAt: new Date().toISOString(),
                downloadUrl: `https://api.proyecto.com/certificates/${sponsorId}.pdf`
            };

            this.saveCertificate(certificate);
            
            return {
                success: true,
                message: 'Certificate generated',
                certificateId: certificate.id,
                downloadUrl: certificate.downloadUrl
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async grantEarlyAccess(sponsorId) {
        try {
            const accessGrant = {
                sponsorId: sponsorId,
                accessType: 'early_features',
                grantedAt: new Date().toISOString(),
                expiresAt: null // No expira
            };

            this.saveAccessGrant(accessGrant);
            
            return {
                success: true,
                message: 'Early access granted',
                accessType: 'early_features'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Métodos auxiliares
    generateSuggestedTimes() {
        const times = [];
        const now = new Date();
        
        for (let i = 1; i <= 7; i++) {
            const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
            times.push({
                date: date.toISOString().split('T')[0],
                time: '10:00',
                timezone: 'Europe/Madrid'
            });
        }
        
        return times;
    }

    addToTaskQueue(task) {
        const tasks = JSON.parse(localStorage.getItem('manualTasks') || '[]');
        tasks.push(task);
        localStorage.setItem('manualTasks', JSON.stringify(tasks));
    }

    addToCalendarQueue(appointment) {
        const appointments = JSON.parse(localStorage.getItem('scheduledAppointments') || '[]');
        appointments.push(appointment);
        localStorage.setItem('scheduledAppointments', JSON.stringify(appointments));
    }

    addLogoToSite(logoElement) {
        const logos = JSON.parse(localStorage.getItem('sponsorLogos') || '[]');
        logos.push(logoElement);
        localStorage.setItem('sponsorLogos', JSON.stringify(logos));
    }

    addToEmailList(subscription) {
        const subscriptions = JSON.parse(localStorage.getItem('emailSubscriptions') || '[]');
        subscriptions.push(subscription);
        localStorage.setItem('emailSubscriptions', JSON.stringify(subscriptions));
    }

    saveCertificate(certificate) {
        const certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
        certificates.push(certificate);
        localStorage.setItem('certificates', JSON.stringify(certificates));
    }

    saveAccessGrant(grant) {
        const grants = JSON.parse(localStorage.getItem('accessGrants') || '[]');
        grants.push(grant);
        localStorage.setItem('accessGrants', JSON.stringify(grants));
    }

    async getSponsorData(sponsorId) {
        // Simular obtención de datos del patrocinador
        const sponsors = JSON.parse(localStorage.getItem('sponsors') || '[]');
        const sponsor = sponsors.find(s => s.id === sponsorId);
        
        if (!sponsor) {
            throw new Error('Sponsor not found');
        }
        
        return sponsor;
    }

    renderBenefitsDashboard() {
        const container = document.getElementById('benefits-dashboard');
        if (!container) return;

        const activeSponsorships = Object.entries(this.activeBenefits)
            .filter(([_, sponsorship]) => sponsorship.status !== 'inactive');

        container.innerHTML = `
            <div class="benefits-dashboard">
                <div class="dashboard-header">
                    <h2>Dashboard de Beneficios</h2>
                    <div class="dashboard-stats">
                        <div class="stat-card">
                            <div class="stat-number">${activeSponsorships.length}</div>
                            <div class="stat-label">Patrocinios Activos</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${this.getPendingBenefitsCount()}</div>
                            <div class="stat-label">Beneficios Pendientes</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${this.getDeliveredBenefitsCount()}</div>
                            <div class="stat-label">Beneficios Entregados</div>
                        </div>
                    </div>
                </div>
                
                <div class="benefits-content">
                    ${activeSponsorships.map(([sponsorId, sponsorship]) => 
                        this.renderSponsorBenefits(sponsorId, sponsorship)
                    ).join('')}
                </div>
            </div>
        `;
    }

    renderSponsorBenefits(sponsorId, sponsorship) {
        const tierBenefits = this.benefits[sponsorship.tier];
        const sponsorTracking = Object.entries(this.benefitTracking)
            .filter(([key, _]) => key.startsWith(sponsorId));

        return `
            <div class="sponsor-benefits-card">
                <div class="sponsor-header">
                    <h3>Patrocinador: ${sponsorId}</h3>
                    <span class="tier-badge ${sponsorship.tier}">${sponsorship.tier.toUpperCase()}</span>
                </div>
                
                <div class="benefits-grid">
                    ${Object.entries(tierBenefits).map(([category, benefits]) => `
                        <div class="benefit-category">
                            <h4>${this.getCategoryName(category)}</h4>
                            <div class="benefits-list">
                                ${benefits.map(benefit => {
                                    const tracking = sponsorTracking.find(([key, _]) => 
                                        key.includes(benefit.id)
                                    );
                                    return this.renderBenefitItem(benefit, tracking?.[1]);
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderBenefitItem(benefit, tracking) {
        const status = tracking?.status || 'not_scheduled';
        const lastDelivery = tracking?.deliveries?.slice(-1)[0];
        
        return `
            <div class="benefit-item ${status}">
                <div class="benefit-info">
                    <div class="benefit-name">${benefit.name}</div>
                    <div class="benefit-description">${benefit.description}</div>
                    <div class="benefit-frequency">${this.getFrequencyLabel(benefit.deliveryFrequency)}</div>
                </div>
                
                <div class="benefit-status">
                    <span class="status-badge ${status}">${this.getStatusLabel(status)}</span>
                    ${tracking?.nextDelivery ? `
                        <div class="next-delivery">
                            Próxima: ${new Date(tracking.nextDelivery).toLocaleDateString()}
                        </div>
                    ` : ''}
                </div>
                
                <div class="benefit-actions">
                    ${benefit.deliveryMethod === 'manual' ? `
                        <button class="deliver-benefit" 
                                data-benefit-id="${benefit.id}" 
                                data-sponsor-id="${tracking?.sponsorId}">
                            Entregar
                        </button>
                    ` : ''}
                    
                    ${lastDelivery && !lastDelivery.completed ? `
                        <button class="mark-completed" 
                                data-benefit-id="${benefit.id}" 
                                data-sponsor-id="${tracking?.sponsorId}">
                            Marcar Completado
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getCategoryName(category) {
        const names = {
            visibility: 'Visibilidad',
            marketing: 'Marketing',
            access: 'Acceso',
            recognition: 'Reconocimiento',
            collaboration: 'Colaboración',
            content: 'Contenido',
            support: 'Soporte',
            branding: 'Branding',
            development: 'Desarrollo'
        };
        return names[category] || category;
    }

    getFrequencyLabel(frequency) {
        const labels = {
            immediate: 'Inmediato',
            once: 'Una vez',
            weekly: 'Semanal',
            monthly: 'Mensual',
            quarterly: 'Trimestral',
            biannual: 'Semestral',
            per_release: 'Por lanzamiento',
            per_event: 'Por evento',
            per_feature: 'Por característica',
            per_request: 'Por solicitud',
            continuous: 'Continuo'
        };
        return labels[frequency] || frequency;
    }

    getStatusLabel(status) {
        const labels = {
            not_scheduled: 'No programado',
            scheduled: 'Programado',
            delivered: 'Entregado',
            failed: 'Fallido',
            completed: 'Completado'
        };
        return labels[status] || status;
    }

    getPendingBenefitsCount() {
        return Object.values(this.benefitTracking)
            .filter(tracking => tracking.status === 'scheduled').length;
    }

    getDeliveredBenefitsCount() {
        return Object.values(this.benefitTracking)
            .filter(tracking => tracking.status === 'delivered' || tracking.status === 'completed').length;
    }

    // Métodos de persistencia
    saveActiveBenefits() {
        localStorage.setItem('activeBenefits', JSON.stringify(this.activeBenefits));
    }

    saveBenefitTracking() {
        localStorage.setItem('benefitTracking', JSON.stringify(this.benefitTracking));
    }

    // Notificaciones
    notifyBenefitActivation(sponsorId, tier) {
        console.log(`Benefits activated for sponsor ${sponsorId} at tier ${tier}`);
        
        // Aquí se enviarían notificaciones reales
        this.sendNotification({
            type: 'benefit_activation',
            sponsorId: sponsorId,
            tier: tier,
            message: `Beneficios del nivel ${tier} activados para ${sponsorId}`
        });
    }

    sendNotification(notification) {
        // Implementar sistema de notificaciones
        console.log('Notification:', notification);
    }

    initializeBenefitDelivery() {
        // Verificar beneficios pendientes al cargar
        setInterval(() => {
            this.checkPendingDeliveries();
        }, 60 * 60 * 1000); // Cada hora
        
        // Ejecutar inmediatamente
        this.checkPendingDeliveries();
    }

    checkPendingDeliveries() {
        const now = new Date();
        
        Object.entries(this.benefitTracking).forEach(([benefitKey, tracking]) => {
            if (tracking.nextDelivery && new Date(tracking.nextDelivery) <= now) {
                const [sponsorId, benefitId] = benefitKey.split('_');
                const benefit = this.findBenefit(benefitId);
                
                if (benefit) {
                    this.executeBenefit(benefitKey, benefit);
                }
            }
        });
    }

    findBenefit(benefitId) {
        for (const tier of Object.values(this.benefits)) {
            for (const category of Object.values(tier)) {
                const benefit = category.find(b => b.id === benefitId);
                if (benefit) return benefit;
            }
        }
        return null;
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.tierBenefits = new TierBenefits();
});

// Exportar para uso global
window.TierBenefits = TierBenefits;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TierBenefits;
}