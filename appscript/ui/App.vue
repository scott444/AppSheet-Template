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
import DriveSetup from './components/DriveSetup.vue';
import GettingStarted from './components/GettingStarted.vue';

// Sections that map to a sidebar nav item (sub-pages won't highlight a nav item)
var SIDEBAR_SECTIONS = ['dashboard', 'projects', 'sheets', 'drive-setup', 'getting-started'];

export default {
  components: { Sidebar, Dashboard, Projects, EqlUpload, ProjectDetail, MySheets, DriveSetup, GettingStarted },

  data() {
    return {
      currentSection: 'dashboard',
      selectedProjectId: null,
    };
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
  },
};
</script>
