<template>
  <div class="admin-page">
    <NavBar title="系统管理" />
    
    <Tabs v-model="activeTab">
      <Tab title="地点管理">
        <div v-if="!canManageLocation" class="no-permission">
          <p>无管理权限</p>
          <p class="permission-tip">仅主管理员和财务可管理地点</p>
        </div>
        <template v-else>
          <Button type="primary" block @click="openAddModal" class="add-btn">
            添加地点
          </Button>
          
          <div v-for="item in locations" :key="item.id" class="list-item">
            <CellGroup>
              <Cell>
                <template #title>
                  <div class="location-name">{{ item.name }}</div>
                </template>
                <template #right-icon>
                  <div class="location-right">
                    <span class="location-amount">¥{{ item.amount }}</span>
                    <div class="action-buttons">
                      <Button type="default" size="mini" @click="editLocation(item)">编辑</Button>
                      <Button type="danger" size="mini" @click="deleteLocation(item.id)">删除</Button>
                    </div>
                  </div>
                </template>
              </Cell>
            </CellGroup>
          </div>
        </template>
      </Tab>
      
      <Tab title="数据导出">
        <div v-if="!canExport" class="no-permission">
          <p>无导出权限</p>
          <p class="permission-tip">仅主管理员和财务可导出数据</p>
        </div>
        <div v-else class="export-container">
          <div class="filter-row">
            <div class="filter-item">
              <label>年份：</label>
              <Cell center is-link @click="showYearPicker = true">
                <template #title>
                  <span>{{ exportYear }}年</span>
                </template>
              </Cell>
            </div>
            <div class="filter-item">
              <label>月份：</label>
              <Cell center is-link @click="showMonthPicker = true">
                <template #title>
                  <span>{{ exportMonth }}月</span>
                </template>
              </Cell>
            </div>
          </div>
          <Button type="primary" block @click="exportData" class="export-btn">
            按月导出Excel
          </Button>
        </div>
      </Tab>
    </Tabs>
    
    <Popup v-model:show="showAddLocationModal" position="bottom" round style="z-index: 9999;">
      <div class="modal-content">
        <h3>{{ editingLocation ? '编辑地点' : '添加地点' }}</h3>
        <Field
          v-model="locationForm.name"
          placeholder="地点名称"
        />
        <Field
          v-model="locationForm.amount"
          type="digit"
          placeholder="标准金额"
        />
        <div class="modal-buttons">
          <Button type="default" @click="showAddLocationModal = false">取消</Button>
          <Button type="primary" @click="saveLocation">保存</Button>
        </div>
      </div>
    </Popup>

    <Popup v-model:show="showYearPicker" position="bottom">
      <Picker
        :columns="yearColumns"
        :model-value="[exportYear]"
        @confirm="onYearConfirm"
        @cancel="showYearPicker = false"
      />
    </Popup>

    <Popup v-model:show="showMonthPicker" position="bottom">
      <Picker
        :columns="monthColumns"
        :model-value="[exportMonth]"
        @confirm="onMonthConfirm"
        @cancel="showMonthPicker = false"
      />
    </Popup>
    
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { Tabs, Tab, Cell, CellGroup, Button, Field, Popup, showToast, Picker, showConfirmDialog } from 'vant'
import NavBar from '../components/NavBar.vue'
import * as XLSX from 'xlsx'
import BottomNav from '../components/BottomNav.vue'
import { adminAPI, applicationAPI } from '../api'

const activeTab = ref(0)
const locations = ref([])
const showAddLocationModal = ref(false)
const showYearPicker = ref(false)
const showMonthPicker = ref(false)
const editingLocation = ref(null)
const exportYear = ref(new Date().getFullYear())
const exportMonth = ref(new Date().getMonth() + 1)

const user = JSON.parse(localStorage.getItem('user') || '{}')
const currentUser = ref({
  id: user.id || '',
  name: user.name || '',
  role: user.role || '',
  is_admin: user.is_admin || 0
})

const canManageLocation = computed(() => {
  return currentUser.value.is_admin === 1 || currentUser.value.role === '财务'
})

const canExport = computed(() => {
  return currentUser.value.is_admin === 1 || currentUser.value.role === '财务'
})

const onYearConfirm = ({ selectedValues }) => {
  exportYear.value = selectedValues[0]
  showYearPicker.value = false
}

const onMonthConfirm = ({ selectedValues }) => {
  exportMonth.value = selectedValues[0]
  showMonthPicker.value = false
}

const yearColumns = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ text: y + '年', value: y })
  }
  return years
})

const monthColumns = Array.from({ length: 12 }, (_, i) => ({
  text: (i + 1) + '月',
  value: i + 1
}))

const locationForm = reactive({
  name: '',
  amount: ''
})

const loadLocations = async () => {
  const result = await adminAPI.locations()
  if (result.success) {
    locations.value = result.data
  }
}

const openAddModal = () => {
  editingLocation.value = null
  locationForm.name = ''
  locationForm.amount = ''
  showAddLocationModal.value = true
}

const editLocation = (item) => {
  editingLocation.value = item
  locationForm.name = item.name
  locationForm.amount = String(item.amount)
  showAddLocationModal.value = true
}

const closeModal = () => {
  showAddLocationModal.value = false
  editingLocation.value = null
  locationForm.id = ''
  locationForm.name = ''
  locationForm.amount = ''
}

const saveLocation = async () => {
  if (!locationForm.name || !locationForm.amount) {
    showToast('请填写完整信息')
    return
  }
  
  try {
    if (editingLocation.value) {
      await adminAPI.updateLocation(editingLocation.value.id, {
        name: locationForm.name,
        amount: parseFloat(locationForm.amount)
      })
      showToast('更新成功')
    } else {
      await adminAPI.createLocation({
        name: locationForm.name,
        amount: parseFloat(locationForm.amount)
      })
      showToast('添加成功')
    }
    
    closeModal()
    loadLocations()
  } catch (error) {
    const msg = error.response?.data?.message || error.message || '操作失败'
    showToast(msg)
  }
}

const deleteLocation = async (id) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除该地点吗？',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonColor: '#ee0a24'
    })
    
    const result = await adminAPI.deleteLocation(id)
    if (result.success) {
      showToast('删除成功')
      loadLocations()
    } else {
      showToast(result.message || '删除失败')
    }
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除失败:', error)
    const msg = error.response?.data?.message || error.message || '删除失败'
    showToast(msg)
  }
}

const exportData = async () => {
  if (!exportYear.value || !exportMonth.value) {
    showToast('请选择年份和月份')
    return
  }
  
  try {
    const result = await applicationAPI.list()
    if (!result.success) {
      showToast('获取数据失败')
      return
    }
    
    const monthStr = String(exportMonth.value).padStart(2, '0')
    const monthPrefix = `${exportYear.value}-${monthStr}`
    
    const filteredApps = result.data.filter(app => {
      const applyDate = app.apply_date.split('T')[0]
      return applyDate.startsWith(monthPrefix)
    })
    
    if (filteredApps.length === 0) {
      showToast(`${exportYear.value}年${exportMonth.value}月暂无数据`)
      return
    }
    
    const exportData = filteredApps.map(app => ({
      '申请日期': app.apply_date.split('T')[0],
      '出行日期': app.travel_date.split('T')[0],
      '申请人': app.applicant_name,
      '申请人部门': app.applicant_department,
      '审批负责人': app.approver_name,
      '公出事由': app.reason,
      '公出地点': app.location_name,
      '出行人数': app.person_count,
      '报销金额': parseFloat(app.amount).toFixed(2),
      '审批状态': app.status === 'approved' ? '已通过' : app.status === 'rejected' ? '已驳回' : app.status === 'pending' ? '待审批' : app.status === 'cancelled' ? '已取消' : '草稿',
      '审批时间': app.approved_at ? app.approved_at.split('T')[0] : '',
      '审批意见': app.approver_comment || '',
      '驳回原因': app.reject_reason || ''
    }))
    
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    const colWidths = [
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 20 }, { wch: 20 }
    ]
    ws['!cols'] = colWidths
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${exportYear.value}年${exportMonth.value}月`)
    
    const filename = `公出审批数据_${exportYear.value}年${exportMonth.value}月.xlsx`
    XLSX.writeFile(wb, filename)
    
    showToast(`成功导出 ${filteredApps.length} 条数据`)
  } catch (error) {
    console.error('导出失败:', error)
    showToast('导出失败')
  }
}

onMounted(() => {
  loadLocations()
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  padding-top: 100px;
  padding-bottom: 100px;
  background: #f5f5f5;
}

.add-btn {
  margin: 16px;
}

.location-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.location-id {
  font-size: 12px;
  color: #999;
}

.location-amount {
  font-size: 16px;
  color: #1989fa;
  font-weight: 600;
}

.location-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.user-department {
  font-size: 12px;
  color: #999;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons button {
  flex-shrink: 0;
}

.export-container {
  padding: 16px;
}

.filter-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-item {
  flex: 1;
}

.filter-item label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.export-btn {
  margin-top: 16px;
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

.no-permission {
  text-align: center;
  padding: 60px 20px;
}

.no-permission p {
  font-size: 16px;
  color: #666;
  margin-bottom: 8px;
}

.permission-tip {
  font-size: 14px;
  color: #999 !important;
}
</style>
