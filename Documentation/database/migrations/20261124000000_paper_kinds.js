/**
 * Explicit paper type (cat1 / cat2 / exam / supplementary) and academic year on resources,
 * backfilled from existing names. Replaces guessing from the file name.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // SQL-BEGIN
  await knex.raw(String.raw`
-- Revision Access Point: explicit paper type and academic year on resources.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project. Safe to re-run.
--
-- A resource that is a past paper (resource_type_id 2 = exams, 3 = cats) now says which paper it is, instead of the app
-- guessing from the file name:
--   paper_kind     cat1 | cat2 | exam | supplementary
--   academic_year  e.g. 2024/25
-- cat1 / cat2 are stored with resource_type_id 3; exam / supplementary with 2. The name stays, and is just an optional title.


alter table public.resources
  add column if not exists paper_kind text,
  add column if not exists academic_year text;

alter table public.resources drop constraint if exists resources_paper_kind_check;
alter table public.resources add constraint resources_paper_kind_check
  check (paper_kind is null or paper_kind in ('cat1', 'cat2', 'exam', 'supplementary'));

alter table public.resources drop constraint if exists resources_academic_year_check;
alter table public.resources add constraint resources_academic_year_check
  check (academic_year is null or academic_year ~ '^20[0-9]{2}/[0-9]{2}$');

-- Fill in the papers that already exist from their names. Rows the pattern cannot read stay empty for an admin to complete.
update public.resources r set
  paper_kind = coalesce(r.paper_kind, case
    when r.resource_type_id = 2 and r.name ~* 'supp' then 'supplementary'
    when r.resource_type_id = 2 then 'exam'
    when r.resource_type_id = 3 and r.name ~* '(cat\s*2|cat\s*two|second)' then 'cat2'
    when r.resource_type_id = 3 then 'cat1'
  end),
  academic_year = coalesce(r.academic_year,
    (select m[1] || '/' || right(m[2], 2)
     from regexp_match(r.name, '(20[0-9]{2})\s*[/\-–]\s*([0-9]{2,4})') as m))
where r.resource_type_id in (2, 3);

-- From now on every new or edited paper must carry both. NOT VALID skips the old rows that could not be read.
alter table public.resources drop constraint if exists resources_paper_complete_check;
alter table public.resources add constraint resources_paper_complete_check
  check (resource_type_id not in (2, 3) or (paper_kind is not null and academic_year is not null)) not valid;

-- One paper of each kind per unit per year. If the backfill produced duplicates, the index is skipped (with a notice) so
-- this script still completes: fix the duplicates listed by the query below, then run the create statement again.
--   select unit_id, paper_kind, academic_year, count(*) from public.resources
--   where paper_kind is not null and academic_year is not null group by 1, 2, 3 having count(*) > 1;
do $$
begin
  if exists (select 1 from public.resources where paper_kind is not null and academic_year is not null
             group by unit_id, paper_kind, academic_year having count(*) > 1) then
    raise notice 'Duplicate papers found: resources_one_paper_per_year was not created';
  else
    create unique index if not exists resources_one_paper_per_year
      on public.resources (unit_id, paper_kind, academic_year)
      where paper_kind is not null and academic_year is not null;
  end if;
end $$;

  `);
  // SQL-END
};

exports.down = async function (knex) {
  await knex.raw('drop index if exists public.resources_one_paper_per_year');
  await knex.raw('alter table public.resources drop constraint if exists resources_paper_complete_check');
  await knex.raw('alter table public.resources drop constraint if exists resources_academic_year_check');
  await knex.raw('alter table public.resources drop constraint if exists resources_paper_kind_check');
  await knex.raw('alter table public.resources drop column if exists academic_year, drop column if exists paper_kind');
};
