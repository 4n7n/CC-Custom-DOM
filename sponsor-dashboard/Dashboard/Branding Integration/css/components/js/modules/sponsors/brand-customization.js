/**
 * BRAND CUSTOMIZATION SYSTEM
 * Sistema completo de personalización de marca para patrocinadores
 * Gestiona colores, logos, fuentes, temas y elementos visuales
 */

class BrandCustomization {
    constructor(options = {}) {
        this.options = {
            autoDetect: true,
            enableTransitions: true,
            saveSettings: true,
            validateColors: true,
            generateContrasts: true,
            apiEndpoint: '/api/branding',
            ...options
        };

        this.currentBrand = null;
        this.customizations = new Map();
        this.colorPalettes = new Map();
        this.fonts = new Map();
        this.logos = new Map();
        this.themes = new Map();
        
        this.colorUtils = new ColorUtils();
        this.fontLoader = new FontLoader();
        this.logoManager = new LogoManager();
        
        this.init();
    }

    /**
     * Inicializa el sistema de personalización
     */
    init() {
        this.loadBrandData();
        this.setupDefaultThemes();
        this.setupEventListeners();
        this.detectCurrentBrand();
        
        console.log('🎨 Sistema de Personalización de Marca inicializado');
    }

    /**
     * Carga datos de marca guardados
     */
    loadBrandData() {
        try {
            const savedData = localStorage.getItem('brandCustomizations');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.customizations = new Map(data.customizations || []);
                this.colorPalettes = new Map(data.colorPalettes || []);
                this.fonts = new Map(data.fonts || []);
                this.logos = new Map(data.logos || []);
                this.themes = new Map(data.themes || []);
            }
        } catch (error) {
            console.warn('Error cargando datos de marca:', error);
        }
    }

    /**
     * Guarda datos de marca
     */
    saveBrandData() {
        if (!this.options.saveSettings) return;

        try {
            const data = {
                customizations: Array.from(this.customizations.entries()),
                colorPalettes: Array.from(this.colorPalettes.entries()),
                fonts: Array.from(this.fonts.entries()),
                logos: Array.from(this.logos.entries()),
                themes: Array.from(this.themes.entries()),
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('brandCustomizations', JSON.stringify(data));
        } catch (error) {
            console.warn('Error guardando datos de marca:', error);
        }
    }

    /**
     * Configura temas por defecto
     */
    setupDefaultThemes() {
        const defaultThemes = [
            {
                id: 'corporate-blue',
                name: 'Corporativo Azul',
                category: 'corporate',
                colors: {
                    primary: '#1e40af',
                    secondary: '#1d4ed8',
                    accent: '#3b82f6',
                    background: '#f8fafc',
                    surface: '#ffffff',
                    text: '#1f2937',
                    textSecondary: '#6b7280'
                },
                fonts: {
                    primary: 'Inter',
                    secondary: 'Roboto',
                    heading: 'Inter'
                },
                spacing: 'comfortable',
                radius: 'medium'
            },
            {
                id: 'sustainable-green',
                name: 'Verde Sostenible',
                category: 'nonprofit',
                colors: {
                    primary: '#059669',
                    secondary: '#047857',
                    accent: '#10b981',
                    background: '#f0fdf4',
                    surface: '#ffffff',
                    text: '#064e3b',
                    textSecondary: '#047857'
                },
                fonts: {
                    primary: 'Open Sans',
                    secondary: 'Lato',
                    heading: 'Open Sans'
                },
                spacing: 'cozy',
                radius: 'rounded'
            },
            {
                id: 'energetic-orange',
                name: 'Naranja Energético',
                category: 'community',
                colors: {
                    primary: '#ea580c',
                    secondary: '#c2410c',
                    accent: '#fb923c',
                    background: '#fffbeb',
                    surface: '#ffffff',
                    text: '#9a3412',
                    textSecondary: '#c2410c'
                },
                fonts: {
                    primary: 'Source Sans Pro',
                    secondary: 'Nunito',
                    heading: 'Source Sans Pro'
                },
                spacing: 'compact',
                radius: 'sharp'
            }
        ];

        defaultThemes.forEach(theme => {
            this.themes.set(theme.id, theme);
        });
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Escuchar cambios de marca
        document.addEventListener('brandChanged', (e) => {
            this.handleBrandChange(e.detail);
        });

        // Escuchar cambios de color
        document.addEventListener('colorChanged', (e) => {
            this.handleColorChange(e.detail);
        });

        // Escuchar cambios de fuente
        document.addEventListener('fontChanged', (e) => {
            this.handleFontChange(e.detail);
        });

        // Escuchar drag & drop de logos
        this.setupLogoDropZone();
    }

    /**
     * Detecta la marca actual
     */
    detectCurrentBrand() {
        // Buscar elementos con data-brand
        const brandElement = document.querySelector('[data-brand]');
        if (brandElement) {
            const brandId = brandElement.dataset.brand;
            this.loadBrand(brandId);
        }
    }

    /**
     * Carga una marca específica
     */
    async loadBrand(brandId) {
        try {
            let brandData;
            
            // Intentar cargar desde API
            if (this.options.apiEndpoint) {
                const response = await fetch(`${this.options.apiEndpoint}/brands/${brandId}`);
                if (response.ok) {
                    brandData = await response.json();
                }
            }
            
            // Fallback a datos locales
            if (!brandData) {
                brandData = this.customizations.get(brandId);
            }
            
            if (brandData) {
                this.applyBrand(brandData);
                this.currentBrand = brandData;
            } else {
                console.warn(`Marca no encontrada: ${brandId}`);
            }
        } catch (error) {
            console.error('Error cargando marca:', error);
        }
    }

    /**
     * Aplica una marca al dashboard
     */
    applyBrand(brandData) {
        console.log('🎨 Aplicando marca:', brandData.name);
        
        // Aplicar colores
        if (brandData.colors) {
            this.applyColors(brandData.colors);
        }
        
        // Aplicar fuentes
        if (brandData.fonts) {
            this.applyFonts(brandData.fonts);
        }
        
        // Aplicar logos
        if (brandData.logos) {
            this.applyLogos(brandData.logos);
        }
        
        // Aplicar tema
        if (brandData.theme) {
            this.applyTheme(brandData.theme);
        }
        
        // Aplicar estilos personalizados
        if (brandData.customCSS) {
            this.applyCustomCSS(brandData.customCSS);
        }
        
        // Disparar evento de marca aplicada
        document.dispatchEvent(new CustomEvent('brandApplied', {
            detail: brandData
        }));
    }

    /**
     * Aplica esquema de colores
     */
    applyColors(colors) {
        const root = document.documentElement;
        
        // Colores principales
        Object.keys(colors).forEach(colorKey => {
            const colorValue = colors[colorKey];
            root.style.setProperty(`--brand-${colorKey}`, colorValue);
            
            // Generar variaciones automáticas
            if (this.options.generateContrasts) {
                const variations = this.colorUtils.generateVariations(colorValue);
                Object.keys(variations).forEach(variation => {
                    root.style.setProperty(`--brand-${colorKey}-${variation}`, variations[variation]);
                });
            }
        });
        
        // Aplicar RGB para transparencias
        if (colors.primary) {
            const rgb = this.colorUtils.hexToRgb(colors.primary);
            root.style.setProperty('--brand-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        
        if (colors.secondary) {
            const rgb = this.colorUtils.hexToRgb(colors.secondary);
            root.style.setProperty('--brand-secondary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        
        if (colors.accent) {
            const rgb = this.colorUtils.hexToRgb(colors.accent);
            root.style.setProperty('--brand-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        
        // Determinar contraste automático
        this.updateTextContrasts(colors);
    }

    /**
     * Actualiza contrastes de texto automáticamente
     */
    updateTextContrasts(colors) {
        const root = document.documentElement;
        
        Object.keys(colors).forEach(colorKey => {
            const bgColor = colors[colorKey];
            const textColor = this.colorUtils.getOptimalTextColor(bgColor);
            root.style.setProperty(`--text-on-brand-${colorKey}`, textColor);
        });
    }

    /**
     * Aplica fuentes
     */
    async applyFonts(fonts) {
        const root = document.documentElement;
        
        // Cargar fuentes si no están disponibles
        for (const [fontType, fontFamily] of Object.entries(fonts)) {
            await this.fontLoader.loadFont(fontFamily);
            root.style.setProperty(`--brand-font-${fontType}`, fontFamily);
        }
        
        // Aplicar fuentes a elementos específicos
        if (fonts.primary) {
            document.body.style.fontFamily = fonts.primary;
        }
        
        if (fonts.heading) {
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(heading => {
                heading.style.fontFamily = fonts.heading;
            });
        }
    }

    /**
     * Aplica logos
     */
    applyLogos(logos) {
        Object.keys(logos).forEach(logoType => {
            const logoData = logos[logoType];
            const logoElements = document.querySelectorAll(`[data-logo="${logoType}"]`);
            
            logoElements.forEach(element => {
                if (logoData.url) {
                    if (element.tagName === 'IMG') {
                        element.src = logoData.url;
                        element.alt = logoData.alt || 'Logo';
                    } else {
                        element.style.backgroundImage = `url(${logoData.url})`;
                        element.style.backgroundSize = logoData.size || 'contain';
                        element.style.backgroundRepeat = 'no-repeat';
                        element.style.backgroundPosition = logoData.position || 'center';
                    }
                }
                
                // Aplicar estilos adicionales
                if (logoData.styles) {
                    Object.assign(element.style, logoData.styles);
                }
            });
        });
    }

    /**
     * Aplica tema completo
     */
    applyTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) {
            console.warn(`Tema no encontrado: ${themeId}`);
            return;
        }
        
        document.body.className = document.body.className
            .replace(/theme-\w+/g, '')
            .trim();
        document.body.classList.add(`theme-${themeId}`);
        
        // Aplicar configuraciones del tema
        if (theme.colors) {
            this.applyColors(theme.colors);
        }
        
        if (theme.fonts) {
            this.applyFonts(theme.fonts);
        }
        
        // Aplicar espaciado
        if (theme.spacing) {
            document.documentElement.style.setProperty('--brand-spacing', theme.spacing);
        }
        
        // Aplicar border radius
        if (theme.radius) {
            const radiusValues = {
                sharp: '0px',
                small: '4px',
                medium: '8px',
                rounded: '12px',
                pill: '9999px'
            };
            document.documentElement.style.setProperty('--brand-radius', radiusValues[theme.radius] || '8px');
        }
    }

    /**
     * Aplica CSS personalizado
     */
    applyCustomCSS(css) {
        let styleElement = document.getElementById('custom-brand-styles');
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'custom-brand-styles';
            document.head.appendChild(styleElement);
        }
        
        styleElement.textContent = css;
    }

    /**
     * Crea una nueva personalización de marca
     */
    createBrandCustomization(brandConfig) {
        const brandId = brandConfig.id || this.generateBrandId();
        
        const customization = {
            id: brandId,
            name: brandConfig.name,
            description: brandConfig.description,
            category: brandConfig.category || 'custom',
            colors: brandConfig.colors || {},
            fonts: brandConfig.fonts || {},
            logos: brandConfig.logos || {},
            theme: brandConfig.theme,
            customCSS: brandConfig.customCSS,
            settings: brandConfig.settings || {},
            createdAt: new Date().toISOString(),
            version: '1.0.0'
        };
        
        // Validar colores
        if (this.options.validateColors) {
            customization.colors = this.validateColorPalette(customization.colors);
        }
        
        this.customizations.set(brandId, customization);
        this.saveBrandData();
        
        console.log('✨ Nueva personalización creada:', customization.name);
        return customization;
    }

    /**
     * Valida paleta de colores
     */
    validateColorPalette(colors) {
        const validatedColors = {};
        
        Object.keys(colors).forEach(colorKey => {
            const colorValue = colors[colorKey];
            if (this.colorUtils.isValidColor(colorValue)) {
                validatedColors[colorKey] = colorValue;
            } else {
                console.warn(`Color inválido para ${colorKey}: ${colorValue}`);
            }
        });
        
        // Asegurar colores mínimos
        if (!validatedColors.primary) {
            validatedColors.primary = '#3b82f6';
        }
        
        if (!validatedColors.background) {
            validatedColors.background = '#ffffff';
        }
        
        if (!validatedColors.text) {
            validatedColors.text = '#1f2937';
        }
        
        return validatedColors;
    }

    /**
     * Configura zona de drop para logos
     */
    setupLogoDropZone() {
        const dropZones = document.querySelectorAll('.logo-drop-zone');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
            
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                const files = Array.from(e.dataTransfer.files);
                const logoType = zone.dataset.logoType;
                
                files.forEach(file => {
                    if (file.type.startsWith('image/')) {
                        this.handleLogoUpload(file, logoType);
                    }
                });
            });
        });
    }

    /**
     * Maneja upload de logo
     */
    async handleLogoUpload(file, logoType) {
        try {
            const logoData = await this.logoManager.processLogo(file);
            
            const currentBrand = this.currentBrand || {};
            if (!currentBrand.logos) {
                currentBrand.logos = {};
            }
            
            currentBrand.logos[logoType] = logoData;
            
            this.applyLogos(currentBrand.logos);
            this.saveBrandData();
            
            // Mostrar feedback
            this.showUploadSuccess(logoType);
            
        } catch (error) {
            console.error('Error procesando logo:', error);
            this.showUploadError(error.message);
        }
    }

    /**
     * Muestra feedback de upload exitoso
     */
    showUploadSuccess(logoType) {
        const notification = document.createElement('div');
        notification.className = 'upload-notification success';
        notification.textContent = `Logo ${logoType} actualizado correctamente`;
        
        this.showNotification(notification);
    }

    /**
     * Muestra feedback de error
     */
    showUploadError(message) {
        const notification = document.createElement('div');
        notification.className = 'upload-notification error';
        notification.textContent = `Error: ${message}`;
        
        this.showNotification(notification);
    }

    /**
     * Muestra notificación
     */
    showNotification(notification) {
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem',
            borderRadius: '8px',
            color: 'white',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease'
        });
        
        if (notification.classList.contains('success')) {
            notification.style.background = '#10b981';
        } else {
            notification.style.background = '#ef4444';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * Genera selector de colores interactivo
     */
    createColorPicker(container, initialColor, callback) {
        const colorPicker = document.createElement('div');
        colorPicker.className = 'brand-color-picker';
        
        colorPicker.innerHTML = `
            <div class="color-preview" style="background-color: ${initialColor}"></div>
            <input type="color" value="${initialColor}" class="color-input">
            <input type="text" value="${initialColor}" class="color-text">
            <div class="color-suggestions">
                ${this.getColorSuggestions().map(color => 
                    `<div class="color-suggestion" style="background-color: ${color}" data-color="${color}"></div>`
                ).join('')}
            </div>
        `;
        
        const colorInput = colorPicker.querySelector('.color-input');
        const colorText = colorPicker.querySelector('.color-text');
        const colorPreview = colorPicker.querySelector('.color-preview');
        
        const updateColor = (color) => {
            colorInput.value = color;
            colorText.value = color;
            colorPreview.style.backgroundColor = color;
            if (callback) callback(color);
        };
        
        colorInput.addEventListener('change', (e) => updateColor(e.target.value));
        colorText.addEventListener('change', (e) => {
            if (this.colorUtils.isValidColor(e.target.value)) {
                updateColor(e.target.value);
            }
        });
        
        // Sugerencias de color
        colorPicker.querySelectorAll('.color-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                updateColor(suggestion.dataset.color);
            });
        });
        
        container.appendChild(colorPicker);
        return colorPicker;
    }

    /**
     * Obtiene sugerencias de color
     */
    getColorSuggestions() {
        return [
            '#3b82f6', '#1e40af', '#1d4ed8', // Azules
            '#10b981', '#059669', '#047857', // Verdes
            '#f59e0b', '#d97706', '#b45309', // Naranjas
            '#8b5cf6', '#7c3aed', '#6d28d9', // Púrpuras
            '#ef4444', '#dc2626', '#b91c1c', // Rojos
            '#06b6d4', '#0891b2', '#0e7490'  // Teals
        ];
    }

    /**
     * Crea panel de personalización
     */
    createCustomizationPanel(container) {
        const panel = document.createElement('div');
        panel.className = 'brand-customization-panel';
        
        panel.innerHTML = `
            <div class="panel-header">
                <h3>Personalización de Marca</h3>
                <button class="panel-close">&times;</button>
            </div>
            
            <div class="panel-content">
                <div class="customization-section">
                    <h4>Colores</h4>
                    <div class="color-controls">
                        <div class="color-control">
                            <label>Color Principal</label>
                            <div class="color-picker-container" data-color="primary"></div>
                        </div>
                        <div class="color-control">
                            <label>Color Secundario</label>
                            <div class="color-picker-container" data-color="secondary"></div>
                        </div>
                        <div class="color-control">
                            <label>Color de Acento</label>
                            <div class="color-picker-container" data-color="accent"></div>
                        </div>
                    </div>
                </div>
                
                <div class="customization-section">
                    <h4>Fuentes</h4>
                    <div class="font-controls">
                        <div class="font-control">
                            <label>Fuente Principal</label>
                            <select class="font-select" data-font="primary">
                                <option value="Inter">Inter</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Open Sans">Open Sans</option>
                                <option value="Lato">Lato</option>
                                <option value="Source Sans Pro">Source Sans Pro</option>
                            </select>
                        </div>
                        <div class="font-control">
                            <label>Fuente de Títulos</label>
                            <select class="font-select" data-font="heading">
                                <option value="Inter">Inter</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Playfair Display">Playfair Display</option>
                                <option value="Montserrat">Montserrat</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="customization-section">
                    <h4>Logos</h4>
                    <div class="logo-controls">
                        <div class="logo-control">
                            <label>Logo Principal</label>
                            <div class="logo-drop-zone" data-logo-type="main">
                                Arrastra tu logo aquí
                            </div>
                        </div>
                        <div class="logo-control">
                            <label>Logo Secundario</label>
                            <div class="logo-drop-zone" data-logo-type="secondary">
                                Arrastra tu logo aquí
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="customization-section">
                    <h4>Tema</h4>
                    <div class="theme-controls">
                        <select class="theme-select">
                            ${Array.from(this.themes.values()).map(theme => 
                                `<option value="${theme.id}">${theme.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="panel-footer">
                <button class="btn-secondary" data-action="reset">Restablecer</button>
                <button class="btn-primary" data-action="save">Guardar</button>
            </div>
        `;
        
        container.appendChild(panel);
        this.setupPanelEvents(panel);
        return panel;
    }

    /**
     * Configura eventos del panel
     */
    setupPanelEvents(panel) {
        // Color pickers
        panel.querySelectorAll('.color-picker-container').forEach(container => {
            const colorType = container.dataset.color;
            const currentColor = this.getCurrentColor(colorType);
            
            this.createColorPicker(container, currentColor, (color) => {
                this.updateBrandColor(colorType, color);
            });
        });
        
        // Font selects
        panel.querySelectorAll('.font-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const fontType = e.target.dataset.font;
                const fontFamily = e.target.value;
                this.updateBrandFont(fontType, fontFamily);
            });
        });
        
        // Theme select
        panel.querySelector('.theme-select').addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });
        
        // Action buttons
        panel.querySelector('[data-action="save"]').addEventListener('click', () => {
            this.saveBrandCustomization();
        });
        
        panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
            this.resetBrandCustomization();
        });
        
        panel.querySelector('.panel-close').addEventListener('click', () => {
            panel.remove();
        });
    }

    /**
     * Obtiene color actual
     */
    getCurrentColor(colorType) {
        const computed = getComputedStyle(document.documentElement);
        return computed.getPropertyValue(`--brand-${colorType}`).trim() || '#3b82f6';
    }

    /**
     * Actualiza color de marca
     */
    updateBrandColor(colorType, color) {
        if (!this.currentBrand) {
            this.currentBrand = { colors: {} };
        }
        
        if (!this.currentBrand.colors) {
            this.currentBrand.colors = {};
        }
        
        this.currentBrand.colors[colorType] = color;
        this.applyColors(this.currentBrand.colors);
    }

    /**
     * Actualiza fuente de marca
     */
    updateBrandFont(fontType, fontFamily) {
        if (!this.currentBrand) {
            this.currentBrand = { fonts: {} };
        }
        
        if (!this.currentBrand.fonts) {
            this.currentBrand.fonts = {};
        }
        
        this.currentBrand.fonts[fontType] = fontFamily;
        this.applyFonts(this.currentBrand.fonts);
    }

    /**
     * Guarda personalización actual
     */
    saveBrandCustomization() {
        if (this.currentBrand) {
            this.customizations.set(this.currentBrand.id, this.currentBrand);
            this.saveBrandData();
            
            this.showNotification({
                className: 'success',
                textContent: 'Personalización guardada correctamente'
            });
        }
    }

    /**
     * Restablece personalización
     */
    resetBrandCustomization() {
        if (confirm('¿Estás seguro de restablecer todas las personalizaciones?')) {
            this.currentBrand = null;
            
            // Remover estilos personalizados
            document.documentElement.style.removeProperty('--brand-primary');
            document.documentElement.style.removeProperty('--brand-secondary');
            document.documentElement.style.removeProperty('--brand-accent');
            
            const customStyles = document.getElementById('custom-brand-styles');
            if (customStyles) {
                customStyles.remove();
            }
            
            // Recargar página para aplicar estilos por defecto
            location.reload();
        }
    }

    /**
     * Genera ID único para marca
     */
    generateBrandId() {
        return `brand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Maneja cambio de marca
     */
    handleBrandChange(brandData) {
        this.applyBrand(brandData);
    }

    /**
     * Maneja cambio de color
     */
    handleColorChange(colorData) {
        this.updateBrandColor(colorData.type, colorData.value);
    }

    /**
     * Maneja cambio de fuente
     */
    handleFontChange(fontData) {
        this.updateBrandFont(fontData.type, fontData.value);
    }

    /**
     * Métodos públicos para integración
     */
    
    // Obtener marca actual
    getCurrentBrand() {
        return this.currentBrand;
    }
    
    // Obtener todas las personalizaciones
    getAllCustomizations() {
        return Array.from(this.customizations.values());
    }
    
    // Obtener temas disponibles
    getAvailableThemes() {
        return Array.from(this.themes.values());
    }
    
    // Exportar configuración
    exportConfiguration() {
        return {
            currentBrand: this.currentBrand,
            customizations: Array.from(this.customizations.entries()),
            themes: Array.from(this.themes.entries()),
            exportedAt: new Date().toISOString()
        };
    }
    
    // Importar configuración
    importConfiguration(config) {
        if (config.customizations) {
            this.customizations = new Map(config.customizations);
        }
        if (config.themes) {
            this.themes = new Map(config.themes);
        }
        if (config.currentBrand) {
            this.applyBrand(config.currentBrand);
        }
        
        this.saveBrandData();
    }
}

/**
 * UTILIDADES DE COLOR
 */
class ColorUtils {
    isValidColor(color) {
        const style = new Option().style;
        style.color = color;
        return style.color !== '';
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    getLuminance(color) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return 0;

        const { r, g, b } = rgb;
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    getContrastRatio(color1, color2) {
        const lum1 = this.getLuminance(color1);
        const lum2 = this.getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    getOptimalTextColor(backgroundColor) {
        const whiteContrast = this.getContrastRatio(backgroundColor, '#ffffff');
        const blackContrast = this.getContrastRatio(backgroundColor, '#000000');
        return whiteContrast > blackContrast ? '#ffffff' : '#000000';
    }

    generateVariations(baseColor) {
        const rgb = this.hexToRgb(baseColor);
        if (!rgb) return {};

        return {
            light: this.lighten(baseColor, 20),
            lighter: this.lighten(baseColor, 40),
            dark: this.darken(baseColor, 20),
            darker: this.darken(baseColor, 40),
            muted: this.desaturate(baseColor, 30),
            vibrant: this.saturate(baseColor, 20)
        };
    }

    lighten(color, amount) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const factor = amount / 100;
        const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
        const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
        const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));

        return this.rgbToHex(r, g, b);
    }

    darken(color, amount) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const factor = 1 - (amount / 100);
        const r = Math.round(rgb.r * factor);
        const g = Math.round(rgb.g * factor);
        const b = Math.round(rgb.b * factor);

        return this.rgbToHex(r, g, b);
    }

    saturate(color, amount) {
        // Implementación simplificada de saturación
        return color; // Placeholder
    }

    desaturate(color, amount) {
        // Implementación simplificada de desaturación
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const gray = Math.round((rgb.r + rgb.g + rgb.b) / 3);
        const factor = amount / 100;
        
        const r = Math.round(rgb.r + (gray - rgb.r) * factor);
        const g = Math.round(rgb.g + (gray - rgb.g) * factor);
        const b = Math.round(rgb.b + (gray - rgb.b) * factor);

        return this.rgbToHex(r, g, b);
    }
}

/**
 * CARGADOR DE FUENTES
 */
class FontLoader {
    constructor() {
        this.loadedFonts = new Set();
        this.loadingPromises = new Map();
    }

    async loadFont(fontFamily) {
        if (this.loadedFonts.has(fontFamily)) {
            return true;
        }

        if (this.loadingPromises.has(fontFamily)) {
            return this.loadingPromises.get(fontFamily);
        }

        const promise = this.loadGoogleFont(fontFamily);
        this.loadingPromises.set(fontFamily, promise);

        try {
            await promise;
            this.loadedFonts.add(fontFamily);
            return true;
        } catch (error) {
            console.warn(`Error cargando fuente ${fontFamily}:`, error);
            return false;
        }
    }

    async loadGoogleFont(fontFamily) {
        const fontName = fontFamily.replace(/\s+/g, '+');
        const linkId = `font-${fontName}`;

        // Verificar si ya está cargada
        if (document.getElementById(linkId)) {
            return;
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700&display=swap`;
            
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load font: ${fontFamily}`));
            
            document.head.appendChild(link);

            // Timeout después de 10 segundos
            setTimeout(() => reject(new Error(`Font load timeout: ${fontFamily}`)), 10000);
        });
    }

    isFontLoaded(fontFamily) {
        return this.loadedFonts.has(fontFamily);
    }

    getLoadedFonts() {
        return Array.from(this.loadedFonts);
    }
}

/**
 * GESTOR DE LOGOS
 */
class LogoManager {
    constructor() {
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    }

    async processLogo(file) {
        // Validar archivo
        this.validateFile(file);

        // Procesar imagen
        const processedData = await this.processImage(file);

        return {
            url: processedData.url,
            originalName: file.name,
            size: file.size,
            type: file.type,
            dimensions: processedData.dimensions,
            alt: processedData.alt || 'Logo',
            processedAt: new Date().toISOString()
        };
    }

    validateFile(file) {
        if (!this.allowedTypes.includes(file.type)) {
            throw new Error(`Tipo de archivo no permitido: ${file.type}`);
        }

        if (file.size > this.maxFileSize) {
            throw new Error(`Archivo muy grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: 5MB`);
        }
    }

    async processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Optimizar tamaño si es necesario
                    let { width, height } = this.calculateOptimalSize(img.width, img.height);
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Dibujar imagen optimizada
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convertir a data URL
                    const dataUrl = canvas.toDataURL('image/png', 0.9);
                    
                    resolve({
                        url: dataUrl,
                        dimensions: { width, height },
                        alt: file.name.replace(/\.[^/.]+$/, "")
                    });
                };
                
                img.onerror = () => reject(new Error('Error procesando imagen'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Error leyendo archivo'));
            reader.readAsDataURL(file);
        });
    }

    calculateOptimalSize(originalWidth, originalHeight, maxWidth = 400, maxHeight = 200) {
        let width = originalWidth;
        let height = originalHeight;

        // Escalar proporcionalmente si excede los límites
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }

        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }

        return {
            width: Math.round(width),
            height: Math.round(height)
        };
    }

    async optimizeLogo(logoData, options = {}) {
        const {
            maxWidth = 300,
            maxHeight = 150,
            quality = 0.9,
            format = 'png'
        } = options;

        // Crear imagen desde data URL
        const img = new Image();
        img.src = logoData.url;

        return new Promise((resolve) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const { width, height } = this.calculateOptimalSize(
                    img.width, 
                    img.height, 
                    maxWidth, 
                    maxHeight
                );
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                const optimizedUrl = canvas.toDataURL(`image/${format}`, quality);
                
                resolve({
                    ...logoData,
                    url: optimizedUrl,
                    dimensions: { width, height },
                    optimized: true,
                    optimizedAt: new Date().toISOString()
                });
            };
        });
    }
}

// Estilos CSS inline para el sistema de personalización
const brandCustomizationStyles = `
    <style>
    .brand-customization-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100vh;
        background: white;
        box-shadow: -4px 0 20px rgba(0,0,0,0.1);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    }
    
    .brand-customization-panel.open {
        transform: translateX(0);
    }
    
    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .panel-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
    }
    
    .panel-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0.25rem;
    }
    
    .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
    }
    
    .customization-section {
        margin-bottom: 2rem;
    }
    
    .customization-section h4 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
    }
    
    .color-control, .font-control, .logo-control {
        margin-bottom: 1rem;
    }
    
    .color-control label, .font-control label, .logo-control label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #4b5563;
    }
    
    .brand-color-picker {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    
    .color-preview {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        cursor: pointer;
    }
    
    .color-input {
        width: 60px;
        height: 40px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
    }
    
    .color-text {
        width: 80px;
        height: 40px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 0 0.5rem;
        font-size: 0.875rem;
    }
    
    .color-suggestions {
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
        width: 100%;
    }
    
    .color-suggestion {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
        cursor: pointer;
        transition: transform 0.2s;
    }
    
    .color-suggestion:hover {
        transform: scale(1.1);
    }
    
    .font-select, .theme-select {
        width: 100%;
        height: 40px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 0 0.75rem;
        font-size: 0.875rem;
        background: white;
    }
    
    .logo-drop-zone {
        width: 100%;
        height: 100px;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .logo-drop-zone:hover, .logo-drop-zone.drag-over {
        border-color: #3b82f6;
        background-color: #eff6ff;
        color: #3b82f6;
    }
    
    .panel-footer {
        display: flex;
        gap: 1rem;
        padding: 1.5rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .btn-primary, .btn-secondary {
        flex: 1;
        height: 40px;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn-primary {
        background: #3b82f6;
        color: white;
    }
    
    .btn-primary:hover {
        background: #2563eb;
    }
    
    .btn-secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
    }
    
    .btn-secondary:hover {
        background: #e5e7eb;
    }
    
    .upload-notification {
        font-size: 0.875rem;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    @media (max-width: 768px) {
        .brand-customization-panel {
            width: 100%;
            height: 100vh;
        }
    }
    </style>
`;

// Inyectar estilos si no existen
if (!document.querySelector('#brand-customization-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'brand-customization-styles';
    styleElement.innerHTML = brandCustomizationStyles;
    document.head.appendChild(styleElement);
}

// Inicialización automática cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.BrandCustomization = BrandCustomization;
        window.ColorUtils = ColorUtils;
        window.FontLoader = FontLoader;
        window.LogoManager = LogoManager;
    });
} else {
    window.BrandCustomization = BrandCustomization;
    window.ColorUtils = ColorUtils;
    window.FontLoader = FontLoader;
    window.LogoManager = LogoManager;
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BrandCustomization, ColorUtils, FontLoader, LogoManager };
}