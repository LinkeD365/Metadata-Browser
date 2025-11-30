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
  List,
  ListItem,
  OverlayDrawer,
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
  const [selectedItems, setSelectedItems] = React.useState<SelectionItemId[]>(viewModel.fieldColummns);
  const [selTable] = React.useState<TableMeta>(viewModel.tableMetadata.filter((t) => t.tableName === table)[0]);
  function items() {
    if (selTable.fields.length === 0) {
      return [];
    }
    return selTable.fields[0].attributes.map((field) => (
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
    // runInAction(() => {
    //   viewModel.fieldColummns.push("CanBeSecuredForRead");
    // });
  }

  function saveTableColumnSelection(): void {
    setIsColumnEditOpen(false);

    viewModel.fieldColummns = selectedItems.map((id) => id.toString());
  }

  return (
    <>
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
            aria-label="People example"
          >
            {items()}
          </List>
        </DrawerBody>

        <DrawerFooter>
          <Button appearance="primary" onClick={saveTableColumnSelection}>
            Save
          </Button>
        </DrawerFooter>
      </OverlayDrawer>
      {selectedTable === table && (
        <div>
          <TabList selectedValue={selectedValue} onTabSelect={onTabSelect} size="small">
            <Tab id="details" value="details">
              Details
            </Tab>
            <Tab id="columns" value="columns">
              Columns
            </Tab>
            <div style={{ display: "flex", width: "100%" }}>
              {selectedItems.length}
              {selectedValue === "columns" && (
                <div style={{ marginLeft: "auto", padding: "0 10px" }}>
                  <Button icon={<ColumnEditRegular />} onClick={editColumnsClick}>
                    Edit Columns
                  </Button>
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
