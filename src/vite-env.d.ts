/// <reference types="@pptb/types" />

declare global {
  interface Window {
    toolboxAPI: typeof import("@pptb/types").toolboxAPI;
    dataverseAPI: typeof import("@pptb/types").dataverseAPI;
  }
}

declare namespace ToolBoxAPI {
  interface UtilsAPI {
    openInConnectionBrowser: (url: string, connectionTarget?: ToolBoxAPI.ConnectionTarget) => Promise<void>;
  }
}

export {};
