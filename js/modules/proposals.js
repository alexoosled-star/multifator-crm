/**
 * ProposalsModule - Gerador e Emissor de Propostas Comerciais Corporativas
 * Integra serviços tributários, itens de catálogo e memorial de cálculo com impressão executiva.
 */
import { supabase } from '../core/supabase-client.js';
import { bus } from '../core/event-bus.js';
import { opportunities } from './opportunities.js';

export class ProposalsModule {
  constructor() {
    this.proposals = [];
  }

  /**
   * Gera número sequencial padronizado de proposta
   */
  static generateProposalNumber() {
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    return `PROP-${year}-${rand}`;
  }

  /**
   * Carrega propostas do tenant
   */
  async fetchAll() {
    try {
      const data = await supabase.select('proposals', 'order=created_at.desc');
      this.proposals = Array.isArray(data) ? data : [];
      bus.emit('PROPOSALS_LOADED', this.proposals);
      return this.proposals;
    } catch (e) {
      console.error('[Proposals] Erro ao carregar propostas:', e);
      return [];
    }
  }

  /**
   * Cria uma proposta comercial vinculada a uma oportunidade
   */
  async createProposal(proposalData) {
    const user = supabase.getCurrentUser();
    const profile = supabase.session?.profile;

    const number = proposalData.number || ProposalsModule.generateProposalNumber();
    const subtotal = (proposalData.items || []).reduce((sum, item) => sum + (parseFloat(item.total) || (parseFloat(item.price) * (item.quantity || 1)) || 0), 0);
    const discount = parseFloat(proposalData.discount || 0);
    const total_amount = Math.max(0, subtotal - discount);

    const payload = {
      opportunity_id: proposalData.opportunity_id || null,
      number,
      client_name: proposalData.client_name,
      client_cnpj: proposalData.client_cnpj,
      seller_id: user?.id,
      seller_name: profile?.full_name || user?.email || 'Consultor Comercial',
      status: 'Rascunho',
      items: proposalData.items || [],
      tax_breakdown: proposalData.tax_breakdown || {},
      subtotal,
      discount,
      total_amount,
      payment_terms: proposalData.payment_terms || 'Condições comerciais padrão. Pagamento em 30 dias.',
      notes: proposalData.notes || ''
    };

    const result = await supabase.insert('proposals', payload);
    const created = Array.isArray(result) ? result[0] : result;

    this.proposals.unshift(created);
    bus.emit('PROPOSAL_CREATED', created);

    // Se estiver vinculada a uma oportunidade no estágio 'new' ou 'qualified', avança para 'proposal'
    if (proposalData.opportunity_id) {
      try {
        await opportunities.update(proposalData.opportunity_id, {
          stage: 'proposal',
          estimated_value: total_amount
        });
      } catch {}
    }

    return created;
  }

  /**
   * Aprova proposta e converte oportunidade no funil para 'won' (Ganho)
   */
  async approveProposal(id) {
    const updated = await supabase.update('proposals', `id=eq.${id}`, {
      status: 'Aprovada',
      updated_at: new Date().toISOString()
    });

    const prop = Array.isArray(updated) ? updated[0] : updated;
    bus.emit('PROPOSAL_APPROVED', prop);

    if (prop?.opportunity_id) {
      await opportunities.moveToStage(prop.opportunity_id, 'won');
    }

    return prop;
  }

  /**
   * Gera HTML executivo formatado para impressão ou exportação PDF da proposta
   */
  static renderPrintableHtml(proposal) {
    const itemsHtml = (proposal.items || []).map((it, idx) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;">${idx + 1}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;font-weight:600;">${it.name || 'Serviço Consultivo'}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;text-align:center;">${it.quantity || 1}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;text-align:right;">R$ ${(parseFloat(it.price) || 0).toFixed(2)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;text-align:right;font-weight:700;">R$ ${(parseFloat(it.total || it.price) || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const taxSavings = proposal.tax_breakdown?.estimated_annual_savings || 0;

    return `
      <div class="printable-proposal" style="max-width:800px;margin:0 auto;background:#fff;padding:2.5rem;font-family:'Inter',sans-serif;color:#1e293b;line-height:1.6;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #2563eb;padding-bottom:1.5rem;margin-bottom:2rem;">
          <div>
            <h1 style="font-size:1.8rem;color:#0a1428;margin:0;font-weight:900;">PROPOSTA COMERCIAL</h1>
            <p style="color:#64748b;font-size:0.9rem;margin-top:4px;">Número: <strong>${proposal.number}</strong> • Data: ${proposal.date || new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800;color:#1e40af;font-size:1.2rem;">MULTIFATOR SAAS</div>
            <div style="color:#64748b;font-size:0.8rem;">Soluções Tributárias e Inteligência Corporativa</div>
          </div>
        </div>

        <div style="background:#f8fafc;border-radius:8px;padding:1.25rem;border:1px solid #e2e8f0;margin-bottom:2rem;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;">Dados do Cliente</div>
            <div style="font-size:1rem;font-weight:800;color:#0f172a;margin-top:4px;">${proposal.client_name}</div>
            <div style="font-size:0.85rem;color:#475569;font-family:monospace;">CNPJ: ${proposal.client_cnpj}</div>
          </div>
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;">Consultor Responsável</div>
            <div style="font-size:1rem;font-weight:800;color:#0f172a;margin-top:4px;">${proposal.seller_name}</div>
            <div style="font-size:0.85rem;color:#10b981;font-weight:600;">Status: ${proposal.status}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;">
          <thead>
            <tr style="background:#0a1428;color:#fff;text-align:left;">
              <th style="padding:10px;font-size:0.8rem;">Item</th>
              <th style="padding:10px;font-size:0.8rem;">Descrição do Escopo</th>
              <th style="padding:10px;font-size:0.8rem;text-align:center;">Qtd</th>
              <th style="padding:10px;font-size:0.8rem;text-align:right;">Unitário</th>
              <th style="padding:10px;font-size:0.8rem;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="display:flex;justify-content:flex-end;margin-bottom:2rem;">
          <div style="min-width:280px;background:#f8fafc;padding:1rem;border-radius:8px;border:1px solid #e2e8f0;">
            <div style="display:flex;justify-content:space-between;font-size:0.9rem;margin-bottom:6px;">
              <span>Subtotal:</span>
              <span>R$ ${(proposal.subtotal || 0).toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.9rem;margin-bottom:6px;color:#ef4444;">
              <span>Desconto:</span>
              <span>- R$ ${(proposal.discount || 0).toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:1.15rem;font-weight:900;border-top:2px solid #cbd5e1;padding-top:8px;color:#1e40af;">
              <span>Total Final:</span>
              <span>R$ ${(proposal.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${taxSavings > 0 ? `
          <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:1rem;border-radius:0 8px 8px 0;margin-bottom:2rem;">
            <strong style="color:#1e40af;display:block;margin-bottom:4px;">💡 Retorno sobre Investimento (ROI Tributário):</strong>
            <span style="font-size:0.9rem;color:#334155;">
              A implementação do diagnóstico tributário proposto projeta uma economia fiscal de 
              <strong>R$ ${taxSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ao ano</strong>.
            </span>
          </div>
        ` : ''}

        <div style="border-top:1px solid #e2e8f0;padding-top:1.5rem;margin-top:2rem;">
          <div style="font-size:0.8rem;color:#64748b;margin-bottom:1rem;">Condições: ${proposal.payment_terms}</div>
          <div style="display:flex;justify-content:space-around;margin-top:3rem;text-align:center;">
            <div style="border-top:1px solid #94a3b8;width:220px;padding-top:8px;font-size:0.8rem;">
              <strong>${proposal.client_name}</strong><br>De Acordo / Aceite
            </div>
            <div style="border-top:1px solid #94a3b8;width:220px;padding-top:8px;font-size:0.8rem;">
              <strong>Multifator CRM SaaS</strong><br>Diretoria Comercial
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export const proposals = new ProposalsModule();
if (typeof window !== 'undefined') {
  window.MultifatorProposals = proposals;
}
