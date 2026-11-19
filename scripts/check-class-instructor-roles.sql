-- Run read-only on the migration target before applying 0056.
-- Review any rows with multiple non-leads before backfilling the assistant role.
SELECT
  c.id AS class_id,
  c.status,
  COUNT(ci.user_id) FILTER (WHERE ci.is_lead) AS lead_count,
  COUNT(ci.user_id) FILTER (WHERE NOT ci.is_lead) AS non_lead_count
FROM classes c
LEFT JOIN class_instructors ci ON ci.class_id = c.id
GROUP BY c.id, c.status
HAVING COUNT(ci.user_id) FILTER (WHERE ci.is_lead) <> 1
    OR COUNT(ci.user_id) FILTER (WHERE NOT ci.is_lead) > 1
ORDER BY c.status, c.id;
