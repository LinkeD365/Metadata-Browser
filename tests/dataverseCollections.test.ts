import { describe, expect, it, vi } from "vitest";
import { dvService } from "../src/utils/dataverse";
import { TableMeta } from "../src/model/tableMeta";

function setup() {
  const connections: ToolBoxAPI.DataverseConnection[] = [0, 1, 2, 3].map((index) => ({
    id: `slot-${index}`, name: `Slot ${index}`, url: `https://slot${index}.crm.dynamics.com`, environment: "Dev",
  }));
  const queryData = vi.fn<DataverseAPI.API["queryData"]>().mockResolvedValue({ value: [] });
  const fetchXmlQuery = vi.fn<DataverseAPI.API["fetchXmlQuery"]>().mockResolvedValue({ value: [] });
  const onLog = vi.fn();
  const service = new dvService({ connections, dvApi: { queryData, fetchXmlQuery }, onLog });
  const table = Object.assign(new TableMeta(), { tableName: "custom_table", metaId: "primary-id" });
  return { service, queryData, fetchXmlQuery, onLog, table };
}

describe("Dataverse comparison requests", () => {
  it("queries keys, privileges and relationships by logical name in each target slot", async () => {
    const { service, queryData, table } = setup();
    for (const slot of [1, 2, 3]) {
      await service.getKeysMeta(table, slot);
      await service.getPrivilegesMetadata(table, slot);
      await service.getRelationshipsMeta(table, "OneToManyRelationship", slot);
    }
    expect(queryData.mock.calls).toEqual([1, 2, 3].flatMap((slot) => [
      ["EntityDefinitions(LogicalName='custom_table')/Keys", slot],
      ["EntityDefinitions(LogicalName='custom_table')/Privileges", slot],
      ["EntityDefinitions(LogicalName='custom_table')/OneToManyRelationships", slot],
    ]));
    expect(queryData.mock.calls.some(([query]) => query.includes("primary-id"))).toBe(false);
  });

  it("resolves solution membership with the target environment's metadata ID", async () => {
    const { service, queryData, fetchXmlQuery, table } = setup();
    queryData.mockImplementation(async (_query, slot) => ({
      value: [{ LogicalName: "custom_table", MetadataId: `slot-${slot}-id` }],
    }));
    await service.getSolutionsForTable(table, 3);
    expect(queryData).toHaveBeenCalledWith("EntityDefinitions(LogicalName='custom_table')", 3);
    expect(fetchXmlQuery).toHaveBeenCalledWith(expect.stringContaining('value="slot-3-id"'), 3);
    expect(fetchXmlQuery.mock.calls[0][0]).not.toContain("primary-id");
  });

  it("reports resolution failures without hiding missing permissions as empty results", async () => {
    const { service, queryData, fetchXmlQuery, table, onLog } = setup();
    queryData.mockRejectedValue(new Error("Sensitive permission details"));
    await expect(service.getSolutionsForTable(table, 2)).rejects.toThrow("Sensitive permission details");
    expect(fetchXmlQuery).not.toHaveBeenCalled();
    expect(onLog).toHaveBeenCalledWith("Unable to resolve table metadata in the selected environment.", "error");
  });

  it("rejects unsupported relationship types before issuing a query", async () => {
    const { service, queryData, table } = setup();
    await expect(service.getRelationshipsMeta(table, "Unexpected", 1)).rejects.toThrow("Unsupported");
    expect(queryData).not.toHaveBeenCalled();
  });
});

describe("Dataverse collection paging", () => {
  it.each([
    "tables", "columns", "keys", "privileges", "relationships", "solutions", "flows", "rules",
  ])("retrieves all continuation pages for %s in the selected slot", async (collection) => {
    const { service, queryData, table } = setup();
    const firstPage = {
      value: [],
      "@odata.nextLink": "https://slot2.crm.dynamics.com/api/data/v9.2/continuation?$skiptoken=next",
    };
    queryData
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce({ value: [] });
    switch (collection) {
      case "tables": await service.getAllTables(2); break;
      case "columns": await service.getColumnsMeta(table.tableName, 2); break;
      case "keys": await service.getKeysMeta(table, 2); break;
      case "privileges": await service.getPrivilegesMetadata(table, 2); break;
      case "relationships": await service.getRelationshipsMeta(table, "ManyToManyRelationship", 2); break;
      case "solutions": await service.getSolutions(false, 2); break;
      case "flows": await service.getBusinessProcessFlowsForTable(table, 2); break;
      case "rules": await service.getBusinessRulesForTable(table, 2); break;
    }
    expect(queryData).toHaveBeenCalledTimes(2);
    expect(queryData).toHaveBeenLastCalledWith("continuation?$skiptoken=next", 2);
  });

  it("paginates both system and personal views independently", async () => {
    const { service, queryData, table } = setup();
    queryData.mockImplementation(async (query) => {
      const personal = query.startsWith("userqueries");
      const name = personal ? "Personal" : "System";
      return query.includes("$skiptoken") ? { value: [{ name: `${name} second` }] } : {
        value: [{ name: `${name} first` }],
        "@odata.nextLink": `${personal ? "userqueries" : "savedqueries"}?$skiptoken=next`,
      };
    });
    const views = await service.getViewsForTable(table, 1);
    expect(views.map((view) => view.viewName)).toEqual([
      "System first", "System second", "Personal first", "Personal second",
    ]);
    expect(queryData).toHaveBeenCalledTimes(4);
    expect(queryData.mock.calls.every(([, slot]) => slot === 1)).toBe(true);
  });

  it("paginates table solution membership using the target ID on every page", async () => {
    const { service, queryData, fetchXmlQuery, table } = setup();
    queryData.mockResolvedValue({ value: [{ LogicalName: table.tableName, MetadataId: "target-id" }] });
    fetchXmlQuery
      .mockResolvedValueOnce({
        value: Array.from({ length: 5000 }, (_, index) => ({ friendlyname: `Solution ${index}` })),
        "@Microsoft.Dynamics.CRM.fetchxmlpagingcookie": encodeURIComponent(encodeURIComponent('<cookie page="1" />')),
      })
      .mockResolvedValueOnce({ value: [{ friendlyname: "Last solution" }] });
    const solutions = await service.getSolutionsForTable(table, 1);
    expect(solutions).toHaveLength(5001);
    expect(fetchXmlQuery.mock.calls[1][0]).toContain('page="2"');
    expect(fetchXmlQuery.mock.calls.every(([query, slot]) => query.includes('value="target-id"') && slot === 1))
      .toBe(true);
  });
});
