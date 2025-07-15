/**
 * Minifier Module
 * Advanced JavaScript and CSS minification with optimization
 */

class Minifier {
    constructor() {
        this.worker = null;
        this.cache = new Map();
        this.stats = {
            totalFiles: 0,
            totalOriginalSize: 0,
            totalMinifiedSize: 0,
            totalSavings: 0,
            averageCompressionRatio: 0,
            processedFiles: [],
            errors: []
        };
        
        this.settings = {
            enableCache: true,
            enableWorker: true,
            enableSourceMaps: false,
            preserveComments: false,
            mangleNames: true,
            removeConsole: true,
            removeDebugger: true,
            compressCSS: true,
            autoprefixer: true,
            removeUnusedCSS: false,
            optimizeImages: false,
            enableGzip: true
        };
        
        this.jsOptions = {
            compress: {
                dead_code: true,
                drop_console: true,
                drop_debugger: true,
                keep_fargs: false,
                unused: true,
                conditionals: true,
                comparisons: true,
                evaluate: true,
                booleans: true,
                loops: true,
                hoist_funs: true,
                hoist_vars: false,
                if_return: true,
                join_vars: true,
                cascade: true,
                side_effects: false
            },
            mangle: {
                toplevel: true,
                eval: true,
                keep_fnames: false,
                reserved: ['$', 'jQuery', 'exports', 'require']
            },
            output: {
                comments: false,
                beautify: false,
                semicolons: true,
                preserve_line: false
            }
        };
        
        this.cssOptions = {
            level: 2,
            compatibility: 'ie8',
            format: 'beautify',
            inline: ['all'],
            rebase: true,
            specialComments: 0,
            transform: {
                removeUnused: false,
                mergeAdjacentRules: true,
                mergeIntoShorthands: true,
                mergeMedia: true,
                removeDuplicateRules: true,
                removeDuplicateFontRules: true,
                removeUnusedAtRules: false
            }
        };
        
        this.init();
    }

    init() {
        this.setupWorker();
        this.loadCache();
        this.processExistingAssets();
    }

    setupWorker() {
        if ('Worker' in window && this.settings.enableWorker) {
            try {
                this.worker = new Worker('/workers/minifier.worker.js');
                this.setupWorkerHandlers();
            } catch (e) {
                console.warn('Minifier worker not available:', e);
            }
        }
    }

    setupWorkerHandlers() {
        if (!this.worker) return;
        
        this.worker.onmessage = (event) => {
            const { type, data, id } = event.data;
            
            switch (type) {
                case 'MINIFY_COMPLETE':
                    this.handleMinifyResult(data, id);
                    break;
                case 'MINIFY_ERROR':
                    this.handleMinifyError(data, id);
                    break;
                case 'BATCH_COMPLETE':
                    this.handleBatchComplete(data, id);
                    break;
            }
        };
    }

    handleMinifyResult(data, id) {
        const callback = this.minifyCallbacks?.get(id);
        if (callback) {
            callback(null, data);
            this.minifyCallbacks.delete(id);
        }
        
        this.updateStats(data.originalSize, data.minifiedSize, data.filename);
        this.cacheResult(data);
    }

    handleMinifyError(error, id) {
        const callback = this.minifyCallbacks?.get(id);
        if (callback) {
            callback(error, null);
            this.minifyCallbacks.delete(id);
        }
        
        this.stats.errors.push({
            error: error.message,
            timestamp: Date.now(),
            id: id
        });
    }

    handleBatchComplete(results, id) {
        const callback = this.batchCallbacks?.get(id);
        if (callback) {
            callback(results);
            this.batchCallbacks.delete(id);
        }
    }

    async processExistingAssets() {
        // Find and process existing JS and CSS files
        const scripts = document.querySelectorAll('script[src]');
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        
        const assets = [];
        
        scripts.forEach(script => {
            if (!script.src.includes('.min.') && this.isLocalAsset(script.src)) {
                assets.push({ url: script.src, type: 'js', element: script });
            }
        });
        
        stylesheets.forEach(link => {
            if (!link.href.includes('.min.') && this.isLocalAsset(link.href)) {
                assets.push({ url: link.href, type: 'css', element: link });
            }
        });
        
        if (assets.length > 0) {
            await this.processBatch(assets);
        }
    }

    async minifyJS(code, filename = 'inline.js', options = {}) {
        const mergedOptions = { ...this.jsOptions, ...options };
        
        // Check cache first
        if (this.settings.enableCache) {
            const cached = this.getCachedResult(code, 'js');
            if (cached) {
                return cached;
            }
        }
        
        try {
            let result;
            
            if (this.worker) {
                result = await this.minifyWithWorker(code, 'js', filename, mergedOptions);
            } else {
                result = await this.minifyJSFallback(code, mergedOptions);
            }
            
            // Add source map if enabled
            if (this.settings.enableSourceMaps && result.map) {
                result.code += `\n//# sourceMappingURL=data:application/json;base64,${btoa(result.map)}`;
            }
            
            return result;
            
        } catch (error) {
            console.error('JS minification failed:', error);
            return {
                code: code,
                error: error.message,
                originalSize: code.length,
                minifiedSize: code.length,
                compressionRatio: 0
            };
        }
    }

    async minifyCSS(code, filename = 'inline.css', options = {}) {
        const mergedOptions = { ...this.cssOptions, ...options };
        
        // Check cache first
        if (this.settings.enableCache) {
            const cached = this.getCachedResult(code, 'css');
            if (cached) {
                return cached;
            }
        }
        
        try {
            let result;
            
            if (this.worker) {
                result = await this.minifyWithWorker(code, 'css', filename, mergedOptions);
            } else {
                result = await this.minifyCSSFallback(code, mergedOptions);
            }
            
            return result;
            
        } catch (error) {
            console.error('CSS minification failed:', error);
            return {
                code: code,
                error: error.message,
                originalSize: code.length,
                minifiedSize: code.length,
                compressionRatio: 0
            };
        }
    }

    async minifyWithWorker(code, type, filename, options) {
        return new Promise((resolve, reject) => {
            const id = Date.now() + Math.random();
            
            this.minifyCallbacks = this.minifyCallbacks || new Map();
            this.minifyCallbacks.set(id, (error, result) => {
                if (error) reject(new Error(error));
                else resolve(result);
            });
            
            this.worker.postMessage({
                type: 'MINIFY',
                data: { code, type, filename, options },
                id: id
            });
        });
    }

    async minifyJSFallback(code, options) {
        // Simplified JS minification without external libraries
        let minified = code;
        
        // Remove comments
        if (!this.settings.preserveComments) {
            minified = this.removeJSComments(minified);
        }
        
        // Remove console statements
        if (options.compress?.drop_console) {
            minified = minified.replace(/console\.[a-zA-Z]+\([^)]*\);?/g, '');
        }
        
        // Remove debugger statements
        if (options.compress?.drop_debugger) {
            minified = minified.replace(/debugger;?/g, '');
        }
        
        // Basic whitespace removal
        minified = this.compressWhitespace(minified);
        
        // Simple variable name mangling for very short variables
        if (options.mangle && this.settings.mangleNames) {
            minified = this.basicMangle(minified);
        }
        
        return {
            code: minified,
            originalSize: code.length,
            minifiedSize: minified.length,
            compressionRatio: ((code.length - minified.length) / code.length) * 100
        };
    }

    async minifyCSSFallback(code, options) {
        let minified = code;
        
        // Remove comments
        minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // Remove unnecessary whitespace
        minified = minified.replace(/\s+/g, ' ');
        minified = minified.replace(/\s*{\s*/g, '{');
        minified = minified.replace(/;\s*/g, ';');
        minified = minified.replace(/\s*}\s*/g, '}');
        minified = minified.replace(/\s*,\s*/g, ',');
        minified = minified.replace(/\s*:\s*/g, ':');
        
        // Remove trailing semicolons
        minified = minified.replace(/;}/g, '}');
        
        // Compress colors
        minified = this.compressColors(minified);
        
        // Compress zero values
        minified = minified.replace(/\b0+(\.\d+)?/g, (match, decimal) => decimal || '0');
        minified = minified.replace(/\b0(px|em|rem|%|in|cm|mm|ex|pt|pc)/g, '0');
        
        // Remove unnecessary quotes
        minified = minified.replace(/url\((['"]?)([^)'"]+)\1\)/g, 'url($2)');
        
        return {
            code: minified.trim(),
            originalSize: code.length,
            minifiedSize: minified.length,
            compressionRatio: ((code.length - minified.length) / code.length) * 100
        };
    }

    removeJSComments(code) {
        // Remove single-line comments
        code = code.replace(/\/\/.*$/gm, '');
        
        // Remove multi-line comments (but preserve some important ones)
        code = code.replace(/\/\*[\s\S]*?\*\//g, (match) => {
            if (match.includes('@license') || match.includes('@preserve') || match.includes('!')) {
                return this.settings.preserveComments ? match : '';
            }
            return '';
        });
        
        return code;
    }

    compressWhitespace(code) {
        // Preserve strings and regexes
        const strings = [];
        const regexes = [];
        
        // Extract strings
        code = code.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
            strings.push(match);
            return `__STRING_${strings.length - 1}__`;
        });
        
        // Extract regexes
        code = code.replace(/\/(?:[^\/\\\n]|\\.)+\/[gimuy]*/g, (match) => {
            regexes.push(match);
            return `__REGEX_${regexes.length - 1}__`;
        });
        
        // Compress whitespace
        code = code.replace(/\s+/g, ' ');
        code = code.replace(/\s*([{}();,=+\-*\/&|!<>?:])\s*/g, '$1');
        code = code.replace(/\s*\n\s*/g, '');
        
        // Restore strings and regexes
        regexes.forEach((regex, index) => {
            code = code.replace(`__REGEX_${index}__`, regex);
        });
        
        strings.forEach((string, index) => {
            code = code.replace(`__STRING_${index}__`, string);
        });
        
        return code.trim();
    }

    basicMangle(code) {
        // Very basic variable name mangling
        const shortNames = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let nameIndex = 0;
        
        // Find variable declarations and rename them
        const varMap = new Map();
        
        // Simple var/let/const detection
        code = code.replace(/\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (match, keyword, varName) => {
            if (!varMap.has(varName) && varName.length > 2) {
                const shortName = shortNames[nameIndex % shortNames.length] + 
                    (nameIndex >= shortNames.length ? Math.floor(nameIndex / shortNames.length) : '');
                varMap.set(varName, shortName);
                nameIndex++;
                return `${keyword} ${shortName}`;
            }
            return match;
        });
        
        // Replace variable usage
        varMap.forEach((shortName, longName) => {
            const regex = new RegExp(`\\b${longName}\\b`, 'g');
            code = code.replace(regex, shortName);
        });
        
        return code;
    }

    compressColors(css) {
        // Convert long hex colors to short ones
        css = css.replace(/#([a-fA-F0-9])\1([a-fA-F0-9])\2([a-fA-F0-9])\3/g, '#$1$2$3');
        
        // Convert named colors to shorter hex values
        const colorMap = {
            'white': '#fff',
            'black': '#000',
            'red': '#f00',
            'green': '#008000',
            'blue': '#00f',
            'yellow': '#ff0',
            'cyan': '#0ff',
            'magenta': '#f0f'
        };
        
        Object.entries(colorMap).forEach(([name, hex]) => {
            css = css.replace(new RegExp(`\\b${name}\\b`, 'gi'), hex);
        });
        
        return css;
    }

    async processBatch(assets) {
        if (this.worker) {
            return this.processBatchWithWorker(assets);
        } else {
            return this.processBatchFallback(assets);
        }
    }

    async processBatchWithWorker(assets) {
        return new Promise((resolve) => {
            const id = Date.now() + Math.random();
            
            this.batchCallbacks = this.batchCallbacks || new Map();
            this.batchCallbacks.set(id, resolve);
            
            this.worker.postMessage({
                type: 'BATCH_MINIFY',
                data: assets,
                id: id
            });
        });
    }

    async processBatchFallback(assets) {
        const results = [];
        
        for (const asset of assets) {
            try {
                const code = await this.fetchAssetContent(asset.url);
                let result;
                
                if (asset.type === 'js') {
                    result = await this.minifyJS(code, asset.url);
                } else if (asset.type === 'css') {
                    result = await this.minifyCSS(code, asset.url);
                }
                
                if (result) {
                    result.filename = asset.url;
                    result.type = asset.type;
                    results.push(result);
                    
                    // Optionally replace the asset
                    if (this.settings.replaceAssets) {
                        this.replaceAsset(asset, result);
                    }
                }
            } catch (error) {
                console.warn(`Failed to process ${asset.url}:`, error);
                results.push({
                    filename: asset.url,
                    type: asset.type,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    async fetchAssetContent(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            // Try to get content from script/style elements
            if (url.endsWith('.js')) {
                const script = document.querySelector(`script[src="${url}"]`);
                if (script && script.textContent) {
                    return script.textContent;
                }
            } else if (url.endsWith('.css')) {
                const link = document.querySelector(`link[href="${url}"]`);
                if (link && link.sheet) {
                    return this.extractCSSFromStylesheet(link.sheet);
                }
            }
            throw error;
        }
    }

    extractCSSFromStylesheet(stylesheet) {
        let css = '';
        try {
            Array.from(stylesheet.cssRules).forEach(rule => {
                css += rule.cssText + '\n';
            });
        } catch (e) {
            // Cross-origin stylesheets may not be accessible
            throw new Error('Cannot access cross-origin stylesheet');
        }
        return css;
    }

    replaceAsset(asset, result) {
        if (asset.element && result.code) {
            if (asset.type === 'js') {
                // Replace script src with inline minified code
                asset.element.removeAttribute('src');
                asset.element.textContent = result.code;
            } else if (asset.type === 'css') {
                // Replace link with style element
                const style = document.createElement('style');
                style.textContent = result.code;
                asset.element.parentNode.replaceChild(style, asset.element);
            }
        }
    }

    isLocalAsset(url) {
        try {
            const urlObj = new URL(url, window.location.href);
            return urlObj.origin === window.location.origin;
        } catch {
            return false;
        }
    }

    // Caching methods
    getCachedResult(code, type) {
        if (!this.settings.enableCache) return null;
        
        const hash = this.generateHash(code);
        const cacheKey = `${type}_${hash}`;
        
        return this.cache.get(cacheKey);
    }

    cacheResult(result) {
        if (!this.settings.enableCache || !result.originalCode) return;
        
        const hash = this.generateHash(result.originalCode);
        const cacheKey = `${result.type}_${hash}`;
        
        this.cache.set(cacheKey, {
            code: result.code,
            originalSize: result.originalSize,
            minifiedSize: result.minifiedSize,
            compressionRatio: result.compressionRatio,
            timestamp: Date.now()
        });
        
        // Limit cache size
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    generateHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    loadCache() {
        try {
            const stored = localStorage.getItem('minifierCache');
            if (stored) {
                const data = JSON.parse(stored);
                this.cache = new Map(data.entries);
            }
        } catch (e) {
            console.warn('Failed to load minifier cache:', e);
        }
    }

    saveCache() {
        try {
            const data = {
                entries: Array.from(this.cache.entries()),
                timestamp: Date.now()
            };
            localStorage.setItem('minifierCache', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save minifier cache:', e);
        }
    }

    // Statistics and reporting
    updateStats(originalSize, minifiedSize, filename) {
        this.stats.totalFiles++;
        this.stats.totalOriginalSize += originalSize;
        this.stats.totalMinifiedSize += minifiedSize;
        this.stats.totalSavings += (originalSize - minifiedSize);
        
        const compressionRatio = ((originalSize - minifiedSize) / originalSize) * 100;
        
        this.stats.processedFiles.push({
            filename,
            originalSize,
            minifiedSize,
            savings: originalSize - minifiedSize,
            compressionRatio,
            timestamp: Date.now()
        });
        
        // Keep only last 50 files
        if (this.stats.processedFiles.length > 50) {
            this.stats.processedFiles.shift();
        }
        
        // Update average compression ratio
        this.stats.averageCompressionRatio = 
            (this.stats.totalSavings / this.stats.totalOriginalSize) * 100;
    }

    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            totalSavingsKB: (this.stats.totalSavings / 1024).toFixed(2),
            averageCompressionRatio: this.stats.averageCompressionRatio.toFixed(2)
        };
    }

    generateReport() {
        const stats = this.getStats();
        
        return {
            summary: {
                totalFiles: stats.totalFiles,
                totalSavings: `${stats.totalSavingsKB} KB`,
                averageCompression: `${stats.averageCompressionRatio}%`,
                cacheHits: stats.cacheSize,
                errors: stats.errors.length
            },
            recentFiles: stats.processedFiles.slice(-10),
            topSavings: stats.processedFiles
                .sort((a, b) => b.savings - a.savings)
                .slice(0, 5),
            recommendations: this.generateRecommendations(stats),
            timestamp: Date.now()
        };
    }

    generateRecommendations(stats) {
        const recommendations = [];
        
        if (stats.averageCompressionRatio < 30) {
            recommendations.push({
                type: 'compression',
                priority: 'medium',
                message: 'Low compression ratio detected',
                suggestion: 'Enable more aggressive optimization options'
            });
        }
        
        if (stats.errors.length > 0) {
            recommendations.push({
                type: 'errors',
                priority: 'high',
                message: `${stats.errors.length} minification errors detected`,
                suggestion: 'Review error logs and fix syntax issues'
            });
        }
        
        const largeFiles = stats.processedFiles.filter(f => f.originalSize > 100000);
        if (largeFiles.length > 0) {
            recommendations.push({
                type: 'bundle-size',
                priority: 'medium',
                message: `${largeFiles.length} large files detected`,
                suggestion: 'Consider code splitting for files over 100KB'
            });
        }
        
        return recommendations;
    }

    // Advanced features
    async minifyInline() {
        // Minify inline scripts and styles
        const inlineScripts = document.querySelectorAll('script:not([src])');
        const inlineStyles = document.querySelectorAll('style');
        
        for (const script of inlineScripts) {
            if (script.textContent.trim()) {
                try {
                    const result = await this.minifyJS(script.textContent, 'inline-script.js');
                    script.textContent = result.code;
                } catch (error) {
                    console.warn('Failed to minify inline script:', error);
                }
            }
        }
        
        for (const style of inlineStyles) {
            if (style.textContent.trim()) {
                try {
                    const result = await this.minifyCSS(style.textContent, 'inline-style.css');
                    style.textContent = result.code;
                } catch (error) {
                    console.warn('Failed to minify inline style:', error);
                }
            }
        }
    }

    async compressWithGzip(code) {
        if (!this.settings.enableGzip || !('CompressionStream' in window)) {
            return { compressed: false, originalSize: code.length };
        }
        
        try {
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(new TextEncoder().encode(code));
            writer.close();
            
            let compressedSize = 0;
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    compressedSize += value.length;
                }
            }
            
            return {
                compressed: true,
                originalSize: code.length,
                compressedSize: compressedSize,
                compressionRatio: ((code.length - compressedSize) / code.length) * 100
            };
        } catch (error) {
            return { compressed: false, originalSize: code.length, error: error.message };
        }
    }

    // Configuration methods
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Update options based on settings
        if (newSettings.removeConsole !== undefined) {
            this.jsOptions.compress.drop_console = newSettings.removeConsole;
        }
        
        if (newSettings.removeDebugger !== undefined) {
            this.jsOptions.compress.drop_debugger = newSettings.removeDebugger;
        }
        
        if (newSettings.mangleNames !== undefined) {
            this.jsOptions.mangle = newSettings.mangleNames ? this.jsOptions.mangle : false;
        }
        
        if (newSettings.preserveComments !== undefined) {
            this.jsOptions.output.comments = newSettings.preserveComments;
        }
    }

    updateJSOptions(newOptions) {
        this.jsOptions = { ...this.jsOptions, ...newOptions };
    }

    updateCSSOptions(newOptions) {
        this.cssOptions = { ...this.cssOptions, ...newOptions };
    }

    // Utility methods
    estimateSavings(code, type) {
        // Quick estimation without actually minifying
        let estimatedSavings = 0;
        
        if (type === 'js') {
            // Estimate based on comments, whitespace, and console statements
            const comments = (code.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).join('').length;
            const whitespace = (code.match(/\s+/g) || []).join('').length;
            const consoleStatements = (code.match(/console\.[a-zA-Z]+\([^)]*\);?/g) || []).join('').length;
            
            estimatedSavings = comments + whitespace * 0.7 + consoleStatements;
        } else if (type === 'css') {
            // Estimate based on comments and whitespace
            const comments = (code.match(/\/\*[\s\S]*?\*\//g) || []).join('').length;
            const whitespace = (code.match(/\s+/g) || []).join('').length;
            
            estimatedSavings = comments + whitespace * 0.8;
        }
        
        return {
            estimatedSavings,
            estimatedRatio: (estimatedSavings / code.length) * 100,
            originalSize: code.length
        };
    }

    async validateMinifiedCode(original, minified, type) {
        // Basic validation to ensure minified code is valid
        try {
            if (type === 'js') {
                // Try to parse as JavaScript
                new Function(minified);
            } else if (type === 'css') {
                // Basic CSS validation
                if (minified.includes('/*') && !minified.includes('*/')) {
                    throw new Error('Unclosed CSS comment');
                }
            }
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Public API methods
    async processFile(content, filename, type) {
        if (type === 'js') {
            return this.minifyJS(content, filename);
        } else if (type === 'css') {
            return this.minifyCSS(content, filename);
        } else {
            throw new Error(`Unsupported file type: ${type}`);
        }
    }

    async processFiles(files) {
        const results = [];
        
        for (const file of files) {
            try {
                const result = await this.processFile(file.content, file.filename, file.type);
                results.push(result);
            } catch (error) {
                results.push({
                    filename: file.filename,
                    error: error.message,
                    originalSize: file.content.length,
                    minifiedSize: file.content.length
                });
            }
        }
        
        return results;
    }

    clearCache() {
        this.cache.clear();
        localStorage.removeItem('minifierCache');
    }

    clearStats() {
        this.stats = {
            totalFiles: 0,
            totalOriginalSize: 0,
            totalMinifiedSize: 0,
            totalSavings: 0,
            averageCompressionRatio: 0,
            processedFiles: [],
            errors: []
        };
    }

    exportConfig() {
        return {
            settings: this.settings,
            jsOptions: this.jsOptions,
            cssOptions: this.cssOptions,
            timestamp: Date.now()
        };
    }

    importConfig(config) {
        if (config.settings) {
            this.updateSettings(config.settings);
        }
        if (config.jsOptions) {
            this.updateJSOptions(config.jsOptions);
        }
        if (config.cssOptions) {
            this.updateCSSOptions(config.cssOptions);
        }
    }

    exportData() {
        return {
            stats: this.getStats(),
            settings: this.settings,
            cacheSize: this.cache.size,
            report: this.generateReport(),
            timestamp: Date.now()
        };
    }

    // Cleanup
    destroy() {
        this.stopMonitoring();
        
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        this.saveCache();
        this.clearCache();
    }

    stopMonitoring() {
        if (this.domObserver) {
            this.domObserver.disconnect();
        }
    }
}

// Auto-initialize
const minifier = new Minifier();

// Save cache before page unload
window.addEventListener('beforeunload', () => {
    minifier.saveCache();
});

export default minifier;