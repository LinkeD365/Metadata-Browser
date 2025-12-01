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
  DataGridRow,
  TableColumnDefinition,
  tokens,
} from "@fluentui/react-components";
import { FieldMeta } from "../model/fieldMeta";

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

  async function getFieldsMeta() {
    if (!connection) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }
    if (selectedTable.fields.length > 0) {
      return;
    }
    try {
      setLoadingMeta(true);
      await dvService
        .getFieldsMeta(table)
        .then((fields) => {
          selectedTable.fields = fields;
          onLog(`Loaded ${fields.length} columns for table: ${table}`, "success");
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

    if (selectedTable && selectedTable.fields?.length === 0) {
      getFieldsMeta();
    }
  }, [selectedTable, table]);

  function createColumnsFromFieldColumns(): TableColumnDefinition<FieldMeta>[] {
    return viewModel.fieldColummns.filter(col => col).map((col) =>
      createTableColumn<FieldMeta>({
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
          return item.attributes.find((att) => att.attributeName === col)?.attributeValue || "";
        },
      })
    );
  }

  const fieldColumns: TableColumnDefinition<FieldMeta>[] = [
    createTableColumn<FieldMeta>({
      columnId: "name",
      compare: (a, b) => {
        return a.displayName.localeCompare(b.displayName);
      },
      renderHeaderCell: () => {
        return "Field";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.displayName}</div>;
      },
    }),
    createTableColumn<FieldMeta>({
      columnId: "logical",
      compare: (a, b) => {
        return a.fieldName.localeCompare(b.fieldName);
      },
      renderHeaderCell: () => {
        return "Logical";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.fieldName}</div>;
      },
    }),
    createTableColumn<FieldMeta>({
      columnId: "type",
      compare: (a, b) => {
        return a.dataType.localeCompare(b.dataType);
      },
      renderHeaderCell: () => {
        return "Type";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.dataType}</div>;
      },
    }),
    ...createColumnsFromFieldColumns(),
  ];

  return (
    <>
      {loadingMeta ? (
        "Loading..."
      ) : (
        <>
          <DataGrid columns={fieldColumns} items={selectedTable.fields} sortable>
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
            <DataGridBody<FieldMeta>>
              {({ item, rowId }) => (
                <DataGridRow<FieldMeta> key={rowId}>
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
