// ==========================================================================
// NEXUS CRM SAAS - INTERATIVIDADE DA LANDING PAGE & CALCULADORA DE ROI
// ==========================================================================

const LandingInteractions = {
  isAnnual: false,

  init() {
    console.log("🚀 Inicializando Interações da Landing Page...");
    this.setupNavbarScroll();
    this.setupFAQ();
    this.updateROICalculator();
  },

  setupNavbarScroll() {
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('landing-navbar');
      if (window.scrollY > 40) {
        nav?.classList.add('scrolled');
      } else {
        nav?.classList.remove('scrolled');
      }
    });
  },

  setupFAQ() {
    document.querySelectorAll('.faq-question').forEach(q => {
      q.addEventListener('click', () => {
        const item = q.parentElement;
        item.classList.toggle('active');
      });
    });
  },

  // --------------------------------------------------------------------------
  // CALCULADORA DE RETORNO SOBRE INVESTIMENTO (ROI)
  // --------------------------------------------------------------------------
  updateROICalculator() {
    const teamSize = parseInt(document.getElementById('roi-team-size')?.value || 5);
    const quotesCount = parseInt(document.getElementById('roi-quotes-count')?.value || 40);
    const ticketValue = parseFloat(document.getElementById('roi-ticket-val')?.value || 25000);

    // Labels nos sliders
    const teamLabel = document.getElementById('roi-team-val-label');
    const quotesLabel = document.getElementById('roi-quotes-val-label');
    const ticketLabel = document.getElementById('roi-ticket-val-label');

    if (teamLabel) teamLabel.innerText = `${teamSize} pessoas`;
    if (quotesLabel) quotesLabel.innerText = `${quotesCount} orçamentos/mês`;
    if (ticketLabel) ticketLabel.innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(ticketValue);

    // Cálculos de economia e ganho
    // 1. Horas de engenharia e digitação salvas por mês (~2.5h por proposta sob medida)
    const hoursSaved = Math.round(quotesCount * 2.2);

    // 2. Economia direta em assinaturas eletrônicas pagas + papel + retrabalho (R$ 15 por contrato/proposta)
    const directSavings = quotesCount * 18;

    // 3. Receita extra estimada por aumento de taxa de conversão (+12% de fechamento pelo follow-up do Swarm e WhatsApp)
    const extraRevenue = Math.round((quotesCount * 0.12) * ticketValue);

    // Exibição nos cards
    const hoursEl = document.getElementById('roi-hours-saved');
    const revEl = document.getElementById('roi-extra-revenue');
    const savingsEl = document.getElementById('roi-direct-savings');

    if (hoursEl) hoursEl.innerText = `${hoursSaved} horas/mês`;
    if (revEl) revEl.innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(extraRevenue);
    if (savingsEl) savingsEl.innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(directSavings);
  },

  // --------------------------------------------------------------------------
  // TOGGLE DE PREÇOS (MENSAL VS ANUAL COM 20% OFF)
  // --------------------------------------------------------------------------
  togglePricingBilling(type) {
    this.isAnnual = (type === 'annual');
    
    const monthlyBtn = document.getElementById('btn-billing-monthly');
    const annualBtn = document.getElementById('btn-billing-annual');

    if (this.isAnnual) {
      monthlyBtn?.classList.remove('btn-land-primary');
      monthlyBtn?.classList.add('btn-land-secondary');
      annualBtn?.classList.remove('btn-land-secondary');
      annualBtn?.classList.add('btn-land-primary');

      document.getElementById('price-starter').innerHTML = 'R$ 157<span>/mês (Anual)</span>';
      document.getElementById('price-pro').innerHTML = 'R$ 297<span>/mês (Anual)</span>';
      document.getElementById('price-enterprise').innerHTML = 'R$ 597<span>/mês (Anual)</span>';
    } else {
      annualBtn?.classList.remove('btn-land-primary');
      annualBtn?.classList.add('btn-land-secondary');
      monthlyBtn?.classList.remove('btn-land-secondary');
      monthlyBtn?.classList.add('btn-land-primary');

      document.getElementById('price-starter').innerHTML = 'R$ 197<span>/mês</span>';
      document.getElementById('price-pro').innerHTML = 'R$ 370<span>/mês</span>';
      document.getElementById('price-enterprise').innerHTML = 'R$ 740<span>/mês</span>';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  LandingInteractions.init();
});
