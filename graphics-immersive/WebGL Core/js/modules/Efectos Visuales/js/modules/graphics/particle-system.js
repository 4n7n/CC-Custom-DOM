/**
 * Particle System - Sistema avanzado de partículas
 * Maneja diferentes tipos de efectos de partículas para la comunidad
 */

import { vec3, vec4, mat4 } from 'gl-matrix';

class Particle {
    constructor() {
        // Propiedades de posición y movimiento
        this.position = vec3.create();
        this.velocity = vec3.create();
        this.acceleration = vec3.create();
        this.force = vec3.create();
        
        // Propiedades de vida
        this.life = 1.0;
        this.maxLife = 1.0;
        this.age = 0.0;
        
        // Propiedades visuales
        this.size = 1.0;
        this.rotation = 0.0;
        this.color = vec4.fromValues(1, 1, 1, 1);
        this.startColor = vec4.fromValues(1, 1, 1, 1);
        this.endColor = vec4.fromValues(1, 1, 1, 0);
        
        // Propiedades físicas
        this.mass = 1.0;
        this.drag = 0.98;
        this.gravity = vec3.fromValues(0, -9.81, 0);
        
        // Estado
        this.active = false;
        this.index = 0;
    }

    reset() {
        vec3.set(this.position, 0, 0, 0);
        vec3.set(this.velocity, 0, 0, 0);
        vec3.set(this.acceleration, 0, 0, 0);
        vec3.set(this.force, 0, 0, 0);
        
        this.life = 1.0;
        this.age = 0.0;
        this.size = 1.0;
        this.rotation = 0.0;
        
        vec4.set(this.color, 1, 1, 1, 1);
        
        this.active = false;
    }

    update(deltaTime) {
        if (!this.active) return;
        
        this.age += deltaTime;
        this.life = 1.0 - (this.age / this.maxLife);
        
        if (this.life <= 0.0) {
            this.active = false;
            return;
        }
        
        // Aplicar fuerzas
        vec3.scale(this.acceleration, this.force, 1.0 / this.mass);
        vec3.add(this.acceleration, this.acceleration, this.gravity);
        
        // Integración de Verlet para mayor estabilidad
        vec3.scaleAndAdd(this.velocity, this.velocity, this.acceleration, deltaTime);
        vec3.scaleAndAdd(this.position, this.position, this.velocity, deltaTime);
        
        // Aplicar drag
        vec3.scale(this.velocity, this.velocity, this.drag);
        
        // Resetear fuerzas
        vec3.set(this.force, 0, 0, 0);
        
        // Interpolar color
        const t = 1.0 - this.life;
        vec4.lerp(this.color, this.startColor, this.endColor, t);
    }

    applyForce(force) {
        vec3.add(this.force, this.force, force);
    }
}

class ParticleEmitter {
    constructor(maxParticles = 1000) {
        this.maxParticles = maxParticles;
        this.particles = [];
        this.activeParticles = 0;
        this.particlePool = [];
        
        // Configuración de emisión
        this.emissionRate = 10; // partículas por segundo
        this.emissionTimer = 0;
        this.burst = false;
        this.burstCount = 50;
        
        // Propiedades del emisor
        this.position = vec3.create();
        this.direction = vec3.fromValues(0, 1, 0);
        this.spread = Math.PI / 4; // 45 grados
        
        // Rangos de propiedades de partículas
        this.lifeRange = [1.0, 3.0];
        this.speedRange = [1.0, 5.0];
        this.sizeRange = [0.5, 2.0];
        this.colorStart = vec4.fromValues(1, 1, 1, 1);
        this.colorEnd = vec4.fromValues(1, 1, 1, 0);
        
        // Fuerzas globales
        this.gravity = vec3.fromValues(0, -2.0, 0);
        this.wind = vec3.create();
        this.turbulence = 0.5;
        
        // Configuración de renderizado
        this.texture = null;
        this.blendMode = 'additive'; // 'additive', 'alpha', 'multiply'
        this.billboarding = true;
        
        // Estado
        this.active = true;
        this.loop = true;
        this.duration = 5.0;
        this.time = 0.0;
        
        this.init();
    }

    init() {
        // Crear pool de partículas
        for (let i = 0; i < this.maxParticles; i++) {
            const particle = new Particle();
            particle.index = i;
            this.particles.push(particle);
            this.particlePool.push(particle);
        }
        
        console.log(`Particle Emitter inicializado con ${this.maxParticles} partículas`);
    }

    getParticle() {
        if (this.particlePool.length > 0) {
            const particle = this.particlePool.pop();
            particle.reset();
            return particle;
        }
        return null;
    }

    releaseParticle(particle) {
        particle.active = false;
        this.particlePool.push(particle);
        this.activeParticles--;
    }

    emit(count = 1) {
        for (let i = 0; i < count; i++) {
            const particle = this.getParticle();
            if (!particle) break;
            
            this.initializeParticle(particle);
            particle.active = true;
            this.activeParticles++;
        }
    }

    initializeParticle(particle) {
        // Posición inicial
        vec3.copy(particle.position, this.position);
        
        // Agregar variación en la posición inicial
        const offsetX = (Math.random() - 0.5) * 2.0;
        const offsetY = (Math.random() - 0.5) * 2.0;
        const offsetZ = (Math.random() - 0.5) * 2.0;
        vec3.add(particle.position, particle.position, vec3.fromValues(offsetX, offsetY, offsetZ));
        
        // Dirección y velocidad
        const angle = (Math.random() - 0.5) * this.spread;
        const pitch = (Math.random() - 0.5) * this.spread;
        
        const direction = vec3.create();
        direction[0] = Math.sin(angle) * Math.cos(pitch);
        direction[1] = Math.sin(pitch);
        direction[2] = Math.cos(angle) * Math.cos(pitch);
        
        // Rotar dirección base
        const rotatedDirection = vec3.create();
        vec3.add(rotatedDirection, this.direction, direction);
        vec3.normalize(rotatedDirection, rotatedDirection);
        
        const speed = this.lifeRange[0] + Math.random() * (this.speedRange[1] - this.speedRange[0]);
        vec3.scale(particle.velocity, rotatedDirection, speed);
        
        // Propiedades de vida
        particle.maxLife = this.lifeRange[0] + Math.random() * (this.lifeRange[1] - this.lifeRange[0]);
        particle.life = 1.0;
        particle.age = 0.0;
        
        // Tamaño
        particle.size = this.sizeRange[0] + Math.random() * (this.sizeRange[1] - this.sizeRange[0]);
        
        // Color
        vec4.copy(particle.startColor, this.colorStart);
        vec4.copy(particle.endColor, this.colorEnd);
        vec4.copy(particle.color, this.colorStart);
        
        // Propiedades físicas
        particle.mass = 0.5 + Math.random() * 1.0;
        particle.drag = 0.95 + Math.random() * 0.04;
        vec3.copy(particle.gravity, this.gravity);
    }

    update(deltaTime) {
        if (!this.active) return;
        
        this.time += deltaTime;
        
        // Verificar duración
        if (!this.loop && this.time >= this.duration) {
            this.active = false;
        }
        
        // Emisión continua
        if (this.active && this.emissionRate > 0) {
            this.emissionTimer += deltaTime;
            const emissionInterval = 1.0 / this.emissionRate;
            
            while (this.emissionTimer >= emissionInterval) {
                this.emit(1);
                this.emissionTimer -= emissionInterval;
            }
        }
        
        // Emisión en ráfaga
        if (this.burst) {
            this.emit(this.burstCount);
            this.burst = false;
        }
        
        // Actualizar partículas activas
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            if (!particle.active) continue;
            
            // Aplicar fuerzas globales
            if (vec3.length(this.wind) > 0) {
                particle.applyForce(this.wind);
            }
            
            // Turbulencia
            if (this.turbulence > 0) {
                const turbulenceForce = vec3.fromValues(
                    (Math.random() - 0.5) * this.turbulence,
                    (Math.random() - 0.5) * this.turbulence,
                    (Math.random() - 0.5) * this.turbulence
                );
                particle.applyForce(turbulenceForce);
            }
            
            particle.update(deltaTime);
            
            // Liberar partículas muertas
            if (!particle.active) {
                this.releaseParticle(particle);
            }
        }
    }

    setPosition(x, y, z) {
        vec3.set(this.position, x, y, z);
    }

    setDirection(x, y, z) {
        vec3.set(this.direction, x, y, z);
        vec3.normalize(this.direction, this.direction);
    }

    setGravity(x, y, z) {
        vec3.set(this.gravity, x, y, z);
    }

    setWind(x, y, z) {
        vec3.set(this.wind, x, y, z);
    }

    triggerBurst(count) {
        this.burstCount = count || this.burstCount;
        this.burst = true;
    }

    stop() {
        this.active = false;
    }

    start() {
        this.active = true;
        this.time = 0.0;
    }

    clear() {
        for (let i = 0; i < this.particles.length; i++) {
            if (this.particles[i].active) {
                this.releaseParticle(this.particles[i]);
            }
        }
    }

    getActiveParticles() {
        return this.particles.filter(p => p.active);
    }
}

class ParticleSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.emitters = new Map();
        this.presets = new Map();
        
        // Buffers para renderizado eficiente
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.instanceBuffer = null;
        
        // Configuración de renderizado
        this.maxParticlesPerDraw = 10000;
        this.vertexData = new Float32Array(this.maxParticlesPerDraw * 4 * 8); // 4 vértices, 8 atributos por vértice
        this.instanceData = new Float32Array(this.maxParticlesPerDraw * 16); // Matriz de transformación por instancia
        
        // Estadísticas
        this.stats = {
            totalParticles: 0,
            activeEmitters: 0,
            drawCalls: 0
        };
        
        this.init();
    }

    init() {
        this.createBuffers();
        this.createPresets();
        this.createShaders();
        
        console.log('Particle System inicializado');
    }

    createBuffers() {
        const gl = this.renderer.gl;
        
        // Buffer de vértices para quad
        const quadVertices = new Float32Array([
            -0.5, -0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0,
             0.5, -0.5, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0,
             0.5,  0.5, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
            -0.5,  0.5, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0
        ]);
        
        this.vertexBuffer = this.renderer.createBuffer('particle_vertices', quadVertices);
        
        // Buffer de índices
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        this.indexBuffer = this.renderer.createBuffer('particle_indices', indices, gl.ELEMENT_ARRAY_BUFFER);
        
        // Buffer de instancias (se actualiza cada frame)
        this.instanceBuffer = this.renderer.createBuffer('particle_instances', 
                                                        this.instanceData, 
                                                        gl.ARRAY_BUFFER, 
                                                        gl.DYNAMIC_DRAW);
    }

    createShaders() {
        // Vertex shader para partículas
        const vertexShader = `
            attribute vec3 a_position;
            attribute vec2 a_texCoord;
            attribute vec3 a_normal;
            
            // Atributos de instancia
            attribute mat4 a_instanceMatrix;
            attribute vec4 a_instanceColor;
            attribute float a_instanceSize;
            
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform vec3 u_cameraPosition;
            uniform bool u_billboarding;
            
            varying vec2 v_texCoord;
            varying vec4 v_color;
            varying float v_life;
            
            void main() {
                vec3 position = a_position * a_instanceSize;
                
                if (u_billboarding) {
                    // Billboard hacia la cámara
                    vec3 instancePos = vec3(a_instanceMatrix[3]);
                    vec3 toCam = normalize(u_cameraPosition - instancePos);
                    vec3 up = vec3(0.0, 1.0, 0.0);
                    vec3 right = cross(up, toCam);
                    up = cross(toCam, right);
                    
                    mat3 billboardMatrix = mat3(right, up, toCam);
                    position = billboardMatrix * position;
                }
                
                vec4 worldPos = a_instanceMatrix * vec4(position, 1.0);
                gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
                
                v_texCoord = a_texCoord;
                v_color = a_instanceColor;
                v_life = a_instanceColor.a;
            }
        `;
        
        // Fragment shader para partículas
        const fragmentShader = `
            precision mediump float;
            
            uniform sampler2D u_texture;
            uniform int u_blendMode;
            uniform float u_opacity;
            
            varying vec2 v_texCoord;
            varying vec4 v_color;
            varying float v_life;
            
            void main() {
                vec4 texColor = texture2D(u_texture, v_texCoord);
                vec4 finalColor = texColor * v_color;
                
                // Aplicar diferentes modos de blending
                if (u_blendMode == 1) { // Additive
                    finalColor.rgb *= finalColor.a;
                } else if (u_blendMode == 2) { // Multiply
                    finalColor.rgb = mix(vec3(1.0), finalColor.rgb, finalColor.a);
                }
                
                finalColor.a *= u_opacity * v_life;
                
                gl_FragColor = finalColor;
            }
        `;
        
        this.renderer.createProgram('particles', vertexShader, fragmentShader);
    }

    createPresets() {
        // Preset: Humo
        this.presets.set('smoke', {
            emissionRate: 20,
            lifeRange: [3.0, 6.0],
            speedRange: [0.5, 2.0],
            sizeRange: [1.0, 4.0],
            colorStart: vec4.fromValues(0.8, 0.8, 0.8, 0.8),
            colorEnd: vec4.fromValues(0.6, 0.6, 0.6, 0.0),
            gravity: vec3.fromValues(0, 1.0, 0),
            turbulence: 1.0,
            blendMode: 'alpha'
        });
        
        // Preset: Fuego
        this.presets.set('fire', {
            emissionRate: 50,
            lifeRange: [1.0, 2.5],
            speedRange: [2.0, 5.0],
            sizeRange: [0.5, 2.0],
            colorStart: vec4.fromValues(1.0, 0.5, 0.1, 1.0),
            colorEnd: vec4.fromValues(1.0, 0.1, 0.0, 0.0),
            gravity: vec3.fromValues(0, 3.0, 0),
            turbulence: 2.0,
            blendMode: 'additive'
        });
        
        // Preset: Chispas
        this.presets.set('sparks', {
            emissionRate: 100,
            lifeRange: [0.5, 1.5],
            speedRange: [5.0, 15.0],
            sizeRange: [0.1, 0.5],
            colorStart: vec4.fromValues(1.0, 0.8, 0.2, 1.0),
            colorEnd: vec4.fromValues(0.8, 0.2, 0.0, 0.0),
            gravity: vec3.fromValues(0, -5.0, 0),
            turbulence: 0.5,
            blendMode: 'additive'
        });
        
        // Preset: Lluvia
        this.presets.set('rain', {
            emissionRate: 200,
            lifeRange: [2.0, 4.0],
            speedRange: [10.0, 20.0],
            sizeRange: [0.1, 0.2],
            colorStart: vec4.fromValues(0.7, 0.8, 1.0, 0.6),
            colorEnd: vec4.fromValues(0.7, 0.8, 1.0, 0.0),
            gravity: vec3.fromValues(0, -20.0, 0),
            turbulence: 0.2,
            blendMode: 'alpha'
        });
        
        // Preset: Nieve
        this.presets.set('snow', {
            emissionRate: 50,
            lifeRange: [5.0, 10.0],
            speedRange: [0.5, 2.0],
            sizeRange: [0.2, 0.8],
            colorStart: vec4.fromValues(1.0, 1.0, 1.0, 0.8),
            colorEnd: vec4.fromValues(1.0, 1.0, 1.0, 0.0),
            gravity: vec3.fromValues(0, -1.0, 0),
            turbulence: 1.5,
            blendMode: 'alpha'
        });
        
        // Preset: Magia/Energía
        this.presets.set('magic', {
            emissionRate: 30,
            lifeRange: [2.0, 4.0],
            speedRange: [1.0, 3.0],
            sizeRange: [0.5, 1.5],
            colorStart: vec4.fromValues(0.5, 0.2, 1.0, 1.0),
            colorEnd: vec4.fromValues(0.8, 0.6, 1.0, 0.0),
            gravity: vec3.fromValues(0, 0.5, 0),
            turbulence: 3.0,
            blendMode: 'additive'
        });
    }

    createEmitter(name, preset, maxParticles) {
        const emitter = new ParticleEmitter(maxParticles);
        
        if (preset && this.presets.has(preset)) {
            this.applyPreset(emitter, preset);
        }
        
        this.emitters.set(name, emitter);
        return emitter;
    }

    applyPreset(emitter, presetName) {
        const preset = this.presets.get(presetName);
        if (!preset) return;
        
        Object.assign(emitter, preset);
    }

    getEmitter(name) {
        return this.emitters.get(name);
    }

    removeEmitter(name) {
        const emitter = this.emitters.get(name);
        if (emitter) {
            emitter.clear();
            this.emitters.delete(name);
        }
    }

    update(deltaTime) {
        this.stats.totalParticles = 0;
        this.stats.activeEmitters = 0;
        
        this.emitters.forEach(emitter => {
            emitter.update(deltaTime);
            this.stats.totalParticles += emitter.activeParticles;
            if (emitter.active) {
                this.stats.activeEmitters++;
            }
        });
    }

    render(camera) {
        this.stats.drawCalls = 0;
        
        const gl = this.renderer.gl;
        const program = this.renderer.useProgram('particles');
        
        // Configurar uniforms globales
        this.renderer.setUniform(program, 'u_viewMatrix', camera.viewMatrix);
        this.renderer.setUniform(program, 'u_projectionMatrix', camera.projectionMatrix);
        this.renderer.setUniform(program, 'u_cameraPosition', camera.position);
        
        // Configurar blending para partículas
        gl.enable(gl.BLEND);
        gl.depthMask(false); // No escribir en depth buffer
        
        this.emitters.forEach(emitter => {
            if (emitter.activeParticles === 0) return;
            
            this.renderEmitter(emitter, program);
            this.stats.drawCalls++;
        });
        
        // Restaurar estado
        gl.disable(gl.BLEND);
        gl.depthMask(true);
    }

    renderEmitter(emitter, program) {
        const gl = this.renderer.gl;
        const activeParticles = emitter.getActiveParticles();
        
        if (activeParticles.length === 0) return;
        
        // Configurar blending según el modo del emisor
        switch (emitter.blendMode) {
            case 'additive':
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                this.renderer.setUniform(program, 'u_blendMode', 1);
                break;
            case 'multiply':
                gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
                this.renderer.setUniform(program, 'u_blendMode', 2);
                break;
            default: // alpha
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                this.renderer.setUniform(program, 'u_blendMode', 0);
                break;
        }
        
        // Configurar uniforms específicos del emisor
        this.renderer.setUniform(program, 'u_billboarding', emitter.billboarding);
        this.renderer.setUniform(program, 'u_opacity', 1.0);
        
        // Bind texture si existe
        if (emitter.texture) {
            this.renderer.bindTexture(emitter.texture, 0);
        } else {
            this.renderer.bindTexture('white', 0); // Textura blanca por defecto
        }
        
        // Preparar datos de instancias
        this.prepareInstanceData(activeParticles);
        
        // Actualizar buffer de instancias
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceData.subarray(0, activeParticles.length * 16));
        
        // Configurar atributos y renderizar
        this.setupVertexAttributes(program);
        
        // Renderizado instanciado
        const ext = gl.getExtension('ANGLE_instanced_arrays');
        if (ext) {
            ext.drawElementsInstancedANGLE(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, activeParticles.length);
        } else {
            // Fallback: renderizar individualmente
            for (let i = 0; i < activeParticles.length; i++) {
                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            }
        }
    }

    prepareInstanceData(particles) {
        let offset = 0;
        
        particles.forEach(particle => {
            // Matriz de transformación (posición y escala)
            const matrix = mat4.create();
            mat4.translate(matrix, matrix, particle.position);
            mat4.scale(matrix, matrix, vec3.fromValues(particle.size, particle.size, particle.size));
            
            // Copiar matriz al buffer
            for (let i = 0; i < 16; i++) {
                this.instanceData[offset + i] = matrix[i];
            }
            
            offset += 16;
        });
    }

    setupVertexAttributes(program) {
        const gl = this.renderer.gl;
        
        // Configurar atributos de vértice
        const positionLocation = program.attributes.a_position;
        const texCoordLocation = program.attributes.a_texCoord;
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer.buffer);
        
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 32, 0);
        
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 32, 12);
        
        // Configurar atributos de instancia
        const matrixLocation = program.attributes.a_instanceMatrix;
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer.buffer);
        
        for (let i = 0; i < 4; i++) {
            gl.enableVertexAttribArray(matrixLocation + i);
            gl.vertexAttribPointer(matrixLocation + i, 4, gl.FLOAT, false, 64, i * 16);
            
            const ext = gl.getExtension('ANGLE_instanced_arrays');
            if (ext) {
                ext.vertexAttribDivisorANGLE(matrixLocation + i, 1);
            }
        }
        
        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer.buffer);
    }

    // Métodos de conveniencia para efectos comunes
    createFireEffect(position, intensity = 1.0) {
        const name = `fire_${Date.now()}`;
        const emitter = this.createEmitter(name, 'fire', 200);
        
        emitter.setPosition(position[0], position[1], position[2]);
        emitter.emissionRate *= intensity;
        emitter.speedRange[1] *= intensity;
        
        return emitter;
    }

    createSmokeEffect(position, windDirection = [0, 0, 0]) {
        const name = `smoke_${Date.now()}`;
        const emitter = this.createEmitter(name, 'smoke', 100);
        
        emitter.setPosition(position[0], position[1], position[2]);
        emitter.setWind(windDirection[0], windDirection[1], windDirection[2]);
        
        return emitter;
    }

    createRainEffect(area, intensity = 1.0) {
        const name = `rain_${Date.now()}`;
        const emitter = this.createEmitter(name, 'rain', 1000);
        
        // Configurar área de lluvia
        emitter.setPosition(area.center[0], area.top, area.center[2]);
        emitter.spread = Math.PI; // Lluvia cae desde arriba
        emitter.emissionRate = 200 * intensity;
        
        // Agregar variación en X y Z para cubrir el área
        emitter.initializeParticle = function(particle) {
            ParticleEmitter.prototype.initializeParticle.call(this, particle);
            
            // Distribuir partículas en el área
            particle.position[0] += (Math.random() - 0.5) * area.width;
            particle.position[2] += (Math.random() - 0.5) * area.depth;
        };
        
        return emitter;
    }

    createSnowEffect(area, intensity = 1.0) {
        const name = `snow_${Date.now()}`;
        const emitter = this.createEmitter(name, 'snow', 500);
        
        emitter.setPosition(area.center[0], area.top, area.center[2]);
        emitter.emissionRate = 50 * intensity;
        
        // Variación en área como la lluvia
        emitter.initializeParticle = function(particle) {
            ParticleEmitter.prototype.initializeParticle.call(this, particle);
            
            particle.position[0] += (Math.random() - 0.5) * area.width;
            particle.position[2] += (Math.random() - 0.5) * area.depth;
        };
        
        return emitter;
    }

    createExplosionEffect(position, force = 1.0) {
        const name = `explosion_${Date.now()}`;
        const emitter = this.createEmitter(name, 'sparks', 300);
        
        emitter.setPosition(position[0], position[1], position[2]);
        emitter.emissionRate = 0; // Solo burst
        emitter.burstCount = 100 * force;
        emitter.speedRange = [5.0 * force, 20.0 * force];
        emitter.spread = Math.PI; // 180 grados
        
        // Activar burst inmediatamente
        emitter.triggerBurst();
        
        // Auto-destruir después de que todas las partículas mueran
        setTimeout(() => {
            this.removeEmitter(name);
        }, 3000);
        
        return emitter;
    }

    createMagicEffect(position, color = [0.5, 0.2, 1.0, 1.0]) {
        const name = `magic_${Date.now()}`;
        const emitter = this.createEmitter(name, 'magic', 150);
        
        emitter.setPosition(position[0], position[1], position[2]);
        vec4.set(emitter.colorStart, color[0], color[1], color[2], color[3]);
        
        // Movimiento orbital
        emitter.orbitRadius = 2.0;
        emitter.orbitSpeed = 2.0;
        
        const originalUpdate = emitter.update.bind(emitter);
        emitter.update = function(deltaTime) {
            // Movimiento orbital del emisor
            this.time = this.time || 0;
            this.time += deltaTime;
            
            const orbitX = Math.cos(this.time * this.orbitSpeed) * this.orbitRadius;
            const orbitZ = Math.sin(this.time * this.orbitSpeed) * this.orbitRadius;
            
            this.position[0] = position[0] + orbitX;
            this.position[2] = position[2] + orbitZ;
            
            originalUpdate(deltaTime);
        };
        
        return emitter;
    }

    // Gestión de efectos ambientales
    startWeatherEffect(type, area, intensity = 1.0) {
        this.stopWeatherEffect(); // Detener efectos previos
        
        switch (type) {
            case 'rain':
                this.currentWeather = this.createRainEffect(area, intensity);
                break;
            case 'snow':
                this.currentWeather = this.createSnowEffect(area, intensity);
                break;
            case 'storm':
                this.currentWeather = this.createRainEffect(area, intensity * 2);
                // Agregar rayos ocasionales
                this.stormTimer = setInterval(() => {
                    if (Math.random() < 0.1) { // 10% chance cada segundo
                        const lightningPos = [
                            area.center[0] + (Math.random() - 0.5) * area.width,
                            area.top,
                            area.center[2] + (Math.random() - 0.5) * area.depth
                        ];
                        this.createExplosionEffect(lightningPos, 0.5);
                    }
                }, 1000);
                break;
        }
    }

    stopWeatherEffect() {
        if (this.currentWeather) {
            this.currentWeather.stop();
            this.currentWeather = null;
        }
        
        if (this.stormTimer) {
            clearInterval(this.stormTimer);
            this.stormTimer = null;
        }
    }

    // Efectos de construcción y actividad comunitaria
    createConstructionDust(position, activity = 1.0) {
        const name = `construction_${Date.now()}`;
        const emitter = this.createEmitter(name, 'smoke', 50);
        
        emitter.setPosition(position[0], position[1], position[2]);
        emitter.emissionRate = 10 * activity;
        emitter.colorStart = vec4.fromValues(0.7, 0.6, 0.5, 0.6);
        emitter.colorEnd = vec4.fromValues(0.5, 0.4, 0.3, 0.0);
        emitter.lifeRange = [2.0, 4.0];
        
        return emitter;
    }

    createCookingSmoke(position, intensity = 1.0) {
        const name = `cooking_${Date.now()}`;
        const emitter = this.createEmitter(name, 'smoke', 30);
        
        emitter.setPosition(position[0], position[1], position[2]);
        emitter.emissionRate = 5 * intensity;
        emitter.setDirection(0, 1, 0); // Humo hacia arriba
        emitter.spread = Math.PI / 8; // Columna estrecha
        
        return emitter;
    }

    createCelebrationFireworks(position) {
        const colors = [
            [1.0, 0.2, 0.2, 1.0], // Rojo
            [0.2, 1.0, 0.2, 1.0], // Verde
            [0.2, 0.2, 1.0, 1.0], // Azul
            [1.0, 1.0, 0.2, 1.0], // Amarillo
            [1.0, 0.2, 1.0, 1.0]  // Magenta
        ];
        
        colors.forEach((color, index) => {
            setTimeout(() => {
                const name = `firework_${Date.now()}_${index}`;
                const emitter = this.createEmitter(name, 'sparks', 200);
                
                emitter.setPosition(position[0], position[1], position[2]);
                emitter.colorStart = vec4.fromValues(color[0], color[1], color[2], color[3]);
                emitter.emissionRate = 0;
                emitter.burstCount = 50;
                emitter.speedRange = [3.0, 8.0];
                emitter.spread = Math.PI; // Explosión esférica
                
                emitter.triggerBurst();
                
                // Auto-limpiar
                setTimeout(() => {
                    this.removeEmitter(name);
                }, 4000);
            }, index * 500); // Escalonar las explosiones
        });
    }

    // Optimización y gestión de rendimiento
    optimizeForPerformance() {
        // Reducir partículas si el rendimiento es bajo
        const totalParticles = this.stats.totalParticles;
        
        if (totalParticles > 5000) {
            this.emitters.forEach(emitter => {
                emitter.emissionRate *= 0.8;
                emitter.maxParticles = Math.floor(emitter.maxParticles * 0.8);
            });
            
            console.log('Particle system optimized for performance');
        }
    }

    getStats() {
        return {
            ...this.stats,
            emitters: this.emitters.size,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    estimateMemoryUsage() {
        let totalMemory = 0;
        
        this.emitters.forEach(emitter => {
            totalMemory += emitter.maxParticles * 200; // Estimación en bytes por partícula
        });
        
        return totalMemory;
    }

    dispose() {
        // Limpiar todos los emisores
        this.emitters.forEach(emitter => {
            emitter.clear();
        });
        this.emitters.clear();
        
        // Limpiar buffers
        const gl = this.renderer.gl;
        if (this.vertexBuffer) {
            gl.deleteBuffer(this.vertexBuffer.buffer);
        }
        if (this.indexBuffer) {
            gl.deleteBuffer(this.indexBuffer.buffer);
        }
        if (this.instanceBuffer) {
            gl.deleteBuffer(this.instanceBuffer.buffer);
        }
        
        // Limpiar efectos temporales
        this.stopWeatherEffect();
        
        console.log('Particle System limpiado');
    }
}

export { Particle, ParticleEmitter, ParticleSystem };