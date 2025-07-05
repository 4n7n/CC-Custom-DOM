/**
 * Level of Detail (LOD) System - RAMA 5 Graphics Immersive
 * Sistema de niveles de detalle adaptativos para optimización gráfica
 */

class LevelOfDetailSystem {
  constructor(camera, memoryManager) {
    this.camera = camera;
    this.memoryManager = memoryManager;
    this.enabled = true;
    
    this.lodLevels = [
      { name: 'ultra', distance: 0, detail: 1.0, textureSize: 1024, particles: 1.0 },
      { name: 'high', distance: 50, detail: 0.8, textureSize: 512, particles: 0.8 },
      { name: 'medium', distance: 150, detail: 0.6, textureSize: 256, particles: 0.6 },
      { name: 'low', distance: 300, detail: 0.4, textureSize: 128, particles: 0.4 },
      { name: 'minimal', distance: 600, detail: 0.2, textureSize: 64, particles: 0.2 }
    ];
    
    this.objectLODs = new Map(); // Cache de LODs por objeto
    this.geometryCache = new Map(); // Cache de geometrías por nivel
    this.textureCache = new Map(); // Cache de texturas por nivel
    
    this.settings = {
      geometricErrorThreshold: 1.0, // Error geométrico aceptable en píxeles
      textureLODBias: 0.0,
      morphingEnabled: true,
      morphingDistance: 10.0,
      fadeTransitions: true,
      adaptiveThresholds: true,
      qualityBudget: 1000000 // Triángulos máximos en pantalla
    };
    
    this.statistics = {
      totalObjects: 0,
      objectsPerLOD: { ultra: 0, high: 0, medium: 0, low: 0, minimal: 0 },
      trianglesRendered: 0,
      trianglesSaved: 0,
      memoryUsed: 0,
      memorySaved: 0
    };
    
    this.performanceHistory = [];
    this.frameCounter = 0;
    this.lastCameraPosition = { x: 0, y: 0, z: 0 };
    
    this.initialize();
  }

  /**
   * Inicializa el sistema LOD
   */
  initialize() {
    this.setupGeometryGenerators();
    this.setupTextureGenerators();
    this.setupPerformanceMonitoring();
  }

  /**
   * Configura los generadores de geometría
   */
  setupGeometryGenerators() {
    this.geometryGenerators = {
      sphere: this.createSphereGenerator(),
      cube: this.createCubeGenerator(),
      plane: this.createPlaneGenerator(),
      cylinder: this.createCylinderGenerator()
    };
  }

  /**
   * Configura los generadores de texturas
   */
  setupTextureGenerators() {
    this.textureGenerators = {
      mipmap: this.createMipmapGenerator(),
      resize: this.createResizeGenerator(),
      compress: this.createCompressionGenerator()
    };
  }

  /**
   * Configura el monitoreo de rendimiento
   */
  setupPerformanceMonitoring() {
    setInterval(() => {
      this.updatePerformanceMetrics();
      if (this.settings.adaptiveThresholds) {
        this.adaptLODThresholds();
      }
    }, 1000);
  }

  /**
   * Procesa objetos y asigna LODs apropiados
   */
  processObjects(objects) {
    if (!this.enabled) return objects;
    
    this.frameCounter++;
    this.resetStatistics();
    
    const cameraPosition = this.camera.getPosition();
    const processedObjects = [];
    let triangleBudget = this.settings.qualityBudget;
    
    // Ordenar objetos por importancia (distancia, tamaño, prioridad)
    const sortedObjects = this.sortObjectsByImportance(objects, cameraPosition);
    
    for (const object of sortedObjects) {
      const distance = this.calculateDistance(object.position, cameraPosition);
      const lodLevel = this.calculateLODLevel(object, distance, triangleBudget);
      
      const processedObject = this.applyLOD(object, lodLevel, distance);
      
      if (processedObject) {
        processedObjects.push(processedObject);
        triangleBudget -= processedObject.triangleCount || 0;
        
        if (triangleBudget <= 0) {
          break; // Presupuesto agotado
        }
      }
    }
    
    return processedObjects;
  }

  /**
   * Calcula el nivel LOD apropiado para un objeto
   */
  calculateLODLevel(object, distance, remainingBudget) {
    // Factor base por distancia
    let lodIndex = 0;
    for (let i = 0; i < this.lodLevels.length - 1; i++) {
      if (distance >= this.lodLevels[i + 1].distance) {
        lodIndex = i + 1;
      } else {
        break;
      }
    }
    
    // Ajustar por importancia del objeto
    const importance = this.calculateObjectImportance(object);
    lodIndex = Math.max(0, lodIndex - Math.floor(importance));
    
    // Ajustar por presupuesto de triángulos restante
    const estimatedTriangles = this.estimateTriangleCount(object, lodIndex);
    if (estimatedTriangles > remainingBudget * 0.5 && lodIndex < this.lodLevels.length - 1) {
      lodIndex++; // Reducir LOD si consume mucho presupuesto
    }
    
    // Ajustar por tamaño proyectado en pantalla
    const screenSize = this.calculateScreenSize(object, distance);
    if (screenSize < 0.01) { // Menos del 1% de la pantalla
      lodIndex = Math.min(this.lodLevels.length - 1, lodIndex + 1);
    }
    
    return Math.min(lodIndex, this.lodLevels.length - 1);
  }

  /**
   * Calcula la importancia de un objeto (0-2)
   */
  calculateObjectImportance(object) {
    let importance = 0;
    
    // Objetos del jugador o interactivos son más importantes
    if (object.isPlayer) importance += 2;
    else if (object.isInteractive) importance += 1;
    
    // Objetos en movimiento son más importantes
    if (object.velocity && this.vectorLength(object.velocity) > 0.1) {
      importance += 1;
    }
    
    // Objetos iluminados o que emiten luz son más importantes
    if (object.isLightSource || object.receivesLighting) {
      importance += 0.5;
    }
    
    return importance;
  }

  /**
   * Calcula el tamaño proyectado en pantalla
   */
  calculateScreenSize(object, distance) {
    const boundingBox = object.getBoundingBox ? object.getBoundingBox() : { size: 1 };
    const objectSize = boundingBox.size || 1;
    
    const fov = this.camera.getFOV();
    const screenHeight = this.camera.getViewportHeight();
    
    const projectedSize = (objectSize * screenHeight) / (2 * distance * Math.tan(fov * 0.5));
    return projectedSize / screenHeight;
  }

  /**
   * Estima el número de triángulos para un objeto en un LOD específico
   */
  estimateTriangleCount(object, lodIndex) {
    const baseTris = object.triangleCount || 1000; // Valor por defecto
    const lodDetail = this.lodLevels[lodIndex].detail;
    return Math.floor(baseTris * lodDetail * lodDetail); // Cuadrático
  }

  /**
   * Aplica el LOD a un objeto
   */
  applyLOD(object, lodIndex, distance) {
    const lodLevel = this.lodLevels[lodIndex];
    const cacheKey = `${object.id}_${lodIndex}`;
    
    // Verificar cache de objetos LOD
    if (this.objectLODs.has(cacheKey)) {
      const cachedLOD = this.objectLODs.get(cacheKey);
      cachedLOD.lastUsed = this.frameCounter;
      this.updateLODStatistics(cachedLOD, lodLevel.name);
      return cachedLOD;
    }
    
    // Crear nueva versión LOD
    const lodObject = this.createLODObject(object, lodLevel, distance);
    
    // Guardar en cache
    this.objectLODs.set(cacheKey, lodObject);
    this.updateLODStatistics(lodObject, lodLevel.name);
    
    return lodObject;
  }

  /**
   * Crea un objeto con el LOD especificado
   */
  createLODObject(object, lodLevel, distance) {
    const lodObject = { ...object };
    
    // Aplicar LOD de geometría
    lodObject.geometry = this.applyGeometryLOD(object, lodLevel);
    
    // Aplicar LOD de texturas
    lodObject.textures = this.applyTextureLOD(object, lodLevel, distance);
    
    // Aplicar LOD de materiales
    lodObject.material = this.applyMaterialLOD(object, lodLevel);
    
    // Aplicar LOD de animaciones
    if (object.animations) {
      lodObject.animations = this.applyAnimationLOD(object, lodLevel);
    }
    
    // Aplicar morphing si está habilitado
    if (this.settings.morphingEnabled && distance < this.settings.morphingDistance) {
      lodObject.morphing = this.calculateMorphing(object, lodLevel, distance);
    }
    
    lodObject.lodLevel = lodLevel.name;
    lodObject.lodDistance = distance;
    lodObject.triangleCount = this.estimateTriangleCount(object, this.lodLevels.indexOf(lodLevel));
    lodObject.lastUsed = this.frameCounter;
    
    return lodObject;
  }

  /**
   * Aplica LOD de geometría
   */
  applyGeometryLOD(object, lodLevel) {
    const cacheKey = `${object.geometryType}_${lodLevel.name}`;
    
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey);
    }
    
    let lodGeometry;
    const generator = this.geometryGenerators[object.geometryType];
    
    if (generator) {
      lodGeometry = generator(object.geometry, lodLevel.detail);
    } else {
      // Simplificación genérica
      lodGeometry = this.simplifyGeometry(object.geometry, lodLevel.detail);
    }
    
    this.geometryCache.set(cacheKey, lodGeometry);
    return lodGeometry;
  }

  /**
   * Aplica LOD de texturas
   */
  applyTextureLOD(object, lodLevel, distance) {
    if (!object.textures) return null;
    
    const lodTextures = {};
    
    for (const [name, texture] of Object.entries(object.textures)) {
      const cacheKey = `${texture.id}_${lodLevel.textureSize}`;
      
      if (this.textureCache.has(cacheKey)) {
        lodTextures[name] = this.textureCache.get(cacheKey);
      } else {
        const lodTexture = this.createLODTexture(texture, lodLevel, distance);
        this.textureCache.set(cacheKey, lodTexture);
        lodTextures[name] = lodTexture;
      }
    }
    
    return lodTextures;
  }

  /**
   * Crea una textura con LOD
   */
  createLODTexture(texture, lodLevel, distance) {
    const targetSize = lodLevel.textureSize;
    
    // Determinar método de reducción basado en distancia
    let method = 'resize';
    if (distance > 200) method = 'compress';
    if (distance > 500) method = 'mipmap';
    
    const generator = this.textureGenerators[method];
    return generator(texture, targetSize, lodLevel.detail);
  }

  /**
   * Aplica LOD de materiales
   */
  applyMaterialLOD(object, lodLevel) {
    if (!object.material) return null;
    
    const lodMaterial = { ...object.material };
    
    // Reducir complejidad del shader
    if (lodLevel.detail < 0.6) {
      lodMaterial.normalMapping = false;
      lodMaterial.parallaxMapping = false;
    }
    
    if (lodLevel.detail < 0.4) {
      lodMaterial.specularMapping = false;
      lodMaterial.reflections = false;
    }
    
    if (lodLevel.detail < 0.2) {
      lodMaterial.shadows = false;
      lodMaterial.lighting = 'simple';
    }
    
    return lodMaterial;
  }

  /**
   * Aplica LOD de animaciones
   */
  applyAnimationLOD(object, lodLevel) {
    const lodAnimations = { ...object.animations };
    
    // Reducir FPS de animaciones
    lodAnimations.fps = Math.max(12, object.animations.fps * lodLevel.detail);
    
    // Simplificar interpolación
    if (lodLevel.detail < 0.5) {
      lodAnimations.interpolation = 'linear';
    }
    
    if (lodLevel.detail < 0.3) {
      lodAnimations.interpolation = 'step';
    }
    
    return lodAnimations;
  }

  /**
   * Calcula parámetros de morphing entre niveles LOD
   */
  calculateMorphing(object, lodLevel, distance) {
    const currentLODIndex = this.lodLevels.indexOf(lodLevel);
    if (currentLODIndex === 0) return null;
    
    const prevLOD = this.lodLevels[currentLODIndex - 1];
    const transitionStart = prevLOD.distance;
    const transitionEnd = lodLevel.distance;
    
    if (distance >= transitionStart && distance <= transitionEnd) {
      const factor = (distance - transitionStart) / (transitionEnd - transitionStart);
      return {
        enabled: true,
        factor: factor,
        fromLOD: prevLOD.name,
        toLOD: lodLevel.name
      };
    }
    
    return null;
  }

  /**
   * Ordena objetos por importancia para renderizado
   */
  sortObjectsByImportance(objects, cameraPosition) {
    return objects.sort((a, b) => {
      const distanceA = this.calculateDistance(a.position, cameraPosition);
      const distanceB = this.calculateDistance(b.position, cameraPosition);
      
      const importanceA = this.calculateObjectImportance(a);
      const importanceB = this.calculateObjectImportance(b);
      
      const screenSizeA = this.calculateScreenSize(a, distanceA);
      const screenSizeB = this.calculateScreenSize(b, distanceB);
      
      // Puntaje compuesto (importancia * tamaño en pantalla / distancia)
      const scoreA = (importanceA + 1) * screenSizeA / Math.max(distanceA, 1);
      const scoreB = (importanceB + 1) * screenSizeB / Math.max(distanceB, 1);
      
      return scoreB - scoreA;
    });
  }

  /**
   * Simplifica geometría genéricamente
   */
  simplifyGeometry(geometry, detail) {
    if (!geometry || !geometry.vertices) return geometry;
    
    const simplifiedGeometry = { ...geometry };
    const targetVertices = Math.floor(geometry.vertices.length * detail);
    
    if (targetVertices < geometry.vertices.length) {
      // Simplificación básica por decimación
      simplifiedGeometry.vertices = this.decimateVertices(geometry.vertices, targetVertices);
      simplifiedGeometry.indices = this.rebuildIndices(simplifiedGeometry.vertices);
    }
    
    return simplifiedGeometry;
  }

  /**
   * Decima vértices manteniendo forma aproximada
   */
  decimateVertices(vertices, targetCount) {
    if (vertices.length <= targetCount) return vertices;
    
    const step = vertices.length / targetCount;
    const decimated = [];
    
    for (let i = 0; i < vertices.length; i += step) {
      decimated.push(vertices[Math.floor(i)]);
    }
    
    return decimated.slice(0, targetCount);
  }

  /**
   * Reconstruye índices después de decimación
   */
  rebuildIndices(vertices) {
    const indices = [];
    
    // Triangulación simple para geometría decimada
    for (let i = 0; i < vertices.length - 2; i++) {
      indices.push(i, i + 1, i + 2);
    }
    
    return indices;
  }

  /**
   * Generadores de geometría específicos
   */
  createSphereGenerator() {
    return (originalGeometry, detail) => {
      const segments = Math.max(8, Math.floor(originalGeometry.segments * detail));
      return this.generateSphere(originalGeometry.radius, segments);
    };
  }

  createCubeGenerator() {
    return (originalGeometry, detail) => {
      const subdivisions = Math.max(1, Math.floor(originalGeometry.subdivisions * detail));
      return this.generateCube(originalGeometry.size, subdivisions);
    };
  }

  createPlaneGenerator() {
    return (originalGeometry, detail) => {
      const width = Math.max(1, Math.floor(originalGeometry.widthSegments * detail));
      const height = Math.max(1, Math.floor(originalGeometry.heightSegments * detail));
      return this.generatePlane(originalGeometry.width, originalGeometry.height, width, height);
    };
  }

  createCylinderGenerator() {
    return (originalGeometry, detail) => {
      const segments = Math.max(8, Math.floor(originalGeometry.segments * detail));
      return this.generateCylinder(originalGeometry.radius, originalGeometry.height, segments);
    };
  }

  /**
   * Genera geometría de esfera
   */
  generateSphere(radius, segments) {
    const vertices = [];
    const indices = [];
    
    for (let lat = 0; lat <= segments; lat++) {
      const theta = lat * Math.PI / segments;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      
      for (let lon = 0; lon <= segments; lon++) {
        const phi = lon * 2 * Math.PI / segments;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        
        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        
        vertices.push({
          position: [x * radius, y * radius, z * radius],
          normal: [x, y, z],
          uv: [1 - (lon / segments), 1 - (lat / segments)]
        });
      }
    }
    
    // Generar índices
    for (let lat = 0; lat < segments; lat++) {
      for (let lon = 0; lon < segments; lon++) {
        const first = lat * (segments + 1) + lon;
        const second = first + segments + 1;
        
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }
    
    return { vertices, indices, type: 'sphere' };
  }

  /**
   * Genera geometría de cubo
   */
  generateCube(size, subdivisions) {
    const vertices = [];
    const indices = [];
    
    // Implementación simplificada - en producción sería más completa
    const half = size / 2;
    const step = size / subdivisions;
    
    // Generar vértices para cada cara
    for (let face = 0; face < 6; face++) {
      for (let i = 0; i <= subdivisions; i++) {
        for (let j = 0; j <= subdivisions; j++) {
          const u = i / subdivisions;
          const v = j / subdivisions;
          
          let position;
          let normal;
          
          switch (face) {
            case 0: // Front
              position = [-half + u * size, -half + v * size, half];
              normal = [0, 0, 1];
              break;
            case 1: // Back
              position = [half - u * size, -half + v * size, -half];
              normal = [0, 0, -1];
              break;
            // ... otras caras
            default:
              position = [0, 0, 0];
              normal = [0, 1, 0];
          }
          
          vertices.push({
            position: position,
            normal: normal,
            uv: [u, v]
          });
        }
      }
    }
    
    return { vertices, indices, type: 'cube' };
  }

  /**
   * Generadores de texturas
   */
  createMipmapGenerator() {
    return (texture, targetSize, detail) => {
      // Usar mipmaps existentes o generar nuevos
      const mipLevel = Math.log2(texture.width / targetSize);
      return {
        ...texture,
        mipLevel: Math.floor(mipLevel),
        width: targetSize,
        height: targetSize
      };
    };
  }

  createResizeGenerator() {
    return (texture, targetSize, detail) => {
      // Redimensionar textura manteniendo aspecto
      const aspect = texture.width / texture.height;
      const width = targetSize;
      const height = Math.floor(targetSize / aspect);
      
      return {
        ...texture,
        width: width,
        height: height,
        resized: true
      };
    };
  }

  createCompressionGenerator() {
    return (texture, targetSize, detail) => {
      // Aplicar compresión apropiada
      let format = texture.format;
      
      if (detail < 0.3) {
        format = 'DXT1'; // Compresión alta
      } else if (detail < 0.6) {
        format = 'DXT5'; // Compresión media
      }
      
      return {
        ...texture,
        format: format,
        compressed: true,
        compressionRatio: 1 - detail
      };
    };
  }

  /**
   * Actualiza métricas de rendimiento
   */
  updatePerformanceMetrics() {
    const currentMetrics = {
      frameTime: performance.now(),
      trianglesRendered: this.statistics.trianglesRendered,
      memoryUsed: this.statistics.memoryUsed,
      lodDistribution: { ...this.statistics.objectsPerLOD }
    };
    
    this.performanceHistory.push(currentMetrics);
    
    // Mantener solo los últimos 60 frames
    if (this.performanceHistory.length > 60) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Adapta umbrales LOD basado en rendimiento
   */
  adaptLODThresholds() {
    if (this.performanceHistory.length < 10) return;
    
    const avgFrameTime = this.performanceHistory.reduce((sum, m) => sum + m.frameTime, 0) / this.performanceHistory.length;
    const targetFrameTime = 16.67; // 60 FPS
    
    if (avgFrameTime > targetFrameTime * 1.2) {
      // Rendimiento bajo: aumentar distancias LOD
      this.lodLevels.forEach(level => {
        level.distance *= 0.9;
      });
    } else if (avgFrameTime < targetFrameTime * 0.8) {
      // Buen rendimiento: reducir distancias LOD
      this.lodLevels.forEach(level => {
        level.distance *= 1.05;
      });
    }
  }

  /**
   * Actualiza estadísticas LOD
   */
  updateLODStatistics(lodObject, lodName) {
    this.statistics.totalObjects++;
    this.statistics.objectsPerLOD[lodName]++;
    this.statistics.trianglesRendered += lodObject.triangleCount || 0;
    
    if (lodObject.memoryUsage) {
      this.statistics.memoryUsed += lodObject.memoryUsage;
    }
  }

  /**
   * Resetea estadísticas del frame
   */
  resetStatistics() {
    this.statistics.totalObjects = 0;
    this.statistics.objectsPerLOD = { ultra: 0, high: 0, medium: 0, low: 0, minimal: 0 };
    this.statistics.trianglesRendered = 0;
    this.statistics.memoryUsed = 0;
  }

  /**
   * Limpia caches antiguos
   */
  cleanupCaches() {
    const maxAge = 300; // 5 minutos en frames
    
    // Limpiar cache de objetos LOD
    for (const [key, object] of this.objectLODs) {
      if (this.frameCounter - object.lastUsed > maxAge) {
        this.objectLODs.delete(key);
      }
    }
    
    // Limpiar cache de geometrías
    if (this.geometryCache.size > 100) {
      const entries = Array.from(this.geometryCache.entries());
      const toDelete = entries.slice(0, entries.length - 50);
      toDelete.forEach(([key]) => this.geometryCache.delete(key));
    }
  }

  /**
   * Utilidades matemáticas
   */
  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  vectorLength(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  }

  /**
   * Métodos públicos de configuración
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  updateLODLevels(newLevels) {
    this.lodLevels = newLevels;
    this.clearCaches();
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  clearCaches() {
    this.objectLODs.clear();
    this.geometryCache.clear();
    this.textureCache.clear();
  }

  getStatistics() {
    return { ...this.statistics };
  }

  getCurrentLODLevels() {
    return [...this.lodLevels];
  }
}

export default LevelOfDetailSystem;