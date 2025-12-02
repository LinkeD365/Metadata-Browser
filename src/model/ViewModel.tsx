import { makeAutoObservable } from "mobx";
import { TableMeta } from "./tableMeta";
import { Solution } from "./solution";

export class ViewModel {
  tableMetadata: TableMeta[] = [];
  selectedTables: TableMeta[] = [];
  columnAttributes: string[] = [];
  tableAttributes: string[] = [];
  solutions: Solution[] = [];
  selectedSolution?: Solution;

  constructor() {
    makeAutoObservable(this);
  }
}
