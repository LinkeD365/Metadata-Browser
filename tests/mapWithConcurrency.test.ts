import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../src/utils/mapWithConcurrency";

describe("mapWithConcurrency", () => {
  it("preserves input order when work completes out of order", async () => {
    const result = await mapWithConcurrency([30, 10, 20], 3, async (value) => {
      await new Promise((resolve) => setTimeout(resolve, value));
      return value * 2;
    });

    expect(result).toEqual([60, 20, 40]);
  });

  it("never runs more than the configured number of tasks", async () => {
    let active = 0;
    let maximumActive = 0;

    await mapWithConcurrency(Array.from({ length: 12 }, (_, index) => index), 3, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return value;
    });

    expect(maximumActive).toBe(3);
  });

  it("returns an empty result for empty input", async () => {
    await expect(mapWithConcurrency([], 4, async (value) => value)).resolves.toEqual([]);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid concurrency %s", async (concurrency) => {
    await expect(mapWithConcurrency([1], concurrency, async (value) => value)).rejects.toThrow(
      "Concurrency must be a positive integer",
    );
  });

  it("propagates mapper failures", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (value) => {
        if (value === 2) throw new Error("mapping failed");
        return value;
      }),
    ).rejects.toThrow("mapping failed");
  });
});
