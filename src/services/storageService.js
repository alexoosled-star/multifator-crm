/**
 * storageService.js - Serviço de Armazenamento Seguro no Supabase Storage
 * Substitui armazenamento local por buckets protegidos e URLs assinadas.
 */
import { supabaseService } from './supabaseService.js';
import { eventBus } from '../core/eventBus.js';

class StorageService {
  constructor() {
    this.bucketName = 'crm-attachments';
  }

  /**
   * Envia arquivo para o bucket na partição do Tenant
   */
  async upload(relativePath, fileBlob, contentType) {
    const tenantId = supabaseService.getTenantId() || 'default_tenant';
    const cleanPath = relativePath.replace(/^\//, '');
    const fullPath = `${tenantId}/${cleanPath}`;

    const url = `${supabaseService.url}/storage/v1/object/${this.bucketName}/${fullPath}`;
    const headers = {
      ...supabaseService.getHeaders(),
      'Content-Type': contentType || fileBlob.type || 'application/octet-stream',
      'x-upsert': 'true'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: fileBlob
    });

    if (!response.ok) {
      let msg = `Falha no upload do arquivo (HTTP ${response.status})`;
      try {
        const d = await response.json();
        msg = d.message || d.error || msg;
      } catch {}
      throw new Error(msg);
    }

    eventBus.publish('STORAGE_FILE_UPLOADED', { fullPath, size: fileBlob.size });
    return {
      bucket: this.bucketName,
      storagePath: fullPath,
      size: fileBlob.size
    };
  }

  /**
   * Obtém URL assinada temporária para visualização/download seguro
   */
  async getSignedUrl(storagePath, expiresInSeconds = 3600) {
    const cleanPath = storagePath.replace(/^\//, '');
    const endpoint = `/storage/v1/object/sign/${this.bucketName}/${cleanPath}`;

    const result = await supabaseService.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ expiresIn: expiresInSeconds })
    });

    if (result && result.signedURL) {
      return `${supabaseService.url}/storage/v1${result.signedURL}`;
    }
    throw new Error('Falha ao gerar URL assinada para o documento.');
  }

  /**
   * Remove arquivo do bucket
   */
  async remove(storagePath) {
    const endpoint = `/storage/v1/object/${this.bucketName}`;
    return await supabaseService.request(endpoint, {
      method: 'DELETE',
      body: JSON.stringify({ prefixes: [storagePath] })
    });
  }
}

export const storageService = new StorageService();
