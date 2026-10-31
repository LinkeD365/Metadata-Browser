import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";
import { ColDef, RowStyleModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { runReportedOperation } from "../utils/async";
import { BusinessRuleMeta } from "../model/businessRule";
import {
  createConnectionDisplayColumns,
  getConnectionDisplayLabel,
  createConnectionRowClassRules,
  loadConnectionRecordSets,
  mergeConnectionRecordSets,
} from "../utils/connectionComparison";

interface BusinessRulesProps {
  connections: Array<ToolBoxAPI.DataverseConnection | null>;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  businessRuleAttributes: string[];
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const BusinessRules = observer((props: BusinessRulesProps): React.JSX.Element => {
  const { connections, dvService, onLog, selectedTable, showNotification, businessRuleAttributes } =
    props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  const filteredRules = React.useMemo(() => {
    const query = selectedTable.businessRuleSearch?.trim().toLowerCase() ?? "";
    if (query === "") {
      return selectedTable.businessRules;
    }

    return selectedTable.businessRules.filter(
      (rule) => rule.ruleName.toLowerCase().includes(query) || rule.type.toLowerCase().includes(query),
    );
  }, [selectedTable.businessRuleSearch, selectedTable.businessRules]);

  React.useEffect(() => {
    onLog(`Loading business rules for table: ${selectedTable.tableName}`, "info");
    if (selectedTable && selectedTable.businessRules?.length === 0) {
      getBusinessRules();
    }
  }, [selectedTable]);

  async function getBusinessRules() {
    if (!connections.some(Boolean)) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    await runReportedOperation(async () => {
      const ruleSets = await loadConnectionRecordSets(
        connections,
        (index) => selectedTable.connectionPresence[index] ?? (index === 0 ? selectedTable.hasPrimaryConnection : index === 1 && selectedTable.hasSecondaryConnection),
        (index) => dvService.getBusinessRulesForTable(selectedTable, index),
        (rule) => rule.ruleName,
      );

      selectedTable.businessRules = mergeConnectionRecordSets(
        ruleSets,
        (rule) => rule.ruleName,
        ["ruleName"],
      );
      onLog(
        `Loaded ${selectedTable.businessRules.length} business rules for table: ${selectedTable.tableName}`,
        "success",
      );
    }, setLoadingMeta, onLog, showNotification, "Unable to load business rules. Check the connections and permissions, then reopen this tab to retry.");
  }

  const defaultColDefs = React.useMemo<ColDef<BusinessRuleMeta>>(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      filter: true,
      wrapText: true,
      autoHeight: true,
    };
  }, []);

  const colDefs = React.useMemo<ColDef<BusinessRuleMeta>[]>(
    () => [
      {
        headerName: getConnectionDisplayLabel(connections[0] ?? null, 0, "Name"),
        field: "ruleName",
        flex: 2,
        sort: "asc",
        valueGetter: (params) =>
          !params.data?.hasPrimaryConnection ? "" : (params.data?.ruleName ?? ""),
      },
      ...createConnectionDisplayColumns<BusinessRuleMeta>(connections, "Name"),
      { headerName: "Type", field: "type" },
      ...businessRuleAttributes.map(
        (attrName) =>
          ({
            headerName: attrName,
            valueGetter: (params) => {
              const attr = params.data?.attributes?.find((a) => a.attributeName === attrName);
              return attr?.attributeValue || "";
            },
          }) as ColDef<BusinessRuleMeta>,
      ),
    ],
    [businessRuleAttributes, connections],
  );

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<BusinessRuleMeta>(connections.filter(Boolean).length > 1),
    [connections],
  );

  const getRuleRowId = React.useCallback((rule: BusinessRuleMeta) => {
    const workflowId = rule.attributes.find((a) => a.attributeName === "workflowid")?.attributeValue;
    return workflowId || `${rule.type}:${rule.ruleName}`;
  }, []);

  const rulesGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<BusinessRuleMeta>
        theme={agGridTheme}
        modules={[RowStyleModule]}
        rowData={filteredRules}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowClassRules={rowClassRules}
        getRowId={(params) => (params.data ? getRuleRowId(params.data) : "")}
        enableCellTextSelection={true}
      />
    </div>
  );

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Business Rules..." />;
  }

  return (
    <div>
      {selectedTable.businessRules.length === 0 && (
        <div style={{ textAlign: "center" }}>No Business Rules found for this table.</div>
      )}
      {selectedTable.businessRules.length > 0 && rulesGrid}
    </div>
  );
});
