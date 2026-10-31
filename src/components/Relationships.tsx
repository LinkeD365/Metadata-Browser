import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { RelationshipMeta, TableMeta } from "../model/tableMeta";
import { Spinner, TableRowId } from "@fluentui/react-components";

import { ColDef, SelectionChangedEvent, RowSelectionOptions, RowStyleModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { ViewModel } from "../model/ViewModel";
import {
  createConnectionDisplayColumns,
  createConnectionRowClassRules,
  loadConnectionRecordSets,
  mergeConnectionRecordSets,
} from "../utils/connectionComparison";

interface RelationshipsProps {
  connections: Array<ToolBoxAPI.DataverseConnection | null>;
  viewModel: ViewModel;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  type: string;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Relationships = observer((props: RelationshipsProps): React.JSX.Element => {
  const { connections, dvService, onLog, selectedTable, showNotification, type, viewModel } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading Relationships for table: ${selectedTable.tableName}`, "info");
    if (selectedTable && selectedTable.relationships.filter((r) => r.type === type).length === 0) {
      getRelationshipMeta();
    }
  }, [selectedTable]);

  async function getRelationshipMeta() {
    if (!connections.some(Boolean)) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    setLoadingMeta(true);
    const relationshipSets = await loadConnectionRecordSets(
      connections,
      (index) => selectedTable.connectionPresence[index] ?? (index === 0 ? selectedTable.hasPrimaryConnection : index === 1 && selectedTable.hasSecondaryConnection),
      (index) => dvService.getRelationshipsMeta(selectedTable, type, index),
      (relationship) => relationship.relationshipName,
    );

    selectedTable.relationships = mergeConnectionRecordSets(
      relationshipSets,
      (relationship) => relationship.relationshipName,
      ["relationshipName"],
    );
    onLog(
      `Loaded ${selectedTable.relationships.length} relationships for table: ${selectedTable.tableName}`,
      "success",
    );
    setLoadingMeta(false);
    return;
  }

  const filteredRelationships: RelationshipMeta[] = React.useMemo(() => {
    if (!selectedTable || selectedTable.relationshipSearch?.trim() === "") {
      return selectedTable.relationships;
    } else
      return selectedTable.relationships.filter((t) =>
        t.relationshipName.toLowerCase().includes(selectedTable.relationshipSearch?.toLowerCase() ?? ""),
      );
  }, [selectedTable.relationshipSearch, selectedTable.relationships, selectedTable.relationships.length]);

  const defaultColDefs = React.useMemo<ColDef>(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      filter: true,
      wrapText: true,
      autoHeight: true,
    };
  }, []);
  const createRelAttribs = React.useMemo<ColDef<RelationshipMeta>[]>(() => {
    if (
      !selectedTable.relationships ||
      selectedTable.relationships.length === 0 ||
      selectedTable.relationships.filter((r) => r.type === type).length === 0
    ) {
      return [];
    }
    // const cols = selectedTable.Relationships.filter((r) => r.type === type)[0].attributes || [];
    return viewModel.relationshipAttributes
      .filter((attr) => attr.type === type)
      .map(
        (col) =>
          ({
            headerName: col.attributeName,
            valueGetter: (params) => {
              const attr = params.data?.attributes?.find((a) => a.attributeName === col.attributeName);
              return attr?.attributeValue || "";
            },
          }) as ColDef<RelationshipMeta>,
      );
  }, [selectedTable.relationships.length, type, viewModel.relationshipAttributes]);

  const colDefs = React.useMemo<ColDef<RelationshipMeta>[]>(
    () => [
      {
        headerName: "Relationship Name",
        field: "relationshipName",
        flex: 2,
        sort: "asc",
        valueGetter: (params) =>
          !params.data?.hasPrimaryConnection ? "" : (params.data?.relationshipName ?? ""),
      },
      ...createConnectionDisplayColumns<RelationshipMeta>(connections, "Relationship Name"),
      ...createRelAttribs,
    ],
    [connections, createRelAttribs],
  );

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<RelationshipMeta>(connections.filter(Boolean).length > 1),
    [connections],
  );

  function relsSelected(event: SelectionChangedEvent<RelationshipMeta>): void {
    const selectedRows = event.api.getSelectedRows();
    const selectedIds = new Set<TableRowId>(selectedRows.map((col) => col.relationshipName as TableRowId));
    selectedTable.selectedRelationships = new Set<string>(Array.from(selectedIds) as string[]);
  }
  const rowSelection = React.useMemo<RowSelectionOptions | "single" | "multiple">(() => {
    return {
      mode: "multiRow",
    };
  }, []);
  const relationshipsGrid = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<RelationshipMeta>
        theme={agGridTheme}
        modules={[RowStyleModule]}
        rowData={filteredRelationships.filter((r) => r.type === type)}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowClassRules={rowClassRules}
        rowSelection={rowSelection}
        onSelectionChanged={relsSelected}
        getRowId={(params) => params.data?.relationshipName ?? ""}
        enableCellTextSelection={true}
      />
    </div>
  );

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Relationships Metadata..." />;
  }

  return (
    <div>
      {selectedTable.relationships.filter((r) => r.type === type).length === 0 && (
        <div style={{ textAlign: "center" }}>No Relationships found for this table.</div>
      )}
      {selectedTable.relationships.filter((r) => r.type === type).length > 0 && relationshipsGrid}
    </div>
  );
});
