// ==========================================================================
// NEXUS CRM SAAS - LÓGICA DE INTERFACE & NAVEGAÇÃO
// ==========================================================================

const App = {
  currentTab: 'dashboard',

  init() {
    console.log("Inicializando Nexus CRM SaaS...");
    this.updateCompanyHeaders();
    this.renderCurrentTab();
  },

  updateCompanyHeaders() {
    const db = StorageService.getDB();
    const sidebarName = document.getElementById('sidebar-company-name');
    const topbarName = document.getElementById('topbar-company-name');
    if (sidebarName) sidebarName.innerText = "Multifator CRM";
    if (topbarName) topbarName.innerText = db.company?.tradeName || "Multifator CRM";
  },

  navigate(tabName) {
    this.currentTab = tabName;
    
    document.querySelectorAll('.nav-item button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');

    const titles = {
      dashboard: 'Visão Geral do Funil & Vendas',
      sellers: 'Gestão de Vendedores & Equipe Comercial',
      clients: 'Gestão de Clientes & Leads (CRM)',
      proposals: 'Propostas Comerciais & Projetos Sob Medida',
      orders: 'Central de Pedidos de Venda',
      financial: 'Financeiro, Faturamento & Emissão de NF-e',
      company: 'Configurações da Minha Empresa',
      'agents-hub': 'Central de Agentes Autônomos (Multi-Agent Swarm Hub)'
    };
    document.getElementById('page-title').innerText = titles[tabName] || 'Multifator CRM';

    // Fecha o drawer mobile ao navegar
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');

    this.renderCurrentTab();

    // Notifica o AI Copilot da mudança de tela
    if (typeof AICopilot !== 'undefined' && AICopilot.updateContextRadar) {
      AICopilot.updateContextRadar(tabName);
    }
  },

  toggleMobileDrawer() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('active');
    if (backdrop) backdrop.classList.toggle('active');
  },

  renderCurrentTab() {
    const container = document.getElementById('page-container');
    container.innerHTML = '';

    switch (this.currentTab) {
      case 'dashboard':
        container.innerHTML = this.renderDashboard();
        break;
      case 'sellers':
        container.innerHTML = this.renderSellers();
        break;
      case 'clients':
        container.innerHTML = this.renderClients();
        break;
      case 'proposals':
        container.innerHTML = this.renderProposals();
        break;
      case 'orders':
        container.innerHTML = this.renderOrders();
        break;
      case 'financial':
        container.innerHTML = this.renderFinancial();
        break;
      case 'company':
        container.innerHTML = this.renderCompany();
        break;
      case 'agents-hub':
        container.innerHTML = this.renderAgentsHub();
        break;
      default:
        container.innerHTML = this.renderDashboard();
    }

    if (window.feather) {
      try { feather.replace(); } catch (e) { console.warn("Feather icons error:", e); }
    }
  },

  formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  },

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================
  renderDashboard() {
    const db = StorageService.getDB();
    
    const propAbertas = db.proposals.filter(p => p.status === 'Enviada' || p.status === 'Rascunho');
    const valorPropAbertas = propAbertas.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    const pedidosPendentes = db.orders.filter(o => o.status === 'Pendente' || o.status === 'Enviado ao Financeiro');
    const valorPedidosPendentes = pedidosPendentes.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    const nfsEmitidas = db.invoices;
    const valorFaturado = nfsEmitidas.reduce((acc, n) => acc + (n.totalValue || 0), 0);

    const pedidosRua = db.orders.filter(o => o.channel === 'Smartphone Rua');

    return `
      <div class="grid-stats">
        <div class="stat-card">
          <div class="stat-header">
            <span>Propostas Abertas</span>
            <div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">
              <i data-feather="file-text"></i>
            </div>
          </div>
          <div class="stat-value" style="color: #818cf8;">${this.formatCurrency(valorPropAbertas)}</div>
          <div class="stat-subtext">${propAbertas.length} orçamentos em negociação</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span>Pedidos em Faturamento</span>
            <div class="stat-icon" style="background: var(--warning-light); color: var(--warning);">
              <i data-feather="shopping-bag"></i>
            </div>
          </div>
          <div class="stat-value" style="color: #fbbf24;">${this.formatCurrency(valorPedidosPendentes)}</div>
          <div class="stat-subtext">${pedidosPendentes.length} pedidos a faturar</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span>Faturamento Total (NF-e)</span>
            <div class="stat-icon" style="background: var(--success-light); color: var(--success);">
              <i data-feather="check-circle"></i>
            </div>
          </div>
          <div class="stat-value" style="color: #34d399;">${this.formatCurrency(valorFaturado)}</div>
          <div class="stat-subtext">${nfsEmitidas.length} Notas Fiscais emitidas</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span>Vendas Campo (Mobile Rua)</span>
            <div class="stat-icon" style="background: var(--info-light); color: var(--info);">
              <i data-feather="smartphone"></i>
            </div>
          </div>
          <div class="stat-value" style="color: #38bdf8;">${pedidosRua.length} Pedidos</div>
          <div class="stat-subtext">Emitidos via Smartphone do vendedor</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;">
        <div class="table-container">
          <div class="table-header">
            <div class="table-title">📄 Propostas Comerciais Recentes</div>
            <button class="btn btn-primary btn-sm" onclick="App.openNewProposalModal()">+ Criar Proposta</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Número / Cliente</th>
                <th>Vendedor</th>
                <th>Valor Total</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              ${db.proposals.slice(0, 4).map(p => `
                <tr>
                  <td>
                    <strong>${p.number}</strong><br>
                    <span style="font-size: 0.78rem; color: var(--text-muted);">${p.clientName}</span>
                  </td>
                  <td>${p.sellerName}</td>
                  <td style="font-weight: 600;">${this.formatCurrency(p.totalAmount)}</td>
                  <td>${this.getProposalBadge(p.status)}</td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="App.viewProposal('${p.id}')">Ver / Enviar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="table-container">
          <div class="table-header">
            <div class="table-title">📦 Últimos Pedidos de Venda</div>
            <button class="btn btn-success btn-sm" onclick="App.openMobileSimulator()">📱 Smartphone Rua</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Pedido / Origem</th>
                <th>Vendedor</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${db.orders.slice(0, 4).map(o => `
                <tr>
                  <td>
                    <strong>${o.number}</strong><br>
                    <span style="font-size: 0.75rem; color: var(--text-dim);">${o.origin}</span>
                  </td>
                  <td>${o.sellerName}</td>
                  <td style="font-weight: 600;">${this.formatCurrency(o.totalAmount)}</td>
                  <td>${this.getOrderBadge(o.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ==========================================================================
  // GESTÃO DE VENDEDORES
  // ==========================================================================
  renderSellers() {
    const db = StorageService.getDB();
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">👨‍💼 Equipe Comercial & Vendedores Cadastrados</div>
          <button class="btn btn-primary" onclick="App.openModal('modal-seller')">+ Cadastrar Vendedor</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome do Vendedor</th>
              <th>Tipo de Atuação</th>
              <th>Contato & E-mail</th>
              <th>Taxa Comissão</th>
              <th>Total de Vendas Acumulado</th>
            </tr>
          </thead>
          <tbody>
            ${db.sellers.map(s => `
              <tr>
                <td>
                  <strong>${s.name}</strong>
                </td>
                <td>
                  <span class="badge ${s.type.includes('Rua') ? 'badge-info' : 'badge-primary'}">
                    ${s.type}
                  </span>
                </td>
                <td>
                  ${s.phone || '-'}<br>
                  <span style="font-size: 0.78rem; color: var(--text-dim);">${s.email || '-'}</span>
                </td>
                <td style="font-weight: 600; color: #fbbf24;">${s.commissionRate}%</td>
                <td style="font-weight: 700; color: #34d399;">${this.formatCurrency(s.totalSales)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  handleSaveSeller(e) {
    e.preventDefault();
    const name = document.getElementById('sel-name').value;
    const type = document.getElementById('sel-type').value;
    const commissionRate = document.getElementById('sel-commission').value;
    const phone = document.getElementById('sel-phone').value;
    const email = document.getElementById('sel-email').value;

    StorageService.addSeller({ name, type, commissionRate, phone, email });
    alert("🎉 Vendedor cadastrado com sucesso!");
    this.closeModal('modal-seller');
    this.navigate('sellers');
  },

  // ==========================================================================
  // CADASTRO DA MINHA EMPRESA
  // ==========================================================================
  renderCompany() {
    const db = StorageService.getDB();
    const c = db.company;

    return `
      <div class="table-container" style="max-width: 800px; padding: 1.5rem;">
        <div style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
          <i data-feather="briefcase"></i> Configurações e Dados da Minha Empresa
        </div>
        <form onsubmit="App.handleSaveCompany(event)">
          <div class="form-row">
            <div class="form-group">
              <label>Razão Social *</label>
              <input type="text" id="comp-name" class="form-control" value="${c.name || ''}" required>
            </div>
            <div class="form-group">
              <label>Nome Fantasia *</label>
              <input type="text" id="comp-trade" class="form-control" value="${c.tradeName || ''}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>CNPJ *</label>
              <input type="text" id="comp-cnpj" class="form-control" value="${c.cnpj || ''}" required>
            </div>
            <div class="form-group">
              <label>Inscrição Estadual (IE)</label>
              <input type="text" id="comp-ie" class="form-control" value="${c.ie || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Telefone Comercial</label>
              <input type="text" id="comp-phone" class="form-control" value="${c.phone || ''}">
            </div>
            <div class="form-group">
              <label>E-mail Corporativo</label>
              <input type="email" id="comp-email" class="form-control" value="${c.email || ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Endereço Completo</label>
            <input type="text" id="comp-address" class="form-control" value="${c.address || ''}" placeholder="Rua, Número, Bairro, Cidade - UF">
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="submit" class="btn btn-primary">Salvar Dados da Empresa</button>
          </div>
        </form>
      </div>
    `;
  },

  handleSaveCompany(e) {
    e.preventDefault();
    const updated = StorageService.updateCompany({
      name: document.getElementById('comp-name').value,
      tradeName: document.getElementById('comp-trade').value,
      cnpj: document.getElementById('comp-cnpj').value,
      ie: document.getElementById('comp-ie').value,
      phone: document.getElementById('comp-phone').value,
      email: document.getElementById('comp-email').value,
      address: document.getElementById('comp-address').value
    });

    alert("✨ Dados da empresa atualizados com sucesso!");
    this.updateCompanyHeaders();
  },

  // ==========================================================================
  // CLIENTES & LEADS
  // ==========================================================================
  renderClients() {
    const db = StorageService.getDB();
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">👥 Base de Clientes & Leads do CRM</div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="VoiceFirstCopilot.startListening()">🎙️ Criar por Voz</button>
            <button class="btn btn-primary" onclick="App.openModal('modal-client')">+ Cadastrar Cliente</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Razão Social / CNPJ</th>
              <th>Contato & E-mail</th>
              <th>Cidade / UF</th>
              <th>Total Comprado</th>
              <th>Status CRM</th>
              <th style="text-align: right;">Ações Rápidas</th>
            </tr>
          </thead>
          <tbody>
            ${db.clients.map(c => `
              <tr>
                <td>
                  <strong>${c.name}</strong><br>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">${c.cnpj}</span>
                </td>
                <td>
                  ${c.contact || '-'}<br>
                  <span style="font-size: 0.78rem; color: var(--text-dim);">${c.email}</span>
                </td>
                <td>${c.city || '-'}</td>
                <td style="font-weight: 600; color: #34d399;">${this.formatCurrency(c.totalSpent)}</td>
                <td>
                  <span class="badge ${c.status === 'Cliente Ativo' ? 'badge-success' : c.status === 'Em Negociação' ? 'badge-warning' : 'badge-primary'}">
                    ${c.status}
                  </span>
                </td>
                <td style="text-align: right; display: flex; gap: 0.35rem; justify-content: flex-end;">
                  <button class="btn btn-secondary btn-sm" style="padding: 4px 8px;" onclick="WhatsAppHub.openWhatsApp('${c.phone}', 'Olá ${c.contact || c.name}, tudo bem?')" title="Abrir WhatsApp">
                    💬 WhatsApp
                  </button>
                  <button class="btn btn-secondary btn-sm" style="padding: 4px 8px;" onclick="FieldMapsRouter.openNavigation('google', '${c.city || c.name}')" title="Traçar Rota GPS">
                    📍 GPS
                  </button>
                  <button class="btn btn-secondary btn-sm" style="padding: 4px 8px;" onclick="FieldMapsRouter.registerCheckIn('${c.id}')" title="Check-in GPS">
                    ✓ Check-in
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ==========================================================================
  // PROPOSTAS COMERCIAIS & PROJETOS SOB MEDIDA
  // ==========================================================================
  renderProposals() {
    const db = StorageService.getDB();
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">📄 Propostas Comerciais & Projetos Sob Medida</div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="VoiceFirstCopilot.startListening()">🎙️ Criar por Voz</button>
            <button class="btn btn-primary" onclick="App.openNewProposalModal()">+ Criar Nova Proposta</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Data / Validade</th>
              <th>Valor Total</th>
              <th>Status</th>
              <th style="text-align: right;">Ações de Fluxo & Contrato</th>
            </tr>
          </thead>
          <tbody>
            ${db.proposals.map(p => `
              <tr>
                <td><strong>${p.number}</strong></td>
                <td>${p.clientName}</td>
                <td>${p.sellerName}</td>
                <td>${this.formatDate(p.date)} (Val: ${this.formatDate(p.validUntil)})</td>
                <td style="font-weight: 700; color: #818cf8;">${this.formatCurrency(p.totalAmount)}</td>
                <td>${this.getProposalBadge(p.status)}</td>
                <td style="text-align: right; display: flex; gap: 0.35rem; justify-content: flex-end; flex-wrap: wrap;">
                  <button class="btn btn-secondary btn-sm" onclick="App.viewProposal('${p.id}')">
                    👁️ Ver
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="WhatsAppHub.sendProposalWhatsApp('${p.id}')" title="Disparar no WhatsApp">
                    💬 WhatsApp
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="ContractSignature.openContractModal('${p.id}')" title="Gerar Contrato B2B e Assinar">
                    ✍️ Contrato
                  </button>
                  ${p.status !== 'Aprovada' ? `
                    <button class="btn btn-success btn-sm" onclick="App.approveProposal('${p.id}')">
                      ✅ Aprovar
                    </button>
                  ` : `
                    <span class="badge badge-success">Pedido Gerado</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openNewProposalModal() {
    const db = StorageService.getDB();
    const selectClient = document.getElementById('prop-client-select');
    selectClient.innerHTML = db.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const selectSeller = document.getElementById('prop-seller-select');
    selectSeller.innerHTML = db.sellers.map(s => `<option value="${s.id}">${s.name} (${s.type})</option>`).join('');

    document.getElementById('proposal-items-container').innerHTML = '';
    this.addCustomProjectRow(); // Abre por padrão uma linha de projeto sob medida!
    
    document.getElementById('prop-validity').value = new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0];
    this.openModal('modal-proposal');
  },

  // ADICIONA ITEM DO CATÁLOGO PREVIAMENTE CADASTRADO
  addCatalogItemRow() {
    const db = StorageService.getDB();
    const container = document.getElementById('proposal-items-container');
    const rowId = `item-row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const rowHTML = `
      <div id="${rowId}" class="prop-item-row" data-type="catalog" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: 8px; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
        <span class="badge badge-primary">📦 Catálogo</span>
        <select class="form-control prop-prod-select" style="flex: 2; min-width: 200px;" onchange="App.recalculateProposalTotal()">
          ${db.products.map(p => `<option value="${p.id}" data-name="${p.name}" data-price="${p.price}">${p.name} - ${this.formatCurrency(p.price)}</option>`).join('')}
        </select>
        <input type="number" class="form-control prop-prod-qty" style="width: 80px;" value="1" min="1" oninput="App.recalculateProposalTotal()">
        <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('${rowId}').remove(); App.recalculateProposalTotal();">&times;</button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
    this.recalculateProposalTotal();
  },

  // ADICIONA PROJETO SOB MEDIDA DIGITADO NA HORA (PERSONALIZADO)
  addCustomProjectRow() {
    const container = document.getElementById('proposal-items-container');
    const rowId = `custom-row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const rowHTML = `
      <div id="${rowId}" class="prop-item-row" data-type="custom" style="background: rgba(99, 102, 241, 0.08); border: 1px dashed var(--primary); padding: 0.75rem; border-radius: 8px; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
        <span class="badge badge-warning">🛠️ Projeto Sob Medida</span>
        <input type="text" class="form-control prop-custom-name" style="flex: 3; min-width: 220px;" placeholder="Descrição do Projeto / Serviço Sob Medida (Ex: Galpão Metalico 10x20m com montagem)" required oninput="App.recalculateProposalTotal()">
        <input type="number" class="form-control prop-custom-price" style="width: 120px;" placeholder="Preço (R$)" step="0.01" min="0" required oninput="App.recalculateProposalTotal()">
        <input type="number" class="form-control prop-custom-qty" style="width: 70px;" value="1" min="1" oninput="App.recalculateProposalTotal()">
        <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('${rowId}').remove(); App.recalculateProposalTotal();">&times;</button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
    this.recalculateProposalTotal();
  },

  recalculateProposalTotal() {
    const db = StorageService.getDB();
    let subtotal = 0;

    const rows = document.querySelectorAll('.prop-item-row');
    rows.forEach(row => {
      const type = row.getAttribute('data-type');
      if (type === 'catalog') {
        const select = row.querySelector('.prop-prod-select');
        const qtyInput = row.querySelector('.prop-prod-qty');
        if (select && qtyInput) {
          const prodId = select.value;
          const qty = parseInt(qtyInput.value || 1);
          const prod = db.products.find(p => p.id === prodId);
          if (prod) subtotal += (prod.price * qty);
        }
      } else if (type === 'custom') {
        const priceInput = row.querySelector('.prop-custom-price');
        const qtyInput = row.querySelector('.prop-custom-qty');
        if (priceInput && qtyInput) {
          const price = parseFloat(priceInput.value || 0);
          const qty = parseInt(qtyInput.value || 1);
          subtotal += (price * qty);
        }
      }
    });

    const discount = parseFloat(document.getElementById('prop-discount').value || 0);
    const total = Math.max(0, subtotal - discount);
    document.getElementById('prop-total-display').innerText = this.formatCurrency(total);
  },

  handleSaveProposal(e) {
    e.preventDefault();
    const db = StorageService.getDB();
    const clientId = document.getElementById('prop-client-select').value;
    const sellerId = document.getElementById('prop-seller-select').value;
    const validity = document.getElementById('prop-validity').value;
    const discount = document.getElementById('prop-discount').value;
    const notes = document.getElementById('prop-notes').value;

    const items = [];
    let subtotal = 0;

    const rows = document.querySelectorAll('.prop-item-row');
    rows.forEach(row => {
      const type = row.getAttribute('data-type');
      if (type === 'catalog') {
        const select = row.querySelector('.prop-prod-select');
        const qtyInput = row.querySelector('.prop-prod-qty');
        if (select && qtyInput) {
          const prodId = select.value;
          const qty = parseInt(qtyInput.value || 1);
          const prod = db.products.find(p => p.id === prodId);
          if (prod) {
            const itemTotal = prod.price * qty;
            subtotal += itemTotal;
            items.push({ isCustom: false, productId: prod.id, name: prod.name, qty, unitPrice: prod.price, total: itemTotal });
          }
        }
      } else if (type === 'custom') {
        const nameInput = row.querySelector('.prop-custom-name');
        const priceInput = row.querySelector('.prop-custom-price');
        const qtyInput = row.querySelector('.prop-custom-qty');
        if (nameInput && priceInput && qtyInput) {
          const name = nameInput.value || "Projeto Sob Medida";
          const price = parseFloat(priceInput.value || 0);
          const qty = parseInt(qtyInput.value || 1);
          const itemTotal = price * qty;
          subtotal += itemTotal;
          items.push({ isCustom: true, productId: "custom", name, qty, unitPrice: price, total: itemTotal });
        }
      }
    });

    if (items.length === 0) {
      alert("Por favor, adicione pelo menos um item ou projeto no orçamento.");
      return;
    }

    const totalAmount = Math.max(0, subtotal - parseFloat(discount || 0));

    const newProp = StorageService.createProposal({
      clientId,
      sellerId,
      validUntil: validity,
      discount,
      notes,
      items,
      totalAmount
    });

    alert(`📄 Proposta comercial ${newProp.number} salva com sucesso!`);
    this.closeModal('modal-proposal');
    this.navigate('proposals');
  },

  viewProposal(propId) {
    const db = StorageService.getDB();
    const prop = db.proposals.find(p => p.id === propId);
    if (!prop) return;

    document.getElementById('view-prop-title').innerText = `Proposta ${prop.number}`;
    
    document.getElementById('view-prop-body').innerHTML = `
      <div style="background: var(--bg-main); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
          <div>
            <h2 style="font-family: 'Outfit'; color: var(--primary);">${db.company.name}</h2>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${db.company.address} | CNPJ: ${db.company.cnpj}</span>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.1rem; font-weight: 700; color: #818cf8;">${prop.number}</div>
            <div><strong>Data:</strong> ${this.formatDate(prop.date)}</div>
            <div><strong>Validade:</strong> ${this.formatDate(prop.validUntil)}</div>
          </div>
        </div>

        <div style="margin-bottom: 1.5rem; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 1rem 0;">
          <strong>CLIENTE:</strong> ${prop.clientName}<br>
          <strong>VENDEDOR / CONSULTOR:</strong> ${prop.sellerName}
        </div>

        <table style="width: 100%; margin-bottom: 1.5rem;">
          <thead>
            <tr>
              <th>Descrição do Item / Projeto Sob Medida</th>
              <th>Qtd</th>
              <th>V. Unitário</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${prop.items.map(i => `
              <tr>
                <td>
                  <strong>${i.name}</strong>
                  ${i.isCustom ? `<br><span class="badge badge-warning" style="font-size: 0.7rem;">🛠️ Projeto Customizado</span>` : ''}
                </td>
                <td>${i.qty}</td>
                <td>${this.formatCurrency(i.unitPrice)}</td>
                <td style="font-weight: 600;">${this.formatCurrency(i.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${prop.discount > 0 ? `
          <div style="text-align: right; color: var(--danger); font-size: 0.9rem; margin-bottom: 0.5rem;">
            Desconto Concedido: -${this.formatCurrency(prop.discount)}
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(99, 102, 241, 0.15); padding: 1rem; border-radius: 8px;">
          <span style="font-weight: 700;">VALOR TOTAL DA PROPOSTA:</span>
          <span style="font-family: 'Outfit'; font-size: 1.4rem; font-weight: 800; color: #818cf8;">${this.formatCurrency(prop.totalAmount)}</span>
        </div>

        ${prop.notes ? `<div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);"><strong>Observações / Condições:</strong> ${prop.notes}</div>` : ''}

        <div style="display: flex; justify-content: space-between; margin-top: 2rem;">
          <button class="btn btn-secondary" onclick="App.sendProposalEmail('${prop.id}')">
            📧 Simular Envio por E-mail ao Cliente
          </button>
          <button class="btn btn-success" onclick="App.closeModal('modal-view-proposal'); App.approveProposal('${prop.id}')">
            ✅ Aprovar e Gerar Pedido de Venda
          </button>
        </div>
      </div>
    `;

    this.openModal('modal-view-proposal');
  },

  sendProposalEmail(propId) {
    const prop = StorageService.sendProposalToClient(propId);
    alert(`📧 Proposta ${prop.number} enviada com sucesso para o e-mail do cliente!`);
    this.closeModal('modal-view-proposal');
    this.navigate('proposals');
  },

  // ==========================================================================
  // PEDIDOS DE VENDA
  // ==========================================================================
  renderOrders() {
    const db = StorageService.getDB();
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">📦 Pedidos de Venda Centralizados</div>
          <button class="btn btn-success" onclick="App.openMobileSimulator()">📱 Smartphone Vendedor (Rua)</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nº Pedido</th>
              <th>Origem do Pedido</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Valor Total</th>
              <th>Status</th>
              <th style="text-align: right;">Ações de Integração</th>
            </tr>
          </thead>
          <tbody>
            ${db.orders.map(o => `
              <tr>
                <td><strong>${o.number}</strong></td>
                <td><span style="font-size: 0.8rem; color: var(--text-muted);">${o.origin}</span></td>
                <td>${o.clientName}</td>
                <td>${o.sellerName}</td>
                <td style="font-weight: 700; color: #fbbf24;">${this.formatCurrency(o.totalAmount)}</td>
                <td>${this.getOrderBadge(o.status)}</td>
                <td style="text-align: right;">
                  ${o.status === 'Pendente' ? `
                    <button class="btn btn-primary btn-sm" onclick="App.sendOrderToFinance('${o.id}')">
                      ⚡ Enviar ao Financeiro
                    </button>
                  ` : `
                    <span class="badge badge-success">Integrado ao Financeiro</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ==========================================================================
  // FINANCEIRO & NF-e
  // ==========================================================================
  renderFinancial() {
    const db = StorageService.getDB();
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">💵 Fila de Faturamento & Contas a Receber</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Pedido Ref.</th>
              <th>Cliente</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status Financeiro</th>
              <th>Status Faturamento</th>
              <th style="text-align: right;">Ação de Emissão</th>
            </tr>
          </thead>
          <tbody>
            ${db.financials.map(f => `
              <tr>
                <td><strong>${f.orderNumber}</strong></td>
                <td>${f.clientName}</td>
                <td>${this.formatDate(f.dueDate)}</td>
                <td style="font-weight: 700;">${this.formatCurrency(f.amount)}</td>
                <td>
                  <span class="badge ${f.status === 'Pago' ? 'badge-success' : 'badge-warning'}">
                    ${f.status}
                  </span>
                </td>
                <td>
                  <span class="badge ${f.billingStatus === 'NF-e Emitida' ? 'badge-success' : 'badge-danger'}">
                    ${f.billingStatus}
                  </span>
                </td>
                <td style="text-align: right;">
                  ${f.billingStatus !== 'NF-e Emitida' ? `
                    <button class="btn btn-success btn-sm" onclick="App.emitInvoice('${f.orderNumber}')">
                      🧾 Emitir Nota Fiscal (NF-e)
                    </button>
                  ` : `
                    <button class="btn btn-secondary btn-sm" onclick="App.viewDANFEByOrder('${f.orderNumber}')">
                      📄 Espelho DANFE
                    </button>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="table-container" style="margin-top: 2rem;">
        <div class="table-header">
          <div class="table-title">🧾 Notas Fiscais Eletrônicas Emitidas (SEFAZ)</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>NF-e Nº / Série</th>
              <th>Pedido Ref.</th>
              <th>Cliente / CNPJ</th>
              <th>Data Emissão</th>
              <th>Valor Total</th>
              <th>Status SEFAZ</th>
              <th style="text-align: right;">Visualização</th>
            </tr>
          </thead>
          <tbody>
            ${db.invoices.map(n => `
              <tr>
                <td><strong>Nº ${n.number}</strong> (Série ${n.serie})</td>
                <td>${n.orderNumber}</td>
                <td>${n.clientName}<br><span style="font-size: 0.75rem; color: var(--text-dim);">${n.cnpj}</span></td>
                <td>${new Date(n.issueDate).toLocaleString('pt-BR')}</td>
                <td style="font-weight: 700; color: #34d399;">${this.formatCurrency(n.totalValue)}</td>
                <td><span class="badge badge-success">✓ ${n.status}</span></td>
                <td style="text-align: right;">
                  <button class="btn btn-secondary btn-sm" onclick="App.showDANFEModal('${n.id}')">
                    🔍 Ver DANFE
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ==========================================================================
  // SIMULADOR DO VENDEDOR DE RUA (MOBILE SMARTPHONE)
  // ==========================================================================
  openMobileSimulator() {
    this.openModal('modal-mobile-simulator');
    this.renderMobileAppScreen();
  },

  renderMobileAppScreen() {
    const db = StorageService.getDB();
    const container = document.getElementById('mobile-app-content');
    
    container.innerHTML = `
      <form id="mobile-order-form" onsubmit="App.handleSaveMobileOrder(event)">
        <!-- BARRA DE FERRAMENTAS DE CAMPO NO SMARTPHONE -->
        <div style="display: flex; gap: 0.4rem; margin-bottom: 1rem;">
          <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.72rem; padding: 6px 4px;" onclick="VoiceFirstCopilot.startListening()">
            🎙️ Voz (Áudio)
          </button>
          <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.72rem; padding: 6px 4px;" onclick="FieldMapsRouter.openNavigation('google', document.getElementById('mob-client')?.selectedOptions[0]?.text || 'São Paulo')">
            📍 GPS Rota
          </button>
          <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.72rem; padding: 6px 4px;" onclick="FieldMapsRouter.registerCheckIn(document.getElementById('mob-client')?.value)">
            ✓ Check-in
          </button>
        </div>

        <div class="form-group">
          <label style="color: #fff; font-size: 0.78rem;">Selecione o Vendedor na Rua *</label>
          <select id="mob-seller" class="form-control" style="font-size: 0.85rem;" required>
            ${db.sellers.map(s => `<option value="${s.id}">${s.name} (${s.type})</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label style="color: #fff; font-size: 0.78rem;">Selecione o Cliente *</label>
          <select id="mob-client" class="form-control" style="font-size: 0.85rem;" required>
            ${db.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>

        <div style="font-size: 0.8rem; font-weight: 600; color: #fff; margin: 1rem 0 0.5rem 0;">
          🛠️ Digite um Projeto Sob Medida:
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 8px; margin-bottom: 1rem;">
          <input type="text" id="mob-custom-desc" class="form-control" placeholder="Descrição do Projeto Sob Medida" style="font-size: 0.8rem; margin-bottom: 0.4rem;">
          <input type="number" id="mob-custom-val" class="form-control" placeholder="Valor do Projeto (R$)" step="0.01" style="font-size: 0.8rem;" oninput="App.calcMobileTotal()">
        </div>

        <div style="font-size: 0.8rem; font-weight: 600; color: #fff; margin: 0.5rem 0;">
          📦 Ou Selecione do Catálogo:
        </div>

        <div id="mob-products-list">
          ${db.products.map(p => `
            <div class="mobile-item-card">
              <div>
                <div style="font-weight: 600; font-size: 0.82rem; color: #fff;">${p.name}</div>
                <div style="font-size: 0.75rem; color: #34d399;">${this.formatCurrency(p.price)}</div>
              </div>
              <input type="number" data-prod-id="${p.id}" data-prod-name="${p.name}" data-prod-price="${p.price}" 
                     class="form-control mob-qty-input" style="width: 60px; padding: 4px; text-align: center;" value="0" min="0" onchange="App.calcMobileTotal()">
            </div>
          `).join('')}
        </div>

        <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.75rem; border-radius: 8px; margin: 1rem 0; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.8rem; color: #fff;">Total do Pedido:</span>
          <strong id="mob-total-display" style="font-size: 1.1rem; color: #34d399;">R$ 0,00</strong>
        </div>

        <button type="submit" class="btn btn-success" style="width: 100%; padding: 0.75rem;">
          🚀 Transmitir Pedido para Central
        </button>
      </form>
    `;
    if (window.feather) feather.replace();
  },

  calcMobileTotal() {
    let total = 0;
    document.querySelectorAll('.mob-qty-input').forEach(input => {
      const qty = parseInt(input.value || 0);
      const price = parseFloat(input.getAttribute('data-prod-price') || 0);
      total += qty * price;
    });

    const customVal = parseFloat(document.getElementById('mob-custom-val')?.value || 0);
    total += customVal;

    document.getElementById('mob-total-display').innerText = this.formatCurrency(total);
  },

  handleSaveMobileOrder(e) {
    e.preventDefault();
    const sellerId = document.getElementById('mob-seller').value;
    const clientId = document.getElementById('mob-client').value;
    
    const items = [];
    let total = 0;

    const customDesc = document.getElementById('mob-custom-desc').value;
    const customVal = parseFloat(document.getElementById('mob-custom-val').value || 0);

    if (customDesc && customVal > 0) {
      total += customVal;
      items.push({ isCustom: true, productId: "custom", name: customDesc, qty: 1, unitPrice: customVal, total: customVal });
    }

    document.querySelectorAll('.mob-qty-input').forEach(input => {
      const qty = parseInt(input.value || 0);
      if (qty > 0) {
        const price = parseFloat(input.getAttribute('data-prod-price'));
        const name = input.getAttribute('data-prod-name');
        const productId = input.getAttribute('data-prod-id');
        const itemTotal = qty * price;
        total += itemTotal;
        items.push({ isCustom: false, productId, name, qty, unitPrice: price, total: itemTotal });
      }
    });

    if (items.length === 0) {
      alert("Por favor, digite um projeto sob medida ou selecione itens do catálogo.");
      return;
    }

    const order = StorageService.createMobileOrder({
      sellerId,
      clientId,
      items,
      totalAmount: total
    });

    alert(`🎉 Pedido ${order.number} transmitido com sucesso para a Central CRM!`);
    this.closeModal('modal-mobile-simulator');
    this.navigate('orders');
  },

  // ==========================================================================
  // AUXILIARES
  // ==========================================================================
  getProposalBadge(status) {
    switch (status) {
      case 'Rascunho': return `<span class="badge badge-muted">Rascunho</span>`;
      case 'Enviada': return `<span class="badge badge-warning">Enviada ao Cliente</span>`;
      case 'Aprovada': return `<span class="badge badge-success">Aprovada</span>`;
      default: return `<span class="badge badge-muted">${status}</span>`;
    }
  },

  getOrderBadge(status) {
    switch (status) {
      case 'Pendente': return `<span class="badge badge-warning">Pendente</span>`;
      case 'Enviado ao Financeiro': return `<span class="badge badge-info">Em Financeiro</span>`;
      case 'Faturado': return `<span class="badge badge-success">NF-e Emitida</span>`;
      default: return `<span class="badge badge-muted">${status}</span>`;
    }
  },

  openModal(id) {
    document.getElementById(id).classList.add('active');
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
  },

  approveProposal(propId) {
    if (confirm("Deseja aprovar esta proposta comercial e transformá-la automaticamente em um Pedido de Venda?")) {
      const newOrder = StorageService.convertProposalToOrder(propId);
      if (newOrder) {
        alert(`✨ Proposta aprovada! Pedido de Venda ${newOrder.number} gerado com sucesso.`);
        this.navigate('orders');
      }
    }
  },

  sendOrderToFinance(orderId) {
    const order = StorageService.sendOrderToFinancial(orderId);
    if (order) {
      alert(`⚡ Pedido ${order.number} enviado para a fila de faturamento e contas a receber!`);
      this.navigate('financial');
    }
  },

  emitInvoice(orderNumber) {
    if (confirm(`Deseja emitir a Nota Fiscal Eletrônica (NF-e) na SEFAZ para o pedido ${orderNumber}?`)) {
      const nf = StorageService.emitInvoiceForOrder(orderNumber);
      alert(`🧾 NF-e Autorizada com sucesso pela SEFAZ!\nNota Fiscal Nº: ${nf.number}\nChave de Acesso: ${nf.accessKey}`);
      this.renderCurrentTab();
      this.showDANFEModal(nf.id);
    }
  },

  viewDANFEByOrder(orderNumber) {
    const db = StorageService.getDB();
    const nf = db.invoices.find(i => i.orderNumber === orderNumber);
    if (nf) this.showDANFEModal(nf.id);
  },

  showDANFEModal(invoiceId) {
    const db = StorageService.getDB();
    const nf = db.invoices.find(i => i.id === invoiceId);
    if (!nf) return;

    const order = db.orders.find(o => o.number === nf.orderNumber);

    const container = document.getElementById('danfe-content');
    container.innerHTML = `
      <div class="danfe-box">
        <div class="danfe-header">
          <div>
            <strong>${db.company.name.toUpperCase()}</strong><br>
            CNPJ: ${db.company.cnpj}<br>
            IE: ${db.company.ie || '-'}<br>
            ${db.company.address}
          </div>
          <div style="text-align: center;">
            <div class="danfe-title">DANFE</div>
            Documento Auxiliar da Nota Fiscal Eletrônica<br>
            <strong>Nº ${nf.number} - Série ${nf.serie}</strong>
          </div>
          <div>
            <strong>CHAVE DE ACESSO:</strong><br>
            <span style="font-size: 8px; font-family: monospace;">${nf.accessKey}</span><br><br>
            <strong>PROTOCOLO SEFAZ:</strong><br>
            ${nf.protocol}
          </div>
        </div>

        <div style="border: 1px solid #000; padding: 6px; margin-bottom: 8px;">
          <strong>DESTINATÁRIO / REMETENTE:</strong> ${nf.clientName} &nbsp;&nbsp;|&nbsp;&nbsp; 
          <strong>CNPJ/CPF:</strong> ${nf.cnpj}<br>
          <strong>DATA DA EMISSÃO:</strong> ${new Date(nf.issueDate).toLocaleString('pt-BR')}
        </div>

        <table class="danfe-table">
          <thead>
            <tr>
              <th>CÓDIGO</th>
              <th>DESCRIÇÃO DO PRODUTO / PROJETO SOB MEDIDA</th>
              <th>QTD</th>
              <th>V. UNIT</th>
              <th>V. TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${order && order.items ? order.items.map(item => `
              <tr>
                <td>${item.isCustom ? 'PROJ-MEDIDA' : item.productId}</td>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${this.formatCurrency(item.unitPrice)}</td>
                <td>${this.formatCurrency(item.total)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td>PROJ-MEDIDA</td>
                <td>Projeto Sob Medida e Serviços de Engenharia</td>
                <td>1</td>
                <td>${this.formatCurrency(nf.totalValue)}</td>
                <td>${this.formatCurrency(nf.totalValue)}</td>
              </tr>
            `}
          </tbody>
        </table>

        <div style="border: 1px solid #000; padding: 6px; margin-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
          <span>VALOR TOTAL DA NOTA FISCAL:</span>
          <span>${this.formatCurrency(nf.totalValue)}</span>
        </div>
      </div>
    `;

    this.openModal('modal-danfe-preview');
  },

  handleSaveClient(e) {
    e.preventDefault();
    const name = document.getElementById('cli-name').value;
    const cnpj = document.getElementById('cli-cnpj').value;
    const contact = document.getElementById('cli-contact').value;
    const email = document.getElementById('cli-email').value;
    const phone = document.getElementById('cli-phone').value;
    const city = document.getElementById('cli-city').value;
    const status = document.getElementById('cli-status').value;

    StorageService.addClient({ name, cnpj, contact, email, phone, city, status });
    alert("🎉 Novo cliente cadastrado com sucesso!");
    this.closeModal('modal-client');
    this.navigate('clients');
  },

  // ==========================================================================
  // CENTRAL DE AGENTES AUTÔNOMOS (MULTI-AGENT SWARM HUB)
  // ==========================================================================
  renderAgentsHub() {
    const agents = typeof AgentOrchestrator !== 'undefined' ? AgentOrchestrator.getAllAgents() : [];
    const logsHTML = typeof AgentOrchestrator !== 'undefined' ? AgentOrchestrator.renderLogsHTML() : '<p>Carregando logs...</p>';

    return `
      <!-- BANNER SUPERIOR DO SWARM -->
      <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-xl); padding: 1.5rem; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981;"></span>
            <h2 style="font-family: 'Outfit'; font-size: 1.3rem; color: #fff; margin: 0;">Nexus Multi-Agent Swarm Hub</h2>
            <span class="badge badge-primary">5 Agentes Especializados Online</span>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0;">
            Barramento de eventos PubSub ativo com heartbeat autônomo e integração a APIs públicas (BrasilAPI, Receita, SEFAZ, Pix EMV e OpenStreetMap).
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-primary" onclick="App.runSwarmSweep()">
            ⚡ Executar Varredura Geral do Swarm
          </button>
        </div>
      </div>

      <!-- GRID DOS 5 AGENTES ESPECIALIZADOS -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
        
        <!-- Agente 1 -->
        <div class="stat-card" style="border-top: 3px solid #8b5cf6;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(139, 92, 246, 0.2); color: #8b5cf6; display: flex; align-items: center; justify-content: center;">
                <i data-feather="tool"></i>
              </div>
              <div>
                <h3 style="font-size: 0.95rem; color: #fff; font-family: 'Outfit';">Engenharia & Custos</h3>
                <span style="font-size: 0.7rem; color: var(--text-muted);">Orçamentista & Auditor de Margem</span>
              </div>
            </div>
            <span class="badge badge-success" style="font-size: 0.65rem;">Ativo</span>
          </div>
          <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
            Decompõe projetos sob medida em Lista de Materiais (BOM), calcula insumos, horas de engenharia e audita margens de lucro.
          </p>
          <div style="margin-top: auto;">
            <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="App.testCostEstimator()">
              🛠️ Testar Auditoria de BOM
            </button>
          </div>
        </div>

        <!-- Agente 2 -->
        <div class="stat-card" style="border-top: 3px solid #f59e0b;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(245, 158, 11, 0.2); color: #f59e0b; display: flex; align-items: center; justify-content: center;">
                <i data-feather="target"></i>
              </div>
              <div>
                <h3 style="font-size: 0.95rem; color: #fff; font-family: 'Outfit';">SDR & Guardião do Funil</h3>
                <span style="font-size: 0.7rem; color: var(--text-muted);">Prevenção de Churn & BrasilAPI</span>
              </div>
            </div>
            <span class="badge badge-success" style="font-size: 0.65rem;">Ativo</span>
          </div>
          <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
            Previne abandono de propostas (> 48h), calcula score de Churn (RFM) e enriquece CNPJs em tempo real na Receita Federal via BrasilAPI.
          </p>
          <div style="margin-top: auto;">
            <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="App.testEnrichCNPJ()">
              🌐 Consultar CNPJ BrasilAPI
            </button>
          </div>
        </div>

        <!-- Agente 3 -->
        <div class="stat-card" style="border-top: 3px solid #10b981;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(16, 185, 129, 0.2); color: #10b981; display: flex; align-items: center; justify-content: center;">
                <i data-feather="shield"></i>
              </div>
              <div>
                <h3 style="font-size: 0.95rem; color: #fff; font-family: 'Outfit';">Auditor Fiscal & SEFAZ</h3>
                <span style="font-size: 0.7rem; color: var(--text-muted);">Classificação NCM/CFOP & NF-e</span>
              </div>
            </div>
            <span class="badge badge-success" style="font-size: 0.65rem;">Ativo</span>
          </div>
          <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
            Classifica automaticamente NCM e CFOP, calcula ICMS, ISS e DIFAL, e audita as chaves de 44 dígitos da SEFAZ para evitar rejeições.
          </p>
          <div style="margin-top: auto;">
            <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="App.testFiscalAudit()">
              🧾 Simular Validação Fiscal
            </button>
          </div>
        </div>

        <!-- Agente 4 -->
        <div class="stat-card" style="border-top: 3px solid #06b6d4;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(6, 182, 212, 0.2); color: #06b6d4; display: flex; align-items: center; justify-content: center;">
                <i data-feather="dollar-sign"></i>
              </div>
              <div>
                <h3 style="font-size: 0.95rem; color: #fff; font-family: 'Outfit';">Financeiro & Pix EMV</h3>
                <span style="font-size: 0.7rem; color: var(--text-muted);">Conciliação & Régua de Cobrança</span>
              </div>
            </div>
            <span class="badge badge-success" style="font-size: 0.65rem;">Ativo</span>
          </div>
          <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
            Gera payloads e QR Code Pix oficiais no padrão EMV do Banco Central, projeta liquidez para 30/60 dias e executa régua amigável.
          </p>
          <div style="margin-top: auto;">
            <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="App.testGeneratePix()">
              💵 Gerar Cobrança Pix EMV
            </button>
          </div>
        </div>

        <!-- Agente 5 -->
        <div class="stat-card" style="border-top: 3px solid #ec4899;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(236, 72, 153, 0.2); color: #ec4899; display: flex; align-items: center; justify-content: center;">
                <i data-feather="map-pin"></i>
              </div>
              <div>
                <h3 style="font-size: 0.95rem; color: #fff; font-family: 'Outfit';">Logística & Vendas de Rua</h3>
                <span style="font-size: 0.7rem; color: var(--text-muted);">Roteirizador Geodésico & CEP</span>
              </div>
            </div>
            <span class="badge badge-success" style="font-size: 0.65rem;">Ativo</span>
          </div>
          <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
            Calcula distâncias geodésicas (Haversine), consulta CEPs e coordenadas na BrasilAPI e prioriza visitas de campo por potencial de compra.
          </p>
          <div style="margin-top: auto;">
            <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="App.testFieldRoute()">
              📍 Gerar Roteiro de Campo
            </button>
          </div>
        </div>

      </div>

      <!-- PAINEL DE LOGS DE ATIVIDADE EM TEMPO REAL -->
      <div class="table-container">
        <div class="table-header">
          <div class="table-title" style="display: flex; align-items: center; gap: 8px;">
            <i data-feather="activity"></i>
            <span>Log de Execuções e Auditoria do Swarm de Agentes</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="App.renderCurrentTab()">
            🔄 Atualizar Logs
          </button>
        </div>
        <div id="agents-live-logs" style="max-height: 350px; overflow-y: auto;">
          ${logsHTML}
        </div>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // AÇÕES INTERATIVAS DO SANDBOX DE AGENTES
  // --------------------------------------------------------------------------
  runSwarmSweep() {
    if (typeof AgentOrchestrator !== 'undefined') {
      AgentOrchestrator.runAutonomousCycle();
      alert("⚡ Varredura geral executada por todos os 5 agentes especializados! Logs atualizados.");
      this.renderCurrentTab();
    }
  },

  async testEnrichCNPJ() {
    const cnpj = prompt("Digite um CNPJ para consulta em tempo real na Receita Federal via BrasilAPI:", "45.123.890/0001-12");
    if (!cnpj) return;

    if (typeof AgentPipelineGuardian !== 'undefined') {
      const result = await AgentPipelineGuardian.enrichCNPJ(cnpj);
      if (result) {
        alert(`🏛️ Dados Oficiais Receita Federal (BrasilAPI):\n\nRazão Social: ${result.razaoSocial}\nNome Fantasia: ${result.nomeFantasia}\nSituação: ${result.situacao}\nCNAE: ${result.cnaePrincipal}\nCapital Social: ${result.capitalSocial}\nEndereço: ${result.endereco}\nSócios: ${result.socios.join(', ')}`);
        this.renderCurrentTab();
      }
    }
  },

  testCostEstimator() {
    if (typeof AgentCostEstimator !== 'undefined') {
      const desc = prompt("Digite o projeto sob medida para cálculo de BOM e custos:", "Fabricação Sob Medida de Galpão Industrial 15x30m");
      const val = parseFloat(prompt("Digite o valor comercial orçado (R$):", "28000") || 0);

      const analysis = AgentCostEstimator.analyzeCustomProject(desc, val, 1);
      alert(`📐 Auditoria de Custos & BOM:\n\nProjeto: ${analysis.projectName}\nCategoria: ${analysis.category}\nValor de Venda: R$ ${analysis.totalPrice.toFixed(2)}\nCusto Estimado de Engenharia: R$ ${analysis.totalCost.toFixed(2)}\nLucro Bruto: R$ ${analysis.grossProfit.toFixed(2)}\nMargem Comercial: ${analysis.profitMargin}% (Status: ${analysis.status})\nPrazo Estimado: ${analysis.estimatedDays} dias úteis\n\nComposição BOM:\n- Insumos/Aço: R$ ${analysis.bom.rawMaterials.toFixed(2)}\n- Fabricação: R$ ${analysis.bom.manufacturingLabor.toFixed(2)}\n- Engenharia CAD: R$ ${analysis.bom.engineeringHours.toFixed(2)}\n- Montagem em Campo: R$ ${analysis.bom.fieldAssembly.toFixed(2)}`);
      this.renderCurrentTab();
    }
  },

  testFiscalAudit() {
    if (typeof AgentFiscalCompliance !== 'undefined') {
      const res = AgentFiscalCompliance.classifyFiscalItem("Painel de ACM e Letreiro Iluminado LED", true, "SP");
      alert(`🧾 Classificação Fiscal Automatizada:\n\nNCM Classificado: ${res.ncm}\nCFOP Operacional: ${res.cfop}\nCategoria: ${res.fiscalCategory}\nRegime Tributário: ${res.cst} (Simples Nacional sem pendências fiscais)`);
      this.renderCurrentTab();
    }
  },

  testGeneratePix() {
    if (typeof AgentBillingCashflow !== 'undefined') {
      const amount = parseFloat(prompt("Digite o valor para gerar o Pix EMV oficial:", "8500.00") || 8500);
      const pix = AgentBillingCashflow.generatePixPayload({
        key: "financeiro@nexusprojetos.com.br",
        name: "Nexus Engenharia",
        city: "SAO PAULO",
        amount: amount,
        txid: "PV8801"
      });

      alert(`💵 Cobrança Pix EMV Gerada com Sucesso!\n\nRecebedor: ${pix.receiver}\nValor: R$ ${pix.amount.toFixed(2)}\nTxID: ${pix.txid}\n\nCódigo Pix Copia e Cola (Padrão Banco Central):\n${pix.pixCode}`);
      this.renderCurrentTab();
    }
  },

  testFieldRoute() {
    if (typeof AgentFieldDispatcher !== 'undefined') {
      const route = AgentFieldDispatcher.recommendFieldRoute(-23.561684, -46.655981);
      const summary = route.map((c, i) => `${i + 1}. ${c.name} (${c.city}) - Distância: ~${c.distanceKm} km [Score Prioridade: ${c.priorityScore}]`).join('\n');
      alert(`📍 Roteiro Otimizado de Visitas de Campo (Geodésica Haversine):\n\n${summary}`);
      this.renderCurrentTab();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
