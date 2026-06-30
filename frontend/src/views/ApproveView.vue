<template>
  <div class="approve-page">
    <NavBar title="审批管理" />
    
    <Tabs v-model:active="activeTab" @change="onTabChange">
      <Tab title="待审批">
        <div v-if="pendingList.length === 0" class="empty-state">
          <div class="empty-icon">✅</div>
          <p>暂无待审批申请</p>
        </div>
        <div v-else class="application-list">
          <div v-for="item in pendingList" :key="item.id" class="application-card" @click="goToDetail(item.id)">
            <CellGroup>
              <Cell>
                <template #title>
                  <div class="application-title">{{ item.reason }}</div>
                  <div class="application-meta">
                    <span>{{ item.applicant_name }}</span>
                    <span>{{ item.apply_date }}</span>
                  </div>
                </template>
                <template #right-icon>
                  <div class="status-tag pending">待审批</div>
                </template>
              </Cell>
              <Cell>
                <template #title>
                  <div class="detail-row">
                    <span>地点：{{ item.location_name }}</span>
                    <span>人数：{{ item.person_count }}人</span>
                  </div>
                  <div class="detail-row">
                    <span>出行日期：{{ item.travel_date }}</span>
                    <span class="amount">金额：¥{{ item.amount }}</span>
                  </div>
                </template>
              </Cell>
              <div class="action-buttons" @click.stop>
                <Button type="default" size="small" @click.stop="reject(item.id)">驳回</Button>
                <Button type="primary" size="small" @click.stop="showApproveDialog(item.id)">通过</Button>
              </div>
            </CellGroup>
          </div>
        </div>
      </Tab>
      
      <Tab title="已审批">
        <div v-if="approvedList.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <p>暂无已审批记录</p>
        </div>
        <div v-else class="application-list">
          <div v-for="item in approvedList" :key="item.id" class="application-card" @click="goToDetail(item.id)">
            <CellGroup>
              <Cell>
                <template #title>
                  <div class="application-title">{{ item.reason }}</div>
                  <div class="application-meta">
                    <span>{{ item.applicant_name }}</span>
                    <span>{{ item.apply_date }}</span>
                  </div>
                </template>
                <template #right-icon>
                  <div :class="['status-tag', item.status]">
                    {{ item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已驳回' : '已取消' }}
                  </div>
                </template>
              </Cell>
              <Cell>
                <template #title>
                  <div class="detail-row">
                    <span>地点：{{ item.location_name }}</span>
                    <span>人数：{{ item.person_count }}人</span>
                  </div>
                  <div class="detail-row">
                    <span>金额：¥{{ item.amount }}</span>
                    <span v-if="item.approved_at">审批时间：{{ item.approved_at }}</span>
                  </div>
                </template>
              </Cell>
            </CellGroup>
          </div>
        </div>
      </Tab>
    </Tabs>
    
    <Popup v-model="showRejectModal" position="bottom" :close-on-click-overlay="true">
      <div class="modal-content">
        <h3>驳回原因</h3>
        <Field
          v-model="rejectReason"
          type="textarea"
          placeholder="请输入驳回原因"
          :rows="3"
        />
        <div class="modal-buttons">
          <Button type="default" @click="showRejectModal = false">取消</Button>
          <Button type="danger" @click="confirmReject">确认驳回</Button>
        </div>
      </div>
    </Popup>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Tabs, Tab, Cell, CellGroup, Button, Field, Popup, showToast, showConfirmDialog } from 'vant'
import NavBar from '../components/NavBar.vue'
import BottomNav from '../components/BottomNav.vue'
import { approvalAPI, applicationAPI } from '../api'

const router = useRouter()
const activeTab = ref(0)
const pendingList = ref([])
const approvedList = ref([])
const showRejectModal = ref(false)
const rejectReason = ref('')
const currentRejectId = ref(null)

const user = JSON.parse(localStorage.getItem('user') || '{}')
const userId = parseInt(user.id) || 0

const APPROVER_ROLES = ['校长', '副校长', '教科室主任', '教导主任', '德育主任', '组长']

const goToDetail = (id) => {
  router.push({ path: '/approval-detail', query: { id: id } })
}

const loadPending = async () => {
  try {
    const result = await approvalAPI.pending({ approver_id: userId, _t: Date.now() })
    if (result.success) {
      pendingList.value = result.data || []
    } else {
      showToast(result.message || '加载待审批列表失败')
    }
  } catch (error) {
    console.error('加载待审批列表失败:', error)
    if (error.response?.status === 403) {
      showToast('无审批权限')
    } else if (error.response?.data?.message) {
      showToast(error.response.data.message)
    } else {
      showToast('加载待审批列表失败，请检查网络连接')
    }
  }
}

const loadApproved = async () => {
  try {
    console.log('loadApproved - userId:', userId)
    const result = await applicationAPI.list({ approver_id: userId, _t: Date.now() })
    console.log('loadApproved - API返回:', result)
    if (result.success) {
      const allApps = result.data || []
      console.log('loadApproved - 所有申请数:', allApps.length)
      const filtered = allApps.filter(item => {
        const match = parseInt(item.approver_id) === userId 
        console.log(`loadApproved - item ${item.id}: approver_id=${item.approver_id}, parseInt=${parseInt(item.approver_id)}, userId=${userId}, match=${match}, status=${item.status}`)
        return match && item.status !== 'pending' && item.status !== 'draft'
      })
      approvedList.value = filtered
      console.log('loadApproved - 已审批列表数:', approvedList.value.length)
    }
  } catch (error) {
    console.error('加载已审批列表失败:', error)
  }
}

const pollUntilApproved = async (id) => {
  const maxAttempts = 20
  const interval = 300
  let attempts = 0
  
  const check = async () => {
    attempts++
    try {
      const pendingResult = await approvalAPI.pending({ approver_id: userId, _t: Date.now() })
      const approvedResult = await applicationAPI.list({ approver_id: userId, _t: Date.now() })
      
      const pendingHasItem = (pendingResult.data || []).some(item => parseInt(item.id) === id)
      const approvedHasItem = (approvedResult.data || []).some(item => parseInt(item.id) === id && item.status !== 'pending')
      
      if (!pendingHasItem || approvedHasItem) {
        loadPending()
        loadApproved()
        return
      }
      
      if (attempts >= maxAttempts) {
        loadPending()
        loadApproved()
        return
      }
      
      setTimeout(check, interval)
    } catch (error) {
      if (attempts >= maxAttempts) {
        loadPending()
        loadApproved()
        return
      }
      setTimeout(check, interval)
    }
  }
  
  setTimeout(check, 300)
}

const onTabChange = (name) => {
  console.log('onTabChange - name:', name, typeof name)
  const tabIndex = typeof name === 'number' ? name : parseInt(name)
  if (tabIndex === 0) {
    loadPending()
  } else {
    loadApproved()
  }
}

const showApproveDialog = async (id) => {
  try {
    await showConfirmDialog({
      title: '确认通过',
      message: '确认要通过此申请吗？',
      confirmButtonText: '通过',
      cancelButtonText: '取消'
    })
    
    const apiResult = await approvalAPI.approve(id, { comment: '同意', approver_id: userId })

    if (apiResult.success) {
      showToast('审批通过')
      window.dispatchEvent(new Event('approval-changed'))
      // 立即更新本地数据
      const index = pendingList.value.findIndex(item => parseInt(item.id) === id)
      if (index > -1) {
        const item = { ...pendingList.value[index], status: 'approved', comment: '同意', approval_time: new Date().toISOString() }
        pendingList.value.splice(index, 1)
        approvedList.value.unshift(item)
      }
      // 轮询确认：直到服务器数据更新完成
      pollUntilApproved(id)
    } else {
      showToast(apiResult.message || '审批失败')
    }
  } catch (error) {
    if (error === 'cancel') return
    console.error('审批失败:', error)
    showToast('审批失败')
  }
}

const reject = (id) => {
  currentRejectId.value = id
  showRejectModal.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value) {
    showToast('请输入驳回原因')
    return
  }
  
  try {
    const result = await approvalAPI.reject(currentRejectId.value, { reason: rejectReason.value, approver_id: userId })
    if (result.success) {
      showToast('已驳回')
      window.dispatchEvent(new Event('approval-changed'))
      showRejectModal.value = false
      // 立即更新本地数据
      const id = currentRejectId.value
      const index = pendingList.value.findIndex(item => parseInt(item.id) === id)
      if (index > -1) {
        const item = { ...pendingList.value[index], status: 'rejected', comment: rejectReason.value, approval_time: new Date().toISOString() }
        pendingList.value.splice(index, 1)
        approvedList.value.unshift(item)
      }
      rejectReason.value = ''
      // 轮询确认：直到服务器数据更新完成
      pollUntilApproved(id)
    }
  } catch (error) {
    console.error('驳回失败:', error)
    showToast('驳回失败')
  }
}

onMounted(() => {
  const canApprove = APPROVER_ROLES.includes(user.role) || user.role === 'admin'
  if (!canApprove) {
    showToast('无审批权限')
    return
  }
  loadPending()
})

onActivated(() => {
  if (activeTab.value === 0) {
    loadPending()
  } else {
    loadApproved()
  }
})

watch(activeTab, (newVal) => {
  console.log('watch activeTab:', newVal)
  if (newVal === 0) {
    loadPending()
  } else {
    loadApproved()
  }
})
</script>

<style scoped>
.approve-page {
  min-height: 100vh;
  padding-top: 100px;
  padding-bottom: 100px;
  background: #f5f5f5;
}

.application-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.application-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.application-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  color: #999;
  font-size: 14px;
}

.application-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 8px;
}

.application-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 4px;
}

.detail-row .amount {
  color: #1989fa;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.status-tag.pending {
  background: #fff7e6;
  color: #faad14;
}

.status-tag.approved {
  background: #e6f7ff;
  color: #1890ff;
}

.status-tag.rejected {
  background: #fff2f0;
  color: #f5222d;
}

.status-tag.cancelled {
  background: #f5f5f5;
  color: #999;
}

.action-buttons {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}

.action-buttons button {
  flex: 1;
}

.modal-content {
  padding: 20px;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  text-align: center;
}

.modal-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.modal-buttons button {
  flex: 1;
}
</style>
