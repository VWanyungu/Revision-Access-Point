/**
 * Optional banner image for a unit, shown behind the unit page title in the student app.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.raw('alter table public.units add column if not exists banner_url text');
};

exports.down = async function (knex) {
  await knex.raw('alter table public.units drop column if exists banner_url');
};
