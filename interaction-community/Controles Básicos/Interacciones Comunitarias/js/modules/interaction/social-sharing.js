/**
 * RAMA 7: Social Sharing - Sistema de compartición social responsable
 * Facilita el compartir experiencias culturales de manera respetuosa y educativa
 */

class SocialSharingManager {
    constructor() {
        this.shareableContent = new Map();
        this.shareHistory = new Map();
        this.culturalSensitivity = new Map();
        this.shareTemplates = new Map();
        this.privacySettings = {
            respectCulturalPrivacy: true,
            requireAttribution: true,
            educationalContext: true,
            communityBenefit: true
        };
        this.platforms = new Map();
        this.shareMetrics = new Map();
        
        this.init();
    }

    init() {
        this.setupSharingPlatforms();
        this.createShareTemplates();
        this.setupCulturalGuidelines();
        this.bindSharingEvents();
        this.createSharingInterface();
        this.initializeMetrics();
    }

    setupSharingPlatforms() {
        // Configurar plataformas de sharing con contexto cultural
        this.platforms.set('cultural-network', {
            name: 'Red Cultural',
            icon: '🏛️',
            culturalFocus: true,
            requiresContext: true,
            maxLength: 500,
            supportedMedia: ['text', 'image', 'audio'],
            audienceType: 'cultural-enthusiasts'
        });

        this.platforms.set('educational-platform', {
            name: 'Plataforma Educativa',
            icon: '📚',
            culturalFocus: true,
            requiresContext: true,
            maxLength: 1000,
            supportedMedia: ['text', 'image', 'video', 'audio'],
            audienceType: 'students-educators'
        });

        this.platforms.set('general-social', {
            name: 'Redes Sociales',
            icon: '📱',
            culturalFocus: false,
            requiresContext: true,
            maxLength: 280,
            supportedMedia: ['text', 'image'],
            audienceType: 'general-public'
        });

        this.platforms.set('community-forum', {
            name: 'Foro Comunitario',
            icon: '💬',
            culturalFocus: true,
            requiresContext: false,
            maxLength: 2000,
            supportedMedia: ['text', 'image', 'audio', 'video'],
            audienceType: 'community-members'
        });
    }

    createShareTemplates() {
        // Templates que respetan el contexto cultural
        this.shareTemplates.set('cultural-discovery', {
            title: 'Descubrimiento Cultural',
            template: `Acabo de descubrir algo fascinante sobre {culturalElement} de la región {region}. {insight}\n\n{respectfulContext}\n\n#CulturaColombiana #{region} #AprendizajeCultural`,
            requiredFields: ['culturalElement', 'region', 'insight', 'respectfulContext'],
            culturalSensitivity: 'high'
        });

        this.shareTemplates.set('learning-experience', {
            title: 'Experiencia de Aprendizaje',
            template: `Hoy aprendí sobre {culturalElement}. {learningInsight}\n\nEs importante entender que {culturalContext} y siempre debemos {respectfulApproach}.\n\n#EducaciónCultural #RespetoCultural`,
            requiredFields: ['culturalElement', 'learningInsight', 'culturalContext', 'respectfulApproach'],
            culturalSensitivity: 'high'
        });

        this.shareTemplates.set('cultural-appreciation', {
            title: 'Apreciación Cultural',
            template: `Profundo respeto por {culturalElement} y su significado en {community}. {appreciation}\n\nGracias a {community} por preservar esta hermosa tradición.\n\n#RespetoCultural #PatrimonioCultural`,
            requiredFields: ['culturalElement', 'community', 'appreciation'],
            culturalSensitivity: 'very-high'
        });

        this.shareTemplates.set('educational-insight', {
            title: 'Perspectiva Educativa',
            template: `💡 Dato cultural: {insight}\n\n📍 Origen: {origin}\n🏛️ Significado: {significance}\n🤝 Cómo respetar: {respectfulPractice}\n\n#EducaciónCultural #DiversidadCultural`,
            requiredFields: ['insight', 'origin', 'significance', 'respectfulPractice'],
            culturalSensitivity: 'medium'
        });
    }

    setupCulturalGuidelines() {
        this.culturalSensitivity.set('sacred-elements', {
            level: 'restricted',
            guidelines: [
                'No compartir sin permiso explícito de la comunidad',
                'Incluir siempre contexto sagrado y respetuoso',
                'Evitar trivialización o comercialización',
                'Reconocer la fuente y significado espiritual'
            ],
            requiredApprovals: ['community-elder', 'cultural-guardian']
        });

        this.culturalSensitivity.set('traditional-knowledge', {
            level: 'careful',
            guidelines: [
                'Verificar exactitud con fuentes autorizadas',
                'Incluir atribución apropiada',
                'Evitar simplificación excesiva',
                'Proporcionar contexto educativo completo'
            ],
            requiredApprovals: ['cultural-expert']
        });

        this.culturalSensitivity.set('artistic-expressions', {
            level: 'respectful',
            guidelines: [
                'Reconocer al artista y comunidad de origen',
                'Incluir contexto histórico y cultural',
                'Evitar apropiación o uso comercial no autorizado',
                'Promover aprecio genuino por la tradición'
            ],
            requiredApprovals: []
        });

        this.culturalSensitivity.set('general-cultural', {
            level: 'standard',
            guidelines: [
                'Usar lenguaje respetuoso y apropiado',
                'Incluir contexto básico',
                'Evitar estereotipos',
                'Promover comprensión intercultural'
            ],
            requiredApprovals: []
        });
    }

    bindSharingEvents() {
        document.addEventListener('shareRequest', this.handleShareRequest.bind(this));
        document.addEventListener('culturalContentShare', this.handleCulturalShare.bind(this));
        document.addEventListener('narrativeShare', this.handleNarrativeShare.bind(this));
        
        // Eventos de UI
        document.addEventListener('click', this.handleShareClick.bind(this));
        document.addEventListener('shareModalOpen', this.handleShareModalOpen.bind(this));
    }

    handleShareRequest(event) {
        const { content, type, culturalContext } = event.detail;
        
        // Evaluar sensibilidad cultural del contenido
        const sensitivity = this.evaluateCulturalSensitivity(content, culturalContext);
        
        // Crear interfaz de sharing apropiada
        this.createSharingModal(content, type, culturalContext, sensitivity);
    }

    evaluateCulturalSensitivity(content, culturalContext) {
        // Analizar contenido para determinar nivel de sensibilidad
        let sensitivityLevel = 'standard';
        let guidelines = [];
        
        // Detectar elementos sagrados
        if (this.containsSacredElements(content, culturalContext)) {
            sensitivityLevel = 'restricted';
            guidelines = this.culturalSensitivity.get('sacred-elements').guidelines;
        }
        // Detectar conocimiento tradicional
        else if (this.containsTraditionalKnowledge(content, culturalContext)) {
            sensitivityLevel = 'careful';
            guidelines = this.culturalSensitivity.get('traditional-knowledge').guidelines;
        }
        // Detectar expresiones artísticas
        else if (this.containsArtisticExpressions(content, culturalContext)) {
            sensitivityLevel = 'respectful';
            guidelines = this.culturalSensitivity.get('artistic-expressions').guidelines;
        }
        
        return {
            level: sensitivityLevel,
            guidelines,
            requiresReview: sensitivityLevel === 'restricted',
            culturalContext
        };
    }

    createSharingModal(content, type, culturalContext, sensitivity) {
        const modal = document.createElement('div');
        modal.className = 'sharing-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Compartir Experiencia Cultural</h2>
                    <div class="sensitivity-indicator ${sensitivity.level}">
                        <span class="sensitivity-icon">${this.getSensitivityIcon(sensitivity.level)}</span>
                        <span class="sensitivity-text">${this.getSensitivityText(sensitivity.level)}</span>
                    </div>
                    <button class="close-modal">×</button>
                </div>
                
                <div class="content-preview">
                    <h3>Contenido a Compartir</h3>
                    <div class="preview-content">
                        ${this.generateContentPreview(content, culturalContext)}
                    </div>
                </div>
                
                ${sensitivity.level === 'restricted' ? this.createRestrictionNotice(sensitivity) : ''}
                
                <div class="cultural-guidelines">
                    <h3>Pautas Culturales</h3>
                    <ul class="guidelines-list">
                        ${sensitivity.guidelines.map(guideline => 
                            `<li class="guideline-item">
                                <span class="guideline-icon">✓</span>
                                <span class="guideline-text">${guideline}</span>
                            </li>`
                        ).join('')}
                    </ul>
                </div>
                
                <div class="template-selection">
                    <h3>Elige un Enfoque de Compartición</h3>
                    <div class="template-grid">
                        ${this.generateTemplateOptions(content, culturalContext, sensitivity)}
                    </div>
                </div>
                
                <div class="sharing-form" style="display: none;">
                    <div class="form-fields">
                        <!-- Se llenará dinámicamente según template seleccionado -->
                    </div>
                    
                    <div class="preview-section">
                        <h4>Vista Previa del Mensaje</h4>
                        <div class="message-preview"></div>
                        <div class="character-count">
                            <span class="current">0</span>/<span class="max">280</span>
                        </div>
                    </div>
                    
                    <div class="platform-selection">
                        <h4>¿Dónde te gustaría compartir?</h4>
                        <div class="platform-grid">
                            ${this.generatePlatformOptions(sensitivity)}
                        </div>
                    </div>
                    
                    <div class="cultural-verification">
                        <div class="verification-checklist">
                            <label class="verification-item">
                                <input type="checkbox" class="verification-check" data-type="accuracy">
                                <span class="checkmark">✓</span>
                                <span class="verification-text">He verificado la exactitud cultural del contenido</span>
                            </label>
                            <label class="verification-item">
                                <input type="checkbox" class="verification-check" data-type="respect">
                                <span class="checkmark">✓</span>
                                <span class="verification-text">El contenido es respetuoso y apropiado</span>
                            </label>
                            <label class="verification-item">
                                <input type="checkbox" class="verification-check" data-type="attribution">
                                <span class="checkmark">✓</span>
                                <span class="verification-text">He incluido la atribución apropiada</span>
                            </label>
                            <label class="verification-item">
                                <input type="checkbox" class="verification-check" data-type="educational">
                                <span class="checkmark">✓</span>
                                <span class="verification-text">El compartir promueve educación y respeto cultural</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="cancel-share">Cancelar</button>
                    <button class="continue-setup" style="display: none;">Configurar Mensaje</button>
                    <button class="share-content" style="display: none;" disabled>Compartir</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar eventos del modal
        this.setupSharingModalEvents(modal, content, culturalContext, sensitivity);
        
        // Animar entrada
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    generateTemplateOptions(content, culturalContext, sensitivity) {
        const applicableTemplates = this.getApplicableTemplates(content, culturalContext, sensitivity);
        
        return applicableTemplates.map(template => `
            <div class="template-option" data-template="${template.id}">
                <div class="template-header">
                    <h4>${template.title}</h4>
                    <div class="template-sensitivity ${template.culturalSensitivity}">
                        ${template.culturalSensitivity}
                    </div>
                </div>
                <div class="template-preview">
                    ${this.generateTemplatePreview(template, content, culturalContext)}
                </div>
                <button class="select-template">Seleccionar</button>
            </div>
        `).join('');
    }

    getApplicableTemplates(content, culturalContext, sensitivity) {
        const templates = Array.from(this.shareTemplates.entries()).map(([id, template]) => ({
            id,
            ...template
        }));
        
        // Filtrar templates según sensibilidad
        return templates.filter(template => {
            if (sensitivity.level === 'restricted') {
                return template.culturalSensitivity === 'very-high';
            } else if (sensitivity.level === 'careful') {
                return ['high', 'very-high'].includes(template.culturalSensitivity);
            } else {
                return true;
            }
        });
    }

    generatePlatformOptions(sensitivity) {
        return Array.from(this.platforms.entries()).map(([id, platform]) => {
            const isRecommended = this.isPlatformRecommended(platform, sensitivity);
            const isRestricted = this.isPlatformRestricted(platform, sensitivity);
            
            return `
                <div class="platform-option ${isRestricted ? 'restricted' : ''}" 
                     data-platform="${id}" 
                     ${isRestricted ? 'title="No recomendado para este tipo de contenido"' : ''}>
                    <div class="platform-icon">${platform.icon}</div>
                    <div class="platform-info">
                        <div class="platform-name">${platform.name}</div>
                        <div class="platform-audience">${this.getAudienceDescription(platform.audienceType)}</div>
                        ${isRecommended ? '<div class="recommended-badge">Recomendado</div>' : ''}
                    </div>
                    <input type="checkbox" class="platform-select" ${isRestricted ? 'disabled' : ''}>
                </div>
            `;
        }).join('');
    }

    setupSharingModalEvents(modal, content, culturalContext, sensitivity) {
        let selectedTemplate = null;
        let formData = {};
        
        // Selección de template
        modal.querySelectorAll('.select-template').forEach(btn => {
            btn.addEventListener('click', () => {
                const templateOption = btn.closest('.template-option');
                const templateId = templateOption.dataset.template;
                selectedTemplate = this.shareTemplates.get(templateId);
                
                // Marcar template seleccionado
                modal.querySelectorAll('.template-option').forEach(opt => 
                    opt.classList.remove('selected'));
                templateOption.classList.add('selected');
                
                // Mostrar botón continuar
                modal.querySelector('.continue-setup').style.display = 'inline-block';
                modal.querySelector('.continue-setup').onclick = () => {
                    this.setupSharingForm(modal, selectedTemplate, content, culturalContext);
                };
            });
        });
        
        // Cerrar modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.cancel-share').addEventListener('click', () => {
            modal.remove();
        });
    }

    setupSharingForm(modal, template, content, culturalContext) {
        const formFields = modal.querySelector('.form-fields');
        const sharingForm = modal.querySelector('.sharing-form');
        
        // Generar campos del formulario
        formFields.innerHTML = template.requiredFields.map(field => `
            <div class="form-field">
                <label class="field-label">${this.getFieldLabel(field)}</label>
                <textarea 
                    class="field-input" 
                    data-field="${field}"
                    placeholder="${this.getFieldPlaceholder(field, culturalContext)}"
                    rows="2">
                </textarea>
                <div class="field-hint">${this.getFieldHint(field)}</div>
            </div>
        `).join('');
        
        // Mostrar formulario
        sharingForm.style.display = 'block';
        modal.querySelector('.continue-setup').style.display = 'none';
        modal.querySelector('.share-content').style.display = 'inline-block';
        
        // Configurar eventos del formulario
        this.setupFormEvents(modal, template, content, culturalContext);
    }

    setupFormEvents(modal, template, content, culturalContext) {
        const inputs = modal.querySelectorAll('.field-input');
        const preview = modal.querySelector('.message-preview');
        const charCount = modal.querySelector('.character-count .current');
        const maxChars = modal.querySelector('.character-count .max');
        const shareBtn = modal.querySelector('.share-content');
        
        // Actualizar preview en tiempo real
        const updatePreview = () => {
            const fieldValues = {};
            inputs.forEach(input => {
                fieldValues[input.dataset.field] = input.value;
            });
            
            const message = this.generateMessage(template, fieldValues);
            preview.textContent = message;
            charCount.textContent = message.length;
            
            // Actualizar límite según plataforma seleccionada
            const selectedPlatform = modal.querySelector('.platform-option input:checked')?.closest('.platform-option');
            if (selectedPlatform) {
                const platformId = selectedPlatform.dataset.platform;
                const platform = this.platforms.get(platformId);
                maxChars.textContent = platform.maxLength;
                
                // Validar longitud
                const isValidLength = message.length <= platform.maxLength;
                preview.classList.toggle('over-limit', !isValidLength);
            }
            
            // Verificar si se puede compartir
            this.validateSharingForm(modal);
        };
        
        inputs.forEach(input => {
            input.addEventListener('input', updatePreview);
        });
        
        // Eventos de plataformas
        modal.querySelectorAll('.platform-select').forEach(checkbox => {
            checkbox.addEventListener('change', updatePreview);
        });
        
        // Eventos de verificación
        modal.querySelectorAll('.verification-check').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.validateSharingForm(modal);
            });
        });
        
        // Evento de compartir
        shareBtn.addEventListener('click', () => {
            this.executeShare(modal, template, content, culturalContext);
        });
    }

    validateSharingForm(modal) {
        const inputs = modal.querySelectorAll('.field-input');
        const platforms = modal.querySelectorAll('.platform-select:checked');
        const verifications = modal.querySelectorAll('.verification-check:checked');
        const shareBtn = modal.querySelector('.share-content');
        
        // Verificar campos completos
        const fieldsComplete = Array.from(inputs).every(input => input.value.trim().length > 0);
        
        // Verificar plataforma seleccionada
        const platformSelected = platforms.length > 0;
        
        // Verificar confirmaciones
        const verificationsComplete = verifications.length === modal.querySelectorAll('.verification-check').length;
        
        // Verificar longitud del mensaje
        const preview = modal.querySelector('.message-preview');
        const isValidLength = !preview.classList.contains('over-limit');
        
        const canShare = fieldsComplete && platformSelected && verificationsComplete && isValidLength;
        shareBtn.disabled = !canShare;
        
        // Feedback visual
        shareBtn.classList.toggle('ready', canShare);
    }

    executeShare(modal, template, content, culturalContext) {
        const fieldValues = {};
        modal.querySelectorAll('.field-input').forEach(input => {
            fieldValues[input.dataset.field] = input.value;
        });
        
        const selectedPlatforms = Array.from(modal.querySelectorAll('.platform-select:checked'))
            .map(checkbox => checkbox.closest('.platform-option').dataset.platform);
        
        const message = this.generateMessage(template, fieldValues);
        
        // Crear objeto de compartición
        const shareObject = {
            id: this.generateShareId(),
            message,
            template: template.title,
            platforms: selectedPlatforms,
            content,
            culturalContext,
            fieldValues,
            timestamp: Date.now(),
            userId: this.getUserId()
        };
        
        // Ejecutar compartición
        this.performShare(shareObject);
        
        // Mostrar confirmación
        this.showShareConfirmation(shareObject);
        
        // Cerrar modal
        modal.remove();
        
        // Registrar métricas
        this.recordShareMetrics(shareObject);
    }

    performShare(shareObject) {
        // Simular compartición a diferentes plataformas
        shareObject.platforms.forEach(platformId => {
            const platform = this.platforms.get(platformId);
            console.log(`Compartiendo en ${platform.name}:`, shareObject.message);
            
            // En implementación real, aquí se haría la llamada a la API de cada plataforma
            this.simulatePlatformShare(platformId, shareObject);
        });
        
        // Guardar en historial
        this.shareHistory.set(shareObject.id, shareObject);
        
        // Emitir evento
        const event = new CustomEvent('contentShared', {
            detail: shareObject
        });
        document.dispatchEvent(event);
    }

    showShareConfirmation(shareObject) {
        const confirmation = document.createElement('div');
        confirmation.className = 'share-confirmation';
        confirmation.innerHTML = `
            <div class="confirmation-content">
                <div class="success-icon">🎉</div>
                <h3>¡Contenido Compartido!</h3>
                <p>Tu experiencia cultural ha sido compartida de manera respetuosa.</p>
                
                <div class="share-summary">
                    <div class="shared-platforms">
                        <h4>Compartido en:</h4>
                        <div class="platform-list">
                            ${shareObject.platforms.map(platformId => {
                                const platform = this.platforms.get(platformId);
                                return `<span class="platform-badge">${platform.icon} ${platform.name}</span>`;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="cultural-impact">
                        <h4>Impacto Cultural:</h4>
                        <div class="impact-metrics">
                            <span class="metric">📈 Educación Cultural</span>
                            <span class="metric">🤝 Respeto Intercultural</span>
                            <span class="metric">🏛️ Preservación Cultural</span>
                        </div>
                    </div>
                </div>
                
                <div class="community-benefits">
                    <h4>Beneficios para la Comunidad:</h4>
                    <ul>
                        <li>Aumenta la visibilidad de la cultura</li>
                        <li>Promueve el respeto intercultural</li>
                        <li>Educa sobre tradiciones auténticas</li>
                        <li>Apoya la preservación cultural</li>
                    </ul>
                </div>
                
                <button class="continue-exploration">Continuar Explorando</button>
            </div>
        `;
        
        document.body.appendChild(confirmation);
        
        confirmation.querySelector('.continue-exploration').addEventListener('click', () => {
            confirmation.remove();
        });
        
        // Auto-cerrar después de 8 segundos
        setTimeout(() => {
            if (confirmation.parentNode) {
                confirmation.remove();
            }
        }, 8000);
    }

    // Métodos auxiliares
    containsSacredElements(content, culturalContext) {
        const sacredKeywords = ['ritual', 'sagrado', 'ceremonial', 'espiritual', 'ancestral'];
        const contentStr = JSON.stringify(content).toLowerCase();
        return sacredKeywords.some(keyword => contentStr.includes(keyword));
    }

    containsTraditionalKnowledge(content, culturalContext) {
        const knowledgeKeywords = ['tradición', 'conocimiento', 'sabiduría', 'técnica', 'medicina'];
        const contentStr = JSON.stringify(content).toLowerCase();
        return knowledgeKeywords.some(keyword => contentStr.includes(keyword));
    }

    containsArtisticExpressions(content, culturalContext) {
        const artisticKeywords = ['música', 'danza', 'artesanía', 'arte', 'expresión'];
        const contentStr = JSON.stringify(content).toLowerCase();
        return artisticKeywords.some(keyword => contentStr.includes(keyword));
    }

    getSensitivityIcon(level) {
        const icons = {
            'restricted': '🔒',
            'careful': '⚠️',
            'respectful': '🤝',
            'standard': '📤'
        };
        return icons[level] || '📤';
    }

    getSensitivityText(level) {
        const texts = {
            'restricted': 'Contenido Restringido',
            'careful': 'Requiere Cuidado',
            'respectful': 'Compartir Respetuoso',
            'standard': 'Compartir Estándar'
        };
        return texts[level] || 'Compartir Estándar';
    }

    generateMessage(template, fieldValues) {
        let message = template.template;
        
        Object.entries(fieldValues).forEach(([field, value]) => {
            message = message.replace(new RegExp(`{${field}}`, 'g'), value);
        });
        
        return message;
    }

    getFieldLabel(field) {
        const labels = {
            'culturalElement': 'Elemento Cultural',
            'region': 'Región',
            'insight': 'Tu Reflexión',
            'respectfulContext': 'Contexto Respetuoso',
            'learningInsight': 'Lo que Aprendiste',
            'culturalContext': 'Contexto Cultural',
            'respectfulApproach': 'Enfoque Respetuoso',
            'community': 'Comunidad',
            'appreciation': 'Tu Apreciación',
            'origin': 'Origen',
            'significance': 'Significado',
            'respectfulPractice': 'Práctica Respetuosa'
        };
        return labels[field] || field;
    }

    generateShareId() {
        return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        return localStorage.getItem('userId') || 'anonymous_' + Date.now();
    }

    recordShareMetrics(shareObject) {
        // Registrar métricas de compartición
        const metrics = {
            totalShares: (this.shareMetrics.get('totalShares') || 0) + 1,
            platformsUsed: new Set([
                ...(this.shareMetrics.get('platformsUsed') || new Set()),
                ...shareObject.platforms
            ]),
            culturalImpact: (this.shareMetrics.get('culturalImpact') || 0) + this.calculateCulturalImpact(shareObject)
        };
        
        Object.entries(metrics).forEach(([key, value]) => {
            this.shareMetrics.set(key, value);
        });
    }

    calculateCulturalImpact(shareObject) {
        // Calcular impacto cultural basado en plataformas y contenido
        let impact = 0;
        
        shareObject.platforms.forEach(platformId => {
            const platform = this.platforms.get(platformId);
            if (platform.culturalFocus) impact += 10;
            else impact += 5;
        });
        
        return impact;
    }

    // API pública
    getShareHistory() {
        return new Map(this.shareHistory);
    }

    getShareMetrics() {
        return new Map(this.shareMetrics);
    }

    createCustomShareTemplate(name, template, sensitivity) {
        this.shareTemplates.set(name, {
            title: name,
            template,
            culturalSensitivity: sensitivity,
            custom: true
        });
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.socialSharingManager = new SocialSharingManager();
});

export default SocialSharingManager;