"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ActionState } from "./actions";

interface Option {
  id: string;
  name: string;
}

export function ClassForm({
  action,
  courses,
  sites,
  reportingSystems,
  courseReportingDefaults,
  values,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  courses: Option[];
  sites: Option[];
  reportingSystems: Option[];
  courseReportingDefaults: Array<{
    courseId: string;
    reportingSystemId: string;
  }>;
  values?: {
    id: string;
    courseId: string;
    trainingSiteId: string | null;
    deliveryMethod: string;
    reportingSystemIds: string[];
    accessPinEnabled: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [courseId, setCourseId] = useState(values?.courseId ?? "");
  const [reportingSystemIds, setReportingSystemIds] = useState(
    values?.reportingSystemIds ?? [],
  );

  return (
    <form action={formAction} className="stack-form">
      {values ? <input type="hidden" name="classId" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="courseId">Course</Label>
          <select
            id="courseId"
            name="courseId"
            className="select-input"
            value={courseId}
            onChange={(event) => {
              const selectedCourseId = event.target.value;
              setCourseId(selectedCourseId);
              setReportingSystemIds(
                courseReportingDefaults
                  .filter(({ courseId }) => courseId === selectedCourseId)
                  .map(({ reportingSystemId }) => reportingSystemId),
              );
            }}
            required
          >
            <option value="" disabled>
              Select a course
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor="deliveryMethod">Delivery</Label>
          <select
            id="deliveryMethod"
            name="deliveryMethod"
            className="select-input"
            defaultValue={values?.deliveryMethod ?? "in_person"}
          >
            <option value="in_person">In person</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div className="field">
          <Label htmlFor="trainingSiteId">Training site</Label>
          <select
            id="trainingSiteId"
            name="trainingSiteId"
            className="select-input"
            defaultValue={values?.trainingSiteId ?? ""}
          >
            <option value="">No site (virtual only)</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="field field-wide">
          <legend>Reporting systems</legend>
          <div className="checkbox-list">
            {reportingSystems.map((system) => (
              <Label key={system.id} className="checkbox-field">
                <Input
                  type="checkbox"
                  name="reportingSystemIds"
                  value={system.id}
                  checked={reportingSystemIds.includes(system.id)}
                  onChange={(event) =>
                    setReportingSystemIds((current) =>
                      event.target.checked
                        ? [...new Set([...current, system.id])]
                        : current.filter((id) => id !== system.id),
                    )
                  }
                />
                {system.name}
              </Label>
            ))}
          </div>
        </fieldset>
        <Label className="checkbox-field field-wide">
          <Input
            defaultChecked={values?.accessPinEnabled ?? false}
            name="accessPinEnabled"
            type="checkbox"
          />
          Require a four-digit student access PIN
        </Label>
      </div>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : values ? "Save class setup" : "Create draft"}
      </Button>
      {state?.classId ? (
        <section className="token-panel" aria-live="polite">
          <h2>Draft created</h2>
          <p>
            Add at least one session and open the class before student access is
            available.
          </p>
          <Link
            href={`/staff/classes/${state.classId}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Continue class setup
          </Link>
        </section>
      ) : null}
    </form>
  );
}
