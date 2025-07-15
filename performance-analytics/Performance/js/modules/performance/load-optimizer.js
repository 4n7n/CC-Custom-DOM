/**
 * Load Optimizer Module
 * Optimizes resource loading, implements lazy loading, and improves page performance
 */

class LoadOptimizer {
    constructor() {
        this.loadQueue = new Map();
        this.criticalResources = new Set();
        this.deferredResources = new Set();
        this.preloadedResources = new Set();
        this.lazyElements = new Set();
        this.intersectionObserver = null;
        this.mutationObserver = null;
        this.loadStrategies = new Map();
        this.performanceMetrics = {
            resourcesLoaded: 0,
            totalLoadTime: 0,
            averageLoadTime: 0,
            criticalPathComplete: false,
            lazyElementsLoaded: 0
        };
        
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupMutationObserver();
        this.optimizeCriticalPath();
        this.setupResourceHints();
        this.implementLazyLoading();
        this.optimizeWebFonts();
        this.setupServiceWorkerOptimizations();
        this.monitorLoadPerformance();
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyElement(entry.target);
                        this.intersectionObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });
        }
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

    optimizeCriticalPath() {
        // Identify and prioritize critical resources
        this.identifyCriticalResources();
        this.preloadCriticalResources();
        this.deferNonCriticalResources();
    }

    identifyCriticalResources() {
        // Critical CSS
        const criticalCSS = document.querySelectorAll('link[rel="stylesheet"]:not([media="print"])');
        criticalCSS.forEach(link => {
            if (this.isCriticalCSS(link)) {
                this.criticalResources.add(link.href);
            }
        });

        // Critical JavaScript
        const criticalJS = document.querySelectorAll('script[src]:not([defer]):not([async])');
        criticalJS.forEach(script => {
            if (this.isCriticalJS(script)) {
                this.criticalResources.add(script.src);
            }
        });

        // Critical images (above the fold)
        const aboveFoldImages = this.getAboveFoldImages();
        aboveFoldImages.forEach(img => {
            this.criticalResources.add(img.src);
        });
    }

    isCriticalCSS(link) {
        // Check if CSS affects above-the-fold content
        const href = link.href;
        const criticalPatterns = [
            /main\.css$/,
            /global\.css$/,
            /critical\.css$/,
            /layout\.css$/,
            /bootstrap\.css$/
        ];
        
        return criticalPatterns.some(pattern => pattern.test(href));
    }

    isCriticalJS(script) {
        // Check if JavaScript is critical for initial render
        const src = script.src;
        const criticalPatterns = [
            /polyfills?\.js$/,
            /vendor\.js$/,
            /runtime\.js$/,
            /main\.js$/
        ];
        
        return criticalPatterns.some(pattern => pattern.test(src));
    }

    getAboveFoldImages() {
        const images = document.querySelectorAll('img');
        const viewportHeight = window.innerHeight;
        const aboveFold = [];

        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.top < viewportHeight) {
                aboveFold.push(img);
            }
        });

        return aboveFold;
    }

    preloadCriticalResources() {
        this.criticalResources.forEach(resourceUrl => {
            this.preloadResource(resourceUrl, this.getResourceType(resourceUrl));
        });
    }

    preloadResource(url, type, priority = 'high') {
        if (this.preloadedResources.has(url)) return;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        link.as = type;
        
        if (priority) {
            link.setAttribute('importance', priority);
        }

        // Add crossorigin for fonts and some assets
        if (type === 'font' || this.isCrossOrigin(url)) {
            link.crossOrigin = 'anonymous';
        }

        document.head.appendChild(link);
        this.preloadedResources.add(url);

        // Track preload success/failure
        link.onload = () => {
            this.trackResourceLoad(url, 'preloaded', true);
        };
        
        link.onerror = () => {
            this.trackResourceLoad(url, 'preloaded', false);
        };
    }

    deferNonCriticalResources() {
        // Defer non-critical CSS
        const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"]');
        nonCriticalCSS.forEach(link => {
            if (!this.criticalResources.has(link.href)) {
                this.deferCSS(link);
            }
        });

        // Defer non-critical JavaScript
        const nonCriticalJS = document.querySelectorAll('script[src]:not([async]):not([defer])');
        nonCriticalJS.forEach(script => {
            if (!this.criticalResources.has(script.src)) {
                this.deferJS(script);
            }
        });
    }

    deferCSS(link) {
        // Convert blocking CSS to non-blocking
        link.media = 'print';
        link.onload = function() {
            this.media = 'all';
        };
        this.deferredResources.add(link.href);
    }

    deferJS(script) {
        // Add defer attribute to non-critical scripts
        script.defer = true;
        this.deferredResources.add(script.src);
    }

    setupResourceHints() {
        // DNS prefetch for external domains
        this.setupDNSPrefetch();
        
        // Preconnect to critical third-party origins
        this.setupPreconnect();
        
        // Prefetch resources likely to be needed
        this.setupPrefetch();
    }

    setupDNSPrefetch() {
        const externalDomains = this.getExternalDomains();
        externalDomains.forEach(domain => {
            this.addResourceHint('dns-prefetch', domain);
        });
    }

    setupPreconnect() {
        const criticalOrigins = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://cdnjs.cloudflare.com'
        ];
        
        criticalOrigins.forEach(origin => {
            this.addResourceHint('preconnect', origin, true);
        });
    }

    setupPrefetch() {
        // Prefetch next likely pages based on user behavior
        const likelyNextPages = this.predictNextPages();
        likelyNextPages.forEach(page => {
            this.addResourceHint('prefetch', page);
        });
    }

    addResourceHint(rel, href, crossorigin = false) {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        
        if (crossorigin) {
            link.crossOrigin = 'anonymous';
        }
        
        document.head.appendChild(link);
    }

    implementLazyLoading() {
        // Lazy load images
        this.setupLazyImages();
        
        // Lazy load iframes
        this.setupLazyIframes();
        
        // Lazy load background images
        this.setupLazyBackgrounds();
        
        // Lazy load components
        this.setupLazyComponents();
    }

    setupLazyImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            this.prepareLazyImage(img);
        });
    }

    prepareLazyImage(img) {
        // Add placeholder if not present
        if (!img.src) {
            img.src = this.generatePlaceholder(img.dataset.width, img.dataset.height);
        }
        
        // Add loading=lazy for modern browsers
        img.loading = 'lazy';
        
        // Use intersection observer for older browsers
        if (this.intersectionObserver) {
            this.intersectionObserver.observe(img);
            this.lazyElements.add(img);
        }
    }

    setupLazyIframes() {
        const iframes = document.querySelectorAll('iframe[data-src]');
        iframes.forEach(iframe => {
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(iframe);
                this.lazyElements.add(iframe);
            }
        });
    }

    setupLazyBackgrounds() {
        const bgElements = document.querySelectorAll('[data-bg]');
        bgElements.forEach(element => {
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(element);
                this.lazyElements.add(element);
            }
        });
    }

    setupLazyComponents() {
        const lazyComponents = document.querySelectorAll('[data-lazy-component]');
        lazyComponents.forEach(component => {
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(component);
                this.lazyElements.add(component);
            }
        });
    }

    loadLazyElement(element) {
        const startTime = performance.now();
        
        if (element.tagName === 'IMG' && element.dataset.src) {
            this.loadLazyImage(element);
        } else if (element.tagName === 'IFRAME' && element.dataset.src) {
            this.loadLazyIframe(element);
        } else if (element.dataset.bg) {
            this.loadLazyBackground(element);
        } else if (element.dataset.lazyComponent) {
            this.loadLazyComponent(element);
        }
        
        // Track lazy loading performance
        const loadTime = performance.now() - startTime;
        this.trackLazyLoad(element, loadTime);
    }

    loadLazyImage(img) {
        const actualSrc = img.dataset.src;
        const newImg = new Image();
        
        newImg.onload = () => {
            img.src = actualSrc;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
        };
        
        newImg.onerror = () => {
            img.classList.add('error');
        };
        
        newImg.src = actualSrc;
    }

    loadLazyIframe(iframe) {
        iframe.src = iframe.dataset.src;
        iframe.removeAttribute('data-src');
        iframe.classList.add('loaded');
    }

    loadLazyBackground(element) {
        const bgUrl = element.dataset.bg;
        const img = new Image();
        
        img.onload = () => {
            element.style.backgroundImage = `url(${bgUrl})`;
            element.classList.add('loaded');
            element.removeAttribute('data-bg');
        };
        
        img.src = bgUrl;
    }

    loadLazyComponent(element) {
        const componentName = element.dataset.lazyComponent;
        
        // Dynamic import of component
        import(`/components/${componentName}.js`)
            .then(module => {
                const component = new module.default();
                component.render(element);
                element.classList.add('loaded');
                element.removeAttribute('data-lazy-component');
            })
            .catch(error => {
                console.warn(`Failed to load component ${componentName}:`, error);
                element.classList.add('error');
            });
    }

    optimizeWebFonts() {
        // Preload critical fonts
        this.preloadCriticalFonts();
        
        // Implement font-display strategies
        this.implementFontDisplay();
        
        // Setup font loading events
        this.setupFontLoadingEvents();
    }

    preloadCriticalFonts() {
        const criticalFonts = [
            '/fonts/inter-var.woff2',
            '/fonts/inter-regular.woff2'
        ];
        
        criticalFonts.forEach(fontUrl => {
            this.preloadResource(fontUrl, 'font');
        });
    }

    implementFontDisplay() {
        // Add font-display: swap to improve loading performance
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: 'Inter';
                font-display: swap;
                src: url('/fonts/inter-var.woff2') format('woff2');
            }
        `;
        document.head.appendChild(style);
    }

    setupFontLoadingEvents() {
        if ('fonts' in document) {
            document.fonts.ready.then(() => {
                this.trackResourceLoad('fonts', 'loaded', true);
                document.body.classList.add('fonts-loaded');
            });
        }
    }

    setupServiceWorkerOptimizations() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    this.setupCacheStrategies(registration);
                })
                .catch(error => {
                    console.warn('Service Worker registration failed:', error);
                });
        }
    }

    setupCacheStrategies(registration) {
        // Define caching strategies for different resource types
        this.loadStrategies.set('images', 'cache-first');
        this.loadStrategies.set('styles', 'stale-while-revalidate');
        this.loadStrategies.set('scripts', 'stale-while-revalidate');
        this.loadStrategies.set('fonts', 'cache-first');
        this.loadStrategies.set('api', 'network-first');
    }

    processNewElement(element) {
        // Handle dynamically added elements
        if (element.tagName === 'IMG' && element.dataset.src) {
            this.prepareLazyImage(element);
        } else if (element.tagName === 'IFRAME' && element.dataset.src) {
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(element);
                this.lazyElements.add(element);
            }
        }
        
        // Process child elements
        element.querySelectorAll?.('img[data-src], iframe[data-src], [data-bg], [data-lazy-component]')
            .forEach(child => this.processNewElement(child));
    }

    monitorLoadPerformance() {
        // Monitor resource loading performance
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    this.analyzeResourcePerformance(entry);
                });
            });
            
            observer.observe({ entryTypes: ['resource'] });
        }
        
        // Monitor critical path completion
        this.monitorCriticalPath();
    }

    analyzeResourcePerformance(entry) {
        const duration = entry.responseEnd - entry.startTime;
        this.performanceMetrics.resourcesLoaded++;
        this.performanceMetrics.totalLoadTime += duration;
        this.performanceMetrics.averageLoadTime = 
            this.performanceMetrics.totalLoadTime / this.performanceMetrics.resourcesLoaded;
        
        // Track slow resources
        if (duration > 1000) {
            this.trackSlowResource(entry);
        }
    }

    monitorCriticalPath() {
        const checkCriticalPath = () => {
            const criticalLoaded = Array.from(this.criticalResources).every(resource => {
                return this.isResourceLoaded(resource);
            });
            
            if (criticalLoaded && !this.performanceMetrics.criticalPathComplete) {
                this.performanceMetrics.criticalPathComplete = true;
                this.onCriticalPathComplete();
            }
        };
        
        // Check periodically
        const interval = setInterval(() => {
            checkCriticalPath();
            if (this.performanceMetrics.criticalPathComplete) {
                clearInterval(interval);
            }
        }, 100);
    }

    onCriticalPathComplete() {
        // Critical path is complete, can start loading deferred resources
        document.body.classList.add('critical-loaded');
        
        // Start loading deferred resources
        this.loadDeferredResources();
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('criticalPathComplete'));
    }

    loadDeferredResources() {
        this.deferredResources.forEach(resourceUrl => {
            this.loadResource(resourceUrl);
        });
    }

    loadResource(url) {
        const type = this.getResourceType(url);
        
        if (type === 'stylesheet') {
            this.loadStylesheet(url);
        } else if (type === 'script') {
            this.loadScript(url);
        }
    }

    loadStylesheet(url) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
    }

    loadScript(url) {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        document.head.appendChild(script);
    }

    // Utility methods
    getResourceType(url) {
        const ext = url.split('.').pop()?.toLowerCase();
        const typeMap = {
            'css': 'stylesheet',
            'js': 'script',
            'woff': 'font',
            'woff2': 'font',
            'ttf': 'font',
            'otf': 'font',
            'png': 'image',
            'jpg': 'image',
            'jpeg': 'image',
            'gif': 'image',
            'webp': 'image',
            'svg': 'image'
        };
        return typeMap[ext] || 'fetch';
    }

    isCrossOrigin(url) {
        try {
            const urlObj = new URL(url, window.location.href);
            return urlObj.origin !== window.location.origin;
        } catch {
            return false;
        }
    }

    getExternalDomains() {
        const links = document.querySelectorAll('a[href], link[href], script[src], img[src]');
        const domains = new Set();
        
        links.forEach(element => {
            const url = element.href || element.src;
            if (this.isCrossOrigin(url)) {
                try {
                    const domain = new URL(url).hostname;
                    domains.add(domain);
                } catch {}
            }
        });
        
        return Array.from(domains);
    }

    predictNextPages() {
        // Simple prediction based on navigation patterns
        const links = document.querySelectorAll('a[href]');
        const predictions = [];
        
        links.forEach(link => {
            const href = link.href;
            if (href.startsWith(window.location.origin) && 
                link.getBoundingClientRect().top < window.innerHeight * 2) {
                predictions.push(href);
            }
        });
        
        return predictions.slice(0, 3); // Limit to top 3 predictions
    }

    generatePlaceholder(width = 300, height = 200) {
        // Generate a simple placeholder image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ccc';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', width / 2, height / 2);
        
        return canvas.toDataURL();
    }

    isResourceLoaded(url) {
        // Check if resource is loaded by looking at performance entries
        const entries = performance.getEntriesByName(url);
        return entries.length > 0 && entries[0].responseEnd > 0;
    }

    trackResourceLoad(url, type, success) {
        console.debug(`Resource ${type}: ${url} - ${success ? 'Success' : 'Failed'}`);
    }

    trackLazyLoad(element, loadTime) {
        this.performanceMetrics.lazyElementsLoaded++;
        console.debug(`Lazy loaded ${element.tagName} in ${loadTime.toFixed(2)}ms`);
    }

    trackSlowResource(entry) {
        console.warn(`Slow resource detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
    }

    // Public API
    preload(url, type, priority) {
        this.preloadResource(url, type, priority);
    }

    prefetch(url) {
        this.addResourceHint('prefetch', url);
    }

    lazyLoad(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(element);
                this.lazyElements.add(element);
            }
        });
    }

    getMetrics() {
        return {
            ...this.performanceMetrics,
            criticalResources: this.criticalResources.size,
            deferredResources: this.deferredResources.size,
            preloadedResources: this.preloadedResources.size,
            lazyElements: this.lazyElements.size
        };
    }

    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
    }
}

// Auto-initialize
const loadOptimizer = new LoadOptimizer();
export default loadOptimizer;