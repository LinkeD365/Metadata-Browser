import { afterEach, describe, expect, it, vi } from "vitest";
import { dvService } from "../src/utils/dataverse";

const primaryConnection: ToolBoxAPI.DataverseConnection = {
  id: "primary",
  name: "Primary",
  url: "https://primary.example",
  environment: "Dev",
};

function createService(
  queryData: DataverseAPI.API["queryData"],
  onLog = vi.fn(),
  fetchXmlQuery: DataverseAPI.API["fetchXmlQuery"] = async () => ({ value: [] }),
  connections: Array<ToolBoxAPI.DataverseConnection | null> = [primaryConnection],
) {
  const dvApi: Pick<DataverseAPI.API, "queryData" | "fetchXmlQuery"> = {
    queryData,
    fetchXmlQuery,
  };
  return {
    service: new dvService({
      connections,
      dvApi,
      onLog,
    }),
    onLog,
  };
}

describe("dvService solution metadata", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("limits concurrent component lookups and preserves result order without logging metadata", async () => {
    const objectIds = Array.from({ length: 13 }, (_, index) => `id-${index}`);
    const components = objectIds.map((objectid, index) => ({
      objectid: index % 3 === 0 ? objectid : index % 3 === 1 ? { Id: objectid } : { objectid },
    }));
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { service } = createService(async (query) => {
      const objectId = query.match(/^EntityDefinitions\((.+)\)$/)?.[1];
      if (!objectId) {
        throw new Error("Unexpected query");
      }

      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 2));
      activeRequests -= 1;

      return {
        value: [{ LogicalName: `table_${objectId}`, MetadataId: objectId }],
      };
    }, vi.fn(), async () => ({ value: components }));

    const tables = await service.getSolutionTables("solution");

    expect(maximumActiveRequests).toBeLessThanOrEqual(5);
    expect(maximumActiveRequests).toBeGreaterThan(1);
    expect(tables.map((table) => table.tableName)).toEqual(objectIds.map((objectid) => `table_${objectid}`));
    expect(consoleLog).not.toHaveBeenCalled();
  });

  it("escapes solution names and skips failed individual lookups without logging error details", async () => {
    const fetchQueries: string[] = [];
    const onLog = vi.fn();
    const { service } = createService(async (query) => {
      if (query === "EntityDefinitions(bad)") {
        throw new Error("Sensitive response detail");
      }
      return { value: [{ LogicalName: "good_table", MetadataId: "good" }] };
    }, onLog, async (fetchXml) => {
      fetchQueries.push(fetchXml);
      return { value: [{ objectid: "good" }, { objectid: "bad" }] };
    });

    const tables = await service.getSolutionTables("publisher's solution");

    expect(fetchQueries[0]).toContain('value="publisher&apos;s solution"');
    expect(tables.map((table) => table.tableName)).toEqual(["good_table"]);
    expect(onLog).toHaveBeenCalledWith(
      "Failed to fetch metadata for a table in the selected solution.",
      "warning",
    );
    expect(onLog).not.toHaveBeenCalledWith(expect.stringContaining("Sensitive response detail"), expect.anything());
  });

  it("rejects solution reads when the selected connection is unavailable", async () => {
    const dvApi: Pick<DataverseAPI.API, "queryData" | "fetchXmlQuery"> = {
      queryData: async () => ({ value: [] }),
      fetchXmlQuery: async () => ({ value: [] }),
    };
    const service = new dvService({
      connections: [null],
      dvApi,
      onLog: vi.fn(),
    });

    await expect(service.getSolutionTables("solution")).rejects.toThrow("No connection available");
  });

  it("targets each of four connected environments by its numeric slot", async () => {
    const targets: number[] = [];
    const connections = Array.from({ length: 4 }, (_, index) => ({
      ...primaryConnection,
      id: `environment-${index + 1}`,
    }));
    const { service } = createService(
      async (_query, target) => {
        targets.push(target as number);
        return { value: [{ LogicalName: `table_${target}`, MetadataId: `meta_${target}` }] };
      },
      vi.fn(),
      async () => ({ value: [] }),
      connections,
    );

    for (let index = 0; index < connections.length; index += 1) {
      await service.getAllTables(index);
    }

    expect(targets).toEqual([0, 1, 2, 3]);
  });
});
