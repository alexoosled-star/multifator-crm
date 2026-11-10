/**
 * EventBus - Barramento de Comunicação Central Pub/Sub Desacoplado
 * Permite que abas, componentes, modais e módulos se comuniquem com baixo acoplamento.
 */
class EventBus {
  constructor() {
    this.events = new Map();
    this.history = [];
    this.maxHistory = 100;
  }

  /**
   * Inscreve um ouvinte para um determinado evento
   * @param {string} eventName 
   * @param {Function} handler 
   * @returns {Function} Função de desinscrição (unsubscribe)
   */
  on(eventName, handler) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(handler);

    return () => this.off(eventName, handler);
  }

  /**
   * Inscreve um ouvinte para disparar apenas uma única vez
   * @param {string} eventName 
   * @param {Function} handler 
   */
  once(eventName, handler) {
    const onceWrapper = (payload) => {
      this.off(eventName, onceWrapper);
      handler(payload);
    };
    this.on(eventName, onceWrapper);
  }

  /**
   * Remove um ouvinte
   * @param {string} eventName 
   * @param {Function} handler 
   */
  off(eventName, handler) {
    if (this.events.has(eventName)) {
      this.events.get(eventName).delete(handler);
    }
  }

  /**
   * Dispara um evento para todos os ouvintes inscritos
   * @param {string} eventName 
   * @param {*} payload 
   */
  emit(eventName, payload = null) {
    // Registra no histórico para auditoria e debug
    this.history.push({
      event: eventName,
      payload,
      timestamp: new Date().toISOString()
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (this.events.has(eventName)) {
      const handlers = Array.from(this.events.get(eventName));
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[EventBus] Erro ao executar handler para o evento '${eventName}':`, error);
        }
      }
    }
  }

  /**
   * Limpa todos os ouvintes
   */
  clear() {
    this.events.clear();
  }

  /**
   * Retorna os últimos eventos disparados
   */
  getHistory() {
    return [...this.history];
  }
}

export const bus = new EventBus();
if (typeof window !== 'undefined') {
  window.MultifatorBus = bus;
}
