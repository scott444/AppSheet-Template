<template>
  <div class="section-title">Drive Setup</div>

  <!-- Configured state -->
  <div v-if="status && status.configured" class="card">
    <div class="card-title">
      <span class="icon" style="font-family:'Material Symbols Rounded';font-size:18px;vertical-align:middle;margin-right:6px">check_circle</span>
      Folders Configured
    </div>
    <p style="color:var(--text-muted);margin-bottom:16px">
      Drive folders are set up for <strong>{{ status.appName }}</strong>.
    </p>
    <table class="sheets-table">
      <thead>
        <tr><th>Folder</th><th>Purpose</th><th>Link</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ status.appName }}/</td>
          <td style="color:var(--text-muted)">App root</td>
          <td><a class="sheet-link" :href="status.rootUrl" target="_blank">Open ↗</a></td>
        </tr>
        <tr>
          <td>app_data/</td>
          <td style="color:var(--text-muted)">User spreadsheets</td>
          <td><a class="sheet-link" :href="status.appDataUrl" target="_blank">Open ↗</a></td>
        </tr>
        <tr>
          <td>app_system/</td>
          <td style="color:var(--text-muted)">System data</td>
          <td><a class="sheet-link" :href="status.appSystemUrl" target="_blank">Open ↗</a></td>
        </tr>
      </tbody>
    </table>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn" :disabled="loading" @click="showSetupForm = true">
        <span class="icon">settings</span> Re-run Setup
      </button>
    </div>
  </div>

  <!-- Setup form (not yet configured, or re-run requested) -->
  <div v-if="status !== null && (!status.configured || showSetupForm)" class="card">
    <div class="card-title">Configure Drive Folders</div>
    <p style="color:var(--text-muted);margin-bottom:16px">
      Enter your app name to create the Drive folder structure.
      This matches <code>settings.appName</code> in your <code>definition.json</code>.
    </p>
    <p style="color:var(--text-muted);margin-bottom:16px;font-size:13px">
      Folders will be created at:
      <strong>My Drive / &lt;AppName&gt; / app_data/</strong> and
      <strong>app_system/</strong>
    </p>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input
        v-model="appName"
        type="text"
        placeholder="e.g. MyApp"
        style="padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;flex:1;min-width:160px;background:var(--bg);color:var(--text)"
        @keydown.enter="runSetup"
      />
      <button class="btn" :disabled="loading || !appName.trim()" @click="runSetup">
        <span class="icon">{{ loading ? 'hourglass_empty' : 'create_new_folder' }}</span>
        {{ loading ? 'Setting up...' : 'Setup Folders' }}
      </button>
    </div>

    <div v-if="error" class="result-box error" style="display:block;margin-top:12px">
      Error: {{ error }}
    </div>
  </div>

  <!-- Loading initial status -->
  <div v-if="status === null && !error" class="card">
    <p style="color:var(--text-muted)">Checking folder status...</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      status: null,    // null = loading, object = loaded
      appName: '',
      loading: false,
      error: '',
      showSetupForm: false,
    };
  },
  mounted() {
    this.loadStatus();
  },
  methods: {
    loadStatus() {
      google.script.run
        .withSuccessHandler((data) => {
          this.status = data;
          // Pre-fill app name if already set
          if (data && data.appName) {
            this.appName = data.appName;
          }
        })
        .withFailureHandler((err) => {
          this.error = err.message || String(err);
          this.status = { configured: false };
        })
        .getFolderSetupStatus();
    },
    runSetup() {
      if (!this.appName.trim()) return;
      this.loading = true;
      this.error = '';

      google.script.run
        .withSuccessHandler((result) => {
          this.loading = false;
          this.showSetupForm = false;
          // Reload status to show the configured state
          this.loadStatus();
        })
        .withFailureHandler((err) => {
          this.error = err.message || String(err);
          this.loading = false;
        })
        .setupFolders(this.appName.trim());
    },
  },
};
</script>
