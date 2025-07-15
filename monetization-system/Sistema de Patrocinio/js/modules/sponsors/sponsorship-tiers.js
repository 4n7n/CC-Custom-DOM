// Sistema de niveles de patrocinio
class SponsorshipTiers {
    constructor() {
        this.tiers = {
            bronze: {
                name: 'Patrocinador Bronce',
                price: 250,
                duration: 'mensual',
                color: '#cd7f32',
                icon: '🥉',
                benefits: [
                    'Logo en la página de patrocinadores',
                    'Mención en redes sociales',
                    'Acceso a updates exclusivos',
                    'Certificado digital de patrocinio'
                ],
                limits: {
                    maxSponsors: 20,
                    logoSize: 'small'
                }
            },
            silver: {
                name: 'Patrocinador Plata',
                price: 500,
                duration: 'mensual',
                color: '#c0c0c0',
                icon: '🥈',
                benefits: [
                    'Logo destacado en página principal',
                    'Mención en newsletter mensual',
                    'Acceso anticipado a nuevas características',
                    'Sesión de feedback mensual',
                    'Todos los beneficios de Bronce'
                ],
                limits: {
                    maxSponsors: 10,
                    logoSize: 'medium'
                }
            },
            gold: {
                name: 'Patrocinador Oro',
                price: 1000,
                duration: 'mensual',
                color: '#ffd700',
                icon: '🥇',
                benefits: [
                    'Logo premium en header del sitio',
                    'Post dedicado en blog',
                    'Entrevista en podcast/video',
                    'Influencia en roadmap del proyecto',
                    'Soporte técnico prioritario',
                    'Todos los beneficios anteriores'
                ],
                limits: {
                    maxSponsors: 5,
                    logoSize: 'large'
                }
            },
            platinum: {
                name: 'Patrocinador Platinum',
                price: 2500,
                duration: 'mensual',
                color: '#e5e4e2',
                icon: '💎',
                benefits: [
                    'Patrocinio exclusivo de características',
                    'Colaboración directa en desarrollo',
                    'Acceso a equipo de desarrollo',
                    'Representación en eventos',
                    'Integración personalizada',
                    'Todos los beneficios anteriores'
                ],
                limits: {
                    maxSponsors: 2,
                    logoSize: 'xlarge'
                }
            }
        };
        
        this.currentSponsors = this.loadSponsors();
        this.analytics = new SponsorshipAnalytics();
        this.init();
    }

    init() {
        this.renderTierCards();
        this.setupEventListeners();
        this.updateAvailability();
    }

    renderTierCards() {
        const container = document.getElementById('sponsorship-tiers');
        if (!container) return;

        container.innerHTML = Object.entries(this.tiers).map(([tierKey, tier]) => {
            const availability = this.getTierAvailability(tierKey);
            const isPopular = tierKey === 'silver';
            
            return `
                <div class="tier-card ${tierKey} ${!availability.available ? 'sold-out' : ''} ${isPopular ? 'popular' : ''}" 
                     data-tier="${tierKey}">
                    ${isPopular ? '<div class="popular-badge">Más Popular</div>' : ''}
                    
                    <div class="tier-header">
                        <div class="tier-icon">${tier.icon}</div>
                        <h3 class="tier-name">${tier.name}</h3>
                        <div class="tier-price">
                            <span class="amount">€${tier.price.toLocaleString()}</span>
                            <span class="period">/${tier.duration}</span>
                        </div>
                    </div>
                    
                    <div class="tier-availability">
                        <div class="availability-bar">
                            <div class="availability-fill" style="width: ${availability.percentage}%"></div>
                        </div>
                        <span class="availability-text">
                            ${availability.available ? 
                                `${availability.remaining} de ${tier.limits.maxSponsors} disponibles` : 
                                'Agotado'
                            }
                        </span>
                    </div>
                    
                    <ul class="benefits-list">
                        ${tier.benefits.map(benefit => `
                            <li class="benefit-item">
                                <span class="benefit-icon">✓</span>
                                <span class="benefit-text">${benefit}</span>
                            </li>
                        `).join('')}
                    </ul>
                    
                    <button class="select-tier-btn" 
                            ${!availability.available ? 'disabled' : ''}
                            data-tier="${tierKey}">
                        ${availability.available ? 'Seleccionar Plan' : 'No Disponible'}
                    </button>
                    
                    <div class="tier-footer">
                        <small>Facturación ${tier.duration}</small>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTierAvailability(tierKey) {
        const tier = this.tiers[tierKey];
        const currentCount = this.currentSponsors.filter(s => s.tier === tierKey && s.status === 'active').length;
        const remaining = tier.limits.maxSponsors - currentCount;
        
        return {
            available: remaining > 0,
            remaining: remaining,
            total: tier.limits.maxSponsors,
            percentage: (currentCount / tier.limits.maxSponsors) * 100
        };
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-tier-btn')) {
                const tierKey = e.target.dataset.tier;
                this.selectTier(tierKey);
            }
        });

        // Comparar tiers
        document.getElementById('compare-tiers')?.addEventListener('click', () => {
            this.showComparison();
        });
    }

    selectTier(tierKey) {
        const tier = this.tiers[tierKey];
        const availability = this.getTierAvailability(tierKey);
        
        if (!availability.available) {
            this.showError('Este nivel de patrocinio está agotado');
            return;
        }

        // Crear formulario de solicitud
        this.createSponsorshipForm(tierKey, tier);
    }

    createSponsorshipForm(tierKey, tier) {
        const modal = document.createElement('div');
        modal.className = 'sponsorship-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Solicitud de Patrocinio - ${tier.name}</h3>
                    <button class="close-modal">×</button>
                </div>
                
                <div class="tier-summary">
                    <div class="summary-icon">${tier.icon}</div>
                    <div class="summary-details">
                        <h4>${tier.name}</h4>
                        <p class="summary-price">€${tier.price}/${tier.duration}</p>
                    </div>
                </div>
                
                <form class="sponsorship-form" data-tier="${tierKey}">
                    <div class="form-section">
                        <h4>Información de la Empresa</h4>
                        <div class="form-group">
                            <label>Nombre de la empresa *</label>
                            <input type="text" name="companyName" required>
                        </div>
                        <div class="form-group">
                            <label>Sitio web *</label>
                            <input type="url" name="website" required placeholder="https://ejemplo.com">
                        </div>
                        <div class="form-group">
                            <label>Descripción de la empresa</label>
                            <textarea name="description" rows="3" placeholder="Breve descripción de su empresa y por qué quiere patrocinar"></textarea>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Contacto Principal</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Nombre *</label>
                                <input type="text" name="contactName" required>
                            </div>
                            <div class="form-group">
                                <label>Cargo</label>
                                <input type="text" name="position">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Email *</label>
                                <input type="email" name="email" required>
                            </div>
                            <div class="form-group">
                                <label>Teléfono</label>
                                <input type="tel" name="phone">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Detalles del Patrocinio</h4>
                        <div class="form-group">
                            <label>Fecha de inicio preferida</label>
                            <input type="date" name="startDate" min="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group">
                            <label>Duración inicial</label>
                            <select name="duration">
                                <option value="3">3 meses</option>
                                <option value="6" selected>6 meses</option>
                                <option value="12">12 meses</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Objetivos del patrocinio</label>
                            <textarea name="goals" rows="3" placeholder="¿Qué espera lograr con este patrocinio?"></textarea>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Términos y Condiciones</h4>
                        <label class="checkbox-label">
                            <input type="checkbox" name="termsAccepted" required>
                            <span>Acepto los términos y condiciones del programa de patrocinio</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="dataProcessing">
                            <span>Acepto el procesamiento de mis datos para fines de comunicación</span>
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancelar</button>
                        <button type="submit" class="submit-btn">Enviar Solicitud</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
        
        modal.querySelector('.sponsorship-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitSponsorshipRequest(e.target, tierKey);
        });
    }

    async submitSponsorshipRequest(form, tierKey) {
        try {
            const formData = new FormData(form);
            const requestData = {
                tier: tierKey,
                companyName: formData.get('companyName'),
                website: formData.get('website'),
                description: formData.get('description'),
                contactName: formData.get('contactName'),
                position: formData.get('position'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                startDate: formData.get('startDate'),
                duration: parseInt(formData.get('duration')),
                goals: formData.get('goals'),
                termsAccepted: formData.get('termsAccepted'),
                dataProcessing: formData.get('dataProcessing'),
                submittedAt: new Date()
            };
            
            // Validar formulario
            if (!this.validateSponsorshipRequest(requestData)) {
                return;
            }
            
            // Mostrar loading
            this.showLoading('Enviando solicitud...');
            
            // Simular envío
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Guardar solicitud
            this.saveSponsorshipRequest(requestData);
            
            // Cerrar modal
            document.querySelector('.sponsorship-modal').remove();
            
            // Mostrar confirmación
            this.showSuccessMessage(requestData);
            
            // Enviar email de confirmación
            this.sendConfirmationEmail(requestData);
            
        } catch (error) {
            this.showError('Error al enviar la solicitud: ' + error.message);
        }
    }

    validateSponsorshipRequest(data) {
        const errors = [];
        
        if (!data.companyName) errors.push('Nombre de empresa es requerido');
        if (!data.website) errors.push('Sitio web es requerido');
        if (!data.contactName) errors.push('Nombre de contacto es requerido');
        if (!data.email) errors.push('Email es requerido');
        if (!data.termsAccepted) errors.push('Debe aceptar los términos y condiciones');
        
        if (errors.length > 0) {
            this.showError(errors.join('. '));
            return false;
        }
        
        return true;
    }

    saveSponsorshipRequest(data) {
        const requests = JSON.parse(localStorage.getItem('sponsorshipRequests') || '[]');
        requests.push({
            id: 'req_' + Date.now(),
            status: 'pending',
            ...data
        });
        localStorage.setItem('sponsorshipRequests', JSON.stringify(requests));
    }

    showSuccessMessage(data) {
        const success = document.createElement('div');
        success.className = 'success-message-overlay';
        success.innerHTML = `
            <div class="success-content">
                <div class="success-icon">🎉</div>
                <h3>¡Solicitud Enviada!</h3>
                <p>Hemos recibido su solicitud para el <strong>${this.tiers[data.tier].name}</strong></p>
                <p>Nos pondremos en contacto en las próximas 48 horas.</p>
                <div class="next-steps">
                    <h4>Próximos pasos:</h4>
                    <ul>
                        <li>Revisaremos su solicitud</li>
                        <li>Le enviaremos un contrato</li>
                        <li>Configuraremos su patrocinio</li>
                    </ul>
                </div>
                <button class="close-success">Entendido</button>
            </div>
        `;
        
        document.body.appendChild(success);
        
        success.querySelector('.close-success').addEventListener('click', () => {
            success.remove();
        });
    }

    showComparison() {
        const modal = document.createElement('div');
        modal.className = 'comparison-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content comparison-content">
                <div class="modal-header">
                    <h3>Comparación de Niveles de Patrocinio</h3>
                    <button class="close-modal">×</button>
                </div>
                
                <div class="comparison-table">
                    <div class="comparison-header">
                        <div class="feature-column">Beneficios</div>
                        ${Object.entries(this.tiers).map(([key, tier]) => `
                            <div class="tier-column ${key}">
                                <div class="tier-name">${tier.icon} ${tier.name}</div>
                                <div class="tier-price">€${tier.price}/${tier.duration}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="comparison-body">
                        ${this.generateComparisonRows()}
                    </div>
                </div>
                
                <div class="comparison-footer">
                    <p>¿Necesita un plan personalizado? <a href="#contact">Contáctenos</a></p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
    }

    generateComparisonRows() {
        const allBenefits = new Set();
        Object.values(this.tiers).forEach(tier => {
            tier.benefits.forEach(benefit => allBenefits.add(benefit));
        });
        
        return Array.from(allBenefits).map(benefit => {
            return `
                <div class="comparison-row">
                    <div class="feature-name">${benefit}</div>
                    ${Object.entries(this.tiers).map(([key, tier]) => `
                        <div class="feature-value">
                            ${tier.benefits.includes(benefit) ? '✅' : '❌'}
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    }

    updateAvailability() {
        Object.keys(this.tiers).forEach(tierKey => {
            const availability = this.getTierAvailability(tierKey);
            const card = document.querySelector(`[data-tier="${tierKey}"]`);
            
            if (card) {
                const bar = card.querySelector('.availability-fill');
                const text = card.querySelector('.availability-text');
                const btn = card.querySelector('.select-tier-btn');
                
                if (bar) bar.style.width = `${availability.percentage}%`;
                if (text) {
                    text.textContent = availability.available ? 
                        `${availability.remaining} de ${availability.total} disponibles` : 
                        'Agotado';
                }
                if (btn) {
                    btn.disabled = !availability.available;
                    btn.textContent = availability.available ? 'Seleccionar Plan' : 'No Disponible';
                }
                
                card.classList.toggle('sold-out', !availability.available);
            }
        });
    }

    loadSponsors() {
        try {
            return JSON.parse(localStorage.getItem('sponsors') || '[]');
        } catch (error) {
            return [];
        }
    }

    sendConfirmationEmail(data) {
        // Implementar envío de email
        console.log('Enviando email de confirmación a:', data.email);
        
        // Simular template de email
        const emailTemplate = {
            to: data.email,
            subject: `Confirmación de solicitud - ${this.tiers[data.tier].name}`,
            html: `
                <h2>¡Gracias por su interés en patrocinar nuestro proyecto!</h2>
                <p>Hemos recibido su solicitud para el nivel <strong>${this.tiers[data.tier].name}</strong>.</p>
                <h3>Detalles de su solicitud:</h3>
                <ul>
                    <li>Empresa: ${data.companyName}</li>
                    <li>Nivel: ${this.tiers[data.tier].name}</li>
                    <li>Precio: €${this.tiers[data.tier].price}/${this.tiers[data.tier].duration}</li>
                    <li>Duración: ${data.duration} meses</li>
                </ul>
                <p>Nos pondremos en contacto en las próximas 48 horas.</p>
            `
        };
        
        return emailTemplate;
    }

    showLoading(message) {
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(loading);
        
        setTimeout(() => loading.remove(), 3000);
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'error-notification';
        error.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
                <button class="close-error">×</button>
            </div>
        `;
        
        document.body.appendChild(error);
        
        error.querySelector('.close-error').addEventListener('click', () => {
            error.remove();
        });
        
        setTimeout(() => error.remove(), 5000);
    }

    // Métodos públicos para gestión
    addSponsor(sponsorData) {
        const sponsor = {
            id: 'sponsor_' + Date.now(),
            status: 'active',
            startDate: new Date(),
            ...sponsorData
        };
        
        this.currentSponsors.push(sponsor);
        this.saveSponsors();
        this.updateAvailability();
        
        return sponsor;
    }

    removeSponsor(sponsorId) {
        const index = this.currentSponsors.findIndex(s => s.id === sponsorId);
        if (index > -1) {
            this.currentSponsors.splice(index, 1);
            this.saveSponsors();
            this.updateAvailability();
            return true;
        }
        return false;
    }

    updateSponsorStatus(sponsorId, status) {
        const sponsor = this.currentSponsors.find(s => s.id === sponsorId);
        if (sponsor) {
            sponsor.status = status;
            this.saveSponsors();
            this.updateAvailability();
            return true;
        }
        return false;
    }

    saveSponsors() {
        try {
            localStorage.setItem('sponsors', JSON.stringify(this.currentSponsors));
        } catch (error) {
            console.error('Error saving sponsors:', error);
        }
    }

    getActiveSponsorsByTier(tier) {
        return this.currentSponsors.filter(s => s.tier === tier && s.status === 'active');
    }

    getTotalMonthlyRevenue() {
        return this.currentSponsors
            .filter(s => s.status === 'active')
            .reduce((total, sponsor) => {
                return total + this.tiers[sponsor.tier].price;
            }, 0);
    }

    getRevenueProjection(months = 12) {
        const monthlyRevenue = this.getTotalMonthlyRevenue();
        return monthlyRevenue * months;
    }

    exportSponsorshipData() {
        return {
            tiers: this.tiers,
            currentSponsors: this.currentSponsors,
            availability: Object.keys(this.tiers).reduce((acc, tier) => {
                acc[tier] = this.getTierAvailability(tier);
                return acc;
            }, {}),
            revenue: {
                monthly: this.getTotalMonthlyRevenue(),
                projection12m: this.getRevenueProjection(12)
            },
            exportedAt: new Date()
        };
    }
}

// Analytics para patrocinios
class SponsorshipAnalytics {
    constructor() {
        this.events = this.loadEvents();
    }

    trackEvent(eventType, data) {
        const event = {
            id: Date.now(),
            type: eventType,
            data: data,
            timestamp: new Date(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.events.push(event);
        this.saveEvents();
    }

    trackTierView(tier) {
        this.trackEvent('tier_view', { tier });
    }

    trackTierSelection(tier) {
        this.trackEvent('tier_selection', { tier });
    }

    trackFormSubmission(tier, success) {
        this.trackEvent('form_submission', { tier, success });
    }

    trackComparison() {
        this.trackEvent('comparison_view', {});
    }

    getAnalytics(days = 30) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const recentEvents = this.events.filter(e => new Date(e.timestamp) >= cutoff);
        
        return {
            totalEvents: recentEvents.length,
            tierViews: this.countEventsByType(recentEvents, 'tier_view'),
            tierSelections: this.countEventsByType(recentEvents, 'tier_selection'),
            formSubmissions: this.countEventsByType(recentEvents, 'form_submission'),
            conversionRate: this.calculateConversionRate(recentEvents),
            popularTiers: this.getPopularTiers(recentEvents)
        };
    }

    countEventsByType(events, type) {
        return events.filter(e => e.type === type).length;
    }

    calculateConversionRate(events) {
        const views = this.countEventsByType(events, 'tier_view');
        const submissions = this.countEventsByType(events, 'form_submission');
        return views > 0 ? (submissions / views * 100).toFixed(2) : 0;
    }

    getPopularTiers(events) {
        const tierCounts = {};
        events.filter(e => e.type === 'tier_view').forEach(event => {
            const tier = event.data.tier;
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });
        
        return Object.entries(tierCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
    }

    loadEvents() {
        try {
            return JSON.parse(localStorage.getItem('sponsorshipAnalytics') || '[]');
        } catch (error) {
            return [];
        }
    }

    saveEvents() {
        try {
            // Mantener solo los últimos 1000 eventos
            if (this.events.length > 1000) {
                this.events = this.events.slice(-1000);
            }
            localStorage.setItem('sponsorshipAnalytics', JSON.stringify(this.events));
        } catch (error) {
            console.error('Error saving analytics:', error);
        }
    }
}

// Configuración automática
document.addEventListener('DOMContentLoaded', () => {
    window.sponsorshipTiers = new SponsorshipTiers();
    
    // Track page view
    if (window.sponsorshipTiers.analytics) {
        window.sponsorshipTiers.analytics.trackEvent('page_view', {
            page: 'sponsorship_tiers'
        });
    }
});

// Exportar para uso global
window.SponsorshipTiers = SponsorshipTiers;
window.SponsorshipAnalytics = SponsorshipAnalytics;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SponsorshipTiers, SponsorshipAnalytics };
}