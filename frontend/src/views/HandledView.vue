<template>
  <div class="handled-page">
    <NavBar title="我处理的审批" :showBack="true" />
    
    <div class="handled-container">
      <div v-if="applications.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.3-8.78"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p>暂无处理记录</p>
      </div>
      
      <div v-else class="application-list">
        <div v-for="app in applications" :key="app.id" class="application-card" @click="showDetail(app)">
          <div class="card-header">
            <div class="app-title">{{ app.reason }}</div>
            <span :class="['status-tag', app.status]">{{ getStatusName(app.status) }}</span>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="label">申请人:</span>
              <span class="value">{{ getApplicantName(app.applicant_id) }}</span>
            </div>
            <div class="info-row">
              <span class="label">出行日期:</span>
              <span class="value">{{ app.travel_date }}</span>
            </div>
            <div class="info-row">
              <span class="label">公出地点:</span>
              <span class="value">{{ getLocationName(app.location_id) }}</span>
            </div>
            <div class="info-row">
              <span class="label">报销金额:</span>
              <span class="value amount">¥{{ app.amount }}</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="apply-date">审批于 {{ app.approved_at || app.apply_date }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import NavBar from '../components/NavBar.vue'
import { applicationAPI, adminAPI } from '../api'

const router = useRouter()
const applications = ref([])
const locations = ref([])
const users = ref([])
const user = ref({})

const goBack = () => {
  router.push('/mine')
}

const getStatusName = (status) => {
  const statusMap = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const getLocationName = (locationId) => {
  const location = locations.value.find(l => l.id === locationId)
  return location ? location.name : locationId
}

const getApplicantName = (applicantId) => {
  const applicant = users.value.find(u => u.id === applicantId)
  return applicant ? applicant.name : `用户${applicantId}`
}

const loadData = async () => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    user.value = JSON.parse(storedUser)
  }
  
  try {
    const locResult = await adminAPI.locations()
    if (locResult.success) {
      locations.value = locResult.data
    }
    
    const userResult = await adminAPI.users()
    if (userResult.success) {
      users.value = userResult.data
    }
    
    const appResult = await applicationAPI.list()
    if (appResult.success) {
      // 我处理的审批（审批人是当前用户，且状态不是pending）
      applications.value = appResult.data.filter(a => 
        parseInt(a.approver_id) === parseInt(user.value.id) && a.status !== 'pending'
      )
    }
  } catch (error) {
    console.error('加载失败:', error)
  }
}

const showDetail = (app) => {
  alert(`详情: ${app.reason}\n申请人: ${getApplicantName(app.applicant_id)}\n状态: ${getStatusName(app.status)}\n金额: ¥${app.amount}`)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.handled-page {
  min-height: 100vh;
  padding: 80px 16px 100px;
  background: #f5f5f5;
}

.handled-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
}

.application-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.application-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.application-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.app-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.status-tag.pending {
  background: #fff7e6;
  color: #d46b08;
}

.status-tag.approved {
  background: #e8f5e9;
  color: #389e0d;
}

.status-tag.rejected {
  background: #fff1f0;
  color: #cf1322;
}

.status-tag.cancelled {
  background: #f5f5f5;
  color: #999;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.label {
  color: #999;
}

.value {
  color: #333;
}

.value.amount {
  color: #ff4d4f;
  font-weight: 500;
}

.card-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.apply-date {
  font-size: 12px;
  color: #999;
}
</style>