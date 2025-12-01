import React, { useCallback } from "react";
import { observer } from "mobx-react";

import {
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderTitle,
  List,
  ListItem,
  makeStyles,
  OverlayDrawer,
  SelectionItemId,
  SelectTabData,
  SelectTabEvent,
  Tab,
  TableColumnDefinition,
  TabList,
  TabValue,
  tokens,
} from "@fluentui/react-components";

import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { TableDetails } from "./TableDetail";
import { ColumnEditRegular, Dismiss24Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  root: { backgroundColor: tokens.colorNeutralBackground1 },
});

interface MetadataBrowserProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const MetadataBrowser = observer((props: MetadataBrowserProps): React.JSX.Element => {
  const { connection, dvService, onLog, viewModel } = props;
  const [loadingMeta, setLoadingMeta] = React.useState(false);
  const [isTableColumnEditOpen, setIsTableColumnEditOpen] = React.useState(false);
  const [selectedTableCols, setSelectedTableCols] = React.useState<SelectionItemId[]>(viewModel.tableColumns);
  const styles = useStyles();

  const showNotification = useCallback(
    async (title: string, body: string, type: "success" | "info" | "warning" | "error") => {
      try {
        await window.toolboxAPI.utils.showNotification({ title, body, type, duration: 3000 });
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    },
    []
  );

  React.useEffect(() => {
    onLog("Loading tables...", "info");

    if (connection) {
      getTableMeta();
    }
  }, [connection]);

  async function getTableMeta() {
    setLoadingMeta(true);
    await dvService
      .getAllTables()
      .then((tables) => {
        viewModel.tableMetadata = tables;
        onLog(`Loaded ${tables.length} tables from ${connection?.name}`, "success");
      })
      .catch((error: { message: any }) => {
        onLog(`Error loading tables: ${error.message}`, "error");
      })
      .finally(() => {
        setLoadingMeta(false);
      });
  }
  const [selectedValue, setSelectedValue] = React.useState<TabValue>("tables");

  function tableAttributeList() {
    if (
      !viewModel.tableMetadata ||
      viewModel.tableMetadata.length === 0 ||
      viewModel.tableMetadata[0].attributes.length === 0
    ) {
      return [];
    }
    return viewModel.tableMetadata[0].attributes
      .filter((field) => field.attributeName != "DisplayName" && field.attributeName != "LogicalName")
      .map((field) => (
        <ListItem
          key={field.attributeName}
          value={field.attributeName}
          aria-label={field.attributeName}
          checkmark={{ "aria-label": field.attributeName }}
        >
          {field.attributeName}
        </ListItem>
      ));
  }

  function createTableColumnsFrom(): TableColumnDefinition<TableMeta>[] {
    return viewModel.tableColumns
      .filter((col) => col)
      .map((col) =>
        createTableColumn<TableMeta>({
          columnId: col,
          compare: (a, b) => {
            const aVal = a.attributes.find((att) => att.attributeName === col)?.attributeValue ?? "";
            const bVal = b.attributes.find((att) => att.attributeName === col)?.attributeValue ?? "";
            return aVal.localeCompare(bVal);
          },
          renderHeaderCell: () => {
            return col;
          },
          renderCell: (item) => {
            return item.attributes.find((att) => att.attributeName === col)?.attributeValue || "";
          },
        })
      );
  }
  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedValue(data.value);
  };

  function editColumnsClick(): void {
    setIsTableColumnEditOpen(true);
  }

  function saveTableColumnSelection(): void {
    setIsTableColumnEditOpen(false);

    viewModel.tableColumns = selectedTableCols.map((id) => id.toString());
  }

  const tableColumns: TableColumnDefinition<TableMeta>[] = [
    createTableColumn<TableMeta>({
      columnId: "name",
      compare: (a, b) => {
        return a.displayName.localeCompare(b.displayName);
      },
      renderHeaderCell: () => {
        return "Table Name";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.displayName}</div>;
      },
    }),
    createTableColumn<TableMeta>({
      columnId: "logical",
      compare: (a, b) => {
        return a.tableName.localeCompare(b.tableName);
      },
      renderHeaderCell: () => {
        return "Logical";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.tableName}</div>;
      },
    }),
    ...createTableColumnsFrom(),
  ];

  const handleRowDoubleClick = React.useCallback(
    (item: TableMeta) => {
      if (!viewModel.selectedTables) {
        viewModel.selectedTables = [];
      }
      const exists = viewModel.selectedTables.some((t) => t.tableName === item.tableName);
      if (!exists) {
        viewModel.selectedTables.push(item);
        onLog(`Added "${item.displayName}" to selected tables.`, "success");
      } else {
        onLog(`"${item.displayName}" is already in selected tables.`, "info");
      }
    },
    [viewModel, onLog]
  );

  const tableTabs =
    viewModel.selectedTables && viewModel.selectedTables.length > 0 ? (
      (viewModel.selectedTables ?? []).map((t) => (
        <Tab key={t.tableName} id={`Table-${t.tableName}`} value={t.tableName as TabValue}>
          {t.displayName}
        </Tab>
      ))
    ) : (
      <></>
    );

  const tableDetails = viewModel.selectedTables?.map((t) => (
    <div key={t.tableName} role="tabpanel" aria-labelledby={`Table-${t.tableName}`}>
      <TableDetails
        connection={connection}
        dvService={dvService}
        isLoading={loadingMeta}
        viewModel={viewModel}
        table={t.tableName}
        selectedTable={selectedValue as string}
        onLog={onLog}
        showNotification={showNotification}
      />
      {/* Details component can be added here */}
    </div>
  ));

  const DataGridView = React.memo(() => (
    <>
      <DataGrid columns={tableColumns} items={viewModel.tableMetadata} aria-label="Simple data grid" sortable>
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
        <DataGridBody<TableMeta>>
          {({ item, rowId }) => (
            <DataGridRow<TableMeta> key={rowId} onDoubleClick={() => handleRowDoubleClick(item)}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </>
  ));

  if (loadingMeta) {
    return <div>Loading metadata...</div>;
  }

  const tableColumnDrawer = (
    <OverlayDrawer
      position="end"
      open={isTableColumnEditOpen}
      onOpenChange={(_, { open }) => setIsTableColumnEditOpen(open)}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setIsTableColumnEditOpen(false)}
            />
          }
        ></DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <List
          selectionMode="multiselect"
          selectedItems={selectedTableCols}
          onSelectionChange={(_, data) => setSelectedTableCols(data.selectedItems)}
          aria-label="List of attributes to display for columns"
        >
          {tableAttributeList()}
        </List>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", width: "100%" }}>
        <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={saveTableColumnSelection}>
          Save
        </Button>
      </DrawerFooter>
    </OverlayDrawer>
  );
  return (
    <div>
      {tableColumnDrawer}
      <div className={styles.root}>
        <TabList
          style={{ position: "sticky", top: 0, zIndex: 10 }}
          selectedValue={selectedValue}
          onTabSelect={onTabSelect}
        >
          <Tab id="Tables" value="tables">
            Tables
          </Tab>
          {tableTabs}
          <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
            {selectedValue === "tables" && (
              <div style={{ marginLeft: "auto", padding: "0 10px" }}>
                <Button icon={<ColumnEditRegular />} onClick={editColumnsClick} />
              </div>
            )}
          </div>
        </TabList>
        <div>
          {selectedValue === "tables" && <DataGridView />}
          {tableDetails}
        </div>
      </div>
    </div>
  );
});
