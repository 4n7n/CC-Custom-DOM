/**
 * Clase principal para manejar formularios de pago
 * Soporta tanto patrocinios corporativos como donaciones individuales
 */
class PaymentForm {
    constructor(options = {}) {
        this.container = options.container || document.getElementById('payment-form-container');
        this.config = {
            apiEndpoint: options.apiEndpoint || '/api/payments',
            currency: options.currency || 'USD',
            locale: options.locale || 'en-US',
            theme: options.theme || 'default',
            validation: options.validation !== false,
            analytics: options.analytics !== false,
            ...options
        };
        
        // Estado del formulario
        this.state = {
            currentStep: 1,
            totalSteps: 4,
            formData: {},
            selectedTier: null,
            selectedAmount: null,
            paymentMethod: null,
            isProcessing: false,
            errors: {},
            validationRules: this.initValidationRules()
        };
        
        // Elementos DOM cacheados
        this.elements = {};
        
        // Event listeners
        this.boundEvents = new Map();
        
        // Pricing tiers data
        this.pricingTiers = null;
        
        this.init();
    }
    
    /**
     * Inicialización del componente
     */
    async init() {
        try {
            await this.loadPricingTiers();
            this.createFormStructure();
            this.bindEvents();
            this.initializeValidation();
            this.setupAnalytics();
            
            // Trigger ready event
            this.dispatchEvent('paymentForm:ready', { instance: this });
            
        } catch (error) {
            console.error('Error initializing PaymentForm:', error);
            this.showError('Failed to initialize payment form. Please refresh and try again.');
        }
    }
    
    /**
     * Carga los tiers de pricing desde el JSON
     */
    async loadPricingTiers() {
        try {
            const response = await fetch('/content/monetization/pricing-tiers.json');
            if (!response.ok) throw new Error('Failed to load pricing tiers');
            this.pricingTiers = await response.json();
        } catch (error) {
            console.error('Error loading pricing tiers:', error);
            // Fallback con datos básicos
            this.pricingTiers = this.getFallbackPricingData();
        }
    }
    
    /**
     * Crea la estructura HTML del formulario
     */
    createFormStructure() {
        if (!this.container) {
            console.error('Payment form container not found');
            return;
        }
        
        this.container.innerHTML = `
            <div class="payment-form" data-theme="${this.config.theme}">
                <div class="payment-form__header">
                    <div class="payment-form__progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 25%"></div>
                        </div>
                        <div class="progress-steps">
                            <span class="step active" data-step="1">Type</span>
                            <span class="step" data-step="2">Amount</span>
                            <span class="step" data-step="3">Details</span>
                            <span class="step" data-step="4">Payment</span>
                        </div>
                    </div>
                </div>
                
                <div class="payment-form__body">
                    <form id="payment-form" novalidate>
                        <!-- Step 1: Payment Type Selection -->
                        <div class="form-step active" data-step="1">
                            <h2 class="step-title">Choose Your Support Type</h2>
                            <div class="payment-type-selector">
                                <div class="payment-type" data-type="sponsorship">
                                    <div class="payment-type__icon">🏢</div>
                                    <h3>Corporate Sponsorship</h3>
                                    <p>Partner with us to create lasting impact while showcasing your brand values.</p>
                                    <ul>
                                        <li>Brand integration opportunities</li>
                                        <li>Detailed analytics and reporting</li>
                                        <li>Custom content creation</li>
                                        <li>Networking and events</li>
                                    </ul>
                                </div>
                                <div class="payment-type" data-type="donation">
                                    <div class="payment-type__icon">❤️</div>
                                    <h3>Community Donation</h3>
                                    <p>Support communities directly with flexible donation options.</p>
                                    <ul>
                                        <li>One-time or recurring donations</li>
                                        <li>Direct community impact</li>
                                        <li>Tax-deductible contributions</li>
                                        <li>Community recognition</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 2: Amount/Tier Selection -->
                        <div class="form-step" data-step="2">
                            <h2 class="step-title">Select Your Contribution</h2>
                            <div class="tier-selector" id="tier-selector">
                                <!-- Dynamically populated based on type selection -->
                            </div>
                            <div class="custom-amount-section" style="display: none;">
                                <label for="custom-amount">Custom Amount</label>
                                <div class="amount-input-wrapper">
                                    <span class="currency-symbol">$</span>
                                    <input type="number" id="custom-amount" name="customAmount" 
                                           placeholder="Enter amount" min="1" step="0.01">
                                </div>
                                <div class="amount-suggestions">
                                    <button type="button" class="amount-btn" data-amount="25">$25</button>
                                    <button type="button" class="amount-btn" data-amount="50">$50</button>
                                    <button type="button" class="amount-btn" data-amount="100">$100</button>
                                    <button type="button" class="amount-btn" data-amount="250">$250</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 3: Contact Details -->
                        <div class="form-step" data-step="3">
                            <h2 class="step-title">Your Information</h2>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="contact-type">Contact Type *</label>
                                    <select id="contact-type" name="contactType" required>
                                        <option value="">Select type</option>
                                        <option value="individual">Individual</option>
                                        <option value="family">Family</option>
                                        <option value="organization">Organization</option>
                                        <option value="corporation">Corporation</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="full-name">Full Name / Organization *</label>
                                    <input type="text" id="full-name" name="fullName" required 
                                           placeholder="Enter your name or organization">
                                </div>
                                
                                <div class="form-group">
                                    <label for="email">Email Address *</label>
                                    <input type="email" id="email" name="email" required 
                                           placeholder="your@email.com">
                                </div>
                                
                                <div class="form-group">
                                    <label for="phone">Phone Number</label>
                                    <input type="tel" id="phone" name="phone" 
                                           placeholder="+1 (555) 123-4567">
                                </div>
                                
                                <div class="form-group full-width">
                                    <label for="organization">Organization / Company</label>
                                    <input type="text" id="organization" name="organization" 
                                           placeholder="Your organization (if applicable)">
                                </div>
                                
                                <div class="form-group full-width">
                                    <label for="address">Address</label>
                                    <textarea id="address" name="address" rows="3" 
                                              placeholder="Street address, city, state, zip code"></textarea>
                                </div>
                                
                                <div class="form-group full-width">
                                    <label for="message">Message (Optional)</label>
                                    <textarea id="message" name="message" rows="4" 
                                              placeholder="Share why this cause matters to you..."></textarea>
                                </div>
                                
                                <div class="form-group full-width">
                                    <div class="checkbox-group">
                                        <input type="checkbox" id="newsletter" name="newsletter">
                                        <label for="newsletter">Subscribe to updates about community impact</label>
                                    </div>
                                    <div class="checkbox-group">
                                        <input type="checkbox" id="public-recognition" name="publicRecognition">
                                        <label for="public-recognition">Allow public recognition of my contribution</label>
                                    </div>
                                    <div class="checkbox-group">
                                        <input type="checkbox" id="tax-receipt" name="taxReceipt">
                                        <label for="tax-receipt">I would like a tax-deductible receipt</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 4: Payment Method -->
                        <div class="form-step" data-step="4">
                            <h2 class="step-title">Payment Information</h2>
                            
                            <div class="payment-summary">
                                <h3>Payment Summary</h3>
                                <div class="summary-item">
                                    <span class="label">Type:</span>
                                    <span class="value" id="summary-type">-</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Amount:</span>
                                    <span class="value" id="summary-amount">$0.00</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Processing Fee:</span>
                                    <span class="value" id="summary-fee">$0.00</span>
                                </div>
                                <div class="summary-total">
                                    <span class="label">Total:</span>
                                    <span class="value" id="summary-total">$0.00</span>
                                </div>
                            </div>
                            
                            <div class="payment-methods">
                                <h3>Payment Method</h3>
                                <div class="payment-method-tabs">
                                    <button type="button" class="payment-tab active" data-method="credit-card">
                                        💳 Credit Card
                                    </button>
                                    <button type="button" class="payment-tab" data-method="bank-transfer">
                                        🏦 Bank Transfer
                                    </button>
                                    <button type="button" class="payment-tab" data-method="paypal">
                                        💰 PayPal
                                    </button>
                                    <button type="button" class="payment-tab" data-method="crypto">
                                        ₿ Cryptocurrency
                                    </button>
                                </div>
                                
                                <!-- Credit Card Form -->
                                <div class="payment-form-section active" data-method="credit-card">
                                    <div class="form-grid">
                                        <div class="form-group full-width">
                                            <label for="card-number">Card Number *</label>
                                            <input type="text" id="card-number" name="cardNumber" 
                                                   placeholder="1234 5678 9012 3456" required
                                                   data-mask="card" autocomplete="cc-number">
                                            <div class="card-icons">
                                                <span class="card-icon visa">💳</span>
                                                <span class="card-icon mastercard">💳</span>
                                                <span class="card-icon amex">💳</span>
                                            </div>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="card-expiry">Expiry Date *</label>
                                            <input type="text" id="card-expiry" name="cardExpiry" 
                                                   placeholder="MM/YY" required
                                                   data-mask="expiry" autocomplete="cc-exp">
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="card-cvc">CVC *</label>
                                            <input type="text" id="card-cvc" name="cardCvc" 
                                                   placeholder="123" required
                                                   data-mask="cvc" autocomplete="cc-csc">
                                        </div>
                                        
                                        <div class="form-group full-width">
                                            <label for="card-name">Name on Card *</label>
                                            <input type="text" id="card-name" name="cardName" 
                                                   placeholder="John Doe" required
                                                   autocomplete="cc-name">
                                        </div>
                                        
                                        <div class="form-group full-width">
                                            <div class="checkbox-group">
                                                <input type="checkbox" id="save-card" name="saveCard">
                                                <label for="save-card">Save this card for future donations</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Bank Transfer Form -->
                                <div class="payment-form-section" data-method="bank-transfer">
                                    <div class="bank-transfer-info">
                                        <p>Bank transfer details will be provided after you submit this form. 
                                           Processing typically takes 3-5 business days.</p>
                                        <div class="form-group">
                                            <label for="bank-country">Your Bank Country</label>
                                            <select id="bank-country" name="bankCountry">
                                                <option value="">Select country</option>
                                                <option value="US">United States</option>
                                                <option value="CA">Canada</option>
                                                <option value="GB">United Kingdom</option>
                                                <option value="AU">Australia</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- PayPal Form -->
                                <div class="payment-form-section" data-method="paypal">
                                    <div class="paypal-info">
                                        <p>You will be redirected to PayPal to complete your payment securely.</p>
                                        <div class="paypal-benefits">
                                            <ul>
                                                <li>✓ Secure payment processing</li>
                                                <li>✓ Buyer protection</li>
                                                <li>✓ Instant confirmation</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Cryptocurrency Form -->
                                <div class="payment-form-section" data-method="crypto">
                                    <div class="crypto-selector">
                                        <label>Select Cryptocurrency</label>
                                        <div class="crypto-options">
                                            <button type="button" class="crypto-option" data-crypto="bitcoin">
                                                ₿ Bitcoin
                                            </button>
                                            <button type="button" class="crypto-option" data-crypto="ethereum">
                                                Ξ Ethereum
                                            </button>
                                            <button type="button" class="crypto-option" data-crypto="usdc">
                                                💰 USDC
                                            </button>
                                        </div>
                                        <p class="crypto-note">Cryptocurrency payments are processed through our secure partner. 
                                           Current exchange rates will be applied at the time of payment.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="recurring-options" style="display: none;">
                                <h3>Recurring Donation</h3>
                                <div class="recurring-selector">
                                    <label>
                                        <input type="radio" name="recurring" value="none" checked>
                                        One-time donation
                                    </label>
                                    <label>
                                        <input type="radio" name="recurring" value="monthly">
                                        Monthly (save 5%)
                                    </label>
                                    <label>
                                        <input type="radio" name="recurring" value="quarterly">
                                        Quarterly (save 8%)
                                    </label>
                                    <label>
                                        <input type="radio" name="recurring" value="annually">
                                        Annually (save 15%)
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Form Controls -->
                        <div class="form-controls">
                            <button type="button" class="btn btn-secondary" id="prev-step" style="display: none;">
                                ← Previous
                            </button>
                            <button type="button" class="btn btn-primary" id="next-step">
                                Next →
                            </button>
                            <button type="submit" class="btn btn-success" id="submit-payment" style="display: none;">
                                <span class="btn-text">Complete Payment</span>
                                <span class="btn-loading" style="display: none;">
                                    <span class="spinner"></span> Processing...
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Security Info -->
                <div class="payment-form__footer">
                    <div class="security-badges">
                        <span class="security-badge">🔒 SSL Encrypted</span>
                        <span class="security-badge">🛡️ PCI Compliant</span>
                        <span class="security-badge">✓ Secure Processing</span>
                    </div>
                    <p class="security-text">
                        Your payment information is encrypted and secure. We never store your complete card details.
                    </p>
                </div>
            </div>
        `;
        
        this.cacheElements();
    }
    
    /**
     * Cachea elementos DOM frecuentemente utilizados
     */
    cacheElements() {
        this.elements = {
            form: this.container.querySelector('#payment-form'),
            steps: this.container.querySelectorAll('.form-step'),
            progressFill: this.container.querySelector('.progress-fill'),
            progressSteps: this.container.querySelectorAll('.progress-steps .step'),
            paymentTypes: this.container.querySelectorAll('.payment-type'),
            tierSelector: this.container.querySelector('#tier-selector'),
            customAmountSection: this.container.querySelector('.custom-amount-section'),
            customAmountInput: this.container.querySelector('#custom-amount'),
            amountButtons: this.container.querySelectorAll('.amount-btn'),
            paymentTabs: this.container.querySelectorAll('.payment-tab'),
            paymentSections: this.container.querySelectorAll('.payment-form-section'),
            prevButton: this.container.querySelector('#prev-step'),
            nextButton: this.container.querySelector('#next-step'),
            submitButton: this.container.querySelector('#submit-payment'),
            summaryElements: {
                type: this.container.querySelector('#summary-type'),
                amount: this.container.querySelector('#summary-amount'),
                fee: this.container.querySelector('#summary-fee'),
                total: this.container.querySelector('#summary-total')
            }
        };
    }
    
    /**
     * Vincula event listeners
     */
    bindEvents() {
        // Navigation events
        this.addEventDelegate(this.elements.nextButton, 'click', () => this.nextStep());
        this.addEventDelegate(this.elements.prevButton, 'click', () => this.prevStep());
        this.addEventDelegate(this.elements.form, 'submit', (e) => this.handleSubmit(e));
        
        // Payment type selection
        this.addEventDelegate(this.elements.paymentTypes, 'click', (e) => {
            const type = e.currentTarget.dataset.type;
            this.selectPaymentType(type);
        });
        
        // Amount selection
        this.addEventDelegate(this.elements.amountButtons, 'click', (e) => {
            const amount = parseFloat(e.currentTarget.dataset.amount);
            this.selectAmount(amount);
        });
        
        this.addEventDelegate(this.elements.customAmountInput, 'input', (e) => {
            const amount = parseFloat(e.target.value) || 0;
            this.selectAmount(amount, true);
        });
        
        // Payment method tabs
        this.addEventDelegate(this.elements.paymentTabs, 'click', (e) => {
            const method = e.currentTarget.dataset.method;
            this.selectPaymentMethod(method);
        });
        
        // Form validation
        this.addEventDelegate(this.elements.form, 'input', (e) => this.validateField(e.target));
        this.addEventDelegate(this.elements.form, 'change', (e) => this.validateField(e.target));
        
        // Card formatting
        this.setupCardFormatting();
        
        // Real-time amount calculation
        this.addEventDelegate(this.container, 'input', (e) => {
            if (e.target.name === 'customAmount') {
                this.updatePaymentSummary();
            }
        });
    }
    
    /**
     * Helper para agregar event listeners con cleanup
     */
    addEventDelegate(elements, event, handler) {
        if (!elements) return;
        
        const elementsArray = elements.length ? Array.from(elements) : [elements];
        
        elementsArray.forEach(element => {
            element.addEventListener(event, handler);
            
            // Store for cleanup
            if (!this.boundEvents.has(element)) {
                this.boundEvents.set(element, []);
            }
            this.boundEvents.get(element).push({ event, handler });
        });
    }
    
    /**
     * Configuración de formato de tarjetas de crédito
     */
    setupCardFormatting() {
        const cardNumber = this.container.querySelector('#card-number');
        const cardExpiry = this.container.querySelector('#card-expiry');
        const cardCvc = this.container.querySelector('#card-cvc');
        
        if (cardNumber) {
            cardNumber.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '');
                let formattedValue = '';
                
                for (let i = 0; i < value.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                        formattedValue += ' ';
                    }
                    formattedValue += value[i];
                }
                
                e.target.value = formattedValue;
                this.detectCardType(value);
            });
        }
        
        if (cardExpiry) {
            cardExpiry.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });
        }
        
        if (cardCvc) {
            cardCvc.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
            });
        }
    }
    
    /**
     * Detecta el tipo de tarjeta de crédito
     */
    detectCardType(number) {
        const cardIcons = this.container.querySelectorAll('.card-icon');
        cardIcons.forEach(icon => icon.classList.remove('active'));
        
        if (number.match(/^4/)) {
            this.container.querySelector('.card-icon.visa')?.classList.add('active');
        } else if (number.match(/^5[1-5]/) || number.match(/^2[2-7]/)) {
            this.container.querySelector('.card-icon.mastercard')?.classList.add('active');
        } else if (number.match(/^3[47]/)) {
            this.container.querySelector('.card-icon.amex')?.classList.add('active');
        }
    }
    
    /**
     * Selecciona el tipo de pago (sponsorship o donation)
     */
    selectPaymentType(type) {
        this.state.formData.paymentType = type;
        
        // Update UI
        this.elements.paymentTypes.forEach(el => el.classList.remove('selected'));
        this.container.querySelector(`[data-type="${type}"]`).classList.add('selected');
        
        // Populate tier selector
        this.populateTierSelector(type);
        
        // Update next button state
        this.elements.nextButton.disabled = false;
        
        this.trackEvent('payment_type_selected', { type });
    }
    
    /**
     * Popula el selector de tiers basado en el tipo de pago
     */
    populateTierSelector(type) {
        if (!this.pricingTiers) return;
        
        const tierContainer = this.elements.tierSelector;
        tierContainer.innerHTML = '';
        
        if (type === 'sponsorship') {
            const sponsorshipTiers = this.pricingTiers.sponsorshipTiers;
            
            Object.values(sponsorshipTiers).forEach(tier => {
                const tierCard = this.createTierCard(tier, 'sponsorship');
                tierContainer.appendChild(tierCard);
            });
            
            this.elements.customAmountSection.style.display = 'none';
            
        } else if (type === 'donation') {
            const communityTiers = this.pricingTiers.communityTiers;
            
            Object.values(communityTiers).forEach(tier => {
                const tierCard = this.createTierCard(tier, 'donation');
                tierContainer.appendChild(tierCard);
            });
            
            // Show custom amount for donations
            this.elements.customAmountSection.style.display = 'block';
        }
    }
    
    /**
     * Crea una tarjeta de tier
     */
    createTierCard(tier, type) {
        const card = document.createElement('div');
        card.className = 'tier-card';
        card.dataset.tierId = tier.id;
        card.dataset.tierType = type;
        
        const amountText = type === 'sponsorship' 
            ? `$${tier.minAmount.toLocaleString()}${tier.maxAmount ? ` - $${tier.maxAmount.toLocaleString()}` : '+'}`
            : `$${tier.minAmount}${tier.maxAmount ? ` - $${tier.maxAmount}` : '+'}`;
        
        card.innerHTML = `
            <div class="tier-header">
                <div class="tier-emoji">${tier.emoji}</div>
                <h3 class="tier-name">${tier.displayName}</h3>
                <div class="tier-amount">${amountText}</div>
                <p class="tier-tagline">${tier.tagline}</p>
            </div>
            <div class="tier-benefits">
                <ul>
                    ${tier.benefits.slice(0, 4).map(benefit => `<li>${benefit}</li>`).join('')}
                    ${tier.benefits.length > 4 ? `<li class="more-benefits">+${tier.benefits.length - 4} more benefits</li>` : ''}
                </ul>
            </div>
            <div class="tier-footer">
                <button type="button" class="btn btn-outline tier-select-btn">
                    Select ${tier.name}
                </button>
            </div>
        `;
        
        // Add click handler
        card.addEventListener('click', () => {
            this.selectTier(tier, type);
        });
        
        return card;
    }
    
    /**
     * Selecciona un tier específico
     */
    selectTier(tier, type) {
        this.state.selectedTier = tier;
        this.state.formData.tier = tier.id;
        this.state.formData.tierType = type;
        
        // Update UI
        this.container.querySelectorAll('.tier-card').forEach(card => {
            card.classList.remove('selected');
        });
        this.container.querySelector(`[data-tier-id="${tier.id}"]`).classList.add('selected');
        
        // Set amount
        if (type === 'sponsorship') {
            this.selectAmount(tier.minAmount);
        }
        
        // Show recurring options for donations
        const recurringOptions = this.container.querySelector('.recurring-options');
        if (type === 'donation' && recurringOptions) {
            recurringOptions.style.display = 'block';
        }
        
        this.trackEvent('tier_selected', { tier: tier.id, type });
    }
    
    /**
     * Selecciona una cantidad específica
     */
    selectAmount(amount, isCustom = false) {
        this.state.selectedAmount = amount;
        this.state.formData.amount = amount;
        
        // Update UI
        this.elements.amountButtons.forEach(btn => btn.classList.remove('selected'));
        
        if (!isCustom) {
            const matchingBtn = this.container.querySelector(`[data-amount="${amount}"]`);
            if (matchingBtn) {
                matchingBtn.classList.add('selected');
                this.elements.customAmountInput.value = '';
            }
        } else {
            this.elements.customAmountInput.value = amount;
        }
        
        this.updatePaymentSummary();
        this.trackEvent('amount_selected', { amount, isCustom });
    }
    
    /**
     * Selecciona método de pago
     */
    selectPaymentMethod(method) {
        this.state.paymentMethod = method;
        this.state.formData.paymentMethod = method;
        
        // Update tabs
        this.elements.paymentTabs.forEach(tab => tab.classList.remove('active'));
        this.container.querySelector(`[data-method="${method}"]`).classList.add('active');
        
        // Update payment sections
        this.elements.paymentSections.forEach(section => section.classList.remove('active'));
        this.container.querySelector(`.payment-form-section[data-method="${method}"]`).classList.add('active');
        
        this.updatePaymentSummary();
        this.trackEvent('payment_method_selected', { method });
    }
    
    /**
     * Actualiza el resumen de pago
     */
    updatePaymentSummary() {
        if (!this.state.selectedAmount) return;
        
        const amount = this.state.selectedAmount;
        const paymentMethod = this.state.paymentMethod || 'credit-card';
        
        // Calculate processing fee
        let feePercent = 0;
        switch (paymentMethod) {
            case 'credit-card':
                feePercent = 2.9;
                break;
            case 'bank-transfer':
                feePercent = 0.5;
                break;
            case 'paypal':
                feePercent = 3.4;
                break;
            case 'crypto':
                feePercent = 1.0;
                break;
        }
        
        const fee = amount * (feePercent / 100);
        const total = amount + fee;
        
        // Update summary
        if (this.elements.summaryElements.type) {
            const typeText = this.state.formData.paymentType === 'sponsorship' 
                ? (this.state.selectedTier ? this.state.selectedTier.displayName : 'Corporate Sponsorship')
                : 'Community Donation';
            this.elements.summaryElements.type.textContent = typeText;
        }
        
        if (this.elements.summaryElements.amount) {
            this.elements.summaryElements.amount.textContent = this.formatCurrency(amount);
        }
        
        if (this.elements.summaryElements.fee) {
            this.elements.summaryElements.fee.textContent = this.formatCurrency(fee);
        }
        
        if (this.elements.summaryElements.total) {
            this.elements.summaryElements.total.textContent = this.formatCurrency(total);
        }
        
        this.state.formData.processingFee = fee;
        this.state.formData.totalAmount = total;
    }
    
    /**
     * Formatea cantidad como moneda
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat(this.config.locale, {
            style: 'currency',
            currency: this.config.currency
        }).format(amount);
    }
    
    /**
     * Navega al siguiente paso
     */
    nextStep() {
        if (!this.validateCurrentStep()) {
            this.showValidationErrors();
            return;
        }
        
        if (this.state.currentStep < this.state.totalSteps) {
            this.state.currentStep++;
            this.updateStepDisplay();
            this.trackEvent('step_completed', { step: this.state.currentStep - 1 });
        }
    }
    
    /**
     * Navega al paso anterior
     */
    prevStep() {
        if (this.state.currentStep > 1) {
            this.state.currentStep--;
            this.updateStepDisplay();
        }
    }
    
    /**
     * Actualiza la visualización del paso actual
     */
    updateStepDisplay() {
        // Update steps
        this.elements.steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.state.currentStep);
        });
        
        // Update progress bar
        const progress = (this.state.currentStep / this.state.totalSteps) * 100;
        this.elements.progressFill.style.width = `${progress}%`;
        
        // Update progress steps
        this.elements.progressSteps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 <= this.state.currentStep);
            step.classList.toggle('completed', index + 1 < this.state.currentStep);
        });
        
        // Update button visibility
        this.elements.prevButton.style.display = this.state.currentStep > 1 ? 'inline-block' : 'none';
        this.elements.nextButton.style.display = this.state.currentStep < this.state.totalSteps ? 'inline-block' : 'none';
        this.elements.submitButton.style.display = this.state.currentStep === this.state.totalSteps ? 'inline-block' : 'none';
        
        // Scroll to top
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    /**
     * Valida el paso actual
     */
    validateCurrentStep() {
        switch (this.state.currentStep) {
            case 1:
                return this.state.formData.paymentType;
            case 2:
                return this.state.selectedAmount && this.state.selectedAmount > 0;
            case 3:
                return this.validateContactInfo();
            case 4:
                return this.validatePaymentInfo();
            default:
                return true;
        }
    }
    
    /**
     * Valida información de contacto
     */
    validateContactInfo() {
        const required = ['contactType', 'fullName', 'email'];
        const errors = {};
        
        required.forEach(field => {
            const input = this.container.querySelector(`[name="${field}"]`);
            if (!input || !input.value.trim()) {
                errors[field] = 'This field is required';
            }
        });
        
        // Email validation
        const emailInput = this.container.querySelector('[name="email"]');
        if (emailInput && emailInput.value && !this.isValidEmail(emailInput.value)) {
            errors.email = 'Please enter a valid email address';
        }
        
        this.state.errors = { ...this.state.errors, ...errors };
        return Object.keys(errors).length === 0;
    }
    
    /**
     * Valida información de pago
     */
    validatePaymentInfo() {
        if (!this.state.paymentMethod) {
            this.state.errors.paymentMethod = 'Please select a payment method';
            return false;
        }
        
        if (this.state.paymentMethod === 'credit-card') {
            return this.validateCreditCard();
        }
        
        return true;
    }
    
    /**
     * Valida información de tarjeta de crédito
     */
    validateCreditCard() {
        const required = ['cardNumber', 'cardExpiry', 'cardCvc', 'cardName'];
        const errors = {};
        
        required.forEach(field => {
            const input = this.container.querySelector(`[name="${field}"]`);
            if (!input || !input.value.trim()) {
                errors[field] = 'This field is required';
            }
        });
        
        // Card number validation
        const cardNumberInput = this.container.querySelector('[name="cardNumber"]');
        if (cardNumberInput && cardNumberInput.value) {
            const cardNumber = cardNumberInput.value.replace(/\s/g, '');
            if (!this.isValidCardNumber(cardNumber)) {
                errors.cardNumber = 'Please enter a valid card number';
            }
        }
        
        // Expiry validation
        const expiryInput = this.container.querySelector('[name="cardExpiry"]');
        if (expiryInput && expiryInput.value) {
            if (!this.isValidExpiry(expiryInput.value)) {
                errors.cardExpiry = 'Please enter a valid expiry date';
            }
        }
        
        // CVC validation
        const cvcInput = this.container.querySelector('[name="cardCvc"]');
        if (cvcInput && cvcInput.value) {
            if (cvcInput.value.length < 3) {
                errors.cardCvc = 'CVC must be at least 3 digits';
            }
        }
        
        this.state.errors = { ...this.state.errors, ...errors };
        return Object.keys(errors).length === 0;
    }
    
    /**
     * Valida campo individual
     */
    validateField(field) {
        if (!this.config.validation) return true;
        
        const value = field.value.trim();
        const name = field.name;
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (field.required && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Specific field validations
        switch (name) {
            case 'email':
                if (value && !this.isValidEmail(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
            case 'phone':
                if (value && !this.isValidPhone(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid phone number';
                }
                break;
            case 'customAmount':
                const amount = parseFloat(value);
                if (value && (isNaN(amount) || amount <= 0)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid amount';
                }
                break;
        }
        
        // Update field state
        field.classList.toggle('error', !isValid);
        field.classList.toggle('valid', isValid && value);
        
        // Show/hide error message
        this.showFieldError(field, isValid ? '' : errorMessage);
        
        return isValid;
    }
    
    /**
     * Muestra error en campo específico
     */
    showFieldError(field, message) {
        let errorElement = field.parentNode.querySelector('.field-error');
        
        if (message) {
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.className = 'field-error';
                field.parentNode.appendChild(errorElement);
            }
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
    
    /**
     * Muestra errores de validación
     */
    showValidationErrors() {
        // Highlight first error field
        const firstErrorField = this.container.querySelector('.error');
        if (firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Show step-specific error message
        this.showError('Please complete all required fields before continuing.');
    }
    
    /**
     * Maneja envío del formulario
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.state.isProcessing) return;
        
        if (!this.validateCurrentStep()) {
            this.showValidationErrors();
            return;
        }
        
        this.state.isProcessing = true;
        this.updateSubmitButton(true);
        
        try {
            // Collect all form data
            const formData = this.collectFormData();
            
            // Process payment
            const result = await this.processPayment(formData);
            
            if (result.success) {
                this.showSuccess(result);
                this.trackEvent('payment_completed', { 
                    amount: formData.totalAmount,
                    method: formData.paymentMethod,
                    type: formData.paymentType
                });
            } else {
                throw new Error(result.error || 'Payment processing failed');
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            this.showError(error.message || 'Payment failed. Please try again.');
            this.trackEvent('payment_failed', { error: error.message });
        } finally {
            this.state.isProcessing = false;
            this.updateSubmitButton(false);
        }
    }
    
    /**
     * Recopila todos los datos del formulario
     */
    collectFormData() {
        const formData = new FormData(this.elements.form);
        const data = { ...this.state.formData };
        
        // Add form fields
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Add metadata
        data.timestamp = new Date().toISOString();
        data.userAgent = navigator.userAgent;
        data.referrer = document.referrer;
        data.sessionId = this.generateSessionId();
        
        return data;
    }
    
    /**
     * Procesa el pago
     */
    async processPayment(data) {
        // Simulate payment processing for different methods
        switch (data.paymentMethod) {
            case 'credit-card':
                return await this.processCreditCardPayment(data);
            case 'bank-transfer':
                return await this.processBankTransferPayment(data);
            case 'paypal':
                return await this.processPayPalPayment(data);
            case 'crypto':
                return await this.processCryptoPayment(data);
            default:
                throw new Error('Invalid payment method');
        }
    }
    
    /**
     * Procesa pago con tarjeta de crédito
     */
    async processCreditCardPayment(data) {
        const response = await fetch(`${this.config.apiEndpoint}/credit-card`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                amount: data.totalAmount,
                currency: this.config.currency,
                card: {
                    number: data.cardNumber.replace(/\s/g, ''),
                    expiry: data.cardExpiry,
                    cvc: data.cardCvc,
                    name: data.cardName
                },
                customer: {
                    name: data.fullName,
                    email: data.email,
                    phone: data.phone,
                    organization: data.organization
                },
                metadata: {
                    paymentType: data.paymentType,
                    tier: data.tier,
                    recurring: data.recurring,
                    sessionId: data.sessionId
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Payment processing failed');
        }
        
        return await response.json();
    }
    
    /**
     * Procesa transferencia bancaria
     */
    async processBankTransferPayment(data) {
        const response = await fetch(`${this.config.apiEndpoint}/bank-transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: data.totalAmount,
                currency: this.config.currency,
                customer: {
                    name: data.fullName,
                    email: data.email,
                    country: data.bankCountry
                },
                metadata: {
                    paymentType: data.paymentType,
                    tier: data.tier,
                    sessionId: data.sessionId
                }
            })
        });
        
        return await response.json();
    }
    
    /**
     * Procesa pago con PayPal
     */
    async processPayPalPayment(data) {
        // In a real implementation, this would redirect to PayPal
        return {
            success: true,
            paymentId: 'pp_' + this.generateId(),
            redirectUrl: 'https://paypal.com/checkout',
            message: 'Redirecting to PayPal...'
        };
    }
    
    /**
     * Procesa pago con criptomonedas
     */
    async processCryptoPayment(data) {
        const response = await fetch(`${this.config.apiEndpoint}/crypto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: data.totalAmount,
                currency: data.selectedCrypto || 'bitcoin',
                customer: {
                    name: data.fullName,
                    email: data.email
                },
                metadata: {
                    paymentType: data.paymentType,
                    tier: data.tier,
                    sessionId: data.sessionId
                }
            })
        });
        
        return await response.json();
    }
    
    /**
     * Actualiza estado del botón de envío
     */
    updateSubmitButton(isLoading) {
        const btnText = this.elements.submitButton.querySelector('.btn-text');
        const btnLoading = this.elements.submitButton.querySelector('.btn-loading');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
            this.elements.submitButton.disabled = true;
        } else {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            this.elements.submitButton.disabled = false;
        }
    }
    
    /**
     * Muestra mensaje de éxito
     */
    showSuccess(result) {
        const successMessage = document.createElement('div');
        successMessage.className = 'payment-success';
        successMessage.innerHTML = `
            <div class="success-icon">✅</div>
            <h2>Payment Successful!</h2>
            <p>Thank you for your ${this.state.formData.paymentType}. Your contribution will make a real difference.</p>
            <div class="success-details">
                <p><strong>Transaction ID:</strong> ${result.paymentId}</p>
                <p><strong>Amount:</strong> ${this.formatCurrency(this.state.formData.totalAmount)}</p>
                <p>A confirmation email has been sent to ${this.state.formData.email}</p>
            </div>
            <div class="success-actions">
                <button type="button" class="btn btn-primary" onclick="location.reload()">
                    Make Another Contribution
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.print()">
                    Print Receipt
                </button>
            </div>
        `;
        
        this.container.innerHTML = '';
        this.container.appendChild(successMessage);
    }
    
    /**
     * Muestra mensaje de error
     */
    showError(message) {
        const errorDiv = this.container.querySelector('.payment-error') || document.createElement('div');
        errorDiv.className = 'payment-error';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <p>${message}</p>
        `;
        
        if (!this.container.querySelector('.payment-error')) {
            this.container.insertBefore(errorDiv, this.container.firstChild);
        }
        
        setTimeout(() => errorDiv.remove(), 5000);
    }
    
    /**
     * Inicializa reglas de validación
     */
    initValidationRules() {
        return {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[\+]?[1-9][\d]{0,15}$/,
            cardNumber: /^[0-9]{13,19}$/,
            expiry: /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
            cvc: /^[0-9]{3,4}$/
        };
    }
    
    /**
     * Valida email
     */
    isValidEmail(email) {
        return this.state.validationRules.email.test(email);
    }
    
    /**
     * Valida teléfono
     */
    isValidPhone(phone) {
        return this.state.validationRules.phone.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
    
    /**
     * Valida número de tarjeta usando algoritmo de Luhn
     */
    isValidCardNumber(number) {
        if (!/^[0-9]{13,19}$/.test(number)) return false;
        
        let sum = 0;
        let isEven = false;
        
        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number.charAt(i), 10);
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }
    
    /**
     * Valida fecha de vencimiento
     */
    isValidExpiry(expiry) {
        if (!this.state.validationRules.expiry.test(expiry)) return false;
        
        const [month, year] = expiry.split('/');
        const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
        const today = new Date();
        
        return expiryDate > today;
    }
    
    /**
     * Configura analytics
     */
    setupAnalytics() {
        if (!this.config.analytics) return;
        
        this.trackEvent('payment_form_loaded', {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer
        });
    }
    
    /**
     * Envía evento de analytics
     */
    trackEvent(eventName, properties = {}) {
        if (!this.config.analytics) return;
        
        // Integration with analytics service
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, properties);
        }
        
        // Custom analytics
        const event = new CustomEvent('paymentForm:analytics', {
            detail: { eventName, properties }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Envía evento personalizado
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    /**
     * Genera ID único
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * Genera ID de sesión
     */
    generateSessionId() {
        return 'session_' + this.generateId();
    }
    
    /**
     * Datos de fallback si no se puede cargar pricing-tiers.json
     */
    getFallbackPricingData() {
        return {
            sponsorshipTiers: {
                platinum: {
                    id: 'platinum',
                    name: 'Platinum Partner',
                    displayName: 'Platinum Community Champion',
                    tagline: 'Leading Global Change',
                    emoji: '👑',
                    minAmount: 25000,
                    benefits: ['Exclusive naming rights', 'Custom content creation', 'Real-time analytics']
                },
                gold: {
                    id: 'gold',
                    name: 'Gold Supporter',
                    displayName: 'Gold Community Advocate',
                    tagline: 'Empowering Communities',
                    emoji: '⭐',
                    minAmount: 10000,
                    maxAmount: 24999,
                    benefits: ['Prominent logo placement', 'Quarterly reviews', 'Social media features']
                }
            },
            communityTiers: {
                individual: {
                    id: 'individual',
                    name: 'Individual Supporter',
                    displayName: 'Community Friend',
                    tagline: 'One Person, One Impact',
                    emoji: '❤️',
                    minAmount: 10,
                    maxAmount: 999,
                    benefits: ['Thank you mention', 'Exclusive updates', 'Digital certificate']
                }
            }
        };
    }
    
    /**
     * Limpia event listeners
     */
    destroy() {
        this.boundEvents.forEach((events, element) => {
            events.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        this.boundEvents.clear();
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

/**
 * Factory function para crear instancias del formulario de pago
 */
function createPaymentForm(options = {}) {
    return new PaymentForm(options);
}

/**
 * Auto-inicialización si existe contenedor por defecto
 */
document.addEventListener('DOMContentLoaded', () => {
    const defaultContainer = document.getElementById('payment-form-container');
    if (defaultContainer && !defaultContainer.hasAttribute('data-manual-init')) {
        window.paymentForm = createPaymentForm();
    }
});

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PaymentForm, createPaymentForm };
}