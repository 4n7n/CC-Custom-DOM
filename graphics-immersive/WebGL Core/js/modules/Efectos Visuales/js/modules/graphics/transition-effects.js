/**
 * Transition Effects - Sistema de efectos de transición
 * Maneja transiciones suaves entre escenas, fade in/out, y efectos visuales dinámicos
 */

import { vec3, vec4, mat4 } from 'gl-matrix';

class TransitionEffect {
    constructor(type, duration = 1.0) {
        this.type = type;
        this.duration = duration;
        this.currentTime = 0.0;
        this.active = false;
        this.progress = 0.0;
        
        // Configuración de easing
        this.easingType = 'easeInOut';
        this.direction = 'forward'; // 'forward', 'reverse'
        
        // Callbacks
        this.onStart = null;
        this.onUpdate = null;
        this.onComplete = null;
        
        // Parámetros específicos del efecto
        this.parameters = {};
        
        this.initializeParameters();
    }

    initializeParameters() {
        switch (this.type) {
            case 'fade':
                this.parameters = {
                    startAlpha: 0.0,
                    endAlpha: 1.0,
                    color: vec3.fromValues(0, 0, 0)
                };
                break;
                
            case 'slide':
                this.parameters = {
                    startOffset: vec3.fromValues(-1, 0, 0),
                    endOffset: vec3.fromValues(0, 0, 0),
                    axis: 'x'
                };
                break;
                
            case 'zoom':
                this.parameters = {
                    startScale: 0.1,
                    endScale: 1.0,
                    centerPoint: vec3.fromValues(0, 0, 0)
                };
                break;
                
            case 'wipe':
                this.parameters = {
                    direction: vec3.fromValues(1, 0, 0),
                    softness: 0.1
                };
                break;
                
            case 'dissolve':
                this.parameters = {
                    noiseScale: 1.0,
                    threshold: 0.5,
                    softness: 0.2
                };
                break;
                
            case 'blur':
                this.parameters = {
                    startBlur: 0.0,
                    endBlur: 10.0,
                    samples: 16
                };
                break;
                
            case 'pixelate':
                this.parameters = {
                    startPixelSize: 1.0,
                    endPixelSize: 32.0
                };
                break;
                
            case 'ripple':
                this.parameters = {
                    centerPoint: vec3.fromValues(0.5, 0.5, 0),
                    amplitude: 0.1,
                    frequency: 10.0,
                    speed: 5.0
                };
                break;
        }
    }

    start() {
        this.active = true;
        this.currentTime = 0.0;
        this.progress = this.direction === 'forward' ? 0.0 : 1.0;
        
        if (this.onStart) {
            this.onStart(this);
        }
    }

    stop() {
        this.active = false;
        
        if (this.onComplete) {
            this.onComplete(this);
        }
    }

    update(deltaTime) {
        if (!this.active) return;
        
        this.currentTime += deltaTime;
        
        // Calcular progreso
        const rawProgress = Math.min(this.currentTime / this.duration, 1.0);
        this.progress = this.direction === 'forward' ? 
                       this.applyEasing(rawProgress) : 
                       this.applyEasing(1.0 - rawProgress);
        
        // Callback de actualización
        if (this.onUpdate) {
            this.onUpdate(this, this.progress);
        }
        
        // Verificar finalización
        if (rawProgress >= 1.0) {
            this.stop();
        }
    }

    applyEasing(t) {
        switch (this.easingType) {
            case 'linear':
                return t;
                
            case 'easeIn':
                return t * t;
                
            case 'easeOut':
                return 1 - (1 - t) * (1 - t);
                
            case 'easeInOut':
                return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                
            case 'easeInCubic':
                return t * t * t;
                
            case 'easeOutCubic':
                return 1 - Math.pow(1 - t, 3);
                
            case 'easeInOutCubic':
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                
            case 'bounce':
                const n1 = 7.5625;
                const d1 = 2.75;
                
                if (t < 1 / d1) {
                    return n1 * t * t;
                } else if (t < 2 / d1) {
                    return n1 * (t -= 1.5 / d1) * t + 0.75;
                } else if (t < 2.5 / d1) {
                    return n1 * (t -= 2.25 / d1) * t + 0.9375;
                } else {
                    return n1 * (t -= 2.625 / d1) * t + 0.984375;
                }
                
            case 'elastic':
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 : 
                       -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
                
            default:
                return t;
        }
    }

    reverse() {
        this.direction = this.direction === 'forward' ? 'reverse' : 'forward';
        this.currentTime = this.duration - this.currentTime;
    }

    setProgress(progress) {
        this.progress = Math.max(0, Math.min(1, progress));
        this.currentTime = this.progress * this.duration;
    }

    getShaderUniforms() {
        const uniforms = {
            u_transitionProgress: this.progress,
            u_transitionType: this.getTypeIndex(),
            u_transitionDuration: this.duration,
            u_transitionTime: this.currentTime
        };
        
        // Agregar parámetros específicos del efecto
        Object.entries(this.parameters).forEach(([key, value]) => {
            uniforms[`u_transition_${key}`] = value;
        });
        
        return uniforms;
    }

    getTypeIndex() {
        const types = ['fade', 'slide', 'zoom', 'wipe', 'dissolve', 'blur', 'pixelate', 'ripple'];
        return types.indexOf(this.type);
    }
}

class SceneTransition {
    constructor(renderer) {
        this.renderer = renderer;
        
        this.currentScene = null;
        this.nextScene = null;
        this.transitionEffect = null;
        
        // Estado de transición
        this.isTransitioning = false;
        this.transitionQueue = [];
        
        // Buffers para renderizado de transiciones
        this.frameBuffer1 = null;
        this.frameBuffer2 = null;
        this.transitionTexture1 = null;
        this.transitionTexture2 = null;
        
        // Quad para renderizado fullscreen
        this.fullscreenQuad = null;
        
        this.init();
    }

    init() {
        this.createFrameBuffers();
        this.createFullscreenQuad();
        this.createTransitionShaders();
        
        console.log('Scene Transition inicializado');
    }

    createFrameBuffers() {
        const gl = this.renderer.gl;
        const canvas = this.renderer.canvas;
        
        // Crear texturas para renderizado offscreen
        this.transitionTexture1 = this.renderer.createTexture('transition1', null, {
            width: canvas.width,
            height: canvas.height,
            format: 'RGBA',
            type: 'UNSIGNED_BYTE',
            generateMipmaps: false
        });
        
        this.transitionTexture2 = this.renderer.createTexture('transition2', null, {
            width: canvas.width,
            height: canvas.height,
            format: 'RGBA',
            type: 'UNSIGNED_BYTE',
            generateMipmaps: false
        });
        
        // Crear framebuffers
        this.frameBuffer1 = gl.createFramebuffer();
        this.frameBuffer2 = gl.createFramebuffer();
        
        // Configurar framebuffer 1
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer1);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                               gl.TEXTURE_2D, this.transitionTexture1.texture, 0);
        
        // Configurar framebuffer 2
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer2);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                               gl.TEXTURE_2D, this.transitionTexture2.texture, 0);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    createFullscreenQuad() {
        const vertices = new Float32Array([
            -1, -1, 0, 0, 0,
             1, -1, 0, 1, 0,
             1,  1, 0, 1, 1,
            -1,  1, 0, 0, 1
        ]);
        
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        
        this.fullscreenQuad = {
            vertices: this.renderer.createBuffer('transition_quad_vertices', vertices),
            indices: this.renderer.createBuffer('transition_quad_indices', indices, 
                                               this.renderer.gl.ELEMENT_ARRAY_BUFFER)
        };
    }

    createTransitionShaders() {
        const vertexShader = `
            attribute vec3 a_position;
            attribute vec2 a_texCoord;
            
            varying vec2 v_texCoord;
            
            void main() {
                v_texCoord = a_texCoord;
                gl_Position = vec4(a_position, 1.0);
            }
        `;
        
        const fragmentShader = `
            precision highp float;
            
            uniform sampler2D u_texture1;
            uniform sampler2D u_texture2;
            uniform sampler2D u_noiseTexture;
            
            uniform float u_transitionProgress;
            uniform int u_transitionType;
            uniform float u_transitionTime;
            
            // Parámetros específicos de transición
            uniform float u_transition_startAlpha;
            uniform float u_transition_endAlpha;
            uniform vec3 u_transition_color;
            uniform vec3 u_transition_startOffset;
            uniform vec3 u_transition_endOffset;
            uniform float u_transition_startScale;
            uniform float u_transition_endScale;
            uniform vec3 u_transition_centerPoint;
            uniform vec3 u_transition_direction;
            uniform float u_transition_softness;
            uniform float u_transition_noiseScale;
            uniform float u_transition_threshold;
            uniform float u_transition_startBlur;
            uniform float u_transition_endBlur;
            uniform float u_transition_startPixelSize;
            uniform float u_transition_endPixelSize;
            uniform float u_transition_amplitude;
            uniform float u_transition_frequency;
            uniform float u_transition_speed;
            
            varying vec2 v_texCoord;
            
            // Función de ruido
            float noise(vec2 uv) {
                return texture2D(u_noiseTexture, uv * u_transition_noiseScale).r;
            }
            
            // Efecto de desenfoque
            vec4 blur(sampler2D tex, vec2 uv, float amount) {
                vec4 result = vec4(0.0);
                float total = 0.0;
                
                for (int x = -4; x <= 4; x++) {
                    for (int y = -4; y <= 4; y++) {
                        vec2 offset = vec2(float(x), float(y)) * amount / 512.0;
                        float weight = 1.0 / (1.0 + length(offset) * 10.0);
                        result += texture2D(tex, uv + offset) * weight;
                        total += weight;
                    }
                }
                
                return result / total;
            }
            
            // Efecto de pixelado
            vec4 pixelate(sampler2D tex, vec2 uv, float pixelSize) {
                vec2 pixelatedUV = floor(uv * 512.0 / pixelSize) * pixelSize / 512.0;
                return texture2D(tex, pixelatedUV);
            }
            
            // Efecto de ondas
            vec2 ripple(vec2 uv, vec2 center, float time, float amplitude, float frequency) {
                vec2 toCenter = uv - center;
                float distance = length(toCenter);
                float rippleEffect = sin(distance * frequency - time * u_transition_speed) * amplitude;
                
                return uv + normalize(toCenter) * rippleEffect * exp(-distance * 2.0);
            }
            
            void main() {
                vec2 uv = v_texCoord;
                vec4 color1 = texture2D(u_texture1, uv);
                vec4 color2 = texture2D(u_texture2, uv);
                vec4 finalColor;
                
                if (u_transitionType == 0) { // Fade
                    float alpha = mix(u_transition_startAlpha, u_transition_endAlpha, u_transitionProgress);
                    finalColor = mix(color1, color2, alpha);
                    
                } else if (u_transitionType == 1) { // Slide
                    vec2 offset = mix(u_transition_startOffset.xy, u_transition_endOffset.xy, u_transitionProgress);
                    vec2 uv1 = uv + offset;
                    vec2 uv2 = uv + offset - vec2(1.0, 0.0);
                    
                    if (uv1.x >= 0.0 && uv1.x <= 1.0 && uv1.y >= 0.0 && uv1.y <= 1.0) {
                        finalColor = texture2D(u_texture1, uv1);
                    } else {
                        finalColor = texture2D(u_texture2, uv2);
                    }
                    
                } else if (u_transitionType == 2) { // Zoom
                    float scale = mix(u_transition_startScale, u_transition_endScale, u_transitionProgress);
                    vec2 center = u_transition_centerPoint.xy;
                    vec2 scaledUV = (uv - center) / scale + center;
                    
                    if (scaledUV.x >= 0.0 && scaledUV.x <= 1.0 && scaledUV.y >= 0.0 && scaledUV.y <= 1.0) {
                        finalColor = mix(texture2D(u_texture1, scaledUV), color2, u_transitionProgress);
                    } else {
                        finalColor = color2;
                    }
                    
                } else if (u_transitionType == 3) { // Wipe
                    vec3 dir = normalize(u_transition_direction);
                    float wipeProgress = dot(uv - vec2(0.5), dir.xy) + 0.5;
                    float edge = smoothstep(u_transitionProgress - u_transition_softness, 
                                          u_transitionProgress + u_transition_softness, wipeProgress);
                    finalColor = mix(color1, color2, edge);
                    
                } else if (u_transitionType == 4) { // Dissolve
                    float noiseValue = noise(uv);
                    float dissolveEdge = smoothstep(u_transitionProgress - u_transition_softness,
                                                  u_transitionProgress + u_transition_softness, noiseValue);
                    finalColor = mix(color1, color2, dissolveEdge);
                    
                } else if (u_transitionType == 5) { // Blur
                    float blurAmount = mix(u_transition_startBlur, u_transition_endBlur, u_transitionProgress);
                    vec4 blurredColor1 = blur(u_texture1, uv, blurAmount);
                    finalColor = mix(blurredColor1, color2, u_transitionProgress);
                    
                } else if (u_transitionType == 6) { // Pixelate
                    float pixelSize = mix(u_transition_startPixelSize, u_transition_endPixelSize, u_transitionProgress);
                    vec4 pixelatedColor1 = pixelate(u_texture1, uv, pixelSize);
                    finalColor = mix(pixelatedColor1, color2, u_transitionProgress);
                    
                } else if (u_transitionType == 7) { // Ripple
                    vec2 rippleUV = ripple(uv, u_transition_centerPoint.xy, u_transitionTime, 
                                         u_transition_amplitude, u_transition_frequency);
                    vec4 rippleColor1 = texture2D(u_texture1, rippleUV);
                    finalColor = mix(rippleColor1, color2, u_transitionProgress);
                    
                } else {
                    // Fallback: fade simple
                    finalColor = mix(color1, color2, u_transitionProgress);
                }
                
                gl_FragColor = finalColor;
            }
        `;
        
        this.renderer.createProgram('transition', vertexShader, fragmentShader);
    }

    startTransition(fromScene, toScene, effect) {
        if (this.isTransitioning) {
            this.transitionQueue.push({ fromScene, toScene, effect });
            return;
        }
        
        this.currentScene = fromScene;
        this.nextScene = toScene;
        this.transitionEffect = effect;
        this.isTransitioning = true;
        
        // Configurar callbacks
        this.transitionEffect.onComplete = () => {
            this.completeTransition();
        };
        
        this.transitionEffect.start();
        
        console.log(`Iniciando transición: ${effect.type}`);
    }

    completeTransition() {
        this.currentScene = this.nextScene;
        this.nextScene = null;
        this.transitionEffect = null;
        this.isTransitioning = false;
        
        // Procesar siguiente transición en cola
        if (this.transitionQueue.length > 0) {
            const next = this.transitionQueue.shift();
            this.startTransition(next.fromScene, next.toScene, next.effect);
        }
    }

    update(deltaTime) {
        if (this.transitionEffect) {
            this.transitionEffect.update(deltaTime);
        }
    }

    render(camera) {
        if (!this.isTransitioning) {
            // Renderizado normal
            if (this.currentScene && this.currentScene.render) {
                this.currentScene.render(camera);
            }
            return;
        }
        
        const gl = this.renderer.gl;
        
        // Renderizar escena actual a textura
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (this.currentScene && this.currentScene.render) {
            this.currentScene.render(camera);
        }
        
        // Renderizar escena siguiente a textura
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer2);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (this.nextScene && this.nextScene.render) {
            this.nextScene.render(camera);
        }
        
        // Renderizar transición a pantalla
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.renderTransition();
    }

    renderTransition() {
        const gl = this.renderer.gl;
        const program = this.renderer.useProgram('transition');
        
        // Configurar uniforms
        const uniforms = this.transitionEffect.getShaderUniforms();
        Object.entries(uniforms).forEach(([name, value]) => {
            this.renderer.setUniform(program, name, value);
        });
        
        // Bind texturas
        this.renderer.bindTexture('transition1', 0);
        this.renderer.bindTexture('transition2', 1);
        this.renderer.bindTexture('noise', 2); // Textura de ruido
        
        this.renderer.setUniform(program, 'u_texture1', 0);
        this.renderer.setUniform(program, 'u_texture2', 1);
        this.renderer.setUniform(program, 'u_noiseTexture', 2);
        
        // Configurar geometría
        this.setupQuadGeometry(program);
        
        // Renderizar
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    setupQuadGeometry(program) {
        const gl = this.renderer.gl;
        
        // Configurar atributos de vértice
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenQuad.vertices.buffer);
        
        const positionLocation = program.attributes.a_position;
        const texCoordLocation = program.attributes.a_texCoord;
        
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 20, 0);
        
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 20, 12);
        
        // Bind buffer de índices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fullscreenQuad.indices.buffer);
    }

    // Métodos de conveniencia para crear transiciones comunes
    createFadeTransition(duration = 1.0, color = [0, 0, 0]) {
        const effect = new TransitionEffect('fade', duration);
        effect.parameters.color = vec3.fromValues(color[0], color[1], color[2]);
        return effect;
    }

    createSlideTransition(duration = 1.0, direction = 'left') {
        const effect = new TransitionEffect('slide', duration);
        
        switch (direction) {
            case 'left':
                effect.parameters.startOffset = vec3.fromValues(-1, 0, 0);
                break;
            case 'right':
                effect.parameters.startOffset = vec3.fromValues(1, 0, 0);
                break;
            case 'up':
                effect.parameters.startOffset = vec3.fromValues(0, 1, 0);
                break;
            case 'down':
                effect.parameters.startOffset = vec3.fromValues(0, -1, 0);
                break;
        }
        
        return effect;
    }

    createZoomTransition(duration = 1.0, zoomIn = true) {
        const effect = new TransitionEffect('zoom', duration);
        
        if (zoomIn) {
            effect.parameters.startScale = 0.1;
            effect.parameters.endScale = 1.0;
        } else {
            effect.parameters.startScale = 1.0;
            effect.parameters.endScale = 0.1;
        }
        
        return effect;
    }

    createWipeTransition(duration = 1.0, direction = 'horizontal') {
        const effect = new TransitionEffect('wipe', duration);
        
        switch (direction) {
            case 'horizontal':
                effect.parameters.direction = vec3.fromValues(1, 0, 0);
                break;
            case 'vertical':
                effect.parameters.direction = vec3.fromValues(0, 1, 0);
                break;
            case 'diagonal':
                effect.parameters.direction = vec3.fromValues(1, 1, 0);
                vec3.normalize(effect.parameters.direction, effect.parameters.direction);
                break;
        }
        
        return effect;
    }

    createDissolveTransition(duration = 1.0, noiseScale = 1.0) {
        const effect = new TransitionEffect('dissolve', duration);
        effect.parameters.noiseScale = noiseScale;
        return effect;
    }

    createRippleTransition(duration = 1.0, centerX = 0.5, centerY = 0.5) {
        const effect = new TransitionEffect('ripple', duration);
        effect.parameters.centerPoint = vec3.fromValues(centerX, centerY, 0);
        return effect;
    }

    // Transiciones combinadas
    createCrossDissolve(duration = 1.0) {
        const effect = this.createFadeTransition(duration);
        effect.easingType = 'easeInOut';
        return effect;
    }

    createPageTurn(duration = 1.5) {
        // Efecto de voltear página (combinación de rotación y sombra)
        const effect = new TransitionEffect('slide', duration);
        effect.easingType = 'easeInOutCubic';
        return effect;
    }

    createMorphTransition(duration = 2.0) {
        // Transición orgánica que combina varios efectos
        const effect = new TransitionEffect('dissolve', duration);
        effect.parameters.noiseScale = 0.5;
        effect.easingType = 'easeInOut';
        return effect;
    }

    // Gestión de efectos en cadena
    chainTransitions(transitions) {
        if (transitions.length === 0) return;
        
        let currentTransition = transitions[0];
        
        for (let i = 1; i < transitions.length; i++) {
            const nextTransition = transitions[i];
            const prevOnComplete = currentTransition.onComplete;
            
            currentTransition.onComplete = function(effect) {
                if (prevOnComplete) prevOnComplete(effect);
                nextTransition.start();
            };
            
            currentTransition = nextTransition;
        }
        
        transitions[0].start();
    }

    // Utilidades
    resize(width, height) {
        // Redimensionar texturas de transición
        this.createFrameBuffers();
    }

    isActive() {
        return this.isTransitioning;
    }

    getCurrentProgress() {
        return this.transitionEffect ? this.transitionEffect.progress : 0;
    }

    dispose() {
        const gl = this.renderer.gl;
        
        // Limpiar framebuffers
        if (this.frameBuffer1) gl.deleteFramebuffer(this.frameBuffer1);
        if (this.frameBuffer2) gl.deleteFramebuffer(this.frameBuffer2);
        
        // Las texturas se limpian automáticamente por el renderer
        
        this.transitionQueue.length = 0;
        
        console.log('Scene Transition limpiado');
    }
}

// Factory para crear transiciones predefinidas
class TransitionFactory {
    static createStandardFade(duration = 1.0) {
        return new TransitionEffect('fade', duration);
    }

    static createCinematicFade(duration = 2.0) {
        const effect = new TransitionEffect('fade', duration);
        effect.easingType = 'easeInOutCubic';
        effect.parameters.color = vec3.fromValues(0, 0, 0);
        return effect;
    }

    static createGameTransition(duration = 0.5) {
        const effect = new TransitionEffect('wipe', duration);
        effect.easingType = 'easeOut';
        effect.parameters.direction = vec3.fromValues(1, 0, 0);
        effect.parameters.softness = 0.1;
        return effect;
    }

    static createDreamSequence(duration = 3.0) {
        const effect = new TransitionEffect('dissolve', duration);
        effect.easingType = 'easeInOut';
        effect.parameters.noiseScale = 0.3;
        effect.parameters.softness = 0.4;
        return effect;
    }

    static createTeleport(duration = 0.8) {
        const effect = new TransitionEffect('ripple', duration);
        effect.easingType = 'easeOutElastic';
        effect.parameters.amplitude = 0.2;
        effect.parameters.frequency = 15.0;
        return effect;
    }

    static createPortal(duration = 1.5) {
        const effect = new TransitionEffect('zoom', duration);
        effect.easingType = 'easeInOutCubic';
        effect.parameters.startScale = 0.01;
        effect.parameters.endScale = 1.0;
        effect.parameters.centerPoint = vec3.fromValues(0.5, 0.5, 0);
        return effect;
    }
}

export { TransitionEffect, SceneTransition, TransitionFactory };