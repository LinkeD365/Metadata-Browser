import { makeAutoObservable } from "mobx";
import { Attribute } from "./tableMeta";

export class BusinessRuleMeta {
  ruleName: string;
  type: string;
  attributes: Attribute[] = [];

  constructor() {
    this.ruleName = "";
    this.type = "Business Rule";
    makeAutoObservable(this);
  }
}
