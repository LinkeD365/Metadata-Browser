import { makeAutoObservable } from "mobx";
import { RelationshipAttribute, TableMeta } from "./tableMeta";
import { Solution } from "./solution";

export class ViewModel {
  tableMetadata: TableMeta[] = [];
  selectedTables: TableMeta[] = [];
  columnAttributes: string[] = [];
  relationshipAttributes: RelationshipAttribute[] = [];
  tableAttributes: string[] = [];
  solutions: Solution[] = [];
  selectedSolution?: Solution;

  constructor() {
    makeAutoObservable(this);
  }
}
