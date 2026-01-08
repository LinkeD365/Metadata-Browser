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

// Register ag-Grid modules once
if (typeof window !== "undefined") {
  const w = window as any;
  if (!w.__agGridModulesRegistered) {
    ModuleRegistry.registerModules([
      TextFilterModule,
      ClientSideRowModelModule,
      RowAutoHeightModule,
      RowSelectionModule,
    ]);
    w.__agGridModulesRegistered = true;
  }
}

// Shared theme configuration
export const agGridTheme = themeQuartz.withParams({
  headerHeight: "30px",
});
