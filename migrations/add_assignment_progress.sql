alter table homework_assignments
  add column if not exists spent_minutes integer not null default 0 check (spent_minutes >= 0);
