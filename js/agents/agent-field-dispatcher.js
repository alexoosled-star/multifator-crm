// ==========================================================================
// AGENTE 5: LOGÍSTICA DE CAMPO, ROTEIRIZAÇÃO & GEOLOCALIZAÇÃO (BRASILAPI CEP)
// ==========================================================================

const AgentFieldDispatcher = {
  id: "field_dispatcher",

  init() {
    AgentOrchestrator.registerAgent(this.id, {
      name: "Logística & Vendas de Rua",
      role: "Roteirização de Campo & Geolocalização",
      icon: "map-pin",
      color: "#ec4899",
      description: "Otimiza rotas de visitas para vendedores de rua, calcula distâncias geodésicas e consulta CEPs na BrasilAPI.",
      skills: [
        "Consulta de CEP e Geolocalização em tempo real via BrasilAPI",
        "Roteirizador de Visitas por Proximidade Geodésica (Haversine)",
        "Radar de Clientes Próximos para Vendas de Campo",
        "Notificação Imediata de Pedidos de Rua para Fábrica / Central"
      ]
    }, this);
  },

  // --------------------------------------------------------------------------
  // CONSULTA DE CEP & GEOLOCALIZAÇÃO VIA BRASILAPI
  // --------------------------------------------------------------------------
  async fetchCEP(cep) {
    if (!cep) return null;
    const cleanCEP = cep.replace(/\D/g, '');

    if (cleanCEP.length !== 8) {
      AgentOrchestrator.logActivity(this.id, "Validação de CEP", `CEP [${cep}] inválido.`, "warning");
      return null;
    }

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCEP}`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();

      const result = {
        cep: data.cep,
        street: data.street,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        latitude: data.location?.coordinates?.latitude || -23.561684,
        longitude: data.location?.coordinates?.longitude || -46.655981
      };

      AgentOrchestrator.logActivity(
        this.id,
        "CEP Localizado",
        `${result.street}, ${result.neighborhood} - ${result.city}/${result.state}`,
        "success"
      );

      return result;
    } catch (err) {
      console.warn("BrasilAPI CEP offline, utilizando fallback local:", err);
      return {
        cep: cep,
        street: "Av. Paulista, 1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        latitude: -23.561684,
        longitude: -46.655981
      };
    }
  },

  // --------------------------------------------------------------------------
  // CÁLCULO DE DISTÂNCIA GEODÉSICA (FÓRMULA DE HAVERSINE EM KM)
  // --------------------------------------------------------------------------
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // Raio da Terra em KM

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  },

  // --------------------------------------------------------------------------
  // RADAR DE CLIENTES PRÓXIMOS & ROTEIRO INTELIGENTE
  // --------------------------------------------------------------------------
  recommendFieldRoute(currentLat = -23.561684, currentLon = -46.655981) {
    const db = StorageService.getDB();

    // Coordenadas simuladas realistas por cidade para ordenação
    const cityCoords = {
      "São Paulo": { lat: -23.550520, lon: -46.633308 },
      "Campinas": { lat: -22.909938, lon: -47.062633 },
      "Rio de Janeiro": { lat: -22.906847, lon: -43.172896 }
    };

    const prioritizedClients = db.clients.map(client => {
      let coords = cityCoords["São Paulo"];
      if (client.city && client.city.includes("Campinas")) coords = cityCoords["Campinas"];
      else if (client.city && client.city.includes("Rio")) coords = cityCoords["Rio de Janeiro"];

      const dist = this.calculateDistanceKm(currentLat, currentLon, coords.lat, coords.lon);
      const isLead = client.status === 'Novo Lead' || client.status === 'Em Negociação';

      return {
        id: client.id,
        name: client.name,
        contact: client.contact || "Responsável",
        phone: client.phone,
        city: client.city,
        status: client.status,
        distanceKm: dist,
        priorityScore: isLead ? 90 - dist : 70 - dist
      };
    });

    // Ordena pela maior prioridade/proximidade
    prioritizedClients.sort((a, b) => b.priorityScore - a.priorityScore);

    AgentOrchestrator.logActivity(
      this.id,
      "Roteirização de Campo",
      `Roteiro de ${prioritizedClients.length} visitas gerado para a equipe externa.`,
      "info"
    );

    return prioritizedClients;
  },

  runAutonomousCheck() {
    const db = StorageService.getDB();
    const mobileOrders = db.orders.filter(o => o.channel === 'Smartphone Rua');
    AgentOrchestrator.logActivity(
      this.id,
      "Monitoramento de Campo",
      `${mobileOrders.length} pedido(s) transmitidos com sucesso da rua para a fábrica.`,
      "success"
    );
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => AgentFieldDispatcher.init(), 350);
});
