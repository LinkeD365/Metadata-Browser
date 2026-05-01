import { makeAutoObservable } from "mobx";
import { Attribute } from "./tableMeta";

export class BusinessProcessFlowMeta {
  flowName: string;
  type: string;
  attributes: Attribute[] = [];

  constructor() {
    this.flowName = "";
    this.type = "Business Process Flow";
    makeAutoObservable(this);
  }
}
