import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";
import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { ViewMeta } from "../model/view";

interface ViewsProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  viewAttributes: string[];
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Views = observer((props: ViewsProps): React.JSX.Element => {
  const { connection, dvService, onLog, selectedTable, showNotification, viewAttributes } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  const filteredViews = React.useMemo(() => {
    const query = selectedTable.viewSearch?.trim().toLowerCase() ?? "";
    if (query === "") {
      return selectedTable.views;
    }

    return selectedTable.views.filter(
      (view) => view.viewName.toLowerCase().includes(query) || view.type.toLowerCase().includes(query),
    );
  }, [selectedTable.viewSearch, selectedTable.views]);

  React.useEffect(() => {
    onLog(`Loading views for table: ${selectedTable.tableName}`, "info");
    if (selectedTable && selectedTable.views?.length === 0) {
      getViews();
    }
  }, [selectedTable]);

  async function getViews() {
    if (!connection) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    setLoadingMeta(true);
    await dvService
      .getViewsForTable(selectedTable)
      .then((views) => {
        selectedTable.views = views;
        onLog(`Loaded ${views.length} views for table: ${selectedTable.tableName}`, "success");
      })
      .catch((error: { message: any }) => {
        onLog(`Error loading views for table ${selectedTable.tableName}: ${error.message}`, "error");
      });
    setLoadingMeta(false);
  }

  const defaultColDefs = React.useMemo<ColDef<ViewMeta>>(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      filter: true,
      wrapText: true,
      autoHeight: true,
    };
  }, []);

  const colDefs = React.useMemo<ColDef<ViewMeta>[]>(
    () => [
      { headerName: "Name", field: "viewName", flex: 2, sort: "asc" },
      { headerName: "Type", field: "type" },
      ...viewAttributes.map(
        (attrName) =>
          ({
            headerName: attrName,
            valueGetter: (params) => {
              const attr = params.data?.attributes?.find((a) => a.attributeName === attrName);
              return attr?.attributeValue || "";
            },
          }) as ColDef<ViewMeta>,
      ),
    ],
    [viewAttributes],
  );

  const getViewRowId = React.useCallback((view: ViewMeta) => {
    const savedQueryId = view.attributes.find((a) => a.attributeName === "savedqueryid")?.attributeValue;
    const userQueryId = view.attributes.find((a) => a.attributeName === "userqueryid")?.attributeValue;
    return savedQueryId || userQueryId || `${view.type}:${view.viewName}`;
  }, []);

  const viewsGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<ViewMeta>
        theme={agGridTheme}
        rowData={filteredViews}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        getRowId={(params) => (params.data ? getViewRowId(params.data) : "")}
        enableCellTextSelection={true}
      />
    </div>
  );

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Views Metadata..." />;
  }

  return (
    <div>
      {selectedTable.views.length === 0 && <div style={{ textAlign: "center" }}>No Views found for this table.</div>}
      {selectedTable.views.length > 0 && viewsGrid}
    </div>
  );
});
