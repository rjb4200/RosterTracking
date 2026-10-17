import "server-only";

import { sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import type { ActivitySourceRow } from "./ce-activity";
import type { StudentTranscriptSourceRow } from "./ce-transcript";
import { type ReportPeriod, validateReportPeriod } from "./period";

/** The student's active attendance in in-period, non-cancelled classes. */
export function studentTranscriptQuery(
  period: ReportPeriod,
  studentId: string,
) {
  validateReportPeriod(period);
  return sql`
    with scoped as (
      select c.id, c.name, c.ems_category_id,
        schedule.class_date, schedule.first_title,
        exists (
          select 1 from class_reporting_systems crs
          join reporting_systems rs on rs.id = crs.reporting_system_id
          where crs.class_id = c.id and rs.code = 'kbems'
        ) as reports_to_kbems,
        (
          select fr.id from finalization_revisions fr
          where fr.class_id = c.id
          order by fr.revision_number desc
          limit 1
        ) as revision_id
      from classes c
      join lateral (
        select min(cc.starts_at) as class_date,
          (array_agg(coalesce(cc.class_name, cc.title)
            order by cc.position, cc.id))[1] as first_title
        from class_components cc
        where cc.class_id = c.id
      ) schedule on true
      where c.status <> 'cancelled'
    )
    select s.id as "classId",
      coalesce(nullif(btrim(s.name), ''), s.first_title, 'Untitled class') as "course",
      s.class_date as "classDate",
      tc.title as "emsCategoryName",
      s.reports_to_kbems as "reportsToKbems",
      s.revision_id as "revisionId",
      a.id as "attendanceId",
      a.credited_hours::float8 as "creditedHours"
    from attendance a
    join scoped s on s.id = a.class_id
    left join training_codes tc on tc.id = s.ems_category_id
    where a.student_id = ${studentId}
      and a.removed_at is null
      and s.class_date >= ${period.from.toISOString()}::timestamptz
      and s.class_date < ${period.to.toISOString()}::timestamptz
    order by s.class_date, s.id
  `;
}

export async function queryStudentTranscript(
  db: Database,
  period: ReportPeriod,
  studentId: string,
): Promise<StudentTranscriptSourceRow[]> {
  const result = await db.execute(studentTranscriptQuery(period, studentId));
  return result.rows as unknown as StudentTranscriptSourceRow[];
}

/** Classes the selected agency's people attended within the period. */
export function agencyActivityQuery(period: ReportPeriod, agencyId: string) {
  validateReportPeriod(period);
  return sql`
    with scoped as (
      select c.id, c.name, c.ems_category_id,
        (select min(cc.starts_at) from class_components cc
          where cc.class_id = c.id) as class_date,
        (select coalesce(sum(cc.credited_hours), 0)::float8
          from class_components cc where cc.class_id = c.id) as class_hours,
        exists (
          select 1 from class_reporting_systems crs
          join reporting_systems rs on rs.id = crs.reporting_system_id
          where crs.class_id = c.id and rs.code = 'kbems'
        ) as reports_to_kbems
      from classes c
      where c.status <> 'cancelled'
    )
    select s.id as "classId",
      coalesce(nullif(btrim(s.name), ''), 'Untitled class') as "course",
      s.class_date as "classDate",
      tc.title as "emsCategoryName",
      s.reports_to_kbems as "reportsToKbems",
      s.class_hours as "classHours",
      (
        select coalesce(jsonb_agg(
          concat_ws(' ', coalesce(st.first_name, gu.first_name),
            coalesce(st.last_name, gu.last_name))
          order by coalesce(st.last_name, gu.last_name),
            coalesce(st.first_name, gu.first_name)), '[]'::jsonb)
        from attendance a
        left join students st on st.id = a.student_id
        left join class_guests gu on gu.id = a.guest_id and gu.class_id = a.class_id
        where a.class_id = s.id and a.removed_at is null
          and a.agency_id = ${agencyId}
      ) as "attendees"
    from scoped s
    left join training_codes tc on tc.id = s.ems_category_id
    where s.class_date >= ${period.from.toISOString()}::timestamptz
      and s.class_date < ${period.to.toISOString()}::timestamptz
      and exists (
        select 1 from attendance a2
        where a2.class_id = s.id and a2.removed_at is null
          and a2.agency_id = ${agencyId}
      )
    order by s.class_date, s.id
  `;
}

export async function queryAgencyActivity(
  db: Database,
  period: ReportPeriod,
  agencyId: string,
): Promise<ActivitySourceRow[]> {
  const result = await db.execute(agencyActivityQuery(period, agencyId));
  return result.rows as unknown as ActivitySourceRow[];
}

/** Classes held at the selected training site within the period. */
export function siteActivityQuery(period: ReportPeriod, siteId: string) {
  validateReportPeriod(period);
  return sql`
    with scoped as (
      select c.id, c.name, c.ems_category_id,
        (select min(cc.starts_at) from class_components cc
          where cc.class_id = c.id) as class_date,
        (select coalesce(sum(cc.credited_hours), 0)::float8
          from class_components cc where cc.class_id = c.id) as class_hours,
        exists (
          select 1 from class_reporting_systems crs
          join reporting_systems rs on rs.id = crs.reporting_system_id
          where crs.class_id = c.id and rs.code = 'kbems'
        ) as reports_to_kbems
      from classes c
      where c.status <> 'cancelled'
        and c.training_site_id = ${siteId}
    )
    select s.id as "classId",
      coalesce(nullif(btrim(s.name), ''), 'Untitled class') as "course",
      s.class_date as "classDate",
      tc.title as "emsCategoryName",
      s.reports_to_kbems as "reportsToKbems",
      s.class_hours as "classHours",
      (
        select coalesce(jsonb_agg(
          concat_ws(' ', coalesce(st.first_name, gu.first_name),
            coalesce(st.last_name, gu.last_name))
          order by coalesce(st.last_name, gu.last_name),
            coalesce(st.first_name, gu.first_name)), '[]'::jsonb)
        from attendance a
        left join students st on st.id = a.student_id
        left join class_guests gu on gu.id = a.guest_id and gu.class_id = a.class_id
        where a.class_id = s.id and a.removed_at is null
      ) as "attendees"
    from scoped s
    left join training_codes tc on tc.id = s.ems_category_id
    where s.class_date >= ${period.from.toISOString()}::timestamptz
      and s.class_date < ${period.to.toISOString()}::timestamptz
      and exists (
        select 1 from attendance a3
        where a3.class_id = s.id and a3.removed_at is null
      )
    order by s.class_date, s.id
  `;
}

export async function querySiteActivity(
  db: Database,
  period: ReportPeriod,
  siteId: string,
): Promise<ActivitySourceRow[]> {
  const result = await db.execute(siteActivityQuery(period, siteId));
  return result.rows as unknown as ActivitySourceRow[];
}
