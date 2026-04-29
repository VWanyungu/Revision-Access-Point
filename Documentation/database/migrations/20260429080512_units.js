/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('units', (table) => {
    table.bigIncrements('id').primary();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    table.text('name');
    table.text('code');
    table.integer('admin_id');

    table.bigInteger('department_id')
      .unsigned()
      .references('id')
      .inTable('departments')
      .onDelete('CASCADE');

    table.smallint('year_of_study').notNullable();
    table.smallint('semester_of_study').notNullable();
  });

  await knex.raw(`
    ALTER TABLE units
    ADD CONSTRAINT valid_year CHECK (year_of_study BETWEEN 1 AND 7)
  `);

  await knex.raw(`
    ALTER TABLE units
    ADD CONSTRAINT valid_semester CHECK (semester_of_study BETWEEN 1 AND 3)
  `);

  await knex.raw(`
    ALTER TABLE units
    ADD CONSTRAINT unique_unit_per_department
    UNIQUE (department_id, code)
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('units');
};
