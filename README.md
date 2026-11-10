# 🚀 Multifator CRM SaaS — Plataforma Comercial Multi-tenant & IA Autônoma

> **Case Completo de Engenharia de Software:** CRM SaaS corporativo de alto desempenho com arquitetura multi-tenant, segurança em múltiplos fatores (MFA/2FA + Supabase RLS), esteira de agentes autônomos de IA e pipeline comercial avançado.

[![Domínio Oficial](https://img.shields.io/badge/Dom%C3%ADnio%20Oficial-multifatorcrm.com.br-00D2FF?style=for-the-badge&logo=googlechrome&logoColor=black)](https://www.multifatorcrm.com.br)

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Supabase-RLS%20Multi--Tenant-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Security%20Definer-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready%20Offline-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Security](https://img.shields.io/badge/Security-2FA%20%7C%20CSP%20%7C%20HSTS-0284C7)](https://owasp.org/)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel%20%7C%20Netlify%20%7C%20Docker-black)](https://vercel.com)

---

## 🌐 Acesso em Produção

* **Domínio Oficial do Produto:** [https://www.multifatorcrm.com.br](https://www.multifatorcrm.com.br)

---

## 📌 Visão Geral do Projeto

O **Multifator CRM** é uma solução SaaS completa desenvolvida para gerenciar equipes de vendas, prospecção B2B de alto volume, cálculo tributário dinâmico, roteirização de equipes externas e orquestração de negociações em tempo real.

O projeto foi desenhado sob os mais rigorosos princípios de **defesa em profundidade**, combinando isolamento de dados por Tenant no PostgreSQL (Row Level Security), trava atômica de leads para evitar concorrência desleal entre vendedores, e autenticação multifator para perfis operacionais e executivos.

---

## 🛡️ Pilares de Segurança & Arquitetura Multi-Tenant

### 1. Autenticação Multifator (MFA / 2FA)
- Suporte a segundo fator de autenticação com geração e validação de tokens temporários.
- Sessões protegidas por tokens de curta duração e controle de acesso baseado em papéis (*RBAC - Role-Based Access Control*).

### 2. Isolamento RLS Nativo no Banco (PostgreSQL / Supabase)
- **Zero Vazamento de Dados (Tenant Leakage):** Cada consulta é filtrada no nível de banco via `current_tenant_id()` com funções `SECURITY DEFINER`.
- **Atomic Lead Lock:** Procedimentos armazenados (`claim_lead_saas` e `release_lead_saas`) para garantir trava de exclusividade atômica por CNPJ, impedindo conflito entre vendedores.
- **Trilha de Auditoria Completa:** Tabela de `audit_logs` registrando data, usuário, IP, entidade e ação executada em operações sensíveis.

---

## 🤖 Enxame de Agentes Autônomos de IA (Swarm Architecture)

O sistema possui uma camada especializada de agentes inteligentes que operam de forma cooperativa através de um barramento de eventos (*Event Bus*):

| Agente | Responsabilidade |
|---|---|
| **Agent Orchestrator** | Coordena o fluxo entre os agentes e despacha ordens em tempo real |
| **Pipeline Guardian** | Monitora estagnação de negócios no funil Kanban e alerta sobre riscos de churn |
| **Cost Estimator** | Calcula custos operacionais, margem de contribuição e propostas em segundos |
| **Fiscal Compliance** | Valida regime tributário (Simples Nacional, Lucro Presumido, Lucro Real) e regras de CND |
| **Field Dispatcher** | Otimiza rotas de vendedores externos com integração a mapas georreferenciados |
| **Billing Cashflow** | Projeta fluxo de caixa futuro e impacto financeiro de descontos concedidos |

---

## ✨ Principais Funcionalidades

- **Funil Kanban Interativo:** Arraste e solte (*drag and drop*) oportunidades com recálculo automático de métricas de conversão.
- **Enriquecimento Automático via Receita Federal:** Consulta instantânea de CNPJ com preenchimento de razão social, CNAE, sócios, endereço e situação cadastral.
- **Simulador Tributário & Gerador de Propostas:** Geração de propostas comerciais completas com cálculo de impostos e exportação.
- **Assinatura Digital de Contratos:** Fluxo integrado para validação e fechamento de contratos diretamente na plataforma.
- **WhatsApp Hub & Central de Mensageria:** Comunicação ágil com clientes com templates de atendimento.
- **Roteirizador de Campo:** Mapas dinâmicos para visualização de clientes por CEP, raio de proximidade e rotas de visita.
- **Gamificação & Painel TV:** Dashboards interativos para salas de vendas com métricas de desempenho e rankings em tempo real.
- **PWA (Progressive Web App):** Instalável no Windows, Android e iOS com suporte a execução offline e sincronização em segundo plano.

---

## 📂 Estrutura de Diretórios

```
crm-saas/
├── css/                           # Folhas de estilo modularizadas
│   ├── ai-copilot.css             # Estilos do Copiloto de IA
│   ├── landing.css                # Página institucional / Landing Page
│   ├── responsive-mobile.css      # Responsividade para smartphones e tablets
│   └── style.css                  # Tema visual e componentes base
├── js/
│   ├── agents/                    # Enxame de Agentes Autônomos de IA
│   ├── core/                      # Barramento de eventos e cliente Supabase
│   ├── features/                  # Módulos especializados (WhatsApp, Maps, Gamificação)
│   ├── modules/                   # Módulos comerciais (Kanban, Propostas, Relatórios)
│   ├── app.js                     # Inicialização da aplicação
│   └── auth.js                    # Camada de autenticação e controle de acesso
├── sql/
│   ├── supabase_production_saas_rls.sql  # Script de criação de tabelas, RLS e triggers
│   └── zerar_base_crm.sql                 # Script de sanitização e testes
├── tests/                         # Testes automatizados (E2E, RLS e Swarm)
├── Dockerfile                     # Imagem Docker para containerização
├── netlify.toml                   # Configuração com headers de segurança para Netlify
├── vercel.json                    # Configuração para deploy instantâneo na Vercel
├── manifest.json                  # Manifesto PWA
├── service-worker.js              # Service Worker para cache e modo offline
├── index.html                     # Aplicação SPA principal
├── landing.html                   # Página de apresentação do produto
└── relatorio_executivo_multifator_crm.html # Relatório executivo completo
```

---

## 🛠️ Como Executar Localmente

### Pré-requisitos
Nenhum framework pesado é obrigatório. Basta um servidor estático simples ou o próprio Node.js:

```bash
# Opção 1: Usando o servidor Node integrado
node server.js

# Opção 2: Usando qualquer servidor estático (ex: npx serve ou Python)
npx serve .
# ou
python -m http.server 3000
```

Abra o navegador em `http://localhost:3000`.

---

## 🚀 Como Publicar no GitHub

Para publicar este repositório no seu GitHub (`https://github.com/alexoosled-star`):

```bash
# 1. Acesse o diretório do projeto
cd crm-saas

# 2. Inicialize o repositório Git
git init

# 3. Adicione todos os arquivos
git add .

# 4. Crie o primeiro commit estruturado
git commit -m "feat: commit inicial da plataforma Multifator CRM SaaS"

# 5. Renomeie a branch para main
git branch -M main

# 6. Vincule ao seu repositório remoto (crie 'multifator-crm' no github.com/new antes)
git remote add origin https://github.com/alexoosled-star/multifator-crm.git

# 7. Envie os arquivos
git push -u origin main
```

---

## 🌐 Deploy em Produção

O projeto já conta com arquivos de deploy com **Content Security Policy (CSP)**, **HSTS** e cabeçalhos de segurança pré-configurados:

- **Vercel:** Conecte o repositório na Vercel ou execute `npx vercel deploy --prod`.
- **Netlify:** Arraste a pasta ou conecte ao Git via `netlify.toml`.
- **Docker:** Execute `docker build -t crm-multifator . && docker run -p 80:80 crm-multifator`.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais informações.

Desenvolvido por **alexoosled-star** — Engenharia de Software & Soluções em IA.
