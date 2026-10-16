import "server-only";

import { sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import type { ReportClass } from "./mtu-summary";
import { type ReportPeriod, validateReportPeriod } from "./period";

export function mtuSummaryQuery(period: ReportPeriod) {
  validateReportPeriod(period);
  // Each one-to-many relation is aggregated independently. One statement also
  // gives every section the same PostgreSQL snapshot without join fanout.
  return sql`
    with scoped as (
      select c.*, schedule.components
      from classes c
      join lateral (
        select min(cc.starts_at) as class_date,
          jsonb_agg(jsonb_build_object(
            'startsAt', cc.starts_at, 'creditedHours', cc.credited_hours::float8,
            'title', coalesce(cc.class_name, cc.title), 'trainingCode', tc.code
          ) order by cc.starts_at, cc.position, cc.id) as components
        from class_components cc
        left join training_codes tc on tc.id = cc.training_code_id
        where cc.class_id = c.id
      ) schedule on true
      where c.status <> 'cancelled'
        and schedule.class_date >= ${period.from.toISOString()}::timestamptz
        and schedule.class_date < ${period.to.toISOString()}::timestamptz
        and exists (select 1 from class_reporting_systems crs
          join reporting_systems rs on rs.id = crs.reporting_system_id
          where crs.class_id = c.id and rs.code = 'mtu')
        and exists (select 1 from attendance a where a.class_id = c.id and a.removed_at is null)
    )
    select c.id, c.name, c.status, true as "mtuSelected",
      c.training_site_id as "siteId", ts.name as "siteName",
      nullif(concat_ws(', ', ts.address, ts.city, ts.state, ts.zip), '') as "siteAddress",
      host.name as "hostAgency", c.course_number as "courseNumber", c.components,
      (select count(*)::int from class_instructors ci where ci.class_id = c.id) as "instructorCount",
      (select jsonb_agg(jsonb_build_object(
        'attendanceId', a.id, 'name', concat_ws(' ', coalesce(s.first_name, g.first_name), coalesce(s.last_name, g.last_name)),
        'studentNumber', s.student_number, 'agency', agency.name,
        'guest', a.guest_id is not null, 'removedAt', null
      ) order by a.id)
      from attendance a
      left join students s on s.id = a.student_id
      left join class_guests g on g.id = a.guest_id and g.class_id = a.class_id
      join agencies agency on agency.id = a.agency_id
      where a.class_id = c.id and a.removed_at is null) as students,
      coalesce((select jsonb_agg(jsonb_build_object(
        'itemId', i.id, 'kind', i.kind, 'name', i.name, 'unitLabel', i.unit_label,
        'quantity', u.quantity::float8, 'mileage', u.mileage::float8, 'source', u.source,
        'perClassQty', i.per_class_qty::float8, 'perStudentQty', i.per_student_qty::float8,
        'rounding', i.rounding
      ) order by i.kind, i.sort_order, i.id)
      from class_mtu_usage_items u join mtu_catalog_items i on i.id = u.item_id
      where u.class_id = c.id), '[]'::jsonb) as items,
      usage.equipment_used as "equipmentUsed", usage.mileage,
      usage.used_supplies as "usedSupplies"
    from scoped c
    left join training_sites ts on ts.id = c.training_site_id
    join agencies host on host.id = c.host_agency_id
    left join mtu_usage usage on usage.class_id = c.id
    order by c.id
  `;
}

export async function queryMtuSummary(
  db: Database,
  period: ReportPeriod,
): Promise<ReportClass[]> {
  const result = await db.execute(mtuSummaryQuery(period));
  return result.rows as unknown as ReportClass[];
}
