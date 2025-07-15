/* ==================================================
   RAMA 9: Progress Tracking Module
   Sistema de seguimiento del progreso del usuario
   ================================================== */

class ProgressTracking {
  constructor(options = {}) {
    this.options = {
      autoSave: true,
      animateProgress: true,
      showMilestones: true,
      enableAchievements: true,
      syncInterval: 30000, // 30 segundos
      ...options
    };
    
    this.userProgress = {
      currentChapter: 1,
      totalChapters: 12,
      completedChapters: [],
      readingTime: 0,
      startDate: null,
      lastActivity: null,
      achievements: [],
      milestones: []
    };
    
    this.sessionData = {
      startTime: Date.now(),
      actionsCount: 0,
      chaptersViewed: new Set(),
      timeSpent: 0
    };
    
    this.achievements = new Map();
    this.milestones = new Map();
    this.progressListeners = new Map();
    
    this.syncTimer = null;
    this.trackingActive = false;
    
    this.init();
  }
  
  init() {
    console.log('📊 Inicializando Progress Tracking...');
    
    this.setupAchievements();
    this.setupMilestones();
    this.loadUserProgress();
    this.setupEventListeners();
    this.startTracking();
    this.initializeUI();
    
    console.log('✅ Progress Tracking inicializado');
  }
  
  setupAchievements() {
    // Definir logros disponibles
    this.achievements.set('first_chapter', {
      id: 'first_chapter',
      title: 'Primer Paso',
      description: 'Completa tu primer capítulo',
      icon: '🎯',
      type: 'progress',
      condition: () => this.userProgress.completedChapters.length >= 1,
      points: 100
    });
    
    this.achievements.set('speed_reader', {
      id: 'speed_reader',
      title: 'Lector Veloz',
      description: 'Lee 3 capítulos en una sesión',
      icon: '⚡',
      type: 'session',
      condition: () => this.sessionData.chaptersViewed.size >= 3,
      points: 200
    });
    
    this.achievements.set('dedicated_reader', {
      id: 'dedicated_reader',
      title: 'Lector Dedicado',
      description: 'Pasa 30 minutos leyendo',
      icon: '📚',
      type: 'time',
      condition: () => this.userProgress.readingTime >= 1800000, // 30 min en ms
      points: 150
    });
    
    this.achievements.set('community_member', {
      id: 'community_member',
      title: 'Miembro de la Comunidad',
      description: 'Participa en discusiones comunitarias',
      icon: '👥',
      type: 'social',
      condition: () => this.sessionData.actionsCount >= 5,
      points: 120
    });
    
    this.achievements.set('completionist', {
      id: 'completionist',
      title: 'Completista',
      description: 'Completa toda la historia',
      icon: '🏆',
      type: 'completion',
      condition: () => this.userProgress.completedChapters.length === this.userProgress.totalChapters,
      points: 500
    });
  }
  
  setupMilestones() {
    // Definir hitos del progreso
    for (let i = 1; i <= this.userProgress.totalChapters; i++) {
      this.milestones.set(`chapter_${i}`, {
        id: `chapter_${i}`,
        chapter: i,
        title: `Capítulo ${i}`,
        description: `Completa el capítulo ${i}`,
        type: 'chapter',
        progress: 0,
        completed: false
      });
    }
    
    // Hitos especiales
    this.milestones.set('halfway', {
      id: 'halfway',
      title: 'A Mitad de Camino',
      description: 'Completa el 50% de la historia',
      type: 'percentage',
      target: 50,
      progress: 0,
      completed: false
    });
    
    this.milestones.set('final_stretch', {
      id: 'final_stretch',
      title: 'Recta Final',
      description: 'Completa el 90% de la historia',
      type: 'percentage',
      target: 90,
      progress: 0,
      completed: false
    });
  }
  
  setupEventListeners() {
    // Escuchar eventos de navegación
    document.addEventListener('navigation:change', this.handleNavigation.bind(this));
    
    // Escuchar eventos de capítulos
    document.addEventListener('chapter:start', this.handleChapterStart.bind(this));
    document.addEventListener('chapter:complete', this.handleChapterComplete.bind(this));
    document.addEventListener('chapter:navigate', this.handleChapterNavigate.bind(this));
    
    // Escuchar interacciones del usuario
    document.addEventListener('click', this.handleUserInteraction.bind(this));
    document.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Eventos de ventana
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('focus', this.handleWindowFocus.bind(this));
    window.addEventListener('blur', this.handleWindowBlur.bind(this));
    
    // Eventos de visibilidad de página
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
  
  loadUserProgress() {
    try {
      // Simular carga desde localStorage o API
      const savedProgress = this.getStoredProgress();
      
      if (savedProgress) {
        this.userProgress = { ...this.userProgress, ...savedProgress };
        
        // Convertir fechas
        if (this.userProgress.startDate) {
          this.userProgress.startDate = new Date(this.userProgress.startDate);
        }
        if (this.userProgress.lastActivity) {
          this.userProgress.lastActivity = new Date(this.userProgress.lastActivity);
        }
        
        console.log('📁 Progreso cargado:', this.userProgress);
      } else {
        // Primer uso, inicializar
        this.userProgress.startDate = new Date();
        this.saveProgress();
      }
      
      this.updateMilestonesFromProgress();
    } catch (error) {
      console.error('❌ Error cargando progreso:', error);
    }
  }
  
  startTracking() {
    this.trackingActive = true;
    this.sessionData.startTime = Date.now();
    
    // Iniciar timer de sincronización
    if (this.options.autoSave) {
      this.syncTimer = setInterval(() => {
        this.syncProgress();
      }, this.options.syncInterval);
    }
    
    // Actualizar tiempo de lectura cada segundo
    this.timeTracker = setInterval(() => {
      if (this.trackingActive && document.visibilityState === 'visible') {
        this.userProgress.readingTime += 1000;
        this.sessionData.timeSpent += 1000;
        this.updateTimeDisplay();
        this.checkAchievements();
      }
    }, 1000);
  }
  
  // Manejo de eventos
  handleNavigation(event) {
    const { route } = event.detail;
    this.recordUserAction('navigation', { route });
    
    if (route === 'story') {
      this.trackingActive = true;
    }
  }
  
  handleChapterStart(event) {
    const { chapterId } = event.detail;
    this.recordUserAction('chapter_start', { chapterId });
    
    console.log(`📖 Iniciando capítulo ${chapterId}`);
  }
  
  handleChapterComplete(event) {
    const { chapterId } = event.detail;
    this.completeChapter(parseInt(chapterId));
  }
  
  handleChapterNavigate(event) {
    const { chapterId } = event.detail;
    this.updateCurrentChapter(parseInt(chapterId));
    this.sessionData.chaptersViewed.add(chapterId);
  }
  
  handleUserInteraction(event) {
    this.recordUserAction('click', {
      element: event.target.tagName,
      className: event.target.className
    });
  }
  
  handleScroll() {
    // Throttle scroll events
    if (!this.scrollThrottle) {
      this.scrollThrottle = setTimeout(() => {
        this.recordUserAction('scroll');
        this.scrollThrottle = null;
      }, 1000);
    }
  }
  
  handleWindowFocus() {
    this.trackingActive = true;
    this.userProgress.lastActivity = new Date();
  }
  
  handleWindowBlur() {
    this.trackingActive = false;
    this.saveProgress();
  }
  
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      this.trackingActive = true;
    } else {
      this.trackingActive = false;
      this.saveProgress();
    }
  }
  
  handleBeforeUnload() {
    this.saveProgress();
  }
  
  // Métodos de progreso
  updateCurrentChapter(chapterNumber) {
    if (chapterNumber > this.userProgress.currentChapter) {
      this.userProgress.currentChapter = chapterNumber;
      this.emit('progress:chapter-updated', { chapter: chapterNumber });
    }
    
    this.updateProgressDisplay();
    this.saveProgress();
  }
  
  completeChapter(chapterNumber) {
    if (!this.userProgress.completedChapters.includes(chapterNumber)) {
      this.userProgress.completedChapters.push(chapterNumber);
      this.userProgress.completedChapters.sort((a, b) => a - b);
      
      // Actualizar milestone del capítulo
      const milestone = this.milestones.get(`chapter_${chapterNumber}`);
      if (milestone) {
        milestone.completed = true;
        milestone.progress = 100;
      }
      
      this.emit('progress:chapter-completed', { chapter: chapterNumber });
      this.checkAchievements();
      this.updateProgressDisplay();
      this.showCompletionAnimation(chapterNumber);
      
      console.log(`🎉 Capítulo ${chapterNumber} completado!`);
    }
  }
  
  getProgressPercentage() {
    return Math.round(
      (this.userProgress.completedChapters.length / this.userProgress.totalChapters) * 100
    );
  }
  
  updateProgressDisplay() {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-percentage');
    const chapterMarkers = document.querySelectorAll('.chapter-marker');
    
    const percentage = this.getProgressPercentage();
    
    // Actualizar barra de progreso
    if (progressBar && this.options.animateProgress) {
      this.animateProgressBar(progressBar, percentage);
    } else if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    
    // Actualizar texto de porcentaje
    if (progressText) {
      progressText.textContent = `${percentage}%`;
    }
    
    // Actualizar marcadores de capítulos
    chapterMarkers.forEach(marker => {
      const chapterNum = parseInt(marker.dataset.chapterId);
      
      marker.classList.remove('completed', 'current');
      
      if (this.userProgress.completedChapters.includes(chapterNum)) {
        marker.classList.add('completed');
      } else if (chapterNum === this.userProgress.currentChapter) {
        marker.classList.add('current');
      }
    });
    
    this.updateMilestoneProgress();
  }
  
  updateMilestoneProgress() {
    const percentage = this.getProgressPercentage();
    
    // Actualizar milestone de 50%
    const halfwayMilestone = this.milestones.get('halfway');
    if (halfwayMilestone && percentage >= 50 && !halfwayMilestone.completed) {
      halfwayMilestone.completed = true;
      halfwayMilestone.progress = 100;
      this.showMilestoneAchieved('halfway');
    }
    
    // Actualizar milestone de 90%
    const finalMilestone = this.milestones.get('final_stretch');
    if (finalMilestone && percentage >= 90 && !finalMilestone.completed) {
      finalMilestone.completed = true;
      finalMilestone.progress = 100;
      this.showMilestoneAchieved('final_stretch');
    }
  }
  
  // Sistema de logros
  checkAchievements() {
    for (const [achievementId, achievement] of this.achievements) {
      if (!this.userProgress.achievements.includes(achievementId)) {
        if (achievement.condition()) {
          this.unlockAchievement(achievementId);
        }
      }
    }
  }
  
  unlockAchievement(achievementId) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return;
    
    this.userProgress.achievements.push(achievementId);
    this.emit('achievement:unlocked', { achievement });
    this.showAchievementNotification(achievement);
    
    console.log(`🏆 Logro desbloqueado: ${achievement.title}`);
  }
  
  // Métodos de animación y UI
  animateProgressBar(progressBar, targetPercentage) {
    const currentWidth = parseFloat(progressBar.style.width) || 0;
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentPercentage = currentWidth + (targetPercentage - currentWidth) * easeOut;
      
      progressBar.style.width = `${currentPercentage}%`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  showCompletionAnimation(chapterNumber) {
    const marker = document.querySelector(`[data-chapter-id="${chapterNumber}"]`);
    if (marker) {
      marker.classList.add('completing');
      
      setTimeout(() => {
        marker.classList.remove('completing');
        marker.classList.add('completed');
      }, 300);
    }
    
    // Mostrar notificación de completado
    this.showNotification({
      type: 'success',
      title: 'Capítulo Completado',
      message: `¡Has completado el Capítulo ${chapterNumber}!`,
      icon: '🎉',
      duration: 3000
    });
  }
  
  showAchievementNotification(achievement) {
    this.showNotification({
      type: 'achievement',
      title: 'Logro Desbloqueado',
      message: `${achievement.icon} ${achievement.title}`,
      description: achievement.description,
      duration: 5000
    });
  }
  
  showMilestoneAchieved(milestoneId) {
    const milestone = this.milestones.get(milestoneId);
    if (milestone) {
      this.showNotification({
        type: 'milestone',
        title: 'Hito Alcanzado',
        message: milestone.title,
        description: milestone.description,
        icon: '🎯',
        duration: 4000
      });
    }
  }
  
  showNotification(options) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${options.type}`;
    notification.innerHTML = `
      <div class="notification-icon">${options.icon || '🔔'}</div>
      <div class="notification-content">
        <div class="notification-title">${options.title}</div>
        <div class="notification-message">${options.message}</div>
        ${options.description ? `<div class="notification-description">${options.description}</div>` : ''}
      </div>
      <button class="notification-close">×</button>
    `;
    
    // Agregar al contenedor de notificaciones
    let container = document.querySelector('.notifications-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notifications-container';
      document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);
    
    // Auto-remover
    if (options.duration) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, options.duration);
    }
    
    // Evento de cerrar
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.removeNotification(notification);
    });
  }
  
  removeNotification(notification) {
    notification.classList.add('notification-hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
  
  updateTimeDisplay() {
    const timeElement = document.querySelector('.reading-time');
    if (timeElement) {
      const hours = Math.floor(this.userProgress.readingTime / 3600000);
      const minutes = Math.floor((this.userProgress.readingTime % 3600000) / 60000);
      
      if (hours > 0) {
        timeElement.textContent = `${hours}h ${minutes}m`;
      } else {
        timeElement.textContent = `${minutes}m`;
      }
    }
  }
  
  initializeUI() {
    this.updateProgressDisplay();
    this.updateTimeDisplay();
    this.renderAchievements();
    this.renderMilestones();
  }
  
  renderAchievements() {
    const container = document.querySelector('.achievements-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (const [achievementId, achievement] of this.achievements) {
      const isUnlocked = this.userProgress.achievements.includes(achievementId);
      
      const achievementElement = document.createElement('div');
      achievementElement.className = `achievement ${isUnlocked ? 'unlocked' : 'locked'}`;
      achievementElement.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
          <div class="achievement-title">${achievement.title}</div>
          <div class="achievement-description">${achievement.description}</div>
          ${isUnlocked ? `<div class="achievement-points">${achievement.points} pts</div>` : ''}
        </div>
      `;
      
      container.appendChild(achievementElement);
    }
  }
  
  renderMilestones() {
    const container = document.querySelector('.milestones-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (const [milestoneId, milestone] of this.milestones) {
      const milestoneElement = document.createElement('div');
      milestoneElement.className = `milestone ${milestone.completed ? 'completed' : 'pending'}`;
      milestoneElement.innerHTML = `
        <div class="milestone-marker">
          <div class="milestone-progress" style="width: ${milestone.progress}%"></div>
        </div>
        <div class="milestone-info">
          <div class="milestone-title">${milestone.title}</div>
          <div class="milestone-description">${milestone.description}</div>
        </div>
      `;
      
      container.appendChild(milestoneElement);
    }
  }
  
  // Métodos de datos
  recordUserAction(action, data = {}) {
    this.sessionData.actionsCount++;
    this.userProgress.lastActivity = new Date();
    
    // Emitir evento para analytics
    this.emit('user:action', {
      action,
      data,
      timestamp: Date.now(),
      session: this.sessionData
    });
  }
  
  updateMilestonesFromProgress() {
    // Actualizar milestones basados en progreso cargado
    this.userProgress.completedChapters.forEach(chapterNum => {
      const milestone = this.milestones.get(`chapter_${chapterNum}`);
      if (milestone) {
        milestone.completed = true;
        milestone.progress = 100;
      }
    });
    
    const percentage = this.getProgressPercentage();
    
    if (percentage >= 50) {
      const milestone = this.milestones.get('halfway');
      if (milestone) {
        milestone.completed = true;
        milestone.progress = 100;
      }
    }
    
    if (percentage >= 90) {
      const milestone = this.milestones.get('final_stretch');
      if (milestone) {
        milestone.completed = true;
        milestone.progress = 100;
      }
    }
  }
  
  saveProgress() {
    try {
      this.userProgress.lastActivity = new Date();
      
      // Simular guardado en localStorage
      const progressData = JSON.stringify(this.userProgress);
      console.log('💾 Progreso guardado:', progressData.length, 'bytes');
      
      this.emit('progress:saved', { data: this.userProgress });
    } catch (error) {
      console.error('❌ Error guardando progreso:', error);
    }
  }
  
  syncProgress() {
    if (this.trackingActive) {
      this.saveProgress();
      this.emit('progress:synced');
    }
  }
  
  getStoredProgress() {
    try {
      // Simular carga desde localStorage
      // En implementación real, aquí se cargaría desde localStorage o API
      return null;
    } catch (error) {
      return null;
    }
  }
  
  // API pública
  getStats() {
    const percentage = this.getProgressPercentage();
    
    return {
      currentChapter: this.userProgress.currentChapter,
      totalChapters: this.userProgress.totalChapters,
      completedChapters: this.userProgress.completedChapters.length,
      progressPercentage: percentage,
      readingTime: this.userProgress.readingTime,
      achievements: this.userProgress.achievements.length,
      totalAchievements: this.achievements.size,
      sessionTime: this.sessionData.timeSpent,
      sessionActions: this.sessionData.actionsCount
    };
  }
  
  resetProgress() {
    if (confirm('¿Estás seguro de que quieres reiniciar todo el progreso?')) {
      this.userProgress = {
        currentChapter: 1,
        totalChapters: 12,
        completedChapters: [],
        readingTime: 0,
        startDate: new Date(),
        lastActivity: new Date(),
        achievements: [],
        milestones: []
      };
      
      this.saveProgress();
      this.updateProgressDisplay();
      this.renderAchievements();
      this.renderMilestones();
      
      console.log('🔄 Progreso reiniciado');
      this.emit('progress:reset');
    }
  }
  
  exportProgress() {
    const exportData = {
      ...this.userProgress,
      exportDate: new Date(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `rama9-progress-${Date.now()}.json`;
    link.click();
    
    console.log('📤 Progreso exportado');
  }
  
  // Sistema de eventos
  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  on(event, callback) {
    if (!this.progressListeners.has(event)) {
      this.progressListeners.set(event, []);
    }
    this.progressListeners.get(event).push(callback);
  }
  
  // Métodos de limpieza
  destroy() {
    this.trackingActive = false;
    
    // Limpiar timers
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    if (this.timeTracker) {
      clearInterval(this.timeTracker);
    }
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle);
    }
    
    // Guardar progreso final
    this.saveProgress();
    
    // Remover event listeners
    document.removeEventListener('navigation:change', this.handleNavigation);
    document.removeEventListener('chapter:start', this.handleChapterStart);
    document.removeEventListener('chapter:complete', this.handleChapterComplete);
    document.removeEventListener('chapter:navigate', this.handleChapterNavigate);
    document.removeEventListener('click', this.handleUserInteraction);
    document.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('focus', this.handleWindowFocus);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Limpiar referencias
    this.progressListeners.clear();
    
    console.log('🧹 Progress Tracking destruido');
  }
}

// Exportar para uso global
window.ProgressTracking = ProgressTracking;

export default ProgressTracking;