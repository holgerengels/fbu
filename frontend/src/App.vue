<template>
    <div class="app-layout">
        <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
            <div class="sidebar-header">
                <button class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
                    {{ sidebarCollapsed ? '☰' : '✕' }}
                </button>
                <span class="logo-text" v-show="!sidebarCollapsed">Fachberater*innen</span>
            </div>
            <nav class="sidebar-nav">
                <router-link to="/" class="nav-item" :class="{ active: $route.name === 'dashboard' }">
                    <span class="nav-icon">📊</span>
                    <span class="nav-label" v-show="!sidebarCollapsed">Dashboard</span>
                </router-link>
                <router-link to="/fachberater" class="nav-item" :class="{ active: $route.name === 'fachberater-list' || $route.name === 'fachberater-detail' }">
                    <span class="nav-icon">👥</span>
                    <span class="nav-label" v-show="!sidebarCollapsed">Fachberater</span>
                </router-link>
                <router-link to="/import" class="nav-item" :class="{ active: $route.name === 'import' }">
                    <span class="nav-icon">⚙️</span>
                    <span class="nav-label" v-show="!sidebarCollapsed">Import & Sync</span>
                </router-link>
            </nav>
            <div class="sidebar-footer" v-show="!sidebarCollapsed">
                <span class="text-muted text-sm">Fachberater v1.0</span>
            </div>
        </aside>
        <main class="main-content">
            <router-view />
        </main>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const sidebarCollapsed = ref(false)
</script>

<style scoped>
.app-layout {
    display: flex;
    min-height: 100vh;
    overflow-x: hidden;
}

.sidebar {
    width: var(--sidebar-width);
    min-height: 100vh;
    background: var(--bg-sidebar);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    transition: width var(--transition-base);
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
}
.sidebar.collapsed {
    width: 60px;
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg);
    border-bottom: 1px solid var(--border-color);
    min-height: 60px;
}
.logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}
.logo-icon {
    font-size: 1.4rem;
}
.logo-text {
    font-weight: 700;
    font-size: var(--font-md);
    letter-spacing: -0.02em;
}
.sidebar-toggle {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1.2rem;
    padding: 4px 8px;
    transition: color var(--transition-fast);
    line-height: 1;
}
.sidebar-toggle:hover {
    color: var(--text-primary);
}

.sidebar-nav {
    flex: 1;
    padding: var(--space-md) 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: 0.65rem var(--space-lg);
    color: var(--text-secondary);
    text-decoration: none;
    font-size: var(--font-base);
    font-weight: 500;
    border-left: 3px solid transparent;
    transition: all var(--transition-fast);
}
.nav-item:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.03);
}
.nav-item.active {
    color: var(--accent-blue);
    border-left-color: var(--accent-blue);
    background: var(--accent-blue-soft);
}
.nav-icon {
    font-size: 1.15rem;
    min-width: 24px;
    text-align: center;
}
.nav-label {
    white-space: nowrap;
}
.sidebar-footer {
    padding: var(--space-lg);
    border-top: 1px solid var(--border-color);
}

.main-content {
    flex: 1;
    margin-left: var(--sidebar-width);
    padding: var(--space-2xl);
    min-height: 100vh;
    overflow-x: hidden;
    transition: margin-left var(--transition-base);
}
.sidebar.collapsed ~ .main-content {
    margin-left: 60px;
}
</style>
