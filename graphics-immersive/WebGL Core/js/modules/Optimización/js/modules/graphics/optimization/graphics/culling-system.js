/**
 * Culling System - RAMA 5 Graphics Immersive
 * Sistema de culling avanzado para optimización de renderizado
 */

class CullingSystem {
  constructor(camera, performanceMonitor) {
    this.camera = camera;
    this.performanceMonitor = performanceMonitor;
    this.enabled = true;
    
    this.cullingTypes = {
      frustum: true,
      occlusion: true,
      distance: true,
      backface: true,
      size: true
    };
    
    this.statistics = {
      totalObjects: 0,
      visibleObjects: 0,
      culledObjects: 0,
      frustumCulled: 0,
      occlusionCulled: 0,
      distanceCulled: 0,
      sizeCulled: 0,
      backfaceCulled: 0
    };
    
    this.settings = {
      maxDrawDistance: 1000.0,
      minObjectSize: 2.0, // píxeles
      occlusionQueryDelay: 3, // frames
      lodDistances: [50, 150, 300, 600],
      aggressiveCulling: false,
      adaptiveSettings: true
    };
    
    this.frustumPlanes = [];
    this.occlusionQueries = new Map();
    this.visibilityCache = new Map();
    this.spatialGrid = new SpatialGrid(100); // 100 unidades por celda
    
    this.frameCounter = 0;
    this.lastCameraPosition = { x: 0, y: 0, z: 0 };
    this.lastCameraRotation = { x: 0, y: 0, z: 0 };
    this.cameraMovementThreshold = 0.1;
    
    this.initialize();
  }

  /**
   * Inicializa el sistema de culling
   */
  initialize() {
    this.setupFrustumPlanes();
    this.setupOcclusionQueries();
    this.setupPerformanceAdaptation();
  }

  /**
   * Configura los planos del frustum
   */
  setupFrustumPlanes() {
    this.frustumPlanes = [
      { normal: { x: 0, y: 0, z: 0 }, distance: 0 }, // Left
      { normal: { x: 0, y: 0, z: 0 }, distance: 0 }, // Right
      { normal: { x: 0, y: 0, z: 0 }, distance: 0 }, // Top
      { normal: { x: 0, y: 0, z: 0 }, distance: 0 }, // Bottom
      { normal: { x: 0, y: 0, z: 0 }, distance: 0 }, // Near
      { normal: { x: 0, y: 0, z: 0 }, distance: 0 }  // Far
    ];
  }

  /**
   * Configura las consultas de oclusión
   */
  setupOcclusionQueries() {
    if (this.camera.gl && this.camera.gl.getExtension('EXT_disjoint_timer_query_webgl2')) {
      this.occlusionQueriesSupported = true;
    } else {
      this.occlusionQueriesSupported = false;
      this.cullingTypes.occlusion = false;
    }
  }

  /**
   * Configura la adaptación de rendimiento
   */
  setupPerformanceAdaptation() {
    if (this.performanceMonitor) {
      this.performanceMonitor.on('onPerformanceChange', (metrics) => {
        this.adaptCullingSettings(metrics);
      });
    }
  }

  /**
   * Actualiza el frustum de la cámara
   */
  updateFrustum() {
    const viewMatrix = this.camera.getViewMatrix();
    const projMatrix = this.camera.getProjectionMatrix();
    const viewProjMatrix = this.multiplyMatrices(projMatrix, viewMatrix);
    
    this.extractFrustumPlanes(viewProjMatrix);
  }

  /**
   * Extrae los planos del frustum de la matriz view-projection
   */
  extractFrustumPlanes(matrix) {
    const m = matrix;
    
    // Plano izquierdo: m[3] + m[0]
    this.frustumPlanes[0] = this.normalizePlane({
      normal: { x: m[3] + m[0], y: m[7] + m[4], z: m[11] + m[8] },
      distance: m[15] + m[12]
    });
    
    // Plano derecho: m[3] - m[0]
    this.frustumPlanes[1] = this.normalizePlane({
      normal: { x: m[3] - m[0], y: m[7] - m[4], z: m[11] - m[8] },
      distance: m[15] - m[12]
    });
    
    // Plano superior: m[3] - m[1]
    this.frustumPlanes[2] = this.normalizePlane({
      normal: { x: m[3] - m[1], y: m[7] - m[5], z: m[11] - m[9] },
      distance: m[15] - m[13]
    });
    
    // Plano inferior: m[3] + m[1]
    this.frustumPlanes[3] = this.normalizePlane({
      normal: { x: m[3] + m[1], y: m[7] + m[5], z: m[11] + m[9] },
      distance: m[15] + m[13]
    });
    
    // Plano cercano: m[3] + m[2]
    this.frustumPlanes[4] = this.normalizePlane({
      normal: { x: m[3] + m[2], y: m[7] + m[6], z: m[11] + m[10] },
      distance: m[15] + m[14]
    });
    
    // Plano lejano: m[3] - m[2]
    this.frustumPlanes[5] = this.normalizePlane({
      normal: { x: m[3] - m[2], y: m[7] - m[6], z: m[11] - m[10] },
      distance: m[15] - m[14]
    });
  }

  /**
   * Normaliza un plano
   */
  normalizePlane(plane) {
    const length = Math.sqrt(
      plane.normal.x * plane.normal.x +
      plane.normal.y * plane.normal.y +
      plane.normal.z * plane.normal.z
    );
    
    return {
      normal: {
        x: plane.normal.x / length,
        y: plane.normal.y / length,
        z: plane.normal.z / length
      },
      distance: plane.distance / length
    };
  }

  /**
   * Ejecuta culling en una lista de objetos
   */
  cullObjects(objects) {
    if (!this.enabled) {
      return objects;
    }
    
    this.frameCounter++;
    this.resetStatistics();
    this.statistics.totalObjects = objects.length;
    
    // Actualizar frustum si la cámara se movió
    if (this.hasCameraMoved()) {
      this.updateFrustum();
      this.updateSpatialGrid(objects);
    }
    
    const visibleObjects = [];
    const cameraPosition = this.camera.getPosition();
    
    // Usar spatial grid para pre-filtrar objetos cercanos
    const potentiallyVisible = this.spatialGrid.query(cameraPosition, this.settings.maxDrawDistance);
    
    for (const object of potentiallyVisible) {
      if (this.isObjectVisible(object, cameraPosition)) {
        visibleObjects.push(object);
        this.statistics.visibleObjects++;
      } else {
        this.statistics.culledObjects++;
      }
    }
    
    // Ordenar objetos visibles por distancia para optimizar renderizado
    if (visibleObjects.length > 0) {
      this.sortObjectsByDistance(visibleObjects, cameraPosition);
    }
    
    return visibleObjects;
  }

  /**
   * Verifica si un objeto es visible
   */
  isObjectVisible(object, cameraPosition) {
    const boundingBox = object.getBoundingBox();
    
    // 1. Frustum culling
    if (this.cullingTypes.frustum && !this.isInFrustum(boundingBox)) {
      this.statistics.frustumCulled++;
      return false;
    }
    
    // 2. Distance culling
    const distance = this.calculateDistance(object.position, cameraPosition);
    if (this.cullingTypes.distance && distance > this.settings.maxDrawDistance) {
      this.statistics.distanceCulled++;
      return false;
    }
    
    // 3. Size culling (objetos muy pequeños en pantalla)
    if (this.cullingTypes.size && !this.isObjectLargeEnough(object, distance)) {
      this.statistics.sizeCulled++;
      return false;
    }
    
    // 4. Backface culling para objetos planos
    if (this.cullingTypes.backface && this.isBackfacing(object, cameraPosition)) {
      this.statistics.backfaceCulled++;
      return false;
    }
    
    // 5. Occlusion culling (más costoso, hacer al final)
    if (this.cullingTypes.occlusion && this.isOccluded(object)) {
      this.statistics.occlusionCulled++;
      return false;
    }
    
    return true;
  }

  /**
   * Verifica si un bounding box está dentro del frustum
   */
  isInFrustum(boundingBox) {
    const center = boundingBox.center;
    const extents = boundingBox.extents;
    
    for (const plane of this.frustumPlanes) {
      const distance = 
        plane.normal.x * center.x +
        plane.normal.y * center.y +
        plane.normal.z * center.z +
        plane.distance;
      
      const radius = 
        Math.abs(plane.normal.x * extents.x) +
        Math.abs(plane.normal.y * extents.y) +
        Math.abs(plane.normal.z * extents.z);
      
      if (distance < -radius) {
        return false; // Completamente fuera del plano
      }
    }
    
    return true;
  }

  /**
   * Verifica si un objeto es lo suficientemente grande para renderizar
   */
  isObjectLargeEnough(object, distance) {
    const boundingBox = object.getBoundingBox();
    const size = Math.max(boundingBox.extents.x, boundingBox.extents.y, boundingBox.extents.z);
    
    // Calcular tamaño proyectado en píxeles
    const fov = this.camera.getFOV();
    const screenHeight = this.camera.getViewportHeight();
    const projectedSize = (size * screenHeight) / (2 * distance * Math.tan(fov * 0.5));
    
    return projectedSize >= this.settings.minObjectSize;
  }

  /**
   * Verifica si un objeto está mirando hacia atrás
   */
  isBackfacing(object, cameraPosition) {
    if (!object.normal) return false;
    
    const toCameraVector = {
      x: cameraPosition.x - object.position.x,
      y: cameraPosition.y - object.position.y,
      z: cameraPosition.z - object.position.z
    };
    
    const dotProduct = 
      object.normal.x * toCameraVector.x +
      object.normal.y * toCameraVector.y +
      object.normal.z * toCameraVector.z;
    
    return dotProduct < 0;
  }

  /**
   * Verifica si un objeto está ocluido
   */
  isOccluded(object) {
    if (!this.occlusionQueriesSupported) return false;
    
    const objectId = object.id;
    
    // Verificar cache de visibilidad
    if (this.visibilityCache.has(objectId)) {
      const cached = this.visibilityCache.get(objectId);
      if (this.frameCounter - cached.frame < this.settings.occlusionQueryDelay) {
        return !cached.visible;
      }
    }
    
    // Crear nueva consulta de oclusión si no existe
    if (!this.occlusionQueries.has(objectId)) {
      this.createOcclusionQuery(object);
    }
    
    const query = this.occlusionQueries.get(objectId);
    return this.checkOcclusionQuery(query, object);
  }

  /**
   * Crea una consulta de oclusión para un objeto
   */
  createOcclusionQuery(object) {
    const gl = this.camera.gl;
    const query = gl.createQuery();
    
    this.occlusionQueries.set(object.id, {
      query: query,
      pending: false,
      lastResult: true,
      frame: this.frameCounter
    });
  }

  /**
   * Verifica el resultado de una consulta de oclusión
   */
  checkOcclusionQuery(queryData, object) {
    const gl = this.camera.gl;
    
    if (queryData.pending) {
      const available = gl.getQueryParameter(queryData.query, gl.QUERY_RESULT_AVAILABLE);
      if (available) {
        const samplesPassed = gl.getQueryParameter(queryData.query, gl.QUERY_RESULT);
        queryData.lastResult = samplesPassed > 0;
        queryData.pending = false;
        
        // Actualizar cache
        this.visibilityCache.set(object.id, {
          visible: queryData.lastResult,
          frame: this.frameCounter
        });
      }
    } else {
      // Iniciar nueva consulta
      gl.beginQuery(gl.ANY_SAMPLES_PASSED, queryData.query);
      this.renderOcclusionProxy(object);
      gl.endQuery(gl.ANY_SAMPLES_PASSED);
      queryData.pending = true;
      queryData.frame = this.frameCounter;
    }
    
    return !queryData.lastResult;
  }

  /**
   * Renderiza un proxy simple para occlusion testing
   */
  renderOcclusionProxy(object) {
    const gl = this.camera.gl;
    const boundingBox = object.getBoundingBox();
    
    // Deshabilitar escritura de color
    gl.colorMask(false, false, false, false);
    gl.depthMask(false);
    
    // Renderizar bounding box simple
    this.renderBoundingBox(boundingBox);
    
    // Rehabilitar escritura
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
  }

  /**
   * Actualiza la grilla espacial
   */
  updateSpatialGrid(objects) {
    this.spatialGrid.clear();
    
    for (const object of objects) {
      this.spatialGrid.insert(object);
    }
  }

  /**
   * Verifica si la cámara se movió significativamente
   */
  hasCameraMoved() {
    const currentPos = this.camera.getPosition();
    const currentRot = this.camera.getRotation();
    
    const positionDelta = this.calculateDistance(currentPos, this.lastCameraPosition);
    const rotationDelta = 
      Math.abs(currentRot.x - this.lastCameraRotation.x) +
      Math.abs(currentRot.y - this.lastCameraRotation.y) +
      Math.abs(currentRot.z - this.lastCameraRotation.z);
    
    if (positionDelta > this.cameraMovementThreshold || rotationDelta > 0.01) {
      this.lastCameraPosition = { ...currentPos };
      this.lastCameraRotation = { ...currentRot };
      return true;
    }
    
    return false;
  }

  /**
   * Ordena objetos por distancia a la cámara
   */
  sortObjectsByDistance(objects, cameraPosition) {
    objects.sort((a, b) => {
      const distanceA = this.calculateDistance(a.position, cameraPosition);
      const distanceB = this.calculateDistance(b.position, cameraPosition);
      
      // Objetos opacos de cerca a lejos, transparentes de lejos a cerca
      if (a.transparent && !b.transparent) return 1;
      if (!a.transparent && b.transparent) return -1;
      
      return a.transparent ? distanceB - distanceA : distanceA - distanceB;
    });
  }

  /**
   * Calcula la distancia entre dos puntos
   */
  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Adapta configuraciones de culling basado en rendimiento
   */
  adaptCullingSettings(metrics) {
    if (!this.settings.adaptiveSettings) return;
    
    const fps = metrics.fps;
    const targetFPS = 60;
    
    if (fps < targetFPS * 0.8) {
      // Rendimiento bajo: ser más agresivo
      this.settings.aggressiveCulling = true;
      this.settings.maxDrawDistance *= 0.9;
      this.settings.minObjectSize *= 1.2;
      this.settings.occlusionQueryDelay = Math.min(5, this.settings.occlusionQueryDelay + 1);
    } else if (fps > targetFPS * 1.1) {
      // Buen rendimiento: relajar restricciones
      this.settings.aggressiveCulling = false;
      this.settings.maxDrawDistance = Math.min(1000, this.settings.maxDrawDistance * 1.05);
      this.settings.minObjectSize = Math.max(1, this.settings.minObjectSize * 0.95);
      this.settings.occlusionQueryDelay = Math.max(1, this.settings.occlusionQueryDelay - 1);
    }
  }

  /**
   * Multiplica dos matrices 4x4
   */
  multiplyMatrices(a, b) {
    const result = new Array(16);
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }
    
    return result;
  }

  /**
   * Renderiza un bounding box
   */
  renderBoundingBox(boundingBox) {
    // Implementación simplificada para occlusion testing
    // En una implementación real, esto usaría buffers de vértices optimizados
    const gl = this.camera.gl;
    
    // Esto es un placeholder - en la implementación real se usarían
    // buffers precomputados para renderizar bounding boxes eficientemente
    gl.drawArrays(gl.TRIANGLES, 0, 36); // 12 triángulos para un cubo
  }

  /**
   * Resetea las estadísticas del frame
   */
  resetStatistics() {
    this.statistics.totalObjects = 0;
    this.statistics.visibleObjects = 0;
    this.statistics.culledObjects = 0;
    this.statistics.frustumCulled = 0;
    this.statistics.occlusionCulled = 0;
    this.statistics.distanceCulled = 0;
    this.statistics.sizeCulled = 0;
    this.statistics.backfaceCulled = 0;
  }

  /**
   * Obtiene estadísticas de culling
   */
  getStatistics() {
    return { ...this.statistics };
  }

  /**
   * Obtiene información de eficiencia
   */
  getEfficiency() {
    const total = this.statistics.totalObjects;
    if (total === 0) return 0;
    
    return (this.statistics.culledObjects / total) * 100;
  }

  /**
   * Habilita/deshabilita tipos específicos de culling
   */
  setCullingType(type, enabled) {
    if (this.cullingTypes.hasOwnProperty(type)) {
      this.cullingTypes[type] = enabled;
    }
  }

  /**
   * Habilita/deshabilita todo el sistema de culling
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Obtiene configuración actual
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Actualiza configuración
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  /**
   * Limpia recursos
   */
  dispose() {
    // Limpiar consultas de oclusión
    if (this.camera.gl) {
      for (const queryData of this.occlusionQueries.values()) {
        this.camera.gl.deleteQuery(queryData.query);
      }
    }
    
    this.occlusionQueries.clear();
    this.visibilityCache.clear();
    this.spatialGrid.clear();
  }
}

/**
 * Grilla espacial para optimización de consultas espaciales
 */
class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  /**
   * Obtiene la clave de celda para una posición
   */
  getCellKey(position) {
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  /**
   * Inserta un objeto en la grilla
   */
  insert(object) {
    const key = this.getCellKey(object.position);
    
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    
    this.grid.get(key).push(object);
  }

  /**
   * Consulta objetos dentro de un radio
   */
  query(position, radius) {
    const results = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    const centerX = Math.floor(position.x / this.cellSize);
    const centerY = Math.floor(position.y / this.cellSize);
    const centerZ = Math.floor(position.z / this.cellSize);
    
    for (let x = centerX - cellRadius; x <= centerX + cellRadius; x++) {
      for (let y = centerY - cellRadius; y <= centerY + cellRadius; y++) {
        for (let z = centerZ - cellRadius; z <= centerZ + cellRadius; z++) {
          const key = `${x},${y},${z}`;
          const cellObjects = this.grid.get(key);
          
          if (cellObjects) {
            for (const object of cellObjects) {
              const distance = this.calculateDistance(position, object.position);
              if (distance <= radius) {
                results.push(object);
              }
            }
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Calcula distancia entre dos puntos
   */
  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Limpia la grilla
   */
  clear() {
    this.grid.clear();
  }
}

export default CullingSystem;
export { SpatialGrid };