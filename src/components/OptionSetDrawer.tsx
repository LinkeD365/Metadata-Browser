import React from "react";
import { observer } from "mobx-react";
import {
  Button, DrawerBody, DrawerFooter, DrawerHeader, DrawerHeaderTitle, List, ListItem, makeStyles, MessageBar,
  MessageBarBody, OverlayDrawer, SearchBox, Spinner, Text, tokens, Tooltip,
} from "@fluentui/react-components";
import { ColumnEditRegular, Dismiss24Regular, Save24Regular } from "@fluentui/react-icons";
import { AgGridReact } from "ag-grid-react";
import { NumberFilterModule, type ColDef } from "ag-grid-community";
import { agGridTheme } from "../config/agGridConfig";
import type { AdditionalOptionField, OptionDetails, OptionSetDrawerModel } from "../model/optionSet";

const useStyles = makeStyles({
  body: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  metadataRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: tokens.spacingHorizontalL },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: tokens.spacingHorizontalS },
  grid: { flexGrow: 1, minHeight: "250px" },
});

const baseColumns: ColDef<OptionDetails>[] = [
  { field: "value", headerName: "Value", width: 130 },
  { field: "label", headerName: "Label", minWidth: 160, flex: 1 },
];
const additionalColumns: Array<ColDef<OptionDetails> & { field: AdditionalOptionField; headerName: string }> = [
  { field: "description", headerName: "Description", minWidth: 200, flex: 1 },
  { field: "color", headerName: "Color", width: 120 },
  { field: "state", headerName: "State", width: 100 },
  { field: "defaultStatus", headerName: "Default Status", width: 140 },
  { field: "externalValue", headerName: "External Value", width: 160 },
];
const defaultColDef: ColDef<OptionDetails> = {
  resizable: true, sortable: true, filter: true, wrapText: true, autoHeight: true,
};

interface OptionSetDrawerProps {
  model: OptionSetDrawerModel;
  environmentName: string;
  onRetry: () => void;
}

export const OptionSetDrawer = observer(({ model, environmentName, onRetry }: OptionSetDrawerProps): React.JSX.Element => {
  const styles = useStyles();
  const details = model.details;
  const columns = React.useMemo(
    () => [...baseColumns, ...additionalColumns.filter((column) => model.additionalFields.includes(column.field))],
    [model.additionalFields],
  );
  return (
    <>
    <OverlayDrawer
      position="end"
      size="large"
      open={Boolean(model.column)}
      onOpenChange={(_, { open }) => { if (!open) model.close(); }}
    >
      <DrawerHeader>
        <DrawerHeaderTitle action={
          <Button appearance="subtle" aria-label="Close option details" icon={<Dismiss24Regular />} onClick={() => model.close()} />
        }>
          {model.column?.displayName || model.column?.columnName}{details ? ` - ${details.options.length} options` : ""}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody className={styles.body}>
        <div className={styles.metadataRow}>
          <Text>Environment: {environmentName}</Text>
          <Text>Column: {model.column?.columnName}</Text>
        </div>
        {model.loading && <Spinner label="Loading option details..." />}
        {model.error && (
          <>
            <MessageBar intent="error"><MessageBarBody>{model.error}</MessageBarBody></MessageBar>
            <Button onClick={onRetry}>Retry</Button>
          </>
        )}
        {details && (
          <>
            <div className={styles.metadataRow}>
              <Text weight="semibold">{details.isGlobal ? "Global choice" : "Local choice"}: {details.displayName || details.name || model.column?.columnName}</Text>
              {details.name && <Text>Name: {details.name}</Text>}
            </div>
            <div className={styles.toolbar}>
              <SearchBox
                size="small"
                placeholder="Search Options"
                aria-label="Search options by label, value and description"
                value={model.optionSearch}
                onChange={(_, data) => model.setOptionSearch(data.value)}
              />
              <Tooltip content="Choose visible option columns" relationship="label">
                <Button
                  aria-label="Choose visible option columns"
                  icon={<ColumnEditRegular />}
                  onClick={() => model.chooseColumns()}
                />
              </Tooltip>
            </div>
            <div className={styles.grid}>
              <AgGridReact<OptionDetails>
                theme={agGridTheme}
                modules={[NumberFilterModule]}
                rowData={model.filteredOptions}
                columnDefs={columns}
                defaultColDef={defaultColDef}
                getRowId={({ data }) => String(data.value)}
                enableCellTextSelection
                overlayNoRowsTemplate={model.optionSearch.trim() ? "No matching options." : "No options are defined."}
              />
            </div>
          </>
        )}
      </DrawerBody>
    </OverlayDrawer>
    <OverlayDrawer
      position="end"
      open={model.columnPickerOpen}
      onOpenChange={(_, { open }) => { if (!open) model.closeColumnPicker(); }}
    >
      <DrawerHeader>
        <DrawerHeaderTitle action={
          <Button
            appearance="subtle"
            aria-label="Close option column selector"
            icon={<Dismiss24Regular />}
            onClick={() => model.closeColumnPicker()}
          />
        }>
          Select attributes to display
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <List
          selectionMode="multiselect"
          selectedItems={model.pendingAdditionalFields}
          onSelectionChange={(_, { selectedItems }) => model.setPendingAdditionalFields(
            additionalColumns.filter((column) => selectedItems.includes(column.field)).map((column) => column.field),
          )}
          aria-label="Additional option columns to display"
        >
          {additionalColumns.map((column) => (
            <ListItem
              key={column.field}
              value={column.field}
              aria-label={column.headerName}
              checkmark={{ "aria-label": column.headerName }}
            >
              {column.headerName}
            </ListItem>
          ))}
        </List>
      </DrawerBody>
      <DrawerFooter>
        <Button appearance="primary" disabled={model.savingDefaults} onClick={() => model.applyColumns()}>Apply</Button>
        <Tooltip content="Save selected option columns as defaults" relationship="label">
          <Button
            aria-label="Save selected option columns as defaults"
            icon={<Save24Regular />}
            disabled={model.savingDefaults}
            onClick={() => void model.saveDefaults()}
          >
            Save Defaults
          </Button>
        </Tooltip>
      </DrawerFooter>
    </OverlayDrawer>
    </>
  );
});
