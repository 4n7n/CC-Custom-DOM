/**
 * Weather Effects - Sistema de efectos climáticos
 * Maneja lluvia, nieve, niebla, tormentas y otros fenómenos atmosféricos
 */

import { vec3, vec4, mat4 } from 'gl-matrix';

class WeatherEffect {
    constructor(type, intensity = 1.0) {
        this.type = type;
        this.intensity = intensity;
        this.active = false;
        this.transitionDuration = 5.0; // Segundos para transiciones
        this.currentTransitionTime = 0.0;
        
        // Área de efecto
        this.area = {
            center: vec3.fromValues(0, 0, 0),
            size: vec3.fromValues(100, 50, 100),
            height: 50
        };
        
        // Parámetros específicos del clima
        this.parameters = {};
        this.audioSources = new Map();
        
        this.initializeParameters();
    }

    initializeParameters() {
        switch (this.type) {
            case 'rain':
                this.parameters = {
                    dropCount: 1000,
                    dropSpeed: 15.0,
                    dropSize: 0.1,
                    windStrength: 2.0,
                    puddles: true,
                    splashEffect: true,
                    fogDensity: 0.1,
                    lightScattering: 0.3
                };
                break;
                
            case 'snow':
                this.parameters = {
                    flakeCount: 500,
                    fallSpeed: 2.0,
                    flakeSize: 0.3,
                    windTurbulence: 1.0,
                    accumulation: true,
                    meltRate: 0.1,
                    crystalTypes: 3
                };
                break;
                
            case 'fog':
                this.parameters = {
                    density: 0.5,
                    height: 10.0,
                    movement: 0.5,
                    color: vec3.fromValues(0.8, 0.85, 0.9),
                    scattering: 0.8,
                    visibility: 20.0
                };
                break;
                
            case 'storm':
                this.parameters = {
                    rainIntensity: 2.0,
                    windSpeed: 20.0,
                    lightningFrequency: 0.1,
                    thunderDelay: 3.0,
                    cloudDensity: 0.9,
                    darkness: 0.7
                };
                break;
                
            case 'sandstorm':
                this.parameters = {
                    particleCount: 2000,
                    windSpeed: 25.0,
                    visibility: 5.0,
                    color: vec3.fromValues(0.8, 0.6, 0.4),
                    erosion: true,
                    staticElectricity: 0.3
                };
                break;
        }
        
        // Aplicar modificador de intensidad
        this.scaleParameters();
    }

    scaleParameters() {
        Object.keys(this.parameters).forEach(key => {
            if (typeof this.parameters[key] === 'number') {
                this.parameters[key] *= this.intensity;
            }
        });
    }

    start() {
        this.active = true;
        this.currentTransitionTime = 0.0;
    }

    stop() {
        this.active = false;
        this.currentTransitionTime = 0.0;
    }

    update(deltaTime) {
        if (!this.active) return;
        
        // Manejo de transiciones
        if (this.currentTransitionTime < this.transitionDuration) {
            this.currentTransitionTime += deltaTime;
        }
        
        // Actualizar efectos específicos
        this.updateSpecificEffects(deltaTime);
    }

    updateSpecificEffects(deltaTime) {
        // Override en clases específicas
    }

    getTransitionFactor() {
        return Math.min(this.currentTransitionTime / this.transitionDuration, 1.0);
    }

    setArea(center, size, height) {
        vec3.copy(this.area.center, center);
        vec3.copy(this.area.size, size);
        this.area.height = height;
    }
}

class RainEffect extends WeatherEffect {
    constructor(intensity = 1.0) {
        super('rain', intensity);
        
        this.raindrops = [];
        this.puddles = new Map();
        this.splashes = [];
        this.lastSplashTime = 0;
        
        this.initializeRaindrops();
    }

    initializeRaindrops() {
        const count = Math.floor(this.parameters.dropCount);
        
        for (let i = 0; i < count; i++) {
            this.raindrops.push({
                position: vec3.fromValues(
                    (Math.random() - 0.5) * this.area.size[0],
                    this.area.height + Math.random() * 20,
                    (Math.random() - 0.5) * this.area.size[2]
                ),
                velocity: vec3.fromValues(
                    (Math.random() - 0.5) * this.parameters.windStrength,
                    -this.parameters.dropSpeed * (0.8 + Math.random() * 0.4),
                    0
                ),
                life: 1.0,
                size: this.parameters.dropSize * (0.5 + Math.random() * 0.5)
            });
        }
    }

    updateSpecificEffects(deltaTime) {
        this.updateRaindrops(deltaTime);
        this.updatePuddles(deltaTime);
        this.updateSplashes(deltaTime);
    }

    updateRaindrops(deltaTime) {
        const transitionFactor = this.getTransitionFactor();
        
        this.raindrops.forEach(drop => {
            // Actualizar posición
            vec3.scaleAndAdd(drop.position, drop.position, drop.velocity, deltaTime);
            
            // Aplicar viento
            const windEffect = Math.sin(Date.now() * 0.001 + drop.position[0] * 0.1) * this.parameters.windStrength;
            drop.position[0] += windEffect * deltaTime;
            
            // Verificar colisión con el suelo
            if (drop.position[1] <= 0) {
                this.createSplash(drop.position);
                this.createPuddle(drop.position);
                
                // Reiniciar gota
                drop.position[1] = this.area.height + Math.random() * 20;
                drop.position[0] = (Math.random() - 0.5) * this.area.size[0];
                drop.position[2] = (Math.random() - 0.5) * this.area.size[2];
            }
            
            // Aplicar factor de transición
            drop.life = transitionFactor;
        });
    }

    createSplash(position) {
        if (Date.now() - this.lastSplashTime < 50) return; // Limitar frecuencia
        
        this.splashes.push({
            position: vec3.clone(position),
            life: 1.0,
            maxLife: 0.3,
            radius: 0.1,
            maxRadius: 0.5
        });
        
        this.lastSplashTime = Date.now();
    }

    createPuddle(position) {
        const gridX = Math.floor(position[0] / 2);
        const gridZ = Math.floor(position[2] / 2);
        const key = `${gridX}_${gridZ}`;
        
        if (!this.puddles.has(key)) {
            this.puddles.set(key, {
                position: vec3.fromValues(gridX * 2, 0, gridZ * 2),
                depth: 0.0,
                maxDepth: 0.05,
                radius: 1.0
            });
        }
        
        const puddle = this.puddles.get(key);
        puddle.depth = Math.min(puddle.depth + 0.001, puddle.maxDepth);
    }

    updateSplashes(deltaTime) {
        this.splashes = this.splashes.filter(splash => {
            splash.life -= deltaTime / splash.maxLife;
            splash.radius = splash.maxRadius * (1.0 - splash.life);
            
            return splash.life > 0;
        });
    }

    updatePuddles(deltaTime) {
        // Evaporación gradual cuando no llueve
        if (!this.active) {
            this.puddles.forEach(puddle => {
                puddle.depth *= 0.99;
                if (puddle.depth < 0.001) {
                    this.puddles.delete(key);
                }
            });
        }
    }

    getRenderData() {
        return {
            raindrops: this.raindrops,
            puddles: Array.from(this.puddles.values()),
            splashes: this.splashes,
            intensity: this.intensity * this.getTransitionFactor()
        };
    }
}

class SnowEffect extends WeatherEffect {
    constructor(intensity = 1.0) {
        super('snow', intensity);
        
        this.snowflakes = [];
        this.snowAccumulation = new Map();
        this.crystalTextures = [];
        
        this.initializeSnowflakes();
    }

    initializeSnowflakes() {
        const count = Math.floor(this.parameters.flakeCount);
        
        for (let i = 0; i < count; i++) {
            this.snowflakes.push({
                position: vec3.fromValues(
                    (Math.random() - 0.5) * this.area.size[0],
                    this.area.height + Math.random() * 30,
                    (Math.random() - 0.5) * this.area.size[2]
                ),
                velocity: vec3.fromValues(
                    (Math.random() - 0.5) * 0.5,
                    -this.parameters.fallSpeed * (0.7 + Math.random() * 0.6),
                    (Math.random() - 0.5) * 0.5
                ),
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 2.0,
                size: this.parameters.flakeSize * (0.3 + Math.random() * 0.7),
                type: Math.floor(Math.random() * this.parameters.crystalTypes),
                life: 1.0
            });
        }
    }

    updateSpecificEffects(deltaTime) {
        this.updateSnowflakes(deltaTime);
        this.updateAccumulation(deltaTime);
    }

    updateSnowflakes(deltaTime) {
        const transitionFactor = this.getTransitionFactor();
        const time = Date.now() * 0.001;
        
        this.snowflakes.forEach(flake => {
            // Movimiento oscilante
            const sway = Math.sin(time * 0.5 + flake.position[0] * 0.1) * this.parameters.windTurbulence;
            flake.velocity[0] = sway;
            
            // Actualizar posición
            vec3.scaleAndAdd(flake.position, flake.position, flake.velocity, deltaTime);
            
            // Rotación
            flake.rotation += flake.rotationSpeed * deltaTime;
            
            // Verificar colisión con el suelo
            if (flake.position[1] <= 0) {
                this.addToAccumulation(flake.position, flake.size);
                
                // Reiniciar copo
                flake.position[1] = this.area.height + Math.random() * 30;
                flake.position[0] = (Math.random() - 0.5) * this.area.size[0];
                flake.position[2] = (Math.random() - 0.5) * this.area.size[2];
            }
            
            // Aplicar factor de transición
            flake.life = transitionFactor;
        });
    }

    addToAccumulation(position, size) {
        if (!this.parameters.accumulation) return;
        
        const gridX = Math.floor(position[0] / 1);
        const gridZ = Math.floor(position[2] / 1);
        const key = `${gridX}_${gridZ}`;
        
        if (!this.snowAccumulation.has(key)) {
            this.snowAccumulation.set(key, {
                position: vec3.fromValues(gridX, 0, gridZ),
                height: 0.0,
                density: 0.0
            });
        }
        
        const accumulation = this.snowAccumulation.get(key);
        accumulation.height += size * 0.01;
        accumulation.density = Math.min(accumulation.density + 0.1, 1.0);
    }

    updateAccumulation(deltaTime) {
        // Derretimiento gradual
        this.snowAccumulation.forEach((accumulation, key) => {
            accumulation.height *= (1.0 - this.parameters.meltRate * deltaTime);
            
            if (accumulation.height < 0.01) {
                this.snowAccumulation.delete(key);
            }
        });
    }

    getRenderData() {
        return {
            snowflakes: this.snowflakes,
            accumulation: Array.from(this.snowAccumulation.values()),
            intensity: this.intensity * this.getTransitionFactor()
        };
    }
}

class FogEffect extends WeatherEffect {
    constructor(intensity = 1.0) {
        super('fog', intensity);
        
        this.fogLayers = [];
        this.noiseOffset = vec3.create();
        
        this.initializeFogLayers();
    }

    initializeFogLayers() {
        // Crear múltiples capas de niebla para efecto más realista
        for (let i = 0; i < 3; i++) {
            this.fogLayers.push({
                height: i * 5.0,
                thickness: 8.0 + i * 2.0,
                density: this.parameters.density * (1.0 - i * 0.2),
                speed: this.parameters.movement * (0.5 + i * 0.3),
                direction: vec3.fromValues(
                    Math.cos(i * Math.PI / 3),
                    0,
                    Math.sin(i * Math.PI / 3)
                )
            });
        }
    }

    updateSpecificEffects(deltaTime) {
        // Actualizar offset de ruido para movimiento de niebla
        const time = Date.now() * 0.001;
        
        this.fogLayers.forEach((layer, index) => {
            vec3.scaleAndAdd(layer.offset, layer.offset || vec3.create(), layer.direction, layer.speed * deltaTime);
        });
        
        // Variación temporal de densidad
        const densityVariation = Math.sin(time * 0.1) * 0.1 + 0.9;
        this.currentDensity = this.parameters.density * densityVariation * this.getTransitionFactor();
    }

    getRenderData() {
        return {
            layers: this.fogLayers,
            density: this.currentDensity,
            color: this.parameters.color,
            scattering: this.parameters.scattering,
            visibility: this.parameters.visibility,
            intensity: this.intensity * this.getTransitionFactor()
        };
    }
}

class StormEffect extends WeatherEffect {
    constructor(intensity = 1.0) {
        super('storm', intensity);
        
        this.rainEffect = new RainEffect(this.parameters.rainIntensity);
        this.lightningStrikes = [];
        this.thunderSounds = [];
        this.lastLightningTime = 0;
        
        this.windDirection = vec3.fromValues(1, 0, 0);
        this.windVariation = 0;
    }

    updateSpecificEffects(deltaTime) {
        // Actualizar lluvia intensa
        this.rainEffect.intensity = this.parameters.rainIntensity * this.getTransitionFactor();
        this.rainEffect.update(deltaTime);
        
        // Actualizar viento
        this.updateWind(deltaTime);
        
        // Generar rayos
        this.updateLightning(deltaTime);
        
        // Actualizar rayos existentes
        this.updateLightningStrikes(deltaTime);
    }

    updateWind(deltaTime) {
        const time = Date.now() * 0.001;
        
        // Variación del viento
        this.windVariation = Math.sin(time * 0.3) * 0.5 + 0.5;
        const currentWindSpeed = this.parameters.windSpeed * this.windVariation;
        
        // Rotar dirección del viento lentamente
        const windAngle = time * 0.1;
        this.windDirection[0] = Math.cos(windAngle);
        this.windDirection[2] = Math.sin(windAngle);
        
        // Aplicar viento a la lluvia
        vec3.scale(this.rainEffect.parameters.windStrength, this.windDirection, currentWindSpeed * 0.1);
    }

    updateLightning(deltaTime) {
        const time = Date.now();
        const timeSinceLastLightning = (time - this.lastLightningTime) / 1000;
        
        // Probabilidad de rayo basada en frecuencia
        const lightningChance = this.parameters.lightningFrequency * deltaTime;
        
        if (Math.random() < lightningChance && timeSinceLastLightning > 2.0) {
            this.createLightningStrike();
            this.lastLightningTime = time;
        }
    }

    createLightningStrike() {
        const strike = {
            startPos: vec3.fromValues(
                (Math.random() - 0.5) * this.area.size[0],
                this.area.height,
                (Math.random() - 0.5) * this.area.size[2]
            ),
            endPos: vec3.fromValues(
                (Math.random() - 0.5) * this.area.size[0],
                0,
                (Math.random() - 0.5) * this.area.size[2]
            ),
            branches: [],
            life: 1.0,
            maxLife: 0.2,
            intensity: 0.8 + Math.random() * 0.4,
            thickness: 0.1 + Math.random() * 0.1
        };
        
        // Generar ramas del rayo
        this.generateLightningBranches(strike);
        
        this.lightningStrikes.push(strike);
        
        // Programar trueno
        setTimeout(() => {
            this.createThunder(strike);
        }, this.parameters.thunderDelay * 1000);
    }

    generateLightningBranches(strike) {
        const segments = 10;
        const mainPath = [];
        
        // Crear segmentos del rayo principal
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pos = vec3.create();
            vec3.lerp(pos, strike.startPos, strike.endPos, t);
            
            // Agregar variación aleatoria
            pos[0] += (Math.random() - 0.5) * 2.0 * (1.0 - t);
            pos[2] += (Math.random() - 0.5) * 2.0 * (1.0 - t);
            
            mainPath.push(pos);
            
            // Crear ramas ocasionales
            if (Math.random() < 0.3 && i > 2 && i < segments - 2) {
                const branchEnd = vec3.create();
                vec3.copy(branchEnd, pos);
                branchEnd[0] += (Math.random() - 0.5) * 10.0;
                branchEnd[1] -= Math.random() * 5.0;
                branchEnd[2] += (Math.random() - 0.5) * 10.0;
                
                strike.branches.push({
                    start: vec3.clone(pos),
                    end: branchEnd,
                    intensity: 0.3 + Math.random() * 0.3
                });
            }
        }
        
        strike.path = mainPath;
    }

    createThunder(strike) {
        // Calcular distancia para retraso del sonido
        const distance = vec3.distance(strike.endPos, this.area.center);
        const soundDelay = distance / 343; // Velocidad del sonido
        
        this.thunderSounds.push({
            position: strike.endPos,
            intensity: strike.intensity,
            delay: soundDelay,
            life: 1.0,
            maxLife: 3.0
        });
    }

    updateLightningStrikes(deltaTime) {
        this.lightningStrikes = this.lightningStrikes.filter(strike => {
            strike.life -= deltaTime / strike.maxLife;
            return strike.life > 0;
        });
        
        this.thunderSounds = this.thunderSounds.filter(thunder => {
            thunder.life -= deltaTime / thunder.maxLife;
            return thunder.life > 0;
        });
    }

    getRenderData() {
        return {
            rain: this.rainEffect.getRenderData(),
            lightning: this.lightningStrikes,
            thunder: this.thunderSounds,
            wind: {
                direction: this.windDirection,
                speed: this.parameters.windSpeed * this.windVariation,
                intensity: this.intensity * this.getTransitionFactor()
            },
            darkness: this.parameters.darkness * this.getTransitionFactor()
        };
    }
}

class WeatherSystem {
    constructor(renderer, particleSystem) {
        this.renderer = renderer;
        this.particleSystem = particleSystem;
        
        this.currentWeather = null;
        this.weatherQueue = [];
        this.transitionTime = 0;
        this.maxTransitionTime = 10.0;
        
        // Configuración global del clima
        this.globalParameters = {
            temperature: 20.0, // Celsius
            humidity: 0.5,
            pressure: 1013.25, // hPa
            windDirection: vec3.fromValues(1, 0, 0),
            windSpeed: 5.0,
            cloudCover: 0.3,
            season: 'spring' // spring, summer, autumn, winter
        };
        
        // Efectos ambientales
        this.ambientEffects = {
            fog: null,
            wind: null,
            temperature: null
        };
        
        // Estadísticas
        this.stats = {
            activeEffects: 0,
            particlesGenerated: 0,
            performance: 'good'
        };
        
        this.init();
    }

    init() {
        this.createWeatherShaders();
        this.setupAmbientEffects();
        
        console.log('Weather System inicializado');
    }

    createWeatherShaders() {
        // Shader para efectos de lluvia
        const rainVertexShader = `
            attribute vec3 a_position;
            attribute float a_life;
            attribute float a_size;
            
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform float u_time;
            uniform vec3 u_windDirection;
            uniform float u_windStrength;
            
            varying float v_life;
            varying vec2 v_texCoord;
            
            void main() {
                vec3 position = a_position;
                
                // Efecto de viento
                position += u_windDirection * u_windStrength * sin(u_time + a_position.y * 0.1);
                
                gl_Position = u_projectionMatrix * u_viewMatrix * vec4(position, 1.0);
                gl_PointSize = a_size * (2.0 - a_life);
                
                v_life = a_life;
            }
        `;
        
        const rainFragmentShader = `
            precision mediump float;
            
            uniform sampler2D u_rainTexture;
            uniform float u_intensity;
            
            varying float v_life;
            
            void main() {
                vec2 center = gl_PointCoord - 0.5;
                float dist = length(center);
                
                if (dist > 0.5) discard;
                
                float alpha = (1.0 - dist * 2.0) * v_life * u_intensity;
                gl_FragColor = vec4(0.7, 0.8, 1.0, alpha);
            }
        `;
        
        this.renderer.createProgram('weather_rain', rainVertexShader, rainFragmentShader);
        
        // Shader para nieve
        const snowVertexShader = `
            attribute vec3 a_position;
            attribute float a_rotation;
            attribute float a_size;
            attribute float a_life;
            
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform vec3 u_cameraPosition;
            
            varying float v_life;
            varying float v_rotation;
            
            void main() {
                // Billboard hacia la cámara
                vec3 toCam = normalize(u_cameraPosition - a_position);
                vec3 up = vec3(0.0, 1.0, 0.0);
                vec3 right = cross(up, toCam);
                
                gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position, 1.0);
                gl_PointSize = a_size * v_life;
                
                v_life = a_life;
                v_rotation = a_rotation;
            }
        `;
        
        const snowFragmentShader = `
            precision mediump float;
            
            uniform sampler2D u_snowTexture;
            
            varying float v_life;
            varying float v_rotation;
            
            void main() {
                vec2 coord = gl_PointCoord;
                
                // Rotar coordenadas de textura
                float c = cos(v_rotation);
                float s = sin(v_rotation);
                mat2 rotation = mat2(c, -s, s, c);
                coord = rotation * (coord - 0.5) + 0.5;
                
                vec4 texColor = texture2D(u_snowTexture, coord);
                texColor.a *= v_life;
                
                gl_FragColor = texColor;
            }
        `;
        
        this.renderer.createProgram('weather_snow', snowVertexShader, snowFragmentShader);
    }

    setupAmbientEffects() {
        // Configurar efectos ambientales básicos
        this.ambientEffects.wind = {
            strength: this.globalParameters.windSpeed,
            direction: vec3.clone(this.globalParameters.windDirection),
            turbulence: 0.1,
            gustFrequency: 0.05
        };
    }

    setWeather(weatherType, intensity = 1.0, duration = null) {
        // Detener clima actual si existe
        if (this.currentWeather) {
            this.currentWeather.stop();
        }
        
        // Crear nuevo efecto de clima
        let newWeather;
        switch (weatherType) {
            case 'rain':
                newWeather = new RainEffect(intensity);
                break;
            case 'snow':
                newWeather = new SnowEffect(intensity);
                break;
            case 'fog':
                newWeather = new FogEffect(intensity);
                break;
            case 'storm':
                newWeather = new StormEffect(intensity);
                break;
            case 'clear':
                newWeather = null;
                break;
            default:
                console.warn(`Tipo de clima no reconocido: ${weatherType}`);
                return;
        }
        
        if (newWeather) {
            newWeather.setArea(
                this.globalParameters.area?.center || vec3.fromValues(0, 0, 0),
                this.globalParameters.area?.size || vec3.fromValues(100, 50, 100),
                this.globalParameters.area?.height || 50
            );
            newWeather.start();
        }
        
        this.currentWeather = newWeather;
        this.transitionTime = 0;
        
        // Configurar duración si se especifica
        if (duration && newWeather) {
            setTimeout(() => {
                this.setWeather('clear');
            }, duration * 1000);
        }
        
        console.log(`Clima cambiado a: ${weatherType} (intensidad: ${intensity})`);
    }

    queueWeatherChange(weatherType, intensity, delay, duration) {
        this.weatherQueue.push({
            type: weatherType,
            intensity: intensity,
            delay: delay,
            duration: duration,
            scheduled: Date.now() + delay * 1000
        });
    }

    update(deltaTime) {
        // Procesar cola de cambios de clima
        this.processWeatherQueue();
        
        // Actualizar clima actual
        if (this.currentWeather) {
            this.currentWeather.update(deltaTime);
            this.stats.activeEffects = 1;
        } else {
            this.stats.activeEffects = 0;
        }
        
        // Actualizar efectos ambientales
        this.updateAmbientEffects(deltaTime);
        
        // Actualizar transición
        this.transitionTime += deltaTime;
        
        // Monitorear rendimiento
        this.updatePerformanceMetrics();
    }

    processWeatherQueue() {
        const now = Date.now();
        
        this.weatherQueue = this.weatherQueue.filter(weather => {
            if (now >= weather.scheduled) {
                this.setWeather(weather.type, weather.intensity, weather.duration);
                return false; // Remover de la cola
            }
            return true;
        });
    }

    updateAmbientEffects(deltaTime) {
        const time = Date.now() * 0.001;
        
        // Actualizar viento
        if (this.ambientEffects.wind) {
            // Variación de intensidad del viento
            const gustEffect = Math.sin(time * this.ambientEffects.wind.gustFrequency) * 0.3 + 0.7;
            this.ambientEffects.wind.currentStrength = this.ambientEffects.wind.strength * gustEffect;
            
            // Turbulencia
            const turbulence = vec3.fromValues(
                Math.sin(time * 0.7) * this.ambientEffects.wind.turbulence,
                0,
                Math.cos(time * 0.5) * this.ambientEffects.wind.turbulence
            );
            
            vec3.add(this.ambientEffects.wind.currentDirection, 
                    this.ambientEffects.wind.direction, 
                    turbulence);
            vec3.normalize(this.ambientEffects.wind.currentDirection, 
                          this.ambientEffects.wind.currentDirection);
        }
    }

    updatePerformanceMetrics() {
        // Evaluar rendimiento basado en número de partículas activas
        const totalParticles = this.particleSystem.stats.totalParticles;
        
        if (totalParticles > 10000) {
            this.stats.performance = 'poor';
            this.optimizeWeatherEffects();
        } else if (totalParticles > 5000) {
            this.stats.performance = 'fair';
        } else {
            this.stats.performance = 'good';
        }
    }

    optimizeWeatherEffects() {
        if (this.currentWeather) {
            // Reducir intensidad para mejorar rendimiento
            this.currentWeather.intensity *= 0.8;
            console.log('Efectos de clima optimizados para rendimiento');
        }
    }

    render(camera) {
        if (!this.currentWeather) return;
        
        const weatherData = this.currentWeather.getRenderData();
        
        // Renderizar efectos específicos según el tipo
        switch (this.currentWeather.type) {
            case 'rain':
                this.renderRain(weatherData, camera);
                break;
            case 'snow':
                this.renderSnow(weatherData, camera);
                break;
            case 'fog':
                this.renderFog(weatherData, camera);
                break;
            case 'storm':
                this.renderStorm(weatherData, camera);
                break;
        }
    }

    renderRain(data, camera) {
        const gl = this.renderer.gl;
        const program = this.renderer.useProgram('weather_rain');
        
        // Configurar uniforms
        this.renderer.setUniform(program, 'u_viewMatrix', camera.viewMatrix);
        this.renderer.setUniform(program, 'u_projectionMatrix', camera.projectionMatrix);
        this.renderer.setUniform(program, 'u_time', Date.now() * 0.001);
        this.renderer.setUniform(program, 'u_intensity', data.intensity);
        
        // Configurar blending para lluvia
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        
        // Renderizar gotas de lluvia como puntos
        this.renderParticlePoints(data.raindrops);
        
        // Renderizar charcos si existen
        if (data.puddles.length > 0) {
            this.renderPuddles(data.puddles, camera);
        }
        
        // Renderizar salpicaduras
        if (data.splashes.length > 0) {
            this.renderSplashes(data.splashes, camera);
        }
        
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    renderSnow(data, camera) {
        const gl = this.renderer.gl;
        const program = this.renderer.useProgram('weather_snow');
        
        // Configurar uniforms
        this.renderer.setUniform(program, 'u_viewMatrix', camera.viewMatrix);
        this.renderer.setUniform(program, 'u_projectionMatrix', camera.projectionMatrix);
        this.renderer.setUniform(program, 'u_cameraPosition', camera.position);
        
        // Configurar blending para nieve
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        
        // Renderizar copos de nieve
        this.renderParticlePoints(data.snowflakes);
        
        // Renderizar acumulación si existe
        if (data.accumulation.length > 0) {
            this.renderSnowAccumulation(data.accumulation, camera);
        }
        
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    renderParticlePoints(particles) {
        // Implementación simplificada para renderizar partículas como puntos
        const gl = this.renderer.gl;
        
        // Crear buffer temporal para las posiciones
        const positions = new Float32Array(particles.length * 3);
        let offset = 0;
        
        particles.forEach(particle => {
            positions[offset++] = particle.position[0];
            positions[offset++] = particle.position[1];
            positions[offset++] = particle.position[2];
        });
        
        // Renderizar puntos (implementación básica)
        gl.drawArrays(gl.POINTS, 0, particles.length);
    }

    renderPuddles(puddles, camera) {
        // Implementación básica para renderizar charcos
        // En un sistema completo, esto usaría geometría de quads y reflejos
    }

    renderSplashes(splashes, camera) {
        // Implementación básica para renderizar salpicaduras
        // En un sistema completo, esto usaría efectos de partículas expandiéndose
    }

    renderSnowAccumulation(accumulation, camera) {
        // Implementación básica para renderizar acumulación de nieve
        // En un sistema completo, esto modificaría la geometría del terreno
    }

    renderFog(data, camera) {
        // Implementación de renderizado de niebla
        // Típicamente se hace en post-procesado o como efecto volumétrico
    }

    renderStorm(data, camera) {
        // Renderizar lluvia intensa
        this.renderRain(data.rain, camera);
        
        // Renderizar rayos
        if (data.lightning.length > 0) {
            this.renderLightning(data.lightning, camera);
        }
    }

    renderLightning(strikes, camera) {
        // Implementación básica para renderizar rayos
        // En un sistema completo, usaría líneas brillantes con efectos de bloom
    }

    // Métodos de utilidad
    setGlobalParameters(params) {
        Object.assign(this.globalParameters, params);
    }

    getWeatherIntensity() {
        return this.currentWeather ? this.currentWeather.intensity : 0.0;
    }

    getWindData() {
        return this.ambientEffects.wind;
    }

    isRaining() {
        return this.currentWeather && this.currentWeather.type === 'rain';
    }

    isSnowing() {
        return this.currentWeather && this.currentWeather.type === 'snow';
    }

    getStats() {
        return {
            ...this.stats,
            currentWeather: this.currentWeather?.type || 'clear',
            intensity: this.currentWeather?.intensity || 0,
            queuedChanges: this.weatherQueue.length
        };
    }

    dispose() {
        // Limpiar efectos actuales
        if (this.currentWeather) {
            this.currentWeather.stop();
        }
        
        // Limpiar cola
        this.weatherQueue.length = 0;
        
        console.log('Weather System limpiado');
    }
}

export { WeatherEffect, RainEffect, SnowEffect, FogEffect, StormEffect, WeatherSystem };