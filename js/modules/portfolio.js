/**
 * PortfolioModule - Gestão da Carteira de Clientes e Contas Ativas
 * Provê filtros por regime tributário, localidade (UF/Cidade), status de relacionamento e saúde do lead.
 */
import { supabase } from '../core/supabase-client.js';
import { bus } from '../core/event-bus.js';

export class PortfolioModule {
  constructor() {
    this.companies = [];
    this.activeFilter = {
      search: '',
      regime: '',
      uf: '',
      status: ''
    };
  }

  /**
   * Carrega empresas do Tenant atual
   */
  async fetchCompanies() {
    try {
      const data = await supabase.select('companies', 'order=updated_at.desc&limit=100');
      this.companies = Array.isArray(data) ? data : [];
      bus.emit('PORTFOLIO_LOADED', this.companies);
      return this.companies;
    } catch (e) {
      console.error('[Portfolio] Erro ao carregar carteira:', e);
      return [];
    }
  }

  /**
   * Aplica filtros combinados em memória
   */
  getFilteredCompanies() {
    return this.companies.filter(c => {
      if (this.activeFilter.search) {
        const s = this.activeFilter.search.toLowerCase();
        const matchName = (c.razao_social || '').toLowerCase().includes(s);
        const matchFantasy = (c.nome_fantasia || '').toLowerCase().includes(s);
        const matchCnpj = (c.cnpj || '').includes(s);
        if (!matchName && !matchFantasy && !matchCnpj) return false;
      }

      if (this.activeFilter.regime && c.regime_tributario !== this.activeFilter.regime) {
        return false;
      }

      if (this.activeFilter.uf && c.uf !== this.activeFilter.uf) {
        return false;
      }

      return true;
    });
  }

  setFilter(updates) {
    this.activeFilter = { ...this.activeFilter, ...updates };
    bus.emit('PORTFOLIO_FILTER_CHANGED', this.getFilteredCompanies());
  }
}

export const portfolio = new PortfolioModule();
if (typeof window !== 'undefined') {
  window.MultifatorPortfolio = portfolio;
}
