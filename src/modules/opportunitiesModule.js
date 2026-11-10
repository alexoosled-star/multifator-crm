/**
 * opportunitiesModule.js - Módulo de Gestão de Oportunidades e Travas de Leads
 * Comunicação com RPCs atômicas do Supabase para exclusividade de carteira.
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';
import { supabaseService } from '../services/supabaseService.js';

export const OpportunitiesModule = {
  init() {
    eventBus.subscribe('CLAIM_LEAD_REQUEST', (data) => this.claimLead(data));
    eventBus.subscribe('RELEASE_LEAD_REQUEST', (cnpj) => this.releaseLead(cnpj));
    eventBus.subscribe('CREATE_OPPORTUNITY_REQUEST', (data) => this.createOpportunity(data));
  },

  async fetchAll() {
    try {
      const data = await supabaseService.select('opportunities', 'order=updated_at.desc');
      const opps = Array.isArray(data) ? data : [];
      store.set('opportunities', opps);
      eventBus.publish('OPPORTUNITIES_UPDATED', opps);
      return opps;
    } catch {
      return [];
    }
  },

  async claimLead({ cnpj, companyName, city, uf }) {
    try {
      const lock = await supabaseService.rpc('claim_lead_saas', {
        p_cnpj: cnpj,
        p_company_name: companyName,
        p_city: city,
        p_uf: uf
      });
      eventBus.publish('LEAD_LOCK_ACQUIRED', lock);
      return lock;
    } catch (err) {
      eventBus.publish('LEAD_LOCK_FAILED', err.message);
      throw err;
    }
  },

  async releaseLead(cnpj) {
    try {
      const result = await supabaseService.rpc('release_lead_saas', { p_cnpj: cnpj });
      eventBus.publish('LEAD_LOCK_RELEASED', { cnpj });
      return result;
    } catch (err) {
      throw err;
    }
  },

  async createOpportunity(oppData) {
    const user = store.get('user');
    const payload = {
      cnpj: oppData.cnpj,
      company_name: oppData.company_name,
      title: oppData.title || `Oportunidade - ${oppData.company_name}`,
      stage: oppData.stage || 'new',
      estimated_value: parseFloat(oppData.estimated_value || 0),
      tax_savings_estimate: parseFloat(oppData.tax_savings_estimate || 0),
      owner_id: user?.id || null,
      owner_name: user?.name || 'Vendedor',
      probability: parseInt(oppData.probability || 20, 10),
      tax_simulation_data: oppData.tax_simulation_data || {},
      notes: oppData.notes || ''
    };

    let created = payload;
    try {
      const resp = await supabaseService.insert('opportunities', payload);
      created = Array.isArray(resp) ? resp[0] : resp;
    } catch {}

    const opps = store.get('opportunities') || [];
    store.set('opportunities', [created, ...opps]);
    eventBus.publish('OPPORTUNITIES_UPDATED', store.get('opportunities'));
    return created;
  }
};
