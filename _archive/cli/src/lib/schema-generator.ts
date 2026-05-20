import type { AppDefinition, SheetSchema, SheetColumnType } from "../types/appsheet.js";

/** Column type → Google Sheets number format mapping */
const TYPE_FORMATS: Record<string, string> = {
  Price: "$#,##0.00",
  Percent: "0.00%",
  Number: "#,##0",
  Decimal: "#,##0.00",
  Date: "yyyy-mm-dd",
  DateTime: "yyyy-mm-dd hh:mm:ss",
  Time: "hh:mm:ss",
};

/**
 * Generate a Google Sheets schema from an AppSheet app definition.
 * This creates the sheet structure needed as a data source for AppSheet.
 */
export function generateSheetSchema(appDef: AppDefinition): SheetSchema {
  return {
    spreadsheetName: appDef.appName,
    sheets: appDef.tables.map((table) => {
      const headers = table.columns
        .filter((col) => !isComputedColumn(col.type))
        .map((col) => col.name);

      const columnTypes: SheetColumnType[] = table.columns
        .filter((col) => !isComputedColumn(col.type))
        .map((col) => {
          const ct: SheetColumnType = {};

          if (TYPE_FORMATS[col.type]) {
            ct.format = TYPE_FORMATS[col.type];
          }

          if (col.type === "Enum" && col.enumValues) {
            ct.validation = "dropdown";
            ct.values = col.enumValues;
          }

          if (col.type === "Yes/No") {
            ct.validation = "checkbox";
          }

          return ct;
        });

      return {
        name: table.sheetName ?? table.name,
        headers,
        columnTypes,
      };
    }),
  };
}

/**
 * Computed/virtual column types that don't need a sheet column.
 * These are calculated by AppSheet, not stored in the sheet.
 */
function isComputedColumn(type: string): boolean {
  return ["ChangeCounter", "ChangeLocation", "ChangeTimestamp"].includes(type);
}
