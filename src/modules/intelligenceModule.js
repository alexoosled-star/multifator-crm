/**
 * intelligenceModule.js - Módulo de Inteligência Artificial e Copilot Comercial
 * Fornece argumentos consultivos, análises de abordagem e diagnósticos fiscais.
 */
import { eventBus } from '../core/eventBus.js';

export const IntelligenceModule = {
  init() {
    eventBus.subscribe('GENERATE_PITCH_REQUEST', (company) => this.generatePitch(company));
    eventBus.subscribe('ANALYZE_TAX_RISK_REQUEST', (taxData) => this.analyzeTaxRisk(taxData));
  },

  generatePitch(company) {
    const name = company.nome_fantasia || company.razao_social || 'Empresa';
    const regime = company.regime_tributario || 'Lucro Presumido';
    const city = company.cidade || 'sua região';

    const pitch = `Prezado diretor da ${name}, identificamos em nossa varredura de dados públicos em ${city} que o enquadramento fiscal atual (${regime}) possui potencial para revisão e recuperação de créditos tributários com base nas teses de PIS/COFINS e exclusão de ICMS da base de cálculo.`;

    eventBus.publish('PITCH_GENERATED', { company, pitch });
    return pitch;
  },

  analyzeTaxRisk(taxData) {
    const risks = [];
    if (taxData.effectiveRate > 15) {
      risks.push('Alíquota efetiva superior à média de mercado para o segmento.');
    }
    if (taxData.regime === 'LUCRO PRESUMIDO' && taxData.annualRevenue > 4800000) {
      risks.push('Proximidade do limite de presunção; estudo de migração para Lucro Real é urgente.');
    }

    const report = {
      evaluatedAt: new Date().toISOString(),
      risks,
      riskLevel: risks.length > 1 ? 'Alto' : (risks.length === 1 ? 'Moderado' : 'Baixo')
    };

    eventBus.publish('TAX_RISK_ANALYZED', report);
    return report;
  }
};
