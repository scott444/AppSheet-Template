<template>
  <div class="section-title">Projects</div>

  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div class="card-title" style="margin-bottom:0">Equipment List Projects</div>
      <button class="btn" @click="$emit('navigate', 'eql-upload')">
        <span class="icon">add</span> New Project
      </button>
    </div>

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
            <th>Project</th>
            <th>Date</th>
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
            <td>{{ p.projectName }}</td>
            <td style="color:var(--text-muted);font-size:13px">{{ p.date }}</td>
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
    };
  },

  mounted() {
    this.loadProjects();
  },

  methods: {
    loadProjects() {
      this.loading = true;
      this.error = '';

      var self = this;
      google.script.run
        .withSuccessHandler(function(data) {
          // Sort by date descending (newest first)
          self.projects = (data || []).sort(function(a, b) {
            return b.date.localeCompare(a.date);
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
