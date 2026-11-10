// Gerenciamento de Persistência LocalStorage & Regras de Negócio do CRM SaaS

const STORAGE_KEY = "MULTIFATOR_CRM_DB_V1";

const StorageService = {
  getDB() {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (!dataStr) {
      this.saveDB(INITIAL_DATA);
      return INITIAL_DATA;
    }
    try {
      return JSON.parse(dataStr);
    } catch (e) {
      console.error("Erro ao carregar dados do LocalStorage, restaurando padrão.", e);
      this.saveDB(INITIAL_DATA);
      return INITIAL_DATA;
    }
  },

  saveDB(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  },

  resetDB() {
    this.saveDB(INITIAL_DATA);
    return INITIAL_DATA;
  },

  // CADASTRO DA EMPRESA
  updateCompany(companyData) {
    const db = this.getDB();
    db.company = { ...db.company, ...companyData };
    this.saveDB(db);
    return db.company;
  },

  // CADASTRO DE VENDEDORES
  addSeller(seller) {
    const db = this.getDB();
    const newSeller = {
      id: "sel_" + Date.now(),
      name: seller.name,
      type: seller.type || "Vendedor Interno",
      phone: seller.phone || "",
      email: seller.email || "",
      commissionRate: parseFloat(seller.commissionRate || 0),
      totalSales: 0
    };
    db.sellers.push(newSeller);
    this.saveDB(db);
    return newSeller;
  },

  // CLIENTES
  addClient(client) {
    const db = this.getDB();
    const newClient = {
      id: "cli_" + Date.now(),
      name: client.name,
      cnpj: client.cnpj || "Não informado",
      contact: client.contact || "",
      email: client.email || "",
      phone: client.phone || "",
      city: client.city || "",
      status: client.status || "Novo Lead",
      totalSpent: 0
    };
    db.clients.unshift(newClient);
    this.saveDB(db);

    if (typeof AgentOrchestrator !== 'undefined') {
      AgentOrchestrator.emit("CLIENT_CREATED", newClient);
    }
    return newClient;
  },

  // PROPOSTAS COMERCIAIS (SUPORTA ITENS DO CATÁLOGO E PROJETOS SOB MEDIDA)
  createProposal(proposalData) {
    const db = this.getDB();
    const propCount = db.proposals.length + 1001;
    const client = db.clients.find(c => c.id === proposalData.clientId);
    const seller = db.sellers.find(s => s.id === proposalData.sellerId);
    
    const newProp = {
      id: "prop_" + Date.now(),
      number: `PROP-2026-${String(propCount).padStart(3, '0')}`,
      clientId: proposalData.clientId,
      clientName: client ? client.name : "Cliente Não Identificado",
      sellerId: proposalData.sellerId || "",
      sellerName: seller ? seller.name : (proposalData.sellerName || "Vendedor"),
      date: new Date().toISOString().split('T')[0],
      validUntil: proposalData.validUntil || new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
      status: "Rascunho",
      items: proposalData.items || [],
      discount: parseFloat(proposalData.discount || 0),
      totalAmount: parseFloat(proposalData.totalAmount || 0),
      notes: proposalData.notes || ""
    };

    db.proposals.unshift(newProp);
    this.saveDB(db);

    if (typeof AgentOrchestrator !== 'undefined') {
      AgentOrchestrator.emit("PROPOSAL_CREATED", newProp);
    }
    return newProp;
  },

  sendProposalToClient(propId) {
    const db = this.getDB();
    const prop = db.proposals.find(p => p.id === propId);
    if (prop) {
      prop.status = "Enviada";
      this.saveDB(db);
    }
    return prop;
  },

  // CONVERTE PROPOSTA EM PEDIDO DE VENDA
  convertProposalToOrder(propId) {
    const db = this.getDB();
    const prop = db.proposals.find(p => p.id === propId);
    if (!prop) return null;

    prop.status = "Aprovada";

    const orderCount = db.orders.length + 8801;
    const newOrder = {
      id: "ord_" + Date.now(),
      number: `PV-2026-${orderCount}`,
      origin: `Proposta ${prop.number}`,
      clientId: prop.clientId,
      clientName: prop.clientName,
      sellerId: prop.sellerId,
      sellerName: prop.sellerName,
      channel: "Central CRM",
      date: new Date().toISOString().split('T')[0],
      items: prop.items,
      totalAmount: prop.totalAmount,
      status: "Pendente",
      paymentMethod: "A Definir"
    };

    db.orders.unshift(newOrder);

    // Atualiza total de vendas do vendedor
    if (prop.sellerId) {
      const seller = db.sellers.find(s => s.id === prop.sellerId);
      if (seller) seller.totalSales = (seller.totalSales || 0) + prop.totalAmount;
    }

    this.saveDB(db);
    if (typeof AgentOrchestrator !== 'undefined') {
      AgentOrchestrator.emit("ORDER_PLACED", newOrder);
    }
    return newOrder;
  },

  // PEDIDO DO VENDEDOR DE RUA (SMARTPHONE)
  createMobileOrder(orderData) {
    const db = this.getDB();
    const orderCount = db.orders.length + 8801;
    const client = db.clients.find(c => c.id === orderData.clientId);
    const seller = db.sellers.find(s => s.id === orderData.sellerId);

    const newOrder = {
      id: "ord_mob_" + Date.now(),
      number: `PV-2026-${orderCount}`,
      origin: "Vendedor de Rua (Smartphone App)",
      clientId: orderData.clientId,
      clientName: client ? client.name : orderData.clientName,
      sellerId: orderData.sellerId,
      sellerName: seller ? seller.name : "Vendedor Externo",
      channel: "Smartphone Rua",
      date: new Date().toISOString().split('T')[0],
      items: orderData.items || [],
      totalAmount: parseFloat(orderData.totalAmount || 0),
      status: "Pendente",
      paymentMethod: orderData.paymentMethod || "Pix / Cartão Campo"
    };

    db.orders.unshift(newOrder);

    if (orderData.sellerId) {
      const s = db.sellers.find(sel => sel.id === orderData.sellerId);
      if (s) s.totalSales = (s.totalSales || 0) + parseFloat(orderData.totalAmount || 0);
    }

    this.saveDB(db);
    if (typeof AgentOrchestrator !== 'undefined') {
      AgentOrchestrator.emit("MOBILE_ORDER_PLACED", newOrder);
    }
    return newOrder;
  },

  // INTEGRAR COM FINANCEIRO
  sendOrderToFinancial(orderId) {
    const db = this.getDB();
    const order = db.orders.find(o => o.id === orderId);
    if (!order) return null;

    order.status = "Enviado ao Financeiro";

    const existingFin = db.financials.find(f => f.orderNumber === order.number);
    if (!existingFin) {
      const dueDate = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
      db.financials.unshift({
        id: "fin_" + Date.now(),
        orderNumber: order.number,
        clientName: order.clientName,
        amount: order.totalAmount,
        dueDate: dueDate,
        status: "A Receber",
        billingStatus: "Aguardando NF-e"
      });
    }

    this.saveDB(db);
    if (typeof AgentOrchestrator !== 'undefined') {
      AgentOrchestrator.emit("INVOICE_REQUIRED", order);
    }
    return order;
  },

  // EMISSÃO DE NOTA FISCAL (NF-e)
  emitInvoiceForOrder(orderNumber) {
    const db = this.getDB();
    const order = db.orders.find(o => o.number === orderNumber);
    const client = order ? db.clients.find(c => c.id === order.clientId) : null;

    const nfNumber = `000.${String(db.invoices.length + 452).padStart(3, '0')}`;
    const accessKey = "3526" + Math.floor(100000000000000000000000000000000000 + Math.random() * 900000000000000000000000000000000000);
    const protocol = "13526" + Math.floor(1000000000 + Math.random() * 9000000000);

    const newInvoice = {
      id: "nf_" + Date.now(),
      number: nfNumber,
      serie: "1",
      orderNumber: orderNumber,
      clientName: order ? order.clientName : "Cliente",
      cnpj: client ? client.cnpj : "45.123.890/0001-12",
      issueDate: new Date().toISOString(),
      totalValue: order ? order.totalAmount : 0,
      status: "Autorizada (SEFAZ)",
      accessKey: accessKey,
      protocol: protocol
    };

    db.invoices.unshift(newInvoice);

    if (order) order.status = "Faturado";

    const fin = db.financials.find(f => f.orderNumber === orderNumber);
    if (fin) fin.billingStatus = "NF-e Emitida";

    if (client && order) {
      client.totalSpent = (client.totalSpent || 0) + order.totalAmount;
      client.status = "Cliente Ativo";
    }

    this.saveDB(db);
    if (typeof AgentOrchestrator !== 'undefined') {
      AgentOrchestrator.emit("INVOICE_EMITTED", newInvoice);
    }
    return newInvoice;
  }
};
