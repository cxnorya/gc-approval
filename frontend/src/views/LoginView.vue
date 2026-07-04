<template>
  <div class="login-page">
    <NavBar title="公出审批系统" />

    <div class="login-content">
      <div class="logo">
        <div class="logo-icon">📋</div>
        <h1>公出审批系统</h1>
        <p>对接钉钉企业审批</p>
      </div>

      <!-- 登录方式切换 -->
      <div class="tab-bar">
        <div
          class="tab-item"
          :class="{ active: loginType === 'account' }"
          @click="loginType = 'account'"
        >账号登录</div>
        <div
          class="tab-item"
          :class="{ active: loginType === 'qrcode' }"
          @click="switchToQrCode"
        >钉钉扫码登录</div>
      </div>

      <!-- 账号登录 -->
      <div v-if="loginType === 'account'" class="form-group">
        <input
          v-model="code"
          type="text"
          placeholder="请输入姓名"
          class="login-input"
          @keyup.enter="handleLogin"
        />
      </div>

      <Button
        v-if="loginType === 'account'"
        type="primary" block @click="handleLogin"
        class="login-btn"
      >登录</Button>

      <!-- 钉钉内免登（仅在钉钉内显示） -->
      <Button
        v-if="loginType === 'account' && isInDingTalk()"
        type="default" block @click="handleDingtalkLogin"
        class="dingtalk-login-btn"
      >钉钉免登</Button>

      <!-- 钉钉扫码登录说明 -->
      <div v-if="loginType === 'qrcode'" class="qrcode-section">
        <div class="qr-card">
          <div class="qr-icon">📱</div>
          <h3>钉钉扫码登录</h3>
          <p class="qr-desc">
            将以钉钉官方授权页面对话框形式打开，<br/>
            使用钉钉 App 扫码即可完成登录
          </p>
          <Button type="primary" block @click="goToDingTalkAuth" class="qr-btn">
            前往钉钉授权
          </Button>
          <p class="qr-hint">
            首次登录需要钉钉授权<br/>
            仅用于获取你的身份信息
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button, showToast } from 'vant'
import NavBar from '../components/NavBar.vue'
import { login, dingtalkLogin, dingtalkQrLogin } from '../api'

const router = useRouter()
const code = ref('')
const loginType = ref('account')

const DINGTALK_APP_KEY = 'dingqqlv7iu5qprk866a'
const DINGTALK_CORP_ID = 'ding6d876e8acba893db'

// 当前页面作为回调地址（去掉 hash 部分）
const REDIRECT_URI = encodeURIComponent(
  window.location.origin + window.location.pathname + '#/login'
)

// ========== 工具函数 ==========
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
  try {
    showToast({ message: '正在登录...', type: 'loading', duration: 0 })
    const response = await dingtalkLogin(authCode)
    if (response.success) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      showToast({ message: '登录成功', type: 'success' })
      router.push('/apply')
    } else {
      showToast(response.message || '登录失败')
    }
  } catch (error) {
    console.error('钉钉登录失败:', error)
    const msg = error.response?.data?.message || error.message || '登录失败，请重试'
    showToast(msg)
  } finally {
    showToast.clear()
  }
}

const handleDingtalkLogin = () => {
  if (!isInDingTalk()) {
    showToast('请在钉钉中打开应用')
    return
  }
  if (window.dd && window.dd.runtime) {
    window.dd.ready(() => {
      window.dd.runtime.permission.requestAuthCode({
        corpId: DINGTALK_CORP_ID,
        onSuccess: (result) => {
          if (result.code) doLoginWithCode(result.code)
        },
        onFail: (err) => {
          console.error('requestAuthCode failed:', err)
        }
      })
    })
  }
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

// ========== 钉钉扫码登录 ==========
// 切换到扫码登录页时，直接跳转钉钉 OAuth2 授权页
const switchToQrCode = () => {
  loginType.value = 'qrcode'
}

const goToDingTalkAuth = () => {
  // 生成随机 state 防 CSRF
  const state = Math.random().toString(36).substring(2, 15)
  sessionStorage.setItem('dingtalk_qr_state', state)

  const authUrl =
    `https://login.dingtalk.com/oauth2/auth` +
    `?client_id=${DINGTALK_APP_KEY}` +
    `&response_type=code` +
    `&scope=openid` +
    `&redirect_uri=${REDIRECT_URI}` +
    `&state=${state}` +
    `&prompt=consent`

  window.location.href = authUrl
}

// 处理钉钉 OAuth2 回调：URL 中有 code 参数
const handleQrCallback = async () => {
  const code = getUrlParam('code')
  const state = getUrlParam('state')
  if (!code) return

  const savedState = sessionStorage.getItem('dingtalk_qr_state')
  sessionStorage.removeItem('dingtalk_qr_state')

  // state 校验（防 CSRF）
  if (state && savedState && state !== savedState) {
    showToast('状态验证失败，请重试')
    // 清除 URL 中的 code
    window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    return
  }

  try {
    showToast({ message: '正在登录...', type: 'loading', duration: 0 })
    const response = await dingtalkQrLogin(code)
    if (response.success) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      showToast({ message: '登录成功', type: 'success' })
      // 清除 URL 中的 code，然后跳转
      window.history.replaceState({}, '', window.location.pathname + '#/login')
      router.push('/apply')
    } else {
      showToast(response.message || '登录失败')
    }
  } catch (error) {
    console.error('扫码登录失败:', error)
    const msg = error.response?.data?.message || error.message || '登录失败，请重试'
    showToast(msg)
  } finally {
    showToast.clear()
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  // 已有 token，直接跳转
  if (localStorage.getItem('token')) {
    router.push('/apply')
    return
  }

  // 检查是否是钉钉内应用回调（钉钉内免登）
  const authCode = getUrlParam('code')
  if (authCode && isInDingTalk()) {
    doLoginWithCode(authCode)
    return
  }

  // 检查是否是扫码登录回调（来自钉钉 OAuth2 重定向）
  const qrCode = getUrlParam('code')
  if (qrCode) {
    handleQrCallback()
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

/* 切换标签 */
.tab-bar {
  display: flex;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 10px;
  color: rgba(255,255,255,0.7);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-item.active {
  background: #fff;
  color: #764ba2;
  font-weight: 600;
}

/* 表单 */
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
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
}

/* 扫码登录区域 */
.qrcode-section {
  margin-top: 10px;
}

.qr-card {
  background: rgba(255,255,255,0.95);
  border-radius: 16px;
  padding: 30px 20px;
  text-align: center;
}

.qr-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.qr-card h3 {
  color: #333;
  font-size: 20px;
  margin-bottom: 12px;
}

.qr-desc {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.qr-btn {
  margin-bottom: 16px;
  background: #1677ff;
  border: none;
}

.qr-hint {
  color: #999;
  font-size: 12px;
  line-height: 1.6;
}
</style>
