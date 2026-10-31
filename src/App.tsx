import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useEventLog, useToolboxEvents } from "./hooks/useToolboxAPI";
import { ViewModel } from "./model/ViewModel";
import { dvService } from "./utils/dataverse";
import { MetadataBrowser } from "./components/MetadataBrowser";
import {
  Accordion, AccordionHeader, AccordionItem, AccordionPanel, Button, FluentProvider,
  webDarkTheme, webLightTheme,
} from "@fluentui/react-components";
import {
  parseColumnDefinitions, parseExcelOptions, parseRelationshipAttributes, parseStringArray,
} from "./utils/settings";

function App() {
  const { logs, addLog, clearLogs } = useEventLog();
  const reportError = useCallback(async (body: string) => {
    addLog(body, "error");
    try {
      await window.toolboxAPI.utils.showNotification({ title: "Metadata Browser", body, type: "error" });
    } catch {
      addLog("The host could not display the error notification.", "error");
    }
  }, [addLog]);
  const connectionError = useCallback(
    () => reportError("Unable to refresh connections. Reconnect or reopen the tool to retry."),
    [reportError],
  );
  const { connections, isLoading, refreshConnection } = useConnection(connectionError);
  const [viewModel, setViewModel] = useState(() => new ViewModel());
  const [theme, setTheme] = useState<string>("light");

  // Handle platform events
  const handleEvent = useCallback(
    async (event: string, _data: unknown) => {
      try {
        switch (event) {
          case "connection:updated":
          case "connection:created":
          case "connection:deleted":
            clearSelections();
            await refreshConnection();
            break;
          case "terminal:output":
          case "terminal:command:completed":
          case "terminal:error":
            break;
          case "theme:changed":
          case "settings:updated":
            const theme = await window.toolboxAPI.utils.getCurrentTheme();
            setTheme(theme);
            document.body.setAttribute("data-theme", theme);
            document.body.setAttribute("data-ag-theme-mode", theme);
            break;
        }
      } catch {
        await reportError("Unable to handle a connection or theme update. Reopen the tool to retry.");
      }
    },
    [refreshConnection, reportError],
  );

  function clearSelections() {
    setViewModel(new ViewModel());
  }
  useToolboxEvents(handleEvent);

  // Add initial log (run only once on mount)
  useEffect(() => {
    addLog("Metadata browser loaded", "success");
  }, [addLog]);

  useEffect(() => {
    (async () => {
      try {
        const currentTheme = await window.toolboxAPI.utils.getCurrentTheme();
        setTheme(currentTheme);
        document.body.setAttribute("data-theme", currentTheme);
        document.body.setAttribute("data-ag-theme-mode", currentTheme);
      } catch {
        await reportError("Unable to read the host theme. The tool is using its initial light theme; reopen to retry.");
      }
    })();
  }, [reportError]);

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
        const savedColAttribs = await loadSetting("defaultColumnAttributes", parseColumnDefinitions);
        if (savedColAttribs) {
          viewModel.columnAttributes = savedColAttribs;
        }
        const relTypes = ["OneToManyRelationship", "ManyToOneRelationship", "ManyToManyRelationship"];
        for (const relType of relTypes) {
          const savedRelAttribs = await loadSetting("defaultRelationshipAttributes" + relType, (value) =>
            parseRelationshipAttributes(value, relType),
          );
          if (savedRelAttribs) {
            viewModel.relationshipAttributes = viewModel.relationshipAttributes
              .filter((attribute) => attribute.type !== relType).concat(savedRelAttribs);
          }
        }
        const savedViewAttribs = await loadSetting("defaultViewAttributes", parseStringArray);
        if (savedViewAttribs) {
          viewModel.viewAttributes = savedViewAttribs;
        }
        const savedBpfAttribs = await loadSetting("defaultBusinessProcessFlowAttributes", parseStringArray);
        if (savedBpfAttribs) {
          viewModel.businessProcessFlowAttributes = savedBpfAttribs;
        }
        const savedBusinessRuleAttribs = await loadSetting("defaultBusinessRuleAttributes", (value) =>
          parseStringArray(value),
        );
        if (savedBusinessRuleAttribs) {
          viewModel.businessRuleAttributes = savedBusinessRuleAttribs;
        }
        const excelExport = await loadSetting("defaultExcelExportOptions", parseExcelOptions);
        if (excelExport) {
          Object.assign(viewModel.excelOptions, excelExport);
        }
        addLog("Loaded default relationship attributes", "info");
      } catch {
        await reportError("Unable to load saved display or export preferences. Review the preferences before exporting.");
      }
    };

    void loadDefaultSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- viewModel is a stable reference that doesn't need to trigger re-runs
  }, [loadSetting, viewModel, addLog, reportError]);
  const dvSvc = useMemo(
    () =>
      new dvService({
        connections,
        dvApi: window.dataverseAPI,
        onLog: addLog,
      }),
    [connections, addLog],
  );
  return (
    <>
      <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme} applyStylesToPortals={false}>
        <Accordion collapsible>
          <AccordionItem value="event-log">
            <AccordionHeader>Event log ({logs.length})</AccordionHeader>
            <AccordionPanel>
              <Button onClick={clearLogs}>Clear event log</Button>
              <ul aria-label="Metadata Browser event log">
                {logs.map((log, index) => (
                  <li key={index}>
                    {log.timestamp.toLocaleTimeString()} - {log.type}: {log.message}
                  </li>
                ))}
              </ul>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
        <MetadataBrowser
          key={connections.map((connection) => connection ? `${connection.id}:${connection.url}` : "").join("|")}
          connections={connections}
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
