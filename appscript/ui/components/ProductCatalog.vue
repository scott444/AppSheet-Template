<template>
  <div>
    <div class="section-title">Product Catalog</div>

    <!-- Catalog version selector + Upload button -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div class="card-title" style="margin-bottom:0">Catalog Versions</div>
        <button class="btn" @click="showUpload = !showUpload">
          <span class="icon">{{ showUpload ? 'close' : 'upload_file' }}</span>
          {{ showUpload ? 'Cancel Upload' : 'Upload New Version' }}
        </button>
      </div>

      <!-- Upload form -->
      <div v-if="showUpload" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:6px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:160px">
            <label class="form-label">Catalog Name</label>
            <input v-model="uploadForm.name" type="text" class="form-input" placeholder="e.g. Standard Catalog" :disabled="uploading" />
          </div>
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:120px">
            <label class="form-label">Version</label>
            <input v-model="uploadForm.version" type="text" class="form-input" placeholder="e.g. 2026-Q1" :disabled="uploading" />
          </div>
          <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
            <label class="form-label">CSV File</label>
            <input ref="fileInput" type="file" accept=".csv" class="form-input" :disabled="uploading" @change="onFileSelected" />
          </div>
        </div>

        <!-- Parse + Preview -->
        <div v-if="uploadForm.file && !parsedRows.length && !parseError" style="margin-top:12px">
          <button class="btn" :disabled="uploading" @click="parseFile">
            <span class="icon">preview</span> Preview
          </button>
        </div>

        <div v-if="parseError" class="result-box error" style="display:block;margin-top:12px">{{ parseError }}</div>

        <!-- Preview table -->
        <div v-if="parsedRows.length" style="margin-top:12px">
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:8px">
            Preview — {{ parsedRows.length }} products, {{ parsedColumns.length }} columns
          </p>
          <div style="overflow-x:auto">
            <table class="sheets-table" style="margin-top:0">
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
          <div v-if="parsedColumns.length > 10" style="font-size:12px;color:var(--text-muted);margin-top:4px">
            Showing 10 of {{ parsedColumns.length }} columns in preview.
          </div>

          <div class="btn-row" style="margin-top:12px">
            <button class="btn" :disabled="uploading || !canUpload" @click="uploadCatalog">
              <span class="icon">{{ uploading ? 'hourglass_empty' : 'cloud_upload' }}</span>
              {{ uploading ? 'Creating...' : 'Create Catalog' }}
            </button>
          </div>
        </div>

        <div v-if="uploadError" class="result-box error" style="display:block;margin-top:12px">{{ uploadError }}</div>
      </div>

      <!-- Loading catalogs -->
      <div v-if="loadingCatalogs" style="color:var(--text-muted);margin-top:12px">Loading catalogs...</div>
      <div v-else-if="catalogsError" class="result-box error" style="display:block;margin-top:12px">{{ catalogsError }}</div>

      <!-- Catalog list -->
      <div v-else-if="catalogs.length" style="margin-top:12px">
        <table class="sheets-table" style="margin-top:0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th>Products</th>
              <th>Columns</th>
              <th>Created</th>
              <th style="width:80px"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cat in catalogs"
              :key="cat.id"
              :class="{ 'catalog-row-selected': selectedCatalogId === cat.id }"
              style="cursor:pointer"
              @click="selectCatalog(cat.id)"
            >
              <td style="font-weight:500">{{ cat.name }}</td>
              <td>{{ cat.version }}</td>
              <td>{{ cat.rowCount }}</td>
              <td>{{ cat.columns.length }}</td>
              <td style="color:var(--text-muted);font-size:13px">{{ formatDate(cat.createdAt) }}</td>
              <td style="text-align:right">
                <button
                  class="btn-danger-sm"
                  title="Delete catalog"
                  @click.stop="confirmDelete(cat)"
                >
                  <span class="icon" style="font-size:14px;vertical-align:middle">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-else-if="!showUpload" class="empty-state" style="margin-top:12px">
        No catalogs yet. Click "Upload New Version" to get started.
      </div>
    </div>

    <!-- Selected catalog: product table -->
    <div v-if="selectedCatalogId" class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <div class="card-title" style="margin-bottom:0">
          {{ selectedCatalogName }} —
          <span v-if="loadingProducts">Loading...</span>
          <span v-else>{{ filteredRows.length }} products</span>
        </div>
        <div v-if="!loadingProducts && productRows.length" style="display:flex;align-items:center;gap:8px">
          <span class="icon" style="font-family:'Material Symbols Rounded';font-size:18px;color:var(--text-muted)">search</span>
          <input
            v-model="searchQuery"
            type="text"
            class="form-input"
            placeholder="Search products..."
            style="width:240px"
          />
        </div>
      </div>

      <div v-if="loadingProducts" style="color:var(--text-muted)">Loading products...</div>
      <div v-else-if="productsError" class="result-box error" style="display:block">{{ productsError }}</div>
      <div v-else-if="filteredRows.length === 0" class="empty-state">
        {{ searchQuery ? 'No products match your search.' : 'This catalog has no products.' }}
      </div>

      <div v-else style="overflow-x:auto">
        <table class="sheets-table" style="margin-top:0">
          <thead>
            <tr>
              <th v-for="col in displayColumns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in currentPage" :key="i">
              <td v-for="col in displayColumns" :key="col" :class="col === 'Nomenclature' || col === 'NOMENCLATURE' ? 'nomenclature-cell' : ''">{{ row[col] }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="filteredRows.length > pageSize" style="margin-top:12px;display:flex;align-items:center;gap:12px;font-size:13px;color:var(--text-muted)">
          <button class="btn" style="padding:4px 10px;font-size:12px" :disabled="pageNum === 0" @click="pageNum--">‹ Prev</button>
          Page {{ pageNum + 1 }} of {{ totalPages }}
          <button class="btn" style="padding:4px 10px;font-size:12px" :disabled="pageNum >= totalPages - 1" @click="pageNum++">Next ›</button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation dialog -->
    <div v-if="deleteTarget" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:100;display:flex;align-items:center;justify-content:center" @click.self="deleteTarget = null">
      <div class="card" style="max-width:400px;margin:0">
        <div class="card-title">Delete Catalog</div>
        <p style="margin-bottom:16px">
          Delete <strong>{{ deleteTarget.name }}</strong> v{{ deleteTarget.version }}? This cannot be undone.
        </p>
        <div class="btn-row">
          <button class="btn" style="background:var(--error-text)" :disabled="deleting" @click="doDelete">
            <span class="icon">{{ deleting ? 'hourglass_empty' : 'delete' }}</span>
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
          <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" :disabled="deleting" @click="deleteTarget = null">Cancel</button>
        </div>
        <div v-if="deleteError" class="result-box error" style="display:block;margin-top:12px">{{ deleteError }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import Papa from 'papaparse';

var PAGE_SIZE = 100;
var PREVIEW_LIMIT = 5;

// Core columns displayed first (case-insensitive match against CSV headers)
var CORE_COLUMNS = ['Description', 'Full Description', 'Nomenclature', 'APC', 'Price'];

function matchCoreColumn(col) {
  var lower = col.toLowerCase();
  for (var i = 0; i < CORE_COLUMNS.length; i++) {
    if (CORE_COLUMNS[i].toLowerCase() === lower) return i;
  }
  return -1;
}

export default {
  data() {
    return {
      // Catalog list
      catalogs: [],
      loadingCatalogs: true,
      catalogsError: '',

      // Upload form
      showUpload: false,
      uploadForm: { name: '', version: '', file: null },
      parsedRows: [],
      parsedColumns: [],
      parseError: '',
      uploading: false,
      uploadError: '',

      // Selected catalog products
      selectedCatalogId: null,
      productRows: [],
      productColumns: [],
      loadingProducts: false,
      productsError: '',
      searchQuery: '',
      pageNum: 0,
      pageSize: PAGE_SIZE,

      // Delete
      deleteTarget: null,
      deleting: false,
      deleteError: '',
    };
  },

  computed: {
    canUpload() {
      return this.uploadForm.name.trim() && this.uploadForm.version.trim() && this.parsedRows.length > 0;
    },

    previewColumns() {
      return this.parsedColumns.slice(0, 10);
    },

    previewRows() {
      return this.parsedRows.slice(0, PREVIEW_LIMIT);
    },

    selectedCatalogName() {
      for (var i = 0; i < this.catalogs.length; i++) {
        if (this.catalogs[i].id === this.selectedCatalogId) {
          return this.catalogs[i].name + ' v' + this.catalogs[i].version;
        }
      }
      return 'Catalog';
    },

    // Order columns: core columns first, then remaining in original order
    displayColumns() {
      if (!this.productColumns.length) return [];
      var core = [];
      var rest = [];
      for (var i = 0; i < this.productColumns.length; i++) {
        var col = this.productColumns[i];
        var coreIdx = matchCoreColumn(col);
        if (coreIdx >= 0) {
          core.push({ col: col, idx: coreIdx });
        } else {
          rest.push(col);
        }
      }
      core.sort(function(a, b) { return a.idx - b.idx; });
      var ordered = core.map(function(c) { return c.col; });
      return ordered.concat(rest);
    },

    filteredRows() {
      if (!this.searchQuery.trim()) return this.productRows;
      var q = this.searchQuery.trim().toLowerCase();
      var cols = this.productColumns;
      return this.productRows.filter(function(row) {
        for (var i = 0; i < cols.length; i++) {
          var val = row[cols[i]];
          if (val != null && String(val).toLowerCase().indexOf(q) !== -1) return true;
        }
        return false;
      });
    },

    currentPage() {
      var start = this.pageNum * this.pageSize;
      return this.filteredRows.slice(start, start + this.pageSize);
    },

    totalPages() {
      return Math.ceil(this.filteredRows.length / this.pageSize);
    },
  },

  watch: {
    searchQuery() {
      this.pageNum = 0;
    },
  },

  mounted() {
    this.loadCatalogs();
  },

  methods: {
    loadCatalogs() {
      this.loadingCatalogs = true;
      this.catalogsError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function(data) {
          self.catalogs = data || [];
          self.loadingCatalogs = false;
        })
        .withFailureHandler(function(err) {
          self.catalogsError = err.message || String(err);
          self.loadingCatalogs = false;
        })
        .listCatalogs();
    },

    onFileSelected(event) {
      this.uploadForm.file = event.target.files[0] || null;
      this.parsedRows = [];
      this.parsedColumns = [];
      this.parseError = '';
      this.uploadError = '';
    },

    parseFile() {
      if (!this.uploadForm.file) return;

      var ext = this.uploadForm.file.name.split('.').pop().toLowerCase();
      if (ext !== 'csv') {
        this.parseError = 'Please select a .csv file.';
        return;
      }

      var self = this;
      this.parseError = '';

      Papa.parse(this.uploadForm.file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.errors.length > 0) {
            self.parseError = 'CSV parse error: ' + results.errors[0].message;
            return;
          }
          if (!results.data || results.data.length === 0) {
            self.parseError = 'No product rows found in this CSV. Check that the file has data rows below a header row.';
            return;
          }
          self.parsedColumns = results.meta.fields || Object.keys(results.data[0]);
          self.parsedRows = results.data;
        },
        error: function(err) {
          self.parseError = 'Could not parse file: ' + (err.message || String(err));
        },
      });
    },

    uploadCatalog() {
      if (!this.canUpload) return;

      // Guard against GAS payload limit
      var payloadSize = JSON.stringify(this.parsedRows).length;
      if (payloadSize > 8 * 1024 * 1024) {
        this.uploadError = 'Catalog is too large (' + Math.round(payloadSize / 1024 / 1024) + ' MB). Maximum is ~8 MB.';
        return;
      }

      this.uploading = true;
      this.uploadError = '';
      var self = this;

      google.script.run
        .withSuccessHandler(function(result) {
          self.uploading = false;
          self.resetUpload();
          self.loadCatalogs();
          // Auto-select the newly created catalog
          self.selectCatalog(result.id);
        })
        .withFailureHandler(function(err) {
          self.uploadError = err.message || String(err);
          self.uploading = false;
        })
        .createCatalog(this.uploadForm.name.trim(), this.uploadForm.version.trim(), this.parsedRows);
    },

    resetUpload() {
      this.showUpload = false;
      this.uploadForm = { name: '', version: '', file: null };
      this.parsedRows = [];
      this.parsedColumns = [];
      this.parseError = '';
      this.uploadError = '';
      if (this.$refs.fileInput) this.$refs.fileInput.value = '';
    },

    selectCatalog(catalogId) {
      if (this.selectedCatalogId === catalogId) return;
      this.selectedCatalogId = catalogId;
      this.searchQuery = '';
      this.pageNum = 0;
      this.loadProducts(catalogId);
    },

    loadProducts(catalogId) {
      this.loadingProducts = true;
      this.productsError = '';
      this.productRows = [];
      this.productColumns = [];
      var self = this;
      google.script.run
        .withSuccessHandler(function(rows) {
          if (self.selectedCatalogId !== catalogId) return; // stale response
          self.productRows = rows || [];
          if (rows && rows.length > 0) {
            self.productColumns = Object.keys(rows[0]);
          }
          self.loadingProducts = false;
        })
        .withFailureHandler(function(err) {
          if (self.selectedCatalogId !== catalogId) return;
          self.productsError = err.message || String(err);
          self.loadingProducts = false;
        })
        .getCatalog(catalogId);
    },

    confirmDelete(catalog) {
      this.deleteTarget = catalog;
      this.deleteError = '';
    },

    doDelete() {
      if (!this.deleteTarget) return;
      this.deleting = true;
      this.deleteError = '';
      var self = this;
      var id = this.deleteTarget.id;

      google.script.run
        .withSuccessHandler(function() {
          self.deleting = false;
          self.deleteTarget = null;
          if (self.selectedCatalogId === id) {
            self.selectedCatalogId = null;
            self.productRows = [];
            self.productColumns = [];
          }
          self.loadCatalogs();
        })
        .withFailureHandler(function(err) {
          self.deleteError = err.message || String(err);
          self.deleting = false;
        })
        .deleteCatalog(id);
    },

    formatDate(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    },
  },
};
</script>
