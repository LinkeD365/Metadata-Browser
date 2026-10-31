import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";
import { ColDef, RowStyleModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { Solution } from "../model/solution";
import {
  createConnectionDisplayColumns,
  createConnectionRowClassRules,
  loadConnectionRecordSets,
  mergeConnectionRecordSets,
} from "../utils/connectionComparison";

interface SolutionsProps {
  connections: Array<ToolBoxAPI.DataverseConnection | null>;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Solutions = observer((props: SolutionsProps): React.JSX.Element => {
  const { connections, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading solutions for table: ${selectedTable.tableName}`, "info");
    if (selectedTable && selectedTable.solutions?.length === 0) {
      getSolutions();
    }
  }, [selectedTable]);

  async function getSolutions() {
    if (!connections.some(Boolean)) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    setLoadingMeta(true);
    const solutionSets = await loadConnectionRecordSets(
      connections,
      (index) => selectedTable.connectionPresence[index] ?? (index === 0 ? selectedTable.hasPrimaryConnection : index === 1 && selectedTable.hasSecondaryConnection),
      (index) => dvService.getSolutionsForTable(selectedTable, index),
      (solution) => solution.solutionName,
    );

    selectedTable.solutions = mergeConnectionRecordSets(
      solutionSets,
      (solution) => solution.uniqueName,
      ["solutionName"],
    );
    onLog(`Loaded ${selectedTable.solutions.length} solutions for table: ${selectedTable.tableName}`, "success");
    setLoadingMeta(false);
    return;
  }

  const defaultColDefs = React.useMemo<ColDef<Solution>>(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      filter: true,
      wrapText: true,
      autoHeight: true,
    };
  }, []);

  const colDefs = React.useMemo<ColDef<Solution>[]>(
    () => [
      {
        headerName: "Name",
        field: "solutionName",
        flex: 2,
        sort: "asc",
        valueGetter: (params) =>
          !params.data?.hasPrimaryConnection ? "" : (params.data?.solutionName ?? ""),
      },
      ...createConnectionDisplayColumns<Solution>(connections, "Name"),
      { headerName: "Unique Name", field: "uniqueName" },
      { headerName: "Description", field: "description" },
      { headerName: "Version", field: "version" },
      {
        headerName: "Is Managed",
        field: "isManaged",
        valueFormatter: (params) => (params.value ? "Yes" : "No"),
      },
      {
        headerName: "Include Subcomponents",
        field: "subcomponents",
        valueFormatter: (params) => (params.value ? "Yes" : "No"),
      },
    ],
    // Column definitions with formatters - no reactive dependencies needed
    [connections],
  );

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<Solution>(connections.filter(Boolean).length > 1),
    [connections],
  );

  const solutionsGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<Solution>
        theme={agGridTheme}
        modules={[RowStyleModule]}
        rowData={selectedTable.solutions}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowClassRules={rowClassRules}
        getRowId={(params) => params.data?.uniqueName ?? ""}
        enableCellTextSelection={true}
      />
    </div>
  );

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Privileges Metadata..." />;
  }
  return (
    <div>
      {selectedTable.solutions.length === 0 && (
        <div style={{ textAlign: "center" }}>No Solutions found for this table.</div>
      )}
      {selectedTable.solutions.length > 0 && solutionsGrid}
    </div>
  );
});
