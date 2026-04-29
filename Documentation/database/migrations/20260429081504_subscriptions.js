/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('subscriptions', (table) => {
    table.bigIncrements('id').primary();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    table.text('user_uuid').notNullable();

    table.date('start_date').notNullable();
    table.date('end_date').notNullable();

    table.text('payment_ref').notNullable();

    table.bigInteger('department_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('departments');

    table.smallint('year_of_study').notNullable();
    table.smallint('semester_of_study').notNullable();
  });

  await knex.raw(`
    ALTER TABLE subscriptions
    ADD CONSTRAINT unique_subscription
    UNIQUE (user_uuid, department_id, year_of_study, semester_of_study)
  `);

  await knex.schema.alterTable('subscriptions', (table) => {
    table.index('user_uuid');
    table.index('department_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('subscriptions');
};
