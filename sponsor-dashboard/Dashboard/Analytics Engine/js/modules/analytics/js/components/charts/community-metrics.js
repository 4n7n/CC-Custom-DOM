/**
 * COMMUNITY METRICS SYSTEM
 * Sistema de métricas y análisis de comunidad
 */

class CommunityMetrics {
    constructor(options = {}) {
        this.options = {
            apiEndpoint: '/api/community',
            refreshInterval: 600000, // 10 minutos
            trackGrowth: true,
            trackEngagement: true,
            ...options
        };

        this.communities = new Map();
        this.metrics = new Map();
        this.demographics = new Map();
        this.init();
    }

    init() {
        this.loadCommunityData();
        this.calculateMetrics();
        this.startAutoRefresh();
        console.log('🏘️ Community Metrics inicializado');
    }

    // Cargar datos de comunidad
    async loadCommunityData() {
        try {
            if (this.options.apiEndpoint) {
                const response = await fetch(this.options.apiEndpoint);
                const data = await response.json();
                this.processCommunityData(data);
            } else {
                this.loadMockData();
            }
            this.calculateMetrics();
        } catch (error) {
            console.warn('Error cargando datos:', error);
            this.loadMockData();
        }
    }

    // Procesar datos de comunidades
    processCommunityData(data) {
        data.communities?.forEach(community => {
            this.communities.set(community.id, {
                ...community,
                lastUpdated: new Date().toISOString()
            });
        });

        if (data.demographics) {
            this.demographics = new Map(Object.entries(data.demographics));
        }
    }

    // Calcular métricas principales
    calculateMetrics() {
        const communities = Array.from(this.communities.values());
        
        const totalMembers = communities.reduce((sum, c) => sum + (c.members || 0), 0);
        const activeMembers = communities.reduce((sum, c) => sum + (c.activeMembers || 0), 0);
        const totalEvents = communities.reduce((sum, c) => sum + (c.events || 0), 0);
        const totalProjects = communities.reduce((sum, c) => sum + (c.projects || 0), 0);

        this.metrics.set('overview', {
            totalCommunities: communities.length,
            totalMembers,
            activeMembers,
            engagementRate: totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0,
            averageSize: totalMembers / Math.max(communities.length, 1),
            totalEvents,
            totalProjects,
            eventsPerCommunity: totalEvents / Math.max(communities.length, 1),
            projectsPerCommunity: totalProjects / Math.max(communities.length, 1)
        });

        this.calculateGrowthMetrics(communities);
        this.calculateEngagementMetrics(communities);
        this.calculateDemographics(communities);
        this.calculateImpactMetrics(communities);
    }

    // Métricas de crecimiento
    calculateGrowthMetrics(communities) {
        const growth = {
            newCommunities: this.getNewCommunities(communities, 30),
            memberGrowth: this.calculateMemberGrowth(communities),
            retentionRate: this.calculateRetentionRate(communities),
            churnRate: this.calculateChurnRate(communities)
        };

        this.metrics.set('growth', growth);
    }

    getNewCommunities(communities, days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return communities.filter(c => 
            new Date(c.createdAt) >= cutoff
        ).length;
    }

    calculateMemberGrowth(communities) {
        const monthlyGrowth = communities.map(c => {
            const current = c.members || 0;
            const previous = c.previousMembers || current;
            return previous > 0 ? ((current - previous) / previous) * 100 : 0;
        });

        return {
            average: monthlyGrowth.reduce((sum, g) => sum + g, 0) / Math.max(monthlyGrowth.length, 1),
            positive: monthlyGrowth.filter(g => g > 0).length,
            negative: monthlyGrowth.filter(g => g < 0).length,
            stable: monthlyGrowth.filter(g => g === 0).length
        };
    }

    calculateRetentionRate(communities) {
        return communities.reduce((sum, c) => {
            const retention = c.retentionRate || 85; // Default 85%
            return sum + retention;
        }, 0) / Math.max(communities.length, 1);
    }

    calculateChurnRate(communities) {
        return 100 - this.calculateRetentionRate(communities);
    }

    // Métricas de engagement
    calculateEngagementMetrics(communities) {
        const engagement = {
            averageEngagement: 0,
            highEngagement: 0,
            mediumEngagement: 0,
            lowEngagement: 0,
            topCommunities: [],
            eventParticipation: 0,
            projectParticipation: 0
        };

        communities.forEach(community => {
            const rate = this.getCommunityEngagementRate(community);
            engagement.averageEngagement += rate;

            if (rate >= 70) engagement.highEngagement++;
            else if (rate >= 40) engagement.mediumEngagement++;
            else engagement.lowEngagement++;
        });

        engagement.averageEngagement /= Math.max(communities.length, 1);
        
        // Top comunidades por engagement
        engagement.topCommunities = communities
            .sort((a, b) => this.getCommunityEngagementRate(b) - this.getCommunityEngagementRate(a))
            .slice(0, 5)
            .map(c => ({
                id: c.id,
                name: c.name,
                engagement: this.getCommunityEngagementRate(c),
                members: c.members
            }));

        this.metrics.set('engagement', engagement);
    }

    getCommunityEngagementRate(community) {
        const members = community.members || 1;
        const active = community.activeMembers || 0;
        const events = community.eventParticipation || 0;
        const projects = community.projectParticipation || 0;
        
        // Fórmula de engagement ponderada
        const baseRate = (active / members) * 100;
        const eventBonus = (events / members) * 10;
        const projectBonus = (projects / members) * 15;
        
        return Math.min(baseRate + eventBonus + projectBonus, 100);
    }

    // Análisis demográfico
    calculateDemographics(communities) {
        const demographics = {
            ageGroups: { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '55+': 0 },
            genderDistribution: { male: 0, female: 0, other: 0, unspecified: 0 },
            locationDistribution: {},
            interests: {},
            joinReasons: {}
        };

        communities.forEach(community => {
            // Procesar demografía de cada comunidad
            if (community.demographics) {
                this.mergeDemographics(demographics, community.demographics);
            }
        });

        this.metrics.set('demographics', demographics);
    }

    mergeDemographics(target, source) {
        Object.keys(source).forEach(key => {
            if (typeof source[key] === 'object') {
                Object.keys(source[key]).forEach(subKey => {
                    if (!target[key]) target[key] = {};
                    target[key][subKey] = (target[key][subKey] || 0) + (source[key][subKey] || 0);
                });
            }
        });
    }

    // Métricas de impacto
    calculateImpactMetrics(communities) {
        const impact = {
            totalBeneficiaries: 0,
            projectsCompleted: 0,
            fundsRaised: 0,
            volunteerHours: 0,
            socialImpactScore: 0,
            sustainabilityIndex: 0
        };

        communities.forEach(community => {
            impact.totalBeneficiaries += community.beneficiaries || 0;
            impact.projectsCompleted += community.completedProjects || 0;
            impact.fundsRaised += community.fundsRaised || 0;
            impact.volunteerHours += community.volunteerHours || 0;
        });

        // Calcular scores
        impact.socialImpactScore = this.calculateSocialImpactScore(communities);
        impact.sustainabilityIndex = this.calculateSustainabilityIndex(communities);

        this.metrics.set('impact', impact);
    }

    calculateSocialImpactScore(communities) {
        const scores = communities.map(c => {
            const beneficiaries = c.beneficiaries || 0;
            const projects = c.completedProjects || 0;
            const engagement = this.getCommunityEngagementRate(c);
            
            return (beneficiaries * 0.4) + (projects * 10 * 0.3) + (engagement * 0.3);
        });

        return scores.reduce((sum, score) => sum + score, 0) / Math.max(scores.length, 1);
    }

    calculateSustainabilityIndex(communities) {
        const factors = communities.map(c => {
            const retention = c.retentionRate || 50;
            const funding = c.fundingStability || 50;
            const leadership = c.leadershipScore || 50;
            
            return (retention + funding + leadership) / 3;
        });

        return factors.reduce((sum, factor) => sum + factor, 0) / Math.max(factors.length, 1);
    }

    // Datos de ejemplo
    loadMockData() {
        const mockCommunities = [
            {
                id: 'comm_1',
                name: 'Eco Warriors',
                members: 450,
                activeMembers: 280,
                events: 12,
                projects: 5,
                createdAt: '2024-01-15',
                beneficiaries: 1200,
                completedProjects: 3,
                fundsRaised: 15000,
                volunteerHours: 800,
                retentionRate: 88,
                category: 'environment'
            },
            {
                id: 'comm_2', 
                name: 'Education First',
                members: 320,
                activeMembers: 240,
                events: 18,
                projects: 8,
                createdAt: '2023-11-20',
                beneficiaries: 950,
                completedProjects: 6,
                fundsRaised: 22000,
                volunteerHours: 1200,
                retentionRate: 92,
                category: 'education'
            },
            {
                id: 'comm_3',
                name: 'Health Heroes',
                members: 280,
                activeMembers: 180,
                events: 8,
                projects: 4,
                createdAt: '2024-02-10',
                beneficiaries: 780,
                completedProjects: 2,
                fundsRaised: 8500,
                volunteerHours: 600,
                retentionRate: 75,
                category: 'health'
            }
        ];

        mockCommunities.forEach(community => {
            this.communities.set(community.id, community);
        });
    }

    // Métodos públicos
    getMetrics(type = 'overview') {
        return this.metrics.get(type);
    }

    getAllMetrics() {
        return Object.fromEntries(this.metrics.entries());
    }

    getCommunities() {
        return Array.from(this.communities.values());
    }

    getCommunityById(id) {
        return this.communities.get(id);
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadCommunityData();
        }, this.options.refreshInterval);
    }

    // Crear dashboard
    createDashboard(container) {
        const overview = this.getMetrics('overview');
        const growth = this.getMetrics('growth');
        const engagement = this.getMetrics('engagement');
        const impact = this.getMetrics('impact');

        const dashboard = document.createElement('div');
        dashboard.className = 'community-dashboard';
        dashboard.innerHTML = `
            <h3>🏘️ Community Metrics</h3>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-value">${overview.totalCommunities}</span>
                    <span class="metric-label">Comunidades</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${overview.totalMembers.toLocaleString()}</span>
                    <span class="metric-label">Miembros Totales</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${overview.engagementRate.toFixed(1)}%</span>
                    <span class="metric-label">Engagement Rate</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${impact.totalBeneficiaries.toLocaleString()}</span>
                    <span class="metric-label">Beneficiarios</span>
                </div>
            </div>

            <div class="metrics-sections">
                <div class="section">
                    <h4>📈 Crecimiento</h4>
                    <p>Nuevas comunidades (30d): <strong>${growth.newCommunities}</strong></p>
                    <p>Retención promedio: <strong>${growth.retentionRate ? growth.retentionRate.toFixed(1) : 0}%</strong></p>
                    <p>Crecimiento positivo: <strong>${growth.memberGrowth.positive}</strong> comunidades</p>
                </div>

                <div class="section">
                    <h4>🎯 Engagement</h4>
                    <p>Engagement promedio: <strong>${engagement.averageEngagement.toFixed(1)}%</strong></p>
                    <p>Alto engagement: <strong>${engagement.highEngagement}</strong></p>
                    <p>Medio engagement: <strong>${engagement.mediumEngagement}</strong></p>
                    <p>Bajo engagement: <strong>${engagement.lowEngagement}</strong></p>
                </div>

                <div class="section">
                    <h4>💪 Impacto</h4>
                    <p>Proyectos completados: <strong>${impact.projectsCompleted}</strong></p>
                    <p>Fondos recaudados: <strong>€${impact.fundsRaised.toLocaleString()}</strong></p>
                    <p>Horas voluntariado: <strong>${impact.volunteerHours.toLocaleString()}</strong></p>
                    <p>Score impacto social: <strong>${impact.socialImpactScore.toFixed(1)}</strong></p>
                </div>
            </div>

            <div class="top-communities">
                <h4>🏆 Top Comunidades por Engagement</h4>
                ${engagement.topCommunities.map(community => `
                    <div class="community-item">
                        <span class="community-name">${community.name}</span>
                        <span class="community-engagement">${community.engagement.toFixed(1)}%</span>
                        <span class="community-members">${community.members} miembros</span>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(dashboard);
        return dashboard;
    }
}

// Estilos CSS
const communityStyles = `
<style>
.community-dashboard {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.community-dashboard h3 {
    margin: 0 0 1rem 0;
    color: #374151;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.metric-card {
    text-align: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
}

.metric-value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
}

.metric-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
}

.metrics-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.section {
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
    border-left: 4px solid #3b82f6;
}

.section h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
}

.section p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
    color: #6b7280;
}

.top-communities {
    background: #f8fafc;
    padding: 1rem;
    border-radius: 6px;
}

.top-communities h4 {
    margin: 0 0 1rem 0;
    color: #374151;
}

.community-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e5e7eb;
}

.community-item:last-child {
    border-bottom: none;
}

.community-name {
    font-weight: 500;
    color: #1f2937;
}

.community-engagement {
    color: #10b981;
    font-weight: 600;
}

.community-members {
    font-size: 0.875rem;
    color: #6b7280;
}

@media (max-width: 768px) {
    .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .metrics-sections {
        grid-template-columns: 1fr;
    }
    
    .community-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
    }
}
</style>
`;

if (!document.querySelector('#community-styles')) {
    const style = document.createElement('div');
    style.id = 'community-styles';
    style.innerHTML = communityStyles;
    document.head.appendChild(style);
}

window.CommunityMetrics = CommunityMetrics;