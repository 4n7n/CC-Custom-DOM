/*
 * Community Scenes Vertex Shader
 * Shader para renderizar escenas de comunidades con efectos avanzados
 */

#version 300 es

// Atributos de vértice
in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;
in vec3 a_tangent;
in vec3 a_bitangent;
in vec4 a_color;

// Matrices de transformación
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;
uniform mat4 u_lightSpaceMatrix;

// Parámetros de la cámara
uniform vec3 u_cameraPosition;
uniform float u_time;
uniform float u_deltaTime;

// Parámetros de animación
uniform float u_windStrength;
uniform float u_windFrequency;
uniform vec3 u_windDirection;
uniform float u_waveAmplitude;
uniform float u_waveFrequency;
uniform float u_waveSpeed;

// Configuración de efectos
uniform bool u_enableVertexAnimation;
uniform bool u_enableWind;
uniform bool u_enableWaves;
uniform bool u_enableFog;
uniform float u_morphWeight;

// Instancing (para renderizado eficiente de múltiples objetos)
#ifdef USE_INSTANCING
in mat4 a_instanceMatrix;
in vec3 a_instanceColor;
#endif

// Skinning (para animación de personajes)
#ifdef USE_SKINNING
in vec4 a_skinIndices;
in vec4 a_skinWeights;
uniform mat4 u_boneMatrices[64];
#endif

// Morph targets (para animación facial/gestos)
#ifdef USE_MORPHING
in vec3 a_morphTarget0;
in vec3 a_morphTarget1;
in vec3 a_morphNormal0;
in vec3 a_morphNormal1;
uniform float u_morphInfluences[8];
#endif

// Variables de salida al fragment shader
out vec3 v_worldPosition;
out vec3 v_viewPosition;
out vec3 v_normal;
out vec2 v_texCoord;
out vec4 v_color;
out vec4 v_lightSpacePos;
out vec3 v_tangent;
out vec3 v_bitangent;
out mat3 v_tbn;
out float v_fogDepth;
out vec3 v_windEffect;

// Funciones de utilidad
vec3 applyWind(vec3 position, vec3 normal, float strength) {
    float windTime = u_time * u_windFrequency;
    
    // Efecto de viento basado en posición y tiempo
    vec3 windOffset = vec3(
        sin(windTime + position.x * 0.1) * strength,
        cos(windTime * 0.7 + position.z * 0.1) * strength * 0.5,
        sin(windTime * 0.5 + position.x * 0.05) * strength
    );
    
    // El viento afecta más a los vértices superiores
    float heightFactor = clamp(position.y * 0.1, 0.0, 1.0);
    windOffset *= heightFactor;
    
    // Aplicar dirección del viento
    windOffset = mix(windOffset, u_windDirection * strength * heightFactor, 0.5);
    
    return position + windOffset;
}

vec3 applyWaves(vec3 position, float amplitude, float frequency, float speed) {
    float waveTime = u_time * speed;
    
    // Ondas senoidales múltiples para efecto más natural
    float wave1 = sin(position.x * frequency + waveTime) * amplitude;
    float wave2 = cos(position.z * frequency * 0.7 + waveTime * 1.3) * amplitude * 0.6;
    float wave3 = sin((position.x + position.z) * frequency * 0.5 + waveTime * 0.8) * amplitude * 0.4;
    
    return position + vec3(0.0, wave1 + wave2 + wave3, 0.0);
}

vec3 applySkinning(vec3 position, vec3 normal) {
    #ifdef USE_SKINNING
    mat4 skinMatrix = 
        a_skinWeights.x * u_boneMatrices[int(a_skinIndices.x)] +
        a_skinWeights.y * u_boneMatrices[int(a_skinIndices.y)] +
        a_skinWeights.z * u_boneMatrices[int(a_skinIndices.z)] +
        a_skinWeights.w * u_boneMatrices[int(a_skinIndices.w)];
    
    vec4 skinnedPosition = skinMatrix * vec4(position, 1.0);
    return skinnedPosition.xyz;
    #else
    return position;
    #endif
}

vec3 applyMorphing(vec3 position, vec3 normal) {
    #ifdef USE_MORPHING
    vec3 morphedPosition = position;
    vec3 morphedNormal = normal;
    
    // Aplicar morph targets
    morphedPosition += a_morphTarget0 * u_morphInfluences[0];
    morphedPosition += a_morphTarget1 * u_morphInfluences[1];
    
    morphedNormal += a_morphNormal0 * u_morphInfluences[0];
    morphedNormal += a_morphNormal1 * u_morphInfluences[1];
    
    return morphedPosition;
    #else
    return position;
    #endif
}

// Función para calcular efectos de iluminación volumétrica
vec3 calculateVolumetricLighting(vec3 worldPos, vec3 viewPos) {
    float distance = length(viewPos);
    float fogFactor = 1.0 - exp(-distance * 0.001);
    
    // Rayos de luz procedurales
    float rayEffect = sin(worldPos.x * 0.1 + u_time * 0.5) * 
                     cos(worldPos.z * 0.1 + u_time * 0.3);
    rayEffect = pow(abs(rayEffect), 3.0) * 0.3;
    
    return vec3(rayEffect * fogFactor);
}

// Función para efectos de paralaje en comunidades
vec2 calculateCommunityParallax(vec2 texCoord, vec3 viewDir) {
    // Efecto de paralaje para dar profundidad a las texturas de edificios
    float heightScale = 0.02;
    float height = texture(u_heightMap, texCoord).r;
    vec2 p = viewDir.xy / viewDir.z * (height * heightScale);
    return texCoord - p;
}

// Función para animación de estructuras (banderas, antenas, etc.)
vec3 animateStructures(vec3 position, vec3 normal) {
    // Animación basada en la altura (para elementos como banderas)
    float heightFactor = position.y * 0.1;
    float structureWave = sin(u_time * 2.0 + position.x * 0.5) * heightFactor * 0.02;
    
    return position + normal * structureWave;
}

// Función principal del vertex shader
void main() {
    // Inicializar posición y normal
    vec3 position = a_position;
    vec3 normal = a_normal;
    
    // Aplicar morph targets si están habilitados
    position = applyMorphing(position, normal);
    
    // Aplicar skinning para animaciones de personajes
    position = applySkinning(position, normal);
    
    // Aplicar efectos de viento si están habilitados
    if (u_enableWind && u_windStrength > 0.0) {
        position = applyWind(position, normal, u_windStrength);
        v_windEffect = position - a_position; // Guardar el efecto del viento
    } else {
        v_windEffect = vec3(0.0);
    }
    
    // Aplicar ondas para elementos como agua o tela
    if (u_enableWaves) {
        position = applyWaves(position, u_waveAmplitude, u_waveFrequency, u_waveSpeed);
    }
    
    // Animación de estructuras (banderas, carteles, etc.)
    if (u_enableVertexAnimation) {
        position = animateStructures(position, normal);
    }
    
    // Calcular matriz de modelo (con instancing si está habilitado)
    mat4 modelMatrix = u_modelMatrix;
    
    #ifdef USE_INSTANCING
    modelMatrix = modelMatrix * a_instanceMatrix;
    v_color = vec4(a_instanceColor, 1.0) * a_color;
    #else
    v_color = a_color;
    #endif
    
    // Transformar posición al espacio mundial
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    v_worldPosition = worldPosition.xyz;
    
    // Transformar al espacio de vista
    vec4 viewPosition = u_viewMatrix * worldPosition;
    v_viewPosition = viewPosition.xyz;
    
    // Calcular profundidad de niebla
    if (u_enableFog) {
        v_fogDepth = length(v_viewPosition);
    } else {
        v_fogDepth = 0.0;
    }
    
    // Transformar normal, tangente y bitangente
    mat3 normalMatrix = u_normalMatrix;
    #ifdef USE_INSTANCING
    // Calcular normal matrix para instancing
    normalMatrix = mat3(transpose(inverse(mat3(modelMatrix))));
    #endif
    
    v_normal = normalize(normalMatrix * normal);
    v_tangent = normalize(normalMatrix * a_tangent);
    v_bitangent = normalize(normalMatrix * a_bitangent);
    
    // Construir matriz TBN para normal mapping
    v_tbn = mat3(v_tangent, v_bitangent, v_normal);
    
    // Pasar coordenadas de textura
    v_texCoord = a_texCoord;
    
    // Calcular posición en espacio de luz para sombras
    v_lightSpacePos = u_lightSpaceMatrix * worldPosition;
    
    // Transformación final a espacio de clip
    gl_Position = u_projectionMatrix * viewPosition;
    
    // Ajustes finales para efectos especiales
    #ifdef USE_POINT_SIZE
    // Para renderizado de partículas o efectos de puntos
    float distance = length(v_viewPosition);
    gl_PointSize = 10.0 / (1.0 + distance * 0.1);
    #endif
}

// Funciones adicionales para efectos específicos de comunidades

// Efecto de construcción procedural (para mostrar edificios en construcción)
vec3 constructionEffect(vec3 position, float buildProgress) {
    // Efecto de "construcción" que hace aparecer gradualmente los vértices
    float height = position.y;
    float maxHeight = 10.0; // Altura máxima del edificio
    float currentHeight = buildProgress * maxHeight;
    
    if (height > currentHeight) {
        // Vértices por encima del progreso de construcción se ocultan
        return position + vec3(0.0, -1000.0, 0.0);
    }
    
    // Efecto de "materialización" cerca del borde de construcción
    float edgeDistance = currentHeight - height;
    if (edgeDistance < 1.0) {
        float shimmer = sin(u_time * 10.0 + position.x + position.z) * 0.1;
        return position + vec3(shimmer, 0.0, shimmer);
    }
    
    return position;
}

// Efecto de crecimiento orgánico (para vegetación)
vec3 organicGrowth(vec3 position, vec3 normal, float growthFactor) {
    // Simula crecimiento natural de plantas y árboles
    float heightInfluence = position.y * 0.1;
    float growthOffset = growthFactor * heightInfluence;
    
    // Añadir variación orgánica
    float organicNoise = sin(position.x * 2.0 + u_time * 0.5) * 
                        cos(position.z * 2.0 + u_time * 0.3) * 0.02;
    
    return position + normal * (growthOffset + organicNoise);
}

// Efecto de partículas atmosféricas (polvo, humo)
vec3 atmosphericParticles(vec3 position) {
    // Movimiento de partículas en el aire
    vec3 particleOffset = vec3(
        sin(u_time * 0.5 + position.x * 0.1) * 0.05,
        cos(u_time * 0.3 + position.y * 0.1) * 0.03,
        sin(u_time * 0.4 + position.z * 0.1) * 0.05
    );
    
    return position + particleOffset;
}