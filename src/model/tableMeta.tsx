import { makeAutoObservable } from "mobx";
import { FieldMeta } from "./fieldMeta";

export class TableMeta {
  tableName: string;
  displayName: string;

  fields: FieldMeta[] = [];

  constructor() {
    this.tableName = "";
    this.displayName = "";

    makeAutoObservable(this);
  }
}
