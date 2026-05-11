<template>
  <div>
    <div class="section-title">Power Tables</div>
    <p style="color:var(--text-muted);font-size:13px;margin-top:-12px;margin-bottom:20px">
      Universal Mapping and Equipment table versions — shared across all projects.
    </p>

    <!-- ── Mapping Tables ──────────────────────────────────────── -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <div class="card-title" style="margin-bottom:2px">Mapping Tables</div>
          <div style="font-size:12px;color:var(--text-muted)">Required columns: LIM, O, Multiple, Description, Manufacturer, Model</div>
        </div>
        <button class="btn" @click="showMappingUpload = !showMappingUpload">
          <span class="icon">{{ showMappingUpload ? 'close' : 'upload_file' }}</span>
          {{ showMappingUpload ? 'Cancel' : 'Upload New Version' }}
        </button>
      </div>

      <!-- Upload form -->
      <div v-if="showMappingUpload" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:6px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:160px">
            <label class="form-label">Table Name</label>
            <input v-model="mappingUploadForm.name" type="text" class="form-input" placeholder="e.g. Standard Mapping" :disabled="mappingUploading" />
          </div>
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:120px">
            <label class="form-label">Version</label>
            <input v-model="mappingUploadForm.version" type="text" class="form-input" placeholder="e.g. 2026-Q1" :disabled="mappingUploading" />
          </div>
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
            <label class="form-label">CSV File</label>
            <input ref="mappingFileInput" type="file" accept=".csv" class="form-input" :disabled="mappingUploading" @change="onMappingFileSelected" />
          </div>
        </div>

        <div v-if="mappingUploadForm.file && !mappingParsedRows.length && !mappingParseError" style="margin-top:12px">
          <button class="btn" :disabled="mappingUploading" @click="parseMappingFile">
            <span class="icon">preview</span> Preview
          </button>
        </div>

        <div v-if="mappingParseError" class="result-box error" style="display:block;margin-top:12px">{{ mappingParseError }}</div>

        <div v-if="mappingParsedRows.length" style="margin-top:12px">
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:8px">
            Preview — {{ mappingParsedRows.length }} rows, {{ mappingParsedCols.length }} columns
          </p>
          <div style="overflow-x:auto">
            <table class="sheets-table" style="margin-top:0;font-size:12px">
              <thead><tr><th v-for="col in mappingParsedCols.slice(0,10)" :key="col">{{ col }}</th></tr></thead>
              <tbody><tr v-for="(row,i) in mappingParsedRows.slice(0,5)" :key="i"><td v-for="col in mappingParsedCols.slice(0,10)" :key="col">{{ row[col] }}</td></tr></tbody>
            </table>
          </div>
          <div class="btn-row" style="margin-top:12px">
            <button
              class="btn btn-save"
              :disabled="mappingUploading || !mappingUploadForm.name.trim() || !mappingUploadForm.version.trim()"
              @click="uploadMappingTable"
            >
              <span class="icon">{{ mappingUploading ? 'hourglass_empty' : 'cloud_upload' }}</span>
              {{ mappingUploading ? 'Uploading...' : 'Upload Table' }}
            </button>
          </div>
        </div>

        <div v-if="mappingUploadError" class="result-box error" style="display:block;margin-top:12px">{{ mappingUploadError }}</div>
      </div>

      <!-- Version list -->
      <div style="margin-top:16px">
        <div v-if="mappingLoading" style="color:var(--text-muted);font-size:13px">Loading...</div>
        <div v-else-if="mappingLoadError" class="result-box error" style="display:block">{{ mappingLoadError }}</div>
        <div v-else-if="!mappingTables.length" style="font-size:13px;color:var(--text-muted)">No mapping tables uploaded yet.</div>
        <table v-else class="sheets-table" style="margin-top:0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th style="text-align:right">Rows</th>
              <th>Created</th>
              <th style="width:80px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tbl in mappingTables" :key="tbl.id">
              <td style="font-weight:500">{{ tbl.name }}</td>
              <td>{{ tbl.version }}</td>
              <td style="text-align:right">{{ tbl.rowCount }}</td>
              <td style="color:var(--text-muted);font-size:12px">{{ formatDate(tbl.createdAt) }}</td>
              <td style="text-align:right">
                <button class="btn-danger-sm" title="Delete" @click="confirmDeleteMapping(tbl)">
                  <span class="icon" style="font-size:14px;vertical-align:middle">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mapping delete dialog -->
    <div v-if="mappingDeleteTarget" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:100;display:flex;align-items:center;justify-content:center" @click.self="mappingDeleteTarget = null">
      <div class="card" style="max-width:400px;margin:0">
        <div class="card-title">Delete Mapping Table</div>
        <p style="margin-bottom:16px">Delete <strong>{{ mappingDeleteTarget.name }}</strong> v{{ mappingDeleteTarget.version }}? This cannot be undone.</p>
        <div class="btn-row">
          <button class="btn" style="background:var(--error-text)" :disabled="mappingDeleting" @click="doDeleteMapping">
            <span class="icon">{{ mappingDeleting ? 'hourglass_empty' : 'delete' }}</span>
            {{ mappingDeleting ? 'Deleting...' : 'Delete' }}
          </button>
          <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" :disabled="mappingDeleting" @click="mappingDeleteTarget = null">Cancel</button>
        </div>
        <div v-if="mappingDeleteError" class="result-box error" style="display:block;margin-top:10px">{{ mappingDeleteError }}</div>
      </div>
    </div>

    <!-- ── Equipment Tables ────────────────────────────────────── -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <div class="card-title" style="margin-bottom:2px">Equipment Tables</div>
          <div style="font-size:12px;color:var(--text-muted)">Required columns: Manufacturer, Model (plus optional power/physical specs)</div>
        </div>
        <button class="btn" @click="showEquipmentUpload = !showEquipmentUpload">
          <span class="icon">{{ showEquipmentUpload ? 'close' : 'upload_file' }}</span>
          {{ showEquipmentUpload ? 'Cancel' : 'Upload New Version' }}
        </button>
      </div>

      <!-- Upload form -->
      <div v-if="showEquipmentUpload" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:6px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:160px">
            <label class="form-label">Table Name</label>
            <input v-model="equipmentUploadForm.name" type="text" class="form-input" placeholder="e.g. Power Specs Master" :disabled="equipmentUploading" />
          </div>
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:120px">
            <label class="form-label">Version</label>
            <input v-model="equipmentUploadForm.version" type="text" class="form-input" placeholder="e.g. 2026-Q1" :disabled="equipmentUploading" />
          </div>
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
            <label class="form-label">CSV File</label>
            <input ref="equipmentFileInput" type="file" accept=".csv" class="form-input" :disabled="equipmentUploading" @change="onEquipmentFileSelected" />
          </div>
        </div>

        <div v-if="equipmentUploadForm.file && !equipmentParsedRows.length && !equipmentParseError" style="margin-top:12px">
          <button class="btn" :disabled="equipmentUploading" @click="parseEquipmentFile">
            <span class="icon">preview</span> Preview
          </button>
        </div>

        <div v-if="equipmentParseError" class="result-box error" style="display:block;margin-top:12px">{{ equipmentParseError }}</div>

        <div v-if="equipmentParsedRows.length" style="margin-top:12px">
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:8px">
            Preview — {{ equipmentParsedRows.length }} rows, {{ equipmentParsedCols.length }} columns
          </p>
          <div style="overflow-x:auto">
            <table class="sheets-table" style="margin-top:0;font-size:12px">
              <thead><tr><th v-for="col in equipmentParsedCols.slice(0,10)" :key="col">{{ col }}</th></tr></thead>
              <tbody><tr v-for="(row,i) in equipmentParsedRows.slice(0,5)" :key="i"><td v-for="col in equipmentParsedCols.slice(0,10)" :key="col">{{ row[col] }}</td></tr></tbody>
            </table>
          </div>
          <div class="btn-row" style="margin-top:12px">
            <button
              class="btn btn-save"
              :disabled="equipmentUploading || !equipmentUploadForm.name.trim() || !equipmentUploadForm.version.trim()"
              @click="uploadEquipmentTable"
            >
              <span class="icon">{{ equipmentUploading ? 'hourglass_empty' : 'cloud_upload' }}</span>
              {{ equipmentUploading ? 'Uploading...' : 'Upload Table' }}
            </button>
          </div>
        </div>

        <div v-if="equipmentUploadError" class="result-box error" style="display:block;margin-top:12px">{{ equipmentUploadError }}</div>
      </div>

      <!-- Version list -->
      <div style="margin-top:16px">
        <div v-if="equipmentLoading" style="color:var(--text-muted);font-size:13px">Loading...</div>
        <div v-else-if="equipmentLoadError" class="result-box error" style="display:block">{{ equipmentLoadError }}</div>
        <div v-else-if="!equipmentTables.length" style="font-size:13px;color:var(--text-muted)">No equipment tables uploaded yet.</div>
        <table v-else class="sheets-table" style="margin-top:0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th style="text-align:right">Rows</th>
              <th>Created</th>
              <th style="width:80px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tbl in equipmentTables" :key="tbl.id">
              <td style="font-weight:500">{{ tbl.name }}</td>
              <td>{{ tbl.version }}</td>
              <td style="text-align:right">{{ tbl.rowCount }}</td>
              <td style="color:var(--text-muted);font-size:12px">{{ formatDate(tbl.createdAt) }}</td>
              <td style="text-align:right">
                <button class="btn-danger-sm" title="Delete" @click="confirmDeleteEquipment(tbl)">
                  <span class="icon" style="font-size:14px;vertical-align:middle">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Equipment delete dialog -->
    <div v-if="equipmentDeleteTarget" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:100;display:flex;align-items:center;justify-content:center" @click.self="equipmentDeleteTarget = null">
      <div class="card" style="max-width:400px;margin:0">
        <div class="card-title">Delete Equipment Table</div>
        <p style="margin-bottom:16px">Delete <strong>{{ equipmentDeleteTarget.name }}</strong> v{{ equipmentDeleteTarget.version }}? This cannot be undone.</p>
        <div class="btn-row">
          <button class="btn" style="background:var(--error-text)" :disabled="equipmentDeleting" @click="doDeleteEquipment">
            <span class="icon">{{ equipmentDeleting ? 'hourglass_empty' : 'delete' }}</span>
            {{ equipmentDeleting ? 'Deleting...' : 'Delete' }}
          </button>
          <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" :disabled="equipmentDeleting" @click="equipmentDeleteTarget = null">Cancel</button>
        </div>
        <div v-if="equipmentDeleteError" class="result-box error" style="display:block;margin-top:10px">{{ equipmentDeleteError }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import Papa from 'papaparse';

export default {
  data() {
    return {
      // ── Mapping tables
      mappingTables: [],
      mappingLoading: false,
      mappingLoadError: '',
      showMappingUpload: false,
      mappingUploadForm: { name: '', version: '', file: null },
      mappingParsedRows: [],
      mappingParsedCols: [],
      mappingParseError: '',
      mappingUploading: false,
      mappingUploadError: '',
      mappingDeleteTarget: null,
      mappingDeleting: false,
      mappingDeleteError: '',

      // ── Equipment tables
      equipmentTables: [],
      equipmentLoading: false,
      equipmentLoadError: '',
      showEquipmentUpload: false,
      equipmentUploadForm: { name: '', version: '', file: null },
      equipmentParsedRows: [],
      equipmentParsedCols: [],
      equipmentParseError: '',
      equipmentUploading: false,
      equipmentUploadError: '',
      equipmentDeleteTarget: null,
      equipmentDeleting: false,
      equipmentDeleteError: '',
    };
  },

  mounted() {
    this.loadMappingTables();
    this.loadEquipmentTables();
  },

  methods: {
    // ── Mapping table methods ────────────────────────────────────────────────

    loadMappingTables() {
      this.mappingLoading = true;
      this.mappingLoadError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function(list) {
          self.mappingTables = list || [];
          self.mappingLoading = false;
        })
        .withFailureHandler(function(err) {
          self.mappingLoadError = err.message || String(err);
          self.mappingLoading = false;
        })
        .listPowerMappingTables();
    },

    onMappingFileSelected(event) {
      this.mappingUploadForm.file = event.target.files[0] || null;
      this.mappingParsedRows = [];
      this.mappingParsedCols = [];
      this.mappingParseError = '';
      this.mappingUploadError = '';
    },

    parseMappingFile() {
      if (!this.mappingUploadForm.file) return;
      var self = this;
      this.mappingParseError = '';
      Papa.parse(this.mappingUploadForm.file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.errors.length > 0) {
            self.mappingParseError = 'CSV parse error: ' + results.errors[0].message;
            return;
          }
          if (!results.data || results.data.length === 0) {
            self.mappingParseError = 'No data rows found in this CSV.';
            return;
          }
          var cols = results.meta.fields || Object.keys(results.data[0]);
          var required = ['LIM', 'O', 'Manufacturer', 'Model'];
          for (var i = 0; i < required.length; i++) {
            if (cols.indexOf(required[i]) === -1) {
              self.mappingParseError = 'CSV must have a "' + required[i] + '" column.';
              return;
            }
          }
          self.mappingParsedCols = cols;
          self.mappingParsedRows = results.data;
        },
        error: function(err) {
          self.mappingParseError = 'Could not parse file: ' + (err.message || String(err));
        },
      });
    },

    uploadMappingTable() {
      if (!this.mappingUploadForm.name.trim() || !this.mappingUploadForm.version.trim() || !this.mappingParsedRows.length) return;
      var payloadSize = JSON.stringify(this.mappingParsedRows).length;
      if (payloadSize > 8 * 1024 * 1024) {
        this.mappingUploadError = 'Table is too large (' + Math.round(payloadSize / 1024 / 1024) + ' MB). Maximum is ~8 MB.';
        return;
      }
      this.mappingUploading = true;
      this.mappingUploadError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function() {
          self.mappingUploading = false;
          self.mappingParsedRows = [];
          self.mappingParsedCols = [];
          self.mappingUploadForm = { name: '', version: '', file: null };
          if (self.$refs.mappingFileInput) self.$refs.mappingFileInput.value = '';
          self.showMappingUpload = false;
          self.loadMappingTables();
        })
        .withFailureHandler(function(err) {
          self.mappingUploadError = err.message || String(err);
          self.mappingUploading = false;
        })
        .createPowerMappingTable(this.mappingUploadForm.name.trim(), this.mappingUploadForm.version.trim(), this.mappingParsedRows);
    },

    confirmDeleteMapping(tbl) {
      this.mappingDeleteTarget = tbl;
      this.mappingDeleteError = '';
    },

    doDeleteMapping() {
      if (!this.mappingDeleteTarget) return;
      this.mappingDeleting = true;
      this.mappingDeleteError = '';
      var self = this;
      var id = this.mappingDeleteTarget.id;
      google.script.run
        .withSuccessHandler(function() {
          self.mappingDeleting = false;
          self.mappingDeleteTarget = null;
          self.loadMappingTables();
        })
        .withFailureHandler(function(err) {
          self.mappingDeleteError = err.message || String(err);
          self.mappingDeleting = false;
        })
        .deletePowerMappingTable(id);
    },

    // ── Equipment table methods ──────────────────────────────────────────────

    loadEquipmentTables() {
      this.equipmentLoading = true;
      this.equipmentLoadError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function(list) {
          self.equipmentTables = list || [];
          self.equipmentLoading = false;
        })
        .withFailureHandler(function(err) {
          self.equipmentLoadError = err.message || String(err);
          self.equipmentLoading = false;
        })
        .listPowerEquipmentTables();
    },

    onEquipmentFileSelected(event) {
      this.equipmentUploadForm.file = event.target.files[0] || null;
      this.equipmentParsedRows = [];
      this.equipmentParsedCols = [];
      this.equipmentParseError = '';
      this.equipmentUploadError = '';
    },

    parseEquipmentFile() {
      if (!this.equipmentUploadForm.file) return;
      var self = this;
      this.equipmentParseError = '';
      Papa.parse(this.equipmentUploadForm.file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.errors.length > 0) {
            self.equipmentParseError = 'CSV parse error: ' + results.errors[0].message;
            return;
          }
          if (!results.data || results.data.length === 0) {
            self.equipmentParseError = 'No data rows found in this CSV.';
            return;
          }
          var cols = results.meta.fields || Object.keys(results.data[0]);
          var required = ['Manufacturer', 'Model'];
          for (var i = 0; i < required.length; i++) {
            if (cols.indexOf(required[i]) === -1) {
              self.equipmentParseError = 'CSV must have a "' + required[i] + '" column.';
              return;
            }
          }
          self.equipmentParsedCols = cols;
          self.equipmentParsedRows = results.data;
        },
        error: function(err) {
          self.equipmentParseError = 'Could not parse file: ' + (err.message || String(err));
        },
      });
    },

    uploadEquipmentTable() {
      if (!this.equipmentUploadForm.name.trim() || !this.equipmentUploadForm.version.trim() || !this.equipmentParsedRows.length) return;
      var payloadSize = JSON.stringify(this.equipmentParsedRows).length;
      if (payloadSize > 8 * 1024 * 1024) {
        this.equipmentUploadError = 'Table is too large (' + Math.round(payloadSize / 1024 / 1024) + ' MB). Maximum is ~8 MB.';
        return;
      }
      this.equipmentUploading = true;
      this.equipmentUploadError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function() {
          self.equipmentUploading = false;
          self.equipmentParsedRows = [];
          self.equipmentParsedCols = [];
          self.equipmentUploadForm = { name: '', version: '', file: null };
          if (self.$refs.equipmentFileInput) self.$refs.equipmentFileInput.value = '';
          self.showEquipmentUpload = false;
          self.loadEquipmentTables();
        })
        .withFailureHandler(function(err) {
          self.equipmentUploadError = err.message || String(err);
          self.equipmentUploading = false;
        })
        .createPowerEquipmentTable(this.equipmentUploadForm.name.trim(), this.equipmentUploadForm.version.trim(), this.equipmentParsedRows);
    },

    confirmDeleteEquipment(tbl) {
      this.equipmentDeleteTarget = tbl;
      this.equipmentDeleteError = '';
    },

    doDeleteEquipment() {
      if (!this.equipmentDeleteTarget) return;
      this.equipmentDeleting = true;
      this.equipmentDeleteError = '';
      var self = this;
      var id = this.equipmentDeleteTarget.id;
      google.script.run
        .withSuccessHandler(function() {
          self.equipmentDeleting = false;
          self.equipmentDeleteTarget = null;
          self.loadEquipmentTables();
        })
        .withFailureHandler(function(err) {
          self.equipmentDeleteError = err.message || String(err);
          self.equipmentDeleting = false;
        })
        .deletePowerEquipmentTable(id);
    },

    // ── Utilities ────────────────────────────────────────────────────────────

    formatDate(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    },
  },
};
</script>
