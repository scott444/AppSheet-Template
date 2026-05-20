<template>
  <div class="section-title">Getting Started</div>

  <div class="card">
    <div class="card-title">Setup Workflow</div>
    <div class="steps">
      <div v-for="step in steps" :key="step.num" class="step">
        <div class="step-number">{{ step.num }}</div>
        <div class="step-body">
          <div class="step-title">{{ step.title }}</div>
          <div class="step-desc" v-html="step.desc"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      steps: [
        {
          num: 1,
          title: 'Run Drive Setup',
          desc: 'Navigate to <strong>Drive Setup</strong> in the sidebar and enter your app name. This creates the <code>Project_Manager/app_data/</code> and <code>Project_Manager/app_system/</code> folder tree in your Google Drive.',
        },
        {
          num: 2,
          title: 'Create a project from an EQL',
          desc: 'Go to <strong>Projects</strong> and click <strong>New Project</strong>. Upload your XLSX equipment list — the app creates a project folder with <code>EQL.json</code> and <code>ADL.json</code> in Drive.',
        },
        {
          num: 3,
          title: 'Manage your equipment list',
          desc: 'Open a project and use the <strong>Baseline</strong>, <strong>Modifications</strong>, and <strong>Final</strong> tabs to review and track adds/deletes against the original EQL.',
        },
        {
          num: 4,
          title: 'Upload catalogs and power tables',
          desc: 'Use <strong>Product Catalog</strong> to upload versioned CSV catalogs, and <strong>Power Tables</strong> to upload mapping and equipment CSVs for rack power calculations.',
        },
      ],
    };
  },
};
</script>
