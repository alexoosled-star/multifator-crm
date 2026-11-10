/**
 * AttachmentsService - Gestor de Documentos e Anexos no Supabase Storage
 * Substitui integralmente o IndexedDB local pelo bucket corporativo privado com Signed URLs.
 */
import { supabase } from '../core/supabase-client.js';
import { bus } from '../core/event-bus.js';

export class AttachmentsService {
  constructor() {
    this.bucketName = 'crm-attachments';
  }

  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Realiza upload de arquivo para o Supabase Storage e salva metadados no Postgres
   * @param {Object} params - { file, cnpj, opportunityId, proposalId, category }
   */
  async uploadFile({ file, cnpj, opportunityId = null, proposalId = null, category = 'Outros' }) {
    if (!file) throw new Error('Nenhum arquivo fornecido.');
    if (!cnpj) throw new Error('CNPJ obrigatório para vincular o documento.');

    const user = supabase.getCurrentUser();
    const profile = supabase.session?.profile;
    if (!user) throw new Error('Usuário não autenticado.');

    const cleanCnpj = String(cnpj).replace(/\D/g, '');
    const fileExt = file.name.split('.').pop();
    const randomHash = Math.random().toString(36).substring(2, 8);
    const sanitizedFileName = `${Date.now()}_${randomHash}.${fileExt}`;
    
    // Caminho dentro do bucket: {tenant_id}/{cnpj}/{fileName}
    const relativePath = `${cleanCnpj}/${sanitizedFileName}`;

    bus.emit('ATTACHMENT_UPLOAD_START', { fileName: file.name, size: file.size });

    // 1. Upload no Supabase Storage
    const storageResult = await supabase.uploadStorage(
      this.bucketName,
      relativePath,
      file,
      file.type
    );

    // 2. Gravação de Metadados na tabela public.attachments
    const metadataPayload = {
      cnpj: cleanCnpj,
      opportunity_id: opportunityId,
      proposal_id: proposalId,
      name: file.name,
      storage_path: storageResult.storagePath,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      category,
      author_id: user.id,
      author_name: profile?.full_name || user.email || 'Usuário'
    };

    const savedRecord = await supabase.insert('attachments', metadataPayload);
    const attachment = Array.isArray(savedRecord) ? savedRecord[0] : savedRecord;

    bus.emit('ATTACHMENT_UPLOAD_SUCCESS', attachment);
    return attachment;
  }

  /**
   * Carrega metadados de anexos vinculados a um CNPJ
   */
  async fetchByCnpj(cnpj) {
    const cleanCnpj = String(cnpj).replace(/\D/g, '');
    try {
      const data = await supabase.select('attachments', `cnpj=eq.${cleanCnpj}&order=created_at.desc`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[Attachments] Erro ao carregar anexos:', e);
      return [];
    }
  }

  /**
   * Gera uma Signed URL de 1 hora para visualização segura ou download
   */
  async getSecureViewUrl(storagePath, expiresIn = 3600) {
    return await supabase.createSignedUrl(this.bucketName, storagePath, expiresIn);
  }

  /**
   * Exclui arquivo do storage e do banco de dados
   */
  async deleteAttachment(attachmentId, storagePath) {
    // 1. Remove do storage
    try {
      await supabase.deleteStorage(this.bucketName, storagePath);
    } catch (e) {
      console.warn('Erro ao deletar objeto do Storage:', e);
    }

    // 2. Remove registro do banco
    await supabase.delete('attachments', `id=eq.${attachmentId}`);
    bus.emit('ATTACHMENT_DELETED', { attachmentId });
    return true;
  }
}

export const attachments = new AttachmentsService();
if (typeof window !== 'undefined') {
  window.MultifatorAttachments = attachments;
}
