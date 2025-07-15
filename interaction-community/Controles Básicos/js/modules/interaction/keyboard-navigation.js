/**
 * RAMA 7: Keyboard Navigation - Navegación por teclado para accesibilidad
 * Sistema completo de navegación narrativa por teclado
 */

class KeyboardNavigationManager {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = 0;
        this.navigationMode = 'story'; // story, choice, exploration
        this.keyMappings = new Map();
        this.narrativeShortcuts = new Map();
        this.isNavigationActive = true;
        this.trapFocus = false;
        
        this.init();
    }

    init() {
        this.setupKeyMappings();
        this.setupNarrativeShortcuts();
        this.bindKeyboardEvents();
        this.updateFocusableElements();
        this.createNavigationIndicators();
    }

    setupKeyMappings() {
        // Navegación básica
        this.keyMappings.set('ArrowUp', () => this.navigate('up'));
        this.keyMappings.set('ArrowDown', () => this.navigate('down'));
        this.keyMappings.set('ArrowLeft', () => this.navigate('left'));
        this.keyMappings.set('ArrowRight', () => this.navigate('right'));
        
        // Navegación por pestañas
        this.keyMappings.set('Tab', (event) => this.handleTab(event));
        
        // Activación
        this.keyMappings.set('Enter', () => this.activate());
        this.keyMappings.set(' ', () => this.activate());
        
        // Navegación de página
        this.keyMappings.set('PageUp', () => this.navigate('pageUp'));
        this.keyMappings.set('PageDown', () => this.navigate('pageDown'));
        this.keyMappings.set('Home', () => this.navigate('home'));
        this.keyMappings.set('End', () => this.navigate('end'));
        
        // Escape
        this.keyMappings.set('Escape', () => this.handleEscape());
    }

    setupNarrativeShortcuts() {
        // Navegación narrativa con teclas alfanuméricas
        this.narrativeShortcuts.set('n', () => this.triggerNarrativeAction('next-story'));
        this.narrativeShortcuts.set('p', () => this.triggerNarrativeAction('prev-story'));
        this.narrativeShortcuts.set('r', () => this.triggerNarrativeAction('replay-section'));
        this.narrativeShortcuts.set('s', () => this.triggerNarrativeAction('skip-section'));
        this.narrativeShortcuts.set('h', () => this.triggerNarrativeAction('show-help'));
        this.narrativeShortcuts.set('m', () => this.triggerNarrativeAction('toggle-menu'));
        this.narrativeShortcuts.set('c', () => this.triggerNarrativeAction('show-choices'));
        this.narrativeShortcuts.set('i', () => this.triggerNarrativeAction('show-info'));
        this.narrativeShortcuts.set('f', () => this.triggerNarrativeAction('toggle-fullscreen'));
        
        // Navegación por números (para elecciones)
        for (let i = 1; i <= 9; i++) {
            this.narrativeShortcuts.set(i.toString(), () => this.selectChoice(i - 1));
        }
        
        // Navegación cultural
        this.narrativeShortcuts.set('e', () => this.triggerNarrativeAction('explore-culture'));
        this.narrativeShortcuts.set('t', () => this.triggerNarrativeAction('show-timeline'));
        this.narrativeShortcuts.set('l', () => this.triggerNarrativeAction('show-locations'));
        this.narrativeShortcuts.set('a', () => this.triggerNarrativeAction('show-characters'));
    }

    bindKeyboardEvents() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Detectar cambios de foco
        document.addEventListener('focusin', this.handleFocusIn.bind(this));
        document.addEventListener('focusout', this.handleFocusOut.bind(this));
    }

    handleKeyDown(event) {
        if (!this.isNavigationActive) return;
        
        const key = event.key;
        const isModifierPressed = event.ctrlKey || event.altKey || event.metaKey;
        
        // Atajos narrativos (solo si no hay modificadores)
        if (!isModifierPressed && this.narrativeShortcuts.has(key)) {
            event.preventDefault();
            this.narrativeShortcuts.get(key)();
            return;
        }
        
        // Navegación básica
        if (this.keyMappings.has(key)) {
            const handler = this.keyMappings.get(key);
            handler(event);
        }
        
        // Combinaciones especiales
        if (event.ctrlKey) {
            this.handleCtrlCombination(event);
        } else if (event.altKey) {
            this.handleAltCombination(event);
        }
    }

    handleKeyUp(event) {
        // Manejo de teclas al soltarlas si es necesario
    }

    handleCtrlCombination(event) {
        const ctrlShortcuts = {
            'ArrowUp': () => this.navigate('firstInSection'),
            'ArrowDown': () => this.navigate('lastInSection'),
            'Home': () => this.navigate('absoluteStart'),
            'End': () => this.navigate('absoluteEnd'),
            'f': () => this.triggerNarrativeAction('find-in-story'),
            'z': () => this.triggerNarrativeAction('undo-choice'),
            'y': () => this.triggerNarrativeAction('redo-choice')
        };
        
        if (ctrlShortcuts[event.key]) {
            event.preventDefault();
            ctrlShortcuts[event.key]();
        }
    }

    handleAltCombination(event) {
        const altShortcuts = {
            'ArrowLeft': () => this.navigate('prevSection'),
            'ArrowRight': () => this.navigate('nextSection'),
            'ArrowUp': () => this.navigate('parentElement'),
            'ArrowDown': () => this.navigate('childElement')
        };
        
        if (altShortcuts[event.key]) {
            event.preventDefault();
            altShortcuts[event.key]();
        }
    }

    navigate(direction) {
        const navigationActions = {
            'up': () => this.moveFocus(-1),
            'down': () => this.moveFocus(1),
            'left': () => this.moveFocusHorizontal(-1),
            'right': () => this.moveFocusHorizontal(1),
            'pageUp': () => this.moveFocus(-10),
            'pageDown': () => this.moveFocus(10),
            'home': () => this.setFocus(0),
            'end': () => this.setFocus(this.focusableElements.length - 1),
            'firstInSection': () => this.moveToFirstInSection(),
            'lastInSection': () => this.moveToLastInSection(),
            'nextSection': () => this.moveToNextSection(),
            'prevSection': () => this.moveToPrevSection(),
            'parentElement': () => this.moveToParent(),
            'childElement': () => this.moveToChild(),
            'absoluteStart': () => this.moveToAbsoluteStart(),
            'absoluteEnd': () => this.moveToAbsoluteEnd()
        };

        if (navigationActions[direction]) {
            navigationActions[direction]();
        }
    }

    moveFocus(delta) {
        if (this.focusableElements.length === 0) return;
        
        const newIndex = this.currentFocusIndex + delta;
        const clampedIndex = Math.max(0, Math.min(newIndex, this.focusableElements.length - 1));
        
        this.setFocus(clampedIndex);
    }

    moveFocusHorizontal(delta) {
        // Navegación horizontal específica para elementos en la misma fila
        const currentElement = this.focusableElements[this.currentFocusIndex];
        if (!currentElement) return;
        
        const currentRect = currentElement.getBoundingClientRect();
        const candidates = this.focusableElements.filter(el => {
            const rect = el.getBoundingClientRect();
            return Math.abs(rect.top - currentRect.top) < 10; // Misma fila
        });
        
        const currentIndexInRow = candidates.indexOf(currentElement);
        const newIndexInRow = currentIndexInRow + delta;
        
        if (newIndexInRow >= 0 && newIndexInRow < candidates.length) {
            const targetElement = candidates[newIndexInRow];
            const targetIndex = this.focusableElements.indexOf(targetElement);
            this.setFocus(targetIndex);
        }
    }

    setFocus(index) {
        if (index < 0 || index >= this.focusableElements.length) return;
        
        this.currentFocusIndex = index;
        const targetElement = this.focusableElements[index];
        
        if (targetElement) {
            targetElement.focus();
            this.scrollToElement(targetElement);
            this.highlightCurrentElement();
            this.announceCurrentElement();
        }
    }

    handleTab(event) {
        if (!this.trapFocus) return;
        
        event.preventDefault();
        const direction = event.shiftKey ? -1 : 1;
        this.moveFocus(direction);
    }

    activate() {
        const currentElement = this.focusableElements[this.currentFocusIndex];
        if (!currentElement) return;
        
        // Simular click o activación
        if (currentElement.click) {
            currentElement.click();
        } else if (currentElement.tagName === 'A') {
            currentElement.click();
        } else if (currentElement.tagName === 'BUTTON') {
            currentElement.click();
        } else {
            // Activación personalizada
            const event = new CustomEvent('keyboardActivation', {
                detail: { element: currentElement }
            });
            currentElement.dispatchEvent(event);
        }
    }

    handleEscape() {
        // Cerrar modales, menús, etc.
        const actions = [
            () => this.closeModal(),
            () => this.closeMenu(),
            () => this.exitFullscreen(),
            () => this.resetNavigation()
        ];
        
        actions.forEach(action => action());
    }

    updateFocusableElements() {
        const selectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '.story-choice',
            '.cultural-element',
            '.narrative-control',
            '.interactive-element'
        ];
        
        this.focusableElements = Array.from(document.querySelectorAll(selectors.join(',')))
            .filter(el => this.isElementVisible(el))
            .sort((a, b) => {
                const aTabIndex = parseInt(a.getAttribute('tabindex') || '0');
                const bTabIndex = parseInt(b.getAttribute('tabindex') || '0');
                return aTabIndex - bTabIndex;
            });
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        
        return rect.width > 0 && 
               rect.height > 0 && 
               style.visibility !== 'hidden' && 
               style.display !== 'none' &&
               style.opacity !== '0';
    }

    scrollToElement(element) {
        const rect = element.getBoundingClientRect();
        const isInViewport = rect.top >= 0 && 
                           rect.bottom <= window.innerHeight &&
                           rect.left >= 0 && 
                           rect.right <= window.innerWidth;
        
        if (!isInViewport) {
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
            });
        }
    }

    highlightCurrentElement() {
        // Remover highlight anterior
        document.querySelectorAll('.keyboard-focus').forEach(el => {
            el.classList.remove('keyboard-focus');
        });
        
        // Aplicar highlight actual
        const currentElement = this.focusableElements[this.currentFocusIndex];
        if (currentElement) {
            currentElement.classList.add('keyboard-focus');
        }
    }

    announceCurrentElement() {
        const currentElement = this.focusableElements[this.currentFocusIndex];
        if (!currentElement) return;
        
        const description = this.getElementDescription(currentElement);
        this.announceToScreenReader(description);
    }

    getElementDescription(element) {
        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('alt') || 
                     element.textContent.trim() || 
                     element.getAttribute('title') || 
                     'Elemento interactivo';
        
        const context = element.closest('[data-story-section]')?.getAttribute('data-story-section') || '';
        
        return `${label}, ${role}${context ? `, en ${context}` : ''}`;
    }

    announceToScreenReader(text) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = text;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    triggerNarrativeAction(action) {
        const event = new CustomEvent('narrativeKeyboardAction', {
            detail: { action, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
        
        // Acciones específicas
        this.executeNarrativeAction(action);
    }

    executeNarrativeAction(action) {
        const actions = {
            'next-story': () => this.navigateStory('next'),
            'prev-story': () => this.navigateStory('prev'),
            'show-help': () => this.showHelpModal(),
            'show-choices': () => this.highlightChoices(),
            'explore-culture': () => this.highlightCulturalElements(),
            'toggle-menu': () => this.toggleNavigationMenu(),
            'show-info': () => this.showContextualInfo()
        };
        
        if (actions[action]) {
            actions[action]();
        }
    }

    selectChoice(index) {
        const choices = document.querySelectorAll('.story-choice');
        if (choices[index]) {
            choices[index].click();
        }
    }

    createNavigationIndicators() {
        const indicators = document.createElement('div');
        indicators.className = 'keyboard-navigation-indicators';
        indicators.innerHTML = `
            <div class="nav-indicator" data-key="arrows">
                <span class="key-combo">↑↓←→</span>
                <span class="key-description">Navegar</span>
            </div>
            <div class="nav-indicator" data-key="enter">
                <span class="key-combo">Enter</span>
                <span class="key-description">Activar</span>
            </div>
            <div class="nav-indicator" data-key="numbers">
                <span class="key-combo">1-9</span>
                <span class="key-description">Elegir</span>
            </div>
            <div class="nav-indicator" data-key="letters">
                <span class="key-combo">N/P</span>
                <span class="key-description">Siguiente/Anterior</span>
            </div>
        `;
        
        document.body.appendChild(indicators);
    }

    showHelpModal() {
        const modal = document.createElement('div');
        modal.className = 'keyboard-help-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Navegación por Teclado</h2>
                <div class="help-sections">
                    <div class="help-section">
                        <h3>Navegación Básica</h3>
                        <ul>
                            <li><kbd>↑↓←→</kbd> - Navegar elementos</li>
                            <li><kbd>Tab</kbd> - Siguiente elemento</li>
                            <li><kbd>Enter</kbd> - Activar elemento</li>
                            <li><kbd>Escape</kbd> - Cerrar/Cancelar</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>Navegación Narrativa</h3>
                        <ul>
                            <li><kbd>N</kbd> - Siguiente historia</li>
                            <li><kbd>P</kbd> - Historia anterior</li>
                            <li><kbd>1-9</kbd> - Seleccionar opción</li>
                            <li><kbd>E</kbd> - Explorar cultura</li>
                        </ul>
                    </div>
                </div>
                <button class="close-help">Cerrar (Escape)</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.querySelector('.close-help').focus();
        
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.remove();
            }
        });
    }

    // Métodos de navegación específicos
    moveToFirstInSection() {
        const currentElement = this.focusableElements[this.currentFocusIndex];
        const section = currentElement?.closest('[data-story-section]');
        
        if (section) {
            const sectionElements = this.focusableElements.filter(el => 
                section.contains(el)
            );
            
            if (sectionElements.length > 0) {
                const firstIndex = this.focusableElements.indexOf(sectionElements[0]);
                this.setFocus(firstIndex);
            }
        }
    }

    moveToNextSection() {
        const sections = document.querySelectorAll('[data-story-section]');
        const currentSection = this.focusableElements[this.currentFocusIndex]?.closest('[data-story-section]');
        
        if (currentSection) {
            const currentIndex = Array.from(sections).indexOf(currentSection);
            const nextSection = sections[currentIndex + 1];
            
            if (nextSection) {
                const nextSectionElements = this.focusableElements.filter(el => 
                    nextSection.contains(el)
                );
                
                if (nextSectionElements.length > 0) {
                    const firstIndex = this.focusableElements.indexOf(nextSectionElements[0]);
                    this.setFocus(firstIndex);
                }
            }
        }
    }

    handleFocusIn(event) {
        const element = event.target;
        const elementIndex = this.focusableElements.indexOf(element);
        
        if (elementIndex !== -1) {
            this.currentFocusIndex = elementIndex;
            this.highlightCurrentElement();
        }
    }

    handleFocusOut(event) {
        // Limpiar highlights si es necesario
    }

    // API pública
    setNavigationMode(mode) {
        this.navigationMode = mode;
        this.updateFocusableElements();
    }

    enableTrapFocus() {
        this.trapFocus = true;
    }

    disableTrapFocus() {
        this.trapFocus = false;
    }

    refreshFocusableElements() {
        this.updateFocusableElements();
    }

    getCurrentElement() {
        return this.focusableElements[this.currentFocusIndex];
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.keyboardNavigation = new KeyboardNavigationManager();
});

export default KeyboardNavigationManager;