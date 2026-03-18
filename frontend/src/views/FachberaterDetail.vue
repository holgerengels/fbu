<template>
    <div class="detail-view fade-in">
        <!-- Top bar -->
        <div class="detail-topbar">
            <wa-button size="small" @click="$router.push('/fachberater')">← Zurück zur Liste</wa-button>
            <div class="nav-buttons" v-if="navTotal > 0">
                <wa-button size="small" :disabled="!navPrevId" @click="goTo(navPrevId)">‹ Vorheriger</wa-button>
                <span class="text-muted text-sm">{{ navIndex + 1 }} / {{ navTotal }}</span>
                <wa-button size="small" :disabled="!navNextId" @click="goTo(navNextId)">Nächster ›</wa-button>
            </div>
        </div>

        <div v-if="store.loading" class="flex items-center gap-md mt-xl">
            <wa-spinner></wa-spinner>
            <span class="text-secondary">Lade…</span>
        </div>

        <wa-callout v-else-if="store.error" variant="danger" open class="mt-lg">{{ store.error }}</wa-callout>

        <template v-else-if="fb">
            <div class="detail-header">
                <div>
                    <h1 class="page-title">{{ fb.vorname }} {{ fb.nachname }}</h1>
                    <div class="flex items-center gap-md badge-row">
                        <wa-select ref="badgeSelect" multiple with-clear size="small" class="badge-select"
                            .value="statusBadges" @wa-change="onBadgeChange">
                            <wa-option value="neu"><wa-tag variant="brand" appearance="outlined" pill size="small">Neu</wa-tag></wa-option>
                            <wa-option value="registriert"><wa-tag variant="success" appearance="outlined" pill size="small">Registriert</wa-tag></wa-option>
                            <wa-option value="vollstaendig"><wa-tag variant="warning" appearance="outlined" pill size="small">Vollständig</wa-tag></wa-option>
                        </wa-select>
                        <span class="text-secondary text-sm" v-if="fb.matchScore">Score: {{ (fb.matchScore * 100).toFixed(1) }}%</span>
                    </div>
                </div>
            </div>

            <div class="detail-layout">
                <!-- Edit form -->
                <div class="card detail-form">
                    <h2 class="section-title">Daten bearbeiten</h2>

                    <div class="form-grid">
                        <wa-input label="Vorname" :value="form.vorname" @input="e => form.vorname = e.target.value"></wa-input>
                        <wa-input label="Nachname" :value="form.nachname" @input="e => form.nachname = e.target.value"></wa-input>
                        <wa-input label="Schule" :value="form.schule" @input="e => form.schule = e.target.value"></wa-input>
                        <wa-input label="Ort" :value="form.ort" @input="e => form.ort = e.target.value"></wa-input>
                        <wa-input label="RP" :value="form.rp" @input="e => form.rp = e.target.value"></wa-input>
                        <wa-input label="Email" type="email" :value="form.email" @input="e => form.email = e.target.value"></wa-input>
                        <wa-input label="Anmeldename" :value="form.anmeldename" @input="e => form.anmeldename = e.target.value"></wa-input>
                        <wa-input label="Fächer (kommagetrennt)" :value="faecherStr" @input="e => faecherStr = e.target.value"></wa-input>
                    </div>

                    <!-- Completeness indicator -->
                    <div class="completeness mt-xl">
                        <div class="completeness-header flex items-center justify-between">
                            <span class="text-sm font-semibold">Vollständigkeit</span>
                            <span class="text-sm" :class="completeness === 100 ? 'text-complete' : 'text-secondary'">
                                {{ completeness }}%
                            </span>
                        </div>
                        <wa-progress-bar :value="completeness" style="margin-top: 0.5rem;"
                            :class="completeness === 100 ? 'progress-gold' : ''">
                        </wa-progress-bar>
                    </div>

                    <div class="flex gap-md mt-xl" style="justify-content: flex-end;">
                        <wa-button @click="resetForm">Zurücksetzen</wa-button>
                        <wa-button appearance="accent" variant="warning" @click="searchMatches" :disabled="saving || store.candidatesLoading" :loading="store.candidatesLoading">
                            {{ store.candidatesLoading ? 'Suche…' : 'Matches suchen' }}
                        </wa-button>
                        <wa-button appearance="filled" @click="save" :disabled="saving" :loading="saving">
                            {{ saving ? 'Speichere…' : 'Speichern' }}
                        </wa-button>
                    </div>

                    <wa-callout v-if="saveSuccess" variant="success" open class="mt-lg">Gespeichert ✓</wa-callout>
                </div>

                <!-- Match candidates -->
                <div class="candidates-panel" v-if="showCandidates">
                    <h2 class="section-title">Match-Kandidaten</h2>

                    <div v-if="store.candidatesLoading" class="flex items-center gap-md">
                        <wa-spinner></wa-spinner>
                        <span class="text-secondary text-sm">Suche Matches…</span>
                    </div>

                    <div v-else-if="!store.candidates.length" class="text-muted text-sm">
                        Keine Kandidaten gefunden.
                    </div>

                    <div v-else class="candidates-list">
                        <MatchCard
                            v-for="(c, i) in store.candidates"
                            :key="c._id"
                            :candidate="c"
                            :is-top-match="i === 0"
                            :disabled="saving"
                            @confirm="confirmMatch(c)"
                        />
                    </div>
                </div>

                <!-- Moodle data (when matched) -->
                <div class="card" v-if="fb.moodleData">
                    <div class="flex items-center justify-between" style="margin-bottom: var(--space-lg);">
                        <h2 class="section-title" style="margin-bottom: 0;">Moodle-Daten</h2>
                        <wa-button size="small" variant="danger" appearance="outlined" @click="doUnmatch" :disabled="saving">
                            Zuordnung aufheben
                        </wa-button>
                    </div>
                    <div class="moodle-data">
                        <div v-for="(val, key) in fb.moodleData" :key="key" class="moodle-row">
                            <span class="moodle-key">{{ key }}</span>
                            <span class="moodle-val">{{ val }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFachberaterStore } from '../stores/fachberater.js'
import StatusBadge from '../components/StatusBadge.vue'
import MatchCard from '../components/MatchCard.vue'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const store = useFachberaterStore()

const form = ref({})
const faecherStr = ref('')
const statusBadges = ref([])
const saving = ref(false)
const saveSuccess = ref(false)
const showCandidates = ref(false)

const fb = computed(() => store.current)

function searchMatches() {
    showCandidates.value = true
    store.fetchCandidates(route.params.id)
}

const completeness = computed(() => {
    const fields = ['vorname', 'nachname', 'schule', 'ort', 'rp', 'email']
    const filled = fields.filter(f => form.value[f]?.trim()).length
    const hasFaecher = faecherStr.value.trim().length > 0
    return Math.round(((filled + (hasFaecher ? 1 : 0)) / 7) * 100)
})

function resetForm() {
    if (!fb.value) return
    form.value = {
        vorname: fb.value.vorname || '',
        nachname: fb.value.nachname || '',
        schule: fb.value.schule || '',
        ort: fb.value.ort || '',
        rp: fb.value.rp || '',
        email: fb.value.email || '',
        anmeldename: fb.value.anmeldename || ''
    }
    faecherStr.value = (fb.value.faecher || []).join(', ')
    const s = fb.value.status
    statusBadges.value = Array.isArray(s) ? [...s] : (s ? [s] : ['neu'])
}

function onBadgeChange(e) {
    const val = e.target.value
    if (Array.isArray(val)) {
        statusBadges.value = [...val]
    } else if (typeof val === 'string') {
        statusBadges.value = val.trim() ? val.split(' ').filter(Boolean) : []
    } else {
        statusBadges.value = []
    }
}

const badgeSelect = ref(null)

const badgeVariants = {
    'neu': 'brand',
    'registriert': 'success',
    'nicht registriert': 'danger',
    'vollständig': 'warning'
}

function colorBadgeTags() {
    const el = badgeSelect.value
    if (!el?.shadowRoot) return
    const tags = el.shadowRoot.querySelectorAll('wa-tag')
    tags.forEach(tag => {
        const text = tag.textContent?.trim().toLowerCase()
        const variant = badgeVariants[text]
        if (variant) tag.setAttribute('variant', variant)
        tag.setAttribute('pill', '')
        tag.setAttribute('appearance', 'outlined')
    })
}

// Observe Shadow DOM for tag changes and color them
watch(badgeSelect, (el) => {
    if (!el) return
    const observer = new MutationObserver(() => colorBadgeTags())
    const tryObserve = () => {
        if (el.shadowRoot) {
            observer.observe(el.shadowRoot, { childList: true, subtree: true })
            colorBadgeTags()
        } else {
            requestAnimationFrame(tryObserve)
        }
    }
    tryObserve()
})

async function save() {
    saving.value = true
    saveSuccess.value = false
    try {
        const fields = { ...form.value }
        fields.faecher = faecherStr.value.split(',').map(s => s.trim()).filter(Boolean)
        fields.status = [...statusBadges.value]
        await store.updateOne(route.params.id, fields)
        saveSuccess.value = true
        setTimeout(() => { saveSuccess.value = false }, 3000)
    } finally {
        saving.value = false
    }
}

async function confirmMatch(candidate) {
    saving.value = true
    try {
        await store.confirmMatch(route.params.id, candidate._id, candidate.score)
        resetForm()
    } finally {
        saving.value = false
    }
}

async function reject() {
    saving.value = true
    try {
        await store.rejectMatch(route.params.id)
        resetForm()
    } finally {
        saving.value = false
    }
}

async function doUnmatch() {
    if (!confirm('Zuordnung wirklich aufheben? Die Moodle-Daten werden entfernt und der Status auf "Neu" zurückgesetzt.')) return
    saving.value = true
    try {
        await store.unmatch(route.params.id)
        resetForm()
        showCandidates.value = true
        store.fetchCandidates(route.params.id)
    } finally {
        saving.value = false
    }
}

watch(() => fb.value, () => { resetForm() }, { immediate: true })

// Navigation via backend neighbors endpoint
const navPrevId = ref(null)
const navNextId = ref(null)
const navIndex = ref(0)
const navTotal = ref(0)

async function fetchNeighbors() {
    try {
        const { data } = await axios.get(`/api/fachberater/${route.params.id}/neighbors`)
        navPrevId.value = data.prevId
        navNextId.value = data.nextId
        navIndex.value = data.index
        navTotal.value = data.total
    } catch (e) { /* ignore */ }
}

function goTo(id) {
    if (id) router.push(`/fachberater/${id}`)
}

async function loadCurrent() {
    showCandidates.value = false
    store.candidates = []
    await store.fetchOne(route.params.id)
    fetchNeighbors()
    if (store.current && (store.current.status?.includes('neu') || store.current.status?.includes('nicht_registriert'))) {
        showCandidates.value = true
        store.fetchCandidates(route.params.id)
    }
}

watch(() => route.params.id, () => {
    if (route.params.id) loadCurrent()
})

onMounted(() => {
    loadCurrent()
})
</script>

<style scoped>
.detail-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-xl);
}
.nav-buttons {
    display: flex;
    align-items: center;
    gap: var(--space-md);
}

.detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--space-2xl);
}
.page-title {
    font-size: var(--font-2xl);
    font-weight: 700;
    letter-spacing: -0.03em;
    margin-bottom: var(--space-sm);
}

.badge-row {
    flex-wrap: wrap;
}
.badge-select {
    min-width: 350px;
    --tag-max-size: 20ch;
    --wa-border-width-s: 2px;
    font-weight: 700;
}

.detail-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: var(--space-xl);
    align-items: start;
}
@media (max-width: 960px) {
    .detail-layout {
        grid-template-columns: 1fr;
    }
}

.section-title {
    font-size: var(--font-lg);
    font-weight: 600;
    margin-bottom: var(--space-xl);
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-lg);
}
@media (max-width: 600px) {
    .form-grid {
        grid-template-columns: 1fr;
    }
}

.text-complete {
    color: var(--accent-gold);
    font-weight: 600;
}

.progress-gold::part(indicator) {
    background: var(--accent-gold);
}

.candidates-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
}
.candidates-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    max-height: 60vh;
    overflow-y: auto;
}

.moodle-data {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    max-height: 300px;
    overflow-y: auto;
}
.moodle-row {
    display: flex;
    gap: var(--space-md);
    font-size: var(--font-sm);
}
.moodle-key {
    color: var(--text-muted);
    min-width: 110px;
    font-weight: 500;
}
.moodle-val {
    color: var(--text-secondary);
    word-break: break-word;
}
</style>
