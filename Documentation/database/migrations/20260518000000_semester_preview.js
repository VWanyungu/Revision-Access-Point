/**
 * Lets a signed-in user see what a semester contains BEFORE paying.
 * The resources table is protected by RLS (subscribers only), so the pay screen
 * cannot count files directly. This function returns counts only, never file URLs.
 *
 * resource_type_id: 1 notes, 2 exams, 3 cats, 4 tutorials (papers = exams + cats).
 */
exports.up = async function (knex) {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION public.semester_preview(
      p_department_id bigint,
      p_year smallint,
      p_semester smallint
    )
    RETURNS TABLE (
      unit_id bigint,
      code text,
      name text,
      notes bigint,
      papers bigint,
      tutorials bigint
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT
        u.id,
        u.code,
        u.name,
        COUNT(r.id) FILTER (WHERE r.resource_type_id = 1),
        COUNT(r.id) FILTER (WHERE r.resource_type_id IN (2, 3)),
        COUNT(r.id) FILTER (WHERE r.resource_type_id = 4)
      FROM units u
      LEFT JOIN resources r ON r.unit_id = u.id
      WHERE u.department_id = p_department_id
        AND u.year_of_study = p_year
        AND u.semester_of_study = p_semester
      GROUP BY u.id, u.code, u.name
      ORDER BY u.code;
    $$;
  `);
  await knex.raw(`REVOKE ALL ON FUNCTION public.semester_preview(bigint, smallint, smallint) FROM PUBLIC;`);
  await knex.raw(`GRANT EXECUTE ON FUNCTION public.semester_preview(bigint, smallint, smallint) TO authenticated;`);
};

exports.down = async function (knex) {
  await knex.raw(`DROP FUNCTION IF EXISTS public.semester_preview(bigint, smallint, smallint);`);
};
