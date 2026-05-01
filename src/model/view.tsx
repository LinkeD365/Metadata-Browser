import { makeAutoObservable } from "mobx";
import { Attribute } from "./tableMeta";

export class ViewMeta {
  viewName: string;
  type: string;
  attributes: Attribute[] = [];

  constructor() {
    this.viewName = "";
    this.type = "";

    makeAutoObservable(this);
  }
}
