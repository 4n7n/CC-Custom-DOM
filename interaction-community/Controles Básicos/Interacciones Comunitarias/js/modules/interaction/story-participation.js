/**
 * RAMA 7: Story Participation - Sistema de participación narrativa
 * Permite a los usuarios contribuir activamente a la construcción de la historia
 */

class StoryParticipationManager {
    constructor() {
        this.participationTypes = new Map();
        this.userContributions = new Map();
        this.narrativeInfluence = 0;
        this.collaborativeElements = new Map();
        this.storyBranches = new Map();
        this.communityNarrative = {
            threads: new Map(),
            activeCollaborations: new Set(),
            pendingContributions: new Map()
        };
        
        this.init();
    }

    init() {
        this.setupParticipationTypes();
        this.bindEvents();
        this.createParticipationInterface();
        this.loadExistingContributions();
        this.initializeCollaborativeSystems();
    }

    setupParticipationTypes() {
        this.participationTypes.set('story-contribution', {
            name: 'Contribución Narrativa',
            description: 'Añade elementos a la historia principal',
            culturalWeight: 3,
            approvalRequired: true,
            minLength: 50,
            maxLength: 300,
            rewards: { influence: 10, reputation: 15 }
        });

        this.participationTypes.set('character-development', {
            name: 'Desarrollo de Personaje',
            description: 'Expande la historia de los personajes',
            culturalWeight: 2,
            approvalRequired: true,
            minLength: 30,
            maxLength: 200,
            rewards: { influence: 7, reputation: 10 }
        });

        this.participationTypes.set('cultural-detail', {
            name: 'Detalle Cultural',
            description: 'Añade información cultural auténtica',
            culturalWeight: 4,
            approvalRequired: true,
            minLength: 20,
            maxLength: 150,
            rewards: { influence: 12, reputation: 20 }
        });

        this.participationTypes.set('dialogue-suggestion', {
            name: 'Sugerencia de Diálogo',
            description: 'Propone diálogos para personajes',
            culturalWeight: 2,
            approvalRequired: false,
            minLength: 10,
            maxLength: 100,
            rewards: { influence: 5, reputation: 8 }
        });

        this.participationTypes.set('narrative-branch', {
            name: 'Rama Narrativa',
            description: 'Crea una rama alternativa de la historia',
            culturalWeight: 4,
            approvalRequired: true,
            minLength: 100,
            maxLength: 500,
            rewards: { influence: 20, reputation: 30 }
        });

        this.participationTypes.set('cultural-interpretation', {
            name: 'Interpretación Cultural',
            description: 'Ofrece perspectivas culturales únicas',
            culturalWeight: 5,
            approvalRequired: true,
            minLength: 75,
            maxLength: 250,
            rewards: { influence: 15, reputation: 25 }
        });
    }

    bindEvents() {
        document.addEventListener('narrativePoint', this.handleNarrativePoint.bind(this));
        document.addEventListener('participationTrigger', this.handleParticipationTrigger.bind(this));
        document.addEventListener('contributionSubmit', this.handleContributionSubmit.bind(this));
        document.addEventListener('collaborationInvite', this.handleCollaborationInvite.bind(this));
        
        // Eventos de UI
        document.addEventListener('click', this.handleUIClick.bind(this));
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    handleNarrativePoint(event) {
        const { action, progress } = event.detail;
        
        // Detectar oportunidades de participación
        if (this.shouldOfferParticipation(action, progress)) {
            this.offerParticipationOpportunity(action, progress);
        }
    }

    shouldOfferParticipation(action, progress) {
        const participationTriggers = {
            'revealCulture': progress > 0.3,
            'showInteraction': progress > 0.5,
            'presentChoices': progress > 0.7,
            'concludeSection': progress > 0.9
        };
        
        return participationTriggers[action] || false;
    }

    offerParticipationOpportunity(action, progress) {
        const opportunityTypes = this.getOpportunityTypes(action);
        
        const opportunity = {
            id: this.generateOpportunityId(),
            action,
            progress,
            types: opportunityTypes,
            timestamp: Date.now(),
            context: this.getCurrentNarrativeContext(),
            culturalElements: this.getActiveCulturalElements()
        };
        
        this.showParticipationPrompt(opportunity);
    }

    getOpportunityTypes(action) {
        const actionOpportunities = {
            'revealCulture': ['cultural-detail', 'cultural-interpretation'],
            'showInteraction': ['character-development', 'dialogue-suggestion'],
            'presentChoices': ['story-contribution', 'narrative-branch'],
            'concludeSection': ['story-contribution', 'cultural-interpretation']
        };
        
        return actionOpportunities[action] || ['story-contribution'];
    }

    showParticipationPrompt(opportunity) {
        const prompt = document.createElement('div');
        prompt.className = 'participation-prompt';
        prompt.innerHTML = `
            <div class="prompt-content">
                <div class="prompt-header">
                    <div class="participation-icon">✨</div>
                    <h3>¡Oportunidad de Participación!</h3>
                    <button class="close-prompt">×</button>
                </div>
                
                <div class="prompt-body">
                    <p class="prompt-description">
                        Puedes contribuir a esta parte de la historia. 
                        Tu participación ayudará a enriquecer la narrativa cultural.
                    </p>
                    
                    <div class="participation-options">
                        ${opportunity.types.map(type => this.createParticipationOption(type)).join('')}
                    </div>
                    
                    <div class="cultural-context">
                        <div class="context-label">Contexto Cultural Actual:</div>
                        <div class="context-elements">
                            ${opportunity.culturalElements.map(el => 
                                `<span class="cultural-tag">${el}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="prompt-actions">
                    <button class="participate-later">Participar Después</button>
                    <button class="start-participation">Comenzar Contribución</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(prompt);
        
        // Animar entrada
        requestAnimationFrame(() => {
            prompt.classList.add('show');
        });
        
        // Configurar eventos
        this.setupPromptEvents(prompt, opportunity);
        
        // Auto-cerrar después de 15 segundos
        setTimeout(() => {
            if (prompt.parentNode) {
                this.hideParticipationPrompt(prompt);
            }
        }, 15000);
    }

    createParticipationOption(type) {
        const config = this.participationTypes.get(type);
        
        return `
            <div class="participation-option" data-type="${type}">
                <div class="option-header">
                    <h4>${config.name}</h4>
                    <div class="cultural-weight">
                        ${this.createCulturalWeightIndicator(config.culturalWeight)}
                    </div>
                </div>
                <p class="option-description">${config.description}</p>
                <div class="option-requirements">
                    <span class="length-req">${config.minLength}-${config.maxLength} caracteres</span>
                    ${config.approvalRequired ? '<span class="approval-req">Requiere aprobación</span>' : ''}
                </div>
                <div class="option-rewards">
                    <span class="influence-reward">+${config.rewards.influence} influencia</span>
                    <span class="reputation-reward">+${config.rewards.reputation} reputación</span>
                </div>
            </div>
        `;
    }

    createCulturalWeightIndicator(weight) {
        return Array.from({ length: 5 }, (_, i) => 
            `<div class="weight-dot ${i < weight ? 'active' : ''}"></div>`
        ).join('');
    }

    setupPromptEvents(prompt, opportunity) {
        prompt.querySelector('.close-prompt').addEventListener('click', () => {
            this.hideParticipationPrompt(prompt);
        });
        
        prompt.querySelector('.participate-later').addEventListener('click', () => {
            this.saveParticipationOpportunity(opportunity);
            this.hideParticipationPrompt(prompt);
        });
        
        prompt.querySelector('.start-participation').addEventListener('click', () => {
            const selectedType = prompt.querySelector('.participation-option.selected')?.dataset.type;
            if (selectedType) {
                this.startParticipation(selectedType, opportunity);
                this.hideParticipationPrompt(prompt);
            }
        });
        
        // Selección de opciones
        prompt.querySelectorAll('.participation-option').forEach(option => {
            option.addEventListener('click', () => {
                prompt.querySelectorAll('.participation-option').forEach(opt => 
                    opt.classList.remove('selected'));
                option.classList.add('selected');
                
                const startBtn = prompt.querySelector('.start-participation');
                startBtn.disabled = false;
                startBtn.textContent = `Contribuir: ${this.participationTypes.get(option.dataset.type).name}`;
            });
        });
    }

    startParticipation(type, opportunity) {
        const config = this.participationTypes.get(type);
        
        const participationModal = document.createElement('div');
        participationModal.className = 'participation-modal';
        participationModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${config.name}</h2>
                    <div class="progress-indicator">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <span class="progress-text">Paso 1 de 3</span>
                    </div>
                </div>
                
                <div class="participation-steps">
                    <div class="step active" data-step="1">
                        <h3>Escribe tu Contribución</h3>
                        <div class="writing-area">
                            <textarea 
                                class="contribution-text" 
                                placeholder="Escribe tu contribución aquí..."
                                minlength="${config.minLength}"
                                maxlength="${config.maxLength}">
                            </textarea>
                            <div class="character-count">
                                <span class="current">0</span>/<span class="max">${config.maxLength}</span>
                            </div>
                        </div>
                        
                        <div class="writing-guidelines">
                            <h4>Pautas para la Contribución:</h4>
                            <ul>
                                <li>Mantén la autenticidad cultural</li>
                                <li>Respeta el tono narrativo establecido</li>
                                <li>Incluye detalles sensoriales</li>
                                <li>Considera el impacto en personajes</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="step" data-step="2">
                        <h3>Contexto Cultural</h3>
                        <div class="cultural-context-form">
                            <div class="context-field">
                                <label>Elementos Culturales Incluidos:</label>
                                <div class="cultural-tags-input">
                                    <input type="text" placeholder="Ej: tradición, ritual, costumbre...">
                                    <button class="add-tag">Añadir</button>
                                </div>
                                <div class="selected-tags"></div>
                            </div>
                            
                            <div class="context-field">
                                <label>Región Cultural:</label>
                                <select class="cultural-region">
                                    <option value="">Seleccionar región...</option>
                                    <option value="andes">Región Andina</option>
                                    <option value="caribe">Región Caribeña</option>
                                    <option value="amazonia">Región Amazónica</option>
                                    <option value="llanos">Región de los Llanos</option>
                                    <option value="pacifico">Región Pacífica</option>
                                </select>
                            </div>
                            
                            <div class="context-field">
                                <label>Nivel de Autenticidad:</label>
                                <div class="authenticity-slider">
                                    <input type="range" min="1" max="5" value="3" class="slider">
                                    <div class="slider-labels">
                                        <span>Interpretación</span>
                                        <span>Auténtico</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="step" data-step="3">
                        <h3>Revisión y Envío</h3>
                        <div class="contribution-preview">
                            <div class="preview-text"></div>
                            <div class="preview-metadata">
                                <div class="metadata-item">
                                    <span class="label">Tipo:</span>
                                    <span class="value">${config.name}</span>
                                </div>
                                <div class="metadata-item">
                                    <span class="label">Longitud:</span>
                                    <span class="value length-value">0 caracteres</span>
                                </div>
                                <div class="metadata-item">
                                    <span class="label">Elementos Culturales:</span>
                                    <span class="value cultural-elements-value">Ninguno</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="submission-options">
                            <div class="option-group">
                                <input type="checkbox" id="anonymous-submission" checked>
                                <label for="anonymous-submission">Envío anónimo</label>
                            </div>
                            <div class="option-group">
                                <input type="checkbox" id="community-feedback">
                                <label for="community-feedback">Solicitar feedback de la comunidad</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="cancel-btn">Cancelar</button>
                    <button class="prev-btn" disabled>Anterior</button>
                    <button class="next-btn">Siguiente</button>
                    <button class="submit-btn" style="display: none;">Enviar Contribución</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(participationModal);
        
        // Configurar eventos del modal
        this.setupParticipationModalEvents(participationModal, type, opportunity);
        
        // Animar entrada
        requestAnimationFrame(() => {
            participationModal.classList.add('show');
        });
    }

    setupParticipationModalEvents(modal, type, opportunity) {
        let currentStep = 1;
        const config = this.participationTypes.get(type);
        
        const updateStep = (step) => {
            currentStep = step;
            
            // Actualizar pasos visibles
            modal.querySelectorAll('.step').forEach((stepEl, index) => {
                stepEl.classList.toggle('active', index + 1 === step);
            });
            
            // Actualizar progress bar
            const progressFill = modal.querySelector('.progress-fill');
            const progressText = modal.querySelector('.progress-text');
            progressFill.style.width = `${(step / 3) * 100}%`;
            progressText.textContent = `Paso ${step} de 3`;
            
            // Actualizar botones
            modal.querySelector('.prev-btn').disabled = step === 1;
            modal.querySelector('.next-btn').style.display = step === 3 ? 'none' : 'inline-block';
            modal.querySelector('.submit-btn').style.display = step === 3 ? 'inline-block' : 'none';
        };
        
        // Navegación entre pasos
        modal.querySelector('.next-btn').addEventListener('click', () => {
            if (this.validateCurrentStep(modal, currentStep)) {
                updateStep(currentStep + 1);
                if (currentStep === 3) {
                    this.updatePreview(modal);
                }
            }
        });
        
        modal.querySelector('.prev-btn').addEventListener('click', () => {
            updateStep(currentStep - 1);
        });
        
        // Contador de caracteres
        const textArea = modal.querySelector('.contribution-text');
        const charCount = modal.querySelector('.character-count .current');
        
        textArea.addEventListener('input', () => {
            const length = textArea.value.length;
            charCount.textContent = length;
            
            // Validación visual
            const isValid = length >= config.minLength && length <= config.maxLength;
            textArea.classList.toggle('valid', isValid);
            textArea.classList.toggle('invalid', !isValid);
        });
        
        // Tags culturales
        this.setupCulturalTagsInput(modal);
        
        // Botones de acción
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.submit-btn').addEventListener('click', () => {
            this.submitContribution(modal, type, opportunity);
        });
        
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.parentNode) {
                modal.remove();
            }
        });
    }

    setupCulturalTagsInput(modal) {
        const input = modal.querySelector('.cultural-tags-input input');
        const addBtn = modal.querySelector('.add-tag');
        const tagsContainer = modal.querySelector('.selected-tags');
        const selectedTags = new Set();
        
        const addTag = () => {
            const tag = input.value.trim();
            if (tag && !selectedTags.has(tag)) {
                selectedTags.add(tag);
                
                const tagEl = document.createElement('span');
                tagEl.className = 'cultural-tag';
                tagEl.innerHTML = `
                    ${tag}
                    <button class="remove-tag">×</button>
                `;
                
                tagEl.querySelector('.remove-tag').addEventListener('click', () => {
                    selectedTags.delete(tag);
                    tagEl.remove();
                });
                
                tagsContainer.appendChild(tagEl);
                input.value = '';
            }
        };
        
        addBtn.addEventListener('click', addTag);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
            }
        });
    }

    validateCurrentStep(modal, step) {
        const config = this.participationTypes.get(modal.dataset.type);
        
        switch (step) {
            case 1:
                const text = modal.querySelector('.contribution-text').value;
                const isValidLength = text.length >= config.minLength && text.length <= config.maxLength;
                
                if (!isValidLength) {
                    this.showValidationError(modal, `El texto debe tener entre ${config.minLength} y ${config.maxLength} caracteres.`);
                    return false;
                }
                return true;
                
            case 2:
                const region = modal.querySelector('.cultural-region').value;
                if (!region) {
                    this.showValidationError(modal, 'Por favor selecciona una región cultural.');
                    return false;
                }
                return true;
                
            default:
                return true;
        }
    }

    showValidationError(modal, message) {
        let errorEl = modal.querySelector('.validation-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'validation-error';
            modal.querySelector('.modal-content').appendChild(errorEl);
        }
        
        errorEl.textContent = message;
        errorEl.classList.add('show');
        
        setTimeout(() => {
            errorEl.classList.remove('show');
        }, 5000);
    }

    updatePreview(modal) {
        const text = modal.querySelector('.contribution-text').value;
        const tags = Array.from(modal.querySelectorAll('.cultural-tag')).map(tag => 
            tag.textContent.replace('×', '').trim()
        );
        
        modal.querySelector('.preview-text').textContent = text;
        modal.querySelector('.length-value').textContent = `${text.length} caracteres`;
        modal.querySelector('.cultural-elements-value').textContent = 
            tags.length > 0 ? tags.join(', ') : 'Ninguno';
    }

    submitContribution(modal, type, opportunity) {
        const contribution = {
            id: this.generateContributionId(),
            type,
            text: modal.querySelector('.contribution-text').value,
            culturalTags: Array.from(modal.querySelectorAll('.cultural-tag')).map(tag => 
                tag.textContent.replace('×', '').trim()
            ),
            region: modal.querySelector('.cultural-region').value,
            authenticity: parseInt(modal.querySelector('.authenticity-slider input').value),
            anonymous: modal.querySelector('#anonymous-submission').checked,
            requestFeedback: modal.querySelector('#community-feedback').checked,
            opportunity,
            timestamp: Date.now(),
            status: 'pending',
            userId: this.getUserId()
        };
        
        // Guardar contribución
        this.userContributions.set(contribution.id, contribution);
        
        // Procesar según tipo
        this.processContribution(contribution);
        
        // Mostrar confirmación
        this.showSubmissionConfirmation(contribution);
        
        // Cerrar modal
        modal.remove();
        
        // Actualizar estadísticas del usuario
        this.updateUserStats(contribution);
    }

    processContribution(contribution) {
        const config = this.participationTypes.get(contribution.type);
        
        if (config.approvalRequired) {
            this.sendForApproval(contribution);
        } else {
            this.approveContribution(contribution);
        }
        
        // Emitir evento de contribución
        const event = new CustomEvent('storyContribution', {
            detail: { contribution }
        });
        document.dispatchEvent(event);
    }

    sendForApproval(contribution) {
        // Simular envío para aprobación
        contribution.status = 'pending_approval';
        
        // En una implementación real, esto se enviaría a moderadores
        console.log('Contribution sent for approval:', contribution);
        
        // Simular aprobación después de un tiempo (para demo)
        setTimeout(() => {
            this.approveContribution(contribution);
        }, 5000);
    }

    approveContribution(contribution) {
        contribution.status = 'approved';
        contribution.approvedAt = Date.now();
        
        // Aplicar a la narrativa
        this.integrateContribution(contribution);
        
        // Notificar al usuario
        this.notifyContributionApproved(contribution);
    }

    integrateContribution(contribution) {
        // Integrar la contribución en la narrativa
        const narrativeEvent = new CustomEvent('narrativeContribution', {
            detail: {
                contribution,
                integration: this.generateIntegrationContext(contribution)
            }
        });
        
        document.dispatchEvent(narrativeEvent);
    }

    generateIntegrationContext(contribution) {
        return {
            position: this.findOptimalInsertionPoint(contribution),
            style: this.determineIntegrationStyle(contribution),
            culturalContext: contribution.culturalTags,
            narrativeImpact: this.calculateNarrativeImpact(contribution)
        };
    }

    showSubmissionConfirmation(contribution) {
        const confirmation = document.createElement('div');
        confirmation.className = 'submission-confirmation';
        confirmation.innerHTML = `
            <div class="confirmation-content">
                <div class="success-icon">✅</div>
                <h3>¡Contribución Enviada!</h3>
                <p>Tu ${this.participationTypes.get(contribution.type).name.toLowerCase()} ha sido enviada.</p>
                
                ${contribution.status === 'pending_approval' ? `
                    <div class="approval-notice">
                        <p>Tu contribución está siendo revisada por la comunidad.</p>
                        <p>Recibirás una notificación cuando sea aprobada.</p>
                    </div>
                ` : `
                    <div class="immediate-approval">
                        <p>Tu contribución ha sido integrada inmediatamente a la historia.</p>
                    </div>
                `}
                
                <div class="rewards-earned">
                    <h4>Recompensas Ganadas:</h4>
                    <div class="reward-items">
                        <span class="influence">+${this.participationTypes.get(contribution.type).rewards.influence} Influencia</span>
                        <span class="reputation">+${this.participationTypes.get(contribution.type).rewards.reputation} Reputación</span>
                    </div>
                </div>
                
                <button class="continue-story">Continuar Historia</button>
            </div>
        `;
        
        document.body.appendChild(confirmation);
        
        confirmation.querySelector('.continue-story').addEventListener('click', () => {
            confirmation.remove();
        });
        
        // Auto-cerrar después de 8 segundos
        setTimeout(() => {
            if (confirmation.parentNode) {
                confirmation.remove();
            }
        }, 8000);
    }

    updateUserStats(contribution) {
        const config = this.participationTypes.get(contribution.type);
        
        this.narrativeInfluence += config.rewards.influence;
        
        // Actualizar estadísticas en el perfil del usuario
        const userProfile = this.getUserProfile();
        userProfile.contributions = (userProfile.contributions || 0) + 1;
        userProfile.influence = (userProfile.influence || 0) + config.rewards.influence;
        userProfile.reputation = (userProfile.reputation || 0) + config.rewards.reputation;
        
        this.saveUserProfile(userProfile);
    }

    // Métodos auxiliares
    generateOpportunityId() {
        return 'opp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateContributionId() {
        return 'contrib_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        return localStorage.getItem('userId') || 'anonymous_' + Date.now();
    }

    getCurrentNarrativeContext() {
        return {
            section: document.querySelector('[data-story-section]')?.dataset.storySection || 'unknown',
            characters: this.getActiveCharacters(),
            location: this.getCurrentLocation(),
            culturalElements: this.getActiveCulturalElements()
        };
    }

    getActiveCulturalElements() {
        return Array.from(document.querySelectorAll('.cultural-element.active'))
            .map(el => el.dataset.culturalName || 'elemento cultural');
    }

    getActiveCharacters() {
        return Array.from(document.querySelectorAll('.character.active'))
            .map(el => el.dataset.characterName || 'personaje');
    }

    getCurrentLocation() {
        return document.querySelector('.current-location')?.textContent || 'ubicación desconocida';
    }

    hideParticipationPrompt(prompt) {
        prompt.classList.remove('show');
        setTimeout(() => {
            if (prompt.parentNode) {
                prompt.remove();
            }
        }, 300);
    }

    // API pública
    getUserContributions() {
        return new Map(this.userContributions);
    }

    getNarrativeInfluence() {
        return this.narrativeInfluence;
    }

    getParticipationStats() {
        return {
            totalContributions: this.userContributions.size,
            narrativeInfluence: this.narrativeInfluence,
            approvedContributions: Array.from(this.userContributions.values())
                .filter(c => c.status === 'approved').length,
            pendingContributions: Array.from(this.userContributions.values())
                .filter(c => c.status === 'pending_approval').length
        };
    }

    startCollaborativeStory(title, description) {
        // Iniciar una historia colaborativa
        const collaboration = {
            id: this.generateCollaborationId(),
            title,
            description,
            creator: this.getUserId(),
            participants: new Set([this.getUserId()]),
            contributions: new Map(),
            status: 'active',
            createdAt: Date.now()
        };
        
        this.communityNarrative.activeCollaborations.add(collaboration.id);
        return collaboration;
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.storyParticipationManager = new StoryParticipationManager();
});

export default StoryParticipationManager;