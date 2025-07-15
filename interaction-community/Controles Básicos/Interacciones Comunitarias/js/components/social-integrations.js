/**
 * RAMA 7: Social Integrations - Integraciones sociales para experiencia comunitaria
 * Conecta la experiencia cultural con redes sociales y comunidades externas
 */

class SocialIntegrationsManager {
    constructor() {
        this.connectedPlatforms = new Map();
        this.socialProfiles = new Map();
        this.communityConnections = new Map();
        this.shareQueues = new Map();
        this.socialMetrics = new Map();
        this.privacySettings = new Map();
        this.culturalNetworks = new Map();
        this.collaborativeProjects = new Map();
        this.crossPlatformSync = new Map();
        
        this.init();
    }

    init() {
        this.setupSocialPlatforms();
        this.setupCulturalNetworks();
        this.bindSocialEvents();
        this.initializePrivacyControls();
        this.createSocialInterface();
        this.loadExistingConnections();
    }

    setupSocialPlatforms() {
        // Plataformas sociales generales
        this.connectedPlatforms.set('facebook', {
            name: 'Facebook',
            icon: '📘',
            apiUrl: 'https://graph.facebook.com',
            features: ['share', 'groups', 'events', 'pages'],
            culturalSupport: 'medium',
            privacy: 'configurable',
            authentication: 'oauth2'
        });

        this.connectedPlatforms.set('twitter', {
            name: 'Twitter/X',
            icon: '🐦',
            apiUrl: 'https://api.twitter.com',
            features: ['share', 'threads', 'spaces', 'communities'],
            culturalSupport: 'high',
            privacy: 'public',
            authentication: 'oauth2'
        });

        this.connectedPlatforms.set('instagram', {
            name: 'Instagram',
            icon: '📷',
            apiUrl: 'https://graph.instagram.com',
            features: ['share', 'stories', 'reels', 'live'],
            culturalSupport: 'high',
            privacy: 'configurable',
            authentication: 'oauth2'
        });

        this.connectedPlatforms.set('linkedin', {
            name: 'LinkedIn',
            icon: '💼',
            apiUrl: 'https://api.linkedin.com',
            features: ['share', 'articles', 'groups', 'events'],
            culturalSupport: 'medium',
            privacy: 'professional',
            authentication: 'oauth2'
        });

        this.connectedPlatforms.set('tiktok', {
            name: 'TikTok',
            icon: '🎵',
            apiUrl: 'https://open-api.tiktok.com',
            features: ['share', 'videos', 'challenges', 'effects'],
            culturalSupport: 'very-high',
            privacy: 'public',
            authentication: 'oauth2'
        });

        this.connectedPlatforms.set('youtube', {
            name: 'YouTube',
            icon: '📹',
            apiUrl: 'https://www.googleapis.com/youtube',
            features: ['share', 'playlists', 'community', 'premieres'],
            culturalSupport: 'high',
            privacy: 'configurable',
            authentication: 'oauth2'
        });
    }

    setupCulturalNetworks() {
        // Redes especializadas en cultura
        this.culturalNetworks.set('cultural-heritage', {
            name: 'Red de Patrimonio Cultural',
            icon: '🏛️',
            focus: 'heritage-preservation',
            features: ['documentation', 'collaboration', 'research', 'education'],
            audience: 'academics-institutions',
            verification: 'expert-review'
        });

        this.culturalNetworks.set('indigenous-voices', {
            name: 'Voces Indígenas',
            icon: '🪶',
            focus: 'indigenous-cultures',
            features: ['storytelling', 'language-preservation', 'knowledge-sharing', 'advocacy'],
            audience: 'indigenous-communities',
            verification: 'community-approval'
        });

        this.culturalNetworks.set('cultural-education', {
            name: 'Educación Cultural',
            icon: '📚',
            focus: 'cultural-learning',
            features: ['resources', 'curricula', 'workshops', 'certification'],
            audience: 'educators-students',
            verification: 'educational-standards'
        });

        this.culturalNetworks.set('artisan-collective', {
            name: 'Colectivo Artesanal',
            icon: '🎨',
            focus: 'traditional-crafts',
            features: ['marketplace', 'techniques', 'mentorship', 'preservation'],
            audience: 'artisans-collectors',
            verification: 'skill-assessment'
        });
    }

    bindSocialEvents() {
        document.addEventListener('socialShare', this.handleSocialShare.bind(this));
        document.addEventListener('culturalContent', this.handleCulturalContent.bind(this));
        document.addEventListener('communityAction', this.handleCommunityAction.bind(this));
        document.addEventListener('crossPlatformSync', this.handleCrossPlatformSync.bind(this));
        
        // Eventos de autenticación
        document.addEventListener('socialLogin', this.handleSocialLogin.bind(this));
        document.addEventListener('socialLogout', this.handleSocialLogout.bind(this));
        
        // Eventos de UI
        document.addEventListener('click', this.handleSocialClick.bind(this));
        document.addEventListener('privacyChange', this.handlePrivacyChange.bind(this));
    }

    handleSocialShare(event) {
        const { content, platforms, privacy, culturalContext } = event.detail;
        
        // Verificar sensibilidad cultural
        const culturalSensitivity = this.assessCulturalSensitivity(content, culturalContext);
        
        if (culturalSensitivity.requiresReview) {
            this.showCulturalReviewPrompt(content, platforms, culturalSensitivity);
        } else {
            this.executeSocialShare(content, platforms, privacy);
        }
    }

    assessCulturalSensitivity(content, culturalContext) {
        const sensitivity = {
            level: 'standard',
            requiresReview: false,
            concerns: [],
            suggestions: []
        };

        // Detectar contenido sagrado
        if (this.containsSacredContent(content)) {
            sensitivity.level = 'high';
            sensitivity.requiresReview = true;
            sensitivity.concerns.push('Contiene elementos sagrados');
            sensitivity.suggestions.push('Solicitar permiso de la comunidad');
        }

        // Detectar conocimiento tradicional
        if (this.containsTraditionalKnowledge(content)) {
            sensitivity.level = 'medium';
            sensitivity.concerns.push('Contiene conocimiento tradicional');
            sensitivity.suggestions.push('Incluir atribución apropiada');
        }

        // Verificar contexto cultural
        if (culturalContext && culturalContext.restrictions) {
            sensitivity.level = 'high';
            sensitivity.requiresReview = true;
            sensitivity.concerns.push('Tiene restricciones culturales');
        }

        return sensitivity;
    }

    showCulturalReviewPrompt(content, platforms, sensitivity) {
        const reviewModal = document.createElement('div');
        reviewModal.className = 'cultural-review-modal';
        reviewModal.innerHTML = `
            <div class="review-content">
                <div class="review-header">
                    <h2>Revisión Cultural Requerida</h2>
                    <div class="sensitivity-level ${sensitivity.level}">
                        Nivel: ${sensitivity.level}
                    </div>
                </div>
                
                <div class="review-concerns">
                    <h3>Consideraciones Culturales:</h3>
                    <ul>
                        ${sensitivity.concerns.map(concern => `<li class="concern-item">${concern}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="review-suggestions">
                    <h3>Sugerencias:</h3>
                    <ul>
                        ${sensitivity.suggestions.map(suggestion => `<li class="suggestion-item">${suggestion}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="cultural-guidelines">
                    <h3>Pautas de Compartición Respetuosa:</h3>
                    <div class="guidelines-checklist">
                        <label class="guideline-item">
                            <input type="checkbox" required>
                            <span>He verificado que tengo permiso para compartir este contenido</span>
                        </label>
                        <label class="guideline-item">
                            <input type="checkbox" required>
                            <span>Incluiré la atribución cultural apropiada</span>
                        </label>
                        <label class="guideline-item">
                            <input type="checkbox" required>
                            <span>El contenido se comparte con intención educativa y respetuosa</span>
                        </label>
                        <label class="guideline-item">
                            <input type="checkbox" required>
                            <span>He considerado el impacto en la comunidad de origen</span>
                        </label>
                    </div>
                </div>
                
                <div class="review-actions">
                    <button class="cancel-share">Cancelar</button>
                    <button class="revise-content">Revisar Contenido</button>
                    <button class="proceed-share" disabled>Proceder con Compartir</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(reviewModal);
        
        // Configurar eventos del modal
        this.setupReviewModalEvents(reviewModal, content, platforms);
    }

    setupReviewModalEvents(modal, content, platforms) {
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        const proceedBtn = modal.querySelector('.proceed-share');
        
        // Validar checkboxes
        const validateForm = () => {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            proceedBtn.disabled = !allChecked;
        };
        
        checkboxes.forEach(cb => cb.addEventListener('change', validateForm));
        
        // Eventos de botones
        modal.querySelector('.cancel-share').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.revise-content').addEventListener('click', () => {
            modal.remove();
            this.openContentEditor(content);
        });
        
        modal.querySelector('.proceed-share').addEventListener('click', () => {
            modal.remove();
            this.executeSocialShare(content, platforms, 'respectful');
        });
    }

    executeSocialShare(content, platforms, privacy = 'public') {
        platforms.forEach(platformId => {
            const platform = this.connectedPlatforms.get(platformId) || 
                           this.culturalNetworks.get(platformId);
            
            if (platform && this.isPlatformConnected(platformId)) {
                this.shareToSpecificPlatform(content, platform, privacy);
            } else {
                this.queuePendingShare(content, platformId, privacy);
            }
        });
        
        // Mostrar confirmación
        this.showShareConfirmation(platforms);
    }

    shareToSpecificPlatform(content, platform, privacy) {
        // Adaptar contenido según plataforma
        const adaptedContent = this.adaptContentForPlatform(content, platform);
        
        // Simular API call (en implementación real, usar APIs reales)
        console.log(`Compartiendo en ${platform.name}:`, adaptedContent);
        
        // Registrar en métricas
        this.recordSocialMetric(platform.name, 'share', adaptedContent);
        
        // En implementación real:
        // return this.callPlatformAPI(platform, adaptedContent, privacy);
        
        return Promise.resolve({ success: true, platform: platform.name });
    }

    adaptContentForPlatform(content, platform) {
        const adapted = { ...content };
        
        // Adaptaciones específicas por plataforma
        switch (platform.name.toLowerCase()) {
            case 'twitter':
                adapted.text = this.truncateForTwitter(content.text);
                adapted.hashtags = this.generateCulturalHashtags(content);
                break;
                
            case 'instagram':
                adapted.visual = true;
                adapted.caption = this.formatInstagramCaption(content);
                break;
                
            case 'linkedin':
                adapted.professional = true;
                adapted.context = this.addEducationalContext(content);
                break;
                
            case 'tiktok':
                adapted.creative = true;
                adapted.soundTrack = this.suggestCulturalMusic(content);
                break;
                
            case 'youtube':
                adapted.videoDescription = this.createVideoDescription(content);
                adapted.playlist = this.suggestPlaylist(content);
                break;
        }
        
        return adapted;
    }

    createSocialInterface() {
        const socialPanel = document.createElement('div');
        socialPanel.className = 'social-integrations-panel';
        socialPanel.innerHTML = `
            <div class="social-header">
                <h3>Conexiones Sociales</h3>
                <button class="toggle-social">🔗</button>
            </div>
            
            <div class="social-content">
                <div class="connected-platforms">
                    <h4>Plataformas Conectadas</h4>
                    <div class="platforms-grid">
                        ${this.generatePlatformsHTML()}
                    </div>
                </div>
                
                <div class="cultural-networks">
                    <h4>Redes Culturales</h4>
                    <div class="networks-grid">
                        ${this.generateNetworksHTML()}
                    </div>
                </div>
                
                <div class="quick-share">
                    <h4>Compartir Rápido</h4>
                    <div class="quick-share-buttons">
                        <button class="quick-share-btn" data-action="experience">
                            <span class="share-icon">📚</span>
                            <span class="share-text">Compartir Experiencia</span>
                        </button>
                        <button class="quick-share-btn" data-action="learning">
                            <span class="share-icon">🧠</span>
                            <span class="share-text">Compartir Aprendizaje</span>
                        </button>
                        <button class="quick-share-btn" data-action="cultural">
                            <span class="share-icon">🏛️</span>
                            <span class="share-text">Compartir Cultura</span>
                        </button>
                    </div>
                </div>
                
                <div class="social-privacy">
                    <h4>Configuración de Privacidad</h4>
                    <div class="privacy-controls">
                        ${this.generatePrivacyControlsHTML()}
                    </div>
                </div>
                
                <div class="social-metrics">
                    <h4>Impacto Social</h4>
                    <div class="metrics-display">
                        ${this.generateSocialMetricsHTML()}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(socialPanel);
        this.setupSocialPanelEvents(socialPanel);
    }

    generatePlatformsHTML() {
        return Array.from(this.connectedPlatforms.entries()).map(([id, platform]) => {
            const isConnected = this.isPlatformConnected(id);
            
            return `
                <div class="platform-card ${isConnected ? 'connected' : 'disconnected'}" data-platform="${id}">
                    <div class="platform-icon">${platform.icon}</div>
                    <div class="platform-info">
                        <h5>${platform.name}</h5>
                        <div class="platform-status">
                            ${isConnected ? 'Conectado' : 'Desconectado'}
                        </div>
                        <div class="cultural-support">
                            Soporte Cultural: ${platform.culturalSupport}
                        </div>
                    </div>
                    <div class="platform-actions">
                        ${isConnected ? 
                            `<button class="disconnect-btn">Desconectar</button>` :
                            `<button class="connect-btn">Conectar</button>`
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    generateNetworksHTML() {
        return Array.from(this.culturalNetworks.entries()).map(([id, network]) => {
            const isJoined = this.isNetworkJoined(id);
            
            return `
                <div class="network-card ${isJoined ? 'joined' : 'available'}" data-network="${id}">
                    <div class="network-icon">${network.icon}</div>
                    <div class="network-info">
                        <h5>${network.name}</h5>
                        <div class="network-focus">${network.focus}</div>
                        <div class="network-audience">${network.audience}</div>
                    </div>
                    <div class="network-actions">
                        ${isJoined ? 
                            `<button class="leave-network-btn">Salir</button>` :
                            `<button class="join-network-btn">Unirse</button>`
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    generatePrivacyControlsHTML() {
        return `
            <div class="privacy-setting">
                <label>Visibilidad por Defecto:</label>
                <select class="default-visibility">
                    <option value="public">Público</option>
                    <option value="friends">Solo Amigos</option>
                    <option value="private">Privado</option>
                </select>
            </div>
            
            <div class="privacy-setting">
                <label>
                    <input type="checkbox" class="cultural-review" checked>
                    Revisar contenido cultural antes de compartir
                </label>
            </div>
            
            <div class="privacy-setting">
                <label>
                    <input type="checkbox" class="attribution-required" checked>
                    Incluir siempre atribución cultural
                </label>
            </div>
            
            <div class="privacy-setting">
                <label>
                    <input type="checkbox" class="community-consent">
                    Solicitar consentimiento comunitario para contenido sagrado
                </label>
            </div>
        `;
    }

    generateSocialMetricsHTML() {
        const metrics = this.getSocialMetrics();
        
        return `
            <div class="metric-item">
                <span class="metric-label">Contenido Compartido:</span>
                <span class="metric-value">${metrics.totalShares}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Alcance Cultural:</span>
                <span class="metric-value">${metrics.culturalReach}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Educación Generada:</span>
                <span class="metric-value">${metrics.educationalImpact}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Conexiones Creadas:</span>
                <span class="metric-value">${metrics.connectionsCreated}</span>
            </div>
        `;
    }

    setupSocialPanelEvents(panel) {
        // Eventos de conexión/desconexión de plataformas
        panel.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const platformCard = btn.closest('.platform-card');
                const platformId = platformCard.dataset.platform;
                this.connectToPlatform(platformId);
            });
        });
        
        panel.querySelectorAll('.disconnect-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const platformCard = btn.closest('.platform-card');
                const platformId = platformCard.dataset.platform;
                this.disconnectFromPlatform(platformId);
            });
        });
        
        // Eventos de redes culturales
        panel.querySelectorAll('.join-network-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const networkCard = btn.closest('.network-card');
                const networkId = networkCard.dataset.network;
                this.joinCulturalNetwork(networkId);
            });
        });
        
        // Eventos de compartir rápido
        panel.querySelectorAll('.quick-share-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.triggerQuickShare(action);
            });
        });
        
        // Eventos de configuración de privacidad
        panel.querySelectorAll('.privacy-setting input, .privacy-setting select').forEach(input => {
            input.addEventListener('change', () => {
                this.updatePrivacySettings(panel);
            });
        });
    }

    connectToPlatform(platformId) {
        const platform = this.connectedPlatforms.get(platformId);
        if (!platform) return;
        
        // Simular proceso de autenticación OAuth
        console.log(`Conectando a ${platform.name}...`);
        
        // En implementación real, abriría ventana de OAuth
        // window.open(platform.authUrl, 'social-auth', 'width=600,height=600');
        
        // Simular conexión exitosa
        setTimeout(() => {
            this.socialProfiles.set(platformId, {
                connected: true,
                connectedAt: Date.now(),
                profile: {
                    id: 'user_' + Date.now(),
                    name: 'Usuario Cultural',
                    avatar: '/default-avatar.jpg'
                }
            });
            
            this.showConnectionSuccess(platform.name);
            this.refreshSocialInterface();
        }, 2000);
    }

    disconnectFromPlatform(platformId) {
        this.socialProfiles.delete(platformId);
        this.showDisconnectionConfirmation(platformId);
        this.refreshSocialInterface();
    }

    joinCulturalNetwork(networkId) {
        const network = this.culturalNetworks.get(networkId);
        if (!network) return;
        
        // Verificar si requiere verificación
        if (network.verification) {
            this.showVerificationProcess(network);
        } else {
            this.completeCulturalNetworkJoin(networkId);
        }
    }

    triggerQuickShare(action) {
        const shareTypes = {
            'experience': 'Acabo de tener una experiencia cultural increíble...',
            'learning': 'Hoy aprendí algo fascinante sobre...',
            'cultural': 'Quiero compartir este hermoso elemento cultural...'
        };
        
        const defaultText = shareTypes[action];
        
        // Abrir modal de compartir rápido
        this.showQuickShareModal(defaultText, action);
    }

    showQuickShareModal(defaultText, shareType) {
        const modal = document.createElement('div');
        modal.className = 'quick-share-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Compartir ${shareType}</h3>
                    <button class="close-modal">×</button>
                </div>
                
                <div class="share-content">
                    <textarea class="share-text" placeholder="${defaultText}">${defaultText}</textarea>
                    
                    <div class="platform-selection">
                        <h4>¿Dónde compartir?</h4>
                        <div class="platform-options">
                            ${this.generateConnectedPlatformOptions()}
                        </div>
                    </div>
                    
                    <div class="cultural-context">
                        <h4>Contexto Cultural</h4>
                        <select class="cultural-context-select">
                            <option value="">Ninguno específico</option>
                            <option value="traditional">Tradición</option>
                            <option value="contemporary">Contemporáneo</option>
                            <option value="historical">Histórico</option>
                            <option value="educational">Educativo</option>
                        </select>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="cancel-share">Cancelar</button>
                    <button class="execute-share">Compartir</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.setupQuickShareModalEvents(modal);
    }

    // Métodos auxiliares
    isPlatformConnected(platformId) {
        return this.socialProfiles.has(platformId) && 
               this.socialProfiles.get(platformId).connected;
    }

    isNetworkJoined(networkId) {
        return this.communityConnections.has(networkId);
    }

    containsSacredContent(content) {
        const sacredKeywords = ['sagrado', 'ritual', 'ceremonial', 'espiritual', 'ancestral'];
        const contentStr = JSON.stringify(content).toLowerCase();
        return sacredKeywords.some(keyword => contentStr.includes(keyword));
    }

    containsTraditionalKnowledge(content) {
        const knowledgeKeywords = ['tradición', 'conocimiento', 'sabiduría', 'técnica', 'secreto'];
        const contentStr = JSON.stringify(content).toLowerCase();
        return knowledgeKeywords.some(keyword => contentStr.includes(keyword));
    }

    getSocialMetrics() {
        return {
            totalShares: this.socialMetrics.get('totalShares') || 0,
            culturalReach: this.socialMetrics.get('culturalReach') || 0,
            educationalImpact: this.socialMetrics.get('educationalImpact') || 0,
            connectionsCreated: this.socialMetrics.get('connectionsCreated') || 0
        };
    }

    recordSocialMetric(platform, action, content) {
        const metricKey = `${platform}_${action}`;
        const currentCount = this.socialMetrics.get(metricKey) || 0;
        this.socialMetrics.set(metricKey, currentCount + 1);
        
        // Actualizar métricas globales
        const totalShares = this.socialMetrics.get('totalShares') || 0;
        this.socialMetrics.set('totalShares', totalShares + 1);
        
        // Estimar alcance cultural
        const platformReach = this.estimatePlatformReach(platform);
        const culturalReach = this.socialMetrics.get('culturalReach') || 0;
        this.socialMetrics.set('culturalReach', culturalReach + platformReach);
    }

    estimatePlatformReach(platform) {
        const reachEstimates = {
            'Facebook': 50,
            'Twitter/X': 30,
            'Instagram': 40,
            'LinkedIn': 25,
            'TikTok': 100,
            'YouTube': 75
        };
        return reachEstimates[platform] || 20;
    }

    // API pública
    getConnectedPlatforms() {
        return Array.from(this.socialProfiles.keys()).filter(id => 
            this.isPlatformConnected(id)
        );
    }

    getJoinedNetworks() {
        return Array.from(this.communityConnections.keys());
    }

    getSocialStats() {
        return {
            connectedPlatforms: this.getConnectedPlatforms().length,
            joinedNetworks: this.getJoinedNetworks().length,
            totalShares: this.socialMetrics.get('totalShares') || 0,
            culturalImpact: this.calculateCulturalImpact()
        };
    }

    calculateCulturalImpact() {
        const metrics = this.getSocialMetrics();
        return Math.round(
            (metrics.culturalReach * 0.4) +
            (metrics.educationalImpact * 0.3) +
            (metrics.connectionsCreated * 0.3)
        );
    }

    shareToAllConnected(content, culturalContext) {
        const connectedPlatforms = this.getConnectedPlatforms();
        
        const event = new CustomEvent('socialShare', {
            detail: {
                content,
                platforms: connectedPlatforms,
                culturalContext,
                privacy: 'public'
            }
        });
        
        document.dispatchEvent(event);
    }

    createCulturalCollaboration(title, description, platforms) {
        const collaboration = {
            id: this.generateCollaborationId(),
            title,
            description,
            platforms,
            participants: new Set(),
            createdAt: Date.now(),
            status: 'active'
        };
        
        this.collaborativeProjects.set(collaboration.id, collaboration);
        return collaboration;
    }

    generateCollaborationId() {
        return 'collab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.socialIntegrationsManager = new SocialIntegrationsManager();
});

export default SocialIntegrationsManager;