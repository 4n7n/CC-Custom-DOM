/**
 * Cultural Symbols - Sistema de símbolos y elementos culturales
 * Maneja representaciones visuales de identidad cultural, tradiciones y valores comunitarios
 */

import { vec3, vec4, mat4, quat } from 'gl-matrix';

class CulturalSymbol {
    constructor(type, meaning, visualData) {
        this.type = type; // 'totem', 'flag', 'artwork', 'monument', 'pattern', 'ritual_object'
        this.meaning = meaning;
        this.visualData = visualData;
        
        this.position = vec3.create();
        this.rotation = quat.create();
        this.scale = vec3.fromValues(1, 1, 1);
        
        // Propiedades visuales
        this.colors = [];
        this.patterns = [];
        this.significance = 'medium'; // low, medium, high, sacred
        
        // Estado dinámico
        this.activationLevel = 0.0;
        this.resonance = 0.0;
        this.spiritualEnergy = 0.0;
        this.glowing = false;
        this.animated = false;
        
        this.generateVisualRepresentation();
    }

    generateVisualRepresentation() {
        switch (this.type) {
            case 'totem':
                this.scale = vec3.fromValues(1, 3, 1);
                this.colors = [
                    vec3.fromValues(0.8, 0.2, 0.1),
                    vec3.fromValues(0.9, 0.7, 0.2),
                    vec3.fromValues(0.2, 0.4, 0.1)
                ];
                this.animated = true;
                this.glowing = true;
                break;
                
            case 'flag':
                this.scale = vec3.fromValues(2, 1.5, 0.1);
                this.colors = [
                    vec3.fromValues(0.1, 0.3, 0.7),
                    vec3.fromValues(0.9, 0.9, 0.1),
                    vec3.fromValues(0.2, 0.7, 0.2)
                ];
                this.animated = true;
                break;
                
            case 'monument':
                this.scale = vec3.fromValues(2, 4, 2);
                this.colors = [
                    vec3.fromValues(0.6, 0.6, 0.7),
                    vec3.fromValues(0.8, 0.7, 0.5)
                ];
                this.significance = 'high';
                break;
                
            case 'ritual_object':
                this.colors = [
                    vec3.fromValues(0.9, 0.8, 0.3),
                    vec3.fromValues(0.7, 0.1, 0.1),
                    vec3.fromValues(0.9, 0.9, 0.9)
                ];
                this.glowing = true;
                this.animated = true;
                this.significance = 'sacred';
                break;
        }
    }

    activate(level = 1.0) {
        this.activationLevel = Math.max(0, Math.min(1, level));
        
        if (this.activationLevel > 0.5) {
            this.startActivationEffects();
        }
    }

    startActivationEffects() {
        this.glowIntensity = this.activationLevel;
        
        if (this.significance === 'sacred') {
            this.createEnergyParticles();
        }
    }

    createEnergyParticles() {
        this.particles = {
            type: 'spiritual_energy',
            count: Math.floor(this.activationLevel * 50),
            color: this.colors[0] || vec3.fromValues(1, 1, 1),
            behavior: 'spiral_upward',
            lifetime: 2.0
        };
    }

    calculateResonance(otherSymbols) {
        let resonanceSum = 0;
        let count = 0;
        
        otherSymbols.forEach(other => {
            if (other === this) return;
            
            const distance = vec3.distance(this.position, other.position);
            if (distance > 50) return;
            
            const compatibility = this.calculateCulturalCompatibility(other);
            const distanceEffect = Math.max(0, 1 - distance / 50);
            
            resonanceSum += compatibility * distanceEffect * other.activationLevel;
            count++;
        });
        
        this.resonance = count > 0 ? resonanceSum / count : 0;
        return this.resonance;
    }

    calculateCulturalCompatibility(other) {
        let compatibility = 0;
        
        // Tipos complementarios
        const complementaryTypes = {
            'totem': ['ritual_object', 'monument'],
            'flag': ['artwork', 'monument'],
            'monument': ['totem', 'flag'],
            'ritual_object': ['totem', 'pattern']
        };
        
        if (complementaryTypes[this.type]?.includes(other.type)) {
            compatibility += 0.6;
        }
        
        // Armonía de colores
        if (this.colors.length && other.colors.length) {
            const colorDiff = vec3.create();
            vec3.sub(colorDiff, this.colors[0], other.colors[0]);
            const colorDistance = vec3.length(colorDiff);
            compatibility += Math.max(0, 1 - colorDistance) * 0.4;
        }
        
        return Math.min(1, compatibility);
    }

    update(deltaTime) {
        const time = Date.now() * 0.001;
        
        // Animaciones según tipo
        if (this.animated) {
            switch (this.type) {
                case 'totem':
                    quat.fromEuler(this.rotation, 0, time * 10, 0);
                    this.pulseScale = 1 + Math.sin(time * 2) * 0.05 * this.activationLevel;
                    break;
                case 'flag':
                    this.waveOffset = time * 3;
                    break;
                case 'ritual_object':
                    this.hoverHeight = Math.sin(time * 1.5) * 0.2 * this.activationLevel;
                    quat.fromEuler(this.rotation, time * 15, time * 20, time * 10);
                    break;
            }
        }
        
        // Actualizar energía espiritual
        if (this.activationLevel > 0) {
            this.spiritualEnergy = Math.min(1, this.spiritualEnergy + this.activationLevel * deltaTime * 0.1);
        }
        
        // Decay de activación
        this.activationLevel *= Math.pow(0.99, deltaTime * 60);
    }

    getRenderData() {
        return {
            type: this.type,
            position: this.position,
            rotation: this.rotation,
            scale: this.scale,
            colors: this.colors,
            activationLevel: this.activationLevel,
            resonance: this.resonance,
            spiritualEnergy: this.spiritualEnergy,
            glowing: this.glowing,
            particles: this.particles,
            pulseScale: this.pulseScale || 1,
            waveOffset: this.waveOffset || 0,
            hoverHeight: this.hoverHeight || 0
        };
    }
}

class CulturalNetwork {
    constructor() {
        this.symbols = new Map();
        this.connections = new Map();
        this.ceremonies = new Map();
        
        this.resonanceThreshold = 0.3;
        this.maxConnectionDistance = 50;
        this.networkStrength = 0;
        
        this.setupCulturalFramework();
    }

    setupCulturalFramework() {
        this.traditions = {
            'creation_ceremony': {
                name: 'Creation Ceremony',
                requiredSymbols: ['totem', 'ritual_object'],
                duration: 300,
                effects: ['spiritual_awakening', 'community_blessing']
            },
            'harvest_celebration': {
                name: 'Harvest Celebration',
                requiredSymbols: ['artwork', 'pattern'],
                duration: 600,
                effects: ['prosperity_boost', 'gratitude_wave']
            }
        };
    }

    addSymbol(symbol) {
        const id = `symbol_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        symbol.id = id;
        this.symbols.set(id, symbol);
        this.updateNetworkConnections();
        return id;
    }

    removeSymbol(symbolId) {
        this.symbols.delete(symbolId);
        this.removeSymbolConnections(symbolId);
    }

    removeSymbolConnections(symbolId) {
        this.connections.forEach((connection, connectionId) => {
            if (connection.symbolA === symbolId || connection.symbolB === symbolId) {
                this.connections.delete(connectionId);
            }
        });
    }

    updateNetworkConnections() {
        this.connections.clear();
        const symbolArray = Array.from(this.symbols.values());
        
        for (let i = 0; i < symbolArray.length; i++) {
            const symbolA = symbolArray[i];
            symbolA.calculateResonance(symbolArray);
            
            for (let j = i + 1; j < symbolArray.length; j++) {
                const symbolB = symbolArray[j];
                const distance = vec3.distance(symbolA.position, symbolB.position);
                
                if (distance <= this.maxConnectionDistance) {
                    const resonance = symbolA.calculateCulturalCompatibility(symbolB);
                    
                    if (resonance >= this.resonanceThreshold) {
                        this.createConnection(symbolA, symbolB, resonance, distance);
                    }
                }
            }
        }
        
        this.calculateNetworkStrength();
    }

    createConnection(symbolA, symbolB, resonance, distance) {
        const connectionId = `${symbolA.id}_${symbolB.id}`;
        
        this.connections.set(connectionId, {
            symbolA: symbolA.id,
            symbolB: symbolB.id,
            resonance: resonance,
            distance: distance,
            strength: resonance * (1 - distance / this.maxConnectionDistance),
            energyFlow: 0
        });
    }

    calculateNetworkStrength() {
        let totalStrength = 0;
        this.connections.forEach(connection => {
            totalStrength += connection.strength;
        });
        this.networkStrength = this.connections.size > 0 ? totalStrength / this.connections.size : 0;
    }

    activateSymbol(symbolId, intensity = 1.0) {
        const symbol = this.symbols.get(symbolId);
        if (!symbol) return;
        
        symbol.activate(intensity);
        this.propagateActivation(symbolId, intensity * 0.7);
    }

    propagateActivation(sourceSymbolId, intensity) {
        this.connections.forEach(connection => {
            if (connection.symbolA === sourceSymbolId || connection.symbolB === sourceSymbolId) {
                const targetSymbolId = connection.symbolA === sourceSymbolId ? 
                                     connection.symbolB : connection.symbolA;
                
                const targetSymbol = this.symbols.get(targetSymbolId);
                if (targetSymbol) {
                    const propagatedIntensity = intensity * connection.strength;
                    if (propagatedIntensity > 0.1) {
                        targetSymbol.activate(propagatedIntensity);
                        connection.energyFlow = propagatedIntensity;
                    }
                }
            }
        });
    }

    startCeremony(ceremonyType, centerPosition) {
        const tradition = this.traditions[ceremonyType];
        if (!tradition) return false;
        
        const nearbySymbols = this.getSymbolsInRadius(centerPosition, 25);
        const hasRequiredSymbols = tradition.requiredSymbols.every(symbolType => 
            nearbySymbols.some(symbol => symbol.type === symbolType)
        );
        
        if (!hasRequiredSymbols) return false;
        
        const ceremony = {
            type: ceremonyType,
            tradition: tradition,
            centerPosition: vec3.clone(centerPosition),
            participants: nearbySymbols,
            startTime: Date.now(),
            duration: tradition.duration * 1000,
            phase: 'preparation',
            intensity: 0
        };
        
        this.ceremonies.set(`ceremony_${Date.now()}`, ceremony);
        
        nearbySymbols.forEach(symbol => {
            symbol.activate(0.8);
        });
        
        return true;
    }

    getSymbolsInRadius(center, radius) {
        return Array.from(this.symbols.values()).filter(symbol => {
            const distance = vec3.distance(symbol.position, center);
            return distance <= radius;
        });
    }

    update(deltaTime) {
        // Actualizar símbolos
        this.symbols.forEach(symbol => {
            symbol.update(deltaTime);
        });
        
        // Actualizar conexiones
        this.connections.forEach(connection => {
            connection.energyFlow *= Math.pow(0.95, deltaTime * 60);
        });
        
        // Actualizar ceremonias
        this.updateCeremonies(deltaTime);
    }

    updateCeremonies(deltaTime) {
        const ceremoniesToRemove = [];
        
        this.ceremonies.forEach((ceremony, ceremonyId) => {
            const elapsed = Date.now() - ceremony.startTime;
            const progress = elapsed / ceremony.duration;
            
            if (progress >= 1.0) {
                this.concludeCeremony(ceremony);
                ceremoniesToRemove.push(ceremonyId);
                return;
            }
            
            // Actualizar fase
            if (progress < 0.2) {
                ceremony.phase = 'preparation';
                ceremony.intensity = progress * 5;
            } else if (progress < 0.8) {
                ceremony.phase = 'ritual';
                ceremony.intensity = 1.0;
            } else {
                ceremony.phase = 'conclusion';
                ceremony.intensity = (1.0 - progress) * 5;
            }
            
            // Actualizar participantes
            ceremony.participants.forEach(symbol => {
                symbol.activate(ceremony.intensity * 0.8);
            });
        });
        
        ceremoniesToRemove.forEach(id => this.ceremonies.delete(id));
    }

    concludeCeremony(ceremony) {
        ceremony.tradition.effects.forEach(effectType => {
            switch (effectType) {
                case 'spiritual_awakening':
                    this.symbols.forEach(symbol => {
                        symbol.spiritualEnergy = Math.min(1, symbol.spiritualEnergy + 0.3);
                    });
                    break;
                case 'community_blessing':
                    this.connections.forEach(connection => {
                        connection.strength *= 1.2;
                    });
                    break;
            }
        });
    }

    getRenderData() {
        return {
            symbols: Array.from(this.symbols.values()).map(symbol => symbol.getRenderData()),
            connections: Array.from(this.connections.values()).map(connection => ({
                ...connection,
                symbolAPos: this.symbols.get(connection.symbolA)?.position,
                symbolBPos: this.symbols.get(connection.symbolB)?.position
            })),
            ceremonies: Array.from(this.ceremonies.values()),
            networkStrength: this.networkStrength
        };
    }

    getStats() {
        return {
            totalSymbols: this.symbols.size,
            totalConnections: this.connections.size,
            activeCeremonies: this.ceremonies.size,
            networkStrength: this.networkStrength
        };
    }
}

class CulturalRenderer {
    constructor(renderer, particleSystem) {
        this.renderer = renderer;
        this.particleSystem = particleSystem;
        this.network = new CulturalNetwork();
        
        this.enableSymbols = true;
        this.enableConnections = true;
        this.enableEffects = true;
        
        this.glowIntensity = 1.0;
        this.connectionOpacity = 0.7;
        
        this.createShaders();
    }

    createShaders() {
        const symbolVertexShader = `
            attribute vec3 a_position;
            attribute vec2 a_texCoord;
            uniform mat4 u_modelMatrix;
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform float u_pulseScale;
            uniform float u_hoverHeight;
            varying vec2 v_texCoord;
            
            void main() {
                vec3 position = a_position * u_pulseScale;
                position.y += u_hoverHeight;
                
                gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(position, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        const symbolFragmentShader = `
            precision mediump float;
            uniform vec3 u_color;
            uniform float u_activationLevel;
            uniform float u_spiritualEnergy;
            uniform float u_time;
            varying vec2 v_texCoord;
            
            void main() {
                vec3 baseColor = u_color;
                
                float glow = u_activationLevel * (0.5 + 0.5 * sin(u_time * 5.0));
                vec3 activationColor = vec3(1.0, 0.8, 0.2) * glow;
                
                float spiritual = u_spiritualEnergy * (0.7 + 0.3 * sin(u_time * 3.0));
                vec3 spiritualColor = vec3(0.8, 0.2, 1.0) * spiritual;
                
                vec3 finalColor = baseColor + activationColor + spiritualColor;
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
        
        this.renderer.createProgram('cultural_symbol', symbolVertexShader, symbolFragmentShader);
    }

    addSymbol(type, meaning, position, config = {}) {
        const symbol = new CulturalSymbol(type, meaning, config);
        vec3.copy(symbol.position, position);
        return this.network.addSymbol(symbol);
    }

    startCeremony(ceremonyType, position) {
        return this.network.startCeremony(ceremonyType, position);
    }

    activateSymbol(symbolId, intensity = 1.0) {
        this.network.activateSymbol(symbolId, intensity);
    }

    update(deltaTime) {
        this.network.update(deltaTime);
    }

    render(camera) {
        const renderData = this.network.getRenderData();
        
        if (this.enableSymbols) {
            this.renderSymbols(renderData.symbols, camera);
        }
        
        if (this.enableConnections) {
            this.renderConnections(renderData.connections, camera);
        }
        
        if (this.enableEffects) {
            this.renderEffects(renderData, camera);
        }
    }

    renderSymbols(symbols, camera) {
        const program = this.renderer.useProgram('cultural_symbol');
        
        this.renderer.setUniform(program, 'u_viewMatrix', camera.viewMatrix);
        this.renderer.setUniform(program, 'u_projectionMatrix', camera.projectionMatrix);
        this.renderer.setUniform(program, 'u_time', Date.now() * 0.001);
        
        symbols.forEach(symbolData => {
            const modelMatrix = mat4.create();
            mat4.fromRotationTranslationScale(modelMatrix, 
                                             symbolData.rotation, 
                                             symbolData.position, 
                                             symbolData.scale);
            
            this.renderer.setUniform(program, 'u_modelMatrix', modelMatrix);
            this.renderer.setUniform(program, 'u_color', symbolData.colors[0] || vec3.fromValues(1, 1, 1));
            this.renderer.setUniform(program, 'u_activationLevel', symbolData.activationLevel);
            this.renderer.setUniform(program, 'u_spiritualEnergy', symbolData.spiritualEnergy);
            this.renderer.setUniform(program, 'u_pulseScale', symbolData.pulseScale);
            this.renderer.setUniform(program, 'u_hoverHeight', symbolData.hoverHeight);
            
            // Renderizar geometría del símbolo
        });
    }

    renderConnections(connections, camera) {
        const gl = this.renderer.gl;
        
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        connections.forEach(connection => {
            if (connection.symbolAPos && connection.symbolBPos && connection.energyFlow > 0.1) {
                this.renderConnectionLine(connection.symbolAPos, connection.symbolBPos, connection.energyFlow);
            }
        });
        
        gl.disable(gl.BLEND);
    }

    renderConnectionLine(posA, posB, energyFlow) {
        // Crear línea entre posiciones con intensidad basada en energyFlow
    }

    renderEffects(renderData, camera) {
        if (!this.particleSystem) return;
        
        renderData.symbols.forEach(symbolData => {
            if (symbolData.particles && symbolData.activationLevel > 0.5) {
                const emitter = this.particleSystem.createEmitter(`symbol_${Date.now()}`, 'magic', 30);
                emitter.setPosition(symbolData.position[0], symbolData.position[1], symbolData.position[2]);
                emitter.colorStart = vec4.fromValues(symbolData.colors[0][0], symbolData.colors[0][1], symbolData.colors[0][2], 1);
                emitter.triggerBurst();
            }
        });
        
        renderData.ceremonies.forEach(ceremony => {
            if (ceremony.phase === 'ritual' && this.particleSystem) {
                this.particleSystem.createCelebrationFireworks(ceremony.centerPosition);
            }
        });
    }

    getCulturalNetwork() {
        return this.network;
    }

    getStats() {
        return this.network.getStats();
    }

    dispose() {
        this.network.symbols.clear();
        this.network.connections.clear();
        this.network.ceremonies.clear();
    }
}

export { CulturalSymbol, CulturalNetwork, CulturalRenderer };