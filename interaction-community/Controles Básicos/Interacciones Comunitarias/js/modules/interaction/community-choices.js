/**
 * RAMA 7: Community Choices - Sistema de decisiones comunitarias
 * Gestiona las decisiones colectivas que afectan la narrativa cultural
 */

class CommunityChoiceManager {
    constructor() {
        this.activeChoices = new Map();
        this.communityVotes = new Map();
        this.userVotes = new Map();
        this.choiceResults = new Map();
        this.votingPower = 1;
        this.communityReputation = 0;
        this.culturalInfluence = new Map();
        this.narrativeImpact = new Map();
        
        this.init();
    }

    init() {
        this.setupChoiceSystem();
        this.bindEvents();
        this.loadCommunityData();
        this.createChoiceInterface();
        this.startRealTimeSync();
    }

    setupChoiceSystem() {
        this.choiceTypes = {
            'cultural-preservation': {
                weight: 3,
                culturalImpact: 'high',
                timeLimit: 300000, // 5 minutos
                requiredVotes: 10
            },
            'story-direction': {
                weight: 2,
                culturalImpact: 'medium',
                timeLimit: 180000, // 3 minutos
                requiredVotes: 5
            },
            'character-development': {
                weight: 2,
                culturalImpact: 'medium',
                timeLimit: 240000, // 4 minutos
                requiredVotes: 7
            },
            'cultural-interpretation': {
                weight: 3,
                culturalImpact: 'high',
                timeLimit: 360000, // 6 minutos
                requiredVotes: 12
            },
            'community-action': {
                weight: 2,
                culturalImpact: 'low',
                timeLimit: 120000, // 2 minutos
                requiredVotes: 3
            }
        };
    }

    bindEvents() {
        document.addEventListener('choicePresented', this.handleChoicePresented.bind(this));
        document.addEventListener('userVote', this.handleUserVote.bind(this));
        document.addEventListener('narrativeStateChange', this.handleNarrativeChange.bind(this));
        
        // Eventos de interfaz
        document.addEventListener('click', this.handleChoiceClick.bind(this));
        document.addEventListener('communityUpdate', this.handleCommunityUpdate.bind(this));
    }

    handleChoicePresented(event) {
        const choiceData = event.detail;
        this.presentCommunityChoice(choiceData);
    }

    presentCommunityChoice(choiceData) {
        const choice = {
            id: this.generateChoiceId(),
            type: choiceData.type,
            title: choiceData.title,
            description: choiceData.description,
            options: choiceData.options,
            culturalContext: choiceData.culturalContext,
            consequences: choiceData.consequences,
            timeLimit: this.choiceTypes[choiceData.type]?.timeLimit || 180000,
            startTime: Date.now(),
            votes: new Map(),
            totalVotes: 0,
            status: 'active'
        };

        this.activeChoices.set(choice.id, choice);
        this.createChoiceUI(choice);
        this.startChoiceTimer(choice);
        this.broadcastChoice(choice);
    }

    createChoiceUI(choice) {
        const choiceContainer = document.createElement('div');
        choiceContainer.className = 'community-choice-container';
        choiceContainer.id = `choice-${choice.id}`;
        choiceContainer.innerHTML = this.generateChoiceHTML(choice);

        // Insertar en la interfaz
        const narrativeContainer = document.querySelector('.narrative-container') || document.body;
        narrativeContainer.appendChild(choiceContainer);

        // Animar entrada
        requestAnimationFrame(() => {
            choiceContainer.classList.add('active');
        });

        // Configurar eventos específicos
        this.setupChoiceEvents(choice, choiceContainer);
    }

    generateChoiceHTML(choice) {
        const timeConfig = this.choiceTypes[choice.type];
        const culturalImpactIcon = this.getCulturalImpactIcon(timeConfig.culturalImpact);
        
        return `
            <div class="choice-header">
                <div class="choice-title">
                    <span class="cultural-impact">${culturalImpactIcon}</span>
                    <h3>${choice.title}</h3>
                </div>
                <div class="choice-timer">
                    <div class="timer-bar">
                        <div class="timer-fill"></div>
                    </div>
                    <span class="timer-text">Tiempo restante</span>
                </div>
            </div>
            
            <div class="choice-description">
                <p>${choice.description}</p>
                <div class="cultural-context">
                    <span class="context-label">Contexto Cultural:</span>
                    <span class="context-text">${choice.culturalContext}</span>
                </div>
            </div>
            
            <div class="choice-options">
                ${choice.options.map((option, index) => `
                    <div class="choice-option" data-option-id="${index}" data-choice-id="${choice.id}">
                        <div class="option-content">
                            <div class="option-text">${option.text}</div>
                            <div class="option-consequence">${option.consequence}</div>
                        </div>
                        <div class="vote-info">
                            <div class="vote-count">0</div>
                            <div class="vote-percentage">0%</div>
                        </div>
                        <div class="cultural-impact-indicator">
                            ${this.getCulturalImpactBars(option.culturalImpact)}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="choice-stats">
                <div class="total-participants">
                    <span class="stat-label">Participantes:</span>
                    <span class="stat-value">0</span>
                </div>
                <div class="community-consensus">
                    <span class="stat-label">Consenso:</span>
                    <div class="consensus-bar">
                        <div class="consensus-fill"></div>
                    </div>
                </div>
                <div class="cultural-preservation">
                    <span class="stat-label">Preservación Cultural:</span>
                    <div class="preservation-indicator">
                        ${this.getPreservationIndicator(choice.type)}
                    </div>
                </div>
            </div>
            
            <div class="choice-actions">
                <button class="view-consequences-btn">Ver Consecuencias</button>
                <button class="community-discussion-btn">Discusión Comunitaria</button>
            </div>
        `;
    }

    setupChoiceEvents(choice, container) {
        // Eventos de votación
        container.querySelectorAll('.choice-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.handleOptionClick(choice.id, parseInt(option.dataset.optionId));
            });
        });

        // Botón de consecuencias
        container.querySelector('.view-consequences-btn')?.addEventListener('click', () => {
            this.showConsequences(choice);
        });

        // Botón de discusión
        container.querySelector('.community-discussion-btn')?.addEventListener('click', () => {
            this.openCommunityDiscussion(choice);
        });
    }

    handleOptionClick(choiceId, optionId) {
        const choice = this.activeChoices.get(choiceId);
        if (!choice || choice.status !== 'active') return;

        // Verificar si el usuario ya votó
        if (this.userVotes.has(choiceId)) {
            this.showVoteChangeConfirmation(choiceId, optionId);
            return;
        }

        this.castVote(choiceId, optionId);
    }

    castVote(choiceId, optionId) {
        const choice = this.activeChoices.get(choiceId);
        if (!choice) return;

        // Registrar voto del usuario
        this.userVotes.set(choiceId, {
            optionId,
            timestamp: Date.now(),
            votingPower: this.votingPower
        });

        // Actualizar votos de la opción
        if (!choice.votes.has(optionId)) {
            choice.votes.set(optionId, []);
        }
        
        choice.votes.get(optionId).push({
            userId: this.getUserId(),
            power: this.votingPower,
            timestamp: Date.now()
        });

        choice.totalVotes += this.votingPower;

        // Actualizar UI
        this.updateChoiceUI(choice);
        this.updateVotingPower();

        // Enviar voto a la comunidad
        this.broadcastVote(choiceId, optionId);

        // Verificar si se debe resolver la elección
        this.checkChoiceResolution(choice);
    }

    updateChoiceUI(choice) {
        const container = document.querySelector(`#choice-${choice.id}`);
        if (!container) return;

        // Actualizar contadores de votos
        choice.options.forEach((option, index) => {
            const optionElement = container.querySelector(`[data-option-id="${index}"]`);
            const votes = choice.votes.get(index) || [];
            const voteCount = votes.reduce((sum, vote) => sum + vote.power, 0);
            const percentage = choice.totalVotes > 0 ? (voteCount / choice.totalVotes * 100).toFixed(1) : 0;

            optionElement.querySelector('.vote-count').textContent = voteCount;
            optionElement.querySelector('.vote-percentage').textContent = `${percentage}%`;

            // Actualizar barra visual
            const voteBar = optionElement.querySelector('.vote-bar');
            if (voteBar) {
                voteBar.style.width = `${percentage}%`;
            }
        });

        // Actualizar estadísticas generales
        container.querySelector('.total-participants .stat-value').textContent = 
            this.getUniqueVoters(choice).length;

        // Actualizar consenso
        this.updateConsensusIndicator(choice, container);

        // Marcar opción del usuario
        const userVote = this.userVotes.get(choice.id);
        if (userVote) {
            container.querySelectorAll('.choice-option').forEach((opt, idx) => {
                opt.classList.toggle('user-selected', idx === userVote.optionId);
            });
        }
    }

    updateConsensusIndicator(choice, container) {
        const consensus = this.calculateConsensus(choice);
        const consensusFill = container.querySelector('.consensus-fill');
        const consensusText = container.querySelector('.consensus-text');

        if (consensusFill) {
            consensusFill.style.width = `${consensus}%`;
            consensusFill.className = `consensus-fill ${this.getConsensusClass(consensus)}`;
        }

        if (consensusText) {
            consensusText.textContent = `${consensus}%`;
        }
    }

    calculateConsensus(choice) {
        if (choice.totalVotes === 0) return 0;

        const votes = Array.from(choice.votes.values());
        const maxVotes = Math.max(...votes.map(v => v.reduce((sum, vote) => sum + vote.power, 0)));
        
        return Math.round((maxVotes / choice.totalVotes) * 100);
    }

    getConsensusClass(consensus) {
        if (consensus >= 70) return 'high-consensus';
        if (consensus >= 50) return 'medium-consensus';
        return 'low-consensus';
    }

    startChoiceTimer(choice) {
        const container = document.querySelector(`#choice-${choice.id}`);
        const timerFill = container?.querySelector('.timer-fill');
        const timerText = container?.querySelector('.timer-text');

        const updateTimer = () => {
            const elapsed = Date.now() - choice.startTime;
            const remaining = Math.max(0, choice.timeLimit - elapsed);
            const percentage = (remaining / choice.timeLimit) * 100;

            if (timerFill) {
                timerFill.style.width = `${percentage}%`;
                timerFill.className = `timer-fill ${this.getTimerClass(percentage)}`;
            }

            if (timerText) {
                timerText.textContent = this.formatTime(remaining);
            }

            if (remaining === 0) {
                this.resolveChoice(choice);
                return;
            }

            requestAnimationFrame(updateTimer);
        };

        updateTimer();
    }

    getTimerClass(percentage) {
        if (percentage <= 20) return 'timer-critical';
        if (percentage <= 50) return 'timer-warning';
        return 'timer-normal';
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    checkChoiceResolution(choice) {
        const config = this.choiceTypes[choice.type];
        const uniqueVoters = this.getUniqueVoters(choice);

        // Resolver si se alcanza el mínimo de votos
        if (uniqueVoters.length >= config.requiredVotes) {
            this.resolveChoice(choice);
        }
    }

    resolveChoice(choice) {
        choice.status = 'resolved';
        choice.endTime = Date.now();

        // Determinar ganador
        const winner = this.determineWinner(choice);
        choice.winner = winner;

        // Actualizar estadísticas comunitarias
        this.updateCommunityStats(choice);

        // Aplicar consecuencias narrativas
        this.applyNarrativeConsequences(choice);

        // Actualizar UI final
        this.showChoiceResults(choice);

        // Limpiar elección activa
        this.activeChoices.delete(choice.id);

        // Guardar en historial
        this.choiceResults.set(choice.id, choice);
    }

    determineWinner(choice) {
        let maxVotes = 0;
        let winningOption = null;

        choice.votes.forEach((votes, optionId) => {
            const totalVotes = votes.reduce((sum, vote) => sum + vote.power, 0);
            if (totalVotes > maxVotes) {
                maxVotes = totalVotes;
                winningOption = optionId;
            }
        });

        return {
            optionId: winningOption,
            votes: maxVotes,
            option: choice.options[winningOption]
        };
    }

    showChoiceResults(choice) {
        const container = document.querySelector(`#choice-${choice.id}`);
        if (!container) return;

        // Añadir clase de resultado
        container.classList.add('choice-resolved');

        // Crear overlay de resultados
        const resultsOverlay = document.createElement('div');
        resultsOverlay.className = 'choice-results-overlay';
        resultsOverlay.innerHTML = `
            <div class="results-content">
                <h4>Decisión Comunitaria</h4>
                <div class="winning-option">
                    <div class="winner-badge">Ganadora</div>
                    <div class="winner-text">${choice.winner.option.text}</div>
                    <div class="winner-votes">${choice.winner.votes} votos</div>
                </div>
                <div class="cultural-impact">
                    <span class="impact-label">Impacto Cultural:</span>
                    <div class="impact-visualization">
                        ${this.visualizeCulturalImpact(choice.winner.option)}
                    </div>
                </div>
                <div class="narrative-continuation">
                    <button class="continue-story-btn">Continuar Historia</button>
                </div>
            </div>
        `;

        container.appendChild(resultsOverlay);

        // Event listener para continuar
        resultsOverlay.querySelector('.continue-story-btn').addEventListener('click', () => {
            this.continueNarrative(choice);
        });

        // Auto-continuar después de un tiempo
        setTimeout(() => {
            if (resultsOverlay.parentNode) {
                this.continueNarrative(choice);
            }
        }, 8000);
    }

    applyNarrativeConsequences(choice) {
        const consequence = choice.winner.option.consequence;
        const culturalImpact = choice.winner.option.culturalImpact;

        // Aplicar cambios narrativos
        const narrativeEvent = new CustomEvent('narrativeConsequence', {
            detail: {
                choiceId: choice.id,
                consequence,
                culturalImpact,
                communityDecision: true,
                timestamp: Date.now()
            }
        });

        document.dispatchEvent(narrativeEvent);

        // Actualizar influencia cultural
        this.updateCulturalInfluence(choice.type, culturalImpact);
    }

    updateCulturalInfluence(choiceType, impact) {
        const currentInfluence = this.culturalInfluence.get(choiceType) || 0;
        const impactValues = { low: 1, medium: 3, high: 5 };
        
        this.culturalInfluence.set(choiceType, currentInfluence + impactValues[impact]);
    }

    showConsequences(choice) {
        const modal = document.createElement('div');
        modal.className = 'consequences-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Posibles Consecuencias</h3>
                    <button class="close-modal">×</button>
                </div>
                <div class="consequences-list">
                    ${choice.options.map((option, index) => `
                        <div class="consequence-item">
                            <div class="option-title">${option.text}</div>
                            <div class="consequence-description">${option.consequence}</div>
                            <div class="cultural-effects">
                                <span class="effects-label">Efectos Culturales:</span>
                                <div class="effects-list">
                                    ${option.culturalEffects?.map(effect => 
                                        `<span class="effect-tag">${effect}</span>`
                                    ).join('') || 'Efectos menores'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // Métodos auxiliares
    generateChoiceId() {
        return 'choice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        return localStorage.getItem('userId') || 'anonymous_' + Date.now();
    }

    getUniqueVoters(choice) {
        const voters = new Set();
        choice.votes.forEach(votes => {
            votes.forEach(vote => voters.add(vote.userId));
        });
        return Array.from(voters);
    }

    getCulturalImpactIcon(impact) {
        const icons = {
            low: '🔸',
            medium: '🔶',
            high: '🔥'
        };
        return icons[impact] || '🔸';
    }

    getCulturalImpactBars(impact) {
        const levels = { low: 1, medium: 2, high: 3 };
        const level = levels[impact] || 1;
        
        return Array.from({ length: 3 }, (_, i) => 
            `<div class="impact-bar ${i < level ? 'active' : ''}"></div>`
        ).join('');
    }

    getPreservationIndicator(choiceType) {
        const preservationLevels = {
            'cultural-preservation': '🏛️🏛️🏛️',
            'cultural-interpretation': '🏛️🏛️',
            'story-direction': '🏛️',
            'character-development': '🏛️',
            'community-action': '🏛️'
        };
        return preservationLevels[choiceType] || '🏛️';
    }

    updateVotingPower() {
        // Incrementar poder de voto basado en participación
        this.votingPower = Math.min(3, this.votingPower + 0.1);
        this.communityReputation += 5;
    }

    // API pública
    getCurrentChoices() {
        return new Map(this.activeChoices);
    }

    getUserVoteHistory() {
        return new Map(this.userVotes);
    }

    getCommunityStats() {
        return {
            totalChoices: this.choiceResults.size,
            votingPower: this.votingPower,
            reputation: this.communityReputation,
            culturalInfluence: new Map(this.culturalInfluence)
        };
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.communityChoiceManager = new CommunityChoiceManager();
});

export default CommunityChoiceManager;