<template>
  <header class="topbar">
    <span class="topbar-logo">AppSheet Template</span>
    <div class="topbar-spacer"></div>
    <div class="topbar-status">
      <span class="status-dot"></span>
      <span>Connected</span>
    </div>
  </header>

  <div class="shell">
    <Sidebar :current="currentSection" @navigate="navigate" />

    <main class="content">
      <Dashboard v-if="currentSection === 'dashboard'" @navigate="navigate" />
      <MySheets v-if="currentSection === 'sheets'" />
      <DriveSetup v-if="currentSection === 'drive-setup'" />
      <GettingStarted v-if="currentSection === 'getting-started'" />
    </main>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue';
import Dashboard from './components/Dashboard.vue';
import MySheets from './components/MySheets.vue';
import GettingStarted from './components/GettingStarted.vue';
import DriveSetup from './components/DriveSetup.vue';

export default {
  components: { Sidebar, Dashboard, MySheets, GettingStarted, DriveSetup },
  data() {
    return { currentSection: 'dashboard' };
  },
  methods: {
    navigate(name) {
      this.currentSection = name;
    },
  },
};
</script>
