// Optimización para interacciones táctiles
class TouchOptimization {
  constructor() {
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.activeGestures = new Map();
    this.touchThreshold = 10;
    this.swipeThreshold = 100;
    this.longPressDelay = 500;
    
    this.init();
  }

  init() {
    if (!this.isTouchDevice) return;
    
    this.optimizeTouchTargets();
    this.setupGestureHandlers();
    this.improveTouchResponsiveness();
    this.setupHapticFeedback();
  }

  optimizeTouchTargets() {
    // Asegurar que todos los elementos interactivos tengan tamaño mínimo
    const minTouchSize = 44; // 44px recomendado por iOS HIG
    
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [onclick], .clickable'
    );

    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      
      if (rect.width < minTouchSize || rect.height < minTouchSize) {
        this.expandTouchTarget(element, minTouchSize);
      }
    });
  }

  expandTouchTarget(element, minSize) {
    const currentStyle = window.getComputedStyle(element);
    const currentPadding = {
      top: parseInt(currentStyle.paddingTop) || 0,
      right: parseInt(currentStyle.paddingRight) || 0,
      bottom: parseInt(currentStyle.paddingBottom) || 0,
      left: parseInt(currentStyle.paddingLeft) || 0
    };

    const rect = element.getBoundingClientRect();
    const extraWidth = Math.max(0, minSize - rect.width);
    const extraHeight = Math.max(0, minSize - rect.height);

    element.style.paddingTop = `${currentPadding.top + extraHeight / 2}px`;
    element.style.paddingBottom = `${currentPadding.bottom + extraHeight / 2}px`;
    element.style.paddingLeft = `${currentPadding.left + extraWidth / 2}px`;
    element.style.paddingRight = `${currentPadding.right + extraWidth / 2}px`;
    
    // Marcar como optimizado
    element.dataset.touchOptimized = 'true';
  }

  setupGestureHandlers() {
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    document.addEventListener('touchcancel', (e) => this.handleTouchCancel(e));
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    const element = e.target;
    
    const gestureData = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      element: element,
      moved: false,
      longPressTimer: null
    };

    this.activeGestures.set(touch.identifier, gestureData);

    // Configurar long press
    gestureData.longPressTimer = setTimeout(() => {
      this.handleLongPress(gestureData);
    }, this.longPressDelay);

    // Agregar clase de estado activo
    element.classList.add('touch-active');
    
    // Feedback visual inmediato
    this.addTouchFeedback(element, touch.clientX, touch.clientY);
  }

  handleTouchMove(e) {
    Array.from(e.changedTouches).forEach(touch => {
      const gestureData = this.activeGestures.get(touch.identifier);
      if (!gestureData) return;

      const deltaX = touch.clientX - gestureData.startX;
      const deltaY = touch.clientY - gestureData.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > this.touchThreshold) {
        gestureData.moved = true;
        
        // Cancelar long press si se mueve
        if (gestureData.longPressTimer) {
          clearTimeout(gestureData.longPressTimer);
          gestureData.longPressTimer = null;
        }

        // Remover estado activo si se mueve fuera del elemento
        const elementAtTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        if (elementAtTouch !== gestureData.element) {
          gestureData.element.classList.remove('touch-active');
        }

        // Detectar gestos de swipe
        this.detectSwipeGesture(gestureData, deltaX, deltaY);
      }
    });
  }

  handleTouchEnd(e) {
    Array.from(e.changedTouches).forEach(touch => {
      const gestureData = this.activeGestures.get(touch.identifier);
      if (!gestureData) return;

      // Limpiar timer de long press
      if (gestureData.longPressTimer) {
        clearTimeout(gestureData.longPressTimer);
      }

      // Remover estado activo
      gestureData.element.classList.remove('touch-active');

      // Si no se movió, considerar como tap
      if (!gestureData.moved) {
        this.handleTap(gestureData);
      }

      this.activeGestures.delete(touch.identifier);
    });
  }

  handleTouchCancel(e) {
    Array.from(e.changedTouches).forEach(touch => {
      const gestureData = this.activeGestures.get(touch.identifier);
      if (!gestureData) return;

      if (gestureData.longPressTimer) {
        clearTimeout(gestureData.longPressTimer);
      }

      gestureData.element.classList.remove('touch-active');
      this.activeGestures.delete(touch.identifier);
    });
  }

  handleTap(gestureData) {
    const { element, startTime } = gestureData;
    const duration = Date.now() - startTime;

    // Tap rápido - feedback inmediato
    if (duration < 200) {
      this.triggerHapticFeedback('light');
    }

    // Dispatchar evento personalizado
    const tapEvent = new CustomEvent('optimizedTap', {
      detail: { element, duration },
      bubbles: true
    });
    
    element.dispatchEvent(tapEvent);
  }

  handleLongPress(gestureData) {
    const { element } = gestureData;
    
    this.triggerHapticFeedback('medium');
    
    const longPressEvent = new CustomEvent('optimizedLongPress', {
      detail: { element },
      bubbles: true
    });
    
    element.dispatchEvent(longPressEvent);
    element.classList.add('long-pressed');
    
    setTimeout(() => {
      element.classList.remove('long-pressed');
    }, 200);
  }

  detectSwipeGesture(gestureData, deltaX, deltaY) {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    if (absX > this.swipeThreshold || absY > this.swipeThreshold) {
      let direction;
      
      if (absX > absY) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      const swipeEvent = new CustomEvent('optimizedSwipe', {
        detail: {
          direction,
          deltaX,
          deltaY,
          element: gestureData.element
        },
        bubbles: true
      });
      
      gestureData.element.dispatchEvent(swipeEvent);
    }
  }

  addTouchFeedback(element, x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      pointer-events: none;
      z-index: 1000;
      width: ${size}px;
      height: ${size}px;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      transform: scale(0);
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
    `;
    
    document.body.appendChild(ripple);
    
    // Animar ripple
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(1)';
      ripple.style.opacity = '0';
    });
    
    // Remover después de la animación
    setTimeout(() => {
      ripple.remove();
    }, 300);
  }

  improveTouchResponsiveness() {
    // Reducir delay de click en iOS
    document.addEventListener('touchend', (e) => {
      if (e.target.matches('a, button, input, select, textarea, [role="button"]')) {
        e.preventDefault();
        e.target.click();
      }
    });

    // Mejorar scroll momentum en iOS
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // Prevenir zoom accidental
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    });
  }

  setupHapticFeedback() {
    // Solo si el dispositivo soporta vibración
    if (!navigator.vibrate) return;

    // Configurar patrones de vibración
    this.hapticPatterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      double: [10, 50, 10],
      success: [10, 100, 10],
      error: [100, 100, 100]
    };
  }

  triggerHapticFeedback(type = 'light') {
    if (!navigator.vibrate || !this.hapticPatterns[type]) return;
    
    // Respetar preferencias del usuario
    if (this.isReducedMotionPreferred()) return;
    
    navigator.vibrate(this.hapticPatterns[type]);
  }

  isReducedMotionPreferred() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Optimizaciones específicas para elementos
  optimizeScrollableElements() {
    const scrollableElements = document.querySelectorAll('.scrollable, .overflow-auto, .overflow-scroll');
    
    scrollableElements.forEach(element => {
      element.style.webkitOverflowScrolling = 'touch';
      element.style.scrollBehavior = 'smooth';
      
      // Prevenir bounce en el contenedor padre
      element.addEventListener('touchstart', () => {
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const height = element.clientHeight;
        
        if (scrollTop === 0) {
          element.scrollTop = 1;
        } else if (scrollTop + height === scrollHeight) {
          element.scrollTop = scrollTop - 1;
        }
      });
    });
  }

  optimizeFormElements() {
    const formElements = document.querySelectorAll('input, textarea, select');
    
    formElements.forEach(element => {
      // Mejorar experiencia de teclado móvil
      if (element.type === 'email') {
        element.setAttribute('inputmode', 'email');
      } else if (element.type === 'tel') {
        element.setAttribute('inputmode', 'tel');
      } else if (element.type === 'number') {
        element.setAttribute('inputmode', 'numeric');
      }
      
      // Prevenir zoom en iOS
      if (parseFloat(window.getComputedStyle(element).fontSize) < 16) {
        element.style.fontSize = '16px';
      }
      
      // Mejorar el comportamiento del teclado
      element.addEventListener('focus', () => {
        if (this.isMobileSafari()) {
          setTimeout(() => {
            element.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }, 300);
        }
      });
    });
  }

  isMobileSafari() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  // Gestos avanzados
  enablePullToRefresh(element, callback) {
    let startY = 0;
    let currentY = 0;
    let pullDistance = 0;
    const threshold = 80;
    
    element.addEventListener('touchstart', (e) => {
      if (element.scrollTop === 0) {
        startY = e.touches[0].clientY;
      }
    });
    
    element.addEventListener('touchmove', (e) => {
      if (startY === 0) return;
      
      currentY = e.touches[0].clientY;
      pullDistance = currentY - startY;
      
      if (pullDistance > 0 && element.scrollTop === 0) {
        e.preventDefault();
        
        // Feedback visual
        const opacity = Math.min(pullDistance / threshold, 1);
        element.style.transform = `translateY(${pullDistance * 0.5}px)`;
        element.style.opacity = 1 - opacity * 0.3;
        
        if (pullDistance > threshold) {
          this.triggerHapticFeedback('medium');
        }
      }
    });
    
    element.addEventListener('touchend', () => {
      if (pullDistance > threshold) {
        callback();
      }
      
      // Reset
      element.style.transform = '';
      element.style.opacity = '';
      startY = 0;
      pullDistance = 0;
    });
  }

  enableSwipeToDelete(element, callback) {
    let startX = 0;
    let currentX = 0;
    let swipeDistance = 0;
    const threshold = 120;
    
    element.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });
    
    element.addEventListener('touchmove', (e) => {
      currentX = e.touches[0].clientX;
      swipeDistance = startX - currentX;
      
      if (swipeDistance > 0) {
        e.preventDefault();
        
        // Mover elemento
        element.style.transform = `translateX(-${Math.min(swipeDistance, threshold + 50)}px)`;
        
        // Mostrar botón de eliminar
        if (swipeDistance > threshold) {
          element.classList.add('swipe-delete-active');
          this.triggerHapticFeedback('light');
        } else {
          element.classList.remove('swipe-delete-active');
        }
      }
    });
    
    element.addEventListener('touchend', () => {
      if (swipeDistance > threshold) {
        // Confirmar eliminación
        element.style.transform = `translateX(-100%)`;
        setTimeout(() => callback(element), 300);
      } else {
        // Restaurar posición
        element.style.transform = '';
        element.classList.remove('swipe-delete-active');
      }
      
      startX = 0;
      swipeDistance = 0;
    });
  }

  // Métodos públicos para configuración
  setTouchThreshold(threshold) {
    this.touchThreshold = threshold;
  }

  setSwipeThreshold(threshold) {
    this.swipeThreshold = threshold;
  }

  setLongPressDelay(delay) {
    this.longPressDelay = delay;
  }

  // Limpiar optimizaciones
  cleanup() {
    // Remover todos los event listeners
    this.activeGestures.clear();
    
    // Remover clases añadidas
    const optimizedElements = document.querySelectorAll('[data-touch-optimized]');
    optimizedElements.forEach(element => {
      delete element.dataset.touchOptimized;
    });
  }

  // Utilidades para desarrolladores
  debugTouch() {
    if (!this.isTouchDevice) {
      console.log('No es un dispositivo táctil');
      return;
    }

    console.log('Información del dispositivo táctil:', {
      maxTouchPoints: navigator.maxTouchPoints,
      touchSupport: 'ontouchstart' in window,
      gesturesActive: this.activeGestures.size,
      hapticSupport: !!navigator.vibrate
    });
  }

  getGestureInfo() {
    return {
      activeGestures: this.activeGestures.size,
      isTouchDevice: this.isTouchDevice,
      thresholds: {
        touch: this.touchThreshold,
        swipe: this.swipeThreshold,
        longPress: this.longPressDelay
      }
    };
  }
}

// Clase para gestos específicos de la aplicación
class AppGestures extends TouchOptimization {
  constructor() {
    super();
    this.setupAppSpecificGestures();
  }

  setupAppSpecificGestures() {
    // Swipe para navegación entre posts
    this.setupPostNavigation();
    
    // Pull to refresh en feeds
    this.setupFeedRefresh();
    
    // Long press para opciones
    this.setupContextMenus();
    
    // Pinch to zoom en imágenes
    this.setupImageZoom();
  }

  setupPostNavigation() {
    const postContainers = document.querySelectorAll('.post-card, .content-card');
    
    postContainers.forEach(post => {
      post.addEventListener('optimizedSwipe', (e) => {
        const { direction } = e.detail;
        
        if (direction === 'left') {
          this.navigateToNextPost(post);
        } else if (direction === 'right') {
          this.navigateToPreviousPost(post);
        }
      });
    });
  }

  setupFeedRefresh() {
    const feedContainers = document.querySelectorAll('.community-posts, .dashboard-widgets');
    
    feedContainers.forEach(feed => {
      this.enablePullToRefresh(feed, () => {
        this.refreshFeed(feed);
      });
    });
  }

  setupContextMenus() {
    const actionableElements = document.querySelectorAll('.post-card, .user-item, .widget');
    
    actionableElements.forEach(element => {
      element.addEventListener('optimizedLongPress', (e) => {
        this.showContextMenu(e.detail.element);
      });
    });
  }

  setupImageZoom() {
    const images = document.querySelectorAll('.post-image, .gallery-image');
    
    images.forEach(image => {
      let scale = 1;
      let initialDistance = 0;
      
      image.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          initialDistance = this.getDistance(e.touches[0], e.touches[1]);
        }
      });
      
      image.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          
          const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
          const deltaScale = currentDistance / initialDistance;
          scale = Math.min(Math.max(0.5, scale * deltaScale), 3);
          
          image.style.transform = `scale(${scale})`;
          initialDistance = currentDistance;
        }
      });
      
      image.addEventListener('touchend', () => {
        if (scale < 1) {
          scale = 1;
          image.style.transform = '';
        }
      });
    });
  }

  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  navigateToNextPost(currentPost) {
    const nextPost = currentPost.nextElementSibling;
    if (nextPost) {
      nextPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.triggerHapticFeedback('light');
    }
  }

  navigateToPreviousPost(currentPost) {
    const prevPost = currentPost.previousElementSibling;
    if (prevPost) {
      prevPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.triggerHapticFeedback('light');
    }
  }

  refreshFeed(feed) {
    // Mostrar indicador de carga
    this.showRefreshIndicator(feed);
    
    // Simular refresh (reemplazar con lógica real)
    setTimeout(() => {
      this.hideRefreshIndicator(feed);
      this.triggerHapticFeedback('success');
      
      // Disparar evento personalizado
      feed.dispatchEvent(new CustomEvent('feed-refreshed'));
    }, 1500);
  }

  showRefreshIndicator(feed) {
    const indicator = document.createElement('div');
    indicator.className = 'refresh-indicator';
    indicator.innerHTML = `
      <div class="refresh-spinner"></div>
      <span>Actualizando...</span>
    `;
    indicator.style.cssText = `
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 12px 20px;
      border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #64748b;
      z-index: 1000;
    `;
    
    feed.style.position = 'relative';
    feed.appendChild(indicator);
    
    setTimeout(() => {
      indicator.style.top = '20px';
    }, 100);
  }

  hideRefreshIndicator(feed) {
    const indicator = feed.querySelector('.refresh-indicator');
    if (indicator) {
      indicator.style.top = '-60px';
      setTimeout(() => indicator.remove(), 300);
    }
  }

  showContextMenu(element) {
    // Remover menús existentes
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <div class="context-menu-item" data-action="share">Compartir</div>
      <div class="context-menu-item" data-action="save">Guardar</div>
      <div class="context-menu-item" data-action="report">Reportar</div>
      <div class="context-menu-item" data-action="hide">Ocultar</div>
    `;
    
    menu.style.cssText = `
      position: fixed;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      padding: 8px 0;
      min-width: 150px;
      transform: scale(0.8);
      opacity: 0;
      transition: all 0.2s ease;
    `;
    
    document.body.appendChild(menu);
    
    // Posicionar cerca del elemento
    const rect = element.getBoundingClientRect();
    menu.style.left = `${rect.left + rect.width / 2 - menu.offsetWidth / 2}px`;
    menu.style.top = `${rect.bottom + 10}px`;
    
    // Animar entrada
    setTimeout(() => {
      menu.style.transform = 'scale(1)';
      menu.style.opacity = '1';
    }, 10);
    
    // Event listeners para las opciones
    menu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextAction(action, element);
        menu.remove();
      }
    });
    
    // Cerrar al tocar fuera
    setTimeout(() => {
      document.addEventListener('touchstart', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('touchstart', closeMenu);
        }
      });
    }, 100);
  }

  handleContextAction(action, element) {
    console.log(`Acción ${action} en elemento:`, element);
    this.triggerHapticFeedback('light');
    
    // Disparar evento personalizado
    element.dispatchEvent(new CustomEvent('contextAction', {
      detail: { action, element }
    }));
  }
}

// Inicialización automática
const touchOptimization = new TouchOptimization();
const appGestures = new AppGestures();

// CSS adicional para efectos táctiles
const touchStyles = document.createElement('style');
touchStyles.textContent = `
  .touch-active {
    background-color: rgba(0, 0, 0, 0.05) !important;
    transform: scale(0.98);
    transition: all 0.1s ease;
  }

  .long-pressed {
    transform: scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .swipe-delete-active {
    background: #fee2e2;
  }

  .refresh-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .context-menu-item {
    padding: 12px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #374151;
    transition: background-color 0.2s ease;
  }

  .context-menu-item:hover {
    background-color: #f3f4f6;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(touchStyles);

export { touchOptimization, appGestures, TouchOptimization, AppGestures };
export default touchOptimization;