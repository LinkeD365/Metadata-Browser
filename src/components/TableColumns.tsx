import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Spinner, TableRowId } from "@fluentui/react-components";
import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  themeQuartz,
  ColDef,
  RowAutoHeightModule,
  SelectionChangedEvent,
  RowSelectionOptions,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
const myTheme = themeQuartz.withParams({
  headerHeight: "30px",
});
ModuleRegistry.registerModules([TextFilterModule, ClientSideRowModelModule, RowAutoHeightModule]);

import { ColumnMeta } from "../model/columnMeta";

interface TableColumnsProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  table: string;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const TableColumns = observer((props: TableColumnsProps): React.JSX.Element => {
  const { connection, dvService, onLog, viewModel, table, showNotification } = props;

  const [selectedTable] = React.useState<TableMeta>(viewModel.tableMetadata.filter((t) => t.tableName === table)[0]);
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  const filteredColumns: ColumnMeta[] = React.useMemo(() => {
    if (!selectedTable || selectedTable.columnSearch?.trim() === "") {
      return selectedTable.columns;
    } else
      return selectedTable.columns.filter(
        (t) =>
          t.displayName.toLowerCase().includes(selectedTable.columnSearch?.toLowerCase() ?? "") ||
          t.columnName.toLowerCase().includes(selectedTable.columnSearch?.toLowerCase() ?? "") ||
          t.dataType.toLowerCase().includes(selectedTable.columnSearch?.toLowerCase() ?? "")
      );
  }, [selectedTable.columnSearch, selectedTable.columns]);

  async function getColumnsMeta() {
    if (!connection) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }
    if (selectedTable.columns.length > 0) {
      return;
    }
    try {
      setLoadingMeta(true);
      await dvService
        .getColumnsMeta(table)
        .then((columns) => {
          selectedTable.columns = columns;
          onLog(`Loaded ${columns.length} columns for table: ${table}`, "success");
        })
        .catch((error: { message: any }) => {
          throw new Error(error.message);
        });
    } catch (error) {
      const errorMsg = `Error loading columns for table ${table}: ${(error as Error).message}`;
      onLog(errorMsg, "error");
      await showNotification("Error", errorMsg, "error");
    } finally {
      setLoadingMeta(false);
    }
  }

  React.useEffect(() => {
    onLog(`Loading columns for table: ${table}`, "info");

    if (selectedTable && selectedTable.columns?.length === 0) {
      getColumnsMeta();
    }
  }, [selectedTable, table]);

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

  const colDefs = React.useMemo<ColDef<ColumnMeta>[]>(
    () => [
      { headerName: "Column Name", field: "displayName" },
      { headerName: "Logical Name", field: "columnName" },
      { headerName: "Data Type", field: "dataType" },
      ...viewModel.columnAttributes.map(
        (colAttr) =>
          ({
            headerName: colAttr,
            valueGetter: (params) => {
              const attr = params.data?.attributes?.find((a) => a.attributeName === colAttr);
              return attr?.attributeValue || "";
            },
          } as ColDef<ColumnMeta>)
      ),
    ],
    [connection, viewModel.columnAttributes]
  );

  function colsSelected(event: SelectionChangedEvent<ColumnMeta>): void {
    const selectedRows = event.api.getSelectedRows();
    const selectedIds = new Set<TableRowId>(selectedRows.map((col) => col.columnName as TableRowId));
    selectedTable.selectedColumns = new Set<string>(Array.from(selectedIds) as string[]);
  }
  const rowSelection = React.useMemo<RowSelectionOptions | "single" | "multiple">(() => {
    return {
      mode: "multiRow",
    };
  }, []);
  const tableColumnGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<ColumnMeta>
        theme={myTheme}
        rowData={filteredColumns}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowSelection={rowSelection}
        onSelectionChanged={colsSelected}
      />
    </div>
  );

  return (
    <>
      {loadingMeta ? (
        <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Columns Metadata..." />
      ) : (
        <>{tableColumnGrid}</>
      )}
    </>
  );
});
