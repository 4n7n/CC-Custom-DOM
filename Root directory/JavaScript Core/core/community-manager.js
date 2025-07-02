/**
 * Community Stories Platform - Community Manager
 * Gestión centralizada de comunidades y sus historias
 */

class CommunityManager {
  constructor() {
    this.communities = new Map();
    this.activeCommunity = null;
    this.cache = new Map();
    this.loadingStates = new Map();
    this.subscriptions = [];
    
    this.init();
  }

  /**
   * Inicializa el gestor de comunidades
   */
  init() {
    // Suscribirse a eventos relevantes
    this.subscriptions.push(
      eventBus.on(EVENTS.COMMUNITY_SELECT, this.handleCommunitySelect.bind(this)),
      eventBus.on(EVENTS.NETWORK_ONLINE, this.syncOfflineData.bind(this))
    );

    // Cargar datos desde caché local
    this.loadFromCache();

    console.log('✅ CommunityManager initialized');
  }

  /**
   * Carga comunidades desde la API
   */
  async loadCommunities(options = {}) {
    const defaultOptions = {
      category: null,
      region: null,
      featured: false,
      limit: 20,
      offset: 0,
      sortBy: 'name',
      sortOrder: 'asc',
      includeStats: true
    };

    const queryOptions = { ...defaultOptions, ...options };
    const cacheKey = this.generateCacheKey('communities', queryOptions);

    // Verificar caché primero
    if (this.cache.has(cacheKey) && !options.forceRefresh) {
      const cachedData = this.cache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < TIMEOUTS.CACHE_EXPIRE) {
        return cachedData.data;
      }
    }

    // Verificar si ya está cargando
    if (this.loadingStates.has(cacheKey)) {
      return this.loadingStates.get(cacheKey);
    }

    try {
      eventBus.emit(EVENTS.COMMUNITY_LOAD, { options: queryOptions });

      const loadPromise = this.fetchCommunities(queryOptions);
      this.loadingStates.set(cacheKey, loadPromise);

      const communities = await loadPromise;

      // Procesar y enriquecer datos
      const processedCommunities = await this.processCommunities(communities);

      // Almacenar en caché
      this.cache.set(cacheKey, {
        data: processedCommunities,
        timestamp: Date.now()
      });

      // Almacenar comunidades individuales
      processedCommunities.forEach(community => {
        this.communities.set(community.id, community);
      });

      this.loadingStates.delete(cacheKey);

      eventBus.emit(EVENTS.COMMUNITY_LOADED, { 
        communities: processedCommunities,
        options: queryOptions
      });

      return processedCommunities;

    } catch (error) {
      this.loadingStates.delete(cacheKey);
      
      eventBus.emit(EVENTS.COMMUNITY_ERROR, {
        type: 'load_error',
        error: error.message,
        options: queryOptions
      });

      if (window.errorHandler) {
        window.errorHandler.handleApiError(error, {
          method: 'GET',
          endpoint: '/communities',
          context: 'loadCommunities'
        });
      }

      // Retornar datos del caché si están disponibles
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData.data;
      }

      throw error;
    }
  }

  /**
   * Obtiene una comunidad específica
   */
  async getCommunity(communityId, options = {}) {
    const defaultOptions = {
      includeStories: true,
      includeStats: true,
      includeSponsors: true
    };

    const queryOptions = { ...defaultOptions, ...options };

    // Verificar caché local primero
    if (this.communities.has(communityId) && !options.forceRefresh) {
      const community = this.communities.get(communityId);
      
      // Verificar si tiene todos los datos requeridos
      if (this.hasSufficientData(community, queryOptions)) {
        return community;
      }
    }

    try {
      const community = await this.fetchCommunity(communityId, queryOptions);
      const processedCommunity = await this.processCommunity(community);

      // Almacenar en caché
      this.communities.set(communityId, processedCommunity);

      return processedCommunity;

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleApiError(error, {
          method: 'GET',
          endpoint: `/communities/${communityId}`,
          context: 'getCommunity'
        });
      }

      // Retornar datos del caché si están disponibles
      if (this.communities.has(communityId)) {
        return this.communities.get(communityId);
      }

      throw error;
    }
  }

  /**
   * Busca comunidades
   */
  async searchCommunities(query, options = {}) {
    const defaultOptions = {
      limit: 10,
      includeStories: false,
      fuzzy: true,
      categories: [],
      regions: []
    };

    const searchOptions = { ...defaultOptions, ...options };

    if (!query || query.trim().length < LIMITS.SEARCH_QUERY_MIN) {
      return [];
    }

    const cacheKey = this.generateCacheKey('search', { query, ...searchOptions });

    // Verificar caché
    if (this.cache.has(cacheKey)) {
      const cachedData = this.cache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < TIMEOUTS.TEMP_CACHE) {
        return cachedData.data;
      }
    }

    try {
      eventBus.emit(EVENTS.SEARCH_START, { query, options: searchOptions });

      const results = await this.performSearch(query, searchOptions);
      const processedResults = await this.processCommunities(results);

      // Almacenar en caché temporal
      this.cache.set(cacheKey, {
        data: processedResults,
        timestamp: Date.now()
      });

      eventBus.emit(EVENTS.SEARCH_RESULTS, {
        query,
        results: processedResults,
        total: processedResults.length
      });

      // Rastrear búsqueda
      if (window.AnalyticsUtils) {
        AnalyticsUtils.trackEvent(ANALYTICS_EVENTS.SEARCH, {
          query,
          resultsCount: processedResults.length,
          categories: searchOptions.categories,
          regions: searchOptions.regions
        });
      }

      return processedResults;

    } catch (error) {
      eventBus.emit(EVENTS.SEARCH_ERROR, {
        query,
        error: error.message
      });

      if (window.errorHandler) {
        window.errorHandler.handleNetworkError(error, `/api/communities/search`);
      }

      return [];
    }
  }

  /**
   * Selecciona una comunidad activa
   */
  async selectCommunity(communityId) {
    try {
      const community = await this.getCommunity(communityId, {
        includeStories: true,
        includeStats: true,
        includeSponsors: true
      });

      this.activeCommunity = community;

      // Actualizar URL sin recargar
      if (window.history && window.history.pushState) {
        const newUrl = `/communities/${community.slug || community.id}`;
        window.history.pushState({ communityId }, community.name, newUrl);
      }

      // Actualizar meta tags para SEO
      if (window.SEOUtils) {
        SEOUtils.updateMetaTags({
          title: community.name,
          description: community.description,
          image: community.image,
          keywords: [community.category, community.region, ...community.tags]
        });
      }

      eventBus.emit(EVENTS.COMMUNITY_SELECT, {
        community,
        previousCommunity: this.activeCommunity
      });

      return community;

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.logError({
          type: 'community_select',
          message: `Failed to select community: ${communityId}`,
          error: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Obtiene comunidades por categoría
   */
  async getCommunitiesByCategory(categoryId, options = {}) {
    return this.loadCommunities({
      category: categoryId,
      ...options
    });
  }

  /**
   * Obtiene comunidades por región
   */
  async getCommunitiesByRegion(regionId, options = {}) {
    return this.loadCommunities({
      region: regionId,
      ...options
    });
  }

  /**
   * Obtiene comunidades destacadas
   */
  async getFeaturedCommunities(limit = 6) {
    return this.loadCommunities({
      featured: true,
      limit,
      sortBy: 'featured_at',
      sortOrder: 'desc'
    });
  }

  /**
   * Obtiene comunidades cercanas
   */
  async getNearbyCommunities(location, maxDistance = 50) {
    if (!location || !location.latitude || !location.longitude) {
      throw new Error('Valid location coordinates required');
    }

    try {
      const response = await NetworkUtils.fetchWithRetry('/api/communities/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          maxDistance
        })
      });

      const nearbyData = await response.json();
      const communities = await this.processCommunities(nearbyData.communities);

      // Calcular distancias
      communities.forEach(community => {
        if (community.location) {
          community.distance = GeolocationUtils.calculateDistance(
            location.latitude,
            location.longitude,
            community.location.latitude,
            community.location.longitude
          );
        }
      });

      // Ordenar por distancia
      communities.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

      return communities;

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleNetworkError(error, '/api/communities/nearby');
      }
      return [];
    }
  }

  /**
   * Obtiene estadísticas de una comunidad
   */
  async getCommunityStats(communityId) {
    const cacheKey = `stats-${communityId}`;
    
    // Verificar caché
    if (this.cache.has(cacheKey)) {
      const cachedData = this.cache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < TIMEOUTS.TEMP_CACHE) {
        return cachedData.data;
      }
    }

    try {
      const response = await NetworkUtils.fetchWithRetry(`/api/communities/${communityId}/stats`);
      const stats = await response.json();

      // Almacenar en caché
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleNetworkError(error, `/api/communities/${communityId}/stats`);
      }
      return null;
    }
  }

  /**
   * Hace fetch de comunidades desde la API
   */
  async fetchCommunities(options) {
    const queryParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });

    const response = await NetworkUtils.fetchWithRetry(
      `/api/communities?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch communities: ${response.status}`);
    }

    const data = await response.json();
    return data.communities || data;
  }

  /**
   * Hace fetch de una comunidad específica
   */
  async fetchCommunity(communityId, options) {
    const queryParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });

    const response = await NetworkUtils.fetchWithRetry(
      `/api/communities/${communityId}?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch community: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Realiza búsqueda de comunidades
   */
  async performSearch(query, options) {
    const response = await NetworkUtils.fetchWithRetry('/api/communities/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results || data;
  }

  /**
   * Procesa lista de comunidades
   */
  async processCommunities(communities) {
    if (!Array.isArray(communities)) {
      return [];
    }

    return Promise.all(
      communities.map(community => this.processCommunity(community))
    );
  }

  /**
   * Procesa una comunidad individual
   */
  async processCommunity(community) {
    // Enriquecer con datos de categoría
    if (community.categoryId) {
      community.category = COMMUNITY_CATEGORIES[community.categoryId.toUpperCase()];
    }

    // Enriquecer con datos de región
    if (community.regionId) {
      community.region = REGIONS[community.regionId.toUpperCase()];
    }

    // Procesar ubicación
    if (community.location && typeof community.location === 'string') {
      try {
        community.location = JSON.parse(community.location);
      } catch (e) {
        community.location = null;
      }
    }

    // Procesar fechas
    if (community.createdAt) {
      community.createdAt = new Date(community.createdAt);
    }
    if (community.updatedAt) {
      community.updatedAt = new Date(community.updatedAt);
    }

    // Generar slug si no existe
    if (!community.slug) {
      community.slug = StringUtils.toSlug(community.name);
    }

    // Procesar imágenes
    if (community.images) {
      community.images = this.processImages(community.images);
    }

    // Procesar estadísticas
    if (community.stats) {
      community.stats = this.processStats(community.stats);
    }

    // Procesar historias si están incluidas
    if (community.stories) {
      community.stories = await this.processStories(community.stories);
    }

    return community;
  }

  /**
   * Procesa imágenes de comunidad
   */
  processImages(images) {
    if (typeof images === 'string') {
      return { main: images };
    }

    if (Array.isArray(images)) {
      return {
        main: images[0],
        gallery: images
      };
    }

    return images || {};
  }

  /**
   * Procesa estadísticas
   */
  processStats(stats) {
    return {
      members: parseInt(stats.members) || 0,
      stories: parseInt(stats.stories) || 0,
      funding: parseFloat(stats.funding) || 0,
      sponsors: parseInt(stats.sponsors) || 0,
      impact: parseInt(stats.impact) || 0,
      ...stats
    };
  }

  /**
   * Procesa historias de la comunidad
   */
  async processStories(stories) {
    if (!Array.isArray(stories)) {
      return [];
    }

    return stories.map(story => ({
      ...story,
      createdAt: new Date(story.createdAt),
      updatedAt: new Date(story.updatedAt),
      slug: story.slug || StringUtils.toSlug(story.title)
    }));
  }

  /**
   * Verifica si una comunidad tiene datos suficientes
   */
  hasSufficientData(community, options) {
    if (options.includeStories && !community.stories) {
      return false;
    }
    if (options.includeStats && !community.stats) {
      return false;
    }
    if (options.includeSponsors && !community.sponsors) {
      return false;
    }
    return true;
  }

  /**
   * Genera clave de caché
   */
  generateCacheKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    return `${prefix}-${btoa(JSON.stringify(sortedParams))}`;
  }

  /**
   * Maneja selección de comunidad
   */
  handleCommunitySelect(eventData) {
    const { community } = eventData.data;
    
    // Actualizar comunidad activa
    this.activeCommunity = community;

    // Precargar historias relacionadas
    if (community.stories && community.stories.length > 0) {
      this.preloadRelatedStories(community.stories);
    }
  }

  /**
   * Precarga historias relacionadas
   */
  async preloadRelatedStories(stories) {
    const preloadPromises = stories.slice(0, 3).map(story => {
      if (window.StoryLoader) {
        return window.StoryLoader.preloadStory(story.id).catch(() => {});
      }
      return Promise.resolve();
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Carga datos desde caché local
   */
  loadFromCache() {
    try {
      const cachedCommunities = StorageUtils.getItem('communities-cache', null);
      if (cachedCommunities && Array.isArray(cachedCommunities.data)) {
        cachedCommunities.data.forEach(community => {
          this.communities.set(community.id, community);
        });
      }

      const activeCommunityId = StorageUtils.getItem('active-community-id', null);
      if (activeCommunityId && this.communities.has(activeCommunityId)) {
        this.activeCommunity = this.communities.get(activeCommunityId);
      }
    } catch (error) {
      console.warn('Failed to load communities from cache:', error);
    }
  }

  /**
   * Guarda datos en caché local
   */
  saveToCache() {
    try {
      const communitiesArray = Array.from(this.communities.values());
      StorageUtils.setItem('communities-cache', {
        data: communitiesArray,
        timestamp: Date.now()
      }, 24 * 60); // 24 horas

      if (this.activeCommunity) {
        StorageUtils.setItem('active-community-id', this.activeCommunity.id, 24 * 60);
      }
    } catch (error) {
      console.warn('Failed to save communities to cache:', error);
    }
  }

  /**
   * Sincroniza datos offline
   */
  async syncOfflineData() {
    try {
      // Obtener datos offline pendientes
      const offlineData = StorageUtils.getItem('communities-offline-data', []);
      
      if (offlineData.length === 0) return;

      // Procesar cada elemento offline
      for (const item of offlineData) {
        try {
          await this.processOfflineItem(item);
        } catch (error) {
          console.error('Failed to sync offline item:', error);
        }
      }

      // Limpiar datos offline después de sincronizar
      StorageUtils.removeItem('communities-offline-data');

    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }

  /**
   * Procesa elemento offline
   */
  async processOfflineItem(item) {
    switch (item.type) {
      case 'community_view':
        await this.trackCommunityView(item.communityId);
        break;
      case 'community_search':
        // Re-enviar búsqueda para analytics
        if (window.AnalyticsUtils) {
          AnalyticsUtils.trackEvent(ANALYTICS_EVENTS.SEARCH, item.data);
        }
        break;
      default:
        console.warn('Unknown offline item type:', item.type);
    }
  }

  /**
   * Rastrea vista de comunidad
   */
  async trackCommunityView(communityId) {
    try {
      await NetworkUtils.fetchWithRetry('/api/analytics/community-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      // Almacenar para reintento posterior
      this.storeOfflineData({
        type: 'community_view',
        communityId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Almacena datos para sincronización offline
   */
  storeOfflineData(data) {
    const offlineData = StorageUtils.getItem('communities-offline-data', []);
    offlineData.push(data);
    
    // Limitar cantidad de datos offline
    if (offlineData.length > 100) {
      offlineData.splice(0, offlineData.length - 100);
    }
    
    StorageUtils.setItem('communities-offline-data', offlineData);
  }

  /**
   * Filtra comunidades por criterios
   */
  filterCommunities(communities, filters) {
    return communities.filter(community => {
      // Filtro por categoría
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(community.categoryId)) {
          return false;
        }
      }

      // Filtro por región
      if (filters.regions && filters.regions.length > 0) {
        if (!filters.regions.includes(community.regionId)) {
          return false;
        }
      }

      // Filtro por tamaño de comunidad
      if (filters.minMembers && community.stats.members < filters.minMembers) {
        return false;
      }

      if (filters.maxMembers && community.stats.members > filters.maxMembers) {
        return false;
      }

      // Filtro por cantidad de historias
      if (filters.minStories && community.stats.stories < filters.minStories) {
        return false;
      }

      // Filtro por financiamiento
      if (filters.minFunding && community.stats.funding < filters.minFunding) {
        return false;
      }

      // Filtro por texto
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase();
        const searchableText = [
          community.name,
          community.description,
          community.tags?.join(' ') || ''
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Ordena comunidades
   */
  sortCommunities(communities, sortBy = 'name', sortOrder = 'asc') {
    return ArrayUtils.sortBy(communities, sortBy, sortOrder);
  }

  /**
   * Obtiene comunidades recomendadas
   */
  async getRecommendedCommunities(userId = null, limit = 6) {
    try {
      const endpoint = userId 
        ? `/api/communities/recommendations/${userId}`
        : '/api/communities/recommendations';

      const response = await NetworkUtils.fetchWithRetry(`${endpoint}?limit=${limit}`);
      const data = await response.json();
      
      return await this.processCommunities(data.recommendations || data);

    } catch (error) {
      // Fallback a comunidades destacadas
      return this.getFeaturedCommunities(limit);
    }
  }

  /**
   * Valida datos de comunidad
   */
  validateCommunity(communityData) {
    const errors = [];

    if (!communityData.name || communityData.name.trim().length === 0) {
      errors.push('Community name is required');
    }

    if (communityData.name && communityData.name.length > LIMITS.COMMUNITY_NAME_MAX) {
      errors.push(`Community name cannot exceed ${LIMITS.COMMUNITY_NAME_MAX} characters`);
    }

    if (!communityData.description || communityData.description.trim().length === 0) {
      errors.push('Community description is required');
    }

    if (communityData.description && communityData.description.length > LIMITS.COMMUNITY_DESCRIPTION_MAX) {
      errors.push(`Community description cannot exceed ${LIMITS.COMMUNITY_DESCRIPTION_MAX} characters`);
    }

    if (!communityData.categoryId || !COMMUNITY_CATEGORIES[communityData.categoryId.toUpperCase()]) {
      errors.push('Valid category is required');
    }

    if (!communityData.regionId || !REGIONS[communityData.regionId.toUpperCase()]) {
      errors.push('Valid region is required');
    }

    if (communityData.email && !ValidationUtils.isValidEmail(communityData.email)) {
      errors.push('Valid email address is required');
    }

    if (communityData.website && !ValidationUtils.isValidUrl(communityData.website)) {
      errors.push('Valid website URL is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Crea una nueva comunidad
   */
  async createCommunity(communityData) {
    const validation = this.validateCommunity(communityData);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const response = await NetworkUtils.fetchWithRetry('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(communityData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create community: ${response.status}`);
      }

      const newCommunity = await response.json();
      const processedCommunity = await this.processCommunity(newCommunity);

      // Almacenar en caché
      this.communities.set(processedCommunity.id, processedCommunity);

      eventBus.emit(EVENTS.COMMUNITY_CREATED, { community: processedCommunity });

      return processedCommunity;

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleApiError(error, {
          method: 'POST',
          endpoint: '/communities',
          context: 'createCommunity'
        });
      }
      throw error;
    }
  }

  /**
   * Actualiza una comunidad
   */
  async updateCommunity(communityId, updateData) {
    try {
      const response = await NetworkUtils.fetchWithRetry(`/api/communities/${communityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update community: ${response.status}`);
      }

      const updatedCommunity = await response.json();
      const processedCommunity = await this.processCommunity(updatedCommunity);

      // Actualizar caché
      this.communities.set(communityId, processedCommunity);

      // Actualizar comunidad activa si es la misma
      if (this.activeCommunity && this.activeCommunity.id === communityId) {
        this.activeCommunity = processedCommunity;
      }

      eventBus.emit(EVENTS.COMMUNITY_UPDATED, { community: processedCommunity });

      return processedCommunity;

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleApiError(error, {
          method: 'PUT',
          endpoint: `/communities/${communityId}`,
          context: 'updateCommunity'
        });
      }
      throw error;
    }
  }

  /**
   * Obtiene métricas del gestor
   */
  getMetrics() {
    return {
      totalCommunities: this.communities.size,
      cachedItems: this.cache.size,
      activeCommunity: this.activeCommunity?.id || null,
      loadingStates: this.loadingStates.size,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * Calcula tasa de aciertos de caché
   */
  calculateCacheHitRate() {
    // Implementación simple - en producción se trackearía más detalladamente
    return this.cache.size > 0 ? 0.85 : 0;
  }

  /**
   * Limpia caché
   */
  clearCache() {
    this.cache.clear();
    StorageUtils.removeItem('communities-cache');
    StorageUtils.removeItem('active-community-id');
  }

  /**
   * Destruye el gestor
   */
  destroy() {
    // Desuscribirse de eventos
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];

    // Guardar datos en caché antes de destruir
    this.saveToCache();

    // Limpiar datos en memoria
    this.communities.clear();
    this.cache.clear();
    this.loadingStates.clear();
    this.activeCommunity = null;
  }
}

// Crear instancia global
const communityManager = new CommunityManager();

// Guardar datos periódicamente
setInterval(() => {
  communityManager.saveToCache();
}, 5 * 60 * 1000); // Cada 5 minutos

// Guardar antes de cerrar la página
window.addEventListener('beforeunload', () => {
  communityManager.saveToCache();
});

// Exportar al scope global
window.CommunityManager = CommunityManager;
window.communityManager = communityManager;

console.log('✅ Community Stories Platform - Community Manager loaded');