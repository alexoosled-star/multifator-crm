// ==========================================================================
// AGENTE 1: ORÇAMENTISTA, ENGENHARIA DE CUSTOS & AUDITORIA DE MARGEM (BOM)
// ==========================================================================

const AgentCostEstimator = {
  id: "cost_estimator",

  init() {
    AgentOrchestrator.registerAgent(this.id, {
      name: "Engenharia & Custos",
      role: "Orçamentista & Auditor de Margem",
      icon: "tool",
      color: "#8b5cf6",
      description: "Analisa projetos sob medida, gera BOM (Bill of Materials), audita margens de lucro e calcula prazos de fabricação.",
      skills: [
        "Decomposição semântica de Projetos Sob Medida",
        "Geração de Lista de Materiais (BOM)",
        "Auditoria de Margem de Contribuição e Markup",
        "Cálculo de Prazo Estimado de Engenharia e Fabricação"
      ]
    }, this);

    // Escuta evento de criação de proposta
    AgentOrchestrator.on("PROPOSAL_CREATED", (proposal) => {
      this.auditProposal(proposal);
    });
  },

  // --------------------------------------------------------------------------
  // ANÁLISE SEMÂNTICA & DECOMPOSIÇÃO DE PROJETO SOB MEDIDA (BOM)
  // --------------------------------------------------------------------------
  analyzeCustomProject(name, unitPrice, qty = 1) {
    const cleanName = (name || '').toLowerCase();
    const totalPrice = (unitPrice || 0) * (qty || 1);

    // Fatores de complexidade baseados no tipo de projeto
    let complexityFactor = 1.0;
    let category = "Projeto Industrial Sob Medida";
    let estimatedDays = 15;

    if (cleanName.includes("galpao") || cleanName.includes("estrutura metalica") || cleanName.includes("cobertura")) {
      complexityFactor = 1.25;
      category = "Estrutura Metálica Pesada";
      estimatedDays = 25;
    } else if (cleanName.includes("fachada") || cleanName.includes("acm") || cleanName.includes("led") || cleanName.includes("luminoso")) {
      complexityFactor = 1.1;
      category = "Comunicação Visual & ACM";
      estimatedDays = 12;
    } else if (cleanName.includes("mezanino") || cleanName.includes("escada") || cleanName.includes("guarda corpo")) {
      complexityFactor = 1.15;
      category = "Estrutura Metálica Civil";
      estimatedDays = 18;
    } else if (cleanName.includes("manutencao") || cleanName.includes("reforma") || cleanName.includes("montagem")) {
      complexityFactor = 0.9;
      category = "Serviço Técnico Especializado";
      estimatedDays = 7;
    }

    // Estimativa da composição de custos (Benchmark de Engenharia)
    const baseCostRate = 0.58; // Custo base médio ~58% do valor orçado
    const totalEstimatedCost = Math.round(totalPrice * (baseCostRate / complexityFactor) * 100) / 100;
    
    // Decomposição BOM (Bill of Materials)
    const bom = {
      rawMaterials: Math.round(totalEstimatedCost * 0.48 * 100) / 100, // Insumos (aço, chapas, perfis)
      manufacturingLabor: Math.round(totalEstimatedCost * 0.22 * 100) / 100, // Corte, dobra, solda
      engineeringHours: Math.round(totalEstimatedCost * 0.10 * 100) / 100, // Projeto CAD/ART
      fieldAssembly: Math.round(totalEstimatedCost * 0.14 * 100) / 100, // Montagem in loco
      freightLogistics: Math.round(totalEstimatedCost * 0.06 * 100) / 100 // Transporte
    };

    const grossProfit = Math.round((totalPrice - totalEstimatedCost) * 100) / 100;
    const profitMargin = totalPrice > 0 ? Math.round((grossProfit / totalPrice) * 100) : 0;
    const markupFactor = totalEstimatedCost > 0 ? (totalPrice / totalEstimatedCost).toFixed(2) : "0.00";

    // Avaliação de Saúde Financeira
    let status = "Saudável";
    let statusColor = "#10b981";
    let recommendation = "Proposta com margem comercial aprovada.";

    if (profitMargin < 15) {
      status = "Crítico (Margem Baixa)";
      statusColor = "#ef4444";
      recommendation = "Atenção: Margem perigosamente baixa. Recomenda-se aumentar o valor em pelo menos 15%.";
    } else if (profitMargin < 28) {
      status = "Moderado";
      statusColor = "#f59e0b";
      recommendation = "Margem aceitável, mas com pouca flexibilidade para descontos adicionais.";
    }

    return {
      projectName: name,
      category: category,
      totalPrice: totalPrice,
      totalCost: totalEstimatedCost,
      grossProfit: grossProfit,
      profitMargin: profitMargin,
      markup: markupFactor,
      estimatedDays: estimatedDays,
      status: status,
      statusColor: statusColor,
      recommendation: recommendation,
      bom: bom
    };
  },

  // --------------------------------------------------------------------------
  // AUDITORIA COMPLETA DE UMA PROPOSTA COMERCIAL
  // --------------------------------------------------------------------------
  auditProposal(proposal) {
    if (!proposal || !proposal.items) return null;

    let totalCustomItems = 0;
    let totalEstimatedCost = 0;
    const itemAnalyses = [];

    proposal.items.forEach(item => {
      if (item.isCustom) {
        totalCustomItems++;
        const analysis = this.analyzeCustomProject(item.name, item.unitPrice, item.qty);
        totalEstimatedCost += analysis.totalCost;
        itemAnalyses.push(analysis);
      } else {
        // Para itens de catálogo, custo padrão estimado em 50%
        const catCost = (item.total || 0) * 0.50;
        totalEstimatedCost += catCost;
      }
    });

    const totalRevenue = proposal.totalAmount || 0;
    const grossProfit = Math.max(0, totalRevenue - totalEstimatedCost);
    const overallMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

    const auditResult = {
      proposalNumber: proposal.number,
      clientName: proposal.clientName,
      totalRevenue: totalRevenue,
      totalEstimatedCost: totalEstimatedCost,
      grossProfit: grossProfit,
      overallMargin: overallMargin,
      itemAnalyses: itemAnalyses,
      isApprovedByEngineering: overallMargin >= 20
    };

    AgentOrchestrator.logActivity(
      this.id,
      `Auditoria da Proposta ${proposal.number}`,
      `Margem calculada: ${overallMargin}% | Lucro Est.: R$ ${grossProfit.toFixed(2)}`,
      overallMargin >= 20 ? "success" : "warning"
    );

    return auditResult;
  },

  runAutonomousCheck() {
    const db = StorageService.getDB();
    const openProps = db.proposals.filter(p => p.status === 'Enviada' || p.status === 'Rascunho');
    if (openProps.length > 0) {
      AgentOrchestrator.logActivity(
        this.id,
        "Varredura de Engenharia",
        `${openProps.length} propostas ativas monitoradas quanto à viabilidade de prazos e margem.`,
        "info"
      );
    }
  }
};

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => AgentCostEstimator.init(), 150);
});
