export const OFFICIAL_ROSTER_FORMS = {
  KFS_1A: "kfs-1a",
} as const;

export type OfficialRosterForm =
  (typeof OFFICIAL_ROSTER_FORMS)[keyof typeof OFFICIAL_ROSTER_FORMS];

export const DOCUMENT_TYPES = {
  ...OFFICIAL_ROSTER_FORMS,
  COMPLETION_CERTIFICATE: "completion-certificate",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export interface TemplateMapping {
  formType: DocumentType;
  templateVersion: string;
  assetName: string;
  sourceChecksum: string;
  pageCapacity: number;
  pageSize: { width: number; height: number };
  typography: { fontSize: number; font: "Helvetica" };
  // PDF user-space rectangles extracted from the approved source template.
  fieldCoordinates: Record<
    string,
    { x: number; y: number; width: number; height: number }
  >;
  fields: Record<string, string>;
  // Text fields that should wrap a long value across lines rather than
  // auto-shrink it onto a single line.
  wrapFields?: readonly string[];
  blankFields: readonly string[];
  // Field-name prefix for the per-attendee initials column (for example
  // "INITIALSRow", used as INITIALSRow1..N). Absent when the form has none.
  attendeeInitialsField?: string;
}

export const TEMPLATE_MAPPINGS: Record<OfficialRosterForm, TemplateMapping> = {
  "kfs-1a": {
    formType: "kfs-1a",
    templateVersion: "kfs-1a-october-2023",
    assetName: "kfs-1a-october-2023.pdf",
    sourceChecksum:
      "2c94a782633a85a74cebce99a486a93da6ff011053f725f18cab0d52537d0451",
    pageCapacity: 25,
    pageSize: { width: 612, height: 792 },
    typography: { font: "Helvetica", fontSize: 8 },
    fieldCoordinates: {
      date: { x: 58.56, y: 686.28, width: 85.56, height: 25.32 },
      hostAgency: { x: 234.24, y: 686.28, width: 161.88, height: 25.32 },
      attendeeFfnRow1: { x: 37.08, y: 528.12, width: 70.68, height: 16.44 },
      attendeeLastNameRow1: {
        x: 109.32,
        y: 528.12,
        width: 175.32,
        height: 16.44,
      },
      attendeeFirstNameRow1: {
        x: 286.2,
        y: 528.12,
        width: 187.44,
        height: 16.44,
      },
      attendeeHoursRow1: { x: 528.96, y: 528.12, width: 21, height: 16.44 },
    },
    fields: {
      date: "Date",
      hostAgency: "Host Agency",
      location: "Location",
      leadInstructor: "Lead Instructor Print",
      assistingInstructor: "Assisting Instructor Print",
      leadFfn: "FFN",
      assistingFfn: "FFN_2",
      categoryRow1: "CategoryRow1",
      classNameRow1: "Class NameRow1",
      curriculumRow1: "CurriculumRow1",
      lessonPlanRow1: "Lesson PlanRow1",
      startRow1: "StartRow1",
      endRow1: "EndRow1",
      hoursRow1: "HoursCR  HO  OL",
      categoryRow2: "CategoryRow2",
      classNameRow2: "Class NameRow2",
      curriculumRow2: "CurriculumRow2",
      lessonPlanRow2: "Lesson PlanRow2",
      startRow2: "StartRow2",
      endRow2: "EndRow2",
      hoursRow2: "HoursCR  HO  OL_2",
      // Left blank: the roster is generated before external reporting.
      dateEntered: "Date Entered",
      enteredBy: "Entered By",
      // The lead instructor's typed-name signature line and derived initials.
      leadSignature: "Text1",
      instructorInitials: "Instructor Initials",
    },
    // Subject cells hold variable-length values; wrap them onto a second
    // line instead of auto-shrinking them onto one.
    wrapFields: [
      "Class NameRow1",
      "Class NameRow2",
      "CurriculumRow1",
      "CurriculumRow2",
      "Lesson PlanRow1",
      "Lesson PlanRow2",
    ],
    // Everything approved is populated: the lead instructor signs and both
    // instructor and attendee initials are printed. Nothing is left blank.
    blankFields: [],
    attendeeInitialsField: "INITIALSRow",
  },
};

export const COMPLETION_CERTIFICATE_TEMPLATE: TemplateMapping = {
  formType: "completion-certificate",
  templateVersion: "class-completion-certificate-002",
  assetName: "class-completion-certificate-002.pdf",
  sourceChecksum:
    "6f1d9a051919a97cd13359ed5270e0713ad26f41b0b1d1b64a862f1ec125b623",
  // One certificate per page; the renderer emits one page per participant.
  pageCapacity: 1,
  pageSize: { width: 792, height: 612 },
  typography: { font: "Helvetica", fontSize: 10 },
  fieldCoordinates: {},
  fields: {
    studentName: "Student_Name",
    classHours: "Class_Hours",
    courseType: "Course_Type",
    courseNumber: "Course_Number",
    completionDate: "Completion_Date",
    instructorName: "Instructor_Name",
    instructorTitleCourse: "Instructor_Title_Course",
    instructorSignature: "Instructor_Signature",
  },
  // The lead instructor's typed-name electronic signature is rendered from the
  // revision attestation; nothing is left permanently blank.
  blankFields: [],
};

export function getTemplateMapping(
  formType: OfficialRosterForm,
): TemplateMapping {
  return TEMPLATE_MAPPINGS[formType];
}
