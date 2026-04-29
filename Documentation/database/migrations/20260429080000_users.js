/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    table.string('name').notNullable();
    table.text('email').notNullable().unique();
    table.string('password').notNullable();

    table.text('role').defaultTo('user');
    table.text('uuid');
  });

  await knex.raw(`
    ALTER TABLE "Users"
    ADD CONSTRAINT users_uuid_format
    CHECK (uuid IS NULL OR uuid ~* '^[0-9a-fA-F-]{36}$')
  `);

  await knex.schema.alterTable('Users', (table) => {
    table.index('uuid', 'idx_users_uuid');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('Users');
};
