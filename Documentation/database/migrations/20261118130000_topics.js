/**
 * Groups a unit's notes into topics, so the unit page can say "topic complete" once every note in it is read.
 *
 *  - topics:            the syllabus of a unit (title, short description, order).
 *  - resources.topic_id: which topic a note belongs to. Nullable: a note with no topic is shown as its own topic.
 *
 * "Read" is already stored per user in resource_opens (see 20261118120000_study_progress.js);
 * a topic is complete for a user when all of its notes (resource_type_id = 1) have a row there.
 *
 * Filling it in (admin or SQL), for example:
 *   INSERT INTO topics (unit_id, position, title, description) VALUES (12, 5, 'Project scope management', '...');
 *   UPDATE resources SET topic_id = <topic id> WHERE id IN (...);
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('topics', (table) => {
    table.bigIncrements('id').primary();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    table.bigInteger('unit_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('units')
      .onDelete('CASCADE');
    table.smallint('position').notNullable().defaultTo(0);
    table.text('title').notNullable();
    table.text('description');

    table.unique(['unit_id', 'position']);
  });

  await knex.schema.alterTable('resources', (table) => {
    table.bigInteger('topic_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('topics')
      .onDelete('SET NULL');
    table.index('topic_id');
  });

  await knex.raw(`ALTER TABLE topics ENABLE ROW LEVEL SECURITY`);

  // Same rule as resources: only people subscribed to the unit's semester can read its topics.
  await knex.raw(`
    CREATE POLICY "Allow subscribed users to read topics"
    ON topics
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM subscriptions s
        JOIN units u
          ON u.id = topics.unit_id
         AND u.department_id = s.department_id
         AND u.year_of_study = s.year_of_study
         AND u.semester_of_study = s.semester_of_study
        WHERE
          s.user_uuid = (auth.uid())::text
          AND s.end_date > now()
      )
    )
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('resources', (table) => {
    table.dropColumn('topic_id');
  });
  await knex.schema.dropTableIfExists('topics');
};
