import React, { useCallback } from "react";
import { observer } from "mobx-react";
import {
  ColDef,
  RowSelectionOptions,
  SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";

import {
  Button,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderTitle,
  InputOnChangeData,
  Label,
  List,
  ListItem,
  makeStyles,
  Menu,
  MenuButtonProps,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  OverlayDrawer,
  SearchBox,
  SearchBoxChangeEvent,
  SelectionItemId,
  SelectTabData,
  SelectTabEvent,
  Spinner,
  SplitButton,
  Tab,
  TableRowId,
  TabList,
  TabValue,
  ToggleButton,
  tokens,
} from "@fluentui/react-components";

import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { TableDetails } from "./TableDetail";
import {
  ArrowExportUpRegular,
  ColumnEditRegular,
  Dismiss24Regular,
  EditRegular,
  LockClosedRegular,
  TextboxMoreRegular,
} from "@fluentui/react-icons";

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
  const [isSolutionSelOpen, setIsSolutionSelOpen] = React.useState(false);
  const [selectedTableCols, setSelectedTableCols] = React.useState<SelectionItemId[]>(viewModel.tableAttributes);
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("tables");
  const [managed, setManaged] = React.useState<boolean>(false);
  const [selectedSolutionIds, setSelectedSolutionIds] = React.useState<SelectionItemId[]>([]);
  const [tableQuery, setTableQuery] = React.useState<string>("");
  const [selectedTables, setSelectedTables] = React.useState<Set<TableRowId>>();

  const filterdTableMetadata: TableMeta[] = React.useMemo(() => {
    if (!tableQuery || tableQuery.trim() === "") {
      return viewModel.tableMetadata;
    } else
      return viewModel.tableMetadata.filter(
        (t) =>
          t.displayName.toLowerCase().includes(tableQuery.toLowerCase()) ||
          t.tableName.toLowerCase().includes(tableQuery.toLowerCase())
      );
  }, [tableQuery, viewModel.tableMetadata]);
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
    if (isSolutionSelOpen) {
      dvService
        .getSolutions(managed)
        .then((solutions) => {
          viewModel.solutions = solutions;
          onLog(`Loaded ${solutions.length} solutions from ${connection?.name}`, "success");
        })
        .catch((error: { message: any }) => {
          onLog(`Error loading solutions: ${error.message}`, "error");
        });
    }
  }, [isSolutionSelOpen, managed]);

  async function getAllTableMeta() {
    viewModel.selectedSolution = undefined;
    getTableMeta();
  }
  async function getTableMeta() {
    setLoadingMeta(true);
    if (viewModel.selectedSolution) {
      await dvService
        .getSolutionTables(viewModel.selectedSolution.uniqueName)
        .then((tables) => {
          viewModel.tableMetadata = tables;
          console.log(tables);
          onLog(`Loaded ${tables.length} tables from solution: ${viewModel.selectedSolution?.solutionName}`, "success");
        })
        .catch((error: { message: any }) => {
          onLog(`Error loading tables from solution: ${error.message}`, "error");
        })
        .finally(() => {
          setLoadingMeta(false);
        });
    } else {
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
  }

  function tableAttributeList() {
    if (
      !viewModel.tableMetadata ||
      viewModel.tableMetadata.length === 0 ||
      viewModel.tableMetadata[0].attributes.length === 0
    ) {
      return [];
    }
    return viewModel.tableMetadata[0].attributes
      .filter((attr) => attr.attributeName != "DisplayName" && attr.attributeName != "LogicalName")
      .map((attr) => (
        <ListItem
          key={attr.attributeName}
          value={attr.attributeName}
          aria-label={attr.attributeName}
          checkmark={{ "aria-label": attr.attributeName }}
        >
          {attr.attributeName}
        </ListItem>
      ));
  }

  function solutionSelectList() {
    if (!viewModel.solutions || viewModel.solutions.length === 0) {
      return [];
    }
    return viewModel.solutions.map((solution) => (
      <ListItem
        key={solution.solutionId}
        value={solution.solutionId}
        aria-label={solution.solutionName}
        checkmark={{ "aria-label": solution.solutionName }}
      >
        {solution.solutionName} ({solution.uniqueName})
      </ListItem>
    ));
  }

  const searchTables = async (_searchQuery: string) => {
    setTableQuery(_searchQuery);
  };

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value);
  };

  const debounce = <T extends (searchQuery: string) => unknown>(func: T, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (searchQuery: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(searchQuery), delay);
    };
  };

  const debouncedTableSearch = React.useCallback(debounce(searchTables, 300), []);

  function tableSearch(_e: SearchBoxChangeEvent, data: InputOnChangeData): void {
    //setTableQuery(data.value ?? "");
    console.log("Table search input: ", tableQuery);
    debouncedTableSearch(data.value ?? "");
  }

  function editColumnsClick(): void {
    setIsTableColumnEditOpen(true);
  }

  function exportTablesClick(): void {
    if (selectedTables === undefined || selectedTables.size === 0) {
      window.toolboxAPI.utils.showNotification({
        title: "No Tables Selected",
        body: "Please select one or more tables to export.",
      });
      return;
    }
    const data = viewModel.tableMetadata.filter((t) =>
      selectedTables ? selectedTables.has(t.tableName as TableRowId) : false
    );

    const headers = ["Table Name", "Logical Name", ...viewModel.tableAttributes.map((attr) => attr)];
    const rows = data.map((table) => [
      table.displayName,
      table.tableName,
      ...viewModel.tableAttributes.map(
        (attr) => table.attributes.find((a) => a.attributeName === attr)?.attributeValue || ""
      ),
    ]);
    const csvString = [headers, ...rows].map((row) => row.join(",")).join("\n");

    console.log("CSV Data:\n", csvString);
    window.toolboxAPI.utils.saveFile("tables_metadata.csv", csvString);
    // const csvString = [
    //   ["Header1", "Header2", "Header3"], // Specify your headers here
    //   ...data.map((item) => [item.field1, item.field2, item.field3]), // Map your data fields accordingly
    // ]
    //   .map((row) => row.join(","))
    //   .join("\n");

    // // Create a Blob from the CSV string
    // const blob = new Blob([csvString], { type: "text/csv" });
  }

  function saveTableColumnSelection(): void {
    viewModel.tableAttributes = selectedTableCols.map((id) => id.toString());
    setIsTableColumnEditOpen(false);
  }

  async function saveDefaultTableColumnSelection(): Promise<void> {
    saveTableColumnSelection();
    try {
      await window.toolboxAPI.settings.set("defaultTableColumns", viewModel.tableAttributes.toString());
      window.toolboxAPI.utils.showNotification({
        title: "Default Saved",
        body: "Default table columns have been saved.",
        type: "success",
      });
    } catch (error) {
      window.toolboxAPI.utils.showNotification({
        title: "Save Failed",
        body: "Failed to save default table columns.",
        type: "error",
      });
    }
  }

  function saveSolutionSelection(): void {
    setIsSolutionSelOpen(false);
    if (selectedSolutionIds.length === 0) {
      onLog("No solution selected.", "warning");
      return;
    }
    viewModel.selectedSolution = viewModel.solutions.find(
      (sol) => sol.solutionId === selectedSolutionIds[0].toString()
    );
    getTableMeta();
  }

  const handleRowDoubleClick = React.useCallback(
    (item: TableMeta) => {
      console.log("Row double clicked: ", item);
      if (!viewModel.selectedTables) {
        viewModel.selectedTables = [];
      }
      const exists = viewModel.selectedTables.some((t) => t.tableName === item.tableName);
      if (!exists) {
        viewModel.selectedTables.push(item);
        onLog(`Added "${item.displayName}" to selected tables.`, "success");
      }
      setSelectedTab(item.tableName as TabValue);
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
        selectedTable={selectedTab as string}
        onLog={onLog}
        showNotification={showNotification}
      />
      {/* Details component can be added here */}
    </div>
  ));

  const defaultColDefs = React.useMemo<ColDef>(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      filter: true,
    };
  }, []);

  const colDefs = React.useMemo<ColDef<TableMeta>[]>(
    () => [
      {
        headerName: "",
        sortable: false,
        filter: false,
        width: 60,
        resizable: false,
        maxWidth: 60,
        minWidth: 60,
        cellRenderer: (params: CustomCellRendererProps<TableMeta>) => {
          return (
            <Button
              icon={<TextboxMoreRegular />}
              size="small"
              appearance="secondary"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleRowDoubleClick(params.data!);
              }}
            />
          );
        },
      },
      {
        headerName: "Table Name",
        field: "displayName",
        flex: 2,
      },
      {
        headerName: "Logical Name",
        field: "tableName",
      },
      ...viewModel.tableAttributes
        .filter((col) => col)
        .map(
          (col) =>
            ({
              headerName: col,
              valueGetter: (params) => {
                const attr = params.data?.attributes?.find((a) => a.attributeName === col);
                return attr?.attributeValue || "";
              },
            } as ColDef<TableMeta>)
        ),
    ],
    [viewModel.tableAttributes]
  );

  const rowSelection = React.useMemo<RowSelectionOptions | "single" | "multiple">(() => {
    return {
      mode: "multiRow",
    };
  }, []);

  function tableSelected(event: SelectionChangedEvent<TableMeta>): void {
    const selectedRows = event.api.getSelectedRows();
    const selectedIds = new Set<TableRowId>(selectedRows.map((row) => row.tableName as TableRowId));
    setSelectedTables(selectedIds);
  }

  const tableGrid = (
    <div style={{ width: "98vw", height: "93vh" }}>
      <AgGridReact<TableMeta>
        theme={agGridTheme}
        rowData={filterdTableMetadata}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        rowSelection={rowSelection}
        onSelectionChanged={tableSelected}
        getRowId={(params) => params.data?.tableName ?? ""}
        onRowDoubleClicked={(event) => handleRowDoubleClick(event.data!)}
      />
    </div>
  );

  // if (loadingMeta) {
  //   return <div>Loading metadata...</div>;
  // }

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
          Apply
        </Button>
        <Button onClick={saveDefaultTableColumnSelection}>Set Default</Button>
      </DrawerFooter>
    </OverlayDrawer>
  );

  const solutionSelDrawer = (
    <OverlayDrawer position="end" open={isSolutionSelOpen} onOpenChange={(_, { open }) => setIsSolutionSelOpen(open)}>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setIsSolutionSelOpen(false)}
            />
          }
        >
          Select a Solution
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <ToggleButton
            onClick={() => {
              setManaged(false);
              //onLog("Managed filter set to TRUE", "info");
            }}
            checked={!managed}
            shape="circular"
            size="small"
            appearance="subtle"
            aria-label="Show unmanaged solutions"
            title="Show Unmanaged"
            icon={<EditRegular />}
          >
            Unmanaged
          </ToggleButton>

          <ToggleButton
            onClick={() => {
              setManaged(true);
            }}
            checked={managed}
            shape="circular"
            size="small"
            appearance="subtle"
            aria-label="Show managed solutions"
            title="Show Managed"
            icon={<LockClosedRegular />}
          >
            Managed
          </ToggleButton>
        </div>
        <List
          selectionMode="single"
          selectedItems={selectedSolutionIds}
          onSelectionChange={(_, data) => setSelectedSolutionIds(data.selectedItems)}
          aria-label="List of solutions"
        >
          <div style={{ fontSize: "small" }}>{solutionSelectList()}</div>
        </List>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", width: "100%" }}>
        <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={saveSolutionSelection}>
          Save
        </Button>
      </DrawerFooter>
    </OverlayDrawer>
  );

  const allTablesMenu = (
    <Menu positioning="below-end">
      <MenuTrigger disableButtonEnhancement>
        {(triggerProps: MenuButtonProps) => (
          <SplitButton menuButton={triggerProps} primaryActionButton={{ onClick: () => setIsSolutionSelOpen(true) }}>
            Select a Solution
          </SplitButton>
        )}
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          <MenuItem onClick={getAllTableMeta}>All Tables</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  return (
    <div>
      {tableColumnDrawer}
      {solutionSelDrawer}
      <div className={styles.root}>
        <TabList
          style={{ position: "sticky", top: 0, zIndex: 10 }}
          selectedValue={selectedTab}
          onTabSelect={onTabSelect}
        >
          <Tab id="Tables" value="tables">
            Tables
          </Tab>
          {tableTabs}
          <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
            {selectedTab === "tables" && (
              <div style={{ marginLeft: "auto", padding: "0 10px" }}>
                {viewModel.tableMetadata.length > 0 && (
                  <SearchBox
                    size="small"
                    placeholder="Search Tables"
                    aria-label="Search Display & Logical Name"
                    onChange={tableSearch}
                    style={{ margin: "2px" }}
                  />
                )}
                {viewModel.selectedSolution && (
                  <Label size="small" style={{ padding: "2px 2px" }}>
                    Solution: {viewModel.selectedSolution?.solutionName}{" "}
                  </Label>
                )}
                <div style={{ display: "inline-block", padding: "0 2px" }}>{allTablesMenu}</div>
                <Button
                  icon={<ColumnEditRegular />}
                  onClick={editColumnsClick}
                  disabled={viewModel.tableMetadata.length === 0}
                />
                <Button
                  icon={<ArrowExportUpRegular />}
                  onClick={exportTablesClick}
                  disabled={!selectedTables || selectedTables.size === 0}
                />
              </div>
            )}
          </div>
        </TabList>
        <div>
          {loadingMeta ? (
            <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Metadata..." />
          ) : !viewModel.tableMetadata || viewModel.tableMetadata.length === 0 ? (
            <div style={{ textAlign: "center" }}>Select a Solution or All Tables to load metadata.</div>
          ) : (
            <>
              {selectedTab === "tables" && tableGrid}
              {tableDetails}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
