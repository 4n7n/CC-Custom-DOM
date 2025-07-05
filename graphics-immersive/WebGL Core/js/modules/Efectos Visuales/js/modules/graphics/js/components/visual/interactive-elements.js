/**
 * Interactive Elements - Sistema de elementos interactivos
 * Maneja objetos clickables, hover effects, animaciones de UI y feedback visual
 */

import { vec3, vec4, mat4, quat } from 'gl-matrix';

class InteractiveElement {
    constructor(id, type, position, config = {}) {
        this.id = id;
        this.type = type; // 'button', 'panel', 'tooltip', 'popup', 'highlight', 'guide'
        this.position = vec3.clone(position);
        this.rotation = quat.create();
        this.scale = vec3.fromValues(1, 1, 1);
        
        this.config = {
            width: 100,
            height: 50,
            depth: 5,
            interactive: true,
            clickable: true,
            hoverable: true,
            ...config
        };
        
        // Estado de interacción
        this.state = {
            visible: true,
            enabled: true,
            hovered: false,
            pressed: false,
            selected: false,
            focused: false
        };
        
        // Propiedades visuales
        this.visual = {
            color: vec3.fromValues(0.3, 0.6, 0.9),
            hoverColor: vec3.fromValues(0.4, 0.7, 1.0),
            pressedColor: vec3.fromValues(0.2, 0.5, 0.8),
            disabledColor: vec3.fromValues(0.5, 0.5, 0.5),
            opacity: 1.0,
            glowIntensity: 0.0,
            borderWidth: 2.0
        };
        
        // Animación
        this.animation = {
            duration: 0.3,
            currentTime: 0,
            animating: false,
            startValues: {},
            targetValues: {}
        };
        
        // Efectos
        this.effects = {
            ripple: null,
            glow: null,
            particles: null,
            shake: null
        };
        
        // Contenido
        this.content = {
            text: config.text || '',
            icon: config.icon || null,
            tooltip: config.tooltip || ''
        };
        
        // Callbacks
        this.callbacks = {
            onClick: null,
            onHover: null,
            onLeave: null
        };
        
        this.initializeByType();
    }

    initializeByType() {
        switch (this.type) {
            case 'button':
                this.config.width = 120;
                this.config.height = 40;
                this.visual.color = vec3.fromValues(0.2, 0.5, 0.8);
                this.hoverElevation = 2;
                break;
                
            case 'panel':
                this.config.width = 300;
                this.config.height = 200;
                this.config.clickable = false;
                this.visual.color = vec3.fromValues(0.95, 0.95, 0.95);
                this.visual.opacity = 0.9;
                break;
                
            case 'tooltip':
                this.config.width = 200;
                this.config.height = 60;
                this.config.clickable = false;
                this.visual.color = vec3.fromValues(0.1, 0.1, 0.1);
                this.showDelay = 0.5;
                this.autoHide = true;
                break;
                
            case 'popup':
                this.config.width = 400;
                this.config.height = 300;
                this.visual.color = vec3.fromValues(1, 1, 1);
                this.modal = true;
                break;
                
            case 'highlight':
                this.config.clickable = false;
                this.visual.color = vec3.fromValues(1, 1, 0);
                this.visual.opacity = 0.3;
                this.pulseAnimation = true;
                break;
                
            case 'guide':
                this.config.clickable = false;
                this.visual.color = vec3.fromValues(0, 1, 0);
                this.arrowDirection = vec3.fromValues(0, 0, 1);
                this.animated = true;
                break;
        }
    }

    setPosition(x, y, z) {
        vec3.set(this.position, x, y, z);
    }

    setSize(width, height, depth = this.config.depth) {
        this.config.width = width;
        this.config.height = height;
        this.config.depth = depth;
    }

    setColor(r, g, b) {
        vec3.set(this.visual.color, r, g, b);
    }

    show(animated = true) {
        if (animated) {
            this.animateProperty('opacity', this.visual.opacity, 1.0);
            this.animateProperty('scale', this.scale, vec3.fromValues(1, 1, 1));
        } else {
            this.visual.opacity = 1.0;
            vec3.set(this.scale, 1, 1, 1);
        }
        this.state.visible = true;
    }

    hide(animated = true) {
        if (animated) {
            this.animateProperty('opacity', this.visual.opacity, 0.0);
            this.animateProperty('scale', this.scale, vec3.fromValues(0.8, 0.8, 0.8));
            
            setTimeout(() => {
                this.state.visible = false;
            }, this.animation.duration * 1000);
        } else {
            this.state.visible = false;
            this.visual.opacity = 0.0;
        }
    }

    enable() {
        this.state.enabled = true;
        this.setColor(...this.visual.color);
    }

    disable() {
        this.state.enabled = false;
        this.setColor(...this.visual.disabledColor);
    }

    onHover() {
        if (!this.state.enabled || !this.config.hoverable) return;
        
        this.state.hovered = true;
        this.animateProperty('color', this.visual.color, this.visual.hoverColor);
        
        if (this.hoverElevation) {
            this.animateProperty('elevation', 0, this.hoverElevation);
        }
        
        this.visual.glowIntensity = 0.3;
        
        if (this.callbacks.onHover) {
            this.callbacks.onHover(this);
        }
        
        this.createHoverEffect();
    }

    onLeave() {
        if (!this.state.enabled) return;
        
        this.state.hovered = false;
        this.animateProperty('color', this.visual.hoverColor, this.visual.color);
        
        if (this.hoverElevation) {
            this.animateProperty('elevation', this.hoverElevation, 0);
        }
        
        this.visual.glowIntensity = 0;
        
        if (this.callbacks.onLeave) {
            this.callbacks.onLeave(this);
        }
    }

    onClick() {
        if (!this.state.enabled || !this.config.clickable) return;
        
        this.state.pressed = true;
        this.animateProperty('color', this.visual.hoverColor, this.visual.pressedColor);
        this.animateProperty('scale', this.scale, vec3.fromValues(0.95, 0.95, 0.95));
        
        setTimeout(() => {
            this.state.pressed = false;
            this.animateProperty('color', this.visual.pressedColor, this.visual.hoverColor);
            this.animateProperty('scale', vec3.fromValues(0.95, 0.95, 0.95), this.scale);
        }, 150);
        
        this.createRippleEffect();
        
        if (this.callbacks.onClick) {
            this.callbacks.onClick(this);
        }
    }

    animateProperty(propertyName, startValue, endValue) {
        this.animation.animating = true;
        this.animation.currentTime = 0;
        this.animation.startValues[propertyName] = startValue;
        this.animation.targetValues[propertyName] = endValue;
    }

    createRippleEffect() {
        this.effects.ripple = {
            startTime: Date.now(),
            duration: 600,
            maxRadius: Math.max(this.config.width, this.config.height) * 0.7,
            currentRadius: 0,
            color: vec3.fromValues(1, 1, 1),
            opacity: 0.5
        };
    }

    createHoverEffect() {
        this.effects.glow = {
            intensity: 0.3,
            color: this.visual.hoverColor,
            pulsing: true
        };
    }

    createShakeEffect(intensity = 1.0) {
        this.effects.shake = {
            startTime: Date.now(),
            duration: 500,
            intensity: intensity,
            frequency: 10
        };
    }

    createParticleEffect(type = 'sparkle') {
        this.effects.particles = {
            type: type,
            count: 20,
            startTime: Date.now(),
            duration: 1000,
            color: this.visual.color
        };
    }

    update(deltaTime) {
        // Actualizar animaciones
        if (this.animation.animating) {
            this.updateAnimations(deltaTime);
        }
        
        // Actualizar efectos
        this.updateEffects(deltaTime);
        
        // Animaciones específicas por tipo
        this.updateTypeSpecificAnimations(deltaTime);
    }

    updateAnimations(deltaTime) {
        this.animation.currentTime += deltaTime;
        const progress = Math.min(this.animation.currentTime / this.animation.duration, 1.0);
        const easedProgress = this.easeOut(progress);
        
        Object.keys(this.animation.targetValues).forEach(propertyName => {
            const startValue = this.animation.startValues[propertyName];
            const endValue = this.animation.targetValues[propertyName];
            
            if (Array.isArray(startValue)) {
                // Vector interpolation
                const current = vec3.create();
                vec3.lerp(current, startValue, endValue, easedProgress);
                
                switch (propertyName) {
                    case 'color':
                        vec3.copy(this.visual.color, current);
                        break;
                    case 'scale':
                        vec3.copy(this.scale, current);
                        break;
                }
            } else {
                // Scalar interpolation
                const current = startValue + (endValue - startValue) * easedProgress;
                
                switch (propertyName) {
                    case 'opacity':
                        this.visual.opacity = current;
                        break;
                    case 'elevation':
                        this.currentElevation = current;
                        break;
                }
            }
        });
        
        if (progress >= 1.0) {
            this.animation.animating = false;
        }
    }

    updateEffects(deltaTime) {
        const currentTime = Date.now();
        
        // Actualizar efecto ripple
        if (this.effects.ripple) {
            const elapsed = currentTime - this.effects.ripple.startTime;
            const progress = elapsed / this.effects.ripple.duration;
            
            if (progress >= 1.0) {
                this.effects.ripple = null;
            } else {
                this.effects.ripple.currentRadius = this.effects.ripple.maxRadius * progress;
                this.effects.ripple.opacity = 0.5 * (1.0 - progress);
            }
        }
        
        // Actualizar efecto shake
        if (this.effects.shake) {
            const elapsed = currentTime - this.effects.shake.startTime;
            const progress = elapsed / this.effects.shake.duration;
            
            if (progress >= 1.0) {
                this.effects.shake = null;
                this.shakeOffset = vec3.create();
            } else {
                const intensity = this.effects.shake.intensity * (1.0 - progress);
                const time = elapsed * 0.001;
                
                this.shakeOffset = vec3.fromValues(
                    Math.sin(time * this.effects.shake.frequency) * intensity,
                    Math.cos(time * this.effects.shake.frequency * 1.3) * intensity,
                    0
                );
            }
        }
        
        // Actualizar partículas
        if (this.effects.particles) {
            const elapsed = currentTime - this.effects.particles.startTime;
            if (elapsed >= this.effects.particles.duration) {
                this.effects.particles = null;
            }
        }
    }

    updateTypeSpecificAnimations(deltaTime) {
        const time = Date.now() * 0.001;
        
        switch (this.type) {
            case 'highlight':
                if (this.pulseAnimation) {
                    this.visual.opacity = 0.3 + Math.sin(time * 3) * 0.2;
                }
                break;
                
            case 'guide':
                if (this.animated) {
                    const bobHeight = Math.sin(time * 2) * 5;
                    this.guideBobOffset = bobHeight;
                }
                break;
                
            case 'tooltip':
                if (this.state.visible && this.autoHide) {
                    this.autoHideTimer = (this.autoHideTimer || 0) + deltaTime;
                    if (this.autoHideTimer > 3.0) {
                        this.hide();
                    }
                }
                break;
        }
    }

    easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    getRenderData() {
        const renderPosition = vec3.clone(this.position);
        
        // Aplicar offsets de efectos
        if (this.shakeOffset) {
            vec3.add(renderPosition, renderPosition, this.shakeOffset);
        }
        
        if (this.currentElevation) {
            renderPosition[2] += this.currentElevation;
        }
        
        if (this.guideBobOffset) {
            renderPosition[1] += this.guideBobOffset;
        }
        
        return {
            id: this.id,
            type: this.type,
            position: renderPosition,
            rotation: this.rotation,
            scale: this.scale,
            config: this.config,
            state: this.state,
            visual: this.visual,
            content: this.content,
            effects: this.effects
        };
    }
}

class InteractiveManager {
    constructor(renderer, inputManager) {
        this.renderer = renderer;
        this.inputManager = inputManager;
        
        this.elements = new Map();
        this.hoveredElement = null;
        this.focusedElement = null;
        
        // Configuración
        this.enableHover = true;
        this.enableTooltips = true;
        this.enableSounds = true;
        
        // Raycasting para detección 3D
        this.raycaster = {
            origin: vec3.create(),
            direction: vec3.create()
        };
        
        this.setupEventListeners();
        this.createInteractiveShaders();
    }

    setupEventListeners() {
        if (!this.inputManager) return;
        
        this.inputManager.onMouseMove = (x, y) => {
            this.handleMouseMove(x, y);
        };
        
        this.inputManager.onMouseClick = (x, y, button) => {
            this.handleMouseClick(x, y, button);
        };
        
        this.inputManager.onKeyPress = (key) => {
            this.handleKeyPress(key);
        };
    }

    createInteractiveShaders() {
        const vertexShader = `
            attribute vec3 a_position;
            attribute vec2 a_texCoord;
            
            uniform mat4 u_modelMatrix;
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform float u_elevation;
            
            varying vec2 v_texCoord;
            
            void main() {
                vec3 position = a_position;
                position.z += u_elevation;
                
                gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(position, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        const fragmentShader = `
            precision mediump float;
            
            uniform vec3 u_color;
            uniform float u_opacity;
            uniform float u_glowIntensity;
            uniform vec3 u_glowColor;
            uniform float u_borderWidth;
            uniform vec2 u_size;
            
            varying vec2 v_texCoord;
            
            void main() {
                vec2 center = vec2(0.5, 0.5);
                vec2 pos = v_texCoord - center;
                
                // Border effect
                vec2 border = smoothstep(0.5 - u_borderWidth / u_size, 0.5, abs(pos) + 0.5);
                float borderMask = max(border.x, border.y);
                
                vec3 color = u_color;
                
                // Glow effect
                if (u_glowIntensity > 0.0) {
                    float glow = u_glowIntensity * (1.0 - length(pos * 2.0));
                    color += u_glowColor * glow;
                }
                
                gl_FragColor = vec4(color, u_opacity * (1.0 - borderMask * 0.3));
            }
        `;
        
        this.renderer.createProgram('interactive', vertexShader, fragmentShader);
    }

    createElement(id, type, position, config = {}) {
        const element = new InteractiveElement(id, type, position, config);
        this.elements.set(id, element);
        return element;
    }

    removeElement(id) {
        if (this.hoveredElement?.id === id) {
            this.hoveredElement = null;
        }
        if (this.focusedElement?.id === id) {
            this.focusedElement = null;
        }
        
        return this.elements.delete(id);
    }

    getElement(id) {
        return this.elements.get(id);
    }

    handleMouseMove(x, y) {
        if (!this.enableHover) return;
        
        const hitElement = this.raycastElements(x, y);
        
        if (hitElement !== this.hoveredElement) {
            if (this.hoveredElement) {
                this.hoveredElement.onLeave();
            }
            
            this.hoveredElement = hitElement;
            
            if (this.hoveredElement) {
                this.hoveredElement.onHover();
                
                if (this.enableTooltips && this.hoveredElement.content.tooltip) {
                    this.showTooltip(this.hoveredElement);
                }
            }
        }
    }

    handleMouseClick(x, y, button) {
        const hitElement = this.raycastElements(x, y);
        
        if (hitElement) {
            hitElement.onClick();
            this.focusedElement = hitElement;
        } else {
            if (this.focusedElement) {
                this.focusedElement.state.focused = false;
                this.focusedElement = null;
            }
        }
    }

    handleKeyPress(key) {
        if (this.focusedElement) {
            // Handle keyboard input for focused element
            if (key === 'Enter' || key === ' ') {
                this.focusedElement.onClick();
            }
        }
    }

    raycastElements(screenX, screenY) {
        // Convert screen coordinates to world ray
        // This would use the camera to convert 2D screen coords to 3D world ray
        
        let closestElement = null;
        let closestDistance = Infinity;
        
        this.elements.forEach(element => {
            if (!element.state.visible || !element.state.enabled) return;
            
            const distance = this.testElementIntersection(element, screenX, screenY);
            if (distance !== null && distance < closestDistance) {
                closestDistance = distance;
                closestElement = element;
            }
        });
        
        return closestElement;
    }

    testElementIntersection(element, screenX, screenY) {
        // Simplified 2D intersection test
        // In a real implementation, this would project 3D element bounds to screen space
        
        const bounds = this.getElementScreenBounds(element);
        
        if (screenX >= bounds.left && screenX <= bounds.right &&
            screenY >= bounds.top && screenY <= bounds.bottom) {
            return vec3.distance(element.position, vec3.fromValues(0, 0, 0));
        }
        
        return null;
    }

    getElementScreenBounds(element) {
        // Project element position and size to screen coordinates
        // This is a simplified version
        
        return {
            left: element.position[0] - element.config.width / 2,
            right: element.position[0] + element.config.width / 2,
            top: element.position[1] - element.config.height / 2,
            bottom: element.position[1] + element.config.height / 2
        };
    }

    showTooltip(element) {
        const tooltip = this.createElement(
            `tooltip_${element.id}`, 
            'tooltip', 
            vec3.fromValues(element.position[0] + 10, element.position[1] + 10, element.position[2] + 1),
            { text: element.content.tooltip }
        );
        
        tooltip.show();
        
        setTimeout(() => {
            this.removeElement(`tooltip_${element.id}`);
        }, 3000);
    }

    update(deltaTime) {
        this.elements.forEach(element => {
            element.update(deltaTime);
        });
    }

    render(camera) {
        const gl = this.renderer.gl;
        const program = this.renderer.useProgram('interactive');
        
        this.renderer.setUniform(program, 'u_viewMatrix', camera.viewMatrix);
        this.renderer.setUniform(program, 'u_projectionMatrix', camera.projectionMatrix);
        
        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        this.elements.forEach(element => {
            if (!element.state.visible) return;
            
            this.renderElement(element, program);
        });
        
        gl.disable(gl.BLEND);
    }

    renderElement(element, program) {
        const renderData = element.getRenderData();
        
        const modelMatrix = mat4.create();
        mat4.fromRotationTranslationScale(modelMatrix, 
                                         renderData.rotation, 
                                         renderData.position, 
                                         renderData.scale);
        
        this.renderer.setUniform(program, 'u_modelMatrix', modelMatrix);
        this.renderer.setUniform(program, 'u_color', renderData.visual.color);
        this.renderer.setUniform(program, 'u_opacity', renderData.visual.opacity);
        this.renderer.setUniform(program, 'u_glowIntensity', renderData.visual.glowIntensity);
        this.renderer.setUniform(program, 'u_glowColor', renderData.visual.hoverColor);
        this.renderer.setUniform(program, 'u_borderWidth', renderData.visual.borderWidth);
        this.renderer.setUniform(program, 'u_size', [renderData.config.width, renderData.config.height]);
        this.renderer.setUniform(program, 'u_elevation', element.currentElevation || 0);
        
        // Render element geometry (quad)
        this.renderElementGeometry(renderData);
        
        // Render effects
        this.renderElementEffects(renderData);
    }

    renderElementGeometry(renderData) {
        // Render a quad with the element's dimensions
        // This would create appropriate vertex data for the element
    }

    renderElementEffects(renderData) {
        // Render ripple effect
        if (renderData.effects.ripple) {
            this.renderRippleEffect(renderData.effects.ripple, renderData.position);
        }
        
        // Render particle effects
        if (renderData.effects.particles) {
            this.renderParticleEffect(renderData.effects.particles, renderData.position);
        }
    }

    renderRippleEffect(ripple, position) {
        // Render expanding circle for ripple effect
    }

    renderParticleEffect(particles, position) {
        // Render particle system for element
    }

    // Utility methods
    createButton(id, text, position, onClick) {
        const button = this.createElement(id, 'button', position, { text: text });
        button.callbacks.onClick = onClick;
        return button;
    }

    createPanel(id, position, size) {
        return this.createElement(id, 'panel', position, { 
            width: size[0], 
            height: size[1] 
        });
    }

    createTooltip(id, text, position) {
        return this.createElement(id, 'tooltip', position, { text: text });
    }

    showHighlight(targetPosition, duration = 3000) {
        const highlightId = `highlight_${Date.now()}`;
        const highlight = this.createElement(highlightId, 'highlight', targetPosition);
        highlight.show();
        
        setTimeout(() => {
            this.removeElement(highlightId);
        }, duration);
        
        return highlightId;
    }

    createGuideArrow(id, fromPosition, toPosition) {
        const guide = this.createElement(id, 'guide', fromPosition);
        const direction = vec3.create();
        vec3.sub(direction, toPosition, fromPosition);
        vec3.normalize(direction, direction);
        guide.arrowDirection = direction;
        return guide;
    }

    getStats() {
        return {
            totalElements: this.elements.size,
            hoveredElement: this.hoveredElement?.id || null,
            focusedElement: this.focusedElement?.id || null,
            visibleElements: Array.from(this.elements.values()).filter(e => e.state.visible).length
        };
    }

    dispose() {
        this.elements.clear();
        this.hoveredElement = null;
        this.focusedElement = null;
    }
}

export { InteractiveElement, InteractiveManager };