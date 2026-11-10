/**
 * proposalsModule.js - Módulo de Emissão e Gestão de Propostas Comerciais
 * Suporta propostas vinculadas a oportunidades e memoriais de cálculo fiscal.
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';
import { supabaseService } from '../services/supabaseService.js';

export const ProposalsModule = {
  init() {
    eventBus.subscribe('PROPOSAL_SUBMIT_REQUEST', (data) => this.saveProposal(data));
    eventBus.subscribe('PROPOSAL_APPROVE_REQUEST', (id) => this.approveProposal(id));
  },

  generateNumber() {
    const year = new Date().getFullYear();
    const seq = Math.floor(100 + Math.random() * 900);
    return `PROP-${year}-${seq}`;
  },

  async saveProposal(formData) {
    const subtotal = (formData.items || []).reduce((acc, it) => acc + (parseFloat(it.total) || (parseFloat(it.price) * (it.quantity || 1)) || 0), 0);
    const discount = parseFloat(formData.discount || 0);
    const total_amount = Math.max(0, subtotal - discount);

    const payload = {
      opportunity_id: formData.opportunity_id || null,
      number: formData.number || this.generateNumber(),
      client_name: formData.client_name,
      client_cnpj: formData.client_cnpj,
      seller_id: formData.seller_id || null,
      seller_name: formData.seller_name || 'Consultor Comercial',
      status: 'Rascunho',
      items: formData.items || [],
      tax_breakdown: formData.tax_breakdown || {},
      subtotal,
      discount,
      total_amount,
      payment_terms: formData.payment_terms || 'Faturamento em 30 dias.',
      notes: formData.notes || ''
    };

    let saved = payload;
    try {
      const resp = await supabaseService.insert('proposals', payload);
      saved = Array.isArray(resp) ? resp[0] : resp;
    } catch {}

    const list = store.get('proposals') || [];
    store.set('proposals', [saved, ...list]);
    eventBus.publish('PROPOSAL_SAVED', saved);
    return saved;
  },

  async approveProposal(id) {
    const list = store.get('proposals') || [];
    const prop = list.find(p => p.id === id);
    if (prop) {
      prop.status = 'Aprovada';
      try {
        await supabaseService.update('proposals', `id=eq.${id}`, { status: 'Aprovada' });
      } catch {}
      store.set('proposals', [...list]);
      eventBus.publish('PROPOSAL_APPROVED', prop);

      if (prop.opportunity_id) {
        eventBus.publish('OPPORTUNITY_STAGE_CHANGED', { id: prop.opportunity_id, newStage: 'won' });
      }
    }
  }
};
