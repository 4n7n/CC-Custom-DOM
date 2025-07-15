/**
 * Physics Processor Worker - RAMA 5 Graphics Immersive
 * Web Worker dedicado para procesamiento intensivo de física en hilo separado
 */

// Importar bibliotecas de física si están disponibles
// importScripts('https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.20.0/cannon.min.js');

class PhysicsProcessor {
  constructor() {
    this.isRunning = false;
    this.deltaTime = 1/60;
    this.maxSubSteps = 10;
    this.lastTime = 0;
    
    this.bodies = new Map();
    this.constraints = new Map();
    this.collisionPairs = new Set();
    this.broadPhase = new BroadPhase();
    this.narrowPhase = new NarrowPhase();
    
    this.settings = {
      gravity: { x: 0, y: -9.81, z: 0 },
      iterations: 8,
      tolerance: 0.001,
      restitution: 0.6,
      friction: 0.4,
      damping: 0.99,
      sleepThreshold: 0.1,
      enableSleeping: true
    };
    
    this.statistics = {
      frameTime: 0,
      bodyCount: 0,
      constraintCount: 0,
      collisionCount: 0,
      iterationsUsed: 0
    };
    
    this.spatialGrid = new SpatialGrid(10.0);
    this.contactSolver = new ContactSolver();
    this.constraintSolver = new ConstraintSolver();
    
    this.setupWorkerMessaging();
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
        case 'STEP':
          this.step(data.deltaTime);
          break;
        case 'ADD_BODY':
          this.addBody(data);
          break;
        case 'REMOVE_BODY':
          this.removeBody(data.id);
          break;
        case 'UPDATE_BODY':
          this.updateBody(data.id, data.properties);
          break;
        case 'ADD_CONSTRAINT':
          this.addConstraint(data);
          break;
        case 'REMOVE_CONSTRAINT':
          this.removeConstraint(data.id);
          break;
        case 'SET_SETTINGS':
          this.setSettings(data);
          break;
        case 'GET_STATISTICS':
          this.sendStatistics();
          break;
        case 'RESET':
          this.reset();
          break;
        default:
          console.warn('Unknown message type:', type);
      }
    };
  }

  /**
   * Inicia la simulación de física
   */
  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.sendMessage('STARTED');
  }

  /**
   * Detiene la simulación de física
   */
  stop() {
    this.isRunning = false;
    this.sendMessage('STOPPED');
  }

  /**
   * Ejecuta un paso de simulación
   */
  step(deltaTime) {
    if (!this.isRunning) return;
    
    const startTime = performance.now();
    
    // Limitar deltaTime para estabilidad
    deltaTime = Math.min(deltaTime, 1/30);
    
    // Subdivisión de tiempo para mayor precisión
    const subSteps = Math.ceil(deltaTime / this.deltaTime);
    const subDeltaTime = deltaTime / subSteps;
    
    for (let i = 0; i < Math.min(subSteps, this.maxSubSteps); i++) {
      this.integrateForces(subDeltaTime);
      this.detectCollisions();
      this.solveConstraints(subDeltaTime);
      this.integrateVelocities(subDeltaTime);
      this.updateSleeping();
    }
    
    this.statistics.frameTime = performance.now() - startTime;
    this.updateStatistics();
    
    // Enviar estado actualizado al hilo principal
    this.sendPhysicsUpdate();
  }

  /**
   * Integra fuerzas aplicadas a los cuerpos
   */
  integrateForces(deltaTime) {
    for (const [id, body] of this.bodies) {
      if (body.type === 'static' || body.sleeping) continue;
      
      // Limpiar fuerzas del frame anterior
      body.force = { x: 0, y: 0, z: 0 };
      body.torque = { x: 0, y: 0, z: 0 };
      
      // Aplicar gravedad
      if (body.useGravity) {
        body.force.x += this.settings.gravity.x * body.mass;
        body.force.y += this.settings.gravity.y * body.mass;
        body.force.z += this.settings.gravity.z * body.mass;
      }
      
      // Aplicar fuerzas externas
      for (const force of body.externalForces || []) {
        body.force.x += force.x;
        body.force.y += force.y;
        body.force.z += force.z;
      }
      
      // Calcular aceleración
      const acceleration = {
        x: body.force.x / body.mass,
        y: body.force.y / body.mass,
        z: body.force.z / body.mass
      };
      
      // Integrar velocidad
      body.velocity.x += acceleration.x * deltaTime;
      body.velocity.y += acceleration.y * deltaTime;
      body.velocity.z += acceleration.z * deltaTime;
      
      // Aplicar amortiguamiento
      body.velocity.x *= this.settings.damping;
      body.velocity.y *= this.settings.damping;
      body.velocity.z *= this.settings.damping;
      
      // Integrar velocidad angular para cuerpos rígidos
      if (body.angularVelocity && body.inertia) {
        const angularAcceleration = {
          x: body.torque.x / body.inertia.x,
          y: body.torque.y / body.inertia.y,
          z: body.torque.z / body.inertia.z
        };
        
        body.angularVelocity.x += angularAcceleration.x * deltaTime;
        body.angularVelocity.y += angularAcceleration.y * deltaTime;
        body.angularVelocity.z += angularAcceleration.z * deltaTime;
        
        // Amortiguamiento angular
        body.angularVelocity.x *= this.settings.damping;
        body.angularVelocity.y *= this.settings.damping;
        body.angularVelocity.z *= this.settings.damping;
      }
    }
  }

  /**
   * Detecta colisiones entre cuerpos
   */
  detectCollisions() {
    this.collisionPairs.clear();
    
    // Actualizar grilla espacial
    this.spatialGrid.clear();
    for (const [id, body] of this.bodies) {
      if (!body.sleeping) {
        this.spatialGrid.insert(body);
      }
    }
    
    // Broad phase: encontrar pares potenciales
    const potentialPairs = this.broadPhase.detectPairs(this.spatialGrid);
    
    // Narrow phase: detectar colisiones reales
    for (const [bodyA, bodyB] of potentialPairs) {
      const collision = this.narrowPhase.detectCollision(bodyA, bodyB);
      if (collision) {
        this.collisionPairs.add(collision);
      }
    }
    
    this.statistics.collisionCount = this.collisionPairs.size;
  }

  /**
   * Resuelve restricciones y contactos
   */
  solveConstraints(deltaTime) {
    let iterationsUsed = 0;
    
    // Resolver restricciones de contacto
    for (let iteration = 0; iteration < this.settings.iterations; iteration++) {
      let hasConverged = true;
      iterationsUsed++;
      
      // Resolver colisiones
      for (const collision of this.collisionPairs) {
        const solved = this.contactSolver.solve(collision, deltaTime);
        if (!solved) hasConverged = false;
      }
      
      // Resolver restricciones de joints
      for (const [id, constraint] of this.constraints) {
        const solved = this.constraintSolver.solve(constraint, deltaTime);
        if (!solved) hasConverged = false;
      }
      
      if (hasConverged) break;
    }
    
    this.statistics.iterationsUsed = iterationsUsed;
  }

  /**
   * Integra velocidades para actualizar posiciones
   */
  integrateVelocities(deltaTime) {
    for (const [id, body] of this.bodies) {
      if (body.type === 'static' || body.sleeping) continue;
      
      // Integrar posición
      body.position.x += body.velocity.x * deltaTime;
      body.position.y += body.velocity.y * deltaTime;
      body.position.z += body.velocity.z * deltaTime;
      
      // Integrar rotación (usando quaternions para estabilidad)
      if (body.rotation && body.angularVelocity) {
        const halfDt = deltaTime * 0.5;
        const wx = body.angularVelocity.x * halfDt;
        const wy = body.angularVelocity.y * halfDt;
        const wz = body.angularVelocity.z * halfDt;
        
        const q = body.quaternion || { x: 0, y: 0, z: 0, w: 1 };
        
        // Integración de quaternion
        const newQ = {
          x: q.x + (-q.y * wx - q.z * wy - q.w * wz),
          y: q.y + (q.x * wx - q.z * wz + q.w * wy),
          z: q.z + (q.x * wy + q.y * wz - q.w * wx),
          w: q.w + (-q.x * wz + q.y * wy + q.z * wx)
        };
        
        // Normalizar quaternion
        const length = Math.sqrt(newQ.x*newQ.x + newQ.y*newQ.y + newQ.z*newQ.z + newQ.w*newQ.w);
        body.quaternion = {
          x: newQ.x / length,
          y: newQ.y / length,
          z: newQ.z / length,
          w: newQ.w / length
        };
        
        // Convertir a ángulos de Euler para compatibilidad
        body.rotation = this.quaternionToEuler(body.quaternion);
      }
      
      // Actualizar bounding box
      this.updateBoundingBox(body);
    }
  }

  /**
   * Actualiza el estado de sueño de los cuerpos
   */
  updateSleeping() {
    if (!this.settings.enableSleeping) return;
    
    for (const [id, body] of this.bodies) {
      if (body.type === 'static') continue;
      
      const speed = Math.sqrt(
        body.velocity.x * body.velocity.x +
        body.velocity.y * body.velocity.y +
        body.velocity.z * body.velocity.z
      );
      
      const angularSpeed = body.angularVelocity ? Math.sqrt(
        body.angularVelocity.x * body.angularVelocity.x +
        body.angularVelocity.y * body.angularVelocity.y +
        body.angularVelocity.z * body.angularVelocity.z
      ) : 0;
      
      if (speed < this.settings.sleepThreshold && angularSpeed < this.settings.sleepThreshold) {
        body.sleepTime = (body.sleepTime || 0) + this.deltaTime;
        
        if (body.sleepTime > 1.0) { // 1 segundo para dormir
          body.sleeping = true;
          body.velocity = { x: 0, y: 0, z: 0 };
          if (body.angularVelocity) {
            body.angularVelocity = { x: 0, y: 0, z: 0 };
          }
        }
      } else {
        body.sleepTime = 0;
        if (body.sleeping) {
          body.sleeping = false;
        }
      }
    }
  }

  /**
   * Añade un cuerpo a la simulación
   */
  addBody(bodyData) {
    const body = {
      id: bodyData.id,
      type: bodyData.type || 'dynamic',
      position: bodyData.position || { x: 0, y: 0, z: 0 },
      rotation: bodyData.rotation || { x: 0, y: 0, z: 0 },
      velocity: bodyData.velocity || { x: 0, y: 0, z: 0 },
      angularVelocity: bodyData.angularVelocity || { x: 0, y: 0, z: 0 },
      mass: bodyData.mass || 1.0,
      restitution: bodyData.restitution || this.settings.restitution,
      friction: bodyData.friction || this.settings.friction,
      useGravity: bodyData.useGravity !== false,
      sleeping: false,
      sleepTime: 0,
      force: { x: 0, y: 0, z: 0 },
      torque: { x: 0, y: 0, z: 0 },
      externalForces: [],
      shape: bodyData.shape || 'box',
      size: bodyData.size || { x: 1, y: 1, z: 1 },
      boundingBox: null,
      quaternion: { x: 0, y: 0, z: 0, w: 1 }
    };
    
    // Calcular tensor de inercia para cuerpos rígidos
    if (body.type === 'dynamic') {
      body.inertia = this.calculateInertia(body);
    }
    
    // Generar bounding box
    this.updateBoundingBox(body);
    
    this.bodies.set(body.id, body);
    this.sendMessage('BODY_ADDED', { id: body.id });
  }

  /**
   * Remueve un cuerpo de la simulación
   */
  removeBody(bodyId) {
    if (this.bodies.has(bodyId)) {
      this.bodies.delete(bodyId);
      
      // Remover restricciones asociadas
      for (const [id, constraint] of this.constraints) {
        if (constraint.bodyA === bodyId || constraint.bodyB === bodyId) {
          this.constraints.delete(id);
        }
      }
      
      this.sendMessage('BODY_REMOVED', { id: bodyId });
    }
  }

  /**
   * Actualiza propiedades de un cuerpo
   */
  updateBody(bodyId, properties) {
    const body = this.bodies.get(bodyId);
    if (body) {
      Object.assign(body, properties);
      
      // Recalcular inercia si cambió la masa o forma
      if (properties.mass || properties.size || properties.shape) {
        body.inertia = this.calculateInertia(body);
      }
      
      // Actualizar bounding box si cambió el tamaño
      if (properties.size || properties.position) {
        this.updateBoundingBox(body);
      }
      
      // Despertar el cuerpo si estaba durmiendo
      if (body.sleeping) {
        body.sleeping = false;
        body.sleepTime = 0;
      }
    }
  }

  /**
   * Añade una restricción a la simulación
   */
  addConstraint(constraintData) {
    const constraint = {
      id: constraintData.id,
      type: constraintData.type,
      bodyA: constraintData.bodyA,
      bodyB: constraintData.bodyB,
      anchorA: constraintData.anchorA || { x: 0, y: 0, z: 0 },
      anchorB: constraintData.anchorB || { x: 0, y: 0, z: 0 },
      stiffness: constraintData.stiffness || 1.0,
      damping: constraintData.damping || 0.1,
      breakForce: constraintData.breakForce || Infinity,
      ...constraintData
    };
    
    this.constraints.set(constraint.id, constraint);
    this.sendMessage('CONSTRAINT_ADDED', { id: constraint.id });
  }

  /**
   * Remueve una restricción
   */
  removeConstraint(constraintId) {
    if (this.constraints.has(constraintId)) {
      this.constraints.delete(constraintId);
      this.sendMessage('CONSTRAINT_REMOVED', { id: constraintId });
    }
  }

  /**
   * Configura parámetros de la simulación
   */
  setSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  /**
   * Reinicia la simulación
   */
  reset() {
    this.bodies.clear();
    this.constraints.clear();
    this.collisionPairs.clear();
    this.spatialGrid.clear();
    this.sendMessage('RESET_COMPLETE');
  }

  /**
   * Calcula el tensor de inercia basado en la forma
   */
  calculateInertia(body) {
    const mass = body.mass;
    const size = body.size;
    
    switch (body.shape) {
      case 'box':
        return {
          x: mass * (size.y * size.y + size.z * size.z) / 12,
          y: mass * (size.x * size.x + size.z * size.z) / 12,
          z: mass * (size.x * size.x + size.y * size.y) / 12
        };
      
      case 'sphere':
        const radius = size.x * 0.5; // Asumir esfera uniforme
        const sphereInertia = 0.4 * mass * radius * radius;
        return { x: sphereInertia, y: sphereInertia, z: sphereInertia };
      
      case 'cylinder':
        const cylRadius = size.x * 0.5;
        const cylHeight = size.y;
        return {
          x: mass * (3 * cylRadius * cylRadius + cylHeight * cylHeight) / 12,
          y: mass * cylRadius * cylRadius * 0.5,
          z: mass * (3 * cylRadius * cylRadius + cylHeight * cylHeight) / 12
        };
      
      default:
        // Forma desconocida, usar aproximación de caja
        return {
          x: mass * (size.y * size.y + size.z * size.z) / 12,
          y: mass * (size.x * size.x + size.z * size.z) / 12,
          z: mass * (size.x * size.x + size.y * size.y) / 12
        };
    }
  }

  /**
   * Actualiza el bounding box de un cuerpo
   */
  updateBoundingBox(body) {
    const half = {
      x: body.size.x * 0.5,
      y: body.size.y * 0.5,
      z: body.size.z * 0.5
    };
    
    body.boundingBox = {
      min: {
        x: body.position.x - half.x,
        y: body.position.y - half.y,
        z: body.position.z - half.z
      },
      max: {
        x: body.position.x + half.x,
        y: body.position.y + half.y,
        z: body.position.z + half.z
      }
    };
  }

  /**
   * Convierte quaternion a ángulos de Euler
   */
  quaternionToEuler(q) {
    const { x, y, z, w } = q;
    
    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);
    
    // Pitch (y-axis rotation)
    const sinp = 2 * (w * y - z * x);
    const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);
    
    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);
    
    return { x: roll, y: pitch, z: yaw };
  }

  /**
   * Actualiza estadísticas de la simulación
   */
  updateStatistics() {
    this.statistics.bodyCount = this.bodies.size;
    this.statistics.constraintCount = this.constraints.size;
  }

  /**
   * Envía estadísticas al hilo principal
   */
  sendStatistics() {
    this.sendMessage('STATISTICS', this.statistics);
  }

  /**
   * Envía actualización de física al hilo principal
   */
  sendPhysicsUpdate() {
    const updates = [];
    
    for (const [id, body] of this.bodies) {
      updates.push({
        id: id,
        position: body.position,
        rotation: body.rotation,
        velocity: body.velocity,
        angularVelocity: body.angularVelocity,
        sleeping: body.sleeping
      });
    }
    
    this.sendMessage('PHYSICS_UPDATE', { bodies: updates });
  }

  /**
   * Envía mensaje al hilo principal
   */
  sendMessage(type, data = null) {
    self.postMessage({ type, data });
  }
}

/**
 * Grilla espacial para optimización de colisiones
 */
class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear() {
    this.grid.clear();
  }

  insert(body) {
    const cells = this.getCells(body.boundingBox);
    
    for (const cell of cells) {
      if (!this.grid.has(cell)) {
        this.grid.set(cell, []);
      }
      this.grid.get(cell).push(body);
    }
  }

  getCells(boundingBox) {
    const cells = [];
    const minCell = this.getCell(boundingBox.min);
    const maxCell = this.getCell(boundingBox.max);
    
    for (let x = minCell.x; x <= maxCell.x; x++) {
      for (let y = minCell.y; y <= maxCell.y; y++) {
        for (let z = minCell.z; z <= maxCell.z; z++) {
          cells.push(`${x},${y},${z}`);
        }
      }
    }
    
    return cells;
  }

  getCell(position) {
    return {
      x: Math.floor(position.x / this.cellSize),
      y: Math.floor(position.y / this.cellSize),
      z: Math.floor(position.z / this.cellSize)
    };
  }

  getAllPairs() {
    const pairs = [];
    
    for (const [cell, bodies] of this.grid) {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          pairs.push([bodies[i], bodies[j]]);
        }
      }
    }
    
    return pairs;
  }
}

/**
 * Detección broad phase de colisiones
 */
class BroadPhase {
  detectPairs(spatialGrid) {
    const pairs = [];
    
    for (const [cell, bodies] of spatialGrid.grid) {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const bodyA = bodies[i];
          const bodyB = bodies[j];
          
          // Verificar que no sean ambos estáticos
          if (bodyA.type === 'static' && bodyB.type === 'static') continue;
          
          // Verificar superposición de bounding boxes
          if (this.boundingBoxesOverlap(bodyA.boundingBox, bodyB.boundingBox)) {
            pairs.push([bodyA, bodyB]);
          }
        }
      }
    }
    
    return pairs;
  }

  boundingBoxesOverlap(bbA, bbB) {
    return (bbA.max.x >= bbB.min.x && bbA.min.x <= bbB.max.x) &&
           (bbA.max.y >= bbB.min.y && bbA.min.y <= bbB.max.y) &&
           (bbA.max.z >= bbB.min.z && bbA.min.z <= bbB.max.z);
  }
}

/**
 * Detección narrow phase de colisiones
 */
class NarrowPhase {
  detectCollision(bodyA, bodyB) {
    // Implementación simplificada para esferas/cajas
    
    if (bodyA.shape === 'sphere' && bodyB.shape === 'sphere') {
      return this.sphereSphereCollision(bodyA, bodyB);
    } else if (bodyA.shape === 'box' && bodyB.shape === 'box') {
      return this.boxBoxCollision(bodyA, bodyB);
    } else {
      // Collision sphere-box o formas mixtas
      return this.generalCollision(bodyA, bodyB);
    }
  }

  sphereSphereCollision(sphereA, sphereB) {
    const radiusA = sphereA.size.x * 0.5;
    const radiusB = sphereB.size.x * 0.5;
    const distance = this.distance(sphereA.position, sphereB.position);
    const radiusSum = radiusA + radiusB;
    
    if (distance < radiusSum) {
      const normal = this.normalize(this.subtract(sphereB.position, sphereA.position));
      const penetration = radiusSum - distance;
      
      return {
        bodyA: sphereA,
        bodyB: sphereB,
        normal: normal,
        penetration: penetration,
        contactPoint: this.add(sphereA.position, this.scale(normal, radiusA))
      };
    }
    
    return null;
  }

  boxBoxCollision(boxA, boxB) {
    // Implementación SAT (Separating Axis Theorem) simplificada
    // Para un worker, usamos una aproximación más simple
    
    const centerA = boxA.position;
    const centerB = boxB.position;
    const extentsA = { x: boxA.size.x * 0.5, y: boxA.size.y * 0.5, z: boxA.size.z * 0.5 };
    const extentsB = { x: boxB.size.x * 0.5, y: boxB.size.y * 0.5, z: boxB.size.z * 0.5 };
    
    const separation = this.subtract(centerB, centerA);
    const absDistance = {
      x: Math.abs(separation.x),
      y: Math.abs(separation.y),
      z: Math.abs(separation.z)
    };
    
    const totalExtents = this.add(extentsA, extentsB);
    
    // Verificar separación en cada eje
    if (absDistance.x > totalExtents.x || 
        absDistance.y > totalExtents.y || 
        absDistance.z > totalExtents.z) {
      return null; // No hay colisión
    }
    
    // Encontrar eje de menor penetración
    const penetrations = {
      x: totalExtents.x - absDistance.x,
      y: totalExtents.y - absDistance.y,
      z: totalExtents.z - absDistance.z
    };
    
    let minPenetration = Math.min(penetrations.x, penetrations.y, penetrations.z);
    let normal = { x: 0, y: 0, z: 0 };
    
    if (minPenetration === penetrations.x) {
      normal.x = separation.x > 0 ? 1 : -1;
    } else if (minPenetration === penetrations.y) {
      normal.y = separation.y > 0 ? 1 : -1;
    } else {
      normal.z = separation.z > 0 ? 1 : -1;
    }
    
    return {
      bodyA: boxA,
      bodyB: boxB,
      normal: normal,
      penetration: minPenetration,
      contactPoint: this.add(centerA, this.scale(normal, -minPenetration * 0.5))
    };
  }

  generalCollision(bodyA, bodyB) {
    // Usar distancia entre centros como aproximación
    const distance = this.distance(bodyA.position, bodyB.position);
    const radiusA = Math.max(bodyA.size.x, bodyA.size.y, bodyA.size.z) * 0.5;
    const radiusB = Math.max(bodyB.size.x, bodyB.size.y, bodyB.size.z) * 0.5;
    const radiusSum = radiusA + radiusB;
    
    if (distance < radiusSum) {
      const normal = this.normalize(this.subtract(bodyB.position, bodyA.position));
      const penetration = radiusSum - distance;
      
      return {
        bodyA: bodyA,
        bodyB: bodyB,
        normal: normal,
        penetration: penetration,
        contactPoint: this.add(bodyA.position, this.scale(normal, radiusA))
      };
    }
    
    return null;
  }

  // Funciones auxiliares de vectores
  distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  scale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }

  normalize(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / length, y: v.y / length, z: v.z / length };
  }
}

/**
 * Resolvedor de contactos
 */
class ContactSolver {
  solve(collision, deltaTime) {
    const { bodyA, bodyB, normal, penetration } = collision;
    
    // Calcular velocidad relativa
    const relativeVelocity = this.subtract(bodyB.velocity, bodyA.velocity);
    const normalVelocity = this.dot(relativeVelocity, normal);
    
    // Si se están separando, no aplicar impulso
    if (normalVelocity > 0) return true;
    
    // Calcular impulso
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const impulse = -(1 + restitution) * normalVelocity;
    
    let totalMass = 0;
    if (bodyA.type !== 'static') totalMass += 1 / bodyA.mass;
    if (bodyB.type !== 'static') totalMass += 1 / bodyB.mass;
    
    const impulseMagnitude = impulse / totalMass;
    const impulseVector = this.scale(normal, impulseMagnitude);
    
    // Aplicar impulso
    if (bodyA.type !== 'static') {
      bodyA.velocity = this.subtract(bodyA.velocity, this.scale(impulseVector, 1 / bodyA.mass));
    }
    
    if (bodyB.type !== 'static') {
      bodyB.velocity = this.add(bodyB.velocity, this.scale(impulseVector, 1 / bodyB.mass));
    }
    
    // Corrección de posición para resolver penetración
    const correctionPercent = 0.8;
    const correctionSlop = 0.01;
    const correction = Math.max(penetration - correctionSlop, 0) * correctionPercent / totalMass;
    const correctionVector = this.scale(normal, correction);
    
    if (bodyA.type !== 'static') {
      bodyA.position = this.subtract(bodyA.position, this.scale(correctionVector, 1 / bodyA.mass));
    }
    
    if (bodyB.type !== 'static') {
      bodyB.position = this.add(bodyB.position, this.scale(correctionVector, 1 / bodyB.mass));
    }
    
    return Math.abs(normalVelocity) < 0.01;
  }

  dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  scale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }
}

/**
 * Resolvedor de restricciones
 */
class ConstraintSolver {
  solve(constraint, deltaTime) {
    switch (constraint.type) {
      case 'distance':
        return this.solveDistanceConstraint(constraint, deltaTime);
      case 'hinge':
        return this.solveHingeConstraint(constraint, deltaTime);
      case 'slider':
        return this.solveSliderConstraint(constraint, deltaTime);
      default:
        return true;
    }
  }

  solveDistanceConstraint(constraint, deltaTime) {
    const bodyA = constraint.bodyA;
    const bodyB = constraint.bodyB;
    const restLength = constraint.restLength || 1.0;
    
    if (typeof bodyA === 'string' || typeof bodyB === 'string') {
      return true; // Referencias no resueltas
    }
    
    const direction = this.subtract(bodyB.position, bodyA.position);
    const currentLength = this.length(direction);
    
    if (currentLength === 0) return true;
    
    const difference = currentLength - restLength;
    const normalizedDirection = this.scale(direction, 1 / currentLength);
    
    const correction = difference * constraint.stiffness * 0.5;
    const correctionVector = this.scale(normalizedDirection, correction);
    
    if (bodyA.type !== 'static') {
      bodyA.position = this.add(bodyA.position, correctionVector);
    }
    
    if (bodyB.type !== 'static') {
      bodyB.position = this.subtract(bodyB.position, correctionVector);
    }
    
    return Math.abs(difference) < 0.01;
  }

  solveHingeConstraint(constraint, deltaTime) {
    // Implementación simplificada de joint de bisagra
    return true;
  }

  solveSliderConstraint(constraint, deltaTime) {
    // Implementación simplificada de joint deslizante
    return true;
  }

  subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  scale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }

  length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }
}

// Inicializar el procesador de física
const physicsProcessor = new PhysicsProcessor();

// Manejo de errores
self.onerror = (error) => {
  physicsProcessor.sendMessage('ERROR', {
    message: error.message,
    filename: error.filename,
    lineno: error.lineno
  });
};