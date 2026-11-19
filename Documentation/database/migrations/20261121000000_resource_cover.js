/**
 * Optional cover photo for a resource (e.g. a book cover), uploaded from the admin app.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.raw('alter table public.resources add column if not exists cover_url text');
};

exports.down = async function (knex) {
  await knex.raw('alter table public.resources drop column if exists cover_url');
};
