import React, { useCallback } from "react";
import { observer } from "mobx-react";
import {
  ColDef,
  RowSelectionOptions,
  SelectionChangedEvent,
  RowStyleModule,
  ValidationModule,
} from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";
import {
  Button,
  InputOnChangeData,
  Label,
  makeStyles,
  Menu,
  MenuButtonProps,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
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
  tokens,
  Tooltip,
} from "@fluentui/react-components";

import { ViewModel } from "../model/ViewModel";
import { dvService as DataverseService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";
import { TableDetails } from "./TableDetail";
import { ColumnEditRegular, DismissRegular, OpenRegular, TextboxMoreRegular } from "@fluentui/react-icons";
import { ExportPopover } from "./ExportPopover";
import { TableColumnDrawer } from "./TableColumnDrawer";
import { SolutionSelectorDrawer } from "./SolutionSelectorDrawer";
import {
  createConnectionDisplayColumns,
  createConnectionRowClassRules,
  getConnectionDisplayLabel,
} from "../utils/connectionComparison";

const useStyles = makeStyles({
  root: { backgroundColor: tokens.colorNeutralBackground1 },
  tabLabel: { display: "inline-flex", alignItems: "center", gap: tokens.spacingHorizontalXXS },
});

interface MetadataBrowserProps {
  connections: Array<ToolBoxAPI.DataverseConnection | null>;
  dvService: DataverseService;
  isLoading: boolean;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const MetadataBrowser = observer((props: MetadataBrowserProps): React.JSX.Element => {
  const { connections, dvService, onLog, vm } = props;
  const primaryConnection = connections[0] ?? null;
  const selectSolutionLabel = "Select a solution to load tables";
  const openTableSourceOptionsLabel = "Open table source options";
  const openExportDialogLabel = "Open export dialog";
  const openExportOptionsLabel = "Open export options";
  const chooseVisibleColumnsLabel = "Choose visible table columns";
  const [loadingMeta, setLoadingMeta] = React.useState(false);
  const [isTableColumnEditOpen, setIsTableColumnEditOpen] = React.useState(false);
  const [isSolutionSelOpen, setIsSolutionSelOpen] = React.useState(false);
  const [selectedTableCols, setSelectedTableCols] = React.useState<SelectionItemId[]>(vm.tableAttributes);
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("tables");
  const [managed, setManaged] = React.useState<boolean>(false);
  const [selectedSolutionIds, setSelectedSolutionIds] = React.useState<SelectionItemId[]>([]);
  const [solutionQuery, setSolutionQuery] = React.useState<string>("");
  const [tableQuery, setTableQuery] = React.useState<string>("");
  const [selectedTables, setSelectedTables] = React.useState<Set<TableRowId>>();
  const [isExportPopoverOpen, setIsExportPopoverOpen] = React.useState<boolean>(false);

  const filterdTableMetadata: TableMeta[] = React.useMemo(() => {
    if (!tableQuery || tableQuery.trim() === "") {
      return vm.tableMetadata;
    } else
      return vm.tableMetadata.filter(
        (t) =>
          t.primaryDisplayName.toLowerCase().includes(tableQuery.toLowerCase()) ||
          t.connectionDisplayNames?.some((name) => name?.toLowerCase().includes(tableQuery.toLowerCase())) ||
          t.tableName.toLowerCase().includes(tableQuery.toLowerCase()),
      );
  }, [tableQuery, vm.tableMetadata]);
  const styles = useStyles();

  const showNotification = useCallback(
    async (title: string, body: string, type: "success" | "info" | "warning" | "error") => {
      try {
        await window.toolboxAPI.utils.showNotification({ title, body, type, duration: 3000 });
      } catch {
        console.error("Failed to show notification.");
      }
    },
    [],
  );

  const getMergedAllTables = useCallback(async (): Promise<TableMeta[]> => {
    return dvService.getComparisonTables();
  }, [dvService]);

  const getMergedSolutionTables = useCallback(async (): Promise<TableMeta[]> => {
    const selectedSolution = vm.selectedSolution;
    if (!selectedSolution) {
      return [];
    }

    return dvService.getComparisonTables(selectedSolution.uniqueName);
  }, [dvService, vm.selectedSolution]);

  const openTableInConnectionBrowser = useCallback(
    async (table: TableMeta) => {
      if (!table.metaId) {
        onLog(`Cannot open table ${table.tableName}: missing table metadata ID.`, "warning");
        return;
      }
      const connectionTarget = table.sourceConnectionIndex ?? 0;
      if (!connections[connectionTarget]) {
        onLog("Cannot open table: its source environment is no longer connected.", "warning");
        await showNotification("No active connection", "Reconnect the table's source environment before opening it.", "warning");
        return;
      }
      const toolboxUtils = window.toolboxAPI.utils;

      try {
        const tableUrl = await dvService.getTableBrowserUrl(table.metaId, "", connectionTarget);
        await toolboxUtils.openInConnectionBrowser(tableUrl, connectionTarget);
      } catch (error) {
        const message = (error as Error).message || "Unknown error";
        onLog(`Failed to open table ${table.tableName}: ${message}`, "error");
      }
    },
    [connections, onLog, showNotification],
  );

  const renderOpenTableButton = useCallback(
    (
      table: TableMeta,
      options?: {
        appearance?: "secondary" | "subtle" | "transparent";
        size?: "small" | "medium" | "large";
        iconFontSize?: number;
        stopPropagation?: boolean;
      },
    ) => (
      <Tooltip content={`Open ${table.primaryDisplayName} definition in browser`} relationship="label">
        <Button
          aria-label={`Open ${table.primaryDisplayName} definition in browser`}
          icon={<OpenRegular fontSize={options?.iconFontSize} />}
          size={options?.size ?? "small"}
          appearance={options?.appearance ?? "secondary"}
          onClick={(e: React.MouseEvent) => {
            if (options?.stopPropagation) {
              e.stopPropagation();
            }
            void openTableInConnectionBrowser(table);
          }}
        />
      </Tooltip>
    ),
    [openTableInConnectionBrowser],
  );

  React.useEffect(() => {
    if (isSolutionSelOpen) {
      void (async () => {
        try {
          vm.solutions = await dvService.getSolutions(managed, 0);
          onLog(`Loaded ${vm.solutions.length} solutions from the primary connection.`, "success");
        } catch (error) {
          vm.solutions = [];
          onLog(`Error loading solutions: ${(error as Error).message}`, "error");
          await showNotification("Error", "Unable to load solutions from the primary connection.", "error");
        }
      })();
    }
  }, [dvService, isSolutionSelOpen, managed, onLog, showNotification, vm]);

  async function getAllTableMeta() {
    vm.selectedSolution = undefined;
    getTableMeta();
  }
  async function getTableMeta() {
    setLoadingMeta(true);
    if (vm.selectedSolution) {
      await getMergedSolutionTables()
        .then((tables) => {
          vm.tableMetadata = tables;
          onLog(
            `Loaded ${tables.length} tables from the primary connection's solution for comparison.`,
            "success",
          );
        })
        .catch((error: { message: any }) => {
          onLog(`Error loading tables from solution: ${error.message}`, "error");
        })
        .finally(() => {
          setLoadingMeta(false);
        });
    } else {
      await getMergedAllTables()
        .then((tables) => {
          vm.tableMetadata = tables;
          onLog(
            `Loaded ${tables.length} tables from the primary connection for comparison.`,
            "success",
          );
        })
        .catch((error: { message: any }) => {
          onLog(`Error loading tables: ${error.message}`, "error");
        })
        .finally(() => {
          setLoadingMeta(false);
        });
    }
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
    const data = vm.tableMetadata.filter((t) =>
      selectedTables ? selectedTables.has(t.tableName as TableRowId) : false,
    );

    const headers = ["Table Name", "Logical Name", ...vm.tableAttributes.map((attr) => attr)];
    const rows = data.map((table) => [
      table.primaryDisplayName,
      table.tableName,
      ...vm.tableAttributes.map((attr) => table.attributes.find((a) => a.attributeName === attr)?.attributeValue || ""),
    ]);
    const csvString = [headers, ...rows].map((row) => row.join(",")).join("\n");

    window.toolboxAPI.fileSystem.saveFile("tables_metadata.csv", csvString);
  }

  function saveTableColumnSelection(): void {
    vm.tableAttributes = selectedTableCols.map((id) => id.toString());
    setIsTableColumnEditOpen(false);
  }

  async function saveDefaultTableColumnSelection(): Promise<void> {
    saveTableColumnSelection();
    try {
      await window.toolboxAPI.settings.set("defaultTableColumns", vm.tableAttributes.toString());
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
    vm.selectedSolution = vm.solutions.find((sol) => sol.solutionId === selectedSolutionIds[0].toString());
    getTableMeta();
  }

  const handleRowDoubleClick = React.useCallback(
    (item: TableMeta) => {
      if (!vm.selectedTables) {
        vm.selectedTables = [];
      }
      const exists = vm.selectedTables.some((t) => t.tableName === item.tableName);
      if (!exists) {
        vm.selectedTables.push(item);
        onLog(`Added "${item.primaryDisplayName}" to selected tables.`, "success");
      }
      setSelectedTab(item.tableName as TabValue);
    },
    [vm, onLog],
  );

  const closeTab = useCallback(
    (tableName: string) => {
      vm.selectedTables = (vm.selectedTables ?? []).filter((t) => t.tableName !== tableName);
      if (selectedTab === tableName) {
        setSelectedTab("tables");
      }
    },
    [vm, selectedTab],
  );

  const tableTabs =
    vm.selectedTables && vm.selectedTables.length > 0 ? (
      (vm.selectedTables ?? []).map((t) => (
        <Tab key={t.tableName} id={`Table-${t.tableName}`} value={t.tableName as TabValue}>
          <span className={styles.tabLabel}>
            <span>{t.primaryDisplayName}</span>
            {renderOpenTableButton(t, {
              appearance: "subtle",
              size: "small",
              iconFontSize: 12,
              stopPropagation: true,
            })}
            <Tooltip content={`Close ${t.primaryDisplayName} tab`} relationship="label">
              <Button
                aria-label={`Close ${t.primaryDisplayName} tab`}
                icon={<DismissRegular fontSize={12} />}
                size="small"
                appearance="subtle"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  closeTab(t.tableName);
                }}
              />
            </Tooltip>
          </span>
        </Tab>
      ))
    ) : (
      <></>
    );

  const tableDetails = vm.selectedTables?.map((t) => (
    <div key={t.tableName} role="tabpanel" aria-labelledby={`Table-${t.tableName}`}>
      <TableDetails
        connections={connections}
        dvService={dvService}
        isLoading={loadingMeta}
        viewModel={vm}
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
          const label = `Open details tab for ${params.data?.primaryDisplayName ?? "table"}`;
          return (
            <Tooltip content={label} relationship="label">
              <Button
                aria-label={label}
                icon={<TextboxMoreRegular />}
                size="small"
                appearance="secondary"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleRowDoubleClick(params.data!);
                }}
              />
            </Tooltip>
          );
        },
      },
      {
        headerName: "",
        sortable: false,
        filter: false,
        width: 60,
        resizable: false,
        maxWidth: 60,
        minWidth: 60,
        cellRenderer: (params: CustomCellRendererProps<TableMeta>) => {
          const table = params.data;
          if (!table) return null;
          return renderOpenTableButton(table, { stopPropagation: true });
        },
      },
      {
        headerName: `${getConnectionDisplayLabel(primaryConnection, 0)} Table Name`,
        field: "primaryDisplayName",
        flex: 2,
        sort: "asc",
      },
      ...createConnectionDisplayColumns<TableMeta>(connections, "Table Name"),
      {
        headerName: "Logical Name",
        field: "tableName",
      },
      ...vm.tableAttributes
        .filter((col) => col)
        .map(
          (col) =>
            ({
              headerName: col,
              valueGetter: (params) => {
                const attr = params.data?.attributes?.find((a) => a.attributeName === col);
                return attr?.attributeValue || "";
              },
            }) as ColDef<TableMeta>,
        ),
    ],
    [connections, primaryConnection, renderOpenTableButton, vm.tableAttributes],
  );

  const rowSelection = React.useMemo<RowSelectionOptions | "single" | "multiple">(() => {
    return {
      mode: "multiRow",
    };
  }, []);

  const rowClassRules = React.useMemo(
    () => createConnectionRowClassRules<TableMeta>(connections.filter(Boolean).length > 1),
    [connections],
  );

  function tableSelected(event: SelectionChangedEvent<TableMeta>): void {
    const selectedRows = event.api.getSelectedRows();
    const selectedIds = new Set<TableRowId>(selectedRows.map((row) => row.tableName as TableRowId));
    setSelectedTables(selectedIds);
    vm.selectedTables = selectedRows;
  }

  const tableGrid = (
    <div style={{ width: "98vw", height: "93vh" }}>
      <AgGridReact<TableMeta>
        theme={agGridTheme}
        modules={[RowStyleModule, ValidationModule]}
        rowData={filterdTableMetadata}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        rowClassRules={rowClassRules}
        domLayout="normal"
        rowSelection={rowSelection}
        onSelectionChanged={tableSelected}
        getRowId={(params) => params.data?.tableName ?? ""}
        onRowDoubleClicked={(event) => handleRowDoubleClick(event.data!)}
        enableCellTextSelection={true}
      />
    </div>
  );

  // if (loadingMeta) {
  //   return <div>Loading metadata...</div>;
  // }

  const allTablesMenu = (
    <Menu positioning="below-end">
      <MenuTrigger disableButtonEnhancement>
        {(triggerProps: MenuButtonProps) => (
          <Tooltip content={selectSolutionLabel} relationship="label">
            <SplitButton
              menuButton={{ ...triggerProps, "aria-label": openTableSourceOptionsLabel }}
              primaryActionButton={{
                onClick: () => setIsSolutionSelOpen(true),
                "aria-label": selectSolutionLabel,
              }}
            >
              Select a Solution
            </SplitButton>
          </Tooltip>
        )}
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          <MenuItem onClick={getAllTableMeta}>All Tables</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  const exportMenu = (
    <Menu positioning="below-end">
      <MenuTrigger disableButtonEnhancement>
        {(triggerProps: MenuButtonProps) => (
          <Tooltip content={openExportDialogLabel} relationship="label">
            <SplitButton
              menuButton={{ ...triggerProps, "aria-label": openExportOptionsLabel }}
              primaryActionButton={{
                onClick: () => setIsExportPopoverOpen(true),
                "aria-label": openExportDialogLabel,
              }}
            >
              Export All
            </SplitButton>
          </Tooltip>
        )}
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          <MenuItem onClick={exportTablesClick}>Table List only</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  return (
    <div>
      <TableColumnDrawer
        open={isTableColumnEditOpen}
        onOpenChange={setIsTableColumnEditOpen}
        tableMetadata={vm.tableMetadata}
        selectedTableCols={selectedTableCols}
        onSelectedTableColsChange={setSelectedTableCols}
        onApply={saveTableColumnSelection}
        onSetDefault={saveDefaultTableColumnSelection}
      />
      <SolutionSelectorDrawer
        open={isSolutionSelOpen}
        onOpenChange={setIsSolutionSelOpen}
        managed={managed}
        onManagedChange={setManaged}
        solutionQuery={solutionQuery}
        onSolutionQueryChange={setSolutionQuery}
        selectedSolutionIds={selectedSolutionIds}
        onSelectedSolutionIdsChange={setSelectedSolutionIds}
        solutions={vm.solutions}
        onSelect={saveSolutionSelection}
      />
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
                {vm.tableMetadata.length > 0 && (
                  <Tooltip content="Search Tables by Display Name or Logical Name" relationship="label">
                    <SearchBox
                      size="small"
                      placeholder="Search Tables"
                      aria-label="Search Display & Logical Name"
                      onChange={tableSearch}
                      style={{ margin: "2px" }}
                    />
                  </Tooltip>
                )}
                {vm.selectedSolution && (
                  <Label size="small" style={{ padding: "2px 2px" }}>
                    Solution: {vm.selectedSolution?.solutionName}{" "}
                  </Label>
                )}
                <div style={{ display: "inline-block", padding: "0 2px" }}>{allTablesMenu}</div>
                <Tooltip content={chooseVisibleColumnsLabel} relationship="label">
                  <span>
                    <Button
                      aria-label={chooseVisibleColumnsLabel}
                      icon={<ColumnEditRegular />}
                      onClick={editColumnsClick}
                      disabled={vm.tableMetadata.length === 0}
                    />
                  </span>
                </Tooltip>
                {exportMenu}
              </div>
            )}
          </div>
        </TabList>
        <div>
          {loadingMeta ? (
            <Spinner style={{ height: "300px" }} size="extra-large" label="Loading Metadata..." />
          ) : !vm.tableMetadata || vm.tableMetadata.length === 0 ? (
            <div style={{ textAlign: "center" }}>Select a Solution or All Tables to load metadata.</div>
          ) : (
            <>
              {selectedTab === "tables" && tableGrid}
              {tableDetails}
            </>
          )}
        </div>
        <div>
          {isExportPopoverOpen && (
            <ExportPopover
              connection={primaryConnection}
              dvSvc={dvService}
              vm={vm}
              isExportOpen={isExportPopoverOpen}
              setIsExportOpen={setIsExportPopoverOpen}
              onLog={onLog}
            />
          )}
        </div>
      </div>
    </div>
  );
});
