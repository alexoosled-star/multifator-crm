/**
 * kanbanModule.js - Módulo de Governança do Funil Comercial Kanban
 * Gerencia os 6 estágios, transições de status com validação de SLA e drag-and-drop.
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';

export const KanbanModule = {
  STAGES: [
    { id: 'new', label: 'Novo Lead', color: '#3b82f6' },
    { id: 'qualified', label: 'Qualificação', color: '#06b6d4' },
    { id: 'proposal', label: 'Proposta', color: '#8b5cf6' },
    { id: 'negotiation', label: 'Negociação', color: '#f59e0b' },
    { id: 'won', label: 'Ganho', color: '#10b981' },
    { id: 'lost', label: 'Perdido', color: '#ef4444' }
  ],

  init() {
    eventBus.subscribe('OPPORTUNITIES_UPDATED', (opps) => this.onOpportunitiesUpdated(opps));
    eventBus.subscribe('OPPORTUNITY_STAGE_CHANGED', (data) => this.onStageChanged(data));
  },

  onOpportunitiesUpdated(opps) {
    store.set('opportunities', opps || []);
  },

  onStageChanged({ id, newStage, lossReason }) {
    const opps = store.get('opportunities') || [];
    const opp = opps.find(o => o.id === id);
    if (!opp) return;

    if (newStage === 'proposal' && !opp.estimated_value && !opp.tax_savings_estimate) {
      throw new Error('Não é permitido avançar para "Proposta" sem estimativa de valor ou simulação tributária.');
    }

    if (newStage === 'lost' && !lossReason) {
      throw new Error('Para marcar como "Perdido", é obrigatório registrar o motivo da perda.');
    }

    opp.stage = newStage;
    if (newStage === 'lost') opp.loss_reason = lossReason;
    if (newStage === 'won') opp.probability = 100;

    store.set('opportunities', [...opps]);
    eventBus.publish('OPPORTUNITY_MUTATED', opp);
  },

  calculateColumnTotals(stageId) {
    const opps = (store.get('opportunities') || []).filter(o => o.stage === stageId);
    const totalValue = opps.reduce((sum, o) => sum + (parseFloat(o.estimated_value) || 0), 0);
    return {
      count: opps.length,
      totalValue,
      formattedTotal: totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    };
  }
};
