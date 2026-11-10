/**
 * KanbanModule - Governança Visual do Funil Comercial & Pipeline de Vendas
 * Gerencia as 6 etapas, métricas de SLA, totalizadores financeiros e drag-and-drop.
 */
import { opportunities } from './opportunities.js';
import { bus } from '../core/event-bus.js';

export class KanbanModule {
  static STAGES = [
    { id: 'new', label: 'Novo Lead', color: '#3b82f6' },
    { id: 'qualified', label: 'Qualificação', color: '#06b6d4' },
    { id: 'proposal', label: 'Proposta', color: '#8b5cf6' },
    { id: 'negotiation', label: 'Negociação', color: '#f59e0b' },
    { id: 'won', label: 'Ganho', color: '#10b981' },
    { id: 'lost', label: 'Perdido', color: '#ef4444' }
  ];

  constructor(containerElementId) {
    this.containerId = containerElementId;
    this.draggedOppId = null;
    this.bindEvents();
  }

  bindEvents() {
    bus.on('OPPORTUNITIES_LOADED', () => this.render());
    bus.on('OPPORTUNITY_CREATED', () => this.render());
    bus.on('OPPORTUNITY_UPDATED', () => this.render());
    bus.on('OPPORTUNITY_DELETED', () => this.render());
  }

  /**
   * Renderiza a estrutura completa do Kanban
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const allOpps = opportunities.opportunities || [];

    let html = '<div class="kanban-board" style="display:flex;gap:1rem;overflow-x:auto;padding-bottom:1.5rem;min-height:550px;">';

    KanbanModule.STAGES.forEach(stage => {
      const stageOpps = allOpps.filter(o => o.stage === stage.id);
      const totalAmount = stageOpps.reduce((sum, o) => sum + (parseFloat(o.estimated_value) || 0), 0);
      const formattedTotal = totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      html += `
        <div class="kanban-column" data-stage="${stage.id}" style="flex:1;min-width:280px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;display:flex;flex-direction:column;max-height:80vh;">
          <div class="kanban-column-header" style="padding:1rem;border-bottom:2px solid ${stage.color};display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:12px 12px 0 0;">
            <div>
              <span style="font-weight:700;color:#1e293b;font-size:0.95rem;">${stage.label}</span>
              <span style="margin-left:6px;background:#f1f5f9;color:#64748b;font-size:0.75rem;padding:2px 7px;border-radius:10px;font-weight:700;">${stageOpps.length}</span>
            </div>
            <div style="font-size:0.8rem;font-weight:700;color:${stage.color};">${formattedTotal}</div>
          </div>

          <div class="kanban-cards-list" data-stage="${stage.id}" style="padding:0.75rem;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:0.75rem;">
            ${stageOpps.map(opp => this.renderCard(opp, stage)).join('')}
            ${stageOpps.length === 0 ? '<div style="text-align:center;padding:2rem 1rem;color:#94a3b8;font-size:0.85rem;border:1px dashed #cbd5e1;border-radius:8px;">Nenhuma oportunidade nesta etapa</div>' : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    this.attachDragAndDropHandlers(container);
  }

  /**
   * Renderiza card individual de oportunidade
   */
  renderCard(opp, stage) {
    const val = parseFloat(opp.estimated_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const savings = parseFloat(opp.tax_savings_estimate || 0);

    return `
      <div class="kanban-card" 
           draggable="true" 
           data-opp-id="${opp.id}" 
           style="background:#fff;border-radius:8px;padding:0.9rem;border:1px solid #e2e8f0;box-shadow:0 2px 4px rgba(0,0,0,0.04);cursor:grab;transition:all 0.2s ease;">
        <div style="font-size:0.75rem;color:#64748b;font-family:monospace;margin-bottom:4px;">${opp.cnpj || ''}</div>
        <div style="font-weight:700;color:#0f172a;font-size:0.9rem;margin-bottom:6px;line-height:1.3;">${opp.company_name || 'Empresa Sem Nome'}</div>
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;border-top:1px solid #f1f5f9;padding-top:8px;">
          <div style="font-weight:800;color:#1e40af;font-size:0.9rem;">${val}</div>
          <div style="font-size:0.75rem;color:#64748b;">👤 ${opp.owner_name ? opp.owner_name.split(' ')[0] : 'Vendedor'}</div>
        </div>

        ${savings > 0 ? `
          <div style="margin-top:6px;background:#ecfdf5;color:#065f46;padding:3px 6px;border-radius:4px;font-size:0.72rem;font-weight:600;display:inline-block;">
            ⚡ Economia Est.: R$ ${savings.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/ano
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Conecta ouvintes nativos de HTML5 drag-and-drop
   */
  attachDragAndDropHandlers(container) {
    const cards = container.querySelectorAll('.kanban-card');
    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedOppId = card.getAttribute('data-opp-id');
        card.style.opacity = '0.5';
        e.dataTransfer.setData('text/plain', this.draggedOppId);
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
        this.draggedOppId = null;
      });
    });

    const dropZones = container.querySelectorAll('.kanban-cards-list');
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.background = '#e0f2fe';
      });

      zone.addEventListener('dragleave', () => {
        zone.style.background = 'transparent';
      });

      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        zone.style.background = 'transparent';
        const targetStage = zone.getAttribute('data-stage');
        const oppId = e.dataTransfer.getData('text/plain') || this.draggedOppId;

        if (oppId && targetStage) {
          try {
            await opportunities.moveToStage(oppId, targetStage);
          } catch (err) {
            alert(err.message);
            this.render();
          }
        }
      });
    });
  }
}

if (typeof window !== 'undefined') {
  window.MultifatorKanban = KanbanModule;
}
