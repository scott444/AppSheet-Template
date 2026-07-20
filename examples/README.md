# Example Equipment Lists (EQL)

Sample `.xlsx` files for testing the **New Project** upload flow in the Apps Script
web app. Every file uses MSI's report-export schema — a single sheet named `EQL`
with the 45-column header row defined by `DEFAULT_COLUMN_CONFIG_.keyColumns` in
[`appscript/src/ProjectManager.js`](../appscript/src/ProjectManager.js). `NOMENCLATURE`
is the item key; **main line items** carry `LIM` + `O` values, and component
sub-items leave them blank.

## Files

| File | Rows × Cols | Purpose |
| --- | --- | --- |
| `example-eql.xlsx` | 11 × 45 | Small, clean, realistic list — the happy path. |
| `example-eql-large.xlsx` | 400 × 45 | Bulk data (40 racks × 6–12 components) for pagination / performance and Power Tables rack assignment. |
| `example-eql-messy.xlsx` | 13 × 48 | Deliberate edge cases for validation / robustness testing. |

### `example-eql.xlsx`
Two racks plus shared facility power: 6 main line items and 5 sub-items across
`RACK A` / `RACK B` / `FACILITY` (`ORGANIZER 1`), with realistic `EXT LIST`
prices (the configured `priceColumn`), `QTY`, `FAMILY GROUP`, and `PRODUCT STATUS`
(including one `END OF LIFE` + `OPTIONAL=Y` line). Use this to verify normal
project creation.

### `example-eql-large.xlsx`
40 racks, each a main line item (`CHASSIS-RACK-NN`) followed by 6–12 component
rows, for ~400 rows total. Exercises the EQL preview/pagination, upload payload
size, and the per-rack grouping used by Power Tables.

### `example-eql-messy.xlsx`
Intentionally malformed — **do not** use this to validate a "correct" import.
Each row targets a specific edge case:

- Blank `NOMENCLATURE` (missing item key)
- Duplicate `NOMENCLATURE` (`SRV-2U-G5` appears twice)
- Whitespace-padded key and values (`  MEM-32G-DDR5  `)
- Non-numeric `QTY` (`"two"`) and prices with currency formatting (`$82,000.00`)
- Negative and zero quantities
- Three extra, unmapped columns (`UNMAPPED COLUMN`, `Notes`, `Rack U`) — the
  parsed row set is 48 columns wide as a result
- `LIM` set but `O` blank (half-configured main line item)
- Unicode / emoji / quotes / `<tags>` in text fields
- A very long description
- A fully blank row
- Numbers stored as strings vs. real numbers for the same value

## Regenerating

All three files are produced by one script (requires the repo's `xlsx`
dependency, so run `npm install` first if needed):

```bash
node examples/generate-example-eql.cjs
```

Edit [`generate-example-eql.cjs`](./generate-example-eql.cjs) to change the data —
`buildSmall()`, `buildLarge()`, and `buildMessy()` produce the three workbooks.
The header order comes from the `COLUMNS` array, which must stay in sync with
`DEFAULT_COLUMN_CONFIG_.keyColumns`.
