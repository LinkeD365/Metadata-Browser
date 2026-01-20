import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { KeyMeta, TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";

import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";

interface KeysProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Keys = observer((props: KeysProps): React.JSX.Element => {
  const { connection, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading keys for table: ${selectedTable.tableName}`, "info");
    console.log("Selected table in Keys component: ", selectedTable);
    if (selectedTable && selectedTable.keys?.length === 0) {
      getKeysMeta();
    }
  }, [selectedTable]);

  async function getKeysMeta() {
    if (!connection) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    console.log("Fetching keys metadata for table: ", selectedTable.tableName);

    setLoadingMeta(true);
    await dvService
      .getKeysMeta(selectedTable)
      .then((keys) => {
        console.log("Keys metadata loaded: ", keys);
        selectedTable.keys = keys;
        onLog(`Loaded ${keys.length} keys for table: ${selectedTable.tableName}`, "success");
      })
      .catch((error: { message: any }) => {
        onLog(`Error loading keys for table ${selectedTable.tableName}: ${error.message}`, "error");
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
  const createKeyAttr = React.useMemo<ColDef<KeyMeta>[]>(() => {
    if (!selectedTable.keys || selectedTable.keys.length === 0) {
      return [];
    }
    const cols = selectedTable.keys[0].attributes || [];
    return cols.map(
      (keyAttr) =>
        ({
          headerName: keyAttr.attributeName,
          valueGetter: (params) => {
            const attr = params.data?.attributes?.find((a) => a.attributeName === keyAttr.attributeName);
            return attr?.attributeValue || "";
          },
        }) as ColDef<KeyMeta>,
    );
  }, [selectedTable.keys.length]);

  const colDefs = React.useMemo<ColDef<KeyMeta>[]>(
    () => [{ headerName: "Key Name", field: "keyName", flex: 2 }, ...createKeyAttr],

    [createKeyAttr],
  );

  const keyColumnGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<KeyMeta>
        theme={agGridTheme}
        rowData={selectedTable.keys}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        getRowId={(params) => params.data?.keyName ?? ""}
      />
    </div>
  );

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Keys Metadata..." />;
  }
  return (
    <div>
      {selectedTable.keys.length === 0 && <div style={{ textAlign: "center" }}>No Keys found for this table.</div>}
      {selectedTable.keys.length > 0 && keyColumnGrid}
    </div>
  );
});
