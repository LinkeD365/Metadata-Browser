import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { KeyMeta, TableMeta } from "../model/tableMeta";
import {
  TableColumnDefinition,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  tokens,
  Spinner,
} from "@fluentui/react-components";
import JSONPretty from "react-json-pretty";

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
    if (!connection || !connection.isActive) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    console.log("Fetching keys metadata for table: ", selectedTable.tableName);

    setLoadingMeta(true);
    await dvService
      .loadKeysMetadata(selectedTable)
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

  const createKeyAttributes = React.useMemo<TableColumnDefinition<KeyMeta>[]>(() => {
    if (!selectedTable.keys || selectedTable.keys.length === 0) {
      return [];
    }
    const cols = selectedTable.keys[0].attributes || [];
    return cols.map((col) =>
      createTableColumn<KeyMeta>({
        columnId: col.attributeName,
        compare: (a, b) => {
          const aVal = a.attributes.find((att) => att.attributeName === col.attributeName)?.attributeValue ?? "";
          const bVal = b.attributes.find((att) => att.attributeName === col.attributeName)?.attributeValue ?? "";
          return aVal.localeCompare(bVal);
        },
        renderHeaderCell: () => {
          return col.attributeName;
        },
        renderCell: (item) => {
          return (
            <div
              style={{
                maxWidth: "500px",
                maxHeight: "100px",
              }}
            >
              {" "}
              <JSONPretty
                style={{ fontSize: "1em", fontFamily: "arial" }}
                id="json-pretty"
                mainStyle={`font-size: 0.9em; font-family: ${tokens.fontFamilyBase}`}
                errorStyle={`font-size: 0.9em; font-family: ${tokens.fontFamilyBase}`}
                data={item.attributes.find((att) => att.attributeName === col.attributeName)?.attributeValue || ""}
              ></JSONPretty>
              {/* {item.attributes.find((att) => att.attributeName === col.attributeName)?.attributeValue || ""} */}
            </div>
          );
          // return item.attributes.find((att) => att.attributeName === col.attributeName)?.attributeValue || "";
        },
      })
    );
  }, [selectedTable.keys.length]);

  const attributes: TableColumnDefinition<KeyMeta>[] = [
    createTableColumn<KeyMeta>({
      columnId: "name",
      compare: (a, b) => {
        return a.keyName.localeCompare(b.keyName);
      },
      renderHeaderCell: () => {
        return "Key Name";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.keyName}</div>;
      },
    }),
    ...createKeyAttributes,
  ];
  const columnSizingOptions = {
    name: {
      minWidth: 80,
      maxWidth: 400,
      idealWidth: 120,
      defaultWidth: 120,
    },
  };

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Keys Metadata..." />;
  }
  return (
    <div>
      {selectedTable.keys.length === 0 && <div style={{ textAlign: "center" }}>No Keys found for this table.</div>}
      {selectedTable.keys.length > 0 && (
        <DataGrid
          columns={attributes}
          items={selectedTable.keys}
          columnSizingOptions={columnSizingOptions}
          sortable
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
          <DataGridBody<KeyMeta>>
            {({ item, rowId }) => (
              <DataGridRow<KeyMeta> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </div>
  );
});
