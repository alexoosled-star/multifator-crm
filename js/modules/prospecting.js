/**
 * ProspectingEngine - Motor de Prospecção Comercial Integrado à Receita Federal e IBGE
 * Consulta dados públicos de CNPJ, enriquece com QSA e qualifica leads para o funil comercial.
 */
import { supabase } from '../core/supabase-client.js';
import { bus } from '../core/event-bus.js';

export class ProspectingEngine {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Sanitiza string de CNPJ
   */
  static cleanCnpj(cnpj) {
    return String(cnpj || '').replace(/\D/g, '');
  }

  /**
   * Formata CNPJ (00.000.000/0000-00)
   */
  static formatCnpj(cnpj) {
    const c = this.cleanCnpj(cnpj).padStart(14, '0');
    return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  /**
   * Consulta dados completos de CNPJ com fallback entre APIs públicas
   * @param {string} rawCnpj 
   */
  async fetchCompanyByCnpj(rawCnpj) {
    const cnpj = ProspectingEngine.cleanCnpj(rawCnpj);
    if (cnpj.length !== 14) {
      throw new Error('CNPJ inválido. Deve conter 14 dígitos numéricos.');
    }

    if (this.cache.has(cnpj)) {
      return this.cache.get(cnpj);
    }

    bus.emit('PROSPECTING_FETCH_START', { cnpj });

    let companyData = null;

    // Tentativa 1: BrasilAPI
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (response.ok) {
        const d = await response.json();
        companyData = {
          cnpj,
          razao_social: d.razao_social || d.nome_fantasia || 'Empresa Sem Razão Social',
          nome_fantasia: d.nome_fantasia || d.razao_social || '',
          cnae_principal: String(d.cnae_fiscal || ''),
          cnae_descricao: d.cnae_fiscal_descricao || '',
          regime_tributario: d.opcao_pelo_simples ? 'SIMPLES NACIONAL' : 'LUCRO PRESUMIDO',
          cidade: d.municipio || '',
          uf: d.uf || '',
          cep: d.cep || '',
          logradouro: d.logradouro || '',
          numero: d.numero || '',
          bairro: d.bairro || '',
          telefone: d.ddd_telefone_1 || '',
          email: d.email || '',
          capital_social: parseFloat(d.capital_social || 0),
          situacao_cadastral: d.descricao_situacao_cadastral || 'ATIVA',
          qsa: (d.qsa || []).map(s => ({
            nome: s.nome_socio || s.nome,
            qualificacao: s.qualificacao_socio || s.qualificacao,
            faixa_etaria: s.faixa_etaria || ''
          })),
          dados_receita: d
        };
      }
    } catch (e) {
      console.warn('BrasilAPI indisponível, tentando fallback ReceitaWS:', e);
    }

    // Tentativa 2: ReceitaWS (Fallback)
    if (!companyData) {
      try {
        const rws = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
        if (rws.ok) {
          const d = await rws.json();
          if (d.status !== 'ERROR') {
            companyData = {
              cnpj,
              razao_social: d.nome || '',
              nome_fantasia: d.fantasia || d.nome || '',
              cnae_principal: d.atividade_principal?.[0]?.code || '',
              cnae_descricao: d.atividade_principal?.[0]?.text || '',
              regime_tributario: d.simples?.optante ? 'SIMPLES NACIONAL' : 'NÃO IDENTIFICADO',
              cidade: d.municipio || '',
              uf: d.uf || '',
              cep: d.cep || '',
              logradouro: d.logradouro || '',
              numero: d.numero || '',
              bairro: d.bairro || '',
              telefone: d.telefone || '',
              email: d.email || '',
              capital_social: parseFloat(d.capital_social || 0),
              situacao_cadastral: d.situacao || 'ATIVA',
              qsa: (d.qsa || []).map(s => ({
                nome: s.nome,
                qualificacao: s.qual
              })),
              dados_receita: d
            };
          }
        }
      } catch (e) {
        console.warn('ReceitaWS fallback falhou:', e);
      }
    }

    if (!companyData) {
      bus.emit('PROSPECTING_FETCH_ERROR', { cnpj, message: 'CNPJ não encontrado na base pública.' });
      throw new Error('Não foi possível consultar os dados cadastrais deste CNPJ na Receita Federal.');
    }

    // Calcula Score Comercial do Lead (0 a 100)
    companyData.leadScore = this.calculateLeadScore(companyData);

    this.cache.set(cnpj, companyData);
    bus.emit('PROSPECTING_FETCH_SUCCESS', companyData);
    return companyData;
  }

  /**
   * Avalia a atratividade do lead com base em capital, sócios e atividade
   */
  calculateLeadScore(company) {
    let score = 50;

    if (company.situacao_cadastral === 'ATIVA') score += 15;
    if (company.capital_social > 100000) score += 15;
    if (company.capital_social > 1000000) score += 10;
    if (company.qsa && company.qsa.length >= 2) score += 5;
    if (company.telefone && company.email) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Salva a empresa no banco de dados Supabase da organização
   */
  async saveToTenantDatabase(companyData) {
    const tenantId = supabase.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Organização não identificada. Efetue login para salvar no banco corporativo.');
    }

    const payload = {
      ...companyData,
      tenant_id: tenantId
    };

    const saved = await supabase.insert('companies', payload);
    bus.emit('COMPANY_SAVED_TO_DB', saved);
    return saved;
  }
}

export const prospecting = new ProspectingEngine();
if (typeof window !== 'undefined') {
  window.MultifatorProspecting = prospecting;
}
