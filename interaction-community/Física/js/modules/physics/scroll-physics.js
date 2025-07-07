/**
 * RAMA 7: Scroll Physics - Sistema de física de scroll para participación
 * Maneja interacciones, animaciones y comportamientos de scroll
 */

class ScrollPhysics {
    constructor() {
        this.elements = {
            participationPrompt: null,
            modal: null,
            trackingPanel: null,
            achievementNotification: null
        };
        
        this.state = {
            isPromptVisible: false,
            currentStep: 0,
            scrollPosition: 0,
            lastScrollTime: 0,
            scrollVelocity: 0,
            isModalOpen: false,
            selectedOption: null,
            contributions: [],
            achievements: []
        };
        
        this.config = {
            scrollThreshold: 300,
            promptDelay: 2000,
            velocityDamping: 0.9,
            maxVelocity: 50,
            animationDuration: 400
        };
        
        this.init();
    }
    
    init() {
        this.createElements();
        this.bindEvents();
        this.initializeTracking();
        this.startScrollMonitoring();
    }
    
    createElements() {
        this.createParticipationPrompt();
        this.createModal();
        this.createTrackingPanel();
        this.createAchievementNotification();
    }
    
    createParticipationPrompt() {
        const prompt = document.createElement('div');
        prompt.className = 'participation-prompt';
        prompt.innerHTML = `
            <div class="prompt-content">
                <div class="prompt-header">
                    <span class="participation-icon">🤝</span>
                    <h3>¡Participa en la Historia!</h3>
                    <button class="close-prompt" onclick="scrollPhysics.hidePrompt()">×</button>
                </div>
                <div class="participation-options">
                    <div class="participation-option" data-type="quick">
                        <div class="option-header">
                            <h4>Contribución Rápida</h4>
                            <div class="cultural-weight">
                                <span class="weight-dot active"></span>
                                <span class="weight-dot"></span>
                                <span class="weight-dot"></span>
                            </div>
                        </div>
                        <div class="option-description">Comparte una perspectiva breve sobre la historia actual</div>
                        <div class="option-requirements">
                            <span class="length-req">50-200 palabras</span>
                            <span class="approval-req">Aprobación automática</span>
                        </div>
                        <div class="option-rewards">
                            <span class="influence-reward">+2 Influencia</span>
                            <span class="reputation-reward">+1 Reputación</span>
                        </div>
                    </div>
                    <div class="participation-option" data-type="detailed">
                        <div class="option-header">
                            <h4>Análisis Detallado</h4>
                            <div class="cultural-weight">
                                <span class="weight-dot active"></span>
                                <span class="weight-dot active"></span>
                                <span class="weight-dot"></span>
                            </div>
                        </div>
                        <div class="option-description">Proporciona un análisis profundo con contexto cultural</div>
                        <div class="option-requirements">
                            <span class="length-req">300-800 palabras</span>
                            <span class="approval-req">Revisión moderada</span>
                        </div>
                        <div class="option-rewards">
                            <span class="influence-reward">+5 Influencia</span>
                            <span class="reputation-reward">+3 Reputación</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(prompt);
        this.elements.participationPrompt = prompt;
        
        // Bind option selection
        prompt.querySelectorAll('.participation-option').forEach(option => {
            option.addEventListener('click', () => this.selectOption(option.dataset.type));
        });
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'participation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Contribuir a la Historia</h2>
                    <div class="progress-indicator">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <span class="progress-text">Paso 1 de 3</span>
                    </div>
                </div>
                <div class="participation-steps">
                    <div class="step active" data-step="1">
                        <h3>Escribe tu Contribución</h3>
                        <div class="writing-area">
                            <textarea class="contribution-text" placeholder="Comparte tu perspectiva sobre la historia..."></textarea>
                            <div class="character-count">
                                <span class="current">0</span> / <span class="max">200</span>
                            </div>
                        </div>
                        <div class="writing-guidelines">
                            <h4>Pautas de Escritura</h4>
                            <ul>
                                <li>Sé respetuoso con diferentes perspectivas culturales</li>
                                <li>Proporciona contexto relevante a tu región</li>
                                <li>Evita contenido ofensivo o discriminatorio</li>
                            </ul>
                        </div>
                    </div>
                    <div class="step" data-step="2">
                        <h3>Contexto Cultural</h3>
                        <div class="cultural-context-form">
                            <div class="context-field">
                                <label>Región Cultural</label>
                                <select class="cultural-region">
                                    <option value="">Selecciona tu región</option>
                                    <option value="latin-america">América Latina</option>
                                    <option value="north-america">América del Norte</option>
                                    <option value="europe">Europa</option>
                                    <option value="asia">Asia</option>
                                    <option value="africa">África</option>
                                    <option value="oceania">Oceanía</option>
                                </select>
                            </div>
                            <div class="context-field">
                                <label>Etiquetas Culturales</label>
                                <div class="cultural-tags-input">
                                    <input type="text" placeholder="Ej: tradición, historia, costumbres">
                                    <button class="add-tag">Agregar</button>
                                </div>
                                <div class="selected-tags"></div>
                            </div>
                        </div>
                    </div>
                    <div class="step" data-step="3">
                        <h3>Revisión y Envío</h3>
                        <div class="contribution-preview">
                            <div class="preview-text"></div>
                            <div class="preview-metadata">
                                <div class="metadata-item">
                                    <span class="label">Región:</span>
                                    <span class="value region-value">-</span>
                                </div>
                                <div class="metadata-item">
                                    <span class="label">Palabras:</span>
                                    <span class="value word-count">0</span>
                                </div>
                                <div class="metadata-item">
                                    <span class="label">Etiquetas:</span>
                                    <span class="value tags-count">0</span>
                                </div>
                            </div>
                        </div>
                        <div class="submission-options">
                            <div class="option-group">
                                <input type="checkbox" id="anonymous" checked>
                                <label for="anonymous">Enviar de forma anónima</label>
                            </div>
                            <div class="option-group">
                                <input type="checkbox" id="notifications">
                                <label for="notifications">Recibir notificaciones de respuestas</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="scrollPhysics.previousStep()">Anterior</button>
                    <button class="btn-primary" onclick="scrollPhysics.nextStep()">Siguiente</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.elements.modal = modal;
        
        // Bind modal events
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
        
        this.bindModalEvents();
    }
    
    createTrackingPanel() {
        const panel = document.createElement('div');
        panel.className = 'participation-tracking-panel';
        panel.innerHTML = `
            <div class="tracking-header">
                <h3>Mi Participación</h3>
                <button class="toggle-tracking" onclick="scrollPhysics.toggleTracking()">−</button>
            </div>
            <div class="tracking-content">
                <div class="metrics-overview">
                    <div class="metric-item">
                        <div>
                            <div class="metric-name">Influencia</div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: 65%"></div>
                            </div>
                        </div>
                        <div class="metric-value">12</div>
                    </div>
                    <div class="metric-item">
                        <div>
                            <div class="metric-name">Reputación</div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: 80%"></div>
                            </div>
                        </div>
                        <div class="metric-value">8</div>
                    </div>
                    <div class="metric-item">
                        <div>
                            <div class="metric-name">Contribuciones</div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: 45%"></div>
                            </div>
                        </div>
                        <div class="metric-value">3</div>
                    </div>
                </div>
                <div class="achievements-section">
                    <h4>Logros Recientes</h4>
                    <div class="achievements-grid">
                        <div class="achievement-card unlocked">
                            <div class="achievement-icon">🏆</div>
                            <div class="achievement-info">
                                <h5>Primera Contribución</h5>
                                <p>Hiciste tu primera contribución a la comunidad</p>
                            </div>
                        </div>
                        <div class="achievement-card locked">
                            <div class="achievement-icon">⭐</div>
                            <div class="achievement-info">
                                <h5>Colaborador Activo</h5>
                                <p>Contribuye 10 veces en un mes</p>
                                <div class="achievement-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: 30%"></div>
                                    </div>
                                    <span class="progress-text">3/10</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.elements.trackingPanel = panel;
    }
    
    createAchievementNotification() {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        
        document.body.appendChild(notification);
        this.elements.achievementNotification = notification;
    }
    
    bindEvents() {
        window.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }
    
    bindModalEvents() {
        const modal = this.elements.modal;
        const textarea = modal.querySelector('.contribution-text');
        const addTagBtn = modal.querySelector('.add-tag');
        const tagInput = modal.querySelector('.cultural-tags-input input');
        
        // Character count
        textarea.addEventListener('input', this.updateCharacterCount.bind(this));
        
        // Tag system
        addTagBtn.addEventListener('click', this.addTag.bind(this));
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag();
            }
        });
        
        // Region selection
        modal.querySelector('.cultural-region').addEventListener('change', this.updatePreview.bind(this));
    }
    
    handleScroll() {
        const currentTime = Date.now();
        const currentPosition = window.pageYOffset;
        const deltaTime = currentTime - this.state.lastScrollTime;
        const deltaPosition = currentPosition - this.state.scrollPosition;
        
        // Calculate velocity
        if (deltaTime > 0) {
            this.state.scrollVelocity = (deltaPosition / deltaTime) * this.config.velocityDamping;
        }
        
        this.state.scrollPosition = currentPosition;
        this.state.lastScrollTime = currentTime;
        
        // Show participation prompt logic
        if (currentPosition > this.config.scrollThreshold && !this.state.isPromptVisible) {
            this.showPromptWithDelay();
        }
        
        // Update scroll-based animations
        this.updateScrollAnimations();
    }
    
    handleResize() {
        // Adjust modal positioning on resize
        if (this.state.isModalOpen) {
            this.adjustModalPosition();
        }
    }
    
    handleKeydown(e) {
        if (e.key === 'Escape') {
            if (this.state.isModalOpen) {
                this.closeModal();
            } else if (this.state.isPromptVisible) {
                this.hidePrompt();
            }
        }
    }
    
    showPromptWithDelay() {
        setTimeout(() => {
            if (!this.state.isPromptVisible) {
                this.showPrompt();
            }
        }, this.config.promptDelay);
    }
    
    showPrompt() {
        this.state.isPromptVisible = true;
        this.elements.participationPrompt.classList.add('show');
    }
    
    hidePrompt() {
        this.state.isPromptVisible = false;
        this.elements.participationPrompt.classList.remove('show');
    }
    
    selectOption(type) {
        this.state.selectedOption = type;
        this.hidePrompt();
        this.openModal();
    }
    
    openModal() {
        this.state.isModalOpen = true;
        this.elements.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus on textarea
        setTimeout(() => {
            this.elements.modal.querySelector('.contribution-text').focus();
        }, 300);
    }
    
    closeModal() {
        this.state.isModalOpen = false;
        this.elements.modal.classList.remove('show');
        document.body.style.overflow = '';
        this.resetModal();
    }
    
    resetModal() {
        this.state.currentStep = 0;
        this.updateStepDisplay();
        this.elements.modal.querySelector('.contribution-text').value = '';
        this.updateCharacterCount();
        this.clearTags();
        this.updatePreview();
    }
    
    nextStep() {
        if (this.validateCurrentStep()) {
            this.state.currentStep++;
            this.updateStepDisplay();
            this.updatePreview();
            
            if (this.state.currentStep === 3) {
                this.updateModalActions();
            }
        }
    }
    
    previousStep() {
        if (this.state.currentStep > 0) {
            this.state.currentStep--;
            this.updateStepDisplay();
            this.updateModalActions();
        }
    }
    
    updateStepDisplay() {
        const steps = this.elements.modal.querySelectorAll('.step');
        const progressFill = this.elements.modal.querySelector('.progress-fill');
        const progressText = this.elements.modal.querySelector('.progress-text');
        
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === this.state.currentStep);
        });
        
        const progressPercent = ((this.state.currentStep + 1) / 3) * 100;
        progressFill.style.width = `${progressPercent}%`;
        progressText.textContent = `Paso ${this.state.currentStep + 1} de 3`;
    }
    
    validateCurrentStep() {
        const modal = this.elements.modal;
        
        switch (this.state.currentStep) {
            case 0:
                const text = modal.querySelector('.contribution-text').value;
                if (text.length < 50) {
                    this.showValidationError('El texto debe tener al menos 50 caracteres');
                    return false;
                }
                return true;
            case 1:
                const region = modal.querySelector('.cultural-region').value;
                if (!region) {
                    this.showValidationError('Por favor selecciona una región');
                    return false;
                }
                return true;
            case 2:
                return true;
            default:
                return true;
        }
    }
    
    showValidationError(message) {
        const existingError = this.elements.modal.querySelector('.validation-error');
        if (existingError) {
            existingError.remove();
        }
        
        const error = document.createElement('div');
        error.className = 'validation-error';
        error.textContent = message;
        
        const currentStep = this.elements.modal.querySelector('.step.active');
        currentStep.appendChild(error);
        
        setTimeout(() => error.classList.add('show'), 10);
        
        setTimeout(() => {
            error.classList.remove('show');
            setTimeout(() => error.remove(), 300);
        }, 3000);
    }
    
    updateCharacterCount() {
        const textarea = this.elements.modal.querySelector('.contribution-text');
        const currentSpan = this.elements.modal.querySelector('.character-count .current');
        const maxSpan = this.elements.modal.querySelector('.character-count .max');
        const charCount = this.elements.modal.querySelector('.character-count');
        
        const length = textarea.value.length;
        const maxLength = this.state.selectedOption === 'quick' ? 200 : 800;
        
        currentSpan.textContent = length;
        maxSpan.textContent = maxLength;
        
        charCount.classList.remove('near-limit', 'over-limit');
        
        if (length > maxLength) {
            charCount.classList.add('over-limit');
            textarea.classList.add('invalid');
        } else if (length > maxLength * 0.8) {
            charCount.classList.add('near-limit');
            textarea.classList.remove('invalid');
        } else {
            textarea.classList.remove('invalid');
        }
        
        if (length >= 50) {
            textarea.classList.add('valid');
        } else {
            textarea.classList.remove('valid');
        }
    }
    
    addTag() {
        const tagInput = this.elements.modal.querySelector('.cultural-tags-input input');
        const tagsContainer = this.elements.modal.querySelector('.selected-tags');
        const tagValue = tagInput.value.trim();
        
        if (tagValue && !this.hasTag(tagValue)) {
            const tag = document.createElement('div');
            tag.className = 'cultural-tag';
            tag.innerHTML = `
                <span>${tagValue}</span>
                <button class="remove-tag" onclick="this.parentElement.remove(); scrollPhysics.updatePreview()">×</button>
            `;
            
            tagsContainer.appendChild(tag);
            tagInput.value = '';
            this.updatePreview();
        }
    }
    
    hasTag(value) {
        const tags = this.elements.modal.querySelectorAll('.cultural-tag span');
        return Array.from(tags).some(tag => tag.textContent === value);
    }
    
    clearTags() {
        this.elements.modal.querySelector('.selected-tags').innerHTML = '';
    }
    
    updatePreview() {
        const modal = this.elements.modal;
        const text = modal.querySelector('.contribution-text').value;
        const region = modal.querySelector('.cultural-region').value;
        const tags = modal.querySelectorAll('.cultural-tag');
        
        modal.querySelector('.preview-text').textContent = text;
        modal.querySelector('.region-value').textContent = region || '-';
        modal.querySelector('.word-count').textContent = text.split(/\s+/).filter(w => w.length > 0).length;
        modal.querySelector('.tags-count').textContent = tags.length;
    }
    
    updateModalActions() {
        const modal = this.elements.modal;
        const nextBtn = modal.querySelector('.btn-primary');
        const prevBtn = modal.querySelector('.btn-secondary');
        
        if (this.state.currentStep === 2) {
            nextBtn.textContent = 'Enviar Contribución';
            nextBtn.onclick = () => this.submitContribution();
        } else {
            nextBtn.textContent = 'Siguiente';
            nextBtn.onclick = () => this.nextStep();
        }
        
        prevBtn.style.display = this.state.currentStep === 0 ? 'none' : 'inline-block';
    }
    
    submitContribution() {
        // Simulate submission
        this.showSubmissionConfirmation();
        this.closeModal();
        this.updateMetrics();
        
        // Show achievement if first contribution
        if (this.state.contributions.length === 0) {
            this.showAchievement('¡Primera Contribución!', 'Has hecho tu primera contribución a la comunidad');
        }
        
        this.state.contributions.push({
            text: this.elements.modal.querySelector('.contribution-text').value,
            region: this.elements.modal.querySelector('.cultural-region').value,
            timestamp: Date.now()
        });
    }
    
    showSubmissionConfirmation() {
        const confirmation = this.elements.modal.querySelector('.submission-confirmation') || this.createSubmissionConfirmation();
        confirmation.classList.add('show');
        
        setTimeout(() => {
            confirmation.classList.remove('show');
        }, 3000);
    }
    
    createSubmissionConfirmation() {
        const confirmation = document.createElement('div');
        confirmation.className = 'submission-confirmation';
        confirmation.innerHTML = `
            <div class="confirmation-content">
                <div class="success-icon">✓</div>
                <h3>¡Contribución Enviada!</h3>
                <p>Tu participación ha sido enviada exitosamente y será revisada por nuestro equipo.</p>
                <div class="rewards-earned">
                    <h4>Recompensas Obtenidas</h4>
                    <div class="reward-items">
                        <span class="influence">+2 Influencia</span>
                        <span class="reputation">+1 Reputación</span>
                    </div>
                </div>
                <button class="continue-story" onclick="this.parentElement.parentElement.remove()">
                    Continuar Leyendo
                </button>
            </div>
        `;
        
        document.body.appendChild(confirmation);
        return confirmation;
    }
    
    showAchievement(title, description) {
        const notification = this.elements.achievementNotification;
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">🏆</div>
                <div>
                    <div class="achievement-header">
                        <h4>${title}</h4>
                    </div>
                    <p>${description}</p>
                </div>
            </div>
        `;
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }
    
    updateMetrics() {
        // Update tracking panel metrics
        const metrics = this.elements.trackingPanel.querySelectorAll('.metric-value');
        metrics[0].textContent = parseInt(metrics[0].textContent) + 2; // Influence
        metrics[1].textContent = parseInt(metrics[1].textContent) + 1; // Reputation
        metrics[2].textContent = parseInt(metrics[2].textContent) + 1; // Contributions
    }
    
    toggleTracking() {
        this.elements.trackingPanel.classList.toggle('show');
    }
    
    updateScrollAnimations() {
        // Apply scroll-based effects to elements
        const scrollPercent = this.state.scrollPosition / (document.body.scrollHeight - window.innerHeight);
        
        // Example: Update progress indicators based on scroll
        document.querySelectorAll('.metric-fill').forEach(fill => {
            const width = parseFloat(fill.style.width);
            fill.style.transform = `scaleX(${Math.min(1, scrollPercent + 0.3)})`;
        });
    }
    
    adjustModalPosition() {
        // Adjust modal positioning for different screen sizes
        const modal = this.elements.modal;
        const content = modal.querySelector('.modal-content');
        
        if (window.innerHeight < 600) {
            content.style.maxHeight = '80vh';
        } else {
            content.style.maxHeight = '90vh';
        }
    }
    
    initializeTracking() {
        // Initialize user tracking data
        this.state.contributions = JSON.parse(localStorage.getItem('contributions') || '[]');
        this.state.achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
    }
    
    startScrollMonitoring() {
        // Start monitoring scroll behavior
        let scrollTimer;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                this.handleScrollEnd();
            }, 150);
        });
    }
    
    handleScrollEnd() {
        // Handle scroll end events
        const scrollPercent = this.state.scrollPosition / (document.body.scrollHeight - window.innerHeight);
        
        // Show tracking panel after significant scroll
        if (scrollPercent > 0.3 && !this.elements.trackingPanel.classList.contains('show')) {
            setTimeout(() => {
                this.elements.trackingPanel.classList.add('show');
            }, 1000);
        }
    }
}

// Initialize scroll physics when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.scrollPhysics = new ScrollPhysics();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScrollPhysics;
}