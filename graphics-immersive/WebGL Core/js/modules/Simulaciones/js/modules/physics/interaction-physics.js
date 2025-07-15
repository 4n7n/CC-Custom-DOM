/**
 * RAMA 5: Interaction Physics Engine
 * Sistema de física para interacciones entre personajes, objetos y entorno
 * @version 1.0.0
 */

import { Vector3, Quaternion, Matrix4 } from '../../../libs/math-utils.js';
import { EventEmitter } from '../../../core/event-emitter.js';
import { CommunityPhysics } from './community-physics.js';

export class InteractionPhysics extends EventEmitter {
    constructor(communityPhysics, options = {}) {
        super();
        
        this.communityPhysics = communityPhysics;
        this.world = communityPhysics.world;
        
        // Configuración de interacciones
        this.config = {
            interactionRange: 3.0,
            pickupRange: 1.5,
            maxCarryWeight: 50.0,
            throwForce: 15.0,
            dragForce: 8.0,
            magneticForce: 5.0,
            telekinesisPower: 100.0,
            ...options
        };
        
        // Sistemas de interacción
        this.activeInteractions = new Map();
        this.carriedObjects = new Map();
        this.magneticFields = new Map();
        this.forceFields = new Map();
        this.triggers = new Map();
        
        // Raycast para interacciones
        this.raycastResults = new Map();
        this.interactionQueries = new Map();
        
        // Configuración de fuerzas
        this.forceTypes = {
            PICKUP: 'pickup',
            DRAG: 'drag',
            THROW: 'throw',
            PUSH: 'push',
            PULL: 'pull',
            MAGNETIC: 'magnetic',
            TELEKINETIC: 'telekinetic',
            GRAVITY: 'gravity'
        };
        
        // Estado de interacciones
        this.interactionState = {
            activeCharacters: new Set(),
            interactableObjects: new Set(),
            activeForces: new Map(),
            constraints: new Map()
        };
        
        // Métricas de rendimiento
        this.metrics = {
            activeInteractions: 0,
            raycastQueries: 0,
            forceCalculations: 0,
            constraintSolves: 0,
            updateTime: 0
        };
        
        this.initializeInteractionSystems();
    }
    
    initializeInteractionSystems() {
        // Configurar listeners del sistema de comunidad
        this.communityPhysics.on('characterAdded', this.onCharacterAdded.bind(this));
        this.communityPhysics.on('collisionStart', this.onCollisionStart.bind(this));
        this.communityPhysics.on('collisionEnd', this.onCollisionEnd.bind(this));
        
        // Inicializar sistemas de interacción
        this.setupInteractionTriggers();
        this.initializeForceFields();
        this.setupConstraintSolver();
        
        console.log('Interaction Physics initialized');
    }
    
    onCharacterAdded(data) {
        const { id, body } = data;
        this.interactionState.activeCharacters.add(id);
        
        // Configurar datos de interacción para el personaje
        body.userData.interaction = {
            canInteract: true,
            interactionRange: this.config.interactionRange,
            carriedObjects: [],
            activeConstraints: [],
            targetObject: null,
            isInteracting: false
        };
        
        this.emit('characterInteractionEnabled', { id, body });
    }
    
    setupInteractionTriggers() {
        // Crear triggers para diferentes tipos de interacción
        this.createInteractionTrigger('pickupZone', {
            shape: 'sphere',
            radius: this.config.pickupRange,
            triggerType: 'pickup',
            persistent: false
        });
        
        this.createInteractionTrigger('interactionZone', {
            shape: 'sphere',
            radius: this.config.interactionRange,
            triggerType: 'general',
            persistent: true
        });
    }
    
    createInteractionTrigger(id, config) {
        const trigger = {
            id,
            shape: config.shape,
            dimensions: config.dimensions || { radius: config.radius },
            triggerType: config.triggerType,
            persistent: config.persistent,
            activeBodies: new Set(),
            callbacks: {
                onEnter: [],
                onExit: [],
                onStay: []
            }
        };
        
        this.triggers.set(id, trigger);
        return trigger;
    }
    
    initializeForceFields() {
        // Configurar campos de fuerza predefinidos
        this.forceFields.set('gravity', {
            type: 'gravity',
            strength: 9.81,
            direction: new Vector3(0, -1, 0),
            falloffType: 'none',
            affectedGroups: ['all']
        });
        
        this.forceFields.set('magnetic', {
            type: 'magnetic',
            strength: 5.0,
            direction: new Vector3(0, 0, 0),
            falloffType: 'quadratic',
            affectedGroups: ['metallic']
        });
    }
    
    setupConstraintSolver() {
        // Configurar solver de restricciones personalizadas
        this.constraintSolver = {
            iterations: 10,
            tolerance: 0.001,
            dampingFactor: 0.1,
            stiffness: 0.8
        };
    }
    
    startInteraction(characterId, targetObjectId, interactionType) {
        const character = this.communityPhysics.communityBodies.get(characterId);
        const targetObject = this.findObjectById(targetObjectId);
        
        if (!character || !targetObject) {
            console.warn('Invalid interaction: character or target not found');
            return false;
        }
        
        const interaction = {
            id: `${characterId}_${targetObjectId}_${Date.now()}`,
            characterId,
            targetObjectId,
            type: interactionType,
            startTime: performance.now(),
            character,
            targetObject,
            constraint: null,
            isActive: true,
            parameters: this.getInteractionParameters(interactionType)
        };
        
        // Verificar si la interacción es posible
        if (!this.canInteract(character, targetObject, interactionType)) {
            return false;
        }
        
        // Configurar la interacción según el tipo
        switch (interactionType) {
            case this.forceTypes.PICKUP:
                this.setupPickupInteraction(interaction);
                break;
            case this.forceTypes.DRAG:
                this.setupDragInteraction(interaction);
                break;
            case this.forceTypes.PUSH:
                this.setupPushInteraction(interaction);
                break;
            case this.forceTypes.PULL:
                this.setupPullInteraction(interaction);
                break;
            case this.forceTypes.TELEKINETIC:
                this.setupTelekineticInteraction(interaction);
                break;
            default:
                this.setupGenericInteraction(interaction);
        }
        
        this.activeInteractions.set(interaction.id, interaction);
        character.userData.interaction.isInteracting = true;
        character.userData.interaction.targetObject = targetObjectId;
        
        this.emit('interactionStarted', interaction);
        return interaction.id;
    }
    
    canInteract(character, targetObject, interactionType) {
        const distance = character.getPosition().distanceTo(targetObject.getPosition());
        const maxRange = this.getInteractionRange(interactionType);
        
        if (distance > maxRange) return false;
        
        // Verificar restricciones específicas
        switch (interactionType) {
            case this.forceTypes.PICKUP:
                return this.canPickupObject(character, targetObject);
            case this.forceTypes.DRAG:
                return this.canDragObject(character, targetObject);
            case this.forceTypes.TELEKINETIC:
                return this.canUseTelekinesis(character, targetObject);
            default:
                return true;
        }
    }
    
    canPickupObject(character, targetObject) {
        const objectMass = targetObject.getMass();
        const characterData = character.userData.interaction;
        const currentCarryWeight = this.getCurrentCarryWeight(character);
        
        return (
            objectMass > 0 && // No estático
            objectMass <= this.config.maxCarryWeight &&
            currentCarryWeight + objectMass <= this.config.maxCarryWeight &&
            characterData.carriedObjects.length < 3 // Máximo 3 objetos
        );
    }
    
    canDragObject(character, targetObject) {
        const objectMass = targetObject.getMass();
        return objectMass > 0 && objectMass <= this.config.maxCarryWeight * 3;
    }
    
    canUseTelekinesis(character, targetObject) {
        return character.userData.abilities && character.userData.abilities.telekinesis;
    }
    
    setupPickupInteraction(interaction) {
        const { character, targetObject } = interaction;
        
        // Crear constraint de pickup
        const constraint = this.world.createConstraint({
            type: 'fixed',
            bodyA: character,
            bodyB: targetObject,
            localAnchorA: new Vector3(0, 0, 0.8), // Frente del personaje
            localAnchorB: new Vector3(0, 0, 0),
            maxForce: 1000,
            stiffness: 0.9,
            damping: 0.1
        });
        
        interaction.constraint = constraint;
        
        // Actualizar estado del personaje
        character.userData.interaction.carriedObjects.push(targetObject.userData.id);
        
        // Configurar objeto transportado
        targetObject.userData.isCarried = true;
        targetObject.userData.carriedBy = character.userData.id;
        
        this.carriedObjects.set(targetObject.userData.id, {
            characterId: character.userData.id,
            constraint: constraint,
            originalMass: targetObject.getMass()
        });
        
        // Reducir masa del objeto para facilitar el transporte
        targetObject.setMass(targetObject.getMass() * 0.1);
    }
    
    setupDragInteraction(interaction) {
        const { character, targetObject } = interaction;
        
        // Crear constraint de arrastre con mayor flexibilidad
        const constraint = this.world.createConstraint({
            type: 'spring',
            bodyA: character,
            bodyB: targetObject,
            localAnchorA: new Vector3(0, 0, 0.5),
            localAnchorB: new Vector3(0, 0, 0),
            restLength: 2.0,
            stiffness: 0.5,
            damping: 0.3,
            maxForce: this.config.dragForce
        });
        
        interaction.constraint = constraint;
        
        // Configurar objeto arrastrado
        targetObject.userData.isDragged = true;
        targetObject.userData.draggedBy = character.userData.id;
        
        // Aplicar fricción reducida durante el arrastre
        const originalFriction = targetObject.getFriction();
        targetObject.setFriction(originalFriction * 0.3);
        interaction.originalFriction = originalFriction;
    }
    
    setupPushInteraction(interaction) {
        const { character, targetObject } = interaction;
        
        // Calcular dirección de empuje
        const direction = targetObject.getPosition().clone()
            .sub(character.getPosition())
            .normalize();
        
        // Aplicar fuerza de empuje
        const pushForce = direction.multiplyScalar(this.config.throwForce);
        targetObject.applyImpulse(pushForce, targetObject.getPosition());
        
        // Configurar interacción temporal
        interaction.duration = 0.1; // 100ms
        interaction.applied = true;
        
        this.emit('pushApplied', {
            characterId: character.userData.id,
            targetId: targetObject.userData.id,
            force: pushForce
        });
    }
    
    setupPullInteraction(interaction) {
        const { character, targetObject } = interaction;
        
        // Calcular dirección de tracción
        const direction = character.getPosition().clone()
            .sub(targetObject.getPosition())
            .normalize();
        
        // Aplicar fuerza de tracción
        const pullForce = direction.multiplyScalar(this.config.dragForce);
        targetObject.applyForce(pullForce, targetObject.getPosition());
        
        // Configurar interacción continua
        interaction.forceVector = pullForce;
        interaction.continuous = true;
    }
    
    setupTelekineticInteraction(interaction) {
        const { character, targetObject } = interaction;
        
        // Crear campo de fuerza telequinético
        const telekineticField = {
            center: character.getPosition(),
            target: targetObject.getPosition(),
            strength: this.config.telekinesisPower,
            range: this.config.interactionRange * 2,
            falloffType: 'linear',
            duration: -1 // Indefinido
        };
        
        interaction.forceField = telekineticField;
        
        // Configurar objeto controlado telequinéticamente
        targetObject.userData.isTelekinetic = true;
        targetObject.userData.controller = character.userData.id;
        
        // Reducir gravedad del objeto
        targetObject.setGravity(new Vector3(0, -2, 0));
    }
    
    setupGenericInteraction(interaction) {
        // Configuración base para interacciones personalizadas
        interaction.parameters = {
            duration: 1.0,
            strength: 1.0,
            range: this.config.interactionRange
        };
    }
    
    updateInteraction(interactionId, deltaTime) {
        const interaction = this.activeInteractions.get(interactionId);
        if (!interaction || !interaction.isActive) return;
        
        // Actualizar según el tipo de interacción
        switch (interaction.type) {
            case this.forceTypes.PICKUP:
                this.updatePickupInteraction(interaction, deltaTime);
                break;
            case this.forceTypes.DRAG:
                this.updateDragInteraction(interaction, deltaTime);
                break;
            case this.forceTypes.PUSH:
                this.updatePushInteraction(interaction, deltaTime);
                break;
            case this.forceTypes.PULL:
                this.updatePullInteraction(interaction, deltaTime);
                break;
            case this.forceTypes.TELEKINETIC:
                this.updateTelekineticInteraction(interaction, deltaTime);
                break;
        }
        
        // Verificar condiciones de finalización
        if (this.shouldEndInteraction(interaction, deltaTime)) {
            this.endInteraction(interactionId);
        }
    }
    
    updatePickupInteraction(interaction, deltaTime) {
        const { character, targetObject, constraint } = interaction;
        
        // Verificar que el constraint sigue siendo válido
        if (!constraint.isActive()) {
            interaction.isActive = false;
            return;
        }
        
        // Ajustar posición del objeto según el movimiento del personaje
        const characterVelocity = character.getLinearVelocity();
        if (characterVelocity.length() > 0.1) {
            // Aplicar amortiguación al objeto transportado
            const objectVelocity = targetObject.getLinearVelocity();
            const dampingForce = objectVelocity.clone().multiplyScalar(-0.5);
            targetObject.applyForce(dampingForce, targetObject.getPosition());
        }
    }
    
    updateDragInteraction(interaction, deltaTime) {
        const { character, targetObject, constraint } = interaction;
        
        if (!constraint.isActive()) {
            interaction.isActive = false;
            return;
        }
        
        // Ajustar longitud del constraint según la velocidad
        const characterVelocity = character.getLinearVelocity();
        const velocityMagnitude = characterVelocity.length();
        
        if (velocityMagnitude > 0.1) {
            const dynamicLength = Math.min(3.0, 1.5 + velocityMagnitude * 0.3);
            constraint.setRestLength(dynamicLength);
        }
        
        // Aplicar fuerza adicional si el objeto se queda atrás
        const distance = character.getPosition().distanceTo(targetObject.getPosition());
        if (distance > 4.0) {
            const pullDirection = character.getPosition().clone()
                .sub(targetObject.getPosition())
                .normalize();
            const additionalForce = pullDirection.multiplyScalar(this.config.dragForce * 0.5);
            targetObject.applyForce(additionalForce, targetObject.getPosition());
        }
    }
    
    updatePushInteraction(interaction, deltaTime) {
        interaction.duration -= deltaTime;
        
        if (interaction.duration <= 0) {
            interaction.isActive = false;
        }
    }
    
    updatePullInteraction(interaction, deltaTime) {
        const { character, targetObject, forceVector } = interaction;
        
        // Recalcular dirección de tracción
        const direction = character.getPosition().clone()
            .sub(targetObject.getPosition())
            .normalize();
        
        const pullForce = direction.multiplyScalar(this.config.dragForce);
        targetObject.applyForce(pullForce, targetObject.getPosition());
        
        interaction.forceVector = pullForce;
    }
    
    updateTelekineticInteraction(interaction, deltaTime) {
        const { character, targetObject, forceField } = interaction;
        
        // Actualizar posición del campo de fuerza
        forceField.center = character.getPosition();
        
        // Calcular fuerza telequinética
        const distance = character.getPosition().distanceTo(targetObject.getPosition());
        const maxRange = forceField.range;
        
        if (distance <= maxRange) {
            const falloffFactor = 1.0 - (distance / maxRange);
            const forceStrength = forceField.strength * falloffFactor;
            
            // Aplicar fuerza hacia el personaje o posición objetivo
            const telekineticTarget = character.userData.telekineticTarget || character.getPosition();
            const direction = telekineticTarget.clone()
                .sub(targetObject.getPosition())
                .normalize();
            
            const telekineticForce = direction.multiplyScalar(forceStrength);
            targetObject.applyForce(telekineticForce, targetObject.getPosition());
            
            // Aplicar fuerza de estabilización
            const velocity = targetObject.getLinearVelocity();
            const stabilizingForce = velocity.clone().multiplyScalar(-0.3);
            targetObject.applyForce(stabilizingForce, targetObject.getPosition());
        }
    }
    
    shouldEndInteraction(interaction, deltaTime) {
        const { character, targetObject } = interaction;
        
        // Verificar distancia
        const distance = character.getPosition().distanceTo(targetObject.getPosition());
        const maxRange = this.getInteractionRange(interaction.type) * 2;
        
        if (distance > maxRange) return true;
        
        // Verificar duración si está definida
        if (interaction.duration !== undefined && interaction.duration <= 0) {
            return true;
        }
        
        // Verificar condiciones específicas
        switch (interaction.type) {
            case this.forceTypes.PICKUP:
                return !this.canPickupObject(character, targetObject);
            case this.forceTypes.DRAG:
                return !this.canDragObject(character, targetObject);
            case this.forceTypes.TELEKINETIC:
                return !this.canUseTelekinesis(character, targetObject);
            default:
                return false;
        }
    }
    
    endInteraction(interactionId) {
        const interaction = this.activeInteractions.get(interactionId);
        if (!interaction) return;
        
        const { character, targetObject } = interaction;
        
        // Limpiar constraint si existe
        if (interaction.constraint) {
            this.world.removeConstraint(interaction.constraint);
        }
        
        // Restaurar propiedades del objeto
        this.restoreObjectProperties(targetObject, interaction);
        
        // Limpiar estado del personaje
        character.userData.interaction.isInteracting = false;
        character.userData.interaction.targetObject = null;
        
        // Remover objeto transportado si aplica
        if (interaction.type === this.forceTypes.PICKUP) {
            const carriedObjects = character.userData.interaction.carriedObjects;
            const index = carriedObjects.indexOf(targetObject.userData.id);
            if (index > -1) {
                carriedObjects.splice(index, 1);
            }
            this.carriedObjects.delete(targetObject.userData.id);
        }
        
        // Marcar como inactiva
        interaction.isActive = false;
        
        this.emit('interactionEnded', interaction);
        this.activeInteractions.delete(interactionId);
    }
    
    restoreObjectProperties(targetObject, interaction) {
        // Restaurar propiedades físicas originales
        switch (interaction.type) {
            case this.forceTypes.PICKUP:
                if (this.carriedObjects.has(targetObject.userData.id)) {
                    const carriedData = this.carriedObjects.get(targetObject.userData.id);
                    targetObject.setMass(carriedData.originalMass);
                }
                targetObject.userData.isCarried = false;
                targetObject.userData.carriedBy = null;
                break;
                
            case this.forceTypes.DRAG:
                if (interaction.originalFriction !== undefined) {
                    targetObject.setFriction(interaction.originalFriction);
                }
                targetObject.userData.isDragged = false;
                targetObject.userData.draggedBy = null;
                break;
                
            case this.forceTypes.TELEKINETIC:
                targetObject.setGravity(new Vector3(0, -9.81, 0));
                targetObject.userData.isTelekinetic = false;
                targetObject.userData.controller = null;
                break;
        }
    }
    
    throwObject(characterId, targetObjectId, direction, force) {
        const interaction = this.findActiveInteraction(characterId, targetObjectId);
        if (!interaction || interaction.type !== this.forceTypes.PICKUP) {
            return false;
        }
        
        const { character, targetObject } = interaction;
        
        // Finalizar interacción de pickup
        this.endInteraction(interaction.id);
        
        // Aplicar fuerza de lanzamiento
        const throwForce = direction.normalize().multiplyScalar(force || this.config.throwForce);
        targetObject.applyImpulse(throwForce, targetObject.getPosition());
        
        // Configurar objeto lanzado
        targetObject.userData.isThrown = true;
        targetObject.userData.thrownBy = characterId;
        targetObject.userData.throwTime = performance.now();
        
        this.emit('objectThrown', {
            characterId,
            objectId: targetObjectId,
            force: throwForce,
            direction: direction
        });
        
        return true;
    }
    
    createMagneticField(position, strength, radius, affectedMaterials = ['metal']) {
        const fieldId = `magnetic_${Date.now()}`;
        
        const magneticField = {
            id: fieldId,
            position: position.clone(),
            strength: strength,
            radius: radius,
            affectedMaterials: affectedMaterials,
            activeBodies: new Set(),
            falloffType: 'quadratic'
        };
        
        this.magneticFields.set(fieldId, magneticField);
        
        this.emit('magneticFieldCreated', magneticField);
        return fieldId;
    }
    
    updateMagneticFields(deltaTime) {
        this.magneticFields.forEach(field => {
            // Buscar objetos afectados en el rango
            const affectedBodies = this.findBodiesInRange(field.position, field.radius);
            
            affectedBodies.forEach(body => {
                if (this.isBodyAffectedByMagneticField(body, field)) {
                    const distance = body.getPosition().distanceTo(field.position);
                    const falloffFactor = this.calculateFalloff(distance, field.radius, field.falloffType);
                    
                    // Calcular fuerza magnética
                    const direction = field.position.clone()
                        .sub(body.getPosition())
                        .normalize();
                    
                    const magneticForce = direction.multiplyScalar(
                        field.strength * falloffFactor * body.getMass() * 0.1
                    );
                    
                    body.applyForce(magneticForce, body.getPosition());
                    
                    if (!field.activeBodies.has(body.userData.id)) {
                        field.activeBodies.add(body.userData.id);
                        this.emit('bodyEnteredMagneticField', {
                            fieldId: field.id,
                            bodyId: body.userData.id
                        });
                    }
                }
            });
        });
    }
    
    isBodyAffectedByMagneticField(body, field) {
        const material = body.userData.material || 'default';
        return field.affectedMaterials.includes(material) || 
               field.affectedMaterials.includes('all');
    }
    
    calculateFalloff(distance, maxRange, falloffType) {
        const normalizedDistance = Math.min(distance / maxRange, 1.0);
        
        switch (falloffType) {
            case 'linear':
                return 1.0 - normalizedDistance;
            case 'quadratic':
                return 1.0 - normalizedDistance * normalizedDistance;
            case 'cubic':
                return 1.0 - normalizedDistance * normalizedDistance * normalizedDistance;
            case 'exponential':
                return Math.exp(-normalizedDistance * 3.0);
            default:
                return 1.0;
        }
    }
    
    findBodiesInRange(position, radius) {
        const bodies = [];
        
        // Buscar en todos los sistemas de cuerpos
        this.communityPhysics.communityBodies.forEach(body => {
            if (body.getPosition().distanceTo(position) <= radius) {
                bodies.push(body);
            }
        });
        
        this.communityPhysics.buildingBodies.forEach(body => {
            if (body.getPosition().distanceTo(position) <= radius) {
                bodies.push(body);
            }
        });
        
        return bodies;
    }
    
    findActiveInteraction(characterId, targetObjectId) {
        for (const [id, interaction] of this.activeInteractions) {
            if (interaction.characterId === characterId && 
                interaction.targetObjectId === targetObjectId &&
                interaction.isActive) {
                return interaction;
            }
        }
        return null;
    }
    
    findObjectById(objectId) {
        // Buscar en cuerpos de comunidad
        const communityBody = this.communityPhysics.communityBodies.get(objectId);
        if (communityBody) return communityBody;
        
        // Buscar en edificios
        const buildingBody = this.communityPhysics.buildingBodies.get(objectId);
        if (buildingBody) return buildingBody;
        
        // Buscar en elementos ambientales
        const envBody = this.communityPhysics.environmentBodies.get(objectId);
        if (envBody) return Array.isArray(envBody) ? envBody[0] : envBody;
        
        return null;
    }
    
    getInteractionRange(interactionType) {
        const ranges = {
            [this.forceTypes.PICKUP]: this.config.pickupRange,
            [this.forceTypes.DRAG]: this.config.interactionRange,
            [this.forceTypes.PUSH]: this.config.interactionRange * 0.8,
            [this.forceTypes.PULL]: this.config.interactionRange,
            [this.forceTypes.TELEKINETIC]: this.config.interactionRange * 2,
            [this.forceTypes.MAGNETIC]: this.config.interactionRange * 1.5
        };
        
        return ranges[interactionType] || this.config.interactionRange;
    }
    
    getInteractionParameters(interactionType) {
        const parameters = {
            [this.forceTypes.PICKUP]: {
                maxWeight: this.config.maxCarryWeight,
                attachmentPoint: new Vector3(0, 0, 0.8)
            },
            [this.forceTypes.DRAG]: {
                maxForce: this.config.dragForce,
                springLength: 2.0,
                damping: 0.3
            },
            [this.forceTypes.PUSH]: {
                force: this.config.throwForce,
                duration: 0.1
            },
            [this.forceTypes.PULL]: {
                force: this.config.dragForce,
                continuous: true
            },
            [this.forceTypes.TELEKINETIC]: {
                power: this.config.telekinesisPower,
                range: this.config.interactionRange * 2
            }
        };
        
        return parameters[interactionType] || {};
    }
    
    getCurrentCarryWeight(character) {
        const carriedObjects = character.userData.interaction.carriedObjects;
        let totalWeight = 0;
        
        carriedObjects.forEach(objectId => {
            const object = this.findObjectById(objectId);
            if (object) {
                totalWeight += object.getMass();
            }
        });
        
        return totalWeight;
    }
    
    onCollisionStart(data) {
        const { bodyA, bodyB } = data;
        
        // Detectar colisiones relevantes para interacciones
        if (bodyA.type === 'character' && bodyB.type === 'interactable') {
            this.emit('interactableEntered', {
                characterId: bodyA.id,
                objectId: bodyB.id
            });
        }
        
        // Manejar objetos lanzados
        if (bodyA.isThrown || bodyB.isThrown) {
            this.handleThrownObjectCollision(bodyA, bodyB, data.contact);
        }
    }
    
    onCollisionEnd(data) {
        const { bodyA, bodyB } = data;
        
        if (bodyA.type === 'character' && bodyB.type === 'interactable') {
            this.emit('interactableExited', {
                characterId: bodyA.id,
                objectId: bodyB.id
            });
        }
    }
    
    handleThrownObjectCollision(bodyA, bodyB, contact) {
        const thrownBody = bodyA.isThrown ? bodyA : bodyB;
        const targetBody = bodyA.isThrown ? bodyB : bodyA;
        
        const impactVelocity = contact.getImpactVelocity();
        const damage = Math.min(impactVelocity * 2, 50);
        
        // Aplicar daño si el objetivo puede recibirlo
        if (targetBody.userData.health !== undefined) {
            targetBody.userData.health -= damage;
        }
        
        // Limpiar estado de objeto lanzado
        thrownBody.userData.isThrown = false;
        thrownBody.userData.thrownBy = null;
        thrownBody.userData.throwTime = null;
        
        this.emit('thrownObjectImpact', {
            thrownObjectId: thrownBody.userData.id,
            targetId: targetBody.userData.id,
            damage: damage,
            impact: impactVelocity,
            position: contact.getPosition()
        });
    }
    
    update(deltaTime) {
        const startTime = performance.now();
        
        // Actualizar interacciones activas
        this.activeInteractions.forEach((interaction, id) => {
            if (interaction.isActive) {
                this.updateInteraction(id, deltaTime);
                this.metrics.activeInteractions++;
            }
        });
        
        // Actualizar campos magnéticos
        this.updateMagneticFields(deltaTime);
        
        // Actualizar métricas
        this.metrics.updateTime = performance.now() - startTime;
        this.metrics.activeInteractions = this.activeInteractions.size;
        
        this.emit('interactionUpdate', {
            deltaTime: deltaTime,
            metrics: this.metrics
        });
        
        // Limpiar métricas para el próximo frame
        this.metrics.raycastQueries = 0;
        this.metrics.forceCalculations = 0;
        this.metrics.constraintSolves = 0;
    }
    
    getMetrics() {
        return { ...this.metrics };
    }
    
    dispose() {
        // Finalizar todas las interacciones activas
        this.activeInteractions.forEach((interaction, id) => {
            this.endInteraction(id);
        });
        
        // Limpiar campos magnéticos
        this.magneticFields.clear();
        this.forceFields.clear();
        this.triggers.clear();
        
        // Limpiar estado
        this.carriedObjects.clear();
        this.interactionState.activeCharacters.clear();
        this.interactionState.interactableObjects.clear();
        this.interactionState.activeForces.clear();
        this.interactionState.constraints.clear();
        
        // Remover listeners
        this.removeAllListeners();
        
        console.log('Interaction Physics disposed');
    }
}