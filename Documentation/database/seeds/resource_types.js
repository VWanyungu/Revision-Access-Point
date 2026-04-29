/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  await knex('resource_types').del();
 
  await knex('resource_types').insert([
    {
      id: 1,
      name: 'notes',
      description: null,
      created_at: '2026-01-13 12:51:08.433066+00',
      updated_at: '2026-01-13 12:51:08.433066+00',
    },
    {
      id: 2,
      name: 'exams',
      description: null,
      created_at: '2026-01-13 12:51:18.699199+00',
      updated_at: '2026-01-13 12:51:18.699199+00',
    },
    {
      id: 3,
      name: 'cats',
      description: null,
      created_at: '2026-01-13 12:51:27.596268+00',
      updated_at: '2026-01-13 12:51:27.596268+00',
    },
    {
      id: 4,
      name: 'tutorials',
      description: null,
      created_at: '2026-01-13 12:51:40.117187+00',
      updated_at: '2026-01-13 12:51:40.117187+00',
    },
  ]);
};
