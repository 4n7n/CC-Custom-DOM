/**
 * Memory Manager - RAMA 5 Graphics Immersive
 * Gestiona la memoria de texturas, buffers y recursos gráficos
 */

class MemoryManager {
  constructor() {
    this.gl = null;
    this.totalMemoryUsed = 0;
    this.maxMemoryLimit = 512 * 1024 * 1024; // 512MB por defecto
    this.warningThreshold = 0.8; // 80%
    this.criticalThreshold = 0.95; // 95%
    
    this.resources = {
      textures: new Map(),
      buffers: new Map(),
      programs: new Map(),
      framebuffers: new Map(),
      renderbuffers: new Map()
    };
    
    this.pools = {
      texturePool: new Map(),
      bufferPool: new Map(),
      uniformBuffers: new Map()
    };
    
    this.statistics = {
      allocations: 0,
      deallocations: 0,
      recycled: 0,
      garbageCollected: 0,
      memoryLeaks: 0
    };
    
    this.cacheSettings = {
      maxTextureCache: 50,
      maxBufferCache: 30,
      ttl: 300000, // 5 minutos
      enableLRU: true
    };
    
    this.callbacks = {
      onMemoryWarning: [],
      onMemoryCritical: [],
      onMemoryFreed: []
    };
    
    this.garbageCollector = {
      interval: 30000, // 30 segundos
      timer: null,
      aggressiveMode: false
    };
    
    this.initialize();
  }

  /**
   * Inicializa el gestor de memoria
   */
  initialize() {
    this.detectMemoryLimits();
    this.setupGarbageCollector();
    this.bindEvents();
  }

  /**
   * Detecta los límites de memoria del dispositivo
   */
  detectMemoryLimits() {
    // Detectar memoria del navegador
    if (performance.memory) {
      const totalMemory = performance.memory.jsHeapSizeLimit;
      this.maxMemoryLimit = Math.min(totalMemory * 0.3, 1024 * 1024 * 1024); // Máximo 1GB
    }
    
    // Detectar memoria del dispositivo
    if (navigator.deviceMemory) {
      const deviceMemory = navigator.deviceMemory * 1024 * 1024 * 1024;
      this.maxMemoryLimit = Math.min(deviceMemory * 0.2, this.maxMemoryLimit);
    }
    
    // Ajustar para dispositivos móviles
    if (this.isMobileDevice()) {
      this.maxMemoryLimit = Math.min(this.maxMemoryLimit, 256 * 1024 * 1024); // 256MB max en móviles
    }
  }

  /**
   * Configura el contexto WebGL
   */
  setWebGLContext(gl) {
    this.gl = gl;
    this.setupWebGLExtensions();
  }

  /**
   * Configura las extensiones de WebGL
   */
  setupWebGLExtensions() {
    if (!this.gl) return;
    
    // Extensión para información de memoria
    this.memoryInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
    
    // Extensión para texturas comprimidas
    this.compressedTextureS3TC = this.gl.getExtension('WEBGL_compressed_texture_s3tc');
    this.compressedTextureETC = this.gl.getExtension('WEBGL_compressed_texture_etc');
    this.compressedTextureASTC = this.gl.getExtension('WEBGL_compressed_texture_astc');
  }

  /**
   * Configura el recolector de basura
   */
  setupGarbageCollector() {
    this.garbageCollector.timer = setInterval(() => {
      this.runGarbageCollection();
    }, this.garbageCollector.interval);
  }

  /**
   * Vincula eventos del sistema
   */
  bindEvents() {
    // Evento de memoria baja
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryPressure();
      }, 5000);
    }
    
    // Evento de visibilidad para pausar/reanudar GC
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseGarbageCollection();
      } else {
        this.resumeGarbageCollection();
      }
    });
    
    // Evento de baja memoria del navegador
    if ('onmemorywarning' in window) {
      window.addEventListener('memorywarning', () => {
        this.handleMemoryWarning();
      });
    }
  }

  /**
   * Crea una textura gestionada
   */
  createTexture(config) {
    const id = this.generateResourceId();
    const size = this.calculateTextureSize(config);
    
    // Verificar si hay suficiente memoria
    if (!this.checkMemoryAvailable(size)) {
      this.freeMemory(size);
    }
    
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture');
    }
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.setupTexture(config);
    
    const resource = {
      id: id,
      type: 'texture',
      webglObject: texture,
      size: size,
      config: config,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      useCount: 0,
      poolable: config.poolable || false
    };
    
    this.resources.textures.set(id, resource);
    this.totalMemoryUsed += size;
    this.statistics.allocations++;
    
    return { id, texture, size };
  }

  /**
   * Configura una textura
   */
  setupTexture(config) {
    const gl = this.gl;
    const {
      width, height, format = gl.RGBA, type = gl.UNSIGNED_BYTE,
      minFilter = gl.LINEAR, magFilter = gl.LINEAR,
      wrapS = gl.CLAMP_TO_EDGE, wrapT = gl.CLAMP_TO_EDGE,
      data = null, compressed = false
    } = config;
    
    if (compressed && this.supportsCompression(format)) {
      gl.compressedTexImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data);
    }
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    
    // Generar mipmaps si es necesario
    if (minFilter === gl.LINEAR_MIPMAP_LINEAR || minFilter === gl.LINEAR_MIPMAP_NEAREST) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  }

  /**
   * Calcula el tamaño de una textura en bytes
   */
  calculateTextureSize(config) {
    const { width, height, format, type, compressed } = config;
    let bytesPerPixel = 4; // RGBA por defecto
    
    if (compressed) {
      // Estimación para texturas comprimidas (reducción aproximada del 75%)
      return (width * height * bytesPerPixel) * 0.25;
    }
    
    // Calcular bytes por pixel según el formato
    if (format === this.gl.RGB) bytesPerPixel = 3;
    if (format === this.gl.LUMINANCE) bytesPerPixel = 1;
    if (format === this.gl.LUMINANCE_ALPHA) bytesPerPixel = 2;
    
    // Ajustar según el tipo
    if (type === this.gl.UNSIGNED_SHORT) bytesPerPixel *= 2;
    if (type === this.gl.FLOAT) bytesPerPixel *= 4;
    
    return width * height * bytesPerPixel;
  }

  /**
   * Crea un buffer gestionado
   */
  createBuffer(config) {
    const id = this.generateResourceId();
    const size = config.data ? config.data.byteLength : config.size;
    
    if (!this.checkMemoryAvailable(size)) {
      this.freeMemory(size);
    }
    
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to create buffer');
    }
    
    const target = config.target || this.gl.ARRAY_BUFFER;
    const usage = config.usage || this.gl.STATIC_DRAW;
    
    this.gl.bindBuffer(target, buffer);
    if (config.data) {
      this.gl.bufferData(target, config.data, usage);
    } else {
      this.gl.bufferData(target, size, usage);
    }
    
    const resource = {
      id: id,
      type: 'buffer',
      webglObject: buffer,
      size: size,
      config: config,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      useCount: 0,
      target: target,
      usage: usage
    };
    
    this.resources.buffers.set(id, resource);
    this.totalMemoryUsed += size;
    this.statistics.allocations++;
    
    return { id, buffer, size };
  }

  /**
   * Crea un programa de shaders gestionado
   */
  createProgram(vertexSource, fragmentSource) {
    const id = this.generateResourceId();
    
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Shader program linking failed: ${error}`);
    }
    
    // Limpiar shaders temporales
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);
    
    const resource = {
      id: id,
      type: 'program',
      webglObject: program,
      size: vertexSource.length + fragmentSource.length, // Estimación
      createdAt: Date.now(),
      lastUsed: Date.now(),
      useCount: 0,
      uniforms: new Map(),
      attributes: new Map()
    };
    
    // Extraer información de uniforms y attributes
    this.extractProgramInfo(program, resource);
    
    this.resources.programs.set(id, resource);
    this.statistics.allocations++;
    
    return { id, program };
  }

  /**
   * Compila un shader
   */
  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }
    
    return shader;
  }

  /**
   * Extrae información de un programa de shaders
   */
  extractProgramInfo(program, resource) {
    const gl = this.gl;
    
    // Extraer uniforms
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const info = gl.getActiveUniform(program, i);
      const location = gl.getUniformLocation(program, info.name);
      resource.uniforms.set(info.name, { info, location });
    }
    
    // Extraer attributes
    const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attributeCount; i++) {
      const info = gl.getActiveAttrib(program, i);
      const location = gl.getAttribLocation(program, info.name);
      resource.attributes.set(info.name, { info, location });
    }
  }

  /**
   * Obtiene un recurso del pool o crea uno nuevo
   */
  getPooledResource(type, config) {
    const pool = this.pools[`${type}Pool`];
    if (!pool) return null;
    
    // Buscar recurso compatible en el pool
    for (const [key, resource] of pool) {
      if (this.isResourceCompatible(resource, config)) {
        pool.delete(key);
        resource.lastUsed = Date.now();
        resource.useCount++;
        this.statistics.recycled++;
        return resource;
      }
    }
    
    return null;
  }

  /**
   * Devuelve un recurso al pool
   */
  returnToPool(resourceId) {
    const resource = this.findResource(resourceId);
    if (!resource || !resource.poolable) return false;
    
    const pool = this.pools[`${resource.type}Pool`];
    if (!pool) return false;
    
    // Verificar límites del pool
    if (pool.size >= this.cacheSettings[`max${resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}Cache`]) {
      this.deleteResource(resourceId);
      return false;
    }
    
    pool.set(resourceId, resource);
    this.resources[`${resource.type}s`].delete(resourceId);
    
    return true;
  }

  /**
   * Verifica si un recurso es compatible con la configuración
   */
  isResourceCompatible(resource, config) {
    if (resource.type === 'texture') {
      return resource.config.width === config.width &&
             resource.config.height === config.height &&
             resource.config.format === config.format &&
             resource.config.type === config.type;
    }
    
    if (resource.type === 'buffer') {
      return resource.size >= config.size &&
             resource.target === (config.target || this.gl.ARRAY_BUFFER);
    }
    
    return false;
  }

  /**
   * Elimina un recurso específico
   */
  deleteResource(resourceId) {
    const resource = this.findResource(resourceId);
    if (!resource) return false;
    
    // Eliminar del WebGL
    this.deleteWebGLObject(resource);
    
    // Eliminar de las estructuras de datos
    this.resources[`${resource.type}s`].delete(resourceId);
    this.totalMemoryUsed -= resource.size;
    this.statistics.deallocations++;
    
    return true;
  }

  /**
   * Elimina el objeto WebGL
   */
  deleteWebGLObject(resource) {
    const gl = this.gl;
    
    switch (resource.type) {
      case 'texture':
        gl.deleteTexture(resource.webglObject);
        break;
      case 'buffer':
        gl.deleteBuffer(resource.webglObject);
        break;
      case 'program':
        gl.deleteProgram(resource.webglObject);
        break;
      case 'framebuffer':
        gl.deleteFramebuffer(resource.webglObject);
        break;
      case 'renderbuffer':
        gl.deleteRenderbuffer(resource.webglObject);
        break;
    }
  }

  /**
   * Busca un recurso por ID
   */
  findResource(resourceId) {
    for (const [type, resources] of Object.entries(this.resources)) {
      if (resources.has(resourceId)) {
        return resources.get(resourceId);
      }
    }
    
    // Buscar en pools
    for (const [type, pool] of Object.entries(this.pools)) {
      if (pool.has(resourceId)) {
        return pool.get(resourceId);
      }
    }
    
    return null;
  }

  /**
   * Libera memoria hasta alcanzar el objetivo
   */
  freeMemory(targetBytes) {
    const freedBytes = this.runGarbageCollection();
    
    if (freedBytes < targetBytes) {
      // Liberar recursos menos usados
      this.freeLeastRecentlyUsed(targetBytes - freedBytes);
    }
    
    if (this.totalMemoryUsed + targetBytes > this.maxMemoryLimit) {
      // Modo agresivo
      this.aggressiveCleanup();
    }
  }

  /**
   * Libera recursos menos recientemente usados
   */
  freeLeastRecentlyUsed(targetBytes) {
    const allResources = [];
    
    // Recopilar todos los recursos
    for (const [type, resources] of Object.entries(this.resources)) {
      for (const resource of resources.values()) {
        allResources.push(resource);
      }
    }
    
    // Ordenar por último uso
    allResources.sort((a, b) => a.lastUsed - b.lastUsed);
    
    let freedBytes = 0;
    for (const resource of allResources) {
      if (freedBytes >= targetBytes) break;
      
      if (this.canFreeResource(resource)) {
        freedBytes += resource.size;
        this.deleteResource(resource.id);
      }
    }
    
    return freedBytes;
  }

  /**
   * Verifica si se puede liberar un recurso
   */
  canFreeResource(resource) {
    const now = Date.now();
    const timeSinceLastUse = now - resource.lastUsed;
    
    // No liberar recursos usados recientemente
    if (timeSinceLastUse < 10000) return false; // 10 segundos
    
    // No liberar recursos críticos
    if (resource.critical) return false;
    
    return true;
  }

  /**
   * Ejecuta recolección de basura
   */
  runGarbageCollection() {
    let freedBytes = 0;
    const now = Date.now();
    
    // Limpiar pools expirados
    for (const [type, pool] of Object.entries(this.pools)) {
      for (const [id, resource] of pool) {
        if (now - resource.lastUsed > this.cacheSettings.ttl) {
          freedBytes += resource.size;
          this.deleteWebGLObject(resource);
          pool.delete(id);
        }
      }
    }
    
    // Limpiar recursos no utilizados
    for (const [type, resources] of Object.entries(this.resources)) {
      for (const [id, resource] of resources) {
        if (this.shouldGarbageCollect(resource, now)) {
          freedBytes += resource.size;
          this.deleteResource(id);
        }
      }
    }
    
    this.statistics.garbageCollected++;
    
    if (freedBytes > 0) {
      this.triggerCallback('onMemoryFreed', { bytes: freedBytes });
    }
    
    return freedBytes;
  }

  /**
   * Determina si un recurso debe ser recolectado
   */
  shouldGarbageCollect(resource, now) {
    const timeSinceLastUse = now - resource.lastUsed;
    
    // Recursos no usados por mucho tiempo
    if (timeSinceLastUse > this.cacheSettings.ttl * 2) return true;
    
    // Recursos con uso muy bajo
    if (resource.useCount < 2 && timeSinceLastUse > 60000) return true;
    
    // En modo agresivo, ser más estricto
    if (this.garbageCollector.aggressiveMode) {
      return timeSinceLastUse > 30000;
    }
    
    return false;
  }

  /**
   * Limpieza agresiva
   */
  aggressiveCleanup() {
    this.garbageCollector.aggressiveMode = true;
    
    // Limpiar todos los pools
    for (const pool of Object.values(this.pools)) {
      for (const resource of pool.values()) {
        this.deleteWebGLObject(resource);
      }
      pool.clear();
    }
    
    // Ejecutar GC inmediatamente
    this.runGarbageCollection();
    
    // Triggerar GC del navegador si es posible
    if (window.gc) {
      window.gc();
    }
    
    setTimeout(() => {
      this.garbageCollector.aggressiveMode = false;
    }, 30000);
  }

  /**
   * Verifica la presión de memoria
   */
  checkMemoryPressure() {
    const usage = this.totalMemoryUsed / this.maxMemoryLimit;
    
    if (usage >= this.criticalThreshold) {
      this.triggerCallback('onMemoryCritical', {
        usage: usage,
        total: this.totalMemoryUsed,
        limit: this.maxMemoryLimit
      });
      this.handleMemoryCritical();
    } else if (usage >= this.warningThreshold) {
      this.triggerCallback('onMemoryWarning', {
        usage: usage,
        total: this.totalMemoryUsed,
        limit: this.maxMemoryLimit
      });
    }
  }

  /**
   * Maneja advertencia de memoria
   */
  handleMemoryWarning() {
    this.runGarbageCollection();
  }

  /**
   * Maneja memoria crítica
   */
  handleMemoryCritical() {
    this.aggressiveCleanup();
  }

  /**
   * Verifica si hay memoria disponible
   */
  checkMemoryAvailable(bytes) {
    return (this.totalMemoryUsed + bytes) <= this.maxMemoryLimit;
  }

  /**
   * Verifica soporte para compresión
   */
  supportsCompression(format) {
    // Verificar extensiones de compresión disponibles
    return this.compressedTextureS3TC || this.compressedTextureETC || this.compressedTextureASTC;
  }

  /**
   * Pausa recolección de basura
   */
  pauseGarbageCollection() {
    if (this.garbageCollector.timer) {
      clearInterval(this.garbageCollector.timer);
      this.garbageCollector.timer = null;
    }
  }

  /**
   * Reanuda recolección de basura
   */
  resumeGarbageCollection() {
    if (!this.garbageCollector.timer) {
      this.setupGarbageCollector();
    }
  }

  /**
   * Genera ID único para recursos
   */
  generateResourceId() {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detecta si es dispositivo móvil
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Obtiene estadísticas de memoria
   */
  getMemoryStats() {
    const stats = {
      totalUsed: this.totalMemoryUsed,
      maxLimit: this.maxMemoryLimit,
      usagePercentage: (this.totalMemoryUsed / this.maxMemoryLimit) * 100,
      resourceCounts: {
        textures: this.resources.textures.size,
        buffers: this.resources.buffers.size,
        programs: this.resources.programs.size
      },
      poolCounts: {
        texturePool: this.pools.texturePool.size,
        bufferPool: this.pools.bufferPool.size
      },
      statistics: { ...this.statistics }
    };
    
    return stats;
  }

  /**
   * Registra callback
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  /**
   * Dispara callback
   */
  triggerCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }

  /**
   * Destruye el gestor de memoria
   */
  destroy() {
    this.pauseGarbageCollection();
    
    // Limpiar todos los recursos
    for (const [type, resources] of Object.entries(this.resources)) {
      for (const resource of resources.values()) {
        this.deleteWebGLObject(resource);
      }
      resources.clear();
    }
    
    // Limpiar pools
    for (const pool of Object.values(this.pools)) {
      for (const resource of pool.values()) {
        this.deleteWebGLObject(resource);
      }
      pool.clear();
    }
    
    this.totalMemoryUsed = 0;
  }
}

export default MemoryManager;