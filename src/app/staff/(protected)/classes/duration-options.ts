import { formatHours } from "@/modules/classes/time";

export const MIN_DURATION_MINUTES = 30;
export const MAX_DURATION_MINUTES = 16 * 60;
export const DURATION_STEP_MINUTES = 15;

export interface DurationOption {
  value: string;
  label: string;
  minutes: number;
  current?: boolean;
}

export interface DurationSelection {
  options: DurationOption[];
  value: string;
}

function offeredMinutes(minutes: number): boolean {
  return (
    minutes >= MIN_DURATION_MINUTES &&
    minutes <= MAX_DURATION_MINUTES &&
    minutes % DURATION_STEP_MINUTES === 0
  );
}

function baseOptions(): DurationOption[] {
  const options: DurationOption[] = [];
  for (
    let minutes = MIN_DURATION_MINUTES;
    minutes <= MAX_DURATION_MINUTES;
    minutes += DURATION_STEP_MINUTES
  ) {
    options.push({
      value: String(minutes / 60),
      label: formatHours(minutes / 60),
      minutes,
    });
  }
  return options;
}

/**
 * The single duration select's options and selected value. The value is decimal
 * hours so the existing credited-hours contract is unchanged. A stored value
 * outside the offered range becomes a synthetic current-value option instead of
 * being clamped; an empty or invalid value defaults to two hours.
 */
export function buildDurationSelection(
  currentValue?: string | number | null,
): DurationSelection {
  const options = baseOptions();
  const hours = Number(currentValue);
  if (!Number.isFinite(hours) || hours <= 0) {
    return { options, value: "2" };
  }
  const minutes = Math.round(hours * 60);
  if (offeredMinutes(minutes)) {
    const offered = options.find((option) => option.minutes === minutes);
    if (offered) return { options, value: offered.value };
  }
  const synthetic: DurationOption = {
    value: String(hours),
    label: `${formatHours(hours)} (current)`,
    minutes,
    current: true,
  };
  if (minutes < MIN_DURATION_MINUTES) {
    options.unshift(synthetic);
  } else {
    options.push(synthetic);
  }
  return { options, value: synthetic.value };
}
