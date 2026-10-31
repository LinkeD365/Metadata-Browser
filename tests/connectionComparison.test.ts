import { describe, expect, it } from "vitest";
import {
  createConnectionDisplayColumns,
  createConnectionRowClassRules,
  getConnectionDisplayLabel,
  mergeConnectionComparisonRecords,
  mergeConnectionRecordSets,
  type ConnectionComparisonRecord,
} from "../src/utils/connectionComparison";

interface NamedRecord extends ConnectionComparisonRecord {
  key: string;
  name: string;
}

describe("connection comparison", () => {
  it("merges matching records and retains secondary-only records", () => {
    const primary: NamedRecord[] = [
      { key: "shared", name: "Primary name", hasPrimaryConnection: false, hasSecondaryConnection: false },
    ];
    const secondary: NamedRecord[] = [
      { key: "shared", name: "Secondary name", hasPrimaryConnection: false, hasSecondaryConnection: false },
      { key: "secondary", name: "Only secondary", hasPrimaryConnection: false, hasSecondaryConnection: false },
    ];

    const result = mergeConnectionComparisonRecords(
      primary,
      secondary,
      (record) => record.key,
      (record) => record.name,
      ["name"],
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      key: "shared",
      name: "Primary name",
      hasPrimaryConnection: true,
      hasSecondaryConnection: true,
      secondaryDisplayName: "Secondary name",
    });
    expect(result[1]).toMatchObject({
      key: "secondary",
      name: "",
      hasPrimaryConnection: false,
      hasSecondaryConnection: true,
      secondaryDisplayName: "Only secondary",
    });
    expect(secondary[1].name).toBe("Only secondary");
  });

  it("identifies primary-only and non-primary-only row classes", () => {
    const rules = createConnectionRowClassRules<NamedRecord>(true);

    expect(
      rules["table-row-primary-only"]({
        data: { key: "a", name: "a", hasPrimaryConnection: true, hasSecondaryConnection: false },
      }),
    ).toBe(true);
    expect(
      rules["table-row-non-primary-only"]({
        data: { key: "b", name: "b", hasPrimaryConnection: false, hasSecondaryConnection: true },
      }),
    ).toBe(true);
    expect(rules["table-row-primary-only"]({})).toBe(false);
    expect(createConnectionRowClassRules<NamedRecord>(false)["table-row-primary-only"]({
      data: { key: "a", name: "a", hasPrimaryConnection: true, hasSecondaryConnection: false },
    })).toBe(false);
  });

  it("merges four environments while keeping each display name and the earliest source slot", () => {
    const records = mergeConnectionRecordSets(
      [
        { records: [{ key: "shared", name: "One", hasPrimaryConnection: false, hasSecondaryConnection: false }], getDisplayName: (record) => record.name },
        { records: [], getDisplayName: (record) => record.name },
        { records: [{ key: "shared", name: "Three", hasPrimaryConnection: false, hasSecondaryConnection: false }, { key: "four-only", name: "Four only", hasPrimaryConnection: false, hasSecondaryConnection: false }], getDisplayName: (record) => record.name },
        { records: [{ key: "shared", name: "Four", hasPrimaryConnection: false, hasSecondaryConnection: false }], getDisplayName: (record) => record.name },
      ],
      (record) => record.key,
      ["name"],
    );

    expect(records).toMatchObject([
      {
        key: "shared",
        connectionPresence: [true, undefined, true, true],
        connectionDisplayNames: ["One", undefined, "Three", "Four"],
        sourceConnectionIndex: 0,
      },
      {
        key: "four-only",
        connectionPresence: [undefined, undefined, true],
        connectionDisplayNames: [undefined, undefined, "Four only"],
        sourceConnectionIndex: 2,
      },
    ]);

    const columns = createConnectionDisplayColumns<NamedRecord>(
      [
        { id: "one", name: "One", url: "https://one.example", environment: "Dev" },
        { id: "two", name: "Two", url: "https://two.example", environment: "Test" },
        { id: "three", name: "Three", url: "https://three.example", environment: "UAT" },
        { id: "four", name: "Four", url: "https://four.example", environment: "Production" },
      ],
      "Table Name",
    );

    expect(columns.map((column) => column.headerName)).toEqual([
      "Table Name (Two)",
      "Table Name (Three)",
      "Table Name (Four)",
    ]);
  });

  it.each(["Table Name", "Column Name", "Key Name", "Privilege Name", "Relationship Name", "Name"])(
    "keeps the %s prefix for primary and comparison headers",
    (entityLabel) => {
      const connection: ToolBoxAPI.DataverseConnection = {
        id: "dev", name: "Development", url: "https://dev.example", environment: "Dev",
      };

      expect(getConnectionDisplayLabel(connection, 0, entityLabel)).toBe(`${entityLabel} (Development)`);
      expect(getConnectionDisplayLabel(connection, 3, entityLabel)).toBe(`${entityLabel} (Development)`);
      expect(createConnectionDisplayColumns<NamedRecord>([connection], entityLabel)).toEqual([]);
      expect(createConnectionDisplayColumns<NamedRecord>([connection, connection], entityLabel)[0].headerName)
        .toBe(`${entityLabel} (Development)`);
    },
  );

  it("keeps numbered fallback headers for missing or unnamed connections", () => {
    const connection: ToolBoxAPI.DataverseConnection = {
      id: "prod", name: "Production", url: "https://prod.example", environment: "Production",
    };

    expect(getConnectionDisplayLabel(null, 0, "Table Name")).toBe("Table Name (Environment 1)");
    expect(getConnectionDisplayLabel({ ...connection, name: "" }, 1, "Table Name")).toBe("Table Name (Environment 2)");
    expect(createConnectionDisplayColumns<NamedRecord>([connection, null, connection], "Table Name")
      .map((column) => column.headerName)).toEqual(["Table Name (Environment 2)", "Table Name (Production)"]);
  });
});
