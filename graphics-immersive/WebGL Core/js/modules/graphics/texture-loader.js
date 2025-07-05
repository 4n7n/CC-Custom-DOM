/**
 * Texture Loader - Sistema de carga y gestión de texturas
 * Maneja diferentes formatos, compresión y optimización
 */

class TextureLoader {
    constructor(renderer) {
        this.renderer = renderer;
        this.gl = renderer.gl;
        this.cache = new Map();
        this.loadingQueue = new Map();
        this.compressionFormats = new Map();
        
        // Configuración por defecto
        this.defaultOptions = {
            wrapS: 'REPEAT',
            wrapT: 'REPEAT',
            minFilter: 'LINEAR_MIPMAP_LINEAR',
            magFilter: 'LINEAR',
            generateMipmaps: true,
            flipY: true,
            premultiplyAlpha: false,
            format: 'RGBA',
            type: 'UNSIGNED_BYTE',
            anisotropy: 1
        };
        
        // Estadísticas
        this.stats = {
            loaded: 0,
            failed: 0,
            cached: 0,
            memoryUsage: 0
        };
        
        this.init();
    }

    init() {
        this.detectCompressionSupport();
        this.setupDefaultTextures();
        
        console.log('Texture Loader inicializado');
    }

    detectCompressionSupport() {
        const gl = this.gl;
        
        // Detectar formatos de compresión soportados
        const extensions = [
            'WEBGL_compressed_texture_s3tc',
            'WEBGL_compressed_texture_etc1',
            'WEBGL_compressed_texture_astc',
            'WEBGL_compressed_texture_pvrtc',
            'EXT_texture_compression_bptc',
            'EXT_texture_compression_rgtc'
        ];
        
        extensions.forEach(extName => {
            const ext = gl.getExtension(extName);
            if (ext) {
                this.compressionFormats.set(extName, ext);
                console.log(`Soporte para ${extName} detectado`);
            }
        });
        
        // Detectar anisotropic filtering
        const anisotropicExt = gl.getExtension('EXT_texture_filter_anisotropic');
        if (anisotropicExt) {
            this.maxAnisotropy = gl.getParameter(anisotropicExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            this.compressionFormats.set('EXT_texture_filter_anisotropic', anisotropicExt);
        }
    }

    setupDefaultTextures() {
        // Textura blanca por defecto
        this.createDefaultTexture('white', new Uint8Array([255, 255, 255, 255]));
        
        // Textura negra por defecto
        this.createDefaultTexture('black', new Uint8Array([0, 0, 0, 255]));
        
        // Normal map por defecto (normal pointing up)
        this.createDefaultTexture('normal', new Uint8Array([127, 127, 255, 255]));
        
        // Textura gris por defecto
        this.createDefaultTexture('gray', new Uint8Array([128, 128, 128, 255]));
        
        // Textura de ruido
        this.createNoiseTexture('noise', 256);
        
        // Checker pattern
        this.createCheckerTexture('checker', 256);
    }

    createDefaultTexture(name, data) {
        const gl = this.gl;
        const texture = gl.createTexture();
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        
        const textureInfo = {
            texture: texture,
            width: 1,
            height: 1,
            format: gl.RGBA,
            type: gl.UNSIGNED_BYTE,
            mipmaps: false,
            memorySize: 4
        };
        
        this.cache.set(name, textureInfo);
        this.stats.memoryUsage += 4;
    }

    createNoiseTexture(name, size) {
        const data = new Uint8Array(size * size * 4);
        
        for (let i = 0; i < data.length; i += 4) {
            const value = Math.floor(Math.random() * 256);
            data[i] = value;     // R
            data[i + 1] = value; // G
            data[i + 2] = value; // B
            data[i + 3] = 255;   // A
        }
        
        this.createTextureFromData(name, data, size, size);
    }

    createCheckerTexture(name, size) {
        const data = new Uint8Array(size * size * 4);
        const checkerSize = 32;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                const checkerX = Math.floor(x / checkerSize);
                const checkerY = Math.floor(y / checkerSize);
                const isWhite = (checkerX + checkerY) % 2 === 0;
                const value = isWhite ? 255 : 0;
                
                data[index] = value;     // R
                data[index + 1] = value; // G
                data[index + 2] = value; // B
                data[index + 3] = 255;   // A
            }
        }
        
        this.createTextureFromData(name, data, size, size);
    }

    createTextureFromData(name, data, width, height, options = {}) {
        const gl = this.gl;
        const config = { ...this.defaultOptions, ...options };
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Configurar parámetros de textura
        this.setTextureParameters(config);
        
        // Subir datos
        const format = gl[config.format];
        const type = gl[config.type];
        
        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data);
        
        // Generar mipmaps si es necesario
        if (config.generateMipmaps && this.isPowerOfTwo(width) && this.isPowerOfTwo(height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        
        const memorySize = this.calculateMemorySize(width, height, format, type, config.generateMipmaps);
        
        const textureInfo = {
            texture: texture,
            width: width,
            height: height,
            format: format,
            type: type,
            mipmaps: config.generateMipmaps,
            memorySize: memorySize
        };
        
        this.cache.set(name, textureInfo);
        this.stats.memoryUsage += memorySize;
        this.stats.loaded++;
        
        return textureInfo;
    }

    load(url, options = {}) {
        // Verificar caché
        if (this.cache.has(url)) {
            this.stats.cached++;
            return Promise.resolve(this.cache.get(url));
        }
        
        // Verificar si ya está en cola de carga
        if (this.loadingQueue.has(url)) {
            return this.loadingQueue.get(url);
        }
        
        // Crear promesa de carga
        const loadPromise = this.loadImage(url, options);
        this.loadingQueue.set(url, loadPromise);
        
        return loadPromise;
    }

    loadImage(url, options = {}) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            
            image.onload = () => {
                try {
                    const textureInfo = this.createTextureFromImage(url, image, options);
                    this.loadingQueue.delete(url);
                    resolve(textureInfo);
                } catch (error) {
                    this.stats.failed++;
                    this.loadingQueue.delete(url);
                    reject(error);
                }
            };
            
            image.onerror = () => {
                this.stats.failed++;
                this.loadingQueue.delete(url);
                reject(new Error(`Error cargando imagen: ${url}`));
            };
            
            // Configurar CORS si es necesario
            if (options.crossOrigin !== undefined) {
                image.crossOrigin = options.crossOrigin;
            } else {
                image.crossOrigin = 'anonymous';
            }
            
            image.src = url;
        });
    }

    createTextureFromImage(name, image, options = {}) {
        const gl = this.gl;
        const config = { ...this.defaultOptions, ...options };
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Configurar parámetros de textura
        this.setTextureParameters(config);
        
        // Flip Y si es necesario
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, config.flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, config.premultiplyAlpha);
        
        // Subir imagen
        const format = gl[config.format];
        const type = gl[config.type];
        
        gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, image);
        
        // Generar mipmaps si es necesario
        if (config.generateMipmaps && this.isPowerOfTwo(image.width) && this.isPowerOfTwo(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else if (config.generateMipmaps) {
            console.warn(`No se pueden generar mipmaps para textura no power-of-two: ${name}`);
            config.generateMipmaps = false;
            
            // Ajustar filtros para texturas no power-of-two
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        
        const memorySize = this.calculateMemorySize(image.width, image.height, format, type, config.generateMipmaps);
        
        const textureInfo = {
            texture: texture,
            width: image.width,
            height: image.height,
            format: format,
            type: type,
            mipmaps: config.generateMipmaps,
            memorySize: memorySize
        };
        
        this.cache.set(name, textureInfo);
        this.stats.memoryUsage += memorySize;
        this.stats.loaded++;
        
        return textureInfo;
    }

    setTextureParameters(config) {
        const gl = this.gl;
        
        // Wrapping
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[config.wrapS]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[config.wrapT]);
        
        // Filtering
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[config.minFilter]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[config.magFilter]);
        
        // Anisotropic filtering
        if (config.anisotropy > 1 && this.compressionFormats.has('EXT_texture_filter_anisotropic')) {
            const ext = this.compressionFormats.get('EXT_texture_filter_anisotropic');
            const anisotropy = Math.min(config.anisotropy, this.maxAnisotropy || 1);
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
        }
    }

    loadCubemap(urls, options = {}) {
        const name = `cubemap_${urls.join('_')}`;
        
        if (this.cache.has(name)) {
            return Promise.resolve(this.cache.get(name));
        }
        
        return Promise.all(urls.map(url => this.loadImageOnly(url, options)))
            .then(images => this.createCubemapFromImages(name, images, options));
    }

    loadImageOnly(url, options = {}) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Error cargando imagen: ${url}`));
            
            if (options.crossOrigin !== undefined) {
                image.crossOrigin = options.crossOrigin;
            } else {
                image.crossOrigin = 'anonymous';
            }
            
            image.src = url;
        });
    }

    createCubemapFromImages(name, images, options = {}) {
        const gl = this.gl;
        const config = { ...this.defaultOptions, ...options };
        
        if (images.length !== 6) {
            throw new Error('Cubemap requiere exactamente 6 imágenes');
        }
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        
        const faces = [
            gl.TEXTURE_CUBE_MAP_POSITIVE_X, // Right
            gl.TEXTURE_CUBE_MAP_NEGATIVE_X, // Left
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y, // Top
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, // Bottom
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z, // Front
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Z  // Back
        ];
        
        const format = gl[config.format];
        const type = gl[config.type];
        
        images.forEach((image, index) => {
            gl.texImage2D(faces[index], 0, format, format, type, image);
        });
        
        // Configurar parámetros
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl[config.minFilter]);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl[config.magFilter]);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        if (config.generateMipmaps) {
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        }
        
        const size = images[0].width;
        const memorySize = this.calculateMemorySize(size, size, format, type, config.generateMipmaps) * 6;
        
        const textureInfo = {
            texture: texture,
            width: size,
            height: size,
            format: format,
            type: type,
            mipmaps: config.generateMipmaps,
            memorySize: memorySize,
            isCubemap: true
        };
        
        this.cache.set(name, textureInfo);
        this.stats.memoryUsage += memorySize;
        this.stats.loaded++;
        
        return textureInfo;
    }

    loadMultiple(urls, options = {}) {
        const promises = urls.map(url => this.load(url, options));
        return Promise.all(promises);
    }

    loadCompressed(url, options = {}) {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => this.createTextureFromCompressedData(url, buffer, options));
    }

    createTextureFromCompressedData(name, buffer, options = {}) {
        const gl = this.gl;
        
        // Detectar formato basado en header o extensión
        const format = this.detectCompressedFormat(buffer, name);
        
        if (!format) {
            throw new Error(`Formato de textura comprimida no soportado: ${name}`);
        }
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Cargar datos comprimidos
        const data = new Uint8Array(buffer);
        gl.compressedTexImage2D(gl.TEXTURE_2D, 0, format.internalFormat, 
                               format.width, format.height, 0, data);
        
        // Configurar parámetros
        this.setTextureParameters({ ...this.defaultOptions, ...options, generateMipmaps: false });
        
        const memorySize = buffer.byteLength;
        
        const textureInfo = {
            texture: texture,
            width: format.width,
            height: format.height,
            format: format.internalFormat,
            type: gl.UNSIGNED_BYTE,
            mipmaps: false,
            memorySize: memorySize,
            compressed: true
        };
        
        this.cache.set(name, textureInfo);
        this.stats.memoryUsage += memorySize;
        this.stats.loaded++;
        
        return textureInfo;
    }

    detectCompressedFormat(buffer, filename) {
        const gl = this.gl;
        
        // Detectar por extensión de archivo
        const ext = filename.toLowerCase().split('.').pop();
        
        if (ext === 'dds' && this.compressionFormats.has('WEBGL_compressed_texture_s3tc')) {
            return this.parseDDS(buffer);
        }
        
        if (ext === 'ktx' && this.compressionFormats.has('WEBGL_compressed_texture_etc1')) {
            return this.parseKTX(buffer);
        }
        
        return null;
    }

    parseDDS(buffer) {
        // Parser DDS simplificado
        const view = new DataView(buffer);
        
        if (view.getUint32(0, true) !== 0x20534444) { // "DDS "
            throw new Error('Archivo DDS inválido');
        }
        
        const height = view.getUint32(12, true);
        const width = view.getUint32(16, true);
        const fourCC = view.getUint32(84, true);
        
        let internalFormat;
        const s3tcExt = this.compressionFormats.get('WEBGL_compressed_texture_s3tc');
        
        switch (fourCC) {
            case 0x31545844: // DXT1
                internalFormat = s3tcExt.COMPRESSED_RGB_S3TC_DXT1_EXT;
                break;
            case 0x33545844: // DXT3
                internalFormat = s3tcExt.COMPRESSED_RGBA_S3TC_DXT3_EXT;
                break;
            case 0x35545844: // DXT5
                internalFormat = s3tcExt.COMPRESSED_RGBA_S3TC_DXT5_EXT;
                break;
            default:
                throw new Error(`Formato DDS no soportado: ${fourCC.toString(16)}`);
        }
        
        return {
            width: width,
            height: height,
            internalFormat: internalFormat
        };
    }

    parseKTX(buffer) {
        // Parser KTX simplificado
        const view = new DataView(buffer);
        
        // Verificar identificador KTX
        const identifier = new Uint8Array(buffer, 0, 12);
        const ktxIdentifier = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];
        
        for (let i = 0; i < 12; i++) {
            if (identifier[i] !== ktxIdentifier[i]) {
                throw new Error('Archivo KTX inválido');
            }
        }
        
        const glInternalFormat = view.getUint32(28, true);
        const pixelWidth = view.getUint32(36, true);
        const pixelHeight = view.getUint32(40, true);
        
        return {
            width: pixelWidth,
            height: pixelHeight,
            internalFormat: glInternalFormat
        };
    }

    resize(name, newWidth, newHeight) {
        const textureInfo = this.cache.get(name);
        if (!textureInfo) {
            console.warn(`Textura '${name}' no encontrada para redimensionar`);
            return null;
        }
        
        const gl = this.gl;
        
        // Crear nueva textura redimensionada
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Obtener imagen original (simplificado)
        // En implementación real, necesitarías obtener los datos de la textura
        
        const newTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, newTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, textureInfo.format, textureInfo.format, textureInfo.type, canvas);
        
        // Eliminar textura anterior
        gl.deleteTexture(textureInfo.texture);
        
        // Actualizar información
        const oldMemorySize = textureInfo.memorySize;
        const newMemorySize = this.calculateMemorySize(newWidth, newHeight, textureInfo.format, textureInfo.type, textureInfo.mipmaps);
        
        textureInfo.texture = newTexture;
        textureInfo.width = newWidth;
        textureInfo.height = newHeight;
        textureInfo.memorySize = newMemorySize;
        
        this.stats.memoryUsage += (newMemorySize - oldMemorySize);
        
        return textureInfo;
    }

    get(name) {
        return this.cache.get(name);
    }

    remove(name) {
        const textureInfo = this.cache.get(name);
        if (textureInfo) {
            this.gl.deleteTexture(textureInfo.texture);
            this.stats.memoryUsage -= textureInfo.memorySize;
            this.cache.delete(name);
            return true;
        }
        return false;
    }

    clear() {
        this.cache.forEach((textureInfo, name) => {
            if (!name.startsWith('default_')) { // Mantener texturas por defecto
                this.gl.deleteTexture(textureInfo.texture);
                this.stats.memoryUsage -= textureInfo.memorySize;
            }
        });
        
        // Limpiar todo excepto texturas por defecto
        const defaultTextures = new Map();
        this.cache.forEach((textureInfo, name) => {
            if (name.startsWith('default_') || ['white', 'black', 'normal', 'gray', 'noise', 'checker'].includes(name)) {
                defaultTextures.set(name, textureInfo);
            }
        });
        
        this.cache = defaultTextures;
        this.loadingQueue.clear();
    }

    isPowerOfTwo(value) {
        return (value & (value - 1)) === 0;
    }

    calculateMemorySize(width, height, format, type, hasMipmaps) {
        let bytesPerPixel = 4; // RGBA por defecto
        
        // Calcular bytes por pixel basado en formato
        if (format === this.gl.RGB) {
            bytesPerPixel = 3;
        } else if (format === this.gl.LUMINANCE_ALPHA) {
            bytesPerPixel = 2;
        } else if (format === this.gl.LUMINANCE || format === this.gl.ALPHA) {
            bytesPerPixel = 1;
        }
        
        // Ajustar por tipo de datos
        if (type === this.gl.UNSIGNED_SHORT || type === this.gl.HALF_FLOAT) {
            bytesPerPixel *= 2;
        } else if (type === this.gl.FLOAT) {
            bytesPerPixel *= 4;
        }
        
        let totalSize = width * height * bytesPerPixel;
        
        // Agregar tamaño de mipmaps (aproximadamente 1/3 adicional)
        if (hasMipmaps) {
            totalSize *= 1.33;
        }
        
        return Math.ceil(totalSize);
    }

    getMemoryUsage() {
        return {
            total: this.stats.memoryUsage,
            formatted: this.formatBytes(this.stats.memoryUsage),
            textures: this.cache.size
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getStats() {
        return {
            ...this.stats,
            cached: this.cache.size,
            loading: this.loadingQueue.size,
            memoryUsage: this.getMemoryUsage()
        };
    }

    preloadTextures(urls, options = {}) {
        return this.loadMultiple(urls, options)
            .then(textures => {
                console.log(`Precargadas ${textures.length} texturas`);
                return textures;
            });
    }

    dispose() {
        this.clear();
        
        // Eliminar también texturas por defecto
        this.cache.forEach(textureInfo => {
            this.gl.deleteTexture(textureInfo.texture);
        });
        
        this.cache.clear();
        this.loadingQueue.clear();
        this.compressionFormats.clear();
        
        this.stats.memoryUsage = 0;
        
        console.log('Texture Loader limpiado');
    }
}

export default TextureLoader;