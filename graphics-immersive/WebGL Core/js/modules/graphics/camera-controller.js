/**
 * Camera Controller - Sistema de control de cámaras
 * Maneja diferentes tipos de cámaras y controles
 */

import { mat4, vec3, quat } from 'gl-matrix';

class Camera {
    constructor(type = 'perspective') {
        this.type = type;
        
        // Posición y orientación
        this.position = vec3.fromValues(0, 0, 5);
        this.target = vec3.fromValues(0, 0, 0);
        this.up = vec3.fromValues(0, 1, 0);
        
        // Matrices
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
        this.viewProjectionMatrix = mat4.create();
        
        // Parámetros de perspectiva
        this.fov = 45;
        this.aspect = 1;
        this.nearPlane = 0.1;
        this.farPlane = 1000;
        
        // Parámetros ortográficos
        this.left = -10;
        this.right = 10;
        this.bottom = -10;
        this.top = 10;
        
        // Rotación
        this.yaw = 0;
        this.pitch = 0;
        this.roll = 0;
        
        // Configuración
        this.movementSpeed = 5.0;
        this.rotationSpeed = 0.5;
        this.zoomSpeed = 1.0;
        
        this.needsUpdate = true;
    }

    updateViewMatrix() {
        if (this.needsUpdate) {
            mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
            this.updateViewProjectionMatrix();
            this.needsUpdate = false;
        }
    }

    updateProjectionMatrix() {
        if (this.type === 'perspective') {
            mat4.perspective(this.projectionMatrix, 
                           this.fov * Math.PI / 180, 
                           this.aspect, 
                           this.nearPlane, 
                           this.farPlane);
        } else {
            mat4.ortho(this.projectionMatrix, 
                      this.left, this.right, 
                      this.bottom, this.top, 
                      this.nearPlane, this.farPlane);
        }
        this.updateViewProjectionMatrix();
    }

    updateViewProjectionMatrix() {
        mat4.multiply(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);
    }

    setPosition(x, y, z) {
        vec3.set(this.position, x, y, z);
        this.needsUpdate = true;
    }

    setTarget(x, y, z) {
        vec3.set(this.target, x, y, z);
        this.needsUpdate = true;
    }

    lookAt(target) {
        vec3.copy(this.target, target);
        this.needsUpdate = true;
    }

    setPerspective(fov, aspect, near, far) {
        this.fov = fov;
        this.aspect = aspect;
        this.nearPlane = near;
        this.farPlane = far;
        this.updateProjectionMatrix();
    }

    setOrthographic(left, right, bottom, top, near, far) {
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
        this.nearPlane = near;
        this.farPlane = far;
        this.updateProjectionMatrix();
    }

    getForwardVector() {
        const forward = vec3.create();
        vec3.sub(forward, this.target, this.position);
        vec3.normalize(forward, forward);
        return forward;
    }

    getRightVector() {
        const forward = this.getForwardVector();
        const right = vec3.create();
        vec3.cross(right, forward, this.up);
        vec3.normalize(right, right);
        return right;
    }

    getUpVector() {
        const forward = this.getForwardVector();
        const right = this.getRightVector();
        const up = vec3.create();
        vec3.cross(up, right, forward);
        vec3.normalize(up, up);
        return up;
    }

    screenToWorldRay(x, y, screenWidth, screenHeight) {
        // Convertir coordenadas de pantalla a NDC
        const ndcX = (2 * x / screenWidth) - 1;
        const ndcY = 1 - (2 * y / screenHeight);
        
        // Punto cercano y lejano en NDC
        const nearPoint = vec3.fromValues(ndcX, ndcY, -1);
        const farPoint = vec3.fromValues(ndcX, ndcY, 1);
        
        // Matriz inversa de view-projection
        const invViewProj = mat4.create();
        mat4.invert(invViewProj, this.viewProjectionMatrix);
        
        // Transformar a coordenadas mundiales
        const worldNear = vec3.create();
        const worldFar = vec3.create();
        
        vec3.transformMat4(worldNear, nearPoint, invViewProj);
        vec3.transformMat4(worldFar, farPoint, invViewProj);
        
        // Calcular dirección del rayo
        const direction = vec3.create();
        vec3.sub(direction, worldFar, worldNear);
        vec3.normalize(direction, direction);
        
        return {
            origin: worldNear,
            direction: direction
        };
    }

    update(deltaTime) {
        this.updateViewMatrix();
    }
}

class CameraController {
    constructor(camera, canvas) {
        this.camera = camera;
        this.canvas = canvas;
        this.enabled = true;
        
        // Estado de entrada
        this.input = {
            keys: {},
            mouse: {
                x: 0,
                y: 0,
                deltaX: 0,
                deltaY: 0,
                buttons: 0
            },
            touch: {
                touches: [],
                lastDistance: 0
            }
        };
        
        // Configuración
        this.config = {
            enablePan: true,
            enableRotate: true,
            enableZoom: true,
            enableDamping: true,
            dampingFactor: 0.05,
            minDistance: 1,
            maxDistance: 100,
            minPolarAngle: 0,
            maxPolarAngle: Math.PI,
            minAzimuthAngle: -Infinity,
            maxAzimuthAngle: Infinity
        };
        
        // Estado interno
        this.state = {
            rotating: false,
            panning: false,
            zooming: false,
            target: vec3.clone(camera.target),
            spherical: {
                radius: vec3.distance(camera.position, camera.target),
                theta: 0,
                phi: Math.PI / 2
            }
        };
        
        this.initializeEvents();
        this.updateSpherical();
    }

    initializeEvents() {
        if (!this.canvas) return;
        
        // Eventos de mouse
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onMouseWheel(e));
        
        // Eventos de teclado
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Eventos táctiles
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Prevenir menú contextual
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Capturar puntero
        this.canvas.addEventListener('pointerdown', (e) => {
            this.canvas.setPointerCapture(e.pointerId);
        });
    }

    onMouseDown(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        this.input.mouse.x = event.clientX;
        this.input.mouse.y = event.clientY;
        this.input.mouse.buttons = event.buttons;
        
        if (event.button === 0) { // Botón izquierdo
            this.state.rotating = this.config.enableRotate;
        } else if (event.button === 1) { // Botón medio
            this.state.panning = this.config.enablePan;
        } else if (event.button === 2) { // Botón derecho
            this.state.panning = this.config.enablePan;
        }
    }

    onMouseMove(event) {
        if (!this.enabled) return;
        
        this.input.mouse.deltaX = event.clientX - this.input.mouse.x;
        this.input.mouse.deltaY = event.clientY - this.input.mouse.y;
        
        this.input.mouse.x = event.clientX;
        this.input.mouse.y = event.clientY;
        
        if (this.state.rotating) {
            this.rotate(
                this.input.mouse.deltaX * this.camera.rotationSpeed * 0.01,
                this.input.mouse.deltaY * this.camera.rotationSpeed * 0.01
            );
        }
        
        if (this.state.panning) {
            this.pan(
                this.input.mouse.deltaX * 0.01,
                this.input.mouse.deltaY * 0.01
            );
        }
    }

    onMouseUp(event) {
        if (!this.enabled) return;
        
        this.state.rotating = false;
        this.state.panning = false;
        this.state.zooming = false;
        
        this.input.mouse.buttons = 0;
    }

    onMouseWheel(event) {
        if (!this.enabled || !this.config.enableZoom) return;
        
        event.preventDefault();
        
        const delta = event.deltaY * 0.001;
        this.zoom(delta);
    }

    onKeyDown(event) {
        if (!this.enabled) return;
        
        this.input.keys[event.code] = true;
        
        // Prevenir acciones por defecto para teclas de cámara
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft'].includes(event.code)) {
            event.preventDefault();
        }
    }

    onKeyUp(event) {
        if (!this.enabled) return;
        
        this.input.keys[event.code] = false;
    }

    onTouchStart(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        this.input.touch.touches = Array.from(event.touches);
        
        if (event.touches.length === 1) {
            this.state.rotating = this.config.enableRotate;
        } else if (event.touches.length === 2) {
            this.state.zooming = this.config.enableZoom;
            this.input.touch.lastDistance = this.getTouchDistance(event.touches);
        }
    }

    onTouchMove(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        if (event.touches.length === 1 && this.state.rotating) {
            const touch = event.touches[0];
            const lastTouch = this.input.touch.touches[0];
            
            if (lastTouch) {
                const deltaX = touch.clientX - lastTouch.clientX;
                const deltaY = touch.clientY - lastTouch.clientY;
                
                this.rotate(deltaX * 0.01, deltaY * 0.01);
            }
        } else if (event.touches.length === 2 && this.state.zooming) {
            const distance = this.getTouchDistance(event.touches);
            const delta = (distance - this.input.touch.lastDistance) * 0.01;
            
            this.zoom(-delta);
            this.input.touch.lastDistance = distance;
        }
        
        this.input.touch.touches = Array.from(event.touches);
    }

    onTouchEnd(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        this.state.rotating = false;
        this.state.panning = false;
        this.state.zooming = false;
        
        this.input.touch.touches = [];
    }

    getTouchDistance(touches) {
        if (touches.length < 2) return 0;
        
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    rotate(deltaX, deltaY) {
        this.state.spherical.theta -= deltaX;
        this.state.spherical.phi -= deltaY;
        
        // Aplicar límites
        this.state.spherical.theta = Math.max(this.config.minAzimuthAngle, 
                                            Math.min(this.config.maxAzimuthAngle, 
                                                   this.state.spherical.theta));
        
        this.state.spherical.phi = Math.max(this.config.minPolarAngle, 
                                          Math.min(this.config.maxPolarAngle, 
                                                 this.state.spherical.phi));
        
        this.updateCameraPosition();
    }

    pan(deltaX, deltaY) {
        const distance = vec3.distance(this.camera.position, this.state.target);
        const factor = distance * 0.1;
        
        const right = this.camera.getRightVector();
        const up = this.camera.getUpVector();
        
        const panRight = vec3.create();
        const panUp = vec3.create();
        
        vec3.scale(panRight, right, -deltaX * factor);
        vec3.scale(panUp, up, deltaY * factor);
        
        vec3.add(this.state.target, this.state.target, panRight);
        vec3.add(this.state.target, this.state.target, panUp);
        
        this.updateCameraPosition();
    }

    zoom(delta) {
        this.state.spherical.radius += delta * this.camera.zoomSpeed;
        
        // Aplicar límites
        this.state.spherical.radius = Math.max(this.config.minDistance, 
                                             Math.min(this.config.maxDistance, 
                                                    this.state.spherical.radius));
        
        this.updateCameraPosition();
    }

    updateSpherical() {
        const offset = vec3.create();
        vec3.sub(offset, this.camera.position, this.state.target);
        
        this.state.spherical.radius = vec3.length(offset);
        this.state.spherical.theta = Math.atan2(offset[0], offset[2]);
        this.state.spherical.phi = Math.acos(Math.max(-1, Math.min(1, offset[1] / this.state.spherical.radius)));
    }

    updateCameraPosition() {
        const sinPhiRadius = Math.sin(this.state.spherical.phi) * this.state.spherical.radius;
        
        const position = vec3.fromValues(
            sinPhiRadius * Math.sin(this.state.spherical.theta),
            Math.cos(this.state.spherical.phi) * this.state.spherical.radius,
            sinPhiRadius * Math.cos(this.state.spherical.theta)
        );
        
        vec3.add(position, position, this.state.target);
        
        this.camera.setPosition(position[0], position[1], position[2]);
        this.camera.setTarget(this.state.target[0], this.state.target[1], this.state.target[2]);
    }

    handleKeyboardInput(deltaTime) {
        if (!this.enabled) return;
        
        const speed = this.camera.movementSpeed * deltaTime;
        const forward = this.camera.getForwardVector();
        const right = this.camera.getRightVector();
        const up = this.camera.getUpVector();
        
        // Movimiento WASD
        if (this.input.keys['KeyW']) {
            const movement = vec3.create();
            vec3.scale(movement, forward, speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            vec3.add(this.state.target, this.state.target, movement);
        }
        
        if (this.input.keys['KeyS']) {
            const movement = vec3.create();
            vec3.scale(movement, forward, -speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            vec3.add(this.state.target, this.state.target, movement);
        }
        
        if (this.input.keys['KeyA']) {
            const movement = vec3.create();
            vec3.scale(movement, right, -speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            vec3.add(this.state.target, this.state.target, movement);
        }
        
        if (this.input.keys['KeyD']) {
            const movement = vec3.create();
            vec3.scale(movement, right, speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            vec3.add(this.state.target, this.state.target, movement);
        }
        
        // Movimiento vertical
        if (this.input.keys['Space']) {
            const movement = vec3.create();
            vec3.scale(movement, up, speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            vec3.add(this.state.target, this.state.target, movement);
        }
        
        if (this.input.keys['ShiftLeft']) {
            const movement = vec3.create();
            vec3.scale(movement, up, -speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            vec3.add(this.state.target, this.state.target, movement);
        }
        
        // Actualizar coordenadas esféricas si hubo movimiento
        if (this.input.keys['KeyW'] || this.input.keys['KeyS'] || 
            this.input.keys['KeyA'] || this.input.keys['KeyD'] ||
            this.input.keys['Space'] || this.input.keys['ShiftLeft']) {
            this.updateSpherical();
            this.camera.needsUpdate = true;
        }
    }

    update(deltaTime) {
        if (!this.enabled) return;
        
        this.handleKeyboardInput(deltaTime);
        
        // Aplicar damping
        if (this.config.enableDamping) {
            this.applyDamping(deltaTime);
        }
        
        this.camera.update(deltaTime);
    }

    applyDamping(deltaTime) {
        // Implementar damping para suavizar movimientos
        const dampingFactor = Math.pow(1 - this.config.dampingFactor, deltaTime * 60);
        
        // Damping de rotación se podría implementar aquí
        // Para simplicidad, se omite en esta versión
    }

    setTarget(x, y, z) {
        vec3.set(this.state.target, x, y, z);
        this.camera.setTarget(x, y, z);
        this.updateSpherical();
    }

    setPosition(x, y, z) {
        this.camera.setPosition(x, y, z);
        this.updateSpherical();
    }

    setDistance(distance) {
        this.state.spherical.radius = Math.max(this.config.minDistance, 
                                             Math.min(this.config.maxDistance, distance));
        this.updateCameraPosition();
    }

    getDistance() {
        return this.state.spherical.radius;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
        this.state.rotating = false;
        this.state.panning = false;
        this.state.zooming = false;
    }

    dispose() {
        if (this.canvas) {
            // Remover event listeners
            this.canvas.removeEventListener('mousedown', this.onMouseDown);
            this.canvas.removeEventListener('mousemove', this.onMouseMove);
            this.canvas.removeEventListener('mouseup', this.onMouseUp);
            this.canvas.removeEventListener('wheel', this.onMouseWheel);
            this.canvas.removeEventListener('touchstart', this.onTouchStart);
            this.canvas.removeEventListener('touchmove', this.onTouchMove);
            this.canvas.removeEventListener('touchend', this.onTouchEnd);
            this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        }
        
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
    }
}

// Controlador específico para cámara orbital
class OrbitController extends CameraController {
    constructor(camera, canvas) {
        super(camera, canvas);
        this.updateSpherical();
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.updateCameraPosition();
    }
}

// Controlador específico para cámara libre (FPS)
class FreeController extends CameraController {
    constructor(camera, canvas) {
        super(camera, canvas);
        
        // Configuración específica para cámara libre
        this.config.enablePan = false;
        this.mouseSensitivity = 0.002;
        this.isPointerLocked = false;
        
        // Inicializar bloqueo de puntero
        this.initPointerLock();
    }

    initPointerLock() {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                this.canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
        });
    }

    onMouseMove(event) {
        if (!this.enabled || !this.isPointerLocked) return;
        
        const deltaX = event.movementX * this.mouseSensitivity;
        const deltaY = event.movementY * this.mouseSensitivity;
        
        this.camera.yaw += deltaX;
        this.camera.pitch -= deltaY;
        
        // Limitar pitch
        this.camera.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.pitch));
        
        this.updateCameraFromEuler();
    }

    updateCameraFromEuler() {
        const forward = vec3.fromValues(
            Math.cos(this.camera.pitch) * Math.sin(this.camera.yaw),
            Math.sin(this.camera.pitch),
            Math.cos(this.camera.pitch) * Math.cos(this.camera.yaw)
        );
        
        const target = vec3.create();
        vec3.add(target, this.camera.position, forward);
        
        this.camera.setTarget(target[0], target[1], target[2]);
    }

    handleKeyboardInput(deltaTime) {
        if (!this.enabled) return;
        
        const speed = this.camera.movementSpeed * deltaTime;
        const forward = this.camera.getForwardVector();
        const right = this.camera.getRightVector();
        
        // Movimiento relativo a la orientación de la cámara
        if (this.input.keys['KeyW']) {
            const movement = vec3.create();
            vec3.scale(movement, forward, speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            this.updateCameraFromEuler();
        }
        
        if (this.input.keys['KeyS']) {
            const movement = vec3.create();
            vec3.scale(movement, forward, -speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            this.updateCameraFromEuler();
        }
        
        if (this.input.keys['KeyA']) {
            const movement = vec3.create();
            vec3.scale(movement, right, -speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            this.updateCameraFromEuler();
        }
        
        if (this.input.keys['KeyD']) {
            const movement = vec3.create();
            vec3.scale(movement, right, speed);
            vec3.add(this.camera.position, this.camera.position, movement);
            this.updateCameraFromEuler();
        }
        
        // Movimiento vertical mundial
        if (this.input.keys['Space']) {
            this.camera.position[1] += speed;
            this.updateCameraFromEuler();
        }
        
        if (this.input.keys['ShiftLeft']) {
            this.camera.position[1] -= speed;
            this.updateCameraFromEuler();
        }
    }
}

// Controlador para cámara cinematográfica con interpolación suave
class CinematicController {
    constructor(camera) {
        this.camera = camera;
        this.keyframes = [];
        this.currentTime = 0;
        this.duration = 0;
        this.playing = false;
        this.loop = false;
        
        // Configuración de interpolación
        this.interpolation = 'smooth'; // 'linear', 'smooth', 'ease'
    }

    addKeyframe(time, position, target, properties = {}) {
        const keyframe = {
            time: time,
            position: vec3.clone(position),
            target: vec3.clone(target),
            fov: properties.fov || this.camera.fov,
            ...properties
        };
        
        this.keyframes.push(keyframe);
        this.keyframes.sort((a, b) => a.time - b.time);
        
        if (this.keyframes.length > 0) {
            this.duration = this.keyframes[this.keyframes.length - 1].time;
        }
    }

    play() {
        this.playing = true;
        this.currentTime = 0;
    }

    pause() {
        this.playing = false;
    }

    stop() {
        this.playing = false;
        this.currentTime = 0;
    }

    setTime(time) {
        this.currentTime = Math.max(0, Math.min(this.duration, time));
        this.updateCamera();
    }

    update(deltaTime) {
        if (!this.playing || this.keyframes.length < 2) return;
        
        this.currentTime += deltaTime;
        
        if (this.currentTime >= this.duration) {
            if (this.loop) {
                this.currentTime = 0;
            } else {
                this.playing = false;
                this.currentTime = this.duration;
            }
        }
        
        this.updateCamera();
    }

    updateCamera() {
        if (this.keyframes.length < 2) return;
        
        // Encontrar keyframes adyacentes
        let keyframe1 = null;
        let keyframe2 = null;
        
        for (let i = 0; i < this.keyframes.length - 1; i++) {
            if (this.currentTime >= this.keyframes[i].time && 
                this.currentTime <= this.keyframes[i + 1].time) {
                keyframe1 = this.keyframes[i];
                keyframe2 = this.keyframes[i + 1];
                break;
            }
        }
        
        if (!keyframe1 || !keyframe2) {
            // Usar primer o último keyframe
            const keyframe = this.currentTime <= this.keyframes[0].time ? 
                           this.keyframes[0] : 
                           this.keyframes[this.keyframes.length - 1];
            
            this.camera.setPosition(keyframe.position[0], keyframe.position[1], keyframe.position[2]);
            this.camera.setTarget(keyframe.target[0], keyframe.target[1], keyframe.target[2]);
            this.camera.fov = keyframe.fov;
            this.camera.updateProjectionMatrix();
            return;
        }
        
        // Calcular factor de interpolación
        const t = (this.currentTime - keyframe1.time) / (keyframe2.time - keyframe1.time);
        const smoothT = this.getInterpolationFactor(t);
        
        // Interpolar posición
        const position = vec3.create();
        vec3.lerp(position, keyframe1.position, keyframe2.position, smoothT);
        
        // Interpolar target
        const target = vec3.create();
        vec3.lerp(target, keyframe1.target, keyframe2.target, smoothT);
        
        // Interpolar FOV
        const fov = keyframe1.fov + (keyframe2.fov - keyframe1.fov) * smoothT;
        
        // Aplicar a la cámara
        this.camera.setPosition(position[0], position[1], position[2]);
        this.camera.setTarget(target[0], target[1], target[2]);
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }

    getInterpolationFactor(t) {
        switch (this.interpolation) {
            case 'linear':
                return t;
            case 'smooth':
                return t * t * (3 - 2 * t); // Smoothstep
            case 'ease':
                return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease in-out
            default:
                return t;
        }
    }

    clear() {
        this.keyframes = [];
        this.currentTime = 0;
        this.duration = 0;
        this.playing = false;
    }
}

export { Camera, CameraController, OrbitController, FreeController, CinematicController };