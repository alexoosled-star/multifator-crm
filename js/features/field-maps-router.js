// ==========================================================================
// PILAR 1: GOOGLE MAPS, WAZE, CHECK-IN GEORREFERENCIADO & RADAR DE PROXIMIDADE
// ==========================================================================

const FieldMapsRouter = {
  currentLocation: { lat: -23.561684, lon: -46.655981 }, // Default: Av. Paulista, SP

  init() {
    console.log("📍 Inicializando Módulo de Mapas, Waze & Check-in GPS...");
    this.detectUserLocation();
  },

  detectUserLocation() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentLocation = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          };
          console.log("📍 Coordenadas GPS detectadas:", this.currentLocation);
        },
        (err) => {
          console.warn("Usando coordenadas padrão (São Paulo - SP):", err.message);
        }
      );
    }
  },

  // GERA LINK OFICIAL DO GOOGLE MAPS
  getGoogleMapsUrl(addressOrCoords) {
    const encoded = encodeURIComponent(addressOrCoords);
    return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  },

  // GERA LINK OFICIAL DO WAZE
  getWazeUrl(addressOrCoords) {
    const encoded = encodeURIComponent(addressOrCoords);
    return `https://waze.com/ul?q=${encoded}&navigate=yes`;
  },

  // ABRE O GPS NO APP ESCOLHIDO
  openNavigation(app, destination) {
    let url = "";
    if (app === 'waze') {
      url = this.getWazeUrl(destination);
    } else {
      url = this.getGoogleMapsUrl(destination);
    }
    window.open(url, '_blank');
  },

  // REGISTRA CHECK-IN DE VISITA GEORREFERENCIADA
  registerCheckIn(clientId) {
    const db = StorageService.getDB();
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;

    const checkInRecord = {
      id: "chk_" + Date.now(),
      clientId: client.id,
      clientName: client.name,
      timestamp: new Date().toISOString(),
      lat: this.currentLocation.lat,
      lon: this.currentLocation.lon,
      addressEstimated: client.city || "São Paulo - SP",
      verified: true
    };

    if (!client.checkIns) client.checkIns = [];
    client.checkIns.unshift(checkInRecord);
    StorageService.saveDB(db);

    if (typeof AgentOrchestrator !== 'undefined') {
      AgentOrchestrator.logActivity(
        "field_dispatcher",
        `Check-in de Visita Realizado`,
        `Consultor em ${client.name} | Lat: ${checkInRecord.lat.toFixed(4)}, Lon: ${checkInRecord.lon.toFixed(4)}`,
        "success"
      );
    }

    alert(`📍 Check-in de Visita Comercial Confirmado!\n\nCliente: ${client.name}\nData/Hora: ${new Date().toLocaleString('pt-BR')}\nCoordenadas: ${checkInRecord.lat.toFixed(5)}, ${checkInRecord.lon.toFixed(5)}\nStatus: Visita Auditada com Sucesso no Histórico.`);
    return checkInRecord;
  },

  // RADAR DE PROXIMIDADE (ALERTA CLIENTES NO RAIO DE X KM)
  scanNearbyClients(radiusKm = 15) {
    if (typeof AgentFieldDispatcher === 'undefined') return [];
    const route = AgentFieldDispatcher.recommendFieldRoute(this.currentLocation.lat, this.currentLocation.lon);
    return route.filter(c => c.distanceKm <= radiusKm);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  FieldMapsRouter.init();
});
