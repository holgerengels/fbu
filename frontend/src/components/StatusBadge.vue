<template>
    <span class="status-badges">
        <span v-for="s in badges" :key="s" class="status-badge" :class="statusMap[s]?.cls || 'badge-blue'">
            {{ statusMap[s]?.label || s }}
        </span>
    </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    status: { type: [String, Array], required: true }
})

const statusMap = {
    neu: { label: 'Neu', cls: 'badge-blue' },
    registriert: { label: 'Registriert', cls: 'badge-green' },
    nicht_registriert: { label: 'Nicht registriert', cls: 'badge-red' },
    vollstaendig: { label: 'Vollständig', cls: 'badge-gold' }
}

const badges = computed(() => {
    if (Array.isArray(props.status)) return props.status
    return props.status ? [props.status] : []
})
</script>

<style scoped>
.status-badges {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}
.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.6rem;
    font-size: var(--font-xs);
    font-weight: 600;
    border-radius: var(--radius-full);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
}
.badge-blue {
    background: var(--accent-blue-soft);
    color: var(--accent-blue);
}
.badge-green {
    background: var(--accent-green-soft);
    color: var(--accent-green);
}
.badge-red {
    background: var(--accent-red-soft);
    color: var(--accent-red);
}
.badge-gold {
    background: var(--accent-gold-soft);
    color: var(--accent-gold);
}
</style>
