import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
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
  TableColumnDefinition,
  TabList,
  TabValue,
  tokens,
} from "@fluentui/react-components";
import { ArrowExportUpRegular, ColumnEditRegular, Dismiss24Regular } from "@fluentui/react-icons";
import { TableColumns } from "./TableColumns";
import { Attribute, TableMeta } from "../model/tableMeta";
import JSONPretty from "react-json-pretty";
import { Keys } from "./Keys";
import { Relationships } from "./Relationships";

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
  const [searchAttr, setSearchAttr] = React.useState<string>("");

  const debounce = <T extends (searchQuery: string) => unknown>(func: T, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (searchQuery: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(searchQuery), delay);
    };
  };
  const searchColumns = async (_searchQuery: string) => {
    selTable.columnSearch = _searchQuery;
  };
  const debouncedSearchCols = React.useCallback(debounce(searchColumns, 300), []);

  function columnSearch(_e: SearchBoxChangeEvent, data: InputOnChangeData): void {
    //console.log("Table search input: ", columnQuery);
    debouncedSearchCols(data.value ?? "");
  }

  const searchAttributes = async (_searchQuery: string) => {
    setSearchAttr(_searchQuery);
  };
  const debouncedSearchAttr = React.useCallback(debounce(searchAttributes, 300), []);
  function attributeSearch(_e: SearchBoxChangeEvent, data: InputOnChangeData): void {
    debouncedSearchAttr(data.value ?? "");
  }

  function columnAttributes() {
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

  const filteredAttributes: Attribute[] = React.useMemo(() => {
    if (!selTable || searchAttr.trim() === "") {
      return selTable.attributes;
    }
    return selTable.attributes.filter((attr) => attr.attributeName.toLowerCase().includes(searchAttr.toLowerCase()));
  }, [selTable, searchAttr]);

  const attributes: TableColumnDefinition<Attribute>[] = [
    createTableColumn<Attribute>({
      columnId: "name",
      compare: (a, b) => {
        return a.attributeName.localeCompare(b.attributeName);
      },
      renderHeaderCell: () => {
        return "Attribute Name";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.attributeName}</div>;
      },
    }),
    createTableColumn<Attribute>({
      columnId: "value",
      compare: (a, b) => {
        return a.attributeValue.localeCompare(b.attributeValue);
      },
      renderHeaderCell: () => {
        return "Value";
      },
      renderCell: (item) => {
        return (
          <JSONPretty
            style={{ fontSize: "1em", fontFamily: "arial" }}
            id="json-pretty"
            mainStyle={`font-size: 0.9em; font-family: ${tokens.fontFamilyBase}`}
            errorStyle={`font-size: 0.9em; font-family: ${tokens.fontFamilyBase}`}
            data={item.attributeValue}
          ></JSONPretty>
        );
        try {
          return <div>test{JSON.stringify(JSON.parse(item.attributeValue))}</div>;
        } catch {
          // if (JSON.parse(item.attributeValue)) return <div>{JSON.stringify(item.attributeValue)}</div>;
          // else
          return <div style={{ verticalAlign: "top" }}>{item.attributeValue}</div>;
        }
      },
    }),
  ];

  const Details = React.memo(() => (
    <div role="tabpanel" aria-labelledby={`${table}-details`}>
      <DataGrid columns={attributes} items={filteredAttributes} sortable>
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
        <DataGridBody<Attribute>>
          {({ item, rowId }) => (
            <DataGridRow<Attribute> key={rowId}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  ));

  function editColumnsClick(): void {
    setIsColumnEditOpen(true);
  }

  function saveTableColumnSelection(): void {
    setIsColumnEditOpen(false);

    viewModel.columnAttributes = selectedItems.map((id) => id.toString());
  }

  function exportTableDetailClick(): void {
    const title = ["Table: ", selTable.displayName, selTable.tableName];
    const headers = ["Attribute Name", "Value"];
    const rows = selTable.attributes.map((attr) => [attr.attributeName, attr.attributeValue]);
    const csvString = [title, headers, ...rows].map((row) => row.join(",")).join("\n");
    console.log("Attributes CSV Data:\n", csvString);
    window.toolboxAPI.utils.saveFile(`${selTable.displayName}_metadata.csv`, csvString);
  }

  function exportColumnsClick(): void {
    const title = ["Table: ", selTable.displayName, selTable.tableName];
    const headers = ["Column Name", "Logical Name", "Type", ...viewModel.columnAttributes];

    const data = selTable.columns.filter((t) =>
      selTable.selectedColumns ? selTable.selectedColumns.has(t.columnName) : false
    );
    const rows = data.map((col) => [
      col.displayName,
      col.columnName,
      col.dataType,
      ...viewModel.columnAttributes.map((attrName) => {
        const attr = col.attributes.find((a) => a.attributeName === attrName);
        return attr ? attr.attributeValue : "";
      }),
    ]);
    const csvString = [title, headers, ...rows].map((row) => row.join(",")).join("\n");
    console.log("Attributes CSV Data:\n", csvString);
    window.toolboxAPI.utils.saveFile(`${selTable.displayName}_columns_metadata.csv`, csvString);
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
          {columnAttributes()}
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
            <Tab id="keys" value="keys">
              Keys
            </Tab>
            <Tab id="oneToMany" value="oneToMany">
              One To Many
            </Tab>
            <Tab id="manyToOne" value="manyToOne">
              Many To One
            </Tab>

            <Tab id="manyToMany" value="manyToMany">
              Many To Many
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
                      style={{ marginRight: "10px" }}
                    />
                  )}
                  <Button icon={<ColumnEditRegular />} onClick={editColumnsClick} />
                  <Button
                    icon={<ArrowExportUpRegular />}
                    onClick={exportColumnsClick}
                    disabled={selTable.selectedColumns.size === 0}
                  />
                </div>
              )}

              {selectedValue === "details" && (
                <div style={{ marginLeft: "auto", padding: "10px 10px" }}>
                  <SearchBox
                    size="small"
                    placeholder="Search Attributes"
                    aria-label="Search Display, Logical & Type"
                    onChange={attributeSearch}
                    style={{ marginRight: "10px" }}
                  />
                  <Button icon={<ArrowExportUpRegular />} onClick={exportTableDetailClick} />
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
            {selectedValue === "keys" && (
              <Keys
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                onLog={onLog}
                showNotification={showNotification}
              />
            )}
            {selectedValue === "oneToMany" && (
              <Relationships
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                onLog={onLog}
                showNotification={showNotification}
                type="OneToManyRelationship"
              />
            )}
            {selectedValue === "manyToOne" && (
              <Relationships
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                onLog={onLog}
                showNotification={showNotification}
                type="ManyToOneRelationship"
              />
            )}
            {selectedValue === "manyToMany" && (
              <Relationships
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                onLog={onLog}
                showNotification={showNotification}
                type="ManyToManyRelationship"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
});
