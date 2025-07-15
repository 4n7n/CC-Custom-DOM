#version 310 es
precision highp float;

// Weather Compute Shader - RAMA 5 Graphics Immersive
// Simulación avanzada de sistemas meteorológicos en tiempo real

layout(local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

// Estructura de celda meteorológica
struct WeatherCell {
    float temperature;     // Temperatura en Celsius
    float humidity;        // Humedad relativa (0-1)
    float pressure;        // Presión atmosférica en hPa
    float windSpeed;       // Velocidad del viento m/s
    vec2 windDirection;    // Dirección del viento (x, z)
    float precipitation;   // Precipitación mm/h
    float cloudDensity;    // Densidad de nubes (0-1)
    float visibility;      // Visibilidad en km
};

// Buffers de simulación meteorológica
layout(std430, binding = 0) restrict buffer WeatherGrid {
    WeatherCell weatherCells[];
};

layout(std430, binding = 1) restrict buffer WeatherHistory {
    WeatherCell previousWeather[];
};

layout(std430, binding = 2) restrict buffer TerrainData {
    vec4 terrainHeights[]; // xyz = position, w = height
};

// Uniformes de control
uniform float u_deltaTime;
uniform float u_time;
uniform vec2 u_gridSize;
uniform vec2 u_worldSize;
uniform float u_cellSize;

// Parámetros meteorológicos globales
uniform float u_globalTemperature;
uniform float u_globalHumidity;
uniform float u_globalPressure;
uniform vec2 u_globalWindDirection;
uniform float u_globalWindSpeed;
uniform float u_seasonFactor; // -1 (invierno) a 1 (verano)
uniform float u_timeOfDay;    // 0-24 horas

// Parámetros de simulación
uniform float u_thermalDiffusion;
uniform float u_moistureDiffusion;
uniform float u_pressureDiffusion;
uniform float u_windDiffusion;
uniform float u_evaporationRate;
uniform float u_condensationRate;
uniform float u_precipitationThreshold;
uniform float u_cloudFormationRate;
uniform float u_temperatureRange;

// Texturas de entrada
uniform sampler2D u_heightMap;
uniform sampler2D u_temperatureMap;
uniform sampler2D u_moistureMap;
uniform sampler2D u_noiseTexture;

// Constantes físicas
const float LAPSE_RATE = 0.0065;        // °C per meter
const float HUMIDITY_SATURATION = 1.0;
const float MIN_PRESSURE = 950.0;       // hPa
const float MAX_PRESSURE = 1050.0;      // hPa
const float WIND_FRICTION = 0.98;
const float THERMAL_EXPANSION = 0.003;
const float CORIOLIS_FACTOR = 0.0001;
const float PI = 3.14159265359;

// Funciones auxiliares
vec2 getGridCoord() {
    return vec2(gl_GlobalInvocationID.xy);
}

int getGridIndex(vec2 coord) {
    return int(coord.y * u_gridSize.x + coord.x);
}

vec2 getWorldPosition(vec2 gridCoord) {
    return (gridCoord / u_gridSize) * u_worldSize - u_worldSize * 0.5;
}

bool isValidCoord(vec2 coord) {
    return coord.x >= 0.0 && coord.x < u_gridSize.x && 
           coord.y >= 0.0 && coord.y < u_gridSize.y;
}

float getTerrainHeight(vec2 worldPos) {
    vec2 uv = (worldPos + u_worldSize * 0.5) / u_worldSize;
    return texture(u_heightMap, uv).r * 1000.0; // Escalar a metros
}

float noise3D(vec3 p) {
    return texture(u_noiseTexture, p.xy * 0.01 + p.z * 0.001).r * 2.0 - 1.0;
}

// Funciones de cálculo meteorológico
float calculateSolarRadiation(vec2 worldPos) {
    // Simulación simplificada de radiación solar
    float latitude = worldPos.y / u_worldSize.y * PI; // -PI/2 a PI/2
    float solarAngle = sin(u_timeOfDay / 24.0 * 2.0 * PI - PI/2) * sin(latitude);
    float seasonalFactor = 1.0 + u_seasonFactor * 0.3;
    
    return max(0.0, solarAngle) * seasonalFactor * 1000.0; // W/m²
}

float calculatePressureFromAltitude(float altitude) {
    // Fórmula barométrica simplificada
    return u_globalPressure * exp(-altitude * 0.0001);
}

float calculateDewPoint(float temperature, float humidity) {
    // Aproximación de Magnus para punto de rocío
    float a = 17.27;
    float b = 237.7;
    float alpha = ((a * temperature) / (b + temperature)) + log(humidity);
    return (b * alpha) / (a - alpha);
}

float calculateSaturatedVaporPressure(float temperature) {
    // Ecuación de Clausius-Clapeyron
    return 6.112 * exp((17.67 * temperature) / (temperature + 243.5));
}

vec2 calculateCoriolisForce(vec2 velocity, vec2 worldPos) {
    // Efecto Coriolis simplificado
    float latitude = worldPos.y / u_worldSize.y * PI;
    float coriolis = 2.0 * CORIOLIS_FACTOR * sin(latitude);
    
    return vec2(
        velocity.y * coriolis,
        -velocity.x * coriolis
    );
}

// Simulación de transferencia de calor
void simulateHeatTransfer(inout WeatherCell cell, vec2 gridCoord) {
    vec2 worldPos = getWorldPosition(gridCoord);
    float altitude = getTerrainHeight(worldPos);
    
    // Radiación solar
    float solarRadiation = calculateSolarRadiation(worldPos);
    float solarHeat = solarRadiation * (1.0 - cell.cloudDensity * 0.7) * u_deltaTime * 0.001;
    
    // Enfriamiento por altitud
    float altitudeCooling = altitude * LAPSE_RATE;
    
    // Enfriamiento nocturno
    float nightCooling = 0.0;
    if (solarRadiation < 100.0) {
        nightCooling = 2.0 * u_deltaTime; // 2°C por hora durante la noche
    }
    
    // Difusión térmica con celdas vecinas
    float thermalDiffusion = 0.0;
    int neighborCount = 0;
    
    for (int dx = -1; dx <= 1; dx++) {
        for (int dy = -1; dy <= 1; dy++) {
            if (dx == 0 && dy == 0) continue;
            
            vec2 neighborCoord = gridCoord + vec2(dx, dy);
            if (isValidCoord(neighborCoord)) {
                int neighborIndex = getGridIndex(neighborCoord);
                float neighborTemp = weatherCells[neighborIndex].temperature;
                thermalDiffusion += (neighborTemp - cell.temperature);
                neighborCount++;
            }
        }
    }
    
    if (neighborCount > 0) {
        thermalDiffusion = (thermalDiffusion / float(neighborCount)) * u_thermalDiffusion * u_deltaTime;
    }
    
    // Aplicar cambios de temperatura
    cell.temperature += solarHeat - altitudeCooling - nightCooling + thermalDiffusion;
    
    // Efecto de la humedad en la temperatura (calor latente)
    if (cell.precipitation > 0.0) {
        cell.temperature += cell.precipitation * 0.1; // Liberación de calor latente
    }
    
    // Limitar temperatura
    cell.temperature = clamp(cell.temperature, -50.0, 60.0);
}

// Simulación de humedad y evaporación
void simulateMoisture(inout WeatherCell cell, vec2 gridCoord) {
    vec2 worldPos = getWorldPosition(gridCoord);
    float altitude = getTerrainHeight(worldPos);
    
    // Evaporación basada en temperatura
    float evaporation = 0.0;
    if (cell.temperature > 0.0) {
        evaporation = u_evaporationRate * cell.temperature * u_deltaTime * 0.001;
        // Más evaporación cerca del agua (simplificado)
        if (altitude < 10.0) {
            evaporation *= 3.0;
        }
    }
    
    // Condensación cuando se alcanza saturación
    float saturationPressure = calculateSaturatedVaporPressure(cell.temperature);
    float vaporPressure = cell.humidity * saturationPressure;
    
    float condensation = 0.0;
    if (vaporPressure > saturationPressure) {
        condensation = (vaporPressure - saturationPressure) * u_condensationRate * u_deltaTime;
        cell.cloudDensity += condensation * 0.1;
    }
    
    // Difusión de humedad
    float moistureDiffusion = 0.0;
    int neighborCount = 0;
    
    for (int dx = -1; dx <= 1; dx++) {
        for (int dy = -1; dy <= 1; dy++) {
            if (dx == 0 && dy == 0) continue;
            
            vec2 neighborCoord = gridCoord + vec2(dx, dy);
            if (isValidCoord(neighborCoord)) {
                int neighborIndex = getGridIndex(neighborCoord);
                float neighborHumidity = weatherCells[neighborIndex].humidity;
                moistureDiffusion += (neighborHumidity - cell.humidity);
                neighborCount++;
            }
        }
    }
    
    if (neighborCount > 0) {
        moistureDiffusion = (moistureDiffusion / float(neighborCount)) * u_moistureDiffusion * u_deltaTime;
    }
    
    // Aplicar cambios de humedad
    cell.humidity += evaporation - condensation + moistureDiffusion;
    cell.humidity = clamp(cell.humidity, 0.0, 1.2); // Permitir supersaturación temporal
}

// Simulación de presión atmosférica
void simulatePressure(inout WeatherCell cell, vec2 gridCoord) {
    vec2 worldPos = getWorldPosition(gridCoord);
    float altitude = getTerrainHeight(worldPos);
    
    // Presión base por altitud
    float basePressure = calculatePressureFromAltitude(altitude);
    
    // Variaciones de presión por temperatura (expansión térmica)
    float thermalPressureChange = (cell.temperature - u_globalTemperature) * THERMAL_EXPANSION;
    
    // Difusión de presión (tendencia al equilibrio)
    float pressureDiffusion = 0.0;
    int neighborCount = 0;
    
    for (int dx = -1; dx <= 1; dx++) {
        for (int dy = -1; dy <= 1; dy++) {
            if (dx == 0 && dy == 0) continue;
            
            vec2 neighborCoord = gridCoord + vec2(dx, dy);
            if (isValidCoord(neighborCoord)) {
                int neighborIndex = getGridIndex(neighborCoord);
                float neighborPressure = weatherCells[neighborIndex].pressure;
                pressureDiffusion += (neighborPressure - cell.pressure);
                neighborCount++;
            }
        }
    }
    
    if (neighborCount > 0) {
        pressureDiffusion = (pressureDiffusion / float(neighborCount)) * u_pressureDiffusion * u_deltaTime;
    }
    
    // Fluctuaciones de presión por sistemas meteorológicos
    float noiseVariation = noise3D(vec3(worldPos * 0.001, u_time * 0.1)) * 2.0;
    
    // Aplicar cambios de presión
    cell.pressure = basePressure + thermalPressureChange + pressureDiffusion + noiseVariation;
    cell.pressure = clamp(cell.pressure, MIN_PRESSURE, MAX_PRESSURE);
}

// Simulación de viento
void simulateWind(inout WeatherCell cell, vec2 gridCoord) {
    vec2 worldPos = getWorldPosition(gridCoord);
    
    // Gradiente de presión (fuerza principal del viento)
    vec2 pressureGradient = vec2(0.0);
    
    // Calcular gradiente de presión en las 4 direcciones
    vec2 coords[4] = vec2[](
        gridCoord + vec2(1.0, 0.0),  // Este
        gridCoord + vec2(-1.0, 0.0), // Oeste
        gridCoord + vec2(0.0, 1.0),  // Norte
        gridCoord + vec2(0.0, -1.0)  // Sur
    );
    
    float pressures[4];
    for (int i = 0; i < 4; i++) {
        if (isValidCoord(coords[i])) {
            int index = getGridIndex(coords[i]);
            pressures[i] = weatherCells[index].pressure;
        } else {
            pressures[i] = cell.pressure;
        }
    }
    
    pressureGradient.x = (pressures[0] - pressures[1]) * 0.5; // Este - Oeste
    pressureGradient.y = (pressures[2] - pressures[3]) * 0.5; // Norte - Sur
    
    // Convertir gradiente de presión a fuerza de viento
    vec2 pressureForce = -pressureGradient * 0.1;
    
    // Efecto Coriolis
    vec2 currentVelocity = cell.windDirection * cell.windSpeed;
    vec2 coriolisForce = calculateCoriolisForce(currentVelocity, worldPos);
    
    // Fricción del terreno
    float altitude = getTerrainHeight(worldPos);
    float terrainFriction = exp(-altitude * 0.001); // Más fricción a menor altitud
    
    // Turbulencia
    vec2 turbulence = vec2(
        noise3D(vec3(worldPos * 0.002, u_time * 0.2)),
        noise3D(vec3(worldPos * 0.002 + 100.0, u_time * 0.2))
    ) * 0.5;
    
    // Integrar fuerzas del viento
    vec2 windAcceleration = pressureForce + coriolisForce + turbulence;
    currentVelocity += windAcceleration * u_deltaTime;
    
    // Aplicar fricción
    currentVelocity *= mix(WIND_FRICTION, 0.95, terrainFriction);
    
    // Influencia del viento global
    vec2 globalWind = u_globalWindDirection * u_globalWindSpeed;
    currentVelocity = mix(currentVelocity, globalWind, 0.1 * u_deltaTime);
    
    // Difusión de viento con celdas vecinas
    vec2 windDiffusion = vec2(0.0);
    int neighborCount = 0;
    
    for (int dx = -1; dx <= 1; dx++) {
        for (int dy = -1; dy <= 1; dy++) {
            if (dx == 0 && dy == 0) continue;
            
            vec2 neighborCoord = gridCoord + vec2(dx, dy);
            if (isValidCoord(neighborCoord)) {
                int neighborIndex = getGridIndex(neighborCoord);
                WeatherCell neighbor = weatherCells[neighborIndex];
                vec2 neighborWind = neighbor.windDirection * neighbor.windSpeed;
                windDiffusion += (neighborWind - currentVelocity);
                neighborCount++;
            }
        }
    }
    
    if (neighborCount > 0) {
        windDiffusion = (windDiffusion / float(neighborCount)) * u_windDiffusion * u_deltaTime;
        currentVelocity += windDiffusion;
    }
    
    // Actualizar velocidad y dirección del viento
    cell.windSpeed = length(currentVelocity);
    if (cell.windSpeed > 0.01) {
        cell.windDirection = normalize(currentVelocity);
    }
    
    // Limitar velocidad del viento
    cell.windSpeed = min(cell.windSpeed, 50.0); // Máximo 50 m/s
}

// Simulación de nubes y precipitación
void simulatePrecipitation(inout WeatherCell cell, vec2 gridCoord) {
    vec2 worldPos = getWorldPosition(gridCoord);
    float altitude = getTerrainHeight(worldPos);
    
    // Formación de nubes por condensación
    float dewPoint = calculateDewPoint(cell.temperature, cell.humidity);
    float condensationPotential = max(0.0, cell.humidity - 0.8);
    
    // Formación orográfica de nubes (por montañas)
    float orographicLift = max(0.0, altitude - 200.0) * 0.001;
    
    // Convección térmica
    float thermalLift = max(0.0, cell.temperature - u_globalTemperature) * 0.01;
    
    // Actualizar densidad de nubes
    float cloudFormation = (condensationPotential + orographicLift + thermalLift) * u_cloudFormationRate * u_deltaTime;
    cell.cloudDensity += cloudFormation;
    
    // Disipación de nubes
    float cloudDissipation = cell.cloudDensity * 0.1 * u_deltaTime;
    if (cell.humidity < 0.6) {
        cloudDissipation *= 2.0; // Disipación más rápida con baja humedad
    }
    cell.cloudDensity -= cloudDissipation;
    cell.cloudDensity = clamp(cell.cloudDensity, 0.0, 1.0);
    
    // Precipitación
    cell.precipitation = 0.0;
    if (cell.cloudDensity > u_precipitationThreshold && cell.temperature > -10.0) {
        float precipitationIntensity = pow(cell.cloudDensity - u_precipitationThreshold, 2.0);
        
        // Tipo de precipitación basado en temperatura
        if (cell.temperature > 2.0) {
            // Lluvia
            cell.precipitation = precipitationIntensity * 20.0; // mm/h
        } else if (cell.temperature > -2.0) {
            // Aguanieve
            cell.precipitation = precipitationIntensity * 15.0;
        } else {
            // Nieve
            cell.precipitation = precipitationIntensity * 10.0;
        }
        
        // Reducir humedad y densidad de nubes por precipitación
        float moistureReduction = cell.precipitation * 0.01 * u_deltaTime;
        cell.humidity -= moistureReduction;
        cell.cloudDensity -= moistureReduction * 0.5;
    }
    
    // Transporte de nubes por viento
    if (cell.windSpeed > 1.0 && cell.cloudDensity > 0.1) {
        vec2 windDirection = cell.windDirection;
        vec2 sourceCoord = gridCoord - windDirection * cell.windSpeed * u_deltaTime / u_cellSize;
        
        if (isValidCoord(sourceCoord)) {
            int sourceIndex = getGridIndex(sourceCoord);
            float sourceClouds = weatherCells[sourceIndex].cloudDensity;
            float cloudTransport = sourceClouds * 0.1 * u_deltaTime;
            
            cell.cloudDensity += cloudTransport;
            // Nota: La reducción en la celda fuente se maneja en su propia iteración
        }
    }
}

// Cálculo de visibilidad
void calculateVisibility(inout WeatherCell cell) {
    float baseVisibility = 50.0; // km en condiciones ideales
    
    // Reducción por precipitación
    if (cell.precipitation > 0.0) {
        float precipitationFactor = 1.0 / (1.0 + cell.precipitation * 0.1);
        baseVisibility *= precipitationFactor;
    }
    
    // Reducción por nubes/niebla
    if (cell.cloudDensity > 0.3 && cell.humidity > 0.9) {
        float fogFactor = 1.0 / (1.0 + (cell.cloudDensity - 0.3) * 5.0);
        baseVisibility *= fogFactor;
    }
    
    // Reducción por humedad alta (bruma)
    if (cell.humidity > 0.8) {
        float hazeFactor = 1.0 - (cell.humidity - 0.8) * 0.5;
        baseVisibility *= hazeFactor;
    }
    
    cell.visibility = max(0.1, baseVisibility);
}

// Aplicar efectos estacionales
void applySeasonalEffects(inout WeatherCell cell, vec2 worldPos) {
    // Variación estacional de temperatura
    float seasonalTempVariation = u_seasonFactor * u_temperatureRange * 0.5;
    
    // Latitud afecta la intensidad estacional
    float latitude = abs(worldPos.y / u_worldSize.y);
    seasonalTempVariation *= latitude;
    
    cell.temperature += seasonalTempVariation;
    
    // Patrones estacionales de humedad
    if (u_seasonFactor > 0.0) {
        // Verano: más evaporación
        cell.humidity += u_seasonFactor * 0.1;
    } else {
        // Invierno: menos evaporación
        cell.humidity += u_seasonFactor * 0.05;
    }
}

// Función principal
void main() {
    vec2 gridCoord = getGridCoord();
    
    if (!isValidCoord(gridCoord)) {
        return;
    }
    
    int cellIndex = getGridIndex(gridCoord);
    WeatherCell cell = weatherCells[cellIndex];
    vec2 worldPos = getWorldPosition(gridCoord);
    
    // Guardar estado anterior para estabilidad numérica
    previousWeather[cellIndex] = cell;
    
    // Ejecutar simulaciones meteorológicas
    simulateHeatTransfer(cell, gridCoord);
    simulateMoisture(cell, gridCoord);
    simulatePressure(cell, gridCoord);
    simulateWind(cell, gridCoord);
    simulatePrecipitation(cell, gridCoord);
    
    // Calcular propiedades derivadas
    calculateVisibility(cell);
    
    // Aplicar efectos estacionales
    applySeasonalEffects(cell, worldPos);
    
    // Estabilización numérica (mezclar con estado anterior)
    WeatherCell previous = previousWeather[cellIndex];
    float stabilityFactor = 0.05;
    
    cell.temperature = mix(cell.temperature, previous.temperature, stabilityFactor);
    cell.humidity = mix(cell.humidity, previous.humidity, stabilityFactor);
    cell.pressure = mix(cell.pressure, previous.pressure, stabilityFactor);
    cell.windSpeed = mix(cell.windSpeed, previous.windSpeed, stabilityFactor);
    
    // Aplicar límites finales
    cell.temperature = clamp(cell.temperature, -60.0, 70.0);
    cell.humidity = clamp(cell.humidity, 0.0, 1.0);
    cell.pressure = clamp(cell.pressure, MIN_PRESSURE, MAX_PRESSURE);
    cell.windSpeed = clamp(cell.windSpeed, 0.0, 60.0);
    cell.precipitation = clamp(cell.precipitation, 0.0, 100.0);
    cell.cloudDensity = clamp(cell.cloudDensity, 0.0, 1.0);
    cell.visibility = clamp(cell.visibility, 0.1, 100.0);
    
    // Escribir resultado
    weatherCells[cellIndex] = cell;
    
    // Sincronización de memoria
    memoryBarrierBuffer();
}