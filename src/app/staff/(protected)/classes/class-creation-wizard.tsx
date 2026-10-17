"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildWizardSteps,
  DESTINATION_CODES,
} from "@/modules/classes/destination-steps";
import {
  isInitialCertNumberValid,
  normalizeInitialCertNumber,
} from "@/modules/classes/initial-cert-code";
import {
  parseDepartmentDateTime,
  roundDepartmentDateTimeToQuarterHour,
} from "@/modules/classes/time";
import {
  type WizardValidationInput,
  wizardStepErrors,
} from "@/modules/classes/wizard-validation";

import { AgencyForm } from "../agencies/agency-form";
import { SiteForm } from "../sites/site-form";

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
import { InitialCertNumberField } from "./initial-cert-number-field";
import {
  emptyMtuUsageValue,
  type MtuCatalogOption,
  MtuUsageFields,
} from "./mtu-usage-fields";
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
  inclusionRules,
  trainingCodes,
  agencyTags,
  curricula,
  curriculumChapters,
  mtuCatalog = [],
  recentSiteIds,
  recentCurriculumIds,
  defaultTeiNumber,
  recentInitialCertNumbers,
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
  inclusionRules: Array<{
    reportingSystemId: string;
    inclusionMode: string;
    credentialName: string | null;
    credentialCode: string | null;
  }>;
  trainingCodes: Array<{
    id: string;
    code: string;
    title: string;
    kind: string;
    isPinned: boolean;
    mapsToId: string | null;
  }>;
  agencyTags: Array<{ id: string; code: string; name: string }>;
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
  defaultTeiNumber: string;
  recentInitialCertNumbers: string[];
  defaultLeadInstructorId: string;
  canCreateSite: boolean;
  canCreateAgency: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [step, setStep] = useState(0);
  const [siteOptions, setSiteOptions] = useState(sites);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [agencyOptions, setAgencyOptions] = useState(agencies);
  const [agencyDialogOpen, setAgencyDialogOpen] = useState(false);
  const [values, setValues] = useState({
    className: "",
    kbemsCourseName: "",
    emsCategoryId: "",
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
    mtuUsage: emptyMtuUsageValue(),
  });
  const [subjects, setSubjects] = useState<FireSubjectValue[]>(() => [
    newFireSubject(),
  ]);
  const [courseNumberTouched, setCourseNumberTouched] = useState(false);
  const [emsCategoryTouched, setEmsCategoryTouched] = useState(false);
  const [courseNumberAckOpen, setCourseNumberAckOpen] = useState(false);

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
  const inclusionDescriptions = selectedSystems.map((system) => {
    const rule = inclusionRules.find(
      (entry) => entry.reportingSystemId === system.id,
    );
    if (rule?.inclusionMode === "credential") {
      const format = rule.credentialCode === "ffn" ? " (0000-0000)" : "";
      return `${system.name}: only attendees with a valid ${rule.credentialName ?? "credential"}${format} appear on this roster.`;
    }
    if (rule?.inclusionMode === "none") {
      return `${system.name}: resource reporting only; no attendee roster.`;
    }
    if (rule?.inclusionMode === "all") {
      return `${system.name}: all attendees are included.`;
    }
    return `${system.name}: inclusion policy unavailable.`;
  });
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
  // MTU now requires Fire or KBEMS, so every class has a destination-derived
  // name; the entered-name fallback is no longer reachable.
  const needsClassName = false;
  const resolvedClassName = selectedCodes.includes("kbems")
    ? values.kbemsCourseName
    : needsClassName
      ? values.className
      : (subjects[0]?.className ?? "");
  const mileageRequiredTransportIds = mtuCatalog
    .filter(
      (option) =>
        option.requiresMileage === true &&
        values.mtuUsage.transportIds.includes(option.id),
    )
    .map((option) => option.id);

  function update<K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const fireSelected = selectedCodes.includes("fire");
  const kbemsSelected = selectedCodes.includes("kbems");
  const firstFireTrainingCodeId = subjects[0]?.trainingCodeId ?? "";
  const fireCategories = trainingCodes.filter(
    (category) => category.kind === "fire",
  );
  const emsCategories = trainingCodes.filter(
    (category) => category.kind === "ems",
  );
  const emsCategoryOptions: SearchSelectOption[] = emsCategories.map(
    (category) => ({
      value: category.id,
      label: category.title,
      group: category.isPinned ? "Pinned" : "All categories",
    }),
  );
  const selectedEmsCategory = emsCategories.find(
    (category) => category.id === values.emsCategoryId,
  );

  // A dual Fire + KBEMS class pre-fills the EMS category from the first Fire
  // subject's mapped category while the field is untouched; a manual choice is
  // never overwritten.
  useEffect(() => {
    if (!fireSelected || !kbemsSelected) return;
    if (emsCategoryTouched) return;
    const mappedId = trainingCodes.find(
      (category) => category.id === firstFireTrainingCodeId,
    )?.mapsToId;
    if (!mappedId) return;
    const mapped = trainingCodes.find((category) => category.id === mappedId);
    setValues((current) =>
      current.emsCategoryId === mappedId
        ? current
        : {
            ...current,
            emsCategoryId: mappedId,
            kbemsCourseName: mapped ? mapped.title : current.kbemsCourseName,
          },
    );
  }, [
    fireSelected,
    kbemsSelected,
    firstFireTrainingCodeId,
    emsCategoryTouched,
    trainingCodes,
  ]);

  // A dual Fire + KBEMS class carries the Fire training code as its course
  // number. Seed it once from the first Fire subject while the field is
  // untouched; a manual entry (or deliberate clear) is never overwritten.
  // An initial-certification class never carries the Fire training code: it is
  // not seeded, and a value already seeded from the Fire code is cleared.
  useEffect(() => {
    if (!fireSelected || !kbemsSelected) return;
    const code = trainingCodes.find(
      (trainingCode) => trainingCode.id === firstFireTrainingCodeId,
    )?.code;
    if (values.courseType === "initial_certification") {
      if (code && values.courseNumber === code) {
        setValues((current) =>
          current.courseNumber === code
            ? { ...current, courseNumber: "" }
            : current,
        );
      }
      return;
    }
    if (courseNumberTouched) return;
    if (!code) return;
    setValues((current) =>
      current.courseNumber === code
        ? current
        : { ...current, courseNumber: code },
    );
  }, [
    fireSelected,
    kbemsSelected,
    firstFireTrainingCodeId,
    courseNumberTouched,
    trainingCodes,
    values.courseType,
    values.courseNumber,
  ]);

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
    destinationCodes: selectedCodes,
    needsClassName,
    className: values.className,
    needsSite,
    trainingSiteId: values.trainingSiteId,
    startsAt: values.startsAt,
    creditedHours: values.creditedHours,
    leadInstructorId: values.leadInstructorId,
    hostAgencyId: values.hostAgencyId,
    kbemsCourseName: values.kbemsCourseName,
    emsCategoryId: values.emsCategoryId,
    courseType: values.courseType,
    objectives: values.objectives,
    courseNumber: values.courseNumber,
    transportIds: values.mtuUsage.transportIds,
    transportMileage: values.mtuUsage.transportMileage,
    mileageRequiredTransportIds,
    subjects,
    curriculaWithChapters,
  };
  const errors = attempted ? wizardStepErrors(currentKey, validationInput) : [];

  // An initial-certification number that is present but not in the expected
  // shape warns and is acknowledged; its shape never blocks the step.
  const courseNumberShapeMismatch =
    currentKey === "kbems" &&
    values.courseType === "initial_certification" &&
    values.courseNumber.trim() !== "" &&
    !isInitialCertNumberValid(values.courseNumber, defaultTeiNumber);

  function advance() {
    if (values.courseType === "initial_certification") {
      setValues((current) => ({
        ...current,
        courseNumber: normalizeInitialCertNumber(current.courseNumber),
      }));
    }
    setAttempted(false);
    setStep(Math.min(activeStep + 1, steps.length - 1));
  }

  function next() {
    if (wizardStepErrors(currentKey, validationInput).length > 0) {
      setAttempted(true);
      return;
    }
    if (courseNumberShapeMismatch) {
      setCourseNumberAckOpen(true);
      return;
    }
    advance();
  }

  function back() {
    setAttempted(false);
    setStep(Math.max(activeStep - 1, 0));
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
          {selectedCodes.includes("mtu") &&
          !selectedCodes.includes("fire") &&
          !selectedCodes.includes("kbems") ? (
            <p className="form-error" role="alert">
              Select Fire or KBEMS alongside the Mobile Training Unit. The
              Mobile Training Unit records resource usage only and produces no
              attendee roster or completion certificates on its own.
            </p>
          ) : null}
          <div className="wizard-requirements">
            <h2>Reporting inclusion</h2>
            <p>No student credential is required to sign in.</p>
            {inclusionDescriptions.length ? (
              <ul>
                {inclusionDescriptions.map((description) => (
                  <li key={description}>{description}</li>
                ))}
              </ul>
            ) : (
              <p>Select a reporting destination to see its inclusion rules.</p>
            )}
          </div>
        </section>
      ) : null}

      {currentKey === "fire" ? (
        <section className="stack-form">
          <p className="text-muted-foreground">
            Lead and assisting instructors need an FFN in the format 0000-0000
            on their staff profile before they can be assigned to this Fire
            class.
          </p>
          {subjects.map((subject, index) => (
            <FireSubjectRow
              key={subject.id}
              index={index}
              value={subject}
              trainingCodes={fireCategories}
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
          <SearchSelect
            id="emsCategoryId"
            label="Category"
            placeholder="Search EMS categories…"
            emptyLabel="Select an EMS category"
            required
            invalid={errors.includes("emsCategoryId")}
            options={emsCategoryOptions}
            value={values.emsCategoryId}
            onChange={(nextId) => {
              const selected = emsCategories.find(
                (category) => category.id === nextId,
              );
              setEmsCategoryTouched(true);
              update("emsCategoryId", nextId);
              setValues((current) => ({
                ...current,
                emsCategoryId: nextId,
                kbemsCourseName: selected
                  ? selected.title
                  : current.kbemsCourseName,
              }));
            }}
          />
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
            <InitialCertNumberField
              value={values.courseNumber}
              recentNumbers={recentInitialCertNumbers}
              invalid={errors.includes("courseNumber")}
              onChange={(next) => {
                setCourseNumberTouched(true);
                update("courseNumber", next);
              }}
            />
          ) : (
            <div className="field">
              <Label htmlFor="courseNumber">
                Course number
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="courseNumber"
                value={values.courseNumber}
                onChange={(event) => {
                  setCourseNumberTouched(true);
                  update("courseNumber", event.target.value);
                }}
                className="text-muted-foreground"
                aria-invalid={errors.includes("courseNumber") || undefined}
              />
            </div>
          )}
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
          <MtuUsageFields
            catalog={mtuCatalog}
            mode="select"
            value={values.mtuUsage}
            onChange={(next) => update("mtuUsage", next)}
            requireMileage
            invalidMileageIds={values.mtuUsage.transportIds.filter((id) =>
              errors.includes(`mtuTransportMileage:${id}`),
            )}
          />
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSiteDialogOpen(true)}
                >
                  Add a new site
                </Button>
              ) : null}
              <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a training site</DialogTitle>
                    <DialogDescription>
                      Enter the site's details. Only the name is required.
                    </DialogDescription>
                  </DialogHeader>
                  <SiteForm
                    action={createSiteAction}
                    submitLabel="Add site"
                    onCreated={(site) => {
                      setSiteOptions((current) =>
                        current.some((existing) => existing.id === site.id)
                          ? current
                          : [...current, site].sort((a, b) =>
                              a.name.localeCompare(b.name),
                            ),
                      );
                      update("trainingSiteId", site.id);
                      setSiteDialogOpen(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setAgencyDialogOpen(true)}
            >
              Add a new agency
            </Button>
          ) : null}
          <Dialog open={agencyDialogOpen} onOpenChange={setAgencyDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a host agency</DialogTitle>
                <DialogDescription>
                  Enter the agency's details. Only the name is required.
                </DialogDescription>
              </DialogHeader>
              <AgencyForm
                action={createAgencyAction}
                tags={agencyTags}
                submitLabel="Add agency"
                onCreated={(agency) => {
                  setAgencyOptions((current) =>
                    current.some((existing) => existing.id === agency.id)
                      ? current
                      : [...current, agency].sort((a, b) =>
                          a.name.localeCompare(b.name),
                        ),
                  );
                  update("hostAgencyId", agency.id);
                  setAgencyDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
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
            <dt>Student sign-in</dt>
            <dd>
              No credential is required to sign in; every attendee receives a
              certificate.
            </dd>
            <dt>Reporting inclusion</dt>
            <dd>
              <ul>
                {inclusionDescriptions.map((description) => (
                  <li key={description}>{description}</li>
                ))}
              </ul>
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
                <dt>EMS category</dt>
                <dd>{selectedEmsCategory?.title ?? "Not provided"}</dd>
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
                <dd>{values.mtuUsage.equipmentUsed || "Not provided"}</dd>
                {values.mtuUsage.transportIds.map((id) => (
                  <div key={id}>
                    <dt>
                      {mtuCatalog.find((item) => item.id === id)?.name} mileage
                    </dt>
                    <dd>
                      {values.mtuUsage.transportMileage[id] || "Not provided"}
                    </dd>
                  </div>
                ))}
                <dt>Other / legacy mileage (unattributed)</dt>
                <dd>{values.mtuUsage.mileage || "Not provided"}</dd>
                <dt>MTU used supplies</dt>
                <dd>{values.mtuUsage.usedSupplies || "Not provided"}</dd>
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
          <input
            type="hidden"
            name="emsCategoryId"
            value={values.emsCategoryId}
          />
          <input
            type="hidden"
            name="courseNumber"
            value={values.courseNumber}
          />
        </>
      ) : null}
      {selectedCodes.includes("mtu") ? (
        <>
          <input
            type="hidden"
            name="mtuEquipmentUsed"
            value={values.mtuUsage.equipmentUsed}
          />
          <input
            type="hidden"
            name="mtuUsedSupplies"
            value={values.mtuUsage.usedSupplies}
          />
          <input
            type="hidden"
            name="mtuMileage"
            value={values.mtuUsage.mileage}
          />
          {values.mtuUsage.equipmentIds.map((id) => (
            <input
              key={`mtu-eq-${id}`}
              type="hidden"
              name="mtuEquipmentIds"
              value={id}
            />
          ))}
          {values.mtuUsage.transportIds.map((id) => (
            <input
              key={`mtu-tr-${id}`}
              type="hidden"
              name="mtuTransportIds"
              value={id}
            />
          ))}
          {values.mtuUsage.transportIds.map((id) => (
            <input
              key={`mtu-trm-${id}`}
              type="hidden"
              name={`mtuTransportMileage:${id}`}
              value={values.mtuUsage.transportMileage[id] ?? ""}
            />
          ))}
          {Object.keys(values.mtuUsage.supplyQuantities).map((id) => (
            <input
              key={`mtu-sp-${id}`}
              type="hidden"
              name="mtuSupplyIds"
              value={id}
            />
          ))}
          {Object.entries(values.mtuUsage.supplyQuantities).map(
            ([id, quantity]) => (
              <input
                key={`mtu-spq-${id}`}
                type="hidden"
                name={`mtuSupplyQty:${id}`}
                value={quantity}
              />
            ),
          )}
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
      <Dialog open={courseNumberAckOpen} onOpenChange={setCourseNumberAckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check the course number</DialogTitle>
            <DialogDescription>
              {`"${values.courseNumber}" is not in the expected initial-certification format (${defaultTeiNumber}-YY-CC-R|B|A|P). Continue only if this number is correct.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCourseNumberAckOpen(false)}
            >
              Go back
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCourseNumberAckOpen(false);
                advance();
              }}
            >
              Use this number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
