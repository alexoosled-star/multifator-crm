// ==========================================================================
// NEXUS AI COPILOT - CONTROLADOR DA INTERFACE FLUTUANTE, VOZ E MODO SPOTLIGHT
// ==========================================================================

const AICopilot = {
  isOpen: false,
  isExpanded: false,
  isSpeaking: false,
  isListening: false,
  activeTour: null,
  currentTourStepIndex: 0,
  recognition: null,
  speechSynth: window.speechSynthesis || null,
  messages: [],

  init() {
    console.log("Inicializando Nexus AI Copilot...");
    this.setupSpeechRecognition();
    this.renderInitialMessage();
    this.updateContextRadar(App ? App.currentTab : 'dashboard');
    this.startProactiveMonitor();
  },

  // --------------------------------------------------------------------------
  // CONTROLE DO PAINEL FLUTUANTE
  // --------------------------------------------------------------------------
  toggle() {
    this.isOpen = !this.isOpen;
    const panel = document.getElementById('ai-widget-panel');
    const trigger = document.getElementById('ai-floating-trigger');
    const pill = document.getElementById('ai-trigger-pill');

    if (this.isOpen) {
      panel.classList.add('active');
      if (pill) pill.style.display = 'none';
      // Foco no input
      setTimeout(() => {
        const input = document.getElementById('ai-input-field');
        if (input) input.focus();
      }, 300);
    } else {
      panel.classList.remove('active');
      if (pill) pill.style.display = 'flex';
    }
  },

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    const panel = document.getElementById('ai-widget-panel');
    const expandBtn = document.getElementById('ai-expand-btn');
    if (this.isExpanded) {
      panel.classList.add('expanded');
      if (expandBtn) expandBtn.innerHTML = '<i data-feather="minimize-2"></i>';
    } else {
      panel.classList.remove('expanded');
      if (expandBtn) expandBtn.innerHTML = '<i data-feather="maximize-2"></i>';
    }
    if (window.feather) {
      try { feather.replace(); } catch (e) {}
    }
  },

  clearChat() {
    this.messages = [];
    const container = document.getElementById('ai-messages-container');
    container.innerHTML = '';
    this.renderInitialMessage();
  },

  // --------------------------------------------------------------------------
  // CONTEXTO DE TELA & RADAR
  // --------------------------------------------------------------------------
  updateContextRadar(tab) {
    const radarTab = document.getElementById('ai-radar-tab-name');
    const chipsContainer = document.getElementById('ai-suggestions-bar');
    if (!radarTab || !chipsContainer) return;

    const tabNames = {
      dashboard: "Visão Geral",
      sellers: "Equipe Comercial",
      clients: "Clientes & Leads",
      proposals: "Propostas Sob Medida",
      orders: "Central de Pedidos",
      financial: "Financeiro & NF-e",
      company: "Minha Empresa"
    };

    radarTab.innerText = tabNames[tab] || tab;

    // Atualiza chips contextuais
    const chips = AIEngine.getContextualChips(tab);
    chipsContainer.innerHTML = chips.map(chip => `
      <button class="ai-chip" onclick="AICopilot.sendChip('${chip.replace(/'/g, "\\'")}')">
        <span>✨ ${chip}</span>
      </button>
    `).join('');
  },

  // --------------------------------------------------------------------------
  // ENVIO DE MENSAGENS E PROCESSAMENTO
  // --------------------------------------------------------------------------
  sendChip(text) {
    const input = document.getElementById('ai-input-field');
    if (input) {
      input.value = text;
      this.handleUserSubmit();
    }
  },

  async handleUserSubmit(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('ai-input-field');
    const query = input.value.trim();
    if (!query) return;

    // 1. Renderiza mensagem do usuário
    this.addMessage({ sender: 'user', text: query });
    input.value = '';

    // 2. Mostra indicador de digitação
    this.showTypingIndicator();

    // 3. Processa no motor cognitivo
    setTimeout(async () => {
      try {
        const response = await AIEngine.processQuery(query);
        this.hideTypingIndicator();
        this.renderAIResponse(response);
      } catch (err) {
        console.error("Erro no processamento da IA:", err);
        this.hideTypingIndicator();
        this.addMessage({
          sender: 'assistant',
          text: "Desculpe, tive uma oscilação momentânea no processamento. Poderia repetir?"
        });
      }
    }, 450);
  },

  showTypingIndicator() {
    const container = document.getElementById('ai-messages-container');
    const typingHTML = `
      <div id="ai-typing-box" class="ai-message assistant">
        <div class="ai-msg-avatar">AI</div>
        <div class="ai-typing-indicator">
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', typingHTML);
    container.scrollTop = container.scrollHeight;
  },

  hideTypingIndicator() {
    const el = document.getElementById('ai-typing-box');
    if (el) el.remove();
  },

  renderInitialMessage() {
    const db = StorageService.getDB();
    const userName = db.sellers?.[0]?.name || "Gestor";
    this.addMessage({
      sender: 'assistant',
      text: `👋 Olá, **${userName}**! Sou o **Nexus AI Copilot**, sua inteligência artificial e copiloto autônomo para o CRM.

Posso te guiar por todo o sistema sem necessidade de suporte humano, gerar relatórios em tempo real, analisar clientes específicos e executar comandos na aplicação!

💡 **Como posso te ajudar hoje?** Escolha uma opção rápida abaixo ou me faça qualquer pergunta:`
    });
  },

  addMessage({ sender, text, htmlExtra }) {
    const container = document.getElementById('ai-messages-container');
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Converte markdown simples (**negrito**, *italico*, listas)
    const formattedText = this.formatMarkdown(text || '');

    const msgHTML = `
      <div id="${msgId}" class="ai-message ${sender}">
        <div class="ai-msg-avatar">${sender === 'user' ? 'VC' : 'AI'}</div>
        <div class="ai-msg-content">
          <div>${formattedText}</div>
          ${htmlExtra ? `<div class="ai-extra-content">${htmlExtra}</div>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            ${sender === 'assistant' ? `
              <button class="ai-header-btn" style="width: 20px; height: 20px; font-size: 10px;" onclick="AICopilot.speakText('${this.escapeTextForSpeech(text)}')" title="Ouvir resposta">
                <i data-feather="volume-2"></i>
              </button>
            ` : '<span></span>'}
            <div class="ai-msg-time">${time}</div>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', msgHTML);
    container.scrollTop = container.scrollHeight;
    if (window.feather) {
      try { feather.replace(); } catch (e) {}
    }
  },

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/• (.*?)(<br>|$)/g, '<div style="display: flex; gap: 6px; margin: 2px 0;"><span>•</span><span>$1</span></div>');
  },

  escapeTextForSpeech(text) {
    if (!text) return '';
    return text.replace(/[#\*_`\n]/g, ' ').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  },

  // --------------------------------------------------------------------------
  // RENDERIZAÇÃO DE RESPOSTAS RICAS (DOSSIÊ, RELATÓRIO, TOUR, AÇÕES)
  // --------------------------------------------------------------------------
  renderAIResponse(res) {
    switch (res.type) {
      case 'client_dossier':
        this.renderClientDossierResponse(res);
        break;
      case 'executive_report':
        this.renderExecutiveReportResponse(res);
        break;
      case 'knowledge':
        this.renderKnowledgeResponse(res);
        break;
      case 'action':
        this.renderActionResponse(res);
        break;
      case 'agent_card':
        this.renderAgentCardResponse(res);
        break;
      default:
        this.addMessage({ sender: 'assistant', text: res.text });
        if (res.chips) {
          this.updateTemporaryChips(res.chips);
        }
    }
  },

  // Resposta de Agente Especializado
  renderAgentCardResponse(res) {
    const htmlExtra = `
      <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 12px; margin-top: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <strong style="color: #a5b4fc; font-size: 0.82rem;">🤖 ${res.agentName || 'Agente Especializado'}</strong>
          <span class="badge badge-primary" style="font-size: 0.65rem;">Swarm Hub</span>
        </div>
        ${res.actionBtn ? `
          <div style="margin-top: 10px;">
            <button class="ai-card-btn" onclick="${res.actionBtn.action}">
              ⚡ ${res.actionBtn.label}
            </button>
          </div>
        ` : ''}
      </div>
    `;

    this.addMessage({
      sender: 'assistant',
      text: `### ${res.title || 'Inteligência Especializada'}\n\n${res.text}`,
      htmlExtra: htmlExtra
    });
  },

  // Dossiê 360º do Cliente
  renderClientDossierResponse(res) {
    const c = res.client;
    const s = res.stats;

    const htmlExtra = `
      <div class="ai-client-dossier-card">
        <div class="ai-dossier-header">
          <div>
            <div class="ai-dossier-name">${c.name}</div>
            <span style="font-size: 0.72rem; color: #9ca3af;">CNPJ: ${c.cnpj} | ${c.city || 'Brasil'}</span>
          </div>
          <span class="badge badge-primary">${c.status}</span>
        </div>

        <div class="ai-dossier-stats-grid">
          <div class="ai-dossier-stat-box">
            <div class="ai-dossier-stat-label">Total Comprado (LTV)</div>
            <div class="ai-dossier-stat-val">${s.totalSpent}</div>
          </div>
          <div class="ai-dossier-stat-box">
            <div class="ai-dossier-stat-label">Saúde do Cliente</div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #fbbf24; margin-top: 2px;">${s.healthScore}</div>
          </div>
        </div>

        <div class="ai-next-action-box">
          <strong>⚡ Próxima Melhor Ação Recomendada:</strong><br>
          ${s.nextBestAction}
        </div>

        <div class="ai-dossier-actions">
          <a class="ai-card-btn success" href="https://wa.me/?text=${s.whatsappDraft}" target="_blank">
            💬 Abrir WhatsApp com Copy Pronta
          </a>
          <button class="ai-card-btn" onclick="App.navigate('proposals'); App.openNewProposalModal();">
            📄 Nova Proposta para este Cliente
          </button>
        </div>
      </div>
    `;

    this.addMessage({
      sender: 'assistant',
      text: `Aqui está o **Dossiê 360º e Análise de Oportunidade** para o cliente **${c.name}**:`,
      htmlExtra: htmlExtra
    });
  },

  // Relatório Executivo
  renderExecutiveReportResponse(res) {
    const d = res.data;

    const htmlExtra = `
      <div class="ai-report-card">
        <div class="ai-report-header">
          <span>📈 Desempenho Consolidado de Vendas</span>
          <span class="badge badge-success">Tempo Real</span>
        </div>

        <div class="ai-report-metrics">
          <div class="ai-metric-item">
            <div class="lbl">Faturamento Emitido (NF-e)</div>
            <div class="val" style="color: #34d399;">${d.totalInvoiced}</div>
          </div>
          <div class="ai-metric-item">
            <div class="lbl">A Receber no Financeiro</div>
            <div class="val" style="color: #fbbf24;">${d.totalReceivables}</div>
          </div>
          <div class="ai-metric-item">
            <div class="lbl">Ticket Médio por Pedido</div>
            <div class="val" style="color: #818cf8;">${d.avgTicket}</div>
          </div>
          <div class="ai-metric-item">
            <div class="lbl">Vendas Smartphone (Rua)</div>
            <div class="val" style="color: #38bdf8;">${d.mobileOrdersCount} ped. (${d.mobileOrdersVal})</div>
          </div>
        </div>

        <div style="margin: 10px 0; font-size: 0.78rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Taxa de Conversão de Propostas:</span>
            <strong>${d.conversionRate} (${d.totalOrders} pedidos / ${d.totalProposals} propostas)</strong>
          </div>
          <div class="ai-progress-bar-bg">
            <div class="ai-progress-bar-fill" style="width: ${d.conversionProgress}%;"></div>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px; font-size: 0.75rem; margin-top: 10px;">
          🥇 <strong>Vendedor Destaque:</strong> ${d.topSeller}<br>
          🏢 <strong>Principal Cliente:</strong> ${d.topClient}
        </div>

        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="ai-card-btn" onclick="window.print()">
            🖨️ Imprimir / Salvar PDF
          </button>
          <button class="ai-card-btn success" onclick="App.navigate('dashboard')">
            📊 Ir para Dashboard
          </button>
        </div>
      </div>
    `;

    this.addMessage({
      sender: 'assistant',
      text: `Gerei o **Relatório Executivo Instantâneo** com base em todas as transações ativas do CRM:`,
      htmlExtra: htmlExtra
    });
  },

  // Resposta de Conhecimento com Opção de Spotlight
  renderKnowledgeResponse(res) {
    let htmlExtra = '';
    if (res.guide) {
      htmlExtra = `
        <div class="ai-tour-card">
          <div class="ai-tour-title">
            <i data-feather="compass"></i>
            <span>Guia Passo a Passo Disponível</span>
          </div>
          <p style="font-size: 0.75rem; color: #d1d5db; margin-bottom: 8px;">
            ${res.guide.description}
          </p>
          <button class="ai-card-btn" onclick="AICopilot.startSpotlightTour('${res.guide.id}')">
            ✨ Mostrar na Tela (Iniciar Passo a Passo)
          </button>
        </div>
      `;
    }

    this.addMessage({
      sender: 'assistant',
      text: res.text,
      htmlExtra: htmlExtra
    });
  },

  // Resposta de Ação Autônoma
  renderActionResponse(res) {
    const htmlExtra = `
      <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); padding: 10px; border-radius: 10px; margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 0.78rem; color: #6ee7b7; font-weight: 600;">⚡ ${res.actionTag || 'Ação Concluída'}</span>
        <button class="btn btn-success btn-sm" onclick="App.renderCurrentTab()">Atualizar Tela</button>
      </div>
    `;

    this.addMessage({
      sender: 'assistant',
      text: res.text,
      htmlExtra: htmlExtra
    });

    if (res.chips) {
      this.updateTemporaryChips(res.chips);
    }
  },

  updateTemporaryChips(chips) {
    const chipsContainer = document.getElementById('ai-suggestions-bar');
    if (!chipsContainer) return;
    chipsContainer.innerHTML = chips.map(chip => `
      <button class="ai-chip" onclick="AICopilot.sendChip('${chip.replace(/'/g, "\\'")}')">
        <span>✨ ${chip}</span>
      </button>
    `).join('');
  },

  // --------------------------------------------------------------------------
  // MODO SPOTLIGHT / HOLOFOTE VISUAL INTERATIVO NA TELA
  // --------------------------------------------------------------------------
  startSpotlightTour(guideId) {
    const guide = AIKnowledgeBase.interactiveGuides[guideId];
    if (!guide || !guide.steps || guide.steps.length === 0) return;

    this.activeTour = guide;
    this.currentTourStepIndex = 0;

    // Fecha temporariamente o painel do chat para liberar a visão
    this.toggle();

    // Ativa backdrop do spotlight
    const backdrop = document.getElementById('ai-spotlight-backdrop');
    if (backdrop) backdrop.classList.add('active');

    this.showTourStep(0);
  },

  showTourStep(stepIndex) {
    if (!this.activeTour) return;
    const step = this.activeTour.steps[stepIndex];
    if (!step) {
      this.endSpotlightTour();
      return;
    }

    // 1. Navega para a aba se necessário
    if (App && App.currentTab !== step.tab) {
      App.navigate(step.tab);
    }

    setTimeout(() => {
      // 2. Remove destaques anteriores
      document.querySelectorAll('.ai-spotlight-target').forEach(el => el.classList.remove('ai-spotlight-target'));

      // 3. Localiza elemento alvo
      const target = document.querySelector(step.targetSelector);
      const tooltip = document.getElementById('ai-spotlight-tooltip');

      if (target) {
        target.classList.add('ai-spotlight-target');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const rect = target.getBoundingClientRect();
        const tooltipWidth = 320;
        
        let leftPos = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        if (leftPos < 20) leftPos = 20;
        if (leftPos + tooltipWidth > window.innerWidth - 20) leftPos = window.innerWidth - tooltipWidth - 20;

        let topPos = rect.bottom + 15;
        if (topPos + 180 > window.innerHeight) {
          topPos = Math.max(20, rect.top - 180);
        }

        tooltip.style.left = `${leftPos}px`;
        tooltip.style.top = `${topPos}px`;
      } else {
        // Posição central se o seletor não for achado diretamente
        tooltip.style.left = `calc(50% - 160px)`;
        tooltip.style.top = `30%`;
      }

      // 4. Preenche conteúdo do tooltip
      const isLast = stepIndex === this.activeTour.steps.length - 1;
      tooltip.innerHTML = `
        <div class="ai-spotlight-tooltip-header">
          <span>${step.title}</span>
          <span style="font-size: 0.7rem; color: #9ca3af;">${stepIndex + 1} de ${this.activeTour.steps.length}</span>
        </div>
        <div class="ai-spotlight-tooltip-body">
          ${step.text}
        </div>
        <div class="ai-spotlight-tooltip-footer">
          <button class="btn btn-secondary btn-sm" onclick="AICopilot.endSpotlightTour()">Pular Tour</button>
          <button class="btn btn-primary btn-sm" onclick="AICopilot.nextTourStep()">
            ${isLast ? '🎉 Concluir Tour' : 'Próximo Passo ➔'}
          </button>
        </div>
      `;

      tooltip.classList.add('active');
    }, 250);
  },

  nextTourStep() {
    this.currentTourStepIndex++;
    if (this.currentTourStepIndex >= this.activeTour.steps.length) {
      this.endSpotlightTour();
      // Reabre o chat com mensagem de parabéns
      setTimeout(() => {
        this.toggle();
        this.addMessage({
          sender: 'assistant',
          text: `🎉 **Tour Concluído!** Você finalizou o passo a passo sobre *${this.activeTour.title}*. Se precisar de mais orientações, estou aqui!`
        });
      }, 300);
    } else {
      this.showTourStep(this.currentTourStepIndex);
    }
  },

  endSpotlightTour() {
    this.activeTour = null;
    this.currentTourStepIndex = 0;

    const backdrop = document.getElementById('ai-spotlight-backdrop');
    if (backdrop) backdrop.classList.remove('active');

    const tooltip = document.getElementById('ai-spotlight-tooltip');
    if (tooltip) tooltip.classList.remove('active');

    document.querySelectorAll('.ai-spotlight-target').forEach(el => el.classList.remove('ai-spotlight-target'));
  },

  // --------------------------------------------------------------------------
  // SÍNTESE DE VOZ (TTS) & RECONHECIMENTO DE FALA (STT)
  // --------------------------------------------------------------------------
  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        const voiceBtn = document.getElementById('ai-voice-input-btn');
        if (voiceBtn) voiceBtn.classList.add('recording');
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('ai-input-field');
        if (input) {
          input.value = transcript;
          this.handleUserSubmit();
        }
      };

      this.recognition.onerror = (e) => {
        console.warn("Erro no reconhecimento de voz:", e);
        this.stopListening();
      };

      this.recognition.onend = () => {
        this.stopListening();
      };
    }
  },

  toggleVoiceInput() {
    if (!this.recognition) {
      alert("O seu navegador não possui suporte à API de Reconhecimento de Voz.");
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  },

  stopListening() {
    this.isListening = false;
    const voiceBtn = document.getElementById('ai-voice-input-btn');
    if (voiceBtn) voiceBtn.classList.remove('recording');
  },

  speakText(text) {
    if (!this.speechSynth) return;

    if (this.speechSynth.speaking) {
      this.speechSynth.cancel();
      return;
    }

    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[#\*_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;

    this.speechSynth.speak(utterance);
  },

  // --------------------------------------------------------------------------
  // MONITOR PROATIVO & INSIGHTS EM SEGUNDO PLANO
  // --------------------------------------------------------------------------
  startProactiveMonitor() {
    const checkInsights = () => {
      const insights = AIEngine.scanProactiveInsights();
      const badge = document.getElementById('ai-notification-badge');
      const pillText = document.getElementById('ai-pill-text');

      if (badge) {
        if (insights.length > 0) {
          badge.innerText = insights.length;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }

      if (pillText && insights.length > 0) {
        pillText.innerText = insights[0].title;
      } else if (pillText) {
        pillText.innerText = "Copiloto IA Ativo";
      }
    };

    // Executa imediatamente e a cada 30 segundos
    checkInsights();
    setInterval(checkInsights, 30000);
  }
};

// Auto-inicialização quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    AICopilot.init();
  }, 100);
});
