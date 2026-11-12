import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Button, Spinner, TableRowId, Tooltip, tokens } from "@fluentui/react-components";
import { ColDef, SelectionChangedEvent, RowSelectionOptions, RowStyleModule } from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { runReportedOperation } from "../utils/async";
import { parseOptionColumnDefaults } from "../utils/settings";
import {
  createConnectionDisplayColumns,
  getConnectionDisplayLabel,
  createConnectionRowClassRules,
  loadConnectionRecordSets,
  mergeConnectionRecordSets,
} from "../utils/connectionComparison";
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
import { OptionSetDrawerModel } from "../model/optionSet";
import { OptionSetDrawer } from "./OptionSetDrawer";

interface TableColumnsProps {
  connections: Array<ToolBoxAPI.DataverseConnection | null>;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  table: string;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const TableColumns = observer((props: TableColumnsProps): React.JSX.Element => {
  const { connections, dvService, viewModel, table, showNotification } = props;
  const optionSetDrawer = React.useMemo(
    () => new OptionSetDrawerModel(dvService, showNotification, {
      load: async () => {
        const value: unknown = await window.toolboxAPI.settings.get("defaultOptionColumns");
        if (value === undefined || value === null) return [];
        if (typeof value !== "string") throw new Error("Saved option columns must be JSON text");
        return parseOptionColumnDefaults(value);
      },
      save: async (fields) => {
        await window.toolboxAPI.settings.set("defaultOptionColumns", JSON.stringify(fields));
      },
    }),
    [dvService, showNotification],
  );
  React.useEffect(() => () => optionSetDrawer.close(), [optionSetDrawer]);

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
    const canLoadAny = connections.some(Boolean);

    if (!canLoadAny) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }
    if (selectedTable.columns.length > 0) {
      return;
    }
    await runReportedOperation(async () => {
      const columnSets = await loadConnectionRecordSets(
        connections,
        (index) => selectedTable.connectionPresence[index] ?? (index === 0 ? selectedTable.hasPrimaryConnection : index === 1 && selectedTable.hasSecondaryConnection),
        (index) => dvService.getColumnsMeta(table, index),
        (column) => column.displayName,
      );

      selectedTable.columns = mergeConnectionRecordSets(
        columnSets,
        (column) => column.columnName,
        ["displayName"],
      );
    }, setLoadingMeta, showNotification, "Unable to load columns. Check the connections and permissions, then reopen this tab to retry.");
  }

  React.useEffect(() => {

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
      {
        headerName: "",
        colId: "optionDetails",
        width: 52,
        flex: 0,
        pinned: "left",
        resizable: false,
        suppressMovable: true,
        sortable: false,
        filter: false,
        cellRenderer: (params: CustomCellRendererProps<ColumnMeta>) => {
          const column = params.data;
          return column?.optionSetType ? (
            <Tooltip content={`View options for ${column.displayName || column.columnName}`} relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={<TextBulletListRegular />}
                aria-label={`View options for ${column.displayName || column.columnName}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void optionSetDrawer.open(table, column);
                }}
              />
            </Tooltip>
          ) : null;
        },
      },
      {
        headerName: getConnectionDisplayLabel(connections[0] ?? null, 0, "Column Name"),
        field: "displayName",
        sort: "asc",
        valueGetter: (params) =>
          !params.data?.hasPrimaryConnection ? "" : (params.data?.displayName ?? ""),
      },
      ...createConnectionDisplayColumns<ColumnMeta>(connections, "Column Name"),
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
    [connections, getDataTypeIcon, viewModel.columnAttributes, optionSetDrawer, table],
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
  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<ColumnMeta>(connections.filter(Boolean).length > 1),
    [connections],
  );
  const tableColumnGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<ColumnMeta>
        theme={agGridTheme}
        modules={[RowStyleModule]}
        rowData={filteredColumns}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowSelection={rowSelection}
        selectionColumnDef={{ pinned: "left" }}
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
      <OptionSetDrawer
        model={optionSetDrawer}
        environmentName={connections[optionSetDrawer.column?.sourceConnectionIndex ?? 0]?.name
          || `Environment ${(optionSetDrawer.column?.sourceConnectionIndex ?? 0) + 1}`}
        onRetry={() => {
          if (optionSetDrawer.column) void optionSetDrawer.open(table, optionSetDrawer.column);
        }}
      />
    </>
  );
});
