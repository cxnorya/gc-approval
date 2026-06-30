<template>
  <div class="export-page">
    <NavBar title="数据导出" />
    
    <div class="export-container">
      <div class="export-card">
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <div class="card-title">月度审批数据导出</div>
        </div>
        
        <div class="form-group">
          <label>选择月份</label>
          <input 
            v-model="selectedMonth" 
            type="month" 
            class="month-input"
          />
        </div>
        
        <div class="form-group">
          <label>导出格式</label>
          <div class="format-options">
            <label 
              v-for="format in formats" 
              :key="format.value"
              class="format-option"
            >
              <input 
                type="radio" 
                v-model="selectedFormat" 
                :value="format.value"
              />
              <span>{{ format.label }}</span>
            </label>
          </div>
        </div>
        
        <button class="export-btn" @click="handleExport">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          导出数据
        </button>
        
        <div v-if="exporting" class="loading">
          <div class="spinner"></div>
          <span>正在导出...</span>
        </div>
      </div>
      
      <div class="history-card">
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div class="card-title">导出记录</div>
        </div>
        
        <div v-if="exportHistory.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <p>暂无导出记录</p>
        </div>
        
        <div v-else class="history-list">
          <div v-for="record in exportHistory" :key="record.id" class="history-item">
            <div class="history-info">
              <div class="history-date">{{ record.date }}</div>
              <div class="history-format">{{ record.format }}</div>
            </div>
            <div class="history-actions">
              <button class="download-btn" @click="downloadFile(record)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <BottomNav />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NavBar from '../components/NavBar.vue'
import BottomNav from '../components/BottomNav.vue'
import { adminAPI } from '../api'

const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const selectedFormat = ref('excel')
const exporting = ref(false)

const formats = [
  { label: 'Excel (.xlsx)', value: 'excel' },
  { label: 'CSV (.csv)', value: 'csv' }
]

const exportHistory = ref([
  { id: 1, date: '2026-06-15 10:30', format: 'Excel', file: 'export_202606.xlsx' },
  { id: 2, date: '2026-05-20 14:15', format: 'CSV', file: 'export_202605.csv' }
])

const handleExport = async () => {
  exporting.value = true
  
  try {
    const params = {
      month: selectedMonth.value,
      format: selectedFormat.value
    }
    
    const response = await adminAPI.export(params)
    
    if (response.success) {
      const blob = new Blob([response.data], { 
        type: selectedFormat.value === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `公出审批数据_${selectedMonth.value}.${selectedFormat.value === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      exportHistory.value.unshift({
        id: Date.now(),
        date: new Date().toLocaleString('zh-CN'),
        format: selectedFormat.value === 'excel' ? 'Excel' : 'CSV',
        file: `export_${selectedMonth.value.replace('-', '')}.${selectedFormat.value === 'excel' ? 'xlsx' : 'csv'}`
      })
    }
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

const downloadFile = (record) => {
  alert(`下载: ${record.file}`)
}
</script>

<style scoped>
.export-page {
  min-height: 100vh;
  padding: 80px 16px 120px;
  background: #f5f5f5;
}

.export-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-card, .history-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.card-icon {
  width: 28px;
  height: 28px;
  color: #0077ff;
  margin-right: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.month-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.format-options {
  display: flex;
  gap: 20px;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.format-option input[type="radio"] {
  width: 16px;
  height: 16px;
}

.format-option span {
  font-size: 14px;
  color: #333;
}

.export-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #0077ff 0%, #00c6ff 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s;
}

.export-btn:hover {
  opacity: 0.9;
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  gap: 8px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #0077ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
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

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-date {
  font-size: 14px;
  color: #333;
}

.history-format {
  font-size: 12px;
  color: #999;
}

.download-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #0077ff;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.download-btn svg {
  width: 16px;
  height: 16px;
}
</style>
