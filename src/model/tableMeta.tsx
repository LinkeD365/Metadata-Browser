import { makeAutoObservable } from "mobx";
import { ColumnMeta } from "./columnMeta";
import { Solution } from "./solution";
import { ViewMeta } from "./view";
import { BusinessProcessFlowMeta } from "./businessProcessFlow";
import { BusinessRuleMeta } from "./businessRule";

export class TableMeta {
  tableName: string;
  primaryDisplayName: string;
  secondaryDisplayName?: string;
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  metaId: string;

  columns: ColumnMeta[] = [];
  attributes: Attribute[] = [];
  keys: KeyMeta[] = [];

  relationships: RelationshipMeta[] = [];
  columnSearch?: string;
  selectedColumns: Set<string> = new Set<string>();
  selectedRelationships: Set<string> = new Set<string>();
  relationshipSearch?: string;
  privileges: PrivilegeMeta[] = [];
  solutions: Solution[] = [];
  views: ViewMeta[] = [];
  viewSearch?: string;
  businessProcessFlows: BusinessProcessFlowMeta[] = [];
  businessProcessFlowSearch?: string;
  businessRules: BusinessRuleMeta[] = [];
  businessRuleSearch?: string;
  typeCode: any;

  constructor() {
    this.tableName = "";
    this.primaryDisplayName = "";
    this.hasPrimaryConnection = false;
    this.hasSecondaryConnection = false;
    this.metaId = "";

    makeAutoObservable(this);
  }
}

export class Attribute {
  attributeName: string;
  attributeValue: string;
  constructor() {
    this.attributeName = "";
    this.attributeValue = "";
    makeAutoObservable(this);
  }
}

export class KeyMeta {
  keyName: string;
  secondaryDisplayName?: string;
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;

  attributes: Attribute[] = [];

  constructor() {
    this.keyName = "";
    this.hasPrimaryConnection = false;
    this.hasSecondaryConnection = false;
    makeAutoObservable(this);
  }
}

export class RelationshipMeta {
  relationshipName: string;
  type: string;
  secondaryDisplayName?: string;
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  attributes: Attribute[] = [];

  constructor() {
    this.relationshipName = "";
    this.type = "";
    this.hasPrimaryConnection = false;
    this.hasSecondaryConnection = false;
    makeAutoObservable(this);
  }
}

export class RelationshipAttribute {
  attributeName: string;
  type: string;

  constructor() {
    this.attributeName = "";
    this.type = "";
    makeAutoObservable(this);
  }
}

export class PrivilegeMeta {
  privilegeName: string;
  secondaryDisplayName?: string;
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  attributes: Attribute[] = [];

  constructor() {
    this.privilegeName = "";
    this.hasPrimaryConnection = false;
    this.hasSecondaryConnection = false;
    makeAutoObservable(this);
  }
}
