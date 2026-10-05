create table if not exists homework_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  estimated_minutes integer not null check (estimated_minutes > 0),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table homework_assignments add column if not exists due_date date;

alter table homework_assignments enable row level security;

create policy "Users manage homework in their own courses"
  on homework_assignments for all
  using (exists (select 1 from courses where courses.id = homework_assignments.course_id and courses.user_id = auth.uid()))
  with check (
    exists (select 1 from courses where courses.id = homework_assignments.course_id and courses.user_id = auth.uid())
    and (project_id is null or exists (
      select 1 from projects where projects.id = homework_assignments.project_id and projects.course_id = homework_assignments.course_id
    ))
  );

grant select, insert, update, delete on homework_assignments to authenticated;
