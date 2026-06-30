<template>
  <div class="apply-page">
    <NavBar title="公出申请" />
    <div class="custom-tabs">
      <div class="tab-header">
        <div class="tab-item" :class="{ active: activeTab === 0 }" @click="activeTab = 0">申请</div>
        <div class="tab-item" :class="{ active: activeTab === 1 }" @click="switchToHistory">我的申请</div>
      </div>
      <div v-show="activeTab === 0">
        <div class="form-container">
      <div class="form-item">
        <label>申请日期</label>
        <input 
          v-model="form.apply_date" 
          type="date" 
          class="form-input"
        />
      </div>
      
      <div class="form-item">
        <label>出行日期</label>
        <input 
          v-model="form.travel_date" 
          type="date" 
          class="form-input"
          :min="form.apply_date"
        />
      </div>
      
      <div class="form-item">
        <label>申请人</label>
        <input 
          :value="currentUser.name"
          type="text"
          class="form-input"
          disabled
        />
      </div>

      <div class="form-item">
        <label>审批负责人角色</label>
        <select v-model="selectedApproverRole" class="form-select" @change="onApproverRoleChange">
          <option value="">请选择审批负责人角色</option>
          <option v-for="role in APPROVER_ROLES" :key="role" :value="role">
            {{ role }}
          </option>
        </select>
      </div>

      <div class="form-item">
        <label>审批负责人</label>
        <select v-model="form.approver_id" class="form-select">
          <option value="">请选择审批负责人</option>
          <option v-for="approver in filteredApproverList" :key="approver.id" :value="approver.id">
            {{ approver.name }} ({{ approver.title || approver.role }})
          </option>
        </select>
      </div>
      
      <div class="form-item">
        <label>公出事由</label>
        <textarea 
          v-model="form.reason" 
          class="form-textarea"
          placeholder="请输入公出事由"
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-item">
        <label>证明附件</label>
        
        <input 
          type="file" 
          multiple 
          accept="image/*,.pdf,.doc,.docx"
          @change="handleNativeFileChange"
          class="native-file-input"
        />
        
        <div class="attachment-list">
          <div v-for="(file, index) in fileList" :key="index" class="attachment-item">
            <span>{{ file.name }}</span>
            <button @click="handleFileDelete(file)">删除</button>
          </div>
          <div v-if="fileList.length === 0" class="attachment-empty">
            请点击上方输入框选择文件
          </div>
        </div>
        
        <p class="upload-tip">支持上传图片、PDF、Word文档，最多3个文件</p>
      </div>
      
      <div class="form-item">
        <label>公出地点</label>
        <select v-model="form.location_id" class="form-select" @change="onLocationChange">
          <option value="">请选择公出地点</option>
          <option v-for="location in locationList" :key="location.id" :value="location.id">
            {{ location.name }} (¥{{ location.amount }})
          </option>
        </select>
        <span v-if="selectedLocationAmount" class="location-amount">地点金额: ¥{{ selectedLocationAmount }}</span>
      </div>
      
      <div class="form-item">
        <label>出行人数</label>
        <div class="stepper-container">
          <button class="stepper-btn" @click="decreaseCount">-</button>
          <span class="stepper-value">{{ form.person_count }}</span>
          <button class="stepper-btn" @click="increaseCount">+</button>
        </div>
      </div>
      
      <div class="amount-display">
        <div class="amount-label">报销金额</div>
        <div class="amount-value">¥{{ calculatedAmount.toFixed(2) }}</div>
        <div class="amount-formula" v-if="form.person_count >= 2" style="display: none;">
          计算公式: {{ form.person_count }} × {{ selectedLocationAmount }} × (1 - {{ form.person_count }} × 0.1)
        </div>
      </div>
      
      <button class="submit-btn" @click="submitForm">提交申请</button>
    </div>
    
      </div>
      <div v-show="activeTab === 1">
        <div class="history-container">
          <div v-if="submittedList.length === 0" class="empty-state">
            <div class="empty-icon">📋</div>
            <p>暂无申请记录</p>
          </div>
          <div v-else class="application-list">
            <div v-for="app in submittedList" :key="app.id" class="application-card" @click="showDetail(app)">
              <div class="card-header">
                <div class="app-title">{{ app.reason }}</div>
                <span :class="['status-tag', app.status]">{{ getStatusName(app.status) }}</span>
              </div>
              <div class="card-body">
                <div class="info-row"><span>地点</span><span>{{ app.location_name }}</span></div>
                <div class="info-row"><span>日期</span><span>{{ app.travel_date }}</span></div>
                <div class="info-row"><span>金额</span><span>¥{{ app.amount }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { showDialog, showToast, Uploader } from 'vant'
import NavBar from '../components/NavBar.vue'
import BottomNav from '../components/BottomNav.vue'
import { applicationAPI, locationAPI, adminAPI, uploadAPI, getBackendAssetUrl } from '../api'
import { useRouter, useRoute } from 'vue-router'
const router = useRouter()

const user = JSON.parse(localStorage.getItem('user') || '{}')

const activeTab = ref(0)
const submittedList = ref([])
const currentUser = ref({
  id: user.id || '',
  name: user.name || '',
  title: user.title || '',
  role: user.role || 'employee'
})

const form = ref({
  apply_date: new Date().toISOString().split('T')[0],
  travel_date: '',
  applicant_id: currentUser.value.id,
  approver_id: '',
  reason: '',
  location_id: '',
  person_count: 1,
  attachments: []
})

const fileList = ref([])
const locationList = ref([])
const approverList = ref([])
const filteredApproverList = ref([])
const userList = ref([])
const selectedLocationAmount = ref(0)
const selectedApproverRole = ref('')

const calculatedAmount = computed(() => {
  if (!selectedLocationAmount.value || form.value.person_count <= 0) {
    return 0
  }
  if (form.value.person_count === 1) {
    return form.value.person_count * selectedLocationAmount.value
  } else {
    const discount = Math.max(0.3, 1 - form.value.person_count * 0.1)
    return Math.round(form.value.person_count * selectedLocationAmount.value * discount)
  }
})

const onLocationChange = () => {
  const location = locationList.value.find(l => l.id === form.value.location_id)
  if (location) {
    selectedLocationAmount.value = location.amount
  } else {
    selectedLocationAmount.value = 0
  }
}

const increaseCount = () => {
  if (form.value.person_count < 50) {
    form.value.person_count++
  }
}

const decreaseCount = () => {
  if (form.value.person_count > 1) {
    form.value.person_count--
  }
}

const beforeRead = (file) => {
  const rawFile = file.file || file
  
  if (!rawFile) {
    showToast('无法获取文件')
    return false
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(rawFile.type)) {
    showToast('不支持的文件类型，仅支持图片、PDF和Word文档')
    return false
  }
  if (rawFile.size > 10 * 1024 * 1024) {
    showToast('文件大小不能超过10MB')
    return false
  }
  return true
}

const handleNativeFileChange = async (event) => {
  console.log('=== handleNativeFileChange ===')
  const files = Array.from(event.target.files)
  
  if (fileList.value.length + files.length > 3) {
    showToast('最多只能上传3个文件')
    return
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  for (const rawFile of files) {
    console.log('处理文件:', rawFile.name)
    
    if (!allowedTypes.includes(rawFile.type)) {
      showToast(`${rawFile.name} 不支持的文件类型`)
      continue
    }
    if (rawFile.size > 10 * 1024 * 1024) {
      showToast(`${rawFile.name} 文件大小不能超过10MB`)
      continue
    }
    
    showToast(`正在上传 ${rawFile.name}...`)
    
    const uploadingFile = {
      name: rawFile.name,
      status: 'uploading',
      message: '上传中...'
    }
    
    fileList.value = [...fileList.value, uploadingFile]
    
    try {
      const formData = new FormData()
      formData.append('file', rawFile)
      
      const response = await uploadAPI.upload(formData)
      
      console.log('上传响应:', response)
      
      if (response.success) {
        const url = response.data.url
        const fullUrl = getBackendAssetUrl(url)
        
        fileList.value = fileList.value.map(f => 
          f.name === rawFile.name
            ? { ...f, url: fullUrl, status: 'done', message: '' }
            : f
        )
        
        const attachment = {
          filename: response.data.filename,
          originalname: response.data.originalname,
          url: response.data.url,
          size: response.data.size
        }
        form.value.attachments.push(attachment)
        
        showToast(`${rawFile.name} 上传成功`)
      } else {
        fileList.value = fileList.value.map(f => 
          f.name === rawFile.name
            ? { ...f, status: 'failed', message: response.message || '上传失败' }
            : f
        )
        showToast(`${rawFile.name} 上传失败`)
      }
    } catch (error) {
      console.error('上传失败:', error)
      fileList.value = fileList.value.map(f => 
        f.name === rawFile.name
          ? { ...f, status: 'failed', message: '上传失败' }
          : f
      )
      showToast(`${rawFile.name} 上传失败`)
    }
  }
  
  event.target.value = ''
}

const handleFileDelete = async (file) => {
  console.log('handleFileDelete - file:', file)
  
  const index = fileList.value.findIndex(f => f.name === file.name)
  if (index > -1) {
    const attachment = form.value.attachments[index]
    if (attachment && attachment.filename) {
      try {
        await uploadAPI.delete(attachment.filename)
      } catch (error) {
        console.warn('删除文件失败:', error)
      }
    }
    
    form.value.attachments.splice(index, 1)
    fileList.value = fileList.value.filter((_, i) => i !== index)
  }
}

const submitForm = async () => {
  if (!form.value.apply_date) {
    showToast('请选择申请日期')
    return
  }
  if (!form.value.travel_date) {
    showToast('请选择出行日期')
    return
  }
  
  if (form.value.travel_date < form.value.apply_date) {
    showToast('出行日期不能早于申请日期')
    return
  }
  
  if (!form.value.approver_id) {
    showToast('请选择审批负责人')
    return
  }
  if (!form.value.reason || form.value.reason.length < 5) {
    showToast('公出事由至少5个字符')
    return
  }
  if (!form.value.location_id) {
    showToast('请选择公出地点')
    return
  }
  
  try {
    const createResult = await applicationAPI.create({
      applicant_id: form.value.applicant_id,
      approver_id: form.value.approver_id,
      apply_date: form.value.apply_date,
      travel_date: form.value.travel_date,
      reason: form.value.reason,
      attachments: form.value.attachments,
      location_id: form.value.location_id,
      person_count: form.value.person_count
    })
    
    if (createResult.success) {
      const submitResult = await applicationAPI.submit(createResult.data.id)
      
      if (submitResult.success) {
        showDialog({
          title: '提交成功',
          message: `申请已提交成功！\n报销金额：¥${createResult.data.amount}`,
          confirmButtonText: '关闭'
        }).then(() => {
          form.value = {
            apply_date: new Date().toISOString().split('T')[0],
            travel_date: '',
            applicant_id: user.id || 1,
            approver_id: '',
            reason: '',
            location_id: '',
            person_count: 1
          }
          selectedLocationAmount.value = 0
        })
      } else {
        showToast(submitResult.message || '提交失败')
      }
    } else {
      showToast(createResult.message || '创建失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    showToast('提交失败，请重试')
  }
}

const APPROVER_ROLES = ['校长', '副校长', '教科室主任', '教导主任', '德育主任', '教研组长', '财务']

const onApproverRoleChange = () => {
  if (!selectedApproverRole.value) {
    filteredApproverList.value = approverList.value
    return
  }
  filteredApproverList.value = approverList.value.filter(u => u.role === selectedApproverRole.value)
  // 如果当前选中的审批负责人不在过滤后的列表中，清空选择
  if (form.value.approver_id && !filteredApproverList.value.find(u => u.id === form.value.approver_id)) {
    form.value.approver_id = ''
  }
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

const loadSubmitted = async () => {
  try {
    const result = await applicationAPI.list({ user_id: currentUser.value.id })
    if (result.success) {
      submittedList.value = result.data || []
    }
  } catch (error) {
    console.error('加载申请记录失败:', error)
  }
}

const switchToHistory = () => {
  activeTab.value = 1
  loadSubmitted()
}

const showDetail = (app) => {
  router.push({ path: '/approval-detail', query: { id: app.id } })
}

onMounted(async () => {
  try {
    const [locRes, userRes] = await Promise.all([
      locationAPI.list(),
      adminAPI.users()
    ])

    if (locRes.success) {
      locationList.value = locRes.data
    }

    if (userRes.success) {
      userList.value = userRes.data
      console.log('所有用户:', userRes.data)
      const matched = userRes.data.filter(u => APPROVER_ROLES.includes(u.role))
      console.log('匹配的审批角色用户:', matched)
      approverList.value = matched
      filteredApproverList.value = approverList.value
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    alert('加载数据失败')
  }
})

watch(() => form.value.location_id, () => {
  onLocationChange()
})
</script>

<style scoped>
.apply-page {
  min-height: 100vh;
  padding: 80px 16px 100px;
  background: #f5f5f5;
}

.form-container {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:disabled {
  background: #f5f5f5;
  color: #999;
}

.form-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  background: #fff;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  resize: none;
}

.location-amount {
  display: block;
  font-size: 12px;
  color: #1989fa;
  margin-top: 8px;
}

.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  margin-bottom: 0;
}

.native-file-input {
  width: 100%;
  padding: 12px;
  border: 1px dashed #1989fa;
  border-radius: 8px;
  background: #f8f9fa;
  color: #1989fa;
  cursor: pointer;
  margin-bottom: 12px;
}

.attachment-list {
  max-height: 200px;
  overflow-y: auto;
}

.attachment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 8px;
}

.attachment-item span {
  flex: 1;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-item button {
  padding: 6px 12px;
  background: #ff4d4f;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 12px;
}

.attachment-empty {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}

.stepper-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stepper-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 20px;
  background: #fff;
  cursor: pointer;
}

.stepper-value {
  font-size: 18px;
  font-weight: bold;
  min-width: 40px;
  text-align: center;
}

.amount-display {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  color: #fff;
  text-align: center;
}

.amount-label {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.amount-value {
  font-size: 32px;
  font-weight: bold;
}

.amount-formula {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 8px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

/* 历史记录标签 */
.history-container {
  padding: 12px;
  min-height: 60vh;
}

.application-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.application-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.application-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.app-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
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
  margin-bottom: 12px;
}

.empty-state p {
  color: #999;
  font-size: 14px;
}


/* 自定义标签页 */
.custom-tabs {
  padding-top: 0;
}

.tab-header {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 46px;
  z-index: 9;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.tab-item.active {
  color: #0077ff;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #0077ff;
  border-radius: 2px;
}</style>
