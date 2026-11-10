/**
 * taxSimulatorModule.js - Módulo Especialista em Cálculos e Simulações Tributárias
 * Preserva estritamente as fórmulas matemáticas e regras fiscais do protótipo v25.0.
 */
import { eventBus } from '../core/eventBus.js';

export const TaxSimulatorModule = {
  init() {
    eventBus.subscribe('TAX_SIMULATION_REQUESTED', (payload) => {
      const result = this.compareRegimes(payload.monthlyRevenue, payload.cnae, payload.options);
      eventBus.publish('TAX_SIMULATION_COMPLETED', result);
    });
  },

  identifyActivity(cnae = '') {
    const c = String(cnae || '').replace(/\D/g, '');
    const prefix = parseInt(c.substring(0, 2), 10) || 0;

    if (prefix >= 10 && prefix <= 33) {
      return { code: 'industry', label: 'Indústria / Transformação' };
    }
    if (prefix >= 45 && prefix <= 47) {
      return { code: 'commerce', label: 'Comércio Atacadista / Varejista' };
    }
    if (prefix >= 64 && prefix <= 66) {
      return { code: 'finance', label: 'Setor Financeiro / Seguros' };
    }
    if ((prefix >= 58 && prefix <= 63) || (prefix >= 69 && prefix <= 82) || (prefix >= 85 && prefix <= 96)) {
      return { code: 'services', label: 'Serviços em Geral / Consultoria' };
    }

    return { code: 'commerce', label: 'Comércio / Geral' };
  },

  calcLucroPresumido(revenue, opts = {}) {
    const activity = opts.activity || 'commerce';
    const payrollPct = Math.max(0, Math.min(1, (Number(opts.payrollPct ?? 20)) / 100));
    const ipiRatePct = activity === 'industry' ? Number(opts.ipiRate ?? 5) / 100 : 0;

    const irRate = activity === 'services' ? 0.32 : 0.08;
    const csRate = activity === 'services' ? 0.32 : 0.12;

    const baseIr = revenue * irRate;
    const baseCs = revenue * csRate;

    const pis = revenue * 0.0065;
    const cofins = revenue * 0.03;
    const irpj = (baseIr * 0.15) + Math.max(0, baseIr - 20000) * 0.10;
    const csll = baseCs * 0.09;
    const inssPatronal = revenue * payrollPct * 0.20;
    const ipi = revenue * ipiRatePct;

    const total = pis + cofins + irpj + csll + inssPatronal + ipi;
    const effectiveRate = revenue > 0 ? (total / revenue) * 100 : 0;

    return {
      regime: 'LUCRO PRESUMIDO',
      monthlyRevenue: revenue,
      annualRevenue: revenue * 12,
      breakdown: {
        pis: { value: pis, rate: 0.65 },
        cofins: { value: cofins, rate: 3.00 },
        irpj: { value: irpj, base: baseIr, presumptionRate: irRate * 100 },
        csll: { value: csll, base: baseCs, presumptionRate: csRate * 100 },
        inssPatronal: { value: inssPatronal, payrollPct: payrollPct * 100 },
        ipi: { value: ipi, rate: ipiRatePct * 100 }
      },
      monthlyTotal: total,
      annualTotal: total * 12,
      effectiveRate: parseFloat(effectiveRate.toFixed(2)),
      notes: `Presunção IRPJ: ${(irRate * 100)}% | CSLL: ${(csRate * 100)}% | PIS/COFINS cumulativo.`
    };
  },

  calcLucroReal(revenue, opts = {}) {
    const margin = Math.max(0, Math.min(1, (Number(opts.margin ?? 12)) / 100));
    const creditRate = Math.max(0, Math.min(1, (Number(opts.credit ?? 50)) / 100));
    const payrollPct = Math.max(0, Math.min(1, (Number(opts.payrollPct ?? 20)) / 100));
    const activity = opts.activity || 'commerce';
    const ipiRatePct = activity === 'industry' ? Number(opts.ipiRate ?? 5) / 100 : 0;

    const taxableProfit = revenue * margin;

    const pisGross = revenue * 0.0165;
    const cofinsGross = revenue * 0.076;
    const pis = pisGross * (1 - creditRate);
    const cofins = cofinsGross * (1 - creditRate);

    const irpj = (taxableProfit * 0.15) + Math.max(0, taxableProfit - 20000) * 0.10;
    const csll = taxableProfit * 0.09;
    const inssPatronal = revenue * payrollPct * 0.20;
    const ipi = revenue * ipiRatePct;

    const total = pis + cofins + irpj + csll + inssPatronal + ipi;
    const effectiveRate = revenue > 0 ? (total / revenue) * 100 : 0;

    return {
      regime: 'LUCRO REAL',
      monthlyRevenue: revenue,
      annualRevenue: revenue * 12,
      breakdown: {
        marginUsed: margin * 100,
        taxableProfit,
        pis: { value: pis, gross: pisGross, creditRate: creditRate * 100 },
        cofins: { value: cofins, gross: cofinsGross, creditRate: creditRate * 100 },
        irpj: { value: irpj, rate: 15 },
        csll: { value: csll, rate: 9 },
        inssPatronal: { value: inssPatronal, payrollPct: payrollPct * 100 },
        ipi: { value: ipi, rate: ipiRatePct * 100 }
      },
      monthlyTotal: total,
      annualTotal: total * 12,
      effectiveRate: parseFloat(effectiveRate.toFixed(2)),
      notes: `Margem estimada: ${(margin * 100).toFixed(1)}% | Crédito PIS/COFINS: ${(creditRate * 100)}%.`
    };
  },

  compareRegimes(monthlyRevenue, cnae = '', opts = {}) {
    const activityInfo = this.identifyActivity(cnae);
    const activity = opts.activity || activityInfo.code;

    const presumido = this.calcLucroPresumido(monthlyRevenue, { ...opts, activity });
    const real = this.calcLucroReal(monthlyRevenue, { ...opts, activity });

    const diffMonthly = Math.abs(presumido.monthlyTotal - real.monthlyTotal);
    const diffAnnual = diffMonthly * 12;

    const bestRegime = presumido.monthlyTotal <= real.monthlyTotal ? 'LUCRO PRESUMIDO' : 'LUCRO REAL';
    const savingsPercent = Math.max(presumido.monthlyTotal, real.monthlyTotal) > 0
      ? (diffMonthly / Math.max(presumido.monthlyTotal, real.monthlyTotal)) * 100
      : 0;

    return {
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
      activity: activityInfo,
      presumido,
      real,
      recommendation: {
        bestRegime,
        annualSavings: diffAnnual,
        monthlySavings: diffMonthly,
        savingsPercent: parseFloat(savingsPercent.toFixed(2)),
        headline: `Migração estratégica para ${bestRegime} gera economia estimada de R$ ${diffAnnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano.`
      }
    };
  }
};
