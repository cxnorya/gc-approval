<template>
  <div class="nav-bar">
    <div class="nav-content">
      <div v-if="showBack" class="nav-back" @click="handleBack">
        <span>←</span>
      </div>
      <div class="nav-title">{{ title }}</div>
      <div class="nav-right">
        <slot name="right"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  showBack: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()

const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/apply')
  }
}
</script>

<style scoped>
.nav-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 44px 16px 16px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  user-select: none;
}

.nav-title {
  flex: 1;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.nav-right {
  width: 40px;
}
</style>
