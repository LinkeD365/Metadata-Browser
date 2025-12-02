import { makeAutoObservable } from "mobx";
import { ColumnMeta } from "./columnMeta";

export class TableMeta {
  tableName: string;
  displayName: string;

  columns: ColumnMeta[] = [];
  attributes: TableAttribute[] = [];
  searchQuery?: string;

  constructor() {
    this.tableName = "";
    this.displayName = "";

    makeAutoObservable(this);
  }
}

export class TableAttribute {
  attributeName: string;
  attributeValue: string;
  constructor() {
    this.attributeName = "";
    this.attributeValue = "";
    makeAutoObservable(this);
  }
}
