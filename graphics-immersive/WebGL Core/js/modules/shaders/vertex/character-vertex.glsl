/*
 * Character Vertex Shader
 * Shader especializado para renderizado de personajes con animación avanzada
 */

#version 300 es

// Atributos de vértice
in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;
in vec3 a_tangent;
in vec4 a_color;

// Skinning (animación esquelética)
in vec4 a_skinIndices;
in vec4 a_skinWeights;
in vec4 a_skinIndices2;
in vec4 a_skinWeights2;

// Morph targets (expresiones faciales)
in vec3 a_morphTarget0;
in vec3 a_morphTarget1;
in vec3 a_morphTarget2;
in vec3 a_morphTarget3;
in vec3 a_morphNormal0;
in vec3 a_morphNormal1;

// Matrices de transformación
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;
uniform mat4 u_lightSpaceMatrix;

// Matrices de huesos (máximo 128 huesos para personajes complejos)
uniform mat4 u_boneMatrices[128];
uniform mat3 u_normalBoneMatrices[128];

// Influencias de morph targets
uniform float u_morphInfluences[16];

// Parámetros de animación
uniform float u_time;
uniform float u_animationSpeed;
uniform bool u_enableSecondaryAnimation;
uniform bool u_enableClothSimulation;
uniform bool u_enableHairPhysics;

// Parámetros de personaje
uniform vec3 u_characterScale;
uniform float u_characterHeight;
uniform float u_breathingIntensity;
uniform float u_heartbeatRate;
uniform vec3 u_emotionalState; // x: happiness, y: fear, z: anger

// Física secundaria
uniform float u_clothStiffness;
uniform float u_hairStiffness;
uniform vec3 u_windForce;
uniform float u_movementIntensity;

// Configuración de calidad
uniform int u_skinningQuality; // 0: low, 1: medium, 2: high
uniform bool u_enableSubsurfaceSetup;
uniform bool u_enableMuscleTension;

// Variables de salida
out vec3 v_worldPosition;
out vec3 v_viewPosition;
out vec3 v_normal;
out vec2 v_texCoord;
out vec4 v_color;
out vec4 v_lightSpacePos;
out vec3 v_tangent;
out vec3 v_bitangent;
out mat3 v_tbn;

// Variables específicas para personajes
out float v_skinDepth;
out vec3 v_muscleTension;
out float v_bloodFlow;
out vec2 v_facialAnimation;
out vec3 v_secondaryMotion;

// Funciones de skinning avanzado
vec4 applySkinning(vec3 position, bool useEightBones) {
    vec4 skinnedPosition = vec4(0.0);
    
    if (useEightBones && u_skinningQuality >= 2) {
        // Skinning de alta calidad con 8 influencias de huesos
        skinnedPosition += (u_boneMatrices[int(a_skinIndices.x)] * vec4(position, 1.0)) * a_skinWeights.x;
        skinnedPosition += (u_boneMatrices[int(a_skinIndices.y)] * vec4(position, 1.0)) * a_skinWeights.y;
        skinnedPosition += (u_boneMatrices[int(a_skinIndices.z)] * vec4(position, 1.0)) * a_skinWeights.z;
        skinnedPosition += (u_boneMatrices[int(a_skinIndices.w)] * vec4(position, 1.0)) * a_skinWeights.w;
        
        skinnedPosition += (u_boneMatrices[int(a_skinIndices2.x)] * vec4(position, 1.0)) * a_skinIndices2.x;
        skinnedPosition += (u_boneMatrices[int(a_skinIndices2.y)] * vec4(position, 1.0)) * a_skinIndices2.y;
        skinnedPosition += (u_boneMatrices[int(a_skinIndices2.z)] * vec4(position, 1.0)) * a_skinIndices2.z;
        skinnedPosition += (u_boneMatrices[int(a_skinIndices2.w)] * vec4(position, 1.0)) * a_skinIndices2.w;
    } else {
        // Skinning estándar con 4 influencias de huesos
        skinnedPosition += (u_boneMatrices[int(a_skinIndices.x)] * vec4(position, 1.0)) * a_skinWeights.x;
        skinnedPosition += (u_boneMatrices[int(a_skinIndices.y)] * vec4(position, 1.0)) * a_skinWeights.y;
        skinnedPosition += (u_boneMatrices[int(a_skinIndices.z)] * vec4(position, 1.0)) * a_skinWeights.z;
        skinnedPosition += (u_boneMatrices[int(a_skinIndices.w)] * vec4(position, 1.0)) * a_skinWeights.w;
    }
    
    return skinnedPosition;
}

vec3 applyNormalSkinning(vec3 normal) {
    vec3 skinnedNormal = vec3(0.0);
    
    skinnedNormal += (u_normalBoneMatrices[int(a_skinIndices.x)] * normal) * a_skinWeights.x;
    skinnedNormal += (u_normalBoneMatrices[int(a_skinIndices.y)] * normal) * a_skinWeights.y;
    skinnedNormal += (u_normalBoneMatrices[int(a_skinIndices.z)] * normal) * a_skinWeights.z;
    skinnedNormal += (u_normalBoneMatrices[int(a_skinIndices.w)] * normal) * a_skinWeights.w;
    
    return normalize(skinnedNormal);
}

// Función para aplicar morph targets (expresiones faciales)
vec3 applyMorphTargets(vec3 position, vec3 normal) {
    vec3 morphedPosition = position;
    vec3 morphedNormal = normal;
    
    // Aplicar hasta 4 morph targets principales
    morphedPosition += a_morphTarget0 * u_morphInfluences[0];
    morphedPosition += a_morphTarget1 * u_morphInfluences[1];
    morphedPosition += a_morphTarget2 * u_morphInfluences[2];
    morphedPosition += a_morphTarget3 * u_morphInfluences[3];
    
    // Aplicar normales de morph targets
    morphedNormal += a_morphNormal0 * u_morphInfluences[0];
    morphedNormal += a_morphNormal1 * u_morphInfluences[1];
    
    return morphedPosition;
}

// Animación de respiración
vec3 applyBreathing(vec3 position, vec3 normal) {
    float breathingCycle = sin(u_time * u_heartbeatRate * 0.25) * u_breathingIntensity;
    
    // Afectar principalmente el torso y abdomen
    float torsoInfluence = smoothstep(0.3, 0.8, position.y / u_characterHeight);
    vec3 breathingOffset = normal * breathingCycle * torsoInfluence * 0.01;
    
    return position + breathingOffset;
}

// Latido del corazón (sutil movimiento del pecho)
vec3 applyHeartbeat(vec3 position, vec3 normal) {
    float heartbeat = sin(u_time * u_heartbeatRate) * 0.005;
    
    // Afectar solo la zona del pecho
    float chestInfluence = smoothstep(0.6, 0.75, position.y / u_characterHeight) *
                          (1.0 - smoothstep(0.0, 0.3, abs(position.x)));
    
    return position + normal * heartbeat * chestInfluence;
}

// Tensión muscular basada en la animación
vec3 calculateMuscleTension(vec3 position, vec4 skinIndices, vec4 skinWeights) {
    vec3 tension = vec3(0.0);
    
    if (u_enableMuscleTension) {
        // Calcular tensión basada en la velocidad de cambio de los huesos
        float boneActivity = 0.0;
        boneActivity += length(u_boneMatrices[int(skinIndices.x)][3].xyz) * skinWeights.x;
        boneActivity += length(u_boneMatrices[int(skinIndices.y)][3].xyz) * skinWeights.y;
        boneActivity += length(u_boneMatrices[int(skinIndices.z)][3].xyz) * skinWeights.z;
        boneActivity += length(u_boneMatrices[int(skinIndices.w)][3].xyz) * skinWeights.w;
        
        tension = vec3(boneActivity * u_movementIntensity);
    }
    
    return tension;
}

// Simulación de cabello y tela
vec3 applySecondaryAnimation(vec3 position, vec3 normal) {
    vec3 secondaryOffset = vec3(0.0);
    
    if (u_enableSecondaryAnimation) {
        // Simulación simplificada de física secundaria
        float flexibility = 1.0; // Depende del tipo de material
        
        if (u_enableHairPhysics) {
            // Física de cabello
            flexibility *= u_hairStiffness;
            float hairWave = sin(u_time * 2.0 + position.y * 0.5) * 0.02;
            secondaryOffset += vec3(hairWave, 0.0, hairWave * 0.5) * flexibility;
        }
        
        if (u_enableClothSimulation) {
            // Física de ropa
            flexibility *= u_clothStiffness;
            vec3 windEffect = u_windForce * sin(u_time + position.x * 0.1) * 0.05;
            secondaryOffset += windEffect * flexibility;
        }
        
        // Inercia del movimiento
        float inertia = sin(u_time * u_animationSpeed + position.y) * u_movementIntensity * 0.01;
        secondaryOffset += vec3(inertia, 0.0, inertia * 0.3);
    }
    
    return secondaryOffset;
}

// Deformación emocional sutil
vec3 applyEmotionalDeformation(vec3 position) {
    vec3 emotional = vec3(0.0);
    
    // Felicidad: ligera expansión
    emotional += u_emotionalState.x * normal * 0.002;
    
    // Miedo: contracción
    emotional -= u_emotionalState.y * normal * 0.001;
    
    // Ira: tensión en áreas específicas
    float angerTension = u_emotionalState.z * sin(u_time * 5.0) * 0.001;
    emotional += vec3(0.0, angerTension, 0.0);
    
    return emotional;
}

// Cálculo de profundidad de piel para subsurface scattering
float calculateSkinDepth(vec3 position, vec3 normal) {
    if (!u_enableSubsurfaceSetup) {
        return 0.0;
    }
    
    // Profundidad basada en la curvatura de la superficie
    float curvature = length(fwidth(normal));
    float thickness = 0.1 + curvature * 0.05;
    
    // Áreas más delgadas (orejas, nariz, dedos)
    float thinAreas = smoothstep(0.8, 1.0, position.y / u_characterHeight);
    thickness *= mix(1.0, 0.3, thinAreas);
    
    return thickness;
}

// Simulación de flujo sanguíneo
float calculateBloodFlow(vec3 position) {
    // Flujo sanguíneo basado en latidos del corazón
    float heartPulse = sin(u_time * u_heartbeatRate) * 0.5 + 0.5;
    
    // Mayor flujo en extremidades cuando hay movimiento
    float extremityFlow = smoothstep(0.0, 0.3, length(position.xz)) * u_movementIntensity;
    
    return mix(0.3, 1.0, heartPulse + extremityFlow * 0.3);
}

// Función principal
void main() {
    // Inicializar posición y normal
    vec3 position = a_position * u_characterScale;
    vec3 normal = a_normal;
    
    // Aplicar morph targets para expresiones faciales
    position = applyMorphTargets(position, normal);
    
    // Aplicar skinning (animación esquelética)
    vec4 skinnedPosition = applySkinning(position, u_skinningQuality >= 2);
    position = skinnedPosition.xyz;
    normal = applyNormalSkinning(normal);
    
    // Aplicar animaciones procedurales
    position = applyBreathing(position, normal);
    position = applyHeartbeat(position, normal);
    
    // Aplicar deformación emocional sutil
    position += applyEmotionalDeformation(position);
    
    // Aplicar animación secundaria (cabello, ropa)
    vec3 secondaryOffset = applySecondaryAnimation(position, normal);
    position += secondaryOffset;
    v_secondaryMotion = secondaryOffset;
    
    // Transformaciones de matriz
    vec4 worldPosition = u_modelMatrix * vec4(position, 1.0);
    v_worldPosition = worldPosition.xyz;
    
    vec4 viewPosition = u_viewMatrix * worldPosition;
    v_viewPosition = viewPosition.xyz;
    
    // Transformar normales y tangentes
    v_normal = normalize(u_normalMatrix * normal);
    v_tangent = normalize(u_normalMatrix * a_tangent);
    v_bitangent = cross(v_normal, v_tangent);
    v_tbn = mat3(v_tangent, v_bitangent, v_normal);
    
    // Pasar coordenadas de textura y color
    v_texCoord = a_texCoord;
    v_color = a_color;
    
    // Calcular datos específicos de personajes
    v_skinDepth = calculateSkinDepth(position, normal);
    v_muscleTension = calculateMuscleTension(position, a_skinIndices, a_skinWeights);
    v_bloodFlow = calculateBloodFlow(position);
    
    // Datos para animación facial
    v_facialAnimation = vec2(u_morphInfluences[0], u_morphInfluences[1]);
    
    // Posición en espacio de luz para sombras
    v_lightSpacePos = u_lightSpaceMatrix * worldPosition;
    
    // Transformación final
    gl_Position = u_projectionMatrix * viewPosition;
    
    // Ajuste de tamaño de punto para cabello/pelo facial
    #ifdef HAIR_RENDERING
    float distance = length(v_viewPosition);
    gl_PointSize = mix(3.0, 1.0, distance / 50.0);
    #endif
}