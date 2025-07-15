/**
 * Intelligent Caching Module
 * Advanced caching system with smart strategies and automatic optimization
 */

class IntelligentCaching {
    constructor() {
        this.caches = new Map();
        this.strategies = new Map();
        this.metrics = new Map();
        this.accessPatterns = new Map();
        this.compressionWorker = null;
        
        this.settings = {
            maxCacheSize: 50 * 1024 * 1024, // 50MB
            defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
            maxEntries: 1000,
            compressionThreshold: 1024, // 1KB
            enableCompression: true,
            enableEncryption: false,
            enablePredictive: true,
            cleanupInterval: 5 * 60 * 1000, // 5 minutes
            accessTrackingLimit: 10000,
            adaptiveOptimization: true
        };
        
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            compressionSavings: 0,
            totalSize: 0,
            lastCleanup: Date.now()
        };
        
        this.storageBackends = new Map();
        this.init();
    }

    init() {
        this.setupStorageBackends();
        this.setupCacheStrategies();
        this.initializeCompressionWorker();
        this.startCleanupScheduler();
        this.setupPerformanceMonitoring();
        this.loadPersistedData();
    }

    setupStorageBackends() {
        // Memory cache (fastest)
        this.storageBackends.set('memory', {
            storage: new Map(),
            maxSize: 10 * 1024 * 1024, // 10MB
            priority: 1,
            persistent: false
        });
        
        // LocalStorage (persistent, limited)
        if (typeof localStorage !== 'undefined') {
            this.storageBackends.set('localStorage', {
                storage: localStorage,
                maxSize: 5 * 1024 * 1024, // 5MB
                priority: 2,
                persistent: true
            });
        }
        
        // SessionStorage (session-persistent)
        if (typeof sessionStorage !== 'undefined') {
            this.storageBackends.set('sessionStorage', {
                storage: sessionStorage,
                maxSize: 10 * 1024 * 1024, // 10MB
                priority: 3,
                persistent: false
            });
        }
        
        // IndexedDB (large, persistent)
        if ('indexedDB' in window) {
            this.setupIndexedDB().then(db => {
                this.storageBackends.set('indexedDB', {
                    storage: db,
                    maxSize: 100 * 1024 * 1024, // 100MB
                    priority: 4,
                    persistent: true
                });
            });
        }
        
        // Cache API (service worker compatible)
        if ('caches' in window) {
            this.storageBackends.set('cacheAPI', {
                storage: caches,
                maxSize: 200 * 1024 * 1024, // 200MB
                priority: 5,
                persistent: true
            });
        }
    }

    async setupIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('IntelligentCache', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('cache')) {
                    const store = db.createObjectStore('cache', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('accessCount', 'accessCount');
                    store.createIndex('strategy', 'strategy');
                }
            };
        });
    }

    setupCacheStrategies() {
        // Cache First - serve from cache, fallback to network
        this.strategies.set('cache-first', {
            name: 'Cache First',
            get: async (key) => {
                const cached = await this.get(key);
                if (cached) return cached;
                return this.fetchAndCache(key);
            },
            priority: 1,
            useCase: 'Static assets, fonts, images'
        });
        
        // Network First - try network, fallback to cache
        this.strategies.set('network-first', {
            name: 'Network First',
            get: async (key) => {
                try {
                    return await this.fetchAndCache(key);
                } catch (error) {
                    return this.get(key);
                }
            },
            priority: 2,
            useCase: 'API data, dynamic content'
        });
        
        // Stale While Revalidate - serve cache, update in background
        this.strategies.set('stale-while-revalidate', {
            name: 'Stale While Revalidate',
            get: async (key) => {
                const cached = await this.get(key);
                
                // Update in background
                this.fetchAndCache(key).catch(() => {});
                
                return cached || this.fetchAndCache(key);
            },
            priority: 3,
            useCase: 'API responses, user data'
        });
        
        // Network Only - always fetch from network
        this.strategies.set('network-only', {
            name: 'Network Only',
            get: async (key) => this.fetchAndCache(key),
            priority: 4,
            useCase: 'Real-time data, authentication'
        });
        
        // Cache Only - only serve from cache
        this.strategies.set('cache-only', {
            name: 'Cache Only',
            get: async (key) => this.get(key),
            priority: 5,
            useCase: 'Offline mode, critical resources'
        });
    }

    initializeCompressionWorker() {
        if ('Worker' in window && this.settings.enableCompression) {
            try {
                this.compressionWorker = new Worker('/workers/compression.worker.js');
                this.setupCompressionHandlers();
            } catch (e) {
                console.warn('Compression worker not available:', e);
            }
        }
    }

    setupCompressionHandlers() {
        if (!this.compressionWorker) return;
        
        this.compressionWorker.onmessage = (event) => {
            const { type, data, id } = event.data;
            
            switch (type) {
                case 'COMPRESSION_COMPLETE':
                    this.handleCompressionResult(data, id);
                    break;
                case 'DECOMPRESSION_COMPLETE':
                    this.handleDecompressionResult(data, id);
                    break;
            }
        };
    }

    handleCompressionResult(data, id) {
        const { compressedData, originalSize, compressedSize } = data;
        this.stats.compressionSavings += originalSize - compressedSize;
        
        // Store compressed data
        this.storageBackends.get('memory').storage.set(id, {
            data: compressedData,
            compressed: true,
            originalSize,
            compressedSize
        });
    }

    handleDecompressionResult(data, id) {
        // Return decompressed data to caller
        const callback = this.decompressionCallbacks?.get(id);
        if (callback) {
            callback(data.decompressedData);
            this.decompressionCallbacks.delete(id);
        }
    }

    async set(key, value, options = {}) {
        const entry = {
            key,
            value,
            timestamp: Date.now(),
            ttl: options.ttl || this.settings.defaultTTL,
            strategy: options.strategy || 'cache-first',
            accessCount: 0,
            size: this.calculateSize(value),
            compressed: false,
            tags: options.tags || [],
            metadata: options.metadata || {}
        };
        
        // Apply compression if needed
        if (this.shouldCompress(entry)) {
            entry.value = await this.compress(entry.value);
            entry.compressed = true;
        }
        
        // Determine best storage backend
        const backend = this.selectStorageBackend(entry);
        
        try {
            await this.storeInBackend(backend, entry);
            this.updateAccessPattern(key, 'set');
            this.stats.sets++;
            this.stats.totalSize += entry.size;
            
            // Trigger cleanup if needed
            if (this.needsCleanup()) {
                this.scheduleCleanup();
            }
            
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    async get(key, options = {}) {
        const startTime = performance.now();
        
        // Try backends in priority order
        for (const [name, backend] of this.storageBackends) {
            try {
                const entry = await this.getFromBackend(name, key);
                
                if (entry) {
                    // Check TTL
                    if (this.isExpired(entry)) {
                        await this.delete(key);
                        continue;
                    }
                    
                    // Update access pattern
                    this.updateAccessPattern(key, 'get');
                    entry.accessCount++;
                    entry.lastAccess = Date.now();
                    
                    // Decompress if needed
                    let value = entry.value;
                    if (entry.compressed) {
                        value = await this.decompress(value);
                    }
                    
                    // Update backend with access info
                    await this.storeInBackend(name, entry);
                    
                    this.stats.hits++;
                    this.recordLatency('get', performance.now() - startTime);
                    
                    return value;
                }
            } catch (error) {
                console.warn(`Error getting from ${name}:`, error);
            }
        }
        
        this.stats.misses++;
        this.recordLatency('get', performance.now() - startTime);
        return null;
    }

    async delete(key) {
        let deleted = false;
        
        for (const [name] of this.storageBackends) {
            try {
                const success = await this.deleteFromBackend(name, key);
                if (success) deleted = true;
            } catch (error) {
                console.warn(`Error deleting from ${name}:`, error);
            }
        }
        
        if (deleted) {
            this.stats.deletes++;
            this.updateAccessPattern(key, 'delete');
        }
        
        return deleted;
    }

    async clear() {
        for (const [name] of this.storageBackends) {
            try {
                await this.clearBackend(name);
            } catch (error) {
                console.warn(`Error clearing ${name}:`, error);
            }
        }
        
        this.accessPatterns.clear();
        this.metrics.clear();
        this.resetStats();
    }

    async storeInBackend(backendName, entry) {
        const backend = this.storageBackends.get(backendName);
        if (!backend) throw new Error(`Backend ${backendName} not found`);
        
        switch (backendName) {
            case 'memory':
                backend.storage.set(entry.key, entry);
                break;
                
            case 'localStorage':
            case 'sessionStorage':
                backend.storage.setItem(entry.key, JSON.stringify(entry));
                break;
                
            case 'indexedDB':
                await this.storeInIndexedDB(backend.storage, entry);
                break;
                
            case 'cacheAPI':
                await this.storeInCacheAPI(backend.storage, entry);
                break;
        }
    }

    async getFromBackend(backendName, key) {
        const backend = this.storageBackends.get(backendName);
        if (!backend) return null;
        
        switch (backendName) {
            case 'memory':
                return backend.storage.get(key);
                
            case 'localStorage':
            case 'sessionStorage':
                const stored = backend.storage.getItem(key);
                return stored ? JSON.parse(stored) : null;
                
            case 'indexedDB':
                return this.getFromIndexedDB(backend.storage, key);
                
            case 'cacheAPI':
                return this.getFromCacheAPI(backend.storage, key);
                
            default:
                return null;
        }
    }

    async deleteFromBackend(backendName, key) {
        const backend = this.storageBackends.get(backendName);
        if (!backend) return false;
        
        try {
            switch (backendName) {
                case 'memory':
                    return backend.storage.delete(key);
                    
                case 'localStorage':
                case 'sessionStorage':
                    backend.storage.removeItem(key);
                    return true;
                    
                case 'indexedDB':
                    return this.deleteFromIndexedDB(backend.storage, key);
                    
                case 'cacheAPI':
                    return this.deleteFromCacheAPI(backend.storage, key);
                    
                default:
                    return false;
            }
        } catch (error) {
            return false;
        }
    }

    async storeInIndexedDB(db, entry) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.put(entry);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getFromIndexedDB(db, key) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFromIndexedDB(db, key) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async storeInCacheAPI(caches, entry) {
        const cache = await caches.open('intelligent-cache');
        const response = new Response(JSON.stringify(entry), {
            headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(entry.key, response);
    }

    async getFromCacheAPI(caches, key) {
        const cache = await caches.open('intelligent-cache');
        const response = await cache.match(key);
        
        if (response) {
            return await response.json();
        }
        return null;
    }

    async deleteFromCacheAPI(caches, key) {
        const cache = await caches.open('intelligent-cache');
        return await cache.delete(key);
    }

    selectStorageBackend(entry) {
        // Select backend based on entry characteristics
        if (entry.size > 1024 * 1024) { // > 1MB
            return 'indexedDB';
        }
        
        if (entry.strategy === 'cache-first' && entry.metadata.persistent) {
            return 'localStorage';
        }
        
        if (entry.ttl < 60 * 60 * 1000) { // < 1 hour
            return 'memory';
        }
        
        return 'sessionStorage';
    }

    shouldCompress(entry) {
        return this.settings.enableCompression && 
               entry.size > this.settings.compressionThreshold &&
               typeof entry.value === 'string';
    }

    async compress(data) {
        if (!this.compressionWorker) {
            // Fallback compression using built-in APIs
            return this.simpleCompress(data);
        }
        
        return new Promise((resolve) => {
            const id = Date.now() + Math.random();
            this.compressionCallbacks = this.compressionCallbacks || new Map();
            this.compressionCallbacks.set(id, resolve);
            
            this.compressionWorker.postMessage({
                type: 'COMPRESS',
                data: data,
                id: id
            });
        });
    }

    async decompress(compressedData) {
        if (!this.compressionWorker) {
            return this.simpleDecompress(compressedData);
        }
        
        return new Promise((resolve) => {
            const id = Date.now() + Math.random();
            this.decompressionCallbacks = this.decompressionCallbacks || new Map();
            this.decompressionCallbacks.set(id, resolve);
            
            this.compressionWorker.postMessage({
                type: 'DECOMPRESS',
                data: compressedData,
                id: id
            });
        });
    }

    simpleCompress(data) {
        // Simple compression using btoa (not very efficient)
        try {
            return btoa(data);
        } catch (e) {
            return data;
        }
    }

    simpleDecompress(compressedData) {
        try {
            return atob(compressedData);
        } catch (e) {
            return compressedData;
        }
    }

    calculateSize(value) {
        if (typeof value === 'string') {
            return new Blob([value]).size;
        }
        return JSON.stringify(value).length * 2; // Rough estimate
    }

    isExpired(entry) {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    updateAccessPattern(key, operation) {
        if (!this.accessPatterns.has(key)) {
            this.accessPatterns.set(key, {
                gets: 0,
                sets: 0,
                deletes: 0,
                lastAccess: Date.now(),
                frequency: 0
            });
        }
        
        const pattern = this.accessPatterns.get(key);
        pattern[operation + 's']++;
        pattern.lastAccess = Date.now();
        pattern.frequency = this.calculateFrequency(pattern);
        
        // Limit tracking to prevent memory issues
        if (this.accessPatterns.size > this.settings.accessTrackingLimit) {
            this.pruneAccessPatterns();
        }
    }

    calculateFrequency(pattern) {
        const totalAccess = pattern.gets + pattern.sets;
        const timeSinceFirst = Date.now() - pattern.lastAccess;
        
        return totalAccess / (timeSinceFirst / (1000 * 60 * 60)); // Accesses per hour
    }

    pruneAccessPatterns() {
        // Remove least recently used patterns
        const sorted = Array.from(this.accessPatterns.entries())
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        
        const toRemove = sorted.slice(0, Math.floor(this.accessPatterns.size * 0.1));
        toRemove.forEach(([key]) => {
            this.accessPatterns.delete(key);
        });
    }

    needsCleanup() {
        return this.stats.totalSize > this.settings.maxCacheSize ||
               Date.now() - this.stats.lastCleanup > this.settings.cleanupInterval;
    }

    scheduleCleanup() {
        if (this.cleanupTimeout) return;
        
        this.cleanupTimeout = setTimeout(() => {
            this.performCleanup();
            this.cleanupTimeout = null;
        }, 1000);
    }

    async performCleanup() {
        const startTime = performance.now();
        let evicted = 0;
        
        // Get all entries across backends
        const allEntries = await this.getAllEntries();
        
        // Sort by eviction priority (LRU + access frequency)
        const sorted = allEntries.sort((a, b) => {
            const scoreA = this.calculateEvictionScore(a);
            const scoreB = this.calculateEvictionScore(b);
            return scoreA - scoreB;
        });
        
        // Remove expired entries first
        for (const entry of sorted) {
            if (this.isExpired(entry)) {
                await this.delete(entry.key);
                evicted++;
            }
        }
        
        // Remove least valuable entries if still over limit
        while (this.stats.totalSize > this.settings.maxCacheSize && evicted < sorted.length) {
            const entry = sorted[evicted];
            await this.delete(entry.key);
            evicted++;
        }
        
        this.stats.evictions += evicted;
        this.stats.lastCleanup = Date.now();
        
        console.debug(`Cache cleanup completed in ${performance.now() - startTime}ms, evicted ${evicted} entries`);
    }

    calculateEvictionScore(entry) {
        const pattern = this.accessPatterns.get(entry.key);
        if (!pattern) return 0;
        
        const age = Date.now() - entry.timestamp;
        const recency = Date.now() - pattern.lastAccess;
        const frequency = pattern.frequency;
        const size = entry.size;
        
        // Lower score = higher eviction priority
        return (recency * age) / (frequency * Math.log(size + 1));
    }

    async getAllEntries() {
        const entries = [];
        
        for (const [name] of this.storageBackends) {
            try {
                const backendEntries = await this.getEntriesFromBackend(name);
                entries.push(...backendEntries);
            } catch (error) {
                console.warn(`Error getting entries from ${name}:`, error);
            }
        }
        
        return entries;
    }

    async getEntriesFromBackend(backendName) {
        const backend = this.storageBackends.get(backendName);
        if (!backend) return [];
        
        switch (backendName) {
            case 'memory':
                return Array.from(backend.storage.values());
                
            case 'localStorage':
            case 'sessionStorage':
                const entries = [];
                for (let i = 0; i < backend.storage.length; i++) {
                    const key = backend.storage.key(i);
                    try {
                        const entry = JSON.parse(backend.storage.getItem(key));
                        entries.push(entry);
                    } catch (e) {
                        // Skip invalid entries
                    }
                }
                return entries;
                
            case 'indexedDB':
                return this.getAllFromIndexedDB(backend.storage);
                
            default:
                return [];
        }
    }

    async getAllFromIndexedDB(db) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    startCleanupScheduler() {
        setInterval(() => {
            if (this.needsCleanup()) {
                this.performCleanup();
            }
        }, this.settings.cleanupInterval);
    }

    setupPerformanceMonitoring() {
        this.latencyMetrics = {
            get: [],
            set: [],
            delete: []
        };
        
        setInterval(() => {
            this.analyzePerformance();
        }, 60000); // Every minute
    }

    recordLatency(operation, latency) {
        const metrics = this.latencyMetrics[operation];
        if (metrics) {
            metrics.push(latency);
            
            // Keep only last 100 measurements
            if (metrics.length > 100) {
                metrics.shift();
            }
        }
    }

    analyzePerformance() {
        const analysis = {};
        
        Object.entries(this.latencyMetrics).forEach(([operation, latencies]) => {
            if (latencies.length > 0) {
                const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
                const max = Math.max(...latencies);
                const min = Math.min(...latencies);
                
                analysis[operation] = { avg, max, min, count: latencies.length };
            }
        });
        
        this.metrics.set('performance', analysis);
        
        // Auto-optimization based on performance
        if (this.settings.adaptiveOptimization) {
            this.optimizeSettings(analysis);
        }
    }

    optimizeSettings(performance) {
        // Adjust settings based on performance metrics
        if (performance.get && performance.get.avg > 100) { // > 100ms
            this.settings.compressionThreshold *= 1.5; // Reduce compression
        }
        
        if (performance.set && performance.set.avg > 200) { // > 200ms
            this.settings.maxCacheSize *= 0.9; // Reduce cache size
        }
    }

    loadPersistedData() {
        // Load configuration from localStorage
        try {
            const saved = localStorage.getItem('intelligentCacheConfig');
            if (saved) {
                const config = JSON.parse(saved);
                this.settings = { ...this.settings, ...config.settings };
                this.stats = { ...this.stats, ...config.stats };
            }
        } catch (e) {
            console.warn('Failed to load persisted cache config:', e);
        }
    }

    persistData() {
        try {
            const config = {
                settings: this.settings,
                stats: this.stats,
                timestamp: Date.now()
            };
            localStorage.setItem('intelligentCacheConfig', JSON.stringify(config));
        } catch (e) {
            console.warn('Failed to persist cache config:', e);
        }
    }

    clearBackend(backendName) {
        const backend = this.storageBackends.get(backendName);
        if (!backend) return;
        
        switch (backendName) {
            case 'memory':
                backend.storage.clear();
                break;
                
            case 'localStorage':
            case 'sessionStorage':
                backend.storage.clear();
                break;
                
            case 'indexedDB':
                // Clear IndexedDB store
                return this.clearIndexedDB(backend.storage);
                
            case 'cacheAPI':
                return this.clearCacheAPI(backend.storage);
        }
    }

    async clearIndexedDB(db) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearCacheAPI(caches) {
        const cache = await caches.open('intelligent-cache');
        const keys = await cache.keys();
        await Promise.all(keys.map(key => cache.delete(key)));
    }

    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            compressionSavings: 0,
            totalSize: 0,
            lastCleanup: Date.now()
        };
    }

    // Public API methods
    async fetchAndCache(key, fetchFn, options = {}) {
        try {
            const data = await fetchFn(key);
            await this.set(key, data, options);
            return data;
        } catch (error) {
            console.error('Fetch and cache error:', error);
            throw error;
        }
    }

    async getOrFetch(key, fetchFn, options = {}) {
        const cached = await this.get(key);
        if (cached) return cached;
        
        return this.fetchAndCache(key, fetchFn, options);
    }

    memoize(fn, keyGenerator, options = {}) {
        return async (...args) => {
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
            
            return this.getOrFetch(key, () => fn(...args), options);
        };
    }

    invalidatePattern(pattern) {
        // Invalidate all keys matching pattern
        const regex = new RegExp(pattern);
        const promises = [];
        
        this.accessPatterns.forEach((_, key) => {
            if (regex.test(key)) {
                promises.push(this.delete(key));
            }
        });
        
        return Promise.all(promises);
    }

    invalidateTags(tags) {
        // Invalidate all entries with matching tags
        const promises = [];
        
        this.getAllEntries().then(entries => {
            entries.forEach(entry => {
                if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
                    promises.push(this.delete(entry.key));
                }
            });
        });
        
        return Promise.all(promises);
    }

    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 ? 
            (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 : 0;
        
        return {
            ...this.stats,
            hitRate: Math.round(hitRate * 100) / 100,
            compressionRatio: this.stats.compressionSavings > 0 ? 
                (this.stats.compressionSavings / this.stats.totalSize) * 100 : 0,
            backends: Array.from(this.storageBackends.keys()),
            strategiesAvailable: Array.from(this.strategies.keys())
        };
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.persistData();
    }

    exportData() {
        return {
            stats: this.getStats(),
            settings: this.settings,
            accessPatterns: Array.from(this.accessPatterns.entries()).slice(0, 100),
            performanceMetrics: this.metrics.get('performance'),
            backends: Array.from(this.storageBackends.keys()),
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const intelligentCaching = new IntelligentCaching();

// Persist data on page unload
window.addEventListener('beforeunload', () => {
    intelligentCaching.persistData();
});

export default intelligentCaching;