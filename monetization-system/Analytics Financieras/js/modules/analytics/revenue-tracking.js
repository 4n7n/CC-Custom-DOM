// Sistema de seguimiento de ingresos
class RevenueTracking {
    constructor() {
        this.transactions = this.loadTransactions();
        this.goals = this.loadGoals();
        this.categories = {
            donations: 'Donaciones',
            sponsorships: 'Patrocinios',
            services: 'Servicios',
            products: 'Productos',
            grants: 'Subvenciones',
            other: 'Otros'
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDashboard();
        this.scheduleReports();
    }

    setupEventListeners() {
        // Escuchar eventos de donaciones
        document.addEventListener('donationCompleted', (e) => {
            this.recordTransaction({
                type: 'donation',
                amount: e.detail.amount,
                source: e.detail.paymentMethod,
                recurring: e.detail.type === 'monthly',
                donor: e.detail.email
            });
        });

        // Escuchar eventos de patrocinio
        document.addEventListener('sponsorshipCompleted', (e) => {
            this.recordTransaction({
                type: 'sponsorship',
                amount: e.detail.amount,
                source: e.detail.tier,
                recurring: true,
                sponsor: e.detail.companyName
            });
        });
    }

    recordTransaction(data) {
        const transaction = {
            id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            timestamp: new Date(),
            category: this.mapTypeToCategory(data.type),
            amount: parseFloat(data.amount),
            currency: 'EUR',
            source: data.source || 'unknown',
            recurring: data.recurring || false,
            status: 'completed',
            metadata: {
                donor: data.donor,
                sponsor: data.sponsor,
                originalType: data.type
            }
        };

        this.transactions.push(transaction);
        this.saveTransactions();
        this.updateDashboard();
        this.checkGoals();
        
        return transaction;
    }

    mapTypeToCategory(type) {
        const mapping = {
            'donation': 'donations',
            'sponsorship': 'sponsorships',
            'micro-donation': 'donations',
            'recurring-donation': 'donations'
        };
        return mapping[type] || 'other';
    }

    updateDashboard() {
        this.updateRevenueCards();
        this.updateCharts();
        this.updateGoalProgress();
        this.updateRecentTransactions();
    }

    updateRevenueCards() {
        const stats = this.getRevenueStats();
        
        // Total revenue
        this.updateCard('total-revenue', {
            value: `€${stats.total.toLocaleString()}`,
            change: stats.totalChange,
            period: 'Total'
        });

        // Monthly revenue
        this.updateCard('monthly-revenue', {
            value: `€${stats.thisMonth.toLocaleString()}`,
            change: stats.monthlyChange,
            period: 'Este mes'
        });

        // Average donation
        this.updateCard('avg-donation', {
            value: `€${stats.avgDonation.toFixed(2)}`,
            change: stats.avgChange,
            period: 'Promedio'
        });

        // Recurring revenue
        this.updateCard('recurring-revenue', {
            value: `€${stats.recurring.toLocaleString()}`,
            change: stats.recurringChange,
            period: 'Recurrente/mes'
        });
    }

    updateCard(cardId, data) {
        const card = document.getElementById(cardId);
        if (!card) return;

        card.innerHTML = `
            <div class="card-header">
                <h3>${data.period}</h3>
                <span class="change-indicator ${data.change >= 0 ? 'positive' : 'negative'}">
                    ${data.change >= 0 ? '↗' : '↘'} ${Math.abs(data.change).toFixed(1)}%
                </span>
            </div>
            <div class="card-value">${data.value}</div>
        `;
    }

    getRevenueStats() {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Filtrar transacciones
        const thisMonthTxns = this.transactions.filter(t => 
            new Date(t.timestamp) >= thisMonth && new Date(t.timestamp) <= now
        );
        
        const lastMonthTxns = this.transactions.filter(t => 
            new Date(t.timestamp) >= lastMonth && new Date(t.timestamp) < thisMonth
        );

        // Calcular estadísticas
        const total = this.transactions.reduce((sum, t) => sum + t.amount, 0);
        const thisMonthTotal = thisMonthTxns.reduce((sum, t) => sum + t.amount, 0);
        const lastMonthTotal = lastMonthTxns.reduce((sum, t) => sum + t.amount, 0);
        
        const recurringTxns = this.transactions.filter(t => t.recurring);
        const recurringMonthly = recurringTxns.reduce((sum, t) => sum + t.amount, 0);
        
        const avgDonation = this.transactions.length > 0 ? total / this.transactions.length : 0;
        
        return {
            total,
            thisMonth: thisMonthTotal,
            lastMonth: lastMonthTotal,
            totalChange: lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0,
            monthlyChange: lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0,
            avgDonation,
            avgChange: 0, // Calcular cambio promedio
            recurring: recurringMonthly,
            recurringChange: 0 // Calcular cambio recurrente
        };
    }

    updateCharts() {
        this.updateRevenueChart();
        this.updateCategoryChart();
        this.updateTrendChart();
    }

    updateRevenueChart() {
        const chartContainer = document.getElementById('revenue-chart');
        if (!chartContainer) return;

        const monthlyData = this.getMonthlyRevenueData();
        
        // Crear gráfico simple con CSS
        chartContainer.innerHTML = `
            <div class="chart-header">
                <h3>Ingresos por Mes</h3>
            </div>
            <div class="chart-bars">
                ${monthlyData.map(month => `
                    <div class="chart-bar">
                        <div class="bar-fill" style="height: ${month.percentage}%"></div>
                        <div class="bar-label">${month.label}</div>
                        <div class="bar-value">€${month.value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getMonthlyRevenueData() {
        const months = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            
            const monthTransactions = this.transactions.filter(t => {
                const txDate = new Date(t.timestamp);
                return txDate >= month && txDate < nextMonth;
            });
            
            const value = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
            
            months.push({
                label: month.toLocaleDateString('es-ES', { month: 'short' }),
                value: value,
                percentage: 0 // Se calculará después
            });
        }
        
        // Calcular porcentajes relativos
        const maxValue = Math.max(...months.map(m => m.value));
        months.forEach(month => {
            month.percentage = maxValue > 0 ? (month.value / maxValue) * 100 : 0;
        });
        
        return months;
    }

    updateCategoryChart() {
        const chartContainer = document.getElementById('category-chart');
        if (!chartContainer) return;

        const categoryData = this.getCategoryData();
        const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
        
        chartContainer.innerHTML = `
            <div class="chart-header">
                <h3>Ingresos por Categoría</h3>
            </div>
            <div class="category-breakdown">
                ${categoryData.map(category => `
                    <div class="category-item">
                        <div class="category-bar">
                            <div class="category-fill" style="width: ${total > 0 ? (category.value / total) * 100 : 0}%"></div>
                        </div>
                        <div class="category-info">
                            <span class="category-name">${category.name}</span>
                            <span class="category-value">€${category.value.toLocaleString()}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getCategoryData() {
        const categoryTotals = {};
        
        this.transactions.forEach(transaction => {
            const category = transaction.category;
            categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
        });
        
        return Object.entries(categoryTotals).map(([key, value]) => ({
            key,
            name: this.categories[key] || key,
            value
        })).sort((a, b) => b.value - a.value);
    }

    updateGoalProgress() {
        const container = document.getElementById('goals-progress');
        if (!container) return;

        const currentProgress = this.getCurrentGoalProgress();
        
        container.innerHTML = this.goals.map(goal => {
            const progress = this.calculateGoalProgress(goal);
            return `
                <div class="goal-item">
                    <div class="goal-header">
                        <h4>${goal.name}</h4>
                        <span class="goal-amount">€${goal.target.toLocaleString()}</span>
                    </div>
                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                        </div>
                        <div class="progress-text">
                            €${progress.current.toLocaleString()} / €${goal.target.toLocaleString()} (${progress.percentage.toFixed(1)}%)
                        </div>
                    </div>
                    <div class="goal-timeline">
                        ${this.getGoalTimelineText(goal, progress)}
                    </div>
                </div>
            `;
        }).join('');
    }

    calculateGoalProgress(goal) {
        const now = new Date();
        const startDate = new Date(goal.startDate);
        const endDate = new Date(goal.endDate);
        
        const relevantTransactions = this.transactions.filter(t => {
            const txDate = new Date(t.timestamp);
            return txDate >= startDate && txDate <= endDate && 
                   (!goal.category || t.category === goal.category);
        });
        
        const current = relevantTransactions.reduce((sum, t) => sum + t.amount, 0);
        const percentage = goal.target > 0 ? (current / goal.target) * 100 : 0;
        
        return {
            current,
            percentage: Math.min(percentage, 100),
            remaining: Math.max(goal.target - current, 0),
            daysLeft: Math.max(Math.ceil((endDate - now) / (24 * 60 * 60 * 1000)), 0)
        };
    }

    getGoalTimelineText(goal, progress) {
        if (progress.percentage >= 100) {
            return '🎉 ¡Meta alcanzada!';
        }
        
        if (progress.daysLeft === 0) {
            return '⏰ Meta expirada';
        }
        
        return `📅 ${progress.daysLeft} días restantes • €${progress.remaining.toLocaleString()} para la meta`;
    }

    updateRecentTransactions() {
        const container = document.getElementById('recent-transactions');
        if (!container) return;

        const recent = this.transactions
            .slice(-10)
            .reverse();

        container.innerHTML = `
            <div class="transactions-header">
                <h3>Transacciones Recientes</h3>
                <button class="view-all-btn">Ver todas</button>
            </div>
            <div class="transactions-list">
                ${recent.map(transaction => `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <div class="transaction-type">${this.categories[transaction.category]}</div>
                            <div class="transaction-date">${new Date(transaction.timestamp).toLocaleDateString('es-ES')}</div>
                        </div>
                        <div class="transaction-amount">+€${transaction.amount.toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    checkGoals() {
        this.goals.forEach(goal => {
            const progress = this.calculateGoalProgress(goal);
            
            // Notificar si se alcanza una meta
            if (progress.percentage >= 100 && !goal.completed) {
                this.notifyGoalCompleted(goal);
                goal.completed = true;
                this.saveGoals();
            }
            
            // Notificar si se está cerca de la meta
            if (progress.percentage >= 90 && progress.percentage < 100 && !goal.nearCompletion) {
                this.notifyGoalNearCompletion(goal, progress);
                goal.nearCompletion = true;
                this.saveGoals();
            }
        });
    }

    notifyGoalCompleted(goal) {
        this.showNotification({
            type: 'success',
            title: '🎉 ¡Meta Alcanzada!',
            message: `Has completado la meta "${goal.name}" de €${goal.target.toLocaleString()}`,
            duration: 10000
        });
    }

    notifyGoalNearCompletion(goal, progress) {
        this.showNotification({
            type: 'info',
            title: '🎯 Cerca de la Meta',
            message: `Estás al ${progress.percentage.toFixed(1)}% de completar "${goal.name}"`,
            duration: 5000
        });
    }

    showNotification(options) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${options.type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${options.title}</h4>
                <p>${options.message}</p>
                <button class="close-notification">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });
        
        setTimeout(() => {
            notification.remove();
        }, options.duration || 5000);
    }

    scheduleReports() {
        // Programar informes automáticos
        setInterval(() => {
            this.generateDailyReport();
        }, 24 * 60 * 60 * 1000); // Cada 24 horas
    }

    generateDailyReport() {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        const todayTransactions = this.transactions.filter(t => {
            const txDate = new Date(t.timestamp);
            return txDate.toDateString() === today.toDateString();
        });
        
        const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        console.log(`Informe diario - ${today.toDateString()}: €${todayRevenue.toLocaleString()}`);
        
        return {
            date: today,
            transactions: todayTransactions.length,
            revenue: todayRevenue,
            categories: this.getCategoryBreakdown(todayTransactions)
        };
    }

    getCategoryBreakdown(transactions) {
        const breakdown = {};
        transactions.forEach(t => {
            breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
        });
        return breakdown;
    }

    // Métodos de persistencia
    loadTransactions() {
        try {
            return JSON.parse(localStorage.getItem('revenueTransactions') || '[]');
        } catch (error) {
            return [];
        }
    }

    saveTransactions() {
        try {
            localStorage.setItem('revenueTransactions', JSON.stringify(this.transactions));
        } catch (error) {
            console.error('Error saving transactions:', error);
        }
    }

    loadGoals() {
        try {
            const defaultGoals = [
                {
                    id: 'monthly_goal',
                    name: 'Meta Mensual',
                    target: 5000,
                    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
                    category: null
                }
            ];
            
            return JSON.parse(localStorage.getItem('revenueGoals') || JSON.stringify(defaultGoals));
        } catch (error) {
            return [];
        }
    }

    saveGoals() {
        try {
            localStorage.setItem('revenueGoals', JSON.stringify(this.goals));
        } catch (error) {
            console.error('Error saving goals:', error);
        }
    }

    // API pública
    exportData(format = 'json') {
        const data = {
            transactions: this.transactions,
            goals: this.goals,
            stats: this.getRevenueStats(),
            exportedAt: new Date()
        };
        
        if (format === 'csv') {
            return this.convertToCSV(data.transactions);
        }
        
        return data;
    }

    convertToCSV(transactions) {
        const headers = ['ID', 'Fecha', 'Categoría', 'Cantidad', 'Moneda', 'Fuente', 'Recurrente'];
        const rows = transactions.map(t => [
            t.id,
            new Date(t.timestamp).toISOString(),
            t.category,
            t.amount,
            t.currency,
            t.source,
            t.recurring
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.revenueTracking = new RevenueTracking();
});

// Exportar para uso global
window.RevenueTracking = RevenueTracking;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RevenueTracking;
}