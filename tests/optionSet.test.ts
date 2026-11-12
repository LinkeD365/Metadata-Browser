import { describe, expect, it, vi } from "vitest";
import { ColumnMeta } from "../src/model/columnMeta";
import { mergeConnectionRecordSets } from "../src/utils/connectionComparison";
import { dvService } from "../src/utils/dataverse";

function setup() {
  const connections: ToolBoxAPI.DataverseConnection[] = [0, 1, 2, 3].map((index) => ({
    id: `slot-${index}`, name: `Slot ${index}`, url: `https://slot${index}.crm.dynamics.com`, environment: "Dev",
  }));
  const queryData = vi.fn<DataverseAPI.API["queryData"]>();
  const service = new dvService({
    connections,
    dvApi: { queryData, fetchXmlQuery: async () => ({ value: [] }) },
    onWarning: vi.fn(),
  });
  const column: ColumnMeta = Object.assign(new ColumnMeta(), {
    columnName: "custom_choice", optionSetType: "PicklistAttributeMetadata" as const,
  });
  return { service, queryData, column };
}

describe("column option metadata", () => {
  it("recognizes all choice types without exposing actions on other columns", async () => {
    const { service, queryData } = setup();
    queryData.mockResolvedValue({ value: [
      { LogicalName: "choice", AttributeType: "Picklist" },
      { LogicalName: "multi", AttributeType: "Virtual", AttributeTypeName: { Value: "MultiSelectPicklistType" } },
      { LogicalName: "yesno", AttributeType: "Boolean" },
      { LogicalName: "statecode", AttributeType: "State" },
      { LogicalName: "statuscode", AttributeType: "Status" },
      { LogicalName: "text", AttributeType: "String" },
      { LogicalName: "calculated", AttributeType: "Virtual" },
    ] });
    const columns = await service.getColumnsMeta("account");
    expect(columns.map((column) => column.optionSetType)).toEqual([
      "PicklistAttributeMetadata", "MultiSelectPicklistAttributeMetadata", "BooleanAttributeMetadata",
      "StateAttributeMetadata", "StatusAttributeMetadata", undefined, undefined,
    ]);
    expect(queryData).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("loads a choice with IsGlobal=%s, preserving option details and localized labels", async (isGlobal) => {
    const { service, queryData, column } = setup();
    queryData.mockImplementation(async () => ({ value: [], OptionSet: {
      Name: "custom_choice", IsGlobal: isGlobal,
      DisplayName: { UserLocalizedLabel: { Label: "Choice" } },
      Description: { LocalizedLabels: [{ Label: "Choice description" }] },
      Options: [{
        Value: 0,
        Label: { UserLocalizedLabel: { Label: "Current language" }, LocalizedLabels: [{ Label: "Other language" }] },
        Description: { LocalizedLabels: [{ Label: "Option description" }] },
        Color: "#abcdef", State: 0, DefaultStatus: 1, ExternalValue: "external",
      }, { Value: 100000000 }],
    } }));
    expect(await service.getColumnOptionSet("account", column, 3)).toEqual({
      name: "custom_choice", displayName: "Choice", description: "Choice description", isGlobal,
      options: [{
        value: 0, label: "Current language", description: "Option description",
        color: "#abcdef", state: 0, defaultStatus: 1, externalValue: "external",
      }, { value: 100000000, label: "", description: "" }],
    });
    expect(queryData).toHaveBeenCalledWith(
      "EntityDefinitions(LogicalName='account')/Attributes(LogicalName='custom_choice')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet", 3,
    );
  });

  it("loads both boolean values, including false/zero", async () => {
    const { service, queryData, column } = setup();
    column.optionSetType = "BooleanAttributeMetadata";
    queryData.mockImplementation(async () => ({ value: [], OptionSet: {
      IsGlobal: false,
      FalseOption: { Value: 0, Label: { UserLocalizedLabel: { Label: "No" } } },
      TrueOption: { Value: 1, Label: { UserLocalizedLabel: { Label: "Yes" } } },
    } }));
    const details = await service.getColumnOptionSet("account", column, 0);
    expect(details.options.map(({ value, label }) => ({ value, label }))).toEqual([
      { value: 0, label: "No" }, { value: 1, label: "Yes" },
    ]);
    expect(queryData.mock.calls[0][0]).toContain("/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?");
  });

  it.each(["MultiSelectPicklistAttributeMetadata", "StateAttributeMetadata", "StatusAttributeMetadata"] as const)(
    "uses the correct cast for %s and accepts an empty option list", async (type) => {
      const { service, queryData, column } = setup();
      column.optionSetType = type;
      queryData.mockImplementation(async () => ({ value: [], OptionSet: { IsGlobal: false, Options: [] } }));
      expect((await service.getColumnOptionSet("publisher's_table", column, 2)).options).toEqual([]);
      expect(queryData).toHaveBeenCalledWith(expect.stringContaining(`/Microsoft.Dynamics.CRM.${type}?`), 2);
      expect(queryData.mock.calls[0][0]).toContain("LogicalName='publisher''s_table'");
    },
  );

  it("targets a comparison-only column's source slot and escapes column identifiers", async () => {
    const { service, queryData, column } = setup();
    column.columnName = "publisher's_choice";
    const [merged] = mergeConnectionRecordSets([
      { records: [], getDisplayName: (record: ColumnMeta) => record.displayName },
      { records: [], getDisplayName: (record: ColumnMeta) => record.displayName },
      { records: [column], getDisplayName: (record: ColumnMeta) => record.displayName },
    ], (record) => record.columnName, ["displayName"]);
    queryData.mockImplementation(async () => ({ value: [], OptionSet: { IsGlobal: true, Options: [] } }));
    await service.getColumnOptionSet("account", merged, merged.sourceConnectionIndex);
    expect(queryData).toHaveBeenCalledWith(expect.stringContaining("LogicalName='publisher''s_choice'"), 2);
  });

  it.each([
    {}, { OptionSet: null }, { OptionSet: { IsGlobal: false } },
    { OptionSet: { IsGlobal: false, Options: [{ Value: null }] } },
  ])("rejects missing or incomplete option metadata instead of displaying an empty success", async (response) => {
    const { service, queryData, column } = setup();
    queryData.mockResolvedValue({ value: [], ...response });
    await expect(service.getColumnOptionSet("account", column)).rejects.toThrow();
  });

  it("rejects disconnected, unsupported, and failed requests", async () => {
    const { service, queryData, column } = setup();
    await expect(service.getColumnOptionSet("account", column, 4)).rejects.toThrow("No connection");
    await expect(service.getColumnOptionSet("account", new ColumnMeta())).rejects.toThrow("Column does not");
    expect(queryData).not.toHaveBeenCalled();
    queryData.mockRejectedValue(new Error("Access denied"));
    await expect(service.getColumnOptionSet("account", column)).rejects.toThrow("Access denied");
  });
});
