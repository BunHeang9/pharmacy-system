import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)

// session ຖືກກູ້ຄືນໃນ router guard (beforeEach) ກ່ອນ navigation ທຳອິດ
app.mount('#app')
