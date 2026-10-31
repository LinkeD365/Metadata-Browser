import { describe, expect, it } from "vitest";
import { getKeyRowId } from "../src/utils/keyMeta";

describe("key metadata", () => {
  it("uses logical names to distinguish keys with duplicate display labels", () => {
    const keys = [
      { keyName: "Display label", attributes: [{ attributeName: "LogicalName", attributeValue: "logical_key_one" }] },
      { keyName: "Display label", attributes: [{ attributeName: "LogicalName", attributeValue: "logical_key_two" }] },
    ];

    expect(keys.map(getKeyRowId)).toEqual(["logical_key_one", "logical_key_two"]);
  });
});
