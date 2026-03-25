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
          title: 'Define your app locally',
          desc: 'Create <code>apps/&lt;name&gt;/definition.json</code> using <code>npm run dev -- init -n "MyApp"</code>',
        },
        {
          num: 2,
          title: 'Validate & generate schema',
          desc: 'Run <code>npm run dev -- validate -d apps/MyApp</code> then <code>npm run dev -- gen-schema -d apps/MyApp</code>',
        },
        {
          num: 3,
          title: 'Create the Google Sheet',
          desc: 'Open this Apps Script project and run <code>createSpreadsheetFromSchema(schema)</code> with the contents of your generated <code>sheet-schema.json</code>.',
        },
        {
          num: 4,
          title: 'Create your AppSheet app',
          desc: 'Go to <strong>appsheet.com</strong>, click <strong>Create &gt; App &gt; Start with existing data</strong>, and select the Google Sheet you just created.',
        },
      ],
    };
  },
};
</script>
