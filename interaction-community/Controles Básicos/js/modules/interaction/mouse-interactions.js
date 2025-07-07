/**
 * RAMA 7: Mouse Interactions - Interacciones avanzadas con ratón
 * Sistema de interacciones narrativas con mouse para experiencia inmersiva
 */

class MouseInteractionManager {
    constructor() {
        this.currentHover = null;
        this.dragState = null;
        this.mouseTrail = [];
        this.isNarrativeMode = true;
        this.interactionCooldown = false;
        this.cinematicMode = false;
        this.culturalElements = new Map();
        this.narrativeRegions = new Map();
        
        this.init();
    }

    init() {
        this.setupMouseEvents();
        this.createInteractionIndicators();
        this.initializeCulturalElements();
        this.setupNarrativeRegions();
        this.createMouseTrail();
    }

    setupMouseEvents() {
        // Eventos básicos de ratón
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Eventos de hover específicos
        document.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
        document.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
        
        // Evento de rueda del ratón
        document.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }

    handleMouseMove(event) {
        this.updateMouseTrail(event);
        this.checkNarrativeRegions(event);
        this.updateCinematicEffects(event);
        
        // Detección de gestos con ratón
        this.detectMouseGestures(event);
        
        // Actualizar cursor contextual
        this.updateContextualCursor(event);
    }

    handleMouseDown(event) {
        const element = event.target;
        const elementType = this.getElementType(element);
        
        this.dragState = {
            startX: event.clientX,
            startY: event.clientY,
            element: element,
            elementType: elementType,
            startTime: Date.now()
        };
        
        // Efectos específicos según el tipo de elemento
        this.applyMouseDownEffects(element, elementType);
    }

    handleMouseUp(event) {
        if (this.dragState) {
            const dragDistance = Math.sqrt(
                Math.pow(event.clientX - this.dragState.startX, 2) + 
                Math.pow(event.clientY - this.dragState.startY, 2)
            );
            
            const dragDuration = Date.now() - this.dragState.startTime;
            
            // Procesar drag si se movió lo suficiente
            if (dragDistance > 5) {
                this.processDragGesture(this.dragState, event);
            }
            
            this.dragState = null;
        }
    }

    handleClick(event) {
        if (this.interactionCooldown) return;
        
        const element = event.target;
        const elementType = this.getElementType(element);
        
        // Procesamiento específico según tipo de elemento
        this.processElementClick(element, elementType, event);
        
        // Cooldown para evitar clicks múltiples
        this.setInteractionCooldown(300);
    }

    handleDoubleClick(event) {
        const element = event.target;
        const elementType = this.getElementType(element);
        
        // Acciones específicas para doble click
        if (elementType === 'cultural-element') {
            this.deepExploreCulturalElement(element);
        } else if (elementType === 'story-text') {
            this.highlightStorySection(element);
        } else if (elementType === 'character') {
            this.openCharacterProfile(element);
        }
    }

    handleContextMenu(event) {
        event.preventDefault();
        
        const element = event.target;
        const elementType = this.getElementType(element);
        
        // Menú contextual narrativo
        this.showNarrativeContextMenu(element, elementType, event);
    }

    handleWheel(event) {
        if (this.cinematicMode) {
            event.preventDefault();
            this.handleCinematicScroll(event);
        }
    }

    getElementType(element) {
        if (element.classList.contains('cultural-element')) return 'cultural-element';
        if (element.classList.contains('story-choice')) return 'story-choice';
        if (element.classList.contains('character')) return 'character';
        if (element.classList.contains('narrative-text')) return 'story-text';
        if (element.classList.contains('interactive-object')) return 'interactive-object';
        if (element.classList.contains('timeline-event')) return 'timeline-event';
        if (element.classList.contains('location-marker')) return 'location-marker';
        
        return 'default';
    }

    processElementClick(element, elementType, event) {
        const clickActions = {
            'cultural-element': () => this.exploreCulturalElement(element),
            'story-choice': () => this.selectStoryChoice(element),
            'character': () => this.interactWithCharacter(element),
            'story-text': () => this.highlightStoryText(element),
            'interactive-object': () => this.activateInteractiveObject(element),
            'timeline-event': () => this.exploreTimelineEvent(element),
            'location-marker': () => this.exploreLocation(element)
        };
        
        if (clickActions[elementType]) {
            clickActions[elementType]();
        }
        
        // Efectos visuales de interacción
        this.createClickEffect(event.clientX, event.clientY);
        
        // Evento personalizado
        this.dispatchInteractionEvent('elementClick', {
            element,
            elementType,
            coordinates: { x: event.clientX, y: event.clientY }
        });
    }

    exploreCulturalElement(element) {
        const culturalData = this.culturalElements.get(element);
        if (!culturalData) return;
        
        // Expandir información cultural
        this.showCulturalInfo(culturalData);
        
        // Efectos visuales
        element.classList.add('exploring');
        setTimeout(() => element.classList.remove('exploring'), 2000);
    }

    deepExploreCulturalElement(element) {
        const culturalData = this.culturalElements.get(element);
        if (!culturalData) return;
        
        // Exploración profunda
        this.openCulturalExplorer(culturalData);
    }

    selectStoryChoice(element) {
        const choiceData = element.dataset.choice;
        
        // Animación de selección
        element.classList.add('selected');
        
        // Desactivar otras opciones
        document.querySelectorAll('.story-choice').forEach(choice => {
            if (choice !== element) {
                choice.classList.add('unselected');
            }
        });
        
        // Procesar elección
        this.processStoryChoice(choiceData);
    }

    interactWithCharacter(element) {
        const characterId = element.dataset.characterId;
        
        // Animación de interacción
        element.classList.add('interacting');
        
        // Mostrar diálogo
        this.showCharacterDialog(characterId);
    }

    updateMouseTrail(event) {
        this.mouseTrail.push({
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now()
        });
        
        // Mantener solo los últimos 20 puntos
        if (this.mouseTrail.length > 20) {
            this.mouseTrail.shift();
        }
        
        // Actualizar visual del trail
        this.updateMouseTrailVisual();
    }

    createMouseTrail() {
        const trail = document.createElement('div');
        trail.className = 'mouse-trail';
        trail.innerHTML = Array.from({ length: 10 }, (_, i) => 
            `<div class="trail-dot" data-index="${i}"></div>`
        ).join('');
        
        document.body.appendChild(trail);
        this.mouseTrailElement = trail;
    }

    updateMouseTrailVisual() {
        if (!this.mouseTrailElement) return;
        
        const dots = this.mouseTrailElement.querySelectorAll('.trail-dot');
        const recentPoints = this.mouseTrail.slice(-10);
        
        dots.forEach((dot, index) => {
            const point = recentPoints[index];
            if (point) {
                dot.style.left = point.x + 'px';
                dot.style.top = point.y + 'px';
                dot.style.opacity = (index + 1) / 10;
            }
        });
    }

    checkNarrativeRegions(event) {
        const x = event.clientX;
        const y = event.clientY;
        
        this.narrativeRegions.forEach((region, element) => {
            const rect = element.getBoundingClientRect();
            const isInRegion = x >= rect.left && x <= rect.right && 
                              y >= rect.top && y <= rect.bottom;
            
            if (isInRegion && !region.active) {
                region.active = true;
                this.enterNarrativeRegion(element, region);
            } else if (!isInRegion && region.active) {
                region.active = false;
                this.exitNarrativeRegion(element, region);
            }
        });
    }

    enterNarrativeRegion(element, region) {
        element.classList.add('region-active');
        
        // Mostrar información contextual
        this.showContextualInfo(region.data);
        
        // Cambiar cursor
        document.body.style.cursor = region.cursor || 'pointer';
    }

    exitNarrativeRegion(element, region) {
        element.classList.remove('region-active');
        
        // Ocultar información contextual
        this.hideContextualInfo();
        
        // Restaurar cursor
        document.body.style.cursor = 'default';
    }

    detectMouseGestures(event) {
        if (this.mouseTrail.length < 5) return;
        
        const recentPoints = this.mouseTrail.slice(-5);
        const gesture = this.analyzeGesture(recentPoints);
        
        if (gesture) {
            this.processMouseGesture(gesture);
        }
    }

    analyzeGesture(points) {
        // Detectar patrones de movimiento
        const directions = [];
        
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            
            const deltaX = curr.x - prev.x;
            const deltaY = curr.y - prev.y;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                directions.push(deltaX > 0 ? 'right' : 'left');
            } else {
                directions.push(deltaY > 0 ? 'down' : 'up');
            }
        }
        
        // Detectar patrones específicos
        const pattern = directions.join('');
        
        if (pattern.includes('rightleft') || pattern.includes('leftright')) {
            return 'shake';
        } else if (pattern.includes('updown') || pattern.includes('downup')) {
            return 'wave';
        } else if (pattern === 'right'.repeat(4)) {
            return 'swipe-right';
        } else if (pattern === 'left'.repeat(4)) {
            return 'swipe-left';
        }
        
        return null;
    }

    processMouseGesture(gesture) {
        const gestureActions = {
            'shake': () => this.triggerNarrativeAction('reveal-hidden'),
            'wave': () => this.triggerNarrativeAction('wave-greeting'),
            'swipe-right': () => this.triggerNarrativeAction('next-page'),
            'swipe-left': () => this.triggerNarrativeAction('prev-page')
        };
        
        if (gestureActions[gesture]) {
            gestureActions[gesture]();
        }
    }

    createClickEffect(x, y) {
        const effect = document.createElement('div');
        effect.className = 'click-effect';
        effect.style.left = x + 'px';
        effect.style.top = y + 'px';
        
        document.body.appendChild(effect);
        
        // Animación del efecto
        effect.style.animation = 'clickRipple 0.6s ease-out';
        
        setTimeout(() => {
            effect.remove();
        }, 600);
    }

    showNarrativeContextMenu(element, elementType, event) {
        const menu = document.createElement('div');
        menu.className = 'narrative-context-menu';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        const menuItems = this.getContextMenuItems(elementType);
        menu.innerHTML = menuItems.map(item => 
            `<div class="menu-item" data-action="${item.action}">
                <span class="menu-icon">${item.icon}</span>
                <span class="menu-text">${item.text}</span>
            </div>`
        ).join('');
        
        document.body.appendChild(menu);
        
        // Cerrar menú al hacer click fuera
        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.remove();
            }, { once: true });
        }, 0);
    }

    getContextMenuItems(elementType) {
        const menus = {
            'cultural-element': [
                { action: 'explore', icon: '🔍', text: 'Explorar' },
                { action: 'learn-more', icon: '📚', text: 'Aprender más' },
                { action: 'save', icon: '💾', text: 'Guardar' }
            ],
            'story-choice': [
                { action: 'preview', icon: '👁️', text: 'Vista previa' },
                { action: 'info', icon: 'ℹ️', text: 'Información' }
            ],
            'character': [
                { action: 'profile', icon: '👤', text: 'Perfil' },
                { action: 'history', icon: '📖', text: 'Historia' },
                { action: 'relationships', icon: '🤝', text: 'Relaciones' }
            ]
        };
        
        return menus[elementType] || [
            { action: 'info', icon: 'ℹ️', text: 'Información' }
        ];
    }

    updateContextualCursor(event) {
        const element = event.target;
        const elementType = this.getElementType(element);
        
        const cursors = {
            'cultural-element': 'url("data:image/svg+xml,...") 16 16, pointer',
            'story-choice': 'pointer',
            'character': 'url("data:image/svg+xml,...") 16 16, pointer',
            'interactive-object': 'grab'
        };
        
        document.body.style.cursor = cursors[elementType] || 'default';
    }

    initializeCulturalElements() {
        document.querySelectorAll('.cultural-element').forEach(element => {
            const data = {
                id: element.dataset.culturalId,
                name: element.dataset.culturalName,
                description: element.dataset.description,
                period: element.dataset.period,
                significance: element.dataset.significance
            };
            
            this.culturalElements.set(element, data);
        });
    }

    setupNarrativeRegions() {
        document.querySelectorAll('[data-narrative-region]').forEach(element => {
            const regionData = {
                type: element.dataset.narrativeRegion,
                data: JSON.parse(element.dataset.regionData || '{}'),
                cursor: element.dataset.cursor,
                active: false
            };
            
            this.narrativeRegions.set(element, regionData);
        });
    }

    createInteractionIndicators() {
        const indicators = document.createElement('div');
        indicators.className = 'mouse-interaction-indicators';
        indicators.innerHTML = `
            <div class="interaction-hint" data-type="click">
                <span class="hint-icon">🖱️</span>
                <span class="hint-text">Click para interactuar</span>
            </div>
            <div class="interaction-hint" data-type="double-click">
                <span class="hint-icon">🖱️🖱️</span>
                <span class="hint-text">Doble click para explorar</span>
            </div>
            <div class="interaction-hint" data-type="right-click">
                <span class="hint-icon">🖱️➕</span>
                <span class="hint-text">Click derecho para opciones</span>
            </div>
        `;
        
        document.body.appendChild(indicators);
        
        // Auto-ocultar después de 3 segundos
        setTimeout(() => {
            indicators.classList.add('fade-out');
        }, 3000);
    }

    showCulturalInfo(culturalData) {
        const infoPanel = document.createElement('div');
        infoPanel.className = 'cultural-info-panel';
        infoPanel.innerHTML = `
            <div class="info-header">
                <h3>${culturalData.name}</h3>
                <button class="close-info">×</button>
            </div>
            <div class="info-content">
                <p class="description">${culturalData.description}</p>
                <div class="info-details">
                    <div class="detail-item">
                        <span class="detail-label">Período:</span>
                        <span class="detail-value">${culturalData.period}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Significado:</span>
                        <span class="detail-value">${culturalData.significance}</span>
                    </div>
                </div>
                <div class="info-actions">
                    <button class="explore-deeper">Explorar más</button>
                    <button class="add-to-collection">Añadir a colección</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(infoPanel);
        
        // Event listeners
        infoPanel.querySelector('.close-info').addEventListener('click', () => {
            infoPanel.remove();
        });
        
        infoPanel.querySelector('.explore-deeper').addEventListener('click', () => {
            this.openCulturalExplorer(culturalData);
            infoPanel.remove();
        });
    }

    openCulturalExplorer(culturalData) {
        const explorer = document.createElement('div');
        explorer.className = 'cultural-explorer-modal';
        explorer.innerHTML = `
            <div class="explorer-content">
                <div class="explorer-header">
                    <h2>${culturalData.name}</h2>
                    <button class="close-explorer">×</button>
                </div>
                <div class="explorer-body">
                    <div class="explorer-media">
                        <div class="media-viewer">
                            <!-- Contenido multimedia cultural -->
                        </div>
                    </div>
                    <div class="explorer-details">
                        <div class="detail-tabs">
                            <button class="tab-btn active" data-tab="overview">Resumen</button>
                            <button class="tab-btn" data-tab="history">Historia</button>
                            <button class="tab-btn" data-tab="significance">Significado</button>
                            <button class="tab-btn" data-tab="related">Relacionados</button>
                        </div>
                        <div class="tab-content">
                            <!-- Contenido detallado -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(explorer);
        this.setupCulturalExplorerEvents(explorer);
    }

    showCharacterDialog(characterId) {
        const dialog = document.createElement('div');
        dialog.className = 'character-dialog';
        dialog.innerHTML = `
            <div class="dialog-avatar">
                <img src="/assets/characters/${characterId}.jpg" alt="Character">
            </div>
            <div class="dialog-content">
                <div class="character-name">${this.getCharacterName(characterId)}</div>
                <div class="dialog-text">
                    ${this.getCharacterDialog(characterId)}
                </div>
                <div class="dialog-options">
                    <button class="dialog-option" data-option="1">Opción 1</button>
                    <button class="dialog-option" data-option="2">Opción 2</button>
                    <button class="dialog-option" data-option="3">Opción 3</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Animar entrada
        requestAnimationFrame(() => {
            dialog.classList.add('show');
        });
    }

    processDragGesture(dragState, event) {
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < 50) return; // Drag muy corto
        
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        let direction;
        
        if (angle >= -45 && angle <= 45) direction = 'right';
        else if (angle >= 45 && angle <= 135) direction = 'down';
        else if (angle >= -135 && angle <= -45) direction = 'up';
        else direction = 'left';
        
        this.processDragDirection(direction, dragState, distance);
    }

    processDragDirection(direction, dragState, distance) {
        const intensity = Math.min(distance / 100, 1);
        
        const dragActions = {
            'right': () => this.dragNavigate('next', intensity),
            'left': () => this.dragNavigate('prev', intensity),
            'up': () => this.dragNavigate('up', intensity),
            'down': () => this.dragNavigate('down', intensity)
        };
        
        if (dragActions[direction]) {
            dragActions[direction]();
        }
        
        // Efectos visuales de drag
        this.showDragFeedback(direction, intensity);
    }

    dragNavigate(direction, intensity) {
        const event = new CustomEvent('mouseDragNavigation', {
            detail: { direction, intensity }
        });
        document.dispatchEvent(event);
    }

    showDragFeedback(direction, intensity) {
        const feedback = document.createElement('div');
        feedback.className = 'drag-feedback';
        feedback.innerHTML = `
            <div class="drag-arrow drag-${direction}">
                ${this.getDragArrow(direction)}
            </div>
            <div class="drag-intensity" style="width: ${intensity * 100}%"></div>
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 800);
    }

    getDragArrow(direction) {
        const arrows = {
            'right': '→',
            'left': '←',
            'up': '↑',
            'down': '↓'
        };
        return arrows[direction] || '•';
    }

    handleCinematicScroll(event) {
        const delta = event.deltaY;
        const cinematicSpeed = delta * 0.5;
        
        // Scroll cinematográfico suave
        window.scrollBy({
            top: cinematicSpeed,
            behavior: 'smooth'
        });
        
        // Efectos visuales cinematográficos
        this.applyCinematicEffects(delta);
    }

    updateCinematicEffects(event) {
        if (!this.cinematicMode) return;
        
        const mouseX = event.clientX / window.innerWidth;
        const mouseY = event.clientY / window.innerHeight;
        
        // Parallax sutil basado en posición del mouse
        document.querySelectorAll('.parallax-element').forEach(element => {
            const speed = element.dataset.parallaxSpeed || 0.1;
            const x = (mouseX - 0.5) * speed * 100;
            const y = (mouseY - 0.5) * speed * 100;
            
            element.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    applyCinematicEffects(scrollDelta) {
        // Efecto de profundidad basado en scroll
        const intensity = Math.abs(scrollDelta) / 100;
        
        document.body.style.filter = `blur(${intensity}px)`;
        
        setTimeout(() => {
            document.body.style.filter = 'none';
        }, 100);
    }

    applyMouseDownEffects(element, elementType) {
        // Efectos al presionar mouse
        element.classList.add('mouse-pressed');
        
        if (elementType === 'cultural-element') {
            element.style.transform = 'scale(0.95)';
        } else if (elementType === 'story-choice') {
            element.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3)';
        }
        
        // Remover efectos al soltar
        const removeEffects = () => {
            element.classList.remove('mouse-pressed');
            element.style.transform = '';
            element.style.boxShadow = '';
        };
        
        document.addEventListener('mouseup', removeEffects, { once: true });
    }

    setInteractionCooldown(duration) {
        this.interactionCooldown = true;
        setTimeout(() => {
            this.interactionCooldown = false;
        }, duration);
    }

    dispatchInteractionEvent(type, detail) {
        const event = new CustomEvent('mouseInteraction', {
            detail: { type, ...detail, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    triggerNarrativeAction(action) {
        const event = new CustomEvent('narrativeMouseAction', {
            detail: { action, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    // Métodos auxiliares
    getCharacterName(characterId) {
        const names = {
            'character1': 'Yaira',
            'character2': 'Aurelio',
            'character3': 'Esperanza'
        };
        return names[characterId] || 'Personaje Desconocido';
    }

    getCharacterDialog(characterId) {
        const dialogs = {
            'character1': '¡Bienvenido a nuestra comunidad! ¿Te gustaría conocer nuestras tradiciones?',
            'character2': 'He vivido aquí toda mi vida. Puedo contarte historias fascinantes.',
            'character3': 'La cultura de nuestra región es muy rica. ¿Qué te interesa saber?'
        };
        return dialogs[characterId] || 'Hola, ¿en qué puedo ayudarte?';
    }

    setupCulturalExplorerEvents(explorer) {
        // Event listeners para el explorador cultural
        explorer.querySelector('.close-explorer').addEventListener('click', () => {
            explorer.remove();
        });
        
        explorer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                this.switchExplorerTab(explorer, tabId);
            });
        });
    }

    switchExplorerTab(explorer, tabId) {
        // Cambiar tab activo
        explorer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        // Actualizar contenido
        const content = explorer.querySelector('.tab-content');
        content.innerHTML = this.getTabContent(tabId);
    }

    getTabContent(tabId) {
        const contents = {
            'overview': '<p>Información general del elemento cultural...</p>',
            'history': '<p>Historia detallada del elemento...</p>',
            'significance': '<p>Significado cultural y social...</p>',
            'related': '<p>Elementos relacionados...</p>'
        };
        return contents[tabId] || '<p>Contenido no disponible</p>';
    }

    // API pública
    enableCinematicMode() {
        this.cinematicMode = true;
        document.body.classList.add('cinematic-mode');
    }

    disableCinematicMode() {
        this.cinematicMode = false;
        document.body.classList.remove('cinematic-mode');
    }

    setNarrativeMode(enabled) {
        this.isNarrativeMode = enabled;
    }

    getCurrentHover() {
        return this.currentHover;
    }

    getMouseTrail() {
        return [...this.mouseTrail];
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.mouseInteractionManager = new MouseInteractionManager();
});

export default MouseInteractionManager;