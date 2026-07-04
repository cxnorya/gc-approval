import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'vant/lib/index.css'
import { Uploader, showToast, showDialog, ImagePreview, Tabs, Tab } from 'vant'

// 动态加载钉钉JSAPI（仅在非钉钉环境中加载，用于调试）
const loadDingTalkJS = () => {
  return new Promise((resolve, reject) => {
    // 检查是否已在钉钉环境中（dd对象已存在）
    if (window.dd) {
      console.log('[钉钉] dd对象已存在，无需加载JSAPI')
      resolve()
      return
    }

    // 检查是否已在浏览器中加载了JSAPI
    if (window.DTFrameLogger) {
      console.log('[钉钉] JSAPI已加载')
      resolve()
      return
    }

    console.log('[钉钉] 开始动态加载JSAPI...')
    const script = document.createElement('script')
    script.src = 'https://g.alicdn.com/dingding/dingtalk-jsapi/3.0.25/dingtalk.open.js'
    script.onload = () => {
      console.log('[钉钉] JSAPI加载成功')
      resolve()
    }
    script.onerror = () => {
      console.warn('[钉钉] JSAPI加载失败，不影响应用运行')
      resolve() // 即使加载失败也继续，钉钉免登功能可能不可用
    }
    document.head.appendChild(script)
  })
}

// 判断是否在钉钉环境中
const isInDingTalk = () => {
  const ua = navigator.userAgent
  return /DingTalk/i.test(ua) || /AliApp/i.test(ua)
}

// 在钉钉环境中，不加载外部JSAPI（避免"非钉钉提供"提示）
// 在非钉钉环境中（如浏览器调试），动态加载JSAPI
if (!isInDingTalk()) {
  // 不在钉钉环境中，动态加载JSAPI（用于调试）
  loadDingTalkJS().then(() => {
    console.log('[钉钉] JSAPI加载完成（调试模式）')
  })
} else {
  console.log('[钉钉] 钉钉环境中，使用容器注入的dd对象')
}

const app = createApp(App)
app.use(router)
app.use(Uploader)
app.use(Tabs)
app.use(Tab)
app.config.globalProperties.$showToast = showToast
app.config.globalProperties.$showDialog = showDialog
app.config.globalProperties.$ImagePreview = ImagePreview
app.mount('#app')
