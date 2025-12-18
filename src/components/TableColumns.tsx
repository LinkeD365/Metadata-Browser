import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import {
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridProps,
  DataGridRow,
  Spinner,
  TableColumnDefinition,
  TableRowId,
  tokens,
} from "@fluentui/react-components";
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

  const [selectedColumns, setSelectedColumns] = React.useState<Set<TableRowId>>();
  const onSelectionChange: DataGridProps["onSelectionChange"] = (_e, data) => {
    console.log(data);
    setSelectedColumns(data.selectedItems);
    selectedTable.selectedColumns = new Set<string>(Array.from(data.selectedItems) as string[]);
  };

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

  function createColumnsFromSelColumns(): TableColumnDefinition<ColumnMeta>[] {
    return viewModel.columnAttributes.map((col) =>
      createTableColumn<ColumnMeta>({
        columnId: col,
        compare: (a, b) => {
          const aVal = a.attributes.find((att) => att.attributeName === col)?.attributeValue ?? "";
          const bVal = b.attributes.find((att) => att.attributeName === col)?.attributeValue ?? "";
          return aVal.localeCompare(bVal);
        },
        renderHeaderCell: () => {
          return col;
        },
        renderCell: (item) => {
          const value = item.attributes.find((att) => att.attributeName === col)?.attributeValue || "";
          return (
            <div className="grid-cell-content" title={value}>
              {value}
            </div>
          );
        },
      })
    );
  }

  const attributes: TableColumnDefinition<ColumnMeta>[] = [
    createTableColumn<ColumnMeta>({
      columnId: "name",
      compare: (a, b) => {
        return a.displayName.localeCompare(b.displayName);
      },
      renderHeaderCell: () => {
        return "Column Name";
      },
      renderCell: (item) => {
        return (
          <div className="grid-cell-content" style={{ verticalAlign: "top" }} title={item.displayName}>
            {item.displayName}
          </div>
        );
      },
    }),
    createTableColumn<ColumnMeta>({
      columnId: "logical",
      compare: (a, b) => {
        return a.columnName.localeCompare(b.columnName);
      },
      renderHeaderCell: () => {
        return "Logical";
      },
      renderCell: (item) => {
        return (
          <div className="grid-cell-content" style={{ verticalAlign: "top" }} title={item.columnName}>
            {item.columnName}
          </div>
        );
      },
    }),
    createTableColumn<ColumnMeta>({
      columnId: "type",
      compare: (a, b) => {
        return a.dataType.localeCompare(b.dataType);
      },
      renderHeaderCell: () => {
        return "Type";
      },
      renderCell: (item) => {
        return (
          <div className="grid-cell-content" style={{ verticalAlign: "top" }} title={item.dataType}>
            {item.dataType}
          </div>
        );
      },
    }),
    ...createColumnsFromSelColumns(),
  ];
  const columnSizingOptions = {
    name: {
      minWidth: 80,
      maxWidth: 400,
      idealWidth: 120,
      defaultWidth: 120,
    },
    logical: {
      defaultWidth: 80,
      minWidth: 30,
      idealWidth: 120,
    },
    details: {
      defaultWidth: 30,
      minWidth: 30,
      maxWidth: 30,
      idealWidth: 30,
    },
  };
  return (
    <>
      {loadingMeta ? (
        <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Columns Metadata..." />
      ) : (
        <>
          <DataGrid
            columns={attributes}
            items={filteredColumns}
            sortable
            subtleSelection
            selectionMode="multiselect"
            selectionAppearance="neutral"
            selectedItems={selectedColumns}
            getRowId={(item: ColumnMeta) => item.columnName}
            onSelectionChange={onSelectionChange}
            columnSizingOptions={columnSizingOptions}
            resizableColumns
            resizableColumnsOptions={{
              autoFitColumns: false,
            }}
          >
            <DataGridHeader
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                backgroundColor: tokens.colorNeutralBackground2,
                boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
              }}
            >
              <DataGridRow>
                {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<ColumnMeta>>
              {({ item, rowId }) => (
                <DataGridRow<ColumnMeta> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        </>
      )}
    </>
  );
});
