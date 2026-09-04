"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { type RosterActionState, rosterAction } from "./roster-actions";

type Requirement = {
  studentFields: string[];
  credentials: { id: string; code: string }[];
};
type Agency = { id: string; name: string };

function Fields({ requirements }: { requirements: Requirement }) {
  return (
    <>
      {requirements.studentFields.map((field) => (
        <label className="field" key={field}>
          {field}
          <input className="search-input" name={`field:${field}`} />
        </label>
      ))}
      {requirements.credentials.map((credential) => (
        <label className="field" key={credential.id}>
          {credential.code}
          <input
            className="search-input"
            name={`credential:${credential.id}`}
          />
        </label>
      ))}
    </>
  );
}

function Status({ state }: { state: RosterActionState | undefined }) {
  return (
    <p
      aria-live="polite"
      className={state?.error ? "form-error" : "form-success"}
    >
      {state?.error ?? state?.success}
    </p>
  );
}

export function AddAttendanceForms({
  classId,
  students,
  agencies,
  requirements,
}: {
  classId: string;
  students: { id: string; name: string }[];
  agencies: Agency[];
  requirements: Requirement;
}) {
  const [state, action, pending] = useActionState(rosterAction, undefined);
  return (
    <section className="roster-forms">
      <Status state={state} />
      <form action={action} className="stack-form roster-form">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="operation" value="regular" />
        <h3>Add regular student</h3>
        <label className="field">
          Student
          <select className="select-input" name="studentId" required>
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Represented agency
          <select className="select-input" name="agencyId" required>
            <option value="">Select agency</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>
        <Fields requirements={requirements} />
        <Button type="submit" disabled={pending}>
          Add attendance
        </Button>
      </form>
      <form action={action} className="stack-form roster-form">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="operation" value="guest" />
        <h3>Add class guest</h3>
        <label className="field">
          First name
          <input className="search-input" name="firstName" required />
        </label>
        <label className="field">
          Last name
          <input className="search-input" name="lastName" required />
        </label>
        <label className="field">
          Represented agency
          <select className="select-input" name="agencyId" required>
            <option value="">Select agency</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>
        <Fields requirements={requirements} />
        <Button type="submit" disabled={pending}>
          Add guest attendance
        </Button>
      </form>
    </section>
  );
}

export function AttendanceControls({
  classId,
  attendanceId,
  creditedHours,
  scheduledHours,
}: {
  classId: string;
  attendanceId: string;
  creditedHours: string | null;
  scheduledHours: number;
}) {
  const [state, action, pending] = useActionState(rosterAction, undefined);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="roster-entry-controls">
      <Status state={state} />
      <form action={action} className="inline-form">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="attendanceId" value={attendanceId} />
        <input type="hidden" name="operation" value="credit" />
        <label>
          Credit{" "}
          <input
            className="search-input credit-input"
            name="creditedHours"
            type="number"
            min="0"
            max={scheduledHours}
            step="0.01"
            defaultValue={creditedHours ?? scheduledHours}
            required
          />
        </label>
        <label>
          Reason <input className="search-input" name="reason" />
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>
          Update credit
        </Button>
      </form>
      {confirming ? (
        <form
          action={action}
          className="inline-form roster-removal"
          aria-label="Confirm attendance removal"
        >
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="attendanceId" value={attendanceId} />
          <input type="hidden" name="operation" value="remove" />
          <label>
            Removal reason{" "}
            <input className="search-input" name="reason" required />
          </label>
          <Button type="submit" variant="destructive" disabled={pending}>
            Confirm removal
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirming(true)}
        >
          Remove attendance
        </Button>
      )}
    </div>
  );
}
