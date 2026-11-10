/**
 * supabaseService.js - Serviço de Integração Segura com Supabase REST API & Auth
 * Zero chaves privadas hardcoded; credenciais gerenciadas dinamicamente em runtime.
 */
import { eventBus } from '../core/eventBus.js';

class SupabaseService {
  constructor() {
    this.storagePrefix = 'MULTIFATOR_SAAS_';
    this.url = '';
    this.anonKey = '';
    this.session = null;
    this.initCredentials();
  }

  initCredentials() {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.url = localStorage.getItem(`${this.storagePrefix}SUPABASE_URL`) || '';
      this.anonKey = localStorage.getItem(`${this.storagePrefix}SUPABASE_KEY`) || '';
      try {
        const raw = localStorage.getItem(`${this.storagePrefix}SESSION`);
        this.session = raw ? JSON.parse(raw) : null;
      } catch {
        this.session = null;
      }
    }
  }

  configure(url, anonKey) {
    this.url = (url || '').trim().replace(/\/$/, '');
    this.anonKey = (anonKey || '').trim();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`${this.storagePrefix}SUPABASE_URL`, this.url);
      localStorage.setItem(`${this.storagePrefix}SUPABASE_KEY`, this.anonKey);
    }
    eventBus.publish('SUPABASE_CONFIGURED', { url: this.url });
  }

  saveSession(sessionData) {
    this.session = sessionData;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (sessionData) {
        localStorage.setItem(`${this.storagePrefix}SESSION`, JSON.stringify(sessionData));
      } else {
        localStorage.removeItem(`${this.storagePrefix}SESSION`);
      }
    }
  }

  getTenantId() {
    return this.session?.profile?.tenant_id || this.session?.user?.user_metadata?.tenant_id || null;
  }

  getHeaders(extra = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...extra
    };

    if (this.anonKey) {
      headers['apikey'] = this.anonKey;
    }

    if (this.session?.access_token) {
      headers['Authorization'] = `Bearer ${this.session.access_token}`;
    } else if (this.anonKey) {
      headers['Authorization'] = `Bearer ${this.anonKey}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    if (!this.url) {
      throw new Error('Project URL do Supabase não configurada.');
    }

    const fullUrl = `${this.url}${endpoint}`;
    const headers = this.getHeaders(options.headers || {});
    const response = await fetch(fullUrl, { ...options, headers });

    if (response.status === 401) {
      eventBus.publish('AUTH_REQUIRED');
      throw new Error('Sessão expirada ou autenticação necessária.');
    }

    if (response.status === 403) {
      throw new Error('Acesso negado pelas regras de isolamento multi-tenant (RLS).');
    }

    if (!response.ok) {
      let msg = `Erro HTTP ${response.status}`;
      try {
        const d = await response.json();
        msg = d.message || d.error_description || d.hint || msg;
      } catch {}
      throw new Error(msg);
    }

    if (response.status === 204) return null;
    return await response.json();
  }

  async select(table, query = '') {
    const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    return await this.request(`/rest/v1/${table}${q}`, { method: 'GET' });
  }

  async insert(table, data) {
    return await this.request(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
  }

  async update(table, filterQuery, data) {
    const q = filterQuery ? (filterQuery.startsWith('?') ? filterQuery : `?${filterQuery}`) : '';
    return await this.request(`/rest/v1/${table}${q}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
  }

  async delete(table, filterQuery) {
    const q = filterQuery ? (filterQuery.startsWith('?') ? filterQuery : `?${filterQuery}`) : '';
    return await this.request(`/rest/v1/${table}${q}`, {
      method: 'DELETE',
      headers: { 'Prefer': 'return=representation' }
    });
  }

  async rpc(fnName, params = {}) {
    return await this.request(`/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }
}

export const supabaseService = new SupabaseService();
