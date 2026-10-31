import { describe, expect, it } from "vitest";
import { isObservableProp } from "mobx";
import { BusinessProcessFlowMeta } from "../src/model/businessProcessFlow";
import { BusinessRuleMeta } from "../src/model/businessRule";
import { ColumnMeta } from "../src/model/columnMeta";
import { Solution } from "../src/model/solution";
import { Attribute, RelationshipAttribute, TableMeta } from "../src/model/tableMeta";
import { ViewModel } from "../src/model/ViewModel";
import { ViewMeta } from "../src/model/view";

describe("metadata models", () => {
  it("initializes metadata records with defaults and observable state", () => {
    const table = new TableMeta();
    const column = new ColumnMeta();
    const solution = new Solution();
    const view = new ViewMeta();
    const flow = new BusinessProcessFlowMeta();
    const rule = new BusinessRuleMeta();
    const attribute = new Attribute();
    const relationshipAttribute = new RelationshipAttribute();

    expect(table.tableName).toBe("");
    expect(table.columns).toEqual([]);
    expect(column.dataType).toBe("");
    expect(solution.uniqueName).toBe("");
    expect(view.type).toBe("");
    expect(flow.type).toBe("Business Process Flow");
    expect(rule.type).toBe("Business Rule");
    expect(attribute.attributeValue).toBe("");
    expect(relationshipAttribute.type).toBe("");
    expect(isObservableProp(table, "tableName")).toBe(true);
    expect(isObservableProp(column, "columnName")).toBe(true);
  });

  it("initializes view-model defaults and keeps settings observable", () => {
    const vm = new ViewModel();

    expect(vm.tableMetadata).toEqual([]);
    expect(vm.selectedTables).toEqual([]);
    expect(vm.excelOptions.includeTableDetails).toBe(true);
    expect(vm.excelOptions.includeColumns).toBe(true);
    expect(vm.excelOptions.includeKeys).toBe(false);
    expect(isObservableProp(vm, "tableMetadata")).toBe(true);
    expect(isObservableProp(vm.excelOptions, "includeTableDetails")).toBe(true);
  });
});
