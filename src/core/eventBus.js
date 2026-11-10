/**
 * eventBus.js - Barramento Central de Eventos Pub/Sub Desacoplado
 * Elimina o acoplamento direto entre os 15 módulos do CRM Multifator.
 */

class EventBus {
  constructor() {
    this.topics = new Map();
  }

  /**
   * Inscreve um ouvinte para um tópico
   * @param {string} topic 
   * @param {Function} listener 
   * @returns {Function} Função de cancelamento da inscrição
   */
  subscribe(topic, listener) {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic).add(listener);

    return () => this.unsubscribe(topic, listener);
  }

  /**
   * Inscreve um ouvinte de disparo único
   * @param {string} topic 
   * @param {Function} listener 
   */
  subscribeOnce(topic, listener) {
    const onceWrapper = (data) => {
      this.unsubscribe(topic, onceWrapper);
      listener(data);
    };
    this.subscribe(topic, onceWrapper);
  }

  /**
   * Remove a inscrição de um ouvinte
   * @param {string} topic 
   * @param {Function} listener 
   */
  unsubscribe(topic, listener) {
    if (this.topics.has(topic)) {
      this.topics.get(topic).delete(listener);
    }
  }

  /**
   * Publica dados em um tópico para todos os ouvintes
   * @param {string} topic 
   * @param {*} data 
   */
  publish(topic, data = null) {
    if (this.topics.has(topic)) {
      const listeners = Array.from(this.topics.get(topic));
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (e) {
          // Erro isolado no listener sem propagação colateral
        }
      }
    }
  }

  /**
   * Alias de conveniência on/emit
   */
  on(topic, listener) {
    return this.subscribe(topic, listener);
  }

  emit(topic, data) {
    this.publish(topic, data);
  }

  off(topic, listener) {
    this.unsubscribe(topic, listener);
  }

  clear() {
    this.topics.clear();
  }
}

export const eventBus = new EventBus();
