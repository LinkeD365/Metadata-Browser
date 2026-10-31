import { describe, expect, it, vi } from "vitest";
import { fetchAllODataPages } from "../src/utils/odataPagination";

const connectionUrl = "https://tenant.crm.dynamics.com";

describe("OData pagination", () => {
  it("follows same-environment continuation links without changing encoded tokens", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({
        value: [{ id: "first" }],
        "@odata.nextLink": `${connectionUrl}/api/data/v9.2/solutions?$skiptoken=a%2Bb%26c`,
      })
      .mockResolvedValueOnce({ value: [{ id: "second" }] });

    expect(await fetchAllODataPages("solutions", connectionUrl, fetchPage))
      .toEqual([{ id: "first" }, { id: "second" }]);
    expect(fetchPage.mock.calls).toEqual([["solutions"], ["solutions?$skiptoken=a%2Bb%26c"]]);
  });

  it("accepts relative API continuation links and stops on an empty final page", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ value: [{ id: "first" }], "@odata.nextLink": "solutions?$skip=1" })
      .mockResolvedValueOnce({ value: [] });
    expect(await fetchAllODataPages("solutions", connectionUrl, fetchPage)).toEqual([{ id: "first" }]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it.each([
    "https://other.crm.dynamics.com/api/data/v9.2/solutions",
    "http://tenant.crm.dynamics.com/api/data/v9.2/solutions",
    `${connectionUrl}/outside-api`,
    "../v9.1/solutions",
    "solutions#fragment",
  ])("rejects a continuation outside the selected API: %s", async (nextLink) => {
    const fetchPage = vi.fn(async () => ({ value: [], "@odata.nextLink": nextLink }));
    await expect(fetchAllODataPages("solutions", connectionUrl, fetchPage)).rejects.toThrow(
      "OData continuation URL is outside the connected Dataverse API",
    );
    expect(fetchPage).toHaveBeenCalledOnce();
  });

  it("rejects continuation cycles and page exhaustion instead of returning incomplete data", async () => {
    const cycle = vi.fn(async () => ({ value: [{ id: "one" }], "@odata.nextLink": "solutions" }));
    await expect(fetchAllODataPages("solutions", connectionUrl, cycle)).rejects.toThrow("repeated");
    expect(cycle).toHaveBeenCalledOnce();

    let page = 0;
    const endless = vi.fn(async () => ({
      value: [{ id: String(++page) }], "@odata.nextLink": `solutions?$skip=${page}`,
    }));
    await expect(fetchAllODataPages("solutions", connectionUrl, endless, 2)).rejects.toThrow("maximum");
    expect(endless).toHaveBeenCalledTimes(2);
  });

  it("propagates request failures and validates the page limit", async () => {
    const fetchPage = vi.fn(async () => { throw new Error("Connection expired"); });
    await expect(fetchAllODataPages("solutions", connectionUrl, fetchPage)).rejects.toThrow("Connection expired");
    await expect(fetchAllODataPages("solutions", connectionUrl, fetchPage, 0)).rejects.toThrow(RangeError);
    expect(fetchPage).toHaveBeenCalledOnce();
  });

  it("rejects malformed collection responses and continuation values", async () => {
    const malformed = vi.fn().mockResolvedValueOnce({ value: undefined });
    await expect(fetchAllODataPages("solutions", connectionUrl, malformed)).rejects.toThrow("OData collection");
    const invalidLink = vi.fn().mockResolvedValueOnce({ value: [], "@odata.nextLink": "" });
    await expect(fetchAllODataPages("solutions", connectionUrl, invalidLink)).rejects.toThrow("invalid OData");
  });
});
