-- Run this once in the Supabase SQL Editor for an existing Lumen database.
-- Existing sessions receive the fallback title "Study session".
alter table sessions
  add column if not exists title text not null default 'Study session';
