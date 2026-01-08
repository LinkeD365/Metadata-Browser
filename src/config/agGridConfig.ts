import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  themeQuartz,
  RowAutoHeightModule,
  RowSelectionModule,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Extend Window interface to include ag-Grid registration flag
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
  headerHeight: "30px",
});
