<template>
  <nav class="sidebar">
    <div class="sidebar-section-label">Menu</div>
    <div
      v-for="item in items"
      :key="item.id"
      class="nav-item"
      :class="{ active: current === item.id }"
      :aria-current="current === item.id ? 'page' : undefined"
      tabindex="0"
      @click="$emit('navigate', item.id)"
      @keydown.enter.space.prevent="$emit('navigate', item.id)"
    >
      <span class="icon">{{ item.icon }}</span>
      <span class="label">{{ item.label }}</span>
    </div>
  </nav>
</template>

<script>
export default {
  props: { current: String },
  emits: ['navigate'],
  data() {
    return {
      items: [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'sheets', icon: 'table_chart', label: 'My Sheets' },
        { id: 'getting-started', icon: 'rocket_launch', label: 'Getting Started' },
      ],
    };
  },
};
</script>
