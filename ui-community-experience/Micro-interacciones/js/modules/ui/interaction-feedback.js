/* ==================================================
   RAMA 9: Interaction Feedback
   Sistema de retroalimentación para interacciones
   ================================================== */

class InteractionFeedback {
  constructor(options = {}) {
    this.options = {
      enableHaptics: true,
      enableSounds: true,
      enableVisualFeedback: true,
      enableRippleEffect: true,
      enableHoverEffects: true,
      enableFocusEffects: true,
      enableClickEffects: true,
      debounceTime: 16, // 60fps
      maxRipples: 5,
      soundVolume: 0.3,
      ...options
    };
    
    this.activeInteractions = new Map();
    this.ripplePool = [];
    this.soundContext = null;
    this.sounds = new Map();
    this.lastInteractionTime = 0;
    this.interactionQueue = [];
    this.isProcessing = false;
    
    this.init();
  }
  
  init() {
    console.log('🎯 Inicializando Interaction Feedback...');
    
    this.setupAudioContext();
    this.setupEventListeners();
    this.createRipplePool();
    this.initializeObservers();
    this.loadSounds();
    
    console.log('✅ Interaction Feedback inicializado');
  }
  
  setupAudioContext() {
    if (!this.options.enableSounds) return;
    
    try {
      this.soundContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.soundContext.createGain();
      this.masterGain.gain.value = this.options.soundVolume;
      this.masterGain.connect(this.soundContext.destination);
    } catch (error) {
      console.warn('Audio context no disponible:', error);
      this.options.enableSounds = false;
    }
  }
  
  setupEventListeners() {
    // Eventos de mouse
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), { passive: true });
    document.addEventListener('mouseup', this.handleMouseUp.bind(this), { passive: true });
    document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: true });
    document.addEventListener('mouseenter', this.handleMouseEnter.bind(this), { passive: true });
    document.addEventListener('mouseleave', this.handleMouseLeave.bind(this), { passive: true });
    
    // Eventos de touch
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    
    // Eventos de teclado
    document.addEventListener('keydown', this.handleKeyDown.bind(this), { passive: true });
    document.addEventListener('keyup', this.handleKeyUp.bind(this), { passive: true });
    
    // Eventos de focus
    document.addEventListener('focusin', this.handleFocusIn.bind(this), { passive: true });
    document.addEventListener('focusout', this.handleFocusOut.bind(this), { passive: true });
    
    // Eventos de formulario
    document.addEventListener('submit', this.handleFormSubmit.bind(this), { passive: true });
    document.addEventListener('input', this.handleInput.bind(this), { passive: true });
    document.addEventListener('change', this.handleChange.bind(this), { passive: true });
    
    // Eventos personalizados
    document.addEventListener('interaction:success', this.handleSuccess.bind(this));
    document.addEventListener('interaction:error', this.handleError.bind(this));
    document.addEventListener('interaction:warning', this.handleWarning.bind(this));
  }
  
  createRipplePool() {
    if (!this.options.enableRippleEffect) return;
    
    for (let i = 0; i < this.options.maxRipples; i++) {
      const ripple = document.createElement('div');
      ripple.className = 'interaction-ripple';
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        pointer-events: none;
        transform: scale(0);
        opacity: 0;
        z-index: 9999;
        transition: transform 0.6s ease-out, opacity 0.6s ease-out;
      `;
      this.ripplePool.push(ripple);
    }
  }
  
  initializeObservers() {
    // Intersection Observer para elementos que entran en vista
    if (window.IntersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        { threshold: 0.1, rootMargin: '50px' }
      );
      
      // Observar elementos con clase reveal
      document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        this.intersectionObserver.observe(el);
      });
    }
    
    // Mutation Observer para nuevos elementos
    if (window.MutationObserver) {
      this.mutationObserver = new MutationObserver(this.handleMutations.bind(this));
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  loadSounds() {
    if (!this.options.enableSounds || !this.soundContext) return;
    
    // Sonidos procedurales usando Web Audio API
    this.sounds.set('click', this.createClickSound());
    this.sounds.set('hover', this.createHoverSound());
    this.sounds.set('success', this.createSuccessSound());
    this.sounds.set('error', this.createErrorSound());
    this.sounds.set('warning', this.createWarningSound());
    this.sounds.set('notification', this.createNotificationSound());
    this.sounds.set('keypress', this.createKeypressSound());
  }
  
  createClickSound() {
    return () => {
      if (!this.soundContext) return;
      
      const oscillator = this.soundContext.createOscillator();
      const gain = this.soundContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(this.masterGain);
      
      oscillator.frequency.setValueAtTime(800, this.soundContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, this.soundContext.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.3, this.soundContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.1);
      
      oscillator.start(this.soundContext.currentTime);
      oscillator.stop(this.soundContext.currentTime + 0.1);
    };
  }
  
  createHoverSound() {
    return () => {
      if (!this.soundContext) return;
      
      const oscillator = this.soundContext.createOscillator();
      const gain = this.soundContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(this.masterGain);
      
      oscillator.frequency.setValueAtTime(600, this.soundContext.currentTime);
      oscillator.type = 'sine';
      
      gain.gain.setValueAtTime(0.1, this.soundContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.05);
      
      oscillator.start(this.soundContext.currentTime);
      oscillator.stop(this.soundContext.currentTime + 0.05);
    };
  }
  
  createSuccessSound() {
    return () => {
      if (!this.soundContext) return;
      
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
      
      frequencies.forEach((freq, index) => {
        const oscillator = this.soundContext.createOscillator();
        const gain = this.soundContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(this.masterGain);
        
        oscillator.frequency.setValueAtTime(freq, this.soundContext.currentTime + index * 0.1);
        oscillator.type = 'sine';
        
        gain.gain.setValueAtTime(0.2, this.soundContext.currentTime + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + index * 0.1 + 0.3);
        
        oscillator.start(this.soundContext.currentTime + index * 0.1);
        oscillator.stop(this.soundContext.currentTime + index * 0.1 + 0.3);
      });
    };
  }
  
  createErrorSound() {
    return () => {
      if (!this.soundContext) return;
      
      const oscillator = this.soundContext.createOscillator();
      const gain = this.soundContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(this.masterGain);
      
      oscillator.frequency.setValueAtTime(200, this.soundContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(150, this.soundContext.currentTime + 0.5);
      oscillator.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0.3, this.soundContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.5);
      
      oscillator.start(this.soundContext.currentTime);
      oscillator.stop(this.soundContext.currentTime + 0.5);
    };
  }
  
  createWarningSound() {
    return () => {
      if (!this.soundContext) return;
      
      const oscillator = this.soundContext.createOscillator();
      const gain = this.soundContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(this.masterGain);
      
      oscillator.frequency.setValueAtTime(440, this.soundContext.currentTime);
      oscillator.frequency.setValueAtTime(880, this.soundContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(440, this.soundContext.currentTime + 0.2);
      oscillator.type = 'triangle';
      
      gain.gain.setValueAtTime(0.25, this.soundContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.3);
      
      oscillator.start(this.soundContext.currentTime);
      oscillator.stop(this.soundContext.currentTime + 0.3);
    };
  }
  
  createNotificationSound() {
    return () => {
      if (!this.soundContext) return;
      
      const oscillator = this.soundContext.createOscillator();
      const gain = this.soundContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(this.masterGain);
      
      oscillator.frequency.setValueAtTime(800, this.soundContext.currentTime);
      oscillator.type = 'sine';
      
      gain.gain.setValueAtTime(0.2, this.soundContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.2);
      
      oscillator.start(this.soundContext.currentTime);
      oscillator.stop(this.soundContext.currentTime + 0.2);
    };
  }
  
  createKeypressSound() {
    return () => {
      if (!this.soundContext) return;
      
      const oscillator = this.soundContext.createOscillator();
      const gain = this.soundContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(this.masterGain);
      
      oscillator.frequency.setValueAtTime(300, this.soundContext.currentTime);
      oscillator.type = 'square';
      
      gain.gain.setValueAtTime(0.1, this.soundContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.05);
      
      oscillator.start(this.soundContext.currentTime);
      oscillator.stop(this.soundContext.currentTime + 0.05);
    };
  }
  
  // Manejadores de eventos principales
  handleMouseDown(event) {
    this.queueInteraction('mousedown', event);
  }
  
  handleMouseUp(event) {
    this.queueInteraction('mouseup', event);
  }
  
  handleMouseMove(event) {
    this.queueInteraction('mousemove', event);
  }
  
  handleMouseEnter(event) {
    this.queueInteraction('mouseenter', event);
  }
  
  handleMouseLeave(event) {
    this.queueInteraction('mouseleave', event);
  }
  
  handleTouchStart(event) {
    this.queueInteraction('touchstart', event);
  }
  
  handleTouchEnd(event) {
    this.queueInteraction('touchend', event);
  }
  
  handleTouchMove(event) {
    this.queueInteraction('touchmove', event);
  }
  
  handleKeyDown(event) {
    this.queueInteraction('keydown', event);
  }
  
  handleKeyUp(event) {
    this.queueInteraction('keyup', event);
  }
  
  handleFocusIn(event) {
    this.queueInteraction('focusin', event);
  }
  
  handleFocusOut(event) {
    this.queueInteraction('focusout', event);
  }
  
  handleFormSubmit(event) {
    this.queueInteraction('submit', event);
  }
  
  handleInput(event) {
    this.queueInteraction('input', event);
  }
  
  handleChange(event) {
    this.queueInteraction('change', event);
  }
  
  handleSuccess(event) {
    this.queueInteraction('success', event);
  }
  
  handleError(event) {
    this.queueInteraction('error', event);
  }
  
  handleWarning(event) {
    this.queueInteraction('warning', event);
  }
  
  // Sistema de cola para interacciones
  queueInteraction(type, event) {
    const now = performance.now();
    
    // Debounce para eventos frecuentes
    if (type === 'mousemove' || type === 'touchmove') {
      if (now - this.lastInteractionTime < this.options.debounceTime) {
        return;
      }
    }
    
    this.lastInteractionTime = now;
    
    this.interactionQueue.push({
      type,
      event,
      timestamp: now,
      element: event.target
    });
    
    if (!this.isProcessing) {
      this.processInteractionQueue();
    }
  }
  
  processInteractionQueue() {
    this.isProcessing = true;
    
    requestAnimationFrame(() => {
      while (this.interactionQueue.length > 0) {
        const interaction = this.interactionQueue.shift();
        this.processInteraction(interaction);
      }
      this.isProcessing = false;
    });
  }
  
  processInteraction(interaction) {
    const { type, event, element } = interaction;
    
    // Verificar si el elemento debe recibir feedback
    if (!this.shouldProcessElement(element)) {
      return;
    }
    
    switch (type) {
      case 'mousedown':
      case 'touchstart':
        this.handlePressStart(event, element);
        break;
      case 'mouseup':
      case 'touchend':
        this.handlePressEnd(event, element);
        break;
      case 'mouseenter':
        this.handleHoverStart(event, element);
        break;
      case 'mouseleave':
        this.handleHoverEnd(event, element);
        break;
      case 'focusin':
        this.handleFocusStart(event, element);
        break;
      case 'focusout':
        this.handleFocusEnd(event, element);
        break;
      case 'keydown':
        this.handleKeyPress(event, element);
        break;
      case 'submit':
        this.handleFormSubmission(event, element);
        break;
      case 'input':
        this.handleInputChange(event, element);
        break;
      case 'success':
        this.handleSuccessAction(event, element);
        break;
      case 'error':
        this.handleErrorAction(event, element);
        break;
      case 'warning':
        this.handleWarningAction(event, element);
        break;
    }
  }
  
  shouldProcessElement(element) {
    // Verificar si el elemento está marcado para no recibir feedback
    if (element.classList.contains('no-feedback') || 
        element.closest('.no-feedback')) {
      return false;
    }
    
    // Verificar si es un elemento interactivo
    const interactiveElements = [
      'button', 'a', 'input', 'textarea', 'select', 'label',
      '[role="button"]', '[tabindex]', '.btn', '.clickable'
    ];
    
    return interactiveElements.some(selector => 
      element.matches(selector) || element.closest(selector)
    );
  }
  
  // Manejadores específicos de interacciones
  handlePressStart(event, element) {
    if (!this.options.enableClickEffects) return;
    
    // Crear efecto ripple
    if (this.options.enableRippleEffect) {
      this.createRippleEffect(event, element);
    }
    
    // Aplicar clase de pressed
    element.classList.add('interaction-pressed');
    
    // Reproducir sonido
    this.playSound('click');
    
    // Vibración háptica
    this.triggerHapticFeedback('light');
    
    // Registrar interacción
    this.recordInteraction(element, 'press');
  }
  
  handlePressEnd(event, element) {
    if (!this.options.enableClickEffects) return;
    
    // Remover clase de pressed
    element.classList.remove('interaction-pressed');
    
    // Aplicar efecto de release
    element.classList.add('interaction-released');
    setTimeout(() => {
      element.classList.remove('interaction-released');
    }, 150);
  }
  
  handleHoverStart(event, element) {
    if (!this.options.enableHoverEffects) return;
    
    // Aplicar clase de hover
    element.classList.add('interaction-hovered');
    
    // Crear efecto visual sutil
    this.createHoverEffect(element);
    
    // Reproducir sonido sutil
    this.playSound('hover');
    
    // Registrar interacción
    this.recordInteraction(element, 'hover');
  }
  
  handleHoverEnd(event, element) {
    if (!this.options.enableHoverEffects) return;
    
    // Remover clase de hover
    element.classList.remove('interaction-hovered');
    
    // Limpiar efectos visuales
    this.cleanupHoverEffect(element);
  }
  
  handleFocusStart(event, element) {
    if (!this.options.enableFocusEffects) return;
    
    // Aplicar clase de focus
    element.classList.add('interaction-focused');
    
    // Crear outline animado
    this.createFocusEffect(element);
    
    // Registrar interacción
    this.recordInteraction(element, 'focus');
  }
  
  handleFocusEnd(event, element) {
    if (!this.options.enableFocusEffects) return;
    
    // Remover clase de focus
    element.classList.remove('interaction-focused');
    
    // Limpiar efectos de focus
    this.cleanupFocusEffect(element);
  }
  
  handleKeyPress(event, element) {
    // Reproducir sonido de tecla
    this.playSound('keypress');
    
    // Vibración sutil
    this.triggerHapticFeedback('light');
    
    // Efecto visual para teclas especiales
    if (event.key === 'Enter' || event.key === ' ') {
      this.createKeyPressEffect(element);
    }
    
    // Registrar interacción
    this.recordInteraction(element, 'keypress', { key: event.key });
  }
  
  handleFormSubmission(event, element) {
    // Efecto de envío
    this.createSubmissionEffect(element);
    
    // Sonido de confirmación
    this.playSound('success');
    
    // Vibración de confirmación
    this.triggerHapticFeedback('medium');
    
    // Registrar interacción
    this.recordInteraction(element, 'submit');
  }
  
  handleInputChange(event, element) {
    // Efecto sutil para cambios en inputs
    this.createInputChangeEffect(element);
    
    // Registrar interacción
    this.recordInteraction(element, 'input');
  }
  
  handleSuccessAction(event, element) {
    // Efecto de éxito
    this.createSuccessEffect(element || event.target);
    
    // Sonido de éxito
    this.playSound('success');
    
    // Vibración de éxito
    this.triggerHapticFeedback('heavy');
  }
  
  handleErrorAction(event, element) {
    // Efecto de error
    this.createErrorEffect(element || event.target);
    
    // Sonido de error
    this.playSound('error');
    
    // Vibración de error
    this.triggerHapticFeedback('heavy');
  }
  
  handleWarningAction(event, element) {
    // Efecto de advertencia
    this.createWarningEffect(element || event.target);
    
    // Sonido de advertencia
    this.playSound('warning');
    
    // Vibración de advertencia
    this.triggerHapticFeedback('medium');
  }
  
  // Métodos de efectos visuales
  createRippleEffect(event, element) {
    const ripple = this.getRippleFromPool();
    if (!ripple) return;
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    
    let x, y;
    if (event.type === 'touchstart') {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (x - size / 2) + 'px';
    ripple.style.top = (y - size / 2) + 'px';
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(1)';
      ripple.style.opacity = '0.6';
      
      setTimeout(() => {
        ripple.style.opacity = '0';
        setTimeout(() => {
          this.returnRippleToPool(ripple);
        }, 300);
      }, 300);
    });
  }
  
  createHoverEffect(element) {
    // Crear glow sutil
    const glow = document.createElement('div');
    glow.className = 'interaction-glow';
    glow.style.cssText = `
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1));
      border-radius: inherit;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: -1;
    `;
    
    element.style.position = 'relative';
    element.appendChild(glow);
    
    requestAnimationFrame(() => {
      glow.style.opacity = '1';
    });
    
    element._hoverGlow = glow;
  }
  
  cleanupHoverEffect(element) {
    if (element._hoverGlow) {
      element._hoverGlow.style.opacity = '0';
      setTimeout(() => {
        if (element._hoverGlow && element._hoverGlow.parentNode) {
          element._hoverGlow.parentNode.removeChild(element._hoverGlow);
        }
        delete element._hoverGlow;
      }, 300);
    }
  }
  
  createFocusEffect(element) {
    // Crear outline animado
    const outline = document.createElement('div');
    outline.className = 'interaction-focus-outline';
    outline.style.cssText = `
      position: absolute;
      top: -3px;
      left: -3px;
      right: -3px;
      bottom: -3px;
      border: 2px solid rgba(59, 130, 246, 0.5);
      border-radius: inherit;
      opacity: 0;
      transform: scale(0.95);
      transition: all 0.2s ease;
      pointer-events: none;
      z-index: -1;
    `;
    
    element.style.position = 'relative';
    element.appendChild(outline);
    
    requestAnimationFrame(() => {
      outline.style.opacity = '1';
      outline.style.transform = 'scale(1)';
    });
    
    element._focusOutline = outline;
  }
  
  cleanupFocusEffect(element) {
    if (element._focusOutline) {
      element._focusOutline.style.opacity = '0';
      element._focusOutline.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (element._focusOutline && element._focusOutline.parentNode) {
          element._focusOutline.parentNode.removeChild(element._focusOutline);
        }
        delete element._focusOutline;
      }, 200);
    }
  }
  
  createKeyPressEffect(element) {
    element.style.transform = 'scale(0.98)';
    element.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
      element.style.transform = '';
    }, 100);
  }
  
  createSubmissionEffect(element) {
    // Efecto de loading en el botón
    element.classList.add('interaction-submitting');
    
    const originalText = element.textContent;
    element.textContent = 'Enviando...';
    
    setTimeout(() => {
      element.classList.remove('interaction-submitting');
      element.textContent = originalText;
    }, 2000);
  }
  
  createInputChangeEffect(element) {
    // Flash sutil en el borde
    const originalBorder = element.style.borderColor;
    element.style.borderColor = 'rgba(59, 130, 246, 0.5)';
    element.style.transition = 'border-color 0.3s ease';
    
    setTimeout(() => {
      element.style.borderColor = originalBorder;
    }, 300);
  }
  
  createSuccessEffect(element) {
    // Efecto de éxito verde
    element.classList.add('interaction-success');
    
    setTimeout(() => {
      element.classList.remove('interaction-success');
    }, 1000);
  }
  
  createErrorEffect(element) {
    // Efecto de shake rojo
    element.classList.add('interaction-error');
    
    setTimeout(() => {
      element.classList.remove('interaction-error');
    }, 1000);
  }
  
  createWarningEffect(element) {
    // Efecto de warning amarillo
    element.classList.add('interaction-warning');
    
    setTimeout(() => {
      element.classList.remove('interaction-warning');
    }, 1000);
  }
  
  // Gestión de pool de ripples
  getRippleFromPool() {
    return this.ripplePool.find(ripple => !ripple.parentNode);
  }
  
  returnRippleToPool(ripple) {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple);
    }
    ripple.style.transform = 'scale(0)';
    ripple.style.opacity = '0';
  }
  
  // Métodos de sonido
  playSound(soundName) {
    if (!this.options.enableSounds || !this.sounds.has(soundName)) return;
    
    try {
      const sound = this.sounds.get(soundName);
      sound();
    } catch (error) {
      console.warn('Error reproduciendo sonido:', error);
    }
  }
  
  // Métodos de vibración háptica
  triggerHapticFeedback(intensity = 'light') {
    if (!this.options.enableHaptics || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50],
      double: [20, 10, 20],
      pattern: [100, 30, 100, 30, 100]
    };
    
    navigator.vibrate(patterns[intensity] || patterns.light);
  }
  
  // Observadores
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        this.createRevealEffect(entry.target);
      }
    });
  }
  
  handleMutations(mutations) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Observar nuevos elementos reveal
          if (node.classList && node.classList.contains('reveal-on-scroll')) {
            this.intersectionObserver.observe(node);
          }
          
          // Buscar elementos reveal dentro del nodo añadido
          const revealElements = node.querySelectorAll && node.querySelectorAll('.reveal-on-scroll');
          if (revealElements) {
            revealElements.forEach(el => this.intersectionObserver.observe(el));
          }
        }
      });
    });
  }
  
  createRevealEffect(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }
  
  // Sistema de registro de interacciones
  recordInteraction(element, type, data = {}) {
    const interaction = {
      element: element.tagName.toLowerCase(),
      type,
      timestamp: Date.now(),
      data
    };
    
    this.activeInteractions.set(element, interaction);
    
    // Emitir evento para analytics
    this.emit('interaction:recorded', interaction);
  }
  
  // Métodos de utilidad
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // API pública
  addFeedbackToElement(element, options = {}) {
    element.classList.add('interaction-enabled');
    
    if (options.ripple !== false) {
      element.classList.add('ripple-enabled');
    }
    
    if (options.hover !== false) {
      element.classList.add('hover-enabled');
    }
    
    if (options.focus !== false) {
      element.classList.add('focus-enabled');
    }
  }
  
  removeFeedbackFromElement(element) {
    element.classList.remove('interaction-enabled', 'ripple-enabled', 'hover-enabled', 'focus-enabled');
    element.classList.add('no-feedback');
  }
  
  setVolume(volume) {
    this.options.soundVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.options.soundVolume;
    }
  }
  
  enableFeature(feature) {
    this.options[feature] = true;
  }
  
  disableFeature(feature) {
    this.options[feature] = false;
  }
  
  getInteractionStats() {
    return {
      totalInteractions: this.activeInteractions.size,
      queueLength: this.interactionQueue.length,
      ripplePoolSize: this.ripplePool.length,
      soundsLoaded: this.sounds.size
    };
  }
  
  // Limpieza
  destroy() {
    console.log('🧹 Destruyendo Interaction Feedback...');
    
    // Limpiar observadores
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    // Cerrar contexto de audio
    if (this.soundContext) {
      this.soundContext.close();
    }
    
    // Limpiar efectos activos
    document.querySelectorAll('.interaction-glow, .interaction-focus-outline, .interaction-ripple').forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    
    // Limpiar clases
    document.querySelectorAll('.interaction-pressed, .interaction-hovered, .interaction-focused').forEach(el => {
      el.classList.remove('interaction-pressed', 'interaction-hovered', 'interaction-focused');
    });
    
    // Limpiar referencias
    this.activeInteractions.clear();
    this.interactionQueue = [];
    this.ripplePool = [];
    this.sounds.clear();
    
    console.log('✅ Interaction Feedback destruido');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.InteractionFeedback = InteractionFeedback;
}

export default InteractionFeedback;