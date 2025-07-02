/**
 * Community Stories Platform - Story Loader
 * Cargador y gestor de historias inmersivas estilo "The Boat"
 */

class StoryLoader {
  constructor() {
    this.stories = new Map();
    this.activeStory = null;
    this.loadingStates = new Map();
    this.preloadQueue = [];
    this.cache = new Map();
    this.intersectionObserver = null;
    this.progressTracking = new Map();
    this.subscriptions = [];
    
    this.init();
  }

  /**
   * Inicializa el cargador de historias
   */
  init() {
    // Configurar Intersection Observer para lazy loading
    this.setupIntersectionObserver();

    // Suscribirse a eventos
    this.subscriptions.push(
      eventBus.on(EVENTS.STORY_LOAD, this.handleStoryLoad.bind(this)),
      eventBus.on(EVENTS.STORY_PROGRESS, this.handleStoryProgress.bind(this)),
      eventBus.on(EVENTS.NETWORK_ONLINE, this.processPreloadQueue.bind(this))
    );

    // Cargar desde caché local
    this.loadFromCache();

    console.log('✅ StoryLoader initialized');
  }

  /**
   * Configura Intersection Observer
   */
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          root: null,
          rootMargin: '50px',
          threshold: [0.1, 0.25, 0.5, 0.75, 0.9]
        }
      );
    }
  }

  /**
   * Carga una historia específica
   */
  async loadStory(storyId, options = {}) {
    const defaultOptions = {
      includeMedia: true,
      includeInteractions: true,
      includeAnalytics: true,
      preloadAssets: true,
      format: 'full' // full | preview | minimal
    };

    const loadOptions = { ...defaultOptions, ...options };
    
    // Verificar si ya está cargando
    if (this.loadingStates.has(storyId)) {
      return this.loadingStates.get(storyId);
    }

    // Verificar caché primero
    const cachedStory = this.getCachedStory(storyId, loadOptions);
    if (cachedStory && !options.forceRefresh) {
      return cachedStory;
    }

    try {
      eventBus.emit(EVENTS.STORY_LOAD, { 
        storyId, 
        options: loadOptions 
      });

      const loadPromise = this.fetchStory(storyId, loadOptions);
      this.loadingStates.set(storyId, loadPromise);

      const storyData = await loadPromise;
      const processedStory = await this.processStory(storyData, loadOptions);

      // Almacenar en caché
      this.cacheStory(storyId, processedStory, loadOptions);

      // Precargar assets si está habilitado
      if (loadOptions.preloadAssets) {
        this.preloadStoryAssets(processedStory);
      }

      this.loadingStates.delete(storyId);

      eventBus.emit(EVENTS.STORY_LOADED, {
        story: processedStory,
        storyId,
        options: loadOptions
      });

      return processedStory;

    } catch (error) {
      this.loadingStates.delete(storyId);

      eventBus.emit(EVENTS.STORY_ERROR, {
        storyId,
        error: error.message,
        options: loadOptions
      });

      if (window.errorHandler) {
        window.errorHandler.handleApiError(error, {
          method: 'GET',
          endpoint: `/stories/${storyId}`,
          context: 'loadStory'
        });
      }

      // Intentar retornar versión en caché si existe
      const fallbackStory = this.getCachedStory(storyId, { format: 'minimal' });
      if (fallbackStory) {
        return fallbackStory;
      }

      throw error;
    }
  }

  /**
   * Hace fetch de historia desde la API
   */
  async fetchStory(storyId, options) {
    const queryParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });

    const response = await NetworkUtils.fetchWithRetry(
      `/api/stories/${storyId}?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch story: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Procesa datos de historia
   */
  async processStory(storyData, options) {
    const story = {
      ...storyData,
      id: storyData.id,
      title: storyData.title,
      slug: storyData.slug || StringUtils.toSlug(storyData.title),
      createdAt: new Date(storyData.createdAt),
      updatedAt: new Date(storyData.updatedAt),
      publishedAt: storyData.publishedAt ? new Date(storyData.publishedAt) : null
    };

    // Procesar contenido según formato
    if (options.format === 'full') {
      story.content = await this.processStoryContent(storyData.content || []);
      story.chapters = await this.processChapters(storyData.chapters || []);
      story.timeline = await this.processTimeline(storyData.timeline || []);
    }

    // Procesar media
    if (options.includeMedia && storyData.media) {
      story.media = await this.processStoryMedia(storyData.media);
    }

    // Procesar interacciones
    if (options.includeInteractions && storyData.interactions) {
      story.interactions = await this.processInteractions(storyData.interactions);
    }

    // Procesar metadatos
    story.metadata = this.processMetadata(storyData.metadata || {});

    // Procesar comunidad relacionada
    if (storyData.community) {
      story.community = await this.processCommunityData(storyData.community);
    }

    // Procesar sponsors
    if (storyData.sponsors) {
      story.sponsors = await this.processSponsors(storyData.sponsors);
    }

    // Calcular estadísticas de lectura
    story.readingStats = this.calculateReadingStats(story);

    return story;
  }

  /**
   * Procesa contenido de la historia
   */
  async processStoryContent(contentBlocks) {
    return contentBlocks.map((block, index) => ({
      ...block,
      id: block.id || `block-${index}`,
      type: block.type || 'paragraph',
      content: this.sanitizeContent(block.content),
      order: block.order || index,
      animations: block.animations || {},
      interactions: block.interactions || {}
    }));
  }

  /**
   * Procesa capítulos de la historia
   */
  async processChapters(chapters) {
    return chapters.map((chapter, index) => ({
      ...chapter,
      id: chapter.id || `chapter-${index}`,
      title: chapter.title,
      slug: chapter.slug || StringUtils.toSlug(chapter.title),
      order: chapter.order || index,
      content: chapter.content || [],
      duration: this.estimateReadingTime(chapter.content),
      progress: 0
    }));
  }

  /**
   * Procesa línea de tiempo
   */
  async processTimeline(timelineEvents) {
    return timelineEvents.map((event, index) => ({
      ...event,
      id: event.id || `event-${index}`,
      date: new Date(event.date),
      title: event.title,
      description: event.description,
      media: event.media || null,
      order: event.order || index
    })).sort((a, b) => a.date - b.date);
  }

  /**
   * Procesa media de la historia
   */
  async processStoryMedia(media) {
    const processedMedia = {
      images: [],
      videos: [],
      audio: [],
      documents: []
    };

    if (Array.isArray(media)) {
      media.forEach(item => {
        const mediaItem = {
          ...item,
          id: item.id || StringUtils.generateId('media'),
          url: this.processMediaUrl(item.url),
          thumbnail: item.thumbnail ? this.processMediaUrl(item.thumbnail) : null,
          alt: item.alt || item.title || '',
          caption: item.caption || '',
          metadata: item.metadata || {}
        };

        switch (item.type) {
          case 'image':
            processedMedia.images.push(mediaItem);
            break;
          case 'video':
            processedMedia.videos.push(mediaItem);
            break;
          case 'audio':
            processedMedia.audio.push(mediaItem);
            break;
          case 'document':
            processedMedia.documents.push(mediaItem);
            break;
        }
      });
    }

    return processedMedia;
  }

  /**
   * Procesa URL de media
   */
  processMediaUrl(url) {
    if (!url) return null;
    
    // Si es URL relativa, añadir CDN base
    if (url.startsWith('/')) {
      const cdnBase = ConfigManager.get('cdn.baseUrl', '');
      return cdnBase + url;
    }
    
    return url;
  }

  /**
   * Procesa interacciones
   */
  async processInteractions(interactions) {
    return interactions.map(interaction => ({
      ...interaction,
      id: interaction.id || StringUtils.generateId('interaction'),
      type: interaction.type || 'click',
      trigger: interaction.trigger || {},
      action: interaction.action || {},
      conditions: interaction.conditions || {},
      analytics: interaction.analytics || true
    }));
  }

  /**
   * Procesa metadatos
   */
  processMetadata(metadata) {
    return {
      author: metadata.author || '',
      photographer: metadata.photographer || '',
      videoProducer: metadata.videoProducer || '',
      sources: metadata.sources || [],
      tags: metadata.tags || [],
      language: metadata.language || 'es',
      difficulty: metadata.difficulty || 'beginner',
      estimatedTime: metadata.estimatedTime || 0,
      lastUpdate: metadata.lastUpdate ? new Date(metadata.lastUpdate) : null,
      version: metadata.version || '1.0.0',
      ...metadata
    };
  }

  /**
   * Procesa datos de comunidad
   */
  async processCommunityData(communityData) {
    return {
      id: communityData.id,
      name: communityData.name,
      slug: communityData.slug || StringUtils.toSlug(communityData.name),
      image: communityData.image,
      description: communityData.description,
      location: communityData.location,
      category: communityData.category,
      stats: communityData.stats || {}
    };
  }

  /**
   * Procesa sponsors
   */
  async processSponsors(sponsors) {
    return sponsors.map(sponsor => ({
      ...sponsor,
      id: sponsor.id,
      name: sponsor.name,
      logo: this.processMediaUrl(sponsor.logo),
      tier: sponsor.tier || 'bronze',
      amount: sponsor.amount || 0,
      website: sponsor.website,
      description: sponsor.description || '',
      placement: sponsor.placement || 'footer'
    }));
  }

  /**
   * Sanitiza contenido HTML
   */
  sanitizeContent(content) {
    if (typeof content !== 'string') return content;
    
    const allowedTags = ConfigManager.get('security.sanitization.allowedTags', []);
    return ValidationUtils.sanitizeInput(content, allowedTags);
  }

  /**
   * Calcula estadísticas de lectura
   */
  calculateReadingStats(story) {
    const wordsPerMinute = 200; // Promedio de lectura
    let totalWords = 0;

    // Contar palabras en contenido
    if (story.content) {
      story.content.forEach(block => {
        if (block.type === 'paragraph' || block.type === 'text') {
          totalWords += this.countWords(block.content);
        }
      });
    }

    // Contar palabras en capítulos
    if (story.chapters) {
      story.chapters.forEach(chapter => {
        if (chapter.content) {
          chapter.content.forEach(block => {
            if (block.type === 'paragraph' || block.type === 'text') {
              totalWords += this.countWords(block.content);
            }
          });
        }
      });
    }

    const estimatedMinutes = Math.ceil(totalWords / wordsPerMinute);

    return {
      totalWords,
      estimatedReadingTime: estimatedMinutes,
      difficulty: this.calculateDifficulty(story),
      interactivity: this.calculateInteractivity(story)
    };
  }

  /**
   * Cuenta palabras en texto
   */
  countWords(text) {
    if (typeof text !== 'string') return 0;
    
    // Remover HTML y contar palabras
    const plainText = StringUtils.stripHtml(text);
    return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calcula dificultad de lectura
   */
  calculateDifficulty(story) {
    // Algoritmo simplificado basado en longitud y complejidad
    const totalBlocks = (story.content?.length || 0) + (story.chapters?.length || 0);
    const hasInteractions = (story.interactions?.length || 0) > 0;
    const hasMedia = Object.values(story.media || {}).some(arr => arr.length > 0);

    if (totalBlocks < 5 && !hasInteractions) return 'beginner';
    if (totalBlocks < 15 && hasMedia) return 'intermediate';
    return 'advanced';
  }

  /**
   * Calcula nivel de interactividad
   */
  calculateInteractivity(story) {
    const interactionCount = story.interactions?.length || 0;
    const mediaCount = Object.values(story.media || {}).reduce((sum, arr) => sum + arr.length, 0);
    
    const score = interactionCount * 2 + mediaCount;
    
    if (score < 3) return 'low';
    if (score < 8) return 'medium';
    return 'high';
  }

  /**
   * Estima tiempo de lectura
   */
  estimateReadingTime(content) {
    if (!Array.isArray(content)) return 0;
    
    let totalWords = 0;
    content.forEach(block => {
      if (block.type === 'paragraph' || block.type === 'text') {
        totalWords += this.countWords(block.content);
      }
    });

    return Math.ceil(totalWords / 200); // 200 WPM promedio
  }

  /**
   * Obtiene historia del caché
   */
  getCachedStory(storyId, options) {
    const cacheKey = this.generateCacheKey(storyId, options);
    
    if (this.cache.has(cacheKey)) {
      const cachedData = this.cache.get(cacheKey);
      
      // Verificar expiración
      if (Date.now() - cachedData.timestamp < TIMEOUTS.CACHE_EXPIRE) {
        return cachedData.story;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    return null;
  }

  /**
   * Almacena historia en caché
   */
  cacheStory(storyId, story, options) {
    const cacheKey = this.generateCacheKey(storyId, options);
    
    this.cache.set(cacheKey, {
      story: story,
      timestamp: Date.now(),
      options: options
    });

    // También almacenar en Map principal
    this.stories.set(storyId, story);

    // Limitar tamaño del caché
    if (this.cache.size > LIMITS.CACHE_ITEMS_MAX) {
      this.cleanupCache();
    }
  }

  /**
   * Genera clave de caché
   */
  generateCacheKey(storyId, options) {
    const sortedOptions = Object.keys(options)
      .sort()
      .reduce((result, key) => {
        result[key] = options[key];
        return result;
      }, {});

    return `story-${storyId}-${btoa(JSON.stringify(sortedOptions))}`;
  }

  /**
   * Limpia caché antiguo
   */
  cleanupCache() {
    const entries = Array.from(this.cache.entries());
    
    // Ordenar por timestamp (más antiguo primero)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remover la mitad más antigua
    const toRemove = entries.slice(0, Math.floor(entries.length / 2));
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Precarga historia
   */
  async preloadStory(storyId, priority = 'normal') {
    // Verificar si ya está cargada
    if (this.stories.has(storyId)) {
      return this.stories.get(storyId);
    }

    // Verificar si ya está en cola
    const existingQueueItem = this.preloadQueue.find(item => item.storyId === storyId);
    if (existingQueueItem) {
      return existingQueueItem.promise;
    }

    // Añadir a cola de precarga
    const preloadPromise = this.loadStory(storyId, {
      format: 'preview',
      preloadAssets: false
    });

    const queueItem = {
      storyId,
      priority,
      promise: preloadPromise,
      timestamp: Date.now()
    };

    this.preloadQueue.push(queueItem);

    // Procesar cola si hay capacidad
    if (this.preloadQueue.length <= ConfigManager.get('performance.maxConcurrentRequests', 6)) {
      this.processPreloadQueue();
    }

    return preloadPromise;
  }

  /**
   * Procesa cola de precarga
   */
  async processPreloadQueue() {
    if (this.preloadQueue.length === 0) return;

    // Ordenar por prioridad
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const maxConcurrent = ConfigManager.get('performance.maxConcurrentRequests', 6);
    const currentLoading = this.loadingStates.size;

    if (currentLoading >= maxConcurrent) return;

    const availableSlots = maxConcurrent - currentLoading;
    const itemsToProcess = this.preloadQueue.splice(0, availableSlots);

    await Promise.allSettled(
      itemsToProcess.map(item => item.promise)
    );
  }

  /**
   * Precarga assets de historia
   */
  async preloadStoryAssets(story) {
    const preloadPromises = [];

    // Precargar imágenes
    if (story.media?.images) {
      story.media.images.slice(0, 3).forEach(image => {
        preloadPromises.push(this.preloadImage(image.url));
      });
    }

    // Precargar videos (solo metadata)
    if (story.media?.videos) {
      story.media.videos.slice(0, 1).forEach(video => {
        preloadPromises.push(this.preloadVideo(video.url));
      });
    }

    // Precargar audio
    if (story.media?.audio) {
      story.media.audio.slice(0, 1).forEach(audio => {
        preloadPromises.push(this.preloadAudio(audio.url));
      });
    }

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Precarga imagen
   */
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Precarga video metadata
   */
  preloadVideo(url) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve(video);
      video.onerror = () => reject(new Error(`Failed to preload video: ${url}`));
      video.src = url;
    });
  }

  /**
   * Precarga audio
   */
  preloadAudio(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = () => reject(new Error(`Failed to preload audio: ${url}`));
      audio.src = url;
    });
  }

  /**
   * Establece historia activa
   */
  async setActiveStory(storyId) {
    try {
      const story = await this.loadStory(storyId, {
        format: 'full',
        includeMedia: true,
        includeInteractions: true,
        preloadAssets: true
      });

      this.activeStory = story;

      // Inicializar tracking de progreso
      this.initializeProgressTracking(story);

      // Actualizar URL
      if (window.history && window.history.pushState) {
        const newUrl = `/stories/${story.slug || story.id}`;
        window.history.pushState({ storyId }, story.title, newUrl);
      }

      // Actualizar SEO
      if (window.SEOUtils) {
        SEOUtils.updateMetaTags({
          title: story.title,
          description: story.metadata.description || story.description,
          image: story.media?.images?.[0]?.url,
          keywords: story.metadata.tags
        });

        SEOUtils.generateStructuredData('Article', {
          headline: story.title,
          description: story.metadata.description,
          author: story.metadata.author,
          datePublished: story.publishedAt?.toISOString(),
          dateModified: story.updatedAt?.toISOString(),
          image: story.media?.images?.[0]?.url
        });
      }

      eventBus.emit(EVENTS.STORY_LOADED, { story });

      // Rastrear analytics
      if (window.AnalyticsUtils) {
        AnalyticsUtils.trackEvent(ANALYTICS_EVENTS.STORY_START, {
          storyId: story.id,
          storyTitle: story.title,
          communityId: story.community?.id,
          estimatedTime: story.readingStats.estimatedReadingTime
        });
      }

      return story;

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.logError({
          type: 'story_load',
          message: `Failed to set active story: ${storyId}`,
          error: error.message
        });
      }
      throw error;
    }
  }

  /**
   * Inicializa tracking de progreso
   */
  initializeProgressTracking(story) {
    const tracking = {
      storyId: story.id,
      startTime: Date.now(),
      currentSection: 0,
      sectionsRead: new Set(),
      totalSections: story.chapters?.length || story.content?.length || 1,
      interactions: [],
      scrollDepth: 0,
      timeSpent: 0
    };

    this.progressTracking.set(story.id, tracking);

    // Configurar observadores para secciones
    if (this.intersectionObserver) {
      this.observeStorySections(story);
    }
  }

  /**
   * Observa secciones de historia para tracking
   */
  observeStorySections(story) {
    // Observar elementos de historia
    const storyElements = DOMUtils.$$('[data-story-section]');
    storyElements.forEach(element => {
      this.intersectionObserver.observe(element);
    });
  }

  /**
   * Maneja intersecciones para tracking
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting && this.activeStory) {
        const sectionId = entry.target.dataset.storySection;
        const tracking = this.progressTracking.get(this.activeStory.id);
        
        if (tracking && sectionId) {
          tracking.sectionsRead.add(sectionId);
          
          const progress = (tracking.sectionsRead.size / tracking.totalSections) * 100;
          
          this.updateProgress(this.activeStory.id, progress);
        }
      }
    });
  }

  /**
   * Actualiza progreso de lectura
   */
  updateProgress(storyId, progress) {
    const tracking = this.progressTracking.get(storyId);
    if (!tracking) return;

    tracking.timeSpent = Date.now() - tracking.startTime;
    
    eventBus.emit(EVENTS.STORY_PROGRESS, {
      storyId,
      progress: Math.min(progress, 100),
      timeSpent: tracking.timeSpent,
      sectionsRead: tracking.sectionsRead.size,
      totalSections: tracking.totalSections
    });

    // Rastrear hitos importantes
    if (progress >= 25 && !tracking.milestone25) {
      tracking.milestone25 = true;
      this.trackProgressMilestone(storyId, 25);
    }
    
    if (progress >= 50 && !tracking.milestone50) {
      tracking.milestone50 = true;
      this.trackProgressMilestone(storyId, 50);
    }
    
    if (progress >= 75 && !tracking.milestone75) {
      tracking.milestone75 = true;
      this.trackProgressMilestone(storyId, 75);
    }
    
    if (progress >= 90 && !tracking.milestone90) {
      tracking.milestone90 = true;
      this.trackProgressMilestone(storyId, 90);
      
      // Historia casi completada
      eventBus.emit(EVENTS.STORY_COMPLETE, {
        storyId,
        timeSpent: tracking.timeSpent,
        completionRate: progress
      });
    }
  }

  /**
   * Rastrea hito de progreso
   */
  trackProgressMilestone(storyId, milestone) {
    const tracking = this.progressTracking.get(storyId);
    
    if (window.AnalyticsUtils && tracking) {
      AnalyticsUtils.trackStoryProgress(
        storyId,
        milestone,
        tracking.timeSpent
      );
    }
  }

  /**
   * Maneja eventos de carga de historia
   */
  handleStoryLoad(eventData) {
    const { storyId } = eventData.data;
    // Lógica adicional si es necesaria
  }

  /**
   * Maneja eventos de progreso
   */
  handleStoryProgress(eventData) {
    const { storyId, progress } = eventData.data;
    
    // Guardar progreso localmente
    StorageUtils.setItem(`story-progress-${storyId}`, {
      progress,
      timestamp: Date.now()
    }, 7 * 24 * 60); // 7 días
  }

  /**
   * Carga desde caché local
   */
  loadFromCache() {
    try {
      const cachedStories = StorageUtils.getItem('stories-cache', null);
      if (cachedStories && Array.isArray(cachedStories.data)) {
        cachedStories.data.forEach(story => {
          this.stories.set(story.id, story);
        });
      }
    } catch (error) {
      console.warn('Failed to load stories from cache:', error);
    }
  }

  /**
   * Guarda en caché local
   */
  saveToCache() {
    try {
      const storiesArray = Array.from(this.stories.values()).slice(0, 20); // Límite
      StorageUtils.setItem('stories-cache', {
        data: storiesArray,
        timestamp: Date.now()
      }, 24 * 60); // 24 horas
    } catch (error) {
      console.warn('Failed to save stories to cache:', error);
    }
  }

  /**
   * Obtiene métricas del loader
   */
  getMetrics() {
    return {
      totalStories: this.stories.size,
      cachedStories: this.cache.size,
      activeStory: this.activeStory?.id || null,
      preloadQueue: this.preloadQueue.length,
      progressTracking: this.progressTracking.size,
      loadingStates: this.loadingStates.size
    };
  }

  /**
   * Limpia caché y datos
   */
  clearCache() {
    this.cache.clear();
    this.stories.clear();
    this.progressTracking.clear();
    StorageUtils.removeItem('stories-cache');
  }

  /**
   * Destruye el loader
   */
  destroy() {
    // Desuscribirse de eventos
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];

    // Desconectar intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    // Guardar caché antes de destruir
    this.saveToCache();

    // Limpiar datos
    this.clearCache();
    this.activeStory = null;
    this.preloadQueue = [];
  }
}

// Crear instancia global
const storyLoader = new StoryLoader();

// Guardar progreso periódicamente
setInterval(() => {
  if (storyLoader.activeStory) {
    const tracking = storyLoader.progressTracking.get(storyLoader.activeStory.id);
    if (tracking) {
      StorageUtils.setItem(`story-progress-${storyLoader.activeStory.id}`, {
        progress: (tracking.sectionsRead.size / tracking.totalSections) * 100,
        timeSpent: Date.now() - tracking.startTime,
        timestamp: Date.now()
      }, 7 * 24 * 60); // 7 días
    }
  }
}, 30000); // Cada 30 segundos

// Guardar caché antes de cerrar
window.addEventListener('beforeunload', () => {
  storyLoader.saveToCache();
});

// Limpiar recursos al cambiar de página
window.addEventListener('pagehide', () => {
  if (storyLoader.intersectionObserver) {
    storyLoader.intersectionObserver.disconnect();
  }
});

// Exportar al scope global
window.StoryLoader = StoryLoader;
window.storyLoader = storyLoader;

console.log('✅ Community Stories Platform - Story Loader loaded');