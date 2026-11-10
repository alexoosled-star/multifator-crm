-- ============================================================================
-- SCRIPT OFICIAL DE PRODUÇÃO: CRM MULTIFATOR SAAS CORPORATIVO
-- ARQUITETURA DE BANCO DE DADOS, ROW LEVEL SECURITY (RLS) & SUPABASE STORAGE
-- (Com suporte a migração automática e idempotência total)
-- ============================================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABELA DE ORGANIZAÇÕES (TENANTS)
-- ----------------------------------------------------------------------------
create table if not exists public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    cnpj text unique,
    plan text not null default 'pro' check (plan in ('starter', 'pro', 'enterprise')),
    active boolean not null default true,
    settings jsonb not null default '{
        "tax_simulator_enabled": true,
        "ai_copilot_enabled": true,
        "rfb_prospecting_enabled": true,
        "custom_funnel_stages": false,
        "max_users": 50
    }'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Garantir colunas se organizations já existia de versões de teste anteriores
alter table public.organizations add column if not exists cnpj text;
alter table public.organizations add column if not exists plan text not null default 'pro';
alter table public.organizations add column if not exists active boolean not null default true;
alter table public.organizations add column if not exists settings jsonb not null default '{
    "tax_simulator_enabled": true,
    "ai_copilot_enabled": true,
    "rfb_prospecting_enabled": true,
    "custom_funnel_stages": false,
    "max_users": 50
}'::jsonb;
alter table public.organizations add column if not exists created_at timestamptz not null default now();
alter table public.organizations add column if not exists updated_at timestamptz not null default now();

-- Inserir organização padrão da matriz caso a tabela esteja vazia
insert into public.organizations (id, name, plan, active)
values ('00000000-0000-0000-0000-000000000001', 'Multifator Matriz', 'enterprise', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. TABELA DE PERFIS DE USUÁRIOS (PROFILES)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    tenant_id uuid references public.organizations(id) on delete restrict,
    full_name text not null default 'Usuário CRM',
    email text not null default '',
    role text not null default 'seller',
    commercial_role text default 'Consultor Comercial',
    phone text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Garantir que colunas corporativas existam mesmo se criada no protótipo anterior
alter table public.profiles add column if not exists tenant_id uuid references public.organizations(id) on delete restrict;
alter table public.profiles add column if not exists full_name text not null default 'Usuário CRM';
alter table public.profiles add column if not exists role text not null default 'seller';
alter table public.profiles add column if not exists commercial_role text default 'Consultor Comercial';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text default '';
alter table public.profiles add column if not exists active boolean default true;
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- Garantir valores válidos em role
update public.profiles set role = 'seller' where role is null;

-- Ajustar constraint de role para aceitar roles corporativas
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'manager', 'seller', 'backoffice'));

-- Migrar perfis existentes que estavam sem tenant_id para a organização padrão
update public.profiles 
set tenant_id = '00000000-0000-0000-0000-000000000001' 
where tenant_id is null;

-- Agora tornar tenant_id obrigatório
alter table public.profiles alter column tenant_id set not null;

create index if not exists idx_profiles_tenant on public.profiles(tenant_id);
create index if not exists idx_profiles_role on public.profiles(role);

-- ----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS DE SEGURANÇA (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- Obtém o ID do tenant do usuário autenticado no JWT
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select tenant_id 
    from public.profiles 
    where id = auth.uid() 
      and active = true 
    limit 1;
$$;

-- Verifica se o usuário atual é Administrador ou Gestor do seu Tenant
create or replace function public.is_tenant_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 
        from public.profiles 
        where id = auth.uid() 
          and active = true 
          and role in ('admin', 'manager')
    );
$$;

revoke all on function public.current_tenant_id() from public;
grant execute on function public.current_tenant_id() to authenticated;

revoke all on function public.is_tenant_admin_or_manager() from public;
grant execute on function public.is_tenant_admin_or_manager() to authenticated;

-- ----------------------------------------------------------------------------
-- 4. TABELA DE EMPRESAS / LEADS PROSPECTADOS (COMPANIES)
-- ----------------------------------------------------------------------------
create table if not exists public.companies (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.organizations(id) on delete cascade,
    cnpj text not null,
    razao_social text not null default '',
    nome_fantasia text,
    cnae_principal text,
    cnae_descricao text,
    regime_tributario text default 'NÃO IDENTIFICADO',
    cidade text,
    uf text,
    cep text,
    logradouro text,
    numero text,
    bairro text,
    telefone text,
    email text,
    capital_social numeric(15,2) default 0.00,
    situacao_cadastral text default 'ATIVA',
    qsa jsonb default '[]'::jsonb,
    dados_receita jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Garantir todas as colunas
alter table public.companies add column if not exists tenant_id uuid references public.organizations(id) on delete cascade;
alter table public.companies add column if not exists razao_social text default '';
alter table public.companies add column if not exists nome_fantasia text;
alter table public.companies add column if not exists cnae_principal text;
alter table public.companies add column if not exists cnae_descricao text;
alter table public.companies add column if not exists regime_tributario text default 'NÃO IDENTIFICADO';
alter table public.companies add column if not exists cidade text;
alter table public.companies add column if not exists uf text;
alter table public.companies add column if not exists cep text;
alter table public.companies add column if not exists logradouro text;
alter table public.companies add column if not exists numero text;
alter table public.companies add column if not exists bairro text;
alter table public.companies add column if not exists telefone text;
alter table public.companies add column if not exists email text;
alter table public.companies add column if not exists capital_social numeric(15,2) default 0.00;
alter table public.companies add column if not exists situacao_cadastral text default 'ATIVA';
alter table public.companies add column if not exists qsa jsonb default '[]'::jsonb;
alter table public.companies add column if not exists dados_receita jsonb default '{}'::jsonb;
alter table public.companies add column if not exists created_at timestamptz default now();
alter table public.companies add column if not exists updated_at timestamptz default now();

update public.companies set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
alter table public.companies alter column tenant_id set default public.current_tenant_id();

-- Constraint única por tenant + cnpj
alter table public.companies drop constraint if exists uq_tenant_company_cnpj;
alter table public.companies add constraint uq_tenant_company_cnpj unique (tenant_id, cnpj);

create index if not exists idx_companies_tenant on public.companies(tenant_id);
create index if not exists idx_companies_cnpj on public.companies(cnpj);
create index if not exists idx_companies_uf_city on public.companies(uf, cidade);

-- ----------------------------------------------------------------------------
-- 5. TRAVAS DE EXCLUSIVIDADE DE LEAD (LEAD_LOCKS)
-- ----------------------------------------------------------------------------
create table if not exists public.lead_locks (
    id uuid default gen_random_uuid(),
    tenant_id uuid references public.organizations(id) on delete cascade,
    cnpj text not null,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    owner_name text not null default '',
    company_name text,
    city text,
    uf text,
    claimed_at timestamptz not null default now(),
    expires_at timestamptz,
    status text not null default 'Ativo',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Migração de campos se lead_locks foi herdada do protótipo
alter table public.lead_locks add column if not exists id uuid default gen_random_uuid();
alter table public.lead_locks add column if not exists tenant_id uuid references public.organizations(id) on delete cascade;
alter table public.lead_locks add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.lead_locks add column if not exists owner_name text default '';
alter table public.lead_locks add column if not exists status text default 'Ativo';
alter table public.lead_locks add column if not exists company_name text;
alter table public.lead_locks add column if not exists city text;
alter table public.lead_locks add column if not exists uf text;
alter table public.lead_locks add column if not exists expires_at timestamptz;
alter table public.lead_locks add column if not exists created_at timestamptz default now();
alter table public.lead_locks add column if not exists updated_at timestamptz default now();

update public.lead_locks set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
alter table public.lead_locks alter column tenant_id set default public.current_tenant_id();

-- Ajustar constraint de status
alter table public.lead_locks drop constraint if exists lead_locks_status_check;
alter table public.lead_locks add constraint lead_locks_status_check check (status in ('Ativo', 'Expirado', 'Liberado', 'Convertido', 'Novo Lead'));

-- Chave primária e unicidade por tenant
alter table public.lead_locks drop constraint if exists lead_locks_pkey cascade;
alter table public.lead_locks add constraint lead_locks_pkey primary key (id);
alter table public.lead_locks drop constraint if exists uq_tenant_lock_cnpj;
alter table public.lead_locks add constraint uq_tenant_lock_cnpj unique (tenant_id, cnpj);

create index if not exists idx_locks_tenant on public.lead_locks(tenant_id);
create index if not exists idx_locks_owner on public.lead_locks(owner_id);

-- ----------------------------------------------------------------------------
-- 6. FUNIL COMERCIAL & GESTÃO DE OPORTUNIDADES (OPPORTUNITIES)
-- ----------------------------------------------------------------------------
create table if not exists public.opportunities (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid default public.current_tenant_id() references public.organizations(id) on delete cascade,
    company_id uuid references public.companies(id) on delete set null,
    cnpj text not null,
    title text not null,
    stage text not null default 'lead' check (stage in ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    estimated_value numeric(15,2) default 0.00,
    real_margin_pct numeric(5,2) default 0.00,
    pis_cofins_credit_pct numeric(5,2) default 0.00,
    annual_savings_projected numeric(15,2) default 0.00,
    recommended_regime text,
    probability integer default 20 check (probability between 0 and 100),
    owner_id uuid not null references public.profiles(id) on delete restrict,
    sdr_id uuid references public.profiles(id) on delete set null,
    next_action text,
    next_action_date timestamptz,
    sla_hours_remaining integer default 48,
    sla_breached boolean not null default false,
    lost_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.opportunities add column if not exists tenant_id uuid references public.organizations(id) on delete cascade;
alter table public.opportunities add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.opportunities add column if not exists cnpj text default '';
alter table public.opportunities add column if not exists title text default 'Oportunidade';
alter table public.opportunities add column if not exists stage text default 'lead';
alter table public.opportunities add column if not exists estimated_value numeric(15,2) default 0.00;
alter table public.opportunities add column if not exists real_margin_pct numeric(5,2) default 0.00;
alter table public.opportunities add column if not exists pis_cofins_credit_pct numeric(5,2) default 0.00;
alter table public.opportunities add column if not exists annual_savings_projected numeric(15,2) default 0.00;
alter table public.opportunities add column if not exists recommended_regime text;
alter table public.opportunities add column if not exists probability integer default 20;
alter table public.opportunities add column if not exists owner_id uuid references public.profiles(id) on delete restrict;
alter table public.opportunities add column if not exists sdr_id uuid references public.profiles(id) on delete set null;
alter table public.opportunities add column if not exists next_action text;
alter table public.opportunities add column if not exists next_action_date timestamptz;
alter table public.opportunities add column if not exists sla_hours_remaining integer default 48;
alter table public.opportunities add column if not exists sla_breached boolean default false;
alter table public.opportunities add column if not exists lost_reason text;
alter table public.opportunities add column if not exists created_at timestamptz default now();
alter table public.opportunities add column if not exists updated_at timestamptz default now();

update public.opportunities set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
alter table public.opportunities alter column tenant_id set default public.current_tenant_id();

create index if not exists idx_opps_tenant on public.opportunities(tenant_id);
create index if not exists idx_opps_owner on public.opportunities(owner_id);
create index if not exists idx_opps_stage on public.opportunities(stage);
create index if not exists idx_opps_cnpj on public.opportunities(cnpj);

-- ----------------------------------------------------------------------------
-- 7. EMISSÃO E GESTÃO DE PROPOSTAS COMERCIAIS (PROPOSALS)
-- ----------------------------------------------------------------------------
create table if not exists public.proposals (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid default public.current_tenant_id() references public.organizations(id) on delete cascade,
    opportunity_id uuid references public.opportunities(id) on delete cascade,
    number text not null,
    company_name text not null,
    cnpj text not null,
    status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
    value numeric(15,2) not null default 0.00,
    payment_terms text,
    simulation_summary jsonb not null default '{}'::jsonb,
    calculation_memorial jsonb not null default '{}'::jsonb,
    valid_until date not null default (current_date + interval '15 days'),
    seller_id uuid not null references public.profiles(id) on delete restrict,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.proposals add column if not exists tenant_id uuid references public.organizations(id) on delete cascade;
alter table public.proposals add column if not exists opportunity_id uuid references public.opportunities(id) on delete cascade;
alter table public.proposals add column if not exists number text default 'PROP-001';
alter table public.proposals add column if not exists company_name text default '';
alter table public.proposals add column if not exists cnpj text default '';
alter table public.proposals add column if not exists status text default 'draft';
alter table public.proposals add column if not exists value numeric(15,2) default 0.00;
alter table public.proposals add column if not exists payment_terms text;
alter table public.proposals add column if not exists simulation_summary jsonb default '{}'::jsonb;
alter table public.proposals add column if not exists calculation_memorial jsonb default '{}'::jsonb;
alter table public.proposals add column if not exists valid_until date default (current_date + interval '15 days');
alter table public.proposals add column if not exists seller_id uuid references public.profiles(id) on delete restrict;
alter table public.proposals add column if not exists notes text;
alter table public.proposals add column if not exists created_at timestamptz default now();
alter table public.proposals add column if not exists updated_at timestamptz default now();

update public.proposals set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
alter table public.proposals alter column tenant_id set default public.current_tenant_id();

alter table public.proposals drop constraint if exists uq_tenant_proposal_number;
alter table public.proposals add constraint uq_tenant_proposal_number unique (tenant_id, number);

create index if not exists idx_proposals_tenant on public.proposals(tenant_id);
create index if not exists idx_proposals_seller on public.proposals(seller_id);
create index if not exists idx_proposals_status on public.proposals(status);

-- ----------------------------------------------------------------------------
-- 8. GESTÃO DE ARQUIVOS E DOCUMENTOS (ATTACHMENTS)
-- ----------------------------------------------------------------------------
create table if not exists public.attachments (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid default public.current_tenant_id() references public.organizations(id) on delete cascade,
    cnpj text not null,
    company_id uuid references public.companies(id) on delete cascade,
    opportunity_id uuid references public.opportunities(id) on delete set null,
    name text not null,
    storage_path text not null,
    file_size bigint not null default 0,
    mime_type text not null,
    category text not null default 'Outros' check (category in ('Contratos', 'Propostas', 'Balancetes / DRE', 'CNDs', 'Documentos Societários', 'Outros')),
    author_id uuid not null references public.profiles(id) on delete restrict,
    author_name text not null,
    created_at timestamptz not null default now()
);

alter table public.attachments add column if not exists tenant_id uuid references public.organizations(id) on delete cascade;
alter table public.attachments add column if not exists cnpj text default '';
alter table public.attachments add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.attachments add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;
alter table public.attachments add column if not exists name text default '';
alter table public.attachments add column if not exists storage_path text default '';
alter table public.attachments add column if not exists file_size bigint default 0;
alter table public.attachments add column if not exists mime_type text default '';
alter table public.attachments add column if not exists category text default 'Outros';
alter table public.attachments add column if not exists author_id uuid references public.profiles(id) on delete restrict;
alter table public.attachments add column if not exists author_name text default '';
alter table public.attachments add column if not exists created_at timestamptz default now();

update public.attachments set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
alter table public.attachments alter column tenant_id set default public.current_tenant_id();

create index if not exists idx_attachments_tenant on public.attachments(tenant_id);
create index if not exists idx_attachments_cnpj on public.attachments(cnpj);

-- ----------------------------------------------------------------------------
-- 9. LOGS DE AUDITORIA E GOVERNANÇA (AUDIT_LOGS)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid default public.current_tenant_id() references public.organizations(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete set null,
    user_name text not null,
    entity_type text not null check (entity_type in ('lead', 'opportunity', 'proposal', 'attachment', 'user', 'system')),
    entity_id text not null,
    action text not null,
    details jsonb default '{}'::jsonb,
    ip_address text,
    created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists tenant_id uuid references public.organizations(id) on delete cascade;
alter table public.audit_logs add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.audit_logs add column if not exists user_name text default 'Sistema';
alter table public.audit_logs add column if not exists entity_type text default 'system';
alter table public.audit_logs add column if not exists entity_id text default '';
alter table public.audit_logs add column if not exists action text default '';
alter table public.audit_logs add column if not exists details jsonb default '{}'::jsonb;
alter table public.audit_logs add column if not exists ip_address text;
alter table public.audit_logs add column if not exists created_at timestamptz default now();

update public.audit_logs set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
alter table public.audit_logs alter column tenant_id set default public.current_tenant_id();

create index if not exists idx_audit_tenant on public.audit_logs(tenant_id);
create index if not exists idx_audit_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);

-- ============================================================================
-- 10. ATIVAÇÃO RIGOROSA DO ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.lead_locks enable row level security;
alter table public.opportunities enable row level security;
alter table public.proposals enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;

-- POLÍTICAS RLS: ORGANIZATIONS
drop policy if exists "organizations_select" on public.organizations;
create policy "organizations_select" on public.organizations
    for select to authenticated
    using (id = public.current_tenant_id());

drop policy if exists "organizations_update" on public.organizations;
create policy "organizations_update" on public.organizations
    for update to authenticated
    using (id = public.current_tenant_id() and public.is_tenant_admin_or_manager())
    with check (id = public.current_tenant_id() and public.is_tenant_admin_or_manager());

-- POLÍTICAS RLS: PROFILES
drop policy if exists "profiles_select_tenant" on public.profiles;
create policy "profiles_select_tenant" on public.profiles
    for select to authenticated
    using (tenant_id = public.current_tenant_id());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
    for insert to authenticated
    with check (tenant_id = public.current_tenant_id() and (public.is_tenant_admin_or_manager() or auth.uid() = id));

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
    for update to authenticated
    using (tenant_id = public.current_tenant_id() and (id = auth.uid() or public.is_tenant_admin_or_manager()))
    with check (tenant_id = public.current_tenant_id() and (id = auth.uid() or public.is_tenant_admin_or_manager()));

-- POLÍTICAS RLS: COMPANIES
drop policy if exists "companies_select_tenant" on public.companies;
create policy "companies_select_tenant" on public.companies
    for select to authenticated
    using (tenant_id = public.current_tenant_id());

drop policy if exists "companies_insert_tenant" on public.companies;
create policy "companies_insert_tenant" on public.companies
    for insert to authenticated
    with check (tenant_id = public.current_tenant_id());

drop policy if exists "companies_update_tenant" on public.companies;
create policy "companies_update_tenant" on public.companies
    for update to authenticated
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());

drop policy if exists "companies_delete_admin" on public.companies;
create policy "companies_delete_admin" on public.companies
    for delete to authenticated
    using (tenant_id = public.current_tenant_id() and public.is_tenant_admin_or_manager());

-- POLÍTICAS RLS: LEAD_LOCKS
drop policy if exists "locks_select_tenant" on public.lead_locks;
create policy "locks_select_tenant" on public.lead_locks
    for select to authenticated
    using (tenant_id = public.current_tenant_id());

drop policy if exists "locks_insert_owner" on public.lead_locks;
create policy "locks_insert_owner" on public.lead_locks
    for insert to authenticated
    with check (tenant_id = public.current_tenant_id() and owner_id = auth.uid());

drop policy if exists "locks_update_owner_or_admin" on public.lead_locks;
create policy "locks_update_owner_or_admin" on public.lead_locks
    for update to authenticated
    using (tenant_id = public.current_tenant_id() and (owner_id = auth.uid() or public.is_tenant_admin_or_manager()))
    with check (tenant_id = public.current_tenant_id() and (owner_id = auth.uid() or public.is_tenant_admin_or_manager()));

drop policy if exists "locks_delete_owner_or_admin" on public.lead_locks;
create policy "locks_delete_owner_or_admin" on public.lead_locks
    for delete to authenticated
    using (tenant_id = public.current_tenant_id() and (owner_id = auth.uid() or public.is_tenant_admin_or_manager()));

-- POLÍTICAS RLS: OPPORTUNITIES
drop policy if exists "opps_select_tenant" on public.opportunities;
create policy "opps_select_tenant" on public.opportunities
    for select to authenticated
    using (tenant_id = public.current_tenant_id());

drop policy if exists "opps_insert_tenant" on public.opportunities;
create policy "opps_insert_tenant" on public.opportunities
    for insert to authenticated
    with check (tenant_id = public.current_tenant_id() and owner_id = auth.uid());

drop policy if exists "opps_update_owner_or_manager" on public.opportunities;
create policy "opps_update_owner_or_manager" on public.opportunities
    for update to authenticated
    using (tenant_id = public.current_tenant_id() and (owner_id = auth.uid() or public.is_tenant_admin_or_manager()))
    with check (tenant_id = public.current_tenant_id() and (owner_id = auth.uid() or public.is_tenant_admin_or_manager()));

drop policy if exists "opps_delete_admin" on public.opportunities;
create policy "opps_delete_admin" on public.opportunities
    for delete to authenticated
    using (tenant_id = public.current_tenant_id() and public.is_tenant_admin_or_manager());

-- POLÍTICAS RLS: PROPOSALS
drop policy if exists "proposals_select_tenant" on public.proposals;
create policy "proposals_select_tenant" on public.proposals
    for select to authenticated
    using (tenant_id = public.current_tenant_id());

drop policy if exists "proposals_insert_tenant" on public.proposals;
create policy "proposals_insert_tenant" on public.proposals
    for insert to authenticated
    with check (tenant_id = public.current_tenant_id());

drop policy if exists "proposals_update_seller_or_manager" on public.proposals;
create policy "proposals_update_seller_or_manager" on public.proposals
    for update to authenticated
    using (tenant_id = public.current_tenant_id() and (seller_id = auth.uid() or public.is_tenant_admin_or_manager()))
    with check (tenant_id = public.current_tenant_id() and (seller_id = auth.uid() or public.is_tenant_admin_or_manager()));

drop policy if exists "proposals_delete_admin" on public.proposals;
create policy "proposals_delete_admin" on public.proposals
    for delete to authenticated
    using (tenant_id = public.current_tenant_id() and public.is_tenant_admin_or_manager());

-- POLÍTICAS RLS: ATTACHMENTS
drop policy if exists "attachments_select_tenant" on public.attachments;
create policy "attachments_select_tenant" on public.attachments
    for select to authenticated
    using (tenant_id = public.current_tenant_id());

drop policy if exists "attachments_insert_tenant" on public.attachments;
create policy "attachments_insert_tenant" on public.attachments
    for insert to authenticated
    with check (tenant_id = public.current_tenant_id() and author_id = auth.uid());

drop policy if exists "attachments_delete_author_or_manager" on public.attachments;
create policy "attachments_delete_author_or_manager" on public.attachments
    for delete to authenticated
    using (tenant_id = public.current_tenant_id() and (author_id = auth.uid() or public.is_tenant_admin_or_manager()));

-- POLÍTICAS RLS: AUDIT_LOGS
drop policy if exists "audit_select_tenant" on public.audit_logs;
create policy "audit_select_tenant" on public.audit_logs
    for select to authenticated
    using (tenant_id = public.current_tenant_id());

drop policy if exists "audit_insert_system" on public.audit_logs;
create policy "audit_insert_system" on public.audit_logs
    for insert to authenticated
    with check (tenant_id = public.current_tenant_id());

-- ----------------------------------------------------------------------------
-- 11. PROCEDURES ATÔMICAS DE GOVERNANÇA COMERCIAL
-- ----------------------------------------------------------------------------

-- Reivindicação atômica de lead com trava de concorrência e auditoria
create or replace function public.claim_lead_saas(
    p_cnpj text,
    p_company_name text default null,
    p_city text default null,
    p_uf text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_tenant_id uuid;
    v_name text;
    v_existing record;
begin
    if v_uid is null then
        return jsonb_build_object('success', false, 'error', 'Não autenticado.');
    end if;

    select tenant_id, full_name into v_tenant_id, v_name
    from public.profiles 
    where id = v_uid and active = true;

    if v_tenant_id is null then
        return jsonb_build_object('success', false, 'error', 'Usuário não pertence a nenhuma organização ativa.');
    end if;

    -- Tenta inserir trava com exclusividade atômica no tenant
    insert into public.lead_locks (tenant_id, cnpj, owner_id, owner_name, company_name, city, uf, status)
    values (v_tenant_id, p_cnpj, v_uid, v_name, p_company_name, p_city, p_uf, 'Ativo')
    on conflict (tenant_id, cnpj) do nothing;

    -- Verifica o status atual da trava
    select * into v_existing 
    from public.lead_locks 
    where tenant_id = v_tenant_id and cnpj = p_cnpj;

    if v_existing.owner_id = v_uid then
        insert into public.audit_logs (tenant_id, user_id, user_name, entity_type, entity_id, action, details)
        values (v_tenant_id, v_uid, v_name, 'lead', p_cnpj, 'CLAIM_LEAD', jsonb_build_object('company', p_company_name));

        return jsonb_build_object('success', true, 'message', 'Lead bloqueado com sucesso.', 'lock', row_to_json(v_existing));
    else
        return jsonb_build_object(
            'success', false, 
            'error', 'Lead já está sob atendimento exclusivo de outro vendedor.',
            'owner_name', v_existing.owner_name,
            'claimed_at', v_existing.claimed_at
        );
    end if;
end;
$$;

-- Liberação atômica de lead
create or replace function public.release_lead_saas(p_cnpj text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_tenant_id uuid;
    v_name text;
    v_lock record;
begin
    select tenant_id, full_name into v_tenant_id, v_name
    from public.profiles 
    where id = v_uid and active = true;

    select * into v_lock 
    from public.lead_locks 
    where tenant_id = v_tenant_id and cnpj = p_cnpj;

    if v_lock is null then
        return jsonb_build_object('success', false, 'error', 'Trava não encontrada.');
    end if;

    if v_lock.owner_id <> v_uid and not public.is_tenant_admin_or_manager() then
        return jsonb_build_object('success', false, 'error', 'Permissão negada. Apenas o responsável ou gestor pode liberar.');
    end if;

    delete from public.lead_locks 
    where tenant_id = v_tenant_id and cnpj = p_cnpj;

    insert into public.audit_logs (tenant_id, user_id, user_name, entity_type, entity_id, action)
    values (v_tenant_id, v_uid, v_name, 'lead', p_cnpj, 'RELEASE_LEAD');

    return jsonb_build_object('success', true, 'message', 'Lead liberado com sucesso.');
end;
$$;

revoke all on function public.claim_lead_saas(text, text, text, text) from public;
grant execute on function public.claim_lead_saas(text, text, text, text) to authenticated;

revoke all on function public.release_lead_saas(text) from public;
grant execute on function public.release_lead_saas(text) to authenticated;

-- ============================================================================
-- 12. CONFIGURAÇÃO DE BUCKET DE STORAGE E POLÍTICAS DE ACESSO
-- ============================================================================

-- Criação do Bucket privado 'crm-attachments'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'crm-attachments',
    'crm-attachments',
    false,
    104857600, -- Limite de 100MB por arquivo
    array[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'application/octet-stream'
    ]
)
on conflict (id) do update set
    public = false,
    file_size_limit = 104857600;

-- RLS no Storage Objects já vem ativado nativamente pelo Supabase

-- Política de Leitura no Storage
drop policy if exists "storage_select_tenant" on storage.objects;
create policy "storage_select_tenant"
on storage.objects for select to authenticated
using (
    bucket_id = 'crm-attachments'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
);

-- Política de Upload no Storage
drop policy if exists "storage_insert_tenant" on storage.objects;
create policy "storage_insert_tenant"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'crm-attachments'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
);

-- Política de Delete no Storage
drop policy if exists "storage_delete_tenant" on storage.objects;
create policy "storage_delete_tenant"
on storage.objects for delete to authenticated
using (
    bucket_id = 'crm-attachments'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and (owner = auth.uid() or public.is_tenant_admin_or_manager())
);

-- ============================================================================
-- 13. CONCESSÕES DE PERMISSÕES
-- ============================================================================
grant usage on schema public to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.lead_locks to authenticated;
grant select, insert, update, delete on public.opportunities to authenticated;
grant select, insert, update, delete on public.proposals to authenticated;
grant select, insert, delete on public.attachments to authenticated;
grant select, insert on public.audit_logs to authenticated;

-- ============================================================================
-- SCRIPT CONCLUÍDO COM SUCESSO!
-- ============================================================================
