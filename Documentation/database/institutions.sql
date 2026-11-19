-- Revision Access Point: multi-institution support.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project (not the Risk Register one).
-- Safe to re-run. Existing rows are assigned to MMUST.

begin;

do $$
begin
  if to_regclass('public.schools') is null or to_regclass('public.resources') is null then
    raise exception 'public.schools / public.resources not found: this is not the Revision Access Point database';
  end if;
end $$;

create table if not exists public.institutions (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null unique,
  short_name  text not null unique
);

insert into public.institutions (name, short_name)
values ('Masinde Muliro University of Science and Technology', 'MMUST')
on conflict (short_name) do nothing;

-- institution_id on every tenant table that exists (topics only after the topics migration; "Users" is the app users table).
do $$
declare
  mmust bigint := (select id from public.institutions where short_name = 'MMUST');
  t text;
  tbl regclass;
begin
  foreach t in array array['schools','departments','units','topics','resources','subscriptions','pending_payments','Users','users']
  loop
    tbl := to_regclass(format('public.%I', t));
    continue when tbl is null;
    execute format('alter table %s add column if not exists institution_id bigint references public.institutions(id)', tbl);
    execute format('update %s set institution_id = %s where institution_id is null', tbl, mmust);
    execute format('alter table %s alter column institution_id set not null', tbl);
    execute format('create index if not exists %I on %s (institution_id)', 'idx_' || lower(t) || '_institution', tbl);
  end loop;
end $$;

-- "Users" has no parent to inherit from, so new rows default to MMUST until sign-up sends an institution.
-- Remove this default (alter table public."Users" alter column institution_id drop default) once it does.
do $$
begin
  if to_regclass('public."Users"') is not null then
    execute format('alter table public."Users" alter column institution_id set default %s',
                   (select id from public.institutions where short_name = 'MMUST'));
  end if;
end $$;

-- A new child row takes its parent's institution when none is given, so only schools need it set explicitly.
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
      (select institution_id from public.departments where id = new.department_id),
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
    continue when to_regclass(format('public.%I', t)) is null;
    execute format('drop trigger if exists inherit_institution on public.%I', t);
    execute format('create trigger inherit_institution before insert on public.%I for each row execute function public.inherit_institution()', t);
  end loop;
end $$;

-- Institution admins (only if the roles table has the name/description shape used by this project).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'roles' and column_name = 'name') then
    insert into public.roles (name, description)
    select 'institution_admin', 'Manages one institution: its schools, departments, units and resources'
    where not exists (select 1 from public.roles where name = 'institution_admin');
  end if;
end $$;

commit;

-- Optional: scope an admin to an institution. The admin app reads these from the auth user's app_metadata.
--   update auth.users
--   set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'institution_admin', 'institution_id', 1)
--   where email = 'admin@example.com';
