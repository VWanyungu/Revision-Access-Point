-- Revision Access Point: updates for an existing Supabase database.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It can be run again safely (every statement is "if not exists" or "create or replace").
--
-- It is the same as these knex migrations, in one file for the SQL editor:
--   20260518000000_semester_preview.js   semester_preview() for the pay screen
--   20261118120000_study_progress.js     resource_opens, quiz_attempts
--   20261118130000_topics.js             topics, resources.topic_id
-- Use EITHER this file OR `knex migrate:latest`, not both: knex does not know this file ran
-- and would try to create the same tables again.

begin;

-- ---------------------------------------------------------------------------
-- 1. semester_preview: what a semester contains, counts only (never file URLs),
--    so the pay screen can show it before the user has paid.
--    resource_type_id: 1 notes, 2 exams, 3 cats, 4 tutorials (papers = exams + cats).
-- ---------------------------------------------------------------------------
create or replace function public.semester_preview(
  p_department_id bigint,
  p_year smallint,
  p_semester smallint
)
returns table (
  unit_id bigint,
  code text,
  name text,
  notes bigint,
  papers bigint,
  tutorials bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.code,
    u.name,
    count(r.id) filter (where r.resource_type_id = 1),
    count(r.id) filter (where r.resource_type_id in (2, 3)),
    count(r.id) filter (where r.resource_type_id = 4)
  from units u
  left join resources r on r.unit_id = u.id
  where u.department_id = p_department_id
    and u.year_of_study = p_year
    and u.semester_of_study = p_semester
  group by u.id, u.code, u.name
  order by u.code;
$$;

revoke all on function public.semester_preview(bigint, smallint, smallint) from public;
grant execute on function public.semester_preview(bigint, smallint, smallint) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Study progress. Private to each user (user_uuid = auth.uid()).
--    resource_opens: a note counts as read once it has a row here.
--    quiz_attempts:  one row per finished quiz.
-- ---------------------------------------------------------------------------
create table if not exists public.resource_opens (
  user_uuid text not null,
  resource_id bigint not null references public.resources (id) on delete cascade,
  first_opened_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  primary key (user_uuid, resource_id)
);

create table if not exists public.quiz_attempts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_uuid text not null,
  resource_id bigint not null references public.resources (id) on delete cascade,
  correct smallint not null,
  total smallint not null,
  constraint quiz_attempts_score_valid check (total > 0 and correct >= 0 and correct <= total)
);

create index if not exists quiz_attempts_user_uuid_resource_id_index
  on public.quiz_attempts (user_uuid, resource_id);

alter table public.resource_opens enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "Users read their own opens" on public.resource_opens;
create policy "Users read their own opens" on public.resource_opens
  for select to authenticated using (user_uuid = (auth.uid())::text);

drop policy if exists "Users record their own opens" on public.resource_opens;
create policy "Users record their own opens" on public.resource_opens
  for insert to authenticated with check (user_uuid = (auth.uid())::text);

drop policy if exists "Users update their own opens" on public.resource_opens;
create policy "Users update their own opens" on public.resource_opens
  for update to authenticated
  using (user_uuid = (auth.uid())::text) with check (user_uuid = (auth.uid())::text);

drop policy if exists "Users read their own quiz attempts" on public.quiz_attempts;
create policy "Users read their own quiz attempts" on public.quiz_attempts
  for select to authenticated using (user_uuid = (auth.uid())::text);

drop policy if exists "Users record their own quiz attempts" on public.quiz_attempts;
create policy "Users record their own quiz attempts" on public.quiz_attempts
  for insert to authenticated with check (user_uuid = (auth.uid())::text);

-- ---------------------------------------------------------------------------
-- 3. Topics. A unit's syllabus; notes point at a topic with resources.topic_id.
--    A topic is complete for a user when every note in it has a row in resource_opens.
--    Notes with no topic still work: the app shows each as its own topic.
-- ---------------------------------------------------------------------------
create table if not exists public.topics (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  unit_id bigint not null references public.units (id) on delete cascade,
  position smallint not null default 0,
  title text not null,
  description text,
  unique (unit_id, position)
);

alter table public.resources
  add column if not exists topic_id bigint references public.topics (id) on delete set null;

create index if not exists resources_topic_id_index on public.resources (topic_id);

alter table public.topics enable row level security;

-- Same rule as resources: only people subscribed to the unit's semester can read its topics.
drop policy if exists "Allow subscribed users to read topics" on public.topics;
create policy "Allow subscribed users to read topics" on public.topics
  for select
  using (
    exists (
      select 1
      from public.subscriptions s
      join public.units u
        on u.id = topics.unit_id
       and u.department_id = s.department_id
       and u.year_of_study = s.year_of_study
       and u.semester_of_study = s.semester_of_study
      where s.user_uuid = (auth.uid())::text
        and s.end_date > now()
    )
  );

commit;

-- ---------------------------------------------------------------------------
-- Optional, after the above: add topics for a unit and attach its notes. Example (edit the ids):
--
--   insert into public.topics (unit_id, position, title, description)
--   values (12, 1, 'Introduction to project management', 'What counts as a project and what the manager owns.')
--   returning id;
--
--   update public.resources set topic_id = <the id returned above> where id in (101, 102);
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Institutions (migration 20261119000000_institutions)
-- ---------------------------------------------------------------------------
begin;

create table if not exists public.institutions (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null unique,
  short_name  text not null unique
);

insert into public.institutions (name, short_name)
values ('Masinde Muliro University of Science and Technology', 'MMUST')
on conflict (short_name) do nothing;

do $$
declare
  mmust bigint := (select id from public.institutions where short_name = 'MMUST');
  t text;
  users_table text := coalesce(to_regclass('public."Users"')::text, to_regclass('public.users')::text);
begin
  foreach t in array array['schools','departments','units','topics','resources','subscriptions','pending_payments', users_table]
  loop
    continue when t is null;
    execute format('alter table %s add column if not exists institution_id bigint references public.institutions(id)', t);
    execute format('update %s set institution_id = %s where institution_id is null', t, mmust);
    execute format('alter table %s alter column institution_id set not null', t);
    execute format('create index if not exists %I on %s (institution_id)', 'idx_' || replace(replace(t, '"', ''), 'public.', '') || '_institution', t);
  end loop;
end $$;

-- Children inherit the institution of their parent when it is not given, so only schools need it set explicitly.
create or replace function public.inherit_institution() returns trigger language plpgsql as $$
begin
  if new.institution_id is not null then return new; end if;
  if tg_table_name = 'departments' then
    select institution_id into new.institution_id from public.schools where id = new.school_id;
  elsif tg_table_name in ('units', 'subscriptions', 'pending_payments') then
    select institution_id into new.institution_id from public.departments where id = new.department_id;
  elsif tg_table_name = 'topics' then
    select institution_id into new.institution_id from public.units where id = new.unit_id;
  elsif tg_table_name = 'resources' then
    select coalesce(
      (select institution_id from public.units where id = new.unit_id),
      (select institution_id from public.schools where id = new.school_id)
    ) into new.institution_id;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['departments','units','topics','resources','subscriptions','pending_payments']
  loop
    execute format('drop trigger if exists inherit_institution on public.%I', t);
    execute format('create trigger inherit_institution before insert on public.%I for each row execute function public.inherit_institution()', t);
  end loop;
end $$;

-- Institution admins: scoped to one institution.
insert into public.roles (name, description)
select 'institution_admin', 'Manages one institution: its schools, departments, units and resources'
where not exists (select 1 from public.roles where name = 'institution_admin');
  
commit;
