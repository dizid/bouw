import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// Import backfill script (makes it available as window.backfillThumbnails)
import './lib/backfillThumbnails'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
