# GUIA OFICIAL DE PRODUÇÃO: CRM MULTIFATOR SAAS
**Domínio Oficial, Banco de Dados (Supabase RLS & Storage) e Deploy Contínuo**

---

## 🎯 Ordem de Execução Recomendada

Para garantir que a aplicação entre no ar já conectada e 100% funcional, a ordem técnica ideal é:
1. **Etapa A: Executar o Script SQL no Banco de Dados (Supabase)**
2. **Etapa B: Deploy Contínuo (CI/CD via Vercel, Netlify ou Docker)**
3. **Etapa C: Configuração do Domínio Próprio e Certificado SSL**

---

## 🗄️ ETAPA A: Executar o Script SQL no Supabase

O script oficial com toda a estrutura multi-tenant corporativa está localizado em:
👉 `crm-saas/sql/supabase_production_saas_rls.sql`

### Passo a Passo no Console do Supabase:
1. Acesse o painel do seu projeto no Supabase:
   - URL do projeto: `https://supabase.com/dashboard/project/pwcabvrrnixqkcvnlefb`
2. No menu lateral esquerdo, clique no ícone **SQL Editor** (ou `New query`).
3. Abra o arquivo `supabase_production_saas_rls.sql`, copie todo o conteúdo e cole no editor.
4. Clique no botão verde **Run** (ou pressione `Ctrl + Enter`).
5. **O que o script cria e configura automaticamente:**
   - [x] Extensões `uuid-ossp` e `pgcrypto`.
   - [x] Tabelas com isolamento multi-tenant:
     - `organizations` (Tenants/Empresas clientes)
     - `profiles` (Usuários vinculados a cada organização)
     - `companies` (Carteira de clientes e dados da Receita Federal)
     - `lead_locks` (Trava atômica de exclusividade de lead por CNPJ)
     - `opportunities` (Oportunidades e estágios do funil Kanban)
     - `proposals` (Propostas comerciais e histórico de cálculo)
     - `attachments` (Metadados de arquivos e vínculos)
     - `audit_logs` (Trilha de auditoria e conformidade)
   - [x] Função de segurança `current_tenant_id()` com `SECURITY DEFINER`.
   - [x] Stored procedures atômicas `claim_lead_saas` e `release_lead_saas`.
   - [x] Habilitação de **Row Level Security (RLS)** em 100% das tabelas com políticas estritas.
   - [x] Criação do Bucket Privado de Storage `crm-attachments` com políticas RLS por pasta `/tenant_id/`.

---

## 🚀 ETAPA B: Deploy Contínuo (CI/CD)

O projeto já possui os arquivos de configuração de infraestrutura com **todos os cabeçalhos de segurança (CSP, HSTS, X-Frame-Options: DENY, nosniff)** pré-configurados:
- `vercel.json` (Vercel)
- `netlify.toml` (Netlify)
- `Dockerfile` (Docker / Railway / Render / VPS)

### Opção 1: Deploy na Vercel (Recomendado - 2 minutos com SSL Automático)
1. Crie uma conta ou faça login em [vercel.com](https://vercel.com).
2. Clique em **Add New...** -> **Project**.
3. Conecte seu repositório Git (GitHub / GitLab / Bitbucket) ou use a Vercel CLI:
   ```bash
   npx vercel deploy --prod
   ```
4. A Vercel detectará o `vercel.json` e aplicará automaticamente:
   - CDN Global de alta velocidade.
   - Emissão de SSL/TLS com renovação automática.
   - Cabeçalhos de segurança corporativa HTTP.

### Opção 2: Deploy no Netlify
1. Faça login em [netlify.com](https://netlify.com).
2. Conecte o repositório ou faça drag-and-drop da pasta `crm-saas`.
3. O Netlify lerá o arquivo `netlify.toml` e publicará a aplicação com os cabeçalhos configurados.

### Opção 3: Deploy via Docker (VPS / AWS / DigitalOcean / Railway)
Se preferir hospedar em infraestrutura própria ou containerizada:
```bash
docker build -t crm-multifator-saas .
docker run -d -p 3000:3000 --name crm-app crm-multifator-saas
```

---

## 🌐 ETAPA C: Configuração do Domínio Próprio e SSL

### 1. Criar os Registros de DNS no seu Provedor (Registro.br, Cloudflare, GoDaddy, etc.)
Para colocar o CRM no ar com o seu domínio corporativo (exemplo: `crm.suaempresa.com.br`):

| Tipo | Nome / Host | Destino / Valor | TTL |
| :--- | :--- | :--- | :--- |
| **CNAME** | `crm` | `cname.vercel-dns.com` (se Vercel) ou o CNAME do seu host | 1 Hora (ou Automático) |

*(Se preferir usar no domínio raiz `suaempresa.com.br`, configure o apontamento Tipo A para o IP indicado pela plataforma).*

### 2. Adicionar o Domínio no Painel da Hospedagem
- Na **Vercel**: Vá em **Settings** -> **Domains** -> digite `crm.suaempresa.com.br` -> clique em **Add**.
- A Vercel verificará o DNS e emitirá o certificado SSL (Let's Encrypt) em menos de 5 minutos.

### 3. Atualizar o Domínio Autorizado no Supabase
Para que os links de convite por e-mail e recuperação de senha funcionem perfeitamente no novo domínio:
1. Acesse o console do Supabase:
   `https://supabase.com/dashboard/project/pwcabvrrnixqkcvnlefb/auth/url-configuration`
2. No campo **Site URL**, altere para o seu domínio final:
   `https://crm.suaempresa.com.br`
3. Na seção **Redirect URLs**, adicione:
   `https://crm.suaempresa.com.br/**`
4. Clique em **Save**.

---

## ✅ Checklist Final de Produção

- [ ] Script SQL executado no SQL Editor do Supabase sem erros.
- [ ] Bucket `crm-attachments` visível na aba **Storage** do Supabase.
- [ ] Deploy efetuado na plataforma de hospedagem escolhida.
- [ ] Apontamento DNS configurado e propagado.
- [ ] Certificado SSL ativo (cadeado verde no navegador).
- [ ] URL de redirecionamento atualizada no Supabase Auth.
