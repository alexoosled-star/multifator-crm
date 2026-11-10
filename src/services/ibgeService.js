/**
 * ibgeService.js - Serviço de Consulta de Municípios e Estados do IBGE
 */

const IBGE_STATE_CODES = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27',
  SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41',
  SC: '42', RS: '43', MS: '50', MT: '51', GO: '52', DF: '53'
};

class IbgeService {
  constructor() {
    this.cityCache = new Map();
  }

  getStateCode(uf) {
    return IBGE_STATE_CODES[String(uf || '').toUpperCase()] || '31';
  }

  async fetchCities(uf) {
    const cleanUf = String(uf || 'MG').toUpperCase();
    if (this.cityCache.has(cleanUf)) {
      return this.cityCache.get(cleanUf);
    }

    const stateCode = this.getStateCode(cleanUf);
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios?orderBy=nome`;

    try {
      const resp = await fetch(url, { cache: 'force-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const cities = data.map(x => ({
        id: String(x.id),
        name: x.nome
      })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

      this.cityCache.set(cleanUf, cities);
      return cities;
    } catch {
      return [];
    }
  }
}

export const ibgeService = new IbgeService();
