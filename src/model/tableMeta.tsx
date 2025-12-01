import { makeAutoObservable } from "mobx";
import { FieldMeta } from "./fieldMeta";

export class TableMeta {
  tableName: string;
  displayName: string;

  fields: FieldMeta[] = [];
  attributes: TableAttribute[] = [];

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
