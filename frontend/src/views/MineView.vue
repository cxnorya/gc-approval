<template>
  <div class="mine-page">
    <NavBar title="我的" />
    
    <div class="mine-container">
      <!-- 用户信息 -->
      <div class="user-card">
        <div class="user-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="user-info">
          <div class="user-name">{{ user.name }}</div>
        </div>
      </div>
      
      <!-- 功能菜单 -->
      <div class="menu-section">
        <div v-if="isAdmin" class="menu-item" @click="syncDingTalkUsers">
          <div class="menu-icon sync">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </div>
          <div class="menu-content">
            <div class="menu-title">同步钉钉通讯录</div>
            <div class="menu-desc">仅主管理员可用</div>
          </div>
          <div class="menu-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
        <div class="menu-item" @click="navigateTo('/mine/submitted')">
          <div class="menu-icon submitted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div class="menu-content">
            <div class="menu-title">我提交的审批</div>
            <div class="menu-desc">查看我发起的公出申请</div>
          </div>
          <div class="menu-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
        
        <div class="menu-item" @click="navigateTo('/mine/handled')">
          <div class="menu-icon handled">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.3-8.78"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="menu-content">
            <div class="menu-title">我处理的审批</div>
            <div class="menu-desc">查看我审批过的申请</div>
          </div>
          <div class="menu-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>
      
      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stats-card">
          <div class="stats-title">我的审批统计</div>
          <div class="stats-grid">
            <div class="stats-item">
              <div class="stats-value">{{ submittedCount }}</div>
              <div class="stats-label">已提交</div>
            </div>
            <div class="stats-item">
              <div class="stats-value">{{ pendingCount }}</div>
              <div class="stats-label">待审批</div>
            </div>
            <div class="stats-item">
              <div class="stats-value">{{ approvedCount }}</div>
              <div class="stats-label">已通过</div>
            </div>
            <div class="stats-item">
              <div class="stats-value">{{ rejectedCount }}</div>
              <div class="stats-label">已驳回</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 退出登录 -->
      <div class="logout-section">
        <button class="logout-btn" @click="handleLogout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          退出登录
        </button>
      </div>
    </div>
    
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import BottomNav from '../components/BottomNav.vue'
import NavBar from '../components/NavBar.vue'
import { applicationAPI, adminAPI } from '../api'

const router = useRouter()
const user = ref({
  id: 1,
  name: '',
  role: '',
  department: ''
})

const submittedCount = ref(0)
const pendingCount = ref(0)
const approvedCount = ref(0)
const rejectedCount = ref(0)

const APPROVER_ROLES = ['校长', '副校长', '教科室主任', '教导主任', '德育主任', '组长']

const isAdmin = computed(() => {
  const result = user.value.is_admin === 1 || user.value.is_admin === true
  console.log('MineView - 当前用户:', JSON.stringify(user.value))
  console.log('MineView - isAdmin:', result, 'is_admin值:', user.value.is_admin, '类型:', typeof user.value.is_admin)
  return result
})

const getRoleName = (role) => {
  const roleMap = {
    employee: '普通教职工',
    admin: '管理员'
  }
  return roleMap[role] || role
}

const loadUserInfo = () => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    user.value = JSON.parse(storedUser)
  }
}

const loadStats = async () => {
  try {
    const result = await applicationAPI.list()
    if (result.success) {
      const apps = result.data
      // 我提交的
      const mySubmitted = apps.filter(a => parseInt(a.applicant_id) === parseInt(user.value.id))
      submittedCount.value = mySubmitted.length
      
      // 对于审批角色成员，统计我处理的审批
      if (APPROVER_ROLES.includes(user.value.role) || user.value.role === 'admin') {
        const myHandled = apps.filter(a => parseInt(a.approver_id) === parseInt(user.value.id))
        pendingCount.value = myHandled.filter(a => a.status === 'pending').length
        approvedCount.value = myHandled.filter(a => a.status === 'approved').length
        rejectedCount.value = myHandled.filter(a => a.status === 'rejected').length
      } else {
        // 普通员工统计我提交的
        pendingCount.value = mySubmitted.filter(a => a.status === 'pending').length
        approvedCount.value = mySubmitted.filter(a => a.status === 'approved').length
        rejectedCount.value = mySubmitted.filter(a => a.status === 'rejected').length
      }
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

const syncDingTalkUsers = async () => {
  if (!isAdmin.value) {
    showToast('无权限，请联系钉钉主管理员')
    return
  }
  try {
    showToast({ message: '正在同步钉钉用户...', type: 'loading', duration: 0 })
    const result = await adminAPI.syncDingTalkUsers()
    if (result.success) {
      showToast({ message: result.message, type: 'success' })
    } else {
      showToast(result.message || '同步失败')
    }
  } catch (error) {
    console.error('同步失败:', error)
    const msg = error.response?.data?.message || error.message || '同步失败'
    showToast(msg)
  }
}

const navigateTo = (url) => {
  router.push(url)
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

onMounted(() => {
  loadUserInfo()
  loadStats()
})
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  padding: 80px 16px 100px;
  background: #f5f5f5;
}

.mine-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar svg {
  width: 32px;
  height: 32px;
  color: #fff;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.user-role {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2px;
}

.user-department {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.menu-section {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #f7f8fa;
}

.menu-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.menu-icon.submitted {
  background: rgba(0, 119, 255, 0.1);
  color: #0077ff;
}

.menu-icon.handled {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.menu-icon.sync {
  background: rgba(255, 159, 67, 0.1);
  color: #ff9f43;
}

.menu-icon svg {
  width: 20px;
  height: 20px;
}

.menu-content {
  flex: 1;
}

.menu-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.menu-desc {
  font-size: 12px;
  color: #999;
}

.menu-arrow {
  color: #999;
}

.menu-arrow svg {
  width: 16px;
  height: 16px;
}

.stats-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.stats-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stats-item {
  text-align: center;
}

.stats-value {
  font-size: 24px;
  font-weight: 600;
  color: #0077ff;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 12px;
  color: #999;
}

.logout-section {
  padding: 20px 0;
}

.logout-btn {
  width: 100%;
  padding: 14px;
  background: #fff;
  border: 1px solid #ff4d4f;
  border-radius: 8px;
  color: #ff4d4f;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #ff4d4f;
  color: #fff;
}

.logout-btn svg {
  width: 20px;
  height: 20px;
}
</style>