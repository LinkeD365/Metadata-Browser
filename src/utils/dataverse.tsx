import { ColumnMeta } from "../model/columnMeta";
import { BusinessProcessFlowMeta } from "../model/businessProcessFlow";
import { BusinessRuleMeta } from "../model/businessRule";
import { Solution } from "../model/solution";
import { KeyMeta, PrivilegeMeta, RelationshipMeta, TableMeta } from "../model/tableMeta";
import { ViewMeta } from "../model/view";
import { mapWithConcurrency } from "./async";
import { mergeConnectionRecordSets } from "./connectionComparison";
import { decodeFetchXmlPagingCookie, escapeXmlAttribute, fetchAllFetchXmlPages } from "./fetchXmlPagination";
import { fetchAllODataPages } from "./odataPagination";

const MAX_CONCURRENT_SOLUTION_TABLE_REQUESTS = 5;

function getSolutionComponentObjectId(component: Record<string, unknown>): string | undefined {
  const objectId = component.objectid;
  if (typeof objectId === "string") {
    return objectId;
  }
  if (!objectId || typeof objectId !== "object") {
    return undefined;
  }

  const lookup = objectId as Record<string, unknown>;
  if (typeof lookup.Id === "string") {
    return lookup.Id;
  }
  return typeof lookup.objectid === "string" ? lookup.objectid : undefined;
}

interface RetrieveCurrentOrganizationResponse {
  Detail?: {
    EnvironmentId?: string;
  };
}

interface dvServiceProps {
  connections: Array<ToolBoxAPI.DataverseConnection | null>;
  dvApi: Pick<DataverseAPI.API, "queryData" | "fetchXmlQuery">;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export class dvService {
  connections: Array<ToolBoxAPI.DataverseConnection | null>;
  dvApi: Pick<DataverseAPI.API, "queryData" | "fetchXmlQuery">;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  private cachedEnvironmentIds = new Map<number, string>();
  private environmentIdRequests = new Map<number, Promise<string>>();

  constructor(props: dvServiceProps) {
    this.connections = props.connections;
    this.dvApi = props.dvApi;
    this.onLog = props.onLog;
  }

  private resolveConnection(connectionTarget: number) {
    return this.connections[connectionTarget] ?? null;
  }

  private queryData(odataQuery: string, connectionTarget = 0) {
    return this.dvApi.queryData(odataQuery, connectionTarget);
  }

  private fetchXmlQuery(fetchXml: string, connectionTarget = 0) {
    return this.dvApi.fetchXmlQuery(fetchXml, connectionTarget);
  }

  private async queryCollection(odataQuery: string, connectionTarget = 0) {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    return {
      value: await fetchAllODataPages(
        odataQuery,
        connection.url,
        (query) => this.queryData(query, connectionTarget),
      ),
    };
  }

  async getEnvironmentId(connectionTarget = 0): Promise<string> {
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
    connectionTarget = 0,
  ): Promise<string> {
    if (!tableMetaId) {
      throw new Error("No table metadata ID available");
    }

    const environmentId = await this.getEnvironmentId(connectionTarget);
    const normalizedSuffix = pathSuffix ? (pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`) : "";

    return `https://make.powerapps.com/environments/${encodeURIComponent(environmentId)}/entities/${encodeURIComponent(tableMetaId)}${normalizedSuffix}`;
  }

  async getComparisonTables(solutionUniqueName?: string): Promise<TableMeta[]> {
    const primaryTables = solutionUniqueName === undefined
      ? await this.getAllTables(0)
      : await this.getSolutionTables(solutionUniqueName, 0);
    if (primaryTables.length === 0) {
      return [];
    }

    const primaryTableNames = new Set(primaryTables.map((table) => table.tableName));
    const tableSets = await Promise.all(
      this.connections.map(async (connection, index) => ({
        records: index === 0
          ? primaryTables
          : connection
            ? (await this.getAllTables(index)).filter((table) => primaryTableNames.has(table.tableName))
            : [],
        getDisplayName: (table: TableMeta) => table.primaryDisplayName,
      })),
    );
    return mergeConnectionRecordSets(tableSets, (table) => table.tableName);
  }

  /// Get metadata for all tables
  /// @returns Promise<TableMeta[]> - A promise that resolves to an array of TableMeta
  /// @todo : Need to swap back to toolbox code when fixed
  async getAllTables(connectionTarget = 0): Promise<TableMeta[]> {
    this.onLog("Fetching table metadata...", "info");
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    //const tables = await this.dvApi.getAllEntitiesMetadata();
    const tables = await this.queryCollection("EntityDefinitions", connectionTarget);
    const tableMetaList: TableMeta[] = (tables.value as any[]).map((table: any) => {
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
  async getColumnsMeta(table: string, connectionTarget = 0): Promise<ColumnMeta[]> {
    this.onLog(`Fetching column metadata for table: ${table}`, "info");
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      //const meta = await this.dvApi.getEntityMetadata(table, true);
      const meta = await this.queryCollection(`EntityDefinitions(LogicalName='${table.replace(/'/g, "''")}')/Attributes`, connectionTarget);

      const columnMetaList: ColumnMeta[] = (meta.value as any[]).map((attr: any) => {
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
        return columnMeta;
      });
      return columnMetaList;
    } catch (error) {
      this.onLog("Unable to load column metadata from the selected environment.", "error");
      throw error;
    }
  }

  async getSolutions(managed: boolean, connectionTarget = 0): Promise<Solution[]> {
    this.onLog("Fetching solutions...", "info");
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    const solutionsData = await this.queryCollection(
      "solutions?$filter=(isvisible eq true) and ismanaged eq " +
        (managed ? "true" : "false") +
        "&$select=solutionid,friendlyname,uniquename&$orderby=createdon desc",
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
    connectionTarget = 0,
  ): Promise<TableMeta[]> {
    this.onLog("Fetching tables for the selected solution...", "info");
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      const compArray = await fetchAllFetchXmlPages((page, pagingCookie) => {
        const pagingCookieAttribute = pagingCookie
          ? ` paging-cookie="${decodeFetchXmlPagingCookie(pagingCookie)}"`
          : "";
        const fetchXml = `<fetch count="5000" page="${page}"${pagingCookieAttribute}>
  <entity name="solutioncomponent">
    <attribute name="objectid" />
    <order attribute="objectid" />
    <filter>
      <condition attribute="componenttype" operator="eq" value="1" />
    </filter>
    <link-entity name="solution" from="solutionid" to="solutionid" alias="solution">
      <filter>
        <condition attribute="uniquename" operator="eq" value="${escapeXmlAttribute(solutionUniqueName)}" />
      </filter>
    </link-entity>
  </entity>
</fetch>`;
        return this.fetchXmlQuery(fetchXml, connectionTarget);
      });

      const solutionTables = await mapWithConcurrency(
        compArray,
        MAX_CONCURRENT_SOLUTION_TABLE_REQUESTS,
        async (comp) => {
          const objectId = getSolutionComponentObjectId(comp);
          if (!objectId) {
            this.onLog("A solution component did not contain a usable table identifier.", "warning");
            return null;
          }
          try {
            const entityMeta = await this.queryData(`EntityDefinitions(${objectId})`, connectionTarget);
            const src: any = Array.isArray((entityMeta as any)?.value)
              ? (entityMeta as any).value[0]
              : (entityMeta as any);

            const tm = new TableMeta();
            tm.tableName = src?.LogicalName || String(objectId);
            tm.primaryDisplayName = src?.DisplayName?.LocalizedLabels?.[0]?.Label || tm.tableName;
            tm.metaId = src?.MetadataId || "";
            tm.attributes = [];
            tm.typeCode = src?.ObjectTypeCode;
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
          } catch {
            this.onLog("Failed to fetch metadata for a table in the selected solution.", "warning");
            return null;
          }
        },
      );

      return solutionTables.filter((table): table is TableMeta => table !== null);
    } catch (error) {
      this.onLog("Unable to load table metadata for the selected solution.", "error");
      throw error;
    }
  }

  async getTableByLogicalName(
    logicalName: string,
    connectionTarget = 0,
  ): Promise<TableMeta | null> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    if (!logicalName?.trim()) {
      this.onLog("A table logical name is required to resolve metadata.", "error");
      throw new Error("Table logical name is required");
    }

    try {
      const tableData = await this.queryData(`EntityDefinitions(LogicalName='${logicalName.replace(/'/g, "''")}')`, connectionTarget);
      const src: any = Array.isArray((tableData as any)?.value) ? (tableData as any).value[0] : (tableData as any);

      if (!src?.LogicalName) {
        throw new Error("Dataverse did not return the requested table metadata");
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
    } catch (error) {
      this.onLog("Unable to resolve table metadata in the selected environment.", "error");
      throw error;
    }
  }

  async getKeysMeta(
    selectedTable: TableMeta,
    connectionTarget = 0,
  ): Promise<KeyMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching keys metadata for table: ${selectedTable.tableName}`, "info");
      const meta = await this.queryCollection(
        `EntityDefinitions(LogicalName='${selectedTable.tableName.replace(/'/g, "''")}')/Keys`, connectionTarget,
      );
      const keyMetaList: KeyMeta[] = (meta.value as any).map((key: any) => {
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
        "Unable to load key metadata from the selected environment.",
        "error",
      );
      throw err;
    }
  }

  async getPrivilegesMetadata(
    selectedTable: TableMeta,
    connectionTarget = 0,
  ): Promise<PrivilegeMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching privileges metadata for table: ${selectedTable.tableName}`, "info");
      const meta = await this.queryCollection(
        `EntityDefinitions(LogicalName='${selectedTable.tableName.replace(/'/g, "''")}')/Privileges`, connectionTarget,
      );
      const keyMetaList: PrivilegeMeta[] = (meta.value as any).map((privilege: any) => {
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
        "Unable to load privilege metadata from the selected environment.",
        "error",
      );
      throw err;
    }
  }

  async getRelationshipsMeta(
    selectedTable: TableMeta,
    type: string,
    connectionTarget = 0,
  ): Promise<RelationshipMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching relationships metadata for table: ${selectedTable.tableName} type: ${type}`, "info");
      if (!["OneToManyRelationship", "ManyToOneRelationship", "ManyToManyRelationship"].includes(type)) {
        throw new Error("Unsupported relationship type");
      }
      const meta = await this.queryCollection(
        `EntityDefinitions(LogicalName='${selectedTable.tableName.replace(/'/g, "''")}')/${type}s`, connectionTarget,
      );
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
        "Unable to load relationship metadata from the selected environment.",
        "error",
      );
      throw err;
    }
  }

  async getSolutionsForTable(
    selectedTable: TableMeta,
    connectionTarget = 0,
  ): Promise<Solution[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching solutions metadata for table: ${selectedTable.tableName}`, "info");

      const targetTable = await this.getTableByLogicalName(selectedTable.tableName, connectionTarget);
      if (!targetTable?.metaId) {
        throw new Error("Table metadata ID is unavailable in the selected environment");
      }
      const records = await fetchAllFetchXmlPages((page, pagingCookie) => {
        const cookieAttribute = pagingCookie
          ? ` paging-cookie="${decodeFetchXmlPagingCookie(pagingCookie)}"`
          : "";
        const fetchXml = `<fetch version="1.0" mapping="logical" count="5000" page="${page}"${cookieAttribute}>
  <entity name="solution">
    <attribute name="createdon" />
    <attribute name="description" />
    <attribute name="friendlyname" />
    <attribute name="uniquename" />
    <attribute name="ismanaged" />
    <attribute name="version" />
    <order attribute="solutionid" />
    <filter>
      <condition attribute="isvisible" operator="eq" value="1" />
    </filter>
    <link-entity name="solutioncomponent" from="solutionid" to="solutionid" alias="sc" >
    <attribute name="rootcomponentbehavior" />
      <filter>
        <condition attribute="objectid" operator="eq" value="${escapeXmlAttribute(targetTable.metaId)}" />
      </filter>
    </link-entity>
  </entity>
</fetch>`;
        return this.fetchXmlQuery(fetchXml, connectionTarget);
      });
      const solutions: Solution[] = records.map((solution: any) => {
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
        "Unable to load solution membership from the selected environment.",
        "error",
      );
      throw err;
    }
  }

  async getViewsForTable(
    selectedTable: TableMeta,
    connectionTarget = 0,
  ): Promise<ViewMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Fetching views metadata for table: ${selectedTable.tableName}`, "info");

      const systemViewsQuery = "savedqueries?$filter=returnedtypecode eq '" + selectedTable.tableName.replace(/'/g, "''") + "'";

      const personalViewsQuery = "userqueries?$filter=returnedtypecode eq '" + selectedTable.tableName.replace(/'/g, "''") + "'";

      const [systemViewsData, personalViewsData] = await Promise.all([
        this.queryCollection(systemViewsQuery, connectionTarget),
        this.queryCollection(personalViewsQuery, connectionTarget),
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
        "Unable to load view metadata from the selected environment.",
        "error",
      );
      throw err;
    }
  }

  async getBusinessProcessFlowsForTable(
    selectedTable: TableMeta,
    connectionTarget = 0,
  ): Promise<BusinessProcessFlowMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Fetching business process flows for table: ${selectedTable.tableName}`, "info");

      const bpfQuery = "workflows?$filter=category eq 4 and primaryentity eq '" + selectedTable.tableName.replace(/'/g, "''") + "'";

      const bpfData = await this.queryCollection(bpfQuery, connectionTarget);

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
        "Unable to load business process flows from the selected environment.",
        "error",
      );
      throw err;
    }
  }

  async getBusinessRulesForTable(
    selectedTable: TableMeta,
    connectionTarget = 0,
  ): Promise<BusinessRuleMeta[]> {
    const connection = this.resolveConnection(connectionTarget);
    if (!connection) {
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Fetching business rules for table: ${selectedTable.tableName}`, "info");

      const businessRulesQuery =
        "workflows?$filter=category eq 2 and primaryentity eq '" + selectedTable.tableName.replace(/'/g, "''") + "'";

      const businessRulesData = await this.queryCollection(businessRulesQuery, connectionTarget);

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
        "Unable to load business rules from the selected environment.",
        "error",
      );
      throw err;
    }
  }
}
