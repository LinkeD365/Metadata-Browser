import { makeAutoObservable } from "mobx";
import { ColumnMeta } from "./columnMeta";
import { Solution } from "./solution";

export class TableMeta {
  tableName: string;
  displayName: string;
  metaId: string;

  columns: ColumnMeta[] = [];
  attributes: Attribute[] = [];
  keys: KeyMeta[] = [];

  Relationships: RelationshipMeta[] = [];
  columnSearch?: string;
  selectedColumns: Set<string> = new Set<string>();
  selectedRelationships: Set<string> = new Set<string>();
  relationshipSearch?: string;
  privileges: PrivilegeMeta[] = [];
  solutions: Solution[] = [];

  constructor() {
    this.tableName = "";
    this.displayName = "";
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

  attributes: Attribute[] = [];

  constructor() {
    this.keyName = "";
    makeAutoObservable(this);
  }
}

export class RelationshipMeta {
  relationshipName: string;
  type: string;
  attributes: Attribute[] = [];

  constructor() {
    this.relationshipName = "";
    this.type = "";
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
  attributes: Attribute[] = [];

  constructor() {
    this.privilegeName = "";
    makeAutoObservable(this);
  }
}
