import { makeAutoObservable } from "mobx";
import { TableMeta } from "./tableMeta";

export class ViewModel {
  orgId: string;

  tableMetadata: TableMeta[] = [];
  selectedTables: TableMeta[] = [];
  
  constructor() {
    this.orgId = "";
    makeAutoObservable(this);
  }
}
