<template>
    <div class="match-card" :class="{ 'top-match': isTopMatch }">
        <div class="match-header">
            <div class="match-name">{{ candidate.vorname || candidate.nachname ? `${candidate.vorname} ${candidate.nachname}` : '—' }}</div>
            <div class="match-score" :class="scoreClass">
                {{ (candidate.score * 100).toFixed(1) }}%
            </div>
        </div>
        <div class="match-details">
            <div class="detail-row" v-if="candidate.schulname || candidate.schulort">
                <span class="detail-label">Schule</span>
                <span class="detail-value">{{ candidate.schulname }} {{ candidate.schulort ? `(${candidate.schulort})` : '' }}</span>
            </div>
            <div class="detail-row" v-if="candidate.email">
                <span class="detail-label">Email</span>
                <span class="detail-value">{{ candidate.email }}</span>
            </div>
            <div class="detail-row" v-if="candidate.anmeldename">
                <span class="detail-label">Login</span>
                <span class="detail-value">{{ candidate.anmeldename }}</span>
            </div>
            <div class="detail-row" v-if="candidate.rp">
                <span class="detail-label">RP</span>
                <span class="detail-value">{{ candidate.rp }}</span>
            </div>
        </div>
        <div class="match-score-bar">
            <div class="score-fill" :class="scoreClass" :style="{ width: (candidate.score * 100) + '%' }"></div>
        </div>
        <div class="match-actions">
            <wa-button size="small" appearance="accent" variant="success" @click="$emit('confirm')" :disabled="disabled">
                ✓ Zuordnen
            </wa-button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    candidate: { type: Object, required: true },
    isTopMatch: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
})

defineEmits(['confirm'])

const scoreClass = computed(() => {
    const s = props.candidate.score
    if (s >= 0.9) return 'score-high'
    if (s >= 0.8) return 'score-mid'
    return 'score-low'
})
</script>

<style scoped>
.match-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    transition: all var(--transition-base);
}
.match-card:hover {
    border-color: var(--border-hover);
    box-shadow: var(--shadow-md);
}
.match-card.top-match {
    border-color: var(--accent-green);
    box-shadow: 0 0 16px rgba(52, 211, 153, 0.08);
}

.match-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-md);
}
.match-name {
    font-weight: 600;
    font-size: var(--font-base);
}
.match-score {
    font-weight: 700;
    font-size: var(--font-md);
    font-variant-numeric: tabular-nums;
}

.score-high { color: var(--accent-green); }
.score-mid { color: var(--accent-gold); }
.score-low { color: var(--accent-red); }

.match-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
}
.detail-row {
    display: flex;
    gap: var(--space-sm);
    font-size: var(--font-sm);
}
.detail-label {
    color: var(--text-muted);
    min-width: 50px;
}
.detail-value {
    color: var(--text-secondary);
}

.match-score-bar {
    height: 4px;
    background: var(--bg-input);
    border-radius: var(--radius-full);
    overflow: hidden;
    margin-bottom: var(--space-md);
}
.score-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width var(--transition-slow);
}
.score-fill.score-high { background: var(--accent-green); }
.score-fill.score-mid { background: var(--accent-gold); }
.score-fill.score-low { background: var(--accent-red); }

.match-actions {
    display: flex;
    justify-content: flex-end;
}
</style>
