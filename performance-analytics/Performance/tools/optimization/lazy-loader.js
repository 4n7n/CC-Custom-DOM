/**
 * Lazy Loader Module
 * Advanced lazy loading for images, videos, iframes, and dynamic content
 */

class LazyLoader {
    constructor() {
        this.observers = new Map();
        this.loadedElements = new Set();
        this.loadingElements = new Set();
        this.loadQueue = [];
        this.retryQueue = [];
        this.placeholders = new Map();
        
        this.settings = {
            rootMargin: '50px 0px',
            threshold: 0.01,
            enableNativeLazy: true,
            fallbackDelay: 100,
            maxRetries: 3,
            retryDelay: 1000,
            preloadDistance: 200, // pixels
            enableDataSaver: true,
            qualityAdaptation: true,
            enableWebP: true,
            enableAVIF: false,
            progressiveLoading: true
        };
        
        this.stats = {
            totalElements: 0,
            loadedElements: 0,
            failedElements: 0,
            totalLoadTime: 0,
            averageLoadTime: 0,
            bytesSaved: 0,
            nativeSupport: false
        };
        
        this.deviceInfo = {
            connection: null,
            pixelRatio: window.devicePixelRatio || 1,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            isLowEndDevice: this.detectLowEndDevice()
        };
        
        this.init();
    }

    init() {
        this.detectNativeSupport();
        this.detectConnectionInfo();
        this.setupIntersectionObserver();
        this.setupMutationObserver();
        this.processExistingElements();
        this.setupEventListeners();
        this.startProcessingQueue();
    }

    detectNativeSupport() {
        this.stats.nativeSupport = 'loading' in HTMLImageElement.prototype;
        
        if (this.stats.nativeSupport && this.settings.enableNativeLazy) {
            console.info('Using native lazy loading support');
        }
    }

    detectConnectionInfo() {
        if ('connection' in navigator) {
            this.deviceInfo.connection = navigator.connection;
            this.adaptToConnection();
        }
    }

    adaptToConnection() {
        const connection = this.deviceInfo.connection;
        if (!connection) return;
        
        // Adapt settings based on connection
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            this.settings.rootMargin = '10px 0px'; // Smaller preload distance
            this.settings.qualityAdaptation = true;
            this.settings.enableDataSaver = true;
        } else if (connection.effectiveType === '4g') {
            this.settings.rootMargin = '100px 0px'; // Larger preload distance
            this.settings.preloadDistance = 400;
        }
        
        if (connection.saveData) {
            this.enableDataSaverMode();
        }
    }

    enableDataSaverMode() {
        this.settings.enableDataSaver = true;
        this.settings.qualityAdaptation = true;
        this.settings.enableWebP = true;
        this.settings.rootMargin = '10px 0px';
        console.info('Data saver mode enabled');
    }

    detectLowEndDevice() {
        // Heuristics to detect low-end devices
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;
        const connection = navigator.connection?.effectiveType;
        
        return memory <= 2 || cores <= 2 || connection === 'slow-2g' || connection === '2g';
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.mainObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadElement(entry.target);
                        this.mainObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: this.settings.rootMargin,
                threshold: this.settings.threshold
            });
            
            // Separate observer for preloading
            this.preloadObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.preloadElement(entry.target);
                        this.preloadObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: `${this.settings.preloadDistance}px 0px`,
                threshold: 0
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            this.setupScrollFallback();
        }
    }

    setupScrollFallback() {
        let scrollTimer;
        
        const handleScroll = () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                this.checkElementsInViewport();
            }, this.settings.fallbackDelay);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        
        // Initial check
        this.checkElementsInViewport();
    }

    checkElementsInViewport() {
        const lazyElements = document.querySelectorAll('[data-lazy]:not([data-loaded])');
        
        lazyElements.forEach(element => {
            if (this.isInViewport(element)) {
                this.loadElement(element);
            }
        });
    }

    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        const margin = parseInt(this.settings.rootMargin);
        
        return (
            rect.top < window.innerHeight + margin &&
            rect.bottom > -margin &&
            rect.left < window.innerWidth + margin &&
            rect.right > -margin
        );
    }

    setupMutationObserver() {
        if ('MutationObserver' in window) {
            this.mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.processNewElement(node);
                        }
                    });
                });
            });
            
            this.mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    processExistingElements() {
        // Process images
        const lazyImages = document.querySelectorAll('img[data-src], img[data-lazy]');
        lazyImages.forEach(img => this.prepareImage(img));
        
        // Process videos
        const lazyVideos = document.querySelectorAll('video[data-src], video[data-lazy]');
        lazyVideos.forEach(video => this.prepareVideo(video));
        
        // Process iframes
        const lazyIframes = document.querySelectorAll('iframe[data-src], iframe[data-lazy]');
        lazyIframes.forEach(iframe => this.prepareIframe(iframe));
        
        // Process background images
        const lazyBackgrounds = document.querySelectorAll('[data-bg]');
        lazyBackgrounds.forEach(element => this.prepareBackgroundImage(element));
        
        // Process custom components
        const lazyComponents = document.querySelectorAll('[data-component]');
        lazyComponents.forEach(component => this.prepareComponent(component));
    }

    processNewElement(element) {
        // Check the element itself
        this.checkAndPrepareElement(element);
        
        // Check child elements
        element.querySelectorAll?.('img[data-src], video[data-src], iframe[data-src], [data-bg], [data-component]')
            .forEach(child => this.checkAndPrepareElement(child));
    }

    checkAndPrepareElement(element) {
        if (element.tagName === 'IMG' && (element.dataset.src || element.dataset.lazy)) {
            this.prepareImage(element);
        } else if (element.tagName === 'VIDEO' && (element.dataset.src || element.dataset.lazy)) {
            this.prepareVideo(element);
        } else if (element.tagName === 'IFRAME' && (element.dataset.src || element.dataset.lazy)) {
            this.prepareIframe(element);
        } else if (element.dataset.bg) {
            this.prepareBackgroundImage(element);
        } else if (element.dataset.component) {
            this.prepareComponent(element);
        }
    }

    prepareImage(img) {
        if (img.dataset.prepared === 'true') return;
        
        // Add placeholder
        this.addImagePlaceholder(img);
        
        // Use native lazy loading if supported and enabled
        if (this.stats.nativeSupport && this.settings.enableNativeLazy) {
            img.loading = 'lazy';
            img.src = img.dataset.src || img.src;
            img.dataset.prepared = 'true';
            return;
        }
        
        // Setup intersection observer
        if (this.mainObserver) {
            this.mainObserver.observe(img);
            if (this.preloadObserver) {
                this.preloadObserver.observe(img);
            }
        }
        
        img.dataset.prepared = 'true';
        this.stats.totalElements++;
    }

    prepareVideo(video) {
        if (video.dataset.prepared === 'true') return;
        
        // Add video placeholder
        this.addVideoPlaceholder(video);
        
        // Setup intersection observer
        if (this.mainObserver) {
            this.mainObserver.observe(video);
        }
        
        video.dataset.prepared = 'true';
        this.stats.totalElements++;
    }

    prepareIframe(iframe) {
        if (iframe.dataset.prepared === 'true') return;
        
        // Add iframe placeholder
        this.addIframePlaceholder(iframe);
        
        // Setup intersection observer
        if (this.mainObserver) {
            this.mainObserver.observe(iframe);
        }
        
        iframe.dataset.prepared = 'true';
        this.stats.totalElements++;
    }

    prepareBackgroundImage(element) {
        if (element.dataset.prepared === 'true') return;
        
        // Add background placeholder
        this.addBackgroundPlaceholder(element);
        
        // Setup intersection observer
        if (this.mainObserver) {
            this.mainObserver.observe(element);
        }
        
        element.dataset.prepared = 'true';
        this.stats.totalElements++;
    }

    prepareComponent(element) {
        if (element.dataset.prepared === 'true') return;
        
        // Add component placeholder
        this.addComponentPlaceholder(element);
        
        // Setup intersection observer
        if (this.mainObserver) {
            this.mainObserver.observe(element);
        }
        
        element.dataset.prepared = 'true';
        this.stats.totalElements++;
    }

    addImagePlaceholder(img) {
        if (img.src && !img.src.startsWith('data:')) return;
        
        const width = img.dataset.width || img.getAttribute('width') || 300;
        const height = img.dataset.height || img.getAttribute('height') || 200;
        
        // Create placeholder
        const placeholder = this.generateImagePlaceholder(width, height);
        img.src = placeholder;
        
        // Add loading class
        img.classList.add('lazy-loading');
        
        this.placeholders.set(img, placeholder);
    }

    addVideoPlaceholder(video) {
        // Create video poster placeholder
        if (!video.poster && video.dataset.poster) {
            const poster = this.generateVideoPoster(video);
            video.poster = poster;
        }
        
        video.classList.add('lazy-loading');
    }

    addIframePlaceholder(iframe) {
        // Create iframe placeholder
        const placeholder = this.generateIframePlaceholder(iframe);
        
        // Create placeholder element
        const placeholderDiv = document.createElement('div');
        placeholderDiv.className = 'iframe-placeholder lazy-loading';
        placeholderDiv.innerHTML = placeholder;
        
        iframe.style.display = 'none';
        iframe.parentNode?.insertBefore(placeholderDiv, iframe);
        
        this.placeholders.set(iframe, placeholderDiv);
    }

    addBackgroundPlaceholder(element) {
        // Add background placeholder class
        element.classList.add('bg-lazy-loading');
        
        // Set temporary background
        const placeholder = this.generateBackgroundPlaceholder();
        element.style.backgroundImage = `url(${placeholder})`;
    }

    addComponentPlaceholder(element) {
        // Add component loading state
        element.classList.add('component-lazy-loading');
        
        // Add loading spinner or skeleton
        const placeholder = this.generateComponentPlaceholder(element);
        element.innerHTML = placeholder;
    }

    generateImagePlaceholder(width, height) {
        // Generate SVG placeholder
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-family="Arial">
                Loading...
            </text>
        </svg>`;
        
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    generateVideoPoster(video) {
        const width = video.dataset.width || 640;
        const height = video.dataset.height || 360;
        
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#000"/>
            <circle cx="50%" cy="50%" r="30" fill="rgba(255,255,255,0.8)"/>
            <polygon points="45,35 45,65 70,50" fill="#000"/>
        </svg>`;
        
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    generateIframePlaceholder(iframe) {
        const type = iframe.dataset.type || 'content';
        
        const placeholders = {
            youtube: '📺 Loading YouTube video...',
            vimeo: '🎬 Loading Vimeo video...',
            map: '🗺️ Loading map...',
            content: '📄 Loading content...'
        };
        
        return `<div class="placeholder-content">
            <div class="placeholder-icon">${placeholders[type]}</div>
            <div class="placeholder-spinner"></div>
        </div>`;
    }

    generateBackgroundPlaceholder() {
        const svg = `<svg width="1" height="1" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f5f5f5"/>
        </svg>`;
        
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    generateComponentPlaceholder(element) {
        const type = element.dataset.component;
        
        return `<div class="component-skeleton" data-type="${type}">
            <div class="skeleton-header"></div>
            <div class="skeleton-content"></div>
            <div class="skeleton-footer"></div>
        </div>`;
    }

    async loadElement(element) {
        if (this.loadedElements.has(element) || this.loadingElements.has(element)) {
            return;
        }
        
        this.loadingElements.add(element);
        const startTime = performance.now();
        
        try {
            await this.performLoad(element);
            
            const loadTime = performance.now() - startTime;
            this.updateLoadStats(element, loadTime, true);
            
            this.loadedElements.add(element);
            this.loadingElements.delete(element);
            
            // Remove placeholders
            this.removePlaceholder(element);
            
            // Add loaded class
            element.classList.add('lazy-loaded');
            element.classList.remove('lazy-loading');
            element.dataset.loaded = 'true';
            
        } catch (error) {
            this.loadingElements.delete(element);
            this.handleLoadError(element, error);
        }
    }

    async performLoad(element) {
        const tagName = element.tagName.toLowerCase();
        
        switch (tagName) {
            case 'img':
                return this.loadImage(element);
            case 'video':
                return this.loadVideo(element);
            case 'iframe':
                return this.loadIframe(element);
            default:
                if (element.dataset.bg) {
                    return this.loadBackgroundImage(element);
                } else if (element.dataset.component) {
                    return this.loadComponent(element);
                }
        }
    }

    async loadImage(img) {
        return new Promise((resolve, reject) => {
            const newImg = new Image();
            
            // Get optimal source
            const src = this.getOptimalImageSource(img);
            
            newImg.onload = () => {
                // Progressive loading effect
                if (this.settings.progressiveLoading) {
                    this.applyProgressiveLoad(img, src);
                } else {
                    img.src = src;
                }
                
                // Update srcset if available
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                }
                
                resolve();
            };
            
            newImg.onerror = () => {
                reject(new Error(`Failed to load image: ${src}`));
            };
            
            newImg.src = src;
        });
    }

    getOptimalImageSource(img) {
        let src = img.dataset.src || img.src;
        
        // Apply quality adaptation
        if (this.settings.qualityAdaptation) {
            src = this.adaptImageQuality(src);
        }
        
        // Apply format optimization
        if (this.settings.enableWebP || this.settings.enableAVIF) {
            src = this.getOptimalFormat(src);
        }
        
        // Apply responsive sizing
        src = this.getResponsiveSize(src, img);
        
        return src;
    }

    adaptImageQuality(src) {
        const connection = this.deviceInfo.connection;
        
        if (this.settings.enableDataSaver || (connection && connection.saveData)) {
            // Reduce quality for data saving
            return src.replace(/\.(jpg|jpeg)/, '_low.$1');
        }
        
        return src;
    }

    getOptimalFormat(src) {
        // Check browser support and return optimal format
        if (this.settings.enableAVIF && this.supportsFormat('avif')) {
            return src.replace(/\.(jpg|jpeg|png)$/, '.avif');
        } else if (this.settings.enableWebP && this.supportsFormat('webp')) {
            return src.replace(/\.(jpg|jpeg|png)$/, '.webp');
        }
        
        return src;
    }

    supportsFormat(format) {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL(`image/${format}`).indexOf(`image/${format}`) === 5;
    }

    getResponsiveSize(src, img) {
        const containerWidth = img.parentElement?.offsetWidth || window.innerWidth;
        const pixelRatio = this.deviceInfo.pixelRatio;
        const targetWidth = Math.ceil(containerWidth * pixelRatio);
        
        // Apply size parameters if the src supports it
        if (src.includes('?')) {
            return `${src}&w=${targetWidth}`;
        } else {
            return `${src}?w=${targetWidth}`;
        }
    }

    applyProgressiveLoad(img, src) {
        // Create high-quality image
        const highQualityImg = new Image();
        
        highQualityImg.onload = () => {
            // Fade transition to high quality
            img.style.opacity = '0.5';
            img.style.filter = 'blur(2px)';
            
            setTimeout(() => {
                img.src = src;
                img.style.opacity = '1';
                img.style.filter = 'none';
                img.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
            }, 50);
        };
        
        highQualityImg.src = src;
    }

    async loadVideo(video) {
        return new Promise((resolve, reject) => {
            const src = video.dataset.src;
            
            if (src) {
                video.src = src;
            }
            
            // Load video sources
            const sources = video.querySelectorAll('source[data-src]');
            sources.forEach(source => {
                source.src = source.dataset.src;
                source.removeAttribute('data-src');
            });
            
            video.addEventListener('loadeddata', () => resolve(), { once: true });
            video.addEventListener('error', () => reject(new Error('Failed to load video')), { once: true });
            
            // Preload metadata only for performance
            video.preload = 'metadata';
            video.load();
        });
    }

    async loadIframe(iframe) {
        return new Promise((resolve, reject) => {
            const src = iframe.dataset.src;
            
            iframe.addEventListener('load', () => resolve(), { once: true });
            iframe.addEventListener('error', () => reject(new Error('Failed to load iframe')), { once: true });
            
            iframe.src = src;
        });
    }

    async loadBackgroundImage(element) {
        return new Promise((resolve, reject) => {
            const bgUrl = element.dataset.bg;
            const img = new Image();
            
            img.onload = () => {
                element.style.backgroundImage = `url(${bgUrl})`;
                element.classList.remove('bg-lazy-loading');
                resolve();
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load background image: ${bgUrl}`));
            };
            
            img.src = bgUrl;
        });
    }

    async loadComponent(element) {
        const componentName = element.dataset.component;
        const componentData = element.dataset.componentData;
        
        try {
            // Dynamic import of component
            const module = await import(`/components/${componentName}.js`);
            const Component = module.default || module[componentName];
            
            // Initialize component
            const data = componentData ? JSON.parse(componentData) : {};
            const instance = new Component(element, data);
            
            // Replace placeholder content
            element.classList.remove('component-lazy-loading');
            
            return instance;
        } catch (error) {
            throw new Error(`Failed to load component: ${componentName}`);
        }
    }

    preloadElement(element) {
        // Preload without displaying
        if (element.tagName === 'IMG') {
            this.preloadImage(element);
        }
    }

    preloadImage(img) {
        const src = img.dataset.src;
        if (src && !this.loadedElements.has(img)) {
            const preloadImg = new Image();
            preloadImg.src = this.getOptimalImageSource(img);
        }
    }

    removePlaceholder(element) {
        const placeholder = this.placeholders.get(element);
        if (placeholder) {
            if (placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }
            this.placeholders.delete(element);
        }
    }

    handleLoadError(element, error) {
        console.warn('Lazy load error:', error);
        
        // Add to retry queue
        if (!this.retryQueue.some(item => item.element === element)) {
            this.retryQueue.push({
                element,
                attempts: 1,
                lastAttempt: Date.now()
            });
        }
        
        // Add error class
        element.classList.add('lazy-error');
        
        this.stats.failedElements++;
    }

    startProcessingQueue() {
        // Process retry queue
        setInterval(() => {
            this.processRetryQueue();
        }, this.settings.retryDelay);
    }

    processRetryQueue() {
        const now = Date.now();
        
        this.retryQueue = this.retryQueue.filter(item => {
            if (item.attempts >= this.settings.maxRetries) {
                return false; // Remove from queue
            }
            
            if (now - item.lastAttempt >= this.settings.retryDelay) {
                item.attempts++;
                item.lastAttempt = now;
                
                // Retry loading
                this.loadElement(item.element).catch(() => {
                    // Will be retried again or removed
                });
            }
            
            return true; // Keep in queue
        });
    }

    updateLoadStats(element, loadTime, success) {
        if (success) {
            this.stats.loadedElements++;
            this.stats.totalLoadTime += loadTime;
            this.stats.averageLoadTime = this.stats.totalLoadTime / this.stats.loadedElements;
        } else {
            this.stats.failedElements++;
        }
    }

    setupEventListeners() {
        // Handle connection changes
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.detectConnectionInfo();
            });
        }
        
        // Handle viewport changes
        window.addEventListener('resize', () => {
            this.deviceInfo.viewportWidth = window.innerWidth;
            this.deviceInfo.viewportHeight = window.innerHeight;
        }, { passive: true });
    }

    // Public API methods
    load(selector) {
        const elements = typeof selector === 'string' ? 
            document.querySelectorAll(selector) : [selector];
        
        elements.forEach(element => {
            this.loadElement(element);
        });
    }

    observe(element) {
        if (this.mainObserver) {
            this.mainObserver.observe(element);
        }
    }

    unobserve(element) {
        if (this.mainObserver) {
            this.mainObserver.unobserve(element);
        }
    }

    forceLoad(selector) {
        const elements = typeof selector === 'string' ? 
            document.querySelectorAll(selector) : [selector];
        
        elements.forEach(element => {
            if (this.mainObserver) {
                this.mainObserver.unobserve(element);
            }
            this.loadElement(element);
        });
    }

    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalElements > 0 ? 
                (this.stats.loadedElements / this.stats.totalElements) * 100 : 100,
            elementsInQueue: this.loadQueue.length,
            elementsRetrying: this.retryQueue.length,
            deviceInfo: this.deviceInfo
        };
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Update observer settings if needed
        if (newSettings.rootMargin || newSettings.threshold) {
            this.setupIntersectionObserver();
        }
    }

    reset() {
        // Clear all observers
        if (this.mainObserver) {
            this.mainObserver.disconnect();
        }
        if (this.preloadObserver) {
            this.preloadObserver.disconnect();
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        // Clear data
        this.loadedElements.clear();
        this.loadingElements.clear();
        this.placeholders.clear();
        this.loadQueue = [];
        this.retryQueue = [];
        
        // Reset stats
        this.stats = {
            totalElements: 0,
            loadedElements: 0,
            failedElements: 0,
            totalLoadTime: 0,
            averageLoadTime: 0,
            bytesSaved: 0,
            nativeSupport: this.stats.nativeSupport
        };
    }

    exportData() {
        return {
            stats: this.getStats(),
            settings: this.settings,
            deviceInfo: this.deviceInfo,
            loadedCount: this.loadedElements.size,
            loadingCount: this.loadingElements.size,
            retryCount: this.retryQueue.length,
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const lazyLoader = new LazyLoader();

// Export for external use
export default lazyLoader;