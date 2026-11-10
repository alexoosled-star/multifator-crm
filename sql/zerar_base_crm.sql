-- ============================================================================
-- SCRIPT OFICIAL: ZERAR BASE CRM (VERSÃO ULTRA-SEGURA E RESILIENTE)
-- Verifica a existência de cada tabela antes de truncar, evitando erros
-- caso alguma tabela ainda não tenha sido criada no projeto.
-- ============================================================================

DO $$
DECLARE
    t text;
    tbls text[] := ARRAY[
        'public.audit_logs',
        'public.attachments',
        'public.proposals',
        'public.opportunities',
        'public.lead_locks',
        'public.companies'
    ];
BEGIN
    -- 1. Limpa apenas as tabelas operacionais que realmente existem no banco
    FOREACH t IN ARRAY tbls LOOP
        IF to_regclass(t) IS NOT NULL THEN
            EXECUTE 'TRUNCATE TABLE ' || t || ' RESTART IDENTITY CASCADE';
            RAISE NOTICE '✔ Tabela % limpa com sucesso.', t;
        ELSE
            RAISE NOTICE 'ℹ Tabela % não existe no banco, pulando...', t;
        END IF;
    END LOOP;

    -- 2. Limpeza de perfis de teste se a tabela profiles existir
    IF to_regclass('public.profiles') IS NOT NULL THEN
        DELETE FROM public.profiles 
        WHERE email ILIKE '%demo%' 
           OR email ILIKE '%test%' 
           OR email ILIKE '%@multifator.local'
           OR full_name ILIKE '%demo%' 
           OR full_name ILIKE '%teste%'
           OR full_name ILIKE '%dev-master%';
        RAISE NOTICE '✔ Usuários de teste limpos em public.profiles.';
    END IF;

    -- 3. Reset da organização matriz se existir
    IF to_regclass('public.organizations') IS NOT NULL THEN
        UPDATE public.organizations
        SET name = 'Minha Empresa', cnpj = NULL, updated_at = now()
        WHERE id = '00000000-0000-0000-0000-000000000001' 
           OR name ILIKE '%teste%' 
           OR name ILIKE '%demo%';

        DELETE FROM public.organizations
        WHERE id != '00000000-0000-0000-0000-000000000001'
          AND (name ILIKE '%teste%' OR name ILIKE '%demo%' OR name ILIKE '%dev%');
        RAISE NOTICE '✔ Organizações de teste limpas em public.organizations.';
    END IF;
END $$;

-- Lista de tabelas públicas existentes no banco de dados para conferência
SELECT 
    table_name AS tabela_existente
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
