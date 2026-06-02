import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";
import { ColDef, RowStyleModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { Solution } from "../model/solution";
import { createConnectionRowClassRules, mergeConnectionComparisonRecords } from "../utils/connectionComparison";

interface SolutionsProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  secondaryConnection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Solutions = observer((props: SolutionsProps): React.JSX.Element => {
  const { connection, secondaryConnection, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading solutions for table: ${selectedTable.tableName}`, "info");
    console.log("Selected table in Solutions component: ", selectedTable);
    if (selectedTable && selectedTable.solutions?.length === 0) {
      getSolutions();
    }
  }, [selectedTable]);

  async function getSolutions() {
    const canLoadPrimary = Boolean(connection && selectedTable.hasPrimaryConnection);
    const canLoadSecondary = Boolean(secondaryConnection && selectedTable.hasSecondaryConnection);

    if (!canLoadPrimary && !canLoadSecondary) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    console.log("Fetching solutions metadata for table: ", selectedTable.tableName);

    setLoadingMeta(true);
    const [primarySolutions, secondarySolutions] = await Promise.all([
      canLoadPrimary ? dvService.getSolutionsForTable(selectedTable, "primary") : Promise.resolve([]),
      canLoadSecondary ? dvService.getSolutionsForTable(selectedTable, "secondary") : Promise.resolve([]),
    ]);

    selectedTable.solutions = mergeConnectionComparisonRecords(
      primarySolutions,
      secondarySolutions,
      (solution) => solution.uniqueName,
      (solution) => solution.solutionName,
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
          secondaryConnection && !params.data?.hasPrimaryConnection ? "" : (params.data?.solutionName ?? ""),
      },
      ...(secondaryConnection
        ? [
            {
              headerName: secondaryConnection.name ? `2nd Name (${secondaryConnection.name})` : "2nd Name",
              field: "secondaryDisplayName",
              valueGetter: (params) =>
                params.data?.hasSecondaryConnection ? params.data.secondaryDisplayName || "" : "",
            } as ColDef<Solution>,
          ]
        : []),
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
    [secondaryConnection],
  );

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<Solution>(Boolean(secondaryConnection)),
    [secondaryConnection],
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
