#version 310 es
precision highp float;

// Particle Simulation Compute Shader - RAMA 5 Graphics Immersive
// Sistema de simulación de partículas en GPU para máximo rendimiento

layout(local_size_x = 64, local_size_y = 1, local_size_z = 1) in;

// Estructura de partícula
struct Particle {
    vec3 position;
    float mass;
    vec3 velocity;
    float life;
    vec3 force;
    float age;
    vec4 color;
    vec2 size;
    float rotation;
    float angularVelocity;
    int type;
    float energy;
    vec2 padding;
};

// Buffers de datos
layout(std430, binding = 0) restrict buffer ParticleBuffer {
    Particle particles[];
};

layout(std430, binding = 1) restrict buffer ForceFieldBuffer {
    vec4 forceFields[]; // xyz = position, w = strength
};

layout(std430, binding = 2) restrict buffer EmitterBuffer {
    vec4 emitters[]; // xyz = position, w = emission_rate
};

// Uniformes
uniform float u_deltaTime;
uniform float u_time;
uniform vec3 u_gravity;
uniform float u_damping;
uniform vec3 u_wind;
uniform float u_windStrength;
uniform int u_numParticles;
uniform int u_numForceFields;
uniform int u_numEmitters;
uniform vec3 u_worldBounds;
uniform float u_collisionDamping;
uniform int u_simulationType; // 0=basic, 1=social, 2=fire, 3=water, 4=smoke

// Parámetros de simulación específicos
uniform float u_socialRadius;
uniform float u_cohesionStrength;
uniform float u_separationStrength;
uniform float u_alignmentStrength;
uniform float u_turbulenceStrength;
uniform float u_temperatureDecay;
uniform float u_pressureInfluence;

// Texturas de ruido para efectos
uniform sampler2D u_noiseTexture;
uniform sampler2D u_windField;

// Constantes
const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;
const float EPSILON = 0.001;
const int MAX_NEIGHBORS = 32;

// Funciones auxiliares
uint hash(uint x) {
    x += (x << 10u);
    x ^= (x >> 6u);
    x += (x << 3u);
    x ^= (x >> 11u);
    x += (x << 15u);
    return x;
}

float random(uint seed) {
    return float(hash(seed)) / 4294967295.0;
}

vec3 randomVec3(uint seed) {
    return vec3(
        random(seed),
        random(seed + 1u),
        random(seed + 2u)
    ) * 2.0 - 1.0;
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    f = f * f * (3.0 - 2.0 * f);
    
    float a = texture(u_noiseTexture, (i.xy + vec2(0.0, 0.0)) / 256.0).r;
    float b = texture(u_noiseTexture, (i.xy + vec2(1.0, 0.0)) / 256.0).r;
    float c = texture(u_noiseTexture, (i.xy + vec2(0.0, 1.0)) / 256.0).r;
    float d = texture(u_noiseTexture, (i.xy + vec2(1.0, 1.0)) / 256.0).r;
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 curl(vec3 p) {
    float eps = 0.1;
    
    float n1 = noise(p + vec3(eps, 0.0, 0.0));
    float n2 = noise(p - vec3(eps, 0.0, 0.0));
    float n3 = noise(p + vec3(0.0, eps, 0.0));
    float n4 = noise(p - vec3(0.0, eps, 0.0));
    float n5 = noise(p + vec3(0.0, 0.0, eps));
    float n6 = noise(p - vec3(0.0, 0.0, eps));
    
    return vec3(
        n4 - n3 + n6 - n5,
        n1 - n2 + n5 - n6,
        n3 - n4 + n2 - n1
    ) / (2.0 * eps);
}

// Simulación básica de partículas
void simulateBasicParticles() {
    uint index = gl_GlobalInvocationID.x;
    if (index >= u_numParticles) return;
    
    Particle p = particles[index];
    
    // Skip dead particles
    if (p.life <= 0.0) return;
    
    // Reset forces
    p.force = vec3(0.0);
    
    // Apply gravity
    p.force += u_gravity * p.mass;
    
    // Apply wind
    vec3 windForce = u_wind * u_windStrength;
    p.force += windForce;
    
    // Apply turbulence
    vec3 turbulence = curl(p.position * 0.01 + u_time * 0.1) * u_turbulenceStrength;
    p.force += turbulence;
    
    // Apply force fields
    for (int i = 0; i < u_numForceFields; i++) {
        vec3 fieldPos = forceFields[i].xyz;
        float fieldStrength = forceFields[i].w;
        
        vec3 direction = p.position - fieldPos;
        float distance = length(direction);
        
        if (distance > EPSILON) {
            direction /= distance;
            float force = fieldStrength / (distance * distance + 1.0);
            p.force += direction * force;
        }
    }
    
    // Integrate forces
    vec3 acceleration = p.force / p.mass;
    p.velocity += acceleration * u_deltaTime;
    p.velocity *= u_damping;
    
    // Update position
    p.position += p.velocity * u_deltaTime;
    
    // Update rotation
    p.rotation += p.angularVelocity * u_deltaTime;
    
    // Update life
    p.age += u_deltaTime;
    p.life -= u_deltaTime;
    
    // Boundary conditions
    if (p.position.x < -u_worldBounds.x || p.position.x > u_worldBounds.x) {
        p.velocity.x *= -u_collisionDamping;
        p.position.x = clamp(p.position.x, -u_worldBounds.x, u_worldBounds.x);
    }
    if (p.position.y < -u_worldBounds.y || p.position.y > u_worldBounds.y) {
        p.velocity.y *= -u_collisionDamping;
        p.position.y = clamp(p.position.y, -u_worldBounds.y, u_worldBounds.y);
    }
    if (p.position.z < -u_worldBounds.z || p.position.z > u_worldBounds.z) {
        p.velocity.z *= -u_collisionDamping;
        p.position.z = clamp(p.position.z, -u_worldBounds.z, u_worldBounds.z);
    }
    
    particles[index] = p;
}

// Simulación social de partículas (flocking)
void simulateSocialParticles() {
    uint index = gl_GlobalInvocationID.x;
    if (index >= u_numParticles) return;
    
    Particle p = particles[index];
    if (p.life <= 0.0) return;
    
    p.force = vec3(0.0);
    
    // Flocking forces
    vec3 cohesion = vec3(0.0);
    vec3 separation = vec3(0.0);
    vec3 alignment = vec3(0.0);
    int neighborCount = 0;
    
    // Find neighbors
    for (int i = 0; i < min(u_numParticles, int(index) + MAX_NEIGHBORS); i++) {
        if (i == int(index)) continue;
        
        Particle neighbor = particles[i];
        if (neighbor.life <= 0.0) continue;
        
        vec3 diff = neighbor.position - p.position;
        float distance = length(diff);
        
        if (distance < u_socialRadius && distance > EPSILON) {
            neighborCount++;
            
            // Cohesion: steer towards average position of neighbors
            cohesion += neighbor.position;
            
            // Separation: steer to avoid crowding local flockmates
            vec3 separationForce = p.position - neighbor.position;
            separationForce = normalize(separationForce) / distance;
            separation += separationForce;
            
            // Alignment: steer towards average heading of neighbors
            alignment += neighbor.velocity;
        }
    }
    
    if (neighborCount > 0) {
        // Cohesion
        cohesion /= float(neighborCount);
        cohesion = normalize(cohesion - p.position) * u_cohesionStrength;
        p.force += cohesion;
        
        // Separation
        separation = normalize(separation) * u_separationStrength;
        p.force += separation;
        
        // Alignment
        alignment /= float(neighborCount);
        alignment = normalize(alignment - p.velocity) * u_alignmentStrength;
        p.force += alignment;
    }
    
    // Apply gravity and other forces
    p.force += u_gravity * p.mass;
    
    // Integrate
    vec3 acceleration = p.force / p.mass;
    p.velocity += acceleration * u_deltaTime;
    p.velocity *= u_damping;
    
    // Limit speed
    float speed = length(p.velocity);
    float maxSpeed = 10.0;
    if (speed > maxSpeed) {
        p.velocity = normalize(p.velocity) * maxSpeed;
    }
    
    p.position += p.velocity * u_deltaTime;
    p.age += u_deltaTime;
    p.life -= u_deltaTime;
    
    particles[index] = p;
}

// Simulación de partículas de fuego
void simulateFireParticles() {
    uint index = gl_GlobalInvocationID.x;
    if (index >= u_numParticles) return;
    
    Particle p = particles[index];
    if (p.life <= 0.0) return;
    
    p.force = vec3(0.0);
    
    // Buoyancy force (hot air rises)
    float temperature = p.energy;
    vec3 buoyancy = vec3(0.0, temperature * 2.0, 0.0);
    p.force += buoyancy;
    
    // Turbulence for realistic fire movement
    vec3 turbulence = curl(p.position * 0.02 + u_time * 0.2) * u_turbulenceStrength * 2.0;
    p.force += turbulence;
    
    // Wind effect
    p.force += u_wind * u_windStrength * 0.5;
    
    // Temperature decay
    p.energy -= u_temperatureDecay * u_deltaTime;
    p.energy = max(0.0, p.energy);
    
    // Update color based on temperature
    float tempNormalized = clamp(p.energy / 100.0, 0.0, 1.0);
    p.color.rgb = mix(vec3(0.8, 0.1, 0.0), vec3(1.0, 1.0, 0.3), tempNormalized);
    p.color.a = tempNormalized * 0.7;
    
    // Size changes with temperature
    p.size.x = mix(0.1, 2.0, tempNormalized);
    p.size.y = p.size.x;
    
    // Integrate physics
    vec3 acceleration = p.force / p.mass;
    p.velocity += acceleration * u_deltaTime;
    p.velocity *= 0.98; // Higher damping for fire
    
    p.position += p.velocity * u_deltaTime;
    p.age += u_deltaTime;
    p.life -= u_deltaTime * (1.0 + p.energy * 0.01); // Hotter particles die faster
    
    particles[index] = p;
}

// Simulación de partículas de agua
void simulateWaterParticles() {
    uint index = gl_GlobalInvocationID.x;
    if (index >= u_numParticles) return;
    
    Particle p = particles[index];
    if (p.life <= 0.0) return;
    
    p.force = vec3(0.0);
    
    // Strong gravity for water
    p.force += u_gravity * p.mass * 1.5;
    
    // Surface tension and cohesion
    vec3 cohesionForce = vec3(0.0);
    vec3 pressureForce = vec3(0.0);
    int neighborCount = 0;
    
    float smoothingRadius = 2.0;
    
    for (int i = 0; i < min(u_numParticles, int(index) + MAX_NEIGHBORS); i++) {
        if (i == int(index)) continue;
        
        Particle neighbor = particles[i];
        if (neighbor.life <= 0.0 || neighbor.type != p.type) continue;
        
        vec3 diff = neighbor.position - p.position;
        float distance = length(diff);
        
        if (distance < smoothingRadius && distance > EPSILON) {
            neighborCount++;
            
            // Pressure force (SPH)
            float pressure = u_pressureInfluence * neighborCount;
            vec3 pressureGradient = normalize(diff) * pressure / (distance * distance);
            pressureForce -= pressureGradient;
            
            // Cohesion for surface tension
            cohesionForce += normalize(diff) * (smoothingRadius - distance) / smoothingRadius;
        }
    }
    
    p.force += pressureForce * 0.1;
    p.force += cohesionForce * 0.05;
    
    // Viscosity
    p.velocity *= 0.95;
    
    // Integrate
    vec3 acceleration = p.force / p.mass;
    p.velocity += acceleration * u_deltaTime;
    
    p.position += p.velocity * u_deltaTime;
    
    // Ground collision with splash
    if (p.position.y < -u_worldBounds.y) {
        p.position.y = -u_worldBounds.y;
        p.velocity.y *= -0.3; // Water splash
        p.velocity.x *= 0.8;
        p.velocity.z *= 0.8;
    }
    
    p.age += u_deltaTime;
    p.life -= u_deltaTime * 0.1; // Water evaporates slowly
    
    particles[index] = p;
}

// Simulación de partículas de humo
void simulateSmokeParticles() {
    uint index = gl_GlobalInvocationID.x;
    if (index >= u_numParticles) return;
    
    Particle p = particles[index];
    if (p.life <= 0.0) return;
    
    p.force = vec3(0.0);
    
    // Buoyancy (smoke rises)
    vec3 buoyancy = vec3(0.0, 1.0, 0.0);
    p.force += buoyancy;
    
    // Strong turbulence for smoke dispersion
    vec3 turbulence = curl(p.position * 0.03 + u_time * 0.15) * u_turbulenceStrength * 3.0;
    p.force += turbulence;
    
    // Wind effect
    p.force += u_wind * u_windStrength;
    
    // Expansion over time
    float ageNormalized = p.age / (p.age + p.life);
    p.size.x = mix(0.5, 3.0, ageNormalized);
    p.size.y = p.size.x;
    
    // Fade out over time
    p.color.a = 1.0 - ageNormalized;
    
    // Integrate
    vec3 acceleration = p.force / p.mass;
    p.velocity += acceleration * u_deltaTime;
    p.velocity *= 0.97; // Some damping
    
    p.position += p.velocity * u_deltaTime;
    p.age += u_deltaTime;
    p.life -= u_deltaTime;
    
    particles[index] = p;
}

// Función principal
void main() {
    switch (u_simulationType) {
        case 0:
            simulateBasicParticles();
            break;
        case 1:
            simulateSocialParticles();
            break;
        case 2:
            simulateFireParticles();
            break;
        case 3:
            simulateWaterParticles();
            break;
        case 4:
            simulateSmokeParticles();
            break;
        default:
            simulateBasicParticles();
            break;
    }
    
    // Emit new particles from emitters
    uint emitterIndex = gl_GlobalInvocationID.x % u_numEmitters;
    if (emitterIndex < u_numEmitters && particles[gl_GlobalInvocationID.x].life <= 0.0) {
        vec4 emitter = emitters[emitterIndex];
        
        if (random(gl_GlobalInvocationID.x + uint(u_time * 1000.0)) < emitter.w * u_deltaTime) {
            Particle newParticle;
            
            // Initialize new particle
            newParticle.position = emitter.xyz + randomVec3(gl_GlobalInvocationID.x) * 0.5;
            newParticle.velocity = randomVec3(gl_GlobalInvocationID.x + 100u) * 2.0;
            newParticle.mass = 1.0;
            newParticle.life = 5.0 + random(gl_GlobalInvocationID.x + 200u) * 5.0;
            newParticle.age = 0.0;
            newParticle.force = vec3(0.0);
            newParticle.color = vec4(1.0, 1.0, 1.0, 1.0);
            newParticle.size = vec2(1.0);
            newParticle.rotation = 0.0;
            newParticle.angularVelocity = (random(gl_GlobalInvocationID.x + 300u) - 0.5) * 4.0;
            newParticle.type = u_simulationType;
            newParticle.energy = 50.0 + random(gl_GlobalInvocationID.x + 400u) * 50.0;
            
            particles[gl_GlobalInvocationID.x] = newParticle;
        }
    }
}