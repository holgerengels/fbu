import { defineStore } from 'pinia'
import axios from 'axios'

export const useFachberaterStore = defineStore('fachberater', {
    state: () => ({
        // List
        items: [],
        total: 0,
        page: 1,
        pages: 1,
        loading: false,
        error: null,

        // Filters
        filterStatus: '',
        filterRp: '',
        filterSearch: '',

        // Sort
        sortBy: '',
        sortOrder: 'asc',

        // Detail
        current: null,
        candidates: [],
        candidatesLoading: false,

        // Stats
        stats: null,
        statsLoading: false,

        // Operation results
        lastResult: null
    }),

    actions: {
        async fetchList() {
            this.loading = true
            this.error = null
            try {
                const params = {
                    page: this.page,
                    limit: 50
                }
                if (this.filterStatus) params.status = this.filterStatus
                if (this.filterRp) params.rp = this.filterRp
                if (this.filterSearch) params.search = this.filterSearch
                if (this.sortBy) {
                    params.sortBy = this.sortBy
                    params.sortOrder = this.sortOrder
                }

                const { data } = await axios.get('/api/fachberater', { params })
                this.items = data.data
                this.total = data.total
                this.pages = data.pages
                this.page = data.page
            } catch (err) {
                this.error = err.response?.data?.error || err.message
            } finally {
                this.loading = false
            }
        },

        async fetchStats() {
            this.statsLoading = true
            try {
                const { data } = await axios.get('/api/fachberater/stats')
                this.stats = data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
            } finally {
                this.statsLoading = false
            }
        },

        async fetchOne(id) {
            this.loading = true
            this.error = null
            try {
                const { data } = await axios.get(`/api/fachberater/${id}`)
                this.current = data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
            } finally {
                this.loading = false
            }
        },

        async updateOne(id, fields) {
            this.error = null
            try {
                const { data } = await axios.put(`/api/fachberater/${id}`, fields)
                this.current = data
                return data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
                throw err
            }
        },

        async fetchCandidates(id) {
            this.candidatesLoading = true
            this.candidates = []
            try {
                const { data } = await axios.get(`/api/matching/${id}/candidates`)
                this.candidates = data.candidates
            } catch (err) {
                this.error = err.response?.data?.error || err.message
            } finally {
                this.candidatesLoading = false
            }
        },

        async confirmMatch(id, moodleProfileId, score) {
            this.error = null
            try {
                const { data } = await axios.post(`/api/matching/${id}/confirm`, {
                    moodleProfileId,
                    score
                })
                this.current = data
                return data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
                throw err
            }
        },

        async rejectMatch(id) {
            this.error = null
            try {
                const { data } = await axios.post(`/api/matching/${id}/reject`)
                this.current = data
                return data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
                throw err
            }
        },

        async importCsv() {
            this.error = null
            try {
                const { data } = await axios.post('/api/import/csv')
                this.lastResult = { type: 'csv-import', ...data }
                return data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
                throw err
            }
        },

        async importMoodle() {
            this.error = null
            try {
                const { data } = await axios.post('/api/import/moodle')
                this.lastResult = { type: 'moodle-import', ...data }
                return data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
                throw err
            }
        },

        async importKur() {
            this.error = null
            try {
                const { data } = await axios.post('/api/import/kur')
                this.lastResult = { type: 'kur-import', ...data }
                return data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
                throw err
            }
        },

        async autoMatch(threshold) {
            this.error = null
            try {
                const { data } = await axios.post('/api/matching/auto', { threshold })
                this.lastResult = { type: 'auto-match', ...data }
                return data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
                throw err
            }
        },

        async syncToMoodle() {
            this.error = null
            try {
                const { data } = await axios.post('/api/sync/to-moodle')
                this.lastResult = { type: 'sync', ...data }
                return data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
                throw err
            }
        },

        async deleteAll() {
            this.error = null
            try {
                const { data } = await axios.delete('/api/fachberater')
                this.lastResult = { type: 'delete', ...data }
                this.items = []
                this.total = 0
                this.pages = 1
                this.stats = null
                return data
            } catch (err) {
                this.error = err.response?.data?.error || err.message
                throw err
            }
        },

        setFilters({ status, rp, search }) {
            if (status !== undefined) this.filterStatus = status
            if (rp !== undefined) this.filterRp = rp
            if (search !== undefined) this.filterSearch = search
            this.page = 1
            this.fetchList()
        },

        setPage(p) {
            this.page = p
            this.fetchList()
        },

        setSort(field) {
            if (this.sortBy === field) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
            } else {
                this.sortBy = field
                this.sortOrder = 'asc'
            }
            this.page = 1
            this.fetchList()
        }
    }
})
