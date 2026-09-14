"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ActionState, CreateSiteActionState } from "./actions";

type Option = { id: string; name: string };
type CourseOption = Option & {
  defaultHours: string | null;
  trainingCode: string | null;
};

const steps = [
  "Course",
  "Training Site",
  "Class Details",
  "Reporting",
  "Review",
];

export function ClassCreationWizard({
  action,
  createSiteAction,
  courses,
  sites,
  staff,
  reportingSystems,
  courseReportingDefaults,
  reportingRequirements,
  recentCourseIds,
  recentSiteIds,
  defaultLeadInstructorId,
  canCreateSite,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  createSiteAction: (
    prev: CreateSiteActionState | undefined,
    formData: FormData,
  ) => Promise<CreateSiteActionState>;
  courses: CourseOption[];
  sites: Option[];
  staff: Option[];
  reportingSystems: Option[];
  courseReportingDefaults: Array<{
    courseId: string;
    reportingSystemId: string;
  }>;
  reportingRequirements: Array<{
    reportingSystemId: string;
    kind: string;
    credentialName: string | null;
    studentField: string | null;
    isRequired: boolean;
  }>;
  recentCourseIds: string[];
  recentSiteIds: string[];
  defaultLeadInstructorId: string;
  canCreateSite: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [step, setStep] = useState(0);
  const [courseFilter, setCourseFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [siteOptions, setSiteOptions] = useState(sites);
  const [siteError, setSiteError] = useState<string>();
  const [creatingSite, setCreatingSite] = useState(false);
  const [values, setValues] = useState({
    courseId: "",
    trainingSiteId: "",
    deliveryMethod: "classroom",
    startsAt: "",
    creditedHours: "",
    leadInstructorId: defaultLeadInstructorId,
    reportingSystemIds: [] as string[],
    accessPinEnabled: false,
  });

  const selectedCourse = courses.find(
    (course) => course.id === values.courseId,
  );
  const selectedSite = siteOptions.find(
    (site) => site.id === values.trainingSiteId,
  );
  const selectedInstructor = staff.find(
    (instructor) => instructor.id === values.leadInstructorId,
  );
  const selectedSystems = reportingSystems.filter((system) =>
    values.reportingSystemIds.includes(system.id),
  );
  const requiredInformation = [
    ...new Set(
      reportingRequirements
        .filter(
          (requirement) =>
            requirement.isRequired &&
            values.reportingSystemIds.includes(requirement.reportingSystemId),
        )
        .map((requirement) =>
          requirement.kind === "credential"
            ? requirement.credentialName
            : requirement.studentField,
        )
        .filter((requirement): requirement is string => Boolean(requirement)),
    ),
  ];
  const filteredCourses = courses.filter((course) => {
    const term = courseFilter.toLowerCase();
    return (
      course.name.toLowerCase().includes(term) ||
      course.trainingCode?.toLowerCase().includes(term)
    );
  });
  const filteredSites = siteOptions.filter((site) =>
    site.name.toLowerCase().includes(siteFilter.toLowerCase()),
  );
  const needsSite = values.deliveryMethod !== "online";

  function update<K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function selectCourse(courseId: string) {
    const course = courses.find((item) => item.id === courseId);
    update("courseId", courseId);
    update("creditedHours", course?.defaultHours ?? "");
    update(
      "reportingSystemIds",
      courseReportingDefaults
        .filter((item) => item.courseId === courseId)
        .map((item) => item.reportingSystemId),
    );
  }

  function validateStep() {
    if (step === 0) return Boolean(values.courseId);
    if (step === 1) return !needsSite || Boolean(values.trainingSiteId);
    if (step === 2) {
      return Boolean(
        values.startsAt && values.creditedHours && values.leadInstructorId,
      );
    }
    return true;
  }

  function next() {
    if (validateStep())
      setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function createSite() {
    if (!newSiteName.trim()) return;
    setCreatingSite(true);
    setSiteError(undefined);
    const formData = new FormData();
    formData.set("name", newSiteName);
    formData.set("state", "KY");
    startTransition(async () => {
      const result = await createSiteAction(undefined, formData);
      setCreatingSite(false);
      if (result.site) {
        const site = result.site;
        setSiteOptions((current) =>
          [...current, site].sort((a, b) => a.name.localeCompare(b.name)),
        );
        update("trainingSiteId", site.id);
        setNewSiteName("");
      } else {
        setSiteError(result.error);
      }
    });
  }

  if (state?.classId && state.signInUrl && state.qrDataUrl) {
    return (
      <section className="token-panel" aria-live="polite">
        <h2>Student access</h2>
        <p>Share this short link or QR code when the class is open.</p>
        <a href={state.signInUrl}>{state.signInUrl}</a>
        {state.accessPin ? <p>Student PIN: {state.accessPin}</p> : null}
        <Image
          src={state.qrDataUrl}
          alt="Class sign-in QR code"
          width={240}
          height={240}
          unoptimized
        />
        <Link
          href={`/staff/classes/${state.classId}`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Continue class setup
        </Link>
      </section>
    );
  }

  return (
    <form action={formAction} className="stack-form class-wizard">
      <ol className="class-wizard-steps" aria-label="Class creation progress">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={index <= step ? "is-current" : ""}
          >
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <section className="stack-form">
          <div className="field">
            <Label htmlFor="courseSearch">Search course or training code</Label>
            <Input
              id="courseSearch"
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
            />
          </div>
          <div className="field">
            <Label htmlFor="courseId">Course</Label>
            <select
              id="courseId"
              className="select-input"
              value={values.courseId}
              onChange={(event) => selectCourse(event.target.value)}
              required
            >
              <option value="">Select a course</option>
              {recentCourseIds.length ? (
                <optgroup label="Recently used">
                  {filteredCourses
                    .filter((course) => recentCourseIds.includes(course.id))
                    .map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.trainingCode ? `${course.trainingCode} - ` : ""}
                        {course.name}
                      </option>
                    ))}
                </optgroup>
              ) : null}
              <optgroup label="All courses">
                {filteredCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.trainingCode ? `${course.trainingCode} - ` : ""}
                    {course.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="stack-form">
          <div className="field">
            <Label htmlFor="siteSearch">Search training site</Label>
            <Input
              id="siteSearch"
              value={siteFilter}
              onChange={(event) => setSiteFilter(event.target.value)}
            />
          </div>
          <div className="field">
            <Label htmlFor="trainingSiteId">Training site</Label>
            <select
              id="trainingSiteId"
              className="select-input"
              value={values.trainingSiteId}
              onChange={(event) => update("trainingSiteId", event.target.value)}
              disabled={!needsSite}
              required={needsSite}
            >
              <option value="">
                {needsSite
                  ? "Select a site"
                  : "No site required for online delivery"}
              </option>
              {recentSiteIds.length ? (
                <optgroup label="Recently used">
                  {filteredSites
                    .filter((site) => recentSiteIds.includes(site.id))
                    .map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                </optgroup>
              ) : null}
              <optgroup label="All sites">
                {filteredSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          {canCreateSite ? (
            <div className="inline-form">
              <Label htmlFor="newSiteName">Add a new site</Label>
              <Input
                id="newSiteName"
                value={newSiteName}
                onChange={(event) => setNewSiteName(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={createSite}
                disabled={creatingSite || !newSiteName.trim()}
              >
                {creatingSite ? "Creating site..." : "Add site"}
              </Button>
            </div>
          ) : null}
          {siteError ? (
            <p className="form-error" role="alert">
              {siteError}
            </p>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="form-grid">
          <div className="field">
            <Label htmlFor="startsAt">Date and start time</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={values.startsAt}
              onChange={(event) => update("startsAt", event.target.value)}
              required
            />
          </div>
          <div className="field">
            <Label htmlFor="creditedHours">Scheduled duration (hours)</Label>
            <Input
              id="creditedHours"
              type="number"
              min="0.25"
              step="0.25"
              value={values.creditedHours}
              onChange={(event) => update("creditedHours", event.target.value)}
              required
            />
          </div>
          <div className="field">
            <Label htmlFor="deliveryMethod">Delivery method</Label>
            <select
              id="deliveryMethod"
              className="select-input"
              value={values.deliveryMethod}
              onChange={(event) => update("deliveryMethod", event.target.value)}
            >
              <option value="classroom">Classroom</option>
              <option value="hands_on">Hands-On</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="field">
            <Label htmlFor="leadInstructorId">Lead instructor</Label>
            <select
              id="leadInstructorId"
              className="select-input"
              value={values.leadInstructorId}
              onChange={(event) =>
                update("leadInstructorId", event.target.value)
              }
            >
              {staff.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </div>
          <Label className="checkbox-field field-wide">
            <Input
              type="checkbox"
              checked={values.accessPinEnabled}
              onChange={(event) =>
                update("accessPinEnabled", event.target.checked)
              }
            />
            Require a four-digit student access PIN
          </Label>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="stack-form">
          <fieldset className="field">
            <legend>Reporting systems</legend>
            <div className="checkbox-list">
              {reportingSystems.map((system) => (
                <Label key={system.id} className="checkbox-field">
                  <Input
                    type="checkbox"
                    checked={values.reportingSystemIds.includes(system.id)}
                    onChange={(event) =>
                      update(
                        "reportingSystemIds",
                        event.target.checked
                          ? [
                              ...new Set([
                                ...values.reportingSystemIds,
                                system.id,
                              ]),
                            ]
                          : values.reportingSystemIds.filter(
                              (id) => id !== system.id,
                            ),
                      )
                    }
                  />
                  {system.name}
                </Label>
              ))}
            </div>
          </fieldset>
          <div className="wizard-requirements">
            <h2>Student information required</h2>
            {requiredInformation.length ? (
              <ul>
                {requiredInformation.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            ) : (
              <p>No additional reporting requirements are selected.</p>
            )}
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="wizard-review">
          <h2>Review class</h2>
          <dl>
            <dt>Course</dt>
            <dd>{selectedCourse?.name}</dd>
            <dt>Training site</dt>
            <dd>{selectedSite?.name ?? "Online"}</dd>
            <dt>Schedule</dt>
            <dd>
              {values.startsAt} for {values.creditedHours} hours
            </dd>
            <dt>Delivery</dt>
            <dd>{values.deliveryMethod.replace("_", " ")}</dd>
            <dt>Lead instructor</dt>
            <dd>{selectedInstructor?.name}</dd>
            <dt>Reporting</dt>
            <dd>
              {selectedSystems.map((system) => system.name).join(", ") ||
                "None selected"}
            </dd>
          </dl>
        </section>
      ) : null}

      <input type="hidden" name="courseId" value={values.courseId} />
      <input
        type="hidden"
        name="trainingSiteId"
        value={values.trainingSiteId}
      />
      <input
        type="hidden"
        name="deliveryMethod"
        value={values.deliveryMethod}
      />
      <input type="hidden" name="startsAt" value={values.startsAt} />
      <input type="hidden" name="creditedHours" value={values.creditedHours} />
      <input
        type="hidden"
        name="leadInstructorId"
        value={values.leadInstructorId}
      />
      {values.accessPinEnabled ? (
        <input type="hidden" name="accessPinEnabled" value="on" />
      ) : null}
      {values.reportingSystemIds.map((id) => (
        <input key={id} type="hidden" name="reportingSystemIds" value={id} />
      ))}
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="class-wizard-actions">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((current) => current - 1)}
          >
            Back
          </Button>
        ) : null}
        {step < steps.length - 1 ? (
          <Button type="button" onClick={next} disabled={!validateStep()}>
            Next
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Creating class..." : "Create class"}
          </Button>
        )}
      </div>
    </form>
  );
}
