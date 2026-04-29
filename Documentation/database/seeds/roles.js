/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  await knex('roles').del();
 
  await knex('roles').insert([
    {
      id: 1,
      name: 'admin',
      description: 'admin',
      created_at: '2026-01-13 16:29:57.704683+00',
    },
  ]);
};
