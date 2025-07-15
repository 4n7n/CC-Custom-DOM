/*
 * Community Lighting Fragment Shader
 * Sistema de iluminación avanzado para escenas de comunidades
 */

#version 300 es
precision highp float;

// Definiciones de tipos de luz
#define LIGHT_DIRECTIONAL 0
#define LIGHT_POINT 1
#define LIGHT_SPOT 2
#define LIGHT_AREA 3

// Número máximo de luces
#define MAX_LIGHTS 16
#define MAX_SHADOWS 4

// Estructura de luz
struct Light {
    int type;
    vec3 position;
    vec3 direction;
    vec3 color;
    float intensity;
    float range;
    float spotAngle;
    float spotPenumbra;
    bool castShadows;
    int shadowMapIndex;
};

// Variables de entrada del vertex shader
in vec3 v_worldPosition;
in vec3 v_viewPosition;
in vec3 v_normal;
in vec2 v_texCoord;
in vec4 v_color;
in vec4 v_lightSpacePos;
in mat3 v_tbn;
in float v_fogDepth;
in vec3 v_windEffect;

// Uniforms de iluminación
uniform Light u_lights[MAX_LIGHTS];
uniform int u_numLights;
uniform vec3 u_ambientColor;
uniform float u_ambientIntensity;

// Uniforms de cámara
uniform vec3 u_cameraPosition;
uniform float u_time;

// Material uniforms
uniform vec3 u_albedo;
uniform float u_metallic;
uniform float u_roughness;
uniform float u_ao;
uniform vec3 u_emissive;
uniform float u_emissiveIntensity;
uniform float u_normalScale;

// Texturas
uniform sampler2D u_albedoMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_metallicRoughnessMap;
uniform sampler2D u_aoMap;
uniform sampler2D u_emissiveMap;
uniform sampler2D u_heightMap;

// Shadow maps
uniform sampler2D u_shadowMaps[MAX_SHADOWS];
uniform mat4 u_lightSpaceMatrices[MAX_SHADOWS];

// Iluminación basada en imagen (IBL)
uniform samplerCube u_environmentMap;
uniform samplerCube u_irradianceMap;
uniform samplerCube u_prefilterMap;
uniform sampler2D u_brdfLUT;
uniform float u_environmentIntensity;

// Parámetros atmosféricos
uniform vec3 u_fogColor;
uniform float u_fogDensity;
uniform float u_fogNear;
uniform float u_fogFar;

// Parámetros específicos de comunidades
uniform float u_streetLightIntensity;
uniform vec3 u_streetLightColor;
uniform float u_windowLightIntensity;
uniform vec3 u_windowLightColor;
uniform float u_fireIntensity;
uniform vec3 u_fireColor;

// Configuración de calidad
uniform bool u_enableShadows;
uniform bool u_enableIBL;
uniform bool u_enableSSAO;
uniform bool u_enableVolumetricLighting;
uniform int u_shadowQuality; // 0: low, 1: medium, 2: high

// Output
out vec4 fragColor;

// Constantes
const float PI = 3.14159265359;
const float EPSILON = 0.001;

// Funciones de distribución PBR
float distributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    
    float num = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    
    return num / denom;
}

float geometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    
    float num = NdotV;
    float denom = NdotV * (1.0 - k) + k;
    
    return num / denom;
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = geometrySchlickGGX(NdotV, roughness);
    float ggx1 = geometrySchlickGGX(NdotL, roughness);
    
    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Función para obtener normal del normal map
vec3 getNormalFromMap() {
    vec3 tangentNormal = texture(u_normalMap, v_texCoord).xyz * 2.0 - 1.0;
    tangentNormal.xy *= u_normalScale;
    return normalize(v_tbn * tangentNormal);
}

// Cálculo de sombras con PCF
float calculateShadow(vec4 lightSpacePos, int shadowMapIndex, float bias) {
    if (!u_enableShadows || shadowMapIndex >= MAX_SHADOWS) {
        return 0.0;
    }
    
    vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
    projCoords = projCoords * 0.5 + 0.5;
    
    if (projCoords.z > 1.0) return 0.0;
    
    float currentDepth = projCoords.z;
    
    // PCF (Percentage Closer Filtering)
    float shadow = 0.0;
    vec2 texelSize = 1.0 / textureSize(u_shadowMaps[shadowMapIndex], 0);
    
    int pcfSamples = u_shadowQuality == 2 ? 3 : (u_shadowQuality == 1 ? 2 : 1);
    
    for (int x = -pcfSamples; x <= pcfSamples; ++x) {
        for (int y = -pcfSamples; y <= pcfSamples; ++y) {
            float pcfDepth = texture(u_shadowMaps[shadowMapIndex], 
                                   projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
        }
    }
    
    float totalSamples = float((pcfSamples * 2 + 1) * (pcfSamples * 2 + 1));
    shadow /= totalSamples;
    
    return shadow;
}

// Cálculo de atenuación para luces punto y spot
float calculateAttenuation(vec3 lightPos, vec3 worldPos, float range) {
    float distance = length(lightPos - worldPos);
    float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * (distance * distance));
    
    // Suavizar el corte en el rango
    float rangeFactor = 1.0 - smoothstep(range * 0.8, range, distance);
    
    return attenuation * rangeFactor;
}

// Cálculo de intensidad de spot light
float calculateSpotIntensity(vec3 lightDir, vec3 spotDir, float spotAngle, float spotPenumbra) {
    float theta = dot(lightDir, normalize(-spotDir));
    float epsilon = cos(spotAngle) - cos(spotAngle + spotPenumbra);
    float intensity = clamp((theta - cos(spotAngle + spotPenumbra)) / epsilon, 0.0, 1.0);
    
    return intensity;
}

// Función principal de iluminación PBR
vec3 calculatePBRLighting(vec3 albedo, float metallic, float roughness, vec3 normal, 
                         vec3 viewDir, vec3 F0, float ao) {
    vec3 Lo = vec3(0.0);
    
    // Procesar todas las luces
    for (int i = 0; i < u_numLights && i < MAX_LIGHTS; ++i) {
        Light light = u_lights[i];
        
        vec3 lightDir;
        vec3 radiance;
        float attenuation = 1.0;
        
        if (light.type == LIGHT_DIRECTIONAL) {
            lightDir = normalize(-light.direction);
            radiance = light.color * light.intensity;
        } else if (light.type == LIGHT_POINT) {
            lightDir = normalize(light.position - v_worldPosition);
            attenuation = calculateAttenuation(light.position, v_worldPosition, light.range);
            radiance = light.color * light.intensity * attenuation;
        } else if (light.type == LIGHT_SPOT) {
            lightDir = normalize(light.position - v_worldPosition);
            attenuation = calculateAttenuation(light.position, v_worldPosition, light.range);
            float spotIntensity = calculateSpotIntensity(lightDir, light.direction, 
                                                       light.spotAngle, light.spotPenumbra);
            radiance = light.color * light.intensity * attenuation * spotIntensity;
        }
        
        vec3 halfwayDir = normalize(viewDir + lightDir);
        float NdotL = max(dot(normal, lightDir), 0.0);
        
        if (NdotL > 0.0) {
            float NdotV = max(dot(normal, viewDir), 0.0);
            float NdotH = max(dot(normal, halfwayDir), 0.0);
            float VdotH = max(dot(viewDir, halfwayDir), 0.0);
            
            // Calcular términos PBR
            float D = distributionGGX(normal, halfwayDir, roughness);
            float G = geometrySmith(normal, viewDir, lightDir, roughness);
            vec3 F = fresnelSchlick(VdotH, F0);
            
            vec3 numerator = D * G * F;
            float denominator = 4.0 * NdotV * NdotL + EPSILON;
            vec3 specular = numerator / denominator;
            
            vec3 kS = F;
            vec3 kD = vec3(1.0) - kS;
            kD *= 1.0 - metallic;
            
            // Calcular sombras
            float shadow = 0.0;
            if (light.castShadows) {
                float bias = max(0.05 * (1.0 - NdotL), 0.005);
                shadow = calculateShadow(v_lightSpacePos, light.shadowMapIndex, bias);
            }
            
            // Aplicar iluminación
            Lo += (kD * albedo / PI + specular) * radiance * NdotL * (1.0 - shadow);
        }
    }
    
    return Lo;
}

// Iluminación basada en imagen (IBL)
vec3 calculateIBL(vec3 albedo, float metallic, float roughness, vec3 normal, vec3 viewDir, vec3 F0, float ao) {
    if (!u_enableIBL) {
        return u_ambientColor * u_ambientIntensity * albedo * ao;
    }
    
    vec3 F = fresnelSchlickRoughness(max(dot(normal, viewDir), 0.0), F0, roughness);
    vec3 kS = F;
    vec3 kD = 1.0 - kS;
    kD *= 1.0 - metallic;
    
    // Irradiancia difusa
    vec3 irradiance = texture(u_irradianceMap, normal).rgb;
    vec3 diffuse = irradiance * albedo;
    
    // Reflexión especular
    vec3 R = reflect(-viewDir, normal);
    const float MAX_REFLECTION_LOD = 4.0;
    vec3 prefilteredColor = textureLod(u_prefilterMap, R, roughness * MAX_REFLECTION_LOD).rgb;
    
    vec2 brdf = texture(u_brdfLUT, vec2(max(dot(normal, viewDir), 0.0), roughness)).rg;
    vec3 specular = prefilteredColor * (F * brdf.x + brdf.y);
    
    vec3 ambient = (kD * diffuse + specular) * ao * u_environmentIntensity;
    
    return ambient;
}

// Efectos atmosféricos y volumétricos
vec3 calculateVolumetricLighting(vec3 worldPos, vec3 viewDir) {
    if (!u_enableVolumetricLighting) {
        return vec3(0.0);
    }
    
    vec3 volumetric = vec3(0.0);
    
    // Rayos de luz direccional (rayos de sol)
    for (int i = 0; i < u_numLights && i < MAX_LIGHTS; ++i) {
        Light light = u_lights[i];
        
        if (light.type == LIGHT_DIRECTIONAL && light.intensity > 0.5) {
            vec3 lightDir = -light.direction;
            float VdotL = dot(viewDir, lightDir);
            
            // Fase de Henyey-Greenstein para scattering
            float g = 0.3; // Parámetro de anisotropía
            float phase = (1.0 - g * g) / (4.0 * PI * pow(1.0 + g * g - 2.0 * g * VdotL, 1.5));
            
            // Atenuación por distancia
            float distance = length(v_viewPosition);
            float attenuation = exp(-distance * 0.01);
            
            volumetric += light.color * light.intensity * phase * attenuation * 0.1;
        }
    }
    
    return volumetric;
}

// Efectos de luces de la comunidad (farolas, ventanas, fogatas)
vec3 calculateCommunityLighting(vec3 worldPos, vec3 normal, vec3 viewDir) {
    vec3 communityLight = vec3(0.0);
    
    // Simulación de luces de farolas (procedural)
    vec2 streetGrid = floor(worldPos.xz / 10.0); // Grid de 10x10 metros
    vec2 streetCenter = (streetGrid + 0.5) * 10.0;
    float streetDist = length(worldPos.xz - streetCenter);
    
    if (streetDist < 8.0) {
        float streetAttenuation = 1.0 - smoothstep(3.0, 8.0, streetDist);
        float heightFactor = exp(-abs(worldPos.y - 3.0) * 0.5); // Farolas a 3m altura
        
        vec3 streetLightDir = normalize(vec3(streetCenter.x, 3.0, streetCenter.y) - worldPos);
        float NdotL = max(dot(normal, streetLightDir), 0.0);
        
        communityLight += u_streetLightColor * u_streetLightIntensity * 
                         streetAttenuation * heightFactor * NdotL;
    }
    
    // Simulación de luces de ventanas
    float windowNoise = sin(worldPos.x * 0.5) * cos(worldPos.z * 0.7) * sin(worldPos.y * 0.3);
    if (windowNoise > 0.3) {
        float windowIntensity = smoothstep(0.3, 0.8, windowNoise);
        vec3 windowDir = normalize(vec3(0.0, 0.0, 1.0)); // Luz saliendo hacia afuera
        float NdotL = max(dot(normal, windowDir), 0.0);
        
        communityLight += u_windowLightColor * u_windowLightIntensity * 
                         windowIntensity * NdotL * 0.3;
    }
    
    // Efectos de fuego/fogatas
    float fireNoise = sin(u_time * 3.0 + worldPos.x * 0.1) * cos(u_time * 2.7 + worldPos.z * 0.1);
    if (fireNoise > 0.6) {
        float fireFlicker = sin(u_time * 10.0) * 0.1 + 0.9;
        float fireDist = length(worldPos.xz - vec2(0.0, 0.0)); // Centrado en origen
        
        if (fireDist < 5.0) {
            float fireAttenuation = 1.0 - smoothstep(1.0, 5.0, fireDist);
            communityLight += u_fireColor * u_fireIntensity * fireFlicker * fireAttenuation;
        }
    }
    
    return communityLight;
}

// Cálculo de niebla atmosférica
vec3 applyFog(vec3 color, float depth) {
    float fogFactor = 0.0;
    
    if (u_fogDensity > 0.0) {
        // Niebla exponencial
        fogFactor = 1.0 - exp(-u_fogDensity * depth);
        
        // Niebla lineal para transición suave
        float linearFog = smoothstep(u_fogNear, u_fogFar, depth);
        fogFactor = mix(fogFactor, linearFog, 0.5);
    }
    
    // Variación temporal de la niebla
    float fogVariation = sin(u_time * 0.1 + v_worldPosition.x * 0.01) * 0.1 + 0.9;
    fogFactor *= fogVariation;
    
    return mix(color, u_fogColor, clamp(fogFactor, 0.0, 1.0));
}

// Efectos de post-procesado en el fragment shader
vec3 applyToneMapping(vec3 color) {
    // Tone mapping ACES
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    
    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}

vec3 applyGammaCorrection(vec3 color) {
    return pow(color, vec3(1.0 / 2.2));
}

// Función principal
void main() {
    // Obtener propiedades del material
    vec4 albedoSample = texture(u_albedoMap, v_texCoord);
    vec3 albedo = pow(albedoSample.rgb * u_albedo, vec2(2.2).xxx); // Linearizar
    float alpha = albedoSample.a;
    
    vec3 metallicRoughnessSample = texture(u_metallicRoughnessMap, v_texCoord).rgb;
    float metallic = metallicRoughnessSample.b * u_metallic;
    float roughness = metallicRoughnessSample.g * u_roughness;
    
    float ao = texture(u_aoMap, v_texCoord).r * u_ao;
    vec3 emissive = texture(u_emissiveMap, v_texCoord).rgb * u_emissive * u_emissiveIntensity;
    
    // Obtener normal del normal map
    vec3 normal = normalize(v_normal);
    if (textureSize(u_normalMap, 0).x > 1) {
        normal = getNormalFromMap();
    }
    
    vec3 viewDir = normalize(u_cameraPosition - v_worldPosition);
    
    // Calcular F0 para PBR
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metallic);
    
    // Iluminación directa PBR
    vec3 directLighting = calculatePBRLighting(albedo, metallic, roughness, normal, viewDir, F0, ao);
    
    // Iluminación ambiental (IBL)
    vec3 ambientLighting = calculateIBL(albedo, metallic, roughness, normal, viewDir, F0, ao);
    
    // Efectos volumétricos
    vec3 volumetricLighting = calculateVolumetricLighting(v_worldPosition, viewDir);
    
    // Luces específicas de comunidades
    vec3 communityLighting = calculateCommunityLighting(v_worldPosition, normal, viewDir);
    
    // Combinar todas las contribuciones de luz
    vec3 color = directLighting + ambientLighting + emissive + volumetricLighting + communityLighting;
    
    // Aplicar efectos de viento (variación sutil de color)
    if (length(v_windEffect) > 0.01) {
        float windVariation = sin(u_time * 2.0 + v_worldPosition.x * 0.1) * 0.02;
        color *= (1.0 + windVariation);
    }
    
    // Aplicar niebla
    color = applyFog(color, v_fogDepth);
    
    // Tone mapping HDR -> LDR
    color = applyToneMapping(color);
    
    // Gamma correction
    color = applyGammaCorrection(color);
    
    // Aplicar color de vértice
    color *= v_color.rgb;
    
    fragColor = vec4(color, alpha * v_color.a);
    
    // Debug modes (comentar en producción)
    #ifdef DEBUG_NORMALS
    fragColor = vec4(normal * 0.5 + 0.5, 1.0);
    #endif
    
    #ifdef DEBUG_METALLIC
    fragColor = vec4(vec3(metallic), 1.0);
    #endif
    
    #ifdef DEBUG_ROUGHNESS
    fragColor = vec4(vec3(roughness), 1.0);
    #endif
    
    #ifdef DEBUG_AO
    fragColor = vec4(vec3(ao), 1.0);
    #endif
}