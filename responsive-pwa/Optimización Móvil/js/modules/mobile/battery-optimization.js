// Optimización específica de batería
class BatteryOptimization {
  constructor() {
    this.battery = null;
    this.batteryLevel = 1;
    this.isCharging = true;
    this.dischargingTime = Infinity;
    this.chargingTime = Infinity;
    this.powerSavingMode = false;
    this.listeners = new Map();
    this.batteryThresholds = {
      critical: 0.15, // 15%
      low: 0.30,      // 30%
      normal: 0.50    // 50%
    };
    
    this.init();
  }

  async init() {
    await this.initBatteryAPI();
    this.setupBatteryListeners();
    this.setupPerformanceOptimizations();
    this.checkInitialBatteryState();
  }

  async initBatteryAPI() {
    if ('getBattery' in navigator) {
      try {
        this.battery = await navigator.getBattery();
        this.batteryLevel = this.battery.level;
        this.isCharging = this.battery.charging;
        this.dischargingTime = this.battery.dischargingTime;
        this.chargingTime = this.battery.chargingTime;
        
        console.log('Battery API inicializada:', {
          level: Math.round(this.batteryLevel * 100) + '%',
          charging: this.isCharging,
          dischargingTime: this.formatTime(this.dischargingTime),
          chargingTime: this.formatTime(this.chargingTime)
        });
      } catch (error) {
        console.warn('Battery API no disponible:', error);
        this.fallbackBatteryDetection();
      }
    } else {
      console.warn('Battery API no soportada en este navegador');
      this.fallbackBatteryDetection();
    }
  }

  fallbackBatteryDetection() {
    // Detección alternativa basada en características del dispositivo
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      // Asumir batería baja en conexiones lentas para móviles
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        this.batteryLevel = 0.25; // Simular batería baja
        this.enablePowerSavingMode();
      }
    }
    
    // Detectar si es un dispositivo móvil sin cargador
    if (this.isMobileDevice() && !this.isCharging) {
      this.batteryLevel = 0.6; // Valor conservador
    }
  }

  setupBatteryListeners() {
    if (!this.battery) return;

    // Listener para cambios en el nivel de batería
    this.battery.addEventListener('levelchange', () => {
      const oldLevel = this.batteryLevel;
      this.batteryLevel = this.battery.level;
      
      this.handleBatteryLevelChange(oldLevel, this.batteryLevel);
      this.notifyBatteryListeners('levelchange', {
        oldLevel,
        newLevel: this.batteryLevel,
        percentage: Math.round(this.batteryLevel * 100)
      });
    });

    // Listener para cambios en el estado de carga
    this.battery.addEventListener('chargingchange', () => {
      const oldCharging = this.isCharging;
      this.isCharging = this.battery.charging;
      
      this.handleChargingStateChange(oldCharging, this.isCharging);
      this.notifyBatteryListeners('chargingchange', {
        oldCharging,
        newCharging: this.isCharging
      });
    });

    // Listener para tiempo de descarga
    this.battery.addEventListener('dischargingtimechange', () => {
      this.dischargingTime = this.battery.dischargingTime;
      this.handleDischargingTimeChange();
    });

    // Listener para tiempo de carga
    this.battery.addEventListener('chargingtimechange', () => {
      this.chargingTime = this.battery.chargingTime;
      this.handleChargingTimeChange();
    });
  }

  handleBatteryLevelChange(oldLevel, newLevel) {
    console.log(`Batería cambió de ${Math.round(oldLevel * 100)}% a ${Math.round(newLevel * 100)}%`);
    
    // Determinar el nuevo estado de batería
    const oldState = this.getBatteryState(oldLevel);
    const newState = this.getBatteryState(newLevel);
    
    if (oldState !== newState) {
      this.handleBatteryStateChange(newState);
    }
    
    this.updateBatteryIndicator();
  }

  handleChargingStateChange(oldCharging, newCharging) {
    console.log(`Estado de carga cambió: ${newCharging ? 'Cargando' : 'Descargando'}`);
    
    if (newCharging) {
      this.handleChargingStarted();
    } else {
      this.handleChargingstopped();
    }
    
    this.updateBatteryIndicator();
  }

  handleDischargingTimeChange() {
    if (this.dischargingTime < 3600) { // Menos de 1 hora
      this.enableAggressivePowerSaving();
    }
  }

  handleChargingTimeChange() {
    if (this.chargingTime < 1800) { // Menos de 30 minutos para cargar
      this.optimizeForFastCharging();
    }
  }

  getBatteryState(level) {
    if (level <= this.batteryThresholds.critical) return 'critical';
    if (level <= this.batteryThresholds.low) return 'low';
    if (level <= this.batteryThresholds.normal) return 'normal';
    return 'high';
  }

  handleBatteryStateChange(state) {
    switch (state) {
      case 'critical':
        this.enableCriticalPowerSaving();
        this.showBatteryWarning('critical');
        break;
      case 'low':
        this.enableAggressivePowerSaving();
        this.showBatteryWarning('low');
        break;
      case 'normal':
        this.enableModeratePowerSaving();
        break;
      case 'high':
        this.disablePowerSaving();
        break;
    }
  }

  enableCriticalPowerSaving() {
    console.log('🔴 Modo crítico de batería activado');
    this.powerSavingMode = 'critical';
    document.body.classList.add('battery-critical');
    
    // Optimizaciones extremas
    this.disableAllAnimations();
    this.reduceScreenBrightness();
    this.disableBackgroundProcesses();
    this.enableUltraMinimalUI();
    this.pauseNonEssentialFeatures();
    
    this.showPowerSavingNotification('critical');
  }

  enableAggressivePowerSaving() {
    console.log('🟡 Modo agresivo de ahorro de batería activado');
    this.powerSavingMode = 'aggressive';
    document.body.classList.add('battery-low');
    
    // Optimizaciones agresivas
    this.reduceAnimationFrequency();
    this.disableHeavyEffects();
    this.reduceUpdateFrequency();
    this.enableMinimalUI();
    
    this.showPowerSavingNotification('aggressive');
  }

  enableModeratePowerSaving() {
    console.log('🟠 Modo moderado de ahorro de batería activado');
    this.powerSavingMode = 'moderate';
    document.body.classList.add('battery-saving');
    
    // Optimizaciones moderadas
    this.reduceNonEssentialAnimations();
    this.optimizeImageLoading();
    this.reduceNetworkRequests();
    
    this.showPowerSavingNotification('moderate');
  }

  disablePowerSaving() {
    console.log('🟢 Modo normal de batería restaurado');
    this.powerSavingMode = false;
    document.body.classList.remove('battery-critical', 'battery-low', 'battery-saving');
    
    // Restaurar funcionalidades
    this.restoreAnimations();
    this.restoreEffects();
    this.restoreUpdateFrequency();
    this.restoreFullUI();
  }

  // Optimizaciones específicas
  disableAllAnimations() {
    const style = document.createElement('style');
    style.id = 'battery-critical-animations';
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  reduceAnimationFrequency() {
    const animations = document.querySelectorAll('[style*="animation"], .animated');
    animations.forEach(el => {
      el.style.animationDuration = '2s';
      el.style.animationIterationCount = '1';
    });
  }

  reduceNonEssentialAnimations() {
    const nonEssential = document.querySelectorAll('.decoration-animation, .hover-effect, .parallax');
    nonEssential.forEach(el => {
      el.style.animationPlayState = 'paused';
    });
  }

  disableHeavyEffects() {
    const style = document.createElement('style');
    style.id = 'battery-low-effects';
    style.textContent = `
      .battery-low * {
        filter: none !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        text-shadow: none !important;
        transform: none !important;
      }
      
      .battery-low .gradient {
        background: #2563eb !important;
      }
      
      .battery-low .blur {
        backdrop-filter: none !important;
        background: #f3f4f6 !important;
      }
    `;
    document.head.appendChild(style);
  }

  reduceScreenBrightness() {
    // Simular reducción de brillo con overlay
    if (!document.querySelector('.battery-brightness-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'battery-brightness-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.2);
        pointer-events: none;
        z-index: 9999;
      `;
      document.body.appendChild(overlay);
    }
  }

  disableBackgroundProcesses() {
    // Pausar timers no esenciales
    clearInterval(window.batteryAutoRefresh);
    clearInterval(window.batteryPeriodicSync);
    
    // Pausar Web Workers si existen
    if (window.backgroundWorker) {
      window.backgroundWorker.postMessage({ type: 'pause' });
    }
  }

  enableUltraMinimalUI() {
    const nonEssential = document.querySelectorAll(
      '.sidebar-widget:not(.essential), .decoration, .avatar, .thumbnail, .badge:not(.important)'
    );
    
    nonEssential.forEach(el => {
      el.style.display = 'none';
      el.dataset.hiddenByBattery = 'true';
    });
  }

  pauseNonEssentialFeatures() {
    // Pausar lazy loading agresivo
    const lazyElements = document.querySelectorAll('[data-lazy]:not([data-essential])');
    lazyElements.forEach(el => {
      el.style.display = 'none';
    });
    
    // Pausar auto-refresh
    window.dispatchEvent(new CustomEvent('battery-pause-refresh'));
  }

  optimizeImageLoading() {
    const images = document.querySelectorAll('img:not([data-optimized])');
    images.forEach(img => {
      if (img.src && !img.dataset.essential) {
        const url = new URL(img.src);
        url.searchParams.set('quality', '30');
        url.searchParams.set('format', 'webp');
        img.src = url.toString();
        img.dataset.optimized = 'true';
      }
    });
  }

  reduceNetworkRequests() {
    // Aumentar intervalos de sync
    window.dispatchEvent(new CustomEvent('battery-reduce-network', {
      detail: { multiplier: 3 }
    }));
  }

  reduceUpdateFrequency() {
    // Reducir frecuencia de actualizaciones de UI
    window.dispatchEvent(new CustomEvent('battery-reduce-updates', {
      detail: { interval: 5000 }
    }));
  }

  handleChargingStarted() {
    this.showChargingNotification();
    
    // Esperar un poco antes de restaurar para evitar fluctuaciones
    setTimeout(() => {
      if (this.isCharging) {
        this.graduallyRestoreFeatures();
      }
    }, 5000);
  }

  handleChargingstopped() {
    this.showDischargingNotification();
    this.adaptToBatteryLevel();
  }

  graduallyRestoreFeatures() {
    if (this.batteryLevel > this.batteryThresholds.normal) {
      this.disablePowerSaving();
    } else {
      this.enableModeratePowerSaving();
    }
  }

  // Restaurar funcionalidades
  restoreAnimations() {
    const style = document.getElementById('battery-critical-animations');
    if (style) style.remove();
    
    const animations = document.querySelectorAll('.animated');
    animations.forEach(el => {
      el.style.animationPlayState = 'running';
    });
  }

  restoreEffects() {
    const style = document.getElementById('battery-low-effects');
    if (style) style.remove();
  }

  restoreUpdateFrequency() {
    window.dispatchEvent(new CustomEvent('battery-restore-updates'));
  }

  restoreFullUI() {
    const hidden = document.querySelectorAll('[data-hidden-by-battery="true"]');
    hidden.forEach(el => {
      el.style.display = '';
      delete el.dataset.hiddenByBattery;
    });
    
    const overlay = document.querySelector('.battery-brightness-overlay');
    if (overlay) overlay.remove();
  }

  // Notificaciones
  showBatteryWarning(level) {
    const messages = {
      critical: {
        title: '⚠️ Batería Crítica',
        message: 'Batería muy baja. Modo de emergencia activado.',
        color: '#dc2626'
      },
      low: {
        title: '🔋 Batería Baja',
        message: 'Activando modo de ahorro de energía.',
        color: '#f59e0b'
      }
    };
    
    const config = messages[level];
    if (config) {
      this.showNotification(config.title, config.message, config.color);
    }
  }

  showPowerSavingNotification(mode) {
    const messages = {
      critical: 'Modo crítico: Funciones mínimas activadas',
      aggressive: 'Ahorro agresivo: Reduciendo consumo de energía',
      moderate: 'Ahorro moderado: Optimizando rendimiento'
    };
    
    this.showNotification('🔋 Ahorro de Batería', messages[mode], '#3b82f6');
  }

  showChargingNotification() {
    this.showNotification('🔌 Cargando', 'Dispositivo conectado a la energía', '#10b981');
  }

  showDischargingNotification() {
    this.showNotification('🔋 Desconectado', 'Funcionando con batería', '#f59e0b');
  }

  showNotification(title, message, color) {
    const notification = document.createElement('div');
    notification.className = 'battery-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 300px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  updateBatteryIndicator() {
    let indicator = document.querySelector('.battery-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'battery-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 6px;
      `;
      document.body.appendChild(indicator);
    }
    
    const percentage = Math.round(this.batteryLevel * 100);
    const chargingIcon = this.isCharging ? '🔌' : '🔋';
    const batteryIcon = this.getBatteryIcon(percentage);
    
    indicator.innerHTML = `
      ${chargingIcon} ${batteryIcon} ${percentage}%
      ${this.powerSavingMode ? ' ⚡' : ''}
    `;
  }

  getBatteryIcon(percentage) {
    if (percentage > 75) return '█';
    if (percentage > 50) return '▇';
    if (percentage > 25) return '▅';
    if (percentage > 10) return '▃';
    return '▁';
  }

  checkInitialBatteryState() {
    this.adaptToBatteryLevel();
    this.updateBatteryIndicator();
  }

  adaptToBatteryLevel() {
    const state = this.getBatteryState(this.batteryLevel);
    
    if (!this.isCharging) {
      this.handleBatteryStateChange(state);
    }
  }

  optimizeForFastCharging() {
    // Reducir carga de CPU durante carga rápida
    this.enableModeratePowerSaving();
  }

  isMobileDevice() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  formatTime(seconds) {
    if (!isFinite(seconds)) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // API pública
  onBatteryChange(callback, id = null) {
    const listenerId = id || `battery_${Date.now()}_${Math.random()}`;
    this.listeners.set(listenerId, callback);
    
    // Ejecutar inmediatamente con estado actual
    callback({
      level: this.batteryLevel,
      charging: this.isCharging,
      powerSavingMode: this.powerSavingMode,
      state: this.getBatteryState(this.batteryLevel)
    });
    
    return listenerId;
  }

  removeBatteryListener(id) {
    return this.listeners.delete(id);
  }

  notifyBatteryListeners(event, data) {
    this.listeners.forEach((callback, id) => {
      try {
        callback({
          event,
          ...data,
          level: this.batteryLevel,
          charging: this.isCharging,
          powerSavingMode: this.powerSavingMode,
          state: this.getBatteryState(this.batteryLevel)
        });
      } catch (error) {
        console.warn(`Error en listener de batería ${id}:`, error);
      }
    });
  }

  getBatteryInfo() {
    return {
      level: this.batteryLevel,
      percentage: Math.round(this.batteryLevel * 100),
      charging: this.isCharging,
      dischargingTime: this.dischargingTime,
      chargingTime: this.chargingTime,
      powerSavingMode: this.powerSavingMode,
      state: this.getBatteryState(this.batteryLevel),
      supported: !!this.battery
    };
  }

  forcePowerSaving(mode = 'moderate') {
    this.handleBatteryStateChange(mode);
  }

  forceNormalMode() {
    this.disablePowerSaving();
  }

  setBatteryThresholds(thresholds) {
    this.batteryThresholds = { ...this.batteryThresholds, ...thresholds };
  }

  destroy() {
    this.listeners.clear();
    
    if (this.battery) {
      this.battery.removeEventListener('levelchange', this.handleBatteryLevelChange);
      this.battery.removeEventListener('chargingchange', this.handleChargingStateChange);
      this.battery.removeEventListener('dischargingtimechange', this.handleDischargingTimeChange);
      this.battery.removeEventListener('chargingtimechange', this.handleChargingTimeChange);
    }
    
    this.restoreFullUI();
    this.restoreAnimations();
    this.restoreEffects();
    
    const indicator = document.querySelector('.battery-indicator');
    if (indicator) indicator.remove();
  }
}

// Instancia global
const batteryOptimization = new BatteryOptimization();

// CSS para optimizaciones de batería
const batteryStyles = document.createElement('style');
batteryStyles.textContent = `
  /* Modos de ahorro de batería */
  .battery-critical * {
    animation: none !important;
    transition: none !important;
    transform: none !important;
    filter: none !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
  }
  
  .battery-low .heavy-effect {
    display: none !important;
  }
  
  .battery-saving .non-essential {
    opacity: 0.7;
  }
  
  .battery-saving .animation {
    animation-duration: 2s !important;
  }
  
  /* Indicador de batería */
  .battery-indicator {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-variant-numeric: tabular-nums;
  }
  
  /* Notificaciones de batería */
  .battery-notification {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .notification-title {
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .notification-message {
    font-size: 14px;
    opacity: 0.9;
  }
`;
document.head.appendChild(batteryStyles);

export { batteryOptimization, BatteryOptimization };
export default batteryOptimization;