import React from "react";
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
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { TableMeta } from "../model/tableMeta";

interface TableColumnDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableMetadata: TableMeta[];
  selectedTableCols: SelectionItemId[];
  onSelectedTableColsChange: (items: SelectionItemId[]) => void;
  onApply: () => void;
  onSetDefault: () => void;
}

export function TableColumnDrawer(props: TableColumnDrawerProps): React.JSX.Element {
  const { open, onOpenChange, tableMetadata, selectedTableCols, onSelectedTableColsChange, onApply, onSetDefault } =
    props;

  const tableAttributeList = React.useMemo(() => {
    if (!tableMetadata || tableMetadata.length === 0 || tableMetadata[0].attributes.length === 0) {
      return [];
    }

    return tableMetadata[0].attributes
      .filter((attr) => attr.attributeName !== "DisplayName" && attr.attributeName !== "LogicalName")
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
  }, [tableMetadata]);

  return (
    <OverlayDrawer position="end" open={open} onOpenChange={(_, { open: isOpen }) => onOpenChange(isOpen)}>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => onOpenChange(false)}
            />
          }
        >
          Select Columns
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <List
          selectionMode="multiselect"
          selectedItems={selectedTableCols}
          onSelectionChange={(_, data) => onSelectedTableColsChange(data.selectedItems)}
          aria-label="List of attributes to display for columns"
        >
          {tableAttributeList}
        </List>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", width: "100%" }}>
        <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={onApply}>
          Apply
        </Button>
        <Button onClick={onSetDefault}>Set Default</Button>
      </DrawerFooter>
    </OverlayDrawer>
  );
}
