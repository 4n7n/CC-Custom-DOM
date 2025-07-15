/**
 * Sistema de traducción y localización
 * Maneja la carga y aplicación de diferentes idiomas en la narrativa
 */
class TranslationSystem {
  constructor() {
    this.currentLanguage = 'es';
    this.availableLanguages = ['es', 'en', 'fr'];
    this.translations = {};
    this.fallbackLanguage = 'es';
  }

  // Carga las traducciones para un idioma específico
  async loadTranslations(language) {
    try {
      const storyTranslations = await import(`../../../content/localization/${language}/community-story.json`);
      const interfaceTranslations = await import(`../../../content/localization/${language}/interface.json`);
      const audioTranslations = await import(`../../../content/localization/${language}/audio-descriptions.json`);
      
      this.translations[language] = {
        story: storyTranslations.default,
        interface: interfaceTranslations.default,
        audio: audioTranslations.default
      };
    } catch (error) {
      console.warn(`No se pudieron cargar las traducciones para ${language}:`, error);
    }
  }

  // Cambia el idioma actual
  async setLanguage(language) {
    if (this.availableLanguages.includes(language)) {
      await this.loadTranslations(language);
      this.currentLanguage = language;
      this.applyTranslations();
    }
  }

  // Obtiene una traducción específica
  getText(key, category = 'story') {
    const translation = this.translations[this.currentLanguage];
    if (translation && translation[category]) {
      return this.getNestedProperty(translation[category], key) || 
             this.getNestedProperty(this.translations[this.fallbackLanguage]?.[category], key) || 
             key;
    }
    return key;
  }

  // Aplica las traducciones a la interfaz
  applyTranslations() {
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
      const key = element.getAttribute('data-translate');
      const category = element.getAttribute('data-translate-category') || 'interface';
      element.textContent = this.getText(key, category);
    });
  }

  // Obtiene propiedades anidadas de objetos
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Obtiene los idiomas disponibles
  getAvailableLanguages() {
    return this.availableLanguages.map(lang => ({
      code: lang,
      name: this.getLanguageName(lang)
    }));
  }

  // Obtiene el nombre del idioma
  getLanguageName(code) {
    const names = {
      'es': 'Español',
      'en': 'English',
      'fr': 'Français'
    };
    return names[code] || code;
  }
}

export default TranslationSystem;