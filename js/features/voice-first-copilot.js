// ==========================================================================
// PILAR 4: COPILOTO VOICE-FIRST (CRIAÇÃO DE LEADS E PROPOSTAS POR VOZ NATURAL)
// ==========================================================================

const VoiceFirstCopilot = {
  isListening: false,
  recognition: null,

  init() {
    console.log("🎙️ Inicializando Copiloto Voice-First de Campo...");
    this.setupSpeechRecognition();
  },

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.processVoiceCommand(transcript);
      };

      this.recognition.onerror = (e) => {
        console.warn("Erro no microfone Voice-First:", e);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  },

  startListening() {
    if (!this.recognition) {
      const simulatedText = prompt(
        "🎙️ [Simulador de Voz do Vendedor de Rua]\nDigite ou cole o relato da visita (ex: 'Visitei a Padaria Estrela em Campinas, falei com o Marcos, ele quer um mezanino de 8x10m por 25 mil para entrega em 20 dias'):",
        "Visitei a Padaria Estrela em Campinas, falei com o Marcos, ele quer um mezanino de 8x10m por 25 mil para entrega em 20 dias"
      );
      if (simulatedText) this.processVoiceCommand(simulatedText);
      return;
    }

    try {
      this.isListening = true;
      this.recognition.start();
      alert("🎙️ Microfone Ativado! Fale sobre a visita, cliente, projeto e valor...");
    } catch (e) {
      this.isListening = false;
    }
  },

  // PROCESSA O COMANDO DE VOZ COMPLETO E EXECUTA AS AÇÕES NO CRM
  processVoiceCommand(text) {
    console.log("🎙️ Processando áudio do vendedor:", text);
    const clean = text.toLowerCase();
    const db = StorageService.getDB();

    // 1. Extração do Nome do Cliente / Empresa
    let clientName = "Cliente Novo";
    let city = "São Paulo - SP";
    let contact = "Responsável Técnico";

    const nameMatch = text.match(/(?:visitei a|visitei o|cliente|para a|para o)\s+([A-Z][a-zA-Z0-9\s]+?)(?:,|\.|em|falando|falei|quer|com)/i);
    if (nameMatch) {
      clientName = nameMatch[1].trim();
    } else {
      // Procura se citou cliente já existente
      const existing = db.clients.find(c => clean.includes(c.name.toLowerCase()));
      if (existing) clientName = existing.name;
    }

    // Extrai cidade se citada
    if (clean.includes("campinas")) city = "Campinas - SP";
    else if (clean.includes("rio") || clean.includes("janeiro")) city = "Rio de Janeiro - RJ";
    else if (clean.includes("curitiba")) city = "Curitiba - PR";

    // Extrai contato
    const contactMatch = text.match(/(?:falei com o|falei com a|contato)\s+([A-Z][a-zA-Z]+)/i);
    if (contactMatch) contact = contactMatch[1].trim();

    // 2. Extração do Projeto Sob Medida
    let projectDesc = "Projeto Sob Medida e Serviços de Engenharia";
    if (clean.includes("galpao") || clean.includes("estrutura")) projectDesc = "Fabricação de Galpão Industrial com Cobertura";
    else if (clean.includes("mezanino")) projectDesc = "Fabricação e Montagem de Mezanino Metálico";
    else if (clean.includes("fachada") || clean.includes("acm") || clean.includes("led")) projectDesc = "Fachada Comercial em ACM com Letreiro Iluminado";

    // Medidas se citadas (ex: 8x10m, 15x30m)
    const dimMatch = text.match(/\d+x\d+m?/i);
    if (dimMatch) projectDesc += ` (${dimMatch[0]})`;

    // 3. Extração do Valor Orçado
    let price = 20000;
    const priceMatch = clean.match(/(?:por|valor de|de|orcamento de)\s+(?:r\$)?\s*(\d+(?:[\.,]\d+)?)\s*(?:mil|reais)?/i);
    if (priceMatch) {
      let num = parseFloat(priceMatch[1].replace(',', '.'));
      if (clean.includes("mil") && num < 1000) num = num * 1000;
      price = num;
    }

    // 4. Executa criação no CRM
    let client = db.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    if (!client) {
      client = StorageService.addClient({
        name: clientName,
        contact: contact,
        city: city,
        status: "Em Negociação"
      });
    }

    const seller = db.sellers[0] || { id: "sel_1", name: "Ana Clara" };

    const newProp = StorageService.createProposal({
      clientId: client.id,
      sellerId: seller.id,
      items: [
        { isCustom: true, productId: "custom", name: projectDesc, qty: 1, unitPrice: price, total: price }
      ],
      totalAmount: price,
      notes: "Proposta criada automaticamente via Copiloto Voice-First de Campo."
    });

    // 5. Calcula BOM através do Agente de Engenharia
    let bomInfo = "";
    if (typeof AgentCostEstimator !== 'undefined') {
      const bom = AgentCostEstimator.analyzeCustomProject(projectDesc, price, 1);
      bomInfo = `\n- Margem Estimada: ${bom.profitMargin}% (Status: ${bom.status})\n- Custo de Fabricação Est.: R$ ${bom.totalCost.toFixed(2)}`;
    }

    if (typeof AgentOrchestrator !== 'undefined') {
      AgentOrchestrator.logActivity(
        "orchestrator",
        "Comando Voice-First Executado",
        `Criada proposta ${newProp.number} para ${client.name} no valor de R$ ${price.toFixed(2)}.`,
        "success"
      );
    }

    alert(`🎉 [Voice-First Copilot: Sucesso Total!]\n\nÁudio Processado com Sucesso:\n- Cliente: ${client.name} (${client.city})\n- Contato: ${client.contact}\n- Projeto: ${projectDesc}\n- Valor da Proposta: R$ ${price.toFixed(2)}${bomInfo}\n- Nº da Proposta Gerada: ${newProp.number}\n\nA proposta já está salva e pronta para envio no CRM!`);

    if (typeof App !== 'undefined') {
      App.navigate('proposals');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  VoiceFirstCopilot.init();
});
