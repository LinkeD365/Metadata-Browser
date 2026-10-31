interface ODataPage {
  value: Record<string, unknown>[];
  "@odata.nextLink"?: string;
}

function continuationQuery(nextLink: string, connectionUrl: string): string {
  const apiRoot = new URL("/api/data/v9.2/", connectionUrl);
  const url = new URL(nextLink, apiRoot);
  if (url.origin !== apiRoot.origin || !url.pathname.startsWith(apiRoot.pathname) || url.hash) {
    throw new Error("OData continuation URL is outside the connected Dataverse API");
  }
  const query = url.pathname.slice(apiRoot.pathname.length) + url.search;
  if (!query) {
    throw new Error("OData continuation URL does not identify a collection");
  }
  return query;
}

export async function fetchAllODataPages(
  query: string,
  connectionUrl: string,
  fetchPage: (query: string) => Promise<ODataPage>,
  maxPages = 1000,
): Promise<Record<string, unknown>[]> {
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new RangeError("OData page limit must be a positive integer");
  }
  const records: Record<string, unknown>[] = [];
  const visited = new Set<string>();
  for (let page = 0; page < maxPages; page += 1) {
    if (visited.has(query)) {
      throw new Error("OData continuation repeated a previously requested page");
    }
    visited.add(query);
    const result = await fetchPage(query);
    if (!Array.isArray(result.value)) {
      throw new Error("Dataverse did not return an OData collection");
    }
    records.push(...result.value);
    const nextLink = result["@odata.nextLink"];
    if (nextLink === undefined || nextLink === null) {
      return records;
    }
    if (typeof nextLink !== "string" || nextLink.length === 0) {
      throw new Error("Dataverse returned an invalid OData continuation URL");
    }
    query = continuationQuery(nextLink, connectionUrl);
  }
  throw new Error("OData results exceed the maximum supported page count");
}
