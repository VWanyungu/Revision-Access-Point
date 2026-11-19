-- Revision Access Point: optional cover photo for a resource (e.g. a book cover), uploaded from the admin app.
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project. Safe to re-run.
alter table public.resources add column if not exists cover_url text;
