-- Teacher OS migration 0001: core foundation
-- Tables: education_levels, schools, profiles, teachers, teacher_schools,
--         academic_years, semesters, classes, teacher_classes,
--         students, parents, enrollments, audit_logs
--
-- Apply: psql "$DATABASE_URL" -f 0001_core_foundation.sql
--        (or paste into Supabase SQL editor)
--
-- ROLLBACK: drop policies then tables in reverse dependency order:
--   drop table if exists audit_logs, enrollments, parents, students,
--     teacher_classes, classes, semesters, academic_years,
--     teacher_schools, teachers, profiles, schools, education_levels;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- education levels
create table education_levels (
  code text primary key,              -- PAUD | TK | SD | SMP | SMA | SMK
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into education_levels (code, name, sort_order) values
  ('PAUD', 'PAUD', 10),
  ('TK', 'TK', 20),
  ('SD', 'SD', 30),
  ('SMP', 'SMP', 40),
  ('SMA', 'SMA', 50),
  ('SMK', 'SMK', 60)
on conflict (code) do nothing;

-- ---------------------------------------------------------------- schools
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  npsn text,
  address text,
  phone text,
  logo_url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------- profiles (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- teachers
-- user_id nullable: a teacher row may be imported by an operator before the
-- teacher claims the account during onboarding.
create table teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  school_id uuid references schools (id) on delete restrict,
  nip text,
  nuptk text,
  education_level_code text references education_levels (code),
  subject text,
  role text not null default 'guru_mapel'
    check (role in ('guru_kelas', 'guru_mapel', 'guru_bk', 'guru_pendamping', 'wali_kelas')),
  position text,
  bio text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table teacher_schools (
  teacher_id uuid not null references teachers (id) on delete cascade,
  school_id uuid not null references schools (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (teacher_id, school_id)
);

-- ---------------------------------------------------------------- academic years & semesters
create table academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  name text not null,                       -- e.g. '2026/2027'
  starts_on date,
  ends_on date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create table semesters (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years (id) on delete cascade,
  name text not null check (name in ('Ganjil', 'Genap')),
  starts_on date,
  ends_on date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, name)
);

-- ---------------------------------------------------------------- classes
create table classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  academic_year_id uuid references academic_years (id) on delete restrict,
  education_level_code text references education_levels (code),
  grade text,                                -- e.g. '5'
  name text not null,                        -- e.g. '5A'
  homeroom_teacher_id uuid references teachers (id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (school_id, academic_year_id, name)
);

create table teacher_classes (
  teacher_id uuid not null references teachers (id) on delete cascade,
  class_id uuid not null references classes (id) on delete cascade,
  subject text,
  created_at timestamptz not null default now(),
  primary key (teacher_id, class_id)
);

-- ---------------------------------------------------------------- students & parents
create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  full_name text not null,
  nisn text unique,
  gender text check (gender in ('L', 'P')),
  birth_place text,
  birth_date date,
  address text,
  phone text,
  photo_url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index students_school_id_idx on students (school_id);
create index students_full_name_idx on students using gin (to_tsvector('simple', full_name));

-- parents covers guardians too via the relation field
-- (ayah | ibu | wali), avoiding a near-duplicate table.
create table parents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  relation text not null check (relation in ('ayah', 'ibu', 'wali')),
  full_name text not null,
  phone text,
  email text,
  occupation text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index parents_student_id_idx on parents (student_id);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  class_id uuid not null references classes (id) on delete cascade,
  academic_year_id uuid references academic_years (id) on delete restrict,
  status text not null default 'aktif'
    check (status in ('aktif', 'pindah', 'lulus', 'keluar')),
  enrolled_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year_id)
);
create index enrollments_class_id_idx on enrollments (class_id);

-- ---------------------------------------------------------------- audit log (append-only: no update/delete policies)
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- ================================================================ ROW LEVEL SECURITY
alter table education_levels enable row level security;
alter table schools enable row level security;
alter table profiles enable row level security;
alter table teachers enable row level security;
alter table teacher_schools enable row level security;
alter table academic_years enable row level security;
alter table semesters enable row level security;
alter table classes enable row level security;
alter table teacher_classes enable row level security;
alter table students enable row level security;
alter table parents enable row level security;
alter table enrollments enable row level security;
alter table audit_logs enable row level security;

-- helper: schools the current user belongs to (via claimed teacher row)
create or replace function user_school_ids()
returns setof uuid
language sql security definer set search_path = public stable as $$
  select ts.school_id
  from teachers t
  join teacher_schools ts on ts.teacher_id = t.id
  where t.user_id = auth.uid() and t.deleted_at is null;
$$;

-- education_levels: readable by any authenticated user (reference data)
create policy levels_select on education_levels
  for select to authenticated using (true);

-- profiles: users manage only their own row
create policy profiles_select_own on profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- schools: members read; any authenticated user may create (onboarding);
-- members update their own schools. No delete policy (service role only).
create policy schools_select_member on schools
  for select to authenticated using (id in (select user_school_ids()));
create policy schools_insert_any on schools
  for insert to authenticated with check (true);
create policy schools_update_member on schools
  for update to authenticated
  using (id in (select user_school_ids()))
  with check (id in (select user_school_ids()));

-- teachers: members of a school read teacher rows of that school + own row;
-- users insert their own row; users update their own row.
create policy teachers_select on teachers
  for select to authenticated using (
    user_id = auth.uid() or school_id in (select user_school_ids())
  );
create policy teachers_insert_own on teachers
  for insert to authenticated with check (user_id = auth.uid() or user_id is null);
create policy teachers_update_own on teachers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- teacher_schools: readable by members, insertable during onboarding claim
create policy teacher_schools_select on teacher_schools
  for select to authenticated using (school_id in (select user_school_ids()));
create policy teacher_schools_insert on teacher_schools
  for insert to authenticated with check (true);

-- school-scoped tables share one membership pattern
create policy academic_years_all on academic_years
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy semesters_select on semesters
  for select to authenticated using (
    academic_year_id in (select id from academic_years where school_id in (select user_school_ids()))
  );
create policy semesters_write on semesters
  for insert to authenticated with check (
    academic_year_id in (select id from academic_years where school_id in (select user_school_ids()))
  );
create policy classes_all on classes
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy teacher_classes_all on teacher_classes
  for all to authenticated using (
    class_id in (select id from classes where school_id in (select user_school_ids()))
  ) with check (
    class_id in (select id from classes where school_id in (select user_school_ids()))
  );
create policy students_all on students
  for all to authenticated using (school_id in (select user_school_ids()))
  with check (school_id in (select user_school_ids()));
create policy parents_all on parents
  for all to authenticated using (
    student_id in (select id from students where school_id in (select user_school_ids()))
  ) with check (
    student_id in (select id from students where school_id in (select user_school_ids()))
  );
create policy enrollments_all on enrollments
  for all to authenticated using (
    class_id in (select id from classes where school_id in (select user_school_ids()))
  ) with check (
    class_id in (select id from classes where school_id in (select user_school_ids()))
  );

-- audit_logs: insert own actions, read own school scope via actor
create policy audit_insert_own on audit_logs
  for insert to authenticated with check (actor_id = auth.uid());
create policy audit_select_own on audit_logs
  for select to authenticated using (actor_id = auth.uid());
