// Calculadora de impacto para donaciones
class ImpactCalculator {
    constructor() {
        this.impactRates = {
            development: { rate: 25, unit: 'horas', description: 'horas de desarrollo' },
            features: { rate: 50, unit: 'características', description: 'nuevas características' },
            bugs: { rate: 10, unit: 'bugs', description: 'bugs corregidos' },
            documentation: { rate: 15, unit: 'páginas', description: 'páginas de documentación' },
            testing: { rate: 20, unit: 'pruebas', description: 'pruebas automatizadas' },
            hosting: { rate: 5, unit: 'meses', description: 'meses de hosting' },
            security: { rate: 100, unit: 'auditorías', description: 'auditorías de seguridad' }
        };
        
        this.milestones = [
            { amount: 50, title: 'Contribuidor Básico', rewards: ['Agradecimiento público', 'Acceso a updates'] },
            { amount: 100, title: 'Partidario Activo', rewards: ['Badge exclusivo', 'Acceso anticipado'] },
            { amount: 250, title: 'Colaborador Premium', rewards: ['Mentoría personalizada', 'Certificado digital'] },
            { amount: 500, title: 'Socio Estratégico', rewards: ['Consulta privada', 'Nombre en créditos'] },
            { amount: 1000, title: 'Patrocinador Platinum', rewards: ['Sesión 1:1', 'Reconocimiento especial'] }
        ];
    }

    calculateImpact(amount, type = 'one-time') {
        const multiplier = type === 'monthly' ? 12 : 1;
        const totalAmount = amount * multiplier;
        
        const impacts = Object.entries(this.impactRates).map(([key, config]) => {
            const quantity = Math.floor(totalAmount / config.rate);
            return {
                category: key,
                quantity: quantity,
                description: `${quantity} ${config.description}`,
                icon: this.getImpactIcon(key)
            };
        }).filter(impact => impact.quantity > 0);

        const milestone = this.getCurrentMilestone(totalAmount);
        const nextMilestone = this.getNextMilestone(totalAmount);
        
        return {
            totalAmount,
            impacts,
            milestone,
            nextMilestone,
            description: this.generateImpactDescription(totalAmount, type)
        };
    }

    generateImpactDescription(amount, type) {
        const descriptions = {
            5: 'Compra un café para el desarrollador',
            10: 'Financia 30 minutos de desarrollo',
            25: 'Cubre 1 hora de trabajo especializado',
            50: 'Permite desarrollar 2 horas de código',
            100: 'Financia 4 horas de desarrollo completo',
            250: 'Cubre 10 horas de trabajo profesional',
            500: 'Financia 20 horas de desarrollo avanzado',
            1000: 'Permite 1 mes de desarrollo part-time'
        };

        // Encontrar la descripción más cercana
        const amounts = Object.keys(descriptions).map(Number).sort((a, b) => a - b);
        const closest = amounts.find(amt => amount <= amt) || amounts[amounts.length - 1];
        
        let description = descriptions[closest];
        
        if (type === 'monthly') {
            description = description.replace('Compra', 'Compra mensualmente');
            description = description.replace('Financia', 'Financia mensualmente');
            description = description.replace('Cubre', 'Cubre mensualmente');
            description = description.replace('Permite', 'Permite mensualmente');
        }
        
        return description;
    }

    getImpactIcon(category) {
        const icons = {
            development: '⚡',
            features: '🚀',
            bugs: '🐛',
            documentation: '📚',
            testing: '🧪',
            hosting: '☁️',
            security: '🔒'
        };
        return icons[category] || '💡';
    }

    getCurrentMilestone(amount) {
        const achieved = this.milestones
            .filter(m => amount >= m.amount)
            .sort((a, b) => b.amount - a.amount)[0];
        
        return achieved || null;
    }

    getNextMilestone(amount) {
        const next = this.milestones
            .filter(m => amount < m.amount)
            .sort((a, b) => a.amount - b.amount)[0];
        
        return next || null;
    }

    updateCalculation(amount) {
        const calculator = document.querySelector('.impact-calculator');
        if (!calculator) return;

        const slider = calculator.querySelector('#impact-slider');
        const display = calculator.querySelector('.amount-display');
        const breakdown = calculator.querySelector('.impact-breakdown');

        if (slider) slider.value = amount;
        if (display) display.textContent = `€${amount}`;

        if (breakdown) {
            const impact = this.calculateImpact(amount);
            this.renderImpactBreakdown(breakdown, impact);
        }
    }

    renderImpactBreakdown(container, impact) {
        const topImpacts = impact.impacts.slice(0, 3);
        
        container.innerHTML = topImpacts.map(item => `
            <div class="impact-item">
                <span class="impact-icon">${item.icon}</span>
                <span class="impact-text">${item.description}</span>
            </div>
        `).join('');

        // Agregar información de milestone
        if (impact.milestone) {
            const milestoneEl = document.createElement('div');
            milestoneEl.className = 'milestone-info';
            milestoneEl.innerHTML = `
                <div class="current-milestone">
                    <strong>🏆 ${impact.milestone.title}</strong>
                </div>
            `;
            container.appendChild(milestoneEl);
        }

        if (impact.nextMilestone) {
            const nextEl = document.createElement('div');
            nextEl.className = 'next-milestone';
            const remaining = impact.nextMilestone.amount - impact.totalAmount;
            nextEl.innerHTML = `
                <div class="milestone-progress">
                    <small>€${remaining} para: ${impact.nextMilestone.title}</small>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(impact.totalAmount / impact.nextMilestone.amount) * 100}%"></div>
                    </div>
                </div>
            `;
            container.appendChild(nextEl);
        }
    }

    createDetailedImpactView(amount, type = 'one-time') {
        const impact = this.calculateImpact(amount, type);
        
        return `
            <div class="detailed-impact">
                <h3>Tu Impacto Detallado</h3>
                <div class="impact-summary">
                    <p class="impact-description">${impact.description}</p>
                    <div class="impact-amount">
                        <strong>€${amount} ${type === 'monthly' ? '/mes' : ''}</strong>
                    </div>
                </div>
                
                <div class="impact-categories">
                    ${impact.impacts.map(item => `
                        <div class="impact-category">
                            <div class="category-header">
                                <span class="category-icon">${item.icon}</span>
                                <span class="category-name">${this.getCategoryName(item.category)}</span>
                            </div>
                            <div class="category-impact">
                                <strong>${item.quantity}</strong> ${this.impactRates[item.category].description}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                ${impact.milestone ? `
                    <div class="achievement-section">
                        <h4>🏆 Logro Desbloqueado</h4>
                        <div class="achievement">
                            <h5>${impact.milestone.title}</h5>
                            <ul>
                                ${impact.milestone.rewards.map(reward => `<li>${reward}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                ` : ''}
                
                ${impact.nextMilestone ? `
                    <div class="next-goal">
                        <h4>🎯 Próximo Objetivo</h4>
                        <div class="goal-info">
                            <p><strong>${impact.nextMilestone.title}</strong></p>
                            <p>Faltan €${impact.nextMilestone.amount - impact.totalAmount}</p>
                            <div class="goal-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(impact.totalAmount / impact.nextMilestone.amount) * 100}%"></div>
                                </div>
                                <span class="progress-text">${Math.round((impact.totalAmount / impact.nextMilestone.amount) * 100)}%</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getCategoryName(category) {
        const names = {
            development: 'Desarrollo',
            features: 'Características',
            bugs: 'Corrección de Bugs',
            documentation: 'Documentación',
            testing: 'Pruebas',
            hosting: 'Infraestructura',
            security: 'Seguridad'
        };
        return names[category] || category;
    }

    generateImpactCertificate(donorName, amount, type, transactionId) {
        const impact = this.calculateImpact(amount, type);
        const date = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="impact-certificate">
                <div class="certificate-header">
                    <h2>🌟 Certificado de Impacto</h2>
                    <p class="certificate-subtitle">Reconocimiento de Contribución</p>
                </div>
                
                <div class="certificate-body">
                    <p class="certificate-text">
                        Este certificado reconoce que <strong>${donorName}</strong>
                        ha contribuido con <strong>€${amount}</strong>
                        ${type === 'monthly' ? 'mensualmente' : ''}
                        al desarrollo del proyecto.
                    </p>
                    
                    <div class="impact-achieved">
                        <h3>Impacto Logrado:</h3>
                        <div class="impact-grid">
                            ${impact.impacts.slice(0, 4).map(item => `
                                <div class="impact-item">
                                    <span class="impact-icon">${item.icon}</span>
                                    <span class="impact-desc">${item.description}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    ${impact.milestone ? `
                        <div class="milestone-achieved">
                            <h3>🏆 Nivel Alcanzado:</h3>
                            <p class="milestone-title">${impact.milestone.title}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="certificate-footer">
                    <div class="certificate-date">
                        <p>Fecha: ${date}</p>
                        <p>ID: ${transactionId}</p>
                    </div>
                    <div class="certificate-signature">
                        <p>Proyecto de Desarrollo Sostenible</p>
                        <p class="signature">✨ Equipo de Desarrollo</p>
                    </div>
                </div>
            </div>
        `;
    }

    calculateCumulativeImpact(donations) {
        const totalAmount = donations.reduce((sum, donation) => {
            const multiplier = donation.type === 'monthly' ? 12 : 1;
            return sum + (donation.amount * multiplier);
        }, 0);

        return this.calculateImpact(totalAmount, 'cumulative');
    }

    getImpactTimeline(donations) {
        return donations
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(donation => {
                const impact = this.calculateImpact(donation.amount, donation.type);
                return {
                    date: donation.timestamp,
                    amount: donation.amount,
                    type: donation.type,
                    milestone: impact.milestone,
                    impacts: impact.impacts
                };
            });
    }

    exportImpactReport(donorData, donations) {
        const cumulative = this.calculateCumulativeImpact(donations);
        const timeline = this.getImpactTimeline(donations);
        
        return {
            donor: donorData,
            summary: {
                totalDonations: donations.length,
                totalAmount: cumulative.totalAmount,
                currentMilestone: cumulative.milestone,
                nextMilestone: cumulative.nextMilestone
            },
            cumulative: cumulative,
            timeline: timeline,
            generatedAt: new Date()
        };
    }

    visualizeImpact(containerId, impact) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Crear visualización circular del impacto
        const categories = impact.impacts.slice(0, 6);
        const maxValue = Math.max(...categories.map(c => c.quantity));
        
        container.innerHTML = `
            <div class="impact-visualization">
                <div class="impact-center">
                    <div class="total-amount">€${impact.totalAmount}</div>
                    <div class="impact-label">Tu Impacto</div>
                </div>
                <div class="impact-circles">
                    ${categories.map((item, index) => {
                        const percentage = (item.quantity / maxValue) * 100;
                        const angle = (index / categories.length) * 360;
                        return `
                            <div class="impact-circle" style="
                                transform: rotate(${angle}deg) translateY(-80px) rotate(-${angle}deg);
                                opacity: ${0.3 + (percentage / 100) * 0.7};
                            ">
                                <span class="circle-icon">${item.icon}</span>
                                <span class="circle-value">${item.quantity}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
}

// Inicializar calculadora globalmente
document.addEventListener('DOMContentLoaded', () => {
    window.impactCalculator = new ImpactCalculator();
    
    // Configurar slider si existe
    const slider = document.getElementById('impact-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            window.impactCalculator.updateCalculation(parseInt(e.target.value));
        });
        
        // Inicializar con valor por defecto
        window.impactCalculator.updateCalculation(parseInt(slider.value));
    }
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImpactCalculator;
}