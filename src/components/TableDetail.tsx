import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import {
  SelectTabData,
  SelectTabEvent,
  Tab,
  TabList,
  TabValue,
} from "@fluentui/react-components";
import { TableColumns } from "./TableColumns";

interface TableDetailProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  table: string;
  selectedTable: string;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
  showNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error"
  ) => void;
}

export const TableDetails = observer(
  (props: TableDetailProps): React.JSX.Element => {
    const {
      connection,
      dvService,
      onLog,
      viewModel,
      table,
      selectedTable,
      isLoading,
      showNotification,
    } = props;
    const [selectedValue, setSelectedValue] =
      React.useState<TabValue>("details");
    const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
      setSelectedValue(data.value);
    };

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

    // const Columns = React.memo(() => (
    //   <div role="tabpanel" aria-labelledby={`${table}-columns`}>
    //     <table>
    //       <thead>
    //         <th>Cols</th>
    //       </thead>
    //       <tbody>
    //         <tr>
    //           <td>DEN</td>
    //           <td>C3</td>
    //           <td>12:40 PM</td>
    //         </tr>
    //         <tr>
    //           <td>SMF</td>
    //           <td>D1</td>
    //           <td>1:18 PM</td>
    //         </tr>
    //         <tr>
    //           <td>SFO</td>
    //           <td>E18</td>
    //           <td>1:42 PM</td>
    //         </tr>
    //       </tbody>
    //     </table>
    //   </div>
    // ));

    return (
      <>
        {selectedTable === table && (
          <div>
            <TabList
              selectedValue={selectedValue}
              onTabSelect={onTabSelect}
              size="small"
            >
              <Tab id="details" value="details">
                Details
              </Tab>
              <Tab id="columns" value="columns">
                Columns
              </Tab>
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
  }
);
