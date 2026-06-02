import { makeAutoObservable } from "mobx";
import { Attribute } from "./tableMeta";

export class BusinessProcessFlowMeta {
  flowName: string;
  type: string;
  secondaryDisplayName?: string;
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  attributes: Attribute[] = [];

  constructor() {
    this.flowName = "";
    this.type = "Business Process Flow";
    this.hasPrimaryConnection = false;
    this.hasSecondaryConnection = false;
    makeAutoObservable(this);
  }
}
