/**
 * WebGL Renderer - Sistema de renderizado WebGL avanzado
 * Gestiona el contexto WebGL y las operaciones de renderizado
 */

class WebGLRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.gl = null;
        this.programs = new Map();
        this.buffers = new Map();
        this.textures = new Map();
        this.uniforms = new Map();
        
        // Configuración por defecto
        this.config = {
            antialias: true,
            alpha: true,
            depth: true,
            stencil: false,
            preserveDrawingBuffer: false,
            premultipliedAlpha: true,
            ...options
        };
        
        this.stats = {
            drawCalls: 0,
            triangles: 0,
            vertices: 0,
            frameTime: 0
        };
        
        this.init();
    }

    init() {
        // Inicializar contexto WebGL
        this.gl = this.canvas.getContext('webgl2', this.config) || 
                  this.canvas.getContext('webgl', this.config);
        
        if (!this.gl) {
            throw new Error('WebGL no está disponible en este navegador');
        }

        // Configurar WebGL
        this.setupWebGL();
        
        // Configurar extensiones
        this.setupExtensions();
        
        // Inicializar shaders básicos
        this.initializeBasicShaders();
        
        console.log('WebGL Renderer inicializado correctamente');
    }

    setupWebGL() {
        const gl = this.gl;
        
        // Configurar viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Configurar depth testing
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        
        // Configurar blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Configurar culling
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        
        // Color de fondo
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
    }

    setupExtensions() {
        const gl = this.gl;
        
        // Extensiones importantes
        const extensions = [
            'EXT_texture_filter_anisotropic',
            'OES_texture_float',
            'OES_texture_float_linear',
            'WEBGL_depth_texture',
            'OES_standard_derivatives'
        ];
        
        this.extensions = {};
        
        extensions.forEach(ext => {
            const extension = gl.getExtension(ext);
            if (extension) {
                this.extensions[ext] = extension;
            } else {
                console.warn(`Extensión ${ext} no disponible`);
            }
        });
    }

    initializeBasicShaders() {
        // Vertex shader básico
        const basicVertexShader = `
            attribute vec3 a_position;
            attribute vec2 a_texCoord;
            attribute vec3 a_normal;
            
            uniform mat4 u_modelMatrix;
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform mat3 u_normalMatrix;
            
            varying vec3 v_position;
            varying vec2 v_texCoord;
            varying vec3 v_normal;
            
            void main() {
                vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
                v_position = worldPosition.xyz;
                v_texCoord = a_texCoord;
                v_normal = u_normalMatrix * a_normal;
                
                gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
            }
        `;
        
        // Fragment shader básico
        const basicFragmentShader = `
            precision mediump float;
            
            uniform vec3 u_lightDirection;
            uniform vec3 u_lightColor;
            uniform vec3 u_ambientColor;
            uniform sampler2D u_texture;
            
            varying vec3 v_position;
            varying vec2 v_texCoord;
            varying vec3 v_normal;
            
            void main() {
                vec3 normal = normalize(v_normal);
                float light = max(dot(normal, -u_lightDirection), 0.0);
                
                vec3 color = texture2D(u_texture, v_texCoord).rgb;
                vec3 lighting = u_ambientColor + (u_lightColor * light);
                
                gl_FragColor = vec4(color * lighting, 1.0);
            }
        `;
        
        this.createProgram('basic', basicVertexShader, basicFragmentShader);
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Error compilando shader: ${error}`);
        }
        
        return shader;
    }

    createProgram(name, vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Error enlazando programa: ${error}`);
        }
        
        // Obtener ubicaciones de atributos y uniforms
        const programInfo = {
            program: program,
            attributes: this.getAttributes(program),
            uniforms: this.getUniforms(program)
        };
        
        this.programs.set(name, programInfo);
        
        // Limpiar shaders
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        
        return programInfo;
    }

    getAttributes(program) {
        const gl = this.gl;
        const attributes = {};
        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        
        for (let i = 0; i < numAttributes; i++) {
            const attribute = gl.getActiveAttrib(program, i);
            attributes[attribute.name] = gl.getAttribLocation(program, attribute.name);
        }
        
        return attributes;
    }

    getUniforms(program) {
        const gl = this.gl;
        const uniforms = {};
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        
        for (let i = 0; i < numUniforms; i++) {
            const uniform = gl.getActiveUniform(program, i);
            uniforms[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }
        
        return uniforms;
    }

    createBuffer(name, data, target = this.gl.ARRAY_BUFFER, usage = this.gl.STATIC_DRAW) {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, usage);
        
        const bufferInfo = {
            buffer: buffer,
            target: target,
            size: data.length,
            type: target === gl.ELEMENT_ARRAY_BUFFER ? 'index' : 'vertex'
        };
        
        this.buffers.set(name, bufferInfo);
        return bufferInfo;
    }

    createTexture(name, image, options = {}) {
        const gl = this.gl;
        const texture = gl.createTexture();
        
        const config = {
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            format: gl.RGBA,
            type: gl.UNSIGNED_BYTE,
            ...options
        };
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        if (image) {
            gl.texImage2D(gl.TEXTURE_2D, 0, config.format, config.format, config.type, image);
        } else {
            // Crear textura vacía
            gl.texImage2D(gl.TEXTURE_2D, 0, config.format, 1, 1, 0, config.format, config.type, 
                         new Uint8Array([255, 255, 255, 255]));
        }
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, config.wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, config.wrapT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, config.minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, config.magFilter);
        
        // Generar mipmaps si es necesario
        if (config.minFilter === gl.LINEAR_MIPMAP_LINEAR || 
            config.minFilter === gl.LINEAR_MIPMAP_NEAREST) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        
        const textureInfo = {
            texture: texture,
            width: image ? image.width : 1,
            height: image ? image.height : 1,
            format: config.format,
            type: config.type
        };
        
        this.textures.set(name, textureInfo);
        return textureInfo;
    }

    useProgram(name) {
        const programInfo = this.programs.get(name);
        if (!programInfo) {
            throw new Error(`Programa '${name}' no encontrado`);
        }
        
        this.gl.useProgram(programInfo.program);
        return programInfo;
    }

    setUniform(program, name, value) {
        const gl = this.gl;
        const location = program.uniforms[name];
        
        if (location === undefined) {
            console.warn(`Uniform '${name}' no encontrado`);
            return;
        }
        
        if (Array.isArray(value)) {
            switch (value.length) {
                case 1:
                    gl.uniform1f(location, value[0]);
                    break;
                case 2:
                    gl.uniform2fv(location, value);
                    break;
                case 3:
                    gl.uniform3fv(location, value);
                    break;
                case 4:
                    gl.uniform4fv(location, value);
                    break;
                case 9:
                    gl.uniformMatrix3fv(location, false, value);
                    break;
                case 16:
                    gl.uniformMatrix4fv(location, false, value);
                    break;
            }
        } else {
            gl.uniform1f(location, value);
        }
    }

    bindTexture(name, unit = 0) {
        const gl = this.gl;
        const textureInfo = this.textures.get(name);
        
        if (!textureInfo) {
            console.warn(`Textura '${name}' no encontrada`);
            return;
        }
        
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
    }

    render(renderQueue) {
        const gl = this.gl;
        const startTime = performance.now();
        
        // Limpiar buffers
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Resetear estadísticas
        this.stats.drawCalls = 0;
        this.stats.triangles = 0;
        this.stats.vertices = 0;
        
        // Renderizar objetos
        renderQueue.forEach(item => {
            this.renderObject(item);
        });
        
        // Calcular tiempo de frame
        this.stats.frameTime = performance.now() - startTime;
    }

    renderObject(object) {
        const gl = this.gl;
        
        // Usar programa
        const program = this.useProgram(object.program);
        
        // Configurar uniforms
        Object.entries(object.uniforms || {}).forEach(([name, value]) => {
            this.setUniform(program, name, value);
        });
        
        // Configurar texturas
        Object.entries(object.textures || {}).forEach(([name, unit]) => {
            this.bindTexture(name, unit);
        });
        
        // Configurar atributos
        Object.entries(object.attributes || {}).forEach(([name, bufferName]) => {
            const bufferInfo = this.buffers.get(bufferName);
            if (bufferInfo) {
                const location = program.attributes[name];
                if (location !== undefined) {
                    gl.bindBuffer(bufferInfo.target, bufferInfo.buffer);
                    gl.enableVertexAttribArray(location);
                    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
                }
            }
        });
        
        // Dibujar
        if (object.indices) {
            const indexBuffer = this.buffers.get(object.indices);
            if (indexBuffer) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
                gl.drawElements(gl.TRIANGLES, indexBuffer.size, gl.UNSIGNED_SHORT, 0);
                this.stats.triangles += indexBuffer.size / 3;
            }
        } else {
            const vertexCount = object.vertexCount || 3;
            gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
            this.stats.triangles += vertexCount / 3;
        }
        
        this.stats.drawCalls++;
        this.stats.vertices += object.vertexCount || 3;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    getStats() {
        return { ...this.stats };
    }

    dispose() {
        const gl = this.gl;
        
        // Eliminar programas
        this.programs.forEach(programInfo => {
            gl.deleteProgram(programInfo.program);
        });
        
        // Eliminar buffers
        this.buffers.forEach(bufferInfo => {
            gl.deleteBuffer(bufferInfo.buffer);
        });
        
        // Eliminar texturas
        this.textures.forEach(textureInfo => {
            gl.deleteTexture(textureInfo.texture);
        });
        
        // Limpiar mapas
        this.programs.clear();
        this.buffers.clear();
        this.textures.clear();
        
        console.log('WebGL Renderer limpiado');
    }
}

export default WebGLRenderer;