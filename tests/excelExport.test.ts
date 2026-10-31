import { afterEach, describe, expect, it, vi } from "vitest";
import { ViewModel } from "../src/model/ViewModel";
import { TableMeta } from "../src/model/tableMeta";
import { dvService } from "../src/utils/dataverse";
import { ExcelExport } from "../src/utils/excelExport";

const connection: ToolBoxAPI.DataverseConnection = {
  id: "primary",
  name: "Primary",
  url: "https://primary.example",
  environment: "Dev",
};

describe("ExcelExport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates a user-triggered workbook download without console output", async () => {
    const linkAttributes: Record<string, string> = {};
    const link = {
      setAttribute: (name: string, value: string) => {
        linkAttributes[name] = value;
      },
      style: { visibility: "" },
      click: vi.fn(),
    };
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:metadata-export");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("document", {
      createElement: vi.fn(() => link),
      body: { appendChild, removeChild },
    });

    const api: Pick<DataverseAPI.API, "queryData" | "fetchXmlQuery"> = {
      queryData: async () => ({ value: [] }),
      fetchXmlQuery: async () => ({ value: [] }),
    };
    const service = new dvService({
      connections: [connection],
      dvApi: api,
      onLog: vi.fn(),
    });
    const vm = new ViewModel();
    vm.excelOptions.includeColumns = false;
    vm.excelOptions.includeKeys = false;
    vm.excelOptions.includePrivileges = false;
    vm.excelOptions.includeRelationships = false;
    vm.excelOptions.includeSolutions = false;

    const table = new TableMeta();
    table.tableName = "account";
    table.primaryDisplayName = "Account";
    table.attributes = [{ attributeName: "LogicalName", attributeValue: "account" }];

    await new ExcelExport({ dvsvc: service, connection, vm }).export([table]);

    expect(linkAttributes).toMatchObject({ href: "blob:metadata-export", download: "Account.xlsx" });
    expect(link.click).toHaveBeenCalledOnce();
    expect(appendChild).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(consoleLog).not.toHaveBeenCalled();
  });
});
