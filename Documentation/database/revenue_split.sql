-- Revision Access Point: revenue split. Every semester pass is split 30% to the platform and 70% to the course admin.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project, after institutions.sql. Safe to re-run.
--
-- Course admins are scoped by their auth app_metadata (set server-side, never by the user):
--   update auth.users
--   set raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
--     'role', 'course_admin', 'institution_id', 1, 'course_ids', jsonb_build_array(3, 4))   -- department ids
--   where email = 'lecturer@example.com';

begin;

alter table public.subscriptions
  add column if not exists amount      numeric(10,2),
  add column if not exists app_share   numeric(10,2),
  add column if not exists admin_share numeric(10,2);

-- The amount paid is the successful pending payment for the same student, department, year and semester.
create or replace function public.split_subscription() returns trigger language plpgsql as $$
declare amt numeric;
begin
  amt := coalesce(new.amount, (
    select pp.amount from public.pending_payments pp
    where pp.user_uuid::text = new.user_uuid
      and pp.department_id = new.department_id
      and pp.year_of_study = new.year_of_study
      and pp.semester_of_study = new.semester_of_study
      and pp.status = 'success'
    order by pp.created_at desc limit 1));
  if amt is not null then
    new.amount      := amt;
    new.app_share   := round(amt * 0.30, 2);
    new.admin_share := amt - round(amt * 0.30, 2);
  end if;
  return new;
end $$;

drop trigger if exists split_subscription on public.subscriptions;
create trigger split_subscription before insert on public.subscriptions
  for each row execute function public.split_subscription();

-- Backfill passes that were paid before the split existed.
update public.subscriptions s set
  amount      = pp.amount,
  app_share   = round(pp.amount * 0.30, 2),
  admin_share = pp.amount - round(pp.amount * 0.30, 2)
from (
  select distinct on (user_uuid, department_id, year_of_study, semester_of_study)
         user_uuid::text as user_uuid, department_id, year_of_study, semester_of_study, amount
  from public.pending_payments where status = 'success'
  order by user_uuid, department_id, year_of_study, semester_of_study, created_at desc
) pp
where s.amount is null
  and pp.user_uuid = s.user_uuid and pp.department_id = s.department_id
  and pp.year_of_study = s.year_of_study and pp.semester_of_study = s.semester_of_study;

-- Earnings rows for the admin dashboard. Scoping happens here, from the caller's JWT, so a client cannot widen it:
-- super_admin sees everything, institution_admin their institution, course_admin only their course_ids.
-- Anyone without an admin role (every student) gets nothing. No student details are returned.
create or replace function public.earnings_rows()
returns table (
  subscription_id bigint, created_at timestamptz, department_id bigint, department_name text,
  institution_id bigint, institution_name text, year_of_study smallint, semester_of_study smallint,
  amount numeric, app_share numeric, admin_share numeric
)
language sql stable security definer set search_path = public as $$
  select s.id, s.created_at, s.department_id, d.name, s.institution_id, i.short_name,
         s.year_of_study, s.semester_of_study, s.amount, s.app_share, s.admin_share
  from subscriptions s
  join departments d on d.id = s.department_id
  join institutions i on i.id = s.institution_id
  where s.amount is not null and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or ((auth.jwt() -> 'app_metadata' ->> 'role') = 'institution_admin'
        and s.institution_id = (auth.jwt() -> 'app_metadata' ->> 'institution_id')::bigint)
    or ((auth.jwt() -> 'app_metadata' ->> 'role') = 'course_admin'
        and s.department_id in (select jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'course_ids')::bigint))
  )
  order by s.created_at desc;
$$;

revoke all on function public.earnings_rows() from public, anon;
grant execute on function public.earnings_rows() to authenticated;

commit;
