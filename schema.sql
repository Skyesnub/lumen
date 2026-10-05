create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  total_study_time numeric not null default 0
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  name text not null,
  total_study_time numeric not null default 0
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  date timestamptz not null default now(),
  duration numeric not null,
  title text not null default 'Study session'
);

create table homework_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  estimated_minutes integer not null check (estimated_minutes > 0),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Run this safely in an existing Supabase project to add titles to sessions
-- that were created before this column existed.
alter table sessions add column if not exists title text not null default 'Study session';

alter table courses enable row level security;
alter table projects enable row level security;
alter table sessions enable row level security;
alter table homework_assignments enable row level security;

create policy "Users manage their own courses"
  on courses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage projects in their own courses"
  on projects for all
  using (exists (select 1 from courses where courses.id = projects.course_id and courses.user_id = auth.uid()))
  with check (exists (select 1 from courses where courses.id = projects.course_id and courses.user_id = auth.uid()));

create policy "Users manage sessions in their own projects"
  on sessions for all
  using (exists (
    select 1 from projects join courses on courses.id = projects.course_id
    where projects.id = sessions.project_id and courses.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from projects join courses on courses.id = projects.course_id
    where projects.id = sessions.project_id and courses.user_id = auth.uid()
  ));

create policy "Users manage homework in their own courses"
  on homework_assignments for all
  using (exists (select 1 from courses where courses.id = homework_assignments.course_id and courses.user_id = auth.uid()))
  with check (
    exists (select 1 from courses where courses.id = homework_assignments.course_id and courses.user_id = auth.uid())
    and (project_id is null or exists (
      select 1 from projects where projects.id = homework_assignments.project_id and projects.course_id = homework_assignments.course_id
    ))
  );

grant select, insert, update, delete on courses, projects, sessions, homework_assignments to authenticated;
