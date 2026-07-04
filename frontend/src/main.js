import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'vant/lib/index.css'
import { Uploader, showToast, showDialog, ImagePreview, Tabs, Tab } from 'vant'

const app = createApp(App)
app.use(router)
app.use(Uploader)
app.use(Tabs)
app.use(Tab)
app.config.globalProperties.$showToast = showToast
app.config.globalProperties.$showDialog = showDialog
app.config.globalProperties.$ImagePreview = ImagePreview
app.mount('#app')
