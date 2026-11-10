/**
 * workforceModule.js - Módulo de Gestão da Equipe Comercial e Permissões
 * Controle de papéis corporativos (admin, manager, seller, backoffice) e membros do tenant.
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';
import { supabaseService } from '../services/supabaseService.js';

export const WorkforceModule = {
  ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    SELLER: 'seller',
    BACKOFFICE: 'backoffice'
  },

  init() {
    eventBus.subscribe('FETCH_WORKFORCE_REQUEST', () => this.fetchMembers());
  },

  async fetchMembers() {
    try {
      const members = await supabaseService.select('profiles', 'active=eq.true&order=full_name.asc');
      const list = Array.isArray(members) ? members : [];
      store.set('teamMembers', list);
      eventBus.publish('WORKFORCE_LOADED', list);
      return list;
    } catch {
      return [];
    }
  },

  canManageTeam(user) {
    return user && [this.ROLES.ADMIN, this.ROLES.MANAGER].includes(user.role);
  },

  canDeleteRecords(user) {
    return user && user.role === this.ROLES.ADMIN;
  }
};
