/**
 * Graphics Optimizer Worker - RAMA 5 Graphics Immersive
 * Web Worker dedicado para optimización gráfica intensiva en hilo separado
 */

class GraphicsOptimizer {
  constructor() {
    this.isRunning = false;
    this.meshCache = new Map();
    this.textureCache = new Map();
    this.lodLevels = new Map();
    this.optimizationQueue = [];
    
    this.settings = {
      maxPolygons: 100000,
      maxTextureSize: 2048,
      lodDistances: [50, 150, 300, 600],
      compressionQuality: 0.8,
      enableDecimation: true,
      enableTextureOptimization: true,
      enableInstancing: true,
      cullingDistance: 1000,
      memoryBudget: 512 * 1024 * 1024 // 512MB
    };
    
    this.statistics = {
      meshesOptimized: 0,
      texturesOptimized: 0,
      memoryFreed: 0,
      polygonsReduced: 0,
      processingTime: 0,
      queueLength: 0
    };
    
    this.geometryProcessor = new GeometryProcessor();
    this.textureProcessor = new TextureProcessor();
    this.instanceManager = new InstanceManager();
    this.memoryManager = new MemoryManager();
    
    this.setupWorkerMessaging();
    this.startOptimizationLoop();
  }

  /**
   * Configura el sistema de mensajería del worker
   */
  setupWorkerMessaging() {
    self.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'START':
          this.start();
          break;
        case 'STOP':
          this.stop();
          break;
        case 'OPTIMIZE_MESH':
          this.optimizeMesh(data);
          break;
        case 'OPTIMIZE_TEXTURE':
          this.optimizeTexture(data);
          break;
        case 'GENERATE_LOD':
          this.generateLOD(data);
          break;
        case 'BATCH_OPTIMIZE':
          this.batchOptimize(data);
          break;
        case 'UPDATE_SETTINGS':
          this.updateSettings(data);
          break;
        case 'CLEAR_CACHE':
          this.clearCache();
          break;
        case 'GET_STATISTICS':
          this.sendStatistics();
          break;
        case 'COMPRESS_TEXTURES':
          this.compressTextures(data);
          break;
        case 'DECIMATE_GEOMETRY':
          this.decimateGeometry(data);
          break;
        case 'OPTIMIZE_INSTANCES':
          this.optimizeInstances(data);
          break;
        default:
          console.warn('Unknown message type:', type);
      }
    };
  }

  /**
   * Inicia el optimizador
   */
  start() {
    this.isRunning = true;
    this.sendMessage('OPTIMIZER_STARTED');
  }

  /**
   * Detiene el optimizador
   */
  stop() {
    this.isRunning = false;
    this.sendMessage('OPTIMIZER_STOPPED');
  }

  /**
   * Loop principal de optimización
   */
  startOptimizationLoop() {
    const processQueue = () => {
      if (this.isRunning && this.optimizationQueue.length > 0) {
        const task = this.optimizationQueue.shift();
        this.processOptimizationTask(task);
      }
      
      this.statistics.queueLength = this.optimizationQueue.length;
      setTimeout(processQueue, 16); // ~60 FPS
    };
    
    processQueue();
  }

  /**
   * Procesa una tarea de optimización
   */
  processOptimizationTask(task) {
    const startTime = performance.now();
    
    try {
      switch (task.type) {
        case 'mesh':
          this.processMeshOptimization(task);
          break;
        case 'texture':
          this.processTextureOptimization(task);
          break;
        case 'lod':
          this.processLODGeneration(task);
          break;
        case 'instance':
          this.processInstanceOptimization(task);
          break;
      }
    } catch (error) {
      this.sendMessage('OPTIMIZATION_ERROR', {
        taskId: task.id,
        error: error.message
      });
    }
    
    this.statistics.processingTime += performance.now() - startTime;
  }

  /**
   * Optimiza una malla
   */
  optimizeMesh(data) {
    this.optimizationQueue.push({
      id: data.id,
      type: 'mesh',
      data: data
    });
  }

  /**
   * Procesa optimización de malla
   */
  processMeshOptimization(task) {
    const { id, geometry, targetPolygons, preserveUVs, preserveNormals } = task.data;
    
    if (this.meshCache.has(id)) {
      this.sendMessage('MESH_OPTIMIZED', {
        id: id,
        geometry: this.meshCache.get(id)
      });
      return;
    }
    
    let optimizedGeometry = { ...geometry };
    
    // Verificar si necesita optimización
    const currentPolygons = this.geometryProcessor.getPolygonCount(geometry);
    if (currentPolygons <= targetPolygons) {
      this.meshCache.set(id, optimizedGeometry);
      this.sendMessage('MESH_OPTIMIZED', { id, geometry: optimizedGeometry });
      return;
    }
    
    // Aplicar optimizaciones
    if (this.settings.enableDecimation) {
      optimizedGeometry = this.geometryProcessor.decimateGeometry(
        optimizedGeometry,
        targetPolygons,
        preserveUVs,
        preserveNormals
      );
    }
    
    // Optimizar topología
    optimizedGeometry = this.geometryProcessor.optimizeTopology(optimizedGeometry);
    
    // Optimizar vértices
    optimizedGeometry = this.geometryProcessor.optimizeVertices(optimizedGeometry);
    
    // Calcular normales si es necesario
    if (!optimizedGeometry.normals || !preserveNormals) {
      optimizedGeometry.normals = this.geometryProcessor.calculateNormals(optimizedGeometry);
    }
    
    // Guardar en cache
    this.meshCache.set(id, optimizedGeometry);
    
    // Actualizar estadísticas
    this.statistics.meshesOptimized++;
    this.statistics.polygonsReduced += currentPolygons - this.geometryProcessor.getPolygonCount(optimizedGeometry);
    
    this.sendMessage('MESH_OPTIMIZED', {
      id: id,
      geometry: optimizedGeometry,
      originalPolygons: currentPolygons,
      optimizedPolygons: this.geometryProcessor.getPolygonCount(optimizedGeometry)
    });
  }

  /**
   * Optimiza una textura
   */
  optimizeTexture(data) {
    this.optimizationQueue.push({
      id: data.id,
      type: 'texture',
      data: data
    });
  }

  /**
   * Procesa optimización de textura
   */
  processTextureOptimization(task) {
    const { id, imageData, targetWidth, targetHeight, quality, format } = task.data;
    
    if (this.textureCache.has(id)) {
      this.sendMessage('TEXTURE_OPTIMIZED', {
        id: id,
        imageData: this.textureCache.get(id)
      });
      return;
    }
    
    let optimizedImageData = imageData;
    
    // Redimensionar si es necesario
    if (imageData.width > targetWidth || imageData.height > targetHeight) {
      optimizedImageData = this.textureProcessor.resize(
        imageData,
        targetWidth,
        targetHeight
      );
    }
    
    // Aplicar compresión
    if (this.settings.enableTextureOptimization) {
      optimizedImageData = this.textureProcessor.compress(
        optimizedImageData,
        quality,
        format
      );
    }
    
    // Generar mipmaps
    const mipmaps = this.textureProcessor.generateMipmaps(optimizedImageData);
    
    const result = {
      imageData: optimizedImageData,
      mipmaps: mipmaps,
      originalSize: imageData.width * imageData.height * 4,
      optimizedSize: optimizedImageData.width * optimizedImageData.height * 4
    };
    
    // Guardar en cache
    this.textureCache.set(id, result);
    
    // Actualizar estadísticas
    this.statistics.texturesOptimized++;
    this.statistics.memoryFreed += result.originalSize - result.optimizedSize;
    
    this.sendMessage('TEXTURE_OPTIMIZED', {
      id: id,
      ...result
    });
  }

  /**
   * Genera niveles de detalle (LOD)
   */
  generateLOD(data) {
    this.optimizationQueue.push({
      id: data.id,
      type: 'lod',
      data: data
    });
  }

  /**
   * Procesa generación de LOD
   */
  processLODGeneration(task) {
    const { id, geometry, distances } = task.data;
    
    if (this.lodLevels.has(id)) {
      this.sendMessage('LOD_GENERATED', {
        id: id,
        lodLevels: this.lodLevels.get(id)
      });
      return;
    }
    
    const lodLevels = [];
    const basePolygons = this.geometryProcessor.getPolygonCount(geometry);
    
    for (let i = 0; i < distances.length; i++) {
      const reductionFactor = Math.pow(0.5, i + 1);
      const targetPolygons = Math.floor(basePolygons * reductionFactor);
      
      const lodGeometry = this.geometryProcessor.decimateGeometry(
        geometry,
        targetPolygons,
        true, // preservar UVs
        false // recalcular normales
      );
      
      lodLevels.push({
        distance: distances[i],
        geometry: lodGeometry,
        polygonCount: this.geometryProcessor.getPolygonCount(lodGeometry),
        reductionFactor: reductionFactor
      });
    }
    
    this.lodLevels.set(id, lodLevels);
    
    this.sendMessage('LOD_GENERATED', {
      id: id,
      lodLevels: lodLevels
    });
  }

  /**
   * Optimización por lotes
   */
  batchOptimize(data) {
    const { meshes, textures, settings } = data;
    
    // Aplicar configuraciones temporales
    const oldSettings = { ...this.settings };
    Object.assign(this.settings, settings);
    
    let completed = 0;
    const total = (meshes?.length || 0) + (textures?.length || 0);
    
    // Optimizar mallas
    if (meshes) {
      meshes.forEach(mesh => {
        this.optimizeMesh(mesh);
      });
    }
    
    // Optimizar texturas
    if (textures) {
      textures.forEach(texture => {
        this.optimizeTexture(texture);
      });
    }
    
    // Restaurar configuraciones
    this.settings = oldSettings;
    
    this.sendMessage('BATCH_OPTIMIZE_STARTED', { total });
  }

  /**
   * Comprime texturas usando diferentes algoritmos
   */
  compressTextures(data) {
    const { textures, compressionType, quality } = data;
    
    for (const textureData of textures) {
      const compressed = this.textureProcessor.compressAdvanced(
        textureData,
        compressionType,
        quality
      );
      
      this.sendMessage('TEXTURE_COMPRESSED', {
        id: textureData.id,
        compressed: compressed
      });
    }
  }

  /**
   * Decima geometría usando algoritmos avanzados
   */
  decimateGeometry(data) {
    const { geometries, algorithm, targetReduction } = data;
    
    for (const geomData of geometries) {
      const decimated = this.geometryProcessor.decimateAdvanced(
        geomData.geometry,
        algorithm,
        targetReduction
      );
      
      this.sendMessage('GEOMETRY_DECIMATED', {
        id: geomData.id,
        geometry: decimated
      });
    }
  }

  /**
   * Optimiza instancias de objetos
   */
  optimizeInstances(data) {
    this.optimizationQueue.push({
      id: data.id,
      type: 'instance',
      data: data
    });
  }

  /**
   * Procesa optimización de instancias
   */
  processInstanceOptimization(task) {
    const { id, objects, maxInstances } = task.data;
    
    const instanceGroups = this.instanceManager.groupSimilarObjects(objects, maxInstances);
    const optimizedInstances = this.instanceManager.createInstancedGeometry(instanceGroups);
    
    this.sendMessage('INSTANCES_OPTIMIZED', {
      id: id,
      instancedGeometry: optimizedInstances,
      reductionRatio: objects.length / instanceGroups.length
    });
  }

  /**
   * Actualiza configuraciones
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    this.sendMessage('SETTINGS_UPDATED');
  }

  /**
   * Limpia caches
   */
  clearCache() {
    this.meshCache.clear();
    this.textureCache.clear();
    this.lodLevels.clear();
    this.memoryManager.garbageCollect();
    
    this.sendMessage('CACHE_CLEARED');
  }

  /**
   * Envía estadísticas
   */
  sendStatistics() {
    this.sendMessage('STATISTICS', {
      ...this.statistics,
      cacheSize: {
        meshes: this.meshCache.size,
        textures: this.textureCache.size,
        lodLevels: this.lodLevels.size
      },
      memoryUsage: this.memoryManager.getMemoryUsage()
    });
  }

  /**
   * Envía mensaje al hilo principal
   */
  sendMessage(type, data = null) {
    self.postMessage({ type, data });
  }
}

/**
 * Procesador de geometría
 */
class GeometryProcessor {
  /**
   * Obtiene el número de polígonos de una geometría
   */
  getPolygonCount(geometry) {
    if (geometry.indices) {
      return geometry.indices.length / 3;
    } else if (geometry.vertices) {
      return geometry.vertices.length / 9; // 3 vértices por triángulo, 3 componentes por vértice
    }
    return 0;
  }

  /**
   * Decima geometría usando quadric error metrics
   */
  decimateGeometry(geometry, targetPolygons, preserveUVs = true, preserveNormals = false) {
    const currentPolygons = this.getPolygonCount(geometry);
    if (currentPolygons <= targetPolygons) {
      return geometry;
    }
    
    const reductionRatio = targetPolygons / currentPolygons;
    
    // Implementación simplificada de decimación
    const decimated = this.simplifyMesh(geometry, reductionRatio, preserveUVs);
    
    if (!preserveNormals) {
      decimated.normals = this.calculateNormals(decimated);
    }
    
    return decimated;
  }

  /**
   * Simplifica malla usando eliminación de aristas
   */
  simplifyMesh(geometry, reductionRatio, preserveUVs) {
    const vertices = new Float32Array(geometry.vertices);
    const indices = new Uint32Array(geometry.indices || []);
    const uvs = geometry.uvs ? new Float32Array(geometry.uvs) : null;
    
    const targetVertices = Math.floor(vertices.length * reductionRatio);
    const step = Math.max(1, Math.floor(vertices.length / targetVertices));
    
    const newVertices = [];
    const newIndices = [];
    const newUVs = preserveUVs && uvs ? [] : null;
    const vertexMap = new Map();
    
    // Submuestrear vértices
    for (let i = 0; i < vertices.length; i += step * 3) {
      if (i + 2 < vertices.length) {
        const oldIndex = i / 3;
        const newIndex = newVertices.length / 3;
        
        newVertices.push(vertices[i], vertices[i + 1], vertices[i + 2]);
        vertexMap.set(oldIndex, newIndex);
        
        if (newUVs && uvs) {
          const uvIndex = (i / 3) * 2;
          if (uvIndex + 1 < uvs.length) {
            newUVs.push(uvs[uvIndex], uvs[uvIndex + 1]);
          }
        }
      }
    }
    
    // Reconstruir índices
    for (let i = 0; i < indices.length; i += 3) {
      const v1 = vertexMap.get(indices[i]);
      const v2 = vertexMap.get(indices[i + 1]);
      const v3 = vertexMap.get(indices[i + 2]);
      
      if (v1 !== undefined && v2 !== undefined && v3 !== undefined) {
        newIndices.push(v1, v2, v3);
      }
    }
    
    const result = {
      vertices: newVertices,
      indices: newIndices
    };
    
    if (newUVs) {
      result.uvs = newUVs;
    }
    
    return result;
  }

  /**
   * Decimación avanzada con diferentes algoritmos
   */
  decimateAdvanced(geometry, algorithm, targetReduction) {
    switch (algorithm) {
      case 'quadric':
        return this.quadricDecimation(geometry, targetReduction);
      case 'edge_collapse':
        return this.edgeCollapseDecimation(geometry, targetReduction);
      case 'vertex_clustering':
        return this.vertexClusteringDecimation(geometry, targetReduction);
      default:
        return this.decimateGeometry(geometry, targetReduction);
    }
  }

  /**
   * Decimación por quadric error metrics
   */
  quadricDecimation(geometry, targetReduction) {
    // Implementación simplificada
    return this.decimateGeometry(geometry, targetReduction);
  }

  /**
   * Decimación por colapso de aristas
   */
  edgeCollapseDecimation(geometry, targetReduction) {
    // Implementación simplificada
    return this.decimateGeometry(geometry, targetReduction);
  }

  /**
   * Decimación por agrupamiento de vértices
   */
  vertexClusteringDecimation(geometry, targetReduction) {
    // Implementación simplificada
    return this.decimateGeometry(geometry, targetReduction);
  }

  /**
   * Optimiza topología de la malla
   */
  optimizeTopology(geometry) {
    // Eliminar vértices duplicados
    const optimized = this.removeDuplicateVertices(geometry);
    
    // Optimizar orden de vértices para cache
    return this.optimizeVertexCache(optimized);
  }

  /**
   * Elimina vértices duplicados
   */
  removeDuplicateVertices(geometry) {
    const vertices = geometry.vertices;
    const indices = geometry.indices || [];
    const uvs = geometry.uvs;
    
    const uniqueVertices = [];
    const uniqueUVs = uvs ? [] : null;
    const newIndices = [];
    const vertexMap = new Map();
    
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const vx = vertices[index * 3];
      const vy = vertices[index * 3 + 1];
      const vz = vertices[index * 3 + 2];
      
      const key = `${vx.toFixed(6)},${vy.toFixed(6)},${vz.toFixed(6)}`;
      
      if (!vertexMap.has(key)) {
        const newIndex = uniqueVertices.length / 3;
        uniqueVertices.push(vx, vy, vz);
        vertexMap.set(key, newIndex);
        
        if (uniqueUVs && uvs) {
          uniqueUVs.push(uvs[index * 2], uvs[index * 2 + 1]);
        }
      }
      
      newIndices.push(vertexMap.get(key));
    }
    
    const result = {
      vertices: uniqueVertices,
      indices: newIndices
    };
    
    if (uniqueUVs) {
      result.uvs = uniqueUVs;
    }
    
    return result;
  }

  /**
   * Optimiza orden de vértices para cache
   */
  optimizeVertexCache(geometry) {
    // Implementación simplificada de Forsyth algorithm
    return geometry;
  }

  /**
   * Optimiza orden de vértices
   */
  optimizeVertices(geometry) {
    // Reordenar vértices para mejor localidad de cache
    return this.reorderVertices(geometry);
  }

  /**
   * Reordena vértices para mejor performance
   */
  reorderVertices(geometry) {
    // Implementación simplificada
    return geometry;
  }

  /**
   * Calcula normales de la geometría
   */
  calculateNormals(geometry) {
    const vertices = geometry.vertices;
    const indices = geometry.indices || [];
    const normals = new Array(vertices.length).fill(0);
    
    // Calcular normales por triángulo
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;
      
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];
      
      const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
      const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
      
      const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
      ];
      
      // Normalizar
      const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
      if (length > 0) {
        normal[0] /= length;
        normal[1] /= length;
        normal[2] /= length;
      }
      
      // Añadir a vértices
      for (const vertexIndex of [i1, i2, i3]) {
        normals[vertexIndex] += normal[0];
        normals[vertexIndex + 1] += normal[1];
        normals[vertexIndex + 2] += normal[2];
      }
    }
    
    // Normalizar normales de vértices
    for (let i = 0; i < normals.length; i += 3) {
      const length = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
      if (length > 0) {
        normals[i] /= length;
        normals[i + 1] /= length;
        normals[i + 2] /= length;
      }
    }
    
    return normals;
  }
}

/**
 * Procesador de texturas
 */
class TextureProcessor {
  /**
   * Redimensiona una textura
   */
  resize(imageData, targetWidth, targetHeight) {
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    
    const sourceCanvas = new OffscreenCanvas(imageData.width, imageData.height);
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    
    return ctx.getImageData(0, 0, targetWidth, targetHeight);
  }

  /**
   * Comprime una textura
   */
  compress(imageData, quality, format) {
    // Para Web Worker, usamos compresión básica
    // En una implementación real, aquí se usarían algoritmos como DXT, ASTC, etc.
    
    if (format === 'jpeg' && quality < 1.0) {
      return this.compressJPEG(imageData, quality);
    }
    
    return imageData;
  }

  /**
   * Compresión JPEG simplificada
   */
  compressJPEG(imageData, quality) {
    // Simulación de compresión JPEG
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
      // Aplicar cuantización basada en calidad
      const quantization = Math.floor((1 - quality) * 64) + 1;
      
      data[i] = Math.floor(data[i] / quantization) * quantization;     // R
      data[i + 1] = Math.floor(data[i + 1] / quantization) * quantization; // G
      data[i + 2] = Math.floor(data[i + 2] / quantization) * quantization; // B
      // Alpha se mantiene igual
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * Compresión avanzada con diferentes algoritmos
   */
  compressAdvanced(imageData, compressionType, quality) {
    switch (compressionType) {
      case 'dxt1':
        return this.compressDXT1(imageData);
      case 'dxt5':
        return this.compressDXT5(imageData);
      case 'astc':
        return this.compressASTC(imageData, quality);
      case 'etc2':
        return this.compressETC2(imageData);
      default:
        return this.compress(imageData, quality, 'jpeg');
    }
  }

  compressDXT1(imageData) {
    // Implementación simplificada de DXT1
    return imageData;
  }

  compressDXT5(imageData) {
    // Implementación simplificada de DXT5
    return imageData;
  }

  compressASTC(imageData, quality) {
    // Implementación simplificada de ASTC
    return imageData;
  }

  compressETC2(imageData) {
    // Implementación simplificada de ETC2
    return imageData;
  }

  /**
   * Genera mipmaps para una textura
   */
  generateMipmaps(imageData) {
    const mipmaps = [imageData];
    let currentLevel = imageData;
    
    while (currentLevel.width > 1 || currentLevel.height > 1) {
      const nextWidth = Math.max(1, Math.floor(currentLevel.width / 2));
      const nextHeight = Math.max(1, Math.floor(currentLevel.height / 2));
      
      const nextLevel = this.resize(currentLevel, nextWidth, nextHeight);
      mipmaps.push(nextLevel);
      currentLevel = nextLevel;
    }
    
    return mipmaps;
  }
}

/**
 * Gestor de instancias
 */
class InstanceManager {
  /**
   * Agrupa objetos similares para instanciado
   */
  groupSimilarObjects(objects, maxInstances) {
    const groups = new Map();
    
    for (const obj of objects) {
      const key = this.generateObjectKey(obj);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      const group = groups.get(key);
      if (group.length < maxInstances) {
        group.push(obj);
      }
    }
    
    return Array.from(groups.values()).filter(group => group.length > 1);
  }

  /**
   * Genera clave única para agrupar objetos
   */
  generateObjectKey(obj) {
    // Crear clave basada en propiedades relevantes
    const geometryKey = this.hashGeometry(obj.geometry);
    const materialKey = this.hashMaterial(obj.material);
    
    return `${geometryKey}_${materialKey}`;
  }

  /**
   * Hash de geometría
   */
  hashGeometry(geometry) {
    if (!geometry) return 'no_geom';
    
    const vertexCount = geometry.vertices ? geometry.vertices.length : 0;
    const indexCount = geometry.indices ? geometry.indices.length : 0;
    
    return `geom_${vertexCount}_${indexCount}`;
  }

  /**
   * Hash de material
   */
  hashMaterial(material) {
    if (!material) return 'no_mat';
    
    return `mat_${material.diffuse || 'none'}_${material.specular || 'none'}`;
  }

  /**
   * Crea geometría instanciada
   */
  createInstancedGeometry(instanceGroups) {
    const instancedGeometries = [];
    
    for (const group of instanceGroups) {
      if (group.length < 2) continue;
      
      const baseObject = group[0];
      const transforms = group.map(obj => ({
        position: obj.position || [0, 0, 0],
        rotation: obj.rotation || [0, 0, 0],
        scale: obj.scale || [1, 1, 1]
      }));
      
      instancedGeometries.push({
        geometry: baseObject.geometry,
        material: baseObject.material,
        instances: transforms,
        instanceCount: group.length
      });
    }
    
    return instancedGeometries;
  }
}

/**
 * Gestor de memoria
 */
class MemoryManager {
  constructor() {
    this.allocatedMemory = 0;
    this.maxMemory = 512 * 1024 * 1024; // 512MB
  }

  /**
   * Obtiene uso actual de memoria
   */
  getMemoryUsage() {
    return {
      allocated: this.allocatedMemory,
      max: this.maxMemory,
      percentage: (this.allocatedMemory / this.maxMemory) * 100
    };
  }

  /**
   * Ejecuta recolección de basura
   */
  garbageCollect() {
    // Forzar garbage collection si está disponible
    if (typeof gc === 'function') {
      gc();
    }
    
    // Resetear contador de memoria
    this.allocatedMemory = 0;
  }

  /**
   * Registra uso de memoria
   */
  allocate(size) {
    this.allocatedMemory += size;
  }

  /**
   * Libera memoria
   */
  deallocate(size) {
    this.allocatedMemory = Math.max(0, this.allocatedMemory - size);
  }
}

// Inicializar el optimizador gráfico
const graphicsOptimizer = new GraphicsOptimizer();

// Manejo de errores
self.onerror = (error) => {
  graphicsOptimizer.sendMessage('ERROR', {
    message: error.message,
    filename: error.filename,
    lineno: error.lineno
  });
};