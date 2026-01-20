import { makeAutoObservable } from "mobx";
import { RelationshipAttribute, TableMeta } from "./tableMeta";
import { Solution } from "./solution";

export class ViewModel {
  tableMetadata: TableMeta[] = [];
  selectedTables: TableMeta[] = [];
  columnAttributes: columnDefinition[] = [];
  relationshipAttributes: RelationshipAttribute[] = [];
  tableAttributes: string[] = [];
  solutions: Solution[] = [];
  selectedSolution?: Solution;

  excelOptions: ExcelOptions = new ExcelOptions();
  constructor() {
    makeAutoObservable(this);
  }
}

export class ExcelOptions {
  includeTableDetails: boolean = true;
  includeColumns: boolean = true;
  includeKeys: boolean = false;
  includePrivileges: boolean = false;
  includeRelationships: boolean = false;
  includeSolutions: boolean = false;
  constructor() {
    makeAutoObservable(this);
  }
}

export class columnDefinition {
  name: string = "";
  custom?: boolean = false;
}
