/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('schools', (table) => {
        table.bigIncrements('id').primary();
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

        table.text('name');
        table.text('code');
        table.integer('admin_id');

        table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('schools');
};
