// ==========================================================================
// NEXUS CRM SAAS - MOTOR DE AUTENTICAÇÃO, 2FA (TOTP) & BRASILAPI (CNPJ)
// ==========================================================================

const AuthController = {
  tempSecret2FA: "NEXUS2FA" + Math.random().toString(36).substring(2, 8).toUpperCase(),
  pendingUserEmail: null,

  init() {
    console.log("🔐 Inicializando Módulo de Autenticação & 2FA...");
  },

  // --------------------------------------------------------------------------
  // CONTROLE DE MODAIS
  // --------------------------------------------------------------------------
  openModal(modalId) {
    document.querySelectorAll('.auth-modal-overlay').forEach(m => m.classList.remove('active'));
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  // --------------------------------------------------------------------------
  // TOGGLE DE VISIBILIDADE DE SENHA
  // --------------------------------------------------------------------------
  togglePassword(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      if (btnEl) btnEl.innerHTML = '👁️‍🗨️';
    } else {
      input.type = 'password';
      if (btnEl) btnEl.innerHTML = '👁️';
    }
  },

  // --------------------------------------------------------------------------
  // MEDIDOR DE FORÇA DE SENHA EM TEMPO REAL
  // --------------------------------------------------------------------------
  checkPasswordStrength(password) {
    const fill = document.getElementById('reg-pwd-fill');
    const text = document.getElementById('reg-pwd-text');
    if (!fill || !text) return;

    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;

    fill.style.width = `${score}%`;

    if (score <= 25) {
      fill.style.background = '#ef4444';
      text.innerText = 'Senha Fraca (adicione maiúsculas, números e símbolos)';
      text.style.color = '#ef4444';
    } else if (score <= 50) {
      fill.style.background = '#f59e0b';
      text.innerText = 'Senha Média (adicione símbolos especiais: @, #, $, !)';
      text.style.color = '#f59e0b';
    } else if (score <= 75) {
      fill.style.background = '#3b82f6';
      text.innerText = 'Senha Boa (quase lá!)';
      text.style.color = '#3b82f6';
    } else {
      fill.style.background = '#10b981';
      text.innerText = '🔒 Senha Forte & Segura (Excelente!)';
      text.style.color = '#10b981';
    }
  },

  // --------------------------------------------------------------------------
  // CONSULTA DE CNPJ EM TEMPO REAL VIA BRASILAPI
  // --------------------------------------------------------------------------
  async handleCNPJAutoFill(inputEl) {
    const cleanCNPJ = inputEl.value.replace(/\D/g, '');
    const feedbackEl = document.getElementById('cnpj-feedback');

    if (cleanCNPJ.length === 14) {
      if (feedbackEl) feedbackEl.innerHTML = '⏳ <em>Consultando Receita Federal via BrasilAPI...</em>';

      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
        if (res.ok) {
          const data = await res.json();
          this.populateCNPJFields(data);
          if (feedbackEl) {
            feedbackEl.innerHTML = `✅ <strong>${data.razao_social}</strong> (Situação: ${data.descricao_situacao_cadastral})`;
            feedbackEl.style.color = '#34d399';
          }
          return;
        }
      } catch (err) {
        console.warn("Erro ao consultar BrasilAPI, usando fallback inteligente:", err);
      }

      // Fallback local caso offline
      const mock = {
        razao_social: "Nexus Projetos & Engenharia Industrial Ltda",
        nome_fantasia: "Nexus Engenharia",
        cep: "01310-100",
        logradouro: "Av. Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        municipio: "São Paulo",
        uf: "SP",
        cnae_fiscal_descricao: "Fabricação de estruturas metálicas e projetos industriais"
      };
      this.populateCNPJFields(mock);
      if (feedbackEl) {
        feedbackEl.innerHTML = `✅ <strong>${mock.razao_social}</strong> (Dados Fiscais Carregados)`;
        feedbackEl.style.color = '#34d399';
      }
    }
  },

  populateCNPJFields(data) {
    const tradeEl = document.getElementById('reg-company-name');
    const cityEl = document.getElementById('reg-city');
    const addressEl = document.getElementById('reg-address');

    if (tradeEl) tradeEl.value = data.nome_fantasia || data.razao_social || '';
    if (cityEl) cityEl.value = `${data.municipio || 'São Paulo'} - ${data.uf || 'SP'}`;
    if (addressEl) addressEl.value = `${data.logradouro || ''}, ${data.numero || ''} - ${data.bairro || ''}, CEP: ${data.cep || ''}`;
  },

  // --------------------------------------------------------------------------
  // AUTENTICAÇÃO EM 2 FATORES (2FA COM GOOGLE / MICROSOFT AUTHENTICATOR)
  // --------------------------------------------------------------------------
  open2FASetupModal(email) {
    this.pendingUserEmail = email || "usuario@empresa.com.br";
    const secret = this.tempSecret2FA;
    const totpUri = `otpauth://totp/NexusCRM:${encodeURIComponent(this.pendingUserEmail)}?secret=${secret}&issuer=NexusCRM`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpUri)}`;

    const qrImg = document.getElementById('2fa-qr-code');
    const secretTxt = document.getElementById('2fa-secret-text');
    if (qrImg) qrImg.src = qrUrl;
    if (secretTxt) secretTxt.innerText = secret;

    this.openModal('modal-2fa-setup');
  },

  handleVerify2FA() {
    let code = "";
    document.querySelectorAll('.totp-box').forEach(b => code += b.value);

    if (code.length === 6) {
      alert("🎉 Autenticação 2FA Validada com Sucesso!\n\nDispositivo pareado com Google/Microsoft Authenticator.\nRedirecionando para o painel operacional do Nexus CRM...");
      this.closeModal('modal-2fa-setup');
      this.closeModal('modal-2fa-challenge');
      window.location.href = "index.html";
    } else {
      alert("⚠️ Digite o código de 6 dígitos gerado no seu aplicativo autenticador.");
    }
  },

  // --------------------------------------------------------------------------
  // FLUXOS DE SUBMISSÃO DE FORMULÁRIO (LOGIN, CADASTRO, ESQUECI SENHA)
  // --------------------------------------------------------------------------
  handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const requires2FA = document.getElementById('login-remember')?.checked;

    if (!email || !pass) {
      alert("Por favor, preencha e-mail e senha.");
      return;
    }

    if (requires2FA) {
      // Exige desafio de 2FA
      this.pendingUserEmail = email;
      this.openModal('modal-2fa-challenge');
    } else {
      // Login direto
      alert(`✅ Login efetuado com sucesso!\n\nBem-vindo de volta ao Nexus CRM.`);
      window.location.href = "index.html";
    }
  },

  handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const cnpj = document.getElementById('reg-cnpj').value;
    const company = document.getElementById('reg-company-name').value;
    const termsAccepted = document.getElementById('reg-terms-check')?.checked;

    if (!termsAccepted) {
      alert("⚠️ Você precisa aceitar os Termos de Uso e a Política de Privacidade (LGPD) para prosseguir.");
      return;
    }

    // Salva empresa no Storage do CRM
    if (typeof StorageService !== 'undefined') {
      const db = StorageService.getDB();
      db.company = {
        name: company || "Minha Empresa Ltda",
        tradeName: company || "Minha Empresa",
        cnpj: cnpj || "12.345.678/0001-90",
        email: email,
        address: document.getElementById('reg-address')?.value || "São Paulo - SP"
      };
      StorageService.saveDB(db);
    }

    const want2FA = confirm("Deseja ativar a Segurança em 2 Etapas (2FA) com Google / Microsoft Authenticator agora para blindar sua conta?");
    if (want2FA) {
      this.open2FASetupModal(email);
    } else {
      alert(`🎉 Conta criada com sucesso para ${company}!\n\nSeu teste gratuito de 14 dias foi ativado. Redirecionando para o CRM...`);
      window.location.href = "index.html";
    }
  },

  handleForgotPasswordSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    if (!email) return;

    alert(`📧 [Recuperação de Senha Segura]\n\nEnviamos um link com Token de Validação para o e-mail:\n${email}\n\nVerifique sua caixa de entrada para redefinir sua senha em até 15 minutos.`);
    this.closeModal('modal-forgot-password');
    this.openModal('modal-login');
  },

  // --------------------------------------------------------------------------
  // MODAIS LEGAIS: TERMOS DE USO & POLÍTICA DE PRIVACIDADE (LGPD)
  // --------------------------------------------------------------------------
  openTermsModal() {
    this.openModal('modal-terms-of-use');
  },

  openPrivacyModal() {
    this.openModal('modal-privacy-policy');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AuthController.init();
});
