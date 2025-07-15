/**
 * Bundle Analyzer Module
 * Analyzes JavaScript bundles, dependencies, and optimization opportunities
 */

class BundleAnalyzer {
    constructor() {
        this.bundles = new Map();
        this.dependencies = new Map();
        this.duplicates = new Map();
        this.chunks = new Map();
        this.treemapData = null;
        this.analysisResults = null;
        this.worker = null;
        
        this.settings = {
            enableSourceMaps: true,
            analyzeDuplicates: true,
            trackDependencies: true,
            generateTreemap: true,
            compressionAnalysis: true,
            unusedCodeDetection: true,
            thresholds: {
                bundleSize: 500 * 1024,      // 500KB
                chunkSize: 250 * 1024,       // 250KB
                duplicateThreshold: 10 * 1024, // 10KB
                unusedThreshold: 5           // 5%
            }
        };
        
        this.stats = {
            totalBundles: 0,
            totalSize: 0,
            compressedSize: 0,
            duplicatedSize: 0,
            unusedSize: 0,
            lastAnalysis: null
        };
        
        this.init();
    }

    init() {
        this.setupWorker();
        this.analyzeExistingBundles();
        this.setupBundleObserver();
        this.startPerformanceTracking();
    }

    setupWorker() {
        if ('Worker' in window) {
            try {
                this.worker = new Worker('/workers/bundle-analysis.worker.js');
                this.setupWorkerHandlers();
            } catch (e) {
                console.warn('Bundle analysis worker not available:', e);
            }
        }
    }

    setupWorkerHandlers() {
        if (!this.worker) return;
        
        this.worker.onmessage = (event) => {
            const { type, data, id } = event.data;
            
            switch (type) {
                case 'ANALYSIS_COMPLETE':
                    this.handleAnalysisResult(data, id);
                    break;
                case 'TREEMAP_GENERATED':
                    this.handleTreemapResult(data, id);
                    break;
                case 'DUPLICATES_FOUND':
                    this.handleDuplicatesResult(data, id);
                    break;
                case 'ERROR':
                    console.error('Bundle analysis error:', data);
                    break;
            }
        };
    }

    analyzeExistingBundles() {
        // Analyze script tags
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            this.analyzeBundle(script.src, 'script');
        });
        
        // Analyze dynamic imports from performance entries
        if ('getEntriesByType' in performance) {
            const resources = performance.getEntriesByType('resource');
            resources.forEach(resource => {
                if (resource.name.endsWith('.js') || resource.name.includes('chunk')) {
                    this.analyzeBundle(resource.name, 'dynamic', {
                        loadTime: resource.duration,
                        size: resource.transferSize || resource.decodedBodySize
                    });
                }
            });
        }
    }

    async analyzeBundle(url, type = 'unknown', metadata = {}) {
        const bundleId = this.generateBundleId(url);
        
        if (this.bundles.has(bundleId)) {
            return this.bundles.get(bundleId);
        }
        
        const bundle = {
            id: bundleId,
            url: url,
            type: type,
            metadata: metadata,
            analysis: null,
            timestamp: Date.now()
        };
        
        this.bundles.set(bundleId, bundle);
        
        try {
            // Fetch and analyze bundle content
            const content = await this.fetchBundleContent(url);
            const analysis = await this.performBundleAnalysis(content, url);
            
            bundle.analysis = analysis;
            bundle.size = content.length;
            bundle.gzipSize = await this.estimateGzipSize(content);
            
            this.updateStats(bundle);
            
            // Detect chunks and dependencies
            if (this.settings.trackDependencies) {
                this.extractDependencies(bundle, content);
            }
            
            if (this.settings.analyzeDuplicates) {
                this.detectDuplicates(bundle, content);
            }
            
            return bundle;
            
        } catch (error) {
            console.warn(`Failed to analyze bundle ${url}:`, error);
            bundle.error = error.message;
            return bundle;
        }
    }

    async fetchBundleContent(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            // For same-origin bundles, try to get from script elements
            const script = document.querySelector(`script[src="${url}"]`);
            if (script && script.textContent) {
                return script.textContent;
            }
            throw error;
        }
    }

    async performBundleAnalysis(content, url) {
        const analysis = {
            size: content.length,
            lines: content.split('\n').length,
            functions: this.countFunctions(content),
            modules: this.extractModules(content),
            imports: this.extractImports(content),
            exports: this.extractExports(content),
            sourcemap: this.findSourceMap(content, url),
            minified: this.isMinified(content),
            webpack: this.detectWebpack(content),
            rollup: this.detectRollup(content),
            esbuild: this.detectEsbuild(content)
        };
        
        // Enhanced analysis with worker if available
        if (this.worker) {
            return this.analyzeWithWorker(content, analysis);
        }
        
        return analysis;
    }

    async analyzeWithWorker(content, basicAnalysis) {
        return new Promise((resolve) => {
            const id = Date.now() + Math.random();
            
            this.analysisCallbacks = this.analysisCallbacks || new Map();
            this.analysisCallbacks.set(id, resolve);
            
            this.worker.postMessage({
                type: 'ANALYZE_BUNDLE',
                data: { content, basicAnalysis },
                id: id
            });
        });
    }

    handleAnalysisResult(data, id) {
        const callback = this.analysisCallbacks?.get(id);
        if (callback) {
            callback(data);
            this.analysisCallbacks.delete(id);
        }
    }

    countFunctions(content) {
        // Count function declarations and expressions
        const functionRegex = /function\s+\w+|=>\s*{|function\s*\(/g;
        const matches = content.match(functionRegex);
        return matches ? matches.length : 0;
    }

    extractModules(content) {
        const modules = [];
        
        // CommonJS modules
        const cjsRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        let match;
        while ((match = cjsRegex.exec(content)) !== null) {
            modules.push({ type: 'cjs', name: match[1] });
        }
        
        // ES6 modules
        const esRegex = /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g;
        while ((match = esRegex.exec(content)) !== null) {
            modules.push({ type: 'esm', name: match[1] });
        }
        
        return modules;
    }

    extractImports(content) {
        const imports = [];
        
        // ES6 imports
        const importRegex = /import\s+(.*?)\s+from\s+['"`]([^'"`]+)['"`]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push({
                specifiers: match[1].trim(),
                source: match[2],
                type: 'esm'
            });
        }
        
        // Dynamic imports
        const dynamicRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        while ((match = dynamicRegex.exec(content)) !== null) {
            imports.push({
                source: match[1],
                type: 'dynamic'
            });
        }
        
        return imports;
    }

    extractExports(content) {
        const exports = [];
        
        // ES6 exports
        const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)?\s*(\w+)/g;
        let match;
        while ((match = exportRegex.exec(content)) !== null) {
            exports.push({
                name: match[1],
                type: 'named'
            });
        }
        
        // Default exports
        const defaultExportRegex = /export\s+default/g;
        if (defaultExportRegex.test(content)) {
            exports.push({
                name: 'default',
                type: 'default'
            });
        }
        
        return exports;
    }

    findSourceMap(content, url) {
        // Look for sourcemap comments
        const sourcemapRegex = /\/\/# sourceMappingURL=(.+)/;
        const match = content.match(sourcemapRegex);
        
        if (match) {
            const mapUrl = match[1];
            return {
                url: new URL(mapUrl, url).href,
                type: 'comment'
            };
        }
        
        // Look for inline sourcemaps
        if (content.includes('data:application/json;base64,')) {
            return {
                type: 'inline',
                size: this.estimateInlineSourcemapSize(content)
            };
        }
        
        return null;
    }

    estimateInlineSourcemapSize(content) {
        const base64Regex = /data:application\/json;base64,([A-Za-z0-9+/=]+)/;
        const match = content.match(base64Regex);
        
        if (match) {
            return Math.round(match[1].length * 0.75); // Base64 to bytes approximation
        }
        
        return 0;
    }

    isMinified(content) {
        // Heuristics to detect minified code
        const lines = content.split('\n');
        const avgLineLength = content.length / lines.length;
        const hasLongLines = lines.some(line => line.length > 200);
        const hasShortVarNames = /\b[a-z]\b/.test(content);
        
        return avgLineLength > 80 && hasLongLines && hasShortVarNames;
    }

    detectWebpack(content) {
        const webpackSignatures = [
            '__webpack_require__',
            'webpackJsonp',
            '__webpack_exports__',
            'webpack_modules'
        ];
        
        return webpackSignatures.some(signature => content.includes(signature));
    }

    detectRollup(content) {
        const rollupSignatures = [
            'rollup',
            'createCommonjsModule',
            'unwrapExports'
        ];
        
        return rollupSignatures.some(signature => content.includes(signature));
    }

    detectEsbuild(content) {
        const esbuildSignatures = [
            '__export(',
            '__reExport(',
            '__toESM('
        ];
        
        return esbuildSignatures.some(signature => content.includes(signature));
    }

    extractDependencies(bundle, content) {
        const dependencies = new Set();
        
        // Extract from imports
        if (bundle.analysis && bundle.analysis.imports) {
            bundle.analysis.imports.forEach(imp => {
                if (!imp.source.startsWith('.') && !imp.source.startsWith('/')) {
                    dependencies.add(imp.source);
                }
            });
        }
        
        // Extract from webpack chunks
        if (this.detectWebpack(content)) {
            const webpackDeps = this.extractWebpackDependencies(content);
            webpackDeps.forEach(dep => dependencies.add(dep));
        }
        
        this.dependencies.set(bundle.id, Array.from(dependencies));
    }

    extractWebpackDependencies(content) {
        const deps = [];
        
        // Look for webpack module definitions
        const moduleRegex = /\/\*\s*\d+\s*\*\/\s*function\s*\([^)]*\)\s*{[^}]*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        let match;
        while ((match = moduleRegex.exec(content)) !== null) {
            deps.push(match[1]);
        }
        
        return deps;
    }

    detectDuplicates(bundle, content) {
        // Simple duplicate detection based on function signatures
        const functions = this.extractFunctionSignatures(content);
        
        functions.forEach(func => {
            const hash = this.hashFunction(func);
            
            if (!this.duplicates.has(hash)) {
                this.duplicates.set(hash, []);
            }
            
            this.duplicates.get(hash).push({
                bundleId: bundle.id,
                function: func.name,
                size: func.content.length
            });
        });
    }

    extractFunctionSignatures(content) {
        const functions = [];
        const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g;
        
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            functions.push({
                name: match[1],
                content: match[2],
                fullMatch: match[0]
            });
        }
        
        return functions;
    }

    hashFunction(func) {
        // Simple hash function for duplicate detection
        let hash = 0;
        const str = func.content.replace(/\s+/g, ' ').trim();
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash.toString(36);
    }

    async estimateGzipSize(content) {
        try {
            if ('CompressionStream' in window) {
                const stream = new CompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(new TextEncoder().encode(content));
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
                
                return compressedSize;
            } else {
                // Fallback estimation (rough approximation)
                return Math.round(content.length * 0.3);
            }
        } catch (error) {
            return Math.round(content.length * 0.3);
        }
    }

    generateBundleId(url) {
        return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
    }

    updateStats(bundle) {
        this.stats.totalBundles++;
        this.stats.totalSize += bundle.size || 0;
        this.stats.compressedSize += bundle.gzipSize || 0;
        this.stats.lastAnalysis = Date.now();
    }

    setupBundleObserver() {
        // Watch for new script elements
        if ('MutationObserver' in window) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT' && node.src) {
                            this.analyzeBundle(node.src, 'dynamic');
                        }
                    });
                });
            });
            
            observer.observe(document.head, { childList: true });
            observer.observe(document.body, { childList: true });
        }
    }

    startPerformanceTracking() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.name.endsWith('.js')) {
                        this.trackBundlePerformance(entry);
                    }
                });
            });
            
            observer.observe({ entryTypes: ['resource'] });
        }
    }

    trackBundlePerformance(entry) {
        const bundleId = this.generateBundleId(entry.name);
        const bundle = this.bundles.get(bundleId);
        
        if (bundle) {
            bundle.performance = {
                loadTime: entry.duration,
                transferSize: entry.transferSize,
                decodedBodySize: entry.decodedBodySize,
                cached: entry.transferSize === 0
            };
        }
    }

    // Analysis Methods
    generateTreemap() {
        const treemapData = {
            name: 'Root',
            children: []
        };
        
        this.bundles.forEach(bundle => {
            const bundleNode = {
                name: this.getBundleName(bundle.url),
                size: bundle.size || 0,
                gzipSize: bundle.gzipSize || 0,
                type: bundle.type,
                children: []
            };
            
            // Add dependency nodes
            const deps = this.dependencies.get(bundle.id) || [];
            deps.forEach(dep => {
                bundleNode.children.push({
                    name: dep,
                    size: Math.round((bundle.size || 0) / deps.length),
                    type: 'dependency'
                });
            });
            
            treemapData.children.push(bundleNode);
        });
        
        this.treemapData = treemapData;
        return treemapData;
    }

    getBundleName(url) {
        return url.split('/').pop().replace(/\?.*$/, '');
    }

    analyzeCodeSplitting() {
        const analysis = {
            hasCodeSplitting: false,
            chunkCount: 0,
            mainBundleSize: 0,
            totalChunkSize: 0,
            recommendations: []
        };
        
        const chunks = Array.from(this.bundles.values()).filter(bundle => 
            bundle.type === 'dynamic' || bundle.url.includes('chunk')
        );
        
        analysis.hasCodeSplitting = chunks.length > 0;
        analysis.chunkCount = chunks.length;
        analysis.totalChunkSize = chunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0);
        
        // Find main bundle
        const mainBundle = Array.from(this.bundles.values()).find(bundle => 
            bundle.type === 'script' && !bundle.url.includes('chunk')
        );
        
        if (mainBundle) {
            analysis.mainBundleSize = mainBundle.size || 0;
            
            if (analysis.mainBundleSize > this.settings.thresholds.bundleSize) {
                analysis.recommendations.push({
                    type: 'code-splitting',
                    message: 'Main bundle is large. Consider implementing code splitting.',
                    impact: 'high'
                });
            }
        }
        
        return analysis;
    }

    analyzeDuplicates() {
        const duplicateAnalysis = {
            totalDuplicates: 0,
            duplicatedSize: 0,
            duplicateGroups: []
        };
        
        this.duplicates.forEach((instances, hash) => {
            if (instances.length > 1) {
                const group = {
                    hash: hash,
                    instances: instances,
                    count: instances.length,
                    totalSize: instances.reduce((sum, inst) => sum + inst.size, 0)
                };
                
                duplicateAnalysis.duplicateGroups.push(group);
                duplicateAnalysis.totalDuplicates += instances.length - 1;
                duplicateAnalysis.duplicatedSize += group.totalSize * (instances.length - 1);
            }
        });
        
        this.stats.duplicatedSize = duplicateAnalysis.duplicatedSize;
        return duplicateAnalysis;
    }

    analyzeUnusedCode() {
        // This is a simplified analysis - in real implementation would need AST parsing
        const unusedAnalysis = {
            estimatedUnusedSize: 0,
            unusedExports: [],
            deadCode: [],
            recommendations: []
        };
        
        this.bundles.forEach(bundle => {
            if (bundle.analysis) {
                const exports = bundle.analysis.exports || [];
                const imports = bundle.analysis.imports || [];
                
                // Simple heuristic: exports that aren't imported elsewhere
                exports.forEach(exp => {
                    const isUsed = Array.from(this.bundles.values()).some(otherBundle => {
                        const otherImports = otherBundle.analysis?.imports || [];
                        return otherImports.some(imp => imp.specifiers?.includes(exp.name));
                    });
                    
                    if (!isUsed && exp.name !== 'default') {
                        unusedAnalysis.unusedExports.push({
                            bundleId: bundle.id,
                            exportName: exp.name,
                            estimatedSize: Math.round((bundle.size || 0) / exports.length)
                        });
                    }
                });
            }
        });
        
        unusedAnalysis.estimatedUnusedSize = unusedAnalysis.unusedExports
            .reduce((sum, exp) => sum + exp.estimatedSize, 0);
        
        this.stats.unusedSize = unusedAnalysis.estimatedUnusedSize;
        
        if (unusedAnalysis.estimatedUnusedSize > this.settings.thresholds.bundleSize * 0.1) {
            unusedAnalysis.recommendations.push({
                type: 'tree-shaking',
                message: 'Significant unused code detected. Enable tree shaking.',
                impact: 'medium'
            });
        }
        
        return unusedAnalysis;
    }

    generateOptimizationReport() {
        const report = {
            summary: {
                totalBundles: this.stats.totalBundles,
                totalSize: this.stats.totalSize,
                compressedSize: this.stats.compressedSize,
                compressionRatio: this.stats.totalSize > 0 ? 
                    (this.stats.compressedSize / this.stats.totalSize) * 100 : 0,
                potentialSavings: this.stats.duplicatedSize + this.stats.unusedSize
            },
            codeSplitting: this.analyzeCodeSplitting(),
            duplicates: this.analyzeDuplicates(),
            unusedCode: this.analyzeUnusedCode(),
            recommendations: this.generateRecommendations(),
            treemap: this.generateTreemap()
        };
        
        this.analysisResults = report;
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Bundle size recommendations
        this.bundles.forEach(bundle => {
            if ((bundle.size || 0) > this.settings.thresholds.bundleSize) {
                recommendations.push({
                    type: 'bundle-size',
                    bundleId: bundle.id,
                    message: `Bundle ${this.getBundleName(bundle.url)} is ${((bundle.size || 0) / 1024).toFixed(1)}KB`,
                    suggestion: 'Consider code splitting or removing unused dependencies',
                    impact: 'high',
                    savings: (bundle.size || 0) - this.settings.thresholds.bundleSize
                });
            }
        });
        
        // Compression recommendations
        this.bundles.forEach(bundle => {
            if (bundle.gzipSize && bundle.size) {
                const compressionRatio = (bundle.gzipSize / bundle.size) * 100;
                if (compressionRatio > 40) { // Poor compression
                    recommendations.push({
                        type: 'compression',
                        bundleId: bundle.id,
                        message: `Poor compression ratio (${compressionRatio.toFixed(1)}%)`,
                        suggestion: 'Consider minification and better compression algorithms',
                        impact: 'medium'
                    });
                }
            }
        });
        
        // Duplicate code recommendations
        const duplicateCount = Array.from(this.duplicates.values())
            .filter(instances => instances.length > 1).length;
        
        if (duplicateCount > 5) {
            recommendations.push({
                type: 'duplicates',
                message: `${duplicateCount} duplicate code blocks found`,
                suggestion: 'Extract common code into shared modules',
                impact: 'medium',
                savings: this.stats.duplicatedSize
            });
        }
        
        return recommendations.sort((a, b) => {
            const impactOrder = { high: 3, medium: 2, low: 1 };
            return impactOrder[b.impact] - impactOrder[a.impact];
        });
    }

    // Public API
    getBundleInfo(bundleId) {
        return this.bundles.get(bundleId);
    }

    getAllBundles() {
        return Array.from(this.bundles.values());
    }

    getDependencyGraph() {
        const graph = {
            nodes: [],
            edges: []
        };
        
        this.bundles.forEach(bundle => {
            graph.nodes.push({
                id: bundle.id,
                name: this.getBundleName(bundle.url),
                size: bundle.size || 0,
                type: bundle.type
            });
            
            const deps = this.dependencies.get(bundle.id) || [];
            deps.forEach(dep => {
                graph.edges.push({
                    source: bundle.id,
                    target: dep,
                    type: 'dependency'
                });
            });
        });
        
        return graph;
    }

    getStats() {
        return {
            ...this.stats,
            compressionRatio: this.stats.totalSize > 0 ? 
                (this.stats.compressedSize / this.stats.totalSize) * 100 : 0,
            duplicateRatio: this.stats.totalSize > 0 ? 
                (this.stats.duplicatedSize / this.stats.totalSize) * 100 : 0,
            unusedRatio: this.stats.totalSize > 0 ? 
                (this.stats.unusedSize / this.stats.totalSize) * 100 : 0
        };
    }

    exportAnalysis(format = 'json') {
        const data = this.analysisResults || this.generateOptimizationReport();
        
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            case 'html':
                return this.generateHTMLReport(data);
            default:
                return data;
        }
    }

    convertToCSV(data) {
        const bundles = this.getAllBundles();
        const headers = ['name', 'size', 'gzipSize', 'type', 'dependencies'];
        
        const rows = bundles.map(bundle => [
            this.getBundleName(bundle.url),
            bundle.size || 0,
            bundle.gzipSize || 0,
            bundle.type,
            (this.dependencies.get(bundle.id) || []).length
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    generateHTMLReport(data) {
        return `<!DOCTYPE html>
        <html>
        <head>
            <title>Bundle Analysis Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .metric { display: inline-block; margin: 10px 20px 10px 0; }
                .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
                .recommendations { margin: 20px 0; }
                .recommendation { padding: 10px; margin: 10px 0; border-radius: 4px; }
                .high { background: #fee2e2; border-left: 4px solid #dc2626; }
                .medium { background: #fef3c7; border-left: 4px solid #d97706; }
                .low { background: #dcfce7; border-left: 4px solid #16a34a; }
                .bundles-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .bundles-table th, .bundles-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .bundles-table th { background: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Bundle Analysis Report</h1>
            <div class="summary">
                <h2>Summary</h2>
                <div class="metric">
                    <div>Total Bundles</div>
                    <div class="metric-value">${data.summary.totalBundles}</div>
                </div>
                <div class="metric">
                    <div>Total Size</div>
                    <div class="metric-value">${(data.summary.totalSize / 1024).toFixed(1)} KB</div>
                </div>
                <div class="metric">
                    <div>Compressed Size</div>
                    <div class="metric-value">${(data.summary.compressedSize / 1024).toFixed(1)} KB</div>
                </div>
                <div class="metric">
                    <div>Potential Savings</div>
                    <div class="metric-value">${(data.summary.potentialSavings / 1024).toFixed(1)} KB</div>
                </div>
            </div>
            
            <div class="recommendations">
                <h2>Recommendations</h2>
                ${data.recommendations.map(rec => `
                    <div class="recommendation ${rec.impact}">
                        <strong>${rec.type}:</strong> ${rec.message}
                        <br><em>${rec.suggestion}</em>
                    </div>
                `).join('')}
            </div>
            
            ${this.generateBundlesTableHTML()}
        </body>
        </html>`;
    }

    generateBundlesTableHTML() {
        const bundles = this.getAllBundles();
        
        return `
        <table class="bundles-table">
            <thead>
                <tr>
                    <th>Bundle</th>
                    <th>Size</th>
                    <th>Gzip Size</th>
                    <th>Type</th>
                    <th>Dependencies</th>
                </tr>
            </thead>
            <tbody>
                ${bundles.map(bundle => `
                    <tr>
                        <td>${this.getBundleName(bundle.url)}</td>
                        <td>${((bundle.size || 0) / 1024).toFixed(1)} KB</td>
                        <td>${((bundle.gzipSize || 0) / 1024).toFixed(1)} KB</td>
                        <td>${bundle.type}</td>
                        <td>${(this.dependencies.get(bundle.id) || []).length}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    clearAnalysis() {
        this.bundles.clear();
        this.dependencies.clear();
        this.duplicates.clear();
        this.chunks.clear();
        this.treemapData = null;
        this.analysisResults = null;
        
        this.stats = {
            totalBundles: 0,
            totalSize: 0,
            compressedSize: 0,
            duplicatedSize: 0,
            unusedSize: 0,
            lastAnalysis: null
        };
    }

    exportData() {
        return {
            bundles: Array.from(this.bundles.entries()),
            dependencies: Array.from(this.dependencies.entries()),
            duplicates: Array.from(this.duplicates.entries()),
            stats: this.getStats(),
            analysis: this.analysisResults,
            treemap: this.treemapData,
            settings: this.settings,
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const bundleAnalyzer = new BundleAnalyzer();
export default bundleAnalyzer;