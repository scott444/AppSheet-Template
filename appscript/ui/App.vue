<template>
  <header class="topbar">
    <span class="topbar-logo">Project Manager</span>
    <div class="topbar-spacer"></div>
    <button
      class="theme-toggle"
      :title="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="toggleTheme"
    >
      <span class="icon">{{ theme === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
    </button>
    <div class="topbar-status">
      <span class="status-dot"></span>
      <span>Connected</span>
    </div>
  </header>

  <div class="shell">
    <Sidebar :current="sidebarSection" @navigate="navigate" />

    <main class="content">
      <Dashboard v-if="currentSection === 'dashboard'" @navigate="navigate" />
      <Projects
        v-if="currentSection === 'projects'"
        @navigate="navigate"
        @open-project="openProject"
      />
      <EqlUpload
        v-if="currentSection === 'eql-upload'"
        @navigate="navigate"
        @open-project="openProject"
      />
      <ProjectDetail
        v-if="currentSection === 'project-detail'"
        :project-id="selectedProjectId"
        @navigate="navigate"
      />
      <ProductCatalog v-if="currentSection === 'product-catalog'" />
      <PowerTables v-if="currentSection === 'power-tables'" />
      <MySheets v-if="currentSection === 'sheets'" />
      <DriveSetup v-if="currentSection === 'drive-setup'" />
      <GettingStarted v-if="currentSection === 'getting-started'" />
    </main>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue';
import Dashboard from './components/Dashboard.vue';
import Projects from './components/Projects.vue';
import EqlUpload from './components/EqlUpload.vue';
import ProjectDetail from './components/ProjectDetail.vue';
import MySheets from './components/MySheets.vue';
import ProductCatalog from './components/ProductCatalog.vue';
import PowerTables from './components/PowerTables.vue';
import DriveSetup from './components/DriveSetup.vue';
import GettingStarted from './components/GettingStarted.vue';

// Sections that map to a sidebar nav item (sub-pages won't highlight a nav item)
var SIDEBAR_SECTIONS = ['dashboard', 'projects', 'product-catalog', 'power-tables', 'sheets', 'drive-setup', 'getting-started'];

export default {
  components: { Sidebar, Dashboard, Projects, EqlUpload, ProjectDetail, MySheets, ProductCatalog, PowerTables, DriveSetup, GettingStarted },

  data() {
    return {
      currentSection: 'dashboard',
      selectedProjectId: null,
      theme: 'light',
    };
  },

  mounted() {
    this.initTheme();
  },

  computed: {
    // Highlight "projects" in the sidebar for project sub-pages
    sidebarSection() {
      if (this.currentSection === 'eql-upload' || this.currentSection === 'project-detail') {
        return 'projects';
      }
      return this.currentSection;
    },
  },

  methods: {
    navigate(name) {
      this.currentSection = name;
    },

    openProject(projectId) {
      this.selectedProjectId = projectId;
      this.currentSection = 'project-detail';
    },

    // Theme: use the stored preference if the user has chosen one, otherwise
    // follow the OS setting. localStorage can throw inside the Apps Script
    // sandbox iframe, so every access is guarded.
    initTheme() {
      var stored = null;
      try { stored = window.localStorage.getItem('pm-theme'); } catch (e) { /* sandboxed */ }
      var theme = stored;
      if (theme !== 'dark' && theme !== 'light') {
        var prefersDark = false;
        try { prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { /* ignore */ }
        theme = prefersDark ? 'dark' : 'light';
      }
      this.applyTheme(theme, false);
    },

    applyTheme(theme, persist) {
      this.theme = theme;
      try { document.documentElement.setAttribute('data-theme', theme); } catch (e) { /* ignore */ }
      if (persist) {
        try { window.localStorage.setItem('pm-theme', theme); } catch (e) { /* sandboxed */ }
      }
    },

    toggleTheme() {
      this.applyTheme(this.theme === 'dark' ? 'light' : 'dark', true);
    },
  },
};
</script>
