/**
 * RAMA 7: Choice System - Sistema avanzado de elecciones narrativas
 * Gestiona decisiones complejas con consecuencias culturales y narrativas
 */

class ChoiceSystemManager {
    constructor() {
        this.activeChoices = new Map();
        this.choiceHistory = new Map();
        this.narrativeBranches = new Map();
        this.culturalConsequences = new Map();
        this.choiceWeights = new Map();
        this.dependencyGraph = new Map();
        this.choiceTemplates = new Map();
        this.adaptiveChoices = new Map();
        this.userProfile = new Map();
        
        this.init();
    }

    init() {
        this.setupChoiceTemplates();
        this.setupCulturalConsequences();
        this.bindChoiceEvents();
        this.createChoiceInterface();
        this.initializeAdaptiveSystem();
        this.loadUserProfile();
    }

    setupChoiceTemplates() {
        // Templates para diferentes tipos de elecciones
        this.choiceTemplates.set('cultural-dilemma', {
            name: 'Dilema Cultural',
            structure: {
                maxOptions: 4,
                requiresContext: true,
                culturalWeight: 'high',
                timeConstraint: 'flexible',
                consequences: 'long-term'
            },
            validation: {
                culturalSensitivity: true,
                expertReview: true,
                communityInput: true
            }
        });

        this.choiceTemplates.set('ethical-decision', {
            name: 'Decisión Ética',
            structure: {
                maxOptions: 3,
                requiresContext: true,
                culturalWeight: 'very-high',
                timeConstraint: 'thoughtful',
                consequences: 'permanent'
            },
            validation: {
                culturalSensitivity: true,
                expertReview: true,
                communityInput: true,
                ethicsReview: true
            }
        });

        this.choiceTemplates.set('learning-path', {
            name: 'Camino de Aprendizaje',
            structure: {
                maxOptions: 5,
                requiresContext: false,
                culturalWeight: 'medium',
                timeConstraint: 'flexible',
                consequences: 'educational'
            },
            validation: {
                culturalSensitivity: false,
                expertReview: false,
                communityInput: false
            }
        });

        this.choiceTemplates.set('character-relationship', {
            name: 'Relación con Personaje',
            structure: {
                maxOptions: 3,
                requiresContext: true,
                culturalWeight: 'medium',
                timeConstraint: 'immediate',
                consequences: 'relationship'
            },
            validation: {
                culturalSensitivity: true,
                expertReview: false,
                communityInput: true
            }
        });

        this.choiceTemplates.set('cultural-participation', {
            name: 'Participación Cultural',
            structure: {
                maxOptions: 4,
                requiresContext: true,
                culturalWeight: 'very-high',
                timeConstraint: 'respectful',
                consequences: 'cultural-impact'
            },
            validation: {
                culturalSensitivity: true,
                expertReview: true,
                communityInput: true,
                respectProtocol: true
            }
        });
    }

    setupCulturalConsequences() {
        // Sistema de consecuencias culturales
        this.culturalConsequences.set('respect-gained', {
            type: 'positive',
            impact: 'relationship',
            duration: 'long-term',
            culturalValue: 15,
            description: 'Ganas respeto de la comunidad'
        });

        this.culturalConsequences.set('cultural-understanding', {
            type: 'educational',
            impact: 'knowledge',
            duration: 'permanent',
            culturalValue: 20,
            description: 'Desarrollas comprensión cultural profunda'
        });

        this.culturalConsequences.set('tradition-preserved', {
            type: 'positive',
            impact: 'community',
            duration: 'generational',
            culturalValue: 30,
            description: 'Contribuyes a preservar una tradición'
        });

        this.culturalConsequences.set('cultural-bridge', {
            type: 'positive',
            impact: 'intercultural',
            duration: 'long-term',
            culturalValue: 25,
            description: 'Creas un puente entre culturas'
        });

        this.culturalConsequences.set('wisdom-gained', {
            type: 'educational',
            impact: 'personal',
            duration: 'permanent',
            culturalValue: 18,
            description: 'Adquieres sabiduría ancestral'
        });

        this.culturalConsequences.set('community-trust', {
            type: 'positive',
            impact: 'relationship',
            duration: 'long-term',
            culturalValue: 22,
            description: 'La comunidad confía en ti'
        });
    }

    bindChoiceEvents() {
        document.addEventListener('presentChoice', this.handleChoicePresentation.bind(this));
        document.addEventListener('choiceSelected', this.handleChoiceSelection.bind(this));
        document.addEventListener('narrativeStateChange', this.handleNarrativeChange.bind(this));
        document.addEventListener('culturalContextChange', this.handleCulturalChange.bind(this));
        
        // Eventos de UI
        document.addEventListener('click', this.handleChoiceClick.bind(this));
        document.addEventListener('choiceHover', this.handleChoiceHover.bind(this));
    }

    handleChoicePresentation(event) {
        const choiceData = event.detail;
        const choice = this.createChoice(choiceData);
        
        // Adaptar elección según perfil del usuario
        this.adaptChoiceToUser(choice);
        
        // Crear interfaz de elección
        this.presentChoice(choice);
        
        // Registrar presentación
        this.recordChoicePresentation(choice);
    }

    createChoice(choiceData) {
        const choice = {
            id: this.generateChoiceId(),
            template: choiceData.template || 'cultural-dilemma',
            context: choiceData.context,
            title: choiceData.title,
            description: choiceData.description,
            culturalContext: choiceData.culturalContext,
            options: choiceData.options.map((option, index) => ({
                id: index,
                text: option.text,
                consequence: option.consequence,
                culturalImpact: option.culturalImpact || 'neutral',
                emotionalWeight: option.emotionalWeight || 'neutral',
                difficulty: option.difficulty || 'medium',
                prerequisites: option.prerequisites || [],
                unlocks: option.unlocks || [],
                culturalConsequences: option.culturalConsequences || []
            })),
            timestamp: Date.now(),
            status: 'presented',
            dependencies: choiceData.dependencies || [],
            timeLimit: choiceData.timeLimit || null,
            difficulty: choiceData.difficulty || 'medium',
            culturalSensitivity: choiceData.culturalSensitivity || 'medium'
        };

        this.activeChoices.set(choice.id, choice);
        return choice;
    }

    adaptChoiceToUser(choice) {
        const userProfile = this.getUserProfile();
        
        // Adaptar según experiencia cultural
        if (userProfile.culturalExperience < 30) {
            this.addGuidanceToChoice(choice);
        }
        
        // Adaptar según preferencias de aprendizaje
        if (userProfile.learningStyle === 'visual') {
            this.enhanceVisualElements(choice);
        }
        
        // Adaptar según historial de elecciones
        this.adjustBasedOnHistory(choice);
        
        // Adaptar según sensibilidad cultural
        if (userProfile.culturalSensitivity === 'high') {
            this.emphasizeCulturalContext(choice);
        }
    }

    presentChoice(choice) {
        const choiceInterface = document.createElement('div');
        choiceInterface.className = 'choice-interface';
        choiceInterface.id = `choice-${choice.id}`;
        choiceInterface.innerHTML = `
            <div class="choice-container">
                <div class="choice-header">
                    <div class="choice-type">
                        <span class="type-icon">${this.getChoiceTypeIcon(choice.template)}</span>
                        <span class="type-name">${this.choiceTemplates.get(choice.template).name}</span>
                    </div>
                    <div class="cultural-sensitivity ${choice.culturalSensitivity}">
                        <span class="sensitivity-label">Sensibilidad Cultural:</span>
                        <span class="sensitivity-level">${choice.culturalSensitivity}</span>
                    </div>
                    ${choice.timeLimit ? `
                        <div class="time-constraint">
                            <span class="timer-icon">⏱️</span>
                            <span class="time-remaining">${this.formatTimeLimit(choice.timeLimit)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="choice-content">
                    <h3 class="choice-title">${choice.title}</h3>
                    <p class="choice-description">${choice.description}</p>
                    
                    ${choice.culturalContext ? `
                        <div class="cultural-context">
                            <div class="context-header">
                                <span class="context-icon">🏛️</span>
                                <span class="context-label">Contexto Cultural</span>
                            </div>
                            <p class="context-text">${choice.culturalContext}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="choice-options">
                    ${choice.options.map(option => this.createOptionHTML(option, choice)).join('')}
                </div>
                
                <div class="choice-guidance">
                    ${this.createChoiceGuidance(choice)}
                </div>
                
                <div class="choice-actions">
                    <button class="reflect-btn">Reflexionar</button>
                    <button class="context-btn">Más Contexto</button>
                    <button class="consequences-btn">Ver Consecuencias</button>
                </div>
                
                <div class="choice-progress">
                    <div class="progress-label">Tu Journey Cultural</div>
                    <div class="progress-indicators">
                        <div class="indicator" data-type="respect">
                            <span class="indicator-icon">🙏</span>
                            <span class="indicator-label">Respeto</span>
                            <div class="indicator-bar">
                                <div class="indicator-fill" style="width: ${this.getUserRespectLevel()}%"></div>
                            </div>
                        </div>
                        <div class="indicator" data-type="understanding">
                            <span class="indicator-icon">🧠</span>
                            <span class="indicator-label">Comprensión</span>
                            <div class="indicator-bar">
                                <div class="indicator-fill" style="width: ${this.getUserUnderstandingLevel()}%"></div>
                            </div>
                        </div>
                        <div class="indicator" data-type="connection">
                            <span class="indicator-icon">🤝</span>
                            <span class="indicator-label">Conexión</span>
                            <div class="indicator-bar">
                                <div class="indicator-fill" style="width: ${this.getUserConnectionLevel()}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar en la narrativa
        const narrativeContainer = document.querySelector('.narrative-container') || document.body;
        narrativeContainer.appendChild(choiceInterface);
        
        // Configurar eventos
        this.setupChoiceEvents(choiceInterface, choice);
        
        // Animar entrada
        requestAnimationFrame(() => {
            choiceInterface.classList.add('active');
        });
        
        // Configurar timer si existe
        if (choice.timeLimit) {
            this.startChoiceTimer(choice);
        }
    }

    createOptionHTML(option, choice) {
        const isAccessible = this.isOptionAccessible(option);
        const culturalImpactClass = option.culturalImpact.replace('_', '-');
        
        return `
            <div class="choice-option ${isAccessible ? '' : 'locked'}" 
                 data-option-id="${option.id}" 
                 data-choice-id="${choice.id}">
                <div class="option-main">
                    <div class="option-text">${option.text}</div>
                    <div class="option-indicators">
                        <div class="cultural-impact ${culturalImpactClass}">
                            <span class="impact-icon">${this.getCulturalImpactIcon(option.culturalImpact)}</span>
                            <span class="impact-label">${option.culturalImpact}</span>
                        </div>
                        <div class="difficulty ${option.difficulty}">
                            <span class="difficulty-label">${option.difficulty}</span>
                        </div>
                    </div>
                </div>
                
                <div class="option-details">
                    <div class="consequence-preview">
                        <span class="consequence-label">Consecuencia:</span>
                        <span class="consequence-text">${option.consequence}</span>
                    </div>
                    
                    ${option.culturalConsequences.length > 0 ? `
                        <div class="cultural-consequences">
                            <span class="consequences-label">Impacto Cultural:</span>
                            <div class="consequences-list">
                                ${option.culturalConsequences.map(conseq => 
                                    `<span class="consequence-tag">${conseq}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${option.prerequisites.length > 0 ? `
                        <div class="prerequisites">
                            <span class="prereq-label">Requiere:</span>
                            <div class="prereq-list">
                                ${option.prerequisites.map(prereq => 
                                    `<span class="prereq-tag ${this.hasPrerequisite(prereq) ? 'met' : 'unmet'}">${prereq}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="option-selection">
                    ${isAccessible ? 
                        `<button class="select-option">Elegir</button>` :
                        `<div class="unlock-requirements">${this.getUnlockRequirements(option)}</div>`
                    }
                </div>
            </div>
        `;
    }

    createChoiceGuidance(choice) {
        const template = this.choiceTemplates.get(choice.template);
        const userProfile = this.getUserProfile();
        
        let guidance = '';
        
        if (userProfile.culturalExperience < 50) {
            guidance += `
                <div class="guidance-section">
                    <h4>💡 Guía Cultural</h4>
                    <p>Considera el contexto cultural y las tradiciones de la comunidad antes de decidir.</p>
                </div>
            `;
        }
        
        if (choice.culturalSensitivity === 'high' || choice.culturalSensitivity === 'very-high') {
            guidance += `
                <div class="guidance-section sensitive">
                    <h4>⚠️ Sensibilidad Cultural</h4>
                    <p>Esta decisión tiene implicaciones culturales importantes. Tómate tu tiempo para reflexionar.</p>
                </div>
            `;
        }
        
        if (template.validation.respectProtocol) {
            guidance += `
                <div class="guidance-section respect">
                    <h4>🤝 Protocolo de Respeto</h4>
                    <p>Recuerda seguir los protocolos de respeto culturales establecidos por la comunidad.</p>
                </div>
            `;
        }
        
        return guidance;
    }

    setupChoiceEvents(interface_, choice) {
        // Eventos de selección de opciones
        interface_.querySelectorAll('.select-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const option = btn.closest('.choice-option');
                const optionId = parseInt(option.dataset.optionId);
                this.selectOption(choice.id, optionId);
            });
        });
        
        // Eventos de botones de acción
        interface_.querySelector('.reflect-btn')?.addEventListener('click', () => {
            this.showReflectionPrompt(choice);
        });
        
        interface_.querySelector('.context-btn')?.addEventListener('click', () => {
            this.showAdditionalContext(choice);
        });
        
        interface_.querySelector('.consequences-btn')?.addEventListener('click', () => {
            this.showConsequencesAnalysis(choice);
        });
        
        // Eventos de hover para preview
        interface_.querySelectorAll('.choice-option').forEach(option => {
            option.addEventListener('mouseenter', () => {
                this.showOptionPreview(option, choice);
            });
            
            option.addEventListener('mouseleave', () => {
                this.hideOptionPreview();
            });
        });
    }

    selectOption(choiceId, optionId) {
        const choice = this.activeChoices.get(choiceId);
        if (!choice || choice.status !== 'presented') return;
        
        const selectedOption = choice.options[optionId];
        if (!selectedOption || !this.isOptionAccessible(selectedOption)) return;
        
        // Marcar elección como seleccionada
        choice.selectedOption = optionId;
        choice.status = 'selected';
        choice.selectionTime = Date.now();
        
        // Procesar consecuencias
        this.processChoiceConsequences(choice, selectedOption);
        
        // Actualizar perfil del usuario
        this.updateUserProfile(choice, selectedOption);
        
        // Registrar en historial
        this.choiceHistory.set(choice.id, choice);
        
        // Remover de elecciones activas
        this.activeChoices.delete(choice.id);
        
        // Mostrar resultado
        this.showChoiceResult(choice, selectedOption);
        
        // Emitir evento
        const event = new CustomEvent('choiceCompleted', {
            detail: { choice, selectedOption }
        });
        document.dispatchEvent(event);
    }

    processChoiceConsequences(choice, selectedOption) {
        // Procesar consecuencias culturales
        selectedOption.culturalConsequences.forEach(consequenceId => {
            const consequence = this.culturalConsequences.get(consequenceId);
            if (consequence) {
                this.applyCulturalConsequence(consequence);
            }
        });
        
        // Procesar consecuencias narrativas
        this.processNarrativeConsequences(choice, selectedOption);
        
        // Actualizar dependencias
        this.updateChoiceDependencies(choice, selectedOption);
    }

    showChoiceResult(choice, selectedOption) {
        const interface_ = document.querySelector(`#choice-${choice.id}`);
        if (!interface_) return;
        
        // Crear overlay de resultado
        const resultOverlay = document.createElement('div');
        resultOverlay.className = 'choice-result-overlay';
        resultOverlay.innerHTML = `
            <div class="result-content">
                <div class="result-header">
                    <div class="result-icon">✨</div>
                    <h3>Decisión Tomada</h3>
                </div>
                
                <div class="selected-option">
                    <div class="option-text">${selectedOption.text}</div>
                    <div class="immediate-consequence">${selectedOption.consequence}</div>
                </div>
                
                <div class="cultural-impact-summary">
                    <h4>Impacto Cultural</h4>
                    <div class="impact-details">
                        ${this.generateCulturalImpactSummary(selectedOption)}
                    </div>
                </div>
                
                <div class="progress-changes">
                    <h4>Tu Progreso</h4>
                    <div class="progress-deltas">
                        ${this.generateProgressChanges(selectedOption)}
                    </div>
                </div>
                
                <div class="future-implications">
                    <h4>Implicaciones Futuras</h4>
                    <p>${this.generateFutureImplications(choice, selectedOption)}</p>
                </div>
                
                <button class="continue-story">Continuar Historia</button>
            </div>
        `;
        
        interface_.appendChild(resultOverlay);
        
        // Event listener para continuar
        resultOverlay.querySelector('.continue-story').addEventListener('click', () => {
            this.continueFromChoice(choice, selectedOption);
            interface_.remove();
        });
        
        // Auto-continuar después de un tiempo
        setTimeout(() => {
            if (resultOverlay.parentNode) {
                this.continueFromChoice(choice, selectedOption);
                interface_.remove();
            }
        }, 10000);
    }

    showReflectionPrompt(choice) {
        const prompt = document.createElement('div');
        prompt.className = 'reflection-prompt';
        prompt.innerHTML = `
            <div class="prompt-content">
                <h3>Momento de Reflexión</h3>
                <div class="reflection-questions">
                    <div class="question">
                        <p>¿Qué valores culturales están en juego en esta decisión?</p>
                        <textarea placeholder="Reflexiona aquí..." rows="3"></textarea>
                    </div>
                    <div class="question">
                        <p>¿Cómo podría esta decisión afectar a la comunidad?</p>
                        <textarea placeholder="Reflexiona aquí..." rows="3"></textarea>
                    </div>
                    <div class="question">
                        <p>¿Qué puedes aprender de esta situación?</p>
                        <textarea placeholder="Reflexiona aquí..." rows="3"></textarea>
                    </div>
                </div>
                <div class="prompt-actions">
                    <button class="save-reflection">Guardar Reflexión</button>
                    <button class="close-prompt">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(prompt);
        
        // Event listeners
        prompt.querySelector('.save-reflection').addEventListener('click', () => {
            this.saveUserReflection(choice, prompt);
            prompt.remove();
        });
        
        prompt.querySelector('.close-prompt').addEventListener('click', () => {
            prompt.remove();
        });
    }

    // Métodos auxiliares
    generateChoiceId() {
        return 'choice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getChoiceTypeIcon(template) {
        const icons = {
            'cultural-dilemma': '⚖️',
            'ethical-decision': '🤔',
            'learning-path': '📚',
            'character-relationship': '🤝',
            'cultural-participation': '🏛️'
        };
        return icons[template] || '❓';
    }

    getCulturalImpactIcon(impact) {
        const icons = {
            'very-positive': '🌟',
            'positive': '✨',
            'neutral': '⚪',
            'negative': '⚠️',
            'very-negative': '❌'
        };
        return icons[impact] || '⚪';
    }

    isOptionAccessible(option) {
        return option.prerequisites.every(prereq => this.hasPrerequisite(prereq));
    }

    hasPrerequisite(prerequisite) {
        // Verificar si el usuario cumple con el prerequisito
        const userProfile = this.getUserProfile();
        
        switch (prerequisite) {
            case 'cultural-respect-high':
                return userProfile.culturalRespect >= 70;
            case 'understanding-medium':
                return userProfile.culturalUnderstanding >= 50;
            case 'community-trust':
                return userProfile.communityTrust >= 60;
            default:
                return true;
        }
    }

    getUserProfile() {
        return {
            culturalExperience: this.userProfile.get('culturalExperience') || 0,
            culturalRespect: this.userProfile.get('culturalRespect') || 50,
            culturalUnderstanding: this.userProfile.get('culturalUnderstanding') || 50,
            communityTrust: this.userProfile.get('communityTrust') || 50,
            learningStyle: this.userProfile.get('learningStyle') || 'balanced',
            culturalSensitivity: this.userProfile.get('culturalSensitivity') || 'medium'
        };
    }

    getUserRespectLevel() {
        return this.userProfile.get('culturalRespect') || 50;
    }

    getUserUnderstandingLevel() {
        return this.userProfile.get('culturalUnderstanding') || 50;
    }

    getUserConnectionLevel() {
        return this.userProfile.get('communityTrust') || 50;
    }

    updateUserProfile(choice, selectedOption) {
        // Actualizar perfil basado en la elección
        const culturalImpactValue = this.getCulturalImpactValue(selectedOption.culturalImpact);
        
        this.userProfile.set('culturalExperience', 
            (this.userProfile.get('culturalExperience') || 0) + 5);
        
        this.userProfile.set('culturalRespect', 
            Math.min(100, (this.userProfile.get('culturalRespect') || 50) + culturalImpactValue));
        
        // Actualizar según consecuencias culturales
        selectedOption.culturalConsequences.forEach(consequenceId => {
            const consequence = this.culturalConsequences.get(consequenceId);
            if (consequence) {
                this.updateProfileFromConsequence(consequence);
            }
        });
    }

    getCulturalImpactValue(impact) {
        const values = {
            'very-positive': 15,
            'positive': 8,
            'neutral': 0,
            'negative': -5,
            'very-negative': -12
        };
        return values[impact] || 0;
    }

    // API pública
    getChoiceHistory() {
        return new Map(this.choiceHistory);
    }

    getActiveChoices() {
        return new Map(this.activeChoices);
    }

    getUserChoiceStats() {
        return {
            totalChoices: this.choiceHistory.size,
            culturalChoices: Array.from(this.choiceHistory.values())
                .filter(choice => choice.template === 'cultural-dilemma').length,
            averageReflectionTime: this.calculateAverageReflectionTime(),
            culturalRespectGained: this.calculateCulturalRespectGained()
        };
    }

    presentCustomChoice(choiceData) {
        const choice = this.createChoice(choiceData);
        this.presentChoice(choice);
        return choice.id;
    }

    forceChoiceSelection(choiceId, optionId) {
        // Para testing o narrativa automática
        this.selectOption(choiceId, optionId);
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.choiceSystemManager = new ChoiceSystemManager();
});

export default ChoiceSystemManager;