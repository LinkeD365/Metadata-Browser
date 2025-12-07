import React from "react";
import { observer } from "mobx-react";
import { dvService } from "../utils/dataverse";
import { RelationshipMeta, TableMeta } from "../model/tableMeta";
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
  DataGridProps,
  TableRowId,
} from "@fluentui/react-components";
import JSONPretty from "react-json-pretty";
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
  const [selectedRelationships, setSelectedRelationships] = React.useState<Set<TableRowId>>();
  React.useEffect(() => {
    onLog(`Loading Relationships for table: ${selectedTable.tableName}`, "info");
    if (selectedTable && selectedTable.Relationships.filter((r) => r.type === type).length === 0) {
      getRelationshipMeta();
    }
  }, [selectedTable]);

  async function getRelationshipMeta() {
    if (!connection || !connection.isActive) {
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

  const onRelationshipSelected: DataGridProps["onSelectionChange"] = (_e, data) => {
    console.log(data);
    setSelectedRelationships(data.selectedItems);
    selectedTable.selectedRelationships = new Set<string>(Array.from(data.selectedItems) as string[]);
  };

  const createRelationshipAttributes = React.useMemo<TableColumnDefinition<RelationshipMeta>[]>(() => {
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
      .map((col) =>
        createTableColumn<RelationshipMeta>({
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
  }, [selectedTable.Relationships.length, type, viewModel.relationshipAttributes]);

  const attributes: TableColumnDefinition<RelationshipMeta>[] = [
    createTableColumn<RelationshipMeta>({
      columnId: "name",
      compare: (a, b) => {
        return a.relationshipName.localeCompare(b.relationshipName);
      },
      renderHeaderCell: () => {
        return "Relationship Name";
      },
      renderCell: (item) => {
        return <div className="grid-cell-content" style={{ verticalAlign: "top" }} title={item.relationshipName}>{item.relationshipName}</div>;
      },
    }),
    ...createRelationshipAttributes,
  ];

  const columnSizingOptions = {
    name: {
      minWidth: 120,
      maxWidth: 400,
      idealWidth: 200,
      defaultWidth: 120,
    },
  };

  if (loadingMeta) {
    return <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Relationships Metadata..." />;
  }

  return (
    <div>
      {selectedTable.Relationships.filter((r) => r.type === type).length === 0 && (
        <div style={{ textAlign: "center" }}>No Relationships found for this table.</div>
      )}
      {selectedTable.Relationships.filter((r) => r.type === type).length > 0 && (
        <DataGrid
          columns={attributes}
          items={filteredRelationships.filter((r) => r.type === type)}
          columnSizingOptions={columnSizingOptions}
          getRowId={(item) => item.relationshipName}
          selectionMode="multiselect"
          subtleSelection
          selectionAppearance="neutral"
          selectedItems={selectedRelationships}
          onSelectionChange={onRelationshipSelected}
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
          <DataGridBody<RelationshipMeta>>
            {({ item, rowId }) => (
              <DataGridRow<RelationshipMeta> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </div>
  );
});
