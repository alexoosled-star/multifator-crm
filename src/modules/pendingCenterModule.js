/**
 * pendingCenterModule.js - Central de Pendências e Alertas de SLA
 * Monitora oportunidades estagnadas, propostas sem resposta e tarefas comerciais pendentes.
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';

export const PendingCenterModule = {
  init() {
    eventBus.subscribe('SCAN_PENDING_REQUEST', () => this.scanPendingItems());
  },

  scanPendingItems() {
    const opps = store.get('opportunities') || [];
    const now = Date.now();
    const pendings = [];

    opps.forEach(opp => {
      const updatedTime = new Date(opp.updated_at || opp.created_at || now).getTime();
      const diffHours = (now - updatedTime) / (1000 * 60 * 60);

      // Alerta de SLA: mais de 72h sem movimentação em estágios intermediários
      if (['qualified', 'proposal', 'negotiation'].includes(opp.stage) && diffHours > 72) {
        pendings.push({
          type: 'SLA_ALERT',
          oppId: opp.id,
          company: opp.company_name,
          stage: opp.stage,
          hoursStagnant: Math.floor(diffHours),
          message: `Oportunidade estagnada há ${Math.floor(diffHours)}h na etapa de ${opp.stage}.`
        });
      }
    });

    eventBus.publish('PENDINGS_SCANNED', pendings);
    return pendings;
  }
};
