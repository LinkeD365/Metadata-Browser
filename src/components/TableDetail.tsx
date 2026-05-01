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
  tokens,
  Body1,
  Field,
  Input,
} from "@fluentui/react-components";
import {
  Add12Filled,
  ArrowExportUpRegular,
  ColumnEditRegular,
  Dismiss24Regular,
  Save24Regular,
} from "@fluentui/react-icons";
import { TableColumns } from "./TableColumns";
import { Attribute, RelationshipAttribute, TableMeta } from "../model/tableMeta";
import JSONPretty from "react-json-pretty";
import { Keys } from "./Keys";
import { Relationships } from "./Relationships";
import { Privileges } from "./Privileges";
import { Solutions } from "./Solutions";
import { Views } from "./Views";
import { BusinessProcessFlows } from "./BusinessProcessFlows";
import { BusinessRules } from "./BusinessRules";
import { ColDef } from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { agGridTheme } from "../config/agGridConfig";

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
    selTable.selectedRelationships = new Set<string>();
    selTable.relationshipSearch = "";
  };
  const [isColumnEditOpen, setIsColumnEditOpen] = React.useState(false);
  const [customColName, setCustomColName] = React.useState("");
  const [isRelationshipsColumnsOpen, setIsRelationshipsColumnsOpen] = React.useState(false);
  const [isViewColumnsOpen, setIsViewColumnsOpen] = React.useState(false);
  const [isBusinessProcessFlowColumnsOpen, setIsBusinessProcessFlowColumnsOpen] = React.useState(false);
  const [isBusinessRuleColumnsOpen, setIsBusinessRuleColumnsOpen] = React.useState(false);
  const [selectedColumnAttributes, setSelectedColumnAttributes] = React.useState<SelectionItemId[]>(
    viewModel.columnAttributes.map((attr) => attr.name as SelectionItemId),
  );
  const [selectedRelationshipAttributes, setSelectedRelationshipAttributes] = React.useState<SelectionItemId[]>([]);
  const [selectedViewAttributes, setSelectedViewAttributes] = React.useState<SelectionItemId[]>([]);
  const [selectedBusinessProcessFlowAttributes, setSelectedBusinessProcessFlowAttributes] = React.useState<
    SelectionItemId[]
  >([]);
  const [selectedBusinessRuleAttributes, setSelectedBusinessRuleAttributes] = React.useState<SelectionItemId[]>([]);

  React.useEffect(() => {
    if (!isRelationshipsColumnsOpen) return;
    const attrs = Array.isArray(viewModel.relationshipAttributes)
      ? viewModel.relationshipAttributes
          .filter((r) => r.type === selectedValue)
          .map((r) => r.attributeName as SelectionItemId)
      : [];
    setSelectedRelationshipAttributes(attrs);
  }, [isRelationshipsColumnsOpen, selectedValue, viewModel.relationshipAttributes]);

  React.useEffect(() => {
    if (!isViewColumnsOpen) return;
    setSelectedViewAttributes(viewModel.viewAttributes.map((a) => a as SelectionItemId));
  }, [isViewColumnsOpen, viewModel.viewAttributes]);

  React.useEffect(() => {
    if (!isBusinessProcessFlowColumnsOpen) return;
    setSelectedBusinessProcessFlowAttributes(viewModel.businessProcessFlowAttributes.map((a) => a as SelectionItemId));
  }, [isBusinessProcessFlowColumnsOpen, viewModel.businessProcessFlowAttributes]);

  React.useEffect(() => {
    if (!isBusinessRuleColumnsOpen) return;
    setSelectedBusinessRuleAttributes(viewModel.businessRuleAttributes.map((a) => a as SelectionItemId));
  }, [isBusinessRuleColumnsOpen, viewModel.businessRuleAttributes]);
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
  const searchRelationships = async (_searchQuery: string) => {
    selTable.relationshipSearch = _searchQuery;
  };
  const debouncedSearchRels = React.useCallback(debounce(searchRelationships, 300), []);
  const searchViews = async (_searchQuery: string) => {
    selTable.viewSearch = _searchQuery;
  };
  const debouncedSearchViews = React.useCallback(debounce(searchViews, 300), []);
  const searchBusinessProcessFlows = async (_searchQuery: string) => {
    selTable.businessProcessFlowSearch = _searchQuery;
  };
  const debouncedSearchBusinessProcessFlows = React.useCallback(debounce(searchBusinessProcessFlows, 300), []);
  const searchBusinessRules = async (_searchQuery: string) => {
    selTable.businessRuleSearch = _searchQuery;
  };
  const debouncedSearchBusinessRules = React.useCallback(debounce(searchBusinessRules, 300), []);

  function columnSearch(_e: SearchBoxChangeEvent, data: InputOnChangeData): void {
    //console.log("Table search input: ", columnQuery);
    debouncedSearchCols(data.value ?? "");
  }

  function relationshipSearch(_e: SearchBoxChangeEvent, data: InputOnChangeData): void {
    //console.log("Table search input: ", columnQuery);
    debouncedSearchRels(data.value ?? "");
  }

  function viewsSearch(_e: SearchBoxChangeEvent, data: InputOnChangeData): void {
    debouncedSearchViews(data.value ?? "");
  }

  function businessProcessFlowsSearch(_e: SearchBoxChangeEvent, data: InputOnChangeData): void {
    debouncedSearchBusinessProcessFlows(data.value ?? "");
  }

  function businessRulesSearch(_e: SearchBoxChangeEvent, data: InputOnChangeData): void {
    debouncedSearchBusinessRules(data.value ?? "");
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
          attr.attributeName != "LogicalName",
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

  function customColAttrs() {
    if (viewModel.columnAttributes.filter((attr) => attr.custom).length === 0) {
      return [];
    }
    return viewModel.columnAttributes
      .filter((attr) => attr.custom)
      .map((attr) => (
        <ListItem key={attr.name} value={attr.name} aria-label={attr.name}>
          {attr.name}{" "}
          <Button
            appearance="subtle"
            icon={<Dismiss24Regular />}
            onClick={() => {
              viewModel.columnAttributes = viewModel.columnAttributes.filter((a) => a.name !== attr.name || !a.custom);
            }}
          />
        </ListItem>
      ));
  }

  function relationshipAttributes() {
    if (
      selTable.relationships.length === 0 ||
      selTable.relationships.filter((r) => r.type === selectedValue).length === 0
    ) {
      return [];
    }
    return selTable.relationships
      .filter((r) => r.type === selectedValue)[0]
      .attributes.filter((attr) => attr.attributeName != "SchemaName" && attr.attributeName != "RelationshipType")
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

  function viewAttributes() {
    if (!selTable.views || selTable.views.length === 0 || selTable.views[0].attributes.length === 0) {
      return [];
    }

    return selTable.views[0].attributes
      .filter((attr) => attr.attributeName !== "name" && attr.attributeName !== "returnedtypecode")
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

  function businessProcessFlowAttributes() {
    if (
      !selTable.businessProcessFlows ||
      selTable.businessProcessFlows.length === 0 ||
      selTable.businessProcessFlows[0].attributes.length === 0
    ) {
      return [];
    }

    return selTable.businessProcessFlows[0].attributes
      .filter((attr) => attr.attributeName !== "name")
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

  function businessRuleAttributes() {
    if (
      !selTable.businessRules ||
      selTable.businessRules.length === 0 ||
      selTable.businessRules[0].attributes.length === 0
    ) {
      return [];
    }

    return selTable.businessRules[0].attributes
      .filter((attr) => attr.attributeName !== "name")
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
  const colDefs = React.useMemo<ColDef<Attribute>[]>(
    () => [
      { headerName: "Attribute Name", field: "attributeName", sort: "asc" },
      {
        headerName: "Value",
        field: "attributeValue",
        cellRenderer: (params: CustomCellRendererProps<Attribute>) => {
          return (
            <JSONPretty
              style={{ fontSize: "1em", fontFamily: "arial" }}
              id="json-pretty"
              mainStyle={`font-size: 0.9em; font-family: ${tokens.fontFamilyBase}`}
              errorStyle={`font-size: 0.9em; font-family: ${tokens.fontFamilyBase}`}
              data={params?.data?.attributeValue}
            ></JSONPretty>
          );
        },
      },
    ],
    [tokens.fontFamilyBase],
  );

  const tableDetails = (
    <div style={{ width: "98vw", height: "85vh", alignSelf: "center" }}>
      <AgGridReact<Attribute>
        theme={agGridTheme}
        rowData={filteredAttributes}
        columnDefs={colDefs}
        defaultColDef={defaultColDefs}
        domLayout="normal"
        getRowId={(params) => params.data?.attributeName ?? ""}
        enableCellTextSelection={true}
      />
    </div>
  );

  function editColumnsClick(): void {
    setIsColumnEditOpen(true);
  }

  function editRelationshipColumnsClick(): void {
    setIsRelationshipsColumnsOpen(true);
  }

  function editViewColumnsClick(): void {
    setIsViewColumnsOpen(true);
  }

  function editBusinessProcessFlowColumnsClick(): void {
    setIsBusinessProcessFlowColumnsOpen(true);
  }

  function editBusinessRuleColumnsClick(): void {
    setIsBusinessRuleColumnsOpen(true);
  }

  function saveColumnAttributes(): void {
    const customCols = JSON.stringify(viewModel.columnAttributes.filter((attr) => attr.custom));
    console.log("Custom Columns to retain: ", customCols);
    viewModel.columnAttributes = selectedColumnAttributes
      .map((id) => ({ name: id.toString(), custom: false }))
      .concat(JSON.parse(customCols));
    setIsColumnEditOpen(false);
  }

  async function saveColumnAttributesDefaults(): Promise<void> {
    saveColumnAttributes();
    try {
      await window.toolboxAPI.settings.set("defaultColumnAttributes", JSON.stringify(viewModel.columnAttributes));
      window.toolboxAPI.utils.showNotification({
        title: "Default Saved",
        body: "Default column attributes have been saved.",
        type: "success",
      });
    } catch (error) {
      window.toolboxAPI.utils.showNotification({
        title: "Save Failed",
        body: "Failed to save default column attributes.",
        type: "error",
      });
    }
  }

  function saveRelationshipAttrSelection(): void {
    viewModel.relationshipAttributes = (viewModel.relationshipAttributes || [])
      .filter((r) => !(r.type && r.type == (selectedValue as string)))
      .concat(
        selectedRelationshipAttributes.map((id) => {
          const relAttr = new RelationshipAttribute();
          relAttr.attributeName = id.toString();
          relAttr.type = selectedValue as string;
          return relAttr;
        }),
      );

    setIsRelationshipsColumnsOpen(false);
  }

  async function saveRelationshipAttributesDefaults(): Promise<void> {
    saveRelationshipAttrSelection();
    try {
      await window.toolboxAPI.settings.set(
        "defaultRelationshipAttributes" + selectedValue,
        JSON.stringify(viewModel.relationshipAttributes.filter((r) => r.type && r.type == (selectedValue as string))),
      );
      window.toolboxAPI.utils.showNotification({
        title: "Default Saved",
        body: `Default ${selectedValue} attributes have been saved.`,
        type: "success",
      });
    } catch (error) {
      window.toolboxAPI.utils.showNotification({
        title: "Save Failed",
        body: `Failed to save default ${selectedValue} attributes. error: ${error}`,
        type: "error",
      });
    }
  }

  function saveViewAttrSelection(): void {
    viewModel.viewAttributes = selectedViewAttributes.map((id) => id.toString());
    setIsViewColumnsOpen(false);
  }

  async function saveViewAttributesDefaults(): Promise<void> {
    saveViewAttrSelection();
    try {
      await window.toolboxAPI.settings.set("defaultViewAttributes", JSON.stringify(viewModel.viewAttributes));
      window.toolboxAPI.utils.showNotification({
        title: "Default Saved",
        body: "Default view attributes have been saved.",
        type: "success",
      });
    } catch (error) {
      window.toolboxAPI.utils.showNotification({
        title: "Save Failed",
        body: `Failed to save default view attributes. error: ${error}`,
        type: "error",
      });
    }
  }

  function saveBusinessProcessFlowAttrSelection(): void {
    viewModel.businessProcessFlowAttributes = selectedBusinessProcessFlowAttributes.map((id) => id.toString());
    setIsBusinessProcessFlowColumnsOpen(false);
  }

  async function saveBusinessProcessFlowAttributesDefaults(): Promise<void> {
    saveBusinessProcessFlowAttrSelection();
    try {
      await window.toolboxAPI.settings.set(
        "defaultBusinessProcessFlowAttributes",
        JSON.stringify(viewModel.businessProcessFlowAttributes),
      );
      window.toolboxAPI.utils.showNotification({
        title: "Default Saved",
        body: "Default business process flow attributes have been saved.",
        type: "success",
      });
    } catch (error) {
      window.toolboxAPI.utils.showNotification({
        title: "Save Failed",
        body: `Failed to save default business process flow attributes. error: ${error}`,
        type: "error",
      });
    }
  }

  function saveBusinessRuleAttrSelection(): void {
    viewModel.businessRuleAttributes = selectedBusinessRuleAttributes.map((id) => id.toString());
    setIsBusinessRuleColumnsOpen(false);
  }

  async function saveBusinessRuleAttributesDefaults(): Promise<void> {
    saveBusinessRuleAttrSelection();
    try {
      await window.toolboxAPI.settings.set(
        "defaultBusinessRuleAttributes",
        JSON.stringify(viewModel.businessRuleAttributes),
      );
      window.toolboxAPI.utils.showNotification({
        title: "Default Saved",
        body: "Default business rule attributes have been saved.",
        type: "success",
      });
    } catch (error) {
      window.toolboxAPI.utils.showNotification({
        title: "Save Failed",
        body: `Failed to save default business rule attributes. error: ${error}`,
        type: "error",
      });
    }
  }

  function setCustomColumn(): void {
    if (customColName.trim() === "") {
      return;
    }
    viewModel.columnAttributes.push({ name: customColName.trim(), custom: true });
    setCustomColName("");
  }
  function exportTableDetailClick(): void {
    const title = ["Table: ", selTable.displayName, selTable.tableName];
    const headers = ["Attribute Name", "Value"];
    const rows = selTable.attributes.map((attr) => [attr.attributeName, attr.attributeValue]);
    const csvString = [title, headers, ...rows].map((row) => row.join(",")).join("\n");
    console.log("Attributes CSV Data:\n", csvString);
    window.toolboxAPI.fileSystem.saveFile(`${selTable.displayName}_metadata.csv`, csvString);
  }

  function exportColumnsClick(): void {
    const title = ["Table: ", selTable.displayName, selTable.tableName];
    const headers = ["Column Name", "Logical Name", "Type", ...viewModel.columnAttributes];

    const data = selTable.columns.filter((t) =>
      selTable.selectedColumns ? selTable.selectedColumns.has(t.columnName) : false,
    );
    const rows = data.map((col) => [
      col.displayName,
      col.columnName,
      col.dataType,
      ...viewModel.columnAttributes.map((colDef) => {
        const attr = col.attributes.find((a) => a.attributeName === colDef.name);
        return attr ? attr.attributeValue : "";
      }),
    ]);
    const csvString = [title, headers, ...rows].map((row) => row.join(",")).join("\n");
    console.log("Attributes CSV Data:\n", csvString);
    window.toolboxAPI.fileSystem.saveFile(`${selTable.displayName}_columns_metadata.csv`, csvString);
  }
  function exportSolutionsClick(): void {
    const title = ["Table:", selTable.displayName, selTable.tableName];
    const headers = ["Solution Name", "Unique Name", "Version", "Is Managed", "Description", "Root Component Behavior"];
    const data = selTable.solutions.map((solution) => [
      solution.solutionName,
      solution.uniqueName,
      solution.version,
      solution.isManaged ? "Yes" : "No",
      solution.description,
      solution.subcomponents ? "Yes" : "No",
    ]);
    const rows = data;
    const csvString = [title, headers, ...rows].map((row) => row.join(",")).join("\n");
    console.log("Solutions CSV Data:\n", csvString);
    window.toolboxAPI.fileSystem.saveFile(`${selTable.displayName}_solutions_metadata.csv`, csvString);
  }

  function exportPrivilegesClick(): void {
    const title = ["Table: ", selTable.displayName, selTable.tableName];
    const headers = ["Privilege Name", ...(selTable.privileges[0]?.attributes.map((attr) => attr.attributeName) || [])];
    const data = selTable.privileges;
    const rows = data.map((priv) => [priv.privilegeName, ...priv.attributes.map((attr) => attr.attributeValue)]);
    const csvString = [title, headers, ...rows].map((row) => row.join(",")).join("\n");
    console.log("Privileges CSV Data:\n", csvString);
    window.toolboxAPI.fileSystem.saveFile(`${selTable.displayName}_privileges_metadata.csv`, csvString);
  }

  function exportRelationshipClick(): void {
    const title = ["Table: ", selTable.displayName, selTable.tableName, "Relationship Types: ", selectedValue];
    const headers = [
      "Relationship Name",
      "Type",
      ...viewModel.relationshipAttributes
        .filter((attr) => attr.type === selectedValue)
        .map((attr) => attr.attributeName),
    ];
    const data = selTable.relationships.filter((t) =>
      selTable.selectedRelationships ? selTable.selectedRelationships.has(t.relationshipName) : false,
    );
    const rows = data.map((rel) => [
      rel.relationshipName,
      rel.type,
      ...viewModel.relationshipAttributes
        .filter((attr) => attr.type === selectedValue)
        .map((attrName) => {
          const attr = rel.attributes.find((a) => a.attributeName === attrName.attributeName);
          return attr ? attr.attributeValue : "";
        }),
    ]);
    const csvString = [title, headers, ...rows].map((row) => row.join(",")).join("\n");
    console.log("Relationships CSV Data:\n", csvString);
    window.toolboxAPI.fileSystem.saveFile(`${selTable.displayName}_${selectedValue}_metadata.csv`, csvString);
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
        >
          Select attributes to display
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <List
          style={{ maxHeight: "200px", overflow: "auto" }}
          selectionMode="multiselect"
          selectedItems={selectedColumnAttributes}
          onSelectionChange={(_, data) => setSelectedColumnAttributes(data.selectedItems)}
          aria-label="List of attributes to display for columns"
        >
          {columnAttributes()}
        </List>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ minHeight: "150px", width: "100%" }}>
          <Field label="Add Custom Attribute">
            <Input
              value={customColName}
              onChange={(e) => setCustomColName(e.target.value)}
              contentAfter={<Button appearance="subtle" icon={<Add12Filled />} onClick={setCustomColumn} />}
            ></Input>
          </Field>
          <List>{customColAttrs()}</List>
        </div>

        <div style={{ display: "flex", width: "100%", marginTop: "10px" }}>
          <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={saveColumnAttributes}>
            Apply
          </Button>
          <Button onClick={saveColumnAttributesDefaults} icon={<Save24Regular />} appearance="subtle">
            Save Defaults
          </Button>
        </div>
      </DrawerFooter>
    </OverlayDrawer>
  );

  const relationshipDrawer = (
    <OverlayDrawer
      position="end"
      open={isRelationshipsColumnsOpen}
      onOpenChange={(_, { open }) => setIsRelationshipsColumnsOpen(open)}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setIsRelationshipsColumnsOpen(false)}
            />
          }
        >
          <Body1>{selectedValue} columns</Body1>
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <List
          selectionMode="multiselect"
          selectedItems={selectedRelationshipAttributes}
          onSelectionChange={(_, data) => setSelectedRelationshipAttributes(data.selectedItems)}
          aria-label="List of attributes to display for relationships"
        >
          {relationshipAttributes()}
        </List>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", width: "100%" }}>
        <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={saveRelationshipAttrSelection}>
          Save
        </Button>
        <Button onClick={saveRelationshipAttributesDefaults}>Set Default</Button>
      </DrawerFooter>
    </OverlayDrawer>
  );

  const viewDrawer = (
    <OverlayDrawer position="end" open={isViewColumnsOpen} onOpenChange={(_, { open }) => setIsViewColumnsOpen(open)}>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setIsViewColumnsOpen(false)}
            />
          }
        >
          <Body1>Views columns</Body1>
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <List
          selectionMode="multiselect"
          selectedItems={selectedViewAttributes}
          onSelectionChange={(_, data) => setSelectedViewAttributes(data.selectedItems)}
          aria-label="List of attributes to display for views"
        >
          {viewAttributes()}
        </List>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", width: "100%" }}>
        <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={saveViewAttrSelection}>
          Save
        </Button>
        <Button onClick={saveViewAttributesDefaults}>Set Default</Button>
      </DrawerFooter>
    </OverlayDrawer>
  );

  const businessProcessFlowDrawer = (
    <OverlayDrawer
      position="end"
      open={isBusinessProcessFlowColumnsOpen}
      onOpenChange={(_, { open }) => setIsBusinessProcessFlowColumnsOpen(open)}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setIsBusinessProcessFlowColumnsOpen(false)}
            />
          }
        >
          <Body1>Business Process Flows columns</Body1>
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <List
          selectionMode="multiselect"
          selectedItems={selectedBusinessProcessFlowAttributes}
          onSelectionChange={(_, data) => setSelectedBusinessProcessFlowAttributes(data.selectedItems)}
          aria-label="List of attributes to display for business process flows"
        >
          {businessProcessFlowAttributes()}
        </List>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", width: "100%" }}>
        <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={saveBusinessProcessFlowAttrSelection}>
          Save
        </Button>
        <Button onClick={saveBusinessProcessFlowAttributesDefaults}>Set Default</Button>
      </DrawerFooter>
    </OverlayDrawer>
  );

  const businessRuleDrawer = (
    <OverlayDrawer
      position="end"
      open={isBusinessRuleColumnsOpen}
      onOpenChange={(_, { open }) => setIsBusinessRuleColumnsOpen(open)}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setIsBusinessRuleColumnsOpen(false)}
            />
          }
        >
          <Body1>Business Rules columns</Body1>
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <List
          selectionMode="multiselect"
          selectedItems={selectedBusinessRuleAttributes}
          onSelectionChange={(_, data) => setSelectedBusinessRuleAttributes(data.selectedItems)}
          aria-label="List of attributes to display for business rules"
        >
          {businessRuleAttributes()}
        </List>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", width: "100%" }}>
        <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={saveBusinessRuleAttrSelection}>
          Save
        </Button>
        <Button onClick={saveBusinessRuleAttributesDefaults}>Set Default</Button>
      </DrawerFooter>
    </OverlayDrawer>
  );

  return (
    <>
      {columnDrawer}
      {relationshipDrawer}
      {viewDrawer}
      {businessProcessFlowDrawer}
      {businessRuleDrawer}
      {selectedTable === table && (
        <div style={{ position: "sticky", top: "40px", zIndex: 15 }}>
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
            <Tab id="OneToManyRelationship" value="OneToManyRelationship">
              One To Many
            </Tab>
            <Tab id="ManyToOneRelationship" value="ManyToOneRelationship">
              Many To One
            </Tab>
            <Tab id="ManyToManyRelationship" value="ManyToManyRelationship">
              Many To Many
            </Tab>
            <Tab id="Privileges" value="Privileges">
              Privileges
            </Tab>
            <Tab id="Solutions" value="Solutions">
              Solutions
            </Tab>
            <Tab id="Views" value="Views">
              Views
            </Tab>
            <Tab id="BusinessProcessFlows" value="BusinessProcessFlows">
              Business Process Flows
            </Tab>
            <Tab id="BusinessRules" value="BusinessRules">
              Business Rules
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
              {(selectedValue as string).includes("Relationship") && (
                <div style={{ marginLeft: "auto", padding: "10px 10px" }}>
                  {selTable.relationships.filter((rel) => rel.type === selectedValue).length > 0 && (
                    <SearchBox
                      size="small"
                      placeholder="Search Relationships"
                      aria-label="Search Name & Type"
                      onChange={relationshipSearch}
                      style={{ marginRight: "10px" }}
                    />
                  )}
                  <Button icon={<ColumnEditRegular />} onClick={editRelationshipColumnsClick} />
                  <Button
                    icon={<ArrowExportUpRegular />}
                    onClick={exportRelationshipClick}
                    disabled={selTable.selectedRelationships.size === 0}
                  />
                </div>
              )}
              {selectedValue === "Privileges" && (
                <div style={{ marginLeft: "auto", padding: "10px 10px" }}>
                  <Button
                    icon={<ArrowExportUpRegular />}
                    onClick={exportPrivilegesClick}
                    disabled={selTable.privileges.length === 0}
                  />
                </div>
              )}
              {selectedValue === "Solutions" && (
                <div style={{ marginLeft: "auto", padding: "10px 10px" }}>
                  <Button
                    icon={<ArrowExportUpRegular />}
                    onClick={exportSolutionsClick}
                    disabled={selTable.solutions.length === 0}
                  />
                </div>
              )}
              {selectedValue === "Views" && (
                <div style={{ marginLeft: "auto", padding: "10px 10px" }}>
                  {selTable.views.length > 0 && (
                    <SearchBox
                      size="small"
                      placeholder="Search Views"
                      aria-label="Search name and type"
                      onChange={viewsSearch}
                      style={{ marginRight: "10px" }}
                    />
                  )}
                  <Button icon={<ColumnEditRegular />} onClick={editViewColumnsClick} />
                </div>
              )}
              {selectedValue === "BusinessProcessFlows" && (
                <div style={{ marginLeft: "auto", padding: "10px 10px" }}>
                  {selTable.businessProcessFlows.length > 0 && (
                    <SearchBox
                      size="small"
                      placeholder="Search Business Process Flows"
                      aria-label="Search name and type"
                      onChange={businessProcessFlowsSearch}
                      style={{ marginRight: "10px" }}
                    />
                  )}
                  <Button icon={<ColumnEditRegular />} onClick={editBusinessProcessFlowColumnsClick} />
                </div>
              )}
              {selectedValue === "BusinessRules" && (
                <div style={{ marginLeft: "auto", padding: "10px 10px" }}>
                  {selTable.businessRules.length > 0 && (
                    <SearchBox
                      size="small"
                      placeholder="Search Business Rules"
                      aria-label="Search name and type"
                      onChange={businessRulesSearch}
                      style={{ marginRight: "10px" }}
                    />
                  )}
                  <Button icon={<ColumnEditRegular />} onClick={editBusinessRuleColumnsClick} />
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
          <div style={{ position: "sticky", top: "60px", zIndex: 10 }}>
            {selectedValue === "details" && tableDetails}
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
            {selectedValue === "OneToManyRelationship" && (
              <Relationships
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                onLog={onLog}
                showNotification={showNotification}
                type="OneToManyRelationship"
                viewModel={viewModel}
              />
            )}
            {selectedValue === "ManyToOneRelationship" && (
              <Relationships
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                onLog={onLog}
                showNotification={showNotification}
                type="ManyToOneRelationship"
                viewModel={viewModel}
              />
            )}
            {selectedValue === "ManyToManyRelationship" && (
              <Relationships
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                onLog={onLog}
                showNotification={showNotification}
                type="ManyToManyRelationship"
                viewModel={viewModel}
              />
            )}
            {selectedValue === "Privileges" && (
              <Privileges
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                onLog={onLog}
                showNotification={showNotification}
              />
            )}
            {selectedValue === "Solutions" && (
              <Solutions
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                onLog={onLog}
                showNotification={showNotification}
              />
            )}
            {selectedValue === "Views" && (
              <Views
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                viewAttributes={viewModel.viewAttributes}
                onLog={onLog}
                showNotification={showNotification}
              />
            )}
            {selectedValue === "BusinessProcessFlows" && (
              <BusinessProcessFlows
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                businessProcessFlowAttributes={viewModel.businessProcessFlowAttributes}
                onLog={onLog}
                showNotification={showNotification}
              />
            )}
            {selectedValue === "BusinessRules" && (
              <BusinessRules
                connection={connection}
                dvService={dvService}
                isLoading={isLoading}
                selectedTable={selTable}
                businessRuleAttributes={viewModel.businessRuleAttributes}
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
