/**
 * SupabaseClient - Camada Central de Comunicação com o Supabase (Database, Auth e Storage)
 * Provê suporte a isolamento de Tenant (RLS), geração de URLs assinadas e queries PostgREST seguras.
 */
import { bus } from './event-bus.js';

class SupabaseClient {
  constructor() {
    this.storagePrefix = 'MULTIFATOR_SAAS_';
    this.loadConfig();
    this.session = this.loadSession();
  }

  loadConfig() {
    this.url = localStorage.getItem(`${this.storagePrefix}SUPABASE_URL`) || 'https://pwcabvrrnixqkcvnlefb.supabase.co';
    this.anonKey = localStorage.getItem(`${this.storagePrefix}SUPABASE_KEY`) || '';
  }

  saveConfig(url, anonKey) {
    this.url = (url || '').trim().replace(/\/$/, '');
    this.anonKey = (anonKey || '').trim();
    localStorage.setItem(`${this.storagePrefix}SUPABASE_URL`, this.url);
    localStorage.setItem(`${this.storagePrefix}SUPABASE_KEY`, this.anonKey);
    bus.emit('SUPABASE_CONFIG_UPDATED', { url: this.url });
  }

  loadSession() {
    try {
      const raw = localStorage.getItem(`${this.storagePrefix}AUTH_SESSION`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveSession(sessionData) {
    this.session = sessionData;
    if (sessionData) {
      localStorage.setItem(`${this.storagePrefix}AUTH_SESSION`, JSON.stringify(sessionData));
    } else {
      localStorage.removeItem(`${this.storagePrefix}AUTH_SESSION`);
    }
  }

  isAuthenticated() {
    return !!(this.session && this.session.access_token);
  }

  getCurrentUser() {
    return this.session?.user || null;
  }

  getCurrentTenantId() {
    return this.session?.profile?.tenant_id || this.session?.user?.user_metadata?.tenant_id || null;
  }

  getHeaders(extraHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...extraHeaders
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

  /**
   * Executa requisição genérica à API REST do Supabase
   */
  async request(endpoint, options = {}) {
    if (!this.url) {
      throw new Error('Supabase URL não configurada.');
    }

    const url = `${this.url}${endpoint}`;
    const headers = this.getHeaders(options.headers || {});
    
    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        bus.emit('AUTH_UNAUTHORIZED');
        throw new Error('Sessão expirada ou não autorizada no Supabase.');
      }

      if (response.status === 403) {
        throw new Error('Acesso negado pelas políticas de isolamento de Tenant (RLS).');
      }

      if (!response.ok) {
        let errMessage = `Erro HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errMessage = errData.message || errData.error_description || errData.hint || errMessage;
        } catch {}
        throw new Error(errMessage);
      }

      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      bus.emit('SUPABASE_REQUEST_ERROR', { endpoint, error: error.message });
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // AUTENTICAÇÃO (AUTH)
  // --------------------------------------------------------------------------

  async signIn(email, password) {
    const data = await this.request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    // Busca dados do profile para obter tenant_id e papel corporativo
    let profile = null;
    try {
      const profiles = await this.request(`/rest/v1/profiles?id=eq.${data.user.id}&select=*`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      if (profiles && profiles.length > 0) {
        profile = profiles[0];
      }
    } catch (e) {
      console.warn('Profile não encontrado ou erro de carregamento:', e);
    }

    const session = {
      ...data,
      profile
    };

    this.saveSession(session);
    bus.emit('AUTH_LOGIN_SUCCESS', session);
    return session;
  }

  async signOut() {
    if (this.session?.access_token) {
      try {
        await this.request('/auth/v1/logout', { method: 'POST' });
      } catch {}
    }
    this.saveSession(null);
    bus.emit('AUTH_LOGOUT_SUCCESS');
  }

  // --------------------------------------------------------------------------
  // OPERAÇÕES DE BANCO DE DADOS (POSTGREST DATABASE)
  // --------------------------------------------------------------------------

  async select(table, queryParams = '') {
    const q = queryParams ? (queryParams.startsWith('?') ? queryParams : `?${queryParams}`) : '';
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

  async rpc(functionName, params = {}) {
    return await this.request(`/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // --------------------------------------------------------------------------
  // SUPABASE STORAGE (BUCKETS PROTEGIDOS & SIGNED URLS)
  // --------------------------------------------------------------------------

  /**
   * Realiza upload de arquivo para bucket privado com prefixo obrigatório do tenant_id
   * @param {string} bucket - Nome do bucket (padrão 'crm-attachments')
   * @param {string} relativePath - Caminho do arquivo (ex: 'cnpj/documento.pdf')
   * @param {Blob|File} file - Arquivo a enviar
   * @param {string} contentType - Tipo MIME do arquivo
   */
  async uploadStorage(bucket, relativePath, file, contentType) {
    const tenantId = this.getCurrentTenantId() || 'shared';
    const cleanPath = relativePath.replace(/^\//, '');
    const fullPath = `${tenantId}/${cleanPath}`;

    const url = `${this.url}/storage/v1/object/${bucket}/${fullPath}`;
    const headers = {
      ...this.getHeaders(),
      'Content-Type': contentType || file.type || 'application/octet-stream',
      'x-upsert': 'true'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: file
    });

    if (!response.ok) {
      let msg = `Erro no upload do arquivo (HTTP ${response.status})`;
      try {
        const d = await response.json();
        msg = d.message || d.error || msg;
      } catch {}
      throw new Error(msg);
    }

    bus.emit('STORAGE_UPLOAD_SUCCESS', { bucket, fullPath });
    return {
      bucket,
      storagePath: fullPath,
      fileName: relativePath.split('/').pop(),
      size: file.size,
      mimeType: file.type
    };
  }

  /**
   * Gera uma Signed URL com tempo de expiração restrito para visualização/download
   * @param {string} bucket 
   * @param {string} fullPath 
   * @param {number} expiresInSeconds (padrão 3600 = 1 hora)
   */
  async createSignedUrl(bucket, fullPath, expiresInSeconds = 3600) {
    const cleanPath = fullPath.replace(/^\//, '');
    const endpoint = `/storage/v1/object/sign/${bucket}/${cleanPath}`;
    
    const result = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ expiresIn: expiresInSeconds })
    });

    if (result && result.signedURL) {
      return `${this.url}/storage/v1${result.signedURL}`;
    }
    throw new Error('Falha ao gerar URL assinada para o documento.');
  }

  /**
   * Remove arquivo do Supabase Storage
   */
  async deleteStorage(bucket, fullPath) {
    const endpoint = `/storage/v1/object/${bucket}`;
    return await this.request(endpoint, {
      method: 'DELETE',
      body: JSON.stringify({ prefixes: [fullPath] })
    });
  }
}

export const supabase = new SupabaseClient();
if (typeof window !== 'undefined') {
  window.MultifatorSupabase = supabase;
}
