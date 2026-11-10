/**
 * state.js - Gerenciamento Central de Estado da Aplicação
 * Preserva integralmente as propriedades e estruturas de dados do protótipo v25.0.
 */
import { eventBus } from './eventBus.js';

class StateStore {
  constructor() {
    this.state = {
      user: null,
      tenantId: null,
      rows: [],
      filtered: [],
      opportunities: [],
      proposals: [],
      companies: [],
      crm: {},
      teamConfig: null,
      teamMembers: [],
      activeRow: null,
      activeOpportunity: null,
      activeProposal: null,
      currentCityKey: null,
      municipalities: [],
      uf: 'MG',
      ibgeState: '31',
      stats: {
        sourceTotal: 0,
        matches: 0,
        phoneCount: 0,
        crmCount: 0
      }
    };
  }

  get(key) {
    return this.state[key];
  }

  getAll() {
    return { ...this.state };
  }

  set(key, value) {
    this.state[key] = value;
    eventBus.publish(`STATE_CHANGED:${key}`, value);
    eventBus.publish('STATE_UPDATED', { key, value });
  }

  update(updates) {
    Object.assign(this.state, updates);
    Object.keys(updates).forEach(key => {
      eventBus.publish(`STATE_CHANGED:${key}`, updates[key]);
    });
    eventBus.publish('STATE_UPDATED', updates);
  }
}

export const store = new StateStore();
