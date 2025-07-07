/**
 * RAMA 7: Scroll Controller - Controlador de desplazamiento narrativo
 * Gestiona el scroll cinematográfico para la experiencia inmersiva
 */

class ScrollController {
    constructor() {
        this.isScrolling = false;
        this.scrollVelocity = 0;
        this.currentSection = 0;
        this.sections = [];
        this.smoothFactor = 0.1;
        this.narrativePoints = [];
        
        this.init();
    }

    init() {
        this.detectSections();
        this.bindEvents();
        this.setupSmoothScroll();
        this.initializeNarrativePoints();
    }

    detectSections() {
        this.sections = document.querySelectorAll('[data-scroll-section]');
        this.sections.forEach((section, index) => {
            section.setAttribute('data-section-index', index);
        });
    }

    bindEvents() {
        // Scroll suave cinematográfico
        window.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // Scroll por teclado
        document.addEventListener('keydown', this.handleKeyScroll.bind(this));
        
        // Resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Scroll automático narrativo
        this.setupAutoScroll();
    }

    handleWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY;
        this.scrollVelocity += delta * 0.001;
        
        // Límites de velocidad
        this.scrollVelocity = Math.max(-2, Math.min(2, this.scrollVelocity));
        
        if (!this.isScrolling) {
            this.startSmoothScroll();
        }
    }

    startSmoothScroll() {
        this.isScrolling = true;
        this.smoothScrollLoop();
    }

    smoothScrollLoop() {
        if (Math.abs(this.scrollVelocity) < 0.01) {
            this.isScrolling = false;
            this.scrollVelocity = 0;
            return;
        }

        window.scrollBy(0, this.scrollVelocity * 16);
        this.scrollVelocity *= 0.95; // Fricción
        
        this.updateCurrentSection();
        this.checkNarrativePoints();
        
        requestAnimationFrame(() => this.smoothScrollLoop());
    }

    handleKeyScroll(event) {
        const keyActions = {
            'ArrowDown': () => this.scrollToNextSection(),
            'ArrowUp': () => this.scrollToPrevSection(),
            'Space': () => this.scrollToNextSection(),
            'PageDown': () => this.scrollToNextSection(),
            'PageUp': () => this.scrollToPrevSection(),
            'Home': () => this.scrollToSection(0),
            'End': () => this.scrollToSection(this.sections.length - 1)
        };

        if (keyActions[event.key]) {
            event.preventDefault();
            keyActions[event.key]();
        }
    }

    scrollToNextSection() {
        const nextSection = Math.min(this.currentSection + 1, this.sections.length - 1);
        this.scrollToSection(nextSection);
    }

    scrollToPrevSection() {
        const prevSection = Math.max(this.currentSection - 1, 0);
        this.scrollToSection(prevSection);
    }

    scrollToSection(index) {
        if (index >= 0 && index < this.sections.length) {
            const section = this.sections[index];
            const targetY = section.offsetTop - (window.innerHeight * 0.1);
            
            this.smoothScrollTo(targetY);
            this.currentSection = index;
            this.triggerSectionChange(index);
        }
    }

    smoothScrollTo(targetY) {
        const startY = window.pageYOffset;
        const distance = targetY - startY;
        const duration = 800;
        let startTime = null;

        const animation = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            // Easing function
            const easeProgress = this.easeInOutCubic(progress);
            window.scrollTo(0, startY + distance * easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };

        requestAnimationFrame(animation);
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    updateCurrentSection() {
        const scrollY = window.pageYOffset;
        const windowHeight = window.innerHeight;
        
        for (let i = 0; i < this.sections.length; i++) {
            const section = this.sections[i];
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollY >= sectionTop - windowHeight * 0.5 && 
                scrollY < sectionTop + sectionHeight - windowHeight * 0.5) {
                if (this.currentSection !== i) {
                    this.currentSection = i;
                    this.triggerSectionChange(i);
                }
                break;
            }
        }
    }

    initializeNarrativePoints() {
        this.narrativePoints = [
            { position: 0.1, triggered: false, action: 'startNarrative' },
            { position: 0.25, triggered: false, action: 'revealCulture' },
            { position: 0.5, triggered: false, action: 'showInteraction' },
            { position: 0.75, triggered: false, action: 'presentChoices' },
            { position: 0.9, triggered: false, action: 'concludeSection' }
        ];
    }

    checkNarrativePoints() {
        const scrollProgress = window.pageYOffset / (document.body.scrollHeight - window.innerHeight);
        
        this.narrativePoints.forEach(point => {
            if (!point.triggered && scrollProgress >= point.position) {
                point.triggered = true;
                this.triggerNarrativePoint(point.action, scrollProgress);
            }
        });
    }

    triggerSectionChange(sectionIndex) {
        // Evento personalizado para cambio de sección
        const event = new CustomEvent('sectionChange', {
            detail: { 
                sectionIndex, 
                section: this.sections[sectionIndex],
                progress: sectionIndex / (this.sections.length - 1)
            }
        });
        document.dispatchEvent(event);
    }

    triggerNarrativePoint(action, progress) {
        const event = new CustomEvent('narrativePoint', {
            detail: { action, progress }
        });
        document.dispatchEvent(event);
    }

    setupAutoScroll() {
        // Auto-scroll narrativo opcional
        this.autoScrollEnabled = false;
        this.autoScrollSpeed = 0.5;
    }

    enableAutoScroll() {
        this.autoScrollEnabled = true;
        this.autoScrollLoop();
    }

    disableAutoScroll() {
        this.autoScrollEnabled = false;
    }

    autoScrollLoop() {
        if (!this.autoScrollEnabled) return;
        
        window.scrollBy(0, this.autoScrollSpeed);
        requestAnimationFrame(() => this.autoScrollLoop());
    }

    handleResize() {
        // Recalcular posiciones tras redimensionar
        setTimeout(() => {
            this.detectSections();
            this.updateCurrentSection();
        }, 100);
    }

    // API pública
    getCurrentSection() {
        return this.currentSection;
    }

    getScrollProgress() {
        return window.pageYOffset / (document.body.scrollHeight - window.innerHeight);
    }

    setScrollSpeed(speed) {
        this.autoScrollSpeed = speed;
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    window.scrollController = new ScrollController();
});

export default ScrollController;