<template>
  <div style="padding: 20px;">
    <h2>上传测试</h2>
    <Uploader 
      v-model:file-list="fileList"
      :max-count="3"
      :deletable="true"
      @after-read="onAfterRead"
    />
    <p>fileList: {{ fileList }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Uploader, showToast } from 'vant'
import { uploadAPI, getBackendAssetUrl } from '../api'

const fileList = ref([])

const onAfterRead = async (file) => {
  console.log('onAfterRead - file:', file)
  console.log('onAfterRead - fileList:', fileList.value)
  
  const rawFile = file.file
  if (!rawFile) {
    showToast('无法获取文件')
    return
  }
  
  showToast('上传中...')
  
  try {
    const formData = new FormData()
    formData.append('file', rawFile)
    
    const response = await uploadAPI.upload(formData)
    
    console.log('上传响应:', response)
    
    if (response.success) {
      const fullUrl = getBackendAssetUrl(response.data.url)
      
      file.status = 'done'
      file.url = fullUrl
      
      console.log('上传成功 - file:', file)
      console.log('上传成功 - fileList:', fileList.value)
      
      showToast('上传成功')
    } else {
      file.status = 'failed'
      showToast('上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    file.status = 'failed'
    showToast('上传失败')
  }
}
</script>
