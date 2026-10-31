interface FetchXmlPageResult {
  value: Record<string, unknown>[];
  "@Microsoft.Dynamics.CRM.fetchxmlpagingcookie"?: string;
}

interface FetchXmlPagingOptions {
  pageSize?: number;
  maxPages?: number;
  maxSimplePages?: number;
}

export async function fetchAllFetchXmlPages(
  fetchPage: (page: number, pagingCookie?: string) => Promise<FetchXmlPageResult>,
  { pageSize = 5000, maxPages = 1000, maxSimplePages = 10 }: FetchXmlPagingOptions = {},
): Promise<Record<string, unknown>[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("FetchXML page size must be a positive integer");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1 || !Number.isInteger(maxSimplePages) || maxSimplePages < 1) {
    throw new RangeError("FetchXML page limits must be positive integers");
  }

  const records: Record<string, unknown>[] = [];
  let pagingCookie: string | undefined;

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchPage(page, pagingCookie);
    records.push(...result.value);

    if (result.value.length < pageSize) {
      return records;
    }

    pagingCookie = result["@Microsoft.Dynamics.CRM.fetchxmlpagingcookie"] || undefined;
    if (!pagingCookie && page >= maxSimplePages) {
      throw new Error("FetchXML results exceed the simple-paging limit without a paging cookie");
    }
  }

  throw new Error("FetchXML results exceed the maximum supported page count");
}

export function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function decodeFetchXmlPagingCookie(cookie: string): string {
  return escapeXmlAttribute(decodeURIComponent(decodeURIComponent(cookie)));
}
