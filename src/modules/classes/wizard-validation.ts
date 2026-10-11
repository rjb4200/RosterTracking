export interface WizardValidationInput {
  reportingSystemIds: string[];
  needsClassName: boolean;
  className: string;
  needsSite: boolean;
  trainingSiteId: string;
  startsAt: string;
  creditedHours: string;
  leadInstructorId: string;
  hostAgencyId: string;
  kbemsCourseName: string;
  courseType: string;
  objectives: string;
  courseNumber: string;
  mtuMileage: string;
  mtuMileageRequired: boolean;
  subjects: ReadonlyArray<{
    trainingCodeId: string;
    className: string;
    curriculumId: string;
    curriculumChapter: string;
  }>;
  curriculaWithChapters: ReadonlySet<string>;
}

/**
 * The required inputs missing from a wizard step, as stable keys. An empty list
 * means the step is ready to advance. Keys name the control so the step can
 * highlight exactly what is missing.
 */
export function wizardStepErrors(
  key: string,
  input: WizardValidationInput,
): string[] {
  const missing: string[] = [];
  if (key === "destinations") {
    if (input.reportingSystemIds.length === 0) {
      missing.push("reportingSystemIds");
    }
    return missing;
  }
  if (key === "fire") {
    input.subjects.forEach((subject, index) => {
      if (!subject.trainingCodeId) {
        missing.push(`fire.${index}.trainingCodeId`);
      }
      if (!subject.className.trim()) {
        missing.push(`fire.${index}.className`);
      }
      const hasChapters = Boolean(
        subject.curriculumId &&
          input.curriculaWithChapters.has(subject.curriculumId),
      );
      if (hasChapters && !subject.curriculumChapter.trim()) {
        missing.push(`fire.${index}.curriculumChapter`);
      }
    });
    return missing;
  }
  if (key === "kbems") {
    if (!input.kbemsCourseName.trim()) missing.push("kbemsCourseName");
    if (!input.courseType) missing.push("courseType");
    if (!input.objectives.trim()) missing.push("objectives");
    if (
      input.courseType === "initial_certification" &&
      !input.courseNumber.trim()
    ) {
      missing.push("courseNumber");
    }
    return missing;
  }
  if (key === "class") {
    if (input.needsClassName && !input.className) missing.push("className");
    if (input.needsSite && !input.trainingSiteId)
      missing.push("trainingSiteId");
    if (!input.startsAt) missing.push("startsAt");
    if (!input.creditedHours) missing.push("creditedHours");
    if (!input.leadInstructorId) missing.push("leadInstructorId");
    if (!input.hostAgencyId) missing.push("hostAgencyId");
    return missing;
  }
  if (key === "mtu") {
    if (input.mtuMileageRequired && !input.mtuMileage.trim()) {
      missing.push("mtuMileage");
    }
    return missing;
  }
  return missing;
}
