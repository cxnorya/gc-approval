<template>
  <router-view />
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 60px;
}

.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-content {
  padding: 40px 20px;
}

.logo {
  text-align: center;
  margin-bottom: 40px;
}

.logo-icon {
  font-size: 60px;
  margin-bottom: 15px;
}

.logo h1 {
  color: #fff;
  font-size: 24px;
  margin-bottom: 10px;
}

.logo p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.login-input {
  width: 100%;
  height: 45px;
  padding: 0 15px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 16px;
}

.login-btn {
  margin-top: 20px;
  height: 45px;
  font-size: 16px;
}

.quick-login {
  margin-top: 30px;
  text-align: center;
}

.quick-login p {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 15px;
}

.btn-group {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.form-container {
  padding: 20px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.location-amount {
  display: block;
  margin-top: 8px;
  color: #1989fa;
  font-size: 14px;
}

.amount-display {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #fff;
}

.amount-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 10px;
}

.amount-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 10px;
}

.amount-formula {
  font-size: 12px;
  opacity: 0.8;
}

.submit-btn {
  height: 50px;
  font-size: 16px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.empty-state p {
  color: #999;
}

.application-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 5px;
}

.application-meta {
  display: flex;
  gap: 15px;
  font-size: 13px;
  color: #999;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 5px;
}

.detail-row .amount {
  color: #ee0a24;
  font-weight: 500;
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

.action-buttons {
  display: flex;
  gap: 10px;
  padding: 10px 15px;
  border-top: 1px solid #f0f0f0;
}

.action-buttons button {
  flex: 1;
}

.modal-content {
  padding: 20px;
}

.modal-content h3 {
  font-size: 16px;
  margin-bottom: 20px;
  text-align: center;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-buttons button {
  flex: 1;
}

.add-btn {
  margin: 15px;
}

.location-name {
  font-weight: 600;
  font-size: 16px;
}

.location-id {
  font-size: 13px;
  color: #999;
}

.location-amount {
  color: #ee0a24;
  font-weight: 600;
}

.user-name {
  font-weight: 600;
  font-size: 16px;
}

.user-department {
  font-size: 13px;
  color: #999;
}

.export-container {
  padding: 20px;
}

.export-btn {
  margin-top: 20px;
  height: 50px;
}

@media (min-width: 1024px) {
  .login-content {
    max-width: 400px;
    margin: 0 auto;
    padding-top: 100px;
  }
  
  .form-container {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .bottom-nav {
    display: none;
  }
}
</style>
