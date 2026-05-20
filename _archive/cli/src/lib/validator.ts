import type { AppDefinition } from "../types/appsheet.js";

interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validate an AppSheet app definition for common errors.
 * Catches issues before you configure the app in the AppSheet editor.
 */
export function validateAppDefinition(app: AppDefinition): ValidationError[] {
  const errors: ValidationError[] = [];
  const tableNames = new Set<string>();

  if (!app.appName) {
    errors.push({ path: "appName", message: "App name is required" });
  }

  if (!app.tables || app.tables.length === 0) {
    errors.push({ path: "tables", message: "At least one table is required" });
    return errors;
  }

  // Validate tables
  for (const table of app.tables) {
    const prefix = `tables[${table.name}]`;

    if (tableNames.has(table.name)) {
      errors.push({ path: prefix, message: `Duplicate table name: ${table.name}` });
    }
    tableNames.add(table.name);

    if (!table.columns || table.columns.length === 0) {
      errors.push({ path: `${prefix}.columns`, message: "Table must have at least one column" });
      continue;
    }

    // Check for key column
    const keyColumns = table.columns.filter((c) => c.key);
    if (keyColumns.length === 0) {
      errors.push({ path: `${prefix}.columns`, message: "Table must have at least one key column" });
    }
    if (keyColumns.length > 1) {
      errors.push({ path: `${prefix}.columns`, message: "Table should have exactly one key column" });
    }

    // Check for duplicate column names
    const colNames = new Set<string>();
    for (const col of table.columns) {
      if (colNames.has(col.name)) {
        errors.push({ path: `${prefix}.columns[${col.name}]`, message: `Duplicate column name: ${col.name}` });
      }
      colNames.add(col.name);

      // Validate Ref columns point to existing tables
      if (col.type === "Ref" && col.refTable && !app.tables.some((t) => t.name === col.refTable)) {
        errors.push({
          path: `${prefix}.columns[${col.name}].refTable`,
          message: `Ref target "${col.refTable}" does not match any table`,
        });
      }

      // Validate Enum columns have values
      if (col.type === "Enum" && (!col.enumValues || col.enumValues.length === 0)) {
        errors.push({
          path: `${prefix}.columns[${col.name}].enumValues`,
          message: "Enum column must have at least one value",
        });
      }
    }
  }

  // Validate views reference existing tables/slices
  if (app.views) {
    for (const view of app.views) {
      if (view.table && !tableNames.has(view.table)) {
        errors.push({
          path: `views[${view.name}].table`,
          message: `View references unknown table: ${view.table}`,
        });
      }
    }
  }

  // Validate actions reference existing tables
  if (app.actions) {
    for (const action of app.actions) {
      if (action.table && !tableNames.has(action.table)) {
        errors.push({
          path: `actions[${action.name}].table`,
          message: `Action references unknown table: ${action.table}`,
        });
      }
    }
  }

  // Validate automations reference existing tables
  if (app.automations) {
    for (const auto of app.automations) {
      if (auto.event.table && !tableNames.has(auto.event.table)) {
        errors.push({
          path: `automations[${auto.name}].event.table`,
          message: `Automation references unknown table: ${auto.event.table}`,
        });
      }
    }
  }

  // Validate settings.startView references existing view
  if (app.settings?.startView && app.views) {
    if (!app.views.some((v) => v.name === app.settings!.startView)) {
      errors.push({
        path: "settings.startView",
        message: `Start view "${app.settings.startView}" does not match any view`,
      });
    }
  }

  return errors;
}
