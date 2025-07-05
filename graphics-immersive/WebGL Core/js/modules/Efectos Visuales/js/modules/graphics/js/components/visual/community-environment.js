/**
 * Community Environment - Componente de entorno comunitario
 * Gestiona la representación visual del entorno y edificios de la comunidad
 */

import { vec3, vec4, mat4, quat } from 'gl-matrix';

class Building {
    constructor(type, position, config = {}) {
        this.type = type;
        this.position = vec3.clone(position);
        this.rotation = quat.create();
        this.scale = vec3.fromValues(1, 1, 1);
        
        // Configuración del edificio
        this.config = {
            width: 10,
            height: 15,
            depth: 10,
            floors: 3,
            style: 'modern',
            color: vec3.fromValues(0.8, 0.8, 0.8),
            ...config
        };
        
        // Estado del edificio
        this.constructionProgress = 1.0; // 0 = en construcción, 1 = terminado
        this.condition = 1.0; // 0 = ruinas, 1 = perfecto estado
        this.occupancy = 0.7; // Porcentaje de ocupación
        this.activity = 0.5; // Nivel de actividad
        
        // Componentes visuales
        this.windows = [];
        this.doors = [];
        this.decorations = [];
        this.lighting = [];
        
        // Efectos especiales
        this.particles = null; // Para humo, etc.
        this.glowEffects = [];
        this.animatedElements = [];
        
        this.generateStructure();
    }

    generateStructure() {
        // Generar ventanas
        this.generateWindows();
        
        // Generar puertas
        this.generateDoors();
        
        // Generar decoraciones según el estilo
        this.generateDecorations();
        
        // Generar sistema de iluminación
        this.generateLighting();
    }

    generateWindows() {
        const { width, height, depth, floors } = this.config;
        const floorHeight = height / floors;
        
        // Ventanas en las caras principales
        for (let floor = 0; floor < floors; floor++) {
            const y = (floor + 0.5) * floorHeight;
            
            // Cara frontal
            for (let i = 1; i < Math.floor(width / 3); i++) {
                this.windows.push({
                    position: vec3.fromValues(i * 3 - width/2, y, depth/2),
                    size: vec3.fromValues(1.5, 2, 0.1),
                    type: 'standard',
                    lit: Math.random() > 0.3,
                    color: this.getWindowColor(),
                    glowing: false
                });
            }
            
            // Cara trasera
            for (let i = 1; i < Math.floor(width / 3); i++) {
                this.windows.push({
                    position: vec3.fromValues(i * 3 - width/2, y, -depth/2),
                    size: vec3.fromValues(1.5, 2, 0.1),
                    type: 'standard',
                    lit: Math.random() > 0.5,
                    color: this.getWindowColor(),
                    glowing: false
                });
            }
            
            // Caras laterales
            for (let i = 1; i < Math.floor(depth / 3); i++) {
                // Lado izquierdo
                this.windows.push({
                    position: vec3.fromValues(-width/2, y, i * 3 - depth/2),
                    size: vec3.fromValues(0.1, 2, 1.5),
                    type: 'standard',
                    lit: Math.random() > 0.4,
                    color: this.getWindowColor(),
                    glowing: false
                });
                
                // Lado derecho
                this.windows.push({
                    position: vec3.fromValues(width/2, y, i * 3 - depth/2),
                    size: vec3.fromValues(0.1, 2, 1.5),
                    type: 'standard',
                    lit: Math.random() > 0.4,
                    color: this.getWindowColor(),
                    glowing: false
                });
            }
        }
    }

    generateDoors() {
        const { width, depth } = this.config;
        
        // Puerta principal
        this.doors.push({
            position: vec3.fromValues(0, 1, depth/2),
            size: vec3.fromValues(2, 3, 0.2),
            type: 'main',
            open: false,
            material: 'wood'
        });
        
        // Posibles puertas laterales o traseras según el tipo de edificio
        if (this.type === 'commercial' || this.type === 'mixed') {
            this.doors.push({
                position: vec3.fromValues(-width/2, 1, 0),
                size: vec3.fromValues(0.2, 3, 1.5),
                type: 'side',
                open: false,
                material: 'glass'
            });
        }
    }

    generateDecorations() {
        switch (this.config.style) {
            case 'modern':
                this.generateModernDecorations();
                break;
            case 'classical':
                this.generateClassicalDecorations();
                break;
            case 'industrial':
                this.generateIndustrialDecorations();
                break;
            case 'rustic':
                this.generateRusticDecorations();
                break;
        }
    }

    generateModernDecorations() {
        const { width, height, depth } = this.config;
        
        // Líneas arquitectónicas
        this.decorations.push({
            type: 'line',
            start: vec3.fromValues(-width/2, height * 0.3, depth/2),
            end: vec3.fromValues(width/2, height * 0.3, depth/2),
            thickness: 0.1,
            material: 'metal'
        });
        
        // Paneles solares en el techo
        if (Math.random() > 0.6) {
            this.decorations.push({
                type: 'solar_panel',
                position: vec3.fromValues(0, height, 0),
                size: vec3.fromValues(width * 0.8, 0.1, depth * 0.8),
                efficiency: 0.8
            });
        }
        
        // Antenas y equipos en el techo
        this.decorations.push({
            type: 'antenna',
            position: vec3.fromValues(width * 0.3, height + 2, depth * 0.2),
            height: 3,
            animated: true
        });
        
        // Balcones modernos
        for (let floor = 1; floor < this.config.floors; floor++) {
            const y = (floor / this.config.floors) * height;
            this.decorations.push({
                type: 'balcony',
                position: vec3.fromValues(0, y, depth/2 + 0.5),
                size: vec3.fromValues(4, 0.2, 1),
                railing: true
            });
        }
    }

    generateClassicalDecorations() {
        const { width, height, depth } = this.config;
        
        // Columnas
        for (let i = 0; i < 3; i++) {
            this.decorations.push({
                type: 'column',
                position: vec3.fromValues((i - 1) * width * 0.3, height * 0.1, depth/2),
                height: height * 0.8,
                radius: 0.3,
                style: 'corinthian'
            });
        }
        
        // Cornisas
        this.decorations.push({
            type: 'cornice',
            position: vec3.fromValues(0, height * 0.9, depth/2),
            size: vec3.fromValues(width, 0.5, 1),
            pattern: 'dentil'
        });
        
        // Frontón
        this.decorations.push({
            type: 'pediment',
            position: vec3.fromValues(0, height, depth/2),
            size: vec3.fromValues(width * 0.8, height * 0.2, 0.5),
            style: 'triangular'
        });
    }

    generateIndustrialDecorations() {
        const { width, height, depth } = this.config;
        
        // Tuberías externas
        for (let i = 0; i < 3; i++) {
            this.decorations.push({
                type: 'pipe',
                start: vec3.fromValues(width/2, 0, (i - 1) * depth * 0.3),
                end: vec3.fromValues(width/2, height, (i - 1) * depth * 0.3),
                radius: 0.15,
                material: 'steel'
            });
        }
        
        // Escaleras de incendios
        this.decorations.push({
            type: 'fire_escape',
            position: vec3.fromValues(-width/2 - 1, height * 0.2, 0),
            levels: this.config.floors,
            animated: false
        });
        
        // Ventiladores industriales
        this.decorations.push({
            type: 'industrial_fan',
            position: vec3.fromValues(0, height, -depth/2),
            size: 2,
            animated: true,
            speed: 1.0
        });
    }

    generateRusticDecorations() {
        const { width, height, depth } = this.config;
        
        // Vigas de madera expuestas
        for (let i = 0; i < this.config.floors; i++) {
            const y = (i + 1) * (height / this.config.floors);
            this.decorations.push({
                type: 'wooden_beam',
                position: vec3.fromValues(0, y, depth/2),
                size: vec3.fromValues(width, 0.3, 0.3),
                weathered: true
            });
        }
        
        // Chimenea
        this.decorations.push({
            type: 'chimney',
            position: vec3.fromValues(width * 0.3, height + 1, -depth * 0.3),
            height: 3,
            smoking: Math.random() > 0.7
        });
        
        // Jardines en ventanas
        this.windows.forEach(window => {
            if (Math.random() > 0.6) {
                this.decorations.push({
                    type: 'window_garden',
                    position: vec3.clone(window.position),
                    plants: ['flowers', 'herbs', 'small_plants'][Math.floor(Math.random() * 3)]
                });
            }
        });
    }

    generateLighting() {
        const { width, height, depth } = this.config;
        
        // Luces de fachada
        this.lighting.push({
            type: 'facade',
            position: vec3.fromValues(0, height * 0.8, depth/2 + 0.5),
            intensity: 0.8,
            color: vec3.fromValues(1, 0.95, 0.8),
            range: 10,
            animated: false
        });
        
        // Luces de entrada
        this.lighting.push({
            type: 'entrance',
            position: vec3.fromValues(0, 4, depth/2 + 1),
            intensity: 1.2,
            color: vec3.fromValues(1, 1, 0.9),
            range: 8,
            animated: false
        });
        
        // Luces en ventanas (basado en ocupación)
        this.windows.forEach(window => {
            if (window.lit) {
                this.lighting.push({
                    type: 'window',
                    position: vec3.clone(window.position),
                    intensity: 0.3 + Math.random() * 0.4,
                    color: window.color,
                    range: 3,
                    animated: true,
                    flicker: Math.random() > 0.8
                });
            }
        });
        
        // Luces de seguridad
        if (this.type === 'commercial') {
            this.lighting.push({
                type: 'security',
                position: vec3.fromValues(-width/2 - 1, height * 0.6, depth/2),
                intensity: 1.5,
                color: vec3.fromValues(1, 1, 1),
                range: 15,
                animated: true,
                motion_sensor: true
            });
        }
    }

    getWindowColor() {
        const colors = [
            vec3.fromValues(1, 0.9, 0.7),    // Luz cálida
            vec3.fromValues(0.9, 0.9, 1),    // Luz fría
            vec3.fromValues(1, 0.8, 0.6),    // Luz anaranjada
            vec3.fromValues(0.8, 1, 0.9),    // Luz verdosa
            vec3.fromValues(1, 0.7, 0.8)     // Luz rosada
        ];
        
        return vec3.clone(colors[Math.floor(Math.random() * colors.length)]);
    }

    update(deltaTime) {
        // Actualizar animaciones
        this.updateAnimations(deltaTime);
        
        // Actualizar iluminación
        this.updateLighting(deltaTime);
        
        // Actualizar actividad
        this.updateActivity(deltaTime);
        
        // Actualizar partículas si existen
        if (this.particles) {
            this.particles.update(deltaTime);
        }
    }

    updateAnimations(deltaTime) {
        this.decorations.forEach(decoration => {
            if (decoration.animated) {
                switch (decoration.type) {
                    case 'antenna':
                        decoration.sway = Math.sin(Date.now() * 0.001) * 0.1;
                        break;
                    case 'industrial_fan':
                        decoration.rotation = (decoration.rotation || 0) + deltaTime * decoration.speed * 5;
                        break;
                }
            }
        });
        
        this.animatedElements.forEach(element => {
            element.update(deltaTime);
        });
    }

    updateLighting(deltaTime) {
        const time = Date.now() * 0.001;
        
        this.lighting.forEach(light => {
            if (light.animated) {
                if (light.flicker) {
                    light.currentIntensity = light.intensity * (0.8 + 0.2 * Math.sin(time * 10 + Math.random()));
                } else if (light.type === 'window') {
                    light.currentIntensity = light.intensity * (0.9 + 0.1 * Math.sin(time * 0.5));
                } else {
                    light.currentIntensity = light.intensity;
                }
            } else {
                light.currentIntensity = light.intensity;
            }
        });
    }

    updateActivity(deltaTime) {
        // Simular cambios en la actividad del edificio
        const timeOfDay = (Date.now() * 0.0001) % 1; // Ciclo de 24 horas simulado
        
        // Más actividad durante el día para oficinas, más durante la noche para residencial
        if (this.type === 'residential') {
            this.activity = 0.3 + 0.4 * Math.sin((timeOfDay - 0.25) * Math.PI * 2);
        } else if (this.type === 'commercial') {
            this.activity = 0.2 + 0.6 * Math.sin((timeOfDay - 0.5) * Math.PI);
        } else {
            this.activity = 0.4 + 0.2 * Math.sin(timeOfDay * Math.PI * 2);
        }
        
        // Actualizar luces de ventanas basado en actividad
        this.windows.forEach(window => {
            if (Math.random() < deltaTime * 0.1) { // Cambio ocasional
                window.lit = Math.random() < this.activity * this.occupancy;
            }
        });
    }

    setConstructionProgress(progress) {
        this.constructionProgress = Math.max(0, Math.min(1, progress));
        
        // Ajustar visibilidad de elementos según progreso
        const visibleFloors = Math.floor(this.constructionProgress * this.config.floors);
        
        this.windows.forEach(window => {
            const floor = Math.floor(window.position[1] / (this.config.height / this.config.floors));
            window.visible = floor < visibleFloors;
        });
        
        this.decorations.forEach(decoration => {
            decoration.visible = this.constructionProgress > 0.8;
        });
    }

    setCondition(condition) {
        this.condition = Math.max(0, Math.min(1, condition));
        
        // Ajustar apariencia según condición
        this.windows.forEach(window => {
            if (this.condition < 0.7) {
                window.broken = Math.random() > this.condition;
                window.dirty = Math.random() > this.condition * 0.8;
            }
        });
        
        this.decorations.forEach(decoration => {
            decoration.weathered = this.condition < 0.8;
            decoration.damaged = this.condition < 0.5 && Math.random() > 0.6;
        });
    }

    addSpecialEffect(effectType, config = {}) {
        switch (effectType) {
            case 'fire':
                this.addFireEffect(config);
                break;
            case 'smoke':
                this.addSmokeEffect(config);
                break;
            case 'sparks':
                this.addSparksEffect(config);
                break;
            case 'glow':
                this.addGlowEffect(config);
                break;
        }
    }

    addFireEffect(config) {
        const position = config.position || vec3.fromValues(0, this.config.height * 0.5, 0);
        
        this.glowEffects.push({
            type: 'fire',
            position: vec3.clone(position),
            intensity: config.intensity || 1.0,
            color: vec3.fromValues(1, 0.3, 0.1),
            radius: config.radius || 2.0,
            animated: true
        });
    }

    addSmokeEffect(config) {
        // Se integraría con el sistema de partículas
        console.log('Smoke effect added to building');
    }

    addGlowEffect(config) {
        this.glowEffects.push({
            type: 'glow',
            position: config.position || vec3.fromValues(0, this.config.height, 0),
            intensity: config.intensity || 0.5,
            color: config.color || vec3.fromValues(0.3, 0.6, 1.0),
            radius: config.radius || 5.0,
            pulsate: config.pulsate || false
        });
    }

    getRenderData() {
        return {
            position: this.position,
            rotation: this.rotation,
            scale: this.scale,
            config: this.config,
            windows: this.windows.filter(w => w.visible !== false),
            doors: this.doors,
            decorations: this.decorations.filter(d => d.visible !== false),
            lighting: this.lighting,
            glowEffects: this.glowEffects,
            constructionProgress: this.constructionProgress,
            condition: this.condition,
            activity: this.activity
        };
    }
}

class CommunityEnvironment {
    constructor(renderer, particleSystem) {
        this.renderer = renderer;
        this.particleSystem = particleSystem;
        
        // Colección de edificios
        this.buildings = new Map();
        this.districts = new Map();
        
        // Infraestructura
        this.roads = [];
        this.parks = [];
        this.utilities = [];
        this.streetLights = [];
        
        // Configuración del entorno
        this.layout = 'grid'; // 'grid', 'organic', 'radial'
        this.density = 0.7; // Densidad de construcción
        this.greenSpace = 0.2; // Porcentaje de espacios verdes
        
        // Parámetros ambientales
        this.weatherEffects = null;
        this.timeOfDay = 0.5;
        this.season = 0.25;
        
        // Efectos globales
        this.ambientLighting = [];
        this.communityEffects = [];
        
        this.init();
    }

    init() {
        this.generateInitialLayout();
        this.setupAmbientLighting();
        
        console.log('Community Environment inicializado');
    }

    generateInitialLayout() {
        // Crear algunos edificios de ejemplo
        this.addBuilding('residential', vec3.fromValues(0, 0, 0), {
            width: 12,
            height: 20,
            depth: 8,
            floors: 4,
            style: 'modern'
        });
        
        this.addBuilding('commercial', vec3.fromValues(25, 0, 0), {
            width: 15,
            height: 12,
            depth: 12,
            floors: 2,
            style: 'modern'
        });
        
        this.addBuilding('residential', vec3.fromValues(-25, 0, 0), {
            width: 10,
            height: 25,
            depth: 10,
            floors: 5,
            style: 'classical'
        });
        
        // Generar calles básicas
        this.generateRoads();
        
        // Generar iluminación pública
        this.generateStreetLights();
    }

    addBuilding(type, position, config = {}) {
        const id = `building_${this.buildings.size}`;
        const building = new Building(type, position, config);
        
        this.buildings.set(id, building);
        
        // Agregar efectos especiales ocasionales
        if (Math.random() > 0.8) {
            this.addBuildingEffects(building);
        }
        
        return id;
    }

    addBuildingEffects(building) {
        // Efectos aleatorios para hacer la comunidad más viva
        const effects = ['smoke', 'glow', 'sparks'];
        const effectType = effects[Math.floor(Math.random() * effects.length)];
        
        switch (effectType) {
            case 'smoke':
                if (building.type === 'industrial' || Math.random() > 0.7) {
                    building.addSpecialEffect('smoke', {
                        position: vec3.fromValues(0, building.config.height, 0)
                    });
                }
                break;
                
            case 'glow':
                if (building.type === 'commercial') {
                    building.addSpecialEffect('glow', {
                        color: vec3.fromValues(0.2, 0.8, 1.0),
                        intensity: 0.6,
                        pulsate: true
                    });
                }
                break;
                
            case 'sparks':
                if (building.constructionProgress < 1.0) {
                    building.addSpecialEffect('sparks', {
                        intensity: 0.8
                    });
                }
                break;
        }
    }

    generateRoads() {
        // Red de calles básica
        const roadWidth = 6;
        
        // Calle principal horizontal
        this.roads.push({
            type: 'main',
            start: vec3.fromValues(-50, 0, -roadWidth/2),
            end: vec3.fromValues(50, 0, -roadWidth/2),
            width: roadWidth,
            material: 'asphalt'
        });
        
        // Calles secundarias verticales
        for (let i = -2; i <= 2; i++) {
            this.roads.push({
                type: 'secondary',
                start: vec3.fromValues(i * 20, 0, -30),
                end: vec3.fromValues(i * 20, 0, 30),
                width: roadWidth * 0.7,
                material: 'asphalt'
            });
        }
        
        // Aceras
        this.roads.forEach(road => {
            this.roads.push({
                type: 'sidewalk',
                start: vec3.fromValues(road.start[0], 0.1, road.start[2] + road.width + 1),
                end: vec3.fromValues(road.end[0], 0.1, road.end[2] + road.width + 1),
                width: 2,
                material: 'concrete'
            });
        });
    }

    generateStreetLights() {
        // Farolas a lo largo de las calles
        this.roads.forEach(road => {
            if (road.type === 'main' || road.type === 'secondary') {
                const length = vec3.distance(road.start, road.end);
                const direction = vec3.create();
                vec3.sub(direction, road.end, road.start);
                vec3.normalize(direction, direction);
                
                const spacing = 15; // Espaciado entre farolas
                const count = Math.floor(length / spacing);
                
                for (let i = 0; i < count; i++) {
                    const position = vec3.create();
                    vec3.scaleAndAdd(position, road.start, direction, i * spacing);
                    position[1] = 0;
                    position[2] += road.width + 3; // Offset lateral
                    
                    this.streetLights.push({
                        position: vec3.clone(position),
                        height: 4,
                        intensity: 1.2,
                        color: vec3.fromValues(1, 0.9, 0.7),
                        range: 12,
                        style: 'modern'
                    });
                }
            }
        });
    }

    setupAmbientLighting() {
        // Iluminación ambiente general
        this.ambientLighting.push({
            type: 'ambient',
            color: vec3.fromValues(0.3, 0.4, 0.6),
            intensity: 0.4
        });
        
        // Iluminación direccional (sol/luna)
        this.ambientLighting.push({
            type: 'directional',
            direction: vec3.fromValues(0.3, -0.8, 0.5),
            color: vec3.fromValues(1, 0.95, 0.8),
            intensity: 1.5
        });
    }

    update(deltaTime) {
        // Actualizar todos los edificios
        this.buildings.forEach(building => {
            building.update(deltaTime);
        });
        
        // Actualizar efectos de la comunidad
        this.updateCommunityEffects(deltaTime);
        
        // Actualizar iluminación basada en hora del día
        this.updateTimeBasedLighting(deltaTime);
        
        // Actualizar efectos climáticos
        if (this.weatherEffects) {
            this.weatherEffects.update(deltaTime);
        }
    }

    updateCommunityEffects(deltaTime) {
        // Efectos que afectan a toda la comunidad
        this.communityEffects.forEach(effect => {
            effect.update(deltaTime);
        });
        
        // Efectos aleatorios ocasionales
        if (Math.random() < deltaTime * 0.01) { // 1% chance per segundo
            this.triggerRandomCommunityEffect();
        }
    }

    updateTimeBasedLighting(deltaTime) {
        // Ajustar iluminación según hora del día
        const sunlight = this.ambientLighting.find(light => light.type === 'directional');
        const ambient = this.ambientLighting.find(light => light.type === 'ambient');
        
        if (sunlight) {
            // Intensidad del sol basada en hora del día
            const sunIntensity = Math.max(0, Math.sin(this.timeOfDay * Math.PI));
            sunlight.intensity = sunIntensity * 1.5;
            
            // Color del sol (más cálido al amanecer/atardecer)
            const warmth = 1.0 - Math.abs(this.timeOfDay - 0.5) * 2;
            sunlight.color = vec3.fromValues(
                1.0,
                0.95 - warmth * 0.2,
                0.8 - warmth * 0.3
            );
        }
        
        if (ambient) {
            // Luz ambiente más azul durante la noche
            const nightFactor = 1.0 - Math.max(0, Math.sin(this.timeOfDay * Math.PI));
            ambient.color = vec3.fromValues(
                0.3 - nightFactor * 0.2,
                0.4 - nightFactor * 0.1,
                0.6 + nightFactor * 0.2
            );
            ambient.intensity = 0.2 + nightFactor * 0.2;
        }
        
        // Activar/desactivar farolas según hora del día
        const needStreetLights = this.timeOfDay < 0.2 || this.timeOfDay > 0.8;
        this.streetLights.forEach(light => {
            light.active = needStreetLights;
        });
    }

    triggerRandomCommunityEffect() {
        const effects = [
            () => this.createCelebrationFireworks(),
            () => this.createTrafficBurst(),
            () => this.createConstructionActivity(),
            () => this.createMarketActivity()
        ];
        
        const effect = effects[Math.floor(Math.random() * effects.length)];
        effect();
    }

    createCelebrationFireworks() {
        if (this.particleSystem) {
            const position = [
                Math.random() * 100 - 50,
                20 + Math.random() * 10,
                Math.random() * 60 - 30
            ];
            
            this.particleSystem.createCelebrationFireworks(position);
        }
    }

    createTrafficBurst() {
        // Simular aumento de actividad vehicular
        this.roads.forEach(road => {
            if (road.type === 'main') {
                road.trafficLevel = (road.trafficLevel || 0.3) + 0.4;
                
                setTimeout(() => {
                    road.trafficLevel = Math.max(0.1, road.trafficLevel - 0.4);
                }, 5000);
            }
        });
    }

    createConstructionActivity() {
        // Encontrar edificio en construcción y agregar efectos
        const incompleteBuildings = Array.from(this.buildings.values())
            .filter(building => building.constructionProgress < 1.0);
        
        if (incompleteBuildings.length > 0) {
            const building = incompleteBuildings[Math.floor(Math.random() * incompleteBuildings.length)];
            
            if (this.particleSystem) {
                this.particleSystem.createConstructionDust(building.position, 1.5);
            }
            
            building.addSpecialEffect('sparks', { intensity: 1.2 });
        }
    }

    createMarketActivity() {
        // Aumentar actividad en edificios comerciales
        this.buildings.forEach(building => {
            if (building.type === 'commercial') {
                building.activity = Math.min(1.0, building.activity + 0.3);
                
                setTimeout(() => {
                    building.activity = Math.max(0.2, building.activity - 0.3);
                }, 10000);
            }
        });
    }

    setTimeOfDay(time) {
        this.timeOfDay = Math.max(0, Math.min(1, time));
    }

    setSeason(season) {
        this.season = Math.max(0, Math.min(1, season));
        
        // Ajustar colores y efectos según estación
        this.updateSeasonalEffects();
    }

    updateSeasonalEffects() {
        // Efectos estacionales en edificios y entorno
        this.buildings.forEach(building => {
            // En invierno, más luces encendidas temprano
            if (this.season < 0.25 || this.season > 0.75) {
                building.windows.forEach(window => {
                    if (Math.random() > 0.3) {
                        window.lit = true;
                    }
                });
            }
            
            // En primavera/verano, más jardines y vegetación
            if (this.season > 0.2 && this.season < 0.8) {
                building.decorations.forEach(decoration => {
                    if (decoration.type === 'window_garden') {
                        decoration.blooming = true;
                    }
                });
            }
        });
    }

    setWeatherEffects(weatherSystem) {
        this.weatherEffects = weatherSystem;
    }

    addDistrict(name, bounds, characteristics) {
        this.districts.set(name, {
            bounds: bounds,
            characteristics: characteristics,
            buildings: []
        });
    }

    getBuildingsByType(type) {
        return Array.from(this.buildings.values()).filter(building => building.type === type);
    }

    getBuildingsInRadius(center, radius) {
        return Array.from(this.buildings.values()).filter(building => {
            const distance = vec3.distance(building.position, center);
            return distance <= radius;
        });
    }

    getRenderData() {
        return {
            buildings: Array.from(this.buildings.values()).map(building => building.getRenderData()),
            roads: this.roads,
            streetLights: this.streetLights.filter(light => light.active),
            parks: this.parks,
            ambientLighting: this.ambientLighting,
            timeOfDay: this.timeOfDay,
            season: this.season
        };
    }

    getStats() {
        return {
            totalBuildings: this.buildings.size,
            buildingsByType: this.getBuildingTypeStats(),
            totalRoads: this.roads.length,
            streetLights: this.streetLights.length,
            districts: this.districts.size,
            averageActivity: this.getAverageActivity()
        };
    }

    getBuildingTypeStats() {
        const stats = {};
        this.buildings.forEach(building => {
            stats[building.type] = (stats[building.type] || 0) + 1;
        });
        return stats;
    }

    getAverageActivity() {
        let totalActivity = 0;
        this.buildings.forEach(building => {
            totalActivity += building.activity;
        });
        return this.buildings.size > 0 ? totalActivity / this.buildings.size : 0;
    }

    dispose() {
        this.buildings.clear();
        this.districts.clear();
        this.roads.length = 0;
        this.streetLights.length = 0;
        this.communityEffects.length = 0;
        
        console.log('Community Environment limpiado');
    }
}

export { Building, CommunityEnvironment };