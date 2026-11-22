/**
 * A student's finished attempts at a custom topic quiz. Same SQL as Documentation/database/topic_quiz_attempts.sql.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // SQL-BEGIN
  await knex.raw(String.raw`
-- Revision Access Point: each student's finished attempts at a custom topic quiz.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project (after topic_quizzes.sql). Safe to re-run.
-- Students read and write only their own rows; the quiz page uses it for the "previous best" on the results screen.


-- One row per finished attempt at a custom quiz, written and read by the student only.
create table if not exists public.topic_quiz_attempts (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_uuid  text not null,
  quiz_id    bigint not null references public.topic_quizzes (id) on delete cascade,
  correct    smallint not null,
  total      smallint not null,
  constraint topic_quiz_attempts_score_valid check (total > 0 and correct >= 0 and correct <= total)
);

create index if not exists topic_quiz_attempts_user_quiz_index on public.topic_quiz_attempts (user_uuid, quiz_id);

alter table public.topic_quiz_attempts enable row level security;

drop policy if exists "Users read their own topic quiz attempts" on public.topic_quiz_attempts;
create policy "Users read their own topic quiz attempts" on public.topic_quiz_attempts
  for select to authenticated using (user_uuid = (auth.uid())::text);

drop policy if exists "Users record their own topic quiz attempts" on public.topic_quiz_attempts;
create policy "Users record their own topic quiz attempts" on public.topic_quiz_attempts
  for insert to authenticated with check (user_uuid = (auth.uid())::text);

  `);
  // SQL-END
};

exports.down = async function (knex) {
  await knex.raw('drop table if exists public.topic_quiz_attempts');
};
