-- Teacher OS migration 0002: teaching core
-- Tables: learning_objectives, lesson_plans, materials, question_banks,
--         questions, assessments, assessment_questions, assessment_results,
--         rubrics, tasks, calendar_events
--
-- Requires: 0001_core_foundation.sql
-- Apply: psql "$DATABASE_URL" -f 0002_teaching_core.sql
--
-- ROLLBACK: drop policies then tables in reverse dependency order:
--   drop table if exists calendar_events, tasks, rubrics, assessment_results,
--     assessment_questions, assessments, questions, question_banks,
--     materials, lesson_plans, learning_objectives;

-- ---------------------------------------------------------------- learning objectives (TP/CP)
create table learning_objectives (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  education_level_code text references education_levels (code),
  subject text,
  grade text,
  topic text,
  description text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index learning_objectives_school_idx on learning_objectives (school_id, subject, grade);

-- ---------------------------------------------------------------- lesson plans (modul ajar / RPP)
create table lesson_plans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  teacher_id uuid references teachers (id) on delete set null,
  class_id uuid references classes (id) on delete set null,
  subject text,
  grade text,
  topic text,
  objectives text,
  activities text,
  duration_meetings int not null default 1 check (duration_meetings >= 1),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index lesson_plans_school_idx on lesson_plans (school_id, updated_at desc);

-- ---------------------------------------------------------------- materials
create table materials (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  lesson_plan_id uuid references lesson_plans (id) on delete set null,
  teacher_id uuid references teachers (id) on delete set null,
  title text not null,
  kind text not null default 'dokumen'
    check (kind in ('dokumen', 'video', 'tautan', 'gambar', 'presentasi', 'lembar_kerja', 'lainnya')),
  url text,
  body text,
  subject text,
  grade text,
  topic text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index materials_school_idx on materials (school_id, updated_at desc);
create index materials_search_idx on materials using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, '')));

-- ---------------------------------------------------------------- question banks & questions
create table question_banks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  teacher_id uuid references teachers (id) on delete set null,
  title text not null,
  subject text,
  grade text,
  topic text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references question_banks (id) on delete cascade,
  school_id uuid not null references schools (id) on delete cascade,
  subject text,
  grade text,
  topic text,
  learning_objective text,
  difficulty text not null default 'sedang' check (difficulty in ('mudah', 'sedang', 'sukar')),
  question_type text not null default 'pilihan_ganda'
    check (question_type in ('pilihan_ganda', 'isian', 'benar_salah', 'menjodohkan', 'essay', 'praktik', 'proyek')),
  bloom_level text check (bloom_level in ('C1', 'C2', 'C3', 'C4', 'C5', 'C6')),
  content text not null,
  answer text,
  explanation text,
  tags text[] not null default '{}',
  content_hash text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_id, content_hash)
);
create index questions_bank_idx on questions (bank_id);
create index questions_meta_idx on questions (school_id, subject, grade, topic);

-- ---------------------------------------------------------------- assessments & results (gradebook)
create table assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  teacher_id uuid references teachers (id) on delete set null,
  class_id uuid references classes (id) on delete restrict,
  lesson_plan_id uuid references lesson_plans (id) on delete set null,
  title text not null,
  kind text not null default 'formatif'
    check (kind in ('formatif', 'sumatif', 'proyek', 'praktik', 'observasi', 'uji_kompetensi')),
  scheduled_on date,
  max_score numeric not null default 100 check (max_score > 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index assessments_school_idx on assessments (school_id, updated_at desc);

create table assessment_questions (
  assessment_id uuid not null references assessments (id) on delete cascade,
  question_id uuid not null references questions (id) on delete restrict,
  weight numeric not null default 1 check (weight > 0),
  primary key (assessment_id, question_id)
);

create table assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments (id) on delete cascade,
  student_id uuid not null references students (id) on delete cascade,
  score numeric not null check (score >= 0),
  feedback text,
  graded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);
create index assessment_results_assessment_idx on assessment_results (assessment_id);

create table rubrics (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments (id) on delete cascade,
  criteria jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_owner_idx on tasks (owner_user_id, status, due_on);

-- ---------------------------------------------------------------- calendar events
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  teacher_id uuid references teachers (id) on delete set null,
  class_id uuid references classes (id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  kind text not null default 'akademik'
    check (kind in ('akademik', 'kbm', 'asesmen', 'rapat', 'acara', 'lainnya')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calendar_events_school_idx on calendar_events (school_id, starts_at);

-- ================================================================ ROW LEVEL SECURITY
alter table learning_objectives enable row level security;
alter table lesson_plans enable row level security;
alter table materials enable row level security;
alter table question_banks enable row level security;
alter table questions enable row level security;
alter table assessments enable row level security;
alter table assessment_questions enable row level security;
alter table assessment_results enable row level security;
alter table rubrics enable row level security;
alter table tasks enable row level security;
alter table calendar_events enable row level security;

-- school-scoped tables: members of the school manage rows of that school
create policy learning_objectives_all on learning_objectives
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy lesson_plans_all on lesson_plans
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy materials_all on materials
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy question_banks_all on question_banks
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy questions_all on questions
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy assessments_all on assessments
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy assessment_questions_all on assessment_questions
  for all to authenticated using (
    assessment_id in (select id from assessments where school_id in (select user_school_ids()))
  ) with check (
    assessment_id in (select id from assessments where school_id in (select user_school_ids()))
  );
create policy assessment_results_all on assessment_results
  for all to authenticated using (
    assessment_id in (select id from assessments where school_id in (select user_school_ids()))
  ) with check (
    assessment_id in (select id from assessments where school_id in (select user_school_ids()))
  );
create policy rubrics_all on rubrics
  for all to authenticated using (
    assessment_id in (select id from assessments where school_id in (select user_school_ids()))
  ) with check (
    assessment_id in (select id from assessments where school_id in (select user_school_ids()))
  );
create policy calendar_events_all on calendar_events
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));

-- tasks are personal: owners manage only their own rows
create policy tasks_owner_all on tasks
  for all to authenticated using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());
