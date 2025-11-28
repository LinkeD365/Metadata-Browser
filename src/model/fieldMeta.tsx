import { makeAutoObservable } from "mobx";

export class FieldMeta {
  fieldName: string;
  displayName: string;

  attributes: FieldAttribute[] = [];
  
  constructor() {
    this.fieldName = "";
    this.displayName = "";
    makeAutoObservable(this);
  }
}

export class FieldAttribute {
  attributeName: string;
  attributeValue: string;
  constructor() {
    this.attributeName = "";
    this.attributeValue = "";
    makeAutoObservable(this);
  }
}