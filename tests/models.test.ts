import { describe, expect, it } from "vitest";
import { BusinessProcessFlowMeta } from "../src/model/businessProcessFlow";
import { BusinessRuleMeta } from "../src/model/businessRule";
import { ColumnMeta } from "../src/model/columnMeta";
import { ExcelOptions, ViewModel } from "../src/model/ViewModel";
import { Solution } from "../src/model/solution";
import { Attribute, KeyMeta, PrivilegeMeta, RelationshipAttribute, RelationshipMeta, TableMeta } from "../src/model/tableMeta";
import { ViewMeta } from "../src/model/view";

describe("metadata models", () => {
  it("initializes view-model collections and export defaults", () => {
    const viewModel = new ViewModel();

    expect(viewModel.tableMetadata).toEqual([]);
    expect(viewModel.selectedTables).toEqual([]);
    expect(viewModel.solutions).toEqual([]);
    expect(viewModel.excelOptions).toMatchObject({
      includeTableDetails: true,
      includeColumns: true,
      includeKeys: false,
      includePrivileges: false,
      includeRelationships: false,
      includeSolutions: false,
    });
  });

  it("allows each export option to be configured independently", () => {
    const options = new ExcelOptions();
    options.includeColumns = false;
    options.includeRelationships = true;

    expect(options.includeColumns).toBe(false);
    expect(options.includeRelationships).toBe(true);
    expect(options.includeTableDetails).toBe(true);
  });

  it("initializes table metadata and selection state", () => {
    const table = new TableMeta();

    expect(table).toMatchObject({
      tableName: "",
      primaryDisplayName: "",
      hasPrimaryConnection: false,
      hasSecondaryConnection: false,
      metaId: "",
      columns: [],
      attributes: [],
      keys: [],
      relationships: [],
      privileges: [],
      solutions: [],
      views: [],
      businessProcessFlows: [],
      businessRules: [],
    });
    expect(table.selectedColumns.size).toBe(0);
    expect(table.selectedRelationships.size).toBe(0);
  });

  it("initializes leaf metadata models with stable defaults", () => {
    expect(new Attribute()).toMatchObject({ attributeName: "", attributeValue: "" });
    expect(new ColumnMeta()).toMatchObject({ columnName: "", displayName: "", dataType: "" });
    expect(new KeyMeta()).toMatchObject({ keyName: "", attributes: [] });
    expect(new RelationshipMeta()).toMatchObject({ relationshipName: "", type: "", attributes: [] });
    expect(new RelationshipAttribute()).toMatchObject({ attributeName: "", type: "" });
    expect(new PrivilegeMeta()).toMatchObject({ privilegeName: "", attributes: [] });
    expect(new Solution()).toMatchObject({ solutionId: "", solutionName: "", uniqueName: "", attributes: [] });
    expect(new ViewMeta()).toMatchObject({ viewName: "", type: "", attributes: [] });
    expect(new BusinessProcessFlowMeta()).toMatchObject({
      flowName: "",
      type: "Business Process Flow",
      attributes: [],
    });
    expect(new BusinessRuleMeta()).toMatchObject({ ruleName: "", type: "Business Rule", attributes: [] });
  });
});
