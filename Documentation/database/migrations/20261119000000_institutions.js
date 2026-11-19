/**
 * Multi-vendor: adds institutions and an institution_id foreign key to every tenant table,
 * backfilled to MMUST (Masinde Muliro University of Science and Technology), plus the institution_admin role.
 * Subscriptions keep the institution of the department they unlock, so a student paying for another
 * campus's semester has a subscription whose institution differs from their own (users.institution_id).
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // SQL-BEGIN
  await knex.raw(String.raw`
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
  `);
  // SQL-END
};

exports.down = async function (knex) {
  for (const t of ['departments', 'units', 'topics', 'resources', 'subscriptions', 'pending_payments']) {
    await knex.raw('drop trigger if exists inherit_institution on ??', [t]);
  }
  await knex.raw('drop function if exists public.inherit_institution()');
  await knex.raw("delete from public.roles where name = 'institution_admin'");
  for (const t of ['schools', 'departments', 'units', 'topics', 'resources', 'subscriptions', 'pending_payments']) {
    await knex.raw('alter table ?? drop column if exists institution_id', [t]);
  }
  await knex.raw('alter table "Users" drop column if exists institution_id').catch(() => {});
  await knex.schema.dropTableIfExists('institutions');
};
