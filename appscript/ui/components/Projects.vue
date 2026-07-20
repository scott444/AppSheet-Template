<template>
  <div class="section-title">Projects</div>

  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div class="card-title" style="margin-bottom:0">Equipment List Projects</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button
          v-if="needsBackfill"
          class="btn"
          style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)"
          :disabled="backfilling"
          title="Populate project number & folder link and rename folders for projects created before these fields existed"
          @click="runBackfill"
        >
          <span class="icon">{{ backfilling ? 'hourglass_empty' : 'build' }}</span>
          {{ backfilling ? 'Backfilling...' : 'Backfill legacy projects' }}
        </button>
        <button class="btn" @click="$emit('navigate', 'eql-upload')">
          <span class="icon">add</span> New Project
        </button>
      </div>
    </div>

    <div v-if="backfillMsg" class="result-box" :class="backfillError ? 'error' : ''" style="display:block;margin-bottom:12px">{{ backfillMsg }}</div>

    <!-- Loading -->
    <div v-if="loading" style="color:var(--text-muted)">Loading projects...</div>

    <!-- Error -->
    <div v-else-if="error" class="result-box error" style="display:block">{{ error }}</div>

    <!-- Empty state -->
    <div v-else-if="projects.length === 0" class="empty-state">
      No projects yet. Click "New Project" to upload your first equipment list.
    </div>

    <!-- Project table -->
    <div v-else style="overflow-x:auto">
      <table class="sheets-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Project #</th>
            <th>Project</th>
            <th>Created Date</th>
            <th>Last Modified</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in projects"
            :key="p.id"
            style="cursor:pointer"
            @click="openProject(p.id)"
          >
            <td>{{ p.customer }}</td>
            <td style="color:var(--text-muted);font-size:13px">{{ p.projectNumber || '—' }}</td>
            <td>
              <span style="display:inline-flex;align-items:center;gap:6px">
                {{ p.projectName }}
                <a
                  v-if="p.projectFolderUrl"
                  :href="p.projectFolderUrl"
                  target="_blank"
                  rel="noopener"
                  style="color:var(--primary);display:inline-flex;align-items:center"
                  title="Open project folder"
                  @click.stop
                >
                  <span class="icon" style="font-family:'Material Symbols Rounded';font-size:18px">folder_open</span>
                </a>
              </span>
            </td>
            <td style="color:var(--text-muted);font-size:13px">{{ p.date }}</td>
            <td style="color:var(--text-muted);font-size:13px">{{ p.lastModified ? p.lastModified.slice(0, 10) : '—' }}</td>
            <td style="width:80px">
              <button class="sheet-link" style="background:none;border:none;cursor:pointer;padding:0;font-size:inherit;font-family:inherit" @click.stop="openProject(p.id)">Open →</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['navigate', 'open-project'],

  data() {
    return {
      projects: [],
      loading: true,
      error: '',
      backfilling: false,
      backfillMsg: '',
      backfillError: false,
    };
  },

  computed: {
    // Legacy projects predate the projectNumber field entirely (undefined in
    // the index). After a backfill they carry an empty string instead, so the
    // button self-hides once there is nothing left to fix.
    needsBackfill() {
      return this.projects.some(function(p) { return typeof p.projectNumber === 'undefined'; });
    },
  },

  mounted() {
    this.loadProjects();
  },

  methods: {
    runBackfill() {
      this.backfilling = true;
      this.backfillMsg = '';
      this.backfillError = false;
      var self = this;
      google.script.run
        .withSuccessHandler(function(result) {
          self.backfilling = false;
          self.backfillError = (result.errors && result.errors.length > 0);
          self.backfillMsg = 'Backfill complete: ' + result.indexUpdated + ' of ' + result.total +
            ' projects updated, ' + result.foldersRenamed + ' folders renamed.' +
            (self.backfillError ? ' Errors: ' + result.errors.join('; ') : '');
          self.loadProjects();
        })
        .withFailureHandler(function(err) {
          self.backfilling = false;
          self.backfillError = true;
          self.backfillMsg = err.message || String(err);
        })
        .backfillProjectFields();
    },

    loadProjects() {
      this.loading = true;
      this.error = '';

      var self = this;
      google.script.run
        .withSuccessHandler(function(data) {
          // Sort by lastModified descending (most recently active first);
          // fall back to date for projects that predate this field.
          self.projects = (data || []).sort(function(a, b) {
            var aKey = a.lastModified || a.date;
            var bKey = b.lastModified || b.date;
            return bKey.localeCompare(aKey);
          });
          self.loading = false;
        })
        .withFailureHandler(function(err) {
          self.error = err.message || String(err);
          self.loading = false;
        })
        .listProjects();
    },

    openProject(projectId) {
      this.$emit('open-project', projectId);
    },
  },
};
</script>
