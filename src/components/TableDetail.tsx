import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import {
  Button,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderTitle,
  InputOnChangeData,
  List,
  ListItem,
  OverlayDrawer,
  SearchBox,
  SearchBoxChangeEvent,
  SelectionItemId,
  SelectTabData,
  SelectTabEvent,
  Tab,
  TabList,
  TabValue,
} from "@fluentui/react-components";
import { ColumnEditRegular, Dismiss24Regular } from "@fluentui/react-icons";
import { TableColumns } from "./TableColumns";
import { TableMeta } from "../model/tableMeta";

interface TableDetailProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  table: string;
  selectedTable: string;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  showNotification: (title: string, message: string, type: "info" | "success" | "warning" | "error") => void;
}

export const TableDetails = observer((props: TableDetailProps): React.JSX.Element => {
  const { connection, dvService, onLog, viewModel, table, selectedTable, isLoading, showNotification } = props;
  const [selectedValue, setSelectedValue] = React.useState<TabValue>("details");
  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedValue(data.value);
  };
  const [isColumnEditOpen, setIsColumnEditOpen] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<SelectionItemId[]>(viewModel.columnAttributes);
  const [selTable] = React.useState<TableMeta>(viewModel.tableMetadata.filter((t) => t.tableName === table)[0]);

  const [columnQuery, setColumnQuery] = React.useState<string>("");

  const debounce = <T extends (searchQuery: string) => unknown>(func: T, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (searchQuery: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(searchQuery), delay);
    };
  };
  const searchColumns = async (_searchQuery: string) => {
    setColumnQuery(_searchQuery);
    selTable.searchQuery = _searchQuery;
  };
  const debouncedSearch = React.useCallback(debounce(searchColumns, 300), []);

  function columnSearch(_e: SearchBoxChangeEvent, data: InputOnChangeData): void {
    //setTableQuery(data.value ?? "");
    console.log("Table search input: ", columnQuery);
    debouncedSearch(data.value ?? "");
  }

  function items() {
    if (selTable.columns.length === 0) {
      return [];
    }
    return selTable.columns[0].attributes
      .filter(
        (attr) =>
          attr.attributeName != "AttributeType" &&
          attr.attributeName != "DisplayName" &&
          attr.attributeName != "LogicalName"
      )
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
  const Details = React.memo(() => (
    <div role="tabpanel" aria-labelledby={`${table}-details`}>
      <table>
        <thead>
          <th>Origin</th>
          <th>Gate</th>
          <th>ETA</th>
        </thead>
        <tbody>
          <tr>
            <td>DEN</td>
            <td>C3</td>
            <td>12:40 PM</td>
          </tr>
          <tr>
            <td>SMF</td>
            <td>D1</td>
            <td>1:18 PM</td>
          </tr>
          <tr>
            <td>SFO</td>
            <td>E18</td>
            <td>1:42 PM</td>
          </tr>
        </tbody>
      </table>
    </div>
  ));

  function editColumnsClick(): void {
    setIsColumnEditOpen(true);
  }

  function saveTableColumnSelection(): void {
    setIsColumnEditOpen(false);

    viewModel.columnAttributes = selectedItems.map((id) => id.toString());
  }

  const columnDrawer = (
    <OverlayDrawer position="end" open={isColumnEditOpen} onOpenChange={(_, { open }) => setIsColumnEditOpen(open)}>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setIsColumnEditOpen(false)}
            />
          }
        ></DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <List
          selectionMode="multiselect"
          selectedItems={selectedItems}
          onSelectionChange={(_, data) => setSelectedItems(data.selectedItems)}
          aria-label="List of attributes to display for columns"
        >
          {items()}
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
    <>
      {columnDrawer}
      {selectedTable === table && (
        <div>
          <TabList selectedValue={selectedValue} onTabSelect={onTabSelect} size="small">
            <Tab id="details" value="details">
              Details
            </Tab>
            <Tab id="columns" value="columns">
              Columns
            </Tab>
            <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
              {selectedValue === "columns" && (
                <div style={{ marginLeft: "auto", padding: "10px 10px" }}>
                  {selTable.columns.length > 0 && (
                    <SearchBox
                      size="small"
                      placeholder="Search Columns"
                      aria-label="Search Display, Logical & Type"
                      onChange={columnSearch}
                    />
                  )}
                  <Button icon={<ColumnEditRegular />} onClick={editColumnsClick} />
                </div>
              )}
            </div>
          </TabList>
          <div>
            {selectedValue === "details" && <Details />}
            {selectedValue === "columns" && (
              <TableColumns
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                viewModel={viewModel}
                table={table}
                onLog={onLog}
                showNotification={showNotification}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
});
