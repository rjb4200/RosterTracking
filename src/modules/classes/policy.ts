import {
  CLASS_DELIVERY_METHODS,
  CLASS_STATUSES,
  type ClassStatus,
} from "./constants";

export function validateDeliverySite(
  deliveryMethod: string,
  trainingSiteId: string | null,
): void {
  if (deliveryMethod !== CLASS_DELIVERY_METHODS.VIRTUAL && !trainingSiteId) {
    throw new Error("A training site is required for this delivery method.");
  }
}

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

export function validateClassReadiness(input: {
  componentCount: number;
  leadCount: number;
  reportingCount: number;
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
}

export function validateClassTransition(
  current: ClassStatus,
  next: ClassStatus,
  cancellationReason?: string,
): void {
  const allowed =
    (current === CLASS_STATUSES.DRAFT && next === CLASS_STATUSES.OPEN) ||
    (current === CLASS_STATUSES.OPEN && next === CLASS_STATUSES.COMPLETED) ||
    (current !== CLASS_STATUSES.FINALIZED &&
      current !== CLASS_STATUSES.CANCELLED &&
      next === CLASS_STATUSES.CANCELLED);

  if (!allowed) {
    throw new Error(`Class cannot transition from ${current} to ${next}.`);
  }
  if (next === CLASS_STATUSES.CANCELLED && !cancellationReason?.trim()) {
    throw new Error("A cancellation reason is required.");
  }
}
