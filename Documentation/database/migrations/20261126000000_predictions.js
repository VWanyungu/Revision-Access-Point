/**
 * Data behind paper predictions: per-paper analysis and the shared per-unit forecast.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // SQL-BEGIN
  await knex.raw(String.raw`
-- Revision Access Point: data behind the paper predictions.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project (after paper_kinds.sql). Safe to re-run.
--
--   paper_analysis  what each past paper asks: its questions, marks, type, and the syllabus topic each one tests. One row
--                   per paper, written once by the predict-forecast edge function (this is the only ChatPDF cost).
--   unit_forecasts  the topic forecast for a unit and paper kind, shared by every student. It is recomputed only when the
--                   set of analysed papers changes (source_hash), so asking again is free.
--
-- Both tables are written and read only by edge functions (service role); there are no student policies.


create table if not exists public.paper_analysis (
  resource_id  bigint primary key references public.resources(id) on delete cascade,
  status       text not null check (status in ('running', 'done', 'failed')),
  questions    jsonb,
  total_marks  integer,
  error        text,
  started_at   timestamptz not null default now(),
  analyzed_at  timestamptz
);

create table if not exists public.unit_forecasts (
  unit_id      bigint not null references public.units(id) on delete cascade,
  kind         text not null check (kind in ('cat1', 'cat2', 'exam')),
  source_hash  text not null,
  forecast     jsonb not null,
  created_at   timestamptz not null default now(),
  primary key (unit_id, kind)
);

alter table public.paper_analysis enable row level security;
alter table public.unit_forecasts enable row level security;

  `);
  // SQL-END
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('unit_forecasts');
  await knex.schema.dropTableIfExists('paper_analysis');
};
