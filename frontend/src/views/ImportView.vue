<template>
    <div class="import-view fade-in">
        <h1 class="page-title">Import & Sync</h1>

        <!-- Error -->
        <wa-callout v-if="store.error" variant="danger" open class="mb-lg">{{ store.error }}</wa-callout>

        <!-- Action cards -->
        <div class="action-grid">
            <!-- CSV Import -->
            <div class="action-card card">
                <div class="action-icon">📄</div>
                <h3 class="action-title">CSV-Import</h3>
                <p class="action-desc">Fachberater aus <code>config/input.csv</code> einlesen.</p>
                <wa-button appearance="filled" @click="doAction('csv')" :disabled="loading" :loading="loading === 'csv'">
                    {{ loading === 'csv' ? 'Importiere…' : 'CSV importieren' }}
                </wa-button>
            </div>

            <!-- Moodle Import -->
            <div class="action-card card">
                <div class="action-icon">🎓</div>
                <h3 class="action-title">Moodle-Import</h3>
                <p class="action-desc">Profile vom Fachnetz Moodle abrufen und cachen. Basis für das Matching.</p>
                <wa-button appearance="filled" @click="doAction('moodle')" :disabled="loading" :loading="loading === 'moodle'">
                    {{ loading === 'moodle' ? 'Importiere…' : 'Moodle laden' }}
                </wa-button>
            </div>

            <!-- KUR Import -->
            <div class="action-card card">
                <div class="action-icon">📚</div>
                <h3 class="action-title">Kraut und Rüben Import</h3>
                <p class="action-desc">Fächer aus <code>config/kur.csv</code> den Fachberatern zuordnen. Abkürzungen werden übersetzt.</p>
                <wa-button appearance="filled" @click="doAction('kur')" :disabled="loading || !canKur" :loading="loading === 'kur'">
                    {{ loading === 'kur' ? 'Importiere…' : 'KUR importieren' }}
                </wa-button>
                <span v-if="!canKur" class="text-muted text-sm">⚠ CSV muss zuerst eingelesen werden</span>
            </div>

            <!-- Auto-Match -->
            <div class="action-card card">
                <div class="action-icon">🔗</div>
                <h3 class="action-title">Auto-Match</h3>
                <p class="action-desc">Eindeutige Matches über Jaro-Winkler Ähnlichkeit automatisch zuordnen.</p>
                <div class="threshold-row">
                    <label class="text-sm text-secondary">Schwellwert:</label>
                    <wa-input class="threshold-input" type="number" :value="String(threshold)" @input="e => threshold = parseFloat(e.target.value) || 0.85" size="small"></wa-input>
                </div>
                <wa-button appearance="accent" variant="warning" @click="doAction('auto')" :disabled="loading || !canAutoMatch" :loading="loading === 'auto'">
                    {{ loading === 'auto' ? 'Matche…' : 'Auto-Match starten' }}
                </wa-button>
                <span v-if="!canAutoMatch" class="text-muted text-sm">⚠ CSV und Moodle müssen zuerst eingelesen werden</span>
            </div>

            <!-- CSV Export -->
            <div class="action-card card">
                <div class="action-icon">📥</div>
                <h3 class="action-title">CSV-Export</h3>
                <p class="action-desc">Alle Fachberater-Daten als CSV-Datei herunterladen.</p>
                <wa-button @click="doExport">CSV herunterladen</wa-button>
            </div>

            <!-- Moodle Sync -->
            <div class="action-card card">
                <div class="action-icon">🔄</div>
                <h3 class="action-title">Moodle-Sync</h3>
                <p class="action-desc">Vollständige Daten (z.B. Fächer) ins Fachnetz-Profil zurückschreiben.</p>
                <wa-button disabled>Zu Moodle synchen</wa-button>
                <span class="text-muted text-sm">⚠ Deaktiviert</span>
            </div>

            <!-- Delete all -->
            <div class="action-card card">
                <div class="action-icon">🗑️</div>
                <h3 class="action-title">Daten löschen</h3>
                <p class="action-desc">Alle Fachberater aus der MongoDB löschen. Diese Aktion kann nicht rückgängig gemacht werden.</p>
                <wa-button appearance="accent" variant="danger" @click="doDelete" :disabled="loading" :loading="loading === 'delete'">
                    {{ loading === 'delete' ? 'Lösche…' : 'Alle löschen' }}
                </wa-button>
            </div>
        </div>

        <!-- Result panel -->
        <div class="card result-panel mt-xl" v-if="result">
            <h3 class="section-title">Ergebnis</h3>
            <div class="result-content">
                <template v-if="result.type === 'csv-import'">
                    <div class="result-row"><span class="result-label">Importiert</span><span class="result-value val-green">{{ result.imported }}</span></div>
                    <div class="result-row"><span class="result-label">Übersprungen</span><span class="result-value">{{ result.skipped }}</span></div>
                    <div class="result-row"><span class="result-label">Gesamt CSV</span><span class="result-value">{{ result.total }}</span></div>
                </template>
                <template v-else-if="result.type === 'kur-import'">
                    <div class="result-row"><span class="result-label">Zugeordnet</span><span class="result-value val-green">{{ result.matched }}</span></div>
                    <div class="result-row"><span class="result-label">Übersprungen</span><span class="result-value">{{ result.skipped }}</span></div>
                    <div class="result-row"><span class="result-label">Kein Match</span><span class="result-value" :class="{ 'val-red': result.noMatch }">{{ result.noMatch }}</span></div>
                    <div class="result-row"><span class="result-label">Gesamt</span><span class="result-value">{{ result.total }}</span></div>
                </template>
                <template v-else-if="result.type === 'moodle-import'">
                    <div class="result-row"><span class="result-label">Importiert</span><span class="result-value val-green">{{ result.imported }}</span></div>
                    <div class="result-row"><span class="result-label">Aktualisiert</span><span class="result-value">{{ result.updated }}</span></div>
                    <div class="result-row"><span class="result-label">Gesamt</span><span class="result-value">{{ result.total }}</span></div>
                </template>
                <template v-else-if="result.type === 'auto-match'">
                    <div class="result-row"><span class="result-label">Zugeordnet</span><span class="result-value val-green">{{ result.matched }}</span></div>
                    <div class="result-row"><span class="result-label">Offene (Neu)</span><span class="result-value">{{ result.totalNeu }}</span></div>
                    <div class="result-row"><span class="result-label">Moodle-Profile</span><span class="result-value">{{ result.totalMoodle }}</span></div>
                    <div class="result-row"><span class="result-label">Schwellwert</span><span class="result-value">{{ result.threshold }}</span></div>
                </template>
                <template v-else-if="result.type === 'sync'">
                    <div class="result-row"><span class="result-label">Synchronisiert</span><span class="result-value val-green">{{ result.synced }}</span></div>
                    <div class="result-row"><span class="result-label">Fehlgeschlagen</span><span class="result-value" :class="{ 'val-red': result.failed }">{{ result.failed }}</span></div>
                    <div class="result-row"><span class="result-label">Gesamt</span><span class="result-value">{{ result.total }}</span></div>
                    <div v-if="result.errors && result.errors.length" class="result-errors mt-lg">
                        <div class="text-sm text-secondary font-semibold mb-lg">Fehler:</div>
                        <div v-for="e in result.errors" :key="e.id" class="error-line text-sm">
                            {{ e.name }}: {{ e.error }}
                        </div>
                    </div>
                </template>
                <template v-else-if="result.type === 'delete'">
                    <div class="result-row"><span class="result-label">Gelöscht</span><span class="result-value val-red">{{ result.deleted }}</span></div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFachberaterStore } from '../stores/fachberater.js'

const store = useFachberaterStore()
const loading = ref(null)
const threshold = ref(0.85)

const result = computed(() => store.lastResult)

const canKur = computed(() => {
    return store.stats && store.stats.total > 0
})

const canAutoMatch = computed(() => {
    return store.stats && store.stats.total > 0 && store.stats.moodleProfiles > 0
})

onMounted(() => {
    store.fetchStats()
})

async function doAction(type) {
    loading.value = type
    store.lastResult = null
    try {
        switch (type) {
            case 'csv': await store.importCsv(); break
            case 'moodle': await store.importMoodle(); break
            case 'kur': await store.importKur(); break
            case 'auto': await store.autoMatch(threshold.value); break
            case 'sync': await store.syncToMoodle(); break
        }
    } finally {
        loading.value = null
        store.fetchStats()
    }
}

function doExport() {
    window.open('/api/fachberater/export', '_blank')
}

async function doDelete() {
    if (!confirm('Wirklich ALLE Fachberater löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) return
    loading.value = 'delete'
    store.lastResult = null
    try {
        await store.deleteAll()
    } finally {
        loading.value = null
    }
}
</script>

<style scoped>
.page-title {
    font-size: var(--font-2xl);
    font-weight: 700;
    letter-spacing: -0.03em;
    margin-bottom: var(--space-2xl);
}

.action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-lg);
}
.action-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}
.action-icon {
    font-size: 2rem;
}
.action-title {
    font-size: var(--font-md);
    font-weight: 600;
}
.action-desc {
    font-size: var(--font-sm);
    color: var(--text-secondary);
    line-height: 1.5;
    flex: 1;
}
.action-desc code {
    background: var(--bg-input);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
    font-size: var(--font-xs);
}

.threshold-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}
.threshold-input {
    width: 80px;
}

.section-title {
    font-size: var(--font-lg);
    font-weight: 600;
    margin-bottom: var(--space-lg);
}

.result-panel {
    max-width: 500px;
}
.result-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}
.result-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--border-color);
    font-size: var(--font-base);
}
.result-label {
    color: var(--text-secondary);
}
.result-value {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}
.val-green { color: var(--accent-green); }
.val-red { color: var(--accent-red); }

.result-errors {
    border-top: 1px solid var(--border-color);
    padding-top: var(--space-md);
}
.error-line {
    color: var(--accent-red);
    padding: var(--space-xs) 0;
}
</style>
