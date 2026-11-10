/**
 * ReportsModule - Métricas Executivas, Análise de Funil e Modo TV Arena de Vendas
 */
import { opportunities } from './opportunities.js';
import { proposals } from './proposals.js';

export class ReportsModule {
  /**
   * Calcula indicadores consolidados de performance comercial
   */
  static getExecutiveKPIs() {
    const opps = opportunities.opportunities || [];
    const props = proposals.proposals || [];

    const totalPipelineValue = opps.reduce((sum, o) => sum + (parseFloat(o.estimated_value) || 0), 0);
    const wonOpps = opps.filter(o => o.stage === 'won');
    const wonValue = wonOpps.reduce((sum, o) => sum + (parseFloat(o.estimated_value) || 0), 0);

    const conversionRate = opps.length > 0 ? (wonOpps.length / opps.length) * 100 : 0;
    const avgTicket = wonOpps.length > 0 ? wonValue / wonOpps.length : 0;

    const totalTaxSavings = opps.reduce((sum, o) => sum + (parseFloat(o.tax_savings_estimate) || 0), 0);

    return {
      totalOpportunities: opps.length,
      totalPipelineValue,
      wonCount: wonOpps.length,
      wonValue,
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      avgTicket: parseFloat(avgTicket.toFixed(2)),
      totalTaxSavings,
      totalProposals: props.length
    };
  }

  /**
   * Agrupa ranking de vendedores (Leaderboard do Modo TV)
   */
  static getSellerRanking() {
    const opps = opportunities.opportunities || [];
    const rankingMap = new Map();

    opps.forEach(o => {
      const seller = o.owner_name || 'Desconhecido';
      if (!rankingMap.has(seller)) {
        rankingMap.set(seller, {
          name: seller,
          totalOpps: 0,
          wonCount: 0,
          wonAmount: 0,
          pipelineAmount: 0
        });
      }

      const entry = rankingMap.get(seller);
      entry.totalOpps++;
      const val = parseFloat(o.estimated_value) || 0;
      entry.pipelineAmount += val;

      if (o.stage === 'won') {
        entry.wonCount++;
        entry.wonAmount += val;
      }
    });

    return Array.from(rankingMap.values()).sort((a, b) => b.wonAmount - a.wonAmount);
  }
}

if (typeof window !== 'undefined') {
  window.MultifatorReports = ReportsModule;
}
