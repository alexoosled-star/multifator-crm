/**
 * reportsModule.js - Módulo de Relatórios Gerenciais, KPIs e Modo TV
 * Calcula conversão do funil, volume transacionado e ranking da equipe.
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';

export const ReportsModule = {
  init() {
    eventBus.subscribe('REQUEST_KPIS', () => {
      const kpis = this.getKPIs();
      eventBus.publish('KPIS_CALCULATED', kpis);
    });
  },

  getKPIs() {
    const opps = store.get('opportunities') || [];
    const props = store.get('proposals') || [];

    const totalPipeline = opps.reduce((acc, o) => acc + (parseFloat(o.estimated_value) || 0), 0);
    const wonOpps = opps.filter(o => o.stage === 'won');
    const totalWon = wonOpps.reduce((acc, o) => acc + (parseFloat(o.estimated_value) || 0), 0);

    const conversionRate = opps.length > 0 ? (wonOpps.length / opps.length) * 100 : 0;
    const avgTicket = wonOpps.length > 0 ? totalWon / wonOpps.length : 0;

    return {
      totalOpportunities: opps.length,
      totalPipeline,
      totalWon,
      wonCount: wonOpps.length,
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      avgTicket: parseFloat(avgTicket.toFixed(2)),
      proposalsCount: props.length
    };
  },

  getLeaderboard() {
    const opps = store.get('opportunities') || [];
    const map = new Map();

    opps.forEach(o => {
      const seller = o.owner_name || 'Vendedor';
      if (!map.has(seller)) {
        map.set(seller, { name: seller, wonCount: 0, wonTotal: 0, count: 0 });
      }
      const item = map.get(seller);
      item.count++;
      if (o.stage === 'won') {
        item.wonCount++;
        item.wonTotal += parseFloat(o.estimated_value) || 0;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.wonTotal - a.wonTotal);
  }
};
