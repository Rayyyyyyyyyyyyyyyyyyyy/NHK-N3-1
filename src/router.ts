import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomePage },
    { path: '/vocab', component: () => import('./pages/VocabPage.vue') },
    { path: '/grammar', component: () => import('./pages/GrammarPage.vue') },
    { path: '/reading', component: () => import('./pages/ReadingPage.vue') },
    { path: '/listening', component: () => import('./pages/ListeningPage.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
