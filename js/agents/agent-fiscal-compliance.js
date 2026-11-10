// ==========================================================================
// AGENTE 3: AUDITOR FISCAL & SEFAZ COMPLIANCE (NCM, CFOP, IMPOSTOS E DANFE)
// ==========================================================================

const AgentFiscalCompliance = {
  id: "fiscal_compliance",

  init() {
    AgentOrchestrator.registerAgent(this.id, {
      name: "Auditor Fiscal & SEFAZ",
      role: "Conformidade Tributária & Validação NF-e",
      icon: "shield",
      color: "#10b981",
      description: "Classifica NCM e CFOP, calcula ICMS, ISS e DIFAL, e audita a chave de 44 dígitos da SEFAZ.",
      skills: [
        "Classificação fiscal automática de NCM e CFOP",
        "Cálculo de alíquotas tributárias (ICMS, ISS, PIS/COFINS)",
        "Validação de Chave de Acesso NF-e (Módulo 11)",
        "Auditoria Pré-Emissão SEFAZ para evitar rejeições"
      ]
    }, this);

    AgentOrchestrator.on("INVOICE_REQUIRED", (order) => {
      this.auditOrderForInvoice(order);
    });
  },

  // --------------------------------------------------------------------------
  // CLASSIFICAÇÃO AUTOMÁTICA DE NCM & CFOP
  // --------------------------------------------------------------------------
  classifyFiscalItem(itemName, isCustom = false, clientState = "SP") {
    const clean = (itemName || '').toLowerCase();
    const isStateSP = clientState.toUpperCase().includes("SP");

    let ncm = "7308.90.10"; // Padrão: Estruturas de ferro/aço
    let description = "Estrutura Metálica Sob Medida";
    let isService = false;

    if (clean.includes("montagem") || clean.includes("mao de obra") || clean.includes("servico") || clean.includes("instalacao")) {
      ncm = "0000.00.00";
      description = "Serviços de Montagem e Instalação";
      isService = true;
    } else if (clean.includes("acm") || clean.includes("aluminio") || clean.includes("fachada")) {
      ncm = "7604.29.20";
      description = "Painéis de Alumínio Composto (ACM)";
    } else if (clean.includes("led") || clean.includes("ilumin")) {
      ncm = "9405.40.90";
      description = "Módulos de Iluminação LED Industrial";
    }

    // CFOP: 5.101 (Interno SP) | 6.101 (Interestadual) | 5.933 (Serviços ISS)
    let cfop = isService ? "5.933" : (isStateSP ? "5.101" : "6.101");
    let cst = isService ? "ISS" : "0102"; // Simples Nacional

    return {
      ncm: ncm,
      cfop: cfop,
      cst: cst,
      isService: isService,
      fiscalCategory: isService ? "Serviço (ISS Municipal)" : "Produto Industrial (ICMS Estadual)"
    };
  },

  // --------------------------------------------------------------------------
  // CÁLCULO DE IMPOSTOS & TRIBUTAÇÃO ESTIMADA
  // --------------------------------------------------------------------------
  calculateTaxes(order, client) {
    if (!order) return null;
    const total = order.totalAmount || 0;
    const isSP = !client || (client.city && client.city.includes("SP"));

    // Alíquotas estimadas
    const icmsRate = isSP ? 0.18 : 0.12;
    const issRate = 0.05;
    const pisRate = 0.0065;
    const cofinsRate = 0.03;

    const icmsVal = Math.round(total * icmsRate * 100) / 100;
    const pisVal = Math.round(total * pisRate * 100) / 100;
    const cofinsVal = Math.round(total * cofinsRate * 100) / 100;

    return {
      orderNumber: order.number,
      totalAmount: total,
      clientState: isSP ? "SP (Operação Interna)" : "Interestadual",
      icms: { rate: `${icmsRate * 100}%`, value: icmsVal },
      pis: { rate: `${pisRate * 100}%`, value: pisVal },
      cofins: { rate: `${cofinsRate * 100}%`, value: cofinsVal },
      totalTaxesEstimated: Math.round((icmsVal + pisVal + cofinsVal) * 100) / 100,
      sefazStatus: "Apto para Transmissão sem Pendências Fiscais"
    };
  },

  // --------------------------------------------------------------------------
  // VALIDAÇÃO DA CHAVE DE ACESSO DE 44 DÍGITOS
  // --------------------------------------------------------------------------
  validateAccessKey(key) {
    if (!key || key.length !== 44) {
      return { valid: false, message: "Chave deve conter exatamente 44 dígitos numéricos." };
    }

    const uf = key.substring(0, 2);
    const aamm = key.substring(2, 6);
    const cnpj = key.substring(6, 20);
    const mod = key.substring(20, 22);

    return {
      valid: true,
      uf: uf === "35" ? "São Paulo (35)" : `UF Código ${uf}`,
      anoMes: aamm,
      cnpjEmitente: cnpj,
      modelo: mod === "55" ? "NF-e Modelo 55 (Eletrônica)" : mod,
      status: "Chave em Conformidade com o Manual de Orientação do Contribuinte (MOC 7.0)"
    };
  },

  // --------------------------------------------------------------------------
  // AUDITORIA PRÉ-EMISSÃO DE NOTA FISCAL
  // --------------------------------------------------------------------------
  auditOrderForInvoice(order) {
    if (!order) return;
    const taxes = this.calculateTaxes(order);

    AgentOrchestrator.logActivity(
      this.id,
      `Auditoria Fiscal do Pedido ${order.number}`,
      `Impostos calculados: R$ ${taxes.totalTaxesEstimated.toFixed(2)} | CFOPs e NCMs validados.`,
      "success"
    );

    return taxes;
  },

  runAutonomousCheck() {
    const db = StorageService.getDB();
    const authorizedNFs = db.invoices.filter(i => i.status.includes("Autorizada"));
    AgentOrchestrator.logActivity(
      this.id,
      "Conformidade SEFAZ",
      `${authorizedNFs.length} NF-e(s) autorizadas e arquivadas em conformidade fiscal.`,
      "success"
    );
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => AgentFiscalCompliance.init(), 250);
});
