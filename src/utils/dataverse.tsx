import { ColumnMeta } from "../model/columnMeta";
import { BusinessProcessFlowMeta } from "../model/businessProcessFlow";
import { BusinessRuleMeta } from "../model/businessRule";
import { Solution } from "../model/solution";
import { KeyMeta, PrivilegeMeta, RelationshipMeta, TableMeta } from "../model/tableMeta";
import { ViewMeta } from "../model/view";

interface RetrieveCurrentOrganizationResponse {
  Detail?: {
    EnvironmentId?: string;
  };
}

interface dvServiceProps {
  primaryConnection: ToolBoxAPI.DataverseConnection | null;
  secondaryConnection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export class dvService {
  primaryConnection: ToolBoxAPI.DataverseConnection | null;
  secondaryConnection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  private cachedEnvironmentIds = new Map<"primary" | "secondary", string>();
  private environmentIdRequests = new Map<"primary" | "secondary", Promise<string>>();

  constructor(props: dvServiceProps) {
    this.primaryConnection = props.primaryConnection;
    this.secondaryConnection = props.secondaryConnection;
    this.dvApi = props.dvApi;
    this.onLog = props.onLog;
  }

  private resolveConnection(connectionTarget: "primary" | "secondary") {
    return connectionTarget === "secondary" ? this.secondaryConnection : this.primaryConnection;
  }

  private queryData(odataQuery: string, connectionTarget: "primary" | "secondary" = "primary") {
    return this.dvApi.queryData(odataQuery, connectionTarget);
  }

  private fetchXmlQuery(fetchXml: string, connectionTarget: "primary" | "secondary" = "primary") {
    return this.dvApi.fetchXmlQuery(fetchXml, connectionTarget);
  }

  async getEnvironmentId(connectionTarget: "primary" | "secondary" = "primary"): Promise<string> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    const cachedEnvironmentId = this.cachedEnvironmentIds.get(connectionTarget);
    if (cachedEnvironmentId) {
      return cachedEnvironmentId;
    }

    const inFlightRequest = this.environmentIdRequests.get(connectionTarget);
    if (inFlightRequest) {
      return inFlightRequest;
    }

    const requestPath =
      "RetrieveCurrentOrganization(AccessType=@p1)?@p1=Microsoft.Dynamics.CRM.EndpointAccessType'Default'";

    const environmentIdRequest = this.queryData(requestPath, connectionTarget)
      .then((response) => {
        const environmentId = (response as RetrieveCurrentOrganizationResponse)?.Detail?.EnvironmentId?.trim();

        if (!environmentId) {
          throw new Error("RetrieveCurrentOrganization did not return an environment ID");
        }

        this.cachedEnvironmentIds.set(connectionTarget, environmentId);
        return environmentId;
      })
      .finally(() => {
        this.environmentIdRequests.delete(connectionTarget);
      });

    this.environmentIdRequests.set(connectionTarget, environmentIdRequest);
    return environmentIdRequest;
  }

  async getTableBrowserUrl(
    tableMetaId: string,
    pathSuffix = "",
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<string> {
    if (!tableMetaId) {
      throw new Error("No table metadata ID available");
    }

    const environmentId = await this.getEnvironmentId(connectionTarget);
    const normalizedSuffix = pathSuffix ? (pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`) : "";

    return `https://make.powerapps.com/environments/${encodeURIComponent(environmentId)}/entities/${encodeURIComponent(tableMetaId)}${normalizedSuffix}`;
  }

  /// Get metadata for all tables
  /// @returns Promise<TableMeta[]> - A promise that resolves to an array of TableMeta
  /// @todo : Need to swap back to toolbox code when fixed
  async getAllTables(primary: boolean): Promise<TableMeta[]> {
    this.onLog("Fetching table metadata...", "info");
    const connection = primary ? this.primaryConnection : this.secondaryConnection;
    if (!connection) {
      throw new Error("No connection available");
    }
    //const tables = await this.dvApi.getAllEntitiesMetadata();
    const tables = await this.queryData("EntityDefinitions", primary ? "primary" : "secondary");
    //console.log("Tables fetched: ", tables.value);
    const tableMetaList: TableMeta[] = (tables.value as any[]).map((table: any) => {
      //console.log("Table fetched: ", table);
      const tableMeta = new TableMeta();
      tableMeta.tableName = String(table.LogicalName);
      tableMeta.primaryDisplayName = table.DisplayName?.LocalizedLabels?.[0]?.Label || table.LogicalName;
      tableMeta.metaId = table.MetadataId || "";
      tableMeta.attributes = [];
      tableMeta.typeCode = table.ObjectTypeCode;
      Object.keys(table).forEach((prop) => {
        const value = table[prop];
        if (typeof value === "function") return;
        try {
          tableMeta.attributes.push({
            attributeName: prop,
            attributeValue: typeof value === "string" ? value : JSON.stringify(value),
          });
        } catch {
          tableMeta.attributes.push({
            attributeName: prop,
            attributeValue: String(value),
          });
        }
      });
      return tableMeta;
    });
    return tableMetaList;
  }

  // Get columns metadata for a specific table
  // @todo: Need to swap back to toolbox code when fixed
  // @param table - The logical name of the table
  // @returns Promise<ColumnMeta[]> - A promise that resolves to an array of ColumnMeta
  async getColumnsMeta(table: string, connectionTarget: "primary" | "secondary" = "primary"): Promise<ColumnMeta[]> {
    this.onLog(`Fetching column metadata for table: ${table}`, "info");
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      //const meta = await this.dvApi.getEntityMetadata(table, true);
      const meta = await this.queryData(`EntityDefinitions(LogicalName='${table}')/Attributes`, connectionTarget);

      //  console.log("Attributes fetched: ", meta.value);

      const columnMetaList: ColumnMeta[] = (meta.value as any[]).map((attr: any) => {
        //   console.log("Attribute fetched: ", attr);
        const columnMeta = new ColumnMeta();
        columnMeta.columnName = attr.LogicalName;
        columnMeta.displayName = attr.DisplayName?.LocalizedLabels?.[0]?.Label || attr.LogicalName;
        columnMeta.dataType = attr.AttributeType || "";
        columnMeta.attributes = [];
        Object.keys(attr).forEach((prop) => {
          const value = attr[prop];
          if (typeof value === "function") return;
          try {
            columnMeta.attributes.push({
              attributeName: prop,
              attributeValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          } catch {
            columnMeta.attributes.push({
              attributeName: prop,
              attributeValue: String(value),
            });
          }
        });
        //console.log("ColumnMeta created: ", columnMeta);
        return columnMeta;
      });
      return columnMetaList;
    } catch (error) {
      this.onLog(`Error fetching column metadata for table ${table}: ${(error as Error).message}`, "error");
      throw error;
    }
  }

  async getSolutions(managed: boolean, connectionTarget: "primary" | "secondary" = "primary"): Promise<Solution[]> {
    this.onLog("Fetching solutions...", "info");
    const connection = this.resolveConnection(connectionTarget);
    console.log("Fetching solutions, connection: ", connection);
    if (!connection) {
      throw new Error("No connection available");
    }

    const solutionsData = await this.queryData(
      "solutions?$filter=(isvisible eq true) and ismanaged eq " +
        (managed ? "true" : "false") +
        " &$select=friendlyname,uniquename&$orderby=createdon desc",
      connectionTarget,
    );
    const solutions: Solution[] = (solutionsData.value as any[]).map((sol: any) => {
      const solution = new Solution();
      solution.solutionName = sol.friendlyname;
      solution.uniqueName = sol.uniquename;
      solution.solutionId = sol.solutionid;
      return solution;
    });

    return solutions;
  }

  async getSolutionTables(
    solutionUniqueName: string,
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<TableMeta[]> {
    this.onLog(`Fetching tables for solution: ${solutionUniqueName}`, "info");
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    const query = `solutioncomponents?$select=objectid&$expand=solutionid($select=solutionid)&$filter=(componenttype eq 1) and (solutionid/uniquename eq '${solutionUniqueName}')`;

    try {
      const componentsData = await this.queryData(query, connectionTarget);
      console.log("Solution components fetched: ", componentsData.value);
      const compArray = componentsData.value as any[];

      const tablePromises = compArray.map(async (comp) => {
        const objectId = comp.objectid || comp.objectid?.Id || comp.objectid?.objectid;
        if (!objectId) return null;
        try {
          // Try fetching the entity definition by id
          const entityMeta = await this.queryData(`EntityDefinitions(${objectId})`, connectionTarget);
          // normalize the response: if entityMeta has a value array, use the first element, otherwise use the object itself
          const src: any = Array.isArray((entityMeta as any)?.value)
            ? (entityMeta as any).value[0]
            : (entityMeta as any);

          const tm = new TableMeta();
          tm.tableName = src?.LogicalName || String(objectId);
          tm.primaryDisplayName = src?.DisplayName?.LocalizedLabels?.[0]?.Label || tm.tableName;
          tm.metaId = src?.MetadataId || "";
          tm.attributes = [];
          tm.typeCode = src?.ObjectTypeCode;
          console.log("Processing table metadata for: ", entityMeta);
          Object.keys(src || {}).forEach((prop) => {
            const value = src[prop];
            if (typeof value === "function") return;
            try {
              tm.attributes.push({
                attributeName: prop,
                attributeValue: typeof value === "string" ? value : JSON.stringify(value),
              });
            } catch {
              tm.attributes.push({
                attributeName: prop,
                attributeValue: String(value),
              });
            }
          });

          return tm;
        } catch (err) {
          this.onLog(`Failed to fetch entity metadata for id ${objectId}: ${(err as Error).message}`, "warning");
          return null;
        }
      });

      const solutionTables = (await Promise.all(tablePromises)).filter((t): t is TableMeta => !!t);
      console.log("Solution tables fetched: ", solutionTables);

      // optional: store result on the instance for later use
      return solutionTables;
    } catch (err) {
      this.onLog(`Error fetching solution tables for ${solutionUniqueName}: ${(err as Error).message}`, "error");
      throw err;
    }
  }

  async getTableByLogicalName(
    logicalName: string,
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<TableMeta | null> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    if (!logicalName?.trim()) {
      return null;
    }

    try {
      const tableData = await this.queryData(`EntityDefinitions(LogicalName='${logicalName}')`, connectionTarget);
      const src: any = Array.isArray((tableData as any)?.value) ? (tableData as any).value[0] : (tableData as any);

      if (!src?.LogicalName) {
        return null;
      }

      const tm = new TableMeta();
      tm.tableName = src.LogicalName;
      tm.primaryDisplayName = src.DisplayName?.LocalizedLabels?.[0]?.Label || src.LogicalName;
      tm.metaId = src.MetadataId || "";
      tm.typeCode = src.ObjectTypeCode;

      Object.keys(src).forEach((prop) => {
        const value = src[prop];
        if (typeof value === "function") return;
        try {
          tm.attributes.push({
            attributeName: prop,
            attributeValue: typeof value === "string" ? value : JSON.stringify(value),
          });
        } catch {
          tm.attributes.push({
            attributeName: prop,
            attributeValue: String(value),
          });
        }
      });

      return tm;
    } catch {
      return null;
    }
  }

  async getKeysMeta(
    selectedTable: TableMeta,
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<KeyMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching keys metadata for table: ${selectedTable.tableName}`, "info");
      const meta = await this.queryData(`EntityDefinitions(${selectedTable.metaId})/Keys`, connectionTarget);
      const keyMetaList: KeyMeta[] = (meta.value as any).map((key: any) => {
        // console.log("Processing key: ", key);
        const keyMeta = new KeyMeta();
        keyMeta.keyName = key.DisplayName?.UserLocalizedLabel?.Label || key.LogicalName || "";
        keyMeta.attributes = [];
        Object.keys(key).forEach((prop) => {
          const value = key[prop];
          if (typeof value === "function") return;
          try {
            keyMeta.attributes.push({
              attributeName: prop,
              attributeValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          } catch {
            keyMeta.attributes.push({
              attributeName: prop,
              attributeValue: String(value),
            });
          }
        });
        return keyMeta;
      });
      return keyMetaList;
    } catch (err) {
      this.onLog(
        `Error fetching keys metadata for table ${selectedTable.tableName}: ${(err as Error).message}`,
        "error",
      );
      throw err;
    }
  }

  async getPrivilegesMetadata(
    selectedTable: TableMeta,
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<PrivilegeMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching privileges metadata for table: ${selectedTable.tableName}`, "info");
      const meta = await this.queryData(`EntityDefinitions(${selectedTable.metaId})/Privileges`, connectionTarget);
      const keyMetaList: PrivilegeMeta[] = (meta.value as any).map((privilege: any) => {
        // console.log("Processing key: ", privilege);
        const privMeta = new PrivilegeMeta();
        privMeta.privilegeName = privilege.Name;
        privMeta.attributes = [];
        Object.keys(privilege).forEach((prop) => {
          const value = privilege[prop];
          if (typeof value === "function") return;
          try {
            privMeta.attributes.push({
              attributeName: prop,
              attributeValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          } catch {
            privMeta.attributes.push({
              attributeName: prop,
              attributeValue: String(value),
            });
          }
        });
        return privMeta;
      });
      return keyMetaList;
    } catch (err) {
      this.onLog(
        `Error fetching privileges metadata for table ${selectedTable.tableName}: ${(err as Error).message}`,
        "error",
      );
      throw err;
    }
  }

  async getRelationshipsMeta(
    selectedTable: TableMeta,
    type: string,
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<RelationshipMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching relationships metadata for table: ${selectedTable.tableName} type: ${type}`, "info");
      const meta = await this.queryData(`EntityDefinitions(${selectedTable.metaId})/${type}s`, connectionTarget);
      const relationships: RelationshipMeta[] = (meta.value as any).map((relationship: any) => {
        const relationshipMeta = new RelationshipMeta();
        relationshipMeta.relationshipName = relationship.SchemaName;
        relationshipMeta.type = type;
        relationshipMeta.attributes = [];
        Object.keys(relationship).forEach((prop) => {
          const value = relationship[prop];
          if (typeof value === "function") return;
          try {
            relationshipMeta.attributes.push({
              attributeName: prop,
              attributeValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          } catch {
            relationshipMeta.attributes.push({
              attributeName: prop,
              attributeValue: String(value),
            });
          }
        });
        return relationshipMeta;
      });
      return relationships;
    } catch (err) {
      this.onLog(
        `Error fetching relationship metadata for table ${selectedTable.tableName}: ${(err as Error).message}`,
        "error",
      );
      throw err;
    }
  }

  async getSolutionsForTable(
    selectedTable: TableMeta,
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<Solution[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching solutions metadata for table: ${selectedTable.tableName}`, "info");

      const fetchXml = `<fetch version="1.0" mapping="logical" >
  <entity name="solution">
    <attribute name="createdon" />
    <attribute name="description" />
    <attribute name="friendlyname" />
    <attribute name="uniquename" />
    <attribute name="ismanaged" />
    <attribute name="version" />
    <filter>
      <condition attribute="isvisible" operator="eq" value="1" />
    </filter>
    <link-entity name="solutioncomponent" from="solutionid" to="solutionid" alias="sc" >
    <attribute name="rootcomponentbehavior" />
      <filter>
        <condition attribute="objectid" operator="eq" value="${selectedTable.metaId}" />
      </filter>
    </link-entity>
  </entity>
</fetch>`;
      console.log("FetchXML for solutions: ", fetchXml);
      const meta = await this.fetchXmlQuery(fetchXml, connectionTarget);
      console.log("Solutions fetched: ", meta);
      const solutions: Solution[] = (meta.value as any).map((solution: any) => {
        // console.log("Processing Solution: ", solution);
        const solutionMeta = new Solution();
        solutionMeta.solutionName = solution.friendlyname;
        solutionMeta.uniqueName = solution.uniquename;
        solutionMeta.solutionId = solution.solutionid;
        solutionMeta.description = solution.description;
        solutionMeta.version = solution.version;
        solutionMeta.isManaged = solution.ismanaged;
        solutionMeta.subcomponents = solution["sc.rootcomponentbehavior"];
        // solutionMeta.attributes = [];
        // Object.keys(solution).forEach((prop) => {
        //   const value = solution[prop];
        //   if (typeof value === "function") return;
        //   try {
        //     solutionMeta.attributes.push({
        //       attributeName: prop,
        //       attributeValue: typeof value === "string" ? value : JSON.stringify(value),
        //     });
        //   } catch {
        //     solutionMeta.attributes.push({
        //       attributeName: prop,
        //       attributeValue: String(value),
        //     });
        //   }
        // });
        return solutionMeta;
      });
      return solutions;
    } catch (err) {
      this.onLog(
        `Error fetching solutions metadata for table ${selectedTable.tableName}: ${(err as Error).message}`,
        "error",
      );
      throw err;
    }
  }

  async getViewsForTable(
    selectedTable: TableMeta,
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<ViewMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Fetching views metadata for table: ${selectedTable.tableName}`, "info");

      const systemViewsQuery = "savedqueries?$filter=returnedtypecode eq '" + selectedTable.tableName + "'";

      const personalViewsQuery = "userqueries?$filter=returnedtypecode eq '" + selectedTable.tableName + "'";

      const [systemViewsData, personalViewsData] = await Promise.all([
        this.queryData(systemViewsQuery, connectionTarget),
        this.queryData(personalViewsQuery, connectionTarget),
      ]);

      const systemViews = (systemViewsData.value as any[]).map((view: any) => {
        const viewMeta = new ViewMeta();
        viewMeta.viewName = view.name;
        viewMeta.type = "System";

        Object.keys(view).forEach((prop) => {
          const value = view[prop];
          if (typeof value === "function") return;
          try {
            viewMeta.attributes.push({
              attributeName: prop,
              attributeValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          } catch {
            viewMeta.attributes.push({
              attributeName: prop,
              attributeValue: String(value),
            });
          }
        });

        return viewMeta;
      });

      const personalViews = (personalViewsData.value as any[]).map((view: any) => {
        const viewMeta = new ViewMeta();
        viewMeta.viewName = view.name;
        viewMeta.type = "Personal";

        Object.keys(view).forEach((prop) => {
          const value = view[prop];
          if (typeof value === "function") return;
          try {
            viewMeta.attributes.push({
              attributeName: prop,
              attributeValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          } catch {
            viewMeta.attributes.push({
              attributeName: prop,
              attributeValue: String(value),
            });
          }
        });

        return viewMeta;
      });

      return [...systemViews, ...personalViews];
    } catch (err) {
      this.onLog(
        `Error fetching views metadata for table ${selectedTable.tableName}: ${(err as Error).message}`,
        "error",
      );
      throw err;
    }
  }

  async getBusinessProcessFlowsForTable(
    selectedTable: TableMeta,
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<BusinessProcessFlowMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Fetching business process flows for table: ${selectedTable.tableName}`, "info");

      const bpfQuery = "workflows?$filter=category eq 4 and primaryentity eq '" + selectedTable.tableName + "'";

      const bpfData = await this.queryData(bpfQuery, connectionTarget);

      const flows = (bpfData.value as any[]).map((flow: any) => {
        const bpfMeta = new BusinessProcessFlowMeta();
        bpfMeta.flowName = flow.name || flow.uniquename || "";
        bpfMeta.type = "Business Process Flow";

        Object.keys(flow).forEach((prop) => {
          const value = flow[prop];
          if (typeof value === "function") return;
          try {
            bpfMeta.attributes.push({
              attributeName: prop,
              attributeValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          } catch {
            bpfMeta.attributes.push({
              attributeName: prop,
              attributeValue: String(value),
            });
          }
        });

        return bpfMeta;
      });

      return flows;
    } catch (err) {
      this.onLog(
        `Error fetching business process flows for table ${selectedTable.tableName}: ${(err as Error).message}`,
        "error",
      );
      throw err;
    }
  }

  async getBusinessRulesForTable(
    selectedTable: TableMeta,
    connectionTarget: "primary" | "secondary" = "primary",
  ): Promise<BusinessRuleMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Fetching business rules for table: ${selectedTable.tableName}`, "info");

      const businessRulesQuery =
        "workflows?$filter=category eq 2 and primaryentity eq '" + selectedTable.tableName + "'";

      const businessRulesData = await this.queryData(businessRulesQuery, connectionTarget);

      const rules = (businessRulesData.value as any[]).map((rule: any) => {
        const ruleMeta = new BusinessRuleMeta();
        ruleMeta.ruleName = rule.name || rule.uniquename || "";
        ruleMeta.type = "Business Rule";

        Object.keys(rule).forEach((prop) => {
          const value = rule[prop];
          if (typeof value === "function") return;
          try {
            ruleMeta.attributes.push({
              attributeName: prop,
              attributeValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          } catch {
            ruleMeta.attributes.push({
              attributeName: prop,
              attributeValue: String(value),
            });
          }
        });

        return ruleMeta;
      });

      return rules;
    } catch (err) {
      this.onLog(
        `Error fetching business rules for table ${selectedTable.tableName}: ${(err as Error).message}`,
        "error",
      );
      throw err;
    }
  }
}
