/**
 * Character Renderer - Sistema de renderizado de personajes
 * Maneja avatares, animaciones, expresiones y personalización visual
 */

import { vec3, vec4, mat4, quat } from 'gl-matrix';

class CharacterPart {
    constructor(name, type, mesh) {
        this.name = name;
        this.type = type; // 'head', 'body', 'arms', 'legs', 'accessory'
        this.mesh = mesh;
        
        // Transformaciones locales
        this.position = vec3.create();
        this.rotation = quat.create();
        this.scale = vec3.fromValues(1, 1, 1);
        
        // Matriz de transformación
        this.localMatrix = mat4.create();
        this.worldMatrix = mat4.create();
        
        // Propiedades de renderizado
        this.material = null;
        this.visible = true;
        this.layer = 0;
        
        // Propiedades de personalización
        this.color = vec3.fromValues(1, 1, 1);
        this.texture = null;
        this.pattern = null;
        
        // Estado de animación
        this.animationState = {
            currentAnimation: null,
            time: 0,
            blending: false,
            blendWeight: 0
        };
    }

    updateMatrix(parentMatrix = null) {
        mat4.fromRotationTranslationScale(
            this.localMatrix,
            this.rotation,
            this.position,
            this.scale
        );
        
        if (parentMatrix) {
            mat4.multiply(this.worldMatrix, parentMatrix, this.localMatrix);
        } else {
            mat4.copy(this.worldMatrix, this.localMatrix);
        }
    }

    setColor(r, g, b) {
        vec3.set(this.color, r, g, b);
    }

    setTexture(texture) {
        this.texture = texture;
    }

    setVisible(visible) {
        this.visible = visible;
    }
}

class CharacterExpression {
    constructor() {
        // Morphing targets para expresiones faciales
        this.morphTargets = {
            neutral: { weight: 1.0 },
            happy: { weight: 0.0 },
            sad: { weight: 0.0 },
            angry: { weight: 0.0 },
            surprised: { weight: 0.0 },
            confused: { weight: 0.0 },
            excited: { weight: 0.0 },
            sleepy: { weight: 0.0 }
        };
        
        // Animación de expresiones
        this.currentExpression = 'neutral';
        this.targetExpression = 'neutral';
        this.transitionSpeed = 2.0;
        this.blinking = true;
        this.blinkTimer = 0;
        this.nextBlinkTime = 3.0;
        
        // Parámetros de emoción
        this.emotionalState = {
            happiness: 0.5,
            energy: 0.5,
            focus: 0.5
        };
    }

    setExpression(expression, smooth = true) {
        if (smooth) {
            this.targetExpression = expression;
        } else {
            this.currentExpression = expression;
            this.targetExpression = expression;
            this.resetMorphWeights();
            this.morphTargets[expression].weight = 1.0;
        }
    }

    resetMorphWeights() {
        Object.keys(this.morphTargets).forEach(key => {
            this.morphTargets[key].weight = 0.0;
        });
    }

    update(deltaTime) {
        // Transición suave entre expresiones
        if (this.currentExpression !== this.targetExpression) {
            this.transitionToExpression(deltaTime);
        }
        
        // Parpadeo automático
        if (this.blinking) {
            this.updateBlinking(deltaTime);
        }
        
        // Micro-expresiones basadas en estado emocional
        this.updateMicroExpressions(deltaTime);
    }

    transitionToExpression(deltaTime) {
        const transitionFactor = this.transitionSpeed * deltaTime;
        
        // Reducir peso de expresión actual
        if (this.morphTargets[this.currentExpression]) {
            this.morphTargets[this.currentExpression].weight = 
                Math.max(0, this.morphTargets[this.currentExpression].weight - transitionFactor);
        }
        
        // Aumentar peso de expresión objetivo
        if (this.morphTargets[this.targetExpression]) {
            this.morphTargets[this.targetExpression].weight = 
                Math.min(1, this.morphTargets[this.targetExpression].weight + transitionFactor);
        }
        
        // Completar transición
        if (this.morphTargets[this.targetExpression].weight >= 0.99) {
            this.currentExpression = this.targetExpression;
            this.resetMorphWeights();
            this.morphTargets[this.currentExpression].weight = 1.0;
        }
    }

    updateBlinking(deltaTime) {
        this.blinkTimer += deltaTime;
        
        if (this.blinkTimer >= this.nextBlinkTime) {
            // Iniciar parpadeo
            this.performBlink();
            
            // Programar siguiente parpadeo
            this.blinkTimer = 0;
            this.nextBlinkTime = 2.0 + Math.random() * 4.0;
        }
    }

    performBlink() {
        // Animación rápida de parpadeo
        // Se implementaría con keyframes o tweening
        console.log('Blink animation triggered');
    }

    updateMicroExpressions(deltaTime) {
        // Sutiles variaciones basadas en estado emocional
        const time = Date.now() * 0.001;
        
        // Felicidad afecta ligeramente la sonrisa
        if (this.emotionalState.happiness > 0.6) {
            this.morphTargets.happy.weight += Math.sin(time * 0.1) * 0.05;
        }
        
        // Energía afecta la apertura de los ojos
        if (this.emotionalState.energy < 0.4) {
            this.morphTargets.sleepy.weight += 0.1;
        }
    }

    getMorphWeights() {
        const weights = [];
        Object.values(this.morphTargets).forEach(target => {
            weights.push(target.weight);
        });
        return weights;
    }
}

class CharacterAnimation {
    constructor() {
        this.animations = new Map();
        this.currentAnimation = null;
        this.animationTime = 0;
        this.animationSpeed = 1.0;
        this.loop = true;
        
        // Sistema de blending
        this.blendingAnimations = [];
        this.blendDuration = 0.3;
        
        // Estados de animación comunes
        this.createDefaultAnimations();
    }

    createDefaultAnimations() {
        // Animación idle (reposo)
        this.animations.set('idle', {
            duration: 4.0,
            loop: true,
            keyframes: this.generateIdleKeyframes()
        });
        
        // Animación de caminar
        this.animations.set('walk', {
            duration: 1.0,
            loop: true,
            keyframes: this.generateWalkKeyframes()
        });
        
        // Animación de correr
        this.animations.set('run', {
            duration: 0.6,
            loop: true,
            keyframes: this.generateRunKeyframes()
        });
        
        // Animación de saludo
        this.animations.set('wave', {
            duration: 2.0,
            loop: false,
            keyframes: this.generateWaveKeyframes()
        });
        
        // Animación de celebración
        this.animations.set('celebrate', {
            duration: 2.5,
            loop: false,
            keyframes: this.generateCelebrateKeyframes()
        });
        
        // Animación de trabajo
        this.animations.set('work', {
            duration: 3.0,
            loop: true,
            keyframes: this.generateWorkKeyframes()
        });
    }

    generateIdleKeyframes() {
        return [
            { time: 0.0, transforms: this.getIdlePose() },
            { time: 2.0, transforms: this.getIdlePoseVariation1() },
            { time: 4.0, transforms: this.getIdlePose() }
        ];
    }

    generateWalkKeyframes() {
        return [
            { time: 0.0, transforms: this.getWalkPose1() },
            { time: 0.25, transforms: this.getWalkPose2() },
            { time: 0.5, transforms: this.getWalkPose3() },
            { time: 0.75, transforms: this.getWalkPose4() },
            { time: 1.0, transforms: this.getWalkPose1() }
        ];
    }

    generateRunKeyframes() {
        return [
            { time: 0.0, transforms: this.getRunPose1() },
            { time: 0.15, transforms: this.getRunPose2() },
            { time: 0.3, transforms: this.getRunPose3() },
            { time: 0.45, transforms: this.getRunPose4() },
            { time: 0.6, transforms: this.getRunPose1() }
        ];
    }

    generateWaveKeyframes() {
        return [
            { time: 0.0, transforms: this.getIdlePose() },
            { time: 0.5, transforms: this.getWavePose1() },
            { time: 1.0, transforms: this.getWavePose2() },
            { time: 1.5, transforms: this.getWavePose1() },
            { time: 2.0, transforms: this.getIdlePose() }
        ];
    }

    generateCelebrateKeyframes() {
        return [
            { time: 0.0, transforms: this.getIdlePose() },
            { time: 0.3, transforms: this.getCelebratePose1() },
            { time: 0.8, transforms: this.getCelebratePose2() },
            { time: 1.5, transforms: this.getCelebratePose3() },
            { time: 2.0, transforms: this.getCelebratePose2() },
            { time: 2.5, transforms: this.getIdlePose() }
        ];
    }

    generateWorkKeyframes() {
        return [
            { time: 0.0, transforms: this.getWorkPose1() },
            { time: 1.0, transforms: this.getWorkPose2() },
            { time: 2.0, transforms: this.getWorkPose3() },
            { time: 3.0, transforms: this.getWorkPose1() }
        ];
    }

    // Poses específicas (se implementarían con datos reales de huesos)
    getIdlePose() {
        return {
            spine: { rotation: quat.create() },
            head: { rotation: quat.create() },
            leftArm: { rotation: quat.fromEuler(quat.create(), 0, 0, -10) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 0, 0, 10) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    getIdlePoseVariation1() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 0, 2, 0) },
            head: { rotation: quat.fromEuler(quat.create(), 0, -2, 0) },
            leftArm: { rotation: quat.fromEuler(quat.create(), 0, 0, -12) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 0, 0, 8) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    getWalkPose1() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 0, 0, 0) },
            head: { rotation: quat.create() },
            leftArm: { rotation: quat.fromEuler(quat.create(), 30, 0, -10) },
            rightArm: { rotation: quat.fromEuler(quat.create(), -30, 0, 10) },
            leftLeg: { rotation: quat.fromEuler(quat.create(), 20, 0, 0) },
            rightLeg: { rotation: quat.fromEuler(quat.create(), -20, 0, 0) }
        };
    }

    getWalkPose2() {
        return {
            spine: { rotation: quat.create() },
            head: { rotation: quat.create() },
            leftArm: { rotation: quat.fromEuler(quat.create(), 0, 0, -10) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 0, 0, 10) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    getWalkPose3() {
        return {
            spine: { rotation: quat.create() },
            head: { rotation: quat.create() },
            leftArm: { rotation: quat.fromEuler(quat.create(), -30, 0, -10) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 30, 0, 10) },
            leftLeg: { rotation: quat.fromEuler(quat.create(), -20, 0, 0) },
            rightLeg: { rotation: quat.fromEuler(quat.create(), 20, 0, 0) }
        };
    }

    getWalkPose4() {
        return this.getWalkPose2();
    }

    getRunPose1() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 5, 0, 0) },
            head: { rotation: quat.create() },
            leftArm: { rotation: quat.fromEuler(quat.create(), 60, 0, -20) },
            rightArm: { rotation: quat.fromEuler(quat.create(), -60, 0, 20) },
            leftLeg: { rotation: quat.fromEuler(quat.create(), 40, 0, 0) },
            rightLeg: { rotation: quat.fromEuler(quat.create(), -40, 0, 0) }
        };
    }

    getRunPose2() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 8, 0, 0) },
            head: { rotation: quat.create() },
            leftArm: { rotation: quat.fromEuler(quat.create(), 20, 0, -15) },
            rightArm: { rotation: quat.fromEuler(quat.create(), -20, 0, 15) },
            leftLeg: { rotation: quat.fromEuler(quat.create(), 10, 0, 0) },
            rightLeg: { rotation: quat.fromEuler(quat.create(), -10, 0, 0) }
        };
    }

    getRunPose3() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 5, 0, 0) },
            head: { rotation: quat.create() },
            leftArm: { rotation: quat.fromEuler(quat.create(), -60, 0, -20) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 60, 0, 20) },
            leftLeg: { rotation: quat.fromEuler(quat.create(), -40, 0, 0) },
            rightLeg: { rotation: quat.fromEuler(quat.create(), 40, 0, 0) }
        };
    }

    getRunPose4() {
        return this.getRunPose2();
    }

    getWavePose1() {
        return {
            spine: { rotation: quat.create() },
            head: { rotation: quat.fromEuler(quat.create(), 0, 15, 0) },
            leftArm: { rotation: quat.fromEuler(quat.create(), 0, 0, -10) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 0, 45, 120) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    getWavePose2() {
        return {
            spine: { rotation: quat.create() },
            head: { rotation: quat.fromEuler(quat.create(), 0, 15, 0) },
            leftArm: { rotation: quat.fromEuler(quat.create(), 0, 0, -10) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 0, 30, 100) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    getCelebratePose1() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), -5, 0, 0) },
            head: { rotation: quat.fromEuler(quat.create(), -10, 0, 0) },
            leftArm: { rotation: quat.fromEuler(quat.create(), 0, -30, 150) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 0, 30, 150) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    getCelebratePose2() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 0, 0, 0) },
            head: { rotation: quat.create() },
            leftArm: { rotation: quat.fromEuler(quat.create(), 0, -20, 120) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 0, 20, 120) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    getCelebratePose3() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 5, 0, 0) },
            head: { rotation: quat.fromEuler(quat.create(), 10, 0, 0) },
            leftArm: { rotation: quat.fromEuler(quat.create(), 0, -40, 160) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 0, 40, 160) },
            leftLeg: { rotation: quat.fromEuler(quat.create(), 0, 0, 5) },
            rightLeg: { rotation: quat.fromEuler(quat.create(), 0, 0, -5) }
        };
    }

    getWorkPose1() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 10, 0, 0) },
            head: { rotation: quat.fromEuler(quat.create(), 20, 0, 0) },
            leftArm: { rotation: quat.fromEuler(quat.create(), 45, -20, -30) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 45, 20, -30) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    getWorkPose2() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 15, 5, 0) },
            head: { rotation: quat.fromEuler(quat.create(), 25, 5, 0) },
            leftArm: { rotation: quat.fromEuler(quat.create(), 50, -25, -35) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 40, 15, -25) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    getWorkPose3() {
        return {
            spine: { rotation: quat.fromEuler(quat.create(), 12, -3, 0) },
            head: { rotation: quat.fromEuler(quat.create(), 22, -3, 0) },
            leftArm: { rotation: quat.fromEuler(quat.create(), 42, -18, -32) },
            rightArm: { rotation: quat.fromEuler(quat.create(), 48, 22, -32) },
            leftLeg: { rotation: quat.create() },
            rightLeg: { rotation: quat.create() }
        };
    }

    playAnimation(name, blendTime = 0.3) {
        const animation = this.animations.get(name);
        if (!animation) {
            console.warn(`Animation '${name}' not found`);
            return;
        }
        
        if (this.currentAnimation && blendTime > 0) {
            // Iniciar blending
            this.startBlending(animation, blendTime);
        } else {
            // Cambio directo
            this.currentAnimation = animation;
            this.animationTime = 0;
        }
    }

    startBlending(newAnimation, blendTime) {
        this.blendingAnimations.push({
            from: this.currentAnimation,
            to: newAnimation,
            duration: blendTime,
            currentTime: 0
        });
        
        this.currentAnimation = newAnimation;
        this.animationTime = 0;
    }

    update(deltaTime) {
        if (!this.currentAnimation) return;
        
        this.animationTime += deltaTime * this.animationSpeed;
        
        // Manejar loop
        if (this.animationTime >= this.currentAnimation.duration) {
            if (this.currentAnimation.loop) {
                this.animationTime = 0;
            } else {
                this.animationTime = this.currentAnimation.duration;
            }
        }
        
        // Actualizar blending
        this.updateBlending(deltaTime);
    }

    updateBlending(deltaTime) {
        this.blendingAnimations = this.blendingAnimations.filter(blend => {
            blend.currentTime += deltaTime;
            return blend.currentTime < blend.duration;
        });
    }

    getCurrentPose() {
        if (!this.currentAnimation) return this.getIdlePose();
        
        const keyframes = this.currentAnimation.keyframes;
        const time = this.animationTime;
        
        // Encontrar keyframes para interpolar
        let keyframe1 = keyframes[0];
        let keyframe2 = keyframes[keyframes.length - 1];
        
        for (let i = 0; i < keyframes.length - 1; i++) {
            if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
                keyframe1 = keyframes[i];
                keyframe2 = keyframes[i + 1];
                break;
            }
        }
        
        // Interpolar entre keyframes
        const t = (time - keyframe1.time) / (keyframe2.time - keyframe1.time);
        return this.interpolatePoses(keyframe1.transforms, keyframe2.transforms, t);
    }

    interpolatePoses(pose1, pose2, t) {
        const result = {};
        
        Object.keys(pose1).forEach(boneName => {
            result[boneName] = {
                rotation: quat.create()
            };
            
            quat.slerp(result[boneName].rotation, 
                      pose1[boneName].rotation, 
                      pose2[boneName].rotation, t);
        });
        
        return result;
    }
}

class Character {
    constructor(config = {}) {
        this.id = config.id || `character_${Date.now()}`;
        this.name = config.name || 'Character';
        this.type = config.type || 'citizen'; // citizen, worker, leader, visitor
        
        // Posición y orientación en el mundo
        this.position = vec3.fromValues(0, 0, 0);
        this.rotation = quat.create();
        this.scale = vec3.fromValues(1, 1, 1);
        
        // Partes del personaje
        this.parts = new Map();
        
        // Sistemas de personalización
        this.appearance = {
            skinColor: vec3.fromValues(0.8, 0.6, 0.4),
            hairColor: vec3.fromValues(0.2, 0.1, 0.05),
            eyeColor: vec3.fromValues(0.1, 0.3, 0.8),
            height: 1.0,
            build: 'average' // slim, average, heavy
        };
        
        // Vestimenta y accesorios
        this.clothing = {
            head: null,
            torso: 'shirt',
            legs: 'pants',
            feet: 'shoes',
            accessories: []
        };
        
        // Sistemas de comportamiento
        this.expression = new CharacterExpression();
        this.animation = new CharacterAnimation();
        
        // Estado del personaje
        this.state = {
            health: 1.0,
            mood: 0.7,
            energy: 0.8,
            activity: 'idle',
            destination: null,
            speed: 2.0
        };
        
        // Efectos especiales
        this.effects = [];
        this.aura = null;
        
        this.generateCharacter(config);
    }

    generateCharacter(config) {
        // Aplicar configuración personalizada
        if (config.appearance) {
            Object.assign(this.appearance, config.appearance);
        }
        
        if (config.clothing) {
            Object.assign(this.clothing, config.clothing);
        }
        
        // Generar partes básicas del personaje
        this.createBasicParts();
        
        // Aplicar personalización visual
        this.applyAppearance();
        
        // Configurar animación inicial
        this.animation.playAnimation('idle');
    }

    createBasicParts() {
        // Crear partes principales (se reemplazarían con mallas reales)
        this.parts.set('head', new CharacterPart('head', 'head', null));
        this.parts.set('body', new CharacterPart('body', 'body', null));
        this.parts.set('leftArm', new CharacterPart('leftArm', 'arms', null));
        this.parts.set('rightArm', new CharacterPart('rightArm', 'arms', null));
        this.parts.set('leftLeg', new CharacterPart('leftLeg', 'legs', null));
        this.parts.set('rightLeg', new CharacterPart('rightLeg', 'legs', null));
        
        // Configurar jerarquía (posiciones relativas)
        this.setupPartHierarchy();
    }

    setupPartHierarchy() {
        // Configurar posiciones base de las partes
        const head = this.parts.get('head');
        const body = this.parts.get('body');
        const leftArm = this.parts.get('leftArm');
        const rightArm = this.parts.get('rightArm');
        const leftLeg = this.parts.get('leftLeg');
        const rightLeg = this.parts.get('rightLeg');
        
        if (head) vec3.set(head.position, 0, 1.7, 0);
        if (body) vec3.set(body.position, 0, 1.0, 0);
        if (leftArm) vec3.set(leftArm.position, -0.7, 1.4, 0);
        if (rightArm) vec3.set(rightArm.position, 0.7, 1.4, 0);
        if (leftLeg) vec3.set(leftLeg.position, -0.3, 0, 0);
        if (rightLeg) vec3.set(rightLeg.position, 0.3, 0, 0);
    }

    applyAppearance() {
        // Aplicar colores de piel a partes relevantes
        const skinParts = ['head', 'leftArm', 'rightArm'];
        skinParts.forEach(partName => {
            const part = this.parts.get(partName);
            if (part) {
                vec3.copy(part.color, this.appearance.skinColor);
            }
        });
        
        // Aplicar escala según altura
        vec3.set(this.scale, 
                this.appearance.height, 
                this.appearance.height, 
                this.appearance.height);
    }

    setPosition(x, y, z) {
        vec3.set(this.position, x, y, z);
    }

    setRotation(x, y, z, w) {
        quat.set(this.rotation, x, y, z, w);
    }

    playAnimation(animationName, blendTime = 0.3) {
        this.animation.playAnimation(animationName, blendTime);
        this.state.activity = animationName;
    }

    setExpression(expression, smooth = true) {
        this.expression.setExpression(expression, smooth);
    }

    setMood(mood) {
        this.state.mood = Math.max(0, Math.min(1, mood));
        
        // Ajustar expresión basada en humor
        if (mood > 0.7) {
            this.setExpression('happy');
        } else if (mood < 0.3) {
            this.setExpression('sad');
        } else {
            this.setExpression('neutral');
        }
        
        // Actualizar estado emocional
        this.expression.emotionalState.happiness = mood;
    }

    addClothing(slot, item) {
        this.clothing[slot] = item;
        
        // Crear parte visual para la ropa
        if (item) {
            const clothingPart = new CharacterPart(`clothing_${slot}`, 'accessory', null);
            clothingPart.layer = 1; // Renderizar sobre el cuerpo
            this.parts.set(`clothing_${slot}`, clothingPart);
        }
    }

    removeClothing(slot) {
        this.clothing[slot] = null;
        this.parts.delete(`clothing_${slot}`);
    }

    addEffect(effectType, config = {}) {
        const effect = {
            type: effectType,
            startTime: Date.now(),
            duration: config.duration || 5000,
            ...config
        };
        
        this.effects.push(effect);
    }

    moveTo(destination, speed = null) {
        this.state.destination = vec3.clone(destination);
        if (speed) this.state.speed = speed;
        
        // Iniciar animación de caminar
        this.playAnimation('walk');
    }

    update(deltaTime) {
        // Actualizar sistemas de animación
        this.animation.update(deltaTime);
        this.expression.update(deltaTime);
        
        // Actualizar movimiento
        this.updateMovement(deltaTime);
        
        // Actualizar transformaciones de partes
        this.updatePartTransforms();
        
        // Actualizar efectos
        this.updateEffects(deltaTime);
        
        // Actualizar estado basado en actividad
        this.updateState(deltaTime);
    }

    updateMovement(deltaTime) {
        if (!this.state.destination) return;
        
        const direction = vec3.create();
        vec3.sub(direction, this.state.destination, this.position);
        const distance = vec3.length(direction);
        
        if (distance < 0.1) {
            // Llegamos al destino
            this.state.destination = null;
            this.playAnimation('idle');
            return;
        }
        
        // Moverse hacia el destino
        vec3.normalize(direction, direction);
        vec3.scaleAndAdd(this.position, this.position, direction, this.state.speed * deltaTime);
        
        // Rotar hacia la dirección de movimiento
        const targetRotation = quat.create();
        const angle = Math.atan2(direction[0], direction[2]);
        quat.fromEuler(targetRotation, 0, angle * 180 / Math.PI, 0);
        quat.slerp(this.rotation, this.rotation, targetRotation, deltaTime * 5);
    }

    updatePartTransforms() {
        // Obtener pose actual de la animación
        const currentPose = this.animation.getCurrentPose();
        
        // Aplicar transformaciones a cada parte
        this.parts.forEach((part, name) => {
            if (currentPose[name]) {
                quat.copy(part.rotation, currentPose[name].rotation);
            }
            
            // Aplicar transformación global del personaje
            const globalMatrix = mat4.create();
            mat4.fromRotationTranslationScale(globalMatrix, this.rotation, this.position, this.scale);
            
            part.updateMatrix(globalMatrix);
        });
    }

    updateEffects(deltaTime) {
        const currentTime = Date.now();
        
        // Filtrar efectos expirados
        this.effects = this.effects.filter(effect => {
            const elapsed = currentTime - effect.startTime;
            return elapsed < effect.duration;
        });
        
        // Actualizar efectos activos
        this.effects.forEach(effect => {
            this.updateEffect(effect, deltaTime);
        });
    }

    updateEffect(effect, deltaTime) {
        const progress = (Date.now() - effect.startTime) / effect.duration;
        
        switch (effect.type) {
            case 'glow':
                this.updateGlowEffect(effect, progress);
                break;
            case 'sparkle':
                this.updateSparkleEffect(effect, progress);
                break;
            case 'heal':
                this.updateHealEffect(effect, progress);
                break;
            case 'damage':
                this.updateDamageEffect(effect, progress);
                break;
        }
    }

    updateGlowEffect(effect, progress) {
        const intensity = Math.sin(progress * Math.PI) * effect.intensity;
        effect.currentIntensity = intensity;
    }

    updateSparkleEffect(effect, progress) {
        // Efectos de brillos/partículas alrededor del personaje
        effect.sparkleIntensity = (1 - progress) * effect.intensity;
    }

    updateHealEffect(effect, progress) {
        // Efecto de curación con partículas verdes
        const healAmount = effect.amount * Math.sin(progress * Math.PI);
        this.state.health = Math.min(1, this.state.health + healAmount * 0.01);
    }

    updateDamageEffect(effect, progress) {
        // Efecto de daño con flash rojo
        const flashIntensity = Math.sin(progress * Math.PI * 10) * (1 - progress);
        effect.flashIntensity = flashIntensity;
    }

    updateState(deltaTime) {
        // Recuperación gradual de energía
        if (this.state.activity === 'idle') {
            this.state.energy = Math.min(1, this.state.energy + deltaTime * 0.1);
        } else {
            this.state.energy = Math.max(0, this.state.energy - deltaTime * 0.05);
        }
        
        // Ajustar mood basado en salud y energía
        const targetMood = (this.state.health + this.state.energy) * 0.5;
        this.state.mood += (targetMood - this.state.mood) * deltaTime * 0.2;
    }

    getRenderData() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            position: this.position,
            rotation: this.rotation,
            scale: this.scale,
            parts: Array.from(this.parts.values()).map(part => ({
                name: part.name,
                type: part.type,
                worldMatrix: part.worldMatrix,
                color: part.color,
                texture: part.texture,
                visible: part.visible,
                layer: part.layer
            })),
            appearance: this.appearance,
            clothing: this.clothing,
            morphWeights: this.expression.getMorphWeights(),
            effects: this.effects,
            state: this.state
        };
    }
}

class CharacterRenderer {
    constructor(renderer, materialSystem) {
        this.renderer = renderer;
        this.materialSystem = materialSystem;
        
        // Colección de personajes
        this.characters = new Map();
        this.characterTypes = new Map();
        
        // Materiales para personajes
        this.characterMaterials = new Map();
        
        // Sistema de LOD
        this.lodSystem = {
            enabled: true,
            distances: [10, 25, 50], // Distancias para diferentes niveles de detalle
            maxCharactersHigh: 20,
            maxCharactersMedium: 50,
            maxCharactersLow: 100
        };
        
        // Configuración de renderizado
        this.enableExpressions = true;
        this.enableClothing = true;
        this.enableEffects = true;
        this.enableShadows = true;
        
        // Shaders especializados
        this.characterShader = null;
        this.skinShader = null;
        this.clothingShader = null;
        
        // Buffers para instanced rendering
        this.instancedData = new Float32Array(1000 * 16); // Matriz por instancia
        this.instancedColors = new Float32Array(1000 * 4); // Color por instancia
        
        // Estadísticas
        this.stats = {
            totalCharacters: 0,
            visibleCharacters: 0,
            renderCalls: 0,
            lodHigh: 0,
            lodMedium: 0,
            lodLow: 0
        };
        
        this.init();
    }

    init() {
        this.createCharacterShaders();
        this.createCharacterMaterials();
        this.setupCharacterTypes();
        
        console.log('Character Renderer inicializado');
    }

    createCharacterShaders() {
        // Shader para personajes con expresiones y animaciones
        const characterVertexShader = `
            attribute vec3 a_position;
            attribute vec3 a_normal;
            attribute vec2 a_texCoord;
            attribute vec4 a_skinIndices;
            attribute vec4 a_skinWeights;
            
            // Matrices de huesos para animación
            uniform mat4 u_boneMatrices[64];
            uniform mat4 u_modelMatrix;
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform mat3 u_normalMatrix;
            
            // Morph targets para expresiones
            uniform float u_morphWeights[16];
            attribute vec3 a_morphTarget0;
            attribute vec3 a_morphTarget1;
            attribute vec3 a_morphNormal0;
            attribute vec3 a_morphNormal1;
            
            varying vec3 v_worldPos;
            varying vec3 v_normal;
            varying vec2 v_texCoord;
            varying vec4 v_color;
            
            void main() {
                vec3 position = a_position;
                vec3 normal = a_normal;
                
                // Aplicar morph targets
                position += a_morphTarget0 * u_morphWeights[0];
                position += a_morphTarget1 * u_morphWeights[1];
                normal += a_morphNormal0 * u_morphWeights[0];
                normal += a_morphNormal1 * u_morphWeights[1];
                
                // Aplicar skinning
                mat4 skinMatrix = a_skinWeights.x * u_boneMatrices[int(a_skinIndices.x)] +
                                 a_skinWeights.y * u_boneMatrices[int(a_skinIndices.y)] +
                                 a_skinWeights.z * u_boneMatrices[int(a_skinIndices.z)] +
                                 a_skinWeights.w * u_boneMatrices[int(a_skinIndices.w)];
                
                vec4 skinnedPosition = skinMatrix * vec4(position, 1.0);
                vec4 skinnedNormal = skinMatrix * vec4(normal, 0.0);
                
                vec4 worldPos = u_modelMatrix * skinnedPosition;
                v_worldPos = worldPos.xyz;
                v_normal = normalize(u_normalMatrix * skinnedNormal.xyz);
                v_texCoord = a_texCoord;
                
                gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
            }
        `;
        
        const characterFragmentShader = `
            precision mediump float;
            
            uniform vec3 u_lightDirection;
            uniform vec3 u_lightColor;
            uniform vec3 u_ambientColor;
            uniform vec3 u_characterColor;
            uniform sampler2D u_skinTexture;
            uniform sampler2D u_clothingTexture;
            uniform float u_clothingMask;
            
            // Efectos especiales
            uniform float u_glowIntensity;
            uniform vec3 u_glowColor;
            uniform float u_flashIntensity;
            
            varying vec3 v_worldPos;
            varying vec3 v_normal;
            varying vec2 v_texCoord;
            
            void main() {
                vec3 normal = normalize(v_normal);
                float NdotL = max(dot(normal, -u_lightDirection), 0.0);
                
                // Color base (piel o ropa)
                vec3 skinColor = texture2D(u_skinTexture, v_texCoord).rgb * u_characterColor;
                vec3 clothingColor = texture2D(u_clothingTexture, v_texCoord).rgb;
                vec3 baseColor = mix(skinColor, clothingColor, u_clothingMask);
                
                // Iluminación básica
                vec3 lighting = u_ambientColor + (u_lightColor * NdotL);
                vec3 color = baseColor * lighting;
                
                // Efectos especiales
                color += u_glowColor * u_glowIntensity;
                color = mix(color, vec3(1.0, 0.2, 0.2), u_flashIntensity);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        this.characterShader = this.renderer.createProgram('character', 
                                                          characterVertexShader, 
                                                          characterFragmentShader);
    }

    createCharacterMaterials() {
        // Material base para piel
        const skinMaterial = this.materialSystem.createMaterial('character_skin', 'pbr');
        skinMaterial.setAlbedo(0.8, 0.6, 0.4);
        skinMaterial.setMetallic(0.0);
        skinMaterial.setRoughness(0.8);
        this.characterMaterials.set('skin', skinMaterial);
        
        // Materiales para diferentes tipos de ropa
        const shirtMaterial = this.materialSystem.createMaterial('character_shirt', 'pbr');
        shirtMaterial.setAlbedo(0.2, 0.4, 0.8);
        shirtMaterial.setMetallic(0.0);
        shirtMaterial.setRoughness(0.9);
        this.characterMaterials.set('shirt', shirtMaterial);
        
        const pantsMaterial = this.materialSystem.createMaterial('character_pants', 'pbr');
        pantsMaterial.setAlbedo(0.1, 0.1, 0.3);
        pantsMaterial.setMetallic(0.0);
        pantsMaterial.setRoughness(0.8);
        this.characterMaterials.set('pants', pantsMaterial);
        
        const shoesMaterial = this.materialSystem.createMaterial('character_shoes', 'pbr');
        shoesMaterial.setAlbedo(0.2, 0.1, 0.05);
        shoesMaterial.setMetallic(0.0);
        shoesMaterial.setRoughness(0.6);
        this.characterMaterials.set('shoes', shoesMaterial);
    }

    setupCharacterTypes() {
        // Configuraciones para diferentes tipos de personajes
        this.characterTypes.set('citizen', {
            defaultClothing: {
                torso: 'shirt',
                legs: 'pants',
                feet: 'shoes'
            },
            colorVariations: [
                { skin: [0.9, 0.7, 0.5], hair: [0.2, 0.1, 0.05] },
                { skin: [0.7, 0.5, 0.3], hair: [0.1, 0.05, 0.02] },
                { skin: [0.8, 0.6, 0.4], hair: [0.8, 0.6, 0.2] }
            ],
            animations: ['idle', 'walk', 'work', 'wave']
        });
        
        this.characterTypes.set('worker', {
            defaultClothing: {
                head: 'hard_hat',
                torso: 'work_shirt',
                legs: 'work_pants',
                feet: 'work_boots'
            },
            colorVariations: [
                { skin: [0.8, 0.6, 0.4], hair: [0.3, 0.2, 0.1] }
            ],
            animations: ['idle', 'walk', 'work', 'celebrate']
        });
        
        this.characterTypes.set('leader', {
            defaultClothing: {
                torso: 'suit',
                legs: 'dress_pants',
                feet: 'dress_shoes'
            },
            colorVariations: [
                { skin: [0.8, 0.6, 0.4], hair: [0.4, 0.3, 0.2] }
            ],
            animations: ['idle', 'walk', 'wave', 'celebrate'],
            aura: { color: [0.2, 0.6, 1.0], intensity: 0.3 }
        });
    }

    createCharacter(type, position, config = {}) {
        const characterConfig = this.characterTypes.get(type) || this.characterTypes.get('citizen');
        
        // Generar configuración aleatoria basada en el tipo
        const appearance = this.generateRandomAppearance(characterConfig);
        const clothing = { ...characterConfig.defaultClothing };
        
        // Aplicar configuración personalizada
        if (config.appearance) Object.assign(appearance, config.appearance);
        if (config.clothing) Object.assign(clothing, config.clothing);
        
        const character = new Character({
            type: type,
            appearance: appearance,
            clothing: clothing,
            ...config
        });
        
        character.setPosition(position[0], position[1], position[2]);
        
        // Agregar aura si el tipo la tiene
        if (characterConfig.aura) {
            character.aura = { ...characterConfig.aura };
        }
        
        this.characters.set(character.id, character);
        this.stats.totalCharacters++;
        
        return character.id;
    }

    generateRandomAppearance(characterConfig) {
        const variation = characterConfig.colorVariations[
            Math.floor(Math.random() * characterConfig.colorVariations.length)
        ];
        
        return {
            skinColor: vec3.fromValues(...variation.skin),
            hairColor: vec3.fromValues(...variation.hair),
            eyeColor: vec3.fromValues(
                Math.random() * 0.5,
                Math.random() * 0.5 + 0.2,
                Math.random() * 0.8 + 0.2
            ),
            height: 0.9 + Math.random() * 0.2,
            build: ['slim', 'average', 'heavy'][Math.floor(Math.random() * 3)]
        };
    }

    getCharacter(id) {
        return this.characters.get(id);
    }

    removeCharacter(id) {
        if (this.characters.delete(id)) {
            this.stats.totalCharacters--;
        }
    }

    update(deltaTime) {
        // Actualizar todos los personajes
        this.characters.forEach(character => {
            character.update(deltaTime);
        });
        
        // Actualizar estadísticas
        this.updateStats();
    }

    updateStats() {
        this.stats.visibleCharacters = 0;
        this.stats.lodHigh = 0;
        this.stats.lodMedium = 0;
        this.stats.lodLow = 0;
        
        // Se actualizarían durante el renderizado
    }

    render(camera) {
        this.stats.renderCalls = 0;
        this.stats.visibleCharacters = 0;
        
        if (this.characters.size === 0) return;
        
        // Agrupar personajes por LOD y material
        const renderGroups = this.groupCharactersForRendering(camera);
        
        // Renderizar cada grupo
        renderGroups.forEach(group => {
            this.renderCharacterGroup(group, camera);
        });
    }

    groupCharactersForRendering(camera) {
        const groups = new Map();
        
        this.characters.forEach(character => {
            const distance = vec3.distance(character.position, camera.position);
            const lodLevel = this.calculateLOD(distance);
            
            if (lodLevel === -1) return; // Fuera de rango de renderizado
            
            const renderData = character.getRenderData();
            const groupKey = `${character.type}_${lodLevel}`;
            
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    lodLevel: lodLevel,
                    type: character.type,
                    characters: []
                });
            }
            
            groups.get(groupKey).characters.push({
                character: character,
                renderData: renderData,
                distance: distance
            });
            
            this.stats.visibleCharacters++;
        });
        
        return Array.from(groups.values());
    }

    calculateLOD(distance) {
        const distances = this.lodSystem.distances;
        
        if (distance <= distances[0]) return 2; // Alto detalle
        if (distance <= distances[1]) return 1; // Detalle medio
        if (distance <= distances[2]) return 0; // Bajo detalle
        
        return -1; // No renderizar
    }

    renderCharacterGroup(group, camera) {
        const gl = this.renderer.gl;
        
        // Configurar shader y material según LOD
        const program = this.renderer.useProgram('character');
        
        // Configurar uniforms globales
        this.renderer.setUniform(program, 'u_viewMatrix', camera.viewMatrix);
        this.renderer.setUniform(program, 'u_projectionMatrix', camera.projectionMatrix);
        
        // Renderizar cada personaje del grupo
        group.characters.forEach(item => {
            this.renderSingleCharacter(item.character, item.renderData, program, group.lodLevel);
        });
        
        this.stats.renderCalls += group.characters.length;
        
        // Actualizar estadísticas de LOD
        switch (group.lodLevel) {
            case 2: this.stats.lodHigh += group.characters.length; break;
            case 1: this.stats.lodMedium += group.characters.length; break;
            case 0: this.stats.lodLow += group.characters.length; break;
        }
    }

    renderSingleCharacter(character, renderData, program, lodLevel) {
        // Configurar transformación del personaje
        const modelMatrix = mat4.create();
        mat4.fromRotationTranslationScale(modelMatrix, 
                                         renderData.rotation, 
                                         renderData.position, 
                                         renderData.scale);
        
        this.renderer.setUniform(program, 'u_modelMatrix', modelMatrix);
        this.renderer.setUniform(program, 'u_characterColor', renderData.appearance.skinColor);
        
        // Configurar morph weights para expresiones
        if (this.enableExpressions && lodLevel >= 1) {
            this.renderer.setUniform(program, 'u_morphWeights', renderData.morphWeights);
        }
        
        // Configurar efectos especiales
        if (this.enableEffects) {
            this.setupCharacterEffects(program, renderData.effects);
        }
        
        // Renderizar partes del personaje según LOD
        renderData.parts.forEach(part => {
            if (!part.visible) return;
            
            // Simplificar para LOD bajo
            if (lodLevel === 0 && part.type === 'accessory') return;
            
            this.renderCharacterPart(part, program);
        });
        
        // Renderizar aura si existe
        if (character.aura && lodLevel >= 1) {
            this.renderCharacterAura(character, renderData);
        }
    }

    setupCharacterEffects(program, effects) {
        let glowIntensity = 0;
        let glowColor = vec3.fromValues(0, 0, 0);
        let flashIntensity = 0;
        
        effects.forEach(effect => {
            switch (effect.type) {
                case 'glow':
                    glowIntensity = Math.max(glowIntensity, effect.currentIntensity || 0);
                    if (effect.color) vec3.copy(glowColor, effect.color);
                    break;
                case 'damage':
                    flashIntensity = Math.max(flashIntensity, effect.flashIntensity || 0);
                    break;
            }
        });
        
        this.renderer.setUniform(program, 'u_glowIntensity', glowIntensity);
        this.renderer.setUniform(program, 'u_glowColor', glowColor);
        this.renderer.setUniform(program, 'u_flashIntensity', flashIntensity);
    }

    renderCharacterPart(part, program) {
        // Configurar material específico de la parte
        const material = this.getMaterialForPart(part);
        if (material) {
            // Aplicar material (texturas, colores, etc.)
        }
        
        // Configurar matriz de transformación de la parte
        this.renderer.setUniform(program, 'u_modelMatrix', part.worldMatrix);
        
        // Renderizar geometría de la parte
        // En una implementación real, esto renderizaría la malla 3D
    }

    getMaterialForPart(part) {
        // Mapear tipo de parte a material correspondiente
        const materialMap = {
            'head': 'skin',
            'body': 'skin',
            'arms': 'skin',
            'legs': 'skin'
        };
        
        const materialName = materialMap[part.type] || 'skin';
        return this.characterMaterials.get(materialName);
    }

    renderCharacterAura(character, renderData) {
        // Renderizar aura/efecto especial alrededor del personaje
        // Se implementaría como efecto de partículas o glow
    }

    // Métodos de utilidad
    getCharactersByType(type) {
        return Array.from(this.characters.values()).filter(char => char.type === type);
    }

    getCharactersInRadius(center, radius) {
        return Array.from(this.characters.values()).filter(char => {
            const distance = vec3.distance(char.position, center);
            return distance <= radius;
        });
    }

    setLODDistances(high, medium, low) {
        this.lodSystem.distances = [high, medium, low];
    }

    enableFeature(feature, enabled) {
        switch (feature) {
            case 'expressions': this.enableExpressions = enabled; break;
            case 'clothing': this.enableClothing = enabled; break;
            case 'effects': this.enableEffects = enabled; break;
            case 'shadows': this.enableShadows = enabled; break;
        }
    }

    getStats() {
        return { ...this.stats };
    }

    dispose() {
        this.characters.clear();
        this.characterMaterials.clear();
        this.characterTypes.clear();
        
        this.stats.totalCharacters = 0;
        
        console.log('Character Renderer limpiado');
    }
}

export { CharacterPart, CharacterExpression, CharacterAnimation, Character, CharacterRenderer };