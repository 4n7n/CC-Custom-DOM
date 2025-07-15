/**
 * RAMA 7: Community Feedback - Sistema de retroalimentación comunitaria
 * Gestiona feedback, valoraciones y mejora continua de la experiencia cultural
 */

class CommunityFeedbackManager {
    constructor() {
        this.feedbackTypes = new Map();
        this.activeFeedback = new Map();
        this.communityRatings = new Map();
        this.feedbackHistory = new Map();
        this.moderationQueue = new Map();
        this.culturalValidators = new Set();
        this.feedbackMetrics = new Map();
        this.sentimentAnalysis = new Map();
        
        this.init();
    }

    init() {
        this.setupFeedbackTypes();
        this.bindFeedbackEvents();
        this.createFeedbackInterface();
        this.initializeModerationSystem();
        this.loadCommunityFeedback();
        this.startMetricsMonitoring();
    }

    setupFeedbackTypes() {
        this.feedbackTypes.set('cultural-accuracy', {
            name: 'Exactitud Cultural',
            description: 'Evalúa la autenticidad y precisión del contenido cultural',
            icon: '🎯',
            weight: 5,
            requiresExpertise: true,
            categories: ['historical-accuracy', 'cultural-context', 'traditional-practices', 'contemporary-relevance'],
            validationRequired: true
        });

        this.feedbackTypes.set('narrative-quality', {
            name: 'Calidad Narrativa',
            description: 'Evalúa la experiencia narrativa y su efectividad',
            icon: '📖',
            weight: 3,
            requiresExpertise: false,
            categories: ['engagement', 'flow', 'character-development', 'educational-value'],
            validationRequired: false
        });

        this.feedbackTypes.set('accessibility', {
            name: 'Accesibilidad',
            description: 'Evalúa la accesibilidad y usabilidad para diferentes usuarios',
            icon: '♿',
            weight: 4,
            requiresExpertise: false,
            categories: ['navigation', 'visual-accessibility', 'cognitive-load', 'inclusive-design'],
            validationRequired: false
        });

        this.feedbackTypes.set('cultural-sensitivity', {
            name: 'Sensibilidad Cultural',
            description: 'Evalúa el respeto y apropiación cultural',
            icon: '🤝',
            weight: 5,
            requiresExpertise: true,
            categories: ['respectful-representation', 'avoiding-stereotypes', 'community-voice', 'ethical-presentation'],
            validationRequired: true
        });

        this.feedbackTypes.set('educational-impact', {
            name: 'Impacto Educativo',
            description: 'Evalúa el valor educativo y aprendizaje generado',
            icon: '🎓',
            weight: 4,
            requiresExpertise: false,
            categories: ['learning-outcomes', 'knowledge-retention', 'skill-development', 'cultural-awareness'],
            validationRequired: false
        });

        this.feedbackTypes.set('technical-performance', {
            name: 'Rendimiento Técnico',
            description: 'Evalúa aspectos técnicos y de usabilidad',
            icon: '⚡',
            weight: 2,
            requiresExpertise: false,
            categories: ['load-times', 'responsiveness', 'bug-reports', 'device-compatibility'],
            validationRequired: false
        });
    }

    bindFeedbackEvents() {
        document.addEventListener('feedbackRequest', this.handleFeedbackRequest.bind(this));
        document.addEventListener('narrativeSection', this.triggerContextualFeedback.bind(this));
        document.addEventListener('culturalInteraction', this.trackCulturalExperience.bind(this));
        document.addEventListener('userFrustration', this.handleFrustrationFeedback.bind(this));
        
        // Eventos de UI
        document.addEventListener('click', this.handleFeedbackClick.bind(this));
        document.addEventListener('feedbackSubmit', this.processFeedback.bind(this));
    }

    handleFeedbackRequest(event) {
        const { context, triggerType, urgency } = event.detail;
        
        // Determinar tipos de feedback relevantes
        const relevantTypes = this.getRelevantFeedbackTypes(context, triggerType);
        
        // Crear interfaz de feedback contextual
        this.createContextualFeedbackInterface(context, relevantTypes, urgency);
    }

    getRelevantFeedbackTypes(context, triggerType) {
        const typeRelevance = {
            'cultural-encounter': ['cultural-accuracy', 'cultural-sensitivity', 'educational-impact'],
            'narrative-completion': ['narrative-quality', 'educational-impact', 'accessibility'],
            'interaction-difficulty': ['accessibility', 'technical-performance', 'narrative-quality'],
            'cultural-learning': ['cultural-accuracy', 'educational-impact', 'cultural-sensitivity'],
            'technical-issue': ['technical-performance', 'accessibility'],
            'general-experience': ['narrative-quality', 'educational-impact', 'accessibility']
        };
        
        return typeRelevance[triggerType] || ['narrative-quality', 'accessibility'];
    }

    createContextualFeedbackInterface(context, relevantTypes, urgency = 'normal') {
        const feedbackInterface = document.createElement('div');
        feedbackInterface.className = `feedback-interface ${urgency}`;
        feedbackInterface.innerHTML = `
            <div class="feedback-container">
                <div class="feedback-header">
                    <div class="feedback-title">
                        <span class="feedback-icon">💭</span>
                        <h3>Tu Opinión Importa</h3>
                    </div>
                    <div class="context-indicator">
                        <span class="context-label">Contexto:</span>
                        <span class="context-value">${this.getContextDescription(context)}</span>
                    </div>
                    <button class="close-feedback">×</button>
                </div>
                
                <div class="feedback-intro">
                    <p>Ayúdanos a mejorar esta experiencia cultural. Tu feedback nos permite crear contenido más auténtico y accesible.</p>
                </div>
                
                <div class="feedback-types">
                    ${relevantTypes.map(typeId => this.createFeedbackTypeCard(typeId)).join('')}
                </div>
                
                <div class="quick-feedback" style="display: none;">
                    <h4>Feedback Rápido</h4>
                    <div class="quick-options">
                        <button class="quick-option positive" data-sentiment="positive">
                            <span class="option-icon">👍</span>
                            <span class="option-text">Excelente</span>
                        </button>
                        <button class="quick-option neutral" data-sentiment="neutral">
                            <span class="option-icon">🤔</span>
                            <span class="option-text">Puede Mejorar</span>
                        </button>
                        <button class="quick-option negative" data-sentiment="negative">
                            <span class="option-icon">👎</span>
                            <span class="option-text">Necesita Mejoras</span>
                        </button>
                    </div>
                </div>
                
                <div class="detailed-feedback" style="display: none;">
                    <!-- Se llenará dinámicamente según tipo seleccionado -->
                </div>
                
                <div class="feedback-actions">
                    <button class="skip-feedback">Omitir</button>
                    <button class="quick-feedback-btn">Feedback Rápido</button>
                    <button class="detailed-feedback-btn" style="display: none;">Feedback Detallado</button>
                    <button class="submit-feedback" style="display: none;" disabled>Enviar Feedback</button>
                </div>
                
                <div class="community-impact">
                    <div class="impact-stats">
                        <div class="stat-item">
                            <span class="stat-number">${this.getTotalFeedbackCount()}</span>
                            <span class="stat-label">Comentarios Recibidos</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${this.getImprovementCount()}</span>
                            <span class="stat-label">Mejoras Implementadas</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${this.getCommunityScore()}%</span>
                            <span class="stat-label">Satisfacción</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(feedbackInterface);
        
        // Configurar eventos
        this.setupFeedbackInterfaceEvents(feedbackInterface, context, relevantTypes);
        
        // Animar entrada
        requestAnimationFrame(() => {
            feedbackInterface.classList.add('show');
        });
        
        // Auto-minimizar después de un tiempo si no hay interacción
        this.setupAutoMinimize(feedbackInterface);
    }

    createFeedbackTypeCard(typeId) {
        const type = this.feedbackTypes.get(typeId);
        
        return `
            <div class="feedback-type-card" data-type="${typeId}">
                <div class="card-header">
                    <span class="type-icon">${type.icon}</span>
                    <h4>${type.name}</h4>
                    ${type.requiresExpertise ? '<span class="expert-badge">Experto</span>' : ''}
                </div>
                <p class="type-description">${type.description}</p>
                <div class="type-categories">
                    ${type.categories.map(cat => `<span class="category-tag">${this.getCategoryName(cat)}</span>`).join('')}
                </div>
                <button class="select-type">Evaluar</button>
            </div>
        `;
    }

    setupFeedbackInterfaceEvents(interface_, context, relevantTypes) {
        let selectedType = null;
        let feedbackData = {};
        
        // Selección de tipo de feedback
        interface_.querySelectorAll('.select-type').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.feedback-type-card');
                selectedType = card.dataset.type;
                
                // Marcar seleccionado
                interface_.querySelectorAll('.feedback-type-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                // Mostrar botón de feedback detallado
                interface_.querySelector('.detailed-feedback-btn').style.display = 'inline-block';
                interface_.querySelector('.detailed-feedback-btn').onclick = () => {
                    this.showDetailedFeedbackForm(interface_, selectedType, context);
                };
            });
        });
        
        // Feedback rápido
        interface_.querySelector('.quick-feedback-btn').addEventListener('click', () => {
            interface_.querySelector('.quick-feedback').style.display = 'block';
            interface_.querySelector('.feedback-types').style.display = 'none';
        });
        
        interface_.querySelectorAll('.quick-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const sentiment = btn.dataset.sentiment;
                this.submitQuickFeedback(context, sentiment);
                this.showFeedbackThanks(interface_);
            });
        });
        
        // Cerrar/omitir feedback
        interface_.querySelector('.close-feedback').addEventListener('click', () => {
            this.hideFeedbackInterface(interface_);
        });
        
        interface_.querySelector('.skip-feedback').addEventListener('click', () => {
            this.recordFeedbackSkip(context);
            this.hideFeedbackInterface(interface_);
        });
    }

    showDetailedFeedbackForm(interface_, typeId, context) {
        const type = this.feedbackTypes.get(typeId);
        const detailedForm = interface_.querySelector('.detailed-feedback');
        
        detailedForm.innerHTML = `
            <div class="detailed-form">
                <h4>Feedback Detallado: ${type.name}</h4>
                
                <div class="rating-section">
                    <h5>Calificación General</h5>
                    <div class="star-rating" data-category="overall">
                        ${this.createStarRating()}
                    </div>
                </div>
                
                <div class="category-ratings">
                    ${type.categories.map(category => `
                        <div class="category-rating">
                            <label>${this.getCategoryName(category)}</label>
                            <div class="star-rating" data-category="${category}">
                                ${this.createStarRating()}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="text-feedback">
                    <label for="feedback-text">Comentarios Específicos</label>
                    <textarea 
                        id="feedback-text" 
                        placeholder="Comparte tus observaciones específicas..."
                        rows="4"
                        maxlength="500">
                    </textarea>
                    <div class="char-count">0/500</div>
                </div>
                
                <div class="improvement-suggestions">
                    <label>Sugerencias de Mejora</label>
                    <div class="suggestion-options">
                        ${this.createImprovementOptions(typeId)}
                    </div>
                    <textarea 
                        class="custom-suggestion" 
                        placeholder="Otras sugerencias..."
                        rows="2">
                    </textarea>
                </div>
                
                ${type.requiresExpertise ? this.createExpertiseVerification() : ''}
                
                <div class="feedback-visibility">
                    <label class="visibility-option">
                        <input type="radio" name="visibility" value="public" checked>
                        <span>Público (ayuda a otros usuarios)</span>
                    </label>
                    <label class="visibility-option">
                        <input type="radio" name="visibility" value="private">
                        <span>Privado (solo para desarrolladores)</span>
                    </label>
                    <label class="visibility-option">
                        <input type="radio" name="visibility" value="anonymous">
                        <span>Anónimo (público sin identificación)</span>
                    </label>
                </div>
            </div>
        `;
        
        detailedForm.style.display = 'block';
        interface_.querySelector('.feedback-types').style.display = 'none';
        interface_.querySelector('.submit-feedback').style.display = 'inline-block';
        interface_.querySelector('.detailed-feedback-btn').style.display = 'none';
        
        // Configurar eventos del formulario detallado
        this.setupDetailedFormEvents(detailedForm, interface_, typeId, context);
    }

    createStarRating() {
        return Array.from({length: 5}, (_, i) => 
            `<span class="star" data-rating="${i + 1}">★</span>`
        ).join('');
    }

    createImprovementOptions(typeId) {
        const improvementOptions = {
            'cultural-accuracy': [
                'Incluir más fuentes históricas',
                'Consultar con expertos locales',
                'Agregar contexto temporal',
                'Verificar terminología cultural'
            ],
            'narrative-quality': [
                'Mejorar ritmo narrativo',
                'Desarrollar más los personajes',
                'Añadir más opciones interactivas',
                'Clarificar objetivos de aprendizaje'
            ],
            'accessibility': [
                'Mejorar contraste visual',
                'Añadir descripciones de audio',
                'Simplificar navegación',
                'Optimizar para lectores de pantalla'
            ],
            'cultural-sensitivity': [
                'Revisar lenguaje utilizado',
                'Incluir perspectivas diversas',
                'Evitar generalizations',
                'Consultar con comunidades'
            ]
        };
        
        const options = improvementOptions[typeId] || [];
        
        return options.map(option => `
            <label class="improvement-option">
                <input type="checkbox" value="${option}">
                <span>${option}</span>
            </label>
        `).join('');
    }

    createExpertiseVerification() {
        return `
            <div class="expertise-verification">
                <h5>Verificación de Experiencia</h5>
                <div class="expertise-fields">
                    <div class="field-group">
                        <label>Tu experiencia en el tema:</label>
                        <select class="expertise-level">
                            <option value="">Seleccionar...</option>
                            <option value="community-member">Miembro de la comunidad</option>
                            <option value="academic-researcher">Investigador académico</option>
                            <option value="cultural-practitioner">Practicante cultural</option>
                            <option value="educator">Educador</option>
                            <option value="interested-learner">Aprendiz interesado</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label>Años de experiencia:</label>
                        <select class="experience-years">
                            <option value="">Seleccionar...</option>
                            <option value="1-2">1-2 años</option>
                            <option value="3-5">3-5 años</option>
                            <option value="6-10">6-10 años</option>
                            <option value="10+">Más de 10 años</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    setupDetailedFormEvents(form, interface_, typeId, context) {
        // Configurar eventos de estrelas
        form.querySelectorAll('.star-rating').forEach(rating => {
            const stars = rating.querySelectorAll('.star');
            
            stars.forEach((star, index) => {
                star.addEventListener('mouseover', () => {
                    this.highlightStars(stars, index + 1);
                });
                
                star.addEventListener('click', () => {
                    this.selectStars(stars, index + 1);
                    rating.dataset.selectedRating = index + 1;
                    this.validateFeedbackForm(interface_);
                });
            });
            
            rating.addEventListener('mouseleave', () => {
                const selected = rating.dataset.selectedRating || 0;
                this.highlightStars(stars, selected);
            });
        });
        
        // Contador de caracteres
        const textArea = form.querySelector('#feedback-text');
        const charCount = form.querySelector('.char-count');
        
        textArea.addEventListener('input', () => {
            const length = textArea.value.length;
            charCount.textContent = `${length}/500`;
            charCount.classList.toggle('near-limit', length > 400);
            this.validateFeedbackForm(interface_);
        });
        
        // Validación de formulario
        form.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('change', () => {
                this.validateFeedbackForm(interface_);
            });
        });
        
        // Envío de feedback
        interface_.querySelector('.submit-feedback').addEventListener('click', () => {
            this.submitDetailedFeedback(form, typeId, context);
            this.showFeedbackThanks(interface_);
        });
    }

    highlightStars(stars, count) {
        stars.forEach((star, index) => {
            star.classList.toggle('highlighted', index < count);
        });
    }

    selectStars(stars, count) {
        stars.forEach((star, index) => {
            star.classList.toggle('selected', index < count);
        });
    }

    validateFeedbackForm(interface_) {
        const form = interface_.querySelector('.detailed-form');
        const submitBtn = interface_.querySelector('.submit-feedback');
        
        // Verificar calificación general
        const overallRating = form.querySelector('[data-category="overall"]').dataset.selectedRating;
        
        // Verificar que hay al menos un comentario o sugerencia
        const hasText = form.querySelector('#feedback-text').value.trim().length > 0;
        const hasSuggestion = form.querySelector('.custom-suggestion').value.trim().length > 0;
        const hasCheckedOption = form.querySelector('.improvement-option input:checked');
        
        const isValid = overallRating && (hasText || hasSuggestion || hasCheckedOption);
        
        submitBtn.disabled = !isValid;
        submitBtn.classList.toggle('ready', isValid);
    }

    submitQuickFeedback(context, sentiment) {
        const feedback = {
            id: this.generateFeedbackId(),
            type: 'quick',
            context,
            sentiment,
            timestamp: Date.now(),
            userId: this.getUserId()
        };
        
        this.processFeedbackSubmission(feedback);
    }

    submitDetailedFeedback(form, typeId, context) {
        const feedback = {
            id: this.generateFeedbackId(),
            type: 'detailed',
            feedbackType: typeId,
            context,
            ratings: this.extractRatings(form),
            textFeedback: form.querySelector('#feedback-text').value,
            suggestions: this.extractSuggestions(form),
            expertise: this.extractExpertise(form),
            visibility: form.querySelector('input[name="visibility"]:checked').value,
            timestamp: Date.now(),
            userId: this.getUserId()
        };
        
        this.processFeedbackSubmission(feedback);
    }

    extractRatings(form) {
        const ratings = {};
        form.querySelectorAll('.star-rating').forEach(rating => {
            const category = rating.dataset.category;
            const selectedRating = rating.dataset.selectedRating;
            if (selectedRating) {
                ratings[category] = parseInt(selectedRating);
            }
        });
        return ratings;
    }

    extractSuggestions(form) {
        const suggestions = [];
        
        // Opciones seleccionadas
        form.querySelectorAll('.improvement-option input:checked').forEach(checkbox => {
            suggestions.push(checkbox.value);
        });
        
        // Sugerencia personalizada
        const customSuggestion = form.querySelector('.custom-suggestion').value.trim();
        if (customSuggestion) {
            suggestions.push(customSuggestion);
        }
        
        return suggestions;
    }

    extractExpertise(form) {
        const expertiseLevel = form.querySelector('.expertise-level')?.value;
        const experienceYears = form.querySelector('.experience-years')?.value;
        
        if (expertiseLevel || experienceYears) {
            return { level: expertiseLevel, years: experienceYears };
        }
        
        return null;
    }

    processFeedbackSubmission(feedback) {
        // Guardar feedback
        this.feedbackHistory.set(feedback.id, feedback);
        
        // Actualizar métricas
        this.updateFeedbackMetrics(feedback);
        
        // Procesar para moderación si es necesario
        if (this.requiresModeration(feedback)) {
            this.moderationQueue.set(feedback.id, feedback);
        }
        
        // Analizar sentimiento
        this.analyzeSentiment(feedback);
        
        // Emitir evento
        const event = new CustomEvent('feedbackSubmitted', {
            detail: feedback
        });
        document.dispatchEvent(event);
        
        // Procesar mejoras automáticas
        this.processAutomaticImprovements(feedback);
    }

    showFeedbackThanks(interface_) {
        interface_.innerHTML = `
            <div class="feedback-thanks">
                <div class="thanks-content">
                    <div class="thanks-icon">🙏</div>
                    <h3>¡Gracias por tu Feedback!</h3>
                    <p>Tu opinión nos ayuda a mejorar la experiencia cultural para toda la comunidad.</p>
                    
                    <div class="impact-message">
                        <h4>Tu Contribución:</h4>
                        <ul>
                            <li>✨ Mejora la autenticidad cultural</li>
                            <li>🌍 Beneficia a futuros usuarios</li>
                            <li>📚 Enriquece el contenido educativo</li>
                            <li>🤝 Fortalece la comunidad</li>
                        </ul>
                    </div>
                    
                    <div class="next-steps">
                        <p>Revisaremos tu feedback y trabajaremos en las mejoras sugeridas.</p>
                        <p>Te notificaremos cuando implementemos cambios basados en tus sugerencias.</p>
                    </div>
                    
                    <button class="continue-experience">Continuar Experiencia</button>
                </div>
            </div>
        `;
        
        interface_.querySelector('.continue-experience').addEventListener('click', () => {
            this.hideFeedbackInterface(interface_);
        });
        
        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            if (interface_.parentNode) {
                this.hideFeedbackInterface(interface_);
            }
        }, 5000);
    }

    // Métodos auxiliares
    generateFeedbackId() {
        return 'feedback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        return localStorage.getItem('userId') || 'anonymous_' + Date.now();
    }

    getContextDescription(context) {
        const descriptions = {
            'cultural-element': 'Elemento Cultural',
            'narrative-section': 'Sección Narrativa',
            'character-interaction': 'Interacción con Personaje',
            'choice-selection': 'Selección de Opciones',
            'learning-module': 'Módulo de Aprendizaje'
        };
        return descriptions[context.type] || 'Experiencia General';
    }

    getCategoryName(category) {
        const names = {
            'historical-accuracy': 'Precisión Histórica',
            'cultural-context': 'Contexto Cultural',
            'traditional-practices': 'Prácticas Tradicionales',
            'contemporary-relevance': 'Relevancia Actual',
            'engagement': 'Engagement',
            'flow': 'Fluidez',
            'character-development': 'Desarrollo de Personajes',
            'educational-value': 'Valor Educativo',
            'navigation': 'Navegación',
            'visual-accessibility': 'Accesibilidad Visual',
            'cognitive-load': 'Carga Cognitiva',
            'inclusive-design': 'Diseño Inclusivo'
        };
        return names[category] || category;
    }

    updateFeedbackMetrics(feedback) {
        const metrics = this.feedbackMetrics;
        
        // Actualizar contadores
        metrics.set('totalFeedback', (metrics.get('totalFeedback') || 0) + 1);
        metrics.set('detailedFeedback', 
            (metrics.get('detailedFeedback') || 0) + (feedback.type === 'detailed' ? 1 : 0));
        
        // Actualizar calificaciones promedio
        if (feedback.ratings) {
            Object.entries(feedback.ratings).forEach(([category, rating]) => {
                const key = `avg_${category}`;
                const current = metrics.get(key) || { sum: 0, count: 0 };
                current.sum += rating;
                current.count += 1;
                metrics.set(key, current);
            });
        }
    }

    getTotalFeedbackCount() {
        return this.feedbackMetrics.get('totalFeedback') || 0;
    }

    getImprovementCount() {
        // Simular mejoras implementadas basadas en feedback
        return Math.floor((this.feedbackMetrics.get('totalFeedback') || 0) * 0.3);
    }

    getCommunityScore() {
        const overallRatings = this.feedbackMetrics.get('avg_overall');
        if (!overallRatings) return 85;
        
        const average = overallRatings.sum / overallRatings.count;
        return Math.round((average / 5) * 100);
    }

    // API pública
    getFeedbackHistory() {
        return new Map(this.feedbackHistory);
    }

    getFeedbackMetrics() {
        return new Map(this.feedbackMetrics);
    }

    requestFeedback(context, type = 'general', urgency = 'normal') {
        const event = new CustomEvent('feedbackRequest', {
            detail: { context, triggerType: type, urgency }
        });
        document.dispatchEvent(event);
    }

    getCommunityFeedbackSummary() {
        return {
            totalFeedback: this.getTotalFeedbackCount(),
            averageRating: this.getCommunityScore() / 20, // Convertir a escala 1-5
            improvementsImplemented: this.getImprovementCount(),
            responseRate: this.calculateResponseRate()
        };
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.communityFeedbackManager = new CommunityFeedbackManager();
});

export default CommunityFeedbackManager;