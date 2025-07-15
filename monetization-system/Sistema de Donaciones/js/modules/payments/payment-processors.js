// Procesadores de pago múltiples
class PaymentProcessors {
    constructor() {
        this.processors = {
            card: new CardProcessor(),
            paypal: new PayPalProcessor(),
            crypto: new CryptoProcessor()
        };
        this.testMode = true; // Cambiar a false en producción
    }

    async processPayment(amount, method, data) {
        try {
            const processor = this.processors[method];
            if (!processor) {
                throw new Error(`Método de pago no soportado: ${method}`);
            }

            // Validar cantidad
            if (amount < 1) {
                throw new Error('Cantidad mínima es €1');
            }

            // Procesar pago
            const result = await processor.process(amount, data);
            
            // Registrar transacción
            this.logTransaction(amount, method, result);
            
            return result;
        } catch (error) {
            console.error('Payment processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    logTransaction(amount, method, result) {
        const transaction = {
            amount,
            method,
            result,
            timestamp: new Date(),
            testMode: this.testMode
        };
        
        // Guardar en localStorage para desarrollo
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }
}

// Procesador de tarjetas
class CardProcessor {
    constructor() {
        this.apiKey = 'test_key_123'; // Usar variable de entorno
    }

    async process(amount, data) {
        // Simulación de procesamiento de tarjeta
        await this.delay(2000);
        
        const cardNumber = data.cardNumber || '4111111111111111';
        
        // Validar tarjeta
        if (!this.validateCard(cardNumber)) {
            throw new Error('Número de tarjeta inválido');
        }

        // Simular procesamiento
        if (Math.random() > 0.95) { // 5% de fallos
            throw new Error('Transacción rechazada por el banco');
        }

        return {
            success: true,
            transactionId: this.generateTransactionId(),
            paymentMethod: 'card',
            amount: amount,
            currency: 'EUR',
            last4: cardNumber.slice(-4),
            timestamp: new Date()
        };
    }

    validateCard(cardNumber) {
        // Validación básica Luhn
        const num = cardNumber.replace(/\s/g, '');
        if (!/^\d{13,19}$/.test(num)) return false;
        
        let sum = 0;
        let isEven = false;
        
        for (let i = num.length - 1; i >= 0; i--) {
            let digit = parseInt(num[i]);
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }

    generateTransactionId() {
        return 'txn_' + Math.random().toString(36).substr(2, 9);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Procesador PayPal
class PayPalProcessor {
    constructor() {
        this.clientId = 'test_paypal_client_id';
        this.sandbox = true;
    }

    async process(amount, data) {
        await this.delay(1500);
        
        // Simulación de PayPal
        if (Math.random() > 0.98) { // 2% de fallos
            throw new Error('Error de PayPal: Cuenta temporalmente suspendida');
        }

        return {
            success: true,
            transactionId: 'pp_' + Math.random().toString(36).substr(2, 9),
            paymentMethod: 'paypal',
            amount: amount,
            currency: 'EUR',
            paypalEmail: data.email,
            timestamp: new Date()
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Procesador de criptomonedas
class CryptoProcessor {
    constructor() {
        this.supportedCrypto = ['BTC', 'ETH', 'LTC'];
        this.exchangeRates = {
            BTC: 45000,
            ETH: 3000,
            LTC: 150
        };
    }

    async process(amount, data) {
        await this.delay(3000);
        
        const cryptoType = data.cryptoType || 'BTC';
        
        if (!this.supportedCrypto.includes(cryptoType)) {
            throw new Error(`Criptomoneda no soportada: ${cryptoType}`);
        }

        // Calcular cantidad en crypto
        const cryptoAmount = amount / this.exchangeRates[cryptoType];
        
        // Simular procesamiento blockchain
        if (Math.random() > 0.97) { // 3% de fallos
            throw new Error('Transacción blockchain fallida');
        }

        return {
            success: true,
            transactionId: 'crypto_' + Math.random().toString(36).substr(2, 9),
            paymentMethod: 'crypto',
            amount: amount,
            currency: 'EUR',
            cryptoType: cryptoType,
            cryptoAmount: cryptoAmount,
            walletAddress: this.generateWalletAddress(),
            timestamp: new Date()
        };
    }

    generateWalletAddress() {
        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < 34; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Procesador de pagos recurrentes
class RecurringPaymentProcessor {
    constructor() {
        this.subscriptions = JSON.parse(localStorage.getItem('subscriptions') || '[]');
    }

    async createSubscription(amount, frequency, paymentMethod, data) {
        const subscription = {
            id: 'sub_' + Math.random().toString(36).substr(2, 9),
            amount: amount,
            frequency: frequency, // 'monthly', 'yearly'
            paymentMethod: paymentMethod,
            donor: data,
            status: 'active',
            createdAt: new Date(),
            nextPayment: this.calculateNextPayment(frequency)
        };

        this.subscriptions.push(subscription);
        localStorage.setItem('subscriptions', JSON.stringify(this.subscriptions));

        return {
            success: true,
            subscriptionId: subscription.id,
            nextPayment: subscription.nextPayment
        };
    }

    calculateNextPayment(frequency) {
        const now = new Date();
        switch (frequency) {
            case 'monthly':
                return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            case 'yearly':
                return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            default:
                return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días
        }
    }

    async processRecurringPayments() {
        const now = new Date();
        const duePayments = this.subscriptions.filter(sub => 
            sub.status === 'active' && new Date(sub.nextPayment) <= now
        );

        const results = [];
        
        for (const subscription of duePayments) {
            try {
                const processor = new PaymentProcessors();
                const result = await processor.processPayment(
                    subscription.amount,
                    subscription.paymentMethod,
                    subscription.donor
                );

                if (result.success) {
                    subscription.nextPayment = this.calculateNextPayment(subscription.frequency);
                    results.push({ subscriptionId: subscription.id, success: true });
                } else {
                    subscription.status = 'failed';
                    results.push({ subscriptionId: subscription.id, success: false, error: result.error });
                }
            } catch (error) {
                subscription.status = 'failed';
                results.push({ subscriptionId: subscription.id, success: false, error: error.message });
            }
        }

        localStorage.setItem('subscriptions', JSON.stringify(this.subscriptions));
        return results;
    }

    getActiveSubscriptions() {
        return this.subscriptions.filter(sub => sub.status === 'active');
    }

    cancelSubscription(subscriptionId) {
        const subscription = this.subscriptions.find(sub => sub.id === subscriptionId);
        if (subscription) {
            subscription.status = 'cancelled';
            localStorage.setItem('subscriptions', JSON.stringify(this.subscriptions));
            return true;
        }
        return false;
    }
}

// Exportar clases
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PaymentProcessors,
        CardProcessor,
        PayPalProcessor,
        CryptoProcessor,
        RecurringPaymentProcessor
    };
}