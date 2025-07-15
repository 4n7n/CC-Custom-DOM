/**
 * Atmospheric Effects - Efectos atmosféricos avanzados
 * Maneja dispersión de luz, rayos de sol, aurora boreal y efectos volumétricos
 */

import { vec3, vec4, mat4 } from 'gl-matrix';

class AtmosphericScattering {
    constructor() {
        // Parámetros de dispersión de Rayleigh (moléculas de aire)
        this.rayleighCoefficient = 0.0025;
        this.rayleighColor = vec3.fromValues(0.3, 0.6, 1.0);
        this.rayleighScaleHeight = 8000; // metros
        
        // Parámetros de dispersión de Mie (aerosoles y partículas)
        this.mieCoefficient = 0.001;
        this.mieColor = vec3.fromValues(0.9, 0.8, 0.7);
        this.mieDirectionalG = 0.758; // Factor de anisotropía
        this.mieScaleHeight = 1200; // metros
        
        // Parámetros del planeta
        this.earthRadius = 6360000; // metros
        this.atmosphereRadius = 6420000; // metros
        
        // Sol y iluminación
        this.sunDirection = vec3.fromValues(0.3, 0.8, 0.5);
        this.sunIntensity = 20.0;
        this.sunColor = vec3.fromValues(1.0, 0.95, 0.8);
        
        // Configuración de calidad
        this.sampleCount = 16;
        this.lightSampleCount = 8;
        
        vec3.normalize(this.sunDirection, this.sunDirection);
    }

    // Función de fase de Rayleigh
    rayleighPhase(cosTheta) {
        return (3.0 / (16.0 * Math.PI)) * (1.0 + cosTheta * cosTheta);
    }

    // Función de fase de Mie (Henyey-Greenstein)
    miePhase(cosTheta, g) {
        const g2 = g * g;
        const denom = 1.0 + g2 - 2.0 * g * cosTheta;
        return (1.0 - g2) / (4.0 * Math.PI * Math.pow(denom, 1.5));
    }

    // Densidad atmosférica exponencial
    atmosphereDensity(altitude) {
        return Math.exp(-altitude / this.rayleighScaleHeight);
    }

    // Calcular dispersión para un rayo
    calculateScattering(rayStart, rayDirection, rayLength, lightDirection) {
        const stepSize = rayLength / this.sampleCount;
        let rayleighAccum = vec3.create();
        let mieAccum = vec3.create();
        
        for (let i = 0; i < this.sampleCount; i++) {
            const samplePoint = vec3.create();
            vec3.scaleAndAdd(samplePoint, rayStart, rayDirection, (i + 0.5) * stepSize);
            
            const altitude = vec3.length(samplePoint) - this.earthRadius;
            const density = this.atmosphereDensity(altitude);
            
            // Acumular dispersión
            const rayleighScatter = this.rayleighCoefficient * density * stepSize;
            const mieScatter = this.mieCoefficient * density * stepSize;
            
            vec3.scaleAndAdd(rayleighAccum, rayleighAccum, this.rayleighColor, rayleighScatter);
            vec3.scaleAndAdd(mieAccum, mieAccum, this.mieColor, mieScatter);
        }
        
        // Aplicar funciones de fase
        const cosTheta = vec3.dot(rayDirection, lightDirection);
        const rayleighPhase = this.rayleighPhase(cosTheta);
        const miePhase = this.miePhase(cosTheta, this.mieDirectionalG);
        
        vec3.scale(rayleighAccum, rayleighAccum, rayleighPhase);
        vec3.scale(mieAccum, mieAccum, miePhase);
        
        // Combinar y aplicar intensidad solar
        const result = vec3.create();
        vec3.add(result, rayleighAccum, mieAccum);
        vec3.scale(result, result, this.sunIntensity);
        
        return result;
    }

    setSunDirection(x, y, z) {
        vec3.set(this.sunDirection, x, y, z);
        vec3.normalize(this.sunDirection, this.sunDirection);
    }

    getSunDirection() {
        return vec3.clone(this.sunDirection);
    }
}

class VolumetricLighting {
    constructor(renderer) {
        this.renderer = renderer;
        this.enabled = true;
        
        // Configuración de rayos de luz
        this.lightShafts = [];
        this.dustParticles = [];
        
        // Parámetros de luz volumétrica
        this.density = 0.1;
        this.scattering = 0.8;
        this.extinction = 0.2;
        this.exposure = 1.0;
        
        // Configuración de muestreo
        this.stepCount = 32;
        this.noiseScale = 0.1;
        this.animationSpeed = 1.0;
        
        this.init();
    }

    init() {
        this.createVolumetricShader();
        this.createLightShafts();
    }

    createVolumetricShader() {
        const vertexShader = `
            attribute vec3 a_position;
            attribute vec2 a_texCoord;
            
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            
            varying vec2 v_texCoord;
            varying vec3 v_worldPos;
            
            void main() {
                vec4 worldPos = vec4(a_position, 1.0);
                v_worldPos = worldPos.xyz;
                v_texCoord = a_texCoord;
                
                gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
            }
        `;
        
        const fragmentShader = `
            precision highp float;
            
            uniform vec3 u_cameraPosition;
            uniform vec3 u_lightDirection;
            uniform vec3 u_lightColor;
            uniform float u_lightIntensity;
            uniform float u_density;
            uniform float u_scattering;
            uniform float u_extinction;
            uniform float u_time;
            uniform sampler2D u_noiseTexture;
            uniform sampler2D u_depthTexture;
            uniform mat4 u_inverseViewProjection;
            
            varying vec2 v_texCoord;
            varying vec3 v_worldPos;
            
            const int STEP_COUNT = 32;
            const float PI = 3.14159265359;
            
            float henyeyGreenstein(float cosTheta, float g) {
                float g2 = g * g;
                return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
            }
            
            vec3 sampleNoise3D(vec3 pos, float scale) {
                vec3 noise;
                noise.x = texture2D(u_noiseTexture, pos.xy * scale + u_time * 0.01).r;
                noise.y = texture2D(u_noiseTexture, pos.yz * scale + u_time * 0.015).r;
                noise.z = texture2D(u_noiseTexture, pos.zx * scale + u_time * 0.012).r;
                return noise * 2.0 - 1.0;
            }
            
            void main() {
                // Reconstruir posición mundial desde depth buffer
                float depth = texture2D(u_depthTexture, v_texCoord).r;
                vec4 ndcPos = vec4(v_texCoord * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
                vec4 worldPos = u_inverseViewProjection * ndcPos;
                worldPos /= worldPos.w;
                
                vec3 rayStart = u_cameraPosition;
                vec3 rayEnd = worldPos.xyz;
                vec3 rayDirection = normalize(rayEnd - rayStart);
                float rayLength = length(rayEnd - rayStart);
                
                // Muestreo a lo largo del rayo
                float stepSize = rayLength / float(STEP_COUNT);
                vec3 currentPos = rayStart;
                vec3 scatteredLight = vec3(0.0);
                float transmittance = 1.0;
                
                for (int i = 0; i < STEP_COUNT; i++) {
                    // Densidad volumétrica con ruido
                    vec3 noise = sampleNoise3D(currentPos, 0.01);
                    float localDensity = u_density * (0.5 + 0.5 * noise.x);
                    
                    if (localDensity > 0.001) {
                        // Calcular scattering hacia la cámara
                        float cosTheta = dot(rayDirection, -u_lightDirection);
                        float phase = henyeyGreenstein(cosTheta, 0.3);
                        
                        // Atenuación por distancia desde la luz
                        float lightAttenuation = 1.0 / (1.0 + length(currentPos) * 0.0001);
                        
                        // Contribución de luz dispersada
                        vec3 lightContribution = u_lightColor * u_lightIntensity * 
                                               localDensity * phase * lightAttenuation * stepSize;
                        
                        scatteredLight += lightContribution * transmittance;
                        
                        // Actualizar transmitancia
                        transmittance *= exp(-localDensity * u_extinction * stepSize);
                    }
                    
                    currentPos += rayDirection * stepSize;
                }
                
                gl_FragColor = vec4(scatteredLight, 1.0 - transmittance);
            }
        `;
        
        this.renderer.createProgram('volumetric_lighting', vertexShader, fragmentShader);
    }

    createLightShafts() {
        // Crear rayos de luz procedurales
        for (let i = 0; i < 5; i++) {
            this.lightShafts.push({
                direction: vec3.fromValues(
                    Math.random() - 0.5,
                    -0.8 - Math.random() * 0.4,
                    Math.random() - 0.5
                ),
                intensity: 0.5 + Math.random() * 0.5,
                width: 2.0 + Math.random() * 3.0,
                length: 50.0 + Math.random() * 50.0,
                animation: Math.random() * Math.PI * 2
            });
        }
    }

    update(deltaTime) {
        // Animar rayos de luz
        this.lightShafts.forEach(shaft => {
            shaft.animation += deltaTime * this.animationSpeed;
            
            // Variación sutil en intensidad
            shaft.currentIntensity = shaft.intensity * 
                (0.8 + 0.2 * Math.sin(shaft.animation));
        });
        
        // Animar partículas de polvo
        this.dustParticles.forEach(particle => {
            particle.position[1] += particle.fallSpeed * deltaTime;
            particle.position[0] += Math.sin(particle.animation) * 0.1 * deltaTime;
            particle.animation += deltaTime;
            
            // Reiniciar si sale del área
            if (particle.position[1] < -50) {
                particle.position[1] = 50;
                particle.position[0] = (Math.random() - 0.5) * 100;
                particle.position[2] = (Math.random() - 0.5) * 100;
            }
        });
    }

    render(camera, lightDirection, lightColor, lightIntensity) {
        if (!this.enabled) return;
        
        const gl = this.renderer.gl;
        const program = this.renderer.useProgram('volumetric_lighting');
        
        // Configurar uniforms
        this.renderer.setUniform(program, 'u_cameraPosition', camera.position);
        this.renderer.setUniform(program, 'u_lightDirection', lightDirection);
        this.renderer.setUniform(program, 'u_lightColor', lightColor);
        this.renderer.setUniform(program, 'u_lightIntensity', lightIntensity);
        this.renderer.setUniform(program, 'u_density', this.density);
        this.renderer.setUniform(program, 'u_scattering', this.scattering);
        this.renderer.setUniform(program, 'u_extinction', this.extinction);
        this.renderer.setUniform(program, 'u_time', Date.now() * 0.001);
        
        // Configurar blending aditivo
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.depthMask(false);
        
        // Renderizar efectos volumétricos
        this.renderLightShafts(camera);
        
        // Restaurar estado
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    renderLightShafts(camera) {
        // Implementación simplificada de rayos de luz
        this.lightShafts.forEach(shaft => {
            if (shaft.currentIntensity > 0.1) {
                // Renderizar geometría del rayo de luz
                this.renderSingleShaft(shaft, camera);
            }
        });
    }

    renderSingleShaft(shaft, camera) {
        // Crear geometría procedural para el rayo de luz
        // En una implementación completa, esto crearía un cono o cilindro
    }
}

class Aurora {
    constructor() {
        this.enabled = false;
        this.intensity = 1.0;
        this.speed = 1.0;
        this.height = 100000; // metros sobre la superficie
        this.thickness = 20000;
        
        // Colores típicos de aurora
        this.colors = [
            vec3.fromValues(0.2, 1.0, 0.3), // Verde (oxígeno a 557.7nm)
            vec3.fromValues(1.0, 0.2, 0.2), // Rojo (oxígeno a 630nm)
            vec3.fromValues(0.3, 0.3, 1.0), // Azul (nitrógeno)
            vec3.fromValues(0.8, 0.2, 1.0)  // Púrpura (nitrógeno)
        ];
        
        this.currentColors = [];
        this.waves = [];
        
        this.initializeWaves();
    }

    initializeWaves() {
        // Crear ondas de aurora
        for (let i = 0; i < 8; i++) {
            this.waves.push({
                amplitude: 5000 + Math.random() * 10000,
                frequency: 0.00001 + Math.random() * 0.00005,
                phase: Math.random() * Math.PI * 2,
                speed: 0.1 + Math.random() * 0.3,
                color: this.colors[Math.floor(Math.random() * this.colors.length)]
            });
        }
    }

    update(deltaTime, magneticActivity = 0.5) {
        if (!this.enabled) return;
        
        // Actualizar ondas
        this.waves.forEach(wave => {
            wave.phase += wave.speed * deltaTime * this.speed;
            
            // Variar intensidad basada en actividad magnética
            wave.currentIntensity = this.intensity * magneticActivity * 
                (0.7 + 0.3 * Math.sin(wave.phase * 0.1));
        });
    }

    calculateAuroraColor(position, time) {
        if (!this.enabled) return vec3.create();
        
        const auroraColor = vec3.create();
        const altitude = position[1];
        
        // Solo mostrar aurora en altitudes apropiadas
        if (altitude < this.height - this.thickness || 
            altitude > this.height + this.thickness) {
            return auroraColor;
        }
        
        // Calcular contribución de cada onda
        this.waves.forEach(wave => {
            const waveValue = Math.sin(
                position[0] * wave.frequency + 
                position[2] * wave.frequency * 0.7 + 
                wave.phase
            ) * wave.amplitude;
            
            // Factor de altura (más intenso en el centro de la capa)
            const heightFactor = 1.0 - Math.abs(altitude - this.height) / this.thickness;
            
            // Contribución de color
            const contribution = vec3.create();
            vec3.scale(contribution, wave.color, 
                      wave.currentIntensity * heightFactor * Math.max(0, waveValue / wave.amplitude));
            
            vec3.add(auroraColor, auroraColor, contribution);
        });
        
        return auroraColor;
    }

    setActivity(activity) {
        this.intensity = activity;
        this.enabled = activity > 0.1;
    }
}

class SkyGradient {
    constructor() {
        this.zenithColor = vec3.fromValues(0.2, 0.5, 1.0);
        this.horizonColor = vec3.fromValues(1.0, 0.8, 0.6);
        this.groundColor = vec3.fromValues(0.4, 0.3, 0.2);
        
        // Configuración temporal
        this.timeOfDay = 0.5; // 0 = medianoche, 0.5 = mediodía, 1 = medianoche
        this.season = 0.25; // 0 = invierno, 0.25 = primavera, 0.5 = verano, 0.75 = otoño
        
        // Colores para diferentes momentos del día
        this.dayColors = {
            night: {
                zenith: vec3.fromValues(0.05, 0.1, 0.2),
                horizon: vec3.fromValues(0.1, 0.1, 0.3),
                ground: vec3.fromValues(0.05, 0.05, 0.1)
            },
            dawn: {
                zenith: vec3.fromValues(0.4, 0.6, 1.0),
                horizon: vec3.fromValues(1.0, 0.6, 0.3),
                ground: vec3.fromValues(0.3, 0.2, 0.1)
            },
            day: {
                zenith: vec3.fromValues(0.3, 0.7, 1.0),
                horizon: vec3.fromValues(1.0, 0.95, 0.8),
                ground: vec3.fromValues(0.6, 0.5, 0.4)
            },
            dusk: {
                zenith: vec3.fromValues(0.2, 0.3, 0.8),
                horizon: vec3.fromValues(1.0, 0.4, 0.2),
                ground: vec3.fromValues(0.2, 0.1, 0.05)
            }
        };
    }

    calculateSkyColor(rayDirection) {
        const elevation = rayDirection[1]; // -1 (abajo) a 1 (arriba)
        
        // Obtener colores para el momento actual del día
        const currentColors = this.interpolateTimeColors();
        
        // Interpolar entre horizonte y cenit basado en elevación
        let skyColor = vec3.create();
        
        if (elevation >= 0) {
            // Por encima del horizonte
            vec3.lerp(skyColor, currentColors.horizon, currentColors.zenith, elevation);
        } else {
            // Por debajo del horizonte (suelo)
            vec3.lerp(skyColor, currentColors.ground, currentColors.horizon, 1.0 + elevation);
        }
        
        // Aplicar efectos estacionales
        this.applySeasonalEffects(skyColor);
        
        return skyColor;
    }

    interpolateTimeColors() {
        const colors = {};
        
        // Determinar qué periodo del día estamos interpolando
        let t, color1, color2;
        
        if (this.timeOfDay < 0.2) { // Noche a amanecer
            t = this.timeOfDay / 0.2;
            color1 = this.dayColors.night;
            color2 = this.dayColors.dawn;
        } else if (this.timeOfDay < 0.4) { // Amanecer a día
            t = (this.timeOfDay - 0.2) / 0.2;
            color1 = this.dayColors.dawn;
            color2 = this.dayColors.day;
        } else if (this.timeOfDay < 0.6) { // Día completo
            return this.dayColors.day;
        } else if (this.timeOfDay < 0.8) { // Día a atardecer
            t = (this.timeOfDay - 0.6) / 0.2;
            color1 = this.dayColors.day;
            color2 = this.dayColors.dusk;
        } else { // Atardecer a noche
            t = (this.timeOfDay - 0.8) / 0.2;
            color1 = this.dayColors.dusk;
            color2 = this.dayColors.night;
        }
        
        // Interpolar colores
        colors.zenith = vec3.create();
        colors.horizon = vec3.create();
        colors.ground = vec3.create();
        
        vec3.lerp(colors.zenith, color1.zenith, color2.zenith, t);
        vec3.lerp(colors.horizon, color1.horizon, color2.horizon, t);
        vec3.lerp(colors.ground, color1.ground, color2.ground, t);
        
        return colors;
    }

    applySeasonalEffects(skyColor) {
        // Efectos estacionales sutiles
        const seasonalTint = vec3.create();
        
        if (this.season < 0.25) { // Invierno a primavera
            const t = this.season / 0.25;
            vec3.lerp(seasonalTint, vec3.fromValues(0.9, 0.95, 1.1), vec3.fromValues(1.0, 1.0, 1.0), t);
        } else if (this.season < 0.5) { // Primavera a verano
            const t = (this.season - 0.25) / 0.25;
            vec3.lerp(seasonalTint, vec3.fromValues(1.0, 1.0, 1.0), vec3.fromValues(1.1, 1.0, 0.9), t);
        } else if (this.season < 0.75) { // Verano a otoño
            const t = (this.season - 0.5) / 0.25;
            vec3.lerp(seasonalTint, vec3.fromValues(1.1, 1.0, 0.9), vec3.fromValues(1.0, 0.95, 0.9), t);
        } else { // Otoño a invierno
            const t = (this.season - 0.75) / 0.25;
            vec3.lerp(seasonalTint, vec3.fromValues(1.0, 0.95, 0.9), vec3.fromValues(0.9, 0.95, 1.1), t);
        }
        
        vec3.multiply(skyColor, skyColor, seasonalTint);
    }

    setTimeOfDay(time) {
        this.timeOfDay = Math.max(0, Math.min(1, time));
    }

    setSeason(season) {
        this.season = Math.max(0, Math.min(1, season));
    }
}

class AtmosphericManager {
    constructor(renderer) {
        this.renderer = renderer;
        
        // Componentes del sistema atmosférico
        this.scattering = new AtmosphericScattering();
        this.volumetricLighting = new VolumetricLighting(renderer);
        this.aurora = new Aurora();
        this.skyGradient = new SkyGradient();
        
        // Estado global
        this.enabled = true;
        this.quality = 'medium'; // low, medium, high, ultra
        
        // Parámetros temporales
        this.timeOfDay = 0.5;
        this.season = 0.25;
        this.weatherConditions = 'clear';
        
        // Efectos especiales
        this.sunRays = true;
        this.godRays = true;
        this.heatShimmer = false;
        
        this.init();
    }

    init() {
        this.adjustQualitySettings();
        this.updateTimeBasedEffects();
        
        console.log('Atmospheric Manager inicializado');
    }

    adjustQualitySettings() {
        switch (this.quality) {
            case 'low':
                this.scattering.sampleCount = 8;
                this.volumetricLighting.stepCount = 16;
                this.aurora.enabled = false;
                break;
            case 'medium':
                this.scattering.sampleCount = 16;
                this.volumetricLighting.stepCount = 32;
                break;
            case 'high':
                this.scattering.sampleCount = 32;
                this.volumetricLighting.stepCount = 64;
                break;
            case 'ultra':
                this.scattering.sampleCount = 64;
                this.volumetricLighting.stepCount = 128;
                break;
        }
    }

    updateTimeBasedEffects() {
        // Actualizar colores del cielo basado en hora del día
        this.skyGradient.setTimeOfDay(this.timeOfDay);
        this.skyGradient.setSeason(this.season);
        
        // Calcular posición del sol
        const sunAngle = (this.timeOfDay - 0.5) * Math.PI;
        const sunDirection = vec3.fromValues(
            0,
            Math.sin(sunAngle),
            Math.cos(sunAngle)
        );
        
        this.scattering.setSunDirection(sunDirection[0], sunDirection[1], sunDirection[2]);
        
        // Ajustar intensidad de aurora basada en hora (más visible de noche)
        const nightFactor = Math.max(0, 1.0 - Math.abs(this.timeOfDay - 0.5) * 4);
        this.aurora.setActivity(nightFactor * 0.7);
    }

    update(deltaTime) {
        if (!this.enabled) return;
        
        // Actualizar componentes
        this.volumetricLighting.update(deltaTime);
        this.aurora.update(deltaTime);
        this.updateTimeBasedEffects();
        
        // Efectos especiales basados en clima
        this.updateWeatherEffects();
    }

    updateWeatherEffects() {
        switch (this.weatherConditions) {
            case 'storm':
                this.volumetricLighting.density *= 1.5;
                this.scattering.mieCoefficient *= 1.3;
                break;
            case 'fog':
                this.volumetricLighting.density *= 2.0;
                this.scattering.mieCoefficient *= 2.0;
                break;
            case 'clear':
            default:
                // Valores normales
                break;
        }
    }

    render(camera) {
        if (!this.enabled) return;
        
        // Renderizar efectos atmosféricos en orden
        this.renderSkyGradient(camera);
        
        if (this.sunRays) {
            this.renderSunRays(camera);
        }
        
        if (this.godRays) {
            this.volumetricLighting.render(
                camera, 
                this.scattering.getSunDirection(),
                this.scattering.sunColor,
                this.scattering.sunIntensity
            );
        }
        
        this.renderAurora(camera);
    }

    renderSkyGradient(camera) {
        // Implementación básica de renderizado de gradiente de cielo
        // En una implementación completa, esto renderizaría un dome o skybox
    }

    renderSunRays(camera) {
        // Renderizar rayos de sol basados en la posición solar
        const sunDirection = this.scattering.getSunDirection();
        
        // Solo renderizar si el sol está visible
        if (sunDirection[1] > 0) {
            // Implementar rayos radiales desde la posición del sol
        }
    }

    renderAurora(camera) {
        if (!this.aurora.enabled) return;
        
        // Renderizar aurora boreal como efecto volumétrico
        // En una implementación completa, esto usaría shaders especializados
    }

    // Métodos de configuración
    setTimeOfDay(time) {
        this.timeOfDay = Math.max(0, Math.min(1, time));
    }

    setSeason(season) {
        this.season = Math.max(0, Math.min(1, season));
    }

    setWeatherConditions(conditions) {
        this.weatherConditions = conditions;
    }

    setQuality(quality) {
        this.quality = quality;
        this.adjustQualitySettings();
    }

    enableEffect(effectName, enabled) {
        switch (effectName) {
            case 'scattering':
                this.scattering.enabled = enabled;
                break;
            case 'volumetric':
                this.volumetricLighting.enabled = enabled;
                break;
            case 'aurora':
                this.aurora.enabled = enabled;
                break;
            case 'sunRays':
                this.sunRays = enabled;
                break;
            case 'godRays':
                this.godRays = enabled;
                break;
        }
    }

    // Métodos de utilidad
    getSkyColor(rayDirection) {
        let skyColor = this.skyGradient.calculateSkyColor(rayDirection);
        
        // Agregar dispersión atmosférica
        if (this.scattering.enabled) {
            const scatteringColor = this.scattering.calculateScattering(
                vec3.fromValues(0, 0, 0), // Punto de origen (superficie)
                rayDirection,
                100000, // Longitud del rayo hasta el borde de la atmósfera
                this.scattering.getSunDirection()
            );
            
            vec3.add(skyColor, skyColor, scatteringColor);
        }
        
        // Agregar aurora
        if (this.aurora.enabled) {
            const auroraColor = this.aurora.calculateAuroraColor(
                vec3.scale(vec3.create(), rayDirection, 100000),
                Date.now() * 0.001
            );
            
            vec3.add(skyColor, skyColor, auroraColor);
        }
        
        return skyColor;
    }

    getAmbientColor() {
        // Calcular color ambiente basado en condiciones atmosféricas
        const ambientColor = vec3.create();
        
        // Color base del cielo hacia arriba
        const upDirection = vec3.fromValues(0, 1, 0);
        const skyColor = this.getSkyColor(upDirection);
        
        // Reducir intensidad para ambiente
        vec3.scale(ambientColor, skyColor, 0.3);
        
        return ambientColor;
    }

    getStats() {
        return {
            enabled: this.enabled,
            quality: this.quality,
            timeOfDay: this.timeOfDay,
            season: this.season,
            auroraActive: this.aurora.enabled,
            volumetricEnabled: this.volumetricLighting.enabled,
            weatherConditions: this.weatherConditions
        };
    }

    dispose() {
        // Limpiar recursos si es necesario
        this.enabled = false;
        
        console.log('Atmospheric Manager limpiado');
    }
}

export { 
    AtmosphericScattering, 
    VolumetricLighting, 
    Aurora, 
    SkyGradient, 
    AtmosphericManager 
};