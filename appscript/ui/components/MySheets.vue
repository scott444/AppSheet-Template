<template>
  <div class="section-title">My Sheets</div>

  <div class="card">
    <div class="card-title">Google Spreadsheets</div>
    <p style="color:var(--text-muted);margin-bottom:16px">
      Spreadsheets in your Google Drive that can be used as AppSheet data sources.
    </p>
    <button class="btn" :disabled="loading" @click="loadSheets">
      <span class="icon">{{ loading ? 'hourglass_empty' : 'refresh' }}</span>
      {{ loading ? 'Loading...' : (sheets ? 'Reload' : 'Load Sheets') }}
    </button>

    <div v-if="error" class="result-box error" style="display:block">Error: {{ error }}</div>

    <div v-else-if="sheets && sheets.length === 0" class="empty-state">
      No spreadsheets found in your Drive.
    </div>

    <table v-else-if="sheets && sheets.length > 0" class="sheets-table">
      <thead>
        <tr><th>Name</th><th>Spreadsheet ID</th><th>Link</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in sheets" :key="s.id">
          <td>{{ s.name }}</td>
          <td class="id-cell">{{ s.id }}</td>
          <td><a class="sheet-link" :href="s.url" target="_blank">Open ↗</a></td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty-state">Click "Load Sheets" to fetch your spreadsheets.</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      sheets: null,
      loading: false,
      error: '',
    };
  },
  methods: {
    loadSheets() {
      this.loading = true;
      this.error = '';

      google.script.run
        .withSuccessHandler((data) => {
          this.sheets = data || [];
          this.loading = false;
        })
        .withFailureHandler((err) => {
          this.error = err.message || String(err);
          this.loading = false;
        })
        .listMySpreadsheets();
    },
  },
};
</script>
