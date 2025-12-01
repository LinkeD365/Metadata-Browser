import { makeAutoObservable } from "mobx";

export class Solution {
  solutionId: string;
  solutionName: string;
  uniqueName: string;
  
  constructor() {
    this.solutionId = "";
    this.solutionName = "";
    this.uniqueName = "";
    makeAutoObservable(this);
  }
}
