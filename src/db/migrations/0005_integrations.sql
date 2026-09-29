-- Teacher OS migration 0005: integrations, secrets, files
-- Tables: integrations, integration_secrets, files
-- Alters: knowledge_documents += file_id, external_id
-- Storage bucket: teacher-os-files (private) + RLS for owner folders
--
-- Requires: 0001_core_foundation.sql, 0004_knowledge.sql
-- Apply: psql "$DATABASE_URL" -f 0005_integrations.sql
--
-- ROLLBACK: delete from storage.objects where bucket_id = 'teacher-os-files';
--   delete from storage.buckets where id = 'teacher-os-files';
--   alter table knowledge_documents drop column if exists file_id, drop column if exists external_id;
--   drop table if exists files, integration_secrets, integrations;

-- ---------------------------------------------------------------- integrations
create table integrations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('s3', 'notion', 'google', 'posthog')),
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connected', 'error')),
  -- Non-secret config only (workspace ids, selections). Secrets live in integration_secrets.
  config jsonb not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, provider)
);

-- OAuth/API tokens encrypted with APP_ENCRYPTION_KEY (see lib/crypto).
-- Plaintext tokens must never be logged, returned to the client, or stored elsewhere.
create table integration_secrets (
  integration_id uuid primary key references integrations (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- files (object storage metadata)
create table files (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  mime_type text,
  size_bytes int,
  storage_key text not null,
  backend text not null default 's3' check (backend in ('s3', 'supabase')),
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index files_owner_idx on files (owner_user_id, created_at desc);

alter table knowledge_documents
  add column if not exists file_id uuid references files (id) on delete set null,
  add column if not exists external_id text;

-- ---------------------------------------------------------------- supabase storage bucket (fallback backend)
insert into storage.buckets (id, name, public)
values ('teacher-os-files', 'teacher-os-files', false)
on conflict (id) do nothing;

create policy "owners manage own files" on storage.objects
  for all to authenticated
  using (bucket_id = 'teacher-os-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'teacher-os-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- ================================================================ ROW LEVEL SECURITY
alter table integrations enable row level security;
alter table integration_secrets enable row level security;
alter table files enable row level security;

create policy integrations_owner on integrations
  for all to authenticated using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());
create policy integration_secrets_owner on integration_secrets
  for all to authenticated using (
    integration_id in (select id from integrations where owner_user_id = auth.uid())
  ) with check (
    integration_id in (select id from integrations where owner_user_id = auth.uid())
  );
create policy files_owner on files
  for all to authenticated using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());
