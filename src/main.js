/**
 * main.js - Ponto Único de Entrada e Inicialização da Arquitetura Modular ES6
 * Importa e orquestra o barramento de eventos, os serviços e os 15 módulos do CRM Multifator.
 */

// Core
import { eventBus } from './core/eventBus.js';
import { store } from './core/state.js';

// Services
import { supabaseService } from './services/supabaseService.js';
import { storageService } from './services/storageService.js';
import { receitaFederalService } from './services/receitaFederalService.js';
import { ibgeService } from './services/ibgeService.js';

// 15 Módulos Especializados
import { KanbanModule } from './modules/kanbanModule.js';
import { TaxSimulatorModule } from './modules/taxSimulatorModule.js';
import { ProposalsModule } from './modules/proposalsModule.js';
import { ProspectingModule } from './modules/prospectingModule.js';
import { OpportunitiesModule } from './modules/opportunitiesModule.js';
import { PortfolioModule } from './modules/portfolioModule.js';
import { AttachmentsModule } from './modules/attachmentsModule.js';
import { IntelligenceModule } from './modules/intelligenceModule.js';
import { CndModule } from './modules/cndModule.js';
import { WorkforceModule } from './modules/workforceModule.js';
import { HelpCenterModule } from './modules/helpCenterModule.js';
import { PendingCenterModule } from './modules/pendingCenterModule.js';
import { AuditModule } from './modules/auditModule.js';
import { ReportsModule } from './modules/reportsModule.js';
import { AuthModule } from './modules/authModule.js';

class ApplicationBootstrap {
  static init() {
    // Inicialização sequencial dos 15 módulos
    KanbanModule.init();
    TaxSimulatorModule.init();
    ProposalsModule.init();
    ProspectingModule.init();
    OpportunitiesModule.init();
    PortfolioModule.init();
    AttachmentsModule.init();
    IntelligenceModule.init();
    CndModule.init();
    WorkforceModule.init();
    HelpCenterModule.init();
    PendingCenterModule.init();
    AuditModule.init();
    ReportsModule.init();
    AuthModule.init();

    // Integração com a UI legada se presente
    if (typeof window !== 'undefined') {
      window.MultifatorCRM = {
        eventBus,
        store,
        services: {
          supabase: supabaseService,
          storage: storageService,
          receita: receitaFederalService,
          ibge: ibgeService
        },
        modules: {
          kanban: KanbanModule,
          taxSimulator: TaxSimulatorModule,
          proposals: ProposalsModule,
          prospecting: ProspectingModule,
          opportunities: OpportunitiesModule,
          portfolio: PortfolioModule,
          attachments: AttachmentsModule,
          intelligence: IntelligenceModule,
          cnd: CndModule,
          workforce: WorkforceModule,
          helpCenter: HelpCenterModule,
          pendingCenter: PendingCenterModule,
          audit: AuditModule,
          reports: ReportsModule,
          auth: AuthModule
        }
      };

      if (window.App && typeof window.App.init === 'function') {
        window.App.init();
      }
    }

    eventBus.publish('APP_INITIALIZED', { timestamp: new Date().toISOString() });
  }
}

// Inicialização segura no carregamento do DOM
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ApplicationBootstrap.init());
  } else {
    ApplicationBootstrap.init();
  }
}

export default ApplicationBootstrap;
