<template>
  <div class="section-title">Dashboard</div>

  <div v-if="!driveFoldersConfigured" class="card" style="border-left:3px solid #F9AB00">
    <div class="card-title">
      <span class="icon" style="font-family:'Material Symbols Rounded';font-size:18px;vertical-align:middle;margin-right:6px;color:#F9AB00">folder_open</span>
      Drive Folders Not Set Up
    </div>
    <p style="color:var(--text-muted);margin-bottom:12px;line-height:1.6">
      Set up your app's Drive folder structure so spreadsheets are organized in
      <strong>app_data/</strong> and <strong>app_system/</strong>.
    </p>
    <button class="btn" @click="$emit('navigate', 'drive-setup')">
      <span class="icon">create_new_folder</span> Set Up Drive Folders
    </button>
  </div>

  <div class="card">
    <div class="card-title">Connection Status</div>
    <span class="badge ok">
      <span class="icon" style="font-family:'Material Symbols Rounded';font-size:16px">check_circle</span>
      Apps Script Connected
    </span>
    <p style="margin-top:10px;color:var(--text-muted);line-height:1.6">
      This project is linked to your AppSheet Template workflow.
      Use the actions below to interact with your data sources.
    </p>
  </div>

  <div class="card">
    <div class="card-title">Quick Actions</div>
    <div class="btn-row">
      <button class="btn" @click="checkStatus">
        <span class="icon">sync</span> Check Status
      </button>
      <button class="btn" @click="$emit('navigate', 'sheets')">
        <span class="icon">table_chart</span> View Sheets
      </button>
    </div>
    <div v-if="statusResult" class="result-box" style="display:block">{{ statusResult }}</div>
  </div>
</template>

<script>
export default {
  emits: ['navigate'],
  data() {
    return {
      statusResult: '',
      driveFoldersConfigured: true, // optimistic default; updated on mount
    };
  },
  mounted() {
    google.script.run
      .withSuccessHandler((status) => {
        this.driveFoldersConfigured = status && status.configured;
      })
      .withFailureHandler(() => {
        // If we can't check, don't show the warning
        this.driveFoldersConfigured = true;
      })
      .getFolderSetupStatus();
  },
  methods: {
    checkStatus() {
      this.statusResult = JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Apps Script project is running.',
      }, null, 2);
    },
  },
};
</script>
