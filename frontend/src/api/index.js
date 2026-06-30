import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(error)
  }
)

export const getBackendAssetUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

export const authAPI = {
  login: (code) => api.post('/auth/login', { code }),
  dingtalkLogin: (code) => api.post('/auth/dingtalk-login', { code }),
  getUserInfo: () => api.get('/auth/userinfo'),
  logout: () => api.post('/auth/logout')
}

export const login = (name) => api.post('/auth/login', { name })

export const dingtalkLogin = (code) => api.post('/auth/dingtalk-login', { code })

export const applicationAPI = {
  create: (data) => api.post('/applications', data),
  list: (params) => api.get('/applications', { params }),
  detail: (id) => api.get(`/applications/${id}`),
  update: (id, data) => api.put(`/applications/${id}`, data),
  delete: (id) => api.delete(`/applications/${id}`),
  submit: (id) => api.post(`/applications/${id}/submit`),
  cancel: (id) => api.post(`/applications/${id}/cancel`)
}

export const approvalAPI = {
  pending: (params) => api.get('/approvals/pending', { params }),
  pendingCount: (params) => api.get('/approvals/pending-count', { params }),
  approve: (id, data) => api.post(`/approvals/${id}/approve`, data),
  reject: (id, data) => api.post(`/approvals/${id}/reject`, data)
}

export const locationAPI = {
  list: () => api.get('/locations'),
  detail: (id) => api.get(`/locations/${id}`)
}

export const uploadAPI = {
  upload: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (filename) => api.delete(`/upload/${encodeURIComponent(filename)}`)
}

export const adminAPI = {
  users: () => api.get('/admin/users'),
  updateRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
  locations: () => api.get('/admin/locations'),
  createLocation: (data) => api.post('/admin/locations', data),
  updateLocation: (id, data) => api.put(`/admin/locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/admin/locations/${id}`),
  export: (params) => api.get('/admin/export', { params, responseType: 'blob' }),
  syncDingTalkUsers: () => api.post('/admin/dingtalk/sync')
}

export default api
