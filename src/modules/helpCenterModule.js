/**
 * helpCenterModule.js - Central de Ajuda F1 e Base de Conhecimento Operacional
 */
import { eventBus } from '../core/eventBus.js';

export const HelpCenterModule = {
  ARTICLES: [
    { id: 'kanban-guide', title: 'Como operar o Funil Comercial e Governança de SLA', category: 'Comercial' },
    { id: 'tax-calc-guide', title: 'Entendendo a Simulação Tributária Presumido vs Real', category: 'Tributário' },
    { id: 'proposal-guide', title: 'Geração e Aprovação de Propostas Comerciais', category: 'Propostas' },
    { id: 'storage-guide', title: 'Upload Seguro de Documentos e Validade de URLs', category: 'Segurança' }
  ],

  init() {
    eventBus.subscribe('OPEN_HELP_REQUEST', (topicId) => this.openArticle(topicId));
  },

  openArticle(topicId) {
    const article = this.ARTICLES.find(a => a.id === topicId) || this.ARTICLES[0];
    eventBus.publish('HELP_ARTICLE_DISPLAYED', article);
    return article;
  },

  listArticles() {
    return [...this.ARTICLES];
  }
};
