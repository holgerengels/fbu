<template>
    <div class="dashboard fade-in">
        <h1 class="page-title">Dashboard</h1>

        <div v-if="store.statsLoading" class="flex items-center gap-md">
            <wa-spinner></wa-spinner>
            <span class="text-secondary">Lade Statistiken…</span>
        </div>

        <template v-else-if="store.stats">
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-value">{{ store.stats.total }}</div>
                    <div class="stat-label">Gesamt</div>
                </div>
                <div class="stat-card stat-blue">
                    <div class="stat-value">{{ store.stats.neu }}</div>
                    <div class="stat-label">Neu</div>
                </div>
                <div class="stat-card stat-green">
                    <div class="stat-value">{{ store.stats.registriert }}</div>
                    <div class="stat-label">Registriert</div>
                </div>
                <div class="stat-card stat-red">
                    <div class="stat-value">{{ store.stats.nicht_registriert }}</div>
                    <div class="stat-label">Nicht registriert</div>
                </div>
                <div class="stat-card stat-gold">
                    <div class="stat-value">{{ store.stats.vollstaendig }}</div>
                    <div class="stat-label">Vollständig</div>
                </div>
            </div>

            <!-- Progress -->
            <div class="card mt-xl">
                <h2 class="section-title">Fortschritt</h2>
                <div class="progress-bars">
                    <div class="progress-row">
                        <span class="progress-label">Registriert</span>
                        <div class="progress-track">
                            <div class="progress-fill fill-green" :style="{ width: pct('registriert') }"></div>
                        </div>
                        <span class="progress-pct">{{ pct('registriert') }}</span>
                    </div>
                    <div class="progress-row">
                        <span class="progress-label">Vollständig</span>
                        <div class="progress-track">
                            <div class="progress-fill fill-gold" :style="{ width: pct('vollstaendig') }"></div>
                        </div>
                        <span class="progress-pct">{{ pct('vollstaendig') }}</span>
                    </div>
                    <div class="progress-row">
                        <span class="progress-label">Nicht registriert</span>
                        <div class="progress-track">
                            <div class="progress-fill fill-red" :style="{ width: pct('nicht_registriert') }"></div>
                        </div>
                        <span class="progress-pct">{{ pct('nicht_registriert') }}</span>
                    </div>
                    <div class="progress-row">
                        <span class="progress-label">Offen</span>
                        <div class="progress-track">
                            <div class="progress-fill fill-blue" :style="{ width: pct('neu') }"></div>
                        </div>
                        <span class="progress-pct">{{ pct('neu') }}</span>
                    </div>
                </div>
            </div>

            <!-- RP Distribution -->
            <div class="card mt-xl" v-if="store.stats.byRp && store.stats.byRp.length">
                <h2 class="section-title">Verteilung nach RP</h2>
                <div class="rp-chart">
                    <div class="rp-bar-row" v-for="rp in store.stats.byRp" :key="rp.rp">
                        <span class="rp-label">{{ rp.rp || '(kein)' }}</span>
                        <div class="rp-track">
                            <div class="rp-fill" :style="{ width: rpPct(rp.count) }"></div>
                        </div>
                        <span class="rp-count">{{ rp.count }}</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useFachberaterStore } from '../stores/fachberater.js'

const store = useFachberaterStore()

onMounted(() => {
    store.fetchStats()
})

function pct(key) {
    if (!store.stats || !store.stats.total) return '0%'
    return Math.round((store.stats[key] / store.stats.total) * 100) + '%'
}

function rpPct(count) {
    if (!store.stats) return '0%'
    const max = Math.max(...store.stats.byRp.map(r => r.count))
    return Math.round((count / max) * 100) + '%'
}
</script>

<style scoped>
.page-title {
    font-size: var(--font-2xl);
    font-weight: 700;
    margin-bottom: var(--space-2xl);
    letter-spacing: -0.03em;
}

.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--space-lg);
}
.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    backdrop-filter: blur(12px);
    text-align: center;
    transition: all var(--transition-base);
}
.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}
.stat-value {
    font-size: var(--font-2xl);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    margin-bottom: var(--space-xs);
}
.stat-label {
    font-size: var(--font-sm);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.stat-blue .stat-value { color: var(--accent-blue); }
.stat-green .stat-value { color: var(--accent-green); }
.stat-red .stat-value { color: var(--accent-red); }
.stat-gold .stat-value { color: var(--accent-gold); }

.section-title {
    font-size: var(--font-lg);
    font-weight: 600;
    margin-bottom: var(--space-xl);
}

.progress-bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
}
.progress-row {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
}
.progress-label {
    min-width: 140px;
    font-size: var(--font-sm);
    color: var(--text-secondary);
}
.progress-track {
    flex: 1;
    height: 8px;
    background: var(--bg-input);
    border-radius: var(--radius-full);
    overflow: hidden;
}
.progress-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.fill-blue { background: var(--accent-blue); }
.fill-green { background: var(--accent-green); }
.fill-red { background: var(--accent-red); }
.fill-gold { background: var(--accent-gold); }

.progress-pct {
    min-width: 40px;
    text-align: right;
    font-size: var(--font-sm);
    font-weight: 600;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
}

/* RP Chart */
.rp-chart {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}
.rp-bar-row {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
}
.rp-label {
    min-width: 140px;
    font-size: var(--font-sm);
    color: var(--text-secondary);
}
.rp-track {
    flex: 1;
    height: 24px;
    background: var(--bg-input);
    border-radius: var(--radius-sm);
    overflow: hidden;
}
.rp-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
    border-radius: var(--radius-sm);
    transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.rp-count {
    min-width: 30px;
    text-align: right;
    font-size: var(--font-sm);
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
}
</style>
