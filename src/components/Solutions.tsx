import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
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

import { Solution } from "../model/solution";


interface SolutionsProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Solutions = observer((props: SolutionsProps): React.JSX.Element => {
  const { connection, dvService, onLog, selectedTable, showNotification } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading solutions for table: ${selectedTable.tableName}`, "info");
    console.log("Selected table in Solutions component: ", selectedTable);
    if (selectedTable && selectedTable.solutions?.length === 0) {
      getSolutions();
    }
  }, [selectedTable]);

  async function getSolutions() {
    if (!connection ) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    console.log("Fetching solutions metadata for table: ", selectedTable.tableName);

    setLoadingMeta(true);
    await dvService
      .loadSolutionsForTable(selectedTable)
      .then((solutions) => {
        console.log("Solutions metadata loaded: ", solutions);
        selectedTable.solutions = solutions;
        onLog(`Loaded ${solutions.length} solutions for table: ${selectedTable.tableName}`, "success");
      })
      .catch((error: { message: any }) => {
        onLog(`Error loading solutions for table ${selectedTable.tableName}: ${error.message}`, "error");
      });
    setLoadingMeta(false);
    return;
  }

  const attributes: TableColumnDefinition<Solution>[] = [
    createTableColumn<Solution>({
      columnId: "name",
      compare: (a, b) => {
        return a.solutionName.localeCompare(b.solutionName);
      },
      renderHeaderCell: () => {
        return "Solution Name";
      },
      renderCell: (item) => {
        return <div className="grid-cell-content" style={{ verticalAlign: "top" }} title={item.solutionName}>{item.solutionName}</div>;
      },
    }),
    createTableColumn<Solution>({
      columnId: "uniqueName",
      compare: (a, b) => {
        return a.uniqueName.localeCompare(b.uniqueName);
      },
      renderHeaderCell: () => {
        return "Unique Name";
      },
      renderCell: (item) => {
        return <div className="grid-cell-content" style={{ verticalAlign: "top" }} title={item.uniqueName}>{item.uniqueName}</div>;
      },
    }),
    createTableColumn<Solution>({
      columnId: "description",
      compare: (a, b) => {
        return a.description?.localeCompare(b.description || "") || 0;
      },
      renderHeaderCell: () => {
        return "Description";
      },
      renderCell: (item) => {
        const desc = item.description || "";
        return <div className="grid-cell-content" style={{ verticalAlign: "top" }} title={desc}>{desc}</div>;
      },
    }),
    createTableColumn<Solution>({
      columnId: "version",
      compare: (a, b) => {
        return a.version?.localeCompare(b.version || "") || 0;
      },
      renderHeaderCell: () => {
        return "Version";
      },
      renderCell: (item) => {
        const version = item.version || "";
        return <div className="grid-cell-content" style={{ verticalAlign: "top" }} title={version}>{version}</div>;
      },
    }),
    createTableColumn<Solution>({
      columnId: "isManaged",
      compare: (a, b) => {
        return (a.isManaged === b.isManaged) ? 0 : a.isManaged ? -1 : 1;
      },
      renderHeaderCell: () => {
        return "Is Managed";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.isManaged ? "Yes" : "No"}</div>;
      },
    }),
    createTableColumn<Solution>({
      columnId: "subcomponents",
      compare: (a, b) => { 
        return (a.subcomponents === b.subcomponents) ? 0 : a.subcomponents ? -1 : 1;
      },
      renderHeaderCell: () => {
        return "Include Subcomponents";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.subcomponents ? "Yes" : "No"}</div>;
      },
    }),
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
      {selectedTable.solutions.length === 0 && (
        <div style={{ textAlign: "center" }}>No Solutions found for this table.</div>
      )}
      {selectedTable.solutions.length > 0 && (
        <DataGrid
          columns={attributes}
          items={selectedTable.solutions}
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
          <DataGridBody<Solution>>
            {({ item, rowId }) => (
              <DataGridRow<Solution> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </div>
  );
});
