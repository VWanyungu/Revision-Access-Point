-- Revision Access Point: optional banner image for a unit, uploaded from the admin app and shown behind the unit page title.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project. Safe to re-run.
alter table public.units add column if not exists banner_url text;
