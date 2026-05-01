import { ColumnMeta } from "../model/columnMeta";
import { BusinessProcessFlowMeta } from "../model/businessProcessFlow";
import { BusinessRuleMeta } from "../model/businessRule";
import { Solution } from "../model/solution";
import { KeyMeta, PrivilegeMeta, RelationshipMeta, TableMeta } from "../model/tableMeta";
import { ViewMeta } from "../model/view";

interface dvServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export class dvService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: dvServiceProps) {
    this.connection = props.connection;
    this.dvApi = props.dvApi;
    this.onLog = props.onLog;
  }

  private toAttributes(record: Record<string, unknown>): { attributeName: string; attributeValue: string }[] {
    const result: { attributeName: string; attributeValue: string }[] = [];
    Object.keys(record).forEach((prop) => {
      const value = record[prop];
      if (typeof value === "function") return;
      try {
        result.push({
          attributeName: prop,
          attributeValue: typeof value === "string" ? value : JSON.stringify(value),
        });
      } catch {
        result.push({
          attributeName: prop,
          attributeValue: String(value),
        });
      }
    });
    return result;
  }

  /// Get metadata for all tables
  /// @returns Promise<TableMeta[]> - A promise that resolves to an array of TableMeta
  /// @todo : Need to swap back to toolbox code when fixed
  async getAllTables(): Promise<TableMeta[]> {
    this.onLog("Fetching table metadata...", "info");
    if (!this.connection) {
      throw new Error("No connection available");
    }
    //const tables = await this.dvApi.getAllEntitiesMetadata();
    const tables = await this.dvApi.queryData("EntityDefinitions");
    //console.log("Tables fetched: ", tables.value);
    const tableMetaList: TableMeta[] = (tables.value as any[]).map((table: any) => {
      //console.log("Table fetched: ", table);
      const tableMeta = new TableMeta();
      tableMeta.tableName = String(table.LogicalName);
      tableMeta.displayName = table.DisplayName?.LocalizedLabels?.[0]?.Label || table.LogicalName;
      tableMeta.metaId = table.MetadataId || "";
      tableMeta.attributes = [];
      tableMeta.typeCode = table.ObjectTypeCode;
      tableMeta.attributes = this.toAttributes(table as Record<string, unknown>);
      return tableMeta;
    });
    return tableMetaList;
  }

  // Get columns metadata for a specific table
  // @todo: Need to swap back to toolbox code when fixed
  // @param table - The logical name of the table
  // @returns Promise<ColumnMeta[]> - A promise that resolves to an array of ColumnMeta
  async getColumnsMeta(table: string): Promise<ColumnMeta[]> {
    this.onLog(`Fetching column metadata for table: ${table}`, "info");
    if (!this.connection) {
      throw new Error("No connection available");
    }
    try {
      //const meta = await this.dvApi.getEntityMetadata(table, true);
      const meta = await this.dvApi.queryData(`EntityDefinitions(LogicalName='${table}')/Attributes`);

      //  console.log("Attributes fetched: ", meta.value);

      const columnMetaList: ColumnMeta[] = (meta.value as any[]).map((attr: any) => {
        //   console.log("Attribute fetched: ", attr);
        const columnMeta = new ColumnMeta();
        columnMeta.columnName = attr.LogicalName;
        columnMeta.displayName = attr.DisplayName?.LocalizedLabels?.[0]?.Label || attr.LogicalName;
        columnMeta.dataType = attr.AttributeType || "";
        columnMeta.attributes = [];
        columnMeta.attributes = this.toAttributes(attr as Record<string, unknown>);
        //console.log("ColumnMeta created: ", columnMeta);
        return columnMeta;
      });
      return columnMetaList;
    } catch (error) {
      this.onLog(`Error fetching column metadata for table ${table}: ${(error as Error).message}`, "error");
      throw error;
    }
  }

  async getSolutions(managed: boolean): Promise<Solution[]> {
    this.onLog("Fetching solutions...", "info");
    console.log("Fetching solutions, connection: ", this.connection);
    if (!this.connection) {
      throw new Error("No connection available");
    }

    const solutionsData = await this.dvApi.queryData(
      "solutions?$filter=(isvisible eq true) and ismanaged eq " +
        (managed ? "true" : "false") +
        " &$select=friendlyname,uniquename&$orderby=createdon desc",
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

  async getSolutionTables(solutionUniqueName: string): Promise<TableMeta[]> {
    this.onLog(`Fetching tables for solution: ${solutionUniqueName}`, "info");
    if (!this.connection) {
      throw new Error("No connection available");
    }
    const query = `solutioncomponents?$select=objectid&$expand=solutionid($select=solutionid)&$filter=(componenttype eq 1) and (solutionid/uniquename eq '${solutionUniqueName}')`;

    try {
      const componentsData = await this.dvApi.queryData(query);
      console.log("Solution components fetched: ", componentsData.value);
      const compArray = componentsData.value as any[];

      const tablePromises = compArray.map(async (comp) => {
        const objectId = comp.objectid || comp.objectid?.Id || comp.objectid?.objectid;
        if (!objectId) return null;
        try {
          // Try fetching the entity definition by id
          const entityMeta = await this.dvApi.queryData(`EntityDefinitions(${objectId})`);
          // normalize the response: if entityMeta has a value array, use the first element, otherwise use the object itself
          const src: any = Array.isArray((entityMeta as any)?.value)
            ? (entityMeta as any).value[0]
            : (entityMeta as any);

          const tm = new TableMeta();
          tm.tableName = src?.LogicalName || String(objectId);
          tm.displayName = src?.DisplayName?.LocalizedLabels?.[0]?.Label || tm.tableName;
          tm.metaId = src?.MetadataId || "";
          tm.attributes = [];
          tm.typeCode = src?.ObjectTypeCode;
          tm.attributes = this.toAttributes((src || {}) as Record<string, unknown>);

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

  async getKeysMeta(selectedTable: TableMeta): Promise<KeyMeta[]> {
    if (!this.connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching keys metadata for table: ${selectedTable.tableName}`, "info");
      const meta = await this.dvApi.queryData(`EntityDefinitions(${selectedTable.metaId})/Keys`);
      const keyMetaList: KeyMeta[] = (meta.value as any).map((key: any) => {
        // console.log("Processing key: ", key);
        const keyMeta = new KeyMeta();
        keyMeta.keyName = key.DisplayName?.UserLocalizedLabel?.Label || key.LogicalName || "";
        keyMeta.attributes = [];
        keyMeta.attributes = this.toAttributes(key as Record<string, unknown>);
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

  async getPrivilegesMetadata(selectedTable: TableMeta): Promise<PrivilegeMeta[]> {
    if (!this.connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching privileges metadata for table: ${selectedTable.tableName}`, "info");
      const meta = await this.dvApi.queryData(`EntityDefinitions(${selectedTable.metaId})/Privileges`);
      const keyMetaList: PrivilegeMeta[] = (meta.value as any).map((privilege: any) => {
        // console.log("Processing key: ", privilege);
        const privMeta = new PrivilegeMeta();
        privMeta.privilegeName = privilege.Name;
        privMeta.attributes = [];
        privMeta.attributes = this.toAttributes(privilege as Record<string, unknown>);
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

  async getRelationshipsMeta(selectedTable: TableMeta, type: string): Promise<RelationshipMeta[]> {
    if (!this.connection) {
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Fetching relationships metadata for table: ${selectedTable.tableName} type: ${type}`, "info");
      const meta = await this.dvApi.queryData(`EntityDefinitions(${selectedTable.metaId})/${type}s`);
      const relationships: RelationshipMeta[] = (meta.value as any).map((relationship: any) => {
        const relationshipMeta = new RelationshipMeta();
        relationshipMeta.relationshipName = relationship.SchemaName;
        relationshipMeta.type = type;
        relationshipMeta.attributes = [];
        relationshipMeta.attributes = this.toAttributes(relationship as Record<string, unknown>);
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

  async getSolutionsForTable(selectedTable: TableMeta): Promise<Solution[]> {
    if (!this.connection) {
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
      const meta = await this.dvApi.fetchXmlQuery(fetchXml);
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

  async getViewsForTable(selectedTable: TableMeta): Promise<ViewMeta[]> {
    if (!this.connection) {
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Fetching views metadata for table: ${selectedTable.tableName}`, "info");

      const systemViewsQuery = "savedqueries?$filter=returnedtypecode eq '" + selectedTable.tableName + "'";

      const personalViewsQuery = "userqueries?$filter=returnedtypecode eq '" + selectedTable.tableName + "'";

      const [systemViewsData, personalViewsData] = await Promise.all([
        this.dvApi.queryData(systemViewsQuery),
        this.dvApi.queryData(personalViewsQuery),
      ]);

      const systemViews = (systemViewsData.value as any[]).map((view: any) => {
        const viewMeta = new ViewMeta();
        viewMeta.viewName = view.name;
        viewMeta.type = "System";
        viewMeta.attributes = this.toAttributes(view as Record<string, unknown>);

        return viewMeta;
      });

      const personalViews = (personalViewsData.value as any[]).map((view: any) => {
        const viewMeta = new ViewMeta();
        viewMeta.viewName = view.name;
        viewMeta.type = "Personal";
        viewMeta.attributes = this.toAttributes(view as Record<string, unknown>);

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

  async getBusinessProcessFlowsForTable(selectedTable: TableMeta): Promise<BusinessProcessFlowMeta[]> {
    if (!this.connection) {
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Fetching business process flows for table: ${selectedTable.tableName}`, "info");

      const bpfQuery = "workflows?$filter=category eq 4 and primaryentity eq '" + selectedTable.tableName + "'";

      const bpfData = await this.dvApi.queryData(bpfQuery);

      const flows = (bpfData.value as any[]).map((flow: any) => {
        const bpfMeta = new BusinessProcessFlowMeta();
        bpfMeta.flowName = flow.name || flow.uniquename || "";
        bpfMeta.type = "Business Process Flow";
        bpfMeta.attributes = this.toAttributes(flow as Record<string, unknown>);

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

  async getBusinessRulesForTable(selectedTable: TableMeta): Promise<BusinessRuleMeta[]> {
    if (!this.connection) {
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Fetching business rules for table: ${selectedTable.tableName}`, "info");

      const businessRulesQuery =
        "workflows?$filter=category eq 2 and primaryentity eq '" + selectedTable.tableName + "'";

      const businessRulesData = await this.dvApi.queryData(businessRulesQuery);

      const rules = (businessRulesData.value as any[]).map((rule: any) => {
        const ruleMeta = new BusinessRuleMeta();
        ruleMeta.ruleName = rule.name || rule.uniquename || "";
        ruleMeta.type = "Business Rule";
        ruleMeta.attributes = this.toAttributes(rule as Record<string, unknown>);

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
