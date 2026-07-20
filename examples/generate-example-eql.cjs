/**
 * Generates example Equipment List (EQL) workbooks for testing the
 * "New Project" upload flow:
 *
 *   example-eql.xlsx        — small, clean, realistic (11 rows)
 *   example-eql-large.xlsx  — bulk data (400 rows) for pagination/perf testing
 *   example-eql-messy.xlsx  — intentional edge cases for validation/robustness
 *
 * The header row matches DEFAULT_COLUMN_CONFIG_.keyColumns in
 * appscript/src/ProjectManager.js (MSI's report-export schema). NOMENCLATURE is
 * the item key; main line items carry LIM + O values, sub-items leave them blank.
 *
 *   node examples/generate-example-eql.cjs
 */
const path = require('path');
const XLSX = require('xlsx');

const COLUMNS = [
  'OPT','COF','DS','CUST REF','ORGANIZER 1','ORGANIZER 2','SUB SYS ID','ORGANIZER 3',
  'ORGANIZER 4','LIST ID','LIM','O','APC','QTY','NOMENCLATURE','DESCRIPTION','UNIT LIST',
  'EXT LIST','TOTAL QTY','EXT EXCHANGE RATE','EXT STAGING','EXT FIELD','EXT DROPSHIP',
  'CUSTOMER DISCOUNT (%)','UNIT CUSTOMER DISCOUNT','EXT CUSTOMER DISCOUNT','FAMILY GROUP',
  'PRODUCT STATUS','PRODUCT STATUS REFRESH DATE','CFG','LOCATION','OPTIONAL','ORGANIZER 5',
  'ORGANIZER 6','ORGANIZER 7','ORGANIZER 8','EID','PID','TERM','CURRENCY','DESIGN QUOTE',
  'REPORT RUN DATE','SORT ORDER','COUNTRY OF ORIGIN','PARAMETRIC DATA'
];

const RUN_DATE = '2026-07-20';
const QUOTE = 'DQ-2026-0042';

// Build a row from a sparse object, defaulting every known column to ''.
function makeRowFactory() {
  let sortOrder = 0;
  return function row(values) {
    sortOrder += 10;
    const r = {};
    for (const c of COLUMNS) r[c] = '';
    r['CUST REF'] = 'Contoso DC-West';
    r['CURRENCY'] = 'USD';
    r['DESIGN QUOTE'] = QUOTE;
    r['REPORT RUN DATE'] = RUN_DATE;
    r['SORT ORDER'] = sortOrder;
    r['COUNTRY OF ORIGIN'] = 'USA';
    Object.assign(r, values);
    return r;
  };
}

function writeWorkbook(fileName, rows) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLUMNS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'EQL');
  const out = path.join(__dirname, fileName);
  XLSX.writeFile(wb, out);
  const cols = rows.length ? Object.keys(rows[0]).length : COLUMNS.length;
  console.log('Wrote ' + out + ' (' + rows.length + ' rows, ' + cols + ' columns)');
}

// ── 1. Small, clean, realistic list ─────────────────────────────────────────
function buildSmall() {
  const row = makeRowFactory();
  return [
    // Rack A: Core network
    row({ 'ORGANIZER 1':'RACK A', 'ORGANIZER 2':'CORE NETWORK', 'SUB SYS ID':'A-01',
          'LIM':'A1', 'O':'0', 'APC':'APC-4200', 'QTY':2, 'NOMENCLATURE':'NX-9500-SUP',
          'DESCRIPTION':'NX-9500 Supervisor Engine, dual', 'UNIT LIST':18500, 'EXT LIST':37000,
          'TOTAL QTY':2, 'FAMILY GROUP':'NETWORK SWITCHING', 'PRODUCT STATUS':'ACTIVE',
          'LOCATION':'DC-WEST', 'CFG':'RACK-A' }),
    row({ 'ORGANIZER 1':'RACK A', 'ORGANIZER 2':'CORE NETWORK', 'SUB SYS ID':'A-01',
          'QTY':4, 'NOMENCLATURE':'NX-9500-LC48', 'DESCRIPTION':'48-port 25G line card',
          'UNIT LIST':9200, 'EXT LIST':36800, 'TOTAL QTY':4, 'FAMILY GROUP':'NETWORK SWITCHING',
          'PRODUCT STATUS':'ACTIVE', 'LOCATION':'DC-WEST', 'CFG':'RACK-A' }),
    row({ 'ORGANIZER 1':'RACK A', 'ORGANIZER 2':'CORE NETWORK', 'SUB SYS ID':'A-01',
          'QTY':2, 'NOMENCLATURE':'NX-PSU-3000W', 'DESCRIPTION':'3000W AC power supply',
          'UNIT LIST':1400, 'EXT LIST':2800, 'TOTAL QTY':2, 'FAMILY GROUP':'POWER',
          'PRODUCT STATUS':'ACTIVE', 'LOCATION':'DC-WEST', 'CFG':'RACK-A' }),
    row({ 'ORGANIZER 1':'RACK A', 'ORGANIZER 2':'CORE NETWORK', 'SUB SYS ID':'A-02',
          'LIM':'A2', 'O':'0', 'APC':'APC-4210', 'QTY':1, 'NOMENCLATURE':'FW-8300-HA',
          'DESCRIPTION':'FW-8300 firewall, HA pair', 'UNIT LIST':24500, 'EXT LIST':24500,
          'TOTAL QTY':1, 'FAMILY GROUP':'SECURITY', 'PRODUCT STATUS':'ACTIVE',
          'LOCATION':'DC-WEST', 'CFG':'RACK-A' }),
    // Rack B: Compute + storage
    row({ 'ORGANIZER 1':'RACK B', 'ORGANIZER 2':'COMPUTE', 'SUB SYS ID':'B-01',
          'LIM':'B1', 'O':'0', 'APC':'APC-5100', 'QTY':8, 'NOMENCLATURE':'SRV-2U-G5',
          'DESCRIPTION':'2U rack server, Gen5, 2x CPU', 'UNIT LIST':7600, 'EXT LIST':60800,
          'TOTAL QTY':8, 'FAMILY GROUP':'COMPUTE', 'PRODUCT STATUS':'ACTIVE',
          'LOCATION':'DC-WEST', 'CFG':'RACK-B' }),
    row({ 'ORGANIZER 1':'RACK B', 'ORGANIZER 2':'COMPUTE', 'SUB SYS ID':'B-01',
          'QTY':64, 'NOMENCLATURE':'MEM-32G-DDR5', 'DESCRIPTION':'32GB DDR5 RDIMM',
          'UNIT LIST':210, 'EXT LIST':13440, 'TOTAL QTY':64, 'FAMILY GROUP':'COMPUTE',
          'PRODUCT STATUS':'ACTIVE', 'LOCATION':'DC-WEST', 'CFG':'RACK-B' }),
    row({ 'ORGANIZER 1':'RACK B', 'ORGANIZER 2':'STORAGE', 'SUB SYS ID':'B-02',
          'LIM':'B2', 'O':'0', 'APC':'APC-5300', 'QTY':2, 'NOMENCLATURE':'STG-AFA-24',
          'DESCRIPTION':'All-flash array, 24-bay', 'UNIT LIST':41000, 'EXT LIST':82000,
          'TOTAL QTY':2, 'FAMILY GROUP':'STORAGE', 'PRODUCT STATUS':'ACTIVE',
          'LOCATION':'DC-WEST', 'CFG':'RACK-B' }),
    row({ 'ORGANIZER 1':'RACK B', 'ORGANIZER 2':'STORAGE', 'SUB SYS ID':'B-02',
          'QTY':48, 'NOMENCLATURE':'SSD-3.84T-NVME', 'DESCRIPTION':'3.84TB NVMe SSD',
          'UNIT LIST':690, 'EXT LIST':33120, 'TOTAL QTY':48, 'FAMILY GROUP':'STORAGE',
          'PRODUCT STATUS':'ACTIVE', 'LOCATION':'DC-WEST', 'CFG':'RACK-B' }),
    // Shared power / PDU
    row({ 'ORGANIZER 1':'FACILITY', 'ORGANIZER 2':'POWER', 'SUB SYS ID':'P-01',
          'LIM':'P1', 'O':'0', 'APC':'APC-7000', 'QTY':4, 'NOMENCLATURE':'PDU-30A-3PH',
          'DESCRIPTION':'30A 3-phase metered PDU', 'UNIT LIST':1250, 'EXT LIST':5000,
          'TOTAL QTY':4, 'FAMILY GROUP':'POWER', 'PRODUCT STATUS':'ACTIVE',
          'LOCATION':'DC-WEST', 'CFG':'FACILITY' }),
    row({ 'ORGANIZER 1':'FACILITY', 'ORGANIZER 2':'POWER', 'SUB SYS ID':'P-01',
          'LIM':'P2', 'O':'0', 'APC':'APC-7100', 'QTY':1, 'NOMENCLATURE':'UPS-20KVA',
          'DESCRIPTION':'20kVA online UPS', 'UNIT LIST':11800, 'EXT LIST':11800,
          'TOTAL QTY':1, 'FAMILY GROUP':'POWER', 'PRODUCT STATUS':'ACTIVE',
          'LOCATION':'DC-WEST', 'CFG':'FACILITY' }),
    row({ 'ORGANIZER 1':'FACILITY', 'ORGANIZER 2':'POWER', 'SUB SYS ID':'P-01',
          'QTY':2, 'NOMENCLATURE':'UPS-BATT-EXT', 'DESCRIPTION':'Extended battery module',
          'UNIT LIST':2600, 'EXT LIST':5200, 'TOTAL QTY':2, 'FAMILY GROUP':'POWER',
          'PRODUCT STATUS':'END OF LIFE', 'OPTIONAL':'Y', 'LOCATION':'DC-WEST', 'CFG':'FACILITY' }),
  ];
}

// ── 2. Large list — many racks, each a main line item + several components ──
function buildLarge() {
  const row = makeRowFactory();
  const rows = [];
  const families = ['COMPUTE','STORAGE','NETWORK SWITCHING','POWER','SECURITY'];
  const statuses = ['ACTIVE','ACTIVE','ACTIVE','END OF LIFE']; // mostly active
  const RACKS = 40;         // 40 racks
  const COMPONENTS = 12;    // + 6..12 components each → 400 rows total

  for (let rk = 1; rk <= RACKS; rk++) {
    const rackId = 'RACK-' + String(rk).padStart(2, '0');
    const org1 = 'RACK ' + String(rk).padStart(2, '0');
    const fam = families[rk % families.length];

    // Main line item for the rack
    rows.push(row({
      'ORGANIZER 1':org1, 'ORGANIZER 2':fam, 'SUB SYS ID':rackId + '-00',
      'LIM':'L' + rk, 'O':'0', 'APC':'APC-' + (4000 + rk), 'QTY':1,
      'NOMENCLATURE':'CHASSIS-' + rackId, 'DESCRIPTION':'Rack chassis ' + rackId + ' (' + fam + ')',
      'UNIT LIST':5000 + rk * 25, 'EXT LIST':5000 + rk * 25, 'TOTAL QTY':1,
      'FAMILY GROUP':fam, 'PRODUCT STATUS':'ACTIVE', 'LOCATION':'DC-WEST', 'CFG':rackId,
    }));

    const compCount = 6 + (rk % (COMPONENTS - 5)); // 6..12 components
    for (let c = 1; c <= compCount; c++) {
      const qty = 1 + ((rk + c) % 24);
      const unit = 100 + ((rk * c * 7) % 900);
      rows.push(row({
        'ORGANIZER 1':org1, 'ORGANIZER 2':fam, 'SUB SYS ID':rackId + '-' + String(c).padStart(2, '0'),
        'QTY':qty, 'NOMENCLATURE':'ITEM-' + rackId + '-' + String(c).padStart(2, '0'),
        'DESCRIPTION':fam + ' component ' + c + ' for ' + rackId,
        'UNIT LIST':unit, 'EXT LIST':unit * qty, 'TOTAL QTY':qty,
        'FAMILY GROUP':fam, 'PRODUCT STATUS':statuses[(rk + c) % statuses.length],
        'OPTIONAL':(c % 5 === 0) ? 'Y' : '', 'LOCATION':'DC-WEST', 'CFG':rackId,
      }));
    }
  }
  return rows;
}

// ── 3. Messy list — deliberate edge cases for validation/robustness ─────────
// Uses raw objects (NOT the row factory) so columns can be missing, extra,
// mis-typed, or blank on purpose. sheet_to_json({defval:''}) fills gaps.
function buildMessy() {
  return [
    // Valid baseline main line item.
    { 'ORGANIZER 1':'RACK A', 'ORGANIZER 2':'COMPUTE', 'LIM':'A1', 'O':'0', 'QTY':2,
      'NOMENCLATURE':'SRV-2U-G5', 'DESCRIPTION':'2U rack server', 'EXT LIST':15200,
      'FAMILY GROUP':'COMPUTE', 'PRODUCT STATUS':'ACTIVE' },

    // Missing NOMENCLATURE (the item key is blank).
    { 'ORGANIZER 1':'RACK A', 'LIM':'A2', 'O':'0', 'QTY':1, 'NOMENCLATURE':'',
      'DESCRIPTION':'Row with no nomenclature', 'EXT LIST':900 },

    // Duplicate NOMENCLATURE of the first row.
    { 'ORGANIZER 1':'RACK A', 'QTY':3, 'NOMENCLATURE':'SRV-2U-G5',
      'DESCRIPTION':'Duplicate key — should collide with row 1', 'EXT LIST':22800 },

    // Whitespace-padded key and values.
    { 'ORGANIZER 1':'  RACK B  ', 'QTY':'  5  ', 'NOMENCLATURE':'  MEM-32G-DDR5  ',
      'DESCRIPTION':'  Leading/trailing spaces everywhere  ', 'EXT LIST':1050 },

    // Non-numeric QTY and price with currency formatting.
    { 'ORGANIZER 1':'RACK B', 'QTY':'two', 'NOMENCLATURE':'STG-AFA-24',
      'DESCRIPTION':'Qty is text; price has $ and commas', 'UNIT LIST':'$41,000.00',
      'EXT LIST':'$82,000.00', 'FAMILY GROUP':'STORAGE' },

    // Negative and zero quantities.
    { 'ORGANIZER 1':'RACK B', 'QTY':-4, 'NOMENCLATURE':'SSD-3.84T-NVME',
      'DESCRIPTION':'Negative quantity', 'EXT LIST':-2760 },
    { 'ORGANIZER 1':'RACK B', 'QTY':0, 'NOMENCLATURE':'CBL-DAC-1M',
      'DESCRIPTION':'Zero quantity', 'EXT LIST':0 },

    // Extra unexpected columns (not in the schema) mixed with valid ones.
    { 'ORGANIZER 1':'RACK C', 'QTY':1, 'NOMENCLATURE':'PDU-30A-3PH',
      'DESCRIPTION':'Has extra columns', 'EXT LIST':1250,
      'UNMAPPED COLUMN':'ignore me', 'Notes':'free text', 'Rack U':42 },

    // Main line item marker present (LIM) but O blank — half-configured.
    { 'ORGANIZER 1':'RACK C', 'LIM':'C9', 'O':'', 'QTY':1, 'NOMENCLATURE':'FW-8300-HA',
      'DESCRIPTION':'LIM set but O blank', 'EXT LIST':24500 },

    // Unicode / special characters in text fields.
    { 'ORGANIZER 1':'RACK D — Café', 'QTY':1, 'NOMENCLATURE':'SW-µ-10G',
      'DESCRIPTION':'Ünïcödé, emoji ⚡, quotes "x" & <tags>', 'EXT LIST':3300 },

    // Very long description.
    { 'ORGANIZER 1':'RACK D', 'QTY':1, 'NOMENCLATURE':'DOC-LONGDESC',
      'DESCRIPTION':'Lorem ipsum dolor sit amet, '.repeat(40).trim(), 'EXT LIST':10 },

    // Fully blank row (all defaults) — should be treated as empty/ignored.
    { 'NOMENCLATURE':'' },

    // Numbers stored as strings vs real numbers for the same-looking value.
    { 'ORGANIZER 1':'RACK E', 'QTY':'10', 'NOMENCLATURE':'UPS-20KVA',
      'DESCRIPTION':'QTY as string "10"', 'UNIT LIST':11800, 'EXT LIST':'118000' },
  ];
}

writeWorkbook('example-eql.xlsx', buildSmall());
writeWorkbook('example-eql-large.xlsx', buildLarge());
writeWorkbook('example-eql-messy.xlsx', buildMessy());
