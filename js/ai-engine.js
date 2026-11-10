// ==========================================================================
// NEXUS AI COPILOT - MOTOR COGNITIVO, PROCESSAMENTO DE NLP & AÇÕES AUTÔNOMAS
// ==========================================================================

const AIEngine = {
  // Normalização de texto para busca
  normalize(str) {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  },

  // Formatação de Moeda
  formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  },

  // PROCESSADOR CENTRAL DE REQUISIÇÕES DO USUÁRIO
  async processQuery(userInput) {
    const raw = userInput.trim();
    const clean = this.normalize(raw);
    const db = StorageService.getDB();

    // 1. CHECAGEM DE AÇÕES AUTÔNOMAS DO CRM (ACTION ENGINE)
    const actionResult = this.checkActionIntents(raw, clean, db);
    if (actionResult) {
      return actionResult;
    }

    // 2. CHECAGEM DE INTENÇÕES ESPECÍFICAS DO SWARM DE AGENTES INTERNOS
    const agentResult = await this.checkSpecializedAgentIntents(raw, clean, db);
    if (agentResult) {
      return agentResult;
    }

    // 3. CHECAGEM DE CONSULTA ESPECÍFICA A CLIENTES (DOSSIÊ 360º)
    const clientResult = this.checkClientQuery(clean, db);
    if (clientResult) {
      return clientResult;
    }

    // 4. CHECAGEM DE RELATÓRIOS EXECUTIVOS & ANÁLISES
    const reportResult = this.checkReportQuery(clean, db);
    if (reportResult) {
      return reportResult;
    }

    // 5. CHECAGEM DE BASE DE CONHECIMENTO & SUPORTE / ONBOARDING
    const faqResult = this.checkKnowledgeBase(clean);
    if (faqResult) {
      return faqResult;
    }

    // 6. RESPOSTA INTELIGENTE PADRÃO / CONTEXTUAL
    return {
      type: "general",
      text: `Olá! Sou o **Nexus AI Copilot**, seu assistente inteligente e analista cognitivo.

Estou conectado aos **5 Agentes Especializados do Swarm**:
- 📐 **Engenharia & Custos**: Calcule custos e Lista de Materiais (BOM) de projetos sob medida.
- 🎯 **SDR & BrasilAPI**: Consulte e enriqueça CNPJs em tempo real na Receita Federal.
- 🧾 **Auditor Fiscal**: Classifique NCM, CFOP e valide conformidade com a SEFAZ.
- 💵 **Financeiro & Pix**: Gere cobranças com QR Code Pix EMV do Banco Central.
- 📍 **Logística de Campo**: Roteirize visitas de vendedores externos por geolocalização.

Como posso te ajudar agora?`,
      chips: ["Central de Agentes IA", "Consultar CNPJ BrasilAPI", "Calcular BOM de Galpão", "Gerar Cobrança Pix", "Relatório de Vendas", "Abrir Simulador Mobile"]
    };
  },

  // --------------------------------------------------------------------------
  // 1. MOTOR DE AÇÕES AUTÔNOMAS
  // --------------------------------------------------------------------------
  checkActionIntents(raw, clean, db) {
    // Ação: Abrir Simulador Mobile
    if (clean.includes("simulador") || clean.includes("app mobile") || clean.includes("vendedor de rua") || clean.includes("abrir mobile")) {
      setTimeout(() => {
        if (typeof App !== 'undefined' && App.openMobileSimulator) {
          App.openMobileSimulator();
        }
      }, 600);
      return {
        type: "action",
        title: "📱 Simulador Mobile Aberto",
        text: `Acabei de abrir o **Simulador do Vendedor de Rua (Mobile App)** para você! Você pode lançar pedidos de campo e projetos sob medida diretamente na interface de smartphone.`,
        actionTag: "Simulador Aberto com Sucesso"
      };
    }

    // Ação: Navegação Rápida
    const navMapping = {
      dashboard: ["ir para dashboard", "abrir dashboard", "ver dashboard", "visao geral", "ir para inicio", "tela inicial"],
      sellers: ["ir para vendedores", "abrir vendedores", "ver vendedores", "equipe comercial"],
      clients: ["ir para clientes", "abrir clientes", "ver clientes", "base de leads"],
      proposals: ["ir para propostas", "abrir propostas", "ver propostas", "orcamentos"],
      orders: ["ir para pedidos", "abrir pedidos", "ver pedidos", "central de pedidos"],
      financial: ["ir para financeiro", "abrir financeiro", "ver financeiro", "contas a receber", "faturamento"],
      company: ["ir para empresa", "abrir empresa", "ver empresa", "configurar empresa", "dados da empresa"]
    };

    for (const [tab, triggers] of Object.entries(navMapping)) {
      if (triggers.some(t => clean.includes(t))) {
        setTimeout(() => {
          if (typeof App !== 'undefined' && App.navigate) {
            App.navigate(tab);
          }
        }, 400);
        return {
          type: "action",
          title: "🚀 Navegação Concluída",
          text: `Naveguei automaticamente para a tela de **${tab.toUpperCase()}** no CRM!`,
          actionTag: `Navegado para ${tab}`
        };
      }
    }

    // Ação: Cadastrar Cliente
    // Exemplo: "cadastre o cliente XYZ, cnpj 123, contato Carlos"
    if (clean.startsWith("cadastre o cliente") || clean.startsWith("cadastrar cliente") || clean.startsWith("criar cliente") || clean.startsWith("novo cliente")) {
      let clientName = raw.replace(/cadastre o cliente|cadastrar cliente|criar cliente|novo cliente/gi, '').split(',')[0].trim();
      clientName = clientName.replace(/^[:\-\s]+/, '');

      if (clientName.length > 2) {
        // Extrai possíveis CNPJ e contato se informados
        const cnpjMatch = raw.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
        const cnpj = cnpjMatch ? cnpjMatch[0] : "Não informado";
        
        const newClient = StorageService.addClient({
          name: clientName,
          cnpj: cnpj,
          contact: "Contato Cadastrado via IA",
          email: `${this.normalize(clientName).replace(/\s+/g, '')}@empresa.com.br`,
          phone: "(11) 99000-1122",
          city: "São Paulo - SP",
          status: "Novo Lead"
        });

        // Atualiza a visualização se estiver na aba clients
        if (typeof App !== 'undefined') {
          if (App.currentTab === 'clients') App.renderCurrentTab();
          else App.navigate('clients');
        }

        return {
          type: "action",
          title: "✅ Cliente Cadastrado com Sucesso!",
          text: `Cadastrei o cliente **${newClient.name}** com status *Novo Lead* na base de dados do CRM.
          
- **CNPJ:** ${newClient.cnpj}
- **E-mail Provisório:** ${newClient.email}
- **Status:** Novo Lead`,
          actionTag: "Cliente Criado Autonomamente",
          chips: [`Ver dados de ${newClient.name}`, "Cadastrar outro cliente", "Criar proposta para ele"]
        };
      }
    }

    // Ação: Cadastrar Vendedor
    // Exemplo: "cadastre o vendedor Roberto Silva com 6% de comissao"
    if (clean.startsWith("cadastre o vendedor") || clean.startsWith("cadastrar vendedor") || clean.startsWith("criar vendedor") || clean.startsWith("novo vendedor")) {
      let sellerName = raw.replace(/cadastre o vendedor|cadastrar vendedor|criar vendedor|novo vendedor/gi, '').split(',')[0].trim();
      sellerName = sellerName.replace(/^[:\-\s]+/, '');

      const commMatch = clean.match(/(\d+([\.,]\d+)?)%/);
      const commissionRate = commMatch ? parseFloat(commMatch[1].replace(',', '.')) : 5.0;
      const isRua = clean.includes("rua") || clean.includes("externo") || clean.includes("campo");

      if (sellerName.length > 2) {
        const newSeller = StorageService.addSeller({
          name: sellerName,
          type: isRua ? "Vendedor Externo (Rua)" : "Vendedor Interno",
          commissionRate: commissionRate,
          phone: "(11) 98000-0000",
          email: `${this.normalize(sellerName).replace(/\s+/g, '')}@nexus.com.br`
        });

        if (typeof App !== 'undefined') {
          if (App.currentTab === 'sellers') App.renderCurrentTab();
          else App.navigate('sellers');
        }

        return {
          type: "action",
          title: "🎉 Consultor Comercial Cadastrado!",
          text: `O vendedor **${newSeller.name}** foi inserido com sucesso na equipe comercial.
          
- **Tipo:** ${newSeller.type}
- **Comissão:** ${newSeller.commissionRate}%
- **Total de Vendas Inicial:** R$ 0,00`,
          actionTag: "Vendedor Criado Autonomamente"
        };
      }
    }

    return null;
  },

  // --------------------------------------------------------------------------
  // ROTEADOR DE AGENTES ESPECIALIZADOS DO SWARM
  // --------------------------------------------------------------------------
  async checkSpecializedAgentIntents(raw, clean, db) {
    // 1. Agente SDR & BrasilAPI (CNPJ)
    const cnpjRegex = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/;
    const hasCNPJ = clean.match(cnpjRegex);
    if ((clean.includes("brasilapi") || clean.includes("receita federal") || clean.includes("enriquecer") || clean.includes("consultar cnpj") || hasCNPJ) && typeof AgentPipelineGuardian !== 'undefined') {
      const cnpjToQuery = hasCNPJ ? hasCNPJ[0] : (db.clients[0]?.cnpj || "45.123.890/0001-12");
      const enriched = await AgentPipelineGuardian.enrichCNPJ(cnpjToQuery);

      if (enriched) {
        return {
          type: "agent_card",
          agentName: "SDR & Guardião do Funil (BrasilAPI)",
          title: `🏛️ Enriquecimento Oficial Receita Federal: ${enriched.razaoSocial}`,
          text: `Consultei a base da Receita Federal em tempo real para o CNPJ **${enriched.cnpj}**:

- **Razão Social:** ${enriched.razaoSocial}
- **Nome Fantasia:** ${enriched.nomeFantasia}
- **Situação Cadastral:** ✅ ${enriched.situacao}
- **CNAE Principal:** ${enriched.cnaePrincipal}
- **Capital Social:** ${enriched.capitalSocial}
- **Endereço Fiscal:** ${enriched.endereco}
- **Sócios / QSA:** ${enriched.socios.join(' | ') || 'Não informado'}`,
          actionBtn: { label: "Navegar para Clientes", action: "App.navigate('clients')" }
        };
      }
    }

    // 2. Agente Orçamentista & Engenharia de Custos (BOM)
    if (clean.includes("bom") || clean.includes("orcamentista") || clean.includes("calcular custo") || clean.includes("margem de lucro") || clean.includes("custo de engenharia") || clean.includes("decompor projeto")) {
      if (typeof AgentCostEstimator !== 'undefined') {
        const desc = raw.replace(/calcule o custo de|calcular custo|bom de|margem de/gi, '').trim() || "Fabricação Sob Medida de Galpão Industrial 15x30m";
        const analysis = AgentCostEstimator.analyzeCustomProject(desc, 28000, 1);

        return {
          type: "agent_card",
          agentName: "Engenharia & Custos (BOM Engine)",
          title: `📐 Auditoria de Custos & Lista de Materiais (BOM)`,
          text: `Realizei a decomposição técnica para o projeto **${analysis.projectName}**:

- **Categoria:** ${analysis.category}
- **Valor de Venda Orçado:** ${this.formatCurrency(analysis.totalPrice)}
- **Custo Total Estimado:** ${this.formatCurrency(analysis.totalCost)}
- **Lucro Bruto:** ${this.formatCurrency(analysis.grossProfit)}
- **Margem de Contribuição:** **${analysis.profitMargin}%** (${analysis.status})
- **Prazo de Fabricação:** ~${analysis.estimatedDays} dias úteis

📦 **Decomposição da Lista de Materiais (BOM):**
- Insumos & Aço: ${this.formatCurrency(analysis.bom.rawMaterials)}
- Mão de Obra de Corte/Solda: ${this.formatCurrency(analysis.bom.manufacturingLabor)}
- Engenharia & ART: ${this.formatCurrency(analysis.bom.engineeringHours)}
- Montagem em Campo: ${this.formatCurrency(analysis.bom.fieldAssembly)}
- Frete & Logística: ${this.formatCurrency(analysis.bom.freightLogistics)}`,
          actionBtn: { label: "Criar Proposta com este Projeto", action: "App.navigate('proposals'); App.openNewProposalModal();" }
        };
      }
    }

    // 3. Agente Auditor Fiscal & SEFAZ
    if (clean.includes("ncm") || clean.includes("cfop") || clean.includes("auditor fiscal") || clean.includes("imposto") || clean.includes("tributo") || clean.includes("sefaz")) {
      if (typeof AgentFiscalCompliance !== 'undefined') {
        const itemClass = AgentFiscalCompliance.classifyFiscalItem(raw, true, "SP");
        return {
          type: "agent_card",
          agentName: "Auditor Fiscal & SEFAZ Compliance",
          title: `🧾 Auditoria Fiscal & Tributária Automatizada`,
          text: `Classificação tributária oficial para o item solicitado:

- **NCM Determinado:** \`${itemClass.ncm}\`
- **CFOP de Venda:** \`${itemClass.cfop}\`
- **Categoria Tributária:** ${itemClass.fiscalCategory}
- **Regime:** Simples Nacional (CSOSN ${itemClass.cst})
- **Status SEFAZ:** Apto para emissão sem risco de rejeição na validação do schema XML.`,
          actionBtn: { label: "Ir para Financeiro & NF-e", action: "App.navigate('financial')" }
        };
      }
    }

    // 4. Agente Financeiro & Pix EMV
    if (clean.includes("gerar pix") || clean.includes("pix copia e cola") || clean.includes("qr code pix") || clean.includes("cobranca pix")) {
      if (typeof AgentBillingCashflow !== 'undefined') {
        const pix = AgentBillingCashflow.generatePixPayload({
          key: "financeiro@nexusprojetos.com.br",
          name: "Nexus Engenharia",
          city: "SAO PAULO",
          amount: 8500.00,
          txid: "PV8801"
        });

        return {
          type: "agent_card",
          agentName: "Financeiro & Cobrança Pix EMV",
          title: `💵 Cobrança Pix Oficial Padrão Banco Central`,
          text: `Gerei a cobrança Pix instantânea com TxID **${pix.txid}**:

- **Recebedor:** ${pix.receiver}
- **Valor:** ${this.formatCurrency(pix.amount)}
- **Chave Pix:** \`financeiro@nexusprojetos.com.br\`

🔑 **Código Pix Copia e Cola:**
\`\`\`
${pix.pixCode}
\`\`\``,
          actionBtn: { label: "Ver Contas a Receber", action: "App.navigate('financial')" }
        };
      }
    }

    // 5. Agente Logística & Vendas de Rua (Roteirizador)
    if (clean.includes("roteirizar") || clean.includes("visitas") || clean.includes("clientes proximos") || clean.includes("rota de campo") || clean.includes("onde ir")) {
      if (typeof AgentFieldDispatcher !== 'undefined') {
        const route = AgentFieldDispatcher.recommendFieldRoute(-23.561684, -46.655981);
        const top3 = route.slice(0, 3).map((c, i) => `${i+1}. **${c.name}** (${c.city}) - Distância: ~${c.distanceKm} km (Prioridade: ${c.status})`).join('\n');

        return {
          type: "agent_card",
          agentName: "Logística & Vendas de Rua (Geodésica Haversine)",
          title: `📍 Roteiro Otimizado de Campo para Vendedor Externo`,
          text: `Analisei as coordenadas dos clientes em relação à sua posição atual:\n\n${top3}\n\n💡 *Dica:* Clientes em status *Novo Lead* ou *Em Negociação* receberam maior peso na priorização da rota!`,
          actionBtn: { label: "📱 Abrir Smartphone de Rua", action: "App.openMobileSimulator()" }
        };
      }
    }

    // Central de Agentes Geral
    if (clean.includes("swarm") || clean.includes("central de agentes") || clean.includes("agentes internos") || clean.includes("quais agentes")) {
      return {
        type: "agent_card",
        agentName: "Nexus Agent Orchestrator",
        title: `🤖 Swarm de 5 Agentes Especializados Ativo`,
        text: `O sistema conta com 5 agentes autônomos operando em segundo plano:

1. 📐 **Engenharia & Custos**: Cálculo de BOM e margem de projetos.
2. 🎯 **SDR & Guardião do Funil**: Prevenção de Churn e consulta à BrasilAPI.
3. 🧾 **Auditor Fiscal & SEFAZ**: Classificação NCM/CFOP e conformidade tributária.
4. 💵 **Financeiro & Pix EMV**: Geração de Pix e fluxo de caixa.
5. 📍 **Logística & Vendas de Rua**: Roteirização geodésica para campo.`,
        actionBtn: { label: "Abrir Central de Agentes IA", action: "App.navigate('agents-hub')" }
      };
    }

    return null;
  },

  // --------------------------------------------------------------------------
  // 2. DOSSIÊ 360º DO CLIENTE (ANÁLISE PROFUNDA E INSIGHTS)
  // --------------------------------------------------------------------------
  checkClientQuery(clean, db) {
    // Procura por cliente correspondente
    const matchedClient = db.clients.find(c => {
      const cName = this.normalize(c.name);
      const cCnpj = this.normalize(c.cnpj);
      return clean.includes(cName) || (cName.length > 4 && clean.includes(cName.slice(0, 5))) || (cCnpj.length > 6 && clean.includes(cCnpj));
    });

    if (!matchedClient) {
      // Se perguntou "quais clientes temos?" ou "listar clientes"
      if (clean.includes("quais clientes") || clean.includes("lista de clientes") || clean.includes("todos os clientes")) {
        const listText = db.clients.map(c => `• **${c.name}** (${c.status}) - Compras: ${this.formatCurrency(c.totalSpent)}`).join('\n');
        return {
          type: "general",
          text: `👥 **Base de Clientes Cadastrada no CRM (${db.clients.length} clientes):**\n\n${listText}\n\n💡 *Dica:* Digite o nome de qualquer cliente acima para ver o Dossiê 360º completo!`
        };
      }
      return null;
    }

    // Histórico de Propostas do Cliente
    const clientProposals = db.proposals.filter(p => p.clientId === matchedClient.id || this.normalize(p.clientName).includes(this.normalize(matchedClient.name)));
    // Histórico de Pedidos do Cliente
    const clientOrders = db.orders.filter(o => o.clientId === matchedClient.id || this.normalize(o.clientName).includes(this.normalize(matchedClient.name)));
    // Histórico de NF-e
    const clientInvoices = db.invoices.filter(i => this.normalize(i.clientName).includes(this.normalize(matchedClient.name)));

    const totalOrdersVal = clientOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalSpent = matchedClient.totalSpent || totalOrdersVal;

    // Cálculo de Saúde do Cliente & Churn Risk
    let healthScore = "⭐ Excelente (Cliente Frequente)";
    let churnRisk = "Baixo Risco";
    let nextBestAction = `Enviar proposta de novos projetos ou manutenção preventiva.`;

    if (totalSpent === 0) {
      healthScore = "🟡 Lead em Aquecimento";
      churnRisk = "Médio (Sem compras realizadas)";
      nextBestAction = `Agendar reunião técnica ou ligar para apresentar projetos sob medida com condição especial.`;
    } else if (clientProposals.some(p => p.status === 'Enviada')) {
      healthScore = "🔥 Oportunidade Quente";
      churnRisk = "Baixo";
      nextBestAction = `Fazer follow-up via WhatsApp sobre a proposta pendente (${clientProposals.find(p => p.status === 'Enviada')?.number || 'aberta'})!`;
    }

    // Mensagem de follow-up sugerida para WhatsApp
    const whatsappDraft = `Olá ${matchedClient.contact ? matchedClient.contact.split(' ')[0] : 'tudo bem'}! Aqui é da ${db.company.tradeName || db.company.name}. Estou entrando em contato para saber como estão seus projetos e se podemos te ajudar com nossas soluções sob medida.`;

    return {
      type: "client_dossier",
      client: matchedClient,
      stats: {
        totalSpent: this.formatCurrency(totalSpent),
        proposalsCount: clientProposals.length,
        ordersCount: clientOrders.length,
        invoicesCount: clientInvoices.length,
        healthScore: healthScore,
        churnRisk: churnRisk,
        nextBestAction: nextBestAction,
        whatsappDraft: encodeURIComponent(whatsappDraft)
      },
      proposals: clientProposals.slice(0, 3),
      orders: clientOrders.slice(0, 3)
    };
  },

  // --------------------------------------------------------------------------
  // 3. MOTOR DE RELATÓRIOS EXECUTIVOS & ANÁLISE DE KPIs
  // --------------------------------------------------------------------------
  checkReportQuery(clean, db) {
    const isReportTrigger = clean.includes("relatorio") || clean.includes("faturamento") || clean.includes("desempenho") || 
                            clean.includes("quanto faturamos") || clean.includes("ticket medio") || clean.includes("ranking") ||
                            clean.includes("melhor vendedor") || clean.includes("kpi") || clean.includes("metricas") ||
                            clean.includes("conversao") || clean.includes("contas a receber");

    if (!isReportTrigger) return null;

    // Cálculos em Tempo Real
    const totalProposals = db.proposals.length;
    const approvedProposals = db.proposals.filter(p => p.status === 'Aprovada').length;
    const conversionRate = totalProposals > 0 ? Math.round((approvedProposals / totalProposals) * 100) : 0;

    const totalOrders = db.orders.length;
    const totalOrdersVal = db.orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const avgTicket = totalOrders > 0 ? (totalOrdersVal / totalOrders) : 0;

    const totalInvoiced = db.invoices.reduce((acc, i) => acc + (i.totalValue || 0), 0);
    const totalReceivables = db.financials.filter(f => f.status === 'A Receber').reduce((acc, f) => acc + (f.amount || 0), 0);

    const mobileOrders = db.orders.filter(o => o.channel === 'Smartphone Rua');
    const mobileOrdersVal = mobileOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    // Ranking de Vendedores
    const sellersRank = [...db.sellers].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0));

    // Top Clientes
    const clientsRank = [...db.clients].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));

    return {
      type: "executive_report",
      title: "📊 Relatório Executivo & Inteligência de Vendas",
      data: {
        totalOrdersVal: this.formatCurrency(totalOrdersVal),
        totalInvoiced: this.formatCurrency(totalInvoiced),
        totalReceivables: this.formatCurrency(totalReceivables),
        avgTicket: this.formatCurrency(avgTicket),
        conversionRate: `${conversionRate}%`,
        conversionProgress: conversionRate,
        totalProposals: totalProposals,
        totalOrders: totalOrders,
        mobileOrdersCount: mobileOrders.length,
        mobileOrdersVal: this.formatCurrency(mobileOrdersVal),
        topSeller: sellersRank[0] ? `${sellersRank[0].name} (${this.formatCurrency(sellersRank[0].totalSales)})` : "Nenhum",
        topClient: clientsRank[0] ? `${clientsRank[0].name} (${this.formatCurrency(clientsRank[0].totalSpent)})` : "Nenhum",
        sellersRank: sellersRank
      }
    };
  },

  // --------------------------------------------------------------------------
  // 4. BASE DE CONHECIMENTO & SPOTLIGHT TOURS
  // --------------------------------------------------------------------------
  checkKnowledgeBase(clean) {
    // Procura na lista de FAQs
    for (const faq of AIKnowledgeBase.faqs) {
      if (faq.keywords.some(k => clean.includes(k))) {
        const guide = faq.guideId ? AIKnowledgeBase.interactiveGuides[faq.guideId] : null;
        return {
          type: "knowledge",
          text: faq.response,
          guide: guide
        };
      }
    }
    return null;
  },

  // --------------------------------------------------------------------------
  // 5. RADAR PROATIVO DE INSIGHTS (SCANNER DE OPORTUNIDADES E RISCOS)
  // --------------------------------------------------------------------------
  scanProactiveInsights() {
    const db = StorageService.getDB();
    const insights = [];

    // Pedidos pendentes de envio ao financeiro
    const pendOrders = db.orders.filter(o => o.status === 'Pendente');
    if (pendOrders.length > 0) {
      insights.push({
        id: "pend_orders",
        title: `${pendOrders.length} Pedido(s) Aguardando Financeiro`,
        text: `Há pedidos na Central aguardando envio para faturamento.`,
        actionTab: "orders",
        btnLabel: "Ver Pedidos"
      });
    }

    // Contas a faturar (NF-e)
    const pendNfe = db.financials.filter(f => f.billingStatus !== 'NF-e Emitida');
    if (pendNfe.length > 0) {
      insights.push({
        id: "pend_nfe",
        title: `${pendNfe.length} NF-e Pendente de Emissão SEFAZ`,
        text: `Fila de faturamento pronta para autorização fiscal.`,
        actionTab: "financial",
        btnLabel: "Emitir NF-e"
      });
    }

    // Propostas em Aberto
    const openProps = db.proposals.filter(p => p.status === 'Enviada' || p.status === 'Rascunho');
    if (openProps.length > 0) {
      insights.push({
        id: "open_props",
        title: `${openProps.length} Proposta(s) em Negociação`,
        text: `Orçamentos aguardando fechamento comercial com clientes.`,
        actionTab: "proposals",
        btnLabel: "Acompanhar Propostas"
      });
    }

    return insights;
  },

  // --------------------------------------------------------------------------
  // 6. SUGESTÕES CONTEXTUAIS DINÂMICAS POR TELA
  // --------------------------------------------------------------------------
  getContextualChips(currentTab) {
    switch (currentTab) {
      case 'dashboard':
        return ["📊 Relatório Geral", "Quem mais vendeu?", "Como cadastrar cliente?", "📱 Abrir App Mobile"];
      case 'sellers':
        return ["Ranking de Comissões", "Cadastrar Vendedor Externo", "Qual diferença entre Interno e Rua?"];
      case 'clients':
        return ["Como prospectar?", "Cadastrar novo Lead", "Quem são os maiores clientes?"];
      case 'proposals':
        return ["Como criar projeto sob medida?", "Propostas em aberto", "Como aprovar proposta?"];
      case 'orders':
        return ["Pedidos aguardando financeiro", "📱 Abrir Smartphone de Rua", "Total em pedidos hoje"];
      case 'financial':
        return ["Como emitir Nota Fiscal?", "Total a receber", "O que é espelho DANFE?"];
      case 'company':
        return ["Como alterar dados fiscais?", "Onde o CNPJ aparece?", "Salvar dados"];
      default:
        return ["Relatório Executivo", "Ajuda do Sistema", "Dossiê de Clientes"];
    }
  }
};
