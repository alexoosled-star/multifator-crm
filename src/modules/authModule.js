/**
 * authModule.js - Módulo de Autenticação Corporativa e Sessão Multi-tenant
 * Gerencia tokens JWT e isolamento de tenant do usuário logado.
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';
import { supabaseService } from '../services/supabaseService.js';

export const AuthModule = {
  init() {
    eventBus.subscribe('LOGIN_REQUEST', (creds) => this.login(creds.email, creds.password));
    eventBus.subscribe('LOGOUT_REQUEST', () => this.logout());

    // Se houver sessão inicializada no serviço, salva no state store
    if (supabaseService.session) {
      store.set('user', supabaseService.session.user);
      store.set('tenantId', supabaseService.getTenantId());
    }
  },

  async login(email, password) {
    eventBus.publish('AUTH_LOADING', true);
    try {
      const data = await supabaseService.request('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      let profile = null;
      try {
        const profiles = await supabaseService.request(`/rest/v1/profiles?id=eq.${data.user.id}&select=*`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        if (profiles && profiles.length > 0) profile = profiles[0];
      } catch {}

      const session = { ...data, profile };
      supabaseService.saveSession(session);

      store.set('user', { ...data.user, profile, name: profile?.full_name || data.user.email });
      store.set('tenantId', profile?.tenant_id || null);

      eventBus.publish('AUTH_SUCCESS', session);
      return session;
    } catch (err) {
      eventBus.publish('AUTH_ERROR', err.message);
      throw err;
    } finally {
      eventBus.publish('AUTH_LOADING', false);
    }
  },

  logout() {
    supabaseService.saveSession(null);
    store.set('user', null);
    store.set('tenantId', null);
    eventBus.publish('LOGGED_OUT');
  }
};
