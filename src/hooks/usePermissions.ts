import { computed } from 'vue'
import { useUserStore } from '@/store/user'

// 定义权限配置 - 与electron客户端保持一致
export const PERMISSIONS = {
  // 页面权限
  DASHBOARD: 'dashboard',
  INCOME: 'income',
  EXPENSE: 'expense', 
  RECORDS: 'records',
  STATS: 'stats',
  FORECAST: 'forecast',
  EMAIL_REPORT: 'email_report',
  WEATHER: 'weather',
  CONFIG: 'config',
  
  // 功能权限
  EDIT_RECORDS: 'edit_records',
  DELETE_RECORDS: 'delete_records',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  LOCK_APP: 'lock_app',
  
  // 配置权限
  CONFIG_USER: 'config_user',
  CONFIG_SHOP: 'config_shop',
  CONFIG_EMAIL: 'config_email',
  CONFIG_SECURITY: 'config_security',
  CONFIG_TEMPLATE: 'config_template',
  CONFIG_BACKUP: 'config_backup',
  CONFIG_WEATHER_API: 'config_weather_api'
}

// 角色权限映射 - 与electron客户端完全一致
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    // 超级管理员拥有所有权限
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.INCOME,
    PERMISSIONS.EXPENSE,
    PERMISSIONS.RECORDS,
    PERMISSIONS.STATS,
    PERMISSIONS.FORECAST,
    PERMISSIONS.EMAIL_REPORT,
    PERMISSIONS.WEATHER,
    PERMISSIONS.CONFIG,
    PERMISSIONS.EDIT_RECORDS,
    PERMISSIONS.DELETE_RECORDS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.LOCK_APP,
    PERMISSIONS.CONFIG_USER,
    PERMISSIONS.CONFIG_SHOP,
    PERMISSIONS.CONFIG_EMAIL,
    PERMISSIONS.CONFIG_SECURITY,
    PERMISSIONS.CONFIG_TEMPLATE,
    PERMISSIONS.CONFIG_BACKUP,
    PERMISSIONS.CONFIG_WEATHER_API
  ],
  admin: [
    // 管理员权限：不能访问天气API配置、邮件设置、邮件报表和数据备份
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.INCOME,
    PERMISSIONS.EXPENSE,
    PERMISSIONS.RECORDS,
    PERMISSIONS.STATS,
    PERMISSIONS.FORECAST,
    PERMISSIONS.WEATHER,
    PERMISSIONS.CONFIG,
    PERMISSIONS.EDIT_RECORDS,
    PERMISSIONS.DELETE_RECORDS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.LOCK_APP,
    PERMISSIONS.CONFIG_USER,
    PERMISSIONS.CONFIG_SHOP,
    PERMISSIONS.CONFIG_SECURITY,
    PERMISSIONS.CONFIG_TEMPLATE
    // 注意：管理员不包含 PERMISSIONS.CONFIG_WEATHER_API、PERMISSIONS.CONFIG_EMAIL、PERMISSIONS.EMAIL_REPORT 和 PERMISSIONS.CONFIG_BACKUP
  ],
  user: [
    // 普通用户权限：不能查看预测分析、邮件报表、天气信息
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.INCOME,
    PERMISSIONS.EXPENSE,
    PERMISSIONS.RECORDS,
    PERMISSIONS.STATS,
    PERMISSIONS.CONFIG,
    PERMISSIONS.EDIT_RECORDS,
    PERMISSIONS.DELETE_RECORDS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.LOCK_APP,
    PERMISSIONS.CONFIG_USER,
    PERMISSIONS.CONFIG_SECURITY,
    PERMISSIONS.CONFIG_TEMPLATE
  ],
  observer: [
    // 观察者权限：只能查看首页、统计报表、查看记录（不可编辑）
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.RECORDS,
    PERMISSIONS.STATS,
    PERMISSIONS.CONFIG,
    PERMISSIONS.CONFIG_USER
  ]
}

// 权限管理Composition API
export const usePermissions = () => {
  const userStore = useUserStore()
  
  const userRole = computed(() => userStore.role || 'observer')
  const userPermissions = computed(() => ROLE_PERMISSIONS[userRole.value] || ROLE_PERMISSIONS.observer)
  
  // 检查授权是否过期 - 与electron客户端保持一致的逻辑
  const isLicenseExpired = computed(() => {
    const user = userStore.user
    if (!user) return false
    
    // 优先检查是否为永久授权
    if (user.licenseType === 'permanent' || 
        user.type === 'permanent' || 
        user.licenseType === 'unlimited' ||
        user.type === 'unlimited' ||
        user.licenseExpiry === null || 
        user.licenseExpiry === 'permanent' ||
        (user.hasLicense === true && !user.licenseExpiry && !user.daysUntilExpiry)) {
      return false // 永久授权永不过期
    }
    
    // 检查用户对象中的明确过期标志
    if (user.isLicenseExpired === true) {
      return true
    }
    
    // 检查授权到期时间
    if (user.licenseExpiry && user.licenseExpiry !== 'permanent') {
      const expiryDate = new Date(user.licenseExpiry)
      const now = new Date()
      return expiryDate <= now
    }
    
    // 检查剩余天数
    if (user.daysUntilExpiry !== undefined && user.daysUntilExpiry !== null) {
      return user.daysUntilExpiry <= 0
    }
    
    // 检查是否有授权
    if (user.hasLicense === false) {
      return true
    }
    
    return false
  })
  
  const hasPermission = (permission: string): boolean => {
    return userPermissions.value.includes(permission)
  }
  
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }
  
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }
  
  // 过滤菜单项 - 用于底部导航栏
  const getFilteredMenuItems = (menuItems: any[]) => {
    return menuItems.filter(item => {
      // 如果授权过期，只显示首页和我的页面
      if (isLicenseExpired.value) {
        return item.key === 'dashboard' || item.key === 'profile'
      }
      
      // 正常权限检查
      switch (item.key) {
        case 'dashboard':
          return hasPermission(PERMISSIONS.DASHBOARD)
        case 'income':
          return hasPermission(PERMISSIONS.INCOME)
        case 'expense':
          return hasPermission(PERMISSIONS.EXPENSE)
        case 'records':
          return hasPermission(PERMISSIONS.RECORDS)
        case 'profile':
          return true // 所有用户都可以访问个人页面
        default:
          return false
      }
    })
  }
  
  // 过滤配置选项卡 - 用于设置页面
  const getFilteredConfigTabs = () => {
    const tabs = []
    
    // 如果授权过期，只显示用户配置
    if (isLicenseExpired.value) {
      if (hasPermission(PERMISSIONS.CONFIG_USER)) {
        tabs.push('user')
      }
      return tabs
    }
    
    // 正常权限检查
    if (hasPermission(PERMISSIONS.CONFIG_USER)) {
      tabs.push('user')
    }
    if (hasPermission(PERMISSIONS.CONFIG_SHOP)) {
      tabs.push('shop')
    }
    if (hasPermission(PERMISSIONS.CONFIG_EMAIL)) {
      tabs.push('email')
    }
    if (hasPermission(PERMISSIONS.CONFIG_SECURITY)) {
      tabs.push('security')
    }
    if (hasPermission(PERMISSIONS.CONFIG_TEMPLATE)) {
      tabs.push('template')
    }
    if (hasPermission(PERMISSIONS.CONFIG_BACKUP)) {
      tabs.push('backup')
    }
    if (hasPermission(PERMISSIONS.CONFIG_WEATHER_API)) {
      tabs.push('weather-api')
    }
    
    return tabs
  }
  
  return {
    userRole,
    userPermissions,
    isLicenseExpired,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getFilteredMenuItems,
    getFilteredConfigTabs
  }
}