import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { Spinner } from "@fluentui/react-components";
import { ColDef, RowStyleModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { BusinessRuleMeta } from "../model/businessRule";
import { createConnectionRowClassRules, mergeConnectionComparisonRecords } from "../utils/connectionComparison";

interface BusinessRulesProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  secondaryConnection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  businessRuleAttributes: string[];
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const BusinessRules = observer((props: BusinessRulesProps): React.JSX.Element => {
  const { connection, secondaryConnection, dvService, onLog, selectedTable, showNotification, businessRuleAttributes } =
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
    const canLoadPrimary = Boolean(connection && selectedTable.hasPrimaryConnection);
    const canLoadSecondary = Boolean(secondaryConnection && selectedTable.hasSecondaryConnection);

    if (!canLoadPrimary && !canLoadSecondary) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    setLoadingMeta(true);
    const [primaryRules, secondaryRules] = await Promise.all([
      canLoadPrimary ? dvService.getBusinessRulesForTable(selectedTable, "primary") : Promise.resolve([]),
      canLoadSecondary ? dvService.getBusinessRulesForTable(selectedTable, "secondary") : Promise.resolve([]),
    ]);

    selectedTable.businessRules = mergeConnectionComparisonRecords(
      primaryRules,
      secondaryRules,
      (rule) => rule.ruleName,
      (rule) => rule.ruleName,
      ["ruleName"],
    );
    onLog(
      `Loaded ${selectedTable.businessRules.length} business rules for table: ${selectedTable.tableName}`,
      "success",
    );
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
      {
        headerName: "Name",
        field: "ruleName",
        flex: 2,
        sort: "asc",
        valueGetter: (params) =>
          secondaryConnection && !params.data?.hasPrimaryConnection ? "" : (params.data?.ruleName ?? ""),
      },
      ...(secondaryConnection
        ? [
            {
              headerName: secondaryConnection.name ? `2nd Name (${secondaryConnection.name})` : "2nd Name",
              field: "secondaryDisplayName",
              valueGetter: (params) =>
                params.data?.hasSecondaryConnection ? params.data.secondaryDisplayName || "" : "",
            } as ColDef<BusinessRuleMeta>,
          ]
        : []),
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
    [businessRuleAttributes, secondaryConnection],
  );

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<BusinessRuleMeta>(Boolean(secondaryConnection)),
    [secondaryConnection],
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
