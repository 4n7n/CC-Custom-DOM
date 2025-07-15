/**
 * Code Splitter Module
 * Implements dynamic code splitting and lazy loading for better performance
 */

class CodeSplitter {
    constructor() {
        this.modules = new Map();
        this.loadedChunks = new Set();
        this.loadingChunks = new Map();
        this.dependencies = new Map();
        this.preloadedModules = new Set();
        this.criticalModules = new Set(['core', 'vendor', 'polyfills']);
        this.routes = new Map();
        this.componentCache = new Map();
        
        this.settings = {
            preloadThreshold: 0.5, // Preload when 50% visible
            maxConcurrentLoads: 3,
            chunkSize: 250 * 1024, // 250KB target chunk size
            enablePrefetch: true,
            enablePreload: true,
            cacheStrategy: 'aggressive'
        };
        
        this.stats = {
            totalChunks: 0,
            loadedChunks: 0,
            failedChunks: 0,
            totalLoadTime: 0,
            cacheHits: 0
        };
        
        this.init();
    }

    init() {
        this.setupRouteBasedSplitting();
        this.setupComponentBasedSplitting();
        this.setupFeatureBasedSplitting();
        this.setupIntersectionObserver();
        this.setupPreloadStrategy();
        this.monitorPerformance();
    }

    setupRouteBasedSplitting() {
        // Define route-based chunks
        this.defineRoute('/', {
            chunks: ['home', 'common'],
            preload: ['about'],
            priority: 'high'
        });
        
        this.defineRoute('/about', {
            chunks: ['about', 'common'],
            preload: ['contact'],
            priority: 'medium'
        });
        
        this.defineRoute('/dashboard', {
            chunks: ['dashboard', 'charts', 'common'],
            preload: ['settings'],
            priority: 'high'
        });
        
        this.defineRoute('/admin', {
            chunks: ['admin', 'forms', 'tables'],
            preload: [],
            priority: 'low'
        });
        
        // Set up route change listener
        this.setupRouteListener();
    }

    defineRoute(path, config) {
        this.routes.set(path, {
            ...config,
            loaded: false,
            loading: false
        });
    }

    setupRouteListener() {
        // Listen for route changes (works with most SPA routers)
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });
        
        // Override pushState and replaceState
        this.interceptHistoryMethods();
        
        // Handle initial route
        this.handleRouteChange();
    }

    interceptHistoryMethods() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this.handleRouteChange();
        };
        
        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            this.handleRouteChange();
        };
    }

    handleRouteChange() {
        const currentPath = window.location.pathname;
        const route = this.findMatchingRoute(currentPath);
        
        if (route) {
            this.loadRouteChunks(route);
        }
    }

    findMatchingRoute(path) {
        // Find exact match first
        if (this.routes.has(path)) {
            return this.routes.get(path);
        }
        
        // Find pattern match
        for (const [routePath, config] of this.routes) {
            if (this.matchesRoute(path, routePath)) {
                return config;
            }
        }
        
        return null;
    }

    matchesRoute(path, routePath) {
        // Simple pattern matching (can be enhanced with regex)
        if (routePath.includes(':')) {
            const routeParts = routePath.split('/');
            const pathParts = path.split('/');
            
            if (routeParts.length !== pathParts.length) return false;
            
            return routeParts.every((part, index) => {
                return part.startsWith(':') || part === pathParts[index];
            });
        }
        
        return false;
    }

    async loadRouteChunks(route) {
        if (route.loading || route.loaded) return;
        
        route.loading = true;
        
        try {
            // Load critical chunks first
            const criticalChunks = route.chunks.filter(chunk => 
                this.criticalModules.has(chunk)
            );
            
            const nonCriticalChunks = route.chunks.filter(chunk => 
                !this.criticalModules.has(chunk)
            );
            
            // Load critical chunks synchronously
            for (const chunk of criticalChunks) {
                await this.loadChunk(chunk);
            }
            
            // Load non-critical chunks asynchronously
            const nonCriticalPromises = nonCriticalChunks.map(chunk => 
                this.loadChunk(chunk)
            );
            
            await Promise.all(nonCriticalPromises);
            
            // Preload next likely chunks
            if (route.preload && this.settings.enablePreload) {
                route.preload.forEach(chunk => {
                    this.preloadChunk(chunk);
                });
            }
            
            route.loaded = true;
            route.loading = false;
        } catch (error) {
            route.loading = false;
            console.error('Failed to load route chunks:', error);
        }
    }

    setupComponentBasedSplitting() {
        // Setup lazy component loading
        this.defineComponent('DataTable', {
            chunk: 'data-table',
            dependencies: ['charts'],
            size: 150 * 1024,
            priority: 'medium'
        });
        
        this.defineComponent('VideoPlayer', {
            chunk: 'video-player',
            dependencies: ['media-controls'],
            size: 200 * 1024,
            priority: 'low'
        });
        
        this.defineComponent('ChartWidget', {
            chunk: 'charts',
            dependencies: ['d3', 'common'],
            size: 180 * 1024,
            priority: 'medium'
        });
        
        this.defineComponent('FileUploader', {
            chunk: 'file-upload',
            dependencies: ['common'],
            size: 80 * 1024,
            priority: 'high'
        });
    }

    defineComponent(name, config) {
        this.modules.set(name, {
            type: 'component',
            ...config,
            loaded: false,
            loading: false
        });
    }

    setupFeatureBasedSplitting() {
        // Define feature-based chunks
        this.defineFeature('analytics', {
            chunks: ['analytics-core', 'charts', 'export'],
            trigger: '[data-feature="analytics"]',
            dependencies: ['common']
        });
        
        this.defineFeature('admin-panel', {
            chunks: ['admin', 'forms', 'tables'],
            trigger: '[data-feature="admin"]',
            dependencies: ['common', 'auth']
        });
        
        this.defineFeature('real-time', {
            chunks: ['websockets', 'notifications'],
            trigger: '[data-feature="realtime"]',
            dependencies: ['common']
        });
    }

    defineFeature(name, config) {
        this.modules.set(name, {
            type: 'feature',
            ...config,
            loaded: false,
            loading: false
        });
        
        // Set up trigger observers
        this.observeFeatureTriggers(config.trigger, name);
    }

    observeFeatureTriggers(selector, featureName) {
        // Use intersection observer to detect when feature elements come into view
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadFeature(featureName);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '100px 0px' // Load 100px before coming into view
            });
            
            // Observe existing elements
            document.querySelectorAll(selector).forEach(element => {
                observer.observe(element);
            });
            
            // Observe future elements
            this.observeFutureElements(selector, observer);
        }
    }

    observeFutureElements(selector, observer) {
        if ('MutationObserver' in window) {
            const mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches && node.matches(selector)) {
                                observer.observe(node);
                            }
                            
                            // Check child elements
                            node.querySelectorAll?.(selector).forEach(child => {
                                observer.observe(child);
                            });
                        }
                    });
                });
            });
            
            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.preloadObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.intersectionRatio >= this.settings.preloadThreshold) {
                        const target = entry.target;
                        const chunkName = target.dataset.chunk;
                        
                        if (chunkName) {
                            this.preloadChunk(chunkName);
                            this.preloadObserver.unobserve(target);
                        }
                    }
                });
            }, {
                threshold: [this.settings.preloadThreshold]
            });
        }
    }

    setupPreloadStrategy() {
        // Preload based on user behavior patterns
        this.setupHoverPreloading();
        this.setupIdlePreloading();
        this.setupPredictivePreloading();
    }

    setupHoverPreloading() {
        // Preload chunks when user hovers over links
        document.addEventListener('mouseover', (event) => {
            const link = event.target.closest('a[data-preload]');
            if (link) {
                const chunkName = link.dataset.preload;
                this.preloadChunk(chunkName);
            }
        });
    }

    setupIdlePreloading() {
        // Preload non-critical chunks during idle time
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.preloadIdleChunks();
            });
        } else {
            setTimeout(() => {
                this.preloadIdleChunks();
            }, 2000);
        }
    }

    preloadIdleChunks() {
        // Get non-critical modules that haven't been loaded
        const idleChunks = Array.from(this.modules.entries())
            .filter(([name, module]) => 
                !module.loaded && 
                !this.criticalModules.has(name) &&
                module.priority !== 'high'
            )
            .slice(0, 3); // Limit to 3 chunks
        
        idleChunks.forEach(([name]) => {
            this.preloadChunk(name);
        });
    }

    setupPredictivePreloading() {
        // Analyze user patterns and preload likely next chunks
        this.trackUserPatterns();
    }

    trackUserPatterns() {
        // Simple pattern tracking based on page visits
        const visitPattern = JSON.parse(localStorage.getItem('visitPattern') || '[]');
        visitPattern.push(window.location.pathname);
        
        // Keep only last 10 visits
        if (visitPattern.length > 10) {
            visitPattern.shift();
        }
        
        localStorage.setItem('visitPattern', JSON.stringify(visitPattern));
        
        // Predict next likely page
        const prediction = this.predictNextPage(visitPattern);
        if (prediction) {
            const route = this.routes.get(prediction);
            if (route) {
                route.chunks.forEach(chunk => this.preloadChunk(chunk));
            }
        }
    }

    predictNextPage(pattern) {
        if (pattern.length < 3) return null;
        
        // Simple prediction: most frequent next page after current page
        const currentPage = pattern[pattern.length - 1];
        const nextPages = {};
        
        for (let i = 0; i < pattern.length - 1; i++) {
            if (pattern[i] === currentPage) {
                const nextPage = pattern[i + 1];
                nextPages[nextPage] = (nextPages[nextPage] || 0) + 1;
            }
        }
        
        // Return most frequent next page
        return Object.keys(nextPages).reduce((a, b) => 
            nextPages[a] > nextPages[b] ? a : b, null
        );
    }

    async loadChunk(chunkName) {
        if (this.loadedChunks.has(chunkName)) {
            this.stats.cacheHits++;
            return this.getFromCache(chunkName);
        }
        
        if (this.loadingChunks.has(chunkName)) {
            return this.loadingChunks.get(chunkName);
        }
        
        const startTime = performance.now();
        
        const loadPromise = this.performChunkLoad(chunkName)
            .then(module => {
                const loadTime = performance.now() - startTime;
                this.updateLoadStats(chunkName, loadTime, true);
                
                this.loadedChunks.add(chunkName);
                this.loadingChunks.delete(chunkName);
                this.cacheModule(chunkName, module);
                
                return module;
            })
            .catch(error => {
                this.updateLoadStats(chunkName, performance.now() - startTime, false);
                this.loadingChunks.delete(chunkName);
                throw error;
            });
        
        this.loadingChunks.set(chunkName, loadPromise);
        return loadPromise;
    }

    async performChunkLoad(chunkName) {
        // First try to load dependencies
        const module = this.modules.get(chunkName);
        if (module && module.dependencies) {
            await this.loadDependencies(module.dependencies);
        }
        
        try {
            // Dynamic import with chunk name
            const moduleUrl = this.getChunkUrl(chunkName);
            const importedModule = await import(moduleUrl);
            
            // Execute module initialization if present
            if (importedModule.default && typeof importedModule.default === 'function') {
                return importedModule.default();
            }
            
            return importedModule;
        } catch (error) {
            // Fallback loading strategy
            return this.fallbackLoad(chunkName);
        }
    }

    async loadDependencies(dependencies) {
        const dependencyPromises = dependencies.map(dep => this.loadChunk(dep));
        await Promise.all(dependencyPromises);
    }

    getChunkUrl(chunkName) {
        // Generate chunk URL based on naming convention
        const baseUrl = '/chunks/';
        const hash = this.getChunkHash(chunkName);
        return `${baseUrl}${chunkName}.${hash}.js`;
    }

    getChunkHash(chunkName) {
        // In a real implementation, this would be the actual chunk hash
        // For now, return a placeholder
        return 'abc123';
    }

    async fallbackLoad(chunkName) {
        console.warn(`Fallback loading for chunk: ${chunkName}`);
        
        // Try alternative URL patterns
        const fallbackUrls = [
            `/js/chunks/${chunkName}.js`,
            `/assets/js/${chunkName}.js`,
            `/dist/chunks/${chunkName}.js`
        ];
        
        for (const url of fallbackUrls) {
            try {
                return await import(url);
            } catch (error) {
                continue;
            }
        }
        
        throw new Error(`Failed to load chunk: ${chunkName}`);
    }

    async preloadChunk(chunkName) {
        if (this.preloadedModules.has(chunkName) || this.loadedChunks.has(chunkName)) {
            return;
        }
        
        this.preloadedModules.add(chunkName);
        
        try {
            // Use link preload for better browser support
            const link = document.createElement('link');
            link.rel = 'modulepreload';
            link.href = this.getChunkUrl(chunkName);
            document.head.appendChild(link);
            
            // Also start the actual import in background
            if (this.settings.enablePrefetch) {
                this.loadChunk(chunkName).catch(() => {
                    // Ignore preload errors
                });
            }
        } catch (error) {
            console.warn(`Preload failed for chunk: ${chunkName}`, error);
        }
    }

    async loadFeature(featureName) {
        const feature = this.modules.get(featureName);
        if (!feature || feature.loading || feature.loaded) return;
        
        feature.loading = true;
        
        try {
            // Load feature chunks
            const chunkPromises = feature.chunks.map(chunk => this.loadChunk(chunk));
            await Promise.all(chunkPromises);
            
            feature.loaded = true;
            feature.loading = false;
            
            // Dispatch feature loaded event
            document.dispatchEvent(new CustomEvent('featureLoaded', {
                detail: { featureName, feature }
            }));
        } catch (error) {
            feature.loading = false;
            console.error(`Failed to load feature: ${featureName}`, error);
        }
    }

    async loadComponent(componentName, targetElement = null) {
        const component = this.modules.get(componentName);
        if (!component) {
            throw new Error(`Component not found: ${componentName}`);
        }
        
        if (component.loading) {
            return this.loadingChunks.get(component.chunk);
        }
        
        if (component.loaded) {
            return this.getFromCache(component.chunk);
        }
        
        try {
            const module = await this.loadChunk(component.chunk);
            
            // Initialize component if target element provided
            if (targetElement && module.default) {
                const instance = new module.default(targetElement);
                return instance;
            }
            
            return module;
        } catch (error) {
            console.error(`Failed to load component: ${componentName}`, error);
            throw error;
        }
    }

    cacheModule(chunkName, module) {
        if (this.settings.cacheStrategy === 'aggressive') {
            this.componentCache.set(chunkName, module);
        }
    }

    getFromCache(chunkName) {
        return this.componentCache.get(chunkName);
    }

    updateLoadStats(chunkName, loadTime, success) {
        this.stats.totalChunks++;
        this.stats.totalLoadTime += loadTime;
        
        if (success) {
            this.stats.loadedChunks++;
        } else {
            this.stats.failedChunks++;
        }
    }

    monitorPerformance() {
        // Monitor chunk loading performance
        setInterval(() => {
            this.analyzePerformance();
        }, 30000); // Every 30 seconds
    }

    analyzePerformance() {
        const averageLoadTime = this.stats.totalLoadTime / this.stats.totalChunks;
        const successRate = (this.stats.loadedChunks / this.stats.totalChunks) * 100;
        const cacheHitRate = (this.stats.cacheHits / this.stats.totalChunks) * 100;
        
        if (averageLoadTime > 1000) { // > 1 second
            console.warn('Slow chunk loading detected:', {
                averageLoadTime,
                successRate,
                cacheHitRate
            });
        }
    }

    // Public API methods
    async importModule(chunkName) {
        return this.loadChunk(chunkName);
    }

    async importComponent(componentName, target) {
        return this.loadComponent(componentName, target);
    }

    prefetchChunk(chunkName) {
        this.preloadChunk(chunkName);
    }

    prefetchRoute(routePath) {
        const route = this.routes.get(routePath);
        if (route) {
            route.chunks.forEach(chunk => this.preloadChunk(chunk));
        }
    }

    getLoadingStats() {
        return {
            ...this.stats,
            averageLoadTime: this.stats.totalChunks > 0 ? 
                this.stats.totalLoadTime / this.stats.totalChunks : 0,
            successRate: this.stats.totalChunks > 0 ? 
                (this.stats.loadedChunks / this.stats.totalChunks) * 100 : 100,
            cacheHitRate: this.stats.totalChunks > 0 ? 
                (this.stats.cacheHits / this.stats.totalChunks) * 100 : 0
        };
    }

    getChunkStatus() {
        const status = {
            loaded: Array.from(this.loadedChunks),
            loading: Array.from(this.loadingChunks.keys()),
            preloaded: Array.from(this.preloadedModules),
            total: this.modules.size
        };
        
        return status;
    }

    // Configuration methods
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    addRoute(path, config) {
        this.defineRoute(path, config);
    }

    addComponent(name, config) {
        this.defineComponent(name, config);
    }

    addFeature(name, config) {
        this.defineFeature(name, config);
    }

    // Utility methods for external libraries
    createLazyComponent(importFunction) {
        return (...args) => {
            return importFunction().then(module => {
                const Component = module.default || module;
                return new Component(...args);
            });
        };
    }

    createAsyncIterator(chunkNames) {
        let index = 0;
        
        return {
            [Symbol.asyncIterator]: () => ({
                next: async () => {
                    if (index >= chunkNames.length) {
                        return { done: true };
                    }
                    
                    const chunkName = chunkNames[index++];
                    const module = await this.loadChunk(chunkName);
                    
                    return {
                        value: { chunkName, module },
                        done: false
                    };
                }
            })
        };
    }

    // Cleanup methods
    clearCache() {
        this.componentCache.clear();
        this.preloadedModules.clear();
    }

    reset() {
        this.clearCache();
        this.loadedChunks.clear();
        this.loadingChunks.clear();
        this.stats = {
            totalChunks: 0,
            loadedChunks: 0,
            failedChunks: 0,
            totalLoadTime: 0,
            cacheHits: 0
        };
    }

    exportData() {
        return {
            stats: this.getLoadingStats(),
            status: this.getChunkStatus(),
            settings: this.settings,
            routes: Array.from(this.routes.entries()),
            modules: Array.from(this.modules.entries()),
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const codeSplitter = new CodeSplitter();

// Export for external use
export default codeSplitter;