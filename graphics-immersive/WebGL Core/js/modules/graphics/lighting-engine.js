/**
 * Lighting Engine - Sistema avanzado de iluminación
 * Maneja diferentes tipos de luces y técnicas de sombreado
 */

import { vec3, vec4, mat4 } from 'gl-matrix';

class Light {
    constructor(type = 'directional') {
        this.type = type;
        this.enabled = true;
        
        // Propiedades básicas
        this.color = vec3.fromValues(1, 1, 1);
        this.intensity = 1.0;
        this.castShadows = false;
        
        // Posición y dirección
        this.position = vec3.fromValues(0, 10, 0);
        this.direction = vec3.fromValues(0, -1, 0);
        this.target = vec3.fromValues(0, 0, 0);
        
        // Parámetros específicos por tipo
        this.range = 100;
        this.spotAngle = 45;
        this.spotPenumbra = 10;
        this.decay = 2;
        
        // Matrices para sombras
        this.shadowMatrix = mat4.create();
        this.lightSpaceMatrix = mat4.create();
        
        // Configuración de sombras
        this.shadowMapSize = 1024;
        this.shadowBias = 0.001;
        this.shadowRadius = 1;
        this.shadowNearPlane = 0.1;
        this.shadowFarPlane = 500;
        
        this.updateMatrices();
    }

    setPosition(x, y, z) {
        vec3.set(this.position, x, y, z);
        this.updateMatrices();
    }

    setDirection(x, y, z) {
        vec3.set(this.direction, x, y, z);
        vec3.normalize(this.direction, this.direction);
        this.updateMatrices();
    }

    setTarget(x, y, z) {
        vec3.set(this.target, x, y, z);
        vec3.sub(this.direction, this.target, this.position);
        vec3.normalize(this.direction, this.direction);
        this.updateMatrices();
    }

    setColor(r, g, b) {
        vec3.set(this.color, r, g, b);
    }

    updateMatrices() {
        if (this.type === 'directional') {
            this.updateDirectionalMatrices();
        } else if (this.type === 'spot') {
            this.updateSpotMatrices();
        } else if (this.type === 'point') {
            this.updatePointMatrices();
        }
    }

    updateDirectionalMatrices() {
        // Para luces direccionales, usamos proyección ortográfica
        const lightProjection = mat4.create();
        const size = 50; // Tamaño del área de sombra
        mat4.ortho(lightProjection, -size, size, -size, size, 
                  this.shadowNearPlane, this.shadowFarPlane);
        
        const lightView = mat4.create();
        const lightPos = vec3.create();
        vec3.scaleAndAdd(lightPos, this.target, this.direction, -this.shadowFarPlane * 0.5);
        
        mat4.lookAt(lightView, lightPos, this.target, vec3.fromValues(0, 1, 0));
        
        mat4.multiply(this.lightSpaceMatrix, lightProjection, lightView);
    }

    updateSpotMatrices() {
        // Para spot lights, usamos proyección perspectiva
        const lightProjection = mat4.create();
        const fov = this.spotAngle * 2 * Math.PI / 180;
        mat4.perspective(lightProjection, fov, 1.0, 
                        this.shadowNearPlane, this.shadowFarPlane);
        
        const lightView = mat4.create();
        const target = vec3.create();
        vec3.add(target, this.position, this.direction);
        
        mat4.lookAt(lightView, this.position, target, vec3.fromValues(0, 1, 0));
        
        mat4.multiply(this.lightSpaceMatrix, lightProjection, lightView);
    }

    updatePointMatrices() {
        // Para point lights, necesitamos 6 matrices (cube map)
        // Por simplicidad, usamos solo una dirección principal
        this.updateSpotMatrices();
    }

    getUniforms(index = 0) {
        const uniforms = {};
        const prefix = `u_lights[${index}]`;
        
        uniforms[`${prefix}.type`] = this.getTypeIndex();
        uniforms[`${prefix}.enabled`] = this.enabled ? 1.0 : 0.0;
        uniforms[`${prefix}.position`] = this.position;
        uniforms[`${prefix}.direction`] = this.direction;
        uniforms[`${prefix}.color`] = this.color;
        uniforms[`${prefix}.intensity`] = this.intensity;
        uniforms[`${prefix}.range`] = this.range;
        uniforms[`${prefix}.spotAngle`] = Math.cos(this.spotAngle * Math.PI / 180);
        uniforms[`${prefix}.spotPenumbra`] = Math.cos((this.spotAngle + this.spotPenumbra) * Math.PI / 180);
        uniforms[`${prefix}.decay`] = this.decay;
        uniforms[`${prefix}.castShadows`] = this.castShadows ? 1.0 : 0.0;
        uniforms[`${prefix}.shadowBias`] = this.shadowBias;
        uniforms[`${prefix}.lightSpaceMatrix`] = this.lightSpaceMatrix;
        
        return uniforms;
    }

    getTypeIndex() {
        switch (this.type) {
            case 'directional': return 0;
            case 'point': return 1;
            case 'spot': return 2;
            case 'ambient': return 3;
            default: return 0;
        }
    }
}

class LightingEngine {
    constructor(renderer) {
        this.renderer = renderer;
        this.lights = [];
        this.ambientLight = null;
        
        // Configuración
        this.maxLights = 16;
        this.enableShadows = true;
        this.shadowQuality = 'medium'; // low, medium, high, ultra
        
        // Parámetros de iluminación global
        this.globalAmbient = vec3.fromValues(0.1, 0.1, 0.15);
        this.fogColor = vec3.fromValues(0.5, 0.6, 0.7);
        this.fogDensity = 0.0;
        this.fogNear = 10;
        this.fogFar = 100;
        
        // IBL (Image Based Lighting)
        this.environmentMap = null;
        this.irradianceMap = null;
        this.prefilterMap = null;
        this.brdfLUT = null;
        
        // Mapas de sombras
        this.shadowMaps = new Map();
        this.shadowFramebuffers = new Map();
        
        // Shaders de iluminación
        this.lightingShaders = new Map();
        
        this.init();
    }

    init() {
        this.setupDefaultLighting();
        this.createShadowMaps();
        this.createLightingShaders();
        
        console.log('Lighting Engine inicializado');
    }

    setupDefaultLighting() {
        // Luz direccional principal (sol)
        const sunLight = new Light('directional');
        sunLight.setDirection(-0.5, -1, -0.3);
        sunLight.setColor(1, 0.95, 0.8);
        sunLight.intensity = 2.0;
        sunLight.castShadows = true;
        this.addLight(sunLight);
        
        // Luz ambiente
        this.ambientLight = {
            color: vec3.fromValues(0.2, 0.25, 0.35),
            intensity: 0.3
        };
    }

    createShadowMaps() {
        if (!this.enableShadows) return;
        
        const gl = this.renderer.gl;
        const sizes = {
            low: 512,
            medium: 1024,
            high: 2048,
            ultra: 4096
        };
        
        const shadowMapSize = sizes[this.shadowQuality] || 1024;
        
        // Crear texture y framebuffer para cada luz que proyecta sombras
        this.lights.forEach((light, index) => {
            if (light.castShadows) {
                this.createShadowMapForLight(light, index, shadowMapSize);
            }
        });
    }

    createShadowMapForLight(light, index, size) {
        const gl = this.renderer.gl;
        
        // Crear depth texture
        const shadowMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, shadowMap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, size, size, 0, 
                     gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        // Crear framebuffer
        const shadowFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                               gl.TEXTURE_2D, shadowMap, 0);
        
        // No necesitamos color attachment para depth-only rendering
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
        
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Error creando shadow framebuffer');
        }
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        this.shadowMaps.set(index, shadowMap);
        this.shadowFramebuffers.set(index, shadowFramebuffer);
        
        light.shadowMapSize = size;
    }

    createLightingShaders() {
        // Vertex shader para depth rendering
        const depthVertexShader = `
            attribute vec3 a_position;
            uniform mat4 u_lightSpaceMatrix;
            uniform mat4 u_modelMatrix;
            
            void main() {
                gl_Position = u_lightSpaceMatrix * u_modelMatrix * vec4(a_position, 1.0);
            }
        `;
        
        // Fragment shader para depth rendering
        const depthFragmentShader = `
            precision mediump float;
            
            void main() {
                // gl_FragDepth se escribe automáticamente
            }
        `;
        
        this.renderer.createProgram('shadowMap', depthVertexShader, depthFragmentShader);
        
        // Shader principal de iluminación PBR
        const pbrVertexShader = `
            attribute vec3 a_position;
            attribute vec3 a_normal;
            attribute vec2 a_texCoord;
            attribute vec3 a_tangent;
            
            uniform mat4 u_modelMatrix;
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform mat3 u_normalMatrix;
            uniform mat4 u_lightSpaceMatrix;
            
            varying vec3 v_worldPos;
            varying vec3 v_normal;
            varying vec2 v_texCoord;
            varying vec4 v_lightSpacePos;
            varying mat3 v_tbn;
            
            void main() {
                vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
                v_worldPos = worldPos.xyz;
                v_texCoord = a_texCoord;
                
                v_normal = normalize(u_normalMatrix * a_normal);
                
                // Calcular matriz TBN para normal mapping
                vec3 T = normalize(u_normalMatrix * a_tangent);
                vec3 N = v_normal;
                vec3 B = cross(N, T);
                v_tbn = mat3(T, B, N);
                
                v_lightSpacePos = u_lightSpaceMatrix * worldPos;
                
                gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
            }
        `;
        
        const pbrFragmentShader = this.createPBRFragmentShader();
        
        this.renderer.createProgram('pbr', pbrVertexShader, pbrFragmentShader);
    }

    createPBRFragmentShader() {
        return `
            precision mediump float;
            
            struct Light {
                int type;
                float enabled;
                vec3 position;
                vec3 direction;
                vec3 color;
                float intensity;
                float range;
                float spotAngle;
                float spotPenumbra;
                float decay;
                float castShadows;
                float shadowBias;
                mat4 lightSpaceMatrix;
            };
            
            uniform Light u_lights[${this.maxLights}];
            uniform int u_numLights;
            uniform vec3 u_cameraPosition;
            uniform vec3 u_ambientColor;
            uniform float u_ambientIntensity;
            
            // Material uniforms
            uniform vec3 u_albedo;
            uniform float u_metallic;
            uniform float u_roughness;
            uniform float u_ao;
            uniform vec3 u_emissive;
            
            // Textures
            uniform sampler2D u_albedoMap;
            uniform sampler2D u_normalMap;
            uniform sampler2D u_metallicRoughnessMap;
            uniform sampler2D u_aoMap;
            uniform sampler2D u_emissiveMap;
            uniform sampler2D u_shadowMap;
            
            // IBL
            uniform samplerCube u_irradianceMap;
            uniform samplerCube u_prefilterMap;
            uniform sampler2D u_brdfLUT;
            
            varying vec3 v_worldPos;
            varying vec3 v_normal;
            varying vec2 v_texCoord;
            varying vec4 v_lightSpacePos;
            varying mat3 v_tbn;
            
            const float PI = 3.14159265359;
            
            // Funciones PBR
            vec3 getNormalFromMap() {
                vec3 tangentNormal = texture2D(u_normalMap, v_texCoord).xyz * 2.0 - 1.0;
                return normalize(v_tbn * tangentNormal);
            }
            
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
            
            float calculateShadow(vec4 lightSpacePos, float bias) {
                vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
                projCoords = projCoords * 0.5 + 0.5;
                
                if (projCoords.z > 1.0) return 0.0;
                
                float currentDepth = projCoords.z;
                float closestDepth = texture2D(u_shadowMap, projCoords.xy).r;
                
                // PCF (Percentage Closer Filtering)
                float shadow = 0.0;
                vec2 texelSize = 1.0 / vec2(1024.0); // Shadow map size
                
                for(int x = -1; x <= 1; ++x) {
                    for(int y = -1; y <= 1; ++y) {
                        float pcfDepth = texture2D(u_shadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
                        shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
                    }
                }
                shadow /= 9.0;
                
                return shadow;
            }
            
            vec3 calculateDirectionalLight(Light light, vec3 normal, vec3 viewDir, vec3 albedo, float metallic, float roughness, vec3 F0) {
                vec3 lightDir = normalize(-light.direction);
                vec3 halfwayDir = normalize(lightDir + viewDir);
                
                float NdotL = max(dot(normal, lightDir), 0.0);
                float NdotV = max(dot(normal, viewDir), 0.0);
                float NdotH = max(dot(normal, halfwayDir), 0.0);
                float VdotH = max(dot(viewDir, halfwayDir), 0.0);
                
                // Cook-Torrance BRDF
                float D = distributionGGX(normal, halfwayDir, roughness);
                float G = geometrySmith(normal, viewDir, lightDir, roughness);
                vec3 F = fresnelSchlick(VdotH, F0);
                
                vec3 numerator = D * G * F;
                float denominator = 4.0 * NdotV * NdotL + 0.0001;
                vec3 specular = numerator / denominator;
                
                vec3 kS = F;
                vec3 kD = vec3(1.0) - kS;
                kD *= 1.0 - metallic;
                
                vec3 radiance = light.color * light.intensity;
                
                // Calcular sombras
                float shadow = 0.0;
                if (light.castShadows > 0.5) {
                    shadow = calculateShadow(v_lightSpacePos, light.shadowBias);
                }
                
                return (kD * albedo / PI + specular) * radiance * NdotL * (1.0 - shadow);
            }
            
            vec3 calculatePointLight(Light light, vec3 normal, vec3 viewDir, vec3 worldPos, vec3 albedo, float metallic, float roughness, vec3 F0) {
                vec3 lightDir = normalize(light.position - worldPos);
                vec3 halfwayDir = normalize(lightDir + viewDir);
                
                float distance = length(light.position - worldPos);
                float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * (distance * distance));
                
                float NdotL = max(dot(normal, lightDir), 0.0);
                float NdotV = max(dot(normal, viewDir), 0.0);
                float VdotH = max(dot(viewDir, halfwayDir), 0.0);
                
                float D = distributionGGX(normal, halfwayDir, roughness);
                float G = geometrySmith(normal, viewDir, lightDir, roughness);
                vec3 F = fresnelSchlick(VdotH, F0);
                
                vec3 numerator = D * G * F;
                float denominator = 4.0 * NdotV * NdotL + 0.0001;
                vec3 specular = numerator / denominator;
                
                vec3 kS = F;
                vec3 kD = vec3(1.0) - kS;
                kD *= 1.0 - metallic;
                
                vec3 radiance = light.color * light.intensity * attenuation;
                
                return (kD * albedo / PI + specular) * radiance * NdotL;
            }
            
            vec3 calculateSpotLight(Light light, vec3 normal, vec3 viewDir, vec3 worldPos, vec3 albedo, float metallic, float roughness, vec3 F0) {
                vec3 lightDir = normalize(light.position - worldPos);
                
                // Calcular intensidad del spot
                float theta = dot(lightDir, normalize(-light.direction));
                float epsilon = light.spotAngle - light.spotPenumbra;
                float intensity = clamp((theta - light.spotPenumbra) / epsilon, 0.0, 1.0);
                
                // Si estamos fuera del cono, no hay iluminación
                if (theta <= light.spotPenumbra) {
                    return vec3(0.0);
                }
                
                // Calcular como point light pero con intensidad modulada
                vec3 result = calculatePointLight(light, normal, viewDir, worldPos, albedo, metallic, roughness, F0);
                return result * intensity;
            }
            
            void main() {
                // Obtener propiedades del material
                vec3 albedo = pow(texture2D(u_albedoMap, v_texCoord).rgb * u_albedo, vec3(2.2));
                vec3 metallicRoughness = texture2D(u_metallicRoughnessMap, v_texCoord).rgb;
                float metallic = metallicRoughness.b * u_metallic;
                float roughness = metallicRoughness.g * u_roughness;
                float ao = texture2D(u_aoMap, v_texCoord).r * u_ao;
                vec3 emissive = texture2D(u_emissiveMap, v_texCoord).rgb * u_emissive;
                
                // Obtener normal del normal map
                vec3 normal = getNormalFromMap();
                vec3 viewDir = normalize(u_cameraPosition - v_worldPos);
                
                // Calcular F0 para metales y dieléctricos
                vec3 F0 = vec3(0.04);
                F0 = mix(F0, albedo, metallic);
                
                // Iluminación directa
                vec3 Lo = vec3(0.0);
                
                for (int i = 0; i < ${this.maxLights}; ++i) {
                    if (i >= u_numLights) break;
                    if (u_lights[i].enabled < 0.5) continue;
                    
                    if (u_lights[i].type == 0) { // Directional
                        Lo += calculateDirectionalLight(u_lights[i], normal, viewDir, albedo, metallic, roughness, F0);
                    } else if (u_lights[i].type == 1) { // Point
                        Lo += calculatePointLight(u_lights[i], normal, viewDir, v_worldPos, albedo, metallic, roughness, F0);
                    } else if (u_lights[i].type == 2) { // Spot
                        Lo += calculateSpotLight(u_lights[i], normal, viewDir, v_worldPos, albedo, metallic, roughness, F0);
                    }
                }
                
                // Iluminación ambiente (IBL simplificada)
                vec3 F = fresnelSchlickRoughness(max(dot(normal, viewDir), 0.0), F0, roughness);
                vec3 kS = F;
                vec3 kD = 1.0 - kS;
                kD *= 1.0 - metallic;
                
                vec3 ambient = u_ambientColor * u_ambientIntensity * albedo * ao;
                
                vec3 color = ambient + Lo + emissive;
                
                // Tone mapping HDR -> LDR
                color = color / (color + vec3(1.0));
                
                // Gamma correction
                color = pow(color, vec3(1.0/2.2));
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    addLight(light) {
        if (this.lights.length >= this.maxLights) {
            console.warn('Máximo número de luces alcanzado');
            return false;
        }
        
        this.lights.push(light);
        
        // Crear shadow map si es necesario
        if (light.castShadows && this.enableShadows) {
            const index = this.lights.length - 1;
            const shadowMapSize = this.getShadowMapSize();
            this.createShadowMapForLight(light, index, shadowMapSize);
        }
        
        return true;
    }

    removeLight(light) {
        const index = this.lights.indexOf(light);
        if (index !== -1) {
            // Limpiar shadow map
            if (this.shadowMaps.has(index)) {
                const gl = this.renderer.gl;
                gl.deleteTexture(this.shadowMaps.get(index));
                gl.deleteFramebuffer(this.shadowFramebuffers.get(index));
                this.shadowMaps.delete(index);
                this.shadowFramebuffers.delete(index);
            }
            
            this.lights.splice(index, 1);
        }
    }

    getShadowMapSize() {
        const sizes = {
            low: 512,
            medium: 1024,
            high: 2048,
            ultra: 4096
        };
        return sizes[this.shadowQuality] || 1024;
    }

    renderShadowMaps(scene) {
        if (!this.enableShadows) return;
        
        const gl = this.renderer.gl;
        
        // Guardar viewport actual
        const viewport = gl.getParameter(gl.VIEWPORT);
        
        this.lights.forEach((light, index) => {
            if (!light.castShadows) return;
            
            const shadowMap = this.shadowMaps.get(index);
            const shadowFramebuffer = this.shadowFramebuffers.get(index);
            
            if (!shadowMap || !shadowFramebuffer) return;
            
            // Configurar framebuffer para shadow map
            gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
            gl.viewport(0, 0, light.shadowMapSize, light.shadowMapSize);
            gl.clear(gl.DEPTH_BUFFER_BIT);
            
            // Usar shader de depth
            const program = this.renderer.useProgram('shadowMap');
            
            // Configurar uniforms de la luz
            this.renderer.setUniform(program, 'u_lightSpaceMatrix', light.lightSpaceMatrix);
            
            // Renderizar escena desde la perspectiva de la luz
            scene.forEach(object => {
                this.renderer.setUniform(program, 'u_modelMatrix', object.worldMatrix);
                this.renderer.renderObject({
                    ...object,
                    program: 'shadowMap'
                });
            });
        });
        
        // Restaurar framebuffer y viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
    }

    setupLightingUniforms(program, camera) {
        const uniforms = {};
        
        // Configurar luces
        uniforms['u_numLights'] = this.lights.length;
        
        this.lights.forEach((light, index) => {
            const lightUniforms = light.getUniforms(index);
            Object.assign(uniforms, lightUniforms);
        });
        
        // Iluminación ambiente
        if (this.ambientLight) {
            uniforms['u_ambientColor'] = this.ambientLight.color;
            uniforms['u_ambientIntensity'] = this.ambientLight.intensity;
        }
        
        // Posición de la cámara
        uniforms['u_cameraPosition'] = camera.position;
        
        // Aplicar uniforms
        Object.entries(uniforms).forEach(([name, value]) => {
            this.renderer.setUniform(program, name, value);
        });
        
        // Bind shadow maps
        this.bindShadowMaps();
    }

    bindShadowMaps() {
        const gl = this.renderer.gl;
        
        this.shadowMaps.forEach((shadowMap, index) => {
            const textureUnit = 10 + index; // Usar unidades altas para shadow maps
            gl.activeTexture(gl.TEXTURE0 + textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, shadowMap);
        });
    }

    setAmbientLight(color, intensity) {
        this.ambientLight = {
            color: vec3.clone(color),
            intensity: intensity
        };
    }

    setGlobalAmbient(r, g, b) {
        vec3.set(this.globalAmbient, r, g, b);
    }

    setFog(color, density, near, far) {
        vec3.copy(this.fogColor, color);
        this.fogDensity = density;
        this.fogNear = near;
        this.fogFar = far;
    }

    enableShadowsForLight(lightIndex, enable) {
        if (lightIndex < this.lights.length) {
            this.lights[lightIndex].castShadows = enable;
            
            if (enable && !this.shadowMaps.has(lightIndex)) {
                const shadowMapSize = this.getShadowMapSize();
                this.createShadowMapForLight(this.lights[lightIndex], lightIndex, shadowMapSize);
            }
        }
    }

    setShadowQuality(quality) {
        this.shadowQuality = quality;
        
        // Recrear shadow maps con nueva calidad
        if (this.enableShadows) {
            this.disposeShadowMaps();
            this.createShadowMaps();
        }
    }

    updateLightMatrices() {
        this.lights.forEach(light => {
            light.updateMatrices();
        });
    }

    getLightByType(type) {
        return this.lights.filter(light => light.type === type);
    }

    getDirectionalLights() {
        return this.getLightByType('directional');
    }

    getPointLights() {
        return this.getLightByType('point');
    }

    getSpotLights() {
        return this.getLightByType('spot');
    }

    calculateLightContribution(light, position, normal) {
        const contribution = {
            diffuse: 0,
            specular: 0,
            attenuation: 1
        };
        
        if (light.type === 'directional') {
            const lightDir = vec3.create();
            vec3.normalize(lightDir, vec3.negate(vec3.create(), light.direction));
            contribution.diffuse = Math.max(0, vec3.dot(normal, lightDir));
        } else if (light.type === 'point') {
            const lightDir = vec3.create();
            vec3.sub(lightDir, light.position, position);
            const distance = vec3.length(lightDir);
            vec3.normalize(lightDir, lightDir);
            
            contribution.diffuse = Math.max(0, vec3.dot(normal, lightDir));
            contribution.attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * distance * distance);
        }
        
        return contribution;
    }

    disposeShadowMaps() {
        const gl = this.renderer.gl;
        
        this.shadowMaps.forEach(shadowMap => {
            gl.deleteTexture(shadowMap);
        });
        
        this.shadowFramebuffers.forEach(framebuffer => {
            gl.deleteFramebuffer(framebuffer);
        });
        
        this.shadowMaps.clear();
        this.shadowFramebuffers.clear();
    }

    dispose() {
        this.disposeShadowMaps();
        this.lights.length = 0;
        this.lightingShaders.clear();
        
        console.log('Lighting Engine limpiado');
    }
}

export { Light, LightingEngine };