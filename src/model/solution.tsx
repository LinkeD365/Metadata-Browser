import { makeAutoObservable } from "mobx";

export class Solution {
  solutionId: string;
  solutionName: string;
  uniqueName: string;
  description?: string;
  version?: string;
  isManaged?: boolean;
  subcomponents?:boolean;
  
  attributes: { attributeName: string; attributeValue: string }[];

  constructor() {
    this.solutionId = "";
    this.solutionName = "";
    this.uniqueName = "";
    this.attributes = [];
    makeAutoObservable(this);
  }
}
