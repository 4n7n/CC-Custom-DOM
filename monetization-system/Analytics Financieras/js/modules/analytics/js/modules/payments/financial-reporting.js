ç/**
 * Clase principal para generación de reportes financieros
 * Maneja contabilidad, reportes de ingresos, análisis fiscal y compliance
 */
class FinancialReportingSystem {
    constructor(options = {}) {
        this.config = {
            currency: options.currency || 'USD',
            locale: options.locale || 'en-US',
            fiscalYearStart: options.fiscalYearStart || 1, // Enero = 1
            apiEndpoint: options.apiEndpoint || '/api/financial',
            timezone: options.timezone || 'UTC',
            organization: options.organization || {},
            reportingStandards: options.reportingStandards || 'GAAP',
            autoBackup: options.autoBackup !== false,
            encryptSensitiveData: options.encryptSensitiveData !== false,
            ...options
        };
        
        // Estado del sistema financiero
        this.state = {
            transactions: new Map(),
            accounts: new Map(),
            reports: new Map(),
            periods: new Map(),
            audits: [],
            reconciliations: new Map(),
            budgets: new Map(),
            forecasts: new Map(),
            taxRecords: new Map(),
            lastReconciliation: null,
            currentPeriod: null
        };
        
        // Estructura de cuentas contables
        this.chartOfAccounts = {
            assets: {
                '1000': 'Cash and Cash Equivalents',
                '1100': 'Accounts Receivable',
                '1200': 'Prepaid Expenses',
                '1300': 'Equipment and Technology',
                '1400': 'Intellectual Property'
            },
            liabilities: {
                '2000': 'Accounts Payable',
                '2100': 'Accrued Expenses',
                '2200': 'Deferred Revenue',
                '2300': 'Platform Processing Fees Payable'
            },
            equity: {
                '3000': 'Retained Earnings',
                '3100': 'Community Impact Reserve',
                '3200': 'Platform Development Fund'
            },
            revenue: {
                '4000': 'Sponsorship Revenue',
                '4100': 'Donation Revenue',
                '4200': 'Subscription Revenue',
                '4300': 'Grant Revenue',
                '4400': 'Other Revenue'
            },
            expenses: {
                '5000': 'Platform Operations',
                '5100': 'Content Creation',
                '5200': 'Community Support',
                '5300': 'Marketing and Outreach',
                '5400': 'Professional Services',
                '5500': 'Technology and Infrastructure',
                '5600': 'Administrative Expenses'
            }
        };
        
        // Tipos de reportes disponibles
        this.reportTypes = {
            'income-statement': 'Income Statement',
            'balance-sheet': 'Balance Sheet',
            'cash-flow': 'Cash Flow Statement',
            'sponsor-revenue': 'Sponsorship Revenue Report',
            'donation-summary': 'Donation Summary Report',
            'tax-summary': 'Tax Summary Report',
            'roi-analysis': 'ROI Analysis Report',
            'budget-variance': 'Budget vs Actual Report',
            'forecast': 'Financial Forecast Report',
            'audit-trail': 'Audit Trail Report'
        };
        
        this.init();
    }
    
    /**
     * Inicialización del sistema de reportes financieros
     */
    async init() {
        try {
            await this.initializeAccounts();
            await this.loadHistoricalData();
            this.setupCurrentPeriod();
            this.setupAutoReporting();
            this.initializeAuditTrail();
            
            console.log('Financial Reporting System initialized successfully');
            this.dispatchEvent('financialReporting:ready', { instance: this });
            
        } catch (error) {
            console.error('Error initializing Financial Reporting System:', error);
            this.handleError('INIT_ERROR', error);
        }
    }
    
    /**
     * Inicializa estructura de cuentas contables
     */
    async initializeAccounts() {
        Object.entries(this.chartOfAccounts).forEach(([categoryKey, accounts]) => {
            Object.entries(accounts).forEach(([accountCode, accountName]) => {
                this.state.accounts.set(accountCode, {
                    code: accountCode,
                    name: accountName,
                    category: categoryKey,
                    balance: 0,
                    transactions: [],
                    isActive: true,
                    createdAt: new Date(),
                    lastActivity: null
                });
            });
        });
    }
    
    /**
     * Carga datos históricos desde API
     */
    async loadHistoricalData() {
        try {
            const response = await fetch(`${this.config.apiEndpoint}/historical-data`);
            if (response.ok) {
                const data = await response.json();
                this.importHistoricalData(data);
            }
        } catch (error) {
            console.warn('Could not load historical financial data:', error);
        }
    }
    
    /**
     * Configura período contable actual
     */
    setupCurrentPeriod() {
        const now = new Date();
        const fiscalYear = this.getFiscalYear(now);
        const period = this.getPeriodKey(now);
        
        if (!this.state.periods.has(period)) {
            this.state.periods.set(period, {
                key: period,
                fiscalYear: fiscalYear,
                startDate: this.getPeriodStartDate(now),
                endDate: this.getPeriodEndDate(now),
                status: 'open',
                transactions: [],
                reports: new Map(),
                reconciled: false
            });
        }
        
        this.state.currentPeriod = period;
    }
    
    /**
     * Registra una transacción financiera
     */
    recordTransaction(transactionData) {
        const transaction = {
            id: this.generateTransactionId(),
            date: new Date(transactionData.date || Date.now()),
            type: transactionData.type, // 'payment', 'refund', 'adjustment', 'accrual'
            description: transactionData.description,
            reference: transactionData.reference || '',
            
            // Información de la transacción
            amount: Math.abs(parseFloat(transactionData.amount)),
            currency: transactionData.currency || this.config.currency,
            
            // Fuente de la transacción
            source: transactionData.source || 'manual', // 'payment-processor', 'manual', 'api'
            sourceId: transactionData.sourceId,
            
            // Clasificación contable
            debitAccount: transactionData.debitAccount,
            creditAccount: transactionData.creditAccount,
            
            // Información adicional
            sponsorId: transactionData.sponsorId,
            campaignId: transactionData.campaignId,
            donorId: transactionData.donorId,
            tier: transactionData.tier,
            
            // Información fiscal
            taxable: transactionData.taxable !== false,
            taxCategory: transactionData.taxCategory,
            deductible: transactionData.deductible === true,
            
            // Metadatos
            period: this.state.currentPeriod,
            fiscalYear: this.getFiscalYear(new Date(transactionData.date || Date.now())),
            processingFees: transactionData.processingFees || 0,
            netAmount: 0, // Calculado automáticamente
            
            // Auditoría
            createdAt: new Date(),
            createdBy: transactionData.userId || 'system',
            status: 'pending',
            reconciled: false,
            auditTrail: []
        };
        
        // Calcular monto neto
        transaction.netAmount = transaction.amount - transaction.processingFees;
        
        // Validar transacción
        this.validateTransaction(transaction);
        
        // Registrar asientos contables
        this.recordJournalEntry(transaction);
        
        // Guardar transacción
        this.state.transactions.set(transaction.id, transaction);
        
        // Actualizar período actual
        const currentPeriod = this.state.periods.get(this.state.currentPeriod);
        currentPeriod.transactions.push(transaction.id);
        
        // Actualizar balances de cuentas
        this.updateAccountBalances(transaction);
        
        // Registrar en audit trail
        this.addToAuditTrail('TRANSACTION_RECORDED', {
            transactionId: transaction.id,
            amount: transaction.amount,
            type: transaction.type
        });
        
        // Trigger automático de reportes si es necesario
        this.checkAutoReportingTriggers(transaction);
        
        this.trackEvent('transaction_recorded', {
            transactionId: transaction.id,
            amount: transaction.amount,
            type: transaction.type
        });
        
        return transaction;
    }
    
    /**
     * Valida una transacción antes de registrarla
     */
    validateTransaction(transaction) {
        const errors = [];
        
        // Validaciones básicas
        if (!transaction.amount || transaction.amount <= 0) {
            errors.push('Amount must be positive');
        }
        
        if (!transaction.type) {
            errors.push('Transaction type is required');
        }
        
        if (!transaction.debitAccount || !transaction.creditAccount) {
            errors.push('Both debit and credit accounts are required');
        }
        
        // Validar que las cuentas existan
        if (!this.state.accounts.has(transaction.debitAccount)) {
            errors.push(`Debit account ${transaction.debitAccount} does not exist`);
        }
        
        if (!this.state.accounts.has(transaction.creditAccount)) {
            errors.push(`Credit account ${transaction.creditAccount} does not exist`);
        }
        
        // Validaciones específicas por tipo
        switch (transaction.type) {
            case 'sponsorship':
                if (!transaction.sponsorId) {
                    errors.push('Sponsor ID required for sponsorship transactions');
                }
                break;
            case 'donation':
                if (!transaction.donorId) {
                    errors.push('Donor ID required for donation transactions');
                }
                break;
        }
        
        if (errors.length > 0) {
            throw new Error(`Transaction validation failed: ${errors.join(', ')}`);
        }
    }
    
    /**
     * Registra asiento contable de doble entrada
     */
    recordJournalEntry(transaction) {
        const journalEntry = {
            id: this.generateJournalEntryId(),
            transactionId: transaction.id,
            date: transaction.date,
            description: transaction.description,
            reference: transaction.reference,
            entries: [
                {
                    account: transaction.debitAccount,
                    debit: transaction.amount,
                    credit: 0
                },
                {
                    account: transaction.creditAccount,
                    debit: 0,
                    credit: transaction.amount
                }
            ],
            createdAt: new Date(),
            period: transaction.period
        };
        
        // Si hay fees de procesamiento, crear entrada adicional
        if (transaction.processingFees > 0) {
            journalEntry.entries.push({
                account: '5500', // Technology and Infrastructure
                debit: transaction.processingFees,
                credit: 0
            });
            
            // Ajustar la entrada de crédito principal
            journalEntry.entries[1].credit = transaction.netAmount;
        }
        
        transaction.journalEntryId = journalEntry.id;
        return journalEntry;
    }
    
    /**
     * Actualiza balances de cuentas
     */
    updateAccountBalances(transaction) {
        const debitAccount = this.state.accounts.get(transaction.debitAccount);
        const creditAccount = this.state.accounts.get(transaction.creditAccount);
        
        if (debitAccount) {
            debitAccount.balance += transaction.amount;
            debitAccount.transactions.push(transaction.id);
            debitAccount.lastActivity = new Date();
        }
        
        if (creditAccount) {
            creditAccount.balance -= transaction.amount;
            creditAccount.transactions.push(transaction.id);
            creditAccount.lastActivity = new Date();
        }
        
        // Actualizar cuenta de fees si aplica
        if (transaction.processingFees > 0) {
            const feeAccount = this.state.accounts.get('5500');
            if (feeAccount) {
                feeAccount.balance += transaction.processingFees;
                feeAccount.transactions.push(transaction.id);
                feeAccount.lastActivity = new Date();
            }
        }
    }
    
    /**
     * Genera reporte financiero
     */
    generateReport(reportType, options = {}) {
        const reportId = this.generateReportId();
        const reportConfig = {
            id: reportId,
            type: reportType,
            title: this.reportTypes[reportType] || reportType,
            period: options.period || this.state.currentPeriod,
            startDate: options.startDate ? new Date(options.startDate) : this.getPeriodStartDate(),
            endDate: options.endDate ? new Date(options.endDate) : this.getPeriodEndDate(),
            currency: options.currency || this.config.currency,
            includeComparatives: options.includeComparatives !== false,
            format: options.format || 'json',
            generatedAt: new Date(),
            generatedBy: options.userId || 'system'
        };
        
        let reportData;
        
        switch (reportType) {
            case 'income-statement':
                reportData = this.generateIncomeStatement(reportConfig);
                break;
            case 'balance-sheet':
                reportData = this.generateBalanceSheet(reportConfig);
                break;
            case 'cash-flow':
                reportData = this.generateCashFlowStatement(reportConfig);
                break;
            case 'sponsor-revenue':
                reportData = this.generateSponsorRevenueReport(reportConfig);
                break;
            case 'donation-summary':
                reportData = this.generateDonationSummaryReport(reportConfig);
                break;
            case 'tax-summary':
                reportData = this.generateTaxSummaryReport(reportConfig);
                break;
            case 'roi-analysis':
                reportData = this.generateROIAnalysisReport(reportConfig);
                break;
            case 'budget-variance':
                reportData = this.generateBudgetVarianceReport(reportConfig);
                break;
            case 'forecast':
                reportData = this.generateForecastReport(reportConfig);
                break;
            case 'audit-trail':
                reportData = this.generateAuditTrailReport(reportConfig);
                break;
            default:
                throw new Error(`Unknown report type: ${reportType}`);
        }
        
        const report = {
            ...reportConfig,
            data: reportData,
            summary: this.generateReportSummary(reportData, reportType),
            metadata: this.generateReportMetadata(reportConfig),
            status: 'completed'
        };
        
        // Guardar reporte
        this.state.reports.set(reportId, report);
        
        // Añadir al período correspondiente
        const period = this.state.periods.get(reportConfig.period);
        if (period) {
            period.reports.set(reportType, reportId);
        }
        
        this.trackEvent('report_generated', {
            reportId,
            type: reportType,
            period: reportConfig.period
        });
        
        return this.formatReport(report, reportConfig.format);
    }
    
    /**
     * Genera Estado de Resultados (Income Statement)
     */
    generateIncomeStatement(config) {
        const transactions = this.getTransactionsForPeriod(config.startDate, config.endDate);
        
        const revenue = {
            sponsorship: 0,
            donations: 0,
            subscriptions: 0,
            grants: 0,
            other: 0,
            total: 0
        };
        
        const expenses = {
            operations: 0,
            content: 0,
            community: 0,
            marketing: 0,
            professional: 0,
            technology: 0,
            administrative: 0,
            total: 0
        };
        
        // Procesar transacciones
        transactions.forEach(transaction => {
            if (this.isRevenueAccount(transaction.creditAccount)) {
                const revenueType = this.getRevenueType(transaction.creditAccount);
                revenue[revenueType] += transaction.netAmount;
                revenue.total += transaction.netAmount;
            }
            
            if (this.isExpenseAccount(transaction.debitAccount)) {
                const expenseType = this.getExpenseType(transaction.debitAccount);
                expenses[expenseType] += transaction.amount;
                expenses.total += transaction.amount;
            }
        });
        
        // Cálculos derivados
        const grossProfit = revenue.total;
        const operatingIncome = grossProfit - expenses.total;
        const netIncome = operatingIncome; // Sin intereses/impuestos por ahora
        
        // Comparativas del período anterior si se solicitan
        let comparative = null;
        if (config.includeComparatives) {
            comparative = this.getComparativePeriodData(config);
        }
        
        return {
            revenue,
            expenses,
            grossProfit,
            operatingIncome,
            netIncome,
            margins: {
                gross: revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0,
                operating: revenue.total > 0 ? (operatingIncome / revenue.total) * 100 : 0,
                net: revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0
            },
            comparative,
            transactionCount: transactions.length
        };
    }
    
    /**
     * Genera Balance General (Balance Sheet)
     */
    generateBalanceSheet(config) {
        const assets = {
            current: {
                cash: this.getAccountBalance('1000'),
                receivables: this.getAccountBalance('1100'),
                prepaid: this.getAccountBalance('1200'),
                total: 0
            },
            nonCurrent: {
                equipment: this.getAccountBalance('1300'),
                ip: this.getAccountBalance('1400'),
                total: 0
            },
            total: 0
        };
        
        const liabilities = {
            current: {
                payables: this.getAccountBalance('2000'),
                accrued: this.getAccountBalance('2100'),
                deferred: this.getAccountBalance('2200'),
                fees: this.getAccountBalance('2300'),
                total: 0
            },
            total: 0
        };
        
        const equity = {
            retained: this.getAccountBalance('3000'),
            impact: this.getAccountBalance('3100'),
            development: this.getAccountBalance('3200'),
            total: 0
        };
        
        // Calcular totales
        assets.current.total = Object.values(assets.current).reduce((sum, val) => 
            typeof val === 'number' ? sum + val : sum, 0);
        assets.nonCurrent.total = Object.values(assets.nonCurrent).reduce((sum, val) => 
            typeof val === 'number' ? sum + val : sum, 0);
        assets.total = assets.current.total + assets.nonCurrent.total;
        
        liabilities.current.total = Object.values(liabilities.current).reduce((sum, val) => 
            typeof val === 'number' ? sum + val : sum, 0);
        liabilities.total = liabilities.current.total;
        
        equity.total = Object.values(equity).reduce((sum, val) => 
            typeof val === 'number' ? sum + val : sum, 0);
        
        // Verificar ecuación contable
        const balanceCheck = assets.total - (liabilities.total + equity.total);
        
        return {
            assets,
            liabilities,
            equity,
            balanceCheck,
            isBalanced: Math.abs(balanceCheck) < 0.01, // Permitir diferencias de centavos
            asOfDate: config.endDate
        };
    }
    
    /**
     * Genera Estado de Flujo de Efectivo (Cash Flow Statement)
     */
    generateCashFlowStatement(config) {
        const transactions = this.getTransactionsForPeriod(config.startDate, config.endDate);
        const cashAccount = '1000';
        
        const operating = {
            netIncome: 0,
            adjustments: 0,
            receivablesChange: 0,
            payablesChange: 0,
            total: 0
        };
        
        const investing = {
            equipmentPurchases: 0,
            ipInvestments: 0,
            total: 0
        };
        
        const financing = {
            donations: 0,
            sponsorships: 0,
            total: 0
        };
        
        // Procesar transacciones que afectan efectivo
        transactions.forEach(transaction => {
            if (transaction.debitAccount === cashAccount || transaction.creditAccount === cashAccount) {
                const cashImpact = transaction.debitAccount === cashAccount ? 
                    transaction.amount : -transaction.amount;
                
                // Clasificar por tipo de actividad
                switch (transaction.type) {
                    case 'donation':
                        financing.donations += cashImpact;
                        break;
                    case 'sponsorship':
                        financing.sponsorships += cashImpact;
                        break;
                    case 'equipment':
                        investing.equipmentPurchases += cashImpact;
                        break;
                    default:
                        operating.adjustments += cashImpact;
                        break;
                }
            }
        });
        
        // Calcular totales
        operating.total = operating.netIncome + operating.adjustments + 
                         operating.receivablesChange + operating.payablesChange;
        investing.total = investing.equipmentPurchases + investing.ipInvestments;
        financing.total = financing.donations + financing.sponsorships;
        
        const netCashFlow = operating.total + investing.total + financing.total;
        const beginningCash = this.getCashBalanceAtDate(config.startDate);
        const endingCash = beginningCash + netCashFlow;
        
        return {
            operating,
            investing,
            financing,
            netCashFlow,
            beginningCash,
            endingCash,
            period: {
                start: config.startDate,
                end: config.endDate
            }
        };
    }
    
    /**
     * Genera reporte de ingresos por patrocinio
     */
    generateSponsorRevenueReport(config) {
        const transactions = this.getTransactionsForPeriod(config.startDate, config.endDate)
            .filter(t => t.type === 'sponsorship' && t.sponsorId);
        
        const byTier = {};
        const bySponsor = {};
        const byCampaign = {};
        
        let totalRevenue = 0;
        let totalFees = 0;
        
        transactions.forEach(transaction => {
            const { sponsorId, tier, campaignId, netAmount, processingFees } = transaction;
            
            totalRevenue += netAmount;
            totalFees += processingFees;
            
            // Por tier
            if (!byTier[tier]) byTier[tier] = { revenue: 0, count: 0, fees: 0 };
            byTier[tier].revenue += netAmount;
            byTier[tier].fees += processingFees;
            byTier[tier].count++;
            
            // Por sponsor
            if (!bySponsor[sponsorId]) bySponsor[sponsorId] = { revenue: 0, transactions: [], fees: 0 };
            bySponsor[sponsorId].revenue += netAmount;
            bySponsor[sponsorId].fees += processingFees;
            bySponsor[sponsorId].transactions.push(transaction.id);
            
            // Por campaña
            if (campaignId) {
                if (!byCampaign[campaignId]) byCampaign[campaignId] = { revenue: 0, sponsorId, fees: 0 };
                byCampaign[campaignId].revenue += netAmount;
                byCampaign[campaignId].fees += processingFees;
            }
        });
        
        return {
            summary: {
                totalRevenue,
                totalFees,
                netRevenue: totalRevenue - totalFees,
                transactionCount: transactions.length,
                averageTransaction: transactions.length > 0 ? totalRevenue / transactions.length : 0
            },
            byTier,
            bySponsor,
            byCampaign,
            monthlyBreakdown: this.getMonthlyBreakdown(transactions),
            topSponsors: this.getTopSponsors(bySponsor, 10)
        };
    }
    
    /**
     * Genera reporte resumen de donaciones
     */
    generateDonationSummaryReport(config) {
        const transactions = this.getTransactionsForPeriod(config.startDate, config.endDate)
            .filter(t => t.type === 'donation' && t.donorId);
        
        const byAmount = {
            micro: { min: 0, max: 50, count: 0, total: 0 },
            small: { min: 50, max: 200, count: 0, total: 0 },
            medium: { min: 200, max: 1000, count: 0, total: 0 },
            large: { min: 1000, max: 5000, count: 0, total: 0 },
            major: { min: 5000, max: Infinity, count: 0, total: 0 }
        };
        
        const byDonor = {};
        const recurring = { count: 0, total: 0 };
        const oneTime = { count: 0, total: 0 };
        
        let totalDonations = 0;
        let totalFees = 0;
        
        transactions.forEach(transaction => {
            const { donorId, amount, netAmount, processingFees, isRecurring } = transaction;
            
            totalDonations += netAmount;
            totalFees += processingFees;
            
            // Clasificar por monto
            Object.entries(byAmount).forEach(([category, range]) => {
                if (amount >= range.min && amount < range.max) {
                    range.count++;
                    range.total += netAmount;
                }
            });
            
            // Por donante
            if (!byDonor[donorId]) byDonor[donorId] = { total: 0, count: 0, lastDonation: null };
            byDonor[donorId].total += netAmount;
            byDonor[donorId].count++;
            byDonor[donorId].lastDonation = transaction.date;
            
            // Recurrente vs una vez
            if (isRecurring) {
                recurring.count++;
                recurring.total += netAmount;
            } else {
                oneTime.count++;
                oneTime.total += netAmount;
            }
        });
        
        return {
            summary: {
                totalDonations,
                totalFees,
                netDonations: totalDonations - totalFees,
                donorCount: Object.keys(byDonor).length,
                averageDonation: transactions.length > 0 ? totalDonations / transactions.length : 0,
                recurringPercentage: totalDonations > 0 ? (recurring.total / totalDonations) * 100 : 0
            },
            byAmount,
            byDonor,
            recurring,
            oneTime,
            monthlyBreakdown: this.getMonthlyBreakdown(transactions),
            topDonors: this.getTopDonors(byDonor, 10),
            retentionMetrics: this.calculateDonorRetention(byDonor)
        };
    }
    
    /**
     * Genera reporte de análisis fiscal
     */
    generateTaxSummaryReport(config) {
        const transactions = this.getTransactionsForPeriod(config.startDate, config.endDate);
        
        const taxableIncome = {
            sponsorships: 0,
            donations: 0,
            other: 0,
            total: 0
        };
        
        const deductibleExpenses = {
            operations: 0,
            professional: 0,
            technology: 0,
            total: 0
        };
        
        const exemptIncome = {
            grants: 0,
            donations: 0, // Si están exentas
            total: 0
        };
        
        transactions.forEach(transaction => {
            if (transaction.taxable) {
                switch (transaction.type) {
                    case 'sponsorship':
                        taxableIncome.sponsorships += transaction.netAmount;
                        break;
                    case 'donation':
                        if (transaction.taxCategory === 'income') {
                            taxableIncome.donations += transaction.netAmount;
                        } else {
                            exemptIncome.donations += transaction.netAmount;
                        }
                        break;
                    default:
                        taxableIncome.other += transaction.netAmount;
                        break;
                }
            }
            
            if (transaction.deductible) {
                const expenseType = this.getDeductibleExpenseType(transaction.debitAccount);
                if (deductibleExpenses[expenseType] !== undefined) {
                    deductibleExpenses[expenseType] += transaction.amount;
                }
            }
        });
        
        // Calcular totales
        taxableIncome.total = Object.values(taxableIncome).reduce((sum, val) => 
            typeof val === 'number' ? sum + val : sum, 0);
        deductibleExpenses.total = Object.values(deductibleExpenses).reduce((sum, val) => 
            typeof val === 'number' ? sum + val : sum, 0);
        exemptIncome.total = Object.values(exemptIncome).reduce((sum, val) => 
            typeof val === 'number' ? sum + val : sum, 0);
        
        const netTaxableIncome = taxableIncome.total - deductibleExpenses.total;
        
        return {
            taxableIncome,
            deductibleExpenses,
            exemptIncome,
            netTaxableIncome,
            estimatedTax: this.calculateEstimatedTax(netTaxableIncome),
            quarterlyBreakdown: this.getQuarterlyTaxBreakdown(config),
            deductibleTransactions: transactions.filter(t => t.deductible),
            taxDocuments: this.generateTaxDocuments(config)
        };
    }
    
    /**
     * Genera reporte de análisis ROI integrado
     */
    generateROIAnalysisReport(config) {
        // Integración con roi-calculation.js si está disponible
        if (typeof window !== 'undefined' && window.roiCalculator) {
            const roiData = window.roiCalculator.getAllSponsorsROI();
            const financialData = this.getSponsorFinancialData(config);
            
            return {
                combinedAnalysis: this.combineROIAndFinancial(roiData, financialData),
                costEfficiency: this.calculateCostEfficiency(financialData),
                revenueProjections: this.projectRevenue(financialData),
                recommendations: this.generateFinancialRecommendations(roiData, financialData)
            };
        }
        
        // Fallback sin ROI calculator
        return {
            message: 'ROI Calculator not available',
            basicFinancialMetrics: this.getBasicFinancialMetrics(config)
        };
    }
    
    /**
     * Genera reporte de varianza presupuestaria
     */
    generateBudgetVarianceReport(config) {
        const budget = this.state.budgets.get(config.period);
        if (!budget) {
            throw new Error(`No budget found for period ${config.period}`);
        }
        
        const actual = this.getActualExpensesByCategory(config);
        const variance = {};
        
        Object.keys(budget.categories).forEach(category => {
            const budgetAmount = budget.categories[category];
            const actualAmount = actual[category] || 0;
            const varianceAmount = actualAmount - budgetAmount;
            const variancePercent = budgetAmount > 0 ? (varianceAmount / budgetAmount) * 100 : 0;
            
            variance[category] = {
                budget: budgetAmount,
                actual: actualAmount,
                variance: varianceAmount,
                variancePercent,
                status: this.getVarianceStatus(variancePercent)
            };
        });
        
        return {
            period: config.period,
            budget: budget.categories,
            actual,
            variance,
            summary: {
                totalBudget: Object.values(budget.categories).reduce((sum, val) => sum + val, 0),
                totalActual: Object.values(actual).reduce((sum, val) => sum + val, 0),
                overBudgetCount: Object.values(variance).filter(v => v.variance > 0).length,
                significantVariances: Object.entries(variance).filter(([, v]) => Math.abs(v.variancePercent) > 10)
            }
        };
    }
    
    /**
     * Genera reporte de pronósticos financieros
     */
    generateForecastReport(config) {
        const historicalData = this.getHistoricalTrends(12); // 12 meses de datos
        const seasonalFactors = this.calculateSeasonalFactors(historicalData);
        const trendAnalysis = this.analyzeTrends(historicalData);
        
        const forecast = {
            revenue: this.forecastRevenue(historicalData, seasonalFactors, 6), // 6 meses adelante
            expenses: this.forecastExpenses(historicalData, trendAnalysis, 6),
            cashFlow: {},
            scenarios: {
                conservative: {},
                optimistic: {},
                pessimistic: {}
            }
        };
        
        // Calcular flujo de caja proyectado
        forecast.revenue.forEach((revenue, index) => {
            const expenses = forecast.expenses[index];
            forecast.cashFlow[`month_${index + 1}`] = revenue.total - expenses.total;
        });
        
        // Generar escenarios
        forecast.scenarios.conservative = this.generateScenario(forecast, 0.8); // 80% de lo proyectado
        forecast.scenarios.optimistic = this.generateScenario(forecast, 1.2); // 120% de lo proyectado
        forecast.scenarios.pessimistic = this.generateScenario(forecast, 0.6); // 60% de lo proyectado
        
        return {
            forecast,
            methodology: {
                dataPoints: historicalData.length,
                forecastPeriod: 6,
                confidence: this.calculateForecastConfidence(historicalData),
                lastUpdated: new Date()
            },
            assumptions: this.getForecastAssumptions(),
            riskFactors: this.identifyRiskFactors(forecast)
        };
    }
    
    /**
     * Genera reporte de auditoría
     */
    generateAuditTrailReport(config) {
        const auditEntries = this.state.audits.filter(entry => 
            entry.timestamp >= config.startDate && entry.timestamp <= config.endDate
        );
        
        const byAction = {};
        const byUser = {};
        const byDate = {};
        
        auditEntries.forEach(entry => {
            // Por acción
            if (!byAction[entry.action]) byAction[entry.action] = [];
            byAction[entry.action].push(entry);
            
            // Por usuario
            if (!byUser[entry.user]) byUser[entry.user] = [];
            byUser[entry.user].push(entry);
            
            // Por fecha
            const dateKey = entry.timestamp.toISOString().split('T')[0];
            if (!byDate[dateKey]) byDate[dateKey] = [];
            byDate[dateKey].push(entry);
        });
        
        return {
            summary: {
                totalEntries: auditEntries.length,
                uniqueUsers: Object.keys(byUser).length,
                dateRange: {
                    start: config.startDate,
                    end: config.endDate
                },
                mostCommonAction: this.getMostCommon(byAction),
                mostActiveUser: this.getMostActive(byUser)
            },
            entries: auditEntries.sort((a, b) => b.timestamp - a.timestamp),
            byAction,
            byUser,
            byDate,
            suspiciousActivity: this.detectSuspiciousActivity(auditEntries),
            complianceChecks: this.runComplianceChecks(auditEntries)
        };
    }
    
    /**
     * Funciones de utilidad para reportes
     */
    
    getTransactionsForPeriod(startDate, endDate) {
        return Array.from(this.state.transactions.values()).filter(transaction =>
            transaction.date >= startDate && transaction.date <= endDate
        );
    }
    
    isRevenueAccount(accountCode) {
        return accountCode.startsWith('4');
    }
    
    isExpenseAccount(accountCode) {
        return accountCode.startsWith('5');
    }
    
    getRevenueType(accountCode) {
        const mapping = {
            '4000': 'sponsorship',
            '4100': 'donations',
            '4200': 'subscriptions',
            '4300': 'grants',
            '4400': 'other'
        };
        return mapping[accountCode] || 'other';
    }
    
    getExpenseType(accountCode) {
        const mapping = {
            '5000': 'operations',
            '5100': 'content',
            '5200': 'community',
            '5300': 'marketing',
            '5400': 'professional',
            '5500': 'technology',
            '5600': 'administrative'
        };
        return mapping[accountCode] || 'other';
    }
    
    getAccountBalance(accountCode) {
        const account = this.state.accounts.get(accountCode);
        return account ? account.balance : 0;
    }
    
    getMonthlyBreakdown(transactions) {
        const breakdown = {};
        
        transactions.forEach(transaction => {
            const monthKey = transaction.date.toISOString().substring(0, 7); // YYYY-MM
            
            if (!breakdown[monthKey]) {
                breakdown[monthKey] = {
                    count: 0,
                    total: 0,
                    fees: 0,
                    net: 0
                };
            }
            
            breakdown[monthKey].count++;
            breakdown[monthKey].total += transaction.amount;
            breakdown[monthKey].fees += transaction.processingFees;
            breakdown[monthKey].net += transaction.netAmount;
        });
        
        return breakdown;
    }
    
    getTopSponsors(sponsorData, limit = 10) {
        return Object.entries(sponsorData)
            .sort(([,a], [,b]) => b.revenue - a.revenue)
            .slice(0, limit)
            .map(([sponsorId, data]) => ({ sponsorId, ...data }));
    }
    
    getTopDonors(donorData, limit = 10) {
        return Object.entries(donorData)
            .sort(([,a], [,b]) => b.total - a.total)
            .slice(0, limit)
            .map(([donorId, data]) => ({ donorId, ...data }));
    }
    
    calculateDonorRetention(donorData) {
        const currentMonth = new Date();
        currentMonth.setDate(1); // Primer día del mes actual
        
        const lastMonth = new Date(currentMonth);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        let currentMonthDonors = 0;
        let retainedDonors = 0;
        
        Object.values(donorData).forEach(donor => {
            if (donor.lastDonation >= currentMonth) {
                currentMonthDonors++;
                
                // Verificar si también donó el mes pasado
                if (donor.lastDonation >= lastMonth && donor.count > 1) {
                    retainedDonors++;
                }
            }
        });
        
        return {
            currentMonthDonors,
            retainedDonors,
            retentionRate: currentMonthDonors > 0 ? (retainedDonors / currentMonthDonors) * 100 : 0,
            newDonors: currentMonthDonors - retainedDonors
        };
    }
    
    /**
     * Funciones de formateo y exportación
     */
    
    formatReport(report, format) {
        switch (format.toLowerCase()) {
            case 'json':
                return report;
            case 'csv':
                return this.convertToCSV(report);
            case 'pdf':
                return this.generatePDFReport(report);
            case 'excel':
                return this.generateExcelReport(report);
            default:
                return report;
        }
    }
    
    convertToCSV(report) {
        const csvData = [];
        
        // Header del reporte
        csvData.push(['Report Type', report.type]);
        csvData.push(['Generated', report.generatedAt.toISOString()]);
        csvData.push(['Period', `${report.startDate.toISOString()} to ${report.endDate.toISOString()}`]);
        csvData.push([]);
        
        // Datos específicos según el tipo de reporte
        switch (report.type) {
            case 'income-statement':
                csvData.push(['Revenue']);
                Object.entries(report.data.revenue).forEach(([key, value]) => {
                    if (typeof value === 'number') {
                        csvData.push([key, this.formatCurrency(value)]);
                    }
                });
                csvData.push([]);
                csvData.push(['Expenses']);
                Object.entries(report.data.expenses).forEach(([key, value]) => {
                    if (typeof value === 'number') {
                        csvData.push([key, this.formatCurrency(value)]);
                    }
                });
                break;
            
            case 'sponsor-revenue':
                csvData.push(['Sponsor ID', 'Revenue', 'Fees', 'Transaction Count']);
                Object.entries(report.data.bySponsor).forEach(([sponsorId, data]) => {
                    csvData.push([sponsorId, this.formatCurrency(data.revenue), 
                                 this.formatCurrency(data.fees), data.transactions.length]);
                });
                break;
                
            // Añadir más casos según necesidad
        }
        
        return csvData.map(row => row.join(',')).join('\n');
    }
    
    /**
     * Funciones de reconciliación y auditoría
     */
    
    reconcileAccount(accountCode, externalBalance, reconciliationDate = new Date()) {
        const account = this.state.accounts.get(accountCode);
        if (!account) {
            throw new Error(`Account ${accountCode} not found`);
        }
        
        const internalBalance = account.balance;
        const difference = externalBalance - internalBalance;
        
        const reconciliation = {
            id: this.generateReconciliationId(),
            accountCode,
            reconciliationDate,
            internalBalance,
            externalBalance,
            difference,
            status: Math.abs(difference) < 0.01 ? 'reconciled' : 'variance',
            performedBy: 'system',
            notes: '',
            adjustments: []
        };
        
        // Si hay diferencia, crear ajuste
        if (Math.abs(difference) >= 0.01) {
            reconciliation.adjustments.push({
                amount: difference,
                reason: 'Reconciliation adjustment',
                approvalRequired: Math.abs(difference) > 100
            });
        }
        
        this.state.reconciliations.set(reconciliation.id, reconciliation);
        account.lastReconciliation = reconciliationDate;
        
        this.addToAuditTrail('ACCOUNT_RECONCILED', {
            accountCode,
            difference,
            status: reconciliation.status
        });
        
        return reconciliation;
    }
    
    addToAuditTrail(action, details, userId = 'system') {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action,
            details,
            user: userId,
            ipAddress: this.getCurrentIP(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
        };
        
        this.state.audits.push(auditEntry);
        
        // Mantener solo los últimos 10000 registros de auditoría
        if (this.state.audits.length > 10000) {
            this.state.audits = this.state.audits.slice(-10000);
        }
        
        return auditEntry;
    }
    
    /**
     * Funciones de configuración automática
     */
    
    setupAutoReporting() {
        // Configurar reportes automáticos mensuales
        const monthlyReports = ['income-statement', 'sponsor-revenue', 'donation-summary'];
        
        monthlyReports.forEach(reportType => {
            this.scheduleReport(reportType, 'monthly');
        });
        
        // Reporte trimestral de balance
        this.scheduleReport('balance-sheet', 'quarterly');
        
        // Reporte anual de impuestos
        this.scheduleReport('tax-summary', 'annually');
    }
    
    scheduleReport(reportType, frequency) {
        const intervals = {
            'daily': 24 * 60 * 60 * 1000,
            'weekly': 7 * 24 * 60 * 60 * 1000,
            'monthly': 30 * 24 * 60 * 60 * 1000,
            'quarterly': 90 * 24 * 60 * 60 * 1000,
            'annually': 365 * 24 * 60 * 60 * 1000
        };
        
        const interval = intervals[frequency];
        if (interval) {
            setInterval(() => {
                try {
                    this.generateReport(reportType, { autoGenerated: true });
                } catch (error) {
                    console.error(`Error generating scheduled ${reportType} report:`, error);
                }
            }, interval);
        }
    }
    
    checkAutoReportingTriggers(transaction) {
        // Generar reporte especial si se alcanza un umbral
        const monthlyRevenue = this.getMonthlyRevenue();
        
        if (monthlyRevenue > 50000 && !this.state.highVolumeReportGenerated) {
            this.generateReport('income-statement', { 
                reason: 'High volume threshold reached',
                threshold: 50000 
            });
            this.state.highVolumeReportGenerated = true;
        }
    }
    
    /**
     * Funciones de ID generation
     */
    
    generateTransactionId() {
        return 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    generateReportId() {
        return 'RPT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    generateJournalEntryId() {
        return 'JE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    generateReconciliationId() {
        return 'REC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    generateAuditId() {
        return 'AUD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Funciones de utilidad general
     */
    
    formatCurrency(amount) {
        return new Intl.NumberFormat(this.config.locale, {
            style: 'currency',
            currency: this.config.currency
        }).format(amount);
    }
    
    getFiscalYear(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        return month >= this.config.fiscalYearStart ? year : year - 1;
    }
    
    getPeriodKey(date) {
        return `${this.getFiscalYear(date)}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    getPeriodStartDate(date = new Date()) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1);
    }
    
    getPeriodEndDate(date = new Date()) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0);
    }
    
    getCurrentIP() {
        // En un entorno real, esto vendría del servidor
        return '127.0.0.1';
    }
    
    handleError(errorType, error) {
        this.addToAuditTrail('ERROR', {
            type: errorType,
            message: error.message,
            stack: error.stack
        });
        
        // Notificar sistema de monitoreo
        this.trackEvent('financial_system_error', {
            type: errorType,
            message: error.message
        });
    }
    
    trackEvent(eventName, properties = {}) {
        const event = new CustomEvent('financialReporting:event', {
            detail: { eventName, properties, timestamp: new Date().toISOString() }
        });
        
        if (typeof document !== 'undefined') {
            document.dispatchEvent(event);
        }
        
        if (this.config.debug) {
            console.log('Financial Event:', eventName, properties);
        }
    }
    
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        if (typeof document !== 'undefined') {
            document.dispatchEvent(event);
        }
    }
    
    /**
     * API pública para integraciones
     */
    getPublicAPI() {
        return {
            // Registro de transacciones
            recordTransaction: this.recordTransaction.bind(this),
            
            // Generación de reportes
            generateReport: this.generateReport.bind(this),
            
            // Reconciliación
            reconcileAccount: this.reconcileAccount.bind(this),
            
            // Estado financiero
            getAccountBalance: this.getAccountBalance.bind(this),
            getTransactionHistory: (accountCode) => {
                const account = this.state.accounts.get(accountCode);
                return account ? account.transactions : [];
            },
            
            // Utilidades
            formatCurrency: this.formatCurrency.bind(this),
            getCurrentPeriod: () => this.state.currentPeriod,
            
            // Reportes rápidos
            getIncomeStatement: () => this.generateReport('income-statement'),
            getBalanceSheet: () => this.generateReport('balance-sheet'),
            getSponsorRevenue: () => this.generateReport('sponsor-revenue')
        };
    }
    
    /**
     * Cleanup y destructor
     */
    destroy() {
        // Limpiar intervalos programados
        if (this.scheduledReports) {
            this.scheduledReports.forEach(interval => clearInterval(interval));
        }
        
        // Backup final si está habilitado
        if (this.config.autoBackup) {
            this.createBackup();
        }
        
        // Limpiar estado
        this.state.transactions.clear();
        this.state.accounts.clear();
        this.state.reports.clear();
        this.state.periods.clear();
        
        console.log('Financial Reporting System destroyed');
    }
    
    createBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            data: {
                transactions: Array.from(this.state.transactions.entries()),
                accounts: Array.from(this.state.accounts.entries()),
                periods: Array.from(this.state.periods.entries()),
                audits: this.state.audits.slice(-1000) // Últimos 1000 registros
            }
        };
        
        // En un entorno real, esto se enviaría a un servicio de backup
        console.log('Financial backup created:', backup.timestamp);
        return backup;
    }
}

/**
 * Factory function para crear instancias del sistema de reportes
 */
function createFinancialReportingSystem(options = {}) {
    return new FinancialReportingSystem(options);
}

/**
 * Instancia global singleton
 */
let globalFinancialSystem = null;

/**
 * Función para obtener instancia global
 */
function getFinancialReportingSystem(options = {}) {
    if (!globalFinancialSystem) {
        globalFinancialSystem = new FinancialReportingSystem(options);
    }
    return globalFinancialSystem;
}

/**
 * Auto-inicialización
 */
document.addEventListener('DOMContentLoaded', () => {
    const configElement = document.querySelector('[data-financial-config]');
    if (configElement) {
        try {
            const config = JSON.parse(configElement.textContent);
            window.financialReporting = createFinancialReportingSystem(config);
        } catch (error) {
            console.error('Error parsing financial system config:', error);
            window.financialReporting = createFinancialReportingSystem();
        }
    }
});

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        FinancialReportingSystem, 
        createFinancialReportingSystem, 
        getFinancialReportingSystem 
    };
}