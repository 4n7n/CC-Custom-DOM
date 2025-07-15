/* ==================================================
   RAMA 9: Customization Engine Module
   Motor de personalización avanzada de la interfaz
   ================================================== */

class CustomizationEngine {
  constructor(options = {}) {
    this.options = {
      enableAdvancedCustomization: true,
      enableLayoutCustomization: true,
      enableColorCustomization: true,
      enableTypographyCustomization: true,
      enableAnimationCustomization: true,
      enableComponentCustomization: true,
      autoSaveChanges: true,
      maxCustomPresets: 10,
      ...options
    };
    
    this.customizations = {
      colors: new Map(),
      typography: new Map(),
      layout: new Map(),
      animations: new Map(),
      components: new Map()
    };
    
    this.presets = new Map();
    this.currentPreset = null;
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;
    
    this.colorPicker = null;
    this.previewMode = false;
    this.livePreview = true;
    
    this.eventHandlers = new Map();
    
    this.init();
  }
  
  init() {
    console.log('🎨 Inicializando Customization Engine...');
    
    this.setupColorSystem();
    this.setupTypographySystem();
    this.setupLayoutSystem();
    this.setupAnimationSystem();
    this.setupComponentSystem();
    this.setupEventListeners();
    this.loadUserCustomizations();
    this.createCustomizationUI();
    
    console.log('✅ Customization Engine inicializado');
  }
  
  setupColorSystem() {
    // Sistema de colores personalizable
    this.colorSystem = {
      primary: {
        name: 'Color Primario',
        default: '#4f46e5',
        current: '#4f46e5',
        variants: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
      },
      secondary: {
        name: 'Color Secundario',
        default: '#06b6d4',
        current: '#06b6d4',
        variants: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
      },
      accent: {
        name: 'Color de Acento',
        default: '#10b981',
        current: '#10b981',
        variants: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
      },
      background: {
        name: 'Fondo Principal',
        default: '#0f172a',
        current: '#0f172a'
      },
      surface: {
        name: 'Superficie',
        default: '#1e293b',
        current: '#1e293b'
      },
      text: {
        name: 'Texto Principal',
        default: '#ffffff',
        current: '#ffffff'
      }
    };
  }
  
  setupTypographySystem() {
    // Sistema de tipografía personalizable
    this.typographySystem = {
      fontFamily: {
        primary: {
          name: 'Fuente Principal',
          default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          current: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          options: [
            'System Default',
            'Inter',
            'Roboto',
            'Open Sans',
            'Lato',
            'Poppins',
            'Montserrat',
            'Playfair Display',
            'Merriweather'
          ]
        },
        heading: {
          name: 'Fuente de Títulos',
          default: 'inherit',
          current: 'inherit',
          options: [
            'Heredar',
            'Inter',
            'Roboto',
            'Playfair Display',
            'Montserrat',
            'Oswald',
            'Merriweather'
          ]
        }
      },
      fontSize: {
        base: {
          name: 'Tamaño Base',
          default: '1rem',
          current: '1rem',
          min: 0.75,
          max: 1.5,
          step: 0.0625
        },
        scale: {
          name: 'Escala Tipográfica',
          default: 1.25,
          current: 1.25,
          min: 1.125,
          max: 1.618,
          step: 0.125
        }
      },
      lineHeight: {
        name: 'Altura de Línea',
        default: 1.6,
        current: 1.6,
        min: 1.2,
        max: 2.0,
        step: 0.1
      },
      letterSpacing: {
        name: 'Espaciado de Letras',
        default: '0em',
        current: '0em',
        min: -0.05,
        max: 0.1,
        step: 0.005
      }
    };
  }
  
  setupLayoutSystem() {
    // Sistema de layout personalizable
    this.layoutSystem = {
      spacing: {
        unit: {
          name: 'Unidad de Espaciado',
          default: '1rem',
          current: '1rem',
          min: 0.5,
          max: 2,
          step: 0.125
        },
        scale: {
          name: 'Escala de Espaciado',
          default: 1.5,
          current: 1.5,
          min: 1.2,
          max: 2,
          step: 0.1
        }
      },
      borderRadius: {
        name: 'Radio de Bordes',
        default: '0.5rem',
        current: '0.5rem',
        min: 0,
        max: 1.5,
        step: 0.125
      },
      maxWidth: {
        name: 'Ancho Máximo de Contenido',
        default: '1200px',
        current: '1200px',
        options: ['100%', '960px', '1024px', '1200px', '1400px', '1600px']
      },
      sidebar: {
        width: {
          name: 'Ancho del Sidebar',
          default: '16rem',
          current: '16rem',
          min: 12,
          max: 24,
          step: 1
        },
        collapsedWidth: {
          name: 'Ancho Colapsado',
          default: '4rem',
          current: '4rem',
          min: 3,
          max: 6,
          step: 0.5
        }
      }
    };
  }
  
  setupAnimationSystem() {
    // Sistema de animaciones personalizable
    this.animationSystem = {
      duration: {
        fast: {
          name: 'Duración Rápida',
          default: '150ms',
          current: '150ms',
          min: 50,
          max: 300,
          step: 25
        },
        normal: {
          name: 'Duración Normal',
          default: '300ms',
          current: '300ms',
          min: 150,
          max: 600,
          step: 50
        },
        slow: {
          name: 'Duración Lenta',
          default: '500ms',
          current: '500ms',
          min: 300,
          max: 1000,
          step: 100
        }
      },
      easing: {
        name: 'Función de Easing',
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        current: 'cubic-bezier(0.4, 0, 0.2, 1)',
        options: [
          { name: 'Ease Out', value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
          { name: 'Ease In', value: 'cubic-bezier(0.4, 0, 1, 1)' },
          { name: 'Ease In Out', value: 'cubic-bezier(0.4, 0, 0.6, 1)' },
          { name: 'Linear', value: 'linear' },
          { name: 'Bounce', value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }
        ]
      },
      effects: {
        parallax: {
          name: 'Efecto Parallax',
          enabled: false
        },
        blur: {
          name: 'Efecto Blur',
          enabled: true,
          intensity: 10
        },
        glow: {
          name: 'Efecto Glow',
          enabled: true,
          intensity: 0.5
        }
      }
    };
  }
  
  setupComponentSystem() {
    // Sistema de personalización de componentes
    this.componentSystem = {
      buttons: {
        style: {
          name: 'Estilo de Botones',
          default: 'rounded',
          current: 'rounded',
          options: ['rounded', 'square', 'pill', 'minimal']
        },
        size: {
          name: 'Tamaño de Botones',
          default: 'medium',
          current: 'medium',
          options: ['small', 'medium', 'large']
        }
      },
      cards: {
        style: {
          name: 'Estilo de Tarjetas',
          default: 'elevated',
          current: 'elevated',
          options: ['flat', 'outlined', 'elevated', 'glass']
        },
        padding: {
          name: 'Padding de Tarjetas',
          default: '1.5rem',
          current: '1.5rem',
          min: 0.5,
          max: 3,
          step: 0.25
        }
      },
      navigation: {
        style: {
          name: 'Estilo de Navegación',
          default: 'modern',
          current: 'modern',
          options: ['classic', 'modern', 'minimal', 'bold']
        },
        position: {
          name: 'Posición',
          default: 'fixed',
          current: 'fixed',
          options: ['fixed', 'sticky', 'static']
        }
      }
    };
  }
  
  setupEventListeners() {
    // Eventos de personalización
    document.addEventListener('customization:change', this.handleCustomizationChange.bind(this));
    document.addEventListener('customization:preview', this.handlePreviewToggle.bind(this));
    document.addEventListener('customization:reset', this.handleReset.bind(this));
    document.addEventListener('customization:save-preset', this.handleSavePreset.bind(this));
    document.addEventListener('customization:load-preset', this.handleLoadPreset.bind(this));
    
    // Eventos de teclado
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }
  
  // Métodos principales de personalización
  updateColor(colorKey, newValue) {
    if (!this.colorSystem[colorKey]) {
      console.warn(`⚠️ Color key no encontrado: ${colorKey}`);
      return false;
    }
    
    const oldValue = this.colorSystem[colorKey].current;
    this.colorSystem[colorKey].current = newValue;
    
    // Generar variantes automáticamente
    if (this.colorSystem[colorKey].variants) {
      this.generateColorVariants(colorKey, newValue);
    }
    
    // Aplicar cambios
    this.applyColorChanges();
    
    // Guardar en historial de deshacer
    this.saveToUndoStack('color', colorKey, oldValue, newValue);
    
    // Guardar automáticamente
    if (this.options.autoSaveChanges) {
      this.saveCustomizations();
    }
    
    this.emit('customization:color-changed', { colorKey, newValue, oldValue });
    return true;
  }
  
  updateTypography(category, property, newValue) {
    const typographyPath = this.getTypographyPath(category, property);
    if (!typographyPath) {
      console.warn(`⚠️ Typography path no encontrado: ${category}.${property}`);
      return false;
    }
    
    const oldValue = typographyPath.current;
    typographyPath.current = newValue;
    
    // Aplicar cambios
    this.applyTypographyChanges();
    
    // Guardar en historial
    this.saveToUndoStack('typography', `${category}.${property}`, oldValue, newValue);
    
    if (this.options.autoSaveChanges) {
      this.saveCustomizations();
    }
    
    this.emit('customization:typography-changed', { category, property, newValue, oldValue });
    return true;
  }
  
  updateLayout(category, property, newValue) {
    const layoutPath = this.getLayoutPath(category, property);
    if (!layoutPath) {
      console.warn(`⚠️ Layout path no encontrado: ${category}.${property}`);
      return false;
    }
    
    const oldValue = layoutPath.current;
    layoutPath.current = newValue;
    
    // Aplicar cambios
    this.applyLayoutChanges();
    
    // Guardar en historial
    this.saveToUndoStack('layout', `${category}.${property}`, oldValue, newValue);
    
    if (this.options.autoSaveChanges) {
      this.saveCustomizations();
    }
    
    this.emit('customization:layout-changed', { category, property, newValue, oldValue });
    return true;
  }
  
  updateAnimation(category, property, newValue) {
    const animationPath = this.getAnimationPath(category, property);
    if (!animationPath) {
      console.warn(`⚠️ Animation path no encontrado: ${category}.${property}`);
      return false;
    }
    
    const oldValue = animationPath.current || animationPath.enabled;
    
    if (typeof animationPath.enabled !== 'undefined') {
      animationPath.enabled = newValue;
    } else {
      animationPath.current = newValue;
    }
    
    // Aplicar cambios
    this.applyAnimationChanges();
    
    // Guardar en historial
    this.saveToUndoStack('animation', `${category}.${property}`, oldValue, newValue);
    
    if (this.options.autoSaveChanges) {
      this.saveCustomizations();
    }
    
    this.emit('customization:animation-changed', { category, property, newValue, oldValue });
    return true;
  }
  
  updateComponent(component, property, newValue) {
    const componentPath = this.getComponentPath(component, property);
    if (!componentPath) {
      console.warn(`⚠️ Component path no encontrado: ${component}.${property}`);
      return false;
    }
    
    const oldValue = componentPath.current;
    componentPath.current = newValue;
    
    // Aplicar cambios
    this.applyComponentChanges();
    
    // Guardar en historial
    this.saveToUndoStack('component', `${component}.${property}`, oldValue, newValue);
    
    if (this.options.autoSaveChanges) {
      this.saveCustomizations();
    }
    
    this.emit('customization:component-changed', { component, property, newValue, oldValue });
    return true;
  }
  
  // Métodos de aplicación de cambios
  applyColorChanges() {
    const root = document.documentElement;
    
    Object.entries(this.colorSystem).forEach(([key, colorData]) => {
      // Aplicar color principal
      root.style.setProperty(`--custom-${key}`, colorData.current);
      
      // Aplicar variantes si existen
      if (colorData.variants && colorData.variantValues) {
        colorData.variants.forEach(variant => {
          if (colorData.variantValues[variant]) {
            root.style.setProperty(`--custom-${key}-${variant}`, colorData.variantValues[variant]);
          }
        });
      }
    });
    
    // Aplicar a propiedades específicas del tema
    root.style.setProperty('--theme-primary', this.colorSystem.primary.current);
    root.style.setProperty('--theme-secondary', this.colorSystem.secondary.current);
    root.style.setProperty('--theme-accent', this.colorSystem.accent.current);
    root.style.setProperty('--theme-background-primary', this.colorSystem.background.current);
    root.style.setProperty('--theme-surface-primary', this.colorSystem.surface.current);
    root.style.setProperty('--theme-text-primary', this.colorSystem.text.current);
  }
  
  applyTypographyChanges() {
    const root = document.documentElement;
    
    // Fuentes
    root.style.setProperty('--custom-font-primary', this.typographySystem.fontFamily.primary.current);
    root.style.setProperty('--custom-font-heading', this.typographySystem.fontFamily.heading.current);
    
    // Tamaños
    root.style.setProperty('--custom-font-size-base', this.typographySystem.fontSize.base.current);
    
    // Línea y espaciado
    root.style.setProperty('--custom-line-height', this.typographySystem.lineHeight.current);
    root.style.setProperty('--custom-letter-spacing', this.typographySystem.letterSpacing.current);
    
    // Calcular escala tipográfica
    this.calculateTypographicScale();
  }
  
  applyLayoutChanges() {
    const root = document.documentElement;
    
    // Espaciado
    root.style.setProperty('--custom-spacing-unit', this.layoutSystem.spacing.unit.current);
    
    // Bordes
    root.style.setProperty('--custom-border-radius', this.layoutSystem.borderRadius.current);
    
    // Layout principal
    root.style.setProperty('--custom-max-width', this.layoutSystem.maxWidth.current);
    
    // Sidebar
    root.style.setProperty('--custom-sidebar-width', this.layoutSystem.sidebar.width.current);
    root.style.setProperty('--custom-sidebar-collapsed-width', this.layoutSystem.sidebar.collapsedWidth.current);
  }
  
  applyAnimationChanges() {
    const root = document.documentElement;
    
    // Duraciones
    root.style.setProperty('--custom-duration-fast', this.animationSystem.duration.fast.current);
    root.style.setProperty('--custom-duration-normal', this.animationSystem.duration.normal.current);
    root.style.setProperty('--custom-duration-slow', this.animationSystem.duration.slow.current);
    
    // Easing
    root.style.setProperty('--custom-easing', this.animationSystem.easing.current);
    
    // Efectos
    const body = document.body;
    body.classList.toggle('custom-parallax', this.animationSystem.effects.parallax.enabled);
    body.classList.toggle('custom-blur', this.animationSystem.effects.blur.enabled);
    body.classList.toggle('custom-glow', this.animationSystem.effects.glow.enabled);
    
    if (this.animationSystem.effects.blur.enabled) {
      root.style.setProperty('--custom-blur-intensity', `${this.animationSystem.effects.blur.intensity}px`);
    }
    
    if (this.animationSystem.effects.glow.enabled) {
      root.style.setProperty('--custom-glow-intensity', this.animationSystem.effects.glow.intensity);
    }
  }
  
  applyComponentChanges() {
    const body = document.body;
    
    // Botones
    body.classList.remove('custom-buttons-rounded', 'custom-buttons-square', 'custom-buttons-pill', 'custom-buttons-minimal');
    body.classList.add(`custom-buttons-${this.componentSystem.buttons.style.current}`);
    
    body.classList.remove('custom-buttons-small', 'custom-buttons-medium', 'custom-buttons-large');
    body.classList.add(`custom-buttons-${this.componentSystem.buttons.size.current}`);
    
    // Tarjetas
    body.classList.remove('custom-cards-flat', 'custom-cards-outlined', 'custom-cards-elevated', 'custom-cards-glass');
    body.classList.add(`custom-cards-${this.componentSystem.cards.style.current}`);
    
    const root = document.documentElement;
    root.style.setProperty('--custom-card-padding', this.componentSystem.cards.padding.current);
    
    // Navegación
    body.classList.remove('custom-nav-classic', 'custom-nav-modern', 'custom-nav-minimal', 'custom-nav-bold');
    body.classList.add(`custom-nav-${this.componentSystem.navigation.style.current}`);
    
    body.classList.remove('custom-nav-fixed', 'custom-nav-sticky', 'custom-nav-static');
    body.classList.add(`custom-nav-${this.componentSystem.navigation.position.current}`);
  }
  
  // Métodos de utilidad
  generateColorVariants(colorKey, baseColor) {
    const colorData = this.colorSystem[colorKey];
    if (!colorData.variants) return;
    
    colorData.variantValues = {};
    
    // Generar variantes usando HSL
    const hsl = this.hexToHsl(baseColor);
    if (!hsl) return;
    
    colorData.variants.forEach((variant, index) => {
      let lightness;
      const variantNum = parseInt(variant);
      
      if (variantNum <= 500) {
        // Variantes más claras
        lightness = 95 - (variantNum / 500) * 45;
      } else {
        // Variantes más oscuras
        lightness = 50 - ((variantNum - 500) / 400) * 40;
      }
      
      colorData.variantValues[variant] = this.hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(100, lightness)));
    });
  }
  
  hexToHsl(hex) {
    // Convertir hex a RGB
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
  
  hslToHex(h, s, l) {
    h = h % 360;
    s = s / 100;
    l = l / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r, g, b;
    
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  calculateTypographicScale() {
    const root = document.documentElement;
    const baseSize = parseFloat(this.typographySystem.fontSize.base.current);
    const scale = this.typographySystem.fontSize.scale.current;
    
    // Calcular tamaños de la escala tipográfica
    const sizes = {
      xs: baseSize * Math.pow(scale, -2),
      sm: baseSize * Math.pow(scale, -1),
      base: baseSize,
      lg: baseSize * Math.pow(scale, 1),
      xl: baseSize * Math.pow(scale, 2),
      '2xl': baseSize * Math.pow(scale, 3),
      '3xl': baseSize * Math.pow(scale, 4)
    };
    
    Object.entries(sizes).forEach(([size, value]) => {
      root.style.setProperty(`--custom-text-${size}`, `${value}rem`);
    });
  }
  
  // Navegación por paths
  getTypographyPath(category, property) {
    return this.typographySystem[category]?.[property] || this.typographySystem[category];
  }
  
  getLayoutPath(category, property) {
    return this.layoutSystem[category]?.[property] || this.layoutSystem[category];
  }
  
  getAnimationPath(category, property) {
    return this.animationSystem[category]?.[property] || this.animationSystem[category];
  }
  
  getComponentPath(component, property) {
    return this.componentSystem[component]?.[property];
  }
  
  // Sistema de deshacer/rehacer
  saveToUndoStack(type, key, oldValue, newValue) {
    this.undoStack.push({
      type,
      key,
      oldValue,
      newValue,
      timestamp: Date.now()
    });
    
    // Limitar tamaño del stack
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack = this.undoStack.slice(-this.maxUndoSteps);
    }
    
    // Limpiar redo stack
    this.redoStack = [];
  }
  
  undo() {
    if (this.undoStack.length === 0) return false;
    
    const action = this.undoStack.pop();
    this.redoStack.push(action);
    
    // Aplicar valor anterior
    this.applyUndoRedoAction(action, 'oldValue');
    
    this.emit('customization:undo', action);
    return true;
  }
  
  redo() {
    if (this.redoStack.length === 0) return false;
    
    const action = this.redoStack.pop();
    this.undoStack.push(action);
    
    // Aplicar nuevo valor
    this.applyUndoRedoAction(action, 'newValue');
    
    this.emit('customization:redo', action);
    return true;
  }
  
  applyUndoRedoAction(action, valueKey) {
    const { type, key } = action;
    const value = action[valueKey];
    
    switch (type) {
      case 'color':
        this.colorSystem[key].current = value;
        this.applyColorChanges();
        break;
      case 'typography':
        const [category, property] = key.split('.');
        const typographyPath = this.getTypographyPath(category, property);
        if (typographyPath) {
          typographyPath.current = value;
          this.applyTypographyChanges();
        }
        break;
      case 'layout':
        const [layoutCategory, layoutProperty] = key.split('.');
        const layoutPath = this.getLayoutPath(layoutCategory, layoutProperty);
        if (layoutPath) {
          layoutPath.current = value;
          this.applyLayoutChanges();
        }
        break;
      case 'animation':
        const [animCategory, animProperty] = key.split('.');
        const animPath = this.getAnimationPath(animCategory, animProperty);
        if (animPath) {
          if (typeof animPath.enabled !== 'undefined') {
            animPath.enabled = value;
          } else {
            animPath.current = value;
          }
          this.applyAnimationChanges();
        }
        break;
      case 'component':
        const [compName, compProperty] = key.split('.');
        const compPath = this.getComponentPath(compName, compProperty);
        if (compPath) {
          compPath.current = value;
          this.applyComponentChanges();
        }
        break;
    }
  }
  
  // Gestión de presets
  savePreset(name, description = '') {
    const presetId = `preset_${Date.now()}`;
    const preset = {
      id: presetId,
      name,
      description,
      colors: JSON.parse(JSON.stringify(this.colorSystem)),
      typography: JSON.parse(JSON.stringify(this.typographySystem)),
      layout: JSON.parse(JSON.stringify(this.layoutSystem)),
      animations: JSON.parse(JSON.stringify(this.animationSystem)),
      components: JSON.parse(JSON.stringify(this.componentSystem)),
      createdAt: Date.now()
    };
    
    this.presets.set(presetId, preset);
    
    // Limitar número de presets
    if (this.presets.size > this.options.maxCustomPresets) {
      const oldestPreset = Array.from(this.presets.values())
        .sort((a, b) => a.createdAt - b.createdAt)[0];
      this.presets.delete(oldestPreset.id);
    }
    
    this.savePresets();
    this.emit('customization:preset-saved', { preset });
    
    console.log(`💾 Preset guardado: ${name}`);
    return presetId;
  }
  
  loadPreset(presetId) {
    const preset = this.presets.get(presetId);
    if (!preset) {
      console.warn(`⚠️ Preset no encontrado: ${presetId}`);
      return false;
    }
    
    // Aplicar configuraciones del preset
    this.colorSystem = JSON.parse(JSON.stringify(preset.colors));
    this.typographySystem = JSON.parse(JSON.stringify(preset.typography));
    this.layoutSystem = JSON.parse(JSON.stringify(preset.layout));
    this.animationSystem = JSON.parse(JSON.stringify(preset.animations));
    this.componentSystem = JSON.parse(JSON.stringify(preset.components));
    
    // Aplicar todos los cambios
    this.applyAllChanges();
    
    this.currentPreset = presetId;
    this.emit('customization:preset-loaded', { preset });
    
    console.log(`📁 Preset cargado: ${preset.name}`);
    return true;
  }
  
  deletePreset(presetId) {
    const preset = this.presets.get(presetId);
    if (!preset) return false;
    
    this.presets.delete(presetId);
    this.savePresets();
    
    this.emit('customization:preset-deleted', { presetId });
    return true;
  }
  
  applyAllChanges() {
    this.applyColorChanges();
    this.applyTypographyChanges();
    this.applyLayoutChanges();
    this.applyAnimationChanges();
    this.applyComponentChanges();
  }
  
  // Métodos de persistencia
  saveCustomizations() {
    try {
      const customizationData = {
        colors: this.colorSystem,
        typography: this.typographySystem,
        layout: this.layoutSystem,
        animations: this.animationSystem,
        components: this.componentSystem,
        currentPreset: this.currentPreset,
        version: '1.0.0',
        timestamp: Date.now()
      };
      
      localStorage.setItem('rama9_customizations', JSON.stringify(customizationData));
      console.log('💾 Personalizaciones guardadas');
    } catch (error) {
      console.error('❌ Error guardando personalizaciones:', error);
    }
  }
  
  loadUserCustomizations() {
    try {
      const saved = localStorage.getItem('rama9_customizations');
      if (!saved) return;
      
      const customizationData = JSON.parse(saved);
      
      // Verificar versión y migrar si es necesario
      if (customizationData.version !== '1.0.0') {
        this.migrateCustomizations(customizationData);
        return;
      }
      
      // Cargar datos guardados
      if (customizationData.colors) this.colorSystem = customizationData.colors;
      if (customizationData.typography) this.typographySystem = customizationData.typography;
      if (customizationData.layout) this.layoutSystem = customizationData.layout;
      if (customizationData.animations) this.animationSystem = customizationData.animations;
      if (customizationData.components) this.componentSystem = customizationData.components;
      if (customizationData.currentPreset) this.currentPreset = customizationData.currentPreset;
      
      console.log('📁 Personalizaciones cargadas');
    } catch (error) {
      console.error('❌ Error cargando personalizaciones:', error);
    }
  }
  
  savePresets() {
    try {
      const presetsData = Array.from(this.presets.entries());
      localStorage.setItem('rama9_presets', JSON.stringify(presetsData));
    } catch (error) {
      console.error('❌ Error guardando presets:', error);
    }
  }
  
  loadPresets() {
    try {
      const saved = localStorage.getItem('rama9_presets');
      if (!saved) return;
      
      const presetsData = JSON.parse(saved);
      this.presets = new Map(presetsData);
    } catch (error) {
      console.error('❌ Error cargando presets:', error);
    }
  }
  
  migrateCustomizations(oldData) {
    console.log('🔄 Migrando personalizaciones a nueva versión...');
    // Lógica de migración para versiones futuras
    this.saveCustomizations();
  }
  
  // Métodos de interfaz
  createCustomizationUI() {
    // Crear panel de personalización
    this.createCustomizationPanel();
    
    // Crear controles de color
    this.createColorControls();
    
    // Crear controles de tipografía
    this.createTypographyControls();
    
    // Crear controles de layout
    this.createLayoutControls();
    
    // Crear controles de animación
    this.createAnimationControls();
    
    // Crear controles de componentes
    this.createComponentControls();
    
    console.log('🎛️ Interfaz de personalización creada');
  }
  
  createCustomizationPanel() {
    // Verificar si ya existe
    if (document.getElementById('customization-panel')) return;
    
    const panel = document.createElement('div');
    panel.id = 'customization-panel';
    panel.className = 'customization-panel';
    panel.innerHTML = `
      <div class="customization-header">
        <h3>🎨 Personalización</h3>
        <div class="customization-actions">
          <button id="customization-undo" title="Deshacer">↶</button>
          <button id="customization-redo" title="Rehacer">↷</button>
          <button id="customization-reset" title="Restaurar">🔄</button>
          <button id="customization-close" title="Cerrar">✕</button>
        </div>
      </div>
      <div class="customization-content">
        <div class="customization-tabs">
          <button class="tab-button active" data-tab="colors">Colores</button>
          <button class="tab-button" data-tab="typography">Tipografía</button>
          <button class="tab-button" data-tab="layout">Layout</button>
          <button class="tab-button" data-tab="animations">Animaciones</button>
          <button class="tab-button" data-tab="components">Componentes</button>
          <button class="tab-button" data-tab="presets">Presets</button>
        </div>
        <div class="customization-panels">
          <div id="colors-panel" class="panel active"></div>
          <div id="typography-panel" class="panel"></div>
          <div id="layout-panel" class="panel"></div>
          <div id="animations-panel" class="panel"></div>
          <div id="components-panel" class="panel"></div>
          <div id="presets-panel" class="panel"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Configurar eventos del panel
    this.setupPanelEvents();
  }
  
  setupPanelEvents() {
    // Eventos de pestañas
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });
    
    // Eventos de acciones
    document.getElementById('customization-undo')?.addEventListener('click', () => this.undo());
    document.getElementById('customization-redo')?.addEventListener('click', () => this.redo());
    document.getElementById('customization-reset')?.addEventListener('click', () => this.resetToDefaults());
    document.getElementById('customization-close')?.addEventListener('click', () => this.hideCustomizationPanel());
  }
  
  switchTab(tabName) {
    // Actualizar botones de pestañas
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    
    // Actualizar paneles
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${tabName}-panel`)?.classList.add('active');
  }
  
  createColorControls() {
    const panel = document.getElementById('colors-panel');
    if (!panel) return;
    
    let html = '<div class="control-group">';
    
    Object.entries(this.colorSystem).forEach(([key, colorData]) => {
      html += `
        <div class="color-control">
          <label>${colorData.name}</label>
          <div class="color-input-group">
            <input type="color" 
                   id="color-${key}" 
                   value="${colorData.current}"
                   data-color-key="${key}">
            <input type="text" 
                   value="${colorData.current}"
                   data-color-key="${key}"
                   class="color-text-input">
            <button class="reset-color" data-color-key="${key}">🔄</button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    panel.innerHTML = html;
    
    // Configurar eventos de color
    this.setupColorEvents();
  }
  
  setupColorEvents() {
    document.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const colorKey = e.target.dataset.colorKey;
        const newValue = e.target.value;
        this.updateColor(colorKey, newValue);
        
        // Sincronizar input de texto
        const textInput = document.querySelector(`input[type="text"][data-color-key="${colorKey}"]`);
        if (textInput) textInput.value = newValue;
      });
    });
    
    document.querySelectorAll('.color-text-input').forEach(input => {
      input.addEventListener('blur', (e) => {
        const colorKey = e.target.dataset.colorKey;
        const newValue = e.target.value;
        
        if (this.isValidColor(newValue)) {
          this.updateColor(colorKey, newValue);
          
          // Sincronizar color picker
          const colorInput = document.querySelector(`input[type="color"][data-color-key="${colorKey}"]`);
          if (colorInput) colorInput.value = newValue;
        } else {
          // Restaurar valor anterior si no es válido
          e.target.value = this.colorSystem[colorKey].current;
        }
      });
    });
    
    document.querySelectorAll('.reset-color').forEach(button => {
      button.addEventListener('click', (e) => {
        const colorKey = e.target.dataset.colorKey;
        const defaultValue = this.colorSystem[colorKey].default;
        this.updateColor(colorKey, defaultValue);
        
        // Actualizar inputs
        const colorInput = document.querySelector(`input[type="color"][data-color-key="${colorKey}"]`);
        const textInput = document.querySelector(`input[type="text"][data-color-key="${colorKey}"]`);
        if (colorInput) colorInput.value = defaultValue;
        if (textInput) textInput.value = defaultValue;
      });
    });
  }
  
  createTypographyControls() {
    const panel = document.getElementById('typography-panel');
    if (!panel) return;
    
    // Implementar controles de tipografía
    panel.innerHTML = '<div class="typography-controls">Controles de tipografía en desarrollo...</div>';
  }
  
  createLayoutControls() {
    const panel = document.getElementById('layout-panel');
    if (!panel) return;
    
    // Implementar controles de layout
    panel.innerHTML = '<div class="layout-controls">Controles de layout en desarrollo...</div>';
  }
  
  createAnimationControls() {
    const panel = document.getElementById('animations-panel');
    if (!panel) return;
    
    // Implementar controles de animaciones
    panel.innerHTML = '<div class="animation-controls">Controles de animaciones en desarrollo...</div>';
  }
  
  createComponentControls() {
    const panel = document.getElementById('components-panel');
    if (!panel) return;
    
    // Implementar controles de componentes
    panel.innerHTML = '<div class="component-controls">Controles de componentes en desarrollo...</div>';
  }
  
  // Métodos de validación
  isValidColor(color) {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
    const hslRegex = /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/;
    
    return hexRegex.test(color) || rgbRegex.test(color) || hslRegex.test(color);
  }
  
  // Manejadores de eventos
  handleCustomizationChange(event) {
    const { type, category, property, value } = event.detail;
    
    switch (type) {
      case 'color':
        this.updateColor(category, value);
        break;
      case 'typography':
        this.updateTypography(category, property, value);
        break;
      case 'layout':
        this.updateLayout(category, property, value);
        break;
      case 'animation':
        this.updateAnimation(category, property, value);
        break;
      case 'component':
        this.updateComponent(category, property, value);
        break;
    }
  }
  
  handlePreviewToggle(event) {
    this.previewMode = !this.previewMode;
    document.body.classList.toggle('customization-preview', this.previewMode);
    this.emit('customization:preview-toggled', { previewMode: this.previewMode });
  }
  
  handleReset(event) {
    this.resetToDefaults();
  }
  
  handleSavePreset(event) {
    const { name, description } = event.detail;
    this.savePreset(name, description);
  }
  
  handleLoadPreset(event) {
    const { presetId } = event.detail;
    this.loadPreset(presetId);
  }
  
  handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + Z para deshacer
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    }
    
    // Ctrl/Cmd + Shift + Z para rehacer
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
      event.preventDefault();
      this.redo();
    }
    
    // Escape para cerrar panel
    if (event.key === 'Escape') {
      this.hideCustomizationPanel();
    }
  }
  
  // Métodos de utilidad pública
  resetToDefaults() {
    // Restaurar todos los sistemas a sus valores por defecto
    Object.entries(this.colorSystem).forEach(([key, colorData]) => {
      colorData.current = colorData.default;
    });
    
    this.resetTypographyToDefaults();
    this.resetLayoutToDefaults();
    this.resetAnimationToDefaults();
    this.resetComponentToDefaults();
    
    // Aplicar cambios
    this.applyAllChanges();
    
    // Limpiar historial
    this.undoStack = [];
    this.redoStack = [];
    
    // Actualizar UI
    this.updateAllControls();
    
    this.emit('customization:reset');
    console.log('🔄 Personalizaciones restauradas a valores por defecto');
  }
  
  resetTypographyToDefaults() {
    this.typographySystem.fontFamily.primary.current = this.typographySystem.fontFamily.primary.default;
    this.typographySystem.fontFamily.heading.current = this.typographySystem.fontFamily.heading.default;
    this.typographySystem.fontSize.base.current = this.typographySystem.fontSize.base.default;
    this.typographySystem.fontSize.scale.current = this.typographySystem.fontSize.scale.default;
    this.typographySystem.lineHeight.current = this.typographySystem.lineHeight.default;
    this.typographySystem.letterSpacing.current = this.typographySystem.letterSpacing.default;
  }
  
  resetLayoutToDefaults() {
    this.layoutSystem.spacing.unit.current = this.layoutSystem.spacing.unit.default;
    this.layoutSystem.spacing.scale.current = this.layoutSystem.spacing.scale.default;
    this.layoutSystem.borderRadius.current = this.layoutSystem.borderRadius.default;
    this.layoutSystem.maxWidth.current = this.layoutSystem.maxWidth.default;
    this.layoutSystem.sidebar.width.current = this.layoutSystem.sidebar.width.default;
    this.layoutSystem.sidebar.collapsedWidth.current = this.layoutSystem.sidebar.collapsedWidth.default;
  }
  
  resetAnimationToDefaults() {
    this.animationSystem.duration.fast.current = this.animationSystem.duration.fast.default;
    this.animationSystem.duration.normal.current = this.animationSystem.duration.normal.default;
    this.animationSystem.duration.slow.current = this.animationSystem.duration.slow.default;
    this.animationSystem.easing.current = this.animationSystem.easing.default;
    this.animationSystem.effects.parallax.enabled = false;
    this.animationSystem.effects.blur.enabled = true;
    this.animationSystem.effects.glow.enabled = true;
  }
  
  resetComponentToDefaults() {
    this.componentSystem.buttons.style.current = this.componentSystem.buttons.style.default;
    this.componentSystem.buttons.size.current = this.componentSystem.buttons.size.default;
    this.componentSystem.cards.style.current = this.componentSystem.cards.style.default;
    this.componentSystem.cards.padding.current = this.componentSystem.cards.padding.default;
    this.componentSystem.navigation.style.current = this.componentSystem.navigation.style.default;
    this.componentSystem.navigation.position.current = this.componentSystem.navigation.position.default;
  }
  
  updateAllControls() {
    // Actualizar controles de color
    Object.entries(this.colorSystem).forEach(([key, colorData]) => {
      const colorInput = document.querySelector(`input[type="color"][data-color-key="${key}"]`);
      const textInput = document.querySelector(`input[type="text"][data-color-key="${key}"]`);
      
      if (colorInput) colorInput.value = colorData.current;
      if (textInput) textInput.value = colorData.current;
    });
    
    // Actualizar otros controles cuando se implementen
  }
  
  showCustomizationPanel() {
    const panel = document.getElementById('customization-panel');
    if (panel) {
      panel.classList.add('visible');
      document.body.classList.add('customization-open');
    }
  }
  
  hideCustomizationPanel() {
    const panel = document.getElementById('customization-panel');
    if (panel) {
      panel.classList.remove('visible');
      document.body.classList.remove('customization-open');
    }
  }
  
  toggleCustomizationPanel() {
    const panel = document.getElementById('customization-panel');
    if (panel && panel.classList.contains('visible')) {
      this.hideCustomizationPanel();
    } else {
      this.showCustomizationPanel();
    }
  }
  
  // Sistema de eventos
  emit(eventName, data = {}) {
    const event = new CustomEvent(eventName, { detail: data });
    document.dispatchEvent(event);
  }
  
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(handler);
    
    document.addEventListener(eventName, handler);
  }
  
  off(eventName, handler) {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    
    document.removeEventListener(eventName, handler);
  }
  
  // Métodos de exportación/importación
  exportCustomizations() {
    return {
      colors: this.colorSystem,
      typography: this.typographySystem,
      layout: this.layoutSystem,
      animations: this.animationSystem,
      components: this.componentSystem,
      presets: Array.from(this.presets.entries()),
      version: '1.0.0',
      exportedAt: Date.now()
    };
  }
  
  importCustomizations(customizationData) {
    try {
      if (customizationData.colors) this.colorSystem = customizationData.colors;
      if (customizationData.typography) this.typographySystem = customizationData.typography;
      if (customizationData.layout) this.layoutSystem = customizationData.layout;
      if (customizationData.animations) this.animationSystem = customizationData.animations;
      if (customizationData.components) this.componentSystem = customizationData.components;
      if (customizationData.presets) this.presets = new Map(customizationData.presets);
      
      this.applyAllChanges();
      this.updateAllControls();
      this.saveCustomizations();
      
      this.emit('customization:imported', customizationData);
      console.log('📥 Personalizaciones importadas exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error importando personalizaciones:', error);
      return false;
    }
  }
  
  // Método de destrucción
  destroy() {
    // Remover event listeners
    this.eventHandlers.forEach((handlers, eventName) => {
      handlers.forEach(handler => {
        document.removeEventListener(eventName, handler);
      });
    });
    
    // Remover panel de personalización
    const panel = document.getElementById('customization-panel');
    if (panel) {
      panel.remove();
    }
    
    // Limpiar referencias
    this.eventHandlers.clear();
    this.presets.clear();
    this.customizations.clear();
    this.undoStack = [];
    this.redoStack = [];
    
    console.log('🗑️ CustomizationEngine destruido');
  }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomizationEngine;
} else if (typeof window !== 'undefined') {
  window.CustomizationEngine = CustomizationEngine;
}

/* ==================================================
   Estilos CSS básicos para el panel de personalización
   ================================================== */

const customizationStyles = `
.customization-panel {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100vh;
  background: var(--theme-surface-primary, #1e293b);
  border-left: 1px solid var(--theme-border, #374151);
  z-index: 10000;
  transition: right 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.customization-panel.visible {
  right: 0;
}

.customization-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--theme-border, #374151);
  background: var(--theme-background-primary, #0f172a);
}

.customization-header h3 {
  margin: 0;
  color: var(--theme-text-primary, #ffffff);
  font-size: 1.1rem;
}

.customization-actions {
  display: flex;
  gap: 0.5rem;
}

.customization-actions button {
  background: transparent;
  border: 1px solid var(--theme-border, #374151);
  color: var(--theme-text-primary, #ffffff);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.customization-actions button:hover {
  background: var(--theme-primary, #4f46e5);
}

.customization-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.customization-tabs {
  display: flex;
  border-bottom: 1px solid var(--theme-border, #374151);
  overflow-x: auto;
}

.tab-button {
  background: transparent;
  border: none;
  padding: 0.75rem 1rem;
  color: var(--theme-text-secondary, #94a3b8);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-size: 0.875rem;
}

.tab-button:hover,
.tab-button.active {
  color: var(--theme-text-primary, #ffffff);
  border-bottom-color: var(--theme-primary, #4f46e5);
}

.customization-panels {
  flex: 1;
  overflow-y: auto;
}

.panel {
  display: none;
  padding: 1rem;
}

.panel.active {
  display: block;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.color-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-control label {
  color: var(--theme-text-primary, #ffffff);
  font-size: 0.875rem;
  font-weight: 500;
}

.color-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-input-group input[type="color"] {
  width: 40px;
  height: 32px;
  border: 1px solid var(--theme-border, #374151);
  border-radius: 0.25rem;
  cursor: pointer;
}

.color-text-input {
  flex: 1;
  padding: 0.5rem;
  background: var(--theme-background-primary, #0f172a);
  border: 1px solid var(--theme-border, #374151);
  border-radius: 0.25rem;
  color: var(--theme-text-primary, #ffffff);
  font-size: 0.875rem;
}

.reset-color {
  background: transparent;
  border: 1px solid var(--theme-border, #374151);
  color: var(--theme-text-primary, #ffffff);
  padding: 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-color:hover {
  background: var(--theme-accent, #10b981);
}

body.customization-open {
  margin-right: 400px;
}

@media (max-width: 768px) {
  .customization-panel {
    width: 100vw;
    right: -100vw;
  }
  
  .customization-panel.visible {
    right: 0;
  }
  
  body.customization-open {
    margin-right: 0;
    overflow: hidden;
  }
}
`;

// Inyectar estilos
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customizationStyles;
  document.head.appendChild(styleElement);
}