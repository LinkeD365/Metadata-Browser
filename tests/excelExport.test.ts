import { afterEach, describe, expect, it, vi } from "vitest";
import { ViewModel } from "../src/model/ViewModel";
import { TableMeta } from "../src/model/tableMeta";
import { ExcelExport } from "../src/utils/excelExport";

describe("ExcelExport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates and downloads a workbook for each selected table", async () => {
    const link = {
      click: vi.fn(),
      setAttribute: vi.fn(),
      style: {} as Record<string, string>,
    };
    const createElement = vi.fn(() => link);
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    vi.stubGlobal("document", { createElement, body: { appendChild, removeChild } });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:export"),
      revokeObjectURL: vi.fn(),
    });

    const first = new TableMeta();
    first.primaryDisplayName = "Account";
    const second = new TableMeta();
    second.primaryDisplayName = "Contact";
    const vm = new ViewModel();
    vm.excelOptions.includeColumns = false;
    const exporter = new ExcelExport({
      dvsvc: {} as never,
      connection: null,
      vm,
    });

    await exporter.export([first, second]);

    expect(link.click).toHaveBeenCalledTimes(2);
    expect(link.setAttribute).toHaveBeenCalledWith("download", "Account.xlsx");
    expect(link.setAttribute).toHaveBeenCalledWith("download", "Contact.xlsx");
    expect(appendChild).toHaveBeenCalledTimes(2);
    expect(removeChild).toHaveBeenCalledTimes(2);
  });

  it("does not create a workbook when no tables are selected", async () => {
    const createElement = vi.fn();
    vi.stubGlobal("document", { createElement, body: { appendChild: vi.fn(), removeChild: vi.fn() } });

    const exporter = new ExcelExport({
      dvsvc: {} as never,
      connection: null,
      vm: new ViewModel(),
    });

    await expect(exporter.export([])).resolves.toBeUndefined();
    expect(createElement).not.toHaveBeenCalled();
  });
});
