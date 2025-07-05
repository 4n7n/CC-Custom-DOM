/**
 * Natural Elements - RAMA 5 Graphics Immersive
 * Simulación de elementos naturales: agua, fuego, aire, tierra
 */

class NaturalElementsSimulation {
  constructor() {
    this.elements = {
      water: new WaterSimulation(),
      fire: new FireSimulation(),
      air: new AirSimulation(),
      earth: new EarthSimulation()
    };
    
    this.interactions = new ElementInteractionSystem();
    this.environment = new EnvironmentalSystem();
    
    this.settings = {
      timestep: 1/120, // 120 FPS para física
      gravity: 9.81,
      temperature: 20, // Celsius
      humidity: 0.6,
      windSpeed: 2.0,
      atmosphericPressure: 101325, // Pa
      enableInteractions: true,
      qualityLevel: 'medium',
      particleCount: {
        water: 1000,
        fire: 500,
        air: 2000,
        earth: 300
      }
    };
    
    this.spatialGrid = new Map();
    this.gridSize = 5.0;
    
    this.statistics = {
      activeParticles: { water: 0, fire: 0, air: 0, earth: 0 },
      interactions: 0,
      performanceMetrics: {
        updateTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };
    
    this.lastUpdate = 0;
    this.frameCounter = 0;
    
    this.initialize();
  }

  /**
   * Inicializa el sistema de elementos naturales
   */
  initialize() {
    this.setupSpatialGrid();
    this.initializeElements();
    this.setupInteractionRules();
    this.startSimulation();
  }

  /**
   * Configura la grilla espacial para optimización
   */
  setupSpatialGrid() {
    this.spatialGrid = new Map();
    this.gridSize = 5.0;
  }

  /**
   * Inicializa todos los elementos
   */
  initializeElements() {
    for (const [name, element] of Object.entries(this.elements)) {
      element.initialize(this.settings);
    }
  }

  /**
   * Configura reglas de interacción entre elementos
   */
  setupInteractionRules() {
    // Agua + Fuego = Vapor
    this.interactions.addRule('water', 'fire', this.waterFireInteraction.bind(this));
    
    // Agua + Tierra = Lodo
    this.interactions.addRule('water', 'earth', this.waterEarthInteraction.bind(this));
    
    // Fuego + Aire = Combustión
    this.interactions.addRule('fire', 'air', this.fireAirInteraction.bind(this));
    
    // Aire + Agua = Humedad
    this.interactions.addRule('air', 'water', this.airWaterInteraction.bind(this));
    
    // Tierra + Aire = Erosión
    this.interactions.addRule('earth', 'air', this.earthAirInteraction.bind(this));
    
    // Fuego + Tierra = Ceniza
    this.interactions.addRule('fire', 'earth', this.fireEarthInteraction.bind(this));
  }

  /**
   * Inicia la simulación
   */
  startSimulation() {
    const update = (timestamp) => {
      const deltaTime = (timestamp - this.lastUpdate) * 0.001;
      this.update(deltaTime);
      this.lastUpdate = timestamp;
      requestAnimationFrame(update);
    };
    
    requestAnimationFrame(update);
  }

  /**
   * Actualización principal
   */
  update(deltaTime) {
    if (deltaTime > 0.05) deltaTime = 0.05; // Limitar delta time
    
    const startTime = performance.now();
    
    this.frameCounter++;
    this.updateSpatialGrid();
    this.updateElements(deltaTime);
    this.processInteractions();
    this.updateEnvironment(deltaTime);
    this.updateStatistics();
    
    this.statistics.performanceMetrics.updateTime = performance.now() - startTime;
  }

  /**
   * Actualiza la grilla espacial
   */
  updateSpatialGrid() {
    this.spatialGrid.clear();
    
    for (const element of Object.values(this.elements)) {
      for (const particle of element.particles) {
        const gridKey = this.getGridKey(particle.position);
        
        if (!this.spatialGrid.has(gridKey)) {
          this.spatialGrid.set(gridKey, []);
        }
        
        this.spatialGrid.get(gridKey).push(particle);
      }
    }
  }

  /**
   * Actualiza todos los elementos
   */
  updateElements(deltaTime) {
    for (const [name, element] of Object.entries(this.elements)) {
      element.update(deltaTime, this.environment.getConditions());
    }
  }

  /**
   * Procesa interacciones entre elementos
   */
  processInteractions() {
    if (!this.settings.enableInteractions) return;
    
    let interactionCount = 0;
    
    for (const [gridKey, particles] of this.spatialGrid) {
      // Agrupar partículas por tipo
      const particlesByType = this.groupParticlesByType(particles);
      
      // Procesar interacciones entre tipos diferentes
      for (const [type1, particles1] of Object.entries(particlesByType)) {
        for (const [type2, particles2] of Object.entries(particlesByType)) {
          if (type1 !== type2) {
            interactionCount += this.processElementInteraction(type1, particles1, type2, particles2);
          }
        }
      }
    }
    
    this.statistics.interactions = interactionCount;
  }

  /**
   * Agrupa partículas por tipo
   */
  groupParticlesByType(particles) {
    const grouped = {};
    
    for (const particle of particles) {
      if (!grouped[particle.type]) {
        grouped[particle.type] = [];
      }
      grouped[particle.type].push(particle);
    }
    
    return grouped;
  }

  /**
   * Procesa interacciones entre dos tipos de elementos
   */
  processElementInteraction(type1, particles1, type2, particles2) {
    let count = 0;
    
    for (const p1 of particles1) {
      for (const p2 of particles2) {
        const distance = this.calculateDistance(p1.position, p2.position);
        
        if (distance < p1.interactionRadius + p2.interactionRadius) {
          this.interactions.processInteraction(type1, p1, type2, p2);
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Interacciones específicas entre elementos
   */
  waterFireInteraction(waterParticle, fireParticle) {
    // Agua extingue fuego, genera vapor
    const intensity = Math.min(waterParticle.mass, fireParticle.energy);
    
    // Reducir energía del fuego
    fireParticle.energy -= intensity * 0.8;
    fireParticle.temperature -= intensity * 10;
    
    // Evaporar agua
    waterParticle.mass -= intensity * 0.3;
    waterParticle.temperature += intensity * 5;
    
    // Generar vapor si es necesario
    if (waterParticle.temperature > 100) {
      this.elements.air.addSteamParticle(waterParticle.position, intensity);
    }
    
    // Eliminar partículas si se consumen completamente
    if (fireParticle.energy <= 0) {
      this.elements.fire.removeParticle(fireParticle);
    }
    
    if (waterParticle.mass <= 0) {
      this.elements.water.removeParticle(waterParticle);
    }
  }

  waterEarthInteraction(waterParticle, earthParticle) {
    // Agua + Tierra = Lodo
    if (earthParticle.absorption > 0 && waterParticle.mass > 0.1) {
      const absorbed = Math.min(waterParticle.mass, earthParticle.absorption);
      
      waterParticle.mass -= absorbed;
      earthParticle.moisture += absorbed;
      earthParticle.viscosity += absorbed * 0.5;
      
      // Cambiar propiedades de la tierra
      if (earthParticle.moisture > earthParticle.saturationPoint) {
        earthParticle.state = 'mud';
        earthParticle.flow = true;
        earthParticle.viscosity *= 2;
      }
    }
  }

  fireAirInteraction(fireParticle, airParticle) {
    // Fuego consume oxígeno del aire
    if (airParticle.oxygenContent > 0) {
      const consumption = fireParticle.oxygenConsumption * fireParticle.energy;
      const available = airParticle.oxygenContent * airParticle.mass;
      const consumed = Math.min(consumption, available);
      
      // Reducir oxígeno en el aire
      airParticle.oxygenContent -= consumed / airParticle.mass;
      
      // Aumentar energía del fuego
      fireParticle.energy += consumed * 2;
      fireParticle.temperature += consumed * 50;
      
      // Generar productos de combustión
      airParticle.co2Content += consumed * 0.7;
      airParticle.temperature += consumed * 20;
      
      // Crear corrientes de convección
      const convectionForce = this.calculateConvectionForce(fireParticle, airParticle);
      airParticle.velocity.x += convectionForce.x;
      airParticle.velocity.y += convectionForce.y;
      airParticle.velocity.z += convectionForce.z;
    }
  }

  airWaterInteraction(airParticle, waterParticle) {
    // Intercambio de humedad y temperatura
    const temperatureDiff = airParticle.temperature - waterParticle.temperature;
    const humidityCapacity = this.calculateHumidityCapacity(airParticle.temperature);
    
    // Evaporación o condensación
    if (temperatureDiff > 0 && airParticle.humidity < humidityCapacity) {
      // Evaporación
      const evaporation = Math.min(
        waterParticle.mass * 0.01,
        (humidityCapacity - airParticle.humidity) * airParticle.mass
      );
      
      waterParticle.mass -= evaporation;
      airParticle.humidity += evaporation / airParticle.mass;
      
      // Intercambio de calor
      const heatTransfer = temperatureDiff * 0.1;
      waterParticle.temperature += heatTransfer;
      airParticle.temperature -= heatTransfer * 0.5;
      
    } else if (airParticle.humidity > humidityCapacity) {
      // Condensación
      const condensation = (airParticle.humidity - humidityCapacity) * airParticle.mass;
      
      airParticle.humidity = humidityCapacity;
      
      // Crear nueva gota de agua o aumentar masa existente
      if (waterParticle.mass > 0) {
        waterParticle.mass += condensation;
      } else {
        this.elements.water.addDroplet(airParticle.position, condensation);
      }
    }
  }

  earthAirInteraction(earthParticle, airParticle) {
    // Erosión por viento
    const windStrength = this.calculateWindStrength(airParticle.velocity);
    
    if (windStrength > earthParticle.erosionThreshold) {
      const erosion = (windStrength - earthParticle.erosionThreshold) * earthParticle.erosionRate;
      
      earthParticle.mass -= erosion;
      
      // Crear partículas de polvo en el aire
      airParticle.dustContent += erosion;
      airParticle.opacity += erosion * 0.1;
      
      // Transferir momento
      const momentum = erosion * 0.5;
      earthParticle.velocity.x += airParticle.velocity.x * momentum;
      earthParticle.velocity.z += airParticle.velocity.z * momentum;
    }
    
    // Intercambio térmico con el suelo
    const thermalConductivity = earthParticle.thermalConductivity;
    const temperatureDiff = earthParticle.temperature - airParticle.temperature;
    const heatTransfer = temperatureDiff * thermalConductivity * 0.01;
    
    earthParticle.temperature -= heatTransfer;
    airParticle.temperature += heatTransfer * 0.3;
  }

  fireEarthInteraction(fireParticle, earthParticle) {
    // Fuego calienta tierra, puede crear ceniza
    const heatTransfer = fireParticle.energy * 0.1;
    
    earthParticle.temperature += heatTransfer;
    fireParticle.energy -= heatTransfer * 0.5;
    
    // Si la tierra se calienta mucho, puede cambiar de estado
    if (earthParticle.temperature > earthParticle.meltingPoint) {
      earthParticle.state = 'molten';
      earthParticle.viscosity *= 0.1;
      earthParticle.flow = true;
    }
    
    // Si hay material orgánico, crear ceniza
    if (earthParticle.organicContent > 0 && fireParticle.temperature > 300) {
      const combustion = earthParticle.organicContent * 0.1;
      
      earthParticle.organicContent -= combustion;
      earthParticle.ashContent += combustion * 0.3;
      
      // Liberar energía
      fireParticle.energy += combustion * 5;
    }
  }

  /**
   * Métodos de cálculo auxiliares
   */
  calculateConvectionForce(fireParticle, airParticle) {
    const buoyancy = (fireParticle.temperature - airParticle.temperature) / fireParticle.temperature;
    const force = buoyancy * 0.1;
    
    return {
      x: 0,
      y: force,
      z: 0
    };
  }

  calculateHumidityCapacity(temperature) {
    // Capacidad de humedad basada en temperatura (aproximación)
    return 0.001 * Math.exp(0.06 * temperature);
  }

  calculateWindStrength(velocity) {
    return Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  }

  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  getGridKey(position) {
    const x = Math.floor(position.x / this.gridSize);
    const y = Math.floor(position.y / this.gridSize);
    const z = Math.floor(position.z / this.gridSize);
    return `${x},${y},${z}`;
  }

  /**
   * Actualiza el sistema ambiental
   */
  updateEnvironment(deltaTime) {
    this.environment.update(deltaTime, {
      temperature: this.settings.temperature,
      humidity: this.settings.humidity,
      pressure: this.settings.atmosphericPressure,
      windSpeed: this.settings.windSpeed
    });
  }

  /**
   * Actualiza estadísticas
   */
  updateStatistics() {
    for (const [name, element] of Object.entries(this.elements)) {
      this.statistics.activeParticles[name] = element.getParticleCount();
    }
    
    // Calcular uso de memoria estimado
    const totalParticles = Object.values(this.statistics.activeParticles)
      .reduce((sum, count) => sum + count, 0);
    this.statistics.performanceMetrics.memoryUsage = totalParticles * 200; // bytes por partícula estimado
  }

  /**
   * Métodos públicos de control
   */
  addWaterSource(position, flow) {
    this.elements.water.addSource(position, flow);
  }

  addFireSource(position, energy) {
    this.elements.fire.addSource(position, energy);
  }

  addWindForce(direction, strength) {
    this.elements.air.addWindForce(direction, strength);
  }

  setEnvironmentalConditions(conditions) {
    Object.assign(this.settings, conditions);
  }

  setQualityLevel(level) {
    this.settings.qualityLevel = level;
    
    // Ajustar cantidad de partículas según calidad
    const qualityMultipliers = {
      low: 0.3,
      medium: 0.6,
      high: 1.0,
      ultra: 1.5
    };
    
    const multiplier = qualityMultipliers[level] || 0.6;
    
    for (const [type, baseCount] of Object.entries(this.settings.particleCount)) {
      this.elements[type].setMaxParticles(Math.floor(baseCount * multiplier));
    }
  }

  getStatistics() {
    return { ...this.statistics };
  }

  pause() {
    for (const element of Object.values(this.elements)) {
      element.pause();
    }
  }

  resume() {
    for (const element of Object.values(this.elements)) {
      element.resume();
    }
  }

  reset() {
    for (const element of Object.values(this.elements)) {
      element.reset();
    }
    
    this.spatialGrid.clear();
    this.statistics.interactions = 0;
  }
}

/**
 * Sistema de interacciones entre elementos
 */
class ElementInteractionSystem {
  constructor() {
    this.rules = new Map();
  }

  addRule(element1, element2, callback) {
    const key = `${element1}-${element2}`;
    const reverseKey = `${element2}-${element1}`;
    
    this.rules.set(key, callback);
    this.rules.set(reverseKey, callback);
  }

  processInteraction(type1, particle1, type2, particle2) {
    const key = `${type1}-${type2}`;
    const rule = this.rules.get(key);
    
    if (rule) {
      rule(particle1, particle2);
    }
  }
}

/**
 * Sistema ambiental
 */
class EnvironmentalSystem {
  constructor() {
    this.conditions = {
      temperature: 20,
      humidity: 0.6,
      pressure: 101325,
      windSpeed: 2.0,
      windDirection: { x: 1, y: 0, z: 0 }
    };
    
    this.weatherPatterns = [];
    this.timeOfDay = 12; // hora del día
    this.season = 'spring';
  }

  update(deltaTime, newConditions) {
    // Actualizar condiciones gradualmente
    const lerpFactor = deltaTime * 0.1;
    
    for (const [key, value] of Object.entries(newConditions)) {
      if (typeof value === 'number') {
        this.conditions[key] = this.lerp(this.conditions[key], value, lerpFactor);
      }
    }
    
    // Actualizar patrones climáticos
    this.updateWeatherPatterns(deltaTime);
    
    // Actualizar tiempo del día
    this.timeOfDay += deltaTime / 3600; // 1 hora real = 1 segundo simulado
    if (this.timeOfDay >= 24) this.timeOfDay -= 24;
  }

  updateWeatherPatterns(deltaTime) {
    // Simular cambios climáticos naturales
    const timeVariation = Math.sin(this.timeOfDay / 24 * Math.PI * 2);
    
    // Variación de temperatura diurna
    this.conditions.temperature += timeVariation * 0.1;
    
    // Variación de humedad
    this.conditions.humidity += Math.random() * 0.01 - 0.005;
    this.conditions.humidity = Math.max(0, Math.min(1, this.conditions.humidity));
  }

  getConditions() {
    return { ...this.conditions };
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }
}

/**
 * Simulaciones específicas de elementos (clases base)
 */
class ElementSimulation {
  constructor(type) {
    this.type = type;
    this.particles = [];
    this.sources = [];
    this.maxParticles = 1000;
    this.paused = false;
  }

  initialize(settings) {
    this.maxParticles = settings.particleCount[this.type] || 1000;
  }

  update(deltaTime, environmentalConditions) {
    if (this.paused) return;
    
    this.updateSources(deltaTime);
    this.updateParticles(deltaTime, environmentalConditions);
    this.cleanupParticles();
  }

  updateSources(deltaTime) {
    // Implementar en subclases
  }

  updateParticles(deltaTime, conditions) {
    // Implementar en subclases
  }

  cleanupParticles() {
    this.particles = this.particles.filter(p => p.alive);
  }

  addParticle(particle) {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle);
    }
  }

  removeParticle(particle) {
    const index = this.particles.indexOf(particle);
    if (index > -1) {
      this.particles.splice(index, 1);
    }
  }

  getParticleCount() {
    return this.particles.length;
  }

  setMaxParticles(count) {
    this.maxParticles = count;
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  reset() { 
    this.particles = [];
    this.sources = [];
  }
}

class WaterSimulation extends ElementSimulation {
  constructor() {
    super('water');
  }

  addSource(position, flow) {
    this.sources.push({ position, flow, type: 'water' });
  }

  addDroplet(position, mass) {
    this.addParticle({
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      mass: mass,
      temperature: 20,
      type: 'water',
      alive: true,
      interactionRadius: 1.0
    });
  }
}

class FireSimulation extends ElementSimulation {
  constructor() {
    super('fire');
  }

  addSource(position, energy) {
    this.sources.push({ position, energy, type: 'fire' });
  }
}

class AirSimulation extends ElementSimulation {
  constructor() {
    super('air');
  }

  addWindForce(direction, strength) {
    // Implementar fuerza de viento
  }

  addSteamParticle(position, intensity) {
    this.addParticle({
      position: { ...position },
      velocity: { x: 0, y: intensity, z: 0 },
      mass: intensity * 0.1,
      temperature: 100,
      type: 'steam',
      alive: true,
      interactionRadius: 0.5
    });
  }
}

class EarthSimulation extends ElementSimulation {
  constructor() {
    super('earth');
  }
}

export default NaturalElementsSimulation;