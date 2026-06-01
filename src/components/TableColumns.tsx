import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Spinner, TableRowId, Tooltip, tokens } from "@fluentui/react-components";
import { ColDef, SelectionChangedEvent, RowSelectionOptions } from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { createConnectionRowClassRules, mergeConnectionComparisonRecords } from "../utils/connectionComparison";
import {
  AppsRegular,
  CalendarLtrRegular,
  CheckboxCheckedRegular,
  ClockRegular,
  CodeRegular,
  DataBarVerticalRegular,
  DataPieRegular,
  DecimalArrowLeftRegular,
  GlobeRegular,
  ImageRegular,
  LinkRegular,
  MoneyRegular,
  PeopleRegular,
  TableRegular,
  TextBulletListRegular,
  TextFieldRegular,
} from "@fluentui/react-icons";

import { ColumnMeta } from "../model/columnMeta";

interface TableColumnsProps {
  primary: ToolBoxAPI.DataverseConnection | null;
  secondary: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  table: string;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const TableColumns = observer((props: TableColumnsProps): React.JSX.Element => {
  const { primary, secondary, dvService, onLog, viewModel, table, showNotification } = props;

  const getDataTypeIcon = React.useCallback((dataType: string): React.JSX.Element => {
    const normalizedType = dataType.trim().toLowerCase();

    if (["string", "memo", "entityname"].includes(normalizedType)) {
      return <TextFieldRegular />;
    }

    if (["integer", "bigint", "decimal", "double"].includes(normalizedType)) {
      return <DataBarVerticalRegular />;
    }

    if (normalizedType === "money") {
      return <MoneyRegular />;
    }

    if (normalizedType === "boolean") {
      return <CheckboxCheckedRegular />;
    }

    if (["datetime", "dateonly"].includes(normalizedType)) {
      return <CalendarLtrRegular />;
    }

    if (normalizedType === "lookup" || normalizedType === "uniqueidentifier") {
      return <LinkRegular />;
    }

    if (["customer", "owner", "partylist"].includes(normalizedType)) {
      return <PeopleRegular />;
    }

    if (["picklist", "state", "status", "managedproperty"].includes(normalizedType)) {
      return <AppsRegular />;
    }

    if (normalizedType === "virtual") {
      return <CodeRegular />;
    }

    if (normalizedType === "image") {
      return <ImageRegular />;
    }

    if (normalizedType === "file") {
      return <TableRegular />;
    }

    if (normalizedType === "timezone") {
      return <ClockRegular />;
    }

    if (normalizedType === "language") {
      return <GlobeRegular />;
    }

    if (normalizedType === "memo") {
      return <TextBulletListRegular />;
    }

    if (normalizedType === "float") {
      return <DecimalArrowLeftRegular />;
    }

    return <DataPieRegular />;
  }, []);

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
          t.dataType.toLowerCase().includes(selectedTable.columnSearch?.toLowerCase() ?? ""),
      );
  }, [selectedTable.columnSearch, selectedTable.columns]);

  async function getColumnsMeta() {
    const canLoadPrimary = Boolean(primary && selectedTable.hasPrimaryConnection);
    const canLoadSecondary = Boolean(secondary && selectedTable.hasSecondaryConnection);

    if (!canLoadPrimary && !canLoadSecondary) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }
    if (selectedTable.columns.length > 0) {
      return;
    }
    try {
      setLoadingMeta(true);
      const [primaryColumns, secondaryColumns] = await Promise.all([
        canLoadPrimary ? dvService.getColumnsMeta(table, "primary") : Promise.resolve([]),
        canLoadSecondary ? dvService.getColumnsMeta(table, "secondary") : Promise.resolve([]),
      ]);

      selectedTable.columns = mergeConnectionComparisonRecords(
        primaryColumns,
        secondaryColumns,
        (column) => column.columnName,
        (column) => column.displayName,
      );
      onLog(`Loaded ${selectedTable.columns.length} columns for table: ${table}`, "success");
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
      { headerName: "Column Name", field: "displayName", sort: "asc" },
      ...(secondary
        ? [
            {
              headerName: secondary.name
                ? `2nd Column Name (${secondary.name})`
                : "2nd Column Name",
              field: "secondaryDisplayName",
              valueGetter: (params) =>
                params.data?.hasSecondaryConnection ? params.data.secondaryDisplayName || "" : "",
            } satisfies ColDef<ColumnMeta>,
          ]
        : []),
      { headerName: "Logical Name", field: "columnName" },
      {
        headerName: "Data Type",
        field: "dataType",
        cellRenderer: (params: CustomCellRendererProps<ColumnMeta>) => {
          const dataType = params.data?.dataType || "Unknown";

          return (
            <Tooltip content={dataType} relationship="label">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: tokens.spacingHorizontalXS,
                }}
              >
                {getDataTypeIcon(dataType)}
                <span>{dataType}</span>
              </span>
            </Tooltip>
          );
        },
      },
      ...viewModel.columnAttributes
        .filter((attr) => !attr.custom)
        .map(
          (colAttr) =>
            ({
              headerName: colAttr.name,
              valueGetter: (params) => {
                const attr = params.data?.attributes?.find((a) => a.attributeName === colAttr.name);
                return attr?.attributeValue || "";
              },
            }) as ColDef<ColumnMeta>,
        ),
    ],
    [getDataTypeIcon, secondary, viewModel.columnAttributes],
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
  const rowClassRules = React.useMemo(() => createConnectionRowClassRules<ColumnMeta>(Boolean(secondary)), [secondary]);
  const tableColumnGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<ColumnMeta>
        theme={agGridTheme}
        rowData={filteredColumns}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowSelection={rowSelection}
        rowClassRules={rowClassRules}
        onSelectionChanged={colsSelected}
        getRowId={(params) => params.data?.columnName ?? ""}
        enableCellTextSelection={true}
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
