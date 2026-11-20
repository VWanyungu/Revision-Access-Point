-- Revision Access Point: each student's AI-written practice paper for a unit's next CAT or exam.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project (after predictions.sql). Safe to re-run.
--
-- One saved paper per student, unit and kind (cat1 / cat2 / exam). It is cached, so reopening it is free and it never changes
-- while the student reads it. forecast_hash records which forecast it was written from: when new past papers change the
-- forecast, the saved paper is marked outdated and the student may refresh it without using up a regeneration.
-- generations counts every paper written for the student on this unit and kind; the edge function caps it (first paper + 2).
--
-- Written and read only by the predict-paper edge function (service role); students get no direct access.

begin;

create table if not exists public.practice_papers (
  user_uuid     uuid not null,
  unit_id       bigint not null references public.units(id) on delete cascade,
  kind          text not null check (kind in ('cat1', 'cat2', 'exam')),
  forecast_hash text not null,
  content       jsonb not null,
  generations   integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_uuid, unit_id, kind)
);

alter table public.practice_papers enable row level security;

commit;
