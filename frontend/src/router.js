import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'dashboard',
        component: () => import('./views/DashboardView.vue')
    },
    {
        path: '/fachberater',
        name: 'fachberater-list',
        component: () => import('./views/FachberaterList.vue')
    },
    {
        path: '/fachberater/:id',
        name: 'fachberater-detail',
        component: () => import('./views/FachberaterDetail.vue')
    },
    {
        path: '/import',
        name: 'import',
        component: () => import('./views/ImportView.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
