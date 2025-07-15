/**
 * Tree Shaker Module
 * Dead code elimination and unused export detection
 */

class TreeShaker {
    constructor() {
        this.dependencyGraph = new Map();
        this.exportMap = new Map();
        this.importMap = new Map();
        this.usedExports = new Set();
        this.unusedCode = new Set();
        this.modules = new Map();
        this.entryPoints = new Set(['main.js', 'index.js', 'app.js']);
        
        this.settings = {
            preserveComments: false,
            preserveDirectives: true,
            aggressiveShaking: false,
            keepUnusedImports: false,
            keepSideEffects: true,
            trackDynamicImports: true,
            analyzeDeadCode: true,
            removeDebugCode: true,
            minifyOutput: false
        };
        
        this.stats = {
            totalModules: 0,
            analyzedExports: 0,
            removedExports: 0,
            removedImports: 0,
            removedBytes: 0,
            preservedBytes: 0,
            shakingRatio: 0,
            errors: []
        };
        
        this.patterns = {
            exports: {
                named: /export\s+(?:const|let|var|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
                default: /export\s+default\s+/g,
                destructured: /export\s*\{\s*([^}]+)\s*\}/g,
                reexport: /export\s*\{\s*([^}]+)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/g
            },
            imports: {
                named: /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/g,
                default: /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*from\s*['"`]([^'"`]+)['"`]/g,
                namespace: /import\s*\*\s*as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*from\s*['"`]([^'"`]+)['"`]/g,
                dynamic: /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
            },
            usage: {
                identifier: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g,
                memberAccess: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\.\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
                destructuring: /\{\s*([^}]+)\s*\}\s*=\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g
            }
        };
        
        this.init();
    }

    init() {
        this.setupModuleTracking();
        this.analyzeExistingModules();
    }

    setupModuleTracking() {
        // Track script loading for dynamic analysis
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.name.endsWith('.js') || entry.name.includes('chunk')) {
                        this.trackModule(entry.name);
                    }
                });
            });
            
            try {
                observer.observe({ entryTypes: ['resource'] });
            } catch (e) {
                console.warn('Resource observer not supported:', e);
            }
        }
    }

    async analyzeExistingModules() {
        const scripts = document.querySelectorAll('script[src]');
        const modules = Array.from(scripts)
            .map(script => script.src)
            .filter(src => this.isLocalModule(src));
        
        for (const moduleUrl of modules) {
            await this.analyzeModule(moduleUrl);
        }
        
        this.buildDependencyGraph();
        this.performTreeShaking();
    }

    async analyzeModule(moduleUrl) {
        if (this.modules.has(moduleUrl)) {
            return this.modules.get(moduleUrl);
        }
        
        try {
            const code = await this.fetchModuleCode(moduleUrl);
            const analysis = this.analyzeCode(code, moduleUrl);
            
            this.modules.set(moduleUrl, analysis);
            this.stats.totalModules++;
            
            return analysis;
        } catch (error) {
            console.warn(`Failed to analyze module ${moduleUrl}:`, error);
            this.stats.errors.push({
                module: moduleUrl,
                error: error.message,
                timestamp: Date.now()
            });
            return null;
        }
    }

    async fetchModuleCode(moduleUrl) {
        try {
            const response = await fetch(moduleUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            // Try to get from script element
            const script = document.querySelector(`script[src="${moduleUrl}"]`);
            if (script && script.textContent) {
                return script.textContent;
            }
            throw error;
        }
    }

    analyzeCode(code, moduleUrl) {
        const analysis = {
            moduleUrl,
            originalCode: code,
            originalSize: code.length,
            exports: this.extractExports(code),
            imports: this.extractImports(code),
            usage: this.analyzeUsage(code),
            sideEffects: this.detectSideEffects(code),
            isDead: false,
            shakeable: true
        };
        
        // Update global maps
        this.exportMap.set(moduleUrl, analysis.exports);
        this.importMap.set(moduleUrl, analysis.imports);
        
        this.stats.analyzedExports += analysis.exports.length;
        
        return analysis;
    }

    extractExports(code) {
        const exports = [];
        
        // Named exports
        let match;
        while ((match = this.patterns.exports.named.exec(code)) !== null) {
            exports.push({
                type: 'named',
                name: match[1],
                local: match[1],
                source: null,
                line: this.getLineNumber(code, match.index)
            });
        }
        
        // Default exports
        this.patterns.exports.default.lastIndex = 0;
        while ((match = this.patterns.exports.default.exec(code)) !== null) {
            exports.push({
                type: 'default',
                name: 'default',
                local: 'default',
                source: null,
                line: this.getLineNumber(code, match.index)
            });
        }
        
        // Destructured exports
        this.patterns.exports.destructured.lastIndex = 0;
        while ((match = this.patterns.exports.destructured.exec(code)) !== null) {
            const exportNames = match[1].split(',').map(name => name.trim());
            exportNames.forEach(name => {
                const [local, exported = local] = name.split(' as ').map(n => n.trim());
                exports.push({
                    type: 'named',
                    name: exported,
                    local: local,
                    source: null,
                    line: this.getLineNumber(code, match.index)
                });
            });
        }
        
        // Re-exports
        this.patterns.exports.reexport.lastIndex = 0;
        while ((match = this.patterns.exports.reexport.exec(code)) !== null) {
            const exportNames = match[1].split(',').map(name => name.trim());
            exportNames.forEach(name => {
                const [local, exported = local] = name.split(' as ').map(n => n.trim());
                exports.push({
                    type: 'reexport',
                    name: exported,
                    local: local,
                    source: match[2],
                    line: this.getLineNumber(code, match.index)
                });
            });
        }
        
        return exports;
    }

    extractImports(code) {
        const imports = [];
        
        // Named imports
        let match;
        while ((match = this.patterns.imports.named.exec(code)) !== null) {
            const importNames = match[1].split(',').map(name => name.trim());
            importNames.forEach(name => {
                const [imported, local = imported] = name.split(' as ').map(n => n.trim());
                imports.push({
                    type: 'named',
                    imported: imported,
                    local: local,
                    source: match[2],
                    line: this.getLineNumber(code, match.index)
                });
            });
        }
        
        // Default imports
        this.patterns.imports.default.lastIndex = 0;
        while ((match = this.patterns.imports.default.exec(code)) !== null) {
            imports.push({
                type: 'default',
                imported: 'default',
                local: match[1],
                source: match[2],
                line: this.getLineNumber(code, match.index)
            });
        }
        
        // Namespace imports
        this.patterns.imports.namespace.lastIndex = 0;
        while ((match = this.patterns.imports.namespace.exec(code)) !== null) {
            imports.push({
                type: 'namespace',
                imported: '*',
                local: match[1],
                source: match[2],
                line: this.getLineNumber(code, match.index)
            });
        }
        
        // Dynamic imports
        if (this.settings.trackDynamicImports) {
            this.patterns.imports.dynamic.lastIndex = 0;
            while ((match = this.patterns.imports.dynamic.exec(code)) !== null) {
                imports.push({
                    type: 'dynamic',
                    imported: '*',
                    local: null,
                    source: match[1],
                    line: this.getLineNumber(code, match.index)
                });
            }
        }
        
        return imports;
    }

    analyzeUsage(code) {
        const usage = new Set();
        
        // Find all identifier usage
        let match;
        while ((match = this.patterns.usage.identifier.exec(code)) !== null) {
            const identifier = match[1];
            
            // Skip keywords and common global objects
            if (!this.isKeyword(identifier) && !this.isGlobalObject(identifier)) {
                usage.add(identifier);
            }
        }
        
        return Array.from(usage);
    }

    detectSideEffects(code) {
        const sideEffectPatterns = [
            /console\./,                    // Console operations
            /document\./,                   // DOM manipulations
            /window\./,                     // Window object access
            /localStorage\./,               // Storage operations
            /sessionStorage\./,             // Storage operations
            /fetch\(/,                      // Network requests
            /XMLHttpRequest/,               // Network requests
            /addEventListener/,             // Event listeners
            /setTimeout/,                   // Timers
            /setInterval/,                  // Timers
            /new\s+Worker/,                 // Web workers
            /import\s*\(/,                  // Dynamic imports
            /eval\s*\(/,                    // Code evaluation
            /Function\s*\(/,                // Function constructor
            /throw\s+/,                     // Exceptions
            /\.prototype\./,                // Prototype modifications
            /Object\.defineProperty/,       // Property definitions
            /Object\.assign/,               // Object mutations
            /Array\.prototype\./,           // Array prototype modifications
            /global\./,                     // Global object access
            /this\./                        // Context access
        ];
        
        return sideEffectPatterns.some(pattern => pattern.test(code));
    }

    buildDependencyGraph() {
        // Build dependency relationships between modules
        this.modules.forEach((analysis, moduleUrl) => {
            const dependencies = analysis.imports.map(imp => imp.source);
            this.dependencyGraph.set(moduleUrl, dependencies);
        });
    }

    performTreeShaking() {
        // Start from entry points and mark used exports
        this.entryPoints.forEach(entryPoint => {
            const moduleUrl = this.findModuleByName(entryPoint);
            if (moduleUrl) {
                this.markModuleAsUsed(moduleUrl);
            }
        });
        
        // Mark exports that are imported by used modules
        this.propagateUsage();
        
        // Identify unused exports and dead code
        this.identifyUnusedCode();
        
        // Calculate statistics
        this.calculateStats();
    }

    markModuleAsUsed(moduleUrl) {
        const analysis = this.modules.get(moduleUrl);
        if (!analysis || analysis.marked) return;
        
        analysis.marked = true;
        
        // Mark all exports of entry modules as potentially used
        analysis.exports.forEach(exp => {
            this.usedExports.add(`${moduleUrl}#${exp.name}`);
        });
        
        // Recursively mark dependencies
        const dependencies = this.dependencyGraph.get(moduleUrl) || [];
        dependencies.forEach(dep => {
            const depModuleUrl = this.resolveModulePath(dep, moduleUrl);
            if (depModuleUrl) {
                this.markModuleAsUsed(depModuleUrl);
            }
        });
    }

    propagateUsage() {
        let changed = true;
        
        while (changed) {
            changed = false;
            
            this.modules.forEach((analysis, moduleUrl) => {
                if (!analysis.marked) return;
                
                analysis.imports.forEach(imp => {
                    const sourceModuleUrl = this.resolveModulePath(imp.source, moduleUrl);
                    if (!sourceModuleUrl) return;
                    
                    const exportKey = `${sourceModuleUrl}#${imp.imported}`;
                    
                    if (!this.usedExports.has(exportKey)) {
                        this.usedExports.add(exportKey);
                        changed = true;
                        
                        // Mark the source module as used
                        const sourceAnalysis = this.modules.get(sourceModuleUrl);
                        if (sourceAnalysis && !sourceAnalysis.marked) {
                            sourceAnalysis.marked = true;
                            changed = true;
                        }
                    }
                });
            });
        }
    }

    identifyUnusedCode() {
        this.modules.forEach((analysis, moduleUrl) => {
            if (!analysis.marked && !analysis.sideEffects) {
                // Entire module is dead
                analysis.isDead = true;
                this.unusedCode.add(moduleUrl);
            } else {
                // Check for unused exports within used modules
                analysis.exports.forEach(exp => {
                    const exportKey = `${moduleUrl}#${exp.name}`;
                    if (!this.usedExports.has(exportKey) && exp.type !== 'default') {
                        this.unusedCode.add(exportKey);
                    }
                });
            }
        });
    }

    async shake(code, moduleUrl) {
        const analysis = this.modules.get(moduleUrl);
        if (!analysis) {
            return { code, removedBytes: 0, error: 'Module not analyzed' };
        }
        
        if (analysis.isDead) {
            return {
                code: this.settings.preserveComments ? '/* Module removed by tree shaking */' : '',
                removedBytes: code.length,
                removedExports: analysis.exports.length,
                removedImports: analysis.imports.length
            };
        }
        
        let shakenCode = code;
        let removedBytes = 0;
        
        // Remove unused exports
        const unusedExports = analysis.exports.filter(exp => {
            const exportKey = `${moduleUrl}#${exp.name}`;
            return this.unusedCode.has(exportKey);
        });
        
        for (const exp of unusedExports) {
            const removed = this.removeExport(shakenCode, exp);
            shakenCode = removed.code;
            removedBytes += removed.removedBytes;
        }
        
        // Remove unused imports
        const unusedImports = analysis.imports.filter(imp => {
            return !this.isImportUsed(imp, analysis.usage);
        });
        
        for (const imp of unusedImports) {
            const removed = this.removeImport(shakenCode, imp);
            shakenCode = removed.code;
            removedBytes += removed.removedBytes;
        }
        
        // Remove debug code if enabled
        if (this.settings.removeDebugCode) {
            const removed = this.removeDebugCode(shakenCode);
            shakenCode = removed.code;
            removedBytes += removed.removedBytes;
        }
        
        return {
            code: shakenCode,
            removedBytes,
            removedExports: unusedExports.length,
            removedImports: unusedImports.length,
            preservedSize: shakenCode.length
        };
    }

    removeExport(code, exportInfo) {
        let modifiedCode = code;
        let removedBytes = 0;
        
        const lines = code.split('\n');
        const targetLine = exportInfo.line - 1;
        
        if (targetLine >= 0 && targetLine < lines.length) {
            const line = lines[targetLine];
            const originalLength = line.length;
            
            if (exportInfo.type === 'named') {
                // Remove named export
                if (line.includes(`export const ${exportInfo.name}`) ||
                    line.includes(`export let ${exportInfo.name}`) ||
                    line.includes(`export var ${exportInfo.name}`)) {
                    // Convert to regular declaration
                    lines[targetLine] = line.replace(/^export\s+/, '');
                } else if (line.includes(`export function ${exportInfo.name}`) ||
                          line.includes(`export class ${exportInfo.name}`)) {
                    // Convert to regular declaration
                    lines[targetLine] = line.replace(/^export\s+/, '');
                }
            } else if (exportInfo.type === 'destructured') {
                // Remove from export object
                lines[targetLine] = this.removeFromExportObject(line, exportInfo.name);
            }
            
            removedBytes = originalLength - lines[targetLine].length;
            modifiedCode = lines.join('\n');
        }
        
        return { code: modifiedCode, removedBytes };
    }

    removeImport(code, importInfo) {
        let modifiedCode = code;
        let removedBytes = 0;
        
        const lines = code.split('\n');
        const targetLine = importInfo.line - 1;
        
        if (targetLine >= 0 && targetLine < lines.length) {
            const line = lines[targetLine];
            const originalLength = line.length;
            
            if (importInfo.type === 'named') {
                // Remove specific named import
                lines[targetLine] = this.removeFromImportObject(line, importInfo.imported);
            } else if (importInfo.type === 'default' || importInfo.type === 'namespace') {
                // Remove entire import line if it's only this import
                if (line.trim().startsWith('import') && line.includes(importInfo.source)) {
                    lines[targetLine] = '';
                }
            }
            
            removedBytes = originalLength - lines[targetLine].length;
            modifiedCode = lines.join('\n');
        }
        
        return { code: modifiedCode, removedBytes };
    }

    removeFromExportObject(line, exportName) {
        // Remove specific export from { export1, export2, ... } syntax
        const exportMatch = line.match(/export\s*\{\s*([^}]+)\s*\}/);
        if (exportMatch) {
            const exports = exportMatch[1].split(',').map(e => e.trim());
            const filteredExports = exports.filter(e => !e.includes(exportName));
            
            if (filteredExports.length === 0) {
                return ''; // Remove entire line if no exports left
            } else {
                return line.replace(exportMatch[1], filteredExports.join(', '));
            }
        }
        return line;
    }

    removeFromImportObject(line, importName) {
        // Remove specific import from { import1, import2, ... } syntax
        const importMatch = line.match(/import\s*\{\s*([^}]+)\s*\}/);
        if (importMatch) {
            const imports = importMatch[1].split(',').map(i => i.trim());
            const filteredImports = imports.filter(i => !i.includes(importName));
            
            if (filteredImports.length === 0) {
                return ''; // Remove entire line if no imports left
            } else {
                return line.replace(importMatch[1], filteredImports.join(', '));
            }
        }
        return line;
    }

    removeDebugCode(code) {
        let modifiedCode = code;
        let removedBytes = 0;
        
        const debugPatterns = [
            /console\.(log|debug|info|warn|error)\([^)]*\);?/g,
            /debugger;?/g,
            /\/\*\s*DEBUG[\s\S]*?\*\//g,
            /\/\/\s*DEBUG.*$/gm,
            /if\s*\(\s*DEBUG\s*\)\s*\{[^}]*\}/g
        ];
        
        debugPatterns.forEach(pattern => {
            const matches = modifiedCode.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    removedBytes += match.length;
                });
                modifiedCode = modifiedCode.replace(pattern, '');
            }
        });
        
        return { code: modifiedCode, removedBytes };
    }

    isImportUsed(importInfo, usage) {
        if (importInfo.type === 'namespace' || importInfo.type === 'dynamic') {
            return true; // Conservative approach for namespace and dynamic imports
        }
        
        return usage.includes(importInfo.local);
    }

    calculateStats() {
        let totalOriginalSize = 0;
        let totalRemovedSize = 0;
        let removedExports = 0;
        let removedImports = 0;
        
        this.modules.forEach(analysis => {
            totalOriginalSize += analysis.originalSize;
            
            if (analysis.isDead) {
                totalRemovedSize += analysis.originalSize;
                removedExports += analysis.exports.length;
                removedImports += analysis.imports.length;
            } else {
                // Count unused exports in live modules
                analysis.exports.forEach(exp => {
                    const exportKey = `${analysis.moduleUrl}#${exp.name}`;
                    if (this.unusedCode.has(exportKey)) {
                        removedExports++;
                    }
                });
            }
        });
        
        this.stats.removedExports = removedExports;
        this.stats.removedImports = removedImports;
        this.stats.removedBytes = totalRemovedSize;
        this.stats.preservedBytes = totalOriginalSize - totalRemovedSize;
        this.stats.shakingRatio = totalOriginalSize > 0 ? 
            (totalRemovedSize / totalOriginalSize) * 100 : 0;
    }

    // Utility methods
    getLineNumber(code, index) {
        return code.substring(0, index).split('\n').length;
    }

    isKeyword(identifier) {
        const keywords = [
            'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
            'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
            'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new',
            'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
            'void', 'while', 'with', 'yield', 'null', 'true', 'false', 'undefined'
        ];
        return keywords.includes(identifier);
    }

    isGlobalObject(identifier) {
        const globals = [
            'window', 'document', 'console', 'Object', 'Array', 'String', 'Number',
            'Boolean', 'Date', 'RegExp', 'Error', 'JSON', 'Math', 'parseInt',
            'parseFloat', 'isNaN', 'isFinite', 'setTimeout', 'setInterval',
            'clearTimeout', 'clearInterval', 'Promise', 'fetch', 'XMLHttpRequest'
        ];
        return globals.includes(identifier);
    }

    isLocalModule(url) {
        try {
            const urlObj = new URL(url, window.location.href);
            return urlObj.origin === window.location.origin;
        } catch {
            return false;
        }
    }

    findModuleByName(name) {
        for (const moduleUrl of this.modules.keys()) {
            if (moduleUrl.includes(name)) {
                return moduleUrl;
            }
        }
        return null;
    }

    resolveModulePath(importPath, currentModuleUrl) {
        try {
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
                return new URL(importPath, currentModuleUrl).href;
            } else if (importPath.startsWith('/')) {
                return new URL(importPath, window.location.origin).href;
            } else {
                // Node modules or external dependencies
                return null;
            }
        } catch {
            return null;
        }
    }

    trackModule(moduleUrl) {
        if (!this.modules.has(moduleUrl)) {
            this.analyzeModule(moduleUrl);
        }
    }

    // Public API
    async shakeModule(moduleUrl) {
        const analysis = this.modules.get(moduleUrl);
        if (!analysis) {
            await this.analyzeModule(moduleUrl);
        }
        
        return this.shake(analysis.originalCode, moduleUrl);
    }

    async shakeAll() {
        const results = new Map();
        
        for (const [moduleUrl, analysis] of this.modules) {
            try {
                const result = await this.shake(analysis.originalCode, moduleUrl);
                results.set(moduleUrl, result);
            } catch (error) {
                results.set(moduleUrl, {
                    error: error.message,
                    code: analysis.originalCode,
                    removedBytes: 0
                });
            }
        }
        
        return results;
    }

    getUnusedExports() {
        const unused = [];
        
        this.modules.forEach((analysis, moduleUrl) => {
            analysis.exports.forEach(exp => {
                const exportKey = `${moduleUrl}#${exp.name}`;
                if (this.unusedCode.has(exportKey)) {
                    unused.push({
                        module: moduleUrl,
                        export: exp.name,
                        type: exp.type,
                        line: exp.line
                    });
                }
            });
        });
        
        return unused;
    }

    getDeadModules() {
        return Array.from(this.modules.entries())
            .filter(([_, analysis]) => analysis.isDead)
            .map(([moduleUrl, analysis]) => ({
                module: moduleUrl,
                size: analysis.originalSize,
                exports: analysis.exports.length,
                imports: analysis.imports.length
            }));
    }

    getDependencyGraph() {
        const graph = { nodes: [], edges: [] };
        
        this.modules.forEach((analysis, moduleUrl) => {
            graph.nodes.push({
                id: moduleUrl,
                label: moduleUrl.split('/').pop(),
                size: analysis.originalSize,
                isDead: analysis.isDead,
                exports: analysis.exports.length,
                imports: analysis.imports.length
            });
            
            analysis.imports.forEach(imp => {
                const targetUrl = this.resolveModulePath(imp.source, moduleUrl);
                if (targetUrl && this.modules.has(targetUrl)) {
                    graph.edges.push({
                        source: moduleUrl,
                        target: targetUrl,
                        type: imp.type,
                        imported: imp.imported
                    });
                }
            });
        });
        
        return graph;
    }

    generateReport() {
        const unusedExports = this.getUnusedExports();
        const deadModules = this.getDeadModules();
        
        return {
            summary: {
                totalModules: this.stats.totalModules,
                deadModules: deadModules.length,
                unusedExports: unusedExports.length,
                removedBytes: this.stats.removedBytes,
                shakingRatio: this.stats.shakingRatio.toFixed(2) + '%',
                preservedBytes: this.stats.preservedBytes
            },
            details: {
                unusedExports: unusedExports.slice(0, 20), // Top 20
                deadModules: deadModules,
                errors: this.stats.errors
            },
            recommendations: this.generateRecommendations(),
            dependencyGraph: this.getDependencyGraph(),
            timestamp: Date.now()
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const unusedCount = this.getUnusedExports().length;
        const deadCount = this.getDeadModules().length;
        
        if (deadCount > 0) {
            recommendations.push({
                type: 'dead-modules',
                priority: 'high',
                message: `${deadCount} dead modules detected`,
                action: 'Remove unused modules from your bundle',
                impact: 'high'
            });
        }
        
        if (unusedCount > 5) {
            recommendations.push({
                type: 'unused-exports',
                priority: 'medium',
                message: `${unusedCount} unused exports detected`,
                action: 'Remove unused exports to reduce bundle size',
                impact: 'medium'
            });
        }
        
        if (this.stats.shakingRatio < 10) {
            recommendations.push({
                type: 'optimization',
                priority: 'low',
                message: 'Low tree shaking effectiveness',
                action: 'Review code structure and enable more aggressive shaking',
                impact: 'medium'
            });
        }
        
        return recommendations;
    }

    getStats() {
        return {
            ...this.stats,
            shakingRatioFormatted: this.stats.shakingRatio.toFixed(2) + '%',
            removedKB: (this.stats.removedBytes / 1024).toFixed(2),
            preservedKB: (this.stats.preservedBytes / 1024).toFixed(2)
        };
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    addEntryPoint(moduleUrl) {
        this.entryPoints.add(moduleUrl);
        this.performTreeShaking(); // Re-analyze with new entry point
    }

    removeEntryPoint(moduleUrl) {
        this.entryPoints.delete(moduleUrl);
        this.performTreeShaking(); // Re-analyze without entry point
    }

    reset() {
        this.dependencyGraph.clear();
        this.exportMap.clear();
        this.importMap.clear();
        this.usedExports.clear();
        this.unusedCode.clear();
        this.modules.clear();
        
        this.stats = {
            totalModules: 0,
            analyzedExports: 0,
            removedExports: 0,
            removedImports: 0,
            removedBytes: 0,
            preservedBytes: 0,
            shakingRatio: 0,
            errors: []
        };
    }

    exportData() {
        return {
            stats: this.getStats(),
            unusedExports: this.getUnusedExports(),
            deadModules: this.getDeadModules(),
            dependencyGraph: this.getDependencyGraph(),
            settings: this.settings,
            entryPoints: Array.from(this.entryPoints),
            report: this.generateReport(),
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const treeShaker = new TreeShaker();
export default treeShaker;