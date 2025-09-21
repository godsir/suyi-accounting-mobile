import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions'
import { ElMessage } from 'element-plus'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/login/login.vue'),
    meta: { 
      requiresAuth: false,
      title: '登录'
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/pages/dashboard/dashboard.vue'),
    meta: { 
      requiresAuth: true,
      title: '首页',
      requiresLicense: false // 首页允许授权过期时访问
    }
  },
  {
    path: '/income',
    name: 'Income',
    component: () => import('@/pages/income/income.vue'),
    meta: { 
      requiresAuth: true,
      title: '收入记录',
      requiresLicense: true,
      requiresPermission: 'canAddRecords'
    }
  },
  {
    path: '/expense',
    name: 'Expense',
    component: () => import('@/pages/expense/expense.vue'),
    meta: { 
      requiresAuth: true,
      title: '支出记录',
      requiresLicense: true,
      requiresPermission: 'canAddRecords'
    }
  },
  {
    path: '/add-record',
    name: 'AddRecord',
    component: () => import('@/pages/add-record/add-record.vue'),
    meta: { 
      requiresAuth: true,
      title: '添加记录',
      requiresLicense: true
    }
  },
  {
    path: '/records',
    name: 'Records',
    component: () => import('@/pages/records/records.vue'),
    meta: { 
      requiresAuth: true,
      title: '收支记录',
      requiresLicense: true,
      requiresPermission: 'canViewStats'
    }
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('@/pages/stats/stats.vue'),
    meta: { 
      requiresAuth: true,
      title: '统计分析',
      requiresLicense: true
    }
  },
  {
    path: '/forecast',
    name: 'Forecast',
    component: () => import('@/pages/forecast/forecast.vue'),
    meta: {
      requiresAuth: true,
      title: '预测分析',
      requiresLicense: true
    }
  },
  {
    path: '/weather',
    name: 'Weather',
    component: () => import('@/pages/weather/weather.vue'),
    meta: {
      requiresAuth: true,
      title: '天气信息',
      requiresLicense: true
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import(/* webpackChunkName: "profile" */ '@/pages/profile/profile.vue'),
    meta: { 
      requiresAuth: true,
      title: '用户配置',
      requiresLicense: false // 用户配置页面允许授权过期时访问
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/settings/settings.vue'),
    meta: { 
      requiresAuth: true,
      title: '设置',
      requiresLicense: false // 设置页面允许授权过期时访问
    }
  },
  {
    path: '/settings/email',
    name: 'EmailSettings',
    component: () => import('@/pages/settings/email-settings.vue'),
    meta: { 
      requiresAuth: true,
      title: '邮件设置',
      requiresLicense: false
    }
  },
  {
    path: '/settings/weather',
    name: 'WeatherSettings',
    component: () => import('@/pages/settings/weather-settings.vue'),
    meta: { 
      requiresAuth: true,
      title: '天气API设置',
      requiresLicense: false
    }
  },
  {
    path: '/settings/user',
    name: 'UserSettings',
    component: () => import('@/pages/settings/user-settings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings/shops',
    name: 'ShopSettings',
    component: () => import('@/pages/settings/shop-settings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/email-report',
    name: 'EmailReport',
    component: () => import('@/pages/email-report/email-report.vue'),
    meta: { 
      requiresAuth: true,
      title: '邮件报表',
      requiresLicense: true
    }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/pages/about/about.vue'),
    meta: { 
      requiresAuth: true,
      title: '关于我们',
      requiresLicense: false // 关于页面允许授权过期时访问
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - Suyi账务管理系统`
  }
  
  // 检查登录状态
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    console.log('需要登录，跳转到登录页')
    // 保存目标路径，登录后跳转
    localStorage.setItem('redirectAfterLogin', to.fullPath)
    next('/login')
    return
  }
  
  // 如果已登录访问登录页，跳转到首页
  if (to.path === '/login' && userStore.isLoggedIn) {
    console.log('已登录用户访问登录页，跳转到首页')
    next('/dashboard')
    return
  }
  
  // 检查权限（在已登录的前提下）
  if (to.meta.requiresAuth && userStore.isLoggedIn) {
    // 创建权限检查实例（需要在守卫内部创建以确保用户状态已更新）
    const permissions = usePermissions()
    
    // 对于需要授权的页面，检查授权状态
    if (to.meta.requiresLicense && permissions.isLicenseExpired.value) {
      console.log('授权已过期，阻止访问:', to.path)
      ElMessage.error('系统授权已过期，无法访问此功能')
      // 如果当前不在首页或用户配置页面，跳转到首页
      if (from.path !== '/dashboard' && from.path !== '/profile') {
        next('/dashboard')
      } else {
        next(false) // 取消导航
      }
      return
    }
    
    // 检查页面权限
    let requiredPermission = ''
    switch (to.path) {
      case '/income':
        requiredPermission = PERMISSIONS.INCOME
        break
      case '/expense':
        requiredPermission = PERMISSIONS.EXPENSE
        break
      case '/records':
        requiredPermission = PERMISSIONS.RECORDS
        break
      case '/stats':
        requiredPermission = PERMISSIONS.STATS
        break
      case '/forecast':
        requiredPermission = PERMISSIONS.FORECAST
        break
      case '/weather':
        requiredPermission = PERMISSIONS.WEATHER
        break
      case '/email-report':
        requiredPermission = PERMISSIONS.EMAIL_REPORT
        break
    }
    
    if (requiredPermission && !permissions.hasPermission(requiredPermission)) {
      console.log('权限不足，阻止访问:', to.path, '需要权限:', requiredPermission)
      
      let errorMessage = '权限不足，无法访问此功能'
      switch (requiredPermission) {
        case PERMISSIONS.INCOME:
          errorMessage = '您没有收入记录权限'
          break
        case PERMISSIONS.EXPENSE:
          errorMessage = '您没有支出记录权限'
          break
        case PERMISSIONS.RECORDS:
          errorMessage = '您没有查看记录权限'
          break
        case PERMISSIONS.STATS:
          errorMessage = '您没有查看统计权限'
          break
        case PERMISSIONS.FORECAST:
          errorMessage = '您没有预测分析权限'
          break
        case PERMISSIONS.WEATHER:
          errorMessage = '您没有天气信息权限'
          break
        case PERMISSIONS.EMAIL_REPORT:
          errorMessage = '您没有邮件报表权限'
          break
      }
      
      ElMessage.error(errorMessage)
      
      // 跳转到首页
      if (from.path !== '/dashboard') {
        next('/dashboard')
      } else {
        next(false) // 取消导航
      }
      return
    }
    
    // 检查店铺访问权限（除了首页、用户配置页面和设置相关页面）
    const allowedPathsWithoutShopAccess = [
      '/dashboard', 
      '/profile', 
      '/settings'
    ]
    
    const needsShopAccess = !allowedPathsWithoutShopAccess.some(path => to.path.startsWith(path))
    
    if (needsShopAccess && !userStore.hasShopAccess) {
      console.log('无店铺访问权限，阻止访问:', to.path)
      ElMessage.error('您没有店铺访问权限，无法使用此功能')
      
      if (from.path !== '/dashboard') {
        next('/dashboard')
      } else {
        next(false) // 取消导航
      }
      return
    }
  }
  
  console.log('路由守卫检查通过，允许访问:', to.path)
  next()
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  ElMessage.error('页面加载失败，请重试')
})

export default router