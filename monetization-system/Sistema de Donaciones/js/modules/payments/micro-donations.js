// Sistema de micro-donaciones
class MicroDonations {
    constructor() {
        this.minAmount = 1;
        this.maxAmount = 50;
        this.quickAmounts = [1, 3, 5, 10, 15, 25];
        this.processors = new PaymentProcessors();
        this.analytics = new MicroDonationAnalytics();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createQuickDonationButtons();
        this.setupOneClickDonations();
        this.initializeWidgets();
    }

    setupEventListeners() {
        // Botones de cantidad rápida
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('micro-amount-btn')) {
                this.processQuickDonation(parseInt(e.target.dataset.amount));
            }
        });

        // Slider de cantidad
        document.getElementById('micro-amount-slider')?.addEventListener('input', (e) => {
            this.updateSliderDisplay(e.target.value);
        });

        // Botón de donación por slider
        document.getElementById('donate-slider-amount')?.addEventListener('click', () => {
            const amount = parseInt(document.getElementById('micro-amount-slider')?.value);
            this.processQuickDonation(amount);
        });

        // Donación por scroll
        this.setupScrollDonations();
    }

    createQuickDonationButtons() {
        const container = document.getElementById('quick-donations');
        if (!container) return;

        container.innerHTML = this.quickAmounts.map(amount => `
            <button class="micro-amount-btn" data-amount="${amount}">
                <span class="amount">€${amount}</span>
                <span class="impact">${this.getQuickImpact(amount)}</span>
            </button>
        `).join('');
    }

    getQuickImpact(amount) {
        const impacts = {
            1: '1 café',
            3: '1 snack',
            5: '1 comida',
            10: '1 hora dev',
            15: '1.5 horas dev',
            25: '2.5 horas dev'
        };
        return impacts[amount] || `${amount/10} horas dev`;
    }

    updateSliderDisplay(value) {
        const display = document.getElementById('slider-amount-display');
        const impact = document.getElementById('slider-impact-display');
        
        if (display) {
            display.textContent = `€${value}`;
        }
        
        if (impact) {
            impact.textContent = this.getQuickImpact(parseInt(value));
        }
    }

    async processQuickDonation(amount) {
        if (amount < this.minAmount || amount > this.maxAmount) {
            this.showError(`Cantidad debe estar entre €${this.minAmount} y €${this.maxAmount}`);
            return;
        }

        try {
            this.showProcessing(amount);
            
            // Usar método de pago guardado o pedir datos mínimos
            const paymentData = await this.getQuickPaymentData();
            
            const result = await this.processors.processPayment(
                amount,
                paymentData.method,
                paymentData.data
            );

            if (result.success) {
                this.handleSuccessfulMicroDonation(result);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Error al procesar micro-donación: ' + error.message);
        }
    }

    async getQuickPaymentData() {
        // Verificar si hay método de pago guardado
        const savedPayment = localStorage.getItem('quickPaymentMethod');
        
        if (savedPayment) {
            return JSON.parse(savedPayment);
        }

        // Solicitar datos mínimos
        return await this.requestQuickPaymentSetup();
    }

    async requestQuickPaymentSetup() {
        return new Promise((resolve) => {
            const modal = this.createQuickPaymentModal();
            document.body.appendChild(modal);
            
            const form = modal.querySelector('.quick-payment-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const data = {
                    method: form.querySelector('input[name="method"]:checked')?.value,
                    data: {
                        email: form.querySelector('#quick-email')?.value,
                        saveMethod: form.querySelector('#save-method')?.checked
                    }
                };
                
                if (data.data.saveMethod) {
                    localStorage.setItem('quickPaymentMethod', JSON.stringify(data));
                }
                
                modal.remove();
                resolve(data);
            });
        });
    }

    createQuickPaymentModal() {
        const modal = document.createElement('div');
        modal.className = 'quick-payment-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Configuración Rápida</h3>
                <form class="quick-payment-form">
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="quick-email" required>
                    </div>
                    <div class="form-group">
                        <label>Método de pago:</label>
                        <div class="payment-methods">
                            <label><input type="radio" name="method" value="card" checked> Tarjeta</label>
                            <label><input type="radio" name="method" value="paypal"> PayPal</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="save-method" checked>
                            Guardar para futuras donaciones
                        </label>
                    </div>
                    <button type="submit" class="confirm-btn">Confirmar</button>
                </form>
            </div>
        `;
        return modal;
    }

    handleSuccessfulMicroDonation(result) {
        this.analytics.recordMicroDonation(result);
        this.showSuccessAnimation(result.amount);
        this.updateMicroDonationStats();
        this.triggerCelebration();
    }

    showSuccessAnimation(amount) {
        const animation = document.createElement('div');
        animation.className = 'micro-donation-success';
        animation.innerHTML = `
            <div class="success-content">
                <div class="success-icon">🎉</div>
                <div class="success-message">¡Gracias por tu micro-donación de €${amount}!</div>
                <div class="success-impact">${this.getQuickImpact(amount)}</div>
            </div>
        `;
        
        document.body.appendChild(animation);
        
        setTimeout(() => {
            animation.classList.add('fade-out');
            setTimeout(() => animation.remove(), 500);
        }, 3000);
    }

    triggerCelebration() {
        // Animación de celebración con confeti
        this.createConfetti();
        
        // Sonido de celebración (si está habilitado)
        this.playSuccessSound();
    }

    createConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%;
                top: -10px;
                z-index: 9999;
                pointer-events: none;
                animation: confetti-fall 3s linear forwards;
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }
    }

    playSuccessSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBS2J0OzBdys');
            audio.volume = 0.1;
            audio.play().catch(() => {}); // Ignorar errores si no se puede reproducir
        } catch (error) {
            // Navegador no soporta audio
        }
    }

    setupScrollDonations() {
        let scrollDonationTimer;
        let totalScrolled = 0;
        
        window.addEventListener('scroll', () => {
            totalScrolled += Math.abs(window.scrollY - (this.lastScrollY || 0));
            this.lastScrollY = window.scrollY;
            
            // Cada 1000px de scroll, sugerir micro-donación
            if (totalScrolled > 1000) {
                clearTimeout(scrollDonationTimer);
                scrollDonationTimer = setTimeout(() => {
                    this.showScrollDonationPrompt();
                    totalScrolled = 0;
                }, 2000);
            }
        });
    }

    showScrollDonationPrompt() {
        // Evitar mostrar si ya hay una prompt activa
        if (document.querySelector('.scroll-donation-prompt')) return;
        
        const prompt = document.createElement('div');
        prompt.className = 'scroll-donation-prompt';
        prompt.innerHTML = `
            <div class="prompt-content">
                <p>¿Te está gustando el contenido?</p>
                <div class="quick-actions">
                    <button class="micro-amount-btn" data-amount="3">€3</button>
                    <button class="micro-amount-btn" data-amount="5">€5</button>
                    <button class="close-prompt">×</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(prompt);
        
        // Auto-cerrar después de 10 segundos
        setTimeout(() => {
            if (prompt.parentNode) {
                prompt.remove();
            }
        }, 10000);
        
        // Cerrar al hacer clic en X
        prompt.querySelector('.close-prompt')?.addEventListener('click', () => {
            prompt.remove();
        });
    }

    setupOneClickDonations() {
        // Configurar donaciones de un clic para usuarios recurrentes
        const oneClickBtns = document.querySelectorAll('.one-click-donate');
        
        oneClickBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount);
                this.processQuickDonation(amount);
            });
        });
    }

    initializeWidgets() {
        // Inicializar widgets de micro-donaciones en toda la página
        document.querySelectorAll('.micro-donation-widget').forEach(widget => {
            this.initializeWidget(widget);
        });
    }

    initializeWidget(widget) {
        const amount = widget.dataset.amount || 5;
        const context = widget.dataset.context || 'general';
        
        widget.innerHTML = `
            <div class="micro-widget-content">
                <p>¿Te ayudó esta ${context}?</p>
                <button class="micro-amount-btn" data-amount="${amount}">
                    Donar €${amount}
                </button>
            </div>
        `;
    }

    updateMicroDonationStats() {
        const stats = this.analytics.getMicroDonationStats();
        const container = document.getElementById('micro-donation-stats');
        
        if (container) {
            container.innerHTML = `
                <div class="stat-item">
                    <span class="stat-number">${stats.totalDonations}</span>
                    <span class="stat-label">Micro-donaciones</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">€${stats.totalAmount}</span>
                    <span class="stat-label">Total recaudado</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">€${stats.averageAmount.toFixed(2)}</span>
                    <span class="stat-label">Promedio</span>
                </div>
            `;
        }
    }

    showProcessing(amount) {
        const processing = document.createElement('div');
        processing.className = 'processing-overlay';
        processing.innerHTML = `
            <div class="processing-content">
                <div class="spinner"></div>
                <p>Procesando donación de €${amount}...</p>
            </div>
        `;
        
        document.body.appendChild(processing);
        
        setTimeout(() => processing.remove(), 5000);
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        
        document.body.appendChild(error);
        
        setTimeout(() => error.remove(), 5000);
    }
}

// Analytics para micro-donaciones
class MicroDonationAnalytics {
    constructor() {
        this.donations = this.loadDonations();
    }

    recordMicroDonation(result) {
        const donation = {
            id: result.transactionId,
            amount: result.amount,
            timestamp: new Date(),
            method: result.paymentMethod
        };
        
        this.donations.push(donation);
        this.saveDonations();
    }

    getMicroDonationStats() {
        const total = this.donations.reduce((sum, d) => sum + d.amount, 0);
        const count = this.donations.length;
        
        return {
            totalDonations: count,
            totalAmount: total,
            averageAmount: count > 0 ? total / count : 0,
            todayDonations: this.getTodayDonations(),
            thisWeekDonations: this.getThisWeekDonations()
        };
    }

    getTodayDonations() {
        const today = new Date().toDateString();
        return this.donations.filter(d => 
            new Date(d.timestamp).toDateString() === today
        ).length;
    }

    getThisWeekDonations() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return this.donations.filter(d => 
            new Date(d.timestamp) >= oneWeekAgo
        ).length;
    }

    loadDonations() {
        try {
            return JSON.parse(localStorage.getItem('microDonations') || '[]');
        } catch (error) {
            return [];
        }
    }

    saveDonations() {
        try {
            localStorage.setItem('microDonations', JSON.stringify(this.donations));
        } catch (error) {
            console.error('Error saving micro donations:', error);
        }
    }
}

// Inicializar sistema
document.addEventListener('DOMContentLoaded', () => {
    window.microDonations = new MicroDonations();
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MicroDonations, MicroDonationAnalytics };
}