"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildWizardSteps,
  DESTINATION_CODES,
} from "@/modules/classes/destination-steps";
import {
  parseDepartmentDateTime,
  roundDepartmentDateTimeToQuarterHour,
} from "@/modules/classes/time";

import type {
  ActionState,
  CreateAgencyActionState,
  CreateSiteActionState,
} from "./actions";

type Option = { id: string; name: string };
type CourseOption = Option & {
  defaultHours: string | null;
  trainingCode: string | null;
};
type ReportingSystemOption = Option & { code: string };

export function ClassCreationWizard({
  action,
  createSiteAction,
  createAgencyAction,
  courses,
  sites,
  agencies,
  staff,
  reportingSystems,
  reportingRequirements,
  recentCourseIds,
  recentSiteIds,
  defaultLeadInstructorId,
  canCreateSite,
  canCreateAgency,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  createSiteAction: (
    prev: CreateSiteActionState | undefined,
    formData: FormData,
  ) => Promise<CreateSiteActionState>;
  createAgencyAction: (
    prev: CreateAgencyActionState | undefined,
    formData: FormData,
  ) => Promise<CreateAgencyActionState>;
  courses: CourseOption[];
  sites: Option[];
  agencies: Option[];
  staff: Option[];
  reportingSystems: ReportingSystemOption[];
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
  canCreateAgency: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [step, setStep] = useState(0);
  const [courseFilter, setCourseFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [siteOptions, setSiteOptions] = useState(sites);
  const [siteError, setSiteError] = useState<string>();
  const [creatingSite, setCreatingSite] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [agencyOptions, setAgencyOptions] = useState(agencies);
  const [agencyError, setAgencyError] = useState<string>();
  const [creatingAgency, setCreatingAgency] = useState(false);
  const [values, setValues] = useState({
    courseId: "",
    trainingSiteId: "",
    hostAgencyId: "",
    deliveryMethod: "classroom",
    startsAt: roundDepartmentDateTimeToQuarterHour(new Date()),
    creditedHours: "",
    leadInstructorId: defaultLeadInstructorId,
    reportingSystemIds: [] as string[],
    accessPinEnabled: false,
    objectives: "",
    mtuEquipmentUsed: "",
    mtuMileage: "",
    mtuUsedSupplies: "",
  });

  const destinationSystems = DESTINATION_CODES.map((code) =>
    reportingSystems.find((system) => system.code === code),
  ).filter((system): system is ReportingSystemOption => Boolean(system));

  const selectedCodes = destinationSystems
    .filter((system) => values.reportingSystemIds.includes(system.id))
    .map((system) => system.code);

  const steps = buildWizardSteps(selectedCodes);
  const activeStep = Math.min(step, steps.length - 1);
  const currentKey = steps[activeStep]?.key ?? "destinations";

  const selectedCourse = courses.find(
    (course) => course.id === values.courseId,
  );
  const selectedSite = siteOptions.find(
    (site) => site.id === values.trainingSiteId,
  );
  const selectedAgency = agencyOptions.find(
    (agency) => agency.id === values.hostAgencyId,
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

  function toggleDestination(systemId: string, selected: boolean) {
    update(
      "reportingSystemIds",
      selected
        ? [...new Set([...values.reportingSystemIds, systemId])]
        : values.reportingSystemIds.filter((id) => id !== systemId),
    );
  }

  function selectCourse(courseId: string) {
    const course = courses.find((item) => item.id === courseId);
    update("courseId", courseId);
    update("creditedHours", course?.defaultHours ?? "");
    // Destinations are chosen on the first step and are not overridden by a
    // course's default reporting systems.
  }

  function validateStep(key: string) {
    if (key === "destinations") return values.reportingSystemIds.length > 0;
    if (key === "class") {
      return Boolean(
        values.courseId &&
          (!needsSite || values.trainingSiteId) &&
          values.startsAt &&
          values.creditedHours &&
          values.leadInstructorId &&
          values.hostAgencyId,
      );
    }
    return true;
  }

  function next() {
    if (validateStep(currentKey)) {
      setStep(Math.min(activeStep + 1, steps.length - 1));
    }
  }

  function back() {
    setStep(Math.max(activeStep - 1, 0));
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

  function createAgency() {
    if (!newAgencyName.trim()) return;
    setCreatingAgency(true);
    setAgencyError(undefined);
    const formData = new FormData();
    formData.set("name", newAgencyName);
    startTransition(async () => {
      const result = await createAgencyAction(undefined, formData);
      setCreatingAgency(false);
      if (result.agency) {
        const agency = result.agency;
        setAgencyOptions((current) =>
          [...current, agency].sort((a, b) => a.name.localeCompare(b.name)),
        );
        update("hostAgencyId", agency.id);
        setNewAgencyName("");
      } else {
        setAgencyError(result.error);
      }
    });
  }

  if (state?.classId && state.signInUrl && state.qrDataUrl) {
    return (
      <section className="token-panel" aria-live="polite">
        <h2>Class is open</h2>
        <p>
          Share this short link or QR code with students when you are ready.
        </p>
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
          Go to class
        </Link>
      </section>
    );
  }

  return (
    <form action={formAction} className="stack-form class-wizard">
      <ol className="class-wizard-steps" aria-label="Class creation progress">
        {steps.map((item, index) => (
          <li
            key={item.key}
            aria-current={index === activeStep ? "step" : undefined}
            className={index <= activeStep ? "is-current" : ""}
          >
            <span>{index + 1}</span>
            {item.label}
          </li>
        ))}
      </ol>

      {currentKey === "destinations" ? (
        <section className="stack-form">
          <fieldset className="field">
            <legend>Report this class to</legend>
            <div className="checkbox-list">
              {destinationSystems.map((system) => (
                <Label key={system.id} className="checkbox-field">
                  <Input
                    type="checkbox"
                    checked={values.reportingSystemIds.includes(system.id)}
                    onChange={(event) =>
                      toggleDestination(system.id, event.target.checked)
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

      {currentKey === "fire" ? (
        <section className="stack-form">
          <h2>Fire reporting</h2>
          <p className="text-muted-foreground">
            The Kentucky Fire Commission in-house training roster (KFS-1A) will
            be generated from this class once its roster is finalized.
          </p>
        </section>
      ) : null}

      {currentKey === "kbems" ? (
        <section className="stack-form">
          <h2>KBEMS reporting</h2>
          <div className="field">
            <Label htmlFor="objectives">Course description or objectives</Label>
            <textarea
              id="objectives"
              className="search-input"
              rows={4}
              value={values.objectives}
              onChange={(event) => update("objectives", event.target.value)}
            />
          </div>
        </section>
      ) : null}

      {currentKey === "mtu" ? (
        <section className="stack-form">
          <h2>Mobile Training Unit usage</h2>
          <div className="field">
            <Label htmlFor="mtuEquipmentUsed">Equipment used</Label>
            <textarea
              id="mtuEquipmentUsed"
              className="search-input"
              rows={2}
              value={values.mtuEquipmentUsed}
              onChange={(event) =>
                update("mtuEquipmentUsed", event.target.value)
              }
            />
          </div>
          <div className="field">
            <Label htmlFor="mtuMileage">Mileage</Label>
            <Input
              id="mtuMileage"
              value={values.mtuMileage}
              onChange={(event) => update("mtuMileage", event.target.value)}
            />
          </div>
          <div className="field">
            <Label htmlFor="mtuUsedSupplies">Used supplies</Label>
            <textarea
              id="mtuUsedSupplies"
              className="search-input"
              rows={2}
              value={values.mtuUsedSupplies}
              onChange={(event) =>
                update("mtuUsedSupplies", event.target.value)
              }
            />
          </div>
        </section>
      ) : null}

      {currentKey === "class" ? (
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
          {needsSite ? (
            <>
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
                  onChange={(event) =>
                    update("trainingSiteId", event.target.value)
                  }
                  required
                >
                  <option value="">Select a site</option>
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
            </>
          ) : null}
          <div className="field">
            <Label htmlFor="hostAgencyId">Host agency</Label>
            <select
              id="hostAgencyId"
              className="select-input"
              value={values.hostAgencyId}
              onChange={(event) => update("hostAgencyId", event.target.value)}
              required
            >
              <option value="">Select the reporting host agency</option>
              {agencyOptions.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </div>
          {canCreateAgency ? (
            <div className="inline-form">
              <Label htmlFor="newAgencyName">Add a new agency</Label>
              <Input
                id="newAgencyName"
                value={newAgencyName}
                onChange={(event) => setNewAgencyName(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={createAgency}
                disabled={creatingAgency || !newAgencyName.trim()}
              >
                {creatingAgency ? "Creating agency..." : "Add agency"}
              </Button>
            </div>
          ) : null}
          {agencyError ? (
            <p className="form-error" role="alert">
              {agencyError}
            </p>
          ) : null}
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="startsAt">Date and start time</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                step="900"
                value={values.startsAt}
                onChange={(event) => update("startsAt", event.target.value)}
                onBlur={(event) =>
                  update(
                    "startsAt",
                    event.target.value
                      ? roundDepartmentDateTimeToQuarterHour(
                          parseDepartmentDateTime(event.target.value),
                        )
                      : "",
                  )
                }
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
                onChange={(event) =>
                  update("creditedHours", event.target.value)
                }
                required
              />
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
          </div>
        </section>
      ) : null}

      {currentKey === "review" ? (
        <section className="wizard-review">
          <h2>Review class</h2>
          <dl>
            <dt>Reported to</dt>
            <dd>
              {selectedSystems.map((system) => system.name).join(", ") ||
                "None selected"}
            </dd>
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
            <dt>Host agency</dt>
            <dd>{selectedAgency?.name ?? "Not selected"}</dd>
            <dt>Lead instructor</dt>
            <dd>{selectedInstructor?.name}</dd>
            {selectedCodes.includes("kbems") ? (
              <>
                <dt>Course objectives</dt>
                <dd>{values.objectives || "Not provided"}</dd>
              </>
            ) : null}
            {selectedCodes.includes("mtu") ? (
              <>
                <dt>MTU equipment used</dt>
                <dd>{values.mtuEquipmentUsed || "Not provided"}</dd>
                <dt>MTU mileage</dt>
                <dd>{values.mtuMileage || "Not provided"}</dd>
                <dt>MTU used supplies</dt>
                <dd>{values.mtuUsedSupplies || "Not provided"}</dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      <input type="hidden" name="courseId" value={values.courseId} />
      <input
        type="hidden"
        name="trainingSiteId"
        value={values.trainingSiteId}
      />
      <input type="hidden" name="hostAgencyId" value={values.hostAgencyId} />
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
      {selectedCodes.includes("kbems") ? (
        <input type="hidden" name="objectives" value={values.objectives} />
      ) : null}
      {selectedCodes.includes("mtu") ? (
        <>
          <input
            type="hidden"
            name="mtuEquipmentUsed"
            value={values.mtuEquipmentUsed}
          />
          <input type="hidden" name="mtuMileage" value={values.mtuMileage} />
          <input
            type="hidden"
            name="mtuUsedSupplies"
            value={values.mtuUsedSupplies}
          />
        </>
      ) : null}
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="class-wizard-actions">
        {activeStep > 0 ? (
          <Button type="button" variant="outline" onClick={back}>
            Back
          </Button>
        ) : null}
        {activeStep < steps.length - 1 ? (
          <Button
            key="wizard-next"
            type="button"
            onClick={next}
            disabled={!validateStep(currentKey)}
          >
            Next
          </Button>
        ) : (
          <Button key="wizard-submit" type="submit" disabled={pending}>
            {pending ? "Creating class..." : "Create & open"}
          </Button>
        )}
      </div>
    </form>
  );
}
