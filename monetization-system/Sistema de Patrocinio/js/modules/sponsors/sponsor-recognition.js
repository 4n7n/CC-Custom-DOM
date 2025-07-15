// Sistema de reconocimiento de patrocinadores
class SponsorRecognition {
    constructor() {
        this.sponsors = this.loadSponsors();
        this.recognitionEvents = this.loadRecognitionEvents();
        this.templates = this.loadTemplates();
        this.displaySettings = this.loadDisplaySettings();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderSponsorDisplays();
        this.initializeRotatingLogos();
        this.scheduleRecognitionEvents();
    }

    loadSponsors() {
        try {
            return JSON.parse(localStorage.getItem('sponsors') || '[]');
        } catch (error) {
            return [];
        }
    }

    loadRecognitionEvents() {
        try {
            return JSON.parse(localStorage.getItem('recognitionEvents') || '[]');
        } catch (error) {
            return [];
        }
    }

    loadTemplates() {
        return {
            socialMedia: {
                welcome: {
                    text: "🎉 ¡Damos la bienvenida a {companyName} como nuestro nuevo patrocinador {tier}! Gracias por apoyar nuestro proyecto y ayudarnos a crecer. 🚀\n\n{website} #partnership #tech",
                    platforms: ['twitter', 'linkedin', 'instagram']
                },
                milestone: {
                    text: "🏆 Celebramos un nuevo hito junto a nuestros increíbles patrocinadores como {companyName}. Su apoyo hace posible que alcancemos estas metas. ¡Gracias! 💪\n\n{website} #milestone #sponsors",
                    platforms: ['twitter', 'linkedin']
                },
                monthlyFeature: {
                    text: "✨ Patrocinador destacado del mes: {companyName} 🌟\n\n{description}\n\nConoce más sobre ellos: {website}\n\n#sponsors #community #partnership",
                    platforms: ['twitter', 'linkedin', 'instagram', 'facebook']
                },
                anniversary: {
                    text: "🎂 Celebramos {months} meses de partnership con {companyName}! Su apoyo continuo ha sido fundamental para nuestro crecimiento. ¡Gracias por creer en nosotros! 🙏\n\n{website} #anniversary #loyalty",
                    platforms: ['twitter', 'linkedin']
                }
            },
            newsletter: {
                welcome: {
                    subject: "Nuevo Patrocinador: {companyName}",
                    html: `
                        <h2>🎉 Nuevo Patrocinador: {companyName}</h2>
                        <p>Nos complace anunciar que <strong>{companyName}</strong> se ha unido como patrocinador {tier} de nuestro proyecto.</p>
                        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Sobre {companyName}:</h3>
                            <p>{description}</p>
                            <p><a href="{website}" style="color: #667eea;">Visitar sitio web →</a></p>
                        </div>
                        <p>Su apoyo nos permite continuar innovando y mejorando nuestro proyecto. ¡Gracias {companyName}!</p>
                    `
                },
                monthly: {
                    subject: "Patrocinador Destacado: {companyName}",
                    html: `
                        <h2>✨ Patrocinador Destacado del Mes</h2>
                        <div style="text-align: center; margin: 30px 0;">
                            <img src="{logoUrl}" alt="{companyName}" style="max-width: 200px; max-height: 100px;">
                        </div>
                        <h3>{companyName}</h3>
                        <p>{description}</p>
                        <div style="background: #e6fffa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h4>¿Por qué patrocinan nuestro proyecto?</h4>
                            <p>"{sponsorshipGoals}"</p>
                        </div>
                        <p><a href="{website}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Conocer más sobre {companyName}</a></p>
                    `
                }
            },
            certificates: {
                appreciation: {
                    title: "Certificado de Reconocimiento",
                    content: `
                        <div class="certificate">
                            <h1>🏆 Certificado de Reconocimiento</h1>
                            <p class="subtitle">Se otorga a</p>
                            <h2>{companyName}</h2>
                            <p class="description">Por su valioso apoyo como patrocinador {tier} y su compromiso con la innovación tecnológica y el desarrollo de proyectos de código abierto.</p>
                            <div class="details">
                                <p>Nivel de Patrocinio: <strong>{tier}</strong></p>
                                <p>Fecha de Inicio: <strong>{startDate}</strong></p>
                                <p>Período: <strong>{duration}</strong></p>
                            </div>
                            <div class="signature">
                                <p>Equipo de Desarrollo</p>
                                <p>{date}</p>
                            </div>
                        </div>
                    `
                }
            }
        };
    }

    loadDisplaySettings() {
        try {
            const defaultSettings = {
                homepageDisplay: {
                    enabled: true,
                    maxLogos: 6,
                    rotationInterval: 5000,
                    showTierBadges: true
                },
                sponsorsPage: {
                    enabled: true,
                    groupByTier: true,
                    showDescription: true,
                    showMetrics: false
                },
                footerDisplay: {
                    enabled: true,
                    maxLogos: 4,
                    showText: true
                },
                headerDisplay: {
                    enabled: false,
                    premiumOnly: true,
                    maxLogos: 2
                }
            };
            
            return JSON.parse(localStorage.getItem('sponsorDisplaySettings') || JSON.stringify(defaultSettings));
        } catch (error) {
            return defaultSettings;
        }
    }

    setupEventListeners() {
        // Eventos de patrocinio
        document.addEventListener('sponsorshipActivated', (e) => {
            this.createWelcomeRecognition(e.detail.sponsorId);
        });

        document.addEventListener('sponsorshipMilestone', (e) => {
            this.createMilestoneRecognition(e.detail.sponsorId, e.detail.milestone);
        });

        // Controles de administración
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('feature-sponsor')) {
                this.featureSponsor(e.target.dataset.sponsorId);
            }
            
            if (e.target.classList.contains('generate-certificate')) {
                this.generateCertificate(e.target.dataset.sponsorId);
            }
            
            if (e.target.classList.contains('post-recognition')) {
                this.postSocialRecognition(e.target.dataset.eventId);
            }
        });
    }

    createWelcomeRecognition(sponsorId) {
        const sponsor = this.sponsors.find(s => s.id === sponsorId);
        if (!sponsor) return;

        const event = {
            id: `welcome_${sponsorId}_${Date.now()}`,
            type: 'welcome',
            sponsorId: sponsorId,
            createdAt: new Date().toISOString(),
            status: 'pending',
            platforms: this.templates.socialMedia.welcome.platforms,
            content: this.generateContent('socialMedia', 'welcome', sponsor)
        };

        this.recognitionEvents.push(event);
        this.saveRecognitionEvents();
        
        // Programar publicación automática
        this.scheduleRecognitionPost(event);
        
        // Enviar newsletter si es tier alto
        if (['gold', 'platinum'].includes(sponsor.tier)) {
            this.sendWelcomeNewsletter(sponsor);
        }
    }

    createMilestoneRecognition(sponsorId, milestone) {
        const sponsor = this.sponsors.find(s => s.id === sponsorId);
        if (!sponsor) return;

        const event = {
            id: `milestone_${sponsorId}_${Date.now()}`,
            type: 'milestone',
            sponsorId: sponsorId,
            milestone: milestone,
            createdAt: new Date().toISOString(),
            status: 'pending',
            platforms: this.templates.socialMedia.milestone.platforms,
            content: this.generateContent('socialMedia', 'milestone', sponsor, { milestone })
        };

        this.recognitionEvents.push(event);
        this.saveRecognitionEvents();
        this.scheduleRecognitionPost(event);
    }

    generateContent(category, type, sponsor, extraData = {}) {
        const template = this.templates[category][type];
        let content = template.text || template.html;
        
        // Reemplazar variables
        const variables = {
            companyName: sponsor.companyName,
            website: sponsor.website,
            tier: this.getTierDisplayName(sponsor.tier),
            description: sponsor.description || sponsor.brandDescription,
            logoUrl: sponsor.logoUrl,
            sponsorshipGoals: sponsor.goals,
            startDate: new Date(sponsor.startDate).toLocaleDateString('es-ES'),
            duration: this.calculateDuration(sponsor.startDate),
            date: new Date().toLocaleDateString('es-ES'),
            months: this.calculateMonths(sponsor.startDate),
            ...extraData
        };

        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{${key}}`, 'g');
            content = content.replace(regex, value || '');
        });

        return content;
    }

    getTierDisplayName(tier) {
        const names = {
            bronze: 'Bronce 🥉',
            silver: 'Plata 🥈', 
            gold: 'Oro 🥇',
            platinum: 'Platinum 💎'
        };
        return names[tier] || tier;
    }

    calculateDuration(startDate) {
        const months = this.calculateMonths(startDate);
        if (months < 1) return 'Menos de 1 mes';
        if (months === 1) return '1 mes';
        if (months < 12) return `${months} meses`;
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        return `${years} año${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}` : ''}`;
    }

    calculateMonths(startDate) {
        const start = new Date(startDate);
        const now = new Date();
        return Math.floor((now - start) / (1000 * 60 * 60 * 24 * 30));
    }

    scheduleRecognitionPost(event) {
        // Programar para publicación inmediata o en horario óptimo
        const postTime = this.getOptimalPostTime();
        
        setTimeout(() => {
            this.executeRecognitionPost(event);
        }, postTime - Date.now());
    }

    getOptimalPostTime() {
        // Programar para horario de mayor engagement
        const now = new Date();
        const optimal = new Date();
        
        // Si es fuera de horario laboral, programar para mañana a las 10 AM
        if (now.getHours() < 9 || now.getHours() > 17) {
            optimal.setDate(optimal.getDate() + 1);
            optimal.setHours(10, 0, 0, 0);
        } else {
            // Publicar en 30 minutos
            optimal.setTime(now.getTime() + 30 * 60 * 1000);
        }
        
        return optimal.getTime();
    }

    async executeRecognitionPost(event) {
        try {
            const results = [];
            
            for (const platform of event.platforms) {
                const result = await this.postToPlatform(platform, event.content, event);
                results.push({ platform, ...result });
            }
            
            event.status = 'posted';
            event.postedAt = new Date().toISOString();
            event.results = results;
            
            this.saveRecognitionEvents();
            this.trackRecognitionMetrics(event);
            
        } catch (error) {
            event.status = 'failed';
            event.error = error.message;
            this.saveRecognitionEvents();
        }
    }

    async postToPlatform(platform, content, event) {
        // Simular publicación en redes sociales
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const postId = `${platform}_${Date.now()}`;
        
        // En producción, aquí se usarían las APIs reales
        console.log(`Posted to ${platform}:`, content);
        
        return {
            success: true,
            postId: postId,
            url: `https://${platform}.com/post/${postId}`,
            metrics: {
                impressions: 0,
                engagement: 0,
                clicks: 0
            }
        };
    }

    renderSponsorDisplays() {
        this.renderHomepageDisplay();
        this.renderSponsorsPage();
        this.renderFooterDisplay();
        this.renderHeaderDisplay();
    }

    renderHomepageDisplay() {
        const container = document.getElementById('homepage-sponsors');
        if (!container || !this.displaySettings.homepageDisplay.enabled) return;

        const activeSponsors = this.getActiveSponsors()
            .slice(0, this.displaySettings.homepageDisplay.maxLogos);

        container.innerHTML = `
            <div class="homepage-sponsors">
                <h3>Nuestros Patrocinadores</h3>
                <div class="sponsors-carousel" id="sponsors-carousel">
                    ${activeSponsors.map(sponsor => `
                        <div class="sponsor-logo-container">
                            <a href="${sponsor.website}" target="_blank" rel="noopener">
                                <img src="${sponsor.logoUrl}" alt="${sponsor.companyName}" 
                                     class="sponsor-logo ${sponsor.tier}">
                                ${this.displaySettings.homepageDisplay.showTierBadges ? 
                                    `<span class="tier-badge ${sponsor.tier}">${this.getTierDisplayName(sponsor.tier)}</span>` : 
                                    ''
                                }
                            </a>
                        </div>
                    `).join('')}
                </div>
                <a href="/sponsors" class="view-all-sponsors">Ver todos los patrocinadores →</a>
            </div>
        `;
    }

    renderSponsorsPage() {
        const container = document.getElementById('sponsors-page');
        if (!container || !this.displaySettings.sponsorsPage.enabled) return;

        const activeSponsors = this.getActiveSponsors();
        const groupedSponsors = this.displaySettings.sponsorsPage.groupByTier ? 
            this.groupSponsorsByTier(activeSponsors) : 
            { all: activeSponsors };

        container.innerHTML = `
            <div class="sponsors-page">
                <div class="page-header">
                    <h1>Nuestros Patrocinadores</h1>
                    <p>Gracias a estas increíbles empresas que hacen posible nuestro proyecto</p>
                </div>
                
                ${Object.entries(groupedSponsors).map(([tier, sponsors]) => `
                    <div class="tier-section ${tier}">
                        ${tier !== 'all' ? `<h2>Patrocinadores ${this.getTierDisplayName(tier)}</h2>` : ''}
                        <div class="sponsors-grid">
                            ${sponsors.map(sponsor => this.renderSponsorCard(sponsor)).join('')}
                        </div>
                    </div>
                `).join('')}
                
                <div class="become-sponsor">
                    <h3>¿Quieres ser patrocinador?</h3>
                    <p>Únete a estas fantásticas empresas y apoya nuestro proyecto</p>
                    <a href="/sponsorship" class="become-sponsor-btn">Convertirse en Patrocinador</a>
                </div>
            </div>
        `;
    }

    renderSponsorCard(sponsor) {
        return `
            <div class="sponsor-card ${sponsor.tier}">
                <div class="sponsor-card-header">
                    <img src="${sponsor.logoUrl}" alt="${sponsor.companyName}" class="sponsor-card-logo">
                    <span class="sponsor-tier-badge ${sponsor.tier}">${this.getTierDisplayName(sponsor.tier)}</span>
                </div>
                
                <div class="sponsor-card-content">
                    <h3>${sponsor.companyName}</h3>
                    ${this.displaySettings.sponsorsPage.showDescription && sponsor.description ? 
                        `<p class="sponsor-description">${sponsor.description}</p>` : 
                        ''
                    }
                    
                    <div class="sponsor-details">
                        <div class="detail-item">
                            <span class="detail-label">Patrocinador desde:</span>
                            <span class="detail-value">${new Date(sponsor.startDate).toLocaleDateString('es-ES')}</span>
                        </div>
                        
                        ${this.displaySettings.sponsorsPage.showMetrics ? `
                            <div class="detail-item">
                                <span class="detail-label">Impacto:</span>
                                <span class="detail-value">${this.calculateSponsorImpact(sponsor)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="sponsor-actions">
                        <a href="${sponsor.website}" target="_blank" rel="noopener" class="sponsor-website-btn">
                            Visitar Sitio Web →
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    groupSponsorsByTier(sponsors) {
        const tiers = ['platinum', 'gold', 'silver', 'bronze'];
        const grouped = {};
        
        tiers.forEach(tier => {
            const tierSponsors = sponsors.filter(s => s.tier === tier);
            if (tierSponsors.length > 0) {
                grouped[tier] = tierSponsors;
            }
        });
        
        return grouped;
    }

    calculateSponsorImpact(sponsor) {
        const months = this.calculateMonths(sponsor.startDate);
        const tierMultipliers = { bronze: 1, silver: 2, gold: 4, platinum: 8 };
        const impact = months * (tierMultipliers[sponsor.tier] || 1);
        
        if (impact < 10) return `${impact} funciones`;
        if (impact < 50) return `${Math.floor(impact / 10)} módulos`;
        return `${Math.floor(impact / 50)} características principales`;
    }

    renderFooterDisplay() {
        const container = document.getElementById('footer-sponsors');
        if (!container || !this.displaySettings.footerDisplay.enabled) return;

        const activeSponsors = this.getActiveSponsors()
            .slice(0, this.displaySettings.footerDisplay.maxLogos);

        container.innerHTML = `
            <div class="footer-sponsors">
                ${this.displaySettings.footerDisplay.showText ? 
                    '<p>Con el apoyo de:</p>' : 
                    ''
                }
                <div class="footer-sponsors-logos">
                    ${activeSponsors.map(sponsor => `
                        <a href="${sponsor.website}" target="_blank" rel="noopener">
                            <img src="${sponsor.logoUrl}" alt="${sponsor.companyName}" 
                                 class="footer-sponsor-logo">
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderHeaderDisplay() {
        const container = document.getElementById('header-sponsors');
        if (!container || !this.displaySettings.headerDisplay.enabled) return;

        const premiumSponsors = this.displaySettings.headerDisplay.premiumOnly ? 
            this.getActiveSponsors().filter(s => ['gold', 'platinum'].includes(s.tier)) :
            this.getActiveSponsors();

        const displaySponsors = premiumSponsors.slice(0, this.displaySettings.headerDisplay.maxLogos);

        container.innerHTML = `
            <div class="header-sponsors">
                ${displaySponsors.map(sponsor => `
                    <a href="${sponsor.website}" target="_blank" rel="noopener" class="header-sponsor-link">
                        <img src="${sponsor.logoUrl}" alt="${sponsor.companyName}" 
                             class="header-sponsor-logo">
                    </a>
                `).join('')}
            </div>
        `;
    }

    initializeRotatingLogos() {
        const carousel = document.getElementById('sponsors-carousel');
        if (!carousel || !this.displaySettings.homepageDisplay.enabled) return;

        const logos = carousel.querySelectorAll('.sponsor-logo-container');
        if (logos.length <= 1) return;

        let currentIndex = 0;
        
        setInterval(() => {
            logos[currentIndex].style.opacity = '0.5';
            currentIndex = (currentIndex + 1) % logos.length;
            logos[currentIndex].style.opacity = '1';
        }, this.displaySettings.homepageDisplay.rotationInterval);
    }

    featureSponsor(sponsorId) {
        const sponsor = this.sponsors.find(s => s.id === sponsorId);
        if (!sponsor) return;

        const event = {
            id: `feature_${sponsorId}_${Date.now()}`,
            type: 'monthlyFeature',
            sponsorId: sponsorId,
            createdAt: new Date().toISOString(),
            status: 'pending',
            platforms: this.templates.socialMedia.monthlyFeature.platforms,
            content: this.generateContent('socialMedia', 'monthlyFeature', sponsor)
        };

        this.recognitionEvents.push(event);
        this.saveRecognitionEvents();
        
        // Enviar newsletter destacado
        this.sendFeatureNewsletter(sponsor);
        
        // Programar posts en redes sociales
        this.scheduleRecognitionPost(event);
    }

    async generateCertificate(sponsorId) {
        const sponsor = this.sponsors.find(s => s.id === sponsorId);
        if (!sponsor) return;

        const certificateContent = this.generateContent('certificates', 'appreciation', sponsor);
        
        const certificate = {
            id: `cert_${sponsorId}_${Date.now()}`,
            sponsorId: sponsorId,
            type: 'appreciation',
            content: certificateContent,
            generatedAt: new Date().toISOString(),
            downloadUrl: `certificates/${sponsorId}-appreciation.pdf`
        };

        // En producción, aquí se generaría el PDF real
        console.log('Certificate generated:', certificate);
        
        // Notificar al patrocinador
        this.notifyCertificateGenerated(sponsor, certificate);
        
        return certificate;
    }

    sendWelcomeNewsletter(sponsor) {
        const content = this.generateContent('newsletter', 'welcome', sponsor);
        
        const newsletter = {
            type: 'sponsor_welcome',
            sponsor: sponsor.companyName,
            subject: this.templates.newsletter.welcome.subject.replace('{companyName}', sponsor.companyName),
            content: content,
            sentAt: new Date().toISOString()
        };

        // Simular envío
        console.log('Welcome newsletter sent:', newsletter);
        this.trackNewsletterSent(newsletter);
    }

    sendFeatureNewsletter(sponsor) {
        const content = this.generateContent('newsletter', 'monthly', sponsor);
        
        const newsletter = {
            type: 'sponsor_feature',
            sponsor: sponsor.companyName,
            subject: this.templates.newsletter.monthly.subject.replace('{companyName}', sponsor.companyName),
            content: content,
            sentAt: new Date().toISOString()
        };

        // Simular envío
        console.log('Feature newsletter sent:', newsletter);
        this.trackNewsletterSent(newsletter);
    }

    getActiveSponsors() {
        return this.sponsors.filter(sponsor => 
            sponsor.status === 'active' && 
            sponsor.logoUrl && 
            sponsor.website
        ).sort((a, b) => {
            // Ordenar por tier (platinum primero) y luego por fecha
            const tierOrder = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
            const tierDiff = (tierOrder[b.tier] || 0) - (tierOrder[a.tier] || 0);
            if (tierDiff !== 0) return tierDiff;
            
            return new Date(a.startDate) - new Date(b.startDate);
        });
    }

    scheduleRecognitionEvents() {
        // Programar eventos mensuales de reconocimiento
        setInterval(() => {
            this.checkMonthlyRecognition();
        }, 24 * 60 * 60 * 1000); // Diario

        // Programar eventos de aniversario
        setInterval(() => {
            this.checkAnniversaries();
        }, 24 * 60 * 60 * 1000); // Diario
    }

    checkMonthlyRecognition() {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Si es el primer día del mes, destacar un patrocinador
        if (now.getDate() === 1) {
            const availableSponsors = this.getActiveSponsors().filter(sponsor => {
                const lastFeature = this.recognitionEvents
                    .filter(event => event.type === 'monthlyFeature' && event.sponsorId === sponsor.id)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                
                // No destacar si ya fue destacado en los últimos 3 meses
                if (!lastFeature) return true;
                
                const lastFeatureDate = new Date(lastFeature.createdAt);
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                
                return lastFeatureDate < threeMonthsAgo;
            });

            if (availableSponsors.length > 0) {
                // Seleccionar patrocinador aleatoriamente, priorizando tiers altos
                const weightedSponsors = [];
                availableSponsors.forEach(sponsor => {
                    const weights = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
                    const weight = weights[sponsor.tier] || 1;
                    for (let i = 0; i < weight; i++) {
                        weightedSponsors.push(sponsor);
                    }
                });
                
                const selectedSponsor = weightedSponsors[Math.floor(Math.random() * weightedSponsors.length)];
                this.featureSponsor(selectedSponsor.id);
            }
        }
    }

    checkAnniversaries() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();

        this.getActiveSponsors().forEach(sponsor => {
            const startDate = new Date(sponsor.startDate);
            
            // Verificar si es aniversario (mismo mes y día)
            if (startDate.getMonth() === currentMonth && startDate.getDate() === currentDay) {
                const months = this.calculateMonths(sponsor.startDate);
                
                // Solo crear evento si es múltiplo de 6 meses
                if (months > 0 && months % 6 === 0) {
                    this.createAnniversaryRecognition(sponsor.id, months);
                }
            }
        });
    }

    createAnniversaryRecognition(sponsorId, months) {
        const sponsor = this.sponsors.find(s => s.id === sponsorId);
        if (!sponsor) return;

        const event = {
            id: `anniversary_${sponsorId}_${Date.now()}`,
            type: 'anniversary',
            sponsorId: sponsorId,
            months: months,
            createdAt: new Date().toISOString(),
            status: 'pending',
            platforms: this.templates.socialMedia.anniversary.platforms,
            content: this.generateContent('socialMedia', 'anniversary', sponsor, { months })
        };

        this.recognitionEvents.push(event);
        this.saveRecognitionEvents();
        this.scheduleRecognitionPost(event);
    }

    trackRecognitionMetrics(event) {
        // Implementar tracking de métricas
        console.log('Tracking recognition metrics for:', event.id);
    }

    trackNewsletterSent(newsletter) {
        // Implementar tracking de newsletters
        console.log('Newsletter tracked:', newsletter.type);
    }

    notifyCertificateGenerated(sponsor, certificate) {
        // Enviar notificación al patrocinador
        console.log(`Certificate generated for ${sponsor.companyName}:`, certificate.downloadUrl);
    }

    // Métodos de persistencia
    saveRecognitionEvents() {
        localStorage.setItem('recognitionEvents', JSON.stringify(this.recognitionEvents));
    }

    saveDisplaySettings() {
        localStorage.setItem('sponsorDisplaySettings', JSON.stringify(this.displaySettings));
    }

    // API pública
    updateDisplaySettings(newSettings) {
        this.displaySettings = { ...this.displaySettings, ...newSettings };
        this.saveDisplaySettings();
        this.renderSponsorDisplays();
    }

    getRecognitionStats() {
        const stats = {
            totalEvents: this.recognitionEvents.length,
            pendingEvents: this.recognitionEvents.filter(e => e.status === 'pending').length,
            completedEvents: this.recognitionEvents.filter(e => e.status === 'posted').length,
            failedEvents: this.recognitionEvents.filter(e => e.status === 'failed').length
        };

        return stats;
    }

    exportRecognitionData() {
        return {
            events: this.recognitionEvents,
            settings: this.displaySettings,
            stats: this.getRecognitionStats(),
            exportedAt: new Date().toISOString()
        };
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.sponsorRecognition = new SponsorRecognition();
});

// Exportar para uso global
window.SponsorRecognition = SponsorRecognition;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SponsorRecognition;
}