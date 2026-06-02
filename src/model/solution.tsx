import { makeAutoObservable } from "mobx";

export class Solution {
  solutionId: string;
  solutionName: string;
  uniqueName: string;
  secondaryDisplayName?: string;
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  description?: string;
  version?: string;
  isManaged?: boolean;
  subcomponents?: boolean;

  attributes: { attributeName: string; attributeValue: string }[];

  constructor() {
    this.solutionId = "";
    this.solutionName = "";
    this.uniqueName = "";
    this.hasPrimaryConnection = false;
    this.hasSecondaryConnection = false;
    this.attributes = [];
    makeAutoObservable(this);
  }
}
