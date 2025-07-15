/**
 * Impact Charts Component
 * Genera y gestiona gráficos de impacto para el dashboard
 */

class ImpactCharts {
    constructor(config = {}) {
        this.config = {
            animationDuration: 750,
            enableAnimations: true,
            responsiveResize: true,
            theme: 'light',
            colorScheme: 'default',
            ...config
        };
        
        this.charts = new Map();
        this.chartData = new Map();
        this.chartConfigs = new Map();
        this.resizeObserver = null;
        this.listeners = new Set();
        
        this.defaultColors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#06b6d4'
        };
        
        this.chartTypes = {
            funding: 'line',
            sponsors: 'doughnut',
            reach: 'bar',
            growth: 'area',
            engagement: 'radar',
            distribution: 'pie'
        };
    }

    /**
     * Inicializa el componente de gráficos
     */
    async initialize() {
        try {
            console.log('📊 Inicializando Impact Charts...');
            
            // Configurar observador de redimensionamiento
            this.setupResizeObserver();
            
            // Cargar configuraciones de gráficos
            this.loadChartConfigs();
            
            // Generar datos de ejemplo
            this.generateSampleData();
            
            console.log('✅ Impact Charts inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Impact Charts:', error);
            throw error;
        }
    }

    /**
     * Crea un gráfico de impacto
     */
    createChart(containerId, chartType, data, options = {}) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} no encontrado`);
            }
            
            // Limpiar container
            container.innerHTML = '';
            
            // Crear canvas
            const canvas = document.createElement('canvas');
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            container.appendChild(canvas);
            
            // Configurar chart
            const chartConfig = this.buildChartConfig(chartType, data, options);
            
            // Crear chart (simulado - en producción usaría Chart.js o similar)
            const chart = this.createCanvasChart(canvas, chartConfig);
            
            // Guardar referencia
            this.charts.set(containerId, chart);
            this.chartData.set(containerId, data);
            this.chartConfigs.set(containerId, chartConfig);
            
            // Notificar creación
            this.notifyListeners('chart:created', { 
                containerId, 
                chartType, 
                chart 
            });
            
            return chart;
            
        } catch (error) {
            console.error('Error creando gráfico:', error);
            throw error;
        }
    }

    /**
     * Construye la configuración del gráfico
     */
    buildChartConfig(chartType, data, options) {
        const baseConfig = {
            type: chartType,
            data: this.processChartData(data, chartType),
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: this.config.enableAnimations ? this.config.animationDuration : 0
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: this.defaultColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                ...options
            }
        };
        
        // Configuraciones específicas por tipo
        switch (chartType) {
            case 'line':
                baseConfig.options.scales = this.getLineScales();
                break;
                
            case 'bar':
                baseConfig.options.scales = this.getBarScales();
                break;
                
            case 'doughnut':
            case 'pie':
                baseConfig.options.cutout = chartType === 'doughnut' ? '60%' : '0%';
                break;
                
            case 'radar':
                baseConfig.options.scales = this.getRadarScales();
                break;
        }
        
        return baseConfig;
    }

    /**
     * Procesa los datos para el gráfico
     */
    processChartData(rawData, chartType) {
        const colors = this.generateColorPalette(rawData.datasets?.length || 1);
        
        const processedData = {
            labels: rawData.labels || [],
            datasets: (rawData.datasets || []).map((dataset, index) => ({
                label: dataset.label || `Dataset ${index + 1}`,
                data: dataset.data || [],
                backgroundColor: this.getBackgroundColors(colors[index], chartType),
                borderColor: colors[index],
                borderWidth: chartType === 'line' ? 3 : 1,
                fill: chartType === 'area',
                tension: chartType === 'line' ? 0.4 : 0,
                pointBackgroundColor: colors[index],
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: chartType === 'line' ? 6 : 0,
                pointHoverRadius: chartType === 'line' ? 8 : 0,
                ...dataset
            }))
        };
        
        return processedData;
    }

    /**
     * Crea un gráfico en canvas (simulado)
     */
    createCanvasChart(canvas, config) {
        const ctx = canvas.getContext('2d');
        
        // Simular gráfico básico
        const chart = {
            canvas,
            ctx,
            config,
            data: config.data,
            options: config.options,
            type: config.type
        };
        
        // Renderizar gráfico simulado
        this.renderSimulatedChart(chart);
        
        return chart;
    }

    /**
     * Renderiza un gráfico simulado
     */
    renderSimulatedChart(chart) {
        const { ctx, canvas, config } = chart;
        const { width, height } = canvas;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, width, height);
        
        // Fondo
        ctx.fillStyle = this.config.theme === 'dark' ? '#1f2937' : '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Renderizar según tipo
        switch (config.type) {
            case 'line':
                this.renderLineChart(chart);
                break;
                
            case 'bar':
                this.renderBarChart(chart);
                break;
                
            case 'doughnut':
            case 'pie':
                this.renderDoughnutChart(chart);
                break;
                
            case 'radar':
                this.renderRadarChart(chart);
                break;
                
            default:
                this.renderPlaceholder(chart);
        }
        
        // Renderizar leyenda
        this.renderLegend(chart);
    }

    /**
     * Renderiza gráfico de líneas
     */
    renderLineChart(chart) {
        const { ctx, canvas, data } = chart;
        const { width, height } = canvas;
        const padding = 60;
        
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        
        // Encontrar valores min/max
        const allValues = data.datasets.flatMap(d => d.data);
        const minValue = Math.min(...allValues) * 0.9;
        const maxValue = Math.max(...allValues) * 1.1;
        
        data.datasets.forEach((dataset, datasetIndex) => {
            ctx.strokeStyle = dataset.borderColor;
            ctx.lineWidth = dataset.borderWidth;
            ctx.beginPath();
            
            dataset.data.forEach((value, index) => {
                const x = padding + (index / (data.labels.length - 1)) * chartWidth;
                const y = padding + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                // Puntos
                ctx.fillStyle = dataset.pointBackgroundColor;
                ctx.beginPath();
                ctx.arc(x, y, dataset.pointRadius, 0, 2 * Math.PI);
                ctx.fill();
            });
            
            ctx.stroke();
        });
        
        // Ejes
        this.renderAxes(chart, padding, chartWidth, chartHeight, minValue, maxValue);
    }

    /**
     * Renderiza gráfico de barras
     */
    renderBarChart(chart) {
        const { ctx, canvas, data } = chart;
        const { width, height } = canvas;
        const padding = 60;
        
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        
        const maxValue = Math.max(...data.datasets.flatMap(d => d.data)) * 1.1;
        const barWidth = chartWidth / data.labels.length * 0.8;
        const barSpacing = chartWidth / data.labels.length * 0.2;
        
        data.datasets.forEach((dataset, datasetIndex) => {
            dataset.data.forEach((value, index) => {
                const x = padding + index * (barWidth + barSpacing) + datasetIndex * (barWidth / data.datasets.length);
                const barHeight = (value / maxValue) * chartHeight;
                const y = padding + chartHeight - barHeight;
                
                ctx.fillStyle = dataset.backgroundColor;
                ctx.fillRect(x, y, barWidth / data.datasets.length, barHeight);
                
                ctx.strokeStyle = dataset.borderColor;
                ctx.lineWidth = dataset.borderWidth;
                ctx.strokeRect(x, y, barWidth / data.datasets.length, barHeight);
            });
        });
        
        // Ejes
        this.renderAxes(chart, padding, chartWidth, chartHeight, 0, maxValue);
    }

    /**
     * Renderiza gráfico de dona/pie
     */
    renderDoughnutChart(chart) {
        const { ctx, canvas, data } = chart;
        const { width, height } = canvas;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 40;
        
        const dataset = data.datasets[0];
        const total = dataset.data.reduce((sum, value) => sum + value, 0);
        
        let currentAngle = -Math.PI / 2;
        
        dataset.data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.fillStyle = Array.isArray(dataset.backgroundColor) 
                ? dataset.backgroundColor[index] 
                : dataset.backgroundColor;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            
            if (chart.config.type === 'doughnut') {
                ctx.arc(centerX, centerY, radius * 0.6, currentAngle + sliceAngle, currentAngle, true);
            } else {
                ctx.lineTo(centerX, centerY);
            }
            
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            currentAngle += sliceAngle;
        });
    }

    /**
     * Renderiza gráfico radar
     */
    renderRadarChart(chart) {
        const { ctx, canvas, data } = chart;
        const { width, height } = canvas;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 60;
        
        const angles = data.labels.map((_, index) => 
            (index / data.labels.length) * 2 * Math.PI - Math.PI / 2
        );
        
        // Grilla radial
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        
        for (let i = 1; i <= 5; i++) {
            const r = (radius / 5) * i;
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        // Líneas radiales
        angles.forEach(angle => {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
            ctx.stroke();
        });
        
        // Datos
        const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
        
        data.datasets.forEach(dataset => {
            ctx.strokeStyle = dataset.borderColor;
            ctx.fillStyle = dataset.backgroundColor;
            ctx.lineWidth = dataset.borderWidth;
            
            ctx.beginPath();
            
            dataset.data.forEach((value, index) => {
                const angle = angles[index];
                const distance = (value / maxValue) * radius;
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });
    }

    /**
     * Renderiza placeholder
     */
    renderPlaceholder(chart) {
        const { ctx, canvas } = chart;
        const { width, height } = canvas;
        
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#6b7280';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📊 Gráfico de Impacto', width / 2, height / 2);
        
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('Los datos se cargarán automáticamente', width / 2, height / 2 + 25);
    }

    /**
     * Renderiza ejes
     */
    renderAxes(chart, padding, chartWidth, chartHeight, minValue, maxValue) {
        const { ctx, canvas, data } = chart;
        
        // Eje X
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();
        
        // Eje Y
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.stroke();
        
        // Etiquetas X
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        data.labels.forEach((label, index) => {
            const x = padding + (index / (data.labels.length - 1)) * chartWidth;
            ctx.fillText(label, x, padding + chartHeight + 20);
        });
        
        // Etiquetas Y
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i <= 5; i++) {
            const value = minValue + (maxValue - minValue) * (i / 5);
            const y = padding + chartHeight - (i / 5) * chartHeight;
            ctx.fillText(Math.round(value).toLocaleString(), padding - 10, y);
        }
    }

    /**
     * Renderiza leyenda
     */
    renderLegend(chart) {
        const { ctx, canvas, data } = chart;
        const { width, height } = canvas;
        
        const legendHeight = 40;
        const legendY = height - legendHeight + 10;
        const itemWidth = width / data.datasets.length;
        
        ctx.font = '12px Inter, sans-serif';
        ctx.textBaseline = 'middle';
        
        data.datasets.forEach((dataset, index) => {
            const x = index * itemWidth + itemWidth / 2;
            
            // Color box
            ctx.fillStyle = dataset.backgroundColor;
            ctx.fillRect(x - 40, legendY, 12, 12);
            
            // Label
            ctx.fillStyle = '#374151';
            ctx.textAlign = 'left';
            ctx.fillText(dataset.label, x - 25, legendY + 6);
        });
    }

    /**
     * Actualiza los datos de un gráfico existente
     */
    updateChart(containerId, newData, animate = true) {
        try {
            const chart = this.charts.get(containerId);
            if (!chart) {
                console.warn(`Gráfico ${containerId} no encontrado`);
                return false;
            }
            
            // Actualizar datos
            chart.data = this.processChartData(newData, chart.type);
            this.chartData.set(containerId, newData);
            
            // Re-renderizar
            if (animate && this.config.enableAnimations) {
                this.animateChartUpdate(chart);
            } else {
                this.renderSimulatedChart(chart);
            }
            
            // Notificar actualización
            this.notifyListeners('chart:updated', { 
                containerId, 
                chart, 
                newData 
            });
            
            return true;
            
        } catch (error) {
            console.error('Error actualizando gráfico:', error);
            return false;
        }
    }

    /**
     * Anima la actualización de un gráfico
     */
    animateChartUpdate(chart) {
        const startTime = performance.now();
        const duration = this.config.animationDuration;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Aplicar easing
            const easedProgress = this.easeOutCubic(progress);
            
            // Interpolar datos (simplificado)
            this.renderSimulatedChart(chart);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Elimina un gráfico
     */
    destroyChart(containerId) {
        try {
            const chart = this.charts.get(containerId);
            if (!chart) return false;
            
            // Limpiar canvas
            const { ctx, canvas } = chart;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Remover del DOM
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
            
            // Limpiar referencias
            this.charts.delete(containerId);
            this.chartData.delete(containerId);
            this.chartConfigs.delete(containerId);
            
            // Notificar eliminación
            this.notifyListeners('chart:destroyed', { containerId });
            
            return true;
            
        } catch (error) {
            console.error('Error eliminando gráfico:', error);
            return false;
        }
    }

    /**
     * Crea gráfico de tendencias de donaciones
     */
    createDonationTrendChart(containerId, timeRange = '30d') {
        const data = this.generateDonationTrendData(timeRange);
        
        return this.createChart(containerId, 'line', data, {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
        callback: function(value) {
            return '₡' + value.toLocaleString();
        }
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Tendencia de Donaciones'
                }
            }
        });
    }

    /**
     * Crea gráfico de distribución por tiers
     */
    createTierDistributionChart(containerId) {
        const data = this.generateTierDistributionData();
        
        return this.createChart(containerId, 'doughnut', data, {
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución por Tiers'
                }
            }
        });
    }

    /**
     * Crea gráfico de crecimiento mensual
     */
    createGrowthChart(containerId) {
        const data = this.generateGrowthData();
        
        return this.createChart(containerId, 'bar', data, {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Crecimiento Mensual'
                }
            }
        });
    }

    /**
     * Crea gráfico de engagement
     */
    createEngagementChart(containerId) {
        const data = this.generateEngagementData();
        
        return this.createChart(containerId, 'radar', data, {
            scales: {
                r: {
                    beginAtZero: true,
                    max: 10
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Métricas de Engagement'
                }
            }
        });
    }

    /**
     * Genera datos de tendencia de donaciones
     */
    generateDonationTrendData(timeRange) {
        const periods = this.getPeriodsForRange(timeRange);
        const baseAmount = 15000;
        
        return {
            labels: periods,
            datasets: [{
                label: 'Donaciones',
                data: periods.map((_, index) => {
                    const trend = 1 + (index * 0.1) + (Math.random() * 0.2 - 0.1);
                    return Math.round(baseAmount * trend);
                }),
                borderColor: this.defaultColors.primary,
                backgroundColor: this.defaultColors.primary + '20',
                fill: true
            }]
        };
    }

    /**
     * Genera datos de distribución por tiers
     */
    generateTierDistributionData() {
        return {
            labels: ['Platinum', 'Gold', 'Silver', 'Bronze', 'Supporter'],
            datasets: [{
                data: [3, 5, 8, 12, 25],
                backgroundColor: [
                    '#9333ea',
                    '#f59e0b', 
                    '#64748b',
                    '#dc2626',
                    '#6b7280'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };
    }

    /**
     * Genera datos de crecimiento
     */
    generateGrowthData() {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        
        return {
            labels: months,
            datasets: [{
                label: 'Crecimiento (%)',
                data: [12, 19, 23, 18, 25, 31],
                backgroundColor: this.defaultColors.success + '80',
                borderColor: this.defaultColors.success,
                borderWidth: 2
            }]
        };
    }

    /**
     * Genera datos de engagement
     */
    generateEngagementData() {
        return {
            labels: ['Interacción', 'Retención', 'Satisfacción', 'Participación', 'Recomendación'],
            datasets: [{
                label: 'Promedio General',
                data: [7.5, 8.2, 9.1, 6.8, 7.9],
                borderColor: this.defaultColors.primary,
                backgroundColor: this.defaultColors.primary + '30',
                pointBackgroundColor: this.defaultColors.primary,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }, {
                label: 'Patrocinadores Top',
                data: [9.2, 9.5, 9.8, 8.7, 9.1],
                borderColor: this.defaultColors.success,
                backgroundColor: this.defaultColors.success + '30',
                pointBackgroundColor: this.defaultColors.success,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        };
    }

    /**
     * Obtiene períodos para un rango de tiempo
     */
    getPeriodsForRange(timeRange) {
        const now = new Date();
        const periods = [];
        
        switch (timeRange) {
            case '7d':
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now);
                    date.setDate(date.getDate() - i);
                    periods.push(date.toLocaleDateString('es-ES', { weekday: 'short' }));
                }
                break;
                
            case '30d':
                for (let i = 29; i >= 0; i -= 7) {
                    const date = new Date(now);
                    date.setDate(date.getDate() - i);
                    periods.push(date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
                }
                break;
                
            case '90d':
                for (let i = 90; i >= 0; i -= 30) {
                    const date = new Date(now);
                    date.setDate(date.getDate() - i);
                    periods.push(date.toLocaleDateString('es-ES', { month: 'short' }));
                }
                break;
                
            case '1y':
                for (let i = 11; i >= 0; i--) {
                    const date = new Date(now);
                    date.setMonth(date.getMonth() - i);
                    periods.push(date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));
                }
                break;
                
            default:
                periods.push('Hoy');
        }
        
        return periods;
    }

    /**
     * Genera paleta de colores
     */
    generateColorPalette(count) {
        const colors = [
            this.defaultColors.primary,
            this.defaultColors.success,
            this.defaultColors.warning,
            this.defaultColors.danger,
            this.defaultColors.info,
            this.defaultColors.secondary
        ];
        
        // Si necesitamos más colores, generar dinámicamente
        while (colors.length < count) {
            const hue = (colors.length * 137.5) % 360; // Golden angle
            colors.push(`hsl(${hue}, 70%, 50%)`);
        }
        
        return colors.slice(0, count);
    }

    /**
     * Obtiene colores de fondo según tipo de gráfico
     */
    getBackgroundColors(color, chartType) {
        switch (chartType) {
            case 'line':
                return color + '20';
                
            case 'bar':
                return color + '80';
                
            case 'doughnut':
            case 'pie':
                return color;
                
            case 'radar':
                return color + '30';
                
            default:
                return color + '50';
        }
    }

    /**
     * Configura escalas para gráficos de línea
     */
    getLineScales() {
        return {
            x: {
                grid: {
                    color: '#f3f4f6'
                },
                ticks: {
                    color: '#6b7280'
                }
            },
            y: {
                grid: {
                    color: '#f3f4f6'
                },
                ticks: {
                    color: '#6b7280'
                }
            }
        };
    }

    /**
     * Configura escalas para gráficos de barras
     */
    getBarScales() {
        return {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#6b7280'
                }
            },
            y: {
                grid: {
                    color: '#f3f4f6'
                },
                ticks: {
                    color: '#6b7280'
                }
            }
        };
    }

    /**
     * Configura escalas para gráficos radar
     */
    getRadarScales() {
        return {
            r: {
                grid: {
                    color: '#f3f4f6'
                },
                pointLabels: {
                    color: '#6b7280'
                },
                ticks: {
                    color: '#6b7280',
                    backdropColor: 'transparent'
                }
            }
        };
    }

    /**
     * Configura observador de redimensionamiento
     */
    setupResizeObserver() {
        if (!this.config.responsiveResize) return;
        
        this.resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const containerId = entry.target.id;
                const chart = this.charts.get(containerId);
                
                if (chart) {
                    const { canvas } = chart;
                    const { width, height } = entry.contentRect;
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    this.renderSimulatedChart(chart);
                }
            });
        });
        
        // Observar containers de gráficos existentes
        document.querySelectorAll('[id*="chart"], [id*="Chart"]').forEach(container => {
            this.resizeObserver.observe(container);
        });
    }

    /**
     * Carga configuraciones de gráficos
     */
    loadChartConfigs() {
        // Configuraciones predefinidas por tipo de gráfico
        this.chartConfigs.set('default', {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: this.config.animationDuration
            }
        });
    }

    /**
     * Genera datos de muestra
     */
    generateSampleData() {
        // Datos de ejemplo para desarrollo
        this.sampleData = {
            donations: this.generateDonationTrendData('30d'),
            tiers: this.generateTierDistributionData(),
            growth: this.generateGrowthData(),
            engagement: this.generateEngagementData()
        };
    }

    /**
     * Función de easing
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Exporta gráfico como imagen
     */
    exportChart(containerId, format = 'png') {
        const chart = this.charts.get(containerId);
        if (!chart) return null;
        
        const { canvas } = chart;
        
        switch (format) {
            case 'png':
                return canvas.toDataURL('image/png');
                
            case 'jpeg':
                return canvas.toDataURL('image/jpeg', 0.9);
                
            default:
                return canvas.toDataURL();
        }
    }

    /**
     * Obtiene estadísticas de un gráfico
     */
    getChartStats(containerId) {
        const chart = this.charts.get(containerId);
        const data = this.chartData.get(containerId);
        
        if (!chart || !data) return null;
        
        return {
            type: chart.type,
            datasets: data.datasets.length,
            dataPoints: data.datasets.reduce((total, dataset) => total + dataset.data.length, 0),
            lastUpdated: new Date(),
            size: {
                width: chart.canvas.width,
                height: chart.canvas.height
            }
        };
    }

    /**
     * Event listeners
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error en listener de gráfico:', error);
            }
        });
    }

    /**
     * Destructor
     */
    destroy() {
        // Destruir todos los gráficos
        for (const containerId of this.charts.keys()) {
            this.destroyChart(containerId);
        }
        
        // Desconectar resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Limpiar datos
        this.charts.clear();
        this.chartData.clear();
        this.chartConfigs.clear();
        this.listeners.clear();
        
        console.log('🧹 Impact Charts destruido correctamente');
    }
}

// Exportar para uso global
window.ImpactCharts = ImpactCharts;