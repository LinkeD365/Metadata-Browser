import React from "react";

import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import {
  Button,
  Checkbox,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderTitle,
  InfoLabel,
  OverlayDrawer,
  Subtitle2,
} from "@fluentui/react-components";
import { ArrowExportUpRegular, Dismiss24Regular, Save16Filled } from "@fluentui/react-icons";
import { ExcelExport } from "../utils/excelExport";

interface ExportPopoverProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  isExportOpen: boolean;
  setIsExportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const ExportPopover = observer((props: ExportPopoverProps): React.JSX.Element => {
  const { connection, dvSvc, vm, isExportOpen, setIsExportOpen, onLog } = props;
  const [blockClose, setBlockClose] = React.useState(false);

  async function exportToExcel(): Promise<void> {
    console.log("Exporting to Excel...", vm.selectedTables);
    if (!vm.selectedTables || vm.selectedTables.length == 0) {
      onLog("No tables selected for export.", "warning");
      window.toolboxAPI.utils.showNotification({
        title: "Metadata Browser",
        body: "No tables selected for export.",
        type: "info",
      });
    }
    setBlockClose(true);
    var excelExporter = new ExcelExport({ dvsvc: dvSvc, connection: connection, vm: vm });
    console.log("Starting export...");
    await excelExporter.export(vm.selectedTables);
    setBlockClose(false);
    setIsExportOpen(false);
    return;
  }

  async function saveExportSettings(): Promise<void> {
    try {
      await window.toolboxAPI.settings.set("defaultExcelExportOptions", JSON.stringify(vm.excelOptions));
      window.toolboxAPI.utils.showNotification({
        title: "Default Saved",
        body: "Default Excel Export settings have been saved.",
        type: "success",
      });
    } catch (error) {
      window.toolboxAPI.utils.showNotification({
        title: "Save Failed",
        body: "Failed to save default column attributes.",
        type: "error",
      });
    }
  }

  return (
    <OverlayDrawer
      position="end"
      open={isExportOpen}
      modalType="alert"
      onOpenChange={(_, { open }) => setIsExportOpen(open)}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setIsExportOpen(false)}
              disabled={blockClose}
            />
          }
        >
          Export to Excel
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <div>
          <InfoLabel
            info={<>Ensure you select the appropriate columns in the tabs for export of columns and relationships. </>}
          >
            <Subtitle2>
              Select one or more tabs to include in the export Excel file. Each selected table will be created a a
              separate Workbook:
            </Subtitle2>
          </InfoLabel>

          <div>
            <Checkbox
              label="Include Table Details"
              checked={vm.excelOptions.includeTableDetails}
              onChange={(_, data) =>
                (vm.excelOptions.includeTableDetails = typeof data.checked === "boolean" ? data.checked : false)
              }
            />
            <Checkbox
              label="Include Columns"
              checked={vm.excelOptions.includeColumns}
              onChange={(_, data) =>
                (vm.excelOptions.includeColumns = typeof data.checked === "boolean" ? data.checked : false)
              }
            />
            <Checkbox
              label="Include Keys"
              checked={vm.excelOptions.includeKeys}
              onChange={(_, data) => (
                console.log("Include Keys changed:", data.checked),
                (vm.excelOptions.includeKeys = data.checked ? true : false)
              )}
            />
            <Checkbox
              label="Include Privileges"
              checked={vm.excelOptions.includePrivileges}
              onChange={(_, data) =>
                (vm.excelOptions.includePrivileges = typeof data.checked === "boolean" ? data.checked : false)
              }
            />
            <Checkbox
              label="Include Relationships"
              checked={vm.excelOptions.includeRelationships}
              onChange={(_, data) =>
                (vm.excelOptions.includeRelationships = typeof data.checked === "boolean" ? data.checked : false)
              }
            />
            <Checkbox
              label="Include Solutions"
              checked={vm.excelOptions.includeSolutions}
              onChange={(_, data) =>
                (vm.excelOptions.includeSolutions = typeof data.checked === "boolean" ? data.checked : false)
              }
            />
          </div>
        </div>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", width: "100%" }}>
        <Button
          style={{ marginLeft: "auto" }}
          icon={<ArrowExportUpRegular />}
          appearance="primary"
          onClick={exportToExcel}
          disabled={blockClose}
        >
          Export
        </Button>
        <Button
          style={{ marginLeft: "8px" }}
          icon={<Save16Filled />}
          appearance="subtle"
          onClick={saveExportSettings}
          disabled={blockClose}
        >
          Save Settings
        </Button>
      </DrawerFooter>
    </OverlayDrawer>
  );
});
