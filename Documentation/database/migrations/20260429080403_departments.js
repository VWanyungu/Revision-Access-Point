/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('departments', (table) => {
    table.bigIncrements('id').primary();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    table.text('name');
    table.text('code');
    table.integer('admin_id');

    table.bigInteger('school_id')
      .unsigned()
      .references('id')
      .inTable('schools')
      .onDelete('CASCADE');

    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE departments
    ADD CONSTRAINT unique_department_per_school
    UNIQUE (school_id, code)
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('departments');
};
