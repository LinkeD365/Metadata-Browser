import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";
import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { BusinessRuleMeta } from "../model/businessRule";

interface BusinessRulesProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  businessRuleAttributes: string[];
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const BusinessRules = observer((props: BusinessRulesProps): React.JSX.Element => {
  const { connection, dvService, onLog, selectedTable, showNotification, businessRuleAttributes } = props;
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
    if (!connection) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    setLoadingMeta(true);
    await dvService
      .getBusinessRulesForTable(selectedTable)
      .then((rules) => {
        selectedTable.businessRules = rules;
        onLog(`Loaded ${rules.length} business rules for table: ${selectedTable.tableName}`, "success");
      })
      .catch((error: { message: any }) => {
        onLog(`Error loading business rules for table ${selectedTable.tableName}: ${error.message}`, "error");
      });
    setLoadingMeta(false);
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
      { headerName: "Name", field: "ruleName", flex: 2, sort: "asc" },
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
    [businessRuleAttributes],
  );

  const getRuleRowId = React.useCallback((rule: BusinessRuleMeta) => {
    const workflowId = rule.attributes.find((a) => a.attributeName === "workflowid")?.attributeValue;
    return workflowId || `${rule.type}:${rule.ruleName}`;
  }, []);

  const rulesGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<BusinessRuleMeta>
        theme={agGridTheme}
        rowData={filteredRules}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
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
