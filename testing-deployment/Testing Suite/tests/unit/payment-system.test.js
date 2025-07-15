const { PaymentSystem } = require('../../src/payments/payment-system');
const { PaymentProcessor } = require('../../src/payments/payment-processor');
const { SubscriptionManager } = require('../../src/payments/subscription-manager');
const { InvoiceGenerator } = require('../../src/payments/invoice-generator');
const { FraudDetection } = require('../../src/payments/fraud-detection');

describe('Payment System', () => {
  let paymentSystem;
  let mockPaymentProcessor;
  let mockSubscriptionManager;
  let mockInvoiceGenerator;
  let mockFraudDetection;

  beforeEach(() => {
    mockPaymentProcessor = {
      processPayment: jest.fn(),
      capturePayment: jest.fn(),
      refundPayment: jest.fn(),
      validatePaymentMethod: jest.fn(),
      getPaymentStatus: jest.fn(),
      createPaymentIntent: jest.fn()
    };

    mockSubscriptionManager = {
      createSubscription: jest.fn(),
      updateSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
      getSubscription: jest.fn(),
      processRecurringPayment: jest.fn(),
      handleSubscriptionWebhook: jest.fn()
    };

    mockInvoiceGenerator = {
      generateInvoice: jest.fn(),
      sendInvoice: jest.fn(),
      updateInvoiceStatus: jest.fn(),
      getInvoice: jest.fn(),
      createCreditNote: jest.fn()
    };

    mockFraudDetection = {
      analyzeTransaction: jest.fn(),
      checkBlacklist: jest.fn(),
      validateLocation: jest.fn(),
      assessRiskScore: jest.fn(),
      flagSuspiciousActivity: jest.fn()
    };

    paymentSystem = new PaymentSystem(
      mockPaymentProcessor,
      mockSubscriptionManager,
      mockInvoiceGenerator,
      mockFraudDetection
    );
  });

  describe('Payment Processing', () => {
    test('should process one-time payment successfully', async () => {
      const paymentData = {
        amount: 2999, // $29.99
        currency: 'USD',
        customerId: 'customer-123',
        paymentMethodId: 'pm_test_card',
        description: 'Premium subscription upgrade',
        metadata: {
          userId: 'user-456',
          subscriptionType: 'premium'
        }
      };

      const mockPaymentResult = {
        id: 'payment-success-123',
        status: 'succeeded',
        amount: 2999,
        currency: 'USD',
        customerId: 'customer-123',
        paymentMethodId: 'pm_test_card',
        chargeId: 'ch_test_charge_123',
        transactionFee: 117, // 2.9% + $0.30
        netAmount: 2882,
        processedAt: new Date(),
        receiptUrl: 'https://pay.example.com/receipts/payment-success-123'
      };

      const mockFraudCheck = {
        riskScore: 0.15,
        status: 'approved',
        checks: {
          cvv: 'pass',
          postalCode: 'pass',
          address: 'pass'
        }
      };

      mockFraudDetection.analyzeTransaction.mockResolvedValue(mockFraudCheck);
      mockPaymentProcessor.processPayment.mockResolvedValue(mockPaymentResult);
      mockInvoiceGenerator.generateInvoice.mockResolvedValue({
        id: 'inv-123',
        number: 'INV-2024-001'
      });

      const result = await paymentSystem.processOneTimePayment(paymentData);

      expect(result).toEqual(mockPaymentResult);
      expect(mockFraudDetection.analyzeTransaction).toHaveBeenCalledWith(paymentData);
      expect(mockPaymentProcessor.processPayment).toHaveBeenCalledWith(paymentData);
      expect(result.status).toBe('succeeded');
    });

    test('should handle payment with fraud detection block', async () => {
      const paymentData = {
        amount: 5000,
        currency: 'USD',
        customerId: 'customer-suspicious',
        paymentMethodId: 'pm_suspicious_card'
      };

      const mockFraudCheck = {
        riskScore: 0.85,
        status: 'blocked',
        reason: 'High risk transaction',
        checks: {
          cvv: 'fail',
          postalCode: 'unavailable',
          address: 'fail'
        },
        recommendations: ['require_3ds', 'manual_review']
      };

      mockFraudDetection.analyzeTransaction.mockResolvedValue(mockFraudCheck);

      await expect(paymentSystem.processOneTimePayment(paymentData))
        .rejects.toThrow('Transaction blocked due to fraud risk');

      expect(mockPaymentProcessor.processPayment).not.toHaveBeenCalled();
    });

    test('should handle payment method validation', async () => {
      const paymentMethodData = {
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: 2025,
          cvc: '123'
        },
        billingDetails: {
          name: 'John Doe',
          email: 'john@example.com',
          address: {
            line1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'US'
          }
        }
      };

      const mockValidationResult = {
        valid: true,
        paymentMethodId: 'pm_validated_123',
        brand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
        fingerprint: 'card_fingerprint_123',
        checks: {
          cvcCheck: 'pass',
          addressLine1Check: 'pass',
          postalCodeCheck: 'pass'
        }
      };

      mockPaymentProcessor.validatePaymentMethod.mockResolvedValue(mockValidationResult);

      const result = await paymentSystem.validatePaymentMethod(paymentMethodData);

      expect(result).toEqual(mockValidationResult);
      expect(result.valid).toBe(true);
      expect(result.brand).toBe('visa');
    });

    test('should process refund successfully', async () => {
      const refundData = {
        paymentId: 'payment-success-123',
        amount: 2999,
        reason: 'requested_by_customer',
        metadata: {
          refundRequestedBy: 'user-456',
          reason: 'Service not as expected'
        }
      };

      const mockRefundResult = {
        id: 'refund-123',
        paymentId: 'payment-success-123',
        amount: 2999,
        currency: 'USD',
        status: 'succeeded',
        reason: 'requested_by_customer',
        processedAt: new Date(),
        estimatedArrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
      };

      mockPaymentProcessor.refundPayment.mockResolvedValue(mockRefundResult);
      mockInvoiceGenerator.createCreditNote.mockResolvedValue({
        id: 'cn-123',
        number: 'CN-2024-001'
      });

      const result = await paymentSystem.processRefund(refundData);

      expect(result).toEqual(mockRefundResult);
      expect(mockPaymentProcessor.refundPayment).toHaveBeenCalledWith(refundData);
      expect(result.status).toBe('succeeded');
    });

    test('should handle partial refunds', async () => {
      const partialRefundData = {
        paymentId: 'payment-success-456',
        amount: 1000, // Partial refund of $10 from $29.99 payment
        reason: 'partial_service_credit'
      };

      const mockPartialRefund = {
        id: 'refund-partial-123',
        paymentId: 'payment-success-456',
        amount: 1000,
        currency: 'USD',
        status: 'succeeded',
        type: 'partial',
        remainingRefundableAmount: 1999
      };

      mockPaymentProcessor.refundPayment.mockResolvedValue(mockPartialRefund);

      const result = await paymentSystem.processRefund(partialRefundData);

      expect(result.type).toBe('partial');
      expect(result.remainingRefundableAmount).toBe(1999);
    });
  });

  describe('Subscription Management', () => {
    test('should create new subscription successfully', async () => {
      const subscriptionData = {
        customerId: 'customer-123',
        priceId: 'price_premium_monthly',
        paymentMethodId: 'pm_test_card',
        trialPeriodDays: 14,
        metadata: {
          userId: 'user-456',
          planName: 'Premium Monthly'
        }
      };

      const mockSubscription = {
        id: 'sub-premium-123',
        customerId: 'customer-123',
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        plan: {
          id: 'price_premium_monthly',
          amount: 2999,
          currency: 'USD',
          interval: 'month',
          intervalCount: 1
        },
        paymentMethod: {
          id: 'pm_test_card',
          brand: 'visa',
          last4: '4242'
        }
      };

      mockSubscriptionManager.createSubscription.mockResolvedValue(mockSubscription);
      mockInvoiceGenerator.generateInvoice.mockResolvedValue({
        id: 'inv-sub-123',
        subscriptionId: 'sub-premium-123'
      });

      const result = await paymentSystem.createSubscription(subscriptionData);

      expect(result).toEqual(mockSubscription);
      expect(result.status).toBe('trialing');
      expect(mockSubscriptionManager.createSubscription).toHaveBeenCalledWith(subscriptionData);
    });

    test('should handle subscription upgrades and downgrades', async () => {
      const upgradeData = {
        subscriptionId: 'sub-basic-123',
        newPriceId: 'price_premium_monthly',
        prorationBehavior: 'create_prorations',
        effectiveDate: 'immediate'
      };

      const mockUpgradedSubscription = {
        id: 'sub-basic-123',
        customerId: 'customer-123',
        status: 'active',
        plan: {
          id: 'price_premium_monthly',
          amount: 2999,
          currency: 'USD',
          interval: 'month'
        },
        proration: {
          amount: 1500, // Prorated amount for upgrade
          description: 'Proration for plan upgrade'
        },
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      mockSubscriptionManager.updateSubscription.mockResolvedValue(mockUpgradedSubscription);
      mockInvoiceGenerator.generateInvoice.mockResolvedValue({
        id: 'inv-upgrade-123',
        amount: 1500
      });

      const result = await paymentSystem.updateSubscription(upgradeData);

      expect(result).toEqual(mockUpgradedSubscription);
      expect(result.plan.id).toBe('price_premium_monthly');
      expect(result.proration.amount).toBe(1500);
    });

    test('should process recurring subscription payments', async () => {
      const recurringPaymentData = {
        subscriptionId: 'sub-premium-123',
        customerId: 'customer-123',
        amount: 2999,
        currency: 'USD',
        paymentMethodId: 'pm_test_card'
      };

      const mockRecurringPayment = {
        id: 'payment-recurring-123',
        subscriptionId: 'sub-premium-123',
        amount: 2999,
        currency: 'USD',
        status: 'succeeded',
        billingReason: 'subscription_cycle',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        attemptCount: 1,
        nextRetryAt: null
      };

      mockSubscriptionManager.processRecurringPayment.mockResolvedValue(mockRecurringPayment);
      mockInvoiceGenerator.generateInvoice.mockResolvedValue({
        id: 'inv-recurring-123',
        status: 'paid'
      });

      const result = await paymentSystem.processRecurringPayment(recurringPaymentData);

      expect(result).toEqual(mockRecurringPayment);
      expect(result.billingReason).toBe('subscription_cycle');
      expect(result.attemptCount).toBe(1);
    });

    test('should handle failed subscription payments with retries', async () => {
      const failedPaymentData = {
        subscriptionId: 'sub-premium-456',
        customerId: 'customer-456',
        amount: 2999,
        currency: 'USD',
        paymentMethodId: 'pm_declined_card'
      };

      const mockFailedPayment = {
        id: 'payment-failed-123',
        subscriptionId: 'sub-premium-456',
        status: 'failed',
        failureCode: 'card_declined',
        failureMessage: 'Your card was declined.',
        attemptCount: 1,
        nextRetryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Retry in 3 days
        maxRetries: 3
      };

      mockSubscriptionManager.processRecurringPayment.mockResolvedValue(mockFailedPayment);

      const result = await paymentSystem.processRecurringPayment(failedPaymentData);

      expect(result.status).toBe('failed');
      expect(result.nextRetryAt).toBeTruthy();
      expect(result.attemptCount).toBe(1);
    });

    test('should cancel subscription with proper handling', async () => {
      const cancellationData = {
        subscriptionId: 'sub-premium-789',
        cancelAtPeriodEnd: true,
        cancellationReason: 'customer_request',
        feedback: 'Too expensive for my needs'
      };

      const mockCancelledSubscription = {
        id: 'sub-premium-789',
        customerId: 'customer-789',
        status: 'active', // Still active until period end
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        cancellationDetails: {
          reason: 'customer_request',
          feedback: 'Too expensive for my needs',
          canceledBy: 'customer'
        }
      };

      mockSubscriptionManager.cancelSubscription.mockResolvedValue(mockCancelledSubscription);

      const result = await paymentSystem.cancelSubscription(cancellationData);

      expect(result).toEqual(mockCancelledSubscription);
      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(result.cancellationDetails.reason).toBe('customer_request');
    });
  });

  describe('Invoice Management', () => {
    test('should generate invoice for payment', async () => {
      const invoiceData = {
        customerId: 'customer-123',
        amount: 2999,
        currency: 'USD',
        description: 'Premium subscription - January 2024',
        lineItems: [
          {
            description: 'Premium Monthly Subscription',
            amount: 2999,
            quantity: 1,
            period: {
              start: new Date('2024-01-01'),
              end: new Date('2024-01-31')
            }
          }
        ],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          subscriptionId: 'sub-premium-123',
          userId: 'user-456'
        }
      };

      const mockInvoice = {
        id: 'inv-2024-001',
        number: 'INV-2024-001',
        customerId: 'customer-123',
        amount: 2999,
        currency: 'USD',
        status: 'open',
        created: new Date(),
        dueDate: invoiceData.dueDate,
        lineItems: invoiceData.lineItems,
        subtotal: 2999,
        tax: 0,
        total: 2999,
        pdfUrl: 'https://invoices.example.com/inv-2024-001.pdf',
        hostedInvoiceUrl: 'https://pay.example.com/invoices/inv-2024-001'
      };

      mockInvoiceGenerator.generateInvoice.mockResolvedValue(mockInvoice);

      const result = await paymentSystem.generateInvoice(invoiceData);

      expect(result).toEqual(mockInvoice);
      expect(result.number).toBe('INV-2024-001');
      expect(result.status).toBe('open');
    });

    test('should send invoice via email', async () => {
      const emailData = {
        invoiceId: 'inv-2024-001',
        recipientEmail: 'customer@example.com',
        customMessage: 'Thank you for your subscription!',
        sendCopy: true,
        copyEmail: 'billing@company.com'
      };

      const mockEmailResult = {
        invoiceId: 'inv-2024-001',
        emailSent: true,
        sentAt: new Date(),
        recipientEmail: 'customer@example.com',
        messageId: 'msg-invoice-123',
        deliveryStatus: 'delivered'
      };

      mockInvoiceGenerator.sendInvoice.mockResolvedValue(mockEmailResult);

      const result = await paymentSystem.sendInvoice(emailData);

      expect(result).toEqual(mockEmailResult);
      expect(result.emailSent).toBe(true);
      expect(result.deliveryStatus).toBe('delivered');
    });

    test('should handle invoice payment updates', async () => {
      const paymentUpdate = {
        invoiceId: 'inv-2024-001',
        paymentId: 'payment-success-123',
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'card'
      };

      const mockUpdatedInvoice = {
        id: 'inv-2024-001',
        status: 'paid',
        paidAt: paymentUpdate.paidAt,
        paymentId: 'payment-success-123',
        amountPaid: 2999,
        amountDue: 0
      };

      mockInvoiceGenerator.updateInvoiceStatus.mockResolvedValue(mockUpdatedInvoice);

      const result = await paymentSystem.updateInvoicePayment(paymentUpdate);

      expect(result.status).toBe('paid');
      expect(result.amountDue).toBe(0);
    });
  });

  describe('Fraud Detection and Security', () => {
    test('should analyze transaction for fraud patterns', async () => {
      const transactionData = {
        amount: 5000,
        currency: 'USD',
        customerId: 'customer-new',
        paymentMethodId: 'pm_new_card',
        customerInfo: {
          email: 'new@example.com',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          deviceFingerprint: 'device_123'
        },
        billingAddress: {
          country: 'US',
          postalCode: '10001'
        }
      };

      const mockFraudAnalysis = {
        riskScore: 0.25,
        status: 'approved',
        riskFactors: [
          { factor: 'new_customer', impact: 0.1, weight: 'medium' },
          { factor: 'high_amount', impact: 0.15, weight: 'high' }
        ],
        checks: {
          blacklistCheck: 'pass',
          velocityCheck: 'pass',
          geoLocationCheck: 'pass',
          deviceCheck: 'pass',
          behaviorCheck: 'pass'
        },
        recommendations: ['monitor_transaction', 'verify_email'],
        confidence: 0.85
      };

      mockFraudDetection.analyzeTransaction.mockResolvedValue(mockFraudAnalysis);
      mockFraudDetection.checkBlacklist.mockResolvedValue({ isBlacklisted: false });
      mockFraudDetection.validateLocation.mockResolvedValue({ isValid: true });

      const result = await paymentSystem.analyzeFraud(transactionData);

      expect(result).toEqual(mockFraudAnalysis);
      expect(result.status).toBe('approved');
      expect(result.riskScore).toBe(0.25);
    });

    test('should flag suspicious payment patterns', async () => {
      const suspiciousData = {
        customerId: 'customer-suspicious',
        recentTransactions: [
          { amount: 1000, timestamp: new Date(Date.now() - 1000 * 60) },
          { amount: 2000, timestamp: new Date(Date.now() - 1000 * 120) },
          { amount: 3000, timestamp: new Date(Date.now() - 1000 * 180) }
        ],
        ipAddress: '192.168.1.200',
        deviceFingerprint: 'suspicious_device'
      };

      const mockSuspiciousActivity = {
        flagged: true,
        reasons: [
          'rapid_successive_transactions',
          'increasing_amounts',
          'new_device'
        ],
        riskLevel: 'high',
        recommendedAction: 'manual_review',
        suspiciousScore: 0.78,
        blockedUntilReview: true
      };

      mockFraudDetection.flagSuspiciousActivity.mockResolvedValue(mockSuspiciousActivity);

      const result = await paymentSystem.checkSuspiciousActivity(suspiciousData);

      expect(result.flagged).toBe(true);
      expect(result.riskLevel).toBe('high');
      expect(result.recommendedAction).toBe('manual_review');
    });

    test('should handle 3D Secure authentication', async () => {
      const threeDSData = {
        paymentMethodId: 'pm_requires_3ds',
        amount: 5000,
        currency: 'EUR',
        returnUrl: 'https://example.com/payment/return'
      };

      const mock3DSResult = {
        requiresAction: true,
        paymentIntentId: 'pi_3ds_123',
        clientSecret: 'pi_3ds_123_secret_abc',
        nextAction: {
          type: 'use_stripe_sdk',
          useStripeSdk: {
            type: 'three_d_secure_redirect',
            stripe3ds2Source: 'src_3ds_redirect'
          }
        },
        status: 'requires_action'
      };

      mockPaymentProcessor.createPaymentIntent.mockResolvedValue(mock3DSResult);

      const result = await paymentSystem.handle3DSecure(threeDSData);

      expect(result.requiresAction).toBe(true);
      expect(result.status).toBe('requires_action');
      expect(result.nextAction.type).toBe('use_stripe_sdk');
    });
  });

  describe('Payment Methods Management', () => {
    test('should save customer payment method', async () => {
      const paymentMethodData = {
        customerId: 'customer-123',
        paymentMethod: {
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2025
          }
        },
        setAsDefault: true
      };

      const mockSavedMethod = {
        id: 'pm_saved_123',
        customerId: 'customer-123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025,
          fingerprint: 'card_fingerprint_123'
        },
        isDefault: true,
        created: new Date()
      };

      mockPaymentProcessor.savePaymentMethod = jest.fn().mockResolvedValue(mockSavedMethod);

      const result = await paymentSystem.savePaymentMethod(paymentMethodData);

      expect(result).toEqual(mockSavedMethod);
      expect(result.isDefault).toBe(true);
    });

    test('should list customer payment methods', async () => {
      const customerId = 'customer-123';

      const mockPaymentMethods = [
        {
          id: 'pm_card_1',
          type: 'card',
          card: { brand: 'visa', last4: '4242' },
          isDefault: true
        },
        {
          id: 'pm_card_2',
          type: 'card',
          card: { brand: 'mastercard', last4: '5555' },
          isDefault: false
        }
      ];

      mockPaymentProcessor.getPaymentMethods = jest.fn().mockResolvedValue(mockPaymentMethods);

      const result = await paymentSystem.getCustomerPaymentMethods(customerId);

      expect(result).toEqual(mockPaymentMethods);
      expect(result).toHaveLength(2);
      expect(result[0].isDefault).toBe(true);
    });
  });

  describe('Webhook Handling', () => {
    test('should handle payment succeeded webhook', async () => {
      const webhookEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_webhook_123',
            amount: 2999,
            currency: 'USD',
            status: 'succeeded',
            metadata: {
              customerId: 'customer-123',
              subscriptionId: 'sub-premium-123'
            }
          }
        }
      };

      const mockWebhookResult = {
        processed: true,
        paymentId: 'pi_webhook_123',
        actions: [
          'invoice_updated',
          'subscription_activated',
          'email_sent'
        ]
      };

      mockPaymentProcessor.handleWebhook = jest.fn().mockResolvedValue(mockWebhookResult);

      const result = await paymentSystem.handleWebhook(webhookEvent);

      expect(result.processed).toBe(true);
      expect(result.actions).toContain('subscription_activated');
    });

    test('should handle subscription webhook events', async () => {
      const subscriptionWebhook = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub-webhook-123',
            status: 'past_due',
            current_period_end: new Date().getTime() / 1000
          }
        }
      };

      const mockSubscriptionWebhookResult = {
        processed: true,
        subscriptionId: 'sub-webhook-123',
        statusChanged: true,
        notifications: ['customer_notified', 'dunning_started']
      };

      mockSubscriptionManager.handleSubscriptionWebhook.mockResolvedValue(mockSubscriptionWebhookResult);

      const result = await paymentSystem.handleSubscriptionWebhook(subscriptionWebhook);

      expect(result.processed).toBe(true);
      expect(result.statusChanged).toBe(true);
    });
  });

  describe('Reporting and Analytics', () => {
    test('should generate payment analytics report', async () => {
      const reportParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        metrics: ['revenue', 'transaction_count', 'success_rate', 'refund_rate']
      };

      const mockAnalyticsReport = {
        period: {
          start: '2024-01-01',
          end: '2024-01-31'
        },
        revenue: {
          total: 125000,
          recurring: 89000,
          oneTime: 36000,
          refunded: 3200,
          net: 121800
        },
        transactions: {
          total: 1250,
          successful: 1175,
          failed: 75,
          successRate: 0.94
        },
        subscriptions: {
          new: 150,
          canceled: 25,
          upgraded: 45,
          downgraded: 12,
          churnRate: 0.02
        },
        trends: {
          dailyRevenue: [
            { date: '2024-01-01', revenue: 4200 },
            { date: '2024-01-02', revenue: 3800 }
          ],
          paymentMethods: {
            card: 0.85,
            bankTransfer: 0.10,
            digital_wallet: 0.05
          }
        }
      };

      mockPaymentProcessor.getAnalytics = jest.fn().mockResolvedValue(mockAnalyticsReport);

      const result = await paymentSystem.getPaymentAnalytics(reportParams);

      expect(result).toEqual(mockAnalyticsReport);
      expect(result.revenue.total).toBe(125000);
      expect(result.transactions.successRate).toBe(0.94);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async () => {
      const paymentData = {
        amount: 2999,
        currency: 'USD',
        customerId: 'customer-123',
        paymentMethodId: 'pm_test_card'
      };

      mockPaymentProcessor.processPayment.mockRejectedValue(new Error('Network timeout'));

      await expect(paymentSystem.processOneTimePayment(paymentData))
        .rejects.toThrow('Network timeout');
    });

    test('should handle invalid payment amounts', async () => {
      const invalidPaymentData = {
        amount: -100, // Negative amount
        currency: 'USD',
        customerId: 'customer-123'
      };

      await expect(paymentSystem.processOneTimePayment(invalidPaymentData))
        .rejects.toThrow('Invalid payment amount');
    });

    test('should handle currency conversion errors', async () => {
      const unsupportedCurrencyData = {
        amount: 1000,
        currency: 'XYZ', // Unsupported currency
        customerId: 'customer-123'
      };

      await expect(paymentSystem.processOneTimePayment(unsupportedCurrencyData))
        .rejects.toThrow('Unsupported currency');
    });

    test('should handle payment processor downtime', async () => {
      const paymentData = {
        amount: 2999,
        currency: 'USD',
        customerId: 'customer-123',
        paymentMethodId: 'pm_test_card'
      };

      mockPaymentProcessor.processPayment.mockRejectedValue(new Error('Service temporarily unavailable'));

      await expect(paymentSystem.processOneTimePayment(paymentData))
        .rejects.toThrow('Service temporarily unavailable');
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete subscription lifecycle', async () => {
      // Create subscription
      const subscriptionData = {
        customerId: 'customer-lifecycle',
        priceId: 'price_premium_monthly',
        paymentMethodId: 'pm_lifecycle_card'
      };

      const subscription = {
        id: 'sub-lifecycle-123',
        status: 'active',
        customerId: 'customer-lifecycle'
      };

      mockSubscriptionManager.createSubscription.mockResolvedValue(subscription);

      // Process first payment
      const recurringPayment = {
        id: 'payment-lifecycle-1',
        subscriptionId: 'sub-lifecycle-123',
        status: 'succeeded'
      };

      mockSubscriptionManager.processRecurringPayment.mockResolvedValue(recurringPayment);

      // Update subscription
      const updatedSubscription = {
        ...subscription,
        plan: { id: 'price_enterprise_monthly' }
      };

      mockSubscriptionManager.updateSubscription.mockResolvedValue(updatedSubscription);

      // Cancel subscription
      const cancelledSubscription = {
        ...updatedSubscription,
        status: 'canceled'
      };

      mockSubscriptionManager.cancelSubscription.mockResolvedValue(cancelledSubscription);

      // Execute lifecycle
      const createResult = await paymentSystem.createSubscription(subscriptionData);
      const paymentResult = await paymentSystem.processRecurringPayment({
        subscriptionId: subscription.id,
        amount: 2999
      });
      const updateResult = await paymentSystem.updateSubscription({
        subscriptionId: subscription.id,
        newPriceId: 'price_enterprise_monthly'
      });
      const cancelResult = await paymentSystem.cancelSubscription({
        subscriptionId: subscription.id
      });

      expect(createResult.status).toBe('active');
      expect(paymentResult.status).toBe('succeeded');
      expect(updateResult.plan.id).toBe('price_enterprise_monthly');
      expect(cancelResult.status).toBe('canceled');
    });
  });
});