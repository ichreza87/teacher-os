-- Teacher OS migration 0004: knowledge base + RAG
-- Requires: 0001_core_foundation.sql
-- Supabase: enable the "vector" extension first (Dashboard → Database → Extensions).
-- Apply: psql "$DATABASE_URL" -f 0004_knowledge.sql
--
-- ROLLBACK: drop function if exists match_knowledge_chunks(vector, uuid, int);
--   drop table if exists knowledge_chunks, knowledge_documents;

create extension if not exists vector;

alter table teacher_settings add column if not exists ai_embed_model text;

-- ---------------------------------------------------------------- documents (personal knowledge base)
create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  school_id uuid references schools (id) on delete set null,
  teacher_id uuid references teachers (id) on delete set null,
  title text not null,
  subject text,
  education_level_code text references education_levels (code),
  source_type text not null default 'upload'
    check (source_type in ('upload', 'note', 'import')),
  mime_type text,
  size_bytes int,
  -- NOTE: original file bytes are NOT stored yet (object storage lands in Phase 5).
  -- Only extracted text (as chunks) is persisted.
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'failed')),
  error text,
  chunk_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index knowledge_documents_owner_idx on knowledge_documents (owner_user_id, updated_at desc);

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references knowledge_documents (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);
create index knowledge_chunks_doc_idx on knowledge_chunks (document_id, chunk_index);
create index knowledge_chunks_embedding_idx on knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------- semantic retrieval (owner-scoped)
create or replace function match_knowledge_chunks(
  q_embedding vector(1536),
  q_owner uuid,
  match_count int
)
returns table (chunk_id uuid, document_id uuid, title text, content text, similarity float)
language sql stable security definer set search_path = public as $$
  select c.id, c.document_id, d.title, c.content,
         1 - (c.embedding <=> q_embedding) as similarity
  from knowledge_chunks c
  join knowledge_documents d on d.id = c.document_id
  where c.owner_user_id = q_owner
    and d.status = 'ready'
    and d.deleted_at is null
  order by c.embedding <=> q_embedding
  limit match_count;
$$;

-- ================================================================ ROW LEVEL SECURITY
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;

create policy knowledge_documents_owner on knowledge_documents
  for all to authenticated using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());
create policy knowledge_chunks_owner_select on knowledge_chunks
  for select to authenticated using (owner_user_id = auth.uid());
create policy knowledge_chunks_owner_insert on knowledge_chunks
  for insert to authenticated with check (owner_user_id = auth.uid());
create policy knowledge_chunks_owner_delete on knowledge_chunks
  for delete to authenticated using (owner_user_id = auth.uid());
