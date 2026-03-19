<template>
    <div class="list-view fade-in">
        <div class="page-header">
            <h1 class="page-title">Fachberater*innen</h1>
            <div class="header-meta text-secondary text-sm">{{ store.total }} Einträge</div>
        </div>

        <!-- Filters -->
        <div class="filter-bar card">
            <wa-input
                class="filter-search"
                placeholder="Suche nach Name, Schule, Ort…"
                with-clear
                :value="store.filterSearch"
                @input="onSearch($event.target.value)"
                @wa-clear="onSearch('')"
            ></wa-input>
            <wa-select class="filter-select" :value="store.filterRp" @change="store.setFilters({ rp: $event.target.value })">
                <wa-option value="">Alle RPs</wa-option>
                <wa-option v-for="rp in rpOptions" :key="rp" :value="rp">{{ rp }}</wa-option>
            </wa-select>
            <wa-select class="filter-select" :value="store.filterStatus" @change="store.setFilters({ status: $event.target.value })">
                <wa-option value="">Alle Status</wa-option>
                <wa-option value="neu">Neu</wa-option>
                <wa-option value="registriert">Registriert</wa-option>
                <wa-option value="nicht_registriert">Nicht registriert</wa-option>
                <wa-option value="vollstaendig">Vollständig</wa-option>
            </wa-select>
        </div>

        <!-- Loading -->
        <div v-if="store.loading" class="flex items-center gap-md mt-xl" style="justify-content: center;">
            <wa-spinner></wa-spinner>
            <span class="text-secondary">Lade…</span>
        </div>

        <!-- Error -->
        <wa-callout v-else-if="store.error" variant="danger" open class="mt-lg">{{ store.error }}</wa-callout>

        <!-- Table -->
        <div v-else class="table-wrap mt-lg">
            <table>
                <thead>
                    <tr>
                        <th class="sortable" @click="store.setSort('nachname')">Nachname <span class="sort-icon">{{ sortIcon('nachname') }}</span></th>
                        <th class="sortable" @click="store.setSort('vorname')">Vorname <span class="sort-icon">{{ sortIcon('vorname') }}</span></th>
                        <th>Schule</th>
                        <th class="sortable" @click="store.setSort('ort')">Ort <span class="sort-icon">{{ sortIcon('ort') }}</span></th>
                        <th>RP</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th class="sortable" @click="store.setSort('matchScore')">Score <span class="sort-icon">{{ sortIcon('matchScore') }}</span></th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="fb in store.items"
                        :key="fb._id"
                        class="clickable"
                        @click="$router.push(`/fachberater/${fb._id}`)"
                    >
                        <td class="font-semibold">{{ fb.nachname }}</td>
                        <td>{{ fb.vorname }}</td>
                        <td class="cell-ellipsis" :title="fb.schule">{{ fb.schule }}</td>
                        <td>{{ fb.ort }}</td>
                        <td>{{ fb.rp }}</td>
                        <td class="text-secondary">{{ fb.email || '—' }}</td>
                        <td>
                            <span class="badge-list">
                                <wa-tag v-for="s in badgeArray(fb.status)" :key="s" :variant="badgeVariant(s)" appearance="outlined" pill size="small">{{ badgeLabel(s) }}</wa-tag>
                            </span>
                        </td>
                        <td class="text-muted">{{ fb.matchScore ? (fb.matchScore * 100).toFixed(1) + '%' : '—' }}</td>
                    </tr>
                    <tr v-if="!store.items.length">
                        <td colspan="8" style="text-align:center; padding: 2rem;">
                            <span class="text-muted">Keine Fachberater gefunden</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" v-if="store.pages > 1">
            <wa-button size="small" @click="store.setPage(store.page - 1)" :disabled="store.page <= 1">‹</wa-button>
            <template v-for="p in displayedPages" :key="p">
                <wa-button size="small" v-if="p === '...'" disabled>…</wa-button>
                <wa-button size="small" v-else :appearance="p === store.page ? 'filled' : 'outlined'" @click="store.setPage(p)">{{ p }}</wa-button>
            </template>
            <wa-button size="small" @click="store.setPage(store.page + 1)" :disabled="store.page >= store.pages">›</wa-button>
        </div>
    </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue'
import { useFachberaterStore } from '../stores/fachberater.js'
import StatusBadge from '../components/StatusBadge.vue'

const store = useFachberaterStore()

let searchTimeout = null

onMounted(() => {
    store.fetchList()
    if (!store.stats) store.fetchStats()
})

function onSearch(val) {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        store.setFilters({ search: val })
    }, 300)
}

const rpOptions = computed(() => {
    if (store.stats?.byRp) {
        return store.stats.byRp.map(r => r.rp).filter(Boolean).sort()
    }
    return []
})

const badgeMap = {
    neu: { label: 'Neu', variant: 'brand' },
    registriert: { label: 'Registriert', variant: 'success' },
    nicht_registriert: { label: 'Nicht registriert', variant: 'danger' },
    vollstaendig: { label: 'Vollständig', variant: 'warning' }
}

function badgeArray(status) {
    if (Array.isArray(status)) return status
    return status ? [status] : []
}

function badgeVariant(s) {
    return badgeMap[s]?.variant || 'neutral'
}

function badgeLabel(s) {
    return badgeMap[s]?.label || s
}

const displayedPages = computed(() => {
    const total = store.pages
    const current = store.page
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

    const pages = []
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i)
    }
    if (current < total - 2) pages.push('...')
    pages.push(total)
    return pages
})

function sortIcon(field) {
    if (store.sortBy !== field) return ''
    return store.sortOrder === 'asc' ? '▲' : '▼'
}
</script>

<style scoped>
.page-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
}
.page-title {
    font-size: var(--font-2xl);
    font-weight: 700;
    letter-spacing: -0.03em;
}

.filter-bar {
    display: flex;
    gap: var(--space-md);
    align-items: center;
    flex-wrap: wrap;
    padding: var(--space-lg);
}
.filter-search {
    flex: 1;
    min-width: 200px;
}
.filter-select {
    width: auto;
    min-width: 160px;
}
.cell-ellipsis {
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.badge-list {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}

th.sortable {
    cursor: pointer;
    user-select: none;
    transition: color var(--transition-fast);
}
th.sortable:hover {
    color: var(--text-primary);
}
.sort-icon {
    font-size: 0.7em;
    margin-left: 0.25em;
    opacity: 0.8;
}
</style>
