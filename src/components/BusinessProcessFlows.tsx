import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";
import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { BusinessProcessFlowMeta } from "../model/businessProcessFlow";

interface BusinessProcessFlowsProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  businessProcessFlowAttributes: string[];
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const BusinessProcessFlows = observer((props: BusinessProcessFlowsProps): React.JSX.Element => {
  const { connection, dvService, onLog, selectedTable, showNotification, businessProcessFlowAttributes } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  const filteredFlows = React.useMemo(() => {
    const query = selectedTable.businessProcessFlowSearch?.trim().toLowerCase() ?? "";
    if (query === "") {
      return selectedTable.businessProcessFlows;
    }

    return selectedTable.businessProcessFlows.filter(
      (flow) => flow.flowName.toLowerCase().includes(query) || flow.type.toLowerCase().includes(query),
    );
  }, [selectedTable.businessProcessFlowSearch, selectedTable.businessProcessFlows]);

  React.useEffect(() => {
    onLog(`Loading business process flows for table: ${selectedTable.tableName}`, "info");
    if (selectedTable && selectedTable.businessProcessFlows?.length === 0) {
      getBusinessProcessFlows();
    }
  }, [selectedTable]);

  async function getBusinessProcessFlows() {
    if (!connection) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    setLoadingMeta(true);
    await dvService
      .getBusinessProcessFlowsForTable(selectedTable)
      .then((flows) => {
        selectedTable.businessProcessFlows = flows;
        onLog(`Loaded ${flows.length} business process flows for table: ${selectedTable.tableName}`, "success");
      })
      .catch((error: { message: any }) => {
        onLog(`Error loading business process flows for table ${selectedTable.tableName}: ${error.message}`, "error");
      });
    setLoadingMeta(false);
  }

  const defaultColDefs = React.useMemo<ColDef<BusinessProcessFlowMeta>>(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      filter: true,
      wrapText: true,
      autoHeight: true,
    };
  }, []);

  const colDefs = React.useMemo<ColDef<BusinessProcessFlowMeta>[]>(
    () => [
      { headerName: "Name", field: "flowName", flex: 2, sort: "asc" },
      { headerName: "Type", field: "type" },
      ...businessProcessFlowAttributes.map(
        (attrName) =>
          ({
            headerName: attrName,
            valueGetter: (params) => {
              const attr = params.data?.attributes?.find((a) => a.attributeName === attrName);
              return attr?.attributeValue || "";
            },
          }) as ColDef<BusinessProcessFlowMeta>,
      ),
    ],
    [businessProcessFlowAttributes],
  );

  const getFlowRowId = React.useCallback((flow: BusinessProcessFlowMeta) => {
    const workflowId = flow.attributes.find((a) => a.attributeName === "workflowid")?.attributeValue;
    return workflowId || `${flow.type}:${flow.flowName}`;
  }, []);

  const flowsGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<BusinessProcessFlowMeta>
        theme={agGridTheme}
        rowData={filteredFlows}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        getRowId={(params) => (params.data ? getFlowRowId(params.data) : "")}
        enableCellTextSelection={true}
      />
    </div>
  );

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Business Process Flows..." />;
  }

  return (
    <div>
      {selectedTable.businessProcessFlows.length === 0 && (
        <div style={{ textAlign: "center" }}>No Business Process Flows found for this table.</div>
      )}
      {selectedTable.businessProcessFlows.length > 0 && flowsGrid}
    </div>
  );
});
