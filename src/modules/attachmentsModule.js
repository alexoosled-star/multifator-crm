/**
 * attachmentsModule.js - Módulo de Gestão de Documentos no Supabase Storage
 * Substitui o armazenamento temporário no navegador por buckets protegidos com URLs assinadas.
 */
import { eventBus } from '../core/eventBus.js';
import { storageService } from '../services/storageService.js';
import { supabaseService } from '../services/supabaseService.js';

export const AttachmentsModule = {
  init() {
    eventBus.subscribe('UPLOAD_ATTACHMENT_REQUEST', (data) => this.uploadDocument(data));
    eventBus.subscribe('FETCH_ATTACHMENTS_REQUEST', (cnpj) => this.fetchByCnpj(cnpj));
  },

  async uploadDocument({ file, cnpj, opportunityId = null, category = 'Outros' }) {
    if (!file || !cnpj) throw new Error('Arquivo e CNPJ são obrigatórios.');

    const cleanCnpj = String(cnpj).replace(/\D/g, '');
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const relativePath = `${cleanCnpj}/${fileName}`;

    eventBus.publish('ATTACHMENT_UPLOADING', true);

    try {
      const storageResult = await storageService.upload(relativePath, file, file.type);

      const metadata = {
        cnpj: cleanCnpj,
        opportunity_id: opportunityId,
        name: file.name,
        storage_path: storageResult.storagePath,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        category
      };

      let saved = metadata;
      try {
        const resp = await supabaseService.insert('attachments', metadata);
        saved = Array.isArray(resp) ? resp[0] : resp;
      } catch {}

      eventBus.publish('ATTACHMENT_UPLOAD_SUCCESS', saved);
      return saved;
    } finally {
      eventBus.publish('ATTACHMENT_UPLOADING', false);
    }
  },

  async fetchByCnpj(cnpj) {
    const cleanCnpj = String(cnpj).replace(/\D/g, '');
    try {
      const data = await supabaseService.select('attachments', `cnpj=eq.${cleanCnpj}&order=created_at.desc`);
      const list = Array.isArray(data) ? data : [];
      eventBus.publish('ATTACHMENTS_LOADED', list);
      return list;
    } catch {
      return [];
    }
  },

  async getSecureViewUrl(storagePath) {
    return await storageService.getSignedUrl(storagePath, 3600);
  }
};
