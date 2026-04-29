/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // TABLE
  await knex.schema.createTable('resources', (table) => {
    table.bigIncrements('id').primary();

    table.timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable();

    table.timestamp('updated_at', { useTz: true })
      .defaultTo(knex.fn.now());

    table.text('name').notNullable();
    table.text('description');

    table.text('public_access_url').notNullable();

    // legacy
    table.text('uploaded_by').notNullable();

    // safer FK
    table.bigInteger('uploaded_by_user_id')
      .unsigned()
      .references('id')
      .inTable('Users');

    table.bigInteger('unit_id')
      .unsigned()
      .references('id')
      .inTable('units')
      .onDelete('SET NULL');

    table.bigInteger('department_id')
      .unsigned()
      .references('id')
      .inTable('departments')
      .onDelete('SET NULL');

    table.bigInteger('school_id')
      .unsigned()
      .references('id')
      .inTable('schools')
      .onDelete('SET NULL');

    table.bigInteger('resource_type_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('resource_types');

    table.foreign('uploaded_by')
      .references('email')
      .inTable('Users');
  });

  // INDEXES (optimized for RLS + joins)
  await knex.schema.alterTable('resources', (table) => {
    table.index('unit_id');
    table.index('department_id');
    table.index('school_id');
    table.index('resource_type_id');
  });

  await knex.raw(`
    CREATE INDEX idx_units_lookup
    ON units (id, department_id, year_of_study, semester_of_study);
  `);

  await knex.raw(`
    CREATE INDEX idx_subscriptions_lookup
    ON subscriptions (user_uuid, department_id, year_of_study, semester_of_study, end_date);
  `);

  // ENABLE RLS
  await knex.raw(`
    ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
  `);

  // OPTIMIZED POLICY (JOIN instead of nested EXISTS)
  await knex.raw(`
    CREATE POLICY "Allow subscribed users to access resources"
    ON resources
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM subscriptions s
        JOIN units u
          ON u.id = resources.unit_id
         AND u.department_id = s.department_id
         AND u.year_of_study = s.year_of_study
         AND u.semester_of_study = s.semester_of_study
        WHERE
          s.user_uuid = (auth.uid())::text
          AND s.end_date > now()
      )
      OR (
        resources.unit_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM subscriptions s
          WHERE
            s.user_uuid = (auth.uid())::text
            AND s.department_id = resources.department_id
            AND s.end_date > now()
        )
      )
    );
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('resources');
};
