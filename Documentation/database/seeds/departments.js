/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  await knex('departments').del();
 
  await knex('departments').insert([
    {
      id: 1,
      name: 'Computer Science',
      code: 'BCS',
      admin_id: null,
      school_id: 1,
      created_at: '2026-01-13 12:44:18.983113+00',
      updated_at: '2026-01-13 12:44:18.983113+00',
    },
    {
      id: 3,
      name: 'Information Technology',
      code: 'BIT',
      admin_id: null,
      school_id: 1,
      created_at: '2026-01-17 11:15:03.034264+00',
      updated_at: '2026-01-17 11:15:03.034264+00',
    },
    {
      id: 4,
      name: 'Civil Engineering',
      code: 'CE',
      admin_id: null,
      school_id: 3,
      created_at: '2026-01-17 11:18:49.896802+00',
      updated_at: '2026-01-17 11:18:49.896802+00',
    },
  ]);
};
 