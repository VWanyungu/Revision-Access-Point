/**
 * Two tiers: access (read and view) and the AI add-on. Adds ai_access to passes and the add-on columns to pending payments.
 * The AI part of a payment goes 100% to the platform; the course admin's 70% applies to the access part only.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // SQL-BEGIN
  await knex.raw(String.raw`
-- Revision Access Point: two tiers. Access (read and view) and the AI add-on (answers, quizzes, forecasts, practice papers, marking).
-- Run once in the Supabase SQL editor of the REVISION ACCESS POINT project, after revenue_split.sql. Safe to re-run.
--
--   subscriptions.ai_access      true when the pass includes the AI add-on. Passes that exist today keep AI until they end
--                                (they were sold with it); new passes default to access only.
--   subscriptions.ai_amount      the part of the amount paid that was for the AI add-on.
--   pending_payments.kind        'pass' (a new semester pass, optionally with AI) or 'ai_upgrade' (AI added to a pass the
--                                student already holds, for the rest of its term).
--   pending_payments.ai          whether this payment includes the AI add-on.
--   pending_payments.ai_amount   its AI part.
--
-- The prices are NOT here. They are the Supabase secrets PRICE_ACCESS and PRICE_AI, read by the payment functions, so the
-- amount charged never comes from the browser.
--
-- Revenue split: the course admin's 70% applies to the access part only. The AI add-on costs the platform money to run, so
-- 100% of it goes to the platform. (Change the two lines marked SPLIT if you want it shared.)

begin;

alter table public.subscriptions
  add column if not exists ai_access boolean not null default true,   -- existing passes keep AI
  add column if not exists ai_amount numeric(10,2) not null default 0;
alter table public.subscriptions alter column ai_access set default false;   -- new passes: access only unless AI is bought

alter table public.pending_payments
  add column if not exists kind      text not null default 'pass',
  add column if not exists ai        boolean not null default false,
  add column if not exists ai_amount numeric(10,2) not null default 0;

alter table public.pending_payments drop constraint if exists pending_payments_kind_check;
alter table public.pending_payments add constraint pending_payments_kind_check check (kind in ('pass', 'ai_upgrade'));

-- The callback records 'completed' and 'paid_subscription_failed'; the original check only allowed pending/success/failed.
alter table public.pending_payments drop constraint if exists pending_payments_status_check;
alter table public.pending_payments add constraint pending_payments_status_check
  check (status in ('pending', 'success', 'completed', 'failed', 'paid_subscription_failed'));

-- Split on insert. The callback now writes the amount (and its AI part) on the pass itself; the lookup is only a fallback.
create or replace function public.split_subscription() returns trigger language plpgsql as $$
declare amt numeric; ai_amt numeric; access_amt numeric;
begin
  ai_amt := coalesce(new.ai_amount, 0);
  amt := coalesce(new.amount, (
    select pp.amount from public.pending_payments pp
    where pp.user_uuid::text = new.user_uuid::text
      and pp.department_id = new.department_id
      and pp.year_of_study = new.year_of_study
      and pp.semester_of_study = new.semester_of_study
      and pp.status in ('pending', 'success', 'completed')
    order by pp.created_at desc limit 1));
  if amt is not null then
    access_amt      := amt - ai_amt;
    new.amount      := amt;
    new.app_share   := round(access_amt * 0.30, 2) + ai_amt;      -- SPLIT: platform keeps 30% of access plus all of AI
    new.admin_share := access_amt - round(access_amt * 0.30, 2);  -- SPLIT: course admin gets 70% of access only
  end if;
  return new;
end $$;

commit;

  `);
  // SQL-END
};

exports.down = async function (knex) {
  await knex.raw('alter table public.pending_payments drop constraint if exists pending_payments_kind_check');
  await knex.raw('alter table public.pending_payments drop column if exists kind, drop column if exists ai, drop column if exists ai_amount');
  await knex.raw('alter table public.subscriptions drop column if exists ai_access, drop column if exists ai_amount');
};
