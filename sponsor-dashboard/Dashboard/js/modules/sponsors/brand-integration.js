/**
 * Brand Integration Module
 * Gestiona la integración de branding de patrocinadores en el dashboard
 */

class BrandIntegration {
    constructor(config = {}) {
        this.config = {
            allowCustomColors: true,
            allowCustomLogos: true,
            enableAnimations: true,
            cacheLogos: true,
            validateAssets: true,
            ...config
        };
        
        this.brandSettings = new Map();
        this.logoCache = new Map();
        this.colorPalettes = new Map();
        this.customThemes = new Map();
        this.brandingHistory = new Map();
        this.listeners = new Set();
        
        this.defaultBrandColors = {
            platinum: '#9333ea',
            gold: '#f59e0b',
            silver: '#64748b',
            bronze: '#dc2626',
            supporter: '#6b7280'
        };
        
        this.brandingOptions = {
            logoPlacement: ['header', 'cards', 'footer', 'sidebar'],
            colorElements: ['accent', 'background', 'border', 'text'],
            customizations: ['theme', 'typography', 'spacing', 'animations']
        };
    }

    /**
     * Inicializa el módulo de integración de marca
     */
    async initialize() {
        try {
            console.log('🎨 Inicializando Brand Integration...');
            
            // Cargar configuraciones de marca existentes
            await this.loadBrandSettings();
            
            // Inicializar cache de logos
            this.initializeLogoCache();
            
            // Configurar observadores de cambios
            this.setupBrandObservers();
            
            // Cargar paletas de colores predefinidas
            this.loadColorPalettes();
            
            console.log('✅ Brand Integration inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Brand Integration:', error);
            throw error;
        }
    }

    /**
     * Aplica branding personalizado a un patrocinador
     */
    async applyBranding(sponsorId, brandingData) {
        try {
            // Validar datos de branding
            this.validateBrandingData(brandingData);
            
            // Obtener configuración actual
            const currentBranding = this.brandSettings.get(sponsorId) || {};
            
            // Crear nueva configuración
            const newBranding = {
                ...currentBranding,
                ...brandingData,
                lastUpdated: new Date(),
                version: (currentBranding.version || 0) + 1
            };
            
            // Guardar configuración
            this.brandSettings.set(sponsorId, newBranding);
            
            // Aplicar cambios al DOM
            await this.applyBrandingToDOM(sponsorId, newBranding);
            
            // Registrar en historial
            this.recordBrandingChange(sponsorId, brandingData);
            
            // Notificar cambios
            this.notifyListeners('branding:applied', { 
                sponsorId, 
                branding: newBranding 
            });
            
            return newBranding;
            
        } catch (error) {
            console.error('Error aplicando branding:', error);
            throw error;
        }
    }

    /**
     * Establece el logo de un patrocinador
     */
    async setSponsorLogo(sponsorId, logoData) {
        try {
            // Validar logo
            if (this.config.validateAssets) {
                await this.validateLogo(logoData);
            }
            
            // Procesar logo
            const processedLogo = await this.processLogo(logoData);
            
            // Guardar en cache
            if (this.config.cacheLogos) {
                this.logoCache.set(sponsorId, processedLogo);
            }
            
            // Aplicar al branding del patrocinador
            const currentBranding = this.brandSettings.get(sponsorId) || {};
            currentBranding.logo = processedLogo;
            this.brandSettings.set(sponsorId, currentBranding);
            
            // Actualizar DOM
            this.updateLogoInDOM(sponsorId, processedLogo);
            
            // Notificar cambios
            this.notifyListeners('branding:logo_updated', { 
                sponsorId, 
                logo: processedLogo 
            });
            
            return processedLogo;
            
        } catch (error) {
            console.error('Error estableciendo logo:', error);
            throw error;
        }
    }

    /**
     * Establece colores personalizados para un patrocinador
     */
    setSponsorColors(sponsorId, colorScheme) {
        try {
            // Validar esquema de colores
            this.validateColorScheme(colorScheme);
            
            // Obtener branding actual
            const branding = this.brandSettings.get(sponsorId) || {};
            
            // Aplicar colores
            branding.colors = {
                ...branding.colors,
                ...colorScheme,
                appliedAt: new Date()
            };
            
            this.brandSettings.set(sponsorId, branding);
            
            // Aplicar colores al DOM
            this.applyColorsToDOM(sponsorId, colorScheme);
            
            // Notificar cambios
            this.notifyListeners('branding:colors_updated', { 
                sponsorId, 
                colors: colorScheme 
            });
            
            return branding.colors;
            
        } catch (error) {
            console.error('Error estableciendo colores:', error);
            throw error;
        }
    }

    /**
     * Crea un tema personalizado para un patrocinador
     */
    createCustomTheme(sponsorId, themeData) {
        try {
            const theme = {
                id: this.generateThemeId(sponsorId),
                name: themeData.name || `Tema ${sponsorId}`,
                sponsorId,
                colors: themeData.colors || {},
                typography: themeData.typography || {},
                spacing: themeData.spacing || {},
                animations: themeData.animations || {},
                createdAt: new Date()
            };
            
            // Validar tema
            this.validateTheme(theme);
            
            // Guardar tema
            this.customThemes.set(theme.id, theme);
            
            // Aplicar tema
            this.applyCustomTheme(sponsorId, theme);
            
            // Notificar cambios
            this.notifyListeners('branding:theme_created', { 
                sponsorId, 
                theme 
            });
            
            return theme;
            
        } catch (error) {
            console.error('Error creando tema personalizado:', error);
            throw error;
        }
    }

    /**
     * Obtiene el branding de un patrocinador
     */
    getSponsorBranding(sponsorId) {
        const branding = this.brandSettings.get(sponsorId);
        if (!branding) {
            return this.getDefaultBranding(sponsorId);
        }
        return { ...branding };
    }

    /**
     * Obtiene branding por defecto basado en tier
     */
    getDefaultBranding(sponsorId) {
        // En un entorno real, obtendríamos el tier del patrocinador
        const tier = this.getSponsorTier(sponsorId) || 'supporter';
        
        return {
            colors: {
                primary: this.defaultBrandColors[tier],
                secondary: '#f3f4f6',
                accent: this.defaultBrandColors[tier],
                background: '#ffffff',
                text: '#1f2937'
            },
            logo: null,
            typography: {
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: '400'
            },
            tier,
            isDefault: true
        };
    }

    /**
     * Remueve branding personalizado
     */
    removeBranding(sponsorId) {
        try {
            const branding = this.brandSettings.get(sponsorId);
            if (!branding) return false;
            
            // Remover de configuraciones
            this.brandSettings.delete(sponsorId);
            
            // Remover del cache
            this.logoCache.delete(sponsorId);
            
            // Restaurar branding por defecto
            this.applyDefaultBranding(sponsorId);
            
            // Registrar cambio
            this.recordBrandingChange(sponsorId, { action: 'removed' });
            
            // Notificar cambios
            this.notifyListeners('branding:removed', { sponsorId });
            
            return true;
            
        } catch (error) {
            console.error('Error removiendo branding:', error);
            throw error;
        }
    }

    /**
     * Aplica branding al DOM
     */
    async applyBrandingToDOM(sponsorId, branding) {
        const sponsorElements = document.querySelectorAll(`[data-sponsor-id="${sponsorId}"]`);
        
        sponsorElements.forEach(element => {
            // Aplicar colores
            if (branding.colors) {
                this.applyColorsToElement(element, branding.colors);
            }
            
            // Aplicar logo
            if (branding.logo) {
                this.applyLogoToElement(element, branding.logo);
            }
            
            // Aplicar tipografía
            if (branding.typography) {
                this.applyTypographyToElement(element, branding.typography);
            }
            
            // Aplicar animaciones
            if (branding.animations && this.config.enableAnimations) {
                this.applyAnimationsToElement(element, branding.animations);
            }
        });
    }

    /**
     * Aplica colores a un elemento
     */
    applyColorsToElement(element, colors) {
        if (colors.primary) {
            element.style.setProperty('--sponsor-primary', colors.primary);
        }
        
        if (colors.secondary) {
            element.style.setProperty('--sponsor-secondary', colors.secondary);
        }
        
        if (colors.accent) {
            element.style.setProperty('--sponsor-accent', colors.accent);
        }
        
        if (colors.background) {
            element.style.setProperty('--sponsor-bg', colors.background);
        }
        
        if (colors.text) {
            element.style.setProperty('--sponsor-text', colors.text);
        }
        
        // Aplicar colores a elementos específicos
        const logoElement = element.querySelector('.sponsor-logo');
        if (logoElement && colors.primary) {
            logoElement.style.background = colors.primary;
        }
        
        const tierBadge = element.querySelector('.sponsor-tier-badge');
        if (tierBadge && colors.accent) {
            tierBadge.style.background = colors.accent;
        }
    }

    /**
     * Aplica logo a un elemento
     */
    applyLogoToElement(element, logo) {
        const logoContainer = element.querySelector('.sponsor-logo');
        if (!logoContainer) return;
        
        // Limpiar contenido actual
        logoContainer.innerHTML = '';
        
        if (logo.url) {
            const img = document.createElement('img');
            img.src = logo.url;
            img.alt = logo.alt || 'Logo del patrocinador';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            
            // Manejar errores de carga
            img.onerror = () => {
                logoContainer.textContent = logo.fallback || '🏢';
            };
            
            logoContainer.appendChild(img);
        } else if (logo.text) {
            logoContainer.textContent = logo.text;
            logoContainer.style.fontSize = logo.fontSize || '18px';
            logoContainer.style.fontWeight = logo.fontWeight || 'bold';
        }
    }

    /**
     * Aplica tipografía a un elemento
     */
    applyTypographyToElement(element, typography) {
        if (typography.fontFamily) {
            element.style.fontFamily = typography.fontFamily;
        }
        
        if (typography.fontSize) {
            element.style.fontSize = typography.fontSize;
        }
        
        if (typography.fontWeight) {
            element.style.fontWeight = typography.fontWeight;
        }
        
        if (typography.lineHeight) {
            element.style.lineHeight = typography.lineHeight;
        }
        
        if (typography.letterSpacing) {
            element.style.letterSpacing = typography.letterSpacing;
        }
    }

    /**
     * Aplica animaciones a un elemento
     */
    applyAnimationsToElement(element, animations) {
        if (animations.hover) {
            element.style.transition = animations.hover.transition || 'all 0.3s ease';
            
            element.addEventListener('mouseenter', () => {
                if (animations.hover.transform) {
                    element.style.transform = animations.hover.transform;
                }
                if (animations.hover.scale) {
                    element.style.transform = `scale(${animations.hover.scale})`;
                }
                if (animations.hover.shadow) {
                    element.style.boxShadow = animations.hover.shadow;
                }
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.transform = '';
                element.style.boxShadow = '';
            });
        }
        
        if (animations.entrance) {
            element.classList.add('brand-entrance');
            element.style.animationName = animations.entrance.name || 'fadeInUp';
            element.style.animationDuration = animations.entrance.duration || '0.6s';
            element.style.animationDelay = animations.entrance.delay || '0s';
        }
    }

    /**
     * Procesa y optimiza un logo
     */
    async processLogo(logoData) {
        try {
            const processed = {
                original: logoData,
                url: logoData.url || logoData.file,
                alt: logoData.alt || 'Logo del patrocinador',
                fallback: logoData.fallback || logoData.text || '🏢',
                processedAt: new Date()
            };
            
            // Si es un archivo, convertir a URL
            if (logoData.file instanceof File) {
                processed.url = await this.fileToDataURL(logoData.file);
                processed.size = logoData.file.size;
                processed.type = logoData.file.type;
            }
            
            // Validar dimensiones si es necesario
            if (processed.url) {
                const dimensions = await this.getImageDimensions(processed.url);
                processed.width = dimensions.width;
                processed.height = dimensions.height;
                processed.aspectRatio = dimensions.width / dimensions.height;
            }
            
            return processed;
            
        } catch (error) {
            console.error('Error procesando logo:', error);
            throw error;
        }
    }

    /**
     * Valida un logo
     */
    async validateLogo(logoData) {
        if (!logoData.url && !logoData.file && !logoData.text) {
            throw new Error('Logo debe tener URL, archivo o texto');
        }
        
        if (logoData.file) {
            // Validar tipo de archivo
            const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif'];
            if (!allowedTypes.includes(logoData.file.type)) {
                throw new Error(`Tipo de archivo no permitido: ${logoData.file.type}`);
            }
            
            // Validar tamaño
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (logoData.file.size > maxSize) {
                throw new Error('Archivo demasiado grande (máximo 5MB)');
            }
        }
        
        if (logoData.url) {
            // Validar URL
            try {
                new URL(logoData.url);
            } catch {
                throw new Error('URL de logo inválida');
            }
        }
        
        return true;
    }

    /**
     * Valida esquema de colores
     */
    validateColorScheme(colorScheme) {
        const requiredColors = ['primary'];
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/;
        
        for (const required of requiredColors) {
            if (!colorScheme[required]) {
                throw new Error(`Color requerido faltante: ${required}`);
            }
        }
        
        for (const [colorName, colorValue] of Object.entries(colorScheme)) {
            if (typeof colorValue === 'string' && !colorRegex.test(colorValue)) {
                // Verificar si es un nombre de color CSS válido
                const validColorNames = ['transparent', 'inherit', 'currentColor'];
                const tempElement = document.createElement('div');
                tempElement.style.color = colorValue;
                
                if (!validColorNames.includes(colorValue) && 
                    tempElement.style.color === '' && 
                    !colorRegex.test(colorValue)) {
                    throw new Error(`Color inválido: ${colorName} = ${colorValue}`);
                }
            }
        }
        
        return true;
    }

    /**
     * Valida datos de branding
     */
    validateBrandingData(brandingData) {
        if (brandingData.colors) {
            this.validateColorScheme(brandingData.colors);
        }
        
        if (brandingData.logo) {
            // Validación básica del logo
            if (typeof brandingData.logo !== 'object') {
                throw new Error('Logo debe ser un objeto');
            }
        }
        
        if (brandingData.typography) {
            // Validar tipografía
            const validFontWeights = ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold'];
            if (brandingData.typography.fontWeight && 
                !validFontWeights.includes(brandingData.typography.fontWeight.toString())) {
                throw new Error(`Font weight inválido: ${brandingData.typography.fontWeight}`);
            }
        }
        
        return true;
    }

    /**
     * Carga configuraciones de marca existentes
     */
    async loadBrandSettings() {
        // En un entorno real, esto cargaría desde una API
        const mockSettings = new Map([
            ['1', {
                colors: {
                    primary: '#7c3aed',
                    accent: '#a855f7',
                    background: '#ffffff'
                },
                logo: {
                    text: 'TC',
                    fallback: '🏢'
                }
            }],
            ['2', {
                colors: {
                    primary: '#059669',
                    accent: '#10b981',
                    background: '#ffffff'
                },
                logo: {
                    text: 'GE',
                    fallback: '🌱'
                }
            }]
        ]);
        
        this.brandSettings = mockSettings;
    }

    /**
     * Inicializa el cache de logos
     */
    initializeLogoCache() {
        // Configurar límites del cache
        this.logoCacheLimit = 50;
        this.logoCacheUsage = new Map();
    }

    /**
     * Configura observadores de cambios de branding
     */
    setupBrandObservers() {
        // Observar cambios en elementos de patrocinadores
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const sponsorElements = node.querySelectorAll('[data-sponsor-id]');
                            sponsorElements.forEach((element) => {
                                const sponsorId = element.dataset.sponsorId;
                                const branding = this.brandSettings.get(sponsorId);
                                if (branding) {
                                    this.applyBrandingToDOM(sponsorId, branding);
                                }
                            });
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.brandObserver = observer;
    }

    /**
     * Carga paletas de colores predefinidas
     */
    loadColorPalettes() {
        const palettes = {
            corporate: {
                name: 'Corporativo',
                colors: {
                    primary: '#1e40af',
                    secondary: '#64748b',
                    accent: '#0ea5e9',
                    background: '#ffffff',
                    text: '#1e293b'
                }
            },
            vibrant: {
                name: 'Vibrante',
                colors: {
                    primary: '#7c3aed',
                    secondary: '#ec4899',
                    accent: '#f59e0b',
                    background: '#ffffff',
                    text: '#111827'
                }
            },
            nature: {
                name: 'Naturaleza',
                colors: {
                    primary: '#059669',
                    secondary: '#0d9488',
                    accent: '#84cc16',
                    background: '#f9fafb',
                    text: '#1f2937'
                }
            },
            sunset: {
                name: 'Atardecer',
                colors: {
                    primary: '#ea580c',
                    secondary: '#f59e0b',
                    accent: '#ef4444',
                    background: '#fefefe',
                    text: '#1c1917'
                }
            }
        };
        
        Object.entries(palettes).forEach(([id, palette]) => {
            this.colorPalettes.set(id, palette);
        });
    }

    /**
     * Registra un cambio de branding en el historial
     */
    recordBrandingChange(sponsorId, changeData) {
        if (!this.brandingHistory.has(sponsorId)) {
            this.brandingHistory.set(sponsorId, []);
        }
        
        const history = this.brandingHistory.get(sponsorId);
        history.unshift({
            id: this.generateId(),
            timestamp: new Date(),
            changes: changeData,
            version: history.length + 1
        });
        
        // Mantener solo los últimos 20 cambios
        if (history.length > 20) {
            history.splice(20);
        }
    }

    /**
     * Obtiene el historial de branding de un patrocinador
     */
    getBrandingHistory(sponsorId) {
        return this.brandingHistory.get(sponsorId) || [];
    }

    /**
     * Exporta configuraciones de branding
     */
    exportBrandingSettings(sponsorIds = []) {
        const settings = {};
        
        const idsToExport = sponsorIds.length > 0 
            ? sponsorIds 
            : Array.from(this.brandSettings.keys());
        
        idsToExport.forEach(id => {
            const branding = this.brandSettings.get(id);
            if (branding) {
                settings[id] = { ...branding };
            }
        });
        
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            settings
        };
    }

    /**
     * Importa configuraciones de branding
     */
    async importBrandingSettings(data) {
        try {
            const imported = {
                success: 0,
                errors: []
            };
            
            for (const [sponsorId, branding] of Object.entries(data.settings || {})) {
                try {
                    await this.applyBranding(sponsorId, branding);
                    imported.success++;
                } catch (error) {
                    imported.errors.push({
                        sponsorId,
                        error: error.message
                    });
                }
            }
            
            return imported;
            
        } catch (error) {
            console.error('Error importando configuraciones de branding:', error);
            throw error;
        }
    }

    /**
     * Utilidades
     */
    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getImageDimensions(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateThemeId(sponsorId) {
        return `theme_${sponsorId}_${this.generateId()}`;
    }

    getSponsorTier(sponsorId) {
        // En un entorno real, esto obtendría el tier del sistema de patrocinadores
        const mockTiers = {
            '1': 'platinum',
            '2': 'gold',
            '3': 'silver'
        };
        return mockTiers[sponsorId] || 'supporter';
    }

    applyDefaultBranding(sponsorId) {
        const defaultBranding = this.getDefaultBranding(sponsorId);
        this.applyBrandingToDOM(sponsorId, defaultBranding);
    }

    applyCustomTheme(sponsorId, theme) {
        const branding = this.brandSettings.get(sponsorId) || {};
        branding.customTheme = theme;
        this.brandSettings.set(sponsorId, branding);
        this.applyBrandingToDOM(sponsorId, branding);
    }

    updateLogoInDOM(sponsorId, logo) {
        const elements = document.querySelectorAll(`[data-sponsor-id="${sponsorId}"]`);
        elements.forEach(element => {
            this.applyLogoToElement(element, logo);
        });
    }

    applyColorsToDOM(sponsorId, colors) {
        const elements = document.querySelectorAll(`[data-sponsor-id="${sponsorId}"]`);
        elements.forEach(element => {
            this.applyColorsToElement(element, colors);
        });
    }

    validateTheme(theme) {
        if (!theme.id || !theme.name) {
            throw new Error('Tema debe tener ID y nombre');
        }
        return true;
    }

    /**
     * Event listeners
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error en listener de branding:', error);
            }
        });
    }

    /**
     * Destructor
     */
    destroy() {
        if (this.brandObserver) {
            this.brandObserver.disconnect();
        }
        
        this.brandSettings.clear();
        this.logoCache.clear();
        this.colorPalettes.clear();
        this.customThemes.clear();
        this.brandingHistory.clear();
        this.listeners.clear();
        
        console.log('🧹 Brand Integration destruido correctamente');
    }
}

// Exportar para uso global
window.BrandIntegration = BrandIntegration;