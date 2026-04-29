/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  await knex('schools').del();
 
  await knex('schools').insert([
    {
      id: 1,
      name: 'School of Computing and Informatics',
      code: 'SCI',
      admin_id: null,
      created_at: '2026-01-13 12:43:19.156401+00',
      updated_at: '2026-01-13 12:43:19.156401+00',
    },
    {
      id: 3,
      name: 'School of Engineering and Built Environment',
      code: 'SEBE',
      admin_id: null,
      created_at: '2026-01-17 11:18:11.186325+00',
      updated_at: '2026-01-17 11:18:11.186325+00',
    },
    {
      id: 4,
      name: 'School of Medicine',
      code: 'SOM',
      admin_id: null,
      created_at: '2026-04-03 07:31:39.934258+00',
      updated_at: '2026-04-03 07:31:39.934258+00',
    },
  ]);
};
