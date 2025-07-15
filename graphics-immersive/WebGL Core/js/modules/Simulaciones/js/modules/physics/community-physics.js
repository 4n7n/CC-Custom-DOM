/**
 * RAMA 5: Community Physics Engine
 * Simulación física para comunidades y elementos ambientales
 * @version 1.0.0
 */

import { Vector3, Quaternion, Matrix4 } from '../../../libs/math-utils.js';
import { PhysicsWorld } from './physics-world.js';
import { EventEmitter } from '../../../core/event-emitter.js';

export class CommunityPhysics extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuración del mundo físico
        this.world = new PhysicsWorld({
            gravity: new Vector3(0, -9.81, 0),
            timeStep: 1/60,
            maxSubSteps: 3,
            ...options.world
        });
        
        // Sistemas de simulación
        this.communityBodies = new Map();
        this.buildingBodies = new Map();
        this.environmentBodies = new Map();
        this.fluidBodies = new Map();
        
        // Configuración de materiales
        this.materials = {
            ground: { friction: 0.8, restitution: 0.2, density: 1.0 },
            building: { friction: 0.6, restitution: 0.1, density: 2.5 },
            water: { friction: 0.1, restitution: 0.0, density: 1.0, viscosity: 0.8 },
            vegetation: { friction: 0.4, restitution: 0.3, density: 0.5 },
            character: { friction: 0.5, restitution: 0.2, density: 1.2 }
        };
        
        // Configuración de simulación
        this.config = {
            communityRadius: 50.0,
            buildingHeight: 12.0,
            waterLevel: 0.0,
            windForce: new Vector3(0, 0, 0),
            gravityZones: [],
            collisionGroups: {
                GROUND: 1,
                BUILDINGS: 2,
                CHARACTERS: 4,
                WATER: 8,
                VEGETATION: 16,
                PROJECTILES: 32
            },
            ...options.config
        };
        
        // Estado de simulación
        this.isRunning = false;
        this.deltaTime = 0;
        this.accumulator = 0;
        this.lastUpdate = performance.now();
        
        // Métricas de rendimiento
        this.metrics = {
            activeBodies: 0,
            collisions: 0,
            computeTime: 0,
            memoryUsage: 0
        };
        
        this.initializeCommunityPhysics();
    }
    
    initializeCommunityPhysics() {
        // Inicializar el mundo físico base
        this.createGroundPlane();
        this.setupCollisionGroups();
        this.initializeWaterSystem();
        this.setupGravityZones();
        
        // Configurar callbacks de colisión
        this.world.onCollisionStart = this.handleCollisionStart.bind(this);
        this.world.onCollisionEnd = this.handleCollisionEnd.bind(this);
        
        console.log('Community Physics initialized');
    }
    
    createGroundPlane() {
        const groundGeometry = {
            type: 'plane',
            width: this.config.communityRadius * 4,
            height: this.config.communityRadius * 4
        };
        
        const groundBody = this.world.createRigidBody({
            geometry: groundGeometry,
            material: this.materials.ground,
            position: new Vector3(0, -0.5, 0),
            rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
            mass: 0, // Estático
            collisionGroup: this.config.collisionGroups.GROUND,
            collisionMask: 0xFFFFFFFF
        });
        
        this.environmentBodies.set('ground', groundBody);
    }
    
    setupCollisionGroups() {
        const groups = this.config.collisionGroups;
        
        // Configurar máscaras de colisión
        this.world.setCollisionMatrix({
            [groups.GROUND]: groups.CHARACTERS | groups.PROJECTILES | groups.WATER,
            [groups.BUILDINGS]: groups.CHARACTERS | groups.PROJECTILES | groups.WATER,
            [groups.CHARACTERS]: groups.GROUND | groups.BUILDINGS | groups.WATER | groups.VEGETATION,
            [groups.WATER]: groups.GROUND | groups.BUILDINGS | groups.CHARACTERS,
            [groups.VEGETATION]: groups.CHARACTERS | groups.PROJECTILES,
            [groups.PROJECTILES]: groups.GROUND | groups.BUILDINGS | groups.VEGETATION
        });
    }
    
    initializeWaterSystem() {
        if (this.config.waterLevel > 0) {
            const waterGeometry = {
                type: 'box',
                width: this.config.communityRadius * 2,
                height: this.config.waterLevel,
                depth: this.config.communityRadius * 2
            };
            
            const waterBody = this.world.createFluidBody({
                geometry: waterGeometry,
                material: this.materials.water,
                position: new Vector3(0, this.config.waterLevel / 2, 0),
                collisionGroup: this.config.collisionGroups.WATER,
                collisionMask: this.config.collisionGroups.CHARACTERS | this.config.collisionGroups.BUILDINGS
            });
            
            this.fluidBodies.set('communityWater', waterBody);
        }
    }
    
    setupGravityZones() {
        this.config.gravityZones.forEach((zone, index) => {
            const gravityZone = this.world.createGravityZone({
                position: new Vector3(zone.x, zone.y, zone.z),
                radius: zone.radius,
                gravity: new Vector3(zone.gravityX, zone.gravityY, zone.gravityZ),
                falloffType: zone.falloffType || 'linear'
            });
            
            this.environmentBodies.set(`gravityZone_${index}`, gravityZone);
        });
    }
    
    createCommunityBuilding(buildingData) {
        const {
            id,
            position,
            dimensions,
            rotation = new Quaternion(),
            buildingType = 'residential',
            mass = 0 // Estático por defecto
        } = buildingData;
        
        const geometry = {
            type: 'box',
            width: dimensions.x,
            height: dimensions.y,
            depth: dimensions.z
        };
        
        const material = {
            ...this.materials.building,
            density: this.getBuildingDensity(buildingType)
        };
        
        const buildingBody = this.world.createRigidBody({
            geometry,
            material,
            position: new Vector3(position.x, position.y + dimensions.y / 2, position.z),
            rotation,
            mass,
            collisionGroup: this.config.collisionGroups.BUILDINGS,
            collisionMask: this.config.collisionGroups.CHARACTERS | this.config.collisionGroups.PROJECTILES | this.config.collisionGroups.WATER,
            userData: {
                type: 'building',
                buildingType,
                id,
                health: 100,
                structural: true
            }
        });
        
        this.buildingBodies.set(id, buildingBody);
        this.emit('buildingCreated', { id, body: buildingBody });
        
        return buildingBody;
    }
    
    createVegetationCluster(vegetationData) {
        const {
            id,
            position,
            radius,
            density = 0.7,
            vegetationType = 'trees',
            windResistance = 0.5
        } = vegetationData;
        
        const clusterBodies = [];
        const vegetationCount = Math.floor(density * Math.PI * radius * radius / 4);
        
        for (let i = 0; i < vegetationCount; i++) {
            const angle = (i / vegetationCount) * Math.PI * 2;
            const distance = Math.random() * radius;
            const plantPosition = new Vector3(
                position.x + Math.cos(angle) * distance,
                position.y,
                position.z + Math.sin(angle) * distance
            );
            
            const plantHeight = this.getVegetationHeight(vegetationType);
            const plantGeometry = {
                type: 'cylinder',
                radius: plantHeight * 0.1,
                height: plantHeight
            };
            
            const plantBody = this.world.createRigidBody({
                geometry: plantGeometry,
                material: this.materials.vegetation,
                position: new Vector3(plantPosition.x, plantPosition.y + plantHeight / 2, plantPosition.z),
                mass: this.materials.vegetation.density * plantHeight,
                collisionGroup: this.config.collisionGroups.VEGETATION,
                collisionMask: this.config.collisionGroups.CHARACTERS | this.config.collisionGroups.PROJECTILES,
                userData: {
                    type: 'vegetation',
                    vegetationType,
                    windResistance,
                    clusterId: id,
                    plantIndex: i
                }
            });
            
            clusterBodies.push(plantBody);
        }
        
        this.environmentBodies.set(id, clusterBodies);
        this.emit('vegetationCreated', { id, bodies: clusterBodies });
        
        return clusterBodies;
    }
    
    addCharacterToPhysics(characterData) {
        const {
            id,
            position,
            dimensions = { x: 0.8, y: 1.8, z: 0.6 },
            mass = 75,
            isKinematic = false
        } = characterData;
        
        const geometry = {
            type: 'capsule',
            radius: Math.max(dimensions.x, dimensions.z) / 2,
            height: dimensions.y
        };
        
        const characterBody = this.world.createRigidBody({
            geometry,
            material: this.materials.character,
            position: new Vector3(position.x, position.y + dimensions.y / 2, position.z),
            mass: isKinematic ? 0 : mass,
            collisionGroup: this.config.collisionGroups.CHARACTERS,
            collisionMask: this.config.collisionGroups.GROUND | this.config.collisionGroups.BUILDINGS | this.config.collisionGroups.WATER | this.config.collisionGroups.VEGETATION,
            kinematic: isKinematic,
            userData: {
                type: 'character',
                id,
                health: 100,
                velocity: new Vector3(0, 0, 0),
                acceleration: new Vector3(0, 0, 0)
            }
        });
        
        // Configurar restricciones para personajes
        characterBody.setLinearFactor(new Vector3(1, 1, 1));
        characterBody.setAngularFactor(new Vector3(0, 1, 0)); // Solo rotación en Y
        
        this.communityBodies.set(id, characterBody);
        this.emit('characterAdded', { id, body: characterBody });
        
        return characterBody;
    }
    
    applyWindForces() {
        if (this.config.windForce.length() > 0) {
            // Aplicar fuerzas de viento a elementos susceptibles
            this.environmentBodies.forEach((bodies, id) => {
                if (Array.isArray(bodies)) {
                    // Vegetación
                    bodies.forEach(body => {
                        if (body.userData.type === 'vegetation') {
                            const windEffect = this.config.windForce.clone().multiplyScalar(
                                1 - body.userData.windResistance
                            );
                            body.applyForce(windEffect, body.getPosition());
                        }
                    });
                }
            });
            
            // Aplicar efectos de viento a personajes
            this.communityBodies.forEach(body => {
                if (body.userData.type === 'character') {
                    const windEffect = this.config.windForce.clone().multiplyScalar(0.1);
                    body.applyForce(windEffect, body.getPosition());
                }
            });
        }
    }
    
    updateFluidDynamics(deltaTime) {
        this.fluidBodies.forEach((fluidBody, id) => {
            // Simular interacciones con fluidos
            this.communityBodies.forEach(characterBody => {
                if (this.isBodyInFluid(characterBody, fluidBody)) {
                    this.applyFluidForces(characterBody, fluidBody, deltaTime);
                }
            });
        });
    }
    
    isBodyInFluid(body, fluidBody) {
        const bodyPos = body.getPosition();
        const fluidPos = fluidBody.getPosition();
        const fluidBounds = fluidBody.getBoundingBox();
        
        return (
            bodyPos.x >= fluidBounds.min.x && bodyPos.x <= fluidBounds.max.x &&
            bodyPos.y >= fluidBounds.min.y && bodyPos.y <= fluidBounds.max.y &&
            bodyPos.z >= fluidBounds.min.z && bodyPos.z <= fluidBounds.max.z
        );
    }
    
    applyFluidForces(body, fluidBody, deltaTime) {
        const velocity = body.getLinearVelocity();
        const fluidMaterial = fluidBody.getMaterial();
        
        // Fuerza de flotación
        const buoyancyForce = new Vector3(0, 9.81 * fluidMaterial.density * 0.8, 0);
        body.applyForce(buoyancyForce, body.getPosition());
        
        // Resistencia del fluido
        const dragForce = velocity.clone().multiplyScalar(-fluidMaterial.viscosity);
        body.applyForce(dragForce, body.getPosition());
        
        // Emit fluid interaction event
        this.emit('fluidInteraction', {
            characterId: body.userData.id,
            fluidType: fluidBody.userData.type,
            position: body.getPosition(),
            velocity: velocity
        });
    }
    
    handleCollisionStart(bodyA, bodyB, contact) {
        const userDataA = bodyA.userData;
        const userDataB = bodyB.userData;
        
        // Registrar colisión
        this.metrics.collisions++;
        
        // Manejar colisiones específicas
        if (userDataA.type === 'character' && userDataB.type === 'building') {
            this.handleCharacterBuildingCollision(bodyA, bodyB, contact);
        } else if (userDataA.type === 'character' && userDataB.type === 'vegetation') {
            this.handleCharacterVegetationCollision(bodyA, bodyB, contact);
        } else if (userDataA.type === 'projectile') {
            this.handleProjectileCollision(bodyA, bodyB, contact);
        }
        
        this.emit('collisionStart', {
            bodyA: userDataA,
            bodyB: userDataB,
            contact: contact
        });
    }
    
    handleCollisionEnd(bodyA, bodyB) {
        this.emit('collisionEnd', {
            bodyA: bodyA.userData,
            bodyB: bodyB.userData
        });
    }
    
    handleCharacterBuildingCollision(characterBody, buildingBody, contact) {
        const impact = contact.getImpactVelocity();
        if (impact > 5.0) {
            // Impacto significativo
            this.emit('characterImpact', {
                characterId: characterBody.userData.id,
                buildingId: buildingBody.userData.id,
                impact: impact,
                position: contact.getPosition()
            });
        }
    }
    
    handleCharacterVegetationCollision(characterBody, vegetationBody, contact) {
        // Efectos de rustling en vegetación
        const rustlingForce = new Vector3(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
        );
        
        vegetationBody.applyForce(rustlingForce, vegetationBody.getPosition());
        
        this.emit('vegetationRustling', {
            characterId: characterBody.userData.id,
            vegetationId: vegetationBody.userData.clusterId,
            position: contact.getPosition()
        });
    }
    
    handleProjectileCollision(projectileBody, targetBody, contact) {
        // Manejar impactos de proyectiles
        const damage = projectileBody.userData.damage || 10;
        
        if (targetBody.userData.health !== undefined) {
            targetBody.userData.health -= damage;
            
            if (targetBody.userData.health <= 0) {
                this.emit('bodyDestroyed', {
                    type: targetBody.userData.type,
                    id: targetBody.userData.id,
                    position: targetBody.getPosition()
                });
            }
        }
        
        // Remover proyectil
        this.world.removeRigidBody(projectileBody);
        
        this.emit('projectileImpact', {
            projectileId: projectileBody.userData.id,
            targetId: targetBody.userData.id,
            damage: damage,
            position: contact.getPosition()
        });
    }
    
    getBuildingDensity(buildingType) {
        const densities = {
            residential: 2.0,
            commercial: 2.5,
            industrial: 3.0,
            ceremonial: 1.8,
            storage: 1.5
        };
        return densities[buildingType] || 2.0;
    }
    
    getVegetationHeight(vegetationType) {
        const heights = {
            trees: 8.0 + Math.random() * 4.0,
            bushes: 1.5 + Math.random() * 1.0,
            grass: 0.3 + Math.random() * 0.2,
            flowers: 0.5 + Math.random() * 0.3
        };
        return heights[vegetationType] || 2.0;
    }
    
    update(deltaTime) {
        const startTime = performance.now();
        
        this.deltaTime = deltaTime;
        this.accumulator += deltaTime;
        
        // Fixed timestep physics
        const fixedTimeStep = 1/60;
        while (this.accumulator >= fixedTimeStep) {
            this.applyWindForces();
            this.updateFluidDynamics(fixedTimeStep);
            this.world.step(fixedTimeStep);
            this.accumulator -= fixedTimeStep;
        }
        
        // Actualizar métricas
        this.metrics.activeBodies = this.world.getActiveBodies().length;
        this.metrics.computeTime = performance.now() - startTime;
        
        this.emit('physicsUpdate', {
            deltaTime: deltaTime,
            metrics: this.metrics
        });
    }
    
    start() {
        this.isRunning = true;
        this.lastUpdate = performance.now();
        console.log('Community Physics started');
    }
    
    stop() {
        this.isRunning = false;
        console.log('Community Physics stopped');
    }
    
    getMetrics() {
        return { ...this.metrics };
    }
    
    dispose() {
        this.stop();
        this.world.dispose();
        this.communityBodies.clear();
        this.buildingBodies.clear();
        this.environmentBodies.clear();
        this.fluidBodies.clear();
        this.removeAllListeners();
    }
}