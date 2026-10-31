import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { PrivilegeMeta, TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";

import { ColDef, RowStyleModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { runReportedOperation } from "../utils/async";
import {
  createConnectionDisplayColumns,
  getConnectionDisplayLabel,
  createConnectionRowClassRules,
  loadConnectionRecordSets,
  mergeConnectionRecordSets,
} from "../utils/connectionComparison";

interface PrivilegesProps {
  connections: Array<ToolBoxAPI.DataverseConnection | null>;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Privileges = observer((props: PrivilegesProps): React.JSX.Element => {
  const { connections, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading privileges for table: ${selectedTable.tableName}`, "info");
    if (selectedTable && selectedTable.privileges?.length === 0) {
      getPrivileges();
    }
  }, [selectedTable]);

  async function getPrivileges() {
    if (!connections.some(Boolean)) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    await runReportedOperation(async () => {
      const privilegeSets = await loadConnectionRecordSets(
        connections,
        (index) => selectedTable.connectionPresence[index] ?? (index === 0 ? selectedTable.hasPrimaryConnection : index === 1 && selectedTable.hasSecondaryConnection),
        (index) => dvService.getPrivilegesMetadata(selectedTable, index),
        (privilege) => privilege.privilegeName,
      );

      selectedTable.privileges = mergeConnectionRecordSets(
        privilegeSets,
        (privilege) => privilege.privilegeName,
        ["privilegeName"],
      );
      onLog(`Loaded ${selectedTable.privileges.length} privileges for table: ${selectedTable.tableName}`, "success");
    }, setLoadingMeta, onLog, showNotification, "Unable to load privileges. Check the connections and permissions, then reopen this tab to retry.");
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
      {
        headerName: getConnectionDisplayLabel(connections[0] ?? null, 0, "Privilege Name"),
        field: "privilegeName",
        flex: 2,
        sort: "asc",
        valueGetter: (params) =>
          !params.data?.hasPrimaryConnection ? "" : (params.data?.privilegeName ?? ""),
      },
      ...createConnectionDisplayColumns<PrivilegeMeta>(connections, "Privilege Name"),
      ...createPrivilegeAttr,
    ],

    [connections, createPrivilegeAttr],
  );

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<PrivilegeMeta>(connections.filter(Boolean).length > 1),
    [connections],
  );

  const privilegesGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<PrivilegeMeta>
        theme={agGridTheme}
        modules={[RowStyleModule]}
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
