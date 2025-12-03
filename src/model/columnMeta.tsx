import { makeAutoObservable } from "mobx";

export class ColumnMeta {
  columnName: string;
  displayName: string;
  dataType: string;

  attributes: ColumnAttribute[] = [];

  constructor() {
    this.columnName = "";
    this.displayName = "";
    this.dataType = "";
    makeAutoObservable(this);
  }
}

export class ColumnAttribute {
  attributeName: string;
  attributeValue: string;
  constructor() {
    this.attributeName = "";
    this.attributeValue = "";
    makeAutoObservable(this);
  }
}
