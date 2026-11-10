/**
 * receitaFederalService.js - Integração Resiliente com Bases Públicas de CNPJ e Receita Federal
 */

class ReceitaFederalService {
  constructor() {
    this.cache = new Map();
  }

  static cleanCnpj(cnpj) {
    return String(cnpj || '').replace(/\D/g, '');
  }

  async fetchCnpj(rawCnpj) {
    const cnpj = ReceitaFederalService.cleanCnpj(rawCnpj);
    if (cnpj.length !== 14) {
      throw new Error('CNPJ inválido. Forneça 14 dígitos numéricos.');
    }

    if (this.cache.has(cnpj)) {
      return this.cache.get(cnpj);
    }

    let result = null;

    // Tentativa 1: BrasilAPI
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (resp.ok) {
        const d = await resp.json();
        result = {
          cnpj,
          razao_social: d.razao_social || d.nome_fantasia || '',
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
            qualificacao: s.qualificacao_socio || s.qualificacao
          })),
          dados_completos: d
        };
      }
    } catch {}

    // Tentativa 2: ReceitaWS (Fallback)
    if (!result) {
      try {
        const resp = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
        if (resp.ok) {
          const d = await resp.json();
          if (d.status !== 'ERROR') {
            result = {
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
              dados_completos: d
            };
          }
        }
      } catch {}
    }

    if (!result) {
      throw new Error('Não foi possível consultar os dados deste CNPJ na base pública.');
    }

    this.cache.set(cnpj, result);
    return result;
  }
}

export const receitaFederalService = new ReceitaFederalService();
