/**
 * main.js - Ponto de Entrada Principal ES6 da Aplicação CRM Multifator SaaS
 * Orquestra todos os módulos desacoplados, conecta o EventBus e integra os serviços corporativos.
 */

import { bus } from './core/event-bus.js';
import { supabase } from './core/supabase-client.js';
import { TaxSimulator } from './modules/tax-simulator.js';
import { prospecting } from './modules/prospecting.js';
import { opportunities } from './modules/opportunities.js';
import { KanbanModule } from './modules/kanban.js';
import { proposals } from './modules/proposals.js';
import { attachments } from './modules/attachments.js';
import { portfolio } from './modules/portfolio.js';
import { ReportsModule } from './modules/reports.js';

// Exportação global para compatibilidade com a UI existente e consoles
const Multifator = {
  bus,
  supabase,
  TaxSimulator,
  prospecting,
  opportunities,
  KanbanModule,
  proposals,
  attachments,
  portfolio,
  ReportsModule,

  /**
   * Inicialização do ecossistema modular
   */
  async init() {
    console.log('[Multifator SaaS] Inicializando módulos corporativos ES6...');

    // Escuta eventos de auditoria e telemetria
    bus.on('AUTH_LOGIN_SUCCESS', (session) => {
      console.log(`[Multifator SaaS] Usuário autenticado: ${session.user?.email} | Tenant: ${session.profile?.tenant_id || 'N/A'}`);
      this.refreshData();
    });

    bus.on('SUPABASE_REQUEST_ERROR', ({ endpoint, error }) => {
      console.warn(`[Multifator SaaS] Alerta de conexão em ${endpoint}:`, error);
    });

    // Se houver sessão ativa, carrega os dados corporativos em paralelo
    if (supabase.isAuthenticated()) {
      await this.refreshData();
    }

    // Inicializa a interface visual compatível
    if (typeof window.App !== 'undefined' && window.App.init) {
      window.App.init();
    }

    bus.emit('APP_READY', { timestamp: new Date().toISOString() });
    console.log('[Multifator SaaS] Sistema pronto e operacional.');
  },

  /**
   * Sincroniza dados com o Supabase com isolamento de Tenant
   */
  async refreshData() {
    try {
      await Promise.allSettled([
        opportunities.fetchAll(),
        proposals.fetchAll(),
        portfolio.fetchCompanies()
      ]);
    } catch (e) {
      console.error('[Multifator SaaS] Erro ao sincronizar dados iniciais:', e);
    }
  }
};

window.Multifator = Multifator;

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Multifator.init());
} else {
  Multifator.init();
}

export default Multifator;
