import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { getStaffProfile } from "@/modules/staff-auth/profiles";
import { getDatabase } from "@/server/db/client";

import { updateOwnProfileAction } from "./actions";
import { ProfileForm } from "./profile-form";

export default async function StaffProfilePage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/staff/login");
  const profile = await getStaffProfile(getDatabase(), staff.id);
  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="staff-title">Instructor profile</h1>
        </div>
      </div>
      <p>
        These details print on official rosters and completion certificates.
        Keep them current.
      </p>
      <ProfileForm
        idPrefix="own-profile"
        heading="Credential details"
        action={updateOwnProfileAction}
        values={profile}
      />
    </main>
  );
}
