import { makeAutoObservable } from "mobx";
import { TableMeta } from "./tableMeta";
import { Solution } from "./solution";

export class ViewModel {
  tableMetadata: TableMeta[] = [];
  selectedTables: TableMeta[] = [];
  fieldColummns: string[] = [];
  tableColumns: string[] = [];
  solutions: Solution[] = [];
  selectedSolution?: Solution;

  constructor() {
    makeAutoObservable(this);
  }
}
