import { makeAutoObservable, runInAction } from "mobx";
import type { ColumnMeta } from "./columnMeta";

export type OptionSetAttributeType =
  | "PicklistAttributeMetadata"
  | "MultiSelectPicklistAttributeMetadata"
  | "BooleanAttributeMetadata"
  | "StateAttributeMetadata"
  | "StatusAttributeMetadata";

export function getOptionSetAttributeType(type: string): OptionSetAttributeType | undefined {
  switch (type.toLowerCase().replace(/type$/, "")) {
    case "picklist": return "PicklistAttributeMetadata";
    case "multiselectpicklist": return "MultiSelectPicklistAttributeMetadata";
    case "boolean": return "BooleanAttributeMetadata";
    case "state": return "StateAttributeMetadata";
    case "status": return "StatusAttributeMetadata";
    default: return undefined;
  }
}

export interface OptionDetails {
  value: number;
  label: string;
  description: string;
  color?: string | null;
  state?: number | null;
  defaultStatus?: number | null;
  externalValue?: string | null;
}

export type AdditionalOptionField = Exclude<keyof OptionDetails, "value" | "label">;

export interface OptionSetDetails {
  name: string;
  displayName: string;
  description: string;
  isGlobal: boolean;
  options: OptionDetails[];
}

export interface OptionSetService {
  getColumnOptionSet(table: string, column: ColumnMeta, connectionTarget: number): Promise<OptionSetDetails>;
}

export interface OptionColumnPreferences {
  load(): Promise<AdditionalOptionField[]>;
  save(fields: readonly AdditionalOptionField[]): Promise<void>;
}

export class OptionSetDrawerModel {
  column: ColumnMeta | undefined;
  details: OptionSetDetails | undefined;
  loading = false;
  error = "";
  additionalFields: AdditionalOptionField[] = [];
  pendingAdditionalFields: AdditionalOptionField[] = [];
  columnPickerOpen = false;
  optionSearch = "";
  savingDefaults = false;
  private defaultsLoaded = false;
  private requestId = 0;

  constructor(
    private service: OptionSetService,
    private notify: (title: string, message: string, type: "error" | "success") => void | Promise<void>,
    private preferences: OptionColumnPreferences,
  ) {
    makeAutoObservable(this);
  }

  get filteredOptions(): OptionDetails[] {
    const options = this.details?.options ?? [];
    const search = this.optionSearch.trim().toLowerCase();
    return search
      ? options.filter((option) =>
        option.label.toLowerCase().includes(search)
        || String(option.value).includes(search)
        || option.description.toLowerCase().includes(search))
      : options;
  }

  setOptionSearch(value: string): void {
    this.optionSearch = value;
  }

  async open(table: string, column: ColumnMeta): Promise<void> {
    const requestId = ++this.requestId;
    this.column = column;
    this.details = undefined;
    this.error = "";
    this.optionSearch = "";
    this.loading = true;
    try {
      const [details, fields] = await Promise.all([
        this.service.getColumnOptionSet(table, column, column.sourceConnectionIndex ?? 0),
        this.defaultsLoaded ? Promise.resolve(this.additionalFields) : this.preferences.load(),
      ]);
      if (requestId === this.requestId) {
        runInAction(() => {
          this.details = details;
          if (!this.defaultsLoaded) {
            this.additionalFields = [...fields];
            this.defaultsLoaded = true;
          }
        });
      }
    } catch {
      if (requestId === this.requestId) {
        const message = "Unable to load option details or saved column defaults. Check the connection, settings and permissions, then retry.";
        runInAction(() => { this.error = message; });
        await this.notify("Operation failed", message, "error");
      }
    } finally {
      if (requestId === this.requestId) {
        runInAction(() => { this.loading = false; });
      }
    }
  }

  chooseColumns(): void {
    this.pendingAdditionalFields = [...this.additionalFields];
    this.columnPickerOpen = true;
  }

  setPendingAdditionalFields(fields: AdditionalOptionField[]): void {
    this.pendingAdditionalFields = fields;
  }

  applyColumns(): void {
    this.additionalFields = [...this.pendingAdditionalFields];
    this.closeColumnPicker();
  }

  async saveDefaults(): Promise<void> {
    const fields = [...this.pendingAdditionalFields];
    this.savingDefaults = true;
    try {
      await this.preferences.save(fields);
    } catch {
      await this.notify("Save Failed", "Unable to save default option columns. Review the selection and retry.", "error");
      return;
    } finally {
      runInAction(() => { this.savingDefaults = false; });
    }
    runInAction(() => {
      this.additionalFields = fields;
      this.closeColumnPicker();
    });
    await this.notify("Defaults Saved", "Default option columns have been saved.", "success");
  }

  closeColumnPicker(): void {
    this.columnPickerOpen = false;
  }

  close(): void {
    this.requestId += 1;
    this.column = undefined;
    this.details = undefined;
    this.loading = false;
    this.error = "";
    this.optionSearch = "";
    this.closeColumnPicker();
  }
}
