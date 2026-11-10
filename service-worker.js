// ==========================================================================
// MULTIFATOR CRM SAAS - SERVICE WORKER (PWA & OFFLINE CACHE)
// ==========================================================================

const CACHE_NAME = "multifator-crm-cache-v1";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/landing.html",
  "/manifest.json",
  "/css/style.css",
  "/css/ai-copilot.css",
  "/css/landing.css",
  "/css/responsive-mobile.css",
  "/js/data.js",
  "/js/storage.js",
  "/js/auth.js",
  "/js/landing.js",
  "/js/pwa-install.js",
  "/js/agents/agent-orchestrator.js",
  "/js/agents/agent-cost-estimator.js",
  "/js/agents/agent-pipeline-guardian.js",
  "/js/agents/agent-fiscal-compliance.js",
  "/js/agents/agent-billing-cashflow.js",
  "/js/agents/agent-field-dispatcher.js",
  "/js/features/field-maps-router.js",
  "/js/features/whatsapp-hub.js",
  "/js/features/contract-signature.js",
  "/js/features/voice-first-copilot.js",
  "/js/features/gamification-tv.js",
  "/js/ai-knowledge.js",
  "/js/ai-engine.js",
  "/js/ai-copilot.js",
  "/js/app.js"
];

// INSTALAÇÃO DO SERVICE WORKER E PRÉ-CACHE
self.addEventListener("install", (event) => {
  console.log("📲 [PWA] Instalando Service Worker do Multifator CRM...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("💾 [PWA] Armazenando assets essenciais no Cache...");
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("Aviso ao salvar alguns assets no cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// ATIVAÇÃO E LIMPEZA DE CACHES ANTIGOS
self.addEventListener("activate", (event) => {
  console.log("🚀 [PWA] Service Worker Ativado.");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 [PWA] Removendo cache obsoleto:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ESTRATÉGIA NETWORK-FIRST COM CACHE FALLBACK (RESILIÊNCIA OFFLINE)
self.addEventListener("fetch", (event) => {
  // Ignora chamadas para APIs externas como BrasilAPI ou Google Maps para não quebrar requisições dinâmicas
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Atualiza o cache dinamicamente com a versão mais recente
        if (networkResponse && networkResponse.status === 200 && event.request.method === "GET") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Em caso de falha de rede (offline), responde com o cache local
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback para index.html se for navegação
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
  );
});
