/* ==================================================
   RAMA 9: Animation Controller
   Controlador centralizado para animaciones
   ================================================== */

class AnimationController {
  constructor(options = {}) {
    this.options = {
      enableAnimations: true,
      respectReducedMotion: true,
      defaultDuration: 300,
      defaultEasing: 'ease-out',
      enableGPUAcceleration: true,
      enableIntersectionObserver: true,
      observerThreshold: 0.1,
      observerRootMargin: '50px',
      maxConcurrentAnimations: 20,
      enablePerformanceMonitoring: true,
      ...options
    };
    
    this.animations = new Map();
    this.animationQueue = [];
    this.activeAnimations = new Set();
    this.intersectionObserver = null;
    this.performanceObserver = null;
    this.animationId = 0;
    
    this.presets = new Map();
    this.timelines = new Map();
    this.keyframes = new Map();
    
    this.isReducedMotion = false;
    this.performanceMetrics = {
      totalAnimations: 0,
      droppedFrames: 0,
      averageDuration: 0
    };
    
    this.init();
  }
  
  init() {
    console.log('🎬 Inicializando Animation Controller...');
    
    this.checkReducedMotion();
    this.setupIntersectionObserver();
    this.setupPerformanceMonitoring();
    this.loadAnimationPresets();
    this.setupEventListeners();
    
    console.log('✅ Animation Controller inicializado');
  }
  
  checkReducedMotion() {
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (this.isReducedMotion && this.options.respectReducedMotion) {
      this.options.enableAnimations = false;
      console.log('🎬 Animaciones deshabilitadas por preferencia de movimiento reducido');
    }
    
    // Escuchar cambios en la preferencia
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
      if (this.options.respectReducedMotion) {
        this.options.enableAnimations = !e.matches;
      }
    });
  }
  
  setupIntersectionObserver() {
    if (!this.options.enableIntersectionObserver || !window.IntersectionObserver) return;
    
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        threshold: this.options.observerThreshold,
        rootMargin: this.options.observerRootMargin
      }
    );
    
    // Observar elementos con atributos de animación
    document.querySelectorAll('[data-animate]').forEach(el => {
      this.intersectionObserver.observe(el);
    });
  }
  
  setupPerformanceMonitoring() {
    if (!this.options.enablePerformanceMonitoring || !window.PerformanceObserver) return;
    
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure' && entry.name.startsWith('animation-')) {
            this.updatePerformanceMetrics(entry);
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Performance Observer no disponible:', error);
    }
  }
  
  loadAnimationPresets() {
    // Fade animations
    this.presets.set('fadeIn', {
      keyframes: [
        { opacity: 0 },
        { opacity: 1 }
      ],
      options: {
        duration: 300,
        easing: 'ease-out',
        fill: 'forwards'
      }
    });
    
    this.presets.set('fadeOut', {
      keyframes: [
        { opacity: 1 },
        { opacity: 0 }
      ],
      options: {
        duration: 300,
        easing: 'ease-in',
        fill: 'forwards'
      }
    });
    
    // Slide animations
    this.presets.set('slideInUp', {
      keyframes: [
        { transform: 'translateY(100%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ],
      options: {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    });
    
    this.presets.set('slideInDown', {
      keyframes: [
        { transform: 'translateY(-100%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ],
      options: {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    });
    
    this.presets.set('slideInLeft', {
      keyframes: [
        { transform: 'translateX(-100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ],
      options: {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    });
    
    this.presets.set('slideInRight', {
      keyframes: [
        { transform: 'translateX(100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ],
      options: {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    });
    
    // Scale animations
    this.presets.set('scaleIn', {
      keyframes: [
        { transform: 'scale(0)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      options: {
        duration: 300,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'forwards'
      }
    });
    
    this.presets.set('scaleOut', {
      keyframes: [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0)', opacity: 0 }
      ],
      options: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        fill: 'forwards'
      }
    });
    
    // Rotation animations
    this.presets.set('rotateIn', {
      keyframes: [
        { transform: 'rotate(-180deg)', opacity: 0 },
        { transform: 'rotate(0deg)', opacity: 1 }
      ],
      options: {
        duration: 500,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        fill: 'forwards'
      }
    });
    
    // Bounce animations
    this.presets.set('bounceIn', {
      keyframes: [
        { transform: 'scale(0.3)', opacity: 0, offset: 0 },
        { transform: 'scale(1.05)', opacity: 1, offset: 0.5 },
        { transform: 'scale(0.9)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1)', opacity: 1, offset: 1 }
      ],
      options: {
        duration: 600,
        easing: 'ease-out',
        fill: 'forwards'
      }
    });
    
    // Flip animations
    this.presets.set('flipInX', {
      keyframes: [
        { transform: 'perspective(400px) rotateX(90deg)', opacity: 0 },
        { transform: 'perspective(400px) rotateX(-20deg)', opacity: 1, offset: 0.4 },
        { transform: 'perspective(400px) rotateX(10deg)', opacity: 1, offset: 0.6 },
        { transform: 'perspective(400px) rotateX(-5deg)', opacity: 1, offset: 0.8 },
        { transform: 'perspective(400px) rotateX(0deg)', opacity: 1 }
      ],
      options: {
        duration: 750,
        easing: 'ease-out',
        fill: 'forwards'
      }
    });
    
    // Attention seekers
    this.presets.set('pulse', {
      keyframes: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' }
      ],
      options: {
        duration: 800,
        easing: 'ease-in-out',
        iterations: Infinity
      }
    });
    
    this.presets.set('shake', {
      keyframes: [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
      ],
      options: {
        duration: 600,
        easing: 'ease-in-out'
      }
    });
    
    this.presets.set('wobble', {
      keyframes: [
        { transform: 'translateX(0%) rotate(0deg)' },
        { transform: 'translateX(-25%) rotate(-5deg)' },
        { transform: 'translateX(20%) rotate(3deg)' },
        { transform: 'translateX(-15%) rotate(-3deg)' },
        { transform: 'translateX(10%) rotate(2deg)' },
        { transform: 'translateX(-5%) rotate(-1deg)' },
        { transform: 'translateX(0%) rotate(0deg)' }
      ],
      options: {
        duration: 1000,
        easing: 'ease-in-out'
      }
    });
  }
  
  setupEventListeners() {
    // Escuchar eventos de animación personalizados
    document.addEventListener('animate:start', this.handleAnimateEvent.bind(this));
    document.addEventListener('animate:stop', this.handleStopEvent.bind(this));
    document.addEventListener('animate:pause', this.handlePauseEvent.bind(this));
    document.addEventListener('animate:resume', this.handleResumeEvent.bind(this));
    
    // Escuchar cambios de visibilidad
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
  
  // API principal para animaciones
  animate(element, animation, options = {}) {
    if (!this.options.enableAnimations) {
      return this.createMockAnimation();
    }
    
    // Normalizar elemento
    element = this.normalizeElement(element);
    if (!element) {
      console.warn('Elemento no válido para animación');
      return this.createMockAnimation();
    }
    
    // Resolver preset o keyframes
    const { keyframes, animationOptions } = this.resolveAnimation(animation, options);
    
    // Aplicar aceleración GPU si está habilitada
    if (this.options.enableGPUAcceleration) {
      this.enableGPUAcceleration(element);
    }
    
    // Crear ID único para la animación
    const animationId = this.generateAnimationId();
    
    // Verificar límite de animaciones concurrentes
    if (this.activeAnimations.size >= this.options.maxConcurrentAnimations) {
      this.animationQueue.push({
        element,
        keyframes,
        options: animationOptions,
        id: animationId
      });
      return this.createQueuedAnimation(animationId);
    }
    
    // Ejecutar animación
    return this.executeAnimation(element, keyframes, animationOptions, animationId);
  }
  
  executeAnimation(element, keyframes, options, animationId) {
    // Iniciar medición de rendimiento
    if (this.options.enablePerformanceMonitoring) {
      performance.mark(`animation-${animationId}-start`);
    }
    
    try {
      // Crear animación Web API
      const animation = element.animate(keyframes, options);
      
      // Configurar eventos
      this.setupAnimationEvents(animation, animationId, element);
      
      // Registrar animación
      this.animations.set(animationId, {
        animation,
        element,
        keyframes,
        options,
        startTime: performance.now()
      });
      
      this.activeAnimations.add(animationId);
      
      // Incrementar contador
      this.performanceMetrics.totalAnimations++;
      
      return new AnimationWrapper(animation, animationId, this);
      
    } catch (error) {
      console.error('Error ejecutando animación:', error);
      return this.createMockAnimation();
    }
  }
  
  setupAnimationEvents(animation, animationId, element) {
    animation.addEventListener('finish', () => {
      this.handleAnimationFinish(animationId, element);
    });
    
    animation.addEventListener('cancel', () => {
      this.handleAnimationCancel(animationId, element);
    });
    
    animation.addEventListener('error', (error) => {
      this.handleAnimationError(animationId, element, error);
    });
  }
  
  handleAnimationFinish(animationId, element) {
    // Finalizar medición de rendimiento
    if (this.options.enablePerformanceMonitoring) {
      performance.mark(`animation-${animationId}-end`);
      performance.measure(
        `animation-${animationId}`,
        `animation-${animationId}-start`,
        `animation-${animationId}-end`
      );
    }
    
    // Limpiar animación
    this.cleanupAnimation(animationId, element);
    
    // Procesar cola
    this.processAnimationQueue();
    
    // Emitir evento
    this.emit('animation:finished', { animationId, element });
  }
  
  handleAnimationCancel(animationId, element) {
    this.cleanupAnimation(animationId, element);
    this.processAnimationQueue();
    this.emit('animation:cancelled', { animationId, element });
  }
  
  handleAnimationError(animationId, element, error) {
    console.error('Error en animación:', error);
    this.cleanupAnimation(animationId, element);
    this.processAnimationQueue();
    this.emit('animation:error', { animationId, element, error });
  }
  
  cleanupAnimation(animationId, element) {
    // Remover de registros
    this.animations.delete(animationId);
    this.activeAnimations.delete(animationId);
    
    // Limpiar aceleración GPU
    if (this.options.enableGPUAcceleration) {
      this.disableGPUAcceleration(element);
    }
  }
  
  processAnimationQueue() {
    if (this.animationQueue.length === 0) return;
    if (this.activeAnimations.size >= this.options.maxConcurrentAnimations) return;
    
    const queued = this.animationQueue.shift();
    this.executeAnimation(queued.element, queued.keyframes, queued.options, queued.id);
  }
  
  // Métodos de utilidad
  normalizeElement(element) {
    if (typeof element === 'string') {
      return document.querySelector(element);
    }
    return element instanceof Element ? element : null;
  }
  
  resolveAnimation(animation, options) {
    let keyframes, animationOptions;
    
    if (typeof animation === 'string' && this.presets.has(animation)) {
      // Usar preset
      const preset = this.presets.get(animation);
      keyframes = preset.keyframes;
      animationOptions = { ...preset.options, ...options };
    } else if (Array.isArray(animation)) {
      // Keyframes directos
      keyframes = animation;
      animationOptions = {
        duration: this.options.defaultDuration,
        easing: this.options.defaultEasing,
        fill: 'forwards',
        ...options
      };
    } else if (typeof animation === 'object') {
      // Objeto con keyframes y opciones
      keyframes = animation.keyframes || [];
      animationOptions = { ...animation.options, ...options };
    } else {
      throw new Error('Formato de animación no válido');
    }
    
    return { keyframes, animationOptions };
  }
  
  generateAnimationId() {
    return `anim_${++this.animationId}_${Date.now()}`;
  }
  
  enableGPUAcceleration(element) {
    element.style.willChange = 'transform, opacity';
    element.style.transform = element.style.transform || 'translateZ(0)';
  }
  
  disableGPUAcceleration(element) {
    element.style.willChange = 'auto';
    if (element.style.transform === 'translateZ(0)') {
      element.style.transform = '';
    }
  }
  
  createMockAnimation() {
    return {
      play: () => {},
      pause: () => {},
      cancel: () => {},
      finish: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      playState: 'finished',
      ready: Promise.resolve(),
      finished: Promise.resolve()
    };
  }
  
  createQueuedAnimation(animationId) {
    return {
      id: animationId,
      play: () => console.log('Animación en cola'),
      pause: () => {},
      cancel: () => {
        this.animationQueue = this.animationQueue.filter(a => a.id !== animationId);
      },
      finish: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      playState: 'pending',
      ready: Promise.resolve(),
      finished: new Promise(resolve => {
        // Se resolverá cuando la animación se ejecute
      })
    };
  }
  
  // Métodos para animaciones complejas
  createTimeline(name) {
    const timeline = new AnimationTimeline(this);
    this.timelines.set(name, timeline);
    return timeline;
  }
  
  sequence(animations) {
    return new AnimationSequence(animations, this);
  }
  
  parallel(animations) {
    return new AnimationParallel(animations, this);
  }
  
  stagger(elements, animation, options = {}) {
    const staggerDelay = options.stagger || 100;
    const animations = [];
    
    elements.forEach((element, index) => {
      const animationOptions = {
        ...options,
        delay: (options.delay || 0) + (index * staggerDelay)
      };
      
      animations.push(this.animate(element, animation, animationOptions));
    });
    
    return animations;
  }
  
  // Métodos de preset personalizado
  addPreset(name, keyframes, options) {
    this.presets.set(name, {
      keyframes: Array.isArray(keyframes) ? keyframes : [keyframes],
      options: {
        duration: this.options.defaultDuration,
        easing: this.options.defaultEasing,
        fill: 'forwards',
        ...options
      }
    });
  }
  
  removePreset(name) {
    return this.presets.delete(name);
  }
  
  getPreset(name) {
    return this.presets.get(name);
  }
  
  listPresets() {
    return Array.from(this.presets.keys());
  }
  
  // Métodos de control global
  pauseAll() {
    this.animations.forEach(({ animation }) => {
      if (animation.playState === 'running') {
        animation.pause();
      }
    });
  }
  
  resumeAll() {
    this.animations.forEach(({ animation }) => {
      if (animation.playState === 'paused') {
        animation.play();
      }
    });
  }
  
  cancelAll() {
    this.animations.forEach(({ animation }) => {
      animation.cancel();
    });
    this.animations.clear();
    this.activeAnimations.clear();
    this.animationQueue = [];
  }
  
  // Observadores de intersección
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const animationType = element.dataset.animate;
        const options = this.parseDataOptions(element);
        
        if (animationType) {
          this.animate(element, animationType, options);
          
          // Dejar de observar si es animación única
          if (!element.dataset.animateRepeat) {
            this.intersectionObserver.unobserve(element);
          }
        }
      }
    });
  }
  
  parseDataOptions(element) {
    const options = {};
    
    if (element.dataset.animateDuration) {
      options.duration = parseInt(element.dataset.animateDuration);
    }
    
    if (element.dataset.animateDelay) {
      options.delay = parseInt(element.dataset.animateDelay);
    }
    
    if (element.dataset.animateEasing) {
      options.easing = element.dataset.animateEasing;
    }
    
    if (element.dataset.animateIterations) {
      options.iterations = element.dataset.animateIterations === 'infinite' 
        ? Infinity 
        : parseInt(element.dataset.animateIterations);
    }
    
    return options;
  }
  
  // Observar nuevo elemento
  observe(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
  }
  
  unobserve(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }
  
  // Manejadores de eventos
  handleAnimateEvent(event) {
    const { element, animation, options } = event.detail;
    this.animate(element, animation, options);
  }
  
  handleStopEvent(event) {
    const { animationId } = event.detail;
    const animationData = this.animations.get(animationId);
    if (animationData) {
      animationData.animation.cancel();
    }
  }
  
  handlePauseEvent(event) {
    const { animationId } = event.detail;
    const animationData = this.animations.get(animationId);
    if (animationData) {
      animationData.animation.pause();
    }
  }
  
  handleResumeEvent(event) {
    const { animationId } = event.detail;
    const animationData = this.animations.get(animationId);
    if (animationData) {
      animationData.animation.play();
    }
  }
  
  handleVisibilityChange() {
    if (document.hidden) {
      this.pauseAll();
    } else {
      this.resumeAll();
    }
  }
  
  // Monitoreo de rendimiento
  updatePerformanceMetrics(entry) {
    const duration = entry.duration;
    
    // Calcular promedio de duración
    const total = this.performanceMetrics.totalAnimations;
    const currentAvg = this.performanceMetrics.averageDuration;
    this.performanceMetrics.averageDuration = ((currentAvg * (total - 1)) + duration) / total;
    
    // Detectar frames perdidos (duración > 16ms indica posibles problemas)
    if (duration > 16) {
      this.performanceMetrics.droppedFrames++;
    }
  }
  
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      activeAnimations: this.activeAnimations.size,
      queuedAnimations: this.animationQueue.length,
      registeredPresets: this.presets.size
    };
  }
  
  // Utilidades
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  // Limpieza
  destroy() {
    console.log('🧹 Destruyendo Animation Controller...');
    
    // Cancelar todas las animaciones
    this.cancelAll();
    
    // Desconectar observadores
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    // Limpiar referencias
    this.animations.clear();
    this.presets.clear();
    this.timelines.clear();
    this.keyframes.clear();
    
    console.log('✅ Animation Controller destruido');
  }
}

// Clase wrapper para animaciones
class AnimationWrapper {
  constructor(animation, id, controller) {
    this.animation = animation;
    this.id = id;
    this.controller = controller;
  }
  
  play() {
    return this.animation.play();
  }
  
  pause() {
    return this.animation.pause();
  }
  
  cancel() {
    return this.animation.cancel();
  }
  
  finish() {
    return this.animation.finish();
  }
  
  reverse() {
    return this.animation.reverse();
  }
  
  get playState() {
    return this.animation.playState;
  }
  
  get ready() {
    return this.animation.ready;
  }
  
  get finished() {
    return this.animation.finished;
  }
  
  addEventListener(type, listener) {
    return this.animation.addEventListener(type, listener);
  }
  
  removeEventListener(type, listener) {
    return this.animation.removeEventListener(type, listener);
  }
}

// Clase para timeline de animaciones
class AnimationTimeline {
  constructor(controller) {
    this.controller = controller;
    this.animations = [];
    this.currentTime = 0;
  }
  
  add(element, animation, options = {}) {
    const animationConfig = {
      element,
      animation,
      options: {
        ...options,
        delay: (options.delay || 0) + this.currentTime
      }
    };
    
    this.animations.push(animationConfig);
    this.currentTime += options.duration || this.controller.options.defaultDuration;
    
    return this;
  }
  
  play() {
    return this.animations.map(config => 
      this.controller.animate(config.element, config.animation, config.options)
    );
  }
}

// Clase para secuencias de animaciones
class AnimationSequence {
  constructor(animations, controller) {
    this.animations = animations;
    this.controller = controller;
  }
  
  async play() {
    const results = [];
    
    for (const config of this.animations) {
      const animation = this.controller.animate(config.element, config.animation, config.options);
      await animation.finished;
      results.push(animation);
    }
    
    return results;
  }
}

// Clase para animaciones paralelas
class AnimationParallel {
  constructor(animations, controller) {
    this.animations = animations;
    this.controller = controller;
  }
  
  play() {
    return this.animations.map(config =>
      this.controller.animate(config.element, config.animation, config.options)
    );
  }
  
  async finished() {
    const animations = this.play();
    await Promise.all(animations.map(anim => anim.finished));
    return animations;
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.AnimationController = AnimationController;
}

export default AnimationController;