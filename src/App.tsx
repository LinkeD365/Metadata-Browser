import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useEventLog, useToolboxEvents } from "./hooks/useToolboxAPI";
import { ViewModel } from "./model/ViewModel";
import { dvService } from "./utils/dataverse";
import { MetadataBrowser } from "./components/MetadataBrowser";
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { RelationshipAttribute } from "./model/tableMeta";

function App() {
  const { primaryConnection, secondaryConnection, isLoading, refreshConnection } = useConnection();

  const { addLog } = useEventLog();
  const [theme, setTheme] = useState<string>("light");

  // Handle platform events
  const handleEvent = useCallback(
    async (event: string, _data: any) => {
      switch (event) {
        case "connection:updated":
        case "connection:created":
          await refreshConnection();
          clearSelections();

          break;

        case "connection:deleted":
          await refreshConnection();
          clearSelections();
          break;

        case "terminal:output":
        case "terminal:command:completed":
        case "terminal:error":
          break;
        case "theme:changed":
        case "settings:updated":
          console.log("Theme or settings updated, refreshing theme");
          const theme = await window.toolboxAPI.utils.getCurrentTheme();
          setTheme(theme);
          document.body.setAttribute("data-theme", theme);
          document.body.setAttribute("data-ag-theme-mode", theme);
          break;
      }
    },
    [refreshConnection],
  );

  function clearSelections() {
    viewModel.solutions = [];
    viewModel.selectedSolution = undefined;
    viewModel.tableMetadata = [];
  }
  useToolboxEvents(handleEvent);

  // Add initial log (run only once on mount)
  useEffect(() => {
    addLog("Metadata browser loaded", "success");
  }, [addLog]);

  useEffect(() => {
    (async () => {
      const currentTheme = await window.toolboxAPI.utils.getCurrentTheme();
      setTheme(currentTheme);
      document.body.setAttribute("data-theme", currentTheme);
      document.body.setAttribute("data-ag-theme-mode", currentTheme);
    })();
  }, []);

  const [viewModel] = useState(() => new ViewModel());

  const loadSetting = useCallback(async <T,>(key: string, parser: (value: string) => T): Promise<T | null> => {
    const value = await window.toolboxAPI.settings.get(key);
    return value ? parser(value) : null;
  }, []);

  useEffect(() => {
    const loadDefaultSettings = async () => {
      try {
        const savedColumns = await loadSetting("defaultTableColumns", (value) =>
          value.split(",").map((col: string) => col.trim()),
        );
        if (savedColumns) {
          viewModel.tableAttributes = savedColumns;
        }
        const savedColAttribs = await loadSetting("defaultColumnAttributes", (value) => JSON.parse(value));
        if (savedColAttribs) {
          Object.assign(viewModel.columnAttributes, savedColAttribs);
        }
        const relTypes = ["OneToManyRelationship", "ManyToOneRelationship", "ManyToManyRelationship"];
        for (const relType of relTypes) {
          const savedRelAttribs = await loadSetting("defaultRelationshipAttributes" + relType, (value) =>
            JSON.parse(value).map((attr: RelationshipAttribute) => {
              return Object.assign(new RelationshipAttribute(), attr);
            }),
          );
          if (savedRelAttribs) {
            viewModel.relationshipAttributes = viewModel.relationshipAttributes.concat(savedRelAttribs);
          }
        }
        const savedViewAttribs = await loadSetting("defaultViewAttributes", (value) => JSON.parse(value));
        if (savedViewAttribs) {
          viewModel.viewAttributes = savedViewAttribs;
        }
        const savedBpfAttribs = await loadSetting("defaultBusinessProcessFlowAttributes", (value) => JSON.parse(value));
        if (savedBpfAttribs) {
          viewModel.businessProcessFlowAttributes = savedBpfAttribs;
        }
        const savedBusinessRuleAttribs = await loadSetting("defaultBusinessRuleAttributes", (value) =>
          JSON.parse(value),
        );
        if (savedBusinessRuleAttribs) {
          viewModel.businessRuleAttributes = savedBusinessRuleAttribs;
        }
        const excelExport = await loadSetting("defaultExcelExportOptions", (value) => JSON.parse(value));
        if (excelExport) {
          Object.assign(viewModel.excelOptions, excelExport);
        }
        addLog("Loaded default relationship attributes", "info");
      } catch (error) {
        console.error("Failed to load default settings:", error);
      }
    };

    void loadDefaultSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- viewModel is a stable reference that doesn't need to trigger re-runs
  }, [loadSetting, viewModel, addLog]);
  const dvSvc = useMemo(
    () =>
      new dvService({
        primaryConnection: primaryConnection,
        secondaryConnection: secondaryConnection,
        dvApi: window.dataverseAPI,
        onLog: addLog,
      }),
    [primaryConnection, secondaryConnection, addLog],
  );
  return (
    <>
      <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme}>
        <MetadataBrowser
          primaryConnection={primaryConnection}
          secondaryConnection={secondaryConnection}
          vm={viewModel}
          dvService={dvSvc}
          onLog={addLog}
          isLoading={isLoading}
        />
      </FluentProvider>
    </>
  );
}

export default App;
