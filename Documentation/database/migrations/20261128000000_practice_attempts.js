/**
 * Practice-paper model answers, per-student attempts (with an immutable copy of the paper) and the private photo bucket.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // SQL-BEGIN
  await knex.raw(String.raw`
-- Revision Access Point: practice-paper answers, attempts and photo attachments.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project (after practice_papers.sql). Safe to re-run.
--
--   practice_papers.answers   model answers for the saved paper, written by the predict-paper function right after the paper.
--   practice_papers.serial    bumped every time a new paper is written, so an attempt can name exactly which paper it was for.
--   practice_attempts         a student's go at a practice paper: their answers, then the AI marking. It keeps its own copy of
--                             the paper and model answers (paper, model_answers), so the results stay readable after the
--                             student writes a new paper. One attempt, and so one marking, per paper.
--   practice-attachments      private storage for the photos students attach (JPG, PNG, WEBP, 5 MB each). A student can
--                             only reach their own folder: <user id>/<unit>/<kind>/<serial>/...
--
-- Students start and save attempts through the two functions below and read their own attempts; marking results are written
-- only by the mark-paper edge function (service role), so a student cannot edit their own marks.


alter table public.practice_papers
  add column if not exists answers jsonb,
  add column if not exists serial integer not null default 1;

create table if not exists public.practice_attempts (
  user_uuid     uuid not null,
  unit_id       bigint not null references public.units(id) on delete cascade,
  kind          text not null check (kind in ('cat1', 'cat2', 'exam')),
  paper_serial  integer not null,
  status        text not null default 'draft' check (status in ('draft', 'marking', 'marked', 'failed')),
  timed         boolean not null default false,
  paper         jsonb not null,
  model_answers jsonb,
  -- { "<question number>": { "text": "...", "files": ["<storage path>", ...] } }
  answers       jsonb not null default '{}'::jsonb,
  result        jsonb,
  error         text,
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  marked_at     timestamptz,
  primary key (user_uuid, unit_id, kind, paper_serial)
);

alter table public.practice_attempts enable row level security;

drop policy if exists "students read their own attempts" on public.practice_attempts;
create policy "students read their own attempts" on public.practice_attempts for select using (user_uuid = auth.uid());

-- Starts the student's attempt at their current paper, or returns the one already under way (so they can carry on).
create or replace function public.start_attempt(p_unit bigint, p_kind text, p_timed boolean default false)
returns public.practice_attempts
language plpgsql security definer set search_path = public as $$
declare
  pp public.practice_papers;
  att public.practice_attempts;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into pp from public.practice_papers where user_uuid = auth.uid() and unit_id = p_unit and kind = p_kind;
  if not found then raise exception 'write a practice paper first'; end if;

  select * into att from public.practice_attempts
    where user_uuid = auth.uid() and unit_id = p_unit and kind = p_kind and paper_serial = pp.serial;
  if found then return att; end if;

  insert into public.practice_attempts (user_uuid, unit_id, kind, paper_serial, timed, paper, model_answers)
  values (auth.uid(), p_unit, p_kind, pp.serial, coalesce(p_timed, false), pp.content, pp.answers)
  returning * into att;
  return att;
end $$;

-- Saves the student's answers as they type. Only while the attempt is still a draft.
create or replace function public.save_attempt_draft(p_unit bigint, p_kind text, p_serial integer, p_answers jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.practice_attempts set answers = p_answers
  where user_uuid = auth.uid() and unit_id = p_unit and kind = p_kind and paper_serial = p_serial and status = 'draft';
end $$;

revoke all on function public.start_attempt(bigint, text, boolean), public.save_attempt_draft(bigint, text, integer, jsonb) from public, anon;
grant execute on function public.start_attempt(bigint, text, boolean), public.save_attempt_draft(bigint, text, integer, jsonb) to authenticated;

-- Private bucket for answer photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('practice-attachments', 'practice-attachments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "practice photos: add to own folder" on storage.objects;
create policy "practice photos: add to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'practice-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "practice photos: read own folder" on storage.objects;
create policy "practice photos: read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'practice-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "practice photos: delete own folder" on storage.objects;
create policy "practice photos: delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'practice-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

  `);
  // SQL-END
};

exports.down = async function (knex) {
  await knex.raw('drop function if exists public.save_attempt_draft(bigint, text, integer, jsonb)');
  await knex.raw('drop function if exists public.start_attempt(bigint, text, boolean)');
  await knex.schema.dropTableIfExists('practice_attempts');
  await knex.raw('alter table public.practice_papers drop column if exists answers, drop column if exists serial');
};
