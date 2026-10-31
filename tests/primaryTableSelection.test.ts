import { describe, expect, it, vi } from "vitest";
import { TableMeta } from "../src/model/tableMeta";
import { dvService } from "../src/utils/dataverse";

function createService(connections: Array<ToolBoxAPI.DataverseConnection | null>) {
  const queryData = vi.fn<DataverseAPI.API["queryData"]>().mockResolvedValue({ value: [] });
  const service = new dvService({
    connections,
    dvApi: { queryData, fetchXmlQuery: async () => ({ value: [] }) },
    onLog: vi.fn(),
  });
  return { service, queryData };
}

function connectedSlots(): ToolBoxAPI.DataverseConnection[] {
  return Array.from({ length: 4 }, (_, index) => ({
    id: `connection-${index}`,
    name: `Environment ${index + 1}`,
    url: `https://environment-${index}.example`,
    environment: "Dev",
  }));
}

function table(name: string, label: string): TableMeta {
  return Object.assign(new TableMeta(), {
    tableName: name,
    primaryDisplayName: label,
    metaId: `${label}-metadata-id`,
  });
}

describe("primary connection selection", () => {
  it("uses only primary tables as the baseline while comparing matching tables in all four slots", async () => {
    const { service } = createService(connectedSlots());
    const getAllTables = vi.spyOn(service, "getAllTables").mockImplementation(async (index = 0) =>
      index === 0
        ? [table("account", "Primary account"), table("contact", "Primary contact")]
        : [table("account", `Account ${index}`), table(`extra_${index}`, "Comparison-only table")],
    );

    const result = await service.getComparisonTables();

    expect(result.map((row) => row.tableName)).toEqual(["account", "contact"]);
    expect(result[0].connectionDisplayNames).toEqual(["Primary account", "Account 1", "Account 2", "Account 3"]);
    expect(result[0].connectionPresence).toEqual([true, true, true, true]);
    expect(result[0].metaId).toBe("Primary account-metadata-id");
    expect(result[0].sourceConnectionIndex).toBe(0);
    expect(result[1].connectionPresence.slice(1).some(Boolean)).toBe(false);
    expect(getAllTables.mock.calls).toEqual([[0], [1], [2], [3]]);
  });

  it("takes solution membership only from primary even when comparison environments do not have that solution", async () => {
    const { service } = createService(connectedSlots());
    const getSolutionTables = vi.spyOn(service, "getSolutionTables")
      .mockResolvedValue([table("account", "Primary account")]);
    const getAllTables = vi.spyOn(service, "getAllTables")
      .mockResolvedValue([table("account", "Comparison account"), table("contact", "Not selected")]);

    const result = await service.getComparisonTables("primary_solution");

    expect(getSolutionTables.mock.calls).toEqual([["primary_solution", 0]]);
    expect(getAllTables.mock.calls).toEqual([[1], [2], [3]]);
    expect(result.map((row) => row.tableName)).toEqual(["account"]);
    expect(result[0].connectionPresence).toEqual([true, true, true, true]);
  });

  it("preserves empty connection slots without retargeting comparison queries", async () => {
    const connections: Array<ToolBoxAPI.DataverseConnection | null> = connectedSlots();
    connections[1] = null;
    const { service } = createService(connections);
    const getAllTables = vi.spyOn(service, "getAllTables").mockResolvedValue([table("account", "Account")]);

    const result = await service.getComparisonTables();

    expect(getAllTables.mock.calls).toEqual([[0], [2], [3]]);
    expect(result[0].connectionPresence[1]).toBeUndefined();
    expect(result[0].connectionPresence[3]).toBe(true);
  });

  it("does not load comparison tables when the primary selection is empty", async () => {
    const { service } = createService(connectedSlots());
    const getAllTables = vi.spyOn(service, "getAllTables").mockResolvedValue([]);

    expect(await service.getComparisonTables()).toEqual([]);
    expect(getAllTables.mock.calls).toEqual([[0]]);
  });

  it("rejects selection when primary is disconnected rather than falling back to another environment", async () => {
    const connections: Array<ToolBoxAPI.DataverseConnection | null> = connectedSlots();
    connections[0] = null;
    const { service, queryData } = createService(connections);

    await expect(service.getComparisonTables()).rejects.toThrow("No connection available");
    await expect(service.getComparisonTables("solution")).rejects.toThrow("No connection available");
    await expect(service.getSolutions(false, 0)).rejects.toThrow("No connection available");
    expect(queryData).not.toHaveBeenCalled();
  });

  it("loads solution picker names from the primary connection only", async () => {
    const { service, queryData } = createService(connectedSlots());
    queryData.mockResolvedValue({
      value: [{ friendlyname: "Primary solution", uniquename: "primary_solution", solutionid: "id" }],
    });

    const result = await service.getSolutions(false, 0);

    expect(result.map((solution) => solution.solutionName)).toEqual(["Primary solution"]);
    expect(queryData).toHaveBeenCalledOnce();
    expect(queryData).toHaveBeenCalledWith(expect.stringContaining("ismanaged eq false"), 0);
  });
});
