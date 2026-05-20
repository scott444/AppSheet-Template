<template>
  <div>
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border);padding:6px 12px" @click="goBack">
        <span class="icon" style="font-size:16px">arrow_back</span> Projects
      </button>
      <!-- Static title -->
      <div v-if="project && !editingProject" class="section-title" style="margin-bottom:0;display:flex;align-items:center;gap:8px">
        {{ project.customer }} / {{ project.projectName }}
        <span style="font-size:13px;color:var(--text-muted);font-weight:400">Created: {{ project.date }}</span>
        <button
          class="btn"
          style="padding:4px 8px;font-size:12px;background:var(--bg);color:var(--text-muted);border:1px solid var(--border)"
          title="Edit project name"
          @click="startEditProject"
        >
          <span class="icon" style="font-size:14px">edit</span>
        </button>
      </div>

      <!-- Inline edit form -->
      <div v-if="project && editingProject" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <input
          v-model="editForm.customer"
          type="text"
          class="form-input"
          placeholder="Customer"
          style="width:180px"
          :disabled="editSaving"
        />
        <span style="color:var(--text-muted)">/</span>
        <input
          v-model="editForm.projectName"
          type="text"
          class="form-input"
          placeholder="Project name"
          style="width:220px"
          :disabled="editSaving"
        />
        <input
          v-model="editForm.description"
          type="text"
          class="form-input"
          placeholder="Description (optional)"
          style="width:280px"
          :disabled="editSaving"
        />
        <button
          class="btn btn-save"
          :disabled="editSaving || !editForm.customer.trim() || !editForm.projectName.trim()"
          @click="saveEditProject"
        >
          <span class="icon">{{ editSaving ? 'hourglass_empty' : 'save' }}</span>
          {{ editSaving ? 'Saving...' : 'Save' }}
        </button>
        <button
          class="btn"
          style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)"
          :disabled="editSaving"
          @click="cancelEditProject"
        >Cancel</button>
        <div v-if="editError" class="result-box error" style="display:block;margin:0">{{ editError }}</div>
      </div>
    </div>

    <!-- Description — shown below header when present -->
    <div v-if="project && !editingProject && project.description" style="color:var(--text-muted);font-size:13px;margin-top:-12px;margin-bottom:16px">
      {{ project.description }}
    </div>

    <!-- Loading project meta -->
    <div v-if="loadingProject" style="color:var(--text-muted)">Loading project...</div>
    <div v-else-if="projectError" class="result-box error" style="display:block">{{ projectError }}</div>

    <template v-else-if="project">
      <!-- Tab bar -->
      <div class="tab-bar">
        <div :class="['tab-item', { active: activeTab === 'equipment-list' }]" @click="activeTab = 'equipment-list'">Equipment List</div>
        <div :class="['tab-item', { active: activeTab === 'power-table' }]" @click="switchToPowerTab">
          Power Table
          <span v-if="ptSaving" style="font-size:11px;color:var(--text-muted);margin-left:6px">Saving...</span>
        </div>
      </div>

      <!-- ── Equipment List Tab ── -->
      <div v-if="activeTab === 'equipment-list'" class="card" style="margin-top:0;border-radius:0 8px 8px 8px">

        <!-- Card header: title + view-mode toggle -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div class="card-title" style="margin-bottom:0">
            Equipment List —
            <span v-if="viewMode === 'final'">{{ finalRows.length }} items</span>
            <span v-else>{{ eqlRows.length }} items</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div class="view-mode-bar">
              <button :class="['view-mode-btn', { active: viewMode === 'baseline' }]" @click="viewMode = 'baseline'">Baseline</button>
              <button :class="['view-mode-btn', { active: viewMode === 'modifications' }]" @click="viewMode = 'modifications'">Modifications</button>
              <button :class="['view-mode-btn', { active: viewMode === 'final' }]" @click="viewMode = 'final'">Final List</button>
            </div>
            <!-- Catalog version selector — contextual to baseline or modifications view -->
            <div v-if="catalogs.length && (viewMode === 'baseline' || viewMode === 'modifications')" style="display:flex;align-items:center;gap:6px;font-size:13px">
              <span style="color:var(--text-muted);white-space:nowrap">Catalog:</span>
              <select
                v-if="viewMode === 'baseline'"
                :value="baselineCatalogId || ''"
                :disabled="catalogSaving"
                class="form-input"
                style="width:auto;min-width:180px;padding:4px 8px;font-size:13px"
                @change="baselineCatalogId = $event.target.value || null; saveCatalogSelection('baselineCatalogId', baselineCatalogId)"
              >
                <option value="">None selected</option>
                <option v-for="cat in catalogs" :key="cat.id" :value="cat.id">{{ cat.name }} — {{ cat.version }}</option>
              </select>
              <select
                v-if="viewMode === 'modifications'"
                :value="modificationCatalogId || ''"
                :disabled="catalogSaving"
                class="form-input"
                style="width:auto;min-width:180px;padding:4px 8px;font-size:13px"
                @change="modificationCatalogId = $event.target.value || null; saveCatalogSelection('modificationCatalogId', modificationCatalogId)"
              >
                <option value="">None selected</option>
                <option v-for="cat in catalogs" :key="cat.id" :value="cat.id">{{ cat.name }} — {{ cat.version }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Modifications: toolbar — Save/Discard when dirty. Adds are anchor-only,
             so the inline form is opened from the row context menu (Insert Above/Below). -->
        <div v-if="viewMode === 'modifications'" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <span style="font-size:12px;color:var(--text-muted)">Right-click a row to insert, replace, or delete.</span>
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
        <div v-if="viewMode === 'modifications'" v-show="showAddForm" ref="addFormEl" style="background:var(--bg);border-radius:6px;padding:16px;margin-bottom:12px">
          <!-- Anchor hint — shown when form was opened via Insert Above / Insert Below -->
          <div v-if="insertAnchor" style="font-size:12px;color:var(--primary);margin-bottom:10px;padding:6px 10px;background:var(--primary-light);border-radius:4px;border-left:3px solid var(--primary)">
            <span class="icon" style="font-size:14px;vertical-align:middle">{{ (insertAnchor.selectedPosition || insertAnchor.position) === 'above' ? 'vertical_align_top' : 'vertical_align_bottom' }}</span>
            Inserting {{ insertAnchor.selectedPosition || insertAnchor.position }} <strong>{{ anchorNomenclature }}</strong>
          </div>
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
              <!-- Unified row loop — handles EQL rows and ADL-added rows interleaved via modificationsRows -->
              <tr
                v-for="row in currentPage"
                :key="row._uid"
                :class="{
                  'eql-row-deleted': viewMode === 'modifications' && !row._isAdded && deletedUids[row._uid],
                  'eql-row-added':   row._isAdded,
                  'eql-row-main':    isMainLineItem(row),
                  'eql-row-sub':     !isMainLineItem(row)
                }"
                @contextmenu.prevent="onRowContextMenu($event, row)"
              >
                <td
                  v-for="col in eqlDisplayColumns"
                  :key="col"
                  :class="col === 'NOMENCLATURE' ? 'nomenclature-cell' : ''"
                >{{ row[col] }}</td>
                <!-- Action column — Modifications mode only -->
                <td v-if="viewMode === 'modifications'" style="white-space:nowrap">
                  <template v-if="row._isAdded">
                    <button class="btn-undo-sm" @click="undoAdlEntry(row._adlUid)">Undo</button>
                  </template>
                  <template v-else>
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
                  </template>
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

      <!-- ── Power Table Tab ── -->
      <template v-if="activeTab === 'power-table'">

        <!-- ── Mapping Table Selector ── -->
        <div class="card" style="margin-top:0;border-radius:0 8px 8px 8px;margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div class="card-title" style="margin-bottom:0">
              Mapping Table
              <span v-if="ptMappingTableId && !ptShowMappingSelector" style="font-size:13px;font-weight:400;color:var(--text-muted);margin-left:6px">— {{ ptMappingActiveLabel }}</span>
            </div>
            <button class="btn" style="font-size:13px;padding:5px 12px" @click="ptShowMappingSelector = !ptShowMappingSelector">
              <span class="icon" style="font-size:15px">{{ ptShowMappingSelector ? 'close' : 'table_rows' }}</span>
              {{ ptShowMappingSelector ? 'Close' : (ptMappingTableId ? 'Change' : 'Select Table') }}
            </button>
          </div>

          <template v-if="ptShowMappingSelector">
            <!-- Upload form -->
            <div style="margin-top:16px;padding:16px;background:var(--bg);border-radius:6px">
              <div style="font-size:13px;font-weight:500;margin-bottom:10px;color:var(--text)">Upload New Version</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Required columns: LIM, O, Multiple, Description, Manufacturer, Model</div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:160px">
                  <label class="form-label">Table Name</label>
                  <input v-model="ptMappingUploadForm.name" type="text" class="form-input" placeholder="e.g. Standard Mapping" :disabled="ptMappingUploading" />
                </div>
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:120px">
                  <label class="form-label">Version</label>
                  <input v-model="ptMappingUploadForm.version" type="text" class="form-input" placeholder="e.g. 2026-Q1" :disabled="ptMappingUploading" />
                </div>
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
                  <label class="form-label">CSV File</label>
                  <input ref="ptMappingFileInput" type="file" accept=".csv" class="form-input" :disabled="ptMappingUploading" @change="ptMappingOnFileSelected" />
                </div>
              </div>
              <div v-if="ptMappingParsedRows.length === 0 && ptMappingUploadForm.file && !ptMappingParseError" style="margin-top:10px">
                <button class="btn" :disabled="ptMappingUploading" @click="ptMappingParseFile">
                  <span class="icon">preview</span> Preview
                </button>
              </div>
              <div v-if="ptMappingParseError" class="result-box error" style="display:block;margin-top:10px">{{ ptMappingParseError }}</div>
              <div v-if="ptMappingParsedRows.length" style="margin-top:10px">
                <p style="font-size:13px;color:var(--text-muted);margin-bottom:6px">{{ ptMappingParsedRows.length }} rows, {{ ptMappingParsedCols.length }} columns — preview (5 rows)</p>
                <div style="overflow-x:auto">
                  <table class="sheets-table" style="margin-top:0;font-size:12px">
                    <thead><tr><th v-for="col in ptMappingParsedCols.slice(0,10)" :key="col">{{ col }}</th></tr></thead>
                    <tbody><tr v-for="(row,i) in ptMappingParsedRows.slice(0,5)" :key="i"><td v-for="col in ptMappingParsedCols.slice(0,10)" :key="col">{{ row[col] }}</td></tr></tbody>
                  </table>
                </div>
                <div class="btn-row" style="margin-top:10px">
                  <button class="btn btn-save" :disabled="ptMappingUploading || !ptMappingUploadForm.name.trim() || !ptMappingUploadForm.version.trim()" @click="ptMappingUploadTable">
                    <span class="icon">{{ ptMappingUploading ? 'hourglass_empty' : 'cloud_upload' }}</span>
                    {{ ptMappingUploading ? 'Uploading...' : 'Upload Table' }}
                  </button>
                </div>
              </div>
              <div v-if="ptMappingUploadError" class="result-box error" style="display:block;margin-top:10px">{{ ptMappingUploadError }}</div>
            </div>
            <!-- Existing versions -->
            <div style="margin-top:12px">
              <div v-if="ptMappingTableLoading" style="color:var(--text-muted);font-size:13px">Loading...</div>
              <div v-else-if="ptMappingTableError" class="result-box error" style="display:block">{{ ptMappingTableError }}</div>
              <div v-else-if="!ptMappingTableList.length" style="font-size:13px;color:var(--text-muted)">No mapping tables uploaded yet.</div>
              <table v-else class="sheets-table" style="margin-top:0">
                <thead><tr><th>Name</th><th>Version</th><th>Rows</th><th>Created</th><th style="width:120px"></th></tr></thead>
                <tbody>
                  <tr v-for="tbl in ptMappingTableList" :key="tbl.id" style="cursor:pointer" @click="ptSelectMappingTable(tbl.id)">
                    <td style="font-weight:500">{{ tbl.name }}</td>
                    <td>{{ tbl.version }}</td>
                    <td>{{ tbl.rowCount }}</td>
                    <td style="color:var(--text-muted);font-size:12px">{{ formatDate(tbl.createdAt) }}</td>
                    <td style="text-align:right;white-space:nowrap">
                      <button class="btn btn-save" style="font-size:12px;padding:3px 10px;margin-right:6px" @click.stop="ptSelectMappingTable(tbl.id)">
                        {{ ptMappingTableId === tbl.id ? '✓ Active' : 'Use' }}
                      </button>
                      <button class="btn-danger-sm" title="Delete" @click.stop="ptMappingConfirmDelete(tbl)">
                        <span class="icon" style="font-size:14px;vertical-align:middle">delete</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- Mapping delete dialog -->
          <div v-if="ptMappingDeleteTarget" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:100;display:flex;align-items:center;justify-content:center" @click.self="ptMappingDeleteTarget = null">
            <div class="card" style="max-width:400px;margin:0">
              <div class="card-title">Delete Mapping Table</div>
              <p style="margin-bottom:16px">Delete <strong>{{ ptMappingDeleteTarget.name }}</strong> v{{ ptMappingDeleteTarget.version }}? This cannot be undone.</p>
              <div class="btn-row">
                <button class="btn" style="background:var(--error-text)" :disabled="ptMappingDeleting" @click="ptMappingDoDelete">
                  <span class="icon">{{ ptMappingDeleting ? 'hourglass_empty' : 'delete' }}</span>
                  {{ ptMappingDeleting ? 'Deleting...' : 'Delete' }}
                </button>
                <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" :disabled="ptMappingDeleting" @click="ptMappingDeleteTarget = null">Cancel</button>
              </div>
              <div v-if="ptMappingDeleteError" class="result-box error" style="display:block;margin-top:10px">{{ ptMappingDeleteError }}</div>
            </div>
          </div>
        </div>

        <!-- ── Equipment Table Selector ── -->
        <div class="card" style="margin-top:0;border-radius:8px;margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div class="card-title" style="margin-bottom:0">
              Equipment Table
              <span v-if="ptEquipmentTableId && !ptShowEquipmentSelector" style="font-size:13px;font-weight:400;color:var(--text-muted);margin-left:6px">— {{ ptEquipmentActiveLabel }}</span>
            </div>
            <button class="btn" style="font-size:13px;padding:5px 12px" @click="ptShowEquipmentSelector = !ptShowEquipmentSelector">
              <span class="icon" style="font-size:15px">{{ ptShowEquipmentSelector ? 'close' : 'electrical_services' }}</span>
              {{ ptShowEquipmentSelector ? 'Close' : (ptEquipmentTableId ? 'Change' : 'Select Table') }}
            </button>
          </div>

          <template v-if="ptShowEquipmentSelector">
            <!-- Upload form -->
            <div style="margin-top:16px;padding:16px;background:var(--bg);border-radius:6px">
              <div style="font-size:13px;font-weight:500;margin-bottom:10px;color:var(--text)">Upload New Version</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Required columns: Manufacturer, Model (plus optional power/physical specs)</div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:160px">
                  <label class="form-label">Table Name</label>
                  <input v-model="ptEquipmentUploadForm.name" type="text" class="form-input" placeholder="e.g. Power Specs Master" :disabled="ptEquipmentUploading" />
                </div>
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:120px">
                  <label class="form-label">Version</label>
                  <input v-model="ptEquipmentUploadForm.version" type="text" class="form-input" placeholder="e.g. 2026-Q1" :disabled="ptEquipmentUploading" />
                </div>
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
                  <label class="form-label">CSV File</label>
                  <input ref="ptEquipmentFileInput" type="file" accept=".csv" class="form-input" :disabled="ptEquipmentUploading" @change="ptEquipmentOnFileSelected" />
                </div>
              </div>
              <div v-if="ptEquipmentParsedRows.length === 0 && ptEquipmentUploadForm.file && !ptEquipmentParseError" style="margin-top:10px">
                <button class="btn" :disabled="ptEquipmentUploading" @click="ptEquipmentParseFile">
                  <span class="icon">preview</span> Preview
                </button>
              </div>
              <div v-if="ptEquipmentParseError" class="result-box error" style="display:block;margin-top:10px">{{ ptEquipmentParseError }}</div>
              <div v-if="ptEquipmentParsedRows.length" style="margin-top:10px">
                <p style="font-size:13px;color:var(--text-muted);margin-bottom:6px">{{ ptEquipmentParsedRows.length }} rows, {{ ptEquipmentParsedCols.length }} columns — preview (5 rows)</p>
                <div style="overflow-x:auto">
                  <table class="sheets-table" style="margin-top:0;font-size:12px">
                    <thead><tr><th v-for="col in ptEquipmentParsedCols.slice(0,10)" :key="col">{{ col }}</th></tr></thead>
                    <tbody><tr v-for="(row,i) in ptEquipmentParsedRows.slice(0,5)" :key="i"><td v-for="col in ptEquipmentParsedCols.slice(0,10)" :key="col">{{ row[col] }}</td></tr></tbody>
                  </table>
                </div>
                <div class="btn-row" style="margin-top:10px">
                  <button class="btn btn-save" :disabled="ptEquipmentUploading || !ptEquipmentUploadForm.name.trim() || !ptEquipmentUploadForm.version.trim()" @click="ptEquipmentUploadTable">
                    <span class="icon">{{ ptEquipmentUploading ? 'hourglass_empty' : 'cloud_upload' }}</span>
                    {{ ptEquipmentUploading ? 'Uploading...' : 'Upload Table' }}
                  </button>
                </div>
              </div>
              <div v-if="ptEquipmentUploadError" class="result-box error" style="display:block;margin-top:10px">{{ ptEquipmentUploadError }}</div>
            </div>
            <!-- Existing versions -->
            <div style="margin-top:12px">
              <div v-if="ptEquipmentTableLoading" style="color:var(--text-muted);font-size:13px">Loading...</div>
              <div v-else-if="ptEquipmentTableError" class="result-box error" style="display:block">{{ ptEquipmentTableError }}</div>
              <div v-else-if="!ptEquipmentTableList.length" style="font-size:13px;color:var(--text-muted)">No equipment tables uploaded yet.</div>
              <table v-else class="sheets-table" style="margin-top:0">
                <thead><tr><th>Name</th><th>Version</th><th>Rows</th><th>Created</th><th style="width:120px"></th></tr></thead>
                <tbody>
                  <tr v-for="tbl in ptEquipmentTableList" :key="tbl.id" style="cursor:pointer" @click="ptSelectEquipmentTable(tbl.id)">
                    <td style="font-weight:500">{{ tbl.name }}</td>
                    <td>{{ tbl.version }}</td>
                    <td>{{ tbl.rowCount }}</td>
                    <td style="color:var(--text-muted);font-size:12px">{{ formatDate(tbl.createdAt) }}</td>
                    <td style="text-align:right;white-space:nowrap">
                      <button class="btn btn-save" style="font-size:12px;padding:3px 10px;margin-right:6px" @click.stop="ptSelectEquipmentTable(tbl.id)">
                        {{ ptEquipmentTableId === tbl.id ? '✓ Active' : 'Use' }}
                      </button>
                      <button class="btn-danger-sm" title="Delete" @click.stop="ptEquipmentConfirmDelete(tbl)">
                        <span class="icon" style="font-size:14px;vertical-align:middle">delete</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- Equipment delete dialog -->
          <div v-if="ptEquipmentDeleteTarget" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:100;display:flex;align-items:center;justify-content:center" @click.self="ptEquipmentDeleteTarget = null">
            <div class="card" style="max-width:400px;margin:0">
              <div class="card-title">Delete Equipment Table</div>
              <p style="margin-bottom:16px">Delete <strong>{{ ptEquipmentDeleteTarget.name }}</strong> v{{ ptEquipmentDeleteTarget.version }}? This cannot be undone.</p>
              <div class="btn-row">
                <button class="btn" style="background:var(--error-text)" :disabled="ptEquipmentDeleting" @click="ptEquipmentDoDelete">
                  <span class="icon">{{ ptEquipmentDeleting ? 'hourglass_empty' : 'delete' }}</span>
                  {{ ptEquipmentDeleting ? 'Deleting...' : 'Delete' }}
                </button>
                <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" :disabled="ptEquipmentDeleting" @click="ptEquipmentDeleteTarget = null">Cancel</button>
              </div>
              <div v-if="ptEquipmentDeleteError" class="result-box error" style="display:block;margin-top:10px">{{ ptEquipmentDeleteError }}</div>
            </div>
          </div>
        </div>

        <!-- No tables selected — prompt -->
        <div v-if="!ptMappingTableId || !ptEquipmentTableId" class="card" style="margin-top:0;border-radius:8px">
          <div class="empty-state">
            <span v-if="!ptMappingTableId">Select a <strong>Mapping Table</strong> above to begin.</span>
            <span v-else-if="!ptEquipmentTableId">Select an <strong>Equipment Table</strong> above to begin.</span>
          </div>
        </div>

        <!-- Power Table content — shown once both tables are selected -->
        <template v-else>

          <!-- Rack manager -->
          <div class="card" style="margin-top:0;border-radius:8px;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:500;color:var(--text)">Racks:</span>
              <span
                v-for="rack in ptRacks"
                :key="rack"
                style="display:inline-flex;align-items:center;gap:4px;background:var(--primary-light);color:var(--primary);border-radius:12px;padding:2px 10px;font-size:13px"
              >
                {{ rack }}
                <span class="icon" style="font-size:14px;cursor:pointer;opacity:0.7" title="Remove rack" @click="removeRack(rack)">close</span>
              </span>
              <div style="display:inline-flex;align-items:center;gap:6px">
                <input
                  v-model="ptNewRack"
                  type="text"
                  class="form-input"
                  placeholder="New rack name..."
                  style="width:160px;padding:4px 10px;font-size:13px"
                  @keyup.enter="addRack"
                />
                <button class="btn" style="padding:4px 12px;font-size:13px" :disabled="!ptNewRack.trim()" @click="addRack">
                  <span class="icon" style="font-size:15px">add</span> Add Rack
                </button>
              </div>
              <span v-if="ptSaveError" style="font-size:12px;color:var(--error-text)">{{ ptSaveError }}</span>
            </div>
          </div>

          <!-- Power table card -->
          <div class="card" style="margin-top:0;border-radius:8px">
            <!-- Header -->
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
              <div class="card-title" style="margin-bottom:0">
                Power Table
                <span v-if="!ptMappingLoading && !ptEquipmentLoading" style="font-size:13px;font-weight:400;color:var(--text-muted)">
                  — {{ filteredPowerRows.length }} rows &middot; {{ visiblePowerCols.length }} / {{ ptAllColumns.length }} equipment columns
                  <span v-if="ptUnmatchedCount" style="color:var(--error-text);margin-left:6px">
                    <span class="icon" style="font-size:13px;vertical-align:middle">warning</span>
                    {{ ptUnmatchedCount }} unmatched
                  </span>
                </span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <div style="display:flex;align-items:center;gap:6px">
                  <span class="icon" style="font-size:18px;color:var(--text-muted)">search</span>
                  <input v-model="ptSearch" type="text" class="form-input" placeholder="Search..." style="width:200px" />
                </div>
                <button class="btn" style="font-size:13px;padding:5px 12px" @click="ptShowColPicker = !ptShowColPicker">
                  <span class="icon" style="font-size:15px">view_column</span>
                  Columns
                </button>
              </div>
            </div>

            <!-- Column picker -->
            <div v-if="ptShowColPicker" style="padding:12px 16px;background:var(--bg);border-radius:6px;margin-bottom:12px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <span style="font-size:13px;font-weight:500">Equipment Columns</span>
                <button class="btn" style="font-size:12px;padding:3px 10px;background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" @click="resetPtCols">Reset all</button>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:8px 20px">
                <label v-for="col in ptAllColumns" :key="col" style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap">
                  <input type="checkbox" :checked="ptVisibleCols[col]" @change="togglePtCol(col, $event.target.checked)" />
                  {{ col }}
                </label>
              </div>
            </div>

            <!-- Loading / error -->
            <div v-if="ptMappingLoading || ptEquipmentLoading || ptDataLoading" style="color:var(--text-muted)">Loading power data...</div>
            <div v-else-if="ptMappingError" class="result-box error" style="display:block">Mapping: {{ ptMappingError }}</div>
            <div v-else-if="ptEquipmentError" class="result-box error" style="display:block">Equipment: {{ ptEquipmentError }}</div>
            <div v-else-if="ptDataError" class="result-box error" style="display:block">{{ ptDataError }}</div>
            <div v-else-if="powerRows.length === 0" class="empty-state">No EQL rows to display.</div>
            <div v-else-if="filteredPowerRows.length === 0" class="empty-state">No rows match your search.</div>

            <!-- Table -->
            <div v-else style="overflow-x:auto">
              <table class="sheets-table" style="margin-top:0">
                <thead>
                  <tr>
                    <th style="min-width:60px">LIM</th>
                    <th style="min-width:40px">O</th>
                    <th style="min-width:50px">QTY</th>
                    <th style="min-width:160px">NOMENCLATURE</th>
                    <th style="min-width:130px">Rack</th>
                    <th style="min-width:180px">Description</th>
                    <th style="min-width:120px">Manufacturer</th>
                    <th style="min-width:120px">Model</th>
                    <th style="min-width:60px">Multiple</th>
                    <th style="min-width:30px;text-align:right">#</th>
                    <th v-for="col in visiblePowerCols" :key="col" style="white-space:nowrap">{{ col }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in filteredPowerRows"
                    :key="row._rowKey"
                    :class="{ 'pt-row-unmatched': !row._matched }"
                  >
                    <td>{{ row['LIM'] }}</td>
                    <td>{{ row['O'] }}</td>
                    <td style="text-align:right">{{ row['QTY'] }}</td>
                    <td class="nomenclature-cell">
                      <span v-if="!row._matched" class="icon" style="font-size:13px;vertical-align:middle;color:var(--error-text)" title="No equipment match">warning</span>
                      {{ row['NOMENCLATURE'] }}
                    </td>
                    <td>
                      <select
                        :value="ptAssignments[row._rowKey] || ''"
                        class="form-input"
                        style="padding:2px 6px;font-size:12px;width:120px"
                        @change="onRackAssignment(row._rowKey, $event.target.value)"
                      >
                        <option value="">— Unassigned —</option>
                        <option v-for="rack in ptRacks" :key="rack" :value="rack">{{ rack }}</option>
                      </select>
                    </td>
                    <td>{{ row['M.Description'] || '' }}</td>
                    <td>{{ row['M.Manufacturer'] || '' }}</td>
                    <td>{{ row['M.Model'] || '' }}</td>
                    <td style="text-align:right">{{ row._multiple || '' }}</td>
                    <td style="text-align:right;color:var(--text-muted);font-size:12px">{{ row._matched ? (row._instanceIdx + 1) : '' }}</td>
                    <td v-for="col in visiblePowerCols" :key="col" style="white-space:nowrap">{{ row[col] !== undefined ? row[col] : '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Rack totals -->
            <template v-if="rackTotals.length && !ptMappingLoading && !ptEquipmentLoading && !ptDataLoading">
              <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
                <div class="card-title" style="margin-bottom:10px;font-size:14px">Rack Totals <span style="font-size:12px;font-weight:400;color:var(--text-muted)">(sum of all individual unit instances)</span></div>
                <div style="overflow-x:auto">
                  <table class="sheets-table pt-totals-table" style="margin-top:0">
                    <thead>
                      <tr>
                        <th>Rack</th>
                        <th style="text-align:right">Rows</th>
                        <th style="text-align:right">Watts max</th>
                        <th style="text-align:right">AC amps max</th>
                        <th style="text-align:right">VA max</th>
                        <th style="text-align:right">BTU max</th>
                        <th style="text-align:right">Weight (LBs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="r in rackTotals" :key="r.rack" :class="{ 'pt-totals-unassigned': r.rack === 'Unassigned' }">
                        <td style="font-weight:500">{{ r.rack }}</td>
                        <td style="text-align:right">{{ r.count }}</td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace">{{ formatNum(r.watts) }}</td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace">{{ formatNum(r.amps) }}</td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace">{{ formatNum(r.va) }}</td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace">{{ formatNum(r.btu) }}</td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace">{{ formatNum(r.weight) }}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr class="pt-totals-footer">
                        <td><strong>Total</strong></td>
                        <td style="text-align:right"><strong>{{ rackTotals.reduce(function(s,r){return s+r.count;},0) }}</strong></td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace"><strong>{{ formatNum(rackTotals.reduce(function(s,r){return s+r.watts;},0)) }}</strong></td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace"><strong>{{ formatNum(rackTotals.reduce(function(s,r){return s+r.amps;},0)) }}</strong></td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace"><strong>{{ formatNum(rackTotals.reduce(function(s,r){return s+r.va;},0)) }}</strong></td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace"><strong>{{ formatNum(rackTotals.reduce(function(s,r){return s+r.btu;},0)) }}</strong></td>
                        <td style="text-align:right;font-family:'Roboto Mono',monospace"><strong>{{ formatNum(rackTotals.reduce(function(s,r){return s+r.weight;},0)) }}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </template>
          </div>
        </template>
      </template>
    </template>

    <!-- Context menu — position: fixed so it renders outside the table's overflow:auto scroll container -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      ref="contextMenuEl"
    >
      <div class="context-menu-item" @click="ctxInsertAbove">
        <span class="icon" style="font-size:16px">vertical_align_top</span> Insert Above
      </div>
      <div class="context-menu-item" @click="ctxInsertBelow">
        <span class="icon" style="font-size:16px">vertical_align_bottom</span> Insert Below
      </div>
      <div v-if="contextMenu.rowType === 'eql'" class="context-menu-item" @click="ctxReplace">
        <span class="icon" style="font-size:16px">swap_horiz</span> Replace
      </div>
      <div class="context-menu-separator"></div>
      <div v-if="contextMenu.rowType === 'eql'" class="context-menu-item context-menu-item--danger" @click="ctxDelete">
        <span class="icon" style="font-size:16px">delete</span> Delete
      </div>
      <div v-else-if="contextMenu.rowType === 'eql-deleted'" class="context-menu-item" @click="ctxUndoDelete">
        <span class="icon" style="font-size:16px">undo</span> Undo Delete
      </div>
      <div v-else-if="contextMenu.rowType === 'adl-added'" class="context-menu-item" @click="ctxUndoAdd">
        <span class="icon" style="font-size:16px">undo</span> Undo Add
      </div>
    </div>

    <!-- Replace modal — pick a catalog item to replace the right-clicked EQL row.
         Commits a delete (of the original) + add (of the picked catalog row) to ADL. -->
    <div
      v-if="replaceModal.visible"
      style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center"
      @click.self="cancelReplace"
    >
      <div class="card" style="max-width:720px;width:90%;max-height:80vh;display:flex;flex-direction:column;margin:0">
        <div class="card-title" style="display:flex;align-items:center;gap:8px">
          <span class="icon" style="font-size:18px">swap_horiz</span>
          Replace Item
        </div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
          Replacing <strong style="color:var(--text)">{{ replaceModal.originalRow && replaceModal.originalRow['NOMENCLATURE'] }}</strong>
          — pick a catalog item below. One delete + one add will be recorded.
        </div>

        <!-- Catalog picker + search -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
          <select
            v-if="catalogs.length"
            :value="replaceModal.catalogId || ''"
            class="form-input"
            style="width:auto;min-width:200px;padding:5px 8px;font-size:13px"
            @change="changeReplaceCatalog($event.target.value || null)"
          >
            <option value="">Select catalog…</option>
            <option v-for="cat in catalogs" :key="cat.id" :value="cat.id">{{ cat.name }} — {{ cat.version }}</option>
          </select>
          <input
            v-model="replaceModal.search"
            type="text"
            class="form-input"
            placeholder="Filter…"
            style="flex:1;min-width:160px;padding:5px 8px;font-size:13px"
          />
        </div>

        <!-- Catalog rows -->
        <div style="flex:1;overflow:auto;border:1px solid var(--border);border-radius:6px;min-height:200px">
          <div v-if="replaceModal.loading" style="padding:16px;color:var(--text-muted);font-size:13px">Loading catalog…</div>
          <div v-else-if="replaceModal.error" class="result-box error" style="display:block;margin:12px">{{ replaceModal.error }}</div>
          <div v-else-if="!replaceModal.catalogId" style="padding:16px;color:var(--text-muted);font-size:13px">Select a catalog to browse items.</div>
          <div v-else-if="!filteredReplaceRows.length" style="padding:16px;color:var(--text-muted);font-size:13px">No matching items.</div>
          <table v-else class="sheets-table" style="margin-top:0;font-size:13px">
            <thead>
              <tr>
                <th v-for="col in replaceModal.previewColumns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in filteredReplaceRows"
                :key="i"
                :class="{ 'eql-row-added': replaceModal.selectedRow === row }"
                style="cursor:pointer"
                @click="replaceModal.selectedRow = row"
              >
                <td v-for="col in replaceModal.previewColumns" :key="col">{{ row[col] }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="btn-row" style="margin-top:12px">
          <button class="btn btn-save" :disabled="!replaceModal.selectedRow" @click="confirmReplace">
            <span class="icon">swap_horiz</span> Replace
          </button>
          <button class="btn" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)" @click="cancelReplace">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Papa from 'papaparse';

var PAGE_SIZE = 100;

// ── Power Table constants (v2) ─────────────────────────────────────────────
// Equipment table columns — toggleable in the column picker (25 cols)
var EQUIPMENT_COLUMNS = [
  'SubSys', 'Nomenclature', 'Description', 'Profile',
  'Manufacturer', 'Model', 'PSU',
  'AC volts min', 'AC volts max', 'AC amps max',
  'DC volts', 'DC amps max',
  'Watts max', 'VA max', 'BTU max',
  'H (in)', 'W (in)', 'D (in)', 'Weight (LBs)',
  'Operating Temp °F (min)', 'Operating Temp °F (max)',
  'Storage Temp °F (min)', 'Storage Temp °F (max)',
  'RU', 'Spec Sheet'
];
// Mapping columns always shown (not toggleable)
var MAPPING_DISPLAY_COLUMNS = ['Description', 'Manufacturer', 'Model'];
// Columns summed in rack totals (1 unit per row — row expansion handles the multiplication)
var PT_TOTAL_COLUMNS = ['Watts max', 'BTU max', 'Weight (LBs)', 'AC amps max', 'VA max'];
// localStorage key — v2 to avoid conflict with v1 prefs
var LS_PT_COL_KEY = 'power-table-cols-v2';

// Fallback defaults — used until getColumnConfig() returns from the server
var DEFAULT_KEY_COLUMNS = ['OPT','COF','DS','CUST REF','ORGANIZER 1','ORGANIZER 2','SUB SYS ID','ORGANIZER 3','ORGANIZER 4','LIST ID','LIM','O','APC','QTY','NOMENCLATURE','DESCRIPTION','UNIT LIST','EXT LIST','TOTAL QTY','EXT EXCHANGE RATE','EXT STAGING','EXT FIELD','EXT DROPSHIP','CUSTOMER DISCOUNT (%)','UNIT CUSTOMER DISCOUNT','EXT CUSTOMER DISCOUNT','FAMILY GROUP','PRODUCT STATUS','PRODUCT STATUS REFRESH DATE','CFG','LOCATION','OPTIONAL','ORGANIZER 5','ORGANIZER 6','ORGANIZER 7','ORGANIZER 8','EID','PID','TERM','CURRENCY','DESIGN QUOTE','REPORT RUN DATE','SORT ORDER','COUNTRY OF ORIGIN','PARAMETRIC DATA'];
var DEFAULT_HIDDEN_COLUMNS = ['_uid'];
var DEFAULT_PRICE_COLUMN = 'EXT LIST';
var DEFAULT_MAIN_LINE_ITEM = { limColumn: 'LIM', optColumn: 'O' };

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

      // Insert anchor — set by context menu Insert Above/Below; cleared after saveAddEntry/cancel
      insertAnchor: null,  // { uid: string, position: 'above' | 'below' } or null

      // Context menu state
      contextMenu: { visible: false, x: 0, y: 0, row: null, rowType: null },
      replaceModal: {
        visible: false,
        originalRow: null,
        catalogId: null,
        catalogRows: [],
        previewColumns: [],
        search: '',
        selectedRow: null,
        loading: false,
        error: '',
      },

      // Column configuration (loaded from server; defaults until then)
      columnConfig: {
        keyColumns: DEFAULT_KEY_COLUMNS,
        hiddenColumns: DEFAULT_HIDDEN_COLUMNS,
        priceColumn: DEFAULT_PRICE_COLUMN,
        mainLineItem: DEFAULT_MAIN_LINE_ITEM
      },

      // Project meta
      project: null,
      loadingProject: true,
      projectError: '',

      // Inline project edit state
      editingProject: false,
      editForm: { customer: '', projectName: '', description: '' },
      editSaving: false,
      editError: '',

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

      // Catalog version picker
      catalogs: [],
      baselineCatalogId: null,
      modificationCatalogId: null,
      catalogSaving: false,

      // ── Power Table tab (v2) ─────────────────────────────────────────────

      // Tab control
      activeTab: 'equipment-list',

      // ── Mapping table management
      ptMappingTableList: [],
      ptMappingTableLoading: false,
      ptMappingTableError: '',
      ptMappingTableId: null,        // active mapping version ID
      ptMappingMap: {},              // { 'LIM|O': [mappingRow, ...] }
      ptMappingLoading: false,
      ptMappingError: '',
      ptShowMappingSelector: false,
      ptMappingUploadForm: { name: '', version: '', file: null },
      ptMappingParsedRows: [],
      ptMappingParsedCols: [],
      ptMappingParseError: '',
      ptMappingUploading: false,
      ptMappingUploadError: '',
      ptMappingDeleteTarget: null,
      ptMappingDeleting: false,
      ptMappingDeleteError: '',

      // ── Equipment table management
      ptEquipmentTableList: [],
      ptEquipmentTableLoading: false,
      ptEquipmentTableError: '',
      ptEquipmentTableId: null,      // active equipment version ID
      ptEquipmentMap: {},            // { 'Manufacturer|Model': equipmentRow }
      ptEquipmentLoading: false,
      ptEquipmentError: '',
      ptShowEquipmentSelector: false,
      ptEquipmentUploadForm: { name: '', version: '', file: null },
      ptEquipmentParsedRows: [],
      ptEquipmentParsedCols: [],
      ptEquipmentParseError: '',
      ptEquipmentUploading: false,
      ptEquipmentUploadError: '',
      ptEquipmentDeleteTarget: null,
      ptEquipmentDeleting: false,
      ptEquipmentDeleteError: '',

      // ── Per-project state
      ptRacks: [],               // [string] — user-defined rack names
      ptAssignments: {},         // { "eqlUid|mappingIdx|instanceIdx": rackName } — per expanded row instance
      ptNewRack: '',
      ptDataLoading: false,
      ptDataError: '',
      ptSaving: false,
      ptSaveError: '',
      ptSaveTimer: null,
      ptLoaded: false,

      // ── Column visibility (Equipment columns, all on by default)
      ptVisibleCols: {},
      ptShowColPicker: false,

      // ── Search
      ptSearch: '',
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
      return this.eqlRows.length > 0 && this.columnConfig.priceColumn in this.eqlRows[0];
    },

    // ADL 'add' entries shaped as pseudo-EQL rows — used by finalRows, Final List count,
    // and as the source for modificationsRows interleaving.
    adlAddedRows() {
      return this.adl
        .filter(function(e) { return e.action === 'add'; })
        .map(function(e) {
          return {
            _uid: 'adl-' + e.uid,
            _adlUid: e.uid,
            _isAdded: true,
            _anchorUid: e.anchorUid || null,
            _anchorPosition: e.anchorPosition || null,
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

    // Merged list for Modifications view: EQL rows (including deleted, rendered struck-through)
    // with ADL-added rows interleaved at their anchor positions.
    modificationsRows() {
      return this.interleaveEqlWithAdds(false);
    },

    // Nomenclature label for the insert anchor hint in the add form. Prefers
    // selectedRowUid (the row the user actually right-clicked) so the hint shows
    // the visible anchor even when the new add is structurally anchored to the
    // underlying EQL row.
    anchorNomenclature() {
      if (!this.insertAnchor) return '';
      var uid = this.insertAnchor.selectedRowUid || this.insertAnchor.uid;
      for (var i = 0; i < this.eqlRows.length; i++) {
        if (this.eqlRows[i]._uid === uid) return this.eqlRows[i]['NOMENCLATURE'] || uid;
      }
      for (var j = 0; j < this.adlAddedRows.length; j++) {
        if (this.adlAddedRows[j]._uid === uid) return this.adlAddedRows[j]['NOMENCLATURE'] || uid;
      }
      return uid;
    },

    // Clean merged list: EQL minus deleted _uids + ADL adds interleaved at their anchors,
    // with metadata merged in. Anchors pointing at deleted rows still slot the add into that
    // row's original position (so a Replace shows the new row where the old one was).
    finalRows() {
      var self = this;
      return this.interleaveEqlWithAdds(true).map(function(r) {
        return Object.assign({}, r, self.metadataEdits[r.NOMENCLATURE] || {});
      });
    },

    // Rows displayed based on current view mode
    currentRows() {
      if (this.viewMode === 'final')         return this.finalRows;
      if (this.viewMode === 'modifications') return this.modificationsRows;
      return this.eqlRows;
    },

    // Ordered column list — key columns first, hidden excluded
    eqlDisplayColumns() {
      if (!this.eqlRows.length) return [];
      var keys = Object.keys(this.eqlRows[0]);
      var keyColumns = this.columnConfig.keyColumns;
      var hiddenColumns = this.columnConfig.hiddenColumns;
      var ordered = keyColumns.filter(function(c) { return keys.indexOf(c) !== -1; });
      var rest = keys.filter(function(c) { return keyColumns.indexOf(c) === -1 && hiddenColumns.indexOf(c) === -1; });
      return ordered.concat(rest);
    },

    currentPage() {
      var start = this.eqlPageNum * this.pageSize;
      return this.currentRows.slice(start, start + this.pageSize);
    },

    // Filter the loaded catalog rows by the replace-modal search box (case-insensitive
    // substring match across all preview columns).
    filteredReplaceRows() {
      var rows = this.replaceModal.catalogRows;
      var q = (this.replaceModal.search || '').trim().toLowerCase();
      if (!q) return rows;
      var cols = this.replaceModal.previewColumns;
      return rows.filter(function(row) {
        for (var i = 0; i < cols.length; i++) {
          var v = row[cols[i]];
          if (v != null && String(v).toLowerCase().indexOf(q) !== -1) return true;
        }
        return false;
      });
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

    // ── Power Table computed (v2) ────────────────────────────────────────

    // All Equipment columns — used by the column picker
    ptAllColumns() {
      return EQUIPMENT_COLUMNS;
    },

    ptMappingActiveLabel() {
      for (var i = 0; i < this.ptMappingTableList.length; i++) {
        var t = this.ptMappingTableList[i];
        if (t.id === this.ptMappingTableId) return t.name + ' v' + t.version;
      }
      return '';
    },

    ptEquipmentActiveLabel() {
      for (var i = 0; i < this.ptEquipmentTableList.length; i++) {
        var t = this.ptEquipmentTableList[i];
        if (t.id === this.ptEquipmentTableId) return t.name + ' v' + t.version;
      }
      return '';
    },

    // Expand EQL rows into individual unit instances via Mapping → Equipment join.
    // Each expanded row represents one physical unit:
    //   instance count per mapping entry = Math.round(EQL.QTY × Mapping.Multiple)
    // Each instance gets its own rack assignment keyed by _rowKey = "eqlUid|mappingIdx|instanceIdx".
    powerRows() {
      var mappingMap = this.ptMappingMap;
      var eqMap = this.ptEquipmentMap;
      var assignments = this.ptAssignments;
      var result = [];

      for (var i = 0; i < this.eqlRows.length; i++) {
        var eql = this.eqlRows[i];
        var limKey = (eql['LIM'] || '') + '|' + (eql['O'] || '');
        var qty = parseFloat(eql['QTY']) || 1;
        var mappings = mappingMap[limKey];

        if (!mappings || !mappings.length) {
          // No mapping match — one unmatched placeholder row (no rack assignment)
          result.push({
            _eqlUid: eql._uid,
            _rowKey: eql._uid + '|unmatched',
            _matched: false,
            _rack: '',
            _qty: qty,
            _multiple: 0,
            _effectiveQty: 0,
            _instanceIdx: 0,
            LIM: eql['LIM'],
            O: eql['O'],
            QTY: eql['QTY'],
            NOMENCLATURE: eql['NOMENCLATURE']
          });
          continue;
        }

        for (var j = 0; j < mappings.length; j++) {
          var m = mappings[j];
          var eqKey = (m['Manufacturer'] || '') + '|' + (m['Model'] || '');
          var eq = eqMap[eqKey] || null;
          var multiple = parseFloat(m['Multiple']);
          if (isNaN(multiple)) multiple = 1;
          // Each instance = 1 physical unit. Multiple=0 → no instances for this mapping row.
          var effectiveQty = Math.max(0, Math.round(qty * multiple));
          if (effectiveQty === 0) continue;

          for (var inst = 0; inst < effectiveQty; inst++) {
            var rowKey = eql._uid + '|' + j + '|' + inst;
            var expanded = {
              _eqlUid: eql._uid,
              _rowKey: rowKey,
              _matched: !!eq,
              _rack: assignments[rowKey] || '',
              _qty: qty,
              _multiple: multiple,
              _effectiveQty: effectiveQty,
              _instanceIdx: inst,
              LIM: eql['LIM'],
              O: eql['O'],
              QTY: eql['QTY'],
              NOMENCLATURE: eql['NOMENCLATURE'],
              'M.Description':  m['Description']  || '',
              'M.Manufacturer': m['Manufacturer'] || '',
              'M.Model':        m['Model']        || '',
              'M.Multiple':     m['Multiple']     || ''
            };
            // Merge all equipment columns for matched rows
            if (eq) {
              for (var k = 0; k < EQUIPMENT_COLUMNS.length; k++) {
                var col = EQUIPMENT_COLUMNS[k];
                if (eq[col] !== undefined) expanded[col] = eq[col];
              }
            }
            result.push(expanded);
          }
        }
      }
      return result;
    },

    filteredPowerRows() {
      if (!this.ptSearch.trim()) return this.powerRows;
      var q = this.ptSearch.trim().toLowerCase();
      return this.powerRows.filter(function(row) {
        var searchFields = ['NOMENCLATURE', 'LIM', 'O', 'M.Description', 'M.Manufacturer', 'M.Model'];
        for (var s = 0; s < searchFields.length; s++) {
          if ((row[searchFields[s]] || '').toLowerCase().indexOf(q) !== -1) return true;
        }
        for (var c = 0; c < EQUIPMENT_COLUMNS.length; c++) {
          var val = row[EQUIPMENT_COLUMNS[c]];
          if (val != null && String(val).toLowerCase().indexOf(q) !== -1) return true;
        }
        return false;
      });
    },

    visiblePowerCols() {
      var vis = this.ptVisibleCols;
      return EQUIPMENT_COLUMNS.filter(function(c) { return vis[c] !== false; });
    },

    ptUnmatchedCount() {
      var count = 0;
      var rows = this.powerRows;
      for (var i = 0; i < rows.length; i++) { if (!rows[i]._matched) count++; }
      return count;
    },

    // Totals per rack — each row is 1 physical unit; row expansion handles QTY × Multiple
    rackTotals() {
      var buckets = {};
      var rows = this.filteredPowerRows;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var rack = r._rack || 'Unassigned';
        if (!buckets[rack]) buckets[rack] = { rack: rack, count: 0, watts: 0, amps: 0, va: 0, btu: 0, weight: 0 };
        var b = buckets[rack];
        // Each row is one physical unit — sum raw spec values directly
        b.count++;
        b.watts  += parseFloat(r['Watts max'])     || 0;
        b.amps   += parseFloat(r['AC amps max'])   || 0;
        b.va     += parseFloat(r['VA max'])        || 0;
        b.btu    += parseFloat(r['BTU max'])       || 0;
        b.weight += parseFloat(r['Weight (LBs)'])  || 0;
      }
      var result = Object.values(buckets);
      result.sort(function(a, b) {
        if (a.rack === 'Unassigned') return 1;
        if (b.rack === 'Unassigned') return -1;
        return a.rack < b.rack ? -1 : a.rack > b.rack ? 1 : 0;
      });
      return result;
    },
  },

  watch: {
    projectId: {
      immediate: true,
      handler() {
        this.loadColumnConfig();
        this.loadProject();
        this.loadEql();
        this.loadAdl();
        this.loadMetadata();
        this.loadCatalogs();
      },
    },

    viewMode() {
      this.eqlPageNum = 0;
      this.adlSaveError = '';
      this.hideContextMenu();
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

  mounted() {
    // Bound references stored so we can remove the exact same function in beforeUnmount
    this._onDocMousedown  = this.onDocumentMousedown.bind(this);
    this._onDocKeydown    = this.onDocumentKeydown.bind(this);
    this._onContentScroll = this.hideContextMenu.bind(this);
    document.addEventListener('mousedown', this._onDocMousedown);
    document.addEventListener('keydown',   this._onDocKeydown);
    // Dismiss the context menu when the user scrolls the table container
    var contentEl = document.querySelector('.content');
    if (contentEl) contentEl.addEventListener('scroll', this._onContentScroll);
  },

  beforeUnmount() {
    document.removeEventListener('mousedown', this._onDocMousedown);
    document.removeEventListener('keydown',   this._onDocKeydown);
    var contentEl = document.querySelector('.content');
    if (contentEl) contentEl.removeEventListener('scroll', this._onContentScroll);
    if (this.ptSaveTimer) clearTimeout(this.ptSaveTimer);
  },

  methods: {

    // Navigate back — prompt if there are unsaved modifications; close edit form if open
    goBack() {
      if (this.adlDirtyFlag) {
        if (!confirm('You have unsaved changes. Leave without saving?')) return;
      }
      if (this.editingProject) this.cancelEditProject();
      this.$emit('navigate', 'projects');
    },

    loadColumnConfig() {
      var self = this;
      google.script.run
        .withSuccessHandler(function(config) { self.columnConfig = config; })
        .withFailureHandler(function() { /* keep defaults */ })
        .getColumnConfig();
    },

    loadProject() {
      this.loadingProject = true;
      var self = this;
      google.script.run
        .withSuccessHandler(function(data) {
          self.project = data;
          self.baselineCatalogId = (data && data.baselineCatalogId) || null;
          self.modificationCatalogId = (data && data.modificationCatalogId) || null;
          self.loadingProject = false;
        })
        .withFailureHandler(function(err) { self.projectError = err.message || String(err); self.loadingProject = false; })
        .getProject(this.projectId);
    },

    startEditProject() {
      this.editForm = { customer: this.project.customer, projectName: this.project.projectName, description: this.project.description || '' };
      this.editError = '';
      this.editingProject = true;
    },

    saveEditProject() {
      this.editSaving = true;
      this.editError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function(updated) {
          self.project = updated;
          self.editingProject = false;
          self.editSaving = false;
        })
        .withFailureHandler(function(err) {
          self.editError = err.message || String(err);
          self.editSaving = false;
        })
        .updateProject(this.projectId, { customer: this.editForm.customer.trim(), projectName: this.editForm.projectName.trim(), description: this.editForm.description.trim() });
    },

    cancelEditProject() {
      this.editingProject = false;
      this.editError = '';
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

    loadCatalogs() {
      var self = this;
      google.script.run
        .withSuccessHandler(function(data) { self.catalogs = data || []; })
        .withFailureHandler(function() { /* silently use empty list */ })
        .listCatalogs();
    },

    saveCatalogSelection(field, catalogId) {
      this.catalogSaving = true;
      var updates = {
        customer: this.project.customer,
        projectName: this.project.projectName,
        description: this.project.description || ''
      };
      updates[field] = catalogId || null;
      var self = this;
      google.script.run
        .withSuccessHandler(function(updated) {
          self.project = updated;
          self.catalogSaving = false;
        })
        .withFailureHandler(function() {
          self.catalogSaving = false;
        })
        .updateProject(this.projectId, updates);
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

    // Add a new item to the ADL log (in memory — no network call).
    // insertAnchor must be set (the inline form is only opened via the row context menu).
    // When beforeAdlUid is set (Insert Above on an ADL-added row), splice the entry
    // into adl[] before that uid so it appears earlier in the same anchor group.
    saveAddEntry() {
      if (!this.addForm.nomenclature.trim()) return;
      if (!this.insertAnchor) return;
      var entry = {
        uid: clientUid(),
        action: 'add',
        nomenclature: this.addForm.nomenclature.trim(),
        notes: this.addForm.notes.trim(),
        anchorUid: this.insertAnchor.uid,
        anchorPosition: this.insertAnchor.position,
        timestamp: new Date().toISOString(),
      };
      var beforeUid = this.insertAnchor.beforeAdlUid;
      if (beforeUid) {
        var idx = -1;
        for (var i = 0; i < this.adl.length; i++) {
          if (this.adl[i].uid === beforeUid) { idx = i; break; }
        }
        if (idx >= 0) this.adl.splice(idx, 0, entry);
        else this.adl.push(entry);
      } else {
        this.adl.push(entry);
      }
      this.adlDirtyFlag = true;
      this.showAddForm = false;
      this.insertAnchor = null;
      this.addForm = { nomenclature: '', notes: '' };
    },

    cancelAddForm() {
      this.showAddForm = false;
      this.insertAnchor = null;
      this.addForm = { nomenclature: '', notes: '' };
      this.adlSaveError = '';
    },

    // Walk EQL rows in order and interleave ADL-added rows at their anchor positions
    // (above/below the anchor EQL row). All adds are required to be anchored to an
    // existing EQL row. When skipDeleted is true, EQL rows marked for deletion are
    // omitted but their anchored adds still appear at the deleted row's slot — so a
    // Replace shows the new row in place of the old one in the Final List.
    interleaveEqlWithAdds(skipDeleted) {
      var anchorMap = {};  // eqlUid → { above: [addedRow, ...], below: [addedRow, ...] }
      var addedRows = this.adlAddedRows;
      for (var i = 0; i < addedRows.length; i++) {
        var ar = addedRows[i];
        if (!anchorMap[ar._anchorUid]) anchorMap[ar._anchorUid] = { above: [], below: [] };
        anchorMap[ar._anchorUid][ar._anchorPosition || 'below'].push(ar);
      }

      var result = [];
      for (var j = 0; j < this.eqlRows.length; j++) {
        var row = this.eqlRows[j];
        var anchored = anchorMap[row._uid];
        var isDeleted = !!this.deletedUids[row._uid];
        if (anchored && anchored.above.length) result = result.concat(anchored.above);
        if (!skipDeleted || !isDeleted) result.push(row);
        if (anchored && anchored.below.length) result = result.concat(anchored.below);
      }

      return result;
    },

    isMainLineItem(row) {
      return row[this.columnConfig.mainLineItem.limColumn] && !row[this.columnConfig.mainLineItem.optColumn];
    },

    getSubLineItems(mainRow) {
      var limCol = this.columnConfig.mainLineItem.limColumn;
      var optCol = this.columnConfig.mainLineItem.optColumn;
      var lim = mainRow[limCol];
      return this.eqlRows.filter(function(r) { return r[limCol] === lim && r[optCol]; });
    },

    // Delete a row (in memory — no network call); cascades to sub line items for main items
    deleteRow(row) {
      var entries = [{ action: 'delete', nomenclature: row['NOMENCLATURE'], targetUid: row._uid, notes: '' }];

      if (this.isMainLineItem(row)) {
        var self = this;
        this.getSubLineItems(row).forEach(function(sub) {
          if (!self.deletedUids[sub._uid]) {
            entries.push({ action: 'delete', nomenclature: sub['NOMENCLATURE'], targetUid: sub._uid, notes: 'Cascade: main ' + self.columnConfig.mainLineItem.limColumn + ' ' + row[self.columnConfig.mainLineItem.limColumn] + ' deleted' });
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
          var limCol = this.columnConfig.mainLineItem.limColumn;
          var optCol = this.columnConfig.mainLineItem.optColumn;
          var lim = mainRow[limCol];
          var subUids = {};
          this.eqlRows.forEach(function(r) { if (r[limCol] === lim && r[optCol]) subUids[r._uid] = true; });
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

    // ── Context Menu ────────────────────────────────────────────────────────

    // Show the context menu for the right-clicked row (Modifications view only)
    onRowContextMenu(event, row) {
      if (this.viewMode !== 'modifications') return;
      var rowType;
      if (row._isAdded) {
        rowType = 'adl-added';
      } else if (this.deletedUids[row._uid]) {
        rowType = 'eql-deleted';
      } else {
        rowType = 'eql';
      }
      // Clamp position so menu stays within the viewport
      this.contextMenu = {
        visible: true,
        x: Math.min(event.clientX, window.innerWidth  - 200),
        y: Math.min(event.clientY, window.innerHeight - 180),
        row: row,
        rowType: rowType,
      };
    },

    hideContextMenu() {
      this.contextMenu.visible = false;
    },

    // Dismiss on outside click
    onDocumentMousedown(event) {
      if (!this.contextMenu.visible) return;
      var el = this.$refs.contextMenuEl;
      if (el && !el.contains(event.target)) {
        this.hideContextMenu();
      }
    },

    // Dismiss on Escape key
    onDocumentKeydown(event) {
      if (event.key === 'Escape') this.hideContextMenu();
    },

    // Insert a new item above/below the right-clicked row.
    // For EQL rows the anchor is the row's _uid; for ADL-added rows the new item
    // reuses the ADL row's own anchor so it slots in next to the same EQL row.
    ctxInsertAbove() {
      this.openAddForm_(this.contextMenu.row, 'above');
    },

    ctxInsertBelow() {
      this.openAddForm_(this.contextMenu.row, 'below');
    },

    // Open the inline add form anchored to a row.
    //
    // For EQL rows: the new add anchors directly to the row's UID with the requested
    // position. For ADL-added rows: the new add joins the same anchor group as the
    // selected row (same EQL anchor + same position) — Insert Below relies on the
    // natural append order so the new entry follows the selected one; Insert Above
    // sets beforeAdlUid so saveAddEntry splices the new entry into adl[] before the
    // selected row's ADL entry, making it appear earlier in the same anchor group.
    //
    // Scrolls into view + focuses the nomenclature input so the form is obvious
    // (it sits above the table; a right-click near the bottom would otherwise
    // leave it off-screen).
    openAddForm_(row, position) {
      if (row._isAdded) {
        this.insertAnchor = {
          uid: row._anchorUid,
          position: row._anchorPosition || 'below',
          beforeAdlUid: position === 'above' ? row._adlUid : null,
          selectedRowUid: row._uid,
          selectedPosition: position,
        };
      } else {
        this.insertAnchor = {
          uid: row._uid,
          position: position,
          beforeAdlUid: null,
          selectedRowUid: row._uid,
          selectedPosition: position,
        };
      }
      this.showAddForm = true;
      this.hideContextMenu();
      var self = this;
      this.$nextTick(function() {
        var el = self.$refs.addFormEl;
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var input = el && el.querySelector('input.form-input');
        if (input) input.focus();
      });
    },

    ctxDelete() {
      this.deleteRow(this.contextMenu.row);
      this.hideContextMenu();
    },

    ctxUndoDelete() {
      this.undoAdlEntry(this.deletedUids[this.contextMenu.row._uid]);
      this.hideContextMenu();
    },

    ctxUndoAdd() {
      this.undoAdlEntry(this.contextMenu.row._adlUid);
      this.hideContextMenu();
    },

    // Open the Replace modal for the right-clicked EQL row. Defaults to the
    // modification catalog if set, otherwise the baseline catalog.
    ctxReplace() {
      var row = this.contextMenu.row;
      var defaultCatalogId = this.modificationCatalogId || this.baselineCatalogId || null;
      this.replaceModal.visible = true;
      this.replaceModal.originalRow = row;
      this.replaceModal.search = '';
      this.replaceModal.selectedRow = null;
      this.replaceModal.error = '';
      this.replaceModal.catalogRows = [];
      this.replaceModal.previewColumns = [];
      this.replaceModal.catalogId = defaultCatalogId;
      this.hideContextMenu();
      if (defaultCatalogId) this.loadReplaceCatalog(defaultCatalogId);
    },

    changeReplaceCatalog(catalogId) {
      this.replaceModal.catalogId = catalogId;
      this.replaceModal.selectedRow = null;
      this.replaceModal.catalogRows = [];
      this.replaceModal.previewColumns = [];
      this.replaceModal.error = '';
      if (catalogId) this.loadReplaceCatalog(catalogId);
    },

    loadReplaceCatalog(catalogId) {
      var self = this;
      this.replaceModal.loading = true;
      this.replaceModal.error = '';
      google.script.run
        .withSuccessHandler(function(rows) {
          var data = rows || [];
          self.replaceModal.catalogRows = data;
          // Pick up to 5 columns for the preview table — Nomenclature + Description first,
          // then Manufacturer/Model when present.
          if (data.length) {
            var allCols = Object.keys(data[0]);
            var preferred = ['Nomenclature', 'NOMENCLATURE', 'Description', 'DESCRIPTION', 'Manufacturer', 'Model'];
            var picked = preferred.filter(function(c) { return allCols.indexOf(c) !== -1; });
            var rest = allCols.filter(function(c) { return picked.indexOf(c) === -1; });
            self.replaceModal.previewColumns = picked.concat(rest).slice(0, 5);
          }
          self.replaceModal.loading = false;
        })
        .withFailureHandler(function(err) {
          self.replaceModal.error = (err && err.message) || String(err);
          self.replaceModal.loading = false;
        })
        .getCatalog(catalogId);
    },

    // Commit the replace: one delete ADL entry for the original row + one add
    // ADL entry for the picked catalog row, anchored below the original.
    confirmReplace() {
      var original = this.replaceModal.originalRow;
      var picked = this.replaceModal.selectedRow;
      if (!original || !picked) return;

      // Case-insensitive Nomenclature lookup on the catalog row
      var newNomenclature = picked['Nomenclature'] || picked['NOMENCLATURE'] || '';
      var newDescription  = picked['Description'] || picked['DESCRIPTION'] || '';
      var oldNomenclature = original['NOMENCLATURE'] || '';
      var now = new Date().toISOString();

      this.adl.push({
        uid: clientUid(),
        action: 'delete',
        nomenclature: oldNomenclature,
        targetUid: original._uid,
        notes: 'Replaced by ' + newNomenclature,
        timestamp: now,
      });
      this.adl.push({
        uid: clientUid(),
        action: 'add',
        nomenclature: newNomenclature,
        notes: newDescription || ('Replaces ' + oldNomenclature),
        anchorUid: original._uid,
        anchorPosition: 'below',
        timestamp: now,
      });
      this.adlDirtyFlag = true;
      this.cancelReplace();
    },

    cancelReplace() {
      this.replaceModal.visible = false;
      this.replaceModal.originalRow = null;
      this.replaceModal.selectedRow = null;
      this.replaceModal.search = '';
      this.replaceModal.catalogRows = [];
      this.replaceModal.previewColumns = [];
      this.replaceModal.error = '';
    },

    // ── Utilities ───────────────────────────────────────────────────────────

    sumPrice(rows) {
      var col = this.columnConfig.priceColumn;
      var total = 0;
      for (var i = 0; i < rows.length; i++) {
        var val = parseFloat(rows[i][col]);
        if (!isNaN(val)) total += val;
      }
      return total;
    },

    formatCurrency(num) {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatDate(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatNum(val) {
      if (val == null || isNaN(val)) return '—';
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    },

    // ── Power Table methods (v2) ─────────────────────────────────────────

    // Called when user clicks the Power Table tab — loads on first activation only
    switchToPowerTab() {
      this.activeTab = 'power-table';
      if (!this.ptLoaded) {
        this.ptInitColVisibility();
        this.loadPtMappingTableList();
        this.loadPtEquipmentTableList();
        this.loadPowerTableData();
      }
    },

    // ── Column visibility ────────────────────────────────────────────────────

    ptInitColVisibility() {
      var stored = null;
      try { stored = JSON.parse(localStorage.getItem(LS_PT_COL_KEY)); } catch (e) { /* ignore */ }
      var vis = {};
      for (var i = 0; i < EQUIPMENT_COLUMNS.length; i++) {
        var col = EQUIPMENT_COLUMNS[i];
        vis[col] = stored && stored[col] === false ? false : true;
      }
      this.ptVisibleCols = vis;
    },

    togglePtCol(col, checked) {
      this.ptVisibleCols = Object.assign({}, this.ptVisibleCols, { [col]: checked });
      try { localStorage.setItem(LS_PT_COL_KEY, JSON.stringify(this.ptVisibleCols)); } catch (e) { /* ignore */ }
    },

    resetPtCols() {
      var vis = {};
      for (var i = 0; i < EQUIPMENT_COLUMNS.length; i++) { vis[EQUIPMENT_COLUMNS[i]] = true; }
      this.ptVisibleCols = vis;
      try { localStorage.removeItem(LS_PT_COL_KEY); } catch (e) { /* ignore */ }
    },

    // ── Mapping table ────────────────────────────────────────────────────────

    loadPtMappingTableList() {
      this.ptMappingTableLoading = true;
      this.ptMappingTableError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function(list) {
          self.ptMappingTableList = list || [];
          self.ptMappingTableLoading = false;
        })
        .withFailureHandler(function(err) {
          self.ptMappingTableError = err.message || String(err);
          self.ptMappingTableLoading = false;
        })
        .listPowerMappingTables();
    },

    loadPowerMapping(tableId) {
      this.ptMappingLoading = true;
      this.ptMappingError = '';
      this.ptMappingMap = {};
      var self = this;
      google.script.run
        .withSuccessHandler(function(rows) {
          var map = {};
          if (rows) {
            for (var i = 0; i < rows.length; i++) {
              var r = rows[i];
              var key = (r['LIM'] || '') + '|' + (r['O'] || '');
              if (!map[key]) map[key] = [];
              map[key].push(r);
            }
          }
          self.ptMappingMap = map;
          self.ptMappingLoading = false;
        })
        .withFailureHandler(function(err) {
          self.ptMappingError = err.message || String(err);
          self.ptMappingLoading = false;
        })
        .getPowerMapping(tableId);
    },

    ptSelectMappingTable(tableId) {
      this.ptMappingTableId = tableId;
      this.ptShowMappingSelector = false;
      this.loadPowerMapping(tableId);
      this.schedulePtSave();
    },

    ptMappingOnFileSelected(event) {
      this.ptMappingUploadForm.file = event.target.files[0] || null;
      this.ptMappingParsedRows = [];
      this.ptMappingParsedCols = [];
      this.ptMappingParseError = '';
      this.ptMappingUploadError = '';
    },

    ptMappingParseFile() {
      if (!this.ptMappingUploadForm.file) return;
      var self = this;
      this.ptMappingParseError = '';
      Papa.parse(this.ptMappingUploadForm.file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.errors.length > 0) {
            self.ptMappingParseError = 'CSV parse error: ' + results.errors[0].message;
            return;
          }
          if (!results.data || results.data.length === 0) {
            self.ptMappingParseError = 'No data rows found in this CSV.';
            return;
          }
          var cols = results.meta.fields || Object.keys(results.data[0]);
          var required = ['LIM', 'O', 'Manufacturer', 'Model'];
          for (var i = 0; i < required.length; i++) {
            if (cols.indexOf(required[i]) === -1) {
              self.ptMappingParseError = 'CSV must have a "' + required[i] + '" column.';
              return;
            }
          }
          self.ptMappingParsedCols = cols;
          self.ptMappingParsedRows = results.data;
        },
        error: function(err) {
          self.ptMappingParseError = 'Could not parse file: ' + (err.message || String(err));
        },
      });
    },

    ptMappingUploadTable() {
      if (!this.ptMappingUploadForm.name.trim() || !this.ptMappingUploadForm.version.trim() || !this.ptMappingParsedRows.length) return;
      var payloadSize = JSON.stringify(this.ptMappingParsedRows).length;
      if (payloadSize > 8 * 1024 * 1024) {
        this.ptMappingUploadError = 'Table is too large (' + Math.round(payloadSize / 1024 / 1024) + ' MB). Maximum is ~8 MB.';
        return;
      }
      this.ptMappingUploading = true;
      this.ptMappingUploadError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function(result) {
          self.ptMappingUploading = false;
          self.ptMappingParsedRows = [];
          self.ptMappingParsedCols = [];
          self.ptMappingUploadForm = { name: '', version: '', file: null };
          if (self.$refs.ptMappingFileInput) self.$refs.ptMappingFileInput.value = '';
          self.loadPtMappingTableList();
          self.ptSelectMappingTable(result.id);
        })
        .withFailureHandler(function(err) {
          self.ptMappingUploadError = err.message || String(err);
          self.ptMappingUploading = false;
        })
        .createPowerMappingTable(this.ptMappingUploadForm.name.trim(), this.ptMappingUploadForm.version.trim(), this.ptMappingParsedRows);
    },

    ptMappingConfirmDelete(tbl) {
      this.ptMappingDeleteTarget = tbl;
      this.ptMappingDeleteError = '';
    },

    ptMappingDoDelete() {
      if (!this.ptMappingDeleteTarget) return;
      this.ptMappingDeleting = true;
      this.ptMappingDeleteError = '';
      var self = this;
      var id = this.ptMappingDeleteTarget.id;
      google.script.run
        .withSuccessHandler(function() {
          self.ptMappingDeleting = false;
          self.ptMappingDeleteTarget = null;
          if (self.ptMappingTableId === id) {
            self.ptMappingTableId = null;
            self.ptMappingMap = {};
            self.schedulePtSave();
          }
          self.loadPtMappingTableList();
        })
        .withFailureHandler(function(err) {
          self.ptMappingDeleteError = err.message || String(err);
          self.ptMappingDeleting = false;
        })
        .deletePowerMappingTable(id);
    },

    // ── Equipment table ──────────────────────────────────────────────────────

    loadPtEquipmentTableList() {
      this.ptEquipmentTableLoading = true;
      this.ptEquipmentTableError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function(list) {
          self.ptEquipmentTableList = list || [];
          self.ptEquipmentTableLoading = false;
        })
        .withFailureHandler(function(err) {
          self.ptEquipmentTableError = err.message || String(err);
          self.ptEquipmentTableLoading = false;
        })
        .listPowerEquipmentTables();
    },

    loadPowerEquipment(tableId) {
      this.ptEquipmentLoading = true;
      this.ptEquipmentError = '';
      this.ptEquipmentMap = {};
      var self = this;
      google.script.run
        .withSuccessHandler(function(rows) {
          var map = {};
          if (rows) {
            for (var i = 0; i < rows.length; i++) {
              var r = rows[i];
              var key = (r['Manufacturer'] || '') + '|' + (r['Model'] || '');
              map[key] = r;
            }
          }
          self.ptEquipmentMap = map;
          self.ptEquipmentLoading = false;
        })
        .withFailureHandler(function(err) {
          self.ptEquipmentError = err.message || String(err);
          self.ptEquipmentLoading = false;
        })
        .getPowerEquipment(tableId);
    },

    ptSelectEquipmentTable(tableId) {
      this.ptEquipmentTableId = tableId;
      this.ptShowEquipmentSelector = false;
      this.loadPowerEquipment(tableId);
      this.schedulePtSave();
    },

    ptEquipmentOnFileSelected(event) {
      this.ptEquipmentUploadForm.file = event.target.files[0] || null;
      this.ptEquipmentParsedRows = [];
      this.ptEquipmentParsedCols = [];
      this.ptEquipmentParseError = '';
      this.ptEquipmentUploadError = '';
    },

    ptEquipmentParseFile() {
      if (!this.ptEquipmentUploadForm.file) return;
      var self = this;
      this.ptEquipmentParseError = '';
      Papa.parse(this.ptEquipmentUploadForm.file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.errors.length > 0) {
            self.ptEquipmentParseError = 'CSV parse error: ' + results.errors[0].message;
            return;
          }
          if (!results.data || results.data.length === 0) {
            self.ptEquipmentParseError = 'No data rows found in this CSV.';
            return;
          }
          var cols = results.meta.fields || Object.keys(results.data[0]);
          var required = ['Manufacturer', 'Model'];
          for (var i = 0; i < required.length; i++) {
            if (cols.indexOf(required[i]) === -1) {
              self.ptEquipmentParseError = 'CSV must have a "' + required[i] + '" column.';
              return;
            }
          }
          self.ptEquipmentParsedCols = cols;
          self.ptEquipmentParsedRows = results.data;
        },
        error: function(err) {
          self.ptEquipmentParseError = 'Could not parse file: ' + (err.message || String(err));
        },
      });
    },

    ptEquipmentUploadTable() {
      if (!this.ptEquipmentUploadForm.name.trim() || !this.ptEquipmentUploadForm.version.trim() || !this.ptEquipmentParsedRows.length) return;
      var payloadSize = JSON.stringify(this.ptEquipmentParsedRows).length;
      if (payloadSize > 8 * 1024 * 1024) {
        this.ptEquipmentUploadError = 'Table is too large (' + Math.round(payloadSize / 1024 / 1024) + ' MB). Maximum is ~8 MB.';
        return;
      }
      this.ptEquipmentUploading = true;
      this.ptEquipmentUploadError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function(result) {
          self.ptEquipmentUploading = false;
          self.ptEquipmentParsedRows = [];
          self.ptEquipmentParsedCols = [];
          self.ptEquipmentUploadForm = { name: '', version: '', file: null };
          if (self.$refs.ptEquipmentFileInput) self.$refs.ptEquipmentFileInput.value = '';
          self.loadPtEquipmentTableList();
          self.ptSelectEquipmentTable(result.id);
        })
        .withFailureHandler(function(err) {
          self.ptEquipmentUploadError = err.message || String(err);
          self.ptEquipmentUploading = false;
        })
        .createPowerEquipmentTable(this.ptEquipmentUploadForm.name.trim(), this.ptEquipmentUploadForm.version.trim(), this.ptEquipmentParsedRows);
    },

    ptEquipmentConfirmDelete(tbl) {
      this.ptEquipmentDeleteTarget = tbl;
      this.ptEquipmentDeleteError = '';
    },

    ptEquipmentDoDelete() {
      if (!this.ptEquipmentDeleteTarget) return;
      this.ptEquipmentDeleting = true;
      this.ptEquipmentDeleteError = '';
      var self = this;
      var id = this.ptEquipmentDeleteTarget.id;
      google.script.run
        .withSuccessHandler(function() {
          self.ptEquipmentDeleting = false;
          self.ptEquipmentDeleteTarget = null;
          if (self.ptEquipmentTableId === id) {
            self.ptEquipmentTableId = null;
            self.ptEquipmentMap = {};
            self.schedulePtSave();
          }
          self.loadPtEquipmentTableList();
        })
        .withFailureHandler(function(err) {
          self.ptEquipmentDeleteError = err.message || String(err);
          self.ptEquipmentDeleting = false;
        })
        .deletePowerEquipmentTable(id);
    },

    // ── Project data (racks + assignments) ───────────────────────────────────

    loadPowerTableData() {
      this.ptDataLoading = true;
      this.ptDataError = '';
      var self = this;
      google.script.run
        .withSuccessHandler(function(data) {
          self.ptRacks = (data && data.racks) || [];
          self.ptAssignments = (data && data.rackAssignments) || {};
          var mappingId = (data && data.activeMappingTableId) || null;
          var equipmentId = (data && data.activeEquipmentTableId) || null;
          self.ptMappingTableId = mappingId;
          self.ptEquipmentTableId = equipmentId;
          self.ptDataLoading = false;
          self.ptLoaded = true;
          if (mappingId) self.loadPowerMapping(mappingId);
          if (equipmentId) self.loadPowerEquipment(equipmentId);
        })
        .withFailureHandler(function(err) {
          self.ptDataError = err.message || String(err);
          self.ptDataLoading = false;
          self.ptLoaded = true;
        })
        .getPowerTableData(this.projectId);
    },

    // ── Racks ────────────────────────────────────────────────────────────────

    addRack() {
      var name = this.ptNewRack.trim();
      if (!name || this.ptRacks.indexOf(name) !== -1) return;
      this.ptRacks = this.ptRacks.concat([name]);
      this.ptNewRack = '';
      this.schedulePtSave();
    },

    removeRack(rackName) {
      this.ptRacks = this.ptRacks.filter(function(r) { return r !== rackName; });
      var assignments = Object.assign({}, this.ptAssignments);
      Object.keys(assignments).forEach(function(uid) {
        if (assignments[uid] === rackName) delete assignments[uid];
      });
      this.ptAssignments = assignments;
      this.schedulePtSave();
    },

    onRackAssignment(uid, rackName) {
      var assignments = Object.assign({}, this.ptAssignments);
      if (rackName) {
        assignments[uid] = rackName;
      } else {
        delete assignments[uid];
      }
      this.ptAssignments = assignments;
      this.schedulePtSave();
    },

    // ── Save ─────────────────────────────────────────────────────────────────

    schedulePtSave() {
      if (this.ptSaveTimer) clearTimeout(this.ptSaveTimer);
      var self = this;
      this.ptSaveTimer = setTimeout(function() { self.executePtSave(); }, 800);
    },

    executePtSave() {
      this.ptSaving = true;
      this.ptSaveError = '';
      var self = this;
      var payload = {
        activeMappingTableId: this.ptMappingTableId,
        activeEquipmentTableId: this.ptEquipmentTableId,
        racks: this.ptRacks,
        rackAssignments: this.ptAssignments
      };
      google.script.run
        .withSuccessHandler(function() {
          self.ptSaving = false;
        })
        .withFailureHandler(function(err) {
          self.ptSaveError = err.message || String(err);
          self.ptSaving = false;
        })
        .savePowerTableData(this.projectId, payload);
    },

  },
};
</script>
