import { describe, expect, it, vi } from "vitest";
import { runReportedOperation } from "../src/utils/async";

describe("reported operation recovery", () => {
  it("restores controls after success without reporting failure", async () => {
    const busy = vi.fn();
    const notify = vi.fn();
    const log = vi.fn();
    expect(await runReportedOperation(async () => {}, busy, log, notify, "Failed")).toBe(true);
    expect(busy.mock.calls).toEqual([[true], [false]]);
    expect(log).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("reports safe failure text, restores controls, and permits a retry", async () => {
    const busy = vi.fn();
    const notify = vi.fn();
    const log = vi.fn();
    const operation = vi.fn().mockRejectedValueOnce(new Error("Sensitive response")).mockResolvedValueOnce(undefined);
    expect(await runReportedOperation(operation, busy, log, notify, "Check connection and retry")).toBe(false);
    expect(log).toHaveBeenCalledWith("Check connection and retry", "error");
    expect(notify).toHaveBeenCalledWith("Operation failed", "Check connection and retry", "error");
    expect(JSON.stringify(log.mock.calls)).not.toContain("Sensitive response");
    expect(await runReportedOperation(operation, busy, log, notify, "Check connection and retry")).toBe(true);
    expect(busy.mock.calls).toEqual([[true], [false], [true], [false]]);
  });

  it("restores controls even when the host notification fails", async () => {
    const busy = vi.fn();
    const notify = vi.fn().mockRejectedValue(new Error("Host unavailable"));
    await expect(runReportedOperation(async () => { throw new Error("Read failed"); },
      busy, vi.fn(), notify, "Retry")).rejects.toThrow("Host unavailable");
    expect(busy).toHaveBeenLastCalledWith(false);
  });
});
