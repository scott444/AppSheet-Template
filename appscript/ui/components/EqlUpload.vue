<template>
  <div class="section-title">New Project</div>

  <!-- Step 1: Project details + file selection -->
  <div v-if="step === 'form'" class="card">
    <div class="card-title">Project Details</div>

    <div class="form-group">
      <label class="form-label">Customer Name</label>
      <input
        v-model="customer"
        type="text"
        class="form-input"
        placeholder="e.g. Acme Corp"
        :disabled="loading"
        @keydown.enter="focusProjectName"
      />
    </div>

    <div class="form-group">
      <label class="form-label">Project Name</label>
      <input
        ref="projectNameInput"
        v-model="projectName"
        type="text"
        class="form-input"
        placeholder="e.g. Warehouse Upgrade"
        :disabled="loading"
      />
    </div>

    <div class="form-group">
      <label class="form-label">Equipment List (XLSX)</label>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls"
        class="form-input"
        :disabled="loading"
        @change="onFileSelected"
      />
      <div v-if="parseError" class="result-box error" style="display:block;margin-top:8px">{{ parseError }}</div>
    </div>

    <div class="btn-row" style="margin-top:16px">
      <button class="btn" :disabled="loading || !canPreview" @click="parseFile">
        <span class="icon">{{ loading ? 'hourglass_empty' : 'preview' }}</span>
        {{ loading ? 'Parsing...' : 'Preview EQL' }}
      </button>
      <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" @click="$emit('navigate', 'projects')">
        Cancel
      </button>
    </div>
  </div>

  <!-- Step 2: Preview parsed rows -->
  <div v-if="step === 'preview'" class="card">
    <div class="card-title">Preview — {{ parsedRows.length }} items found</div>
    <p style="color:var(--text-muted);margin-bottom:12px;font-size:13px">
      Showing first {{ previewRows.length }} of {{ parsedRows.length }} rows.
      Column headers are taken directly from the XLSX first row.
    </p>

    <div style="overflow-x:auto">
      <table class="sheets-table">
        <thead>
          <tr>
            <th v-for="col in previewColumns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in previewRows" :key="i">
            <td v-for="col in previewColumns" :key="col">{{ row[col] }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="error" class="result-box error" style="display:block;margin-top:12px">{{ error }}</div>

    <div class="btn-row" style="margin-top:16px">
      <button class="btn" :disabled="loading" @click="upload">
        <span class="icon">{{ loading ? 'hourglass_empty' : 'cloud_upload' }}</span>
        {{ loading ? 'Creating project...' : 'Create Project' }}
      </button>
      <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" :disabled="loading" @click="step = 'form'">
        Back
      </button>
    </div>
  </div>

  <!-- Step 3: Success -->
  <div v-if="step === 'success'" class="card">
    <div class="card-title">
      <span class="icon" style="font-family:'Material Symbols Rounded';font-size:18px;vertical-align:middle;margin-right:6px;color:var(--success-text)">check_circle</span>
      Project Created
    </div>
    <p style="color:var(--text-muted);margin-bottom:16px">
      <strong>{{ customer }}</strong> / <strong>{{ projectName }}</strong> has been created with {{ parsedRows.length }} equipment items.
    </p>
    <div class="btn-row">
      <button class="btn" @click="$emit('open-project', createdProjectId)">
        <span class="icon">folder_open</span> Open Project
      </button>
      <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" @click="reset">
        Upload Another
      </button>
    </div>
  </div>
</template>

<script>
import * as XLSX from 'xlsx';

const PREVIEW_LIMIT = 5;
const EQL_COLUMNS = [
  'OPT','COF','DS','CUST REF','ORGANIZER 1','ORGANIZER 2','SUB SYS ID',
  'ORGANIZER 3','ORGANIZER 4','LIST ID','LIM','O','APC','QTY','NOMENCLATURE',
  'DESCRIPTION','UNIT LIST','EXT LIST','TOTAL QTY','EXT EXCHANGE RATE',
  'EXT STAGING','EXT FIELD','EXT DROPSHIP','CUSTOMER DISCOUNT (%)','UNIT CUSTOMER DISCOUNT',
  'EXT CUSTOMER DISCOUNT','FAMILY GROUP','PRODUCT STATUS','PRODUCT STATUS REFRESH DATE',
  'CFG','LOCATION','OPTIONAL','ORGANIZER 5','ORGANIZER 6','ORGANIZER 7','ORGANIZER 8',
  'EID','PID','TERM','CURRENCY','DESIGN QUOTE','REPORT RUN DATE','SORT ORDER',
  'COUNTRY OF ORIGIN','PARAMETRIC DATA'
];

export default {
  emits: ['navigate', 'open-project'],

  data() {
    return {
      step: 'form',       // form | preview | success
      customer: '',
      projectName: '',
      selectedFile: null,
      parsedRows: [],
      parseError: '',
      error: '',
      loading: false,
      createdProjectId: null,
    };
  },

  computed: {
    canPreview() {
      return this.customer.trim() && this.projectName.trim() && this.selectedFile;
    },
    previewColumns() {
      if (!this.parsedRows.length) return [];
      // Show key columns first, then any extras
      var rowKeys = Object.keys(this.parsedRows[0]);
      var ordered = EQL_COLUMNS.filter(function(c) { return rowKeys.indexOf(c) !== -1; });
      var extras = rowKeys.filter(function(c) { return EQL_COLUMNS.indexOf(c) === -1; });
      return ordered.concat(extras).slice(0, 10); // cap at 10 cols in preview
    },
    previewRows() {
      return this.parsedRows.slice(0, PREVIEW_LIMIT);
    },
  },

  methods: {
    focusProjectName() {
      this.$refs.projectNameInput && this.$refs.projectNameInput.focus();
    },

    onFileSelected(event) {
      this.selectedFile = event.target.files[0] || null;
      this.parseError = '';
      this.parsedRows = [];
    },

    parseFile() {
      if (!this.canPreview) return;
      if (!this.selectedFile) return;

      var ext = this.selectedFile.name.split('.').pop().toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        this.parseError = 'Please select an .xlsx or .xls file.';
        return;
      }

      this.loading = true;
      this.parseError = '';

      var self = this;
      var reader = new FileReader();

      reader.onload = function(e) {
        try {
          var data = new Uint8Array(e.target.result);
          var workbook = XLSX.read(data, { type: 'array' });
          var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          var rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

          if (rows.length === 0) {
            self.parseError = 'No equipment items found in this file. Check that the first sheet has data rows below a header row.';
            self.loading = false;
            return;
          }

          self.parsedRows = rows;
          self.step = 'preview';
        } catch (err) {
          self.parseError = 'Could not parse file: ' + (err.message || String(err));
        }
        self.loading = false;
      };

      reader.onerror = function() {
        self.parseError = 'Could not read file.';
        self.loading = false;
      };

      reader.readAsArrayBuffer(this.selectedFile);
    },

    upload() {
      this.loading = true;
      this.error = '';

      // Guard against exceeding google.script.run ~10MB payload limit
      var payloadSize = JSON.stringify(this.parsedRows).length;
      if (payloadSize > 8 * 1024 * 1024) {
        this.error = 'Equipment list is too large (' + Math.round(payloadSize / 1024 / 1024) + ' MB). Maximum is ~8 MB.';
        this.loading = false;
        return;
      }

      var self = this;
      google.script.run
        .withSuccessHandler(function(result) {
          self.createdProjectId = result.id;
          self.step = 'success';
          self.loading = false;
        })
        .withFailureHandler(function(err) {
          self.error = err.message || String(err);
          self.loading = false;
        })
        .createProject(this.customer.trim(), this.projectName.trim(), this.parsedRows);
    },

    reset() {
      this.step = 'form';
      this.customer = '';
      this.projectName = '';
      this.selectedFile = null;
      this.parsedRows = [];
      this.parseError = '';
      this.error = '';
      this.createdProjectId = null;
      if (this.$refs.fileInput) this.$refs.fileInput.value = '';
    },
  },
};
</script>
