import { describe, expect, it, vi } from "vitest";
import { saveCsvFile, serializeCsv } from "../src/utils/csvExport";

describe("CSV exports", () => {
  it("quotes fields, escapes quotes and preserves commas and newlines", () => {
    expect(serializeCsv([["Name", "Description"], ['A "quoted" name', "line one,\nline two"]]))
      .toBe('"Name","Description"\r\n"A ""quoted"" name","line one,\nline two"');
  });

  it("exports spreadsheet formula-like values as text and preserves empty values", () => {
    expect(serializeCsv([["=1+1", " @SUM(A1)", "+1", "-1", null, undefined, false]]))
      .toBe('"\'=1+1","\' @SUM(A1)","\'+1","\'-1","","","false"');
  });

  it("waits for save completion and distinguishes user cancellation from success", async () => {
    const save = vi.fn().mockResolvedValueOnce("chosen-path").mockResolvedValueOnce(null);
    const log = vi.fn();
    const notify = vi.fn();
    await saveCsvFile("metadata.csv", [["value"]], save, log, notify);
    await saveCsvFile("metadata.csv", [["value"]], save, log, notify);
    expect(save).toHaveBeenCalledWith("metadata.csv", '"value"');
    expect(log.mock.calls).toEqual([["CSV export saved.", "success"], ["CSV export cancelled.", "info"]]);
    expect(notify).not.toHaveBeenCalled();
  });

  it("reports save failures without exposing paths or response details", async () => {
    const save = vi.fn().mockRejectedValue(new Error("Private file path"));
    const log = vi.fn();
    const notify = vi.fn();
    await saveCsvFile("metadata.csv", [["value"]], save, log, notify);
    expect(notify).toHaveBeenCalledWith("Export failed", expect.stringContaining("retry"), "error");
    expect(JSON.stringify(log.mock.calls)).not.toContain("Private file path");
  });
});
