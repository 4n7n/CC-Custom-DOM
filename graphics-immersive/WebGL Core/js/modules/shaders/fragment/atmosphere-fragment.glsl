/*
 * Atmospheric Fragment Shader
 * Renderizado avanzado de efectos atmosféricos y cielo
 */

#version 300 es
precision highp float;

// Variables de entrada
in vec3 v_worldPosition;
in vec3 v_viewPosition;
in vec3 v_normal;
in vec2 v_texCoord;
in vec4 v_color;
in vec3 v_rayDirection;

// Uniforms temporales y de cámara
uniform float u_time;
uniform vec3 u_cameraPosition;
uniform vec3 u_viewDirection;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

// Parámetros del sol
uniform vec3 u_sunDirection;
uniform vec3 u_sunColor;
uniform float u_sunIntensity;
uniform float u_sunSize;

// Parámetros atmosféricos
uniform float u_rayleighCoefficient;
uniform float u_mieCoefficient;
uniform float u_mieDirectionalG;
uniform vec3 u_rayleighColor;
uniform vec3 u_mieColor;

// Parámetros de dispersión
uniform float u_turbidity;
uniform float u_luminance;
uniform float u_reileighZenithLength;
uniform float u_mieZenithLength;

// Parámetros de cielo
uniform float u_skyExposure;
uniform float u_skyContrast;
uniform vec3 u_skyTint;
uniform float u_horizonOffset;

// Nubes
uniform float u_cloudCoverage;
uniform float u_cloudDensity;
uniform float u_cloudSpeed;
uniform vec3 u_cloudColor;
uniform float u_cloudHeight;
uniform float u_cloudThickness;

// Niebla atmosférica
uniform vec3 u_fogColor;
uniform float u_fogDensity;
uniform float u_fogHeightFalloff;
uniform float u_fogInscatteringExp;

// Efectos temporales
uniform float u_dayNightCycle; // 0.0 = noche, 1.0 = día
uniform vec3 u_moonDirection;
uniform vec3 u_moonColor;
uniform float u_starIntensity;

// Texturas
uniform sampler2D u_noiseTexture;
uniform sampler2D u_cloudTexture;
uniform samplerCube u_starTexture;

// Output
out vec4 fragColor;

// Constantes
const float PI = 3.14159265359;
const float EARTH_RADIUS = 6360e3;
const float ATMOSPHERE_RADIUS = 6420e3;
const vec3 EARTH_CENTER = vec3(0.0, -EARTH_RADIUS, 0.0);

// Coeficientes de dispersión de Rayleigh (para diferentes longitudes de onda)
const vec3 RAYLEIGH_BETA = vec3(3.8e-6, 13.5e-6, 33.1e-6);
const float MIE_BETA = 21e-6;

// Función de fase de Rayleigh
float rayleighPhase(float cosTheta) {
    return 3.0 / (16.0 * PI) * (1.0 + cosTheta * cosTheta);
}

// Función de fase de Mie (Henyey-Greenstein)
float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

// Intersección rayo-esfera
vec2 raySphereIntersect(vec3 rayOrigin, vec3 rayDirection, vec3 sphereCenter, float sphereRadius) {
    vec3 oc = rayOrigin - sphereCenter;
    float b = dot(oc, rayDirection);
    float c = dot(oc, oc) - sphereRadius * sphereRadius;
    float discriminant = b * b - c;
    
    if (discriminant < 0.0) {
        return vec2(-1.0); // No intersección
    }
    
    float sqrt_discriminant = sqrt(discriminant);
    return vec2(-b - sqrt_discriminant, -b + sqrt_discriminant);
}

// Densidad atmosférica (exponencial)
float atmosphereDensity(float height) {
    return exp(-height / 8000.0); // Escala de altura de 8km
}

// Función para calcular dispersión atmosférica
vec3 calculateAtmosphericScattering(vec3 rayStart, vec3 rayDirection, float rayLength, vec3 lightDirection) {
    const int SAMPLE_COUNT = 16;
    float stepSize = rayLength / float(SAMPLE_COUNT);
    
    vec3 rayleighScattering = vec3(0.0);
    vec3 mieScattering = vec3(0.0);
    
    vec3 currentPos = rayStart;
    
    for (int i = 0; i < SAMPLE_COUNT; ++i) {
        float height = length(currentPos - EARTH_CENTER) - EARTH_RADIUS;
        float density = atmosphereDensity(height);
        
        // Calcular dispersión de Rayleigh
        vec3 rayleighBeta = RAYLEIGH_BETA * u_rayleighCoefficient;
        rayleighScattering += rayleighBeta * density * stepSize;
        
        // Calcular dispersión de Mie
        float mieBeta = MIE_BETA * u_mieCoefficient;
        mieScattering += vec3(mieBeta) * density * stepSize;
        
        currentPos += rayDirection * stepSize;
    }
    
    // Función de fase
    float cosTheta = dot(rayDirection, lightDirection);
    float rayleighPhaseValue = rayleighPhase(cosTheta);
    float miePhaseValue = miePhase(cosTheta, u_mieDirectionalG);
    
    // Combinar dispersión
    vec3 rayleighColor = u_rayleighColor * rayleighPhaseValue;
    vec3 mieColor = u_mieColor * miePhaseValue;
    
    vec3 extinction = exp(-(rayleighScattering + mieScattering));
    
    return (rayleighColor * rayleighScattering + mieColor * mieScattering) * extinction;
}

// Gradiente de cielo procedural
vec3 calculateSkyGradient(vec3 rayDirection) {
    float elevation = rayDirection.y;
    
    // Colores base para diferentes momentos del día
    vec3 zenithColor = mix(
        vec3(0.1, 0.15, 0.35),  // Noche
        vec3(0.3, 0.6, 1.0),    // Día
        u_dayNightCycle
    );
    
    vec3 horizonColor = mix(
        vec3(0.2, 0.1, 0.3),    // Noche
        vec3(1.0, 0.8, 0.6),    // Día
        u_dayNightCycle
    );
    
    // Interpolación basada en elevación
    float horizonBlend = 1.0 - smoothstep(-0.1, 0.3, elevation + u_horizonOffset);
    vec3 skyColor = mix(zenithColor, horizonColor, horizonBlend);
    
    // Aplicar tinte
    skyColor *= u_skyTint;
    
    return skyColor;
}

// Renderizado del sol
vec3 calculateSunDisc(vec3 rayDirection, vec3 sunDirection) {
    float sunDot = dot(rayDirection, sunDirection);
    float sunSize = u_sunSize * 0.01; // Convertir a radianes
    
    // Disco solar
    float sunDisc = smoothstep(cos(sunSize), cos(sunSize * 0.5), sunDot);
    
    // Corona solar
    float sunCorona = pow(max(sunDot, 0.0), 50.0) * 0.5;
    
    vec3 sunContribution = u_sunColor * u_sunIntensity * (sunDisc + sunCorona);
    
    return sunContribution;
}

// Renderizado de la luna
vec3 calculateMoonDisc(vec3 rayDirection, vec3 moonDirection) {
    float moonDot = dot(rayDirection, moonDirection);
    float moonSize = 0.02; // Tamaño de la luna
    
    float moonDisc = smoothstep(cos(moonSize), cos(moonSize * 0.5), moonDot);
    
    // Fases lunares (simplificado)
    float moonPhase = sin(u_time * 0.1) * 0.5 + 0.5;
    vec3 moonContribution = u_moonColor * moonDisc * moonPhase * (1.0 - u_dayNightCycle);
    
    return moonContribution;
}

// Renderizado de estrellas
vec3 calculateStars(vec3 rayDirection) {
    if (u_dayNightCycle > 0.3) {
        return vec3(0.0); // No mostrar estrellas durante el día
    }
    
    // Usar texture de estrellas o generar proceduralmente
    vec2 starUV = rayDirection.xz / (1.0 + abs(rayDirection.y)) * 0.5 + 0.5;
    vec3 stars = texture(u_starTexture, rayDirection).rgb;
    
    // Parpadeo de estrellas
    float twinkle = sin(u_time + rayDirection.x * 100.0) * sin(u_time * 1.3 + rayDirection.z * 100.0);
    twinkle = twinkle * 0.1 + 0.9;
    
    stars *= u_starIntensity * (1.0 - u_dayNightCycle) * twinkle;
    
    return stars;
}

// Renderizado de nubes volumétricas
vec3 calculateClouds(vec3 rayDirection) {
    if (rayDirection.y < 0.0 || u_cloudCoverage <= 0.0) {
        return vec3(0.0);
    }
    
    // Intersección con plano de nubes
    float cloudPlaneHeight = u_cloudHeight;
    float t = (cloudPlaneHeight - u_cameraPosition.y) / rayDirection.y;
    
    if (t < 0.0) {
        return vec3(0.0);
    }
    
    vec3 cloudPos = u_cameraPosition + rayDirection * t;
    
    // Muestreo de ruido para nubes
    vec2 cloudUV = cloudPos.xz * 0.0001 + u_time * u_cloudSpeed * 0.01;
    
    // Múltiples octavas de ruido
    float cloudNoise = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    
    for (int i = 0; i < 4; ++i) {
        cloudNoise += texture(u_noiseTexture, cloudUV * frequency).r * amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    // Aplicar cobertura y densidad
    cloudNoise = smoothstep(1.0 - u_cloudCoverage, 1.0, cloudNoise);
    cloudNoise *= u_cloudDensity;
    
    // Iluminación de nubes
    float lightDot = max(dot(u_sunDirection, vec3(0.0, 1.0, 0.0)), 0.0);
    vec3 cloudLighting = mix(vec3(0.3, 0.3, 0.4), vec3(1.0, 0.95, 0.8), lightDot);
    
    vec3 cloudColor = u_cloudColor * cloudLighting * cloudNoise;
    
    // Transparencia basada en densidad
    float cloudAlpha = cloudNoise;
    
    return cloudColor * cloudAlpha;
}

// Efectos de niebla volumétrica
vec3 calculateVolumetricFog(vec3 rayDirection, float rayLength) {
    if (u_fogDensity <= 0.0) {
        return vec3(0.0);
    }
    
    const int FOG_SAMPLES = 8;
    float stepSize = rayLength / float(FOG_SAMPLES);
    
    vec3 fogAccumulation = vec3(0.0);
    vec3 currentPos = u_cameraPosition;
    
    for (int i = 0; i < FOG_SAMPLES; ++i) {
        float height = currentPos.y;
        float fogDensity = u_fogDensity * exp(-height * u_fogHeightFalloff);
        
        // Dispersión hacia la luz
        float lightScattering = pow(max(dot(rayDirection, u_sunDirection), 0.0), u_fogInscatteringExp);
        
        vec3 fogColor = u_fogColor * (0.5 + lightScattering * 0.5);
        fogAccumulation += fogColor * fogDensity * stepSize;
        
        currentPos += rayDirection * stepSize;
    }
    
    return fogAccumulation;
}

// Efectos de arco iris
vec3 calculateRainbow(vec3 rayDirection) {
    // Condiciones para arco iris: lluvia + sol
    float rainCondition = u_cloudCoverage * (1.0 - u_cloudCoverage) * 4.0; // Máximo cuando coverage = 0.5
    
    if (rainCondition < 0.1) {
        return vec3(0.0);
    }
    
    // Ángulo respecto al antisolar
    vec3 antisolarDirection = -u_sunDirection;
    float angle = acos(dot(rayDirection, antisolarDirection));
    
    // Arco iris primario (40-42 grados)
    float primaryBow = smoothstep(0.68, 0.72, angle) * smoothstep(0.76, 0.72, angle);
    
    // Colores del arco iris
    float hue = (angle - 0.7) * 10.0;
    vec3 rainbowColor = vec3(
        sin(hue),
        sin(hue + 2.0944), // +120 grados
        sin(hue + 4.1888)  // +240 grados
    ) * 0.5 + 0.5;
    
    return rainbowColor * primaryBow * rainCondition * 0.3;
}

// Efectos de aurora boreal (simplificado)
vec3 calculateAurora(vec3 rayDirection) {
    if (u_dayNightCycle > 0.1 || rayDirection.y < 0.3) {
        return vec3(0.0);
    }
    
    // Aurora en latitudes altas
    float auroraLatitude = smoothstep(0.7, 1.0, abs(v_worldPosition.z * 0.00001));
    
    if (auroraLatitude < 0.1) {
        return vec3(0.0);
    }
    
    // Ondas de aurora
    float auroraWave = sin(rayDirection.x * 5.0 + u_time * 0.5) * 
                      cos(rayDirection.z * 3.0 + u_time * 0.3);
    auroraWave = pow(max(auroraWave, 0.0), 2.0);
    
    // Colores típicos de aurora
    vec3 auroraGreen = vec3(0.2, 1.0, 0.3);
    vec3 auroraPurple = vec3(0.8, 0.2, 1.0);
    
    float colorMix = sin(u_time * 0.2 + rayDirection.x * 2.0) * 0.5 + 0.5;
    vec3 auroraColor = mix(auroraGreen, auroraPurple, colorMix);
    
    return auroraColor * auroraWave * auroraLatitude * (1.0 - u_dayNightCycle);
}

// Función principal
void main() {
    vec3 rayDirection = normalize(v_rayDirection);
    
    // Calcular color base del cielo
    vec3 skyColor = calculateSkyGradient(rayDirection);
    
    // Intersección con atmósfera
    vec2 atmosphereIntersect = raySphereIntersect(
        u_cameraPosition, rayDirection, EARTH_CENTER, ATMOSPHERE_RADIUS
    );
    
    vec3 atmosphericColor = vec3(0.0);
    
    if (atmosphereIntersect.y > 0.0) {
        float rayLength = atmosphereIntersect.y - max(atmosphereIntersect.x, 0.0);
        vec3 rayStart = u_cameraPosition + rayDirection * max(atmosphereIntersect.x, 0.0);
        
        // Calcular dispersión atmosférica
        atmosphericColor = calculateAtmosphericScattering(
            rayStart, rayDirection, rayLength, u_sunDirection
        );
    }
    
    // Combinar cielo base con dispersión atmosférica
    vec3 finalColor = skyColor + atmosphericColor;
    
    // Agregar sol
    finalColor += calculateSunDisc(rayDirection, u_sunDirection);
    
    // Agregar luna
    finalColor += calculateMoonDisc(rayDirection, u_moonDirection);
    
    // Agregar estrellas
    finalColor += calculateStars(rayDirection);
    
    // Agregar nubes
    vec3 cloudColor = calculateClouds(rayDirection);
    finalColor = mix(finalColor, cloudColor, min(cloudColor.r + cloudColor.g + cloudColor.b, 1.0));
    
    // Agregar niebla volumétrica
    float rayLength = 1000.0; // Distancia arbitraria para efectos atmosféricos
    finalColor += calculateVolumetricFog(rayDirection, rayLength);
    
    // Efectos especiales
    finalColor += calculateRainbow(rayDirection);
    finalColor += calculateAurora(rayDirection);
    
    // Aplicar exposición y contraste
    finalColor *= u_skyExposure;
    finalColor = pow(finalColor, vec3(u_skyContrast));
    
    // Tone mapping para HDR
    finalColor = finalColor / (finalColor + vec3(1.0));
    
    // Gamma correction
    finalColor = pow(finalColor, vec3(1.0 / 2.2));
    
    // Aplicar color de vértice para variaciones locales
    finalColor *= v_color.rgb;
    
    // Dithering para evitar banding en gradientes suaves
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor += (dither - 0.5) / 255.0;
    
    fragColor = vec4(finalColor, 1.0);
    
    // Modos de debug
    #ifdef DEBUG_RAYLEIGH
    vec2 debugIntersect = raySphereIntersect(u_cameraPosition, rayDirection, EARTH_CENTER, ATMOSPHERE_RADIUS);
    if (debugIntersect.y > 0.0) {
        float rayLen = debugIntersect.y - max(debugIntersect.x, 0.0);
        vec3 rayStart = u_cameraPosition + rayDirection * max(debugIntersect.x, 0.0);
        vec3 rayleighOnly = calculateAtmosphericScattering(rayStart, rayDirection, rayLen, u_sunDirection);
        fragColor = vec4(rayleighOnly * vec3(1.0, 0.0, 0.0), 1.0); // Solo componente roja
    }
    #endif
    
    #ifdef DEBUG_CLOUDS
    fragColor = vec4(calculateClouds(rayDirection), 1.0);
    #endif
    
    #ifdef DEBUG_FOG
    fragColor = vec4(calculateVolumetricFog(rayDirection, 1000.0), 1.0);
    #endif
}