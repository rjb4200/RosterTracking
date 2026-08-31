import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCredentialDisplay } from "@/modules/reference/masking";
import {
  getStudent,
  listAgencies,
  listCredentialTypes,
} from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import {
  setMembershipAction,
  setStudentActiveAction,
  updateStudentAction,
  upsertCredentialAction,
} from "../actions";
import { CredentialForm } from "../credential-form";
import { StudentForm } from "../student-form";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.STUDENTS_MANAGE);
  const { id } = await params;
  const db = getDatabase();

  const [student, agencies, credentialTypes] = await Promise.all([
    getStudent(db, id),
    listAgencies(db, ""),
    listCredentialTypes(db),
  ]);

  if (!student) {
    notFound();
  }

  const availableAgencies = agencies.filter(
    (agency) =>
      !student.memberships.some((m) => m.agencyId === agency.id && m.isActive),
  );

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">
            {student.firstName} {student.lastName}
          </h1>
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/students"
            className={buttonVariants({ variant: "outline" })}
          >
            Back
          </Link>
          <form action={setStudentActiveAction}>
            <input type="hidden" name="id" value={student.id} />
            <input
              type="hidden"
              name="isActive"
              value={student.isActive ? "false" : "true"}
            />
            <Button
              type="submit"
              variant={student.isActive ? "destructive" : "secondary"}
            >
              {student.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </form>
        </div>
      </div>

      <section className="admin-section">
        <h2>Profile</h2>
        <StudentForm
          action={updateStudentAction}
          values={{
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            phone: student.phone,
            email: student.email ?? "",
            studentNumber: student.studentNumber ?? "",
          }}
          submitLabel="Save changes"
        />
      </section>

      <section className="admin-section">
        <h2>Agencies</h2>
        {student.memberships.length === 0 ? (
          <p className="text-muted-foreground">No agency memberships.</p>
        ) : (
          <ul className="member-list">
            {student.memberships.map((membership) => (
              <li key={membership.agencyId} className="member-row">
                <span>{membership.agencyName}</span>
                <span className="member-badges">
                  {membership.isPrimary ? <Badge>Primary</Badge> : null}
                  {membership.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </span>
                <span className="member-actions">
                  <form action={setMembershipAction}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input
                      type="hidden"
                      name="agencyId"
                      value={membership.agencyId}
                    />
                    <input
                      type="hidden"
                      name="isPrimary"
                      value={membership.isPrimary ? "false" : "true"}
                    />
                    <input
                      type="hidden"
                      name="isActive"
                      value={membership.isActive ? "true" : "false"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {membership.isPrimary ? "Unset primary" : "Make primary"}
                    </Button>
                  </form>
                  <form action={setMembershipAction}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input
                      type="hidden"
                      name="agencyId"
                      value={membership.agencyId}
                    />
                    <input
                      type="hidden"
                      name="isPrimary"
                      value={membership.isPrimary ? "true" : "false"}
                    />
                    <input
                      type="hidden"
                      name="isActive"
                      value={membership.isActive ? "false" : "true"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {membership.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}

        {availableAgencies.length > 0 ? (
          <form action={setMembershipAction} className="inline-form">
            <input type="hidden" name="studentId" value={student.id} />
            <input type="hidden" name="isPrimary" value="false" />
            <input type="hidden" name="isActive" value="true" />
            <select
              name="agencyId"
              className="select-input"
              defaultValue={availableAgencies.at(0)?.id}
            >
              {availableAgencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Add agency
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground">
            All agencies are already assigned.
          </p>
        )}
      </section>

      <section className="admin-section">
        <h2>Credentials</h2>
        {student.credentials.length === 0 ? (
          <p className="text-muted-foreground">No credentials recorded.</p>
        ) : (
          <ul className="member-list">
            {student.credentials.map((credential) => (
              <li key={credential.id} className="member-row">
                <span>{credential.credentialTypeName}</span>
                <Badge variant="secondary">
                  {formatCredentialDisplay(credential.maskedSuffix)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <CredentialForm
          studentId={student.id}
          types={credentialTypes.map((type) => ({
            id: type.id,
            name: type.name,
          }))}
          action={upsertCredentialAction}
        />
      </section>
    </main>
  );
}
