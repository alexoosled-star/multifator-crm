// ==========================================================================
// AGENTE 4: CONCILIADOR FINANCEIRO, COBRANÇA AMIGÁVEL & GERADOR PIX EMV
// ==========================================================================

const AgentBillingCashflow = {
  id: "billing_cashflow",

  init() {
    AgentOrchestrator.registerAgent(this.id, {
      name: "Financeiro & Pix",
      role: "Conciliação & Cobrança Amigável",
      icon: "dollar-sign",
      color: "#06b6d4",
      description: "Gera QR Code Pix EMV do Banco Central, projeta fluxo de caixa e automatiza régua de cobrança amigável.",
      skills: [
        "Gerador de Padrão Pix EMV (Copia e Cola + QR Code)",
        "Projeção de Fluxo de Caixa e Liquidez (30/60 dias)",
        "Régua de Cobrança Amigável Automatizada (D-3, D-0, D+3)",
        "Conciliação de Títulos e Contas a Receber"
      ]
    }, this);
  },

  // --------------------------------------------------------------------------
  // GERADOR OFICIAL DE PADRÃO PIX EMV (BR CODE BANCO CENTRAL)
  // --------------------------------------------------------------------------
  generatePixPayload({ key = "financeiro@nexusprojetos.com.br", name = "Nexus Projetos", city = "SAO PAULO", amount = 0, txid = "NEXUS001" }) {
    const formatField = (id, val) => {
      const len = String(val.length).padStart(2, '0');
      return `${id}${len}${val}`;
    };

    const cleanAmount = amount > 0 ? amount.toFixed(2) : "0.00";
    const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25);
    const cleanCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 15);
    const cleanTxid = txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || "***";

    // Montagem dos Blocos EMV
    let payload = "";
    payload += formatField("00", "01"); // Payload Format Indicator
    
    // Merchant Account Information (Pix)
    const pixAccount = formatField("00", "br.gov.bcb.pix") + formatField("01", key);
    payload += formatField("26", pixAccount);
    
    payload += formatField("52", "0000"); // Merchant Category Code
    payload += formatField("53", "986");  // Transaction Currency (BRL = 986)
    payload += formatField("54", cleanAmount); // Transaction Amount
    payload += formatField("58", "BR");   // Country Code
    payload += formatField("59", cleanName); // Merchant Name
    payload += formatField("60", cleanCity); // Merchant City
    
    // Additional Data Field Template (TxID)
    const addData = formatField("05", cleanTxid);
    payload += formatField("62", addData);

    // CRC16 Checksum
    payload += "6304";
    const crc = this.calculateCRC16(payload);
    const fullPayload = payload + crc;

    AgentOrchestrator.logActivity(
      this.id,
      "Geração de Pix EMV",
      `Pix gerado para R$ ${cleanAmount} | TxID: ${cleanTxid}`,
      "success"
    );

    return {
      pixCode: fullPayload,
      amount: amount,
      receiver: cleanName,
      txid: cleanTxid
    };
  },

  // Algoritmo CRC16-CCITT (Polinômio 0x1021) para padrão Pix
  calculateCRC16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= (str.charCodeAt(i) << 8);
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  },

  // --------------------------------------------------------------------------
  // PROJEÇÃO DE FLUXO DE CAIXA (30/60 DIAS)
  // --------------------------------------------------------------------------
  projectCashFlow() {
    const db = StorageService.getDB();
    const now = new Date();
    
    let totalAReceber = 0;
    let vencidos = 0;
    let aVencer30Dias = 0;

    db.financials.forEach(f => {
      const amount = f.amount || 0;
      if (f.status === 'A Receber') {
        totalAReceber += amount;
        const dueDate = new Date(f.dueDate);
        if (dueDate < now) {
          vencidos += amount;
        } else {
          aVencer30Dias += amount;
        }
      }
    });

    return {
      totalAReceber: totalAReceber,
      vencidos: vencidos,
      aVencer30Dias: aVencer30Dias,
      liquidezProjetada: totalAReceber - vencidos,
      health: vencidos === 0 ? "Ótima Liquidez" : "Atenção a Inadimplência"
    };
  },

  // --------------------------------------------------------------------------
  // RÉGUA DE COBRANÇA AMIGÁVEL & MENSAGEM WHATSAPP
  // --------------------------------------------------------------------------
  generateReminderMessage(clientName, orderNumber, amount, dueDate, pixCode) {
    return `Olá ${clientName}! Passando para lembrar sobre o faturamento do pedido *${orderNumber}* no valor de *${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}* com vencimento em *${dueDate}*.

Para sua comodidade, você pode pagar via Pix Copia e Cola:
\`${pixCode}\`

Qualquer dúvida, estamos à disposição!`;
  },

  runAutonomousCheck() {
    const proj = this.projectCashFlow();
    AgentOrchestrator.logActivity(
      this.id,
      "Auditoria de Fluxo de Caixa",
      `A Receber: R$ ${proj.totalAReceber.toFixed(2)} | Vencidos: R$ ${proj.vencidos.toFixed(2)} (${proj.health})`,
      proj.vencidos > 0 ? "warning" : "success"
    );
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => AgentBillingCashflow.init(), 300);
});
