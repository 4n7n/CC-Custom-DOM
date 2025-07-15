// Sistema de donaciones recurrentes
class RecurringDonations {
    constructor() {
        this.subscriptions = this.loadSubscriptions();
        this.processor = new RecurringPaymentProcessor();
        this.notifications = new NotificationSystem();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.schedulePayments();
        this.displaySubscriptions();
    }

    setupEventListeners() {
        // Formulario de suscripción
        document.getElementById('recurring-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createSubscription();
        });

        // Botones de cancelación
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('cancel-subscription')) {
                this.cancelSubscription(e.target.dataset.subscriptionId);
            }
        });

        // Botones de pausa
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('pause-subscription')) {
                this.pauseSubscription(e.target.dataset.subscriptionId);
            }
        });
    }

    async createSubscription() {
        const formData = this.getFormData();
        
        if (!this.validateSubscription(formData)) {
            return;
        }

        try {
            this.showLoading(true);
            
            const result = await this.processor.createSubscription(
                formData.amount,
                formData.frequency,
                formData.paymentMethod,
                formData
            );

            if (result.success) {
                this.handleSuccessfulSubscription(result);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Error al crear la suscripción: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    getFormData() {
        return {
            amount: parseFloat(document.getElementById('subscription-amount')?.value),
            frequency: document.getElementById('subscription-frequency')?.value,
            paymentMethod: document.querySelector('input[name="payment-method"]:checked')?.value,
            name: document.getElementById('subscriber-name')?.value,
            email: document.getElementById('subscriber-email')?.value,
            startDate: document.getElementById('start-date')?.value || new Date().toISOString().split('T')[0]
        };
    }

    validateSubscription(data) {
        const errors = [];

        if (!data.amount || data.amount < 5) {
            errors.push('Cantidad mínima para suscripción: €5');
        }

        if (!data.frequency) {
            errors.push('Frecuencia es requerida');
        }

        if (!data.name || !data.email) {
            errors.push('Nombre y email son requeridos');
        }

        if (!data.paymentMethod) {
            errors.push('Método de pago es requerido');
        }

        if (errors.length > 0) {
            this.showError(errors.join('. '));
            return false;
        }

        return true;
    }

    handleSuccessfulSubscription(result) {
        this.showSuccess('¡Suscripción creada exitosamente!');
        this.clearForm();
        this.displaySubscriptions();
        
        // Enviar email de confirmación
        this.sendSubscriptionConfirmation(result);
    }

    async cancelSubscription(subscriptionId) {
        if (!confirm('¿Estás seguro de que quieres cancelar esta suscripción?')) {
            return;
        }

        try {
            const success = this.processor.cancelSubscription(subscriptionId);
            
            if (success) {
                this.showSuccess('Suscripción cancelada exitosamente');
                this.displaySubscriptions();
                
                // Enviar email de cancelación
                this.sendCancellationNotification(subscriptionId);
            } else {
                this.showError('Error al cancelar la suscripción');
            }
        } catch (error) {
            this.showError('Error: ' + error.message);
        }
    }

    async pauseSubscription(subscriptionId) {
        try {
            const subscription = this.subscriptions.find(sub => sub.id === subscriptionId);
            if (!subscription) {
                throw new Error('Suscripción no encontrada');
            }

            subscription.status = subscription.status === 'paused' ? 'active' : 'paused';
            this.saveSubscriptions();
            
            const action = subscription.status === 'paused' ? 'pausada' : 'reactivada';
            this.showSuccess(`Suscripción ${action} exitosamente`);
            this.displaySubscriptions();
            
        } catch (error) {
            this.showError('Error: ' + error.message);
        }
    }

    displaySubscriptions() {
        const container = document.getElementById('subscriptions-list');
        if (!container) return;

        const activeSubscriptions = this.processor.getActiveSubscriptions();
        
        if (activeSubscriptions.length === 0) {
            container.innerHTML = '<p class="no-subscriptions">No tienes suscripciones activas</p>';
            return;
        }

        container.innerHTML = activeSubscriptions.map(sub => `
            <div class="subscription-card" data-id="${sub.id}">
                <div class="subscription-header">
                    <h4>€${sub.amount} ${this.getFrequencyText(sub.frequency)}</h4>
                    <span class="subscription-status ${sub.status}">${sub.status}</span>
                </div>
                <div class="subscription-details">
                    <p><strong>Método:</strong> ${this.getPaymentMethodText(sub.paymentMethod)}</p>
                    <p><strong>Próximo pago:</strong> ${this.formatDate(sub.nextPayment)}</p>
                    <p><strong>Creada:</strong> ${this.formatDate(sub.createdAt)}</p>
                </div>
                <div class="subscription-actions">
                    <button class="pause-subscription" data-subscription-id="${sub.id}">
                        ${sub.status === 'paused' ? 'Reactivar' : 'Pausar'}
                    </button>
                    <button class="cancel-subscription" data-subscription-id="${sub.id}">
                        Cancelar
                    </button>
                </div>
            </div>
        `).join('');
    }

    getFrequencyText(frequency) {
        const frequencies = {
            'monthly': '/mes',
            'yearly': '/año',
            'weekly': '/semana'
        };
        return frequencies[frequency] || '/mes';
    }

    getPaymentMethodText(method) {
        const methods = {
            'card': 'Tarjeta',
            'paypal': 'PayPal',
            'crypto': 'Criptomoneda'
        };
        return methods[method] || method;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    schedulePayments() {
        // Programar procesamiento de pagos recurrentes
        setInterval(() => {
            this.processScheduledPayments();
        }, 24 * 60 * 60 * 1000); // Cada 24 horas
        
        // Procesar inmediatamente al cargar
        this.processScheduledPayments();
    }

    async processScheduledPayments() {
        try {
            const results = await this.processor.processRecurringPayments();
            
            results.forEach(result => {
                if (result.success) {
                    this.notifications.sendPaymentSuccess(result.subscriptionId);
                } else {
                    this.notifications.sendPaymentFailure(result.subscriptionId, result.error);
                }
            });
            
            if (results.length > 0) {
                this.displaySubscriptions();
            }
        } catch (error) {
            console.error('Error processing scheduled payments:', error);
        }
    }

    loadSubscriptions() {
        try {
            return JSON.parse(localStorage.getItem('subscriptions') || '[]');
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            return [];
        }
    }

    saveSubscriptions() {
        try {
            localStorage.setItem('subscriptions', JSON.stringify(this.subscriptions));
        } catch (error) {
            console.error('Error saving subscriptions:', error);
        }
    }

    clearForm() {
        document.getElementById('recurring-form')?.reset();
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    showLoading(show) {
        const submitBtn = document.querySelector('.submit-subscription');
        if (submitBtn) {
            submitBtn.disabled = show;
            submitBtn.textContent = show ? 'Procesando...' : 'Crear Suscripción';
        }
    }

    sendSubscriptionConfirmation(result) {
        // Implementar envío de email de confirmación
        console.log('Sending subscription confirmation:', result);
    }

    sendCancellationNotification(subscriptionId) {
        // Implementar envío de email de cancelación
        console.log('Sending cancellation notification:', subscriptionId);
    }
}

// Sistema de notificaciones para suscripciones
class NotificationSystem {
    constructor() {
        this.notifications = this.loadNotifications();
    }

    sendPaymentSuccess(subscriptionId) {
        const notification = {
            id: Date.now(),
            type: 'payment_success',
            subscriptionId: subscriptionId,
            message: 'Pago procesado exitosamente',
            timestamp: new Date(),
            read: false
        };
        
        this.notifications.push(notification);
        this.saveNotifications();
        this.displayNotification(notification);
    }

    sendPaymentFailure(subscriptionId, error) {
        const notification = {
            id: Date.now(),
            type: 'payment_failure',
            subscriptionId: subscriptionId,
            message: `Error en el pago: ${error}`,
            timestamp: new Date(),
            read: false
        };
        
        this.notifications.push(notification);
        this.saveNotifications();
        this.displayNotification(notification);
    }

    displayNotification(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification notification-${notification.type}`;
        notificationEl.innerHTML = `
            <div class="notification-content">
                <p>${notification.message}</p>
                <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(notificationEl);
        
        setTimeout(() => {
            notificationEl.remove();
        }, 10000);
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    loadNotifications() {
        try {
            return JSON.parse(localStorage.getItem('notifications') || '[]');
        } catch (error) {
            return [];
        }
    }

    saveNotifications() {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Error saving notifications:', error);
        }
    }
}

// Inicializar sistema
document.addEventListener('DOMContentLoaded', () => {
    window.recurringDonations = new RecurringDonations();
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RecurringDonations, NotificationSystem };
}