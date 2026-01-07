import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { PrivilegeMeta, TableMeta } from "../model/tableMeta";
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

interface PrivilegesProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Privileges = observer((props: PrivilegesProps): React.JSX.Element => {
  const { connection, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading privileges for table: ${selectedTable.tableName}`, "info");
    console.log("Selected table in Privileges component: ", selectedTable);
    if (selectedTable && selectedTable.privileges?.length === 0) {
      getPrivileges();
    }
  }, [selectedTable]);

  async function getPrivileges() {
    if (!connection) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    console.log("Fetching privileges metadata for table: ", selectedTable.tableName);

    setLoadingMeta(true);
    await dvService
      .loadPrivilegesMetadata(selectedTable)
      .then((privileges) => {
        console.log("Privileges metadata loaded: ", privileges);
        selectedTable.privileges = privileges;
        onLog(`Loaded ${privileges.length} privileges for table: ${selectedTable.tableName}`, "success");
      })
      .catch((error: { message: any }) => {
        onLog(`Error loading privileges for table ${selectedTable.tableName}: ${error.message}`, "error");
      });
    setLoadingMeta(false);
    return;
  }

  const createPrivilegeAttributes = React.useMemo<TableColumnDefinition<PrivilegeMeta>[]>(() => {
    if (!selectedTable.privileges || selectedTable.privileges.length === 0) {
      return [];
    }
    const cols = selectedTable.privileges[0].attributes || [];
    return cols.map((col) =>
      createTableColumn<PrivilegeMeta>({
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
            <div className="grid-cell-json">
              <JSONPretty
                style={{ fontSize: "1em", fontFamily: "arial" }}
                id="json-pretty"
                mainStyle={`font-size: 0.9em; font-family: ${tokens.fontFamilyBase}`}
                errorStyle={`font-size: 0.9em; font-family: ${tokens.fontFamilyBase}`}
                data={item.attributes.find((att) => att.attributeName === col.attributeName)?.attributeValue || ""}
              ></JSONPretty>
            </div>
          );
        },
      })
    );
  }, [selectedTable.privileges.length]);

  const attributes: TableColumnDefinition<PrivilegeMeta>[] = [
    createTableColumn<PrivilegeMeta>({
      columnId: "name",
      compare: (a, b) => {
        return a.privilegeName.localeCompare(b.privilegeName);
      },
      renderHeaderCell: () => {
        return "Privilege Name";
      },
      renderCell: (item) => {
        return <div className="grid-cell-content" style={{ verticalAlign: "top" }} title={item.privilegeName}>{item.privilegeName}</div>;
      },
    }),
    ...createPrivilegeAttributes,
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
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Privileges Metadata..." />;
  }
  return (
    <div>
      {selectedTable.privileges.length === 0 && (
        <div style={{ textAlign: "center" }}>No Privileges found for this table.</div>
      )}
      {selectedTable.privileges.length > 0 && (
        <DataGrid
          columns={attributes}
          items={selectedTable.privileges}
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
          <DataGridBody<PrivilegeMeta>>
            {({ item, rowId }) => (
              <DataGridRow<PrivilegeMeta> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </div>
  );
});
