import { describe, expect, it, vi } from "vitest";
import { ColumnMeta } from "../src/model/columnMeta";
import { OptionSetDrawerModel } from "../src/model/optionSet";
import type { OptionColumnPreferences, OptionSetDetails, OptionSetService } from "../src/model/optionSet";

const details: OptionSetDetails = {
  name: "custom_choice", displayName: "Choice", description: "", isGlobal: true,
  options: [{ value: 0, label: "Zero", description: "" }],
};

function setup() {
  const getColumnOptionSet = vi.fn<OptionSetService["getColumnOptionSet"]>();
  const notify = vi.fn<(title: string, message: string, type: "error" | "success") => Promise<void>>().mockResolvedValue(undefined);
  const preferences = {
    load: vi.fn<OptionColumnPreferences["load"]>().mockResolvedValue([]),
    save: vi.fn<OptionColumnPreferences["save"]>().mockResolvedValue(undefined),
  };
  const model = new OptionSetDrawerModel({ getColumnOptionSet }, notify, preferences);
  const column = Object.assign(new ColumnMeta(), { columnName: "custom_choice", sourceConnectionIndex: 2 });
  return { model, getColumnOptionSet, notify, column, preferences };
}

describe("option set drawer", () => {
  it("restores saved columns on first open without overwriting later unsaved selections", async () => {
    const { model, getColumnOptionSet, column, preferences } = setup();
    getColumnOptionSet.mockResolvedValue(details);
    preferences.load.mockResolvedValue(["description", "externalValue"]);
    await model.open("account", column);
    expect(model.additionalFields).toEqual(["description", "externalValue"]);
    model.chooseColumns();
    expect(model.pendingAdditionalFields).toEqual(["description", "externalValue"]);
    model.setPendingAdditionalFields(["color"]);
    model.applyColumns();
    model.close();
    await model.open("account", column);
    expect(model.additionalFields).toEqual(["color"]);
    expect(preferences.load).toHaveBeenCalledTimes(1);
    expect(preferences.save).not.toHaveBeenCalled();
  });

  it.each([["description", "state"], []] as const)("saves and applies selected defaults %j", async (...fields) => {
    const { model, preferences, notify } = setup();
    model.chooseColumns();
    model.setPendingAdditionalFields([...fields]);
    const request = model.saveDefaults();
    expect(model.savingDefaults).toBe(true);
    await request;
    expect(preferences.save).toHaveBeenCalledWith(fields);
    expect(model.additionalFields).toEqual(fields);
    expect(model.columnPickerOpen).toBe(false);
    expect(model.savingDefaults).toBe(false);
    expect(notify).toHaveBeenCalledWith("Defaults Saved", expect.any(String), "success");
  });

  it("keeps the selection available and reports safe errors when saving fails", async () => {
    const { model, preferences, notify } = setup();
    preferences.save.mockRejectedValueOnce(new Error("Sensitive settings error"));
    model.chooseColumns();
    model.setPendingAdditionalFields(["color"]);
    await model.saveDefaults();
    expect(model.additionalFields).toEqual([]);
    expect(model.pendingAdditionalFields).toEqual(["color"]);
    expect(model.columnPickerOpen).toBe(true);
    expect(model.savingDefaults).toBe(false);
    expect(notify).toHaveBeenCalledWith("Save Failed", expect.any(String), "error");
    expect(JSON.stringify(notify.mock.calls)).not.toContain("Sensitive settings error");
    await model.saveDefaults();
    expect(model.additionalFields).toEqual(["color"]);
  });

  it("reports failed preference reads and retries them without treating them as empty defaults", async () => {
    const { model, preferences, notify, column, getColumnOptionSet } = setup();
    getColumnOptionSet.mockResolvedValue(details);
    preferences.load.mockRejectedValueOnce(new Error("Invalid settings")).mockResolvedValueOnce(["color"]);
    await model.open("account", column);
    expect(model.details).toBeUndefined();
    expect(model.error).toContain("saved column defaults");
    expect(notify).toHaveBeenCalledWith("Operation failed", model.error, "error");
    await model.open("account", column);
    expect(model.additionalFields).toEqual(["color"]);
    expect(model.details).toEqual(details);
  });

  it("propagates a failed save notification without misreporting a successful settings write", async () => {
    const { model, preferences, notify } = setup();
    notify.mockRejectedValue(new Error("Host unavailable"));
    model.chooseColumns();
    model.setPendingAdditionalFields(["description"]);
    await expect(model.saveDefaults()).rejects.toThrow("Host unavailable");
    expect(preferences.save).toHaveBeenCalledWith(["description"]);
    expect(model.additionalFields).toEqual(["description"]);
    expect(model.savingDefaults).toBe(false);
    expect(notify).toHaveBeenCalledExactlyOnceWith("Defaults Saved", expect.any(String), "success");
  });

  it.each([
    [" AVAIL ", [0]],
    ["0", [0]],
    ["23", [123]],
    [" NEEDS REVIEW ", [42]],
    ["missing", []],
    ["   ", [0, 42, 123]],
  ] as const)("filters options by label, value or hidden description for %j", async (search, expectedValues) => {
    const { model, getColumnOptionSet, column } = setup();
    getColumnOptionSet.mockResolvedValue({
      ...details,
      options: [
        { value: 0, label: "Available", description: "" },
        { value: 42, label: "Paused", description: "Needs review" },
        { value: 123, label: "Closed", description: "Finished" },
      ],
    });
    await model.open("account", column);
    model.setOptionSearch(search);
    expect(model.filteredOptions.map((option) => option.value)).toEqual(expectedValues);
    expect(model.details?.options).toHaveLength(3);
    expect(model.additionalFields).toEqual([]);
    model.setOptionSearch("");
    expect(model.filteredOptions).toHaveLength(3);
    expect(getColumnOptionSet).toHaveBeenCalledTimes(1);
  });

  it("resets search when opening another column or closing the drawer", async () => {
    const { model, getColumnOptionSet, column } = setup();
    getColumnOptionSet.mockResolvedValue(details);
    await model.open("account", column);
    model.setOptionSearch("unmatched");
    const next = Object.assign(new ColumnMeta(), { columnName: "another_choice" });
    await model.open("account", next);
    expect(model.optionSearch).toBe("");
    expect(model.filteredOptions).toEqual(details.options);
    model.setOptionSearch("zero");
    model.close();
    expect(model.optionSearch).toBe("");
  });

  it("adds optional columns only after applying and supports removing them again", () => {
    const { model } = setup();
    model.chooseColumns();
    model.setPendingAdditionalFields(["description", "color"]);
    expect(model.additionalFields).toEqual([]);
    model.applyColumns();
    expect(model.additionalFields).toEqual(["description", "color"]);
    expect(model.columnPickerOpen).toBe(false);
    model.chooseColumns();
    expect(model.pendingAdditionalFields).toEqual(["description", "color"]);
    model.setPendingAdditionalFields([]);
    model.applyColumns();
    expect(model.additionalFields).toEqual([]);
  });

  it("discards unapplied column choices and closes the selector with the options drawer", () => {
    const { model } = setup();
    model.chooseColumns();
    model.setPendingAdditionalFields(["state"]);
    model.closeColumnPicker();
    expect(model.additionalFields).toEqual([]);
    model.chooseColumns();
    expect(model.pendingAdditionalFields).toEqual([]);
    model.close();
    expect(model.columnPickerOpen).toBe(false);
  });

  it("opens immediately, loads from the originating slot, and resets on close", async () => {
    const { model, getColumnOptionSet, notify, column } = setup();
    getColumnOptionSet.mockResolvedValue(details);
    const request = model.open("account", column);
    expect(model.column?.columnName).toBe("custom_choice");
    expect(model.loading).toBe(true);
    await request;
    expect(getColumnOptionSet).toHaveBeenCalledWith("account", column, 2);
    expect(model.details).toEqual(details);
    expect(model.loading).toBe(false);
    expect(notify).not.toHaveBeenCalled();
    model.close();
    expect(model.column).toBeUndefined();
    expect(model.details).toBeUndefined();
  });

  it("clears previous details, reports safe failures, and permits retry", async () => {
    const { model, getColumnOptionSet, notify, column } = setup();
    getColumnOptionSet.mockResolvedValueOnce(details)
      .mockRejectedValueOnce(new Error("Sensitive response"))
      .mockResolvedValueOnce(details);
    await model.open("account", column);
    await model.open("account", column);
    expect(model.details).toBeUndefined();
    expect(model.error).toContain("Unable to load option details");
    expect(model.loading).toBe(false);
    expect(notify).toHaveBeenCalledWith("Operation failed", model.error, "error");
    expect(JSON.stringify(notify.mock.calls)).not.toContain("Sensitive response");
    await model.open("account", column);
    expect(model.error).toBe("");
    expect(model.details).toEqual(details);
  });

  it("ignores an older response after another column is opened", async () => {
    const { model, getColumnOptionSet, column } = setup();
    let resolveFirst!: (result: OptionSetDetails) => void;
    getColumnOptionSet.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ...details, name: "new_choice" });
    const first = model.open("account", column);
    const next = Object.assign(new ColumnMeta(), { columnName: "new_choice" });
    await model.open("account", next);
    resolveFirst(details);
    await first;
    expect(model.column?.columnName).toBe("new_choice");
    expect(model.details?.name).toBe("new_choice");
  });

  it.each([false, true])("ignores a pending request after closing (failure=%s)", async (fail) => {
    const { model, getColumnOptionSet, notify, column } = setup();
    let finish!: () => void;
    getColumnOptionSet.mockImplementationOnce(() => new Promise((resolve, reject) => {
      finish = () => fail ? reject(new Error("Old error")) : resolve(details);
    }));
    const request = model.open("account", column);
    model.close();
    finish();
    await request;
    expect(model.column).toBeUndefined();
    expect(model.details).toBeUndefined();
    expect(model.error).toBe("");
    expect(model.loading).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });

  it("restores loading state and propagates a failed host notification", async () => {
    const { model, getColumnOptionSet, notify, column } = setup();
    getColumnOptionSet.mockRejectedValue(new Error("Read failed"));
    notify.mockRejectedValue(new Error("Host unavailable"));
    await expect(model.open("account", column)).rejects.toThrow("Host unavailable");
    expect(model.loading).toBe(false);
    expect(model.error).toContain("Unable to load option details");
  });
});
