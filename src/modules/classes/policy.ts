import { CLASS_STATUSES, type ClassStatus } from "./constants";

export function validateComponentRange(
  startsAt: Date,
  endsAt: Date,
  creditedHours: number,
): void {
  if (endsAt <= startsAt) {
    throw new Error("Component end time must be after its start time.");
  }
  if (creditedHours <= 0) {
    throw new Error("Credited hours must be greater than zero.");
  }
}

export function calculateComponentEndTime(
  startsAt: Date,
  creditedHours: number,
): Date {
  if (startsAt.getMinutes() % 15 !== 0) {
    throw new Error("Component start time must use a 15-minute increment.");
  }
  if (creditedHours <= 0 || !Number.isInteger(creditedHours * 4)) {
    throw new Error("Credited hours must use a 15-minute increment.");
  }
  return new Date(startsAt.getTime() + creditedHours * 60 * 60 * 1000);
}

export function validateClassReadiness(input: {
  componentCount: number;
  leadCount: number;
  reportingCount: number;
  hostAgencyActive: boolean;
}): void {
  if (input.componentCount < 1) {
    throw new Error("Add at least one class component before opening.");
  }
  if (input.leadCount !== 1) {
    throw new Error("Assign one lead instructor before opening.");
  }
  if (input.reportingCount < 1) {
    throw new Error("Select at least one reporting system before opening.");
  }
  if (!input.hostAgencyActive) {
    throw new Error("Assign an active host agency before opening.");
  }
}

export function validateClassTransition(
  current: ClassStatus,
  next: ClassStatus,
  cancellationReason?: string,
): void {
  const allowed =
    current === CLASS_STATUSES.OPEN && next === CLASS_STATUSES.CANCELLED;

  if (!allowed) {
    throw new Error(`Class cannot transition from ${current} to ${next}.`);
  }
  if (next === CLASS_STATUSES.CANCELLED && !cancellationReason?.trim()) {
    throw new Error("A cancellation reason is required.");
  }
}

export function assertClassEditable(status: string): void {
  if (
    status === CLASS_STATUSES.FINALIZED ||
    status === CLASS_STATUSES.CANCELLED
  ) {
    throw new Error("Finalized or cancelled classes cannot be edited.");
  }
}

export function validateFinalizationTransition(status: string): void {
  if (status !== CLASS_STATUSES.OPEN) {
    throw new Error("Only open classes can be finalized.");
  }
}

export function validateReopenReason(reason: string): void {
  if (!reason.trim()) throw new Error("A reopen reason is required.");
}

export function validateReportingStatusTransition(
  current: string,
  next: string,
  notes?: string,
): void {
  if (
    !["pending", "entered", "needs_correction", "not_required"].includes(next)
  ) {
    throw new Error("Invalid reporting status.");
  }
  if (["entered", "not_required"].includes(current) && next === "pending") {
    throw new Error(
      "Completed destinations must be corrected rather than reset.",
    );
  }
  if (next === "needs_correction" && !notes?.trim()) {
    throw new Error("Correction notes are required.");
  }
}
