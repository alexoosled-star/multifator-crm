/**
 * portfolioModule.js - Módulo de Carteira de Clientes e Contas Ativas
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';
import { supabaseService } from '../services/supabaseService.js';

export const PortfolioModule = {
  init() {
    eventBus.subscribe('LOAD_PORTFOLIO_REQUEST', () => this.fetchCompanies());
    eventBus.subscribe('FILTER_PORTFOLIO_REQUEST', (filter) => this.filterCompanies(filter));
  },

  async fetchCompanies() {
    try {
      const data = await supabaseService.select('companies', 'order=updated_at.desc&limit=100');
      const companies = Array.isArray(data) ? data : [];
      store.set('companies', companies);
      eventBus.publish('PORTFOLIO_LOADED', companies);
      return companies;
    } catch {
      return [];
    }
  },

  filterCompanies(criteria = {}) {
    const list = store.get('companies') || [];
    const filtered = list.filter(c => {
      if (criteria.search) {
        const s = criteria.search.toLowerCase();
        const match = (c.razao_social || '').toLowerCase().includes(s) || (c.cnpj || '').includes(s);
        if (!match) return false;
      }
      if (criteria.regime && c.regime_tributario !== criteria.regime) {
        return false;
      }
      if (criteria.uf && c.uf !== criteria.uf) {
        return false;
      }
      return true;
    });

    eventBus.publish('PORTFOLIO_FILTERED', filtered);
    return filtered;
  }
};
