// ==========================================================================
// NEXUS MULTI-AGENT SWARM - ORQUESTRADOR CENTRAL & BARRAMENTO DE EVENTOS
// ==========================================================================

const AgentOrchestrator = {
  agents: {},
  events: {},
  logs: [],
  maxLogs: 50,
  isRunning: false,
  heartbeatInterval: null,

  init() {
    console.log("⚡ Inicializando Nexus Agent Orchestrator & Swarm Hub...");
    this.isRunning = true;
    this.startHeartbeat();
    this.logActivity("orchestrator", "Sistema Inicializado", "Barramento de eventos e swarm de agentes prontos.", "success");
  },

  // --------------------------------------------------------------------------
  // REGISTRO DE AGENTES ESPECIALIZADOS
  // --------------------------------------------------------------------------
  registerAgent(id, metadata, instance) {
    this.agents[id] = {
      id: id,
      name: metadata.name,
      role: metadata.role,
      icon: metadata.icon || "cpu",
      color: metadata.color || "#6366f1",
      description: metadata.description,
      skills: metadata.skills || [],
      instance: instance,
      status: "Ativo",
      tasksExecuted: 0,
      lastActive: new Date().toISOString()
    };
    console.log(`🤖 Agente Registrado: [${metadata.name}] (${id})`);
    this.logActivity(id, "Agente Registrado", `Agente ${metadata.name} integrado ao barramento.`, "info");
  },

  getAgent(id) {
    return this.agents[id] || null;
  },

  getAllAgents() {
    return Object.values(this.agents);
  },

  // --------------------------------------------------------------------------
  // BARRAMENTO DE EVENTOS (PUBSUB)
  // --------------------------------------------------------------------------
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  },

  emit(event, data) {
    console.log(`📢 Evento Disparado: [${event}]`, data);
    this.logActivity("event_bus", `Evento: ${event}`, `Disparado para ${this.events[event]?.length || 0} ouvintes.`, "info");

    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Erro ao executar ouvinte do evento ${event}:`, err);
        }
      });
    }
  },

  // --------------------------------------------------------------------------
  // LOGS E AUDITORIA EM TEMPO REAL
  // --------------------------------------------------------------------------
  logActivity(agentId, action, details, status = "info") {
    const logEntry = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      agentId: agentId,
      agentName: this.agents[agentId]?.name || (agentId === 'orchestrator' ? 'Orquestrador Central' : 'Barramento'),
      action: action,
      details: details,
      status: status
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    if (this.agents[agentId]) {
      this.agents[agentId].tasksExecuted++;
      this.agents[agentId].lastActive = logEntry.timestamp;
    }

    // Notifica UI se a Central de Agentes estiver aberta
    if (typeof App !== 'undefined' && App.currentTab === 'agents-hub') {
      const logsContainer = document.getElementById('agents-live-logs');
      if (logsContainer) {
        logsContainer.innerHTML = this.renderLogsHTML();
      }
    }

    return logEntry;
  },

  getRecentLogs(limit = 15) {
    return this.logs.slice(0, limit);
  },

  renderLogsHTML() {
    return this.logs.slice(0, 10).map(l => {
      const time = new Date(l.timestamp).toLocaleTimeString('pt-BR');
      const badgeClass = l.status === 'success' ? 'badge-success' : l.status === 'warning' ? 'badge-warning' : l.status === 'danger' ? 'badge-danger' : 'badge-primary';
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.78rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--text-dim); font-size: 0.7rem; font-family: monospace;">[${time}]</span>
            <span class="badge ${badgeClass}" style="font-size: 0.65rem;">${l.agentName}</span>
            <strong style="color: #f3f4f6;">${l.action}:</strong>
            <span style="color: #9ca3af;">${l.details}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  // --------------------------------------------------------------------------
  // HEARTBEAT & CICLO AUTÔNOMO EM SEGUNDO PLANO
  // --------------------------------------------------------------------------
  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    
    // Roda verificação a cada 40 segundos
    this.heartbeatInterval = setInterval(() => {
      this.runAutonomousCycle();
    }, 40000);

    // Executa o primeiro ciclo imediatamente após inicializar
    setTimeout(() => {
      this.runAutonomousCycle();
    }, 2000);
  },

  runAutonomousCycle() {
    console.log("💓 [Orchestrator] Executando ciclo autônomo do Swarm de Agentes...");
    
    // Dispara checagem em todos os agentes ativos
    Object.values(this.agents).forEach(agent => {
      if (agent.instance && typeof agent.instance.runAutonomousCheck === 'function') {
        try {
          agent.instance.runAutonomousCheck();
        } catch (err) {
          console.error(`Erro no ciclo autônomo do agente ${agent.id}:`, err);
        }
      }
    });
  }
};
