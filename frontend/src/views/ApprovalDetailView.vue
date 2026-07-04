<template>
  <div class="approval-detail-page">
    <NavBar title="审批详情" :showBack="true" @back="goBack" />
    
    <div v-if="loading" class="loading-state">
      <div class="loading-icon">⏳</div>
      <p>加载中...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <div class="error-icon">❌</div>
      <p>{{ error }}</p>
    </div>
    
    <div v-else-if="application" class="detail-container">
      <div class="info-card">
        <div class="cell-item"><div class="cell-title">申请人</div><div class="cell-value">{{ application.applicant_name }}</div></div>
        <div class="cell-item"><div class="cell-title">申请人部门</div><div class="cell-value">{{ application.applicant_department }}</div></div>
        <div class="cell-item"><div class="cell-title">审批负责人</div><div class="cell-value">{{ application.approver_name }}</div></div>
        <div class="cell-item"><div class="cell-title">公出地点</div><div class="cell-value">{{ application.location_name }}</div></div>
        <div class="cell-item"><div class="cell-title">出行日期</div><div class="cell-value">{{ application.travel_date }}</div></div>
        <div class="cell-item">
          <div class="cell-title">公出事由</div>
          <div class="cell-value reason-text">{{ application.reason }}</div>
        </div>
        <div v-for="(attachment, index) in attachments" :key="index" class="cell-item cell-link" @click.stop="previewAttachment(attachment)">
          <div class="cell-title">证明附件</div>
          <div class="cell-value attachment-link">{{ attachment.originalname }}<span class="cell-arrow">›</span></div>
        </div>
        <div class="cell-item"><div class="cell-title">出行人数</div><div class="cell-value">{{ application.person_count }}人</div></div>
        <div class="cell-item"><div class="cell-title">报销金额</div><div class="cell-value">¥{{ application.amount }}</div></div>
        <div class="cell-item"><div class="cell-title">申请日期</div><div class="cell-value">{{ application.apply_date }}</div></div>
        <div class="cell-item cell-item-last">
          <div class="cell-title">当前状态</div>
          <div class="cell-value"><span :class="['status-tag', application.status]">{{ getStatusName(application.status) }}</span></div>
        </div>
      </div>

      <div class="info-card" v-if="application.status !== 'pending' && application.comment">
        <div class="cell-item"><div class="cell-title">审批意见</div><div class="cell-value">{{ application.comment }}</div></div>
        <div class="cell-item cell-item-last" v-if="application.approved_at"><div class="cell-title">审批时间</div><div class="cell-value">{{ application.approved_at }}</div></div>
      </div>

      <div v-if="canApprove && application.status === 'pending'" class="action-section">
        <Button type="danger" block @click="showRejectModal = true">驳回</Button>
        <Button type="primary" block @click="showApproveConfirm">通过</Button>
      </div>
    </div>

    <Popup v-model="showRejectModal" position="bottom" :close-on-click-overlay="true">
      <div class="modal-content">
        <h3>驳回原因</h3>
        <Field v-model="rejectReason" type="textarea" placeholder="请输入驳回原因" :rows="3" />
        <div class="modal-buttons">
          <Button type="default" @click="showRejectModal = false">取消</Button>
          <Button type="danger" @click="confirmReject">确认驳回</Button>
        </div>
      </div>
    </Popup>

    <Popup v-model:show="showPreviewPopup" :close-on-click-overlay="true" round>
      <div class="preview-container">
        <div class="preview-header">
          <span class="preview-title">{{ previewFileName }}</span>
          <span class="preview-close" @click="showPreviewPopup = false">✕</span>
        </div>
        <div class="preview-content">
          <img v-if="isImage(previewFileName)" :src="previewUrl" class="preview-image" alt="预览图片" />
          <div v-else-if="isPdf(previewFileName)" class="pdf-preview-wrapper">
            <div v-if="pdfLoading" class="pdf-loading">
              <div class="pdf-loading-spinner"></div>
              <span>加载中 {{ pdfProgress }}%</span>
            </div>
            <div class="pdf-container"></div>
            <div class="pdf-pagination">
              <button class="pdf-page-btn" :disabled="currentPage <= 1" @click="changePdfPage(-1)">上一页</button>
              <span class="pdf-page-info">{{ currentPage }} / {{ pdfPages.length }}</span>
              <button class="pdf-page-btn" :disabled="currentPage >= pdfPages.length" @click="changePdfPage(1)">下一页</button>
            </div>
          </div>
          <div v-else-if="isWord(previewFileName)" class="word-preview-wrapper">
            <div v-if="pdfLoading" class="pdf-loading">
              <div class="pdf-loading-spinner"></div>
              <span>加载中...</span>
            </div>
            <div class="word-container"></div>
          </div>
          <iframe v-else-if="previewUrl" :src="previewUrl" class="preview-iframe" frameborder="0"></iframe>
        </div>
      </div>
    </Popup>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Cell, CellGroup, Button, Field, Popup, showToast, showConfirmDialog, ImagePreview } from 'vant'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { renderAsync } from 'docx-preview'
import NavBar from '../components/NavBar.vue'
import BottomNav from '../components/BottomNav.vue'
import { applicationAPI, approvalAPI, getBackendAssetUrl } from '../api'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const application = ref(null)
const showRejectModal = ref(false)
const rejectReason = ref('')
const canApprove = ref(false)
const attachments = ref([])
const showPreviewPopup = ref(false)
const previewUrl = ref('')
const previewFileName = ref('')
const pdfLoading = ref(false)
const pdfProgress = ref(0)
const pdfPages = ref([])
const currentPage = ref(1)
const pdfDocument = shallowRef(null)

const user = JSON.parse(localStorage.getItem('user') || '{}')
const userId = parseInt(user.id) || 0

const APPROVER_ROLES = ['校长', '副校长', '教科室主任', '教导主任', '德育主任', '组长']

const getStatusName = (status) => {
  const statusMap = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已取消',
    draft: '草稿'
  }
  return statusMap[status] || status
}

const isImage = (url) => {
  return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url)
}

const isPdf = (url) => {
  if (!url) return false
  return /\.pdf/i.test(url)
}

const isWord = (url) => {
  if (!url) return false
  return /\.(doc|docx)$/i.test(url)
}

const renderPdf = async (url) => {
  pdfLoading.value = true
  pdfProgress.value = 0
  pdfPages.value = []
  currentPage.value = 1
  // 等待DOM渲染完成
  await nextTick()
  try {
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: data, disableWorker: false })
    loadingTask.onProgress = (progress) => { pdfProgress.value = Math.round(progress * 100) }
    const pdf = await loadingTask.promise
    pdfDocument.value = pdf
    const totalPages = pdf.numPages
    pdfPages.value = Array.from({ length: totalPages }, (_, i) => i + 1)
    await renderPdfPage(pdf, 1)
    pdfLoading.value = false
  } catch (error) {
    console.error('PDF加载失败:', error)
    pdfLoading.value = false
    showToast('PDF加载失败')
  }
}

const renderPdfPage = async (pdf, pageNum) => {
  try {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.5 })
    const container = document.querySelector('.pdf-container')
    if (!container) {
      console.log('renderPdfPage: container not found')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.className = 'pdf-canvas'
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.cssText = 'max-width:100%;height:auto;display:block;margin:0 auto'
    const ctx = canvas.getContext('2d')
    const renderTask = page.render({ canvasContext: ctx, viewport: viewport })
    await renderTask.promise
    container.innerHTML = ''
    container.appendChild(canvas)
    currentPage.value = pageNum
  } catch (error) {
    console.error('渲染PDF页面失败:', error)
    showToast('PDF页面渲染失败')
  }
}

const changePdfPage = async (delta) => {
  const newPage = currentPage.value + delta
  if (newPage < 1 || newPage > pdfPages.value.length) {
    console.log("changePdfPage: page out of range", {newPage, total: pdfPages.value.length})
    return
  }
  if (!pdfDocument.value) {
    console.log("changePdfPage: pdfDocument is null")
    showToast("PDF文档未加载完成")
    return
  }
  try {
    await renderPdfPage(pdfDocument.value, newPage)
  } catch (err) {
    console.error("changePdfPage error:", err)
    showToast("翻页失败")
  }
}

const formatSize = (size) => {
  if (!size) return '0 B'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

let currentBlobUrl = null

const revokeBlobUrl = () => {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }
}

const previewAttachment = async (attachment) => {
  if (!attachment.url) return
  revokeBlobUrl()
  let url = attachment.url
  url = getBackendAssetUrl(url)
  url += (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
  const fileName = attachment.originalname || '附件预览'
  previewFileName.value = fileName

  if (isImage(fileName)) {
    previewUrl.value = url
    showPreviewPopup.value = true
  } else if (isPdf(fileName)) {
    previewUrl.value = url
    showPreviewPopup.value = true
    renderPdf(url)
  } else if (isWord(fileName)) {
    previewUrl.value = url
    showPreviewPopup.value = true
    pdfLoading.value = true
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      nextTick(() => {
        const container = document.querySelector('.word-container')
        if (container) {
          container.innerHTML = ''
          renderAsync(blob, container).then(() => { pdfLoading.value = false }).catch(() => { pdfLoading.value = false; showToast('Word预览失败') })
        }
      })
    } catch (error) {
      console.error('Word加载失败:', error)
      pdfLoading.value = false
      showToast('Word预览失败')
    }
  } else {
    window.open(url, '_blank')
  }
}

const loadDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    const id = route.query.id
    if (!id) { error.value = '缺少ID'; loading.value = false; return }
    const result = await applicationAPI.detail(id)
    if (result.success) {
      application.value = result.data
      canApprove.value = (APPROVER_ROLES.includes(user.role) || user.role === 'admin') && parseInt(result.data.approver_id) === userId
      const rawAttachments = result.data.attachments
      if (rawAttachments) {
        try {
          const parsed = typeof rawAttachments === 'string' ? JSON.parse(rawAttachments) : rawAttachments
          attachments.value = Array.isArray(parsed) ? parsed.map((att, i) => {
            let originalname = att.originalname || att.name || '附件_' + i
            return { url: att.url, originalname: originalname }
          }) : []
        } catch (e) { attachments.value = [] }
      } else { attachments.value = [] }
    } else { error.value = result.message || '获取详情失败' }
  } catch (err) { error.value = '获取详情失败，请稍后重试' }
  finally { loading.value = false }
}

const showApproveConfirm = async () => {
  try {
    await showConfirmDialog({ title: '确认通过', message: '确认要通过此申请吗？', confirmButtonText: '通过', cancelButtonText: '取消' })
    console.log('[审批详情] 开始审批通过, id=', application.value.id)
    const result = await approvalAPI.approve(application.value.id, { comment: '同意', approver_id: userId })
    console.log('[审批详情] 审批通过返回:', result)
    if (result.success) { showToast({ message: '审批通过', type: 'success' }); loadDetail() }
    else { showToast(result.message || '审批失败') }
  } catch (err) {
    // Vant 4 取消对话框时 err = { action: 'cancel' }，不是字符串 'cancel'
    if (err && err.action !== 'cancel') {
      console.error('[审批详情] 审批异常:', err)
      showToast('审批失败')
    }
  }
}

const confirmReject = async () => {
  if (!rejectReason.value) { showToast('请输入驳回原因'); return }
  try {
    console.log('[审批详情] 开始驳回, id=', application.value.id)
    const result = await approvalAPI.reject(application.value.id, { reason: rejectReason.value, approver_id: userId })
    console.log('[审批详情] 驳回返回:', result)
    if (result.success) { showToast({ message: '已驳回', type: 'success' }); showRejectModal.value = false; rejectReason.value = ''; loadDetail() }
    else { showToast(result.message || '驳回失败') }
  } catch (err) { console.error('[审批详情] 驳回异常:', err); showToast('驳回失败') }
}

const goBack = () => { router.back() }

onMounted(() => { loadDetail() })
onUnmounted(() => { revokeBlobUrl() })

watch(showPreviewPopup, (newVal) => {
  if (!newVal) { setTimeout(() => { revokeBlobUrl() }, 500) }
})
</script>

<style scoped>
.approval-detail-page { min-height: 100vh; padding-top: 110px; padding-bottom: 100px; background: #f5f5f5; }
.loading-state, .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; }
.loading-icon, .error-icon { font-size: 48px; margin-bottom: 16px; }
.loading-state p, .error-state p { color: #999; font-size: 14px; }
.detail-container { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.info-card { background: #fff; border-radius: 12px; overflow: hidden; }
.cell-item { display: flex; padding: 14px 16px; border-bottom: 1px solid #f0f0f0; align-items: center; }
.cell-item-last { border-bottom: none; }
.cell-title { font-size: 14px; color: #666; flex-shrink: 0; width: 100px; }
.cell-value { flex: 1; font-size: 14px; color: #333; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.cell-link { cursor: pointer; transition: background 0.2s; }
.cell-link:active { background: #f5f5f5; }
.cell-arrow { color: #999; font-size: 18px; margin-left: 4px; }
.status-tag { padding: 4px 12px; border-radius: 20px; font-size: 12px; }
.status-tag.pending { background: #fff7e6; color: #faad14; }
.status-tag.approved { background: #e6f7ff; color: #1890ff; }
.status-tag.rejected { background: #fff2f0; color: #f5222d; }
.status-tag.cancelled, .status-tag.draft { background: #f5f5f5; color: #999; }
.action-section { display: flex; flex-direction: column; gap: 12px; padding: 16px 12px; }
.modal-content { padding: 20px; }
.modal-content h3 { font-size: 18px; font-weight: 600; margin-bottom: 16px; text-align: center; }
.modal-buttons { display: flex; gap: 12px; margin-top: 20px; }
.modal-buttons button { flex: 1; }
.reason-text { color: #333; font-size: 14px; line-height: 1.5; word-break: break-word; text-align: right; }
.attachment-link { color: #1989fa; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }

.preview-container { display: flex; flex-direction: column; height: 80vh; background: #fff; }
.preview-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #eee; }
.preview-title { font-size: 16px; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.preview-close { font-size: 20px; color: #999; cursor: pointer; padding: 4px 8px; }
.preview-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.preview-iframe { width: 100%; height: 100%; border: none; }
.preview-image { max-width: 100%; max-height: 100%; object-fit: contain; }

.pdf-preview-wrapper { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; }
.pdf-container { width: 100%; flex: 1; overflow: auto; display: flex; align-items: flex-start; justify-content: flex-start; padding: 8px; box-sizing: border-box; }
.pdf-canvas { display: block; margin: 0 auto; max-width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px; }
.pdf-loading { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; z-index: 10; }
.pdf-loading-spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.pdf-loading span { margin-top: 16px; font-size: 14px; color: #666; }

.pdf-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px; border-top: 1px solid #eee; background: #fff; }
.pdf-page-btn { padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: #fff; color: #333; font-size: 14px; cursor: pointer; min-width: 70px; text-align: center; }
.pdf-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pdf-page-btn:active:not(:disabled) { background: #f5f5f5; }
.pdf-page-info { font-size: 14px; color: #666; min-width: 80px; text-align: center; }

.word-preview-wrapper { position: relative; width: 100%; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.word-container { width: 100%; flex: 1; min-height: 0; overflow: auto; padding: 12px; box-sizing: border-box; -webkit-overflow-scrolling: touch; }
.word-container :deep(*) { max-width: 100% !important; width: auto !important; word-break: break-word !important; overflow-wrap: break-word !important; hyphens: auto; box-sizing: border-box !important; white-space: normal !important; }
.word-container :deep(.docx), .word-container :deep(.docx-page) { width: 100% !important; max-width: 100% !important; padding: 4px !important; margin: 0 !important; box-shadow: none !important; }

@media (max-width: 768px) {
  .word-container { padding: 8px; }
  .word-container :deep(*) { max-width: 100% !important; width: auto !important; word-break: break-word !important; overflow-wrap: break-word !important; float: none !important; }
  .word-container :deep(.docx), .word-container :deep(.docx-page) { width: 100% !important; max-width: 100% !important; padding: 2px !important; }
  .word-container :deep(table) { display: block !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
  .word-container :deep(td), .word-container :deep(th) { padding: 4px !important; font-size: 12px !important; word-break: break-word !important; }
  .word-container :deep(img) { max-width: 100% !important; height: auto !important; }
  .word-container :deep(p) { margin-bottom: 8px !important; line-height: 1.5 !important; font-size: 14px !important; text-align: justify !important; }
  .word-container :deep(span) { white-space: normal !important; }
  .pdf-page-btn { padding: 6px 12px; font-size: 12px; min-width: 60px; }
  .pdf-pagination { gap: 8px; padding: 8px; }
  .pdf-page-info { font-size: 12px; min-width: 60px; }
}
</style>
