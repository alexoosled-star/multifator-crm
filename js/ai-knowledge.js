// ==========================================================================
// NEXUS AI COPILOT - BASE DE CONHECIMENTO & GUIAS INTERATIVOS DO CRM
// ==========================================================================

const AIKnowledgeBase = {
  // GUIAS PASSO A PASSO COM COORDENADAS PARA SPOTLIGHT VISUAL
  interactiveGuides: {
    cadastrar_empresa: {
      id: "cadastrar_empresa",
      title: "Como Configurar os Dados da Minha Empresa",
      description: "Aprenda a preencher Razão Social, CNPJ, IE e dados fiscais que sairão nas propostas e notas fiscais.",
      tab: "company",
      steps: [
        {
          tab: "company",
          targetSelector: "#nav-company",
          title: "1. Acessar Menu Minha Empresa",
          text: "Clique no menu lateral 'Minha Empresa' para abrir as configurações corporativas."
        },
        {
          tab: "company",
          targetSelector: "#comp-name",
          title: "2. Razão Social & Nome Fantasia",
          text: "Informe a Razão Social completa da sua empresa e o Nome Fantasia comercial."
        },
        {
          tab: "company",
          targetSelector: "#comp-cnpj",
          title: "3. CNPJ e Inscrição Estadual (IE)",
          text: "Preencha o CNPJ válido e a Inscrição Estadual. Esses dados serão impressos no DANFE da NF-e!"
        },
        {
          tab: "company",
          targetSelector: "button[type='submit']",
          title: "4. Salvar Alterações",
          text: "Clique em 'Salvar Dados da Empresa' para persistir tudo com segurança no sistema."
        }
      ]
    },

    cadastrar_cliente: {
      id: "cadastrar_cliente",
      title: "Como Cadastrar um Novo Cliente ou Lead",
      description: "Passo a passo para registrar clientes com CNPJ, contatos comerciais e status de funil.",
      tab: "clients",
      steps: [
        {
          tab: "clients",
          targetSelector: "#nav-clients",
          title: "1. Acessar Clientes & Leads",
          text: "Navegue até a tela de 'Clientes & Leads' no menu lateral."
        },
        {
          tab: "clients",
          targetSelector: ".table-header .btn-primary",
          title: "2. Clicar em + Cadastrar Cliente",
          text: "Clique no botão azul '+ Cadastrar Cliente' para abrir o formulário."
        },
        {
          tab: "clients",
          targetSelector: "#modal-client",
          title: "3. Preencher Dados & Salvar",
          text: "Informe a Razão Social, CNPJ, Pessoa de Contato, E-mail e selecione se é 'Novo Lead' ou 'Cliente Ativo'."
        }
      ]
    },

    cadastrar_vendedor: {
      id: "cadastrar_vendedor",
      title: "Como Cadastrar Vendedores e Consultores",
      description: "Cadastre sua equipe comercial com definição de comissão e tipo de atuação (Interno ou Rua).",
      tab: "sellers",
      steps: [
        {
          tab: "sellers",
          targetSelector: "#nav-sellers",
          title: "1. Menu Vendedores & Equipe",
          text: "Clique em 'Vendedores & Equipe' para gerenciar seus representantes."
        },
        {
          tab: "sellers",
          targetSelector: ".table-header .btn-primary",
          title: "2. Botão + Cadastrar Vendedor",
          text: "Abra o modal de cadastro de novo consultor."
        },
        {
          tab: "sellers",
          targetSelector: "#modal-seller",
          title: "3. Definir Atuação e Comissão",
          text: "Escolha entre 'Vendedor Interno' ou 'Vendedor Externo (Rua)' e defina a alíquota de comissão (%) sobre as vendas."
        }
      ]
    },

    criar_proposta: {
      id: "criar_proposta",
      title: "Como Criar Propostas e Projetos Sob Medida",
      description: "Gere propostas personalizadas com itens prontos do catálogo ou projetos especiais digitados na hora.",
      tab: "proposals",
      steps: [
        {
          tab: "proposals",
          targetSelector: "#nav-proposals",
          title: "1. Menu Propostas Comerciais",
          text: "Acesse a área de orçamentos e propostas comerciais."
        },
        {
          tab: "proposals",
          targetSelector: ".table-header .btn-primary",
          title: "2. Nova Proposta",
          text: "Clique em '+ Criar Nova Proposta' para abrir o editor."
        },
        {
          tab: "proposals",
          targetSelector: "#proposal-items-container",
          title: "3. Adicionar Projetos Customizados",
          text: "Você pode adicionar itens de catálogo ou clicar em '🛠️ Projeto Sob Medida' para digitar projetos personalizados com valor livre!"
        }
      ]
    },

    faturamento_nfe: {
      id: "faturamento_nfe",
      title: "Como Faturar Pedidos e Emitir Nota Fiscal (NF-e)",
      description: "Fluxo completo desde o pedido de venda até a autorização e espelho DANFE na SEFAZ.",
      tab: "financial",
      steps: [
        {
          tab: "orders",
          targetSelector: "#nav-orders",
          title: "1. Central de Pedidos",
          text: "Verifique os pedidos pendentes e clique em '⚡ Enviar ao Financeiro'."
        },
        {
          tab: "financial",
          targetSelector: "#nav-financial",
          title: "2. Financeiro & Faturamento",
          text: "No painel financeiro, você verá as contas a receber geradas."
        },
        {
          tab: "financial",
          targetSelector: "button.btn-success",
          title: "3. Emitir NF-e (SEFAZ)",
          text: "Clique em '🧾 Emitir Nota Fiscal (NF-e)' para gerar a chave de 44 dígitos e visualizar o espelho DANFE oficial."
        }
      ]
    },

    mobile_vendedor_rua: {
      id: "mobile_vendedor_rua",
      title: "Como Utilizar o App Mobile do Vendedor de Rua",
      description: "Simulador de smartphone para representantes de campo lançarem orçamentos e pedidos offline/online.",
      tab: "dashboard",
      steps: [
        {
          tab: "dashboard",
          targetSelector: ".mobile-mode-btn",
          title: "1. Abrir Simulador Mobile",
          text: "Clique no botão verde 'Vendedor de Rua (Mobile)' no rodapé do menu lateral."
        },
        {
          tab: "dashboard",
          targetSelector: ".mobile-simulator-wrapper",
          title: "2. Interface do Smartphone",
          text: "Selecione o vendedor, escolha o cliente, digite um projeto sob medida e clique em 'Transmitir Pedido para Central'!"
        }
      ]
    }
  },

  // BASE DE PERGUNTAS FREQUENTES & RESPOSTAS INTELIGENTES
  faqs: [
    {
      keywords: ["empresa", "cnpj", "minha empresa", "dados fiscais", "razao social", "endereco"],
      guideId: "cadastrar_empresa",
      response: `🏢 **Configuração da Empresa:**
Você pode editar todos os dados da sua empresa a qualquer momento no menu **Minha Empresa**.
Lá você define a Razão Social, Nome Fantasia, CNPJ, Inscrição Estadual (IE) e endereço completo. Esses dados são sincronizados automaticamente no cabeçalho das **Propostas Comerciais** e no espelho **DANFE das Notas Fiscais Eletrônicas**.

💡 *Dica:* Clique em **"Mostrar na Tela"** abaixo para que eu te guie passo a passo!`
    },
    {
      keywords: ["cliente", "clientes", "lead", "leads", "cadastrar cliente", "novo cliente", "prospect"],
      guideId: "cadastrar_cliente",
      response: `👥 **Gestão de Clientes & Leads:**
No menu **Clientes & Leads**, você pode:
1. Cadastrar novos clientes com Razão Social, CNPJ/CPF, Telefone, E-mail e Cidade.
2. Acompanhar o status no funil (*Novo Lead*, *Em Negociação*, *Cliente Ativo*).
3. Ver o Total Gasto (LTV) acumulado de cada comprador.

💡 *Dica:* Você também pode me pedir diretamente no chat: *"Cadastre o cliente Padaria Boa Vista, CNPJ 11.222.333/0001-99"* que eu cadastro para você!`
    },
    {
      keywords: ["vendedor", "vendedores", "comissao", "equipe", "consultor", "representante", "rua"],
      guideId: "cadastrar_vendedor",
      response: `👨‍💼 **Vendedores & Equipe Comercial:**
O sistema suporta múltiplos tipos de atuação com cálculo automático de comissão:
- **Vendedor Interno:** Focado no atendimento central, propostas de balcão e telefone.
- **Vendedor Externo (Rua):** Utiliza o simulador mobile para registrar pedidos diretamente na visita aos clientes.
- **Taxa de Comissão (%):** Configurada individualmente por consultor. O faturamento e as comissões acumuladas são atualizados em tempo real conforme as notas e pedidos são aprovados.`
    },
    {
      keywords: ["proposta", "propostas", "orcamento", "orcamentos", "sob medida", "projeto", "customizado"],
      guideId: "criar_proposta",
      response: `📄 **Propostas & Projetos Sob Medida:**
O Nexus CRM é especializado em vendas customizadas:
- Você pode combinar **Itens de Catálogo** com **Projetos Sob Medida** digitados na hora (com descrição livre e valor personalizado).
- Pode aplicar desconto global em R$ e definir a validade do orçamento.
- Com 1 clique, você pode **Enviar por E-mail** ou **Aprovar e Gerar Pedido de Venda** automaticamente!`
    },
    {
      keywords: ["pedido", "pedidos", "pedido de venda", "central de pedidos"],
      guideId: null,
      response: `📦 **Central de Pedidos de Venda:**
Todos os pedidos gerados a partir de propostas aprovadas ou transmitidos pelo app de campo (Smartphone do vendedor de rua) caem centralizados na tela de **Pedidos de Venda**.
A partir de lá, o gestor pode revisar e clicar em **"⚡ Enviar ao Financeiro"** para iniciar a fila de faturamento e emissão de NF-e.`
    },
    {
      keywords: ["nfe", "nf-e", "nota fiscal", "danfe", "sefaz", "faturamento", "financeiro", "contas a receber"],
      guideId: "faturamento_nfe",
      response: `🧾 **Financeiro, Faturamento & Emissão de NF-e:**
1. Quando um pedido é enviado ao financeiro, um título de Contas a Receber é criado com vencimento automático de 30 dias.
2. Na aba **Financeiro & NF-e**, basta clicar em **"🧾 Emitir Nota Fiscal (NF-e)"**.
3. O sistema gera a chave de acesso de 44 dígitos e o protocolo oficial da SEFAZ, permitindo abrir o **Espelho DANFE** completo com discriminação dos itens sob medida e tributos!`
    },
    {
      keywords: ["mobile", "celular", "smartphone", "rua", "vendedor externo", "app", "campo"],
      guideId: "mobile_vendedor_rua",
      response: `📱 **App Mobile do Vendedor de Rua:**
O Nexus CRM possui um simulador integrado de Smartphone para equipes de campo.
Com ele, o vendedor na rua pode:
- Selecionar o cliente que está visitando;
- Digitar projetos sob medida na hora ou escolher itens do catálogo;
- Calcular o total instantaneamente;
- Transmitir o pedido via internet para a central do CRM com 1 clique!`
    },
    {
      keywords: ["relatorio", "relatorios", "metrica", "kpi", "faturamento", "dashboard", "grafico", "ranking"],
      guideId: null,
      response: `📊 **Relatórios & Análise de Desempenho:**
O sistema calcula métricas vitais em tempo real:
- Volume Geral de Vendas (VGV) & Ticket Médio
- Taxa de Conversão de Propostas em Pedidos
- Ranking de Vendedores e Comissões acumuladas
- Faturamento Autorizado SEFAZ vs Contas a Receber

💡 *Dica:* Experimente me perguntar: *"Gere um relatório executivo"* ou *"Quem é o vendedor que mais vendeu?"* para ver os dados calculados instantaneamente!`
    },
    {
      keywords: ["agentes", "swarm", "central de agentes", "agente interno", "automacao", "orquestrador"],
      guideId: null,
      response: `🤖 **Central de Agentes Autônomos (Multi-Agent Swarm Hub):**
O sistema conta com 5 agentes especializados operando em segundo plano:
1. 📐 **Engenharia & Custos**: Cálculo de BOM, insumos e margens de lucro.
2. 🎯 **SDR & Guardião do Funil**: Prevenção de Churn e consulta em tempo real à **BrasilAPI**.
3. 🧾 **Auditor Fiscal & SEFAZ**: Classificação NCM/CFOP e conformidade tributária.
4. 💵 **Financeiro & Pix EMV**: Geração de QR Code Pix oficial e fluxo de caixa.
5. 📍 **Logística & Vendas de Rua**: Roteirização geodésica (Haversine) para equipes de campo.`
    }
  ]
};
