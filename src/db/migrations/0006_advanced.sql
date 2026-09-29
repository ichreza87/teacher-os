-- Teacher OS migration 0006: parent communication, professional dev, school mgmt, workflows
-- Tables: communication_templates, communication_logs, professional_development,
--         school_documents, workflow_rules, workflow_runs
--
-- Requires: 0001_core_foundation.sql, 0002_teaching_core.sql
-- Apply: psql "$DATABASE_URL" -f 0006_advanced.sql
--
-- ROLLBACK: drop table if exists workflow_runs, workflow_rules, school_documents,
--   professional_development, communication_logs, communication_templates;

-- ---------------------------------------------------------------- parent communication
-- No auto-send: drafts are created, teachers approve, and sending happens
-- manually (copy text / wa.me link). The app never sends messages itself.
create table communication_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  title text not null,
  kind text not null default 'announcement'
    check (kind in ('announcement', 'progress', 'feedback', 'reminder', 'other')),
  -- Placeholders: {{nama_siswa}} {{nama_guru}} {{kelas}} {{sekolah}} {{tanggal}}
  body text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table communication_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  teacher_id uuid references teachers (id) on delete set null,
  student_id uuid references students (id) on delete set null,
  template_id uuid references communication_templates (id) on delete set null,
  channel text not null default 'whatsapp_manual'
    check (channel in ('whatsapp_manual', 'email_manual', 'other_manual')),
  recipient_name text,
  recipient_contact text,
  subject text,
  body text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'sent', 'cancelled')),
  approved_by uuid,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index communication_logs_school_idx on communication_logs (school_id, status, updated_at desc);

-- ---------------------------------------------------------------- professional development (teacher-owned)
create table professional_development (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers (id) on delete cascade,
  kind text not null default 'course'
    check (kind in ('course', 'training', 'certification', 'workshop', 'reading', 'achievement')),
  title text not null,
  provider text,
  held_on date,
  hours numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index professional_development_teacher_idx on professional_development (teacher_id, held_on desc);

-- ---------------------------------------------------------------- school documents (policies, meetings, inventory, announcements)
create table school_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  title text not null,
  kind text not null default 'announcement'
    check (kind in ('policy', 'meeting', 'inventory', 'announcement', 'other')),
  body text,
  event_date date,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------- workflow automation (user-controlled suggestions)
create table workflow_rules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  trigger text not null
    check (trigger in ('lesson_plan_without_assessment', 'assessment_fully_graded', 'task_overdue')),
  enabled boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (school_id, trigger)
);

create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references workflow_rules (id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  status text not null default 'suggested'
    check (status in ('suggested', 'applied', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (rule_id, entity_type, entity_id)
);

-- ================================================================ ROW LEVEL SECURITY
alter table communication_templates enable row level security;
alter table communication_logs enable row level security;
alter table professional_development enable row level security;
alter table school_documents enable row level security;
alter table workflow_rules enable row level security;
alter table workflow_runs enable row level security;

create policy communication_templates_all on communication_templates
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy communication_logs_all on communication_logs
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy professional_development_owner on professional_development
  for all to authenticated using (
    teacher_id in (select id from teachers where user_id = auth.uid())
  ) with check (
    teacher_id in (select id from teachers where user_id = auth.uid())
  );
create policy school_documents_all on school_documents
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy workflow_rules_all on workflow_rules
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy workflow_runs_all on workflow_runs
  for all to authenticated using (
    rule_id in (select wr.id from workflow_rules wr where wr.school_id in (select user_school_ids()))
  ) with check (
    rule_id in (select wr.id from workflow_rules wr where wr.school_id in (select user_school_ids()))
  );
