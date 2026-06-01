import { makeAutoObservable } from "mobx";
import { Attribute } from "./tableMeta";

export class ViewMeta {
  viewName: string;
  type: string;
  secondaryDisplayName?: string;
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  attributes: Attribute[] = [];

  constructor() {
    this.viewName = "";
    this.type = "";
    this.hasPrimaryConnection = false;
    this.hasSecondaryConnection = false;

    makeAutoObservable(this);
  }
}
