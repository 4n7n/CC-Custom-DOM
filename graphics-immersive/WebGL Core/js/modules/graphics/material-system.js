/**
 * Material System - Sistema de materiales PBR
 * Gestiona materiales, propiedades y texturas
 */

import { vec3, vec4 } from 'gl-matrix';

class Material {
    constructor(name = 'Material', type = 'pbr') {
        this.name = name;
        this.type = type;
        this.id = this.generateId();
        
        // Propiedades PBR básicas
        this.albedo = vec3.fromValues(1, 1, 1);
        this.metallic = 0.0;
        this.roughness = 0.5;
        this.normalScale = 1.0;
        this.occlusionStrength = 1.0;
        this.emissive = vec3.fromValues(0, 0, 0);
        this.emissiveIntensity = 1.0;
        
        // Propiedades adicionales
        this.opacity = 1.0;
        this.alphaTest = 0.0;
        this.doubleSided = false;
        this.transparent = false;
        this.depthWrite = true;
        this.depthTest = true;
        
        // Texturas
        this.textures = {
            albedo: null,
            normal: null,
            metallicRoughness: null,
            occlusion: null,
            emissive: null,
            height: null,
            opacity: null
        };
        
        // Configuración de texturas
        this.textureSettings = {
            albedo: { repeat: [1, 1], offset: [0, 0], rotation: 0 },
            normal: { repeat: [1, 1], offset: [0, 0], rotation: 0 },
            metallicRoughness: { repeat: [1, 1], offset: [0, 0], rotation: 0 },
            occlusion: { repeat: [1, 1], offset: [0, 0], rotation: 0 },
            emissive: { repeat: [1, 1], offset: [0, 0], rotation: 0 }
        };
        
        // Estados de blending
        this.blending = {
            enabled: false,
            srcFactor: 'SRC_ALPHA',
            dstFactor: 'ONE_MINUS_SRC_ALPHA',
            equation: 'FUNC_ADD'
        };
        
        // Propiedades específicas por tipo
        this.properties = {};
        
        this.initializeByType();
    }

    generateId() {
        return 'mat_' + Math.random().toString(36).substr(2, 9);
    }

    initializeByType() {
        switch (this.type) {
            case 'pbr':
                this.initializePBR();
                break;
            case 'unlit':
                this.initializeUnlit();
                break;
            case 'water':
                this.initializeWater();
                break;
            case 'glass':
                this.initializeGlass();
                break;
            case 'vegetation':
                this.initializeVegetation();
                break;
            default:
                this.initializePBR();
        }
    }

    initializePBR() {
        this.properties = {
            clearcoat: 0.0,
            clearcoatRoughness: 0.0,
            transmission: 0.0,
            ior: 1.5,
            thickness: 0.0,
            specularColor: vec3.fromValues(1, 1, 1),
            specularFactor: 1.0
        };
    }

    initializeUnlit() {
        this.properties = {
            color: vec3.clone(this.albedo),
            brightness: 1.0
        };
    }

    initializeWater() {
        this.transparent = true;
        this.properties = {
            waterColor: vec3.fromValues(0.1, 0.3, 0.5),
            waveSpeed: 1.0,
            waveScale: 1.0,
            waveStrength: 0.1,
            foamColor: vec3.fromValues(1, 1, 1),
            foamScale: 10.0,
            refraction: 1.33,
            transparency: 0.8,
            flowDirection: vec3.fromValues(1, 0, 0)
        };
    }

    initializeGlass() {
        this.transparent = true;
        this.properties = {
            glassColor: vec3.fromValues(0.9, 0.95, 1.0),
            transparency: 0.9,
            refraction: 1.52,
            dispersion: 0.0,
            thickness: 1.0,
            absorption: vec3.fromValues(0.1, 0.1, 0.1)
        };
    }

    initializeVegetation() {
        this.doubleSided = true;
        this.alphaTest = 0.5;
        this.properties = {
            subsurface: 0.5,
            translucency: 0.3,
            windStrength: 1.0,
            windFrequency: 1.0,
            bendFactor: 1.0,
            leafColor: vec3.fromValues(0.2, 0.6, 0.2)
        };
    }

    setAlbedo(r, g, b) {
        vec3.set(this.albedo, r, g, b);
        return this;
    }

    setMetallic(value) {
        this.metallic = Math.max(0, Math.min(1, value));
        return this;
    }

    setRoughness(value) {
        this.roughness = Math.max(0, Math.min(1, value));
        return this;
    }

    setEmissive(r, g, b, intensity = 1.0) {
        vec3.set(this.emissive, r, g, b);
        this.emissiveIntensity = intensity;
        return this;
    }

    setOpacity(value) {
        this.opacity = Math.max(0, Math.min(1, value));
        if (this.opacity < 1.0) {
            this.transparent = true;
            this.blending.enabled = true;
        }
        return this;
    }

    setTexture(type, texture, settings = {}) {
        if (this.textures.hasOwnProperty(type)) {
            this.textures[type] = texture;
            
            // Configurar settings de textura
            if (settings) {
                this.textureSettings[type] = {
                    ...this.textureSettings[type],
                    ...settings
                };
            }
        } else {
            console.warn(`Tipo de textura '${type}' no reconocido`);
        }
        return this;
    }

    removeTexture(type) {
        if (this.textures.hasOwnProperty(type)) {
            this.textures[type] = null;
        }
        return this;
    }

    setTextureRepeat(type, u, v) {
        if (this.textureSettings[type]) {
            this.textureSettings[type].repeat = [u, v];
        }
        return this;
    }

    setTextureOffset(type, u, v) {
        if (this.textureSettings[type]) {
            this.textureSettings[type].offset = [u, v];
        }
        return this;
    }

    setProperty(name, value) {
        this.properties[name] = value;
        return this;
    }

    getProperty(name) {
        return this.properties[name];
    }

    enableTransparency(enable = true) {
        this.transparent = enable;
        this.blending.enabled = enable;
        if (enable) {
            this.depthWrite = false;
        }
        return this;
    }

    setBlending(srcFactor, dstFactor, equation = 'FUNC_ADD') {
        this.blending.enabled = true;
        this.blending.srcFactor = srcFactor;
        this.blending.dstFactor = dstFactor;
        this.blending.equation = equation;
        return this;
    }

    getUniforms() {
        const uniforms = {
            // Propiedades básicas PBR
            u_albedo: this.albedo,
            u_metallic: this.metallic,
            u_roughness: this.roughness,
            u_normalScale: this.normalScale,
            u_occlusionStrength: this.occlusionStrength,
            u_emissive: this.emissive,
            u_emissiveIntensity: this.emissiveIntensity,
            u_opacity: this.opacity,
            u_alphaTest: this.alphaTest,
            
            // Configuración de texturas
            u_hasAlbedoMap: this.textures.albedo ? 1.0 : 0.0,
            u_hasNormalMap: this.textures.normal ? 1.0 : 0.0,
            u_hasMetallicRoughnessMap: this.textures.metallicRoughness ? 1.0 : 0.0,
            u_hasOcclusionMap: this.textures.occlusion ? 1.0 : 0.0,
            u_hasEmissiveMap: this.textures.emissive ? 1.0 : 0.0,
            u_hasHeightMap: this.textures.height ? 1.0 : 0.0,
            
            // Repetición y offset de texturas
            u_albedoRepeat: this.textureSettings.albedo.repeat,
            u_albedoOffset: this.textureSettings.albedo.offset,
            u_normalRepeat: this.textureSettings.normal.repeat,
            u_normalOffset: this.textureSettings.normal.offset
        };
        
        // Agregar propiedades específicas del tipo
        Object.entries(this.properties).forEach(([key, value]) => {
            uniforms[`u_${key}`] = value;
        });
        
        return uniforms;
    }

    getTextureBindings() {
        const bindings = {};
        let unit = 0;
        
        Object.entries(this.textures).forEach(([type, texture]) => {
            if (texture) {
                bindings[`u_${type}Map`] = unit++;
            }
        });
        
        return bindings;
    }

    clone() {
        const cloned = new Material(this.name + '_clone', this.type);
        
        // Copiar propiedades básicas
        vec3.copy(cloned.albedo, this.albedo);
        cloned.metallic = this.metallic;
        cloned.roughness = this.roughness;
        cloned.normalScale = this.normalScale;
        cloned.occlusionStrength = this.occlusionStrength;
        vec3.copy(cloned.emissive, this.emissive);
        cloned.emissiveIntensity = this.emissiveIntensity;
        cloned.opacity = this.opacity;
        cloned.alphaTest = this.alphaTest;
        cloned.doubleSided = this.doubleSided;
        cloned.transparent = this.transparent;
        cloned.depthWrite = this.depthWrite;
        cloned.depthTest = this.depthTest;
        
        // Copiar texturas (referencia, no clonar texturas)
        Object.assign(cloned.textures, this.textures);
        
        // Copiar configuración de texturas
        Object.entries(this.textureSettings).forEach(([key, settings]) => {
            cloned.textureSettings[key] = { ...settings };
        });
        
        // Copiar blending
        cloned.blending = { ...this.blending };
        
        // Copiar propiedades específicas
        cloned.properties = { ...this.properties };
        
        return cloned;
    }

    static createPreset(preset) {
        switch (preset) {
            case 'metal':
                return new Material('Metal', 'pbr')
                    .setAlbedo(0.7, 0.7, 0.7)
                    .setMetallic(1.0)
                    .setRoughness(0.1);
                    
            case 'plastic':
                return new Material('Plastic', 'pbr')
                    .setAlbedo(0.8, 0.2, 0.2)
                    .setMetallic(0.0)
                    .setRoughness(0.3);
                    
            case 'wood':
                return new Material('Wood', 'pbr')
                    .setAlbedo(0.6, 0.4, 0.2)
                    .setMetallic(0.0)
                    .setRoughness(0.8);
                    
            case 'glass':
                return new Material('Glass', 'glass')
                    .setAlbedo(0.95, 0.95, 1.0)
                    .setMetallic(0.0)
                    .setRoughness(0.0)
                    .setOpacity(0.1)
                    .enableTransparency();
                    
            case 'water':
                return new Material('Water', 'water')
                    .setAlbedo(0.1, 0.3, 0.6)
                    .setMetallic(0.0)
                    .setRoughness(0.0)
                    .enableTransparency();
                    
            case 'emissive':
                return new Material('Emissive', 'pbr')
                    .setAlbedo(0.1, 0.1, 0.1)
                    .setEmissive(1.0, 0.5, 0.0, 2.0)
                    .setMetallic(0.0)
                    .setRoughness(0.5);
                    
            default:
                return new Material('Default', 'pbr');
        }
    }
}

class MaterialLibrary {
    constructor() {
        this.materials = new Map();
        this.presets = new Map();
        this.templates = new Map();
        
        this.initializePresets();
    }

    initializePresets() {
        // Crear materiales preset comunes
        const presets = [
            'metal', 'plastic', 'wood', 'glass', 
            'water', 'emissive'
        ];
        
        presets.forEach(preset => {
            const material = Material.createPreset(preset);
            this.presets.set(preset, material);
        });
        
        // Crear templates adicionales
        this.createTemplates();
    }

    createTemplates() {
        // Template para piel
        const skin = new Material('Skin_Template', 'pbr')
            .setAlbedo(0.95, 0.7, 0.6)
            .setMetallic(0.0)
            .setRoughness(0.4)
            .setProperty('subsurface', 0.8)
            .setProperty('subsurfaceColor', vec3.fromValues(0.9, 0.3, 0.2));
        
        this.templates.set('skin', skin);
        
        // Template para tela
        const fabric = new Material('Fabric_Template', 'pbr')
            .setAlbedo(0.5, 0.5, 0.8)
            .setMetallic(0.0)
            .setRoughness(0.9)
            .setProperty('fuzz', 0.3)
            .setProperty('fuzzColor', vec3.fromValues(0.8, 0.8, 1.0));
        
        this.templates.set('fabric', fabric);
        
        // Template para cristal
        const crystal = new Material('Crystal_Template', 'pbr')
            .setAlbedo(0.9, 0.95, 1.0)
            .setMetallic(0.0)
            .setRoughness(0.0)
            .setProperty('clearcoat', 1.0)
            .setProperty('clearcoatRoughness', 0.0)
            .setProperty('transmission', 0.9)
            .setProperty('ior', 2.4);
        
        this.templates.set('crystal', crystal);
        
        // Template para vegetación
        const vegetation = new Material('Vegetation_Template', 'vegetation')
            .setAlbedo(0.2, 0.6, 0.2)
            .setMetallic(0.0)
            .setRoughness(0.8)
            .setProperty('subsurface', 0.5)
            .setProperty('translucency', 0.3);
        
        this.templates.set('vegetation', vegetation);
    }

    addMaterial(material) {
        this.materials.set(material.id, material);
        return material.id;
    }

    getMaterial(id) {
        return this.materials.get(id);
    }

    getMaterialByName(name) {
        for (const material of this.materials.values()) {
            if (material.name === name) {
                return material;
            }
        }
        return null;
    }

    removeMaterial(id) {
        return this.materials.delete(id);
    }

    getPreset(name) {
        return this.presets.get(name);
    }

    getTemplate(name) {
        return this.templates.get(name);
    }

    cloneMaterial(id, newName) {
        const material = this.materials.get(id);
        if (material) {
            const cloned = material.clone();
            cloned.name = newName || (material.name + '_copy');
            this.addMaterial(cloned);
            return cloned;
        }
        return null;
    }

    createFromPreset(presetName, materialName) {
        const preset = this.presets.get(presetName);
        if (preset) {
            const material = preset.clone();
            material.name = materialName || presetName;
            this.addMaterial(material);
            return material;
        }
        return null;
    }

    createFromTemplate(templateName, materialName) {
        const template = this.templates.get(templateName);
        if (template) {
            const material = template.clone();
            material.name = materialName || templateName;
            this.addMaterial(material);
            return material;
        }
        return null;
    }

    getAllMaterials() {
        return Array.from(this.materials.values());
    }

    getMaterialsByType(type) {
        return this.getAllMaterials().filter(material => material.type === type);
    }

    findMaterials(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.getAllMaterials().filter(material => 
            material.name.toLowerCase().includes(term) ||
            material.type.toLowerCase().includes(term)
        );
    }

    exportMaterial(id) {
        const material = this.materials.get(id);
        if (!material) return null;
        
        return {
            name: material.name,
            type: material.type,
            albedo: Array.from(material.albedo),
            metallic: material.metallic,
            roughness: material.roughness,
            normalScale: material.normalScale,
            occlusionStrength: material.occlusionStrength,
            emissive: Array.from(material.emissive),
            emissiveIntensity: material.emissiveIntensity,
            opacity: material.opacity,
            alphaTest: material.alphaTest,
            doubleSided: material.doubleSided,
            transparent: material.transparent,
            depthWrite: material.depthWrite,
            depthTest: material.depthTest,
            textureSettings: material.textureSettings,
            blending: material.blending,
            properties: material.properties
        };
    }

    importMaterial(data) {
        const material = new Material(data.name, data.type);
        
        // Importar propiedades básicas
        vec3.set(material.albedo, ...data.albedo);
        material.metallic = data.metallic;
        material.roughness = data.roughness;
        material.normalScale = data.normalScale;
        material.occlusionStrength = data.occlusionStrength;
        vec3.set(material.emissive, ...data.emissive);
        material.emissiveIntensity = data.emissiveIntensity;
        material.opacity = data.opacity;
        material.alphaTest = data.alphaTest;
        material.doubleSided = data.doubleSided;
        material.transparent = data.transparent;
        material.depthWrite = data.depthWrite;
        material.depthTest = data.depthTest;
        
        // Importar configuraciones
        material.textureSettings = data.textureSettings;
        material.blending = data.blending;
        material.properties = data.properties;
        
        this.addMaterial(material);
        return material;
    }

    clear() {
        this.materials.clear();
    }

    getStats() {
        const stats = {
            totalMaterials: this.materials.size,
            byType: {},
            withTextures: 0,
            transparent: 0,
            emissive: 0
        };
        
        this.materials.forEach(material => {
            // Contar por tipo
            stats.byType[material.type] = (stats.byType[material.type] || 0) + 1;
            
            // Contar con texturas
            const hasTextures = Object.values(material.textures).some(texture => texture !== null);
            if (hasTextures) stats.withTextures++;
            
            // Contar transparentes
            if (material.transparent) stats.transparent++;
            
            // Contar emisivos
            if (vec3.length(material.emissive) > 0) stats.emissive++;
        });
        
        return stats;
    }
}

class MaterialManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.library = new MaterialLibrary();
        this.materialCache = new Map();
        this.shaderVariants = new Map();
        
        // Configuración
        this.enableInstancing = true;
        this.enableBatching = true;
        this.maxBatchSize = 100;
        
        this.initializeShaderVariants();
    }

    initializeShaderVariants() {
        // Crear variantes de shaders para diferentes combinaciones de features
        const features = [
            'ALBEDO_MAP',
            'NORMAL_MAP', 
            'METALLIC_ROUGHNESS_MAP',
            'OCCLUSION_MAP',
            'EMISSIVE_MAP',
            'HEIGHT_MAP',
            'TRANSPARENT',
            'DOUBLE_SIDED',
            'VERTEX_COLORS',
            'SKINNING',
            'MORPHING'
        ];
        
        // Generar combinaciones comunes
        const commonCombinations = [
            [],
            ['ALBEDO_MAP'],
            ['ALBEDO_MAP', 'NORMAL_MAP'],
            ['ALBEDO_MAP', 'NORMAL_MAP', 'METALLIC_ROUGHNESS_MAP'],
            ['ALBEDO_MAP', 'NORMAL_MAP', 'METALLIC_ROUGHNESS_MAP', 'OCCLUSION_MAP'],
            ['TRANSPARENT'],
            ['EMISSIVE_MAP'],
            ['VERTEX_COLORS']
        ];
        
        commonCombinations.forEach(combination => {
            const key = combination.sort().join('_') || 'DEFAULT';
            this.shaderVariants.set(key, {
                features: combination,
                compiled: false,
                program: null
            });
        });
    }

    getShaderVariant(material, mesh) {
        const features = [];
        
        // Detectar features del material
        if (material.textures.albedo) features.push('ALBEDO_MAP');
        if (material.textures.normal) features.push('NORMAL_MAP');
        if (material.textures.metallicRoughness) features.push('METALLIC_ROUGHNESS_MAP');
        if (material.textures.occlusion) features.push('OCCLUSION_MAP');
        if (material.textures.emissive) features.push('EMISSIVE_MAP');
        if (material.textures.height) features.push('HEIGHT_MAP');
        if (material.transparent) features.push('TRANSPARENT');
        if (material.doubleSided) features.push('DOUBLE_SIDED');
        
        // Detectar features del mesh
        if (mesh && mesh.colors) features.push('VERTEX_COLORS');
        if (mesh && mesh.skinning) features.push('SKINNING');
        if (mesh && mesh.morphTargets) features.push('MORPHING');
        
        const key = features.sort().join('_') || 'DEFAULT';
        
        // Crear variante si no existe
        if (!this.shaderVariants.has(key)) {
            this.shaderVariants.set(key, {
                features: features,
                compiled: false,
                program: null
            });
        }
        
        const variant = this.shaderVariants.get(key);
        
        // Compilar shader si es necesario
        if (!variant.compiled) {
            variant.program = this.compileShaderVariant(variant.features);
            variant.compiled = true;
        }
        
        return variant.program;
    }

    compileShaderVariant(features) {
        // Generar defines para el shader
        const defines = features.map(feature => `#define ${feature}`).join('\n');
        
        // Vertex shader base con defines
        const vertexShader = `
            ${defines}
            
            attribute vec3 a_position;
            attribute vec3 a_normal;
            attribute vec2 a_texCoord;
            
            #ifdef VERTEX_COLORS
            attribute vec3 a_color;
            varying vec3 v_color;
            #endif
            
            #ifdef NORMAL_MAP
            attribute vec3 a_tangent;
            varying mat3 v_tbn;
            #endif
            
            #ifdef SKINNING
            attribute vec4 a_skinIndices;
            attribute vec4 a_skinWeights;
            uniform mat4 u_boneMatrices[64];
            #endif
            
            uniform mat4 u_modelMatrix;
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform mat3 u_normalMatrix;
            
            varying vec3 v_worldPos;
            varying vec3 v_normal;
            varying vec2 v_texCoord;
            
            void main() {
                vec3 position = a_position;
                vec3 normal = a_normal;
                
                #ifdef SKINNING
                mat4 skinMatrix = a_skinWeights.x * u_boneMatrices[int(a_skinIndices.x)] +
                                 a_skinWeights.y * u_boneMatrices[int(a_skinIndices.y)] +
                                 a_skinWeights.z * u_boneMatrices[int(a_skinIndices.z)] +
                                 a_skinWeights.w * u_boneMatrices[int(a_skinIndices.w)];
                position = (skinMatrix * vec4(position, 1.0)).xyz;
                normal = (skinMatrix * vec4(normal, 0.0)).xyz;
                #endif
                
                vec4 worldPos = u_modelMatrix * vec4(position, 1.0);
                v_worldPos = worldPos.xyz;
                v_normal = normalize(u_normalMatrix * normal);
                v_texCoord = a_texCoord;
                
                #ifdef VERTEX_COLORS
                v_color = a_color;
                #endif
                
                #ifdef NORMAL_MAP
                vec3 T = normalize(u_normalMatrix * a_tangent);
                vec3 N = v_normal;
                vec3 B = cross(N, T);
                v_tbn = mat3(T, B, N);
                #endif
                
                gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
            }
        `;
        
        // Fragment shader base con defines
        const fragmentShader = `
            ${defines}
            precision mediump float;
            
            uniform vec3 u_albedo;
            uniform float u_metallic;
            uniform float u_roughness;
            uniform vec3 u_emissive;
            uniform float u_opacity;
            
            #ifdef ALBEDO_MAP
            uniform sampler2D u_albedoMap;
            #endif
            
            #ifdef NORMAL_MAP
            uniform sampler2D u_normalMap;
            varying mat3 v_tbn;
            #endif
            
            #ifdef METALLIC_ROUGHNESS_MAP
            uniform sampler2D u_metallicRoughnessMap;
            #endif
            
            #ifdef EMISSIVE_MAP
            uniform sampler2D u_emissiveMap;
            #endif
            
            #ifdef VERTEX_COLORS
            varying vec3 v_color;
            #endif
            
            varying vec3 v_worldPos;
            varying vec3 v_normal;
            varying vec2 v_texCoord;
            
            void main() {
                vec3 albedo = u_albedo;
                float metallic = u_metallic;
                float roughness = u_roughness;
                vec3 emissive = u_emissive;
                
                #ifdef ALBEDO_MAP
                vec4 albedoSample = texture2D(u_albedoMap, v_texCoord);
                albedo *= albedoSample.rgb;
                #ifdef TRANSPARENT
                float alpha = albedoSample.a * u_opacity;
                #endif
                #endif
                
                #ifdef VERTEX_COLORS
                albedo *= v_color;
                #endif
                
                #ifdef METALLIC_ROUGHNESS_MAP
                vec3 mrSample = texture2D(u_metallicRoughnessMap, v_texCoord).rgb;
                metallic *= mrSample.b;
                roughness *= mrSample.g;
                #endif
                
                #ifdef EMISSIVE_MAP
                emissive *= texture2D(u_emissiveMap, v_texCoord).rgb;
                #endif
                
                vec3 normal = normalize(v_normal);
                
                #ifdef NORMAL_MAP
                vec3 normalSample = texture2D(u_normalMap, v_texCoord).rgb * 2.0 - 1.0;
                normal = normalize(v_tbn * normalSample);
                #endif
                
                // Iluminación simplificada para este ejemplo
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float NdotL = max(dot(normal, lightDir), 0.0);
                
                vec3 color = albedo * NdotL + emissive;
                
                #ifdef TRANSPARENT
                gl_FragColor = vec4(color, alpha);
                #else
                gl_FragColor = vec4(color, 1.0);
                #endif
            }
        `;
        
        return this.renderer.createProgram(
            'material_' + features.join('_'), 
            vertexShader, 
            fragmentShader
        );
    }

    setupMaterial(material, mesh = null) {
        // Obtener shader apropiado
        const program = this.getShaderVariant(material, mesh);
        
        // Configurar uniforms
        const uniforms = material.getUniforms();
        
        // Configurar texturas
        const textureBindings = material.getTextureBindings();
        
        // Configurar estado de renderizado
        this.setupRenderState(material);
        
        return {
            program: program,
            uniforms: uniforms,
            textures: textureBindings
        };
    }

    setupRenderState(material) {
        const gl = this.renderer.gl;
        
        // Configurar blending
        if (material.blending.enabled) {
            gl.enable(gl.BLEND);
            
            const srcFactor = gl[material.blending.srcFactor];
            const dstFactor = gl[material.blending.dstFactor];
            
            gl.blendFunc(srcFactor, dstFactor);
            
            if (material.blending.equation !== 'FUNC_ADD') {
                gl.blendEquation(gl[material.blending.equation]);
            }
        } else {
            gl.disable(gl.BLEND);
        }
        
        // Configurar depth test
        if (material.depthTest) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
        
        // Configurar depth write
        gl.depthMask(material.depthWrite);
        
        // Configurar culling
        if (material.doubleSided) {
            gl.disable(gl.CULL_FACE);
        } else {
            gl.enable(gl.CULL_FACE);
        }
    }

    createMaterial(name, type = 'pbr') {
        const material = new Material(name, type);
        this.library.addMaterial(material);
        return material;
    }

    getMaterial(id) {
        return this.library.getMaterial(id);
    }

    cloneMaterial(id, newName) {
        return this.library.cloneMaterial(id, newName);
    }

    getLibrary() {
        return this.library;
    }

    dispose() {
        this.library.clear();
        this.materialCache.clear();
        this.shaderVariants.clear();
        
        console.log('Material Manager limpiado');
    }
}

export { Material, MaterialLibrary, MaterialManager };