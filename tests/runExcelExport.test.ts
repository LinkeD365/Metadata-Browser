import { describe, expect, it, vi } from "vitest";
import { TableMeta } from "../src/model/tableMeta";
import { runExcelExport } from "../src/utils/runExcelExport";

describe("runExcelExport", () => {
  it("does not invoke the exporter when the selection is empty", async () => {
    const exportTables = vi.fn(async () => undefined);
    const onFailure = vi.fn();

    await expect(runExcelExport([], exportTables, onFailure)).resolves.toBe(false);
    expect(exportTables).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("exports selected tables and reports success", async () => {
    const tables = [new TableMeta()];
    const exportTables = vi.fn(async () => undefined);
    const onFailure = vi.fn();

    await expect(runExcelExport(tables, exportTables, onFailure)).resolves.toBe(true);
    expect(exportTables).toHaveBeenCalledWith(tables);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("surfaces export failures and reports an unsuccessful result", async () => {
    const error = new Error("write failed");
    const onFailure = vi.fn();

    await expect(
      runExcelExport([new TableMeta()], async () => {
        throw error;
      }, onFailure),
    ).resolves.toBe(false);
    expect(onFailure).toHaveBeenCalledWith(error);
  });

  it("waits for asynchronous failure reporting", async () => {
    const calls: string[] = [];

    await runExcelExport(
      [new TableMeta()],
      async () => {
        throw new Error("write failed");
      },
      async () => {
        await Promise.resolve();
        calls.push("reported");
      },
    );

    expect(calls).toEqual(["reported"]);
  });
});
