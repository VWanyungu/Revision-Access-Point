-- Revision Access Point: real admin accounts for the admin app's Admins page.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project. Safe to re-run.
--
-- An admin is a normal Supabase auth user whose app_metadata carries a role and scope (set only by these functions
-- or by SQL, never by the user):
--   role            super_admin | institution_admin | school_admin | course_admin
--   institution_id  the institution an institution / school / course admin belongs to
--   school_ids      school_admin: the schools they manage (school ids)
--   course_ids      course_admin: the departments they manage (department ids)
-- The first super admin must be set by hand (the admin app treats an account with no role as a super admin, but the database does not):
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"super_admin"}' where email = 'admin@gmail.com';
--
-- Creating the auth user itself needs the service role, so "Add admin" promotes someone who has already signed up.

begin;

create or replace function public._admin_role() returns text language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

create or replace function public._admin_institution() returns bigint language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'institution_id', '')::bigint
$$;

-- Admins the caller may see: everyone for a super admin, their own institution's (minus super admins) for an institution admin.
create or replace function public.list_admins()
returns table (id uuid, email text, full_name text, role text, institution_id bigint, school_ids jsonb, course_ids jsonb, created_at timestamptz, last_sign_in_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
         u.raw_app_meta_data ->> 'role',
         nullif(u.raw_app_meta_data ->> 'institution_id', '')::bigint,
         coalesce(u.raw_app_meta_data -> 'school_ids', '[]'::jsonb),
         coalesce(u.raw_app_meta_data -> 'course_ids', '[]'::jsonb),
         u.created_at, u.last_sign_in_at
  from auth.users u
  where (u.raw_app_meta_data ->> 'role') in ('super_admin', 'institution_admin', 'school_admin', 'course_admin')
    and (
      public._admin_role() = 'super_admin'
      or (public._admin_role() = 'institution_admin'
          and (u.raw_app_meta_data ->> 'role') <> 'super_admin'
          and nullif(u.raw_app_meta_data ->> 'institution_id', '')::bigint = public._admin_institution())
    )
  order by u.created_at;
$$;

-- Makes an existing user an admin (or changes their role and scope).
-- Super admins can grant any role. Institution admins can only grant school / course admin inside their own institution.
create or replace function public.grant_admin(p_email text, p_role text, p_institution_id bigint default null, p_school_ids bigint[] default '{}', p_course_ids bigint[] default '{}')
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  caller text := public._admin_role();
  inst bigint := p_institution_id;
begin
  if caller not in ('super_admin', 'institution_admin') then raise exception 'not allowed'; end if;
  if p_role not in ('super_admin', 'institution_admin', 'school_admin', 'course_admin') then raise exception 'unknown role'; end if;
  if caller = 'institution_admin' then
    if p_role in ('super_admin', 'institution_admin') then raise exception 'not allowed'; end if;
    inst := public._admin_institution();
  end if;
  if p_role <> 'super_admin' and inst is null then raise exception 'an institution is required'; end if;

  update auth.users set raw_app_meta_data =
    (coalesce(raw_app_meta_data, '{}'::jsonb) - 'role' - 'institution_id' - 'school_ids' - 'course_ids')
    || jsonb_strip_nulls(jsonb_build_object(
         'role', p_role,
         'institution_id', case when p_role = 'super_admin' then null else inst end,
         'school_ids', case when p_role = 'school_admin' then to_jsonb(p_school_ids) else null end,
         'course_ids', case when p_role = 'course_admin' then to_jsonb(p_course_ids) else null end))
  where lower(email) = lower(p_email)
    and (caller = 'super_admin' or coalesce((raw_app_meta_data ->> 'role') <> 'super_admin', true));

  if not found then raise exception 'no account with that email'; end if;
end $$;

-- Removes admin access (the account itself stays). Super admins only, and never your own.
create or replace function public.revoke_admin(p_user uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if public._admin_role() <> 'super_admin' then raise exception 'not allowed'; end if;
  if p_user = auth.uid() then raise exception 'you cannot remove your own admin access'; end if;
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role' - 'institution_id' - 'school_ids' - 'course_ids'
  where id = p_user;
end $$;

revoke all on function public.list_admins(), public.grant_admin(text, text, bigint, bigint[], bigint[]), public.revoke_admin(uuid) from public, anon;
grant execute on function public.list_admins(), public.grant_admin(text, text, bigint, bigint[], bigint[]), public.revoke_admin(uuid) to authenticated;

commit;
