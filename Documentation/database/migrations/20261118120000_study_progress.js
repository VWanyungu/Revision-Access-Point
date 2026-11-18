/**
 * Per-user study progress, replacing what the unit page kept in localStorage:
 *  - resource_opens: which resources a user has opened and when (drives "read" ticks and "Continue reading").
 *  - quiz_attempts:  one row per finished quiz (drives best score / attempts on the Prepared quizzes cards).
 *
 * user_uuid is text, like subscriptions.user_uuid. Rows are private: RLS lets a signed-in user
 * read and write only their own.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('resource_opens', (table) => {
    table.text('user_uuid').notNullable();
    table.bigInteger('resource_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('resources')
      .onDelete('CASCADE');
    table.timestamp('first_opened_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('last_opened_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    table.primary(['user_uuid', 'resource_id']);
  });

  await knex.schema.createTable('quiz_attempts', (table) => {
    table.bigIncrements('id').primary();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    table.text('user_uuid').notNullable();
    table.bigInteger('resource_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('resources')
      .onDelete('CASCADE');
    table.smallint('correct').notNullable();
    table.smallint('total').notNullable();
  });

  await knex.raw(`
    ALTER TABLE quiz_attempts
    ADD CONSTRAINT quiz_attempts_score_valid
    CHECK (total > 0 AND correct >= 0 AND correct <= total)
  `);

  await knex.schema.alterTable('quiz_attempts', (table) => {
    table.index(['user_uuid', 'resource_id']);
  });

  for (const t of ['resource_opens', 'quiz_attempts']) {
    await knex.raw(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  }

  await knex.raw(`
    CREATE POLICY "Users read their own opens" ON resource_opens
    FOR SELECT TO authenticated USING (user_uuid = (auth.uid())::text)
  `);
  await knex.raw(`
    CREATE POLICY "Users record their own opens" ON resource_opens
    FOR INSERT TO authenticated WITH CHECK (user_uuid = (auth.uid())::text)
  `);
  await knex.raw(`
    CREATE POLICY "Users update their own opens" ON resource_opens
    FOR UPDATE TO authenticated
    USING (user_uuid = (auth.uid())::text) WITH CHECK (user_uuid = (auth.uid())::text)
  `);

  await knex.raw(`
    CREATE POLICY "Users read their own quiz attempts" ON quiz_attempts
    FOR SELECT TO authenticated USING (user_uuid = (auth.uid())::text)
  `);
  await knex.raw(`
    CREATE POLICY "Users record their own quiz attempts" ON quiz_attempts
    FOR INSERT TO authenticated WITH CHECK (user_uuid = (auth.uid())::text)
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('quiz_attempts');
  await knex.schema.dropTableIfExists('resource_opens');
};
