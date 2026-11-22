/**
 * Custom quizzes written by admins for a topic (shown on the topic's Quiz tab in the student app).
 * The SQL is the same as Documentation/database/topic_quizzes.sql.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // SQL-BEGIN
  await knex.raw(String.raw`
-- Revision Access Point: custom quizzes that admins write for a topic.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project (after topics and institutions). Safe to re-run.
--
-- A topic may have any number of quizzes. Each quiz keeps its questions as one jsonb array:
--   [{ "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "optional" }, ...]
-- correctAnswer is a 0-based index into options. The student app shows these on the topic's Quiz tab; with none, the tab is unchanged.
--
-- Who can write: super admins, institution admins of the topic's institution, school admins of the unit's school, and course
-- admins of the unit's department (roles and scope come from the admin's JWT app_metadata, see admins.sql).
-- Who can read: students subscribed to the unit's semester (same rule as topics).


create table if not exists public.topic_quizzes (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  topic_id       bigint not null references public.topics (id) on delete cascade,
  institution_id bigint not null references public.institutions (id),
  title          text not null,
  questions      jsonb not null default '[]',
  constraint topic_quizzes_questions_check check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) > 0)
);

create index if not exists topic_quizzes_topic_id_index on public.topic_quizzes (topic_id);
create index if not exists topic_quizzes_institution_index on public.topic_quizzes (institution_id);

-- A new quiz takes its topic's institution when none is given (the admin app sends one for scoped admins).
create or replace function public.topic_quizzes_institution() returns trigger language plpgsql as $$
begin
  if new.institution_id is null then
    select institution_id into new.institution_id from public.topics where id = new.topic_id;
  end if;
  return new;
end $$;

drop trigger if exists inherit_institution on public.topic_quizzes;
create trigger inherit_institution before insert on public.topic_quizzes
  for each row execute function public.topic_quizzes_institution();

-- True when the calling admin may manage quizzes of this topic.
create or replace function public.can_manage_topic(p_topic bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.topics t
    join public.units u on u.id = t.unit_id
    join public.departments d on d.id = u.department_id
    where t.id = p_topic
      and case public._admin_role()
        when 'super_admin' then true
        when 'institution_admin' then t.institution_id = public._admin_institution()
        when 'school_admin' then (auth.jwt() -> 'app_metadata' -> 'school_ids') @> to_jsonb(d.school_id)
        when 'course_admin' then (auth.jwt() -> 'app_metadata' -> 'course_ids') @> to_jsonb(d.id)
        else false
      end
  )
$$;

revoke all on function public.can_manage_topic(bigint) from public, anon;
grant execute on function public.can_manage_topic(bigint) to authenticated;

alter table public.topic_quizzes enable row level security;

drop policy if exists "Subscribed users read topic quizzes" on public.topic_quizzes;
create policy "Subscribed users read topic quizzes" on public.topic_quizzes
  for select to authenticated
  using (
    exists (
      select 1
      from public.topics t
      join public.units u on u.id = t.unit_id
      join public.subscriptions s
        on s.department_id = u.department_id
       and s.year_of_study = u.year_of_study
       and s.semester_of_study = u.semester_of_study
      where t.id = topic_quizzes.topic_id
        and s.user_uuid = (auth.uid())::text
        and s.end_date > now()
    )
  );

drop policy if exists "Admins manage topic quizzes" on public.topic_quizzes;
create policy "Admins manage topic quizzes" on public.topic_quizzes
  for all to authenticated
  using (public.can_manage_topic(topic_id))
  with check (public.can_manage_topic(topic_id));


  `);
  // SQL-END
};

exports.down = async function (knex) {
  await knex.raw('drop table if exists public.topic_quizzes');
  await knex.raw('drop function if exists public.can_manage_topic(bigint)');
  await knex.raw('drop function if exists public.topic_quizzes_institution()');
};
