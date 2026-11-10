/**
 * prospectingModule.js - Módulo de Prospecção e Enriquecimento de Leads
 * Integra busca na Receita Federal, localidades do IBGE e cálculo de atratividade de leads.
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';
import { receitaFederalService } from '../services/receitaFederalService.js';
import { ibgeService } from '../services/ibgeService.js';

export const ProspectingModule = {
  init() {
    eventBus.subscribe('SEARCH_CNPJ_REQUESTED', (cnpj) => this.searchCnpj(cnpj));
    eventBus.subscribe('LOAD_CITIES_REQUESTED', (uf) => this.loadCities(uf));
  },

  async searchCnpj(rawCnpj) {
    eventBus.publish('PROSPECTING_LOADING', true);
    try {
      const data = await receitaFederalService.fetchCnpj(rawCnpj);
      data.score = this.calculateScore(data);

      store.set('activeRow', data);
      eventBus.publish('PROSPECTING_RESULT_SUCCESS', data);
      return data;
    } catch (err) {
      eventBus.publish('PROSPECTING_RESULT_ERROR', err.message);
      throw err;
    } finally {
      eventBus.publish('PROSPECTING_LOADING', false);
    }
  },

  calculateScore(company) {
    let score = 50;
    if (company.situacao_cadastral === 'ATIVA') score += 15;
    if (company.capital_social > 100000) score += 15;
    if (company.capital_social > 1000000) score += 10;
    if (company.qsa && company.qsa.length >= 2) score += 5;
    if (company.telefone && company.email) score += 5;
    return Math.min(100, Math.max(0, score));
  },

  async loadCities(uf) {
    const cities = await ibgeService.fetchCities(uf);
    store.set('municipalities', cities);
    eventBus.publish('CITIES_LOADED', cities);
    return cities;
  }
};
