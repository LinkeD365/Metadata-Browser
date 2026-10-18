import { beforeEach, describe, expect, it, vi } from "vitest";
import { TableMeta } from "../src/model/tableMeta";
import { dvService } from "../src/utils/dataverse";

function createService() {
  const queryData = vi.fn(async (_query: string, _target?: "primary" | "secondary") => ({ value: [] as any[] }));
  const fetchXmlQuery = vi.fn(async (_query: string, _target?: "primary" | "secondary") => ({ value: [] as any[] }));
  const primaryConnection = { id: "primary", name: "Primary" } as ToolBoxAPI.DataverseConnection;
  const secondaryConnection = { id: "secondary", name: "Secondary" } as ToolBoxAPI.DataverseConnection;
  const onLog = vi.fn();
  const service = new dvService({
    primaryConnection,
    secondaryConnection,
    dvApi: { queryData, fetchXmlQuery } as unknown as DataverseAPI.API,
    onLog,
  });

  return { service, queryData, fetchXmlQuery, onLog, primaryConnection, secondaryConnection };
}

function selectedTable(): TableMeta {
  const table = new TableMeta();
  table.tableName = "account";
  table.primaryDisplayName = "Account";
  table.metaId = "metadata-id";
  return table;
}

describe("dvService", () => {
  let fixture: ReturnType<typeof createService>;

  beforeEach(() => {
    fixture = createService();
  });

  it("caches environment IDs and builds encoded Power Apps URLs", async () => {
    fixture.queryData.mockResolvedValue({ Detail: { EnvironmentId: " env/one " } } as any);

    await expect(fixture.service.getEnvironmentId()).resolves.toBe("env/one");
    await expect(fixture.service.getEnvironmentId()).resolves.toBe("env/one");
    await expect(fixture.service.getTableBrowserUrl("metadata id", "/fields")).resolves.toBe(
      "https://make.powerapps.com/environments/env%2Fone/entities/metadata%20id/fields",
    );
    expect(fixture.queryData).toHaveBeenCalledTimes(1);
  });

  it("surfaces a missing environment ID", async () => {
    fixture.queryData.mockResolvedValue({ value: [] });
    await expect(fixture.service.getEnvironmentId()).rejects.toThrow(
      "RetrieveCurrentOrganization did not return an environment ID",
    );
  });

  it("retrieves primary and secondary table metadata", async () => {
    fixture.queryData.mockResolvedValue({
      value: [{ LogicalName: "account", MetadataId: "id", DisplayName: { LocalizedLabels: [{ Label: "Account" }] } }],
    });

    const tables = await fixture.service.getAllTables(true);

    expect(tables[0]).toMatchObject({ tableName: "account", metaId: "id", primaryDisplayName: "Account" });
    expect(fixture.queryData).toHaveBeenCalledWith("EntityDefinitions", "primary");
  });

  it("maps columns for a table and passes the selected connection", async () => {
    fixture.queryData.mockResolvedValue({
      value: [{ LogicalName: "name", AttributeType: "String", DisplayName: { LocalizedLabels: [{ Label: "Name" }] } }],
    });

    const columns = await fixture.service.getColumnsMeta("account", "secondary");

    expect(columns[0]).toMatchObject({ columnName: "name", displayName: "Name", dataType: "String" });
    expect(fixture.queryData).toHaveBeenCalledWith(
      "EntityDefinitions(LogicalName='account')/Attributes",
      "secondary",
    );
  });

  it("loads and maps solution summaries", async () => {
    fixture.queryData.mockResolvedValue({
      value: [{ friendlyname: "Core", uniquename: "core", solutionid: "solution-id" }],
    });

    const solutions = await fixture.service.getSolutions(false);

    expect(solutions[0]).toMatchObject({ solutionName: "Core", uniqueName: "core", solutionId: "solution-id" });
    expect(fixture.queryData.mock.calls[0][0]).toContain("ismanaged eq false");
  });

  it("limits solution component requests and preserves component order", async () => {
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    fixture.queryData.mockImplementation(async (query: string) => {
      if (query.startsWith("solutioncomponents?")) {
        return { value: Array.from({ length: 12 }, (_, index) => ({ objectid: `id-${index}` })) };
      }
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 2));
      activeRequests -= 1;
      const id = query.slice("EntityDefinitions(".length, -1);
      return { LogicalName: id, MetadataId: id };
    });

    const tables = await fixture.service.getSolutionTables("core");

    expect(maximumActiveRequests).toBeLessThanOrEqual(5);
    expect(tables.map((table) => table.tableName)).toEqual(Array.from({ length: 12 }, (_, index) => `id-${index}`));
  });

  it("logs a failed solution component request and continues with remaining components", async () => {
    fixture.queryData.mockImplementation(async (query: string) => {
      if (query.startsWith("solutioncomponents?")) return { value: [{ objectid: "broken" }, { objectid: "ok" }] };
      if (query.includes("(broken)")) throw new Error("not found");
      return { LogicalName: "account", MetadataId: "ok" };
    });

    const tables = await fixture.service.getSolutionTables("core");

    expect(tables.map((table) => table.tableName)).toEqual(["account"]);
    expect(fixture.onLog).toHaveBeenCalledWith(expect.stringContaining("Failed to fetch entity metadata"), "warning");
  });

  it("returns null and logs when a secondary table lookup fails", async () => {
    fixture.queryData.mockRejectedValue(new Error("unavailable"));

    await expect(fixture.service.getTableByLogicalName("account", "secondary")).resolves.toBeNull();
    expect(fixture.onLog).toHaveBeenCalledWith(expect.stringContaining("Unable to fetch table metadata"), "warning");
  });

  it("maps keys, privileges, and relationships", async () => {
    fixture.queryData.mockImplementation(async (query: string) => {
      if (query.endsWith("/Keys")) {
        return { value: [{ LogicalName: "ak", DisplayName: { UserLocalizedLabel: { Label: "Account Key" } } }] };
      }
      if (query.endsWith("/Privileges")) return { value: [{ Name: "Read" }] };
      return { value: [{ SchemaName: "account_contact", MetadataId: "relationship-id" }] };
    });

    await expect(fixture.service.getKeysMeta(selectedTable())).resolves.toMatchObject([{ keyName: "Account Key" }]);
    await expect(fixture.service.getPrivilegesMetadata(selectedTable())).resolves.toMatchObject([
      { privilegeName: "Read" },
    ]);
    await expect(fixture.service.getRelationshipsMeta(selectedTable(), "OneToManyRelationship")).resolves.toMatchObject([
      { relationshipName: "account_contact", type: "OneToManyRelationship" },
    ]);
  });

  it("maps solutions associated with a table using FetchXML", async () => {
    fixture.fetchXmlQuery.mockResolvedValue({
      value: [{ friendlyname: "Core", uniquename: "core", solutionid: "id", version: "1.0" }],
    });

    const solutions = await fixture.service.getSolutionsForTable(selectedTable());

    expect(solutions[0]).toMatchObject({ solutionName: "Core", uniqueName: "core", solutionId: "id" });
    expect(fixture.fetchXmlQuery.mock.calls[0][0]).toContain('<entity name="solution">');
  });

  it("combines system and personal views", async () => {
    fixture.queryData.mockImplementation(async (query: string) => ({
      value: [{ name: query.startsWith("savedqueries") ? "System view" : "Personal view" }],
    }));

    await expect(fixture.service.getViewsForTable(selectedTable())).resolves.toMatchObject([
      { viewName: "System view", type: "System" },
      { viewName: "Personal view", type: "Personal" },
    ]);
  });

  it("maps business process flows and business rules", async () => {
    fixture.queryData.mockImplementation(async (query: string) => ({
      value: [{ name: "Automation" , category: query.includes("category eq 4") ? 4 : 2 }],
    }));

    await expect(fixture.service.getBusinessProcessFlowsForTable(selectedTable())).resolves.toMatchObject([
      { flowName: "Automation", type: "Business Process Flow" },
    ]);
    await expect(fixture.service.getBusinessRulesForTable(selectedTable())).resolves.toMatchObject([
      { ruleName: "Automation", type: "Business Rule" },
    ]);
  });

  it("rejects requests against a missing connection", async () => {
    const serviceWithoutSecondary = new dvService({
      primaryConnection: null,
      secondaryConnection: null,
      dvApi: { queryData: fixture.queryData, fetchXmlQuery: fixture.fetchXmlQuery } as unknown as DataverseAPI.API,
      onLog: fixture.onLog,
    });

    await expect(serviceWithoutSecondary.getAllTables(true)).rejects.toThrow("No connection available");
  });
});
