import { describe, expect, it } from "vitest";
import {
  createConnectionRowClassRules,
  mergeConnectionComparisonRecords,
  type ConnectionComparisonRecord,
} from "../src/utils/connectionComparison";

type Record = ConnectionComparisonRecord & { name: string; key: string; secondaryName?: string };

describe("connection comparison helpers", () => {
  it("marks primary-only records", () => {
    const primary: Record[] = [{ key: "a", name: "Alpha", hasPrimaryConnection: false, hasSecondaryConnection: false }];

    const result = mergeConnectionComparisonRecords(primary, [], (row) => row.key, (row) => row.name);

    expect(result).toEqual([
      { key: "a", name: "Alpha", hasPrimaryConnection: true, hasSecondaryConnection: false },
    ]);
  });

  it("merges matching records and retains the secondary display name", () => {
    const primary: Record[] = [{ key: "a", name: "Primary", hasPrimaryConnection: false, hasSecondaryConnection: false }];
    const secondary: Record[] = [{ key: "a", name: "Secondary", hasPrimaryConnection: false, hasSecondaryConnection: false }];

    const result = mergeConnectionComparisonRecords(primary, secondary, (row) => row.key, (row) => row.name);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Primary",
      secondaryDisplayName: "Secondary",
      hasPrimaryConnection: true,
      hasSecondaryConnection: true,
    });
  });

  it("clears selected primary display fields for secondary-only records", () => {
    const secondary: Record[] = [{ key: "b", name: "Secondary", hasPrimaryConnection: false, hasSecondaryConnection: false }];

    const result = mergeConnectionComparisonRecords( [], secondary, (row) => row.key, (row) => row.name, ["name"]);

    expect(result[0]).toMatchObject({
      name: "",
      secondaryDisplayName: "Secondary",
      hasPrimaryConnection: false,
      hasSecondaryConnection: true,
    });
  });

  it("creates row rules only for a configured secondary connection", () => {
    const onlyPrimary = createConnectionRowClassRules<Record>(true);
    const onlySecondary = createConnectionRowClassRules<Record>(true);
    const both = createConnectionRowClassRules<Record>(true);
    const unconfigured = createConnectionRowClassRules<Record>(false);

    expect(onlyPrimary["table-row-primary-only"]({ data: { key: "a", name: "A", hasPrimaryConnection: true, hasSecondaryConnection: false } })).toBe(true);
    expect(onlySecondary["table-row-secondary-only"]({ data: { key: "b", name: "B", hasPrimaryConnection: false, hasSecondaryConnection: true } })).toBe(true);
    expect(both["table-row-primary-only"]({ data: { key: "c", name: "C", hasPrimaryConnection: true, hasSecondaryConnection: true } })).toBe(false);
    expect(unconfigured["table-row-primary-only"]({ data: { key: "a", name: "A", hasPrimaryConnection: true, hasSecondaryConnection: false } })).toBe(false);
  });
});
