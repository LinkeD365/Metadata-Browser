import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { KeyMeta, TableMeta } from "../model/tableMeta";
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

interface KeysProps {
  connections: Array<ToolBoxAPI.DataverseConnection | null>;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Keys = observer((props: KeysProps): React.JSX.Element => {
  const { connections, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading keys for table: ${selectedTable.tableName}`, "info");
    if (selectedTable && selectedTable.keys?.length === 0) {
      getKeysMeta();
    }
  }, [selectedTable]);

  async function getKeysMeta() {
    if (!connections.some(Boolean)) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    await runReportedOperation(async () => {
      const keySets = await loadConnectionRecordSets(
        connections,
        (index) => selectedTable.connectionPresence[index] ?? (index === 0 ? selectedTable.hasPrimaryConnection : index === 1 && selectedTable.hasSecondaryConnection),
        (index) => dvService.getKeysMeta(selectedTable, index),
        (keyMeta) => keyMeta.keyName,
      );

      selectedTable.keys = mergeConnectionRecordSets(
        keySets,
        (keyMeta) => keyMeta.attributes.find((attribute) => attribute.attributeName === "LogicalName")?.attributeValue || keyMeta.keyName,
        ["keyName"],
      );
      onLog(`Loaded ${selectedTable.keys.length} keys for table: ${selectedTable.tableName}`, "success");
    }, setLoadingMeta, onLog, showNotification, "Unable to load keys. Check the connections and permissions, then reopen this tab to retry.");
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
    () => [
      {
        headerName: getConnectionDisplayLabel(connections[0] ?? null, 0, "Key Name"),
        field: "keyName",
        flex: 2,
        sort: "asc",
        valueGetter: (params) =>
          !params.data?.hasPrimaryConnection ? "" : (params.data?.keyName ?? ""),
      },
      ...createConnectionDisplayColumns<KeyMeta>(connections, "Key Name"),
      ...createKeyAttr,
    ],

    [connections, createKeyAttr],
  );

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<KeyMeta>(connections.filter(Boolean).length > 1),
    [connections],
  );

  const keyColumnGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<KeyMeta>
        theme={agGridTheme}
        modules={[RowStyleModule]}
        rowData={selectedTable.keys}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowClassRules={rowClassRules}
        getRowId={(params) => params.data?.keyName ?? ""}
        enableCellTextSelection={true}
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
