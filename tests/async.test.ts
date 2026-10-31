import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../src/utils/async";

describe("mapWithConcurrency", () => {
  it("limits active tasks and keeps results in input order", async () => {
    let active = 0;
    let maximumActive = 0;

    const results = await mapWithConcurrency([0, 1, 2, 3, 4, 5, 6], 3, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, (6 - value) % 3));
      active -= 1;
      return value * 2;
    });

    expect(maximumActive).toBe(3);
    expect(results).toEqual([0, 2, 4, 6, 8, 10, 12]);
  });

  it("rejects invalid concurrency limits", async () => {
    await expect(mapWithConcurrency([1], 0, async (value) => value)).rejects.toThrow(
      "Concurrency must be a positive integer",
    );
    await expect(mapWithConcurrency([1], 1.5, async (value) => value)).rejects.toThrow(RangeError);
  });

  it("rejects when a mapper fails", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (value) => {
        if (value === 2) {
          throw new Error("lookup failed");
        }
        return value;
      }),
    ).rejects.toThrow("lookup failed");
  });
});
