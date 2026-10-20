import { describe, expect, it } from "vitest";

import { buildDurationSelection } from "./duration-options";

describe("duration selection", () => {
  it("offers every 15-minute step from 30m through 16h", () => {
    const { options } = buildDurationSelection(undefined);
    expect(options).toHaveLength(63);
    expect(options[0]).toMatchObject({ value: "0.5", label: "30m" });
    expect(options.at(-1)).toMatchObject({ value: "16", label: "16h" });
    expect(options[1]).toMatchObject({ value: "0.75", label: "45m" });
    expect(options[4]).toMatchObject({ value: "1.5", label: "1h 30m" });
  });

  it("uses decimal hours and the shared duration labels", () => {
    const { options, value } = buildDurationSelection("2.5");
    expect(value).toBe("2.5");
    expect(options.find((option) => option.value === value)).toMatchObject({
      label: "2h 30m",
      minutes: 150,
    });
  });

  it("defaults an empty or invalid value to two hours", () => {
    expect(buildDurationSelection(undefined).value).toBe("2");
    expect(buildDurationSelection("").value).toBe("2");
    expect(buildDurationSelection("not-a-duration").value).toBe("2");
    expect(buildDurationSelection("0").value).toBe("2");
    expect(buildDurationSelection("-1").value).toBe("2");
  });

  it("matches an offered value regardless of decimal formatting", () => {
    expect(buildDurationSelection("2.00").value).toBe("2");
    expect(buildDurationSelection("4.25").value).toBe("4.25");
  });

  it("keeps an out-of-range current value as a synthetic option", () => {
    const short = buildDurationSelection("0.25");
    expect(short.value).toBe("0.25");
    expect(short.options[0]).toMatchObject({
      value: "0.25",
      label: "15m (current)",
      current: true,
    });
    expect(short.options).toHaveLength(64);

    const long = buildDurationSelection("20");
    expect(long.value).toBe("20");
    expect(long.options.at(-1)).toMatchObject({
      value: "20",
      label: "20h (current)",
      current: true,
    });
    expect(long.options).toHaveLength(64);
  });

  it("keeps a non-quarter-hour current value exactly", () => {
    const selection = buildDurationSelection("2.33");
    expect(selection.value).toBe("2.33");
    expect(selection.options.at(-1)).toMatchObject({
      label: "2h 20m (current)",
      current: true,
    });
  });
});
