/**
 * OpportunitiesService - Gestão de Oportunidades Comerciais, Exclusividade de Leads e Pipeline
 * Comunica-se com o Supabase com RLS ativo e emite eventos no EventBus.
 */
import { supabase } from '../core/supabase-client.js';
import { bus } from '../core/event-bus.js';

export class OpportunitiesService {
  constructor() {
    this.opportunities = [];
  }

  /**
   * Carrega todas as oportunidades visíveis do Tenant atual
   */
  async fetchAll() {
    try {
      const data = await supabase.select('opportunities', 'order=updated_at.desc');
      this.opportunities = Array.isArray(data) ? data : [];
      bus.emit('OPPORTUNITIES_LOADED', this.opportunities);
      return this.opportunities;
    } catch (error) {
      console.error('[Opportunities] Erro ao carregar:', error);
      bus.emit('OPPORTUNITIES_LOAD_ERROR', error.message);
      return [];
    }
  }

  /**
   * Reivindica exclusividade de lead (Atomic Lead Lock)
   */
  async claimLead(cnpj, companyName = '', city = '', uf = '') {
    const user = supabase.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    try {
      const lock = await supabase.rpc('claim_lead_saas', {
        p_cnpj: cnpj,
        p_company_name: companyName,
        p_city: city,
        p_uf: uf
      });

      bus.emit('LEAD_CLAIMED', lock);
      return lock;
    } catch (error) {
      console.error('[Opportunities] Falha no lock do lead:', error);
      throw error;
    }
  }

  /**
   * Libera trava de lead de volta para a carteira
   */
  async releaseLead(cnpj) {
    try {
      const result = await supabase.rpc('release_lead_saas', { p_cnpj: cnpj });
      bus.emit('LEAD_RELEASED', { cnpj });
      return result;
    } catch (error) {
      console.error('[Opportunities] Falha ao liberar lead:', error);
      throw error;
    }
  }

  /**
   * Cria nova oportunidade comercial
   */
  async create(opportunityData) {
    const user = supabase.getCurrentUser();
    const profile = supabase.session?.profile;

    const payload = {
      cnpj: opportunityData.cnpj,
      company_name: opportunityData.company_name || 'Nova Empresa',
      title: opportunityData.title || `Oportunidade - ${opportunityData.company_name}`,
      stage: opportunityData.stage || 'new',
      estimated_value: parseFloat(opportunityData.estimated_value || 0),
      monthly_fee: parseFloat(opportunityData.monthly_fee || 0),
      tax_savings_estimate: parseFloat(opportunityData.tax_savings_estimate || 0),
      owner_id: user?.id,
      owner_name: profile?.full_name || user?.email || 'Vendedor',
      contact_name: opportunityData.contact_name || '',
      contact_phone: opportunityData.contact_phone || '',
      contact_email: opportunityData.contact_email || '',
      probability: parseInt(opportunityData.probability || 20, 10),
      tax_simulation_data: opportunityData.tax_simulation_data || {},
      notes: opportunityData.notes || ''
    };

    // Auto-claim do lead antes de cadastrar
    try {
      await this.claimLead(payload.cnpj, payload.company_name);
    } catch (e) {
      console.warn('Lead já travado ou auto-claim ignorado:', e);
    }

    const created = await supabase.insert('opportunities', payload);
    const opp = Array.isArray(created) ? created[0] : created;

    this.opportunities.unshift(opp);
    bus.emit('OPPORTUNITY_CREATED', opp);
    return opp;
  }

  /**
   * Atualiza oportunidade existente
   */
  async update(id, updates) {
    const updated = await supabase.update('opportunities', `id=eq.${id}`, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    const opp = Array.isArray(updated) ? updated[0] : updated;
    const index = this.opportunities.findIndex(o => o.id === id);
    if (index !== -1 && opp) {
      this.opportunities[index] = { ...this.opportunities[index], ...opp };
    }

    bus.emit('OPPORTUNITY_UPDATED', opp);
    return opp;
  }

  /**
   * Atualiza o estágio do funil com validação de governança
   */
  async moveToStage(id, newStage, lossReason = '') {
    const opp = this.opportunities.find(o => o.id === id);
    if (!opp) throw new Error('Oportunidade não encontrada.');

    // Regras de Governança de Funil
    if (newStage === 'proposal' && !opp.estimated_value && !opp.tax_savings_estimate) {
      throw new Error('Não é permitido avançar para "Proposta" sem estimativa de valor ou simulação tributária concluída.');
    }

    if (newStage === 'lost' && !lossReason) {
      throw new Error('Para marcar como "Perdido", é obrigatório registrar o motivo da perda.');
    }

    const payload = {
      stage: newStage,
      updated_at: new Date().toISOString()
    };

    if (newStage === 'lost') payload.loss_reason = lossReason;
    if (newStage === 'won') payload.probability = 100;

    return await this.update(id, payload);
  }

  /**
   * Remove oportunidade
   */
  async delete(id) {
    await supabase.delete('opportunities', `id=eq.${id}`);
    this.opportunities = this.opportunities.filter(o => o.id !== id);
    bus.emit('OPPORTUNITY_DELETED', { id });
    return true;
  }
}

export const opportunities = new OpportunitiesService();
if (typeof window !== 'undefined') {
  window.MultifatorOpportunities = opportunities;
}
