/**
 * Asset Optimizer Module
 * Optimizes images, fonts, and other assets for better performance
 */

class AssetOptimizer {
    constructor() {
        this.optimizationQueue = new Map();
        this.optimizedAssets = new Map();
        this.compressionWorker = null;
        this.isProcessing = false;
        this.settings = {
            imageQuality: 0.8,
            maxImageWidth: 1920,
            maxImageHeight: 1080,
            enableWebP: true,
            enableAVIF: false,
            enableLazyLoading: true,
            fontSubsetting: true,
            compressCSS: true,
            compressJS: true
        };
        
        this.formats = {
            webp: 'image/webp',
            avif: 'image/avif',
            jpeg: 'image/jpeg',
            png: 'image/png'
        };
        
        this.init();
    }

    init() {
        this.setupFormatSupport();
        this.optimizeExistingAssets();
        this.setupAssetObserver();
        this.initializeCompressionWorker();
    }

    setupFormatSupport() {
        // Detect browser support for modern image formats
        this.support = {
            webp: this.supportsFormat('webp'),
            avif: this.supportsFormat('avif'),
            modernJS: 'noModule' in HTMLScriptElement.prototype,
            intersectionObserver: 'IntersectionObserver' in window
        };
    }

    supportsFormat(format) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        try {
            const dataUrl = canvas.toDataURL(`image/${format}`);
            return dataUrl.indexOf(`image/${format}`) === 5;
        } catch (e) {
            return false;
        }
    }

    optimizeExistingAssets() {
        // Optimize images already on the page
        this.optimizeImages();
        
        // Optimize fonts
        this.optimizeFonts();
        
        // Optimize CSS
        this.optimizeCSS();
        
        // Optimize JavaScript
        this.optimizeJavaScript();
    }

    optimizeImages() {
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            this.optimizeImage(img);
        });
        
        // Handle background images
        this.optimizeBackgroundImages();
    }

    optimizeImage(img) {
        if (img.dataset.optimized === 'true') return;
        
        const optimization = {
            element: img,
            originalSrc: img.src,
            type: 'image',
            status: 'pending'
        };
        
        // Check if image needs resizing
        const needsResize = this.imageNeedsResize(img);
        
        // Determine best format
        const bestFormat = this.getBestImageFormat(img.src);
        
        // Apply optimizations
        this.applyImageOptimizations(img, {
            resize: needsResize,
            format: bestFormat,
            quality: this.settings.imageQuality
        });
        
        // Add to optimized assets
        this.optimizedAssets.set(img.src, optimization);
        img.dataset.optimized = 'true';
    }

    imageNeedsResize(img) {
        const rect = img.getBoundingClientRect();
        const naturalWidth = img.naturalWidth || parseInt(img.dataset.width) || rect.width;
        const naturalHeight = img.naturalHeight || parseInt(img.dataset.height) || rect.height;
        
        return naturalWidth > this.settings.maxImageWidth || 
               naturalHeight > this.settings.maxImageHeight ||
               (naturalWidth > rect.width * 2) || 
               (naturalHeight > rect.height * 2);
    }

    getBestImageFormat(src) {
        if (this.settings.enableAVIF && this.support.avif) {
            return 'avif';
        } else if (this.settings.enableWebP && this.support.webp) {
            return 'webp';
        }
        
        const ext = src.split('.').pop()?.toLowerCase();
        return ext === 'png' ? 'png' : 'jpeg';
    }

    applyImageOptimizations(img, options) {
        if (options.format !== this.getImageFormat(img.src)) {
            this.createResponsivePicture(img, options);
        }
        
        if (this.settings.enableLazyLoading && this.support.intersectionObserver) {
            this.addLazyLoading(img);
        }
        
        this.addResponsiveAttributes(img);
    }

    createResponsivePicture(img, options) {
        const picture = document.createElement('picture');
        
        if (options.format === 'webp' || options.format === 'avif') {
            const modernSource = document.createElement('source');
            modernSource.srcset = this.convertImageFormat(img.src, options.format);
            modernSource.type = this.formats[options.format];
            picture.appendChild(modernSource);
        }
        
        const fallbackSource = document.createElement('source');
        fallbackSource.srcset = img.src;
        fallbackSource.type = this.formats[this.getImageFormat(img.src)];
        picture.appendChild(fallbackSource);
        
        const newImg = img.cloneNode(true);
        picture.appendChild(newImg);
        
        img.parentNode?.replaceChild(picture, img);
    }

    convertImageFormat(src, format) {
        const baseSrc = src.replace(/\.[^.]+$/, '');
        return `${baseSrc}.${format}`;
    }

    getImageFormat(src) {
        const ext = src.split('.').pop()?.toLowerCase();
        return ext === 'png' ? 'png' : 'jpeg';
    }

    addLazyLoading(img) {
        img.loading = 'lazy';
        
        if (!('loading' in HTMLImageElement.prototype)) {
            this.setupIntersectionObserver(img);
        }
    }

    setupIntersectionObserver(img) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px 0px'
        });
        
        observer.observe(img);
    }

    loadImage(img) {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        }
    }

    addResponsiveAttributes(img) {
        if (!img.hasAttribute('sizes')) {
            img.sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
        }
        
        if (!img.hasAttribute('srcset') && img.src) {
            const srcset = this.generateSrcSet(img.src);
            if (srcset) {
                img.srcset = srcset;
            }
        }
    }

    generateSrcSet(src) {
        const baseSrc = src.replace(/\.[^.]+$/, '');
        const ext = src.split('.').pop();
        
        return [
            `${baseSrc}.${ext} 1x`,
            `${baseSrc}@2x.${ext} 2x`,
            `${baseSrc}@3x.${ext} 3x`
        ].join(', ');
    }

    optimizeBackgroundImages() {
        const elementsWithBg = document.querySelectorAll('[style*="background-image"]');
        
        elementsWithBg.forEach(element => {
            const bgImage = this.extractBackgroundImage(element);
            if (bgImage) {
                this.optimizeBackgroundImage(element, bgImage);
            }
        });
    }

    extractBackgroundImage(element) {
        const style = getComputedStyle(element);
        const bgImage = style.backgroundImage;
        
        if (bgImage && bgImage !== 'none') {
            const match = bgImage.match(/url\((['"]?)(.*?)\1\)/);
            return match ? match[2] : null;
        }
        
        return null;
    }

    optimizeBackgroundImage(element, src) {
        const bestFormat = this.getBestImageFormat(src);
        
        if (bestFormat !== this.getImageFormat(src)) {
            const optimizedSrc = this.convertImageFormat(src, bestFormat);
            element.style.backgroundImage = `url(${optimizedSrc})`;
        }
    }

    optimizeFonts() {
        const fontLinks = document.querySelectorAll('link[rel="stylesheet"][href*="fonts"]');
        
        fontLinks.forEach(link => {
            this.optimizeFontLink(link);
        });
        
        this.optimizeFontFaces();
    }

    optimizeFontLink(link) {
        if (!link.href.includes('display=swap')) {
            const url = new URL(link.href);
            url.searchParams.set('display', 'swap');
            link.href = url.toString();
        }
        
        this.preconnectToFontOrigin(link.href);
    }

    preconnectToFontOrigin(href) {
        try {
            const url = new URL(href);
            const origin = url.origin;
            
            if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
                const preconnect = document.createElement('link');
                preconnect.rel = 'preconnect';
                preconnect.href = origin;
                preconnect.crossOrigin = 'anonymous';
                document.head.appendChild(preconnect);
            }
        } catch (e) {
            console.warn('Invalid font URL:', href);
        }
    }

    optimizeFontFaces() {
        const styleSheets = Array.from(document.styleSheets);
        
        styleSheets.forEach(sheet => {
            try {
                this.processFontFaceRules(sheet);
            } catch (e) {
                console.warn('Cannot access stylesheet:', sheet.href);
            }
        });
    }

    processFontFaceRules(sheet) {
        if (!sheet.cssRules) return;
        
        Array.from(sheet.cssRules).forEach(rule => {
            if (rule.type === CSSRule.FONT_FACE_RULE) {
                this.optimizeFontFaceRule(rule);
            }
        });
    }

    optimizeFontFaceRule(rule) {
        if (!rule.style.fontDisplay) {
            rule.style.fontDisplay = 'swap';
        }
    }

    optimizeCSS() {
        // Remove unused CSS rules
        this.removeUnusedCSS();
        
        // Minify inline styles
        this.minifyInlineStyles();
        
        // Optimize CSS delivery
        this.optimizeCSSDelivery();
    }

    removeUnusedCSS() {
        if (!this.settings.compressCSS) return;
        
        const usedSelectors = new Set();
        this.collectUsedSelectors(usedSelectors);
        this.removeUnusedRules(usedSelectors);
    }

    collectUsedSelectors(usedSelectors) {
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            if (element.id) {
                usedSelectors.add(`#${element.id}`);
            }
            
            element.classList.forEach(className => {
                usedSelectors.add(`.${className}`);
            });
            
            usedSelectors.add(element.tagName.toLowerCase());
        });
    }

    removeUnusedRules(usedSelectors) {
        const styleSheets = Array.from(document.styleSheets);
        
        styleSheets.forEach(sheet => {
            if (this.canAccessStylesheet(sheet)) {
                this.processStylesheetRules(sheet, usedSelectors);
            }
        });
    }

    canAccessStylesheet(sheet) {
        try {
            return sheet.cssRules && sheet.href && 
                   new URL(sheet.href).origin === window.location.origin;
        } catch (e) {
            return false;
        }
    }

    processStylesheetRules(sheet, usedSelectors) {
        const rulesToRemove = [];
        
        Array.from(sheet.cssRules).forEach((rule, index) => {
            if (rule.type === CSSRule.STYLE_RULE) {
                const isUsed = this.isSelectorUsed(rule.selectorText, usedSelectors);
                if (!isUsed) {
                    rulesToRemove.push(index);
                }
            }
        });
        
        // Remove rules in reverse order to maintain indices
        rulesToRemove.reverse().forEach(index => {
            try {
                sheet.deleteRule(index);
            } catch (e) {
                console.warn('Failed to remove CSS rule:', e);
            }
        });
    }

    isSelectorUsed(selectorText, usedSelectors) {
        if (!selectorText) return true;
        
        // Simple heuristic - check if any part of the selector matches used selectors
        const selectors = selectorText.split(',').map(s => s.trim());
        
        return selectors.some(selector => {
            const parts = selector.split(/[\s>+~]/).map(s => s.trim()).filter(Boolean);
            return parts.some(part => {
                const cleanPart = part.replace(/[:\[\]()]/g, '');
                return usedSelectors.has(cleanPart);
            });
        });
    }

    minifyInlineStyles() {
        const elementsWithStyle = document.querySelectorAll('[style]');
        
        elementsWithStyle.forEach(element => {
            const style = element.getAttribute('style');
            if (style) {
                const minified = this.minifyCSS(style);
                element.setAttribute('style', minified);
            }
        });
    }

    minifyCSS(css) {
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/;\s*}/g, '}') // Remove last semicolon
            .replace(/\s*([{}:;,>+~])\s*/g, '$1') // Remove spaces around symbols
            .trim();
    }

    optimizeCSSDelivery() {
        const criticalCSS = this.extractCriticalCSS();
        if (criticalCSS) {
            this.inlineCriticalCSS(criticalCSS);
            this.loadNonCriticalCSS();
        }
    }

    extractCriticalCSS() {
        // Simple approach - extract styles for above-the-fold content
        const viewportHeight = window.innerHeight;
        const aboveFoldElements = [];
        
        document.querySelectorAll('*').forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.top < viewportHeight && rect.bottom > 0) {
                aboveFoldElements.push(element);
            }
        });
        
        return this.getStylesForElements(aboveFoldElements);
    }

    getStylesForElements(elements) {
        const criticalStyles = new Set();
        
        elements.forEach(element => {
            const computedStyle = getComputedStyle(element);
            const criticalProperties = [
                'display', 'position', 'top', 'left', 'right', 'bottom',
                'width', 'height', 'margin', 'padding', 'border',
                'background', 'color', 'font-size', 'font-family'
            ];
            
            criticalProperties.forEach(prop => {
                const value = computedStyle.getPropertyValue(prop);
                if (value && value !== 'initial' && value !== 'inherit') {
                    criticalStyles.add(`${prop}: ${value}`);
                }
            });
        });
        
        return Array.from(criticalStyles).join('; ');
    }

    inlineCriticalCSS(css) {
        const style = document.createElement('style');
        style.textContent = css;
        style.dataset.critical = 'true';
        document.head.insertBefore(style, document.head.firstChild);
    }

    loadNonCriticalCSS() {
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
        
        stylesheets.forEach(link => {
            if (!link.media || link.media === 'all') {
                link.media = 'print';
                link.onload = () => {
                    link.media = 'all';
                };
            }
        });
    }

    optimizeJavaScript() {
        if (!this.settings.compressJS) return;
        
        this.deferNonCriticalJS();
        this.optimizeScriptLoading();
        this.removeUnusedJS();
    }

    deferNonCriticalJS() {
        const scripts = document.querySelectorAll('script[src]:not([data-critical])');
        
        scripts.forEach(script => {
            if (!script.hasAttribute('defer') && !script.hasAttribute('async')) {
                script.defer = true;
            }
        });
    }

    optimizeScriptLoading() {
        const scripts = document.querySelectorAll('script[src]');
        
        scripts.forEach(script => {
            // Add preload hints for critical scripts
            if (script.dataset.critical === 'true') {
                this.preloadScript(script.src);
            }
            
            // Add resource hints for third-party scripts
            if (this.isThirdPartyScript(script.src)) {
                this.addResourceHints(script.src);
            }
        });
    }

    preloadScript(src) {
        if (!document.querySelector(`link[href="${src}"][rel="preload"]`)) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'script';
            link.href = src;
            document.head.appendChild(link);
        }
    }

    isThirdPartyScript(src) {
        try {
            const url = new URL(src, window.location.href);
            return url.origin !== window.location.origin;
        } catch (e) {
            return false;
        }
    }

    addResourceHints(src) {
        try {
            const url = new URL(src);
            const origin = url.origin;
            
            // Add preconnect
            if (!document.querySelector(`link[href="${origin}"][rel="preconnect"]`)) {
                const preconnect = document.createElement('link');
                preconnect.rel = 'preconnect';
                preconnect.href = origin;
                document.head.appendChild(preconnect);
            }
            
            // Add dns-prefetch as fallback
            if (!document.querySelector(`link[href="${origin}"][rel="dns-prefetch"]`)) {
                const dnsPrefetch = document.createElement('link');
                dnsPrefetch.rel = 'dns-prefetch';
                dnsPrefetch.href = origin;
                document.head.appendChild(dnsPrefetch);
            }
        } catch (e) {
            console.warn('Invalid script URL:', src);
        }
    }

    removeUnusedJS() {
        // This would require static analysis - simplified implementation
        const unusedScripts = this.detectUnusedScripts();
        unusedScripts.forEach(script => {
            console.warn('Potentially unused script:', script.src);
        });
    }

    detectUnusedScripts() {
        // Basic heuristic - mark scripts as potentially unused if they don't add event listeners
        // or modify the DOM within a reasonable time
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.filter(script => {
            return !script.dataset.verified && 
                   !script.src.includes('analytics') && 
                   !script.src.includes('tracking');
        });
    }

    setupAssetObserver() {
        // Monitor for new assets added to the DOM
        if ('MutationObserver' in window) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.processNewElement(node);
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    processNewElement(element) {
        // Optimize newly added images
        if (element.tagName === 'IMG') {
            this.optimizeImage(element);
        }
        
        // Optimize images within the new element
        const images = element.querySelectorAll('img');
        images.forEach(img => this.optimizeImage(img));
        
        // Optimize other assets
        if (element.tagName === 'LINK' && element.rel === 'stylesheet') {
            this.optimizeFontLink(element);
        }
        
        if (element.tagName === 'SCRIPT' && element.src) {
            this.optimizeScriptLoading();
        }
    }

    initializeCompressionWorker() {
        if ('Worker' in window) {
            try {
                this.compressionWorker = new Worker(this.createWorkerScript());
                this.compressionWorker.onmessage = (e) => {
                    this.handleWorkerMessage(e.data);
                };
            } catch (e) {
                console.warn('Failed to initialize compression worker:', e);
            }
        }
    }

    createWorkerScript() {
        const workerScript = `
            self.onmessage = function(e) {
                const { type, data } = e.data;
                
                switch (type) {
                    case 'compress-image':
                        // Image compression logic would go here
                        self.postMessage({
                            type: 'image-compressed',
                            originalSize: data.size,
                            compressedSize: data.size * 0.7, // Simulated compression
                            url: data.url
                        });
                        break;
                        
                    case 'analyze-bundle':
                        // Bundle analysis logic would go here
                        self.postMessage({
                            type: 'bundle-analyzed',
                            size: data.size,
                            suggestions: ['Remove unused dependencies', 'Enable tree shaking']
                        });
                        break;
                }
            };
        `;
        
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }

    handleWorkerMessage(data) {
        switch (data.type) {
            case 'image-compressed':
                this.updateOptimizationStats(data);
                break;
                
            case 'bundle-analyzed':
                this.handleBundleAnalysis(data);
                break;
        }
    }

    updateOptimizationStats(data) {
        const savings = data.originalSize - data.compressedSize;
        console.log(`Image optimization saved ${savings} bytes for ${data.url}`);
    }

    handleBundleAnalysis(data) {
        console.log('Bundle analysis:', data);
    }

    // Public API
    getOptimizationReport() {
        return {
            optimizedAssets: this.optimizedAssets.size,
            totalSavings: this.calculateTotalSavings(),
            suggestions: this.generateOptimizationSuggestions(),
            support: this.support,
            settings: this.settings
        };
    }

    calculateTotalSavings() {
        // This would calculate actual savings from optimizations
        return {
            images: 0,
            css: 0,
            javascript: 0,
            fonts: 0
        };
    }

    generateOptimizationSuggestions() {
        const suggestions = [];
        
        if (!this.support.webp) {
            suggestions.push('Browser does not support WebP format');
        }
        
        if (!this.support.intersectionObserver) {
            suggestions.push('Browser does not support Intersection Observer for lazy loading');
        }
        
        return suggestions;
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Reoptimize with new settings
        this.optimizeExistingAssets();
    }

    reset() {
        this.optimizedAssets.clear();
        this.optimizationQueue.clear();
        
        // Remove optimization markers
        document.querySelectorAll('[data-optimized]').forEach(element => {
            element.removeAttribute('data-optimized');
        });
        
        // Reinitialize
        this.init();
    }
}

// Export for use
export default AssetOptimizer;