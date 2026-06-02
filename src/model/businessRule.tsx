import { makeAutoObservable } from "mobx";
import { Attribute } from "./tableMeta";

export class BusinessRuleMeta {
  ruleName: string;
  type: string;
  secondaryDisplayName?: string;
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  attributes: Attribute[] = [];

  constructor() {
    this.ruleName = "";
    this.type = "Business Rule";
    this.hasPrimaryConnection = false;
    this.hasSecondaryConnection = false;
    makeAutoObservable(this);
  }
}
