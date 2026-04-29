/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('pending_payments', (table) => {
    table.bigIncrements('id').primary();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // FIXED (no default)
    table.timestamp('resolved_at', { useTz: true }).nullable();

    table.text('checkout_request_id').notNullable();
    table.text('merchant_request_id').notNullable();

    table.uuid('user_uuid').notNullable();

    table.bigInteger('department_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('departments');

    table.smallint('year_of_study').notNullable();
    table.smallint('semester_of_study').notNullable();

    table.decimal('amount').notNullable();
    table.text('phone_number').notNullable();

    table.text('status').notNullable();

    table.jsonb('callback_payload');
  });

  await knex.raw(`
    ALTER TABLE pending_payments
    ADD CONSTRAINT pending_payments_status_check
    CHECK (status IN ('pending', 'success', 'failed'))
  `);

  await knex.raw(`
    ALTER TABLE pending_payments
    ADD CONSTRAINT amount_positive CHECK (amount > 0)
  `);

  await knex.schema.alterTable('pending_payments', (table) => {
    table.index('user_uuid');
    table.index('department_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('pending_payments');
};
