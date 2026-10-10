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
  estimateSupplyQuantity,
  type MtuConsumptionRule,
} from "@/modules/classes/mtu";
import {
  parseDepartmentDateTime,
  roundDepartmentDateTimeToQuarterHour,
} from "@/modules/classes/time";
import {
  type WizardValidationInput,
  wizardStepErrors,
} from "@/modules/classes/wizard-validation";

import type {
  ActionState,
  CreateAgencyActionState,
  CreateSiteActionState,
} from "./actions";
import {
  type CurriculumChapterOption,
  FireSubjectRow,
  type FireSubjectValue,
  newFireSubject,
} from "./fire-subject-fields";
import type { MtuCatalogOption } from "./mtu-usage-fields";
import { SearchSelect, type SearchSelectOption } from "./search-select";

type Option = { id: string; name: string };
type ReportingSystemOption = Option & { code: string };

export function ClassCreationWizard({
  action,
  createSiteAction,
  createAgencyAction,
  sites,
  agencies,
  staff,
  reportingSystems,
  reportingRequirements,
  trainingCodes,
  curricula,
  curriculumChapters,
  mtuCatalog = [],
  recentSiteIds,
  recentCurriculumIds,
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
  trainingCodes: Array<{ id: string; code: string; title: string }>;
  curricula: Array<{
    id: string;
    publisher: string;
    programTitle: string;
    version: string | null;
  }>;
  curriculumChapters: CurriculumChapterOption[];
  mtuCatalog?: MtuCatalogOption[];
  recentSiteIds: string[];
  recentCurriculumIds: string[];
  defaultLeadInstructorId: string;
  canCreateSite: boolean;
  canCreateAgency: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [step, setStep] = useState(0);
  const [newSiteName, setNewSiteName] = useState("");
  const [siteOptions, setSiteOptions] = useState(sites);
  const [siteError, setSiteError] = useState<string>();
  const [creatingSite, setCreatingSite] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [agencyOptions, setAgencyOptions] = useState(agencies);
  const [agencyError, setAgencyError] = useState<string>();
  const [creatingAgency, setCreatingAgency] = useState(false);
  const [values, setValues] = useState({
    className: "",
    kbemsCourseName: "",
    trainingSiteId: "",
    hostAgencyId: "",
    deliveryMethod: "classroom",
    startsAt: roundDepartmentDateTimeToQuarterHour(new Date()),
    creditedHours: "2",
    leadInstructorId: defaultLeadInstructorId,
    reportingSystemIds: [] as string[],
    accessPinEnabled: false,
    objectives: "",
    courseType: "",
    courseNumber: "",
    mtuEquipmentUsed: "",
    mtuMileage: "",
    mtuUsedSupplies: "",
    mtuEquipmentIds: [] as string[],
    mtuSupplyQuantities: {} as Record<string, string>,
  });
  const [subjects, setSubjects] = useState<FireSubjectValue[]>(() => [
    newFireSubject(),
  ]);

  const curriculaWithChapters = new Set(
    curriculumChapters.map((chapter) => chapter.curriculumId),
  );

  const destinationSystems = DESTINATION_CODES.map((code) =>
    reportingSystems.find((system) => system.code === code),
  ).filter((system): system is ReportingSystemOption => Boolean(system));

  const selectedCodes = destinationSystems
    .filter((system) => values.reportingSystemIds.includes(system.id))
    .map((system) => system.code);

  const steps = buildWizardSteps(selectedCodes);
  const activeStep = Math.min(step, steps.length - 1);
  const currentKey = steps[activeStep]?.key ?? "destinations";

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
  const siteSearchOptions: SearchSelectOption[] = [
    ...siteOptions
      .filter((site) => recentSiteIds.includes(site.id))
      .map((site) => ({
        value: site.id,
        label: site.name,
        group: "Recently used",
      })),
    ...siteOptions.map((site) => ({
      value: site.id,
      label: site.name,
      group: "All sites",
    })),
  ];
  const needsSite = values.deliveryMethod !== "online";
  const needsClassName =
    !selectedCodes.includes("fire") && !selectedCodes.includes("kbems");
  const resolvedClassName = selectedCodes.includes("kbems")
    ? values.kbemsCourseName
    : needsClassName
      ? values.className
      : (subjects[0]?.className ?? "");

  function update<K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function mtuRule(option: MtuCatalogOption): MtuConsumptionRule {
    return {
      perClassQty:
        option.perClassQty === null ? null : Number(option.perClassQty),
      perStudentQty:
        option.perStudentQty === null ? null : Number(option.perStudentQty),
      rounding:
        option.rounding === "ceil" || option.rounding === "exact"
          ? option.rounding
          : null,
    };
  }

  function toggleDestination(systemId: string, selected: boolean) {
    update(
      "reportingSystemIds",
      selected
        ? [...new Set([...values.reportingSystemIds, systemId])]
        : values.reportingSystemIds.filter((id) => id !== systemId),
    );
  }

  function updateSubject(index: number, next: FireSubjectValue) {
    setSubjects((current) =>
      current.map((value, i) => (i === index ? next : value)),
    );
  }

  function addSubject() {
    setSubjects((current) =>
      current.length < 2 ? [...current, newFireSubject()] : current,
    );
  }

  function removeSubject(index: number) {
    setSubjects((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current,
    );
  }

  const [attempted, setAttempted] = useState(false);
  const validationInput: WizardValidationInput = {
    reportingSystemIds: values.reportingSystemIds,
    needsClassName,
    className: values.className,
    needsSite,
    trainingSiteId: values.trainingSiteId,
    startsAt: values.startsAt,
    creditedHours: values.creditedHours,
    leadInstructorId: values.leadInstructorId,
    hostAgencyId: values.hostAgencyId,
    kbemsCourseName: values.kbemsCourseName,
    courseType: values.courseType,
    objectives: values.objectives,
    courseNumber: values.courseNumber,
    subjects,
    curriculaWithChapters,
  };
  const errors = attempted ? wizardStepErrors(currentKey, validationInput) : [];

  function next() {
    if (wizardStepErrors(currentKey, validationInput).length === 0) {
      setAttempted(false);
      setStep(Math.min(activeStep + 1, steps.length - 1));
    } else {
      setAttempted(true);
    }
  }

  function back() {
    setAttempted(false);
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

      {["destinations", "fire", "kbems", "class"].includes(currentKey) ? (
        <p className="required-legend">* Required</p>
      ) : null}

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
            Each subject becomes a row on the Kentucky Fire Commission KFS-1A
            roster. A second subject is scheduled after the first.
          </p>
          {subjects.map((subject, index) => (
            <FireSubjectRow
              key={subject.id}
              index={index}
              value={subject}
              trainingCodes={trainingCodes}
              curricula={curricula}
              curriculumChapters={curriculumChapters}
              recentCurriculumIds={recentCurriculumIds}
              errors={errors}
              onChange={(next) => updateSubject(index, next)}
              onRemove={() => removeSubject(index)}
              canRemove={subjects.length > 1}
            />
          ))}
          {subjects.length < 2 ? (
            <Button type="button" variant="outline" onClick={addSubject}>
              Add second subject
            </Button>
          ) : null}
        </section>
      ) : null}

      {currentKey === "kbems" ? (
        <section className="stack-form">
          <h2>KBEMS reporting</h2>
          <div className="field">
            <Label htmlFor="kbemsCourseName">
              EMS course name
              <span className="required-mark" aria-hidden="true">
                {" "}
                *
              </span>
            </Label>
            <Input
              id="kbemsCourseName"
              value={values.kbemsCourseName}
              onChange={(event) =>
                update("kbemsCourseName", event.target.value)
              }
              aria-invalid={errors.includes("kbemsCourseName") || undefined}
              required
            />
          </div>
          <div className="field">
            <Label htmlFor="courseType">
              Course type
              <span className="required-mark" aria-hidden="true">
                {" "}
                *
              </span>
            </Label>
            <select
              id="courseType"
              className="select-input"
              value={values.courseType}
              onChange={(event) => update("courseType", event.target.value)}
              aria-invalid={errors.includes("courseType") || undefined}
              required
            >
              <option value="">Select a course type</option>
              <option value="continuing_education">Continuing education</option>
              <option value="initial_certification">
                Initial certification
              </option>
              <option value="refresher">Refresher</option>
            </select>
          </div>
          {values.courseType === "initial_certification" ? (
            <div className="field">
              <Label htmlFor="courseNumber">
                Course number
                <span className="required-mark" aria-hidden="true">
                  {" "}
                  *
                </span>
              </Label>
              <Input
                id="courseNumber"
                value={values.courseNumber}
                onChange={(event) => update("courseNumber", event.target.value)}
                aria-invalid={errors.includes("courseNumber") || undefined}
                required
              />
            </div>
          ) : null}
          <div className="field">
            <Label htmlFor="objectives">
              Course description or objectives
              <span className="required-mark" aria-hidden="true">
                {" "}
                *
              </span>
            </Label>
            <textarea
              id="objectives"
              className="search-input"
              rows={4}
              value={values.objectives}
              onChange={(event) => update("objectives", event.target.value)}
              aria-invalid={errors.includes("objectives") || undefined}
              required
            />
          </div>
        </section>
      ) : null}

      {currentKey === "mtu" ? (
        <section className="stack-form">
          <h2>Mobile Training Unit usage</h2>
          {mtuCatalog.filter((option) => option.kind === "equipment").length >
          0 ? (
            <fieldset className="field field-wide">
              <legend>Equipment used</legend>
              <div className="checkbox-list">
                {mtuCatalog
                  .filter((option) => option.kind === "equipment")
                  .map((option) => (
                    <Label key={option.id} className="checkbox-field">
                      <Input
                        type="checkbox"
                        name="mtuEquipmentIds"
                        value={option.id}
                        checked={values.mtuEquipmentIds.includes(option.id)}
                        onChange={(event) =>
                          update(
                            "mtuEquipmentIds",
                            event.target.checked
                              ? [
                                  ...new Set([
                                    ...values.mtuEquipmentIds,
                                    option.id,
                                  ]),
                                ]
                              : values.mtuEquipmentIds.filter(
                                  (id) => id !== option.id,
                                ),
                          )
                        }
                      />
                      {option.name}
                    </Label>
                  ))}
              </div>
            </fieldset>
          ) : null}
          {mtuCatalog.filter((option) => option.kind === "supplies").length >
          0 ? (
            <fieldset className="field field-wide">
              <legend>Supplies used</legend>
              <div className="mtu-supply-list">
                {mtuCatalog
                  .filter((option) => option.kind === "supplies")
                  .map((option) => {
                    const included = option.id in values.mtuSupplyQuantities;
                    const suggestion = estimateSupplyQuantity(
                      mtuRule(option),
                      0,
                    );
                    return (
                      <div key={option.id} className="mtu-supply-row">
                        <Label className="checkbox-field">
                          <Input
                            type="checkbox"
                            name="mtuSupplyIds"
                            value={option.id}
                            checked={included}
                            onChange={(event) =>
                              setValues((current) => {
                                const next = {
                                  ...current.mtuSupplyQuantities,
                                };
                                if (event.target.checked) {
                                  next[option.id] = String(suggestion);
                                } else {
                                  delete next[option.id];
                                }
                                return {
                                  ...current,
                                  mtuSupplyQuantities: next,
                                };
                              })
                            }
                          />
                          {option.name}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="search-input mtu-supply-qty"
                          name={`mtuSupplyQty:${option.id}`}
                          value={
                            values.mtuSupplyQuantities[option.id] ??
                            String(suggestion)
                          }
                          onChange={(event) =>
                            setValues((current) => ({
                              ...current,
                              mtuSupplyQuantities: {
                                ...current.mtuSupplyQuantities,
                                [option.id]: event.target.value,
                              },
                            }))
                          }
                        />
                        <span className="text-muted-foreground">
                          {option.unitLabel ?? ""}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </fieldset>
          ) : null}
          <div className="field">
            <Label htmlFor="mtuEquipmentUsed">
              Other equipment (not listed)
            </Label>
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
            <Label htmlFor="mtuUsedSupplies">Other supplies (not listed)</Label>
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
          {needsClassName ? (
            <div className="field">
              <Label htmlFor="className">
                Class name
                <span className="required-mark" aria-hidden="true">
                  {" "}
                  *
                </span>
              </Label>
              <Input
                id="className"
                value={values.className}
                onChange={(event) => update("className", event.target.value)}
                aria-invalid={errors.includes("className") || undefined}
                required
              />
            </div>
          ) : null}
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
              <SearchSelect
                id="trainingSiteId"
                label="Training site"
                placeholder="Search training sites…"
                emptyLabel="Select a site"
                required
                invalid={errors.includes("trainingSiteId")}
                options={siteSearchOptions}
                value={values.trainingSiteId}
                onChange={(nextId) => update("trainingSiteId", nextId)}
              />
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
            <Label htmlFor="hostAgencyId">
              Host agency
              <span className="required-mark" aria-hidden="true">
                {" "}
                *
              </span>
            </Label>
            <select
              id="hostAgencyId"
              className="select-input"
              value={values.hostAgencyId}
              onChange={(event) => update("hostAgencyId", event.target.value)}
              aria-invalid={errors.includes("hostAgencyId") || undefined}
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
              <Label htmlFor="startsAt">
                Date and start time
                <span className="required-mark" aria-hidden="true">
                  {" "}
                  *
                </span>
              </Label>
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
                aria-invalid={errors.includes("startsAt") || undefined}
                required
              />
            </div>
            <div className="field">
              <Label htmlFor="creditedHours">
                Scheduled duration (hours)
                <span className="required-mark" aria-hidden="true">
                  {" "}
                  *
                </span>
              </Label>
              <Input
                id="creditedHours"
                type="number"
                min="0.25"
                step="0.25"
                value={values.creditedHours}
                onChange={(event) =>
                  update("creditedHours", event.target.value)
                }
                aria-invalid={errors.includes("creditedHours") || undefined}
                required
              />
            </div>
            <div className="field">
              <Label htmlFor="leadInstructorId">
                Lead instructor
                <span className="required-mark" aria-hidden="true">
                  {" "}
                  *
                </span>
              </Label>
              <select
                id="leadInstructorId"
                className="select-input"
                value={values.leadInstructorId}
                onChange={(event) =>
                  update("leadInstructorId", event.target.value)
                }
                aria-invalid={errors.includes("leadInstructorId") || undefined}
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
            <dt>Class name</dt>
            <dd>{resolvedClassName || "Not provided"}</dd>
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
            {selectedCodes.includes("fire") ? (
              <>
                <dt>Fire subjects</dt>
                <dd>
                  {subjects
                    .map((subject) => subject.className)
                    .filter(Boolean)
                    .join(", ") || "Not provided"}
                </dd>
              </>
            ) : null}
            {selectedCodes.includes("kbems") ? (
              <>
                <dt>Course type</dt>
                <dd>{values.courseType.replace("_", " ") || "Not provided"}</dd>
                <dt>Course number</dt>
                <dd>{values.courseNumber || "Not provided"}</dd>
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

      <input type="hidden" name="name" value={resolvedClassName} />
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
      {selectedCodes.includes("fire")
        ? subjects.flatMap((subject) => [
            <input
              key={`${subject.id}-code`}
              type="hidden"
              name="fireTrainingCodeId"
              value={subject.trainingCodeId}
            />,
            <input
              key={`${subject.id}-name`}
              type="hidden"
              name="fireClassName"
              value={subject.className}
            />,
            <input
              key={`${subject.id}-curriculum`}
              type="hidden"
              name="fireCurriculumId"
              value={subject.curriculumId}
            />,
            <input
              key={`${subject.id}-curriculum-name`}
              type="hidden"
              name="fireCurriculumName"
              value={subject.curriculumName}
            />,
            <input
              key={`${subject.id}-chapter`}
              type="hidden"
              name="fireCurriculumChapter"
              value={subject.curriculumChapter}
            />,
            <input
              key={`${subject.id}-lesson`}
              type="hidden"
              name="fireLessonPlan"
              value={subject.lessonPlan}
            />,
          ])
        : null}
      {selectedCodes.includes("kbems") ? (
        <>
          <input type="hidden" name="objectives" value={values.objectives} />
          <input type="hidden" name="courseType" value={values.courseType} />
          {values.courseType === "initial_certification" ? (
            <input
              type="hidden"
              name="courseNumber"
              value={values.courseNumber}
            />
          ) : null}
        </>
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
      {attempted && errors.length > 0 ? (
        <p className="form-error" role="alert">
          Complete the highlighted fields.
        </p>
      ) : null}
      <div className="class-wizard-actions">
        {activeStep > 0 ? (
          <Button type="button" variant="outline" onClick={back}>
            Back
          </Button>
        ) : null}
        {activeStep < steps.length - 1 ? (
          <Button key="wizard-next" type="button" onClick={next}>
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
