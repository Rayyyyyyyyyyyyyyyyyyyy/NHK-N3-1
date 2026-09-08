import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useProgressStore } from './stores/progress'
import './style.css'
const app = createApp(App),
  pinia = createPinia()
app.use(pinia)
const progress = useProgressStore(pinia)
progress.$subscribe(
  (_mutation, state) => {
    if (state.session.state) progress.persist()
  },
  { detached: true, flush: 'sync' },
)
progress.touchStreak()
app.use(router).mount('#app')
