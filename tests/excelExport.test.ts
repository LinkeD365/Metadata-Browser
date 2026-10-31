import { afterEach, describe, expect, it, vi } from "vitest";
import { ViewModel } from "../src/model/ViewModel";
import { TableMeta } from "../src/model/tableMeta";
import { dvService } from "../src/utils/dataverse";
import { ExcelExport } from "../src/utils/excelExport";
import ExcelJS from "exceljs";

const connection: ToolBoxAPI.DataverseConnection = {
  id: "primary",
  name: "Primary",
  url: "https://primary.example",
  environment: "Dev",
};

function captureDownloads(click = vi.fn()) {
  const blobs: Blob[] = [];
  const link = { setAttribute: vi.fn(), style: { visibility: "" }, click };
  const removeChild = vi.fn();
  vi.stubGlobal("document", {
    createElement: vi.fn(() => link),
    body: { appendChild: vi.fn(), removeChild },
  });
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    if (!(blob instanceof Blob)) {
      throw new Error("Excel download must provide a Blob");
    }
    blobs.push(blob);
    return "blob:export";
  });
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  const service = new dvService({
    connections: [connection],
    dvApi: { queryData: async () => ({ value: [] }), fetchXmlQuery: async () => ({ value: [] }) },
    onLog: vi.fn(),
  });
  return { blobs, service, revoke, removeChild };
}

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

  it("exports primary-only data without consuming or mutating cached comparison rows", async () => {
    const { blobs, service } = captureDownloads();
    const vm = new ViewModel();
    vm.columnAttributes = [{ name: "Description" }];
    const selectedTable = Object.assign(new TableMeta(), {
      tableName: "account",
      primaryDisplayName: "Account",
      columns: [{ columnName: "secondary_only", displayName: "Comparison cache", attributes: [] }],
    });
    const getColumns = vi.spyOn(service, "getColumnsMeta").mockResolvedValue([
      {
        columnName: "name", displayName: "Primary name", dataType: "String",
        attributes: [{ attributeName: "Description", attributeValue: "=literal text" }],
        hasPrimaryConnection: false, hasSecondaryConnection: false,
      },
    ]);
    await new ExcelExport({ dvsvc: service, connection, vm }).export([selectedTable]);
    expect(getColumns).toHaveBeenCalledWith("account");
    expect(selectedTable.columns[0].columnName).toBe("secondary_only");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blobs[0].arrayBuffer());
    expect(workbook.getWorksheet("Columns")?.getRow(2).values).toEqual([
      undefined, "name", "Primary name", "String", "=literal text",
    ]);
    expect(workbook.getWorksheet("Columns")?.getRow(2).getCell(4).type).toBe(ExcelJS.ValueType.String);
  });

  it("continues to later relationship sheets when the first direction is empty", async () => {
    const { blobs, service } = captureDownloads();
    const vm = new ViewModel();
    vm.excelOptions.includeColumns = false;
    vm.excelOptions.includeRelationships = true;
    vi.spyOn(service, "getRelationshipsMeta").mockImplementation(async (_table, type) =>
      type === "OneToManyRelationship" ? [] : [{
        relationshipName: `relationship_${type}`, type, attributes: [],
        hasPrimaryConnection: false, hasSecondaryConnection: false,
      }],
    );
    const table = Object.assign(new TableMeta(), { tableName: "account", primaryDisplayName: "Account" });
    await new ExcelExport({ dvsvc: service, connection, vm }).export([table]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blobs[0].arrayBuffer());
    expect(workbook.getWorksheet("ManyToOneRelationship")?.getRow(2).getCell(1).value)
      .toBe("relationship_ManyToOneRelationship");
    expect(workbook.getWorksheet("ManyToManyRelationship")?.getRow(2).getCell(1).value)
      .toBe("relationship_ManyToManyRelationship");
  });

  it("cleans up download resources when a download fails", async () => {
    const { service, revoke, removeChild } = captureDownloads(vi.fn(() => { throw new Error("Download failed"); }));
    const vm = new ViewModel();
    vm.excelOptions.includeColumns = false;
    const table = Object.assign(new TableMeta(), { tableName: "account", primaryDisplayName: "Account" });
    await expect(new ExcelExport({ dvsvc: service, connection, vm }).export([table]))
      .rejects.toThrow("Download failed");
    expect(removeChild).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledOnce();
  });
});
