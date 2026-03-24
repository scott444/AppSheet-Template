/**
 * Types for AppSheet app definitions.
 * Used locally to define, validate, and generate app configurations.
 */

export interface AppDefinition {
  appName: string;
  description?: string;
  tables: TableDefinition[];
  slices?: SliceDefinition[];
  views?: ViewDefinition[];
  actions?: ActionDefinition[];
  automations?: AutomationDefinition[];
  settings?: AppSettings;
  security?: SecuritySettings;
  formatting?: FormattingRule[];
}

export interface TableDefinition {
  name: string;
  sheetName?: string;
  columns: ColumnDefinition[];
  label?: string;
  description?: string;
}

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  key?: boolean;
  label?: string;
  description?: string;
  formula?: string;
  initialValue?: string;
  required?: boolean;
  editable?: boolean;
  show?: boolean;
  validIf?: string;
  enumValues?: string[];
  refTable?: string;
  displayFormat?: string;
}

export type ColumnType =
  | "Text"
  | "LongText"
  | "Name"
  | "Email"
  | "Phone"
  | "Url"
  | "Number"
  | "Decimal"
  | "Price"
  | "Percent"
  | "Date"
  | "DateTime"
  | "Time"
  | "Duration"
  | "Enum"
  | "EnumList"
  | "Yes/No"
  | "Color"
  | "Image"
  | "File"
  | "Drawing"
  | "Signature"
  | "LatLong"
  | "Address"
  | "Ref"
  | "List"
  | "ChangeCounter"
  | "ChangeLocation"
  | "ChangeTimestamp";

export interface SliceDefinition {
  name: string;
  sourceTable: string;
  rowFilter?: string;
  columns?: string[];
  description?: string;
}

export interface ViewDefinition {
  name: string;
  type: ViewType;
  table?: string;
  slice?: string;
  columns?: string[];
  sortBy?: string;
  groupBy?: string;
  filter?: string;
  displayName?: string;
  icon?: string;
}

export type ViewType =
  | "table"
  | "deck"
  | "detail"
  | "form"
  | "map"
  | "chart"
  | "calendar"
  | "gallery"
  | "dashboard"
  | "onboarding";

export interface ActionDefinition {
  name: string;
  type: string;
  table?: string;
  formula?: string;
  description?: string;
  prominence?: string;
  condition?: string;
}

export interface AutomationDefinition {
  name: string;
  event: AutomationEvent;
  process: AutomationStep[];
  enabled?: boolean;
  description?: string;
}

export interface AutomationEvent {
  type: "DataChange" | "Schedule" | "FormSubmit";
  table?: string;
  condition?: string;
  schedule?: string;
}

export interface AutomationStep {
  type: "SendEmail" | "SendNotification" | "CallWebhook" | "RunScript" | "CreateFile" | "Branch" | "Wait";
  config: Record<string, unknown>;
}

export interface AppSettings {
  appName?: string;
  icon?: string;
  primaryColor?: string;
  startView?: string;
  offlineMode?: boolean;
  updateMode?: string;
  syncInterval?: number;
}

export interface SecuritySettings {
  requireSignIn?: boolean;
  authProvider?: string;
  domainRestriction?: string[];
  securityFilters?: SecurityFilter[];
  defaultAccess?: string;
}

export interface SecurityFilter {
  table: string;
  filter: string;
  description?: string;
}

export interface FormattingRule {
  name: string;
  table?: string;
  column?: string;
  condition?: string;
  icon?: string;
  highlightColor?: string;
  textColor?: string;
}

/** Schema definition for generating Google Sheets */
export interface SheetSchema {
  spreadsheetName: string;
  sheets: SheetDef[];
}

export interface SheetDef {
  name: string;
  headers: string[];
  columnTypes?: SheetColumnType[];
  sampleRows?: Record<string, unknown>[];
}

export interface SheetColumnType {
  format?: string;
  validation?: "dropdown" | "checkbox";
  values?: string[];
}
