<template>
  <div class="login-page">
    <NavBar title="公出审批系统" />
    
    <div class="login-content">
      <div class="logo">
        <div class="logo-icon">📋</div>
        <h1>公出审批系统</h1>
        <p>对接钉钉企业审批</p>
      </div>
      
      <div class="form-group">
        <input 
          v-model="code" 
          type="text" 
          placeholder="请输入姓名"
          class="login-input"
          @keyup.enter="handleLogin"
        />
      </div>
      
      <Button type="primary" block @click="handleLogin" class="login-btn">
        登录
      </Button>

      <Button type="default" block @click="handleDingtalkLogin" class="dingtalk-login-btn">
        钉钉免登
      </Button>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button, showToast } from 'vant'
import NavBar from '../components/NavBar.vue'
import { login, dingtalkLogin } from '../api'

const router = useRouter()
const code = ref('')
const isDingtalkLogging = ref(false)
const DINGTALK_CORP_ID = 'ding6d876e8acba893db'
const DINGTALK_APP_ID = 'dingqqlv7iu5qprk866a'
const REDIRECT_URI = encodeURIComponent('https://11057068.r16.cpolar.top/')

const getUrlParam = (name) => {
  const search = window.location.search.substring(1)
  const reg1 = new RegExp('(^|&)' + name + '=([^&]*)(&|$)')
  const r1 = search.match(reg1)
  if (r1 != null) return decodeURIComponent(r1[2])

  const hash = window.location.hash.substring(1)
  const reg2 = new RegExp('(^|&)' + name + '=([^&]*)(&|$)')
  const r2 = hash.match(reg2)
  if (r2 != null) return decodeURIComponent(r2[2])

  return null
}

const isInDingTalk = () => {
  const ua = navigator.userAgent
  return /DingTalk/i.test(ua) ||
         /AliApp/i.test(ua) ||
         window.location.hostname.includes('dingtalk')
}

const redirectToDingtalkAuth = () => {
  // 在钉钉内打开，使用dd.ready方式
  if (window.dd && window.dd.runtime) {
    window.dd.ready(() => {
      window.dd.runtime.permission.requestAuthCode({
        corpId: DINGTALK_CORP_ID,
        onSuccess: async (result) => {
          if (result.code) {
            await doLoginWithCode(result.code)
          }
        },
        onFail: (err) => {
          console.error('requestAuthCode failed:', err)
          // 免登失败时不弹错误提示，让用户选择手动登录或点击钉钉免登按钮
        }
      })
    })
  }
}

const doLoginWithCode = async (authCode) => {
  isDingtalkLogging.value = true
  try {
    showToast({ message: '正在登录...', type: 'loading', duration: 0 })
    const response = await dingtalkLogin(authCode)
    if (response.success) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      showToast({ message: '登录成功', type: 'success' })
      // 用 router.push 跳转，不要刷新页面
      router.push('/apply')
    } else {
      showToast(response.message || '登录失败')
    }
  } catch (error) {
    console.error('钉钉登录失败:', error)
    const msg = error.response?.data?.message || error.message || '登录失败，请重试'
    showToast(msg)
  } finally {
    isDingtalkLogging.value = false
  }
}

const handleDingtalkLogin = () => {
  if (!isInDingTalk()) {
    showToast('请在钉钉中打开应用')
    return
  }
  redirectToDingtalkAuth()
}

onMounted(() => {
  // 如果已经有token，直接跳转到申请页
  if (localStorage.getItem('token')) {
    router.push('/apply')
    return
  }

  // 检查是否带钉钉回调的code
  const authCode = getUrlParam('code')
  if (authCode) {
    // 钉钉回调回来，自动登录
    doLoginWithCode(authCode)
    return
  }

  // 如果在钉钉里但没有code，自动跳转授权
  if (isInDingTalk()) {
    handleDingtalkLogin()
  }
})

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
  margin-bottom: 40px;
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


</style>
