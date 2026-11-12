import { makeAutoObservable } from "mobx";
import type { OptionSetAttributeType } from "./optionSet";

export class ColumnMeta {
  columnName: string;
  displayName: string;
  secondaryDisplayName?: string;
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  dataType: string;
  optionSetType?: OptionSetAttributeType;
  sourceConnectionIndex?: number;

  attributes: ColumnAttribute[] = [];

  constructor() {
    this.columnName = "";
    this.displayName = "";
    this.hasPrimaryConnection = false;
    this.hasSecondaryConnection = false;
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
