-- Revision Access Point: model answers saved in the database, as immutable versions pinned per student.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project. Safe to re-run.
--
--   paper_answers  every generation of a paper's answers, as a numbered version (v1, v2, ...). A saved version is never
--                  edited or deleted, so what a student is reading cannot change under them. Version 1 is the default
--                  that new readers get.
--   user_answers   which version each student is on (their "pin"), and how many times they have regenerated.
--
-- Both tables are written only by the generate-answers edge function (service role). Students can read their own pin.

begin;

create table if not exists public.paper_answers (
  id           bigint generated always as identity primary key,
  resource_id  bigint not null references public.resources(id) on delete cascade,
  version      integer not null,
  content      jsonb not null,
  is_default   boolean not null default false,
  generated_by uuid,
  created_at   timestamptz not null default now(),
  unique (resource_id, version)
);

-- At most one default per paper.
create unique index if not exists paper_answers_one_default on public.paper_answers (resource_id) where is_default;

-- Versions are immutable: only the default flag may change (an admin can promote a better version).
create or replace function public.paper_answers_immutable() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'saved answers cannot be deleted'; end if;
  if new.content is distinct from old.content or new.version <> old.version or new.resource_id <> old.resource_id then
    raise exception 'saved answers cannot be edited; generate a new version instead';
  end if;
  return new;
end $$;

drop trigger if exists paper_answers_immutable on public.paper_answers;
create trigger paper_answers_immutable before update or delete on public.paper_answers
  for each row execute function public.paper_answers_immutable();

create table if not exists public.user_answers (
  user_uuid     uuid not null,
  resource_id   bigint not null references public.resources(id) on delete cascade,
  answers_id    bigint not null references public.paper_answers(id),
  regenerations integer not null default 0,
  pinned_at     timestamptz not null default now(),
  primary key (user_uuid, resource_id)
);

alter table public.paper_answers enable row level security;
alter table public.user_answers enable row level security;

drop policy if exists "students read their own pin" on public.user_answers;
create policy "students read their own pin" on public.user_answers for select using (user_uuid = auth.uid());
-- No other policies: everything else goes through the edge function.

-- Adds the next version of a paper's answers. The first version of a paper becomes its default. The advisory lock makes two
-- simultaneous generations get different version numbers.
create or replace function public.add_paper_answers(p_resource bigint, p_content jsonb, p_user uuid)
returns table (id bigint, version integer, is_default boolean)
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  perform pg_advisory_xact_lock(p_resource);
  select coalesce(max(pa.version), 0) + 1 into v from public.paper_answers pa where pa.resource_id = p_resource;
  return query
    insert into public.paper_answers (resource_id, version, content, is_default, generated_by)
    values (p_resource, v, p_content, v = 1, p_user)
    returning paper_answers.id, paper_answers.version, paper_answers.is_default;
end $$;

revoke all on function public.add_paper_answers(bigint, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.add_paper_answers(bigint, jsonb, uuid) to service_role;

-- To make a better version the default for new readers (existing students stay on the version they have):
--   update public.paper_answers set is_default = false where resource_id = <resource> and is_default;
--   update public.paper_answers set is_default = true  where resource_id = <resource> and version = <n>;

commit;
