create table if not exists quiz_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  quiz_date date not null,
  created_at timestamptz not null default now()
);

alter table quiz_events enable row level security;

create policy "Users manage quizzes in their own courses"
  on quiz_events for all
  using (exists (select 1 from courses where courses.id = quiz_events.course_id and courses.user_id = auth.uid()))
  with check (exists (select 1 from courses where courses.id = quiz_events.course_id and courses.user_id = auth.uid()));

grant select, insert, update, delete on quiz_events to authenticated;
