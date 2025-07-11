/**
 * Image Optimizer Module
 * Advanced image optimization with format conversion, compression, and responsive sizing
 */

class ImageOptimizer {
    constructor() {
        this.optimizedImages = new Map();
        this.compressionWorker = null;
        this.formatSupport = new Map();
        this.optimizationQueue = [];
        this.isProcessing = false;
        
        this.settings = {
            quality: 0.85,
            enableWebP: true,
            enableAVIF: false,
            enableProgressive: true,
            maxWidth: 1920,
            maxHeight: 1080,
            enableResponsive: true,
            enableLazyLoading: true,
            compressionLevel: 'high',
            preserveMetadata: false,
            enablePlaceholder: true,
            placeholderQuality: 0.3,
            batchSize: 5,
            cacheOptimizedImages: true
        };
        
        this.formats = {
            webp: { mime: 'image/webp', extension: '.webp', quality: 0.85 },
            avif: { mime: 'image/avif', extension: '.avif', quality: 0.8 },
            jpeg: { mime: 'image/jpeg', extension: '.jpg', quality: 0.85 },
            png: { mime: 'image/png', extension: '.png', quality: 1.0 }
        };
        
        this.stats = {
            totalImages: 0,
            optimizedImages: 0,
            totalOriginalSize: 0,
            totalOptimizedSize: 0,
            totalSavings: 0,
            averageCompression: 0,
            formatConversions: {
                webp: 0,
                avif: 0,
                jpeg: 0,
                png: 0
            }
        };
        
        this.init();
    }

    init() {
        this.detectFormatSupport();
        this.setupCompressionWorker();
        this.processExistingImages();
        this.setupImageObserver();
        this.setupPerformanceMonitoring();
    }

    detectFormatSupport() {
        // Test WebP support
        const webpCanvas = document.createElement('canvas');
        webpCanvas.width = 1;
        webpCanvas.height = 1;
        this.formatSupport.set('webp', webpCanvas.toDataURL('image/webp').indexOf('image/webp') === 5);
        
        // Test AVIF support (simplified detection)
        this.formatSupport.set('avif', 'avif' in new Image());
        
        // Always support JPEG and PNG
        this.formatSupport.set('jpeg', true);
        this.formatSupport.set('png', true);
        
        console.debug('Format support:', Object.fromEntries(this.formatSupport));
    }

    setupCompressionWorker() {
        if ('Worker' in window) {
            try {
                this.compressionWorker = new Worker('/workers/image-compression.worker.js');
                this.setupWorkerHandlers();
            } catch (e) {
                console.warn('Image compression worker not available:', e);
            }
        }
    }

    setupWorkerHandlers() {
        if (!this.compressionWorker) return;
        
        this.compressionWorker.onmessage = (event) => {
            const { type, data, id } = event.data;
            
            switch (type) {
                case 'COMPRESSION_COMPLETE':
                    this.handleCompressionResult(data, id);
                    break;
                case 'COMPRESSION_ERROR':
                    this.handleCompressionError(data, id);
                    break;
                case 'BATCH_COMPLETE':
                    this.handleBatchComplete(data, id);
                    break;
            }
        };
    }

    handleCompressionResult(data, id) {
        const callback = this.compressionCallbacks?.get(id);
        if (callback) {
            callback(null, data);
            this.compressionCallbacks.delete(id);
        }
        
        this.updateStats(data);
    }

    handleCompressionError(error, id) {
        const callback = this.compressionCallbacks?.get(id);
        if (callback) {
            callback(error, null);
            this.compressionCallbacks.delete(id);
        }
    }

    handleBatchComplete(results, id) {
        const callback = this.batchCallbacks?.get(id);
        if (callback) {
            callback(results);
            this.batchCallbacks.delete(id);
        }
    }

    processExistingImages() {
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            if (!img.dataset.optimized) {
                this.queueImageOptimization(img);
            }
        });
        
        this.processBatch();
    }

    setupImageObserver() {
        if ('MutationObserver' in window) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'IMG') {
                                this.queueImageOptimization(node);
                            } else {
                                // Check for images in added subtree
                                const images = node.querySelectorAll?.('img');
                                images?.forEach(img => this.queueImageOptimization(img));
                            }
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

    setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (this.isImageResource(entry.name)) {
                        this.trackImagePerformance(entry);
                    }
                });
            });
            
            try {
                observer.observe({ entryTypes: ['resource'] });
            } catch (e) {
                console.warn('Performance observer not supported:', e);
            }
        }
    }

    queueImageOptimization(img) {
        if (img.dataset.optimized || !img.src) return;
        
        this.optimizationQueue.push({
            element: img,
            src: img.src,
            originalSrc: img.src,
            timestamp: Date.now()
        });
        
        if (!this.isProcessing && this.optimizationQueue.length >= this.settings.batchSize) {
            this.processBatch();
        }
    }

    async processBatch() {
        if (this.isProcessing || this.optimizationQueue.length === 0) return;
        
        this.isProcessing = true;
        const batch = this.optimizationQueue.splice(0, this.settings.batchSize);
        
        try {
            await Promise.all(batch.map(item => this.optimizeImage(item)));
        } catch (error) {
            console.error('Batch processing error:', error);
        } finally {
            this.isProcessing = false;
            
            // Process next batch if queue has items
            if (this.optimizationQueue.length > 0) {
                setTimeout(() => this.processBatch(), 100);
            }
        }
    }

    async optimizeImage(imageItem) {
        const { element, src } = imageItem;
        
        try {
            // Skip if already optimized or invalid
            if (element.dataset.optimized || !this.isOptimizable(src)) {
                return;
            }
            
            const optimization = await this.performOptimization(src, element);
            
            if (optimization.success) {
                this.applyOptimization(element, optimization);
                this.optimizedImages.set(src, optimization);
                element.dataset.optimized = 'true';
                this.stats.optimizedImages++;
            }
            
        } catch (error) {
            console.warn(`Failed to optimize image ${src}:`, error);
        }
    }

    async performOptimization(src, element) {
        try {
            // Load original image
            const originalImage = await this.loadImage(src);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate optimal dimensions
            const dimensions = this.calculateOptimalDimensions(
                originalImage.naturalWidth,
                originalImage.naturalHeight,
                element
            );
            
            canvas.width = dimensions.width;
            canvas.height = dimensions.height;
            
            // Draw and compress
            ctx.drawImage(originalImage, 0, 0, dimensions.width, dimensions.height);
            
            // Get optimal format
            const optimalFormat = this.getOptimalFormat(src);
            const quality = this.getOptimalQuality(optimalFormat);
            
            // Convert to optimal format
            const optimizedDataUrl = canvas.toDataURL(this.formats[optimalFormat].mime, quality);
            const optimizedBlob = await this.dataURLToBlob(optimizedDataUrl);
            
            // Generate responsive images if enabled
            const responsiveImages = this.settings.enableResponsive ? 
                await this.generateResponsiveImages(canvas, optimalFormat) : [];
            
            // Generate placeholder if enabled
            const placeholder = this.settings.enablePlaceholder ? 
                await this.generatePlaceholder(canvas) : null;
            
            const originalSize = await this.estimateImageSize(src);
            const optimizedSize = optimizedBlob.size;
            
            return {
                success: true,
                originalSrc: src,
                optimizedSrc: optimizedDataUrl,
                format: optimalFormat,
                originalSize: originalSize,
                optimizedSize: optimizedSize,
                savings: originalSize - optimizedSize,
                compressionRatio: ((originalSize - optimizedSize) / originalSize) * 100,
                dimensions: dimensions,
                responsiveImages: responsiveImages,
                placeholder: placeholder,
                blob: optimizedBlob
            };
            
        } catch (error) {
            return {
                success: false,
                originalSrc: src,
                error: error.message
            };
        }
    }

    async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    calculateOptimalDimensions(naturalWidth, naturalHeight, element) {
        // Get display size
        const rect = element.getBoundingClientRect();
        const displayWidth = rect.width || naturalWidth;
        const displayHeight = rect.height || naturalHeight;
        
        // Account for device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        let targetWidth = Math.round(displayWidth * dpr);
        let targetHeight = Math.round(displayHeight * dpr);
        
        // Respect max dimensions
        if (targetWidth > this.settings.maxWidth) {
            targetWidth = this.settings.maxWidth;
            targetHeight = Math.round((targetWidth / naturalWidth) * naturalHeight);
        }
        
        if (targetHeight > this.settings.maxHeight) {
            targetHeight = this.settings.maxHeight;
            targetWidth = Math.round((targetHeight / naturalHeight) * naturalWidth);
        }
        
        // Don't upscale
        targetWidth = Math.min(targetWidth, naturalWidth);
        targetHeight = Math.min(targetHeight, naturalHeight);
        
        return {
            width: targetWidth,
            height: targetHeight,
            aspectRatio: naturalWidth / naturalHeight
        };
    }

    getOptimalFormat(src) {
        const extension = this.getFileExtension(src);
        
        // Prefer modern formats if supported
        if (this.settings.enableAVIF && this.formatSupport.get('avif')) {
            return 'avif';
        }
        
        if (this.settings.enableWebP && this.formatSupport.get('webp')) {
            return 'webp';
        }
        
        // Fallback to original format or JPEG
        if (extension === 'png' && this.hasTransparency(src)) {
            return 'png';
        }
        
        return 'jpeg';
    }

    getOptimalQuality(format) {
        const baseQuality = this.settings.quality;
        
        switch (format) {
            case 'avif':
                return Math.max(0.7, baseQuality - 0.1); // AVIF is more efficient
            case 'webp':
                return baseQuality;
            case 'jpeg':
                return baseQuality;
            case 'png':
                return 1.0; // PNG is lossless
            default:
                return baseQuality;
        }
    }

    async generateResponsiveImages(canvas, format) {
        const responsiveImages = [];
        const breakpoints = [480, 768, 1024, 1440];
        
        for (const breakpoint of breakpoints) {
            if (breakpoint < canvas.width) {
                const ratio = breakpoint / canvas.width;
                const responsiveCanvas = document.createElement('canvas');
                const responsiveCtx = responsiveCanvas.getContext('2d');
                
                responsiveCanvas.width = breakpoint;
                responsiveCanvas.height = Math.round(canvas.height * ratio);
                
                responsiveCtx.drawImage(canvas, 0, 0, responsiveCanvas.width, responsiveCanvas.height);
                
                const quality = this.getOptimalQuality(format);
                const dataUrl = responsiveCanvas.toDataURL(this.formats[format].mime, quality);
                
                responsiveImages.push({
                    width: breakpoint,
                    src: dataUrl,
                    media: `(max-width: ${breakpoint}px)`
                });
            }
        }
        
        return responsiveImages;
    }

    async generatePlaceholder(canvas) {
        const placeholderCanvas = document.createElement('canvas');
        const placeholderCtx = placeholderCanvas.getContext('2d');
        
        // Very small placeholder (blur effect)
        const scale = 0.1;
        placeholderCanvas.width = Math.max(1, Math.round(canvas.width * scale));
        placeholderCanvas.height = Math.max(1, Math.round(canvas.height * scale));
        
        placeholderCtx.drawImage(canvas, 0, 0, placeholderCanvas.width, placeholderCanvas.height);
        
        return placeholderCanvas.toDataURL('image/jpeg', this.settings.placeholderQuality);
    }

    applyOptimization(element, optimization) {
        // Create picture element for responsive images
        if (optimization.responsiveImages && optimization.responsiveImages.length > 0) {
            this.createResponsivePicture(element, optimization);
        } else {
            // Simple replacement
            element.src = optimization.optimizedSrc;
        }
        
        // Add placeholder if available
        if (optimization.placeholder && this.settings.enableLazyLoading) {
            element.dataset.placeholder = optimization.placeholder;
            this.implementLazyLoading(element, optimization);
        }
        
        // Add optimization metadata
        element.dataset.optimizedFormat = optimization.format;
        element.dataset.originalSize = optimization.originalSize;
        element.dataset.optimizedSize = optimization.optimizedSize;
        element.dataset.savings = optimization.savings;
    }

    createResponsivePicture(img, optimization) {
        const picture = document.createElement('picture');
        
        // Add responsive sources
        optimization.responsiveImages.forEach(responsive => {
            const source = document.createElement('source');
            source.srcset = responsive.src;
            source.media = responsive.media;
            source.type = this.formats[optimization.format].mime;
            picture.appendChild(source);
        });
        
        // Add fallback
        const fallbackSource = document.createElement('source');
        fallbackSource.srcset = optimization.optimizedSrc;
        fallbackSource.type = this.formats[optimization.format].mime;
        picture.appendChild(fallbackSource);
        
        // Clone and append img
        const newImg = img.cloneNode(true);
        newImg.src = optimization.optimizedSrc;
        picture.appendChild(newImg);
        
        // Replace in DOM
        img.parentNode?.replaceChild(picture, img);
    }

    implementLazyLoading(element, optimization) {
        // Set placeholder as initial src
        const originalSrc = element.src;
        element.src = optimization.placeholder;
        element.dataset.lazySrc = originalSrc;
        
        // Setup intersection observer
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyImage(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px'
            });
            
            observer.observe(element);
        } else {
            // Fallback: load immediately
            this.loadLazyImage(element);
        }
    }

    loadLazyImage(img) {
        if (img.dataset.lazySrc) {
            // Smooth transition
            img.style.filter = 'blur(5px)';
            
            const newImg = new Image();
            newImg.onload = () => {
                img.src = img.dataset.lazySrc;
                img.style.filter = 'none';
                img.style.transition = 'filter 0.3s ease';
                delete img.dataset.lazySrc;
            };
            newImg.src = img.dataset.lazySrc;
        }
    }

    // Utility methods
    isOptimizable(src) {
        if (!src || src.startsWith('data:')) return false;
        
        const extension = this.getFileExtension(src);
        return ['jpg', 'jpeg', 'png', 'webp'].includes(extension.toLowerCase());
    }

    getFileExtension(src) {
        return src.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
    }

    hasTransparency(src) {
        // Simple heuristic - PNG files might have transparency
        return this.getFileExtension(src) === 'png';
    }

    isImageResource(url) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
        return imageExtensions.some(ext => url.toLowerCase().includes(ext));
    }

    async dataURLToBlob(dataURL) {
        return new Promise(resolve => {
            const arr = dataURL.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            
            resolve(new Blob([u8arr], { type: mime }));
        });
    }

    async estimateImageSize(src) {
        try {
            const response = await fetch(src, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            return contentLength ? parseInt(contentLength) : 0;
        } catch {
            return 0;
        }
    }

    trackImagePerformance(entry) {
        const imagePerf = {
            url: entry.name,
            loadTime: entry.duration,
            size: entry.transferSize || entry.decodedBodySize,
            cached: entry.transferSize === 0,
            timestamp: Date.now()
        };
        
        // Log slow loading images
        if (imagePerf.loadTime > 1000) {
            console.warn('Slow image detected:', imagePerf);
        }
    }

    updateStats(optimizationResult) {
        if (optimizationResult.success) {
            this.stats.totalOriginalSize += optimizationResult.originalSize;
            this.stats.totalOptimizedSize += optimizationResult.optimizedSize;
            this.stats.totalSavings += optimizationResult.savings;
            this.stats.formatConversions[optimizationResult.format]++;
            
            this.stats.averageCompression = 
                (this.stats.totalSavings / this.stats.totalOriginalSize) * 100;
        }
        
        this.stats.totalImages++;
    }

    // Public API methods
    async optimizeImageBlob(blob, options = {}) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = async () => {
                const maxWidth = options.maxWidth || this.settings.maxWidth;
                const maxHeight = options.maxHeight || this.settings.maxHeight;
                
                let { width, height } = this.calculateDimensions(
                    img.naturalWidth, 
                    img.naturalHeight, 
                    maxWidth, 
                    maxHeight
                );
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const format = options.format || this.getOptimalFormat('image.jpg');
                const quality = options.quality || this.getOptimalQuality(format);
                
                canvas.toBlob(resolve, this.formats[format].mime, quality);
            };
            img.src = URL.createObjectURL(blob);
        });
    }

    calculateDimensions(naturalWidth, naturalHeight, maxWidth, maxHeight) {
        let width = naturalWidth;
        let height = naturalHeight;
        
        const aspectRatio = naturalWidth / naturalHeight;
        
        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }

    async convertFormat(src, targetFormat) {
        const img = await this.loadImage(src);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        
        const quality = this.getOptimalQuality(targetFormat);
        return canvas.toDataURL(this.formats[targetFormat].mime, quality);
    }

    getOptimizationReport() {
        return {
            stats: this.stats,
            settings: this.settings,
            formatSupport: Object.fromEntries(this.formatSupport),
            optimizedImages: this.optimizedImages.size,
            totalSavings: `${(this.stats.totalSavings / 1024).toFixed(2)} KB`,
            averageCompression: `${this.stats.averageCompression.toFixed(2)}%`,
            recommendations: this.generateRecommendations()
        };
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.stats.averageCompression < 30) {
            recommendations.push({
                type: 'compression',
                priority: 'medium',
                message: 'Low compression ratio detected',
                suggestion: 'Consider using more aggressive compression settings'
            });
        }
        
        if (!this.formatSupport.get('webp') && this.settings.enableWebP) {
            recommendations.push({
                type: 'format-support',
                priority: 'low',
                message: 'WebP not supported in this browser',
                suggestion: 'Provide JPEG/PNG fallbacks for better compatibility'
            });
        }
        
        const largeImages = Array.from(this.optimizedImages.values())
            .filter(opt => opt.originalSize > 1024 * 1024); // > 1MB
        
        if (largeImages.length > 0) {
            recommendations.push({
                type: 'image-size',
                priority: 'high',
                message: `${largeImages.length} large images detected`,
                suggestion: 'Consider using responsive images or further compression'
            });
        }
        
        return recommendations;
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    clearCache() {
        this.optimizedImages.clear();
    }

    getStats() {
        return {
            ...this.stats,
            optimizationRatio: this.stats.totalImages > 0 ? 
                (this.stats.optimizedImages / this.stats.totalImages) * 100 : 0,
            totalSavingsKB: (this.stats.totalSavings / 1024).toFixed(2),
            averageCompression: this.stats.averageCompression.toFixed(2)
        };
    }

    exportData() {
        return {
            stats: this.getStats(),
            settings: this.settings,
            formatSupport: Object.fromEntries(this.formatSupport),
            optimizedImages: Array.from(this.optimizedImages.entries()),
            report: this.getOptimizationReport(),
            timestamp: Date.now()
        };
    }
}

// Auto-initialize
const imageOptimizer = new ImageOptimizer();
export default imageOptimizer;