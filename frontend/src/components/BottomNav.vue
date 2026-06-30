<template>
  <div class="dingtalk-nav">
    <div class="nav-container">
      <div 
        class="nav-item" 
        :class="{ active: active === 0 }"
        @click="navigate('/apply')"
      >
        <div class="icon-wrapper">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <span class="nav-text">申请</span>
        <span v-if="active === 0" class="active-indicator"></span>
      </div>
      
      <div
        v-if="canApprove"
        class="nav-item"
        :class="{ active: active === 1 }"
        @click="navigate('/approve')"
      >
        <div class="icon-wrapper">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.3-8.78"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <span v-if="pendingCount > 0" class="nav-badge">{{ pendingCount }}</span>
        <span class="nav-text">审批</span>
        <span v-if="active === 1" class="active-indicator"></span>
      </div>

      <div
        v-if="isAdmin"
        class="nav-item"
        :class="{ active: active === 2 }"
        @click="navigate('/admin')"
      >
        <div class="icon-wrapper">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="12 22 12 12"/>
            <circle cx="12" cy="5" r="2"/>
          </svg>
        </div>
        <span class="nav-text">管理</span>
        <span v-if="active === 2" class="active-indicator"></span>
      </div>
      
      <div 
        class="nav-item" 
        :class="{ active: active === 3 }"
        @click="navigate('/mine')"
      >
        <div class="icon-wrapper">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <span class="nav-text">我</span>
        <span v-if="active === 3" class="active-indicator"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { approvalAPI } from '../api'

const router = useRouter()
const active = ref(0)
const pendingCount = ref(0)
let pollTimer = null

const APPROVER_ROLES = ['校长', '副校长', '教科室主任', '教导主任', '德育主任', '组长']
const FINANCE_ROLES = ['财务']

const user = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
})

const canApprove = computed(() => {
  return APPROVER_ROLES.includes(user.value.role) || user.value.role === 'admin'
})

const isFinance = computed(() => {
  return FINANCE_ROLES.includes(user.value.role)
})

const isAdmin = computed(() => {
  // 钉钉主管理员 或 财务角色 可以访问管理页面
  const result = user.value.is_admin === 1 || user.value.is_admin === true || isFinance.value
  console.log('BottomNav - 当前用户:', JSON.stringify(user.value))
  console.log('BottomNav - isAdmin:', result, 'is_admin值:', user.value.is_admin, '类型:', typeof user.value.is_admin, 'isFinance:', isFinance.value)
  return result
})

const getActiveIndex = () => {
  const path = router.currentRoute.value.path
  if (path.includes('/approve')) return canApprove.value ? 1 : 0
  if (path.includes('/admin')) return isAdmin.value ? 2 : 0
  if (path.includes('/mine')) {
    let idx = 1
    if (canApprove.value) idx++
    if (isAdmin.value) idx++
    return idx
  }
  return 0
}

const navigate = (url) => {
  router.push(url)
}

const updateActive = () => {
  active.value = getActiveIndex()
}

watch(() => router.currentRoute.value.path, () => {
  updateActive()
}, { immediate: true })

const loadPendingCount = async () => {
  try {
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    if (!APPROVER_ROLES.includes(userData.role) && userData.role !== 'admin') {
      pendingCount.value = 0
      return
    }
    const result = await approvalAPI.pendingCount({ approver_id: userData.id })
    if (result.success) {
      pendingCount.value = result.count || 0
    }
  } catch (error) {
    console.error('?????????:', error)
  }
}

onMounted(() => {
  active.value = getActiveIndex()
  router.afterEach(() => { updateActive(); loadPendingCount() })
  window.addEventListener("approval-changed", loadPendingCount)
  loadPendingCount()
  pollTimer = setInterval(loadPendingCount, 8000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    window.removeEventListener("approval-changed", loadPendingCount)
    pollTimer = null
  }
})
</script>

<style scoped>
.dingtalk-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%);
  border-top: 1px solid #e8e8e8;
  padding: 8px 0 16px;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.nav-container {
  display: flex;
  justify-content: space-around;
  max-width: 500px;
  margin: 0 auto;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 12px;
  color: #8f959e;
  transition: all 0.2s ease;
  position: relative;
  min-width: 50px;
}

.nav-item:hover {
  color: #0077ff;
}

.nav-item.active {
  color: #0077ff;
}

.icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  transition: background-color 0.2s ease;
}

.nav-item.active .icon-wrapper {
  background: rgba(0, 119, 255, 0.1);
}

.nav-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.2s ease;
}

.nav-item.active .nav-icon {
  transform: scale(1.1);
}

.nav-text {
  font-size: 11px;
  font-weight: 500;
}

.active-indicator {
  position: absolute;
  bottom: -8px;
  width: 18px;
  height: 3px;
  background: linear-gradient(90deg, #0077ff 0%, #00c6ff 100%);
  border-radius: 2px;
}
.nav-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  border-radius: 8px;
  background: #ee0a24;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(238, 10, 36, 0.3);
  z-index: 1;
}
</style>
