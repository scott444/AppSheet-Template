<template>
  <div class="section-title">Dashboard</div>

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
    return { statusResult: '' };
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
