import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { PrivilegeMeta, TableMeta } from "../model/tableMeta";
import {
  Spinner,
} from "@fluentui/react-components";

import {
  ColDef,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";

interface PrivilegesProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Privileges = observer((props: PrivilegesProps): React.JSX.Element => {
  const { connection, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading privileges for table: ${selectedTable.tableName}`, "info");
    console.log("Selected table in Privileges component: ", selectedTable);
    if (selectedTable && selectedTable.privileges?.length === 0) {
      getPrivileges();
    }
  }, [selectedTable]);

  async function getPrivileges() {
    if (!connection) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    console.log("Fetching privileges metadata for table: ", selectedTable.tableName);

    setLoadingMeta(true);
    await dvService
      .loadPrivilegesMetadata(selectedTable)
      .then((privileges) => {
        console.log("Privileges metadata loaded: ", privileges);
        selectedTable.privileges = privileges;
        onLog(`Loaded ${privileges.length} privileges for table: ${selectedTable.tableName}`, "success");
      })
      .catch((error: { message: any }) => {
        onLog(`Error loading privileges for table ${selectedTable.tableName}: ${error.message}`, "error");
      });
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
        } as ColDef<PrivilegeMeta>)
    );
  }, [selectedTable.privileges.length]);

  const colDefs = React.useMemo<ColDef<PrivilegeMeta>[]>(
    () => [{ headerName: "Privilege Name", field: "privilegeName", flex: 2 }, ...createPrivilegeAttr],

    [createPrivilegeAttr]
  );

  const privilegesGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<PrivilegeMeta>
        theme={agGridTheme}
        rowData={selectedTable.privileges}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        getRowId={(params) => params.data?.privilegeName ?? ""}
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
