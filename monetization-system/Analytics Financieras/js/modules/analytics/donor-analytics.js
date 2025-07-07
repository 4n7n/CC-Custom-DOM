// Sistema de analytics de donantes
class DonorAnalytics {
    constructor() {
        this.donors = this.loadDonors();
        this.donations = this.loadDonations();
        this.segments = this.loadSegments();
        this.campaigns = this.loadCampaigns();
        this.cohorts = this.loadCohorts();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateAnalyticsDashboard();
        this.scheduleReports();
        this.initializeRealTimeTracking();
    }

    loadDonors() {
        try {
            return JSON.parse(localStorage.getItem('donors') || '[]');
        } catch (error) {
            return [];
        }
    }

    loadDonations() {
        try {
            return JSON.parse(localStorage.getItem('donations') || '[]');
        } catch (error) {
            return [];
        }
    }

    loadSegments() {
        return {
            byAmount: {
                micro: { min: 1, max: 10, name: 'Micro Donantes' },
                small: { min: 11, max: 50, name: 'Donantes Pequeños' },
                medium: { min: 51, max: 200, name: 'Donantes Medianos' },
                large: { min: 201, max: 1000, name: 'Donantes Grandes' },
                major: { min: 1001, max: Infinity, name: 'Donantes Principales' }
            },
            byFrequency: {
                oneTime: { name: 'Una Vez', condition: (donor) => donor.donationCount === 1 },
                occasional: { name: 'Ocasional', condition: (donor) => donor.donationCount >= 2 && donor.donationCount <= 5 },
                regular: { name: 'Regular', condition: (donor) => donor.donationCount >= 6 && donor.donationCount <= 12 },
                loyal: { name: 'Leal', condition: (donor) => donor.donationCount > 12 }
            },
            byRecency: {
                active: { name: 'Activo', days: 30 },
                recent: { name: 'Reciente', days: 90 },
                lapsed: { name: 'Inactivo', days: 365 },
                lost: { name: 'Perdido', days: Infinity }
            }
        };
    }

    loadCampaigns() {
        try {
            return JSON.parse(localStorage.getItem('campaigns') || '[]');
        } catch (error) {
            return [];
        }
    }

    loadCohorts() {
        try {
            return JSON.parse(localStorage.getItem('cohorts') || '{}');
        } catch (error) {
            return {};
        }
    }

    setupEventListeners() {
        // Escuchar nuevas donaciones
        document.addEventListener('donationCompleted', (e) => {
            this.recordDonation(e.detail);
        });

        // Controles del dashboard
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('segment-filter')) {
                this.filterBySegment(e.target.dataset.segment);
            }
            
            if (e.target.classList.contains('export-data')) {
                this.exportAnalyticsData(e.target.dataset.format);
            }
            
            if (e.target.classList.contains('create-campaign')) {
                this.createCampaign();
            }
        });

        // Filtros de tiempo
        document.getElementById('analytics-timeframe')?.addEventListener('change', (e) => {
            this.updateTimeframe(e.target.value);
        });
    }

    recordDonation(donationData) {
        const donation = {
            id: donationData.transactionId || `don_${Date.now()}`,
            donorEmail: donationData.email,
            amount: donationData.amount,
            type: donationData.type || 'one-time',
            paymentMethod: donationData.paymentMethod,
            source: donationData.source || 'website',
            campaign: donationData.campaign || 'general',
            timestamp: new Date().toISOString(),
            metadata: donationData.metadata || {}
        };

        this.donations.push(donation);
        this.updateDonorProfile(donation);
        this.updateCohortData(donation);
        this.saveDonations();
        this.updateAnalyticsDashboard();
    }

    updateDonorProfile(donation) {
        let donor = this.donors.find(d => d.email === donation.donorEmail);
        
        if (!donor) {
            donor = {
                id: `donor_${Date.now()}`,
                email: donation.donorEmail,
                firstDonation: donation.timestamp,
                totalAmount: 0,
                donationCount: 0,
                averageDonation: 0,
                lastDonation: null,
                isRecurring: false,
                preferredAmount: 0,
                preferredMethod: donation.paymentMethod,
                acquisitionSource: donation.source,
                acquisitionCampaign: donation.campaign,
                segments: [],
                cohort: this.getCohortName(donation.timestamp),
                lifetime: {
                    totalValue: 0,
                    frequency: 0,
                    recency: 0
                }
            };
            this.donors.push(donor);
        }

        // Actualizar estadísticas
        donor.totalAmount += donation.amount;
        donor.donationCount += 1;
        donor.averageDonation = donor.totalAmount / donor.donationCount;
        donor.lastDonation = donation.timestamp;
        donor.isRecurring = donation.type === 'monthly' || donor.isRecurring;

        // Actualizar método preferido (más usado)
        const methodCounts = this.donations
            .filter(d => d.donorEmail === donor.email)
            .reduce((acc, d) => {
                acc[d.paymentMethod] = (acc[d.paymentMethod] || 0) + 1;
                return acc;
            }, {});
        
        donor.preferredMethod = Object.entries(methodCounts)
            .sort(([,a], [,b]) => b - a)[0][0];

        // Calcular cantidad preferida (mediana)
        const amounts = this.donations
            .filter(d => d.donorEmail === donor.email)
            .map(d => d.amount)
            .sort((a, b) => a - b);
        
        const mid = Math.floor(amounts.length / 2);
        donor.preferredAmount = amounts.length % 2 !== 0 ? 
            amounts[mid] : 
            (amounts[mid - 1] + amounts[mid]) / 2;

        // Actualizar segmentos
        donor.segments = this.calculateDonorSegments(donor);

        // Actualizar métricas de lifetime
        donor.lifetime = this.calculateLifetimeMetrics(donor);

        this.saveDonors();
    }

    calculateDonorSegments(donor) {
        const segments = [];
        
        // Segmentación por cantidad
        for (const [key, segment] of Object.entries(this.segments.byAmount)) {
            if (donor.averageDonation >= segment.min && donor.averageDonation <= segment.max) {
                segments.push(`amount_${key}`);
                break;
            }
        }

        // Segmentación por frecuencia
        for (const [key, segment] of Object.entries(this.segments.byFrequency)) {
            if (segment.condition(donor)) {
                segments.push(`frequency_${key}`);
                break;
            }
        }

        // Segmentación por recencia
        if (donor.lastDonation) {
            const daysSinceLastDonation = Math.floor(
                (new Date() - new Date(donor.lastDonation)) / (1000 * 60 * 60 * 24)
            );
            
            for (const [key, segment] of Object.entries(this.segments.byRecency)) {
                if (daysSinceLastDonation <= segment.days) {
                    segments.push(`recency_${key}`);
                    break;
                }
            }
        }

        return segments;
    }

    calculateLifetimeMetrics(donor) {
        const donations = this.donations.filter(d => d.donorEmail === donor.email);
        
        // Lifetime Value
        const totalValue = donations.reduce((sum, d) => sum + d.amount, 0);
        
        // Frequency (donaciones por mes)
        const firstDonation = new Date(donor.firstDonation);
        const monthsActive = Math.max(1, Math.floor((new Date() - firstDonation) / (1000 * 60 * 60 * 24 * 30)));
        const frequency = donations.length / monthsActive;
        
        // Recency (días desde última donación)
        const recency = donor.lastDonation ? 
            Math.floor((new Date() - new Date(donor.lastDonation)) / (1000 * 60 * 60 * 24)) : 
            Infinity;

        return {
            totalValue: totalValue,
            frequency: frequency,
            recency: recency,
            score: this.calculateLoyaltyScore(totalValue, frequency, recency)
        };
    }

    calculateLoyaltyScore(value, frequency, recency) {
        // RFM Score simplificado (0-100)
        const valueScore = Math.min(100, (value / 1000) * 100); // Máximo en €1000
        const frequencyScore = Math.min(100, frequency * 20); // Máximo en 5 donaciones/mes
        const recencyScore = Math.max(0, 100 - (recency / 365 * 100)); // Máximo en 1 año
        
        return Math.round((valueScore * 0.4 + frequencyScore * 0.3 + recencyScore * 0.3));
    }

    getCohortName(timestamp) {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    updateCohortData(donation) {
        const cohortName = this.getCohortName(donation.timestamp);
        
        if (!this.cohorts[cohortName]) {
            this.cohorts[cohortName] = {
                name: cohortName,
                startDate: donation.timestamp,
                totalDonors: 0,
                totalDonations: 0,
                totalRevenue: 0,
                retentionByMonth: {}
            };
        }

        const cohort = this.cohorts[cohortName];
        const donor = this.donors.find(d => d.email === donation.donorEmail);
        
        // Si es primera donación del donante, incrementar total de donantes
        if (donor && donor.donationCount === 1) {
            cohort.totalDonors += 1;
        }

        cohort.totalDonations += 1;
        cohort.totalRevenue += donation.amount;

        // Calcular retención por mes
        this.updateCohortRetention(cohortName);
        this.saveCohorts();
    }

    updateCohortRetention(cohortName) {
        const cohort = this.cohorts[cohortName];
        const cohortStart = new Date(cohort.startDate);
        const cohortDonors = this.donors.filter(d => d.cohort === cohortName);
        
        for (let month = 0; month <= 12; month++) {
            const periodStart = new Date(cohortStart);
            periodStart.setMonth(periodStart.getMonth() + month);
            const periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            
            const activeDonors = cohortDonors.filter(donor => {
                const donorDonations = this.donations.filter(d => 
                    d.donorEmail === donor.email &&
                    new Date(d.timestamp) >= periodStart &&
                    new Date(d.timestamp) < periodEnd
                );
                return donorDonations.length > 0;
            }).length;
            
            const retentionRate = cohort.totalDonors > 0 ? 
                Math.round((activeDonors / cohort.totalDonors) * 100) : 0;
            
            cohort.retentionByMonth[month] = {
                activeDonors: activeDonors,
                retentionRate: retentionRate
            };
        }
    }

    updateAnalyticsDashboard() {
        this.renderOverviewStats();
        this.renderDonorSegmentation();
        this.renderCohortAnalysis();
        this.renderTrendCharts();
        this.renderTopDonors();
        this.renderCampaignPerformance();
    }

    renderOverviewStats() {
        const container = document.getElementById('donor-overview-stats');
        if (!container) return;

        const stats = this.getOverviewStats();
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-number">${stats.totalDonors.toLocaleString()}</div>
                        <div class="stat-label">Total Donantes</div>
                        <div class="stat-change ${stats.donorGrowth >= 0 ? 'positive' : 'negative'}">
                            ${stats.donorGrowth >= 0 ? '↗' : '↘'} ${Math.abs(stats.donorGrowth).toFixed(1)}%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-number">€${stats.averageDonation.toFixed(2)}</div>
                        <div class="stat-label">Donación Promedio</div>
                        <div class="stat-change ${stats.avgDonationGrowth >= 0 ? 'positive' : 'negative'}">
                            ${stats.avgDonationGrowth >= 0 ? '↗' : '↘'} ${Math.abs(stats.avgDonationGrowth).toFixed(1)}%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">🔄</div>
                    <div class="stat-content">
                        <div class="stat-number">${stats.retentionRate.toFixed(1)}%</div>
                        <div class="stat-label">Tasa de Retención</div>
                        <div class="stat-change ${stats.retentionGrowth >= 0 ? 'positive' : 'negative'}">
                            ${stats.retentionGrowth >= 0 ? '↗' : '↘'} ${Math.abs(stats.retentionGrowth).toFixed(1)}%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-content">
                        <div class="stat-number">${stats.loyaltyScore.toFixed(0)}</div>
                        <div class="stat-label">Score de Lealtad</div>
                        <div class="stat-change ${stats.loyaltyGrowth >= 0 ? 'positive' : 'negative'}">
                            ${stats.loyaltyGrowth >= 0 ? '↗' : '↘'} ${Math.abs(stats.loyaltyGrowth).toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getOverviewStats() {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        const thisMonthDonations = this.donations.filter(d => new Date(d.timestamp) >= thisMonth);
        const lastMonthDonations = this.donations.filter(d => {
            const date = new Date(d.timestamp);
            return date >= lastMonth && date < thisMonth;
        });

        const thisMonthDonors = new Set(thisMonthDonations.map(d => d.donorEmail)).size;
        const lastMonthDonors = new Set(lastMonthDonations.map(d => d.donorEmail)).size;
        
        const thisMonthAvg = thisMonthDonations.length > 0 ? 
            thisMonthDonations.reduce((sum, d) => sum + d.amount, 0) / thisMonthDonations.length : 0;
        const lastMonthAvg = lastMonthDonations.length > 0 ? 
            lastMonthDonations.reduce((sum, d) => sum + d.amount, 0) / lastMonthDonations.length : 0;

        const retentionRate = this.calculateRetentionRate();
        const loyaltyScore = this.calculateAverageLoyaltyScore();

        return {
            totalDonors: this.donors.length,
            donorGrowth: lastMonthDonors > 0 ? ((thisMonthDonors - lastMonthDonors) / lastMonthDonors) * 100 : 0,
            averageDonation: thisMonthAvg,
            avgDonationGrowth: lastMonthAvg > 0 ? ((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100 : 0,
            retentionRate: retentionRate,
            retentionGrowth: 0, // Calcular crecimiento de retención
            loyaltyScore: loyaltyScore,
            loyaltyGrowth: 0 // Calcular crecimiento de lealtad
        };
    }

    calculateRetentionRate() {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const eligibleDonors = this.donors.filter(d => 
            new Date(d.firstDonation) <= threeMonthsAgo
        );
        
        const retainedDonors = eligibleDonors.filter(d => 
            d.lastDonation && new Date(d.lastDonation) >= threeMonthsAgo
        );
        
        return eligibleDonors.length > 0 ? (retainedDonors.length / eligibleDonors.length) * 100 : 0;
    }

    calculateAverageLoyaltyScore() {
        if (this.donors.length === 0) return 0;
        
        const totalScore = this.donors.reduce((sum, donor) => sum + (donor.lifetime?.score || 0), 0);
        return totalScore / this.donors.length;
    }

    renderDonorSegmentation() {
        const container = document.getElementById('donor-segmentation');
        if (!container) return;

        const segmentData = this.getSegmentationData();
        
        container.innerHTML = `
            <div class="segmentation-header">
                <h3>Segmentación de Donantes</h3>
                <div class="segment-filters">
                    ${Object.keys(this.segments).map(type => `
                        <button class="segment-filter" data-segment="${type}">
                            ${this.getSegmentTypeName(type)}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div class="segmentation-charts">
                ${Object.entries(segmentData).map(([type, segments]) => `
                    <div class="segment-chart" data-type="${type}">
                        <h4>${this.getSegmentTypeName(type)}</h4>
                        <div class="segment-bars">
                            ${Object.entries(segments).map(([key, data]) => `
                                <div class="segment-bar">
                                    <div class="segment-info">
                                        <span class="segment-name">${data.name}</span>
                                        <span class="segment-count">${data.count} (${data.percentage.toFixed(1)}%)</span>
                                    </div>
                                    <div class="segment-progress">
                                        <div class="segment-fill" style="width: ${data.percentage}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getSegmentationData() {
        const data = {};
        
        Object.entries(this.segments).forEach(([type, segments]) => {
            data[type] = {};
            
            Object.entries(segments).forEach(([key, segment]) => {
                let count = 0;
                
                if (type === 'byAmount') {
                    count = this.donors.filter(d => 
                        d.averageDonation >= segment.min && d.averageDonation <= segment.max
                    ).length;
                } else if (type === 'byFrequency') {
                    count = this.donors.filter(segment.condition).length;
                } else if (type === 'byRecency') {
                    count = this.donors.filter(d => {
                        if (!d.lastDonation) return false;
                        const daysSince = Math.floor((new Date() - new Date(d.lastDonation)) / (1000 * 60 * 60 * 24));
                        return daysSince <= segment.days;
                    }).length;
                }
                
                data[type][key] = {
                    name: segment.name,
                    count: count,
                    percentage: this.donors.length > 0 ? (count / this.donors.length) * 100 : 0
                };
            });
        });
        
        return data;
    }

    getSegmentTypeName(type) {
        const names = {
            byAmount: 'Por Cantidad',
            byFrequency: 'Por Frecuencia',
            byRecency: 'Por Recencia'
        };
        return names[type] || type;
    }

    renderCohortAnalysis() {
        const container = document.getElementById('cohort-analysis');
        if (!container) return;

        const cohortData = Object.values(this.cohorts)
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
            .slice(0, 12); // Últimos 12 meses

        container.innerHTML = `
            <div class="cohort-header">
                <h3>Análisis de Cohortes</h3>
                <p>Retención de donantes por mes de adquisición</p>
            </div>
            
            <div class="cohort-table">
                <div class="cohort-table-header">
                    <div class="cohort-month">Cohorte</div>
                    <div class="cohort-size">Tamaño</div>
                    ${Array.from({length: 6}, (_, i) => `<div class="cohort-period">Mes ${i}</div>`).join('')}
                </div>
                
                ${cohortData.map(cohort => `
                    <div class="cohort-row">
                        <div class="cohort-month">${cohort.name}</div>
                        <div class="cohort-size">${cohort.totalDonors}</div>
                        ${Array.from({length: 6}, (_, i) => {
                            const retention = cohort.retentionByMonth[i];
                            const rate = retention ? retention.retentionRate : 0;
                            return `<div class="cohort-cell" style="background-color: ${this.getRetentionColor(rate)}">${rate}%</div>`;
                        }).join('')}
                    </div>
                `).join('')}
            </div>
        `;
    }

    getRetentionColor(rate) {
        if (rate >= 80) return '#48bb78';
        if (rate >= 60) return '#ed8936';
        if (rate >= 40) return '#ecc94b';
        if (rate >= 20) return '#f56565';
        return '#e2e8f0';
    }

    renderTopDonors() {
        const container = document.getElementById('top-donors');
        if (!container) return;

        const topDonors = this.donors
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 10);

        container.innerHTML = `
            <div class="top-donors-header">
                <h3>Top Donantes</h3>
                <div class="donor-tabs">
                    <button class="donor-tab active" data-sort="amount">Por Cantidad</button>
                    <button class="donor-tab" data-sort="frequency">Por Frecuencia</button>
                    <button class="donor-tab" data-sort="loyalty">Por Lealtad</button>
                </div>
            </div>
            
            <div class="donors-list">
                ${topDonors.map((donor, index) => `
                    <div class="donor-item">
                        <div class="donor-rank">#${index + 1}</div>
                        <div class="donor-info">
                            <div class="donor-email">${this.maskEmail(donor.email)}</div>
                            <div class="donor-stats">
                                <span class="stat">€${donor.totalAmount.toLocaleString()} total</span>
                                <span class="stat">${donor.donationCount} donaciones</span>
                                <span class="stat">Score: ${donor.lifetime?.score || 0}</span>
                            </div>
                        </div>
                        <div class="donor-segments">
                            ${donor.segments.map(segment => `
                                <span class="segment-tag">${this.getSegmentDisplayName(segment)}</span>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    maskEmail(email) {
        const [local, domain] = email.split('@');
        const maskedLocal = local.length > 2 ? 
            local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1) :
            local;
        return `${maskedLocal}@${domain}`;
    }

    getSegmentDisplayName(segment) {
        const [type, key] = segment.split('_');
        const segmentTypes = {
            amount: this.segments.byAmount,
            frequency: this.segments.byFrequency,
            recency: this.segments.byRecency
        };
        
        return segmentTypes[type]?.[key]?.name || segment;
    }

    scheduleReports() {
        // Reportes automáticos diarios
        setInterval(() => {
            this.generateDailyReport();
        }, 24 * 60 * 60 * 1000);

        // Reportes semanales
        setInterval(() => {
            if (new Date().getDay() === 1) { // Lunes
                this.generateWeeklyReport();
            }
        }, 24 * 60 * 60 * 1000);
    }

    generateDailyReport() {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        const todayDonations = this.donations.filter(d => {
            const donationDate = new Date(d.timestamp);
            return donationDate.toDateString() === today.toDateString();
        });

        const report = {
            date: today.toDateString(),
            newDonors: new Set(todayDonations.map(d => d.donorEmail)).size,
            totalDonations: todayDonations.length,
            totalRevenue: todayDonations.reduce((sum, d) => sum + d.amount, 0),
            averageDonation: todayDonations.length > 0 ? 
                todayDonations.reduce((sum, d) => sum + d.amount, 0) / todayDonations.length : 0,
            topSegments: this.getTopSegmentsToday(),
            retentionEvents: this.getRetentionEventsToday()
        };

        console.log('Daily Report:', report);
        return report;
    }

    initializeRealTimeTracking() {
        // Simular tracking en tiempo real
        setInterval(() => {
            this.updateRealTimeMetrics();
        }, 30000); // Cada 30 segundos
    }

    updateRealTimeMetrics() {
        const container = document.getElementById('real-time-metrics');
        if (!container) return;

        const metrics = this.getRealTimeMetrics();
        
        container.innerHTML = `
            <div class="real-time-header">
                <h4>📊 Métricas en Tiempo Real</h4>
                <span class="last-updated">Actualizado: ${new Date().toLocaleTimeString()}</span>
            </div>
            
            <div class="real-time-stats">
                <div class="real-time-stat">
                    <span class="stat-label">Donaciones Hoy</span>
                    <span class="stat-value">${metrics.todayDonations}</span>
                </div>
                <div class="real-time-stat">
                    <span class="stat-label">Ingresos Hoy</span>
                    <span class="stat-value">€${metrics.todayRevenue.toFixed(2)}</span>
                </div>
                <div class="real-time-stat">
                    <span class="stat-label">Donantes Activos</span>
                    <span class="stat-value">${metrics.activeDonors}</span>
                </div>
            </div>
        `;
    }

    getRealTimeMetrics() {
        const today = new Date().toDateString();
        const todayDonations = this.donations.filter(d => 
            new Date(d.timestamp).toDateString() === today
        );

        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activeDonors = this.donors.filter(d => 
            d.lastDonation && new Date(d.lastDonation) >= last30Days
        ).length;

        return {
            todayDonations: todayDonations.length,
            todayRevenue: todayDonations.reduce((sum, d) => sum + d.amount, 0),
            activeDonors: activeDonors
        };
    }

    // Métodos de persistencia
    saveDonors() {
        localStorage.setItem('donors', JSON.stringify(this.donors));
    }

    saveDonations() {
        localStorage.setItem('donations', JSON.stringify(this.donations));
    }

    saveCohorts() {
        localStorage.setItem('cohorts', JSON.stringify(this.cohorts));
    }

    // API pública
    exportAnalyticsData(format = 'json') {
        const data = {
            donors: this.donors,
            donations: this.donations,
            segments: this.getSegmentationData(),
            cohorts: this.cohorts,
            summary: this.getOverviewStats(),
            exportedAt: new Date().toISOString()
        };

        if (format === 'csv') {
            return this.convertToCSV(data);
        }

        return data;
    }

    convertToCSV(data) {
        // Convertir donantes a CSV
        const donorHeaders = ['Email', 'Primera Donación', 'Total Donado', 'Número de Donaciones', 'Promedio', 'Última Donación'];
        const donorRows = data.donors.map(d => [
            d.email,
            d.firstDonation,
            d.totalAmount,
            d.donationCount,
            d.averageDonation.toFixed(2),
            d.lastDonation || 'N/A'
        ]);

        return [donorHeaders, ...donorRows].map(row => row.join(',')).join('\n');
    }

    getDonorInsights(donorEmail) {
        const donor = this.donors.find(d => d.email === donorEmail);
        if (!donor) return null;

        const donorDonations = this.donations.filter(d => d.donorEmail === donorEmail);
        
        return {
            profile: donor,
            donations: donorDonations,
            trends: this.analyzeDonorTrends(donorDonations),
            predictions: this.predictDonorBehavior(donor),
            recommendations: this.getDonorRecommendations(donor)
        };
    }

    analyzeDonorTrends(donations) {
        if (donations.length < 2) return null;

        const sortedDonations = donations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const amounts = sortedDonations.map(d => d.amount);
        
        // Calcular tendencia de cantidad
        const avgFirst = amounts.slice(0, Math.ceil(amounts.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(amounts.length / 2);
        const avgLast = amounts.slice(Math.floor(amounts.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(amounts.length / 2);
        
        return {
            amountTrend: avgLast > avgFirst ? 'increasing' : 'decreasing',
            amountChange: ((avgLast - avgFirst) / avgFirst * 100).toFixed(1),
            frequencyTrend: this.calculateFrequencyTrend(sortedDonations),
            consistency: this.calculateConsistency(amounts)
        };
    }

    predictDonorBehavior(donor) {
        // Predicciones simples basadas en patrones
        const daysSinceLastDonation = donor.lastDonation ? 
            Math.floor((new Date() - new Date(donor.lastDonation)) / (1000 * 60 * 60 * 24)) : null;

        let churnRisk = 'low';
        if (daysSinceLastDonation > 180) churnRisk = 'high';
        else if (daysSinceLastDonation > 90) churnRisk = 'medium';

        let nextDonationLikelihood = 'high';
        if (donor.donationCount === 1 && daysSinceLastDonation > 60) nextDonationLikelihood = 'low';
        else if (daysSinceLastDonation > 120) nextDonationLikelihood = 'medium';

        return {
            churnRisk: churnRisk,
            nextDonationLikelihood: nextDonationLikelihood,
            recommendedAmount: Math.round(donor.preferredAmount),
            bestContactTime: this.predictBestContactTime(donor)
        };
    }

    getDonorRecommendations(donor) {
        const recommendations = [];

        if (donor.donationCount === 1) {
            recommendations.push({
                type: 'retention',
                message: 'Enviar seguimiento de agradecimiento',
                priority: 'high'
            });
        }

        if (donor.averageDonation < 25 && donor.donationCount > 3) {
            recommendations.push({
                type: 'upgrade',
                message: 'Candidato para upgrade de donación',
                priority: 'medium'
            });
        }

        if (donor.lifetime.recency > 90) {
            recommendations.push({
                type: 'reactivation',
                message: 'Necesita campaña de reactivación',
                priority: 'high'
            });
        }

        return recommendations;
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.donorAnalytics = new DonorAnalytics();
});

// Exportar para uso global
window.DonorAnalytics = DonorAnalytics;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DonorAnalytics;
}