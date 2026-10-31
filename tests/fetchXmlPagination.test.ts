import { describe, expect, it, vi } from "vitest";
import {
  decodeFetchXmlPagingCookie,
  escapeXmlAttribute,
  fetchAllFetchXmlPages,
} from "../src/utils/fetchXmlPagination";

describe("FetchXML pagination", () => {
  it("retrieves subsequent pages using the returned paging cookie", async () => {
    const cookie = encodeURIComponent(encodeURIComponent('<cookie page="1">'));
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        value: [{ id: "one" }, { id: "two" }],
        "@Microsoft.Dynamics.CRM.fetchxmlpagingcookie": cookie,
      })
      .mockResolvedValueOnce({ value: [{ id: "three" }] });

    const records = await fetchAllFetchXmlPages(fetchPage, { pageSize: 2 });

    expect(records).toEqual([{ id: "one" }, { id: "two" }, { id: "three" }]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, cookie);
  });

  it("uses simple paging when a cookie is unavailable and fails rather than truncate at its limit", async () => {
    const fetchPage = vi.fn(async () => ({ value: [{ id: "one" }, { id: "two" }] }));

    await expect(fetchAllFetchXmlPages(fetchPage, { pageSize: 2, maxSimplePages: 2 })).rejects.toThrow(
      "FetchXML results exceed the simple-paging limit without a paging cookie",
    );
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("stops when a page is shorter than the page size", async () => {
    const fetchPage = vi.fn(async () => ({ value: [{ id: "one" }] }));

    await expect(fetchAllFetchXmlPages(fetchPage, { pageSize: 2 })).resolves.toEqual([{ id: "one" }]);
    expect(fetchPage).toHaveBeenCalledOnce();
  });

  it("escapes XML attributes and decodes paging cookies twice before escaping", () => {
    expect(escapeXmlAttribute(`a&b <c> "d" 'e'`)).toBe("a&amp;b &lt;c&gt; &quot;d&quot; &apos;e&apos;");

    const cookie = encodeURIComponent(encodeURIComponent('<cookie value="a&b">'));
    expect(decodeFetchXmlPagingCookie(cookie)).toBe("&lt;cookie value=&quot;a&amp;b&quot;&gt;");
  });
});
