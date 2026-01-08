import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  themeQuartz,
  RowAutoHeightModule,
  RowSelectionModule,
} from "ag-grid-community";

import "ag-grid-community/styles/ag-theme-quartz.css";

// Extend Window interface to track ag-Grid module registration status and prevent duplicate registration
declare global {
  interface Window {
    __agGridModulesRegistered?: boolean;
  }
}

// Register ag-Grid modules once
if (typeof window !== "undefined") {
  if (!window.__agGridModulesRegistered) {
    ModuleRegistry.registerModules([
      TextFilterModule,
      ClientSideRowModelModule,
      RowAutoHeightModule,
      RowSelectionModule,
    ]);
    window.__agGridModulesRegistered = true;
  }
}

// Shared theme configuration
export const agGridTheme = themeQuartz.withParams({
  headerHeight: 30,
});
