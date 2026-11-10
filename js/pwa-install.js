// ==========================================================================
// MULTIFATOR CRM SAAS - CONTROLADOR DE INSTALAÇÃO PWA (ANDROID & IOS)
// ==========================================================================

const PWAInstaller = {
  deferredPrompt: null,
  isIOS: false,
  isStandalone: false,

  init() {
    console.log("📲 Inicializando Controlador de Instalação PWA Multifator...");
    this.registerServiceWorker();
    this.detectPlatform();
    this.setupInstallPrompt();
    this.renderInstallBanner();
  },

  // REGISTRO DO SERVICE WORKER
  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((reg) => {
            console.log("✅ [PWA] Service Worker registrado com escopo:", reg.scope);
          })
          .catch((err) => {
            console.warn("Aviso no registro do Service Worker:", err);
          });
      });
    }
  },

  // DETECÇÃO DE DISPOSITIVO (ANDROID, IOS OU STANDALONE)
  detectPlatform() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    this.isIOS = /iphone|ipad|ipod/.test(userAgent);
    this.isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

    if (this.isStandalone) {
      console.log("📱 [PWA] Aplicativo rodando em Modo Nativo Standalone!");
      document.body.classList.add("pwa-standalone");
    }
  },

  // CAPTURA O EVENTO BEFOREINSTALLPROMPT (ANDROID / CHROME)
  setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log("📲 [PWA] Evento de instalação capturado.");
      this.showInstallTrigger();
    });

    window.addEventListener("appinstalled", () => {
      console.log("🎉 [PWA] Multifator CRM instalado com sucesso!");
      this.hideInstallTrigger();
      this.deferredPrompt = null;
    });
  },

  // RENDERIZA O BANNER DE INSTALAÇÃO NO TOPO OU FLUTUANTE
  renderInstallBanner() {
    if (this.isStandalone) return; // Não exibe se já estiver instalado

    const bannerHTML = `
      <div id="pwa-install-banner" class="pwa-install-banner" style="display: none;">
        <div class="pwa-banner-content">
          <div class="pwa-banner-icon">M</div>
          <div class="pwa-banner-text">
            <strong>Instalar Multifator CRM</strong>
            <span>Acesse como app nativo direto da sua tela inicial</span>
          </div>
        </div>
        <div class="pwa-banner-actions">
          <button class="btn btn-secondary btn-sm" onclick="PWAInstaller.dismissBanner()">Depois</button>
          <button class="btn btn-primary btn-sm" onclick="PWAInstaller.triggerInstall()">📲 Instalar Agora</button>
        </div>
      </div>

      <!-- MODAL GUIA PARA USUÁRIOS APPLE / IOS -->
      <div id="modal-ios-install" class="modal-overlay">
        <div class="modal-card" style="max-width: 440px; text-align: center;">
          <div class="modal-header">
            <h3>📲 Instalar no seu iPhone / iPad</h3>
            <button class="btn-close" onclick="App ? App.closeModal('modal-ios-install') : document.getElementById('modal-ios-install').classList.remove('active')">&times;</button>
          </div>
          <div class="modal-body" style="font-size: 0.9rem; line-height: 1.6; color: #e5e7eb;">
            <div style="width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #1E40AF, #00D2FF); color: #fff; font-size: 1.8rem; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; box-shadow: 0 0 20px rgba(0, 210, 255, 0.4);">
              M
            </div>
            <p>Para ter a experiência de aplicativo nativo em tela cheia no iOS:</p>
            
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem; text-align: left; margin: 1rem 0;">
              <p style="margin-bottom: 8px;">1. Toque no botão <strong>Compartilhar</strong> (<span style="font-size: 1.2rem;">⎋</span>) na barra inferior do Safari.</p>
              <p style="margin-bottom: 8px;">2. Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> (<span style="font-size: 1.1rem;">➕</span>).</p>
              <p style="margin: 0;">3. Toque em <strong>"Adicionar"</strong> no canto superior direito.</p>
            </div>

            <button class="btn btn-primary" style="width: 100%;" onclick="document.getElementById('modal-ios-install').classList.remove('active')">
              ✓ Entendido
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", bannerHTML);

    // Se for iOS e não standalone, exibe o banner após 3 segundos
    if (this.isIOS && !this.isStandalone) {
      setTimeout(() => {
        this.showInstallTrigger();
      }, 2500);
    }
  },

  showInstallTrigger() {
    const banner = document.getElementById("pwa-install-banner");
    if (banner) banner.style.display = "flex";
  },

  hideInstallTrigger() {
    const banner = document.getElementById("pwa-install-banner");
    if (banner) banner.style.display = "none";
  },

  dismissBanner() {
    this.hideInstallTrigger();
    sessionStorage.setItem("pwa_dismissed", "true");
  },

  // DISPARA O PROMPT DE INSTALAÇÃO
  async triggerInstall() {
    if (this.isIOS) {
      // Abre modal informativo para iOS
      const modal = document.getElementById("modal-ios-install");
      if (modal) modal.classList.add("active");
      return;
    }

    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`[PWA] Escolha do usuário: ${outcome}`);
      this.deferredPrompt = null;
      this.hideInstallTrigger();
    } else {
      alert("Para instalar o Multifator CRM, use o menu do seu navegador (três pontinhos ⋮) e toque em 'Adicionar à Tela Inicial' ou 'Instalar Aplicativo'.");
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  PWAInstaller.init();
});
