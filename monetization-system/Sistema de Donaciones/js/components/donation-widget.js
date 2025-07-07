// Widget de donación reutilizable
class DonationWidget {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            amounts: [5, 15, 25, 50, 100],
            defaultAmount: 25,
            showImpact: true,
            theme: 'default',
            compact: false,
            ...options
        };
        
        this.selectedAmount = this.options.defaultAmount;
        this.impactCalculator = new ImpactCalculator();
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
        this.updateImpact();
    }

    render() {
        const { amounts, compact, theme } = this.options;
        
        this.element.className = `donation-widget ${theme} ${compact ? 'compact' : ''}`;
        this.element.innerHTML = `
            <div class="widget-header">
                <h3>🌱 Apoya el Proyecto</h3>
                ${!compact ? '<p>Tu donación hace la diferencia</p>' : ''}
            </div>
            
            <div class="amount-selection">
                <div class="quick-amounts">
                    ${amounts.map(amount => `
                        <button class="amount-option ${amount === this.selectedAmount ? 'selected' : ''}" 
                                data-amount="${amount}">
                            €${amount}
                        </button>
                    `).join('')}
                </div>
                
                <div class="custom-amount-container">
                    <input type="number" 
                           class="custom-amount-input" 
                           placeholder="Otro importe"
                           min="1" 
                           max="10000"
                           value="${this.selectedAmount}">
                    <span class="currency">€</span>
                </div>
            </div>
            
            ${this.options.showImpact ? `
                <div class="impact-display">
                    <div class="impact-content">
                        <span class="impact-icon">⚡</span>
                        <span class="impact-text">Calculando impacto...</span>
                    </div>
                </div>
            ` : ''}
            
            <div class="donation-types">
                <label class="donation-type-option">
                    <input type="radio" name="donation-type-${this.getWidgetId()}" value="one-time" checked>
                    <span>Donación única</span>
                </label>
                <label class="donation-type-option">
                    <input type="radio" name="donation-type-${this.getWidgetId()}" value="monthly">
                    <span>Mensual</span>
                </label>
            </div>
            
            <button class="donate-button">
                <span class="button-text">Donar €${this.selectedAmount}</span>
                <span class="button-icon">💝</span>
            </button>
            
            <div class="widget-footer">
                <div class="security-badge">🔒 Pago seguro</div>
                <div class="methods">💳 PayPal • Crypto</div>
            </div>
        `;
    }

    attachEventListeners() {
        // Botones de cantidad rápida
        this.element.querySelectorAll('.amount-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectAmount(parseInt(e.target.dataset.amount));
            });
        });

        // Input de cantidad personalizada
        const customInput = this.element.querySelector('.custom-amount-input');
        customInput.addEventListener('input', (e) => {
            const amount = parseInt(e.target.value) || 0;
            if (amount > 0) {
                this.selectAmount(amount);
            }
        });

        // Tipos de donación
        this.element.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateImpact();
                this.updateDonateButton();
            });
        });

        // Botón de donación
        this.element.querySelector('.donate-button').addEventListener('click', () => {
            this.initiateDonation();
        });
    }

    selectAmount(amount) {
        this.selectedAmount = amount;
        
        // Actualizar UI
        this.element.querySelectorAll('.amount-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const selectedBtn = this.element.querySelector(`[data-amount="${amount}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        // Actualizar input personalizado
        this.element.querySelector('.custom-amount-input').value = amount;
        
        // Actualizar impacto y botón
        this.updateImpact();
        this.updateDonateButton();
        
        // Trigger evento personalizado
        this.element.dispatchEvent(new CustomEvent('amountChanged', {
            detail: { amount, widget: this }
        }));
    }

    updateImpact() {
        if (!this.options.showImpact) return;
        
        const type = this.getDonationType();
        const impact = this.impactCalculator.calculateImpact(this.selectedAmount, type);
        const impactDisplay = this.element.querySelector('.impact-display');
        
        if (impactDisplay && impact.impacts.length > 0) {
            const topImpact = impact.impacts[0];
            impactDisplay.innerHTML = `
                <div class="impact-content">
                    <span class="impact-icon">${topImpact.icon}</span>
                    <span class="impact-text">${impact.description}</span>
                </div>
            `;
            
            // Animación de actualización
            impactDisplay.classList.add('updating');
            setTimeout(() => {
                impactDisplay.classList.remove('updating');
            }, 300);
        }
    }

    updateDonateButton() {
        const button = this.element.querySelector('.donate-button');
        const type = this.getDonationType();
        const typeText = type === 'monthly' ? '/mes' : '';
        
        button.querySelector('.button-text').textContent = `Donar €${this.selectedAmount}${typeText}`;
        
        // Animación del botón
        button.classList.add('pulse');
        setTimeout(() => {
            button.classList.remove('pulse');
        }, 300);
    }

    getDonationType() {
        const checked = this.element.querySelector('input[type="radio"]:checked');
        return checked ? checked.value : 'one-time';
    }

    getWidgetId() {
        return Math.random().toString(36).substr(2, 9);
    }

    initiateDonation() {
        const donationData = {
            amount: this.selectedAmount,
            type: this.getDonationType(),
            widget: this.element,
            source: 'widget'
        };
        
        // Trigger evento de donación
        this.element.dispatchEvent(new CustomEvent('donationInitiated', {
            detail: donationData,
            bubbles: true
        }));
        
        // Si hay sistema global, usar ese
        if (window.donationSystem) {
            window.donationSystem.currentDonation = {
                amount: donationData.amount,
                type: donationData.type,
                source: 'widget'
            };
            window.donationSystem.proceedToPayment();
        } else {
            // Crear modal de donación
            this.createDonationModal(donationData);
        }
    }

    createDonationModal(data) {
        const modal = document.createElement('div');
        modal.className = 'donation-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Completar Donación</h3>
                    <button class="close-modal">×</button>
                </div>
                
                <div class="donation-summary">
                    <div class="summary-amount">€${data.amount}</div>
                    <div class="summary-type">${data.type === 'monthly' ? 'Donación mensual' : 'Donación única'}</div>
                </div>
                
                <form class="quick-donation-form">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required placeholder="tu@email.com">
                    </div>
                    
                    <div class="form-group">
                        <label>Nombre (opcional)</label>
                        <input type="text" name="name" placeholder="Tu nombre">
                    </div>
                    
                    <div class="payment-methods">
                        <button type="button" class="payment-method" data-method="card">
                            💳 Tarjeta
                        </button>
                        <button type="button" class="payment-method" data-method="paypal">
                            💰 PayPal
                        </button>
                    </div>
                    
                    <button type="submit" class="complete-donation">
                        Completar Donación
                    </button>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners del modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.quick-donation-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processDonation(data, new FormData(e.target));
            modal.remove();
        });
        
        // Métodos de pago
        modal.querySelectorAll('.payment-method').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.payment-method').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
        
        // Seleccionar primer método por defecto
        modal.querySelector('.payment-method').classList.add('selected');
    }

    async processDonation(donationData, formData) {
        try {
            const paymentData = {
                amount: donationData.amount,
                type: donationData.type,
                email: formData.get('email'),
                name: formData.get('name'),
                method: document.querySelector('.payment-method.selected')?.dataset.method || 'card'
            };
            
            // Mostrar loading
            this.showLoading();
            
            // Simular procesamiento
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Mostrar éxito
            this.showSuccess(donationData.amount);
            
            // Trigger evento de éxito
            this.element.dispatchEvent(new CustomEvent('donationCompleted', {
                detail: { ...donationData, ...paymentData },
                bubbles: true
            }));
            
        } catch (error) {
            this.showError('Error al procesar la donación: ' + error.message);
        }
    }

    showLoading() {
        const loading = document.createElement('div');
        loading.className = 'donation-loading';
        loading.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p>Procesando donación...</p>
                </div>
            </div>
        `;
        document.body.appendChild(loading);
        
        setTimeout(() => loading.remove(), 3000);
    }

    showSuccess(amount) {
        const success = document.createElement('div');
        success.className = 'donation-success';
        success.innerHTML = `
            <div class="success-overlay">
                <div class="success-content">
                    <div class="success-icon">🎉</div>
                    <h3>¡Gracias por tu donación!</h3>
                    <p>€${amount} recibidos</p>
                    <button class="close-success">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(success);
        
        success.querySelector('.close-success').addEventListener('click', () => {
            success.remove();
        });
        
        setTimeout(() => success.remove(), 5000);
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'donation-error';
        error.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(error);
        setTimeout(() => error.remove(), 5000);
    }

    // Métodos públicos
    setAmount(amount) {
        this.selectAmount(amount);
    }

    setType(type) {
        const radio = this.element.querySelector(`input[value="${type}"]`);
        if (radio) {
            radio.checked = true;
            this.updateImpact();
            this.updateDonateButton();
        }
    }

    disable() {
        this.element.classList.add('disabled');
        this.element.querySelectorAll('button, input').forEach(el => {
            el.disabled = true;
        });
    }

    enable() {
        this.element.classList.remove('disabled');
        this.element.querySelectorAll('button, input').forEach(el => {
            el.disabled = false;
        });
    }

    destroy() {
        this.element.innerHTML = '';
        this.element.className = '';
    }
}

// Factory para crear widgets
class DonationWidgetFactory {
    static create(selector, options = {}) {
        const elements = document.querySelectorAll(selector);
        const widgets = [];
        
        elements.forEach(element => {
            const widget = new DonationWidget(element, options);
            widgets.push(widget);
        });
        
        return widgets.length === 1 ? widgets[0] : widgets;
    }
    
    static createFloating(options = {}) {
        const floatingOptions = {
            compact: true,
            amounts: [5, 15, 25],
            theme: 'floating',
            ...options
        };
        
        const container = document.createElement('div');
        container.className = 'floating-donation-widget';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 280px;
        `;
        
        document.body.appendChild(container);
        
        return new DonationWidget(container, floatingOptions);
    }
    
    static createInline(targetSelector, options = {}) {
        const target = document.querySelector(targetSelector);
        if (!target) return null;
        
        const container = document.createElement('div');
        target.appendChild(container);
        
        return new DonationWidget(container, options);
    }
}

// Auto-inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar widgets automáticamente
    DonationWidgetFactory.create('.donation-widget');
    
    // Crear widget flotante si está configurado
    if (window.donationConfig?.showFloatingWidget) {
        setTimeout(() => {
            DonationWidgetFactory.createFloating(window.donationConfig.floatingOptions);
        }, 3000);
    }
});

// Exportar para uso global
window.DonationWidget = DonationWidget;
window.DonationWidgetFactory = DonationWidgetFactory;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DonationWidget, DonationWidgetFactory };
}