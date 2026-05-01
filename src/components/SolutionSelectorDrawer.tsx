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
  SearchBox,
  SelectionItemId,
  ToggleButton,
} from "@fluentui/react-components";
import { Dismiss24Regular, EditRegular, LockClosedRegular } from "@fluentui/react-icons";
import { Solution } from "../model/solution";

interface SolutionSelectorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managed: boolean;
  onManagedChange: (managed: boolean) => void;
  solutionQuery: string;
  onSolutionQueryChange: (query: string) => void;
  selectedSolutionIds: SelectionItemId[];
  onSelectedSolutionIdsChange: (items: SelectionItemId[]) => void;
  solutions: Solution[];
  onSelect: () => void;
}

export function SolutionSelectorDrawer(props: SolutionSelectorDrawerProps): React.JSX.Element {
  const {
    open,
    onOpenChange,
    managed,
    onManagedChange,
    solutionQuery,
    onSolutionQueryChange,
    selectedSolutionIds,
    onSelectedSolutionIdsChange,
    solutions,
    onSelect,
  } = props;

  const filteredSolutions = React.useMemo(() => {
    const list = (
      !solutionQuery || solutionQuery.trim() === ""
        ? solutions
        : solutions.filter((solution) => {
            const query = solutionQuery.toLowerCase();
            return (
              solution.solutionName.toLowerCase().includes(query) || solution.uniqueName.toLowerCase().includes(query)
            );
          })
    ).slice();

    return list.sort((a, b) => {
      const nameCompare = a.solutionName.localeCompare(b.solutionName, undefined, { sensitivity: "base" });
      if (nameCompare !== 0) {
        return nameCompare;
      }
      return a.uniqueName.localeCompare(b.uniqueName, undefined, { sensitivity: "base" });
    });
  }, [solutionQuery, solutions]);

  const solutionSelectList = React.useMemo(() => {
    if (!filteredSolutions || filteredSolutions.length === 0) {
      return [];
    }

    return filteredSolutions.map((solution) => (
      <ListItem
        key={solution.solutionId}
        value={solution.solutionId}
        aria-label={solution.solutionName}
        checkmark={{ "aria-label": solution.solutionName }}
      >
        {solution.solutionName} ({solution.uniqueName})
      </ListItem>
    ));
  }, [filteredSolutions]);

  return (
    <OverlayDrawer position="end" size="medium" open={open} onOpenChange={(_, { open: isOpen }) => onOpenChange(isOpen)}>
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
          Select a Solution
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <ToggleButton
            onClick={() => onManagedChange(false)}
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
            onClick={() => onManagedChange(true)}
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

        <SearchBox
          size="small"
          placeholder="Search solutions"
          aria-label="Search solutions by name or unique name"
          value={solutionQuery}
          onChange={(_, data) => onSolutionQueryChange(data.value ?? "")}
          style={{ marginBottom: 8, width: "32rem", maxWidth: "100%" }}
        />

        <List
          selectionMode="single"
          selectedItems={selectedSolutionIds}
          onSelectionChange={(_, data) => onSelectedSolutionIdsChange(data.selectedItems)}
          aria-label="List of solutions"
        >
          <div style={{ fontSize: "small" }}>{solutionSelectList}</div>
        </List>
      </DrawerBody>

      <DrawerFooter style={{ display: "flex", width: "100%" }}>
        <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={onSelect}>
          Select
        </Button>
      </DrawerFooter>
    </OverlayDrawer>
  );
}
