import { describe, expect, it } from "vitest";
import { ARROW_STEPS, arrowStep } from "./arrowStep";

/** Days 1 to 31 on screen, with some disabled. */
const days = (disabled: number[]) => (day: number) =>
  day >= 1 && day <= 31 ? (disabled.includes(day) ? "disabled" : "enabled") : undefined;

describe("arrowStep", () => {
  it("moves a day sideways and a week up and down", () => {
    expect(ARROW_STEPS).toEqual({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 });
    expect(arrowStep(10, 1, days([]))).toBe(11);
    expect(arrowStep(10, -7, days([]))).toBe(3);
  });

  it("steps over disabled days in the same direction", () => {
    expect(arrowStep(10, 1, days([11, 12]))).toBe(13);
    expect(arrowStep(17, -7, days([10]))).toBe(3);
  });

  it("stays put when only disabled days or nothing lie that way", () => {
    expect(arrowStep(10, -1, days([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBeNull();
    expect(arrowStep(31, 1, days([]))).toBeNull();
    expect(arrowStep(28, 7, days([]))).toBeNull();
  });
});
