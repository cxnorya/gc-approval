import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/apply',
    name: 'Apply',
    component: () => import('../views/ApplyView.vue')
  },
  {
    path: '/approve',
    name: 'Approve',
    component: () => import('../views/ApproveView.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminView.vue')
  },
  {
    path: '/export',
    name: 'Export',
    component: () => import('../views/ExportView.vue')
  },
  {
    path: '/mine',
    name: 'Mine',
    component: () => import('../views/MineView.vue')
  },
  {
    path: '/mine/submitted',
    name: 'Submitted',
    component: () => import('../views/SubmittedView.vue')
  },
  {
    path: '/mine/handled',
    name: 'Handled',
    component: () => import('../views/HandledView.vue')
  },
  {
    path: '/approval-detail',
    name: 'ApprovalDetail',
    component: () => import('../views/ApprovalDetailView.vue')
  },
  {
    path: '/upload-test',
    name: 'UploadTest',
    component: () => import('../views/UploadTest.vue')
  },
  {
    path: '/',
    redirect: '/apply'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const APPROVER_ROLES = ['校长', '副校长', '教科室主任', '教导主任', '德育主任', '组长']
const FINANCE_ROLES = ['财务']

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (to.path !== '/login' && !token) {
    next('/login')
    return
  }

  if (token) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const canApprove = APPROVER_ROLES.includes(user.role) || user.role === 'admin'
      const isAdmin = user.is_admin === 1 || user.is_admin === true || FINANCE_ROLES.includes(user.role)

      if (to.path === '/approve' && !canApprove) {
        next('/apply')
        return
      }
      if (to.path === '/admin' && !isAdmin) {
        next('/apply')
        return
      }
    } catch {
      // ignore parse error
    }
  }

  next()
})

export default router
