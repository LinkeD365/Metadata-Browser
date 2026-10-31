import { describe, expect, it } from "vitest";
import {
  parseColumnDefinitions, parseExcelOptions, parseRelationshipAttributes, parseStringArray,
} from "../src/utils/settings";

describe("saved preference validation", () => {
  it("loads supported attribute and export preferences", () => {
    expect(parseStringArray('["Description","LogicalName"]')).toEqual(["Description", "LogicalName"]);
    expect(parseColumnDefinitions('[{"name":"LogicalName"},{"name":"custom","custom":true}]')).toEqual([
      { name: "LogicalName", custom: false }, { name: "custom", custom: true },
    ]);
    expect(parseRelationshipAttributes('[{"attributeName":"SchemaName","type":"ManyToOneRelationship"}]',
      "ManyToOneRelationship")).toEqual([{ attributeName: "SchemaName", type: "ManyToOneRelationship" }]);
    expect(parseExcelOptions('{"includeColumns":false,"includeKeys":true}')).toEqual({
      includeColumns: false, includeKeys: true,
    });
  });

  it("rejects malformed JSON and wrong shapes instead of applying unsafe defaults", () => {
    expect(() => parseStringArray("{")).toThrow();
    expect(() => parseStringArray("{}")).toThrow();
    expect(() => parseStringArray("[1]")).toThrow();
    expect(() => parseColumnDefinitions('[{"name":42}]')).toThrow();
    expect(() => parseColumnDefinitions('[{"name":"one","custom":"false"}]')).toThrow();
    expect(() => parseRelationshipAttributes('[{"attributeName":"Name","type":"Wrong"}]', "ManyToOneRelationship"))
      .toThrow();
    expect(() => parseExcelOptions('{"includeColumns":"false"}')).toThrow();
    expect(() => parseExcelOptions("null")).toThrow();
  });
});
