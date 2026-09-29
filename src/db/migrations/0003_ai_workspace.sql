-- Teacher OS migration 0003: AI workspace + settings + documents
-- Tables: teacher_settings, ai_conversations, ai_messages, ai_actions,
--         document_templates, generated_documents
--
-- Requires: 0001_core_foundation.sql
-- Apply: psql "$DATABASE_URL" -f 0003_ai_workspace.sql
--
-- ROLLBACK: drop table if exists generated_documents, document_templates,
--   ai_actions, ai_messages, ai_conversations, teacher_settings;

-- ---------------------------------------------------------------- teacher AI settings
-- NOTE: API keys are NEVER stored here. Keys live only in server env (AI_API_KEY).
-- This table stores non-secret preferences (provider, model, base URL).
create table teacher_settings (
  teacher_id uuid primary key references teachers (id) on delete cascade,
  ai_provider text not null default 'mock' check (ai_provider in ('mock', 'openai_compat')),
  ai_model text,
  ai_base_url text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- AI conversations & memory
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Percakapan baru',
  context_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_owner_idx on ai_conversations (owner_user_id, updated_at desc);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index ai_messages_conv_idx on ai_messages (conversation_id, created_at);

-- ---------------------------------------------------------------- AI structured actions (human-in-the-loop)
create table ai_actions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  risk text not null default 'low' check (risk in ('low', 'high')),
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'executed', 'rejected')),
  result jsonb,
  created_at timestamptz not null default now()
);
create index ai_actions_conv_idx on ai_actions (conversation_id, status);

-- ---------------------------------------------------------------- document templates & outputs (Phase 6 marketplace-ready)
create table document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  education_level_code text references education_levels (code),
  subject text,
  document_type text not null,
  version int not null default 1,
  schema jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table generated_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid references document_templates (id) on delete set null,
  title text not null,
  format text not null default 'pdf' check (format in ('pdf', 'docx', 'xlsx', 'jpg')),
  content jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ================================================================ ROW LEVEL SECURITY
alter table teacher_settings enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table ai_actions enable row level security;
alter table document_templates enable row level security;
alter table generated_documents enable row level security;

-- teacher_settings: owner manages own row (via claimed teacher row)
create policy teacher_settings_owner on teacher_settings
  for all to authenticated using (
    teacher_id in (select id from teachers where user_id = auth.uid())
  ) with check (
    teacher_id in (select id from teachers where user_id = auth.uid())
  );

-- conversations / documents: owners manage only their own rows
create policy ai_conversations_owner on ai_conversations
  for all to authenticated using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());
create policy ai_messages_owner_select on ai_messages
  for select to authenticated using (
    conversation_id in (select id from ai_conversations where owner_user_id = auth.uid())
  );
create policy ai_messages_owner_insert on ai_messages
  for insert to authenticated with check (
    conversation_id in (select id from ai_conversations where owner_user_id = auth.uid())
  );
create policy ai_actions_owner on ai_actions
  for all to authenticated using (
    conversation_id in (select id from ai_conversations where owner_user_id = auth.uid())
  ) with check (
    conversation_id in (select id from ai_conversations where owner_user_id = auth.uid())
  );
create policy generated_documents_owner on generated_documents
  for all to authenticated using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- templates: readable reference data for authenticated users
create policy document_templates_select on document_templates
  for select to authenticated using (true);
