import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { PrivilegeMeta, TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";

import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { createConnectionRowClassRules, mergeConnectionComparisonRecords } from "../utils/connectionComparison";

interface PrivilegesProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  secondaryConnection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Privileges = observer((props: PrivilegesProps): React.JSX.Element => {
  const { connection, secondaryConnection, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading privileges for table: ${selectedTable.tableName}`, "info");
    console.log("Selected table in Privileges component: ", selectedTable);
    if (selectedTable && selectedTable.privileges?.length === 0) {
      getPrivileges();
    }
  }, [selectedTable]);

  async function getPrivileges() {
    const canLoadPrimary = Boolean(connection && selectedTable.hasPrimaryConnection);
    const canLoadSecondary = Boolean(secondaryConnection && selectedTable.hasSecondaryConnection);

    if (!canLoadPrimary && !canLoadSecondary) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    console.log("Fetching privileges metadata for table: ", selectedTable.tableName);

    setLoadingMeta(true);
    const [primaryPrivileges, secondaryPrivileges] = await Promise.all([
      canLoadPrimary ? dvService.getPrivilegesMetadata(selectedTable, "primary") : Promise.resolve([]),
      canLoadSecondary ? dvService.getPrivilegesMetadata(selectedTable, "secondary") : Promise.resolve([]),
    ]);

    selectedTable.privileges = mergeConnectionComparisonRecords(
      primaryPrivileges,
      secondaryPrivileges,
      (privilege) => privilege.privilegeName,
      (privilege) => privilege.privilegeName,
    );
    onLog(`Loaded ${selectedTable.privileges.length} privileges for table: ${selectedTable.tableName}`, "success");
    setLoadingMeta(false);
    return;
  }

  const defaultColDefs = React.useMemo<ColDef>(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      filter: true,
      wrapText: true,
      autoHeight: true,
    };
  }, []);
  const createPrivilegeAttr = React.useMemo<ColDef<PrivilegeMeta>[]>(() => {
    if (!selectedTable.privileges || selectedTable.privileges.length === 0) {
      return [];
    }
    const cols = selectedTable.privileges[0].attributes || [];
    return cols.map(
      (keyAttr) =>
        ({
          headerName: keyAttr.attributeName,
          valueGetter: (params) => {
            const attr = params.data?.attributes?.find((a) => a.attributeName === keyAttr.attributeName);
            return attr?.attributeValue || "";
          },
        }) as ColDef<PrivilegeMeta>,
    );
  }, [selectedTable.privileges.length]);

  const colDefs = React.useMemo<ColDef<PrivilegeMeta>[]>(
    () => [
      { headerName: "Privilege Name", field: "privilegeName", flex: 2, sort: "asc" },
      ...(secondaryConnection
        ? [
            {
              headerName: secondaryConnection.name
                ? `2nd Privilege Name (${secondaryConnection.name})`
                : "2nd Privilege Name",
              field: "secondaryDisplayName",
              valueGetter: (params) =>
                params.data?.hasSecondaryConnection ? params.data.secondaryDisplayName || "" : "",
            } as ColDef<PrivilegeMeta>,
          ]
        : []),
      ...createPrivilegeAttr,
    ],

    [createPrivilegeAttr, secondaryConnection],
  );

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<PrivilegeMeta>(Boolean(secondaryConnection)),
    [secondaryConnection],
  );

  const privilegesGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<PrivilegeMeta>
        theme={agGridTheme}
        rowData={selectedTable.privileges}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowClassRules={rowClassRules}
        getRowId={(params) => params.data?.privilegeName ?? ""}
        enableCellTextSelection={true}
      />
    </div>
  );

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Privileges Metadata..." />;
  }
  return (
    <div>
      {selectedTable.privileges.length === 0 && (
        <div style={{ textAlign: "center" }}>No Privileges found for this table.</div>
      )}
      {selectedTable.privileges.length > 0 && privilegesGrid}
    </div>
  );
});
