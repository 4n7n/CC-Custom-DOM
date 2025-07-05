#version 310 es
precision highp float;

// Atmosphere Compute Shader - RAMA 5 Graphics Immersive
// Simulación avanzada de atmosfera con scattering, volumetric lighting y efectos atmosféricos

layout(local_size_x = 8, local_size_y = 8, local_size_z = 8) in;

// Estructura de voxel atmosférico
struct AtmosphereVoxel {
    vec3 scattering;      // Coeficientes de scattering RGB
    float density;        // Densidad atmosférica
    vec3 absorption;      // Coeficientes de absorción RGB
    float temperature;    // Temperatura del aire
    vec3 emission;        // Emisión propia (aurora, pollution)
    float moisture;       // Contenido de humedad
    vec2 wind;           // Viento horizontal (x, z)
    float pressure;       // Presión atmosférica
    float verticalWind;   // Viento vertical
    float particleDensity; // Densidad de partículas (polvo, pollen)
    vec2 padding;
};

// Buffers de simulación atmosférica
layout(std430, binding = 0) restrict buffer AtmosphereGrid {
    AtmosphereVoxel atmosphere[];
};

layout(std430, binding = 1) restrict buffer LightingBuffer {
    vec4 lightContributions[]; // RGB + intensity
};

layout(std430, binding = 2) restrict buffer CloudData {
    vec4 cloudVoxels[]; // xyz = position, w = density
};

// Uniformes de control
uniform float u_deltaTime;
uniform float u_time;
uniform vec3 u_gridSize;
uniform vec3 u_worldSize;
uniform float u_voxelSize;
uniform vec3 u_cameraPosition;

// Parámetros atmosféricos
uniform vec3 u_sunDirection;
uniform vec3 u_sunColor;
uniform float u_sunIntensity;
uniform vec3 u_moonDirection;
uniform vec3 u_moonColor;
uniform float u_moonIntensity;

uniform float u_atmosphereHeight;
uniform float u_scaleHeight;
uniform float u_miePhase;
uniform float u_rayleighPhase;
uniform vec3 u_rayleighCoeff;
uniform vec3 u_mieCoeff;
uniform vec3 u_ozoneCoeff;

// Parámetros ambientales
uniform float u_globalTemperature;
uniform float u_humidity;
uniform float u_pollution;
uniform float u_windStrength;
uniform vec2 u_windDirection;
uniform float u_turbulence;

// Texturas de entrada
uniform sampler2D u_noiseTexture;
uniform sampler3D u_cloudTexture;
uniform sampler2D u_heightMap;
uniform samplerCube u_skybox;

// Constantes físicas
const float EARTH_RADIUS = 6371000.0;
const float ATMOSPHERE_HEIGHT = 100000.0;
const float AVOGADRO = 6.022e23;
const float BOLTZMANN = 1.38e-23;
const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;

// Coeficientes de scattering de Rayleigh
const vec3 RAYLEIGH_COEFF = vec3(3.8e-6, 13.5e-6, 33.1e-6);
// Coeficientes de scattering de Mie
const vec3 MIE_COEFF = vec3(21e-6);

// Funciones auxiliares
vec3 getVoxelCoord() {
    return vec3(gl_GlobalInvocationID.xyz);
}

int getVoxelIndex(vec3 coord) {
    return int(coord.z * u_gridSize.x * u_gridSize.y + coord.y * u_gridSize.x + coord.x);
}

vec3 getWorldPosition(vec3 voxelCoord) {
    return (voxelCoord / u_gridSize) * u_worldSize - u_worldSize * 0.5;
}

bool isValidCoord(vec3 coord) {
    return coord.x >= 0.0 && coord.x < u_gridSize.x && 
           coord.y >= 0.0 && coord.y < u_gridSize.y &&
           coord.z >= 0.0 && coord.z < u_gridSize.z;
}

float getAltitude(vec3 worldPos) {
    vec2 uv = (worldPos.xz + u_worldSize.xz * 0.5) / u_worldSize.xz;
    float groundHeight = texture(u_heightMap, uv).r * 1000.0;
    return worldPos.y - groundHeight;
}

// Función de ruido 3D mejorada
float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    vec2 uv = (i.xy + vec2(37.0, 17.0) * i.z) + f.xy;
    vec2 rg = texture(u_noiseTexture, (uv + 0.5) / 256.0).yx;
    return mix(rg.x, rg.y, f.z);
}

float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < octaves; i++) {
        value += amplitude * noise3D(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value;
}

// Funciones de scattering atmosférico
float rayleighPhase(float cosTheta) {
    return 3.0 / (16.0 * PI) * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    float cosTheta2 = cosTheta * cosTheta;
    float num = 3.0 * (1.0 - g2) * (1.0 + cosTheta2);
    float denom = 8.0 * PI * (2.0 + g2) * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
    return num / denom;
}

vec3 calculateRayleighScattering(float altitude, float wavelength) {
    float density = exp(-altitude / 8000.0); // Scale height de 8km
    float lambda4 = pow(wavelength, 4.0);
    return RAYLEIGH_COEFF * density / lambda4;
}

vec3 calculateMieScattering(float altitude, float humidity, float pollution) {
    float density = exp(-altitude / 1200.0); // Scale height de 1.2km para aerosoles
    float aerosolFactor = 1.0 + humidity * 0.5 + pollution * 2.0;
    return MIE_COEFF * density * aerosolFactor;
}

vec3 calculateOzoneAbsorption(float altitude) {
    // Perfil de ozono simplificado (pico a ~25km)
    float ozoneProfile = exp(-pow((altitude - 25000.0) / 10000.0, 2.0));
    return u_ozoneCoeff * ozoneProfile;
}

// Cálculo de densidad atmosférica
float calculateAtmosphericDensity(float altitude) {
    if (altitude < 0.0) return 1.0;
    if (altitude > ATMOSPHERE_HEIGHT) return 0.0;
    
    // Modelo de atmósfera estándar
    if (altitude < 11000.0) {
        // Troposfera
        float temp = 288.15 - 0.0065 * altitude;
        return pow(temp / 288.15, 4.256);
    } else if (altitude < 25000.0) {
        // Estratosfera inferior
        return 0.2233 * exp(-(altitude - 11000.0) / 6341.6);
    } else {
        // Estratosfera superior
        float temp = 141.94 + 0.00299 * altitude;
        return 0.08317 * pow(temp / 216.6, -11.388);
    }
}

// Simulación de transporte atmosférico
void simulateAtmosphericTransport(inout AtmosphereVoxel voxel, vec3 voxelCoord) {
    vec3 worldPos = getWorldPosition(voxelCoord);
    float altitude = getAltitude(worldPos);
    
    // Advección por viento
    vec3 windVelocity = vec3(voxel.wind.x, voxel.verticalWind, voxel.wind.y);
    vec3 sourceCoord = voxelCoord - windVelocity * u_deltaTime / u_voxelSize;
    
    if (isValidCoord(sourceCoord)) {
        int sourceIndex = getVoxelIndex(sourceCoord);
        AtmosphereVoxel source = atmosphere[sourceIndex];
        
        // Transporte de propiedades atmosféricas
        float transportFactor = 0.1 * u_deltaTime;
        
        voxel.scattering = mix(voxel.scattering, source.scattering, transportFactor);
        voxel.absorption = mix(voxel.absorption, source.absorption, transportFactor);
        voxel.particleDensity = mix(voxel.particleDensity, source.particleDensity, transportFactor);
        voxel.moisture = mix(voxel.moisture, source.moisture, transportFactor);
    }
    
    // Difusión turbulenta
    float turbulentMixing = u_turbulence * u_deltaTime;
    vec3 turbulentOffset = vec3(
        fbm(worldPos * 0.001 + u_time * 0.1, 3),
        fbm(worldPos * 0.001 + u_time * 0.1 + 100.0, 3),
        fbm(worldPos * 0.001 + u_time * 0.1 + 200.0, 3)
    ) * 2.0 - 1.0;
    
    // Aplicar turbulencia a las propiedades
    voxel.scattering += turbulentOffset * turbulentMixing * 0.01;
    voxel.density += turbulentOffset.y * turbulentMixing * 0.05;
}

// Cálculo de iluminación volumétrica
vec3 calculateVolumetricLighting(vec3 worldPos, vec3 viewDir) {
    vec3 totalLight = vec3(0.0);
    
    // Contribución del sol
    if (u_sunIntensity > 0.0) {
        float sunCosTheta = dot(viewDir, u_sunDirection);
        
        float rayleighSun = rayleighPhase(sunCosTheta);
        float mieSun = miePhase(sunCosTheta, u_miePhase);
        
        vec3 sunScattering = u_rayleighCoeff * rayleighSun + u_mieCoeff * mieSun;
        totalLight += u_sunColor * u_sunIntensity * sunScattering;
    }
    
    // Contribución de la luna
    if (u_moonIntensity > 0.0) {
        float moonCosTheta = dot(viewDir, u_moonDirection);
        
        float rayleighMoon = rayleighPhase(moonCosTheta);
        float mieMoon = miePhase(moonCosTheta, u_miePhase * 0.8);
        
        vec3 moonScattering = u_rayleighCoeff * rayleighMoon + u_mieCoeff * mieMoon;
        totalLight += u_moonColor * u_moonIntensity * moonScattering * 0.1;
    }
    
    // Luz ambiente del cielo
    vec3 skyDir = normalize(vec3(0.0, 1.0, 0.0));
    vec3 ambientLight = texture(u_skybox, skyDir).rgb * 0.3;
    totalLight += ambientLight;
    
    return totalLight;
}

// Simulación de efectos atmosféricos específicos
void simulateAtmosphericEffects(inout AtmosphereVoxel voxel, vec3 voxelCoord) {
    vec3 worldPos = getWorldPosition(voxelCoord);
    float altitude = getAltitude(worldPos);
    
    // 1. Cálculo de densidad base
    voxel.density = calculateAtmosphericDensity(altitude);
    
    // 2. Efectos de temperatura
    float altitudeTemp = u_globalTemperature - altitude * 0.0065; // Lapse rate
    voxel.temperature = altitudeTemp;
    
    // Variaciones térmicas locales
    float thermalNoise = fbm(worldPos * 0.0001 + u_time * 0.01, 4) * 5.0;
    voxel.temperature += thermalNoise;
    
    // 3. Scattering atmosférico
    voxel.scattering = calculateRayleighScattering(altitude, 550e-9); // Verde
    voxel.scattering += calculateMieScattering(altitude, voxel.moisture, u_pollution);
    
    // 4. Absorción atmosférica
    voxel.absorption = calculateOzoneAbsorption(altitude);
    
    // Absorción por vapor de agua
    float waterAbsorption = voxel.moisture * 0.1;
    voxel.absorption += vec3(waterAbsorption * 0.8, waterAbsorption * 0.9, waterAbsorption);
    
    // 5. Presión atmosférica
    voxel.pressure = 101325.0 * pow(1.0 - 0.0065 * altitude / 288.15, 5.255);
    
    // 6. Viento atmosférico
    float windSpeed = u_windStrength;
    
    // Jet stream simulation (viento de chorro)
    if (altitude > 8000.0 && altitude < 15000.0) {
        float jetStreamStrength = sin((worldPos.z / u_worldSize.z + 0.5) * PI) * 30.0;
        windSpeed += jetStreamStrength;
    }
    
    // Variaciones de viento por turbulencia
    vec2 windNoise = vec2(
        fbm(worldPos * 0.0005 + u_time * 0.05, 3),
        fbm(worldPos * 0.0005 + u_time * 0.05 + 50.0, 3)
    ) * 2.0 - 1.0;
    
    voxel.wind = u_windDirection * windSpeed + windNoise * u_turbulence;
    
    // Viento vertical (convección)
    float convection = (voxel.temperature - u_globalTemperature) * 0.1;
    voxel.verticalWind = convection + windNoise.x * 0.5;
    
    // 7. Humedad atmosférica
    float baseHumidity = u_humidity * exp(-altitude / 2000.0); // Decae con altura
    float humidityNoise = fbm(worldPos * 0.0002 + u_time * 0.02, 3) * 0.3;
    voxel.moisture = clamp(baseHumidity + humidityNoise, 0.0, 1.0);
    
    // 8. Partículas atmosféricas
    float baseParticles = u_pollution * exp(-altitude / 1000.0);
    float particleNoise = fbm(worldPos * 0.0003 + u_time * 0.03, 2) * 0.5;
    voxel.particleDensity = clamp(baseParticles + particleNoise, 0.0, 1.0);
    
    // 9. Efectos especiales
    
    // Aurora boreal (en altas latitudes y altitudes)
    if (altitude > 80000.0 && abs(worldPos.z) > u_worldSize.z * 0.3) {
        float auroraIntensity = sin(u_time * 0.5 + worldPos.x * 0.001) * 
                               cos(u_time * 0.3 + worldPos.z * 0.0005);
        auroraIntensity = max(0.0, auroraIntensity) * 0.1;
        
        voxel.emission = vec3(0.0, auroraIntensity, auroraIntensity * 0.5);
    }
    
    // Polvo y polen (cerca del suelo)
    if (altitude < 2000.0) {
        float seasonalFactor = sin(u_time * 0.01) * 0.5 + 0.5; // Ciclo estacional
        float dustLevel = seasonalFactor * 0.2 * (1.0 - altitude / 2000.0);
        voxel.particleDensity += dustLevel;
    }
    
    // Contaminación urbana (simulación simplificada)
    float pollutionNoise = fbm(worldPos * 0.0001, 2);
    if (pollutionNoise > 0.7 && altitude < 1000.0) {
        float urbanPollution = (pollutionNoise - 0.7) * 0.3;
        voxel.particleDensity += urbanPollution;
        voxel.absorption += vec3(urbanPollution * 0.1);
    }
}

// Interacción con nubes
void simulateCloudInteraction(inout AtmosphereVoxel voxel, vec3 voxelCoord) {
    vec3 worldPos = getWorldPosition(voxelCoord);
    
    // Obtener densidad de nubes del volumen 3D
    vec3 cloudUV = (worldPos + u_worldSize * 0.5) / u_worldSize;
    float cloudDensity = texture(u_cloudTexture, cloudUV).r;
    
    if (cloudDensity > 0.1) {
        // Las nubes aumentan el scattering de Mie
        voxel.scattering += vec3(cloudDensity * 0.5);
        
        // Las nubes absorben luz
        voxel.absorption += vec3(cloudDensity * 0.3);
        
        // Las nubes aumentan la humedad
        voxel.moisture = min(1.0, voxel.moisture + cloudDensity * 0.2);
        
        // Las nubes afectan la temperatura (enfriamiento por sombra)
        voxel.temperature -= cloudDensity * 2.0;
        
        // Efectos en el viento (fricción)
        voxel.wind *= (1.0 - cloudDensity * 0.3);
        voxel.verticalWind *= (1.0 - cloudDensity * 0.2);
    }
}

// Cálculo de transmitancia atmosférica
float calculateTransmittance(vec3 startPos, vec3 endPos, vec3 extinction) {
    vec3 rayDir = normalize(endPos - startPos);
    float rayLength = length(endPos - startPos);
    
    // Muestreo a lo largo del rayo
    int samples = 16;
    float stepSize = rayLength / float(samples);
    float totalExtinction = 0.0;
    
    for (int i = 0; i < samples; i++) {
        vec3 samplePos = startPos + rayDir * (float(i) + 0.5) * stepSize;
        float altitude = getAltitude(samplePos);
        
        if (altitude >= 0.0) {
            float density = calculateAtmosphericDensity(altitude);
            totalExtinction += dot(extinction, vec3(1.0)) * density * stepSize;
        }
    }
    
    return exp(-totalExtinction);
}

// Dispersión múltiple simplificada
vec3 calculateMultipleScattering(vec3 worldPos, vec3 sunDir) {
    float altitude = getAltitude(worldPos);
    float density = calculateAtmosphericDensity(altitude);
    
    // Aproximación de dispersión múltiple
    vec3 multiScatter = vec3(0.0);
    
    // Segunda orden de scattering
    float secondOrder = density * density * 0.1;
    multiScatter += u_rayleighCoeff * secondOrder;
    
    // Contribución de scattering hacia atrás
    float backscatter = max(0.0, -dot(normalize(worldPos), sunDir)) * 0.2;
    multiScatter += u_mieCoeff * backscatter;
    
    return multiScatter;
}

// Efectos de perspectiva atmosférica
void calculateAtmosphericPerspective(inout AtmosphereVoxel voxel, vec3 voxelCoord) {
    vec3 worldPos = getWorldPosition(voxelCoord);
    float distanceToCamera = length(worldPos - u_cameraPosition);
    
    // Incrementar scattering con la distancia
    float distanceFactor = 1.0 - exp(-distanceToCamera / 10000.0);
    voxel.scattering += u_rayleighCoeff * distanceFactor * 0.1;
    
    // Incrementar absorción con la distancia
    voxel.absorption += vec3(distanceFactor * 0.05);
}

// Simulación de efectos temporales
void simulateTemporalEffects(inout AtmosphereVoxel voxel, vec3 worldPos) {
    // Ciclo día/noche
    float timeOfDay = mod(u_time * 0.1, 24.0); // 1 día = 10 segundos de tiempo real
    float dayFactor = sin((timeOfDay / 24.0) * TWO_PI) * 0.5 + 0.5;
    
    // Variaciones de temperatura día/noche
    float diurnalVariation = cos((timeOfDay / 24.0) * TWO_PI) * 10.0;
    voxel.temperature += diurnalVariation * dayFactor;
    
    // Variaciones de humedad día/noche
    float humidityVariation = sin((timeOfDay / 24.0) * TWO_PI + PI) * 0.2;
    voxel.moisture += humidityVariation * 0.1;
    
    // Efectos estacionales (ciclo anual)
    float yearProgress = mod(u_time * 0.001, 1.0); // 1 año = 1000 segundos
    float seasonalTemp = sin(yearProgress * TWO_PI) * 15.0;
    voxel.temperature += seasonalTemp;
    
    // Variaciones de presión estacionales
    float seasonalPressure = cos(yearProgress * TWO_PI) * 50.0;
    voxel.pressure += seasonalPressure;
}

// Efectos de dispersión avanzados
vec3 calculateAdvancedScattering(vec3 worldPos, vec3 viewDir, vec3 lightDir) {
    float altitude = getAltitude(worldPos);
    float density = calculateAtmosphericDensity(altitude);
    
    // Ángulos de dispersión
    float cosTheta = dot(viewDir, lightDir);
    float cosThetaSq = cosTheta * cosTheta;
    
    // Scattering de Rayleigh mejorado
    vec3 rayleighScatter = u_rayleighCoeff * density;
    float rayleighPhaseFunc = 3.0 / (16.0 * PI) * (1.0 + cosThetaSq);
    rayleighScatter *= rayleighPhaseFunc;
    
    // Scattering de Mie mejorado con función de fase Henyey-Greenstein
    vec3 mieScatter = u_mieCoeff * density;
    float g = u_miePhase;
    float g2 = g * g;
    float miePhaseFunc = (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
    mieScatter *= miePhaseFunc;
    
    // Scattering múltiple
    vec3 multipleScatter = calculateMultipleScattering(worldPos, lightDir);
    
    return rayleighScatter + mieScatter + multipleScatter;
}

// Simulación de fenómenos ópticos
void simulateOpticalPhenomena(inout AtmosphereVoxel voxel, vec3 voxelCoord) {
    vec3 worldPos = getWorldPosition(voxelCoord);
    float altitude = getAltitude(worldPos);
    
    // Espejismo térmico (cerca del suelo)
    if (altitude < 100.0 && voxel.temperature > u_globalTemperature + 20.0) {
        float mirageStrength = (voxel.temperature - u_globalTemperature - 20.0) / 30.0;
        mirageStrength = clamp(mirageStrength, 0.0, 1.0);
        
        // Modificar índice de refracción
        voxel.scattering += vec3(mirageStrength * 0.1);
    }
    
    // Arco iris (condiciones específicas)
    if (voxel.moisture > 0.8 && altitude < 3000.0) {
        vec3 toSun = u_sunDirection;
        vec3 toCam = normalize(u_cameraPosition - worldPos);
        float rainbowAngle = dot(toSun, toCam);
        
        // Arco iris a ~42 grados del antisolar
        if (rainbowAngle < -0.6 && rainbowAngle > -0.8) {
            float rainbowIntensity = (0.7 - abs(rainbowAngle + 0.7)) * 5.0;
            rainbowIntensity *= voxel.moisture * u_sunIntensity;
            
            // Colores espectrales del arco iris
            voxel.emission.r += rainbowIntensity * 0.8;
            voxel.emission.g += rainbowIntensity * 0.6;
            voxel.emission.b += rainbowIntensity * 0.4;
        }
    }
    
    // Halo solar (cristales de hielo)
    if (altitude > 6000.0 && voxel.temperature < -20.0 && voxel.moisture > 0.3) {
        vec3 toSun = u_sunDirection;
        vec3 toCam = normalize(u_cameraPosition - worldPos);
        float haloAngle = dot(toSun, toCam);
        
        // Halo a 22 grados
        if (abs(acos(haloAngle) - 0.384) < 0.05) { // 22 grados en radianes
            float haloIntensity = 0.2 * u_sunIntensity;
            voxel.emission += u_sunColor * haloIntensity;
        }
    }
}

// Función principal
void main() {
    vec3 voxelCoord = getVoxelCoord();
    
    if (!isValidCoord(voxelCoord)) {
        return;
    }
    
    int voxelIndex = getVoxelIndex(voxelCoord);
    AtmosphereVoxel voxel = atmosphere[voxelIndex];
    vec3 worldPos = getWorldPosition(voxelCoord);
    
    // Simulaciones atmosféricas principales
    simulateAtmosphericEffects(voxel, voxelCoord);
    simulateAtmosphericTransport(voxel, voxelCoord);
    simulateCloudInteraction(voxel, voxelCoord);
    
    // Efectos temporales y estacionales
    simulateTemporalEffects(voxel, worldPos);
    
    // Fenómenos ópticos especiales
    simulateOpticalPhenomena(voxel, voxelCoord);
    
    // Perspectiva atmosférica
    calculateAtmosphericPerspective(voxel, voxelCoord);
    
    // Cálculo de iluminación volumétrica
    vec3 viewDir = normalize(worldPos - u_cameraPosition);
    vec3 volumetricLight = calculateVolumetricLighting(worldPos, viewDir);
    
    // Scattering avanzado
    vec3 scatteredLight = calculateAdvancedScattering(worldPos, viewDir, u_sunDirection);
    
    // Combinar iluminación
    voxel.emission += volumetricLight * voxel.density * 0.1;
    voxel.scattering = mix(voxel.scattering, scatteredLight, 0.5);
    
    // Aplicar límites físicos
    voxel.density = clamp(voxel.density, 0.0, 1.0);
    voxel.temperature = clamp(voxel.temperature, -100.0, 100.0);
    voxel.moisture = clamp(voxel.moisture, 0.0, 1.0);
    voxel.pressure = clamp(voxel.pressure, 1000.0, 110000.0);
    voxel.particleDensity = clamp(voxel.particleDensity, 0.0, 1.0);
    voxel.scattering = clamp(voxel.scattering, vec3(0.0), vec3(1.0));
    voxel.absorption = clamp(voxel.absorption, vec3(0.0), vec3(1.0));
    voxel.emission = clamp(voxel.emission, vec3(0.0), vec3(10.0));
    
    // Almacenar contribución de iluminación
    lightContributions[voxelIndex] = vec4(volumetricLight, 1.0);
    
    // Escribir resultado
    atmosphere[voxelIndex] = voxel;
    
    // Sincronización de memoria
    memoryBarrierBuffer();
}