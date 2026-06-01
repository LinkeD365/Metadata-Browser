import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { KeyMeta, TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";

import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { createConnectionRowClassRules, mergeConnectionComparisonRecords } from "../utils/connectionComparison";

interface KeysProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  secondaryConnection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Keys = observer((props: KeysProps): React.JSX.Element => {
  const { connection, secondaryConnection, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading keys for table: ${selectedTable.tableName}`, "info");
    console.log("Selected table in Keys component: ", selectedTable);
    if (selectedTable && selectedTable.keys?.length === 0) {
      getKeysMeta();
    }
  }, [selectedTable]);

  async function getKeysMeta() {
    const canLoadPrimary = Boolean(connection && selectedTable.hasPrimaryConnection);
    const canLoadSecondary = Boolean(secondaryConnection && selectedTable.hasSecondaryConnection);

    if (!canLoadPrimary && !canLoadSecondary) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    console.log("Fetching keys metadata for table: ", selectedTable.tableName);

    setLoadingMeta(true);
    const [primaryKeys, secondaryKeys] = await Promise.all([
      canLoadPrimary ? dvService.getKeysMeta(selectedTable, "primary") : Promise.resolve([]),
      canLoadSecondary ? dvService.getKeysMeta(selectedTable, "secondary") : Promise.resolve([]),
    ]);

    selectedTable.keys = mergeConnectionComparisonRecords(
      primaryKeys,
      secondaryKeys,
      (keyMeta) => keyMeta.keyName,
      (keyMeta) => keyMeta.keyName,
    );
    onLog(`Loaded ${selectedTable.keys.length} keys for table: ${selectedTable.tableName}`, "success");
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
    () => [
      { headerName: "Key Name", field: "keyName", flex: 2, sort: "asc" },
      ...(secondaryConnection
        ? [
            {
              headerName: secondaryConnection.name ? `2nd Key Name (${secondaryConnection.name})` : "2nd Key Name",
              field: "secondaryDisplayName",
              valueGetter: (params) =>
                params.data?.hasSecondaryConnection ? params.data.secondaryDisplayName || "" : "",
            } as ColDef<KeyMeta>,
          ]
        : []),
      ...createKeyAttr,
    ],

    [createKeyAttr, secondaryConnection],
  );

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<KeyMeta>(Boolean(secondaryConnection)),
    [secondaryConnection],
  );

  const keyColumnGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<KeyMeta>
        theme={agGridTheme}
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
