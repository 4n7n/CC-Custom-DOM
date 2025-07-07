// Sistema de onboarding para patrocinadores
class SponsorOnboarding {
    constructor() {
        this.steps = [
            { id: 'welcome', title: 'Bienvenido', required: true },
            { id: 'company-info', title: 'Información de la Empresa', required: true },
            { id: 'branding', title: 'Material de Marca', required: true },
            { id: 'goals', title: 'Objetivos', required: false },
            { id: 'integration', title: 'Integración', required: false },
            { id: 'review', title: 'Revisión Final', required: true }
        ];
        
        this.currentStep = 0;
        this.formData = {};
        this.validationRules = {};
        this.init();
    }

    init() {
        this.setupValidationRules();
        this.createOnboardingFlow();
        this.attachEventListeners();
    }

    setupValidationRules() {
        this.validationRules = {
            'company-info': {
                companyName: { required: true, minLength: 2 },
                website: { required: true, pattern: /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/ },
                industry: { required: true },
                employeeCount: { required: true },
                contactName: { required: true, minLength: 2 },
                contactEmail: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
                contactPhone: { required: false, pattern: /^[\+]?[0-9\s\-\(\)]{8,}$/ }
            },
            'branding': {
                logoFile: { required: true, maxSize: 5 * 1024 * 1024 },
                brandColors: { required: false },
                brandDescription: { required: true, minLength: 20, maxLength: 500 }
            },
            'goals': {
                primaryGoal: { required: true },
                targetAudience: { required: false },
                successMetrics: { required: false }
            }
        };
    }

    createOnboardingFlow() {
        const container = document.getElementById('sponsor-onboarding');
        if (!container) return;

        container.innerHTML = `
            <div class="onboarding-container">
                <div class="onboarding-header">
                    <h2>Configuración de Patrocinio</h2>
                    <div class="progress-indicator">
                        ${this.steps.map((step, index) => `
                            <div class="step-indicator ${index === 0 ? 'active' : ''}" data-step="${index}">
                                <div class="step-circle">${index + 1}</div>
                                <div class="step-label">${step.title}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="onboarding-content">
                    <div class="step-content" id="step-content">
                        ${this.renderStep(0)}
                    </div>
                </div>
                
                <div class="onboarding-footer">
                    <button class="btn-secondary" id="prev-step" style="display: none;">Anterior</button>
                    <button class="btn-primary" id="next-step">Siguiente</button>
                </div>
            </div>
        `;
    }

    renderStep(stepIndex) {
        const step = this.steps[stepIndex];
        
        switch(step.id) {
            case 'welcome':
                return this.renderWelcomeStep();
            case 'company-info':
                return this.renderCompanyInfoStep();
            case 'branding':
                return this.renderBrandingStep();
            case 'goals':
                return this.renderGoalsStep();
            case 'integration':
                return this.renderIntegrationStep();
            case 'review':
                return this.renderReviewStep();
            default:
                return '<div>Paso no encontrado</div>';
        }
    }

    renderWelcomeStep() {
        return `
            <div class="welcome-step">
                <div class="welcome-icon">🎉</div>
                <h3>¡Bienvenido al Programa de Patrocinio!</h3>
                <p class="welcome-text">
                    Gracias por unirse a nuestro programa de patrocinio. Este proceso de configuración 
                    nos ayudará a personalizar su experiencia y maximizar el valor de su inversión.
                </p>
                
                <div class="features-preview">
                    <h4>Lo que incluye su patrocinio:</h4>
                    <ul class="features-list">
                        <li>🏷️ Visibilidad de marca personalizada</li>
                        <li>📊 Reportes detallados de rendimiento</li>
                        <li>🤝 Acceso directo al equipo</li>
                        <li>📈 Analytics de impacto en tiempo real</li>
                        <li>🎯 Orientación estratégica del proyecto</li>
                    </ul>
                </div>
                
                <div class="time-estimate">
                    <small>⏱️ Este proceso toma aproximadamente 10-15 minutos</small>
                </div>
            </div>
        `;
    }

    renderCompanyInfoStep() {
        return `
            <div class="company-info-step">
                <h3>Información de la Empresa</h3>
                <p>Proporcione los detalles básicos de su empresa para personalizar su experiencia.</p>
                
                <form class="onboarding-form">
                    <div class="form-section">
                        <h4>Datos de la Empresa</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="companyName">Nombre de la Empresa *</label>
                                <input type="text" id="companyName" name="companyName" 
                                       value="${this.formData.companyName || ''}" required>
                                <div class="field-error"></div>
                            </div>
                            <div class="form-group">
                                <label for="website">Sitio Web *</label>
                                <input type="url" id="website" name="website" 
                                       value="${this.formData.website || ''}" 
                                       placeholder="https://ejemplo.com" required>
                                <div class="field-error"></div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="industry">Industria *</label>
                                <select id="industry" name="industry" required>
                                    <option value="">Seleccionar industria</option>
                                    <option value="technology">Tecnología</option>
                                    <option value="finance">Finanzas</option>
                                    <option value="healthcare">Salud</option>
                                    <option value="education">Educación</option>
                                    <option value="retail">Retail</option>
                                    <option value="manufacturing">Manufactura</option>
                                    <option value="consulting">Consultoría</option>
                                    <option value="other">Otro</option>
                                </select>
                                <div class="field-error"></div>
                            </div>
                            <div class="form-group">
                                <label for="employeeCount">Número de Empleados *</label>
                                <select id="employeeCount" name="employeeCount" required>
                                    <option value="">Seleccionar rango</option>
                                    <option value="1-10">1-10</option>
                                    <option value="11-50">11-50</option>
                                    <option value="51-200">51-200</option>
                                    <option value="201-1000">201-1000</option>
                                    <option value="1000+">1000+</option>
                                </select>
                                <div class="field-error"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Contacto Principal</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="contactName">Nombre Completo *</label>
                                <input type="text" id="contactName" name="contactName" 
                                       value="${this.formData.contactName || ''}" required>
                                <div class="field-error"></div>
                            </div>
                            <div class="form-group">
                                <label for="contactTitle">Cargo</label>
                                <input type="text" id="contactTitle" name="contactTitle" 
                                       value="${this.formData.contactTitle || ''}"
                                       placeholder="ej: Director de Marketing">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="contactEmail">Email *</label>
                                <input type="email" id="contactEmail" name="contactEmail" 
                                       value="${this.formData.contactEmail || ''}" required>
                                <div class="field-error"></div>
                            </div>
                            <div class="form-group">
                                <label for="contactPhone">Teléfono</label>
                                <input type="tel" id="contactPhone" name="contactPhone" 
                                       value="${this.formData.contactPhone || ''}"
                                       placeholder="+34 123 456 789">
                                <div class="field-error"></div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    renderBrandingStep() {
        return `
            <div class="branding-step">
                <h3>Material de Marca</h3>
                <p>Suba su logo y proporcione información sobre su marca para una integración perfecta.</p>
                
                <form class="onboarding-form">
                    <div class="form-section">
                        <h4>Logo de la Empresa</h4>
                        <div class="logo-upload">
                            <div class="upload-area" id="logo-upload-area">
                                <div class="upload-icon">📁</div>
                                <div class="upload-text">
                                    <strong>Haga clic para subir su logo</strong>
                                    <br><small>PNG, JPG, SVG hasta 5MB</small>
                                </div>
                                <input type="file" id="logoFile" name="logoFile" 
                                       accept=".png,.jpg,.jpeg,.svg" hidden>
                            </div>
                            <div class="logo-preview" id="logo-preview" style="display: none;">
                                <img id="logo-image" src="" alt="Logo preview">
                                <button type="button" class="remove-logo">×</button>
                            </div>
                            <div class="field-error"></div>
                        </div>
                        
                        <div class="logo-requirements">
                            <h5>Requisitos del Logo:</h5>
                            <ul>
                                <li>Formato: PNG, JPG, o SVG</li>
                                <li>Tamaño máximo: 5MB</li>
                                <li>Resolución recomendada: 300x150px mínimo</li>
                                <li>Fondo transparente preferido</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Identidad de Marca</h4>
                        <div class="form-group">
                            <label for="brandColors">Colores de Marca (opcional)</label>
                            <div class="color-inputs">
                                <div class="color-input">
                                    <label>Color Primario</label>
                                    <input type="color" name="primaryColor" 
                                           value="${this.formData.primaryColor || '#000000'}">
                                </div>
                                <div class="color-input">
                                    <label>Color Secundario</label>
                                    <input type="color" name="secondaryColor" 
                                           value="${this.formData.secondaryColor || '#ffffff'}">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="brandDescription">Descripción de la Marca *</label>
                            <textarea id="brandDescription" name="brandDescription" 
                                      rows="4" required
                                      placeholder="Describa brevemente su empresa, productos/servicios y por qué apoya este proyecto...">${this.formData.brandDescription || ''}</textarea>
                            <div class="char-counter">
                                <span id="char-count">0</span>/500 caracteres
                            </div>
                            <div class="field-error"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="brandGuidelines">Enlace a Guía de Marca (opcional)</label>
                            <input type="url" id="brandGuidelines" name="brandGuidelines" 
                                   value="${this.formData.brandGuidelines || ''}"
                                   placeholder="https://ejemplo.com/brand-guidelines">
                            <small>Si tiene una guía de marca en línea, compártala para mejor integración</small>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    renderGoalsStep() {
        return `
            <div class="goals-step">
                <h3>Objetivos del Patrocinio</h3>
                <p>Ayúdanos a entender sus objetivos para maximizar el valor de su patrocinio.</p>
                
                <form class="onboarding-form">
                    <div class="form-section">
                        <h4>Objetivo Principal</h4>
                        <div class="goal-options">
                            <label class="goal-option">
                                <input type="radio" name="primaryGoal" value="brand-awareness">
                                <div class="goal-content">
                                    <div class="goal-icon">📢</div>
                                    <div class="goal-text">
                                        <strong>Conocimiento de Marca</strong>
                                        <p>Aumentar la visibilidad y reconocimiento</p>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="goal-option">
                                <input type="radio" name="primaryGoal" value="lead-generation">
                                <div class="goal-content">
                                    <div class="goal-icon">🎯</div>
                                    <div class="goal-text">
                                        <strong>Generación de Leads</strong>
                                        <p>Atraer clientes potenciales</p>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="goal-option">
                                <input type="radio" name="primaryGoal" value="community-support">
                                <div class="goal-content">
                                    <div class="goal-icon">🤝</div>
                                    <div class="goal-text">
                                        <strong>Apoyo a la Comunidad</strong>
                                        <p>Contribuir al ecosistema tecnológico</p>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="goal-option">
                                <input type="radio" name="primaryGoal" value="partnership">
                                <div class="goal-content">
                                    <div class="goal-icon">🚀</div>
                                    <div class="goal-text">
                                        <strong>Partnership Estratégico</strong>
                                        <p>Colaboración a largo plazo</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Audiencia Objetivo</h4>
                        <div class="form-group">
                            <label for="targetAudience">¿Qué audiencia quiere alcanzar?</label>
                            <textarea id="targetAudience" name="targetAudience" 
                                      rows="3"
                                      placeholder="ej: Desarrolladores senior, CTOs de startups, empresas fintech...">${this.formData.targetAudience || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Métricas de Éxito</h4>
                        <div class="metrics-checklist">
                            <label class="metric-option">
                                <input type="checkbox" name="successMetrics" value="website-traffic">
                                <span>Tráfico al sitio web</span>
                            </label>
                            <label class="metric-option">
                                <input type="checkbox" name="successMetrics" value="brand-mentions">
                                <span>Menciones de marca</span>
                            </label>
                            <label class="metric-option">
                                <input type="checkbox" name="successMetrics" value="leads">
                                <span>Leads generados</span>
                            </label>
                            <label class="metric-option">
                                <input type="checkbox" name="successMetrics" value="social-engagement">
                                <span>Engagement en redes sociales</span>
                            </label>
                            <label class="metric-option">
                                <input type="checkbox" name="successMetrics" value="community-growth">
                                <span>Crecimiento de comunidad</span>
                            </label>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    renderIntegrationStep() {
        return `
            <div class="integration-step">
                <h3>Integración y Configuración</h3>
                <p>Configure cómo quiere que aparezca su patrocinio y las integraciones técnicas.</p>
                
                <form class="onboarding-form">
                    <div class="form-section">
                        <h4>Preferencias de Visualización</h4>
                        <div class="form-group">
                            <label for="logoPlacement">Ubicación Preferida del Logo</label>
                            <select id="logoPlacement" name="logoPlacement">
                                <option value="header">Header del sitio</option>
                                <option value="sidebar">Barra lateral</option>
                                <option value="footer">Footer</option>
                                <option value="sponsors-page">Página de patrocinadores</option>
                                <option value="custom">Ubicación personalizada</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="linkDestination">Enlace del Logo</label>
                            <input type="url" id="linkDestination" name="linkDestination" 
                                   value="${this.formData.linkDestination || this.formData.website || ''}"
                                   placeholder="https://ejemplo.com">
                            <small>Hacia dónde dirigir el tráfico cuando hagan clic en su logo</small>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Integraciones Técnicas</h4>
                        <div class="integration-options">
                            <label class="integration-option">
                                <input type="checkbox" name="integrations" value="analytics">
                                <div class="integration-content">
                                    <strong>Analytics de Tráfico</strong>
                                    <p>Seguimiento de clics y conversiones desde su logo</p>
                                </div>
                            </label>
                            
                            <label class="integration-option">
                                <input type="checkbox" name="integrations" value="api">
                                <div class="integration-content">
                                    <strong>API de Datos</strong>
                                    <p>Acceso a métricas del proyecto via API</p>
                                </div>
                            </label>
                            
                            <label class="integration-option">
                                <input type="checkbox" name="integrations" value="webhook">
                                <div class="integration-content">
                                    <strong>Webhooks</strong>
                                    <p>Notificaciones automáticas de eventos importantes</p>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Comunicación</h4>
                        <div class="form-group">
                            <label for="reportFrequency">Frecuencia de Reportes</label>
                            <select id="reportFrequency" name="reportFrequency">
                                <option value="weekly">Semanal</option>
                                <option value="monthly" selected>Mensual</option>
                                <option value="quarterly">Trimestral</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="communicationChannels">Canales de Comunicación Preferidos</label>
                            <div class="channel-options">
                                <label class="channel-option">
                                    <input type="checkbox" name="channels" value="email" checked>
                                    <span>📧 Email</span>
                                </label>
                                <label class="channel-option">
                                    <input type="checkbox" name="channels" value="slack">
                                    <span>💬 Slack</span>
                                </label>
                                <label class="channel-option">
                                    <input type="checkbox" name="channels" value="phone">
                                    <span>📞 Teléfono</span>
                                </label>
                                <label class="channel-option">
                                    <input type="checkbox" name="channels" value="video">
                                    <span>🎥 Video llamadas</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    renderReviewStep() {
        return `
            <div class="review-step">
                <h3>Revisión Final</h3>
                <p>Revise toda la información antes de completar la configuración.</p>
                
                <div class="review-summary">
                    <div class="summary-section">
                        <h4>Información de la Empresa</h4>
                        <div class="summary-content">
                            <p><strong>Empresa:</strong> ${this.formData.companyName || 'No especificado'}</p>
                            <p><strong>Sitio Web:</strong> ${this.formData.website || 'No especificado'}</p>
                            <p><strong>Industria:</strong> ${this.formData.industry || 'No especificado'}</p>
                            <p><strong>Contacto:</strong> ${this.formData.contactName || 'No especificado'} (${this.formData.contactEmail || 'No especificado'})</p>
                        </div>
                    </div>
                    
                    <div class="summary-section">
                        <h4>Marca y Objetivos</h4>
                        <div class="summary-content">
                            <p><strong>Logo:</strong> ${this.formData.logoFile ? 'Subido ✓' : 'No subido'}</p>
                            <p><strong>Objetivo Principal:</strong> ${this.getGoalLabel(this.formData.primaryGoal)}</p>
                            <p><strong>Descripción:</strong> ${this.formData.brandDescription ? this.formData.brandDescription.substring(0, 100) + '...' : 'No especificado'}</p>
                        </div>
                    </div>
                    
                    <div class="summary-section">
                        <h4>Configuración</h4>
                        <div class="summary-content">
                            <p><strong>Ubicación del Logo:</strong> ${this.formData.logoPlacement || 'No especificado'}</p>
                            <p><strong>Reportes:</strong> ${this.formData.reportFrequency || 'Mensual'}</p>
                            <p><strong>Integraciones:</strong> ${this.getSelectedIntegrations()}</p>
                        </div>
                    </div>
                </div>
                
                <div class="final-actions">
                    <div class="terms-acceptance">
                        <label class="checkbox-label">
                            <input type="checkbox" id="acceptTerms" required>
                            <span>Acepto los <a href="#terms" target="_blank">términos y condiciones</a> del programa de patrocinio</span>
                        </label>
                    </div>
                    
                    <div class="completion-note">
                        <p>✨ Una vez completado, nuestro equipo revisará su solicitud y se pondrá en contacto en 24-48 horas.</p>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Navegación entre pasos
        document.getElementById('next-step')?.addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('prev-step')?.addEventListener('click', () => {
            this.prevStep();
        });

        // Validación en tiempo real
        document.addEventListener('input', (e) => {
            if (e.target.closest('.onboarding-form')) {
                this.validateField(e.target);
            }
        });

        // Upload de logo
        document.addEventListener('change', (e) => {
            if (e.target.id === 'logoFile') {
                this.handleLogoUpload(e.target);
            }
        });

        // Contador de caracteres
        document.addEventListener('input', (e) => {
            if (e.target.id === 'brandDescription') {
                this.updateCharCounter(e.target);
            }
        });
    }

    async nextStep() {
        if (await this.validateCurrentStep()) {
            this.saveStepData();
            
            if (this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                this.updateStep();
            } else {
                this.completeOnboarding();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateStep();
        }
    }

    updateStep() {
        // Actualizar contenido
        document.getElementById('step-content').innerHTML = this.renderStep(this.currentStep);
        
        // Actualizar indicadores
        document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentStep);
            indicator.classList.toggle('completed', index < this.currentStep);
        });
        
        // Actualizar botones
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');
        
        prevBtn.style.display = this.currentStep > 0 ? 'block' : 'none';
        nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Completar' : 'Siguiente';
        
        // Re-attach event listeners específicos del paso
        this.attachStepSpecificListeners();
    }

    attachStepSpecificListeners() {
        const stepId = this.steps[this.currentStep].id;
        
        if (stepId === 'branding') {
            const uploadArea = document.getElementById('logo-upload-area');
            uploadArea?.addEventListener('click', () => {
                document.getElementById('logoFile')?.click();
            });
            
            document.getElementById('brandDescription')?.addEventListener('input', (e) => {
                this.updateCharCounter(e.target);
            });
        }
    }

    async validateCurrentStep() {
        const stepId = this.steps[this.currentStep].id;
        const rules = this.validationRules[stepId];
        
        if (!rules) return true;
        
        let isValid = true;
        const form = document.querySelector('.onboarding-form');
        
        if (form) {
            for (const [fieldName, rule] of Object.entries(rules)) {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (field && !this.validateField(field, rule)) {
                    isValid = false;
                }
            }
        }
        
        // Validaciones especiales
        if (stepId === 'review') {
            const termsCheckbox = document.getElementById('acceptTerms');
            if (!termsCheckbox?.checked) {
                this.showFieldError(termsCheckbox, 'Debe aceptar los términos y condiciones');
                isValid = false;
            }
        }
        
        return isValid;
    }

    validateField(field, rule = null) {
        if (!rule) {
            const stepId = this.steps[this.currentStep].id;
            const rules = this.validationRules[stepId];
            rule = rules?.[field.name];
        }
        
        if (!rule) return true;
        
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        if (rule.required && !value) {
            isValid = false;
            errorMessage = 'Este campo es requerido';
        } else if (value && rule.minLength && value.length < rule.minLength) {
            isValid = false;
            errorMessage = `Mínimo ${rule.minLength} caracteres`;
        } else if (value && rule.maxLength && value.length > rule.maxLength) {
            isValid = false;
            errorMessage = `Máximo ${rule.maxLength} caracteres`;
        } else if (value && rule.pattern && !rule.pattern.test(value)) {
            isValid = false;
            errorMessage = 'Formato inválido';
        } else if (field.type === 'file' && field.files.length > 0) {
            const file = field.files[0];
            if (rule.maxSize && file.size > rule.maxSize) {
                isValid = false;
                errorMessage = `Archivo muy grande (máximo ${rule.maxSize / (1024 * 1024)}MB)`;
            }
        }
        
        if (isValid) {
            this.clearFieldError(field);
        } else {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }

    showFieldError(field, message) {
        const errorElement = field.parentElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        field.classList.add('error');
    }

    clearFieldError(field) {
        const errorElement = field.parentElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        field.classList.remove('error');
    }

    saveStepData() {
        const form = document.querySelector('.onboarding-form');
        if (!form) return;

        const formData = new FormData(form);
        for (const [key, value] of formData.entries()) {
            if (key === 'successMetrics' || key === 'integrations' || key === 'channels') {
                // Manejar checkboxes múltiples
                if (!this.formData[key]) this.formData[key] = [];
                if (!this.formData[key].includes(value)) {
                    this.formData[key].push(value);
                }
            } else {
                this.formData[key] = value;
            }
        }

        // Guardar en localStorage
        localStorage.setItem('sponsorOnboardingData', JSON.stringify(this.formData));
    }

    handleLogoUpload(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;

        // Validar archivo
        if (!this.validateField(fileInput)) return;

        // Mostrar preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('logo-preview');
            const image = document.getElementById('logo-image');
            const uploadArea = document.getElementById('logo-upload-area');

            image.src = e.target.result;
            preview.style.display = 'block';
            uploadArea.style.display = 'none';

            // Guardar archivo en formData
            this.formData.logoFile = file;
            this.formData.logoPreview = e.target.result;
        };
        reader.readAsDataURL(file);

        // Botón para remover logo
        document.querySelector('.remove-logo')?.addEventListener('click', () => {
            this.removeLogo();
        });
    }

    removeLogo() {
        const preview = document.getElementById('logo-preview');
        const uploadArea = document.getElementById('logo-upload-area');
        const fileInput = document.getElementById('logoFile');

        preview.style.display = 'none';
        uploadArea.style.display = 'block';
        fileInput.value = '';

        delete this.formData.logoFile;
        delete this.formData.logoPreview;
    }

    updateCharCounter(textarea) {
        const counter = document.getElementById('char-count');
        if (counter) {
            counter.textContent = textarea.value.length;
            
            // Cambiar color según límite
            if (textarea.value.length > 450) {
                counter.style.color = '#e53e3e';
            } else if (textarea.value.length > 400) {
                counter.style.color = '#ed8936';
            } else {
                counter.style.color = '#4a5568';
            }
        }
    }

    getGoalLabel(goalValue) {
        const labels = {
            'brand-awareness': 'Conocimiento de Marca',
            'lead-generation': 'Generación de Leads',
            'community-support': 'Apoyo a la Comunidad',
            'partnership': 'Partnership Estratégico'
        };
        return labels[goalValue] || 'No especificado';
    }

    getSelectedIntegrations() {
        if (!this.formData.integrations || this.formData.integrations.length === 0) {
            return 'Ninguna';
        }
        
        const labels = {
            'analytics': 'Analytics',
            'api': 'API',
            'webhook': 'Webhooks'
        };
        
        return this.formData.integrations.map(int => labels[int] || int).join(', ');
    }

    async completeOnboarding() {
        try {
            // Mostrar loading
            this.showLoading('Completando configuración...');

            // Simular envío de datos
            await this.submitOnboardingData();

            // Mostrar éxito
            this.showSuccess();

        } catch (error) {
            this.showError('Error al completar la configuración: ' + error.message);
        }
    }

    async submitOnboardingData() {
        // Simular llamada API
        await new Promise(resolve => setTimeout(resolve, 2000));

        // En producción, aquí se enviarían los datos al servidor
        console.log('Datos de onboarding:', this.formData);

        // Guardar estado completado
        localStorage.setItem('sponsorOnboardingCompleted', 'true');
        localStorage.setItem('sponsorOnboardingDate', new Date().toISOString());

        // Limpiar datos temporales
        localStorage.removeItem('sponsorOnboardingData');

        return {
            success: true,
            sponsorId: 'sponsor_' + Date.now(),
            message: 'Onboarding completado exitosamente'
        };
    }

    showLoading(message) {
        const container = document.querySelector('.onboarding-container');
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <h3>${message}</h3>
                <p>Por favor espere...</p>
            </div>
        `;
    }

    showSuccess() {
        const container = document.querySelector('.onboarding-container');
        container.innerHTML = `
            <div class="success-state">
                <div class="success-icon">🎉</div>
                <h3>¡Configuración Completada!</h3>
                <p>Su patrocinio ha sido configurado exitosamente.</p>
                
                <div class="next-steps">
                    <h4>Próximos Pasos:</h4>
                    <ul>
                        <li>✅ Revisaremos su información en 24-48 horas</li>
                        <li>📧 Le enviaremos el contrato por email</li>
                        <li>🚀 Su logo aparecerá una vez firmado el contrato</li>
                        <li>📊 Recibirá acceso al dashboard de analytics</li>
                    </ul>
                </div>
                
                <div class="success-actions">
                    <button class="btn-primary" onclick="window.location.href='/dashboard'">
                        Ir al Dashboard
                    </button>
                    <button class="btn-secondary" onclick="window.location.href='/'">
                        Volver al Inicio
                    </button>
                </div>
                
                <div class="contact-info">
                    <p>¿Preguntas? Contáctenos en <strong>sponsors@proyecto.com</strong></p>
                </div>
            </div>
        `;
    }

    showError(message) {
        const container = document.querySelector('.onboarding-container');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Error en la Configuración</h3>
                <p>${message}</p>
                
                <div class="error-actions">
                    <button class="btn-primary" onclick="location.reload()">
                        Intentar de Nuevo
                    </button>
                    <button class="btn-secondary" onclick="window.location.href='mailto:support@proyecto.com'">
                        Contactar Soporte
                    </button>
                </div>
            </div>
        `;
    }

    // Métodos públicos para gestión externa
    loadSavedData() {
        try {
            const saved = localStorage.getItem('sponsorOnboardingData');
            if (saved) {
                this.formData = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading saved onboarding data:', error);
        }
    }

    resetOnboarding() {
        this.currentStep = 0;
        this.formData = {};
        localStorage.removeItem('sponsorOnboardingData');
        localStorage.removeItem('sponsorOnboardingCompleted');
        this.updateStep();
    }

    skipToStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.steps.length) {
            this.currentStep = stepIndex;
            this.updateStep();
        }
    }

    exportData() {
        return {
            steps: this.steps,
            currentStep: this.currentStep,
            formData: this.formData,
            completedAt: new Date().toISOString()
        };
    }

    // Método estático para verificar si el onboarding está completo
    static isCompleted() {
        return localStorage.getItem('sponsorOnboardingCompleted') === 'true';
    }

    static getCompletionDate() {
        const date = localStorage.getItem('sponsorOnboardingDate');
        return date ? new Date(date) : null;
    }
}

// CSS adicional para onboarding
const onboardingStyles = `
.onboarding-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.onboarding-header {
    text-align: center;
    margin-bottom: 3rem;
}

.progress-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
    flex-wrap: wrap;
}

.step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: 0.5;
    transition: opacity 0.3s ease;
}

.step-indicator.active,
.step-indicator.completed {
    opacity: 1;
}

.step-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    margin-bottom: 0.5rem;
    transition: all 0.3s ease;
}

.step-indicator.active .step-circle {
    background: #667eea;
    color: white;
}

.step-indicator.completed .step-circle {
    background: #48bb78;
    color: white;
}

.step-label {
    font-size: 0.85rem;
    color: #4a5568;
    text-align: center;
}

.onboarding-content {
    min-height: 500px;
    margin-bottom: 2rem;
}

.onboarding-footer {
    display: flex;
    justify-content: space-between;
    padding-top: 2rem;
    border-top: 1px solid #e2e8f0;
}

.welcome-step {
    text-align: center;
    padding: 2rem 0;
}

.welcome-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
}

.welcome-text {
    font-size: 1.1rem;
    color: #4a5568;
    line-height: 1.6;
    margin-bottom: 2rem;
}

.features-preview {
    background: #f7fafc;
    padding: 2rem;
    border-radius: 12px;
    margin: 2rem 0;
}

.features-list {
    list-style: none;
    padding: 0;
    text-align: left;
    display: inline-block;
}

.features-list li {
    padding: 0.5rem 0;
    font-size: 1rem;
}

.time-estimate {
    color: #4a5568;
    margin-top: 2rem;
}

.onboarding-form {
    max-width: 100%;
}

.form-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e2e8f0;
}

.form-section:last-child {
    border-bottom: none;
}

.form-section h4 {
    color: #2d3748;
    margin-bottom: 1rem;
    font-size: 1.2rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
}

.logo-upload {
    margin-bottom: 1.5rem;
}

.upload-area {
    border: 2px dashed #cbd5e0;
    border-radius: 12px;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.upload-area:hover {
    border-color: #667eea;
    background: #f7fafc;
}

.upload-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.logo-preview {
    position: relative;
    display: inline-block;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem;
}

.logo-preview img {
    max-width: 200px;
    max-height: 100px;
    object-fit: contain;
}

.remove-logo {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #e53e3e;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
}

.logo-requirements {
    background: #e6fffa;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
}

.logo-requirements h5 {
    margin-bottom: 0.5rem;
    color: #2d3748;
}

.logo-requirements ul {
    margin: 0;
    padding-left: 1.5rem;
}

.logo-requirements li {
    font-size: 0.9rem;
    color: #4a5568;
}

.color-inputs {
    display: flex;
    gap: 1rem;
}

.color-input {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.color-input input[type="color"] {
    width: 50px;
    height: 50px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}

.char-counter {
    text-align: right;
    font-size: 0.85rem;
    color: #4a5568;
    margin-top: 0.25rem;
}

.goal-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.goal-option {
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.goal-option:hover {
    border-color: #667eea;
    background: #f7fafc;
}

.goal-option input[type="radio"] {
    display: none;
}

.goal-option input[type="radio"]:checked + .goal-content {
    color: #667eea;
}

.goal-option:has(input:checked) {
    border-color: #667eea;
    background: #e6fffa;
}

.goal-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.goal-icon {
    font-size: 2rem;
}

.goal-text strong {
    display: block;
    margin-bottom: 0.25rem;
}

.goal-text p {
    margin: 0;
    font-size: 0.9rem;
    color: #4a5568;
}

.metrics-checklist {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
}

.metric-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.integration-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.integration-option {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.integration-option:hover {
    border-color: #667eea;
    background: #f7fafc;
}

.integration-option input[type="checkbox"] {
    margin-right: 0.75rem;
}

.integration-content strong {
    display: block;
    margin-bottom: 0.25rem;
}

.channel-options {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
}

.channel-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    transition: all 0.3s ease;
}

.channel-option:hover {
    background: #f7fafc;
}

.review-summary {
    background: #f7fafc;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
}

.summary-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
}

.summary-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.summary-section h4 {
    color: #2d3748;
    margin-bottom: 1rem;
}

.summary-content p {
    margin: 0.5rem 0;
    color: #4a5568;
}

.terms-acceptance {
    margin-bottom: 1.5rem;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.completion-note {
    background: #e6fffa;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
}

.loading-state,
.success-state,
.error-state {
    text-align: center;
    padding: 3rem 2rem;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 2rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.success-icon,
.error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
}

.next-steps {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    margin: 2rem 0;
    text-align: left;
    display: inline-block;
}

.next-steps ul {
    list-style: none;
    padding: 0;
}

.next-steps li {
    padding: 0.5rem 0;
    font-size: 1rem;
}

.success-actions,
.error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;
}

.contact-info {
    margin-top: 2rem;
    color: #4a5568;
}

.field-error {
    color: #e53e3e;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: none;
}

.form-group input.error,
.form-group select.error,
.form-group textarea.error {
    border-color: #e53e3e;
}

@media (max-width: 768px) {
    .onboarding-container {
        padding: 1rem;
    }
    
    .form-row {
        grid-template-columns: 1fr;
    }
    
    .goal-options {
        grid-template-columns: 1fr;
    }
    
    .progress-indicator {
        gap: 0.5rem;
    }
    
    .step-circle {
        width: 30px;
        height: 30px;
        font-size: 0.9rem;
    }
    
    .step-label {
        font-size: 0.75rem;
    }
}
`;

// Inyectar estilos
const onboardingStyleSheet = document.createElement('style');
onboardingStyleSheet.textContent = onboardingStyles;
document.head.appendChild(onboardingStyleSheet);

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('sponsor-onboarding')) {
        window.sponsorOnboarding = new SponsorOnboarding();
        window.sponsorOnboarding.loadSavedData();
    }
});

// Exportar para uso global
window.SponsorOnboarding = SponsorOnboarding;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SponsorOnboarding;
}