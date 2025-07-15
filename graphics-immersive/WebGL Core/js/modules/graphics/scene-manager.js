/**
 * Scene Manager - Gestor de escenas 3D
 * Maneja la jerarquía de objetos, culling y optimizaciones
 */

import { mat4, vec3, quat } from 'gl-matrix';

class SceneNode {
    constructor(name = 'Node') {
        this.name = name;
        this.children = [];
        this.parent = null;
        
        // Transformaciones locales
        this.position = vec3.create();
        this.rotation = quat.create();
        this.scale = vec3.fromValues(1, 1, 1);
        
        // Matrices
        this.localMatrix = mat4.create();
        this.worldMatrix = mat4.create();
        this.normalMatrix = mat4.create();
        
        // Propiedades
        this.visible = true;
        this.castShadows = true;
        this.receiveShadows = true;
        this.layer = 0;
        
        // Bounding box
        this.boundingBox = {
            min: vec3.fromValues(-1, -1, -1),
            max: vec3.fromValues(1, 1, 1)
        };
        
        // Datos de renderizado
        this.mesh = null;
        this.material = null;
        this.program = null;
        
        this.needsUpdate = true;
    }

    addChild(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        
        child.parent = this;
        this.children.push(child);
        child.needsUpdate = true;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            child.needsUpdate = true;
        }
    }

    setPosition(x, y, z) {
        vec3.set(this.position, x, y, z);
        this.needsUpdate = true;
    }

    setRotation(x, y, z, w) {
        quat.set(this.rotation, x, y, z, w);
        this.needsUpdate = true;
    }

    setScale(x, y, z) {
        vec3.set(this.scale, x, y, z);
        this.needsUpdate = true;
    }

    updateMatrices(parentMatrix = null) {
        if (this.needsUpdate) {
            // Construir matriz local
            mat4.fromRotationTranslationScale(
                this.localMatrix,
                this.rotation,
                this.position,
                this.scale
            );
            
            this.needsUpdate = false;
        }
        
        // Calcular matriz mundial
        if (parentMatrix) {
            mat4.multiply(this.worldMatrix, parentMatrix, this.localMatrix);
        } else {
            mat4.copy(this.worldMatrix, this.localMatrix);
        }
        
        // Matriz normal para iluminación
        mat4.invert(this.normalMatrix, this.worldMatrix);
        mat4.transpose(this.normalMatrix, this.normalMatrix);
        
        // Actualizar hijos
        this.children.forEach(child => {
            child.updateMatrices(this.worldMatrix);
        });
    }

    updateBoundingBox() {
        if (this.mesh && this.mesh.vertices) {
            const vertices = this.mesh.vertices;
            const min = vec3.fromValues(Infinity, Infinity, Infinity);
            const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
            
            for (let i = 0; i < vertices.length; i += 3) {
                const vertex = vec3.fromValues(vertices[i], vertices[i + 1], vertices[i + 2]);
                vec3.min(min, min, vertex);
                vec3.max(max, max, vertex);
            }
            
            this.boundingBox.min = min;
            this.boundingBox.max = max;
        }
    }

    isVisible(camera) {
        if (!this.visible) return false;
        
        // Frustum culling básico
        const center = vec3.create();
        vec3.add(center, this.boundingBox.min, this.boundingBox.max);
        vec3.scale(center, center, 0.5);
        
        // Transformar al espacio mundial
        vec3.transformMat4(center, center, this.worldMatrix);
        
        // Verificar si está en el frustum (simplificado)
        const distance = vec3.distance(center, camera.position);
        return distance < camera.farPlane;
    }
}

class SceneManager {
    constructor() {
        this.root = new SceneNode('Root');
        this.nodes = new Map();
        this.renderQueue = [];
        this.lights = [];
        this.cameras = [];
        
        // Configuración
        this.enableFrustumCulling = true;
        this.enableOcclusionCulling = false;
        this.enableLOD = true;
        
        // Estadísticas
        this.stats = {
            totalNodes: 0,
            visibleNodes: 0,
            culledNodes: 0,
            drawCalls: 0
        };
        
        this.init();
    }

    init() {
        // Crear nodos por defecto
        this.createDefaultNodes();
        
        // Configurar luces por defecto
        this.setupDefaultLighting();
        
        console.log('Scene Manager inicializado');
    }

    createDefaultNodes() {
        // Nodo para objetos estáticos
        const staticNode = new SceneNode('Static');
        staticNode.layer = 1;
        this.root.addChild(staticNode);
        this.nodes.set('static', staticNode);
        
        // Nodo para objetos dinámicos
        const dynamicNode = new SceneNode('Dynamic');
        dynamicNode.layer = 2;
        this.root.addChild(dynamicNode);
        this.nodes.set('dynamic', dynamicNode);
        
        // Nodo para efectos
        const effectsNode = new SceneNode('Effects');
        effectsNode.layer = 3;
        this.root.addChild(effectsNode);
        this.nodes.set('effects', effectsNode);
        
        // Nodo para UI 3D
        const uiNode = new SceneNode('UI3D');
        uiNode.layer = 4;
        this.root.addChild(uiNode);
        this.nodes.set('ui3d', uiNode);
    }

    setupDefaultLighting() {
        // Luz direccional principal
        const mainLight = {
            type: 'directional',
            direction: vec3.fromValues(-1, -1, -1),
            color: vec3.fromValues(1, 1, 1),
            intensity: 1.0,
            castShadows: true
        };
        
        vec3.normalize(mainLight.direction, mainLight.direction);
        this.lights.push(mainLight);
        
        // Luz ambiente
        const ambientLight = {
            type: 'ambient',
            color: vec3.fromValues(0.2, 0.2, 0.3),
            intensity: 0.3
        };
        
        this.lights.push(ambientLight);
    }

    createNode(name, parent = 'root') {
        const node = new SceneNode(name);
        
        if (parent === 'root') {
            this.root.addChild(node);
        } else {
            const parentNode = this.nodes.get(parent);
            if (parentNode) {
                parentNode.addChild(node);
            } else {
                console.warn(`Nodo padre '${parent}' no encontrado`);
                this.root.addChild(node);
            }
        }
        
        this.nodes.set(name, node);
        return node;
    }

    removeNode(name) {
        const node = this.nodes.get(name);
        if (node) {
            if (node.parent) {
                node.parent.removeChild(node);
            }
            this.nodes.delete(name);
        }
    }

    getNode(name) {
        return this.nodes.get(name);
    }

    addMesh(nodeName, mesh, material, program) {
        const node = this.nodes.get(nodeName);
        if (node) {
            node.mesh = mesh;
            node.material = material;
            node.program = program;
            node.updateBoundingBox();
        } else {
            console.warn(`Nodo '${nodeName}' no encontrado`);
        }
    }

    addLight(light) {
        this.lights.push(light);
    }

    removeLight(light) {
        const index = this.lights.indexOf(light);
        if (index !== -1) {
            this.lights.splice(index, 1);
        }
    }

    addCamera(camera) {
        this.cameras.push(camera);
    }

    removeCamera(camera) {
        const index = this.cameras.indexOf(camera);
        if (index !== -1) {
            this.cameras.splice(index, 1);
        }
    }

    update(deltaTime) {
        // Actualizar transformaciones
        this.root.updateMatrices();
        
        // Contar nodos totales
        this.stats.totalNodes = this.nodes.size;
        
        // Actualizar animaciones y lógica de nodos
        this.nodes.forEach(node => {
            this.updateNode(node, deltaTime);
        });
    }

    updateNode(node, deltaTime) {
        // Actualizar lógica específica del nodo
        if (node.onUpdate) {
            node.onUpdate(deltaTime);
        }
        
        // Actualizar animaciones
        if (node.animation) {
            this.updateAnimation(node, deltaTime);
        }
        
        // Actualizar efectos
        if (node.effects) {
            this.updateEffects(node, deltaTime);
        }
    }

    updateAnimation(node, deltaTime) {
        const anim = node.animation;
        if (!anim.playing) return;
        
        anim.time += deltaTime;
        
        if (anim.time >= anim.duration) {
            if (anim.loop) {
                anim.time = 0;
            } else {
                anim.playing = false;
                return;
            }
        }
        
        const progress = anim.time / anim.duration;
        
        // Aplicar transformaciones animadas
        if (anim.position) {
            vec3.lerp(node.position, anim.position.start, anim.position.end, progress);
            node.needsUpdate = true;
        }
        
        if (anim.rotation) {
            quat.slerp(node.rotation, anim.rotation.start, anim.rotation.end, progress);
            node.needsUpdate = true;
        }
        
        if (anim.scale) {
            vec3.lerp(node.scale, anim.scale.start, anim.scale.end, progress);
            node.needsUpdate = true;
        }
    }

    updateEffects(node, deltaTime) {
        node.effects.forEach(effect => {
            if (effect.update) {
                effect.update(deltaTime);
            }
        });
    }

    buildRenderQueue(camera) {
        this.renderQueue = [];
        this.stats.visibleNodes = 0;
        this.stats.culledNodes = 0;
        
        // Construir cola de renderizado
        this.traverseNode(this.root, camera);
        
        // Ordenar por layer y distancia
        this.renderQueue.sort((a, b) => {
            if (a.layer !== b.layer) {
                return a.layer - b.layer;
            }
            return a.distance - b.distance;
        });
        
        this.stats.drawCalls = this.renderQueue.length;
        
        return this.renderQueue;
    }

    traverseNode(node, camera) {
        // Verificar visibilidad
        if (!node.visible) {
            this.stats.culledNodes++;
            return;
        }
        
        // Frustum culling
        if (this.enableFrustumCulling && !node.isVisible(camera)) {
            this.stats.culledNodes++;
            return;
        }
        
        // Agregar a cola de renderizado si tiene mesh
        if (node.mesh && node.material && node.program) {
            const center = vec3.create();
            vec3.add(center, node.boundingBox.min, node.boundingBox.max);
            vec3.scale(center, center, 0.5);
            vec3.transformMat4(center, center, node.worldMatrix);
            
            const distance = vec3.distance(center, camera.position);
            
            const renderItem = {
                node: node,
                program: node.program,
                mesh: node.mesh,
                material: node.material,
                worldMatrix: node.worldMatrix,
                normalMatrix: node.normalMatrix,
                distance: distance,
                layer: node.layer,
                uniforms: this.buildUniforms(node, camera),
                attributes: this.buildAttributes(node),
                textures: this.buildTextures(node)
            };
            
            this.renderQueue.push(renderItem);
            this.stats.visibleNodes++;
        }
        
        // Procesar hijos
        node.children.forEach(child => {
            this.traverseNode(child, camera);
        });
    }

    buildUniforms(node, camera) {
        const uniforms = {
            u_modelMatrix: node.worldMatrix,
            u_viewMatrix: camera.viewMatrix,
            u_projectionMatrix: camera.projectionMatrix,
            u_normalMatrix: node.normalMatrix,
            u_cameraPosition: camera.position
        };
        
        // Agregar uniforms de iluminación
        this.lights.forEach((light, index) => {
            if (light.type === 'directional') {
                uniforms[`u_lightDirection${index}`] = light.direction;
                uniforms[`u_lightColor${index}`] = light.color;
                uniforms[`u_lightIntensity${index}`] = light.intensity;
            } else if (light.type === 'ambient') {
                uniforms[`u_ambientColor`] = light.color;
                uniforms[`u_ambientIntensity`] = light.intensity;
            } else if (light.type === 'point') {
                uniforms[`u_pointLightPosition${index}`] = light.position;
                uniforms[`u_pointLightColor${index}`] = light.color;
                uniforms[`u_pointLightIntensity${index}`] = light.intensity;
                uniforms[`u_pointLightRadius${index}`] = light.radius || 10.0;
            }
        });
        
        // Agregar uniforms del material
        if (node.material) {
            Object.assign(uniforms, node.material.uniforms);
        }
        
        return uniforms;
    }

    buildAttributes(node) {
        const attributes = {};
        
        if (node.mesh) {
            if (node.mesh.vertices) {
                attributes.a_position = 'vertices';
            }
            if (node.mesh.normals) {
                attributes.a_normal = 'normals';
            }
            if (node.mesh.texCoords) {
                attributes.a_texCoord = 'texCoords';
            }
            if (node.mesh.colors) {
                attributes.a_color = 'colors';
            }
        }
        
        return attributes;
    }

    buildTextures(node) {
        const textures = {};
        
        if (node.material && node.material.textures) {
            Object.entries(node.material.textures).forEach(([name, texture], index) => {
                textures[name] = index;
            });
        }
        
        return textures;
    }

    animate(nodeName, animation) {
        const node = this.nodes.get(nodeName);
        if (node) {
            node.animation = {
                playing: true,
                time: 0,
                duration: animation.duration || 1.0,
                loop: animation.loop || false,
                ...animation
            };
        }
    }

    stopAnimation(nodeName) {
        const node = this.nodes.get(nodeName);
        if (node && node.animation) {
            node.animation.playing = false;
        }
    }

    addEffect(nodeName, effect) {
        const node = this.nodes.get(nodeName);
        if (node) {
            if (!node.effects) {
                node.effects = [];
            }
            node.effects.push(effect);
        }
    }

    removeEffect(nodeName, effect) {
        const node = this.nodes.get(nodeName);
        if (node && node.effects) {
            const index = node.effects.indexOf(effect);
            if (index !== -1) {
                node.effects.splice(index, 1);
            }
        }
    }

    setNodeVisibility(nodeName, visible) {
        const node = this.nodes.get(nodeName);
        if (node) {
            node.visible = visible;
        }
    }

    setNodeLayer(nodeName, layer) {
        const node = this.nodes.get(nodeName);
        if (node) {
            node.layer = layer;
        }
    }

    raycast(origin, direction, maxDistance = 100) {
        const hits = [];
        
        this.nodes.forEach(node => {
            if (!node.visible || !node.mesh) return;
            
            const hit = this.raycastNode(node, origin, direction, maxDistance);
            if (hit) {
                hits.push(hit);
            }
        });
        
        // Ordenar por distancia
        hits.sort((a, b) => a.distance - b.distance);
        
        return hits;
    }

    raycastNode(node, origin, direction, maxDistance) {
        // Raycast simplificado contra bounding box
        const min = vec3.create();
        const max = vec3.create();
        
        vec3.transformMat4(min, node.boundingBox.min, node.worldMatrix);
        vec3.transformMat4(max, node.boundingBox.max, node.worldMatrix);
        
        // Algoritmo de intersección ray-box
        const invDir = vec3.fromValues(1 / direction[0], 1 / direction[1], 1 / direction[2]);
        
        const t1 = vec3.create();
        const t2 = vec3.create();
        
        vec3.sub(t1, min, origin);
        vec3.mul(t1, t1, invDir);
        
        vec3.sub(t2, max, origin);
        vec3.mul(t2, t2, invDir);
        
        const tmin = Math.max(
            Math.min(t1[0], t2[0]),
            Math.min(t1[1], t2[1]),
            Math.min(t1[2], t2[2])
        );
        
        const tmax = Math.min(
            Math.max(t1[0], t2[0]),
            Math.max(t1[1], t2[1]),
            Math.max(t1[2], t2[2])
        );
        
        if (tmax >= 0 && tmin <= tmax && tmin <= maxDistance) {
            const hitPoint = vec3.create();
            vec3.scaleAndAdd(hitPoint, origin, direction, tmin);
            
            return {
                node: node,
                distance: tmin,
                point: hitPoint,
                normal: vec3.fromValues(0, 1, 0) // Simplificado
            };
        }
        
        return null;
    }

    findNodesInRadius(center, radius) {
        const nodes = [];
        
        this.nodes.forEach(node => {
            if (!node.visible) return;
            
            const nodeCenter = vec3.create();
            vec3.add(nodeCenter, node.boundingBox.min, node.boundingBox.max);
            vec3.scale(nodeCenter, nodeCenter, 0.5);
            vec3.transformMat4(nodeCenter, nodeCenter, node.worldMatrix);
            
            const distance = vec3.distance(center, nodeCenter);
            if (distance <= radius) {
                nodes.push({
                    node: node,
                    distance: distance
                });
            }
        });
        
        return nodes.sort((a, b) => a.distance - b.distance);
    }

    optimizeScene() {
        // Combinar geometrías estáticas
        this.combineStaticGeometry();
        
        // Aplicar LOD automático
        this.applyLOD();
        
        // Optimizar materiales
        this.optimizeMaterials();
        
        console.log('Escena optimizada');
    }

    combineStaticGeometry() {
        const staticNode = this.nodes.get('static');
        if (!staticNode) return;
        
        const geometryGroups = new Map();
        
        // Agrupar por material
        staticNode.children.forEach(child => {
            if (child.material && child.mesh) {
                const key = child.material.id || 'default';
                if (!geometryGroups.has(key)) {
                    geometryGroups.set(key, []);
                }
                geometryGroups.get(key).push(child);
            }
        });
        
        // Combinar geometrías del mismo material
        geometryGroups.forEach((nodes, materialKey) => {
            if (nodes.length > 1) {
                const combinedMesh = this.combineGeometries(nodes);
                if (combinedMesh) {
                    // Crear nodo combinado
                    const combinedNode = new SceneNode(`combined_${materialKey}`);
                    combinedNode.mesh = combinedMesh;
                    combinedNode.material = nodes[0].material;
                    combinedNode.program = nodes[0].program;
                    
                    // Remover nodos originales
                    nodes.forEach(node => {
                        staticNode.removeChild(node);
                        this.nodes.delete(node.name);
                    });
                    
                    // Agregar nodo combinado
                    staticNode.addChild(combinedNode);
                    this.nodes.set(combinedNode.name, combinedNode);
                }
            }
        });
    }

    combineGeometries(nodes) {
        const vertices = [];
        const normals = [];
        const texCoords = [];
        const indices = [];
        
        let vertexOffset = 0;
        
        nodes.forEach(node => {
            const mesh = node.mesh;
            
            // Transformar vértices al espacio mundial
            if (mesh.vertices) {
                for (let i = 0; i < mesh.vertices.length; i += 3) {
                    const vertex = vec3.fromValues(
                        mesh.vertices[i],
                        mesh.vertices[i + 1],
                        mesh.vertices[i + 2]
                    );
                    
                    vec3.transformMat4(vertex, vertex, node.worldMatrix);
                    vertices.push(vertex[0], vertex[1], vertex[2]);
                }
            }
            
            // Transformar normales
            if (mesh.normals) {
                for (let i = 0; i < mesh.normals.length; i += 3) {
                    const normal = vec3.fromValues(
                        mesh.normals[i],
                        mesh.normals[i + 1],
                        mesh.normals[i + 2]
                    );
                    
                    vec3.transformMat4(normal, normal, node.normalMatrix);
                    vec3.normalize(normal, normal);
                    normals.push(normal[0], normal[1], normal[2]);
                }
            }
            
            // Copiar coordenadas de textura
            if (mesh.texCoords) {
                texCoords.push(...mesh.texCoords);
            }
            
            // Ajustar índices
            if (mesh.indices) {
                mesh.indices.forEach(index => {
                    indices.push(index + vertexOffset);
                });
            }
            
            vertexOffset += mesh.vertices.length / 3;
        });
        
        return {
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            texCoords: new Float32Array(texCoords),
            indices: new Uint16Array(indices)
        };
    }

    applyLOD() {
        // Implementar LOD automático basado en distancia
        this.nodes.forEach(node => {
            if (node.mesh && node.lodLevels) {
                node.updateLOD = (camera) => {
                    const distance = vec3.distance(node.worldMatrix.slice(12, 15), camera.position);
                    
                    let lodLevel = 0;
                    if (distance > 50) lodLevel = 2;
                    else if (distance > 20) lodLevel = 1;
                    
                    if (node.lodLevels[lodLevel]) {
                        node.mesh = node.lodLevels[lodLevel];
                    }
                };
            }
        });
    }

    optimizeMaterials() {
        const materials = new Map();
        
        // Recopilar materiales únicos
        this.nodes.forEach(node => {
            if (node.material) {
                const key = JSON.stringify(node.material.properties);
                if (!materials.has(key)) {
                    materials.set(key, node.material);
                } else {
                    // Reutilizar material existente
                    node.material = materials.get(key);
                }
            }
        });
        
        console.log(`Materiales optimizados: ${materials.size} únicos`);
    }

    getStats() {
        return {
            ...this.stats,
            totalLights: this.lights.length,
            totalCameras: this.cameras.length
        };
    }

    dispose() {
        // Limpiar todos los nodos
        this.nodes.forEach(node => {
            if (node.mesh) {
                // Limpiar mesh si es necesario
            }
            if (node.material) {
                // Limpiar material si es necesario
            }
        });
        
        this.nodes.clear();
        this.lights.length = 0;
        this.cameras.length = 0;
        this.renderQueue.length = 0;
        
        console.log('Scene Manager limpiado');
    }
}

export default SceneManager;