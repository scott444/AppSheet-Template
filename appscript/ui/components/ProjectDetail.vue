<template>
  <div>
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border);padding:6px 12px" @click="goBack">
        <span class="icon" style="font-size:16px">arrow_back</span> Projects
      </button>
      <div v-if="project" class="section-title" style="margin-bottom:0">
        {{ project.customer }} / {{ project.projectName }}
        <span style="font-size:13px;color:var(--text-muted);font-weight:400;margin-left:8px">{{ project.date }}</span>
      </div>
    </div>

    <!-- Loading project meta -->
    <div v-if="loadingProject" style="color:var(--text-muted)">Loading project...</div>
    <div v-else-if="projectError" class="result-box error" style="display:block">{{ projectError }}</div>

    <template v-else-if="project">
      <!-- Tab bar — Equipment List tab only; more tabs added here in the future -->
      <div class="tab-bar">
        <div class="tab-item active">Equipment List</div>
      </div>

      <!-- ── Equipment List Tab ── -->
      <div class="card" style="margin-top:0;border-radius:0 8px 8px 8px">

        <!-- Card header: title + view-mode toggle -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div class="card-title" style="margin-bottom:0">
            Equipment List —
            <span v-if="viewMode === 'final'">{{ finalRows.length }} items</span>
            <span v-else>{{ eqlRows.length }} items</span>
          </div>
          <div class="view-mode-bar">
            <button :class="['view-mode-btn', { active: viewMode === 'baseline' }]" @click="viewMode = 'baseline'">Baseline</button>
            <button :class="['view-mode-btn', { active: viewMode === 'modifications' }]" @click="viewMode = 'modifications'">Modifications</button>
            <button :class="['view-mode-btn', { active: viewMode === 'final' }]" @click="viewMode = 'final'">Final List</button>
          </div>
        </div>

        <!-- Modifications: toolbar — Add Item + Save/Discard when dirty -->
        <div v-if="viewMode === 'modifications'" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn" @click="showAddForm = !showAddForm">
            <span class="icon">add</span> Add Item
          </button>
          <template v-if="adlDirty">
            <button class="btn btn-save" :disabled="adlSaving" @click="saveAdl">
              <span class="icon">{{ adlSaving ? 'hourglass_empty' : 'save' }}</span>
              {{ adlSaving ? 'Saving...' : 'Save Changes' }}
            </button>
            <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" :disabled="adlSaving" @click="discardAdl">
              Discard
            </button>
            <span style="font-size:12px;color:var(--text-muted)">Unsaved changes</span>
          </template>
          <span v-else-if="!loadingAdl" style="font-size:12px;color:var(--success-text)">
            <span class="icon" style="font-size:14px;vertical-align:middle">check_circle</span> All changes saved
          </span>
          <div v-if="adlSaveError" class="result-box error" style="display:block;margin-left:8px">{{ adlSaveError }}</div>
        </div>

        <!-- Inline add form — v-show preserves input state when toggled -->
        <div v-if="viewMode === 'modifications'" v-show="showAddForm" style="background:var(--bg);border-radius:6px;padding:16px;margin-bottom:12px">
          <div class="form-group">
            <label class="form-label">Nomenclature</label>
            <input v-model="addForm.nomenclature" type="text" class="form-input" placeholder="Equipment nomenclature" />
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <input v-model="addForm.notes" type="text" class="form-input" placeholder="Optional reason / notes" />
          </div>
          <div class="btn-row">
            <button class="btn" :disabled="!addForm.nomenclature.trim()" @click="saveAddEntry">
              <span class="icon">add</span> Add to List
            </button>
            <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" @click="cancelAddForm">
              Cancel
            </button>
          </div>
        </div>

        <!-- Table loading / error states -->
        <div v-if="loadingEql || loadingAdl" style="color:var(--text-muted)">Loading...</div>
        <div v-else-if="eqlError" class="result-box error" style="display:block">{{ eqlError }}</div>
        <div v-else-if="adlError" class="result-box error" style="display:block">{{ adlError }}</div>
        <div v-else-if="currentRows.length === 0" class="empty-state">No equipment items found.</div>

        <!-- Table -->
        <div v-else style="overflow-x:auto">
          <table class="sheets-table">
            <thead>
              <tr>
                <th v-for="col in eqlDisplayColumns" :key="col">{{ col }}</th>
                <th v-if="viewMode === 'modifications'" style="width:70px"></th>
              </tr>
            </thead>
            <tbody>
              <!-- EQL baseline rows -->
              <tr
                v-for="row in currentPage"
                :key="row._uid"
                :class="{ 'eql-row-deleted': viewMode === 'modifications' && deletedUids[row._uid] }"
              >
                <td
                  v-for="col in eqlDisplayColumns"
                  :key="col"
                  :class="col === 'NOMENCLATURE' ? 'nomenclature-cell' : ''"
                >{{ row[col] }}</td>
                <!-- Action column — Modifications mode only -->
                <td v-if="viewMode === 'modifications'" style="white-space:nowrap">
                  <button
                    v-if="!deletedUids[row._uid]"
                    class="btn-danger-sm"
                    @click="deleteRow(row)"
                  >
                    <span class="icon" style="font-size:14px;vertical-align:middle">delete</span>
                  </button>
                  <button
                    v-else
                    class="btn-undo-sm"
                    @click="undoAdlEntry(deletedUids[row._uid])"
                  >Undo</button>
                </td>
              </tr>
              <!-- ADL-added rows — shown in Modifications view with Undo button -->
              <tr
                v-if="viewMode === 'modifications'"
                v-for="row in adlAddedRows"
                :key="row._uid"
                class="eql-row-added"
              >
                <td
                  v-for="col in eqlDisplayColumns"
                  :key="col"
                  :class="col === 'NOMENCLATURE' ? 'nomenclature-cell' : ''"
                >{{ row[col] }}</td>
                <td style="white-space:nowrap">
                  <button
                    class="btn-undo-sm"
                    @click="undoAdlEntry(row._adlUid)"
                  >Undo</button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div v-if="currentRows.length > pageSize" style="margin-top:12px;display:flex;align-items:center;gap:12px;font-size:13px;color:var(--text-muted)">
            <button class="btn" style="padding:4px 10px;font-size:12px" :disabled="eqlPageNum === 0" @click="eqlPageNum--">‹ Prev</button>
            Page {{ eqlPageNum + 1 }} of {{ eqlTotalPages }}
            <button class="btn" style="padding:4px 10px;font-size:12px" :disabled="eqlPageNum >= eqlTotalPages - 1" @click="eqlPageNum++">Next ›</button>
          </div>
        </div>

        <!-- Price summary — shown on Baseline and Final List views when price column exists -->
        <div v-if="hasPriceColumn && (viewMode === 'baseline' || viewMode === 'final')" class="price-summary" style="margin-top:16px">
          <div v-if="viewMode === 'baseline'" class="price-row">
            <span class="price-label">Baseline Total</span>
            <span class="price-value">{{ formatCurrency(baselineTotal) }}</span>
          </div>
          <template v-if="viewMode === 'final'">
            <div class="price-row">
              <span class="price-label">Baseline Total</span>
              <span class="price-value">{{ formatCurrency(baselineTotal) }}</span>
            </div>
            <div class="price-row">
              <span class="price-label">Final Total</span>
              <span class="price-value" style="font-weight:600">{{ formatCurrency(finalTotal) }}</span>
            </div>
            <div class="price-row" :class="priceDelta >= 0 ? 'price-delta-up' : 'price-delta-down'">
              <span class="price-label">Delta</span>
              <span class="price-value">{{ priceDelta >= 0 ? '+' : '' }}{{ formatCurrency(priceDelta) }}</span>
            </div>
          </template>
        </div>

        <!-- Final List: subtitle note -->
        <p v-if="viewMode === 'final'" style="margin-top:10px;font-size:12px;color:var(--text-muted)">
          Final List reflects all modifications applied — {{ deletedUidsCount }} deleted, {{ adlAddedRows.length }} added.
        </p>
      </div>
    </template>
  </div>
</template>

<script>
var PAGE_SIZE = 100;
var KEY_COLUMNS = ['OPT','COF','DS','CUST REF','ORGANIZER 1','ORGANIZER 2','SUB SYS ID','ORGANIZER 3','ORGANIZER 4','LIST ID','LIM','O','APC','QTY','NOMENCLATURE','DESCRIPTION','UNIT LIST','EXT LIST','TOTAL QTY','EXT EXCHANGE RATE','EXT STAGING','EXT FIELD','EXT DROPSHIP','CUSTOMER DISCOUNT (%)','UNIT CUSTOMER DISCOUNT','EXT CUSTOMER DISCOUNT','FAMILY GROUP','PRODUCT STATUS','PRODUCT STATUS REFRESH DATE','CFG','LOCATION','OPTIONAL','ORGANIZER 5','ORGANIZER 6','ORGANIZER 7','ORGANIZER 8','EID','PID','TERM','CURRENCY','DESIGN QUOTE','REPORT RUN DATE','SORT ORDER','COUNTRY OF ORIGIN','PARAMETRIC DATA'];
var HIDDEN_COLUMNS = ['_uid'];
var PRICE_COLUMN = 'EXT LIST';

// Generate an 8-char uppercase hex UID — matches the server-side generateUid_() format
function clientUid() {
  var hex = '';
  for (var i = 0; i < 8; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex.toUpperCase();
}

export default {
  props: { projectId: { type: String, required: true } },
  emits: ['navigate'],

  data() {
    return {
      // View mode control
      viewMode: 'baseline',   // 'baseline' | 'modifications' | 'final'
      showAddForm: false,
      addForm: { nomenclature: '', notes: '' },

      // Project meta
      project: null,
      loadingProject: true,
      projectError: '',

      // EQL data
      eqlRows: [],
      loadingEql: true,
      eqlError: '',
      eqlPageNum: 0,
      pageSize: PAGE_SIZE,

      // ADL data — live working state (in-memory until user saves)
      adl: [],
      savedAdl: [],        // snapshot of adl as last loaded or saved to Drive
      adlDirtyFlag: false, // true when adl has unsaved in-memory changes
      loadingAdl: true,
      adlError: '',
      adlSaving: false,
      adlSaveError: '',

      // Metadata (eager-loaded on mount)
      metadataEdits: {},
      loadingMetadata: false,
      metadataError: '',
    };
  },

  computed: {
    // True when in-memory adl differs from last saved state
    adlDirty() {
      return this.adlDirtyFlag;
    },

    // Map of EQL _uid → ADL entry uid for rows targeted by a delete action
    deletedUids() {
      var map = {};
      for (var i = 0; i < this.adl.length; i++) {
        var e = this.adl[i];
        if (e.action === 'delete' && e.targetUid) {
          map[e.targetUid] = e.uid;
        }
      }
      return map;
    },

    // Count of distinct deleted rows (for Final List subtitle)
    deletedUidsCount() {
      return Object.keys(this.deletedUids).length;
    },

    // Price totals
    baselineTotal() { return this.sumPrice(this.eqlRows); },
    finalTotal()    { return this.sumPrice(this.finalRows); },
    priceDelta()    { return this.finalTotal - this.baselineTotal; },
    hasPriceColumn() {
      return this.eqlRows.length > 0 && PRICE_COLUMN in this.eqlRows[0];
    },

    // ADL 'add' entries shaped as pseudo-EQL rows (Modifications + Final List views)
    adlAddedRows() {
      return this.adl
        .filter(function(e) { return e.action === 'add'; })
        .map(function(e) {
          return {
            _uid: 'adl-' + e.uid,
            _adlUid: e.uid,
            QTY: '',
            NOMENCLATURE: e.nomenclature,
            DESCRIPTION: e.notes || '',
            'CUST REF': '',
            'LIST ID': '',
            'FAMILY GROUP': '',
            'PRODUCT STATUS': 'Added',
          };
        });
    },

    // Clean merged list: EQL minus deleted _uids + ADL adds + metadata merged in
    finalRows() {
      var self = this;
      var kept = this.eqlRows.filter(function(r) { return !self.deletedUids[r._uid]; });
      var merged = kept.concat(self.adlAddedRows);
      return merged.map(function(r) {
        return Object.assign({}, r, self.metadataEdits[r.NOMENCLATURE] || {});
      });
    },

    // Rows displayed based on current view mode
    currentRows() {
      return this.viewMode === 'final' ? this.finalRows : this.eqlRows;
    },

    // Ordered column list — key columns first, hidden excluded
    eqlDisplayColumns() {
      if (!this.eqlRows.length) return [];
      var keys = Object.keys(this.eqlRows[0]);
      var ordered = KEY_COLUMNS.filter(function(c) { return keys.indexOf(c) !== -1; });
      var rest = keys.filter(function(c) { return KEY_COLUMNS.indexOf(c) === -1 && HIDDEN_COLUMNS.indexOf(c) === -1; });
      return ordered.concat(rest);
    },

    currentPage() {
      var start = this.eqlPageNum * this.pageSize;
      return this.currentRows.slice(start, start + this.pageSize);
    },

    eqlTotalPages() {
      return Math.ceil(this.currentRows.length / this.pageSize);
    },

    nomenclatures() {
      var seen = {};
      var result = [];
      for (var i = 0; i < this.eqlRows.length; i++) {
        var nom = this.eqlRows[i]['NOMENCLATURE'];
        if (nom && !seen[nom]) { seen[nom] = true; result.push(nom); }
      }
      return result.sort();
    },
  },

  watch: {
    projectId: {
      immediate: true,
      handler() {
        this.loadProject();
        this.loadEql();
        this.loadAdl();
        this.loadMetadata();
      },
    },

    viewMode() {
      this.eqlPageNum = 0;
      this.adlSaveError = '';
    },

    nomenclatures(noms) {
      var self = this;
      noms.forEach(function(nom) {
        if (!self.metadataEdits[nom]) {
          self.metadataEdits[nom] = { category: '', description: '', notes: '', status: '' };
        }
      });
    },
  },

  methods: {

    // Navigate back — prompt if there are unsaved modifications
    goBack() {
      if (this.adlDirtyFlag) {
        if (!confirm('You have unsaved changes. Leave without saving?')) return;
      }
      this.$emit('navigate', 'projects');
    },

    loadProject() {
      this.loadingProject = true;
      var self = this;
      google.script.run
        .withSuccessHandler(function(data) { self.project = data; self.loadingProject = false; })
        .withFailureHandler(function(err) { self.projectError = err.message || String(err); self.loadingProject = false; })
        .getProject(this.projectId);
    },

    loadEql() {
      this.loadingEql = true;
      this.eqlPageNum = 0;
      var self = this;
      google.script.run
        .withSuccessHandler(function(rows) { self.eqlRows = rows || []; self.loadingEql = false; })
        .withFailureHandler(function(err) { self.eqlError = err.message || String(err); self.loadingEql = false; })
        .getEqlRows(this.projectId);
    },

    loadAdl() {
      this.loadingAdl = true;
      var self = this;
      google.script.run
        .withSuccessHandler(function(data) {
          self.adl = data || [];
          self.savedAdl = self.adl.slice(); // snapshot for discard
          self.adlDirtyFlag = false;
          self.loadingAdl = false;
        })
        .withFailureHandler(function(err) { self.adlError = err.message || String(err); self.loadingAdl = false; })
        .getAdl(this.projectId);
    },

    loadMetadata() {
      this.loadingMetadata = true;
      var self = this;
      google.script.run
        .withSuccessHandler(function(data) {
          var saved = data || {};
          Object.keys(saved).forEach(function(nom) {
            self.metadataEdits[nom] = Object.assign(
              { category: '', description: '', notes: '', status: '' },
              saved[nom]
            );
          });
          self.loadingMetadata = false;
        })
        .withFailureHandler(function(err) { self.metadataError = err.message || String(err); self.loadingMetadata = false; })
        .getMetadata(this.projectId);
    },

    // ── In-memory modification methods ─────────────────────────────────────

    // Add a new item to the ADL log (in memory — no network call)
    saveAddEntry() {
      if (!this.addForm.nomenclature.trim()) return;
      this.adl.push({
        uid: clientUid(),
        action: 'add',
        nomenclature: this.addForm.nomenclature.trim(),
        notes: this.addForm.notes.trim(),
        timestamp: new Date().toISOString(),
      });
      this.adlDirtyFlag = true;
      this.showAddForm = false;
      this.addForm = { nomenclature: '', notes: '' };
    },

    cancelAddForm() {
      this.showAddForm = false;
      this.addForm = { nomenclature: '', notes: '' };
      this.adlSaveError = '';
    },

    isMainLineItem(row) {
      return row['LIM'] && !row['O'];
    },

    getSubLineItems(mainRow) {
      var lim = mainRow['LIM'];
      return this.eqlRows.filter(function(r) { return r['LIM'] === lim && r['O']; });
    },

    // Delete a row (in memory — no network call); cascades to sub line items for main items
    deleteRow(row) {
      var entries = [{ action: 'delete', nomenclature: row['NOMENCLATURE'], targetUid: row._uid, notes: '' }];

      if (this.isMainLineItem(row)) {
        var self = this;
        this.getSubLineItems(row).forEach(function(sub) {
          if (!self.deletedUids[sub._uid]) {
            entries.push({ action: 'delete', nomenclature: sub['NOMENCLATURE'], targetUid: sub._uid, notes: 'Cascade: main LIM ' + row['LIM'] + ' deleted' });
          }
        });
      }

      var now = new Date().toISOString();
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        this.adl.push({ uid: clientUid(), action: e.action, nomenclature: e.nomenclature, targetUid: e.targetUid, notes: e.notes, timestamp: now });
      }
      this.adlDirtyFlag = true;
    },

    // Undo an ADL entry (in memory — no network call); cascades for main line item deletes
    undoAdlEntry(adlEntryUid) {
      var entry = null;
      for (var i = 0; i < this.adl.length; i++) {
        if (this.adl[i].uid === adlEntryUid) { entry = this.adl[i]; break; }
      }
      var uidsToRemove = [adlEntryUid];

      if (entry && entry.action === 'delete' && entry.targetUid) {
        var mainRow = null;
        for (var j = 0; j < this.eqlRows.length; j++) {
          if (this.eqlRows[j]._uid === entry.targetUid) { mainRow = this.eqlRows[j]; break; }
        }
        if (mainRow && this.isMainLineItem(mainRow)) {
          var lim = mainRow['LIM'];
          var subUids = {};
          this.eqlRows.forEach(function(r) { if (r['LIM'] === lim && r['O']) subUids[r._uid] = true; });
          this.adl.forEach(function(e) {
            if (e.action === 'delete' && e.targetUid && subUids[e.targetUid]) uidsToRemove.push(e.uid);
          });
        }
      }

      var removeSet = {};
      uidsToRemove.forEach(function(u) { removeSet[u] = true; });
      this.adl = this.adl.filter(function(e) { return !removeSet[e.uid]; });
      this.adlDirtyFlag = true;
    },

    // ── Persist / Discard ───────────────────────────────────────────────────

    // Save the full in-memory ADL to Google Drive in one write
    saveAdl() {
      this.adlSaving = true;
      this.adlSaveError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function() {
          self.savedAdl = self.adl.slice();
          self.adlDirtyFlag = false;
          self.adlSaving = false;
        })
        .withFailureHandler(function(err) {
          self.adlSaveError = err.message || String(err);
          self.adlSaving = false;
        })
        .saveAdl(this.projectId, this.adl);
    },

    // Revert all unsaved changes back to the last saved state
    discardAdl() {
      this.adl = this.savedAdl.slice();
      this.adlDirtyFlag = false;
      this.adlSaveError = '';
    },

    // ── Utilities ───────────────────────────────────────────────────────────

    sumPrice(rows) {
      var total = 0;
      for (var i = 0; i < rows.length; i++) {
        var val = parseFloat(rows[i][PRICE_COLUMN]);
        if (!isNaN(val)) total += val;
      }
      return total;
    },

    formatCurrency(num) {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

  },
};
</script>
