/**
 * auditModule.js - Módulo de Auditoria, Governança e Conformidade
 * Registra trilhas de auditoria das operações comerciais na tabela public.audit_logs.
 */
import { eventBus } from '../core/eventBus.js';
import { store } from '../core/state.js';
import { supabaseService } from '../services/supabaseService.js';

export const AuditModule = {
  init() {
    eventBus.subscribe('AUDIT_LOG_REQUEST', (entry) => this.recordLog(entry));
  },

  async recordLog({ entityType, entityId, action, details = {} }) {
    const user = store.get('user');
    const payload = {
      entity_type: entityType,
      entity_id: String(entityId),
      action,
      details,
      user_id: user?.id || null,
      user_name: user?.name || user?.email || 'Sistema'
    };

    try {
      await supabaseService.insert('audit_logs', payload);
    } catch {}

    eventBus.publish('AUDIT_LOG_RECORDED', payload);
    return payload;
  }
};
