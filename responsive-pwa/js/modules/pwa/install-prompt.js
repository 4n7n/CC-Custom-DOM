// Gestor de instalación PWA
class InstallPrompt {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.installButton = null;
    this.init();
  }

  init() {
    this.checkInstallStatus();
    this.setupEventListeners();
    this.createInstallButton();
  }

  checkInstallStatus() {
    // Verificar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      return;
    }

    // Verificar para iOS
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
      return;
    }

    // Verificar instalación previa
    const wasInstalled = localStorage.getItem('pwa-installed');
    if (wasInstalled) {
      this.isInstalled = true;
    }
  }

  setupEventListeners() {
    // Capturar evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // Detectar cuando se instala
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideInstallButton();
      localStorage.setItem('pwa-installed', 'true');
      this.showInstallSuccessMessage();
    });
  }

  createInstallButton() {
    const button = document.createElement('button');
    button.className = 'install-button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
      Instalar App
    `;
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: none;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      z-index: 1000;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    `;

    button.addEventListener('click', () => this.showInstallPrompt());
    
    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.5)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
    });

    this.installButton = button;
    document.body.appendChild(button);
  }

  showInstallButton() {
    if (this.isInstalled || !this.installButton) return;

    // Verificar si debe mostrar el botón
    const installDismissed = localStorage.getItem('install-dismissed');
    const dismissedDate = localStorage.getItem('install-dismissed-date');
    
    if (installDismissed && dismissedDate) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return; // No mostrar por una semana
    }

    this.installButton.style.display = 'flex';
    
    // Animación de entrada
    setTimeout(() => {
      this.installButton.style.transform = 'translateY(0)';
      this.installButton.style.opacity = '1';
    }, 100);
  }

  hideInstallButton() {
    if (this.installButton) {
      this.installButton.style.display = 'none';
    }
  }

  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      this.showManualInstallInstructions();
      return;
    }

    const result = await this.deferredPrompt.prompt();
    
    if (result.outcome === 'accepted') {
      this.deferredPrompt = null;
      this.hideInstallButton();
    } else {
      // Usuario rechazó la instalación
      localStorage.setItem('install-dismissed', 'true');
      localStorage.setItem('install-dismissed-date', Date.now().toString());
      this.hideInstallButton();
    }
  }

  showManualInstallInstructions() {
    const modal = document.createElement('div');
    modal.className = 'install-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    `;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const instructions = isIOS ? this.getIOSInstructions() : this.getAndroidInstructions();

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        margin: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      ">
        <h3 style="margin: 0 0 16px; color: #1f2937; font-size: 18px;">
          Instalar RAMA 10
        </h3>
        <div style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
          ${instructions}
        </div>
        <button onclick="this.closest('.install-modal').remove()" style="
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          width: 100%;
        ">
          Entendido
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Cerrar con click fuera
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  getIOSInstructions() {
    return `
      <div style="text-align: center;">
        <p>Para instalar esta app en tu iPhone/iPad:</p>
        <ol style="text-align: left; margin: 16px 0; padding-left: 20px;">
          <li>Toca el botón <strong>Compartir</strong> 
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; vertical-align: middle;">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
            </svg>
          </li>
          <li>Selecciona <strong>"Añadir a pantalla de inicio"</strong></li>
          <li>Toca <strong>"Añadir"</strong></li>
        </ol>
      </div>
    `;
  }

  getAndroidInstructions() {
    return `
      <div style="text-align: center;">
        <p>Para instalar esta app en tu dispositivo Android:</p>
        <ol style="text-align: left; margin: 16px 0; padding-left: 20px;">
          <li>Toca el menú del navegador (⋮)</li>
          <li>Selecciona <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar app"</strong></li>
          <li>Confirma la instalación</li>
        </ol>
      </div>
    `;
  }

  showInstallSuccessMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    `;
    
    message.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        ¡App instalada correctamente!
      </div>
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      message.style.opacity = '0';
      message.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }

  // Método público para mostrar el prompt manualmente
  triggerInstall() {
    this.showInstallPrompt();
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.installPrompt = new InstallPrompt();
});

// Exportar para uso en otros módulos
export default InstallPrompt;