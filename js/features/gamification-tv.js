// ==========================================================================
// PILAR 5: MODO TV DE GAMIFICAÇÃO COMERCIAL & CARTEIRA DO VENDEDOR
// ==========================================================================

const GamificationTV = {
  isOpen: false,
  monthlyGoal: 100000.00, // Meta mensal da empresa R$ 100k

  init() {
    console.log("🎮 Inicializando Modo TV de Gamificação Comercial...");
  },

  openTVMode() {
    this.isOpen = true;
    let tvOverlay = document.getElementById('gamification-tv-overlay');

    if (!tvOverlay) {
      const tvHTML = `
        <div id="gamification-tv-overlay" class="modal-overlay" style="z-index: 99999; padding: 0; background: #070a13;">
          <div style="width: 100vw; height: 100vh; display: flex; flex-direction: column; padding: 2rem; overflow-y: auto;">
            <!-- Topo TV -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1.5rem; margin-bottom: 2rem;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #f59e0b, #ef4444); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: #fff; box-shadow: 0 0 25px rgba(245, 158, 11, 0.5);">
                  🏆
                </div>
                <div>
                  <h1 style="font-family: 'Outfit'; font-size: 1.8rem; font-weight: 800; color: #fff; letter-spacing: -0.5px; margin: 0;">
                    NEXUS SALES ARENA <span style="font-size: 0.8rem; background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 12px; vertical-align: middle;">AO VIVO</span>
                  </h1>
                  <span style="font-size: 0.85rem; color: var(--text-muted);">Painel de Alta Performance da Equipe Comercial</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="font-size: 1.3rem; font-family: 'Outfit'; font-weight: 700; color: #34d399;" id="tv-clock"></div>
                <button class="btn btn-secondary" onclick="GamificationTV.closeTVMode()">✕ Sair do Modo TV</button>
              </div>
            </div>

            <!-- Conteúdo Dinâmico TV -->
            <div id="tv-content-grid" style="flex: 1; display: flex; flex-direction: column; gap: 2rem;">
              <!-- Renderizado dinamicamente -->
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', tvHTML);
      tvOverlay = document.getElementById('gamification-tv-overlay');
    }

    this.renderTVContent();
    tvOverlay.classList.add('active');

    // Atualiza relógio
    const updateClock = () => {
      const clockEl = document.getElementById('tv-clock');
      if (clockEl) clockEl.innerText = new Date().toLocaleTimeString('pt-BR');
    };
    updateClock();
    setInterval(updateClock, 1000);
  },

  closeTVMode() {
    this.isOpen = false;
    const tvOverlay = document.getElementById('gamification-tv-overlay');
    if (tvOverlay) tvOverlay.classList.remove('active');
  },

  renderTVContent() {
    const db = StorageService.getDB();
    const container = document.getElementById('tv-content-grid');
    if (!container) return;

    // Faturamento Total e Meta
    const totalVendido = db.invoices.reduce((acc, i) => acc + (i.totalValue || 0), 0) + 
                         db.orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const percMeta = Math.min(100, Math.round((totalVendido / this.monthlyGoal) * 100));

    // Ranking de Vendedores
    const sellersRank = [...db.sellers].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0));

    // Últimos Pedidos Fechados
    const recentOrders = db.orders.slice(0, 4);

    container.innerHTML = `
      <!-- TERMÔMETRO DE METAS DA EMPRESA -->
      <div style="background: rgba(31, 41, 55, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 1.5rem; backdrop-filter: blur(12px);">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.75rem;">
          <div>
            <span style="font-size: 0.85rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">🎯 Meta Mensal da Equipe</span>
            <div style="font-family: 'Outfit'; font-size: 2.2rem; font-weight: 800; color: #fff;">
              ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVendido)}
              <span style="font-size: 1.1rem; color: #9ca3af; font-weight: 500;">/ ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.monthlyGoal)}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: 'Outfit'; font-size: 2.5rem; font-weight: 900; color: ${percMeta >= 70 ? '#34d399' : '#fbbf24'};">${percMeta}%</div>
            <span style="font-size: 0.8rem; color: #9ca3af;">Atingimento da Meta</span>
          </div>
        </div>
        <div style="height: 16px; background: rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          <div style="height: 100%; width: ${percMeta}%; background: linear-gradient(90deg, #6366f1, #10b981); border-radius: 8px; transition: width 1s ease; box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);"></div>
        </div>
      </div>

      <!-- GRID DE PÓDIO E ÚLTIMOS FECHAMENTOS -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem;">
        
        <!-- PÓDIO DOS VENDEDORES -->
        <div style="background: rgba(31, 41, 55, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 1.5rem;">
          <h3 style="font-family: 'Outfit'; font-size: 1.2rem; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 8px;">
            🥇 Ranking de Vendas & Comissões
          </h3>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${sellersRank.map((s, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️';
              const comissaoAcumulada = (s.totalSales || 0) * ((s.commissionRate || 5) / 100);
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); border: 1px solid ${idx === 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.05)'}; padding: 1rem 1.25rem; border-radius: 14px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.6rem;">${medal}</span>
                    <div>
                      <strong style="font-size: 1.05rem; color: #fff; font-family: 'Outfit';">${s.name}</strong><br>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">${s.type} | Comissão: ${s.commissionRate}%</span>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-family: 'Outfit'; font-size: 1.2rem; font-weight: 800; color: #34d399;">
                      ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.totalSales)}
                    </div>
                    <span style="font-size: 0.72rem; color: #fbbf24;">Comissão: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoAcumulada)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- FEED DE ÚLTIMOS NEGÓCIOS FECHADOS -->
        <div style="background: rgba(31, 41, 55, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 1.5rem;">
          <h3 style="font-family: 'Outfit'; font-size: 1.2rem; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 8px;">
            🔔 Feed de Fechamentos Recentes
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${recentOrders.map(o => `
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.9rem 1.1rem; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: #fff; font-size: 0.95rem;">${o.number} - ${o.clientName}</strong><br>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Consultor: ${o.sellerName} | Canal: ${o.channel}</span>
                </div>
                <div style="text-align: right;">
                  <strong style="color: #34d399; font-size: 1.1rem; font-family: 'Outfit';">
                    ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.totalAmount)}
                  </strong><br>
                  <span class="badge badge-success" style="font-size: 0.65rem;">✓ Aprovado</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  GamificationTV.init();
});
