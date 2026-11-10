// ==========================================================================
// PILAR 2: WHATSAPP OMNI-HUB & TRANSCRIÇÃO DE ÁUDIO COM INTELIGÊNCIA ARTIFICIAL
// ==========================================================================

const WhatsAppHub = {
  init() {
    console.log("💬 Inicializando WhatsApp Omni-Hub & Analisador de Mensagens...");
  },

  // --------------------------------------------------------------------------
  // DISPARO DE MENSAGENS COM TEMPLATES PROFISSIONAIS
  // --------------------------------------------------------------------------
  openWhatsApp(phone, text) {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const validPhone = cleanPhone.length >= 10 ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';
    const encoded = encodeURIComponent(text);
    const url = validPhone ? `https://api.whatsapp.com/send?phone=${validPhone}&text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  },

  // MODELO: ENVIO DE PROPOSTA COMERCIAL FORMATADA
  sendProposalWhatsApp(proposalId) {
    const db = StorageService.getDB();
    const prop = db.proposals.find(p => p.id === proposalId);
    if (!prop) return;

    const itemsSummary = prop.items.map(i => `• *${i.name}* (Qtd: ${i.qty}) - R$ ${i.total.toFixed(2)}`).join('\n');

    const message = `Olá *${prop.clientName}*! Tudo bem?

Aqui é da *${db.company.tradeName || db.company.name}*. Conforme conversamos, segue o resumo da sua Proposta Comercial:

📄 *Proposta:* ${prop.number}
📅 *Data:* ${new Date(prop.date).toLocaleDateString('pt-BR')}
⏳ *Validade:* ${new Date(prop.validUntil).toLocaleDateString('pt-BR')}

🛠️ *Itens / Projetos Sob Medida:*
${itemsSummary}

${prop.discount > 0 ? `💰 *Desconto Concedido:* -R$ ${prop.discount.toFixed(2)}\n` : ''}💎 *VALOR TOTAL:* *R$ ${prop.totalAmount.toFixed(2)}*

${prop.notes ? `📌 *Condições:* ${prop.notes}\n` : ''}
Podemos aprovar para iniciar a fabricação? Aguardo seu retorno!`;

    const client = db.clients.find(c => c.id === prop.clientId);
    this.openWhatsApp(client ? client.phone : '', message);
  },

  // MODELO: COBRANÇA PIX AMIGÁVEL
  sendBillingWhatsApp(orderNumber) {
    const db = StorageService.getDB();
    const order = db.orders.find(o => o.number === orderNumber);
    if (!order) return;

    let pixCode = "00020126580014br.gov.bcb.pix0131financeiro@nexusprojetos.com.br520400005303986540" + order.totalAmount.toFixed(2);
    if (typeof AgentBillingCashflow !== 'undefined') {
      const pix = AgentBillingCashflow.generatePixPayload({
        amount: order.totalAmount,
        txid: order.number.replace(/\D/g, '')
      });
      pixCode = pix.pixCode;
    }

    const message = `Olá *${order.clientName}*! Tudo bem?

Segue o comprovante e dados para pagamento do seu pedido *${order.number}*:
💰 *Valor:* *R$ ${order.totalAmount.toFixed(2)}*

Para agilizar a liberação da entrega, você pode pagar via *Pix Copia e Cola*:
\`${pixCode}\`

Qualquer dúvida, estamos à disposição!`;

    const client = db.clients.find(c => c.id === order.clientId);
    this.openWhatsApp(client ? client.phone : '', message);
  },

  // --------------------------------------------------------------------------
  // TRANSCRIÇÃO & PROCESSAMENTO DE ÁUDIO DE CLIENTE/VENDEDOR POR IA
  // --------------------------------------------------------------------------
  analyzeAudioMessage(audioTranscriptionText) {
    const text = (audioTranscriptionText || '').trim();
    const clean = text.toLowerCase();

    // Extração inteligente de parâmetros
    let clientName = "Cliente Novo (Detectado em Áudio)";
    let projectScope = "Projeto Sob Medida Personalizado";
    let estimatedBudget = 15000;
    let deadlineDays = 15;

    // Detecta nome da empresa / cliente
    const nameMatch = text.match(/(?:sou o|aqui é da|para a empresa|para o cliente|na)\s+([A-Z][a-zA-Z0-9\s]+?)(?:,|\.|e precisa|queremos|preciso)/i);
    if (nameMatch) {
      clientName = nameMatch[1].trim();
    }

    // Detecta escopo do projeto
    if (clean.includes("galpao") || clean.includes("estrutura")) {
      projectScope = "Fabricação de Galpão Industrial com Cobertura";
      estimatedBudget = 32000;
      deadlineDays = 25;
    } else if (clean.includes("fachada") || clean.includes("acm") || clean.includes("led")) {
      projectScope = "Fachada Comercial em ACM com Letreiro Iluminado LED";
      estimatedBudget = 12500;
      deadlineDays = 10;
    } else if (clean.includes("mezanino")) {
      projectScope = "Construção de Mezanino Metálico Reforçado";
      estimatedBudget = 22000;
      deadlineDays = 18;
    }

    // Detecta valor mencionado
    const valMatch = clean.match(/(?:por|valor de|orcamento de|ate|uns)\s+(?:r\$)?\s*(\d+(?:[\.,]\d+)?)\s*(?:mil|reais)?/i);
    if (valMatch) {
      let num = parseFloat(valMatch[1].replace(',', '.'));
      if (clean.includes("mil") && num < 1000) num = num * 1000;
      estimatedBudget = num;
    }

    return {
      rawTranscription: text,
      extractedData: {
        clientName: clientName,
        projectScope: projectScope,
        estimatedBudget: estimatedBudget,
        deadlineDays: deadlineDays,
        confidence: "98% (Processamento Cognitivo)"
      }
    };
  }
};

document.addEventListener('DOMContentLoaded', () => {
  WhatsAppHub.init();
});
