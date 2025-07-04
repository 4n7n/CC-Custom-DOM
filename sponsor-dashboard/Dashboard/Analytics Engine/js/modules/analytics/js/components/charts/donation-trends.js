/**
 * DONATION TRENDS SYSTEM
 * Sistema de análisis de tendencias de donaciones
 */

class DonationTrends {
    constructor(options = {}) {
        this.options = {
            currency: 'EUR',
            apiEndpoint: '/api/donations',
            refreshInterval: 300000, // 5 minutos
            ...options
        };

        this.donations = [];
        this.trends = new Map();
        this.forecasts = new Map();
        this.init();
    }

    init() {
        this.loadDonationData();
        this.calculateTrends();
        this.startAutoRefresh();
        console.log('💰 Donation Trends inicializado');
    }

    // Cargar datos de donaciones
    async loadDonationData() {
        try {
            if (this.options.apiEndpoint) {
                const response = await fetch(this.options.apiEndpoint);
                this.donations = await response.json();
            } else {
                this.donations = this.getMockData();
            }
            this.calculateTrends();
        } catch (error) {
            console.warn('Error cargando datos:', error);
            this.donations = this.getMockData();
        }
    }

    // Calcular tendencias principales
    calculateTrends() {
        const now = new Date();
        const periods = {
            daily: this.filterByPeriod(1),
            weekly: this.filterByPeriod(7),
            monthly: this.filterByPeriod(30),
            quarterly: this.filterByPeriod(90)
        };

        Object.entries(periods).forEach(([period, data]) => {
            this.trends.set(period, {
                total: this.calculateTotal(data),
                average: this.calculateAverage(data),
                count: data.length,
                growth: this.calculateGrowth(data),
                topDonors: this.getTopDonors(data),
                byCategory: this.groupByCategory(data),
                byAmount: this.groupByAmount(data)
            });
        });

        this.generateForecasts();
    }

    // Filtrar donaciones por período
    filterByPeriod(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return this.donations.filter(donation => 
            new Date(donation.date) >= cutoff
        );
    }

    // Cálculos básicos
    calculateTotal(donations) {
        return donations.reduce((sum, d) => sum + d.amount, 0);
    }

    calculateAverage(donations) {
        return donations.length > 0 ? this.calculateTotal(donations) / donations.length : 0;
    }

    calculateGrowth(donations) {
        if (donations.length < 2) return 0;
        
        const sortedDonations = donations.sort((a, b) => new Date(a.date) - new Date(b.date));
        const midpoint = Math.floor(sortedDonations.length / 2);
        
        const firstHalf = sortedDonations.slice(0, midpoint);
        const secondHalf = sortedDonations.slice(midpoint);
        
        const firstTotal = this.calculateTotal(firstHalf);
        const secondTotal = this.calculateTotal(secondHalf);
        
        return firstTotal > 0 ? ((secondTotal - firstTotal) / firstTotal) * 100 : 0;
    }

    // Análisis por categorías
    groupByCategory(donations) {
        const categories = {};
        donations.forEach(donation => {
            const category = donation.category || 'general';
            if (!categories[category]) {
                categories[category] = { total: 0, count: 0 };
            }
            categories[category].total += donation.amount;
            categories[category].count++;
        });
        return categories;
    }

    // Análisis por rangos de monto
    groupByAmount(donations) {
        const ranges = {
            'small': { min: 0, max: 50, total: 0, count: 0 },
            'medium': { min: 51, max: 200, total: 0, count: 0 },
            'large': { min: 201, max: 1000, total: 0, count: 0 },
            'major': { min: 1001, max: Infinity, total: 0, count: 0 }
        };

        donations.forEach(donation => {
            Object.keys(ranges).forEach(range => {
                const { min, max } = ranges[range];
                if (donation.amount >= min && donation.amount <= max) {
                    ranges[range].total += donation.amount;
                    ranges[range].count++;
                }
            });
        });

        return ranges;
    }

    // Top donantes
    getTopDonors(donations) {
        const donors = {};
        donations.forEach(donation => {
            const donorId = donation.donorId || 'anonymous';
            if (!donors[donorId]) {
                donors[donorId] = { 
                    total: 0, 
                    count: 0, 
                    name: donation.donorName || 'Anónimo' 
                };
            }
            donors[donorId].total += donation.amount;
            donors[donorId].count++;
        });

        return Object.entries(donors)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10)
            .map(([id, data]) => ({ id, ...data }));
    }

    // Generar pronósticos
    generateForecasts() {
        const monthlyData = this.getMonthlyTotals();
        
        this.forecasts.set('next_month', this.forecastNextPeriod(monthlyData));
        this.forecasts.set('next_quarter', this.forecastQuarter(monthlyData));
        this.forecasts.set('year_end', this.forecastYearEnd(monthlyData));
    }

    getMonthlyTotals() {
        const monthly = {};
        this.donations.forEach(donation => {
            const date = new Date(donation.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthly[key] = (monthly[key] || 0) + donation.amount;
        });
        return Object.values(monthly);
    }

    forecastNextPeriod(data) {
        if (data.length < 3) return data[data.length - 1] || 0;
        
        const recent = data.slice(-3);
        const trend = (recent[2] - recent[0]) / 2;
        return Math.max(0, recent[2] + trend);
    }

    forecastQuarter(data) {
        const forecast = this.forecastNextPeriod(data);
        return forecast * 3; // 3 meses
    }

    forecastYearEnd(data) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const yearToDate = this.calculateTotal(
            this.donations.filter(d => new Date(d.date).getFullYear() === currentYear)
        );
        
        const monthsRemaining = 12 - currentMonth;
        const avgMonthly = yearToDate / currentMonth;
        
        return yearToDate + (avgMonthly * monthsRemaining);
    }

    // Datos de ejemplo
    getMockData() {
        const donations = [];
        const now = new Date();
        
        for (let i = 0; i < 100; i++) {
            const date = new Date(now - Math.random() * 90 * 24 * 60 * 60 * 1000);
            donations.push({
                id: `donation_${i}`,
                amount: Math.floor(Math.random() * 500) + 10,
                date: date.toISOString(),
                category: ['education', 'health', 'environment', 'community'][Math.floor(Math.random() * 4)],
                donorId: `donor_${Math.floor(Math.random() * 20)}`,
                donorName: `Donante ${Math.floor(Math.random() * 20)}`
            });
        }
        
        return donations.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Métodos públicos
    getTrends(period = 'monthly') {
        return this.trends.get(period);
    }

    getForecasts() {
        return Object.fromEntries(this.forecasts.entries());
    }

    getDonationsByPeriod(period) {
        const periodMap = { daily: 1, weekly: 7, monthly: 30, quarterly: 90 };
        return this.filterByPeriod(periodMap[period] || 30);
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadDonationData();
        }, this.options.refreshInterval);
    }

    // Crear gráfico simple
    createChart(container, period = 'monthly') {
        const trends = this.getTrends(period);
        if (!trends) return;

        const chart = document.createElement('div');
        chart.className = 'donation-chart';
        chart.innerHTML = `
            <h3>📊 Tendencias de Donaciones - ${period}</h3>
            <div class="chart-stats">
                <div class="stat">
                    <span class="value">€${trends.total.toLocaleString()}</span>
                    <span class="label">Total</span>
                </div>
                <div class="stat">
                    <span class="value">${trends.count}</span>
                    <span class="label">Donaciones</span>
                </div>
                <div class="stat">
                    <span class="value">€${Math.round(trends.average)}</span>
                    <span class="label">Promedio</span>
                </div>
                <div class="stat">
                    <span class="value ${trends.growth >= 0 ? 'positive' : 'negative'}">
                        ${trends.growth >= 0 ? '+' : ''}${trends.growth.toFixed(1)}%
                    </span>
                    <span class="label">Crecimiento</span>
                </div>
            </div>
            <div class="categories">
                <h4>Por Categoría:</h4>
                ${Object.entries(trends.byCategory).map(([cat, data]) => `
                    <div class="category-item">
                        <span>${cat}: €${data.total.toLocaleString()}</span>
                        <span>(${data.count} donaciones)</span>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(chart);
        return chart;
    }
}

// Estilos CSS
const donationStyles = `
<style>
.donation-chart {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin: 1rem 0;
}

.donation-chart h3 {
    margin: 0 0 1rem 0;
    color: #374151;
}

.chart-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat {
    text-align: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 6px;
}

.stat .value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
}

.stat .value.positive { color: #10b981; }
.stat .value.negative { color: #ef4444; }

.stat .label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
}

.categories h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
}

.category-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
}
</style>
`;

if (!document.querySelector('#donation-styles')) {
    const style = document.createElement('div');
    style.id = 'donation-styles';
    style.innerHTML = donationStyles;
    document.head.appendChild(style);
}

window.DonationTrends = DonationTrends;