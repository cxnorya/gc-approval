<template>
  <div class="login-page">
    <NavBar title="公出审批系统" />

    <div class="login-content">
      <div class="logo">
        <div class="logo-icon">📋</div>
        <h1>公出审批系统</h1>
        <p>对接钉钉企业审批</p>
      </div>

      <!-- 账号登录 -->
      <div class="form-group">
        <input
          v-model="code"
          type="text"
          placeholder="请输入姓名"
          class="login-input"
          @keyup.enter="handleLogin"
        />
      </div>

      <Button
        type="primary" block @click="handleLogin"
        class="login-btn"
      >登录</Button>

      <!-- 钉钉内免登按钮（仅在钉钉内显示） -->
      <Button
        v-if="isInDingTalk()"
        type="default" block @click="handleDingtalkLogin"
        class="dingtalk-login-btn"
      >钉钉免登</Button>

      <!-- 调试信息（仅钉钉内显示） -->
      <div v-if="isInDingTalk() && debugMsg" class="debug-info">
        {{ debugMsg }}
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button, showToast } from 'vant'
import NavBar from '../components/NavBar.vue'
import { login, dingtalkLogin } from '../api'

const router = useRouter()
const code = ref('')
const debugMsg = ref('')

const DINGTALK_APP_KEY = 'dingqqlv7iu5qprk866a'
const DINGTALK_CORP_ID = 'ding6d876e8acba893db'

const REDIRECT_URI = encodeURIComponent(
  window.location.origin + window.location.pathname + '#/login'
)

const getUrlParam = (name) => {
  const search = window.location.search.substring(1)
  let reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)')
  let r = search.match(reg)
  if (r != null) return decodeURIComponent(r[2])
  const hash = window.location.hash.substring(1)
  reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)')
  r = hash.match(reg)
  if (r != null) return decodeURIComponent(r[2])
  return null
}

const isInDingTalk = () => {
  const ua = navigator.userAgent
  return /DingTalk/i.test(ua) || /AliApp/i.test(ua)
}

// ========== 钉钉内免登 ==========
const doLoginWithCode = async (authCode) => {
  console.log('[钉钉] doLoginWithCode 开始, code=', authCode)
  debugMsg.value = '正在登录...'
  try {
    const response = await dingtalkLogin(authCode)
    console.log('[钉钉] 登录API返回:', response)
    if (response.success) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      showToast({ message: '登录成功', type: 'success' })
      router.push('/apply')
    } else {
      debugMsg.value = '登录失败: ' + (response.message || '未知错误')
      showToast(response.message || '登录失败')
    }
  } catch (error) {
    console.error('[钉钉] 登录API异常:', error)
    debugMsg.value = '登录异常: ' + (error.message || error)
    showToast('登录失败: ' + (error.message || '请重试'))
  }
}

// 钉钉免登核心逻辑
const startDingTalkLogin = () => {
  const dd = window.dd
  if (!dd) {
    debugMsg.value = '钉钉SDK未加载'
    showToast('钉钉SDK未加载')
    return
  }

  debugMsg.value = '正在获取授权码...'

  // 直接调用 requestAuthCode，不需要 dd.config
  // 钉钉内应用中 dd 对象已由客户端注入
  dd.runtime.permission.requestAuthCode({
    corpId: DINGTALK_CORP_ID,
    onSuccess: (result) => {
      console.log('[钉钉] requestAuthCode 成功:', result)
      if (result.code) {
        debugMsg.value = '授权码获取成功，正在登录...'
        doLoginWithCode(result.code)
      } else {
        debugMsg.value = '授权码为空'
        showToast('获取授权码为空')
      }
    },
    onFail: (err) => {
      console.error('[钉钉] requestAuthCode 失败:', JSON.stringify(err))
      debugMsg.value = '授权失败: ' + (JSON.stringify(err).substring(0, 100))
      showToast('获取钉钉授权失败')
    }
  })
}

// 点击"钉钉免登"按钮
const handleDingtalkLogin = () => {
  if (!isInDingTalk()) {
    showToast('请在钉钉中打开应用')
    return
  }
  startDingTalkLogin()
}

// ========== 账号登录 ==========
const handleLogin = async () => {
  if (!code.value.trim()) {
    showToast('请输入用户标识')
    return
  }
  try {
    const response = await login(code.value.trim())
    if (response.success) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      router.push('/apply')
    } else {
      showToast(response.message)
    }
  } catch (error) {
    console.error('登录失败:', error)
    showToast('登录失败，请重试')
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  // 已有 token，直接跳转
  if (localStorage.getItem('token')) {
    router.push('/apply')
    return
  }

  // 钉钉内打开：自动免登
  if (isInDingTalk()) {
    debugMsg.value = '检测到钉钉环境，正在初始化...'
    // 延迟 800ms 等 dd 对象完全注入
    setTimeout(() => startDingTalkLogin(), 800)
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-content {
  max-width: 400px;
  margin: 0 auto;
  padding-top: 60px;
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.logo h1 {
  color: #fff;
  font-size: 28px;
  margin-bottom: 8px;
}

.logo p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.login-input {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.95);
  box-sizing: border-box;
}

.login-btn {
  margin-bottom: 12px;
}

.dingtalk-login-btn {
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
}

.debug-info {
  background: rgba(0,0,0,0.3);
  color: #fff;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-top: 12px;
  word-break: break-all;
}
</style>
