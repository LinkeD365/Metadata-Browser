import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { RelationshipMeta, TableMeta } from "../model/tableMeta";
import { Spinner, TableRowId } from "@fluentui/react-components";

import {
  ColDef,
  SelectionChangedEvent,
  RowSelectionOptions,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import { ViewModel } from "../model/ViewModel";

interface RelationshipsProps {
  viewModel: ViewModel;
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  selectedTable: TableMeta;
  type: string;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const Relationships = observer((props: RelationshipsProps): React.JSX.Element => {
  const { connection, dvService, onLog, selectedTable, showNotification, type, viewModel } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    onLog(`Loading Relationships for table: ${selectedTable.tableName}`, "info");
    if (selectedTable && selectedTable.Relationships.filter((r) => r.type === type).length === 0) {
      getRelationshipMeta();
    }
  }, [selectedTable]);

  async function getRelationshipMeta() {
    if (!connection) {
      await showNotification("No Connection", "Please connect to a Dataverse environment", "warning");
      return;
    }

    //console.log("Fetching Relationships metadata for table: ", selectedTable.tableName);

    setLoadingMeta(true);
    await dvService
      .loadRelationshipMeta(selectedTable, type)
      .then((relationships) => {
        console.log("Relationships metadata loaded: ", relationships);
        selectedTable.Relationships.push(...relationships);
        onLog(`Loaded ${relationships.length} relationships for table: ${selectedTable.tableName}`, "success");
      })
      .catch((error: { message: any }) => {
        onLog(`Error loading relationships for table ${selectedTable.tableName}: ${error.message}`, "error");
      });
    setLoadingMeta(false);
    return;
  }

  const filteredRelationships: RelationshipMeta[] = React.useMemo(() => {
    if (!selectedTable || selectedTable.relationshipSearch?.trim() === "") {
      return selectedTable.Relationships;
    } else
      return selectedTable.Relationships.filter((t) =>
        t.relationshipName.toLowerCase().includes(selectedTable.relationshipSearch?.toLowerCase() ?? "")
      );
  }, [selectedTable.relationshipSearch, selectedTable.Relationships, selectedTable.Relationships.length]);

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
      !selectedTable.Relationships ||
      selectedTable.Relationships.length === 0 ||
      selectedTable.Relationships.filter((r) => r.type === type).length === 0
    ) {
      return [];
    }
    console.log("Creating relationship attributes for type: ", type, viewModel.relationshipAttributes);
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
          } as ColDef<RelationshipMeta>)
      );
  }, [selectedTable.Relationships.length, type, viewModel.relationshipAttributes]);

  const colDefs = React.useMemo<ColDef<RelationshipMeta>[]>(
    () => [{ headerName: "Relationship Name", field: "relationshipName", flex: 2 }, ...createRelAttribs],
    [createRelAttribs]
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
        rowData={filteredRelationships.filter((r) => r.type === type)}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowSelection={rowSelection}
        onSelectionChanged={relsSelected}
        getRowId={(params) => params.data?.relationshipName ?? ""}
      />
    </div>
  );

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Relationships Metadata..." />;
  }

  return (
    <div>
      {selectedTable.Relationships.filter((r) => r.type === type).length === 0 && (
        <div style={{ textAlign: "center" }}>No Relationships found for this table.</div>
      )}
      {selectedTable.Relationships.filter((r) => r.type === type).length > 0 && relationshipsGrid}
    </div>
  );
});
