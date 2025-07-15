// Sistema principal de donaciones
class DonationSystem {
    constructor() {
        this.currentDonation = {
            amount: 0,
            type: 'one-time',
            donor: null,
            paymentMethod: 'card'
        };
        this.processors = new PaymentProcessors();
        this.analytics = new DonorAnalytics();
        this.impactCalc = new ImpactCalculator();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDonationData();
        this.initializeWidgets();
        this.updateProgress();
    }

    setupEventListeners() {
        // Botones de cantidad
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectAmount(parseInt(e.target.dataset.amount));
            });
        });

        // Cantidad personalizada
        document.querySelector('.custom-amount')?.addEventListener('input', (e) => {
            this.selectAmount(parseInt(e.target.value) || 0);
        });

        // Tipo de donación
        document.querySelectorAll('input[name="donation-type"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.currentDonation.type = e.target.value;
                this.updateImpactDisplay();
            });
        });

        // Botón donar
        document.querySelector('.donate-btn')?.addEventListener('click', () => {
            this.proceedToPayment();
        });

        // Formulario de donación
        document.getElementById('donation-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processDonation();
        });
    }

    selectAmount(amount) {
        this.currentDonation.amount = amount;
        
        // Actualizar UI
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        document.querySelector(`[data-amount="${amount}"]`)?.classList.add('selected');
        
        // Actualizar impacto
        this.updateImpactDisplay();
        
        // Actualizar calculadora
        this.impactCalc.updateCalculation(amount);
    }

    updateImpactDisplay() {
        const { amount, type } = this.currentDonation;
        const impact = this.impactCalc.calculateImpact(amount, type);
        
        const impactText = document.querySelector('.impact-text');
        if (impactText) {
            impactText.textContent = impact.description;
        }
    }

    proceedToPayment() {
        if (this.currentDonation.amount === 0) {
            this.showMessage('Por favor, selecciona una cantidad', 'warning');
            return;
        }

        // Mostrar formulario de pago
        document.getElementById('payment-section').style.display = 'block';
        document.getElementById('payment-section').scrollIntoView({ behavior: 'smooth' });
        
        // Actualizar resumen
        this.updatePaymentSummary();
    }

    updatePaymentSummary() {
        const { amount, type } = this.currentDonation;
        const summary = document.querySelector('.payment-summary');
        
        if (summary) {
            summary.innerHTML = `
                <h4>Resumen de Donación</h4>
                <div class="summary-item">
                    <span>Cantidad:</span>
                    <strong>€${amount}</strong>
                </div>
                <div class="summary-item">
                    <span>Tipo:</span>
                    <strong>${type === 'one-time' ? 'Única' : 'Mensual'}</strong>
                </div>
                <div class="summary-total">
                    <span>Total:</span>
                    <strong>€${amount}</strong>
                </div>
            `;
        }
    }

    async processDonation() {
        const formData = this.collectFormData();
        
        if (!this.validateDonation(formData)) {
            return;
        }

        try {
            this.showLoading(true);
            
            // Procesar pago
            const result = await this.processors.processPayment(
                this.currentDonation.amount,
                formData.paymentMethod,
                formData
            );

            if (result.success) {
                await this.handleSuccessfulDonation(result);
            } else {
                this.showMessage(result.error || 'Error al procesar el pago', 'error');
            }
        } catch (error) {
            console.error('Error processing donation:', error);
            this.showMessage('Error inesperado. Por favor, intenta de nuevo', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    collectFormData() {
        return {
            name: document.getElementById('donor-name')?.value,
            email: document.getElementById('donor-email')?.value,
            paymentMethod: document.querySelector('input[name="payment-method"]:checked')?.value,
            anonymous: document.getElementById('anonymous-donation')?.checked,
            newsletter: document.getElementById('newsletter-subscribe')?.checked,
            amount: this.currentDonation.amount,
            type: this.currentDonation.type
        };
    }

    validateDonation(formData) {
        const errors = [];

        if (!formData.name) errors.push('Nombre es requerido');
        if (!formData.email) errors.push('Email es requerido');
        if (formData.amount < 1) errors.push('Cantidad mínima es €1');
        if (!formData.paymentMethod) errors.push('Método de pago es requerido');

        if (errors.length > 0) {
            this.showMessage(errors.join('. '), 'error');
            return false;
        }

        return true;
    }

    async handleSuccessfulDonation(result) {
        // Registrar donación
        await this.analytics.recordDonation({
            ...this.currentDonation,
            transactionId: result.transactionId,
            timestamp: new Date()
        });

        // Actualizar progreso
        this.updateProgress();
        
        // Mostrar éxito
        this.showSuccessAnimation();
        
        // Limpiar formulario
        this.resetForm();
        
        // Enviar email de confirmación
        this.sendConfirmationEmail(result);
    }

    showSuccessAnimation() {
        const overlay = document.getElementById('success-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            
            // Animación de entrada
            setTimeout(() => {
                overlay.classList.add('show');
            }, 100);
        }
    }

    updateProgress() {
        const progressBar = document.querySelector('.progress-fill');
        const stats = document.querySelector('.progress-stats');
        
        if (progressBar && stats) {
            const currentProgress = this.analytics.getTotalProgress();
            progressBar.style.width = `${currentProgress.percentage}%`;
            progressBar.setAttribute('data-progress', currentProgress.percentage);
            
            stats.innerHTML = `
                <span>€${currentProgress.raised.toLocaleString()} recaudados</span>
                <span>${currentProgress.donors} donantes</span>
                <span>€${currentProgress.remaining.toLocaleString()} restantes</span>
            `;
        }
    }

    resetForm() {
        document.getElementById('donation-form')?.reset();
        this.currentDonation = {
            amount: 0,
            type: 'one-time',
            donor: null,
            paymentMethod: 'card'
        };
        
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    showLoading(show) {
        const submitBtn = document.querySelector('.submit-donation');
        if (submitBtn) {
            submitBtn.disabled = show;
            submitBtn.textContent = show ? 'Procesando...' : 'Completar Donación';
        }
    }

    loadDonationData() {
        // Cargar datos persistentes
        const savedData = localStorage.getItem('donationData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.analytics.loadData(data);
            } catch (error) {
                console.error('Error loading donation data:', error);
            }
        }
    }

    initializeWidgets() {
        // Inicializar widgets de donación
        document.querySelectorAll('.donation-widget').forEach(widget => {
            new DonationWidget(widget);
        });
    }

    sendConfirmationEmail(result) {
        // Enviar email de confirmación (implementar con backend)
        console.log('Sending confirmation email for transaction:', result.transactionId);
    }
}

// Inicializar sistema
document.addEventListener('DOMContentLoaded', () => {
    window.donationSystem = new DonationSystem();
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DonationSystem;
}